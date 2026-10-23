import { vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { NavGrid, type NavBlocker } from '../../src/ai/navGrid';
import type { PlayerRef } from '../../src/ai/enemy';
import type { DoorState } from '../../src/world/doors';
import type { Interactable } from '../../src/game/interactables';
import type { SectorDef } from '../../src/game/sectors';
import { SectorTeamDoors, type TeamDoorHost } from '../../src/game/sectorTeamDoors';

/** (sector-redesign E3) The team doors' mode wiring against a real nav grid, with fake doors, items and players. */

const pose = { x: 0, y: 0, z: 0, yaw: 0 };
/** A one-section run (an extraction, so `checkSectors` passes) with `extra` merged in. */
export const oneSec = (id: string, extra: Partial<SectorDef> = {}): SectorDef => ({
  id,
  name: id,
  start: pose,
  objective: { kind: 'hack', label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  guards: [],
  reinforce: [],
  perStage: 2,
  routes: [],
  extract: { label: 'x', box: [0, 0, 1, 1] },
  ...extra,
});

/** A wall along x = 0 (z -10..10) with a 1 m doorway at z 0 (navClosure.test's). */
function walled(): NavGrid {
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.5,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall(-5.45, 4.55), wall(5.45, 4.55)],
    agentRadius: 0.3, stepHeight: 0.45, seed: [-5, -5],
  });
}

export interface Rig {
  team: SectorTeamDoors;
  nav: NavGrid;
  door: DoorState;
  items: Interactable[];
  refs: PlayerRef[];
  feed: ReturnType<typeof vi.fn>;
  changed: ReturnType<typeof vi.fn>;
}

/** The team doors of `defs` built over the walled grid; the one door (index 3) is the doorway at (0, 0). */
export function rig(defs: SectorDef[]): Rig {
  const nav = walled();
  // the leaf along z (yaw 0), 1 m wide, hinge at the doorway's -z end
  const door = { index: 3, anchor: { width: 1, yaw: 0, hinge: { x: 0, y: 0, z: -0.5 }, locked: false } } as unknown as DoorState;
  const items: Interactable[] = [];
  const refs: PlayerRef[] = [];
  const feed = vi.fn();
  const changed = vi.fn();
  const host: TeamDoorHost = {
    doors: { nearest: (x, z, r) => (Math.hypot(x, z) <= r ? door : null) },
    ints: {
      add: (id, kind, pos, label, holdTime, yaw = 0) => {
        const it = { id, kind, pos, label, holdTime, yaw, enabled: false, done: false, progress: 0 } as unknown as Interactable;
        items.push(it);
        return it;
      },
      setEnabled: (it, on) => {
        it.enabled = on;
      },
    },
    nav,
    lockDoor: (d, on) => {
      (d.anchor as { locked: boolean }).locked = on;
    },
    refs: () => refs,
    feed,
    changed,
  };
  const team = new SectorTeamDoors(defs, host);
  team.build();
  return { team, nav, door, items, refs, feed, changed };
}

/** A player ref with feet at (x, 0, z). */
export function player(id: string, x: number, z: number, alive = true): PlayerRef {
  return { id, target: { alive } as PlayerRef['target'], feet: new Vector3(x, 0, z), speed: 0, crouched: false };
}

/** A guard path crosses the doorway. */
export const through = (g: NavGrid): boolean => !!g.findPath([-4, 0], [4, 0]);
