// (campus-fence-s2s5) The v2 sections' anti-climb caps (S1 has its own, `S1_FENCE_CAP_LINES` in `s1.ts`).
import type { LevelBuilder } from '../../levelBuilder';

/** An anti-climb cap: x0, z0, x1, z1, y0, y1 (m). A zero plan extent is a 0.1 sheet on that line. */
export type EdgeCap = readonly [number, number, number, number, number, number];

/**
 * Builds the caps as collision-only boxes: not drawn, so out of the light shapes (the bake key is unchanged), no cover,
 * no dressing; `noLedge`, so no lip along them. They stop a body (a mantle's chest-high probe line, a jump, a walk) and
 * nothing else.
 */
export function buildEdgeCaps(b: LevelBuilder, caps: readonly EdgeCap[]): void {
  const i0 = b.boxes.length;
  for (const [x0, z0, x1, z1, y0, y1] of caps) b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0 || 0.1, y1 - y0, z1 - z0 || 0.1, '#55606a', 0, 0, true, false);
  b.mark(i0, { noLedge: true });
}
