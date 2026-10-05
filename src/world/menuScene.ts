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
import { PartLibrary } from './partLibrary';
import { CharacterRig } from '../player/characterRig';
import { avatarFactory } from '../cosmetics/avatarFactory';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { WeaponModel } from '../weapons/weaponModel';
import { WEAPONS, type WeaponId } from '../weapons/weaponDefs';
import { camoById } from '../cosmetics/catalog';
import { playEmote } from '../cosmetics/emotes';

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
  readonly parts: PartLibrary;
  private rig: CharacterRig | null = null;
  private weapon: WeaponModel | null = null;
  /** Avatar yaw (rotated by stick / drag in the customiser). */
  previewYaw = Math.PI;
  private framing: 'menu' | 'customize' = 'menu';
  private t2 = 0;

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
    this.parts = new PartLibrary(scene);
  }

  /** (Re)build the preview avatar holding a weapon with its camo. */
  setAvatar(look: AvatarLook, weapon: WeaponId = 'rifle', camo = 'factory'): void {
    this.weapon?.dispose();
    this.rig?.dispose();
    this.rig = new CharacterRig(this.scene, avatarFactory(this.parts, look, 'preview-part'), look, 1.8, 'preview');
    this.rig.root.position.copyFrom(this.stage).addInPlaceFromFloats(0, 0.2, 0);
    const c = camoById(camo);
    this.weapon = new WeaponModel(this.scene, this.parts, WEAPONS[weapon], c.colors, this.rig.weaponPivot, c.pattern);
  }

  emote(id: string): void {
    if (this.rig) playEmote(this.rig, id);
  }

  setFraming(f: 'menu' | 'customize'): void {
    this.framing = f;
    if (f === 'customize') this.previewYaw = Math.PI;
  }

  enter(): void {}
  exit(): void {}
  fixedUpdate(): void {}

  frameUpdate(dt: number): void {
    this.t += dt;
    this.t2 += dt;
    const cam = this.camera;
    if (this.framing === 'menu') {
      cam.alpha += dt * 0.05;
      cam.radius += (7 - cam.radius) * Math.min(1, dt * 3);
      cam.target.x += (0 - cam.target.x) * Math.min(1, dt * 3);
      cam.beta += (1.25 - cam.beta) * Math.min(1, dt * 3);
    } else {
      // front view, avatar on the right third (UI panel on the left)
      const a = -Math.PI / 2;
      cam.alpha += (a - cam.alpha) * Math.min(1, dt * 4);
      cam.radius += (3.6 - cam.radius) * Math.min(1, dt * 4);
      cam.beta += (1.42 - cam.beta) * Math.min(1, dt * 4);
      cam.target.x += (-0.95 - cam.target.x) * Math.min(1, dt * 4);
      cam.target.y += (1.15 - cam.target.y) * Math.min(1, dt * 4);
    }
    if (this.rig) {
      this.rig.root.rotation.y = this.framing === 'menu' ? Math.PI + 0.5 + Math.sin(this.t2 * 0.3) * 0.3 : this.previewYaw;
      this.rig.animate(dt, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, roll: -1, aimPitch: 0, aim: 0.05, kick: 0 });
    }
    for (const fn of this.frameHooks) fn(dt);
  }
}
