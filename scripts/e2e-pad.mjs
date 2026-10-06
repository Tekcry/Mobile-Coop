// Controller-only navigation test: every step uses the fake gamepad, never the screen.
// Run against `npm run preview` (default http://localhost:4173/).
import { launch, press, stick, BTN, focusedText, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const q = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
const settings = () => page.evaluate(() => window.__app.settings.get());
let failed = false;
try {
  console.log('hot-plug + iOS first-press detection');
  await page.evaluate(() => window.__pad.connect());
  await press(page, BTN.LB); // harmless on main menu; reveals the pad like iOS
  await page.waitForTimeout(250);
  const toast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|'));
  assert(/Controller connected/.test(toast), `connect toast ("${toast}")`);
  assert(await page.evaluate(() => document.body.classList.contains('input-gamepad')), 'mode = gamepad');

  console.log('main menu');
  const first = await focusedText(page);
  assert(first.length > 0, `initial focus "${first}"`);
  await press(page, BTN.DOWN);
  let f = await focusedText(page);
  while (!/Settings/.test(f)) {
    await press(page, BTN.DOWN);
    const nf = await focusedText(page);
    if (nf === f) break;
    f = nf;
  }
  assert(/Settings/.test(f), 'd-pad reaches Settings');
  await press(page, BTN.A);
  assert(await q('.settings-screen'), 'A opens settings');
  const tab0 = await page.evaluate(() => document.querySelector('.tab.active')?.textContent);
  await press(page, BTN.RB);
  const tab1 = await page.evaluate(() => document.querySelector('.tab.active')?.textContent);
  assert(tab0 !== tab1 && tab1 === 'Controller', `RB switches tab (${tab0} -> ${tab1})`);
  // find the horizontal sensitivity slider
  for (let i = 0; i < 8 && !/Horizontal/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Horizontal/.test(await focusedText(page)), 'focus on Horizontal sensitivity');
  const before = (await settings()).gamepad.lookSensitivityX;
  await press(page, BTN.RIGHT);
  await press(page, BTN.RIGHT);
  const after = (await settings()).gamepad.lookSensitivityX;
  assert(after > before, `d-pad right raises slider (${before} -> ${after})`);
  // left stick nav
  await stick(page, 1, 1);
  assert(/Vertical/.test(await focusedText(page)), 'left stick moves focus down');
  await press(page, BTN.LB);
  await press(page, BTN.LB);
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Data', 'LB wraps tabs backwards');
  // Accessibility: HUD size by d-pad, the Controls screen per input type
  await press(page, BTN.LB);
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Accessibility', 'Accessibility tab');
  assert(/Controls/.test(await focusedText(page)), `first focus on Controls ("${await focusedText(page)}")`);
  await press(page, BTN.DOWN);
  assert(/HUD size/.test(await focusedText(page)), 'focus HUD size');
  const hs0 = (await settings()).access.hudScale;
  await press(page, BTN.RIGHT);
  assert((await settings()).access.hudScale > hs0, 'd-pad right enlarges the HUD');
  await press(page, BTN.UP);
  await press(page, BTN.A);
  assert(await q('.controls-screen'), 'A opens the Controls screen');
  const ct0 = await page.evaluate(() => document.querySelector('.controls-screen .tab.active')?.textContent);
  await press(page, BTN.RB);
  const ct1 = await page.evaluate(() => document.querySelector('.controls-screen .tab.active')?.textContent);
  assert(ct0 === 'Controller' && ct1 !== ct0 && (await page.evaluate(() => document.querySelectorAll('.controls-screen .tab-panel.active .controls-row').length)) > 8, `controls per input type (${ct0} -> ${ct1})`);
  await press(page, BTN.B);
  assert(!(await q('.controls-screen')) && (await q('.settings-screen')), 'B returns to Settings');
  await press(page, BTN.B);
  assert(!(await q('.settings-screen')), 'B closes settings');
  assert(/Settings/.test(await focusedText(page)), 'focus restored to Settings');

  console.log('layout editor');
  await press(page, BTN.A);
  for (let i = 0; i < 24 && !/Edit button layout/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  await press(page, BTN.A);
  assert(await q('.layout-editor'), 'layout editor opens');
  const fx = (await settings()).touch.layout;
  const focusedCtl = await page.evaluate(() => document.querySelector('.le-handle.focused .le-label')?.textContent);
  await press(page, BTN.A); // grab
  await press(page, BTN.RIGHT);
  await press(page, BTN.RIGHT);
  await press(page, BTN.A); // drop
  const fx2 = (await settings()).touch.layout;
  const moved = Object.keys(fx).filter((k) => fx[k].x !== fx2[k].x);
  assert(moved.length === 1, `grab+move+drop moved one control (${focusedCtl}: ${moved})`);
  await press(page, BTN.RB);
  const fx3 = (await settings()).touch.layout;
  assert(Object.keys(fx).some((k) => fx3[k].scale > fx2[k].scale), 'RB enlarges selected control');
  await press(page, BTN.B);
  await press(page, BTN.B);
  await press(page, BTN.B);
  assert(await q('.main-menu') && !(await q('.settings-screen')), 'B backs out to main menu');

  console.log('play setup + in-game pause flow');
  for (let i = 0; i < 6 && !/^Play/.test(await focusedText(page)); i++) await press(page, BTN.UP);
  assert(/^Play/.test(await focusedText(page)), 'menu wraps / reaches Play');
  await press(page, BTN.A);
  assert(await q('.play-screen'), 'A opens the play setup');
  assert(/Mode/.test(await focusedText(page)), 'mode picker focused first');
  await press(page, BTN.LEFT);
  assert(/Free Roam/.test(await focusedText(page)), 'd-pad left cycles mode to Free Roam');
  for (let i = 0; i < 6 && !/Deploy/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  assert(/Deploy/.test(await focusedText(page)), 'focus Deploy');
  await press(page, BTN.A);
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 30000 });
  assert(await page.evaluate(() => document.querySelector('.touch-layer')?.hidden === true), 'touch controls hidden in gamepad mode');
  await press(page, BTN.START);
  assert(await q('.pause-screen'), 'Start opens pause');
  await press(page, BTN.B);
  assert(!(await q('.pause-screen')), 'B resumes');
  await press(page, BTN.START);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  assert(/Quit/.test(await focusedText(page)), 'focus Quit');
  await press(page, BTN.A);
  assert(await q('.dialog'), 'confirm dialog');
  assert(/Quit/.test(await focusedText(page)), 'dialog primary focused');
  await press(page, BTN.A);
  await page.waitForTimeout(400);
  assert(await q('.main-menu'), 'quit returns to main menu');

  console.log('disconnect');
  await page.evaluate(() => window.__pad.disconnect());
  // the pad is noticed on the next poll; under software GL a frame can take a while
  await page.waitForFunction(() => [...document.querySelectorAll('.toast')].some((t) => /disconnected/.test(t.textContent ?? '')), null, { timeout: 8000 }).catch(() => {});
  const t2 = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join('|'));
  assert(/disconnected/.test(t2), 'disconnect toast');
  assert(await page.evaluate(() => document.body.classList.contains('input-touch')), 'mode reverts to touch');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-pad-fail.png' });
} finally {
  const bad = errors.filter((e) => !e.includes('GPU stall') && !e.includes('swiftshader'));
  console.log(bad.length ? 'console problems:\n' + bad.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || bad.some((e) => e.startsWith('[error]') || e.startsWith('[pageerror]')) ? 1 : 0);
}
