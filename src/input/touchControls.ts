import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import { TOUCH_CONTROL_IDS, type Settings, type TouchControlId } from '../core/settings';
import { icon } from '../ui/icons';

interface ControlDef {
  id: TouchControlId;
  action: ButtonAction | null;
  size: number;
  icon: string;
  label: string;
  /** Holding this control also drives the look (fire buttons). */
  look?: boolean;
}

export const TOUCH_DEFS: Record<TouchControlId, ControlDef> = {
  move: { id: 'move', action: null, size: 130, icon: 'move', label: 'Move' },
  fire: { id: 'fire', action: 'fire', size: 92, icon: 'fire', label: 'Fire', look: true },
  fireLeft: { id: 'fireLeft', action: 'fire', size: 70, icon: 'fire', label: 'Fire (left)' },
  ads: { id: 'ads', action: 'ads', size: 68, icon: 'ads', label: 'Aim' },
  reload: { id: 'reload', action: 'reload', size: 56, icon: 'reload', label: 'Reload' },
  jump: { id: 'jump', action: 'jump', size: 64, icon: 'jump', label: 'Jump' },
  crouch: { id: 'crouch', action: 'crouch', size: 58, icon: 'crouch', label: 'Crouch / Roll' },
  swap: { id: 'swap', action: 'swapNext', size: 58, icon: 'swap', label: 'Swap weapon' },
  grenade: { id: 'grenade', action: 'grenade', size: 54, icon: 'grenade', label: 'Grenade' },
  interact: { id: 'interact', action: 'interact', size: 60, icon: 'interact', label: 'Interact' },
  shoulder: { id: 'shoulder', action: 'shoulderSwap', size: 46, icon: 'shoulder', label: 'Swap shoulder' },
  pause: { id: 'pause', action: 'pause', size: 44, icon: 'pause', label: 'Pause' },
};

const LOOK_RAD_PER_PX = 0.0062;
const STICK_RADIUS = 56;

type PointerRole =
  | { kind: 'move'; ox: number; oy: number }
  | { kind: 'look'; lx: number; ly: number }
  | { kind: 'button'; id: TouchControlId; lx: number; ly: number };

/** On-screen dual-stick controls. All positions come from settings (editable layout). */
export class TouchControls {
  readonly layer: HTMLDivElement;
  readonly elements = new Map<TouchControlId, HTMLElement>();
  private knob: HTMLDivElement;
  private pointers = new Map<number, PointerRole>();
  private visible = false;
  /** When true the layer renders but does not produce input (layout editor). */
  editMode = false;
  adsActive = false;
  private hidden = new Set<TouchControlId>();

  constructor(
    private state: InputState,
    private getSettings: () => Settings,
    parent: HTMLElement,
    private onTouchActive: () => void,
  ) {
    this.layer = document.createElement('div');
    this.layer.className = 'touch-layer';
    this.layer.hidden = true;
    for (const id of TOUCH_CONTROL_IDS) {
      const def = TOUCH_DEFS[id];
      const el = document.createElement('div');
      el.className = `tc tc-${id}` + (id === 'move' ? ' tc-stick' : ' tc-btn');
      el.dataset.control = id;
      el.innerHTML = id === 'move' ? '<div class="tc-knob"></div>' : icon(def.icon, 26);
      this.layer.appendChild(el);
      this.elements.set(id, el);
    }
    this.knob = this.elements.get('move')!.querySelector('.tc-knob') as HTMLDivElement;
    parent.appendChild(this.layer);

    this.layer.addEventListener('pointerdown', (e) => this.onDown(e));
    this.layer.addEventListener('pointermove', (e) => this.onMove(e));
    this.layer.addEventListener('pointerup', (e) => this.onUp(e));
    this.layer.addEventListener('pointercancel', (e) => this.onUp(e));
    this.layer.addEventListener('lostpointercapture', (e) => this.onUp(e));
    this.applyLayout();
  }

  setVisible(v: boolean): void {
    if (this.visible === v) return;
    this.visible = v;
    this.layer.hidden = !v;
    if (!v) this.releaseAll();
  }

  /** Context controls (e.g. interact) appear only when usable. */
  setControlHidden(id: TouchControlId, hidden: boolean): void {
    if (hidden === this.hidden.has(id)) return;
    if (hidden) this.hidden.add(id);
    else this.hidden.delete(id);
    this.elements.get(id)?.classList.toggle('tc-hidden', hidden);
  }

  setPressedVisual(id: TouchControlId, on: boolean): void {
    this.elements.get(id)?.classList.toggle('active', on);
  }

  applyLayout(): void {
    const t = this.getSettings().touch;
    this.layer.style.setProperty('--tc-opacity', String(t.opacity));
    for (const id of TOUCH_CONTROL_IDS) {
      const el = this.elements.get(id)!;
      const p = t.layout[id];
      const size = TOUCH_DEFS[id].size * p.scale * t.scale;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.left = `calc(var(--sal) + (100% - var(--sal) - var(--sar)) * ${p.x})`;
      el.style.top = `calc(var(--sat) + (100% - var(--sat) - var(--sab)) * ${p.y})`;
    }
  }

  private releaseAll(): void {
    for (const id of this.pointers.keys()) this.endPointer(id);
    this.pointers.clear();
    this.state.releaseSource('touch-move');
    for (const id of TOUCH_CONTROL_IDS) this.state.releaseSource(`touch-${id}`);
  }

  private haptic(ms: number): void {
    if (this.getSettings().touch.haptics) navigator.vibrate?.(ms);
  }

  private onDown(e: PointerEvent): void {
    if (this.editMode) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.onTouchActive();
    e.preventDefault();
    try {
      this.layer.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers */
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>('.tc-btn');
    if (target && !target.classList.contains('tc-hidden')) {
      const id = target.dataset.control as TouchControlId;
      const def = TOUCH_DEFS[id];
      this.pointers.set(e.pointerId, { kind: 'button', id, lx: e.clientX, ly: e.clientY });
      if (def.action) this.state.set(`touch-${id}`, def.action, true);
      target.classList.add('active');
      this.haptic(8);
      return;
    }
    const w = this.layer.clientWidth;
    if (e.clientX < w * 0.42 && ![...this.pointers.values()].some((p) => p.kind === 'move')) {
      this.pointers.set(e.pointerId, { kind: 'move', ox: e.clientX, oy: e.clientY });
      const stick = this.elements.get('move')!;
      stick.classList.add('active');
      const r = this.layer.getBoundingClientRect();
      stick.style.left = `${e.clientX - r.left}px`;
      stick.style.top = `${e.clientY - r.top}px`;
      return;
    }
    this.pointers.set(e.pointerId, { kind: 'look', lx: e.clientX, ly: e.clientY });
  }

  private lookDelta(dx: number, dy: number): void {
    const t = this.getSettings().touch;
    const k = LOOK_RAD_PER_PX * t.lookSensitivity * (this.adsActive ? t.adsMultiplier : 1);
    this.state.addLook(dx * k, (t.invertY ? 1 : -1) * dy * k);
  }

  private onMove(e: PointerEvent): void {
    const role = this.pointers.get(e.pointerId);
    if (!role) return;
    if (role.kind === 'move') {
      const scale = this.getSettings().touch.layout.move.scale * this.getSettings().touch.scale;
      const rad = STICK_RADIUS * scale;
      let dx = e.clientX - role.ox;
      let dy = e.clientY - role.oy;
      const d = Math.hypot(dx, dy);
      // Pushing well past the rim (forward) sprints.
      this.state.set('touch-move', 'sprint', d > rad * 1.45 && dy < -Math.abs(dx));
      if (d > rad) {
        dx = (dx / d) * rad;
        dy = (dy / d) * rad;
      }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.state.setMove('touch-move', dx / rad, -dy / rad);
    } else if (role.kind === 'look' || (role.kind === 'button' && TOUCH_DEFS[role.id].look)) {
      this.lookDelta(e.clientX - role.lx, e.clientY - role.ly);
      role.lx = e.clientX;
      role.ly = e.clientY;
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.pointers.has(e.pointerId)) return;
    this.endPointer(e.pointerId);
    this.pointers.delete(e.pointerId);
  }

  private endPointer(pointerId: number): void {
    const role = this.pointers.get(pointerId);
    if (!role) return;
    if (role.kind === 'move') {
      this.state.setMove('touch-move', 0, 0);
      this.state.set('touch-move', 'sprint', false);
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.elements.get('move')!.classList.remove('active');
      this.applyLayout();
    } else if (role.kind === 'button') {
      const def = TOUCH_DEFS[role.id];
      if (def.action) this.state.set(`touch-${role.id}`, def.action, false);
      this.elements.get(role.id)?.classList.remove('active');
    }
  }
}
