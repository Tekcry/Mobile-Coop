// Training course on Proving Grounds (Play > Training), played by touch: hints for the device in use, each verb
// advances the course (move, sneak, vault, ladder, goggles, the touch Takedown button on a passive guard,
// a gadget), then TRAINING COMPLETE and the results. Also the HUD v3 defaults: no
// health bar, the ammo readout fades, the hold ring, subtitles.
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving&mode=training' });
const G = (f, a) => page.evaluate(f, a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const step = () => G(() => window.__app.current.mode.course.step?.id ?? 'done');
let failed = false;
try {
  await page.waitForFunction(() => window.__app.current?.mode?.id === 'training' && window.__app.current.player, null, { timeout: 60000 });
  await wait(500);
  const obj = await G(() => window.__app.current.hud['objective'].textContent);
  assert(/Move to the marker/.test(obj) && /left half/.test(obj), `the step and the touch hint ("${obj}")`);
  const marker = await G(() => window.__app.current.mode.blips().length);
  assert(marker === 1, 'a marker on the target');
  // HUD v3 defaults
  const hud = await G(() => ({ noBar: document.querySelector('.hud').classList.contains('no-hbar'), bar: getComputedStyle(document.querySelector('.bar.health')).display }));
  assert(hud.noBar && hud.bar === 'none', 'no health bar by default (screen-edge vignette)');
  await G(() => window.__app.loop.stepHeadless(0.1));
  await wait(3400);
  const quiet = await G(() => document.querySelector('.hud-weapon').classList.contains('quiet'));
  assert(quiet, 'the ammo readout fades when nothing changes');

  // move, then sneak
  await G(() => {
    const a = window.__app;
    a.input.state.setMove('t', 0, 1);
    a.loop.stepHeadless(2.5);
    a.input.state.setMove('t', 0, 0);
    a.loop.stepHeadless(0.3);
  });
  assert((await step()) === 'sneak', `moving to the marker advances (${await step()})`);
  await G(() => {
    const a = window.__app;
    a.input.state.tap('crouch');
    a.loop.stepHeadless(0.4);
    a.input.state.setMove('t', 0, 0.5);
    a.loop.stepHeadless(2.5);
    a.input.state.setMove('t', 0, 0);
    a.input.state.tap('crouch');
    a.loop.stepHeadless(0.5);
  });
  assert((await step()) === 'vault', `sneaking advances (${await step()})`);

  // the low crate, then vault it
  await G(() => {
    const a = window.__app;
    const g = a.current;
    const t = g.mode['targets'].cover;
    const V = g.player.position.constructor;
    // face the crate (the target stands off its face along the normal)
    const seg = g.world.level.coverSegments.filter((c) => c.low).sort((p, q) => Math.hypot((p.ax + p.bx) / 2 - t.x, (p.az + p.bz) / 2 - t.z) - Math.hypot((q.ax + q.bx) / 2 - t.x, (q.az + q.bz) / 2 - t.z))[0];
    g.player.controller.teleport(new V(t.x, t.y + 0.05, t.z), Math.atan2(-seg.nx, -seg.nz));
    g.player.cam.yaw = Math.atan2(-seg.nx, -seg.nz);
    a.loop.stepHeadless(0.6);
    a.loop.stepHeadless(1.2);
  });
  await G(() => {
    const a = window.__app;
    a.input.state.tap('jump');
    a.loop.stepHeadless(2);
  });
  assert((await step()) === 'ladder', `vaulting advances (${await step()})`);

  // the ladder
  const ladder = await G(() => {
    const a = window.__app;
    const g = a.current;
    const t = g.mode['targets'].ladder;
    const l = g.world.level.anchors.ladders.find((x) => Math.abs(x.base.x - t.x) < 0.01 && Math.abs(x.base.z - t.z) < 0.01);
    const V = g.player.position.constructor;
    for (const d of [0.6, 0.9]) {
      g.player.controller.teleport(new V(l.base.x - Math.sin(l.facing) * d, l.base.y + 0.05, l.base.z - Math.cos(l.facing) * d), l.facing);
      g.player.cam.yaw = l.facing;
      a.loop.stepHeadless(0.6);
      a.input.state.tap('jump');
      a.loop.stepHeadless(1.2);
      if (g.mode.course.step?.id !== 'ladder') return true;
    }
    return g.traversal.attached;
  });
  assert(ladder && (await step()) === 'goggles', `climbing the ladder advances (${await step()})`);
  await G(() => {
    const a = window.__app;
    a.current.traversal.reset();
    a.input.state.tap('vision');
    a.loop.stepHeadless(0.4);
    a.input.state.tap('vision');
    a.input.state.tap('vision');
    a.loop.stepHeadless(0.4);
  });
  assert((await step()) === 'takedown', `goggles advance (${await step()})`);

  // the takedown by the touch button: hidden until one is on offer
  const hiddenBefore = await G(() => getComputedStyle(document.querySelector('.tc-takedown')).display === 'none' || document.querySelector('.tc-takedown').hidden);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    const e = g.mode['guards'][0];
    const V = g.player.position.constructor;
    g.player.controller.teleport(new V(e.pos.x - Math.sin(e.yaw) * 1.1, e.pos.y + 0.05, e.pos.z - Math.cos(e.yaw) * 1.1), e.yaw);
    g.player.cam.yaw = e.yaw;
    a.loop.stepHeadless(0.4);
  });
  await page.waitForFunction(() => { const b = document.querySelector('.tc-takedown'); return b && !b.hidden && getComputedStyle(b).display !== 'none'; }, null, { timeout: 8000 });
  assert(hiddenBefore, 'the takedown button is hidden with nothing on offer');
  await page.locator('.tc-takedown').tap();
  // (3.2.0: from behind the first tap grabs him; the second takes him down)
  await page.waitForFunction(() => window.__app.current.takedown.hostage !== null, null, { timeout: 8000 });
  await page.locator('.tc-takedown').tap();
  await page.waitForFunction(() => window.__app.current.mode.course.step?.id !== 'takedown', null, { timeout: 15000 });
  assert((await step()) === 'gadget', 'the touch takedown button takes the guard down; on to the gadget');

  // a gadget: hold to aim, release to throw
  await G(() => {
    const a = window.__app;
    a.loop.stepHeadless(1.5);
    a.input.state.set('t', 'grenade', true);
    a.loop.stepHeadless(0.4);
    a.input.state.set('t', 'grenade', false);
    a.loop.stepHeadless(1.5);
  });
  await page.waitForFunction(() => !!document.querySelector('.results-screen'), null, { timeout: 15000 });
  const res = await G(() => ({ title: document.querySelector('.results-title')?.textContent, sub: document.querySelector('.results-sub')?.textContent }));
  assert(res.title === 'VICTORY' && /Training complete/.test(res.sub ?? ''), `the course ends with the results (${JSON.stringify(res)})`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-training-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
