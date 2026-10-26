import { describe, expect, it, vi } from 'vitest';
import { CoopHost } from '../src/net/coopHost';
import { JoinWatch, RESTORE_S } from '../src/net/joinWatch';
import { emptyMoveState, type MoveState } from '../src/player/moveState';
import type { SlotPoint } from '../src/game/spawnSlots';
import { Vector3 } from '../src/core/babylon';

// (campus-greybox A28 fix 1) The host places a co-op client whose first state came while the host was still loading
// (before `enter` -> `mode.start()` moved the run to section N): `CoopHost.placeEarly` on the first `fixedUpdate`.
// The host is a stand-in on CoopHost's prototype (as tests/courseLampWire.test.ts): the real `fixedUpdate`, `receive`,
// `firstPlace`, `joinSpot` and `JoinWatch`, with the per-step systems that need a whole match stubbed out.

// the host's own move state reads the whole player; this host stands still
vi.mock('../src/game/localMoveState', () => ({ localMoveState: (_g: unknown, out: MoveState) => out }));

const DT = 1 / 60;
const pt = (x: number, yaw = 0): SlotPoint => ({ x, y: 0, z: 0, yaw });
/** Section 1's start (the constructor's checkpoint) and connector N-1's checkpoint / partner point (`startAt`'s). */
const S1 = [pt(0)];
const CP = [pt(100), pt(101.5)];
/** Where `CoopClient.placeStart` puts the client: beside section 1's start. */
const CLIENT_START = 1.2;

type Pstate = { t: 'pstate'; s: { x: number; y: number; z: number; yaw: number } };
const pstate = (x: number): Pstate => ({ t: 'pstate', s: { x, y: 0, z: 0, yaw: 0 } });

/**
 * A Sector Ops host and one client `C`. `start(moved)`: the mode starts (`enter`); `moved` (a `?sectorStart` run): the
 * checkpoint is connector N-1's and connector 1's near door is locked (no walk from section 1 to it). The nav stand-in
 * finds a straight path unless that door stands between the two ends (x < 50 is section 1).
 */
function setup() {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const mode = { id: 'sector', cps: S1 as readonly SlotPoint[], checkpointSpawns(): readonly SlotPoint[] { return this.cps; } };
  let locked = false;
  const nav = {
    findPath: (from: [number, number], to: [number, number]) => (locked && from[0] < 50 !== to[0] < 50 ? null : [to]),
  };
  const player = { position: new Vector3(0, 0, 0), cam: { yaw: 0 } };
  const g = {
    mode,
    nav,
    player,
    // the open line is clear (level-flat), a ray down meets a floor
    ballistics: { clear: (a: Vector3, b: Vector3) => a.y <= b.y },
    world: { level: { boxes: [], cylinders: [], anchors: null, coverSegments: null, opticPoints: [] }, doors: { list: [] } },
  };
  const r = {
    id: 'C',
    held: false,
    alive: true,
    state: null as Pstate['s'] | null,
    feet: new Vector3(0, 0, 0),
    ref: { shield: null },
    avatar: { buf: { push: () => {} } },
    accept(s: Pstate['s']) {
      this.state = s;
      this.feet.set(s.x, s.y, s.z);
    },
    update: () => {},
    allowTeleport: vi.fn(),
  };
  const noop = () => {};
  const joins = new JoinWatch();
  const place = vi.spyOn(joins, 'place');
  const queue: { e: string; player?: string; x?: number; z?: number }[] = [];
  Object.assign(h, {
    g,
    s: { selfId: 'H' },
    remotes: new Map([['C', r]]),
    joins,
    rejoining: new Set<string>(),
    queue,
    time: 0,
    itemsT: 0,
    histT: 1e9,
    snapT: 1e9,
    strikes: new Map(),
    throwKo: { active: false },
    carries: new Map(),
    revives: new Map(),
    seized: new Map(),
    respawnIn: new Map(),
    mvNow: emptyMoveState(),
    mvSent: emptyMoveState(),
    stateTime: () => 0,
    stepReviveClock: noop,
    remoteNoise: noop,
    recordHistory: noop,
    snapshot: noop,
    sendLamps: noop,
  });
  const host = h as unknown as { receive(m: Pstate, from: string): void; fixedUpdate(dt: number): void };
  return {
    r,
    place,
    joins,
    /** The client's state at plan x, through the host's `receive` (as the session's `game` event). */
    send: (x: number) => host.receive(pstate(x), 'C'),
    step: () => host.fixedUpdate(DT),
    start(moved: boolean) {
      if (!moved) return;
      mode.cps = CP;
      locked = true;
      player.position.set(CP[0]!.x, 0, 0);
    },
    restores: () => queue.filter((e) => e.e === 'restore'),
  };
}

describe('campus-greybox A28 fix 1: a client that arrived before the host moved the run to section N', () => {
  it('its first state before start: judged in section 1, then placed at the checkpoint on the first step after start', () => {
    const t = setup();
    // the client entered first: its states come in while the host still loads (section 1, nothing locked)
    t.send(CLIENT_START);
    t.send(CLIENT_START);
    expect(t.joins.restoring('C')).toBe(false);
    expect(t.place).not.toHaveBeenCalled();
    // enter -> mode.start(): the run moves to section N; then the loop's first fixed step
    t.start(true);
    t.step();
    expect(t.place).toHaveBeenCalledTimes(1);
    expect(t.joins.restoring('C')).toBe(true);
    expect(t.r.allowTeleport).toHaveBeenCalled();
    // its next state sends the restore: its slot point at connector N-1's checkpoint (`checkpoint2`)
    t.send(CLIENT_START);
    const sent = t.restores();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.player).toBe('C');
    expect(sent[0]!.x).toBeCloseTo(CP[1]!.x, 5);
    expect(sent[0]!.z).toBeCloseTo(CP[1]!.z, 5);
    // it arrives there: the restore ends, later steps place nothing more
    t.send(CP[1]!.x);
    expect(t.joins.restoring('C')).toBe(false);
    for (let i = 0; i < 120; i++) t.step();
    expect(t.place).toHaveBeenCalledTimes(1);
  });

  it('the re-check runs once: a client that never arrives (the restore ran out) is not placed again by later steps', () => {
    const t = setup();
    t.send(CLIENT_START);
    t.start(true);
    t.step();
    expect(t.place).toHaveBeenCalledTimes(1);
    // past the restore's 30 s with the client still in section 1: the restore ends on its next state
    for (let i = 0; i < Math.ceil((RESTORE_S + 1) / DT); i++) t.step();
    t.send(CLIENT_START);
    expect(t.joins.restoring('C')).toBe(false);
    for (let i = 0; i < 60; i++) t.step();
    expect(t.place).toHaveBeenCalledTimes(1);
  });

  it('a normal run (no sectorStart): the early client is not moved, at its start spot or after walking in section 1', () => {
    for (const x of [CLIENT_START, 10]) {
      const t = setup();
      t.send(x);
      t.start(false);
      t.step();
      t.send(x);
      expect(t.place).not.toHaveBeenCalled();
      expect(t.joins.restoring('C')).toBe(false);
      expect(t.restores()).toHaveLength(0);
    }
  });

  it('a client whose first state comes after start is placed once on that state, as before', () => {
    const t = setup();
    t.start(true);
    t.step();
    expect(t.place).not.toHaveBeenCalled();
    t.send(CLIENT_START);
    expect(t.place).toHaveBeenCalledTimes(1);
    expect(t.joins.restoring('C')).toBe(true);
    for (let i = 0; i < 60; i++) t.step();
    expect(t.place).toHaveBeenCalledTimes(1);
  });

  it('a client already being restored or watched when the host starts is left to that path', () => {
    for (const kind of ['restoring', 'watched'] as const) {
      const t = setup();
      t.send(CLIENT_START);
      if (kind === 'restoring') t.joins.place('C', CP[1]!, 0);
      else t.joins.late('C', S1, 0);
      t.place.mockClear();
      t.start(true);
      t.step();
      expect(t.place).not.toHaveBeenCalled();
    }
  });
});
