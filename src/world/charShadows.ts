/**
 * (LR14, sector-redesign charshadow) Character silhouette shadows from the lamps nearest the player, as in CT: the
 * picked lamps (`LampSlotPicker`, up to 4) each get a real-time shadow map of the characters in their reach - players,
 * guards, bodies, held weapons - drawn by Babylon's own shadow generator (skinning, instances and morphs included),
 * then copied texel for texel into its tile of ONE shared atlas, so a lit shader takes one texture for all of them.
 * Static geometry stays in the baked visibility atlas; every other lamp keeps the capsule shadows.
 *
 * Rendering only: the light meter and guard perception read the light field, which has no character shadow.
 * Each slot's spot light is kept off every mesh (`includeOnlyWithLayerMask`), so it adds no light and no sampler: it
 * only drives its shadow map. Per frame nothing is allocated (render lists and uniforms refilled in place).
 */
import { BaseTexture, Constants, EffectRenderer, EffectWrapper, ShadowGenerator, SpotLight, Texture, Vector3, Viewport, type AbstractMesh, type Observer, type RenderTargetWrapper, type Scene } from '../core/babylon';
import { frozenCasterSphere, thawed } from './frozenCaster';
import { atlasSize, CHAR_SHADOW, CHAR_SHADOW_DISK, CHAR_SHADOW_KERNEL, charShadowEvery, charShadowTaps, casterInReach, coneCovers, doorSphere, FIT, fitCone, fittedSpheres, LampSlotPicker, spheresHold, tileX, tileY } from './charShadowSet';

type RenderTargetTexture = NonNullable<ReturnType<ShadowGenerator['getShadowMap']>>;

/** A layer bit no mesh carries: the slots' lights reach no mesh (no light, no sampler, no recompiles). (lrpolish: its own
 *  bit, not `world.ts` PROXY_LAYER 0x10000000, so the spots do not "affect" the shadow proxies either.) */
const NO_MESH_LAYER = 0x20000000;
/** Caster spheres a slot's cone fit reads (the rest still draw into the map). */
const MAX_SPHERES = 256;

/** What the baked lamps read (`BakedLamps.charShadows`). */
export interface CharShadowLink {
  /** Maps on (the plugin's `LAMP_CSHADOW`). */
  readonly on: boolean;
  /** Per baked lamp: the slot whose atlas tile holds its map this frame, or -1 (capsules). */
  readonly lampSlot: Int8Array;
  /** True when slot `s`'s map holds a character at (x, y, z) (its capsule is dropped for that lamp). */
  covers(s: number, x: number, y: number, z: number): boolean;
  /** Uniforms: per slot its view-projection (4 x vec4), its params (min z, min + max z, bias, valid), the atlas info
   *  (tile px, (LR16f) filter taps, atlas px, depth sign). */
  readonly mats: Float32Array;
  readonly params: Float32Array;
  readonly info: Float32Array;
  readonly atlas: BaseTexture | null;
}

/** The baked lamps' side `CharShadows` reads: per lamp x, y, z, radius, and whether it gives light now. */
export interface CharShadowLamps {
  readonly count: number;
  /** x, y, z, radius per lamp (stride 4). (LR16-P F2) The baked lamps' radius is the shadow reach (`charShadowReach`):
   *  the picker, the casters and the doors and props a slot draws stay within it. */
  readonly spheres: Float32Array;
  /** (LR16-P F2) Per lamp its light's reach: the slot map's far plane, so every point the lamp lights stays inside the
   *  map's depth range (a receiver past the far plane would read the cleared map as a blocker). Absent: the radius. */
  readonly lightReach?: Float32Array;
  lampLit(i: number): boolean;
  /** (LR16-5b) Per lamp: non-zero while it swings (it keeps its slot and its map is re-rendered every frame). */
  readonly moving?: Uint8Array;
}

/** (LR16-3) The door registry's side `CharShadows` reads (`Doors`): the leaves' one thin-instanced mesh and each door. */
export interface CharShadowDoors {
  readonly leafMesh: AbstractMesh | null;
  readonly list: readonly { open: number; ajar: number; anchor: { hinge: { x: number; y: number; z: number }; width: number; height: number } }[];
}

/** (LR16-3) The prop registry's side (`PropSystem`): each live prop's node position and its part meshes. */
export interface CharShadowProps {
  readonly props: readonly { alive: boolean; node: { position: { x: number; y: number; z: number } }; parts: readonly AbstractMesh[] }[];
}

/** (LR16-3) Bounding radius (m) of the biggest prop (a 1 m crate's half diagonal, rounded up). */
const PROP_REACH = 0.9;

interface CsSlot {
  light: SpotLight;
  sg: ShadowGenerator;
  map: RenderTargetTexture;
  /** The casters this frame (the map's custom render list, refilled in place). */
  list: AbstractMesh[];
  /** (guard-render S10b) Of them, the character casters the guard freeze had disabled at the gather. */
  frozen: AbstractMesh[];
  /** The lamp placed now (-1 idle) and the lamp whose map is in the atlas tile (-1: none yet). */
  lamp: number;
  ready: number;
  /** The fit placed now and the fit of the map in the tile. */
  fit: Float32Array;
  fitReady: Float32Array;
  /** The casters' spheres this frame's fit read (x, y, z, r; `k` of them), and (lrpolish) the fitted ones of the map in
   *  the tile (`kReady`): `covers` drops a capsule only for a caster the copied map was fitted around. */
  sp: Float32Array;
  k: number;
  spReady: Float32Array;
  kReady: number;
  /** Frames between refreshes (0: not rendering). */
  every: number;
  obs: Observer<RenderTargetTexture> | null;
  vp: Viewport;
}

/** The copy (GLSL): a shadow map into its tile, texel for texel. It reads `gl_FragCoord` only, never the default vertex
 *  shader's `vUV` (`copy()` skips the wrapper's `scale` uniform, which feeds only `vUV`; a test holds this). */
export const COPY_GLSL = `
precision highp float;
uniform highp sampler2D csSrc;
uniform vec2 csOrg;
void main(void) {
  gl_FragColor = vec4(texelFetch(csSrc, ivec2(gl_FragCoord.xy - csOrg), 0).r, 0.0, 0.0, 1.0);
}`;

/** The kernel as a GLSL array literal (fixed: the same taps every frame). */
const DISK_GLSL = Array.from({ length: CHAR_SHADOW_KERNEL }, (_, i) => `vec2(${CHAR_SHADOW_DISK[i * 2]!.toFixed(4)}, ${CHAR_SHADOW_DISK[i * 2 + 1]!.toFixed(4)})`).join(', ');
const F = (v: number): string => v.toFixed(4);

/**
 * The lamp loop's test (GLSL, `LAMP_CSHADOW`): a point lit by lamp `lpos` against slot `s`'s map in the atlas -
 * normal offset, Babylon's shadow metric from the snapshotted view-projection - then (LR16f) contact-hardening PCF:
 * a blocker search over the first half of the fixed Poisson kernel, sized for the widest penumbra the lamp could give
 * here (blockers at the slot's near plane); none found: lit, after the search taps only. Else the mean blocker depth
 * gives the penumbra (`charPenumbra`: lamp radius x (receiver - blocker) / blocker, capped) and the kernel's first
 * `lampCsI.y` taps (the preset's, `charShadowTaps`) filter over it (`charFilterTexels`). Feet on the floor: gap ~0,
 * the 1-texel floor (sharp); the head's shadow: soft. 1 lit, `floor` in shadow; 1 outside the slot's frustum.
 */
export const CHAR_SHADOW_GLSL = `
#ifdef LAMP_CSHADOW
uniform highp sampler2D lampCsAtlas;
const vec2 CS_DISK[${CHAR_SHADOW_KERNEL}] = vec2[${CHAR_SHADOW_KERNEL}](${DISK_GLSL});
float nsCharShadow(int s, vec3 p, vec3 gn, vec3 lpos) {
  vec4 P = lampCsP[s];
  if (P.w < 0.5) return 1.0;
  vec3 q = p + gn * (${CHAR_SHADOW.normalOffset.toFixed(4)} + ${CHAR_SHADOW.normalPerM.toFixed(4)} * length(lpos - p));
  mat4 M = mat4(lampCsM[s * 4], lampCsM[s * 4 + 1], lampCsM[s * 4 + 2], lampCsM[s * 4 + 3]);
  vec4 c = M * vec4(q, 1.0);
  if (c.w <= 1e-4) return 1.0;
  vec2 uv = c.xy / c.w;
  if (abs(uv.x) >= 1.0 || abs(uv.y) >= 1.0) return 1.0;
  float z = (lampCsI.w * c.z + P.x) / P.y - P.z;
  if (z <= 0.0) return 1.0;
  float T = lampCsI.x;
  int n = int(lampCsI.y + 0.5);
  int nb = n / 2;
  vec2 org = vec2(float(s - (s / 2) * 2), float(s / 2)) * T;
  vec2 f = (uv * 0.5 + 0.5) * T;
  vec2 hiT = vec2(T - 1.0);
  // (the metric's slope: 1 / (far - near) per metre; c.w: the receiver's depth from the lamp; sx = 1 / tan(half),
  // the length of the view-projection's first row - the view is a rotation)
  float span = max(P.y - 2.0 * P.x, 0.01);
  float dr = c.w;
  float sx = length(vec3(M[0][0], M[1][0], M[2][0]));
  float tpm = 0.5 * T * sx / max(dr, ${F(CHAR_SHADOW.minNear)});
  float nearB = max(P.x, ${F(CHAR_SHADOW.minNear)});
  float sr = clamp(min(${F(CHAR_SHADOW.maxPenumbra)}, ${F(CHAR_SHADOW.lightRadius)} * max(dr - nearB, 0.0) / nearB) * tpm, ${F(CHAR_SHADOW.minTexels)}, ${F(CHAR_SHADOW.maxTexels)});
  float zb = 0.0;
  float nbk = 0.0;
  for (int i = 0; i < ${CHAR_SHADOW_KERNEL / 2}; i++) {
    if (i >= nb) break;
    float d = texelFetch(lampCsAtlas, ivec2(org + clamp(floor(f + CS_DISK[i] * sr), vec2(0.0), hiT)), 0).r;
    if (d < z) {
      zb += d;
      nbk += 1.0;
    }
  }
  if (nbk < 0.5) return 1.0;
  float db = clamp(dr - (z + P.z - zb / nbk) * span, nearB, max(dr, nearB));
  float r = clamp(min(${F(CHAR_SHADOW.maxPenumbra)}, ${F(CHAR_SHADOW.lightRadius)} * (dr - db) / db) * tpm, ${F(CHAR_SHADOW.minTexels)}, ${F(CHAR_SHADOW.maxTexels)});
  float lit = 0.0;
  for (int i = 0; i < ${CHAR_SHADOW_KERNEL}; i++) {
    if (i >= n) break;
    lit += step(z, texelFetch(lampCsAtlas, ivec2(org + clamp(floor(f + CS_DISK[i] * r), vec2(0.0), hiT)), 0).r);
  }
  return mix(${CHAR_SHADOW.floor.toFixed(2)}, 1.0, lit / float(max(n, 1)));
}
#endif
`;

export class CharShadows implements CharShadowLink {
  readonly picker = new LampSlotPicker();
  readonly lampSlot: Int8Array;
  readonly mats = new Float32Array(CHAR_SHADOW.maxSlots * 16);
  readonly params = new Float32Array(CHAR_SHADOW.maxSlots * 4);
  readonly info = new Float32Array(4);
  atlas: BaseTexture | null = null;
  private rt: RenderTargetWrapper | null = null;
  private renderer: EffectRenderer | null = null;
  private wrapper: EffectWrapper | null = null;
  private slots: CsSlot[] = [];
  private readonly lit: Uint8Array;
  private readonly focus = new Float32Array(6);
  /** (lrpolish LR14 polish 1) A lost context comes back with a blank atlas: every slot reads as not ready until it
   *  copies again. */
  private restoreObs: Observer<ReturnType<Scene['getEngine']>> | null = null;
  /** The configured spec (`charLamps:charTile`). */
  private key = '';
  private tile = 0;
  private governorEvery = 1;
  /** (LR16-7) The tier's least refresh interval (`charShadowEvery`: Low / Medium 2). */
  private baseEvery = 1;
  /** (LR16-3) Doors and props whose shapes join a slot's casters when in its lamp's reach (set by `world.ts`). */
  private doors: CharShadowDoors | null = null;
  private dynProps: CharShadowProps | null = null;
  /** Shadow maps copied into the atlas so far (tests, the debug line). */
  copies = 0;
  /** (S10b) A frozen caster's stand-in sphere. */
  private readonly fzSphere = new Float32Array(4);
  /** (S10b) After each camera evaluation (the freeze's verdict): a slot whose listed frozen caster was thawed renders. */
  private thawObs: Observer<Scene> | null = null;
  /** The map's metric with a reversed depth buffer runs the other way. */
  private readonly depthSign: number;

  constructor(
    private scene: Scene,
    private lamps: CharShadowLamps,
    /** The character casters (`World.charCasters`): players, guards, bodies, weapons and gear (LR16-3: doors and props join through `setDynamic`); no level. */
    private casters: readonly AbstractMesh[],
  ) {
    this.lampSlot = new Int8Array(lamps.count).fill(-1);
    this.lit = new Uint8Array(lamps.count);
    this.depthSign = scene.getEngine().useReverseDepthBuffer ? -1 : 1;
  }

  /** (LR16-3) Door leaves (open or moving) and props also cast into the slot maps; render-only, the light field is untouched. */
  setDynamic(doors: CharShadowDoors | null, props: CharShadowProps | null): void {
    this.doors = doors;
    this.dynProps = props;
  }

  get on(): boolean {
    return this.slots.length > 0 && !!this.atlas;
  }

  /** (guard-render S10b) The slots built (the Sector guard freeze reads each). */
  get slotCount(): number {
    return this.slots.length;
  }

  /**
   * (S10b) Slot `s`'s lamp this frame (the picker's, set in `frame`): its x, y, z and how far from it a shadow can land
   * (the map's far plane: the light's reach + 0.5) into `out`; false when the slot holds no lamp (unused). The lamp, not
   * the fitted cone: the cone is fitted round the casters listed. Read only: the freeze treats it as a shadowing light.
   */
  slotLamp(s: number, out: Float32Array): boolean {
    const sl = this.slots[s];
    const lamp = sl ? sl.lamp : -1;
    if (lamp < 0 || lamp >= this.lamps.count) return false;
    const S = this.lamps.spheres;
    out[0] = S[lamp * 4]!;
    out[1] = S[lamp * 4 + 1]!;
    out[2] = S[lamp * 4 + 2]!;
    out[3] = (this.lamps.lightReach?.[lamp] ?? S[lamp * 4 + 3]!) + 0.5;
    return true;
  }

  /** WebGL2 with float or half-float render targets (texelFetch, the metric): else capsules stay. */
  private supported(): boolean {
    const e = this.scene.getEngine();
    const caps = e.getCaps();
    return e.version >= 2 && !e.isWebGPU && (caps.textureFloatRender || caps.textureHalfFloatRender);
  }

  /** The preset's lamps and tile (`ShadowSpec.charLamps` / `charTile`); rebuilds only on a change. */
  configure(lamps: number, tile: number): void {
    const n = this.lamps.count > 0 && tile > 0 && this.supported() ? Math.max(0, Math.min(CHAR_SHADOW.maxSlots, lamps | 0)) : 0;
    const key = `${n}:${tile}`;
    if (key === this.key) return;
    this.disposeSlots();
    this.key = key;
    this.picker.setSlots(n);
    this.lampSlot.fill(-1);
    if (n === 0) return;
    this.tile = tile;
    this.baseEvery = charShadowEvery(n, tile);
    const engine = this.scene.getEngine();
    // (LR16-7: one slot - Low / Medium - the atlas is that one tile)
    const size = atlasSize(tile, n);
    const caps = engine.getCaps();
    this.rt = engine.createRenderTargetTexture(
      { width: size, height: size },
      { generateMipMaps: false, generateDepthBuffer: false, generateStencilBuffer: false, type: caps.textureFloatRender ? Constants.TEXTURETYPE_FLOAT : Constants.TEXTURETYPE_HALF_FLOAT, format: Constants.TEXTUREFORMAT_R, samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE },
    );
    const at = new BaseTexture(this.scene, this.rt.texture);
    at.wrapU = at.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.atlas = at;
    this.renderer = new EffectRenderer(engine);
    this.wrapper = new EffectWrapper({ engine, name: 'charShadowCopy', fragmentShader: COPY_GLSL, uniformNames: ['csOrg'], samplerNames: ['csSrc'] });
    this.info[0] = tile;
    // (LR16f: the shader hard-codes the 2 x 2 tile layout; this lane carries the preset's filter taps)
    this.info[1] = charShadowTaps(n, tile);
    this.info[2] = size;
    this.info[3] = this.depthSign;
    for (let s = 0; s < n; s++) this.slots.push(this.makeSlot(s, tile, size));
    this.restoreObs = engine.onContextRestoredObservable.add(() => this.invalidate());
    this.thawObs = this.scene.onAfterActiveMeshesEvaluationObservable.add(this.onThaw);
  }

  /** (S10b) A guard thawed in this evaluation is in his slots' lists (`gather`): their maps render now, with him. */
  private readonly onThaw = (): void => {
    const slots = this.slots;
    for (let s = 0; s < slots.length; s++) {
      const f = slots[s]!.frozen;
      if (!f.length || !thawed(f)) continue;
      f.length = 0;
      slots[s]!.map.resetRefreshCounter();
    }
  };

  /** Every slot's tile as empty (a restored context's blank atlas): capsules until each map copies again. */
  private invalidate(): void {
    for (let s = 0; s < this.slots.length; s++) {
      this.slots[s]!.ready = -1;
      this.slots[s]!.kReady = 0;
      this.params[s * 4 + 3] = 0;
    }
    this.lampSlot.fill(-1);
  }

  private makeSlot(s: number, tile: number, size: number): CsSlot {
    const light = new SpotLight(`charshadow-${s}`, new Vector3(0, -50, 0), new Vector3(0, -1, 0), 1, 1, this.scene);
    light.includeOnlyWithLayerMask = NO_MESH_LAYER;
    light.intensity = 0;
    light.shadowMinZ = 0.1;
    light.shadowMaxZ = 10;
    // (no filter: the float target holds the depth metric the atlas copies; back faces only - a body's lit side never
    // shades itself)
    const sg = new ShadowGenerator(tile, light, true, undefined, true);
    sg.bias = 0;
    sg.normalBias = 0;
    sg.forceBackFacesOnly = true;
    sg.transparencyShadow = false;
    const map = sg.getShadowMap()!;
    // (an empty list of its own, never filled: the casters come from `getCustomRenderList`)
    map.renderList = [];
    map.refreshRate = 0;
    const slot: CsSlot = { light, sg, map, list: [], frozen: [], lamp: -1, ready: -1, fit: new Float32Array(FIT.size), fitReady: new Float32Array(FIT.size), sp: new Float32Array(MAX_SPHERES * 4), k: 0, spReady: new Float32Array(MAX_SPHERES * 4), kReady: 0, every: 0, obs: null, vp: new Viewport(tileX(s, tile) / size, tileY(s, tile) / size, tile / size, tile / size) };
    map.getCustomRenderList = () => slot.list;
    // (after the generator's own observer, which restores the camera's matrices)
    slot.obs = map.onAfterUnbindObservable.add(() => this.copy(s));
    return slot;
  }

  /** The frame governor's shadow refresh (1: every frame). */
  setAdaptive(every: number): void {
    this.governorEvery = Math.max(1, every | 0);
  }

  /**
   * Per render frame, before the baked lamps write their texels: pick the lamps, fit each slot's cone around the
   * characters in its lamp's reach, place its light and list its casters. (px, py, pz): the local player; (cx, cy, cz):
   * the camera. Allocation-free.
   */
  frame(px: number, py: number, pz: number, cx: number, cy: number, cz: number, dt: number): void {
    const slots = this.slots;
    if (!slots.length) return;
    const L = this.lamps;
    const n = L.count;
    for (let i = 0; i < n; i++) this.lit[i] = L.lampLit(i) ? 1 : 0;
    const f = this.focus;
    f[0] = px;
    f[1] = py;
    f[2] = pz;
    f[3] = cx;
    f[4] = cy;
    f[5] = cz;
    this.picker.update(L.spheres, this.lit, n, f, 2, dt, L.moving ?? null);
    const ls = this.lampSlot;
    ls.fill(-1);
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s]!;
      const lamp = this.picker.slotLamp[s]!;
      if (lamp !== slot.lamp) {
        slot.lamp = lamp;
        slot.ready = -1;
      }
      slot.list.length = 0;
      slot.frozen.length = 0;
      if (lamp < 0 || !this.gather(slot, lamp)) {
        slot.frozen.length = 0;
        slot.ready = -1;
        this.setEvery(slot, 0);
        continue;
      }
      this.setEvery(slot, this.picker.refreshEvery(s, this.governorEvery, this.baseEvery));
      if (slot.ready === lamp) ls[lamp] = s;
    }
  }

  /** List the characters in the lamp's reach and fit the slot's cone; false when none can be fitted. (guard-render S10b)
   *  A character the guard freeze disabled is listed and fitted too, at its stand-in sphere (`frozenCasterSphere`): the
   *  map skips him while he is disabled when it renders, and draws him in the frame the freeze thaws him (`onThaw`). */
  private gather(slot: CsSlot, lamp: number): boolean {
    const S = this.lamps.spheres;
    const lx = S[lamp * 4]!;
    const ly = S[lamp * 4 + 1]!;
    const lz = S[lamp * 4 + 2]!;
    const reach = S[lamp * 4 + 3]!;
    const cs = this.casters;
    const sp = slot.sp;
    const fs = this.fzSphere;
    let k = 0;
    for (let i = 0; i < cs.length; i++) {
      const m = cs[i]!;
      if (!m.isVisible) continue;
      let cx: number;
      let cy: number;
      let cz: number;
      let r: number;
      let frozen = false;
      if (m.isEnabled()) {
        const b = m.getBoundingInfo().boundingSphere;
        const c = b.centerWorld;
        cx = c.x;
        cy = c.y;
        cz = c.z;
        r = b.radiusWorld;
      } else if (frozenCasterSphere(m, fs)) {
        cx = fs[0]!;
        cy = fs[1]!;
        cz = fs[2]!;
        r = fs[3]!;
        frozen = true;
      } else continue;
      const dx = cx - lx;
      const dy = cy - ly;
      const dz = cz - lz;
      const rr = reach + r;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      slot.list.push(m);
      if (frozen) slot.frozen.push(m);
      if (k < MAX_SPHERES) {
        sp[k * 4] = cx;
        sp[k * 4 + 1] = cy;
        sp[k * 4 + 2] = cz;
        sp[k * 4 + 3] = r;
        k++;
      }
    }
    // (characters only: `covers` and the copied map's spheres read the first `k`)
    slot.k = k;
    if (!k) return false;
    // (LR16 fix, LR16-3: the doors' and props' spheres follow the characters' in `sp` and join the fit, so the cone,
    // near and far planes frame their whole shadow within reach - not clipped at a frustum fitted to the guards)
    const n = this.addDynamic(slot, lx, ly, lz, reach, k);
    if (!fitCone(lx, ly, lz, sp, n, slot.fit)) {
      slot.list.length = 0;
      return false;
    }
    const fit = slot.fit;
    const light = slot.light;
    light.position.set(lx, ly, lz);
    light.direction.set(fit[FIT.dx]!, fit[FIT.dy]!, fit[FIT.dz]!);
    const angle = fit[FIT.half]! * 2;
    if (light.angle !== angle) light.angle = angle;
    const near = fit[FIT.near]!;
    // (LR16-P F2: the far plane stays at the light's reach, past the shadow reach the casters are listed within)
    const far = Math.max(near + 0.5, (this.lamps.lightReach?.[lamp] ?? reach) + 0.5);
    if (light.shadowMinZ !== near) light.shadowMinZ = near;
    if (light.shadowMaxZ !== far) light.shadowMaxZ = far;
    return true;
  }

  /**
   * (LR16-3) The door leaves (open, moving or cracked) and the props within the lamp's reach join the render list, so a
   * leaf or a pushed / carried crate throws its shape onto the characters and the floor. (LR16 fix) Their bounding
   * spheres go into `slot.sp` after the `k` characters' (`doorSphere`, a prop: its node + `PROP_REACH`) for the
   * cone fit only - `covers` still reads the characters. Returns the spheres to fit. Allocation-free (indexed loops,
   * no closures).
   */
  private addDynamic(slot: CsSlot, lx: number, ly: number, lz: number, reach: number, k: number): number {
    const sp = slot.sp;
    const ds = this.doorSp;
    const doors = this.doors;
    const leaf = doors?.leafMesh;
    if (doors && leaf && leaf.isVisible && leaf.isEnabled()) {
      const dl = doors.list;
      let listed = false;
      for (let i = 0; i < dl.length; i++) {
        const d = dl[i]!;
        if (d.open <= 0 && d.ajar <= 0) continue;
        doorSphere(d.anchor, ds);
        if (!casterInReach(lx, ly, lz, reach, ds[0]!, ds[1]!, ds[2]!, ds[3]!)) continue;
        // (one thin-instanced mesh holds every leaf: listed once, each open leaf's sphere fitted)
        if (!listed) slot.list.push(leaf);
        listed = true;
        if (k < MAX_SPHERES) sp.set(ds, k++ * 4);
      }
    }
    const pr = this.dynProps?.props;
    if (!pr) return k;
    for (let i = 0; i < pr.length; i++) {
      const p = pr[i]!;
      if (!p.alive) continue;
      const q = p.node.position;
      if (!casterInReach(lx, ly, lz, reach, q.x, q.y, q.z, PROP_REACH)) continue;
      const parts = p.parts;
      let any = false;
      for (let j = 0; j < parts.length; j++) {
        const m = parts[j]!;
        if (m.isEnabled() && m.isVisible) {
          slot.list.push(m);
          any = true;
        }
      }
      if (any && k < MAX_SPHERES) {
        sp[k * 4] = q.x;
        sp[k * 4 + 1] = q.y;
        sp[k * 4 + 2] = q.z;
        sp[k * 4 + 3] = PROP_REACH;
        k++;
      }
    }
    return k;
  }
  private readonly doorSp = new Float32Array(4);

  private setEvery(slot: CsSlot, every: number): void {
    if (slot.every === every) return;
    slot.every = every;
    // (0 would be Babylon's "render once": an idle map is simply not listed - nothing to draw - and kept at a long rate)
    slot.map.refreshRate = every > 0 ? every : 1e6;
  }

  /** After a slot's map rendered: copy it into its tile and snapshot what the shader needs to read it. */
  private copy(s: number): void {
    const slot = this.slots[s];
    const r = this.renderer;
    const w = this.wrapper;
    if (!slot || !r || !w || !this.rt || slot.lamp < 0 || !slot.list.length || !w.effect.isReady()) return;
    const engine = r.engine;
    r.saveStates();
    engine.bindFramebuffer(this.rt, 0, undefined, undefined, true);
    r.setViewport(slot.vp);
    // (lrpolish: `applyEffectWrapper` without its `onApplyObservable.notifyObservers({})`, one object per call. (lr16pol
    // E) What that skips, both safe here: the wrapper's `setFloat2('scale', 1, 1)`, which feeds only the default vertex
    // shader's `vUV` - `COPY_GLSL` never reads `vUV`, it reads `gl_FragCoord` - and `bind()`, a no-op for this wrapper
    // (not `useAsPostProcess`, so no default bindings; no shader-code processing is registered for `charShadowCopy`).
    // A copy shader that reads `vUV` must set `scale` itself.)
    engine.setState(true);
    engine.depthCullingState.depthTest = false;
    engine.stencilState.stencilTest = false;
    engine.enableEffect(w.drawWrapper);
    r.bindBuffers(w.effect);
    w.effect.setTexture('csSrc', slot.map);
    w.effect.setFloat2('csOrg', tileX(s, this.tile), tileY(s, this.tile));
    r.draw();
    engine.unBindFramebuffer(this.rt, true);
    r.restoreStates();
    slot.sg.getTransformMatrix().copyToArray(this.mats, s * 16);
    const lo = slot.light.shadowMinZ;
    const hi = slot.light.shadowMaxZ;
    const p = this.params;
    // (Babylon's metric: (clip z + min) / (min + max), linear in view depth with slope 1 / (max - min); z: the bias in it)
    p[s * 4] = lo;
    p[s * 4 + 1] = lo + hi;
    p[s * 4 + 2] = CHAR_SHADOW.bias / Math.max(0.01, hi - lo);
    p[s * 4 + 3] = 1;
    slot.fitReady.set(slot.fit);
    const S = this.lamps.spheres;
    const l = slot.lamp;
    slot.kReady = fittedSpheres(S[l * 4]!, S[l * 4 + 1]!, S[l * 4 + 2]!, slot.sp, slot.k, slot.spReady);
    slot.ready = slot.lamp;
    this.copies++;
  }

  covers(s: number, x: number, y: number, z: number): boolean {
    const slot = this.slots[s];
    if (!slot || slot.ready < 0) return false;
    // (lrpolish LR14 polish 4-6) only a caster the copied map was fitted around: one the fit skipped (the lamp inside
    // its sphere), one past MAX_SPHERES, or one newly in reach since the copy keeps its capsule
    if (!spheresHold(slot.spReady, slot.kReady, x, y, z)) return false;
    const f = slot.fitReady;
    if (!f[FIT.partial]) return true;
    const S = this.lamps.spheres;
    const i = slot.ready;
    return coneCovers(f, S[i * 4]!, S[i * 4 + 1]!, S[i * 4 + 2]!, x, y, z, 0.9);
  }

  /** Debug / tests: per slot the lamp placed, the lamp in the tile, the casters listed. */
  stats(): { lamp: number; ready: number; casters: number; every: number }[] {
    return this.slots.map((s) => ({ lamp: s.lamp, ready: s.ready, casters: s.list.length, every: s.every }));
  }

  private disposeSlots(): void {
    if (this.restoreObs) this.scene.getEngine().onContextRestoredObservable.remove(this.restoreObs);
    this.restoreObs = null;
    if (this.thawObs) this.scene.onAfterActiveMeshesEvaluationObservable.remove(this.thawObs);
    this.thawObs = null;
    for (const s of this.slots) {
      if (s.obs) s.map.onAfterUnbindObservable.remove(s.obs);
      s.sg.dispose();
      s.light.dispose();
    }
    this.slots = [];
    this.wrapper?.dispose();
    this.wrapper = null;
    this.renderer?.dispose();
    this.renderer = null;
    this.atlas?.dispose();
    this.atlas = null;
    this.rt?.dispose();
    this.rt = null;
    this.params.fill(0);
    this.key = '';
  }

  dispose(): void {
    this.disposeSlots();
  }
}
