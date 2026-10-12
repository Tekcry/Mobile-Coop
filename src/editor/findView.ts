/**
 * ON3 Find (Ctrl+K; pad: Hub > Play > Find): a list of rooms, stairs and named objects filtered as you type, by the
 * keyboard into the box or the on-screen keyboard (D-pad grid, A types, X deletes, Y done: then up / down picks and A
 * goes there). The words and the filter are pure (ease.ts).
 */
import { KEYBOARD, KEYBOARD_COLS, typeKey } from './card';
import { filterFind, findItems } from './ease';
import type { FindItem } from './ease';
import { gridMove } from './tileMenu';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MAX = 10;

export class FindBox {
  isOpen = false;
  /** 'keys': the on-screen keyboard has the pad; 'list': up / down picks a result and A goes there. */
  mode: 'keys' | 'list' = 'keys';
  private key = 0;
  pick = 0;
  text = '';
  private items: FindItem[] = [];
  private shown: FindItem[] = [];
  private readonly input: HTMLInputElement;
  private readonly list: HTMLElement;
  private readonly keys: HTMLElement;
  private readonly help: HTMLElement;

  constructor(
    private readonly el: HTMLElement,
    private readonly source: () => Parameters<typeof findItems>[0],
    private readonly go: (it: FindItem) => void,
    private readonly closed: () => void,
  ) {
    el.innerHTML = '<div class="np-head">Find: <input id="findInput" autocomplete="off" spellcheck="false" placeholder="a room, stair or object"></div><div class="fb-list"></div><div class="np-body keys"></div><div class="dim fb-help"></div>';
    this.input = el.querySelector('input')!;
    this.list = el.querySelector('.fb-list')!;
    this.keys = el.querySelector('.np-body')!;
    this.help = el.querySelector('.fb-help')!;
    this.keys.innerHTML = KEYBOARD.map((n, i) => `<div class="np-key${n.length > 1 ? ' wide' : ''}" data-k="${i}">${esc(n)}</div>`).join('');
    this.input.addEventListener('input', () => {
      this.text = this.input.value;
      this.pick = 0;
      this.render();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === 'Enter') this.goTo(this.pick);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        this.pick = Math.max(0, Math.min(this.shown.length - 1, this.pick + (e.key === 'ArrowDown' ? 1 : -1)));
        this.render();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('click', (e) => {
      const t = e.target as Element;
      const i = t.closest('[data-i]')?.getAttribute('data-i');
      if (i !== null && i !== undefined) return this.goTo(Number(i));
      const k = t.closest('[data-k]')?.getAttribute('data-k');
      if (k !== null && k !== undefined) {
        this.key = Number(k);
        this.press();
      }
    });
  }

  /** Opens it; `typing` puts the cursor in the box (the keyboard), else the on-screen keyboard has the pad. */
  open(typing: boolean): void {
    this.items = findItems(this.source());
    this.isOpen = true;
    this.mode = 'keys';
    this.pick = 0;
    this.el.classList.remove('hidden');
    this.render();
    if (typing) this.input.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.input.blur();
    this.el.classList.add('hidden');
    this.closed();
  }

  /** The results for the text now. */
  results(): FindItem[] {
    return filterFind(this.items, this.text, MAX);
  }

  private goTo(i: number): void {
    const it = this.shown[i];
    if (!it) return;
    this.close();
    this.go(it);
  }

  /** One pad frame: steps (D-pad or left stick), A, B, X, Y. */
  frame(dx: number, dy: number, a: boolean, b: boolean, x: boolean, y: boolean): void {
    if (document.activeElement === this.input) this.input.blur();
    if (b) return this.close();
    if (x) this.setText(typeKey(this.text, 'Delete'));
    if (y) {
      this.mode = this.mode === 'keys' && this.shown.length ? 'list' : 'keys';
      this.pick = 0;
    }
    if (this.mode === 'keys') {
      if (dx || dy) this.key = gridMove(this.key, KEYBOARD.length, KEYBOARD_COLS, dx, dy);
      if (a) return this.press();
    } else {
      if (dy) this.pick = Math.max(0, Math.min(this.shown.length - 1, this.pick + dy));
      if (a) return this.goTo(this.pick);
    }
    this.render();
  }

  private setText(t: string): void {
    this.text = t;
    this.input.value = t;
    this.pick = 0;
  }

  private press(): void {
    const k = KEYBOARD[this.key]!;
    if (k === 'Done') {
      this.mode = this.shown.length ? 'list' : 'keys';
      this.pick = 0;
    } else this.setText(typeKey(this.text, k));
    this.render();
  }

  private render(): void {
    if (!this.isOpen) return;
    this.shown = this.results();
    this.list.innerHTML = this.shown.length
      ? this.shown.map((it, i) => `<div class="np-item${this.mode === 'list' && i === this.pick ? ' hl' : ''}" data-i="${i}">${esc(it.name)} <span class="dim">${esc(it.id)}, ${esc(it.levelName)}${it.coll === 'stairs' ? ', stair' : it.coll === 'objects' ? ', object' : ''}</span></div>`).join('')
      : '<div class="dim">Nothing matches</div>';
    for (const k of this.keys.children) k.classList.toggle('hl', this.mode === 'keys' && Number((k as HTMLElement).dataset.k) === this.key);
    this.keys.classList.toggle('dimmed', this.mode === 'list');
    this.help.textContent = this.mode === 'keys' ? 'D-pad picks a key, A types, X deletes, Y done (then pick a line), B closes. Or type, Enter goes to the first.' : 'Up / down picks, A goes there, Y back to the keys, X deletes, B closes';
    this.list.querySelector('.hl')?.scrollIntoView({ block: 'nearest' });
  }
}
