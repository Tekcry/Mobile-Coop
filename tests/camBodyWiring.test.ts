import { describe, expect, it, vi } from 'vitest';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY } from '../src/ai/archetypes';
import { INCIDENT } from '../src/ai/incidents';
import { camBodyLine } from '../src/ai/barks';
import { Vector3, type Scene } from '../src/core/babylon';
import type { Body } from '../src/ai/body';
import type { Enemy } from '../src/ai/enemy';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { CameraDevice } from '../src/security/data';
import { SecuritySystem, type CameraBodyEvent } from '../src/security/securitySystem';

// (guard-ai S7, design 9, M6) Cameras see bodies, wired into EnemyManager on stand-in guards: a camera's first sight of
// a downed guard opens one `camBody` incident per body; the nearest 1 (knocked out) or 2 (dead) calm guards within
// `INCIDENT.callR` by path are sent (`Enemy.checkBody`); dogs and melee never; found / carried / hidden bodies are
// ignored; the desk's radio line goes out once per incident; the parked modes do nothing.

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
  def: { melee: object | null; kind: string; scale: number };
  pos: Vector3;
  yaw: number;
  radio: ReturnType<typeof vi.fn>;
  bark: ReturnType<typeof vi.fn>;
  checkBody: ReturnType<typeof vi.fn>;
}

let n = 0;
function guard(x: number, z: number, o: Partial<FakeGuard> = {}): FakeGuard {
  const num = 8000 + n++;
  const g: FakeGuard = {
    id: `c${num}`,
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
    def: { melee: null, kind: 'grunt', scale: 1 },
    pos: new Vector3(x, 0, z),
    yaw: 0,
    radio: vi.fn(),
    bark: vi.fn(),
    checkBody: vi.fn(),
    ...o,
  };
  // like the real one: he takes the task (the board then follows him)
  g.checkBody.mockImplementation((_b: unknown, inc: number) => {
    g.incident = inc;
  });
  return g;
}

interface FakeBody {
  id: string;
  pos: Vector3;
  lethal: boolean;
  carried: boolean;
  hidden: boolean;
  present: boolean;
  found: boolean;
  light: number;
}

let bn = 900000;
function body(x: number, z: number, lethal = false, o: Partial<FakeBody> = {}): FakeBody {
  return { id: `b${bn++}`, pos: new Vector3(x, 0.15, z), lethal, carried: false, hidden: false, present: true, found: false, light: 0, ...o };
}

const ROOMS = [{ id: 'bay', name: 'Loading Bay', minX: -50, maxX: 50, minZ: -50, maxZ: 50 }];

/** A manager on a stub world (open floor unless `detour` says a straight line is blocked: then `findPath` walks round
 *  by (x, 40)). */
function manager(gs: FakeGuard[], detour: (ax: number, az: number) => boolean = () => false) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: ROOMS },
    doors: { list: [] },
  };
  const nav = {
    walk: new Uint8Array(4),
    nearestWalkable: vi.fn(() => -1),
    lineClear: vi.fn((a: [number, number]) => !detour(a[0], a[1])),
    findPath: vi.fn((a: [number, number], b: [number, number]) => [
      [a[0], 40],
      [b[0], 40],
    ]),
    heightAt: vi.fn(() => 0),
  };
  const em = new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, { clear: () => true } as unknown as Ballistics, {} as Vfx, DIFFICULTY.normal, () => []);
  for (const g of gs) em.enemies.push(g as unknown as Enemy);
  const lines: [string, string][] = [];
  em.onCameraLine = (cam, line) => lines.push([cam, line]);
  const priv = em as unknown as { boardStep(dt: number): void };
  /** The board's 5 Hz tick for `sec` s. */
  const tick = (sec: number): void => {
    for (let k = 0; k < Math.round(sec / 0.2); k++) priv.boardStep(0.2);
  };
  const add = (b: FakeBody): FakeBody => {
    em.bodies.push(b as unknown as Body);
    return b;
  };
  return { em, lines, tick, add };
}

const ev = (b: FakeBody, camera = 'cam1'): CameraBodyEvent => ({ camera, bodyId: b.id, lethal: b.lethal, x: b.pos.x, y: b.pos.y, z: b.pos.z, section: undefined });
const sent = (gs: FakeGuard[]): number[] => gs.flatMap((g, i) => (g.checkBody.mock.calls.length ? [i] : []));

describe('cameras see bodies, wired (S7)', () => {
  it('a knocked-out guard on camera: one camBody incident, the nearest calm guard sent to that body, one radio line', () => {
    const gs = [guard(20, 0), guard(6, 0), guard(0, 12), guard(-3, 0, { level: 'alert', alerted: true })];
    const { em, lines, add } = manager(gs);
    const b = add(body(0, 0));
    const inc = em.cameraReport(ev(b), 'Camera 2');
    expect(inc).toBeGreaterThan(0);
    expect(em.board.kindOf(inc)).toBe('camBody');
    // the alerted guard is nearer but busy: the nearest calm one (6 m) goes, nobody else
    expect(sent(gs)).toEqual([1]);
    expect(gs[1]!.checkBody).toHaveBeenCalledWith(b, inc);
    expect(lines).toEqual([['cam1', camBodyLine('Camera 2', 'Loading Bay', false)]]);
    expect(lines[0]![1]).toContain('Camera 2 has a man down, Loading Bay.');
    expect(em.camReports).toBe(1);
  });

  it('a dead guard on camera: the two nearest calm guards go, a third does not', () => {
    const gs = [guard(4, 0), guard(0, 9), guard(14, 0)];
    const { em, lines, add } = manager(gs);
    const b = add(body(0, 0, true));
    const inc = em.cameraReport(ev(b));
    expect(sent(gs)).toEqual([0, 1]);
    const inv: [number, number] = [-1, -1];
    em.board.investigatorsOf(inc, inv);
    expect(inv).toEqual([gs[0]!.num, gs[1]!.num]);
    expect(lines[0]![1]).toBe(camBodyLine('Camera', 'Loading Bay', true));
  });

  it('two cameras see one body: one incident, one line, one guard (deduped by body)', () => {
    const gs = [guard(5, 0), guard(8, 0)];
    const { em, lines, tick, add } = manager(gs);
    const b = add(body(0, 0));
    const a = em.cameraReport(ev(b, 'cam1'));
    tick(0.6);
    const c = em.cameraReport(ev(b, 'cam2'));
    expect(c).toBe(a);
    expect(em.board.openCount).toBe(1);
    expect(lines).toHaveLength(1);
    expect(sent(gs)).toEqual([0]);
    expect(gs[0]!.checkBody).toHaveBeenCalledTimes(1);
  });

  it('two bodies side by side: two incidents (each its own guard)', () => {
    const gs = [guard(5, 0), guard(8, 0)];
    const { em, add } = manager(gs);
    const a = em.cameraReport(ev(add(body(0, 0))));
    const c = em.cameraReport(ev(add(body(1, 0))));
    expect(c).not.toBe(a);
    expect(sent(gs)).toEqual([0, 1]);
  });

  it('a body already found, carried, hidden or gone is ignored (no incident, no line, nobody sent)', () => {
    const gs = [guard(5, 0)];
    const { em, lines, add } = manager(gs);
    const bs = [add(body(0, 0, false, { found: true })), add(body(0, 1, false, { carried: true })), add(body(0, 2, false, { hidden: true })), add(body(0, 3, false, { present: false }))];
    for (const b of bs) expect(em.cameraReport(ev(b))).toBe(-1);
    // a body no longer in the manager's list
    expect(em.cameraReport({ ...ev(body(0, 4)) })).toBe(-1);
    expect(em.board.openCount).toBe(0);
    expect(lines).toHaveLength(0);
    expect(sent(gs)).toEqual([]);
    expect(em.camIgnored).toBe(5);
  });

  it('dogs and melee guards are never sent; held, busy and tasked guards neither', () => {
    const gs = [
      guard(2, 0, { dog: {} }),
      guard(3, 0, { def: { melee: {}, kind: 'runner', scale: 1 } }),
      guard(4, 0, { taken: true }),
      guard(5, 0, { runningAlarm: true }),
      guard(6, 0, { incident: 99 }),
      guard(7, 0, { level: 'searching' }),
      guard(11, 0),
    ];
    const { em, add } = manager(gs);
    em.cameraReport(ev(add(body(0, 0, true))));
    expect(sent(gs)).toEqual([6]);
  });

  it('by path length, not straight distance: a guard 8 m off behind a wall loses to one 12 m off in the open', () => {
    // the guard at x 8 has no straight line (his path goes round by z 40)
    const gs = [guard(8, 0), guard(-12, 0)];
    const { em, add } = manager(gs, (ax) => ax === 8);
    em.cameraReport(ev(add(body(0, 0))));
    expect(sent(gs)).toEqual([1]);
  });

  it(`nobody calm within ${INCIDENT.callR} m: nobody goes; one who comes in range within ${INCIDENT.camWait} s is sent; after that it lapses`, () => {
    const far = guard(INCIDENT.callR + 5, 0);
    const { em, lines, tick, add } = manager([far]);
    const b = add(body(0, 0));
    const inc = em.cameraReport(ev(b));
    // the desk still calls it in
    expect(lines).toHaveLength(1);
    expect(far.checkBody).not.toHaveBeenCalled();
    tick(2);
    expect(far.checkBody).not.toHaveBeenCalled();
    // he walks into range: the next board tick sends him
    far.pos.x = INCIDENT.callR - 2;
    tick(0.2);
    expect(far.checkBody).toHaveBeenCalledWith(b, inc);

    // a second body nobody comes near: closed after camWait
    const g2 = guard(INCIDENT.callR + 20, 0);
    const m2 = manager([g2]);
    const i2 = m2.em.cameraReport(ev(m2.add(body(0, 0))));
    m2.tick(INCIDENT.camWait - 1);
    expect(m2.em.board.kindOf(i2)).toBe('camBody');
    m2.tick(2);
    expect(m2.em.board.kindOf(i2)).toBeNull();
    expect(g2.checkBody).not.toHaveBeenCalled();
  });

  it('the sent guard going off his task (he found it, or combat) closes the incident', () => {
    const g = guard(5, 0);
    const { em, tick, add } = manager([g]);
    const inc = em.cameraReport(ev(add(body(0, 0))));
    tick(0.4);
    expect(em.board.kindOf(inc)).toBe('camBody');
    g.incident = -1;
    tick(0.2);
    expect(em.board.kindOf(inc)).toBeNull();
  });

  it('the parked modes (not coordinated): nothing', () => {
    const g = guard(5, 0);
    const { em, lines, add } = manager([g]);
    em.coordinated = false;
    expect(em.cameraReport(ev(add(body(0, 0))))).toBe(-1);
    expect(g.checkBody).not.toHaveBeenCalled();
    expect(lines).toHaveLength(0);
  });

  it('the radio lines: knocked out (one goes) / dead (two go), the room dropped when there is none, under 90 characters', () => {
    expect(camBodyLine('Camera 3', 'Bin Store', false)).toBe('Camera 3 has a man down, Bin Store. Nearest unit, check on him.');
    expect(camBodyLine('Camera 3', '', true)).toBe("Camera 3 has a man down. He's not moving. Two of you, go.");
    expect(camBodyLine('Camera 12', 'Smoking Shelter', true).length).toBeLessThanOrEqual(90);
  });
});

describe('the camera body pass into the board (the GameState wiring, S7)', () => {
  /** A camera 3 m up at the origin facing +Z, pitched to the floor 8 m ahead (as in securityBodies.test). */
  const CAM: CameraDevice = { id: 'camA', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, aim: 8, reason: 't' };

  function chain(gs: FakeGuard[]) {
    const m = manager(gs);
    const ray = { hitDistance: (a: Vector3, b: Vector3) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2) };
    const sys = new SecuritySystem({ devices: [CAM] }, { ballistics: ray as unknown as Ballistics, players: () => [] });
    const bodies = m.em.bodies;
    sys.setBodySource(() => bodies);
    sys.onBody = (e) => m.em.cameraReport(e, 'Camera 1');
    const run = (s: number): void => {
      for (let i = 0; i < Math.round(s * 60); i++) sys.fixedUpdate(1 / 60);
    };
    return { ...m, sys, run };
  }

  it('a knocked-out guard in the dark in the frame: within one body pass a guard is sent; reported once', () => {
    const gs = [guard(4, 12), guard(-15, 8)];
    const { em, sys, run, add, lines } = chain(gs);
    // light 0: the camera's IR sees it the same (G240)
    const b = add(body(0.5, 8, false, { light: 0 }));
    run(0.6);
    expect(sent(gs)).toEqual([0]);
    expect(gs[0]!.checkBody.mock.calls[0]![0]).toBe(b);
    expect(lines).toHaveLength(1);
    run(3);
    expect(gs[0]!.checkBody).toHaveBeenCalledTimes(1);
    expect(em.camReports).toBe(1);
    // looped / off: blind
    sys.clearBodyReports();
    sys.cameras[0]!.mode = 'off';
    add(body(-0.5, 8));
    run(1);
    expect(em.camReports).toBe(1);
  });

  it('out of frame: nothing is reported', () => {
    const gs = [guard(4, 0)];
    const { em, run, add } = chain(gs);
    add(body(0, -8));
    run(2);
    expect(em.camReports).toBe(0);
    expect(sent(gs)).toEqual([]);
  });
});
