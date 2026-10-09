// Existing Playwright/browser required; no new runtime dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:8001';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH, headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base);
    await page.waitForFunction(() => noHopeWebGLReady);
    assert.equal(await page.evaluate(() => noHopeRenderer.info.frames), 0);
    await page.click('#noHopeMode');
    await page.fill('#missionInput', '2604');
    await page.click('#startButton');
    await page.waitForFunction(() => state.asteroids.length > 0);
    await page.click('#pauseButton');
    const held = await page.evaluate(() => [state.elapsed, noHopeRenderer.info.frames]);
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(() => [state.elapsed, noHopeRenderer.info.frames]), held);
    await page.click('#pauseButton');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.ok(await page.evaluate(() => state.paused));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    assert.ok(await page.evaluate(() => state.paused), 'returning to tab requires explicit resume');
    // Rapid same-task toggles must keep a single pending game animation loop.
    await page.evaluate(() => { for (let n = 0; n < 20; n++) togglePause(); });
    assert.ok(await page.evaluate(() => state.paused));
    await page.evaluate(() => { for (let n = 0; n < 1000; n++) update(0.03); draw(); });
    assert.ok(await page.evaluate(() => state.score > 0 && noHopeProgress() > 0.4 && state.repairs.length === 0));
    await page.evaluate(() => { state.elapsed = 67.99; update(0.02); draw(); });
    assert.ok(await page.evaluate(() => state.collapsing));
    await page.waitForFunction(() => consumptionOverlay.classList.contains('finished'), null, { timeout: 6000 });
    await page.click('#retryButton');
    assert.ok(await page.evaluate(() => state.elapsed === 0 && !state.gameOver && state.missionCode === ''));
    await page.evaluate(() => { beginConsumption(); resetGame(); });
    await page.waitForTimeout(4350);
    assert.ok(await page.evaluate(() => !state.gameOver && !consumptionOverlay.classList.contains('finished')));
    await page.click('#startButton');
    await page.evaluate(() => { state.asteroids.push(makeAsteroid(state.ship.x, state.ship.y, 30, 0, 0)); update(0.01); draw(); });
    assert.ok(await page.evaluate(() => state.gameOver && state.lives === 0));
    assert.deepEqual(errors, []);
    console.log('PASS No Hope GPU lifecycle, gameplay, consumption and reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
