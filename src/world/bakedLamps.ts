import { BaseTexture, Constants, max3DTextureSize, EffectRenderer, EffectWrapper, MaterialPluginBase, RawTexture, RawTexture3D, Texture, Viewport, type AbstractMesh, type Material, type MaterialDefines, type Observer, type RenderTargetWrapper, type Scene, type SubMesh, type UniformBuffer } from '../core/babylon';
import { BOX_STRIDE, fillLampAtlas, fitLampAtlas, LAMP_CELL, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_GRID_TEXELS, LAMP_STRIDE, lampGrid, type LampAtlas, type LampResult } from '../voxel/lampBake';
import { sectionBakerOf, type SectionBaker } from '../voxel/sectionJobs';
import { slabDepth } from './sectionBake';
import { LAMP_VOL_MAX, lampVolumeGrid, lampVolumeRegion, unionRegion, type LampVolumeGrid } from '../voxel/lampVolume';
import type { LightRegistry } from './lights';
import { bakedLights, type MoonGrid } from './lightBake';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_MATH_GLSL, LIGHT_GAIN, SPOT_EXP } from './lampMath';
import { DARK_DESKTOP, DARK_GLSL, DARK_STANDARD, LEVEL_TO_RENDER, VISION_GAIN, visionAmount, visionDark, type DarkParams } from './darkCurve';
import { AMBIENT_CELL, type AmbientGrid } from './ambientGrid';
import { bakeVisSampler, DOOR_SHUT, DOORS_PER_LAMP, DOORS_PER_LAMP_ACCURATE, lampDoorListInto, lampDoorLists, type FieldDoor } from './lightField';
import { torchDrawGlsl, TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE } from './shadowAccuracy';
import { LEVEL_FILL_GLSL as LF, type Rgb } from './levelFill';
import { CHAR_SHADOW_GLSL, type CharShadowLamps, type CharShadowLink } from './charShadows';
import { LAMP_CAPSULE_GLSL } from './charOccluders';
import { charShadowReach } from './charShadowSet';
import type { TorchShadowLink } from './torchShadows';
import { bounceColor, packFillRGBA, type BounceGrid } from './bounceGrid';
import { BOUNCE_T_SHIFT, BOUNCE_T_STEP } from '../voxel/lampBounce';
/** (LR16t) vec4 per drawn torch in `lampTorch`. */
const TORCH_VEC4 = TORCH_DRAW_STRIDE / 4;

export { bakedLights };

/** Texels per lamp in the data texture: position + range, colour + exponent, direction + cos, box origin + ny,
 *  atlas tile + nx / nz, character capsule ids, door ids (3.6), (LR14) its character shadow slot + 1 (0: none). */
const LAMP_TEXELS = 8;
/** Per door two texels after the capsules: hinge + width, (sin yaw, cos yaw, height, shut). (LR15) With 8 door slots per
 *  lamp (`DOORS_PER_LAMP_ACCURATE`, the shadow-accuracy fixes) one texel per lamp sits between the capsules and the doors: the
 *  lamp's doors 5-8 (ids + 1), at `capBase + MAX_CAPSULES * 2 + lamp`. */
export const DOOR_TEXELS = 2;

export { LEVEL_TO_RENDER };

/** What the canonical bake adds to the baked lamps (3.6). */
export interface BakeExtras {
  /** (piano SO3) The map's drawn torch slots (`World.torchSlots`; default `TORCH_DRAW_SLOTS`) and whether some have no
   *  shadow map (`torchCut`: the loop's reach-cut branch). */
  torchSlots?: number;
  torchCut?: boolean;
  /** The baked moon: the sun light is multiplied by it (static moon shadows). */
  moon?: MoonGrid | null;
  /** Doors (`Doors.list`): a closed leaf stops the lamps listed for it. */
  doors?: readonly FieldDoor[];
  /** The ambient grid (gameplay's own) and the fill colour: the darkness curve reads the grid everywhere; it is the
   *  fill on the standard-material look and on the game's non-voxel surfaces (characters, props), in place of the
   *  hemisphere (Step 4b; the voxels keep the sky bake's fill). */
  fill?: { grid: AmbientGrid; color: [number, number, number] } | null;
  /** (LR16-1) The light field's bounce grid (`LightField.bounce`): its bytes go in the fill texture's green channel (its
   *  wall bits in blue and alpha) and light every lit material, the curve's level included. */
  bounce?: BounceGrid | null;
  /** The moon's share of the open-sky level (`moonLight`): the curve's moon term. */
  moonLight?: number;
  /** smooth-world fix round 2 (rendering only): the level's own fill as the voxel path lights its walls
   *  (`world/levelFill.ts`): the hemisphere's sky / ground colours x intensity and a sky visibility bake (`bakeSky` over
   *  the canonical shapes). Used by the `LAMP_LEVEL` material only. */
  level?: { sky: Rgb; ground: Rgb; vis: { origin: [number, number, number]; cell: number; n: [number, number, number]; vis: Uint8Array } | null } | null;
  /** The standard-material look (the Kestrel editor's light view; the game never sets it): the plugin goes on the lit
   *  standard materials (else on the PBR ones). */
  standard?: boolean;
}
/**
 * smooth-world: mark the level's own material (the smooth default's boxes and cylinders). `LampPlugin` then defines
 * `LAMP_LEVEL`: the level keeps its whole ambient-grid fill under night vision, as the voxel walls keep theirs; the
 * `BODY_FILL` cap stays on bodies, weapons and props.
 */
export function markLampLevel(m: Material): void {
  m.metadata = { ...(m.metadata as object | null), lampLevel: true };
}
export const isLampLevel = (m: Material): boolean => !!(m.metadata as { lampLevel?: boolean } | null)?.lampLevel;

/** (LR16-1) The fill texture's bounce channel is re-uploaded at most this often (ms). */
export const BOUNCE_UPLOAD_MS = 250;

/** (section-bake, SB8) A lamp landing outside the live section fades in over this long (ms; rendering only). */
export const LAND_FADE_MS = 1500;
/** (section-bake) Atlas bytes uploaded per frame for lamps landing in the background (`texSubImage3D` slabs). */
export const TILE_BUDGET = 4 << 20;

/** Character capsules (two texels each) and how many one lamp tests. */
export const MAX_CAPSULES = 16;
const CAPS_PER_LAMP = 4;

/** (LR16-P F1) The data texture's layout (texel indices, row-major): the grid (`cols` x `rows` columns of
 *  `LAMP_GRID_TEXELS`), the lamps (`LAMP_TEXELS` each), the capsules, (LR15) the lamps' second door texels with more than
 *  `DOORS_PER_LAMP` door slots, the doors (`DOOR_TEXELS` each). `w` x `h` texels. */
export interface LampDataLayout {
  w: number;
  h: number;
  lampBase: number;
  capBase: number;
  door2Base: number;
  doorBase: number;
}
export function lampDataLayout(cols: number, rows: number, lamps: number, doors: number, doorSlots: number): LampDataLayout {
  const w = Math.max(32, cols * LAMP_GRID_TEXELS);
  const lampBase = cols * LAMP_GRID_TEXELS * rows;
  const capBase = lampBase + lamps * LAMP_TEXELS;
  const door2Base = capBase + MAX_CAPSULES * 2;
  const doorBase = door2Base + (doorSlots > DOORS_PER_LAMP ? lamps : 0);
  const h = Math.ceil((doorBase + doors * DOOR_TEXELS) / w);
  return { w, h, lampBase, capBase, door2Base, doorBase };
}

/**
 * (LR16-P F1) The rows a frame re-sends: every per-frame write (lamp colours, capsule ids and slots, the pendants' t0,
 * the capsules, the doors' shut flags) sits at or after `lampBase`, so from the row holding it to the last row. The
 * grid above it is static and goes up only with a full upload.
 */
export function lampDataRows(lampBase: number, width: number, height: number): { y0: number; rows: number } {
  const y0 = Math.min(height, Math.floor(lampBase / width));
  return { y0, rows: height - y0 };
}

/** (LR16-P F1) `ThinEngine.updateTextureData` (`texSubImage2D`; no side-effect import): the engine side the dynamic rows use. */
type SubUpload = { updateTextureData(t: NonNullable<ReturnType<RawTexture['getInternalTexture']>>, data: ArrayBufferView, x: number, y: number, w: number, h: number): void };

/**
 * Baked lamps (3.2): every fixed light shaded through its baked visibility (`voxel/lampBake.ts`) by `LampPlugin` on
 * every lit material, instead of real Babylon lights and shadow maps. Each lamp is exact (walls, racks, doorways),
 * on or off at once (switches, shots, EMP), for a 3D texture tap per lamp per pixel; characters get soft capsule
 * shadows from every lamp. One data texture: the light grid (which lamps reach each 2 m column), the lamps, the
 * capsules (updated each frame).
 * (LR16-1) The fill texture's G channel is the light field's bounce grid (the lit lamps' one-bounce fill), B and A its
 * static wall bits (fix round: `nsGrid2` never blends it across a wall, as the field reads it). Light parity's
 * one exception: the picture's bounce is re-uploaded at most every 0.25 s (`BOUNCE_UPLOAD_MS`), so it may lag a
 * switched, shot or jammed lamp by that much; the meter, the guards and the direct light never lag.
 */
export class BakedLamps implements CharShadowLamps {
  /** The lamps' visibility atlas and the data texture (grid, lamps, capsules). */
  readonly vis: RawTexture3D;
  readonly data: RawTexture;
  /** Registry ids of the baked lights (the light rig leaves them out). */
  readonly ids: Set<number>;
  readonly atlasDims: [number, number, number];
  /** (lr-tex3d) Atlas pages stacked along y (`fitLampAtlas`): 1 unless the rows pass the GPU's 3D texture size; more
   *  pages put each lamp's y offset in its t7.y and define `LAMP_PAGES`. */
  readonly atlasPages: number;
  readonly gridInfo: { lox: number; loz: number; cols: number; rows: number };
  readonly width: number;
  /** Texel index where the lamps / the capsules / the doors start. */
  readonly lampBase: number;
  readonly capBase: number;
  readonly doorBase: number;
  /** 3.6: the baked moon (R8, linear). */
  readonly moonTex: RawTexture3D | null = null;
  readonly moon: MoonGrid | null;
  /** The fill texture, RGBA8 (LR16-1): R the ambient grid, G the bounce, B + A x 256 the bounce's wall bits. */
  readonly fillTex: RawTexture3D | null = null;
  readonly fill: BakeExtras['fill'];
  /** (LR16-1) The light field's bounce grid, its upload buffer (RGBA, as `fillTex`), the version and time last uploaded. */
  readonly bounce: BounceGrid | null;
  private readonly fillRGBA: Uint8Array | null = null;
  private bounceVer = -1;
  private bounceUp = -Infinity;
  /** (LR16-1) The bounce's colour (`bounceColor`: the lamps' tint, brightest channel 1). */
  readonly bounceC: [number, number, number];
  /** The level fill (`BakeExtras.level`) and its sky visibility texture. */
  readonly level: BakeExtras['level'];
  readonly skyTex: RawTexture3D | null = null;
  /** The plugin goes on standard materials (the editor's light view). */
  private readonly standard: boolean;
  get standardLook(): boolean {
    return this.standard;
  }
  readonly moonLight: number;
  /** Step 4b, rendering only: the night-vision gain (1 off; `GameState` eases it) and the curve's shape (the look's
   *  set; tests may tune it). Gameplay never reads either. */
  visionGain = 1;
  /** The gain at full night vision (`VISION_GAIN`; tests set `visionGain` to it). */
  readonly visionGainMax = VISION_GAIN;
  dark: DarkParams;
  /** The curve as bound this frame (`visionDark` scratch). */
  readonly darkNow: DarkParams = { ...DARK_DESKTOP };
  private readonly doors: readonly FieldDoor[];
  private readonly doorShut: Uint8Array;
  /** Per lamp its door indices (`lampDoorLists`), `doorSlots` each. */
  private readonly lampDoors: Int16Array;
  /** (LR15) Door slots per lamp: 8 (`DOORS_PER_LAMP_ACCURATE`, two door texels). */
  readonly doorSlots: number;
  /** (LR15; the per-lamp loop only) The flashlights without a shadow map, drawn by the plugin with
   *  the light field's formula x their beam's cut (`shadowAccuracy.writeTorchDraw`; the light rig writes it each frame). */
  readonly torchDraw: Float32Array | null;
  /** (piano SO3) Drawn torch slots (the shader loop, `lampTorch` and the atlas uniforms) and the reach-cut branch. */
  readonly torchSlots: number;
  readonly torchCut: boolean;
  private readonly buf: Float32Array;
  /** (LR16-P F1) The rows `frame` re-sends (`lampDataRows`): the first, their count, and `buf` from the first on. */
  readonly dynY0: number;
  readonly dynRows: number;
  private readonly dynView: Float32Array;
  private restoreObs: Observer<ReturnType<Scene['getEngine']>> | null = null;
  /** (LR16-P F1) Data texture uploads so far: whole (`update`, a door in volume mode) and dynamic rows only (tests). */
  fullUploads = 0;
  rowUploads = 0;
  private readonly order: number[];
  private version = -1;
  private caps = 0;
  private readonly capA = new Float32Array(MAX_CAPSULES * 4);
  private readonly capB = new Float32Array(MAX_CAPSULES * 4);
  private readonly plugins = new Set<Material>();
  /** Load time: the bake (or the cache read), ms. */
  bakeMs = 0;
  /** Volume re-mixes so far (3.3 spike log). */
  remixes = 0;
  /** (LR14) The character shadow maps of the nearest lamps (`world/charShadows.ts`; `World` sets it): their lamps
   *  shade characters from the atlas, the capsules only for what a map does not hold. */
  charShadows: CharShadowLink | null = null;
  /** (LR16t) The guard torches' shadow atlas (`world/torchShadows.ts`; `World` sets it): with it on the torch loop
   *  (`LAMP_TSHADOW`) shades every drawn torch from its map and its shut doors instead of the reach cut. */
  torchShadows: TorchShadowLink | null = null;
  /** Texels per lamp (tests read the data texture). */
  readonly lampTexels = LAMP_TEXELS;
  /** Per baked lamp x, y, z and (LR16-P F2) its character shadow reach (`charShadowReach`: where its level falls to
   *  `CHAR_SHADOW.minLevel`; `CharShadowLamps`): the slot picker, a slot's casters, doors and props read it, never the
   *  light. (LR16-5b) A swinging pendant's x, y, z follow its swing. */
  readonly spheres: Float32Array;
  /** (LR16-P F2) Per baked lamp its light's reach (t0.w): a slot map's far plane. */
  readonly lightReach: Float32Array;
  /** (LR16-5b) Per baked lamp its baked (rest) x, y, z: a pendant's t0 and sphere are rest + its live offset. */
  private readonly rest: Float32Array;
  /** (LR16-5b) Per baked lamp: 1 while it swings (`CharShadowLamps.moving`: it keeps its shadow slot, refreshed every frame). */
  readonly moving: Uint8Array;
  get count(): number {
    return this.order.length;
  }
  /** The lamp gives light now (on, not shot, not jammed: its colour is not black). */
  lampLit(i: number): boolean {
    const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
    if (this.buf[o]! + this.buf[o + 1]! + this.buf[o + 2]! > 0) return true;
    // (LR16-5) a stuttering tube at an off step is still lit: it keeps its character shadow slot
    const l = this.reg.lights[this.order[i]!];
    return !!l && this.fade[i]! > 0 && l.flicker < 1 && l.on && !l.destroyed && l.intensity > 0;
  }
  /** Characters' capsules each frame (foot + head points, radius): GameState's. */
  capsules: ((a: Float32Array, b: Float32Array, max: number) => number) | null = null;
  /** Volume mode (3.3; now only the Kestrel editor's light view - the game never makes one): the lamps mixed into one light volume (two taps a pixel) instead of the per-lamp loop; re-mixed on
   *  the GPU from the data above when lamps change. */
  readonly volume: LampVolume | null = null;
  /** Volume mode: the nearest characters' capsules (two vec4 each), for shadows along the light's direction. */
  readonly volCaps = new Float32Array(VOL_CAPS * 8);
  private readonly boxes: Float32Array;
  private readonly lastColors: Float32Array;
  /** (section-bake) The bake result the atlas was filled from (lamps still baking land into it), the atlas layout. */
  private readonly r: LampResult;
  private readonly bakedL: Float32Array;
  private readonly atlas: LampAtlas;
  private readonly door2Base: number;
  /** (section-bake) Per lamp where its cells start in `r.vis` (null: a finished bake, summed on use). */
  private readonly visAt: Float64Array | null;
  /** (section-bake, SB8, rendering only) Per lamp its colour's fade-in (1: in full; 0: not landed yet). */
  readonly fade: Float32Array;
  private readonly fadeT0: Float64Array;
  private readonly fadeList: Int32Array;
  private fadeN = 0;
  /** (section-bake) Per lamp 1 once its cells are in the atlas (null: every lamp was in at load). */
  private readonly have: Uint8Array | null = null;
  /** (section-bake) The baker still landing lamps (null: every lamp was in at load). */
  private readonly baker: SectionBaker | null = null;
  /** (section-bake) Lamps whose atlas tile waits for upload (a queue: the live section's at its head), per lamp its z slices up. */
  private readonly tileQ: Int32Array;
  private tileHead = 0;
  private tileTail = 0;
  private readonly tileZ: Int32Array;
  /** (check B 5) Scratch for reordering the queue on a live change. */
  private readonly tileTmp: Int32Array;
  /** (check B 2) `uploadTile` returned false once: no more sub-uploads; whole re-uploads only for the live section and once at the end. */
  private tileFailed = false;
  /** (check B 2) A whole-atlas re-upload waits for the next frame (landing batches before it ride along). */
  private atlasDue = false;
  /** The baker's last batch has arrived. */
  private bakeDone = false;
  /** (section-bake) Tile slabs uploaded with `texSubImage3D` / whole-atlas fallbacks (tests, the build report). */
  tileUploads = 0;
  atlasReuploads = 0;
  /** (map-ready S1) Lamps marked landed (`landed()`) and material re-scans in `frame()`: the load record's counters. */
  landings = 0;
  rescans = 0;

  /** (map-ready S2) Atlas uploads still owed: the queued tiles, plus 1 while a whole re-upload is due (the load gate's
   *  `bake-all` step waits for 0). Render side only. */
  get tilesPending(): number {
    return this.tileTail - this.tileHead + (this.atlasDue ? 1 : 0);
  }

  constructor(
    private scene: Scene,
    private reg: LightRegistry,
    baked: { lights: Float32Array; ids: number[] },
    r: LampResult,
    lo: readonly number[],
    hi: readonly number[],
    volume: { floorY: number } | null = null,
    extra: BakeExtras = {},
  ) {
    this.order = baked.ids;
    this.spheres = new Float32Array(baked.ids.length * 4);
    this.lightReach = new Float32Array(baked.ids.length);
    for (let i = 0; i < baked.ids.length; i++) {
      for (let k = 0; k < 3; k++) this.spheres[i * 4 + k] = baked.lights[i * LAMP_STRIDE + k]!;
      // (LR16-P F2) w: the picture-only shadow reach (`charShadowReach`); the lamp's own reach stays in t0.w and here
      const R = baked.lights[i * LAMP_STRIDE + 3]!;
      this.lightReach[i] = R;
      this.spheres[i * 4 + 3] = charShadowReach(reg.lights[baked.ids[i]!]?.intensity ?? 0, R);
    }
    this.rest = new Float32Array(baked.ids.length * 3);
    for (let i = 0; i < baked.ids.length; i++) for (let k = 0; k < 3; k++) this.rest[i * 3 + k] = baked.lights[i * LAMP_STRIDE + k]!;
    this.moving = new Uint8Array(baked.ids.length);
    this.moon = extra.moon ?? null;
    this.fill = extra.fill ?? null;
    this.bounce = extra.bounce ?? null;
    this.bounceC = bounceColor(baked.ids.map((id) => reg.lights[id]!));
    this.level = extra.level ?? null;
    this.standard = !!extra.standard;
    this.moonLight = extra.moonLight ?? 0;
    this.dark = { ...(this.standard ? DARK_STANDARD : DARK_DESKTOP) };
    this.doors = extra.doors ?? [];
    this.doorShut = new Uint8Array(this.doors.length).fill(2);
    // (shadow audit) the light field's own list: doorways the lamp cannot see take no slot
    this.doorSlots = DOORS_PER_LAMP_ACCURATE;
    this.lampDoors = lampDoorLists(baked.lights, this.doors, bakeVisSampler(r), this.doorSlots);
    this.torchSlots = !volume && !this.standard ? (extra.torchSlots ?? TORCH_DRAW_SLOTS) : TORCH_DRAW_SLOTS;
    this.torchCut = !volume && !this.standard && !!extra.torchCut;
    this.torchDraw = !volume && !this.standard ? new Float32Array(this.torchSlots * TORCH_DRAW_STRIDE) : null;
    this.ids = new Set(baked.ids);
    this.boxes = r.boxes;
    this.lastColors = new Float32Array(baked.ids.length * 3).fill(-1);
    // (section-bake) a bake still landing: the lamps not in yet start dark (fade 0) and come in through `landed`
    this.r = r;
    this.bakedL = baked.lights;
    const nL = baked.ids.length;
    this.fade = new Float32Array(nL).fill(1);
    this.fadeT0 = new Float64Array(nL);
    this.fadeList = new Int32Array(nL);
    this.tileQ = new Int32Array(nL);
    this.tileZ = new Int32Array(nL);
    this.tileTmp = new Int32Array(nL);
    const sb = sectionBakerOf(r);
    this.visAt = sb ? sb.at : null;
    if (sb) {
      const have = new Uint8Array(nL);
      for (let i = 0; i < nL; i++) {
        have[i] = sb.plan.landed[i]!;
        this.fade[i] = have[i]!;
      }
      this.have = have;
      this.baker = sb;
      sb.onLand((ls, k) => this.landed(ls, k, sb));
      sb.onLive(() => this.liveChanged(sb));
    }
    // (lr-tex3d) within the GPU's real 3D texture size: past it the upload fails and every lamp reads 0 on screen
    const atlas = fitLampAtlas(r.boxes, max3DTextureSize(scene.getEngine()));
    if (!atlas.fits) console.warn(`BakedLamps: lamp atlas ${atlas.dims.join('x')} passes this GPU's 3D texture size`);
    this.atlasDims = atlas.dims;
    this.atlas = atlas;
    this.atlasPages = atlas.pages;
    const [ax, ay, az] = atlas.dims;
    this.vis = new RawTexture3D(fillLampAtlas(r, atlas), ax, ay, az, Constants.TEXTUREFORMAT_R, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    this.vis.wrapU = this.vis.wrapV = this.vis.wrapR = Texture.CLAMP_ADDRESSMODE;
    dropCpuCopy(this.vis);
    const grid = lampGrid(baked.lights, lo, hi);
    if (grid.worst > LAMP_GRID_SLOTS) console.warn(`BakedLamps: a 2 m column has ${grid.worst} lamps in reach, past the ${LAMP_GRID_SLOTS} slots: the farthest are dropped`);
    this.gridInfo = { lox: lo[0]!, loz: lo[2]!, cols: grid.cols, rows: grid.rows };
    const n = baked.ids.length;
    // (LR16b) `LAMP_GRID_TEXELS` texels a column; (LR15: with 8 door slots, the lamps' second door texels first)
    const lay = lampDataLayout(grid.cols, grid.rows, n, this.doors.length, this.doorSlots);
    const w = lay.w;
    const h = lay.h;
    this.width = w;
    this.lampBase = lay.lampBase;
    this.capBase = lay.capBase;
    const door2Base = lay.door2Base;
    this.door2Base = door2Base;
    this.doorBase = lay.doorBase;
    const buf = new Float32Array(w * h * 4);
    this.buf = buf;
    // (LR16-P F1) the dynamic rows' view, made once (no per-frame subarray)
    const dyn = lampDataRows(this.lampBase, w, h);
    this.dynY0 = dyn.y0;
    this.dynRows = dyn.rows;
    this.dynView = buf.subarray(dyn.y0 * w * 4);
    // the grid: ids + 1 as floats (row-major in texel order)
    for (let i = 0; i < grid.data.length; i++) buf[i] = grid.data[i]!;
    // the lamps' fixed texels
    const cosLamp = LAMP_CONE_COS;
    for (let i = 0; i < n; i++) {
      const o = (this.lampBase + i * LAMP_TEXELS) * 4;
      const L = baked.lights;
      const li = i * LAMP_STRIDE;
      buf.set([L[li]!, L[li + 1]!, L[li + 2]!, L[li + 3]!], o);
      const cone = L[li + 7]! > -1.5;
      // t1 (colour) is written by `update`; its w: the spot exponent
      buf[o + 7] = cone ? SPOT_EXP : LAMP_EXP;
      buf.set([L[li + 4]!, L[li + 5]!, L[li + 6]!, cone ? L[li + 7]! : cosLamp], o + 8);
      const b = i * BOX_STRIDE;
      buf.set([r.boxes[b]!, r.boxes[b + 1]!, r.boxes[b + 2]!, r.boxes[b + 4]!], o + 12);
      buf.set([atlas.offsets[i * 2]!, atlas.offsets[i * 2 + 1]!, r.boxes[b + 3]!, r.boxes[b + 5]!], o + 16);
      // (lr-tex3d: t7.y, the tile's page along y; t7.x is the character shadow slot, written by `update`)
      buf[o + 29] = atlas.ys[i]!;
      // (t6: the doors this lamp tests, ids + 1)
      const ns = this.doorSlots;
      for (let k = 0; k < DOORS_PER_LAMP; k++) buf[o + 24 + k] = this.lampDoors[i * ns + k]! + 1;
      // (LR15: doors 5-8)
      for (let k = DOORS_PER_LAMP; k < ns; k++) buf[(door2Base + i) * 4 + k - DOORS_PER_LAMP] = this.lampDoors[i * ns + k]! + 1;
    }
    // the doors' fixed texels (their shut flag is written by `writeDoors`)
    this.doors.forEach((d, k) => {
      const a = d.anchor;
      const o = (this.doorBase + k * DOOR_TEXELS) * 4;
      buf.set([a.hinge.x, a.hinge.y, a.hinge.z, a.width, Math.sin(a.yaw), Math.cos(a.yaw), a.height, 0], o);
    });
    this.writeDoors();
    const mk3 = (data: Uint8Array, nx: number, ny: number, nz: number): RawTexture3D => {
      const t = new RawTexture3D(data, nx, ny, nz, Constants.TEXTUREFORMAT_R, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      t.wrapU = t.wrapV = t.wrapR = Texture.CLAMP_ADDRESSMODE;
      dropCpuCopy(t);
      return t;
    };
    if (this.moon) this.moonTex = mk3(this.moon.vis, this.moon.n[0], this.moon.n[1], this.moon.n[2]);
    if (this.fill) {
      // (LR16-1) RGBA8: R the ambient grid as before, G the bounce, B + A its wall bits (fix round; one sampler, the
      // samplers are unchanged)
      const fg = this.fill.grid;
      const bg = this.bounce && this.bounce.n.every((v, k) => v === fg.n[k]) ? this.bounce : null;
      bg?.sync(reg);
      this.fillRGBA = new Uint8Array(fg.data.length * 4);
      packFillRGBA(fg.data, bg && bg.active ? bg.g : null, bg && bg.active ? bg.bits : null, this.fillRGBA, fg.n);
      bg?.clearDirty();
      this.bounceVer = bg ? bg.version : -1;
      if (!bg) this.bounce = null;
      const t = new RawTexture3D(this.fillRGBA, fg.n[0], fg.n[1], fg.n[2], Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      t.wrapU = t.wrapV = t.wrapR = Texture.CLAMP_ADDRESSMODE;
      this.fillTex = t;
    }
    const sv = this.level?.vis;
    if (sv) this.skyTex = mk3(sv.vis, sv.n[0], sv.n[1], sv.n[2]);

    this.data = new RawTexture(buf, w, h, Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.NEAREST_SAMPLINGMODE, Constants.TEXTURETYPE_FLOAT);
    // (LR16-P F1) a restored context gets the whole texture (the grid included) before the next dynamic rows
    this.restoreObs = scene.getEngine().onContextRestoredObservable.add(() => this.data.update(this.buf));
    if (volume) this.volume = new LampVolume(scene, this, lampVolumeGrid(r.boxes, volume.floorY));
    this.update();
  }

  /** Put the plugin on every lit material in the scene, now and as they are made. */
  attachAll(): void {
    for (const m of this.scene.materials) this.attach(m);
    // (Step 4b: a material made later is attached on the next frame (`frame`), once its constructor has run - the
    // plugin is not added from the scene's new-material event (Babylon notifies it a tick after the add): the event
    // only marks the next frame, beside the count check; backlog 30: the count alone missed an add and a dispose in
    // one frame)
    this.matCount = this.scene.materials.length;
    this.matObs ??= this.scene.onNewMaterialAddedObservable.add(() => {
      this.matAdded = true;
    });
  }

  /** Materials in the scene at the last check (a change: attach the new ones). */
  private matCount = -1;
  /** A material was made since the last check (the scene's new-material event). */
  private matAdded = false;
  private matObs: Observer<Material> | null = null;

  attach(m: Material): void {
    if (this.plugins.has(m)) return;
    // (the standard-material look: the lit standard materials - level, characters, weapons, props; not the sky, bulbs or
    // effects, which draw unlit)
    const cls = m.getClassName();
    if (this.standard ? cls !== 'StandardMaterial' || (m as Material & { disableLighting?: boolean }).disableLighting : cls !== 'PBRMaterial') return;
    this.plugins.add(m);
    const frozen = m.isFrozen;
    if (frozen) m.unfreeze();
    new LampPlugin(m, this);
    if (frozen) m.freeze();
  }

  /** Lamps on / off / shot out / EMP (on a registry change): their colours; the volume re-mixed where they changed. */
  private update(): void {
    const buf = this.buf;
    const changed: number[][] = [];
    for (let i = 0; i < this.order.length; i++) {
      const l = this.reg.lights[this.order[i]!]!;
      const k = l.on && !l.destroyed ? l.intensity * l.flicker * LIGHT_GAIN * this.fade[i]! : 0;
      const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
      buf[o] = l.color[0] * k;
      buf[o + 1] = l.color[1] * k;
      buf[o + 2] = l.color[2] * k;
      const c = this.lastColors;
      if (c[i * 3] !== buf[o] || c[i * 3 + 1] !== buf[o + 1] || c[i * 3 + 2] !== buf[o + 2]) {
        c[i * 3] = buf[o]!;
        c[i * 3 + 1] = buf[o + 1]!;
        c[i * 3 + 2] = buf[o + 2]!;
        if (this.volume) changed.push(lampVolumeRegion(this.boxes, i, this.volume.grid));
      }
    }
    this.version = this.reg.version;
    this.data.update(buf);
    this.fullUploads++;
    const region = unionRegion(changed);
    if (region && this.volume) {
      this.volume.mix(region);
      this.remixes++;
    }
  }

  /** Per render frame: lamp changes and the characters' capsules (each lamp lists the nearest few in its reach). */
  frame(): void {
    let dirty = false;
    const mats = this.scene.materials;
    if (this.matCount >= 0 && (this.matAdded || mats.length !== this.matCount)) {
      this.matAdded = false;
      this.matCount = mats.length;
      this.rescans++;
      for (let i = 0; i < mats.length; i++) this.attach(mats[i]!);
    }
    if (this.version !== this.reg.version) this.update();
    this.uploadBounce();
    if (this.doors.length && this.writeDoors()) {
      if (this.volume) this.data.update(this.buf);
      else dirty = true;
    }
    // (section-bake) lamps landing in the background: their atlas tiles (a byte budget a frame), then their fade-in
    if ((this.atlasDue || (this.tileTail > this.tileHead && !this.tileFailed) || this.fadeN > 0) && this.stepLanding()) dirty = true;
    const nc = this.capsules ? Math.min(MAX_CAPSULES, this.capsules(this.capA, this.capB, MAX_CAPSULES)) : 0;
    if (this.volume) {
      // (the first few capsules: the operator and the guards nearest the camera)
      const vc = this.volCaps;
      vc.fill(0);
      for (let c = 0; c < Math.min(nc, VOL_CAPS); c++) {
        for (let k = 0; k < 4; k++) {
          vc[c * 8 + k] = this.capA[c * 4 + k]!;
          vc[c * 8 + 4 + k] = this.capB[c * 4 + k]!;
        }
      }
      // (a mix that could not run yet - its shader still compiling - runs now)
      this.volume.retry();
      return;
    }
    if (nc || this.caps || this.charShadows?.on || this.csWas) {
      this.csWas = !!this.charShadows?.on;
      this.caps = nc;
      this.writeCapsules(nc);
      dirty = true;
    }
    if (this.flickV !== this.reg.flickerVersion && this.writeFlicker()) dirty = true;
    // (LR16-5b) the pendants' t0, written by `writeSway` earlier this frame: folded into the one upload
    if (this.swayDirty) {
      this.swayDirty = false;
      dirty = true;
    }
    if (dirty) this.uploadRows();
  }

  /**
   * (LR16-P F1) The per-frame upload: the dynamic rows only (`dynY0` on, `texSubImage2D`), not the static grid - the same
   * texels the whole upload sent (every per-frame write sits at or after `lampBase`), the same GLSL. No allocation.
   */
  private uploadRows(): void {
    const t = this.data.getInternalTexture();
    const e = this.scene.getEngine() as unknown as Partial<SubUpload>;
    if (!t || typeof e.updateTextureData !== 'function') {
      this.data.update(this.buf);
      this.fullUploads++;
      return;
    }
    e.updateTextureData(t, this.dynView, 0, this.dynY0, this.width, this.dynRows);
    this.rowUploads++;
  }

  /**
   * (LR16-1) The bounce follows the lamps: when the grid moved (a lamp switched, shot, jammed or EMP'd), the dirty box
   * is re-packed and the fill texture uploaded, at most every `BOUNCE_UPLOAD_MS`. The one parity exception: the
   * picture's bounce may lag the meter's by up to 0.25 s (the direct light never lags). No allocation.
   */
  private uploadBounce(): void {
    const bg = this.bounce;
    const buf = this.fillRGBA;
    if (!bg || !buf || !this.fillTex || !this.fill) return;
    bg.sync(this.reg);
    if (bg.version === this.bounceVer) return;
    const now = performance.now();
    if (now - this.bounceUp < BOUNCE_UPLOAD_MS) return;
    this.bounceUp = now;
    this.bounceVer = bg.version;
    packFillRGBA(this.fill.grid.data, bg.g, bg.bits, buf, this.fill.grid.n, bg.dirty);
    bg.clearDirty();
    this.fillTex.update(buf);
  }

  /** Tests (3.6): the volume's cell at a world point (`LampVolume.readCell`), or null without a volume. */
  volumeAt(x: number, y: number, z: number): { a: number[]; b: number[] } | null {
    return this.volume ? this.volume.readCell(x, y, z) : null;
  }

  /**
   * Doors' shut flags into the data texture; true when one changed. In volume mode the lamps that list a changed
   * door are re-mixed over their regions (a door is a light change, bible L12).
   */
  private writeDoors(): boolean {
    // (per frame: nothing allocated unless a door changed)
    let changed = false;
    let regions: number[][] | null = null;
    for (let k = 0; k < this.doors.length; k++) {
      const shut = this.doors[k]!.open <= DOOR_SHUT ? 1 : 0;
      if (this.doorShut[k] === shut) continue;
      const first = this.doorShut[k] === 2;
      this.doorShut[k] = shut;
      this.buf[(this.doorBase + k * DOOR_TEXELS) * 4 + 7] = shut;
      changed = true;
      if (this.volume && !first) {
        for (let i = 0; i < this.order.length; i++) {
          const ns = this.doorSlots;
          for (let j = 0; j < ns; j++) if (this.lampDoors[i * ns + j] === k) (regions ??= []).push(lampVolumeRegion(this.boxes, i, this.volume.grid));
        }
      }
    }
    const region = regions ? unionRegion(regions) : null;
    if (region && this.volume) {
      this.data.update(this.buf);
      this.volume.mix(region);
      this.remixes++;
    }
    return changed;
  }

  /** (LR16-5) The registry's `flickerVersion` at the last `writeFlicker`. */
  private flickV = -1;
  /** (LR16-5) Registry id -> bake index (-1: not baked), made at the first `writeFlicker`. */
  private bakeIndex: Int32Array | null = null;

  /**
   * (LR16-5) The flickering lamps only (`LightRegistry.flickering`, the dirty set): their colour texel = colour x
   * intensity x the live `flicker` x `LIGHT_GAIN`, the value `update` writes and the light field reads (light parity).
   * The same texel a switch or a jam scales, so no new sampler. True when one was written. No allocation after the first.
   */
  private writeFlicker(): boolean {
    const reg = this.reg;
    this.flickV = reg.flickerVersion;
    const ids = reg.flickering;
    if (!ids.length) return false;
    const idx = this.indexOfIds();
    const buf = this.buf;
    let wrote = false;
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k]!;
      const i = id < idx.length ? idx[id]! : -1;
      if (i < 0) continue;
      const l = reg.lights[id]!;
      const g = l.on && !l.destroyed ? l.intensity * l.flicker * LIGHT_GAIN * this.fade[i]! : 0;
      const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
      buf[o] = l.color[0] * g;
      buf[o + 1] = l.color[1] * g;
      buf[o + 2] = l.color[2] * g;
      wrote = true;
    }
    return wrote;
  }

  /** (LR16-5) Registry id -> bake index (-1: not baked); made on first use. */
  private indexOfIds(): Int32Array {
    const n = this.reg.lights.length;
    let idx = this.bakeIndex;
    if (!idx || idx.length < n) {
      idx = this.bakeIndex = new Int32Array(n).fill(-1);
      for (let i = 0; i < this.order.length; i++) idx[this.order[i]!] = i;
    }
    return idx;
  }

  /** (LR16-5b) The registry's `swayVersion` at the last `writeSway`, and t0 texels written since the last upload. */
  private swayV = -1;
  private swayDirty = false;

  /**
   * (LR16-5b) Per render frame, before the character shadows pick (`World.frame`): when a pendant moved
   * (`swayVersion`), its t0 xyz in the data texture and its sphere = rest + the live offset, and `moving` while its
   * envelope is over `SWAY.still`. The texels go up with `frame`'s one upload (never a second one a frame); the
   * capsules (`writeCapsules`) and the shader read t0, so they follow. No GLSL change. No allocation after the first.
   */
  writeSway(): void {
    const reg = this.reg;
    const s = reg.sway;
    if (!s || this.swayV === reg.swayVersion) return;
    this.swayV = reg.swayVersion;
    const idx = this.indexOfIds();
    const buf = this.buf;
    const R = this.rest;
    const S = this.spheres;
    for (let k = 0; k < s.n; k++) {
      const id = s.ids[k]!;
      const i = id < idx.length ? idx[id]! : -1;
      if (i < 0) continue;
      const l = reg.lights[id]!;
      const x = R[i * 3]! + l.swx;
      const y = R[i * 3 + 1]! + l.swy;
      const z = R[i * 3 + 2]! + l.swz;
      const o = (this.lampBase + i * LAMP_TEXELS) * 4;
      buf[o] = x;
      buf[o + 1] = y;
      buf[o + 2] = z;
      S[i * 4] = x;
      S[i * 4 + 1] = y;
      S[i * 4 + 2] = z;
      this.moving[i] = s.moving(k) ? 1 : 0;
    }
    this.swayDirty = true;
  }

  /** (LR14) Character shadows were on at the last write (their slots are cleared once they go off). */
  private csWas = false;

  private writeCapsules(nc: number): void {
    const cs = this.charShadows?.on ? this.charShadows : null;
    const buf = this.buf;
    const a = this.capA;
    const b = this.capB;
    for (let c = 0; c < nc; c++) {
      const o = (this.capBase + c * 2) * 4;
      buf[o] = a[c * 4]!;
      buf[o + 1] = a[c * 4 + 1]!;
      buf[o + 2] = a[c * 4 + 2]!;
      buf[o + 3] = a[c * 4 + 3]!;
      buf[o + 4] = b[c * 4]!;
      buf[o + 5] = b[c * 4 + 1]!;
      buf[o + 6] = b[c * 4 + 2]!;
      buf[o + 7] = 0;
    }
    // per lamp: up to CAPS_PER_LAMP capsules within its reach (ids + 1, 0 = none)
    for (let i = 0; i < this.order.length; i++) {
      const lo = (this.lampBase + i * LAMP_TEXELS) * 4;
      const o = lo + 20;
      const lx = buf[lo]!;
      const ly = buf[lo + 1]!;
      const lz = buf[lo + 2]!;
      const r = buf[lo + 3]! + 0.5;
      // (LR14) a lamp with a character shadow map: its slot in t7; the capsules only for characters its map does not hold
      const slot = cs ? cs.lampSlot[i]! : -1;
      buf[lo + 28] = slot + 1;
      let k = 0;
      for (let c = 0; c < nc && k < CAPS_PER_LAMP; c++) {
        const mx = (a[c * 4]! + b[c * 4]!) * 0.5 - lx;
        const my = (a[c * 4 + 1]! + b[c * 4 + 1]!) * 0.5 - ly;
        const mz = (a[c * 4 + 2]! + b[c * 4 + 2]!) * 0.5 - lz;
        if (mx * mx + my * my + mz * mz >= r * r) continue;
        if (slot >= 0 && cs!.covers(slot, mx + lx, my + ly, mz + lz)) continue;
        buf[o + k++] = c + 1;
      }
      for (; k < CAPS_PER_LAMP; k++) buf[o + k] = 0;
    }
  }

  /**
   * (section-bake) Lamps `ls[0 .. k)` landed in the bake (a promise callback between frames, never per frame): their
   * door lists (from their visibility, as the light field's) and door texels, their atlas tiles. A lamp of the live
   * section is lit at once (light parity: the meter already reads it): during the load its tile goes up now; once the
   * match plays it goes to the head of the tile queue (check B 4: the byte budget a frame, no whole-tile spike). Any
   * other lamp is queued and fades in once its tile is up (SB8, rendering only: its light reaches no point of the live
   * section). Without sub-uploads (check B 2) only the live section's landings and the last batch re-upload the whole
   * atlas (once, on the next frame). The colours and door texels go up with the next frame's whole upload.
   */
  private landed(ls: Int32Array, k: number, sb: SectionBaker): void {
    const have = this.have;
    if (!have) return;
    const seen = bakeVisSampler(this.r);
    let any = false;
    for (let j = 0; j < k; j++) {
      const i = ls[j]!;
      if (i < 0 || i >= have.length || have[i]) continue;
      have[i] = 1;
      this.landings++;
      any = true;
      lampDoorListInto(this.lampDoors, i, this.bakedL, this.doors, seen, this.doorSlots);
      this.writeLampDoors(i);
      if (sb.plan.liveMember(i)) {
        this.fade[i] = 1;
        if (this.tileFailed) this.atlasDue = true;
        else if (sb.playing) this.queueFirst(i);
        else if (!this.uploadTile(i, 0, this.boxes[i * BOX_STRIDE + 5]!)) {
          this.tileFailed = true;
          this.atlasDue = true;
        }
      } else {
        this.fade[i] = 0;
        this.tileQ[this.tileTail++] = i;
      }
    }
    if (sb.plan.done) {
      this.bakeDone = true;
      // (check B 2) the one whole re-upload the background lamps waited for
      if (this.tileFailed) this.atlasDue = true;
    }
    if (!any) return;
    // (the colours and the door texels: one whole upload on the next frame)
    this.version = -1;
  }

  /** (check B 4) Lamp `i`'s tile to the head of the queue (before a head part-way up: its slices are kept per lamp). */
  private queueFirst(i: number): void {
    if (this.tileHead > 0) this.tileQ[--this.tileHead] = i;
    else {
      this.tileQ.copyWithin(1, 0, this.tileTail);
      this.tileQ[0] = i;
      this.tileTail++;
    }
  }

  /**
   * (check B 5) The live section changed (the host's `loadSection`, the client's `ls`): its lamps still fading snap to
   * full, its lamps still queued go to the queue head at full colour (picture = meter as soon as their tiles are up).
   */
  private liveChanged(sb: SectionBaker): void {
    if (!this.have) return;
    let any = false;
    for (let j = 0; j < this.fadeN; ) {
      const i = this.fadeList[j]!;
      if (sb.plan.liveMember(i)) {
        this.fade[i] = 1;
        this.fadeList[j] = this.fadeList[--this.fadeN]!;
        any = true;
      } else j++;
    }
    // (a stable partition of the queue: the live section's lamps first)
    const Q = this.tileQ;
    const T = this.tileTmp;
    let a = 0;
    for (let q = this.tileHead; q < this.tileTail; q++) {
      const i = Q[q]!;
      if (!sb.plan.liveMember(i)) continue;
      T[a++] = i;
      this.fade[i] = 1;
      any = true;
    }
    if (a > 0) {
      for (let q = this.tileHead; q < this.tileTail; q++) if (!sb.plan.liveMember(Q[q]!)) T[a++] = Q[q]!;
      for (let q = 0; q < a; q++) Q[this.tileHead + q] = T[q]!;
      if (this.tileFailed) this.atlasDue = true;
    }
    // (the colours: one whole upload on the next frame)
    if (any) this.version = -1;
  }

  /** (section-bake) Lamp `i`'s door ids into its t6 texel and its second door texel (as the constructor writes them). */
  private writeLampDoors(i: number): void {
    const o = (this.lampBase + i * LAMP_TEXELS) * 4;
    const ns = this.doorSlots;
    for (let k = 0; k < DOORS_PER_LAMP; k++) this.buf[o + 24 + k] = this.lampDoors[i * ns + k]! + 1;
    for (let k = DOORS_PER_LAMP; k < ns; k++) this.buf[(this.door2Base + i) * 4 + k - DOORS_PER_LAMP] = this.lampDoors[i * ns + k]! + 1;
  }

  /**
   * (section-bake) Per frame while lamps land: a whole-atlas re-upload when one is due (check B 2), else up to
   * `TILE_BUDGET` bytes of queued tiles; then the fades. True when colours changed. No allocation.
   */
  private stepLanding(): boolean {
    const now = performance.now();
    let wrote = false;
    if (this.atlasDue) {
      this.atlasDue = false;
      this.reuploadAtlas();
      // (every landed lamp's cells are in now: the queue empties)
      for (let q = this.tileHead; q < this.tileTail; q++) if (this.tileUp(this.tileQ[q]!, now)) wrote = true;
      this.tileHead = this.tileTail;
    }
    let budget = TILE_BUDGET;
    const B = this.boxes;
    while (!this.tileFailed && this.tileTail > this.tileHead && budget > 0) {
      const i = this.tileQ[this.tileHead]!;
      const nx = B[i * BOX_STRIDE + 3]!;
      const ny = B[i * BOX_STRIDE + 4]!;
      const nz = B[i * BOX_STRIDE + 5]!;
      const z0 = this.tileZ[i]!;
      const z1 = Math.min(nz, z0 + slabDepth(nx, ny, budget));
      if (!this.uploadTile(i, z0, z1)) {
        // (check B 2: no sub-upload) one whole re-upload now if the live section or the finished bake needs it, else at
        // the end; never one per landing batch
        this.tileFailed = true;
        if (this.bakeDone || this.queuedLive()) this.atlasDue = true;
        break;
      }
      budget -= (z1 - z0) * nx * ny;
      this.tileZ[i] = z1;
      if (z1 >= nz) {
        this.tileHead++;
        if (this.tileUp(i, now)) wrote = true;
      }
    }
    if (this.fadeN === 0) return wrote;
    for (let j = 0; j < this.fadeN; ) {
      const i = this.fadeList[j]!;
      const f = Math.min(1, Math.max(0, (now - this.fadeT0[i]!) / LAND_FADE_MS));
      this.fade[i] = f;
      this.writeColour(i);
      if (f >= 1) this.fadeList[j] = this.fadeList[--this.fadeN]!;
      else j++;
    }
    return true;
  }

  /** Lamp `i`'s tile is up: a live-section lamp is in full at once (check B 5), any other fades in. True: a colour written. */
  private tileUp(i: number, now: number): boolean {
    if (this.baker?.plan.liveMember(i)) {
      if (this.fade[i] === 1) return false;
      this.fade[i] = 1;
      this.writeColour(i);
      return true;
    }
    this.startFade(i, now);
    return false;
  }

  /** A queued lamp of the live section (check B 2: such a lamp cannot wait for the end). */
  private queuedLive(): boolean {
    const sb = this.baker;
    if (!sb) return false;
    for (let q = this.tileHead; q < this.tileTail; q++) if (sb.plan.liveMember(this.tileQ[q]!)) return true;
    return false;
  }

  private startFade(i: number, now: number): void {
    this.fadeT0[i] = now;
    this.fadeList[this.fadeN++] = i;
  }

  /** Lamp `i`'s colour texel as `update` writes it (the fade included). */
  private writeColour(i: number): void {
    const l = this.reg.lights[this.order[i]!];
    if (!l) return;
    const k = l.on && !l.destroyed ? l.intensity * l.flicker * LIGHT_GAIN * this.fade[i]! : 0;
    const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
    this.buf[o] = l.color[0] * k;
    this.buf[o + 1] = l.color[1] * k;
    this.buf[o + 2] = l.color[2] * k;
  }

  /**
   * (section-bake) Lamp `i`'s atlas tile, z slices [z0, z1), with `texSubImage3D` straight from `r.vis` (no copy). False
   * when the engine's GL internals are not there (the caller re-uploads the whole atlas).
   */
  private uploadTile(i: number, z0: number, z1: number): boolean {
    if (z1 <= z0) return true;
    const it = this.vis.getInternalTexture();
    const eng = this.scene.getEngine() as unknown as { _gl?: WebGL2RenderingContext; _bindTextureDirectly?: (target: number, t: unknown, forUpdate?: boolean) => unknown; _unpackFlipY?: (value: boolean) => void };
    const gl = eng._gl;
    if (!it || !gl || typeof gl.texSubImage3D !== 'function' || typeof eng._bindTextureDirectly !== 'function' || typeof eng._unpackFlipY !== 'function') return false;
    // (check B must-fix) WebGL 2 rejects a 3D upload from an ArrayBufferView while UNPACK_FLIP_Y / PREMULTIPLY_ALPHA is on
    // (INVALID_OPERATION, nothing uploaded). Babylon caches flip-Y and leaves it on after any invertY upload (figure
    // textures, DynamicTexture.update), so clear it through the engine's cache, as its own updateRawTexture3D does.
    eng._unpackFlipY(false);
    const premul = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL) as boolean;
    if (premul) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const B = this.boxes;
    const o = i * BOX_STRIDE;
    const nx = B[o + 3]!;
    const ny = B[o + 4]!;
    const at = this.visAt ? this.visAt[i]! : this.cellsBefore(i);
    eng._bindTextureDirectly(gl.TEXTURE_3D, it, true);
    const align = gl.getParameter(gl.UNPACK_ALIGNMENT) as number;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, this.atlas.offsets[i * 2]!, this.atlas.ys[i]!, this.atlas.offsets[i * 2 + 1]! + z0, nx, ny, z1 - z0, gl.RED, gl.UNSIGNED_BYTE, this.r.vis, at + z0 * nx * ny);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, align);
    if (premul) gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    eng._bindTextureDirectly(gl.TEXTURE_3D, null);
    this.tileUploads++;
    return true;
  }

  private cellsBefore(i: number): number {
    const B = this.boxes;
    let s = 0;
    for (let j = 0; j < i; j++) s += B[j * BOX_STRIDE + 3]! * B[j * BOX_STRIDE + 4]! * B[j * BOX_STRIDE + 5]!;
    return s;
  }

  /** (section-bake) The fallback: the whole atlas from `r.vis` again (a big upload; only without `texSubImage3D`). */
  private reuploadAtlas(): void {
    this.vis.update(fillLampAtlas(this.r, this.atlas));
    dropCpuCopy(this.vis);
    this.atlasReuploads++;
  }

  dispose(): void {
    if (this.matObs) this.scene.onNewMaterialAddedObservable.remove(this.matObs);
    this.matObs = null;
    if (this.restoreObs) this.scene.getEngine().onContextRestoredObservable.remove(this.restoreObs);
    this.restoreObs = null;
    this.vis.dispose();
    this.data.dispose();
    this.moonTex?.dispose();
    this.fillTex?.dispose();
    this.skyTex?.dispose();
    this.volume?.dispose();
  }
}

/** Capsules the light volume's shadows test (the nearest characters). */
export const VOL_CAPS = 4;

/** A closed door leaf between a lamp `a` and a point `b` (the same test as `LightField.doorBlocksOne`). Door texels:
 *  d0 = hinge + width, d1 = (sin yaw, cos yaw, height, shut). */
const DOOR_GLSL = `
bool nsDoorBlocks(vec3 a, vec3 b, vec4 d0, vec4 d1) {
  if (d1.w < 0.5) return false;
  float sa = (a.x - d0.x) * d1.y - (a.z - d0.z) * d1.x;
  float sb = (b.x - d0.x) * d1.y - (b.z - d0.z) * d1.x;
  if ((sa > 0.0 && sb > 0.0) || (sa < 0.0 && sb < 0.0) || sa == sb) return false;
  vec3 q = a + (b - a) * (sa / (sa - sb));
  float s = (q.x - d0.x) * d1.x + (q.z - d0.z) * d1.y;
  return s >= 0.0 && s <= d0.w && q.y >= d0.y && q.y <= d0.y + d1.z;
}
`;

/** The volume mix (GLSL): per cell, the lamps in its 2 m column as the per-lamp loop lights them, without N.L.
 *  Exported for the guard test that it holds `LAMP_MATH_GLSL`. */
export const MIX_GLSL = `
precision highp float;
precision highp sampler3D;
// (LR16-L B2) no Babylon include here, so the int precision is stated: lampTexel's indices pass 16 bits on big maps
precision highp int;
uniform highp sampler3D lampVis;
uniform highp sampler2D lampData;
uniform vec4 lampInfo;
uniform vec4 lampGridO;
uniform vec4 lampAtlas;
uniform vec4 volO;
uniform float slice;
uniform float outB;
uniform float volMax;
uniform vec4 lampMore;
${LAMP_MATH_GLSL}
vec4 lampTexel(int k) {
  int w = int(lampInfo.x);
  return texelFetch(lampData, ivec2(k - (k / w) * w, k / w), 0);
}
${DOOR_GLSL}
void main(void) {
  vec3 p = volO.xyz + vec3(gl_FragCoord.xy, slice + 0.5) * volO.w;
  vec3 e = vec3(0.0);
  vec3 dsum = vec3(0.0);
  float wsum = 0.0;
  vec2 gq = floor((p.xz - lampGridO.xy) / lampGridO.z);
  if (gq.x >= 0.0 && gq.y >= 0.0 && gq.x < lampInfo.y && gq.y < lampInfo.z) {
    int gk = (int(gq.y) * int(lampInfo.y) + int(gq.x)) * ${LAMP_GRID_TEXELS};
    vec4 ga = vec4(0.0);
    for (int s = 0; s < ${LAMP_GRID_SLOTS}; s++) {
      int sl = s - (s / 4) * 4;
      if (sl == 0) ga = lampTexel(gk + s / 4);
      float fid = ga[sl];
      if (fid < 0.5) break;
      int lb = int(lampInfo.w) + (int(fid + 0.5) - 1) * ${LAMP_TEXELS};
      vec4 t1 = lampTexel(lb + 1);
      if (t1.r + t1.g + t1.b <= 0.0) continue;
      vec4 t0 = lampTexel(lb);
      vec3 L = t0.xyz - p;
      float d = length(L);
      if (d >= t0.w) continue;
      L /= max(d, 1e-4);
      vec4 t2 = lampTexel(lb + 2);
      float ca = dot(-L, t2.xyz);
      if (ca < t2.w) continue;
      float k = nsLampFalloff(d, t0.w) * nsLampCone(ca, t2.w, t1.w);
      vec4 t3 = lampTexel(lb + 3);
      vec4 t4 = lampTexel(lb + 4);
      vec3 q = clamp((p - t3.xyz) / lampAtlas.w, vec3(0.5), vec3(t4.z, t3.w, t4.w) - 0.5);
#ifdef LAMP_PAGES
      k *= texture(lampVis, (q + vec3(t4.x, lampTexel(lb + 7).y, t4.y)) / lampAtlas.xyz).r;
#else
      k *= texture(lampVis, (q + vec3(t4.x, 0.0, t4.y)) / lampAtlas.xyz).r;
#endif
      if (k <= 0.0) continue;
      // (3.6) closed doors near the lamp
      vec4 t6 = lampTexel(lb + 6);
      for (int c = 0; c < ${DOORS_PER_LAMP}; c++) {
        float did = t6[c];
        if (did < 0.5) break;
        int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
        if (nsDoorBlocks(t0.xyz, p, lampTexel(db), lampTexel(db + 1))) {
          k = 0.0;
          break;
        }
      }
#ifdef LAMP_DOORS8
      // (LR15) doors 5-8: the lamp's second door texel, after the capsules (lamp order)
      if (k > 0.0 && t6.w > 0.5) {
        vec4 t8 = lampTexel(int(lampGridO.w) + ${MAX_CAPSULES * 2} + int(fid + 0.5) - 1);
        for (int c = 0; c < 4; c++) {
          float did = t8[c];
          if (did < 0.5) break;
          int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
          if (nsDoorBlocks(t0.xyz, p, lampTexel(db), lampTexel(db + 1))) {
            k = 0.0;
            break;
          }
        }
      }
#endif
      if (k <= 0.0) continue;
      vec3 c = t1.rgb * k;
      e += c;
      float lum = dot(c, vec3(0.3, 0.59, 0.11));
      dsum += L * lum;
      wsum += lum;
    }
  }
  if (outB < 0.5) {
    gl_FragColor = vec4(sqrt(min(e / volMax, vec3(1.0))), 1.0);
  } else {
    float dl = length(dsum);
    gl_FragColor = dl > 1e-6 ? vec4(0.5 + 0.5 * dsum / dl, min(1.0, dl / max(wsum, 1e-6))) : vec4(0.5, 0.0, 0.5, 0.0);
  }
}`;

/**
 * The light volume (3.3; the Kestrel editor's light view): two RGBA8 3D render targets (`lampVolume.ts`: light, direction) drawn slice by slice
 * by `MIX_GLSL` from the baked lamps' data - at load and over the cells of lamps that change. A few milliseconds of GPU
 * once per change instead of the per-lamp loop in every pixel of every frame.
 */
class LampVolume {
  readonly a: BaseTexture;
  readonly b: BaseTexture;
  private readonly rtA: RenderTargetWrapper;
  private readonly rtB: RenderTargetWrapper;
  private readonly renderer: EffectRenderer;
  private readonly wrapper: EffectWrapper;
  /** A region still to mix (its shader was compiling). */
  private pending: number[] | null = null;
  /** Mixes run (tests). */
  mixes = 0;

  constructor(
    scene: Scene,
    private lamps: BakedLamps,
    readonly grid: LampVolumeGrid,
  ) {
    const engine = scene.getEngine();
    const [nx, ny, nz] = grid.dims;
    const make = (): RenderTargetWrapper =>
      engine.createRenderTargetTexture({ width: nx, height: ny, depth: nz }, { generateMipMaps: false, generateDepthBuffer: false, generateStencilBuffer: false, type: Constants.TEXTURETYPE_UNSIGNED_BYTE, format: Constants.TEXTUREFORMAT_RGBA, samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE });
    this.rtA = make();
    this.rtB = make();
    const wrap = (rt: RenderTargetWrapper): BaseTexture => {
      const t = new BaseTexture(scene, rt.texture);
      t.wrapU = t.wrapV = t.wrapR = Texture.CLAMP_ADDRESSMODE;
      return t;
    };
    this.a = wrap(this.rtA);
    this.b = wrap(this.rtB);
    this.renderer = new EffectRenderer(engine);
    this.wrapper = new EffectWrapper({ engine, name: 'lampVolumeMix', fragmentShader: MIX_GLSL, defines: mixDefines(lamps), uniformNames: ['lampInfo', 'lampGridO', 'lampAtlas', 'volO', 'slice', 'outB', 'volMax', 'lampMore'], samplerNames: ['lampVis', 'lampData'] });
  }

  /** Mix a region of cells (i0, j0, k0, i1, j1, k1) into both targets. */
  mix(reg: readonly number[]): void {
    if (!this.wrapper.effect.isReady()) {
      // (merged with any region already waiting)
      this.pending = this.pending ? unionRegion([this.pending, reg]) : [...reg];
      return;
    }
    const [i0, j0, k0, i1, j1, k1] = reg as [number, number, number, number, number, number];
    const engine = this.renderer.engine;
    const l = this.lamps;
    const g = this.grid;
    const r = this.renderer;
    const fx = i0 / g.dims[0];
    const fy = j0 / g.dims[1];
    const vp = new Viewport(fx, fy, (i1 - i0) / g.dims[0], (j1 - j0) / g.dims[1]);
    r.saveStates();
    for (let pass = 0; pass < 2; pass++) {
      const rt = pass ? this.rtB : this.rtA;
      for (let k = k0; k < k1; k++) {
        engine.bindFramebuffer(rt, 0, undefined, undefined, true, 0, k);
        r.setViewport(vp);
        r.applyEffectWrapper(this.wrapper);
        const e = this.wrapper.effect;
        e.setTexture('lampVis', l.vis);
        e.setTexture('lampData', l.data);
        e.setFloat4('lampInfo', l.width, l.gridInfo.cols, l.gridInfo.rows, l.lampBase);
        e.setFloat4('lampGridO', l.gridInfo.lox, l.gridInfo.loz, LAMP_GRID, l.capBase);
        e.setFloat4('lampAtlas', l.atlasDims[0], l.atlasDims[1], l.atlasDims[2], LAMP_CELL);
        e.setFloat4('volO', g.o[0], g.o[1], g.o[2], g.cell);
        e.setFloat('slice', k);
        e.setFloat('outB', pass);
        e.setFloat('volMax', LAMP_VOL_MAX);
        e.setFloat4('lampMore', l.doorBase, 0, 0, 0);
        r.draw();
        engine.unBindFramebuffer(rt, true);
      }
    }
    r.restoreStates();
    this.mixes++;
  }

  /**
   * Tests (3.6, parity probes): the cell containing a world point read back from the GPU - light (A: rgb =
   * sqrt(light / `LAMP_VOL_MAX`)) and direction (B) - or null outside the volume or while a mix waits.
   */
  readCell(x: number, y: number, z: number): { a: number[]; b: number[] } | null {
    const g = this.grid;
    const i = Math.floor((x - g.o[0]) / g.cell);
    const j = Math.floor((y - g.o[1]) / g.cell);
    const k = Math.floor((z - g.o[2]) / g.cell);
    if (i < 0 || j < 0 || k < 0 || i >= g.dims[0] || j >= g.dims[1] || k >= g.dims[2] || this.pending) return null;
    const engine = this.renderer.engine as unknown as { _gl: WebGL2RenderingContext; bindFramebuffer(rt: RenderTargetWrapper, face?: number, w?: number, h?: number, force?: boolean, lod?: number, layer?: number): void; unBindFramebuffer(rt: RenderTargetWrapper, disableGen?: boolean): void };
    const gl = engine._gl;
    const read = (rt: RenderTargetWrapper): number[] => {
      const px = new Uint8Array(4);
      engine.bindFramebuffer(rt, 0, undefined, undefined, true, 0, k);
      gl.readPixels(i, j, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      engine.unBindFramebuffer(rt, true);
      return [px[0]!, px[1]!, px[2]!, px[3]!];
    };
    return { a: read(this.rtA), b: read(this.rtB) };
  }

  /** Run a mix that was waiting for its shader. */
  retry(): void {
    if (!this.pending || !this.wrapper.effect.isReady()) return;
    const p = this.pending;
    this.pending = null;
    this.mix(p);
  }

  dispose(): void {
    this.wrapper.dispose();
    this.renderer.dispose();
    this.a.dispose();
    this.b.dispose();
    this.rtA.dispose();
    this.rtB.dispose();
  }
}

/**
 * (LR16-1) The fill texture at a point: R the ambient fill (1 outside the grid, as `nsGrid`; one linear tap), G the
 * bounce read as the light field's `BounceGrid.sampleInto` reads it (fix round: 8 texel fetches, the home cell crossed
 * to the point's side of a wall inside it, the corners it reaches through open faces blended and renormalised; B + A x
 * 256 the wall bits). Step for step the field's arithmetic: `tests/bounceGrid.test.ts` checks it against the field.
 * (LR16-P F3) No local arrays (dynamically indexed `float v[8]` / `int e[8]` / `bool c[8]` spill to local memory on
 * NVIDIA): the corners k = x + 2y + 4z as two vec4 of values (`va` k 0-3, `vb` k 4-7) and two ivec4 of wall bits, the
 * reach set an 8-bit mask grown along the cube's 12 edges (each pass adds every corner one open edge from the set; the
 * set a corner reaches is the same as the per-corner loop's, at most 7 passes), the blend over all 8 corners with the
 * unreached ones weighted 0 (the same sums: + 0 and x 0 are exact).
 */
export const NS_GRID2_GLSL = `vec2 nsGrid2(highp sampler3D t, vec3 p, vec4 o, vec4 n) {
  vec3 q = (p - o.xyz) / (o.w * n.xyz);
  float amb = any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0))) ? 1.0 : texture(t, clamp(q, 0.0, 1.0)).r;
  vec3 u = clamp((p - o.xyz) / o.w - 0.5, vec3(0.0), n.xyz - 1.0);
  vec3 b = floor(u);
  vec3 f = u - b;
  ivec3 i0 = ivec3(b);
  ivec3 i1 = min(i0 + 1, ivec3(n.xyz) - 1);
  vec4 s0 = texelFetch(t, ivec3(i0.x, i0.y, i0.z), 0);
  vec4 s1 = texelFetch(t, ivec3(i1.x, i0.y, i0.z), 0);
  vec4 s2 = texelFetch(t, ivec3(i0.x, i1.y, i0.z), 0);
  vec4 s3 = texelFetch(t, ivec3(i1.x, i1.y, i0.z), 0);
  vec4 s4 = texelFetch(t, ivec3(i0.x, i0.y, i1.z), 0);
  vec4 s5 = texelFetch(t, ivec3(i1.x, i0.y, i1.z), 0);
  vec4 s6 = texelFetch(t, ivec3(i0.x, i1.y, i1.z), 0);
  vec4 s7 = texelFetch(t, ivec3(i1.x, i1.y, i1.z), 0);
  vec4 va = vec4(s0.g, s1.g, s2.g, s3.g);
  vec4 vb = vec4(s4.g, s5.g, s6.g, s7.g);
  if (va + vb == vec4(0.0)) return vec2(amb, 0.0);
  ivec4 ea = ivec4(vec4(s0.b, s1.b, s2.b, s3.b) * 255.0 + 0.5) + ivec4(vec4(s0.a, s1.a, s2.a, s3.a) * 255.0 + 0.5) * 256;
  ivec4 eb = ivec4(vec4(s4.b, s5.b, s6.b, s7.b) * 255.0 + 0.5) + ivec4(vec4(s4.a, s5.a, s6.a, s7.a) * 255.0 + 0.5) * 256;
  ivec3 hb = ivec3(step(vec3(0.5), f));
  int h = hb.x + hb.y * 2 + hb.z * 4;
  ivec4 eq = hb.z == 1 ? eb : ea;
  int hq = hb.x + hb.y * 2;
  int eh = hq == 0 ? eq.x : hq == 1 ? eq.y : hq == 2 ? eq.z : eq.w;
  vec3 d = abs(f - vec3(hb));
  int tx = (eh >> (hb.x == 1 ? ${BOUNCE_T_SHIFT[1]} : ${BOUNCE_T_SHIFT[0]})) & 3;
  int ty = (eh >> (hb.y == 1 ? ${BOUNCE_T_SHIFT[3]} : ${BOUNCE_T_SHIFT[2]})) & 3;
  int tz = (eh >> (hb.z == 1 ? ${BOUNCE_T_SHIFT[5]} : ${BOUNCE_T_SHIFT[4]})) & 3;
  if (tx > 0 && d.x >= float(tx) * ${BOUNCE_T_STEP}) h ^= 1;
  if (ty > 0 && d.y >= float(ty) * ${BOUNCE_T_STEP}) h ^= 2;
  if (tz > 0 && d.z >= float(tz) * ${BOUNCE_T_STEP}) h ^= 4;
  ivec4 wo = ea | eb;
  int c = ((wo.x | wo.y | wo.z | wo.w) & 7) == 0 ? 255 : 1 << h;
  if (c != 255) {
    ivec4 xa = ivec4(equal(ea & 1, ivec4(0)));
    ivec4 xb = ivec4(equal(eb & 1, ivec4(0)));
    ivec4 ya = ivec4(equal(ea & 2, ivec4(0)));
    ivec4 yb = ivec4(equal(eb & 2, ivec4(0)));
    ivec4 za = ivec4(equal(ea & 4, ivec4(0)));
    int mx = xa.x | (xa.z << 2) | (xb.x << 4) | (xb.z << 6);
    int my = ya.x | (ya.y << 1) | (yb.x << 4) | (yb.y << 5);
    int mz = za.x | (za.y << 1) | (za.z << 2) | (za.w << 3);
    for (int r = 0; r < 7; r++) {
      int g = c | ((c & mx) << 1) | ((c >> 1) & mx) | ((c & my) << 2) | ((c >> 2) & my) | ((c & mz) << 4) | ((c >> 4) & mz);
      if (g == c) break;
      c = g;
    }
  }
  vec2 wx = vec2(1.0 - f.x, f.x);
  vec4 wa = vec4(wx * (1.0 - f.y), wx * f.y) * (1.0 - f.z) * vec4(notEqual(ivec4(c) & ivec4(1, 2, 4, 8), ivec4(0)));
  vec4 wb = vec4(wx * (1.0 - f.y), wx * f.y) * f.z * vec4(notEqual(ivec4(c) & ivec4(16, 32, 64, 128), ivec4(0)));
  float sw = wa.x + wa.y + wa.z + wa.w + wb.x + wb.y + wb.z + wb.w;
  float sv = wa.x * va.x + wa.y * va.y + wa.z * va.z + wa.w * va.w + wb.x * vb.x + wb.y * vb.y + wb.z * vb.z + wb.w * vb.w;
  vec4 vq = h >= 4 ? vb : va;
  int hk = h & 3;
  float vh = hk == 0 ? vq.x : hk == 1 ? vq.y : hk == 2 ? vq.z : vq.w;
  return vec2(amb, sw > 0.0 ? sv / sw : vh);
}`;

/** The lamp loop (GLSL), shared by every material the plugin is on. Exported for the guard test that it holds
 *  `LAMP_MATH_GLSL`. (LR16-L B2) It states `precision highp int` itself (global scope inside
 *  CUSTOM_FRAGMENT_DEFINITIONS): the packed lamp indices and wall bits need 32-bit ints, which Babylon's include order
 *  gives today only by chance. */
export const LAMP_GLSL = `precision highp int;
${LAMP_MATH_GLSL}
uniform highp sampler3D lampVis;
uniform highp sampler2D lampData;
#ifdef LAMP_MOON
uniform highp sampler3D lampMoon;
#endif
#ifdef LAMP_FILL
uniform highp sampler3D lampAmb;
#endif
#ifdef LAMP_SKY
uniform highp sampler3D lampSky;
#endif
vec4 lampTexel(int k) {
  int w = int(lampInfo.x);
  return texelFetch(lampData, ivec2(k - (k / w) * w, k / w), 0);
}
${DOOR_GLSL}
// a baked grid (origin + cell, counts): 1 outside it
float nsGrid(highp sampler3D t, vec3 p, vec4 o, vec4 n) {
  vec3 q = (p - o.xyz) / (o.w * n.xyz);
  if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) return 1.0;
  return texture(t, q).r;
}
${NS_GRID2_GLSL}
${LAMP_CAPSULE_GLSL}`;

/**
 * (LR16 fix, torch parity) Babylon's spot lights - the shadow-mapped flashlights and any flashlight in the light rig's
 * pool, plain or clustered - take the game's feathered cone, not Babylon's hard cut. The plugin swaps Babylon's PBR
 * spot-cone calls (`computeDirectionalLightFalloff[_Standard](light*.vLightDirection.xyz,preInfo.L,` in
 * `lightFragment` and `pbrClusteredLightingFunctions`; Babylon 9.29, guarded by `tests/lampTorchCone.test.ts`) for
 * `nsSpotFalloff[_Standard]`, which run `nsLampCone` (`LAMP_MATH_GLSL`: cos^exp x the smoothstep feather, as
 * `lampMath.lampCone`) with the light's own cut (`vLightDirection.w` = the cone's cos outer) and exponent
 * (`vLightData.w` = `SPOT_EXP`). Babylon's standard range falloff is the meter's linear `lampFalloff`: the spot's
 * diffuse = the meter's `lampTerm` x N.L. PBR materials only (Babylon's falloff functions are PBR's).
 */
export const SPOT_FALLOFF_CALL = '!computeDirectionalLightFalloff(|_Standard)\\((light\\w*\\.vLightDirection\\.xyz,preInfo\\.L,)';
export const SPOT_FALLOFF_SWAP = 'nsSpotFalloff$1($2';
export const SPOT_FALLOFF_GLSL = `
float nsSpotFalloff_Standard(vec3 ld, vec3 l, float cut, float e) {
#ifdef BAKED_LAMPS
  return nsLampCone(dot(-ld, l), cut, e);
#else
  return computeDirectionalLightFalloff_Standard(ld, l, cut, e);
#endif
}
float nsSpotFalloff(vec3 ld, vec3 l, float cut, float e, float s, float o) {
#if defined(BAKED_LAMPS) && !defined(USEPHYSICALLIGHTFALLOFF) && !defined(USEGLTFLIGHTFALLOFF)
  return nsLampCone(dot(-ld, l), cut, e);
#else
  return computeDirectionalLightFalloff(ld, l, cut, e, s, o);
#endif
}`;
/**
 * The same on a standard material (the editor's light view, plain lights only): its spot is Babylon's cos^exp cut at
 * the cone, so the light's colour takes the feather's smoothstep alone (`nsLampCone / cos^exp`). Inside the plugin's
 * `CUSTOM_LIGHT` hook, `X`: the light's index.
 */
export const spotFeatherStd = (x: string): string => `#ifdef SPOTLIGHT${x}
{
  float nsCa = dot(light${x}.vLightDirection.xyz, normalize(vPositionW - light${x}.vLightData.xyz));
  float nsCp = pow(max(nsCa, 1e-4), light${x}.vLightData.w);
  diffuse${x}.rgb *= nsCp > 0.0 ? nsLampCone(nsCa, light${x}.vLightDirection.w, light${x}.vLightData.w) / nsCp : 0.0;
}
#endif`;

/**
 * Baked lamp light on a PBR material (3.2): for the lamps listed in the pixel's 2 m column, the lamp's diffuse light
 * (photometric falloff, cone, N.L: `LAMP_MATH_GLSL`) x its baked visibility at a point a cell off the surface
 * x the characters' capsule shadows; added to the material's diffuse.
 */
/** The lamp volume mix's defines (LR15 door slots, lr-tex3d atlas pages). */
function mixDefines(l: BakedLamps): string[] | null {
  const d: string[] = [];
  if (l.doorSlots > DOORS_PER_LAMP) d.push('#define LAMP_DOORS8');
  if (l.atlasPages > 1) d.push('#define LAMP_PAGES');
  return d.length ? d : null;
}

export class LampPlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private lamps: BakedLamps,
  ) {
    super(material, 'BakedLamps', 250, { BAKED_LAMPS: false, LAMP_VOLUME: false, LAMP_MOON: false, LAMP_FILL: false, LAMP_LEVEL: false, LAMP_SKY: false, LAMP_CSHADOW: false, LAMP_DOORS8: false, LAMP_TORCH: false, LAMP_TSHADOW: false, LAMP_PAGES: false, LAMP_TORCH8: false, LAMP_TORCH12: false, LAMP_TORCH16: false, LAMP_TORCHCUT: false });
    // (coop-fix) a clone must not carry it: Babylon rebuilds a cloned plugin by class name (`Tools.Instantiate`), which
    // fails for this unregistered class and aborted every figure loaded after the attach (the joiner's partner); the
    // clone is a new material, so `BakedLamps.frame` gives it its own plugin
    this.doNotSerialize = true;
    this._enable(true);
  }

  /** On a standard material (the editor's light view): the light goes into `diffuseBase`. (Read from the material, not a
   *  field: Babylon collects the injection points inside the base constructor, before a field could be set.) */
  private get std(): boolean {
    return this._material.getClassName() === 'StandardMaterial';
  }

  /** (piano SO3) The map's drawn torch slots and reach-cut branch (the defaults while Babylon's base constructor asks
   *  for the code points, before `lamps` is set). */
  private get nTorch(): number {
    return (this.lamps as BakedLamps | undefined)?.torchSlots ?? TORCH_DRAW_SLOTS;
  }
  private get cutTorch(): boolean {
    return (this.lamps as BakedLamps | undefined)?.torchCut ?? false;
  }

  override getClassName(): string {
    return 'LampPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.BAKED_LAMPS = !!mesh;
    defines.LAMP_VOLUME = !!mesh && !!this.lamps.volume;
    // (only a texture that exists: an unbound sampler3D falls on a 2D texture's unit, a draw error)
    defines.LAMP_MOON = !!mesh && !!this.lamps.moonTex;
    defines.LAMP_FILL = !!mesh && !!this.lamps.fillTex;
    // (smooth-world) the level's material: no body fill cap under night vision
    defines.LAMP_LEVEL = !!mesh && isLampLevel(this._material);
    // (fix round 2) the level's fill and image-based light by sky visibility, as the voxel walls
    defines.LAMP_SKY = !!mesh && isLampLevel(this._material) && !!this.lamps.level && !!this.lamps.skyTex;
    // (LR14) the character shadow atlas: one texture more while it is on (the per-lamp loop only)
    defines.LAMP_CSHADOW = !!mesh && !this.lamps.volume && !!this.lamps.charShadows?.on;
    // (LR15) 8 door slots per lamp (the shadow-accuracy fixes): the second door texel
    defines.LAMP_DOORS8 = !!mesh && this.lamps.doorSlots > DOORS_PER_LAMP;
    // (LR15) the unshadowed flashlights drawn here (the per-lamp loop on PBR materials only)
    defines.LAMP_TORCH = !!mesh && !this.lamps.volume && !!this.lamps.torchDraw && !this.std;
    // (LR16t) every drawn torch shadowed from one atlas (one texture more; the light rig's spot shadows go: net -1)
    defines.LAMP_TSHADOW = !!mesh && !this.lamps.volume && !!this.lamps.torchDraw && !this.std && !!this.lamps.torchShadows?.on;
    // (piano SO3) the map's torch slot count and the reach-cut branch: their own shader variants (the uniforms' sizes and
    // the loop differ; Babylon caches an effect by its defines)
    const nT = this.lamps.torchSlots;
    defines.LAMP_TORCH8 = !!mesh && nT === 8;
    defines.LAMP_TORCH12 = !!mesh && nT === 12;
    defines.LAMP_TORCH16 = !!mesh && nT === 16;
    defines.LAMP_TORCHCUT = !!mesh && this.lamps.torchCut;
    // (lr-tex3d) a paged lamp atlas: each lamp's page offset from its t7.y
    defines.LAMP_PAGES = !!mesh && this.lamps.atlasPages > 1;
  }

  override getSamplers(samplers: string[]): void {
    samplers.push('lampVis', 'lampData', 'lampVolA', 'lampVolB', 'lampMoon', 'lampAmb', 'lampSky', 'lampCsAtlas', 'lampTsAtlas');
  }

  override getUniforms(): { ubo?: { name: string; size: number; type: string; arraySize?: number }[]; fragment?: string } {
    const nT = this.nTorch;
    return {
      ubo: [
        { name: 'lampInfo', size: 4, type: 'vec4' },
        { name: 'lampGridO', size: 4, type: 'vec4' },
        { name: 'lampAtlas', size: 4, type: 'vec4' },
        { name: 'lampVolO', size: 4, type: 'vec4' },
        { name: 'lampVolD', size: 4, type: 'vec4' },
        { name: 'lampCaps', size: 4, type: 'vec4', arraySize: VOL_CAPS * 2 },
        { name: 'lampMore', size: 4, type: 'vec4' },
        { name: 'lampMoonO', size: 4, type: 'vec4' },
        { name: 'lampMoonN', size: 4, type: 'vec4' },
        { name: 'lampAmbO', size: 4, type: 'vec4' },
        { name: 'lampAmbN', size: 4, type: 'vec4' },
        { name: 'lampFillC', size: 4, type: 'vec4' },
        { name: 'lampBounceC', size: 4, type: 'vec4' },
        { name: 'lampDark', size: 4, type: 'vec4' },
        { name: 'lampDarkP', size: 4, type: 'vec4' },
        { name: 'lampSkyO', size: 4, type: 'vec4' },
        { name: 'lampSkyN', size: 4, type: 'vec4' },
        { name: 'lampLvlSky', size: 4, type: 'vec4' },
        { name: 'lampLvlGnd', size: 4, type: 'vec4' },
        // (LR14) the character shadow slots: view-projections, params, atlas info
        { name: 'lampCsM', size: 4, type: 'vec4', arraySize: 16 },
        { name: 'lampCsP', size: 4, type: 'vec4', arraySize: 4 },
        { name: 'lampCsI', size: 4, type: 'vec4' },
        // (LR15) the drawn flashlights (`TORCH_DRAW_GLSL`)
        { name: 'lampTorch', size: 4, type: 'vec4', arraySize: nT * TORCH_VEC4 },
        // (LR16t) the torch shadow atlas: per slot its view-projection, params, the atlas info (`torchShadows.ts`)
        { name: 'lampTsM', size: 4, type: 'vec4', arraySize: nT * 4 },
        { name: 'lampTsP', size: 4, type: 'vec4', arraySize: nT },
        { name: 'lampTsI', size: 4, type: 'vec4' },
      ],
      fragment: `#ifdef BAKED_LAMPS\nuniform vec4 lampInfo;\nuniform vec4 lampGridO;\nuniform vec4 lampAtlas;\nuniform vec4 lampVolO;\nuniform vec4 lampVolD;\nuniform vec4 lampCaps[${VOL_CAPS * 2}];\nuniform vec4 lampMore;\nuniform vec4 lampMoonO;\nuniform vec4 lampMoonN;\nuniform vec4 lampAmbO;\nuniform vec4 lampAmbN;\nuniform vec4 lampFillC;\nuniform vec4 lampBounceC;\nuniform vec4 lampDark;\nuniform vec4 lampDarkP;\nuniform vec4 lampSkyO;\nuniform vec4 lampSkyN;\nuniform vec4 lampLvlSky;\nuniform vec4 lampLvlGnd;\nuniform vec4 lampCsM[16];\nuniform vec4 lampCsP[4];\nuniform vec4 lampCsI;\nuniform vec4 lampTorch[${nT * TORCH_VEC4}];\nuniform vec4 lampTsM[${nT * 4}];\nuniform vec4 lampTsP[${nT}];\nuniform vec4 lampTsI;\n#endif`,
    };
  }

  override bindForSubMesh(ubo: UniformBuffer, _scene: Scene, _engine: unknown, _subMesh: SubMesh): void {
    const l = this.lamps;
    const v = l.volume;
    // (3.6) the baked moon, on both paths; the ambient-grid fill
    const m = l.moon;
    const f = l.fill;
    ubo.updateFloat4('lampMore', l.doorBase, m && l.moonTex ? 1 : 0, f && l.fillTex ? 1 : 0, LEVEL_TO_RENDER);
    // (Step 4b) the darkness curve: night-vision gain, the moon's level; the look's curve. (nv-pass slice 1) Under the
    // goggles the curve's floor rises (`visionDark`) and the non-voxel fill is capped (z: how far night vision is on)
    ubo.updateFloat4('lampDark', l.visionGain, l.moonLight, visionAmount(l.visionGain), 0);
    const d = visionDark(l.dark, l.visionGain, l.darkNow);
    ubo.updateFloat4('lampDarkP', d.centre, d.steep, d.floor, d.top);
    if (f && l.fillTex) {
      ubo.updateFloat4('lampAmbO', f.grid.origin[0], f.grid.origin[1], f.grid.origin[2], AMBIENT_CELL);
      ubo.updateFloat4('lampAmbN', f.grid.n[0], f.grid.n[1], f.grid.n[2], 0);
      ubo.updateFloat4('lampFillC', f.color[0], f.color[1], f.color[2], 0);
      ubo.updateFloat4('lampBounceC', l.bounceC[0], l.bounceC[1], l.bounceC[2], 0);
      ubo.setTexture('lampAmb', l.fillTex);
    }
    const lv = l.level;
    if (lv?.vis && l.skyTex) {
      ubo.updateFloat4('lampSkyO', lv.vis.origin[0], lv.vis.origin[1], lv.vis.origin[2], lv.vis.cell);
      ubo.updateFloat4('lampSkyN', lv.vis.n[0], lv.vis.n[1], lv.vis.n[2], 0);
      ubo.updateFloat4('lampLvlSky', lv.sky[0], lv.sky[1], lv.sky[2], 0);
      ubo.updateFloat4('lampLvlGnd', lv.ground[0], lv.ground[1], lv.ground[2], 0);
      ubo.setTexture('lampSky', l.skyTex);
    }
    if (m && l.moonTex) {
      ubo.updateFloat4('lampMoonO', m.origin[0], m.origin[1], m.origin[2], m.cell);
      ubo.updateFloat4('lampMoonN', m.n[0], m.n[1], m.n[2], 0);
      ubo.setTexture('lampMoon', l.moonTex);
    }
    if (v) {
      const g = v.grid;
      ubo.updateFloat4('lampVolO', g.o[0], g.o[1], g.o[2], g.cell);
      ubo.updateFloat4('lampVolD', g.dims[0], g.dims[1], g.dims[2], LAMP_VOL_MAX);
      ubo.updateFloatArray('lampCaps', l.volCaps);
      ubo.setTexture('lampVolA', v.a);
      ubo.setTexture('lampVolB', v.b);
      return;
    }
    const g = l.gridInfo;
    ubo.updateFloat4('lampInfo', l.width, g.cols, g.rows, l.lampBase);
    ubo.updateFloat4('lampGridO', g.lox, g.loz, LAMP_GRID, l.capBase);
    ubo.updateFloat4('lampAtlas', l.atlasDims[0], l.atlasDims[1], l.atlasDims[2], LAMP_CELL);
    if (l.vis) ubo.setTexture('lampVis', l.vis);
    if (l.data) ubo.setTexture('lampData', l.data);
    // (LR14) the character shadow slots
    const cs = l.charShadows;
    if (cs?.on && cs.atlas) {
      ubo.updateFloatArray('lampCsM', cs.mats);
      ubo.updateFloatArray('lampCsP', cs.params);
      ubo.updateFloat4('lampCsI', cs.info[0]!, cs.info[1]!, cs.info[2]!, cs.info[3]!);
      ubo.setTexture('lampCsAtlas', cs.atlas);
    }
    // (LR15) the drawn flashlights
    if (l.torchDraw) ubo.updateFloatArray('lampTorch', l.torchDraw);
    // (LR16t) their shadow atlas
    const ts = l.torchShadows;
    if (ts?.on && ts.atlas) {
      ubo.updateFloatArray('lampTsM', ts.mats);
      ubo.updateFloatArray('lampTsP', ts.params);
      ubo.updateFloat4('lampTsI', ts.info[0]!, ts.info[1]!, ts.info[2]!, ts.info[3]!);
      ubo.setTexture('lampTsAtlas', ts.atlas);
    }
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    // Step 4b: the darkness curve. Each light's diffuse is told apart as it is summed: the moon (static), the
    // hemisphere (replaced by the ambient grid where the grid is the fill) and the rest - flashlights and other moving
    // lights, added after the curve unchanged.
    const settle = `if (nsKind > 0.5) {
  vec3 nsD = diffuseBase - nsSnap;
  if (nsKind < 1.5) nsDyn += nsD;
  else nsHemi += nsD;
}
nsKind = 0.0;`;
    // the curve's input: the gameplay level here - fill, moon, lamps (as `LightField` sums them; no N.L)
    // (LR16-1) the fill texture's G: the lit lamps' bounce, the field's own bytes, on the curve's level and on every
    // lit material below
    const level = (lamps: string): string => `#ifdef LAMP_FILL
vec2 nsAmbB = nsGrid2(lampAmb, vPositionW + normalize(vNormalW) * 0.25, lampAmbO, lampAmbN);
float nsFillL = nsAmbB.r;
float nsBounce = nsAmbB.g;
#else
float nsFillL = 0.0;
float nsBounce = 0.0;
#endif
float nsS = nsFillL + nsBounce + lampDark.y * nsMoon + max(${lamps}.r, max(${lamps}.g, ${lamps}.b)) / lampMore.w;
// (a degenerate normal must not light a surface: a NaN level counts as none)
if (!(nsS >= 0.0)) nsS = 0.0;
float nsR = nsDarkRatio(nsS, lampDark.x, lampDarkP);`;
    const code: { [pointName: string]: string } = {
      CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef BAKED_LAMPS
${LAMP_GLSL}
${CHAR_SHADOW_GLSL}
${DARK_GLSL}
#ifdef LAMP_TORCH
${torchDrawGlsl(this.nTorch, this.cutTorch)}
#endif
#ifdef LAMP_VOLUME
uniform highp sampler3D lampVolA;
uniform highp sampler3D lampVolB;
// 3.3 volume mode: the lamps pre-mixed - their light and the direction it comes from, two taps (gn: the geometric normal,
// n: the shading normal)
// (Step 4b: also the light without N.L or shadows, \`nsVolRaw\`: the darkness curve's lamp term)
vec3 nsVolRaw = vec3(0.0);
vec3 nsVolume(vec3 lp, vec3 gn, vec3 n) {
  vec3 q = (lp + gn * lampVolO.w - lampVolO.xyz) / (lampVolO.w * lampVolD.xyz);
  if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) return vec3(0.0);
  vec4 la = texture(lampVolA, q);
  if (la.r + la.g + la.b <= 0.002) return vec3(0.0);
  nsVolRaw = la.rgb * la.rgb * lampVolD.w;
  vec4 lb = texture(lampVolB, q);
  vec3 ld = lb.rgb * 2.0 - 1.0;
  float dl = length(ld);
  ld = dl > 1e-3 ? ld / dl : vec3(0.0, 1.0, 0.0);
  float nd = dot(n, ld);
  // one lamp: N.L; light from every side: wrapped
  float k = mix(0.5 + 0.5 * nd, max(nd, 0.0), lb.a);
  // the nearest characters shade it, along the light's direction
  vec3 lpos = lp + ld * 3.0;
  for (int c = 0; c < ${VOL_CAPS}; c++) {
    vec4 ca4 = lampCaps[c * 2];
    if (ca4.w <= 0.0) break;
    k *= mix(1.0, lampCapsule(lp, lpos, ca4.xyz, lampCaps[c * 2 + 1].xyz, ca4.w), lb.a);
  }
  return la.rgb * la.rgb * lampVolD.w * k;
}
#endif
#endif`,
      // 3.6: the baked moon - the sun light (the one directional light) x the moon's visibility a little off the
      // surface; its cascades hold only moving casters (\`World\`)
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
#ifdef BAKED_LAMPS
#ifdef LAMP_MOON
float nsMoon = nsGrid(lampMoon, vPositionW + normalize(vNormalW) * lampMoonO.w * 0.5, lampMoonO, lampMoonN);
#else
float nsMoon = 1.0;
#endif
vec3 nsDyn = vec3(0.0);
vec3 nsHemi = vec3(0.0);
vec3 nsSnap = vec3(0.0);
float nsKind = 0.0;
#endif`,
      '!#define CUSTOM_LIGHT(\\d+)_COLOR': `#ifdef BAKED_LAMPS
${settle}
nsSnap = diffuseBase;
#if defined(DIRLIGHT$1)
diffuse$1.rgb *= nsMoon;
#elif defined(HEMILIGHT$1)
nsKind = 2.0;
#else
nsKind = 1.0;
${this.std ? spotFeatherStd('$1') : ''}
#endif
#endif
#define CUSTOM_LIGHT$1_COLOR`,
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `
#ifdef BAKED_LAMPS
${settle}
{
  vec3 nsAlb = surfaceAlbedo.rgb * vLightingIntensity.x;
  vec3 nsDynD = nsDyn * nsAlb;
  // the static light so far: the moon (and the voxels' own fill and bounce); the hemisphere goes where the grid fills
  vec3 nsStat = finalDiffuse - nsDynD;
#if defined(LAMP_FILL)
  nsStat -= nsHemi * nsAlb;
#endif
#ifdef LAMP_VOLUME
  nsStat += nsVolume(vPositionW, normalize(vNormalW), normalW) * surfaceAlbedo.rgb;
  vec3 nsLampRaw = nsVolRaw;
#else
  vec3 lp = vPositionW;
  vec3 lgn = normalize(vNormalW);
  vec2 gq = floor((lp.xz - lampGridO.xy) / lampGridO.z);
  vec3 lsum = vec3(0.0);
  vec3 nsLampRaw = vec3(0.0);
  if (gq.x >= 0.0 && gq.y >= 0.0 && gq.x < lampInfo.y && gq.y < lampInfo.z) {
    int gk = (int(gq.y) * int(lampInfo.y) + int(gq.x)) * ${LAMP_GRID_TEXELS};
    vec4 ga = vec4(0.0);
    for (int s = 0; s < ${LAMP_GRID_SLOTS}; s++) {
      int sl = s - (s / 4) * 4;
      if (sl == 0) ga = lampTexel(gk + s / 4);
      float fid = ga[sl];
      if (fid < 0.5) break;
      int lb = int(lampInfo.w) + (int(fid + 0.5) - 1) * ${LAMP_TEXELS};
      vec4 t1 = lampTexel(lb + 1);
      if (t1.r + t1.g + t1.b <= 0.0) continue;
      vec4 t0 = lampTexel(lb);
      vec3 L = t0.xyz - lp;
      float d = length(L);
      if (d >= t0.w) continue;
      L /= max(d, 1e-4);
      vec4 t2 = lampTexel(lb + 2);
      float ca = dot(-L, t2.xyz);
      if (ca < t2.w) continue;
      float k = nsLampFalloff(d, t0.w) * nsLampCone(ca, t2.w, t1.w);
      vec4 t3 = lampTexel(lb + 3);
      vec4 t4 = lampTexel(lb + 4);
      vec3 dq = lp + lgn * lampAtlas.w;
      vec3 q = clamp((dq - t3.xyz) / lampAtlas.w, vec3(0.5), vec3(t4.z, t3.w, t4.w) - 0.5);
#ifdef LAMP_PAGES
      k *= texture(lampVis, (q + vec3(t4.x, lampTexel(lb + 7).y, t4.y)) / lampAtlas.xyz).r;
#else
      k *= texture(lampVis, (q + vec3(t4.x, 0.0, t4.y)) / lampAtlas.xyz).r;
#endif
      if (k <= 0.0) continue;
      // (3.6) closed doors near the lamp, tested from the same point as the visibility
      vec4 t6 = lampTexel(lb + 6);
      for (int c = 0; c < ${DOORS_PER_LAMP}; c++) {
        float did = t6[c];
        if (did < 0.5) break;
        int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
        if (nsDoorBlocks(t0.xyz, dq, lampTexel(db), lampTexel(db + 1))) {
          k = 0.0;
          break;
        }
      }
#ifdef LAMP_DOORS8
      // (LR15) doors 5-8: the lamp's second door texel, after the capsules (lamp order)
      if (k > 0.0 && t6.w > 0.5) {
        vec4 t8 = lampTexel(int(lampGridO.w) + ${MAX_CAPSULES * 2} + int(fid + 0.5) - 1);
        for (int c = 0; c < 4; c++) {
          float did = t8[c];
          if (did < 0.5) break;
          int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
          if (nsDoorBlocks(t0.xyz, dq, lampTexel(db), lampTexel(db + 1))) {
            k = 0.0;
            break;
          }
        }
      }
#endif
      if (k <= 0.0) continue;
      // (Step 4b: the curve's lamp term, as gameplay sums it: no N.L, no character shadows)
      nsLampRaw += t1.rgb * k;
      float ndl = dot(normalW, L);
      if (ndl <= 0.0) continue;
      k *= ndl;
#ifdef LAMP_CSHADOW
      // (LR14) the nearest lamps' character silhouettes from the shadow atlas (t7.x: slot + 1)
      float csl = lampTexel(lb + 7).x;
      if (csl > 0.5) k *= nsCharShadow(int(csl - 0.5), lp, lgn, t0.xyz);
#endif
      vec4 t5 = lampTexel(lb + 5);
      for (int c = 0; c < ${CAPS_PER_LAMP}; c++) {
        float cid = t5[c];
        if (cid < 0.5) break;
        int cb = int(lampGridO.w) + (int(cid + 0.5) - 1) * 2;
        vec4 ca4 = lampTexel(cb);
        vec4 cb4 = lampTexel(cb + 1);
        k *= lampCapsule(lp, t0.xyz, ca4.xyz, cb4.xyz, ca4.w);
      }
      lsum += t1.rgb * k;
    }
  }
  nsStat += lsum * surfaceAlbedo.rgb;
#endif
${level('nsLampRaw')}
#if defined(LAMP_FILL)
  // (nv-pass slice 1) under night vision the flat fill (and the probe's diffuse) is capped and hemisphere-shaded, so a
  // body sits at the walls' brightness instead of glowing (\`bodyFillScale\`; the lamps on it are untouched). The level's
  // own material (smooth-world, \`LAMP_LEVEL\`) keeps its whole fill, as the voxel walls do.
#ifdef LAMP_LEVEL
  float nsBF = 1.0;
#else
  float nsBF = nsBodyFill(lampDark.z, normalW.y);
#endif
#ifdef LAMP_SKY
  // (smooth-world fix round 2) the level's own boxes take the voxel walls' fill: the hemisphere's colours by the normal x
  // how much sky the spot sees (world/levelFill.ts), not the flat gameplay grid (which oversold the walls' light)
  float nsVis = nsGrid(lampSky, vPositionW + normalize(vNormalW) * lampSkyO.w * ${LF.offset}, lampSkyO, lampSkyN);
  float nsEnv = ${LF.envFloor} + ${LF.envOpen} * nsVis;
  nsStat += mix(lampLvlGnd.rgb, lampLvlSky.rgb, normalW.y * 0.5 + 0.5) * (${LF.floor} + ${LF.open} * nsVis) * surfaceAlbedo.rgb;
#else
  float nsEnv = 1.0;
  nsStat += nsFillL * lampMore.w * lampFillC.rgb * surfaceAlbedo.rgb * nsBF;
#endif
#else
  float nsBF = 1.0;
  float nsEnv = 1.0;
#endif
#ifdef LAMP_FILL
  // (LR16-1) the one-bounce fill on every lit material (the level, its sky-filled boxes, the voxels, bodies and props;
  // bodies and props under night vision x the body fill cap, as their flat fill)
  nsStat += nsBounce * lampMore.w * lampBounceC.rgb * surfaceAlbedo.rgb * nsBF;
#endif
#ifdef LAMP_TORCH
  // (LR15) the flashlights without a shadow map, drawn as the light field sums them x their beam's cut; like Babylon's
  // lights they join after the darkness curve. (lrpolish) x directIntensity / PI, as Babylon's lights scaled them: 1 on
  // the game's PI-intensity materials, 1 / PI on the levelBuilder glass (directIntensity 1)
  nsDynD += nsTorches(vPositionW, normalW, normalize(vNormalW)) * surfaceAlbedo.rgb * (vLightingIntensity.x * ${(1 / Math.PI).toFixed(7)});
#endif
  finalDiffuse = max(nsStat, vec3(0.0)) * nsR + nsDynD;
  finalAmbient *= nsR;
#ifdef REFLECTION
  finalIrradiance *= nsR * nsBF * nsEnv;
  finalRadianceScaled *= nsR * nsEnv;
#endif
}
#endif`,
    };
    if (!this.std) {
      // (LR16 fix) Babylon's spot lights (the shadow-mapped and pooled flashlights) take the game's feathered cone
      code['CUSTOM_FRAGMENT_DEFINITIONS'] += SPOT_FALLOFF_GLSL;
      code[SPOT_FALLOFF_CALL] = SPOT_FALLOFF_SWAP;
      return code;
    }
    // the standard materials (the editor's light view): the volume and the ambient-grid fill join the lights' diffuse sum
    // (the material's colour and albedo multiply it after), and the curve scales the static part
    delete code['CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION'];
    code['!vec3 emissiveColor=vEmissiveColor;'] = `#ifdef BAKED_LAMPS
${settle}
{
  vec3 nsStat = diffuseBase - nsDyn - nsHemi;
#ifdef LAMP_VOLUME
  nsStat += nsVolume(vPositionW, normalize(vNormalW), normalW);
  vec3 nsLampRaw = nsVolRaw;
#else
  vec3 nsLampRaw = vec3(0.0);
#endif
${level('nsLampRaw')}
#ifdef LAMP_FILL
  nsStat += nsFillL * lampMore.w * lampFillC.rgb;
  // (LR16-1) the one-bounce fill
  nsStat += nsBounce * lampMore.w * lampBounceC.rgb;
#endif
  diffuseBase = max(nsStat, vec3(0.0)) * nsR + nsDyn;
}
#endif
vec3 emissiveColor=vEmissiveColor;`;
    // night vision blows out in light (bible L7): the standard material clamps the light before the surface colour, so
    // a lit wall would stop at its own colour - the light over twice full joins the colour, faded in with the gain
    code['CUSTOM_FRAGMENT_BEFORE_FOG'] = `#ifdef BAKED_LAMPS
if (lampDark.x > 1.0) color.rgb += vec3(max(dot(diffuseBase * diffuseColor, vec3(0.3, 0.59, 0.11)) - 2.0, 0.0) * 0.2 * min((lampDark.x - 1.0) / ${(VISION_GAIN - 1).toFixed(1)}, 1.0));
#endif`;
    return code;
  }
}

/** Free a texture's CPU copy once uploaded (the bake's pools are large). */
function dropCpuCopy(t: { getInternalTexture(): unknown } | null): void {
  const it = t?.getInternalTexture() as { _bufferView?: unknown } | null | undefined;
  if (it) it._bufferView = null;
}
