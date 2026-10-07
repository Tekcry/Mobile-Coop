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
  /** Settings > Graphics > Run benchmark (set by main). */
  benchmark: (() => void) | null = null;
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
    this.loop.onFrameEnd = (interval, cpu, raf) => this.quality.frame(interval, cpu, this.current?.simulating ?? false, raf);
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

  /** Detect the platform (setting, `?platform=`), set `body.platform-*` and the desktop UI scale (`--ui-scale`). */
  applyPlatform(): void {
    const before = this.platform.platform;
    this.platform = detectPlatform(browserEnv(), platformOverride(location.search) ?? this.settings.get().video.platform);
    const p = this.platform.platform;
    const c = document.body.classList;
    c.toggle('platform-desktop', p === 'desktop');
    c.toggle('platform-mobile', p === 'mobile');
    c.toggle('can-touch', this.platform.touch);
    document.documentElement.style.setProperty('--ui-scale', String(uiScale(p, window.innerWidth, window.innerHeight)));
    if (p !== before) this.onPlatform?.();
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
  }

  get current(): AppState | null {
    return this.state;
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
