import type { App } from '../../core/app';
import { RES_CONFIRM_S, RES_SCALES, resolutionLabel } from '../../core/display';
import { viewHeight, viewWidth } from '../../core/viewRotation';
import { h } from '../dom';
import type { Hint } from '../prompts';
import { Screen } from '../screen';
import { button, Dialog } from '../widgets';

/** The output in device pixels: what render scale 1 draws. */
export function nativeSize(): { w: number; h: number } {
  return { w: Math.round(viewWidth() * devicePixelRatio), h: Math.round(viewHeight() * devicePixelRatio) };
}

/** A phone's Output resolution choice (`video.phoneOutput`: 0 native, else the most device pixels per CSS pixel). */
export function phoneOutputLabel(cap: number): string {
  const d = cap > 0 ? Math.min(devicePixelRatio, cap) : devicePixelRatio;
  const size = `${Math.round(viewWidth() * d)}x${Math.round(viewHeight() * d)}`;
  return cap > 0 ? `${size} (${cap}x)` : `Native (${size})`;
}

/** The current render resolution, as the Resolution row shows it. */
export function currentResolution(app: App): string {
  const n = nativeSize();
  return resolutionLabel(n.w, n.h, app.settings.get().video.renderScale);
}

/**
 * Desktop Resolution (3.1.7): a list of render resolutions from the native output; picking one applies it, then asks
 * to keep it - no answer within `RES_CONFIRM_S` seconds (or Revert / Back) puts the old one back. Picking one also
 * turns the old dynamic resolution off (it lowered the resolution unasked).
 */
export class ResolutionPicker extends Screen {
  override modal = true;
  override readonly showBack = false;

  constructor(
    private app: App,
    private onDone: () => void,
  ) {
    super('dialog-screen');
    const n = nativeSize();
    const now = app.settings.get().video.renderScale;
    const list = h('div', { class: 'res-list rows' });
    for (const s of RES_SCALES) {
      const cur = Math.abs(s - now) < 1e-3;
      list.append(button(resolutionLabel(n.w, n.h, s), () => this.pick(s), { class: cur ? 'primary' : '', autofocus: cur }));
    }
    this.el.append(h('div', { class: 'dialog res-dialog' }, h('div', { class: 'dialog-title', text: 'Resolution' }), list));
  }

  private pick(scale: number): void {
    const app = this.app;
    this.manager.pop();
    const prev = app.settings.get().video.renderScale;
    if (Math.abs(scale - prev) < 1e-3) return;
    app.settings.update((d) => {
      d.video.renderScale = scale;
      d.video.dynamicRes = false;
    });
    this.onDone();
    app.screens.push(new KeepResolution(app, prev, this.onDone));
  }

  override onBack(): boolean {
    this.manager.pop();
    return true;
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Apply' },
      { btn: 'B', label: 'Cancel' },
    ];
  }
}

/** "Keep this resolution?" with a countdown; reverts unless kept. */
export class KeepResolution extends Dialog {
  private left = RES_CONFIRM_S;
  private timer = 0;
  private done = false;
  private msg: HTMLElement | null = null;

  constructor(
    private app: App,
    private prev: number,
    private onDone: () => void,
  ) {
    super('Keep this resolution?', '', [
      { label: 'Keep', primary: true, action: () => void (/* kept */ 0) },
      { label: 'Revert', action: () => this.revert() },
    ], () => this.revert());
    this.msg = this.el.querySelector('.dialog-msg');
    this.tick();
  }

  private tick(): void {
    if (this.msg) this.msg.textContent = `Reverting to ${currentResolutionAt(this.prev)} in ${this.left} s.`;
  }

  private revert(): void {
    if (this.done) return;
    this.done = true;
    this.app.settings.update((d) => void (d.video.renderScale = this.prev));
    this.onDone();
  }

  override onShow(): void {
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.left--;
      this.tick();
      if (this.left > 0) return;
      window.clearInterval(this.timer);
      if (this.manager.top === this) this.manager.pop();
      this.revert();
    }, 1000);
  }

  override onHide(): void {
    // (Keep just closes; Revert / Back / the timeout revert after the pop)
    window.clearInterval(this.timer);
  }
}

function currentResolutionAt(scale: number): string {
  const n = nativeSize();
  return resolutionLabel(n.w, n.h, scale);
}
