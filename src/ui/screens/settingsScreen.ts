import { runningOnWindows, type HudWidth } from '../../core/display';
import type { App } from '../../core/app';
import { flags } from '../../core/flags';
import { defaultSettings, setAuto, setGfx, setPreset, type Settings } from '../../core/settings';
import { FPS_CAPS, type AaMode, type GraphicsFeatures, type GraphicsPreset, type ReflectionMode,type ShadowQuality, type TierQuality } from '../../core/quality';
import { BENCH } from '../../game/benchmark';
import type { CurveKind } from '../../input/stickMath';
import type { CharShadowMode } from '../../world/charShadowSet';
import { h } from '../dom';
import { MenuScreen, type LegendItem } from '../menuScreen';
import { button, choice, describe, Dialog, lockedRow, refreshWidgets, slider, TabView, toggle, type TabDef } from '../widgets';
import { ControlsScreen } from './controlsScreen';
import { BrightnessScreen } from './brightnessScreen';
import { toggleFullscreen } from '../../pwa/pwa';
import { currentResolution, ResolutionPicker } from './resolutionPicker';

const CURVE_OPTS: { value: CurveKind; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'classic', label: 'Classic' },
  { value: 'precise', label: 'Precise' },
  { value: 'aggressive', label: 'Aggressive' },
];
/** (LR14) Graphics > Character shadows. */
const CHAR_SHADOW_OPTS: { value: CharShadowMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
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
// (settings-rt-hide: 'Ray traced' is gone from the list since voxel-retire; a saved 'rt' shows and runs as Screen space)
const REFL_OPTS: { value: ReflectionMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'ssr', label: 'Screen space' },
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

/** A tab's rows: one up / down list that wraps (menu-ui SPEC 4.3). */
export function rowList(...children: (HTMLElement | null)[]): HTMLElement {
  return h('div', { class: 'rows ms-rows', attrs: { 'data-wrap': '' } }, ...children.filter((c): c is HTMLElement => c !== null));
}

/** A section label row (not focusable, SPEC 7.11). */
export function grp(title: string): HTMLElement {
  return h('div', { class: 'grp', text: title });
}

/** Sets a row's description (the context panel, MD9); the label is read from the row. */
export function desc<T extends HTMLElement>(el: T, text: string): T {
  const label = el.querySelector('.row-label, .btn-label')?.textContent ?? '';
  return describe(el, label, text, el.dataset.key);
}

/** The gameplay fields the Controls tab owns (hold or toggle, rumble): its Defaults resets these. */
const CONTROL_GAMEPLAY = ['crouchToggle', 'wallToggle', 'rumble'] as const;

/**
 * GAME / SETTINGS (menu-ui SPEC 7.11, MD9) on the MenuScreen template: a tab strip (LB / RB, Q / E, clicks), rows with
 * a description each in the context panel, X Defaults per tab (confirm, Cancel first), focus memory per tab.
 */
export class SettingsScreen extends MenuScreen {
  private tabs: TabView;
  private tabIds: string[] = [];
  /** Tab id -> its Defaults (no entry: the tab has none, e.g. Feedback and Data). */
  private resets = new Map<string, () => void>();
  private shown = false;

  constructor(private app: App) {
    super('settings-screen', ['Game', 'Settings']);
    const st = app.settings;
    const s = (): Settings => st.get();
    const upd = st.update.bind(st);
    const hold = [{ value: false, label: 'Hold' }, { value: true, label: 'Toggle' }];

    const tabs: TabDef[] = [
      {
        id: 'controls',
        label: 'Controls',
        build: () => {
          const status = h('div', { class: 'row-note pad-status' });
          status.textContent = app.input.gamepad.connected ? 'Controller connected.' : 'No controller detected. Press any button on the controller after pairing.';
          return rowList(
            desc(button('Remap controls', () => app.screens.push(new ControlsScreen(app)), { key: 'remap' }), 'Change the buttons and keys for every action, on the controller and on the keyboard and mouse.'),
            grp('Hold or toggle'),
            desc(choice('Crouch', hold, () => s().gameplay.crouchToggle, (v) => upd((d) => void (d.gameplay.crouchToggle = v))), 'Hold: crouch while the button is held. Toggle: one press crouches, the next stands.'),
            desc(choice('Back to wall', hold, () => s().gameplay.wallToggle, (v) => upd((d) => void (d.gameplay.wallToggle = v))), 'Hold: stay on the wall while the button is held. Toggle: one press goes to the wall, the next leaves it.'),
            grp('Controller'),
            status,
            desc(slider('Look sensitivity (horizontal)', { min: 0.2, max: 3, step: 0.05, get: () => s().gamepad.lookSensitivityX, set: (v) => upd((d) => void (d.gamepad.lookSensitivityX = v)), format: mult }), 'How fast the right stick turns the camera left and right.'),
            desc(slider('Look sensitivity (vertical)', { min: 0.2, max: 3, step: 0.05, get: () => s().gamepad.lookSensitivityY, set: (v) => upd((d) => void (d.gamepad.lookSensitivityY = v)), format: mult }), 'How fast the right stick tilts the camera up and down.'),
            desc(slider('Aim sensitivity', { min: 0.2, max: 1.2, step: 0.05, get: () => s().gamepad.adsMultiplier, set: (v) => upd((d) => void (d.gamepad.adsMultiplier = v)), format: mult }), 'Look speed while aiming, as a share of the normal speed. Lower is steadier.'),
            desc(choice('Response curve', CURVE_OPTS, () => s().gamepad.curve, (v) => upd((d) => void (d.gamepad.curve = v))), 'How the right stick turns its tilt into speed. Classic is gentle near the centre; Linear follows the stick exactly.'),
            desc(slider('Dead zone (left stick)', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.deadzoneLeft, set: (v) => upd((d) => void (d.gamepad.deadzoneLeft = v)), format: pct }), 'How far the left stick moves before you walk. Raise it if you drift with the stick at rest.'),
            desc(slider('Dead zone (right stick)', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.deadzoneRight, set: (v) => upd((d) => void (d.gamepad.deadzoneRight = v)), format: pct }), 'How far the right stick moves before the camera turns. Raise it if the view creeps on its own.'),
            desc(slider('Dead zone (triggers)', { min: 0, max: 0.4, step: 0.01, get: () => s().gamepad.triggerDeadzone, set: (v) => upd((d) => void (d.gamepad.triggerDeadzone = v)), format: pct }), 'How far a trigger travels before it aims or fires.'),
            desc(toggle('Invert Y (controller)', () => s().gamepad.invertY, (v) => upd((d) => void (d.gamepad.invertY = v))), 'Pushing the right stick up looks down, like a flight stick.'),
            desc(toggle('Vibration', () => s().gamepad.vibration, (v) => upd((d) => void (d.gamepad.vibration = v))), 'Rumble for shots, hits, takedowns and footsteps close by.'),
            desc(slider('Rumble strength', { min: 0, max: 1, step: 0.05, get: () => s().gameplay.rumble, set: (v) => upd((d) => void (d.gameplay.rumble = v)), format: pct }), 'How strong every rumble is.'),
            desc(button('Test vibration', () => void app.input.testHaptic(), { class: 'subtle' }), 'Plays one rumble at the strength above.'),
            grp('Mouse'),
            desc(slider('Mouse sensitivity', { min: 0.2, max: 4, step: 0.05, get: () => s().mouse.sensitivity, set: (v) => upd((d) => void (d.mouse.sensitivity = v)), format: mult }), 'How far the camera turns for each move of the mouse.'),
            desc(slider('Mouse aim sensitivity', { min: 0.2, max: 1.5, step: 0.05, get: () => s().mouse.adsMultiplier, set: (v) => upd((d) => void (d.mouse.adsMultiplier = v)), format: mult }), 'Mouse speed while aiming, as a share of the normal speed.'),
            desc(toggle('Invert Y (mouse)', () => s().mouse.invertY, (v) => upd((d) => void (d.mouse.invertY = v))), 'Moving the mouse forward looks down.'),
            desc(toggle('Raw input', () => s().mouse.raw, (v) => upd((d) => void (d.mouse.raw = v))), 'Reads the mouse without the system\'s pointer acceleration, so the same move always turns the same amount.'),
          );
        },
      },
      {
        id: 'gameplay',
        label: 'Gameplay',
        build: () =>
          rowList(
            desc(toggle('Course markers', () => s().gameplay.courseMarkers, (v) => upd((d) => void (d.gameplay.courseMarkers = v))), 'Shows the markers on training and test courses.'),
            desc(toggle('Hints', () => s().gameplay.hints, (v) => upd((d) => void (d.gameplay.hints = v))), 'Shows a hint line under the current mission objective.'),
            desc(toggle('Last-guard slow motion', () => s().gameplay.slowBeat, (v) => upd((d) => void (d.gameplay.slowBeat = v))), 'A short slow-motion beat when the last guard in a room goes down.'),
            // (anim-fix-pass AF5, BRIEF A1) no "Mocap locomotion" row: mocap is the only player path (app.ts; `?mocap=0`
            // or the tuner box turn it off for one page); (LR16a) no Lamp falloff row: one photometric light model
          ),
      },
      {
        id: 'video',
        label: 'Graphics',
        build: () => this.graphicsTab(),
      },
      {
        id: 'audio',
        label: 'Audio',
        build: () =>
          rowList(
            desc(slider('Master', { min: 0, max: 1, step: 0.05, get: () => s().audio.master, set: (v) => upd((d) => void (d.audio.master = v)), format: pct }), 'The volume of everything.'),
            desc(slider('Effects', { min: 0, max: 1, step: 0.05, get: () => s().audio.sfx, set: (v) => upd((d) => void (d.audio.sfx = v)), format: pct }), 'Footsteps, guns, doors, guards and the world around you.'),
            desc(slider('Music', { min: 0, max: 1, step: 0.05, get: () => s().audio.music, set: (v) => upd((d) => void (d.audio.music = v)), format: pct }), 'The score, in menus and in missions.'),
            desc(slider('Interface', { min: 0, max: 1, step: 0.05, get: () => s().audio.ui, set: (v) => upd((d) => void (d.audio.ui = v)), format: pct }), 'Menu sounds: moving, selecting and going back.'),
            // (music project) a debug screen for the score: dev flag `?debug=1`
            flags.debug ? button('Music lab', () => void import('../../audio/music/musicLab').then((m) => app.screens.push(new m.MusicLabScreen(app))), { class: 'subtle', desc: 'A debug screen for the score.' }) : null,
          ),
      },
      {
        id: 'access',
        label: 'Accessibility',
        build: () => {
          // (SPEC 7.11) subtitles carry the story: always on
          if (!s().access.subtitles) upd((d) => void (d.access.subtitles = true));
          return rowList(
            lockedRow('Subtitles', 'Always on', 'Subtitles carry the story, so they are always on.', 'Radio, briefings and guard barks as text at the bottom of the screen.'),
            desc(toggle('Colour-blind-safe awareness colours', () => s().access.colorSafe, (v) => upd((d) => void (d.access.colorSafe = v))), 'Guard awareness uses colours that read with every common kind of colour blindness.'),
            desc(slider('HUD size', { min: 0.8, max: 1.4, step: 0.05, get: () => s().access.hudScale, set: (v) => upd((d) => void (d.access.hudScale = v)), format: mult }), 'The size of the light meter, the ammo and the prompts in a mission.'),
            desc(toggle('Health bar', () => s().access.healthBar, (v) => upd((d) => void (d.access.healthBar = v))), 'Off: only the screen edge shows damage.'),
            desc(toggle('Always show ammo', () => s().access.ammoAlways, (v) => upd((d) => void (d.access.ammoAlways = v))), 'Keeps the ammo and gadget counts on screen instead of fading them out.'),
            desc(slider('Camera shake', { min: 0, max: 1, step: 0.1, get: () => s().access.shake, set: (v) => upd((d) => void (d.access.shake = v)), format: pct }), 'How much the camera shakes for shots, blasts and falls.'),
            desc(choice('Held interactions', [{ value: false, label: 'Hold' }, { value: true, label: 'Tap to start' }], () => s().access.holdToggle, (v) => upd((d) => void (d.access.holdToggle = v))), 'Downloads, panels and revives. Tap to start runs them without holding the button.'),
          );
        },
      },
    ];
    for (const extra of extraSettingsTabs) tabs.push(extra(app, this));

    const fromDefaults = (f: (d: Settings, def: Settings) => void): void => {
      const def = defaultSettings();
      upd((d) => f(d, def));
    };
    this.resets.set('controls', () =>
      fromDefaults((d, def) => {
        d.gamepad = def.gamepad;
        d.mouse = def.mouse;
        for (const k of CONTROL_GAMEPLAY) (d.gameplay as unknown as Record<string, unknown>)[k] = def.gameplay[k];
      }),
    );
    this.resets.set('gameplay', () =>
      fromDefaults((d, def) => {
        d.gameplay.courseMarkers = def.gameplay.courseMarkers;
        d.gameplay.slowBeat = def.gameplay.slowBeat;
        d.gameplay.hints = def.gameplay.hints;
      }),
    );
    this.resets.set('video', () => st.reset('video'));
    this.resets.set('audio', () => st.reset('audio'));
    this.resets.set('access', () => st.reset('access'));

    this.tabs = new TabView(tabs, { menu: true });
    this.tabIds = tabs.map((t) => t.id);
    this.tabs.focused = () => app.nav.focused;
    this.tabs.onChange = () => {
      if (!this.shown) return;
      app.nav.setRoot(this.el, this.tabs.recall());
      this.renderHints();
    };
    this.body.append(this.tabs.el);
  }

  /** Opens on a tab by id (menu-ui slice 1: the main menu's Feedback item opens the Feedback tab). */
  openTab(id: string): this {
    const i = this.tabIds.indexOf(id);
    if (i >= 0) this.tabs.select(i);
    return this;
  }

  override onShow(): void {
    this.shown = true;
  }

  override initialFocus(): HTMLElement | null {
    return this.tabs.recall();
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
  }

  /** X: the active tab's Defaults, after a confirm with Cancel first (SPEC 7.11, MD18). */
  override onX(): void {
    const id = this.tabs.activeId;
    const reset = this.resets.get(id);
    if (!reset) return;
    this.manager.push(
      new Dialog(`Reset ${this.tabs.activeLabel} to defaults?`, 'Every setting on this tab goes back to its default.', [
        { label: 'Cancel', safe: true, action: () => {} },
        {
          label: 'Reset',
          action: () => {
            reset();
            this.tabs.rebuild(id);
            this.app.nav.setRoot(this.el, this.tabs.recall());
          },
        },
      ]),
    );
  }

  override legend(): LegendItem[] {
    const out: LegendItem[] = [
      { act: 'back', label: 'Back' },
      { act: 'confirm', label: 'Select' },
      { act: 'lb', label: '' },
      { act: 'rb', label: 'Category' },
    ];
    if (this.resets.has(this.tabs.activeId)) out.push({ act: 'x', label: 'Defaults' });
    return out;
  }

  /** Graphics: preset and every feature, display options (3.0: one renderer, PC presets). */
  private graphicsTab(): HTMLElement {
    const app = this.app;
    const st = app.settings;
    const s = (): Settings => st.get();
    const upd = st.update.bind(st);
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
        // (SPEC 7.11) any quality row moves the preset to Custom (setGfx)
        upd((d) => setGfx(d, k, v));
        refresh();
      },
    });
    const ch = <K extends keyof GraphicsFeatures>(label: string, k: K, opts: { value: GraphicsFeatures[K]; label: string }[], text: string): HTMLElement => {
      const f = feat(k);
      return desc(choice(label, opts, f.get, f.set), text);
    };
    const tg = (label: string, k: 'ao' | 'bloom' | 'volumetrics' | 'dof' | 'lens', text: string): HTMLElement => {
      const f = feat(k);
      return desc(toggle(label, f.get, f.set), text);
    };
    panel = rowList(
      grp('Quality'),
      desc(choice('Preset', PRESET_OPTS, () => (s().video.auto ? 'auto' : s().video.preset), (v) => {
        // (Custom is where hand changes land; picking it keeps the current features)
        if (v === 'auto') {
          upd((d) => setAuto(d, d.video.device.tier));
          app.detectGraphics();
        } else if (v !== 'custom') upd((d) => setPreset(d, v));
        else upd((d) => void (d.video.auto = false));
        refresh();
      }), 'Sets every quality row at once. Auto picks one for this device; changing any row below makes it Custom.'),
      autoNote,
      desc(button('Detect again', () => {
        upd((d) => setAuto(d, d.video.device.tier));
        app.detectGraphics(true);
        refresh();
      }, { class: 'subtle' }), 'Measures this device again and picks the Auto preset from the result.'),
      // (3.2: every lamp is baked - lit and shadowed on every preset; Shadows is the moon and the flashlights)
      ch('Shadows', 'shadows', SHADOW_OPTS, 'Shadows from the moon and the flashlights. Lamps are always lit and shadowed.'),
      // (LR14) the nearest lamps' character silhouettes: Auto follows Shadows (on from High)
      desc(choice('Character shadows', CHAR_SHADOW_OPTS, () => s().video.charShadows, (v) => upd((d) => void (d.video.charShadows = v))), 'The lamps nearest you cast the real shape of guards, your partner, bodies and weapons. Off: soft round shadows (cheaper). Auto: on from High shadows. Looks only: the light meter and the guards are the same either way.'),
      ch('Anti-aliasing', 'aa', AA_OPTS, 'Smooths jagged edges. TAA is the smoothest; FXAA is the cheapest.'),
      ch('Textures', 'textures', TIER_OPTS, 'Surface detail. Lower it if the game stutters when you enter a new area.'),
      ch('Detail and draw distance', 'detail', TIER_OPTS, 'How much map dressing is drawn and how far away.'),
      ch('Effects and weather', 'effects', TIER_OPTS, 'Rain, sparks, smoke and other particles.'),
      tg('Ambient occlusion', 'ao', 'Soft contact shadows in corners and under objects.'),
      // (settings-rt-hide: Global illumination and the ray-traced rate did nothing since voxel-retire; the fields stay)
      tg('Bloom', 'bloom', 'A glow around bright lamps and screens.'),
      desc(choice('Reflections', REFL_OPTS, () => (s().video.gfx.reflections === 'rt' ? 'ssr' : s().video.gfx.reflections), (v) => feat('reflections').set(v)), 'Reflections on wet ground, glass and metal.'),
      tg('Volumetric light', 'volumetrics', 'Light shafts in the air around lamps. The fog itself is always on.'),
      desc(slider('Volumetric lights', { min: 2, max: 12, step: 2, get: () => s().video.gfx.volLights, set: (v) => feat('volLights').set(v), format: (v) => `${v}` }), 'How many lamps cast light shafts at once.'),
      ch('Post effects resolution', 'postRes', [
        { value: 'half', label: 'Half' },
        { value: 'full', label: 'Full' },
      ], 'The resolution of bloom, fog and other screen effects.'),
      tg('Depth of field', 'dof', 'Blurs what is far from the focus in cutscenes and while aiming.'),
      tg('Lens effects', 'lens', 'Colour fringes and dirt on the lens around bright lights.'),
      grp('Display'),
      // (3.1.7: a list of real resolutions, applied on a pick and kept only when confirmed)
      desc(resolutionRow(app), 'The render resolution. A new one applies at once and reverts in 10 s unless you keep it.'),
      desc(button('Brightness', () => app.screens.push(new BrightnessScreen(app)), { class: 'subtle' }), 'Set the brightness so the dark stays dark and the shadows still read.'),
      desc(toggle('Adaptive detail', () => s().video.adaptive, (v) => upd((d) => void (d.video.adaptive = v))), 'In a match the detail drops a little to hold the frame rate, and comes back when it can.'),
      desc(choice('Upscaler', UPSCALER_OPTS, () => s().video.upscaler, (v) => upd((d) => void (d.video.upscaler = v))), 'Sharpens a resolution scale under 100 % back to the screen\'s size.'),
      desc(slider('Panini projection', { min: 0, max: 1, step: 0.05, get: () => s().video.panini, set: (v) => upd((d) => void (d.video.panini = v)), format: (v) => (v === 0 ? 'Off' : pct(v)) }), 'Eases the stretching at the edges of a wide field of view.'),
      desc(choice('Target frame rate', CAP_OPTS.map((o) => (o.value === 0 ? { value: 0, label: `Display refresh (${Math.round(app.quality.hz)} Hz)` } : o)), () => s().video.fpsCap, (v) => upd((d) => void (d.video.fpsCap = v))), 'The highest frame rate the game draws at. A lower cap runs cooler and quieter.'),
      desc(slider('Field of view', { min: 60, max: 120, step: 1, get: () => s().video.fovH, set: (v) => upd((d) => void (d.video.fovH = v)), format: (v) => `${v}°` }), 'The horizontal field of view on a 16:9 screen. Wider screens see more at the sides.'),
      desc(slider('Widest field of view', { min: 90, max: 150, step: 5, get: () => s().video.maxFov, set: (v) => upd((d) => void (d.video.maxFov = v)), format: (v) => `${v}°` }), 'The limit for ultrawide screens.'),
      desc(choice('HUD width', HUD_OPTS, () => s().video.hudWidth, (v) => upd((d) => void (d.video.hudWidth = v))), 'Keeps the HUD inside a narrower frame on a wide screen.'),
      desc(toggle('Show FPS overlay', () => s().video.showFps, (v) => upd((d) => void (d.video.showFps = v))), 'A thin banner in the bottom left corner: frame rate, frame time, drops, resolution.'),
      desc(toggle('Cinematic vignette', () => s().video.vignette, (v) => upd((d) => void (d.video.vignette = v))), 'Darkens the corners of the picture a little.'),
      desc(toggle('Film grain', () => s().video.filmGrain, (v) => upd((d) => void (d.video.filmGrain = v))), 'A fine grain over the picture.'),
      desc(choice('Avatar style', [{ value: 'detailed' as const, label: 'Operator (detailed)' }, { value: 'stick' as const, label: 'Stick' }], () => s().video.avatarStyle, (v) => upd((d) => void (d.video.avatarStyle = v))), 'How characters are drawn. Stick is a debug look.'),
      desc(button('Fullscreen', () => void toggleFullscreen(), { class: 'subtle' }), 'Switches between a window and the full screen.'),
      grp('GPU'),
      h('div', {
        class: 'row-note gpu-note',
        text:
          `${app.gpu.renderer || 'Unknown renderer'} (${app.gpu.kind})` +
          (app.gpu.kind === 'integrated'
            ? runningOnWindows()
              ? '. This is the integrated GPU: set your browser to "High performance" in Windows Settings > System > Display > Graphics, then restart it.'
              : '. This is the integrated GPU.'
            : ''),
      }),
      grp('Benchmark'),
      desc(button('Run (current settings)', () => app.benchmark?.('current'), { key: 'bench-current' }), `A ${BENCH.seconds} s camera flight through the Warehouse with your settings: average and 1 % low frame rate.`),
      desc(button('Every preset', () => app.benchmark?.('presets'), { class: 'subtle', key: 'bench-presets' }), 'The same flight on every preset, Low to Epic.'),
      desc(button('Resolutions', () => app.benchmark?.('resolutions'), { class: 'subtle', key: 'bench-res' }), 'The flight at each of this monitor\'s resolutions (in fullscreen).'),
      desc(button('Feature costs', () => app.benchmark?.('features'), { class: 'subtle', key: 'bench-features' }), 'Your settings, then each costly feature off in turn: what to cut on this device.'),
      desc(button(`Sustained (${BENCH.sustained / 60} min)`, () => app.benchmark?.('sustained'), { class: 'subtle', key: 'bench-sustained' }), 'The first minute against the last: a laptop slowing down once hot.'),
      // (anim-tuner pass 2) the animation tuner without F3 (pad, phone)
      grp('Developer'),
      desc(button('Animation tuner (dev)', () => app.debug.animTune.show(), { class: 'subtle', key: 'anim-tuner' }), 'Opens the animation slider panel over the game (top right). It stays open in a match until you close it with its x.'),
      // (anim-studio) the Anim Studio stage (single player: not offered in a co-op session)
      ...(app.studio && !app.debug.animTune.coop?.() ? [desc(button('Anim Studio (dev)', () => app.studio?.(), { class: 'subtle', key: 'anim-studio' }), 'A plain stage with Wren: the loop player, the animation tuner, viewing aids and snapshots. Leaves a match in progress.')] : []),
    );
    return panel;
  }
}

/** Desktop: the Resolution row - the current render resolution; a tap opens the list (`ResolutionPicker`). */
function resolutionRow(app: App): HTMLElement {
  const b = button(`Resolution: ${currentResolution(app)}`, () => {
    app.screens.push(new ResolutionPicker(app, () => {
      const l = b.querySelector('.btn-label');
      if (l) l.textContent = `Resolution: ${currentResolution(app)}`;
    }));
  }, { class: 'subtle res-row', key: 'resolution' });
  return b;
}
