import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { CMD_SEND, GuardView, IncidentBoard, LEVEL, MODE_COVER, MODE_INVESTIGATE, MODE_LEAD, MODE_LIGHT, type PathLen } from '../src/ai/incidents';
import {
  alarmRunMul,
  callerRank,
  isSecureZone,
  ROLE_DESK,
  ROLE_FIXED,
  ROLE_ROVER,
  ROLE_SUPERVISOR,
  roleFlags,
  roleSendMul,
  slotSquads,
  TAGS,
  zoneRadius,
} from '../src/ai/sectorTags';
import { DEFAULT_SQUAD_BASE, defaultSquads, squadId, validateGuardAi, validatePosts } from '../src/ai/guardAiData';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { AlarmPanel } from '../src/ai/alarm';
import type { Body } from '../src/ai/body';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import { checkSectorGuards, guardForTeam, SECTOR, sweepSourceOf, type SectorDef } from '../src/game/sectors';
import { CAMPUS_SECTORS, CAMPUS_SECURITY } from '../src/world/maps/campusSectors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import { hyp2 } from '../src/core/mathx';

// (guard-ai S5b) The Sector Ops guard tags (ENGINE.md section 7, `SectorGuard`) read by `EnemyManager.placeSlot`:
// squad (radio checks run; a down member is missed and two of his squad look for him), handler (a dog heels on its
// handler only, stays by him and barks when he goes down), zone (a secure zone answers first inside its circle), role
// (desk calls the checks, supervisor runs to the alarm first, a rover checks a light first). Pure parts and the wiring
// on stand-in guards.

describe('sectorTags: the pure helpers', () => {
  it('roles sort into classes (case-insensitive); unknown words are class 0', () => {
    expect(roleFlags('desk')).toBe(ROLE_DESK | ROLE_FIXED);
    expect(roleFlags('Operator')).toBe(ROLE_DESK | ROLE_FIXED);
    expect(roleFlags('supervisor')).toBe(ROLE_SUPERVISOR);
    expect(roleFlags('patrol')).toBe(ROLE_ROVER);
    expect(roleFlags('posted')).toBe(ROLE_FIXED);
    expect(roleFlags('smoker')).toBe(0);
    expect(roleFlags(undefined)).toBe(0);
  });

  it('secure zones: "secure", or a word "sec" / "secure" in the tag', () => {
    for (const z of ['secure', 's3-sec', 'secure_vault', 'lab-secure', 'SEC']) expect(isSecureZone(z), z).toBe(true);
    for (const z of ['s3-hall', 'security', 'sector', 'lobby', '', undefined]) expect(isSecureZone(z), String(z)).toBe(false);
  });

  it('zone circle: the post leash, else secureR, or the route reach + margin when larger; 0 when not secure', () => {
    expect(zoneRadius({ zone: 'lobby', x: 0, z: 0 })).toBe(0);
    expect(zoneRadius({ zone: 'secure', post: { leash: 3 }, x: 0, z: 0 })).toBe(3);
    expect(zoneRadius({ zone: 'secure', x: 0, z: 0 })).toBe(TAGS.secureR);
    expect(zoneRadius({ zone: 's3-sec', x: 0, z: 0, route: [[0, 0], [10, 0]] })).toBeCloseTo(10 + TAGS.routeMargin, 5);
  });

  it('multipliers: supervisor sends someone; a rover checks a light first, a fixed post last; alarm and caller order', () => {
    expect(roleSendMul(ROLE_SUPERVISOR, false)).toBe(TAGS.supervisorSend);
    expect(roleSendMul(ROLE_ROVER, true)).toBe(TAGS.lightRover);
    expect(roleSendMul(ROLE_ROVER, false)).toBe(1);
    expect(roleSendMul(ROLE_FIXED, true)).toBe(TAGS.lightFixed);
    expect(roleSendMul(0, true)).toBe(1);
    expect(alarmRunMul(ROLE_SUPERVISOR, false)).toBe(TAGS.supervisorAlarm);
    expect(alarmRunMul(0, true)).toBe(TAGS.officerAlarm);
    expect(alarmRunMul(0, false)).toBe(1);
    expect(callerRank(ROLE_SUPERVISOR, false)).toBeGreaterThan(callerRank(0, true));
    expect(callerRank(0, true)).toBeGreaterThan(callerRank(0, false));
  });

  it('slot squads: hand-set -> section x 100 + squad; none -> the cluster within 12 m; a dog -> its handler\'s', () => {
    const slots = [
      { x: 0, z: 0, squad: 1 },
      { x: 2, z: 0 },
      { x: 8, z: 0 },
      { x: 40, z: 0 },
      { x: 1, z: 1, handler: 3 },
    ];
    const out = new Int32Array(slots.length);
    slotSquads(slots, 2, out);
    expect(out[0]).toBe(squadId(2, 1));
    expect(out[1]).toBe(squadId(2, DEFAULT_SQUAD_BASE + 0));
    expect(out[2]).toBe(out[1]);
    expect(out[3]).not.toBe(out[1]);
    expect(out[4]).toBe(out[3]);
  });
});

// ----- the board -----

const straight: PathLen = { len: (ax, ay, az, bx, by, bz) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2 + (bz - az) ** 2) };

interface VG {
  id: number;
  x: number;
  z?: number;
  role?: number;
  zone?: [number, number, number];
}

function view(gs: VG[]): GuardView {
  const v = new GuardView(4);
  v.ensure(gs.length);
  v.n = gs.length;
  gs.forEach((g, i) => {
    v.set(i, g.id, g.x, 0, g.z ?? 0, LEVEL.unaware, 0, -1);
    v.setTags(i, g.role ?? 0, g.zone?.[0] ?? 0, g.zone?.[1] ?? 0, g.zone?.[2] ?? 0);
  });
  return v;
}

function sends(b: IncidentBoard): [number, number][] {
  const o = b.out;
  const r: [number, number][] = [];
  for (let k = 0; k < o.n; k++) if (o.cmd[k] === CMD_SEND) r.push([o.guard[k]!, o.mode[k]!]);
  return r;
}

describe('sectorTags on the incident board', () => {
  it('a missed member: his squad (the perceivers) goes as the pair, not a nearer guard of another squad', () => {
    const b = new IncidentBoard(straight);
    b.report('missing', 0, 0, 0, 7, new Int32Array([2, 3]), 2);
    b.tick(0, view([{ id: 1, x: 1 }, { id: 2, x: 9 }, { id: 3, x: 12 }]));
    expect(sends(b)).toEqual([
      [2, MODE_LEAD],
      [3, MODE_COVER],
    ]);
  });

  it('one squad mate free: he leads, the nearest other free guard covers', () => {
    const b = new IncidentBoard(straight);
    b.report('missing', 0, 0, 0, 7, new Int32Array([3]), 1);
    b.tick(0, view([{ id: 1, x: 1 }, { id: 2, x: 4 }, { id: 3, x: 12 }]));
    expect(sends(b)).toEqual([
      [3, MODE_LEAD],
      [1, MODE_COVER],
    ]);
  });

  it('a noise inside a secure zone: its guard answers first, though another heard it nearer', () => {
    const b = new IncidentBoard(straight);
    b.report('noise', 0, 0, 0, -1, new Int32Array([1]), 1);
    b.tick(0, view([{ id: 1, x: 2 }, { id: 2, x: 6, zone: [6, 0, 8] }]));
    expect(sends(b)).toEqual([[2, MODE_INVESTIGATE]]);
    // outside his zone circle he is no one special
    const b2 = new IncidentBoard(straight);
    b2.report('noise', 0, 0, 0, -1, new Int32Array([1]), 1);
    b2.tick(0, view([{ id: 1, x: 2 }, { id: 2, x: 6, zone: [6, 0, 3] }]));
    expect(sends(b2)).toEqual([[1, MODE_INVESTIGATE]]);
  });

  it('a light: a rover goes before a nearer fixed post; a supervisor sends someone', () => {
    const b = new IncidentBoard(straight);
    b.report('light', 0, 0, 0, 5, new Int32Array([1, 2]), 2);
    b.tick(0, view([{ id: 1, x: 5, role: ROLE_FIXED }, { id: 2, x: 6, role: ROLE_ROVER }]));
    expect(sends(b)[0]).toEqual([2, MODE_LIGHT]);
    const b2 = new IncidentBoard(straight);
    b2.report('noise', 0, 0, 0, -1, new Int32Array([1, 2]), 2);
    b2.tick(0, view([{ id: 1, x: 4, role: ROLE_SUPERVISOR }, { id: 2, x: 5 }]));
    expect(sends(b2)).toEqual([[2, MODE_INVESTIGATE]]);
  });
});

// ----- the manager, on stand-in guards -----

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  ko: boolean;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  runningAlarm: boolean;
  dog: object | null;
  buff: boolean;
  secure: boolean;
  level: string;
  incident: number;
  caution: number;
  squad: number;
  section: number;
  coverIdx: number;
  roleBound: boolean;
  roleFlags: number;
  job: string;
  zone: string;
  zoneR: number;
  slotIdx: number;
  handlerSlot: number;
  handler: FakeGuard | null;
  leader: FakeGuard | null;
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  bark: ReturnType<typeof vi.fn>;
  searchAt: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  sendTo: ReturnType<typeof vi.fn>;
  hear: ReturnType<typeof vi.fn>;
  hearTurn: ReturnType<typeof vi.fn>;
  runAlarm: ReturnType<typeof vi.fn>;
  [k: string]: unknown;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 7000 + n++;
  const g: FakeGuard = {
    id: `t${num}`,
    num,
    key: n,
    ko: false,
    alive: true,
    alerted: false,
    passive: false,
    taken: false,
    runningAlarm: false,
    dog: null,
    buff: false,
    secure: false,
    level: 'unaware',
    incident: -1,
    caution: 0,
    squad: -1,
    section: 0,
    coverIdx: -1,
    roleBound: false,
    roleFlags: 0,
    job: '',
    zone: '',
    zoneR: 0,
    slotIdx: -1,
    handlerSlot: -1,
    handler: null,
    leader: null,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    inLeash: () => true,
    bark: vi.fn(),
    searchAt: vi.fn(),
    pairSearch: vi.fn(),
    sendTo: vi.fn(),
    checkLight: vi.fn(),
    ack: vi.fn(),
    hear: vi.fn(),
    hearTurn: vi.fn(),
    lureTo: vi.fn(),
    radio: vi.fn(),
    runAlarm: vi.fn(),
    koSearch: vi.fn(),
    dispose: vi.fn(),
    setPost: vi.fn(),
    setGear: vi.fn(), // (guard-ai S12) placeSlot puts gear on him
    setCaution(c: number) {
      g.caution = c;
    },
    ...o,
  };
  return g;
}

const dog = (x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard => guard(x, z, { dog: {}, def: { melee: {}, kind: 'dog', scale: 1 }, ...o });

const E = (g: FakeGuard) => g as unknown as Enemy;
const HIT = {} as HitInfo;

interface Priv {
  ctx: AiContext;
  squads: Map<number, Enemy[]>;
  swapSlot(old: Enemy, e: Enemy): void;
  assignAlarm(): void;
}

function manager(gs: FakeGuard[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
    lightField: { totalAt: () => 0 },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: vi.fn(() => true) } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(E(g));
  em.stealth = true;
  const priv = em as unknown as Priv;
  /** Guard `g` goes down (as `Enemy.die` reports it). */
  const down = (g: FakeGuard, ko = true): void => {
    g.alive = false;
    g.ko = ko;
    priv.ctx.onKilled(E(g), HIT);
  };
  return { em, priv, down };
}

/** A section's guard list (only the fields placeSlot reads). */
type Slot = { kind: 'grunt' | 'dog' | 'officer'; x: number; z: number; yaw: number; squad?: number; handler?: number; zone?: string; role?: string; reason?: string; pair?: number };

/** Place every guard on its slot, in order (as `sectorMode.fill` does). */
function place(em: EnemyManager, gs: FakeGuard[], slots: Slot[], section = 0, order?: number[]): void {
  for (const i of order ?? slots.map((_, k) => k)) em.placeSlot(E(gs[i]!), slots[i]!, section, slots, i);
}

describe('placeSlot reads the sector tags', () => {
  it('squads (hand-set and the default cluster), zone, role, reason, pair; guardAtSlot', () => {
    const slots: Slot[] = [
      { kind: 'officer', x: 0, z: 0, yaw: 0, squad: 1, role: 'desk', zone: 's3-sec', reason: 'Reads the reports', pair: 2 },
      { kind: 'grunt', x: 3, z: 0, yaw: 0, squad: 1, role: 'patrol', zone: 's3-hall' },
      { kind: 'grunt', x: 30, z: 0, yaw: 0 },
      { kind: 'grunt', x: 34, z: 0, yaw: 0 },
    ];
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em, priv } = manager(gs);
    place(em, gs, slots, 2);
    expect(gs.map((g) => g.squad)).toEqual([201, 201, squadId(2, DEFAULT_SQUAD_BASE), squadId(2, DEFAULT_SQUAD_BASE)]);
    expect(priv.squads.get(201)).toEqual([E(gs[0]!), E(gs[1]!)]);
    expect(gs[0]!.roleFlags).toBe(ROLE_DESK | ROLE_FIXED);
    expect(gs[0]!.job).toBe('desk');
    expect(gs[0]!.zoneR).toBe(TAGS.secureR);
    expect(gs[1]!.zoneR).toBe(0);
    expect(gs[0]!.reason).toBe('Reads the reports');
    expect(gs[0]!.pairSlot).toBe(2);
    expect(gs[2]!.pairSlot).toBe(-1);
    expect(em.guardAtSlot(1)).toBe(E(gs[1]!));
    expect(em.guardAtSlot(9)).toBeNull();
    // without the slot list (other maps): only a hand-set squad joins
    const lone = guard(0, 0);
    const m2 = manager([lone]);
    m2.em.placeSlot(E(lone), { yaw: 0, squad: 3 }, 1);
    expect(lone.squad).toBe(103);
    const none = guard(0, 0);
    m2.em.placeSlot(E(none), { yaw: 0 }, 1);
    expect(none.squad).toBe(-1);
  });
});

describe('radio checks in Sector Ops (squad tag)', () => {
  const trio = (): Slot[] => [
    { kind: 'grunt', x: 0, z: 0, yaw: 0, squad: 0 },
    { kind: 'grunt', x: 6, z: 0, yaw: 0, squad: 0 },
    { kind: 'grunt', x: 0, z: 6, yaw: 0, squad: 0 },
    { kind: 'grunt', x: 2, z: 2, yaw: 0, squad: 1 },
  ];

  it('a squad of 3, one taken out: at the next check the other two search for him (lead + cover); once only', () => {
    const slots = trio();
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em, down } = manager(gs);
    place(em, gs, slots);
    down(gs[0]!);
    expect(gs[1]!.pairSearch).not.toHaveBeenCalled();
    em.radioCheckNow();
    expect(em.radioMisses).toBe(1);
    expect(em.board.openCount).toBe(1);
    const leads = [gs[1]!, gs[2]!].map((g) => g.pairSearch.mock.calls[0]?.[3]);
    expect(leads.sort()).toEqual([false, true]);
    for (const g of [gs[1]!, gs[2]!]) {
      const [x, z] = g.pairSearch.mock.calls[0]!;
      // the lead goes to where he went down; the cover holds short of it
      expect(Math.hypot(x - 0, z - 0)).toBeLessThanOrEqual(5.01);
    }
    // the guard of the other squad (nearer) is not sent
    expect(gs[3]!.pairSearch).not.toHaveBeenCalled();
    expect((gs[1]!.bark as ReturnType<typeof vi.fn>).mock.calls.flat().concat((gs[2]!.bark as ReturnType<typeof vi.fn>).mock.calls.flat())).toContain('missed');
    em.radioCheckNow();
    expect(em.radioMisses).toBe(1);
  });

  it('a down member whose body was found already is not missed (the section knows)', () => {
    const slots = trio();
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em, down } = manager(gs);
    place(em, gs, slots);
    down(gs[0]!);
    em.bodies.push({ enemyId: gs[0]!.id, found: true, present: true, lethal: false, pos: gs[0]!.pos.clone() } as unknown as Body);
    em.radioCheckNow();
    expect(em.radioMisses).toBe(0);
  });

  it('a desk role calls every squad of his section; a miss in another squad is called by him', () => {
    const slots: Slot[] = [
      { kind: 'officer', x: 20, z: 0, yaw: 0, squad: 2, role: 'desk' },
      { kind: 'grunt', x: 0, z: 0, yaw: 0, squad: 0 },
      { kind: 'grunt', x: 4, z: 0, yaw: 0, squad: 0 },
      { kind: 'grunt', x: 0, z: 4, yaw: 0, squad: 0 },
    ];
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em, down } = manager(gs);
    place(em, gs, slots);
    down(gs[1]!);
    em.radioCheckNow();
    expect(em.lastCheckCaller).toBe(E(gs[0]!));
    const deskLines = (gs[0]!.bark as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(deskLines.filter((l) => l === 'radioCheck')).toHaveLength(1);
    expect(deskLines).toContain('missed');
    // the squad's own members go, the desk stays
    expect(gs[0]!.pairSearch).not.toHaveBeenCalled();
    expect(gs[2]!.pairSearch).toHaveBeenCalled();
    expect(gs[3]!.pairSearch).toHaveBeenCalled();
    expect((gs[2]!.bark as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0])).not.toContain('radioCheck');
  });

  it('a squad of one has no check of its own (nobody to answer); a desk covers him', () => {
    const slots: Slot[] = [{ kind: 'grunt', x: 0, z: 0, yaw: 0, squad: 0 }];
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em } = manager(gs);
    place(em, gs, slots);
    em.radioCheckNow();
    expect(gs[0]!.bark).not.toHaveBeenCalled();
    const slots2: Slot[] = [
      { kind: 'grunt', x: 0, z: 0, yaw: 0, squad: 0 },
      { kind: 'officer', x: 30, z: 0, yaw: 0, squad: 1, role: 'desk' },
    ];
    const gs2 = slots2.map((s) => guard(s.x, s.z));
    const m2 = manager(gs2);
    place(m2.em, gs2, slots2);
    m2.down(gs2[0]!);
    m2.em.radioCheckNow();
    expect(m2.em.radioMisses).toBe(1);
    // (guard-ai S14) the line names the unit he missed (his slot + 1)
    expect(gs2[1]!.bark).toHaveBeenCalledWith('missed', 1);
  });

  it('parked modes (not coordinated): the caller searches the spot himself (the old rule)', () => {
    const slots = trio();
    const gs = slots.map((s) => guard(s.x, s.z));
    const { em, down } = manager(gs);
    em.coordinated = false;
    place(em, gs, slots);
    down(gs[0]!);
    em.radioCheckNow();
    const searched = [gs[1]!, gs[2]!].filter((g) => (g.searchAt as ReturnType<typeof vi.fn>).mock.calls.length > 0);
    expect(searched).toHaveLength(1);
    expect(em.board.openCount).toBe(0);
  });
});

describe('the handler tag: a dog heels on its handler', () => {
  const pairSlots = (): Slot[] => [
    { kind: 'grunt', x: 0, z: 0, yaw: 0, squad: 0, role: 'handler' },
    { kind: 'dog', x: 1, z: 0, yaw: 0, handler: 0 },
    { kind: 'grunt', x: 6, z: 0, yaw: 0, squad: 0 },
  ];

  it('bound at placement (the dog after its handler, or before: bound when he comes), in his squad', () => {
    const slots = pairSlots();
    const gs = [guard(0, 0), dog(1, 0), guard(6, 0)];
    const { em, priv } = manager(gs);
    place(em, gs, slots);
    expect(gs[1]!.handler).toBe(gs[0]);
    expect(gs[1]!.leader).toBe(gs[0]);
    expect(gs[1]!.squad).toBe(gs[0]!.squad);
    expect(priv.squads.get(gs[0]!.squad)).toContain(E(gs[1]!));
    // the dog placed first
    const gs2 = [guard(0, 0), dog(1, 0), guard(6, 0)];
    const m2 = manager(gs2);
    place(m2.em, gs2, slots, 0, [1, 0, 2]);
    expect(gs2[1]!.handler).toBe(gs2[0]);
  });

  it('the handler goes down: the dog searches by him and barks (a guard in reach hears it); the dog is not missed', () => {
    const slots = pairSlots();
    const gs = [guard(0, 0), dog(1, 0), guard(6, 0)];
    const { em, down } = manager(gs);
    place(em, gs, slots);
    down(gs[0]!, false);
    expect(gs[1]!.searchAt).toHaveBeenCalledWith(0, 0, null);
    expect(gs[1]!.bark).toHaveBeenCalledWith('dog');
    expect(gs[1]!.hear).not.toHaveBeenCalled();
    const heard = (gs[2]!.sendTo as ReturnType<typeof vi.fn>).mock.calls.length + (gs[2]!.hearTurn as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(heard).toBeGreaterThan(0);
    // a dead dog is not on the radio
    gs[1]!.alive = false;
    em.radioCheckNow();
    expect(em.radioMisses).toBe(1);
  });

  it('a woken handler takes his slot and his dog back; a despawned one frees it', () => {
    const slots = pairSlots();
    const gs = [guard(0, 0), dog(1, 0), guard(6, 0)];
    const { em, priv } = manager(gs);
    place(em, gs, slots);
    const back = guard(0, 0, { slotIdx: 0 });
    priv.swapSlot(E(gs[0]!), E(back));
    expect(gs[1]!.handler).toBe(back);
    expect(em.guardAtSlot(0)).toBe(E(back));
    em.enemies.push(E(back));
    em.despawn(E(back));
    expect(gs[1]!.handler).toBeNull();
    expect(em.guardAtSlot(0)).toBeNull();
  });

  it('Enemy.findLeader keeps a bound handler, alive or down', async () => {
    const { Enemy: EnemyClass } = await import('../src/ai/enemy');
    const h = { alive: false, dog: null } as unknown as Enemy;
    const d = Object.assign(Object.create(EnemyClass.prototype) as Enemy, { handler: h, leader: null }) as unknown as { findLeader(): Enemy | null; leader: Enemy | null };
    expect(d.findLeader()).toBe(h);
    expect(d.leader).toBe(h);
  });
});

describe('the role tag: the alarm runner', () => {
  it('a supervisor runs to the panel before a nearer officer', () => {
    const sup = guard(0, 10, { alerted: true, roleFlags: ROLE_SUPERVISOR, def: { melee: null, kind: 'enforcer', scale: 1 } });
    const off = guard(0, 4, { alerted: true, def: { melee: null, kind: 'officer', scale: 1 } });
    const { em, priv } = manager([sup, off]);
    const panel: AlarmPanel = { id: 'p', x: 0, y: 0, z: 0, yaw: 0, disabled: false };
    em.alarms.push(panel);
    priv.assignAlarm();
    expect(sup.runAlarm).toHaveBeenCalledTimes(1);
    expect(off.runAlarm).not.toHaveBeenCalled();
  });
});

/** FNV-1a of a guard list's JSON (key order as the data writes it): a change to any base guard changes it. */
function fnv(list: readonly unknown[]): string {
  const str = JSON.stringify(list);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}
/** The base (untagged) guard count and list hash per section as master shipped them (before the coop4 tags). */
const MASTER_BASE: Record<string, { count: number; hash: string }> = {
  'campus s1': { count: 8, hash: 'cb0b2fb8' },
  'campus s2': { count: 12, hash: 'ddcfab59' },
  'campus s3': { count: 16, hash: '80096eec' },
  'campus s4': { count: 20, hash: '59969eec' },
  'campus s5': { count: 24, hash: '1494aabf' },
  'warehouse service': { count: 8, hash: '710a29b7' },
  'warehouse racking': { count: 8, hash: '7f6c84f6' },
  'warehouse floor': { count: 9, hash: 'db3f95a3' },
};

// (coop4 DATA, A8) The extra guards the map data tags `minPlayers` 3 or 4: at most 2 per section, appended after the base
// list, each with a reason, never a desk operator, valid under the section's guard checks; a team of 1-2 spawns exactly
// today's list (the base guards), a team of 4 spawns today's list plus the tags.
describe('coop4 DATA: minPlayers guard tags (campus S1-S5, warehouse sections)', () => {
  const SECTIONS: { label: string; def: SectorDef; index: number; sections: number }[] = [];
  CAMPUS_SECTORS.forEach((def, index) => SECTIONS.push({ label: `campus ${def.id}`, def, index, sections: CAMPUS_SECTORS.length }));
  WAREHOUSE_SECTORS.forEach((def, index) => SECTIONS.push({ label: `warehouse ${def.id}`, def, index, sections: WAREHOUSE_SECTORS.length }));
  const MASTER = MASTER_BASE;

  const tagged = (d: SectorDef): SectorDef['guards'] => d.guards.filter((g) => g.minPlayers !== undefined);
  const spawned = (d: SectorDef, team: number): SectorDef['guards'] => d.guards.filter((g) => guardForTeam(g, team));
  /** Desk operators: the guards the campus security data's desks name (an unspawned one would read as an unmanned desk). */
  const operators = (index: number, campus: boolean): Set<number> => new Set(campus ? (CAMPUS_SECURITY.desks ?? []).filter((q) => q.section === index && q.operator !== undefined).map((q) => q.operator!) : []);

  for (const s of SECTIONS) {
    const campus = s.label.startsWith('campus');
    const t = tagged(s.def);
    const m = MASTER[s.label];

    it(`${s.label}: at most 2 tagged guards, minPlayers 3 or 4, each with a reason`, () => {
      expect(t.length).toBeLessThanOrEqual(2);
      for (const g of t) {
        expect([3, 4], `${s.label} minPlayers`).toContain(g.minPlayers);
        expect(g.reason && g.reason.length > 30, `${s.label} (${g.x}, ${g.z}) reason`).toBe(true);
      }
    });

    it(`${s.label}: the tags are appended (the base list keeps its indices), none is a desk operator, dog, handler, post, pair or enforcer`, () => {
      const first = s.def.guards.length - t.length;
      s.def.guards.forEach((g, i) => expect(g.minPlayers !== undefined, `${s.label} guard ${i}`).toBe(i >= first));
      const ops = operators(s.index, campus);
      const handlers = new Set(s.def.guards.map((g) => g.handler).filter((h): h is number => h !== undefined));
      const pairs = new Set(s.def.guards.map((g) => g.pair).filter((h): h is number => h !== undefined));
      s.def.guards.forEach((g, i) => {
        if (g.minPlayers === undefined) return;
        expect(ops.has(i), `${s.label} guard ${i} is a desk operator`).toBe(false);
        expect(roleFlags(g.role) & ROLE_DESK, `${s.label} guard ${i} role ${g.role}`).toBe(0);
        expect(handlers.has(i) || pairs.has(i), `${s.label} guard ${i} is a handler or pair partner`).toBe(false);
        expect(g.kind, `${s.label} guard ${i}`).not.toBe('enforcer');
        expect(g.kind, `${s.label} guard ${i}`).not.toBe('dog');
        expect(g.handler === undefined && g.pair === undefined && g.post === undefined && !g.dormant, `${s.label} guard ${i} tags`).toBe(true);
      });
    });

    it(`${s.label}: a team of 1-2 spawns exactly today's list; 3 adds the 3-tags; 4 adds all the tags`, () => {
      const base = s.def.guards.filter((g) => g.minPlayers === undefined);
      expect(base.length, `${s.label} base count`).toBe(m!.count);
      expect(fnv(base), `${s.label} base list`).toBe(m!.hash);
      expect(spawned(s.def, 1)).toEqual(base);
      expect(spawned(s.def, 2)).toEqual(base);
      expect(spawned(s.def, 3)).toEqual([...base, ...t.filter((g) => g.minPlayers === 3)]);
      expect(spawned(s.def, 4)).toEqual(s.def.guards);
      expect(spawned(s.def, 4).length).toBe(base.length + t.length);
    });

    it(`${s.label}: every tagged guard passes the section's guard checks, and a full team stays within SECTOR.maxAlive`, () => {
      expect(checkSectorGuards(s.def), s.label).toEqual([]);
      expect(validatePosts(s.def.guards, s.def.id), s.label).toEqual([]);
      expect(validateGuardAi({}, s.def.guards, { sections: s.sections, section: s.index }), s.label).toEqual([]);
      s.def.guards.forEach((g, i) => {
        if (g.minPlayers !== undefined) {
          expect(hyp2(g.x - s.def.start.x, g.z - s.def.start.z), `${s.label} guard ${i} from the start`).toBeGreaterThanOrEqual(7);
          expect(g.route === undefined || (Math.abs(g.route[0]![0] - g.x) < 0.1 && Math.abs(g.route[0]![1] - g.z) < 0.1), `${s.label} guard ${i} starts on its route`).toBe(true);
        }
      });
      expect(s.def.guards.length + SECTOR.alarmMax * s.def.perStage, s.label).toBeLessThanOrEqual(SECTOR.maxAlive);
      expect(s.def.guards.length, s.label).toBeLessThanOrEqual(SECTOR.maxAlive);
    });
  }

  it('the counts: every section tags at least one guard, no more than 2; the section list is campus x5 + warehouse x3', () => {
    expect(SECTIONS.length).toBe(8);
    for (const s of SECTIONS) {
      const n = tagged(s.def).length;
      expect(n, s.label).toBeGreaterThanOrEqual(1);
      expect(n, s.label).toBeLessThanOrEqual(2);
    }
  });
});

describe('coop4 A8: the minPlayers tags never change a small team', () => {
  it('every section: the base guards keep the squads they have without the tags (team of 1-2 plays master)', () => {
    for (const s of [...CAMPUS_SECTORS, ...WAREHOUSE_SECTORS]) {
      const full = s.guards;
      const base = full.filter((g) => g.minPlayers === undefined);
      const outFull: number[] = [];
      const outBase: number[] = [];
      defaultSquads(full, outFull);
      defaultSquads(base, outBase);
      let bi = 0;
      for (let i = 0; i < full.length; i++) {
        if (full[i]!.minPlayers !== undefined) continue;
        expect(outFull[i], `${s.id} guard ${i + 1}`).toBe(outBase[bi]);
        bi++;
      }
    }
  });
});

describe('coop4 data check polish: the alarm sweep source follows the team', () => {
  /** Master's sweep source: every guard of the (untagged) list, dogs left out. */
  const master = (guards: SectorDef['guards']) => {
    const routes: (readonly [number, number])[][] = [];
    const posts: [number, number][] = [];
    for (const q of guards) {
      if (q.kind === 'dog') continue;
      if (q.route && q.route.length) routes.push(q.route);
      else posts.push([q.x, q.z]);
    }
    return [routes, posts];
  };
  it('every section: a team of 1 or 2 sweeps master\'s points; 3 and 4 add only the guards spawned for them', () => {
    for (const s of [...CAMPUS_SECTORS, ...WAREHOUSE_SECTORS]) {
      const base = s.guards.filter((g) => g.minPlayers === undefined);
      expect(sweepSourceOf(s.guards, 1), s.id).toEqual(master(base));
      expect(sweepSourceOf(s.guards, 2), s.id).toEqual(master(base));
      for (const n of [3, 4]) expect(sweepSourceOf(s.guards, n), `${s.id} x${n}`).toEqual(master(s.guards.filter((g) => guardForTeam(g, n))));
      expect(sweepSourceOf(s.guards, 4), s.id).toEqual(master(s.guards));
    }
  });
});
