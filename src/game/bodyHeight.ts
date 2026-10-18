/**
 * (operators step 11e fix r1, G129 / ops D11) Body sample heights from the body's real size, pure. Every player is
 * drawn and hit at their operator's height (Wren 1.68 m, G74); the light meter and the exposure points sample that
 * body, not the 1.75 m standard one the old constants were written for, so shots and light hit the body you see.
 *
 * Gameplay reads the rig's / the operator's height here, never LOD, presets or figure meshes. Traversal keeps its own
 * fixed `GAMEPLAY_HEIGHT` (G139); this is only where the body is sampled.
 */

/** The standard body the light and exposure constants were written for (m). */
export const STANDARD_BODY = 1.75;

/** How far a full crouch lowers the light sample (fraction of the standing height). */
export const CROUCH_DROP = 0.35;

/**
 * The off-wall light-meter sample height (m over the feet) of a body `height` m tall at crouch 0..1: 1.75 m standing
 * gives 1.75, crouched 1.1375; Wren (1.68 m) 1.68 / 1.092. On a wall the posed head is sampled instead.
 */
export function lightSampleHeight(height: number, crouch: number): number {
  return height * (1 - CROUCH_DROP * crouch);
}

/** Scale of a body `height` m tall against the standard body (the exposure points' heights). */
export function bodyScale(height: number): number {
  return height / STANDARD_BODY;
}
