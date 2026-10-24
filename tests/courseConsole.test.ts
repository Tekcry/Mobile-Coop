/**
 * guard-ai S22 game side (G6, A133 / A134): the security console's wiring in Course mode. Michael: "if i turn it off
 * while hes distracted, he should notice when he sees it and turn it back on also." The guards hear of every toggle
 * (`EnemyManager.consoleState`), a guard's reset ends the loop as if it ran out (`CourseState.consoleBack`), and the
 * press is refused only while the console's guard watches it (`EnemyManager.watchesConsole`).
 */
import { describe, expect, it } from 'vitest';
import type { CourseDef, CourseLayout } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { CONSOLE_GUARD_UP, CONSOLE_REARM, type SecurityConsole } from '../src/game/course/securityRoom';
import { CourseMode } from '../src/game/modes/courseMode';
import type { GameState } from '../src/game/gameState';
import type { ConsoleHost } from '../src/ai/consoleFault';

const CON: SecurityConsole = { id: 'sw-con', guard: 'sec-guard', flag: 'cams-off', seconds: 30, rearm: 20 };

function def(): CourseDef {
  return {
    id: 'sec',
    airlocks: [],
    bays: [
      {
        id: 'B1',
        entry: 'start',
        exit: 'end',
        squad: ['sec-guard'],
        gates: [{ kind: 'pickup', id: 'g-cams', switchId: 'sw-con', flag: 'cams-off', perPlayer: false }],
        radio: [],
        drills: [],
        elements: [],
      },
    ],
  };
}

const LAY: CourseLayout = {
  def: def(),
  doors: {},
  devices: { 'sw-con': { x: 3, y: 0, z: 4, yaw: 0 } },
  squads: { 'sec-guard': { kind: 'grunt', x: 0, z: 0, yaw: 0 } },
  consoles: [CON],
};

interface StubEm {
  stealth: boolean;
  enemies: unknown[];
  consoleHost: ConsoleHost | null;
  watching: boolean;
  watchCalls: unknown[][];
  states: unknown[][];
  spawn: (kind: string) => unknown;
  pointLooks: () => number[];
  despawn: () => void;
  placeSlot: () => void;
  consoleState: (...a: unknown[]) => void;
  watchesConsole: (...a: unknown[]) => boolean;
}

type Internals = {
  press(cid: string, p: 0 | 1): void;
  handle(): void;
  consoleBack(id: string): boolean;
  spawnSquad(ids: string[]): void;
  consoleGate: Map<string, string>;
  refusal: string;
  dirty: boolean;
};

/** A CourseMode on a stub GameState with a stub EnemyManager that records the console calls. */
function rig(): { mode: CourseMode; m: Internals; em: StubEm; st: CourseState } {
  const em: StubEm = {
    stealth: false,
    enemies: [],
    consoleHost: null,
    watching: false,
    watchCalls: [],
    states: [],
    spawn: (kind: string) => ({ kind, alive: true, setPatrol: () => undefined }),
    // (gm-look-seeds) a set's look seeds (`spawnSquad`): none here, `spawn` picks
    pointLooks: () => [],
    despawn: () => undefined,
    placeSlot: () => undefined,
    consoleState: (...a: unknown[]) => void em.states.push(a),
    watchesConsole: (...a: unknown[]) => {
      em.watchCalls.push(a);
      return em.watching;
    },
  };
  const g = {
    interactables: { items: [], add: () => ({}), setEnabled: () => undefined },
    enemyMgr: em,
    takedown: { active: false, reset: () => undefined },
    net: null,
    world: { doors: { list: [] }, level: { lights: { lights: [] } } },
    traversal: { attachCtl: { disabled: new Set<number>() } },
    hud: { banner: () => undefined, pings: { hideMarker: () => undefined } },
    app: { toasts: { show: () => undefined } },
  } as unknown as GameState;
  const mode = new CourseMode(g);
  mode.layout = LAY;
  const st = new CourseState(LAY.def, LAY.consoles);
  st.clearEvents();
  mode.state = st;
  const m = mode as unknown as Internals;
  m.consoleGate.set('sw-con', 'g-cams');
  m.spawnSquad(['sec-guard']);
  return { mode, m, em, st };
}

describe('guard-ai S22: CourseState.consoleBack (A133)', () => {
  it('ends the loop as if it ran out: the flag clears, the gate closes, the re-arm starts; false when not set', () => {
    const s = new CourseState(def(), [CON]);
    expect(s.consoleBack('g-cams')).toBe(false);
    expect(s.consoleBack('nope')).toBe(false);
    expect(s.press('sw-con', 0)).toBeNull();
    expect(s.hasFlag('cams-off')).toBe(true);
    expect(s.isGateOpen('g-cams')).toBe(true);
    s.clearEvents();
    expect(s.consoleBack('g-cams')).toBe(true);
    expect(s.hasFlag('cams-off')).toBe(false);
    expect(s.isGateOpen('g-cams')).toBe(false);
    expect(s.gateTimer('g-cams')).toBe(0);
    expect(s.gateRearm('g-cams')).toBeCloseTo(20, 5);
    expect(s.events.some((e) => e.t === 'flagCleared' && e.flag === 'cams-off')).toBe(true);
    // a second call: the flag is no longer set
    expect(s.consoleBack('g-cams')).toBe(false);
  });
});

describe('guard-ai S22: Course mode console wiring', () => {
  it('the refusal holds only while the guard watches the console (A134), asked at the console device', () => {
    const { m, em, st } = rig();
    em.watching = true;
    m.press('sw-con', 0);
    expect(m.refusal).toBe(CONSOLE_GUARD_UP);
    expect(st.hasFlag('cams-off')).toBe(false);
    expect(em.watchCalls).toHaveLength(1);
    expect(em.watchCalls[0]!.slice(1)).toEqual([3, 0, 4]);
    // drawn off (or passive): the press goes through
    em.watching = false;
    m.press('sw-con', 0);
    expect(st.hasFlag('cams-off')).toBe(true);
  });

  it('a switch-off tells the guards (consoleState off) at the console device', () => {
    const { m, em } = rig();
    m.press('sw-con', 0);
    expect(em.states).toEqual([['sw-con', 3, 0, 4, false]]);
  });

  it('a guard reset (the host) ends the loop; the next handle tells the guards it is on; the re-arm refuses a press', () => {
    const { m, em, st } = rig();
    m.press('sw-con', 0);
    em.states.length = 0;
    m.dirty = false;
    expect(m.consoleBack('sw-con')).toBe(true);
    expect(m.dirty).toBe(true);
    expect(st.hasFlag('cams-off')).toBe(false);
    // not reentrant: nothing reaches the guards until the mode's next handle
    expect(em.states).toHaveLength(0);
    m.handle();
    expect(em.states).toEqual([['sw-con', 3, 0, 4, true]]);
    // already on: nothing to do
    expect(m.consoleBack('sw-con')).toBe(false);
    expect(m.consoleBack('not-a-console')).toBe(false);
    m.press('sw-con', 0);
    expect(m.refusal).toBe(CONSOLE_REARM);
  });

  it('the loop running out also tells the guards it is on', () => {
    const { m, em, st } = rig();
    m.press('sw-con', 0);
    em.states.length = 0;
    st.update(31);
    m.handle();
    expect(st.hasFlag('cams-off')).toBe(false);
    expect(em.states).toEqual([['sw-con', 3, 0, 4, true]]);
  });

  it('dispose clears the console host', () => {
    const { mode, em } = rig();
    em.consoleHost = { reset: () => true };
    const gl = globalThis as { window?: unknown };
    const had = 'window' in gl;
    if (!had) gl.window = {};
    try {
      mode.dispose();
    } finally {
      if (!had) delete gl.window;
    }
    expect(em.consoleHost).toBeNull();
  });
});
