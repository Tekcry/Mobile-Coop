/**
 * (coop-fix) The client's objective mirror: the host's objective as its snapshots carry it, a placeholder until the
 * first one, and a stall notice when they stop. (hud-guidance B3, HG9) The placeholder and the stall notice are net
 * status: the client shows them on the HUD's net-status line, never on the objective line. Pure, Babylon-free.
 */

/** Shown from the client's start until the first snapshot. */
export const OBJ_CONNECTING = 'Connecting to host…';
/** Shown once snapshots stop for `OBJ_STALL_S` (a stalled or gone host); the next snapshot replaces it. */
export const OBJ_WAITING = 'Waiting for host…';
export const OBJ_STALL_S = 2;

/** (hud-guidance B3, HG9) A connection notice (the placeholder or the stall notice), not a host objective. */
export function isNetNotice(t: string): boolean {
  return t === OBJ_CONNECTING || t === OBJ_WAITING;
}

/** The two HUD lines the mirror writes (`Hud` has both). */
export interface MirrorLines {
  setNetStatus(text: string): void;
  setObjective(text: string): void;
}

/**
 * (hud-guidance B3, HG9) Show the mirror's line `t`: a notice goes to the net-status line and the objective keeps its
 * text; a host objective clears the notice, then goes to the objective line. True when `t` was a host objective.
 */
export function showMirrorLine(hud: MirrorLines, t: string): boolean {
  if (isNetNotice(t)) {
    hud.setNetStatus(t);
    return false;
  }
  hud.setNetStatus('');
  hud.setObjective(t);
  return true;
}

/**
 * A snapshot arrived carrying the host's objective `hostObj` while the client shows `shown`: the new line, or null
 * when it is unchanged. The placeholder and the stall notice differ from any host objective (an empty one included),
 * so the first snapshot after them always replaces them.
 */
export function objectiveOnSnap(shown: string, hostObj: string): string | null {
  return hostObj === shown ? null : hostObj;
}

/**
 * A client fixed step: `sinceSnap` seconds since the last snapshot (only counted once one has arrived). The stall
 * notice, or null to keep the line.
 */
export function objectiveOnStall(shown: string, gotSnap: boolean, sinceSnap: number): string | null {
  if (!gotSnap || sinceSnap < OBJ_STALL_S || shown === OBJ_WAITING) return null;
  return OBJ_WAITING;
}
