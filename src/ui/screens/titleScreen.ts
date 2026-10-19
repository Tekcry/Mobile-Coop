import { h } from '../dom';
import { Screen } from '../screen';
import { glyphSlot } from '../menuScreen';
import { versionText } from './mainMenu';

/**
 * Title / press start (menu-ui SPEC 7.2, MD2): NIGHT over SHIFT and "Press (A) to start" over the menu stage. Any key,
 * click or pad button continues (and unlocks audio through the input mode event). It sits on top of the main menu.
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
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.pending = true;
  };

  constructor(private onContinue: () => void) {
    super('title-screen');
    this.el.classList.add('ts-wait');
    this.hintsEl.style.display = 'none';
    // one focusable target so A / Enter (the ScreenManager's confirm) continues; B / Y / bumpers continue too
    const start = h('button', { class: 'ts-press', focus: true, html: `Press ${glyphSlot('any')} to start` });
    start.type = 'button';
    start.dataset.key = 'start';
    start.addEventListener('click', () => this.continue());
    this.el.append(
      h('div', { class: 'ts-card' }, h('div', { class: 'ts-l1', text: 'Night' }), h('div', { class: 'ts-l2', text: 'Shift' }), start, h('div', { class: 'ts-slash' })),
      h('div', { class: 'version', text: versionText() }),
    );
    // (click, not pointerdown: the click must not land on the main menu revealed under the cursor)
    this.el.addEventListener('click', () => this.continue());
  }

  continue(): void {
    if (this.done || this.waiting) return;
    this.done = true;
    if (this.manager.top === this) this.manager.pop();
    this.onContinue();
  }

  override update(): void {
    if (this.pending) this.continue();
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
