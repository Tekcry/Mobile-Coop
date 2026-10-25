import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { EnemyManager } from '../src/ai/enemyManager';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { DIFFICULTIES, DIFFICULTY, type DifficultyPreset } from '../src/ai/archetypes';
import { GEAR } from '../src/ai/gear';
import { Health } from '../src/game/health';
import { Vector3, type Scene } from '../src/core/babylon';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { PartLibrary } from '../src/world/partLibrary';
import type { Body } from '../src/ai/body';
import type * as EnemyModule from '../src/ai/enemy';

// `EnemyManager.revive` builds the woken guard with `new Enemy`: here a stand-in on the real prototype (`guard`), so the
// test drives `revive` itself (its stage gear and `ruleHelmet` call).
const made = vi.hoisted(() => ({ make: null as ((kind: EnemyKind) => unknown) | null }));
vi.mock('../src/ai/enemy', async (importOriginal) => {
  const m = await importOriginal<typeof EnemyModule>();
  const Enemy = function (_ctx: unknown, def: { kind: EnemyKind }) {
    return made.make!(def.kind);
  };
  Enemy.prototype = m.Enemy.prototype;
  Object.setPrototypeOf(Enemy, m.Enemy);
  return { ...m, Enemy };
});

// (guard-rules S1, G350, BRIEF M4, A1-A3) Helmets by difficulty: Rookie / Normal bare-headed until alarm stage 2 (then
// armour and a helmet), Realistic and Perfectionist helmeted from placement; Perfectionist's helmets locked (whatever gave
// them: the difficulty, the stage, the shield lead): the first headshot is soaked (a stagger, the helmet stays on), the
// second kills, a woken guard keeps his soak. Only when the mode asks (`useDifficultyHelmets`, Sector Ops). A dog never
// wears gear. Stand-in guards on Enemy's prototype (the real `setGear`, `applyDamage`, `inherit`) and the real manager.

/** A stand-in guard on Enemy's prototype: what placeSlot, the gear and applyDamage read (as `gearWiring.test.ts`). */
function guard(kind: EnemyKind = 'grunt') {
  const parts = { instance: vi.fn(() => ({ isVisible: true, isPickable: true, parent: null, scaling: new Vector3(), position: new Vector3(), rotation: new Vector3() })) };
  const ctx = {
    vfx: { sparks: vi.fn() },
    dropHelmet: vi.fn(),
    world: { parts: parts as unknown as PartLibrary, addShadowCaster: vi.fn(), map: { theme: { faction: 'urban' } } },
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
    helmetLocked: false,
    helmetSoaked: false,
    sinceStagger: 1e9,
    helmetPart: null,
    armourParts: null,
    gearHex: '',
    dog: ENEMIES[kind].quadruped ? {} : null,
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
    post: [0, 0],
    rig: { p: { head: { w: 0.2, h: 0.25, d: 0.22 }, chest: { w: 0.36, d: 0.22 }, upperArm: { r0: 0.05 } }, headNode: {}, torso: {}, shoulderL: {}, shoulderR: {} },
    alert: vi.fn(() => (aware.alert = true)),
    bark: vi.fn(),
    die: vi.fn(),
    knockOut: vi.fn(),
    setPost: vi.fn(),
    setCaution: vi.fn(),
  });
  return { e, ctx };
}

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
/** A player's bullet to `part`. */
const hit = (part: 'head' | 'body'): HitInfo => ({ amount: 30, point: V(4, 1.6, 6), dir: V(0, 0, 1), part, kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: V(4, 1.5, -10), impulse: 1 });

/** The real manager on a stand-in world at difficulty `d`, with the difficulty helmet rule on (`use`, Sector Ops). */
function manager(d: DifficultyPreset, use = true) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    addShadowCaster: vi.fn(),
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn() } as unknown as Ballistics, {} as Vfx, DIFFICULTY[d], () => []);
  if (use) em.useDifficultyHelmets();
  return em;
}

/** A guard placed by the manager (no tag, no section gear, the manager's stage). */
function placed(em: EnemyManager, kind: EnemyKind = 'grunt') {
  const g = guard(kind);
  em.placeSlot(g.e, { yaw: 0 }, 0);
  em.enemies.push(g.e);
  return g;
}

/** The woken guard (`EnemyManager.revive` on his knocked-out body): `inherit` of the old self, the stage gear, the
 *  difficulty lock. */
function revived(em: EnemyManager, old: Enemy) {
  let g: ReturnType<typeof guard> | null = null;
  made.make = (kind) => (g = guard(kind)).e;
  const guardOld = Object.assign(Object.create(old), { walker: { tick: vi.fn(), rejoin: vi.fn() }, postDef: null, postYaw: 0 });
  const b = { present: true, lethal: false, guard: guardOld, def: old.def, pos: old.pos.clone(), age: 0 } as unknown as Body;
  (em as unknown as { revive(b: Body): void }).revive(b);
  expect(em.enemies).toContain(g!.e);
  return g!;
}

describe('the difficulty table', () => {
  it('rookie / normal stage, realistic always, perfectionist locked', () => {
    expect(DIFFICULTIES.map((d) => DIFFICULTY[d].helmets)).toEqual(['stage', 'stage', 'always', 'locked']);
    expect(GEAR.lockHelmets).toBe(true);
  });
});

describe('at placement', () => {
  it('Rookie / Normal: bare-headed; Realistic: helmeted; Perfectionist: helmeted and locked', () => {
    const at = (d: DifficultyPreset) => {
      const { e } = placed(manager(d));
      return [e.helmet, e.armour, e.helmetLocked];
    };
    expect(at('rookie')).toEqual([false, false, false]);
    expect(at('normal')).toEqual([false, false, false]);
    expect(at('realistic')).toEqual([true, false, false]);
    expect(at('perfectionist')).toEqual([true, false, true]);
  });

  it('a slot armour tag keeps its armour under the difficulty helmet', () => {
    const em = manager('realistic');
    const { e } = guard();
    em.placeSlot(e, { yaw: 0, gear: 'armour' }, 0);
    expect([e.helmet, e.armour]).toEqual([true, true]);
  });

  it('off unless the mode asks (Marlow Yard, the parked modes): Perfectionist places bare-headed, unlocked', () => {
    const { e } = placed(manager('perfectionist', false));
    expect([e.helmet, e.helmetLocked]).toEqual([false, false]);
    const em = manager('perfectionist');
    em.useDifficultyHelmets(false);
    expect(em.helmetRule).toBe('stage');
    expect(placed(em).e.helmet).toBe(false);
  });

  it('a dog never wears gear or a lock, on any difficulty and at any stage', () => {
    for (const d of DIFFICULTIES) {
      const em = manager(d);
      em.setAlarmStage(3, false);
      const { e } = placed(em, 'dog');
      expect([e.helmet, e.armour, e.helmetLocked], d).toEqual([false, false, false]);
    }
  });

  it('a placement resets the soak', () => {
    const em = manager('perfectionist');
    const { e } = guard();
    e.helmetSoaked = true;
    em.placeSlot(e, { yaw: 0 }, 0);
    expect(e.helmetSoaked).toBe(false);
  });
});

describe('the alarm stage (A3)', () => {
  it('Rookie / Normal: bare-headed at stage 1, armour and a helmet from stage 2 (a rise and a later spawn)', () => {
    for (const d of ['rookie', 'normal'] as const) {
      const em = manager(d);
      const { e: a } = placed(em);
      em.setAlarmStage(1);
      expect([a.helmet, a.armour], d).toEqual([false, false]);
      em.setAlarmStage(2);
      expect([a.helmet, a.armour, a.helmetLocked], d).toEqual([true, true, false]);
      const { e: b } = placed(em);
      expect([b.helmet, b.armour], d).toEqual([true, true]);
    }
  });

  it('Perfectionist: the stage helmet is locked too', () => {
    const em = manager('perfectionist');
    em.setAlarmStage(2, false);
    const { e } = placed(em);
    expect([e.helmet, e.armour, e.helmetLocked]).toEqual([true, true, true]);
  });
});

describe('team join (the shield lead)', () => {
  it("the shield guard's helmet: locked on Perfectionist, a plain helmet on Normal", () => {
    for (const [d, lock] of [['normal', false], ['perfectionist', true]] as const) {
      const em = manager(d);
      const { e } = placed(em, 'enforcer');
      em.joinTeam(e, em.newTeam(0, null, [], []));
      expect([e.helmet, e.helmetLocked], d).toEqual([true, lock]);
    }
  });
});

describe('Perfectionist: never shot off, the second headshot kills (A2)', () => {
  it('the first head bullet: no damage, a stagger, a deflect, the helmet stays on (not dropped); the second kills', () => {
    const { e, ctx } = placed(manager('perfectionist'));
    const hp = e.health.hp;
    const r = e.applyDamage(hit('head'));
    expect(r).toEqual({ dealt: 0, killed: false, deflect: true });
    expect(e.health.hp).toBe(hp);
    expect([e.helmet, e.helmetSoaked]).toEqual([true, true]);
    expect(ctx.dropHelmet).not.toHaveBeenCalled();
    expect((e as unknown as { stagger: number }).stagger).toBeCloseTo(GEAR.helmetStagger, 6);
    const r2 = e.applyDamage(hit('head'));
    expect(r2.killed).toBe(true);
    expect(r2.deflect).toBeUndefined();
    expect(e.helmet).toBe(true);
    expect(ctx.dropHelmet).not.toHaveBeenCalled();
  });

  it('Realistic: the first head bullet knocks the helmet off (as today)', () => {
    const { e, ctx } = placed(manager('realistic'));
    expect(e.applyDamage(hit('head')).deflect).toBe(true);
    expect(e.helmet).toBe(false);
    expect(ctx.dropHelmet).toHaveBeenCalledTimes(1);
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });

  it('a woken guard keeps his helmet, its lock and its soak: his next headshot kills', () => {
    const em = manager('perfectionist');
    const { e: old } = placed(em);
    old.applyDamage(hit('head'));
    expect(old.helmetSoaked).toBe(true);
    const { e } = revived(em, old);
    expect([e.helmet, e.helmetLocked, e.helmetSoaked]).toEqual([true, true, true]);
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });

  it('a woken guard who soaked nothing still soaks one', () => {
    const em = manager('perfectionist');
    const { e: old } = placed(em);
    const { e } = revived(em, old);
    expect([e.helmet, e.helmetLocked, e.helmetSoaked]).toEqual([true, true, false]);
    expect(e.applyDamage(hit('head')).deflect).toBe(true);
    expect(e.applyDamage(hit('head')).killed).toBe(true);
  });

  it('revive applies the difficulty lock itself: an old self placed before the rule (unlocked) wakes locked', () => {
    const em = manager('perfectionist', false);
    const { e: old } = placed(em);
    expect(old.helmetLocked).toBe(false);
    em.useDifficultyHelmets();
    const { e } = revived(em, old);
    expect(e.helmetLocked).toBe(true);
  });

  it('body armour and other hits are unchanged by the lock', () => {
    const em = manager('perfectionist');
    em.setAlarmStage(2, false);
    const { e } = placed(em);
    expect(e.applyDamage(hit('body')).dealt).toBe(0);
    expect(e.helmetSoaked).toBe(false);
  });
});
