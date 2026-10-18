import type { HudWidth } from '../../core/display';
import type { App } from '../../core/app';
import { flags } from '../../core/flags';
import { setAuto, setGfx, setPreset, type AimAssistLevel, type Settings } from '../../core/settings';
import { FPS_CAPS, type AaMode, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode, type RtRes, type ShadowQuality, type TierQuality } from '../../core/quality';
import { BENCH } from '../../game/benchmark';
import type { CurveKind } from '../../input/stickMath';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, refreshWidgets, section, slider, TabView, toggle, type TabDef } from '../widgets';
import { bindPanel, ControlsScreen } from './controlsScreen';
import { BrightnessScreen } from './brightnessScreen';
import { toggleFullscreen } from '../../pwa/pwa';
import { currentResolution, ResolutionPicker } from './resolutionPicker';

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
const PRESET_OPTS: { value: GraphicsPreset | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto (this device)' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'epic', label: 'Epic' },
  { value: 'custom', label: 'Custom' },
];
const SHADOW_OPTS: { value: ShadowQuality; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low (moon)' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'epic', label: 'Epic (soft)' },
];
const TIER_OPTS: { value: TierQuality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'epic', label: 'Epic' },
];
const REFL_OPTS: { value: ReflectionMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'ssr', label: 'Screen space' },
  { value: 'rt', label: 'Ray traced' },
];
const RTRES_OPTS: { value: RtRes; label: string }[] = [
  { value: 'half', label: 'Half rate' },
  { value: 'full', label: 'Full' },
];
const UPSCALER_OPTS: { value: 'off' | 'taau'; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'taau', label: 'TAAU (temporal upscaling)' },
];
const AA_OPTS: { value: AaMode; label: string }[] = [
  { value: 'fxaa', label: 'FXAA' },
  { value: 'msaa', label: 'MSAA 4x' },
  { value: 'taa', label: 'TAA' },
];
const HUD_OPTS: { value: HudWidth; label: string }[] = [
  { value: 'auto', label: 'Auto (16:9 on 32:9)' },
  { value: '16:9', label: '16:9 centred' },
  { value: '21:9', label: '21:9 centred' },
  { value: 'full', label: 'Full width' },
];
const CAP_OPTS = FPS_CAPS.map((v) => ({ value: v as number, label: v === 0 ? 'Off (display)' : `${v} fps` }));

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const mult = (v: number): string => `${v.toFixed(2)}x`;

/** Extra tabs contributed by later systems (e.g. save data). */
export const extraSettingsTabs: ((app: App, screen: SettingsScreen) => TabDef)[] = [];

export class SettingsScreen extends Screen {
  private tabs: TabView;
  private tabIds: string[] = [];

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
        id: 'kbm',
        label: 'Mouse & Keyboard',
        icon: 'keyboard',
        build: () => this.kbmTab(),
      },
      {
        id: 'pad',
        label: 'Controller',
        icon: 'pad',
        build: () => {
          const status = h('div', { class: 'row-note' });
          const refresh = (): void => {
            status.textContent = app.input.gamepad.connected
              ? 'Controller connected.'
              : 'No controller detected. Press any button on the controller after pairing.';
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
              slider('Rumble strength', { min: 0, max: 1, step: 0.05, get: () => s().gameplay.rumble, set: (v) => upd((d) => void (d.gameplay.rumble = v)), format: pct }),
              button('Test vibration', () => void app.input.testHaptic(), { class: 'subtle' }),
            ),
            resetBtn('gamepad', 'pad'),
          );
        },
      },
      {
        id: 'video',
        label: 'Graphics',
        icon: 'monitor',
        build: () => this.graphicsTab(),
      },
      {
        id: 'audio',
        label: 'Audio',
        icon: 'speaker',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            slider('Master', { min: 0, max: 1, step: 0.05, get: () => s().audio.master, set: (v) => upd((d) => void (d.audio.master = v)), format: pct }),
            slider('Effects', { min: 0, max: 1, step: 0.05, get: () => s().audio.sfx, set: (v) => upd((d) => void (d.audio.sfx = v)), format: pct }),
            slider('Music', { min: 0, max: 1, step: 0.05, get: () => s().audio.music, set: (v) => upd((d) => void (d.audio.music = v)), format: pct }),
            slider('Interface', { min: 0, max: 1, step: 0.05, get: () => s().audio.ui, set: (v) => upd((d) => void (d.audio.ui = v)), format: pct }),
            // (music project) a debug screen for the score: dev flag `?debug=1`
            flags.debug ? button('Music lab', () => void import('../../audio/music/musicLab').then((m) => app.screens.push(new m.MusicLabScreen(app))), { icon: 'speaker', class: 'subtle' }) : null,
            resetBtn('audio', 'audio'),
          ),
      },
      {
        id: 'gameplay',
        label: 'Gameplay',
        icon: 'gear',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            choice('Default shoulder', [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }] as const, () => s().gameplay.defaultShoulder, (v) => upd((d) => void (d.gameplay.defaultShoulder = v))),
            choice('Aim down sights', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.adsToggle, (v) => upd((d) => void (d.gameplay.adsToggle = v))),
            choice('Crouch', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.crouchToggle, (v) => upd((d) => void (d.gameplay.crouchToggle = v))),
            choice('Sprint', [{ value: false, label: 'Toggle' }, { value: true, label: 'Hold' }], () => s().gameplay.sprintHold, (v) => upd((d) => void (d.gameplay.sprintHold = v))),
            // (locomotion step 18, D7) back-to-wall and the grab from behind: hold or toggle
            choice('Back to wall', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.wallToggle, (v) => upd((d) => void (d.gameplay.wallToggle = v))),
            choice('Grab (from behind)', [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }], () => s().gameplay.grabToggle, (v) => upd((d) => void (d.gameplay.grabToggle = v))),
            toggle('Camera recentres behind you while moving', () => s().gameplay.autoRecentre, (v) => upd((d) => void (d.gameplay.autoRecentre = v))),
            toggle('Course markers', () => s().gameplay.courseMarkers, (v) => upd((d) => void (d.gameplay.courseMarkers = v))),
            toggle('Slow-motion beat on the last enemy in a room', () => s().gameplay.slowBeat, (v) => upd((d) => void (d.gameplay.slowBeat = v))),
            resetBtn('gameplay', 'gameplay'),
          ),
      },
      {
        id: 'access',
        label: 'Accessibility',
        icon: 'access',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            button('Controls', () => app.screens.push(new ControlsScreen(app)), { icon: 'gear' }),
            slider('HUD size', { min: 0.8, max: 1.4, step: 0.05, get: () => s().access.hudScale, set: (v) => upd((d) => void (d.access.hudScale = v)), format: mult }),
            toggle('Health bar (off: screen-edge vignette only)', () => s().access.healthBar, (v) => upd((d) => void (d.access.healthBar = v))),
            toggle('Always show ammo and gadgets', () => s().access.ammoAlways, (v) => upd((d) => void (d.access.ammoAlways = v))),
            toggle('Colour-blind-safe awareness colours', () => s().access.colorSafe, (v) => upd((d) => void (d.access.colorSafe = v))),
            toggle('Subtitles for enemy barks and radio', () => s().access.subtitles, (v) => upd((d) => void (d.access.subtitles = v))),
            choice('Held actions (downloads, panels, revives)', [{ value: false, label: 'Hold' }, { value: true, label: 'Tap to start' }], () => s().access.holdToggle, (v) => upd((d) => void (d.access.holdToggle = v))),
            slider('Camera shake', { min: 0, max: 1, step: 0.1, get: () => s().access.shake, set: (v) => upd((d) => void (d.access.shake = v)), format: (v) => `${Math.round(v * 100)}%` }),
            resetBtn('access', 'access'),
          ),
      },
    ];
    for (const extra of extraSettingsTabs) tabs.push(extra(app, this));
    // mouse & keyboard first
    const i = tabs.findIndex((t) => t.id === 'kbm');
    if (i > 0) tabs.unshift(...tabs.splice(i, 1));
    this.tabs = new TabView(tabs, { side: true });
    this.tabIds = tabs.map((t) => t.id);
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-title', text: 'Settings' }), this.tabs.el);
  }

  /** Opens on a tab by id (menu-ui slice 1: the main menu's Feedback item opens the Feedback tab). */
  openTab(id: string): this {
    const i = this.tabIds.indexOf(id);
    if (i >= 0) this.tabs.select(i);
    return this;
  }

  /** Graphics: preset and every feature, display options (3.0: one renderer, PC presets). */
  private graphicsTab(): HTMLElement {
    const app = this.app;
    const st = app.settings;
    const s = (): Settings => st.get();
    const upd = st.update.bind(st);
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    let panel: HTMLElement | null = null;
    const cap = (p: string): string => p[0]!.toUpperCase() + p.slice(1);
    const autoNote = h('div', { class: 'row-note auto-note' });
    const noteText = (): string => {
      const v = s().video;
      if (app.detecting) return 'Measuring this device on the menu stage...';
      const d = v.device;
      const found = d.tier ? `${cap(d.tier)} (${d.source === 'gpu' ? 'from the GPU' : 'measured'})` : 'not detected yet';
      return `${v.auto ? `Auto: ${cap(v.preset)}` : 'Auto is off'} - this device: ${found}. In a match the detail adapts to hold the frame rate.`;
    };
    const refresh = (): void => {
      if (panel) refreshWidgets(panel);
      autoNote.textContent = noteText();
    };
    autoNote.textContent = noteText();
    app.onDetected = refresh;
    const feat = <K extends keyof GraphicsFeatures>(k: K) => ({
      get: (): GraphicsFeatures[K] => s().video.gfx[k],
      set: (v: GraphicsFeatures[K]): void => {
        upd((d) => setGfx(d, k, v));
        refresh();
      },
    });
    const ch = <K extends keyof GraphicsFeatures>(label: string, k: K, opts: { value: GraphicsFeatures[K]; label: string }[]): HTMLElement => {
      const f = feat(k);
      return choice(label, opts, f.get, f.set);
    };
    const tg = (label: string, k: 'ao' | 'bloom' | 'gi' | 'volumetrics' | 'dof' | 'lens'): HTMLElement => {
      const f = feat(k);
      return toggle(label, f.get, f.set);
    };
    panel = h(
      'div',
      { class: 'rows' },
      section(
        'Quality',
        choice('Preset', PRESET_OPTS, () => (s().video.auto ? 'auto' : s().video.preset), (v) => {
          // (Custom is where hand changes land; picking it keeps the current features)
          if (v === 'auto') {
            upd((d) => setAuto(d, d.video.device.tier));
            app.detectGraphics();
          } else if (v !== 'custom') upd((d) => setPreset(d, v));
          else upd((d) => void (d.video.auto = false));
          refresh();
        }),
        autoNote,
        button('Detect again', () => {
          upd((d) => setAuto(d, d.video.device.tier));
          app.detectGraphics(true);
          refresh();
        }, { class: 'subtle' }),
        // (3.2: every lamp is baked - lit and shadowed on every preset; Shadows is the moon and the flashlights)
        ch('Shadows (moon, flashlights)', 'shadows', SHADOW_OPTS),
        ch('Anti-aliasing', 'aa', AA_OPTS),
        ch('Textures', 'textures', TIER_OPTS),
        ch('Detail and draw distance (map dressing: next map)', 'detail', TIER_OPTS),
        ch('Effects and weather', 'effects', TIER_OPTS),
        // (motion blur is gone: no preset used it)
        tg('Ambient occlusion', 'ao'),
        tg('Global illumination (bounce light; next map)', 'gi'),
        tg('Bloom', 'bloom'),
        ch('Reflections', 'reflections', REFL_OPTS),
        ch('Ray-traced reflections rate', 'rtRes', RTRES_OPTS),
        tg('Volumetric light (fog is always on)', 'volumetrics'),
        slider('Volumetric lights', { min: 2, max: 12, step: 2, get: () => s().video.gfx.volLights, set: (v) => feat('volLights').set(v), format: (v) => `${v}` }),
        ch('Post effects resolution', 'postRes', [
          { value: 'half', label: 'Half' },
          { value: 'full', label: 'Full' },
        ]),
        tg('Depth of field', 'dof'),
        tg('Lens effects (aberration, dirt)', 'lens'),
      ),
      section(
        'Display',
        // (3.1.7: a list of real resolutions, applied on a pick and kept only when confirmed)
        resolutionRow(app),
        button('Brightness', () => app.screens.push(new BrightnessScreen(app)), { class: 'subtle' }),
        toggle('Adaptive detail (holds the frame rate in a match)', () => s().video.adaptive, (v) => upd((d) => void (d.video.adaptive = v))),
        choice('Upscaler (with a resolution scale under 100%)', UPSCALER_OPTS, () => s().video.upscaler, (v) => upd((d) => void (d.video.upscaler = v))),
        slider('Panini projection (wide FOV)', { min: 0, max: 1, step: 0.05, get: () => s().video.panini, set: (v) => upd((d) => void (d.video.panini = v)), format: (v) => (v === 0 ? 'Off' : pct(v)) }),
        choice('Target frame rate', CAP_OPTS.map((o) => (o.value === 0 ? { value: 0, label: `Display refresh (${Math.round(app.quality.hz)} Hz)` } : o)), () => s().video.fpsCap, (v) => upd((d) => void (d.video.fpsCap = v))),
        slider('Field of view (horizontal, 16:9)', { min: 60, max: 120, step: 1, get: () => s().video.fovH, set: (v) => upd((d) => void (d.video.fovH = v)), format: (v) => `${v}°` }),
        slider('Widest field of view (ultrawide)', { min: 90, max: 150, step: 5, get: () => s().video.maxFov, set: (v) => upd((d) => void (d.video.maxFov = v)), format: (v) => `${v}°` }),
        choice('HUD width', HUD_OPTS, () => s().video.hudWidth, (v) => upd((d) => void (d.video.hudWidth = v))),
        toggle('Show FPS overlay', () => s().video.showFps, (v) => upd((d) => void (d.video.showFps = v))),
        toggle('Cinematic vignette', () => s().video.vignette, (v) => upd((d) => void (d.video.vignette = v))),
        toggle('Film grain', () => s().video.filmGrain, (v) => upd((d) => void (d.video.filmGrain = v))),
        choice('Avatar style', [{ value: 'detailed' as const, label: 'Operator (detailed)' }, { value: 'stick' as const, label: 'Stick' }], () => s().video.avatarStyle, (v) => upd((d) => void (d.video.avatarStyle = v))),
        button('Fullscreen', () => void toggleFullscreen(), { class: 'subtle' }),
      ),
      section(
        'GPU',
        h('div', {
          class: 'row-note gpu-note',
          text:
            `${app.gpu.renderer || 'Unknown renderer'} (${app.gpu.kind})` +
            (app.gpu.kind === 'integrated' ? '. This is the integrated GPU: set your browser to "High performance" in Windows Settings > System > Display > Graphics, then restart it.' : ''),
        }),
      ),
      section(
        'Benchmark',
        h('div', {
          class: 'row-note',
          text: `A ${BENCH.seconds} s camera flight through the Warehouse: average and 1% low FPS per run (save the results as feedback). Every preset: Low to Epic. Feature costs: your settings, then each costly feature off in turn (what to cut on this device). Resolutions: each of this monitor's resolutions (in fullscreen; a window renders the same share of itself). Sustained: ${BENCH.sustained / 60} minutes, first vs last minute (a laptop throttling once hot).`,
        }),
        button('Run (current settings)', () => app.benchmark?.('current'), { icon: 'monitor' }),
        button('Every preset', () => app.benchmark?.('presets'), { class: 'subtle' }),
        button('Resolutions', () => app.benchmark?.('resolutions'), { class: 'subtle' }),
        button('Feature costs', () => app.benchmark?.('features'), { class: 'subtle' }),
        button(`Sustained (${BENCH.sustained / 60} min)`, () => app.benchmark?.('sustained'), { class: 'subtle' }),
      ),
      button('Reset to defaults', () => {
        st.reset('video');
        refresh();
      }, { class: 'subtle' }),
    );
    return panel;
  }

  /** Mouse & keyboard (desktop): look, raw input and every key binding (click a key, press the new one). */
  private kbmTab(): HTMLElement {
    const app = this.app;
    const st = app.settings;
    const s = (): Settings => st.get();
    const upd = st.update.bind(st);
    const mult = (v: number): string => `${v.toFixed(2)}x`;
    /* (locomotion step 18) the key rows are the controls screen's binding panel (conflict warnings, reset) */
    return h(
      'div',
      { class: 'rows' },
      section(
        'Mouse',
        slider('Sensitivity', { min: 0.2, max: 4, step: 0.05, get: () => s().mouse.sensitivity, set: (v) => upd((d) => void (d.mouse.sensitivity = v)), format: mult }),
        slider('Aim (ADS) sensitivity', { min: 0.2, max: 1.5, step: 0.05, get: () => s().mouse.adsMultiplier, set: (v) => upd((d) => void (d.mouse.adsMultiplier = v)), format: mult }),
        toggle('Invert Y', () => s().mouse.invertY, (v) => upd((d) => void (d.mouse.invertY = v))),
        toggle('Raw input (no pointer acceleration)', () => s().mouse.raw, (v) => upd((d) => void (d.mouse.raw = v))),
      ),
      section('Keys', bindPanel(app, 'kbm')),
      button('Reset mouse to defaults', () => {
        st.reset('mouse');
        this.tabs.rebuild('kbm');
        app.nav.refresh();
      }, { class: 'subtle' }),
    );
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
      { btn: 'LB/RB', label: 'Category' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}

/** Desktop: the Resolution row - the current render resolution; a tap opens the list (`ResolutionPicker`). */
function resolutionRow(app: App): HTMLElement {
  const b = button(`Resolution: ${currentResolution(app)}`, () => {
    app.screens.push(new ResolutionPicker(app, () => {
      const l = b.querySelector('.btn-label');
      if (l) l.textContent = `Resolution: ${currentResolution(app)}`;
    }));
  }, { class: 'subtle res-row' });
  return b;
}
