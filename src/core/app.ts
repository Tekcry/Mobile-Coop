import type { Engine, Scene } from './babylon';
import { GameLoop, type LoopHooks } from './loop';
import { createEngine, applyRenderScale } from './engine';
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
  private state: AppState | null = null;
  private time = 0;

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
    uiHooks.blocked = (msg) => this.toasts.show(msg, 'warn', 1800);

    this.input.events.on('padConnected', ({ id }) => this.toasts.show(`Controller connected: ${shortPadName(id)}`, 'ok'));
    this.input.events.on('padDisconnected', () => this.toasts.show('Controller disconnected', 'warn'));
    this.settings.subscribe((s) => {
      applyRenderScale(this.engine, s.video.renderScale);
      if (s.video.showFps !== this.debug.isVisible) this.debug.toggle(s.video.showFps);
    });
    window.addEventListener('resize', () => this.engine.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.engine.resize(), 200));
  }

  async loadSettings(): Promise<void> {
    try {
      this.settings.load(await dbGet('kv', 'settings'));
    } catch (e) {
      console.warn('settings load failed, using defaults', e);
      this.settings.load(undefined);
    }
    applyRenderScale(this.engine, this.settings.get().video.renderScale);
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
    this.debug.setScene(next.scene);
    if (prev && prev.scene !== next.scene && !prev.scene.isDisposed) prev.scene.dispose();
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
        s.fixedUpdate(dt);
        this.input.state.consumeEdges();
      },
      frameUpdate: (dt, alpha) => s.frameUpdate(dt, alpha),
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
