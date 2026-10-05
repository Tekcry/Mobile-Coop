import {
  ArcRotateCamera,
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateDisc,
  DirectionalLight,
  HemisphericLight,
  Scene,
  Vector3,
  type Engine,
} from '../core/babylon';
import type { AppState } from '../core/app';
import { flatMat, PALETTE } from './materials';
import { mulberry } from '../core/rng';

/** Lightweight diorama behind the menus. No physics. */
export class MenuState implements AppState {
  readonly scene: Scene;
  readonly simulating = true;
  readonly camera: ArcRotateCamera;
  /** Anchor where the avatar preview stands (Phase 7). */
  readonly stage: Vector3 = new Vector3(0, 0, 0);
  private t = 0;
  /** Extra per-frame callbacks (avatar preview rotation etc.). */
  readonly frameHooks = new Set<(dt: number) => void>();

  constructor(engine: Engine) {
    const scene = new Scene(engine);
    this.scene = scene;
    scene.clearColor = Color4.FromHexString(PALETTE.sky + 'ff');
    scene.ambientColor = new Color3(0.3, 0.3, 0.35);
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = Color3.FromHexString(PALETTE.skyHorizon);
    scene.fogStart = 20;
    scene.fogEnd = 60;
    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    hemi.intensity = 0.75;
    hemi.groundColor = new Color3(0.35, 0.33, 0.3);
    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, 0.4), scene);
    sun.intensity = 0.7;

    this.camera = new ArcRotateCamera('menuCam', -Math.PI / 2 + 0.5, 1.25, 7, new Vector3(0, 1.1, 0), scene);
    this.camera.fov = 0.8;
    this.camera.minZ = 0.1;

    const ground = CreateDisc('ground', { radius: 40, tessellation: 24 }, scene);
    ground.rotation.x = Math.PI / 2;
    ground.material = flatMat(scene, PALETTE.ground);
    const pad = CreateCylinder('pad', { diameter: 3.2, height: 0.2, tessellation: 8 }, scene);
    pad.position.y = 0.1;
    pad.material = flatMat(scene, PALETTE.concreteDark);
    const ring = CreateCylinder('ring', { diameter: 3.4, height: 0.12, tessellation: 8 }, scene);
    ring.position.y = 0.06;
    ring.material = flatMat(scene, PALETTE.accent, { emissive: 0.3 });

    // Scattered crates / walls for silhouette.
    const crate = flatMat(scene, PALETTE.crate);
    const wall = flatMat(scene, PALETTE.wall);
    const rng = mulberry(7);
    for (let i = 0; i < 18; i++) {
      const a = rng() * Math.PI * 2;
      const r = 5 + rng() * 14;
      const big = rng() > 0.6;
      const b = CreateBox(`c${i}`, { width: big ? 3 : 1.2, height: big ? 2.5 : 1.2, depth: big ? 0.6 : 1.2 }, scene);
      b.position.set(Math.cos(a) * r, big ? 1.25 : 0.6, Math.sin(a) * r);
      b.rotation.y = rng() * Math.PI;
      b.material = big ? wall : crate;
      b.freezeWorldMatrix();
    }
    for (const m of scene.meshes) {
      m.isPickable = false;
      m.freezeWorldMatrix();
    }
  }

  enter(): void {}
  exit(): void {}
  fixedUpdate(): void {}

  frameUpdate(dt: number): void {
    this.t += dt;
    this.camera.alpha += dt * 0.05;
    for (const fn of this.frameHooks) fn(dt);
  }
}
