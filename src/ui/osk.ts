import { h } from './dom';
import { button } from './widgets';

/** Pure: what typing `ch` onto `value` does. `ok` false carries the reason (toasted by the caller). */
export function oskType(value: string, ch: string, chars: string, maxLen: number, upper = true): { value: string; ok: boolean; reason?: string } {
  const c = upper ? ch.toUpperCase() : ch;
  if (!chars.includes(c)) return { value, ok: false, reason: `"${ch}" is not used here` };
  if (value.length >= maxLen) return { value, ok: false, reason: `At most ${maxLen} characters` };
  return { value: value + c, ok: true };
}

/** Pure: the value after Delete. */
export const oskDelete = (value: string): string => value.slice(0, -1);

export interface OskOpts {
  /** The typeable characters, in key order. */
  chars: string;
  cols: number;
  maxLen: number;
  /** Extra keys after the characters: Space (names) is `{ space: true }`; Done's label ("Join", "Done"). */
  space?: boolean;
  doneLabel: string;
  get: () => string;
  onChange: (v: string) => void;
  onDone: () => void;
  onCancel: () => void;
  /** Rejected characters (too long, not allowed): the caller toasts the reason. */
  onReject?: (reason: string) => void;
}

/**
 * The on-screen keyboard (menu-ui MD3): a `data-grid` of key buttons (grids never wrap). Pad: A types the focused key,
 * X deletes, Y space, Menu done, B cancel (the host screen forwards `onX` / `onAlt` / `onStart`). Keyboard: letters and
 * digits type directly, Backspace deletes, Enter is done, Esc cancels (capture phase, so the action map never sees
 * them). Mouse: click the keys.
 */
export class Osk {
  readonly el: HTMLElement;
  private active = false;
  private keyHandler = (e: KeyboardEvent): void => {
    if (!this.active || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Backspace') this.del();
    else if (k === 'Enter') this.opts.onDone();
    else if (k === 'Escape') this.opts.onCancel();
    else if (k === ' ' && this.opts.space) this.type(' ');
    else if (k.length === 1 && /[a-z0-9\-.]/i.test(k)) this.type(k);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  constructor(private opts: OskOpts) {
    this.el = h('div', { class: 'osk', attrs: { 'data-grid': '' } });
    this.el.style.setProperty('--osk-cols', String(opts.cols));
    let first = true;
    for (const ch of opts.chars) {
      const b = button(ch, () => this.type(ch), { class: 'osk-key', key: `k-${ch}` });
      if (first) {
        b.dataset.autofocus = '';
        first = false;
      }
      this.el.append(b);
    }
    if (opts.space) this.el.append(button('Space', () => this.type(' '), { class: 'osk-key wide', key: 'space' }));
    this.el.append(
      button('Delete', () => this.del(), { class: 'osk-key wide', key: 'delete' }),
      button(opts.doneLabel, () => opts.onDone(), { class: 'osk-key wide primary', key: 'done' }),
    );
  }

  /** Starts / stops listening to the physical keyboard (a screen's onShow / onHide). */
  attach(on: boolean): void {
    if (on === this.active) return;
    this.active = on;
    if (on) window.addEventListener('keydown', this.keyHandler, true);
    else window.removeEventListener('keydown', this.keyHandler, true);
  }

  type(ch: string): void {
    const r = oskType(this.opts.get(), ch, this.opts.chars + (this.opts.space ? ' ' : ''), this.opts.maxLen, ch !== ' ');
    if (!r.ok) {
      if (r.reason) this.opts.onReject?.(r.reason);
      return;
    }
    this.opts.onChange(r.value);
  }

  del(): void {
    this.opts.onChange(oskDelete(this.opts.get()));
  }
}
