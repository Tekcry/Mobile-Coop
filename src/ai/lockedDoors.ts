/**
 * (guard-ai S28) Locked doors on the guards' nav grid. Pure (no Babylon / DOM), unit-tested
 * (`tests/lockedDoorPath.test.ts`).
 *
 * Cause (Marlow Yard A7, `A7-cage-w`): since S20 the grid walked every doorway (A116: no closure per door) and the
 * walker's door gate (`doorGate.ts`, `EnemyManager` `doorStep`) opened a shut leaf in his step only when it was not
 * locked. A* (`NavGrid.findPath`, `lineClear`, the flow field) still routed through a locked door, so a guard walked up to
 * its leaf and waited there (~15 s) until his route moved on. Only Sector Ops' keypad, bolt, lockdown and pair-gate doors
 * shut their doorways on the grid (`sectorStage.addDoorClosure`).
 *
 * Now every door has a nav closure (the Sector Ops size: `STAGE_NAV_ACROSS` deep, the width + `STAGE_NAV_ALONG` long),
 * built once with the gate, and `sync` holds it shut while the door is locked and shut (`anchor.locked`, `target` 0). A
 * lock or unlock at run time (any `Doors.setLocked`: Marlow's course gates, Sector Ops' stage, team and keypad locks;
 * host and solo only, the client has no grid) is picked up on the manager's next update: `setClosed` bumps `NavGrid.version`, which replans every held route
 * (`Enemy.goTo`) and the flow field once. No guard has a key: every guard treats a locked shut door as a wall (the
 * `keyholder` role in the sector data is a fixed post, not door access). A locked door standing open stays walkable.
 * Overlaps with the Sector Ops closures are counted per cell (`NavGrid.setClosed`). Allocation-free after the constructor.
 */
import { STAGE_NAV_ACROSS, STAGE_NAV_ALONG } from '../game/sectorStage';

/** The grid calls this needs (`NavGrid`). */
export interface LockNav {
  addClosure(cx: number, cz: number, hx: number, hz: number, yaw: number, y: number): number;
  setClosed(id: number, on: boolean): void;
}

/** A door as the lock closure reads it (`DoorState`). */
export interface LockDoor {
  readonly cx: number;
  readonly cz: number;
  /** 0 shut / shutting, 1 open / opening. */
  readonly target: number;
  readonly anchor: { readonly yaw: number; readonly width: number; readonly locked: boolean; readonly hinge: { readonly y: number } };
}

/** The door is a wall to every guard: locked and shut (or shutting). */
export function lockedShut(d: LockDoor): boolean {
  return d.anchor.locked && d.target === 0;
}

export class LockedDoorNav {
  readonly n: number;
  /** Each door's closure id on the grid. */
  private readonly ids: Int32Array;
  /** 1 while the door's closure is held shut. */
  private readonly shut: Uint8Array;

  constructor(
    private readonly nav: LockNav,
    private readonly doors: readonly LockDoor[],
  ) {
    const n = doors.length;
    this.n = n;
    this.ids = new Int32Array(n);
    this.shut = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const d = doors[k]!;
      const a = d.anchor;
      this.ids[k] = nav.addClosure(d.cx, d.cz, STAGE_NAV_ACROSS, (a.width + STAGE_NAV_ALONG) / 2, a.yaw, a.hinge.y);
    }
  }

  /** Shut or open each door's closure to follow its lock; the number that changed. Allocation-free. */
  sync(): number {
    let changed = 0;
    for (let k = 0; k < this.n; k++) {
      const want = lockedShut(this.doors[k]!) ? 1 : 0;
      if (want === this.shut[k]) continue;
      this.shut[k] = want;
      this.nav.setClosed(this.ids[k]!, want === 1);
      changed++;
    }
    return changed;
  }

  /** Door k's closure is held shut (tests). */
  isShut(k: number): boolean {
    return this.shut[k] === 1;
  }
}
