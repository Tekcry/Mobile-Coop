import { h } from '../dom';
import { Screen } from '../screen';
import { glyphSlot } from '../menuScreen';
import { versionText } from './mainMenu';
import { STALL_MS, TitleSequence } from '../titleSequence';

/** (menu-notes slice 4c) What the title's press sequence asks of the menu stage and the screen beneath. */
export interface TitleSeqHooks {
  /** The sequence's own length (s): the stage's goggle strike and light rise. */
  readonly maxS: number;
  /** Seconds until the stage's lights are fully up (<= 0: done). */
  leftS(): number;
  /** The stage's clock is stopped (debug stills). */
  paused(): boolean;
  /** The second press (A3): the stage jumps to the lit main menu. */
  skip(): void;
  /** Show the screen under the title: fading in over `fadeS`, or at once (0). */
  reveal(fadeS: number): void;
}

/**
 * Title / press start (menu-ui SPEC 7.2, MD2): NIGHT over SHIFT and "Press (A) to start" over the menu stage. Any key,
 * click or pad button continues (and unlocks audio through the input mode event). It sits on top of the main menu.
 * (menu-notes slice 4c, M3) With `seq` hooks the press does not pop it at once: the prompt and wordmark fade out and the
 * title stays on top (black, no menu, it takes every input) while the goggle flickers on; the menu fades in under it as
 * the lights come up, then it pops. A second press skips to the lit menu (A3).
 */
export class TitleScreen extends Screen {
  override readonly root = true;
  override readonly showBack = false;
  private done = false;
  /** (menu-notes slice 4a, M2) The menu is still loading: only the wordmark shows and nothing continues (the boot
   *  screen sits under the screens now, so a click reaches this screen). `arm()` fades the prompt in. */
  private waiting = true;
  /** A key with no menu action: continue on the next update (after the edges are routed, so nothing leaks below). */
  private pending = false;
  private seqState: TitleSequence | null = null;
  private fallback = 0;
  private lastUpdateMs = 0;
  /** A click (or a native click from Enter / Space on a DOM-focused button): handled in the next update. */
  private readonly queue = (): void => {
    if (!this.done && !this.waiting) this.pending = true;
  };
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.pending = true;
  };

  constructor(
    private onContinue: () => void,
    private readonly seq: TitleSeqHooks | null = null,
  ) {
    super('title-screen');
    this.el.classList.add('ts-wait');
    this.hintsEl.style.display = 'none';
    // one focusable target so A / Enter (the ScreenManager's confirm) continues; B / Y / bumpers continue too
    const start = h('button', { class: 'ts-press', focus: true, html: `Press ${glyphSlot('any')} to start` });
    start.type = 'button';
    start.dataset.key = 'start';
    // (slice 4c fix) a click never acts in its DOM event: it queues, and update() continues inside ScreenManager.update, before
    // the frame's edges are consumed (an Enter that natively clicks a DOM-focused button cannot also confirm on the menu).
    // No DOM focus from the mouse either (FocusNav's focus is a class).
    start.addEventListener('click', this.queue);
    start.addEventListener('mousedown', (e) => e.preventDefault());
    this.el.append(
      h('div', { class: 'ts-card' }, h('div', { class: 'ts-l1', text: 'Night' }), h('div', { class: 'ts-l2', text: 'Shift' }), start, h('div', { class: 'ts-slash' })),
      h('div', { class: 'version', text: versionText() }),
    );
    // (click, not pointerdown: the click must not land on the main menu revealed under the cursor)
    this.el.addEventListener('click', this.queue);
  }

  /** (slice 4c, debug hook) 'title', 'seq' (the press sequence runs) or 'done'. */
  get seqPhase(): string {
    return this.seqState?.state ?? (this.done ? 'done' : 'title');
  }

  continue(): void {
    if (this.done || this.waiting) return;
    this.pending = false;
    if (this.seq) {
      const s = (this.seqState ??= new TitleSequence(this.seq.maxS));
      const r = s.press(performance.now());
      if (r === 'start') this.startSeq();
      else if (r === 'skip') {
        try {
          this.seq.skip();
        } catch (e) {
          console.error(e);
        }
        this.finish(0);
      }
      return;
    }
    this.finish(-1);
  }

  /** (slice 4c) The press: the prompt and wordmark fade out; the stage reads `ts-seq` as the main menu and strikes. */
  private startSeq(): void {
    this.el.classList.add('ts-seq');
    const a = document.activeElement;
    if (a instanceof HTMLElement && this.el.contains(a)) a.blur();
    // never stranded: the sequence's own clock ends it if the stage never reports done (`TitleSequence`); this wall-clock
    // guard past its length catches the frames themselves stopping (no update for STALL_MS); while they run it re-arms
    this.lastUpdateMs = performance.now();
    const guard = (): void => {
      if (this.done) return;
      if (performance.now() - this.lastUpdateMs < STALL_MS) this.fallback = window.setTimeout(guard, 1000);
      else this.finish(0);
    };
    this.fallback = window.setTimeout(guard, ((this.seq?.maxS ?? 0) + 2) * 1000 + 500);
  }

  /** Pop and hand over to the menu. `fadeS`: reveal the menu beneath first (0 at once, -1 already shown / no seq). */
  private finish(fadeS: number): void {
    if (this.done) return;
    this.done = true;
    window.clearTimeout(this.fallback);
    if (fadeS === 0 || (fadeS > 0 && !this.seqState?.revealed)) {
      try {
        this.seq?.reveal(fadeS);
      } catch (e) {
        console.error(e);
      }
    }
    if (this.manager.top === this) this.manager.pop();
    this.onContinue();
  }

  override update(dt: number): void {
    if (this.pending) this.continue();
    const s = this.seqState;
    if (!s || this.done || !this.seq) return;
    this.lastUpdateMs = performance.now();
    let left = 0;
    let paused = false;
    try {
      left = this.seq.leftS();
      paused = this.seq.paused();
    } catch (e) {
      console.error(e);
    }
    const step = s.update(dt, left, paused);
    if (step === 'reveal') {
      try {
        this.seq.reveal(left > 0 ? left : 0);
      } catch (e) {
        console.error(e);
      }
    } else if (step === 'finish') this.finish(0.3);
  }

  /** (menu-notes note 2) The load screen has gone: a key pressed while it was up does not skip the title. */
  arm(): void {
    this.pending = false;
    this.waiting = false;
    this.el.classList.remove('ts-wait');
  }

  override onShow(): void {
    this.done = false;
    this.pending = false;
    window.addEventListener('keydown', this.onKey, { capture: true });
  }
  override onHide(): void {
    window.removeEventListener('keydown', this.onKey, { capture: true });
    window.clearTimeout(this.fallback);
  }
  override onBack(): boolean {
    this.continue();
    return true;
  }
  override onAlt(): void {
    this.continue();
  }
  override onTab(): void {
    this.continue();
  }
}
