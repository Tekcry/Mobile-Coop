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
} as const;
