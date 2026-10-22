/**
 * A1 the Gate (SPEC section 9 "A1 - Set 1, the Gate"; set doc `docs/marlow-final/sets/a1Gate.md`; PLAN slice 1, steps 2-4:
 * greybox, lights, guard / objective steps / e2e). A goods-yard lorry gate after hours with the facility's arrival lounge:
 * the unguarded teach set for the leg-up, the ledge relay and the bolt (the handshake).
 *
 * Ground, set box x 0-22, z 2-20, open to the 10 m hall roof (the walls on the box edges are `facility.ts`'s):
 * - the arrival lounge x 0-6, z 8-14 (3.2 m ceiling, 0.3 m flats to the roof, all `noLedge`; the reception desk, green wall,
 *   seats and kit case are the facility dresser's props on its west wall) with its 1.8 m sliding door at x 6, z 11 and the
 *   four warm cove lamps on the house circuit 10;
 * - the lorry apron x 6-11.7 and the yard x 12.3-22, divided by the 4.4 m boundary wall (`boostWall`: the co-op lip on both
 *   faces, the wicket bolted on the yard side, the striped leg-up mark 0.9 m off the apron face);
 * - the gate checker's cabin x 7-10, z 15-18 (every piece `noLedge`, inside the 4.7 m keep-clear of the lip) with the
 *   passive armed checker at his desk and the two light switches;
 * - the apron flood (group 11, photocell), three yard bulkheads (12) and the cabin panel (13).
 * Every other block 1.9 m or taller is `noLedge`: the only way over the wall is a leg-up or a relay. Dressing (the chained
 * vehicle gate on the wall's apron face, yard markings, signs) is a later step; nothing here stands within 4.7 m of either
 * wall face that a player alone could climb. Prototype starting values (G10).
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { BoltGate, GateDef } from '../../../game/course/courseDef';
import { KIT_BOX_COLOR, type FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { makeCone } from '../../lights';
import { MARLOW_LEVEL } from '../../lighting/levels';
import { applyGreybox, boostWall } from '../ctcourseGreybox';
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
  p.register.push({ id: 'A1-3', element: 'Vehicle gate 3 x 3, chained: dressing on the wall face (a later step), no opening, no collision (A1-D3)' });

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
    for (const [x, z] of [[1.5, 9.5], [4.5, 9.5], [1.5, 12.5], [4.5, 12.5]] as const) kit.ledSlot(x, 3.2, z, 2.4, 0, { tone: 'warm', light: { radius: 4.6, intensity: 0.4, group: 10 } });
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
    b.light({ kind: 'spot', x: 10.25, y: 2.8, z: 14.75, radius: 13, intensity: 1.5, color: SODIUM, cone: makeCone(0.05, -0.3, -1, 0.85), group: 11, electric: true, destructible: true, fixture: { sx: 0.4, sy: 0.16, sz: 0.3, oy: 0.06 } });
  });
  tally(b, p.register, 'A1-6', 'Yard lamps group 12 (switch in the cabin by its door) and the cabin panel group 13 (switch by the door)', () => {
    for (const z of [5, 11, 17]) b.light({ x: A1_WALL.far + 0.25, y: 3.6, z, radius: 9, intensity: 1.25, color: SODIUM, group: 12, electric: true, destructible: true, fixture: { sx: 0.2, sy: 0.16, sz: 0.34, oy: 0.06 } });
    b.light({ x: 8.5, y: 2.45, z: 16.5, radius: 3.2, intensity: 0.6, color: PANEL_WHITE, group: 13, electric: true, destructible: true, fixture: { sx: 0.6, sy: 0.05, sz: 0.6, oy: 0.025 } });
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
  return p;
}
