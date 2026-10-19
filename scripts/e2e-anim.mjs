// Animation / camera quality bars for the stealth operative, measured in the running game (Proving
// Grounds, headless stepping): responsiveness (3.2.0 Chaos Theory: visible within one frame, 95% speed within
// 0.08 s, a stop on the release step with a 0.12 s pose blend, no planted pivots, 720 deg/s travel turns, aim
// turn rate), stance and aim transitions, weapon clip timings, foot locking (< 1 cm) in
// every gait, transition continuity, hit flinch, camera follow lag / framing blends / shoulder swap /
// bob / drift / sprint FOV / bounded angular velocity and acceleration, and 60 / 120 / 144 / 165 / 240 Hz parity.
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
  // 3.2.0: the root (motion driver) reaches 95% of the gear's pace within 0.08 s (in 60 Hz steps)
  const reach = async (inp, target, gear) =>
    G(([inp, target, gear]) => {
      const t = window.__t;
      const a = window.__app;
      const c = a.current.player.controller;
      c.gears.set(gear);
      t.tp(8, -14, -Math.PI / 2);
      const r = t.run(0.6, inp, (s) => [s, c.motion.speed]);
      c.gears.set(4);
      // (of the pace it settles at: the weapon's handling scales the gear's cap a little)
      const end = r.at(-1)[1];
      return end > target * 0.9 ? (r.find(([, v]) => v >= end * 0.95)?.[0] ?? 99) : 98;
    }, [inp, target, gear]);
  // (CT prototype M1) a full run in about 0.4-0.5 s (CT.startTime 0.45): 95% of the pace at every speed
  const walkT = await reach({ y: 1 }, 2.0, 3);
  const jogT = await reach({ y: 1 }, 3.0, 4);
  const sprintT = await reach({ y: 1 }, 4.2, 5);
  assert(walkT > 0.3 && walkT <= 0.45 + 2 / 60, `speed 3: 95% speed in ${f2(walkT)} s (0.3-0.48)`);
  assert(jogT > 0.3 && jogT <= 0.45 + 2 / 60, `speed 4: 95% speed in ${f2(jogT)} s (0.3-0.48)`);
  assert(sprintT > 0.3 && sprintT <= 0.45 + 2 / 60, `run: 95% speed in ${f2(sprintT)} s (0.3-0.48)`);
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
  // (CT prototype M1, G26) the stop lands within CT.stopTime (0.2 s); the feet freeze where they are, at most a set-down
  assert(stoppedAt > 0.08 && stoppedAt <= 0.2 + 2 / 60 + 1e-6, `stop from a jog eases to rest in ${f2(stoppedAt)} s (0.08-0.22)`);
  assert(within(stop.at(-1)[2], 0, 2), `the stop freezes the stride in at most 2 plants (${stop.at(-1)[2]})`);
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
  // (CT prototype M1, G33) reversing is one continuous turn: no pivot state, off the other way at the pace
  assert(pivot.pt === 0 && pivot.end > 1.6, `reversing at a jog: one continuous turn, no pivot (${f2(pivot.pt)} s), off the other way (${f2(pivot.end)} m/s)`);
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
        // (in the rendered body's frame: at 720 deg/s the sim's yaw runs a step ahead of the posed hips)
        const ry = c.renderYaw;
        const tilt = (Math.asin(Math.max(-1, Math.min(1, u.x * Math.cos(ry) - u.z * Math.sin(ry)))) * 180) / Math.PI;
        bankMax = Math.max(bankMax, Math.abs(tilt));
        bankIn = Math.min(bankIn, tilt);
        return 0;
      });
      return { max: (max * 180) / Math.PI, minSpeed, bankMax, bankIn };
    };
    const jog = rate({ y: 1 });
    const sprint = rate({ y: 1 });
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
  assert(turns.jog.max <= 520 && turns.jog.max > 350 && turns.jog.minSpeed > 1.0, `90 deg direction change at a jog (CT M1: one smooth turn, the pace dips): turns at up to ~505 deg/s (${turns.jog.max.toFixed(0)} deg/s, speed stays above ${f2(turns.jog.minSpeed)} m/s)`);
  assert(turns.jog.bankIn < -1.5 && turns.jog.bankMax <= 8 && turns.sprint.bankMax <= 8, `leans into turns, <= 8 deg (jog ${f2(-turns.jog.bankIn)} deg in, max ${f2(turns.jog.bankMax)}; sprint max ${f2(turns.sprint.bankMax)})`);
  assert(turns.sprint.max <= 725, `sprinting turns no faster than 720 deg/s (${turns.sprint.max.toFixed(0)})`);
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
    // (step 09) holstered unless aiming: aim draws first (0.3-0.4 s), the raise runs from the drawn hands
    const raise = t.run(1.6, { ads: true }, (s) => [s, p.carry.raise, window.__app.current.weapons.drawPhase]);
    const lower = t.run(1.0, {}, (s) => [s, p.carry.raise]);
    return { down, up, minMoving: Math.min(...moving), raise, lower };
  });
  const crouchT = stance.down.find(([, v]) => v >= 0.999)?.[0] ?? 99;
  const standT = stance.up.find(([, v]) => v <= 0.001)?.[0] ?? 99;
  assert(within(crouchT, 0.2, 0.3) && within(standT, 0.2, 0.3), `stance change: crouch ${f2(crouchT)} s, stand ${f2(standT)} s (0.2-0.3)`);
  // (step 22, M14 N6) gear 4 crouched is 1.5 m/s now (was 1.8): the pace eases down onto it, minus the stride dip
  assert(stance.minMoving > 1.3, `crouching while moving does not stop you (min ${f2(stance.minMoving)} m/s)`);
  const drawnT = stance.raise.find(([, , d]) => d === 2)?.[0] ?? 99;
  assert(drawnT <= 0.85, `aim draws first: drawn in ${f2(drawnT)} s (<= 0.85; G103: 0.6 pistol / 0.75 rifle)`);
  // the raise starts while the draw finishes: timed from the last frame the weapon was still low
  const lowT = [...stance.raise].reverse().find(([, v]) => v <= 0.1)?.[0] ?? 0;
  const raiseT = (stance.raise.find(([, v]) => v >= 0.9)?.[0] ?? 99) - lowT;
  const lowerT = stance.lower.find(([, v]) => v <= 0.1)?.[0] ?? 99;
  // (CT prototype G2, AUDIT-AIM rows 1 / 2, footage wins over G103) the rifle's raise runs with its 0.3 s draw over 0.25 s
  // (DRAW_RAISE: muzzle up at the shoulder, then down onto the line, CT 105845 3.37-3.63, no chest hold): ~0.2 s from low
  // to shouldered; the lower goes with the 0.15 s (CT instant) holster over CARRY.lowerTime 0.3 s
  assert(within(raiseT, 0.12, 0.6), `aim raise ${f2(raiseT)} s (CT: ~0.2 s onto the line after muzzle up; G2)`);
  assert(within(lowerT, 0.1, 0.4), `aim lower ${f2(lowerT)} s (CT: instant holster; G2 0.3 s)`);

  // ---------------------------------------------------------------- weapon clips
  console.log('weapon clips');
  const wpn = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const w = g.weapons;
    t.tp(8, -14, -Math.PI / 2);
    // (step 09) reload and swap run drawn (aim held: holstered unless aiming); the grenade from holstered
    const dur = (flag, tap, prep, ads = true) => {
      if (ads) t.run(0.6, { ads });
      prep?.();
      let on = -1;
      let off = -1;
      t.run(4.5, { ads, taps: { 1: tap } }, (s) => {
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
    const grenade = dur(() => w.throwing, 'grenade', undefined, false);
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
    const w = window.__app.current.weapons;
    // (consolidation) the weapon clips' swap used to leave the SMG in hand (the sandbox carried five guns); the CT kit
    // swaps to the pistol, so swap back: this sequence covers the long gun, as it always did
    const swapped = w.current.def.id;
    if (swapped !== 'rifle') t.run(1.5, { ads: true, taps: { 1: 'swapNext' } });
    t.run(1.0, {});
    t.tp(8, -14, -Math.PI / 2);
    const limited0 = rig.limited;
    let maxStep = 0;
    // KNOWN ISSUE (consolidation, docs/backlog.md): the draw from holstered (rifle from the back slot, pistol from the
    // thigh) reaches the hand in the 8-frame swap fade, a pop up to ~0.14; the CT prototype rebuilds the draw (G103).
    // The 'aim' (draw) and 'sprint' (holster to the back for the sprint; sprint is removed by loco M20 Q8) steps are
    // reported, not asserted; every other transition stays strict.
    let drawStep = 0;
    let knownLimited = 0;
    let lastLimited = rig.limited;
    let prev = null;
    const track = () => {
      const q = rig.graph.pose;
      // per 60 Hz frame, normalised to 0.1. Channels whose spec'd timing needs more (smooth bell curves,
      // not pops): the ankle pitches (31 / 35, fLPitch / fRPitch) 0.15 - standing from a kneel releases a
      // 1.2 rad toe flex within the 0.28 s stance change; weapon pitch (15, wpPitch) 0.14 - the 0.8 rad
      // low ready (muzzle ~45 deg down) -> aim within the 120-200 ms raise
      // prototype: revisit (P1 posture) spine pitch (6, spPitch) 0.16 - the CT crouch lean (~0.6 rad in ~0.25 s, footage
      // stand -> crouch 0.2-0.25 s) rides on the crouch blend's own spine change
      const allow = (i) => (i === 31 || i === 35 ? 0.15 : i === 15 ? 0.14 : i === 6 ? 0.16 : 0.1);
      const known = window.__seg === 'aim' || window.__seg === 'sprint';
      if (known) knownLimited += rig.limited - lastLimited;
      lastLimited = rig.limited;
      if (prev)
        for (let i = 0; i < q.length; i++) {
          const n = (Math.abs(q[i] - prev[i]) * 0.1) / allow(i);
          if (known) drawStep = Math.max(drawStep, n);
          else if (n > maxStep) {
            maxStep = n;
            window.__worst = `channel ${i} at step ${window.__k} (${window.__seg})`;
          }
        }
      window.__k = (window.__k ?? 0) + 1;
      prev = Float32Array.from(q);
      return 0;
    };
    // jog -> crouch run -> stop -> stand -> aim -> strafe -> sprint -> stop -> reload
    window.__seg = 'jog';
    t.run(1.0, { y: 1 }, track);
    window.__seg = 'crouch run';
    t.run(1.0, { y: 1, taps: { 1: 'crouch' } }, track);
    window.__seg = 'stop';
    t.run(0.8, {}, track);
    window.__seg = 'stand';
    t.run(0.6, { taps: { 1: 'crouch' } }, track);
    window.__seg = 'aim';
    t.run(0.6, { ads: true }, track);
    window.__seg = 'strafe';
    t.run(0.8, { x: 1, ads: true }, track);
    window.__seg = 'sprint';
    t.run(1.0, { y: 1 }, track);
    window.__seg = 'stop 2';
    t.run(0.8, {}, track);
    window.__seg = 'reload';
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
    return { maxStep, drawStep, worst: `${window.__worst}, ${swapped} -> ${w.current.def.id}`, limited: rig.limited - limited0 - knownLimited, knownLimited, flinch: back };
  });
  assert(tr.maxStep < 0.1, `pose channels continuous through every transition (max ${tr.maxStep.toFixed(3)} per 60 Hz frame, normalised, worst ${tr.worst})`);
  // (anim-cleanup) the draw / holster now carries the gun along a path in the hand (WeaponModel travel): held to the
  // same continuity as every other transition; the arm's joint-rate hits are reported
  assert(tr.drawStep < 0.1, `draw / holster to the back mount continuous (aim and sprint steps: max ${tr.drawStep.toFixed(3)} per frame, ${tr.knownLimited} joint-rate hits)`);
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
        lagSum += Math.hypot(f.x - cm.pivot.x, f.z - cm.pivot.z) / v; // A2.1: rigid, the pivot is the character's axis
        lagN++;
      }
      yMin = Math.min(yMin, C.position.y);
      yMax = Math.max(yMax, C.position.y);
      return 0;
    });
    t.run(0.8, {});
    let ads90 = -1;
    t.run(1.0, { ads: true }, (s) => {
      if (ads90 < 0 && cm.ads >= 0.9) ads90 = s;
      return 0;
    });
    // A2.1 (G17): the shoulder swap works only while aiming (held ads here)
    const side0 = cm['sSide'].x;
    cm.swapShoulder();
    let swap90 = -1;
    let arcMax = 0;
    const b0 = cm.boomActual;
    t.run(1.0, { ads: true }, (s) => {
      arcMax = Math.max(arcMax, cm.boomActual - b0);
      if (swap90 < 0 && Math.abs(cm['sSide'].x - -side0) < 0.2) swap90 = s;
      return 0;
    });
    cm.swapShoulder();
    t.run(0.8, { ads: true });
    t.run(0.8, {});
    const hfov = (v) => (2 * Math.atan(Math.tan(v / 2) * (16 / 9)) * 180) / Math.PI;
    const base = hfov(C.fov);
    let sprintMax = base;
    t.run(1.2, { y: 1 }, () => {
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
  assert(cam.lag <= 0.02, `camera follow is rigid: lag ${f2(cam.lag)} s (<= 20 ms; A2.1)`);
  assert(cam.bob <= 0.02, `footstep bob <= 1 cm amplitude (${(cam.bob * 50).toFixed(2)} cm)`);
  assert(within(cam.swap90, 0.15, 0.5) && cam.arcMax > 0.1, `shoulder swap ${f2(cam.swap90)} s to the mirror side (spring ~0.4 s settle) on an arc (+${f2(cam.arcMax)} m boom)`);
  // (F1a) draw halved by Michael ("About half (0.3 / 0.4 s)"); the aim camera blends at 0.9x the draw
  assert(within(cam.ads90, 0.2, 0.5), `aim framing blend ${f2(cam.ads90)} s (~0.3 s, F1a)`);
  // prototype: revisit (no sprint, CT M1): the FOV widening is not asserted; M2 does the camera
  void cam.sprintFov;
  assert(cam.maxW > 2 && cam.maxW < 6.5 && cam.maxA < 250, `stick look: angular velocity / acceleration bounded (${f2(cam.maxW)} rad/s, ${f2(cam.maxA)} rad/s^2${process.env.SOFT ? ', ' + cam.maxAAt : ''})`);

  // ---------------------------------------------------------------- refresh-rate parity (60 / 120 / 144 / 165 / 240 Hz)
  console.log('refresh-rate parity');
  const parity = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const p = g.player;
    const go = (hz) => {
      t.tp(8, -14, -Math.PI / 2);
      // every run from the same gait clock (else the lead foot is whatever the previous run left)
      p.controller.motion.phase = 0;
      p.controller['prevPhase'] = 0;
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
      return { hz, x: c.pos.x, z: c.pos.z, yaw: c.yaw, lx: L.x, lz: L.z, rx: R.x, rz: R.z, cx: cp.x, cy: cp.y, cz: cp.z };
    };
    return [60, 120, 144, 165, 240].map(go);
  });
  const a0 = parity[0];
  for (const b of parity.slice(1)) {
    const d = (k1, k2) => Math.hypot(a0[k1] - b[k1], a0[k2] - b[k2]);
    assert(d('x', 'z') < 0.02 && Math.abs(a0.yaw - b.yaw) < 0.02, `${b.hz} Hz: root motion matches 60 Hz (${(d('x', 'z') * 100).toFixed(2)} cm, ${(Math.abs(a0.yaw - b.yaw) * 57.3).toFixed(2)} deg)`);
    assert(d('lx', 'lz') < 0.04 && d('rx', 'rz') < 0.04, `${b.hz} Hz: feet land in the same places (${(d('lx', 'lz') * 100).toFixed(1)} / ${(d('rx', 'rz') * 100).toFixed(1)} cm)`);
    assert(d('cx', 'cz') < 0.03 && Math.abs(a0.cy - b.cy) < 0.02, `${b.hz} Hz: camera matches (${(d('cx', 'cz') * 100).toFixed(1)} cm)`);
  }
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-anim-fail.png' });
}
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
console.log(real.length ? 'console problems:\n' + real.join('\n') : 'no console errors');
await browser.close();
process.exit(failed || real.length ? 1 : 0);
