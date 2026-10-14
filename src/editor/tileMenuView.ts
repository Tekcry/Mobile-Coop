/**
 * The tile menu and the name picker on screen (ON0a). The tile menu is a full-width panel over the bottom half of the
 * views (the 3D view stays visible above): a row of tabs, then a grid of large tiles (a list of rows on the View tab).
 * The name picker opens from the card's Name row: the names already used, then an on-screen keyboard. Rows, tiles and
 * keys come from the pure modules (tileMenu.ts, card.ts); padControl.ts drives both with the pad, clicks drive them
 * with the mouse. DOM is written only when something changes.
 */
import { KEYBOARD, KEYBOARD_COLS, typeKey } from './card';
import { gridMove, LIST_TABS, menuTabs, menuTiles } from './tileMenu';
import type { MenuInput, MenuTab, TileMenu } from './tileMenu';

/** A grid tile's width, CSS pixels (fix-up 2026-10-14: compact one-line tiles). */
const TILE_W = 300;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class TileMenuView {
  private key = '';

  constructor(
    private readonly el: HTMLElement,
    onTab: (t: MenuTab) => void,
    onTile: (i: number) => void,
  ) {
    el.addEventListener('click', (e) => {
      const t = e.target as Element;
      const tab = t.closest('[data-mtab]')?.getAttribute('data-mtab');
      if (tab) return onTab(tab as MenuTab);
      const tile = t.closest('[data-tile]')?.getAttribute('data-tile');
      if (tile !== null && tile !== undefined) onTile(Number(tile));
    });
  }

  /** Tiles a row on a grid tab, from the panel's width (2 to 6; wide enough for a title and its words on one line). */
  cols(): number {
    const w = this.el.clientWidth || 800;
    return Math.min(6, Math.max(2, Math.floor(w / TILE_W)));
  }

  render(m: TileMenu, inp: MenuInput, padWords: { tab: string; close: string }, bottom: number): void {
    if (!m.isOpen) {
      if (this.key) {
        this.el.classList.add('hidden');
        this.el.innerHTML = '';
        this.key = '';
      }
      return;
    }
    const tiles = menuTiles(m.tab, inp);
    const tabs = menuTabs(inp);
    const list = LIST_TABS.includes(m.tab);
    const k = `${m.tab}|${m.index}|${tabs.join()}|${tiles.map((t) => `${t.id}:${t.value ?? ''}:${t.disabled ? 1 : 0}`).join()}|${padWords.tab}|${bottom}|${this.cols()}`;
    if (k === this.key) return;
    this.key = k;
    this.el.style.bottom = `${bottom}px`;
    const tabHtml = tabs.map((t) => `<button data-mtab="${t}" class="${t === m.tab ? 'on' : ''}">${t}</button>`).join('');
    const body = tiles
      .map((t, i) => {
        const cls = `tile${i === m.index ? ' hl' : ''}${t.disabled ? ' off' : ''}${t.on ? ' lit' : ''}`;
        // a group tile's "shown" is a small marker; an empty value draws nothing
        const mark = !list && t.kind === 'toggle' && t.value === 'shown';
        const arrows = list && t.kind !== 'toggle';
        const value = t.value ? `<b class="tv${mark ? ' mark' : ''}">${arrows ? '&#8249; ' : ''}${esc(t.value)}${arrows ? ' &#8250;' : ''}</b>` : '';
        return `<div class="${cls}" data-tile="${i}"><span class="ti">${esc(t.icon)}</span><span class="tt"><span class="tn">${esc(t.name)}</span><small>${esc(t.disabled ?? t.desc)}</small></span>${value}</div>`;
      })
      .join('');
    this.el.innerHTML = `<div class="tm-head"><span class="dim">${esc(padWords.tab)}</span><div class="tm-tabs">${tabHtml}</div><span class="dim">${esc(padWords.close)}</span></div><div class="tm-body${list ? ' list' : ''}" style="--cols:${list ? 1 : this.cols()}">${body}</div>`;
    this.el.classList.remove('hidden');
    this.el.querySelector('.tile.hl')?.scrollIntoView({ block: 'nearest' });
  }

  /** The scrolling part (the right stick scrolls it). */
  get body(): HTMLElement | null {
    return this.el.querySelector('.tm-body');
  }
}

/** The name picker: the names already used for this kind of element, then "Type a name" (the on-screen keyboard). */
export class NamePick {
  isOpen = false;
  private mode: 'list' | 'keys' = 'list';
  private names: string[] = [];
  private index = 0;
  private text = '';
  private title = '';
  private done: ((name: string | null) => void) | null = null;
  private key = '';

  constructor(private readonly el: HTMLElement) {
    el.addEventListener('click', (e) => {
      const i = (e.target as Element).closest('[data-i]')?.getAttribute('data-i');
      if (i === null || i === undefined) return;
      this.index = Number(i);
      this.press();
    });
  }

  /** `raw` (ON2: ids): capitals are kept as typed, and with no names the keyboard opens straight away. */
  private raw = false;

  open(title: string, names: string[], current: string, done: (name: string | null) => void, raw = false): void {
    this.raw = raw;
    this.title = title;
    this.names = names;
    this.text = current;
    this.done = done;
    this.mode = raw && !names.length ? 'keys' : 'list';
    this.index = Math.max(0, names.indexOf(current));
    this.isOpen = true;
    this.render();
  }

  close(name: string | null): void {
    this.isOpen = false;
    this.render();
    const d = this.done;
    this.done = null;
    d?.(name);
  }

  /** Items in the current mode: the names then "Type a name...", or the keys. */
  private get count(): number {
    return this.mode === 'list' ? this.names.length + 1 : KEYBOARD.length;
  }

  /** One pad frame: steps (D-pad or left stick), A, B. */
  frame(dx: number, dy: number, a: boolean, b: boolean): void {
    if (b) {
      if (this.mode === 'keys') {
        this.mode = 'list';
        this.index = this.names.length;
        return this.render();
      }
      return this.close(null);
    }
    if (dx || dy) this.index = gridMove(this.index, this.count, this.mode === 'list' ? 1 : KEYBOARD_COLS, this.mode === 'list' ? 0 : dx, dy);
    if (a) this.press();
    this.render();
  }

  private press(): void {
    if (this.mode === 'list') {
      if (this.index < this.names.length) return this.close(this.names[this.index]!);
      this.mode = 'keys';
      this.index = 0;
      return this.render();
    }
    const k = KEYBOARD[this.index]!;
    if (k === 'Done') return this.close(this.text.trim());
    this.text = typeKey(this.text, k, this.raw);
    this.render();
  }

  /** The scrolling part (the right stick scrolls it). */
  get body(): HTMLElement | null {
    return this.el.querySelector('.np-body');
  }

  private render(): void {
    if (!this.isOpen) {
      this.el.classList.add('hidden');
      this.el.innerHTML = '';
      this.key = '';
      return;
    }
    const k = `${this.mode}|${this.index}|${this.text}`;
    if (k === this.key) return;
    this.key = k;
    const items =
      this.mode === 'list'
        ? [...this.names, 'Type a name...'].map((n, i) => `<div class="np-item${i === this.index ? ' hl' : ''}" data-i="${i}">${esc(n)}</div>`).join('')
        : KEYBOARD.map((n, i) => `<div class="np-key${i === this.index ? ' hl' : ''}${n.length > 1 ? ' wide' : ''}" data-i="${i}">${esc(n)}</div>`).join('');
    const head = this.mode === 'list' ? `${esc(this.title)}: pick a name` : `${esc(this.title)}: <b>${esc(this.text) || '&nbsp;'}</b><span class="np-caret">|</span>`;
    this.el.innerHTML = `<div class="np-head">${head}</div><div class="np-body ${this.mode}">${items}</div><div class="dim">${this.mode === 'list' ? 'A picks, B cancels' : 'A types, Done keeps it, B back to the list'}</div>`;
    this.el.classList.remove('hidden');
    this.el.querySelector('.hl')?.scrollIntoView({ block: 'nearest' });
  }
}
