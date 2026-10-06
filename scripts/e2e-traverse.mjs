// Attached traversal on the Proving Grounds course (north east): ladder (bottom / top entry, climb, slide, step
// off), drainpipe to a lip, ledge grab / shimmy / corners / jump across / climb up / lower in / drop, horizontal
// pipe; hands and feet locked on contacts (< 1 cm while gripping); speed bands; touch + keyboard reach the verbs.
import { launch, frames, BTN, assert, touch } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;

// page helpers: stepping with a held stick / buttons, measuring contacts on every rendered (120 Hz) frame
const setup = () =>
  page.evaluate(() => {
  const H = {
    st: () => window.__app.current,
    tp(x, y, z, yaw) {
      const p = H.st().player;
      p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
    },
    /** Step `s` seconds (120 Hz render frames) holding the stick; record contact drift / reach error. */
    run(s, sx = 0, sy = 0, btns = []) {
      const pad = window.__pad;
      pad.axis(0, sx);
      pad.axis(1, -sy);
      for (const b of btns) pad.set(b, 1);
      const st = H.st();
      const rig = st.player.rig;
      const ac = st.traversal.attachCtl;
      const n = Math.round(s * 60);
      const rec = { maxDrift: 0, maxFootDrift: 0, maxReach: 0, frames: 0, attachedFrames: 0 };
      const last = { L: null, R: null, fL: null, fR: null };
      const hand = rig.p.hand.len * 0.45;
      for (let i = 0; i < n; i++) {
        window.__app.loop.stepHeadless(1 / 60, 120);
        rec.frames++;
        if (!ac.active || ac.m.phase !== 'on') {
          last.L = last.R = last.fL = last.fR = null;
          continue;
        }
        rec.attachedFrames++;
        const c = ac.contacts();
        for (const [k, planted, t, wr] of [
          ['L', c.plantedL, c.handL, rig.wristL],
          ['R', c.plantedR, c.handR, rig.wristR],
        ]) {
          if (!planted) {
            last[k] = null;
            continue;
          }
          if (last[k]) rec.maxDrift = Math.max(rec.maxDrift, Math.hypot(t.x - last[k].x, t.y - last[k].y, t.z - last[k].z));
          last[k] = { ...t };
          // the wrist sits a hand-length behind the palm: an arm that cannot reach shows as extra distance
          wr.computeWorldMatrix(true);
          const w = wr.getAbsolutePosition();
          rec.maxReach = Math.max(rec.maxReach, Math.abs(Math.hypot(w.x - t.x, w.y - t.y, w.z - t.z) - hand));
        }
        if (rig.plantL.w > 0.99) {
          for (const [k, planted, t] of [
            ['fL', c.feetPlantedL, c.footL],
            ['fR', c.feetPlantedR, c.footR],
          ]) {
            if (!planted) {
              last[k] = null;
              continue;
            }
            if (last[k]) rec.maxFootDrift = Math.max(rec.maxFootDrift, Math.hypot(t.x - last[k].x, t.y - last[k].y, t.z - last[k].z));
            last[k] = { ...t };
          }
        }
      }
      pad.axis(0, 0);
      pad.axis(1, 0);
      for (const b of btns) pad.set(b, 0);
      return rec;
    },
    /** Tap a pad button for a couple of steps. */
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
      return {
        x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, grounded: c.grounded,
        attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, nx: a?.nx ?? 0, nz: a?.nz ?? 0, phase: ac.m.phase, s: ac.m.s, v: ac.m.v,
        held: !!st.player.rig.heldWeapon, cam: st.player.cam.attach, trav: st.player.coverPose.traverse,
        hint: ac.hint ? `${ac.hint.anchor.kind}:${ac.hint.entry}` : ac.lower ? `${ac.lower.anchor.kind}:${ac.lower.entry}` : null,
        prompt: st.hud.world.label('vault'), jumpPrompt: st.hud.world.label('jumpTo'), dropPrompt: st.hud.world.label('drop'),
        jump: ac.jump ? ac.jump.anchor.id : -1,
        landing: c.lastLanding, fall: c.lastFall, landT: c.landT, noise: st.noise, tkind: st.traversal.kind,
        vault: st.hud.world.label('vault'), vent: ac.vent ? ac.vent.progress : -1, geo: st.traversal.hint?.kind ?? null, cover: st.cover.state, coverCand: !!st.cover.candidate,
      };
    },
  };
  window.__tr = H;
  window.__app.loop.manual = true;
});
/** State, after a rendered frame so world prompts project through the current view. */;
await setup();
const I = async () => {
  await frames(page, 2);
  await page.evaluate(() => window.__app.loop.stepHeadless(1 / 60, 120));
  return page.evaluate(() => window.__tr.info());
};
const run = (s, sx = 0, sy = 0, btns = []) => page.evaluate(([s, sx, sy, b]) => window.__tr.run(s, sx, sy, b), [s, sx, sy, btns]);
/** Hold the stick until no longer attached (or `max` s). */
async function runOff(max, sx, sy) {
  for (let t = 0; t < max; t += 0.25) {
    await run(0.25, sx, sy);
    if (!(await page.evaluate(() => window.__tr.st().traversal.attachCtl.active))) return;
  }
}
const tap = (b) => page.evaluate((b) => window.__tr.tap(b), b);
const tp = (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => window.__tr.tp(x, y, z, yaw), [x, y, z, yaw]);
const f2 = (v) => v.toFixed(2);
/** Contacts: planted hands / feet never slide; the arms reach their grips. */
function contacts(r, what) {
  assert(r.maxDrift < 0.01, `${what}: planted hands locked (drift ${(r.maxDrift * 100).toFixed(2)} cm < 1 cm)`);
  assert(r.maxReach < 0.03, `${what}: hands reach their grips (${(r.maxReach * 100).toFixed(1)} cm)`);
}

try {
  await page.evaluate(() => window.__pad.connect());
  await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await run(0.5);

  // --- ladder from the bottom: prompt, attach, climb at 1.6 rungs/s with locked hands and feet, step off the top
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.4);
  let i = await I();
  assert(i.hint === 'ladder:bottom' && i.prompt === 'Climb', `ladder offered from the bottom (${i.hint}, prompt "${i.prompt}")`);
  await tap(BTN.Y);
  await run(0.4);
  i = await I();
  assert(i.attached && i.kind === 'ladder', 'Y attaches to the ladder');
  assert(!i.held && i.cam === 'ladder' && i.trav === 'climb', 'weapon stowed, ladder framing, climb pose');
  const s0 = i.s;
  let r = await run(1.5, 0, 1);
  i = await I();
  const rate = (i.s - s0) / 1.5 / 0.3;
  assert(rate > 2.6 && rate < 3.15, `climbs at ~3 rungs/s (${rate.toFixed(2)})`);
  contacts(r, 'ladder');
  assert(r.maxFootDrift < 0.01, `ladder: planted feet locked on the rungs (${(r.maxFootDrift * 100).toFixed(2)} cm)`);
  // sprint held climbs faster (~5 rungs/s), contacts still locked
  const s1 = (await I()).s;
  r = await run(0.6, 0, 1, [BTN.LS]);
  i = await I();
  const fast = (i.s - s1) / 0.6 / 0.3;
  assert(i.attached && fast > 4 && fast < 5.3, `sprint climbs faster (${fast.toFixed(2)} rungs/s)`);
  contacts(r, 'ladder sprint');
  await runOff(8, 0, 1);
  await run(0.5);
  i = await I();
  assert(!i.attached && i.y > 3.5, `steps off at the top onto the tower (y ${f2(i.y)})`);
  await run(1.2);
  i = await I();
  assert(i.held, 'weapon back in the hands after the ladder');

  // --- ladder from the top: turn round and step on, climb down, step off at the bottom
  await tp(26.7, 3.6, 11, -Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ladder:top', `ladder offered from the top (${i.hint})`);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'ladder' && Math.abs(Math.sin(i.yaw) - 1) < 0.1, 'stepped on from the top, turned to face the ladder');
  await runOff(12, 0, -1);
  await run(0.5);
  i = await I();
  assert(!i.attached && i.y < 0.2, `stepped off at the bottom (y ${f2(i.y)})`);

  // --- slide: climb a little, drop slides to the bottom fast
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.3);
  await tap(BTN.Y);
  await run(1.8, 0, 1);
  const hi = (await I()).y;
  await tap(BTN.B);
  r = await run(0.5);
  i = await I();
  assert((hi - i.y) / 0.5 > 2.5 || (!i.attached && i.y < 0.2), `drop slides down the ladder fast (from ${f2(hi)} to ${f2(i.y)} in 0.5 s)`);
  await run(1.5);
  i = await I();
  assert(!i.attached && i.y < 0.2, 'slid to the bottom and stepped off');

  // --- drainpipe: climb, onto the lip at the top, climb up
  await tp(27.8, 0, 8.95, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeV:side', `drainpipe offered (${i.hint})`);
  await tap(BTN.Y);
  await run(0.5);
  const p0 = (await I()).s;
  r = await run(1, 0, 1);
  i = await I();
  assert(i.kind === 'pipeV' && Math.abs((i.s - p0) / 1 - 0.85) < 0.15, `climbs the pipe at ~0.9 m/s (${f2(i.s - p0)})`);
  contacts(r, 'drainpipe');
  r = await run(3, 0, 1);
  i = await I();
  assert(i.attached && i.kind === 'pipeV', `at the top the pipe stops and waits (${i.kind})`);
  assert(i.prompt === 'Climb up', `climb up offered at the top of the pipe ("${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.3);
  i = await I();
  assert(!i.attached && i.y > 3.5 && i.grounded, `climbed straight up off the pipe onto the tower (y ${f2(i.y)})`);
  // sideways at the top: onto the lip beside the pipe (camera facing the wall: stick right = +x)
  await tp(27.8, 0, 8.95, 0);
  await run(0.4);
  await tap(BTN.Y);
  await run(3.4, 0, 1);
  await run(0.6, 1, 0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.nz < -0.9 && i.x > 27.9, `sideways at the top steps onto the lip (${i.kind}, x ${f2(i.x)})`);
  // shimmying back past the pipe swings onto it, carrying on swings off it onto the lip beyond
  let seenPipe = false;
  for (let k = 0; k < 16; k++) {
    await run(0.15, -1, 0);
    const q = await page.evaluate(() => window.__tr.st().traversal.attachCtl.m.anchor?.kind);
    if (q === 'pipeV') seenPipe = true;
  }
  i = await I();
  assert(seenPipe && i.kind === 'ledge' && i.x < 27.6, `shimmying past the pipe climbs onto it and back off beyond (pipe ${seenPipe}, x ${f2(i.x)})`);
  await tap(BTN.B);
  await run(1.2);

  // --- ledge from below: grab, shimmy at ~1.2 m/s with locked hands, corner, jump across, climb up
  await tp(25.45, 0, 16, Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:below' && i.prompt === 'Grab', `ledge offered from below (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(0.5);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.cam === 'hang' && i.trav === 'hang', 'grabbed the lip: hang pose and framing');
  assert(i.dropPrompt === 'Drop', 'drop offered while hanging');
  const z0 = (await I()).z;
  // camera looks +x: stick left is +z
  r = await run(0.8, -1, 0);
  i = await I();
  const sh = Math.abs(i.z - z0) / 0.8;
  assert(sh > 0.85 && sh < 1.3, `shimmies at ~1.2 m/s (${f2(sh)})`);
  contacts(r, 'shimmy');
  // jump across: hanging near the end, the stick towards the next block shows the target, Y jumps
  const blockB = i.id;
  await run(0.3, -0.7, 0);
  i = await I();
  r = await run(0.25, -1, 0);
  i = await I();
  assert(i.jump >= 0 && i.jumpPrompt === 'Jump', `jump target marked under the stick ("${i.jumpPrompt}")`);
  await page.evaluate(() => { window.__pad.axis(0, -1); });
  await tap(BTN.Y);
  r = await run(1.0, -1, 0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.id !== blockB && i.z > 18.9, `jumped across to the next block (z ${f2(i.z)})`);
  // corner: shimmy on round the outside corner onto the north face
  r = await run(3, -1, 0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.nz > 0.9, `wrapped round the outside corner (normal ${f2(i.nx)}, ${f2(i.nz)})`);
  await tap(BTN.Y);
  await run(1.3);
  i = await I();
  assert(!i.attached && Math.abs(i.y - 2.3) < 0.1 && i.grounded, `climbed up on top (y ${f2(i.y)})`);

  // --- lower into a hang from above: hold drop at the edge; then drop to the ground
  await tp(26.45, 2.3, 16, -Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:above' && i.dropPrompt === 'Hang', `at the edge: holding drop / its prompt hangs (${i.hint}, "${i.dropPrompt}")`);
  await run(0.6, 0, 0, [BTN.B]);
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.y < 1, `holding drop lowered into a hang (y ${f2(i.y)})`);
  await tap(BTN.B);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.y < 0.1 && i.grounded, 'drop lets go to the ground');

  // --- horizontal pipe: grab from below, hand over hand, drop
  await tp(25.5, 0, 23.1, 0);
  await page.evaluate(() => { window.__tr.st().player.cam.yaw = Math.PI / 2; });
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeH:below', `pipe offered from below (${i.hint})`);
  await tap(BTN.Y);
  await run(0.5);
  const x0 = (await I()).x;
  r = await run(1.2, 0, 1);
  i = await I();
  assert(i.kind === 'pipeH' && (i.x - x0) / 1.2 > 0.7, `hand over hand along the pipe (${f2((i.x - x0) / 1.2)} m/s)`);
  contacts(r, 'pipe');
  await tap(BTN.B);
  await run(1);
  i = await I();
  assert(!i.attached && i.grounded, 'dropped off the pipe');

  // --- landings: soft under 2.5 m, a roll that keeps going from 2.5-4.5 m, a heavy landing beyond (loud)
  const fall = async (y) => {
    await tp(24, y, 4, 0);
    const seen = await page.evaluate(() => {
      const st = window.__tr.st();
      let roll = false;
      let maxNoise = 0;
      for (let i = 0; i < 150; i++) {
        window.__app.loop.stepHeadless(1 / 60, 120);
        if (st.traversal.kind === 'roll') roll = true;
        maxNoise = Math.max(maxNoise, st.noise);
      }
      return { roll, maxNoise };
    });
    return { ...seen, ...(await I()) };
  };
  let L = await fall(1.6);
  assert(L.landing === 'soft' && !L.roll, `a 1.6 m fall is a soft landing (${L.landing})`);
  L = await fall(3.4);
  assert(L.landing === 'roll' && L.roll && L.z > 4.6, `a 3.4 m fall rolls out of it, moving on (${L.landing}, z ${f2(L.z)})`);
  L = await fall(5.5);
  assert(L.landing === 'heavy' && !L.roll && L.maxNoise >= 14, `a 5.5 m fall is a heavy, loud landing (${L.landing}, noise ${L.maxNoise})`);
  await tp(24, 5.5, 4, 0);
  await page.evaluate(() => { window.__app.loop.stepHeadless(4 / 60, 120); for (let i = 0; i < 80 && !window.__tr.st().player.controller.grounded; i++) window.__app.loop.stepHeadless(1 / 60, 120); window.__app.loop.stepHeadless(2 / 60, 120); });
  i = await I();
  assert(i.landT > 0.4, `heavy landing recovery (${f2(i.landT)} s left)`);

  // --- falling past a lip: Y in the window grabs it
  await tp(27, 5.2, 9.0, 0);
  const grabbed = await page.evaluate(() => {
    const st = window.__tr.st();
    for (let i = 0; i < 60; i++) {
      window.__app.loop.stepHeadless(1 / 60, 120);
      if (st.traversal.attachCtl.hint && !st.traversal.attachCtl.active) {
        window.__tr.tap(3);
        break;
      }
    }
    window.__app.loop.stepHeadless(0.3, 120);
    return st.traversal.attachCtl.active && st.traversal.attachCtl.m.anchor.kind === 'ledge';
  });
  assert(grabbed, 'falling past a lip, Y grabs it');
  await tap(BTN.B);
  await run(1);

  // --- zipline off the tower: attach at the high end, speed builds, fly off the end and land
  await tp(26.5, 3.6, 10.2, Math.PI);
  await run(0.4);
  i = await I();
  assert(i.hint === 'zipline:side' && i.prompt === 'Zipline', `zipline offered on the tower (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  let vmax = 0;
  for (let k = 0; k < 16; k++) {
    await run(0.15);
    const z = await page.evaluate(() => { const ac = window.__tr.st().traversal.attachCtl; return { a: ac.active, v: ac.m.v, k: ac.m.anchor?.kind }; });
    if (z.a && z.k === 'zipline') vmax = Math.max(vmax, z.v);
    if (!z.a && k > 2) break;
  }
  await run(1.5);
  i = await I();
  assert(vmax > 4 && vmax <= 6.01, `zipline speed builds to ${f2(vmax)} m/s (<= 6)`);
  assert(!i.attached && i.grounded && i.z < 3 && i.y < 0.2, `off the end of the cable and landed (z ${f2(i.z)})`);

  // --- windows: vault through an open one; a glazed one shatters (loud) as you go through
  await tp(26, 0, -9.2, 0);
  await run(0.4);
  i = await I();
  assert(i.vault === 'Vault', `open window offers a vault ("${i.vault}")`);
  await tap(BTN.Y);
  await run(1.2);
  i = await I();
  assert(i.z > -7.6 && i.grounded, `vaulted in through the window (z ${f2(i.z)})`);
  await tp(25, 0, -3.1, 0);
  await run(0.4);
  await tap(BTN.Y);
  const glass = await page.evaluate(() => { const st = window.__tr.st(); let n = 0; for (let k = 0; k < 40; k++) { window.__app.loop.stepHeadless(1 / 60, 120); n = Math.max(n, st.noise); } return { open: st.world.breakables.isOpen(`glass:${st.world.level.anchors.windows.find((w) => !w.open).id}`), n }; });
  await run(0.8);
  i = await I();
  assert(glass.open && glass.n >= 15, `the glazed window shatters, loud (noise ${glass.n})`);
  assert(i.z > -1.6, `broke through and out (z ${f2(i.z)})`);

  // --- duct: unscrew the grate quietly (hold Y), crawl through, drop into the shed through the ceiling vent
  await tp(21.75, 3.2, -5, Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'duct:side' && i.vault === 'Kick vent', `vent offered at the duct mouth (${i.hint}, "${i.vault}")`);
  const unscrew = await page.evaluate(() => {
    const st = window.__tr.st();
    window.__pad.set(3, 1);
    let mid = -1;
    let noise = 0;
    for (let k = 0; k < 110; k++) {
      window.__app.loop.stepHeadless(1 / 60, 120);
      const v = st.traversal.attachCtl.vent;
      if (v && k === 60) mid = v.progress;
      noise = Math.max(noise, st.noise);
    }
    window.__pad.set(3, 0);
    window.__app.loop.stepHeadless(0.6, 120);
    return { mid, noise, att: st.traversal.attachCtl.active, kind: st.traversal.attachCtl.m.anchor?.kind };
  });
  assert(unscrew.mid > 0.3 && unscrew.mid < 0.9, `holding Y unscrews the grate (${f2(unscrew.mid)} at 1 s)`);
  assert(unscrew.att && unscrew.kind === 'duct' && unscrew.noise < 3, `crawled in quietly (noise ${unscrew.noise})`);
  i = await I();
  assert(i.cam === 'duct' && i.trav === 'crawl' && !i.held, 'duct: tight framing, crawl pose, weapon stowed');
  // the camera stays inside the duct, looking ahead or turned round
  const camIn = await page.evaluate(() => {
    const st = window.__tr.st();
    const p = st.player;
    let worst = 0;
    for (const yaw of [Math.PI / 2, 0, Math.PI, -Math.PI / 2 + 0.3]) {
      p.cam.yaw = yaw;
      window.__app.loop.stepHeadless(0.3, 120);
      const cp = p.cam.camera.position;
      const from = p.position.clone();
      from.y += 0.45;
      const h = st.ballistics.ray(from, cp.clone(), 1);
      // inside the crawlspace's 1 x 1.1 m section (the duct floor is at 3.2, its roof at 4.3)
      if (h.hit || cp.y < 3.2 || cp.y > 4.3 || Math.abs(cp.z + 5) > 0.5) worst++;
    }
    p.cam.yaw = Math.PI / 2;
    return worst;
  });
  assert(camIn === 0, `duct: the camera never leaves the tunnel (${camIn} of 4 views outside)`);
  const gunTop = await page.evaluate(() => {
    let y = -9;
    for (const sl of window.__tr.st().weapons.slots) for (const m of sl.model.node.getChildMeshes()) { m.computeWorldMatrix(true); y = Math.max(y, m.getBoundingInfo().boundingBox.maximumWorld.y); }
    return y;
  });
  assert(gunTop < 4.28, `duct: the guns on the back stay under the roof (top ${f2(gunTop)} < 4.28)`);
  const d0 = i.x;
  r = await run(1, 0, 1);
  i = await I();
  assert(Math.abs((i.x - d0) - 0.9) < 0.2, `crawls at ~0.9 m/s (${f2(i.x - d0)})`);
  let rolled = false;
  for (let k = 0; k < 30; k++) {
    await run(0.25, 0, 1);
    const st = await page.evaluate(() => ({ a: window.__tr.st().traversal.attachCtl.active, roll: window.__tr.st().traversal.kind === 'roll' }));
    rolled ||= st.roll;
    if (!st.a) break;
  }
  await page.evaluate(() => { for (let k = 0; k < 90; k++) { window.__app.loop.stepHeadless(1 / 60, 120); if (window.__tr.st().traversal.kind === 'roll') window.__rolled = true; } });
  rolled ||= await page.evaluate(() => !!window.__rolled);
  i = await I();
  assert(!i.attached && i.y < 0.2 && i.x > 26.5 && i.x < 29 && i.z > -8 && i.z < -2, `dropped through the ceiling vent into the shed (${f2(i.x)}, ${f2(i.y)}, ${f2(i.z)})`);
  assert(rolled || i.landing === 'roll', `the 3.2 m drop rolls (${i.landing})`);

  // --- keyboard: E attaches (ladder), C lets go of a ledge
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.4);
  await page.keyboard.down('KeyE');
  await page.evaluate(() => window.__app.loop.stepHeadless(3 / 60, 120));
  await page.keyboard.up('KeyE');
  await run(0.4);
  i = await I();
  assert(i.attached && i.kind === 'ladder', 'keyboard E climbs onto the ladder');
  await runOff(8, 0, -1);

  // --- touch: tapping the world prompt grabs the ledge
  // a touch player: no pad (the layer switches to touch)
  await page.evaluate(() => { window.__pad.disconnect(); });
  await tp(25.45, 0, 16, Math.PI / 2);
  await page.evaluate(() => window.__app.loop.stepHeadless(0.4, 120));
  await page.evaluate(() => { window.__app.loop.manual = false; });
  await frames(page, 6);
  /** Tap a world prompt where it is drawn right now (retrying across frames); returns whether one was there. */
  const tapPrompt = async (sel, done) => {
    for (let k = 0; k < 8; k++) {
      const b = await page.evaluate((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r && r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, sel);
      if (b) {
        await page.touchscreen.tap(b.x, b.y);
        await page.waitForTimeout(700);
        if (await done()) return true;
      } else await frames(page, 2);
    }
    return false;
  };
  const attachedNow = () => page.evaluate(() => window.__tr.st().traversal.attachCtl.active);
  assert(await tapPrompt('.wp-vault.show .wp-body', attachedNow), 'touch: tapping the grab prompt grabs the ledge');
  i = await I();
  assert(i.kind === 'ledge', 'touch: hanging from the ledge');
  assert(await tapPrompt('.wp-drop.show .wp-body', async () => !(await attachedNow())), 'touch: tapping the drop prompt lets go');
  i = await I();
  assert(!i.attached, 'touch: tapping drop lets go');

  // --- a grate kicked in: quick and loud (fresh match, so the grate is closed again)
  await page.reload();
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
  await frames(page, 5);
  await setup();
  await page.evaluate(() => window.__pad.connect());
  await tp(21.75, 3.2, -5, Math.PI / 2);
  await run(0.4);
  // touch: holding the vent prompt unscrews (progress shows), letting go early stops it
  await page.evaluate(() => { window.__app.loop.manual = false; });
  await frames(page, 6);
  const vb = await page.evaluate(() => { const r = document.querySelector('.wp-vault.show .wp-body')?.getBoundingClientRect(); return r && r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
  assert(!!vb, 'touch: the vent prompt is on screen');
  await touch(page, 'touchStart', [{ x: vb.x, y: vb.y, id: 7 }]);
  let held = -1;
  for (let k = 0; k < 40 && held < 0.2; k++) {
    await frames(page, 2);
    held = await page.evaluate(() => window.__tr.st().traversal.attachCtl.vent?.progress ?? -1);
  }
  await touch(page, 'touchEnd', []);
  await frames(page, 4);
  const after = await page.evaluate(() => ({ vent: window.__tr.st().traversal.attachCtl.vent, open: window.__tr.st().world.breakables.isOpen(`grate:${window.__tr.st().world.level.anchors.ducts[0].id}:entry`) }));
  assert(held > 0.15 && !after.vent && !after.open, `touch: holding the vent prompt unscrews (${f2(held)}), letting go early stops it`);
  await page.evaluate(() => { window.__app.loop.manual = true; window.__pad.connect(); });
  await tp(21.75, 3.2, -5, Math.PI / 2);
  await run(0.4);
  const kick = await page.evaluate(() => {
    const st = window.__tr.st();
    window.__tr.tap(3);
    let noise = st.noise;
    let t = 4 / 60;
    for (let k = 0; k < 60 && !st.traversal.attachCtl.active; k++) {
      window.__app.loop.stepHeadless(1 / 60, 120);
      t += 1 / 60;
      noise = Math.max(noise, st.noise);
    }
    return { att: st.traversal.attachCtl.active, t, noise };
  });
  assert(kick.att && kick.t < 0.3 && kick.noise >= 10, `a tap kicks the grate in: quick, loud (${f2(kick.t)} s, noise ${kick.noise})`);

  const errs = errors.filter((e) => !/favicon|DevTools/.test(e));
  assert(errs.length === 0, `no console errors (${errs.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(e.message ?? e);
  console.error('state', JSON.stringify(await I().catch(() => null)));
  if (errors.length) console.error(errors.slice(0, 5).join('\n'));
}
await browser.close();
process.exit(failed ? 1 : 0);
