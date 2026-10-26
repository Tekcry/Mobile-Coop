/**
 * (J14 R1 fix round) The re-planned yard's station tick for A6 Pump House (stations 14-16: no drill window).
 *
 * (J14 G-A6 fix 2, A26 for A6; Q5 / G370 "every failure is a retry") The pair is never trapped on the pump floor: once one
 * player has stood on the gallery (`a6-gal1`, `replan/a6PumpHouse.ts`) the loading edge's lip is locked (`g-a6-edge`) and
 * the staff stair is gone, so from the pump floor the only way back up is the rescue line, which needs a holder on top. If
 * the gallery player falls or drops back (14), or both end up on the floor (15 / 16: the hanger walks out of the pit and
 * the holder jumps down; both drop early and leave by the cage door), only the pause menu's bay restart would free them.
 * While station 14, 15 or 16 is live and `a6-gal1` is set, a player stands on the pump floor and nobody is on the gallery
 * or the bridge or climbing to them (a hang, a boost or the rope at the gallery's face; a hang through the gland plate or
 * the drop opening; the pit's stand-in ladder), for `A6_TRAP_GRACE` s, the live station retries with cause `other`: both
 * back on its marks (14 also reopens the lip: its retry drops `a6-gal1` with the edge gate's flag; 15 and 16 keep it).
 * The pump floor is the shell's floor (feet about y 0) less the drive pit, the culvert under its housing and anything
 * standing proud of it (the sump bay's guard kerb, the pump plinths: both 1.2 m up). (marlow-play C3) While 14 or 15 is live
 * the drive pit and the culvert count as floor too (both dropped into the pit, the ladder still locked: no way up either).
 * Host only (`CourseMode` runs the ticks); `retryOff(n)` turns it off like any station retry. Allocation-free: no
 * closures, arrays or vectors per call; the state is two module-level numbers, the zones constants.
 */
import type { StationTick, TickZone } from './ticks';

/** s a player stands on the pump floor with nobody up or climbing before the live station retries (A26 for A6). */
export const A6_TRAP_GRACE = 5;
/** The flag the first player on the gallery sets (`A6_GAL1_FLAG`): from then on the lip is locked. */
export const A6_TRAP_FLAG = 'a6-gal1';
/** The live stations the clock runs on (14 the rope, 15 the hang-down, 16 the drop). */
export const A6_TRAP_FIRST = 14;
export const A6_TRAP_LAST = 16;

/** Feet on the pump floor: y 0 with a hop's 0.8 m apex; the kerb's and the plinths' tops (1.2) are off it. */
const FY0 = -0.5;
const FY1 = 1.0;
/**
 * The pump floor: the shell's room-side faces (`A6_SHELL` x 40.25-63.75, z 54.25-71.75) less the drive pit (`A6_PIT`, the
 * cage footprint x 49.4-53.6, z 62.0-66.2) and the culvert's housing (`A6_HOUSING`: its south walls' outer faces z 62.3 west
 * of the jog x 61.3 and z 60.9 east of it, its north wall's outer face z 63.9; the holes `A6_CULVERT_1` / `_2` lie inside),
 * as six boxes. South of the housing's jog (the sump bay and the pumps):
 */
export const A6_TRAP_FLOOR_S: TickZone = [40.25, 54.25, 63.75, 60.9, FY0, FY1];
/** West of the pit, to the north wall (the gallery's deck is solid from the floor up: nobody stands under it). */
export const A6_TRAP_FLOOR_W: TickZone = [40.25, 60.9, 49.4, 71.75, FY0, FY1];
/** In front of the cage door, south of the pit. */
export const A6_TRAP_FLOOR_PS: TickZone = [49.4, 60.9, 53.6, 62.0, FY0, FY1];
/** South of the housing's west leg, between the pump plinths and its wall. */
export const A6_TRAP_FLOOR_HS: TickZone = [53.6, 60.9, 61.3, 62.3, FY0, FY1];
/** North of the housing, east of the pit (the gauge board, the desk). */
export const A6_TRAP_FLOOR_E: TickZone = [53.6, 63.9, 63.75, 66.2, FY0, FY1];
/** North of the pit and the housing, to the north wall (under the bridge's north half, the attendant's round). */
export const A6_TRAP_FLOOR_N: TickZone = [49.4, 66.2, 63.75, 71.75, FY0, FY1];

/** On the motor gallery (`A6_DECK`: x 40.25 to the stair-head screen at 56.0, z 69.6 to the north wall), feet on its 4.4 deck. */
export const A6_TRAP_GALLERY: TickZone = [40.25, 69.6, 56.0, 71.75, 3.4, 6.5];
/** On the bridge (`A6_BRIDGE` x 49-54, z 61.6-69.6), feet on its 4.4 deck. */
export const A6_TRAP_BRIDGE: TickZone = [49.0, 61.6, 54.0, 69.6, 3.4, 6.5];
/** Climbing to the gallery: a 1 m strip in front of its south face (the loading edge's lip, a boost in the air, the rope
 *  over the edge), feet 1.0-6.5 m up (nothing there stands off the floor but the bridge's deck, which is up anyway). */
export const A6_TRAP_FACE: TickZone = [40.25, 68.6, 56.0, 69.6, 1.0, 6.5];
/** Climbing to the bridge from the pit: under the gland plate and the drop opening (x 50.9-53.1, z 64.45-66.2: clear of the
 *  cabinet's plinth to z 64.4, the steps and the landing), a hang through either or the stand-in ladder `a6-pit-ladder` at
 *  (52.5, 65.85) from the pit floor (-1.6; a hop's apex -0.8 is off it) to the deck. */
export const A6_TRAP_PIT_CLIMB: TickZone = [50.9, 64.45, 53.1, 66.2, -0.7, 3.4];
/**
 * (marlow-play C3) Floor too while station 14 or 15 is live (the pit ladder stays locked until 16): the whole drive pit (`A6_PIT`,
 * the pit floor -1.6 with a hop, the steps, the landing and the plinth top at 0) and the outfall culvert (`A6_CULVERT_1` the
 * ramp from -1.6, `A6_CULVERT_2` the flat to the L6 door, shut until `a6-drive`). From 16 the pit is mark B: never floor.
 */
export const A6_TRAP_PIT: TickZone = [49.4, 62.0, 53.6, 66.2, -2.1, FY1];
export const A6_TRAP_CULVERT_1: TickZone = [53.6, 62.5, 61.5, 63.7, -2.1, FY1];
export const A6_TRAP_CULVERT_2: TickZone = [61.5, 61.1, 64.0, 63.7, FY0, FY1];
/** (marlow-play C3) The last station the pit and the culvert count as floor on. */
export const A6_TRAP_PIT_LAST = 15;

let ep = 0;
let trapT = 0;

export const a6Tick: StationTick = (h, dt) => {
  const e = h.epoch();
  if (e !== ep) {
    ep = e;
    trapT = 0;
  }
  const n = h.live();
  if (
    n < A6_TRAP_FIRST ||
    n > A6_TRAP_LAST ||
    !h.flag(A6_TRAP_FLAG) ||
    (h.playersIn(A6_TRAP_FLOOR_S) === 0 &&
      h.playersIn(A6_TRAP_FLOOR_W) === 0 &&
      h.playersIn(A6_TRAP_FLOOR_PS) === 0 &&
      h.playersIn(A6_TRAP_FLOOR_HS) === 0 &&
      h.playersIn(A6_TRAP_FLOOR_E) === 0 &&
      h.playersIn(A6_TRAP_FLOOR_N) === 0 &&
      // (marlow-play C3) on 14 / 15 the pit and the culvert are floor too
      (n > A6_TRAP_PIT_LAST ||
        (h.playersIn(A6_TRAP_PIT) === 0 && h.playersIn(A6_TRAP_CULVERT_1) === 0 && h.playersIn(A6_TRAP_CULVERT_2) === 0))) ||
    h.playersIn(A6_TRAP_GALLERY) > 0 ||
    h.playersIn(A6_TRAP_BRIDGE) > 0 ||
    h.playersIn(A6_TRAP_FACE) > 0 ||
    h.playersIn(A6_TRAP_PIT_CLIMB) > 0
  ) {
    trapT = 0;
    return;
  }
  trapT += dt;
  if (trapT >= A6_TRAP_GRACE && h.retry(n, 'other')) trapT = 0;
};
