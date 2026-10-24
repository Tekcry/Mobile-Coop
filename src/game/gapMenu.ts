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

/** The breakable panels' state the trap helpers read (`Breakables` fits). */
export interface TrapPanels {
  has(key: string): boolean;
  isOpen(key: string): boolean;
}

/** The breakable panels' open (`Breakables` fits; returns false when already open or missing: idempotent). */
export interface TrapOpener {
  open(key: string, how: 'unscrew'): boolean;
}

/** (CHECK-M B1) The host's slack over `GAP_MENU.reach` and the height band for a client's OPEN TRAP (latency, m). */
export const GAP_HOST_SLACK = 0.5;

/**
 * (CHECK-M B1) The host's check of a client's OPEN TRAP (`panel` message, gap index `gi` from the wire, untrusted): the
 * gap exists, its `trap` names a panel still closed, and the requester's feet (fx, fy, fz) are within the menu's reach
 * and height band plus `GAP_HOST_SLACK` (no facing test). Returns the panel key to open, else null. No allocation.
 */
export function hostTrapKey(points: readonly OpticPoint[], gi: number, panels: TrapPanels, fx: number, fy: number, fz: number): string | null {
  if (!Number.isInteger(gi) || gi < 0 || gi >= points.length) return null;
  const pt = points[gi]!;
  const key = pt.trap;
  if (!key || !panels.has(key) || panels.isOpen(key)) return null;
  const dy = pt.gap.y - fy;
  if (dy < -OPTIC.reachDown - GAP_HOST_SLACK || dy > OPTIC.reachUp + GAP_HOST_SLACK) return null;
  return hyp2(pt.gap.x - fx, pt.gap.z - fz) <= GAP_MENU.reach + GAP_HOST_SLACK ? key : null;
}

/** (CHECK-M B1) The gaps whose trap panel is open (the snapshot's `trp`), ascending, into `out` (cleared first). */
export function openTrapGaps(points: readonly OpticPoint[], panels: TrapPanels, out: number[]): number[] {
  out.length = 0;
  for (let i = 0; i < points.length; i++) {
    const key = points[i]!.trap;
    if (key && panels.has(key) && panels.isOpen(key)) out.push(i);
  }
  return out;
}

/** (CHECK-M B1) Client: open every trap the host lists (`trp`, gap indices); an index this level lacks, or a gap with
 *  no trap, is skipped. Opening is idempotent; a trap never closes. Returns how many opened now. */
export function applyOpenTraps(points: readonly OpticPoint[], trp: readonly number[], panels: TrapOpener): number {
  let n = 0;
  for (let i = 0; i < trp.length; i++) {
    const key = points[trp[i]!]?.trap;
    if (key && panels.open(key, 'unscrew')) n++;
  }
  return n;
}

/**
 * (CHECK-M B1) The picked OPEN TRAP at gap `gi` (panel `key`): a co-op client asks the host (`net.panelOpen`: the host
 * opens it and every snapshot's `trp` opens it on all pages); single player and the host open it at once (the host's
 * snapshots carry it). Returns true if the panel opened here now.
 */
export function pickOpenTrap(gi: number, key: string, panels: TrapOpener, net: { panelOpen?(g: number): void } | null | undefined): boolean {
  if (net?.panelOpen) {
    net.panelOpen(gi);
    return false;
  }
  return panels.open(key, 'unscrew');
}
