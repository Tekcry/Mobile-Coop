/**
 * SHADE OPERATIVE (3.2): the default avatar's look in one place - a human body in a fitted black tactical suit (no
 * equipment yet: armour and gear come later as customisation). Colours are sRGB hex; the model
 * (`cosmetics/shadeOperative.ts`) gives every region of the skin one of these slots, so a palette change here
 * recolours the whole character.
 */
export const SHADE_PALETTE = {
  /** Base suit: matte black. */
  suit: '#16181b',
  /** Smooth reinforced panels: chest, back yoke, shoulders, outer forearms, thigh fronts, knees. */
  panel: '#24272c',
  /** Woven mesh (a darker, rougher fabric): the torso's sides and the inner arms. */
  mesh: '#101113',
  /** Gloves. */
  glove: '#111214',
  /** Boots and their soles. */
  boot: '#121315',
  sole: '#0a0a0b',
  /** The skin round the eyes in the hood's opening, and the eyes. */
  skin: '#a07a62',
  eye: '#1c1512',
} as const;

export type ShadeColor = keyof typeof SHADE_PALETTE;

/** Voxel size (m) of the distance field the skin is extracted from, and the skeleton's height (m): the shared rig's
 *  tuned 1.75 m (traversal, IK and cover hiding are tuned to it). */
export const SHADE_VOXEL = 0.02;
export const SHADE_HEIGHT = 1.75;
