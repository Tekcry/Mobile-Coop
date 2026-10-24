/**
 * (guard-ai S20, Michael's walk of 4.72 G4: "guards seem to walk through eachother and sometimes doors.") Doors as the
 * guards' walker sees them (pure: no Babylon / DOM), unit-tested (`tests/guardDoors.test.ts`).
 *
 * Cause: guards move on the nav grid (kinematic: no physics body against a door's collider), and the grid is built
 * before the doors are armed, so every doorway is walkable. A guard within `DOOR.enemyReach` of a closed door pushes it
 * open (`Doors.pushOpen`), but `Doors.open` refuses a locked door, so a guard routed through a locked door walked
 * through its leaf; nothing in the walker knew a door was there.
 *
 * Now (A115, A116):
 * - the walker (`Enemy.tryMove`) asks `DoorGate.blocking` before every step: a step into a closed door's leaf (its
 *   collider box grown by his radius `r`) or across it is not taken. A closed door that is not locked is opened the
 *   player's way (`Doors.open(d, 'enemy')`, the same door API: its sound, the guard-opened close behind him and the
 *   co-op door sync stay as they were), and he waits at the leaf until its swing reaches `pass`; a locked door stays
 *   shut and he waits at it, never across (A116: the grid kept every doorway walkable; since guard-ai S28 a locked shut
 *   door is shut on the grid too, `ai/lockedDoors.ts`, so routes go round it and only a stale route or a straight walk
 *   meets one here; the Sector Ops keypad, bolt, lockdown and pair-gate closures are as before).
 * A door counts as closed while it is shut or shutting (`target` 0) or still swinging open below `pass`. A guard already
 * inside a leaf (a door shut on him) may step out, never deeper. Allocation-free after the constructor: typed arrays.
 */
export const DOOR_GATE = {
  /** A guard's body radius against a leaf (m): the nav agent radius (`navBuild.ts`). */
  r: 0.32,
  /** The leaf collider's half thickness (m): `DOOR.thickness` (the box is twice it). */
  half: 0.05,
  /** An opening door is passed once its swing (0..1) is this far (the enemy push swings in `DOOR.enemyTime`). */
  pass: 0.5,
  /** Only doors whose floor is within this of his feet (m). */
  dy: 1.2,
} as const;

/** A door as the gate reads it (`DoorState`): its doorway centre, swing state and anchor. */
export interface GateDoor {
  readonly cx: number;
  readonly cz: number;
  /** 0 closed .. 1 open. */
  readonly open: number;
  /** 0 shut / shutting, 1 open / opening. */
  readonly target: number;
  readonly anchor: { readonly yaw: number; readonly width: number; readonly locked: boolean; readonly hinge: { readonly y: number } };
}

/** The door is shut to a walker: shut or shutting, or opening but not yet `pass` open. */
export function doorShut(d: GateDoor): boolean {
  return d.target === 0 || d.open < DOOR_GATE.pass;
}

export class DoorGate {
  readonly n: number;
  private readonly sin: Float64Array;
  private readonly cos: Float64Array;
  private readonly halfW: Float64Array;
  /** Plan distance from the centre past which a door is skipped (m). */
  private readonly far: Float64Array;

  constructor(readonly doors: readonly GateDoor[]) {
    const n = doors.length;
    this.n = n;
    this.sin = new Float64Array(n);
    this.cos = new Float64Array(n);
    this.halfW = new Float64Array(n);
    this.far = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const a = doors[k]!.anchor;
      this.sin[k] = Math.sin(a.yaw);
      this.cos[k] = Math.cos(a.yaw);
      this.halfW[k] = a.width * 0.5;
      this.far[k] = a.width * 0.5 + DOOR_GATE.r + 1;
    }
  }

  /**
   * The index of a shut door whose leaf the step (x0, z0) -> (x1, z1) at feet height y enters, goes deeper into or
   * crosses; -1 when the step is clear. Allocation-free.
   */
  blocking(x0: number, z0: number, x1: number, z1: number, y: number): number {
    const G = DOOR_GATE;
    const depth = G.half + G.r;
    for (let k = 0; k < this.n; k++) {
      const d = this.doors[k]!;
      const ex = x1 - d.cx;
      const ez = z1 - d.cz;
      if (ex > this.far[k]! || ex < -this.far[k]! || ez > this.far[k]! || ez < -this.far[k]!) continue;
      if (Math.abs(d.anchor.hinge.y - y) > G.dy || !doorShut(d)) continue;
      const s = this.sin[k]!;
      const c = this.cos[k]!;
      const span = this.halfW[k]! + G.r;
      // along the leaf (sin, cos) and across it (cos, -sin), at the step's end and start
      const al1 = ex * s + ez * c;
      const ac1 = ex * c - ez * s;
      const sx = x0 - d.cx;
      const sz = z0 - d.cz;
      const al0 = sx * s + sz * c;
      const ac0 = sx * c - sz * s;
      const in1 = Math.abs(ac1) < depth && Math.abs(al1) < span;
      if (in1) {
        const in0 = Math.abs(ac0) < depth && Math.abs(al0) < span;
        // already in the leaf (shut on him): out or along, never deeper
        if (!in0 || Math.abs(ac1) < Math.abs(ac0) - 1e-9) return k;
        continue;
      }
      // a long step across the leaf's plane within its span
      if ((ac0 > 0) !== (ac1 > 0) && ac0 !== ac1) {
        const t = ac0 / (ac0 - ac1);
        const al = al0 + (al1 - al0) * t;
        if (Math.abs(al) < span) return k;
      }
    }
    return -1;
  }
}
