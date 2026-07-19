import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const PLATFORM_URL = process.env.PLATFORM_URL ?? 'http://127.0.0.1:3100';
const LIFE_URL = process.env.LIFE_URL ?? 'http://127.0.0.1:3101';
const BILLIARDS_URL = process.env.BILLIARDS_URL ?? 'http://127.0.0.1:3102';
const SNAKE_URL = process.env.SNAKE_URL ?? 'http://127.0.0.1:3103';
const FOUNDRY_URL = process.env.FOUNDRY_URL ?? 'http://127.0.0.1:3104';
const LIFE_SERVICE_TOKEN = process.env.LIFE_SERVICE_TOKEN ?? 'dev-life-service-token-change-before-production-2026';
const TEST_INTERNAL_WALLET = process.env.E2E_TEST_INTERNAL_WALLET !== 'false';
const CHROME_PATH = process.env.CHROME_PATH ?? (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const artifactsDirectory = join(process.cwd(), 'artifacts', 'e2e');
const requestedRle = `textx = 36, y = 9, rule = B3/S23
24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
obo$10bo5bo7bo$11bo3bo$12b2o!`;
const runId = Date.now().toString(36);
const password = `E2e-${runId}-Password!`;
const browserErrors = [];

await mkdir(artifactsDirectory, { recursive: true });
await checkHealth();

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME_PATH,
  args: ['--no-sandbox', '--enable-webgl', '--use-angle=swiftshader-webgl'],
});

try {
  const firstContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const firstPage = await firstContext.newPage();
  monitorPage(firstPage, '玩家甲');

  logStep('注册玩家甲并验证大厅目录');
  const firstAccount = await register(firstPage, `e2ea${runId}`, `联调甲${runId.slice(-4)}`);
  await assertLobby(firstPage, 0);
  await firstPage.screenshot({ path: join(artifactsDirectory, 'lobby-desktop.png'), fullPage: true });

  if (TEST_INTERNAL_WALLET) {
    logStep('验证积分并发幂等与冲突保护');
    const walletCommand = {
      accountId: firstAccount.id,
      amount: 37,
      type: 'grant',
      reasonCode: 'e2e.reward',
      referenceId: `e2e:${runId}:reward`,
      idempotencyKey: `e2e:${runId}:wallet`,
    };
    const [firstWalletResult, repeatedWalletResult] = await Promise.all([
      postInternalWallet(walletCommand),
      postInternalWallet(walletCommand),
    ]);
    assert.equal(firstWalletResult.status, 201);
    assert.equal(repeatedWalletResult.status, 201);
    assert.equal(firstWalletResult.body.data.id, repeatedWalletResult.body.data.id, '相同幂等命令必须返回同一流水');
    const conflict = await postInternalWallet({ ...walletCommand, amount: 38 });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'IDEMPOTENCY_CONFLICT');
    await firstPage.reload({ waitUntil: 'networkidle' });
    await assertLobby(firstPage, 37);
  } else {
    logStep('跳过仅限内网服务令牌的积分写入验收');
  }

  logStep('验证生命战争启动、票据单次消费和实时世界');
  const lifeLaunch = await launchGame(firstPage, 'life-commons');
  const lifeCode = new URL(lifeLaunch.launchUrl).searchParams.get('launch_code');
  assert.ok(lifeCode);
  await firstPage.goto(lifeLaunch.launchUrl, { waitUntil: 'domcontentloaded' });
  await firstPage.getByText('已同步', { exact: true }).waitFor({ timeout: 15_000 });
  await firstPage.getByRole('dialog', { name: '生命战争' }).waitFor();
  assert.equal(new URL(firstPage.url()).searchParams.has('launch_code'), false, '兑换后必须清理地址栏启动码');
  const gameSession = await browserFetch(firstPage, 'api/platform/session');
  assert.equal(gameSession.status, 200);
  assert.equal(gameSession.body.data.accountId, firstAccount.id);
  const replay = await browserFetch(firstPage, 'api/platform/session', { method: 'POST', body: { code: lifeCode } });
  assert.equal(replay.status, 401, '启动码不可重复兑换');
  assert.equal(replay.body.error.code, 'INVALID_LAUNCH_CODE');
  await firstPage.getByRole('button', { name: '进入世界' }).click();
  await firstPage.getByRole('button', { name: '设置' }).click();
  await firstPage.getByLabel('颜色代码').fill('#111111');
  await firstPage.getByRole('button', { name: '保存颜色' }).click();
  await firstPage.getByText(/颜色过暗/).waitFor();
  await firstPage.getByLabel('颜色代码').fill('#ff4f91');
  await firstPage.getByRole('button', { name: '保存颜色' }).click();
  await firstPage.getByRole('dialog', { name: '颜色设置' }).waitFor({ state: 'hidden' });
  await firstPage.getByRole('button', { name: '清除细胞' }).click();
  await firstPage.getByLabel('橡皮擦尺寸').fill('10');
  assert.equal(await firstPage.getByLabel('橡皮擦尺寸').inputValue(), '10');
  await firstPage.getByRole('button', { name: '投放细胞' }).click();
  await firstPage.getByRole('button', { name: /导入 RLE/ }).click();
  await firstPage.getByLabel('图案名称').fill('平台RLE验收');
  await firstPage.getByLabel('RLE 代码').fill(requestedRle);
  await firstPage.getByText('36 × 9', { exact: true }).waitFor();
  await firstPage.getByRole('button', { name: /导入到图案列表/ }).click();
  await firstPage.getByRole('button', { name: /^平台RLE验收/ }).waitFor();
  await firstPage.waitForTimeout(500);
  await assertTwoDimensionalCanvas(firstPage, 'canvas.life-canvas');
  await assertNoHorizontalOverflow(firstPage);
  await firstPage.screenshot({ path: join(artifactsDirectory, 'life-desktop.png'), fullPage: true });

  logStep('创建台球房间并让第二个账号加入');
  await firstPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  const billiardsLaunch = await launchGame(firstPage, 'billiards-arena');
  await firstPage.goto(billiardsLaunch.launchUrl, { waitUntil: 'domcontentloaded' });
  await firstPage.getByText('服务器在线', { exact: true }).waitFor({ timeout: 15_000 });
  await firstPage.getByText(firstAccount.displayName, { exact: true }).waitFor();
  await firstPage.getByRole('button', { name: '创建球局' }).click();
  const roomCodeLocator = firstPage.locator('.room-code-button strong');
  await roomCodeLocator.waitFor({ timeout: 10_000 });
  const roomCode = (await roomCodeLocator.textContent())?.trim();
  assert.match(roomCode ?? '', /^[A-Z0-9]{6}$/);
  await firstPage.locator('.game-canvas-host canvas').waitFor({ timeout: 15_000 });

  const secondContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const secondPage = await secondContext.newPage();
  monitorPage(secondPage, '玩家乙');
  const secondAccount = await register(secondPage, `e2eb${runId}`, `联调乙${runId.slice(-4)}`);
  const secondLaunch = await launchGame(secondPage, 'billiards-arena');
  const secondLaunchUrl = new URL(secondLaunch.launchUrl);
  secondLaunchUrl.searchParams.set('room', roomCode);
  await secondPage.goto(secondLaunchUrl.toString(), { waitUntil: 'domcontentloaded' });
  await secondPage.getByText('服务器在线', { exact: true }).waitFor({ timeout: 15_000 });
  await secondPage.getByLabel('房间号').waitFor();
  assert.equal(await secondPage.getByLabel('房间号').inputValue(), roomCode);
  await secondPage.getByRole('button', { name: '加入球局', exact: true }).click();
  await secondPage.waitForFunction(
    () => document.body.innerText.includes('双方确认后开球'),
    undefined,
    { timeout: 15_000 },
  );
  await firstPage.locator('.seat-list').getByText(secondAccount.displayName, { exact: true }).waitFor({ timeout: 10_000 });

  logStep('验证双人准备、聊天与 3D 击球动画');
  await firstPage.getByRole('button', { name: '准备开球' }).click();
  await secondPage.getByRole('button', { name: '准备开球' }).click();
  await firstPage.locator('.match-overlay').waitFor({ state: 'detached', timeout: 15_000 });
  await secondPage.locator('.match-overlay').waitFor({ state: 'detached', timeout: 15_000 });
  await placeOpeningCue(firstPage, secondPage);

  await secondPage.getByRole('button', { name: '房间' }).click();
  await secondPage.getByLabel('聊天消息').fill(`联机验证-${runId}`);
  await secondPage.getByRole('button', { name: '发送' }).click();
  await firstPage.getByRole('button', { name: '房间' }).click();
  await firstPage.getByText(`联机验证-${runId}`, { exact: true }).waitFor({ timeout: 10_000 });
  await firstPage.getByRole('button', { name: '击球', exact: true }).click();
  await secondPage.getByRole('button', { name: '击球', exact: true }).click();

  const shooterPage = await findShooter(firstPage, secondPage);
  await shooterPage.bringToFront();
  const canvasHost = shooterPage.locator('.game-canvas-host');
  const beforeShot = await canvasHost.screenshot();
  await shooterPage.locator('.shoot-command:not([disabled])').click();
  await shooterPage.waitForTimeout(240);
  const duringShot = await canvasHost.screenshot();
  assertImageChanged(beforeShot, duringShot);
  await assertRenderedImage(duringShot, '台球 3D 画面');
  await shooterPage.screenshot({ path: join(artifactsDirectory, 'billiards-desktop.png'), fullPage: true });

  logStep('验证移动端布局与 3D 画布取景');
  await shooterPage.setViewportSize({ width: 390, height: 844 });
  await shooterPage.waitForTimeout(350);
  await assertNoHorizontalOverflow(shooterPage);
  const mobileCanvas = await shooterPage.locator('.game-canvas-host').screenshot();
  await assertRenderedImage(mobileCanvas, '移动端台球 3D 画面');
  await shooterPage.screenshot({ path: join(artifactsDirectory, 'billiards-mobile.png'), fullPage: true });

  logStep('验证 PROJECT GSS0 双人共享世界、独立自动模式与平滑动画');
  await firstPage.setViewportSize({ width: 1440, height: 900 });
  await secondPage.setViewportSize({ width: 1440, height: 900 });
  await firstPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  await secondPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  await firstPage.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    if (!NativeAudioContext) return;
    window.__ultraOscillatorCount = 0;
    class InstrumentedAudioContext extends NativeAudioContext {
      createOscillator() {
        window.__ultraOscillatorCount += 1;
        return super.createOscillator();
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: InstrumentedAudioContext });
  });
  const firstSnakeLaunch = await launchGame(firstPage, 'neon-snake-arena');
  const secondSnakeLaunch = await launchGame(secondPage, 'neon-snake-arena');
  await Promise.all([
    firstPage.goto(firstSnakeLaunch.launchUrl, { waitUntil: 'domcontentloaded' }),
    secondPage.goto(secondSnakeLaunch.launchUrl, { waitUntil: 'domcontentloaded' }),
  ]);
  await Promise.all([enterSnakeUltra(firstPage), enterSnakeUltra(secondPage, '自动测试')]);
  await firstPage.locator('.multiplayer-scoreboard').waitFor({ timeout: 10_000 });
  await firstPage.getByText(`@${secondAccount.username}`, { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(await firstPage.locator('#multiplayer-players > li').count(), 2, '多人记分板应显示两名玩家');
  assert.equal(await firstPage.locator('#game-shell.is-test-mode').count(), 0, '手动玩家不应被自动测试模式影响');
  assert.equal(await secondPage.locator('#game-shell.is-test-mode').count(), 1, '自动测试只应作用于自己的玩家');
  await firstPage.getByRole('button', { name: '暂停', exact: true }).click();
  await firstPage.locator('#pause-screen.is-visible').waitFor();
  const secondScoreBefore = await secondPage.locator('#score-value').textContent();
  await secondPage.waitForTimeout(700);
  const secondScoreAfter = await secondPage.locator('#score-value').textContent();
  assert.notEqual(secondScoreAfter, secondScoreBefore, '一名玩家暂停时其他玩家应继续行动');
  await firstPage.getByRole('button', { name: '继续游戏' }).click();
  await firstPage.waitForFunction(async () => {
    const health = await fetch('./health').then((response) => response.json());
    return health.online >= 2 && health.alive >= 2 && health.enemies >= 2;
  }, undefined, { timeout: 10_000 });
  assert.ok(await firstPage.evaluate(() => window.__ultraOscillatorCount > 0), '原版 WebAudio 音效未触发');
  await assertTwoDimensionalCanvas(firstPage, 'canvas#game', '贪吃蛇画布');
  const snakeStage = firstPage.locator('#game-shell');
  const snakeCanvasBounds = await firstPage.locator('canvas#game').boundingBox();
  assert.ok(snakeCanvasBounds);
  await firstPage.mouse.move(snakeCanvasBounds.x + snakeCanvasBounds.width * 0.18, snakeCanvasBounds.y + snakeCanvasBounds.height * 0.42);
  const snakeBefore = await snakeStage.screenshot();
  await firstPage.waitForTimeout(360);
  const snakeAfter = await snakeStage.screenshot();
  assertImageChanged(snakeBefore, snakeAfter);
  await assertRenderedImage(snakeAfter, '贪吃蛇联机画面');
  await firstPage.screenshot({ path: join(artifactsDirectory, 'snake-desktop.png'), fullPage: true });
  await snakeStage.screenshot({ path: join(artifactsDirectory, 'snake-cover-candidate.png') });

  logStep('验证 PROJECT GSS0 真实触控布局');
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    storageState: await secondContext.storageState(),
  });
  const touchPage = await touchContext.newPage();
  monitorPage(touchPage, '触控贪吃蛇');
  await touchPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  const touchSnakeLaunch = await launchGame(touchPage, 'neon-snake-arena');
  await touchPage.goto(touchSnakeLaunch.launchUrl, { waitUntil: 'domcontentloaded' });
  await enterSnakeUltra(touchPage);
  assert.equal(await touchPage.locator('.touch-stick, .touch-boost, .touch-controls').count(), 0, '原版操控不应出现固定摇杆或加速键');
  await assertOriginalSnakeTouchControl(touchPage);
  await touchPage.waitForTimeout(300);
  await assertNoHorizontalOverflow(touchPage);
  await assertTwoDimensionalCanvas(touchPage, 'canvas#game', '移动端贪吃蛇画布');
  await touchPage.screenshot({ path: join(artifactsDirectory, 'snake-mobile.png'), fullPage: true });
  await touchContext.close();

  logStep('验证远星工造密码房间与双人协作');
  await firstPage.setViewportSize({ width: 1440, height: 900 });
  await secondPage.setViewportSize({ width: 1440, height: 900 });
  await firstPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  await secondPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  const firstFoundryLaunch = await launchGame(firstPage, 'farstar-foundry');
  const secondFoundryLaunch = await launchGame(secondPage, 'farstar-foundry');
  await Promise.all([
    firstPage.goto(firstFoundryLaunch.launchUrl, { waitUntil: 'domcontentloaded' }),
    secondPage.goto(secondFoundryLaunch.launchUrl, { waitUntil: 'domcontentloaded' }),
  ]);
  await Promise.all([
    firstPage.getByText('服务器在线', { exact: true }).waitFor({ timeout: 15_000 }),
    secondPage.getByText('服务器在线', { exact: true }).waitFor({ timeout: 15_000 }),
  ]);

  const foundryPassword = `Room-${runId}!`;
  await firstPage.getByLabel('工厂名称').fill(`联调工造站${runId.slice(-4)}`);
  await firstPage.getByLabel('创建密码').fill(foundryPassword);
  await firstPage.getByRole('button', { name: '4 人' }).click();
  await firstPage.getByRole('button', { name: '创建房间' }).click();
  await firstPage.getByRole('heading', { name: '协作组已建立' }).waitFor({ timeout: 15_000 });
  const foundryRoomCode = (await firstPage.locator('.factory-title button span').textContent())?.trim();
  assert.match(foundryRoomCode ?? '', /^[A-Z2-9]{6}$/);

  await secondPage.getByLabel('房间号').fill(foundryRoomCode);
  await secondPage.getByLabel('加入密码').fill(foundryPassword);
  await secondPage.getByRole('button', { name: '加入', exact: true }).click();
  await secondPage.getByRole('heading', { name: '协作组已建立' }).waitFor({ timeout: 15_000 });
  await firstPage.getByText(secondAccount.displayName, { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal((await secondPage.locator('body').textContent()).includes(foundryPassword), false, '页面不得回显房间密码');

  await secondPage.getByLabel('聊天消息').fill(`工造协作-${runId}`);
  await secondPage.getByRole('button', { name: '发送消息' }).click();
  await firstPage.getByText(`工造协作-${runId}`, { exact: true }).waitFor({ timeout: 10_000 });
  await firstPage.getByRole('button', { name: '启动本轮任务' }).click();
  await Promise.all([
    firstPage.getByRole('heading', { name: '建立采掘前哨' }).waitFor({ timeout: 10_000 }),
    secondPage.getByRole('heading', { name: '建立采掘前哨' }).waitFor({ timeout: 10_000 }),
  ]);
  assert.equal(await firstPage.locator('.inventory-item').filter({ hasText: '铜矿' }).count(), 0, '未解锁铜矿不应出现在库存中');
  assert.equal(await firstPage.locator('.inventory-item').filter({ hasText: '煤炭' }).count(), 0, '未解锁煤炭不应出现在库存中');
  assert.equal(await firstPage.locator('.production-line').count(), 0, '初始阶段不应展示尚未解锁的制造设施');

  const firstIronGather = firstPage.getByRole('button', { name: '采集铁矿' });
  const secondIronGather = secondPage.getByRole('button', { name: '采集铁矿' });
  const ironInventory = firstPage.locator('.inventory-item').filter({ hasText: '铁矿' });
  await firstPage.getByLabel('当前库存').waitFor();
  const ironBeforeGather = await ironInventory.textContent();
  await Promise.all([firstIronGather.click(), secondIronGather.click()]);
  const gatherProgress = firstPage.locator('.manual-gather-card.is-active [role="progressbar"]');
  await gatherProgress.waitFor({ timeout: 3_000 });
  assert.equal(await firstIronGather.isDisabled(), true, '采集作业进行时不得重复点击');
  const progressBefore = Number(await gatherProgress.getAttribute('aria-valuenow'));
  await firstPage.waitForTimeout(350);
  const progressAfter = Number(await gatherProgress.getAttribute('aria-valuenow'));
  assert.ok(progressAfter > progressBefore, '手动采集进度条没有推进');
  await Promise.all([waitForFoundryGather(firstPage), waitForFoundryGather(secondPage)]);
  assert.notEqual(await ironInventory.textContent(), ironBeforeGather, '采集完成后库存没有更新');

  await Promise.all([
    firstIronGather.click(),
    secondPage.getByRole('button', { name: '采集岩石' }).click(),
  ]);
  await Promise.all([waitForFoundryGather(firstPage), waitForFoundryGather(secondPage)]);
  await firstPage.getByRole('button', { name: '采集岩石' }).click();
  await waitForFoundryGather(firstPage);

  const ironDrillRow = firstPage.locator('.production-line').filter({ hasText: '铁矿采掘机' });
  await ironDrillRow.waitFor({ timeout: 5_000 });
  const unlockedIronPlate = firstPage.locator('.inventory-item').filter({ hasText: '铁板' });
  await unlockedIronPlate.waitFor({ timeout: 5_000 });
  assert.equal((await unlockedIronPlate.locator('strong').textContent())?.trim(), '0', '已解锁材料归零后仍应显示');
  assert.equal(await firstPage.locator('.inventory-item').filter({ hasText: '铜矿' }).count(), 0, '第二阶段前仍不应展示铜矿');
  await ironDrillRow.getByRole('button', { name: '建造' }).click();
  const ironFurnaceRow = firstPage.locator('.production-line').filter({ hasText: '铁板熔炉' });
  await ironFurnaceRow.getByRole('button', { name: '建造' }).click();
  await secondPage.getByRole('button', { name: '生产', exact: true }).click();
  await expectText(secondPage.locator('.production-line').filter({ hasText: '铁矿采掘机' }).locator('.line-count strong'), '1');
  await firstPage.screenshot({ path: join(artifactsDirectory, 'foundry-desktop.png'), fullPage: true });

  logStep('验证远星工造刷新恢复与移动端布局');
  await secondPage.reload({ waitUntil: 'domcontentloaded' });
  await secondPage.locator('.factory-title').waitFor({ timeout: 15_000 });
  await secondPage.getByRole('button', { name: '生产', exact: true }).click();
  await expectText(secondPage.locator('.production-line').filter({ hasText: '铁矿采掘机' }).locator('.line-count strong'), '1');
  await secondPage.setViewportSize({ width: 390, height: 844 });
  await secondPage.waitForTimeout(350);
  await assertNoHorizontalOverflow(secondPage);
  await secondPage.screenshot({ path: join(artifactsDirectory, 'foundry-mobile.png'), fullPage: true });

  const mobileLobbyPage = await firstContext.newPage();
  monitorPage(mobileLobbyPage, '移动端大厅');
  await mobileLobbyPage.setViewportSize({ width: 390, height: 844 });
  await mobileLobbyPage.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  await mobileLobbyPage.getByRole('heading', { name: '全部游戏' }).waitFor();
  await assertNoHorizontalOverflow(mobileLobbyPage);
  await mobileLobbyPage.screenshot({ path: join(artifactsDirectory, 'lobby-mobile.png'), fullPage: true });
  await mobileLobbyPage.goto(LIFE_URL, { waitUntil: 'domcontentloaded' });
  await mobileLobbyPage.locator('.connection-state.is-joined').waitFor({ state: 'attached', timeout: 15_000 });
  await mobileLobbyPage.waitForTimeout(350);
  await assertTwoDimensionalCanvas(mobileLobbyPage, 'canvas.life-canvas');
  await assertNoHorizontalOverflow(mobileLobbyPage);
  await mobileLobbyPage.screenshot({ path: join(artifactsDirectory, 'life-mobile.png'), fullPage: true });

  assert.deepEqual(browserErrors, [], browserErrors.join('\n'));
  console.log(`\n端到端验收通过，截图位于 ${artifactsDirectory}`);
} finally {
  await browser.close();
}

async function register(page, username, displayName) {
  await page.goto(PLATFORM_URL, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: '注册' }).click();
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('显示名称').fill(displayName);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByLabel('确认密码').fill(password);
  await page.getByRole('button', { name: '创建账号' }).click();
  await page.getByRole('heading', { name: '全部游戏' }).waitFor({ timeout: 15_000 });
  const session = await browserFetch(page, '/api/v1/session');
  assert.equal(session.status, 200);
  assert.equal(session.body.data.account.username, username);
  return session.body.data.account;
}

async function assertLobby(page, expectedBalance) {
  await page.getByRole('heading', { name: '全部游戏' }).waitFor();
  assert.equal(await page.locator('.game-card').count(), 4);
  await page.getByRole('heading', { name: '生命战争' }).waitFor();
  await page.getByRole('heading', { name: 'Breakline 台球' }).waitFor();
  await page.getByRole('heading', { name: 'PROJECT GSS0' }).waitFor();
  await page.getByRole('heading', { name: '远星工造' }).waitFor();
  assert.equal(Number(await page.locator('.points-pill strong').textContent()), expectedBalance);
  await assertNoHorizontalOverflow(page);
}

async function launchGame(page, gameId) {
  const result = await browserFetch(page, `/api/v1/games/${gameId}/launch`, { method: 'POST' });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.gameId, gameId);
  return result.body.data;
}

async function browserFetch(page, path, options = {}) {
  return page.evaluate(async ({ path: requestPath, options: requestOptions }) => {
    const response = await fetch(requestPath, {
      method: requestOptions.method ?? 'GET',
      credentials: 'include',
      headers: requestOptions.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
    });
    return { status: response.status, body: await response.json() };
  }, { path, options });
}

async function postInternalWallet(command) {
  const response = await fetch(`${PLATFORM_URL}/internal/v1/wallet/entries`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${LIFE_SERVICE_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  return { status: response.status, body: await response.json() };
}

async function findShooter(firstPage, secondPage) {
  await Promise.race([
    firstPage.locator('.shoot-command:not([disabled])').waitFor({ timeout: 10_000 }).then(() => firstPage),
    secondPage.locator('.shoot-command:not([disabled])').waitFor({ timeout: 10_000 }).then(() => secondPage),
  ]);
  if (await firstPage.locator('.shoot-command:not([disabled])').count()) return firstPage;
  return secondPage;
}

async function placeOpeningCue(firstPage, secondPage) {
  const placementPage = await Promise.race([
    firstPage.locator('.game-canvas-host[data-can-place="true"]').waitFor({ timeout: 10_000 }).then(() => firstPage),
    secondPage.locator('.game-canvas-host[data-can-place="true"]').waitFor({ timeout: 10_000 }).then(() => secondPage),
  ]);
  await placementPage.bringToFront();
  const canvas = placementPage.locator('.game-canvas-host canvas');
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && bounds.width > 300 && bounds.height > 280, '台球画布尺寸异常');
  await canvas.click({ position: { x: bounds.width * 0.2, y: bounds.height * 0.5 } });
  await placementPage.locator('.game-canvas-host[data-can-aim="true"]').waitFor({ timeout: 10_000 });
}

async function assertTwoDimensionalCanvas(page, selector, label = '生命画布') {
  const metrics = await page.locator(selector).evaluate((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) return null;
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    const colors = new Set();
    let minimum = 255;
    let maximum = 0;
    for (let index = 0; index < pixels.length; index += 64) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      minimum = Math.min(minimum, red, green, blue);
      maximum = Math.max(maximum, red, green, blue);
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
    }
    return { width, height, colors: colors.size, range: maximum - minimum };
  });
  assert.ok(metrics && metrics.width >= 300 && metrics.height >= 300, `${label}尺寸异常`);
  assert.ok(metrics.colors >= 4 && metrics.range >= 30, `${label}可能为空：${JSON.stringify(metrics)}`);
}

async function assertRenderedImage(buffer, label) {
  const image = PNG.sync.read(buffer);
  const colors = new Set();
  let minimum = 255;
  let maximum = 0;
  for (let y = 0; y < image.height; y += 4) {
    for (let x = 0; x < image.width; x += 4) {
      const index = (image.width * y + x) * 4;
      const red = image.data[index];
      const green = image.data[index + 1];
      const blue = image.data[index + 2];
      minimum = Math.min(minimum, red, green, blue);
      maximum = Math.max(maximum, red, green, blue);
      colors.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
    }
  }
  assert.ok(image.width >= 300 && image.height >= 280, `${label}尺寸异常：${image.width}x${image.height}`);
  assert.ok(colors.size >= 20 && maximum - minimum >= 50, `${label}可能为空：颜色 ${colors.size}，范围 ${maximum - minimum}`);
}

function assertImageChanged(beforeBuffer, afterBuffer) {
  const before = PNG.sync.read(beforeBuffer);
  const after = PNG.sync.read(afterBuffer);
  assert.equal(before.width, after.width);
  assert.equal(before.height, after.height);
  let changed = 0;
  let sampled = 0;
  for (let index = 0; index < before.data.length; index += 16) {
    sampled += 1;
    const difference = Math.abs(before.data[index] - after.data[index])
      + Math.abs(before.data[index + 1] - after.data[index + 1])
      + Math.abs(before.data[index + 2] - after.data[index + 2]);
    if (difference > 12) changed += 1;
  }
  assert.ok(changed / sampled > 0.001, `击球前后画面变化不足：${changed}/${sampled}`);
}

async function assertNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(metrics.document <= metrics.viewport + 1, `页面存在横向溢出：${metrics.document} > ${metrics.viewport}`);
}

async function assertOriginalSnakeTouchControl(page) {
  const canvas = page.locator('canvas#game');
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && bounds.width >= 300 && bounds.height >= 420, '移动端贪吃蛇画布尺寸异常');
  const client = await page.context().newCDPSession(page);
  const point = { x: Math.round(bounds.x + bounds.width * 0.76), y: Math.round(bounds.y + bounds.height * 0.54) };
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 4, radiusY: 4, force: 1, id: 7 }] });
  await page.locator('#touch-indicator.is-visible').waitFor({ timeout: 3_000 });
  const indicator = await page.locator('#touch-indicator').boundingBox();
  assert.ok(indicator, '触控位置标记未显示');
  assert.ok(Math.abs(indicator.x + indicator.width / 2 - point.x) <= 3, '触控位置标记横坐标不准确');
  assert.ok(Math.abs(indicator.y + indicator.height / 2 - point.y) <= 3, '触控位置标记纵坐标不准确');
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.locator('#touch-indicator').waitFor({ state: 'hidden', timeout: 3_000 });
  await client.detach();
}

function monitorPage(page, name) {
  page.on('pageerror', (error) => browserErrors.push(`${name} 页面异常：${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 500 && [PLATFORM_URL, LIFE_URL, BILLIARDS_URL, SNAKE_URL, FOUNDRY_URL].some((base) => response.url().startsWith(base))) {
      browserErrors.push(`${name} 服务异常：${response.status()} ${response.url()}`);
    }
  });
}

async function checkHealth() {
  const endpoints = [`${PLATFORM_URL}/health`, `${LIFE_URL}/health`, `${BILLIARDS_URL}/api/health`, `${SNAKE_URL}/health`, `${FOUNDRY_URL}/health`];
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint);
    assert.equal(response.status, 200, `${endpoint} 未就绪`);
  }
}

function logStep(message) {
  console.log(`\n[验收] ${message}`);
}

async function enterSnakeUltra(page, mode = '开始行动') {
  await page.locator('#network-status.is-online').waitFor({ timeout: 15_000 });
  const startScreen = page.locator('#start-screen');
  if (await startScreen.evaluate((element) => element.classList.contains('is-visible'))) {
    await page.getByRole('button', { name: mode }).evaluate((button) => button.click());
  }
  await page.locator('#start-screen').waitFor({ state: 'hidden', timeout: 10_000 });
  await page.locator('canvas#game').waitFor({ state: 'visible', timeout: 10_000 });
}

async function waitForFoundryGather(page) {
  await page.waitForFunction(
    () => document.querySelector('.manual-gather-card.is-active') === null,
    undefined,
    { timeout: 6_000 },
  );
}

async function expectText(locator, expected) {
  await locator.waitFor({ timeout: 10_000 });
  assert.equal((await locator.textContent())?.trim(), expected);
}
