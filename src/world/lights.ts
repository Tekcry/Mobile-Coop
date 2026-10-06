import { hyp3 } from '../core/mathx';
/**
 * Light model (pure: no Babylon/DOM), unit-tested.
 *
 * One CPU-side registry of every light in a level: positions, radius, optional cone, intensity, on/off and
 * whether it can be shot out. Gameplay samples it (`lightLevelAt`: how lit a point is, 0 dark .. 1 fully
 * lit) for the player's light meter and the enemies' perception; the renderer (`world/lightRig.ts`) shows a
 * capped set of the nearest lights as real Babylon lights and the rest as emissive fakes.
 *
 * Level = ambient + sum of each light's contribution, clamped to 1. A contribution is the intensity times a
 * smooth range falloff ((1 - (d/r)^2)^2, zero at the radius) times a cone factor (smoothstep between the
 * outer and inner cone cosines). Occlusion is optional: the caller passes a test (a raycast) that only runs
 * for lights that would contribute.
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
}

export type LightInit = Partial<Omit<LightDef, 'id' | 'x' | 'y' | 'z'>> & { x: number; y: number; z: number };

/** Gameplay thresholds for the light meter and perception. */
export const LIGHT = {
  /** Below this a body counts as in shadow (meter dark, perception much slower). */
  shadow: 0.28,
  /** Above this a body counts as lit. */
  lit: 0.6,
  /** Player sampling rate (Hz). */
  playerHz: 10,
} as const;

/** Smooth range falloff: 1 at the light, 0 at (and beyond) the radius. */
export function falloff(d: number, radius: number): number {
  if (radius <= 0 || d >= radius) return 0;
  const k = d / radius;
  const f = 1 - k * k;
  return f * f;
}

/** Cone factor of a light towards a point at offset (vx, vy, vz) of length `d`. */
export function coneFactor(cone: LightCone | null, vx: number, vy: number, vz: number, d: number): number {
  if (!cone) return 1;
  if (d < 1e-6) return 1;
  const c = (vx * cone.dx + vy * cone.dy + vz * cone.dz) / d;
  if (c <= cone.cosOuter) return 0;
  if (c >= cone.cosInner) return 1;
  const t = (c - cone.cosOuter) / (cone.cosInner - cone.cosOuter);
  return t * t * (3 - 2 * t);
}

/** One light's contribution at a point (ignores occlusion). */
export function contribution(l: LightDef, x: number, y: number, z: number): number {
  if (!l.on || l.destroyed) return 0;
  const vx = x - l.x;
  const vy = y - l.y;
  const vz = z - l.z;
  // cheap reject before the square root
  if (Math.abs(vx) > l.radius || Math.abs(vy) > l.radius || Math.abs(vz) > l.radius) return 0;
  const d = hyp3(vx, vy, vz);
  const f = falloff(d, l.radius);
  if (f <= 0) return 0;
  return l.intensity * f * coneFactor(l.cone, vx, vy, vz, d);
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

  add(init: LightInit): LightDef {
    const l: LightDef = {
      id: this.lights.length,
      kind: init.kind ?? 'lamp',
      x: init.x,
      y: init.y,
      z: init.z,
      radius: init.radius ?? 8,
      intensity: init.intensity ?? 0.9,
      color: init.color ?? [1, 0.9, 0.75],
      cone: init.cone ?? null,
      on: init.on ?? true,
      destructible: init.destructible ?? true,
      destroyed: false,
      electric: init.electric ?? true,
      group: init.group ?? -1,
    };
    this.lights.push(l);
    this.version++;
    return l;
  }

  addZone(z: AmbientZone): void {
    this.zones.push(z);
    this.version++;
  }

  /** Ambient level at a point: the smallest zone containing it, else the global ambient. */
  ambientAt(x: number, y: number, z: number): number {
    let v = this.ambient;
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

  /** Switch a whole group (a wall switch / breaker). Returns how many lights changed. */
  setGroup(group: number, on: boolean): number {
    let n = 0;
    for (const l of this.lights) {
      if (l.group !== group || l.destroyed || l.on === on) continue;
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

  /** EMP: electric lights within `radius` of a point go out for `seconds`, then come back. */
  disrupt(x: number, y: number, z: number, radius: number, seconds: number): number {
    let n = 0;
    for (const l of this.lights) {
      if (!l.electric || l.destroyed || !l.on) continue;
      if (hyp3(l.x - x, l.y - y, l.z - z) > radius) continue;
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
        l.on = true;
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

/** How lit a point is: ambient plus every light's contribution (optionally occluded), clamped 0..1. */
export function lightLevelAt(reg: LightRegistry, x: number, y: number, z: number, occluded?: Occluder): number {
  let v = reg.zones.length ? reg.ambientAt(x, y, z) : reg.ambient;
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    const c = contribution(l, x, y, z);
    if (c <= 0.01) continue;
    if (occluded && occluded(l, x, y, z)) continue;
    v += c;
    if (v >= 1) return 1;
  }
  return v < 0 ? 0 : v;
}

/**
 * How lit a standing or crouched body is: the brighter of the chest and head samples, so a head poking out
 * of a shadow into a lamp's pool shows. `height` is the head height above the feet (crouch lowers it).
 */
export function bodyLightLevel(reg: LightRegistry, x: number, feetY: number, z: number, height: number, occluded?: Occluder): number {
  const chest = lightLevelAt(reg, x, feetY + height * 0.6, z, occluded);
  if (chest >= 1) return 1;
  const head = lightLevelAt(reg, x, feetY + height * 0.95, z, occluded);
  return chest > head ? chest : head;
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

/** Radius of a light's bulb / fixture for shooting it out (m). */
export const BULB_RADIUS = 0.22;

/**
 * The first shootable light (on, not destroyed, destructible, fixed) a shot from (ax, ay, az) to (bx, by, bz)
 * passes within `BULB_RADIUS` of, or -1. Allocation-free.
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
    const t = ((l.x - ax) * dx + (l.y - ay) * dy + (l.z - az) * dz) / len2;
    if (t < 0 || t > 1 || t >= bt) continue;
    const px = ax + dx * t - l.x;
    const py = ay + dy * t - l.y;
    const pz = az + dz * t - l.z;
    if (px * px + py * py + pz * pz <= BULB_RADIUS * BULB_RADIUS) {
      bt = t;
      best = l.id;
    }
  }
  return best;
}
