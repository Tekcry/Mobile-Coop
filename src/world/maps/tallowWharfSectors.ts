import type { SectorBolt, SectorDef, SectorGuard, SectorIntel, SectorRoute } from '../../game/sectors';
import { hyp2 } from '../../core/mathx';
import { W1 } from './tallowWharfW1';
import { W2, W2_ROTA_DESK } from './tallowWharfW2';
import { W3, W3_KEY_POSTS } from './tallowWharfW3';
import { W4 } from './tallowWharfW4';

/**
 * Tallow Wharf's sector data (mission-framework GB5): the four sections W1-W4 in play order, from the campaign graph
 * (`docs/missions/prototypes/campaign-map/graph.json`) and the briefs (`docs/missions/slices/GB-briefs.md`, "GB5"). Every door
 * centre comes from a section file's `doors` map (never retyped); the guards are the SPEC's space notes. Which guards each
 * mission spawns is `MissionDef.guards` (`tallowWharfMissions.ts`), from `WHARF_GUARD_MISSIONS` here.
 */

const PI = Math.PI;

/** A door's plan centre [x, z] from a section's `doors` entry [x, y, z]. */
const at2 = (d: readonly [number, number, number]): [number, number] => [d[0], d[2]];

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** A guard's takedown spot: 1.5 m behind him (against his facing). */
function behind(x: number, z: number, yaw: number): [number, number] {
  return [r2(x - Math.sin(yaw) * 1.5), r2(z - Math.cos(yaw) * 1.5)];
}

/** A route guard's takedown spot: 1.5 m from his first point along the route's last leg (back toward where he came from). */
function behindRoute(route: readonly [number, number][]): [number, number] {
  const a = route[0]!;
  const p = route[route.length - 1]!;
  const dx = p[0] - a[0];
  const dz = p[1] - a[1];
  const d = hyp2(dx, dz) || 1;
  return [r2(a[0] + (dx / d) * 1.5), r2(a[1] + (dz / d) * 1.5)];
}

interface Post {
  zone: string;
  role: string;
  reason: string;
  y?: number;
  yaw?: number;
  pair?: number;
  handler?: number;
  info?: SectorGuard['info'];
}

function tags(o: Post): Partial<SectorGuard> {
  const out: Partial<SectorGuard> = { zone: o.zone, role: o.role, reason: o.reason };
  if (o.y !== undefined) out.y = o.y;
  if (o.pair !== undefined) out.pair = o.pair;
  if (o.handler !== undefined) out.handler = o.handler;
  if (o.info) out.info = o.info;
  return out;
}

/** A posted guard: stands his post at (x, z) facing `yaw` (default south, toward the way in). */
function posted(x: number, z: number, o: Post, kind: SectorGuard['kind'] = 'grunt'): SectorGuard {
  const yaw = o.yaw ?? PI;
  return { kind, x, z, yaw, takedownSpot: behind(x, z, yaw), ...tags(o) };
}

/** A route guard: starts at the route's first point and walks it in order (a loop of 3+ points, back and forth on 2). */
function walker(route: [number, number][], o: Post, kind: SectorGuard['kind'] = 'grunt'): SectorGuard {
  const a = route[0]!;
  const b = route[1]!;
  const yaw = o.yaw ?? Math.atan2(b[0] - a[0], b[1] - a[1]);
  return { kind, x: a[0], z: a[1], yaw, route, takedownSpot: behindRoute(route), ...tags(o) };
}

// ---- W1 night market (9) ----
const W1_GUARDS: SectorGuard[] = [
  // 0, 1 the market wardens: two opposed loops through the stalls
  walker([[14, 17], [34, 17], [34, 28], [14, 28]], { zone: 'market', role: 'patrol', reason: 'Market warden on his rounds: the stall rows and the clock end' }),
  walker([[34, 40], [12, 40], [12, 31], [34, 31]], { zone: 'market', role: 'patrol', reason: 'Market warden on the opposite round, covering the fish hall side' }),
  // 2 the lamp trimmer: back and forth along the west side
  walker([[11, 18], [11, 42]], { zone: 'market', role: 'lamp', reason: 'Trims the stall lamps down the west side' }),
  // 3 the warden posted under the fish hall clock
  posted(22, 42.5, { zone: 'clock', role: 'posted', reason: 'Minds the clock and the three couriers waiting under it', yaw: PI }),
  // 4, 5 the talking pair at the scales
  posted(16, 50, { zone: 'scales', role: 'pair', reason: 'Porter at the scales: gossips with his mate while the hall is quiet', pair: 5, yaw: PI / 2 }),
  posted(17.2, 50, { zone: 'scales', role: 'pair', reason: 'Porter at the scales: gossips with his mate while the hall is quiet', pair: 4, yaw: -PI / 2 }),
  // 6 the hall watchman: a loop of the fish hall
  walker([[12, 47], [33, 47], [33, 56.5], [12, 56.5]], { zone: 'fish-hall', role: 'patrol', reason: 'Hall watchman: checks the back door and the scales' }),
  // 7, 8 the tea-stall porters (Three Grey Coats' talkers)
  posted(15, 10, { zone: 'tea-stall', role: 'pair', reason: 'Porter on his tea break by the canal steps: talks about everyone', pair: 8, yaw: PI / 2 }),
  posted(16.2, 10.6, { zone: 'tea-stall', role: 'pair', reason: 'Porter on his tea break by the canal steps: talks about everyone', pair: 7, yaw: -PI / 2 }),
];

// ---- W2 arcade lofts (10) ----
const W2_GUARDS: SectorGuard[] = [
  // 0 the beadle: a loop of the arcade floor
  walker([[42, 50], [74, 50], [74, 57], [42, 57]], { zone: 'arcade', role: 'patrol', reason: 'The arcade beadle: end to end, then back along the shop fronts' }),
  // 1 Pell's man at the stair foot, 2 Pell's man walking the arcade, 3 Pell's minder at the stair head
  posted(55, 60.8, { zone: 'stair-foot', role: 'posted', reason: "Pell's man: keeps the reading-room stair", yaw: PI }),
  walker([[44, 54], [70, 54]], { zone: 'arcade', role: 'patrol', reason: "Pell's man walking the arcade between the two ends" }),
  posted(55.5, 75, { zone: 'stair-head', role: 'posted', reason: "Pell's minder: waits at the head of the stair for the courier", y: 4.5, yaw: PI }),
  // 4 the reading-room keeper, 5 the night reader
  walker([[46, 76], [58, 76], [58, 79], [46, 79]], { zone: 'reading-room', role: 'keeper', reason: 'Keeper of the reading room: puts out the books and checks the shelves', y: 4.5 }),
  posted(47, 78.2, { zone: 'reading-room', role: 'reader', reason: 'Night reader at his desk, nobody he wants to see', y: 4.5, yaw: PI }),
  // 6 Teale (Pell's courier), 7 Fenn and 8 Garrow (the decoys in the same grey coat)
  posted(51, 75.4, { zone: 'tgc-teale', role: 'courier', reason: "Pell's courier: waits at the reading-room table for the hand-off", y: 4.5, yaw: PI, info: { lines: ['Shed three. Candle on the lid.', 'Under the tea.'] } }),
  // Fenn sits with his back to the lit rota desk (the tgc-opt hint): he faces straight away from it
  posted(46, 66, { zone: 'tgc-fenn', role: 'decoy', reason: 'Hired to walk in the same grey coat; knows nothing but his fee', y: 4.5, yaw: Math.atan2(46 - W2_ROTA_DESK[0], 66 - W2_ROTA_DESK[2]), info: { lines: ["I'm paid to walk, that's all.", 'Ask the man with the umbrella.'] } }),
  posted(60, 66, { zone: 'tgc-garrow', role: 'decoy', reason: 'Hired to walk in the same grey coat; waits in the pie shop for his fee', yaw: PI, info: { lines: ["Grey coat, yes. It's a uniform tonight.", "I don't know what he carries."] } }),
  // 9 the night clerk (Two-Key Ledger's talker): on his supper break in the pie loft
  posted(60, 66.8, { zone: 'pie-loft', role: 'clerk', reason: 'Night clerk on his supper break: on the telephone with the founding year', y: 4.5, yaw: PI }),
];

// ---- W3 counting house (10) ----
const W3_GUARDS: SectorGuard[] = [
  // 0 the yard watchman, 1 the dog on a running line (handler 0)
  walker([[102, 40], [112, 40], [112, 47], [102, 47]], { zone: 'yard', role: 'patrol', reason: 'Yard watchman: the east yard and the dog line' }),
  walker([[112.5, 46], [115.5, 46]], { zone: 'yard', role: 'dog', reason: "The watchman's dog on a running line by the gate lodge", handler: 0 }, 'dog'),
  // 2 the lodge porter (the Two-Key Ledger twist walker)
  posted(117, 48, { zone: 'w3-lodge-porter', role: 'porter', reason: 'Lodge porter: sleeps in the gate lodge until the bell rings', yaw: PI }),
  // 3, 4 the night clerks in the east wing offices
  posted(110, 57.4, { zone: 'east-wing', role: 'clerk', reason: 'Night clerk at his ledger desk in the east wing', yaw: PI }),
  posted(116, 57.4, { zone: 'east-wing', role: 'clerk', reason: 'Night clerk at his ledger desk in the east wing', yaw: PI }),
  // 5 the porter on rounds, 6 the messenger
  walker([[108, 56], [118, 56], [118, 72], [108, 72]], { zone: 'east-wing', role: 'patrol', reason: 'Porter on rounds: the east wing and the key post' }),
  walker([[108, 68], [100, 68]], { zone: 'front-hall', role: 'messenger', reason: 'Runs messages between the wings' }),
  // 7 the west-wing clerk, 8 the stacks porter, 9 the front-hall watchman
  posted(90, 55.4, { zone: 'west-wing', role: 'clerk', reason: 'Night clerk at the west wing desk', yaw: PI }),
  walker([[83, 68], [85.5, 58], [83, 58]], { zone: 'west-wing', role: 'porter', reason: 'Stacks porter: carries the day books between the shelves' }),
  walker([[99, 68], [90, 66]], { zone: 'front-hall', role: 'watchman', reason: 'Front-hall watchman between the wings' }),
];

// ---- W4 wharf sheds (12) ----
const W4_GUARDS: SectorGuard[] = [
  // shed yard: 0 the yard watchman, 1 the dog handler, 2 the dog (handler 1), 3 the crane watchman, 4, 5 Pell's minders
  walker([[46, 26], [70, 26], [70, 9], [46, 9]], { zone: 'shed-yard', role: 'patrol', reason: 'Yard watchman: the wharf apron and the shed doors' }),
  walker([[50, 20], [66, 20]], { zone: 'shed-yard', role: 'handler', reason: 'Dog handler: walks the yard with his dog' }),
  walker([[51.5, 20.5], [67.5, 20.5]], { zone: 'shed-yard', role: 'dog', reason: "The handler's dog, at his heel along the yard", handler: 1 }, 'dog'),
  posted(60, 13.6, { zone: 'crane', role: 'posted', reason: 'Crane watchman: keeps the yard leg of the crane', yaw: PI }),
  // Pell's minders arrive when Teale misses his check-in: tagged for the mission event, posted at the yard end
  posted(48, 26, { zone: 'tgc-minders', role: 'pair', reason: "Pell's minder, off the launch: waits at the yard end until the twist", pair: 5, yaw: -PI / 2 }),
  posted(49.2, 26, { zone: 'tgc-minders', role: 'pair', reason: "Pell's minder, off the launch: waits at the yard end until the twist", pair: 4, yaw: PI / 2 }),
  // shed three: 6 the tally clerk, 7 the customs locker, 8, 9 the dockers, 10 the hand truck, 11 the foreman
  posted(74, 24, { zone: 'shed-three', role: 'clerk', reason: 'Tally clerk counting the night shipment', yaw: PI }),
  posted(80.8, 11.2, { zone: 'shed-three', role: 'posted', reason: 'Guards the customs locker at the loading door', yaw: 0 }),
  posted(76, 16, { zone: 'shed-three', role: 'pair', reason: 'Docker on a smoke between loads: talks to his mate', pair: 9, yaw: PI / 2 }),
  posted(77.2, 16, { zone: 'shed-three', role: 'pair', reason: 'Docker on a smoke between loads: talks to his mate', pair: 8, yaw: -PI / 2 }),
  walker([[78, 24], [78, 12]], { zone: 'shed-three', role: 'hand-truck', reason: 'Wheels the hand truck between the loading door and the tally desk' }),
  walker([[74, 12], [85, 12], [85, 26], [74, 26]], { zone: 'shed-three', role: 'foreman', reason: 'Foreman on his round of the shed, the dark side aisle included' }),
];

/**
 * The guards the graph does not count (its per-section sums are W1 7, W2 6, W3 10, W4 12) and why: the brief adds them as
 * the talkers and decoys the missions need.
 */
export const WHARF_GUARD_EXTRAS: readonly { id: string; why: string }[] = [
  { id: 'W1:7', why: "tea-stall porter: Three Grey Coats' tgc-tea talker (overheard with his mate)" },
  { id: 'W1:8', why: "tea-stall porter: Three Grey Coats' tgc-tea talker (overheard with his mate)" },
  { id: 'W2:6', why: "Teale, Pell's courier: the interrogation target of tgc-3" },
  { id: 'W2:7', why: 'Fenn, the first decoy of tgc-3' },
  { id: 'W2:8', why: 'Garrow, the second decoy of tgc-3' },
  { id: 'W2:9', why: "the night clerk: Two-Key Ledger's tkl-gate-code talker" },
];

/**
 * Which guards each mission spawns (`MissionDef.guards` reads this): `'all'` = every guard of the section, a list = those
 * indexes, `[]` = none.
 */
export const WHARF_GUARD_MISSIONS: Readonly<Record<'threeGreyCoats' | 'twoKeyLedger', Readonly<Record<string, 'all' | readonly number[]>>>> = {
  threeGreyCoats: { W1: 'all', W2: [0, 1, 2, 3, 4, 5, 6, 7, 8], W3: [], W4: 'all' },
  twoKeyLedger: { W2: [0, 1, 2, 3, 4, 5, 9], W3: 'all', W4: [0, 1, 2, 3, 6, 7, 8, 9, 10, 11] },
};

// ---- bolts, keypad, pair gate (the indexes fix the flags `<id>-bolt<k>`, `-key<k>`, `-gate<k>`) ----
const W1_BOLTS: SectorBolt[] = [
  { at: at2(W1.doors['w1-warden-stair']!), side: [0, 1] },
  { at: at2(W1.doors['w1-hall-back']!), side: [0, 1] },
];
const W2_BOLTS: SectorBolt[] = [
  { at: at2(W2.doors['w2-pawn-stair-top']!), side: [-1, 0] },
  { at: at2(W2.doors['w2-pie-stair-top']!), side: [1, 0] },
  { at: at2(W2.doors['w2-clock-door']!), side: [1, 0] },
  { at: at2(W2.doors['w2-pawn-taking-in']!), side: [0, -1], w: 2.0 },
  { at: at2(W2.doors['w2-pie-taking-in']!), side: [0, -1], w: 2.0 },
];
const W3_BOLTS: SectorBolt[] = [
  { at: at2(W3.doors['w3-chute-hatch']!), side: [0, 1] },
  { at: at2(W3.doors['w3-coalyard-door']!), side: [0, -1] },
  { at: at2(W3.doors['w3-bridge']!), side: [1, 0] },
  // the cart gate's roller leaf beside the wicket (the connector's near door): bolted from the cartway side, so the yard side can
  // never draw it and it cannot bypass the wicket
  { at: at2(W3.doors['w3-conn-roller']!), side: [0, -1] },
];
const W4_BOLTS: SectorBolt[] = [
  { at: at2(W4.doors['w4-shed3-yard']!), side: [1, 0] },
  { at: at2(W4.doors['w4-jetty-gate']!), side: [1, 0] },
];

// ---- intel (lines are at most INTEL_LINE_MAX characters and written to be voiced, G82) ----
const W1_INTEL: SectorIntel[] = [
  { kind: 'overhear', grants: 'tgc-1', line: 'SEXTON: Three grey coats under the clock.', box: [16, 38, 28, 44], hold: 1 },
  { kind: 'board', grants: 'tgc-tally', line: 'Tally book: brass-tag satchel left at nine.', at: [2.5, 4.5, 50.6] },
  { kind: 'overhear', grants: 'tgc-tea', line: "Porter: the flat cap's a hired man, him.", box: [17.5, 6.5, 20, 9], hold: 4, talkers: [7, 8] },
];
const W2_INTEL: SectorIntel[] = [
  { kind: 'board', grants: 'tgc-opt', line: 'Rota: Teale walks Thursdays. Always the umbrella.', at: [...W2_ROTA_DESK] },
  { kind: 'overhear', grants: 'tkl-gate-code', line: "Clerk: east gate's the founding year again.", box: [59.8, 59.3, 62.2, 61.7], floorY: 4.5, hold: 4, talkers: [9] },
];
const W3_INTEL: SectorIntel[] = [
  { kind: 'board', grants: 'tkl-opt', line: 'Day book: Halcyon, paid through the wharf account.', at: [117, 0, 76.5] },
  { kind: 'overhear', grants: 'tkl-4-yard', line: "TALLY: Ledger's out. Cartway's ahead.", box: [83, 41, 97, 51], hold: 1 },
];

// ---- routes (M8: at least 2 per section; `climbs` = the legs the guards' nav does not walk) ----
const W1_ROUTES: SectorRoute[] = [
  {
    name: "Gallery and the warden's hatch",
    pts: [[7, 10], [4, 13.5], [4, 16, 4.5], [4, 44, 4.5], [4, 47.5, 4.5], [3, 50, 4.5], [6, 53, 4.5], [9.5, 53], [22, 56.8], [22, 59.2], [37, 60]],
    obj: 5,
    climbs: [1, 6, 8],
  },
  {
    name: "Stall backs, the market lip and the warden's stair",
    pts: [[7, 10], [9, 15], [12, 27], [6.5, 29], [5, 29, 4.5], [4, 44, 4.5], [4, 47.5, 4.5], [3, 50, 4.5], [7, 51.5, 4.5], [7, 44.6], [7, 43.4], [33, 43.4], [33, 45], [22, 56.8], [22, 59.2], [37, 60]],
    obj: 7,
    climbs: [3, 13],
  },
];
const W2_ROUTES: SectorRoute[] = [
  {
    name: 'West pier and the lofts',
    pts: [[42, 55], [46, 58.5], [46, 60.5, 4.5], [61, 60.5, 4.5], [61, 63, 4.5], [59, 66.5, 4.5], [58.6, 67.8, 4.5], [61, 63, 4.5], [72, 60.5, 4.5], [72, 63, 4.5], [72, 65, 4.5], [72, 66, 8.4], [78.9, 66, 8.4], [83, 66, 8.4]],
    obj: 6,
    climbs: [1, 10, 12],
  },
  {
    name: 'East lip and the corner loft',
    pts: [[42, 55], [73.5, 58.3], [73.5, 60.5, 4.5], [72, 63, 4.5], [69, 66, 4.5], [64, 66, 4.5], [58.6, 67.8, 4.5], [64, 66, 4.5], [72, 65, 4.5], [72, 66, 8.4], [78.9, 66, 8.4], [83, 66, 8.4]],
    obj: 6,
    climbs: [1, 8, 10],
  },
];
const W3_ROUTES: SectorRoute[] = [
  {
    name: 'Bulkhead, passage and the chute',
    pts: [[111.4, 68, 8.4], [113.8, 66, 8.4], [113.8, 60, 0], [111.4, 60], [108, 54], [106.6, 53.75], [101, 53.75], [101, 56.2], [101, 62.5], [101, 53.75], [97.1, 53.2], [97.1, 51, 4.4], [97.1, 49.2], [99.5, 51.2], [90, 46], [90, 38.6], [90, 36]],
    obj: 8,
    climbs: [1, 10, 11],
  },
  {
    name: 'Fire escape and the east gate',
    pts: [[111.4, 68, 8.4], [107, 52.6, 8.4], [101, 50, 4.2], [108.4, 50], [112, 51.2], [112, 53], [108, 54], [106.6, 53.75], [101, 53.75], [101, 56.2], [101, 62.5], [101, 53.75], [97.1, 53.2], [97.1, 51, 4.4], [97.1, 49.2], [99.5, 51.2], [90, 46], [90, 36]],
    obj: 10,
    climbs: [12, 13],
  },
];
const W4_ROUTES: SectorRoute[] = [
  {
    name: 'Clerestory and the loading door',
    pts: [[90, 32], [79, 29.2], [79, 27, 2.0], [79, 24], [75.5, 15], [79, 11], [79, 9], [86.5, 8], [88, 5.6], [88, 3, -1]],
    obj: 4,
    climbs: [1, 2],
  },
  {
    name: 'Shed two shutter and the canal door',
    pts: [[90, 32], [92, 29.2], [92, 26.8], [90, 20], [86.4, 19], [80, 17], [75.5, 15], [86.4, 19], [93, 11], [93, 9], [88, 6.5], [88, 3, -1]],
    obj: 6,
    climbs: [1],
  },
];

/** The four sections of the campaign map, `W1`..`W4`. */
export const WHARF_SECTORS: SectorDef[] = [
  {
    id: 'W1',
    name: 'Night market',
    start: { x: 7, y: 0, z: 10, yaw: 0 },
    start2: { x: 8.5, y: 0, z: 10, yaw: 0 },
    objective: { kind: 'grab', label: "Take the warden's tally book", x: 2.5, y: 4.5, z: 50, yaw: 0 },
    connector: {
      label: 'Service passage to the arcade',
      box: [36.2, 58.2, 39.8, 61.8],
      floorY: 0,
      nearAt: at2(W1.doors['w1-conn-near']!),
      checkpoint: { x: 42, y: 0, z: 55, yaw: PI / 2 },
      checkpoint2: { x: 42, y: 0, z: 56.5, yaw: PI / 2 },
    },
    guards: W1_GUARDS,
    reinforce: [[34, 60.5], [36, 16]],
    perStage: 2,
    dogs: 0,
    routes: W1_ROUTES,
    bolts: W1_BOLTS,
    intel: W1_INTEL,
  },
  {
    id: 'W2',
    name: 'Arcade lofts',
    start: { x: 42, y: 0, z: 55, yaw: PI / 2 },
    start2: { x: 42, y: 0, z: 56.5, yaw: PI / 2 },
    objective: { kind: 'grab', label: "Lift the clerk's notebook in the pie shop loft", x: 58.6, y: 4.5, z: 68.4, yaw: 0 },
    connector: {
      label: 'Over the arcade lane to the counting house roof',
      box: [82.2, 64.5, 86.5, 67.5],
      floorY: 8.4,
      // the restart point is the head of the roof bulkhead stair (the roof fire escape into the east wing)
      checkpoint: { x: 111.4, y: 8.4, z: 68, yaw: PI / 2 },
      checkpoint2: { x: 111.4, y: 8.4, z: 66.6, yaw: PI / 2 },
    },
    guards: W2_GUARDS,
    reinforce: [[74, 50], [42, 50]],
    perStage: 2,
    dogs: 0,
    routes: W2_ROUTES,
    bolts: W2_BOLTS,
    intel: W2_INTEL,
  },
  {
    id: 'W3',
    name: 'Counting house',
    start: { x: 111.4, y: 8.4, z: 68, yaw: PI / 2 },
    start2: { x: 111.4, y: 8.4, z: 66.6, yaw: PI / 2 },
    objective: { kind: 'grab', label: 'Take the ledger from the strongroom', x: 101, y: 0, z: 62.5, yaw: 0 },
    connector: {
      label: 'Cartway to the wharf sheds',
      box: [88.2, 34.2, 91.8, 37.8],
      floorY: 0,
      nearAt: at2(W3.doors['w3-conn-near']!),
      checkpoint: { x: 90, y: 0, z: 32, yaw: -PI / 2 },
      checkpoint2: { x: 91.5, y: 0, z: 32, yaw: -PI / 2 },
    },
    guards: W3_GUARDS,
    reinforce: [[103, 40], [94, 46]],
    perStage: 2,
    dogs: 1,
    routes: W3_ROUTES,
    bolts: W3_BOLTS,
    keypads: [{ at: at2(W3.doors['w3-east-gate']!), code: 'tkl-gate-code' }],
    pairGates: [
      {
        door: at2(W3.doors['w3-strongroom']!),
        a: { at: [W3_KEY_POSTS.east[0], W3_KEY_POSTS.east[2]], label: 'Turn the east key' },
        b: { at: [W3_KEY_POSTS.west[0], W3_KEY_POSTS.west[2]], label: 'Turn the west key' },
        window: 1.0,
      },
    ],
    intel: W3_INTEL,
  },
  {
    id: 'W4',
    name: 'Wharf sheds',
    start: { x: 90, y: 0, z: 32, yaw: -PI / 2 },
    start2: { x: 91.5, y: 0, z: 32, yaw: -PI / 2 },
    objective: { kind: 'grab', label: 'Take the packet from the candle chest in shed three', x: 75.5, y: 0, z: 14, yaw: 0 },
    extract: { label: 'The boat at the jetty steps', box: [84, 1, 96, 5], floorY: -1 },
    guards: W4_GUARDS,
    reinforce: [[46, 30.5], [118, 31.5]],
    perStage: 2,
    dogs: 1,
    routes: W4_ROUTES,
    bolts: W4_BOLTS,
  },
];
