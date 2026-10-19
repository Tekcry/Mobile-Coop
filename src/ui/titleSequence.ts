/**
 * (menu-notes slice 4c, Michael's M3: "Goggles should flicker in full darkness first, then main menu") The title press
 * sequence, pure (no DOM, no Babylon): the press fades the prompt and wordmark out, the screen stays black with no menu
 * while the goggle flickers on (the stage's ignite, slice 4a), the menu fades in over the last of the light rise, then it
 * takes input. A second press skips straight to the lit menu (A3). Never stranded: a fallback ends it.
 */

/** The prompt and wordmark fade out over this (s, the CSS in `styles.css` matches). */
export const TITLE_OUT_S = 0.35;
/** The main menu fades in over the last `MENU_IN_S` of the light rise, so it is fully in as the lights are (s). */
export const MENU_IN_S = 0.6;
/** A press this soon after the one that started the sequence is the same press (one key raises a keydown, an action
 *  edge and a button click; a click bubbles to the screen): it does not skip. (ms) */
export const SKIP_GUARD_MS = 250;
/** The fallback past the sequence's own length (s): the menu appears even if the stage never reports done. */
export const FALLBACK_S = 2;

export type TitleSeqState = 'title' | 'seq' | 'done';
export type TitleSeqPress = 'start' | 'skip' | 'ignored';
/** What the screen does this frame: show the menu under the title (fading in), end the sequence (the menu takes
 *  input), or nothing. */
export type TitleSeqStep = 'reveal' | 'finish' | null;

export class TitleSequence {
  state: TitleSeqState = 'title';
  /** The menu under the title has been shown (fading in). */
  revealed = false;
  /** Seconds since the press (the stage's debug pause stops it, so frozen stills are not cut short). */
  clock = 0;
  private startMs = 0;

  /** @param maxS the sequence's own length (the stage's ignite); the fallback ends it `FALLBACK_S` later. */
  constructor(private readonly maxS: number) {}

  /** A press at `nowMs` (performance.now): the first starts the sequence, a later one (past the guard) skips it. */
  press(nowMs: number): TitleSeqPress {
    if (this.state === 'title') {
      this.state = 'seq';
      this.startMs = nowMs;
      this.clock = 0;
      return 'start';
    }
    if (this.state === 'seq' && nowMs - this.startMs >= SKIP_GUARD_MS) {
      this.state = 'done';
      return 'skip';
    }
    return 'ignored';
  }

  /**
   * One frame. `leftS`: seconds until the stage's lights are fully up (<= 0: done). `paused`: the stage's clock is
   * stopped (debug stills). Returns 'reveal' once (the menu starts fading in), then 'finish' once.
   */
  update(dtS: number, leftS: number, paused: boolean): TitleSeqStep {
    if (this.state !== 'seq') return null;
    if (!paused) this.clock += dtS;
    if (leftS <= 0 || this.clock >= this.maxS + FALLBACK_S) {
      this.state = 'done';
      return 'finish';
    }
    if (!this.revealed && leftS <= MENU_IN_S) {
      this.revealed = true;
      return 'reveal';
    }
    return null;
  }
}

/** The wall-clock guard ends the sequence when no frame has run for this long (ms; software GL under load is slow). */
export const STALL_MS = 2500;
