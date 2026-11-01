/**
 * (anim-studio-2) The Anim Studio's room and traversal props (plain numbers, no imports: the map builder
 * `world/maps/studio.ts` and the studio's loops read them). Metres, x east, z north, floor 0.
 *
 * Sizes are the engine's numbers (re-checked by `tests/animStudio2.test.ts`): a vault is at most 1.25 m high and 1.0 m
 * deep (`pickTraversal`); a lip hangs from 1.9 m (`LEDGE.minDrop`) and is grabbed from the floor up to 2.7 m
 * (`REACH.grabMax`); the co-op lip is in the 4.3-4.5 m band (G57, `inBoostBand`); the ladder is 0.5 m wide; the duct is the
 * Proving Grounds' 1.0 x 1.1 m crawlspace; the window is every map's 1.2 x 1.2 m at a 0.9 m sill; the door is the scale
 * sheet's 1.2 x 2.1 m single door.
 */

/** The stage is a square room this many metres a side; Wren starts in its middle. */
export const STUDIO_SIZE = 28;
export const STUDIO_MID = STUDIO_SIZE / 2;
/** The co-op team block's lip (m): inside the co-op ledge band (G57, 4.3-4.5 m). */
export const PAIR_TOP = 4.4;

/** Every prop. */
export const STUDIO_PROPS = {
  /** The co-op team block (north middle): its south face carries the lip the pairs use. */
  team: { x0: 11, x1: 17, z0: 25, z1: 28, top: PAIR_TOP },
  /** A wall with a ledge (north west): a jump-grab lip. */
  ledge: { x0: 2, x1: 6, z0: 25, z1: 28, top: 2.4 },
  /** A low wall to vault (west), along z. */
  lowWall: { x: 4, z0: 15, z1: 19, h: 1.0, thick: 0.3 },
  /** The climbing platform (west), a ladder and a drainpipe on its east face (x 3); its south face is the back-to-wall wall. */
  platform: { x0: 0, x1: 3, z0: 8, z1: 11, top: 3.0 },
  ladder: { x: 3.05, z: 9.0, width: 0.5 },
  pipeV: { x: 3.1, z: 10.4 },
  /** A horizontal pipe (east), along z between two posts. */
  pipeH: { x: 25.5, z0: 4, z1: 9, y: 2.5 },
  /** A hang bar (north east), along x between two posts. */
  bar: { x0: 21, x1: 23.5, z: 25.5, y: 2.3 },
  /** A vent (east): a crawl duct along x through a block, grates at both ends. */
  vent: { x0: 21, x1: 25, z0: 12, z1: 16, z: 14, w: 1.0, h: 1.1, top: 2.0 },
  /** A window (south) in a wall along x. */
  window: { x: 18, z: 4, w: 1.2, h: 1.2, sill: 0.9, wall0: 15, wall1: 21, wallH: 3 },
  /** A door (south west) in a wall along x, hinged at its west side. */
  door: { hinge: 9.4, z: 4, w: 1.2, h: 2.1, wall0: 7, wall1: 13, wallH: 3 },
  /** A rappel point on the team block's lip (its east end), the rope down its face. */
  rappel: { x: 16.3, z: 25, top: PAIR_TOP },

  // (G2b, `docs/plan/TEST-CHAMBER-SPEC.md` 1.3) The test pieces added to the room; every key above keeps its value.
  /** A step row (south wall, 1.2 x 1.2 m blocks): 0.42 walks up (`maxStep`), 0.6 is the step move, 0.9 a mantle. Approach from z 2.5 facing -z. */
  steps: { z: 0.6, w: 1.2, d: 1.2, rows: [{ x: 1.0, h: 0.42 }, { x: 3.0, h: 0.6 }, { x: 5.0, h: 0.9 }] },
  /** A crouch tunnel (west wall, the perimeter is its west side): a 1.4 m underside between crouch (1.15) and stand (1.75) height. */
  tunnel: { x0: 0, x1: 3, z0: 11.5, z1: 14.5, under: 1.4, roof: 0.3, wallW: 0.5 },
  /** 35 degree stairs (rise 1.75 over 2.5, to +z) and a 55 degree ramp (rise 3.57 over 2.5): walkable under 50, too steep over. */
  stairs: { x: 18.0, z: 8.75, w: 2.0, len: 2.5, rise: 1.75, steps: 6 },
  ramp55: { x: 20.2, z: 8.75, w: 1.6, len: 2.5, rise: 3.57 },
  /** A chain-link fence (2.6 m: the climb case) along x. */
  fence: { x0: 6.0, x1: 9.0, z: 6.5, h: 2.6 },
  /** Hang block B (north west): lip 2.4, its south face in line with the ledge wall's (jump-across); its east corner wraps. */
  blockB: { x0: 7.5, x1: 9.5, z0: 25, z1: 27, top: 2.4 },
  /** The split fin: a 0.3 m wall, 1.65 m east of the team block's east face (a split gap of 1.2-1.95 m, both 4.4 m tall). */
  fin: { x0: 18.65, x1: 18.95, z0: 25, z1: 28, top: PAIR_TOP },
  /** A zipline from the ledge wall's top down to the floor (the high end 1.9 m over the 2.4 m deck). */
  zip: { x: 5.3, a: { y: 4.3, z: 25.4 }, b: { y: 2.3, z: 19.0 }, post: { z: 25.7, h: 2.0, y: 2.4 } },
  /** The rappel booth (north east corner, x 25-28, z 25-28, top 4.4; its east side is the east wall): a glazed window
   *  under its own rope, a roof with a vent hole and a duct over it. */
  booth: {
    x0: 25, x1: 28, z0: 25, z1: 28, top: PAIR_TOP, wallH: 4.2, thick: 0.3,
    /** The glazed window in the south wall (sill 1.0 over the floor, 1.2 x 1.2 m). */
    window: { x: 26.5, w: 1.2, h: 1.2, sill: 1.0 },
    /** The rope on the roof edge, directly over the window. */
    rope: { x: 26.5, z: 25, top: PAIR_TOP },
    /** The roof vent hole (x 25.5-26.3, z 26.3-27.1), the duct over it and the stand point on the roof. */
    vent: { x0: 25.5, x1: 26.3, z0: 26.3, z1: 27.1 },
    stand: { x: 27.5, z: 26.7 },
    /** The inside, clear floor. */
    inner: { x0: 25.3, x1: 28, z0: 25.3, z1: 27.5 },
  },

  // (G2c, `docs/plan/TEST-CHAMBER-SPEC.md` 1.4) The dark side room off the east wall: x 28.3-36.3, z 0-28, ceiling 8, ambient 0.12.
  annex: {
    x0: 28.3, x1: 36.3, z0: 0, z1: 28,
    /** The wall between the main room and the annex (the old east wall: its main-room face stays at x 28). */
    divider: { x: 28.15, thick: 0.3 },
    /** The annex door (hinge at z0, the leaf runs along +z, swings into the annex) and its lintel. */
    door: { z0: 19.4, z1: 20.6, h: 2.1 },
    /** Partition A (z 14.15): the hall to the north, the store, aisle and dark bay to the south; its door at the east end. */
    partA: { z: 14.15, door: { x0: 34.8, x1: 36.0 } },
    /** The store (x 28.3-32.3, z 8.3-14) and aisle (x 32.6-36.3, z 8.3-14): a wall at z 8.15 and one at x 32.45 with a doorway. */
    storeWall: { z: 8.15, x1: 32.6 },
    aisleWall: { x: 32.45, z0: 8.3, z1: 14.0, door: { z0: 8.6, z1: 9.8 } },
    /** L0 (the hall lamp on the switch, group 1) and L1 (the store strip, group 2). */
    lamp0: { x: 32.3, y: 5, z: 23.5, radius: 7, intensity: 1 },
    lamp1: { x: 29.4, y: 3.2, z: 12.2, radius: 3, intensity: 0.8 },
    /** The ambient of the whole annex. */
    ambient: 0.12,
    /** Free-standing high cover in the hall (x 34.35-34.85, z 20-22.5) and the dumpster in the dark bay. */
    h1: { x: 34.6, z: 21.25, len: 2.5 },
    dumpster: { x: 30.3, z: 7.25, w: 1.9, h: 1.2, d: 1.0 },
  },
  /** The passive practice guards (G2c, decision N17): outside the open, lit middle (the 2 m circle at (14, 14), the anim lane
   *  x 8-26 z 18-24, the loop walk-ins). Two side by side with their backs to the spawns (yaw 0 = facing +z), one facing them. */
  practice: [
    { x: 12.75, z: 16.75, yaw: 0 },
    { x: 15.25, z: 16.75, yaw: 0 },
    { x: 19.75, z: 16.25, yaw: -2.0 },
  ],
} as const;
