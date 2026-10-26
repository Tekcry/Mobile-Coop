/**
 * J14 Marlow re-plan, A5 the Substation (slice G-A5; PLAN section 2 and A19, STATIONS.md sections 3, 5, 6, 8, 9, 10 SA5 /
 * SA10 / SA11 / SA13): stations 11 (chimney pair), 12 (swing pass) and 13 (the throw). The set file builds the built yard
 * less what this file moves (its `opts.replan` guards: the drum stack and its dressing, the beam panel, the two east-wall
 * apron bulkheads and the apron switch, the floor paint over the trench); this file adds:
 * - the 6 m perimeter wall x 67.85-68.35 (`noLedge`), the 1.4 m gap x 68.35-69.75 to L4's outer face closed by 6 m cross
 *   walls at z 30 and 36 (clear z 30.25-35.75: L4's far door opens into it), the sealed dead space north and south of it
 *   under lids at the wall top (a player on the wall top never drops into it), the wall top `a5-walltop` and the fixed
 *   access ladder on the wall's inside face; station 11's stand-in, the wicket `A5-wicket` (gate `g-a5-wicket`, a latching
 *   flag gate the base opens while `chimneyPair` is not playable);
 * - the open cable trench x 62.35-65.85 (3.5 m, floor -1.6; `FLOOR_HOLES`), its walls `noLedge` (no lip on either face),
 *   step irons on the east face at both ends (a fall is a walk back); the cable-tray gantry over it at z 44.6 (dressing: a
 *   steel frame and its pipe at `A5_GANTRY_PIPE_Y`); the swing bar on its east edge at z 42.4-43.6 (Swing Pass's anchor,
 *   marlow-kit-geo Q2, `A5_SWING_BAR`); the trench plates z 39.0-42.0, hoarded, gated at the west end
 *   by `g-a5-plates` (bolted: the swung player opens it from the west side, then a way both ways); station 12's stand-in,
 *   the hoarded footbridge z 36.4-37.6, door `A5-footbridge` (gate `g-a5-footbridge`, latching like the wicket);
 * - the moved pieces: the drum stack on the west strip's north end (clear of the plates -> throw mark path, of `A5_HIDE` and
 *   4 m off the beam line), its dressing and the cable laid in; the two apron bulkheads and the apron switch on the new
 *   wall's inside face at their z; the beam panel inside the switchroom (out of jam reach from the apron);
 * - the closed routes (Q24): the switchroom back door `A5-back` locked for good (a flag gate on a flag nothing sets, as G-A3's
 *   offices), the north trench path fenced at both ends to the wall top;
 * - the second guard `a5-watcher` (Michael ~20:40 "12, add two"): a static grunt beside the release kiosk facing east down
 *   the floodlit strip;
 * - the stations (STATIONS section 3, verbatim), the new done flags' pass zones (section 8), LANTERN's retry lines (section
 *   6), the objective lines; station 13's flood window and beam trip run in `src/game/course/replan/a5Ticks.ts`.
 * - (marlow-kit-wire) the kit spots `a5-chimney` (Chimney Pair, the gap) and `a5-swing` (Swing Pass, the gantry pipe), placed
 *   unconditionally (inert while their ids are off); with an id on, its station's objective names the move.
 * Only type imports from `../` besides the set file's constants and two pure course modules (`kitApi`, `stationDef`) (the
 * facility imports nothing from here).
 */
import { retryKey, type BoltGate, type CourseObjective, type FlagGate } from '../../../../game/course/courseDef';
import { kitMoveOn, type StationDef } from '../../../../game/course/stationDef';
import { addKitSpot } from '../../../../game/kit/kitApi';
import type { LaserPanelDef } from '../../../../game/laserPanels';
import type { FacilityKit } from '../../../kit/facilityKit';
import type { LevelBuilder } from '../../../levelBuilder';
import { MARLOW_LEVEL } from '../../../lighting/levels';
import type { FloorHole } from '../../ctcourseGreybox';
import { A5_BACK_DOOR, A5_PANEL, A5_PATROL, A5_RELEASE_FLAG, A5_ROOM } from '../a5Substation';
import { HALL_H, tally, type SetPart } from '../types';

// ---------------------------------------------------------------------------------------------------- the geometry

/** The cable trench (SA10, lead J14 wave 2: 1.15 m west of the drawing): x 62.35-65.85, the set's full depth, floor -1.6. */
export const A5_CABLE_TRENCH = { x0: 62.35, x1: 65.85, z0: 24.25, z1: 47.75, floor: -1.6, wall: 0.3 } as const;
/** Holes this set cuts in the site slab (world metres [x0, z0, x1, z1]); `ctcourse.ts` hands every set's table to the facility. */
export const FLOOR_HOLES: readonly FloorHole[] = [[A5_CABLE_TRENCH.x0, A5_CABLE_TRENCH.z0, A5_CABLE_TRENCH.x1, A5_CABLE_TRENCH.z1]];

/** The perimeter wall (A19, SA10): faces x 67.85 (inside, the apron) and 68.35 (the gap), 6 m, z 24.25-47.75: its runs meet the shell walls' faces. */
export const A5_PERIM = { x0: 67.85, x1: 68.35, h: 6, z0: 24.25, z1: 47.75 } as const;
/** The 1.4 m gap (Michael ~20:40 "1.4 m", A19) between the wall and L4's outer face, closed by 0.5 m cross walls at z 30 and 36. */
export const A5_GAP = { x0: 68.35, x1: 69.75, z0: 30.25, z1: 35.75, cross: [30, 36], t: 0.5 } as const;
/** The wall top over the gap (graph `a5-walltop`): the chimney's arrival, the ladder's head. */
export const A5_WALLTOP = { x0: 67.85, x1: 68.35, z0: 30.25, z1: 35.75, y: 6 } as const;
/** Station 11's stand-in: the wicket in the perimeter wall facing L4's far door (1.2 x 2.1, opening onto the apron). */
export const A5_WICKET_DOOR = 'A5-wicket';
export const A5_WICKET_GATE = 'g-a5-wicket';
export const A5_WICKET_FLAG = 'a5-wicket';
export const A5_WICKET = { z0: 32.4, z1: 33.6, h: 2.1 } as const;
/** The fixed access ladder on the wall's inside face (the climbing line 0.15 m off it), the apron to the wall top. */
export const A5_LADDER = { x: 67.7, z: 31.0, y0: 0, y1: 6 } as const;
/** The step irons on the trench's east face at both ends (ladders, the climber facing east); (marlow-play-2 C18) a third in
 *  the open slot between the footbridge's deck and the plates' (z 37.7-38.9), so a fall there needs no crawl under a deck. */
export const A5_IRONS: readonly { x: number; z: number }[] = [
  { x: 65.7, z: 25.0 },
  { x: 65.7, z: 38.3 },
  { x: 65.7, z: 47.0 },
];
/** Station 12's stand-in: the hoarded footbridge (1.2 m clear at z 36.4-37.6), its door at the east end. */
export const A5_FOOTBRIDGE_DOOR = 'A5-footbridge';
export const A5_FOOTBRIDGE_GATE = 'g-a5-footbridge';
export const A5_FOOTBRIDGE_FLAG = 'a5-footbridge';
export const A5_FOOTBRIDGE = { z0: 36.4, z1: 37.6 } as const;
/** The trench plates (3 m, z 39.0-42.0), hoarded like the footbridge, gated at the west end (a 1.2 m door, bolted from the west). */
export const A5_PLATES_DOOR = 'A5-plates';
export const A5_PLATES_GATE = 'g-a5-plates';
export const A5_PLATES = { z0: 39.0, z1: 42.0, door: [39.9, 41.1] } as const;
/** A crossing's deck thickness (its top flush with the floor), the hoarding's height and thickness. */
export const A5_DECK_T = 0.15;
export const A5_HOARD = { h: 2.4, t: 0.1 } as const;
/** The cable-tray gantry over the trench: two posts on the trench edges, a top beam (dressing since marlow-kit-geo Q2: its
 *  posts stand on both edges of its line and the drums leave 0.55 m of landing there, so the swing moved to `A5_SWING_BAR`). */
export const A5_GANTRY = { z: 44.6, xw: 62.2, xe: 66.0, post: 0.15, top: 3.4, beam: 0.2 } as const;
/** The gantry pipe's and the swing bar's height over the apron floor (m): Swing Pass's band 2.2-2.8 m. */
export const A5_GANTRY_PIPE_Y = 2.6;
/**
 * (marlow-kit-geo Q2) The swing bar, Swing Pass's anchor (station 12): a short bar along the trench's east edge on two posts
 * (z 42.4 and 43.6, x 65.85-66.0), its pipe at `A5_GANTRY_PIPE_Y`, visual only (no anchor: nobody hand-traverses it alone).
 * The swing line z 43.0 runs between the posts (1.05 m clear, a body's 0.6 m with 0.22 m each side) and lands on the west
 * strip 0.9 m clear of the plates' hoarding (z 42.1) and of the drums (z 43.9): 4.2 m of landing to the west strip's wall
 * (`A5_WALL.near` 58.15), the band's 0.75 m with room to spare.
 */
export const A5_SWING_BAR = { z: 43.0, posts: [42.4, 43.6], x0: 65.85, x1: 66.0, post: 0.15, top: 2.75 } as const;
/** The drum stack moved to the west strip's north end: 4 m and more off the beam line (`BEAM_KEEP_CLEAR`), clear of the path
 *  from the plates to the throw mark and of `A5_HIDE`; two drums end to end, two rows side by side (as built). */
export const A5_DRUMS_RP = { x0: 59.6, x1: 61.8, z0: 43.9, z1: 47.5, h: 1.8 } as const;
export const A5_DRUM_ROWS_RP = [44.8, 46.6] as const;
/** The cable laid in from the stack through the gateway (z 38.1 at the line) to the landing's pocket. */
export const A5_CABLE_RP: readonly (readonly [number, number])[] = [[59.6, 44.8], [58.9, 43.4], [58.7, 38.3], [57.2, 37.9], [55.4, 37.4], [54.2, 36.6]];
/** The two apron bulkheads (0.2 m off the wall, as built) and the apron switch (0.05 m off it, as built), moved onto the new wall's inside
 *  face (x 67.85) at the same z. */
export const A5_BULKHEADS_RP = [
  { x: 67.65, z: 29.5 },
  { x: 67.65, z: 38.5 },
] as const;
export const A5_SW_APRON_RP = { x: 67.8, y: 1.2, z: 36.0 } as const;
/** The beam panel moved inside the switchroom (on its south wall's inner face, facing into the room): out of every jam line from
 *  the apron, so the beams are beaten only by the throw and switched off by the release. */
export const A5_PANEL_RP: LaserPanelDef = { ...A5_PANEL, x: 42.2, y: 2.4, z: A5_ROOM.z0 + A5_ROOM.t / 2, yaw: 0 };
/** The switchroom back door, locked for good (Q24): built locked and unbreachable, and held shut by a flag gate on a flag nothing sets. */
export const A5_BACK_GATE = 'g-a5-back';
export const A5_NEVER_FLAG = 'a5-never';
/** The north trench path's closers (Q24): fencing to the wall top (6 m) at its west end (behind the switchroom, the back door's
 *  strip) and its east end (between pen 2's bund and the inner wall). */
export const A5_CLOSERS: readonly { x0: number; x1: number; z0: number; z1: number }[] = [
  { x0: 45.95, x1: 46.15, z0: 46.15, z1: 47.75 },
  { x0: 55.75, x1: 57.85, z0: 45.5, z1: 45.6 },
];
export const A5_CLOSER_H = 6;

// ------------------------------------------------------------------------------------- the guard, stations, lines

/** The second guard (STATIONS section 9 `a5-watcher`*): static beside the release kiosk, facing east down the floodlit strip.
 *  The post is the brief's (46.5, 32.0) moved 1 m south-west: clear of the patrol's K -> R2 leg round the kiosk and over the
 *  1.8 m close-notice reach from the kiosk's press spot, so the floodlight alone decides whether he sees the crossing. */
export const A5_WATCHER = 'a5-watcher';
export const A5_WATCHER_POST = { x: 46.0, z: 31.0, yaw: Math.PI / 2 } as const;

/** The new done flags' pass zones (STATIONS section 8): both players on the apron's east strip, then on its west strip. */
export const A5_APRON_E_FLAG = 'a5-apron-e';
export const A5_APRON_W_FLAG = 'a5-apron-w';
export const A5_APRON_E: [number, number, number, number] = [65.85, 24.3, 67.85, 47.7];
export const A5_APRON_W: [number, number, number, number] = [58.2, 24.3, 62.35, 47.7];

/** Stations 11-13 (STATIONS.md section 3, the A5 block). */
export const A5_SUBSTATION_STATIONS: readonly StationDef[] = [
  { n: 11, id: 'a5-chimney', lesson: 'chimney_pair', retry: 'none', doneFlag: 'a5-apron-e', kit: 'chimneyPair', standIn: 'g-a5-wicket',
    marks: [{ x: 69.0, z: 32.3, y: 0, yaw: -Math.PI / 2 }, { x: 69.0, z: 33.7, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-wicket'] },
  { n: 12, id: 'a5-swing', lesson: 'swing_pass', retry: 'none', doneFlag: 'a5-apron-w', kit: 'swingPass', standIn: 'g-a5-footbridge',
    marks: [{ x: 67.0, z: 33.0, y: 0, yaw: -Math.PI / 2 }, { x: 67.0, z: 34.5, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-footbridge', 'g-a5-plates'] },
  { n: 13, id: 'a5-throw', lesson: 'throw', retry: 'station', doneFlag: 'a5-release', drillS: 9,
    marks: [{ x: 59.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }, { x: 56.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }],
    guards: ['a5-patrol', 'a5-watcher'], gates: ['g-a5-release', 'laser-a5'] },
];

/** LANTERN's lines when station 13 retries (STATIONS section 6; 11 and 12 cannot fail). */
export const A5_RETRY_SEEN = 'Seen in the floodlight. Back behind the transformer.';
export const A5_RETRY_TIMER = 'The floodlight came back. Back behind the transformer.';

/** (marlow-kit-wire) Stations 11 and 12's objectives while `chimneyPair` / `swingPass` is on (the built texts are the stand-ins'). */
export const A5_CHIMNEY_KIT_TEXT = 'Back to back up the gap to the wall top, then down its ladder onto the apron.';
export const A5_SWING_KIT_TEXT = 'Swing one of you over the trench from the pipe; the swung one unbolts the plates.';

/** The bay's objective lines on the re-plan: one per station (what and where), then the holding-room line. */
export const A5_OBJECTIVES: readonly CourseObjective[] = [
  { id: 'a5-wall', bay: 'A5', text: 'Through the wicket door in the wall onto the apron.', done: { flag: A5_APRON_E_FLAG } },
  { id: 'a5-trench', bay: 'A5', text: "Cross the cable trench to the apron's west side: footbridge or plates.", done: { flag: A5_APRON_W_FLAG } },
  {
    id: 'a5-throw',
    bay: 'A5',
    text: 'Throw one of you over the beams, jam the kiosk floodlight, key the release.',
    a: 'Throw your partner from the mark, then jam the floodlight through the gateway.',
    b: 'Land behind the transformer, cross under the jam and key the release at the kiosk.',
    done: { flag: A5_RELEASE_FLAG },
  },
  { id: 'a5-lock', bay: 'A5', text: 'Beams are off. Both of you into holding room five.' },
];

const GREY = '#6a6f74';
const STEEL = '#5c6268';
const HOARD = '#8a7a52';
const PLATE = '#575c60';
const DRUM = '#4a3a2a';
const WHITE: [number, number, number] = [0.96, 0.97, 1.0];
/** Dressing colours (visual skins, `noLedge`, a side under 5 cm: out of the canonical light shapes) for the moved drums and fittings. */
const LOOK = { timber: '#8d6e47', cable: '#1b1c1e', steel: '#6a7077', steelDark: '#3a3f44', pipe: '#7d8286', yellow: '#c9a227', seam: '#2f3336' } as const;
const SKIN = 0.03;

/** Add the re-plan's pieces to `b` and amend `part` (the merge reads it afterwards). */
export function replanA5Substation(b: LevelBuilder, _kit: FacilityKit, part: SetPart): void {
  const p = part;
  /** A collide box from x0 to x1, z0 to z1, y0 to y1, `noLedge` unless told otherwise. */
  const solid = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string, o: { noLedge?: boolean; overhead?: boolean } = {}): void => {
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
    b.mark(from, { noLedge: o.noLedge ?? true, ...(o.overhead ? { overhead: true } : {}) });
  };
  /** A visual skin (no collision, `noLedge`, one side under `CANON_MIN_THICK`). */
  const skin = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: string, pitch = 0): void => {
    if (Math.min(x1 - x0, y1 - y0, z1 - z0) >= 0.05) throw new Error(`replan a5: the skin at (${x0}, ${y0}, ${z0}) is not thin`);
    const from = b.boxes.length;
    b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, pitch, false);
    b.mark(from, { noLedge: true });
  };
  const T = A5_CABLE_TRENCH;

  // ---- A5-R1: the perimeter wall, the gap, the wicket, the sealed dead space (station 11) ----
  tally(b, p.register, 'A5-R1', "Perimeter wall x 67.85-68.35, 6 m (noLedge, no lip on either face), with the wicket A5-wicket (1.2 x 2.1, z 32.4-33.6) under a header to the top; 6 m cross walls at z 30 and 36 close the 1.4 m gap x 68.35-69.75 (clear z 30.25-35.75, L4's far door opens into it); the dead space north and south of it is sealed under lids at the wall top (noLedge, overhead)", () => {
    const W = A5_PERIM;
    const G = A5_GAP;
    solid(W.x0, W.x1, W.z0, A5_WICKET.z0, 0, W.h, GREY);
    solid(W.x0, W.x1, A5_WICKET.z1, W.z1, 0, W.h, GREY);
    solid(W.x0, W.x1, A5_WICKET.z0, A5_WICKET.z1, A5_WICKET.h, W.h, GREY, { overhead: true });
    for (const z of G.cross) solid(G.x0, G.x1, z - G.t / 2, z + G.t / 2, 0, W.h, GREY);
    solid(G.x0, G.x1, 24.25, G.cross[0] - G.t / 2, W.h - 0.1, W.h, GREY, { overhead: true });
    solid(G.x0, G.x1, G.cross[1] + G.t / 2, 47.75, W.h - 0.1, W.h, GREY, { overhead: true });
    // the wicket: hinge on its south jamb, the leaf along +z, opening west onto the apron (clear of station 11's marks in the gap)
    p.doors[A5_WICKET_DOOR] = b.door((W.x0 + W.x1) / 2, 0, A5_WICKET.z0, A5_WICKET.z1 - A5_WICKET.z0, 0, { height: A5_WICKET.h, swing: -1, locked: true, breachable: false }).id;
  });
  tally(b, p.register, 'A5-R2', "The wall's fixed access ladder on its inside face (x 67.7, z 31.0), the apron to the wall top a5-walltop (6 m)", () => {
    b.ladder(A5_LADDER.x, A5_LADDER.z, A5_LADDER.y0, A5_LADDER.y1, Math.PI / 2, STEEL);
  });

  // ---- A5-R3: the cable trench (station 12): floor, walls, step irons on the east face at both ends ----
  tally(b, p.register, 'A5-R3', 'Open cable trench x 62.35-65.85, z 24.25-47.75 (the slab cut by FLOOR_HOLES), floor -1.6, walls under the slab on all four sides (noLedge: no lip on either face, no co-op lip); step irons on the east face at both ends (z 25.0 and 47.0) and between the two decks (z 38.3): a fall is a walk back', () => {
    solid(T.x0, T.x1, T.z0, T.z1, T.floor - 0.4, T.floor, GREY);
    solid(T.x0 - T.wall, T.x0, T.z0 - 0.25, T.z1 + 0.25, T.floor - 0.4, -0.4, GREY);
    solid(T.x1, T.x1 + T.wall, T.z0 - 0.25, T.z1 + 0.25, T.floor - 0.4, -0.4, GREY);
    solid(T.x0, T.x1, T.z0 - 0.25, T.z0, T.floor - 0.4, -0.4, GREY);
    solid(T.x0, T.x1, T.z1, T.z1 + 0.25, T.floor - 0.4, -0.4, GREY);
    for (const s of A5_IRONS) b.ladder(s.x, s.z, T.floor, 0, Math.PI / 2, STEEL, 0.4, 0.3);
  });

  /** A hoarded crossing over the trench: its deck (top flush with the floor) and 2.4 m hoarding on both edges. */
  const crossing = (z0: number, z1: number): void => {
    const H = A5_HOARD;
    solid(T.x0, T.x1, z0 - H.t, z1 + H.t, -A5_DECK_T, 0, PLATE);
    solid(T.x0, T.x1, z0 - H.t, z0, 0, H.h, HOARD);
    solid(T.x0, T.x1, z1, z1 + H.t, 0, H.h, HOARD);
  };
  // ---- A5-R4: the footbridge (station 12's stand-in) ----
  tally(b, p.register, 'A5-R4', "Hoarded footbridge over the trench, 1.2 m clear at z 36.4-37.6 (deck flush, 2.4 m hoarding both sides, noLedge), its door A5-footbridge at the east end (station 12's stand-in, gate g-a5-footbridge) under a head to the hoarding's top", () => {
    const F = A5_FOOTBRIDGE;
    crossing(F.z0, F.z1);
    solid(T.x1 - A5_HOARD.t / 2, T.x1 + A5_HOARD.t / 2, F.z0, F.z1, A5_WICKET.h, A5_HOARD.h, HOARD);
    // hinge on the south jamb, the leaf along +z, opening west into the bridge (it never closes the 2 m strip)
    p.doors[A5_FOOTBRIDGE_DOOR] = b.door(T.x1, 0, F.z0, F.z1 - F.z0, 0, { height: A5_WICKET.h, swing: -1, locked: true, breachable: false }).id;
  });
  // ---- A5-R5: the trench plates (the swing's way back) ----
  tally(b, p.register, 'A5-R5', 'Trench plates z 39.0-42.0 (3 m: flush chequer plate, 2.4 m hoarding both sides), closed at the west end by hoarding and the 1.2 m door A5-plates (gate g-a5-plates, bolted: the swung player opens it from the west side, then a way both ways)', () => {
    const P = A5_PLATES;
    const H = A5_HOARD;
    crossing(P.z0, P.z1);
    solid(T.x0 - H.t / 2, T.x0 + H.t / 2, P.z0, P.door[0], 0, H.h, HOARD);
    solid(T.x0 - H.t / 2, T.x0 + H.t / 2, P.door[1], P.z1, 0, H.h, HOARD);
    solid(T.x0 - H.t / 2, T.x0 + H.t / 2, P.door[0], P.door[1], A5_WICKET.h, H.h, HOARD);
    p.doors[A5_PLATES_DOOR] = b.door(T.x0, 0, P.door[0], P.door[1] - P.door[0], 0, { height: A5_WICKET.h, swing: 1, locked: true, breachable: false }).id;
  });
  // ---- A5-R6: the cable-tray gantry (KS4's swing anchor) ----
  tally(b, p.register, 'A5-R6', `Cable-tray gantry over the trench at z 44.6: two 0.15 m posts on the trench edges and a top beam at 3.2-3.4 m (noLedge), its pipe across at ${A5_GANTRY_PIPE_Y} m (visual, no anchor; dressing: the swing's anchor is the swing bar, A5-R10)`, () => {
    const G = A5_GANTRY;
    const z0 = G.z - G.post / 2;
    const z1 = G.z + G.post / 2;
    solid(G.xw, G.xw + G.post, z0, z1, 0, G.top, STEEL);
    solid(G.xe - G.post, G.xe, z0, z1, 0, G.top, STEEL);
    solid(G.xw, G.xe, z0, z1, G.top - G.beam, G.top, STEEL, { overhead: true });
    skin(G.xw + G.post, G.xe - G.post, A5_GANTRY_PIPE_Y - 0.022, A5_GANTRY_PIPE_Y + 0.022, G.z - 0.022, G.z + 0.022, LOOK.pipe);
    // two drop rods from the beam to the pipe's ends
    for (const x of [G.xw + G.post + 0.05, G.xe - G.post - 0.05]) skin(x - 0.015, x + 0.015, A5_GANTRY_PIPE_Y, G.top - G.beam, G.z - 0.015, G.z + 0.015, LOOK.steel);
  });
  // ---- A5-R10: the swing bar (station 12's Swing Pass anchor, marlow-kit-geo Q2) ----
  tally(b, p.register, 'A5-R10', `(marlow-kit-geo Q2) Swing bar on the trench's east edge: two 0.15 m posts (x 65.85-66.0, z 42.4 and 43.6, 2.75 m, noLedge) and the bar between them along the edge at ${A5_GANTRY_PIPE_Y} m (visual, no anchor): Swing Pass's anchor, its line z 43.0 clear between the posts to the west strip`, () => {
    const S = A5_SWING_BAR;
    const h = S.post / 2;
    for (const z of S.posts) solid(S.x0, S.x1, z - h, z + h, 0, S.top, STEEL);
    const xm = (S.x0 + S.x1) / 2;
    skin(xm - 0.022, xm + 0.022, A5_GANTRY_PIPE_Y - 0.022, A5_GANTRY_PIPE_Y + 0.022, S.posts[0] + h, S.posts[1] - h, LOOK.pipe);
  });

  // ---- A5-10: the drum stack, moved to the west strip; A5-R7 its dressing and the cable laid in ----
  const D = A5_DRUMS_RP;
  tally(b, p.register, 'A5-10', 'Cable-drum stack 1.8 m, moved to the west strip (x 59.6-61.8, z 43.9-47.5): one collide box, a solo-standable top 5.1 m off the beam line (BEAM_KEEP_CLEAR 4.0), clear of the plates -> throw mark path and of the hide spot', () => {
    solid(D.x0, D.x1, D.z0, D.z1, 0, D.h, DRUM, { noLedge: false });
  });
  tally(b, p.register, 'A5-R7', "Drum stack dressing (visual skins, no collision): octagonal timber flanges and wound cable on the two end faces, lagging on the sides, steel straps over the top, the laydown outline, and the cable laid in through the gateway to the landing's pocket", () => {
    const tan = Math.tan(Math.PI / 8);
    for (const zc of A5_DRUM_ROWS_RP) {
      for (const [x, dir] of [[D.x1, 1], [D.x0, -1]] as const) {
        for (const [ap, color, off] of [[0.9, LOOK.timber, 0.015], [0.62, LOOK.cable, 0.045]] as const) {
          for (let k = 0; k < 4; k++) skin(x + dir * off - SKIN / 2, x + dir * off + SKIN / 2, 0.9 - ap * tan, 0.9 + ap * tan, zc - ap, zc + ap, color, (k * Math.PI) / 4);
        }
      }
    }
    for (const [z, out] of [[D.z0, -1], [D.z1, 1]] as const) {
      skin(D.x0, D.x1, 0.12, D.h - 0.12, out < 0 ? z - SKIN : z, out < 0 ? z : z + SKIN, LOOK.cable);
      for (const y of [0.5, 0.9, 1.3]) skin(D.x0 + 0.1, D.x1 - 0.1, y, y + 0.02, out < 0 ? z - 2 * SKIN : z + SKIN, out < 0 ? z - SKIN : z + 2 * SKIN, LOOK.seam);
    }
    skin(D.x0, D.x1, D.h, D.h + SKIN, D.z0, D.z1, LOOK.cable);
    for (const z of A5_DRUM_ROWS_RP) skin(D.x0, D.x1, D.h + SKIN, D.h + 2 * SKIN, z - 0.03, z + 0.03, LOOK.steelDark);
    skin(D.x0 - 0.2, D.x1 + 0.2, 0, 0.012, D.z0 - 0.2, D.z0 - 0.1, LOOK.yellow);
    skin(D.x0 - 0.2, D.x0 - 0.1, 0, 0.012, D.z0 - 0.1, D.z1, LOOK.yellow);
    skin(D.x1 + 0.1, D.x1 + 0.2, 0, 0.012, D.z0 - 0.1, D.z1, LOOK.yellow);
    const c = A5_CABLE_RP;
    for (let i = 1; i < c.length; i++) {
      const [x0, z0] = c[i - 1]!;
      const [x1, z1] = c[i]!;
      const len = Math.sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0));
      const from = b.boxes.length;
      b.box((x0 + x1) / 2, 0.02, (z0 + z1) / 2, 0.04, 0.04, len, LOOK.cable, Math.atan2(x1 - x0, z1 - z0), 0, false);
      b.mark(from, { noLedge: true });
    }
  });

  // ---- A5-R8: the apron bulkheads and switch, moved onto the new wall's inside face (circuit 50) ----
  tally(b, p.register, 'A5-R8', "Apron 50's two east bulkheads moved onto the perimeter wall's inside face (67.65, 29.5) and (67.65, 38.5), each with its bracket; the apron switch a5-sw-apron moved beside them (67.8, 1.2, 36.0) with its back box", () => {
    const w = A5_PERIM.x0;
    for (const l of A5_BULKHEADS_RP) {
      b.light({ x: l.x, y: 3.5, z: l.z, radius: 9, intensity: 1.2, color: WHITE, group: 50, electric: true, destructible: true, fixture: { sx: 0.2, sy: 0.16, sz: 0.34, oy: 0.06 } });
      skin(w - 0.06, w - 0.03, 3.36, 3.68, l.z - 0.16, l.z + 0.16, LOOK.steelDark);
      skin(w - 0.1, w - 0.06, 3.5, 3.54, l.z - 0.1, l.z + 0.1, LOOK.steel);
      skin(w - 0.1, w - 0.06, 3.58, 3.62, l.z - 0.1, l.z + 0.1, LOOK.steel);
      skin(w - 0.06, w - 0.03, 3.0, 3.36, l.z - 0.02, l.z + 0.02, LOOK.pipe);
    }
    skin(w - 0.04, w - 0.02, 1.05, 1.35, A5_SW_APRON_RP.z - 0.15, A5_SW_APRON_RP.z + 0.15, LOOK.steelDark);
  });
  p.switches.push({ id: 'a5-sw-apron', group: 50, pos: { ...A5_SW_APRON_RP }, yaw: -Math.PI / 2 });

  // ---- A5-3: the beam panel, moved inside the switchroom; A5-R9: the closed routes (Q24) ----
  p.laserPanels.push({ ...A5_PANEL_RP });
  p.register.push({ id: 'A5-3', element: `Beam power panel panel-a5 moved inside the switchroom, on its south wall's inner face (${A5_PANEL_RP.x}, ${A5_PANEL_RP.y}, ${A5_PANEL_RP.z}), facing into the room: out of every jam line from the apron (a laser panel, no builder piece)` });
  tally(b, p.register, 'A5-R9', "The north trench path closed at both ends (Q24): fencing to the wall top (6 m, noLedge) behind the switchroom's north-east corner (x 45.95-46.15, z 46.15-47.75) and between pen 2's bund and the inner wall (x 55.75-57.85, z 45.5-45.6); the switchroom back door A5-back locked for good (built locked and unbreachable, held shut by gate g-a5-back on a flag nothing sets)", () => {
    for (const c of A5_CLOSERS) solid(c.x0, c.x1, c.z0, c.z1, 0, A5_CLOSER_H, STEEL);
  });
  const back = b.anchors.doors.find((d) => d.id === p.doors[A5_BACK_DOOR]);
  if (!back) throw new Error('replan a5: the switchroom back door is missing');
  back.locked = true;
  back.breachable = false;
  p.bay.gates.push({ kind: 'flag', id: A5_BACK_GATE, flag: A5_NEVER_FLAG, doorId: A5_BACK_DOOR } satisfies FlagGate);
  p.externalFlags.push(A5_NEVER_FLAG);
  // the trench under the set's standby zone (its floor at -1.6): the same standby fill
  p.ambientZones.push({ id: 'A5-trench', box: [62, 24, 66, 48], ambient: MARLOW_LEVEL.standby, minY: A5_CABLE_TRENCH.floor - 0.5, maxY: HALL_H - 0.1 });

  // ---- the gates: the stand-ins (latching flag gates the base opens) and the plates' bolt ----
  p.bay.gates.push(
    { kind: 'flag', id: A5_WICKET_GATE, flag: A5_WICKET_FLAG, doorId: A5_WICKET_DOOR } satisfies FlagGate,
    { kind: 'flag', id: A5_FOOTBRIDGE_GATE, flag: A5_FOOTBRIDGE_FLAG, doorId: A5_FOOTBRIDGE_DOOR } satisfies FlagGate,
    { kind: 'bolt', id: A5_PLATES_GATE, doorId: A5_PLATES_DOOR, side: [-1, 0], at: [T.x0, (A5_PLATES.door[0] + A5_PLATES.door[1]) / 2] } satisfies BoltGate,
  );
  p.externalFlags.push(A5_WICKET_FLAG, A5_FOOTBRIDGE_FLAG, A5_APRON_E_FLAG, A5_APRON_W_FLAG);
  // (marlow-kit-wire) the kit spots (inert while their ids are off): Chimney Pair in the gap (its floor centre, across the
  // shaft toward the wall, the wall top as the exit), Swing Pass from the swing bar on the trench's near (east) edge
  const gp = A5_GAP;
  addKitSpot(b.anchors, { id: 'a5-chimney', kind: 'chimneyPair', x: (gp.x0 + gp.x1) / 2, y: 0, z: (gp.z0 + gp.z1) / 2, yaw: -Math.PI / 2, w: gp.x1 - gp.x0, h: A5_WALLTOP.y, x2: (A5_WALLTOP.x0 + A5_WALLTOP.x1) / 2, z2: (gp.z0 + gp.z1) / 2 });
  const tr = A5_CABLE_TRENCH;
  addKitSpot(b.anchors, { id: 'a5-swing', kind: 'swingPass', x: tr.x1, y: A5_GANTRY_PIPE_Y, z: A5_SWING_BAR.z, yaw: -Math.PI / 2, w: tr.x1 - tr.x0, y2: 0 });
  p.passZones.push(
    { id: 'a5-p-apron-e', box: A5_APRON_E, flag: A5_APRON_E_FLAG, floorY: 0 },
    { id: 'a5-p-apron-w', box: A5_APRON_W, flag: A5_APRON_W_FLAG, floorY: 0 },
  );

  // ---- the guards: the patrol as built, the watcher at the kiosk ----
  if (!p.bay.squad.includes(A5_PATROL)) throw new Error('replan a5: the patrol is missing');
  p.squads[A5_WATCHER] = { kind: 'grunt', x: A5_WATCHER_POST.x, z: A5_WATCHER_POST.z, yaw: A5_WATCHER_POST.yaw };
  p.bay.squad.push(A5_WATCHER);

  // ---- the stations, LANTERN's retry lines, the objective lines ----
  p.bay.stations = A5_SUBSTATION_STATIONS;
  p.bay.radio.push({ at: retryKey('a5-throw'), text: A5_RETRY_SEEN }, { at: retryKey('a5-throw', true), text: A5_RETRY_TIMER });
  p.objectives.length = 0;
  // (marlow-kit-wire, A6) the kit-on lines are chosen as the set builds, from this page's own `kitMoves`
  const kitText = (o: CourseObjective): string => (o.id === 'a5-wall' && kitMoveOn('chimneyPair') ? A5_CHIMNEY_KIT_TEXT : o.id === 'a5-trench' && kitMoveOn('swingPass') ? A5_SWING_KIT_TEXT : o.text);
  p.objectives.push(...A5_OBJECTIVES.map((o) => ({ ...o, text: kitText(o) })));

  // ---- spaces, nav seeds, debug points, light and shot spots (the drums' vantage moves with them) ----
  p.camSpaces.push({ box: [A5_GAP.x0, A5_GAP.z0, A5_GAP.x1, A5_GAP.z1], size: 'tight' });
  p.navSeeds.push({ x: 60.5, y: 0, z: 37.0 }, { x: (T.x0 + T.x1) / 2, y: T.floor, z: 30.0 }, { x: (A5_WALLTOP.x0 + A5_WALLTOP.x1) / 2, y: A5_WALLTOP.y, z: 33.0 });
  const entry = p.debugPoints.find((d) => d.id === 'A5-entry');
  if (entry) Object.assign(entry, { label: 'Set 5 entry (L4 door, the gap)', pos: { x: 69.0, y: 0, z: 33.0 } });
  const vantage = p.debugPoints.find((d) => d.id === 'A5-vantage');
  if (vantage) Object.assign(vantage, { label: 'Set 5 vantage (the west strip at the gateway)', pos: { x: 61.0, y: 0, z: 36.5 } });
  p.debugPoints.push(
    { id: 'A5-apron-e', label: 'Set 5 apron east strip (station 12 marks)', pos: { x: 67.0, y: 0, z: 33.0 }, yaw: -Math.PI / 2 },
    { id: 'A5-walltop', label: 'Set 5 wall top (the ladder head)', pos: { x: (A5_WALLTOP.x0 + A5_WALLTOP.x1) / 2, y: A5_WALLTOP.y, z: 31.6 }, yaw: -Math.PI / 2 },
    { id: 'A5-apron-w', label: 'Set 5 apron west strip', pos: { x: 60.5, y: 0, z: 37.0 }, yaw: -Math.PI / 2 },
    { id: 'A5-watcher', label: 'Set 5 kiosk watcher', pos: { x: A5_WATCHER_POST.x, y: 0, z: A5_WATCHER_POST.z }, yaw: A5_WATCHER_POST.yaw },
  );
  const vSpot = p.lightSpots.find((s) => s.name === 'A5 vantage');
  if (vSpot) Object.assign(vSpot, { x: 61.0, z: 36.5 });
  p.lightSpots.push(
    { name: 'A5 strip east', kind: 'body', x: 54.0, y: 0, z: 34.5, band: 'any' },
    { name: 'A5 west strip', kind: 'body', x: 60.5, y: 0, z: 40.0, band: 'any' },
    { name: 'A5 east strip', kind: 'body', x: 67.0, y: 0, z: 33.0, band: 'any' },
  );
  const shot = p.shotVantages.find((v) => v.name === 'a5-vantage');
  if (shot) Object.assign(shot, { feet: [61.0, 0, 36.5], cam: [62.0, 1.4, 37.0], target: [47, 1.2, 33.5] });
  p.shotVantages.push({ name: 'a5-gap', feet: [69.0, 0, 31.0], cam: [69.3, 1.6, 30.6], target: [68.1, 4.5, 34.5] });
}
