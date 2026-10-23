import { afterEach, describe, expect, it, vi } from 'vitest';
import { Enemy, type PlayerRef } from '../src/ai/enemy';
import { instantDetect, losClear, sightRate, type SightInput } from '../src/ai/perception';
import { smellRate } from '../src/ai/archetypes';
import { mayBeSeen, TARGETS } from '../src/ai/targetPick';
import { INTRUDERS } from '../src/ai/intruders';
import { wrapAngle } from '../src/player/playerController';
import { Vector3 } from '../src/core/babylon';
import { hyp2 } from '../src/core/mathx';

// (guard-ai S23) Every player is seen: the real `Enemy.perceive` on a stand-in guard built on Enemy's prototype (no
// rig, no scene), a stub ctx with two players and a stubbed sight ray. A hidden nearer partner no longer blinds a
// guard to the one standing in his light; in combat he keeps the one he fights; solo is the same as before; a calm
// guard casts no ray for a player he cannot see.

interface Pl {
  ref: PlayerRef;
  /** Body points behind a wall (the ray to them is blocked). */
  hidden: { chest: boolean; head: boolean; hips: boolean };
}

/** A player at (x, z): chest 1.25 m, head 1.6 m above the feet. */
function player(id: string, x: number, z: number, o: { light?: number; speed?: number; crouched?: boolean; hidden?: boolean; chest?: boolean; head?: boolean; hips?: boolean } = {}): Pl {
  const feet = new Vector3(x, 0, z);
  const target = {
    alive: true,
    team: 'player',
    aimPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.25, feet.z),
    headPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.6, feet.z),
  };
  const ref = { id, target, feet, speed: o.speed ?? 0, crouched: o.crouched ?? false, light: o.light } as unknown as PlayerRef;
  const h = o.hidden ?? false;
  return { ref, hidden: { chest: o.chest ?? h, head: o.head ?? h, hips: o.hips ?? h } };
}

/** The ray stub: blocked (a wall 0.5 m from the eye) when it ends on a hidden body point. */
function ballistics(pls: Pl[]) {
  const ray = vi.fn((_from: Vector3, to: Vector3) => {
    for (const p of pls) {
      if (Math.abs(to.x - p.ref.feet.x) > 1e-6 || Math.abs(to.z - p.ref.feet.z) > 1e-6) continue;
      const dy = to.y - p.ref.feet.y;
      const part = Math.abs(dy - 1.25) < 1e-6 ? 'chest' : Math.abs(dy - 1.6) < 1e-6 ? 'head' : 'hips';
      if (p.hidden[part]) return { hit: true, distance: 0.5 };
    }
    return { hit: false, distance: 0 };
  });
  return { ray };
}

type Priv = {
  target: PlayerRef | null;
  los: boolean;
  losHead: boolean;
  dist: number;
  rate: number;
  smelled: boolean;
  lastKnown: Vector3;
  lastSeenT: number;
  sight: SightInput;
  stimulus: [number, number];
  hasStimulus: boolean;
  perceive(): void;
};

/** A stand-in guard at the origin facing +z (yaw 0), with the fields `perceive` reads. */
function guard(pls: Pl[], o: { alerted?: boolean; yaw?: number; dog?: boolean; field?: number } = {}) {
  const b = ballistics(pls);
  const ctx = {
    rooms: [],
    players: () => pls.map((p) => p.ref),
    world: { lightField: { totalAt: vi.fn(() => o.field ?? 0.5) } },
    ballistics: b,
    diff: { perception: 1 },
    reportSighting: vi.fn(),
    bodies: () => [],
  };
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, {
    ctx,
    pos: new Vector3(0, 0, 0),
    yaw: o.yaw ?? 0,
    crouch: 0,
    def: { scale: 1, melee: null },
    dog: o.dog ? {} : null,
    aware: { alert: o.alerted ?? false, sensitivity: 1 },
    passive: false,
    buff: false,
    room: -1,
    target: null,
    los: false,
    losHead: false,
    dist: 99,
    seenMask: 0,
    rate: 0,
    smelled: false,
    meter: 0,
    lastKnown: new Vector3(),
    lastSeenT: 99,
    tmp: new Vector3(),
    tmpEye: new Vector3(),
    tmpHead: new Vector3(),
    tmpHips: new Vector3(),
    sight: { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 0, sensitivity: 1, pitch: 0 },
    stimulus: [0, 0],
    hasStimulus: false,
  });
  return { e, p: e as unknown as Priv, ctx, ray: b.ray };
}

/** The pre-S23 perceive for one guard, on the same inputs (nearest living player, his rays, his rate). */
function oldPerceive(pls: Pl[], o: { alerted?: boolean; yaw?: number; dog?: boolean; field?: number } = {}) {
  const pos = new Vector3(0, 0, 0);
  const yaw = o.yaw ?? 0;
  const alerted = o.alerted ?? false;
  const b = ballistics(pls);
  let best: PlayerRef | null = null;
  let bd = Infinity;
  for (const p of pls) {
    if (!p.ref.target.alive) continue;
    const d = Vector3.Distance(p.ref.feet, pos);
    if (d < bd) {
      bd = d;
      best = p.ref;
    }
  }
  const out = { target: best, dist: bd, los: false, losHead: false, rate: 0, lastKnown: new Vector3(), lastSeenT: 99, light: 1, sight: null as SightInput | null, meter: 0, stimulus: [0, 0], smelled: false };
  if (!best) return out;
  const eye = new Vector3(0, 1.55, 0);
  const tmp = best.target.aimPoint(new Vector3());
  const tmpHead = new Vector3();
  const pitch = Math.atan2(tmp.y - eye.y, hyp2(tmp.x - eye.x, tmp.z - eye.z));
  const chest = losClear(b, eye, tmp, 0.3);
  if (chest) out.lastKnown.copyFrom(tmp);
  let n = chest ? 1 : 0;
  best.target.headPoint!(tmpHead);
  const head = losClear(b, eye, tmpHead, 0.2);
  if (head) {
    n++;
    if (!chest) {
      out.losHead = true;
      out.lastKnown.copyFrom(tmpHead);
    }
  }
  out.los = chest || head;
  if (!alerted) {
    const hips = new Vector3(best.feet.x, best.feet.y + (tmpHead.y - best.feet.y) * 0.52, best.feet.z);
    if (losClear(b, eye, hips, 0.2)) n++;
  }
  if (out.los) out.lastSeenT = 0;
  out.light = best.light ?? o.field ?? 0.5;
  const si: SightInput = {
    dist: bd,
    angle: wrapAngle(Math.atan2(best.feet.x - pos.x, best.feet.z - pos.z) - yaw),
    light: out.light,
    crouched: best.crouched,
    speed: best.speed,
    exposure: alerted ? (out.los ? 1 : 0) : n / 3,
    sensitivity: 1,
    pitch: alerted || o.dog ? 0 : pitch,
  };
  out.rate = sightRate(si);
  if (o.dog) {
    const sm = smellRate(bd, best.crouched);
    if (sm > 0) {
      out.smelled = true;
      if (sm > out.rate) out.rate = sm;
      best.target.aimPoint(out.lastKnown);
      out.lastSeenT = 0;
    }
  }
  out.sight = si;
  if (!alerted && instantDetect(si)) out.meter = 1;
  if (out.rate > 0 && !alerted) out.stimulus = [best.feet.x, best.feet.z];
  return out;
}

afterEach(() => {
  (TARGETS as { all: boolean; sticky: boolean }).all = true;
});

describe('guard-ai S23: every player is seen', () => {
  it('(a) A nearer behind a wall, B lit in focus at 9 m: the target is B, the meter fills on him', () => {
    const A = player('a', 1.5, 3, { hidden: true });
    const B = player('b', 0, 9, { light: 1 });
    const { e, p } = guard([A, B]);
    p.perceive();
    expect(p.target).toBe(B.ref);
    expect(p.dist).toBeCloseTo(9, 9);
    expect(p.rate).toBeGreaterThan(0);
    expect(p.los).toBe(true);
    expect(e.seesIndex(1)).toBe(true);
    expect(e.seesIndex(0)).toBe(false);
    expect(e.inSight).toBe(true);
    expect([p.stimulus[0], p.stimulus[1]]).toEqual([0, 9]);
    expect(e.targetDist).toBe(p.dist);
    // the undo (A143): TARGETS.all false is the nearest only, as before S23: A, unseen
    (TARGETS as { all: boolean }).all = false;
    p.perceive();
    expect(p.target).toBe(A.ref);
    expect(p.rate).toBe(0);
    expect(e.seesIndex(1)).toBe(true);
  });

  it('(b) in combat with los to B, A walks up nearer behind the wall: the target stays B, los stays true', () => {
    const A = player('a', 1.5, 6, { hidden: true });
    const B = player('b', 0, 9, { light: 1 });
    const { e, p, ctx } = guard([A, B], { alerted: true });
    p.target = B.ref;
    for (const z of [6, 4, 2.5, 1.5]) {
      A.ref.feet.z = z;
      p.perceive();
      expect(p.target).toBe(B.ref);
      expect(p.los).toBe(true);
      expect(e.seesIndex(0)).toBe(false);
      expect(e.seesIndex(1)).toBe(true);
    }
    expect(ctx.reportSighting).toHaveBeenCalledWith(B.ref);
    expect(ctx.reportSighting).not.toHaveBeenCalledWith(A.ref);
    expect(p.lastKnown.z).toBeCloseTo(9, 9);
    // B ducks out of sight while A steps into view: the nearest he sees (A)
    B.hidden.chest = B.hidden.head = true;
    A.hidden.chest = false;
    p.perceive();
    expect(p.target).toBe(A.ref);
    expect(p.los).toBe(true);
  });

  it('(c) both visible, calm: the higher rate wins (B lit at 9 m over A in shadow at 6 m)', () => {
    const A = player('a', -1, 6, { light: 0.05 });
    const B = player('b', 0, 9, { light: 1 });
    const { e, p } = guard([A, B]);
    p.perceive();
    expect(p.target).toBe(B.ref);
    expect(e.seesIndex(0)).toBe(true);
    expect(e.seesIndex(1)).toBe(true);
    // A's own rate is lower: the meter fills at B's (one meter, A143: two in view do not add up)
    const solo = guard([A]);
    solo.p.perceive();
    expect(solo.p.target).toBe(A.ref);
    expect(solo.p.rate).toBeLessThan(p.rate);
    const onlyB = guard([B]);
    onlyB.p.perceive();
    expect(p.rate).toBe(onlyB.p.rate);
  });

  it('(d) solo parity: the same target, distance, rate, los and lastKnown as the old code path for the same inputs', () => {
    type Case = [string, number, number, { light?: number; speed?: number; crouched?: boolean; hidden?: boolean; chest?: boolean; head?: boolean; hips?: boolean }, { alerted?: boolean; yaw?: number; dog?: boolean; field?: number }];
    const cases: Case[] = [];
    const bodies: Case[3][] = [{ light: 1 }, { light: 0.2, crouched: true }, { speed: 1.5 }, { speed: 4, light: 0.6 }, { chest: true }, { chest: true, head: true }, { hidden: true }, {}];
    const guards: Case[4][] = [{}, { alerted: true }, { dog: true }, { yaw: 0.7 }, { field: 0.9 }];
    const spots: [number, number][] = [[0, 9], [3, 4], [-6, 14], [0.6, 1.2], [8, 2], [0, 1], [2, 22]];
    for (const b of bodies) for (const g of guards) for (const [x, z] of spots) cases.push(['p', x, z, b, g]);
    let full = 0;
    for (const [id, x, z, b, g] of cases) {
      const pl = player(id, x, z, b);
      const { e, p } = guard([pl], g);
      p.perceive();
      const old = oldPerceive([pl], g);
      const label = JSON.stringify([x, z, b, g]);
      expect(p.target, label).toBe(old.target);
      expect(p.dist, label).toBe(old.dist);
      expect(p.rate, label).toBe(old.rate);
      expect(e.meter, label).toBe(old.meter);
      expect(p.smelled, label).toBe(old.smelled);
      expect([p.stimulus[0], p.stimulus[1]], label).toEqual(old.stimulus);
      const d = Vector3.Distance(pl.ref.feet, Vector3.Zero());
      const angle = wrapAngle(Math.atan2(x, z) - (g.yaw ?? 0));
      // a player he cannot see at all costs no ray (S23): los / lastKnown are not read for him; everything else as before
      if (!mayBeSeen(d, angle, pl.ref.speed, g.alerted ?? false, g.dog ?? false)) {
        expect(p.los, label).toBe(false);
        continue;
      }
      full++;
      expect(p.los, label).toBe(old.los);
      expect(p.losHead, label).toBe(old.losHead);
      expect(p.lastKnown.asArray(), label).toEqual(old.lastKnown.asArray());
      expect(p.lastSeenT, label).toBe(old.lastSeenT);
      expect(e.targetLight, label).toBe(old.light);
      expect({ ...p.sight }, label).toEqual(old.sight);
      expect(e.inSight, label).toBe(old.sight!.exposure > 0);
      expect(e.seesIndex(0), label).toBe(old.sight!.exposure > 0);
    }
    expect(full).toBeGreaterThan(200);
    // no live player: no target, no sight
    const dead = player('d', 0, 5);
    (dead.ref.target as { alive: boolean }).alive = false;
    const { e, p } = guard([dead]);
    p.perceive();
    expect([p.target, p.dist, p.los, p.rate, e.seesIndex(0)]).toEqual([null, Infinity, false, 0, false]);
  });

  it('(e) a calm guard facing away casts no ray for a player 15 m behind him; alerted, he does', () => {
    const A = player('a', 0, -15, { light: 1, speed: 4 });
    const B = player('b', 0, 9, { light: 1 });
    const two = guard([A, B]);
    two.p.perceive();
    // B: chest, head, hips; A: nothing
    expect(two.ray).toHaveBeenCalledTimes(3);
    for (const c of two.ray.mock.calls) expect(c[1].z).toBeCloseTo(9, 9);
    expect(two.p.target).toBe(B.ref);
    const solo = guard([A]);
    solo.p.perceive();
    expect(solo.ray).toHaveBeenCalledTimes(0);
    expect(solo.p.target).toBe(A.ref);
    expect(solo.p.rate).toBe(0);
    expect(solo.e.inSight).toBe(false);
    // in combat the rays are cast (chest and head; no hips in combat)
    const hot = guard([A], { alerted: true });
    hot.p.perceive();
    expect(hot.ray).toHaveBeenCalledTimes(2);
    expect(hot.p.los).toBe(true);
  });
});

// (guard-ai S24, A148, G139) An alerted guard out of sight goes where he knows his intruder to be: his intruder's last
// known position; with none, his own last sighting (else his stimulus); never the player's real feet.
describe('guard-ai S24: no walk to the real feet', () => {
  type Known = { knownSpot(t: PlayerRef): Vector3; faceTarget(): number; hunt: number; sawOnce: boolean; knownV: Vector3 };
  function hunter(pls: Pl[], lkp: Vector3 | null) {
    const g = guard(pls, { alerted: true });
    Object.assign(g.ctx, { stealth: () => true, lkpOf: vi.fn((s: number) => (s === 1 ? lkp : null)), intruderId: (s: number) => (s === 1 ? 'b' : '') });
    Object.assign(g.e, { hunt: 1, sawOnce: false, knownV: new Vector3() });
    return { ...g, k: g.e as unknown as Known };
  }

  it('alerted, no line, no valid slot for his hunt: his own lastKnown, not the feet; noFeet false: the old feet', () => {
    const B = player('b', 4, 12, { hidden: true });
    const { p, k } = hunter([B], null);
    p.target = B.ref;
    // he saw him once at (2, 1.25, 5) (the aim point): he goes there, at floor height
    k.sawOnce = true;
    p.lastKnown.set(2, 1.25, 5);
    const at = k.knownSpot(B.ref);
    expect([at.x, at.z]).toEqual([2, 5]);
    expect(at).not.toBe(B.ref.feet);
    expect(k.faceTarget()).toBeCloseTo(Math.atan2(2, 5), 9);
    // never saw anyone: what drew him (his stimulus), else where he stands (his own facing)
    k.sawOnce = false;
    Object.assign(p, { hasStimulus: true, stimulus: [-3, 7] });
    expect([k.knownSpot(B.ref).x, k.knownSpot(B.ref).z]).toEqual([-3, 7]);
    Object.assign(p, { hasStimulus: false });
    expect([k.knownSpot(B.ref).x, k.knownSpot(B.ref).z]).toEqual([0, 0]);
    (p as unknown as { yaw: number }).yaw = 0.4;
    expect(k.faceTarget()).toBe(0.4);
    // the undo (A148): the old feet
    (INTRUDERS as { noFeet: boolean }).noFeet = false;
    try {
      expect(k.knownSpot(B.ref)).toBe(B.ref.feet);
    } finally {
      (INTRUDERS as { noFeet: boolean }).noFeet = true;
    }
  });

  it("his intruder's last known position when it is valid (noFeet or not)", () => {
    const B = player('b', 4, 12, { hidden: true });
    const lkp = new Vector3(6, 0, 8);
    const { k } = hunter([B], lkp);
    expect(k.knownSpot(B.ref)).toBe(lkp);
    k.hunt = -1;
    k.sawOnce = true;
    expect(k.knownSpot(B.ref)).not.toBe(lkp);
  });

  it("alerted, no line to either player: the target is his intruder's player (pickTarget's hunt), not the nearer one", () => {
    const A = player('a', 1, 3, { hidden: true });
    const B = player('b', 0, 14, { hidden: true });
    const { p } = hunter([A, B], new Vector3(0, 0, 14));
    p.perceive();
    expect(p.target).toBe(B.ref);
    expect(p.los).toBe(false);
  });
});
