import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { AlertMachine } from '../src/ai/alertState';
import { GuardView, GV_POSTED, IncidentBoard, LEVEL, type PathLen } from '../src/ai/incidents';
import { LURE, POST, PostLure, type PostDef } from '../src/ai/posts';
import { HEARING } from '../src/ai/hearing';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { AlarmPanel } from '../src/ai/alarm';
import type { GuardAiLayout } from '../src/ai/guardAiData';
import type { World } from '../src/world/world';
import type { NavGrid, P2 } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { flags } from '../src/core/flags';

// (guard-ai S5) Posts wired into EnemyManager and Enemy (design 6, goal 7, M1, A10, A12): a high-security post is never
// sent by the board (noise, shots, a light, the missing pair, the alarm panel outside his leash) and is lured to his
// leash edge instead (looks >= 5 s within +-0.6 rad, walks back, faces his post); a normal post is sent like anyone;
// a search clamps into the leash; `placeSlot` sets the post / profile / section; the map's noisy things load.

interface FakeGuard {
  id: string;
  num: number;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: null;
  buff: boolean;
  level: string;
  incident: number;
  secure: boolean;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  inLeash: (x: number, z: number, m?: number) => boolean;
  lureTo: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  hear: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  /** (guard-ai S24) told of an intruder slot (a located shot). */
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
  section?: number;
  profile?: string;
}

let n = 0;
/** A stand-in guard; `leash` > 0 with `secure`: a high-security post round (x, z). */
function guard(x: number, z: number, o: Partial<FakeGuard> & { leash?: number } = {}): FakeGuard {
  const num = 8000 + n++;
  const leash = o.leash ?? 3;
  const px = x;
  const pz = z;
  const g: FakeGuard = {
    id: `p${num}`,
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
    inLeash: (qx, qz, m = 0) => !g.secure || Math.hypot(qx - px, qz - pz) <= leash + POST.arrive + m,
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
    setPost: vi.fn(),
    setGear: vi.fn(), // (guard-ai S12) placeSlot puts gear on him
    ...o,
  };
  return g;
}

/** A manager on a stub world (open floor, no walls); `lights`: fixtures for `lightsOut`; `guardAi`: map data. */
function manager(gs: FakeGuard[], opts: { lights?: { id: number; x: number; y: number; z: number; group: number }[]; guardAi?: GuardAiLayout } = {}) {
  const world = {
    level: { lights: { lights: opts.lights ?? [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [], guardAi: opts.guardAi },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const clear = vi.fn(() => true);
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  return em;
}

const E = (g: FakeGuard) => g as unknown as Enemy;

describe('posts wired: the incident board never sends a high-security post; a distraction lures him', () => {
  it('a bottle heard by a vault-door guard and a free guard: the free one is sent, the post is lured (not sent)', () => {
    const post = guard(2, 0, { secure: true });
    const free = guard(-3, 0);
    const em = manager([post, free]);
    em.hear(new Vector3(0, 0, 0), 10, 'distraction');
    expect(post.lureTo).toHaveBeenCalledTimes(1);
    const [lx, lz, r] = post.lureTo.mock.calls[0]!;
    expect([lx, lz]).toEqual([0, 0]);
    expect(r).toBeCloseTo(10, 5);
    expect(post.sendTo).not.toHaveBeenCalled();
    expect(post.hearTurn).not.toHaveBeenCalled();
    expect(free.sendTo).toHaveBeenCalledTimes(1);
  });

  it('heard by the post alone: he is lured and nobody else is sent (no incident opens)', () => {
    const post = guard(2, 0, { secure: true });
    const far = guard(20, 0);
    const em = manager([post, far]);
    em.hear(new Vector3(0, 0, 0), 10);
    expect(post.lureTo).toHaveBeenCalledTimes(1);
    expect(far.sendTo).not.toHaveBeenCalled();
    expect(em.board.openCount).toBe(0);
  });

  it('a noise at the turn tier (beyond half the reach): the post only turns, as anyone', () => {
    const post = guard(7, 0, { secure: true });
    const em = manager([post]);
    em.hear(new Vector3(0, 0, 0), 10);
    expect(post.lureTo).not.toHaveBeenCalled();
    expect(post.hearTurn).toHaveBeenCalledTimes(1);
  });

  it('a normal post (no high security) is sent like any guard', () => {
    const normal = guard(2, 0, { secure: false });
    const em = manager([normal]);
    em.hear(new Vector3(0, 0, 0), 10);
    expect(normal.sendTo).toHaveBeenCalledTimes(1);
    expect(normal.lureTo).not.toHaveBeenCalled();
  });

  it('far gunfire (investigate tier): the post is lured toward it; close gunfire (combat tier): he fights', () => {
    const post = guard(10, 0, { secure: true });
    const em = manager([post]);
    em.noise(new Vector3(0, 0, 0), 30);
    expect(post.lureTo).toHaveBeenCalledTimes(1);
    expect(post.hearGunfire).not.toHaveBeenCalled();
    const near = guard(2, 0, { secure: true });
    const em2 = manager([near]);
    em2.noise(new Vector3(0, 0, 0), 30);
    expect(near.hearGunfire).toHaveBeenCalledTimes(1);
    expect(near.lureTo).not.toHaveBeenCalled();
  });

  it('a light cut in his view: the post is lured to it (meter floor, no reach), the free guard checks it', () => {
    const post = guard(1, 0, { secure: true });
    const free = guard(-1, 0);
    const em = manager([post, free], { lights: [{ id: 5, x: 0, y: 3, z: 6, group: -1 }] });
    em.lightsOut(0, 6, 3, 5);
    expect(post.lureTo).toHaveBeenCalledWith(0, 6, 0);
    expect(post.checkLight).not.toHaveBeenCalled();
    expect(free.checkLight).toHaveBeenCalledTimes(1);
  });

  it('the alarm panel: a post never runs to one outside his leash; a free guard does', () => {
    const post = guard(0, 0, { secure: true, alerted: true, leash: 3 });
    const em = manager([post]);
    em.stealth = true;
    const panel: AlarmPanel = { id: 'p', x: 8, y: 0, z: 0, yaw: 0, disabled: false };
    em.alarms.push(panel);
    const priv = em as unknown as { assignAlarm(): void };
    priv.assignAlarm();
    expect(post.runAlarm).not.toHaveBeenCalled();
    // a panel inside his leash: he may work it
    panel.x = 2.5;
    priv.assignAlarm();
    expect(post.runAlarm).toHaveBeenCalledTimes(1);
    const free = guard(0, 4, { alerted: true });
    const em2 = manager([free]);
    em2.stealth = true;
    em2.alarms.push({ id: 'q', x: 8, y: 0, z: 0, yaw: 0, disabled: false });
    (em2 as unknown as { assignAlarm(): void }).assignAlarm();
    expect(free.runAlarm).toHaveBeenCalledTimes(1);
  });
});

describe('the board skips GV_POSTED guards (mayLeave false)', () => {
  const straight: PathLen = { len: (ax, ay, az, bx, by, bz) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2) };
  const view = (rows: { id: number; x: number; flags?: number }[]): GuardView => {
    const v = new GuardView(8);
    v.n = rows.length;
    rows.forEach((r, i) => v.set(i, r.id, r.x, 0, 0, LEVEL.unaware, r.flags ?? 0, -1));
    return v;
  };

  it('a posted perceiver is never picked; the callR fallback skips him; the missing pair too', () => {
    const b = new IncidentBoard(straight);
    const who = new Int32Array([1]);
    const id = b.report('noise', 0, 0, 0, -1, who, 1);
    b.tick(0, view([{ id: 1, x: 1, flags: GV_POSTED }]));
    expect(b.out.n).toBe(0);
    b.out.n = 0;
    // a free guard within callR: he goes (the posted one is skipped)
    b.tick(0, view([{ id: 1, x: 1, flags: GV_POSTED }, { id: 2, x: 12 }]));
    const inv: [number, number] = [-1, -1];
    expect(b.investigatorsOf(id, inv)[0]).toBe(2);
    // the missing pair: only posted guards free -> nobody is sent
    const b2 = new IncidentBoard(straight);
    b2.report('missing', 0, 0, 0, 9, new Int32Array(0), 0);
    b2.tick(0, view([{ id: 3, x: 2, flags: GV_POSTED }, { id: 4, x: 3, flags: GV_POSTED }]));
    expect(b2.out.n).toBe(0);
  });
});

describe('placeSlot and the map data', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sets the post (facing the slot yaw), the profile and the section (explicit, or the zone he stands in)', () => {
    const zones: GuardAiLayout = { zones: [{ id: 'a', section: 0, rects: [{ id: 'ra', name: 'a', minX: -10, maxX: 0, minZ: -10, maxZ: 10 }] }, { id: 'b', section: 1, rects: [{ id: 'rb', name: 'b', minX: 0, maxX: 10, minZ: -10, maxZ: 10 }] }] };
    const g = guard(5, 0);
    const em = manager([g], { guardAi: zones });
    const post: PostDef = { leash: 3, highSecurity: true, guards: 'vault door' };
    em.placeSlot(E(g), { yaw: 1.2, post, profile: 'aggressive' });
    expect(g.setPost).toHaveBeenCalledWith(post, 1.2);
    expect(g.profile).toBe('aggressive');
    expect(g.section).toBe(1);
    em.placeSlot(E(g), { yaw: 0 }, 4);
    expect(g.setPost).toHaveBeenLastCalledWith(null, 0);
    expect(g.profile).toBe('standard');
    expect(g.section).toBe(4);
  });

  it('(guard-rules S7, A9) a lookout slot: flag on a high-security copy (the slot untouched), flag off no post', () => {
    const was = flags.lookouts;
    try {
      const g = guard(5, 0);
      const em = manager([g]);
      const post: PostDef = { leash: 1, lookout: true };
      flags.lookouts = true;
      em.placeSlot(E(g), { yaw: 0.5, post });
      expect(g.setPost).toHaveBeenLastCalledWith({ leash: 1, lookout: true, highSecurity: true }, 0.5);
      expect(post).toEqual({ leash: 1, lookout: true });
      flags.lookouts = false;
      em.placeSlot(E(g), { yaw: 0.5, post });
      expect(g.setPost).toHaveBeenLastCalledWith(null, 0.5);
    } finally {
      flags.lookouts = was;
    }
  });

  it("the map's noisy things load as the masking (and a sector falls back to them); bad data warns, never throws", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const noisy = [{ id: 'gen', x: 0, z: 0, radius: 8, db: 12 }];
    const em = manager([], { guardAi: { noisy } });
    expect(em.mapNoisy).toBe(noisy);
    expect((em as unknown as { noisy: unknown }).noisy).toBe(noisy);
    expect(warn).not.toHaveBeenCalled();
    manager([], { guardAi: { noisy: [{ id: 'bad', x: 0, z: 0, radius: 8, db: 40 }] } });
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]![0])).toMatch(/guard-ai data \(map\): noisy bad: db 40/);
  });

  it('masking from the map data: a guard by a 12 dB machine does not get the investigate tier of a close bottle', () => {
    const g = guard(2, 0);
    const em = manager([g], { guardAi: { noisy: [{ id: 'gen', x: 2, z: 0, radius: 6, db: 12 }] } });
    em.hear(new Vector3(0, 0, 0), 6);
    // 6 m reach x 10^(-12/20) = 1.5 m effective: 2 m away he hears nothing at all
    expect(g.sendTo).not.toHaveBeenCalled();
    expect(g.hearTurn).not.toHaveBeenCalled();
    expect(HEARING.investigateDb).toBeGreaterThan(0);
  });
});

describe("every live map's Sector Ops guard-ai data validates (posts, noisy, entries, keys)", () => {
  it('no errors in any section', async () => {
    const { MAPS } = await import('../src/world/maps');
    const { validateGuardAi } = await import('../src/ai/guardAiData');
    for (const m of MAPS) {
      const secs = m.sectors ?? [];
      for (let i = 0; i < secs.length; i++) {
        const s = secs[i]!;
        expect(validateGuardAi({ noisy: s.noisy, entries: s.entries }, s.guards, { sections: secs.length, section: i }), `${m.id} ${s.id}`).toEqual([]);
      }
    }
  });
});

// The Enemy side, on a bare prototype (no scene): the lure from `calmDecide`, the search clamp, the leash helpers.
interface Probe {
  secure: boolean;
  inLeash(x: number, z: number, m?: number): boolean;
  lureTo(x: number, z: number, radius?: number): void;
  setPost(def: PostDef | null, yaw: number): void;
  calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null };
  lurePhase: number;
  lureLook: Readonly<P2>;
  meter: number;
  pos: { x: number; y: number; z: number };
  aware: AlertMachine;
  stimulus: P2;
  hasStimulus: boolean;
  walker: { rejoin: ReturnType<typeof vi.fn> };
  goals: P2[];
}

async function probe(post: PostDef | null, x = 0, z = 0, yaw = 0): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const goals: P2[] = [];
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    health: { alive: true },
    passive: false,
    taken: false,
    meter: 0,
    rate: 0,
    pos: { x, y: 0, z },
    post: [x, z] as P2,
    postDef: null,
    postYaw: 0,
    stimulus: [0, 0] as P2,
    hasStimulus: false,
    turnT: 0,
    lure: new PostLure(),
    lureOut: { x: 0, z: 0, yaw: 0, moving: false, phase: LURE.idle },
    lureP: [0, 0] as P2,
    lureGoal: { point: null, speed: 0, face: null },
    leashTmp: [0, 0] as P2,
    spot: [0, 0] as P2,
    spotSet: false,
    spotLookT: 0,
    searchK: 0,
    searchOwn: true,
    reviving: null,
    hold: null,
    dog: null,
    routePath: [],
    combatSearch: false,
    lc: { active: false, stop() {} },
    def: { walkSpeed: 1.5, kind: 'grunt' },
    ctx: { coordinated: () => true, stealth: () => true, lkpValid: () => false, nav: { nearestWalkable: () => -1 }, searchSlot: () => 0 } as unknown as AiContext,
    walker: { rejoin: vi.fn(), step: () => null, lookYaw: Number.NaN, route: null },
    goals,
    // the nav: record the goal, straight there (null when within `near`)
    goTo(p: P2, _dt: number, near = 0.6): P2 | null {
      goals.push([p[0], p[1]]);
      return Math.hypot(p[0] - this.pos.x, p[1] - this.pos.z) < near ? null : p;
    },
  });
  const pr = e as unknown as Probe;
  pr.setPost(post, yaw);
  return pr;
}

describe('Enemy: the lure, the search clamp and the leash', () => {
  it('secure / inLeash: only a high-security post is held to his circle', async () => {
    const free = await probe(null);
    expect(free.secure).toBe(false);
    expect(free.inLeash(50, 50)).toBe(true);
    const normal = await probe({ leash: 3 });
    expect(normal.secure).toBe(false);
    expect(normal.inLeash(50, 50)).toBe(true);
    const vault = await probe({ leash: 3, highSecurity: true });
    expect(vault.secure).toBe(true);
    expect(vault.inLeash(3, 0)).toBe(true);
    expect(vault.inLeash(4, 0)).toBe(false);
    expect(vault.inLeash(4, 0, 1)).toBe(true);
  });

  it('lureTo does nothing for a free guard or a normal post (the board decides)', async () => {
    const normal = await probe({ leash: 3 });
    normal.lureTo(8, 0, 10);
    expect(normal.lurePhase).toBe(LURE.idle);
  });

  it('a vault-door guard (leash 3) lured by a noise 8 m off: walks to his leash edge, looks >= 5 s within +-0.6 rad of it, walks back, faces his post', async () => {
    const postYaw = Math.PI; // faces -Z (the door behind him at +Z)
    const g = await probe({ leash: 3, highSecurity: true, guards: 'vault door' }, 0, 0, postYaw);
    g.lureTo(8, 0, 10);
    expect(g.lurePhase).toBe(LURE.walk);
    // the meter floor of a turn (never the investigate level from a sound alone)
    expect(g.meter).toBeGreaterThan(0);
    expect(g.meter).toBeLessThanOrEqual(HEARING.turnMax);
    const dt = 1 / 60;
    const speed = 1.2;
    let yaw = 0;
    let maxR = 0;
    let lookT = 0;
    let lookDev = 0;
    const seen: number[] = [];
    for (let k = 0; k < 60 * 40 && g.lurePhase !== LURE.done; k++) {
      const goal = g.calmDecide(dt);
      if (seen[seen.length - 1] !== g.lurePhase) seen.push(g.lurePhase);
      if (goal.point) {
        const dx = goal.point[0] - g.pos.x;
        const dz = goal.point[1] - g.pos.z;
        const d = Math.hypot(dx, dz);
        const s = Math.min(d, speed * dt);
        g.pos.x += (dx / d) * s;
        g.pos.z += (dz / d) * s;
      }
      if (goal.face !== null) yaw = goal.face;
      maxR = Math.max(maxR, Math.hypot(g.pos.x, g.pos.z));
      if (g.lurePhase === LURE.look) {
        lookT += dt;
        // the lure is due +X: bearing pi/2
        lookDev = Math.max(lookDev, Math.abs(yaw - Math.PI / 2));
      }
    }
    expect(seen).toEqual([LURE.walk, LURE.look, LURE.back, LURE.face, LURE.done]);
    // at the edge, never past it
    expect(g.lureLook[0]).toBeCloseTo(3, 5);
    expect(maxR).toBeLessThanOrEqual(3 + 1e-6);
    expect(maxR).toBeGreaterThan(3 - POST.arrive - 0.06);
    expect(lookT).toBeGreaterThanOrEqual(POST.lureLook - 0.05);
    expect(lookDev).toBeLessThanOrEqual(POST.lureSweep + 1e-6);
    expect(lookDev).toBeGreaterThan(0.3);
    // back on his post, facing it; then his normal standing post again (the walker rejoined)
    expect(Math.hypot(g.pos.x, g.pos.z)).toBeLessThan(POST.arrive + 0.06);
    expect(yaw).toBeCloseTo(postYaw, 5);
    expect(g.walker.rejoin).toHaveBeenCalledTimes(1);
  });

  it('a second noise at the same leash point does not restart the walk; a new one elsewhere does', async () => {
    const g = await probe({ leash: 3, highSecurity: true }, 0, 0, 0);
    g.lureTo(8, 0, 10);
    const look = [g.lureLook[0], g.lureLook[1]];
    g.calmDecide(1 / 60);
    g.lureTo(8.5, 0.2, 10);
    expect([g.lureLook[0], g.lureLook[1]]).toEqual(look);
    g.lureTo(0, -9, 10);
    expect(g.lureLook[1]).toBeCloseTo(-3, 5);
  });

  it('a revived guard keeps his post (inherit): leash centre, facing, high security, section and profile', async () => {
    const old = await probe({ leash: 3, highSecurity: true, guards: 'vault door' }, 4, -2, 1.25);
    const o = old as unknown as { section: number; profile: string };
    o.section = 2;
    o.profile = 'aggressive';
    Object.assign(old, { key: 5, squad: 1, info: null, walker: { tick: vi.fn(), rejoin: vi.fn(), waitMul: 1 } });
    // the new Enemy is built on the body, 6 m off his post, with no post of its own
    const back = await probe(null, 10, -2, 0);
    Object.assign(back, { section: 0, profile: 'standard' });
    (back as unknown as { inherit(o: Enemy, downFor?: number): void }).inherit(old as unknown as Enemy, 30);
    const b = back as unknown as Probe & { post: P2; postYaw: number; section: number; profile: string; key: number };
    expect(b.key).toBe(5);
    expect(b.secure).toBe(true);
    expect(b.postYaw).toBe(1.25);
    expect([b.post[0], b.post[1]]).toEqual([4, -2]);
    expect(b.inLeash(6.5, -2)).toBe(true);
    expect(b.inLeash(8, -2)).toBe(false);
    expect(b.section).toBe(2);
    expect(b.profile).toBe('aggressive');
  });

  it('a search (a body, a call) far off: a high-security post searches only from inside his leash', async () => {
    const g = await probe({ leash: 3, highSecurity: true }, 0, 0, 0);
    g.aware.set('searching');
    g.stimulus[0] = 20;
    g.stimulus[1] = 0;
    g.hasStimulus = true;
    g.calmDecide(1 / 60);
    const last = g.goals[g.goals.length - 1]!;
    expect(last[0]).toBeCloseTo(3, 5);
    expect(last[1]).toBeCloseTo(0, 5);
    // a free guard goes all the way
    const f = await probe(null);
    f.aware.set('searching');
    f.stimulus[0] = 20;
    f.hasStimulus = true;
    f.calmDecide(1 / 60);
    expect(f.goals[f.goals.length - 1]![0]).toBeCloseTo(20, 5);
  });
});
