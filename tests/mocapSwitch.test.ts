/**
 * (mocap-trial) The "Mocap locomotion" rollback switch (src/anim/mocap.ts, docs/mocap-trial/CLIP-FORMAT.md):
 * - default off, `?mocap=1` / `?mocap=0` and the stored setting pick the set (the URL wins for the page);
 * - the mocap files are the CMU clips (subject 16's walk / jog / run with clip feet, the walking turns, start and stop,
 *   subject 69's turn on the spot), the layer table tuned (docs/mocap-trial/TAKES.md, CLIP-FORMAT.md);
 * - with the placeholders (the mocap walk / jog / run swapped back to the hand-keyed clips, no slot filled, the layers and
 *   the foot pitch rate neutral) and the switch ON, the anim-skeleton identity capture still equals its fixture, and a
 *   holstered free-gait walk / jog / run / stop (the path the switch actually changes, which the fixture's scenarios do
 *   not take) is bit-identical on and off: the plumbing changes nothing but the clip source;
 * - (integration) with the switch on, the CMU walk / jog / run on a headless rig (tests/helpers/mocapMeasure.ts): planted
 *   feet locked (e2e-anim's < 1 cm), e2e-anim's anti-crab ranges per gait (BODY_GAIT / RUN_TUNE), the landed stride the
 *   game's and the clip's stride scaled within 10 %, the gaze level, no bone turning past the bible's 25 deg a frame
 *   across the walk / jog / run blend, the clip feet / planner hand-offs (turns, starts, stops) and the slots;
 * - a different clip in the mocap set reaches the rig only with the switch on (the switch is live);
 * - clip feet (A3): a clip with a `feet` channel places the steps, the planner pins them (no slide) and the planted foot
 *   stays on the clip's target through the stance (the stride scaled to the game's);
 * - toggling at run time, the slots and the clip feet leave no allocation per frame.
 */
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { applyMocapSwitch, hasSlots, HAND_KEYED_SET, LOCO, MOCAP_FEET, MOCAP_LAYERS, MOCAP_SET, MocapSlots, mocapWanted, setMocapLocomotion, type LocoClipSet } from '../src/anim/mocap';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { KEYED_RUN } from '../src/anim/clips/keyed/run';
import { MOCAP_WALK } from '../src/anim/clips/mocap/walk';
import { MOCAP_JOG } from '../src/anim/clips/mocap/jog';
import { MOCAP_RUN } from '../src/anim/clips/mocap/run';
import { driveRig, gaitNumbers, GAIT_RANGES, plantSlide, pops, POP_DEG, steady, type GaitName, type Plan, type Rec } from './helpers/mocapMeasure';
import { KEYED_FEET, KEYED_FEET_SIDE, KF, keyedClip, newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { FootPlanner, emptyPlannerInput, type ClipFeetIn } from '../src/anim/footPlanner';
import { proportions } from '../src/player/proportions';
import { defaultSettings, sanitizeSettings } from '../src/core/settings';
import { flags, onOffFlag } from '../src/core/flags';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';
import type { CharacterRig, RigPose } from '../src/player/characterRig';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const SET = MOCAP_SET as Mutable<LocoClipSet>;
const SAVED: LocoClipSet = { ...MOCAP_SET };
const SAVED_LAYERS = { ...MOCAP_LAYERS };
const SAVED_FEET = { ...MOCAP_FEET };

/**
 * The placeholder set: the hand-keyed walk / jog / run, no slot, every layer scale 1 and the foot pitch rate unbounded
 * (the plumbing's neutral settings: the proofs below show the switch's path itself changes nothing but the clip source).
 */
function placeholders(): void {
  Object.assign(SET, { walk: KEYED_WALK, jog: KEYED_JOG, run: KEYED_RUN, turnInPlace: null, turnMoveL: null, turnMoveR: null, start: null, stop: null });
  Object.assign(SET, { crouchWalk: null, sprint: null }); // (mocap-trial-2, crouch) the crouched sneak stays hand-keyed
  for (const k of Object.keys(MOCAP_LAYERS) as (keyof typeof MOCAP_LAYERS)[]) MOCAP_LAYERS[k] = 1;
  MOCAP_FEET.pitchRate = Number.POSITIVE_INFINITY;
}

afterEach(() => {
  Object.assign(SET, SAVED);
  Object.assign(MOCAP_LAYERS, SAVED_LAYERS);
  Object.assign(MOCAP_FEET, SAVED_FEET);
  setMocapLocomotion(false);
});

/** A copy of a keyed clip under a new name, with a synthetic `feet` channel (stride `S`, 1.75 m units) when given. */
function withFeet(c: KeyedClip, name: string, S: number | null): KeyedClip {
  const N = c.frames;
  const feet: number[] = [];
  const sm = (t: number): number => t * t * (3 - 2 * t);
  for (let f = 0; f < N; f++) {
    for (let side = 0; side < 2; side++) {
      const p = (((f / N - side * 0.5) % 1) + 1) % 1;
      const d = c.duty;
      const st = p < d;
      const u = st ? 0 : (p - d) / (1 - d);
      const z = S === null ? 0 : st ? (S * d) / 2 - S * p : (-S * d) / 2 + S * d * sm(u);
      feet.push(side === 0 ? -0.09 : 0.09, st ? 0 : 0.08 * Math.sin(Math.PI * u), z, st ? 0.1 * (p / d) : 0, st ? 1 : 0);
    }
  }
  return keyedClip({
    name,
    frames: N,
    duty: c.duty,
    liftH: c.liftH,
    kneeOut: c.kneeOut,
    half: c.half,
    pel: Array.from(c.pel),
    q: Array.from(c.q),
    arm: Array.from(c.arm),
    ...(S === null ? {} : { feet, stride: S }),
  });
}

describe('mocap switch: default and selection', () => {
  it('is on by default (mocap-trial-2, M4): the setting, the URL flag (absent in node); the live state off until applied', () => {
    expect(defaultSettings().gameplay.mocapLoco).toBe(true);
    // a save from before the setting (no field) and a broken value load the default (on)
    expect(sanitizeSettings({ gameplay: { courseMarkers: false } }).gameplay.mocapLoco).toBe(true);
    expect(sanitizeSettings({ mocapV: 1, gameplay: { mocapLoco: 'yes' } }).gameplay.mocapLoco).toBe(true);
    expect(flags.mocap).toBeNull();
    // the pure module starts on the hand-keyed set; the app applies the setting at boot
    expect(LOCO.mocap).toBe(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
    expect(applyMocapSwitch(flags.mocap, defaultSettings().gameplay.mocapLoco)).toBe(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(applyMocapSwitch(flags.mocap, false)).toBe(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
  });

  it('?mocap=1 and the stored setting select the mocap set; ?mocap=0 wins over the setting', () => {
    const url = (q: string): boolean | null => onOffFlag(new URLSearchParams(q).get('mocap'));
    expect(url('?mocap=1')).toBe(true);
    expect(url('?mocap=0')).toBe(false);
    expect(url('?mocap=yes')).toBeNull();
    expect(url('?autostart=ctcourse')).toBeNull();
    expect(sanitizeSettings({ gameplay: { mocapLoco: true } }).gameplay.mocapLoco).toBe(true);
    expect(mocapWanted(true, false)).toBe(true);
    expect(mocapWanted(null, true)).toBe(true);
    expect(mocapWanted(false, true)).toBe(false);
    expect(applyMocapSwitch(url('?mocap=1'), false)).toBe(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(LOCO.mocap).toBe(true);
    expect(applyMocapSwitch(null, false)).toBe(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
    expect(applyMocapSwitch(null, true)).toBe(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(applyMocapSwitch(url('?mocap=0'), true)).toBe(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
  });

  it('the mocap files are the CMU clips: walk / jog / run with clip feet, the slots filled, the layers tuned', () => {
    expect(MOCAP_SET.walk).toBe(MOCAP_WALK);
    expect(MOCAP_SET.jog).toBe(MOCAP_JOG);
    expect(MOCAP_SET.run).toBe(MOCAP_RUN);
    const gaits = [MOCAP_WALK, MOCAP_JOG, MOCAP_RUN];
    expect(gaits.map((c) => c.name)).toEqual(['mocap_walk', 'mocap_jog', 'mocap_run']);
    for (const c of gaits) {
      expect(c.feet, c.name).not.toBeNull();
      expect(c.stride).toBeGreaterThan(0);
    }
    // the stance window is the clip's own (the ankle-pinned share of the take's contact), shorter as the pace rises
    expect(MOCAP_WALK.duty).toBeGreaterThan(MOCAP_JOG.duty);
    expect(MOCAP_JOG.duty).toBeGreaterThan(MOCAP_RUN.duty);
    // liftH keeps its meaning (the planner's own swing lift, read only for the steps the planner places): the hand-keyed values
    expect([MOCAP_WALK.liftH, MOCAP_JOG.liftH, MOCAP_RUN.liftH]).toEqual([KEYED_WALK.liftH, KEYED_JOG.liftH, KEYED_RUN.liftH]);
    // the head written; the wrist, forearm, shoulder, clavicle and finger channels absent (CMU's hands are noise): sampled
    // they read as not keyed, so the rig keeps its own hands (as under the hand-keyed walk, which keys none of them either)
    const pose = newKeyedPose();
    for (const c of gaits) {
      expect(c.head, c.name).not.toBeNull();
      expect([c.wrist, c.fore, c.sh, c.clav, c.fing]).toEqual([null, null, null, null, null]);
      sampleKeyed(c, 0.3, 1, pose);
      expect([pose.hasHead, pose.hasWrist, pose.hasFore, pose.hasSh, pose.hasClav, pose.hasFing]).toEqual([1, 0, 0, 0, 0, 0]);
    }
    expect(MOCAP_SET.turnInPlace).not.toBeNull();
    expect(MOCAP_SET.turnMoveL).not.toBeNull();
    expect(MOCAP_SET.turnMoveR).not.toBeNull();
    expect(MOCAP_SET.start).not.toBeNull();
    expect(MOCAP_SET.stop).not.toBeNull();
    expect(MOCAP_SET.startSeconds).toBeGreaterThan(1);
    expect(MOCAP_SET.stopSeconds).toBeGreaterThan(1);
    expect(hasSlots(MOCAP_SET)).toBe(true);
    expect(hasSlots(HAND_KEYED_SET)).toBe(false);
    // every layer that doubles the capture off on the mocap share (N2's arm gain, trunk swing, sway, head follow and nod
    // too); N2's two limiters (arm speed cap, keyed pelvis rate) and N1's turn steps kept
    // (afp-af2) the run carriage layers on (pelvis height, trunk means, the turn bank, the arm follower)
    expect(MOCAP_LAYERS).toEqual({ armSwing: 0, trunkTwist: 0, keyLean: 0, pelvisFollow: 0, weightLoad: 0, elbowOut: 0, stopSettle: 0, motionArmGain: 0, motionTrunk: 0, motionSway: 0, motionHead: 0, motionNod: 0, motionArmCap: 1, keyPelRate: 1, turnStep: 1, pelHeight: 0, trunkMean: 0, bankWipe: 0, armSmooth: 0 });
  });
});

/** Every pre-T3 rig joint's world matrix, every step, of a holstered free-gait sequence (the switch's own path). */
async function holsteredRun(check?: (rig: CharacterRig, k: number) => void): Promise<number[]> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { rigNodes } = await import('../src/operators/runtime/figure');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const random = Math.random;
  let seed = 777;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const out: number[] = [];
  try {
    const op = operatorRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 'mocap');
    const rig = op.rig;
    // (a carrier with nothing in hand: the player's holstered free gait, as player.ts sets it)
    rig.carrier = true;
    const nodes = rigNodes(rig).slice(0, 21);
    const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
    const DT = 1 / 60;
    for (let k = 0; k < 330; k++) {
      // still, walk, jog, run with a turn, back to a walk, a stop
      const speed = k < 20 ? 0 : k < 120 ? 1.4 : k < 180 ? 3.0 : k < 240 ? 4.4 : k < 290 ? 1.6 : 0;
      const yaw = k >= 180 && k < 240 ? (k - 180) * 0.012 : k >= 240 ? 0.72 : 0;
      rig.root.rotation.y = yaw;
      rig.root.position.x += Math.sin(yaw) * speed * DT;
      rig.root.position.z += Math.cos(yaw) * speed * DT;
      p.speed = speed;
      p.localZ = speed > 0 ? 1 : 0;
      p.stride = 'facing';
      rig.animate(DT, p);
      check?.(rig, k);
      for (const n of nodes) {
        const m = n.computeWorldMatrix(true).m;
        for (let i = 0; i < 16; i++) out.push(m[i]! === 0 ? 0 : m[i]!);
      }
    }
    op.figure.dispose();
    rig.dispose();
  } finally {
    Math.random = random;
    scene.dispose();
  }
  return out;
}

describe('mocap switch: the plumbing changes nothing but the clip source', () => {
  it('switch ON with the placeholders: the anim-skeleton identity capture equals its fixture', async () => {
    const FIXTURE = 'tests/fixtures/anim-skeleton-identity.json';
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as IdentityFixture;
    placeholders();
    setMocapLocomotion(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    const got = await runIdentity();
    for (const id of Object.keys(want)) {
      expect(got[id], `${id} still runs`).toBeDefined();
      expect(got[id]!.rig, `${id} rig`).toBe(want[id]!.rig);
      expect(got[id]!.poser, `${id} poser`).toEqual(want[id]!.poser);
    }
  }, 120_000);

  it('switch ON with the placeholders: the holstered walk / jog / run / turn / stop is bit-identical to OFF', async () => {
    let keyed = 0;
    let mocapShare = 0;
    placeholders();
    setMocapLocomotion(false);
    const off = await holsteredRun((rig) => {
      if (rig.graph.out.keyHol > 0.9 && rig.graph.out.keyW > 0.9) keyed++;
      expect(rig.graph.out.keyMocap).toBe(0);
    });
    setMocapLocomotion(true);
    const on = await holsteredRun((rig) => {
      mocapShare = Math.max(mocapShare, rig.graph.out.keyMocap);
      expect(rig.graph.out.clipFeet.valid).toBe(false);
    });
    // the sequence does take the holstered keyed set (the path the switch changes), and with the switch on it is the
    // mocap set's share
    expect(keyed).toBeGreaterThan(200);
    expect(mocapShare).toBeGreaterThan(0.9);
    expect(on.length).toBe(off.length);
    let diff = 0;
    for (let i = 0; i < on.length; i++) if (!Object.is(on[i], off[i])) diff++;
    expect(diff).toBe(0);
  }, 60_000);

  it('a different clip in the mocap set reaches the rig only with the switch on', async () => {
    SET.walk = KEYED_RUN;
    SET.jog = KEYED_RUN;
    setMocapLocomotion(false);
    const off = await holsteredRun();
    Object.assign(SET, SAVED);
    const base = await holsteredRun();
    expect(off).toEqual(base);
    SET.walk = KEYED_RUN;
    SET.jog = KEYED_RUN;
    setMocapLocomotion(true);
    const on = await holsteredRun();
    let diff = 0;
    for (let i = 0; i < on.length; i++) if (Math.abs(on[i]! - off[i]!) > 1e-6) diff++;
    expect(diff).toBeGreaterThan(1000);
  }, 60_000);
});

describe('mocap switch: clip feet (A3)', () => {
  it('the planner pins the clip steps: no slide, the planted foot on the clip target through its stance', () => {
    // a straight walk at 1.4 m/s on a 1.3 m (1.75 m units) clip stride: the graph's scaling done by hand here
    const P = new FootPlanner();
    const i = emptyPlannerInput();
    const clip = withFeet(KEYED_WALK, 'feet_walk', 1.3);
    const pose = newKeyedPose();
    const C: ClipFeetIn = { on: true, f: new Float64Array(KEYED_FEET) };
    i.clipFeet = C;
    i.stride = 'facing';
    i.duty = clip.duty;
    const v = 1.4;
    const cycle = 1.1;
    i.cycleTime = cycle;
    const zk = (v * cycle) / clip.stride;
    const dt = 1 / 120;
    let ph = 0;
    let owned = 0;
    let maxOff = 0;
    let landings = 0;
    for (let k = 0; k < 1200; k++) {
      i.dt = dt;
      i.rootZ += v * dt;
      i.velZ = v;
      ph = (ph + dt / cycle) % 1;
      i.phase = ph;
      i.moving = true;
      // (the graph's job: sample the clip through the real sampler, scale it)
      const sp = pose;
      sampleKeyed(clip, ph, 1, sp);
      for (let o = 0; o < KEYED_FEET; o += KEYED_FEET_SIDE) {
        C.f[o + KF.x] = sp.feet[o + KF.x]!;
        C.f[o + KF.y] = sp.feet[o + KF.y]!;
        C.f[o + KF.z] = sp.feet[o + KF.z]! * zk;
        C.f[o + KF.pitch] = sp.feet[o + KF.pitch]!;
        C.f[o + KF.contact] = sp.feet[o + KF.contact]!;
      }
      P.update(i);
      for (let side = 0; side < 2; side++) {
        const f = side === 0 ? P.L : P.R;
        if (f.clipOwn) owned++;
        if (f.landed) landings++;
        // after the first two cycles: a planted foot is on its clip target (relative to the root) within 1.5 cm
        if (k > 300 && f.contact) {
          const o = side * KEYED_FEET_SIDE;
          const tz = i.rootZ + C.f[o + KF.z]!;
          const tx = i.rootX + C.f[o + KF.x]!;
          maxOff = Math.max(maxOff, Math.hypot(f.x - tx, f.z - tz));
        }
        expect(f.slide).toBe(0);
      }
    }
    expect(owned).toBeGreaterThan(300);
    expect(landings).toBeGreaterThan(15);
    expect(maxOff).toBeLessThan(0.015);
  });

  it('on the rig: a mocap clip with feet takes the steps (switch on), the planner keeps them (switch off)', async () => {
    const fw = withFeet(KEYED_WALK, 'feet_walk', 1.3);
    const fj = withFeet(KEYED_JOG, 'feet_jog', 1.9);
    const fr = withFeet(KEYED_RUN, 'feet_run', 2.4);
    SET.walk = fw;
    SET.jog = fj;
    SET.run = fr;
    let ownedOff = 0;
    setMocapLocomotion(false);
    await holsteredRun((rig) => {
      if (rig.planner.L.clipOwn || rig.planner.R.clipOwn) ownedOff++;
    });
    expect(ownedOff).toBe(0);
    let owned = 0;
    let on = 0;
    let slide = 0;
    setMocapLocomotion(true);
    await holsteredRun((rig) => {
      if (rig.planner.L.clipOwn || rig.planner.R.clipOwn) owned++;
      if (rig.graph.out.clipFeet.on) on++;
      slide = Math.max(slide, rig.planner.L.slide, rig.planner.R.slide);
    });
    expect(on).toBeGreaterThan(100);
    expect(owned).toBeGreaterThan(50);
    expect(slide).toBe(0);
  }, 60_000);
});

/** The integration's paces: the brief's walk / jog / run, then e2e-anim's own (walk gear 4 at half stick, jog gear 4). */
const GAITS: [GaitName, number][] = [['walk', 1.4], ['jog', 2.5], ['run', 4.0], ['walk', 1.5], ['jog', 3.0]];
const f1 = (v: number, d = 1): string => v.toFixed(d);
/**
 * (fix 1) Walking at `v` m/s, turning `yr` rad/s for 1.2 s left then right every 2.5 s (Course Ready's sweep); (mt2-pop1,
 * CHECK-2) the turns starting `off` s later (another gait phase at the turn's start and end).
 */
const sweepTurn = (v: number, yr: number, off = 0): Plan => (_k, t) => {
  const u = t - off;
  return { speed: v, yawRate: t > 2 + off && ((u % 2.5) + 2.5) % 2.5 < 1.2 ? (((u % 5) + 5) % 5 < 2.5 ? yr : -yr) : 0, rec: t > 1.5 };
};
/** (mt2-pop1, CHECK-2) Walking at `v` m/s, turning `yr` rad/s for 0.8 s then ramping down to 0 over `ramp` s, every 3 s, left then right. */
const rampTurn = (v: number, yr: number, ramp: number): Plan => (_k, t) => {
  if (t < 2) return { speed: v, yawRate: 0, rec: t > 1.5 };
  const u = (t - 2) % 3;
  const r = u < 0.8 ? yr : u < 0.8 + ramp ? yr * (1 - (u - 0.8) / ramp) : 0;
  return { speed: v, yawRate: (t - 2) % 6 < 3 ? r : -r, rec: t > 1.5 };
};
/** (fix 1) The pelvis's largest move in one frame beyond what the pace carries it (m). */
function pelvisStep(R: Rec): number {
  const h = R.pos.hips;
  let m = 0;
  for (let f = 1; f < R.n; f++) {
    const d = Math.hypot(h[f * 3]! - h[(f - 1) * 3]!, h[f * 3 + 1]! - h[(f - 1) * 3 + 1]!, h[f * 3 + 2]! - h[(f - 1) * 3 + 2]!);
    m = Math.max(m, d - R.speed[f]! / 60);
  }
  return m;
}

describe('mocap switch: the CMU clips on the rig (integration)', () => {
  it('walk / jog / run: feet locked, inside the e2e-anim crab ranges, the game stride, a level gaze, no pops', async () => {
    const rows: string[] = [];
    for (const [g, v] of GAITS) {
      const C = GAIT_RANGES[g];
      for (const on of [false, true]) {
        setMocapLocomotion(on);
        const [n, plan] = steady(v);
        const m = gaitNumbers(await driveRig(n, plan), C);
        rows.push(
          `${g} ${v} ${on ? 'on ' : 'off'}: knees ${m.knee.map((x) => f1(x, 2)).join('/')}, track ${f1(m.track[0] * 100)}..${f1(m.track[1] * 100)} cm, knee-out ${f1(m.bow * 100)} cm, slide ${f1(m.slide * 100, 2)} cm (${m.plants} plants), elbows ${f1(m.wing * 100)} cm | pelvis / shoulder yaw ${f1(m.pelvisYawP2P)} / ${f1(m.shoulderYawP2P)} deg, sway ${f1(m.swayP2P * 100)} cm, bob ${f1(m.bobP2P * 100)} cm, wrist swing ${f1(m.wristSwing * 100)} cm | stride ${f1(m.stride, 3)} m (game ${f1(m.gameStride, 3)}), clip scale ${f1(m.clipScale, 3)} | gaze ${f1(m.gaze)} deg | bone step ${f1(m.maxStepDeg)} deg`,
        );
        if (!on) continue;
        const at = `${g} at ${v} m/s`;
        // the mocap set drives it: its share and its clip feet all the way
        expect(m.share, at).toBeGreaterThan(0.99);
        expect(m.clipOn, at).toBeGreaterThan(0.99);
        // planted feet locked (e2e-anim foot locking, < 1 cm; mt2-fixF: read as e2e-anim reads it, the clip's anchored plants
        // at the heel / ball, gaitNumbers) and e2e-anim's anti-crab ranges for the gait
        expect(m.plants, at).toBeGreaterThanOrEqual(3);
        expect(m.slide, `${at}: slide`).toBeLessThan(C.slide);
        expect(m.pinErr, `${at}: planted ankle on its pin`).toBeLessThan(0.005);
        expect(m.out, at).toEqual([]);
        // the landed stride is the game's; the clip's own stride scaled within 10 % to reach it
        expect(Math.abs(m.strideRatio - 1), `${at}: landed stride`).toBeLessThan(0.01);
        expect(Math.abs(m.clipScale - 1), `${at}: clip stride scale`).toBeLessThanOrEqual(0.1);
        // the head looks ahead (the takes' look at the floor is taken out), and nothing pops
        expect(Math.abs(m.gaze), `${at}: gaze`).toBeLessThan(5);
        expect(m.maxStepDeg, `${at}: bone step`).toBeLessThan(POP_DEG);
      }
    }
    console.info(rows.join(String.fromCharCode(10)));
  }, 120_000);

  it('no pops across the walk / jog / run blend, the clip feet hand-offs (turns, starts, stops) and the slots', async () => {
    const PLANS: [string, number, Plan][] = [
      // the speed blend's edges, slowly both ways (walk -> jog 2.0-2.6, jog -> run 3.2-3.8 effort pace)
      ['blend ramp', 60 * 18, (_k, t) => ({ speed: t < 1 ? 1.2 : t < 9 ? 1.2 + (3.2 * (t - 1)) / 8 : t < 17 ? 4.4 - (3.2 * (t - 9)) / 8 : 1.2, yawRate: 0, rec: t > 0.8 })],
      // steering at a run and a jog: the clip feet hand the steps to the planner and back
      ['run steering', 60 * 10, (_k, t) => ({ speed: 4.0, yawRate: t > 2 && t % 1 < 0.5 ? 2.0 : 0, rec: t > 1.5 })],
      ['jog steering', 60 * 10, (_k, t) => ({ speed: 2.8, yawRate: t > 2 && t % 1.2 < 0.6 ? (t % 2.4 < 1.2 ? 1.6 : -1.6) : 0, rec: t > 1.5 })],
      // 90 deg turns on the walk (the turn slots) and starts / stops (the start / stop slots, the planner at rest)
      ['walk 90 turns', 60 * 10, (_k, t) => ({ speed: 1.4, yawRate: t > 2 && t % 1.5 < 0.393 ? (t % 3 < 1.5 ? 4 : -4) : 0, rec: t > 1.5 })],
      ['starts and stops', 60 * 12, (_k, t) => ({ speed: t % 4 < 1.5 ? 0 : 1.4, yawRate: 0, rec: t > 1 })],
      // 90 deg turns on the spot (the turn-in-place slot)
      ['spot turns', 60 * 8, (_k, t) => ({ speed: 0, yawRate: t > 1.5 && t % 1 < 0.26 ? 6 : 0, rec: t > 1 })],
      // (fix 1, CHECK required 1 / 1b) walking turns past turnMax: the clip feet hand the steps to the planner and back
      // (the planner's lift re-planted by clipFoot, the raised heel snapped down at the hand-back: pelvis 4-8 cm a frame)
      ['walk 1.4 turning 2.5 rad/s', 60 * 12, sweepTurn(1.4, 2.5)],
      ['walk 1.4 turning 4 rad/s', 60 * 12, sweepTurn(1.4, 4)],
      ['walk 2.0 turning 1.5 rad/s', 60 * 12, sweepTurn(2.0, 1.5)],
      ['walk 2.0 turning 2.5 rad/s', 60 * 12, sweepTurn(2.0, 2.5)],
      // (mt2-pop1, CHECK-2 required 1) the fast walk turns at other turn-start offsets and with ramped ends: the turn slot
      // fading out mid-turn while the trailing planted foot was held at its reach (the other foot's swing landing only at
      // phase 0.50) sank the pelvis 9-12 cm in ~6 frames (2.0 x 4 rad/s 2.06 cm a frame beyond pace x dt at offset 0.37,
      // 2.25 with a ramped end; 2.0 x 3.5 at 0.37 2.04)
      ['walk 2.0 turning 4 rad/s', 60 * 12, sweepTurn(2.0, 4)],
      ['walk 1.4 turning 2.5 rad/s, offset 0.37', 60 * 12, sweepTurn(1.4, 2.5, 0.37)],
      ['walk 1.4 turning 2.5 rad/s, offset 0.71', 60 * 12, sweepTurn(1.4, 2.5, 0.71)],
      ['walk 1.4 turning 4 rad/s, offset 0.37', 60 * 12, sweepTurn(1.4, 4, 0.37)],
      ['walk 1.4 turning 4 rad/s, offset 0.71', 60 * 12, sweepTurn(1.4, 4, 0.71)],
      ['walk 2.0 turning 2.5 rad/s, offset 0.37', 60 * 12, sweepTurn(2.0, 2.5, 0.37)],
      ['walk 2.0 turning 2.5 rad/s, offset 0.71', 60 * 12, sweepTurn(2.0, 2.5, 0.71)],
      ['walk 2.0 turning 3 rad/s, offset 0.37', 60 * 12, sweepTurn(2.0, 3, 0.37)],
      ['walk 2.0 turning 3.5 rad/s, offset 0.37', 60 * 12, sweepTurn(2.0, 3.5, 0.37)],
      ['walk 2.0 turning 3.5 rad/s, offset 0.71', 60 * 12, sweepTurn(2.0, 3.5, 0.71)],
      ['walk 2.0 turning 4 rad/s, offset 0.37', 60 * 12, sweepTurn(2.0, 4, 0.37)],
      ['walk 2.0 turning 4 rad/s, offset 0.71', 60 * 12, sweepTurn(2.0, 4, 0.71)],
      ['walk 1.4 turning 4 rad/s, ramped end 0.25 s', 60 * 14, rampTurn(1.4, 4, 0.25)],
      ['walk 1.4 turning 4 rad/s, ramped end 0.5 s', 60 * 14, rampTurn(1.4, 4, 0.5)],
      ['walk 2.0 turning 3 rad/s, ramped end 0.25 s', 60 * 14, rampTurn(2.0, 3, 0.25)],
      ['walk 2.0 turning 4 rad/s, ramped end 0.25 s', 60 * 14, rampTurn(2.0, 4, 0.25)],
      ['walk 2.0 turning 4 rad/s, ramped end 0.5 s', 60 * 14, rampTurn(2.0, 4, 0.5)],
      // (fix 1, CHECK required 2) a start's first clip swing lifted from the planner's pitch (the ankle-toe bone 26 deg)
      ['starts, the first clip swing', 60 * 16, (_k, t) => ({ speed: t % 4 < 1.5 ? 0 : 1.4, yawRate: 0, rec: t > 1 })],
    ];
    const rows: string[] = [];
    for (const [name, n, plan] of PLANS) {
      setMocapLocomotion(false);
      const off = pops(await driveRig(n, plan));
      setMocapLocomotion(true);
      let slide = 0;
      const R = await driveRig(n, plan, (rig) => {
        slide = Math.max(slide, rig.planner.L.slide, rig.planner.R.slide);
      });
      const on = pops(R);
      // (N1 merge) planted feet as e2e-anim reads them (metrics.ts footSlide): a plant the planner anchors (N1's held contact,
      // the ankle rolls / pivots round the heel or ball by design: the turn hand-offs, the starts and stops) at its contact
      // points; (mt2-fixF) the clip's own plants are anchored too now (their ankle travels with the clip's heel-to-toe roll),
      // so they read at the contact as well; an unanchored plant at the ankle. Limit kept
      const ankleSlide = plantSlide(R, 0.01);
      const pel = pelvisStep(R);
      rows.push(`${name}: largest bone turn a frame off ${f1(off.maxStepDeg)} deg (${off.bone}), on ${f1(on.maxStepDeg)} deg (${on.bone}); joint jerk off ${f1(off.maxJerk * 100)}, on ${f1(on.maxJerk * 100)} cm/frame2; planted ankle slide on ${f1(ankleSlide * 100, 2)} cm; pelvis beyond pace x dt on ${f1(pel * 100, 2)} cm`);
      // (N1 merge) a pop the switch adds: under POP_DEG, or where master's own planner already passes it (the spot turns:
      // N1's ball pivot, 29.6 deg OFF, ankleR-toeR) no worse than master's
      expect(on.maxStepDeg, `${name}: bone step`).toBeLessThan(Math.max(POP_DEG, off.maxStepDeg + 0.5));
      // (fix 1) the pelvis moves no more than the pace carries it plus 2 cm a frame (bible 5.12.2)
      expect(pel, `${name}: pelvis step beyond pace x dt`).toBeLessThanOrEqual(0.02);
      // (the sustained turns: 1 cm, the clip's swing knee after a hand-back; walk 2.0 turning 1.5 on 16.9 vs off 16.4 cm,
      // 30.1 before fix 1)
      expect(on.maxJerk, `${name}: jerk no worse than the hand-keyed set`).toBeLessThanOrEqual(off.maxJerk + (name.includes(' turning ') ? 0.01 : 0.005));
      expect(slide, `${name}: planner slide`).toBe(0);
      // (the sustained turns scrub the planted feet round with the hips by design, G1's stance band: OFF scrubs 7-49 cm there)
      if (!name.includes(' turning ')) expect(ankleSlide, `${name}: planted ankle slide`).toBeLessThan(0.01);
    }
    console.info(rows.join(String.fromCharCode(10)));
  }, 120_000);

  it('N2 body motion on the mocap share: the additive parts off (MOCAP_LAYERS), the arm speed cap kept', async () => {
    // (N2 merge, M1) the trunk swing, sway, head follow and nod are the capture's own on the full mocap share; with the
    // switch off the same walk runs the layer
    const plan: Plan = (_k, t) => ({ speed: 1.4, yawRate: 0, rec: t > 1.5 });
    const F = ['hipYaw', 'chestYaw', 'pelX', 'headFollow', 'headPitch'] as const;
    // the switch off: the layer's amplitudes on this walk
    const offMax = [0, 0, 0, 0, 0];
    await driveRig(60 * 4, plan, (rig) => {
      const m = rig.graph.out.motion;
      F.forEach((k, j) => (offMax[j] = Math.max(offMax[j]!, Math.abs(m[k]))));
    });
    for (const v of offMax) expect(v).toBeGreaterThan(0);
    // the switch on: each part only on the share that is not the capture's (1 - keyMocap)
    let mostly = 0;
    let cap = 0;
    setMocapLocomotion(true);
    await driveRig(60 * 4, plan, (rig) => {
      const o = rig.graph.out;
      if (o.keyMocap < 0.9) return;
      mostly++;
      expect(o.motion.w).toBeGreaterThan(0);
      F.forEach((k, j) => expect(Math.abs(o.motion[k]), k).toBeLessThanOrEqual((1 - o.keyMocap) * offMax[j]! * 1.0001 + 1e-12));
      if (Number.isFinite(o.motion.armSpeed)) cap++;
    });
    expect(mostly).toBeGreaterThan(100);
    expect(cap).toBe(mostly);
    // the arm gain: the mocap walk's arms as sampled with the gain's layer at 1 differ (KEY_MOTION walk 1.3), at 0 not
    setMocapLocomotion(true);
    const wrist = async (): Promise<number[]> => (await driveRig(60 * 3, (_k, t) => ({ speed: 1.4, yawRate: 0, rec: t > 2 }))).pos.wristL;
    const base = await wrist();
    MOCAP_LAYERS.motionArmGain = 1;
    const gained = await wrist();
    let d = 0;
    for (let i = 0; i < base.length; i++) d = Math.max(d, Math.abs(base[i]! - gained[i]!));
    expect(d).toBeGreaterThan(0.005);
  }, 60_000);
});

describe('mocap switch: slots', () => {
  it('a filled start / stop / turn plays its clip over the gait and fades back out', () => {
    SET.start = KEYED_JOG;
    SET.stop = KEYED_RUN;
    SET.turnMoveR = KEYED_JOG;
    SET.turnInPlace = KEYED_RUN;
    // (the timing below is a 0.6 s start / stop; the real clips play their takes' 1.95 / 2.1 s)
    SET.startSeconds = 0.6;
    SET.stopSeconds = 0.6;
    setMocapLocomotion(true);
    expect(LOCO.slots).toBe(true);
    const m = new MocapSlots();
    const dt = 1 / 60;
    // a start from rest
    m.update(dt, MOCAP_SET, 0, 0, 0);
    for (let k = 0; k < 10; k++) m.update(dt, MOCAP_SET, 0.5, 1, 0);
    expect(m.startT).toBeGreaterThan(0);
    expect(m.wStart).toBeGreaterThan(0.3);
    for (let k = 0; k < 60; k++) m.update(dt, MOCAP_SET, 1.4, 0, 0);
    expect(m.startT).toBe(-1);
    expect(m.wStart).toBe(0);
    // a stop: hard braking from a walk
    for (let k = 0; k < 10; k++) m.update(dt, MOCAP_SET, 1.2, -4, 0);
    expect(m.stopT).toBeGreaterThan(0);
    // a 90 deg turn to the right on the move: 90 deg of yaw is the whole clip
    m.reset();
    let turned = 0;
    let peak = 0;
    let endedAt = -1;
    for (let k = 0; k < 60 && endedAt < 0; k++) {
      const was = m.turnT;
      m.update(dt, MOCAP_SET, 1.4, 0, 4);
      if (was >= 0) turned += 4 * dt;
      if (was >= 0 && m.turnT < 0) endedAt = turned;
      peak = Math.max(peak, m.wTurn);
      if (m.turnT >= 0) {
        expect(m.turnSpot).toBe(false);
        expect(m.turnSide).toBe(1);
      }
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(Math.abs(endedAt - Math.PI / 2)).toBeLessThanOrEqual(4 * dt + 1e-9);
    // (integration) the filled slots are walking takes: a start into a run is cut off, braking from a run never plays the
    // walking stop (not even as the pace falls through a walk), a turn at a run never plays the walking turn
    m.reset();
    m.update(dt, MOCAP_SET, 0, 0, 0);
    m.update(dt, MOCAP_SET, 0.5, 20, 0);
    expect(m.startT).toBeGreaterThan(0);
    m.update(dt, MOCAP_SET, 4.0, 20, 0);
    expect(m.startT).toBe(-1);
    for (let k = 0; k < 20; k++) m.update(dt, MOCAP_SET, 4.0 - k * 0.2, -12, 0);
    expect(m.stopT).toBe(-1);
    for (let k = 0; k < 30; k++) m.update(dt, MOCAP_SET, 4.0, 0, 4);
    expect(m.turnT).toBe(-1);
    expect(m.wTurn).toBe(0);
    // the pose: a slot at full weight is its clip's
    const pose = newKeyedPose();
    const tmp = newKeyedPose();
    const v = { half: 0.05, kneeOut: 0, duty: 0.5, lift: 0.07 };
    m.wStart = 1;
    m.startP = 0.5;
    m.wStop = 0;
    m.wTurn = 0;
    const share = m.apply(MOCAP_SET, pose, tmp, v);
    expect(share).toBe(1);
    expect(v.duty).toBeCloseTo(KEYED_JOG.duty, 9);
  });
});

describe('mocap switch: no allocation per frame', () => {
  it('the graph with the switch off, on (placeholders), on with slots and clip feet filled, and toggled every frame', async () => {
    const g = new AnimGraph(proportions('average', 1.68));
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.armed = false;
    const N = 2000;
    const SPD = inputs(N, (k) => 1.2 + 2.5 * (0.5 + 0.5 * Math.sin(k * 0.004)));
    const YR = inputs(N, (k) => (k % 400 < 40 ? 3 : 0));
    const AF = inputs(N, (k) => (k % 300 < 20 ? -4 : 0.5));
    const run = (toggle: boolean) => (n: number): void => {
      for (let k = 0; k < n; k++) {
        i.speed = SPD[k]!;
        i.localZ = 1;
        i.yawRate = YR[k]!;
        i.accelFwd = AF[k]!;
        if (toggle) setMocapLocomotion((k & 1) === 0);
        g.update(1 / 120, i);
      }
    };
    setMocapLocomotion(false);
    const off = await bytesPerCall(run(false), 2 * HEAP_NUMBER);
    placeholders();
    setMocapLocomotion(true);
    const on = await bytesPerCall(run(false), off + HEAP_NUMBER);
    SET.walk = withFeet(KEYED_WALK, 'feet_walk', 1.3);
    SET.jog = withFeet(KEYED_JOG, 'feet_jog', 1.9);
    SET.run = withFeet(KEYED_RUN, 'feet_run', 2.4);
    SET.start = KEYED_JOG;
    SET.stop = KEYED_RUN;
    SET.turnMoveL = KEYED_JOG;
    SET.turnInPlace = KEYED_RUN;
    setMocapLocomotion(true);
    const filled = await bytesPerCall(run(false), off + 6 * HEAP_NUMBER);
    const toggled = await bytesPerCall(run(true), off + 6 * HEAP_NUMBER);
    console.info(`bytes per frame: off ${off.toFixed(1)}, on ${on.toFixed(1)}, filled ${filled.toFixed(1)}, toggled ${toggled.toFixed(1)}`);
    expect(g.out.keyW).toBeGreaterThan(0);
    // the placeholders: no more than a boxed double or two over the switch-off frame (one object a frame reads 48 B or
    // more). Filled (slots and clip feet), a frame samples up to three more clips, and each sampleKeyed call leaves its two
    // boxed doubles (32 B, tests/animSkeletonClip.test.ts): at most that over the switch-off frame
    expect(on).toBeLessThanOrEqual(off + 2 * HEAP_NUMBER);
    expect(filled).toBeLessThanOrEqual(off + 8 * HEAP_NUMBER);
    expect(toggled).toBeLessThanOrEqual(off + 8 * HEAP_NUMBER);
  }, 120_000);
});
