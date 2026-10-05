// Animation / camera quality bars, measured in the running game (Proving Grounds, headless stepping):
// start weight shift and walk-up time, stop settle, foot locking (< 1 cm slide), stepped turns and the
// aim turn cap, stance timings, weapon clip timings (raise / lower / reloads / swap / grenade),
// transition continuity, cover entry / peek / edge prep / exit, hit flinch recovery, camera follow lag,
// framing blends, shoulder swap, bob, drift, dash FOV, bounded angular velocity / acceleration, and
// 60 vs 120 Hz parity.
import { launch, assert as hard } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
const within = (v, lo, hi) => v >= lo && v <= hi;
// every bar is reported (SOFT=1 keeps going after a miss, for tuning)
const assert = (cond, msg) => {
  if (cond || !process.env.SOFT) return hard(cond, msg);
  failed = true;
  console.log('  FAIL -', msg);
};
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

await G(() => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const V = p.position.constructor;
  g.target.damageMul = 0;
  const st = a.input.state;
  window.__t = {
    tp(x, z, yaw) {
      g.cover.reset();
      g.corners.reset();
      c.teleport(new V(x, 0, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
      p.cam.snap();
      st.move.x = st.move.y = 0;
      a.loop.stepHeadless(1.2);
    },
    /** Step `sec` seconds holding input; `sample(t)` per 60 Hz step; `hz` = render rate. */
    run(sec, inp, sample, hz = 60) {
      const out = [];
      const n = Math.round(sec * 60);
      for (let k = 1; k <= n; k++) {
        st.move.x = inp.x ?? 0;
        st.move.y = inp.y ?? 0;
        st.set('anim-ads', 'ads', !!inp.ads);
        if (inp.taps?.[k]) st.tap(inp.taps[k]);
        a.loop.stepHeadless(1 / 60, hz);
        if (sample) out.push(sample(k / 60));
      }
      st.move.x = st.move.y = 0;
      st.set('anim-ads', 'ads', false);
      return out;
    },
    ankle(side) {
      const n = side < 0 ? p.rig.ankleL : p.rig.ankleR;
      n.computeWorldMatrix(true);
      return n.getAbsolutePosition();
    },
  };
});

try {
  // ---------------------------------------------------------------- pace: start / stop
  console.log('pace');
  const start = await G(() => {
    const t = window.__t;
    t.tp(8, -14, -Math.PI / 2);
    const c = window.__app.current.player.controller;
    return t.run(2.2, { y: 1 }, (s) => [s, c.speed]);
  });
  const firstMove = start.find(([, v]) => v > 0.05)?.[0] ?? 99;
  // full stick: walk pace first (brisk only builds after holding it, briskDelay)
  const plateau = 0.9;
  const walkAt = start.find(([, v]) => v >= plateau * 0.95)?.[0] ?? 99;
  assert(within(firstMove, 0.2, 0.45), `weight shift before the first step: ${f2(firstMove)} s (250-400 ms)`);
  assert(within(walkAt, 0.75, 1.15), `walk speed (${f2(plateau)} m/s) reached over ${f2(walkAt)} s (0.8-1.0 s)`);
  const stop = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    const c = p.controller;
    t.run(1.0, { y: 0.8 });
    let plants = 0;
    let prevL = p.rig.planner.L.contact;
    let prevR = p.rig.planner.R.contact;
    const out = t.run(1.4, {}, (s) => {
      const L = p.rig.planner.L.contact;
      const R = p.rig.planner.R.contact;
      if (L && !prevL) plants++;
      if (R && !prevR) plants++;
      prevL = L;
      prevR = R;
      return [s, c.speed, plants];
    });
    return out;
  });
  const stoppedAt = stop.find(([, v]) => v < 0.02)?.[0] ?? 99;
  const settle = stop.at(-1)[2];
  assert(within(stoppedAt, 0.45, 0.85), `stop takes ${f2(stoppedAt)} s (0.5-0.8 s)`);
  assert(within(settle, 1, 3), `stop has settling steps (${settle})`);

  // ---------------------------------------------------------------- foot locking
  console.log('foot locking');
  for (const [name, inp] of [['walk', { y: 0.8 }], ['brisk', { y: 1 }], ['strafe', { x: 1 }], ['back', { y: -1 }]]) {
    const r = await G((inp) => {
      const t = window.__t;
      const p = window.__app.current.player;
      t.tp(8, -14, -Math.PI / 2);
      t.run(1.6, inp);
      const lock = { L: null, R: null };
      let maxSlide = 0;
      let maxPlanner = 0;
      let plants = 0;
      t.run(2.4, inp, () => {
        for (const side of [-1, 1]) {
          const k = side < 0 ? 'L' : 'R';
          const f = p.rig.planner[k];
          const an = t.ankle(side);
          if (f.contact) {
            if (!lock[k]) {
              lock[k] = { x: an.x, z: an.z, px: f.x, pz: f.z };
              plants++;
            }
            maxSlide = Math.max(maxSlide, Math.hypot(an.x - lock[k].x, an.z - lock[k].z));
            maxPlanner = Math.max(maxPlanner, Math.hypot(f.x - lock[k].px, f.z - lock[k].pz));
          } else lock[k] = null;
        }
        return 0;
      });
      return { maxSlide, maxPlanner, plants };
    }, inp);
    assert(r.plants >= 3 && r.maxPlanner < 0.01 && r.maxSlide < 0.01, `${name}: planted feet locked (planner ${(r.maxPlanner * 100).toFixed(2)} cm, ankle ${(r.maxSlide * 100).toFixed(2)} cm, ${r.plants} plants)`);
  }

  // ---------------------------------------------------------------- turning
  console.log('turning');
  const turn = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    t.tp(8, -14, -Math.PI / 2);
    let plants = 0;
    let pl = p.rig.planner.L.contact;
    let pr = p.rig.planner.R.contact;
    // look round 90 degrees quickly; the body follows in steps
    return t.run(1.6, {}, (s) => {
      if (p.cam.yaw < 0) p.cam.yaw = Math.min(0, p.cam.yaw + 6 / 60);
      const L = p.rig.planner.L.contact;
      const R = p.rig.planner.R.contact;
      if (L && !pl) plants++;
      if (R && !pr) plants++;
      pl = L;
      pr = R;
      return [s, p.controller.yaw, plants];
    });
  });
  const turned = turn.find(([, y]) => Math.abs(Math.atan2(Math.sin(y), Math.cos(y))) < (5 * Math.PI) / 180)?.[0] ?? 99;
  assert(within(turned, 0.45, 0.85), `90 deg turn on the spot in ${f2(turned)} s (~0.6 s)`);
  if (process.env.SOFT) console.log('    turn trace', turn.filter((_, i) => i % 8 === 0).map(([s, y]) => `${f2(s)}:${f2(y)}`).join(' '));
  assert(turn.at(-1)[2] >= 2, `turn plants at least two steps (${turn.at(-1)[2]})`);
  const aimTurn = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    t.tp(8, -14, -Math.PI / 2);
    t.run(0.5, { ads: true });
    let prev = p.controller.yaw;
    p.cam.yaw = -Math.PI / 2 + 1.2;
    let maxRate = 0;
    t.run(1.4, { ads: true }, () => {
      const y = p.controller.yaw;
      const d = Math.atan2(Math.sin(y - prev), Math.cos(y - prev));
      prev = y;
      maxRate = Math.max(maxRate, Math.abs(d) * 60);
      return 0;
    });
    return (maxRate * 180) / Math.PI;
  });
  assert(aimTurn <= 110 * 1.03, `aiming body turn capped at 110 deg/s (${aimTurn.toFixed(0)} deg/s)`);

  // ---------------------------------------------------------------- stance
  console.log('stance');
  const stance = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    t.tp(8, -14, -Math.PI / 2);
    const down = t.run(1.0, { taps: { 1: 'crouch' } }, (s) => [s, p.controller.crouchBlend]);
    t.run(1.0, {});
    const up = t.run(1.2, { taps: { 1: 'crouch' } }, (s) => [s, p.controller.crouchBlend]);
    return { down, up };
  });
  const crouchT = stance.down.find(([, v]) => v >= 0.999)?.[0] ?? 99;
  const standT = stance.up.find(([, v]) => v <= 0.001)?.[0] ?? 99;
  assert(within(crouchT, 0.4, 0.5), `crouch takes ${f2(crouchT)} s (0.45 s)`);
  assert(within(standT, 0.55, 0.65), `stand takes ${f2(standT)} s (0.6 s)`);

  // ---------------------------------------------------------------- weapon clips
  console.log('weapon clips');
  const wpn = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    const w = g.weapons;
    t.tp(8, -14, -Math.PI / 2);
    const raise = t.run(0.8, { ads: true }, (s) => [s, p.carry.raise]);
    const lower = t.run(1.0, {}, (s) => [s, p.carry.raise]);
    const dur = (flag, tap, prep) => {
      prep?.();
      let on = -1;
      let off = -1;
      t.run(4.5, { taps: { 1: tap } }, (s) => {
        const v = flag();
        if (v && on < 0) on = s;
        if (!v && on >= 0 && off < 0) off = s;
        return 0;
      });
      return off - on;
    };
    const tactical = dur(() => w.reloading, 'reload', () => (w.current.mag = Math.max(1, w.current.mag - 5)));
    const empty = dur(() => w.reloading, 'reload', () => (w.current.mag = 0));
    const swap = dur(() => w.swapping, 'swapNext');
    t.run(1, {});
    const grenade = dur(() => w.throwing, 'grenade');
    return { raise, lower, tactical, empty, swap, grenade, weapon: w.current.def.id };
  });
  const raiseT = wpn.raise.find(([, v]) => v >= 0.9)?.[0] ?? 99;
  const lowerStart = wpn.lower.findIndex(([, v]) => v < 0.98);
  const lowerT = (wpn.lower.find(([, v]) => v <= 0.1)?.[0] ?? 99) - (wpn.lower[lowerStart]?.[0] ?? 0);
  assert(within(raiseT, 0.22, 0.4), `raise to aim ${f2(raiseT)} s (250-350 ms)`);
  assert(within(lowerT, 0.4, 0.7), `lower back to ready ${f2(lowerT)} s (450-600 ms)`);
  assert(within(wpn.tactical, 2.45, 2.75), `tactical reload ${f2(wpn.tactical)} s (2.6 s)`);
  assert(within(wpn.empty, 2.95, 3.25), `empty reload ${f2(wpn.empty)} s (3.1 s)`);
  assert(within(wpn.swap, 0.8, 1.0), `weapon swap ${f2(wpn.swap)} s (0.8-1.0 s)`);
  assert(within(wpn.grenade, 1.1, 1.3), `grenade throw ${f2(wpn.grenade)} s (1.2 s)`);

  // ---------------------------------------------------------------- transitions and flinch
  console.log('transitions');
  const tr = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    const rig = p.rig;
    t.tp(8, -14, -Math.PI / 2);
    const limited0 = rig.limited;
    let maxStep = 0;
    let prev = null;
    const track = () => {
      const q = rig.graph.pose;
      if (prev)
        for (let i = 0; i < q.length; i++) {
          const d = Math.abs(q[i] - prev[i]);
          if (d > maxStep) {
            maxStep = d;
            window.__worst = `ch ${i} at step ${window.__k ?? 0}`;
          }
        }
      window.__k = (window.__k ?? 0) + 1;
      prev = Float32Array.from(q);
      return 0;
    };
    // walk -> crouch walk -> stop -> stand -> ADS -> strafe -> reload
    t.run(1.2, { y: 0.8 }, track);
    t.run(1.0, { y: 0.8, taps: { 1: 'crouch' } }, track);
    t.run(1.0, {}, track);
    t.run(1.0, { taps: { 1: 'crouch' } }, track);
    t.run(0.8, { ads: true }, track);
    t.run(1.0, { x: 1, ads: true }, track);
    t.run(1.5, { taps: { 1: 'reload' } }, track);
    // hit flinch
    t.run(0.5, {});
    rig.hit(1, 1);
    const hitSpring = rig.graph['hit'];
    let peak = 0;
    let back = -1;
    t.run(1.0, {}, (s) => {
      const v = Math.abs(hitSpring.x);
      peak = Math.max(peak, v);
      if (peak > 0 && v < peak * 0.1 && back < 0 && s > 0.05) back = s;
      return 0;
    });
    return { worst: window.__worst, maxStep, limited: rig.limited - limited0, flinch: back, inertCount: rig.graph.inert.count ?? 0 };
  });
  if (process.env.SOFT) console.log('    worst channel', tr.worst);
  assert(tr.maxStep < 0.08, `pose channels continuous through every transition (max ${tr.maxStep.toFixed(3)} per 60 Hz frame)`);
  assert(tr.limited < 40, `joint-rate safety net rarely needed (${tr.limited} hits)`);
  assert(within(tr.flinch, 0.25, 0.65), `hit flinch recovers in ${f2(tr.flinch)} s (0.3-0.6 s)`);

  // ---------------------------------------------------------------- cover choreography
  console.log('cover');
  const cov = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    t.tp(-3.7, -6, -Math.PI / 2);
    let enterAt = -1;
    let inAt = -1;
    let handAt = -1;
    t.run(1.6, { taps: { 1: 'cover' } }, (s) => {
      const stt = g.cover.state;
      if (stt === 'enter' && enterAt < 0) enterAt = s;
      if (stt === 'in' && inAt < 0) inAt = s;
      if (p.rig.graph.out.offCover > 0.4 && handAt < 0) handAt = s;
      return 0;
    });
    // exit: cover button leaves; measure until the step-back finishes (speed settles)
    let moving = -1;
    let still = -1;
    t.run(1.4, { taps: { 1: 'cover' } }, (s) => {
      const v = p.controller.speed;
      if (v > 0.05 && moving < 0) moving = s;
      if (moving >= 0 && v < 0.02 && still < 0) still = s;
      return 0;
    });
    return { enter: inAt - (enterAt < 0 ? 0 : enterAt) + 1 / 60, handAt, inAt, exit: still, state: g.cover.state };
  });
  assert(within(cov.enter, 0.6, 0.95), `cover entry ${f2(cov.enter)} s (0.7-0.9 s)`);
  assert(cov.handAt >= 0 && cov.handAt < cov.inAt, `support hand reaches the wall first (hand ${f2(cov.handAt)} s, body settled ${f2(cov.inAt)} s)`);
  assert(cov.state === 'none' && within(cov.exit, 0.3, 0.75), `cover exit ${f2(cov.exit)} s (0.4-0.6 s)`);
  const peekAt = (z) =>
    G((z) => {
      const t = window.__t;
      const g = window.__app.current;
      const p = g.player;
      const gr = p.rig.graph;
      t.tp(-8.8, z, -Math.PI / 2);
      t.run(1.4, { taps: { 1: 'cover' } });
      const state = g.cover.state;
      let headAt = -1;
      let wpnAt = -1;
      let swapDone = -1;
      let swapStart = -1;
      let leanHalf = -1;
      t.run(1.6, { ads: true }, (s) => {
        const head = Math.abs(gr['leanHead'].x);
        const body = Math.abs(gr['leanBody'].x);
        if (head > 0.3 && headAt < 0) headAt = s;
        if (p.carry.raise > 0.9 && wpnAt < 0) wpnAt = s;
        if (body > 0.5 && leanHalf < 0) leanHalf = s;
        if (p.rig.handSwap >= 0 && swapStart < 0) swapStart = s;
        if (swapStart >= 0 && p.rig.handSwap < 0 && swapDone < 0) swapDone = s;
        return 0;
      });
      return { state, headAt, wpnAt, leanHalf, swapStart, swapDone, leftHanded: p.rig.leftHanded };
    }, z);
  // high cover x=-10, z 0..4, facing west: z 3.4 peeks round the north (right) edge, z 0.6 the south (left)
  const peek = await peekAt(3.4);
  assert(peek.state === 'in', `took high cover for the peek (${peek.state})`);
  assert(peek.headAt >= 0 && peek.wpnAt - peek.headAt >= 0.15, `peek: head leads (${f2(peek.headAt)} s) before the weapon is out (${f2(peek.wpnAt)} s)`);
  assert(within(peek.wpnAt, 0.33, 0.47), `peek: weapon out by ${f2(peek.wpnAt)} s (350-450 ms)`);
  const left = await peekAt(0.6);
  assert(left.state === 'in' && left.leftHanded, `left edge: weapon changes hands (${left.state}, left-handed ${left.leftHanded})`);
  const swapDur = left.swapDone - left.swapStart;
  assert(left.swapDone >= 0 && left.swapDone <= left.leanHalf && within(swapDur, 0.28, 0.42), `edge prep: hands swap over ${f2(swapDur)} s (300-400 ms) before the lean (half out at ${f2(left.leanHalf)} s)`);

  // ---------------------------------------------------------------- camera
  console.log('camera');
  const cam = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    const cm = p.cam;
    const C = cm.camera;
    t.tp(8, -14, -Math.PI / 2);
    // drift while idle: rendered view vs the aim (deg)
    let drift = 0;
    t.run(3, {}, () => {
      const dy = C.rotation.y - cm.viewYaw;
      const dp = -C.rotation.x - cm.viewPitch;
      drift = Math.max(drift, (Math.hypot(Math.atan2(Math.sin(dy), Math.cos(dy)), dp) * 180) / Math.PI);
      return 0;
    });
    // steady walk: follow lag and footstep bob
    t.run(2.0, { y: 0.8 });
    let lagSum = 0;
    let lagN = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    t.run(2.0, { y: 0.8 }, () => {
      const f = p.controller.renderPos;
      const sx = cm['sFx'].x;
      const sz = cm['sFz'].x;
      const v = p.controller.speed;
      if (v > 0.5) {
        lagSum += Math.hypot(f.x - sx, f.z - sz) / v;
        lagN++;
      }
      yMin = Math.min(yMin, C.position.y);
      yMax = Math.max(yMax, C.position.y);
      return 0;
    });
    t.run(1.0, {});
    // shoulder swap and ADS framing step responses
    const side0 = cm['sSide'].x;
    cm.swapShoulder();
    let swap90 = -1;
    let arcMax = 0;
    const b0 = cm.boomActual;
    t.run(1.0, {}, (s) => {
      const x = cm['sSide'].x;
      arcMax = Math.max(arcMax, cm.boomActual - b0);
      if (swap90 < 0 && Math.abs(x - -side0) < 0.2) swap90 = s;
      return 0;
    });
    cm.swapShoulder();
    t.run(0.8, {});
    let ads90 = -1;
    t.run(1.0, { ads: true }, (s) => {
      if (ads90 < 0 && cm.ads >= 0.9) ads90 = s;
      return 0;
    });
    t.run(1.0, {});
    // dash FOV
    const hfov = (v) => (2 * Math.atan(Math.tan(v / 2) * (16 / 9)) * 180) / Math.PI;
    const base = hfov(C.fov);
    let dashMax = base;
    t.run(1.6, { y: 1, taps: { 2: 'dash' } }, () => {
      dashMax = Math.max(dashMax, hfov(C.fov));
      return 0;
    });
    t.run(2.0, {});
    // angular velocity / acceleration under a scripted look (constant 2 rad/s, then stop) at 120 Hz
    let prevF = null;
    let prevW = null;
    let maxW = 0;
    let maxA = 0;
    const look = (s) => {
      const f = cm.forward;
      if (prevF) {
        const d = Math.acos(Math.min(1, prevF.x * f.x + prevF.y * f.y + prevF.z * f.z)) * 60;
        if (prevW !== null) maxA = Math.max(maxA, Math.abs(d - prevW) * 60);
        prevW = d;
        maxW = Math.max(maxW, d);
      }
      prevF = { x: f.x, y: f.y, z: f.z };
      return s;
    };
    for (let k = 0; k < 60; k++) {
      cm.yaw += 2 / 60;
      t.run(1 / 60, {}, look, 120);
    }
    t.run(0.6, {}, look, 120);
    return { drift, lag: lagSum / Math.max(1, lagN), bob: yMax - yMin, swap90, arcMax, ads90, dashFov: dashMax - base, maxW, maxA };
  });
  assert(cam.drift <= 0.15, `handheld drift <= 0.15 deg (${cam.drift.toFixed(3)} deg)`);
  assert(within(cam.lag, 0.15, 0.25), `camera follow lag ${f2(cam.lag)} s (150-250 ms)`);
  assert(cam.bob <= 0.02, `footstep bob <= 1 cm amplitude (${(cam.bob * 50).toFixed(2)} cm)`);
  assert(within(cam.swap90, 0.3, 0.5) && cam.arcMax > 0.05, `shoulder swap ${f2(cam.swap90)} s (~400 ms) on an arc (+${f2(cam.arcMax)} m boom)`);
  assert(within(cam.ads90, 0.3, 0.6), `ADS framing blend ${f2(cam.ads90)} s (350-600 ms)`);
  assert(within(cam.dashFov, 2.5, 4.5), `dash widens the FOV by ${f2(cam.dashFov)} deg (+4)`);
  assert(cam.maxW < 2.3 && cam.maxA < 40, `camera angular velocity / acceleration bounded (${f2(cam.maxW)} rad/s, ${f2(cam.maxA)} rad/s^2)`);

  // ---------------------------------------------------------------- 60 vs 120 Hz parity
  console.log('60 vs 120 Hz parity');
  const parity = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    const go = (hz) => {
      t.tp(8, -14, -Math.PI / 2);
      t.run(1.0, { y: 0.8 }, null, hz);
      p.cam.yaw = -Math.PI / 2 + 0.6;
      t.run(1.0, { y: 0.8 }, null, hz);
      t.run(1.0, { x: 1 }, null, hz);
      t.run(1.2, {}, null, hz);
      const c = p.controller;
      const L = p.rig.planner.L;
      const R = p.rig.planner.R;
      const cp = p.cam.camera.position;
      return { x: c.pos.x, z: c.pos.z, yaw: c.yaw, lx: L.x, lz: L.z, rx: R.x, rz: R.z, cx: cp.x, cy: cp.y, cz: cp.z };
    };
    return { a: go(60), b: go(120) };
  });
  const d = (k1, k2) => Math.hypot(parity.a[k1] - parity.b[k1], parity.a[k2] - parity.b[k2]);
  assert(d('x', 'z') < 0.02 && Math.abs(parity.a.yaw - parity.b.yaw) < 0.02, `root motion matches at 60 and 120 Hz (${(d('x', 'z') * 100).toFixed(2)} cm, ${(Math.abs(parity.a.yaw - parity.b.yaw) * 57.3).toFixed(2)} deg)`);
  assert(d('lx', 'lz') < 0.04 && d('rx', 'rz') < 0.04, `feet land in the same places (${(d('lx', 'lz') * 100).toFixed(1)} / ${(d('rx', 'rz') * 100).toFixed(1)} cm)`);
  assert(d('cx', 'cz') < 0.03 && Math.abs(parity.a.cy - parity.b.cy) < 0.02, `camera matches (${(d('cx', 'cz') * 100).toFixed(1)} cm)`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-anim-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
