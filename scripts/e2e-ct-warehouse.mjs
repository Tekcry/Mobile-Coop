// 3.2.0 Chaos Theory routes on the Warehouse (Free Roam): the drainpipe up to the roof walkway, the rappel down to the
// dispatch window and the kick through, a drop attack from the skylight lip, the pump house (a co-op boost target, out
// of reach alone; its top reaches the roof), the press wall jump, the split over the corridor patrol, the mezzanine
// deck pipe out over the factory floor (a drop attack), the yard fence (climb, flip over; guards walk round). Hunter
// with every guard frozen out of the way; one is brought in for the drop attack checks.
import { launch, frames, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
let failed = false;

await page.evaluate(() => {
  const H = {
    st: () => window.__app.current,
    tp(x, y, z, yaw) {
      const st = H.st();
      st.traversal.reset();
      st.cover.reset();
      const p = st.player;
      p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
    },
    /** Step `s` seconds (120 Hz frames) holding the stick / buttons. */
    run(s, sx = 0, sy = 0, btns = []) {
      const pad = window.__pad;
      pad.axis(0, sx);
      pad.axis(1, -sy);
      for (const b of btns) pad.set(b, 1);
      window.__app.loop.stepHeadless(s, 120);
      pad.axis(0, 0);
      pad.axis(1, 0);
      for (const b of btns) pad.set(b, 0);
    },
    tap(b) {
      window.__pad.set(b, 1);
      window.__app.loop.stepHeadless(2 / 60, 120);
      window.__pad.set(b, 0);
      window.__app.loop.stepHeadless(2 / 60, 120);
    },
    info() {
      const st = H.st();
      const c = st.player.controller;
      const ac = st.traversal.attachCtl;
      const a = ac.m.anchor;
      const rig = st.player.rig;
      const w = st.weapons;
      return {
        x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, grounded: c.grounded,
        attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, top: a?.top ?? 0, nz: a?.nz ?? 0, phase: ac.m.phase, s: ac.m.s, entry: ac.m.entry,
        pipe: ac.pipe.mode, pipeBusy: ac.pipe.busy, trav: st.player.coverPose.traverse, tumble: st.player.coverPose.tumble,
        hint: ac.hint ? `${ac.hint.anchor.kind}:${ac.hint.entry}` : null,
        prompt: st.hud.world.label('vault'), drop: st.hud.world.label('drop'), jump: ac.jump ? ac.jump.anchor.kind : null,
        plantL: [rig.plantL.x, rig.plantL.y, rig.plantL.z, rig.plantL.w], plantR: [rig.plantR.x, rig.plantR.y, rig.plantR.z, rig.plantR.w],
        held: rig.heldWeapon ? true : false, cls: w.current.def.class, mag: w.current.mag, raise: st.player.carry.raise, ads: st.player.ads, stowed: w.isStowed,
        camYaw: st.player.cam.yaw, camPitch: st.player.cam.pitch, camRoll: st.player.cam.camera?.rotation?.z ?? 0,
        landing: c.lastLanding, fall: c.lastFall, landings: c.landings,
        u: ac.u, swing: ac.swingT, window: ac.ropeWindow ? ac.ropeWindow.id : -1, noise: st.noise, gear: c.gear, tkind: st.traversal.kind,
      };
    },
  };
  window.__ct = H;
  window.__app.loop.manual = true;
});
const I = async () => {
  await frames(page, 2);
  await page.evaluate(() => window.__app.loop.stepHeadless(1 / 60, 120));
  return page.evaluate(() => window.__ct.info());
};
const run = (s, sx = 0, sy = 0, btns = []) => page.evaluate(([s, sx, sy, b]) => window.__ct.run(s, sx, sy, b), [s, sx, sy, btns]);
const tap = (b) => page.evaluate((b) => window.__ct.tap(b), b);
const tp = (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => window.__ct.tp(x, y, z, yaw), [x, y, z, yaw]);
const f2 = (v) => (+v).toFixed(2);

try {
  await page.evaluate(() => window.__pad.connect());
  await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await run(0.5);
  await page.evaluate(() => { window.__app.current.target.health.invulnerable = true; });
  const RT = 6.275;
  // every guard frozen, out of sight and untouchable; one of them is brought in where a check needs a guard
  await page.evaluate(() => {
    const g = window.__app.current;
    let k = 0;
    for (const e of g.enemyMgr.enemies) {
      e.update = () => {};
      e.taken = true;
      e.pos.set(-22 + (k++ % 8) * 0.8, -40, 16);
    }
  });
  /** The first guard, standing passive at (x, z). */
  const guard = (x, z, yaw = 0) => page.evaluate(([x, z, yaw]) => {
    const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive);
    e.pos.set(x, 0, z);
    e.yaw = yaw;
    e.taken = false;
    e.passive = true;
    window.__guard = e;
    return e.id;
  }, [x, z, yaw]);
  const dropGuard = () => page.evaluate(() => { const e = window.__guard; if (e) { e.taken = true; e.pos.set(-22, -40, 16); } window.__guard = null; });

  console.log('roof by the drainpipe (west yard), down the rope to the dispatch window');
  // the drainpipe on the facade's south face at x -21.6
  await tp(-21.6, 0, -18.8, 0);
  await run(0.4);
  let i = await I();
  assert(i.hint?.startsWith('pipeV'), `the drainpipe is offered (${i.hint})`);
  await tap(BTN.Y);
  await run(0.6);
  for (let k = 0; k < 30; k++) {
    i = await I();
    if (!i.attached || i.y > RT - 2.1) break;
    await run(0.5, 0, 1);
  }
  i = await I();
  assert(i.attached && i.kind === 'pipeV', `climbed the drainpipe to the roof line (feet ${f2(i.y)})`);
  for (let k = 0; k < 8 && i.attached; k++) {
    await tap(BTN.Y);
    await run(1.2, 0, 1);
    i = await I();
  }
  await run(0.8);
  i = await I();
  assert(!i.attached && i.grounded && Math.abs(i.y - RT) < 0.1, `up on the roof walkway (y ${f2(i.y)})`);
  // the rappel point over the dispatch window (x 1.2)
  await tp(1.2, RT + 0.02, -17.75, Math.PI);
  await run(0.4);
  i = await I();
  assert(i.hint === 'rappel:above' && i.prompt === 'Rappel', `rappel offered at the roof edge (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'rappel' && i.phase === 'on', 'hooked on over the yard');
  await page.evaluate(() => { window.__app.current.player.cam.yaw = 0; });
  for (let k = 0; k < 20 && i.window < 0; k++) {
    await run(0.25, 0, -1);
    i = await I();
  }
  assert(i.window >= 0 && i.prompt === 'Kick through', `beside the dispatch window: kick through ("${i.prompt}", feet ${f2(i.y)})`);
  await tap(BTN.Y);
  await run(2.0);
  i = await I();
  assert(!i.attached && i.z > -17.6 && i.y < 0.3, `kicked through into dispatch (z ${f2(i.z)}, y ${f2(i.y)})`);
  // the skylight lip over the workshop patrol: hang from the roof's north edge, a guard below
  await page.evaluate(() => {
    const g = window.__app.current;
    const L = g.world.level.anchors;
    const lip = L.ledges.filter((l) => Math.abs(l.top - 6.275) < 0.05 && l.nz > 0.9 && l.canHang).sort((a, b) => b.len - a.len)[0];
    window.__lip = lip;
    const s = Math.max(0.5, Math.min(lip.len - 0.5, (16 - lip.a.x) * (lip.b.x > lip.a.x ? 1 : -1)));
    g.traversal.attachCtl.attachTo(lip, s, 'above', 1);
  });
  await run(1.6);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && Math.abs(i.top - RT) < 0.05, `hanging from the skylight lip (top ${f2(i.top)}, feet ${f2(i.y)})`);
  await guard(i.x + 0.3, i.z + 0.3, 0);
  await run(0.4);
  let td = await page.evaluate(() => window.__app.current.takedown.offer?.plan.kind ?? null);
  assert(td === 'drop', `a guard under the skylight: a drop attack (${td})`);
  await dropGuard();
  await page.evaluate(() => window.__app.current.traversal.reset());

  console.log('pump house: the boost target, then the roof');
  const bt = await page.evaluate(() => {
    const g = window.__app.current;
    const V = g.player.position.constructor;
    const t = g.team['boostTarget']({ id: 'm', pos: new V(20.2, 0, -20.3), yaw: Math.PI, mode: 'brace' });
    return t && { kind: t.anchor.kind, y: +t.grip.y.toFixed(2) };
  });
  assert(bt && bt.kind === 'ledge' && Math.abs(bt.y - 4.2) < 0.15, `a braced mate at the pump house tosses onto its 4.2 m lip (${JSON.stringify(bt)})`);
  const wj = await page.evaluate(() => {
    const g = window.__app.current;
    g.player.controller.teleport(new g.player.position.constructor(20.2, 0, -20.6), 0);
    g.player.cam.yaw = 0;
    window.__app.loop.stepHeadless(0.4, 120);
    return g.traversal.attachCtl.hint ? `${g.traversal.attachCtl.hint.anchor.kind}:${g.traversal.attachCtl.hint.entry}` : null;
  });
  assert(wj !== 'ledge:wall' && wj !== 'ledge:below', `alone the pump house is out of reach (${wj})`);
  await tp(20.2, 4.22, -18.7, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:below', `on the pump house: the roof lip is in reach (${i.hint})`);
  for (let k = 0; k < 6 && !(i.grounded && i.y > RT - 0.1); k++) {
    await tap(BTN.Y);
    await run(1.2, 0, 1);
    i = await I();
  }
  assert(i.grounded && Math.abs(i.y - RT) < 0.1, `climbed from the pump house onto the roof (y ${f2(i.y)})`);

  console.log('press: wall jump perch');
  await tp(6, 0, -0.75, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:wall' && i.prompt === 'Wall jump', `wall jump offered at the 3.3 m press (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && Math.abs(i.top - 3.3) < 0.05, `hanging from the press after the kick (top ${f2(i.top)})`);
  for (let k = 0; k < 4 && i.attached; k++) {
    await tap(BTN.Y);
    await run(1.2);
    i = await I();
  }
  assert(!i.attached && Math.abs(i.y - 3.3) < 0.1, `up on the press (y ${f2(i.y)})`);

  console.log('service corridor: split jump over the patrol');
  const splits = await page.evaluate(() => window.__app.current.world.level.anchors.splits.map((g) => [+g.a.x.toFixed(1), +g.a.z.toFixed(1)]));
  assert(splits.length === 1 && Math.abs(splits[0][1] + 10.1) < 0.2, `one split gap on the Warehouse, in the corridor (${JSON.stringify(splits)})`);
  // the cabinet bank (x 7..11, face z -9.35) and the corridor's south wall (face z -10.85)
  await tp(9, 0, -10.1, Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'split:below' && i.prompt === 'Split jump', `split offered in the corridor (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'split' && i.phase === 'on', `braced in the split (y ${f2(i.y)})`);
  await guard(i.x + 0.3, -10.1, Math.PI / 2);
  await run(0.4);
  td = await page.evaluate(() => window.__app.current.takedown.offer?.plan.kind ?? null);
  assert(td === 'drop', `the patrol under the split: a drop attack (${td})`);
  await dropGuard();
  await page.evaluate(() => window.__app.current.traversal.reset());

  console.log('mezzanine deck pipe over the factory floor');
  await tp(17, 2.62, 12.35, Math.PI);
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeH:below', `the pipe is offered from the deck (${i.hint})`);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'pipeH', 'hanging from the deck pipe');
  await page.evaluate(() => {
    const g = window.__app.current;
    const a = g.traversal.attachCtl.m.anchor;
    g.traversal.attachCtl.attachTo(a, 11.5, 'below', 1);
  });
  await run(0.8);
  i = await I();
  assert(i.attached && i.z < 2 && i.y > 2.2, `out over the factory floor (z ${f2(i.z)}, feet ${f2(i.y)})`);
  await guard(i.x + 0.3, i.z + 0.3, 0);
  await run(0.4);
  td = await page.evaluate(() => window.__app.current.takedown.offer?.plan.kind ?? null);
  assert(td === 'drop', `the floor patrol under the pipe: a drop attack (${td})`);
  await dropGuard();
  await page.evaluate(() => window.__app.current.traversal.reset());

  console.log('yard fence');
  await tp(13.8, 0, -24, Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'fence:side', `the fence is offered (${i.hint})`);
  await tap(BTN.Y);
  await run(0.5);
  await page.evaluate(() => { window.__app.current.player.controller.gears.gear = 3; });
  for (let k = 0; k < 10 && i.prompt !== 'Flip over'; k++) {
    await run(0.5, 0, 1);
    i = await I();
  }
  assert(i.prompt === 'Flip over', `at the top ("${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.x > 14.8 && Math.abs(i.y) < 0.1, `over into the east lot (x ${f2(i.x)})`);
  await page.evaluate(() => { window.__app.current.player.controller.gears.gear = 4; });
  // guards walk round it: a path from the west yard to the extraction goes through the gap by the facade
  const path = await page.evaluate(() => {
    const g = window.__app.current;
    const nav = g.enemyMgr.nav;
    const pts = nav.findPath([-14.5, -24], [18.5, -23.2]);
    return pts ? { n: pts.length, maxZ: Math.max(...pts.map((p) => p[1])) } : null;
  });
  assert(path && path.maxZ > -22.4, `the nav path to the extraction goes round the fence (${JSON.stringify(path)})`);

  const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-ct-warehouse OK');
