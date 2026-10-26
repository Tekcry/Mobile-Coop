import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES } from '../src/ai/enemyDefs';
import { Rng } from '../src/ai/squadRoles';
import { EYE_STAND } from '../src/ai/perception';
import { Vector3 } from '../src/core/babylon';
import type { HitInfo } from '../src/game/damage';
import { sampleSpread } from '../src/weapons/weaponStats';
import { spreadDir } from '../src/weapons/ballistics';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// (guard-ai-alloc D1) A guard's round and a dog's bite fill one reused HitInfo and scratch vectors instead of a fresh
// damage object and vectors per hit. The receivers read them during the call; these check the values each receiver
// sees are the ones the old literals carried (same numbers, same RNG draws), on stand-in guards built on Enemy's
// prototype (no rig, no scene).

type Seen = { amount: number; point: number[]; dir: number[]; part: string; kind: string; attackerTeam: string; attackerId: string; sourcePos: number[]; impulse: number; shieldHit: boolean | undefined };
const v3 = (v: Vector3): number[] => [v.x, v.y, v.z];
/** What a receiver reads during the call (a copy: the HitInfo is refilled on the next hit). */
function seen(h: HitInfo): Seen {
  return { amount: h.amount, point: v3(h.point), dir: v3(h.dir), part: h.part, kind: h.kind, attackerTeam: h.attackerTeam, attackerId: h.attackerId, sourcePos: v3(h.sourcePos), impulse: h.impulse, shieldHit: h.shieldHit };
}

function shooter(seed: number) {
  const hits: HitInfo[] = [];
  const got: Seen[] = [];
  const target = { team: 'player', applyDamage: (h: HitInfo) => (hits.push(h), got.push(seen(h)), { dealt: 1, killed: false }) };
  const shield = { team: 'enemy', applyDamage: (h: HitInfo) => (hits.push(h), got.push(seen(h)), { dealt: 1, killed: false }) };
  const rays: number[][] = [];
  let rayTarget: unknown = target;
  const hitPoint = new Vector3(0.3, 1.2, 9.7);
  const ctx = {
    diff: DIFFICULTY.normal,
    ballistics: {
      ray: vi.fn((a: Vector3, b: Vector3) => {
        rays.push([...v3(a), ...v3(b)]);
        return { hit: true, point: hitPoint, target: rayTarget, part: 'body' };
      }),
      impactFx: vi.fn(),
    },
    vfx: { tracer: vi.fn(), muzzleFlash: vi.fn() },
    players: () => [],
    world: { props: { impulse: vi.fn() } },
  };
  const e = Object.create(Enemy.prototype) as Enemy;
  Object.assign(e, { ctx, def: ENEMIES.grunt, id: 'g7', pos: new Vector3(1, 0, -2), yaw: 0.4, crouch: 0, rng: new Rng(seed), losT: 0.5, losHead: false, suppressing: false, lastKnown: new Vector3(0, 1, 9), roundsFired: 0, shotsHere: 0, buff: false, kick: 0 });
  const t = { feet: new Vector3(0, 0, 10), speed: 2, crouched: false, shield: null as unknown, target: { aimPoint: (o: Vector3) => o.set(0, 1.1, 10) } };
  const shoot = (mode: 'aim' | 'suppress' | 'blind' = 'aim') => (e as unknown as { shoot(t: unknown, w: unknown, m: string): void }).shoot(t, ENEMIES.grunt.weapon, mode);
  return {
    e,
    t,
    hits,
    got,
    rays,
    shoot,
    hitPoint,
    shieldOn: () => {
      t.shield = shield;
      rayTarget = shield;
    },
    shieldOff: () => {
      t.shield = null;
      rayTarget = target;
    },
  };
}

/** The old `shoot`'s numbers with fresh vectors (the literal it replaced), from the same seed. */
function oldShot(seed: number, n: number, speed = 2): { origin: Vector3; end: Vector3; dir: Vector3 }[] {
  const def = ENEMIES.grunt;
  const w = def.weapon!;
  const d = DIFFICULTY.normal;
  const rng = new Rng(seed);
  const out: { origin: Vector3; end: Vector3; dir: Vector3 }[] = [];
  for (let k = 0; k < n; k++) {
    const yaw = 0.4;
    const origin = new Vector3(1, 0, -2).addInPlaceFromFloats(0, EYE_STAND * def.scale, 0);
    // the muzzle (`Enemy.muzzle`): eye less 0.2, forward and to the right
    origin.y -= 0.2 * def.scale;
    origin.x += Math.sin(yaw) * 0.45 + Math.cos(yaw) * 0.18;
    origin.z += Math.cos(yaw) * 0.45 - Math.sin(yaw) * 0.18;
    const aim = new Vector3(0, 1.1, 10);
    const dir = aim.subtract(origin).normalize();
    const settle = Math.min(1, 0.45 + (0.5 * 0.55) / d.reaction);
    const moving = Math.min(1, speed / 5);
    const spread = (w.spreadDeg * (1 + moving * 0.8)) / (d.accuracy * settle);
    const off = sampleSpread(spread, rng.next(), rng.next());
    spreadDir(dir, off.x, off.y, dir);
    out.push({ origin, end: origin.add(dir.scale(w.range)), dir });
  }
  return out;
}

describe('guard-ai-alloc D1: a round fills the reused HitInfo', () => {
  it('carries the old literal values, from one object per guard shot', () => {
    const s = shooter(11);
    s.shoot();
    s.shoot();
    expect(s.hits.length).toBe(2);
    expect(s.hits[0]).toBe(s.hits[1]);
    const old = oldShot(11, 2);
    for (let k = 0; k < 2; k++) {
      const o = old[k]!;
      const g = s.got[k]!;
      expect(g.amount).toBe(ENEMIES.grunt.weapon!.damage * DIFFICULTY.normal.damage);
      expect(g.point).toEqual(v3(s.hitPoint));
      expect(g.part).toBe('body');
      expect(g.kind).toBe('bullet');
      expect(g.attackerTeam).toBe('enemy');
      expect(g.attackerId).toBe('g7');
      expect(g.impulse).toBe(1);
      expect(g.shieldHit).toBeUndefined();
      expect(g.sourcePos).toEqual(v3(o.origin));
      expect(g.dir).toEqual(v3(o.dir));
      expect(s.rays[k]).toEqual([...v3(o.origin), ...v3(o.end)]);
      expect(Math.sqrt(g.dir[0]! ** 2 + g.dir[1]! ** 2 + g.dir[2]! ** 2)).toBeCloseTo(1, 9);
    }
  });

  it('marks a round into the hostage shield, and the next round is plain again', () => {
    const s = shooter(5);
    s.shieldOn();
    s.shoot();
    s.shieldOff();
    s.shoot();
    expect(s.got[0]!.shieldHit).toBe(true);
    expect(s.got[1]!.shieldHit).toBeUndefined();
    expect(s.hits[0]).toBe(s.hits[1]);
  });
});

describe('guard-ai-alloc D1: a bite fills the reused HitInfo', () => {
  function biter() {
    const got: Seen[] = [];
    const hits: HitInfo[] = [];
    const feet = new Vector3(0.6, 0, 0.8);
    const target = { id: 'p1', feet, speed: 0, crouched: false, cover: null, coverT: 0, target: { applyDamage: (h: HitInfo) => (hits.push(h), got.push(seen(h)), { dealt: 1, killed: false }) } };
    const ctx = { diff: DIFFICULTY.normal, stealth: () => false, coordinated: () => false, onMelee: vi.fn(), alarmRaised: () => false };
    const e = Object.create(Enemy.prototype) as Enemy;
    Object.assign(e, {
      ctx,
      def: ENEMIES.dog,
      id: 'k9',
      pos: new Vector3(0, 0, 0),
      yaw: 0,
      aware: { alert: true, level: 'alert' },
      target,
      stagger: 0,
      los: true,
      smelled: false,
      dist: 1,
      alarm: null,
      entry: null,
      knownPt: [0, 0],
      advanceCd: 0,
      hold: null,
      postDef: null,
      post: [0, 0],
      doorCheck: 0,
      hunt: -1,
      meleeCd: 0,
      lunge: 0,
      kick: 0,
      dogBite: 0,
    });
    const decide = () => (e as unknown as { decide(dt: number): unknown }).decide(1 / 60);
    return { e, feet, got, hits, decide, ctx };
  }

  it('carries the old literal values (point and source copied, direction to the feet)', () => {
    const b = biter();
    b.decide();
    expect(b.got.length).toBe(1);
    const g = b.got[0]!;
    const melee = ENEMIES.dog.melee!;
    expect(g.amount).toBe(melee.damage * DIFFICULTY.normal.damage);
    expect(g.point).toEqual([0.6, 0, 0.8]);
    expect(g.dir).toEqual(v3(b.feet.subtract(new Vector3(0, 0, 0)).normalize()));
    expect(g.sourcePos).toEqual([0, 0, 0]);
    expect(g.part).toBe('body');
    expect(g.kind).toBe('melee');
    expect(g.attackerTeam).toBe('enemy');
    expect(g.attackerId).toBe('k9');
    expect(g.impulse).toBe(2);
    expect(g.shieldHit).toBeUndefined();
    expect(b.ctx.onMelee).toHaveBeenCalledTimes(1);
    // the point and source are copies, not the target's feet or the dog's own position
    expect(b.hits[0]!.point).not.toBe(b.feet);
    expect(b.hits[0]!.sourcePos).not.toBe((b.e as unknown as { pos: Vector3 }).pos);
  });

  it('a bite step allocates no object (no damage object, no vectors, no goal literal)', async () => {
    const b = biter();
    const res = { dealt: 1, killed: false };
    const p = b.e as unknown as { meleeCd: number; dogBite: number; decide(dt: number): unknown; target: { target: { applyDamage: (h: HitInfo) => unknown } } };
    p.target.target.applyDamage = () => res;
    (b.ctx as { onMelee: unknown }).onMelee = () => undefined;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        p.meleeCd = 0;
        p.decide(1 / 60);
      }
    }, 4 * HEAP_NUMBER);
    // boxed doubles only (16 B each: the goal's `face` on a number | null field, doubles across calls V8 does not
    // inline): the old step's damage object, two clones and normalised difference read 168 B here, and
    // any object (48 B or more) on top of these reads over the limit
    expect(per).toBeLessThanOrEqual(4 * HEAP_NUMBER);
  });
});

describe('guard-ai-alloc fix: a same-cell route keeps its own known spot', () => {
  it('copies `[tp]` off his kept `knownPt` (the route is not moved by the next step)', () => {
    const knownPt: [number, number] = [4, 5];
    const nav = { version: 0, partialEnd: false, lineClear: () => false, findPath: (_f: unknown, to: unknown) => [to] };
    const e = Object.create(Enemy.prototype) as Enemy;
    Object.assign(e, {
      ctx: { nav, stealth: () => true },
      pos: new Vector3(0, 0, 0),
      hunt: -1,
      dist: 10,
      stateT: 0,
      postDef: null,
      knownPt,
      routePath: [],
      routeGoal: [Number.NaN, Number.NaN],
      routeT: 0,
      routeVer: -1,
      routeMiss: false,
      routeNear: false,
      meP: [0, 0],
    });
    const p = e as unknown as { routePath: number[][]; chasePoint(dt: number, tp: [number, number], zig: boolean): number[] | null };
    const wp = p.chasePoint(1 / 60, knownPt, false);
    // this step's goal is his known spot, as before
    expect(wp).toEqual([4, 5]);
    // the kept route holds its own copy, not the buffer the next `decide` rewrites
    expect(p.routePath.length).toBe(1);
    expect(p.routePath[0]).not.toBe(knownPt);
    expect(p.routePath[0]).toEqual([4, 5]);
    knownPt[0] = 9;
    knownPt[1] = -3;
    expect(p.routePath[0]).toEqual([4, 5]);
  });
});
