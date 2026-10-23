import { TransformNode, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';
import { CAMERA } from '../config/security';
import type { CameraUnit } from './camera';

const HOUSING = '#d6dade';
const BRACKET = '#3a3f45';
const LED_ON = '#ff2a1a';
/** (sector-redesign E8) A thermal camera's LED (A96) and a bulletproof camera's armoured housing (A95): the tells. */
const LED_THERMAL = '#ffa21a';
const HOUSING_ARMOURED = '#5d646c';
const LED_OFF = '#1a1d20';
/** Flashes per second of a jammed camera's LED. */
const LED_FLASH_HZ = 4;

interface CameraView {
  node: TransformNode;
  led: InstancedMesh;
  lastYaw: number;
  lastMode: string;
  lastLed: string;
  /** Its seeing LED colour: red, or amber for a thermal camera. */
  on: string;
}

/**
 * Greybox bodies for the security devices (S0 section 3): one shared box part, so every camera costs instanced
 * draws of the same mesh only (housing, mount, LED). A red LED shows a camera that sees; off, looped and destroyed
 * read as a dark LED (a jammed one flashes), and a shot housing hangs tilted. (E8) A thermal camera's LED is amber and a
 * bulletproof camera's housing dark grey.
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
    // (sector-fixes C) the housing points down its pitch, at the floor patch it watches
    node.rotation.x = c.pitch;
    const H = CAMERA.housing;
    const box = (hex: string, sx: number, sy: number, sz: number, x: number, y: number, z: number): InstancedMesh => {
      const m = this.parts.instance('box', hex, 'sec-cam');
      m.parent = node;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      return m;
    };
    box(c.def.bulletproof ? HOUSING_ARMOURED : HOUSING, H.w, H.h, H.len, 0, 0, 0);
    box(BRACKET, 0.05, 0.2, 0.05, 0, H.h / 2 + 0.1, -H.len / 4);
    const on = c.def.thermal ? LED_THERMAL : LED_ON;
    const led = box(on, CAMERA.ledSize, CAMERA.ledSize, 0.02, 0, 0, H.len / 2 + 0.01);
    this.views.set(c, { node, led, lastYaw: c.yaw, lastMode: 'online', lastLed: on, on });
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
        // (sector-fixes C) the housing points down its pitch (a shot one hangs further)
        v.node.rotation.x = c.pitch + (c.mode === 'destroyed' ? 0.5 : 0);
      }
      // (marlow-jammer, item 7) the LED flashes while the camera is jammed (dark while it reboots)
      const led = c.mode === 'online' ? v.on : c.jam === 1 && ((c.jamT * LED_FLASH_HZ * 2) | 0) % 2 === 0 ? v.on : LED_OFF;
      if (v.lastLed !== led) {
        v.lastLed = led;
        this.parts.setColor(v.led, led);
      }
    }
  }

  dispose(): void {
    for (const v of this.views.values()) v.node.dispose(false, false);
    this.views.clear();
  }
}
