import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { CamSpace } from '../camSpaces';
import type { SectorBolt, SectorDef } from '../../game/sectors';

/**
 * Thornbeck Mill (piano-escape, `scene: 'piano'`): a storm grain mill in Hollowmere, the setting of the piano escape
 * scene (the piano is the music theme only; Player Build's knife gate reads `scene`). Listed in `MAPS` only behind
 * `flags.pianoEscape` (`maps/index.ts`).
 *
 * S1b greybox, built as drawn in `docs/piano-escape/PLAN.md` section 3 and `map-plan.svg` (1 m = 24 px). Frame: x east,
 * z north, y up, metres; the origin is the hall's south-west corner. One hall, 32 x 18 m, a ground floor and one
 * gallery (+4.2 m) along the north wall. A directed path through ten stretches (the plan's table); the hall's middle
 * (the machinery floor) is seen from the path and the gallery but never walked: bin rows and sack walls fence every
 * path space, the gallery rail and the crane-bay bar close its edge, the stair housing has no gap, and no ledge is
 * generated anywhere (`noLedge` on every piece). Windows are glass panes (collision only: bodies stop, light passes);
 * the roof is a closed slab, so the lightning enters only by the windows and the board gaps (SO5).
 * Prototype: no polish, no tuning.
 */

/** Gallery deck height (top of the slab, m) and its slab thickness. */
export const DECK_Y = 4.2;
const DECK_T = 0.3;
/** Hall wall height (m) and its flat roof slab (deviation from the plan's 12 m ridge: a closed roof is what the light needs). */
const WALL_H = 9;
const ROOF_T = 0.4;
/** Hall wall thickness, outside the 32 x 18 m plan box. */
const WT = 0.4;
/** A thin guard rail: 1.1 m, 0.1 deep (the traversal probe misses a top this thin: no vault, no mantle). */
const RAIL_H = 1.1;
const RAIL_T = 0.1;

const TIMBER = '#6d4c2a';
const PLANK = '#8a6a45';
const WALL = '#5a4636';
const FLOOR = '#4b4137';
const SACK = '#ddc29f';
const STEEL = '#8d9296';
const DARK = '#2c3033';
const ROOF = '#2d2a28';

/** The path spaces of the plan (x0, z0, x1, z1), ground floor. Everything else on the ground floor is the machinery floor. */
export const THORNBECK_SPACES = {
  startBay: [0, 0, 9.4, 10.4],
  aisle: [9.4, 0, 20, 4],
  millBay: [20, 0, 26, 8],
  sackBay: [16, 8, 26, 13],
  office: [26, 6, 32, 13],
  lobby: [26, 13, 32, 18],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Small pockets that belong to a path space (the aisle's corner notch, the mill bay's bin-row niche, the stair foot). */
export const THORNBECK_NOOKS: readonly (readonly [number, number, number, number])[] = [
  [9.4, 4, 10.6, 5.2],
  [18.8, 6.6, 20, 8],
  [8.2, 10.4, 9.4, 15],
];

/** The gallery deck (+4.2 m) and the hoist platform outside the west gable (same height). */
export const THORNBECK_DECK = [0, 15, 32, 18] as const;
export const THORNBECK_PLATFORM = [-2.6, 15, 0, 18] as const;

/** The hoist door (west gable, locked until every guard is down; the scene opens it) and the stair's foot gate. */
export const THORNBECK_HOIST_DOOR = { x: -0.2, z: 16.6, y: DECK_Y, width: 1.6 } as const;
export const THORNBECK_STAIR_GATE = { x: 8.8, z: 10.4, width: 1.2 } as const;

/** Ladder L1 (lobby, through the deck hatch) and the hatch hole in the deck. */
export const THORNBECK_LADDER = { x: 31.2, z: 15.6 } as const;
const HATCH = { x0: 30.8, x1: 31.6, z0: 15.2, z1: 16.0 } as const;

/** The scene's one section (start, exit zone and lines; the guards come in the guard step). */
export const THORNBECK_SECTORS: readonly SectorDef[] = [
  {
    id: 'thornbeckMill',
    name: 'Thornbeck Mill',
    // behind W1, backs to the bins, facing west (PLAN section 3 "Start / checkpoint": one checkpoint, the start)
    start: { x: 4.0, y: 0, z: 4.6, yaw: -Math.PI / 2 },
    start2: { x: 4.0, y: 0, z: 6.0, yaw: -Math.PI / 2 },
    objective: { kind: 'clear', label: 'Take down every guard. Then get out.', x: 0, y: 0, z: 0, yaw: 0 },
    // the hoist platform outside the west gable (svg: x -2.4..0, z 15.5..17.7), on the gallery's level
    extract: { label: 'Get out', box: [-2.4, 15.5, 0, 17.7], floorY: DECK_Y },
    guards: [],
    reinforce: [],
    perStage: 0,
    routes: [{ name: 'placeholder', pts: [[0, 0], [10, 0]], obj: 0 }],
  },
];

/** The stair gate is a team door bolted from the gallery side (north): it opens only from the stair head (PLAN section 3). */
export const THORNBECK_BOLTS: readonly SectorBolt[] = [{ at: [THORNBECK_STAIR_GATE.x, THORNBECK_STAIR_GATE.z], side: [0, 1], w: THORNBECK_STAIR_GATE.width }];

/** Camera spaces (PLAN section 3): tight in the start bay, aisle, office, lobby and on the landing; open over the crane bay. */
export const THORNBECK_CAM_SPACES: readonly CamSpace[] = [
  { box: [0, 0, 9.4, 10.4], size: 'tight' },
  { box: [9.4, 0, 20, 4], size: 'tight' },
  { box: [26, 6, 32, 13], size: 'tight' },
  { box: [26, 13, 32, 18], y: [-1, 3.5], size: 'tight' },
  { box: [0, 15, 7, 18], y: [3.5, 7], size: 'tight' },
  { box: [12, 15, 20, 18], y: [3.5, 7], size: 'open' },
];

/**
 * The 16 lamps and the exit sign (PLAN section 3 "Spaces, levels and lamps"; the svg's yellow dots): caged industrial
 * fittings, all `electric: true` with no switch `group` (nothing turns them off but the EMP: `mainsOff`, #602). They are
 * lit before the EMP (the intro) and dead after it; after that only the guards' torches and the lightning light the mill.
 * [id, x, y, z, space]: ground lamps hang at 4.8 m, gallery lamps at 7.4 m under the roof, the hoist lamp over the door.
 */
export const THORNBECK_LAMPS: readonly (readonly [string, number, number, number, string])[] = [
  ['L1', 2.5, 4.8, 5.0, 'startBay'],
  ['L2', 7.5, 4.8, 1.5, 'startBay'],
  ['L3', 12.0, 4.8, 2.0, 'aisle'],
  ['L4', 17.5, 4.8, 2.0, 'aisle'],
  ['L5', 23.0, 4.8, 2.0, 'millBay'],
  ['L6', 19.0, 4.8, 10.5, 'sackBay'],
  ['L7', 24.0, 4.8, 10.5, 'sackBay'],
  ['L8', 29.0, 4.8, 8.0, 'office'],
  ['L9', 28.5, 4.8, 14.2, 'lobby'],
  ['L10', 11.0, 4.8, 12.5, 'machinery'],
  ['L11', 4.0, 7.4, 17.8, 'gallery'],
  ['L12', 11.0, 7.4, 17.8, 'gallery'],
  ['L13', 17.0, 7.4, 17.8, 'gallery'],
  ['L14', 24.0, 7.4, 17.8, 'gallery'],
  ['L15', 30.0, 7.4, 17.8, 'gallery'],
  ['L16', 0.3, 6.6, 17.6, 'hoist'],
];
/** The exit sign over the hoist door (a small green light; electric like the lamps). */
export const THORNBECK_EXIT_SIGN = { x: 0.2, y: 6.5, z: 15.7 } as const;

/** One lightning strike (the shape of `MapDef.lightning.flashes` in #604 / SO5): `t` s on the scene clock, `peak` 0..1, `len` s. */
export interface ThornbeckFlash {
  t: number;
  peak: number;
  len: number;
}

/** The first strike of each flash time (s after the EMP) and whether it is a double (PLAN section 2b). */
export const THORNBECK_FLASH_TIMES: readonly (readonly [number, boolean])[] = [
  [6, false], [18, false], [30, false], [37, true], [44, false], [51, true], [58, false], [65, true], [73, false], [81, true], [88, false],
];

/** One loop of the music (`loopPeriod()` in `audio/music/scenePiano.ts` = 134.03 - 2 - 41): the lightning's period. */
export const THORNBECK_LIGHTNING_PERIOD = 91.03;

/** 11 times per loop, a double is two entries: 15 entries in all (PLAN section 2b). A single is { t, 1, 0.6 }; a double adds { t + 0.45, 0.8, 0.5 }. */
function lightningFlashes(): ThornbeckFlash[] {
  const out: ThornbeckFlash[] = [];
  for (const [t, dbl] of THORNBECK_FLASH_TIMES) {
    out.push({ t, peak: 1, len: 0.6 });
    if (dbl) out.push({ t: t + 0.45, peak: 0.8, len: 0.5 });
  }
  return out;
}

/**
 * The storm's lightning timetable: t after the EMP press (the scene clock, `world.lightning.t0`), looping every music loop.
 * The `lightning` field is not on this base (#604 / SO5 adds it with this exact shape).
 */
// TODO(#604): set as MapDef.lightning
export const THORNBECK_LIGHTNING: { flashes: readonly ThornbeckFlash[]; period: number } = { flashes: lightningFlashes(), period: THORNBECK_LIGHTNING_PERIOD };

/**
 * Rain on the roof: 6 dB of masking over the whole map halves every guard's hearing reach (PLAN section 2b). On the
 * section it is `noisy: [mapWideNoise('rain', 6)]` once #603 is on master (`mapWideNoise` is not on this base; its radius
 * is infinite, which this base's `validateGuardAi` would reject).
 */
// TODO(#603): noisy: [mapWideNoise('rain', 6)]
export const THORNBECK_RAIN = { id: 'rain', db: 6, label: 'rain' } as const;

interface PieceOpts {
  collide?: boolean;
  visible?: boolean;
}

/** A box by its extents (x0..x1, y0..y1, z0..z1): the pieces are all axis-aligned, and nothing gets a ledge. */
function box(b: LevelBuilder, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, o: PieceOpts = {}): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, o.collide !== false, o.visible !== false);
}

/** An opening in a wall: along-wall extent [a, e], height [y0, y1]; a pane of glass (light passes, bodies stop) or open. */
interface Opening {
  a: number;
  e: number;
  y0: number;
  y1: number;
  pane?: boolean;
}

/**
 * A hall wall with openings. `axis` 'x': runs along x at z in [p0, p1]; 'z': runs along z at x in [p0, p1]. Full-height
 * pieces between the openings, a sill piece below and a head piece above each one, a glass pane in each `pane` opening.
 */
function holedWall(b: LevelBuilder, axis: 'x' | 'z', a0: number, a1: number, p0: number, p1: number, ops: readonly Opening[], color: string): void {
  const put = (s: number, e: number, y0: number, y1: number): void => {
    if (e - s < 1e-6 || y1 - y0 < 1e-6) return;
    if (axis === 'x') box(b, s, e, y0, y1, p0, p1, color);
    else box(b, p0, p1, y0, y1, s, e, color);
  };
  let at = a0;
  for (const o of [...ops].sort((p, q) => p.a - q.a)) {
    put(at, o.a, 0, WALL_H);
    put(o.a, o.e, 0, o.y0);
    put(o.a, o.e, o.y1, WALL_H);
    if (o.pane) {
      const m = (p0 + p1) / 2;
      if (axis === 'x') b.glass(o.a, m, o.e, m, o.y1 - o.y0, o.y0, 'clear');
      else b.glass(m, o.a, m, o.e, o.y1 - o.y0, o.y0, 'clear');
    }
    at = o.e;
  }
  put(at, a1, 0, WALL_H);
}

/** A thin guard rail (RAIL_H over `y`) along x at z, or along z at x. */
function rail(b: LevelBuilder, axis: 'x' | 'z', fixed: number, a0: number, a1: number, y: number): void {
  if (axis === 'x') box(b, a0, a1, y, y + RAIL_H, fixed - RAIL_T / 2, fixed + RAIL_T / 2, STEEL);
  else box(b, fixed - RAIL_T / 2, fixed + RAIL_T / 2, y, y + RAIL_H, a0, a1, STEEL);
}

/** The hall: floor, perimeter, four walls with their windows, board gaps and the hoist doorway, and the closed roof. */
function buildShell(b: LevelBuilder): void {
  // the ground over the whole play area (the hall and the yard round it), then the outer wall
  b.floor(14, 9, 40, 22, FLOOR, 0, 0.4);
  b.perimeter(-6, 34, -2, 20, 14, DARK);
  const x0 = -WT;
  const x1 = 32 + WT;
  // south wall: windows x 2-4, 11-13, 21-23 (sill 1.0, head 3.4)
  holedWall(b, 'x', x0, x1, -WT, 0, [{ a: 2, e: 4, y0: 1, y1: 3.4, pane: true }, { a: 11, e: 13, y0: 1, y1: 3.4, pane: true }, { a: 21, e: 23, y0: 1, y1: 3.4, pane: true }], WALL);
  // north wall: the gallery's windows x 4-6, 13-15, 17-19, 25-27 (1.0 over the deck, 2.4 tall)
  holedWall(b, 'x', x0, x1, 18, 18 + WT, [4, 13, 17, 25].map((a) => ({ a, e: a + 2, y0: DECK_Y + 1, y1: DECK_Y + 3.4, pane: true })), WALL);
  // west gable: a window z 3-5, and the hoist doorway z 15.8-17.4 at gallery level (the wall below it carries the sill)
  holedWall(b, 'z', -WT, 18 + WT, -WT, 0, [{ a: 3, e: 5, y0: 1, y1: 3.4, pane: true }, { a: 15.8, e: 17.4, y0: DECK_Y, y1: DECK_Y + 2.1 }], WALL);
  // east gable: the office window z 8.5-10, and the board gap z 2-3 behind the sealed bin bank (open, 0.4 tall)
  holedWall(b, 'z', -WT, 18 + WT, 32, 32 + WT, [{ a: 2, e: 3, y0: 1.9, y1: 2.3 }, { a: 8.5, e: 10, y0: 1, y1: 2.6, pane: true }], WALL);
  // the roof: one closed slab (overhead, nothing to climb)
  box(b, x0, x1, WALL_H, WALL_H + ROOF_T, -WT, 18 + WT, ROOF);
}

/** The gallery: the deck with its hatch, the rails, the crane-bay bar and chain, the sack stacks, the posts and the hoist platform. */
function buildGallery(b: LevelBuilder): void {
  const top = DECK_Y;
  const bot = DECK_Y - DECK_T;
  // the deck slab, z 15-18, with the ladder hatch cut out (rails round the hatch's two sides)
  box(b, 0, 32, bot, top, 15, HATCH.z0, PLANK);
  box(b, 0, HATCH.x0, bot, top, HATCH.z0, HATCH.z1, PLANK);
  box(b, HATCH.x1, 32, bot, top, HATCH.z0, HATCH.z1, PLANK);
  box(b, 0, 32, bot, top, HATCH.z1, 18, PLANK);
  rail(b, 'z', HATCH.x0 - RAIL_T / 2, HATCH.z0, HATCH.z1, top);
  rail(b, 'z', HATCH.x1 + RAIL_T / 2, HATCH.z0, HATCH.z1, top);
  // the south rail (z 15) with the stair head open (x 8.2-9.4) and the crane bay (x 12-20) closed by the bar below
  rail(b, 'x', 15, 0, 8.1, top);
  rail(b, 'x', 15, 9.5, 12, top);
  rail(b, 'x', 15, 20, 32, top);
  // the crane-bay drop bar and hoist chain: a player collider 2.4 m tall (no jump, no vault); no light shape, so a torch's
  // light passes; the drawn bar and chain are thinner than the light bake's minimum
  box(b, 12, 20, top, top + 2.4, 14.9, 15.1, STEEL, { visible: false });
  box(b, 12, 20, top + 1.0, top + 1.04, 14.98, 15.02, '#8a4b1c', { collide: false });
  b.cylinders.push({ c: [16, top + 2.6, 15], r: 0.02, h: 4.4, color: '#555a5e', collide: false });
  box(b, 11, 21, 8.5, 8.7, 14.8, 15.2, STEEL, { collide: false });
  // sack stacks GS1-GS3 against the north wall (1.2 m: crouch cover)
  box(b, 3, 5.4, top, top + 1.2, 17.6, 18, SACK);
  box(b, 20, 22.4, top, top + 1.2, 17.1, 18, SACK);
  box(b, 26, 28.4, top, top + 1.2, 17.1, 18, SACK);
  // the posts that carry the deck's south edge (on the machinery floor, clear of the path)
  for (const x of [2, 5.5, 11, 16, 21, 24.5]) b.pillar(x, 14.7, 0.15, bot, TIMBER);
  // the hoist platform outside the west gable: deck and three rails (the wall under the doorway is its sill)
  box(b, THORNBECK_PLATFORM[0], -WT, bot, top, 15, 18, PLANK);
  rail(b, 'x', 15, THORNBECK_PLATFORM[0], -WT, top);
  rail(b, 'x', 18, THORNBECK_PLATFORM[0], -WT, top);
  rail(b, 'z', THORNBECK_PLATFORM[0] + RAIL_T / 2, 15, 18, top);
}

/** The main stair (x 8.2-9.4, z 10.4-15, up to the gallery) in a closed housing, with its foot gate and the ladder L1. */
function buildStairAndLadder(b: LevelBuilder): void {
  // 21 steps over 4.6 m (42 degrees: under the controller's 50)
  b.stairs(8.8, 12.7, 1.2, 4.6, DECK_Y, 21, PLANK, 0, 0);
  // the housing: a 0.1 side wall each side (no way off the stair into the machinery floor), and a lintel over the gate
  box(b, 8.1, 8.2, 0, DECK_Y + RAIL_H, 10.4, 15, TIMBER);
  box(b, 9.4, 9.5, 0, DECK_Y + RAIL_H, 10.4, 15, TIMBER);
  box(b, 8.2, 9.4, 2.1, DECK_Y + RAIL_H, 10.3, 10.5, TIMBER);
  // the foot gate: a locked door (bolted from the gallery side, `THORNBECK_BOLTS`)
  b.door(8.2, 0, THORNBECK_STAIR_GATE.z, THORNBECK_STAIR_GATE.width, Math.PI / 2, { height: 2.1, locked: true, breachable: false });
  // ladder L1: up the hatch, facing north; its top lands on the deck at z 16.05
  b.ladder(THORNBECK_LADDER.x, THORNBECK_LADDER.z, 0, DECK_Y, 0);
}

/** The path spaces: bin rows and sack walls that fence them, the office and lobby walls and doors, the cover on the path. */
function buildPath(b: LevelBuilder): void {
  // grain bins W1 (the intro's wall), the bin rows and the sealed bank (2.8 m)
  box(b, 4.5, 6.5, 0, 2.8, 3, 7.5, TIMBER);
  box(b, 9.4, 10.6, 0, 2.8, 5.2, 10.4, TIMBER);
  box(b, 14.8, 16, 0, 2.8, 5.2, 14.2, TIMBER);
  box(b, 18.8, 20, 0, 2.8, 5.2, 6.6, TIMBER);
  box(b, 26, 32, 0, 2.8, 0, 6, TIMBER);
  // sack walls (2.4 m), and the plug that makes the mill bay's niche a niche
  box(b, 0, 8.2, 0, 2.4, 9.2, 10.4, SACK);
  box(b, 10.6, 20, 0, 2.4, 4, 5.2, SACK);
  box(b, 16, 18.8, 0, 2.4, 7.4, 8.6, SACK);
  box(b, 14.8, 26, 0, 2.4, 13, 14.2, SACK);
  box(b, 18.5, 18.8, 0, 2.4, 6.6, 7.4, SACK);
  // the office (x 26-32, z 6-13): a 3.4 m timber box inside the hall; its south side is the bin bank. West door z 11.6-12.8, north door x 29-30.2
  box(b, 26, 26.2, 0, 3.4, 6, 11.6, WALL);
  box(b, 26, 26.2, 2.1, 3.4, 11.6, 12.8, WALL);
  box(b, 26, 29, 0, 3.4, 12.8, 13, WALL);
  box(b, 30.2, 32, 0, 3.4, 12.8, 13, WALL);
  box(b, 29, 30.2, 2.1, 3.4, 12.8, 13, WALL);
  b.door(26.1, 0, 11.6, 1.2, 0, { height: 2.1 });
  b.door(29, 0, 12.9, 1.2, Math.PI / 2, { height: 2.1 });
  // the lobby's timber partition (x 26, z 13-18)
  box(b, 26, 26.2, 0, 3.4, 13, 18, WALL);
  // cover on the path: low sacks 1.2 m (start bay Sa, aisle Sb1 / Sb2, sack bay Sd1-Sd3), the desk 0.9 m
  box(b, 1.5, 3.9, 0, 1.2, 1, 2.2, SACK);
  box(b, 13, 14.2, 0, 1.2, 0.2, 1.2, SACK);
  box(b, 16.5, 17.7, 0, 1.2, 2.6, 3.8, SACK);
  box(b, 17.5, 19.9, 0, 1.2, 11.2, 12.4, SACK);
  box(b, 17.6, 18.8, 0, 1.2, 8.8, 9.6, SACK);
  box(b, 23.6, 24.8, 0, 1.2, 8.6, 9.4, SACK);
  box(b, 28, 30.4, 0, 0.9, 10.6, 11.4, PLANK);
  // roller mill M1 (2.2 m) in the mill bay: cover and the shadow G3 stops in
  box(b, 21.5, 24, 0, 2.2, 3.5, 6, STEEL);
}

/** The machinery floor (off the path, seen from it and from the gallery): the sifter, roller mill R2 and the crane-well hopper. */
function buildMachinery(b: LevelBuilder): void {
  box(b, 1, 7, 0, 3.2, 11.5, 14, STEEL);
  box(b, 11, 14, 0, 2.2, 6, 9.6, STEEL);
  box(b, 11, 14.4, 0, 1.2, 10.8, 14.4, DARK);
}

/** Floors by what is underfoot: boards loud upstairs, spilt grain and sacking quiet below (`carpet`: the quiet surface). */
function buildSurfaces(b: LevelBuilder): void {
  b.surface('wood', 0, 32, 15, 18, DECK_Y);
  b.surface('wood', THORNBECK_PLATFORM[0], THORNBECK_PLATFORM[2], 15, 18, DECK_Y);
  for (const [x0, z0, x1, z1] of Object.values(THORNBECK_SPACES)) b.surface('carpet', x0, x1, z0, z1, 0);
}

/** The lamps: all electric, no switch group, caged boxes; the exit sign is a small green light. */
function buildLamps(b: LevelBuilder): void {
  for (const [, x, y, z] of THORNBECK_LAMPS) {
    b.light({ kind: 'lamp', x, y, z, radius: 9, intensity: 0.6, color: [1, 0.85, 0.6], electric: true, fixture: { sx: 0.35, sy: 0.28, sz: 0.35, oy: 0 } });
  }
  const s = THORNBECK_EXIT_SIGN;
  b.light({ kind: 'lamp', x: s.x, y: s.y, z: s.z, radius: 1.5, intensity: 0.3, color: [0.5, 1, 0.6], electric: true, fixture: { sx: 0.4, sy: 0.2, sz: 0.08, oy: 0 } });
}

/** Every piece is `noLedge`: nothing hangs, climbs or drops anywhere; the low cover is vaulted by the controller as usual. */
function noLedges(b: LevelBuilder): void {
  b.mark(0, { noLedge: true });
}

export const thornbeckMill: MapDef = {
  id: 'thornbeckMill',
  name: 'Thornbeck Mill',
  description: 'A grain mill in a storm, held by a night crew. The lights are about to go.',
  modes: ['sector'],
  scene: 'piano',
  sectors: THORNBECK_SECTORS,
  detail: false,
  navLayers: 5,
  theme: {
    sky: '#05070b',
    horizon: '#0b0f16',
    ground: '#1c1f22',
    fogStart: 20,
    fogEnd: 70,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0,
    // ambient 0: a dark map (below 0.5), so the guards' torch slots exist; the lamps die at the EMP
    ambient: 0,
    lightLevel: 0,
    faction: 'urban',
  },
  build(b: LevelBuilder): MapLayout {
    buildShell(b);
    buildGallery(b);
    buildStairAndLadder(b);
    buildPath(b);
    buildMachinery(b);
    buildSurfaces(b);
    buildLamps(b);
    noLedges(b);
    return {
      playerSpawns: [
        { pos: new Vector3(4.0, 0, 4.6), yaw: -Math.PI / 2 },
        { pos: new Vector3(4.0, 0, 6.0), yaw: -Math.PI / 2 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      // the start bay, the gallery deck and the hoist platform (the door between them is not on the nav grid)
      navSeeds: [new Vector3(4.0, 0, 4.6), new Vector3(20, DECK_Y, 16.5), new Vector3(-1.5, DECK_Y, 16.6)],
      camSpaces: [...THORNBECK_CAM_SPACES],
    };
  },
};
