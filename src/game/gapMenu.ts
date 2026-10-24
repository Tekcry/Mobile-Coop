/**
 * (optic-coop M1; ct-toolkit 3.2, AUDIT-ACTIONMENU) The action menu's rows at an optic gap other than a door (a floor
 * hatch, a ceiling panel, a vent grille, a shaft top: `BuiltLevel.opticPoints`), Babylon-free. Michael 2026-10-24: "the
 * optic at a non-door gap starts from the CT action menu at the gap (OPEN TRAP / OPTIC CABLE), the same as doors".
 * OPEN TRAP is listed only where the gap is covered by a panel that opens (`OpticPoint.trap`, still closed); a gap where
 * nothing opens lists OPTIC CABLE only. The rows go in the one context menu (`contextMenu.ts`) like the door set, so the
 * prompt, the highlight and the pick are the door menu's on pad and keyboard.
 */

import type { ContextMenu } from './contextMenu';
import type { OpticPoint } from '../player/opticCable';
import { OPTIC } from '../config/tools';
import { hyp2 } from '../core/mathx';

export type GapOpt = 'trap' | 'optic';

/** The row kind of the gap set in the context menu. */
export const GAP_KIND = 'gap';

export const GAP_OPT_LABEL: Readonly<Record<GapOpt, string>> = {
  trap: 'Open trap',
  optic: 'Optic cable',
};

/** The gap set is offered within this of the gap horizontally (m; the door set's 1.6 m, so "Too far" shows from the
 *  OPTIC CABLE pick as at a door) and with the gap `OPTIC.reachDown` under to `OPTIC.reachUp` over the feet. A gap
 *  closer than `under` horizontally (a hatch at the feet, a panel overhead) needs no facing. Starting values (G10). */
export const GAP_MENU = { reach: 1.6, under: 0.5 } as const;

/** The options at a gap: OPEN TRAP first when something opens there (`openable`), then OPTIC CABLE. */
export function gapMenuOptions(openable: boolean, out: GapOpt[] = []): GapOpt[] {
  out.length = 0;
  if (openable) out.push('trap');
  out.push('optic');
  return out;
}

/** Add the gap set of gap `gap` to the menu (`latch`: a scripted tap opens the list, as the door set). */
export function addGapRows(m: ContextMenu, gap: number, openable: boolean, opts: GapOpt[]): void {
  gapMenuOptions(openable, opts);
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i]!;
    m.add(GAP_KIND, o, gap, GAP_OPT_LABEL[o], 0, true);
  }
}

/**
 * The gap in reach for a body with feet at (px, py, pz) and the camera's yaw `camYaw`: the nearest (horizontally) within
 * `GAP_MENU.reach` and the height band, in front of the camera (within 90 deg) unless closer than `GAP_MENU.under`;
 * else -1. No allocation.
 */
export function gapMenuCandidate(points: readonly OpticPoint[], px: number, py: number, pz: number, camYaw: number): number {
  const fx = Math.sin(camYaw);
  const fz = Math.cos(camYaw);
  let best = -1;
  let bestD: number = GAP_MENU.reach;
  for (let i = 0; i < points.length; i++) {
    const g = points[i]!.gap;
    const dy = g.y - py;
    if (dy < -OPTIC.reachDown || dy > OPTIC.reachUp) continue;
    const dx = g.x - px;
    const dz = g.z - pz;
    const d = hyp2(dx, dz);
    if (d > bestD) continue;
    if (d >= GAP_MENU.under && dx * fx + dz * fz <= 0) continue;
    best = i;
    bestD = d;
  }
  return best;
}
