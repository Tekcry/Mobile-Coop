import {
  ArcRotateCamera,
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateDisc,
  HemisphericLight,
  type Mesh,
  Quaternion,
  Scene,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  type Engine,
} from '../core/babylon';
import type { AppState } from '../core/app';
import { flatMat } from './materials';
import { mulberry } from '../core/rng';
import { PartLibrary } from './partLibrary';
import { CharacterRig, setVoxelBodies } from '../player/characterRig';
import { avatarFactory } from '../cosmetics/avatarFactory';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { setVoxelWeapons, WeaponModel } from '../weapons/weaponModel';
import { WEAPONS, type WeaponId } from '../weapons/weaponDefs';
import { withAttachments } from '../progression/attachments';
import { camoById } from '../cosmetics/catalog';
import { playEmote } from '../cosmetics/emotes';
import type { QualityLevel } from '../core/quality';
import { PostStack } from '../vfx/postStack';
import { SurfaceAtlas } from './surfaceAtlas';
import { flags } from '../core/flags';

/** The diorama's lights: a warm key overhead in front of the operator, a cool rim behind, a lamp in the distance. */
const LIGHTS: { pos: [number, number, number]; at: [number, number, number]; angle: number; intensity: number; color: [number, number, number]; cone: number }[] = [
  { pos: [0.3, 4.7, -0.9], at: [0, 0.9, 0], angle: 0.42, intensity: 3.0, color: [1, 0.85, 0.64], cone: 0.16 },
  { pos: [-1.5, 4.3, 2.4], at: [0, 1.3, 0], angle: 0.36, intensity: 2.6, color: [0.45, 0.9, 0.72], cone: 0.12 },
  { pos: [6, 5.2, 7], at: [6, 0, 7], angle: 0.5, intensity: 1.3, color: [1, 0.78, 0.5], cone: 0.08 },
];

/** A visible light cone: additive, fading from the lamp to its far end (apex at the origin, along -Y). */
function lightCone(scene: Scene, name: string, len: number, half: number, color: [number, number, number], glow: number): Mesh {
  const cone = CreateCylinder(name, { height: len, diameterTop: 0.08, diameterBottom: 2 * len * Math.tan(half), tessellation: 32, subdivisions: 10, cap: 0 }, scene);
  const pos = cone.getVerticesData(VertexBuffer.PositionKind)!;
  const cols = new Float32Array((pos.length / 3) * 4);
  for (let i = 0; i < pos.length / 3; i++) {
    // brightest just below the lamp, fading out towards the floor
    const t = (pos[i * 3 + 1]! + len / 2) / len;
    cols.set([1, 1, 1, Math.pow(t, 2) * (1 - Math.pow(t, 12))], i * 4);
  }
  cone.setVerticesData(VertexBuffer.ColorKind, cols);
  cone.hasVertexAlpha = true;
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = new Color3(color[0] * glow, color[1] * glow, color[2] * glow);
  mat.alphaMode = 1; // ALPHA_ADD
  mat.disableDepthWrite = true;
  mat.backFaceCulling = false;
  cone.material = mat;
  cone.isPickable = false;
  return cone;
}

/** Camera framings: the main menu (operator right of the buttons), the Loadout screen (operator between the
 *  category list and the options, full body) and its weapon view (closer, the weapon raised). */
export type MenuFraming = 'menu' | 'loadout' | 'weapon';

/** Lightweight diorama behind the menus: a dark stage, the operator in pools of light. No physics. */
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
  private framing: MenuFraming = 'menu';
  private t2 = 0;
  private key: SpotLight | null = null;
  private spots: SpotLight[] = [];
  private hemi: HemisphericLight;
  private shadows: ShadowGenerator[] = [];
  private atlas: SurfaceAtlas | null;
  private shadowKey = '';
  /** Bloom on the bulbs, depth of field on the operator, AO, tone mapping (Settings > Graphics). */
  private stack: PostStack;

  constructor(engine: Engine) {
    const scene = new Scene(engine);
    this.scene = scene;
    // night: near black, a dim ambient; the spotlights do the work
    scene.clearColor = Color4.FromHexString('#05070bff');
    scene.ambientColor = new Color3(0.08, 0.09, 0.11);
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogColor = Color3.FromHexString('#06080c');
    scene.fogStart = 9;
    scene.fogEnd = 32;
    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, 0.1), scene);
    this.hemi = hemi;
    hemi.intensity = 0.14;
    hemi.diffuse = new Color3(0.55, 0.62, 0.8);
    hemi.groundColor = new Color3(0.05, 0.05, 0.06);
    const down = new Vector3(0, -1, 0);
    const q = new Quaternion();
    LIGHTS.forEach((l, i) => {
      const p = new Vector3(...l.pos);
      const dir = new Vector3(...l.at).subtract(p).normalize();
      const s = new SpotLight(`menuSpot${i}`, p, dir, l.angle * 2, 1.2, scene);
      s.intensity = l.intensity;
      s.diffuse = new Color3(...l.color);
      s.specular = new Color3(0.2, 0.2, 0.2);
      s.range = 16;
      if (i === 0) this.key = s;
      this.spots.push(s);
      // the visible beam, ending a little above the floor
      const len = Math.max(1, (p.y - 0.3) / Math.max(0.3, -dir.y));
      const cone = lightCone(scene, `menuBeam${i}`, len, l.angle * 0.9, l.color, l.cone);
      Quaternion.FromUnitVectorsToRef(down, dir, q);
      cone.rotationQuaternion = q.clone();
      cone.position.copyFrom(p).addInPlace(dir.scale(len / 2));
      // the lamp housing
      const lamp = CreateCylinder(`menuLamp${i}`, { height: 0.3, diameterTop: 0.22, diameterBottom: 0.42, tessellation: 12 }, scene);
      lamp.rotationQuaternion = q.clone();
      lamp.position.copyFrom(p).addInPlace(dir.scale(-0.1));
      lamp.material = flatMat(scene, '#1c1f24');
      const bulb = CreateDisc(`menuBulb${i}`, { radius: 0.17, tessellation: 16 }, scene);
      bulb.rotationQuaternion = Quaternion.FromUnitVectorsToRef(new Vector3(0, 0, -1), dir, new Quaternion());
      bulb.position.copyFrom(p).addInPlace(dir.scale(0.06));
      bulb.material = flatMat(scene, '#fff1d8', { emissive: 1 });
    });

    this.camera = new ArcRotateCamera('menuCam', -Math.PI / 2 + 0.5, 1.25, 7, new Vector3(0, 1.1, 0), scene);
    this.camera.fov = 0.8;
    this.camera.minZ = 0.1;

    const ground = CreateDisc('ground', { radius: 40, tessellation: 24 }, scene);
    ground.rotation.x = Math.PI / 2;
    ground.material = flatMat(scene, '#1d2024');
    const pad = CreateCylinder('pad', { diameter: 3.2, height: 0.2, tessellation: 8 }, scene);
    pad.position.y = 0.1;
    pad.material = flatMat(scene, '#24272b');
    const ring = CreateCylinder('ring', { diameter: 3.4, height: 0.12, tessellation: 8 }, scene);
    ring.position.y = 0.06;
    ring.material = flatMat(scene, '#38e08c', { emissive: 0.6 });

    // Scattered crates / walls: silhouettes in the dark, a few caught by the distant lamp.
    const crate = flatMat(scene, '#5a4a36');
    const wall = flatMat(scene, '#43474d');
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
      m.receiveShadows = !m.name.startsWith('menuBeam');
    }
    // the operator in PBR with the procedural surfaces (fabric, rubber, brushed steel); `?gfx=min` (tests): the
    // cheap standard material
    this.atlas = flags.gfx === 'min' ? null : new SurfaceAtlas(scene, 512, 8);
    this.parts = new PartLibrary(scene, this.atlas);
    // the operator's parts (built later) take the lamps' shadows too
    scene.onNewMeshAddedObservable.add((m) => {
      if (!m.name.startsWith('menuBeam')) m.receiveShadows = true;
    });
    this.stack = new PostStack(scene, this.camera, { fogColor: [0.02, 0.03, 0.04], fogDensity: 0, lights: null });
  }

  /** Graphics settings: the key and rim lamps cast shadows, and the post stack (no volumetrics: the beams are
   *  their own cones here). */
  applyQuality(q: QualityLevel): void {
    const sh = q.shadow;
    const key = sh.casters > 0 ? `${sh.size}:${sh.soft}` : 'off';
    if (key !== this.shadowKey) {
      this.shadowKey = key;
      for (const g of this.shadows) g.dispose();
      this.shadows.length = 0;
      if (sh.casters > 0) {
        for (const l of this.spots.slice(0, 2)) {
          l.shadowMinZ = 0.5;
          l.shadowMaxZ = 12;
          const g = new ShadowGenerator(Math.max(1024, sh.size), l);
          if (sh.soft) {
            g.useContactHardeningShadow = true;
            g.contactHardeningLightSizeUVRatio = 0.05;
          } else g.usePercentageCloserFiltering = true;
          g.filteringQuality = ShadowGenerator.QUALITY_HIGH;
          g.bias = 0.0008;
          g.normalBias = 0.01;
          g.darkness = 0.1;
          const sm = g.getShadowMap();
          if (sm) {
            // every mesh but the beams and the floor itself (null list = the whole scene)
            sm.renderList = null;
            sm.renderListPredicate = (m) => !m.name.startsWith('menuBeam') && m.name !== 'ground';
          }
          this.shadows.push(g);
        }
      }
    }
    this.stack.apply({ ...q, features: { ...q.features, volumetrics: false, ssr: false, motionBlur: false } });
  }

  /** What the preview shows (rebuilt only when it changes). */
  private shown = '';

  /** Rebuild on the next request even if it matches (the avatar style changed). */
  forget(): void {
    this.shown = '';
  }

  /** (Re)build the preview operator: the look (suit applied by the caller) holding a weapon with its attachments
   *  and camo. Live previews call it on every change; an unchanged request is free. */
  setAvatar(look: AvatarLook, weapon: WeaponId = 'rifle', camo = 'factory', attachments: readonly string[] = []): void {
    const key = JSON.stringify([look, weapon, camo, attachments]);
    if (key === this.shown && this.rig) return;
    this.shown = key;
    this.weapon?.dispose();
    this.rig?.dispose();
    // voxel operator (3.0; `?gfx=min`: the smooth parts)
    setVoxelBodies(flags.voxels && flags.gfx !== 'min' ? { size: 0.02, lodSize: 0.04, lodDistance: 1000 } : null);
    setVoxelWeapons(flags.voxels && flags.gfx !== 'min' ? { size: 0.01, fineSize: 0.005, lodSize: 0.02, lodDistance: 1000, small: 0.03 } : null);
    this.rig = new CharacterRig(this.scene, avatarFactory(this.parts, look, 'preview-part'), look, 1.75, 'preview');
    this.rig.root.position.copyFrom(this.stage).addInPlaceFromFloats(0, 0.2, 0);
    const c = camoById(camo);
    this.weapon = new WeaponModel(this.scene, this.parts, withAttachments(WEAPONS[weapon], attachments), c.colors, this.rig.weaponPivot, c.pattern);
    this.weapon.hold(this.rig);
    // the tri-lens glows in the dark
    this.rig.setLensGlow(true);
  }

  emote(id: string): void {
    if (this.rig) playEmote(this.rig, id);
  }

  setFraming(f: MenuFraming): void {
    if (f !== 'menu' && this.framing === 'menu') this.previewYaw = Math.PI;
    // the weapon view turns the operator side-on so the gun shows
    if (f === 'weapon' && this.framing !== 'weapon') this.previewYaw = Math.PI - 0.45;
    if (f === 'loadout' && this.framing === 'weapon') this.previewYaw = Math.PI;
    this.framing = f;
  }

  private aimW = 0.05;

  private photo = false;

  photoCamera(): ArcRotateCamera {
    return this.camera;
  }

  photoFreeze(on: boolean): void {
    this.photo = on;
  }

  enter(): void {}
  exit(): void {
    this.stack.dispose();
    this.atlas?.dispose();
    for (const g of this.shadows) g.dispose();
  }
  fixedUpdate(): void {}

  frameUpdate(dt: number): void {
    if (this.photo) return;
    this.t += dt;
    this.t2 += dt;
    // customising needs to see the colours: a brighter fill there, the dark stage elsewhere
    const fill = this.framing === 'menu' ? 0.14 : 0.7;
    this.hemi.intensity += (fill - this.hemi.intensity) * Math.min(1, dt * 3);
    // the key light breathes a touch (a hanging lamp)
    if (this.key) this.key.intensity = 2.6 * (1 + Math.sin(this.t * 1.3) * 0.02 + Math.sin(this.t * 3.7) * 0.01);
    const cam = this.camera;
    // the menu fills the left: the operator stands in the open right side of the screen
    // (the Loadout screen: centred between the category list on the left and the options on the right)
    const ox = this.framing === 'menu' ? 1.6 : this.framing === 'weapon' ? -0.05 : -0.1;
    cam.targetScreenOffset.x += (ox - cam.targetScreenOffset.x) * Math.min(1, dt * 4);
    if (this.framing === 'menu') {
      // a slow sway round the front, never behind
      cam.alpha += (-Math.PI / 2 + 0.35 + Math.sin(this.t * 0.07) * 0.3 - cam.alpha) * Math.min(1, dt * 2);
      cam.radius += (5.4 - cam.radius) * Math.min(1, dt * 3);
      cam.target.x += (0 - cam.target.x) * Math.min(1, dt * 3);
      cam.beta += (1.4 - cam.beta) * Math.min(1, dt * 3);
      cam.target.y += (1.45 - cam.target.y) * Math.min(1, dt * 3);
    } else {
      // front view of the full figure; the weapon view comes in to the chest and raises the gun
      const k = Math.min(1, dt * 4);
      const w = this.framing === 'weapon';
      cam.alpha += (-Math.PI / 2 - cam.alpha) * k;
      cam.radius += ((w ? 2.9 : 3.5) - cam.radius) * k;
      cam.beta += ((w ? 1.5 : 1.42) - cam.beta) * k;
      cam.target.x += (0 - cam.target.x) * k;
      cam.target.y += ((w ? 1.3 : 1.0) - cam.target.y) * k;
    }
    this.aimW += ((this.framing === 'weapon' ? 0.9 : 0.05) - this.aimW) * Math.min(1, dt * 5);
    if (this.rig) {
      this.rig.root.rotation.y = this.framing === 'menu' ? Math.PI + 0.25 + Math.sin(this.t2 * 0.3) * 0.2 : this.previewYaw;
      this.rig.animate(dt, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: this.aimW, kick: 0 });
    }
    for (const fn of this.frameHooks) fn(dt);
    // a portrait lens on the operator: the stage behind falls soft
    this.stack.focusOn = true;
    this.stack.focus = cam.radius;
    this.stack.frame(dt);
  }
}
