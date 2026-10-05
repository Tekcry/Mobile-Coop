import type { Engine, Scene } from './babylon';

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
  onFrameEnd: ((intervalMs: number, cpuMs: number) => void) | null = null;
  paused = false;
  /** Simulation speed (slow motion < 1): scales the time fed to the accumulator and frame updates. */
  timeScale = 1;
  /** Tools/tests: real-time frames only render; the sim advances only through `stepHeadless`. */
  manual = false;

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
    const scene = this.scene;
    const hooks = this.hooks;
    if (!scene || !hooks) return;
    const physics = scene.getPhysicsEngine();
    const n = Math.round(seconds / FIXED_DT);
    const sub = Math.max(1, Math.round(renderHz / 60));
    for (let i = 0; i < n && this.scene === scene; i++) {
      hooks.beforeFrame?.(FIXED_DT);
      if (this.paused) continue;
      hooks.fixedUpdate(FIXED_DT);
      if (physics) {
        scene.onBeforePhysicsObservable.notifyObservers(scene);
        physics._step(FIXED_DT);
        scene.onAfterPhysicsObservable.notifyObservers(scene);
      }
      if (sub === 1) hooks.frameUpdate(FIXED_DT, 1);
      // e.g. 120 Hz: one frame right after the step (alpha 0) and one half way (alpha 0.5)
      else for (let j = 0; j < sub && this.scene === scene; j++) hooks.frameUpdate(FIXED_DT / sub, j / sub);
    }
  }

  private tick(): void {
    const t0 = performance.now();
    this.frame();
    const cpu = performance.now() - t0;
    this.stats.frameCpuMs = cpu;
    this.onFrameEnd?.(this.engine.getDeltaTime(), cpu);
  }

  private frame(): void {
    const scene = this.scene;
    const hooks = this.hooks;
    if (!scene || !hooks) return;
    if (this.manual) {
      scene.render();
      return;
    }
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1) * this.timeScale;
    hooks.beforeFrame?.(dt);
    if (!this.paused) {
      this.acc += dt;
      let steps = 0;
      let simMs = 0;
      let physMs = 0;
      const physics = scene.getPhysicsEngine();
      while (this.acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        const t0 = performance.now();
        hooks.fixedUpdate(FIXED_DT);
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
    scene.render();
  }
}
