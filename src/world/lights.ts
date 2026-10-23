import { hyp3 } from '../core/mathx';
import { FLICKER_FIRE, FLICKER_NONE, FLICKER_OUT, FLICKER_STEP_HZ, FLICKER_T, flickerAt, lampSeed } from './lampFlicker';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_LEVEL_GAIN, lampReach, lampTerm, photoTerm, SPOT_EXP } from './lampMath';
import type { SwaySet } from './lampSway';
/**
 * Light model (pure: no Babylon/DOM), unit-tested.
 *
 * One CPU-side registry of every light in a level: positions, radius, optional cone, intensity, on/off, switch group,
 * EMP outages, whether it can be shot out, and the ambient zones. It holds state only; how lit a point is comes from
 * `LightField` (3.6: the canonical bake + `lampMath.ts`), the one light function gameplay and the renderers share.
 */

export type LightKind = 'lamp' | 'spot' | 'flashlight' | 'window' | 'fire';

export interface LightCone {
  /** Unit direction the cone points. */
  dx: number;
  dy: number;
  dz: number;
  /** Cosines of the outer (zero) and inner (full) half-angles; inner > outer. */
  cosOuter: number;
  cosInner: number;
}

export interface LightDef {
  id: number;
  kind: LightKind;
  x: number;
  y: number;
  z: number;
  /** Range (m): contribution is zero beyond it. */
  radius: number;
  /** Peak contribution 0..1+ at the light. */
  intensity: number;
  /** Linear RGB 0..1 (rendering only). */
  color: [number, number, number];
  cone: LightCone | null;
  on: boolean;
  /** Can be shot out (then it stays off). */
  destructible: boolean;
  destroyed: boolean;
  /** Electronics: an EMP switches it off for a while. */
  electric: boolean;
  /** Switch / circuit group: switches turn a whole group on or off (-1 = none). */
  group: number;
  /** The visible fixture (a lamp strip, a flood housing): its box is what a shot hits and what goes dark when
   *  the light is out; null = a small bulb at the light. */
  fixture: LightFixture | null;
  /** Rendering only: how far the beam reaches before geometry stops it (a flashlight on a wall); unset = radius. */
  reach?: number;
  /** (LR16-5) The live flicker multiplier (a fire's flicker, a failing tube's stutter; `lampFlicker.ts`): 1 steady. The
   *  light field, the baked lamps' data texture and the fixture glow all scale the lamp by it (light parity). Written by
   *  `LightRegistry.tickFlicker` only; never bumps `version` (the bounce and the caches must not re-sum every frame). */
  flicker: number;
  /** (LR16-5b) A swinging pendant's live offset from its rest position (m; `lampSway.ts`): 0 for every other light. The
   *  light field, the baked lamps' data texture, the fitting and its hangers read rest + offset (light parity); the
   *  visibility stays the rest-pose bake, and a shot is tested at rest (`lightOnRay`). Written by
   *  `LightRegistry.tickSway` only; never bumps `version`. */
  swx: number;
  swy: number;
  swz: number;
}

/** (sector-fixes L) The LED fitting family (`fixtureModels.ts`): a flush ceiling panel, a hung linear strip, a wall bulkhead. */
export type FittingModel = 'panel' | 'strip' | 'bulkhead';

/** A light's fixture box: size (m) and its centre's height above the light. */
export interface LightFixture {
  sx: number;
  sy: number;
  sz: number;
  oy: number;
  /** (warehouse-lamps) The model `LightRig` draws in place of the glowing box (`lampMount.ts` sets it); unset = the box. */
  model?: FittingModel;
  /** What the model is fixed to: a ceiling or roof (a panel flush, a strip on wires), a wall (a bulkhead). */
  base?: 'ceiling' | 'wall';
  /** The model's yaw (rad): a strip's long axis (0 = along x), a bulkhead's facing (away from its wall). */
  yaw?: number;
  /** The mount's length (m): a strip's wires from the body top to the roof, a panel's gap to its ceiling, a bulkhead's
   *  stand-off from its back to the wall (`lampMount.ts` measures it). */
  mount?: number;
}

export type LightInit = Partial<Omit<LightDef, 'id' | 'x' | 'y' | 'z' | 'flicker' | 'swx' | 'swy' | 'swz'>> & { x: number; y: number; z: number };

/** Gameplay thresholds for the light meter and perception. */
export const LIGHT = {
  /** Below this a body counts as in shadow (meter dark, perception much slower). Fixed by the bible (L6). */
  shadow: 0.28,
  /** Above this a body counts as lit. */
  lit: 0.6,
  /** Player sampling rate (Hz). */
  playerHz: 10,
} as const;

/**
 * One light's gameplay contribution at a point (gain x intensity x the lamp formula, `lampMath.ts`; ignores
 * visibility). (LR16 fix) The formula the game draws and the baked field reads: a fixed lamp the photometric
 * `photoTerm` over its reach (`radius`, already `lampReach`), a flashlight the linear `lampTerm` (as the meter's
 * torch term). Before, every light took the linear term over the 1.6x photometric reach: Classic falloff on the
 * photometric reach, far too bright at range.
 */
export function contribution(l: LightDef, x: number, y: number, z: number): number {
  if (!l.on || l.destroyed) return 0;
  return LAMP_LEVEL_GAIN * l.intensity * l.flicker * lightTerm(l, x, y, z);
}

/** (LR16 fix) A light's falloff x cone at a point, unoccluded (no gain, intensity or on / off): `contribution` and the
 *  light field's unbaked lights (`LightField.dynamicInto`) read it. Allocation-free. */
export function lightTerm(l: LightDef, x: number, y: number, z: number): number {
  const c = l.cone;
  // (LR16-5b) from where it hangs now (a swinging pendant's offset; 0 for every other light)
  const vx = x - (l.x + l.swx);
  const vy = y - (l.y + l.swy);
  const vz = z - (l.z + l.swz);
  const dx = c ? c.dx : 0;
  const dy = c ? c.dy : -1;
  const dz = c ? c.dz : 0;
  const cut = c ? c.cosOuter : LAMP_CONE_COS;
  const e = c ? SPOT_EXP : LAMP_EXP;
  return l.kind === 'flashlight' ? lampTerm(vx, vy, vz, l.radius, dx, dy, dz, cut, e) : photoTerm(vx, vy, vz, l.radius, dx, dy, dz, cut, e);
}

/** Make a cone from a direction and half-angles (rad). */
export function makeCone(dx: number, dy: number, dz: number, outer: number, inner = outer * 0.6): LightCone {
  const l = hyp3(dx, dy, dz) || 1;
  return { dx: dx / l, dy: dy / l, dz: dz / l, cosOuter: Math.cos(outer), cosInner: Math.cos(Math.min(inner, outer - 1e-3)) };
}

/** A box with its own ambient level (indoors under a roof is darker than a moonlit yard). */
export interface AmbientZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  ambient: number;
}

/** Occlusion test: true when something blocks the light from reaching the point. */
export type Occluder = (l: LightDef, x: number, y: number, z: number) => boolean;

/** (jammer-fixes) `LightRegistry` jam bits: the base on state (switches, EMP, shots) and the jam's flicker. */
const JAM_BASE = 1;
const JAM_LIT = 2;

/** Every light of a level plus the ambient (moonlight / sky fill) level. */
export class LightRegistry {
  readonly lights: LightDef[] = [];
  /** Base light everywhere (0 = pitch dark night .. ~0.7 overcast day). */
  ambient = 0.7;
  /** Bumped on every change (renderers and caches re-read when it moves). */
  version = 0;
  /** Boxes with their own ambient (the smallest containing box wins). */
  readonly zones: AmbientZone[] = [];
  /** Lights switched off for a while (EMP): id -> seconds left. */
  private outFor = new Map<number, number>();
  /** (jammer-fixes) Jammed lights: id -> bits (`JAM_BASE` the on state its switches / EMP / shots give now, `JAM_LIT`
   *  the jam's own flicker). Its `on` is both; the switches and the EMP move the base, the jam only the lit bit, so a
   *  lamp switched off during a jam stays off after it (light parity: host and client run the same rule). */
  private jamBits = new Map<number, number>();
  /** (LR16-5) The flickering lights (`lampFlicker.ts`): registry ids and their modes, in step. Their state lives here,
   *  apart from on / off / jam (and from any later sway): it moves `flicker` and `flickerVersion`, never `version`. */
  private readonly flickIds: number[] = [];
  private readonly flickModes: number[] = [];
  /** (LR16-5) The map's flicker seed (`applyMapFlicker`: map id + match seed; host and client build the same). */
  flickerSeed = 0;
  /** (LR16-5) Bumped when a flickering light's multiplier moves (renderers re-write those lights only). */
  flickerVersion = 0;
  /** (LR16-5b) The swinging pendants (`applyMapSway`, Marlow Yard only; null on every other map). */
  sway: SwaySet | null = null;
  /** (LR16-5b) Bumped when a pendant's offset moves (renderers re-write those lights only); never `version`. */
  swayVersion = 0;

  add(init: LightInit): LightDef {
    const l: LightDef = {
      id: this.lights.length,
      kind: init.kind ?? 'lamp',
      x: init.x,
      y: init.y,
      z: init.z,
      // (lightrev LR13) the fixed lamps' photometric reach (`lampReach`: radius x `PHOTO.reach`)
      radius: (init.kind ?? 'lamp') === 'flashlight' ? (init.radius ?? 8) : lampReach(init.radius ?? 8),
      intensity: init.intensity ?? 0.9,
      color: init.color ?? [1, 0.9, 0.75],
      cone: init.cone ?? null,
      on: init.on ?? true,
      destructible: init.destructible ?? true,
      destroyed: false,
      electric: init.electric ?? true,
      group: init.group ?? -1,
      fixture: init.fixture ?? null,
      flicker: 1,
      swx: 0,
      swy: 0,
      swz: 0,
    };
    this.lights.push(l);
    this.version++;
    // (LR16-5) a fire flickers wherever it is
    if (l.kind === 'fire') this.setFlicker(l.id, FLICKER_FIRE);
    return l;
  }

  addZone(z: AmbientZone): void {
    this.zones.push(z);
    this.version++;
  }

  /** Ambient level at a point: the smallest zone containing it, else the global ambient. */
  ambientAt(x: number, y: number, z: number): number {
    const v = this.zoneAt(x, y, z);
    return v === v ? v : this.ambient;
  }

  /** The smallest zone's ambient at a point, NaN outside every zone. */
  zoneAt(x: number, y: number, z: number): number {
    let v = Number.NaN;
    let best = Infinity;
    const zs = this.zones;
    for (let i = 0; i < zs.length; i++) {
      const b = zs[i]!;
      if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY || z < b.minZ || z > b.maxZ) continue;
      const vol = (b.maxX - b.minX) * (b.maxY - b.minY) * (b.maxZ - b.minZ);
      if (vol < best) {
        best = vol;
        v = b.ambient;
      }
    }
    return v;
  }

  get(id: number): LightDef | null {
    return this.lights[id] ?? null;
  }

  setOn(id: number, on: boolean): void {
    const l = this.lights[id];
    if (!l || l.on === on) return;
    l.on = on;
    this.version++;
  }

  /** (LR16-5) The flickering lights' registry ids (renderers walk this; do not mutate). */
  get flickering(): readonly number[] {
    return this.flickIds;
  }

  /** (LR16-5) A light's flicker mode (`FLICKER_NONE` when it has none). */
  flickerMode(id: number): number {
    const k = this.flickIds.indexOf(id);
    return k < 0 ? FLICKER_NONE : this.flickModes[k]!;
  }

  /** (LR16-5) Give a light a flicker mode (`FLICKER_NONE` takes it off and leaves the light steady). Load time. */
  setFlicker(id: number, mode: number): void {
    const l = this.lights[id];
    if (!l) return;
    const k = this.flickIds.indexOf(id);
    if (mode === FLICKER_NONE) {
      if (k < 0) return;
      this.flickIds.splice(k, 1);
      this.flickModes.splice(k, 1);
      l.flicker = 1;
    } else if (k < 0) {
      this.flickIds.push(id);
      this.flickModes.push(mode);
    } else this.flickModes[k] = mode;
    this.flickerVersion++;
  }

  /**
   * (LR16-5) The flickering lights at sim time `t` (s; the host's clock in co-op, `NetAttachment.simTime`): each one's
   * `flicker` from its mode, the map's seed and its id, a pure function, so host and client agree with no wire change.
   * Bumps `flickerVersion` when one moved (never `version`). Once per fixed step (`GameState.updateLight`). No allocation.
   */
  tickFlicker(t: number): void {
    const ids = this.flickIds;
    if (!ids.length) return;
    // on the fixed step's grid. (lr16pol E) In co-op the client trails the host by its one-way latency, as every host
    // state; snapping to the step absorbs jitter only
    FLICKER_T[0] = Math.round(t * FLICKER_STEP_HZ) / FLICKER_STEP_HZ;
    let moved = false;
    for (let k = 0; k < ids.length; k++) {
      const id = ids[k]!;
      const l = this.lights[id]!;
      flickerAt(this.flickModes[k]!, lampSeed(this.flickerSeed, id));
      const v = FLICKER_OUT[0]!;
      if (v !== l.flicker) {
        l.flicker = v;
        moved = true;
      }
    }
    if (moved) this.flickerVersion++;
  }

  /**
   * (LR16-5b) The swinging pendants at sim time `t` (s; the shared clock, as `tickFlicker`, snapped to the fixed step):
   * each one's `swx, swy, swz` from its kicks, a pure function, so host and client agree with only the kicks on the wire.
   * Bumps `swayVersion` when one moved (never `version`). Once per fixed step (`GameState.updateLight`). No allocation.
   */
  tickSway(t: number): void {
    const s = this.sway;
    if (!s) return;
    s.time[0] = Math.round(t * FLICKER_STEP_HZ) / FLICKER_STEP_HZ;
    if (s.tick(this.lights)) this.swayVersion++;
  }

  /** (LR16-5b) A kick the host sent (co-op client: the `sway` event), applied verbatim. */
  swayImpulse(id: number, t: number, a: number, h: number): void {
    this.sway?.apply(id, t, a, h);
  }

  /** (jammer-fixes) A jam starts on a light: its present on state becomes the base the switches and the EMP own. */
  jamStart(id: number): void {
    const l = this.lights[id];
    if (!l || this.jamBits.has(id)) return;
    this.jamBits.set(id, (l.on ? JAM_BASE : 0) | JAM_LIT);
  }

  /** (jammer-fixes) The jam's flicker: the light is on only while its base is on and the jam has it lit. No allocation. */
  jamLit(id: number, lit: boolean): void {
    const b = this.jamBits.get(id);
    const l = this.lights[id];
    if (b === undefined || !l) return;
    const nb = (b & JAM_BASE) | (lit ? JAM_LIT : 0);
    if (nb !== b) this.jamBits.set(id, nb);
    if (!l.destroyed) this.setOn(id, nb === (JAM_BASE | JAM_LIT));
  }

  /** (jammer-fixes) The jam is over: the light takes the state its switches / EMP / shots give it now. */
  jamEnd(id: number): void {
    const b = this.jamBits.get(id);
    if (b === undefined) return;
    this.jamBits.delete(id);
    const l = this.lights[id];
    if (l && !l.destroyed) this.setOn(id, (b & JAM_BASE) !== 0);
  }

  /** The on state a light's switches, EMP and shots give it, a jam left out (the course's mains gates read this). */
  baseOn(l: LightDef): boolean {
    if (l.destroyed) return false;
    const b = this.jamBits.get(l.id);
    return b === undefined ? l.on : (b & JAM_BASE) !== 0;
  }

  /** A jammed light's base moves (a switch, an EMP); its `on` follows unless the jam has it dark. True on a change. */
  private jamBase(l: LightDef, on: boolean): boolean {
    const b = this.jamBits.get(l.id);
    if (b === undefined) return false;
    const nb = (b & JAM_LIT) | (on ? JAM_BASE : 0);
    if (nb !== b) this.jamBits.set(l.id, nb);
    const lit = nb === (JAM_BASE | JAM_LIT);
    if (l.destroyed || l.on === lit) return false;
    l.on = lit;
    return true;
  }

  /** Switch a whole group (a wall switch / breaker). Returns how many lights changed. */
  setGroup(group: number, on: boolean): number {
    let n = 0;
    for (const l of this.lights) {
      if (l.group !== group || l.destroyed) continue;
      if (this.jamBits.has(l.id)) {
        if (this.jamBase(l, on)) n++;
        continue;
      }
      if (l.on === on) continue;
      l.on = on;
      n++;
    }
    if (n) this.version++;
    return n;
  }

  /** Shoot a light out. Returns false if it cannot be (already out, or not destructible). */
  destroy(id: number): boolean {
    const l = this.lights[id];
    if (!l || !l.destructible || l.destroyed) return false;
    l.destroyed = true;
    l.on = false;
    this.version++;
    return true;
  }

  /** Undo `destroy` (a course restart): the lamp comes back on with its group. */
  restore(id: number): void {
    const l = this.lights[id];
    if (!l || !l.destroyed) return;
    l.destroyed = false;
    l.on = true;
    // a jammed lamp comes back with its group and keeps the jam's flicker
    const b = this.jamBits.get(id);
    if (b !== undefined) {
      this.jamBits.set(id, b | JAM_BASE);
      l.on = (b & JAM_LIT) !== 0;
    }
    this.version++;
  }

  /**
   * (sector-redesign G22) Put a light back to a recorded state (a Sector Ops section restart): shot out or not, and the
   * on state its switches give it. A lamp shot since comes back; an EMP outage is dropped; a jammed lamp gets the base
   * and keeps the jam's flicker until the jam ends (then it takes `on`). Not on a hot path.
   */
  resetTo(id: number, on: boolean, destroyed: boolean): void {
    const l = this.lights[id];
    if (!l) return;
    this.outFor.delete(id);
    if (destroyed) {
      if (!l.destroyed) {
        l.destroyed = true;
        l.on = false;
        this.version++;
      }
      return;
    }
    if (l.destroyed) this.restore(id);
    const b = this.jamBits.get(id);
    if (b !== undefined) {
      this.jamBits.set(id, (b & JAM_LIT) | (on ? JAM_BASE : 0));
      this.setOn(id, on && (b & JAM_LIT) !== 0);
    } else this.setOn(id, on);
  }

  /** Mirror a shot-out lamp from the host (co-op client), destructible or not. */
  kill(id: number): void {
    const l = this.lights[id];
    if (!l || l.destroyed) return;
    l.destroyed = true;
    l.on = false;
    this.version++;
  }

  /** EMP: electric lights within `radius` of a point go out for `seconds`, then come back. */
  disrupt(x: number, y: number, z: number, radius: number, seconds: number): number {
    let n = 0;
    for (const l of this.lights) {
      if (!l.electric || l.destroyed || !this.baseOn(l)) continue;
      if (hyp3(l.x - x, l.y - y, l.z - z) > radius) continue;
      this.jamBase(l, false);
      l.on = false;
      this.outFor.set(l.id, seconds);
      n++;
    }
    if (n) this.version++;
    return n;
  }

  /** Advance timed outages (EMP). */
  update(dt: number): void {
    if (this.outFor.size === 0) return;
    for (const [id, t] of this.outFor) {
      const left = t - dt;
      if (left > 0) {
        this.outFor.set(id, left);
        continue;
      }
      this.outFor.delete(id);
      const l = this.lights[id];
      if (l && !l.destroyed) {
        // a jammed lamp: the EMP gives its base back, the jam keeps it dark
        if (this.jamBits.has(id)) this.jamBase(l, true);
        else l.on = true;
        this.version++;
      }
    }
  }

  /** Lights on now (not destroyed, not disrupted). */
  countOn(): number {
    let n = 0;
    for (const l of this.lights) if (l.on && !l.destroyed) n++;
    return n;
  }
}

/** (jammer-fixes) A light group is on: one of its lamps is on by its switches, EMP and shots (`baseOn`); a jam never
 *  counts as the group being switched off (the course's mains gates read this). No allocation. */
export function groupBaseOn(reg: LightRegistry, group: number): boolean {
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (l.group === group && reg.baseOn(l)) return true;
  }
  return false;
}

/** Visibility factor for perception from a light level: shadow keeps a body hard to see, never invisible
 *  (point blank still reads). 0.25 in darkness .. 1 fully lit. */
export function visibilityFromLight(level: number): number {
  const t = Math.max(0, Math.min(1, (level - LIGHT.shadow * 0.5) / (LIGHT.lit - LIGHT.shadow * 0.5)));
  return 0.25 + 0.75 * t * t * (3 - 2 * t);
}

/** Lights nearest to a point that are on (for the renderer's capped real-light set). Writes up to
 *  `out.length` ids into `out` (nearest first) and returns how many. Allocation-free. */
export function nearestLights(reg: LightRegistry, x: number, y: number, z: number, out: Int32Array, dist: Float32Array): number {
  const cap = out.length;
  let n = 0;
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (!l.on || l.destroyed) continue;
    // rank by distance minus radius: a big light just out of reach still matters
    const d = hyp3(l.x - x, l.y - y, l.z - z) - l.radius;
    let k = n < cap ? n++ : cap;
    if (k === cap && d >= dist[cap - 1]!) continue;
    if (k === cap) k = cap - 1;
    while (k > 0 && dist[k - 1]! > d) {
      dist[k] = dist[k - 1]!;
      out[k] = out[k - 1]!;
      k--;
    }
    dist[k] = d;
    out[k] = l.id;
  }
  return n;
}

/** Radius of a light's bulb for shooting it out (m); padding round a fixture box. */
export const BULB_RADIUS = 0.22;
const FIXTURE_PAD = 0.06;

/** Entry parameter (0..1 along a -> a + d) of a segment into an axis-aligned box, or -1 if it misses. */
export function rayBox(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): number {
  let t0 = 0;
  let t1 = 1;
  const o = [ax - cx, ay - cy, az - cz];
  const d = [dx, dy, dz];
  const h = [hx, hy, hz];
  for (let k = 0; k < 3; k++) {
    const dk = d[k]!;
    const ok = o[k]!;
    const hk = h[k]!;
    if (Math.abs(dk) < 1e-9) {
      if (ok < -hk || ok > hk) return -1;
      continue;
    }
    let ta = (-hk - ok) / dk;
    let tb = (hk - ok) / dk;
    if (ta > tb) {
      const s = ta;
      ta = tb;
      tb = s;
    }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return -1;
  }
  return t0;
}

/**
 * (walk 4.72 S2) How far under a fitting (m) a round may land and still break it: a head on top of its own pole or
 * bracket (Saltmarsh Park's street lamps: a 6 m pillar, the head centred on its top) hides its underside, so a round aimed
 * at it from the ground lands on the pole's side 0.1-0.3 m below the head and never enters its box.
 */
export const LAMP_MOUNT_REACH = 0.35;

/** Is the round's landing point (x, y, z) just under a box (centre cy, half sizes hx / hy / hz): inside its footprint,
 *  at most `LAMP_MOUNT_REACH` below its underside? A wall lamp's far side or a lamp on the next storey is never this. */
function landsUnder(x: number, y: number, z: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): boolean {
  const under = cy - hy - y;
  return under >= -1e-6 && under <= LAMP_MOUNT_REACH && Math.abs(x - cx) <= hx && Math.abs(z - cz) <= hz;
}

/** (polish2) How far the reach probe starts back from the landing, against the round (m): off the struck face. */
export const LAMP_PROBE_BACK = 0.05;

/**
 * (polish2, walk 4.72 polish 1) Light `id` taken by the shot (ax..bz, b the true landing) only through the mount reach
 * (`landsUnder`, the segment never enters its box): the callers then need a clear static line straight up from just off
 * the landing (`LAMP_PROBE_BACK` back along the round, written into `out`) to the head's underside, so a round that
 * lands on a door soffit under a wall lamp on the far face cannot break it. Returns that probe's length (m), or 0 when
 * no probe is needed (the round entered the box, or the start is already level with the underside). Allocation-free.
 */
export function lampReachProbe(reg: LightRegistry, id: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, out: { x: number; y: number; z: number }): number {
  const l = reg.lights[id];
  if (!l) return 0;
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = hyp3(dx, dy, dz);
  if (len < 1e-4) return 0;
  const f = l.fixture;
  let cy: number;
  let hy: number;
  if (f) {
    hy = f.sy / 2 + FIXTURE_PAD;
    cy = l.y + f.oy;
    const t = rayBox(ax, ay, az, dx, dy, dz, l.x, cy, l.z, f.sx / 2 + FIXTURE_PAD, hy, f.sz / 2 + FIXTURE_PAD);
    if (t >= 0 && t <= 1) return 0;
  } else {
    hy = BULB_RADIUS;
    cy = l.y;
    const t = ((l.x - ax) * dx + (l.y - ay) * dy + (l.z - az) * dz) / (len * len);
    if (t >= 0 && t <= 1) {
      const px = ax + dx * t - l.x;
      const py = ay + dy * t - l.y;
      const pz = az + dz * t - l.z;
      if (px * px + py * py + pz * pz <= BULB_RADIUS * BULB_RADIUS) return 0;
    }
  }
  const k = LAMP_PROBE_BACK / len;
  out.x = bx - dx * k;
  out.y = by - dy * k;
  out.z = bz - dz * k;
  const h = cy - hy - out.y;
  return h > 0.02 ? h : 0;
}

/**
 * The first shootable light (on, not destroyed, destructible, fixed) a shot from (ax, ay, az) to (bx, by, bz)
 * passes within `BULB_RADIUS` of (a fixture: enters its padded box), or -1. A round that lands just under a fitting (its
 * pole top or bracket, `LAMP_MOUNT_REACH`) counts as hitting it, at the end of the segment. Allocation-free.
 */
export function lightOnRay(reg: LightRegistry, ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 < 1e-8) return -1;
  let best = -1;
  let bt = Infinity;
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (!l.on || l.destroyed || !l.destructible || l.kind === 'flashlight') continue;
    const f = l.fixture;
    if (f) {
      // slab test against the fixture box (a little padded: a strip a few cm thick is a fair target)
      const hx = f.sx / 2 + FIXTURE_PAD;
      const hy = f.sy / 2 + FIXTURE_PAD;
      const hz = f.sz / 2 + FIXTURE_PAD;
      let t = rayBox(ax, ay, az, dx, dy, dz, l.x, l.y + f.oy, l.z, hx, hy, hz);
      if ((t < 0 || t > 1) && landsUnder(bx, by, bz, l.x, l.y + f.oy, l.z, hx, hy, hz)) t = 1;
      if (t >= 0 && t <= 1 && t < bt) {
        bt = t;
        best = l.id;
      }
      continue;
    }
    let t = ((l.x - ax) * dx + (l.y - ay) * dy + (l.z - az) * dz) / len2;
    if (t >= 0 && t <= 1) {
      const px = ax + dx * t - l.x;
      const py = ay + dy * t - l.y;
      const pz = az + dz * t - l.z;
      if (px * px + py * py + pz * pz > BULB_RADIUS * BULB_RADIUS) t = -1;
    } else t = -1;
    if (t < 0 && landsUnder(bx, by, bz, l.x, l.y, l.z, BULB_RADIUS, BULB_RADIUS, BULB_RADIUS)) t = 1;
    if (t >= 0 && t < bt) {
      bt = t;
      best = l.id;
    }
  }
  return best;
}
