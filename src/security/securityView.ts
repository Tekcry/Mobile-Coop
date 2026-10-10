import { TransformNode, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';
import { CAMERA } from '../config/security';
import type { CameraUnit } from './camera';

const HOUSING = '#d6dade';
const BRACKET = '#3a3f45';
const LED_ON = '#ff2a1a';
const LED_OFF = '#1a1d20';

interface CameraView {
  node: TransformNode;
  led: InstancedMesh;
  lastYaw: number;
  lastMode: string;
}

/**
 * Greybox bodies for the security devices (S0 section 3): one shared box part, so every camera costs instanced
 * draws of the same mesh only (housing, mount, LED). A red LED shows a camera that sees; off, looped and destroyed
 * read as a dark LED, and a shot housing hangs tilted.
 */
export class SecurityView {
  private views = new Map<CameraUnit, CameraView>();

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
  ) {}

  addCamera(c: CameraUnit): void {
    const node = new TransformNode(`sec-cam-${c.def.id}`, this.scene);
    node.position.set(c.x, c.y, c.z);
    node.rotation.y = c.yaw;
    const H = CAMERA.housing;
    const box = (hex: string, sx: number, sy: number, sz: number, x: number, y: number, z: number): InstancedMesh => {
      const m = this.parts.instance('box', hex, 'sec-cam');
      m.parent = node;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      return m;
    };
    box(HOUSING, H.w, H.h, H.len, 0, 0, 0);
    box(BRACKET, 0.05, 0.2, 0.05, 0, H.h / 2 + 0.1, -H.len / 4);
    const led = box(LED_ON, CAMERA.ledSize, CAMERA.ledSize, 0.02, 0, 0, H.len / 2 + 0.01);
    this.views.set(c, { node, led, lastYaw: c.yaw, lastMode: 'online' });
  }

  /** Follow the cameras' yaw and mode (cheap: only touches what changed). */
  update(cams: readonly CameraUnit[]): void {
    for (let i = 0; i < cams.length; i++) {
      const c = cams[i]!;
      const v = this.views.get(c);
      if (!v) continue;
      if (v.lastYaw !== c.yaw) {
        v.node.rotation.y = c.yaw;
        v.lastYaw = c.yaw;
      }
      if (v.lastMode !== c.mode) {
        v.lastMode = c.mode;
        this.parts.setColor(v.led, c.mode === 'online' ? LED_ON : LED_OFF);
        if (c.mode === 'destroyed') v.node.rotation.x = 0.5;
      }
    }
  }

  dispose(): void {
    for (const v of this.views.values()) v.node.dispose(false, false);
    this.views.clear();
  }
}
