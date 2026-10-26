/**
 * (G343, hud-guidance B1) The objective popup: the current objective line fades in on every update and on a tap of
 * View / Select (pad) or O (keyboard), holds, then fades out. Pure timing, no DOM and no Babylon: `Hud` reads
 * `visible(now)` each frame and toggles `.show` on the line when it flips (the CSS fade runs `fadeS`).
 */

/** Hold `holdS` seconds (G343 "~5 s"), fade `fadeS` seconds. Starting values (G356). `holdS: Infinity` keeps the
 *  line on for good (BRIEF A3 undo). */
export const OBJECTIVE_POPUP = { holdS: 5, fadeS: 0.4 };

/** When the objective line shows. One number; nothing allocates. */
export class ObjectivePopup {
  /** Shown until this time (s); -Infinity: hidden. */
  private untilS = -Infinity;

  /** Show (or keep showing) from `nowS` for `holdS`: a re-show restarts the hold (BRIEF A4). */
  show(nowS: number): void {
    this.untilS = nowS + OBJECTIVE_POPUP.holdS;
  }

  hide(): void {
    this.untilS = -Infinity;
  }

  visible(nowS: number): boolean {
    return nowS < this.untilS;
  }
}
