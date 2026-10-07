import type { HudWidth } from '../../core/display';
import type { App } from '../../core/app';
import { setAuto, setGfx, setPreset, type AimAssistLevel, type Settings } from '../../core/settings';
import { FPS_CAPS, LIGHT_RANGE, type AaMode, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode, type RtRes, type ShadowQuality, type TierQuality } from '../../core/quality';
import { assignBind, bindable, BINDS, clearBind, keyName, type BindId } from '../../input/keyBindings';
import type { PlatformChoice } from '../../core/platform';
import { BENCH } from '../../game/benchmark';
import type { CurveKind } from '../../input/stickMath';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, refreshWidgets, section, slider, TabView, toggle, type TabDef } from '../widgets';
import { LayoutEditorScreen } from './layoutEditor';
import { ControlsScreen } from './controlsScreen';
import { enterFullscreenLandscape, toggleFullscreen } from '../../pwa/pwa';

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
const PLATFORM_OPTS: { value: PlatformChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
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

    const desktop = app.platform.platform === 'desktop';
    const tabs: TabDef[] = [
      {
        id: 'touch',
        label: 'Touch',
        icon: 'hand',
        build: () =>
          h(
            'div',
            { class: 'rows' },
            section(
              'Look',
              slider('Camera stick speed', { min: 0.8, max: 6, step: 0.1, get: () => s().touch.lookSpeed, set: (v) => upd((d) => void (d.touch.lookSpeed = v)), format: (v) => `${v.toFixed(1)}` }),
              slider('Camera stick dead zone', { min: 0, max: 0.4, step: 0.02, get: () => s().touch.lookDeadzone, set: (v) => upd((d) => void (d.touch.lookDeadzone = v)), format: pct }),
              toggle('Camera stick acceleration', () => s().touch.lookAccel, (v) => upd((d) => void (d.touch.lookAccel = v))),
              toggle('Drag to look (upper right)', () => s().touch.dragLook, (v) => upd((d) => void (d.touch.dragLook = v))),
              slider('Drag-look sensitivity', { min: 0.2, max: 3, step: 0.05, get: () => s().touch.lookSensitivity, set: (v) => upd((d) => void (d.touch.lookSensitivity = v)), format: mult }),
              slider('Aim (ADS) sensitivity', { min: 0.2, max: 1.2, step: 0.05, get: () => s().touch.adsMultiplier, set: (v) => upd((d) => void (d.touch.adsMultiplier = v)), format: mult }),
              toggle('Invert Y', () => s().touch.invertY, (v) => upd((d) => void (d.touch.invertY = v))),
              choice('Aim assist', AIM_OPTS, () => s().touch.aimAssist, (v) => upd((d) => void (d.touch.aimAssist = v))),
            ),
            section(
              'Buttons',
              slider('Opacity', { min: 0.1, max: 1, step: 0.05, get: () => s().touch.opacity, set: (v) => upd((d) => void (d.touch.opacity = v)), format: pct }),
              slider('Size', { min: 0.6, max: 1.6, step: 0.05, get: () => s().touch.scale, set: (v) => upd((d) => void (d.touch.scale = v)), format: pct }),
              toggle('Haptics (vibration)', () => s().touch.haptics, (v) => upd((d) => void (d.touch.haptics = v))),
              toggle('Left fire button', () => s().touch.fireLeft, (v) => upd((d) => void (d.touch.fireLeft = v))),
              toggle('Fire button also drags to look', () => s().touch.fireDragLook, (v) => upd((d) => void (d.touch.fireDragLook = v))),
              toggle('Flick move stick to sprint', () => s().touch.dashFlick, (v) => upd((d) => void (d.touch.dashFlick = v))),
              button('Edit button layout', () => this.manager.push(new LayoutEditorScreen(app)), { icon: 'move' }),
            ),
            resetBtn('touch', 'touch'),
          ),
      },
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
            toggle('Cover-to-cover moves', () => s().gameplay.coverDash, (v) => upd((d) => void (d.gameplay.coverDash = v))),
            choice('Sprint', [{ value: false, label: 'Toggle' }, { value: true, label: 'Hold' }], () => s().gameplay.sprintHold, (v) => upd((d) => void (d.gameplay.sprintHold = v))),
            toggle('Camera recentres behind you while moving', () => s().gameplay.autoRecentre, (v) => upd((d) => void (d.gameplay.autoRecentre = v))),
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
    // desktop: no touch settings (a touchscreen laptop keeps them); mobile: no mouse & keyboard page
    const shown = tabs.filter((t) => (t.id === 'touch' ? !desktop || app.platform.touch : t.id === 'kbm' ? desktop : true));
    if (desktop) {
      // mouse & keyboard first on desktop
      const i = shown.findIndex((t) => t.id === 'kbm');
      if (i > 0) shown.unshift(...shown.splice(i, 1));
    }
    this.tabs = new TabView(shown, { side: true });
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-title', text: 'Settings' }), this.tabs.el);
  }

  /** Graphics: platform, preset and every feature, display options (3.0: one renderer, PC presets). */
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
    const tg = (label: string, k: 'ao' | 'bloom' | 'gi' | 'volumetrics' | 'dof' | 'motionBlur' | 'lens'): HTMLElement => {
      const f = feat(k);
      return toggle(label, f.get, f.set);
    };
    const desktop = app.platform.platform === 'desktop';
    panel = h(
      'div',
      { class: 'rows' },
      section(
        'Quality',
        // (phones: Low - Ultra; Epic and ray tracing are PC only)
        choice('Preset', desktop ? PRESET_OPTS : PRESET_OPTS.filter((o) => o.value !== 'epic'), () => (s().video.auto ? 'auto' : s().video.preset), (v) => {
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
        ch('Shadows', 'shadows', SHADOW_OPTS),
        slider('Real-time lights', { min: LIGHT_RANGE.min, max: LIGHT_RANGE.max, step: 4, get: () => s().video.gfx.lights, set: (v) => feat('lights').set(v), format: (v) => `${v}` }),
        ch('Anti-aliasing', 'aa', AA_OPTS),
        ch('Textures', 'textures', TIER_OPTS),
        ch('Detail and draw distance (map dressing: next map)', 'detail', TIER_OPTS),
        ch('Effects and weather', 'effects', TIER_OPTS),
        tg('Ambient occlusion', 'ao'),
        tg('Global illumination (bounce light; next map)', 'gi'),
        tg('Bloom', 'bloom'),
        ch('Reflections', 'reflections', desktop ? REFL_OPTS : REFL_OPTS.filter((o) => o.value !== 'rt')),
        ch('Ray-traced reflections rate', 'rtRes', RTRES_OPTS),
        tg('Volumetric light (fog is always on)', 'volumetrics'),
        slider('Volumetric lights', { min: 2, max: 12, step: 2, get: () => s().video.gfx.volLights, set: (v) => feat('volLights').set(v), format: (v) => `${v}` }),
        ch('Post effects resolution', 'postRes', [
          { value: 'half', label: 'Half' },
          { value: 'full', label: 'Full' },
        ]),
        tg('Depth of field', 'dof'),
        tg('Motion blur', 'motionBlur'),
        tg('Lens effects (aberration, dirt)', 'lens'),
      ),
      section(
        'Display',
        slider('Resolution scale', { min: 0.5, max: 2, step: 0.05, get: () => s().video.renderScale, set: (v) => upd((d) => void (d.video.renderScale = v)), format: pct }),
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
        choice('Interface', PLATFORM_OPTS, () => s().video.platform, (v) => upd((d) => void (d.video.platform = v))),
        button(desktop ? 'Fullscreen' : 'Enter fullscreen', () => void (desktop ? toggleFullscreen() : enterFullscreenLandscape()), { class: 'subtle' }),
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
          text: `A ${BENCH.seconds} s camera flight through the Warehouse: average and 1% low FPS per run (save the results as feedback). Every preset: Low to Epic (Low to Ultra on phones). Resolutions: the render pixel counts of 2560x1600, 4K and 7680x2160 (where render scale 2 reaches them). Sustained: ${BENCH.sustained / 60} minutes, first vs last minute (a laptop throttling once hot).`,
        }),
        button('Run (current settings)', () => app.benchmark?.('current'), { icon: 'monitor' }),
        button('Every preset', () => app.benchmark?.('presets'), { class: 'subtle' }),
        button('Resolutions', () => app.benchmark?.('resolutions'), { class: 'subtle' }),
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
    const keyBtns: { id: BindId; slot: 0 | 1; el: HTMLElement }[] = [];
    const render = (): void => {
      for (const k of keyBtns) {
        const code = s().keys[k.id][k.slot];
        k.el.textContent = code ? keyName(code) : '-';
        k.el.classList.toggle('empty', !code);
        k.el.classList.remove('listening');
      }
    };
    const keyBtn = (id: BindId, slot: 0 | 1): HTMLElement => {
      const el = h('button', { class: 'kb-key', focus: true });
      (el as HTMLButtonElement).type = 'button';
      el.dataset.bind = `${id}:${slot}`;
      el.addEventListener('click', () => {
        if (app.input.kbm.capturing) return;
        render();
        el.textContent = 'Press a key';
        el.classList.add('listening');
        app.input.kbm.captureNext((code) => {
          if (code === '') upd((d) => clearBind(d.keys, id, slot));
          else if (code !== null) {
            if (!bindable(code)) {
              app.toasts.show(`${keyName(code)} can't be bound`, 'warn', 1600);
            } else {
              let from: BindId | null = null;
              upd((d) => void (from = assignBind(d.keys, id, slot, code)));
              const f = BINDS.find((b) => b.id === from);
              if (f) app.toasts.show(`${keyName(code)} moved from ${f.label}`, 'info', 1800);
            }
          }
          render();
        });
      });
      keyBtns.push({ id, slot, el });
      return el;
    };
    const rows = BINDS.map((b) => h('div', { class: 'row kb-row' }, h('span', { class: 'row-label', text: b.label }), h('span', { class: 'kb-keys' }, keyBtn(b.id, 0), keyBtn(b.id, 1))));
    render();
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
      section('Keys', h('div', { class: 'row-note', text: 'Click a key, then press the new key or mouse button. Esc cancels, Backspace clears. Left / right mouse: fire / aim; wheel: weapons; 1-8: gadgets.' }), ...rows),
      button('Reset keys to defaults', () => {
        st.reset('keys');
        render();
      }, { class: 'subtle' }),
      button('Reset mouse to defaults', () => {
        st.reset('mouse');
        this.tabs.rebuild('kbm');
        app.nav.refresh();
      }, { class: 'subtle' }),
    );
  }

  override onShow(): void {
    // the interface choice (or a window resize) flipping the platform rebuilds the tabs
    this.app.onPlatform = () => {
      if (this.manager.top === this) this.manager.replace(new SettingsScreen(this.app));
    };
  }

  override onHide(): void {
    this.app.onPlatform = null;
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
