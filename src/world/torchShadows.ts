/**
 * (LR16t, sector-redesign) Guard torch shadows: every drawn torch slot (`LightRig.torchSlotIds`, up to
 * `TORCH_DRAW_SLOTS` = `FLASHLIGHTS`) gets a spot shadow map of what its cone holds - the static level (or its proxy),
 * characters, props, door leaves - drawn by Babylon's own shadow generator, then copied texel for texel into its tile
 * of ONE float atlas (2 x 2 tiles), so a lit shader takes one texture for all four. The lamp plugin's torch loop
 * (`shadowAccuracy.TORCH_DRAW_GLSL` under `LAMP_TSHADOW`) reads it with contact-hardening PCF and tests each torch's shut
 * doors exactly (their ids written here into the torch's 4th vec4). While on, the light rig gives no flashlight a
 * Babylon light (`LightRig.setTorchShadows`): one torch formula everywhere, no hard Babylon cone left.
 *
 * The same pattern as LR14's `CharShadows` (`charShadows.ts`; not edited): each slot's spot light sits on a layer no
 * mesh carries, so it lights nothing and adds no sampler; it only drives its map. Per frame nothing is allocated.
 * Rendering only: the meter and guard perception read the light field (rays + doors). Parity notes: `torchShadowSet.ts`.
 * Without WebGL2 or a float render target (`supported`) it stays off and the old path draws (reach cut, Babylon pool),
 * logged once.
 *
 * Receivers: the lamp plugin draws the torches (lit or shadowed) only on PBR materials. The level, voxels, props, doors,
 * characters and (lr16pol B) the fences, ropes, rope line and bullet decals (`levelLitMaterial.ts`) take them. Still no
 * torch light: every standard material - the whole `?gfx=min` / standard level path (no torch term there), the flat
 * unlit or standard helpers (bulbs, vfx particles and tracers) - the Kestrel light view (its `BakedLamps` is
 * `standard`: no torch draw, no guard torches) and the menu's scenes (no baked lamps).
 */
import { BaseTexture, Constants, EffectRenderer, EffectWrapper, ShadowGenerator, SpotLight, Texture, Vector3, Viewport, type AbstractMesh, type Observer, type RenderTargetWrapper, type Scene } from '../core/babylon';
import { frozenCasterSphere, thawed } from './frozenCaster';
import type { LightRegistry } from './lights';
import { TORCH_DRAW_STRIDE } from './shadowAccuracy';
import { casterInTorchCone, pickTorchDoors, sphereInFrustum, TORCH_SHADOW, torchAtlasSize, torchForceRender, torchHolderScore, torchLitSphere, torchPoseMoved, torchPoseStale, torchPoseTurned, torchRefreshEvery, torchShadowFov, torchTileX, torchTileY, writeTorchPose, type TorchDoor, type TsPlane } from './torchShadowSet';

type RenderTargetTexture = NonNullable<ReturnType<ShadowGenerator['getShadowMap']>>;
type SceneNode = NonNullable<AbstractMesh['parent']>;

/** A layer bit no mesh carries (the same bit as `CharShadows`' slots): the slot lights reach no mesh. */
const NO_MESH_LAYER = 0x20000000;

/** The top of a mesh's parent chain (a character's rig root: his body, gun and gear share it). Allocation-free. */
function rootNode(m: AbstractMesh): SceneNode {
  let n: SceneNode = m;
  while (n.parent) n = n.parent;
  return n;
}

/** What the baked lamps read (`BakedLamps.torchShadows`). */
export interface TorchShadowLink {
  /** Maps on (the plugin's `LAMP_TSHADOW`). */
  readonly on: boolean;
  /** Uniforms: per slot its view-projection (4 x vec4), its params (min z, min + max z, bias, valid: 1 a map, 2 nothing
   *  to cast, 0 not ready), the atlas info (tile px, filter taps, atlas px, depth sign). */
  readonly mats: Float32Array;
  readonly params: Float32Array;
  readonly info: Float32Array;
  readonly atlas: BaseTexture | null;
}

/** The light rig's side (`LightRig`): every shadow caster and the registry id in each drawn torch slot. */
export interface TorchShadowRig {
  readonly casters: readonly AbstractMesh[];
  readonly torchSlotIds: Int32Array;
}

interface TsSlot {
  light: SpotLight;
  sg: ShadowGenerator;
  map: RenderTargetTexture;
  /** The casters this frame (the map's custom render list, refilled in place). */
  list: AbstractMesh[];
  /** (guard-render S10b) Of them, the character casters the guard freeze had disabled at the gather. */
  frozen: AbstractMesh[];
  /** The torch placed now (-1 idle) and the torch whose map is in the tile (-1: none yet). */
  id: number;
  ready: number;
  /** Frames between refreshes (0: not rendering). */
  every: number;
  /** The torch pose (position, axis) the tile was made from (a map's render, or "nothing to cast"): a torch that has
   *  left it (`torchPoseStale`) renders this frame (LR16t fix round). */
  pose: Float32Array;
  obs: Observer<RenderTargetTexture> | null;
  vp: Viewport;
}

/** The copy (GLSL): a shadow map into its tile, texel for texel. */
const COPY_GLSL = `
precision highp float;
uniform highp sampler2D tsSrc;
uniform vec2 tsOrg;
void main(void) {
  gl_FragColor = vec4(texelFetch(tsSrc, ivec2(gl_FragCoord.xy - tsOrg), 0).r, 0.0, 0.0, 1.0);
}`;

/** (lr16pol E, lr16t check A 6) The registry holds a guard torch slot (`addTorchSlots`: dark maps only; registry lights
 *  are fixed at load). Without one nothing can be drawn into an atlas or take a torch's shadow map. */
export function registryHasTorch(reg: LightRegistry): boolean {
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) if (ls[i]!.kind === 'flashlight') return true;
  return false;
}

export class TorchShadows implements TorchShadowLink {
  /** (piano SO3) Drawn torch slots (`LightRig.torchSlotIds`: the map's count, 4 by default) and how many of them get a
   *  shadow tile (the registry's flashlights without `beamCut`, at most `n`). The atlas is 2 tiles wide and
   *  `ceil(shadowed / 2)` tall (2 x 2 by default). A slot past `shadowed` has no map: its params w is 3 while lit
   *  (the torch loop's reach-cut branch, `LAMP_TORCHCUT`), its shut doors still picked. */
  readonly n: number;
  readonly shadowed: number;
  readonly mats: Float32Array;
  readonly params: Float32Array;
  readonly info = new Float32Array(4);
  atlas: BaseTexture | null = null;
  private rt: RenderTargetWrapper | null = null;
  private renderer: EffectRenderer | null = null;
  private wrapper: EffectWrapper | null = null;
  private slots: TsSlot[] = [];
  private restoreObs: Observer<ReturnType<Scene['getEngine']>> | null = null;
  private key = '';
  private tile = 0;
  private governorEvery = 1;
  private readonly depthSign: number;
  private readonly doorDist = new Float32Array(TORCH_SHADOW.doors);
  private readonly sphere = new Float32Array(4);
  /** (S10b) A frozen caster's stand-in sphere. */
  private readonly fzSphere = new Float32Array(4);
  /** (S10b) After each camera evaluation (the freeze's verdict): a slot whose listed frozen caster was thawed renders. */
  private thawObs: Observer<Scene> | null = null;
  private logged = false;
  /** (lr16pol E, lr16t check A 6) A torch slot in the registry: else `configure` builds nothing (no generators,
   *  targets or atlas), `on` stays false, so `LAMP_TSHADOW` is off and the lit shaders lose the atlas sampler. */
  private readonly hasTorch: boolean;
  /** Shadow maps copied into the atlas so far (tests, the debug line). */
  copies = 0;

  constructor(
    private scene: Scene,
    private reg: LightRegistry,
    private rig: TorchShadowRig,
    /** The baked lamps' torch uniforms (`BakedLamps.torchDraw`): the door ids go into each slot's 4th vec4. */
    private draw: Float32Array,
    /** The level's doors, in the lamp data's door order (`World.doors.list`). */
    private doors: readonly TorchDoor[],
    /** A character caster (`World.charCasters`): one that holds the torch is its guard, casting nothing into his beam. */
    private isChar: (m: AbstractMesh) => boolean,
  ) {
    this.depthSign = scene.getEngine().useReverseDepthBuffer ? -1 : 1;
    this.n = rig.torchSlotIds.length;
    let sh = 0;
    for (const l of reg.lights) if (l.kind === 'flashlight' && !l.beamCut) sh++;
    this.shadowed = Math.max(1, Math.min(this.n, sh));
    this.mats = new Float32Array(this.n * 16);
    this.params = new Float32Array(this.n * 4);
    // (`World.create` runs `addTorchSlots` before this: a bright map's registry has no flashlight)
    this.hasTorch = registryHasTorch(reg);
  }

  get on(): boolean {
    return this.slots.length > 0 && !!this.atlas;
  }

  /** (guard-render S10b) The slots built (the Sector guard freeze reads each). */
  get slotCount(): number {
    return this.slots.length;
  }

  /** (S10b) Slot `s`'s spot while it holds a torch this frame (placed by `frame`: position, direction, angle and
   *  shadowMaxZ as its map renders), else null (unused). Read only: the freeze treats it as a shadowing light. */
  slotLight(s: number): SpotLight | null {
    const sl = this.slots[s];
    return sl && sl.id >= 0 ? sl.light : null;
  }

  /** WebGL2 with float or half-float render targets (texelFetch, the depth metric): else the old path stays. */
  private supported(): boolean {
    const e = this.scene.getEngine();
    const caps = e.getCaps();
    return e.version >= 2 && !e.isWebGPU && (caps.textureFloatRender || caps.textureHalfFloatRender);
  }

  /** The tier's tile and filter taps (`torchShadowSpec`; tile 0: off); rebuilds only on a change. */
  configure(tile: number, taps: number): void {
    // (lr16pol E: no torch slot on this map - nothing to build, nothing to log)
    if (!this.hasTorch) tile = 0;
    const ok = tile > 0 && this.supported();
    if (tile > 0 && !ok && !this.logged) {
      this.logged = true;
      console.info('[torch shadows] no WebGL2 float render target: guard torches keep the reach cut');
    }
    const n = ok ? this.shadowed : 0;
    const key = `${n}:${tile}:${taps}`;
    if (key === this.key) return;
    this.disposeSlots();
    this.key = key;
    if (n === 0) return;
    this.tile = tile;
    const engine = this.scene.getEngine();
    const size = torchAtlasSize(tile);
    // (piano SO3) 2 tiles wide, a row of 2 per 2 shadowed slots (2 x 2 by default: square, as before)
    const high = tile * Math.ceil(n / 2);
    const caps = engine.getCaps();
    this.rt = engine.createRenderTargetTexture(
      { width: size, height: high },
      { generateMipMaps: false, generateDepthBuffer: false, generateStencilBuffer: false, type: caps.textureFloatRender ? Constants.TEXTURETYPE_FLOAT : Constants.TEXTURETYPE_HALF_FLOAT, format: Constants.TEXTUREFORMAT_R, samplingMode: Constants.TEXTURE_NEAREST_SAMPLINGMODE },
    );
    const at = new BaseTexture(this.scene, this.rt.texture);
    at.wrapU = at.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.atlas = at;
    this.renderer = new EffectRenderer(engine);
    this.wrapper = new EffectWrapper({ engine, name: 'torchShadowCopy', fragmentShader: COPY_GLSL, uniformNames: ['tsOrg'], samplerNames: ['tsSrc'] });
    this.info[0] = tile;
    this.info[1] = taps;
    this.info[2] = size;
    this.info[3] = this.depthSign;
    for (let s = 0; s < n; s++) this.slots.push(this.makeSlot(s, tile, size, high));
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

  /** Every tile as not ready (a restored context's blank atlas): dark until each map copies again. */
  private invalidate(): void {
    for (let s = 0; s < this.slots.length; s++) {
      this.slots[s]!.ready = -1;
      this.params[s * 4 + 3] = 0;
    }
  }

  private makeSlot(s: number, tile: number, size: number, high: number): TsSlot {
    const light = new SpotLight(`torchshadow-${s}`, new Vector3(0, -50, 0), new Vector3(0, -1, 0), 1, 1, this.scene);
    light.includeOnlyWithLayerMask = NO_MESH_LAYER;
    light.intensity = 0;
    light.shadowMinZ = TORCH_SHADOW.near;
    light.shadowMaxZ = TORCH_SHADOW.far;
    // (no filter: the float target holds the depth metric the atlas copies; back faces only - a lit face never shades
    // itself, as the character maps)
    const sg = new ShadowGenerator(tile, light, true, undefined, true);
    sg.bias = 0;
    sg.normalBias = 0;
    sg.forceBackFacesOnly = true;
    sg.transparencyShadow = false;
    const map = sg.getShadowMap()!;
    map.renderList = [];
    map.refreshRate = 1e6;
    const slot: TsSlot = { light, sg, map, list: [], frozen: [], id: -1, ready: -1, every: 0, pose: new Float32Array(6), obs: null, vp: new Viewport(torchTileX(s, tile) / size, torchTileY(s, tile) / high, tile / size, tile / high) };
    map.getCustomRenderList = () => slot.list;
    slot.obs = map.onAfterUnbindObservable.add(() => this.copy(s));
    return slot;
  }

  /** The frame governor's shadow refresh (1: every frame). */
  setAdaptive(every: number): void {
    this.governorEvery = Math.max(1, every | 0);
  }

  /**
   * Per render frame, after `LightRig.update` (which fills the torch slots): place each slot's spot on its torch, list
   * the casters in its cone, pick its shut doors, and set how often its map renders. (cx, cy, cz): the camera.
   * Allocation-free.
   */
  frame(cx: number, cy: number, cz: number): void {
    const slots = this.slots;
    if (!slots.length) return;
    const ids = this.rig.torchSlotIds;
    const ls = this.reg.lights;
    // (last frame's camera frustum; none before the first render: every slot counts as in view)
    const planes: readonly TsPlane[] | undefined = this.scene.frustumPlanes;
    // the slot whose torch is nearest the camera refreshes every frame
    let near = -1;
    let nd = Infinity;
    for (let s = 0; s < slots.length && s < ids.length; s++) {
      const id = ids[s]!;
      const l = id >= 0 ? ls[id] : undefined;
      if (!l || !l.on || l.destroyed || !l.cone) continue;
      const dx = l.x - cx;
      const dy = l.y - cy;
      const dz = l.z - cz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < nd) {
        nd = d;
        near = s;
      }
    }
    const draw = this.draw;
    const sp = this.sphere;
    // (piano SO3) the slots with no shadow map: lit ones read params w 3 (the reach cut) and test their shut doors
    for (let s = slots.length; s < this.n; s++) {
      const id = s < ids.length ? ids[s]! : -1;
      const l = id >= 0 ? ls[id] : undefined;
      const o = s * TORCH_DRAW_STRIDE + 12;
      if (!l || !l.on || l.destroyed || !l.cone) {
        this.params[s * 4 + 3] = 0;
        for (let k = 0; k < 4; k++) draw[o + k] = 0;
        continue;
      }
      this.params[s * 4 + 3] = 3;
      const c = l.cone;
      pickTorchDoors(this.doors, l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius, draw, o, this.doorDist);
    }
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s]!;
      const id = s < ids.length ? ids[s]! : -1;
      const l = id >= 0 ? ls[id] : undefined;
      const o = s * TORCH_DRAW_STRIDE + 12;
      if (!l || !l.on || l.destroyed || !l.cone) {
        slot.id = -1;
        slot.ready = -1;
        slot.list.length = 0;
        slot.frozen.length = 0;
        this.params[s * 4 + 3] = 0;
        this.setEvery(slot, 0);
        for (let k = 0; k < 4; k++) draw[o + k] = 0;
        continue;
      }
      if (slot.id !== id) {
        slot.id = id;
        slot.ready = -1;
        this.params[s * 4 + 3] = 0;
      }
      const c = l.cone;
      const light = slot.light;
      light.position.set(l.x, l.y, l.z);
      light.direction.set(c.dx, c.dy, c.dz);
      const fov = torchShadowFov(c.cosOuter);
      if (light.angle !== fov) light.angle = fov;
      // (the far plane at the radius, not the beam's 5-ray reach: a pillar's far side past the reach is still in the
      // map, and an empty texel - the far plane - reads lit for every receiver in range)
      const far = l.radius + TORCH_SHADOW.farPad;
      if (light.shadowMaxZ !== far) light.shadowMaxZ = far;
      pickTorchDoors(this.doors, l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius, draw, o, this.doorDist);
      torchLitSphere(l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius, sp);
      if (!sphereInFrustum(planes, sp[0]!, sp[1]!, sp[2]!, sp[3]!)) {
        // (nothing it lights is on screen: the map waits; the tile keeps its last map and snapshot while the torch
        // holds its pose. A torch that left it reads dark until it renders again: the camera planes lag a frame, so a
        // flick onto it never shows the new beam through the old map. Check A polish 1.)
        if (this.params[s * 4 + 3]! > 0.5 && torchPoseStale(slot.pose, 0, l.x, l.y, l.z, c.dx, c.dy, c.dz)) {
          slot.ready = -1;
          this.params[s * 4 + 3] = 0;
        }
        slot.list.length = 0;
        slot.frozen.length = 0;
        this.setEvery(slot, 0);
        continue;
      }
      this.gather(slot, l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius);
      if (!slot.list.length) {
        // (nothing in the cone to cast: lit, no draw)
        this.setEvery(slot, 0);
        slot.ready = id;
        this.params[s * 4 + 3] = 2;
        writeTorchPose(slot.pose, 0, l.x, l.y, l.z, c.dx, c.dy, c.dz);
        continue;
      }
      // (a tile that showed "nothing to cast" waits for its first map; the shader reads 0 until it copies)
      if (this.params[s * 4 + 3] === 2) {
        slot.ready = -1;
        this.params[s * 4 + 3] = 0;
      }
      this.setEvery(slot, torchRefreshEvery(s === near, this.governorEvery));
      // (check A blocking 1 and polish 2) the tile holds no map yet (a new torch in the slot, a restore) or one made
      // from a pose the torch has left (turned past the frustum pad, or moved): render this frame, not at the slot's
      // interval. The shader reads a stale map's off-frustum texels as dark, never lit, for the frame in between.
      // (lr16pol B, recheck 1) Under the governor (`governorEvery` > 1) a pose that only turned waits for the interval
      // (`torchForceRender`): a dark rim at the beam's edge until then; moved, new or invalid still render at once.
      const valid = this.params[s * 4 + 3]!;
      const moved = valid === 1 && torchPoseMoved(slot.pose, 0, l.x, l.y, l.z);
      const turned = valid === 1 && !moved && torchPoseTurned(slot.pose, 0, c.dx, c.dy, c.dz);
      if (torchForceRender(valid, moved, turned, this.governorEvery)) slot.map.resetRefreshCounter();
    }
  }

  /**
   * The casters in the torch's reach and cone (+ pad), not the guard holding it, into the slot's list. (lr16pol B,
   * lr16t check A 5) Only the holder drops: the character caster scoring lowest in `torchHolderScore` (`pickTorchHolder`'s
   * rule: nearest the feet `placeTorch` put the torch ahead of) names him, and every character caster under the same
   * root node (his rig: body, gun, helmet, armour) leaves the list; a second guard or the player beside him, or in front
   * of him in his beam, still casts. (guard-render S10b) A character caster the guard freeze disabled is listed too, at
   * its stand-in sphere (`frozenCasterSphere`): the map skips it while it is disabled when it renders, and draws him
   * in the frame the freeze thaws him (`onThaw`). Allocation-free.
   */
  private gather(slot: TsSlot, lx: number, ly: number, lz: number, ax: number, ay: number, az: number, cosOuter: number, radius: number): void {
    const list = slot.list;
    list.length = 0;
    const fl = slot.frozen;
    fl.length = 0;
    const fs = this.fzSphere;
    const cs = this.rig.casters;
    let holder: AbstractMesh | null = null;
    let hd = Infinity;
    for (let i = 0; i < cs.length; i++) {
      const m = cs[i]!;
      if (!m.isVisible) continue;
      let px: number;
      let py: number;
      let pz: number;
      let r: number;
      let frozen = false;
      if (m.isEnabled()) {
        const b = m.getBoundingInfo().boundingSphere;
        const p = b.centerWorld;
        px = p.x;
        py = p.y;
        pz = p.z;
        r = b.radiusWorld;
      } else if (this.isChar(m) && frozenCasterSphere(m, fs)) {
        px = fs[0]!;
        py = fs[1]!;
        pz = fs[2]!;
        r = fs[3]!;
        frozen = true;
      } else continue;
      if (!casterInTorchCone(lx, ly, lz, ax, ay, az, cosOuter, radius, px, py, pz, r)) continue;
      if (this.isChar(m)) {
        const d = torchHolderScore(lx, ly, lz, ax, az, px, py, pz, r);
        if (d >= 0 && d < hd) {
          hd = d;
          holder = m;
        }
      }
      list.push(m);
      if (frozen) fl.push(m);
    }
    if (!holder) return;
    const root = rootNode(holder);
    let k = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i]!;
      if (this.isChar(m) && rootNode(m) === root) continue;
      list[k++] = m;
    }
    list.length = k;
    k = 0;
    for (let i = 0; i < fl.length; i++) {
      const m = fl[i]!;
      if (rootNode(m) === root) continue;
      fl[k++] = m;
    }
    fl.length = k;
  }

  private setEvery(slot: TsSlot, every: number): void {
    if (slot.every === every) return;
    slot.every = every;
    // (0 would be Babylon's "render once": an idle map keeps a long rate; a change re-renders at once)
    slot.map.refreshRate = every > 0 ? every : 1e6;
  }

  /** After a slot's map rendered: copy it into its tile and snapshot what the shader needs to read it. */
  private copy(s: number): void {
    const slot = this.slots[s];
    const r = this.renderer;
    const w = this.wrapper;
    if (!slot || !r || !w || !this.rt || slot.id < 0 || !slot.list.length || !w.effect.isReady()) return;
    const engine = r.engine;
    r.saveStates();
    engine.bindFramebuffer(this.rt, 0, undefined, undefined, true);
    r.setViewport(slot.vp);
    engine.setState(true);
    engine.depthCullingState.depthTest = false;
    engine.stencilState.stencilTest = false;
    engine.enableEffect(w.drawWrapper);
    r.bindBuffers(w.effect);
    w.effect.setTexture('tsSrc', slot.map);
    w.effect.setFloat2('tsOrg', torchTileX(s, this.tile), torchTileY(s, this.tile));
    r.draw();
    engine.unBindFramebuffer(this.rt, true);
    r.restoreStates();
    slot.sg.getTransformMatrix().copyToArray(this.mats, s * 16);
    const lo = slot.light.shadowMinZ;
    const hi = slot.light.shadowMaxZ;
    const p = this.params;
    // (Babylon's metric: (clip z + min) / (min + max), linear in view depth with slope 1 / (max - min))
    p[s * 4] = lo;
    p[s * 4 + 1] = lo + hi;
    p[s * 4 + 2] = TORCH_SHADOW.bias / Math.max(0.01, hi - lo);
    p[s * 4 + 3] = 1;
    const lp = slot.light.position;
    const ld = slot.light.direction;
    writeTorchPose(slot.pose, 0, lp.x, lp.y, lp.z, ld.x, ld.y, ld.z);
    slot.ready = slot.id;
    this.copies++;
  }

  /** Debug / tests: per slot the torch placed, the torch in the tile, the casters listed, the refresh interval. */
  stats(): { id: number; ready: number; casters: number; every: number }[] {
    return this.slots.map((s) => ({ id: s.id, ready: s.ready, casters: s.list.length, every: s.every }));
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
    // (the door vec4s back to none: the fallback path never reads them)
    for (let s = 0; s * TORCH_DRAW_STRIDE < this.draw.length; s++) for (let k = 12; k < TORCH_DRAW_STRIDE; k++) this.draw[s * TORCH_DRAW_STRIDE + k] = 0;
    this.key = '';
  }

  dispose(): void {
    this.disposeSlots();
  }
}
