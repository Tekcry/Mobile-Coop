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
import { atlasSize, CHAR_SHADOW, coneCovers, FIT, fitCone, fittedSpheres, LampSlotPicker, spheresHold, tileX, tileY } from './charShadowSet';

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
   *  (tile px, tiles per row, atlas px, depth sign). */
  readonly mats: Float32Array;
  readonly params: Float32Array;
  readonly info: Float32Array;
  readonly atlas: BaseTexture | null;
}

/** The baked lamps' side `CharShadows` reads: per lamp x, y, z, radius, and whether it gives light now. */
export interface CharShadowLamps {
  readonly count: number;
  /** x, y, z, radius per lamp (stride 4). */
  readonly spheres: Float32Array;
  lampLit(i: number): boolean;
}

interface CsSlot {
  light: SpotLight;
  sg: ShadowGenerator;
  map: RenderTargetTexture;
  /** The casters this frame (the map's custom render list, refilled in place). */
  list: AbstractMesh[];
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

/** The copy (GLSL): a shadow map into its tile, texel for texel. */
const COPY_GLSL = `
precision highp float;
uniform highp sampler2D csSrc;
uniform vec2 csOrg;
void main(void) {
  gl_FragColor = vec4(texelFetch(csSrc, ivec2(gl_FragCoord.xy - csOrg), 0).r, 0.0, 0.0, 1.0);
}`;

/**
 * The lamp loop's test (GLSL, `LAMP_CSHADOW`): a point lit by lamp `lpos` against slot `s`'s map in the atlas -
 * normal offset, Babylon's shadow metric from the snapshotted view-projection, 2 x 2 bilinear PCF on texelFetch.
 * 1 lit, `floor` in shadow; 1 outside the slot's frustum.
 */
export const CHAR_SHADOW_GLSL = `
#ifdef LAMP_CSHADOW
uniform highp sampler2D lampCsAtlas;
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
  vec2 org = vec2(float(s - (s / 2) * 2), float(s / 2)) * T;
  vec2 f = (uv * 0.5 + 0.5) * T - 0.5;
  vec2 i0 = floor(f);
  vec2 w = f - i0;
  vec2 lo = clamp(i0, vec2(0.0), vec2(T - 1.0));
  vec2 hi = clamp(i0 + 1.0, vec2(0.0), vec2(T - 1.0));
  float a = step(z, texelFetch(lampCsAtlas, ivec2(org + lo), 0).r);
  float b = step(z, texelFetch(lampCsAtlas, ivec2(org + vec2(hi.x, lo.y)), 0).r);
  float d = step(z, texelFetch(lampCsAtlas, ivec2(org + vec2(lo.x, hi.y)), 0).r);
  float e = step(z, texelFetch(lampCsAtlas, ivec2(org + hi), 0).r);
  return mix(${CHAR_SHADOW.floor.toFixed(2)}, 1.0, mix(mix(a, b, w.x), mix(d, e, w.x), w.y));
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
  /** Shadow maps copied into the atlas so far (tests, the debug line). */
  copies = 0;
  /** The map's metric with a reversed depth buffer runs the other way. */
  private readonly depthSign: number;

  constructor(
    private scene: Scene,
    private lamps: CharShadowLamps,
    /** The character casters (`World.charCasters`): players, guards, bodies, weapons and gear; no props, no level. */
    private casters: readonly AbstractMesh[],
  ) {
    this.lampSlot = new Int8Array(lamps.count).fill(-1);
    this.lit = new Uint8Array(lamps.count);
    this.depthSign = scene.getEngine().useReverseDepthBuffer ? -1 : 1;
  }

  get on(): boolean {
    return this.slots.length > 0 && !!this.atlas;
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
    const engine = this.scene.getEngine();
    const size = atlasSize(tile);
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
    this.info[1] = 2;
    this.info[2] = size;
    this.info[3] = this.depthSign;
    for (let s = 0; s < n; s++) this.slots.push(this.makeSlot(s, tile));
    this.restoreObs = engine.onContextRestoredObservable.add(() => this.invalidate());
  }

  /** Every slot's tile as empty (a restored context's blank atlas): capsules until each map copies again. */
  private invalidate(): void {
    for (let s = 0; s < this.slots.length; s++) {
      this.slots[s]!.ready = -1;
      this.slots[s]!.kReady = 0;
      this.params[s * 4 + 3] = 0;
    }
    this.lampSlot.fill(-1);
  }

  private makeSlot(s: number, tile: number): CsSlot {
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
    const slot: CsSlot = { light, sg, map, list: [], lamp: -1, ready: -1, fit: new Float32Array(FIT.size), fitReady: new Float32Array(FIT.size), sp: new Float32Array(MAX_SPHERES * 4), k: 0, spReady: new Float32Array(MAX_SPHERES * 4), kReady: 0, every: 0, obs: null, vp: new Viewport(tileX(s, tile) / atlasSize(tile), tileY(s, tile) / atlasSize(tile), 0.5, 0.5) };
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
    this.picker.update(L.spheres, this.lit, n, f, 2, dt);
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
      if (lamp < 0 || !this.gather(slot, lamp)) {
        slot.ready = -1;
        this.setEvery(slot, 0);
        continue;
      }
      this.setEvery(slot, this.picker.refreshEvery(s, this.governorEvery));
      if (slot.ready === lamp) ls[lamp] = s;
    }
  }

  /** List the characters in the lamp's reach and fit the slot's cone; false when none can be fitted. */
  private gather(slot: CsSlot, lamp: number): boolean {
    const S = this.lamps.spheres;
    const lx = S[lamp * 4]!;
    const ly = S[lamp * 4 + 1]!;
    const lz = S[lamp * 4 + 2]!;
    const reach = S[lamp * 4 + 3]!;
    const cs = this.casters;
    const sp = slot.sp;
    let k = 0;
    for (let i = 0; i < cs.length; i++) {
      const m = cs[i]!;
      if (!m.isEnabled() || !m.isVisible) continue;
      const b = m.getBoundingInfo().boundingSphere;
      const c = b.centerWorld;
      const r = b.radiusWorld;
      const dx = c.x - lx;
      const dy = c.y - ly;
      const dz = c.z - lz;
      const rr = reach + r;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      slot.list.push(m);
      if (k < MAX_SPHERES) {
        sp[k * 4] = c.x;
        sp[k * 4 + 1] = c.y;
        sp[k * 4 + 2] = c.z;
        sp[k * 4 + 3] = r;
        k++;
      }
    }
    slot.k = k;
    if (!k || !fitCone(lx, ly, lz, sp, k, slot.fit)) {
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
    const far = Math.max(near + 0.5, reach + 0.5);
    if (light.shadowMinZ !== near) light.shadowMinZ = near;
    if (light.shadowMaxZ !== far) light.shadowMaxZ = far;
    return true;
  }

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
    // (lrpolish: `applyEffectWrapper` without its `onApplyObservable.notifyObservers({})`, one object per call)
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
