import { h } from '../dom';
import { keyLabels, verbPromptHtml } from '../prompts';
import type { ContextPromptView } from './contextPromptView';
import { clampX, clampY, newBox, pushApart, roundPos, type CtxProjector, type PromptBox } from './promptLayout';

/** Prompts drawn on the world surface they act on. */
export type WorldPromptId = 'vault' | 'state' | 'jumpTo' | 'drop' | 'takedown' | 'coop';

interface Item {
  el: HTMLElement;
  key: string;
  /** Wanted position this frame and the one last written (percent of the view). */
  x: number;
  y: number;
  sx: number;
  sy: number;
}

const PROMPT_IDS: readonly WorldPromptId[] = ['vault', 'state', 'jumpTo', 'drop', 'takedown', 'coop'];
/** The boxes of the overlap pass: 0-5 the prompts in `PROMPT_IDS` order, 6 and 7 the two context clusters. */
const TAKEDOWN_BOX = 4;
const CLUSTER_BOX = 6;
const BOXES = 8;

/** Pad glyph and the bound key per prompt (keys follow the player's bindings). */
function glyph(id: WorldPromptId): string {
  switch (id) {
    case 'vault':
    case 'jumpTo':
      return verbPromptHtml('traverse', keyLabels.traverse);
    case 'takedown':
      return verbPromptHtml('interact', keyLabels.interact);
    case 'coop':
      return verbPromptHtml('coop', keyLabels.coop);
    case 'drop':
      return verbPromptHtml('crouch', keyLabels.crouch);
    case 'state':
      return '';
  }
}

/**
 * World-anchored prompts in their own layer: take cover (on the face the
 * press would snap to), vault / climb / step (on the obstacle), the cover type badge (on the face being
 * used) and the cover-to-cover marker. Each sits at one fixed height per surface, low on it so it never
 * covers the view. They show the pad or keyboard glyph. Positions are written as transforms only when they move.
 */
export class WorldPrompts {
  readonly el: HTMLElement;
  private items = {} as Record<WorldPromptId, Item>;
  /** (context-prompts S4) The context prompt clusters on the focused target; set by the HUD. */
  ctx: ContextPromptView | null = null;
  private readonly boxes: PromptBox[] = [];

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'hud-world' });
    for (let i = 0; i < BOXES; i++) this.boxes.push(newBox());
    for (const id of PROMPT_IDS) {
      const el = h('div', { class: `wp wp-${id}` });
      el.dataset.prompt = id;
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
      // (context-prompts S5, PLAN 2 rows 38-39) a team move's waiting text after '\n': a small second line
      const nl = key.indexOf('\n');
      const text = nl < 0 ? key : `${key.slice(0, nl)}<br><small class="wp-sub">${key.slice(nl + 1)}</small>`;
      it.el.innerHTML = label
        ? `<i class="wp-mark"></i><span class="wp-body">${glyph(id)}<span class="wp-label">${text}</span></span>`
        : '';
      it.el.classList.toggle('show', !!label);
    }
    if (!label) return;
    // labels stay readable at the screen edges (the anchor slides in a little)
    it.x = clampX(xPct);
    it.y = clampY(yPct);
  }

  /**
   * Apply this frame's positions: prompts that would overlap on screen are pushed apart sideways (e.g.
   * take cover and vault on the same low wall), then written as transforms only when they moved. With a projector
   * the context clusters (S4) are placed and pushed too: a cluster stays on its target and the other prompts move.
   */
  flush(p?: CtxProjector): void {
    const ids = PROMPT_IDS;
    const bx = this.boxes;
    for (let i = 0; i < ids.length; i++) {
      const it = this.items[ids[i]!];
      const b = bx[i]!;
      b.on = !!it.key;
      b.x = it.x;
      b.y = it.y;
      b.h = 0;
      b.chars = it.key.length;
      b.pinned = false;
    }
    const ctx = this.ctx;
    if (ctx && ctx.foldsTakedown()) bx[TAKEDOWN_BOX]!.on = false;
    if (ctx && p) ctx.place(p, bx[CLUSTER_BOX]!, bx[CLUSTER_BOX + 1]!);
    else {
      bx[CLUSTER_BOX]!.on = false;
      bx[CLUSTER_BOX + 1]!.on = false;
    }
    pushApart(bx, BOXES);
    for (let i = 0; i < ids.length; i++) {
      const it = this.items[ids[i]!];
      if (!it.key) continue;
      const b = bx[i]!;
      it.x = b.x;
      it.y = b.y;
      const x = roundPos(it.x);
      const y = roundPos(it.y);
      if (x === it.sx && y === it.sy) continue;
      it.sx = x;
      it.sy = y;
      it.el.style.transform = `translate(${x}vw, ${y}vh)`;
    }
    if (ctx && p) ctx.write(bx[CLUSTER_BOX]!, bx[CLUSTER_BOX + 1]!);
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
