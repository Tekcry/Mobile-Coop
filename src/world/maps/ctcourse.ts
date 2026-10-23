import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { LaserDef } from '../../game/jammer';
import type { LaserPanelDef } from '../../game/laserPanels';
import type { PassZone } from '../../game/ctDevices';
import type { ScannerDef } from '../../game/scanners';
import type { SecurityData } from '../../security/data';
import type { SquadSlot } from '../rooms';
import { GUARD_INFO_LINE_MAX, type GuardInfo } from '../../ai/guardInfo';
import type { LevelBuilder } from '../levelBuilder';
import type { BayDef, CourseDef, CourseDevice, GateDef } from '../../game/course/courseDef';
import { makeCone, type LightFixture } from '../lights';
import { bayCeiling, bayWalls, bulkheadCage, CELL_BANDS, doorFrame, emitter, floorLine, lidHaunches, liftDoors, pendantRods, plate, wallPaintZ } from './ctcourseBunker';
import { buildVariety } from './ctcourseVariety';

/**
 * Marlow Yard (CT prototype B1, `docs/ct-prototype/CTCOURSE-SPEC.md`): the training floor of a Cold War signals bunker
 * (marlow-bunker: ceilings, fittings, airlock lids), eight stations in CT's training order along +x, each a test cell of
 * the course framework (airlocks between them). Every number is a prototype starting value (G10). The station obstacles
 * are geometry plus a PLACEHOLDER door gate (pair / timed hold) so the course stays completable until slices B2-B8
 * build the real moves; each placeholder is marked in its label.
 * Reached by `?autostart=ctcourse&mode=course` (not listed). Old Fallow bunker: `?legacy=1&autostart=bunker`.
 */

/** Bay pitch along x: a 16 m bay plus a 6 m airlock. */
export const CT_PITCH = 22;
/** Bay length (x), airlock size and yard width (z). */
export const CT_BAY = 16;
export const CT_W = 14;
/** The obstacle wall sits this far into each bay. */
export const CT_OBST = 9;
/** Perimeter and airlock wall height (marlow-bunker: 6 -> 7.5, up to the high halls' ceiling); the ledge band (G57) is 4.3-4.5. */
export const FENCE = 7.5;
const LEDGE = 4.4;
const WALL = '#6a6f74';
const DARK = '#3f4348';
const CONC = '#52575c';
const WARN = '#c9a227';
const DOOR_Z0 = 6.4;
const DOOR_W = 1.2;
const MID = CT_W / 2;

export const bayX = (i: number): number => CT_PITCH * i;

/** The airlock pads' floor colour and the station 3 far end's (distinct: course-ready F5). */
export const AIRLOCK_PAD_COLOR = '#2f6b4a';
export const S3_PASS_COLOR = '#6f8296';
/**
 * The leg-up spot (bay x offset, z) at stations 2, 5 and 7, where the striped square sits: the booster's tested spot
 * (e2e-ctcourse `legUp(x0 + 8.0, 3 / 3.6)`), 0.5 m from the 1 m walls' face (0.85 m from the annex lip), beside the door.
 */
export const LEGUP_SPOT: readonly [number, number] = [8.0, 3.5];

/**
 * (marlow-bunker) Each test cell's ceiling (the slab's underside), station 1-8: the low cells 4.5 (S1, S3, S6, S8), the
 * laser cell 5.5 (the throw's arc), the high halls 7.5 (S2, S5, S7: 3.1 m over the 4.4 m tops). 0.4 m slabs.
 */
export const CT_CEIL: readonly number[] = [4.5, 7.5, 4.5, 5.5, 7.5, 4.5, 7.5, 4.5];
const SLAB = 0.4;
/** (marlow-bunker) The airlocks' inner lid (underside) and its lamp, a caged bulkhead under it. */
export const AIRLOCK_LID = 3.2;
/** (marlow-bunker) A fitting flush with a ceiling hangs its lamp this far under it. */
const FLUSH = 0.15;
export const AIRLOCK_LAMP_Y = AIRLOCK_LID - FLUSH;
/** Fittings (`LightDef.fixture`: an emissive housing that goes dark with its lamp; the bake never sees it). */
const STRIP: LightFixture = { sx: 1.6, sy: 0.06, sz: 0.2, oy: FLUSH - 0.03 };
const PENDANT: LightFixture = { sx: 1.2, sy: 0.08, sz: 0.22, oy: 0.08 };
const BULKHEAD: LightFixture = { sx: 0.3, sy: 0.2, sz: 0.3, oy: FLUSH - 0.1 };
const PANEL: LightFixture = { sx: 0.6, sy: 0.05, sz: 0.6, oy: FLUSH - 0.025 };
/** Cool white (render only: lamp colour never reaches gameplay) in place of the sodium look; station 4 faintly red. */
const WHITE: [number, number, number] = [0.85, 0.92, 1];
const LASER_RED: [number, number, number] = [1, 0.82, 0.8];
/** (marlow-bunker) The wall-top lamps of stations 2 and 7 and station 5's roof lamp: flush with the 7.5 m ceiling. */
export const HIGH_LAMP_Y = 7.5 - FLUSH;
/** (marlow-bunker) Station 5's annex lamps: flush panels under the 4.0 m roof slab. */
export const ANNEX_LAMP_Y = 4.0 - FLUSH;
/** (marlow-bunker) Lamps that moved to a ceiling, compensated so the levels the course was tuned on hold
 *  (`tests/ctcourseLight.test.ts`, `docs/marlow-bunker/LIGHT.md`). */
const LAMP_LOW = { intensity: 1.5, radius: 13 };
const LAMP_S4 = { intensity: 1.4, radius: 13 };
const S5_ROOF_LAMP = { intensity: 1.4, radius: 13 };
const AIRLOCK_LAMP = { intensity: 0.35, radius: 7 };
const S2_TOP_LAMP = { intensity: 0.5, radius: 4.4 };
const S7_TOP_LAMP = { intensity: 0.7, radius: 3.6 };
const ANNEX_LAMP = 0.8;
/** (marlow-jammer) Station 3's lamps [bay x, z, radius]: two over the hallway, one in each lobby. */
const S3_LAMPS: readonly (readonly [number, number, number])[] = [
  [6, 1.6, 8],
  [11, 1.6, 8],
  [1.5, MID, 11],
  [14.8, MID, 9],
];

/** Obstacle wall heights by station (1-based; none for the panel station and the S3 hallway): S6 and S8 run to the ceiling (bulkheads). */
const OBST_H: Record<number, number> = { 2: LEDGE, 4: CT_CEIL[3]!, 5: 4.0, 6: CT_CEIL[5]!, 7: LEDGE, 8: CT_CEIL[7]! };
/** Station 4: the header over the laser gap (its underside; the walls beside the gap run to the 5.5 m ceiling). */
export const S4_HEADER = 4.6;

/** The map's footprint. */
export const CT_BOUNDS = { minX: -1, maxX: bayX(7) + CT_BAY + 1, minZ: -1, maxZ: CT_W + 1 } as const;

/** Station 3: the course flag the far end sets (both players past the camera hallway). */
export const S3_FLAG = 's3-clear';

/**
 * (marlow-jammer, Michael item 5, A5) Station 3 is a camera hallway: from the entry lobby (bay x 0 - 3) a 2.9 m wide
 * hallway runs along the south wall (z 0.15 - 3.05) to the far lobby (x 13.6 - 16) in front of airlock A3; the rest of the
 * cell is sealed void. The camera hangs at the hallway's far end, 2.4 m up, looking back down it (west) with a +-8 deg
 * sweep: it covers the hallway end to end, and its walls keep its view inside the bay (the entry airlock is behind the
 * lobby's wall, the exit airlock behind the camera). One jam (5 s, then the 1.5 s reboot) covers one runner; the jammer
 * must stand still, so the partner who got through jams it from the far lobby for the other.
 * (sector-fixes C, item 3) It pitches down to the hallway floor 6.5 m in front of it (`aim`, pitch 20 deg): the frame
 * still covers standing and crouched heads from the hallway's mouth to the camera, but its top edge stays under the
 * 4.5 m ceiling, so the cue and detection watch the hallway, not the roof. Its range stays 18 m (the walls bound it).
 */
export const S3_HALL = { x0: bayX(2) + 3, x1: bayX(2) + 13.6, z0: 0.15, z1: 3.05, wallZ: 3.2 } as const;
export const S3_CAMERA = { x: bayX(2) + 15.6, z: 1.6, y: 2.4, facing: 270, sweep: [262, 278] as [number, number] };
/** (sector-fixes C, item 3) The floor point (m in front of the mount) station 3's camera pitches down to. */
export const S3_CAMERA_AIM = 6.5;
/**
 * (marlow-jammer fix round 1, Michael item 5: "impossible to pass without one player jamming") The hallway's hard rule
 * (`hallStep`, this station only): a player the camera has (its meter full) in the hallway, or still running in the far
 * lobby, goes back to this spot in the entry lobby, facing the hallway (+x), with `S3_BACK_RADIO`.
 */
export const S3_BACK: [number, number, number] = [bayX(2) + 1.5, 1.6, Math.PI / 2];
export const S3_BACK_RADIO = 'Camera saw you. Back to the start of the hallway.';
/** The far lobby: both players in it unlock the airlock's door (the gate); a player still running the hallway does not count. */
export const S3_PASS: PassZone = {
  id: 'p-s3',
  box: [bayX(2) + 13.8, 0.4, bayX(2) + 15.7, CT_W - 0.4],
  flag: S3_FLAG,
  // the hallway box runs up to the far lobby's edge (no gap between the two)
  // (fix round 2) the entry lobby (bay x 0 - 3, full width): a sent-back player must be seen there before counting again
  hall: { camera: 'cam-s3', box: [S3_HALL.x0, S3_HALL.z0, bayX(2) + 13.8, S3_HALL.z1], lobby: [bayX(2), 0, S3_HALL.x0, CT_W], back: S3_BACK, say: S3_BACK_RADIO },
};
/** The station 3 panel sits in the entry lobby (the other stations' at bay x 3.5). */
export const S3_PANEL_X = bayX(2) + 1.6;
/** Station 6 (B6): the course flag the paired scanners set (both hacks finished within the sync window). */
export const S6_FLAG = 's6-sync';
export const S6_SCANNERS: ScannerDef = { id: 'sc-s6', a: 'sw-s6-a', b: 'sw-s6-b', flag: S6_FLAG };
/** Station 4 (B4): the course flag the far-side release switch sets; it switches the laser band off for good (bay restart re-arms it). */
export const S4_FLAG = 's4-release';
/** Station 4: the open gap in the 3.5 m wall the laser band closes (z), wide enough to throw a partner through. */
export const S4_GAP: [number, number] = [4, 10];
/**
 * Station 4 laser band (B3 device, B4 layout): three beams across the whole gap in the wall plane. One player throws the
 * other over it (CT 1.3); the thrown one presses the release on the far side (CT's far-side release) and the band goes off.
 */
export const S4_LASER: LaserDef = { id: 'laser-s4', x1: bayX(3) + CT_OBST, z1: S4_GAP[0], x2: bayX(3) + CT_OBST, z2: S4_GAP[1], ys: [0.35, 0.9, 1.45], label: 'Laser', offFlag: S4_FLAG };
/**
 * (sector-fixes P, item 6) Station 4's laser power panel: on the far side's south ("right") wall, 4 m up, 3 m past the
 * gap (the red release is on the north wall). Round the corner and high: the wall beside the gap hides it from the near
 * side's south half; it is seen, and jammed, only diagonally through the gap from the near side's north half, about
 * `S4_PANEL_JAM` (12.4 m). Jamming it cuts the band for the jam and its reboot (the alternative to the throw; the throw
 * and the release stay the taught route). Electro shows it.
 */
export const S4_PANEL: LaserPanelDef = { id: 'panel-s4', lasers: ['laser-s4'], x: bayX(3) + 12, y: 4.0, z: 0.15, yaw: 0, label: 'Laser power panel' };
/** (sector-fixes P) A feet spot (x, z) on the near side the S4 panel is jammed from (the e2e and the map test use it). */
export const S4_PANEL_JAM: readonly [number, number] = [bayX(3) + 5.5, 10.5];
/** Station 7 (B7): the return stair's z (against the south wall, on the far side of the rope wall). */
export const S7_STAIR_Z = 1.0;
/** Station 5 (B5): the roof hatch (a skylight narrower than a body, 0.55 m: nobody walks or drops in, only a partner lowered
 *  head-first fits) over the annex's back room [x0, z0, x1, z1], and the hack panel under it (y = its reach height). */
export const S5_HATCH: [number, number, number, number] = [bayX(4) + 14.125, 1.0, bayX(4) + 14.675, 1.55];
export const S5_PANEL = { x: bayX(4) + 14.4, y: 1.2, z: 0.4 };
/**
 * (sector-fixes S, Michael 2026-10-22: "a security room with a guard watching the cameras. You can take him out and shut
 * off cameras") Station 3's security room in the void's north-east corner, entered from the far lobby through a plain
 * door in the cross wall `S3_HALL.x1` (z `door`), so the first runner still needs the partner's jam (A2). The duty
 * guard stands at the monitors (a passive training guard, A3); once he is down (knocked out or killed), the console on
 * the desk sets `S3_CAMS_OFF`, which switches off every camera whose `offFlag` it is (`cam-s3`) until the bay restarts.
 * An alternative to the second jam, not a replacement: both jams work unchanged (A11). `docs/sector-fixes/s/PLAN.md`.
 */
export const S3_SEC_GUARD = 's3-sec-guard';
export const S3_CONSOLE = 'sw-s3-console';
export const S3_CAMS_OFF = 'cams-off-s3';
/** The room's door gap in the far cross wall: its start z and an exact 1.2 m width (no float drift in the builder);
 *  `S3_SEC_ROOM.door` is the same gap as [start, end], its end written out (9.2 + 1.2 in floats is 10.399...). */
const S3_DOOR_Z = 9.2;
const S3_DOOR_W = 1.2;
export const S3_SEC_ROOM = { x0: bayX(2) + 7.6, x1: S3_HALL.x1, z0: 8, z1: CT_W, door: [S3_DOOR_Z, 10.4] as const } as const;
/** The duty guard's post: at the desk, facing -x (the monitors on the west wall), his back to the door. On a nav cell
 *  centre (cell 0.5 m, origin -1: a spawn snaps there), so he stands exactly on it. */
export const S3_SEC_POST = { x: bayX(2) + 9.25, z: 10.75, yaw: -Math.PI / 2 } as const;
/** LANTERN's second line as station 3 starts (A10): it names the room (<= 90 characters). */
export const S3_ROOM_RADIO = 'Security room off the far lobby: down its guard, and his console turns the camera off.';
const S3_SEC_INFO: GuardInfo = { lines: ['All right! The desk console switches the hallway camera off.'] };
/** The room's ceiling panel (on the cell's circuit: electric, destructible, as the other station 3 lamps). */
const S3_ROOM_LAMP = { x: bayX(2) + 10.6, z: 11.0, intensity: 0.8, radius: 6 };

const SECURITY: SecurityData = {
  devices: [{ id: 'cam-s3', kind: 'camera', level: 'ground', at: [S3_CAMERA.x, S3_CAMERA.z], y: S3_CAMERA.y, aim: S3_CAMERA_AIM, facing: S3_CAMERA.facing, sweep: S3_CAMERA.sweep, reason: 'Training camera for the jam handoff hallway', offFlag: S3_CAMS_OFF }],
};

/**
 * (PR 3, Michael 2026-10-20 08:40: "Add one in Marlow Yard") The training guard with information, station 1: a guard on
 * his post by the south wall, facing east (away from the start), so the grab from behind is the first thing in reach.
 * He sees and hears nothing (a training guard) and stands until he is taken. Held, INTERROGATE (hold A) gets two short
 * lines out of him: where the two wall medkits are (the annex's north wall, station 5; the north wall before the last
 * wall, station 8: `medkitWalls` below). One interrogation per guard (a bay restart brings a fresh one). The lines are
 * the guard's own subtitle (docs/story.md: British, 90 characters or less, written to be voiced later).
 */
export const GUARD_SLOT = 's1-guard';
export const GUARD_INFO: GuardInfo = {
  lines: ['Easy! There is a medkit on the north wall of the annex.', 'And one on the north side, before the last wall. That is all I know.'],
};
if ([...GUARD_INFO.lines, ...S3_SEC_INFO.lines].some((l) => l.length > GUARD_INFO_LINE_MAX)) throw new Error('ctcourse: a guard line is over the radio length');
/** The training guard's post (bay 1, x 10.5, z 3.2), facing +x (yaw pi / 2: 0 is +z). (sector-fixes S) Station 3's duty
 *  guard in the security room, passive too (A3): he stands his post until he is taken. */
export const SQUADS: Record<string, SquadSlot> = {
  [GUARD_SLOT]: { kind: 'grunt', x: 10.5, z: 3.2, yaw: Math.PI / 2, passive: true, info: GUARD_INFO },
  [S3_SEC_GUARD]: { kind: 'grunt', x: S3_SEC_POST.x, z: S3_SEC_POST.z, yaw: S3_SEC_POST.yaw, passive: true, info: S3_SEC_INFO },
};

/** The exit zone (G138, last bay): both players inside ends the course. */
export const CT_EXIT_ZONE = { box: [bayX(7) + 11.5, 3, bayX(7) + 15.5, 11] as [number, number, number, number], floorY: 0 };

const dev = (x: number, z: number, yaw: number, label: string, y = 0): CourseDevice => ({ x, y, z, yaw, label });
const SOUTH = 0;
const NORTH = Math.PI;

/** A cross wall at x with a door gap and a lintel over it; returns the door's anchor id. */
function crossWall(b: LevelBuilder, x: number, h: number, thick = 0.3): number {
  b.wallZ(x, 0, CT_W, [[DOOR_Z0, DOOR_Z0 + DOOR_W]], h, WALL, thick);
  b.box(x, (2.1 + h) / 2, DOOR_Z0 + DOOR_W / 2, thick, h - 2.1, DOOR_W, WALL);
  doorFrame(b, x, thick, DOOR_Z0, DOOR_W);
  return b.door(x, 0, DOOR_Z0, DOOR_W, 0).id;
}

/** Floor marking squares (CT's striped contextual-move squares): visual only. */
function mark(b: LevelBuilder, x: number, z: number, w = 1.6, d = 1.6, color = WARN): void {
  b.box(x, 0.01, z, w, 0.02, d, color, 0, 0, false);
}

/** A panel's text is at most this many characters (its banner shows for 1.8 s; course-ready F18). */
export const PANEL_TEXT_MAX = 120;

/** The panel text of each station (an optional read: what to do here). Pad and keyboard words (course-ready F14). */
export const PANEL_TEXT: readonly string[] = [
  'Step onto the airlock pad at the end with your partner to go on',
  'Wall: crouch + Co-op (RB / F) boosts your partner; Y / Space climbs up. They unbolt the door (A / E) on the far side',
  'Seen in the hallway: back to the start. LB / Tab to the pistol, X draws; aim LT / RMB, stand still, hold Co-op (RB / F)',
  'Laser: a beam trips the alarm (NV shows it). Co-op (RB / F) throws your partner; press the red release on the left wall',
  'Annex: leg-up and relay onto the roof (Y / Space climbs up). Press both roof plates (A / E) together',
  'Scanners: one each. Press A / E at your scanner and stay; both hacks must finish within 1.5 s. Start on two green lights',
  'High wall: leg-up one; on top, face back down and Co-op (RB / F) drops a rope. Partner: climb it, Y / Space at the top',
  'Last wall: through the doorway, then both of you into the lit zone to finish',
];

/** LANTERN's line as each station starts (<= 90 characters). */
export const RADIO_ENTER: readonly string[] = [
  'Marlow Yard. Both of you onto the airlock pad at the end, then through.',
  'Wall one. Crouch + Co-op (RB / F): a leg-up. Unbolt the far door from the other side.',
  'Camera hallway. One jams it (aim LT / RMB, hold Co-op (RB / F), stand still); one runs.',
  'Laser line. Stand, Co-op (RB / F): throw your partner. Red release on the left wall.',
  'Annex roof: leg-up and relay. Then both roof plates together.',
  'Two scanners, one each. Start the hacks together (A / E) and stay put. A fail hurts.',
  'High wall. Leg-up one; the one on top drops a rope (RB / F) for the other.',
  'Last wall. Cross, then both of you into the lit zone.',
];

/** LANTERN's line when a station's gate opens, keyed by gate id: it names the next step (course-ready F2). */
export const GATE_RADIO: Readonly<Record<string, string>> = {
  'g-s2': 'Unbolted. Open the door for your partner.',
  'g-s3': 'Both through. Airlock door unlocked. Open it (A / E).',
  'g-s3-cams': 'Cameras off. Your partner can walk the hallway.',
  'g-s4': 'Laser down. Both of you through, then onto the airlock pad.',
  'g-s5': 'Plates done. Crouch at the hatch, face it, Co-op (RB / F): lower your partner to hack.',
  'g-s5-grid': 'Grid open. Off the roof, in the front door, through the grid to the airlock.',
  'g-s6': 'Scanners synced. Door open. On to the airlock pad.',
};

/** Each station's task, the HUD's step line while the bay has no drills (<= 90 characters; course-ready F1). */
export const OBJECTIVE_TEXT: readonly string[] = [
  'Read the panel if you like, then both of you onto the airlock pad.',
  'Leg-up your partner over the wall (crouch, RB / F); they unbolt the door on the far side.',
  'Jam the camera while your partner runs the hallway; from the far end, they jam it for you.',
  'Throw your partner over the laser (RB / F); they press the red release on the left wall.',
  'Leg-up and relay onto the roof, press both plates, lower your partner through the hatch.',
  'One at each scanner: press A / E together and stay until both hacks finish.',
  'Leg-up one onto the wall; on top, face back down and drop the rope (RB / F) for the other.',
  'Through the doorway, then both of you into the lit zone to finish.',
];

function courseDef(): CourseDef {
  const gates = (n: number): GateDef[] => {
    switch (n) {
      case 1:
        return [];
      case 2:
        // B2: the door is bolted from the far side; the boosted player opens it for the partner (CT's first wall). The side
        // test is at the door plane (course-ready F7): any feet past the leaf count as the bolt side; the near side is refused
        return [{ kind: 'bolt', id: 'g-s2', doorId: 'S2-door', side: [1, 0], at: [bayX(1) + CT_OBST, DOOR_Z0 + DOOR_W / 2] }];
      case 3:
        // (marlow-jammer) the airlock's door unlocks once BOTH stand in the far lobby (the pass zone): each one ran the
        // hallway under the other's jam
        // (sector-fixes S) the security console: a pickup that gates nothing (as the panels); its flag switches the camera
        // off (`cam-s3.offFlag`). CourseMode refuses it while the duty guard is up (`course.consoles`)
        return [
          { kind: 'flag', id: 'g-s3', flag: S3_FLAG, doorId: 'A3-near' },
          { kind: 'pickup', id: 'g-s3-cams', switchId: S3_CONSOLE, flag: S3_CAMS_OFF, perPlayer: false },
        ];
      case 4:
        // B4: the partner throw over the laser band; the thrown player's far-side release switches the band off
        return [{ kind: 'pickup', id: 'g-s4', switchId: 'sw-s4-release', flag: S4_FLAG, perPlayer: false }];
      case 6:
        // B6: the paired scanners (CtDevices): both hacks finished within the sync window set the flag
        return [{ kind: 'flag', id: 'g-s6', flag: S6_FLAG, doorId: 'S6-door' }];
      case 7:
        // B7: a solid wall, no door: leg-up one, the one on top drops the two-person rope for the other (nobody is left
        // below to boost); the airlock waits for both. A far-side stair lets a lone player back up (never stranded).
        return [];
      case 5:
        return [
          { kind: 'pair', id: 'g-s5', a: 'sw-s5-a', b: 'sw-s5-b', doorId: 'S5-door' },
          { kind: 'lever', id: 'g-s5-grid', switchId: 'sw-s5-hack', doorId: 'S5-grid' },
        ];
      case 8:
        // B8: the final beat: an open doorway in the last wall, then both players into the lit exit zone (G138)
        return [];
      default:
        return [{ kind: 'timedHold', id: `g-s${n}`, holdId: `h-s${n}`, doorId: `S${n}-door` }];
    }
  };
  const bays: BayDef[] = [];
  for (let n = 1; n <= 8; n++) {
    const own = gates(n);
    bays.push({
      id: `S${n}`,
      entry: n === 1 ? 'start' : `A${n - 1}`,
      exit: n === 8 ? 'end' : `A${n}`,
      // (PR 3) station 1: the training guard with information; (sector-fixes S) station 3: the security room's duty guard
      squad: n === 1 ? [GUARD_SLOT] : n === 3 ? [S3_SEC_GUARD] : [],
      // one optional panel per station (F1b, Michael's pick): it only says what to do, no gate waits on it
      gates: [...own, { kind: 'pickup', id: `g-p${n}`, switchId: `sw-p${n}`, flag: `panel-${n}`, perPlayer: false }],
      radio: [
        { at: 'enter', text: RADIO_ENTER[n - 1]! },
        ...(n === 3 ? [{ at: 'enter', text: S3_ROOM_RADIO }] : []),
        ...own.flatMap((g) => (GATE_RADIO[g.id] ? [{ at: g.id, text: GATE_RADIO[g.id]! }] : [])),
      ],
      drills: [],
      elements: [],
    });
  }
  return {
    id: 'ctcourse',
    objectives: OBJECTIVE_TEXT.map((text, i) => ({ id: `o-s${i + 1}`, bay: `S${i + 1}`, text })),
    airlocks: Array.from({ length: 7 }, (_, i) => {
      const n = i + 1;
      return { id: `A${n}`, box: [bayX(i) + CT_BAY, 4, bayX(i) + CT_BAY + 6, 10] as [number, number, number, number], floorY: 0, nearDoor: `A${n}-near`, farDoor: `A${n}-far` };
    }),
    bays,
    exitZone: CT_EXIT_ZONE,
    externalFlags: [S3_FLAG, S6_FLAG],
  };
}

/**
 * Marlow Yard. Plan (x east, z north, floor 0): the gallery is 14 m wide; bay i spans x = 22 i .. 22 i + 16 and its airlock
 * 22 i + 16 .. 22 i + 22. Obstacle walls stand at bay x + 9 (full width, one 1.2 m placeholder door); station 5 is a
 * roofed annex (roof top 4.4) with a second internal wall (the hack grid). Every cell and airlock has a ceiling (`CT_CEIL`,
 * `AIRLOCK_LID`).
 */
export const ctcourse: MapDef = {
  id: 'ctcourse',
  name: 'Marlow Yard',
  description: 'Training floor of an old signals bunker: eight test cells for two (prototype greybox).',
  // (marlow-bunker) underground: no moon, a dark sky nobody sees, close fog. Michael (2026-10-20) kept the open floor at
  // 0.30 after the moon went: the whole 0.30 is fill now (was 0.25 fill + 0.05 moon), the render fill matching it
  theme: {
    sky: '#050608',
    horizon: '#0b0d10',
    ground: '#2a2d30',
    fogStart: 40,
    fogEnd: 120,
    sunDir: [-0.3, -1, -0.2],
    sunIntensity: 0,
    ambient: 0.3,
    lightLevel: 0.3,
    floor: 'concrete',
    grade: { tint: [0.97, 0.98, 1.0], saturation: 0.75, contrast: 1.1 },
  },
  modes: ['course'],
  build(b): MapLayout {
    b.bounds = { ...CT_BOUNDS };
    const length = bayX(7) + CT_BAY;
    b.floor(length / 2, MID, length, CT_W, CONC);
    // the bunker's perimeter walls: north, south, west and east ends (7.5 m, up to the high halls' ceiling)
    b.wallX(0, 0, length, [], FENCE, DARK);
    b.wallX(CT_W, 0, length, [], FENCE, DARK);
    b.wallZ(0, 0, CT_W, [], FENCE, DARK);
    b.wallZ(length, 0, CT_W, [], FENCE, DARK);
    // (marlow-bunker item 7) the entry lift lobby (west, behind the start) and the goods lift (east, behind the exit zone)
    liftDoors(b, 0.15, 1, MID, 2.4, 2.6);
    liftDoors(b, length - 0.15, -1, MID, 3.6, 3.0);
    const doors: Record<string, number> = {};
    const devices: Record<string, CourseDevice> = {};
    /** A fitting flush with the ceiling (a recessed strip, lamp `FLUSH` under it). */
    const flush = (x: number, ceil: number, intensity: number, radius = 13, z = MID, fixture = STRIP, color = WHITE): void =>
      void b.light({ x, y: ceil - FLUSH, z, radius, intensity, color, fixture });
    /** A pendant at y on two 0.04 m rods from the ceiling (the high halls: today's lamp heights, so no light change). */
    const pendant = (x: number, y: number, ceil: number, intensity: number, radius: number): void => {
      b.light({ x, y, z: MID, radius, intensity, color: WHITE, fixture: PENDANT });
      pendantRods(b, x, y + PENDANT.oy + PENDANT.sy / 2, MID, ceil);
    };
    /** Boxes from `from` on: overhead (no nav surface) and without ledges (the ceilings, lids and walls that meet them). */
    const sealed = (from: number): void => void b.mark(from, { overhead: true, noLedge: true });

    for (let i = 0; i < 8; i++) {
      const n = i + 1;
      const x0 = bayX(i);
      const ceil = CT_CEIL[i]!;
      const high = ceil >= 7;
      // (marlow-bunker item 1) the cell's ceiling: one 0.4 m slab over the whole bay
      let from = b.boxes.length;
      b.box(x0 + CT_BAY / 2, ceil + SLAB / 2, MID, CT_BAY, SLAB, CT_W, DARK);
      sealed(from);
      // (item 2) the bay lamps: pendants at today's 5 m in the high halls; flush strips in the low cells (5 -> 4.35,
      // 0.9 -> 0.83 for the shorter throw) and the laser cell (5 -> 5.35, faintly red)
      const ceilingLamps: number[] = [];
      if (high) {
        pendant(x0 + 4, 5, ceil, 1.6, 13);
        // (course-ready S2) station 5: lamp B is over the annex roof, so bodies on the roof (plates, relay lip, hatch) read
        // lit; now flush with the 7.5 m ceiling (6.8 -> 7.35)
        if (n === 5) {
          flush(x0 + 12.5, ceil, S5_ROOF_LAMP.intensity, S5_ROOF_LAMP.radius);
          ceilingLamps.push(x0 + 12.5);
        } else pendant(x0 + 12.5, 5, ceil, 1.6, 13);
      } else if (n === 3) {
        // (marlow-jammer) the hallway: two strips over it, one in each lobby; all jammable. The camera sees by its own IR
        // (M3), so these light the hallway for the players and the meter, not for the camera
        for (const [dx, z, r] of S3_LAMPS) flush(x0 + dx, ceil, LAMP_LOW.intensity, r, z);
        for (const [dx] of S3_LAMPS) ceilingLamps.push(x0 + dx);
        // (sector-fixes S) the security room's ceiling panel (jammable and shootable like the rest)
        flush(S3_ROOM_LAMP.x, ceil, S3_ROOM_LAMP.intensity, S3_ROOM_LAMP.radius, S3_ROOM_LAMP.z, PANEL);
        ceilingLamps.push(S3_ROOM_LAMP.x);
      } else {
        const k = n === 4 ? LAMP_S4 : LAMP_LOW;
        for (const dx of [4, 12.5]) flush(x0 + dx, ceil, k.intensity, k.radius, MID, STRIP, n === 4 ? LASER_RED : WHITE);
        ceilingLamps.push(x0 + 4, x0 + 12.5);
      }
      if (n === 2) ceilingLamps.push(x0 + CT_OBST + 0.9);
      if (n === 7) ceilingLamps.push(x0 + CT_OBST);
      // (item 4) ribs, haunches, LED strips, panel seams and the cell's colour band (visual)
      bayCeiling(b, x0, x0 + CT_BAY, ceil, CT_W, ceilingLamps);
      bayWalls(b, x0, x0 + CT_BAY, ceil, CT_W, CELL_BANDS[i]!);
      if (i < 7) {
        // (course-ready S2) the airlock's utility lamp: the green pad and both doors readable; its walls, lid and shut doors
        // keep it in. (marlow-bunker item 3) a caged bulkhead under the 3.2 m lid (4.6 -> 3.05, 0.5 -> 0.35)
        const ax = x0 + CT_BAY + 3;
        flush(ax, AIRLOCK_LID, AIRLOCK_LAMP.intensity, AIRLOCK_LAMP.radius, MID, BULKHEAD);
        bulkheadCage(b, ax, MID, AIRLOCK_LID, AIRLOCK_LID - 0.25);
        // the airlock A(n): cross walls at both planes, side walls, the pockets beside it are sealed void
        doors[`A${n}-near`] = crossWall(b, x0 + CT_BAY, FENCE);
        doors[`A${n}-far`] = crossWall(b, x0 + CT_PITCH, FENCE);
        b.wallX(4, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        b.wallX(10, x0 + CT_BAY, x0 + CT_PITCH, [], FENCE, DARK);
        // (item 3) the decontamination lock's inner lid (3.2 m) with 45 deg haunches along its side walls
        from = b.boxes.length;
        b.box(ax, AIRLOCK_LID + SLAB / 2, MID, 6, SLAB, 6, DARK);
        sealed(from);
        lidHaunches(b, x0 + CT_BAY + 0.15, x0 + CT_PITCH - 0.15, AIRLOCK_LID, [4.15, 9.85]);
        mark(b, x0 + CT_BAY + 3, MID, 4, 4, AIRLOCK_PAD_COLOR);
      }
      if (n === 4) {
        // B4: a wide gap in the wall, closed only by the laser band (layout.lasers); no door. (item 5) The wall runs to the
        // 5.5 m ceiling beside the gap; a header over the gap from 4.6 m (the throw's arc passes under it)
        from = b.boxes.length;
        b.wallZ(x0 + CT_OBST, 0, CT_W, [S4_GAP], OBST_H[4]!, WALL, 0.3);
        b.box(x0 + CT_OBST, (S4_HEADER + ceil) / 2, (S4_GAP[0] + S4_GAP[1]) / 2, 0.3, ceil - S4_HEADER, S4_GAP[1] - S4_GAP[0], WALL);
        b.mark(from, { noLedge: true });
        // (item 6) the beam emitters on the gap's two wall ends
        emitter(b, x0 + CT_OBST, S4_GAP[0], 1, S4_LASER.ys);
        emitter(b, x0 + CT_OBST, S4_GAP[1], -1, S4_LASER.ys);
        mark(b, x0 + CT_OBST - 1.6, MID);
        mark(b, x0 + CT_OBST + 2.2, MID);
      } else if (n === 3) {
        // (marlow-jammer, item 5) the camera hallway: its north wall, and the two cross walls that close the void behind
        // it from the lobbies; all to the ceiling (no lip)
        from = b.boxes.length;
        b.wallX(S3_HALL.wallZ, S3_HALL.x0, S3_HALL.x1, [], ceil, WALL, 0.3);
        b.wallZ(S3_HALL.x0, S3_HALL.wallZ, CT_W, [], ceil, WALL, 0.3);
        // (sector-fixes S) the far cross wall has the security room's door; the room's west and south walls close it off
        // from the rest of the void (to the ceiling, no lip), a lintel over the door to the ceiling
        const R = S3_SEC_ROOM;
        b.wallZ(S3_HALL.x1, S3_HALL.wallZ, CT_W, [R.door], ceil, WALL, 0.3);
        b.box(R.x1, (2.1 + ceil) / 2, S3_DOOR_Z + S3_DOOR_W / 2, 0.3, ceil - 2.1, S3_DOOR_W, WALL);
        b.wallZ(R.x0, R.z0, R.z1, [], ceil, WALL, 0.3);
        b.wallX(R.z0, R.x0, R.x1, [], ceil, WALL, 0.3);
        b.mark(from, { noLedge: true });
        doorFrame(b, R.x1, 0.3, S3_DOOR_Z, S3_DOOR_W);
        // a plain unlocked door (not a course door: nothing gates it)
        b.door(R.x1, 0, S3_DOOR_Z, S3_DOOR_W, 0);
      } else if (n === 7) {
        // B7: the 4.4 m wall, 1 m thick (a top to stand on and hold the rope), full width, no door
        b.wallZ(x0 + CT_OBST, 0, CT_W, [], OBST_H[7]!, WALL, 1.0);
        mark(b, x0 + LEGUP_SPOT[0], LEGUP_SPOT[1], 1, 1);
      } else if (n === 8) {
        // B8: the last wall keeps its doorway open (no door, no console): the end is both players in the exit zone.
        // (item 5) a bulkhead to the ceiling
        const h = OBST_H[8]!;
        from = b.boxes.length;
        b.wallZ(x0 + CT_OBST, 0, CT_W, [[DOOR_Z0, DOOR_Z0 + DOOR_W]], h, WALL, 0.3);
        b.box(x0 + CT_OBST, (2.1 + h) / 2, DOOR_Z0 + DOOR_W / 2, 0.3, h - 2.1, DOOR_W, WALL);
        b.mark(from, { noLedge: true });
        doorFrame(b, x0 + CT_OBST, 0.3, DOOR_Z0, DOOR_W);
        mark(b, x0 + CT_OBST + 1.6, MID);
      } else if (n >= 2) {
        const h = OBST_H[n]!;
        // station 2 is a 1 m thick wall (a top deep enough to climb onto, LEDGE.climbDepth); the rest keep the thin one.
        // (item 5) stations 3 and 6 run to the ceiling (bulkheads with their door): no lip at the top
        from = b.boxes.length;
        doors[`S${n}-door`] = crossWall(b, x0 + CT_OBST, h, n === 2 ? 1.0 : 0.3);
        if (h >= ceil) b.mark(from, { noLedge: true });
        // stations 2 and 5: the near square marks the tested leg-up spot beside the door (course-ready F11)
        if (n === 2 || n === 5) mark(b, x0 + LEGUP_SPOT[0], LEGUP_SPOT[1], 1, 1);
        else mark(b, x0 + CT_OBST - 1.6, MID);
        mark(b, x0 + CT_OBST + 1.6, MID);
      }
    }

    // One optional panel at the start of each station (F1b): it says what to do; the station's action opens the way.
    for (let n = 1; n <= 8; n++) {
      const x = n === 3 ? S3_PANEL_X : bayX(n - 1) + 3.5;
      devices[`sw-p${n}`] = dev(x, CT_W - 0.4, NORTH, PANEL_TEXT[n - 1]!);
      b.box(x, 1.4, CT_W - 0.2, 1.4, 0.9, 0.08, '#20252b', 0, 0, false);
      mark(b, x, CT_W - 2);
    }

    // 2 Leg-up wall (4.4 ledge band, 1 m thick): a bolt on the far side of the door (B2)
    // (course-ready S2) a small wall-top lamp over the far side: the wall top, the drop and the bolt / door area.
    // (marlow-bunker) flush with the high hall's ceiling (6.6 -> 7.35)
    let x0 = bayX(1);
    flush(x0 + CT_OBST + 0.9, CT_CEIL[1]!, S2_TOP_LAMP.intensity, S2_TOP_LAMP.radius, 5.0);
    // (item 6) the leg-up spot's mark carried up the wall face under the lip (stations 2, 5 and 7: the same element)
    for (const i of [1, 4, 6]) wallPaintZ(b, bayX(i) + CT_OBST - (i === 4 ? 0.15 : 0.5), -1, LEGUP_SPOT[1] - 0.5, LEGUP_SPOT[1] + 0.5, LEDGE - 0.55, LEDGE - 0.1, WARN);

    // 3 Camera hallway (marlow-jammer): the camera device (layout.security) at the hallway's far end; the far lobby (the
    // pass zone) is marked pale blue-grey, not the airlock pads' green (course-ready F5). The old sweep lines are gone.
    mark(b, (S3_PASS.box[0] + S3_PASS.box[2]) / 2, MID, S3_PASS.box[2] - S3_PASS.box[0], 4, S3_PASS_COLOR);
    // (sector-fixes S) the security console on the room's desk (`ctcourseVariety.securityDesk`), facing the room (+x)
    devices[S3_CONSOLE] = dev(bayX(2) + 8.55, 11.6, Math.PI / 2, 'Security console: cameras off', 0.9);

    // 4 Laser line (B4): the laser band (layout.lasers) across the wall's gap; the release switch is on the far side
    x0 = bayX(3);
    devices['sw-s4-release'] = dev(x0 + 12, CT_W - 0.4, NORTH, 'Laser release');
    b.box(x0 + 12, 1.3, CT_W - 0.2, 0.7, 0.9, 0.12, '#5a1d1d', 0, 0, false);

    // 5 Annex: roofed (top 4.4), internal grid wall at +12.5, computer, wall medkit
    x0 = bayX(4);
    // the roof slab starts flush with the front wall face so the lip hangs over a flat face (B2: leg-up + relay target)
    // (B5) a roof hatch over the back room (behind the grid wall, reached only from above): the slab in four pieces round it
    const [hx0, hz0, hx1, hz1] = S5_HATCH;
    b.box((x0 + 8.85 + hx0) / 2, 4.2, MID, hx0 - x0 - 8.85, 0.4, CT_W, DARK);
    b.box((hx1 + x0 + 16) / 2, 4.2, MID, x0 + 16 - hx1, 0.4, CT_W, DARK);
    b.box((hx0 + hx1) / 2, 4.2, hz0 / 2, hx1 - hx0, 0.4, hz0, DARK);
    b.box((hx0 + hx1) / 2, 4.2, (hz1 + CT_W) / 2, hx1 - hx0, 0.4, CT_W - hz1, DARK);
    b.noLedge((hx0 + hx1) / 2, (hz0 + hz1) / 2, 1.0);
    // the tell: a striped frame round the hatch and the holder's square beside it (CT's marked spot)
    b.box((hx0 + hx1) / 2, LEDGE + 0.01, hz1 + 0.05, hx1 - hx0 + 0.2, 0.02, 0.1, WARN, 0, 0, false);
    b.box((hx0 + hx1) / 2, LEDGE + 0.01, hz1 + 0.75, 1.2, 0.02, 1.0, WARN, 0, 0, false);
    // (item 6) the hatch's cover, hinged open flat beside it on the roof (16.3.2: a hatch has a cover); 4 cm, no collision
    plate(b, hx1 + 0.3, LEDGE, (hz0 + hz1) / 2, 0.55, 0.55);
    doors['S5-grid'] = crossWall(b, x0 + 12.5, 4.0);
    // (marlow-bunker) the annex lamps: flush panels under the 4.0 m roof slab (3.4 -> 3.85, 0.9 -> 1.0)
    flush(x0 + 11, 4.0, ANNEX_LAMP, 8, MID, PANEL);
    // (course-ready S2) back room: the lamp moved south over the hack panel (clear of the hatch), a second one north over the medkit
    flush(x0 + 14.2, 4.0, ANNEX_LAMP, 8, 3.0, PANEL);
    flush(x0 + 14.6, 4.0, ANNEX_LAMP, 6, 11.5, PANEL);
    // both players must be ON the roof (leg-up one, relay the other) to press the roof plates together
    devices['sw-s5-a'] = dev(x0 + 11, 3.6, SOUTH, 'Roof plate A (press with B)', LEDGE);
    devices['sw-s5-b'] = dev(x0 + 11, CT_W - 3.6, NORTH, 'Roof plate B (press with A)', LEDGE);
    b.box(x0 + 11, LEDGE + 0.01, 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    b.box(x0 + 11, LEDGE + 0.01, CT_W - 3.6, 1.2, 0.02, 1.2, WARN, 0, 0, false);
    // (B5) the hack panel low on the back room's south wall, under the hatch: the hanging partner reaches it head-first
    // (lowered past about 2.3 m); a player dropped into the room can press it from the floor (never stuck there)
    devices['sw-s5-hack'] = dev(S5_PANEL.x, S5_PANEL.z, SOUTH, 'Hack panel (hang down through the roof hatch)', S5_PANEL.y);
    b.box(S5_PANEL.x, 1.4, 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);

    // 6 Paired scanners, ten metres apart
    x0 = bayX(5);
    devices['sw-s6-a'] = dev(x0 + 5, 0.4, SOUTH, 'Retinal scanner A (hack)');
    devices['sw-s6-b'] = dev(x0 + 5, CT_W - 0.4, NORTH, 'Retinal scanner B (hack)');
    b.box(x0 + 5, 1.4, 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);
    b.box(x0 + 5, 1.4, CT_W - 0.2, 0.9, 0.9, 0.08, '#20252b', 0, 0, false);
    // (item 6) the two-person rule's "pair" line painted from scanner A to scanner B
    floorLine(b, x0 + 5, 0.9, x0 + 5, CT_W - 0.9, 0.1);

    // 7 (B7) Rope wall: 4.4 m solid; the holder's striped strip on its top; a far-side return stair (1.1 m rises) so a
    // player alone on the far side can always climb back (never stranded)
    x0 = bayX(6);
    // (course-ready S2) a wall-top lamp over the holder strip, above a standing holder's head. (marlow-bunker) flush with
    // the 7.5 m ceiling (6.6 -> 7.35)
    flush(x0 + CT_OBST, CT_CEIL[6]!, S7_TOP_LAMP.intensity, S7_TOP_LAMP.radius);
    b.box(x0 + CT_OBST, LEDGE + 0.01, MID, 0.9, 0.02, 3, WARN, 0, 0, false);
    // (item 6) the rope's anchor plate in the holder strip (3 cm, no collision)
    plate(b, x0 + CT_OBST, LEDGE + 0.02, MID, 0.3, 0.3, '#8d949b', 0.03);
    for (let k = 1; k <= 3; k++) {
      const h = 1.1 * (4 - k);
      b.box(x0 + CT_OBST + 0.5 + k - 0.5, h / 2, S7_STAIR_Z, 1.0, h, 1.2, CONC);
    }
    // (LR16-W C2) the stair light: one LED wall bulkhead on the south wall over the stair head (light point 0.15 m off the
    // wall face at z 0.15, under the haunch toe at 6.5), a forward-down cone; reach 4 m (radius 2.5) stops it short of the
    // S7 corners and of the floor. Step 1 (head 4.9) sits in its near field, so a night level of 0.05 lights it
    // (0.31 -> 0.46); steps 2 / 3 hardly move (docs/sector-redesign/checks/lr16w-c2-build.md).
    b.light({
      kind: 'spot',
      x: x0 + CT_OBST + 1,
      y: 6.4,
      z: 0.3,
      radius: 2.5,
      intensity: 0.05,
      color: WHITE,
      cone: makeCone(0, -0.819, 0.574, 0.96),
      fixture: { sx: 0.3, sy: 0.16, sz: 0.07, oy: 0, model: 'bulkhead', base: 'wall', yaw: 0, mount: 0 },
    });

    // 8 The lit exit zone (B8: the wall keeps an open doorway, built with the walls above)
    mark(b, (CT_EXIT_ZONE.box[0] + CT_EXIT_ZONE.box[2]) / 2, MID, CT_EXIT_ZONE.box[2] - CT_EXIT_ZONE.box[0], CT_EXIT_ZONE.box[3] - CT_EXIT_ZONE.box[1], '#2f8f5a');

    // (marlow-variety) what each cell is: sentry post, monitor wall, plant rooms and booths, kill-house plywood, the
    // vestibule's frames and racks, training blocks, the exit coffer, hazard frames (`ctcourseVariety.ts`)
    buildVariety(b, CT_CEIL, S7_STAIR_Z);

    const navSeeds = Array.from({ length: 8 }, (_, i) => new Vector3(bayX(i) + 3, 0, MID));
    return {
      playerSpawns: [
        { pos: new Vector3(2, 0, MID - 1), yaw: Math.PI / 2 },
        { pos: new Vector3(2, 0, MID + 1), yaw: Math.PI / 2 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      // wall medkit stations (G180): the annex (north wall, station 5) and before the last wall
      medkitWalls: [
        { pos: new Vector3(bayX(4) + 15, 0, CT_W - 0.4), yaw: NORTH },
        { pos: new Vector3(bayX(7) + 2, 0, CT_W - 0.4), yaw: NORTH },
      ],
      navSeeds,
      security: SECURITY,
      lasers: [S4_LASER],
      laserPanels: [S4_PANEL],
      passZones: [S3_PASS],
      scanners: [S6_SCANNERS],
      course: { def: courseDef(), doors, devices, squads: SQUADS, consoles: [{ id: S3_CONSOLE, guard: S3_SEC_GUARD, flag: S3_CAMS_OFF }] },
      // (G3, AUDIT-CAMERA row 1) the yard reads as open (the 2.8 m camera, the whole body in frame); the 6 m airlocks and
      // the roofed annex (under its 4.2 m slab) are tight (1.8 m). Its roof is open again (feet at 4.4).
      camSize: 'open',
      camSpaces: [
        ...Array.from({ length: 7 }, (_, i) => ({ box: [bayX(i) + CT_BAY, 4, bayX(i) + CT_PITCH, 10] as const, size: 'tight' as const })),
        { box: [bayX(4) + CT_OBST, 0, bayX(4) + CT_BAY, CT_W], y: [-1, 3.9], size: 'tight' },
        // (sector-fixes S) the 5.7 m security room
        { box: [S3_SEC_ROOM.x0, S3_SEC_ROOM.z0, S3_SEC_ROOM.x1, S3_SEC_ROOM.z1], size: 'tight' },
      ],
    };
  },
};
