// (piano-knife S4b) The piano intro pose: the captured breath (introBreath), IntroPose on a real WallCore, the wire bit
// (WALL_SUB.intro 32 in the wall sub byte, the mirror's left hand) and the graph (both hands on the gun, the breath with
// no stillness gate).
import { beforeAll, describe, expect, it } from 'vitest';
import { BREATH_TAKE_S, INTRO_BREATH, INTRO_SIM, introBreath, introBreathClip, loadIntroBreath } from '../src/anim/introBreath';
import { IntroPose, type IntroPoseHost } from '../src/game/introPose';
import { WALL_SUB, WallCore, buildWallLinks, emptyWallInput } from '../src/player/wallController';
import { COVER_STANDOFF } from '../src/world/levelBuilder';
import type { CoverSegment } from '../src/cover/coverData';
import { emptyMovePose, emptyMoveState, packMoveState, poseFromMoveState, sanitizeMoveState, type MoveState } from '../src/player/moveState';
import { mocapSource } from '../src/anim/mocapSources';
import { tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { proportions } from '../src/player/proportions';
import { classWeight } from '../src/weapons/weaponCarry';
import { newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

describe('introBreath', () => {
  // the very first test in the file: nothing has started the clip's load yet
  it('stands in with a sine at the same cycle until the clip resolves', () => {
    expect(Math.abs(introBreath(1.0) - INTRO_BREATH.amp)).toBeLessThan(1e-9);
  });

  it('takes one breath of the captured Breathing Idle every cycle, periodic, centred, seamless, tunable, no allocation', async () => {
    await loadIntroBreath();
    expect(introBreathClip()!.name).toBe('mocap_breathing_idle');
    expect(BREATH_TAKE_S).toBe((mocapSource('mocap_breathing_idle')!.studio as { cycle: number }).cycle);
    expect(INTRO_BREATH.from).toBeGreaterThanOrEqual(0);
    expect(INTRO_BREATH.from + INTRO_BREATH.len).toBeLessThanOrEqual(BREATH_TAKE_S);
    const C = INTRO_BREATH.cycle;
    for (let t = 0; t <= 8 + 1e-9; t += 0.05) expect(Math.abs(introBreath(t) - introBreath(t + C)), `t ${t.toFixed(2)}`).toBeLessThan(1e-9);
    let sum = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < 200; k++) {
      const b = introBreath((k / 200) * C);
      sum += b;
      lo = Math.min(lo, b);
      hi = Math.max(hi, b);
    }
    const seam = Math.abs(introBreath(C - 1e-3) - introBreath(0));
    console.info(`(piano-knife S4b) intro breath: mean ${(sum / 200).toFixed(5)} rad, peak to peak ${(hi - lo).toFixed(4)} rad, seam ${seam.toFixed(4)} rad`);
    expect(Math.abs(sum / 200)).toBeLessThan(0.002);
    expect(hi - lo).toBeGreaterThan(0.01);
    expect(hi - lo).toBeLessThan(0.08);
    expect(seam).toBeLessThan(0.012);
    // the tuner's depth slider scales it
    const b0 = introBreath(0.7);
    expect(Math.abs(b0)).toBeGreaterThan(1e-4);
    tuneSet('intro.pose', 'breathGain', 2);
    try {
      expect(introBreath(0.7)).toBeCloseTo(2 * b0, 9);
    } finally {
      tuneResetAll();
    }
    expect(introBreath(0.7)).toBeCloseTo(b0, 12);
    // allocation: no more than the boxed double per call, on top of `sampleKeyed`'s own cost on the same clip (~32 B,
    // not this slice's; as killDrive.test.ts and the S2 knife move allow)
    const T = inputs(400, (i) => i * 0.01);
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0] = introBreath(T[i % 400]!);
    }, HEAP_NUMBER);
    const kc = introBreathClip()!;
    const kp = newKeyedPose();
    const P = inputs(400, (i) => i / 400);
    const perSample = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sampleKeyed(kc, P[i % 400]!, 1, kp, null);
    }, HEAP_NUMBER);
    console.info(`(piano-knife S4b) bytes per introBreath: ${per.toFixed(1)} (sampleKeyed alone ${perSample.toFixed(1)})`);
    expect(per).toBeLessThanOrEqual(perSample + HEAP_NUMBER);
  });
});

/** W1's face (the grain bins, face x 4.5, z 3 .. 7.5), the operator's side west (-x). */
const W1: CoverSegment = { ax: 4.5, az: 3, bx: 4.5, bz: 7.5, tx: 0, tz: 1, nx: -1, nz: 0, len: 4.5, y: 0, height: 2.8, low: false, depth: 2, nextA: -1, nextB: -1, id: 0, piece: 0 };

interface Fake {
  core: WallCore;
  host: IntroPoseHost;
  ctl: IntroPose;
  close: boolean[];
  locks: boolean[];
  holsters: { n: number };
  stance: { base: 'holstered' | 'lowReady'; holster(): void };
}

function fake(x: number, z: number): Fake {
  const core = new WallCore([W1], buildWallLinks([W1]), COVER_STANDOFF);
  const close: boolean[] = [];
  const locks: boolean[] = [];
  const holsters = { n: 0 };
  const stance = {
    base: 'holstered' as 'holstered' | 'lowReady',
    holster(): void {
      holsters.n++;
      this.base = 'holstered';
    },
  };
  const host: IntroPoseHost = {
    wall: () => core,
    player: { position: { x, y: 0, z }, alive: true, stance },
    pistol: () => ({ slideLock: (on: boolean) => void locks.push(on) }),
    closeUp: (on) => void close.push(on),
  };
  return { core, host, ctl: new IntroPose(host), close, locks, holsters, stance };
}

describe('IntroPose', () => {
  it('stand: holds the wall with the intro bit, low ready, the slide locked, the close-up; off leaves wall cover', () => {
    const f = fake(4.0, 4.6);
    expect(f.ctl.set(true, 'stand')).toBe(true);
    const w = f.core;
    expect(w.active).toBe(true);
    expect(w.seg).toBe(0);
    expect(w.sub() & WALL_SUB.intro).toBe(WALL_SUB.intro);
    expect(w.sub() & WALL_SUB.crouch).toBe(0);
    expect(w.leftHand).toBe(false);
    expect(f.stance.base).toBe('lowReady');
    expect(f.locks).toEqual([true]);
    expect(f.close).toEqual([true]);
    expect(INTRO_SIM.on).toBe(true);
    // the pin: a leave press every step (hold mode, the button never held) never releases it
    const i = { ...emptyWallInput(), x: 4.0, z: 4.6, toggle: false, leave: true };
    for (let k = 0; k < 120; k++) w.update(1 / 60, i);
    expect(w.active).toBe(true);
    expect(w.phase).toBe('on');
    // off: the operator stays on the wall in ordinary wall cover (Campaign ~22:45), holstered, the slide forward
    expect(f.ctl.set(false)).toBe(true);
    expect(w.intro).toBe(false);
    expect(w.phase).toBe('on');
    expect(w.sub() & WALL_SUB.intro).toBe(0);
    expect(f.holsters.n).toBe(1);
    expect(f.stance.base).toBe('holstered');
    expect(f.locks).toEqual([true, false]);
    expect(f.close).toEqual([true, false]);
    expect(INTRO_SIM.on).toBe(false);
    expect(f.ctl.set(false)).toBe(false);
    // from then on the normal wall rules: the leave input releases it
    w.update(1 / 60, i);
    expect(w.phase).toBe('leaving');
  });

  it('mirror: the gun in the left hand', () => {
    const f = fake(4.0, 6.0);
    expect(f.ctl.set(true, 'mirror')).toBe(true);
    expect(f.core.leftHand).toBe(true);
    expect(f.ctl.variant).toBe('mirror');
    f.ctl.set(false);
    expect(f.core.leftHand).toBe(false);
  });

  it('crouch: the crouched wall stance', () => {
    const f = fake(4.0, 4.6);
    expect(f.ctl.set(true, 'crouch')).toBe(true);
    expect(f.core.crouch).toBe(true);
    expect(f.core.sub() & WALL_SUB.crouch).toBe(WALL_SUB.crouch);
    expect(f.core.leftHand).toBe(false);
    f.ctl.set(false);
  });

  it('no high face within reach: false, nothing changed', () => {
    const f = fake(2.5, 4.6);
    expect(f.ctl.set(true, 'stand')).toBe(false);
    expect(f.core.phase).toBe('off');
    expect(f.core.intro).toBe(false);
    expect(f.stance.base).toBe('holstered');
    expect(f.locks).toEqual([]);
    expect(f.close).toEqual([]);
    expect(f.ctl.on).toBe(false);
    expect(INTRO_SIM.on).toBe(false);
  });
});

describe('intro pose on the wire (WALL_SUB.intro, no new field)', () => {
  const wallMv = (sub: number): MoveState => ({ ...emptyMoveState(), m: 'wall', a: 0, sub });
  it('bit 32 decodes to the intro pose; the mirror carries the left hand', () => {
    expect(WALL_SUB.intro).toBe(32);
    for (const [k, v] of Object.entries(WALL_SUB)) if (k !== 'intro') expect(v & WALL_SUB.intro, k).toBe(0);
    const out = emptyMovePose();
    poseFromMoveState(wallMv(32), 0, out);
    expect(out.intro).toBe(true);
    expect(out.leftHand).toBe(false);
    poseFromMoveState(wallMv(32 | 128), 0, out);
    expect(out.intro).toBe(true);
    expect(out.leftHand).toBe(true);
    poseFromMoveState(wallMv(128), 0, out);
    expect(out.intro).toBe(false);
    expect(out.leftHand).toBe(false);
    poseFromMoveState({ ...emptyMoveState(), sub: 32 }, 0, out);
    expect(out.intro).toBe(false);
    const back = sanitizeMoveState(packMoveState(wallMv(1 | 32 | 128)));
    expect(back?.m).toBe('wall');
    expect(back?.sub).toBe(1 | 32 | 128);
  });
  it("the owner's word for the mirror decodes to the intro and the left hand", () => {
    const f = fake(4.0, 6.0);
    f.ctl.set(true, 'mirror');
    const wc = f.core;
    const out = emptyMovePose();
    poseFromMoveState(wallMv(wc.sub() | (wc.leftHand ? WALL_SUB.leftHand : 0)), 0, out);
    expect(out.intro).toBe(true);
    expect(out.leftHand).toBe(true);
    f.ctl.set(false);
  });
});

describe('intro pose in the graph', () => {
  beforeAll(async () => {
    await loadIntroBreath();
  });
  it('both hands stay on the gun, and the captured breath runs with no stillness gate', () => {
    const mk = (intro: boolean) => {
      const g = new AnimGraph(proportions());
      const i = defaultInput();
      i.wall = true;
      i.wallSide = -1;
      i.armed = true;
      i.weight = classWeight('pistol');
      i.intro = intro;
      return { g, i };
    };
    const a = mk(false);
    const b = mk(true);
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 1; k <= 120; k++) {
      a.g.update(1 / 60, a.i);
      b.g.update(1 / 60, b.i);
      const t = k / 60;
      if (t >= 0.5 && t <= 1.9) {
        const d = b.g.out.spine.pitch - a.g.out.spine.pitch;
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
    }
    console.info(`(piano-knife S4b) graph: offGrip ${a.g.out.offGrip.toFixed(3)} without / ${b.g.out.offGrip.toFixed(3)} with the intro; spine pitch difference range ${(hi - lo).toFixed(4)} rad`);
    expect(a.g.out.offGrip).toBeLessThan(0.2);
    expect(b.g.out.offGrip).toBeGreaterThan(0.99);
    expect(hi - lo).toBeGreaterThan(0.004);
  });
});
