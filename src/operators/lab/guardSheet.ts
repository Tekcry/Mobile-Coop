/**
 * (guard-models G4s) The guard variety sheet's page (guards.html; dev-only, never in the game bundle). It loads a guard
 * bake's output (served by the sheet's preview server at `/__guards/`, `scripts/operators/guard-sheet.mjs --in <dir>`)
 * and draws each tile of `scripts/operators/guardSheetPlan.mjs` with the game's own guard runtime, so the sheet shows what
 * the game will draw:
 * - `resolveGuardAsset` (G7) turns each base's files into its manifest (and refuses what the game would refuse);
 * - `GuardFigure` over a `CharacterRig` (G5) at the kind's height, LOD by camera distance unless the tile forces one;
 * - `guardVariant` (G6) for the look, the tile's overrides on top, `applyGear` (A5) for the visible pieces,
 *   `guardTints` (SPEC 8) for the tint table;
 * - the enforcer's `GuardShield`, the dropped helmet's `buildHelmetDropMesh` placed by the game's `helmetArc`;
 * - the Operator Lab's light rigs and presets (labData), and the game's night-vision phosphor ramp (`NV_GLSL`).
 * The sheet script drives it through `window.__guards`. Babylon only through core/babylon.ts.
 */
import {
  ArcRotateCamera, Color3, Color4, Constants, CreateBox, CreateDisc, DefaultRenderingPipeline, DirectionalLight, Effect, Engine,
  HemisphericLight, ImageProcessingConfiguration, PointLight, PostProcess, Scene, ShadowGenerator, StandardMaterial, Vector3,
  type AbstractMesh, type InstancedMesh, type Mesh,
} from '../../core/babylon';
import { ENEMIES, type EnemyDef } from '../../ai/enemyDefs';
import { factionLook } from '../../ai/factions';
import { buildHelmetDropMesh, helmetDropInstance, type HelmetMeshSource } from '../../ai/guardHelmet';
import { guardHelmetDrop, helmetArc } from '../../ai/helmetDrops';
import { GuardShield } from '../../ai/guardShield';
import type { CharacterRig, PartFactory } from '../../player/characterRig';
import { NV_GLSL, NV_TONE } from '../../vfx/nightVision';
import type { Faction } from '../../world/mapDef';
import { resolveGuardAsset, resolveShieldUrls, type GuardFileData } from '../guards/guardAssets';
import { GUARD_BASES, SHIELD_ID, type GuardBase, type GuardManifest } from '../guards/gearMask';
import { applyGear, createPieces, createVariant, guardVariant, type GuardVariant } from '../guards/guardVariant';
import { guardTints } from '../guards/guardTints';
import { loadModel } from '../runtime/figure';
import { GuardFigure, guardLibrary } from '../runtime/guardFigure';
import { LOD_0, LOD_1 } from '../runtime/manifest';
import { LIGHT_RIGS, POSES, PRESETS } from './labData';
import { missingPieces, sheetRig } from './guardSheetRig';

/** Where the sheet's preview server serves the bake out dir. */
const ROOT = '/__guards/';
const LODS = [0, 1, 2] as const;

/** A tile figure (guardSheetPlan `figure`). */
export interface SheetFigure {
  kind: string;
  base: string;
  seed: number;
  look: Partial<{ head: string; skinTone: number; hairCap: string; hairColour: string; headwear: string | null; headwear2: string | null; eyewear: string | null; kit: string[] }>;
  helmet: boolean;
  armour: boolean;
  lod: 'game' | 0 | 1 | 2;
  x: number;
  z: number;
  /** The way his knocked-off helmet fell (x, z), or null: no drop. */
  drop: [number, number] | null;
}

/** A tile (guardSheetPlan `bodyTile` / `cropTile`). */
export interface SheetTile {
  id: string;
  rig: string;
  post: 'none' | 'nv';
  preset: string;
  pose: string;
  mapId: string;
  faction: string;
  size: [number, number];
  view: { target: 'head' | 'body'; offset: [number, number, number]; distance: number; yaw: number; pitch: number; fovDeg: number };
  figures: SheetFigure[];
}

export interface SheetStatus {
  /** Bases whose files the game would use, with their piece lists. */
  bases: Record<string, { ok: boolean; problems: string[]; pieces: string[] }>;
  shield: boolean;
  renderer: string;
}

Effect.ShadersStore['guardNvFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
${NV_GLSL}
void main(void){
  vec3 c = texture2D(textureSampler, vUV).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)) * ${NV_TONE.postLift.toFixed(4)};
  gl_FragColor = vec4(nvColor(nvDrive(l, 0.0), 0.0), 1.0);
}`;

interface Placed {
  rig: CharacterRig;
  figure: GuardFigure;
  shield: GuardShield | null;
  drop: InstancedMesh | null;
}

const RAD = Math.PI / 180;

export class GuardSheet {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  private readonly hemi: HemisphericLight;
  private readonly ground: Mesh;
  private lights: (DirectionalLight | PointLight)[] = [];
  private shadow: ShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;
  private nv: PostProcess | null = null;
  private preset = '';
  private rigId = '';
  private placed: Placed[] = [];
  private readonly manifests = new Map<GuardBase, GuardManifest>();
  private shieldUrl = '';
  private helmetSrc: Promise<HelmetMeshSource | null> | null = null;
  /** The rig's own parts are never drawn (the guard figure is): one shared material for them. */
  private readonly partMat: StandardMaterial;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: false }, false);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);
    this.scene.ambientColor = new Color3(0, 0, 0);
    this.camera = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2, 4, new Vector3(0, 1, 0), this.scene);
    this.camera.minZ = 0.02;
    this.camera.maxZ = 80;
    this.hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    this.ground = CreateDisc('ground', { radius: 40, tessellation: 64 }, this.scene);
    this.ground.rotation.x = Math.PI / 2;
    this.ground.receiveShadows = true;
    const gm = new StandardMaterial('groundMat', this.scene);
    gm.diffuseColor = new Color3(0.07, 0.07, 0.075);
    gm.specularColor = new Color3(0.02, 0.02, 0.02);
    this.ground.material = gm;
    this.partMat = new StandardMaterial('partMat', this.scene);
  }

  /** Finds the bake's files and resolves each base the way the game does. Call once. */
  async init(): Promise<SheetStatus> {
    const files: Record<string, string> = {};
    const data: Record<string, GuardFileData> = {};
    const probe = async (rel: string): Promise<void> => {
      const r = await fetch(`${ROOT}${rel}`, { method: 'HEAD' }).catch(() => null);
      if (r?.ok) files[rel] = `${ROOT}${rel}`;
    };
    for (const b of GUARD_BASES) {
      for (const n of LODS) await probe(`lods/guard-${b}-lod${n}.glb`);
      const r = await fetch(`${ROOT}lods/guard-${b}.json`).catch(() => null);
      if (r?.ok) data[`lods/guard-${b}.json`] = (await r.json()) as GuardFileData;
    }
    for (const n of LODS) await probe(`lods/guard-${SHIELD_ID}-lod${n}.glb`);
    const status: SheetStatus = { bases: {}, shield: false, renderer: rendererName() };
    for (const b of GUARD_BASES) {
      const a = resolveGuardAsset(b, files, data, ['', '', '', '']);
      if (!a.standIn) this.manifests.set(b, a.manifest);
      status.bases[b] = { ok: !a.standIn, problems: a.standIn && !a.problems.length ? ['not baked'] : a.problems, pieces: a.standIn ? [] : [...a.manifest.pieces] };
    }
    const shield = resolveShieldUrls(files);
    this.shieldUrl = shield?.[LOD_1] ?? '';
    status.shield = this.shieldUrl !== '';
    return status;
  }

  /** Draws one tile at the canvas's current size; returns a PNG data URL and what could not be drawn. */
  async render(tile: SheetTile): Promise<{ url: string; notes: string[] }> {
    this.clear();
    this.engine.resize();
    const notes: string[] = [];
    this.setPreset(tile.preset);
    this.setRig(tile.rig);
    this.setPost(tile.post);
    for (const f of tile.figures) await this.place(f, tile, notes);
    await this.settleShields(notes);
    const v = tile.view;
    let target = new Vector3(0, v.offset[1], 0);
    if (v.target === 'head' && this.placed[0]) {
      const h = this.placed[0].rig.headNode;
      h.computeWorldMatrix(true);
      target = h.getAbsolutePosition().add(new Vector3(...v.offset));
    }
    this.camera.target.copyFrom(target);
    this.camera.radius = v.distance;
    this.camera.alpha = Math.PI / 2 + v.yaw;
    this.camera.beta = Math.PI / 2 - v.pitch;
    this.camera.fov = v.fovDeg * RAD;
    await this.frames(24);
    return { url: this.canvas.toDataURL('image/png'), notes };
  }

  /** Builds one figure: rig, guard figure, look, pose, LOD(s), shield, dropped helmet. */
  private async place(f: SheetFigure, tile: SheetTile, notes: string[]): Promise<void> {
    const m = this.manifests.get(f.base as GuardBase);
    const def = (ENEMIES as Record<string, EnemyDef | undefined>)[f.kind];
    if (!m) { notes.push(`${f.kind}: base ${f.base} not baked`); return; }
    if (!def) { notes.push(`${f.kind}: no such kind`); return; }
    const name = `sheet-${this.placed.length}`;
    const make = (_s: unknown, _hex: string, slot: string): AbstractMesh => {
      const b = CreateBox(`part-${name}-${slot}`, { size: 1 }, this.scene);
      b.material = this.partMat;
      b.isVisible = false;
      return b;
    };
    const rig = sheetRig(this.scene, make as PartFactory, def, tile.faction as Faction, name); // (G10a D1) the game's enemy rig: no goggle glow
    rig.root.position.set(f.x, 0, f.z);
    for (const r of rig.renderMeshes) r.setEnabled(false);
    // (GuardFigure measures the rig's rest at construction: before the first pose)
    const figure = new GuardFigure(guardLibrary(this.scene), rig, m, name, { scale: def.height / m.refHeight });
    figure.onMeshes = (ms) => { for (const x of ms) this.shadow?.addShadowCaster(x); };
    const v = guardVariant(f.seed, f.kind, tile.mapId, createVariant());
    applyLook(v, f.look);
    const tints = new Uint8Array(m.tintSlots * 3);
    guardTints(v, f.kind, tile.faction as Faction, { torso: def.look.colors.torso, helmet: def.look.colors.helmet }, tints);
    figure.setTints(tints);
    const p = applyGear(v, f.helmet, f.armour, def.plated, f.kind, createPieces());
    figure.setPieces(p.ids, p.count);
    const missing = missingPieces(p.ids, p.count, m.pieces); // (G10a D1) the shield is its own GLB
    if (missing.length) notes.push(`${f.kind}: not in the ${f.base} file: ${missing.join(', ')}`);
    this.pose(rig, tile.pose);
    try {
      if (f.lod === 'game') await figure.loadGameLods();
      else await figure.load(LOD_0 + f.lod);
    } catch (e) {
      notes.push(`${f.kind}: ${f.base} LOD load failed: ${String(e)}`);
    }
    let shield: GuardShield | null = null;
    if (def.kind === 'enforcer') {
      if (this.shieldUrl) shield = new GuardShield(this.scene, figure, this.shieldUrl, (x) => this.shadow?.addShadowCaster(x));
      else notes.push(`${f.kind}: ${SHIELD_ID} not baked`);
    }
    let drop: InstancedMesh | null = null;
    if (f.drop) {
      const src = await this.helmetSource();
      if (!src) notes.push(`${f.kind}: no helmet_std in any baked base (no drop mesh)`);
      else {
        const hex = factionLook(def.look, def.kind, tile.faction as Faction).colors.helmet;
        drop = helmetDropInstance(src, hex, `${name}-drop`);
        const box = guardHelmetDrop(def.height, [0, 0, 0]);
        drop.scaling.set(box[0]! / src.w, box[1]! / src.h, box[2]! / src.d);
        const [dx, dz] = f.drop;
        const at = [0, 0, 0, 0, 0];
        helmetArc(f.x, 0, f.z, 1.65 * def.scale, box[1]! * 0.45, dx, dz, 1, at);
        drop.position.set(at[0]!, at[1]!, at[2]!);
        drop.rotation.set(at[3]!, Math.atan2(dx, dz), at[4]!);
        this.shadow?.addShadowCaster(drop);
      }
    }
    this.placed.push({ rig, figure, shield, drop });
  }

  /** Steps until every shield is built (its file loads after the figure; up to ~5 s). */
  private async settleShields(notes: string[]): Promise<void> {
    for (let i = 0; i < 100 && this.placed.some((p) => p.shield && !p.shield.ready); i++) {
      this.step();
      await new Promise((r) => setTimeout(r, 50));
    }
    for (const p of this.placed) if (p.shield && !p.shield.ready) notes.push(`${p.figure.name}: shield not built in time`);
  }

  /** The rig settled into the pose (labData POSES: the Lab's idle), as the Lab does. */
  private pose(rig: CharacterRig, id: string): void {
    const def = POSES.find((p) => p.id === id) ?? POSES[0]!;
    const d = def.rig;
    if (!d) return;
    for (let i = 0; i < def.settle; i++) rig.animate(1 / 60, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, ...d });
  }

  /** helmet_std's drop mesh from the first baked base that holds it (the game's `helmetManifest` order). */
  private helmetSource(): Promise<HelmetMeshSource | null> {
    if (!this.helmetSrc) {
      const m = (['average', 'lean'] as const).map((b) => this.manifests.get(b)).find((x) => x?.pieces.includes('helmet_std'));
      const url = m?.urls[LOD_1];
      this.helmetSrc = m && url
        ? Promise.all([guardLibrary(this.scene).load(m, LOD_1), loadModel(url)]).then(([asset, model]) => buildHelmetDropMesh(this.scene, model, m, asset.materials[0] ?? null))
        : Promise.resolve(null);
    }
    return this.helmetSrc;
  }

  /** Frees the last tile's figures (the shared (base, LOD) data and the drop source stay). */
  private clear(): void {
    for (const p of this.placed) {
      p.shield?.dispose();
      p.drop?.dispose();
      p.figure.dispose();
      p.rig.dispose();
    }
    this.placed = [];
  }

  private setPreset(id: string): void {
    if (id === this.preset) return;
    const p = PRESETS.find((q) => q.id === id) ?? PRESETS[1]!;
    this.preset = p.id;
    this.engine.setHardwareScalingLevel(1 / p.scale);
    this.pipeline?.dispose();
    this.pipeline = new DefaultRenderingPipeline('guards', true, this.scene, [this.camera]);
    this.pipeline.samples = p.msaa;
    this.pipeline.fxaaEnabled = p.fxaa;
    this.pipeline.bloomThreshold = 0.8;
    this.pipeline.bloomWeight = 0.35;
    this.pipeline.imageProcessingEnabled = true;
    this.rigId = '';
  }

  private setRig(id: string): void {
    if (id === this.rigId) return;
    const r = LIGHT_RIGS.find((x) => x.id === id) ?? LIGHT_RIGS[0]!;
    this.rigId = r.id;
    for (const l of this.lights) l.dispose();
    this.lights = [];
    this.shadow?.dispose();
    this.shadow = null;
    this.scene.clearColor = new Color4(...r.background, 1);
    this.hemi.diffuse = new Color3(...r.ambient.sky);
    this.hemi.groundColor = new Color3(...r.ambient.ground);
    this.hemi.intensity = r.ambient.intensity;
    const preset = PRESETS.find((p) => p.id === this.preset) ?? PRESETS[1]!;
    for (const l of r.lights) {
      const light = l.kind === 'dir' ? new DirectionalLight('dir', new Vector3(...l.v).normalize(), this.scene) : new PointLight('pt', new Vector3(...l.v), this.scene);
      light.diffuse = new Color3(...l.color);
      light.specular = new Color3(...l.color);
      light.intensity = l.intensity;
      if (light instanceof PointLight) light.range = 14;
      if (light instanceof DirectionalLight) {
        light.position = new Vector3(...l.v).normalize().scale(-8).add(new Vector3(0, 1, 0));
        light.shadowMinZ = 1;
        light.shadowMaxZ = 18;
      }
      this.lights.push(light);
      if (l.shadows && !this.shadow && light instanceof DirectionalLight) {
        const g = new ShadowGenerator(preset.shadowMap, light);
        g.usePercentageCloserFiltering = true;
        g.filteringQuality = preset.shadowMap > 1024 ? ShadowGenerator.QUALITY_HIGH : ShadowGenerator.QUALITY_LOW;
        g.bias = 0.004; // (the Lab's value: lower self-shadows every face turned to the key)
        g.normalBias = 0.01;
        this.shadow = g;
      }
    }
    if (this.pipeline) {
      this.pipeline.imageProcessing.exposure = r.exposure;
      this.pipeline.imageProcessing.contrast = r.contrast;
      this.pipeline.imageProcessing.toneMappingEnabled = true;
      this.pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
      this.pipeline.bloomEnabled = r.bloom !== false && preset.bloom;
    }
  }

  private setPost(post: 'none' | 'nv'): void {
    if (post === 'nv' && !this.nv) {
      this.nv = new PostProcess('guardNv', 'guardNv', [], null, 1, this.camera, Constants.TEXTURE_BILINEAR_SAMPLINGMODE, this.engine);
    } else if (post !== 'nv' && this.nv) {
      this.nv.dispose(this.camera);
      this.nv = null;
    }
  }

  /** Renders `n` frames now, 1/60 s apart, after every shader and texture is ready (the Lab's `frames`). */
  private async frames(n: number): Promise<void> {
    for (let k = 0; k < 3; k++) this.step();
    await this.scene.whenReadyAsync();
    await new Promise((r) => setTimeout(r, 120));
    for (let k = 0; k < 3; k++) this.step();
    await this.scene.whenReadyAsync();
    for (let k = 0; k < n; k++) this.step();
  }

  /** One frame: each figure's LOD and pose for the camera (GuardBody.frame without heat or flash), its shield, the draw. */
  private step(): void {
    for (const p of this.placed) {
      p.figure.update(this.camera);
      p.shield?.follow();
    }
    this.scene.render();
  }
}

/** The tile's look overrides over guardVariant's pick (ids from the plan, which reads them from guards.json). */
function applyLook(v: GuardVariant, look: SheetFigure['look']): void {
  const o = look as Record<string, unknown>;
  const w = v as unknown as Record<string, unknown>;
  for (const k of ['head', 'skinTone', 'hairCap', 'hairColour', 'headwear', 'headwear2', 'eyewear'] as const) if (k in o) w[k] = o[k];
  if (Array.isArray(look.kit)) {
    const n = Math.min(look.kit.length, v.kit.length);
    for (let i = 0; i < n; i++) v.kit[i] = look.kit[i] as GuardVariant['kit'][number];
    v.kitCount = n;
  }
}

function rendererName(): string {
  const gl = document.createElement('canvas').getContext('webgl2');
  const e = gl?.getExtension('WEBGL_debug_renderer_info');
  return e && gl ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unknown';
}

// ---- the page ----
const canvas = document.getElementById('c') as HTMLCanvasElement | null;
if (canvas) {
  const sheet = new GuardSheet(canvas);
  const ready = sheet.init();
  (window as unknown as { __guards: GuardSheet; __guardsReady: Promise<SheetStatus> }).__guards = sheet;
  (window as unknown as { __guardsReady: Promise<SheetStatus> }).__guardsReady = ready;
  void ready.then((s) => {
    const msg = document.getElementById('msg');
    if (msg) msg.textContent = `${Object.entries(s.bases).map(([b, x]) => `${b}: ${x.ok ? `${x.pieces.length} pieces` : x.problems.join('; ')}`).join(' | ')} | shield ${s.shield ? 'yes' : 'no'} | ${s.renderer}`;
  });
}
