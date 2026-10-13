/**
 * ON5 catalogue (pure data, Babylon-free): the climb pieces and exterior features of the Climb tab, and the floor
 * finishes (re-exported from the walk test's copy). Michael adds or changes climb pieces here only. Sizes are not typed here: they are facts in
 * scripts/kestrel/facts.json (group `climb`, plus `duct`, `stair` and `reach`), each with its source.
 *
 * `move` is the engine's own move for the piece, typed as an `AnchorKind` (src/world/anchors.ts:
 * `export type AnchorKind = 'ladder' | 'pipeV' | 'pipeH' | 'ledge' | 'duct' | ... | 'fence'`), each also a `MOVE_MODES`
 * entry (src/player/moveState.ts: 'pipeV', 'pipeH', 'ledge', 'duct', 'fence'; tests/editor/climb.test.ts checks both).
 * `null` is a piece the engine has no climbing move for: a stair is walked, a lamp post is "not in the game yet".
 */
import type { AnchorKind } from '../world/anchors';

export type ExtKind = 'downpipe' | 'pipe' | 'ledge' | 'sill' | 'parapet' | 'vent' | 'duct' | 'fire-escape' | 'lamp-post' | 'fence';

/**
 * How the piece goes in (decision 8): `wallPoint` backs onto a wall face at the dot (as an ON4 wall-mounted object);
 * `draw` is two points (A at the start, A at the end); `point` stands at the dot; `window` sits on the window nearest
 * the dot; `wallTop` runs along the top of the wall nearest the dot.
 */
export type Place = 'wallPoint' | 'draw' | 'point' | 'window' | 'wallTop';

export interface ClimbPiece {
  id: ExtKind;
  name: string;
  place: Place;
  /** The engine's move (an AnchorKind that is also a MOVE_MODES entry), or null (none in the game). */
  move: AnchorKind | null;
  /** One line for the tile. */
  desc: string;
  src: string;
}

export const CLIMB_PIECES: readonly ClimbPiece[] = [
  { id: 'downpipe', name: 'Downpipe', place: 'wallPoint', move: 'pipeV', desc: 'A on a wall face: ground to the wall top', src: 'ON5 brief decision 1; LevelBuilder.pipeV (F12)' },
  { id: 'pipe', name: 'Horizontal pipe', place: 'draw', move: 'pipeH', desc: 'A at the start, A at the end', src: 'ON5 brief decision 1; LevelBuilder.pipeH (F12)' },
  { id: 'ledge', name: 'Ledge or string course', place: 'draw', move: 'ledge', desc: 'Along a wall face: A, A', src: 'ON5 brief decision 1; ledges from box tops (F09)' },
  { id: 'sill', name: 'Window sill', place: 'window', move: 'ledge', desc: 'A on a window', src: 'ON5 brief decision 1; ledges from box tops (F09)' },
  { id: 'parapet', name: 'Parapet coping', place: 'wallTop', move: 'ledge', desc: 'A on a wall: along its top', src: 'ON5 brief decision 1; ledges from box tops (F09)' },
  { id: 'vent', name: 'Vent grille', place: 'wallPoint', move: 'duct', desc: 'A on a wall face; a duct starts here', src: 'ON5 brief decision 1; duct grates (src/world/anchors.ts Grate)' },
  { id: 'duct', name: 'Duct crawl', place: 'draw', move: 'duct', desc: 'From one vent to another: A, A', src: 'ON5 brief decision 1; crouch duct 1.5 x 1.2 (F32)' },
  { id: 'fire-escape', name: 'Fire escape stair', place: 'draw', move: null, desc: 'Outside: A at the foot, A at the top end', src: 'ON5 brief decision 1; stair facts (scale-sheet s3)' },
  { id: 'lamp-post', name: 'Lamp post', place: 'point', move: null, desc: 'A places it (its lamp is a later part)', src: 'ON5 brief decision 1' },
  { id: 'fence', name: 'Chain-link fence', place: 'draw', move: 'fence', desc: 'A at the start, A at the end; climbable', src: 'ON5 brief decision 1; LevelBuilder.fence (F14)' },
];

export const pieceOf = (k: string | undefined): ClimbPiece | undefined => CLIMB_PIECES.find((p) => p.id === k) ?? (k === 'stringcourse' ? CLIMB_PIECES.find((p) => p.id === 'ledge') : undefined);

/** The floor finishes are one catalogue shared with the walk test: src/world/maps/kestrelExterior.ts. */
export { FINISHES, finishOf } from '../world/maps/kestrelExterior';
export type { Finish } from '../world/maps/kestrelExterior';
