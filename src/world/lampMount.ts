import type { FittingModel, LightDef } from './lights';

/**
 * Lamp mounting (warehouse-lamps; pure: no Babylon / DOM). Michael (2026-10-20): "The sector ops lights are not sitting
 * properly on the ceilings, some are even above ceilings or just floating." Each fixed light keeps its position (the
 * light tests, the bake, the meter and guards read it: light parity) and its fitting is mounted on what is there: the
 * ceiling right over it (a dome high-bay on a drop rod in a hall, a batten on hangers in a room); else the nearest wall
 * (a caged bulkhead on a bracket arm); else a ceiling edge within a strut's reach (a skylight gap); else a mast from the
 * roof or deck under it. A light that fits none keeps its plain box and is reported. Runs once at level build.
 */

/** The level pieces the mount reads (`BoxPiece` of `levelBuilder.ts`). */
export interface MountBox {
  c: readonly [number, number, number];
  s: readonly [number, number, number];
  yaw: number;
  detail?: boolean;
  visible?: boolean;
}

/** Each model's body (m; the light at the origin, on the emitting face): a hung model's top over the light, a bulkhead's back behind it. */
export const FITTING = {
  dome: { top: 0.26 },
  batten: { top: 0.07 },
  bulkhead: { back: 0.1, top: 0.1 },
} as const;

/** A ceiling at least this far over the floor makes a hall (a dome high-bay); lower is a room (a batten). */
export const HALL_HEIGHT = 4.5;
/** Longest drop rod (m): a ceiling further over the light does not count. */
export const MAX_DROP = 3.4;
/** Longest batten hangers (m): a batten hung further down is a dome instead. */
export const MAX_HANGER = 0.9;
/** Furthest wall face for a bracket light (m, horizontal). */
export const WALL_REACH = 1.3;
/** A bracket arm up to this long (m) is tried before a ceiling for a sign or door lamp, and before a strut for the rest. */
export const SHORT_ARM = 0.6;
/** A ceiling edge this near (m, horizontal) holds a lamp hung under a gap (a skylight strip) by a strut. */
export const STRUT_REACH = 0.7;
/** Tallest mast (m) from the roof or deck under a light with nothing over it and no wall. */
export const MAX_MAST = 3.2;
/** A mast stands this far beside its dome (m, local +x turned by the fixture yaw) with an arm over to it. */
export const MAST_OFFSET = 0.4;

export type MountBase = 'ceiling' | 'wall' | 'mast';
export type MountResult =
  | { id: number; model: FittingModel; base: MountBase; mount: number; yaw: number; strut: [number, number] | null }
  | { id: number; model: null; reason: string };

const slabLike = (b: MountBox): boolean => !b.detail && b.visible !== false && Math.min(b.s[0], b.s[2]) >= 0.6 && b.s[1] <= 0.8;

/** Does the box's plan cover (x, z)? (Local frame: the inverse of the builder's yaw.) */
function covers(b: MountBox, x: number, z: number): boolean {
  const c = Math.cos(b.yaw);
  const s = Math.sin(b.yaw);
  const dx = x - b.c[0];
  const dz = z - b.c[2];
  return Math.abs(c * dx - s * dz) <= b.s[0] / 2 && Math.abs(s * dx + c * dz) <= b.s[2] / 2;
}

/** The lowest slab underside over (x, z) whose top is above `y` (a slab the point is inside counts), and the slab; null if none. */
export function ceilingOver(boxes: readonly MountBox[], x: number, y: number, z: number): { y: number; box: MountBox } | null {
  let best: MountBox | null = null;
  let by = Infinity;
  for (const b of boxes) {
    if (!slabLike(b)) continue;
    const top = b.c[1] + b.s[1] / 2;
    const bot = b.c[1] - b.s[1] / 2;
    if (top <= y + 0.02 || bot >= by || !covers(b, x, z)) continue;
    best = b;
    by = bot;
  }
  return best ? { y: by, box: best } : null;
}

/** The highest box top under (x, z) at least 0.3 m below `y` (`slabs`: thin slabs only, the floor or deck); 0 when none. */
export function floorUnder(boxes: readonly MountBox[], x: number, y: number, z: number, slabs = true): number {
  let f = 0;
  for (const b of boxes) {
    if (b.detail || b.visible === false || (slabs && !slabLike(b))) continue;
    const top = b.c[1] + b.s[1] / 2;
    if (top > y - 0.3 || top <= f || !covers(b, x, z)) continue;
    f = top;
  }
  return f;
}

/** The nearest wall face (a tall box no thicker than 1.2 m spanning the light's height) within `WALL_REACH`: the point on it, its outward normal and the distance. */
export function wallNear(boxes: readonly MountBox[], x: number, y: number, z: number): { p: [number, number]; n: [number, number]; d: number } | null {
  let best: { p: [number, number]; n: [number, number]; d: number } | null = null;
  for (const b of boxes) {
    if (b.detail || b.visible === false) continue;
    const top = b.c[1] + b.s[1] / 2;
    const bot = b.c[1] - b.s[1] / 2;
    if (bot > y - 0.15 || top < y + 0.15 || b.s[1] < 0.6) continue;
    if (Math.min(b.s[0], b.s[2]) > 1.2 || Math.max(b.s[0], b.s[2]) < 0.8) continue;
    const c = Math.cos(b.yaw);
    const s = Math.sin(b.yaw);
    const dx = x - b.c[0];
    const dz = z - b.c[2];
    const lx = c * dx - s * dz;
    const lz = s * dx + c * dz;
    const hx = b.s[0] / 2;
    const hz = b.s[2] / 2;
    // the face the light is out from: the axis it is furthest out along (inside the plan: none)
    const ox = Math.abs(lx) - hx;
    const oz = Math.abs(lz) - hz;
    if (ox <= 0 && oz <= 0) continue;
    let nlx = 0;
    let nlz = 0;
    let d: number;
    if (ox >= oz) {
      if (Math.abs(lz) > hz + 0.05) continue; // past the face's end
      nlx = Math.sign(lx);
      d = ox;
    } else {
      if (Math.abs(lx) > hx + 0.05) continue;
      nlz = Math.sign(lz);
      d = oz;
    }
    if (d > WALL_REACH || (best && d >= best.d)) continue;
    const nx = c * nlx + s * nlz;
    const nz = -s * nlx + c * nlz;
    best = { p: [x - nx * d, z - nz * d], n: [nx, nz], d };
  }
  return best;
}

/** Yaw (a quarter-turn step) that turns local +z onto the plan direction (nx, nz). */
const yawOf = (nx: number, nz: number): number => (Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : nz > 0 ? 0 : Math.PI);

/** The nearest ceiling within `STRUT_REACH` along x or z of (x, z), and the strut to it (5 cm onto the slab). */
function ceilingBeside(boxes: readonly MountBox[], x: number, y: number, z: number): { y: number; box: MountBox; strut: [number, number] } | null {
  for (let k = 1; k * 0.1 <= STRUT_REACH + 1e-6; k++) {
    const o = k * 0.1;
    for (const [dx, dz] of [[o, 0], [-o, 0], [0, o], [0, -o]] as const) {
      const c = ceilingOver(boxes, x + dx, y, z + dz);
      if (c) return { ...c, strut: [dx + Math.sign(dx) * 0.05, dz + Math.sign(dz) * 0.05] };
    }
  }
  return null;
}

/** A sign or a door lamp (green, or a small box): it goes on a wall first. */
function wallLamp(l: LightDef): boolean {
  const f = l.fixture;
  const green = l.color[1] > l.color[0] * 1.4;
  return l.kind === 'spot' || l.y < 2.3 || green || (f !== null && Math.min(f.sx, f.sz) <= 0.2 && Math.max(f.sx, f.sz) <= 0.3);
}

/**
 * Mount one fixed light (order: see the module note; signs, door lamps and spots try the wall first). A ceiling the
 * fitting would cut into is reported, never mounted (the light's data would have to move).
 */
export function mountLight(boxes: readonly MountBox[], l: LightDef): MountResult {
  const under = (c: { y: number; box: MountBox }, strut: [number, number] | null): MountResult | null => {
    if (c.y - l.y > MAX_DROP + FITTING.dome.top) return null;
    const hall = c.y - floorUnder(boxes, l.x, l.y, l.z) >= HALL_HEIGHT;
    const md = c.y - l.y - FITTING.dome.top;
    const mb = c.y - l.y - FITTING.batten.top;
    const fits = (m: number): boolean => m >= -0.005;
    const model: FittingModel | null = hall && fits(md) ? 'dome' : fits(mb) && mb <= MAX_HANGER ? 'batten' : fits(md) ? 'dome' : fits(mb) ? 'batten' : null;
    if (!model) return { id: l.id, model: null, reason: `cuts its ceiling (${c.y.toFixed(2)}) by ${(-mb).toFixed(2)} m` };
    const mount = Math.max(0, model === 'dome' ? md : mb);
    // a batten runs along its ceiling's long side
    const yaw = model === 'batten' ? (c.box.s[0] >= c.box.s[2] ? 0 : Math.PI / 2) + c.box.yaw : 0;
    return { id: l.id, model, base: 'ceiling', mount, yaw, strut };
  };
  const overhead = (): MountResult | null => {
    const c = ceilingOver(boxes, l.x, l.y, l.z);
    return c ? under(c, null) : null;
  };
  const wall = (reach: number): MountResult | null => {
    const w = wallNear(boxes, l.x, l.y, l.z);
    if (!w || w.d > reach) return null;
    const mount = w.d - FITTING.bulkhead.back;
    // closer than the body's depth: not this wall (the light's data would have to move)
    if (mount < -0.005) return null;
    return { id: l.id, model: 'bulkhead', base: 'wall', mount: Math.max(0, mount), yaw: yawOf(w.n[0], w.n[1]), strut: null };
  };
  const beside = (): MountResult | null => {
    const c = ceilingBeside(boxes, l.x, l.y, l.z);
    return c ? under(c, c.strut) : null;
  };
  // a mast beside the dome (local +x turned by the yaw: the first side with a roof or deck under it)
  const mast = (): MountResult | null => {
    const head = l.y + FITTING.dome.top + 0.12;
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const foot = floorUnder(boxes, l.x + Math.cos(yaw) * MAST_OFFSET, l.y, l.z - Math.sin(yaw) * MAST_OFFSET, false);
      const h = head - foot;
      if (foot > 0 && h <= MAX_MAST) return { id: l.id, model: 'dome', base: 'mast', mount: h, yaw, strut: null };
    }
    return null;
  };
  // a short bracket beats a hung fitting for a sign or door lamp; a long one is the last resort before a mast
  const r = wallLamp(l)
    ? wall(SHORT_ARM + FITTING.bulkhead.back) ?? overhead() ?? wall(WALL_REACH) ?? beside() ?? mast()
    : overhead() ?? wall(SHORT_ARM + FITTING.bulkhead.back) ?? beside() ?? wall(WALL_REACH) ?? mast();
  return r ?? { id: l.id, model: null, reason: 'no ceiling, wall or roof in reach' };
}

/**
 * Mount every fixed light of a registry (Sector Ops' build): the fixture gains the model and its mount. Its box (`sx`,
 * `sy`, `sz`, `oy`) stays as authored: the lamp bake samples that emitter (`lightBake.bakedLights`), night vision's glare
 * and the shot test read it, so the light values do not move. Returns each light's result; the exceptions (`model: null`)
 * keep their plain box. Flashlights and bare bulbs are skipped.
 */
export function mountLights(boxes: readonly MountBox[], lights: readonly LightDef[]): MountResult[] {
  const out: MountResult[] = [];
  for (const l of lights) {
    if (l.kind === 'flashlight' || !l.fixture) continue;
    const r = mountLight(boxes, l);
    out.push(r);
    if (r.model === null) continue;
    l.fixture = { ...l.fixture, model: r.model, base: r.base, yaw: r.yaw, mount: r.mount, ...(r.strut ? { strut: r.strut } : {}) };
  }
  return out;
}

/** A hung model's body top over its light (m). */
const topOf = (m: FittingModel): number => FITTING[m].top;

/** Link thickness (m): a drop rod, a batten hanger, a bracket arm, a strut, a mast. */
export const LINK = { rod: 0.03, hanger: 0.012, arm: 0.04, strut: 0.05, mast: 0.07 } as const;
/** Batten hangers stand this far each side of its middle (m, along it). */
const HANGER_AT = 0.45;

/**
 * The mount's links (rods, hangers, arms, struts, a mast) as segments appended to `out`: [x0, y0, z0, x1, y1, z1,
 * thickness] each. Built once at level load (`LightRig`); the tests read the ends.
 */
export function mountLinks(l: LightDef, out: number[]): void {
  const f = l.fixture;
  if (!f?.model) return;
  const m = f.mount ?? 0;
  const yaw = f.yaw ?? 0;
  const sx = f.strut?.[0] ?? 0;
  const sz = f.strut?.[1] ?? 0;
  if (f.base === 'wall') {
    const b = FITTING.bulkhead.back;
    const ux = Math.sin(yaw);
    const uz = Math.cos(yaw);
    if (m > 0.005) out.push(l.x - ux * b, l.y, l.z - uz * b, l.x - ux * (b + m), l.y, l.z - uz * (b + m), LINK.arm);
    return;
  }
  if (f.base === 'mast') {
    const top = l.y + FITTING.dome.top;
    const head = top + 0.12;
    const px = l.x + Math.cos(yaw) * MAST_OFFSET;
    const pz = l.z - Math.sin(yaw) * MAST_OFFSET;
    out.push(px, head - m, pz, px, head, pz, LINK.mast);
    out.push(px, head, pz, l.x, head, l.z, LINK.arm);
    out.push(l.x, top, l.z, l.x, head, l.z, LINK.rod);
    return;
  }
  const top = l.y + topOf(f.model);
  const ceil = top + m;
  if (f.model === 'batten') {
    // along the batten: local +x turned by the yaw
    const ax = Math.cos(yaw) * HANGER_AT;
    const az = -Math.sin(yaw) * HANGER_AT;
    for (const k of [-1, 1]) {
      const hx = l.x + ax * k;
      const hz = l.z + az * k;
      if (m > 0.005) out.push(hx, top, hz, hx, ceil, hz, LINK.hanger);
      if (sx || sz) out.push(hx, ceil, hz, hx + sx, ceil, hz + sz, LINK.strut);
    }
    return;
  }
  if (m > 0.005) out.push(l.x, top, l.z, l.x, ceil, l.z, LINK.rod);
  if (sx || sz) out.push(l.x, ceil, l.z, l.x + sx, ceil, l.z + sz, LINK.strut);
}

/** Where the mount meets the structure: the rod or hanger top (strut end included), the arm's wall end, the mast's foot. */
export function mountEnd(l: LightDef): [number, number, number] | null {
  const f = l.fixture;
  if (!f?.model) return null;
  const m = f.mount ?? 0;
  const yaw = f.yaw ?? 0;
  if (f.base === 'wall') {
    const back = FITTING.bulkhead.back + m;
    return [l.x - Math.sin(yaw) * back, l.y, l.z - Math.cos(yaw) * back];
  }
  if (f.base === 'mast') return [l.x + Math.cos(yaw) * MAST_OFFSET, l.y + FITTING.dome.top + 0.12 - m, l.z - Math.sin(yaw) * MAST_OFFSET];
  return [l.x + (f.strut?.[0] ?? 0), l.y + topOf(f.model) + m, l.z + (f.strut?.[1] ?? 0)];
}
