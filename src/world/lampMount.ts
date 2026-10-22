import type { FittingModel, LightDef } from './lights';

/**
 * Lamp mounting (warehouse-lamps, reworked for the LED family in sector-fixes L; pure: no Babylon / DOM). Each fixed
 * light of Sector Ops carries its model and base from its room's table (`maps/lampRooms.ts`): a panel flush under its
 * ceiling, a strip on two wires under a roof, a bulkhead on a wall. This pass measures the mount from the level's
 * boxes (the wire length, the gap to the wall) and reports any fitting that would cut its ceiling, hang in the air or
 * miss its wall; the light itself never moves (the bake, the meter and guards read it: light parity). Runs once at
 * level build.
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
  panel: { top: 0.04 },
  strip: { top: 0.055 },
  bulkhead: { back: 0.07, top: 0.08 },
} as const;

/** A panel sits flush: at most this gap (m) between its top and the ceiling. */
export const PANEL_GAP = 0.03;
/** Longest strip wires (m). */
export const MAX_HANGER = 0.6;
/** Longest bulkhead bracket from its wall (m): a wall light stands 0.3 m off the face so the bake sees past its wall. */
export const WALL_GAP = 0.35;
/** The wires stand this far each side of a strip's middle (m, along it). */
export const HANGER_AT = 0.45;

export type MountResult = { id: number; model: FittingModel; mount: number; yaw: number } | { id: number; model: null; reason: string };

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

/** The nearest wall face (a box at least 0.6 m tall spanning the light's height) within 1.3 m: the point on it, its outward normal and the distance. */
export function wallNear(boxes: readonly MountBox[], x: number, y: number, z: number): { p: [number, number]; n: [number, number]; d: number } | null {
  let best: { p: [number, number]; n: [number, number]; d: number } | null = null;
  for (const b of boxes) {
    if (b.detail || b.visible === false) continue;
    const top = b.c[1] + b.s[1] / 2;
    const bot = b.c[1] - b.s[1] / 2;
    if (bot > y - 0.15 || top < y + 0.15 || b.s[1] < 0.6) continue;
    if (Math.max(b.s[0], b.s[2]) < 0.8) continue;
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
    if (d > 1.3 || (best && d >= best.d)) continue;
    const nx = c * nlx + s * nlz;
    const nz = -s * nlx + c * nlz;
    best = { p: [x - nx * d, z - nz * d], n: [nx, nz], d };
  }
  return best;
}

/** Yaw (a quarter-turn step) that turns local +z onto the plan direction (nx, nz). */
const yawOf = (nx: number, nz: number): number => (Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : nz > 0 ? 0 : Math.PI);

/** Mount one fitted light on its ceiling or wall (its model and base come from its room). */
export function mountLight(boxes: readonly MountBox[], l: LightDef): MountResult {
  const f = l.fixture;
  if (!f?.model) return { id: l.id, model: null, reason: 'no model' };
  if (f.base === 'wall') {
    const w = wallNear(boxes, l.x, l.y, l.z);
    if (!w) return { id: l.id, model: null, reason: 'no wall in reach' };
    const mount = w.d - FITTING.bulkhead.back;
    if (mount < -0.005) return { id: l.id, model: null, reason: `${(-mount).toFixed(2)} m into its wall` };
    if (mount > WALL_GAP) return { id: l.id, model: null, reason: `${mount.toFixed(2)} m off its wall` };
    return { id: l.id, model: f.model, mount: Math.max(0, mount), yaw: yawOf(w.n[0], w.n[1]) };
  }
  const c = ceilingOver(boxes, l.x, l.y, l.z);
  if (!c) return { id: l.id, model: null, reason: 'nothing over it' };
  const top = f.model === 'strip' ? FITTING.strip.top : FITTING.panel.top;
  const mount = c.y - l.y - top;
  if (mount < -0.005) return { id: l.id, model: null, reason: `cuts its ceiling (${c.y.toFixed(2)}) by ${(-mount).toFixed(2)} m` };
  if (f.model === 'panel' && mount > PANEL_GAP) return { id: l.id, model: null, reason: `panel ${mount.toFixed(2)} m under its ceiling` };
  if (f.model === 'strip' && mount > MAX_HANGER) return { id: l.id, model: null, reason: `wires ${mount.toFixed(2)} m` };
  return { id: l.id, model: f.model, mount: Math.max(0, mount), yaw: f.yaw ?? 0 };
}

/**
 * Mount every fitted light of a registry (Sector Ops' build): the fixture gains its mount length and, on a wall, its
 * facing. Returns each light's result; a failure (`model: null`) keeps the model at mount 0 and is reported by
 * `tests/warehouseLamps.test.ts`. Flashlights and lights without a model are skipped.
 */
export function mountLights(boxes: readonly MountBox[], lights: readonly LightDef[]): MountResult[] {
  const out: MountResult[] = [];
  for (const l of lights) {
    if (l.kind === 'flashlight' || !l.fixture?.model) continue;
    const r = mountLight(boxes, l);
    out.push(r);
    if (r.model === null) continue;
    l.fixture = { ...l.fixture, yaw: r.yaw, mount: r.mount };
  }
  return out;
}

/** Link thickness (m): a strip wire, a bulkhead stand-off. */
export const LINK = { wire: 0.008, standoff: 0.04 } as const;

/**
 * The mount's links (strip wires, a bulkhead stand-off) as segments appended to `out`: [x0, y0, z0, x1, y1, z1,
 * thickness] each. A flush panel has none. Built once at level load (`LightRig`); the tests read the ends.
 */
export function mountLinks(l: LightDef, out: number[]): void {
  const f = l.fixture;
  if (!f?.model) return;
  const m = f.mount ?? 0;
  const yaw = f.yaw ?? 0;
  if (f.base === 'wall') {
    const b = FITTING.bulkhead.back;
    const ux = Math.sin(yaw);
    const uz = Math.cos(yaw);
    if (m > 0.005) out.push(l.x - ux * b, l.y, l.z - uz * b, l.x - ux * (b + m), l.y, l.z - uz * (b + m), LINK.standoff);
    return;
  }
  if (f.model !== 'strip' || m <= 0.005) return;
  const top = l.y + FITTING.strip.top;
  // along the strip: local +x turned by the yaw
  const ax = Math.cos(yaw) * HANGER_AT;
  const az = -Math.sin(yaw) * HANGER_AT;
  for (const k of [-1, 1]) out.push(l.x + ax * k, top, l.z + az * k, l.x + ax * k, top + m, l.z + az * k, LINK.wire);
}

/** Where the mount meets the structure: the wire or panel top, the wall point behind a bulkhead. */
export function mountEnd(l: LightDef): [number, number, number] | null {
  const f = l.fixture;
  if (!f?.model) return null;
  const m = f.mount ?? 0;
  const yaw = f.yaw ?? 0;
  if (f.base === 'wall') {
    const back = FITTING.bulkhead.back + m;
    return [l.x - Math.sin(yaw) * back, l.y, l.z - Math.cos(yaw) * back];
  }
  return [l.x, l.y + (f.model === 'strip' ? FITTING.strip.top : FITTING.panel.top) + m, l.z];
}
