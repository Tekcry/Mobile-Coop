import {
  type AbstractMesh,
  ArcRotateCamera,
  Color3,
  Color4,
  CreateBox,
  CreateCylinder,
  CreateDisc,
  HemisphericLight,
  Quaternion,
  Scene,
  ShadowGenerator,
  SpotLight,
  Vector3,
  type Engine,
} from '../core/babylon';
import type { AppState } from '../core/app';
import { flatMat } from './materials';
import { mulberry } from '../core/rng';
import { PartLibrary } from './partLibrary';
import type { CharacterRig } from '../player/characterRig';
import { CLOSE_CAMERAS } from '../operators/runtime/lodPick';
import { LOD_HERO, LOD_NAMES } from '../operators/runtime/manifest';
import { gateInput, runGate, type GateLimits, type GateProbe } from './menuGate';
import { forgetModel, loadModel, operatorBytes, type OperatorFigure } from '../operators/runtime/figure';
import { loadMenuLods, MIN_LODS, operatorRig } from '../operators/runtime/playerFigure';
import { warmGuardFiles } from '../operators/guards/guardAssets';
import { wrenManifest } from '../operators/runtime/assets';
import { avatarFactory } from '../player/avatarFactory';
import { defaultLook } from '../player/avatarLook';
import { WeaponModel, DEFAULT_WEAPON_COLORS } from '../weapons/weaponModel';
import { WEAPON_IDS, WEAPONS, type WeaponId } from '../weapons/weaponDefs';
import { carryKind, type CarrySlot } from '../weapons/carrySlots';
import { withAttachments } from '../weapons/attachments';
import { GRAPHICS_PRESETS, qualityLevel, type QualityLevel } from '../core/quality';
import { PostStack } from '../vfx/postStack';
import { SurfaceAtlas } from './surfaceAtlas';
import { flags } from '../core/flags';
import { buildVoid, HERO_SHOTS, idleSway, lightCone, VOID_ORIGIN, VOID_YAW, type HeroShot, type SetLight, type VoidSet } from './menuSets';
import { createDirector, easeInOut, goggleLevel, parseShotHooks, type Director, type MenuContext } from './menuShots';
import { applyMenuPose, menuPoseInput, MENU_POSES, type MenuHold } from './menuPoses';

/** The diorama's lights: a warm key overhead in front of the operator, a cool rim behind, a lamp in the distance. */
const LIGHTS: { pos: [number, number, number]; at: [number, number, number]; angle: number; intensity: number; color: [number, number, number]; cone: number }[] = [
  { pos: [0.3, 4.7, -0.9], at: [0, 0.9, 0], angle: 0.42, intensity: 3.0, color: [1, 0.85, 0.64], cone: 0.16 },
  { pos: [-1.5, 4.3, 2.4], at: [0, 1.3, 0], angle: 0.36, intensity: 2.6, color: [0.45, 0.9, 0.72], cone: 0.12 },
  { pos: [6, 5.2, 7], at: [6, 0, 7], angle: 0.5, intensity: 1.3, color: [1, 0.78, 0.5], cone: 0.08 },
];

/** Camera framings: the main menu (operator right of the buttons), the Loadout screen (operator between the
 *  category list and the options, full body) and its weapon view (closer, the weapon raised). */
export type MenuFraming = 'menu' | 'loadout' | 'weapon';

/** Lightweight diorama behind the menus: a dark stage, the operator in pools of light. No physics. (menu-ui slice 6)
 *  On the title and main menu a shot director (`menuShots.ts`) cycles hero close-ups of Wren in a black void
 *  (`menuSets.ts`); the loadout and
 *  the lobby keep today's stage. */
/** The menu on a phone: the High preset (lamp shadows, AO, bloom, depth of field at half-res post; Epic's TAA, SSR at
 *  full-res post and 2048 soft shadows cost too much heat on a phone), whatever the play preset is. */
const PHONE_MENU_QUALITY = qualityLevel('high', GRAPHICS_PRESETS.high);

export class MenuState implements AppState {
  /** The menu stage (3.1: Auto graphics calibrates here), once the load screen has gone (menu-notes note 2: the
   *  loading frames are not measured). */
  get menuStage(): boolean {
    return this.revealed;
  }
  /** (menu-notes note 2) The load screen has gone (`prepare` settled). */
  private revealed = false;
  /** The close-up LOD's load failed / the menu's LOD chain settled (for the current figure). */
  private closeUpFailed = false;
  private chainDone = false;
  private readonly gateIn = gateInput();
  private gate = '';
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
  /** (operators 11e) Wren on the preview rig: the hero LOD (D21, D33 "Yes use hero for menu"). */
  private figure: OperatorFigure | null = null;
  private weapon: WeaponModel | null = null;
  private weaponId: WeaponId = 'rifle';
  /** (menu-notes slice 3) The other weapon (the pistol beside a long gun, or the rifle beside a pistol): in the void one
   *  is in her hands and the other in its carry slot; on the stage it is out of sight. */
  private sidearm: WeaponModel | null = null;
  private sidearmId: WeaponId = 'pistolSd';
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

  // ---- (slice 6) the cinematic background
  /** Which screen is on top (set by `main.ts`); null = main. The loadout framing overrides it. */
  screenContext: (() => MenuContext) | null = null;
  private readonly director: Director;
  private readonly clock: number;
  private readonly sets = new Map<string, HeroShot>();
  private readonly voidSet: VoidSet;
  /** The goggle's full glow (read once a body has loaded) and the scaled colour handed to the figure. */
  private glowFull: [number, number, number] | null = null;
  private readonly glowNow: [number, number, number] = [0, 0, 0];
  private glowK = -1;
  /** (slice 6) A shot change with no black between (title into the main menu): the camera eases from where it was. */
  private lastChanges = 0;
  /** `?gfx=min` (software-GL tests): the hardware scaling before the void halved the resolution, or 0. */
  private minScale = 0;
  private blend = 1;
  private readonly prevTarget = new Vector3();
  private prevAlpha = 0;
  private prevBeta = 0;
  private prevRadius = 1;
  private prevFov = 0.8;
  private prevOffset = 0;
  /** The camera's up for a dutch roll (reused), and the roll it holds now. */
  private readonly up = new Vector3(0, 1, 0);
  private rollNow = 0;
  private readonly stageMeshes: AbstractMesh[];
  private activeSet = '';
  private snap = true;
  private readonly fadeEl: HTMLDivElement;
  private fadeShown = -1;
  /** (menu-notes slice 3) The weapons' arrangement: 'stage' (the loadout weapon in the hands) or the void shot's hold;
   *  '' = not applied yet. */
  private holdMode: '' | 'stage' | MenuHold = '';
  /** The void's rig input (menuPoses.ts), reused every frame. */
  private readonly poseIn = menuPoseInput();
  /** What the weapons' visibility was last applied for (bits: in the void, primary mesh loaded, sidearm mesh loaded). */
  private visBits = -1;

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
    // the menu is a close-up camera: Wren's hero LOD (LOD2, then LOD0 stand in while it loads)
    CLOSE_CAMERAS.add(this.camera.uniqueId);

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
    this.stageMeshes = scene.meshes.slice();
    // (slice 6) the void, built now: a shot change only moves the lights and the camera
    this.voidSet = buildVoid(scene);
    for (const h of HERO_SHOTS) this.sets.set(h.id, h);
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

    const hooks = parseShotHooks(location.search);
    this.clock = hooks.clock;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.director = createDirector({ seed: navigator.webdriver ? 1 : Date.now() & 0xffff, reducedMotion: reduced, context: 'main', force: hooks.force, freezeT: hooks.freezeT });
    // the fade through black between shots: a DOM layer right above the canvas, under the menus
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'menu-fade';
    this.fadeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:0';
    const canvas = engine.getRenderingCanvas();
    if (canvas?.parentElement) canvas.after(this.fadeEl);
  }

  /** (slice 6, debug hook) The shot on screen, its changes so far and the fade (e2e-menus). */
  get shotId(): string {
    return this.director.shot.id;
  }
  get shotChanges(): number {
    return this.director.changes;
  }
  get shotFade(): number {
    return this.director.fade;
  }
  get shotContext(): MenuContext {
    return this.director.context;
  }
  /** (menu-notes slice 3, debug hook) Both menu weapons show their Blender meshes (menu-shots6). */
  get weaponsReady(): boolean {
    return !!this.weapon?.mesh && !!this.sidearm?.mesh;
  }
  /** (menu-notes slice 3, debug hook) The weapons' arrangement: 'stage' or the void shot's hold. */
  get weaponHold(): string {
    return this.holdMode;
  }
  /** (menu-notes note 4, debug hook) The LOD Wren is drawn at now ('hero', 'lod0', 'lod1', 'lod2'; 'none' before one
   *  has loaded) and the LOD the close-ups should draw ('hero' on every desktop preset, 'lod2' under `?gfx=min`). */
  get heroLod(): string {
    const c = this.figure?.current ?? -1;
    return c >= 0 ? (LOD_NAMES[c] ?? 'none') : 'none';
  }
  get heroLodWanted(): string {
    return this.figure ? (LOD_NAMES[this.figure.closeUpLod] ?? 'none') : 'none';
  }
  /** (menu-notes slice 4a, debug hook) Stops the shot director's clock (the GPU scripts freeze a moment of the goggle
   *  flicker for a still); the hand-held drift runs on. */
  debugPause = false;
  /** (menu-notes slice 4c) Seconds until the title's lights are fully up (the title's press sequence waits on it). */
  get titleLeftS(): number {
    return this.director.titleLeftS;
  }
  /** (menu-notes slice 4c, A3) The second press: the goggle strike jumps to the lit main menu. */
  skipTitle(): void {
    this.director.skipTitle();
  }
  /** (menu-notes slice 4a, debug hook) The title's light state, read back for the scripts: the phase ('dark' until the
   *  press), seconds since the press, the lights' level and goggle level the director asks for, and what the stage
   *  applied: the sum of the three spots' intensities, the hemi, the scene ambient, the clear colour, the goggle level
   *  set on the figure (-1 before a body loaded) and its lens tint now (rgb sum; 0 = no emissive, so no bloom). */
  get titleLight(): { phase: string; igniteT: number; lit: number; glow: number; spots: number; hemi: number; ambient: number; clear: number; goggle: number; lens: number } {
    const d = this.director;
    const c = this.figure?.glowColour;
    const a = this.scene.ambientColor;
    const k = this.scene.clearColor;
    return {
      phase: d.titlePhase,
      igniteT: d.igniteT,
      lit: d.lit,
      glow: d.glow,
      spots: this.spots.reduce((s, l) => s + (l.isEnabled() ? l.intensity : 0), 0),
      hemi: this.hemi.intensity,
      ambient: a.r + a.g + a.b,
      clear: k.r + k.g + k.b,
      goggle: this.glowK,
      lens: c ? c[0] + c[1] + c[2] : -1,
    };
  }
  /** (menu-notes note 2, debug hook) The load screen gate: '' while it waits, 'ready', or 'timeout: <step> ...'. */
  get bootGate(): string {
    return this.gate;
  }

  /** Every enabled, visible mesh ready to draw (its shaders compiled with the lights as they are now, its textures in),
   *  no texture still pending in the scene, and the post stack's effects compiled. Asking compiles what is missing. */
  private drawReady(): boolean {
    const scene = this.scene;
    let ok = scene.getWaitingItemsCount() === 0;
    for (const m of scene.meshes) {
      if (!m.isEnabled() || !m.isVisible || !m.subMeshes?.length) continue;
      // (no early exit: every material starts compiling at once)
      if (!m.isReady(true)) ok = false;
    }
    for (const pp of scene.postProcesses) if (pp && !pp.isReady()) ok = false;
    return ok;
  }

  /** The next rendered frame (true), or a tick of 100 ms when no frame comes (a hidden tab; false). */
  private tick(): Promise<boolean> {
    return new Promise((resolve) => {
      const obs = this.scene.onAfterRenderObservable;
      const o = obs.addOnce(() => {
        clearTimeout(id);
        resolve(true);
      });
      const id = setTimeout(() => {
        obs.remove(o);
        resolve(false);
      }, 100);
    });
  }

  /**
   * (menu-notes note 2) Resolves when the menu is ready to be seen (`menuGate.ts`): Wren's close-up LOD loaded and drawn,
   * the weapons' meshes in, the shaders of the first shot compiled and a few frames rendered behind the boot screen.
   * `report` gets the progress (0..1) and the status line. It gives up after `limits` (no progress, or the cap) and
   * resolves with the reason, so a failed load never strands the player; a check that throws resolves 'error: ...'.
   * Never rejects. Returns 'ready', 'timeout: ...', 'error: ...' or 'closed' (the menu went away meanwhile).
   */
  async prepare(report: (progress: number, text: string) => void, limits: GateLimits): Promise<string> {
    const g0 = this.gateIn;
    const probe: GateProbe = {
      read: (g) => {
        const f = this.figure;
        g.loaded = f?.loaded ?? 0;
        g.closeUp = f?.closeUpLod ?? LOD_HERO;
        g.closeUpFailed = this.closeUpFailed;
        g.chainDone = this.chainDone && !!f;
        g.weaponsPending = !this.weapon || this.weapon.meshPending || !!this.sidearm?.meshPending;
        g.onScreen = !!f && f.current === g.closeUp;
        g.drawReady = this.drawReady();
        g0.loaded = g.loaded;
        g0.weaponsPending = g.weaponsPending;
        g0.drawReady = g.drawReady;
        return operatorBytes.received;
      },
      tick: () => this.tick(),
      closed: () => this.scene.isDisposed,
      describe: () => `drawn ${this.heroLod}, wanted ${this.heroLodWanted}, loaded bits ${g0.loaded}, weapons pending ${g0.weaponsPending}, draw ready ${g0.drawReady}`,
    };
    const why = await runGate(probe, report, limits);
    this.revealed = true;
    return (this.gate = why);
  }

  /** Graphics settings: the key and rim lamps cast shadows, and the post stack (no volumetrics: the beams are
   *  their own cones here). */
  applyQuality(q: QualityLevel): void {
    // (G182) a phone plays on Low, but the menu is one figure in a void: draw it at High (Michael 2026-10-20: "menu
    // hero should be best quality on phones if it doesn't cost much")
    if (flags.phone) q = PHONE_MENU_QUALITY;
    const sh = q.shadow;
    const key = sh.casters > 0 ? `${sh.size}:${sh.soft}` : 'off';
    if (key !== this.shadowKey) {
      this.shadowKey = key;
      for (const g of this.shadows) g.dispose();
      this.shadows.length = 0;
      if (sh.casters > 0) {
        for (const l of this.spots.slice(0, 2)) {
          if (!this.activeSet || this.activeSet === 'stage') {
            l.shadowMinZ = 0.5;
            l.shadowMaxZ = 12;
          }
          const g = new ShadowGenerator(Math.max(1024, sh.size), l);
          if (sh.soft) {
            g.useContactHardeningShadow = true;
            g.contactHardeningLightSizeUVRatio = 0.05;
          } else g.usePercentageCloserFiltering = true;
          g.filteringQuality = ShadowGenerator.QUALITY_HIGH;
          this.tuneShadow(g, !!this.activeSet && this.activeSet !== 'stage');
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
    this.stack.apply({ ...q, features: { ...q.features, volumetrics: false, reflections: 'off', motionBlur: false } });
  }

  /** What the preview shows (rebuilt only when it changes). */
  private shown = '';

  /** Rebuild on the next request even if it matches (the avatar style changed). */
  forget(): void {
    this.shown = '';
  }

  /** (Re)build the preview operator: Wren (one fixed look, stage I) holding a weapon with its attachments. An unchanged
   *  request is free. */
  setAvatar(weapon: WeaponId = 'rifle', attachments: readonly string[] = []): void {
    const key = JSON.stringify([weapon, attachments]);
    if (key === this.shown && this.rig) return;
    this.shown = key;
    this.weapon?.dispose();
    this.sidearm?.dispose();
    this.figure?.dispose();
    this.rig?.dispose();
    // the operator is Wren (operators 11e, D31 / G123)
    const op = operatorRig(this.scene, avatarFactory(this.parts, 'preview-part'), defaultLook(), 'preview');
    this.rig = op.rig;
    const fig = (this.figure = op.figure);
    fig.setVision('night', 1);
    this.chainDone = false;
    this.closeUpFailed = false;
    void loadMenuLods(fig, loadModel).then(() => {
      if (this.figure === fig) this.chainDone = true;
      // (gm-polish) then every guard file into the offline cache, after Wren's chain so the menu's reveal never waits
      // on it (guard models off: nothing; each file once per page)
      void warmGuardFiles(MIN_LODS);
    });
    // (slice 6) the close-ups need the hero body: ask for it now, beside the progressive chain (the asset loads once;
    // `?gfx=min` gets LOD2). A failed load keeps the lower LOD on screen (and the load screen stops waiting for it).
    fig.loadCloseUp().catch(() => {
      if (this.figure === fig) this.closeUpFailed = true;
    });
    this.rig.root.position.copyFrom(this.stage).addInPlaceFromFloats(0, 0.2, 0);
    this.weaponId = weapon;
    this.weapon = new WeaponModel(this.scene, this.parts, withAttachments(WEAPONS[weapon], attachments), DEFAULT_WEAPON_COLORS, this.rig.weaponPivot, undefined, { mesh: true });
    this.weapon.hold(this.rig);
    // (menu-notes slice 3) the other weapon, the Blender mesh too: both are seen in the main menu's void
    this.sidearmId = WEAPON_IDS.find((id) => id !== weapon) ?? weapon;
    this.sidearm = new WeaponModel(this.scene, this.parts, WEAPONS[this.sidearmId], DEFAULT_WEAPON_COLORS, this.rig.weaponPivot, undefined, { mesh: true });
    this.sidearm.setVisible(false);
    this.holdMode = '';
    this.visBits = -1;
    this.glowFull = null;
    this.glowK = -1;
    this.weaponLight();
    // the goggle over the eyes, glowing in the dark (G73: in use)
    this.rig.setLensGlow(true);
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
    CLOSE_CAMERAS.remove(this.camera.uniqueId);
    this.figure?.dispose();
    this.figure = null;
    // the 55 MB hero's parsed file is not kept through a match (a photo-mode close-up reads it again from the cache)
    const hero = wrenManifest().urls[LOD_HERO];
    if (hero) forgetModel(hero);
    this.stack.dispose();
    this.atlas?.dispose();
    for (const g of this.shadows) g.dispose();
    this.fadeEl.remove();
    this.minResolution(false);
  }
  fixedUpdate(): void {}

  /** Light one of the shared spots for a set. */
  private light(s: SpotLight, l: SetLight, o: Vector3): void {
    s.position.set(o.x + l.pos[0], o.y + l.pos[1], o.z + l.pos[2]);
    s.direction.set(l.at[0] - l.pos[0], l.at[1] - l.pos[1], l.at[2] - l.pos[2]).normalize();
    s.angle = l.angle;
    s.exponent = l.exponent;
    s.intensity = l.intensity;
    s.diffuse.set(l.color[0], l.color[1], l.color[2]);
    s.specular.set(l.color[0] * 0.3, l.color[1] * 0.3, l.color[2] * 0.3);
    s.range = 40;
  }

  /** Switch between the stage and the void and move the shared lights (no geometry is built). */
  private showSet(id: string): void {
    this.activeSet = id;
    this.snap = true;
    const set = this.sets.get(id);
    this.minResolution(!!set);
    for (const m of this.stageMeshes) m.setEnabled(!set);
    for (const m of this.voidSet.meshes) m.setEnabled(!!set);
    const bg = set?.backGlow;
    this.voidSet.glow.setEnabled(!!bg);
    if (bg) {
      this.voidSet.glow.position.set(VOID_ORIGIN.x + bg.pos[0], VOID_ORIGIN.y + bg.pos[1], VOID_ORIGIN.z + bg.pos[2]);
      this.voidSet.glow.scaling.setAll(bg.size);
      this.voidSet.glowTex.level = bg.level;
    }
    if (set) {
      for (let i = 0; i < 3; i++) {
        const s = this.spots[i]!;
        this.light(s, set.lights[i]!, VOID_ORIGIN);
        // no shadows on the close-ups: a fitted key shadow (bias 0.004) was tried and the arm and shoulders swallowed the
        // raking key on most pieces (H2-H6 went dark); the rim-and-key look reads better unshadowed
        s.shadowEnabled = false;
      }
      this.hemi.intensity = 0;
      this.scene.clearColor.set(0, 0, 0, 1);
      // (menu-notes slice 4a) no ambient term in the void: the dark title is black with the spots off
      this.scene.ambientColor.set(0, 0, 0);
    } else {
      LIGHTS.forEach((l, i) => {
        const s = this.spots[i]!;
        s.position.set(...l.pos);
        s.direction.set(l.at[0] - l.pos[0], l.at[1] - l.pos[1], l.at[2] - l.pos[2]).normalize();
        s.angle = l.angle * 2;
        s.exponent = 1.2;
        s.intensity = l.intensity;
        s.diffuse.set(...l.color);
        s.specular.set(0.2, 0.2, 0.2);
        s.range = 16;
        s.shadowMinZ = 0.5;
        s.shadowMaxZ = 12;
        s.shadowEnabled = true;
      });
      this.scene.clearColor.set(0.02, 0.027, 0.043, 1);
      this.scene.ambientColor.set(0.08, 0.09, 0.11);
      this.camera.fov = 0.8;
      this.stack.lensMm = 50;
      this.dutch(0);
      this.setGlow(1);
    }
    for (const g of this.shadows) this.tuneShadow(g, !!set);
    this.weaponLight();
  }

  /** A dutch roll (rad) about the view axis: the camera's up turned round the line of sight. ArcRotateCamera orbits
   *  in its up's frame, but a turn about the view axis leaves the orbit offset (along that axis) where it was. */
  private dutch(roll: number): void {
    if (roll === 0 && this.rollNow === 0) return;
    this.rollNow = roll;
    const c = this.camera;
    const sb = Math.sin(c.beta);
    // the view direction (camera to target)
    const dx = -Math.cos(c.alpha) * sb;
    const dy = -Math.cos(c.beta);
    const dz = -Math.sin(c.alpha) * sb;
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    // Rodrigues: up' = up cos r + (d x up) sin r + d (d . up)(1 - cos r), up = +Y
    this.up.set(-dz * sr + dx * dy * (1 - cr), cr + dy * dy * (1 - cr), dx * sr + dz * dy * (1 - cr));
    c.upVector = this.up;
  }

  /** Shadow filtering for the stage or the void's close-ups (a larger bias at macro range keeps the self-shadow clean,
   *  and the shadow side keeps a trace of the key so the material still reads). */
  private tuneShadow(g: ShadowGenerator, close: boolean): void {
    g.bias = close ? 0.004 : 0.0008;
    g.normalBias = close ? 0.025 : 0.01;
    g.darkness = close ? 0.15 : 0.1;
  }

  /** `?gfx=min` only (the software-GL test path): the void's full-frame close-ups shade every pixel with PBR, which
   *  SwiftShader draws at about 3 fps at 1080p and starves the menu's input timing; the void renders at a third of the resolution
   *  there. Every real preset renders at full resolution. */
  private minResolution(on: boolean): void {
    if (flags.gfx !== 'min') return;
    const e = this.scene.getEngine();
    if (on && !this.minScale) {
      this.minScale = e.getHardwareScalingLevel();
      e.setHardwareScalingLevel(this.minScale * 3);
    } else if (!on && this.minScale) {
      e.setHardwareScalingLevel(this.minScale);
      this.minScale = 0;
    }
  }

  /** (menu-notes slice 3) The Blender weapons show in the void (the old parts did not hold
   *  up in close-up). Until a weapon's mesh has loaded its proxy parts stand in, and those stay hidden in the void's
   *  close-ups (they look broken there); on the stage everything shows as before. Applied only when something changed. */
  private weaponLight(): void {
    const inVoid = this.sets.has(this.activeSet);
    const bits = (inVoid ? 1 : 0) | (this.weapon?.mesh ? 2 : 0) | (this.sidearm?.mesh ? 4 : 0);
    if (bits === this.visBits) return;
    this.visBits = bits;
    for (const w of [this.weapon, this.sidearm]) {
      if (!w) continue;
      const show = !inVoid || w.mesh !== null;
      // (hide what renders)
      for (const m of w.renderMeshes) m.isVisible = show;
    }
  }

  /** The carry slot of a menu weapon (as slice 6: the long gun on the back plate mount, the pistol in her holster). */
  private static slotOf(id: WeaponId): CarrySlot {
    const k = carryKind(WEAPONS[id].class);
    return k === 'pistol' ? 'thigh' : k === 'compact' ? 'sling' : 'backL';
  }

  /**
   * (menu-notes slice 3) Arrange the weapons: on the stage the loadout weapon in her hands and the other out of sight
   * (the loadout and the lobby unchanged); in the void the shot's hold (menuPoses.ts) takes its weapon in the hands and
   * the other one goes to its carry slot. Only on a change (a shot change sits in the black of the crossfade).
   */
  private setHoldMode(mode: 'stage' | MenuHold): void {
    const rig = this.rig;
    const a = this.weapon;
    if (mode === this.holdMode || !rig || !a) return;
    this.holdMode = mode;
    const b = this.sidearm;
    if (mode === 'stage') {
      if (b) {
        b.holster(rig, MenuState.slotOf(this.sidearmId));
        b.setVisible(false);
      }
      a.hold(rig);
    } else {
      const pistol = MENU_POSES[mode].weapon === 'pistol';
      const aIs = (carryKind(WEAPONS[this.weaponId].class) === 'pistol') === pistol;
      const held = aIs || !b ? a : b;
      const other = held === a ? b : a;
      // the outgoing one into its slot first (it lets go of the rig's held weapon), then the incoming into the hands
      if (other) other.holster(rig, MenuState.slotOf(other === a ? this.weaponId : this.sidearmId));
      held.hold(rig);
    }
    this.visBits = -1;
    this.weaponLight();
  }

  frameUpdate(dt: number): void {
    if (this.photo) return;
    this.t += dt;
    this.t2 += dt;
    const ctx: MenuContext = this.framing !== 'menu' ? 'loadout' : (this.screenContext?.() ?? 'main');
    const d = this.director;
    d.setContext(ctx);
    d.update(this.debugPause ? 0 : dt * this.clock);
    if (d.changes !== this.lastChanges) {
      this.lastChanges = d.changes;
      // no black over the change (the title carried into the main menu): ease the camera across
      if (d.fade < 0.05 && this.sets.has(this.activeSet) && this.sets.has(d.shot.setup)) {
        const c = this.camera;
        this.prevAlpha = c.alpha;
        this.prevBeta = c.beta;
        this.prevRadius = c.radius;
        this.prevTarget.copyFrom(c.target);
        this.prevFov = c.fov;
        this.prevOffset = c.targetScreenOffset.x;
        this.blend = 0;
      }
    }
    if (d.shot.setup !== this.activeSet) this.showSet(d.shot.setup);
    // the fade eases (smoothstep) so the black arrives and leaves softly
    const fade = Math.round(easeInOut(d.fade) * 100) / 100;
    if (fade !== this.fadeShown) {
      this.fadeShown = fade;
      this.fadeEl.style.opacity = `${fade}`;
    }
    const set = this.sets.get(this.activeSet);
    if (set) this.cinematicFrame(dt, set);
    else this.stageFrame(dt);
    this.snap = false;
    for (const fn of this.frameHooks) fn(dt);
    // a portrait lens on the operator: the stage behind falls soft
    this.stack.focusOn = true;
    this.stack.focus = this.camera.radius;
    this.stack.frame(dt);
  }

  /** The goggle glow level 0..1 (the power-on), through the figure's per-player colour (no allocation). */
  private setGlow(k: number): void {
    const f = this.figure;
    if (!f) return;
    if (!this.glowFull) {
      const c = f.glowColour;
      if (!c) return;
      this.glowFull = c;
    }
    if (k === this.glowK) return;
    this.glowK = k;
    const g = this.glowNow;
    const b = this.glowFull;
    g[0] = b[0] * k;
    g[1] = b[1] * k;
    g[2] = b[2] * k;
    f.setGlowColour(g);
  }

  /** (slice 6) A hero shot: the camera pass eased from its start to its end pose on the shot's lens, the moving lights,
   *  the goggle power-on; Wren idle (breathing) with the shot's weapon in her hands (menu-notes slice 3). */
  private cinematicFrame(dt: number, set: HeroShot): void {
    const cam = this.camera;
    const o = VOID_ORIGIN;
    const t = this.director.t;
    const e = easeInOut(t);
    const a = set.from;
    const b = set.to;
    // a slow hand-held drift on top so even a held frame breathes
    cam.alpha = -Math.PI / 2 + a.alpha + (b.alpha - a.alpha) * e + Math.sin(this.t * 0.21) * 0.005;
    cam.beta = a.beta + (b.beta - a.beta) * e + Math.sin(this.t * 0.17) * 0.004;
    const radius = a.radius + (b.radius - a.radius) * e;
    cam.radius = radius;
    cam.target.set(
      o.x + a.target[0] + (b.target[0] - a.target[0]) * e,
      o.y + a.target[1] + (b.target[1] - a.target[1]) * e,
      o.z + a.target[2] + (b.target[2] - a.target[2]) * e,
    );
    cam.fov = set.fov;
    this.stack.lensMm = set.lensMm ?? 50;
    // Wren sits right of centre, the menu list over black on the left (the offset is in view units at the target)
    const aspect = this.scene.getEngine().getAspectRatio(cam);
    cam.targetScreenOffset.x = set.frameX * radius * Math.tan(set.fov / 2) * aspect;
    cam.targetScreenOffset.y = 0;
    // light passes: a light with `to` / `atTo` travels over the shot (the sweep, the rim swing)
    for (let i = 0; i < 3; i++) {
      const l = set.lights[i]!;
      const to = l.to ?? l.pos;
      const at = l.atTo ?? l.at;
      if (!l.to && !l.atTo) continue;
      const s = this.spots[i]!;
      const px = l.pos[0] + (to[0] - l.pos[0]) * t;
      const py = l.pos[1] + (to[1] - l.pos[1]) * t;
      const pz = l.pos[2] + (to[2] - l.pos[2]) * t;
      s.position.set(o.x + px, o.y + py, o.z + pz);
      s.direction.set(l.at[0] + (at[0] - l.at[0]) * t - px, l.at[1] + (at[1] - l.at[1]) * t - py, l.at[2] + (at[2] - l.at[2]) * t - pz).normalize();
    }
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.6);
      const k = 1 - easeInOut(this.blend);
      cam.alpha += (this.prevAlpha - cam.alpha) * k;
      cam.beta += (this.prevBeta - cam.beta) * k;
      cam.radius += (this.prevRadius - cam.radius) * k;
      cam.fov += (this.prevFov - cam.fov) * k;
      cam.targetScreenOffset.x += (this.prevOffset - cam.targetScreenOffset.x) * k;
      cam.target.x += (this.prevTarget.x - cam.target.x) * k;
      cam.target.y += (this.prevTarget.y - cam.target.y) * k;
      cam.target.z += (this.prevTarget.z - cam.target.z) * k;
    }
    this.dutch(set.roll ?? 0);
    const on = set.goggleOn;
    const d = this.director;
    // (a blended change keeps the glow where it was going: on). (menu-notes slice 4a) the title phase sets the glow and
    // the lights' level: all 0 on the dark title (no key, rim or goggle), then the flicker, then up. (slice 4d, M4) The
    // goggle's own lens emissive is its only glow: the green spill spot that followed it reflected as a hot dot on the
    // goggle housing and helmet plate above the lenses (GLOW.md), so it is gone from the sets.
    const glow = d.glow >= 0 ? d.glow : on ? goggleLevel(t, on[0], on[1]) : 1;
    this.setGlow(glow);
    const lit = d.lit;
    for (let i = 0; i < 3; i++) this.spots[i]!.intensity = set.lights[i]!.intensity * lit;
    if (this.rig) {
      // (menu-notes slice 3) the shot's hold: the rifle at low ready unless it names the pistol
      const hold = set.hold ?? 'rifle';
      this.setHoldMode(hold);
      this.weaponLight();
      const r = this.rig;
      r.root.position.copyFrom(o);
      // the rig's idle breathes; a slow weight shift on top, and the weapon's own breath (menuPoses.ts)
      // (slice 4d) W3 raises the rifle onto the aim line (menuPoses.ts `MenuPoseExtra`)
      r.root.rotation.y = VOID_YAW + idleSway(this.t2);
      r.animate(dt, applyMenuPose(this.poseIn, hold, this.t2, set.pose));
      this.figure?.update(this.scene.activeCamera);
    }
  }

  /** Today's stage (loadout S6, lobby S7 until it is built). */
  private stageFrame(dt: number): void {
    // customising needs to see the colours: a brighter fill there, the dark stage elsewhere
    const fill = this.framing === 'menu' ? 0.14 : 0.7;
    this.hemi.intensity += (fill - this.hemi.intensity) * Math.min(1, dt * 3);
    // the key light breathes a touch (a hanging lamp)
    if (this.key) this.key.intensity = 2.6 * (1 + Math.sin(this.t * 1.3) * 0.02 + Math.sin(this.t * 3.7) * 0.01);
    const cam = this.camera;
    const snap = this.snap;
    // the menu fills the left: the operator stands in the open right side of the screen
    // (the Loadout screen: centred between the category list on the left and the options on the right)
    const ox = this.framing === 'menu' ? 1.6 : this.framing === 'weapon' ? -0.05 : -0.1;
    cam.targetScreenOffset.x += (ox - cam.targetScreenOffset.x) * (snap ? 1 : Math.min(1, dt * 4));
    if (this.framing === 'menu') {
      // a slow sway round the front, never behind
      const k = snap ? 1 : Math.min(1, dt * 3);
      cam.alpha += (-Math.PI / 2 + 0.35 + Math.sin(this.t * 0.07) * 0.3 - cam.alpha) * (snap ? 1 : Math.min(1, dt * 2));
      cam.radius += (5.4 - cam.radius) * k;
      cam.target.x += (0 - cam.target.x) * k;
      cam.target.z += (0 - cam.target.z) * k;
      cam.beta += (1.4 - cam.beta) * k;
      cam.target.y += (1.45 - cam.target.y) * k;
    } else {
      // front view of the full figure; the weapon view comes in to the chest and raises the gun
      const k = snap ? 1 : Math.min(1, dt * 4);
      const w = this.framing === 'weapon';
      cam.alpha += (-Math.PI / 2 - cam.alpha) * k;
      cam.radius += ((w ? 2.9 : 3.5) - cam.radius) * k;
      cam.beta += ((w ? 1.5 : 1.42) - cam.beta) * k;
      cam.target.x += (0 - cam.target.x) * k;
      cam.target.z += (0 - cam.target.z) * k;
      cam.target.y += ((w ? 1.3 : 1.0) - cam.target.y) * k;
    }
    this.aimW += ((this.framing === 'weapon' ? 0.9 : 0.05) - this.aimW) * Math.min(1, dt * 5);
    if (this.rig) {
      this.setHoldMode('stage');
      this.rig.root.position.copyFrom(this.stage).addInPlaceFromFloats(0, 0.2, 0);
      this.rig.root.rotation.y = this.framing === 'menu' ? Math.PI + 0.25 + Math.sin(this.t2 * 0.3) * 0.2 : this.previewYaw;
      this.rig.animate(dt, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: this.aimW, kick: 0 });
      this.figure?.update(this.scene.activeCamera);
    }
  }
}
