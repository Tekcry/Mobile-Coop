import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { RADIO, type CallKind } from '../src/ai/radioNet';
import { ALERT_MISSING, ALERT_NONE, ALERT_SHOTS, Awareness } from '../src/ai/awareness';
import { MISSING, SHOTS } from '../src/ai/gear';
import { AlertCallLog, ALERT_LOG, SectionCounters, unitOf } from '../src/ai/sectionAlert';
import { BarkVoice, unitWord } from '../src/ai/barks';
import { Vector3, type Scene } from '../src/core/babylon';
import type { AiContext, Enemy } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';
import type { HitInfo } from '../src/game/damage';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';

// (guard-ai S14, stealth over shooting items 6 and 7, A40 / A41) Section alert: a missed check-in or a loud shot is
// radioed (cuttable); delivered, the section is cautious on a timed hold (180 s / 120 s), a dead find promotes it to
// the S4 held caution, a shots call sends a pair; suppressed shots never call; the per-section tallies.

// ---------------------------------------------------------------------------------------------------------------
// the timed hold (awareness.ts)

describe('Awareness.timedHold (the timed section alert)', () => {
  it('cautious for its time, then calm on its own (5 Hz ticks)', () => {
    const a = new Awareness();
    expect(a.timedHold(3, MISSING.cautious, ALERT_MISSING)).toBe(true);
    expect(a.cautionOf(3)).toBe(1);
    expect(a.alertOf(3)).toBe(ALERT_MISSING);
    expect(a.isSearching(3)).toBe(false);
    for (let k = 0; k < Math.round((MISSING.cautious - 0.4) / 0.2); k++) a.tick(0.2);
    expect(a.cautionOf(3)).toBe(1);
    expect(a.alertLeft(3)).toBeCloseTo(0.4, 1);
    // (Float32 timers: a hair of drift over 900 ticks)
    for (let k = 0; k < 3; k++) a.tick(0.2);
    expect(a.cautionOf(3)).toBe(0);
    expect(a.alertLeft(3)).toBe(0);
    expect(a.alertOf(3)).toBe(ALERT_NONE);
  });
  it('a later call refreshes it (the longer time runs on); a shorter one does not cut it', () => {
    const a = new Awareness();
    a.timedHold(1, SHOTS.cautious, ALERT_SHOTS);
    for (let k = 0; k < 300; k++) a.tick(0.2);
    expect(a.alertLeft(1)).toBeCloseTo(SHOTS.cautious - 60, 2);
    a.timedHold(1, SHOTS.cautious, ALERT_SHOTS);
    expect(a.alertLeft(1)).toBe(SHOTS.cautious);
    a.timedHold(1, 10, ALERT_MISSING);
    expect(a.alertLeft(1)).toBe(SHOTS.cautious);
    expect(a.alertOf(1)).toBe(ALERT_SHOTS);
    a.timedHold(1, MISSING.cautious, ALERT_MISSING);
    expect(a.alertOf(1)).toBe(ALERT_MISSING);
  });
  it('a guard down (dead, or knocked out and not woken) does not take it; going down drops it', () => {
    const a = new Awareness();
    a.timedHold(2, 100, ALERT_MISSING);
    a.onDown(2, false);
    expect(a.alertLeft(2)).toBe(0);
    expect(a.timedHold(2, 100, ALERT_MISSING)).toBe(false);
    a.onDown(4, true);
    expect(a.timedHold(4, 100, ALERT_SHOTS)).toBe(false);
    expect(a.timedHold(-1, 100, ALERT_SHOTS)).toBe(false);
    expect(a.timedHold(5, 0, ALERT_SHOTS)).toBe(false);
  });
  it('dead find promotes: a held caution beats the timed one; the timer runs on underneath', () => {
    const a = new Awareness();
    a.timedHold(0, MISSING.cautious, ALERT_MISSING);
    a.timedHold(1, MISSING.cautious, ALERT_MISSING);
    const h = a.openHold('dead', 0b1);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(a.cautionOf(0)).toBe(2);
    expect(a.cautionOf(1)).toBe(1);
    a.addAware(h, 1);
    expect(a.cautionOf(1)).toBe(2);
    // the timed hold ends under the held one: still held
    for (let k = 0; k < Math.round((MISSING.cautious + 1) / 0.2); k++) a.tick(0.2);
    expect(a.cautionOf(0)).toBe(2);
    expect(a.alertLeft(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// the pure helpers (sectionAlert.ts, barks.ts)

describe('sectionAlert helpers', () => {
  it('AlertCallLog: finds a logged (kind, incident, caller); the same call again moves its spot; a ring of ALERT_LOG', () => {
    const log = new AlertCallLog();
    const s = log.add(ALERT_SHOTS, -2, 7, 1, 2, 3);
    expect(log.find(ALERT_SHOTS, -2, 7)).toBe(s);
    expect(log.find(ALERT_MISSING, -2, 7)).toBe(-1);
    expect(log.find(ALERT_SHOTS, -2, 8)).toBe(-1);
    expect(log.add(ALERT_SHOTS, -2, 7, 4, 5, 6)).toBe(s);
    expect([log.x[s], log.y[s], log.z[s]]).toEqual([4, 5, 6]);
    for (let i = 0; i < ALERT_LOG; i++) log.add(ALERT_MISSING, -10 - i, 1, 0, 0, 0);
    expect(log.find(ALERT_SHOTS, -2, 7)).toBe(-1);
    log.clear();
    expect(log.find(ALERT_MISSING, -10 - ALERT_LOG + 1, 1)).toBe(-1);
  });
  it('unit numbers: slot + 1, else key + 1; said as words', () => {
    expect(unitOf(2, 9)).toBe(3);
    expect(unitOf(-1, 4)).toBe(5);
    expect(unitOf(-1, -1)).toBe(0);
    expect(unitWord(3)).toBe('three');
    expect(unitWord(14)).toBe('14');
    const v = new BarkVoice(0);
    const line = v.sayUnit('missed', 3);
    expect(line).toContain('Unit three');
    expect(line).not.toContain('{unit}');
    // no unit lines for the event: the plain line
    expect(new BarkVoice(0).sayUnit('radioCheck', 3)).toBe(new BarkVoice(0).say('radioCheck'));
  });
  it('SectionCounters reset to zero', () => {
    const c = new SectionCounters();
    c.bodiesFound = 2;
    c.missedChecks = 3;
    c.shotsCalls = 1;
    c.radioAlarms = 1;
    c.reset();
    expect([c.bodiesFound, c.missedChecks, c.shotsCalls, c.radioAlarms]).toEqual([0, 0, 0, 0]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// wired into EnemyManager, on stand-in guards

interface FakeGuard {
  id: string;
  num: number;
  key: number;
  ko: boolean;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  taken: boolean;
  level: string;
  incident: number;
  caution: number;
  blindT: number;
  pos: Vector3;
  bark: ReturnType<typeof vi.fn>;
  sendTo: ReturnType<typeof vi.fn>;
  pairSearch: ReturnType<typeof vi.fn>;
  hearGunfire: ReturnType<typeof vi.fn>;
  /** (guard-ai S24) told of an intruder slot (a located shot). */
  tell: ReturnType<typeof vi.fn>;
  [k: string]: unknown;
}

let n = 0;
let ctxRef: AiContext | null = null;
function guard(x: number, z: number, key: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 6000 + n++;
  const g: FakeGuard = {
    id: `s${num}`,
    num,
    key,
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
    blindT: 0,
    aware: { fought: false },
    squad: -1,
    section: 0,
    coverIdx: -1,
    roleFlags: 0,
    zoneR: 0,
    slotIdx: -1,
    handler: null,
    leader: null,
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: Math.PI,
    bark: vi.fn(),
    searchAt: vi.fn(),
    // (guard-ai S18) a dead body's search (`Enemy.bodySearch`); (S19) sent to a reported one (`helpSearch`)
    bodySearch: vi.fn(),
    helpSearch: vi.fn((_x: number, _z: number, inc: number) => {
      g.incident = inc;
    }),
    sendTo: vi.fn((_x: number, _z: number, inc: number) => {
      g.incident = inc;
    }),
    // the real pairSearch: the lead radios his own `missing` report (S2), under the board's incident
    pairSearch: vi.fn((_x: number, _z: number, inc: number, lead: boolean) => {
      g.incident = inc;
      if (lead) ctxRef?.radioCall?.(g as unknown as Enemy, inc, 'missing');
    }),
    checkLight: vi.fn(),
    ack: vi.fn(),
    hear: vi.fn(),
    hearTurn: vi.fn(),
    tell: vi.fn(),
    hearGunfire: vi.fn(() => {
      g.alerted = true;
      g.level = 'alert';
    }),
    lureTo: vi.fn(),
    radio: vi.fn(),
    koSearch: vi.fn(),
    dispose: vi.fn(),
    setCaution(c: number) {
      g.caution = c;
    },
    ...o,
  };
  return g;
}

const E = (g: FakeGuard) => g as unknown as Enemy;
const HIT = {} as HitInfo;

interface Priv {
  ctx: AiContext;
  radioStep(dt: number): void;
  syncCaution(): void;
  bodyFound(e: Enemy, b: Body, also?: number): void;
  pairMissing(pm: unknown, A: Enemy | null, B: Enemy | null): void;
  radioAlarm(caller: number): void;
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
  ctxRef = priv.ctx;
  const starts = vi.spyOn(em.radioNet, 'startCall');
  /** The 10 Hz radio net and the 5 Hz awareness clock for `sec` s. */
  const run = (sec: number): void => {
    for (let k = 0; k < Math.round(sec / 0.1); k++) {
      priv.radioStep(0.1);
      if (k % 2 === 1) {
        em.awareness.tick(0.2);
        priv.syncCaution();
      }
    }
  };
  /** Guard `g` goes down unseen (`Enemy.die` / `knockOut`: his calls are cut, then the manager hears of it). */
  const down = (g: FakeGuard, ko = true): void => {
    priv.ctx.radioCut?.(E(g));
    g.alive = false;
    g.ko = ko;
    priv.ctx.onKilled(E(g), HIT);
  };
  /** The calls started of `kind` (spy on the net). */
  const calls = (kind: CallKind): number => starts.mock.calls.filter((c) => c[2] === kind).length;
  return { em, priv, run, down, calls };
}

/** The S14 alert's time on guard `g` (0 none). */
const left = (em: EnemyManager, g: FakeGuard): number => em.awareness.alertLeft(g.key);
const CALL = RADIO.callIn * DIFFICULTY.normal.reaction;

/** A squad of three (77) and a far guard of the section in no squad. */
function squad() {
  const a = guard(0, 0, 0);
  const b = guard(6, 0, 1);
  const c = guard(0, 6, 2);
  const far = guard(40, 30, 3);
  const m = manager([a, b, c, far]);
  for (const g of [a, b, c]) m.em.joinSquad(E(g), 77);
  return { a, b, c, far, ...m };
}

describe('a missed check-in (S5b radio check): the section is told', () => {
  it('the caller radios it (cuttable, RADIO.callIn x reaction); delivered, the whole section is cautious 180 s; the pair still searches', () => {
    const { a, b, c, far, em, run, down, calls } = squad();
    down(c);
    em.radioCheckNow();
    const caller = [a, b].find((g) => g.bark.mock.calls.some((k) => k[0] === 'missed'))!;
    expect(caller).toBeDefined();
    // "Unit three, report..." (c is key 2: unit 3)
    expect(caller.bark).toHaveBeenCalledWith('missed', 3);
    expect(calls('missing')).toBeGreaterThanOrEqual(1);
    expect(em.radioLeft(E(caller))).toBeCloseTo(CALL, 3);
    // the S5b pair search: both squad mates go (lead + cover)
    expect(a.pairSearch).toHaveBeenCalledTimes(1);
    expect(b.pairSearch).toHaveBeenCalledTimes(1);
    expect(far.caution).toBe(0);
    run(CALL - 0.2);
    expect(far.caution).toBe(0);
    run(0.3 + RADIO.staggerMax + 0.3);
    for (const g of [a, b, far]) {
      expect(g.caution).toBe(1);
      expect(em.awareness.alertOf(g.key)).toBe(ALERT_MISSING);
      expect(left(em, g)).toBeGreaterThan(MISSING.cautious - RADIO.staggerMax - 1);
      expect(left(em, g)).toBeLessThanOrEqual(MISSING.cautious);
    }
    expect(caller.bark).toHaveBeenCalledWith('missingReport');
    expect(em.sectionCounts.missedChecks).toBe(1);
    // ... and it lapses on its own
    run(MISSING.cautious + 1);
    expect(far.caution).toBe(0);
  });

  it('cut call = no caution: the caller taken during the call, nobody is cautious (the S2 lead report is only an ack)', () => {
    const { a, b, c, far, em, run, down } = squad();
    down(c);
    em.radioCheckNow();
    const caller = [a, b].find((g) => g.bark.mock.calls.some((k) => k[0] === 'missed'))!;
    const other = caller === a ? b : a;
    run(1);
    down(caller);
    run(CALL + RADIO.staggerMax + 2);
    for (const g of [other, far]) {
      expect(left(em, g)).toBe(0);
      expect(g.caution).toBe(0);
    }
    // the miss still counts
    expect(em.sectionCounts.missedChecks).toBe(1);
  });

  it('dead find promotes: the section on its timed caution; the pair finds him dead: held (S4), the timer underneath', () => {
    const { a, b, c, far, em, priv, run, down } = squad();
    down(c, false);
    em.radioCheckNow();
    run(CALL + RADIO.staggerMax + 0.5);
    expect(far.caution).toBe(1);
    const body = { enemyId: c.id, guardKey: c.key, guard: c, lethal: true, found: false, present: true, pos: c.pos.clone(), age: 0, dispose: vi.fn() } as unknown as Body;
    em.bodies.push(body);
    priv.bodyFound(E(a), body);
    expect(a.caution).toBe(2);
    run(CALL + RADIO.staggerMax + 0.5);
    for (const g of [a, b, far]) expect(g.caution).toBe(2);
    expect(left(em, far)).toBeGreaterThan(0);
    expect(em.sectionCounts.bodiesFound).toBe(1);
  });

  it('a talking pair whose partner never came (S10): the one left radios it; delivered, cautious', () => {
    const a = guard(0, 0, 0);
    const b = guard(10, 0, 1);
    const far = guard(30, 20, 2);
    const { em, priv, run, down } = manager([a, b, far]);
    down(b);
    priv.pairMissing({ lookFor: 0, lookX: 10, lookZ: 0 }, E(a), E(b));
    expect(em.radioLeft(E(a))).toBeGreaterThan(0);
    run(CALL + RADIO.staggerMax + 0.5);
    expect(far.caution).toBe(1);
    expect(em.awareness.alertOf(far.key)).toBe(ALERT_MISSING);
    expect(em.sectionCounts.missedChecks).toBe(1);
  });

  it('parked modes (not coordinated): no call, nobody cautious', () => {
    const { c, far, em, run, down, calls } = squad();
    em.coordinated = false;
    down(c);
    em.radioCheckNow();
    run(CALL + RADIO.staggerMax + 0.5);
    expect(calls('missing')).toBe(0);
    expect(far.caution).toBe(0);
  });
});

describe('a loud shot: one calm hearer radios it', () => {
  /** A guard 20 m from the shot (tier 1: he only turns), one 15 m off the far side (out of reach of it), one far. */
  function shots() {
    const ear = guard(0, 20, 0);
    const mate = guard(0, 40, 1);
    const far = guard(60, 60, 2);
    const m = manager([ear, mate, far]);
    return { ear, mate, far, ...m };
  }
  const P = new Vector3(0, 0, 0);

  it('he radios it (one call); delivered, the section is cautious 120 s and a pair goes to the spot', () => {
    const { ear, mate, far, em, run, calls } = shots();
    em.noise(P, 28);
    expect(calls('shots')).toBe(1);
    expect(ear.bark).toHaveBeenCalledWith('shots');
    expect(em.radioLeft(E(ear))).toBeCloseTo(CALL, 3);
    expect(far.caution).toBe(0);
    run(CALL + RADIO.staggerMax + 0.5);
    for (const g of [ear, mate, far]) {
      expect(g.caution).toBe(1);
      expect(em.awareness.alertOf(g.key)).toBe(ALERT_SHOTS);
      expect(left(em, g)).toBeLessThanOrEqual(SHOTS.cautious);
      expect(left(em, g)).toBeGreaterThan(SHOTS.cautious - RADIO.staggerMax - 1);
    }
    expect(ear.bark).toHaveBeenCalledWith('shotsReport');
    // the pair: a lead walks to the spot, a cover holds short of it; one shots incident
    const lead = [ear, mate, far].filter((g) => g.sendTo.mock.calls.length > 0);
    const cover = [ear, mate, far].filter((g) => g.pairSearch.mock.calls.some((k) => k[3] === false));
    expect(lead).toHaveLength(1);
    expect(cover).toHaveLength(1);
    expect(lead[0]!.incident).toBe(cover[0]!.incident);
    expect(em.board.kindOf(lead[0]!.incident)).toBe('shots');
    expect(em.sectionCounts.shotsCalls).toBe(1);
    // no alarm from shots (M4)
    expect(em.alarmRaised).toBe(false);
    expect(calls('command')).toBe(0);
  });

  it('one call per shots incident: more shots while the call goes out join it; the next one after is a new call', () => {
    const { em, run, calls } = shots();
    em.noise(P, 28);
    run(0.5);
    em.noise(new Vector3(2, 0, 1), 28);
    run(0.5);
    em.noise(P, 28);
    expect(calls('shots')).toBe(1);
    run(CALL + RADIO.staggerMax);
    em.noise(P, 28);
    expect(calls('shots')).toBe(2);
  });

  it('a later loud shot refreshes the caution (its call delivered: 120 s again)', () => {
    const { far, em, run } = shots();
    em.noise(P, 28);
    run(CALL + RADIO.staggerMax + 0.5);
    run(60);
    const before = left(em, far);
    expect(before).toBeLessThan(SHOTS.cautious - 60 + 0.1);
    expect(far.caution).toBe(1);
    em.noise(P, 28);
    run(CALL + RADIO.staggerMax + 0.5);
    expect(left(em, far)).toBeGreaterThan(before + 50);
    expect(em.sectionCounts.shotsCalls).toBe(2);
  });

  it('cut: the caller taken during the call, nobody is cautious and no pair goes', () => {
    const { ear, mate, far, em, run, down } = shots();
    em.noise(P, 28);
    run(1);
    down(ear);
    run(CALL + RADIO.staggerMax + 1);
    for (const g of [mate, far]) {
      expect(left(em, g)).toBe(0);
      expect(g.caution).toBe(0);
      expect(g.pairSearch).not.toHaveBeenCalled();
    }
    expect(em.sectionCounts.shotsCalls).toBe(0);
  });

  it('suppressed shots never call (an ordinary noise, A41)', () => {
    const { ear, far, em, run, calls } = shots();
    ear.pos.set(0, 0, 5);
    em.hear(P, 28 * 0.35);
    em.hear(P, 28 * 0.35);
    run(CALL + RADIO.staggerMax + 1);
    expect(calls('shots')).toBe(0);
    expect(far.caution).toBe(0);
    expect(em.sectionCounts.shotsCalls).toBe(0);
  });

  it('nobody calm in reach (one sent to combat by it, one already fighting, a dog): no call', () => {
    const close = guard(4, 0, 0);
    const fighter = guard(0, 15, 1, { alerted: true, level: 'alert' });
    const dog = guard(-15, 0, 2, { dog: {}, def: { melee: {}, kind: 'dog', scale: 1 } });
    const far = guard(60, 60, 3);
    const { em, run, calls } = manager([close, fighter, dog, far]);
    em.noise(P, 28);
    expect(close.hearGunfire).toHaveBeenCalled();
    expect(calls('shots')).toBe(0);
    run(CALL + RADIO.staggerMax + 1);
    expect(left(em, far)).toBe(0);
  });

  it('the nearest calm hearer is the caller', () => {
    const a = guard(0, 22, 0);
    const b = guard(0, -12, 1);
    const { em, calls } = manager([a, b]);
    em.noise(P, 28);
    expect(calls('shots')).toBe(1);
    expect(em.radioLeft(E(b))).toBeGreaterThan(0);
    expect(em.radioLeft(E(a))).toBe(0);
  });
});

describe('the per-section tallies (section rating)', () => {
  it('bodies found, missed checks, shots calls, radio alarms; read-only; reset at section load (clear)', () => {
    const { a, c, em, priv, run, down } = squad();
    down(c, false);
    em.radioCheckNow();
    run(CALL + RADIO.staggerMax + 0.5);
    const body = { enemyId: c.id, guardKey: c.key, guard: c, lethal: true, found: false, present: true, pos: c.pos.clone(), age: 0, dispose: vi.fn() } as unknown as Body;
    em.bodies.push(body);
    priv.bodyFound(E(a), body);
    em.noise(new Vector3(0, 0, 20), 28);
    run(CALL + RADIO.staggerMax + 0.5);
    priv.radioAlarm(a.num);
    const k = em.sectionCounts;
    expect([k.bodiesFound, k.missedChecks, k.shotsCalls, k.radioAlarms]).toEqual([1, 1, 1, 1]);
    // a second radio alarm while it is raised adds nothing
    priv.radioAlarm(a.num);
    expect(em.sectionCounts.radioAlarms).toBe(1);
    em.clear();
    const z = em.sectionCounts;
    expect([z.bodiesFound, z.missedChecks, z.shotsCalls, z.radioAlarms]).toEqual([0, 0, 0, 0]);
  });
});
