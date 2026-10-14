/**
 * The tile menu and the name picker on screen (ON0a). The tile menu is a full-width panel along the bottom of the
 * views (the 3D view stays visible above): a row of tabs, then a centred grid of equal fixed-size tiles, at most 4 a
 * row (on the View tab a list of rows as wide as the grid).
 * The name picker opens from the card's Name row: the names already used, then an on-screen keyboard. Rows, tiles and
 * keys come from the pure modules (tileMenu.ts, card.ts); padControl.ts drives both with the pad, clicks drive them
 * with the mouse. DOM is written only when something changes.
 */
import { KEYBOARD, KEYBOARD_COLS, typeKey } from './card';
import { gridMove, LIST_TABS, menuTabs, menuTiles } from './tileMenu';
import type { MenuInput, MenuTab, Tile, TileMenu } from './tileMenu';

/** A grid tile's width, CSS pixels: fits the longest title on one line and four columns at 1280 px (2026-10-14). */
const TILE_W = 292;
/** The same on phones and small windows (the small-screen rule in editor.html shrinks the text). */
const TILE_W_SMALL = 216;
/** Gap between tiles, CSS pixels (matches editor.html). */
const GAP = 8;
const GAP_SMALL = 5;
/** Space kept for the scroll bar on each side of the tiles (the body reserves a gutter on both edges). */
const GUTTER = 16;
/** At most this many tiles a row. */
const MAX_COLS = 4;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tileHtml(t: Tile, i: number, list: boolean, hl: boolean): string {
  const cls = `tile${hl ? ' hl' : ''}${t.disabled ? ' off' : ''}${t.on ? ' lit' : ''}`;
  // a group tile's "shown" is a small marker; an empty value draws nothing
  const mark = !list && t.kind === 'toggle' && t.value === 'shown';
  const arrows = list && t.kind !== 'toggle';
  const value = t.value ? `<b class="tv${mark ? ' mark' : ''}">${arrows ? '&#8249; ' : ''}${esc(t.value)}${arrows ? ' &#8250;' : ''}</b>` : '';
  return `<div class="${cls}" data-tile="${i}"><span class="ti">${esc(t.icon)}</span><span class="tt"><span class="tn">${esc(t.name)}</span><small>${esc(t.disabled ?? t.desc)}</small></span>${value}</div>`;
}

export class TileMenuView {
  private key = '';
  /** Tiles on the tab last drawn (a short tab draws fewer columns, still centred). */
  private count = 0;
  /** The one tile height for every grid tab, and the tile words it was measured for. */
  private tileH = 0;
  private hKey = '';
  private readonly small = typeof matchMedia === 'function' ? matchMedia('(max-width: 900px), (max-height: 500px)') : null;

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

  private get isSmall(): boolean {
    return !!this.small?.matches;
  }

  /** Columns the panel's width allows (1 to 4): every tile one fixed width, never stretched. */
  private fitCols(): number {
    const small = this.isSmall;
    const tw = small ? TILE_W_SMALL : TILE_W;
    const gap = small ? GAP_SMALL : GAP;
    const w = (this.el.clientWidth || 800) - 2 * (small ? 8 : 12) - 2 * GUTTER;
    return Math.min(MAX_COLS, Math.max(1, Math.floor((w + gap) / (tw + gap))));
  }

  /** Tiles a row on the grid tab last drawn (what the D-pad steps across): the fitting columns, fewer on a short tab. */
  cols(): number {
    return Math.min(this.fitCols(), Math.max(1, this.count));
  }

  /** One height for every grid tile the menu can show: the tallest of them all at the fixed width (measured hidden). */
  private gridTileH(inp: MenuInput, tabs: MenuTab[], tw: number): number {
    const all: Tile[] = [];
    for (const tab of tabs) if (!LIST_TABS.includes(tab)) all.push(...menuTiles(tab, inp));
    const k = `${tw}|${all.map((t) => `${t.name}${t.disabled ?? t.desc}${t.value ?? ''}`).join('')}`;
    if (k === this.hKey && this.tileH > 0) return this.tileH;
    const box = document.createElement('div');
    box.className = 'tm-grid';
    box.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;--cols:1;--tw:${tw}px;--gw:${tw}px`;
    box.innerHTML = all.map((t, i) => tileHtml(t, i, false, false)).join('');
    this.el.appendChild(box);
    let h = 0;
    for (const t of box.children) h = Math.max(h, (t as HTMLElement).offsetHeight);
    box.remove();
    this.hKey = k;
    this.tileH = h;
    return h;
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
    const fit = this.fitCols();
    const k = `${m.tab}|${m.index}|${tabs.join()}|${tiles.map((t) => `${t.id}:${t.value ?? ''}:${t.disabled ? 1 : 0}`).join()}|${padWords.tab}|${bottom}|${fit}|${this.isSmall ? 1 : 0}`;
    if (k === this.key) return;
    this.key = k;
    this.count = tiles.length;
    if (this.el.classList.contains('hidden')) this.el.classList.remove('hidden');
    this.el.style.bottom = `${bottom}px`;
    const small = this.isSmall;
    const tw = small ? TILE_W_SMALL : TILE_W;
    const gap = small ? GAP_SMALL : GAP;
    // the grid and the View list share one width: the fitting columns of fixed tiles, centred
    const gw = fit * tw + (fit - 1) * gap;
    const cols = list ? 1 : this.cols();
    const w = list ? gw : cols * tw + (cols - 1) * gap;
    const tabHtml = tabs.map((t) => `<button data-mtab="${t}" class="${t === m.tab ? 'on' : ''}">${t}</button>`).join('');
    const body = tiles.map((t, i) => tileHtml(t, i, list, i === m.index)).join('');
    this.el.innerHTML = `<div class="tm-head"><span class="dim">${esc(padWords.tab)}</span><div class="tm-tabs">${tabHtml}</div><span class="dim tm-close">${esc(padWords.close)}</span></div><div class="tm-body"><div class="tm-grid${list ? ' list' : ''}" style="--cols:${cols};--tw:${tw}px;--gw:${w}px">${body}</div></div>`;
    const grid = this.el.querySelector<HTMLElement>('.tm-grid');
    if (grid) {
      let h = 0;
      if (list) for (const t of grid.children) h = Math.max(h, (t as HTMLElement).offsetHeight);
      else h = this.gridTileH(inp, tabs, tw);
      if (h > 0) grid.style.gridAutoRows = `${h}px`;
    }
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
