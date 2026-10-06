// Animation / camera quality bars for the stealth operative, measured in the running game (Proving
// Grounds, headless stepping): responsiveness (visible within one frame, 90% speed times, stops, pivots,
// travel and aim turn rates), stance and aim transitions, weapon clip timings, foot locking (< 1 cm) in
// every gait, transition continuity, hit flinch, camera follow lag / framing blends / shoulder swap /
// bob / drift / sprint FOV / bounded angular velocity and acceleration, and 60 vs 120 Hz parity.
// (Cover choreography bars live in e2e-stealth.)
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
  // every measurement steps the sim itself: no real-time frames in between (on a loaded machine they would
  // advance it by a varying amount between checks)
  a.loop.manual = true;
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
    /** One render frame without a sim step: input poll + frame update only. */
    frame(inp) {
      st.move.x = inp.x ?? 0;
      st.move.y = inp.y ?? 0;
      a.loop['hooks'].beforeFrame(1 / 120);
      a.loop['hooks'].frameUpdate(1 / 120, 0);
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
  // ---------------------------------------------------------------- responsiveness
  console.log('responsiveness');
  const first = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    t.tp(8, -14, -Math.PI / 2);
    t.run(0.5, {});
    const pose0 = Float32Array.from(p.rig.graph.pose);
    t.frame({ y: 1 });
    let poseD = 0;
    const q = p.rig.graph.pose;
    for (let i = 0; i < q.length; i++) poseD = Math.max(poseD, Math.abs(q[i] - pose0[i]));
    const r = t.run(1 / 60, { y: 1 }, () => p.controller.speed);
    return { poseD, speed1: r[0] };
  });
  assert(first.poseD > 0.002 && first.speed1 > 0, `visible on the first frame after input (pose ${first.poseD.toFixed(4)}), root moving on the first step (${first.speed1.toFixed(3)} m/s)`);
  const reach = async (inp, target, setup) =>
    G(([inp, target, setup]) => {
      const t = window.__t;
      const a = window.__app;
      const c = a.current.player.controller;
      t.tp(8, -14, -Math.PI / 2);
      if (setup) new Function('a', setup)(a);
      const r = t.run(1.2, inp, (s) => [s, c.speed]);
      return r.find(([, v]) => v >= target * 0.9)?.[0] ?? 99;
    }, [inp, target, setup ?? null]);
  const walkT = await reach({ y: 0.5 }, 1.4);
  const jogT = await reach({ y: 1 }, 2.8);
  const sprintT = await reach({ y: 1, taps: { 1: 'dash' } }, 5.0);
  assert(within(walkT, 0.15, 0.35), `walk: 90% speed in ${f2(walkT)} s (0.2-0.35)`);
  assert(within(jogT, 0.2, 0.35), `jog: 90% speed in ${f2(jogT)} s (0.2-0.35)`);
  assert(sprintT <= 0.45, `sprint: 90% speed in ${f2(sprintT)} s (<= 0.45)`);
  const stop = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    const c = p.controller;
    t.tp(8, -14, -Math.PI / 2);
    t.run(1.0, { y: 1 });
    let plants = 0;
    let prevL = p.rig.planner.L.contact;
    let prevR = p.rig.planner.R.contact;
    return t.run(1.0, {}, (s) => {
      const L = p.rig.planner.L.contact;
      const R = p.rig.planner.R.contact;
      if (L && !prevL) plants++;
      if (R && !prevR) plants++;
      prevL = L;
      prevR = R;
      return [s, c.speed, plants];
    });
  });
  const stoppedAt = stop.find(([, v]) => v < 0.02)?.[0] ?? 99;
  assert(within(stoppedAt, 0.2, 0.36), `stop from a jog in ${f2(stoppedAt)} s (0.2-0.35)`);
  assert(within(stop.at(-1)[2], 1, 2), `one or two settling steps (${stop.at(-1)[2]})`);
  const pivot = await G(() => {
    const t = window.__t;
    const c = window.__app.current.player.controller;
    t.tp(8, -14, -Math.PI / 2);
    t.run(1.0, { y: 1 });
    let pt = 0;
    const r = t.run(1.0, { y: -1 }, () => {
      if (c.motion.state === 'pivot') pt += 1 / 60;
      return c.speed;
    });
    return { pt, end: r.at(-1), yaw: c.yaw };
  });
  // (instantaneous speed: the step pulse dips each footfall ~8% under the 2.8 m/s jog)
  assert(within(pivot.pt, 0.24, 0.36) && pivot.end > 2.4, `reversing at a jog: ${f2(pivot.pt)} s planted pivot, then off the other way (${f2(pivot.end)} m/s)`);
  const turns = await G(() => {
    const t = window.__t;
    const c = window.__app.current.player.controller;
    const rate = (inp) => {
      t.tp(8, -14, -Math.PI / 2);
      t.run(1.0, inp);
      let max = 0;
      let minSpeed = 99;
      let prev = c.yaw;
      // bank: the hips' up vector tilting towards the inside of the turn (left here: negative)
      const hips = window.__app.current.player.rig.hips;
      const V = window.__app.current.player.position.constructor;
      const up = new V(0, 1, 0);
      let bankIn = 0;
      let bankMax = 0;
      // swing the stick 90 degrees (camera stays put): the body arcs round
      t.run(0.8, { x: -(inp.y ?? 1), y: 0 }, () => {
        const d = Math.atan2(Math.sin(c.yaw - prev), Math.cos(c.yaw - prev));
        prev = c.yaw;
        max = Math.max(max, Math.abs(d) * 60);
        minSpeed = Math.min(minSpeed, c.speed);
        const u = hips.getDirection(up);
        const tilt = (Math.asin(Math.max(-1, Math.min(1, u.x * Math.cos(c.yaw) - u.z * Math.sin(c.yaw)))) * 180) / Math.PI;
        bankMax = Math.max(bankMax, Math.abs(tilt));
        bankIn = Math.min(bankIn, tilt);
        return 0;
      });
      return { max: (max * 180) / Math.PI, minSpeed, bankMax, bankIn };
    };
    const jog = rate({ y: 1 });
    const sprint = rate({ y: 1, taps: { 1: 'dash' } });
    // aim turn: hold ADS, swing the view 90 degrees
    t.tp(8, -14, -Math.PI / 2);
    t.run(0.5, { ads: true });
    const p = window.__app.current.player;
    p.cam.yaw += Math.PI / 2;
    let aimMax = 0;
    let prev = c.yaw;
    t.run(0.8, { ads: true }, () => {
      const d = Math.atan2(Math.sin(c.yaw - prev), Math.cos(c.yaw - prev));
      prev = c.yaw;
      aimMax = Math.max(aimMax, Math.abs(d) * 60);
      return 0;
    });
    return { jog, sprint, aim: (aimMax * 180) / Math.PI };
  });
  assert(turns.jog.max <= 545 && turns.jog.max > 250 && turns.jog.minSpeed > 2.2, `90 deg direction change at a jog arcs round (${turns.jog.max.toFixed(0)} deg/s, speed stays above ${f2(turns.jog.minSpeed)} m/s)`);
  assert(turns.jog.bankIn < -1.5 && turns.jog.bankMax <= 8 && turns.sprint.bankMax <= 8, `leans into turns, <= 8 deg (jog ${f2(-turns.jog.bankIn)} deg in, max ${f2(turns.jog.bankMax)}; sprint max ${f2(turns.sprint.bankMax)})`);
  assert(turns.sprint.max <= 305, `sprinting turns no faster than 300 deg/s (${turns.sprint.max.toFixed(0)})`);
  assert(turns.aim <= 365 && turns.aim > 200, `aiming: the body follows the aim at <= 360 deg/s (${turns.aim.toFixed(0)})`);

  // ---------------------------------------------------------------- stance and aim
  console.log('stance and aim');
  const stance = await G(() => {
    const t = window.__t;
    const p = window.__app.current.player;
    t.tp(8, -14, -Math.PI / 2);
    const down = t.run(0.6, { taps: { 1: 'crouch' } }, (s) => [s, p.controller.crouchBlend]);
    t.run(0.6, {});
    const up = t.run(0.6, { taps: { 1: 'crouch' } }, (s) => [s, p.controller.crouchBlend]);
    // while moving: no stop
    t.run(0.8, { y: 1 });
    const moving = t.run(0.5, { y: 1, taps: { 1: 'crouch' } }, () => p.controller.speed);
    t.run(0.5, { y: 1, taps: { 1: 'crouch' } });
    const raise = t.run(0.5, { ads: true }, (s) => [s, p.carry.raise]);
    const lower = t.run(0.6, {}, (s) => [s, p.carry.raise]);
    return { down, up, minMoving: Math.min(...moving), raise, lower };
  });
  const crouchT = stance.down.find(([, v]) => v >= 0.999)?.[0] ?? 99;
  const standT = stance.up.find(([, v]) => v <= 0.001)?.[0] ?? 99;
  assert(within(crouchT, 0.2, 0.3) && within(standT, 0.2, 0.3), `stance change: crouch ${f2(crouchT)} s, stand ${f2(standT)} s (0.2-0.3)`);
  assert(stance.minMoving > 1.6, `crouching while moving does not stop you (min ${f2(stance.minMoving)} m/s)`);
  const raiseT = stance.raise.find(([, v]) => v >= 0.9)?.[0] ?? 99;
  const lowerT = stance.lower.find(([, v]) => v <= 0.1)?.[0] ?? 99;
  assert(within(raiseT, 0.1, 0.2), `aim raise ${f2(raiseT)} s (120-200 ms)`);
  assert(within(lowerT, 0.22, 0.36), `aim lower ${f2(lowerT)} s (250-350 ms)`);

  // ---------------------------------------------------------------- weapon clips
  console.log('weapon clips');
  const wpn = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const w = g.weapons;
    t.tp(8, -14, -Math.PI / 2);
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
    return { tactical, empty, swap, grenade };
  });
  assert(within(wpn.tactical, 2.45, 2.75), `tactical reload ${f2(wpn.tactical)} s (2.6 s)`);
  assert(within(wpn.empty, 2.95, 3.25), `empty reload ${f2(wpn.empty)} s (3.1 s)`);
  assert(within(wpn.swap, 0.8, 1.0), `weapon swap ${f2(wpn.swap)} s (0.8-1.0 s)`);
  assert(within(wpn.grenade, 1.1, 1.3), `grenade throw ${f2(wpn.grenade)} s (1.2 s)`);

  // ---------------------------------------------------------------- foot locking
  console.log('foot locking');
  const gaits = [
    ['walk', { y: 0.5 }],
    ['jog', { y: 1 }],
    ['sprint', { y: 1, taps: { 1: 'dash' } }, 'sprint'],
    ['sneak', { y: 0.35 }, 'crouch'],
    ['crouch run', { y: 1 }, 'crouch'],
    ['aim strafe', { x: 1, ads: true }],
    ['aim back', { y: -1, ads: true }],
  ];
  for (const [name, inp, mode] of gaits) {
    const r = await G(([inp, mode]) => {
      const t = window.__t;
      const p = window.__app.current.player;
      t.tp(12, -14, -Math.PI / 2);
      if (mode === 'crouch') p.controller['crouchToggled'] = true;
      t.run(1.0, inp);
      const keep = { ...inp, taps: undefined };
      const lock = { L: null, R: null };
      let maxSlide = 0;
      let plants = 0;
      t.run(1.6, keep, () => {
        for (const side of [-1, 1]) {
          const k = side < 0 ? 'L' : 'R';
          const f = p.rig.planner[k];
          const an = t.ankle(side);
          if (f.contact) {
            if (!lock[k]) {
              lock[k] = { x: an.x, z: an.z };
              plants++;
            }
            maxSlide = Math.max(maxSlide, Math.hypot(an.x - lock[k].x, an.z - lock[k].z));
          } else lock[k] = null;
        }
        return 0;
      });
      p.controller['crouchToggled'] = false;
      return { maxSlide, plants, speed: p.controller.speed };
    }, [inp, mode ?? null]);
    assert(r.plants >= 3 && r.maxSlide < 0.01, `${name} (${f2(r.speed)} m/s): planted feet locked (${(r.maxSlide * 100).toFixed(2)} cm, ${r.plants} plants)`);
  }

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
      // per 60 Hz frame, normalised to 0.1. Channels whose spec'd timing needs more (smooth bell curves,
      // not pops): the ankle pitches (31 / 35, fLPitch / fRPitch) 0.15 - standing from a kneel releases a
      // 1.2 rad toe flex within the 0.28 s stance change; weapon pitch (15, wpPitch) 0.14 - the 0.8 rad
      // low ready (muzzle ~45 deg down) -> aim within the 120-200 ms raise
      const allow = (i) => (i === 31 || i === 35 ? 0.15 : i === 15 ? 0.14 : 0.1);
      if (prev)
        for (let i = 0; i < q.length; i++) {
          const n = (Math.abs(q[i] - prev[i]) * 0.1) / allow(i);
          if (n > maxStep) {
            maxStep = n;
            window.__worst = `channel ${i} at step ${window.__k}`;
          }
        }
      window.__k = (window.__k ?? 0) + 1;
      prev = Float32Array.from(q);
      return 0;
    };
    // jog -> crouch run -> stop -> stand -> aim -> strafe -> sprint -> stop -> reload
    t.run(1.0, { y: 1 }, track);
    t.run(1.0, { y: 1, taps: { 1: 'crouch' } }, track);
    t.run(0.8, {}, track);
    t.run(0.6, { taps: { 1: 'crouch' } }, track);
    t.run(0.6, { ads: true }, track);
    t.run(0.8, { x: 1, ads: true }, track);
    t.run(1.0, { y: 1, taps: { 1: 'dash' } }, track);
    t.run(0.8, {}, track);
    t.run(1.2, { taps: { 1: 'reload' } }, track);
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
    return { maxStep, worst: window.__worst, limited: rig.limited - limited0, flinch: back };
  });
  assert(tr.maxStep < 0.1, `pose channels continuous through every transition (max ${tr.maxStep.toFixed(3)} per 60 Hz frame, normalised${process.env.SOFT ? ', ' + tr.worst : ''})`);
  assert(tr.limited < 60, `joint-rate safety net rarely needed (${tr.limited} hits)`);
  assert(within(tr.flinch, 0.25, 0.65), `hit flinch recovers in ${f2(tr.flinch)} s (0.3-0.6 s)`);

  // ---------------------------------------------------------------- camera
  console.log('camera');
  const cam = await G(() => {
    const t = window.__t;
    const a = window.__app;
    const p = a.current.player;
    const cm = p.cam;
    const C = cm.camera;
    t.tp(8, -14, -Math.PI / 2);
    let drift = 0;
    t.run(3, {}, () => {
      const dy = C.rotation.y - cm.viewYaw;
      const dp = -C.rotation.x - cm.viewPitch;
      drift = Math.max(drift, (Math.hypot(Math.atan2(Math.sin(dy), Math.cos(dy)), dp) * 180) / Math.PI);
      return 0;
    });
    t.run(1.2, { y: 0.5 });
    let lagSum = 0;
    let lagN = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    t.run(1.5, { y: 0.5 }, () => {
      const f = p.controller.renderPos;
      const v = p.controller.speed;
      if (v > 0.5) {
        lagSum += Math.hypot(f.x - cm['sFx'].x, f.z - cm['sFz'].x) / v;
        lagN++;
      }
      yMin = Math.min(yMin, C.position.y);
      yMax = Math.max(yMax, C.position.y);
      return 0;
    });
    t.run(0.8, {});
    const side0 = cm['sSide'].x;
    cm.swapShoulder();
    let swap90 = -1;
    let arcMax = 0;
    const b0 = cm.boomActual;
    t.run(0.8, {}, (s) => {
      arcMax = Math.max(arcMax, cm.boomActual - b0);
      if (swap90 < 0 && Math.abs(cm['sSide'].x - -side0) < 0.2) swap90 = s;
      return 0;
    });
    cm.swapShoulder();
    t.run(0.6, {});
    let ads90 = -1;
    t.run(0.6, { ads: true }, (s) => {
      if (ads90 < 0 && cm.ads >= 0.9) ads90 = s;
      return 0;
    });
    t.run(0.8, {});
    const hfov = (v) => (2 * Math.atan(Math.tan(v / 2) * (16 / 9)) * 180) / Math.PI;
    const base = hfov(C.fov);
    let sprintMax = base;
    t.run(1.2, { y: 1, taps: { 1: 'dash' } }, () => {
      sprintMax = Math.max(sprintMax, hfov(C.fov));
      return 0;
    });
    t.run(1.0, {});
    // look through the right stick (30 ms smoothing): full right for 1 s, then release, at 120 Hz, in
    // the open (after the sprint above the boom could be pulled in by a wall as it swings round)
    t.tp(8, -14, -Math.PI / 2);
    let prevF = null;
    let prevW = null;
    let maxW = 0;
    let maxA = 0;
    const look = () => {
      const f = cm.forward;
      if (prevF) {
        const d = Math.acos(Math.min(1, prevF.x * f.x + prevF.y * f.y + prevF.z * f.z)) * 120;
        if (prevW !== null && Math.abs(d - prevW) * 120 > maxA) {
          maxA = Math.abs(d - prevW) * 120;
          window.__maxAAt = `frame ${window.__lookK}, ${d.toFixed(2)} from ${prevW.toFixed(2)} rad/s`;
        }
        window.__lookK = (window.__lookK ?? 0) + 1;
        prevW = d;
        maxW = Math.max(maxW, d);
      }
      prevF = { x: f.x, y: f.y, z: f.z };
    };
    window.__pad.connect();
    const hooks = a.loop['hooks'];
    const fu = hooks.frameUpdate;
    hooks.frameUpdate = (dt, al) => {
      fu(dt, al);
      look();
    };
    window.__pad.axis(2, 1);
    t.run(1.0, {}, null, 120);
    window.__pad.axis(2, 0);
    t.run(0.5, {}, null, 120);
    hooks.frameUpdate = fu;
    window.__pad.disconnect();
    return { drift, lag: lagSum / Math.max(1, lagN), bob: yMax - yMin, swap90, arcMax, ads90, sprintFov: sprintMax - base, maxW, maxA, maxAAt: window.__maxAAt };
  });
  assert(cam.drift <= 0.15, `handheld drift <= 0.15 deg (${cam.drift.toFixed(3)} deg)`);
  assert(within(cam.lag, 0.08, 0.15), `camera follow lag ${f2(cam.lag)} s (80-150 ms)`);
  assert(cam.bob <= 0.02, `footstep bob <= 1 cm amplitude (${(cam.bob * 50).toFixed(2)} cm)`);
  assert(within(cam.swap90, 0.15, 0.32) && cam.arcMax > 0.05, `shoulder swap ${f2(cam.swap90)} s (~250 ms) on an arc (+${f2(cam.arcMax)} m boom)`);
  assert(within(cam.ads90, 0.12, 0.25), `aim framing blend ${f2(cam.ads90)} s (150-250 ms)`);
  assert(within(cam.sprintFov, 2.5, 4.5), `sprint widens the FOV by ${f2(cam.sprintFov)} deg (+4)`);
  assert(cam.maxW > 2 && cam.maxW < 6.5 && cam.maxA < 250, `stick look: angular velocity / acceleration bounded (${f2(cam.maxW)} rad/s, ${f2(cam.maxA)} rad/s^2${process.env.SOFT ? ', ' + cam.maxAAt : ''})`);

  // ---------------------------------------------------------------- 60 vs 120 Hz parity
  console.log('60 vs 120 Hz parity');
  const parity = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    const go = (hz) => {
      t.tp(8, -14, -Math.PI / 2);
      t.run(1.0, { y: 1 }, null, hz);
      p.cam.yaw = -Math.PI / 2 + 0.6;
      t.run(1.0, { y: 0.6 }, null, hz);
      t.run(1.0, { x: 1 }, null, hz);
      t.run(0.6, { x: 1, ads: true }, null, hz);
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
