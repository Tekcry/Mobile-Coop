import type { App } from '../../core/app';
import { FreeCamera, Vector3, type Camera, type Scene } from '../../core/babylon';
import { h } from '../dom';
import { Screen } from '../screen';
import { promptHtml, type Hint } from '../prompts';
import { hyp2 } from '../../core/mathx';

/** A state that can hand its camera to photo mode and hold still meanwhile (the game, the menu stage). */
export interface PhotoHost {
  readonly scene: Scene;
  /** The camera to fly (a FreeCamera is flown directly, so the post stack stays on; others get a stand-in). */
  photoCamera(): Camera;
  /** Freeze on / off: nothing moves the camera or the world while frozen. */
  photoFreeze(on: boolean): void;
}

export function isPhotoHost(s: unknown): s is PhotoHost {
  return !!s && typeof (s as PhotoHost).photoFreeze === 'function' && typeof (s as PhotoHost).photoCamera === 'function';
}

/** Free-camera speeds (m/s) and look rates. */
const SPEED = 3;
const FAST = 3.5;
const DRAG_LOOK = 0.005;
/** Longest side of a saved photo (px). */
const MAX_SIDE = 1920;

/**
 * Photo mode: the game frozen (single player; co-op keeps running), every HUD and menu hidden, a free camera
 * (move: WASD / left stick / left-half drag; look: mouse drag / right stick / right-half drag; up / down: E / Q,
 * RB / LB, the on-screen arrows; faster: Shift / L3). Prompts only: take the photo, then keep it, retake or cancel.
 * Kept photos go to `onPhoto` (a JPEG Blob); the camera goes back where it was.
 */
export class PhotoModeScreen extends Screen {
  override modal = true;
  override readonly showBack = false;
  private cam: FreeCamera;
  private stand: FreeCamera | null = null;
  private prevActive: Camera | null = null;
  private saved: { pos: Vector3; rot: Vector3 } | null = null;
  private yaw = 0;
  private pitch = 0;
  private phase: 'live' | 'review' = 'live';
  private shot: Blob | null = null;
  private shotUrl = '';
  private readonly live: HTMLElement;
  private readonly review: HTMLElement;
  private readonly preview: HTMLImageElement;
  private readonly takeBtn: HTMLElement;
  private readonly keepBtn: HTMLElement;
  private keys = new Set<string>();
  private drag: { id: number; x: number; y: number; move: boolean; sx: number; sy: number } | null = null;
  private touchMove = { x: 0, y: 0 };
  private vert = 0;
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.type === 'keydown') this.keys.add(e.code);
    else this.keys.delete(e.code);
  };

  constructor(
    private app: App,
    private host: PhotoHost,
    private onPhoto: (b: Blob) => void,
  ) {
    super('photo-screen');
    const src = host.photoCamera();
    if (src instanceof FreeCamera) {
      this.cam = src;
    } else {
      // (an orbit camera: a stand-in at the same pose)
      this.stand = new FreeCamera('photoCam', src.globalPosition.clone(), host.scene);
      this.stand.fov = src.fov;
      this.stand.minZ = src.minZ;
      this.stand.setTarget((src as Camera & { target?: Vector3 }).target ?? Vector3.Zero());
      this.cam = this.stand;
    }
    this.takeBtn = this.btn('A', 'Take photo', () => this.take());
    this.keepBtn = this.btn('A', 'Keep', () => this.keep());
    const pad = h(
      'div',
      { class: 'photo-vert' },
      this.holdBtn('▲', 1),
      this.holdBtn('▼', -1),
    );
    this.live = h(
      'div',
      { class: 'photo-live' },
      h('div', { class: 'photo-help', text: 'Photo mode - move: WASD / left stick / drag left - look: mouse drag / right stick / drag right - up / down: E / Q, RB / LB - faster: Shift' }),
      pad,
      h('div', { class: 'photo-bar' }, this.takeBtn, this.btn('B', 'Cancel', () => this.cancel())),
    );
    this.preview = h('img', { class: 'photo-preview' }) as HTMLImageElement;
    this.review = h('div', { class: 'photo-review' }, this.preview, h('div', { class: 'photo-bar' }, this.keepBtn, this.btn('Y', 'Retake', () => this.retake()), this.btn('B', 'Cancel', () => this.cancel())));
    this.review.hidden = true;
    const surface = h('div', { class: 'photo-surface' });
    surface.addEventListener('pointerdown', (e) => this.onDown(e));
    surface.addEventListener('pointermove', (e) => this.onMove(e));
    surface.addEventListener('pointerup', (e) => this.onUp(e));
    surface.addEventListener('pointercancel', (e) => this.onUp(e));
    surface.addEventListener('wheel', (e) => this.cam.position.addInPlace(this.forward().scale(-Math.sign(e.deltaY) * 0.5)), { passive: true });
    this.el.append(surface, this.live, this.review);
  }

  /** A prompt button (tappable). Only the A action is focusable, so a stick moving the camera never moves focus. */
  private btn(glyph: 'A' | 'B' | 'Y', label: string, fn: () => void): HTMLElement {
    const b = h('button', { class: `btn photo-btn${glyph === 'A' ? '' : ' nofocus'}`, focus: glyph === 'A', html: `${promptHtml(glyph, glyph === 'A' ? 'Enter' : glyph === 'B' ? 'Esc' : 'E')}<span>${label}</span>` });
    (b as HTMLButtonElement).type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  private holdBtn(label: string, dir: number): HTMLElement {
    const b = h('button', { class: 'photo-arrow nofocus', text: label });
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.vert = dir;
    });
    const up = (): void => void (this.vert = 0);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    return b;
  }

  override onShow(): void {
    if (this.saved) return;
    document.body.classList.add('photo-mode');
    this.host.photoFreeze(true);
    const c = this.cam;
    this.saved = { pos: c.position.clone(), rot: c.rotation.clone() };
    if (this.stand) {
      this.prevActive = this.host.scene.activeCamera;
      this.host.scene.activeCamera = this.stand;
    }
    // yaw / pitch from where the camera looks now
    const f = this.forward();
    this.yaw = Math.atan2(f.x, f.z);
    this.pitch = Math.asin(Math.max(-1, Math.min(1, f.y)));
    if (c.rotationQuaternion) c.rotationQuaternion = null;
    this.apply();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.app.input.kbm.releasePointerLock();
  }

  override initialFocus(): HTMLElement | null {
    return this.takeBtn;
  }

  private forward(): Vector3 {
    return this.cam.getDirection(Vector3.Forward());
  }

  private apply(): void {
    this.cam.rotation.set(-this.pitch, this.yaw, 0);
  }

  override update(dt: number): void {
    if (this.phase !== 'live') return;
    const inp = this.app.input.state;
    const look = inp.consumeLook();
    this.yaw += look.x;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + look.y));
    // move: keyboard / stick (the input's move vector) or the left-half drag
    let mx = inp.move.x + this.touchMove.x;
    let my = inp.move.y + this.touchMove.y;
    const k = this.keys;
    let up = this.vert;
    if (k.has('KeyE') || k.has('Space') || inp.buttons.uiTabNext.down) up += 1;
    if (k.has('KeyQ') || k.has('KeyC') || k.has('ControlLeft') || inp.buttons.uiTabPrev.down) up -= 1;
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') || inp.buttons.dash.down ? FAST : 1;
    const len = hyp2(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const s = SPEED * fast * dt;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const cp = Math.cos(this.pitch);
    const p = this.cam.position;
    // forward follows the view (pitch included), strafe stays level
    p.x += (sy * cp * my + cy * mx) * s;
    p.z += (cy * cp * my - sy * mx) * s;
    p.y += (Math.sin(this.pitch) * my + Math.max(-1, Math.min(1, up))) * s;
    this.apply();
  }

  private onDown(e: PointerEvent): void {
    if (this.phase !== 'live') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // touch: the left half moves, the right half looks; a mouse always looks
    const move = e.pointerType === 'touch' && e.clientX < window.innerWidth / 2;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, move, sx: e.clientX, sy: e.clientY };
  }

  private onMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    if (d.move) {
      const r = 70;
      this.touchMove.x = Math.max(-1, Math.min(1, (e.clientX - d.sx) / r));
      this.touchMove.y = Math.max(-1, Math.min(1, -(e.clientY - d.sy) / r));
      return;
    }
    this.yaw += (e.clientX - d.x) * DRAG_LOOK;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - (e.clientY - d.y) * DRAG_LOOK));
    d.x = e.clientX;
    d.y = e.clientY;
  }

  private onUp(e: PointerEvent): void {
    if (this.drag?.id !== e.pointerId) return;
    if (this.drag.move) this.touchMove.x = this.touchMove.y = 0;
    this.drag = null;
  }

  /** Grab the next rendered frame (no HUD: the canvas never has the DOM in it), scaled to `MAX_SIDE`. */
  private take(): void {
    if (this.phase !== 'live') return;
    const engine = this.app.engine;
    const scene = this.host.scene;
    scene.onAfterRenderObservable.addOnce(() => {
      const src = engine.getRenderingCanvas();
      if (!src) return;
      const k = Math.min(1, MAX_SIDE / Math.max(src.width, src.height));
      const out = document.createElement('canvas');
      out.width = Math.round(src.width * k);
      out.height = Math.round(src.height * k);
      out.getContext('2d')?.drawImage(src, 0, 0, out.width, out.height);
      out.toBlob(
        (b) => {
          if (!b) return;
          this.shot = b;
          this.showReview();
        },
        'image/jpeg',
        0.88,
      );
    });
  }

  private showReview(): void {
    if (!this.shot) return;
    this.phase = 'review';
    if (this.shotUrl) URL.revokeObjectURL(this.shotUrl);
    this.shotUrl = URL.createObjectURL(this.shot);
    this.preview.src = this.shotUrl;
    this.live.hidden = true;
    this.review.hidden = false;
    this.app.nav.setRoot(this.el, this.keepBtn);
    this.app.sfx.uiConfirm();
  }

  private retake(): void {
    if (this.phase !== 'review') return;
    this.phase = 'live';
    this.shot = null;
    this.review.hidden = true;
    this.live.hidden = false;
    this.app.nav.setRoot(this.el, this.takeBtn);
  }

  private keep(): void {
    if (this.phase !== 'review' || !this.shot) return;
    const b = this.shot;
    this.close();
    this.onPhoto(b);
  }

  private cancel(): void {
    this.close();
  }

  override onAlt(): void {
    this.retake();
  }

  override onTab(): void {
    // (LB / RB fly down / up)
  }

  override onBack(): boolean {
    if (this.phase === 'review') this.retake();
    else this.cancel();
    return true;
  }

  private close(): void {
    if (!this.saved) return;
    const c = this.cam;
    c.position.copyFrom(this.saved.pos);
    c.rotation.copyFrom(this.saved.rot);
    this.saved = null;
    if (this.stand) {
      this.host.scene.activeCamera = this.prevActive;
      this.stand.dispose();
    }
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    if (this.shotUrl) URL.revokeObjectURL(this.shotUrl);
    document.body.classList.remove('photo-mode');
    this.host.photoFreeze(false);
    this.manager.pop();
  }

  override onHide(): void {
    // (popped from elsewhere: leave nothing behind)
    if (this.saved) {
      document.body.classList.remove('photo-mode');
      this.host.photoFreeze(false);
    }
  }

  override hints(): Hint[] {
    return [];
  }
}
