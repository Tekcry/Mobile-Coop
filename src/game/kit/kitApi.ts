/**
 * (coop-kit K0) The kit API the part 2 moves (Deadweight K1, Drop Catch K2, Chimney Pair K3, Swing Pass K4, Plank Bridge
 * K5a / K5b) and the map sets share (PLAN "The Marlow API"). Marlow Build (and Campaign Build for Tallow Wharf C4) get
 * three things per move:
 * 1. the id: the `kitMoves` flag id = `StationDef.kit` = `KitKind` (`deadweight`, `dropCatch`, `chimneyPair`,
 *    `swingPass`, `plankBridge`);
 * 2. the spot: `addKitSpot(b.anchors, spot)` in the set file at the station, as `addShutterSpec` (`shutter.ts`). A spot
 *    is inert while its id is off (no offer, no device change), so a set places it unconditionally;
 * 3. the done call: `GameMode.onKitDone(kind, spot, a, b)` on the host, once per completed move (`kitDone` below).
 * On the wire a part 2 request's `target` is a spot index into the host's `TeamController.devices.list` (-1 none: a
 * free move); both pages list the devices in the same order (same level, same registration order).
 * Pure and Babylon-free (type imports only). Hot paths allocate nothing; `kitSpotsOf` with a kind filters (level load).
 */
import type { KitKind } from '../teamMoves';

/** A kit spot a map set places for a move. The fields each move reads are in its file's header (PLAN Design). */
export interface KitSpot {
  /** Unique in the level: the set's station id (e.g. `a4-deadweight`). */
  readonly id: string;
  readonly kind: KitKind;
  /** The use point (feet) and the facing across the move (rad). */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /** Width (a shaft, a gap, a board's length) and height (m), as the move reads them. */
  readonly w?: number;
  readonly h?: number;
  /** A second point (a far chain, an exit side, a far floor), as the move reads it. */
  readonly x2?: number;
  readonly y2?: number;
  readonly z2?: number;
  /** A door the move drives (Deadweight's grate). */
  readonly door?: string;
}

// ---- level data: the spots ride on the level's anchors object (as the shutter specs; no BuiltLevel field) ----

const SPOTS = new WeakMap<object, KitSpot[]>();
const NO_SPOTS: readonly KitSpot[] = [];

/** Record a kit spot on a level (`key` = the LevelBuilder's `anchors`, which the built level keeps). */
export function addKitSpot(key: object, spot: KitSpot): void {
  let l = SPOTS.get(key);
  if (!l) SPOTS.set(key, (l = []));
  l.push(spot);
}

/** The kit spots of a built level (`{ anchors }`), all or one kind's (a new list: level load only); none = []. */
export function kitSpotsOf(level: unknown, kind?: KitKind): readonly KitSpot[] {
  const a = level && typeof level === 'object' ? (level as { anchors?: unknown }).anchors : undefined;
  const all = a && typeof a === 'object' ? (SPOTS.get(a) ?? NO_SPOTS) : NO_SPOTS;
  return kind === undefined || all.length === 0 ? all : all.filter((s) => s.kind === kind);
}

/** The wire's spot index of device `id` in a controller's kit device list (-1 none). No allocation. */
export function kitSpotIndex(list: readonly { readonly id: string }[], id: string): number {
  for (let i = 0; i < list.length; i++) if (list[i]!.id === id) return i;
  return -1;
}

// ---- the host's pair rule per move ----

/** A paired part 2 move's host pair: how long it may last (s from the start) and which side sends the success end. */
export interface KitPairRule {
  readonly pairS: number;
  readonly doneBy: 'a' | 'b';
}

/** Filled by each move file at load (as `KIT_CHECKS`); `kitNet` reads it (none: the shutter's time, side `a`). */
export const KIT_PAIR: Partial<Record<KitKind, KitPairRule>> = {};

// ---- the done call ----

/** The `GameMode` hook (`gameMode.ts` `onKitDone`). */
export interface KitDoneMode {
  onKitDone?(kind: KitKind, spot: string, a: string | undefined, b: string | undefined): void;
}

/** What `kitDone` reads of the game: a co-op client is a `puppet` (the host's mode decides). */
export interface KitDoneGame {
  readonly puppet?: boolean;
  readonly mode: KitDoneMode | null;
}

/**
 * Host only: a kit move completed at spot `spot` ('' a free move away from any spot) by players `a` and `b` (undefined
 * = the host's own player, as `onTeamMove`). Tells the mode; a no-op on a co-op client page. True when it was told.
 */
export function kitDone(g: KitDoneGame, kind: KitKind, spot: string, a: string | undefined, b: string | undefined): boolean {
  if (g.puppet) return false;
  const m = g.mode;
  if (!m || !m.onKitDone) return false;
  m.onKitDone(kind, spot, a, b);
  return true;
}
