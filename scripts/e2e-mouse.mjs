// PC keyboard + mouse: the mouse is captured (pointer lock) in a match. A click on the game captures it
// (that click never fires) and hides the "click to capture" hint; captured, moving looks, left fires,
// the wheel swaps weapons; losing the capture (Esc) pauses; clicking Resume captures it again.
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving', touch: false });
let failed = false;
const st = () =>
  page.evaluate(() => {
    const g = window.__app.current;
    return {
      locked: !!document.pointerLockElement,
      hint: !document.querySelector('.mouse-capture-hint').hidden,
      fire: window.__app.input.state.down('fire'),
      yaw: g.player.cam.yaw,
      weapon: g.weapons.index,
      paused: !g.simulating,
      mode: window.__app.input.mode,
    };
  });
try {
  await page.waitForTimeout(1200);
  let s = await st();
  // the match starts with a lock request; headless Chromium may grant it without a gesture
  assert(s.mode === 'kbm' && (s.locked ? !s.hint : s.hint), `match start: captured, or free with the hint shown (${JSON.stringify(s)})`);
  await page.mouse.move(640, 320);
  if (!s.locked) {
    await page.mouse.down();
    await page.waitForTimeout(100);
    s = await st();
    assert(s.locked && !s.hint && !s.fire, `a click captures the mouse and does not fire (${JSON.stringify(s)})`);
    await page.mouse.up();
  }
  const yaw0 = s.yaw;
  await page.mouse.move(760, 320, { steps: 6 });
  await page.waitForTimeout(200);
  s = await st();
  assert(Math.abs(s.yaw - yaw0) > 0.1, `captured mouse movement looks (yaw ${yaw0.toFixed(2)} -> ${s.yaw.toFixed(2)})`);
  await page.mouse.down();
  await page.waitForTimeout(100);
  assert((await st()).fire, 'left button fires while captured');
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert(!(await st()).fire, 'releasing the button stops firing');
  const w0 = (await st()).weapon;
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1200);
  s = await st();
  assert(s.weapon !== w0, `wheel swaps weapons (${w0} -> ${s.weapon})`);
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(300);
  s = await st();
  assert(!s.locked && s.paused, `losing the capture (Esc) pauses the match (${JSON.stringify(s)})`);
  await page.waitForTimeout(1200);
  await page.locator('.btn', { hasText: 'Resume' }).click();
  await page.waitForTimeout(300);
  s = await st();
  assert(s.locked && !s.paused && !s.hint, `clicking Resume captures the mouse again (${JSON.stringify(s)})`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: '/tmp/e2e-mouse-fail.png' });
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
