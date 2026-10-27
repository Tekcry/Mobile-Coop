import { describe, expect, it, vi } from 'vitest';
import { Enemy, RISE_NONE, RISE_SIGHT, type PlayerRef } from '../src/ai/enemy';
import { EnemyManager } from '../src/ai/enemyManager';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { PERCEPTION } from '../src/ai/perception';
import { PERCEIVE } from '../src/ai/targetPick';
import { SHADOW_NOTICE } from '../src/ai/shadowNotice';
import { OCC_FAR } from '../src/ai/guardOccluders';
import { P_STANDARD } from '../src/ai/squadRoles';
import { SEARCH_PLAIN } from '../src/ai/response';
import { DIFFICULTY } from '../src/ai/archetypes';
import { FILL_IN } from '../src/game/charOccluderFill';
import { CharOccluders, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { CUE, ShadowCues, type CueField } from '../src/world/shadowCues';
import { Vector3, type Scene } from '../src/core/babylon';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { World } from '../src/world/world';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// (guard-ai-j16 G3, G379 "A faint cue") The shadow cue wired into the real `Enemy.perceive` (its tail calls
// `shadowLook`) and the real `updateAwareness` / `AlertMachine`, on a stand-in guard built on Enemy's prototype (no rig,
// no scene; as tests/coopPerception.test.ts and tests/barkCause.test.ts), with a real `ShadowCues` whose arrays are
// written directly. The manager side: `fillOccluders`, the owner keys in the light reads, the `AiContext` getters.

const DT = 0.05;
/** The think interval the stepped runs use (the real one is 0.22-0.30 s). */
const THINK = 0.25;

interface Pl {
  ref: PlayerRef;
  /** Body points behind a wall (the ray to them is blocked). */
  hidden: { chest: boolean; head: boolean; hips: boolean };
}

/** A player at (x, z): chest 1.25 m, head 1.6 m above the feet. `light`: the owner's sample (absent: the field's). */
function player(id: string, x: number, z: number, o: { light?: number; hidden?: boolean } = {}): Pl {
  const feet = new Vector3(x, 0, z);
  const target = {
    alive: true,
    team: 'player',
    aimPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.25, feet.z),
    headPoint: (out: Vector3) => out.set(feet.x, feet.y + 1.6, feet.z),
  };
  const ref = { id, target, feet, speed: 1, crouched: false, light: o.light } as unknown as PlayerRef;
  const h = o.hidden ?? false;
  return { ref, hidden: { chest: h, head: h, hips: h } };
}

/** The ray stub, on `losClear`'s `hitDistance` path (no allocation): blocked 0.5 m from the eye when it ends on a hidden
 *  body point, or on a floor point (y < 0.5) while `floor.blocked`. Counts the floor rays. */
function ballistics(pls: Pl[]) {
  const floor = { blocked: false, rays: 0, x: 0, y: 0, z: 0 };
  const hitDistance = (_from: Vector3, to: Vector3): number => {
    if (to.y < 0.5) {
      floor.rays++;
      floor.x = to.x;
      floor.y = to.y;
      floor.z = to.z;
      return floor.blocked ? 0 : 1e9;
    }
    for (let i = 0; i < pls.length; i++) {
      const p = pls[i]!;
      if (Math.abs(to.x - p.ref.feet.x) > 1e-6 || Math.abs(to.z - p.ref.feet.z) > 1e-6) continue;
      const dy = to.y - p.ref.feet.y;
      const hid = Math.abs(dy - 1.25) < 1e-6 ? p.hidden.chest : Math.abs(dy - 1.6) < 1e-6 ? p.hidden.head : p.hidden.hips;
      if (hid) return 0;
    }
    return 1e9;
  };
  return { b: { hitDistance, ray: () => ({ hit: false, distance: 0 }) }, floor };
}

/** A real `ShadowCues` (no fill): slot s is player `ids[s]`, with one footprint of three points. */
function cuesFor(ids: string[]): ShadowCues {
  const c = new ShadowCues({} as CueField, [], null);
  const w = c as unknown as { ids: string[]; n: number };
  for (let s = 0; s < ids.length; s++) w.ids[s] = ids[s]!;
  w.n = ids.length;
  return c;
}

/** Slot `s`'s footprint 0: points at (x, 0.05, z0 + k) for k = 0, 1, 2, contrast `q`, speed `v`. */
function footprint(c: ShadowCues, s: number, x: number, z0: number, q = 0.6, v = 1): void {
  c.count[s] = 1;
  c.speed[s * CUE.sources] = v;
  for (let k = 0; k < CUE.points; k++) {
    const o = (s * CUE.sources * CUE.points + k) * 4;
    c.pts[o] = x;
    c.pts[o + 1] = 0.05;
    c.pts[o + 2] = z0 + k;
    c.pts[o + 3] = q;
  }
}

type Priv = {
  aware: AlertMachine;
  meter: number;
  rate: number;
  turnT: number;
  incident: number;
  passive: boolean;
  dog: object | null;
  stimulus: [number, number];
  hasStimulus: boolean;
  target: PlayerRef | null;
  lastKnown: Vector3;
  sawOnce: boolean;
  heard: boolean;
  heardMoment: boolean;
  brkGroup: number;
  cueQuiet: boolean;
  cueTurn: boolean;
  raysThink: number;
  riseCause: number;
  riseN: number;
  cueT: number;
  cueX: number;
  cueZ: number;
  cueSlot: number;
  bark: ReturnType<typeof vi.fn>;
  perceive(): void;
  updateAwareness(dt: number): void;
};

interface GuardOpts {
  /** The cues the context returns; `undefined`: the context has no `cues` getter at all. */
  cues?: ShadowCues | null;
  chars?: CharOccluders | null;
  ctx?: Record<string, unknown>;
  field?: number;
}

/**
 * An object on `proto` with `fields`, built by a constructor of named stores (`this.k = src.k`), as a class's own
 * initialisers would: fast properties whose doubles are stored in place. (`Object.assign` of this many fields onto
 * `Object.create(proto)` leaves a dictionary-mode object, and the prototype trick back to fast gives tagged fields,
 * where every double store boxes 16 B: the allocation test would read the stand-in, not the code.) One constructor per
 * field list, so every stand-in shares one map as a class's instances do (a new constructor per guard gave each its own
 * map, and after a few dozen guards the stores in `shadowLook` went megamorphic and boxed: G3 fix round).
 */
const STAND_INS = new Map<string, new (s: object) => object>();
function standIn(proto: object, fields: Record<string, unknown>): object {
  const keys = Object.keys(fields);
  const key = keys.join(',');
  let C = STAND_INS.get(key);
  if (!C) {
    C = new Function('s', keys.map((k) => `this.${k} = s.${k};`).join(' ')) as unknown as new (s: object) => object;
    C.prototype = proto;
    STAND_INS.set(key, C);
  }
  return new C(fields);
}

/** A stand-in guard at the origin facing +z (yaw 0): the fields `perceive`, `shadowLook` and `updateAwareness` read. */
function guard(pls: Pl[], o: GuardOpts = {}) {
  const { b, floor } = ballistics(pls);
  const totalAt = vi.fn((..._a: unknown[]) => o.field ?? 0.5);
  const refs = pls.map((p) => p.ref);
  const ctx: Record<string, unknown> = o.ctx ?? {
    rooms: [],
    players: () => refs,
    world: { lightField: { totalAt } },
    ballistics: b,
    diff: { perception: 1, reaction: 1 },
    reportSighting: vi.fn(),
    bodies: () => [],
    coordinated: () => true,
    stealth: () => true,
    lkpValid: () => false,
    searchSlot: () => 0,
    nav: { nearestWalkable: () => -1 },
  };
  if (!o.ctx) {
    if (o.cues !== undefined) ctx.cues = () => o.cues;
    if (o.chars !== undefined) ctx.chars = () => o.chars;
  }
  const e = standIn(Enemy.prototype, {
    ctx,
    num: 1,
    pos: new Vector3(0, 0, 0),
    yaw: 0,
    crouch: 0,
    def: { scale: 1, melee: false, walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt' },
    dog: null,
    aware: new AlertMachine(),
    alertIn: emptyAlertInput(),
    health: { alive: true },
    passive: false,
    taken: false,
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
    sinceSeen: 99,
    lastKnown: new Vector3(),
    lastSeenT: 99,
    sawOnce: false,
    tmp: new Vector3(),
    tmpEye: new Vector3(),
    tmpHead: new Vector3(),
    tmpHips: new Vector3(),
    sight: { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 0, sensitivity: 1, pitch: 0 },
    stimulus: [0, 0],
    hasStimulus: false,
    hunt: -1,
    perRR: 0,
    raysThink: 0,
    raysStep: 0,
    // updateAwareness (as tests/barkCause.test.ts)
    called: 0,
    heard: false,
    gunfire: false,
    loudAlert: false,
    alarm: null,
    state: 'idle',
    incident: -1,
    incMode: 0,
    incCalm: false,
    turnT: 0,
    caution: 0,
    responder: false,
    tacticsProfile: P_STANDARD,
    brkGroup: -1,
    closingIn: false,
    searchReq: false,
    searchKind: SEARCH_PLAIN,
    camBody: null,
    spotArrived: false,
    pendingHunt: -1,
    calledMask: 0,
    lc: { active: false, stop() {}, start() {} },
    lure: { cancel() {}, active: false },
    setState() {},
    walker: { rejoin() {} },
    bark: vi.fn(),
    sawMoment: false,
    heardMoment: false,
    quietRise: false,
    riseCause: RISE_NONE,
    riseN: 0,
    // (G3) the cue's fields (no initializers run on Object.create)
    cueT: Infinity,
    cueX: 0,
    cueZ: 0,
    cueSlot: -1,
    cueOut: new Float64Array(7),
    cueBest: new Float64Array(7),
    cueV: new Vector3(),
    cueRise: false,
    // (fix 2) the cue-only episode and the cue's own look
    cueQuiet: false,
    cueTurn: false,
  }) as Enemy;
  return { e, p: e as unknown as Priv, ctx, floor, totalAt };
}

/** Step `s` seconds: a think every `THINK` (perceive, with the cue at its tail), `updateAwareness` every `DT`. Calls
 *  `seen(level)` each step; returns the highest meter. */
function run(p: Priv, s: number, seen: (lvl: string) => void, think = { t: 0 }): number {
  let top = 0;
  const steps = Math.round(s / DT);
  for (let k = 0; k < steps; k++) {
    think.t -= DT;
    if (think.t <= 0) {
      think.t += THINK;
      p.perceive();
    }
    p.updateAwareness(DT);
    (p as unknown as { cueT: number }).cueT += DT;
    if (p.meter > top) top = p.meter;
    seen(p.aware.level);
  }
  return top;
}

// A behind him at 5 m (outside his field: no rays, rate 0); A's moving shadow on the floor ahead at 4-6 m.
function scene(o: GuardOpts = {}) {
  const A = player('a', 0, -5, { light: 0.3 });
  const cues = o.cues === undefined ? cuesFor(['a']) : o.cues;
  if (cues) footprint(cues, 0, 0, 4);
  return { A, cues, ...guard([A], { ...o, cues }) };
}

describe('G3: the cue in perceive', () => {
  it('a calm guard turns to the nearest qualifying point: meter 0.35, stimulus, hearLook, one ray, the record', () => {
    const { p, floor } = scene();
    p.perceive();
    expect(p.meter).toBe(SHADOW_NOTICE.meter);
    expect(p.stimulus).toEqual([0, 4]);
    expect(p.hasStimulus).toBe(true);
    expect(p.turnT).toBe(ALERT.hearLook);
    expect(floor.rays).toBe(1);
    expect([floor.x, floor.y, floor.z]).toEqual([0, 0.05, 4].map((v) => Math.fround(v)));
    expect(p.raysThink).toBe(1);
    expect([p.cueT, p.cueX, p.cueZ, p.cueSlot]).toEqual([0, 0, 4, 0]);
    // never a sighting: no lastKnown, sawOnce or heard; the target is A only as the nearest (unseen)
    expect(p.sawOnce).toBe(false);
    expect(p.heard).toBe(false);
    expect(p.lastKnown.length()).toBe(0);
    expect(p.rate).toBe(0);
  });

  it('he goes suspicious silently (A5: the white arc only), cause none', () => {
    const { p } = scene();
    p.perceive();
    p.updateAwareness(DT);
    expect(p.aware.level).toBe('suspicious');
    expect(p.riseCause).toBe(RISE_NONE);
    expect(p.riseN).toBe(1);
    expect(p.bark).not.toHaveBeenCalled();
    // the hush is one step only: a later rise from the same calm moment barks again
    expect((p as unknown as { cueRise: boolean }).cueRise).toBe(false);
  });

  it('a hearTurn earlier the same step: the sound keeps his look (fix 2) and its rise barks (polish 1)', () => {
    const { p, e } = scene();
    e.hearTurn(6, 2, 20);
    expect(p.meter).toBeGreaterThanOrEqual(PERCEPTION.suspicious);
    p.perceive();
    // (fix 2) a hearing look in progress is not the cue's: no cue, the sound's spot and look stay
    expect(p.cueT).toBe(Infinity);
    expect(p.stimulus).toEqual([6, 2]);
    expect(p.turnT).toBe(ALERT.hearLook);
    p.updateAwareness(DT);
    expect(p.aware.level).toBe('suspicious');
    expect(p.riseCause).toBe(RISE_NONE);
    expect(p.bark).toHaveBeenCalledWith('suspicious');
  });

  it('a rise with no cue still barks (the hush is the cue only)', () => {
    const { p } = scene({ cues: null });
    p.meter = 0.4;
    p.updateAwareness(DT);
    expect(p.aware.level).toBe('suspicious');
    expect(p.bark).toHaveBeenCalledWith('suspicious');
  });

  it('no cues (null, or no getter): perceive is today\'s, no ray and nothing changes', () => {
    for (const cues of [null, undefined]) {
      const A = player('a', 0, -5, { light: 0.3 });
      const g = guard([A], cues === null ? { cues: null } : {});
      g.p.perceive();
      expect(g.p.meter).toBe(0);
      expect(g.p.hasStimulus).toBe(false);
      expect(g.p.turnT).toBe(0);
      expect(g.floor.rays).toBe(0);
      expect(g.p.raysThink).toBe(0);
      expect(g.p.cueT).toBe(Infinity);
    }
  });

  it('gates (A6): alerted, passive, a dog, an incident task, investigating, a glimpse moment, a lure: no reaction and no ray', () => {
    const cases: ((p: Priv) => void)[] = [
      (p) => p.aware.set('alert'),
      (p) => (p.passive = true),
      (p) => (p.dog = {}),
      (p) => (p.incident = 3),
      (p) => p.aware.set('investigating'),
      (p) => p.aware.set('searching'),
      // (fix 1) a calm moment resting on a glimpse keeps sight's look; (polish 5) a lured post keeps to his lure
      (p) => ((p as unknown as { sawMoment: boolean }).sawMoment = true),
      (p) => ((p as unknown as { lure: { active: boolean } }).lure.active = true),
      // (fix 2, check B polish 2) the breaker walk, as a lure
      (p) => (p.brkGroup = 0),
      // (fix 2, check B FIX 2) a sound's moment (a `hear` this step, or after it) and a hearing / ack look running
      (p) => (p.heard = true),
      (p) => (p.heardMoment = true),
      (p) => (p.turnT = 1),
    ];
    for (const set of cases) {
      const { p, floor } = scene();
      set(p);
      const turn = p.turnT;
      p.perceive();
      expect(p.turnT).toBe(turn);
      expect(p.cueT).toBe(Infinity);
      expect(floor.rays).toBe(0);
    }
    // the cue's own look running does not gate the next cue (repeated cues keep him looking)
    {
      const { p, floor } = scene();
      p.perceive();
      expect(p.cueTurn).toBe(true);
      p.turnT = 1;
      p.cueT = 0.5;
      p.perceive();
      expect(p.cueT).toBe(0);
      expect(p.turnT).toBe(ALERT.hearLook);
      expect(floor.rays).toBe(2);
    }
    // cooldown and suspicious do react
    for (const lvl of ['cooldown', 'suspicious'] as const) {
      const { p } = scene();
      p.aware.set(lvl);
      p.perceive();
      expect(p.cueT).toBe(0);
    }
  });

  it('a blocked ray: no reaction (the ray counted)', () => {
    const { p, floor } = scene();
    floor.blocked = true;
    p.perceive();
    expect(floor.rays).toBe(1);
    expect(p.raysThink).toBe(1);
    expect(p.meter).toBe(0);
    expect(p.turnT).toBe(0);
    expect(p.cueT).toBe(Infinity);
  });

  it('a still shadow (speed 0) or a faint one: no reaction, no ray', () => {
    for (const [q, v] of [
      [0.6, 0],
      [0.3, 1],
    ] as const) {
      const { p, cues, floor } = scene();
      footprint(cues!, 0, 0, 4, q, v);
      p.perceive();
      expect(p.cueT).toBe(Infinity);
      expect(floor.rays).toBe(0);
    }
  });

  it('a player he sees (rate above the leak): no cue, sight keeps his look', () => {
    // B lit in front at 8 m (seen); A's shadow still in view
    const A = player('a', 0, -5, { light: 0.3 });
    const B = player('b', 1, 8, { light: 1 });
    const cues = cuesFor(['a', 'b']);
    footprint(cues, 0, 0, 4);
    const { p } = guard([A, B], { cues });
    p.perceive();
    expect(p.rate).toBeGreaterThan(PERCEPTION.leak);
    expect(p.cueT).toBe(Infinity);
    expect(p.stimulus).toEqual([1, 8]);
  });

  it('a sub-leak glimpse of another player does not take his look off the shadow (item 6)', () => {
    // B in front at 9 m in a light low enough that his rate is above 0 and at most the leak
    const A = player('a', 0, -5, { light: 0.3 });
    let light = -1;
    for (let L = 0.3; L > 0.001; L *= 0.9) {
      const B = player('b', 3, 9, { light: L });
      const g = guard([A, B], { cues: null });
      g.p.perceive();
      if (g.p.rate > 0 && g.p.rate <= PERCEPTION.leak) {
        light = L;
        break;
      }
    }
    expect(light).toBeGreaterThan(0);
    const B = player('b', 3, 9, { light });
    const cues = cuesFor(['a', 'b']);
    footprint(cues, 0, 0, 4);
    const { p } = guard([A, B], { cues });
    p.perceive();
    expect(p.rate).toBeGreaterThan(0);
    expect(p.cueT).toBe(0);
    expect(p.stimulus).toEqual([p.cueX, p.cueZ]);
    expect(p.stimulus).toEqual([0, 4]);
  });

  it('the nearest point over the players wins', () => {
    const A = player('a', 0, -5, { light: 0.3 });
    const B = player('b', 2, -6, { light: 0.3 });
    const cues = cuesFor(['a', 'b']);
    footprint(cues, 0, 0, 5);
    footprint(cues, 1, 0.5, 3);
    const { p } = guard([A, B], { cues });
    p.perceive();
    expect([p.cueX, p.cueZ, p.cueSlot]).toEqual([Math.fround(0.5), 3, 1]);
  });

  it('3+ players: the cue ray only inside PERCEIVE.maxRays, counted there', () => {
    // three players in his field behind a wall (3 rays each, rate 0): the budget is full, no cue ray
    const hid = (id: string, x: number) => player(id, x, 6, { light: 0.3, hidden: true });
    const full = [hid('a', -1), hid('b', 0.5), hid('c', 1)];
    expect(3 * full.length).toBe(PERCEIVE.maxRays);
    const c1 = cuesFor(['a', 'b', 'c']);
    footprint(c1, 0, 0, 3);
    const g1 = guard(full, { cues: c1 });
    g1.p.perceive();
    expect(g1.p.raysThink).toBe(PERCEIVE.maxRays);
    expect(g1.floor.rays).toBe(0);
    expect(g1.p.cueT).toBe(Infinity);
    // one of them behind him (no rays): room for the cue ray
    const part = [hid('a', -1), hid('b', 0.5), player('c', 0, -5, { light: 0.3 })];
    const c2 = cuesFor(['a', 'b', 'c']);
    footprint(c2, 2, 0, 3);
    const g2 = guard(part, { cues: c2 });
    g2.p.perceive();
    expect(g2.floor.rays).toBe(1);
    expect(g2.p.raysThink).toBe(7);
    expect(g2.p.cueT).toBe(0);
  });
});

describe('G3: the cue never escalates (PLAN section 1, alertState stepped)', () => {
  it('30 s of repeated cues: suspicious, never investigating; after they stop he calms; no bark', () => {
    const { p, cues } = scene();
    const levels = new Set<string>();
    const top = run(p, 30, (l) => levels.add(l));
    expect(levels.has('suspicious')).toBe(true);
    expect(levels.has('investigating')).toBe(false);
    expect(levels.has('alert')).toBe(false);
    expect(top).toBeLessThanOrEqual(SHADOW_NOTICE.meter);
    expect(top).toBeLessThan(PERCEPTION.investigate);
    expect(p.aware.level).toBe('suspicious');
    // the cues stop (he stands still): he drains and calms, never walking over
    cues!.speed[0] = 0;
    const after = new Set<string>();
    run(p, 15, (l) => after.add(l));
    expect(after.has('investigating')).toBe(false);
    expect(p.aware.level).toBe('unaware');
    expect(p.bark).not.toHaveBeenCalled();
  });

  it('cues that come and go (a shadow crossing his view again and again) never reach investigate', () => {
    const { p, cues } = scene();
    const levels = new Set<string>();
    const think = { t: 0 };
    for (let k = 0; k < 15; k++) {
      cues!.speed[0] = 1;
      run(p, 1, (l) => levels.add(l), think);
      cues!.speed[0] = 0;
      run(p, 1 + (k % 4) * 0.5, (l) => levels.add(l), think);
    }
    expect(levels.has('suspicious')).toBe(true);
    expect(levels.has('investigating')).toBe(false);
  });

  it('a shadow never holds back what sight started (fix 1): with cues on he investigates whenever he does with cues off', () => {
    // B in front at (2, 9) is seen for `seen` s in light `light`, then goes behind a wall; A's moving shadow stays in his
    // cone at (0, 4-6) the whole 20 s. Cues null vs on: the same outcome, and an investigation is sight's both times.
    const glimpse = (seen: number, light: number, on: boolean) => {
      const A = player('a', 0, -5, { light: 0.3 });
      const B = player('b', 2, 9, { light });
      const cues = on ? cuesFor(['a', 'b']) : null;
      if (cues) footprint(cues, 0, 0, 4);
      const { p } = guard([A, B], { cues });
      const think = { t: 0 };
      const r = { inv: false, cause: -1, cued: false, sx: NaN, sz: NaN };
      const look = (l: string) => {
        if (l === 'investigating' && !r.inv) {
          r.inv = true;
          r.cause = p.riseCause;
          r.sx = p.stimulus[0];
          r.sz = p.stimulus[1];
        }
      };
      run(p, seen, look, think);
      B.hidden.chest = B.hidden.head = B.hidden.hips = true;
      run(p, 20, look, think);
      r.cued = p.cueT !== Infinity;
      return r;
    };
    // the checker's three: each investigates with cues off (the scenario is live), and with cues on, by sight
    const checker: [number, number][] = [
      [0.75, 0.6],
      [0.75, 1.0],
      [2, 0.4],
    ];
    for (const [seen, light] of checker) {
      const off = glimpse(seen, light, false);
      const on = glimpse(seen, light, true);
      expect(off.inv, `off ${seen} s @ ${light}`).toBe(true);
      expect(on.inv, `on ${seen} s @ ${light}`).toBe(true);
      expect(off.cause).toBe(RISE_SIGHT);
      expect(on.cause).toBe(RISE_SIGHT);
    }
    // a sweep of glimpse length x light: never less with cues on. It can be more: a cue's suspicion sharpens his eye
    // (`aware.sensitivity`), so a sub-leak glimpse of B can become a real one, and that walk is sight's (RISE_SIGHT)
    let offInv = 0;
    let more = 0;
    let cued = 0;
    // (the stand-in has no combat: brighter glimpses past 1 s go alert, where today's sight rules alone decide)
    for (const seen of [0.25, 0.5, 0.75, 1, 1.5, 2, 3]) {
      for (const light of seen <= 1 ? [0.2, 0.3, 0.4, 0.6, 0.8, 1] : [0.2, 0.3, 0.4]) {
        const off = glimpse(seen, light, false);
        const on = glimpse(seen, light, true);
        const at = `${seen} s @ ${light}`;
        if (off.inv) expect(on.inv, at).toBe(true);
        if (on.inv) expect(on.cause, at).toBe(RISE_SIGHT);
        // (fix 2) where he goes is sight's: B's feet, never the shadow's point, with cues on as with them off
        if (off.inv) expect([off.sx, off.sz], at).toEqual([2, 9]);
        if (on.inv) expect([on.sx, on.sz], at).toEqual([2, 9]);
        if (off.inv) offInv++;
        if (on.inv && !off.inv) more++;
        if (on.cued) cued++;
      }
    }
    // both kinds of run are in the sweep, and the cue still fires once the glimpse's moment is over
    expect(offInv).toBeGreaterThan(3);
    expect(offInv).toBeLessThan(33);
    expect(cued).toBeGreaterThan(0);
    expect(more).toBeLessThan(33 - offInv);
  });
});

describe('fix 2: a cue-only episode is silent both ways (check B FIX 1, A5)', () => {
  it('a cooldown guard, the cue alone: up to suspicious and back to cooldown, never a line', () => {
    const { p, cues } = scene();
    p.aware.set('cooldown');
    const levels = new Set<string>();
    const think = { t: 0 };
    run(p, 3, (l) => levels.add(l), think);
    cues!.speed[0] = 0;
    run(p, 15, (l) => levels.add(l), think);
    expect(levels.has('suspicious')).toBe(true);
    expect(levels.has('investigating')).toBe(false);
    expect(p.aware.level).toBe('cooldown');
    expect(p.cueQuiet).toBe(false);
    expect(p.bark).not.toHaveBeenCalled();
  });

  it('a noise mid-episode makes it a sound\'s: the lines are today\'s (the skipped suspicious, heard, clear; polish 1)', () => {
    // cooldown guard; at 1 s a noise he hears (`hear`), then A stands still. Cues off: the noise alone
    const lines = (on: boolean) => {
      const { p, e, cues } = scene(on ? {} : { cues: null });
      p.aware.set('cooldown');
      const think = { t: 0 };
      run(p, 1, () => {}, think);
      expect(p.aware.level).toBe(on ? 'suspicious' : 'cooldown');
      e.hear(6, 2, 10);
      if (cues) cues.speed[0] = 0;
      const levels: string[] = [];
      run(
        p,
        40,
        (l) => {
          if (levels[levels.length - 1] !== l) levels.push(l);
        },
        think,
      );
      return { barks: p.bark.mock.calls.map((c) => c[0] as string), levels, stim: [p.stimulus[0], p.stimulus[1]] };
    };
    const off = lines(false);
    const on = lines(true);
    expect(off.barks).toEqual(['suspicious', 'heard', 'clear']);
    expect(on.barks).toEqual(off.barks);
    expect(on.levels).toEqual(off.levels);
    expect(on.stim).toEqual([6, 2]);
  });

  it('a sight mid-episode makes it sight\'s: he says the skipped line', () => {
    // B steps into view in light for one think, then out of it again
    const A = player('a', 0, -5, { light: 0.3 });
    const B = player('b', 2, 9, { light: 1, hidden: true });
    const cues = cuesFor(['a', 'b']);
    footprint(cues, 0, 0, 4);
    const { p } = guard([A, B], { cues });
    p.aware.set('cooldown');
    const think = { t: 0 };
    run(p, 1, () => {}, think);
    expect(p.aware.level).toBe('suspicious');
    expect(p.cueQuiet).toBe(true);
    expect(p.bark).not.toHaveBeenCalled();
    B.hidden.chest = B.hidden.head = B.hidden.hips = false;
    run(p, THINK, () => {}, think);
    B.hidden.chest = B.hidden.head = B.hidden.hips = true;
    expect(p.cueQuiet).toBe(false);
    expect(p.bark.mock.calls[0]).toEqual(['suspicious']);
  });

  it('an ack in the episode makes it the ack\'s: no suspicious line, the calm-down barks', () => {
    const { p, e, cues } = scene();
    p.aware.set('cooldown');
    const think = { t: 0 };
    run(p, 1, () => {}, think);
    expect(p.cueQuiet).toBe(true);
    e.ack(6, 2, false);
    expect(p.cueQuiet).toBe(false);
    expect(p.bark).not.toHaveBeenCalled();
    cues!.speed[0] = 0;
    run(p, 15, () => {}, think);
    expect(p.aware.level).toBe('cooldown');
    expect(p.bark.mock.calls.map((c) => c[0])).toEqual(['clear']);
  });
});

describe('fix 2: the cue never takes a sound\'s place (check B FIX 2, A6)', () => {
  /** Per step: his level and stimulus. */
  const trace = (p: Priv, s: number, think: { t: number }) => {
    const out: string[] = [];
    run(p, s, (l) => out.push(`${l} ${p.stimulus[0]},${p.stimulus[1]}`), think);
    return out;
  };

  it('after hear() he walks to the noise with cues on exactly as with them off', () => {
    const go = (on: boolean) => {
      const { p, e } = scene(on ? {} : { cues: null });
      e.hear(6, 2, 10);
      return trace(p, 26, { t: 0 });
    };
    const off = go(false);
    const on = go(true);
    // the episode: suspicious (sound), investigating the noise, back to cooldown; the same step by step
    expect(off.includes('investigating 6,2')).toBe(true);
    const end = off.indexOf('cooldown 6,2');
    expect(end).toBeGreaterThan(0);
    expect(on.slice(0, end + 1)).toEqual(off.slice(0, end + 1));
  });

  it('after hearTurn() (a thrown noisemaker\'s unsent hearers) or an ack he faces the sound, not the shadow', () => {
    for (const how of ['hearTurn', 'ack'] as const) {
      const go = (on: boolean) => {
        const { p, e } = scene(on ? {} : { cues: null });
        if (how === 'hearTurn') e.hearTurn(6, 2, 20);
        else e.ack(6, 2, false);
        const look = p.turnT;
        return { t: trace(p, look - DT / 2, { t: 0 }), cueT: p.cueT };
      };
      const off = go(false);
      const on = go(true);
      expect(on.t, how).toEqual(off.t);
      for (const x of on.t) expect(x.endsWith(' 6,2'), how).toBe(true);
      expect(on.cueT, how).toBe(Infinity);
    }
  });

  it('the sweep: noises near and far, heard or turned to, never a different spot or look with cues on', () => {
    let reacted = 0;
    const spots: [number, number][] = [
      [6, 2],
      [-3, 5],
      [0, 7],
      [2, -4],
      [-8, -1],
    ];
    for (const [x, z] of spots) {
      for (const radius of [6, 10, 16]) {
        for (const how of ['hear', 'hearTurn'] as const) {
          const go = (on: boolean) => {
            const { p, e } = scene(on ? {} : { cues: null });
            if (how === 'hear') e.hear(x, z, radius);
            else e.hearTurn(x, z, radius);
            const heard = p.heard;
            // hear: up to his calm-down (the cue may come back after it); hearTurn: the look
            const t = trace(p, how === 'hear' ? 26 : ALERT.hearLook - DT / 2, { t: 0 });
            return { t, heard };
          };
          const off = go(false);
          if (how === 'hear' && !off.heard) continue;
          reacted++;
          const on = go(true);
          const at = `${how} (${x}, ${z}) r ${radius}`;
          const end = how === 'hear' ? off.t.findIndex((s) => s.startsWith('cooldown')) : off.t.length - 1;
          expect(end, at).toBeGreaterThan(0);
          expect(on.t.slice(0, end + 1), at).toEqual(off.t.slice(0, end + 1));
        }
      }
    }
    expect(reacted).toBeGreaterThan(15);
  });
});

describe('G3: the guard-side light reads take the contract and skip the owner', () => {
  it('fieldLight: no contract, today\'s call; a contract, the player\'s own key skipped', () => {
    // A in front, lit by the field (no owner sample)
    const A = player('a', 0, 6);
    const off = guard([A], { chars: null });
    off.p.perceive();
    expect(off.totalAt.mock.calls.length).toBeGreaterThan(0);
    for (const c of off.totalAt.mock.calls) expect(c.length).toBe(4);
    const occ = new CharOccluders();
    const B = player('b', 0, 6);
    const on = guard([player('x', 0, -5, { light: 0.3 }), B], { chars: occ });
    on.p.perceive();
    const calls = on.totalAt.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c[4]).toBe(occ);
      expect(c[5]).toBe(occKey(OCC_KIND.player, 1));
    }
  });
});

// --- the manager ---------------------------------------------------------------------------------------------------

type FakePlayer = { id: string; target: { alive: boolean }; feet: Vector3; speed: number; crouched: boolean };

function manager(ps: FakePlayer[] = [], bal: object = {}) {
  const totalAt = vi.fn((..._a: unknown[]) => 0.5);
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { totalAt } };
  const nav = { walk: new Uint8Array(4), version: 0, nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0), flowField: (_g: unknown, out: Float32Array) => out };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, bal as Ballistics, {} as Vfx, DIFFICULTY.normal, () => ps as unknown as readonly PlayerRef[]);
  return { em, totalAt, ctx: (em as unknown as { ctx: Record<string, unknown> }).ctx };
}

/** A guard or dog as `fillOccluders` reads it (the `Enemy` fields). */
function ch(num: number, x: number, z: number, o: { dog?: boolean; alive?: boolean } = {}) {
  return { num, alive: o.alive ?? true, dog: o.dog ? {} : null, pos: new Vector3(x, 0, z), yaw: 0, simHead: new Vector3(x, 1.6, z + (o.dog ? 0.5 : 0)), occR: 0.21 };
}
/** A body as `fillOccluders` reads it (the `Body` fields). */
function bd(num: number, x: number, z: number, present = true) {
  return {
    num,
    present,
    lie: { x, y: 0.13, z, headYaw: 0 },
    occR: 0.13,
    occReach: 0.8,
    pos: new Vector3(x, 0.13, z),
    lightT: 0,
    light: 0,
    age: 0,
    update(dt: number) {
      this.age += dt;
    },
  };
}

describe('G3: EnemyManager.fillOccluders', () => {
  it('guards, dogs, then lying bodies, keyed by number; dead, absent and far skipped; overflow counted', () => {
    const { em } = manager();
    const list = em.enemies as unknown as ReturnType<typeof ch>[];
    list.push(ch(7, 1, 1), ch(8, 2, 2, { alive: false }), ch(9, 3, 3, { dog: true }), ch(10, 100, 100));
    const bodies = em.bodies as unknown as ReturnType<typeof bd>[];
    bodies.push(bd(4, 0, 2), bd(5, 0, 3, false));
    const occ = new CharOccluders();
    const pin = new Float64Array(FILL_IN * 2);
    occ.clear();
    expect(em.fillOccluders(occ, pin, 1)).toBe(0);
    expect(occ.n).toBe(3);
    expect(Array.from(occ.owner.subarray(0, 3))).toEqual([occKey(OCC_KIND.guard, 7), occKey(OCC_KIND.dog, 9), occKey(OCC_KIND.body, 4)]);
    expect(Array.from(occ.cap.subarray(0 * OCC.stride + 7, 0 * OCC.stride + 8))).toEqual([OCC_KIND.guard]);
    expect(occ.cap[2 * OCC.stride + 7]).toBe(OCC_KIND.body);
    // OCC_FAR is a skip, not overflow: the far guard is out of the count both ways
    expect(OCC_FAR).not.toBe(-1);
    // full: each near character that did not fit counts once
    occ.clear();
    occ.n = OCC.max - 1;
    expect(em.fillOccluders(occ, pin, 1)).toBe(2);
    expect(occ.n).toBe(OCC.max);
    // no player slots: everything is far, nothing written, nothing over
    occ.clear();
    expect(em.fillOccluders(occ, pin, 0)).toBe(0);
    expect(occ.n).toBe(0);
  });

  it('allocates nothing per fill', async () => {
    const { em } = manager();
    const list = em.enemies as unknown as ReturnType<typeof ch>[];
    for (let i = 0; i < 12; i++) list.push(ch(20 + i, i, i % 3, { dog: i % 5 === 0, alive: i !== 4 }));
    list.push(ch(40, 200, 0));
    const bodies = em.bodies as unknown as ReturnType<typeof bd>[];
    for (let i = 0; i < 4; i++) bodies.push(bd(60 + i, -i, 1, i !== 2));
    const occ = new CharOccluders();
    const pin = new Float64Array(FILL_IN * 2);
    pin[FILL_IN] = 5;
    const out = new Int32Array(1);
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        occ.clear();
        out[0] = em.fillOccluders(occ, pin, 2);
      }
    }, 0);
    expect(occ.n).toBe(14);
    expect(per).toBeLessThan(HEAP_NUMBER);
  }, 60000);
});

describe('G3: the manager wiring', () => {
  it('AiContext reads chars and cues through getters: a set after construction reaches a guard (item 1)', () => {
    const A = player('a', 0, -5, { light: 0.3 });
    const { b, floor } = ballistics([A]);
    const { em, ctx } = manager([A.ref as unknown as FakePlayer], b);
    expect(em.chars).toBeNull();
    expect(em.cues).toBeNull();
    expect((ctx.cues as () => unknown)()).toBeNull();
    const { p } = guard([A], { ctx });
    p.perceive();
    expect(p.cueT).toBe(Infinity);
    // G4b's set, after construction
    const cues = cuesFor(['a']);
    footprint(cues, 0, 0, 4);
    em.cues = cues;
    const occ = new CharOccluders();
    em.chars = occ;
    expect((ctx.cues as () => unknown)()).toBe(cues);
    expect((ctx.chars as () => unknown)()).toBe(occ);
    p.perceive();
    expect(p.cueT).toBe(0);
    expect(floor.rays).toBe(1);
    expect(p.meter).toBe(SHADOW_NOTICE.meter);
  });

  it('a body\'s light and a fallen guard\'s (witnessKill) skip their own capsule; without a contract, today\'s call', () => {
    const { em, totalAt } = manager();
    const priv = em as unknown as { stepBodies(dt: number): void; witnessKill(v: unknown): void };
    const bodies = em.bodies as unknown as ReturnType<typeof bd>[];
    bodies.push(bd(12, 1, 2));
    priv.stepBodies(0.1);
    priv.witnessKill(ch(33, 0, 0));
    expect(totalAt.mock.calls.map((c) => c.length)).toEqual([4, 4]);
    totalAt.mockClear();
    const occ = new CharOccluders();
    em.chars = occ;
    bodies[0]!.lightT = 0;
    priv.stepBodies(0.1);
    priv.witnessKill(ch(33, 0, 0));
    priv.witnessKill(ch(34, 0, 0, { dog: true }));
    const c = totalAt.mock.calls;
    expect(c.map((x) => [x[4], x[5]])).toEqual([
      [occ, occKey(OCC_KIND.body, 12)],
      [occ, occKey(OCC_KIND.guard, 33)],
      [occ, occKey(OCC_KIND.dog, 34)],
    ]);
  });

  it('a new body\'s first light sample waits a step with the contract (check B polish 4); without one, today\'s', () => {
    // with the contract: the step he died in still holds his standing capsule (the guard's key), so no sample then
    const on = manager();
    on.em.chars = new CharOccluders();
    const pOn = on.em as unknown as { stepBodies(dt: number): void; bodies: ReturnType<typeof bd>[] };
    pOn.bodies.push(bd(13, 1, 2));
    pOn.stepBodies(0.05);
    expect(on.totalAt).not.toHaveBeenCalled();
    pOn.stepBodies(0.05);
    expect(on.totalAt).toHaveBeenCalledTimes(1);
    // no contract: sampled on its first step, as today
    const off = manager();
    const pOff = off.em as unknown as { stepBodies(dt: number): void; bodies: ReturnType<typeof bd>[] };
    pOff.bodies.push(bd(14, 1, 2));
    pOff.stepBodies(0.05);
    expect(off.totalAt).toHaveBeenCalledTimes(1);
  });
});

describe('G3: allocation', () => {
  type Look = { shadowLook(eye: Vector3, capped: boolean): void; tmpEye: Vector3 };

  it('shadowLook allocates nothing: a hit, a blocked ray, no footprint, a gated guard', async () => {
    for (const mode of ['hit', 'blocked', 'none', 'gated']) {
      const { p, floor, cues } = scene();
      floor.blocked = mode === 'blocked';
      if (mode === 'none') cues!.count[0] = 0;
      if (mode === 'gated') p.incident = 2;
      p.perceive();
      const l = p as unknown as Look;
      const eye = l.tmpEye;
      const per = await bytesPerCall((n) => {
        for (let k = 0; k < n; k++) l.shadowLook(eye, false);
      }, 0);
      expect(p.cueT === 0).toBe(mode === 'hit');
      expect(per, mode).toBeLessThan(HEAP_NUMBER);
    }
  }, 60000);

  it('a think with cues (hits and blocked rays) costs what a think without them does', async () => {
    const off = scene({ cues: null });
    const base = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) off.p.perceive();
    }, 0);
    const { p, floor } = scene();
    const flip = new Int32Array(1);
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        floor.blocked = (flip[0]! & 1) === 1;
        flip[0] = flip[0]! + 1;
        p.perceive();
      }
    }, 0);
    expect(p.cueSlot).toBe(0);
    // the stand-in's think (today's perceive: 16-48 B by what ran before it in the file, outside the cue) is the bar:
    // the cue's work in the same think adds nothing to it (shadowLook alone: the case above). With one stand-in map
    // (G3 fix round) this reading caught 32 B on the ray path, now gone: `SHADOW_NOTICE.slack` loaded from the object
    // and passed to `losTo` (16 B; now `CUE_SLACK`) and `cueV.set(x, y, z)` called out of line (16 B; now stores)
    expect(per).toBeLessThanOrEqual(base);
  }, 60000);
});
