import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { CamSpace } from '../camSpaces';
import type { RoutePt, SectorBolt, SectorDef, SectorGuard } from '../../game/sectors';
import type { LightningData } from '../lightning';
import { mapWideNoise } from '../../ai/hearing';

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
  [8.2, 10.2, 9.4, 15],
];

/** The gallery deck (+4.2 m) and the hoist platform outside the west gable (same height). */
export const THORNBECK_DECK = [0, 15, 32, 18] as const;
export const THORNBECK_PLATFORM = [-2.6, 15, 0, 18] as const;

/** The hoist door (west gable, locked until every guard is down; the scene opens it) and the stair's foot gate. */
export const THORNBECK_HOIST_DOOR = { x: -0.2, z: 16.6, y: DECK_Y, width: 1.6 } as const;
export const THORNBECK_STAIR_GATE = { x: 8.8, z: 10.2, width: 1.2 } as const;

/** Ladder L1 (lobby, through the deck hatch) and the hatch hole in the deck. */
export const THORNBECK_LADDER = { x: 31.2, z: 15.6 } as const;
const HATCH = { x0: 30.8, x1: 31.6, z0: 15.2, z1: 16.0 } as const;

const PI = Math.PI;
const EAST = PI / 2;
const WEST = -PI / 2;
const SOUTH = PI;

/** The stair gate is a team door bolted from the gallery side (north): it opens only from the stair head (PLAN section 3). */
export const THORNBECK_BOLTS: readonly SectorBolt[] = [{ at: [THORNBECK_STAIR_GATE.x, THORNBECK_STAIR_GATE.z], side: [0, 1], w: THORNBECK_STAIR_GATE.width }];

/** The takedown spots K1-K10 (PLAN section 3: the stretch's kill; K3 and K7 are stretches with no kill). */
export const THORNBECK_KILL_SPOTS = {
  K1: [6.0, 8.4],
  K2: [22.8, 7.0],
  K4: [28.2, 9.9],
  K5: [25.4, 12.2],
  K6: [22.8, 16.2],
  K8: [12.8, 16.1],
  K9: [8.8, 16.9],
  K10: [1.6, 16.5],
} as const satisfies Record<string, readonly [number, number]>;
const K = THORNBECK_KILL_SPOTS;

/** Why the crew is there (design text, a later bark): a security contractor's night crew holds the store tonight. */
const CREW = 'night crew of the security contractor holding the mill in the storm';

/**
 * G4 + G5's lap (GA5 item 2), tuned on GA6b's `sweepPeriod` (0.7 m/s legs plus the calm turns and the slack into each
 * pan stop, plus the waits): equal laps of 50 s (Guard AI's values, checked with `sweepPlan`). 40 s does not fit: G4's
 * lap without its end pause is 46.13 s. G4 a 3.87 s end pause, G5 15.10 s. `G5_START_WAIT`: G5 begins with 6.53 s left
 * of his first pause, so both leave the office door (the 4 s check, K5) together, 23.56 s into the lap, every lap.
 */
export const G4_WAIT = 3.87304378397434;
export const G5_WAIT = 15.09876394543141;
export const G5_START_WAIT = 6.53167578234229;

/**
 * The 12 guards G1-G12 (PLAN section 3 table), in the guard list's order: slots 0-3 are the opening four, G1 and G2 (down
 * the stair) and G3 and G4 (along the aisle). All armed (`grunt`), every one with a fixed route of patrol points (a post
 * is a two-point route on the same spot, panning by `faces`); a route's first point is where he starts or is next to it.
 * Out-and-back sweeps list the way back (the walker loops its points); `waits` 0 passes straight through. Pairs (`pair` =
 * the partner's index, both ways, GA5 item 1): G1 + G2, G8 + G9 and G11 + G12 walk side by side on parallel lanes 1.0 -
 * 1.1 m apart (the same `squad`; GA6 adds the pace and the torch aim); G4 + G5 each walk a 50 s lap (GA5 item 2: per-point
 * `waits`, no `loop`, the scene derives the schedule at 0.7 m/s) and `start` puts their door stops together, 1.2 m apart,
 * every lap. `takedownSpot` is the plan's K spot for the stretch. Every start and route point is 0.5 m clear of a collider,
 * except the G1 + G2 lanes (0.3 m: GA5 item 5, PB4's 1 - 1.5 m for the paired kill).
 */
export const THORNBECK_GUARDS: SectorGuard[] = [
  // G1 + G2 (slots 0, 1): came down the stair; the only ones who search round W1 (Q2); after it, side by side north of W1
  { kind: 'grunt', x: 7.5, z: 8.9, yaw: WEST, route: [[8.6, 8.9], [3.5, 8.9]], waits: [4, 4], pair: 1, takedownSpot: [...K.K1], squad: 1, zone: 'startBay', role: 'patrol', reason: CREW },
  { kind: 'grunt', x: 8.3, z: 7.9, yaw: WEST, route: [[8.6, 7.9], [3.5, 7.9]], waits: [4, 4], pair: 0, takedownSpot: [...K.K1], squad: 1, zone: 'startBay', role: 'patrol', reason: CREW },
  // G3 (slot 2): came along the aisle; the aisle east to the mill bay, a 6 s pan in the roller mill's shadow, back
  { kind: 'grunt', x: 9.0, z: 2.0, yaw: EAST, route: [[9.5, 2.0], [20.5, 2.0], [20.5, 7.0], [22.8, 7.0], [20.5, 7.0], [20.5, 2.0]], waits: [4, 0, 0, 6, 0, 0], takedownSpot: [...K.K2], squad: 2, zone: 'aisle', role: 'patrol', reason: CREW },
  // G4 (slot 3) + G5: the sack bay's two sweeps, one 50 s lap each (`sweepPeriod`, see G4_WAIT); they meet at the office
  // door for a 4 s check (K5): `start` sets G5's first pause so both leave the door together (GA5 item 3)
  { kind: 'grunt', x: 10.0, z: 3.4, yaw: 0.8, route: [[17, 10.2], [25.2, 10.2], [25.2, 12.2], [25.2, 10.2]], waits: [G4_WAIT, 0, 4, 0], faces: [EAST, 0, EAST, WEST], start: { idx: 0, wait: 0 }, pair: 4, takedownSpot: [...K.K5], squad: 3, zone: 'sackBay', role: 'patrol', reason: CREW },
  { kind: 'grunt', x: 20.8, z: 9.0, yaw: 0, route: [[20.8, 8.6], [20.8, 12.2], [24.0, 12.2], [20.8, 12.2]], waits: [G5_WAIT, 0, 4, 0], faces: [0, EAST, EAST, SOUTH], start: { idx: 0, wait: G5_START_WAIT }, pair: 3, takedownSpot: [...K.K5], squad: 3, zone: 'sackBay', role: 'patrol', reason: CREW },
  // G6: the office post at the desk; the torch pans the east window and the west door, 8 s each way
  { kind: 'grunt', x: 29.0, z: 9.9, yaw: EAST, route: [[29.0, 9.9], [29.0, 9.9]], waits: [8, 8], faces: [EAST, -0.92], takedownSpot: [...K.K4], squad: 4, zone: 'office', role: 'post', reason: CREW },
  // G7: the east gallery, from the hatch end west to sack stack GS2, a 6 s pan there
  { kind: 'grunt', x: 28.8, z: 16.2, y: DECK_Y, yaw: WEST, route: [[28.8, 16.2], [22.6, 16.2]], waits: [3, 6], takedownSpot: [...K.K6], squad: 5, zone: 'eastGallery', role: 'patrol', reason: CREW },
  // G8 + G9: the pair along the crane bay, side by side, torches panning down into the crane well (G8 on z 15.6, not the
  // review's 15.5: the drop bar's face is z 15.1 and the 0.5 m clearance holds; the lanes are 1.0 m apart)
  { kind: 'grunt', x: 12.5, z: 15.6, y: DECK_Y, yaw: EAST, route: [[12.5, 15.6], [21.4, 15.6]], waits: [4, 4], pair: 8, takedownSpot: [...K.K8], squad: 6, zone: 'craneBay', role: 'patrol', reason: CREW },
  { kind: 'grunt', x: 12.5, z: 16.6, y: DECK_Y, yaw: EAST, route: [[12.5, 16.6], [21.4, 16.6]], waits: [4, 4], pair: 7, takedownSpot: [...K.K8], squad: 6, zone: 'craneBay', role: 'patrol', reason: CREW },
  // G10: the post at the stair head, facing south, the torch panning down into the hall
  { kind: 'grunt', x: 8.8, z: 16.2, y: DECK_Y, yaw: SOUTH, route: [[8.8, 16.2], [8.8, 16.2]], waits: [6, 6], faces: [SOUTH - 0.5, SOUTH + 0.5], takedownSpot: [...K.K9], squad: 7, zone: 'stairHead', role: 'post', reason: CREW },
  // G11 + G12: the exit pair on the hoist landing, side by side, 5 s at each end
  { kind: 'grunt', x: 1.5, z: 15.9, y: DECK_Y, yaw: EAST, route: [[1.5, 15.9], [5.5, 15.9]], waits: [5, 5], pair: 11, takedownSpot: [...K.K10], squad: 8, zone: 'landing', role: 'patrol', reason: CREW },
  { kind: 'grunt', x: 1.5, z: 17.0, y: DECK_Y, yaw: EAST, route: [[1.5, 17.0], [5.5, 17.0]], waits: [5, 5], pair: 10, takedownSpot: [...K.K10], squad: 8, zone: 'landing', role: 'patrol', reason: CREW },
];

/** G1-G12 by list index (the tags the plan, the report and the tests use). */
export const THORNBECK_GUARD_TAGS: readonly string[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'];

/** A tagged extra: the plan's G13-G16 (up to 16 guards if SO3's torch check allows), with the stretch they change. */
export interface ThornbeckExtraGuard {
  tag: 'G13' | 'G14' | 'G15' | 'G16';
  stretch: number;
  guard: SectorGuard;
}

/**
 * The tagged extras G13-G16 (PLAN section 3 "Up to 16"), not in the section's list: the lead adds them when the torch check
 * allows 16 (`THORNBECK_GUARDS_16`). G13 a second office post (stretch 4 becomes two solo kills); G14 a second stalked
 * guard behind G7 (stretch 6); G15 + G16 a pair at the stair head (stretch 9 becomes a co-op kill). Positions are mine:
 * the plan gives none. G15 + G16 name each other by their index in `THORNBECK_GUARDS_16` (14, 15; GA5 item 6).
 */
export const THORNBECK_EXTRA_GUARDS: readonly ThornbeckExtraGuard[] = [
  { tag: 'G13', stretch: 4, guard: { kind: 'grunt', x: 30.6, z: 7.2, yaw: 0, route: [[30.6, 7.2], [30.6, 7.2]], waits: [6, 6], faces: [-0.6, 0.4], takedownSpot: [30.6, 6.6], squad: 4, zone: 'office', role: 'post', reason: CREW } },
  { tag: 'G14', stretch: 6, guard: { kind: 'grunt', x: 30.0, z: 16.2, y: DECK_Y, yaw: WEST, route: [[30.0, 16.2], [24.4, 16.2]], waits: [3, 5], takedownSpot: [24.6, 16.2], squad: 5, zone: 'eastGallery', role: 'patrol', reason: CREW } },
  { tag: 'G15', stretch: 9, guard: { kind: 'grunt', x: 10.6, z: 16.3, y: DECK_Y, yaw: WEST, route: [[10.6, 16.3], [10.6, 16.3]], waits: [6, 6], faces: [WEST - 0.4, WEST + 0.4], pair: 15, takedownSpot: [11.4, 16.65], squad: 9, zone: 'stairHead', role: 'post', reason: CREW } },
  { tag: 'G16', stretch: 9, guard: { kind: 'grunt', x: 10.6, z: 17.0, y: DECK_Y, yaw: WEST, route: [[10.6, 17.0], [10.6, 17.0]], waits: [6, 6], faces: [WEST + 0.4, WEST - 0.4], pair: 14, takedownSpot: [11.4, 16.65], squad: 9, zone: 'stairHead', role: 'post', reason: CREW } },
];

/** All 16 (G1-G12, then G13-G16), for when the torch check allows 16. */
export const THORNBECK_GUARDS_16: SectorGuard[] = [...THORNBECK_GUARDS, ...THORNBECK_EXTRA_GUARDS.map((e) => e.guard)];

/** The path through the ten stretches, in order (the plan's green line; every stop is walkable on the nav grid). */
export interface PathStop {
  name: string;
  stretch: number;
  pt: RoutePt;
}
export const THORNBECK_PATH: readonly PathStop[] = [
  { name: 'start', stretch: 1, pt: [4.0, 4.6] },
  { name: 'K1', stretch: 1, pt: K.K1 },
  { name: 'aisle west', stretch: 2, pt: [9.0, 2.5] },
  { name: 'aisle east', stretch: 2, pt: [19.5, 2.5] },
  { name: 'K2', stretch: 2, pt: K.K2 },
  { name: 'sack bay', stretch: 3, pt: [22.5, 10.5] },
  { name: 'office door', stretch: 3, pt: [25.6, 12.2] },
  { name: 'K4', stretch: 4, pt: K.K4 },
  { name: 'K5, inside the door', stretch: 5, pt: [27.0, 12.2] },
  { name: 'office north door', stretch: 5, pt: [29.6, 13.4] },
  { name: 'lobby', stretch: 6, pt: [30.0, 14.4] },
  { name: 'ladder foot', stretch: 6, pt: [31.2, 14.8] },
  { name: 'deck, top of the ladder', stretch: 6, pt: [31.2, 16.4, DECK_Y] },
  { name: 'K6', stretch: 6, pt: [K.K6[0], K.K6[1], DECK_Y] },
  { name: 'behind GS2', stretch: 7, pt: [22.8, 17.3, DECK_Y] },
  { name: 'K8', stretch: 8, pt: [K.K8[0], K.K8[1], DECK_Y] },
  { name: 'K9', stretch: 9, pt: [K.K9[0], K.K9[1], DECK_Y] },
  { name: 'K10', stretch: 10, pt: [K.K10[0], K.K10[1], DECK_Y] },
  { name: 'hoist door, inside', stretch: 10, pt: [1.0, 16.6, DECK_Y] },
  { name: 'hoist platform', stretch: 10, pt: [-1.3, 16.6, DECK_Y] },
];

/** The scene's one section: the start, the `clear` objective, the exit zone on the hoist platform, 12 guards, the stair gate bolt. */
export const THORNBECK_SECTORS: readonly SectorDef[] = [
  {
    id: 'thornbeckMill',
    name: 'Thornbeck Mill',
    // behind W1, backs to the bins, facing west (PLAN section 3 "Start / checkpoint": one checkpoint, the start)
    start: { x: 4.0, y: 0, z: 4.6, yaw: WEST },
    start2: { x: 4.0, y: 0, z: 6.0, yaw: WEST },
    objective: { kind: 'clear', label: 'Take down every guard. Then get out.', x: 0, y: 0, z: 0, yaw: 0 },
    // the hoist platform outside the west gable (svg: x -2.4..0, z 15.5..17.7), on the gallery's level
    extract: { label: 'Get out', box: [-2.4, 15.5, 0, 17.7], floorY: DECK_Y },
    guards: THORNBECK_GUARDS,
    reinforce: [],
    // rain on the roof over the whole mill (PLAN section 2b, THORNBECK_RAIN): 6 dB halves every guard's hearing reach
    noisy: [mapWideNoise('rain', 6)],
    bolts: THORNBECK_BOLTS,
    perStage: 0,
    // the one directed path; the ladder leg (ladder foot -> deck) is a climb
    routes: [{ name: 'The directed path', pts: THORNBECK_PATH.map((s) => s.pt), obj: 17, climbs: [11] }],
  },
];

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

/** One lightning strike (`MapDef.lightning.flashes`, SO5's `Flash`): `t` s on the scene clock, `peak` 0..1, `len` s. */
export interface ThornbeckFlash {
  t: number;
  peak: number;
  len: number;
}

/**
 * The first strike of each flash time (t s after the EMP press = the mission track's time) and whether it is a double.
 * The mission track is "Suspense Thriller" (Alex Grohl, 162.04 s) from 0 at the EMP; the doubles fall on its six section
 * changes (36.68, 49.48, 71.88, 97.48, 110.28, 123.08 s), the singles between them (PLAN section 2b, re-timed).
 */
export const THORNBECK_FLASH_TIMES: readonly (readonly [number, boolean])[] = [
  [6, false], [18, false], [28, false], [36.68, true], [43, false], [49.48, true], [58, false], [64, false], [71.88, true], [80, false],
  [89, false], [97.48, true], [104, false], [110.28, true], [116, false], [123.08, true], [131, false], [148, false],
];

/** One loop of the mission track (162.04 s whole, a 2 s cross-fade: 160.04 s): the lightning's period. S5b's `missionLoopPeriod`. */
export const THORNBECK_LIGHTNING_PERIOD = 160.04;

/** 18 times per loop, a double is two entries: 24 entries in all (PLAN section 2b). A single is { t, 1, 0.6 }; a double adds { t + 0.45, 0.8, 0.5 }. */
function lightningFlashes(): ThornbeckFlash[] {
  const out: ThornbeckFlash[] = [];
  for (const [t, dbl] of THORNBECK_FLASH_TIMES) {
    out.push({ t, peak: 1, len: 0.6 });
    if (dbl) out.push({ t: t + 0.45, peak: 0.8, len: 0.5 });
  }
  return out;
}

/** (SO5b ask) One opening the lightning comes through: centre (x, y, z) on the wall's inner face, width / height, inward unit normal. */
export interface ThornbeckOpening {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  nx: number;
  nz: number;
}

/**
 * Every window and board gap of `buildShell`, the same holes: south windows (sill 1.0, head 3.4), north gallery windows
 * (deck + 1.0 to + 3.4), the west window, the east office window (1.0-2.6) and the east board gap (1.9-2.3). The hoist
 * doorway is left out: its door is shut until the end, so no flash comes through it.
 */
export const THORNBECK_OPENINGS: readonly ThornbeckOpening[] = [
  ...[3, 12, 22].map((x) => ({ x, y: 2.2, z: 0, w: 2, h: 2.4, nx: 0, nz: 1 })),
  ...[5, 14, 18, 26].map((x) => ({ x, y: DECK_Y + 2.2, z: 18, w: 2, h: 2.4, nx: 0, nz: -1 })),
  { x: 0, y: 2.2, z: 4, w: 2, h: 2.4, nx: 1, nz: 0 },
  { x: 32, y: 1.8, z: 9.25, w: 1.5, h: 1.6, nx: -1, nz: 0 },
  { x: 32, y: 2.1, z: 2.5, w: 1, h: 0.4, nx: -1, nz: 0 },
];

/**
 * The storm's lightning timetable: t after the EMP press (the scene clock, `world.lightning.t0`), looping every mission-track loop (160.04 s),
 * and the openings it comes through (SO5b). It is the map's `lightning` (SO5's `LightningData`; the light itself comes
 * in through the bake's sky visibility, so the openings are data for the look check).
 */
export const THORNBECK_LIGHTNING: LightningData & { flashes: readonly ThornbeckFlash[]; period: number; openings: readonly ThornbeckOpening[] } = {
  flashes: lightningFlashes(),
  period: THORNBECK_LIGHTNING_PERIOD,
  openings: THORNBECK_OPENINGS,
};

/**
 * Rain on the roof: 6 dB of masking over the whole map halves every guard's hearing reach (PLAN section 2b). The
 * section carries it as `noisy: [mapWideNoise('rain', 6)]` (an infinite radius: map-wide, GA7).
 */
export const THORNBECK_RAIN = { id: 'rain', db: 6, label: 'rain' } as const;

/** Where a carried body can be hidden (PLAN section 3 "Hide spots"): [what, x, z, y]. One by every kill spot's stretch. */
export const THORNBECK_HIDE_SPOTS: readonly (readonly [string, number, number, number])[] = [
  ['behind the low sacks Sa, start bay', 2.7, 0.55, 0],
  ['behind Sb2, aisle', 18.3, 3.2, 0],
  ['the bin-row niche, mill bay', 19.4, 7.3, 0],
  ['beside the office desk', 27.2, 10.2, 0],
  ['behind GS2, gallery', 23.0, 17.5, DECK_Y],
  ['behind GS1, gallery', 5.9, 17.5, DECK_Y],
];

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
  // (the outer wall stands 3.6 m off the hall: wider than a split jump reaches, so the yard has no split gap)
  b.floor(15, 9, 42, 26, FLOOR, 0, 0.4);
  b.perimeter(-6, 36, -4, 22, 14, DARK);
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
  // the hoist door: locked until every guard is down (the scene opens it); 1.6 m wide in the west gable at gallery level
  b.door(THORNBECK_HOIST_DOOR.x, top, 15.8, THORNBECK_HOIST_DOOR.width, 0, { height: 2.1, locked: true, breachable: false });
  // the hoist platform outside the west gable: deck and three rails (the wall under the doorway is its sill)
  box(b, THORNBECK_PLATFORM[0], -WT, bot, top, 15, 18, PLANK);
  rail(b, 'x', 15, THORNBECK_PLATFORM[0], -WT, top);
  rail(b, 'x', 18, THORNBECK_PLATFORM[0], -WT, top);
  rail(b, 'z', THORNBECK_PLATFORM[0] + RAIL_T / 2, 15, 18, top);
}

/**
 * The main stair (x 8.2-9.4, z 10.2-15, up to the gallery) in a closed housing, with its foot gate and the ladder L1. The
 * plan draws it from z 10.4; 0.2 m longer keeps a 0.5 m nav cell's rise (0.44) under the guards' step (0.45).
 */
function buildStairAndLadder(b: LevelBuilder): void {
  // 22 steps over 4.8 m (41 degrees: under the controller's 50)
  b.stairs(8.8, 12.6, 1.2, 4.8, DECK_Y, 22, PLANK, 0, 0);
  // the housing: a 0.1 side wall each side (no way off the stair into the machinery floor), and a lintel over the gate
  box(b, 8.1, 8.2, 0, DECK_Y + RAIL_H, 10.2, 15, TIMBER);
  box(b, 9.4, 9.5, 0, DECK_Y + RAIL_H, 10.2, 15, TIMBER);
  box(b, 8.2, 9.4, 2.1, DECK_Y + RAIL_H, 10.1, 10.3, TIMBER);
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
  // (S4) the storm's strikes on the scene clock (t0 = the EMP press: `world.lightning.t0`, set by the scene)
  lightning: THORNBECK_LIGHTNING,
  // (piano SO3) every guard's torch drawn and lit: 16 lit hold on Low (laptop 1080p p95 6.0 ms); shadows on all (default)
  torchSlots: 16,
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
      hideSpots: THORNBECK_HIDE_SPOTS.map(([, x, z, y]) => ({ pos: new Vector3(x, y, z) })),
      // dev teleports: the first stop of each stretch
      debugPoints: Array.from({ length: 10 }, (_, k) => {
        const stop = THORNBECK_PATH.find((q) => q.stretch === k + 1)!;
        return { group: 'Thornbeck Mill', id: `stretch${k + 1}`, label: `Stretch ${k + 1}: ${stop.name}`, pos: new Vector3(stop.pt[0], stop.pt[2] ?? 0, stop.pt[1]), yaw: 0 };
      }),
    };
  },
};
