import type { App, AppState } from '../core/app';
import { createSandboxScene } from '../world/sandbox';
import type { LoopHooks } from '../core/loop';
import type { Scene } from '../core/babylon';
import { PauseScreen } from '../ui/screens/pauseScreen';
import { h } from '../ui/dom';
import { BUTTON_ACTIONS } from '../input/actions';

/** Phase 2 input test bed: shows every action live over the physics sandbox. */
export class ControlsTestState implements AppState {
  private readout = h('pre', { class: 'input-readout' });
  private paused = false;
  private yaw = 0;
  private pitch = 0;

  private constructor(
    private app: App,
    readonly scene: Scene,
    private hooks: LoopHooks,
    private onQuit: () => void,
  ) {}

  static async create(app: App, onQuit: () => void): Promise<ControlsTestState> {
    const { scene, hooks } = await createSandboxScene(app.engine);
    return new ControlsTestState(app, scene, hooks, onQuit);
  }

  get simulating(): boolean {
    return !this.paused;
  }

  enter(): void {
    this.app.uiRoot.append(this.readout);
    this.app.input.setGameplayActive(true);
  }

  exit(): void {
    this.readout.remove();
    this.app.input.setGameplayActive(false);
  }

  private pause(): void {
    this.paused = true;
    this.app.input.setGameplayActive(false);
    this.app.screens.push(
      new PauseScreen(
        this.app,
        () => {
          this.paused = false;
          this.app.input.setGameplayActive(true);
        },
        () => this.onQuit(),
      ),
    );
  }

  fixedUpdate(dt: number): void {
    const inp = this.app.input.state;
    if (inp.pressed('pause')) {
      this.pause();
      return;
    }
    this.hooks.fixedUpdate(dt);
  }

  frameUpdate(dt: number, alpha: number): void {
    this.hooks.frameUpdate(dt, alpha);
    const inp = this.app.input.state;
    const look = inp.consumeLook();
    this.yaw += look.x;
    this.pitch += look.y;
    const held = BUTTON_ACTIONS.filter((a) => inp.down(a) && !a.startsWith('ui'));
    this.readout.textContent =
      `mode ${this.app.input.mode}\n` +
      `move ${inp.move.x.toFixed(2)}, ${inp.move.y.toFixed(2)}\n` +
      `look yaw ${this.yaw.toFixed(2)} pitch ${this.pitch.toFixed(2)}\n` +
      `held ${held.join(' ') || '-'}`;
  }
}
