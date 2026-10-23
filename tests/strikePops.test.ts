// (strike-pops, spare job #5) The pops left in the elbow strike, the hand swap and the kill's follow-through, measured
// frame by frame on the real rig maths (NullEngine, a Wren rig, 60 Hz) and on the controllers (a stand-in game state):
// - n4c polish 9 and the trunk's reversal: the strike's trunk loaded right for one frame and drove left on the next at
//   full speed (shoulder line +12.6 then -12.1 deg a frame), then turned 18.9 deg in one frame; the right wrist moved
//   31.4 cm in one frame, the pelvis 2.9 cm. The strike body layer now follows the arc at the trunk's pace
//   (`STRIKE_BODY_RATE`); the hit still resolves on the step at 83 ms and the hand is across a frame later, as before.
// - n4c polish 1: a hand swap reversed mid-swap flipped the dip's vertical speed in one frame (the grip dropping 8.2 cm
//   a frame rose 3.0 cm the next; reversed on the way back up, 10.1 cm up then 5.0 cm down). The dip and the graph's
//   tuck read the progress from the blend (`handSwapPh`), which keeps its velocity through a reversal.
// - n4d polish 1: a bay or section restart within a kill's follow-through left it playing on the respawned player. The
//   respawn's `StrikeController.reset` ends it (`TakedownController.endTail`).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { RigPose } from '../src/player/characterRig';
import { STRIKE_BODY_RATE, strikeBodyPhase, strikeWarp } from '../src/anim/strikeBody';
import { handSwapK, handSwapPh } from '../src/anim/handSwapPath';
import { STRIKE, STRIKE_DUR, strikePhase } from '../src/game/elbowStrike';
import { TAKEDOWN, type TakedownPlan } from '../src/game/takedown';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import { StrikeController } from '../src/game/strikeController';
import type { GameState } from '../src/game/gameState';

const DT = 1 / 60;
const DEG = 180 / Math.PI;
const ss = (t: number): number => t * t * (3 - 2 * t);

/** The smaller speed either side of each sign change of a per-frame series (a reversal "at speed"); 0 when none. */
function reversalSpeed(v: readonly number[]): number {
  let m = 0;
  for (let k = 1; k < v.length; k++) if (v[k - 1]! * v[k]! < 0) m = Math.max(m, Math.min(Math.abs(v[k - 1]!), Math.abs(v[k]!)));
  return m;
}

// ------------------------------------------------------------------------------------------
// The strike on a Wren rig
// ------------------------------------------------------------------------------------------

type StrikeFrames = {
  /** Per-frame steps (index k: frame k + 1 from the frame before; the rest pose before the first). */
  pel: number[];
  wrist: number[];
  sh: number[];
  hip: number[];
  /** The right wrist across the chest (m, chest frame), per frame. */
  wx: number[];
};

async function strikeFrames(): Promise<StrikeFrames> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Matrix, Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'pops-wren', { build: 'average', style: 'detailed' });
  rig.groundProbe = () => 0;
  rig.carrier = true;
  rig.setHands(WREN_HANDS);
  rig.tuneRows = true;
  const settle = (): void => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  };
  const yawOf = (a: { getAbsolutePosition(): Vector3 }, b: { getAbsolutePosition(): Vector3 }): number => {
    const pa = a.getAbsolutePosition();
    const pb = b.getAbsolutePosition();
    return Math.atan2(-(pb.z - pa.z), pb.x - pa.x);
  };
  const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', melee: -1 };
  for (let k = 0; k < 120; k++) rig.animate(DT, pose);
  settle();
  const inv = new Matrix();
  const wl = new Vector3();
  const f: StrikeFrames = { pel: [], wrist: [], sh: [], hip: [], wx: [] };
  const pw = rig.wristR.getAbsolutePosition().clone();
  const pp = rig.hips.getAbsolutePosition().clone();
  let psh = yawOf(rig.shoulderL, rig.shoulderR);
  let phip = yawOf(rig.hipL, rig.hipR);
  // the strike (as StrikeController: the arc warped onto the hit), then 6 frames after it ends
  const n = Math.ceil(STRIKE_DUR / DT);
  for (let k = 1; k <= n + 6; k++) {
    pose.melee = k <= n ? strikeWarp(strikePhase(k * DT)) : -1;
    rig.animate(DT, pose);
    settle();
    const w = rig.wristR.getAbsolutePosition();
    const p = rig.hips.getAbsolutePosition();
    rig.torso.getWorldMatrix().invertToRef(inv);
    Vector3.TransformCoordinatesToRef(w, inv, wl);
    const sh = yawOf(rig.shoulderL, rig.shoulderR);
    const hip = yawOf(rig.hipL, rig.hipR);
    f.wrist.push(Vector3.Distance(w, pw));
    f.pel.push(Vector3.Distance(p, pp));
    f.sh.push(sh - psh);
    f.hip.push(hip - phip);
    f.wx.push(wl.x);
    pw.copyFrom(w);
    pp.copyFrom(p);
    psh = sh;
    phip = hip;
  }
  scene.dispose();
  return f;
}

describe('strike-pops: the elbow strike, frame by frame (n4c polish 9, the trunk reversal)', () => {
  // the graph's idle clock starts at a random time: fixed, so every run poses the same idle
  beforeAll(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('the trunk pace (pure): never ahead of the arc, at most STRIKE_BODY_RATE a second, rewinds at once, from rest', () => {
    expect(strikeBodyPhase(0.5, -1, DT)).toBe(-1);
    expect(strikeBodyPhase(-1, 0.147, DT)).toBeCloseTo(STRIKE_BODY_RATE * DT, 12); // from rest (phase 0)
    expect(strikeBodyPhase(0.3, 0.32, DT)).toBe(0.32); // caught up: the arc itself
    expect(strikeBodyPhase(0.5, 0.2, DT)).toBe(0.2); // a rewind (a denial's blend back) follows at once
    // the kill blows (~0.82 / s to contact) and the recovery (~0.75 / s) never reach it: only the strike's warp does
    expect(STRIKE_BODY_RATE).toBeGreaterThan(0.56 / (TAKEDOWN.strike - DT) * 2);
    let ph = -1;
    for (let k = 1; k <= Math.ceil(STRIKE_DUR / DT); k++) {
      const arc = strikeWarp(strikePhase(k * DT));
      const next = strikeBodyPhase(ph, arc, DT);
      expect(next).toBeLessThanOrEqual(arc);
      expect(next - Math.max(0, ph)).toBeLessThanOrEqual(STRIKE_BODY_RATE * DT + 1e-12);
      ph = next;
    }
    expect(ph).toBe(1);
  });

  it('no pop: the pelvis, the trunk\'s reversal and drive, the wrist; the hit still on its step, the hand across by the next', async () => {
    const f = await strikeFrames();
    const hitK = Math.ceil(STRIKE.hitAt / DT - 1e-9) - 1; // the hit's step (StrikeController: the first t >= hitAt)
    const n = Math.ceil(STRIKE_DUR / DT);
    const wxMin = Math.min(...f.wx.slice(0, n));
    const contact = f.wx.findIndex((x) => x <= wxMin + 0.01);
    const pel = Math.max(...f.pel);
    const shRev = reversalSpeed(f.sh) * DEG;
    const hipRev = reversalSpeed(f.hip) * DEG;
    const shStep = Math.max(...f.sh.map(Math.abs)) * DEG;
    const wrist = Math.max(...f.wrist);
    // after the contact: the hand stops on the target, then the recovery and the release (the arc to none)
    let recStep = 0;
    let recJerk = 0;
    for (let k = contact + 2; k < f.wrist.length; k++) {
      recStep = Math.max(recStep, f.wrist[k]!);
      if (k > contact + 2) recJerk = Math.max(recJerk, Math.abs(f.wrist[k]! - f.wrist[k - 1]!));
    }
    const ms = (k: number): string => `${(((k + 1) * DT) * 1000).toFixed(0)} ms`;
    const cm = (x: number): string => `${(x * 100).toFixed(1)} cm`;
    console.info(`[strike-pops] per frame (60 Hz): pelvis max ${cm(pel)} (before 2.9 cm); shoulder line max ${shStep.toFixed(1)} deg (before 18.9), reversal at ${shRev.toFixed(1)} deg/frame (before 12.1), hips reversal at ${hipRev.toFixed(1)} deg/frame; right wrist max ${cm(wrist)} (before 31.4 cm), steps ${f.wrist.slice(0, contact + 2).map((x) => (x * 100).toFixed(1)).join(' / ')} cm; after contact max ${cm(recStep)}, step change max ${cm(recJerk)}; hit step ${ms(hitK)}, hand across ${ms(contact)}`);
    // the pelvis never steps more than 2.5 cm a frame (the drive put 2.9 cm in one)
    expect(pel).toBeLessThan(0.025);
    // the trunk never reverses at speed: it slows through the turn from the load to the drive (both lines)
    expect(shRev).toBeLessThan(3);
    expect(hipRev).toBeLessThan(3);
    // the shoulders' drive spread over 2 frames, none over 14 deg (was 18.9 deg in one frame)
    expect(shStep).toBeLessThan(14);
    // the wrist's largest frame under 28 cm (was 31.4 cm)
    expect(wrist).toBeLessThan(0.28);
    // the recovery and the release: no frame over 5 cm, no step change over 3 cm
    expect(recStep).toBeLessThan(0.05);
    expect(recJerk).toBeLessThan(0.03);
    // the timing unchanged: the hit resolves on the step at 83 ms (STRIKE.hitAt 80 ms), the hand across within a frame
    expect(STRIKE.hitAt).toBe(0.08);
    expect(contact).toBeGreaterThanOrEqual(hitK);
    expect(contact).toBeLessThanOrEqual(hitK + 1);
  });
});

// ------------------------------------------------------------------------------------------
// The hand swap reversed mid-swap (n4c polish 1)
// ------------------------------------------------------------------------------------------

/** An aimed rifle on a Wren rig: to the left hand, reversed after `rev` frames; the grip's height step per frame. */
async function swapReversal(rev: number): Promise<number[]> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Matrix, Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const { WREN_HANDS, WREN_HOLSTER, WREN_BACK_MOUNT } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'pops-swap', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
  rig.backMount = WREN_BACK_MOUNT as unknown as typeof rig.backMount;
  rig.tuneRows = true;
  rig.carrier = true;
  const def = WEAPONS.rifle;
  const gun = new WeaponModel(scene, lib, def, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  gun.hold(rig);
  const inv = new Matrix();
  const grip = new Vector3(def.grip[0], def.grip[1], def.grip[2]);
  const gw = new Vector3();
  const gripY = (): number => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    rig.root.getWorldMatrix().invertToRef(inv);
    Vector3.TransformCoordinatesToRef(grip, gun.node.getWorldMatrix(), gw);
    Vector3.TransformCoordinatesToRef(gw, inv, gw);
    return gw.y;
  };
  const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true };
  for (let k = 0; k < 150; k++) rig.animate(DT, pose);
  let py = gripY();
  const dy: number[] = [];
  for (let k = 1; k <= 45; k++) {
    rig.openLeft = k <= rev;
    rig.animate(DT, pose);
    const y = gripY();
    dy.push(y - py);
    py = y;
  }
  scene.dispose();
  return dy;
}

describe('strike-pops: a hand swap reversed mid-swap keeps the dip\'s speed (n4c polish 1)', () => {
  it('the progress read from the blend: a plain swap\'s own, symmetric, the envelope continuous', () => {
    for (let k = 0; k <= 20; k++) {
      const s = k / 20;
      expect(handSwapPh(ss(s))).toBeCloseTo(s, 9); // a plain swap: its own progress back
      expect(handSwapPh(1 - ss(s))).toBeCloseTo(1 - s, 9); // either direction
      expect(handSwapK(handSwapPh(ss(s)))).toBeCloseTo(handSwapK(s), 9);
    }
    expect(handSwapPh(-0.1)).toBeCloseTo(0, 12);
    expect(handSwapPh(1.1)).toBeCloseTo(1, 12);
  });

  for (const [rev, name] of [[4, 'on the way down (s 0.27)'], [11, 'on the way back up (s 0.73)']] as const) {
    it(`reversed ${name}: the grip's vertical speed never flips sign at speed`, async () => {
      const dy = await swapReversal(rev);
      const flip = reversalSpeed(dy);
      console.info(`[strike-pops] swap reversed ${name}: grip dy cm/frame around the reversal ${dy.slice(rev - 2, rev + 4).map((x) => (x * 100).toFixed(2)).join(' / ')}; reversal at ${(flip * 100).toFixed(2)} cm/frame (before ${rev === 4 ? '3.02' : '5.01'})`);
      expect(flip).toBeLessThan(0.01);
    });
  }
});

// ------------------------------------------------------------------------------------------
// The restart (n4d polish 1): the respawn ends a strike and a kill's follow-through
// ------------------------------------------------------------------------------------------

function victim(): TakedownVictim {
  return {
    id: 'e1',
    pos: new Vector3(0, 0, 0.6),
    yaw: Math.PI,
    alive: true,
    def: { quadruped: false } as TakedownVictim['def'],
    alerted: false,
    level: 'calm' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown() {},
    holdAt(x: number, y: number, z: number) {
      this.pos.set(x, y, z);
    },
    releaseTakedown() {},
    setSolid() {},
    holdAsHostage() {},
    holdPose() {},
    applyDamage() {
      (this as { alive: boolean }).alive = false;
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {
      (this as { alive: boolean }).alive = false;
    },
  };
}

/** A stand-in game state with the real TakedownController and StrikeController (solo: no net). */
function stage(): { g: GameState; td: TakedownController; sk: StrikeController } {
  const pos = new Vector3(0, 0, 0);
  const controller = { pos, override: null, speedCap: Infinity, gear: 2, crouched: false, yaw: 0, speed: 0, grounded: true, paceBand: 0, standUp() {} };
  const g = {
    player: {
      alive: true,
      pose: { melee: -1, traverse: 'none', traverseT: 0 },
      controller,
      position: pos,
      rig: { reachL: { w: 0 }, reachR: { w: 0 } },
      carry: { raise: 0, w: { high: 0, low: 1, compressed: 0 } },
      cam: { yaw: 0 },
    },
    events: { emit() {} },
    target: { health: { hp: 100 } },
    traversal: { attached: false, committed: null },
    team: { mode: null, active: false },
    weapons: { drawPhase: 0, reloadBusy: false },
    enemyMgr: null,
    stealth: null,
    doorPeek: { active: false },
    wallCore: null,
    takedownVictims: () => [], // no takedown offers (the strike names its target; its turn to it is skipped)
  } as unknown as GameState & { takedown: TakedownController; strike: StrikeController };
  const td = new TakedownController(g);
  const sk = new StrikeController(g);
  (g as { takedown: TakedownController }).takedown = td;
  (g as { strike: StrikeController }).strike = sk;
  return { g, td, sk };
}

const plan: TakedownPlan = { kind: 'front', alignX: 0, alignY: 0, alignZ: 0, faceYaw: 0, approach: TAKEDOWN.approach, arc: 0, strike: TAKEDOWN.strike, victimTo: null };

/** One sim step of both controllers (as GameState: the takedown first, then the strike; nothing pressed). */
function step(td: TakedownController, sk: StrikeController): void {
  td.fixedUpdate(DT, false, false);
  sk.fixedUpdate(DT, false);
}

describe('strike-pops: a bay or section restart ends the strike and the kill\'s follow-through (n4d polish 1)', () => {
  it('a restart inside a lethal takedown\'s follow-through: the respawn\'s reset ends it, no arc on the respawned player', () => {
    const { g, td, sk } = stage();
    td.offer = { e: victim(), plan, lethalOnly: false };
    td.start(true);
    // through the approach and the blow to the kill, into the follow-through
    let k = 0;
    while (td.tailU < 0 && k++ < 200) td.fixedUpdate(DT, false, true);
    step(td, sk);
    expect(td.active).toBeNull();
    expect(td.tailU).toBeGreaterThan(1);
    expect(g.player.pose.melee).toBeGreaterThan(0);
    // the bay / section restart's respawn (GameState: `strike.reset()`; the co-op client's 'revive' the same)
    sk.reset();
    expect(td.tailU).toBe(-1);
    expect(g.player.pose.melee).toBe(-1);
    // the respawned player: no arc posed on any later step
    for (let i = 0; i < 30; i++) {
      step(td, sk);
      expect(g.player.pose.melee).toBe(-1);
    }
  });

  it('a restart mid-strike (in the follow-through): the strike ends, the arc at rest, nothing posed after', () => {
    const { g, sk, td } = stage();
    expect(sk.begin('e2')).toBe(true);
    for (let i = 0; i < 10; i++) step(td, sk);
    expect(sk.active).toBe(true);
    expect(g.player.pose.melee).toBeGreaterThan(0.56); // past contact
    sk.reset();
    expect(sk.active).toBe(false);
    expect(g.player.pose.melee).toBe(-1);
    for (let i = 0; i < 30; i++) {
      step(td, sk);
      expect(g.player.pose.melee).toBe(-1);
    }
    // the rig's trunk layer drops the old strike the same frame and a new one starts from rest
    expect(strikeBodyPhase(0.6, -1, DT)).toBe(-1);
    expect(strikeBodyPhase(-1, strikeWarp(strikePhase(DT)), DT)).toBeCloseTo(STRIKE_BODY_RATE * DT, 12);
  });
});
