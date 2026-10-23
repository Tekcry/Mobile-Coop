import { describe, expect, it, vi } from 'vitest';
import { Enemy, type AiContext } from '../src/ai/enemy';
import { EnemyManager } from '../src/ai/enemyManager';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { DIFFICULTY } from '../src/ai/archetypes';
import { GEAR } from '../src/ai/gear';
import { HELMET_DROP, HelmetDrops, helmetArc } from '../src/ai/helmetDrops';
import { BARKS } from '../src/ai/barks';
import { Health } from '../src/game/health';
import { Vector3, type InstancedMesh, type Scene } from '../src/core/babylon';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { PartLibrary } from '../src/world/partLibrary';

// (guard-ai S12) Helmets and body armour wired into Enemy.applyDamage through `gearHit` (S11), on a stand-in guard
// built on Enemy's prototype (no rig, no scene): a helmeted guard lives through the first head bullet (helmet off,
// staggered, a deflect) and dies to the second; an armoured guard takes five body bullets, staggered at most once per
// `GEAR.staggerCd`; melee, takedowns, sleep bolts and explosions ignore gear; the heavy keeps his plates; `placeSlot`
// reads the slot tag and the section default; a woken guard keeps his gear; the dropped-helmet pool.

interface FakeMesh {
  isVisible: boolean;
  isPickable: boolean;
  parent: unknown;
  scaling: Vector3;
  position: Vector3;
  rotation: Vector3;
}

const mesh = (): FakeMesh => ({ isVisible: true, isPickable: true, parent: null, scaling: new Vector3(), position: new Vector3(), rotation: new Vector3() });

/** A part library stand-in: every instance a plain object (counted). */
function fakeParts() {
  const made: FakeMesh[] = [];
  const parts = { instance: vi.fn(() => { const m = mesh(); made.push(m); return m; }) };
  return { parts: parts as unknown as PartLibrary, made };
}

/** A stand-in guard on Enemy's prototype: the fields applyDamage, the gear and the stagger read. */
function guard(kind: EnemyKind = 'grunt') {
  const { parts, made } = fakeParts();
  const ctx = {
    vfx: { sparks: vi.fn() },
    dropHelmet: vi.fn(),
    world: { parts, addShadowCaster: vi.fn(), map: { theme: { faction: 'urban' } } },
  };
  const e = Object.create(Enemy.prototype) as Enemy;
  const aware = { alert: false };
  Object.assign(e, {
    ctx,
    def: ENEMIES[kind],
    health: new Health(ENEMIES[kind].hp),
    aware,
    helmet: false,
    armour: false,
    sinceStagger: 1e9,
    helmetPart: null,
    armourParts: null,
    gearHex: '',
    dog: null,
    taken: false,
    state: 'idle',
    stagger: 0,
    strikeStaggerT: 0,
    burstLeft: 3,
    windup: 0.2,
    flash: 0,
    stimulus: [0, 0],
    hasStimulus: false,
    lastKnown: new Vector3(),
    lastSeenT: 9,
    yaw: 0,
    pos: new Vector3(4, 0, 6),
    vel: new Vector3(1, 0, 1),
    tmpN: new Vector3(),
    rig: { p: { head: { w: 0.2, h: 0.25, d: 0.22 }, chest: { w: 0.36, d: 0.22 }, upperArm: { r0: 0.05 } }, headNode: {}, torso: {}, shoulderL: {}, shoulderR: {} },
    alert: vi.fn(() => (aware.alert = true)),
    bark: vi.fn(),
    die: vi.fn(),
    knockOut: vi.fn(),
  });
  const p = e as unknown as { stagger: number; burstLeft: number; windup: number; helmetPart: FakeMesh | null; armourParts: FakeMesh[] | null; flash: number };
  return { e, ctx, p, made };
}

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
/** A player's bullet (or another kind) to `part`, travelling +z from a shooter at (4, 1.5, -10). */
function hit(part: 'head' | 'body', kind: HitInfo['kind'] = 'bullet', o: Partial<HitInfo> = {}): HitInfo {
  return { amount: 30, point: V(4, 1.6, 6), dir: V(0, 0, 1), part, kind, attackerTeam: 'player', attackerId: 'local', sourcePos: V(4, 1.5, -10), impulse: 1, ...o };
}

describe('helmet (item 2, A35)', () => {
  it('the first head bullet: no damage, helmet off (hidden, dropped at his feet), staggered, a deflect; the second kills', () => {
    const { e, ctx, p } = guard();
    e.setGear({ helmet: true, armour: false });
    expect(p.helmetPart?.isVisible).toBe(true);
    const hp = e.health.hp;
    const r = e.applyDamage(hit('head'));
    expect(r).toEqual({ dealt: 0, killed: false, deflect: true });
    expect(e.health.hp).toBe(hp);
    expect(e.helmet).toBe(false);
    expect(p.helmetPart?.isVisible).toBe(false);
    expect(ctx.dropHelmet).toHaveBeenCalledTimes(1);
    const [x, y, z, top, dx, dz] = ctx.dropHelmet.mock.calls[0]! as number[];
    expect([x, y, z, dx, dz]).toEqual([4, 0, 6, 0, 1]);
    expect(top).toBeGreaterThan(1.5);
    // the strike stagger: GEAR.helmetStagger, no fire (burst and wind-up dropped), then the "I'm hit" path
    expect(p.stagger).toBeCloseTo(GEAR.helmetStagger, 6);
    expect([p.burstLeft, p.windup]).toEqual([0, 0]);
    expect(e.alert).toHaveBeenCalled();
    expect((e as unknown as { lastKnown: Vector3 }).lastKnown.z).toBe(-10);
    expect(ctx.vfx.sparks).toHaveBeenCalled();
    expect(e.bark).toHaveBeenCalledWith('deflect');
    // the second head bullet kills as today
    const r2 = e.applyDamage(hit('head'));
    expect(r2.killed).toBe(true);
    expect(r2.deflect).toBeUndefined();
    expect(ctx.dropHelmet).toHaveBeenCalledTimes(1);
  });

  it('a body bullet on a helmeted guard (no armour) deals damage as before', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: false });
    const r = e.applyDamage(hit('body'));
    expect(r.dealt).toBe(30);
    expect(e.helmet).toBe(true);
  });

  it('no gear: one head bullet kills (unchanged)', () => {
    const { e } = guard();
    e.setGear({ helmet: false, armour: false });
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });
});

describe('body armour (item 13, A36)', () => {
  it('five body bullets: alive, no damage, staggered at most once per GEAR.staggerCd', () => {
    const { e, p } = guard();
    e.setGear({ helmet: false, armour: true });
    const spy = vi.spyOn(e, 'strikeStagger');
    const hp = e.health.hp;
    const at: number[] = [];
    let t = 0;
    for (let i = 0; i < 5; i++) {
      const before = spy.mock.calls.length;
      const r = e.applyDamage(hit('body'));
      expect(r).toEqual({ dealt: 0, killed: false, deflect: true });
      if (spy.mock.calls.length > before) at.push(t);
      // 0.5 s between rounds (the update clock)
      t += 0.5;
      e.sinceStagger += 0.5;
      p.stagger = Math.max(0, p.stagger - 0.5);
    }
    expect(e.alive).toBe(true);
    expect(e.health.hp).toBe(hp);
    expect(at).toEqual([0, 1.5]);
    for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBeGreaterThanOrEqual(GEAR.staggerCd);
    expect(spy.mock.calls[0]![0]).toBe(GEAR.armourStagger);
  });

  it('armour without a helmet: one head bullet kills', () => {
    const { e } = guard();
    e.setGear({ helmet: false, armour: true });
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });

  it('both: head soaks once, body stops every round', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: true });
    expect(e.applyDamage(hit('head')).deflect).toBe(true);
    expect(e.applyDamage(hit('body')).deflect).toBe(true);
    expect(e.applyDamage(hit('body')).deflect).toBe(true);
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });
});

describe('gear ignores everything but bullets', () => {
  it('a takedown (melee, 9999) kills a helmeted, armoured guard in one move', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: true });
    const r = e.applyDamage(hit('body', 'melee', { amount: 9999, takedown: 'behind' }));
    expect(r.killed).toBe(true);
    expect(r.deflect).toBeUndefined();
  });

  it('melee to the head: the helmet stays on and the hit lands', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: true });
    const r = e.applyDamage(hit('head', 'melee'));
    expect(r.dealt).toBeGreaterThan(0);
    expect(e.helmet).toBe(true);
  });

  it('a sleep bolt knocks him out (nonLethal), gear untouched', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: true });
    const r = e.applyDamage(hit('head', 'bullet', { nonLethal: true }));
    expect(e.knockOut).toHaveBeenCalledTimes(1);
    expect(r.killed).toBe(true);
    expect(r.deflect).toBeUndefined();
    expect(e.helmet).toBe(true);
  });

  it('an explosion hurts an armoured guard as before', () => {
    const { e } = guard();
    e.setGear({ helmet: true, armour: true });
    const r = e.applyDamage(hit('body', 'explosion', { amount: 40 }));
    expect(r.dealt).toBe(40);
    expect(r.deflect).toBeUndefined();
    expect(e.helmet).toBe(true);
  });

  it('the heavy keeps his own plates (gear never read)', () => {
    const { e } = guard('heavy');
    e.setGear({ helmet: true, armour: true });
    const r = e.applyDamage(hit('body'));
    expect(r.deflect).toBeUndefined();
    expect(e.helmet).toBe(true);
  });
});

describe('gear parts (A45)', () => {
  it('built once on first use, then only toggled; none for a guard without gear', () => {
    const { e, made, p } = guard();
    e.setGear({ helmet: false, armour: false });
    expect(made.length).toBe(0);
    e.setGear({ helmet: true, armour: true });
    expect(made.length).toBe(5); // a helmet, two plates, two shoulder caps
    e.setGear({ helmet: false, armour: false });
    e.setGear({ helmet: true, armour: true });
    expect(made.length).toBe(5);
    expect(p.helmetPart?.isVisible).toBe(true);
    expect(p.armourParts?.every((m) => m.isVisible)).toBe(true);
    e.setGear({ helmet: false, armour: true });
    expect(p.helmetPart?.isVisible).toBe(false);
  });

  it('a deflect bark exists', () => {
    expect(BARKS.deflect.length).toBeGreaterThan(0);
  });
});

function manager(parts?: PartLibrary) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    parts,
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
}

describe('placeSlot gear (slot tag + SectorDef.gear)', () => {
  const placed = (tag: 'helmet' | 'armour' | 'both' | undefined, section: 'helmet' | 'armour' | 'both' | undefined) => {
    const em = manager();
    const { e } = guard();
    Object.assign(e, { setPost: vi.fn() });
    em.placeSlot(e, { yaw: 0, gear: tag }, 0, undefined, -1, section);
    return [e.helmet, e.armour];
  };

  it('no tag, no section default: no gear (Marlow Yard, the early sections)', () => {
    expect(placed(undefined, undefined)).toEqual([false, false]);
  });

  it('the slot tag', () => {
    expect(placed('helmet', undefined)).toEqual([true, false]);
    expect(placed('armour', undefined)).toEqual([false, true]);
    expect(placed('both', undefined)).toEqual([true, true]);
  });

  it('the section default, merged with the tag', () => {
    expect(placed(undefined, 'armour')).toEqual([false, true]);
    expect(placed('helmet', 'armour')).toEqual([true, true]);
    expect(placed(undefined, 'both')).toEqual([true, true]);
  });
});

describe('a woken guard keeps his gear (Enemy.inherit)', () => {
  it('a helmet shot off before the knockout stays off; the vest stays on', () => {
    const old = { key: 3, squad: 1, hold: null, passive: false, info: null, post: [4, 5], postDef: null, postYaw: 1, section: 2, profile: 'standard', tacticsProfile: 0, walker: { tick: vi.fn(), rejoin: vi.fn() }, helmet: false, armour: true };
    const { e, p } = guard();
    Object.assign(e, { post: [0, 0], setPost: vi.fn(), setCaution: vi.fn() });
    e.inherit(old as unknown as Enemy, 0);
    expect([e.helmet, e.armour]).toEqual([false, true]);
    expect(p.armourParts?.every((m) => m.isVisible)).toBe(true);
    expect(p.helmetPart).toBeNull();
  });
});

describe('dropped helmets (HelmetDrops)', () => {
  it('the arc: from the head to the floor beside his feet, flung along the shot', () => {
    const out = [0, 0, 0, 0, 0];
    helmetArc(1, 0, 2, 1.7, 0.1, 0, 1, 0, out);
    expect(out.slice(0, 3)).toEqual([1, 1.7, 2]);
    helmetArc(1, 0, 2, 1.7, 0.1, 0, 1, 1, out);
    expect(out[0]).toBeCloseTo(1, 9);
    expect(out[1]).toBeCloseTo(0.1, 9);
    expect(out[2]).toBeCloseTo(2 + HELMET_DROP.fling, 9);
  });

  it('a pool of HELMET_DROP.pool, reused oldest first; tumbles HELMET_DROP.tumble s, then rests; clear hides them', () => {
    const { parts, made } = fakeParts();
    const d = new HelmetDrops(parts, vi.fn() as unknown as (m: InstancedMesh) => void);
    for (let i = 0; i < HELMET_DROP.pool + 1; i++) d.drop(i, 0, 0, 1.7, 0, 1, '#222222', 0.25, 0.2, 0.26);
    expect(made.length).toBe(HELMET_DROP.pool);
    // the ninth reused the first
    expect(made[0]!.position.x).toBe(HELMET_DROP.pool);
    d.update(HELMET_DROP.tumble + 0.1);
    expect(made[0]!.position.y).toBeCloseTo(0.2 * 0.45, 6);
    const y = made[0]!.position.y;
    d.update(1);
    expect(made[0]!.position.y).toBe(y);
    expect(d.shown).toBe(HELMET_DROP.pool);
    d.clear();
    expect(d.shown).toBe(0);
    d.drop(0, 0, 0, 1.7, 0, 1, '#222222', 0.25, 0.2, 0.26);
    expect(made.length).toBe(HELMET_DROP.pool);
  });

  it("the manager's ctx drops into its pool; clear() empties it", () => {
    const { parts } = fakeParts();
    const em = manager(parts);
    const ctx = (em as unknown as { ctx: AiContext }).ctx;
    ctx.dropHelmet!(0, 0, 0, 1.7, 0, 1, '#222222', 0.25, 0.2, 0.26);
    expect(em.helmetDrops.shown).toBe(1);
    em.clear();
    expect(em.helmetDrops.shown).toBe(0);
  });
});
