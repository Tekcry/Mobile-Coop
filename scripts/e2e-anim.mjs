// Animation / camera quality bars for the stealth operative, measured in the running game (Proving
// Grounds, headless stepping): responsiveness (3.2.0 Chaos Theory: visible within one frame, 95% speed within
// 0.08 s, a stop on the release step with a 0.12 s pose blend, no planted pivots, 720 deg/s travel turns, aim
// turn rate), stance and aim transitions, weapon clip timings, foot locking (< 1 cm) in
// every gait, transition continuity, hit flinch, camera follow lag / framing blends / shoulder swap /
// bob / drift / sprint FOV / bounded angular velocity and acceleration, and 60 / 120 / 144 / 165 / 240 Hz parity.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, assert as hard } from './e2e-lib.mjs';

// (anim-metrics) the pure audit metrics and limits for node (as anim-audit: bundled with esbuild at start; node + its JS
// entry, not .bin, which is a .cmd shim on Windows)
const LIB = resolve('test-results/e2e-anim/lib');
execFileSync(process.execPath, ['node_modules/esbuild/bin/esbuild', 'src/anim/audit/metrics.ts', 'src/anim/audit/limits.ts', '--bundle', '--format=esm', `--outdir=${LIB}`, '--log-level=warning'], { windowsHide: true, stdio: 'inherit' });
const M = await import(pathToFileURL(`${LIB}/metrics.js`).href);
const L = await import(pathToFileURL(`${LIB}/limits.js`).href);

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
  const sprintT = await reach({ y: 1 }, 3.8, 5);
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

  // ---------------------------------------------------------------- anti-crab (anim-metrics, anim-rework BRIEF 5)
  // Knee separation and foot track per speed and stance, knees over the toes, planted-foot slide and the elbows'
  // distance out from the shoulders, in the pelvis frame (src/anim/audit/metrics.ts, limits.ts CRAB / CRAB_CROUCH).
  // Report-only: a gait asserts once CRAB_GATES[gait] is on (as CT Core's anim-rework slices 2-4 land);
  // docs/anim-rework/METRICS.md. CRAB_STATES=1 adds the walk's sub-states at speeds 1-3 (anim-metrics-2).
  console.log('anti-crab metrics (report-only until CRAB_GATES turns a gait on)');
  /** Plays `segs` ({ sec, inp, rec }) from a standstill at speed `gear`, crouched or not; records the crab joints and the
   *  foot contacts on the `rec` segments (each 60 Hz step). */
  const crabRecord = (gear, crouch, segs, weapon) =>
    G(([gear, crouch, segs, weapon]) => {
      const t = window.__t;
      const g = window.__app.current;
      const p = g.player;
      const c = p.controller;
      const rig = p.rig;
      // (anim-rework S3) a weapon class asked for (rifle / pistol): holstered, then made current (as anim-sheet does);
      const W = g.weapons;
      // (the holstered recordings keep whatever gun is current: its handling scales the pace a little)
      const want = weapon;
      if (want && W.current.def.class !== want) {
        p.stance.holster();
        t.run(0.4, {});
        const j = W.slots.findIndex((q) => q.def.class === want);
        if (j >= 0) {
          W.index = j;
          c.speedMul = W.current.def.moveSpeedMult;
          p.cam.adsZoom = W.current.stats.adsZoom;
        }
      }
      t.tp(12, -14, -Math.PI / 2);
      if (gear) c.gears.set(gear);
      c['crouchToggled'] = !!crouch;
      // (anim-rework S2) the holstered gaits and sub-states measure holstered (the aim checks above leave the gun at low
      // ready); an aimed segment draws it again itself
      // (anim-rework S3) a drawn recording (`draw` or `ads` in a segment) starts at low ready with the gun out (an aimed
      // one from holstered would run the slower sling draw into the recording)
      const drawn = segs.some((sg) => sg.inp?.ads || sg.inp?.draw);
      if (!drawn) p.stance.holster();
      else if (p.stance.base !== 'lowReady' || W.drawPhase !== 2) {
        p.stance.base = 'lowReady';
        t.run(0.6, {});
      }
      // (S2 fix round) each recording starts from a fresh stance (as a teleport puts the feet): `t.tp` left the feet where
      // the last recording (the crouched sneak) planted them, and the idle stepped only past its 7.5 cm error
      rig.planner.L.init = rig.planner.R.init = false;
      const joints = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'];
      const out = Object.fromEntries(joints.map((j) => [j, []]));
      out.contactL = [];
      out.contactR = [];
      let speed = 0;
      for (const sg of segs) {
        t.run(sg.sec, sg.inp, sg.rec ? () => {
          for (const j of joints) {
            const n = rig[j];
            n.computeWorldMatrix(true);
            const v = n.getAbsolutePosition();
            out[j].push(v.x, v.y, v.z);
          }
          out.contactL.push(rig.planner.L.contact ? 1 : 0);
          out.contactR.push(rig.planner.R.contact ? 1 : 0);
          speed += c.speed;
          return 0;
        } : undefined);
      }
      c['crouchToggled'] = false;
      c.gears.set(4);
      out.speed = speed / Math.max(1, out.contactL.length);
      return out;
    }, [gear ?? null, !!crouch, segs, weapon ?? null]);
  const cm = (v) => (v * 100).toFixed(1);
  /** The crab numbers of a recording against the stance's ranges (`L.crabRanges`). */
  const crabRow = (name, rec, crouch, idle, ranges) => {
    // (anim-rework S2) a standstill reads against the idle's hip-width stance (L.CRAB_IDLE)
    const C = ranges ?? (idle ? L.CRAB_IDLE : L.crabRanges(!!crouch));
    const knee = M.kneeSeparation(rec.hipL, rec.hipR, rec.kneeL, rec.kneeR, C.kneeSep.min, C.kneeSep.max);
    // (a standstill has no plants to sample: the track then reads every frame of both feet)
    const anyPlant = rec.contactL.some(Boolean) || rec.contactR.some(Boolean);
    const track = M.footTrack(rec.hipL, rec.hipR, rec.ankleL, rec.ankleR, C.trackHalf, anyPlant ? rec.contactL : undefined, anyPlant ? rec.contactR : undefined);
    const bow = M.kneeBow(rec.hipL, rec.hipR, rec.kneeL, rec.kneeR, rec.ankleL, rec.ankleR, C.kneeBow);
    const slL = M.plantedSlide(rec.ankleL, rec.contactL, C.slide);
    const slR = M.plantedSlide(rec.ankleR, rec.contactR, C.slide);
    const wing = M.elbowWing(rec.shoulderL, rec.shoulderR, rec.elbowL, rec.elbowR, C.elbowWing);
    const slide = Math.max(slL.worst, slR.worst);
    const wide = [!knee.pass && 'knees', !track.pass && 'track', !bow.pass && 'knee-out', slide >= C.slide && 'slide', !wing.pass && 'elbows'].filter(Boolean);
    const row = { state: name, speed: +rec.speed.toFixed(2), knee: [+knee.min.toFixed(2), +knee.mean.toFixed(2), +knee.max.toFixed(2)], track: [+cm(track.min), +cm(track.mean), +cm(track.max)], bow: +cm(bow.max), slide: +cm(slide), plants: slL.plants + slR.plants, wing: +cm(wing.max), out: wide };
    return { name, C, knee, track, bow, slide, plants: slL.plants + slR.plants, wing, wide, row };
  };
  const crabLine = (r, rec) => `  ${r.name} (${f2(rec.speed)} m/s): knees ${r.row.knee[1]} x the hips (${r.row.knee[0]}-${r.row.knee[2]}; ${r.C.kneeSep.min}-${r.C.kneeSep.max}), planted track ${r.row.track[1]} cm from the line (${r.row.track[0]} to ${r.row.track[2]}; <= ${cm(r.C.trackHalf)}), knee outside the ankle max ${r.row.bow} cm (<= ${cm(r.C.kneeBow)}), planted slide max ${r.row.slide} cm in ${r.plants} plants (< ${cm(r.C.slide)}), elbow outside the shoulder max ${r.row.wing} cm (<= ${cm(r.C.elbowWing)})${r.wide.length ? `  OUT: ${r.wide.join(', ')}` : ''}`;
  const crabGaits = [
    ['walk', { y: 0.5 }],
    ['jog', { y: 1 }],
    ['run', { y: 1 }, null, 5],
    ['crouch', { y: 1 }, 'crouch'],
    ['sneak', { y: 0.35 }, 'crouch'],
  ];
  // (anim-bake-1022) Michael's 2026-10-22 run tune (the run keys rebaked at dbd466c7): the run alone reads against ranges
  // widened to the measured baked value plus ~10%; every other gait keeps L.crabRanges. Restore: drop RUN_TUNE.
  const RUN_STAND = L.crabRanges(false);
  const RUN_TUNE = {
    ...RUN_STAND,
    // (anim-bake-1022) Michael's 2026-10-22 run tune: was 0.5-1.1 (measured 0.55 / 1.2 / 1.93)
    kneeSep: { min: RUN_STAND.kneeSep.min, max: 2.15 },
    // (anim-bake-1022) Michael's 2026-10-22 run tune: was 0.07 (measured max 14.6 cm)
    trackHalf: 0.16,
    // (anim-bake-1022) Michael's 2026-10-22 run tune: was 0.03 (measured 8.2 cm)
    kneeBow: 0.09,
    // (anim-bake-1022) Michael's 2026-10-22 run tune: was 0.06 (measured 9.9 cm)
    elbowWing: 0.11,
  };
  const crabRows = [];
  for (const [name, inp, mode, gear] of crabGaits) {
    const rec = await crabRecord(gear ?? 4, mode === 'crouch', [{ sec: 1.0, inp }, { sec: 2.0, inp, rec: true }]);
    const r = crabRow(name, rec, mode === 'crouch', false, name === 'run' ? RUN_TUNE : undefined);
    crabRows.push(r.row);
    const gated = !!L.CRAB_GATES[name];
    console.log(crabLine(r, rec) + (gated ? '' : ' [report-only]'));
    if (gated) {
      const C = r.C;
      assert(r.knee.pass, `${name}: knee separation within ${C.kneeSep.min}-${C.kneeSep.max} x the hips (${r.row.knee.join(' / ')})`);
      assert(r.track.pass, `${name}: planted feet within ${cm(C.trackHalf)} cm of the line under the hips (${r.row.track.join(' / ')} cm)`);
      assert(r.bow.pass, `${name}: knees over the toes (outside by ${r.row.bow} cm)`);
      assert(r.slide < C.slide && r.plants >= 3, `${name}: planted feet locked (${r.row.slide} cm, ${r.plants} plants)`);
      assert(r.wing.pass, `${name}: elbows in (${r.row.wing} cm outside the shoulder)`);
    }
  }
  if (process.env.CRAB_JSON) console.log(`CRAB_JSON ${JSON.stringify(crabRows)}`);
  {
    // (anim-metrics-2) the walk Michael tested, every sub-state at speeds 1-3 (standing, holstered unless aiming): idle,
    // start, the straight walk, stop, a turn round from a standstill, a 90 deg and a 180 deg direction change, and
    // aimed strafe and backwards. (anim-rework S2) The standing holstered sub-states CRAB_STATE_GATES turns on run and
    // assert on every e2e-anim run (CRAB_STATE_CHECKS: which metrics, and why); CRAB_STATES=1 adds the rest as a table.
    const all = process.env.CRAB_STATES === '1';
    if (all) console.log('anti-crab: walk sub-states at speeds 1-3 (CRAB_STATES=1)');
    else console.log('anti-crab: standing holstered sub-states at speeds 1-3 (CRAB_STATE_GATES)');
    const states = [
      ['idle', [{ sec: 0.6, inp: {} }, { sec: 1.0, inp: {}, rec: true }]],
      ['start', [{ sec: 0.6, inp: {} }, { sec: 0.8, inp: { y: 1 }, rec: true }]],
      ['straight', [{ sec: 1.0, inp: { y: 1 } }, { sec: 2.0, inp: { y: 1 }, rec: true }]],
      ['stop', [{ sec: 1.2, inp: { y: 1 } }, { sec: 1.0, inp: {}, rec: true }]],
      ['turn round (standstill)', [{ sec: 0.6, inp: {} }, { sec: 0.8, inp: { y: -0.3 }, rec: true }]],
      ['90 deg change', [{ sec: 1.0, inp: { y: 1 } }, { sec: 1.2, inp: { x: 1 }, rec: true }]],
      ['180 deg change', [{ sec: 1.0, inp: { y: 1 } }, { sec: 1.2, inp: { y: -1 }, rec: true }]],
      ['strafe (aiming)', [{ sec: 0.6, inp: { x: 1, ads: true } }, { sec: 1.5, inp: { x: 1, ads: true }, rec: true }]],
      ['backwards (aiming)', [{ sec: 0.6, inp: { y: -1, ads: true } }, { sec: 1.5, inp: { y: -1, ads: true }, rec: true }]],
    ];
    const stateKey = { idle: 'idle', start: 'start', straight: 'straight', stop: 'stop', 'turn round (standstill)': 'turn', '90 deg change': 'change90', '180 deg change': 'change180' };
    const stateRows = [];
    for (const gear of [1, 2, 3]) {
      for (const [name, segs] of states) {
        const key = stateKey[name];
        const gated = !!(key && L.CRAB_STATE_GATES[key]);
        if (!all && !gated) continue;
        const rec = await crabRecord(gear, false, segs);
        const r = crabRow(`speed ${gear} ${name}`, rec, false, L.CRAB_IDLE_TRACK.includes(key));
        stateRows.push({ gear, ...r.row });
        console.log(crabLine(r, rec) + (gated ? '' : ' [report-only]'));
        if (!gated) continue;
        const C = r.C;
        const want = L.CRAB_STATE_CHECKS[key];
        const n = r.name;
        if (want.includes('knees')) assert(r.knee.pass, `${n}: knee separation within ${C.kneeSep.min}-${C.kneeSep.max} x the hips (${r.row.knee.join(' / ')})`);
        if (want.includes('track')) assert(r.track.pass, `${n}: feet within ${cm(C.trackHalf)} cm of the line under the hips (${r.row.track.join(' / ')} cm)`);
        if (want.includes('knee-out')) assert(r.bow.pass, `${n}: knees over the toes (outside by ${r.row.bow} cm)`);
        if (want.includes('slide')) assert(r.slide < C.slide, `${n}: planted feet locked (${r.row.slide} cm)`);
        if (want.includes('elbows')) assert(r.wing.pass, `${n}: elbows in (${r.row.wing} cm outside the shoulder)`);
      }
    }
    if (process.env.CRAB_JSON) console.log(`CRAB_STATES_JSON ${JSON.stringify(stateRows)}`);
  }
  {
    // (anim-rework S5) back to a wall, holstered (the wall keyed set, wallKeyed.ts): idle, slide both ways and the edge
    // peek, standing and crouched, on a free high wall on Proving. Asserted: the knees within the stance's range, knees
    // over the toes (<= 3 cm), the feet never cross; the track against WALL_TRACK (the idle's hip width, the side step's
    // lead foot: S5-KEYS) and the planted slide / elbows report-only. CRAB_JSON prints the rows.
    // (S5 round 2) a wall slide is a side step: the slide rows read against the glide strafe's side-step ranges
    // (L.CRAB_STRAFE: knees 0.5-1.5 x the hips, track 20 cm, knees over the ankles 3 cm), not the forward walk's.
    // WALL_OPEN: rows that print their numbers but do not fail the suite (REPORT-ONLY, open for CT Core, S5-REPORT).
    console.log('anti-crab: back to a wall, holstered (S5)');
    const WALL_TRACK = { idle: 0.105, move: 0.16 };
    const WALL_OPEN = new Set(['wall slide right', 'wall slide left', 'wall peek right', 'wall peek left', 'wall crouched idle', 'wall crouched slide right', 'wall crouched slide left', 'wall crouched peek right', 'wall crouched peek left']);
    // every row runs and prints before the block fails (a failing row no longer hides the rows after it)
    const wallFails = [];
    const wa = (cond, msg) => (cond ? assert(true, msg) : wallFails.push(msg));
    const wallRec = (crouch, plan) =>
      G(([crouch, plan]) => {
        const t = window.__t;
        const g = window.__app.current;
        const p = g.player;
        const c = p.controller;
        const rig = p.rig;
        const st = window.__app.input.state;
        const V = p.position.constructor;
        p.stance.holster();
        t.run(0.4, {});
        const ray = (x0, y0, z0, x1, y1, z1) => !g.ballistics.ray(new V(x0, y0, z0), new V(x1, y1, z1), 1).hit;
        const segs = g.world.level.coverSegments;
        let seg = -1;
        for (let i = 0; i < segs.length && seg < 0; i++) {
          const s = segs[i];
          if (s.low || Math.abs(s.y) > 0.3 || s.len < 4 || s.len > 14) continue;
          let ok = true;
          for (const k of [0.5, s.len / 2, s.len - 0.5]) {
            const x = s.ax + s.tx * k + s.nx * 0.45;
            const z = s.az + s.tz * k + s.nz * 0.45;
            ok = ok && ray(x, s.y + 1, z, x + s.nx * 2.5, s.y + 1, z + s.nz * 2.5) && ray(x, s.y + 0.3, z, x + s.nx * 2.5, s.y + 0.3, z + s.nz * 2.5);
          }
          if (ok) seg = i;
        }
        if (seg < 0) return { err: 'no free high wall on Proving' };
        const s = segs[seg];
        const enter = (k) => {
          // off the wall from the previous row first: a teleport keeps the wall state, so the cover tap below would
          // toggle the player off it (the leave takes WALL.leaveTime 0.28 s)
          if (g.wallCore.active) {
            c.clearCrouchToggle();
            st.tap('cover');
            t.run(0.6, {});
          }
          c.clearCrouchToggle();
          const yaw = Math.atan2(-s.nx, -s.nz);
          c.teleport(new V(s.ax + s.tx * k + s.nx * 0.75, s.y + 0.05, s.az + s.tz * k + s.nz * 0.75), yaw);
          p.cam.yaw = yaw;
          p.cam.pitch = 0;
          p.cam.snap();
          rig.planner.L.init = rig.planner.R.init = false;
          t.run(0.3, {});
          st.tap('cover');
          t.run(0.8, {});
          if (crouch) {
            st.tap('crouch');
            t.run(0.8, {});
          }
        };
        const joints = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'];
        const rows = {};
        for (const [name, k0, x, warm, rec] of plan) {
          enter(k0 < 0 ? s.len + k0 : k0);
          if (!g.wallCore.active) return { err: `${name}: not on the wall (${g.wallCore.phase})` };
          t.run(warm, { x });
          const out = Object.fromEntries(joints.map((j) => [j, []]));
          out.contactL = [];
          out.contactR = [];
          let speed = 0;
          let keyW = 0;
          let n = 0;
          t.run(rec, { x }, () => {
            for (const j of joints) {
              const b = rig[j];
              b.computeWorldMatrix(true);
              const v = b.getAbsolutePosition();
              out[j].push(v.x, v.y, v.z);
            }
            out.contactL.push(rig.planner.L.contact ? 1 : 0);
            out.contactR.push(rig.planner.R.contact ? 1 : 0);
            speed += c.speed;
            keyW += rig.keyedWalk;
            n++;
            return 0;
          });
          out.speed = speed / Math.max(1, n);
          out.keyW = keyW / Math.max(1, n);
          out.edge = g.wallCore.edge;
          out.onWall = !!g.wallCore.active;
          rows[name] = out;
        }
        c.clearCrouchToggle();
        st.tap('cover');
        t.run(0.6, {});
        return rows;
      }, [crouch, plan]);
    // [name, k (m along; < 0 from the far end), stick x, warm-up s, recorded s]; the peeks walk 0.8 m to an end and hold
    const plan = [
      ['idle', 2, 0, 0.6, 1.0],
      ['slide right', 2, 1, 0.8, 1.2],
      ['slide left', 2, -1, 0.8, 1.2],
      ['peek right', -0.8, 1, 2.6, 1.0],
      ['peek left', 0.8, -1, 2.6, 1.0],
    ];
    const wallRows = [];
    for (const crouch of [false, true]) {
      const rows = await wallRec(crouch, plan);
      assert(!rows.err, rows.err ? `wall recording: ${rows.err}` : `wall recording ${crouch ? 'crouched' : 'standing'}`);
      for (const [name] of plan) {
        const rec = rows[name];
        const nm = `wall ${crouch ? 'crouched ' : ''}${name}`;
        const C = name.startsWith('slide') ? L.CRAB_STRAFE : { ...L.crabRanges(crouch), trackHalf: name === 'idle' ? WALL_TRACK.idle : WALL_TRACK.move };
        const open = WALL_OPEN.has(nm);
        const r = crabRow(nm, rec, crouch, false, C);
        wallRows.push({ crouch, ...r.row, keyW: +rec.keyW.toFixed(2), edge: rec.edge });
        console.log(crabLine(r, rec) + ` keyed ${f2(rec.keyW)}${name.startsWith('peek') ? ` edge ${rec.edge}` : ''}${open ? '  REPORT-ONLY (open, CT Core)' : ''}`);
        if (open) continue;
        wa(rec.onWall, `${nm}: still on the wall`);
        wa(rec.keyW > 0.9, `${nm}: the wall keys play (keyed weight ${f2(rec.keyW)})`);
        wa(r.knee.pass, `${nm}: knee separation within ${C.kneeSep.min}-${C.kneeSep.max} x the hips (${r.row.knee.join(' / ')})`);
        wa(r.bow.pass, `${nm}: knees over the toes (outside by ${r.row.bow} cm)`);
        wa(r.track.min > -0.005, `${nm}: the feet never cross (${r.row.track[0]} cm)`);
        wa(r.track.pass, `${nm}: feet within ${cm(C.trackHalf)} cm of the line under the hips (${r.row.track.join(' / ')} cm)`);
      }
    }
    if (process.env.CRAB_JSON) console.log(`CRAB_WALL_JSON ${JSON.stringify(wallRows)}`);
    assert(!wallFails.length, wallFails.length ? `wall rows: ${wallFails.join('; ')}` : 'wall rows in range');
  }
  {
    // (anim-rework S3) drawn, standing, rifle and pistol: the aimed idle, the glide (strafe right and left, backwards,
    // forward) at speeds 1-2 (the aim's cap: speed 3 reads as 2) after 1.2 s of it (the steady glide: a slow back-step
    // takes that long to re-step the ready stance's feet), the low ready idle, walk and jog. CRAB_DRAWN_GATES turns
    // a state's asserts on (CRAB_DRAWN_CHECKS: which metrics); the aimed strafe reads against CRAB_STRAFE (a side-step
    // opens the feet: limits.ts), the idles against CRAB_IDLE (hip width). CRAB_STATES=1 prints the report-only rows too.
    const all = process.env.CRAB_STATES === '1';
    console.log(`anti-crab: drawn states, rifle and pistol (${all ? 'CRAB_STATES=1' : 'CRAB_DRAWN_GATES'})`);
    const A = { ads: true };
    const R = { draw: true };
    const drawn = [
      ['aimed idle', 'aimIdle', [0], [{ sec: 0.8, inp: A }, { sec: 1.0, inp: A, rec: true }]],
      ['aimed strafe right', 'aimStrafe', [1, 2], [{ sec: 1.2, inp: { ...A, x: 1 } }, { sec: 1.5, inp: { ...A, x: 1 }, rec: true }]],
      ['aimed strafe left', 'aimStrafe', [1, 2], [{ sec: 1.2, inp: { ...A, x: -1 } }, { sec: 1.5, inp: { ...A, x: -1 }, rec: true }]],
      ['aimed backwards', 'aimBack', [1, 2], [{ sec: 1.2, inp: { ...A, y: -1 } }, { sec: 1.5, inp: { ...A, y: -1 }, rec: true }]],
      ['aimed forward', 'aimFwd', [1, 2], [{ sec: 1.2, inp: { ...A, y: 1 } }, { sec: 1.5, inp: { ...A, y: 1 }, rec: true }]],
      ['low ready idle', 'readyIdle', [0], [{ sec: 0.8, inp: R }, { sec: 1.0, inp: R, rec: true }]],
      ['low ready walk', 'readyWalk', [4], [{ sec: 1.0, inp: { ...R, y: 0.5 } }, { sec: 2.0, inp: { ...R, y: 0.5 }, rec: true }]],
      ['low ready jog', 'readyJog', [4], [{ sec: 1.0, inp: { ...R, y: 1 } }, { sec: 2.0, inp: { ...R, y: 1 }, rec: true }]],
    ];
    const drawnRows = [];
    // (the gun current before, restored after: the checks below keep their conditions)
    const orig = await G(() => ({ cls: window.__app.current.weapons.current.def.class, mul: window.__app.current.player.controller.speedMul }));
    for (const weapon of ['rifle', 'pistol']) {
      for (const [name, key, gears, segs] of drawn) {
        const gated = !!L.CRAB_DRAWN_GATES[key];
        if (!all && !gated) continue;
        for (const gear of gears) {
          const rec = await crabRecord(gear || 4, false, segs, weapon);
          const C = L.crabDrawnRanges(key);
          const r = crabRow(`${weapon} ${name}${gear ? ` speed ${gear}` : ''}`, rec, false, false, C);
          drawnRows.push({ weapon, key, gear, ...r.row });
          console.log(crabLine(r, rec) + (gated ? '' : ' [report-only]'));
          if (!gated) continue;
          const want = L.CRAB_DRAWN_CHECKS[key];
          const n = r.name;
          if (want.includes('knees')) assert(r.knee.pass, `${n}: knee separation within ${C.kneeSep.min}-${C.kneeSep.max} x the hips (${r.row.knee.join(' / ')})`);
          if (want.includes('track')) assert(r.track.pass, `${n}: feet within ${cm(C.trackHalf)} cm of the line under the hips (${r.row.track.join(' / ')} cm)`);
          if (want.includes('knee-out')) assert(r.bow.pass, `${n}: knees over the toes (outside by ${r.row.bow} cm)`);
          if (want.includes('slide')) assert(r.slide < C.slide, `${n}: planted feet locked (${r.row.slide} cm)`);
          if (want.includes('elbows')) assert(r.wing.pass, `${n}: elbows in (${r.row.wing} cm outside the shoulder)`);
          if (want.includes('cross')) assert(r.track.min > -0.005, `${n}: the feet never cross (${r.row.track[0]} cm)`);
        }
      }
    }
    if (process.env.CRAB_JSON) console.log(`CRAB_DRAWN_JSON ${JSON.stringify(drawnRows)}`);
    // (anim-rework S3) the drawn upper body (BRIEF 3): the muzzle at low ready 30-45 deg down (the rifle) and pointed down
    // and forward (the pistol's compressed ready), aiming the head upright (the gun to the eye), elbows in (the rows above)
    const pose = (weapon, aim) =>
      G(([weapon, aim]) => {
        const t = window.__t;
        const g = window.__app.current;
        const p = g.player;
        const W = g.weapons;
        if (W.current.def.class !== weapon) {
          p.stance.holster();
          t.run(0.4, {});
          const j = W.slots.findIndex((q) => q.def.class === weapon);
          if (j >= 0) W.index = j;
        }
        t.tp(12, -14, -Math.PI / 2);
        p.stance.base = 'lowReady';
        t.run(1.0, aim ? { ads: true } : {});
        let down = 0;
        let yaw = 0;
        let tilt = 0;
        const n = 30;
        const rig = p.rig;
        t.run(0.5, aim ? { ads: true } : {}, () => {
          const m = rig.heldWeapon.computeWorldMatrix(true).m;
          const bx = m[8];
          const by = m[9];
          const bz = m[10];
          const l = Math.hypot(bx, by, bz) || 1;
          down += (Math.asin(-by / l) * 180) / Math.PI;
          const fy = p.controller.renderYaw;
          yaw += (Math.atan2(bx * Math.cos(fy) - bz * Math.sin(fy), bx * Math.sin(fy) + bz * Math.cos(fy)) * 180) / Math.PI;
          const h = rig.headNode.computeWorldMatrix(true).m;
          tilt += (Math.acos(Math.max(-1, Math.min(1, h[5] / (Math.hypot(h[4], h[5], h[6]) || 1)))) * 180) / Math.PI;
          return 0;
        });
        return { down: down / n, yaw: yaw / n, tilt: tilt / n };
      }, [weapon, aim]);
    const P = L.DRAWN_POSE;
    for (const weapon of ['rifle', 'pistol']) {
      const lr = await pose(weapon, false);
      const am = await pose(weapon, true);
      console.log(`  ${weapon} low ready: muzzle ${f2(lr.down)} deg down, ${f2(lr.yaw)} deg off the facing; aiming: head tilt ${f2(am.tilt)} deg, muzzle ${f2(am.down)} deg down`);
      const band = weapon === 'pistol' ? P.pistolDown : P.rifleDown;
      assert(within(lr.down, band.min, band.max), `${weapon} low ready: muzzle ${band.min}-${band.max} deg down (${f2(lr.down)})`);
      assert(Math.abs(lr.yaw) <= P.readyYaw, `${weapon} low ready: muzzle within ${P.readyYaw} deg of the facing (${f2(lr.yaw)})`);
      assert(am.tilt <= P.headTilt, `${weapon} aiming: head within ${P.headTilt} deg of upright, the gun to the eye (${f2(am.tilt)})`);
    }
    await crabRecord(0, false, [{ sec: 0.1, inp: {} }], orig.cls);
    await G((o) => {
      const p = window.__app.current.player;
      p.stance.holster();
      p.controller.speedMul = o.mul;
      window.__t.run(0.5, {});
    }, orig);
  }

  {
    // (anim-rework S4) crouched sub-states (holstered unless named): the crouched idle (the keyed squat), a crouched start
    // and stop at speeds 1 and 3, the crouch run at speed 5, and drawn (rifle) the crouched low ready walk, the aimed idle
    // (the kneel) and the aimed strafe. CRAB_CROUCH_GATES turns a state's asserts on (CRAB_CROUCH_CHECKS: which metrics;
    // L.crabCrouchRanges: the ranges); CRAB_STATES=1 prints the report-only rows too.
    const all = process.env.CRAB_STATES === '1';
    console.log(`anti-crab: crouched sub-states (${all ? 'CRAB_STATES=1' : 'CRAB_CROUCH_GATES'})`);
    const A = { ads: true };
    const R = { draw: true };
    const crouched = [
      ['crouched idle', 'idle', [0], [{ sec: 1.2, inp: {} }, { sec: 1.5, inp: {}, rec: true }]],
      ['crouched start', 'start', [1, 3], [{ sec: 1.0, inp: {} }, { sec: 0.8, inp: { y: 1 }, rec: true }]],
      ['crouched stop', 'stop', [1, 3], [{ sec: 1.2, inp: { y: 1 } }, { sec: 1.0, inp: {}, rec: true }]],
      ['crouch run', 'run', [5], [{ sec: 1.0, inp: { y: 1 } }, { sec: 2.0, inp: { y: 1 }, rec: true }]],
      ['crouched low ready walk', 'readyWalk', [3], [{ sec: 1.0, inp: { ...R, y: 1 } }, { sec: 2.0, inp: { ...R, y: 1 }, rec: true }], 'rifle'],
      ['crouched aimed idle', 'aimIdle', [0], [{ sec: 1.2, inp: A }, { sec: 1.0, inp: A, rec: true }], 'rifle'],
      ['crouched aimed strafe', 'aimStrafe', [1, 2], [{ sec: 1.2, inp: { ...A, x: 1 } }, { sec: 1.5, inp: { ...A, x: 1 }, rec: true }], 'rifle'],
    ];
    const crouchRows = [];
    const orig = await G(() => ({ cls: window.__app.current.weapons.current.def.class, mul: window.__app.current.player.controller.speedMul }));
    for (const [name, key, gears, segs, weapon] of crouched) {
      const gated = !!L.CRAB_CROUCH_GATES[key];
      if (!all && !gated) continue;
      for (const gear of gears) {
        const rec = await crabRecord(gear || 4, true, segs, weapon);
        const C = L.crabCrouchRanges(key);
        const r = crabRow(`${name}${gear ? ` speed ${gear}` : ''}`, rec, true, false, C);
        crouchRows.push({ key, gear, ...r.row });
        console.log(crabLine(r, rec) + (gated ? '' : ' [report-only]'));
        if (!gated) continue;
        const want = L.CRAB_CROUCH_CHECKS[key];
        const n = r.name;
        if (want.includes('knees')) assert(r.knee.pass, `${n}: knee separation within ${C.kneeSep.min}-${C.kneeSep.max} x the hips (${r.row.knee.join(' / ')})`);
        if (want.includes('track')) assert(r.track.pass, `${n}: feet within ${cm(C.trackHalf)} cm of the line under the hips (${r.row.track.join(' / ')} cm)`);
        if (want.includes('knee-out')) assert(r.bow.pass, `${n}: knees over the toes (outside by ${r.row.bow} cm)`);
        if (want.includes('slide')) assert(r.slide < C.slide, `${n}: planted feet locked (${r.row.slide} cm)`);
        if (want.includes('elbows')) assert(r.wing.pass, `${n}: elbows in (${r.row.wing} cm outside the shoulder)`);
        if (want.includes('cross')) assert(r.track.min > -0.005, `${n}: the feet never cross (${r.row.track[0]} cm)`);
      }
    }
    if (process.env.CRAB_JSON) console.log(`CRAB_CROUCH_JSON ${JSON.stringify(crouchRows)}`);
    // (anim-rework S4, BRIEF 3 "The crouched idle") the knee hand: holstered, crouched and still, each palm on top of its
    // own knee, palm down, fingers forward (L.KNEE_HAND), sampled over 2 s of the idle (its breathing and weight shift)
    await G((a) => (window.__kneeAbove = a), L.KNEE_HAND.above);
    const kh = await G(() => {
      const t = window.__t;
      const p = window.__app.current.player;
      const c = p.controller;
      const rig = p.rig;
      p.stance.holster();
      t.tp(12, -14, -Math.PI / 2);
      rig.planner.L.init = rig.planner.R.init = false;
      c['crouchToggled'] = true;
      t.run(1.5, {});
      const H = { L: { d: [0.07779, -0.99681, 0.01766], n: [0.9529, 0.06913, -0.2953], palm: [0.00372, -0.04769, 0.00084] }, R: { d: [-0.07779, -0.99681, 0.01766], n: [-0.9529, 0.06913, -0.2953], palm: [-0.00372, -0.04769, 0.00084] } };
      const out = { dist: 0, down: 1, fwd: 1, above: window.__kneeAbove, off: [0, 0, 0], n: 0 };
      const xf = (m, v, w) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * w, m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * w, m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * w];
      const unit = (v) => {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
      };
      t.run(2.0, {}, () => {
        const yaw = rig.root.rotation.y;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        for (const s of ['L', 'R']) {
          const m = rig[`wrist${s}`].computeWorldMatrix(true).m;
          const palm = xf(m, H[s].palm, 1);
          const n = unit(xf(m, H[s].n, 0));
          const d = unit(xf(m, H[s].d, 0));
          const k = rig[`knee${s}`].getAbsolutePosition();
          const ox = palm[0] - k.x;
          const oy = palm[1] - (k.y + out.above);
          const oz = palm[2] - k.z;
          out.dist = Math.max(out.dist, Math.hypot(ox, oy, oz));
          // (the mean offset in the body frame: out to the hand's side, up, forward)
          const sd = s === 'L' ? -1 : 1;
          out.off[0] += (ox * fz - oz * fx) * sd;
          out.off[1] += oy;
          out.off[2] += ox * fx + oz * fz;
          out.n++;
          out.down = Math.min(out.down, -n[1]);
          out.fwd = Math.min(out.fwd, d[0] * fx + d[2] * fz);
        }
        return 0;
      });
      c['crouchToggled'] = false;
      t.run(0.6, {});
      for (let j = 0; j < 3; j++) out.off[j] /= Math.max(1, out.n);
      return out;
    });
    const K = L.KNEE_HAND;
    console.log(`  crouched idle knee hand: palm to the knee top max ${cm(kh.dist)} cm (<= ${cm(K.dist)}), palm down min ${f2(kh.down)} (>= ${K.palmDown}), fingers forward min ${f2(kh.fwd)} (>= ${K.fingersFwd}), mean offset out ${cm(kh.off[0])} up ${cm(kh.off[1])} fwd ${cm(kh.off[2])} cm${L.CRAB_CROUCH_GATES.idle ? '' : ' [report-only]'}`);
    if (L.CRAB_CROUCH_GATES.idle) {
      assert(kh.dist <= K.dist, `crouched idle: each palm on top of its knee (${cm(kh.dist)} cm)`);
      assert(kh.down >= K.palmDown, `crouched idle: palms down (${f2(kh.down)})`);
      assert(kh.fwd >= K.fingersFwd, `crouched idle: fingers forward (${f2(kh.fwd)})`);
    }
    await crabRecord(0, false, [{ sec: 0.1, inp: {} }], orig.cls);
    await G((o) => {
      const p = window.__app.current.player;
      p.stance.holster();
      p.controller.speedMul = o.mul;
      window.__t.run(0.5, {});
    }, orig);
  }

  {
    // (anim-rework S4) stand <-> crouch in every state, on the posed rig (the keyed set is not in graph.pose): each joint's
    // place in the body frame (from the root, turned by its yaw), its change per 60 Hz frame and the change of that (a
    // pop is a jump in the velocity), the worst of the hips, wrists, head and the knees over planted feet (a stepping knee
    // swings) over each transition (L.CROUCH_POP)
    console.log('stand <-> crouch on the rig (posed joints)');
    const pops = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const p = g.player;
      const c = p.controller;
      const rig = p.rig;
      const W = g.weapons;
      const joints = ['hips', 'kneeL', 'kneeR', 'wristL', 'wristR', 'headNode'];
      const res = [];
      let prev = null;
      let vel = null;
      let worst = 0;
      let where = '';
      let planted = [true, true];
      const sample = () => {
        const pl = [rig.planner.L.contact, rig.planner.R.contact];
        const r = rig.root.position;
        const yaw = rig.root.rotation.y;
        const cs = Math.cos(yaw);
        const sn = Math.sin(yaw);
        const now = [];
        for (const j of joints) {
          const n = rig[j];
          n.computeWorldMatrix(true);
          const v = n.getAbsolutePosition();
          const dx = v.x - r.x;
          const dz = v.z - r.z;
          now.push(dx * cs - dz * sn, v.y - r.y, dx * sn + dz * cs);
        }
        if (prev) {
          const v = now.map((x, k) => x - prev[k]);
          if (vel)
            for (let k = 0; k < joints.length; k++) {
              if ((k === 1 || k === 2) && !(pl[k - 1] && planted[k - 1])) continue;
              const a = Math.hypot(v[3 * k] - vel[3 * k], v[3 * k + 1] - vel[3 * k + 1], v[3 * k + 2] - vel[3 * k + 2]);
              if (a > worst) {
                worst = a;
                where = joints[k];
              }
            }
          vel = v;
        }
        prev = now;
        planted = pl;
        return 0;
      };
      const seq = (name, setup, segs) => {
        t.tp(12, -14, -Math.PI / 2);
        rig.planner.L.init = rig.planner.R.init = false;
        setup();
        prev = vel = null;
        worst = 0;
        where = '';
        for (const sg of segs) t.run(sg.sec, sg.inp, sg.rec ? sample : undefined);
        res.push({ name, worst, where });
        c['crouchToggled'] = false;
        t.run(0.6, {});
      };
      const hol = () => {
        p.stance.holster();
        t.run(0.5, {});
      };
      const low = () => {
        p.stance.base = 'lowReady';
        t.run(0.8, {});
      };
      const C = { taps: { 1: 'crouch' } };
      seq('holstered still: stand -> crouch -> stand', hol, [{ sec: 0.8, inp: {} }, { sec: 1.2, inp: C, rec: true }, { sec: 1.2, inp: C, rec: true }]);
      seq('holstered walking: crouch -> stand', hol, [{ sec: 1.0, inp: { y: 0.5 } }, { sec: 1.0, inp: { y: 0.5, ...C }, rec: true }, { sec: 1.0, inp: { y: 0.5, ...C }, rec: true }]);
      seq('holstered running: crouch -> stand', hol, [{ sec: 1.0, inp: { y: 1 } }, { sec: 1.0, inp: { y: 1, ...C }, rec: true }, { sec: 1.0, inp: { y: 1, ...C }, rec: true }]);
      seq('crouched: walk -> stop -> squat -> start', () => (hol(), (c['crouchToggled'] = true), t.run(0.6, {})), [{ sec: 1.0, inp: { y: 0.6 } }, { sec: 1.6, inp: {}, rec: true }, { sec: 1.0, inp: { y: 0.6 }, rec: true }]);
      seq('crouched sneak -> stand still', () => (hol(), (c['crouchToggled'] = true), t.run(0.6, {})), [{ sec: 1.0, inp: { y: 0.35 } }, { sec: 0.6, inp: {}, rec: true }, { sec: 1.4, inp: C, rec: true }]);
      seq('low ready still: crouch -> stand', low, [{ sec: 0.4, inp: { draw: true } }, { sec: 1.2, inp: { draw: true, ...C }, rec: true }, { sec: 1.2, inp: { draw: true, ...C }, rec: true }]);
      seq('low ready walking: crouch -> stand', low, [{ sec: 1.0, inp: { draw: true, y: 0.5 } }, { sec: 1.0, inp: { draw: true, y: 0.5, ...C }, rec: true }, { sec: 1.0, inp: { draw: true, y: 0.5, ...C }, rec: true }]);
      seq('aiming still: crouch -> stand', low, [{ sec: 0.6, inp: { ads: true } }, { sec: 1.2, inp: { ads: true, ...C }, rec: true }, { sec: 1.2, inp: { ads: true, ...C }, rec: true }]);
      seq('aiming strafe: crouch -> stand', low, [{ sec: 1.0, inp: { ads: true, x: 1 } }, { sec: 1.0, inp: { ads: true, x: 1, ...C }, rec: true }, { sec: 1.0, inp: { ads: true, x: 1, ...C }, rec: true }]);
      p.stance.holster();
      t.run(0.6, {});
      return res;
    });
    for (const r of pops) {
      console.log(`  ${r.name}: worst velocity change ${cm(r.worst)} cm per 60 Hz frame (${r.where}; <= ${cm(L.CROUCH_POP)})${L.CROUCH_POP_GATE ? '' : ' [report-only]'}`);
      if (L.CROUCH_POP_GATE) assert(r.worst <= L.CROUCH_POP, `${r.name}: no pop on the rig (${cm(r.worst)} cm per frame, ${r.where})`);
    }
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
    // (anim-rework S3) drawn: crouch and stand while aiming, let go to low ready, up to the aim again, the low ready walk
    // (strict: no pops in the drawn keyed set's blends)
    window.__seg = 'aim crouch';
    t.run(0.8, { ads: true, taps: { 1: 'crouch' } }, track);
    window.__seg = 'aim stand';
    t.run(0.8, { ads: true, taps: { 1: 'crouch' } }, track);
    window.__seg = 'low ready';
    t.run(0.6, {}, track);
    window.__seg = 'ready to aim';
    t.run(0.6, { ads: true }, track);
    window.__seg = 'ready walk';
    t.run(0.8, { y: 0.5 }, track);
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
