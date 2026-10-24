// (guard-render S10b) A character caster the Sector guard freeze has disabled (`sectorGuardFreezeView.ts` turns his rig
// root off; the mesh's own flag stays on) still joins the torch and character shadow atlases' lists, at a stand-in
// sphere round his rig root (a disabled mesh's world matrix and bounding sphere are not updated while he walks). A
// Babylon map draws only what is enabled when it renders, after the camera evaluation where the freeze decides, so a
// frozen guard costs nothing in it, and a guard thawed in that evaluation is drawn into the same frame's map (the atlas
// re-renders a slot whose listed frozen caster was thawed: `thawed`). Render only.

import { TransformNode, type AbstractMesh } from '../core/babylon';

export const FROZEN_CASTER = {
  /** The stand-in sphere's centre above the rig root (his feet), m: a guard's middle. */
  up: 0.95,
  /** Its radius (m): half a guard's height plus a shouldered or held-out rifle (the freeze's caster pad, + margin). */
  r: 1.6,
} as const;

/**
 * Is `m` disabled only because its top node is turned off (the freeze's mark: the rig root's own flag off, the mesh's
 * on)? Then its stand-in sphere (the top node's position + `up`, radius `r`) goes into `out` (x, y, z, r) and the
 * result is true. Allocation-free.
 */
export function frozenCasterSphere(m: AbstractMesh, out: Float32Array): boolean {
  if (!m.isEnabled(false)) return false;
  let n = m.parent;
  if (!n) return false;
  while (n.parent) n = n.parent;
  if (!(n instanceof TransformNode) || n.isEnabled(false)) return false;
  const p = n.position;
  out[0] = p.x;
  out[1] = p.y + FROZEN_CASTER.up;
  out[2] = p.z;
  out[3] = FROZEN_CASTER.r;
  return true;
}

/** Has any of the frozen casters listed for a map (`list`) been thawed since? Allocation-free. */
export function thawed(list: readonly AbstractMesh[]): boolean {
  for (let i = 0; i < list.length; i++) if (list[i]!.isEnabled()) return true;
  return false;
}
