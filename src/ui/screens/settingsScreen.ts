import type { App } from '../../core/app';
import type { AimAssistLevel, QualityPreset, Settings } from '../../core/settings';
import type { CurveKind } from '../../input/stickMath';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, section, slider, TabView, toggle, type TabDef } from '../widgets';
import { LayoutEditorScreen } from './layoutEditor';
import { enterFullscreenLandscape } from '../../pwa/pwa';

const AIM_OPTS: { value: AimAssistLevel; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
];
const CURVE_OPTS: { value: CurveKind; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'classic', label: 'Classic' },
  { value: 'precise', label: 'Precise' },
  { value: 'aggressive', label: 'Aggressive' },
];
const QUALITY_OPTS: { value: QualityPreset; label: string }[] = [
  { value: 'auto', label: 'Auto (adaptive)' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const mult = (v: number): string => `${v.toFixed(2)}x`;

/** Extra tabs contributed by later systems (e.g. save data). */
export const extraSettingsTabs: ((app: App, screen: SettingsScreen) => TabDef)[] = [];

export class SettingsScreen extends Screen {
  private tabs: TabView;

  constructor(private app: App) {
    super('settings-screen');
    const st = app.settings;
    const s = (): Settings => st.get();
    const upd = st.update.bind(st);

    const resetBtn = (sectionKey: keyof Settings, tabId: string): HTMLElement =>
      button('Reset to defaults', () => {
        st.reset(sectionKey);
        this.tabs.rebuild(tabId);
        app.nav.refresh();
      }, { class: 'subtle' });

    const tabs: TabDef[] = [
      {
        id: 'touch',
        label: 'Touch',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            section(
              'Look',
              slider('Look sensitivity', { min: 0.2, max: 3, step: 0.05, get: () => s().touch.lookSensitivity, set: (v) => upd((d) => void (d.touch.lookSensitivity = v)), format: mult }),
              slider('Aim (ADS) sensitivity', { min: 0.2, max: 1.2, step: 0.05, get: () => s().touch.adsMultiplier, set: (v) => upd((d) => void (d.touch.adsMultiplier = v)), format: mult }),
              toggle('Invert Y', () => s().touch.invertY, (v) => upd((d) => void (d.touch.invertY = v))),
              choice('Aim assist', AIM_OPTS, () => s().touch.aimAssist, (v) => upd((d) => void (d.touch.aimAssist = v))),
            ),
            section(
              'Buttons',
              slider('Opacity', { min: 0.1, max: 1, step: 0.05, get: () => s().touch.opacity, set: (v) => upd((d) => void (d.touch.opacity = v)), format: pct }),
              slider('Size', { min: 0.6, max: 1.6, step: 0.05, get: () => s().touch.scale, set: (v) => upd((d) => void (d.touch.scale = v)), format: pct }),
              toggle('Haptics (vibration)', () => s().touch.haptics, (v) => upd((d) => void (d.touch.haptics = v))),
              button('Edit button layout', () => this.manager.push(new LayoutEditorScreen(app)), { icon: 'move' }),
            ),
            resetBtn('touch', 'touch'),
          ),
      },
      {
        id: 'pad',
        label: 'Controller',
        build: () => {
          const status = h('div', { class: 'row-note' });
          const refresh = (): void => {
            status.textContent = app.input.gamepad.connected
              ? 'Controller connected.'
              : 'No controller detected. On iPhone/iPad, press any button on the controller after pairing.';
          };
          refresh();
          status.addEventListener('nav-focus', refresh);
          return h(
            'div',
            { class: 'rows' },
            status,
            section(
              'Look',
              slider('Horizontal sensitivity', { min: 0.2, max: 3, step: 0.05, get: () => s().gamepad.lookSensitivityX, set: (v) => upd((d) => void (d.gamepad.lookSensitivityX = v)), format: mult }),
              slider('Vertical sensitivity', { min: 0.2, max: 3, step: 0.05, get: () => s().gamepad.lookSensitivityY, set: (v) => upd((d) => void (d.gamepad.lookSensitivityY = v)), format: mult }),
              slider('Aim (ADS) sensitivity', { min: 0.2, max: 1.2, step: 0.05, get: () => s().gamepad.adsMultiplier, set: (v) => upd((d) => void (d.gamepad.adsMultiplier = v)), format: mult }),
              choice('Response curve', CURVE_OPTS, () => s().gamepad.curve, (v) => upd((d) => void (d.gamepad.curve = v))),
              toggle('Invert Y', () => s().gamepad.invertY, (v) => upd((d) => void (d.gamepad.invertY = v))),
              choice('Aim assist', AIM_OPTS, () => s().gamepad.aimAssist, (v) => upd((d) => void (d.gamepad.aimAssist = v))),
            ),
            section(
              'Dead zones',
              slider('Left stick', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.deadzoneLeft, set: (v) => upd((d) => void (d.gamepad.deadzoneLeft = v)), format: pct }),
              slider('Right stick', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.deadzoneRight, set: (v) => upd((d) => void (d.gamepad.deadzoneRight = v)), format: pct }),
              slider('Triggers', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.triggerDeadzone, set: (v) => upd((d) => void (d.gamepad.triggerDeadzone = v)), format: pct }),
            ),
            section(
              'Haptics',
              toggle('Vibration', () => s().gamepad.vibration, (v) => upd((d) => void (d.gamepad.vibration = v))),
              button('Test vibration', () => app.input.gamepad.rumble(0.8, 0.5, 300), { class: 'subtle' }),
            ),
            resetBtn('gamepad', 'pad'),
          );
        },
      },
      {
        id: 'video',
        label: 'Video',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            choice('Quality', QUALITY_OPTS, () => s().video.quality, (v) => upd((d) => void (d.video.quality = v))),
            slider('Render scale', { min: 0.5, max: 1, step: 0.05, get: () => s().video.renderScale, set: (v) => upd((d) => void (d.video.renderScale = v)), format: pct }),
            toggle('Shadows', () => s().video.shadows, (v) => upd((d) => void (d.video.shadows = v))),
            slider('Field of view (horizontal)', { min: 70, max: 110, step: 1, get: () => s().video.fov, set: (v) => upd((d) => void (d.video.fov = v)), format: (v) => `${v}°` }),
            toggle('Show FPS overlay', () => s().video.showFps, (v) => upd((d) => void (d.video.showFps = v))),
            button('Enter fullscreen', () => void enterFullscreenLandscape(), { class: 'subtle' }),
            resetBtn('video', 'video'),
          ),
      },
      {
        id: 'audio',
        label: 'Audio',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            slider('Master', { min: 0, max: 1, step: 0.05, get: () => s().audio.master, set: (v) => upd((d) => void (d.audio.master = v)), format: pct }),
            slider('Effects', { min: 0, max: 1, step: 0.05, get: () => s().audio.sfx, set: (v) => upd((d) => void (d.audio.sfx = v)), format: pct }),
            slider('Music', { min: 0, max: 1, step: 0.05, get: () => s().audio.music, set: (v) => upd((d) => void (d.audio.music = v)), format: pct }),
            slider('Interface', { min: 0, max: 1, step: 0.05, get: () => s().audio.ui, set: (v) => upd((d) => void (d.audio.ui = v)), format: pct }),
            resetBtn('audio', 'audio'),
          ),
      },
      {
        id: 'gameplay',
        label: 'Gameplay',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            choice('Default shoulder', [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }] as const, () => s().gameplay.defaultShoulder, (v) => upd((d) => void (d.gameplay.defaultShoulder = v))),
            choice('Aim down sights', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.adsToggle, (v) => upd((d) => void (d.gameplay.adsToggle = v))),
            choice('Crouch', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.crouchToggle, (v) => upd((d) => void (d.gameplay.crouchToggle = v))),
            toggle('Auto-snap to cover', () => s().gameplay.autoCover, (v) => upd((d) => void (d.gameplay.autoCover = v))),
            toggle('Cover-to-cover dash', () => s().gameplay.coverDash, (v) => upd((d) => void (d.gameplay.coverDash = v))),
            section(
              'Mouse (desktop testing)',
              slider('Mouse sensitivity', { min: 0.2, max: 4, step: 0.05, get: () => s().mouse.sensitivity, set: (v) => upd((d) => void (d.mouse.sensitivity = v)), format: mult }),
              toggle('Invert Y (mouse)', () => s().mouse.invertY, (v) => upd((d) => void (d.mouse.invertY = v))),
            ),
            resetBtn('gameplay', 'gameplay'),
          ),
      },
    ];
    for (const extra of extraSettingsTabs) tabs.push(extra(app, this));
    this.tabs = new TabView(tabs);
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-title', text: 'Settings' }), this.tabs.el);
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
    const first = this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
    this.app.nav.setRoot(this.el, first);
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Tabs' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
