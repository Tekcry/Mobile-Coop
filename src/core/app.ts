import { avatarStyle, setAvatarStyle } from '../player/characterRig';
import type { Engine, Scene } from './babylon';
import { GameLoop, type LoopHooks } from './loop';
import { createEngine } from './engine';
import { SettingsStore } from './settings';
import { InputManager } from '../input/inputManager';
import { FocusNav } from '../ui/focusNav';
import { ScreenManager } from '../ui/screen';
import { Toasts } from '../ui/toast';
import { DebugOverlay, type CrabPlayer } from '../ui/debugOverlay';
import { dbGet, dbPut } from '../save/db';
import { SaveManager } from '../save/saveManager';
import { h } from '../ui/dom';
import { uiHooks } from '../ui/widgets';
import { AudioEngine } from '../audio/audioEngine';
import { Sfx } from '../audio/sfx';
import { Music } from '../audio/music/music';
import { Foley } from '../audio/foley/foley';
import { WeaponAudio } from '../audio/weapons/weaponAudio';
import { QualityManager, type QualityTarget } from './qualityManager';
import { FeedbackStore } from '../feedback/feedbackStore';
import { keyLabels, padButtons } from '../ui/prompts';
import { bindLabel } from '../input/keyBindings';
import type { BenchKind, BenchSession } from '../game/benchmark';
import type { CrashLog } from '../feedback/crashLog';
import { classifyGpu, hudInset, runningOnWindows, uiScale, type GpuKind } from './display';
import { Calibration, CALIBRATION, deviceKey, tierFromRenderer } from './deviceTier';
import { PRESET_DISPLAY, PRESET_IDS, type FixedPreset } from './quality';
import { controlsMigrationNotes, setAuto, settingAnimSource } from './settings';
import { flags, PREVIEW_ON } from './flags';
import { ANIM_SOURCE, applyAnimSource } from '../anim/animSource'; // (mixamo-retarget Toggle)
import { kept as keptParts, type KeptParts } from './keptParts';

/** A top-level app state owns a Babylon scene (menu, game). */
export interface AppState {
  readonly scene: Scene;
  enter(): void;
  exit(): void;
  fixedUpdate(dt: number): void;
  frameUpdate(dt: number, alpha: number): void;
  /** Whether simulation should advance (false while paused in single player). */
  readonly simulating: boolean;
}

/** Service container shared by every state and screen. */
/** Resizes wait this long for the size to settle (ms). */
const RESIZE_SETTLE_MS = 250;

export class App {
  /** Rebuild previews when the avatar style changes (set by the menu). */
  onAvatarStyle: (() => void) | null = null;
  readonly engine: Engine;
  readonly loop: GameLoop;
  readonly settings: SettingsStore;
  readonly input: InputManager;
  readonly nav = new FocusNav();
  readonly screens: ScreenManager;
  readonly toasts: Toasts;
  readonly debug: DebugOverlay;
  readonly uiRoot: HTMLElement;
  /** Player profile (IndexedDB, versioned). */
  readonly save = new SaveManager();
  readonly audio = new AudioEngine();
  readonly sfx = new Sfx(this.audio);
  readonly music = new Music(this.audio);
  /** Movement foley from CC0 recordings (footsteps, landings, vaults, rolls). */
  readonly foley = new Foley(this.audio);
  /** Weapon sounds from CC0 recordings (shots, suppressed shots, reloads, brass). */
  readonly weaponAudio = new WeaponAudio(this.audio);
  readonly quality: QualityManager;
  /** (map-ready S9) The kept parts: textures and parsed model files held between matches (`mapReady` on). */
  readonly kept: KeptParts = keptParts;
  /** Playtest feedback notes (Settings > Feedback, pause menu). */
  readonly feedback = new FeedbackStore();
  private state: AppState | null = null;
  private time = 0;
  /** (menu-notes note 2) The boot screen is up over the menu (SPEC 7.1: no input): the screens are not updated. */
  bootHold = false;
  /** Settings > Graphics > Run benchmark (set by main); a session goes on to its next run in a new match. */
  benchmark: ((kind?: BenchKind | BenchSession) => void) | null = null;
  /** (anim-studio) Main menu > Anim Studio (dev): start the studio stage (set by main; batch-23: not on the pause menu). */
  studio: (() => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.uiRoot = document.getElementById('ui-root')!;
    this.settings = new SettingsStore((s) => dbPut('kv', 'settings', s).catch((e) => console.warn('settings save', e)));
    this.engine = createEngine(canvas, { antialias: false });
    this.loop = new GameLoop(this.engine);
    this.debug = new DebugOverlay(this.engine, this.loop);
    const screensEl = h('div', { class: 'screens' });
    this.uiRoot.appendChild(screensEl);
    this.screens = new ScreenManager(screensEl, this.nav);
    this.input = new InputManager(canvas, this.uiRoot, this.settings);
    // (tuner-pad) the animation tuner sees the pad first: while it holds the pad focus the game and menus get none of it
    const tune = this.debug.animTune;
    this.input.gamepad.padHook = (pad, now, dt) => tune.padPoll(pad, now, dt);
    // (tuner-camera pass 2) a co-op session turns the tuner's time controls off (local only, never on the wire)
    tune.coop = () => !!(this.state as { net?: unknown } | null)?.net;
    // (tuner-ui) the pause menu open: the menus get the pad, the tuner waits
    tune.menuPaused = () => !!(this.state as { menuPaused?: boolean } | null)?.menuPaused;
    // (marlow-bays item 9) the tuner's mouse mode: drag view frees the pointer; a capture lost in its game camera goes
    // back to the drag view instead of pausing
    const kbm = this.input.kbm;
    tune.mouseHost = { setFree: (on) => kbm.setFreeMouse(on), locked: () => kbm.locked, dragging: () => kbm.dragging };
    kbm.lockLostHook = () => tune.mouseLockLost();
    this.toasts = new Toasts(this.uiRoot);
    this.quality = new QualityManager(this.engine, this.settings, this.loop);
    // (map-ready S9) the kept parts: on with the flag; a GPU context loss or a Textures setting change releases them
    keptParts.enabled = flags.mapReady;
    if (keptParts.enabled) {
      this.engine.onContextLostObservable.add(() => keptParts.dropTextures());
      let textures = this.quality.level.features.textures;
      this.quality.onChange = (l) => {
        if (l.features.textures === textures) return;
        textures = l.features.textures;
        keptParts.dropTextures();
      };
    }
    this.debug.extra.set('quality', () => `${this.quality.level.name}  ${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}${this.quality.auto ? `  dynamic x${this.quality.res.scale.toFixed(2)}` : ''}`);
    this.debug.pacing = () => this.quality.pacing();
    // (anim-metrics-2) the anti-crab readout measures the local player of a match (none in the menus)
    this.debug.crabPlayer = () => (this.state as { player?: CrabPlayer } | null)?.player ?? null;
    this.debug.extra.set('governor', () => {
      const g = this.quality.governor;
      return this.quality.adaptiveOn ? `governor L${g.level}${g.thermal ? ' THERMAL' : ''}` : 'governor off';
    });
    this.loop.onFrameEnd = (interval, cpu, raf) => {
      this.quality.frame(interval, cpu, this.current?.simulating ?? false, raf);
      if (this.calib || this.calibKey) this.calibFrame(raf);
    };
    uiHooks.blocked = (msg) => {
      this.toasts.show(msg, 'warn', 1800);
      this.sfx.denied();
    };
    // UI sounds: focus moves (controller/keyboard), confirms, backs
    document.addEventListener('nav-focus', () => {
      this.sfx.uiMove();
    });
    document.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement | null)?.closest('.btn, .tab, .row-choice, .row-toggle, .swatch');
      if (b && !b.classList.contains('blocked')) this.sfx.uiConfirm();
    });
    this.screens.onBack = () => this.sfx.uiBack();
    this.input.events.on('mode', () => this.audio.unlock());

    this.input.events.on('padConnected', ({ id }) => this.toasts.show(`Controller connected: ${shortPadName(id)}`, 'ok'));
    this.input.events.on('padDisconnected', () => this.toasts.show('Controller disconnected', 'warn'));
    setAvatarStyle(this.settings.get().video.avatarStyle);
    // (mocap-trial) the mocap locomotion switch, resolved on the load and every settings change, never per frame.
    // (anim-fix-pass AF5, BRIEF A1) mocap is the player's only path: a stored `gameplay.mocapLoco: false` (the old
    // Settings row) no longer turns it off; `?mocap=0/1`, then the tuner's "Mocap locomotion" box (this page only, not
    // saved), are the developer rollback.
    let mocapTuner: boolean | null = null;
    // (mixamo-retarget Toggle) the mocap half is now one part of the Animation source (Options > Gameplay; default CMU,
    // today's game): `?anim=`, `?mocap=0/1`, the tuner box and `?mixamo=0/1` override it for this page
    const mocapApply = (): boolean =>
      applyAnimSource({ setting: settingAnimSource(this.settings.get().gameplay, PREVIEW_ON), url: flags.anim, mocapUrl: flags.mocap, mocapTuner, mixamoUrl: flags.mixamo }).mocap;
    mocapApply();
    tune.mocapHost = {
      get: () => ANIM_SOURCE.mocap,
      set: (on) => {
        mocapTuner = on;
        mocapApply();
      },
    };
    // (mixamo-retarget Toggle) the Anim Studio's Animation source switch: the same saved setting as Options > Gameplay
    tune.animSourceHost = {
      get: () => settingAnimSource(this.settings.get().gameplay, PREVIEW_ON),
      set: (v) => {
        if (v === 'hand' || v === 'cmu' || v === 'mixamo')
          this.settings.update((d) => {
            d.gameplay.animSource = v;
            d.gameplay.animSourceSet = true; // (F45) picked
          });
      },
    };
    this.settings.subscribe((s) => {
      mocapApply();
      this.audio.setVolumes(s.audio);
      if (s.video.avatarStyle !== avatarStyle()) {
        setAvatarStyle(s.video.avatarStyle);
        this.onAvatarStyle?.();
      }
      if (s.video.showFps !== this.debug.isVisible) this.debug.toggle(s.video.showFps, true);
      this.applyUiScale();
      this.applyKeyLabels();
    });
    this.applyUiScale();
    this.applyKeyLabels();
    this.checkGpu();
    // Backgrounding (home button, app switch, screen lock): save now, silence audio, pause single player.
    document.addEventListener('visibilitychange', () => this.onVisibility(document.hidden));
    window.addEventListener('pagehide', () => void this.save.flush());
    // (3.2.3: once the size settles - a window drag fires many resizes with in-between sizes, and each one re-made
    // every full-resolution target)
    let resizeT = 0;
    const settle = (): void => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        this.engine.resize();
        this.applyUiScale();
      }, RESIZE_SETTLE_MS);
    };
    window.addEventListener('resize', settle);
  }

  private audioWasRunning = false;

  /** In-game key prompts follow the bindings. */
  private applyKeyLabels(): void {
    const k = this.settings.get().keys;
    keyLabels.cover = bindLabel(k, 'wall');
    keyLabels.traverse = bindLabel(k, 'jump');
    keyLabels.interact = bindLabel(k, 'interact');
    keyLabels.crouch = bindLabel(k, 'crouch');
    keyLabels.reload = bindLabel(k, 'reload');
    keyLabels.draw = bindLabel(k, 'draw');
    keyLabels.wheel = bindLabel(k, 'wheel');
    keyLabels.run = bindLabel(k, 'run');
    keyLabels.creep = bindLabel(k, 'creep');
    keyLabels.coop = bindLabel(k, 'coop');
    // (locomotion step 18) pad prompts follow the pad bindings
    const p = this.settings.get().pad;
    padButtons.cover = p.wall[0] ?? -1;
    padButtons.traverse = p.jump[0] ?? -1;
    padButtons.interact = p.interact[0] ?? -1;
    padButtons.crouch = p.crouch[0] ?? -1;
    padButtons.reload = p.interact[0] ?? -1;
    padButtons.draw = p.draw[0] ?? -1;
    padButtons.coop = p.coop[0] ?? -1;
  }

  /** The GPU the browser renders with (the unmasked renderer string where allowed). */
  gpu: { renderer: string; kind: GpuKind } = { renderer: '', kind: 'unknown' };

  /**
   * Laptops: a browser left on the integrated GPU runs the PC renderer at a fraction of the discrete GPU's speed.
   * Tell the player once (never under automation) how to switch it; Settings > Graphics repeats it.
   */
  private checkGpu(): void {
    let renderer: string;
    try {
      renderer = this.engine.getGlInfo().renderer ?? '';
    } catch {
      renderer = '';
    }
    this.gpu = { renderer, kind: classifyGpu(renderer) };
    const v = this.settings.get().video;
    if (this.gpu.kind !== 'integrated' || v.gpuNotice || navigator.webdriver || !runningOnWindows()) return;
    this.toasts.show('Running on the integrated GPU. For full speed set your browser to "High performance" in Windows Settings > System > Display > Graphics, then restart it.', 'warn', 12000);
    this.settings.update((d) => void (d.video.gpuNotice = true));
  }

  /** 3.1 Auto graphics: a calibration waiting for (or running on) the menu stage, for this device key. */
  private calibKey = '';
  private calib: Calibration | null = null;
  private calibWait = 0;
  /** Settings > Graphics: the detection finished (the tab re-reads its rows). */
  onDetected: (() => void) | null = null;

  /**
   * Auto graphics (3.1): the device's preset - from the GPU's name when it says enough, else measured on the menu
   * stage (`Calibration`). Re-detects when the device key changes; `force` (Settings > Detect again) measures anyway.
   * Under automation only with `?detect=1` (tests keep their settings).
   */
  detectGraphics(force = false): void {
    const v = this.settings.get().video;
    // (G182) a phone stays on the minimum settings (flags.gfx 'min'): no detection, nothing saved
    if ((!v.auto && !force) || (navigator.webdriver && !flags.detect) || flags.phone) return;
    const key = deviceKey(this.gpu.renderer, screen.width, screen.height, devicePixelRatio);
    if (!force && v.device.key === key && v.device.tier) {
      if (v.preset !== v.device.tier) this.settings.update((d) => setAuto(d, d.video.device.tier));
      return;
    }
    const guess = tierFromRenderer(flags.renderer ?? this.gpu.renderer);
    if (guess.confident && !force) {
      this.settings.update((d) => {
        d.video.device = { key, tier: guess.tier, source: 'gpu' };
        setAuto(d, guess.tier);
      });
      this.onDetected?.();
      return;
    }
    this.calibKey = key;
    this.calibWait = 0;
  }

  /** Every rendered frame while a calibration waits or runs: only on the menu stage, aborted when it is left. */
  private calibFrame(rafMs: number): void {
    const onMenu = !!(this.state as { menuStage?: boolean } | null)?.menuStage;
    if (!onMenu) {
      if (this.calib) {
        // (left the menu: try again next time it is up)
        this.calib = null;
        this.quality.setOverride(null);
      }
      this.calibWait = 0;
      return;
    }
    if (!this.calib) {
      // a second on the menu first (the refresh rate is known, the stage has loaded)
      this.calibWait += rafMs / 1000;
      if (this.calibWait < 1) return;
      const ladder: FixedPreset[] = [...PRESET_IDS].reverse();
      this.calib = new Calibration(ladder, this.quality.budgetMs);
      this.calibApply();
      return;
    }
    if (!this.calib.push(rafMs)) return;
    if (!this.calib.done) {
      this.calibApply();
      return;
    }
    const tier = this.calib.result;
    const key = this.calibKey;
    this.calib = null;
    this.calibKey = '';
    this.quality.setOverride(null);
    this.settings.update((d) => {
      d.video.device = { key, tier, source: 'calibrated' };
      if (d.video.auto) setAuto(d, tier);
    });
    this.toasts.show(`Graphics: ${tier[0]!.toUpperCase()}${tier.slice(1)} for this device (Settings > Graphics)`, 'ok', 4000);
    this.onDetected?.();
  }

  private calibApply(): void {
    const p = this.calib!.preset;
    this.quality.setOverride({ preset: p, scale: Math.min(2, PRESET_DISPLAY[p].renderScale * CALIBRATION.load) });
  }

  /** A calibration is waiting or running. */
  get detecting(): boolean {
    return !!this.calibKey;
  }

  /** The UI scale (`--ui-scale`) and the HUD inset (`--hud-inset`) for the window's size. */
  applyUiScale(): void {
    const s = document.documentElement.style;
    // (G182) a phone scales the 1280 x 720 layout down to fit its screen
    s.setProperty('--ui-scale', String(uiScale(window.innerWidth, window.innerHeight, flags.phone ? 0.25 : 1)));
    // (phone-min) a phone fills its screen: no 16:9 side bars on the menus
    document.documentElement.classList.toggle('phone', flags.phone);
    s.setProperty('--hud-inset', `${hudInset(window.innerWidth, window.innerHeight, this.settings.get().video.hudWidth)}px`);
  }

  private onVisibility(hidden: boolean): void {
    const ctx = this.audio.ctx;
    if (hidden) {
      void this.save.flush();
      this.audioWasRunning = ctx?.state === 'running';
      if (this.audioWasRunning) void ctx?.suspend();
      const st = this.state as (AppState & { pause?: () => void }) | null;
      if (st && typeof st.pause === 'function' && !this.screens.isOpen) st.pause();
    } else if (this.audioWasRunning) {
      void ctx?.resume();
    }
  }

  async loadSettings(): Promise<void> {
    try {
      const raw = await dbGet('kv', 'settings');
      this.settings.load(raw);
      // (anim-rework S1) an older save moved to the new controls: say what moved and what now clashes, once (the
      // migrated settings are saved, so the next boot is quiet)
      const notes = controlsMigrationNotes(raw, this.settings.get());
      if (notes.length) {
        this.settings.update(() => {});
        this.toasts.show(notes.join(' '), notes.length > 1 ? 'warn' : 'ok', 6000);
      }
    } catch (e) {
      console.warn('settings load failed, using defaults', e);
      this.settings.load(undefined);
    }
    this.quality.apply();
    this.audio.setVolumes(this.settings.get().audio);
    this.applyUiScale();
    this.detectGraphics();
  }

  get current(): AppState | null {
    return this.state;
  }

  /** 3.1.4 crash log (set by main): the heartbeat and what the game is doing. */
  crashLog: CrashLog | null = null;

  /**
   * Leave the current state and free its scene now (3.1.4: before a match loads, so two matches are never in memory
   * at once).
   */
  releaseState(): void {
    const prev = this.state;
    if (!prev) return;
    prev.exit();
    this.state = null;
    this.loop.detach();
    this.quality.setTarget(null);
    this.debug.setScene(null);
    if (!prev.scene.isDisposed) {
      // (map-ready S9) hold the textures this match used before its dispose frees them (flag off: no-op)
      keptParts.handOver(prev.scene);
      prev.scene.dispose();
    }
    // (3.1.7: the engine's compiled-shader cache kept every old match alive - a plugin material's shader holds its
    // material, so its scene and the whole GameState; the keys never repeat (plugin ids count up), so nothing is lost:
    // with no scene alive, every cached shader is the last one's)
    this.engine.releaseEffects();
  }

  setState(next: AppState): void {
    const prev = this.state;
    prev?.exit();
    this.state = next;
    next.enter();
    this.loop.attach(next.scene, this.hooks(next));
    const qt = next as Partial<QualityTarget>;
    this.quality.setTarget(typeof qt.applyQuality === 'function' ? (next as unknown as QualityTarget) : null);
    this.debug.setScene(next.scene);
    if (prev && prev.scene !== next.scene && !prev.scene.isDisposed) prev.scene.dispose();
  }

  private lastError = 0;

  /**
   * A bug in one system must not wedge the whole loop (input polling, menus, quit). State updates are
   * isolated: errors are logged (rate-limited) and surfaced once as a toast, and the next frame runs.
   */
  private report(e: unknown): void {
    const now = performance.now();
    if (now - this.lastError > 2000) {
      console.error(e);
      if (this.lastError === 0) this.toasts.show('Something went wrong - still running', 'warn');
      this.lastError = now;
    }
  }

  private hooks(s: AppState): LoopHooks {
    return {
      beforeFrame: (dt) => {
        this.time += dt;
        this.input.poll(this.time, dt);
        if (!this.audio.running) this.audio.pollPad();
        if (this.screens.isOpen && !this.bootHold) this.screens.update(this.input.state, dt);
        this.loop.paused = !s.simulating;
      },
      fixedUpdate: (dt) => {
        try {
          s.fixedUpdate(dt);
        } catch (e) {
          this.report(e);
        }
        this.input.state.consumeEdges();
      },
      frameUpdate: (dt, alpha) => {
        try {
          s.frameUpdate(dt, alpha);
        } catch (e) {
          this.report(e);
        }
      },
    };
  }

  start(): void {
    this.loop.start();
  }
}

function shortPadName(id: string): string {
  const clean = id.replace(/\(.*?\)/g, '').replace(/[-_]/g, ' ').trim();
  return clean.length > 32 ? clean.slice(0, 32) + '…' : clean || 'Gamepad';
}
