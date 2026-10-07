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
  await page.locator('.tab', { hasText: 'Graphics' }).tap();
  assert((await page.evaluate(() => document.querySelector('.tab.active')?.textContent)) === 'Graphics', 'tap switches tab');
  await page.locator('.settings-screen .screen-back').tap();
  await page.waitForSelector('.settings-screen', { state: 'detached' });
  assert(true, 'back button closes settings');
  await page.locator('.btn', { hasText: 'Play' }).first().tap();
  await page.waitForSelector('.play-screen');
  await page.locator('.play-screen .row-choice').first().locator('.choice-arrow').first().tap();
  assert(/Free Roam/.test(await page.evaluate(() => document.querySelector('.play-screen .choice-val')?.textContent ?? '')), 'tap arrow picks Free Roam');
  await page.locator('.btn', { hasText: 'Deploy' }).tap();
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
  assert(r2.yaw - yaw0 > 0.1 && r2.my > 0.5, `drag-look while moving (yaw +${(r2.yaw - yaw0).toFixed(2)})`);
  await end();
  await frames(page, 3);
  const r3 = await state();
  assert(r3.mx === 0 && r3.my === 0, 'release recentres stick');
  // floating move stick: touching anywhere on the left half re-centres the base there
  const endF = await drag(page, { x: vp.width * 0.3, y: vp.height * 0.5 }, { x: vp.width * 0.3 + 50, y: vp.height * 0.5 });
  await frames(page, 2);
  const fl = await page.evaluate(() => {
    const el = document.querySelector('.tc-move').getBoundingClientRect();
    return { cx: el.left + el.width / 2, mx: window.__app.input.state.move.x };
  });
  assert(Math.abs(fl.cx - vp.width * 0.3) < 4 && fl.mx > 0.5, `floating stick centres on the touch (${fl.cx.toFixed(0)}, move x ${fl.mx.toFixed(2)})`);
  await endF();
  await frames(page, 3);
  // camera-only right stick: rate based (holding it deflected keeps turning), never fires
  const look = await page.locator('.tc-look').boundingBox();
  const lc = { x: look.x + look.width / 2, y: look.y + look.height / 2 };
  await touch(page, 'touchStart', [{ x: lc.x, y: lc.y, id: 5 }]);
  await touch(page, 'touchMove', [{ x: lc.x + look.width * 0.45, y: lc.y, id: 5 }]);
  const ys = [];
  for (let i = 0; i < 3; i++) {
    // short samples: on slow software-GL frames a long one turns past half a circle and reads backwards
    await frames(page, 4);
    ys.push((await state()).yaw);
  }
  const held = await state();
  const dYaw = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  assert(dYaw(ys[0], ys[1]) > 0.02 && dYaw(ys[1], ys[2]) > 0.02, `camera stick turns at a rate while held (${ys.map((v) => v.toFixed(2)).join(' ')})`);
  assert(!held.fire, 'camera stick never fires');
  await touch(page, 'touchEnd', []);
  await frames(page, 30);
  const y1 = (await state()).yaw;
  await frames(page, 10);
  assert(Math.abs((await state()).yaw - y1) < 0.01, 'camera stops when the stick is released');
  // fire button hold: fires, and the camera does not move
  const fire = await page.locator('.tc-fire').boundingBox();
  const fy0 = (await state()).yaw;
  await touch(page, 'touchStart', [{ x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 3 }]);
  await touch(page, 'touchMove', [{ x: fire.x + fire.width / 2 + 30, y: fire.y + fire.height / 2, id: 3 }]);
  await frames(page, 3);
  const fs = await state();
  assert(fs.fire, 'fire held');
  assert(Math.abs(fs.yaw - fy0) < 0.01, 'fire button never moves the camera (default)');
  await touch(page, 'touchEnd', []);
  // sizes: fire >= 76 px, secondary >= 56 px
  const sizes = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('.touch-layer .tc')].filter((e) => !e.hidden && !e.classList.contains('tc-hidden')).map((e) => [e.className.match(/tc-(\w+)/g).find((c) => c !== 'tc-btn' && c !== 'tc-stick')?.slice(3), e.getBoundingClientRect().width])),
  );
  assert(sizes.fire >= 76, `fire button ${sizes.fire}px`);
  for (const id of ['reload', 'crouch', 'swap', 'grenade', 'gadgets', 'dash', 'ads', 'vision', 'speed']) assert(sizes[id] >= 56, `${id} ${sizes[id]}px >= 56`);
  // 3.2.0 speed rocker: the up half steps the gear up, the down half down; its pips always show the gear, the HUD
  // pips show after a change
  const gearNow = () => page.evaluate(() => ({ gear: window.__app.current.player.controller.gear, pips: document.querySelectorAll('.tc-speed .tc-sp-pips i.on').length, hud: document.querySelector('.tac-gear')?.classList.contains('show') ?? false }));
  const tapIn = async (sel) => {
    const b = await page.locator(sel).boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await frames(page, 4);
  };
  const g0 = await gearNow();
  assert(g0.pips === g0.gear, `rocker pips show the gear (${g0.pips} lit, gear ${g0.gear})`);
  await tapIn('.tc-speed .tc-sp-up');
  const g1 = await gearNow();
  await tapIn('.tc-speed .tc-sp-down');
  await tapIn('.tc-speed .tc-sp-down');
  const g2 = await gearNow();
  assert(g1.gear === g0.gear + 1 && g1.pips === g1.gear && g1.hud && g2.gear === g0.gear - 1 && g2.pips === g2.gear, `rocker: up ${g0.gear} -> ${g1.gear}, down -> ${g2.gear}; HUD pips shown after a change (${g1.hud})`);
  await page.waitForTimeout(2200);
  assert(!(await gearNow()).hud, 'HUD gear pips fade after 1.5 s');
  // forward roll by touch: top gear on the rocker, push the stick, tap crouch
  for (let i = 0; i < 4; i++) await tapIn('.tc-speed .tc-sp-up');
  await page.evaluate(() => { const g = window.__app.current; const p = g.player; p.controller.teleport(new p.controller.pos.constructor(-10, 0, -14), Math.PI / 2); p.cam.yaw = Math.PI / 2; });
  await frames(page, 4);
  const rolls0 = await page.evaluate(() => window.__app.current.traversal.forwardRolls);
  const endR = await drag(page, { x: vp.width * 0.18, y: vp.height * 0.7 }, { x: vp.width * 0.18, y: vp.height * 0.7 - 70 });
  await page.waitForFunction(() => window.__app.current.player.controller.speed > 3, null, { timeout: 8000 }).catch(() => {});
  const cr = await page.locator('.tc-crouch').boundingBox();
  await touch(page, 'touchStart', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 70, id: 0 }, { x: cr.x + cr.width / 2, y: cr.y + cr.height / 2, id: 7 }]);
  await frames(page, 2);
  await touch(page, 'touchEnd', [{ x: vp.width * 0.18, y: vp.height * 0.7 - 70, id: 0 }]);
  await page.waitForFunction((r) => window.__app.current.traversal.forwardRolls > r, rolls0, { timeout: 6000 }).catch(() => {});
  await endR();
  const rolled = await page.evaluate(() => window.__app.current.traversal.forwardRolls);
  assert(rolled === rolls0 + 1, `touch: crouch at gear 6 while moving rolls (${rolled - rolls0})`);
  await page.waitForFunction(() => window.__app.current.traversal.kind === 'none', null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => { const c = window.__app.current.player.controller; c.gears.set(4); });
  await frames(page, 4);
  if (await page.evaluate(() => window.__app.current.player.controller.crouched)) await tapIn('.tc-crouch');
  // the action button is only for "use": hidden with nothing in reach
  const actHidden = await page.evaluate(() => document.querySelector('.tc-action').classList.contains('tc-hidden'));
  assert(actHidden, 'action button hidden with nothing to use');
  // cover by touch: tap the take-cover prompt on the wall (a real touch on the world prompt)
  await page.evaluate(() => { const g = window.__app.current; const p = g.player; g.cover.reset(); p.controller.teleport(new p.controller.pos.constructor(-3.7, 0, -6), -Math.PI / 2); p.cam.yaw = -Math.PI / 2; p.cam.pitch = -0.1; });
  let cst = 'none';
  // (retried: the prompt can blink while the camera springs settle after the teleport, and moves with the view)
  for (let i = 0; i < 5 && cst !== 'in'; i++) {
    await page.waitForSelector('.wp-cover.show .wp-body', { timeout: 15000 }).catch(async (e) => {
      const st = await page.evaluate(() => { const g = window.__app.current; const p = g.player.position; return { map: g.opts.map.id, pos: [p.x, p.y, p.z].map((v) => v.toFixed(2)), cover: g.cover.state, cand: !!g.cover.candidate, prompts: [...document.querySelectorAll('.hud-world > *')].map((x) => x.className).join('|') }; });
      throw new Error(`${e.message.split('\n')[0]} ${JSON.stringify(st)}`);
    });
    await page.waitForTimeout(600);
    const el = await page.$('.wp-cover.show .wp-body');
    const bx = el ? await el.boundingBox() : null;
    if (!bx) continue;
    await page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2);
    await page.waitForTimeout(900);
    // (under load the glide into cover can still be running: wait for it to land)
    await page.waitForFunction(() => window.__app.current.cover.state !== 'enter', null, { timeout: 8000 }).catch(() => {});
    cst = await page.evaluate(() => window.__app.current.cover.state);
  }
  assert(cst === 'in', `tapping the take-cover prompt on the surface takes cover (${cst})`);
  await page.waitForTimeout(300);
  const badge = await page.evaluate(() => !!document.querySelector('.wp-state.show'));
  assert(!badge, 'no cover badge or button on the wall in use');
  // leaving by touch: push the move stick away from the wall
  await page.evaluate(() => window.__app.input.state.setMove('touch-test', 0, -1));
  await page.waitForTimeout(700);
  // (held until it lets go: under load the game clock runs behind the wall clock)
  await page.waitForFunction(() => window.__app.current.cover.state === 'none', null, { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => window.__app.input.state.setMove('touch-test', 0, 0));
  cst = await page.evaluate(() => window.__app.current.cover.state);
  assert(cst === 'none', `pushing away from the wall leaves cover (${cst})`);
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
