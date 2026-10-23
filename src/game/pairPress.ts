/**
 * (sector-redesign E3, EW4) The pair-gate rule shared by the course (`CourseState.pressPair`) and Sector Ops
 * (`SectorPairGates`): two halves (key switches, plates) pressed within a window, either order, by two different
 * players (unless `solo`, the course's dev flag). Pure and allocation-free: the caller keeps the halves.
 */
export interface PairHalves {
  /** Clock time (s) of the last press of half a / b (-1 = none). */
  ta: number;
  tb: number;
  /** Who pressed a / b last (player index, -1 = none). */
  pa: number;
  pb: number;
}

/** Fresh halves (nothing pressed). */
export function pairHalves(): PairHalves {
  return { ta: -1, tb: -1, pa: -1, pb: -1 };
}

/** Back to nothing pressed (a restart). */
export function clearPairHalves(h: PairHalves): void {
  h.ta = -1;
  h.tb = -1;
  h.pa = -1;
  h.pb = -1;
}

/**
 * Half a (`isA`) or b pressed by player `p` at `clock`: true when the gate opens (the other half was pressed by another
 * player, or anyone when `solo`, within `window` s). A lone press, or the same player's, is refused (false); a press
 * past the window forgets the other half.
 */
export function pressPairHalf(h: PairHalves, isA: boolean, p: number, clock: number, window: number, solo = false): boolean {
  const win = window + 1e-9;
  if (isA) {
    h.ta = clock;
    h.pa = p;
  } else {
    h.tb = clock;
    h.pb = p;
  }
  const other = isA ? h.tb : h.ta;
  if (other < 0) return false;
  if (!solo && (isA ? h.pb : h.pa) === p) return false;
  if (clock - other <= win) return true;
  if (isA) h.tb = -1;
  else h.ta = -1;
  return false;
}
