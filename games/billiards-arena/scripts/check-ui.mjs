import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const artifactDirectory = new URL('../artifacts/', import.meta.url);
await mkdir(artifactDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
});

const consoleErrors = [];
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
const host = await desktopContext.newPage();
captureErrors(host, '桌面房主');
await host.goto(baseUrl, { waitUntil: 'networkidle' });
await host.getByRole('heading', { name: '联机 3D 台球' }).waitFor();
await writeFile(new URL('ui-lobby-desktop.png', artifactDirectory), await host.screenshot({ fullPage: true }));
await host.getByLabel('球手昵称').fill('桌面球手');
await host.getByRole('button', { name: '创建球局' }).click();
await host.locator('.room-code-button strong').waitFor();
const roomCode = (await host.locator('.room-code-button strong').textContent())?.trim();
if (!roomCode) throw new Error('未获取到房间号');

const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const guest = await guestContext.newPage();
captureErrors(guest, '桌面对手');
await guest.goto(`${baseUrl}/?room=${roomCode}`, { waitUntil: 'networkidle' });
await guest.getByLabel('球手昵称').fill('联机对手');
await guest.getByRole('button', { name: '加入球局' }).click();
await guest.locator('.match-dialog').waitFor();

await host.getByRole('button', { name: '准备开球' }).click();
await guest.getByRole('button', { name: '准备开球' }).click();
await host.locator('canvas.game-canvas').waitFor();
await guest.locator('canvas.game-canvas').waitFor();
await host.waitForTimeout(800);
const hostBreaks = await host.locator('.context-prompt').filter({ hasText: '母球位置' }).isVisible();
const breaker = hostBreaks ? host : guest;
await breaker.locator('.context-prompt').filter({ hasText: '母球位置' }).waitFor({ timeout: 10_000 });

const canvas = breaker.locator('canvas.game-canvas');
const canvasBox = await canvas.boundingBox();
if (!canvasBox) throw new Error('桌面球桌画布没有尺寸');
await breaker.waitForTimeout(700);
await canvas.click({ position: { x: canvasBox.width * 0.2, y: canvasBox.height * 0.52 } });
await breaker.locator('.shoot-command:not([disabled])').waitFor({ timeout: 8_000 });

await breaker.mouse.move(canvasBox.x + canvasBox.width * 0.62, canvasBox.y + canvasBox.height * 0.44);
await breaker.mouse.down();
await breaker.mouse.move(canvasBox.x + canvasBox.width * 0.76, canvasBox.y + canvasBox.height * 0.52, { steps: 8 });
await breaker.mouse.up();
await breaker.waitForTimeout(80);
const lockedAngle = await breaker.locator('.aim-fine-row strong').textContent();
const shootButtonBox = await breaker.locator('.shoot-command').boundingBox();
if (!shootButtonBox) throw new Error('击球按钮没有尺寸');
await breaker.mouse.move(shootButtonBox.x + shootButtonBox.width / 2, shootButtonBox.y + shootButtonBox.height / 2, { steps: 10 });
await breaker.waitForTimeout(120);
const angleAfterMove = await breaker.locator('.aim-fine-row strong').textContent();
if (lockedAngle !== angleAfterMove) throw new Error(`鼠标移向击球按钮后瞄准角度漂移：${lockedAngle} -> ${angleAfterMove}`);

await writeFile(new URL('ui-game-desktop.png', artifactDirectory), await breaker.screenshot());
assertCanvas(await canvas.screenshot(), '桌面球桌');
await assertLayout(breaker, 'desktop');

await breaker.locator('.shoot-command').click();
await breaker.waitForFunction(() => document.querySelector('.turn-display strong')?.textContent?.trim() === '球正在运动', undefined, { timeout: 5_000 });
await breaker.waitForFunction(() => {
  const status = document.querySelector('.turn-display strong')?.textContent?.trim();
  return Boolean(status && status !== '球正在运动');
}, undefined, { timeout: 22_000 });
const peer = breaker === host ? guest : host;
const resolvedStatus = await breaker.locator('.turn-display strong').textContent();
await peer.waitForFunction((expected) => document.querySelector('.turn-display strong')?.textContent === expected, resolvedStatus, { timeout: 5_000 });

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobile = await mobileContext.newPage();
captureErrors(mobile, '手机观战');
await mobile.goto(`${baseUrl}/?room=${roomCode}`, { waitUntil: 'networkidle' });
await mobile.getByLabel('球手昵称').fill('手机观众');
await mobile.getByRole('button', { name: '加入球局' }).click();
await mobile.locator('canvas.game-canvas').waitFor();
await mobile.waitForTimeout(900);
await writeFile(new URL('ui-game-mobile.png', artifactDirectory), await mobile.screenshot());
assertCanvas(await mobile.locator('canvas.game-canvas').screenshot(), '手机球桌');
await assertLayout(mobile, 'mobile');

if (consoleErrors.length > 0) throw new Error(`浏览器控制台错误：\n${consoleErrors.join('\n')}`);

await mobileContext.close();
await guestContext.close();
await desktopContext.close();
await browser.close();
console.info(`UI 检查通过：房间 ${roomCode}，桌面与手机画布均非空，布局无越界。`);

function captureErrors(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleErrors.push(`${label}: ${error.message}`));
}

function assertCanvas(buffer, label) {
  const png = PNG.sync.read(buffer);
  let visiblePixels = 0;
  const colors = new Set();
  const stride = 4 * 9;
  for (let offset = 0; offset < png.data.length; offset += stride) {
    const red = png.data[offset];
    const green = png.data[offset + 1];
    const blue = png.data[offset + 2];
    const alpha = png.data[offset + 3];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    if (alpha > 200 && luminance > 18) visiblePixels += 1;
    colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
  }
  const sampledPixels = Math.ceil(png.data.length / stride);
  if (visiblePixels / sampledPixels < 0.12 || colors.size < 45) {
    throw new Error(`${label}像素检查失败：有效像素占比 ${(visiblePixels / sampledPixels).toFixed(3)}，颜色数 ${colors.size}`);
  }
}

async function assertLayout(page, mode) {
  const result = await page.evaluate((layoutMode) => {
    const stage = document.querySelector('.table-stage')?.getBoundingClientRect();
    const dock = document.querySelector('.control-dock')?.getBoundingClientRect();
    const canvas = document.querySelector('canvas.game-canvas')?.getBoundingClientRect();
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
    const mobileCollision = layoutMode === 'mobile' && stage && dock ? stage.bottom > dock.top + 1 : false;
    const desktopCollision = layoutMode === 'desktop' && stage && dock ? stage.right > dock.left + 1 : false;
    const invalidCanvas = !canvas || canvas.width < 280 || canvas.height < 260;
    return { overflow, mobileCollision, desktopCollision, invalidCanvas, stage, dock, canvas };
  }, mode);
  if (result.overflow || result.mobileCollision || result.desktopCollision || result.invalidCanvas) {
    throw new Error(`${mode} 布局检查失败：${JSON.stringify(result)}`);
  }
}
