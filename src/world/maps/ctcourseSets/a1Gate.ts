/**
 * A1 the Gate (SPEC section 9 "A1 - Set 1, the Gate"; set doc `docs/marlow-final/sets/a1Gate.md`; PLAN slice 1, steps 2-4:
 * greybox, lights, guard / objective steps / e2e). A goods-yard lorry gate after hours with the facility's arrival lounge:
 * the unguarded teach set for the leg-up, the ledge relay and the bolt (the handshake).
 *
 * Ground, set box x 0-22, z 2-20, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - the arrival armoury (lounge) x 0-6, z 8-14 (3.2 m ceiling, 0.3 m flats to the roof, all `noLedge`; the weapons display cabinet,
 *   two locker banks and benches are the facility dresser's on its west wall and flats) with its 1.8 m sliding door at x 6, z 11 and the
 *   four warm cove lamps on the house circuit 10;
 * - the lorry apron x 6-11.7 and the yard x 12.3-22, divided by the 4.4 m boundary wall (`boostWall`: the co-op lip on both
 *   faces, the wicket bolted on the yard side, the striped leg-up mark 0.9 m off the apron face);
 * - the gate checker's cabin x 7-10, z 15-18 (every piece `noLedge`, inside the 4.7 m keep-clear of the lip) with the
 *   passive armed checker at his desk and the two light switches;
 * - the apron flood (group 11, photocell), three yard bulkheads (12) and the cabin panel (13).
 * Every other block 1.9 m or taller is `noLedge`: the only way over the wall is a leg-up or a relay. Nothing here stands within
 * 4.7 m of either wall face that a player alone could climb. Prototype starting values (G10).
 *
 * Dressing (slice 1 step 5, SPEC 6, M5: a goods-yard mock-up inside the luxury hall, so it keeps its own materials - brick,
 * painted steel, site-hut sheeting, pine - and only the lounge and the hall above the sets take the kit's charcoal panels):
 * - the greybox's boxes, lamps, doors and anchors are untouched; the dressing is appended after them;
 * - everything built by hand is a thin visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK` so it is out of
 *   the canonical light shapes: the bake, the meter and the guards see the greybox as built): the wall's plinth, piers and stone
 *   cap, the chained vehicle gate on the apron face (A1-D3: no opening, no collision), the hut's sheeting, frames and felt roof,
 *   the floor paint and joints;
 * - the only new collision is the props kit's own boxes (`FacilityProps.write`: the checker's counter, the barrier post, four
 *   lane bollards), every one `noLedge`; the arm and the wicket's bolt are drawn only;
 * - kit panels with accent LED strips, every strip on its circuit's group: the lounge walls (house, 10) and the hall's south and
 *   east walls above the 4.4 m wall (the yard circuit, 12: never 10), so the strips go dark with their lamps. No lamp is added.
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { BoltGate, GateDef } from '../../../game/course/courseDef';
import { KIT_BOX_COLOR, KIT_PANEL_DEPTH, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { FacilityProps } from '../../props/facilityProps';
import { applyGreybox, boostWall } from '../ctcourseGreybox';
import { wallRuns } from './facility';
import { emptyPart, HALL_H, LOUNGE_BOX, tally, type SetPart } from './types';

/** The gate checker's squad slot id. */
export const A1_CHECKER = 'a1-checker';
/** What he gives up when held (set doc section 2, G206 / P14). */
export const A1_CHECKER_INFO: GuardInfo = {
  lines: ["I only log the lorries. That wicket's bolted on the yard side every night.", 'The instructors watch from the glass up there. They mark everything you do.'],
};

/** The wicket's course door and its bolt gate (SPEC ids; the helper's own are `a1-wall-wicket` / `g-a1-wall-wicket`, A1-D2). */
export const A1_WICKET_DOOR = 'A1-wicket';
export const A1_WICKET_GATE = 'g-a1-wicket';
/** The lounge's sliding door (course id; the house door, Open only, N9). */
export const A1_LOUNGE_DOOR = 'A1-lounge';
/** The wicket centre and the boundary wall's faces (x), the leg-up mark and its claim zone, the yard pass zone. */
export const A1_WALL = { x: 12, z: 11, thick: 0.6, span: 18, lip: 4.4, near: 11.7, far: 12.3 } as const;
export const A1_MARK = { x: 10.8, z: 6 } as const;
export const A1_MARK_ZONE: [number, number, number, number] = [10.3, 5.5, 11.3, 6.5];
export const A1_YARD_ZONE: [number, number, number, number] = [12.6, 2.3, 22, 19.7];
/** The course flag both players standing in the yard set (a step's done condition: the relay way over). */
export const A1_YARD_FLAG = 'a1-yard';

const BRICK = '#6e4f42';
const SODIUM: [number, number, number] = [1.0, 0.72, 0.36];
const PANEL_WHITE: [number, number, number] = [0.96, 0.97, 1.0];
const T_LOUNGE = 0.3;
/** The checker's cabin: wall centre lines (the set doc's plan box), wall thickness, wall and roof heights. */
const CABIN = { x0: 7, z0: 15, x1: 10, z1: 18, t: 0.2, wallH: 2.5, roofT: 0.1 } as const;
/** The cabin's door (south wall, x 8.0-9.2) and window (east wall, z 16-17, sill 1.0, head 2.0). */
const CABIN_DOOR = { x0: 8.0, x1: 9.2, h: 2.1 } as const;
const CABIN_WINDOW = { z0: 16.0, z1: 17.0, sill: 1.0, head: 2.0 } as const;

// ---- dressing (slice 1 step 5) ----
/** The circuits the kit's accent strips follow: the lounge's house run, and the yard's switched run for the hall's coves above the
 *  4.4 m wall (set doc section 7: never the lounge's 10). */
const G_LOUNGE = 10;
const G_YARD = 12;
/** A dressing skin's thickness (m) and the thinnest side a skin may have: under `CANON_MIN_THICK` (0.05, `voxel/lightShapes.ts`) the
 *  canonical light shapes leave it out, so dressing never moves the bake, the meter or what a guard sees. */
const SKIN = 0.03;
const THIN = 0.05;
/** The hall walls' room-side faces the boundary wall's dressing runs between (the south shell's and the gallery wall's). */
const WALL_RUN = [2.25, 19.75] as const;
/** The wicket's opening and the chained gate's posts along the wall (z). */
const WICKET_Z = [A1_WALL.z - 0.6, A1_WALL.z + 0.6] as const;
const GATE_Z = [3.8, 7.2] as const;
/** The wall's piers (centres along z): clear of the gate, the wicket and the yard lamps (z 5 / 11 / 17). */
const PIERS = [3.0, 8.6, 13.4, 18.2] as const;
/** The 4.7 m keep-clear is the greybox's (`GREY_KEEP_CLEAR`); the lane bollards stand 1.0 m tall, 0.12 m square, `noLedge`. */
const BOLLARDS: readonly (readonly [number, number])[] = [
  [11.2, 3.3],
  [11.2, 7.7],
  [21.35, 9.2],
  [21.35, 12.8],
];
/** Own materials (brick, painted steel, site-hut sheeting, pine, paint). */
const C = {
  plinth: '#3f342e',
  pier: '#7b5648',
  stone: '#8b857a',
  gate: '#3d5a4e',
  gateDark: '#27302c',
  gateLight: '#4b6f60',
  chain: '#85888a',
  brass: '#b08d3c',
  white: '#e5e5de',
  red: '#b5282d',
  black: '#1d1f20',
  hut: '#566d5c',
  hutRib: '#4a5f50',
  hutTrim: '#d9d8cf',
  hutBase: '#2b2f2c',
  pine: '#9d7f56',
  cream: '#cdc6b3',
  felt: '#2b2e30',
  cork: '#a8763e',
  keys: '#8c2b2b',
  paint: '#d8d8cd',
  yellow: '#c9a227',
  mat: '#34383b',
  drain: '#1e2022',
  plate: '#55595c',
  plateEdge: '#2a2d2f',
  joint: '#26292d',
} as const;

export function buildA1Gate(b: LevelBuilder, kit: FacilityKit): SetPart {
  const p = emptyPart('a1Gate');
  /** A box from `y0` up `h`, centred in plan at (cx, cz), sized (sx, sz); `noLedge` unless `lip`. */
  const block = (cx: number, cz: number, sx: number, sz: number, y0: number, h: number, color: string, opts: { overhead?: boolean; noLedge?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box(cx, y0 + h / 2, cz, sx, h, sz, color);
    b.mark(from, { noLedge: opts.noLedge ?? true, ...(opts.overhead ? { overhead: true } : {}) });
  };
  /** A wall along x at z (centre line) from x0 to x1, thickness t. */
  const wallX = (z: number, x0: number, x1: number, t: number, y0: number, y1: number, color = KIT_BOX_COLOR): void => block((x0 + x1) / 2, z, x1 - x0, t, y0, y1 - y0, color);
  /** A wall along z at x from z0 to z1. */
  const wallZ = (x: number, z0: number, z1: number, t: number, y0: number, y1: number, color = KIT_BOX_COLOR): void => block(x, (z0 + z1) / 2, t, z1 - z0, y0, y1 - y0, color);

  // ---- A1-1 / A1-2: the boundary wall (the co-op lip), the wicket, the striped leg-up mark ----
  const wall = boostWall({ id: 'a1-wall', at: { x: A1_WALL.x, z: A1_WALL.z }, facing: '+x', span: A1_WALL.span, lip: A1_WALL.lip, thick: A1_WALL.thick, wicket: 0, wicketW: 1.2, spot: -5, color: BRICK });
  // A1-D2: the SPEC's ids for the wicket door and its bolt gate
  for (const d of wall.doors) if (d.id === 'a1-wall-wicket') d.id = A1_WICKET_DOOR;
  const gates: GateDef[] = wall.gates.map((g): GateDef => (g.kind === 'bolt' ? ({ ...g, id: A1_WICKET_GATE, doorId: A1_WICKET_DOOR } satisfies BoltGate) : g));
  tally(b, p.register, 'A1-1', 'Boundary wall 4.4 m, 0.6 brick: co-op lip (leg-up and relay), wicket head, striped leg-up mark', () => {
    applyGreybox(b, { ...wall, doors: [] });
  });
  tally(b, p.register, 'A1-2', 'Wicket door, locked on the apron side, bolted on the yard side (bolt gate)', () => {
    const doors = applyGreybox(b, { ...wall, boxes: [], stairs: [], ledges: [] });
    p.doors[A1_WICKET_DOOR] = doors[A1_WICKET_DOOR]!;
  });
  p.bay.gates.push(...gates);
  p.lips.push(...wall.lips);

  // ---- A1-8 / A1-9 / A1-10: the arrival lounge, its sliding door and its cove lamps ----
  const [, lz0, lx1, lz1] = LOUNGE_BOX;
  const west = 0.25; // the facility's west shell wall (0.5 m on x 0): the flats start at its face
  tally(b, p.register, 'A1-8', "Arrival lounge: south, north and east flats to the hall roof (noLedge) and the 3.2 m ceiling; the desk, green wall, seats and kit case are the facility's props", () => {
    wallX(lz0, west, lx1 + T_LOUNGE / 2, T_LOUNGE, 0, HALL_H);
    wallX(lz1, west, lx1 + T_LOUNGE / 2, T_LOUNGE, 0, HALL_H);
    // the door wall (x 6): the opening z 10.1-11.9 is the sliding door's (its lintel to the roof is the kit's)
    wallZ(lx1, lz0 + T_LOUNGE / 2, 10.1, T_LOUNGE, 0, HALL_H);
    wallZ(lx1, 11.9, lz1 - T_LOUNGE / 2, T_LOUNGE, 0, HALL_H);
    // the ceiling the cove lamps hang under: an unreachable slab (the flats close it to the roof)
    block((west + lx1 + T_LOUNGE / 2) / 2, (lz0 + lz1) / 2, lx1 + T_LOUNGE / 2 - west, lz1 - lz0 - T_LOUNGE, 3.2, 0.2, KIT_BOX_COLOR, { overhead: true });
  });
  tally(b, p.register, 'A1-9', 'Lounge sliding door 1.8 x 2.1 (house door, Open only: N9), lintel to the roof', () => {
    const from = b.boxes.length;
    p.doors[A1_LOUNGE_DOOR] = kit.slidingDoor(lx1, 11, 1.8, 0, { wallThick: T_LOUNGE, wallH: HALL_H }).id;
    b.mark(from, { noLedge: true });
  });
  tally(b, p.register, 'A1-10', 'Lounge warm cove slots, group 10 (the instructors\' house circuit, no switch)', () => {
    for (const [x, z] of [[1.5, 9.5], [4.5, 9.5], [1.5, 12.5], [4.5, 12.5]] as const) kit.ledSlot(x, 3.2, z, 2.4, 0, { tone: 'warm', light: { radius: 4.6, intensity: 0.12, group: 10 } });
  });

  // ---- A1-4: the gate checker's cabin: every piece noLedge (inside the 4.7 m keep-clear of the wall's lip) ----
  tally(b, p.register, 'A1-4', "Gate checker's cabin: walls, door, window (clear glass), roof, desk; every piece noLedge", () => {
    const { x0, z0, x1, z1, t, wallH } = CABIN;
    const h = t / 2;
    // south wall with the door gap, a lintel over it, then the west, north and east walls (east: window)
    wallX(z0, x0 - h, CABIN_DOOR.x0, t, 0, wallH);
    wallX(z0, CABIN_DOOR.x1, x1 + h, t, 0, wallH);
    wallX(z0, CABIN_DOOR.x0, CABIN_DOOR.x1, t, CABIN_DOOR.h, wallH);
    wallX(z1, x0 - h, x1 + h, t, 0, wallH);
    wallZ(x0, z0 + h, z1 - h, t, 0, wallH);
    wallZ(x1, z0 + h, CABIN_WINDOW.z0, t, 0, wallH);
    wallZ(x1, CABIN_WINDOW.z1, z1 - h, t, 0, wallH);
    wallZ(x1, CABIN_WINDOW.z0, CABIN_WINDOW.z1, t, 0, CABIN_WINDOW.sill);
    wallZ(x1, CABIN_WINDOW.z0, CABIN_WINDOW.z1, t, CABIN_WINDOW.head, wallH);
    kit.glass(x1, CABIN_WINDOW.z0, x1, CABIN_WINDOW.z1, CABIN_WINDOW.head - CABIN_WINDOW.sill, { y: CABIN_WINDOW.sill });
    // the flat roof (top 2.6) on the walls, and the desk under the window
    block((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + t, z1 - z0 + t, wallH, CABIN.roofT, KIT_BOX_COLOR, { overhead: true });
    block(9.65, 16.5, 0.5, 1.8, 0, 0.75, '#3a3226');
    // the door: hinge on the west jamb, the leaf swinging out to the apron
    b.door(CABIN_DOOR.x0, 0, z0, CABIN_DOOR.x1 - CABIN_DOOR.x0, Math.PI / 2, { height: CABIN_DOOR.h });
  });

  // ---- A1-5 / A1-6: the lights (LIGHTING-PLAN 3, A1; the circuits are `MARLOW_CIRCUITS` 11-13) ----
  tally(b, p.register, 'A1-5', 'Apron security light, group 11 (photocell, no switch): sodium flood on the cabin\'s south-east corner, aimed south along the wall', () => {
    b.light({ kind: 'spot', x: 10.25, y: 2.8, z: 14.75, radius: 13, intensity: 3.5, color: SODIUM, cone: makeCone(0.05, -0.3, -1, 0.85), group: 11, electric: true, destructible: true, fixture: { sx: 0.4, sy: 0.16, sz: 0.3, oy: 0.06 } });
  });
  tally(b, p.register, 'A1-6', 'Yard lamps group 12 (switch in the cabin by its door) and the cabin panel group 13 (switch by the door)', () => {
    for (const z of [5, 11, 17]) b.light({ x: A1_WALL.far + 0.25, y: 3.6, z, radius: 9, intensity: 1.25, color: SODIUM, group: 12, electric: true, destructible: true, fixture: { sx: 0.2, sy: 0.16, sz: 0.34, oy: 0.06 } });
    b.light({ x: 8.5, y: 2.45, z: 16.5, radius: 3.2, intensity: 0.065, color: PANEL_WHITE, group: 13, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
  });
  p.register.push({ id: 'A1-7', element: 'Striped leg-up mark (paint, no collision): A1-1\'s helper spot' });
  p.groups['a1-lounge'] = 10;
  p.groups['a1-apron'] = 11;
  p.groups['a1-yard'] = 12;
  p.groups['a1-cabin'] = 13;
  // the two switches inside the cabin's south wall, either side of the door (the leaf swings out, so they stay clear)
  p.switches.push({ id: 'a1-sw-yard', group: 12, pos: { x: 7.7, y: 1.2, z: CABIN.z0 + CABIN.t / 2 }, yaw: 0 });
  p.switches.push({ id: 'a1-sw-cabin', group: 13, pos: { x: 9.5, y: 1.2, z: CABIN.z0 + CABIN.t / 2 }, yaw: 0 });
  // the set at its standby fill, the lounge at the house level (SPEC 7; the smallest containing zone wins)
  p.ambientZones.push({ id: 'A1', box: [0, 2, 22, 20], ambient: MARLOW_LEVEL.standby, minY: -1, maxY: 9.9 });
  p.ambientZones.push({ id: 'lounge', box: [...LOUNGE_BOX], ambient: MARLOW_LEVEL.house, minY: -1, maxY: 3.1 });

  // ---- the checker, the steps, the claim, the radio ----
  // seated at his desk, facing east through the cabin's window at the apron and the wall (passive: sees and hears nothing)
  p.squads[A1_CHECKER] = { kind: 'grunt', x: 9.0, z: 16.5, yaw: Math.PI / 2, passive: true, info: A1_CHECKER_INFO };
  p.bay.squad.push(A1_CHECKER);
  // the first player to stand on the striped mark takes A, the booster (A1-D5)
  p.bay.roles = [{ role: 'a', zone: { box: A1_MARK_ZONE, y1: 1 } }];
  p.passZones.push({ id: 'a1-p-yard', box: A1_YARD_ZONE, flag: A1_YARD_FLAG, floorY: 0 });
  p.externalFlags.push(A1_YARD_FLAG);
  p.objectives.push(
    {
      id: 'a1-over',
      bay: 'A1',
      text: 'Get over the yard wall together: one boosts, one climbs.',
      a: 'Crouch at the striped mark and give your partner a leg-up.',
      b: 'Take the leg-up, drop into the yard and unbolt the wicket gate.',
      done: [{ gate: A1_WICKET_GATE }, { flag: A1_YARD_FLAG }],
    },
    { id: 'a1-lock', bay: 'A1', text: 'Both of you into holding room one.' },
  );
  p.bay.radio.push(
    { at: 'enter', text: 'Evening. Same rules as the real thing. Over the wall, open the gate for your partner.' },
    { at: 'a1-over', text: 'Good. That is the handshake. You will use it all night.' },
  );

  // ---- spaces, nav, debug points, light and shot spots ----
  p.camSpaces.push({ box: [0, 2, 22, 20], size: 'open' }, { box: [...LOUNGE_BOX], size: 'tight' }, { box: [CABIN.x0, CABIN.z0, CABIN.x1, CABIN.z1], size: 'tight' });
  p.navSeeds.push({ x: 9, y: 0, z: 9 }, { x: 17, y: 0, z: 11 });
  p.debugPoints.push(
    { id: 'A1-entry', label: 'Set 1 entry (the lounge)', pos: { x: 4, y: 0, z: 11 }, yaw: Math.PI / 2 },
    { id: 'A1-mid', label: 'Set 1 middle (the apron)', pos: { x: 9, y: 0, z: 10 }, yaw: Math.PI / 2 },
    { id: 'A1-mark', label: 'Set 1 leg-up mark', pos: { x: A1_MARK.x, y: 0, z: A1_MARK.z }, yaw: Math.PI / 2 },
    { id: 'A1-yard', label: 'Set 1 yard', pos: { x: 17, y: 0, z: 11 }, yaw: -Math.PI / 2 },
  );
  p.lightSpots.push(
    { name: 'A1 wicket apron', kind: 'body', x: 11.2, y: 0, z: 11, band: 'pool' },
    { name: 'A1 wicket yard', kind: 'body', x: 12.8, y: 0, z: 11, band: 'pool' },
    { name: 'A1 mark', kind: 'body', x: A1_MARK.x, y: 0, z: A1_MARK.z, band: 'pool' },
    { name: 'A1 apron centre', kind: 'body', x: 9, y: 0, z: 10, band: 'read' },
    { name: 'A1 yard centre', kind: 'body', x: 17, y: 0, z: 11, band: 'read' },
    { name: 'A1 yard cut', kind: 'body', x: 17, y: 0, z: 11, band: 'cut', off: [12] },
    { name: 'A1 mark cut', kind: 'body', x: A1_MARK.x, y: 0, z: A1_MARK.z, band: 'cut', off: [11] },
    { name: 'A1 lounge', kind: 'body', x: 3, y: 0, z: 11, band: 'read' },
    { name: 'A1 lounge house', kind: 'body', x: 3, y: 0, z: 11, band: 'house' },
    { name: 'A1 cabin', kind: 'body', x: 8.5, y: 0, z: 16.5, band: 'read' },
    { name: 'A1 apron floor', kind: 'surf', x: 9, y: 0.05, z: 10, band: 'any' },
    { name: 'A1 apron standby', kind: 'body', x: 9, y: 0, z: 10, band: 'standby' },
    { name: 'A1 yard standby', kind: 'body', x: 17, y: 0, z: 11, band: 'standby' },
  );
  p.shotVantages.push(
    { name: 'a1-lounge-door', feet: [5, 0, 11], cam: [3.2, 1.8, 10.2], target: [11.7, 1.6, 8] },
    { name: 'a1-yard-wicket', feet: [17, 0, 11], cam: [18.6, 1.8, 10], target: [12.3, 1.2, 11] },
  );
  // ---- dressing (slice 1 step 5; SPEC 6, PROPS.md 3 / 5, KIT.md): appended after the greybox, which it does not touch ----
  /** A visual-only skin [x0, x1] x [y0, y1] x [z0, z1]: no collision, `noLedge`, one side under `THIN` (out of the light shapes). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= THIN) throw new Error(`a1Gate: the dressing skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, 0, false);
    b.mark(from, { noLedge: true });
  };
  /** On the boundary wall's apron face (`layer` 0 touches it, each layer `SKIN` further out) and on its yard face. */
  const onNear = (layer: number, z0: number, z1: number, y0: number, y1: number, color: string): void => skin(A1_WALL.near - (layer + 1) * SKIN, A1_WALL.near - layer * SKIN, y0, y1, z0, z1, color);
  const onFar = (layer: number, z0: number, z1: number, y0: number, y1: number, color: string): void => skin(A1_WALL.far + layer * SKIN, A1_WALL.far + (layer + 1) * SKIN, y0, y1, z0, z1, color);
  /** Floor paint (a few mm proud, no collision). */
  const paint = (x0: number, x1: number, z0: number, z1: number, color: string, top = 0.012): void => skin(x0, x1, 0, top, z0, z1, color);

  tally(b, p.register, 'A1-11', 'Boundary wall dressing (visual skins, no collision): engineering-brick plinth, four piers, a stone cap course on both faces', () => {
    const [w0, w1] = WALL_RUN;
    for (const [a, e] of wallRuns(w0, w1, [[GATE_Z[0], GATE_Z[1]], [WICKET_Z[0], WICKET_Z[1]]])) onNear(0, a, e, 0, 0.45, C.plinth);
    for (const [a, e] of wallRuns(w0, w1, [[WICKET_Z[0], WICKET_Z[1]]])) onFar(0, a, e, 0, 0.45, C.plinth);
    for (const z of PIERS) {
      onNear(0, z - 0.2, z + 0.2, 0.45, 4.28, C.pier);
      onFar(0, z - 0.2, z + 0.2, 0.45, 4.28, C.pier);
    }
    onNear(0, w0, w1, 4.28, 4.4, C.stone);
    onFar(0, w0, w1, 4.28, 4.4, C.stone);
  });
  // the chained vehicle gate (A1-3, A1-D3): two painted steel leaves between posts under a concrete lintel on the solid wall, a padlocked chain
  tally(b, p.register, 'A1-3', "Vehicle gate 3 x 3, chained: skins on the wall's apron face (leaves, stiles, rails, chain, padlock, sign), no opening, no collision (A1-D3)", () => {
    const [g0, g1] = GATE_Z;
    const mid = (g0 + g1) / 2;
    onNear(0, g0, g0 + 0.2, 0, 3.0, C.gateDark);
    onNear(0, g1 - 0.2, g1, 0, 3.0, C.gateDark);
    onNear(0, g0 + 0.2, mid - 0.01, 0.08, 3.0, C.gate);
    onNear(0, mid + 0.01, g1 - 0.2, 0.08, 3.0, C.gate);
    onNear(0, g0, g1, 3.0, 3.3, C.stone);
    for (const [a, e] of [[g0 + 0.2, g0 + 0.32], [mid - 0.12, mid + 0.12], [g1 - 0.32, g1 - 0.2]] as const) onNear(1, a, e, 0.08, 3.0, C.gateLight);
    for (const y of [0.25, 1.45, 2.6]) onNear(2, g0 + 0.2, g1 - 0.2, y, y + 0.15, C.gateDark);
    // the chain through the meeting stiles and the padlock under it
    for (let i = 0; i < 12; i++) onNear(3, 4.75 + 0.125 * i, 4.75 + 0.125 * i + 0.1, 1.0 + (i % 2) * 0.03, 1.07 + (i % 2) * 0.03, C.chain);
    onNear(3, mid - 0.06, mid + 0.06, 0.78, 0.96, C.brass);
    onNear(3, mid - 0.03, mid + 0.03, 0.96, 1.0, C.black);
    // a white board over the lintel: two lines of lettering stand-ins and a red band (text waits for a texture, KIT.md 6)
    onNear(0, 4.6, 6.4, 3.45, 3.95, C.white);
    onNear(1, 4.7, 6.3, 3.75, 3.85, C.red);
    onNear(1, 4.9, 6.1, 3.58, 3.65, C.black);
  });

  tally(b, p.register, 'A1-12', "Gate checker's cabin dressing (visual skins, no collision): ribbed site-hut sheeting, frames, sign, felt roof, pine lining, floor boards, notice board, key cabinet", () => {
    const o = CABIN.t / 2;
    const xw = CABIN.x0 - o;
    const xe = CABIN.x1 + o;
    const zs = CABIN.z0 - o;
    const zn = CABIN.z1 + o;
    const h = CABIN.wallH;
    const { x0: dx0, x1: dx1, h: dh } = CABIN_DOOR;
    const { z0: wz0, z1: wz1, sill, head } = CABIN_WINDOW;
    // exterior sheeting, one skin on each face with the door and the window left open
    skin(xw - SKIN, xw, 0, h, zs, zn, C.hut);
    skin(xw, xe, 0, h, zn, zn + SKIN, C.hut);
    skin(xw, dx0, 0, h, zs - SKIN, zs, C.hut);
    skin(dx1, xe, 0, h, zs - SKIN, zs, C.hut);
    skin(dx0, dx1, dh, h, zs - SKIN, zs, C.hut);
    skin(xe, xe + SKIN, 0, h, zs, wz0, C.hut);
    skin(xe, xe + SKIN, 0, h, wz1, zn, C.hut);
    skin(xe, xe + SKIN, 0, sill, wz0, wz1, C.hut);
    skin(xe, xe + SKIN, head, h, wz0, wz1, C.hut);
    // a rib every 0.3 m, a dark base course, white fascia and a felt roof with a downpipe at the north-east corner
    for (let z = 15.0; z < 18.0; z += 0.3) skin(xw - 2 * SKIN, xw - SKIN, 0.18, 2.4, z, z + 0.06, C.hutRib);
    for (let x = 7.0; x < 10.0; x += 0.3) skin(x, x + 0.06, 0.18, 2.4, zn + SKIN, zn + 2 * SKIN, C.hutRib);
    for (const [a, e] of [[7.0, 7.8], [9.4, 10.05]] as const) for (let x = a; x < e; x += 0.3) skin(x, x + 0.06, 0.18, 2.4, zs - 2 * SKIN, zs - SKIN, C.hutRib);
    for (const [a, e] of [[15.0, 15.85], [17.2, 18.0]] as const) for (let z = a; z < e; z += 0.3) skin(xe + SKIN, xe + 2 * SKIN, 0.18, 2.4, z, z + 0.06, C.hutRib);
    skin(xw - 2 * SKIN, xw - SKIN, 0, 0.18, zs, zn, C.hutBase);
    skin(xw, xe, 0, 0.18, zn + SKIN, zn + 2 * SKIN, C.hutBase);
    skin(xe + SKIN, xe + 2 * SKIN, 0, 0.18, zs, zn, C.hutBase);
    skin(xw, dx0 - 0.06, 0, 0.18, zs - 2 * SKIN, zs - SKIN, C.hutBase);
    skin(dx1 + 0.06, xe, 0, 0.18, zs - 2 * SKIN, zs - SKIN, C.hutBase);
    skin(xw - SKIN, xw, h, h + 0.1, zs, zn, C.hutTrim);
    skin(xw, xe, h, h + 0.1, zn, zn + SKIN, C.hutTrim);
    skin(xw, xe, h, h + 0.1, zs - SKIN, zs, C.hutTrim);
    skin(xe, xe + SKIN, h, h + 0.1, zs, zn, C.hutTrim);
    skin(xw - SKIN, xe + SKIN, h + 0.1, h + 0.13, zs - SKIN, zn + SKIN, C.felt);
    skin(xe + SKIN, xe + 2 * SKIN, 0.18, h, 18.0, 18.06, C.hutBase);
    // the door's surround and the gate checker's sign over it (south face), the window's frame, bar and sill (east face)
    skin(dx0 - 0.06, dx0, 0, dh, zs - 2 * SKIN, zs - SKIN, C.hutTrim);
    skin(dx1, dx1 + 0.06, 0, dh, zs - 2 * SKIN, zs - SKIN, C.hutTrim);
    skin(dx0 - 0.06, dx1 + 0.06, dh, dh + 0.06, zs - 2 * SKIN, zs - SKIN, C.hutTrim);
    skin(8.1, 9.1, 2.2, 2.46, zs - 2 * SKIN, zs - SKIN, C.white);
    skin(8.2, 9.0, 2.28, 2.38, zs - 3 * SKIN, zs - 2 * SKIN, C.gateDark);
    skin(xe + SKIN, xe + 2 * SKIN, sill, head, wz0 - 0.06, wz0, C.hutTrim);
    skin(xe + SKIN, xe + 2 * SKIN, sill, head, wz1, wz1 + 0.06, C.hutTrim);
    skin(xe + SKIN, xe + 2 * SKIN, head, head + 0.06, wz0 - 0.06, wz1 + 0.06, C.hutTrim);
    skin(xe + SKIN, xe + 2 * SKIN, sill, head, (wz0 + wz1) / 2 - 0.01, (wz0 + wz1) / 2 + 0.01, C.hutTrim);
    skin(xe + SKIN, xe + SKIN + 0.045, sill - 0.06, sill, wz0 - 0.1, wz1 + 0.1, C.hutTrim);
    // inside: a pine lining under cream walls on the west and north faces (the south wall carries the switches), a cork board with notes,
    // a key cabinet over the counter, boards on the floor and a mat at the door
    const ix0 = CABIN.x0 + o;
    const ix1 = CABIN.x1 - o;
    const iz0 = CABIN.z0 + o;
    const iz1 = CABIN.z1 - o;
    skin(ix0, ix0 + SKIN, 0, 1.1, iz0, iz1, C.pine);
    skin(ix0, ix0 + SKIN, 1.1, h, iz0, iz1, C.cream);
    skin(ix0, ix1, 0, 1.1, iz1 - SKIN, iz1, C.pine);
    skin(ix0, ix1, 1.1, h, iz1 - SKIN, iz1, C.cream);
    skin(ix0 + SKIN, ix0 + 2 * SKIN, 1.3, 1.9, 16.0, 16.9, C.cork);
    for (const [a, e, y] of [[16.1, 16.3, 1.5], [16.5, 16.7, 1.35], [16.65, 16.85, 1.6]] as const) skin(ix0 + 2 * SKIN, ix0 + 3 * SKIN, y, y + 0.2, a, e, C.white);
    skin(7.7, 8.3, 1.35, 1.95, iz1 - 2 * SKIN, iz1 - SKIN, C.keys);
    skin(7.99, 8.01, 1.35, 1.95, iz1 - 3 * SKIN, iz1 - 2 * SKIN, C.black);
    skin(ix0, ix1, 0, 0.02, iz0, iz1, C.pine);
    for (let x = 7.3; x < ix1; x += 0.2) skin(x, x + 0.01, 0.02, 0.024, iz0, iz1, C.hutBase);
    paint(dx0, dx1, zs - 0.5, zs, C.mat, 0.02);
  });

  tally(b, p.register, 'A1-13', 'Floor paint and joints (flat skins under 2 cm, no collision): the keep-clear box round the mark, lane dashes, wall-foot drain, door mat, weighbridge plate, a lorry bay, 3 m joints on the apron and in the yard', () => {
    // 3 m joints in the setts (under the paint)
    for (let z = 2.4; z < 19.7; z += 3) {
      skin(6.15, A1_WALL.near, 0, 0.004, z, z + 0.02, C.joint);
      skin(A1_WALL.far, 21.75, 0, 0.004, z, z + 0.02, C.joint);
    }
    skin(8.99, 9.01, 0, 0.004, 2.25, 19.75, C.joint);
    for (const x of [15, 18]) skin(x - 0.01, x + 0.01, 0, 0.004, 2.25, 19.75, C.joint);
    // the keep-clear box in front of the gate, the mark inside it (painted by the helper)
    paint(8.2, 11.55, 3.7, 3.8, C.paint);
    paint(8.2, 11.55, 7.2, 7.3, C.paint);
    paint(8.2, 8.3, 3.7, 7.3, C.paint);
    paint(11.45, 11.55, 3.7, 7.3, C.paint);
    // the lane's dashes, the drain along the wall foot (a grate where the wicket's way crosses it)
    for (let z = 7.8; z < 13.5; z += 1.6) paint(8.85, 8.95, z, z + 0.8, C.yellow);
    paint(11.35, 11.6, 7.5, 19.6, C.drain);
    // the weighbridge: a plate flush in the yard with a dark frame and two seams, and a lorry bay beyond it
    paint(14.5, 19.5, 5.5, 8.5, C.plate, 0.014);
    paint(14.38, 19.62, 5.38, 5.5, C.plateEdge, 0.016);
    paint(14.38, 19.62, 8.5, 8.62, C.plateEdge, 0.016);
    paint(14.38, 14.5, 5.5, 8.5, C.plateEdge, 0.016);
    paint(19.5, 19.62, 5.5, 8.5, C.plateEdge, 0.016);
    for (const x of [16.17, 17.83]) paint(x - 0.01, x + 0.01, 5.5, 8.5, C.plateEdge, 0.018);
    paint(13.2, 20.8, 14.15, 14.25, C.paint);
    paint(13.2, 20.8, 17.75, 17.85, C.paint);
    paint(13.2, 13.3, 14.15, 17.85, C.paint);
    paint(20.7, 20.8, 14.15, 17.85, C.paint);
  });

  // kit panels with accent strips, each on its circuit (SPEC 6; a strip with no group is only for the instructors' circuit 1)
  tally(b, p.register, 'A1-15', "Kit panels and skirting on the lounge's flats (house circuit 10); the hall's charcoal panels and coves on the south and east walls above the 4.4 m wall (yard circuit 12). Visual, no lamp", () => {
    const corner = 0.09;
    const lounge = (x: number, z: number, len: number, yaw: number): void => {
      kit.wallPanel(x, z, len, yaw, { h: 3.2, tone: 'warm', group: G_LOUNGE });
      kit.skirting(x, z, len, yaw, { tone: 'warm', group: G_LOUNGE, standoff: KIT_PANEL_DEPTH });
    };
    const xa = west + corner;
    const xe = lx1 - T_LOUNGE / 2 - corner;
    lounge((xa + xe) / 2, lz0 + T_LOUNGE / 2, xe - xa, 0);
    lounge((xa + xe) / 2, lz1 - T_LOUNGE / 2, xe - xa, Math.PI);
    // the door wall's room face: the sliding door's architrave (1.0 m from its centre) is left clear
    for (const [a, e] of wallRuns(lz0 + T_LOUNGE / 2 + corner, lz1 - T_LOUNGE / 2 - corner, [[10.0, 12.0]])) lounge(lx1 - T_LOUNGE / 2, (a + e) / 2, e - a, -Math.PI / 2);
    // the hall's walls over the boundary wall's top (4.4 m): the south shell (face z 2.25) and the L1 wall (face x 21.75)
    const [w0, w1] = WALL_RUN;
    const top = A1_WALL.lip;
    kit.wallPanel(11.0, w0, 21.75 - 0.25 - 2 * corner, 0, { h: HALL_H - top, y: top, tone: 'warm', group: G_YARD });
    kit.wallPanel(21.75, (w0 + w1) / 2, w1 - w0 - 2 * corner, -Math.PI / 2, { h: HALL_H - top, y: top, tone: 'warm', group: G_YARD });
  });

  // the props kit (PROPS.md 3 A1): the checker's counter against the cabin's north wall (monitor dark: a prop screen carries no circuit),
  // a lorry barrier post with its arm laid along the lane's west edge, four lane bollards and the wicket's tower bolt on the wall's yard face.
  // Collision is the props' own boxes via `write`, all `noLedge`; the arm and the bolt are drawn only.
  const props = new FacilityProps();
  props.add('checkerDesk', 8.2, CABIN.z1 - CABIN.t / 2 - 0.35, Math.PI, { tint: [0, 0, 0] });
  props.add('barrierPost', 6.4, 2.6, -Math.PI / 2);
  for (const [x, z] of BOLLARDS) props.add('bollard', x, z, 0);
  props.add('wicketBolt', A1_WALL.far, 11.9, Math.PI / 2, { y: 1.05 });
  tally(b, p.register, 'A1-14', "Props kit: the checker's counter, the barrier post (arm drawn only), four lane bollards (boxes via FacilityProps.write, all noLedge); the wicket's bolt is drawn only", () => {
    const from = b.boxes.length;
    props.write(b);
    b.mark(from, { noLedge: true });
  });
  p.props.push(...props.placements);

  return p;
}
