/**
 * marlow-final N4: the hold device (a course device with `hold` / `holdNoise`; a completed hold is the press), and the
 * Course mode fixes from ENGINE-ANSWERS: course guards on the CT stealth rules (Q2, assumed decision A8) and the old
 * squad leaving through `em.despawn` (Q4, its bodies go too).
 */
import { describe, expect, it } from 'vitest';
import { deviceHoldTime, type CourseDef, type CourseLayout } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { CourseMode, courseGuardRules } from '../src/game/modes/courseMode';
import type { GameState } from '../src/game/gameState';
import type { Interactable } from '../src/game/interactables';

function def(): CourseDef {
  return {
    id: 'n4',
    airlocks: [],
    bays: [
      {
        id: 'A6',
        entry: 'start',
        exit: 'end',
        squad: ['a6-attendant'],
        gates: [{ kind: 'pickup', id: 'g-a6-drive', switchId: 'drive', flag: 'a6-drive', perPlayer: false }],
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
  devices: { drive: { x: 1, y: 0, z: 2, yaw: 0, label: 'Isolate drive', hold: 3, holdNoise: 6 }, tap: { x: 0, y: 0, z: 0, yaw: 0 } },
  squads: { 'a6-attendant': { kind: 'grunt', x: 0, z: 0, yaw: 0 } },
};

interface FakeItem {
  id: string;
  holdTime: number;
  progress: number;
  holdNoise?: number;
  reach?: number;
  enabled: boolean;
  onUse?: (it: Interactable, who?: string) => void;
}

/** A CourseMode on a stub GameState: enough for its device, press and squad paths (no Babylon scene). */
function rig(): { mode: CourseMode; items: FakeItem[]; despawned: unknown[]; spawned: unknown[] } {
  const items: FakeItem[] = [];
  const despawned: unknown[] = [];
  const spawned: unknown[] = [];
  const em = {
    stealth: false,
    enemies: [] as unknown[],
    // (gm-look-seeds) a set's look seeds (`spawnSquad`): none here, `spawn` picks
    pointLooks: () => [],
    spawn: (kind: string) => {
      const e = { kind, alive: true, setPatrol: () => undefined };
      spawned.push(e);
      return e;
    },
    despawn: (e: unknown) => despawned.push(e),
    placeSlot: () => undefined, // (guard-ai S5, master) post, profile, section
    // (marlow-play-2 C17) a new set clears the guards' shared memory (`forgetSighting`)
    radioNet: { clear: () => undefined },
    board: { clear: () => undefined },
    intruders: { clear: () => undefined },
    resetAlarm: () => undefined,
  };
  const g = {
    interactables: {
      items,
      add: (id: string, _k: string, _p: unknown, label: string, holdTime: number) => {
        const it: FakeItem = { id, holdTime, progress: 0, enabled: false };
        void label;
        items.push(it);
        return it;
      },
      setEnabled: (it: FakeItem, on: boolean) => (it.enabled = on),
    },
    enemyMgr: em,
    takedown: { active: false, reset: () => undefined },
    net: null,
    world: { doors: { list: [] }, level: { lights: { lights: [] } } },
    traversal: { attachCtl: { disabled: new Set<number>() } },
    hud: { banner: () => undefined },
    app: { toasts: { show: () => undefined } },
  } as unknown as GameState;
  const mode = new CourseMode(g);
  mode.layout = LAY;
  mode.state = new CourseState(LAY.def);
  return { mode, items, despawned, spawned };
}

type Internals = { device(cid: string, label: string, braced?: boolean): FakeItem | null; spawnSquad(ids: string[]): void };

describe('N4 hold device', () => {
  it('deviceHoldTime: the device hold, 0 for a tap or a brace point', () => {
    expect(deviceHoldTime(LAY.devices.drive!, false)).toBe(3);
    expect(deviceHoldTime(LAY.devices.tap!, false)).toBe(0);
    expect(deviceHoldTime(LAY.devices.drive!, true)).toBe(0);
    expect(deviceHoldTime({ x: 0, y: 0, z: 0, yaw: 0, hold: -2 }, false)).toBe(0);
  });
  it('the item gets the hold time and the hold noise; the completed hold is the press (and empties for next time)', () => {
    const { mode, items } = rig();
    const it = (mode as unknown as Internals).device('drive', 'Take')!;
    expect(it.holdTime).toBe(3);
    expect(it.holdNoise).toBe(6);
    const tap = (mode as unknown as Internals).device('tap', 'Take')!;
    expect(tap.holdTime).toBe(0);
    expect(tap.holdNoise).toBeUndefined();
    expect(items).toHaveLength(2);
    // the interact system calls onUse once progress reaches holdTime (a client's completed hold sends `use`)
    it.progress = 3;
    it.onUse!(it as unknown as Interactable, 'peer-2');
    expect(mode.state!.hasShared('a6-drive')).toBe(true);
    expect(it.progress).toBe(0);
  });
});

describe('ENGINE-ANSWERS Q2 / Q4: course guards', () => {
  it('Course mode puts the guards on the stealth rules (assumed decision A8)', () => {
    const em = { stealth: false };
    courseGuardRules(em);
    expect(em.stealth).toBe(true);
  });
  it('the old squad leaves through em.despawn (its bodies go too) before the new one spawns', () => {
    const { mode, despawned, spawned } = rig();
    const m = mode as unknown as Internals;
    m.spawnSquad(['a6-attendant']);
    expect(spawned).toHaveLength(1);
    const first = spawned[0];
    m.spawnSquad(['a6-attendant']);
    expect(despawned).toEqual([first]);
    expect(spawned).toHaveLength(2);
    expect(mode.squadOf('a6-attendant')).toBe(spawned[1]);
  });
});
