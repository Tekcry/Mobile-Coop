import { h } from '../dom';
import { icon } from '../icons';
import { promptHtml } from '../prompts';

/** Prompts drawn on the world surface they act on (Splinter Cell: Blacklist style). */
export type WorldPromptId = 'cover' | 'vault' | 'state' | 'move' | 'corner';

interface Item {
  el: HTMLElement;
  key: string;
  /** Wanted position this frame and the one last written (percent of the view). */
  x: number;
  y: number;
  sx: number;
  sy: number;
}

const PROMPT_IDS: readonly WorldPromptId[] = ['cover', 'vault', 'state', 'move', 'corner'];
/** Overlap estimate: label width per character, padding (glyph or icon), and the row height (vw / vh). */
const CHAR_VW = 1.25;
const PAD_VW = 4;
const MIN_DY = 7;

const GLYPH: Record<WorldPromptId, string> = {
  cover: promptHtml('A', 'Space'),
  move: promptHtml('A', 'Space'),
  corner: promptHtml('A', 'Space'),
  vault: promptHtml('Y', 'E'),
  state: '',
};
const TOUCH_ICON: Record<WorldPromptId, string> = {
  cover: icon('cover', 18),
  move: icon('cover', 18),
  corner: icon('cover', 18),
  vault: icon('jump', 18),
  state: icon('cover', 16),
};

/**
 * World-anchored prompts in their own layer above the touch controls: take cover (on the face the
 * press would snap to), vault / climb / step (on the obstacle), the cover type badge (on the face being
 * used) and the cover-to-cover marker. Each sits at one fixed height per surface, low on it so it never
 * covers the view. By touch every prompt is the button: a tap does what it says (`onTap`); by pad or
 * keyboard they show the glyph. Positions are written as transforms only when they move.
 */
export class WorldPrompts {
  readonly el: HTMLElement;
  private items = {} as Record<WorldPromptId, Item>;
  onTap: ((id: WorldPromptId) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'hud-world' });
    for (const id of PROMPT_IDS) {
      const el = h('div', { class: `wp wp-${id}` });
      el.dataset.prompt = id;
      // acts on release over the prompt; never reaches the touch layer below (no stick, no look)
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        el.classList.add('active');
      });
      el.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        if (!el.classList.contains('active')) return;
        el.classList.remove('active');
        if (el.classList.contains('show')) this.onTap?.(id);
      });
      el.addEventListener('pointerleave', () => el.classList.remove('active'));
      el.addEventListener('pointercancel', () => el.classList.remove('active'));
      this.el.appendChild(el);
      this.items[id] = { el, key: '', x: -1, y: -1, sx: -1, sy: -1 };
    }
    parent.appendChild(this.el);
  }

  /**
   * Show a prompt at a screen position (percent of the view, from a projected world point) or hide it
   * (label null). Positions apply on `flush`.
   */
  set(id: WorldPromptId, label: string | null, xPct: number, yPct: number): void {
    const it = this.items[id];
    const key = label ?? '';
    if (key !== it.key) {
      it.key = key;
      it.el.innerHTML = label
        ? `<i class="wp-mark"></i><span class="wp-body">${GLYPH[id]}<span class="wp-touch">${TOUCH_ICON[id]}</span><span class="wp-label">${label}</span></span>`
        : '';
      it.el.classList.toggle('show', !!label);
    }
    if (!label) return;
    // labels stay readable at the screen edges (the anchor slides in a little)
    it.x = Math.max(8, Math.min(92, xPct));
    it.y = Math.max(10, Math.min(97, yPct));
  }

  /**
   * Apply this frame's positions: prompts that would overlap on screen are pushed apart sideways (e.g.
   * take cover and vault on the same low wall), then written as transforms only when they moved.
   */
  flush(): void {
    const ids = PROMPT_IDS;
    for (let i = 0; i < ids.length; i++) {
      const a = this.items[ids[i]!];
      if (!a.key) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = this.items[ids[j]!];
        if (!b.key || Math.abs(a.y - b.y) > MIN_DY) continue;
        const dx = b.x - a.x;
        const gap = (a.key.length + b.key.length) * CHAR_VW * 0.5 + PAD_VW;
        if (Math.abs(dx) >= gap) continue;
        const push = (gap - Math.abs(dx)) / 2;
        const sgn = dx >= 0 ? 1 : -1;
        a.x -= push * sgn;
        b.x += push * sgn;
      }
    }
    for (const id of ids) {
      const it = this.items[id];
      if (!it.key) continue;
      const x = Math.round(it.x * 10) / 10;
      const y = Math.round(it.y * 10) / 10;
      if (x === it.sx && y === it.sy) continue;
      it.sx = x;
      it.sy = y;
      it.el.style.transform = `translate(${x}vw, ${y}vh)`;
    }
  }

  /** Current label of a prompt ('' = hidden), for tests. */
  label(id: WorldPromptId): string {
    return this.items[id].key;
  }

  setVisible(v: boolean): void {
    this.el.hidden = !v;
  }

  dispose(): void {
    this.el.remove();
  }
}
