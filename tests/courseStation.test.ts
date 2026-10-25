/**
 * (J14 R1) The station retry runtime of the re-planned Marlow Yard: the live station (advanced by each done flag), a
 * station retry (seen / caught / timer) that resets only that station and puts both players on its marks, the downed bay
 * restart (out / down) as a full reset, route-runs' hooks (`restarts`, `lastRetry`, `retryOff`) on host and client
 * through the wire, `?course=station:<n>`, the room map and the built yard left as it was.
 */
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { validateCourse, type BayDef, type CourseDef, type CourseKnownIds, type CourseLayout } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import type { StationDef } from '../src/game/course/stationDef';
import { CourseMode, courseStationParam, inTickZone, retryHook, retryLine, stationSlots } from '../src/game/modes/courseMode';
import { REPLAN_TICKS, type StationHooks, type StationTick } from '../src/game/course/replan/ticks';
import { RESTART_DELAY } from '../src/config/course';
import { parseMessage } from '../src/net/protocol';
import { resumeMap, roomMap } from '../src/net/session';
import type { GameState } from '../src/game/gameState';
import type { SecurityConsole } from '../src/game/course/securityRoom';
import { LightRegistry } from '../src/world/lights';

const DT = 0.1;

function station(n: number, o: Partial<StationDef> = {}): StationDef {
  return {
    n,
    id: `s${n}`,
    lesson: 'boost',
    marks: [
      { x: 10 * n, z: 5, y: 0, yaw: 0 },
      { x: 10 * n + 1, z: 5, y: 0, yaw: Math.PI },
    ],
    retry: 'station',
    guards: [`gd${n}`],
    gates: [`g-s${n}`],
    doneFlag: `s${n}-done`,
    ...o,
  };
}

/** One bay (start -> end) of two stations, each with its own guard and pickup gate. */
function def(o: Partial<BayDef> = {}, stations: StationDef[] | null = [station(1), station(2)]): CourseDef {
  return {
    id: 'unit',
    airlocks: [],
    externalFlags: ['s1-done', 's2-done', 's8-done', 's9-done'],
    bays: [
      {
        id: 'B1',
        entry: 'start',
        exit: 'end',
        squad: ['gd1', 'gd2'],
        gates: [
          { kind: 'pickup', id: 'g-s1', switchId: 'sw1', flag: 'key1', perPlayer: false },
          { kind: 'pickup', id: 'g-s2', switchId: 'sw2', flag: 'key2', perPlayer: false },
        ],
        radio: [
          { at: 'retry:s2', text: 'Seen at two. Back to the crates.' },
          { at: 'retry:s2:timer', text: 'Out of time at two. Back to the crates.' },
        ],
        drills: [{ id: 'dr-crouch', verb: 'crouch', who: 'both', text: 'Crouch.', marker: { x: 0, y: 0, z: 0 } }],
        elements: [],
        ...(stations ? { stations } : {}),
        ...o,
      },
    ],
  };
}

const KNOWN: CourseKnownIds = { doors: [], switches: ['sw1', 'sw2'], holds: [], anchors: [], groups: [] };

interface FakeEnemy {
  slot: string;
  id: string;
  /** The guard key (`Enemy.key`: a woken copy keeps it). */
  key: number;
  ko: boolean;
  alive: boolean;
  alerted: boolean;
  passive: boolean;
  setPatrol(): void;
}

let guardSeq = 0;
function fakeGuard(slot: string, o: Partial<FakeEnemy> = {}): FakeEnemy {
  guardSeq++;
  return { slot, id: `e${guardSeq}`, key: guardSeq, ko: false, alive: true, alerted: false, passive: false, setPatrol: () => undefined, ...o };
}

interface FakeDoor {
  anchor: { id: number; locked: boolean; hinge: { y: number } };
  target: 0 | 1;
  cracked: boolean;
  index: number;
  cx: number;
  cz: number;
}

/** Rig options: course doors (by course id), security consoles and course devices. */
interface RigOpts {
  doors?: string[];
  consoles?: SecurityConsole[];
  devices?: CourseLayout['devices'];
}

/** A CourseMode on a stub GameState: enough for its fixed step, squad, restart and respawn paths (no Babylon scene). */
function rig(d: CourseDef, o: RigOpts = {}) {
  const enemies: FakeEnemy[] = [];
  const despawned: FakeEnemy[] = [];
  const respawns: { x: number; y: number; z: number }[] = [];
  const said: string[] = [];
  const doorList: FakeDoor[] = (o.doors ?? []).map((_id, i) => ({ anchor: { id: 100 + i, locked: false, hinge: { y: 0 } }, target: 0, cracked: false, index: i, cx: 0, cz: 0 }));
  const lay: CourseLayout = {
    def: d,
    doors: Object.fromEntries((o.doors ?? []).map((id, i) => [id, 100 + i])),
    devices: o.devices ?? {},
    squads: { gd1: { kind: 'grunt', x: 1, z: 1, yaw: 0 }, gd2: { kind: 'grunt', x: 2, z: 2, yaw: 0 } },
    ...(o.consoles ? { consoles: o.consoles } : {}),
  };
  let spawning = '';
  const bodies: { carried: boolean; enemyId: string }[] = [];
  /** What the guards' memory was told: console toggles, and how often a retry cleared the calls and positions. */
  const consoleCalls: [string, boolean][] = [];
  const cleared = { radio: 0, board: 0, alarm: 0, intruders: 0 };
  const em = {
    stealth: true,
    enemies,
    bodies,
    lkpValid: false,
    sightT: 99,
    radioNet: { clear: () => cleared.radio++ },
    board: { clear: () => cleared.board++ },
    intruders: { clear: () => cleared.intruders++ },
    resetAlarm: () => cleared.alarm++,
    consoleState: (id: string, _x: number, _y: number, _z: number, on: boolean) => consoleCalls.push([id, on]),
    get anyAlerted() {
      return enemies.some((e) => e.alive && e.alerted);
    },
    spawn: () => {
      const e = fakeGuard(spawning);
      enemies.push(e);
      return e;
    },
    despawn: (e: FakeEnemy) => {
      despawned.push(e);
      const k = enemies.indexOf(e);
      if (k >= 0) enemies.splice(k, 1);
    },
    resetMemory: () => (enemies.length = 0),
    placeSlot: () => undefined,
  };
  const doors = {
    list: doorList,
    setLocked: (dr: FakeDoor, on: boolean) => (dr.anchor.locked = on),
    setOpen: (dr: FakeDoor, open: boolean) => (dr.target = open ? 1 : 0),
    open: (dr: FakeDoor) => {
      dr.target = 1;
      return true;
    },
    crack: (dr: FakeDoor, on: boolean) => {
      const was = dr.cracked;
      dr.cracked = on;
      return was !== on;
    },
  };
  const player = { position: new Vector3(0, 0, 0), alive: true, cam: { yaw: 0 } };
  const remote = { id: 'peer-2', feet: new Vector3(1, 0, 0), target: { alive: true } };
  const g = {
    player,
    remotePlayers: () => [remote],
    style: { detections: 0 },
    enemyMgr: em,
    takedown: { active: false, reset: () => undefined },
    net: null,
    grenades: { clear: () => undefined },
    gadgets: { clearWorld: () => undefined },
    checkpointReset: () => undefined,
    security: null,
    scheduleRespawn: (at: Vector3) => respawns.push({ x: at.x, y: at.y, z: at.z }),
    world: {
      doors,
      level: { lights: { lights: [], version: 0 } },
      layout: { course: lay, playerSpawns: [{ pos: new Vector3(-5, 0, 0), yaw: 0 }, { pos: new Vector3(-4, 0, 0), yaw: 0 }] },
    },
    traversal: { attachCtl: { disabled: new Set<number>() } },
    hud: { banner: () => undefined, barks: { say: (_who: string, line: string) => said.push(line) } },
    app: { toasts: { show: () => undefined } },
  } as unknown as GameState;
  const mode = new CourseMode(g);
  mode.layout = lay;
  mode.state = new CourseState(d);
  // `start` maps the course doors to the world's (not run here)
  const doorOf = (mode as unknown as { doorOf: Map<string, FakeDoor> }).doorOf;
  (o.doors ?? []).forEach((id, i) => doorOf.set(id, doorList[i]!));
  // the squad as the bay starts (the first step acts on `bayStarted`); each fake guard knows its slot
  const m = mode as unknown as { spawnSlot(id: string): unknown };
  const spawnSlot = m.spawnSlot.bind(mode);
  m.spawnSlot = (id: string) => {
    spawning = id;
    return spawnSlot(id);
  };
  const step = (n = 1): void => {
    for (let i = 0; i < n; i++) mode.fixedUpdate(DT);
  };
  step();
  const guard = (slot: string): FakeEnemy => enemies.find((e) => e.slot === slot)!;
  return { mode, st: mode.state, enemies, despawned, respawns, player, remote, guard, step, said, bodies, em, doors: doorList, consoleCalls, cleared };
}

/** The host's `course` message through the wire to a client mirror: what route-runs read on the client. */
function clientView(st: CourseState) {
  const m = parseMessage({ t: 'course', s: st.pack(), lights: { groups: [], dead: [] }, locks: [], anchors: [] });
  if (m?.t !== 'course') throw new Error('not course');
  return { hook: retryHook(m.s), s: m.s };
}

describe('the live station', () => {
  it('starts at the bay\'s first station and moves on with each done flag (per player too)', () => {
    const st = new CourseState(def());
    expect(st.hasStations).toBe(true);
    expect(st.station()).toBe(1);
    st.setFlag('s1-done');
    expect(st.station()).toBe(2);
    st.setFlag('s2-done@2');
    expect(st.station()).toBe(0);
    expect(st.liveStation()).toBeNull();
  });
  it('follows the bay\'s play order, not the badge order (A4 is 9, 8, 10)', () => {
    const st = new CourseState(def({}, [station(9), station(8)]));
    expect(st.station()).toBe(9);
    st.setFlag('s9-done');
    expect(st.station()).toBe(8);
  });
  it('?course=station:<n> starts at that station with the bay\'s earlier stations done', () => {
    expect(courseStationParam('?autostart=ctcourseReplan&course=station:13')).toBe(13);
    expect(courseStationParam('?course=all')).toBe(0);
    expect(courseStationParam('?course=station:x')).toBe(0);
    const st = new CourseState(def({}, [station(9), station(8)]));
    expect(st.startStation(8)).toBe(true);
    expect(st.station()).toBe(8);
    expect(st.hasFlag('s9-done')).toBe(true);
    expect(st.startStation(5)).toBe(false);
  });
});

describe('a station retry (seen)', () => {
  it('a guard alert in station 2: both players on station 2\'s marks, station 1 still done, its downed guard still down', () => {
    const r = rig(def());
    const { st, mode } = r;
    const gd1 = r.guard('gd1');
    gd1.alive = false; // dealt with at station 1
    st.setFlag('s1-done');
    expect(st.press('sw2', 0)).toBeNull();
    expect(st.hasShared('key2')).toBe(true);
    const gd2 = r.guard('gd2');
    gd2.alerted = true;
    r.step();
    expect(mode.restarts).toBe(1);
    expect(mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    // only station 2 reset: its gate's flag gone, station 1 done, station 2 live again
    expect(st.hasShared('key2')).toBe(false);
    expect(st.isGateOpen('g-s2')).toBe(false);
    expect(st.hasFlag('s1-done')).toBe(true);
    expect(st.station()).toBe(2);
    // the downed station 1 guard stays as left; station 2's guard is back fresh on his slot
    expect(r.enemies).toContain(gd1);
    expect(gd1.alive).toBe(false);
    expect(r.despawned).toEqual([gd2]);
    expect(r.guard('gd2')).not.toBe(gd2);
    expect(r.guard('gd2').alerted).toBe(false);
    // P1 has role A in the bay (no claim, the swap rule): the host respawns on A's mark, the partner on B's
    expect(r.respawns.at(-1)).toEqual({ x: 20, y: 0, z: 5 });
    expect(mode.checkpointSpawns()).toEqual([
      { x: 20, y: 0, z: 5, yaw: 0 },
      { x: 21, y: 0, z: 5, yaw: Math.PI },
    ]);
    expect(r.said.at(-1)).toBe('LANTERN: Seen at two. Back to the crates.');
  });
  it('a retry also resets an unlisted guard in combat (else the retries chain)', () => {
    const r = rig(def({}, [station(1, { guards: [] }), station(2, { guards: ['gd2'] })]));
    const gd1 = r.guard('gd1');
    gd1.alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 1, cause: 'seen' });
    expect(r.despawned).toContain(gd1);
    expect(r.guard('gd1').alerted).toBe(false);
    // the spotted hold, then nothing more fires
    r.step(30);
    expect(r.mode.restarts).toBe(1);
  });
  it('a camera\'s full detection is a seen retry (A22); a station with retry none never retries', () => {
    const r = rig(def());
    r.st.setFlag('s1-done');
    r.mode.cameraFull();
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    const n = rig(def({}, [station(1, { retry: 'none' })]));
    n.guard('gd1').alerted = true;
    n.mode.cameraFull();
    n.step(5);
    expect(n.mode.restarts).toBe(0);
    expect(n.respawns).toHaveLength(0);
  });
  it('the marks are the respawn points only while the retry places the players; then the start slots again', () => {
    const r = rig(def());
    r.st.setFlag('s1-done');
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.checkpointSpawns()[0]).toMatchObject({ x: 20, z: 5 });
    r.step(25);
    expect(r.mode.checkpointSpawns()[0]).toMatchObject({ x: -5, z: 0 });
    expect(r.mode.checkpointPos().x).toBe(-5);
  });
  it('the marks follow the roles: role A (P2 by a claim) takes marks[0]', () => {
    const s = station(2);
    expect(stationSlots(s, 0).map((p) => p.x)).toEqual([20, 21]);
    expect(stationSlots(s, 1).map((p) => p.x)).toEqual([21, 20]);
  });
});

describe('SA1: a guard on several stations\' lists (fix 1)', () => {
  /** gd1 on both stations' lists (A4's officer on 9 and 8), gd2 on station 2's. */
  const both = (): CourseDef => def({}, [station(1, { guards: ['gd1'] }), station(2, { guards: ['gd1', 'gd2'] })]);
  it('knocked out at station 1, station 2 retried: the same guard, still down, not despawned', () => {
    const r = rig(both());
    const gd1 = r.guard('gd1');
    gd1.alive = false;
    gd1.ko = true;
    r.step();
    r.st.setFlag('s1-done');
    r.step();
    const gd2 = r.guard('gd2');
    gd2.alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    expect(r.despawned).toEqual([gd2]);
    expect(r.guard('gd1')).toBe(gd1);
    expect(gd1.alive).toBe(false);
  });
  it('knocked out during station 2: back fresh on his slot', () => {
    const r = rig(both());
    r.st.setFlag('s1-done');
    r.step();
    const gd1 = r.guard('gd1');
    gd1.alive = false;
    gd1.ko = true;
    r.step();
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.despawned).toContain(gd1);
    expect(r.guard('gd1')).not.toBe(gd1);
    expect(r.guard('gd1').alive).toBe(true);
  });
  it('knocked out at station 1 but carried during station 2: back fresh (moved since 2 went live)', () => {
    const r = rig(both());
    const gd1 = r.guard('gd1');
    gd1.alive = false;
    gd1.ko = true;
    r.step();
    r.st.setFlag('s1-done');
    r.step();
    r.bodies.push({ carried: true, enemyId: gd1.id });
    r.step();
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.despawned).toContain(gd1);
    expect(r.guard('gd1')).not.toBe(gd1);
  });
  it('a woken copy of a slot that respawns goes too: one gd1, not two', () => {
    const r = rig(both());
    r.st.setFlag('s1-done');
    r.step();
    const gd1 = r.guard('gd1');
    gd1.alive = false;
    gd1.ko = true;
    r.enemies.splice(r.enemies.indexOf(gd1), 1);
    r.step();
    // a squadmate wakes him: a new Enemy with his key (EnemyManager.revive), searching, not in combat
    const copy = fakeGuard('gd1', { key: gd1.key });
    r.enemies.push(copy);
    r.mode.onEnemyJoined(copy as never);
    r.step();
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.despawned).toContain(copy);
    expect(r.enemies.filter((e) => e.slot === 'gd1')).toHaveLength(1);
    expect(r.guard('gd1')).not.toBe(copy);
  });
});

describe('the cause of a retry never repeats it (fix 4)', () => {
  it('an unlisted guard told of the sighting goes into combat 0.5 s after the retry: back calm on his slot, one retry', () => {
    const r = rig(def({}, [station(1, { guards: [] }), station(2, { guards: ['gd2'] })]));
    r.st.setFlag('s1-done');
    r.step();
    const gd1 = r.guard('gd1');
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(1);
    // the sighting is out of the guards' memory: calls, incidents, the command call, the last known positions
    expect(r.cleared).toEqual({ radio: 1, board: 1, alarm: 1, intruders: 1 });
    expect(r.guard('gd1')).toBe(gd1);
    r.step(5);
    gd1.alerted = true;
    r.step(30);
    expect(r.mode.restarts).toBe(1);
    expect(r.despawned).toContain(gd1);
    expect(r.guard('gd1')).not.toBe(gd1);
    expect(r.guard('gd1').alerted).toBe(false);
    // after the hold the rule is live again: a real sighting retries
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(2);
  });
});

describe('flags a retry drops (fix 5)', () => {
  it('a console gate\'s flag set in station 2: the retry clears it with flagCleared and the guards hear the console is on', () => {
    const st = new CourseState(def());
    st.setFlag('s1-done');
    expect(st.press('sw2', 0)).toBeNull();
    st.clearEvents();
    expect(st.retryStation('seen')).toBe(true);
    expect(st.events).toContainEqual({ t: 'flagCleared', flag: 'key2' });
    const r = rig(def(), { consoles: [{ id: 'sw2', guard: 'gd2', flag: 'key2' }], devices: { sw2: { x: 1, y: 0, z: 2, yaw: 0 } } });
    r.st.setFlag('s1-done');
    expect(r.st.press('sw2', 0)).toBeNull();
    r.step();
    expect(r.consoleCalls).toEqual([['sw2', false]]);
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    expect(r.consoleCalls.at(-1)).toEqual(['sw2', true]);
  });
});

describe('the sets\' station ticks (fix 6, lead decision a)', () => {
  const ticks = REPLAN_TICKS as Record<string, StationTick>;
  it('every re-plan bay A1-A8 has a registered tick (the set slices fill their own stubs)', () => {
    expect(Object.keys(REPLAN_TICKS).sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']);
    for (const k of Object.keys(REPLAN_TICKS)) expect(typeof REPLAN_TICKS[k]).toBe('function');
  });
  it('the re-plan calls the live bay\'s tick each fixed step; its retry goes through stationRetry', () => {
    const was = ticks.A2!;
    const seen: number[] = [];
    let hooks: StationHooks | null = null;
    ticks.A2 = (h, dt) => {
      hooks = h;
      seen.push(dt);
      // a drill window ends with both players in the zone: the timer retry
      if (h.live() === 2 && h.flag('s1-done') && h.playersIn([-1, -1, 2, 2]) === 2) h.retry(2, 'timer');
    };
    try {
      const d = { ...def({ id: 'A2' }), id: 'ctcourseReplan' };
      const r = rig(d);
      expect(seen.length).toBe(1);
      r.st.setFlag('s1-done');
      r.step();
      expect(r.mode.restarts).toBe(1);
      expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'timer' });
      r.step(3);
      expect(seen.length).toBe(5);
      // the same hooks object every step (made once)
      expect(hooks!.now()).toBeCloseTo(r.st.clock, 6);
      expect(hooks!.playersIn([-1, -1, 2, 2, 5, 6])).toBe(0);
      // a course that is not the re-plan never runs a set tick
      seen.length = 0;
      rig(def({ id: 'A2' })).step(3);
      expect(seen.length).toBe(0);
    } finally {
      ticks.A2 = was;
    }
  });
  it('a tick zone is a plan box with an optional height band', () => {
    expect(inTickZone([0, 0, 2, 2], { x: 1, y: 9, z: 1 })).toBe(true);
    expect(inTickZone([0, 0, 2, 2, 0, 1], { x: 1, y: 9, z: 1 })).toBe(false);
    expect(inTickZone([0, 0, 2, 2], { x: 3, y: 0, z: 1 })).toBe(false);
  });
});

describe('the station hooks\' window sources (fix round 2)', () => {
  const ticks = REPLAN_TICKS as Record<string, StationTick>;
  /** A fake host `CtDevices`: the jam list and two lasers (what the hooks read), the rest no-ops. */
  const fakeCt = () => ({
    jamId: ['', ''] as [string, string],
    lasers: [{ def: { id: 'las-a' } }, { def: { id: 'las-b' } }],
    fixedUpdate: () => undefined,
    takeChanged: () => false,
    repair: () => undefined,
    holdZones: () => undefined,
    wire: () => ({}),
    dispose: () => undefined,
  });
  /** The re-plan (bay A2) with an isolator `g-iso` (switch `sw3`, 2 s dark), the hooks its tick is handed, a fake ct. */
  function replanRig(tick?: StationTick) {
    const was = ticks.A2!;
    let hooks: StationHooks | null = null;
    ticks.A2 = (h, dt) => {
      hooks = h;
      tick?.(h, dt);
    };
    const base = def({ id: 'A2' });
    const bay = base.bays[0]!;
    const d: CourseDef = { ...base, id: 'ctcourseReplan', bays: [{ ...bay, gates: [...bay.gates, { kind: 'isolator', id: 'g-iso', switchIds: ['sw3'], group: 'grp', seconds: 2 }] }] };
    try {
      const r = rig(d);
      const ct = fakeCt();
      (r.mode as unknown as { ct: unknown }).ct = ct;
      return { ...r, ct, h: () => hooks!, restore: () => (ticks.A2 = was) };
    } catch (e) {
      ticks.A2 = was;
      throw e;
    }
  }

  it('gate: a pickup gate\'s open state and an isolator\'s dark', () => {
    const r = replanRig();
    try {
      const h = r.h();
      expect(h.gate('g-s1')).toBe(false);
      expect(r.st.press('sw1', 0)).toBeNull();
      expect(h.gate('g-s1')).toBe(true);
      expect(h.gate('g-iso')).toBe(false);
      r.st.press('sw3', 0);
      r.step();
      expect(h.gate('g-iso')).toBe(true);
      r.step(25);
      expect(h.gate('g-iso')).toBe(false);
      expect(h.gate('no-such-gate')).toBe(false);
    } finally {
      r.restore();
    }
  });

  it('down: a squad slot\'s guard knocked out or dead; up again once woken; an unknown slot is not down', () => {
    const r = replanRig();
    try {
      const h = r.h();
      expect(h.down('gd1')).toBe(false);
      expect(h.down('gd2')).toBe(false);
      const gd1 = r.guard('gd1');
      gd1.ko = true;
      gd1.alive = false;
      expect(h.down('gd1')).toBe(true);
      expect(h.down('gd2')).toBe(false);
      gd1.ko = false;
      gd1.alive = true;
      expect(h.down('gd1')).toBe(false);
      // gone from the guard manager (a removed body) counts as down
      r.enemies.splice(r.enemies.indexOf(r.guard('gd2')), 1);
      expect(h.down('gd2')).toBe(true);
      expect(h.down('gd9')).toBe(false);
    } finally {
      r.restore();
    }
  });

  it('jammed: a jammer held on the target by either player', () => {
    const r = replanRig();
    try {
      const h = r.h();
      expect(h.jammed('cam-a3-hall')).toBe(false);
      r.ct.jamId[1] = 'cam-a3-hall';
      expect(h.jammed('cam-a3-hall')).toBe(true);
      expect(h.jammed('lt-7')).toBe(false);
      r.ct.jamId[0] = 'lt-7';
      expect(h.jammed('lt-7')).toBe(true);
      r.ct.jamId[1] = '';
      expect(h.jammed('cam-a3-hall')).toBe(false);
      // no CtDevices (a map without devices): never jammed
      (r.mode as unknown as { ct: unknown }).ct = null;
      expect(h.jammed('lt-7')).toBe(false);
    } finally {
      r.restore();
    }
  });

  it('lit: a light group lit, dark from a jam\'s off time or a shot-out lamp, and an unknown group (check B3)', () => {
    const r = replanRig();
    try {
      const h = r.h();
      // the course's light registry: group 52 has two lamps, group 3 one
      const reg = new LightRegistry();
      const a = reg.add({ x: 0, y: 3, z: 0, group: 52 });
      const b = reg.add({ x: 2, y: 3, z: 0, group: 52 });
      reg.add({ x: 4, y: 3, z: 0, group: 3 });
      (r.mode as unknown as { g: { world: { level: { lights: LightRegistry } } } }).g.world.level.lights = reg;
      r.step();
      expect(h.lit(52)).toBe(true);
      expect(h.lit(3)).toBe(true);
      // a jam's off time darkens one lamp: the other keeps the group lit
      reg.jamStart(a.id);
      reg.jamLit(a.id, false);
      expect(h.lit(52)).toBe(true);
      reg.jamStart(b.id);
      reg.jamLit(b.id, false);
      expect(h.lit(52)).toBe(false);
      expect(h.lit(3)).toBe(true);
      // the jam over: lit again
      reg.jamEnd(a.id);
      expect(h.lit(52)).toBe(true);
      // shot out: dark for good, even when the jam ends
      expect(reg.destroy(a.id)).toBe(true);
      reg.jamEnd(b.id);
      expect(h.lit(52)).toBe(true);
      expect(reg.destroy(b.id)).toBe(true);
      expect(h.lit(52)).toBe(false);
      // a group with no lamps
      expect(h.lit(99)).toBe(false);
      expect(h.lit(-1)).toBe(false);
    } finally {
      r.restore();
    }
  });

  it('tripped: a beam broken in the live station and this epoch; the tick\'s seen retry clears it; no automatic retry', () => {
    // the set code: a broken beam on station 2 retries it as seen
    const r = replanRig((h) => {
      if (h.live() === 2 && h.tripped('las-b')) h.retry(2, 'seen');
    });
    try {
      const h = r.h();
      // a break at station 1 is not station 2's
      r.mode.laserTripped(1);
      expect(h.tripped('las-b')).toBe(true);
      r.st.setFlag('s1-done');
      expect(h.tripped('las-b')).toBe(false);
      expect(r.mode.restarts).toBe(0);
      // a break at station 2: the tick retries next step (not CourseMode by itself: no tick, no retry)
      r.mode.laserTripped(1);
      expect(h.tripped('las-b')).toBe(true);
      expect(h.tripped('las-a')).toBe(false);
      expect(h.tripped('no-such-laser')).toBe(false);
      const ep = h.epoch();
      r.step();
      expect(r.mode.restarts).toBe(1);
      expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
      expect(h.epoch()).toBeGreaterThan(ep);
      expect(h.tripped('las-b')).toBe(false);
      // a break inside the post-retry hold (the players still where they stood) is not kept
      r.mode.laserTripped(1);
      expect(h.tripped('las-b')).toBe(false);
      r.step(20);
      expect(r.mode.restarts).toBe(1);
      // after the hold a new break counts again
      r.mode.laserTripped(0);
      expect(h.tripped('las-a')).toBe(true);
      // no live station: nothing is tripped
      r.st.setFlag('s2-done');
      expect(h.tripped('las-a')).toBe(false);
    } finally {
      r.restore();
    }
  });

  it('tripped without a tick that acts on it: the mode never retries by itself', () => {
    const r = replanRig();
    try {
      r.st.setFlag('s1-done');
      r.mode.laserTripped(0);
      r.step(5);
      expect(r.mode.restarts).toBe(0);
      expect(r.h().tripped('las-a')).toBe(true);
    } finally {
      r.restore();
    }
  });

  it('epoch: rises on a station retry and on a bay restart, and a new course never repeats an earlier one', () => {
    const r = replanRig();
    try {
      const h = r.h();
      const e0 = h.epoch();
      expect(e0).toBeGreaterThan(0);
      r.step(3);
      expect(h.epoch()).toBe(e0);
      // a station retry (the set code's timer call)
      r.st.setFlag('s1-done');
      expect(r.mode.stationRetry(2, 'timer')).toBe(true);
      r.step();
      const e1 = h.epoch();
      expect(e1).toBeGreaterThan(e0);
      // a guard's seen retry after the hold
      r.step(20);
      r.guard('gd2').alerted = true;
      r.step();
      expect(r.mode.restarts).toBe(2);
      const e2 = h.epoch();
      expect(e2).toBeGreaterThan(e1);
      // the pause menu's bay restart (and a downed one: the same bayRestart event)
      expect(r.mode.restartCheckpoint()).toBe(true);
      r.step();
      const e3 = h.epoch();
      expect(e3).toBeGreaterThan(e2);
      r.step(20);
      r.player.alive = false;
      r.remote.target.alive = false;
      r.step(Math.ceil((RESTART_DELAY + 0.2) / DT));
      expect(h.epoch()).toBeGreaterThan(e3);
      // a new course (the next match: a new mode): above every epoch of the last one
      const last = h.epoch();
      const r2 = replanRig();
      try {
        expect(r2.h().epoch()).toBeGreaterThan(last);
        expect(r2.h()).not.toBe(h);
      } finally {
        r2.restore();
      }
    } finally {
      r.restore();
    }
  });
});

describe('stand-in gates (fix 7, lead decision b)', () => {
  const gates: BayDef['gates'] = [
    { kind: 'pickup', id: 'g-s1', switchId: 'sw1', flag: 'key1', perPlayer: false },
    { kind: 'pickup', id: 'g-s2', switchId: 'sw2', flag: 'key2', perPlayer: false },
    { kind: 'lever', id: 'g-walk', switchId: 'sw5', doorId: 'D5' },
  ];
  const plank = (): CourseDef => def({ gates }, [station(1), station(2, { kit: 'plankBridge', standIn: 'g-walk', gates: ['g-s2', 'g-walk'] })]);
  it('the stand-in opens as its station goes live (no kit move is playable yet) and stays open through its retry', () => {
    const r = rig(plank(), { doors: ['D5'] });
    const d5 = r.doors[0]!;
    expect(r.st.isGateOpen('g-walk')).toBe(false);
    expect(d5.anchor.locked).toBe(true);
    r.st.setFlag('s1-done');
    expect(r.st.isGateOpen('g-walk')).toBe(true);
    r.step();
    expect(d5.anchor.locked).toBe(false);
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    expect(r.st.isGateOpen('g-walk')).toBe(true);
    expect(d5.anchor.locked).toBe(false);
    // a bay restart: station 1 live again, the stand-in shut until station 2 goes live
    r.step(20);
    r.mode.restartCheckpoint();
    r.step();
    expect(r.st.station()).toBe(1);
    expect(r.st.isGateOpen('g-walk')).toBe(false);
  });
  it('a first station with a stand-in opens it at the bay start; a station without one opens nothing', () => {
    const st = new CourseState(def({ gates }, [station(1, { kit: 'deadweight', standIn: 'g-walk' }), station(2)]));
    expect(st.isGateOpen('g-walk')).toBe(true);
    expect(new CourseState(def({ gates })).isGateOpen('g-walk')).toBe(false);
  });
});

describe('a retry\'s gate doors (fix 3)', () => {
  it('the retried station\'s gate door is shut and locked again; an earlier station\'s door stays open', () => {
    const gates: BayDef['gates'] = [
      { kind: 'pickup', id: 'g-s1', switchId: 'sw1', flag: 'key1', perPlayer: false },
      { kind: 'pickup', id: 'g-s2', switchId: 'sw2', flag: 'key2', perPlayer: false },
      { kind: 'lever', id: 'g-d1', switchId: 'sw3', doorId: 'D1' },
      { kind: 'lever', id: 'g-d2', switchId: 'sw4', doorId: 'D2' },
    ];
    const r = rig(def({ gates }, [station(1, { gates: ['g-s1', 'g-d1'] }), station(2, { gates: ['g-s2', 'g-d2'] })]), { doors: ['D1', 'D2'] });
    const [d1, d2] = r.doors;
    expect(d1!.anchor.locked).toBe(true);
    expect(r.st.press('sw3', 0)).toBeNull();
    r.step();
    expect(d1!.anchor.locked).toBe(false);
    d1!.target = 1; // the players open it
    r.st.setFlag('s1-done');
    expect(r.st.press('sw4', 0)).toBeNull();
    r.step();
    d2!.target = 1;
    d2!.cracked = true;
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
    r.step(10);
    expect(d2!.target).toBe(0);
    expect(d2!.cracked).toBe(false);
    expect(d2!.anchor.locked).toBe(true);
    expect(d1!.target).toBe(1);
    expect(d1!.anchor.locked).toBe(false);
  });
});

describe('a caught station (A8) and a drill window', () => {
  it('ignores 1.5 s of combat and retries at 2 s (CAUGHT_HOLD)', () => {
    const r = rig(def({}, [station(1), station(2, { retry: 'caught' })]));
    r.st.setFlag('s1-done');
    r.guard('gd2').alerted = true;
    r.step(15);
    expect(r.mode.restarts).toBe(0);
    r.step(5);
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'caught' });
    expect(r.respawns.at(-1)).toEqual({ x: 20, y: 0, z: 5 });
  });
  it('a camera alone never retries a caught station', () => {
    const r = rig(def({}, [station(1, { retry: 'caught' })]));
    r.mode.cameraFull();
    r.step(30);
    expect(r.mode.restarts).toBe(0);
  });
  it('a drill window ending (the set code\'s timer call) retries in place, at the station\'s own marks', () => {
    const r = rig(def({}, [station(1), station(2, { drillS: 15 })]));
    r.st.setFlag('s1-done');
    expect(r.mode.stationRetry(1, 'timer')).toBe(false); // not the live station
    expect(r.mode.stationRetry(2, 'timer')).toBe(true);
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'timer' });
    expect(r.respawns.at(-1)).toEqual({ x: 20, y: 0, z: 5 });
    expect(r.said.at(-1)).toBe('LANTERN: Out of time at two. Back to the crates.');
    expect(r.st.checkpoint).toBe('start');
    expect(retryLine([], 's2', 'seen')).toBeNull();
    expect(retryLine([{ at: 'retry:s2', text: 'x' }], 's2', 'timer')).toBe('x');
  });
  it('one failure, one retry: a timer call plus a guard alert before its handle count once (fix 2)', () => {
    const r = rig(def({}, [station(1), station(2, { drillS: 15 })]));
    r.st.setFlag('s1-done');
    r.step();
    expect(r.mode.stationRetry(2, 'timer')).toBe(true);
    // a second call before the handle (a beam in the same step) is refused too
    expect(r.mode.stationRetry(2, 'seen')).toBe(false);
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'timer' });
    expect(r.respawns).toHaveLength(1);
    expect(r.despawned).toHaveLength(1);
  });
});

describe('route-runs hooks: restarts and lastRetry on host and client', () => {
  it('seen, caught and timer each raise restarts by one; the client reads the same through the wire', () => {
    const r = rig(def({}, [station(1), station(2, { retry: 'caught' })]));
    const { mode, st } = r;
    expect(mode.lastRetry).toBeNull();
    expect(clientView(st).hook).toEqual({ restarts: 0, lastRetry: null });
    st.setFlag('s1-done');
    // A station-kind retry first (station 2 as 'station'), then caught, then timer
    (st.liveStation() as { retry: string }).retry = 'station';
    r.guard('gd2').alerted = true;
    r.step();
    const causes: string[] = [mode.lastRetry!.cause];
    expect(mode.restarts).toBe(1);
    expect(clientView(st).hook).toEqual({ restarts: mode.restarts, lastRetry: mode.lastRetry });
    (st.liveStation() as { retry: string }).retry = 'caught';
    r.step(15);
    r.guard('gd2').alerted = true;
    r.step(25);
    causes.push(mode.lastRetry!.cause);
    expect(mode.restarts).toBe(2);
    expect(clientView(st).hook).toEqual({ restarts: mode.restarts, lastRetry: mode.lastRetry });
    r.step(20);
    expect(mode.stationRetry(2, 'timer')).toBe(true);
    r.step();
    causes.push(mode.lastRetry!.cause);
    expect(causes).toEqual(['seen', 'caught', 'timer']);
    const c = clientView(st);
    expect(c.hook).toEqual({ restarts: 3, lastRetry: { st: 2, cause: 'timer' } });
    // the client's state mirror carries the same live station, count and last retry
    const mirror = new CourseState(def({}, [station(1), station(2, { retry: 'caught' })]));
    mirror.apply(c.s);
    expect(mirror.station()).toBe(2);
    expect(mirror.restarts).toBe(3);
    expect(mirror.lastRetry).toEqual(mode.lastRetry);
  });
  it('parseCourse clamps the new fields; an older host sends none', () => {
    const m = parseMessage({ t: 'course', s: { st: 99, rs: -3, rt: 2.4, rc: 'bogus' }, lights: {} });
    if (m?.t !== 'course') throw new Error('not course');
    expect([m.s.st, m.s.rs, m.s.rt, m.s.rc]).toEqual([64, 0, 2, '']);
    const old = parseMessage({ t: 'course', s: {}, lights: {} });
    if (old?.t !== 'course') throw new Error('not course');
    expect(retryHook(old.s)).toEqual({ restarts: 0, lastRetry: null });
  });
});

describe('downed: the bay restarts from its holding room (level-design 9.4, G312)', () => {
  it('one player out in station 2 (partner up): a full reset, station 1 undone, cause out', () => {
    const r = rig(def());
    r.st.setFlag('s1-done');
    expect(r.st.station()).toBe(2);
    r.remote.target.alive = false;
    r.mode.onPlayerDeath();
    r.step(Math.ceil((RESTART_DELAY + 0.2) / DT));
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'out' });
    expect(r.st.station()).toBe(1);
    expect(r.st.hasFlag('s1-done')).toBe(false);
    // the restart lands at the checkpoint, never on a station mark
    expect(r.respawns.at(-1)).toEqual({ x: -5, y: 0, z: 0 });
    expect(r.mode.checkpointSpawns()[0]).toMatchObject({ x: -5 });
  });
  it('both down after station 2: the same, cause down', () => {
    const r = rig(def());
    r.st.setFlag('s1-done');
    r.st.setFlag('s2-done');
    r.player.alive = false;
    r.remote.target.alive = false;
    r.step(Math.ceil((RESTART_DELAY + 0.2) / DT));
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 0, cause: 'down' });
    expect(r.st.station()).toBe(1);
  });
});

describe('retryOff (J13 R4c)', () => {
  it('after retryOff(2) an alert in station 2 does not retry; any bay restart turns it back on', () => {
    const r = rig(def());
    r.st.setFlag('s1-done');
    expect(r.mode.retryOff(5)).toBe(false);
    expect(r.mode.retryOff(2)).toBe(true);
    r.guard('gd2').alerted = true;
    r.step(10);
    expect(r.mode.restarts).toBe(0);
    expect(r.respawns).toHaveLength(0);
    expect(r.mode.stationRetry(2, 'timer')).toBe(false);
    // the pause menu's restart: not counted (polish 3), but it turns station 2's retry back on
    expect(r.mode.restartCheckpoint()).toBe(true);
    r.step(20);
    expect(r.mode.restarts).toBe(0);
    expect(r.st.isRetryOff(2)).toBe(false);
    r.st.setFlag('s1-done');
    r.guard('gd2').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'seen' });
  });
});

describe('the drill pointer and the built yard', () => {
  it('a station retry leaves the drill pointer as built: ticked drills stay, the next drill unchanged', () => {
    const r = rig(def());
    r.st.tick(0, 'crouch');
    const before = [r.st.nextDrill(0), r.st.nextDrill(1)];
    expect(before[0]).toBeNull();
    expect(before[1]?.id).toBe('dr-crouch');
    r.guard('gd1').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(1);
    expect([r.st.nextDrill(0), r.st.nextDrill(1)]).toEqual(before);
    expect(r.st.drillTicks('dr-crouch', 0)).toBe(1);
  });
  it('the built yard (no stations): spotFail still restarts the set and every bay restart counts as before', () => {
    const r = rig(def({ spotFail: 'Spotted. Back to the start of the set.' }, null));
    expect(r.st.hasStations).toBe(false);
    expect(r.st.station()).toBe(0);
    r.guard('gd1').alerted = true;
    r.step();
    expect(r.mode.restarts).toBe(1);
    expect(r.st.restarts).toBe(0);
    expect(r.mode.lastRetry).toBeNull();
    expect(r.said.at(-1)).toBe('LANTERN: Spotted. Back to the start of the set.');
    r.step(20);
    r.mode.restartCheckpoint();
    r.step();
    expect(r.mode.restarts).toBe(2);
    expect(r.st.pack()).toMatchObject({ st: 0, rs: 0, rt: 0, rc: '' });
  });
  it('a bay with stations never runs spotFail (the station rule replaces it)', () => {
    const r = rig(def({ spotFail: 'Spotted. Back to the start of the set.' }));
    r.guard('gd1').alerted = true;
    r.step();
    expect(r.mode.lastRetry).toEqual({ st: 1, cause: 'seen' });
    expect(r.said).not.toContain('LANTERN: Spotted. Back to the start of the set.');
  });
});

describe('validateCourse: stations', () => {
  const bad = (s: Partial<StationDef>, msg: RegExp, o: Partial<BayDef> = {}): void => {
    expect(() => validateCourse(def(o, [station(1), station(2, s)]), KNOWN)).toThrow(msg);
  };
  it('a good course passes; stations may run out of n order and name devices in gates', () => {
    expect(() => validateCourse(def({}, [station(9, { guards: [], gates: [] }), station(8, { guards: ['gd2'], gates: ['g-s2', 'cam-x'] })]), KNOWN)).not.toThrow();
  });
  it('names the bad station', () => {
    bad({ n: 1 }, /duplicate station number/);
    bad({ n: 0 }, /not a whole number/);
    bad({ id: 's1' }, /duplicate station id/);
    bad({ retry: 'often' as StationDef['retry'] }, /station retry/);
    bad({ drillS: 0 }, /drillS/);
    bad({ guards: ['nobody'] }, /not in B1's squad/);
    bad({ standIn: 'g-none' }, /stand-in gate/);
    bad({ doneFlag: 'never' }, /done flag 'never' is never set/);
    bad({ marks: [{ x: Number.NaN, z: 0, y: 0, yaw: 0 }, { x: 0, z: 0, y: 0, yaw: 0 }] }, /finite/);
  });
});

describe('the room map', () => {
  it('the flag off leaves the room on ctcourse; on, Marlow Yard opens the re-planned yard; other maps as picked', () => {
    expect(roomMap('ctcourse', false)).toBe('ctcourse');
    expect(roomMap('ctcourse', true)).toBe('ctcourseReplan');
    expect(roomMap('warehouse', true)).toBe('warehouse');
    expect(roomMap('ctcourseReplan', false)).toBe('ctcourseReplan');
  });
  it('a Resume hosting record on the re-planned yard reopens on the built yard with the flag off (fix 8)', () => {
    expect(resumeMap('ctcourseReplan', false)).toBe('ctcourse');
    expect(resumeMap('ctcourseReplan', true)).toBe('ctcourseReplan');
    expect(resumeMap('ctcourse', true)).toBe('ctcourseReplan');
    expect(resumeMap('ctcourse', false)).toBe('ctcourse');
    expect(resumeMap('warehouseOps', false)).toBe('warehouseOps');
  });
});

describe('cause other: a set\'s way out of a soft-lock (J14 A26)', () => {
  it('retries a none station through stationRetry (seen does not), says its own line, both on its marks; the client reads it', () => {
    const radio = [
      { at: 'retry:s2', text: 'Seen at two. Back to the crates.' },
      { at: 'retry:s2:other', text: 'Stuck at two. Back to the crates.' },
    ];
    const r = rig(def({ radio }, [station(1), station(2, { retry: 'none' })]));
    r.st.setFlag('s1-done');
    r.step();
    expect(r.st.station()).toBe(2);
    expect(r.mode.stationRetry(2, 'seen')).toBe(false);
    expect(r.mode.stationRetry(2, 'timer')).toBe(false);
    expect(r.mode.stationRetry(1, 'other')).toBe(false);
    expect(r.mode.stationRetry(2, 'other')).toBe(true);
    // one at a time: the hold blocks a second before this one's handle
    expect(r.mode.stationRetry(2, 'other')).toBe(false);
    r.step();
    expect(r.mode.restarts).toBe(1);
    expect(r.mode.lastRetry).toEqual({ st: 2, cause: 'other' });
    expect(r.st.hasFlag('s1-done')).toBe(true);
    expect(r.st.station()).toBe(2);
    expect(r.said.at(-1)).toBe('LANTERN: Stuck at two. Back to the crates.');
    expect(r.respawns.at(-1)).toEqual({ x: 20, y: 0, z: 5 });
    expect(clientView(r.st).hook).toEqual({ restarts: 1, lastRetry: { st: 2, cause: 'other' } });
    // a station with no other line retries silently (never its seen line)
    expect(retryLine([{ at: 'retry:s2', text: 'Seen.' }], 's2', 'other')).toBeNull();
    // retryOff turns it off like any station retry
    r.step(30);
    expect(r.mode.retryOff(2)).toBe(true);
    expect(r.mode.stationRetry(2, 'other')).toBe(false);
  });
});
