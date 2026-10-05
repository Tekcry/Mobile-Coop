// Touch-only test: menus by tap, virtual sticks by multi-touch drag.
import { launch, assert, frames, drag, touch } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
let failed = false;
const state = () => page.evaluate(() => {
  const a = window.__app; const st = a.input.state; const p = a.current.player;
  return { mx: st.move.x, my: st.move.y, fire: st.down('fire'), yaw: p ? p.cam.yaw : 0 };
});
try {
  assert(await page.evaluate(() => document.body.classList.contains('input-touch')), 'starts in touch mode');
  await page.locator('.btn', { hasText: 'Settings' }).tap();
  await page.waitForSelector('.settings-screen');
  await page.locator('.tab', { hasText: 'Video' }).tap();
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Video', 'tap switches tab');
  await page.locator('.settings-screen .screen-back').tap();
  await page.waitForSelector('.settings-screen', { state: 'detached' });
  assert(true, 'back button closes settings');
  await page.locator('.btn', { hasText: 'Free roam' }).tap();
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 20000 });
  await page.evaluate(() => window.__app.settings.update((s) => { s.touch.aimAssist = 'off'; }));
  await frames(page, 5);
  assert(await page.evaluate(() => document.querySelector('.touch-layer')?.hidden === false), 'touch controls visible');
  const vp = page.viewportSize();
  // left stick: drag up -> forward
  const end = await drag(page, { x: vp.width * 0.18, y: vp.height * 0.7 }, { x: vp.width * 0.18, y: vp.height * 0.7 - 60 });
  await frames(page, 2);
  const r1 = await state();
  assert(r1.my > 0.5, `stick forward (move ${r1.mx.toFixed(2)}, ${r1.my.toFixed(2)})`);
  const yaw0 = r1.yaw;
  // simultaneously look with right side (second finger)
  await touch(page, 'touchMove', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 60, id: 0 }, { x: vp.width * 0.6, y: vp.height * 0.4, id: 1 }]);
  for (let i = 1; i <= 5; i++) {
    await touch(page, 'touchMove', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 60, id: 0 }, { x: vp.width * 0.6 + i * 20, y: vp.height * 0.4, id: 1 }]);
    await frames(page, 1);
  }
  const r2 = await state();
  assert(r2.yaw - yaw0 > 0.1 && r2.my > 0.5, `look while moving (yaw +${(r2.yaw - yaw0).toFixed(2)})`);
  await end();
  await frames(page, 3);
  const r3 = await state();
  assert(r3.mx === 0 && r3.my === 0, 'release recentres stick');
  // fire button hold
  const fire = await page.locator('.tc-fire').boundingBox();
  await touch(page, 'touchStart', [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 }]);
  await frames(page, 3);
  assert((await state()).fire, 'fire held');
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
