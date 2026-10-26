/**
 * (guard-ai S16) The armour fire gate wired to the shot ray: `Ballistics.armouredFirst` on a stand-in physics engine
 * (bodies along the line with their membership bits; the cast stops at the first one the query's mask asks for, as
 * Havok's filter does) reads the struck shape's armour bit in `ray`'s order (a registered hit volume or a prop first is
 * not armour), reusing its one result (no allocation); `ArmourGate` over it holds fire at an armoured pane or door and
 * passes plain glass; and `Enemy` gates `tryFire` before the wind-up, the burst and every round, aims the gate along the
 * same muzzle -> aim line `shoot` uses, keeps sight on `MASK.SIGHT`, and repositions through the existing cover pick.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3, type PhysicsRaycastResult, type Scene } from '../src/core/babylon';
import { Ballistics } from '../src/weapons/ballistics';
import { ArmourGate } from '../src/ai/armourFire';
import { G, MASK, doorMembership, glassMembership, isArmoured, markArmoured } from '../src/physics/groups';
import type { DamageRegistry } from '../src/game/damage';
import type { PropSystem } from '../src/world/props';
import type { Vfx } from '../src/vfx/vfx';

interface FakeBody {
  d: number;
  bits: number;
  body: object;
}

/** A Ballistics over a stand-in engine: `bodies` lie along +z from the origin at distance `d`. */
function rig(bodies: FakeBody[], registered: object[] = [], props: object[] = []) {
  let casts = 0;
  let lastRes: PhysicsRaycastResult | null = null;
  const eng = {
    raycastToRef(from: Vector3, to: Vector3, res: PhysicsRaycastResult, q: { collideWith: number }) {
      casts++;
      lastRes = res;
      const len = Vector3.Distance(from, to);
      const hit = bodies
        .filter((b) => (b.bits & q.collideWith) !== 0 && b.d <= len)
        .sort((a, b) => a.d - b.d)[0];
      if (!hit) return;
      res.setHitData({ x: 0, y: 0, z: -1 }, { x: from.x, y: from.y, z: from.z + hit.d });
      (res as unknown as { body: unknown }).body = hit.body;
      (res as unknown as { shape: unknown }).shape = { filterMembershipMask: hit.bits };
    },
  };
  const scene = { getPhysicsEngine: () => eng } as unknown as Scene;
  const registry = { lookup: (b: unknown) => (b && registered.includes(b as object) ? { target: {}, part: 'body' } : undefined) } as unknown as DamageRegistry;
  const propSys = { get: (b: unknown) => (b && props.includes(b as object) ? {} : undefined) } as unknown as PropSystem;
  // (sniper triage) armour is the body's mark, as the level builder and the doors set it on an armoured pane / leaf
  for (const b of bodies) if (isArmoured(b.bits)) markArmoured(b.body);
  const bal = new Ballistics(scene, registry, propSys, {} as Vfx);
  return { bal, casts: () => casts, res: () => lastRes };
}

const from = new Vector3(0, 1.35, 0);
const to = new Vector3(0, 1.2, 10);
const player = { d: 10, bits: G.PLAYER_HITBOX, body: { n: 'player' } };

describe('guard-ai S16: Ballistics.armouredFirst (stand-in physics)', () => {
  it('an armoured clear pane, an armoured frosted pane, an armoured door leaf first: armour', () => {
    for (const bits of [glassMembership('clear', true), glassMembership('frosted', true), doorMembership(true)]) {
      const r = rig([{ d: 4, bits, body: {} }, player]);
      expect(r.bal.armouredFirst(from, to, MASK.ENEMY_SHOT), String(bits)).toBe(true);
    }
  });

  it('plain glass is not in the enemy shot mask: the cast reaches the player, not armour', () => {
    for (const bits of [glassMembership('clear', false), glassMembership('frosted', false)]) {
      const r = rig([{ d: 4, bits, body: {} }, player], [player.body]);
      expect(r.bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    }
  });

  it("a plain wall, the player's hit volume or a prop first: not armour (ray()'s order)", () => {
    const arm = { d: 6, bits: glassMembership('clear', true), body: {} };
    expect(rig([{ d: 3, bits: G.STATIC, body: {} }, arm, player]).bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    expect(rig([{ d: 3, bits: G.PLAYER_HITBOX, body: player.body }, arm], [player.body]).bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    const crate = { d: 3, bits: G.PROP, body: {} };
    expect(rig([crate, arm], [], [crate.body]).bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    // nothing on the line
    expect(rig([]).bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
    // armour beyond the aim point is not on the fire line
    expect(rig([{ d: 12, bits: glassMembership('clear', true), body: {} }]).bal.armouredFirst(from, to, MASK.ENEMY_SHOT)).toBe(false);
  });

  it('it agrees with ray(): armoured exactly when ray() flags the hit armoured', () => {
    for (const bits of [glassMembership('clear', true), G.STATIC, doorMembership(true), glassMembership('clear', false)]) {
      const r = rig([{ d: 4, bits, body: {} }, player]);
      expect(r.bal.armouredFirst(from, to, MASK.ENEMY_SHOT), String(bits)).toBe(r.bal.ray(from, to, MASK.ENEMY_SHOT).armoured === true);
    }
  });

  it('reuses its one raycast result (no allocation per cast)', () => {
    const r = rig([{ d: 4, bits: glassMembership('clear', true), body: {} }]);
    r.bal.armouredFirst(from, to, MASK.ENEMY_SHOT);
    const a = r.res();
    r.bal.armouredFirst(from, to, MASK.ENEMY_SHOT);
    expect(r.res()).toBe(a);
  });

  it('ArmourGate over it: holds at the NOC pane, fires through plain glass, one cast per recheck', () => {
    const arm = rig([{ d: 4, bits: glassMembership('clear', true), body: {} }, player], [player.body]);
    const g = new ArmourGate();
    for (let i = 0; i < 10; i++) {
      expect(g.gate(arm.bal, from, to, MASK.ENEMY_SHOT, 1, 2, 1 / 60)).toBe(true);
      g.step(1 / 60);
    }
    expect(arm.casts()).toBe(1);
    const plain = rig([{ d: 4, bits: glassMembership('clear', false), body: {} }, player], [player.body]);
    expect(new ArmourGate().gate(plain.bal, from, to, MASK.ENEMY_SHOT, 1, 2, 1 / 60)).toBe(false);
  });
});

describe('guard-ai S16: the gate in Enemy (src/ai/enemy.ts)', () => {
  const src = readFileSync(new URL('../src/ai/enemy.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const body = (name: string): string => {
    const i = src.indexOf(`  private ${name}(`);
    expect(i, name).toBeGreaterThan(0);
    return src.slice(i, src.indexOf('\n  }\n', i));
  };

  it('tryFire gates before the wind-up, the burst and the round', () => {
    const f = body('tryFire');
    const gate = f.indexOf('this.armourBlocks(t, mode, dt)');
    expect(gate).toBeGreaterThan(0);
    expect(gate).toBeLessThan(f.indexOf('this.windup += dt'));
    expect(gate).toBeLessThan(f.indexOf('this.burstLeft = Math.round'));
    expect(gate).toBeLessThan(f.indexOf('this.shoot(t, w, mode)'));
  });

  it('the gate casts the same muzzle -> aim line as shoot, on the enemy shot mask (with the shield mask), into reused vectors', () => {
    const g = body('armourBlocks');
    expect(g).toContain('this.muzzle(this.fireFrom, mode)');
    expect(g).toContain('this.aimAt(t, mode, this.fireTo)');
    expect(g).toContain('t.shield ? MASK.ENEMY_SHOT | G.ENEMY_HITBOX : MASK.ENEMY_SHOT');
    expect(g).not.toMatch(/new Vector3|clone\(|=>/);
    const s = body('shoot');
    // (guard-ai-alloc D1) shoot's own scratch, not the gate's (and no fresh vectors per round)
    expect(s).toContain('this.muzzle(SHOT_FROM, mode)');
    expect(s).toContain('this.aimAt(t, mode, SHOT_AIM)');
    expect(s).not.toMatch(/new Vector3|clone\(/);
  });

  it('sight stays on MASK.SIGHT (losClear), the timers step, combat over resets the gate', () => {
    expect(src).toContain('return losClear(this.ctx.ballistics, eye, to, slack);');
    expect(src).toContain('this.fireGate.step(dt);');
    expect(src).toMatch(/this\.fireGate\.reset\(\);\n\s+this\.armourPick = false;/);
  });

  it('a held guard repositions through the cover pick (clear-line spots only) or the nav, never while held to a room / post', () => {
    const d = body('decide');
    expect(d).toContain("this.fireGate.plan(!outside) === 'move'");
    expect(d).toContain('this.armourPick = true;');
    expect(d).toContain("this.setState('seekCover');");
    const p = body('pickCover');
    expect(p).toContain('this.ctx.ballistics.armouredFirst(this.fireFrom, t.target.aimPoint(this.fireTo), MASK.ENEMY_SHOT)');
    expect(p).toContain('casts >= ARMOUR_FIRE.coverCasts');
  });

  it('(merge with S8) the role step runs before the armour check; a reposition blocks the cover it leaves for the role picks', () => {
    const d = body('decide');
    const role = d.indexOf('const g = this.roleStep(dt, toTarget);');
    const arm = d.indexOf("this.fireGate.plan(!outside) === 'move'");
    expect(role).toBeGreaterThan(0);
    expect(arm).toBeGreaterThan(role);
    const block = d.slice(arm, d.indexOf("this.setState('seekCover');", arm));
    expect(block).toContain('this.ctx.blockCover?.(this.coverIdx);');
    expect(block).toContain('this.roleCover = -1;');
    expect(body('boundTo')).toContain('this.armourPick = false;');
  });
});
