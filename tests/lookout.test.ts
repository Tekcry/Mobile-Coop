import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { validatePosts, type GuardSlot } from '../src/ai/guardAiData';
import { KIND } from '../src/ai/incidents';
import { LOOKOUT, POST, mayLeave, type PostDef } from '../src/ai/posts';
import { RISE_NONE, RISE_SIGHT, RISE_SOUND, type Enemy } from '../src/ai/enemy';
import { BARKS, BarkVoice } from '../src/ai/barks';
import { P_POST, P_STANDARD } from '../src/ai/squadRoles';
import { TAGS } from '../src/ai/sectorTags';
import { Vector3, type Scene } from '../src/core/babylon';
import { flags } from '../src/core/flags';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-rules S7, A9) Lookout posts behind `flags.lookouts`: the data rules, the high-security copy `placeSlot` gives
// (flag off: no post), never sent by the board, and the radio: a sight rise into suspicious / investigating barks
// `spotCall` and opens a `noise` incident at what he saw (no perceivers), so a calm guard within callR goes; at most
// every `LOOKOUT.callCd` s. The stand-ins are copied from tests/postsWiring.test.ts (no import across test files).

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: object | null;
  buff: boolean;
  level: string;
  incident: number;
  secure: boolean;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  key: number;
  riseN: number;
  riseCause: number;
  stimX: number;
  stimZ: number;
  postDef: PostDef | null;
  tacticsProfile?: number;
  zoneR?: number;
  inLeash: (x: number, z: number, m?: number) => boolean;
  lureTo: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  hear: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  tell: ReturnType<typeof vi.fn>;
  sendTo: ReturnType<typeof vi.fn>;
  checkLight: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  ack: ReturnType<typeof vi.fn>;
  runAlarm: ReturnType<typeof vi.fn>;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  setPost: ReturnType<typeof vi.fn>;
  setGear: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  section?: number;
  profile?: string;
}

let n = 0;
/** A stand-in guard; `setPost` keeps the def and makes him `secure` as `Enemy.setPost` / `Enemy.secure` do. */
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 9000 + n++;
  const g: FakeGuard = {
    id: `l${num}`,
    num,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    buff: false,
    level: 'unaware',
    incident: -1,
    secure: false,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    key: -1,
    riseN: 0,
    riseCause: RISE_NONE,
    stimX: 0,
    stimZ: 0,
    postDef: null,
    inLeash: (qx, qz, m = 0) => !g.secure || Math.hypot(qx - x, qz - z) <= (g.postDef?.leash ?? 0) + POST.arrive + m,
    lureTo: vi.fn(),
    hearTurn: vi.fn(),
    hear: vi.fn(),
    hearGunfire: vi.fn(),
    tell: vi.fn(),
    sendTo: vi.fn(),
    checkLight: vi.fn(),
    pairSearch: vi.fn(),
    ack: vi.fn(),
    runAlarm: vi.fn(),
    radio: vi.fn(),
    bark: vi.fn(),
    setPost: vi.fn((def: PostDef | null) => {
      g.postDef = def;
      g.secure = def !== null && def.highSecurity === true;
    }),
    setGear: vi.fn(),
    dispose: vi.fn(),
    ...o,
  };
  return g;
}

/** A manager on a stub world (open floor, no walls). */
function manager(gs: FakeGuard[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn(() => true);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  return em;
}

const E = (g: FakeGuard) => g as unknown as Enemy;
interface Priv {
  lookoutN: number;
  lookRise: Int32Array;
  lookCd: Float32Array;
  lookoutStep(e: Enemy, dt: number): void;
}
const P = (em: EnemyManager) => em as unknown as Priv;
const spotCalls = (g: FakeGuard) => g.bark.mock.calls.filter((c) => c[0] === 'spotCall').length;

/** A lookout at the origin (key 3, placed with the flag on) and a calm free guard at (20, 0). */
function scene() {
  flags.lookouts = true;
  const look = guard(0, 0, { key: 3 });
  const calm = guard(20, 0);
  const em = manager([look, calm]);
  em.placeSlot(E(look), { yaw: Math.PI / 2, post: { leash: 1, lookout: true } }, 0);
  return { look, calm, em };
}

/** He grows suspicious (or `level`) by `cause`, the stimulus at (sx, sz). */
function rise(g: FakeGuard, cause = RISE_SIGHT, level = 'suspicious', sx = 10, sz = 0): void {
  g.riseN++;
  g.riseCause = cause;
  g.level = level;
  g.stimX = sx;
  g.stimZ = sz;
}

const flagWas = flags.lookouts;
afterEach(() => {
  flags.lookouts = flagWas;
});

describe('lookout data (validatePosts, mayLeave, numbers)', () => {
  const slot = (post: PostDef, o: Partial<GuardSlot> = {}): GuardSlot => ({ x: 0, z: 0, post, ...o });
  it('leash 1 and 0 pass; leash 1.5, free, a route point outside fail', () => {
    expect(validatePosts([slot({ leash: 1, lookout: true })])).toEqual([]);
    expect(validatePosts([slot({ leash: 0, lookout: true })])).toEqual([]);
    const wide = validatePosts([slot({ leash: 1.5, lookout: true })]);
    expect(wide.length).toBe(1);
    expect(wide[0]).toMatch(/at most 1 m/);
    const free = validatePosts([slot({ leash: 1, lookout: true }, { free: true })]);
    expect(free.length).toBe(1);
    expect(free[0]).toMatch(/a lookout cannot be free/);
    const route = validatePosts([slot({ leash: 1, lookout: true }, { route: [[1.4, 0]] })]);
    expect(route.length).toBe(1);
    expect(route[0]).toMatch(/outside the leash \(1 m\) of a lookout/);
  });
  it('mayLeave is false for every kind; LOOKOUT.callCd 20, POST.lookoutLeash 1', () => {
    for (const k of KIND) expect(mayLeave({ leash: 1, lookout: true }, k)).toBe(false);
    expect(LOOKOUT.callCd).toBe(20);
    expect(POST.lookoutLeash).toBe(1);
  });
});

describe('placeSlot: a lookout post', () => {
  it('flag on: a high-security copy (the slot untouched), P_POST, counted, the zone circle his leash', () => {
    flags.lookouts = true;
    const g = guard(5, 0, { key: 2, riseN: 4 });
    const em = manager([g]);
    const post: PostDef = { leash: 1, lookout: true };
    em.placeSlot(E(g), { yaw: 1.1, post, zone: 'secure' }, 0);
    expect(g.setPost).toHaveBeenLastCalledWith({ leash: 1, lookout: true, highSecurity: true }, 1.1);
    expect(post).toEqual({ leash: 1, lookout: true });
    expect(g.secure).toBe(true);
    expect(g.tacticsProfile).toBe(P_POST);
    expect(g.zoneR).toBe(1);
    expect(P(em).lookoutN).toBe(1);
    expect(P(em).lookRise[2]).toBe(4);
  });
  it('flag off: no post (as a slot with none), P_STANDARD, nothing counted', () => {
    flags.lookouts = false;
    const g = guard(5, 0, { key: 2 });
    const em = manager([g]);
    em.placeSlot(E(g), { yaw: 1.1, post: { leash: 1, lookout: true }, zone: 'secure' }, 0);
    expect(g.setPost).toHaveBeenLastCalledWith(null, 1.1);
    expect(g.tacticsProfile).toBe(P_STANDARD);
    expect(g.zoneR).toBe(TAGS.secureR);
    const h = guard(5, 0, { key: 3 });
    em.placeSlot(E(h), { yaw: 1.1, zone: 'secure' }, 0);
    expect(h.zoneR).toBe(g.zoneR);
    expect(P(em).lookoutN).toBe(0);
  });
  it('a dog is never a lookout: on a lookout post he gets no post, even with the flag on', () => {
    flags.lookouts = true;
    const d = guard(5, 0, { key: 4, dog: {} });
    const em = manager([d]);
    em.placeSlot(E(d), { yaw: 0, post: { leash: 1, lookout: true } }, 0);
    expect(d.setPost).toHaveBeenLastCalledWith(null, 0);
    expect(P(em).lookoutN).toBe(0);
  });
  it('a plain post is passed through as the same object (flag on or off)', () => {
    flags.lookouts = true;
    const g = guard(5, 0, { key: 1 });
    const em = manager([g]);
    const post: PostDef = { leash: 3, highSecurity: true };
    em.placeSlot(E(g), { yaw: 0, post }, 0);
    expect(g.setPost.mock.calls[0]![0]).toBe(post);
    expect(P(em).lookoutN).toBe(0);
  });
});

describe('a lookout is never sent', () => {
  it('flag on: he and a free guard hear a bottle: the free one is sent, the lookout lured on his perch', () => {
    flags.lookouts = true;
    const look = guard(2, 0, { key: 0 });
    const free = guard(-3, 0);
    const em = manager([look, free]);
    em.placeSlot(E(look), { yaw: 0, post: { leash: 1, lookout: true } }, 0);
    em.hear(new Vector3(0, 0, 0), 10, 'distraction');
    expect(look.lureTo).toHaveBeenCalledTimes(1);
    expect(look.sendTo).not.toHaveBeenCalled();
    expect(free.sendTo).toHaveBeenCalledTimes(1);
  });
});

describe('the radio (lookoutStep)', () => {
  it('spotCall is urgent (S7-d): it cuts through the speaker cooldown his own "Huh?" just started', () => {
    const v = new BarkVoice(3);
    expect(v.say('suspicious')).not.toBeNull();
    expect(v.say('investigate')).toBeNull();
    expect(BARKS.spotCall).toContain(v.say('spotCall'));
  });
  it('a sight rise into suspicious: one spotCall, a calm guard 10 m from the spot goes (noise), never the lookout', () => {
    const { look, calm, em } = scene();
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(1);
    expect(calm.sendTo).toHaveBeenCalledTimes(1);
    const [x, z, inc] = calm.sendTo.mock.calls[0]!;
    expect([x, z]).toEqual([10, 0]);
    expect(em.board.kindOf(inc as number)).toBe('noise');
    expect(look.sendTo).not.toHaveBeenCalled();
  });
  it('a sight rise straight to investigating calls too (S7-a)', () => {
    const { look, calm, em } = scene();
    rise(look, RISE_SIGHT, 'investigating');
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(1);
    expect(calm.sendTo).toHaveBeenCalledTimes(1);
  });
  it('no call: a sound or no cause, alert or unaware, riseN unchanged, no lookout post, not coordinated', () => {
    const cases: ((s: ReturnType<typeof scene>) => void)[] = [
      (s) => rise(s.look, RISE_SOUND),
      (s) => rise(s.look, RISE_NONE),
      (s) => rise(s.look, RISE_SIGHT, 'alert'),
      (s) => rise(s.look, RISE_SIGHT, 'unaware'),
      (s) => {
        s.look.riseCause = RISE_SIGHT;
        s.look.level = 'suspicious';
      },
      (s) => {
        s.look.postDef = { leash: 1, highSecurity: true };
        rise(s.look);
      },
      (s) => {
        s.em.coordinated = false;
        rise(s.look);
      },
    ];
    for (let i = 0; i < cases.length; i++) {
      const s = scene();
      cases[i]!(s);
      P(s.em).lookoutStep(E(s.look), 0.1);
      expect(spotCalls(s.look), `case ${i}`).toBe(0);
      expect(s.calm.sendTo, `case ${i}`).not.toHaveBeenCalled();
      expect(s.em.board.openCount, `case ${i}`).toBe(0);
    }
  });
  it('cooldown: a second sight rise 5 s later is silent; after 20 s a third calls again', () => {
    const { look, calm, em } = scene();
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(1);
    let t = 0;
    for (; t < 5; t += 0.1) P(em).lookoutStep(E(look), 0.1);
    look.level = 'unaware';
    em.board.clear();
    calm.sendTo.mockClear();
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(1);
    expect(calm.sendTo).not.toHaveBeenCalled();
    for (; t < LOOKOUT.callCd + 0.5; t += 0.1) P(em).lookoutStep(E(look), 0.1);
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(2);
    expect(calm.sendTo).toHaveBeenCalledTimes(1);
  });
  it('flag off end to end: the same slot places no lookout, and a sight rise says nothing', () => {
    flags.lookouts = false;
    const look = guard(0, 0, { key: 3 });
    const calm = guard(20, 0);
    const em = manager([look, calm]);
    em.placeSlot(E(look), { yaw: 0, post: { leash: 1, lookout: true } }, 0);
    expect(P(em).lookoutN).toBe(0);
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(spotCalls(look)).toBe(0);
    expect(calm.sendTo).not.toHaveBeenCalled();
  });
  it('despawn and clear reset the per-key state', () => {
    const { look, em } = scene();
    rise(look);
    P(em).lookoutStep(E(look), 0.1);
    expect(P(em).lookRise[3]).toBe(1);
    expect(P(em).lookCd[3]).toBeGreaterThan(0);
    em.despawn(E(look));
    expect(P(em).lookRise[3]).toBe(0);
    expect(P(em).lookCd[3]).toBe(0);
    const s = scene();
    s.em.clear();
    expect(P(s.em).lookoutN).toBe(0);
  });
});
