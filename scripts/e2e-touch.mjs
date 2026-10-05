// Touch-only test: menus by tap, virtual sticks by multi-touch drag.
import { launch, assert, frames, drag, touch } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
let failed = false;
const readout = () => page.evaluate(() => document.querySelector('.input-readout')?.textContent ?? '');
try {
  assert(await page.evaluate(() => document.body.classList.contains('input-touch')), 'starts in touch mode');
  await page.locator('.btn', { hasText: 'Settings' }).tap();
  await page.waitForSelector('.settings-screen');
  await page.locator('.tab', { hasText: 'Video' }).tap();
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Video', 'tap switches tab');
  await page.locator('.settings-screen .screen-back').tap();
  await page.waitForSelector('.settings-screen', { state: 'detached' });
  assert(true, 'back button closes settings');
  await page.locator('.btn', { hasText: 'Controls test' }).tap();
  await page.waitForSelector('.input-readout', { timeout: 15000 });
  await frames(page, 5);
  assert(await page.evaluate(() => document.querySelector('.touch-layer')?.hidden === false), 'touch controls visible');
  const vp = page.viewportSize();
  // left stick: drag up -> forward
  const end = await drag(page, { x: vp.width * 0.18, y: vp.height * 0.7 }, { x: vp.width * 0.18, y: vp.height * 0.7 - 60 });
  await frames(page, 2);
  const r1 = await readout();
  assert(/move -?0\.\d+, 0\.[5-9]|move -?0\.\d+, 1\.00/.test(r1), `stick forward (${r1.split('\n')[1]})`);
  // simultaneously look with right side (second finger)
  await touch(page, 'touchMove', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 60, id: 0 }, { x: vp.width * 0.6, y: vp.height * 0.4, id: 1 }]);
  for (let i = 1; i <= 5; i++) {
    await touch(page, 'touchMove', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 60, id: 0 }, { x: vp.width * 0.6 + i * 20, y: vp.height * 0.4, id: 1 }]);
    await frames(page, 1);
  }
  const r2 = await readout();
  assert(/yaw [1-9]|yaw 0\.[1-9]/.test(r2) && /move -?0\.\d+, (0\.[5-9]|1\.00)/.test(r2), `look while moving (${r2.split('\n')[2]})`);
  await end();
  await frames(page, 3);
  assert(/move 0\.00, 0\.00/.test(await readout()), 'release recentres stick');
  // fire button hold
  const fire = await page.locator('.tc-fire').boundingBox();
  await touch(page, 'touchStart', [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 }]);
  await frames(page, 3);
  assert(/held .*fire/.test(await readout()), 'fire held');
  await touch(page, 'touchEnd', []);
  // pause via touch
  await page.locator('.tc-pause').tap();
  await page.waitForSelector('.pause-screen', { timeout: 5000 });
  assert(true, 'pause button opens pause menu');
  await page.locator('.btn', { hasText: 'Quit to menu' }).tap();
  await page.locator('.dialog .btn', { hasText: 'Quit' }).tap();
  await page.waitForSelector('.main-menu', { timeout: 10000 });
  assert(true, 'quit by touch');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-touch-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.some((e) => e.startsWith('[error]') || e.startsWith('[pageerror]')) ? 1 : 0);
}
