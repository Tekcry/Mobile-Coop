import type { App } from '../../core/app';
import { LAYOUT_PRESETS, TOUCH_CONTROL_IDS, type TouchControlId } from '../../core/settings';
import { TOUCH_DEFS } from '../../input/touchControls';
import { h } from '../dom';
import { icon } from '../icons';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button } from '../widgets';
import type { Dir } from '../spatial';

const STEP = 0.01;

/**
 * Drag controls to reposition (touch), or with a controller: focus a control,
 * A to grab, stick/d-pad to move, LB/RB to resize, A/B to drop. Presets (Default / Claw / Left-handed),
 * per-control size and opacity, a thumb-reach overlay and a preview (handles drawn as in game).
 */
export class LayoutEditorScreen extends Screen {
  override readonly showBack = false;
  private handles = new Map<TouchControlId, HTMLElement>();
  private grabbed: TouchControlId | null = null;
  private selected: TouchControlId = 'fire';
  private info: HTMLElement;
  private reach: HTMLElement[] = [];
  private preview = false;

  constructor(private app: App) {
    super('layout-editor');
    const area = h('div', { class: 'le-area' });
    for (const id of TOUCH_CONTROL_IDS) {
      const def = TOUCH_DEFS[id];
      const el = h('div', {
        class: `le-handle tc-${id}`,
        focus: true,
        html: id === 'move' ? '<div class="tc-knob"></div>' : icon(def.icon, 26),
      });
      el.append(h('span', { class: 'le-label', text: def.label }));
      el.addEventListener('nav-focus', () => this.select(id));
      // Only controller/keyboard confirm grabs; touch drags directly.
      el.addEventListener('nav-confirm', () => this.toggleGrab(id));
      el.addEventListener('nav-dir', (e) => this.nudge((e as CustomEvent<{ dir: Dir }>).detail.dir));
      el.addEventListener('pointerdown', (e) => this.startDrag(id, e));
      this.handles.set(id, el);
      area.append(el);
    }
    // thumb reach: comfortable (green) and stretch (amber) arcs from each bottom corner
    for (const side of ['l', 'r']) {
      const el = h('div', { class: `le-reach ${side}` });
      this.reach.push(el);
      area.append(el);
    }
    this.info = h('div', { class: 'le-info' });
    const preset = (label: string, key: keyof typeof LAYOUT_PRESETS): HTMLElement =>
      button(label, () => {
        app.settings.update((s) => void (s.touch.layout = structuredClone(LAYOUT_PRESETS[key])));
        this.layout();
      });
    const bar = h(
      'div',
      { class: 'le-toolbar' },
      button('Smaller', () => this.resize(-0.05)),
      button('Larger', () => this.resize(0.05)),
      button('Fainter', () => this.fade(-0.15)),
      button('Bolder', () => this.fade(0.15)),
      preset('Default', 'default'),
      preset('Claw', 'claw'),
      preset('Left-handed', 'lefty'),
      button('Reach', () => {
        for (const el of this.reach) el.classList.toggle('show');
      }),
      button('Preview', () => {
        this.preview = !this.preview;
        this.el.classList.toggle('le-preview', this.preview);
        this.layout();
      }),
      button('Done', () => this.manager.pop(), { class: 'primary' }),
    );
    this.el.append(area, h('div', { class: 'le-top' }, this.info, bar));
    this.layout();
  }

  override onShow(): void {
    this.layout();
  }

  private layout(): void {
    const t = this.app.settings.get().touch;
    this.el.style.setProperty('--tc-opacity', this.preview ? String(t.opacity) : '0.9');
    for (const id of TOUCH_CONTROL_IDS) {
      const el = this.handles.get(id)!;
      const p = t.layout[id];
      const size = TOUCH_DEFS[id].size * p.scale * t.scale;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.setProperty('--tc-alpha', String(p.alpha ?? 1));
      el.hidden = this.preview && id === 'fireLeft' && !t.fireLeft;
      el.style.left = `calc(var(--sal) + (100% - var(--sal) - var(--sar)) * ${p.x})`;
      el.style.top = `calc(var(--sat) + (100% - var(--sat) - var(--sab)) * ${p.y})`;
      el.classList.toggle('grabbed', this.grabbed === id);
      el.classList.toggle('selected', this.selected === id);
    }
    const p = t.layout[this.selected];
    this.info.textContent = `${TOUCH_DEFS[this.selected].label} · size ${Math.round(p.scale * 100)}% · opacity ${Math.round((p.alpha ?? 1) * 100)}%${
      this.grabbed ? ' · moving' : ''
    }`;
  }

  private select(id: TouchControlId): void {
    this.selected = id;
    this.layout();
  }

  private toggleGrab(id: TouchControlId): void {
    const el = this.handles.get(id)!;
    if (this.grabbed === id) {
      this.grabbed = null;
      el.removeAttribute('data-capture-nav');
    } else {
      if (this.grabbed) this.handles.get(this.grabbed)!.removeAttribute('data-capture-nav');
      this.grabbed = id;
      el.setAttribute('data-capture-nav', '');
    }
    this.select(id);
  }

  private nudge(dir: Dir): void {
    const id = this.grabbed;
    if (!id) return;
    const dx = dir === 'left' ? -STEP : dir === 'right' ? STEP : 0;
    const dy = dir === 'up' ? -STEP : dir === 'down' ? STEP : 0;
    this.app.settings.update((s) => {
      const p = s.touch.layout[id];
      p.x += dx;
      p.y += dy;
    });
    this.layout();
  }

  private fade(d: number): void {
    const id = this.selected;
    this.app.settings.update((s) => {
      const p = s.touch.layout[id];
      p.alpha = Math.max(0.2, Math.min(1.6, (p.alpha ?? 1) + d));
    });
    this.layout();
  }

  private resize(d: number): void {
    const id = this.selected;
    this.app.settings.update((s) => void (s.touch.layout[id].scale += d));
    this.layout();
  }

  private startDrag(id: TouchControlId, e: PointerEvent): void {
    const el = this.handles.get(id)!;
    const area = el.parentElement!;
    el.setPointerCapture(e.pointerId);
    this.select(id);
    const move = (ev: PointerEvent): void => {
      const r = area.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      this.app.settings.update((s) => {
        s.touch.layout[id].x = x;
        s.touch.layout[id].y = y;
      });
      this.layout();
    };
    const up = (): void => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  override onTab(dir: -1 | 1): void {
    this.resize(dir * 0.05);
  }

  override onBack(): boolean {
    if (this.grabbed) {
      this.toggleGrab(this.grabbed);
      return true;
    }
    return false;
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Grab / drop' },
      { btn: 'LB/RB', label: 'Size' },
      { btn: 'B', label: 'Done' },
    ];
  }
}
