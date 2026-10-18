import type { App } from '../../core/app';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, BRIGHTNESS_STEP, calibrationGrey } from '../../world/darkCurve';
import { h } from '../dom';
import type { Hint } from '../prompts';
import { Screen } from '../screen';
import { button, slider } from '../widgets';

/**
 * Brightness calibration (3.6 Phase 1 Step 4b, bible L7; Chaos Theory style): a symbol on black that should be barely
 * visible. The slider sets a small exposure offset in the grade (`CinematicPost.setBrightness`), clamped so it cannot
 * lift the dark band out of dark. Render only, stored per device (settings). Shown once after the update (skippable)
 * and from Settings > Display.
 */
export class BrightnessScreen extends Screen {
  override modal = true;
  override readonly showBack = false;
  private readonly symbol: SVGElement;

  constructor(private app: App) {
    super('dialog-screen brightness-screen');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 120 80');
    svg.setAttribute('class', 'brightness-symbol');
    // the tri-lens: two lenses and one above between them
    for (const [x, y] of [[38, 50], [82, 50], [60, 22]] as const) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', String(x));
      c.setAttribute('cy', String(y));
      c.setAttribute('r', '17');
      svg.append(c);
    }
    this.symbol = svg;
    this.paint();
    const s = (): number => app.settings.get().video.brightness;
    this.el.append(
      h(
        'div',
        { class: 'dialog brightness-dialog' },
        h('div', { class: 'dialog-title', text: 'Brightness' }),
        h('div', { class: 'brightness-stage' }, svg),
        h('div', { class: 'row-note', text: 'Adjust until the symbol is barely visible. Darkness hides you: if you can see clearly in the dark, so could a guard.' }),
        h(
          'div',
          { class: 'rows' },
          slider('Brightness', {
            min: BRIGHTNESS_MIN,
            max: BRIGHTNESS_MAX,
            step: BRIGHTNESS_STEP,
            get: s,
            set: (v) => {
              app.settings.update((d) => void (d.video.brightness = v));
              this.paint();
            },
            format: (v) => `${Math.round(v * 100)}%`,
          }),
          button('Done', () => this.close(), { class: 'primary', autofocus: true }),
        ),
      ),
    );
  }

  private paint(): void {
    const g = calibrationGrey(this.app.settings.get().video.brightness);
    this.symbol.setAttribute('fill', `rgb(${g},${g},${g})`);
  }

  private close(): void {
    this.app.settings.update((d) => void (d.video.brightnessSet = true));
    this.manager.pop();
  }

  override onBack(): boolean {
    this.close();
    return true;
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Done' },
      { btn: 'B', label: 'Skip' },
    ];
  }
}
