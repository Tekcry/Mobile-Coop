import { Color3, Vector3, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import { Silhouettes } from './silhouettes';

/**
 * Last Known Position ghost (Blacklist): a pale silhouette of the player frozen in the pose they were last
 * seen in, where the enemies think they are (`Silhouettes`, one figure, 2 draw calls); fades in and out.
 */
export class LkpGhost {
  private fig: Silhouettes;
  private alpha = 0;
  /** Wanted visibility (fades towards it). */
  show = false;
  /** Has a captured pose. */
  captured = false;
  /** Where it stands (feet). */
  readonly at = new Vector3();

  constructor(scene: Scene) {
    this.fig = new Silhouettes(scene, 'lkpGhost', 1, new Color3(0.92, 0.96, 1));
  }

  /** Freeze the rig's current pose as the ghost (called while the player is in sight). */
  capture(rig: CharacterRig, feet: Vector3): void {
    this.fig.begin();
    this.fig.add(rig);
    this.fig.end();
    this.at.copyFrom(feet);
    this.captured = true;
  }

  /** Per render frame: fade towards `show`. */
  update(dt: number): void {
    const want = this.show && this.captured ? 0.3 : 0;
    const k = Math.min(1, dt * (want > this.alpha ? 4 : 2.5));
    this.alpha += (want - this.alpha) * k;
    if (this.alpha < 0.01 && want === 0) this.alpha = 0;
    this.fig.setAlpha(this.alpha);
  }

  get visible(): boolean {
    return this.alpha > 0.05;
  }

  dispose(): void {
    this.fig.dispose();
  }
}
