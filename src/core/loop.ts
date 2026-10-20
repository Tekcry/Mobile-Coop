import type { Engine, Scene } from './babylon';
import { capAllows } from './quality';
import { bgStepSeconds, type BgTickInput } from './bgTick';

export const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;

export interface LoopHooks {
  /** Once per render frame, before any fixed steps (input polling, menus). */
  beforeFrame?(dt: number): void;
  /** Fixed-rate simulation step (input, AI, character controller). Runs before physics. */
  fixedUpdate(dt: number): void;
  /** Variable-rate per-frame update (camera, HUD, VFX). alpha = interpolation factor. */
  frameUpdate(dt: number, alpha: number): void;
}

/**
 * Runs a fixed-timestep simulation (60Hz) with physics stepped manually so
 * gameplay is deterministic regardless of display refresh rate.
 */
export class GameLoop {
  private acc = 0;
  private hooks: LoopHooks | null = null;
  private scene: Scene | null = null;
  /** Last measured costs in ms (for debug overlay). */
  readonly stats = { simMs: 0, physicsMs: 0, steps: 0, frameCpuMs: 0 };
  /** After every real frame: rAF interval and the CPU work of the frame (sim + update + render submit), ms. */
  onFrameEnd: ((intervalMs: number, cpuMs: number, rafMs: number) => void) | null = null;
  paused = false;
  /** Simulation speed (slow motion < 1): scales the time fed to the accumulator and frame updates. */
  timeScale = 1;
  /** Tools/tests: real-time frames only render; the sim advances only through `stepHeadless`. */
  manual = false;
  /** Frame-rate cap (0 = every display frame) and the display interval it is measured against (ms). */
  fpsCap = 0;
  displayMs = 1000 / 60;
  private lastT = 0;
  private lastRaf = 0;
  /** (coop-fix) The hidden-page tick worker (co-op only, `holdBackgroundTicks`); null outside a co-op match. */
  private bg: Worker | null = null;
  private bgUsers = 0;
  private lastExternal = -Infinity;
  private readonly bgIn: BgTickInput = { enabled: false, hidden: false, manual: false, sinceExternalMs: Infinity, elapsedMs: 0 };
  private readonly onBgTick = (): void => this.bgTick();

  constructor(private engine: Engine) {}

  attach(scene: Scene, hooks: LoopHooks): void {
    this.scene = scene;
    this.hooks = hooks;
    this.acc = 0;
    // We step physics ourselves.
    scene.physicsEnabled = false;
  }

  detach(): void {
    this.scene = null;
    this.hooks = null;
  }

  start(): void {
    this.engine.runRenderLoop(() => this.tick());
  }

  /**
   * Advance simulation by `seconds` without rendering (automated tests / bots).
   * Runs the same hook order as a real frame. `renderHz` (a multiple of 60) runs that many frame
   * updates per second between the fixed steps with the matching interpolation alphas, as a display
   * at that refresh rate would (60 vs 120 Hz parity tests).
   */
  stepHeadless(seconds: number, renderHz = 60): void {
    // (coop-fix) an external driver owns the sim for a while: the hidden-page tick stands down (never twice the speed)
    this.lastExternal = performance.now();
    const scene = this.scene;
    const hooks = this.hooks;
    if (!scene || !hooks) return;
    const physics = scene.getPhysicsEngine();
    const n = Math.round(seconds / FIXED_DT);
    const sub = Math.max(1, Math.round(renderHz / 60));
    for (let i = 0; i < n && this.scene === scene; i++) {
      // like a real display: input is polled every rendered frame (each sub-frame at 120 Hz)
      hooks.beforeFrame?.(FIXED_DT / sub);
      if (this.paused) continue;
      hooks.fixedUpdate(FIXED_DT);
      if (physics) {
        scene.onBeforePhysicsObservable.notifyObservers(scene);
        physics._step(FIXED_DT);
        scene.onAfterPhysicsObservable.notifyObservers(scene);
      }
      if (sub === 1) hooks.frameUpdate(FIXED_DT, 1);
      // e.g. 120 Hz: one frame right after the step (alpha 0) and one half way (alpha 0.5)
      else
        for (let j = 0; j < sub && this.scene === scene; j++) {
          if (j > 0) hooks.beforeFrame?.(FIXED_DT / sub);
          hooks.frameUpdate(FIXED_DT / sub, j / sub);
        }
    }
  }

  /**
   * (coop-fix) Co-op only (`src/net` holds it for a live session, releases it at its dispose): while the page is
   * hidden (rAF stopped), a worker's ticks run the fixed steps and frame updates for the elapsed real time, without
   * rendering, so the host keeps sending snapshots and the client its states. rAF and the ticks share `lastT`, so a
   * stretch of time is consumed once. Single player never starts the worker. Counted: the next match's session can
   * take it before the last one's dispose releases it. Returns the release (once only).
   */
  holdBackgroundTicks(): () => void {
    this.bgUsers++;
    this.setBackgroundTicks(true);
    let held = true;
    return () => {
      if (!held) return;
      held = false;
      if (--this.bgUsers <= 0) {
        this.bgUsers = 0;
        this.setBackgroundTicks(false);
      }
    };
  }

  private setBackgroundTicks(on: boolean): void {
    this.bgIn.enabled = on;
    if (on && !this.bg && typeof Worker !== 'undefined') {
      try {
        const w = new Worker(new URL('./bgTickWorker.ts', import.meta.url), { type: 'module' });
        w.onmessage = this.onBgTick;
        this.bg = w;
      } catch {
        this.bg = null;
      }
    } else if (!on && this.bg) {
      this.bg.terminate();
      this.bg = null;
    }
  }

  private bgTick(): void {
    const i = this.bgIn;
    i.hidden = typeof document !== 'undefined' && document.hidden;
    // visible: rAF owns the time (and `lastT`)
    if (!i.enabled || !i.hidden) return;
    const now = performance.now();
    i.manual = this.manual;
    i.sinceExternalMs = now - this.lastExternal;
    i.elapsedMs = this.lastT > 0 ? now - this.lastT : 1000 / 60;
    // the time is taken here whether or not it is stepped: a held stretch is never stepped later
    this.lastT = now;
    const s = bgStepSeconds(i);
    if (s > 0) this.frame(s * 1000, false);
  }

  private tick(): void {
    const t0 = performance.now();
    const raf = this.lastRaf > 0 ? t0 - this.lastRaf : 0;
    this.lastRaf = t0;
    // frame limiter: skip display frames until the cap's interval has passed
    if (this.fpsCap > 0 && this.lastT > 0 && !capAllows(t0 - this.lastT, this.fpsCap, this.displayMs)) return;
    const interval = this.lastT > 0 ? Math.min(t0 - this.lastT, 250) : this.engine.getDeltaTime();
    this.lastT = t0;
    this.frame(interval);
    const cpu = performance.now() - t0;
    this.stats.frameCpuMs = cpu;
    this.onFrameEnd?.(interval, cpu, raf);
  }

  private frame(intervalMs: number, render = true): void {
    const scene = this.scene;
    const hooks = this.hooks;
    if (!scene || !hooks) return;
    if (this.manual) {
      if (render) scene.render();
      return;
    }
    const dt = Math.min(intervalMs / 1000, 0.1) * this.timeScale;
    hooks.beforeFrame?.(dt);
    // (a state change inside the frame - a menu confirm starting a match frees the old scene at once - ends it)
    if (this.hooks !== hooks) return;
    if (!this.paused) {
      this.acc += dt;
      let steps = 0;
      let simMs = 0;
      let physMs = 0;
      const physics = scene.getPhysicsEngine();
      while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        const t0 = performance.now();
        hooks.fixedUpdate(FIXED_DT);
        if (this.hooks !== hooks) return;
        const t1 = performance.now();
        if (physics) {
          scene.onBeforePhysicsObservable.notifyObservers(scene);
          physics._step(FIXED_DT);
          scene.onAfterPhysicsObservable.notifyObservers(scene);
        }
        physMs += performance.now() - t1;
        simMs += t1 - t0;
        this.acc -= FIXED_DT;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0; // drop backlog, avoid spiral of death
      this.stats.simMs = simMs;
      this.stats.physicsMs = physMs;
      this.stats.steps = steps;
    }
    hooks.frameUpdate(this.paused ? 0 : dt, this.acc / FIXED_DT);
    if (this.hooks !== hooks || scene.isDisposed || !render) return;
    scene.render();
  }
}
