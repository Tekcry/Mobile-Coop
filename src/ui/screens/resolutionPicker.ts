import type { App } from '../../core/app';
import { desktopResolutions, RES_CONFIRM_S, resolutionLabel, resolutionScale } from '../../core/display';
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

/** The monitor's native resolution in device pixels (the fullscreen output). */
export function monitorSize(): { w: number; h: number } {
  return { w: Math.round(screen.width * devicePixelRatio), h: Math.round(screen.height * devicePixelRatio) };
}

/** "7680 x 2160" for a resolution string ("7680x2160"). */
const spaced = (r: string): string => r.replace('x', ' x ');

/** The current render resolution, as the Resolution row shows it: the chosen one, else the scale on the window. */
export function currentResolution(app: App): string {
  const v = app.settings.get().video;
  if (v.resolution) return spaced(v.resolution);
  const n = nativeSize();
  return resolutionLabel(n.w, n.h, v.renderScale);
}

/**
 * Desktop Resolution (3.1.7; 3.2.1: the monitor's standard resolutions - a 7680 x 2160 monitor lists 7680 x 2160,
 * 5120 x 1440, 3840 x 1080): picking one applies it (the render scale that draws that many lines fullscreen; a window
 * gets the same share), then asks to keep it - no answer within `RES_CONFIRM_S` seconds (or Revert / Back) puts the old
 * one back. Picking one also turns the old dynamic resolution off (it lowered the resolution unasked).
 */
export class ResolutionPicker extends Screen {
  override modal = true;
  override readonly showBack = false;

  constructor(
    private app: App,
    private onDone: () => void,
  ) {
    super('dialog-screen');
    const m = monitorSize();
    const v = app.settings.get().video;
    const now = v.resolution || (Math.abs(v.renderScale - 1) < 1e-3 ? `${m.w}x${m.h}` : '');
    const list = h('div', { class: 'res-list rows' });
    desktopResolutions(m.w, m.h).forEach((r, i) => {
      const id = `${r.w}x${r.h}`;
      const cur = id === now;
      list.append(button(`${r.w} x ${r.h}${i === 0 ? ' (native)' : ''}`, () => this.pick(id, resolutionScale(r.h, m.h)), { class: cur ? 'primary' : '', autofocus: cur }));
    });
    this.el.append(h('div', { class: 'dialog res-dialog' }, h('div', { class: 'dialog-title', text: 'Resolution' }), list));
  }

  private pick(id: string, scale: number): void {
    const app = this.app;
    this.manager.pop();
    const v = app.settings.get().video;
    const prev = { scale: v.renderScale, res: v.resolution };
    if (id === v.resolution && Math.abs(scale - prev.scale) < 1e-3) return;
    app.settings.update((d) => {
      d.video.renderScale = scale;
      d.video.resolution = id;
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
    private prev: { scale: number; res: string },
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
    if (this.msg) this.msg.textContent = `Reverting to ${this.prev.res ? spaced(this.prev.res) : currentResolutionAt(this.prev.scale)} in ${this.left} s.`;
  }

  private revert(): void {
    if (this.done) return;
    this.done = true;
    this.app.settings.update((d) => {
      d.video.renderScale = this.prev.scale;
      d.video.resolution = this.prev.res;
    });
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
