import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3018';
const artifactDirectory = resolve(process.cwd(), 'artifacts/ui');
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const errors = [];
try {
  const firstContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const secondContext = await browser.newContext({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 1 });
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  watchPage(firstPage, '桌面一', errors);
  watchPage(secondPage, '桌面二', errors);

  await Promise.all([joinWorld(firstPage, '检查者甲'), joinWorld(secondPage, '检查者乙')]);
  await waitForOnlineCount(2);

  await firstPage.getByRole('button', { name: '规则' }).click();
  await firstPage.getByRole('dialog', { name: '生命战争' }).waitFor({ state: 'visible' });
  await firstPage.screenshot({ path: resolve(artifactDirectory, 'rules.png'), fullPage: true });
  await firstPage.getByRole('button', { name: '进入世界' }).click();

  const message = `联机验收-${Date.now()}`;
  await firstPage.getByRole('button', { name: '聊天' }).click();
  await firstPage.getByLabel('聊天消息').fill(message);
  await firstPage.getByRole('button', { name: '发送消息' }).click();
  await secondPage.getByRole('button', { name: '聊天' }).click();
  await secondPage.getByText(message, { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });

  const firstCanvas = firstPage.locator('.life-canvas');
  const canvasBounds = await firstCanvas.boundingBox();
  assert(canvasBounds && canvasBounds.width > 500 && canvasBounds.height > 500, '桌面画布尺寸无效');

  await firstPage.getByRole('button', { name: '需要协作：选择位置' }).click();
  await firstPage.locator('.signal-target-mode').getByText('需要协作', { exact: true }).waitFor({ state: 'visible' });
  const signalX = canvasBounds.x + canvasBounds.width * 0.58;
  const signalY = canvasBounds.y + canvasBounds.height * 0.52;
  await firstPage.mouse.move(signalX, signalY);
  await firstPage.waitForTimeout(180);
  await firstPage.screenshot({ path: resolve(artifactDirectory, 'signal-targeting.png'), fullPage: true });
  await firstPage.mouse.click(signalX, signalY);
  await firstPage.locator('.signal-target-mode').waitFor({ state: 'hidden' });
  await secondPage.getByRole('button', { name: '动态' }).click();
  await secondPage.getByText(/检查者甲(?:·\d+)?：需要协作/, { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await secondPage.screenshot({ path: resolve(artifactDirectory, 'signal-received.png'), fullPage: true });

  const energyBeforeOutsideClick = await readEnergy(firstPage);
  await firstPage.mouse.click(canvasBounds.x + 2, canvasBounds.y + canvasBounds.height * 0.5);
  await firstPage.waitForTimeout(250);
  assert.equal(await readEnergy(firstPage), energyBeforeOutsideClick, '地图外点击不应投放图案');

  await firstPage.getByRole('button', { name: /设计图案/ }).click();
  const designerCanvas = firstPage.getByLabel('图案绘制网格');
  await designerCanvas.waitFor({ state: 'visible' });
  await firstPage.getByLabel('图案名称').fill('验收图案');
  const designerBounds = await designerCanvas.boundingBox();
  assert(designerBounds, '图案设计画布尺寸无效');
  const designerCell = designerBounds.width / 31;
  const designerCenterX = designerBounds.x + designerCell * 15.5;
  const designerCenterY = designerBounds.y + designerCell * 15.5;
  await firstPage.mouse.click(designerCenterX, designerCenterY);
  await firstPage.mouse.click(designerCenterX + designerCell, designerCenterY);
  await firstPage.mouse.click(designerCenterX, designerCenterY + designerCell);
  await firstPage.getByRole('button', { name: /保存到图案列表/ }).click();
  await firstPage.getByRole('button', { name: /^验收图案/ }).waitFor({ state: 'visible' });

  const energyBeforePlacement = await readEnergy(firstPage);
  let energyAfterPlacement = energyBeforePlacement;
  for (const [xRatio, yRatio] of [[0.35, 0.35], [0.65, 0.35], [0.35, 0.65], [0.65, 0.65], [0.5, 0.5]]) {
    await firstPage.mouse.click(canvasBounds.x + canvasBounds.width * xRatio, canvasBounds.y + canvasBounds.height * yRatio);
    await firstPage.waitForTimeout(250);
    energyAfterPlacement = await readEnergy(firstPage);
    if (energyAfterPlacement < energyBeforePlacement) break;
  }
  await firstPage.mouse.move(30, 25);
  await firstPage.waitForTimeout(800);
  assert(energyAfterPlacement < energyBeforePlacement, '自定义图案投放后能量没有扣除');

  await firstPage.screenshot({ path: resolve(artifactDirectory, 'desktop.png'), fullPage: true });
  assertCanvasHasContent(await firstCanvas.screenshot(), '桌面画布');
  assert.equal(await firstPage.locator('.join-gate').count(), 0, '加入后昵称入口仍然可见');

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  watchPage(mobilePage, '移动端', errors);
  await joinWorld(mobilePage, '移动检查者');
  await mobilePage.getByRole('button', { name: '打开信息面板' }).waitFor({ state: 'visible' });
  await mobilePage.locator('.current-pattern-button').click();
  await mobilePage.getByRole('button', { name: /设计图案/ }).click();
  const mobileDesigner = mobilePage.getByRole('dialog', { name: '图案设计器' });
  const mobileDesignerBounds = await mobileDesigner.boundingBox();
  assert(mobileDesignerBounds, '移动端图案设计器未显示');
  assert(mobileDesignerBounds.width <= 390 && mobileDesignerBounds.height <= 844, '移动端图案设计器超出视口');
  await mobilePage.screenshot({ path: resolve(artifactDirectory, 'mobile-designer.png'), fullPage: true });
  await mobilePage.getByRole('button', { name: '关闭图案设计器' }).click();
  await mobilePage.screenshot({ path: resolve(artifactDirectory, 'mobile.png'), fullPage: true });
  assertCanvasHasContent(await mobilePage.locator('.life-canvas').screenshot(), '移动端画布');
  const mobileLayout = await mobilePage.evaluate(() => {
    const tool = document.querySelector('.tool-panel')?.getBoundingClientRect();
    const self = document.querySelector('.self-hud')?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      tool: tool ? { left: tool.left, right: tool.right, top: tool.top, bottom: tool.bottom } : null,
      self: self ? { left: self.left, right: self.right, top: self.top, bottom: self.bottom } : null,
    };
  });
  assert(mobileLayout.scrollWidth <= mobileLayout.viewportWidth + 1, '移动端出现横向溢出');
  assert(mobileLayout.scrollHeight <= mobileLayout.viewportHeight + 1, '移动端出现纵向溢出');
  assert(mobileLayout.tool && mobileLayout.self, '移动端关键控件缺失');
  assert(mobileLayout.self.bottom <= mobileLayout.tool.top + 1, '移动端玩家状态与工具栏发生重叠');

  await mobileContext.close();
  await firstContext.close();
  await secondContext.close();
  assert.deepEqual(errors, [], `浏览器控制台错误：\n${errors.join('\n')}`);
  console.log('UI 验收通过：首次规则、有限地图、信号选点、自定义图案、双客户端同步和桌面/移动布局均正常');
  console.log(`截图目录：${artifactDirectory}`);
} finally {
  await browser.close();
}

async function joinWorld(page, name) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('你的昵称').fill(name);
  await page.getByRole('button', { name: /加入/ }).click();
  await page.locator('.connection-state.is-joined').waitFor({ state: 'attached', timeout: 8_000 });
  await page.getByRole('dialog', { name: '生命战争' }).waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: '进入世界' }).click();
  await page.locator('.life-canvas').waitFor({ state: 'visible' });
}

async function readEnergy(page) {
  const text = await page.locator('.self-name span').innerText();
  const value = Number(text.replace(/[^0-9.]/g, ''));
  assert(Number.isFinite(value), `无法读取能量：${text}`);
  return value;
}

async function waitForOnlineCount(expected) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/health`);
    const health = await response.json();
    if (health.online >= expected) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`在线人数未达到 ${expected}`);
}

function assertCanvasHasContent(buffer, label) {
  const image = PNG.sync.read(buffer);
  const colors = new Set();
  let brightPixels = 0;
  const stride = Math.max(1, Math.floor(image.width * image.height / 25_000));
  for (let pixel = 0; pixel < image.width * image.height; pixel += stride) {
    const offset = pixel * 4;
    const red = image.data[offset];
    const green = image.data[offset + 1];
    const blue = image.data[offset + 2];
    colors.add(`${red}:${green}:${blue}`);
    if (red + green + blue > 220) brightPixels += 1;
  }
  assert(colors.size >= 5, `${label}颜色过于单一，疑似未渲染`);
  assert(brightPixels >= 10, `${label}没有检测到活细胞或网格内容`);
}

function watchPage(page, label, target) {
  page.on('pageerror', (error) => target.push(`${label} pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') target.push(`${label} console: ${message.text()}`);
  });
}
