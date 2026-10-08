import { avatarStyle, setAvatarStyle } from '../player/characterRig';
import type { Engine, Scene } from './babylon';
import { GameLoop, type LoopHooks } from './loop';
import { createEngine } from './engine';
import { SettingsStore } from './settings';
import { InputManager } from '../input/inputManager';
import { FocusNav } from '../ui/focusNav';
import { ScreenManager } from '../ui/screen';
import { Toasts } from '../ui/toast';
import { DebugOverlay } from '../ui/debugOverlay';
import { dbGet, dbPut } from '../save/db';
import { SaveManager } from '../save/saveManager';
import { h } from '../ui/dom';
import { uiHooks } from '../ui/widgets';
import { AudioEngine } from '../audio/audioEngine';
import { Sfx } from '../audio/sfx';
import { Music } from '../audio/music';
import { QualityManager, type QualityTarget } from './qualityManager';
import { FeedbackStore } from '../feedback/feedbackStore';
import { keyLabels } from '../ui/prompts';
import { bindLabel } from '../input/keyBindings';
import { browserEnv, detectPlatform, platformOverride, uiScale, type PlatformInfo } from './platform';
import type { BenchKind, BenchSession } from '../game/benchmark';
import type { CrashLog } from '../feedback/crashLog';
import { classifyGpu, hudInset, type GpuKind } from './display';
import { Calibration, CALIBRATION, deviceKey, tierFromRenderer } from './deviceTier';
import { MOBILE_PRESET_IDS, PHONE_FPS, PRESET_IDS, presetDisplay, type FixedPreset } from './quality';
import { setAuto, setPreset } from './settings';
import { flags } from './flags';
import { viewHeight, viewWidth } from './viewRotation';

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
  readonly quality: QualityManager;
  /** Playtest feedback notes (Settings > Feedback, pause menu). */
  readonly feedback = new FeedbackStore();
  private state: AppState | null = null;
  private time = 0;
  /** UI / input platform (desktop hides touch-only controls and settings). Never changes rendering. */
  platform: PlatformInfo = { platform: 'mobile', touch: true, reason: '' };
  /** Settings > Graphics > Run benchmark (set by main); a session goes on to its next run in a new match. */
  benchmark: ((kind?: BenchKind | BenchSession) => void) | null = null;
  /** Called when the platform flips (settings rebuild their tabs). */
  onPlatform: (() => void) | null = null;

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
    this.toasts = new Toasts(this.uiRoot);
    this.quality = new QualityManager(this.engine, this.settings, this.loop);
    this.debug.extra.set('quality', () => `${this.quality.level.name}  ${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}${this.quality.auto ? `  dynamic x${this.quality.res.scale.toFixed(2)}` : ''}`);
    this.debug.pacing = () => this.quality.pacing();
    this.debug.extra.set('governor', () => {
      const g = this.quality.governor;
      return this.quality.adaptiveOn ? `governor L${g.level}${g.thermal ? ' THERMAL' : ''}${g.lowPower ? ' LOW-POWER' : ''}` : 'governor off';
    });
    this.loop.onFrameEnd = (interval, cpu, raf) => {
      this.quality.frame(interval, cpu, this.current?.simulating ?? false, raf);
      if (this.calib || this.calibKey) this.calibFrame(raf);
      const lp = this.quality.governor.lowPower;
      if (lp !== this.lowPower) {
        this.lowPower = lp;
        if (lp) this.toasts.show('Low Power Mode: the game runs at 30 fps', 'warn', 4000);
      }
    };
    uiHooks.blocked = (msg) => {
      this.toasts.show(msg, 'warn', 1800);
      this.sfx.denied();
    };
    // UI sounds: focus moves (controller/keyboard), confirms, backs
    document.addEventListener('nav-focus', () => {
      if (this.input.mode !== 'touch') this.sfx.uiMove();
    });
    document.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement | null)?.closest('.btn, .tab, .row-choice, .row-toggle, .swatch');
      if (b && !b.classList.contains('blocked')) this.sfx.uiConfirm();
    });
    this.screens.onBack = () => this.sfx.uiBack();
    this.input.events.on('mode', () => this.audio.ensure());

    this.input.events.on('padConnected', ({ id }) => this.toasts.show(`Controller connected: ${shortPadName(id)}`, 'ok'));
    this.input.events.on('padDisconnected', () => this.toasts.show('Controller disconnected', 'warn'));
    setAvatarStyle(this.settings.get().video.avatarStyle);
    this.settings.subscribe((s) => {
      this.audio.setVolumes(s.audio);
      if (s.video.avatarStyle !== avatarStyle()) {
        setAvatarStyle(s.video.avatarStyle);
        this.onAvatarStyle?.();
      }
      if (s.video.showFps !== this.debug.isVisible) this.debug.toggle(s.video.showFps);
      this.applyPlatform();
      this.applyKeyLabels();
    });
    this.applyPlatform();
    this.applyKeyLabels();
    this.checkGpu();
    // Backgrounding (home button, app switch, screen lock): save now, silence audio, pause single player.
    document.addEventListener('visibilitychange', () => this.onVisibility(document.hidden));
    window.addEventListener('pagehide', () => void this.save.flush());
    window.addEventListener('resize', () => {
      this.engine.resize();
      this.applyPlatform();
    });
    window.addEventListener('orientationchange', () => setTimeout(() => this.engine.resize(), 200));
  }

  private audioWasRunning = false;

  /** In-game key prompts follow the bindings. */
  private applyKeyLabels(): void {
    const k = this.settings.get().keys;
    keyLabels.cover = bindLabel(k, 'cover');
    keyLabels.traverse = bindLabel(k, 'traverse');
    keyLabels.crouch = bindLabel(k, 'crouch');
    keyLabels.reload = bindLabel(k, 'reload');
  }

  /** The GPU the browser renders with (the unmasked renderer string where allowed). */
  gpu: { renderer: string; kind: GpuKind } = { renderer: '', kind: 'unknown' };

  /**
   * Laptops: a browser left on the integrated GPU runs the PC renderer at a fraction of the discrete GPU's speed.
   * Tell the player once (desktop only; never under automation) how to switch it; Settings > Graphics repeats it.
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
    if (this.gpu.kind !== 'integrated' || v.gpuNotice || this.platform.platform !== 'desktop' || navigator.webdriver) return;
    this.toasts.show('Running on the integrated GPU. For full speed set your browser to "High performance" in Windows Settings > System > Display > Graphics, then restart it.', 'warn', 12000);
    this.settings.update((d) => void (d.video.gpuNotice = true));
  }

  /** 3.1 Auto graphics: a calibration waiting for (or running on) the menu stage, for this device key. */
  private calibKey = '';
  private lowPower = false;
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
    if ((!v.auto && !force) || (navigator.webdriver && !flags.detect)) return;
    const mobile = this.platform.platform === 'mobile';
    const key = deviceKey(this.gpu.renderer, this.platform.platform, screen.width, screen.height, devicePixelRatio);
    if (!force && v.device.key === key && v.device.tier) {
      if (v.preset !== v.device.tier) this.settings.update((d) => setAuto(d, d.video.device.tier, mobile));
      return;
    }
    const guess = tierFromRenderer(flags.renderer ?? this.gpu.renderer, mobile);
    if (guess.confident && !force) {
      this.settings.update((d) => {
        d.video.device = { key, tier: guess.tier, source: 'gpu' };
        setAuto(d, guess.tier, mobile);
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
      const ladder: FixedPreset[] = [...(this.platform.platform === 'mobile' ? MOBILE_PRESET_IDS : PRESET_IDS)].reverse();
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
      if (d.video.auto) setAuto(d, tier, this.platform.platform === 'mobile');
    });
    this.toasts.show(`Graphics: ${tier[0]!.toUpperCase()}${tier.slice(1)} for this device (Settings > Graphics)`, 'ok', 4000);
    this.onDetected?.();
  }

  private calibApply(): void {
    const p = this.calib!.preset;
    this.quality.setOverride({ preset: p, scale: Math.min(2, presetDisplay(p, this.platform.platform === 'mobile').renderScale * CALIBRATION.load) });
  }

  /** A calibration is waiting or running. */
  get detecting(): boolean {
    return !!this.calibKey;
  }

  /** Detect the platform (setting, `?platform=`), set `body.platform-*` and the desktop UI scale (`--ui-scale`). */
  applyPlatform(): void {
    const before = this.platform.platform;
    this.platform = detectPlatform(browserEnv(), platformOverride(location.search) ?? this.settings.get().video.platform);
    const p = this.platform.platform;
    const c = document.body.classList;
    c.toggle('platform-desktop', p === 'desktop');
    c.toggle('platform-mobile', p === 'mobile');
    c.toggle('can-touch', this.platform.touch);
    document.documentElement.style.setProperty('--ui-scale', String(uiScale(p, viewWidth(), viewHeight())));
    document.documentElement.style.setProperty('--hud-inset', `${hudInset(viewWidth(), viewHeight(), this.settings.get().video.hudWidth)}px`);
    this.quality?.setMobile(p === 'mobile');
    if (p !== before) {
      this.onPlatform?.();
      if (this.settingsLoaded) this.detectGraphics();
    }
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
      this.settings.load(await dbGet('kv', 'settings'));
    } catch (e) {
      console.warn('settings load failed, using defaults', e);
      this.settings.load(undefined);
    }
    this.quality.apply();
    this.audio.setVolumes(this.settings.get().audio);
    this.settingsLoaded = true;
    this.applyPlatform();
    this.phoneDefaults();
    this.detectGraphics();
  }

  /**
   * Phones, once (3.1.9; the target is 60 fps at Ultra, native): Target frame rate 60 when it was the display's, and
   * the named preset's resolution again (Ultra native). Tests keep their settings (`?detect=1` runs it).
   */
  private phoneDefaults(): void {
    const v = this.settings.get().video;
    if (this.platform.platform !== 'mobile' || v.phoneSetup || (navigator.webdriver && !flags.detect)) return;
    this.settings.update((d) => {
      if (d.video.fpsCap === 0) d.video.fpsCap = PHONE_FPS;
      if (d.video.preset !== 'custom') {
        const auto = d.video.auto;
        setPreset(d, d.video.preset, true);
        d.video.auto = auto;
      }
      d.video.phoneSetup = true;
    });
  }

  private settingsLoaded = false;

  get current(): AppState | null {
    return this.state;
  }

  /** 3.1.4 crash log (set by main): the heartbeat and what the game is doing. */
  crashLog: CrashLog | null = null;

  /**
   * Leave the current state and free its scene now (3.1.4: before a match loads, so two matches are never in memory
   * at once - the iPhone closed the tab loading the next benchmark run on Ultra).
   */
  releaseState(): void {
    const prev = this.state;
    if (!prev) return;
    prev.exit();
    this.state = null;
    this.loop.detach();
    this.quality.setTarget(null);
    this.debug.setScene(null);
    if (!prev.scene.isDisposed) prev.scene.dispose();
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
        if (this.screens.isOpen) this.screens.update(this.input.state, dt);
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
