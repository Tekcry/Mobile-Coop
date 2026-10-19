import { h } from '../dom';
import { CTX_BACK, CTX_MAX, type ContextMenu } from '../../game/contextMenu';

/**
 * (CT prototype G5, AUDIT-ACTIONMENU rows 3-6, 10) The context menu's HUD element, top right: a header box (INTERACT,
 * or BACK TO GAME while A is held) over the options box, one row per option, inside a dim outer frame. The layout
 * copies CT's fractions of the frame (styles.css `.hud-ctx`); the look is our own (steel borders, corner ticks for the
 * highlight, a fill line on a hold row). DOM writes happen only when the menu's `version` changes: nothing per frame.
 */
export class ContextMenuView {
  readonly el: HTMLElement;
  private head: HTMLElement;
  private headText: HTMLElement;
  private rows: HTMLElement[] = [];
  private rowText: HTMLElement[] = [];
  private rowFill: HTMLElement[] = [];
  private shownLabel: string[] = [];
  private shownFill: number[] = [];
  private seen = -1;
  private shown = false;
  private headActive = false;

  constructor() {
    this.headText = h('span', { class: 'ctx-text', text: 'Interact' });
    this.head = h('div', { class: 'ctx-head' }, this.headText);
    const box = h('div', { class: 'ctx-box' });
    for (let i = 0; i < CTX_MAX; i++) {
      const t = h('span', { class: 'ctx-text' });
      const f = h('i', { class: 'ctx-fill' });
      const r = h('div', { class: 'ctx-row' }, t, f);
      r.style.display = 'none';
      box.appendChild(r);
      this.rows.push(r);
      this.rowText.push(t);
      this.rowFill.push(f);
      this.shownLabel.push('');
      this.shownFill.push(-1);
    }
    this.el = h('div', { class: 'hud-ctx' }, this.head, box);
  }

  /** Called every frame; touches the DOM only when the menu changed. */
  update(m: ContextMenu): void {
    if (m.version === this.seen) return;
    this.seen = m.version;
    const show = m.state !== 'none' && m.count > 0;
    if (show !== this.shown) {
      this.shown = show;
      this.el.classList.toggle('show', show);
    }
    if (!show) return;
    const active = m.state === 'active';
    // (Michael 08:25) a list with no BACK TO GAME (a held guard) keeps the INTERACT header while A is held
    const back = active && !m.noBack;
    if (back !== this.headActive) {
      this.headActive = back;
      this.headText.textContent = back ? 'Back to game' : 'Interact';
    }
    this.el.classList.toggle('active', active);
    this.head.classList.toggle('sel', active && m.sel === CTX_BACK);
    const k = m.holdK;
    for (let i = 0; i < CTX_MAX; i++) {
      const r = this.rows[i]!;
      const on = i < m.count;
      r.style.display = on ? '' : 'none';
      if (!on) continue;
      const o = m.opts[i]!;
      if (this.shownLabel[i] !== o.label) {
        this.shownLabel[i] = o.label;
        this.rowText[i]!.textContent = o.label;
      }
      const sel = active && m.sel === i;
      r.classList.toggle('sel', sel);
      r.classList.toggle('hold', o.hold > 0);
      const fill = sel ? Math.round(k * 50) : 0;
      if (this.shownFill[i] !== fill) {
        this.shownFill[i] = fill;
        this.rowFill[i]!.style.transform = `scaleX(${fill / 50})`;
      }
    }
  }
}
