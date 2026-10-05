import type { Engine, Scene } from './babylon';

export const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;

export interface LoopHooks {
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
  readonly stats = { simMs: 0, physicsMs: 0, steps: 0 };
  paused = false;

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

  private tick(): void {
    const scene = this.scene;
    const hooks = this.hooks;
    if (!scene || !hooks) return;
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
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
