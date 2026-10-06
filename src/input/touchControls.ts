import type { ButtonAction } from './actions';
import type { InputState } from './inputState';
import { TOUCH_CONTROL_IDS, type Settings, type TouchControlId } from '../core/settings';
import { icon } from '../ui/icons';
import { hyp2 } from '../core/mathx';

interface ControlDef {
  id: TouchControlId;
  /** Button action (the contextual action button's is set at run time). */
  action: ButtonAction | null;
  size: number;
  icon: string;
  label: string;
}

/** Sizes (px at 100%): primary controls >= 72 (fire >= 76), secondary >= 56. */
export const TOUCH_DEFS: Record<TouchControlId, ControlDef> = {
  move: { id: 'move', action: null, size: 130, icon: 'move', label: 'Move' },
  look: { id: 'look', action: null, size: 128, icon: 'look', label: 'Camera' },
  fire: { id: 'fire', action: 'fire', size: 84, icon: 'fire', label: 'Fire' },
  fireLeft: { id: 'fireLeft', action: 'fire', size: 72, icon: 'fire', label: 'Fire (left)' },
  ads: { id: 'ads', action: 'ads', size: 68, icon: 'ads', label: 'Aim' },
  reload: { id: 'reload', action: 'reload', size: 58, icon: 'reload', label: 'Reload' },
  action: { id: 'action', action: null, size: 74, icon: 'interact', label: 'Use' },
  crouch: { id: 'crouch', action: 'crouch', size: 58, icon: 'crouch', label: 'Crouch (toggle)' },
  swap: { id: 'swap', action: 'swapNext', size: 56, icon: 'swap', label: 'Swap weapon' },
  grenade: { id: 'grenade', action: 'grenade', size: 56, icon: 'grenade', label: 'Grenade' },
  dash: { id: 'dash', action: 'dash', size: 56, icon: 'dash', label: 'Sprint (toggle)' },
  shoulder: { id: 'shoulder', action: 'shoulderSwap', size: 46, icon: 'shoulder', label: 'Swap shoulder' },
  pause: { id: 'pause', action: 'pause', size: 44, icon: 'pause', label: 'Pause' },
  vision: { id: 'vision', action: 'vision', size: 56, icon: 'goggles', label: 'Goggles (night vision / sonar)' },
  mark: { id: 'mark', action: 'mark', size: 56, icon: 'mark', label: 'Mark (while aiming)' },
  execute: { id: 'execute', action: 'execute', size: 76, icon: 'execute', label: 'Execute (when ready)' },
};

/** What the contextual action button does right now. */
export interface TouchAction {
  action: 'cover' | 'jump' | 'interact';
  label: string;
  icon: string;
}

const LOOK_RAD_PER_PX = 0.0062;
const STICK_RADIUS = 56;
const LOOK_RADIUS = 54;

type PointerRole =
  | { kind: 'move'; ox: number; oy: number; x: number; y: number }
  | { kind: 'look'; ox: number; oy: number; x: number; y: number }
  | { kind: 'drag'; lx: number; ly: number }
  | { kind: 'button'; id: TouchControlId; lx: number; ly: number; ox: number; oy: number; action?: ButtonAction };

/**
 * On-screen controls. Left: a floating move stick (anywhere in the left 40%). Right: a floating
 * camera-only stick (rate-based look with its own curve, dead zone, smoothing and acceleration; it
 * never fires or aims), a separate fire button that never moves the view, aim, and a contextual
 * action button shown only to use an interactable (cover, vault and cover-to-cover are the world
 * prompts on the surfaces, `WorldPrompts`, tapped directly). Pointer handlers only record positions and press edges; the visuals and the look
 * are applied once per frame in `update`, so handlers never touch layout.
 */
export class TouchControls {
  readonly layer: HTMLDivElement;
  readonly elements = new Map<TouchControlId, HTMLElement>();
  private knob: HTMLDivElement;
  private lookKnob: HTMLDivElement;
  private actionLabel: HTMLSpanElement;
  private pointers = new Map<number, PointerRole>();
  private visible = false;
  /** When true the layer renders but does not produce input (layout editor). */
  editMode = false;
  adsActive = false;
  private hidden = new Set<TouchControlId>();
  private context: TouchAction | null = null;
  private contextKey = '';
  /** Layer size cached on resize (handlers never read layout). */
  private w = 0;
  private h = 0;
  private left = 0;
  private top = 0;
  /** Smoothed camera stick deflection and how long it has been pushed out (acceleration). */
  private lookX = 0;
  private lookY = 0;
  private lookHeldT = 0;
  private dirty = true;

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
      const stick = id === 'move' || id === 'look';
      el.className = `tc tc-${id}` + (stick ? ' tc-stick' : ' tc-btn');
      el.dataset.control = id;
      el.innerHTML = stick ? `<div class="tc-knob"></div>${id === 'look' ? icon('look', 20) : ''}` : icon(def.icon, 26);
      this.layer.appendChild(el);
      this.elements.set(id, el);
    }
    this.knob = this.elements.get('move')!.querySelector('.tc-knob') as HTMLDivElement;
    this.lookKnob = this.elements.get('look')!.querySelector('.tc-knob') as HTMLDivElement;
    this.actionLabel = document.createElement('span');
    this.actionLabel.className = 'tc-label';
    this.elements.get('action')!.appendChild(this.actionLabel);
    parent.appendChild(this.layer);

    this.layer.addEventListener('pointerdown', (e) => this.onDown(e));
    this.layer.addEventListener('pointermove', (e) => this.onMove(e));
    this.layer.addEventListener('pointerup', (e) => this.onUp(e));
    this.layer.addEventListener('pointercancel', (e) => this.onUp(e));
    this.layer.addEventListener('lostpointercapture', (e) => this.onUp(e));
    window.addEventListener('resize', () => this.measure());
    this.applyLayout();
    this.setAction(null);
  }

  private measure(): void {
    const r = this.layer.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.left = r.left;
    this.top = r.top;
  }

  setVisible(v: boolean): void {
    if (this.visible === v) return;
    this.visible = v;
    this.layer.hidden = !v;
    if (v) this.measure();
    if (!v) this.releaseAll();
  }

  /** Context controls appear only when usable. */
  setControlHidden(id: TouchControlId, hidden: boolean): void {
    if (hidden === this.hidden.has(id)) return;
    if (hidden) this.hidden.add(id);
    else this.hidden.delete(id);
    this.elements.get(id)?.classList.toggle('tc-hidden', hidden);
  }

  /** Set what the contextual action button does (null = nothing to do: dimmed). */
  setAction(a: TouchAction | null): void {
    const key = a ? `${a.action}|${a.label}|${a.icon}` : '';
    if (key === this.contextKey) return;
    this.contextKey = key;
    this.context = a;
    const el = this.elements.get('action')!;
    el.classList.toggle('tc-idle', !a);
    el.innerHTML = icon(a?.icon ?? 'interact', 28);
    this.actionLabel.textContent = a?.label ?? '';
    el.appendChild(this.actionLabel);
  }

  get actionContext(): TouchAction | null {
    return this.context;
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
      el.style.setProperty('--tc-alpha', String(p.alpha ?? 1));
      el.style.left = `calc(var(--sal) + (100% - var(--sal) - var(--sar)) * ${p.x})`;
      el.style.top = `calc(var(--sat) + (100% - var(--sat) - var(--sab)) * ${p.y})`;
    }
    this.setControlHidden('fireLeft', !t.fireLeft);
    this.measure();
  }

  private releaseAll(): void {
    for (const id of this.pointers.keys()) this.endPointer(id);
    this.pointers.clear();
    this.state.releaseSource('touch-move');
    this.state.releaseSource('touch-look');
    for (const id of TOUCH_CONTROL_IDS) this.state.releaseSource(`touch-${id}`);
    this.lookX = this.lookY = 0;
    this.dirty = true;
  }

  private haptic(ms: number): void {
    if (this.getSettings().touch.haptics) navigator.vibrate?.(ms);
  }

  /** Centre of a control from the layout (layer coordinates). */
  private centre(id: TouchControlId): { x: number; y: number } {
    const p = this.getSettings().touch.layout[id];
    return { x: p.x * this.w, y: p.y * this.h };
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
    const x = e.clientX - this.left;
    const y = e.clientY - this.top;
    const target = (e.target as HTMLElement).closest<HTMLElement>('.tc-btn');
    if (target && !target.classList.contains('tc-hidden')) {
      const id = target.dataset.control as TouchControlId;
      const def = TOUCH_DEFS[id];
      const role: PointerRole = { kind: 'button', id, lx: e.clientX, ly: e.clientY, ox: e.clientX, oy: e.clientY };
      this.pointers.set(e.pointerId, role);
      // the action button (use) acts on release
      if (def.action) this.state.set(`touch-${id}`, def.action, true);
      target.classList.add('active');
      this.haptic(8);
      return;
    }
    const t = this.getSettings().touch;
    const roles = [...this.pointers.values()];
    // camera stick: floats where the thumb lands within its zone (around its home spot)
    const lc = this.centre('look');
    const lr = TOUCH_DEFS.look.size * t.layout.look.scale * t.scale;
    if (hyp2(x - lc.x, y - lc.y) < lr * 1.1 && !roles.some((p) => p.kind === 'look')) {
      this.pointers.set(e.pointerId, { kind: 'look', ox: x, oy: y, x, y });
      this.dirty = true;
      return;
    }
    if (x < this.w * 0.42 && !roles.some((p) => p.kind === 'move')) {
      this.pointers.set(e.pointerId, { kind: 'move', ox: x, oy: y, x, y });
      this.dirty = true;
      return;
    }
    // optional drag-to-look in the empty upper right
    if (t.dragLook && x > this.w * 0.5 && y < this.h * 0.62) this.pointers.set(e.pointerId, { kind: 'drag', lx: e.clientX, ly: e.clientY });
  }

  private lookDelta(dx: number, dy: number): void {
    const t = this.getSettings().touch;
    const k = LOOK_RAD_PER_PX * t.lookSensitivity * (this.adsActive ? t.adsMultiplier : 1);
    this.state.addLook(dx * k, (t.invertY ? 1 : -1) * dy * k);
  }

  private onMove(e: PointerEvent): void {
    const role = this.pointers.get(e.pointerId);
    if (!role) return;
    if (role.kind === 'move' || role.kind === 'look') {
      // positions only; the frame update turns them into input and visuals
      role.x = e.clientX - this.left;
      role.y = e.clientY - this.top;
      this.dirty = true;
    } else if (role.kind === 'drag' || (role.kind === 'button' && (role.id === 'fire' || role.id === 'fireLeft') && this.getSettings().touch.fireDragLook)) {
      // coalesced moves sum to the same delta; read the latest position
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
      this.state.set('touch-move', 'dash', false);
      this.dirty = true;
    } else if (role.kind === 'look') {
      this.dirty = true;
    } else if (role.kind === 'button') {
      const def = TOUCH_DEFS[role.id];
      if (role.id === 'action') {
        if (this.context) this.state.tap(this.context.action);
      } else if (def.action) this.state.set(`touch-${role.id}`, def.action, false);
      this.elements.get(role.id)?.classList.remove('active');
    }
  }

  /**
   * Per frame: stick deflections become move input and a smoothed, rate-based look; stick visuals
   * update here (never in the pointer handlers).
   */
  update(dt: number): void {
    if (!this.visible || this.editMode) return;
    const t = this.getSettings().touch;
    let move: Extract<PointerRole, { kind: 'move' }> | null = null;
    let look: Extract<PointerRole, { kind: 'look' }> | null = null;
    for (const r of this.pointers.values()) {
      if (r.kind === 'move') move = r;
      else if (r.kind === 'look') look = r;
    }
    // move stick
    if (move) {
      const rad = STICK_RADIUS * t.layout.move.scale * t.scale;
      let dx = move.x - move.ox;
      let dy = move.y - move.oy;
      const d = hyp2(dx, dy);
      this.state.set('touch-move', 'dash', t.dashFlick && d > rad * 1.5);
      if (d > rad) {
        dx = (dx / d) * rad;
        dy = (dy / d) * rad;
      }
      this.state.setMove('touch-move', dx / rad, -dy / rad);
      if (this.dirty) {
        const el = this.elements.get('move')!;
        el.classList.add('active');
        el.style.left = `${move.ox}px`;
        el.style.top = `${move.oy}px`;
        this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    } else if (this.dirty) {
      this.knob.style.transform = 'translate(-50%, -50%)';
      const el = this.elements.get('move')!;
      if (el.classList.contains('active')) {
        el.classList.remove('active');
        this.applyLayout();
      }
    }
    // camera stick: rate-based look with dead zone, response curve, smoothing and acceleration
    let ix = 0;
    let iy = 0;
    if (look) {
      const rad = LOOK_RADIUS * t.layout.look.scale * t.scale;
      let dx = look.x - look.ox;
      let dy = look.y - look.oy;
      const d = hyp2(dx, dy);
      if (d > rad) {
        dx = (dx / d) * rad;
        dy = (dy / d) * rad;
      }
      const m = Math.min(1, d / rad);
      const live = m <= t.lookDeadzone ? 0 : (m - t.lookDeadzone) / (1 - t.lookDeadzone);
      // fine control near the centre, full speed at the rim
      const curve = live * live * (0.6 + 0.4 * live);
      if (m > 0) {
        ix = (dx / rad / m) * curve;
        iy = (-dy / rad / m) * curve;
      }
      this.lookHeldT = live > 0.92 ? this.lookHeldT + dt : 0;
      if (this.dirty) {
        const el = this.elements.get('look')!;
        el.classList.add('active');
        el.style.left = `${look.ox}px`;
        el.style.top = `${look.oy}px`;
        this.lookKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    } else {
      this.lookHeldT = 0;
      if (this.dirty) {
        this.lookKnob.style.transform = 'translate(-50%, -50%)';
        const el = this.elements.get('look')!;
        if (el.classList.contains('active')) {
          el.classList.remove('active');
          this.applyLayout();
        }
      }
    }
    this.dirty = false;
    const k = 1 - Math.exp(-dt / 0.05);
    this.lookX += (ix - this.lookX) * k;
    this.lookY += (iy - this.lookY) * k;
    if (Math.abs(this.lookX) > 1e-4 || Math.abs(this.lookY) > 1e-4) {
      const accel = t.lookAccel ? 1 + Math.min(0.5, Math.max(0, this.lookHeldT - 0.35)) : 1;
      const speed = t.lookSpeed * (this.adsActive ? t.adsMultiplier : 1) * accel * dt;
      this.state.addLook(this.lookX * speed, (t.invertY ? -1 : 1) * this.lookY * speed * 0.7);
    }
  }
}
