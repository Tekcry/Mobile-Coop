import { Mesh, VertexData, type Scene } from '../core/babylon';

/**
 * Smooth unit meshes for characters, gear and weapons. Every shape is a surface of revolution
 * (profile -> rings) or a superellipsoid, built with shared vertices (no seams, smooth normals).
 * Two tessellation levels per shape: `hi` near the camera and `lo` as an LOD level.
 */

/** Profile point: radius `r` at height `y`. A first/last point with r = 0 becomes a pole. */
export type Profile = readonly (readonly [number, number])[];

export interface Detail {
  segments: number;
  /** Extra subdivisions per profile span (smoother curves). */
  sub: number;
}

/** Catmull-Rom-ish resample of a profile so curves stay round with few authored points. */
function resample(profile: Profile, sub: number): [number, number][] {
  if (sub <= 1) return profile.map(([r, y]) => [r, y]);
  const out: [number, number][] = [];
  const pt = (i: number): readonly [number, number] => profile[Math.max(0, Math.min(profile.length - 1, i))]!;
  for (let i = 0; i < profile.length - 1; i++) {
    const p0 = pt(i - 1);
    const p1 = pt(i);
    const p2 = pt(i + 1);
    const p3 = pt(i + 2);
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, cr(p0[0], p1[0], p2[0], p3[0])), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const last = profile[profile.length - 1]!;
  out.push([last[0], last[1]]);
  // keep authored poles exact
  if (profile[0]![0] === 0) out[0]![0] = 0;
  if (last[0] === 0) out[out.length - 1]![0] = 0;
  return out;
}

/** Revolve a profile around Y. `exp` > 2 squares the cross-section (superellipse) for torsos/boots. */
export function revolve(name: string, scene: Scene, profile: Profile, d: Detail, exp = 2): Mesh {
  const pts = resample(profile, d.sub);
  const positions: number[] = [];
  const indices: number[] = [];
  const ringStart: number[] = [];
  const seg = d.segments;
  const e = 2 / exp;
  const cs: number[] = [];
  const sn: number[] = [];
  for (let j = 0; j < seg; j++) {
    const a = (j / seg) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    cs.push(Math.sign(c) * Math.pow(Math.abs(c), e));
    sn.push(Math.sign(s) * Math.pow(Math.abs(s), e));
  }
  for (const [r, y] of pts) {
    ringStart.push(positions.length / 3);
    if (r === 0) {
      positions.push(0, y, 0);
      continue;
    }
    for (let j = 0; j < seg; j++) positions.push(cs[j]! * r, y, sn[j]! * r);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a0 = ringStart[i]!;
    const b0 = ringStart[i + 1]!;
    const aPole = pts[i]![0] === 0;
    const bPole = pts[i + 1]![0] === 0;
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      if (aPole && bPole) continue;
      if (aPole) indices.push(a0, b0 + j1, b0 + j);
      else if (bPole) indices.push(a0 + j, a0 + j1, b0);
      else indices.push(a0 + j, a0 + j1, b0 + j1, a0 + j, b0 + j1, b0 + j);
    }
  }
  return build(name, scene, positions, indices);
}

/** Superellipsoid (rounded box at exp ~4-6, sphere at 2). Unit size (extent -0.5..0.5). */
export function superellipsoid(name: string, scene: Scene, exp: number, rings: number, segments: number): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const e = 2 / exp;
  const f = (v: number): number => Math.sign(v) * Math.pow(Math.abs(v), e);
  positions.push(0, 0.5, 0);
  for (let i = 1; i < rings; i++) {
    const v = (i / rings) * Math.PI;
    const cy = f(Math.cos(v));
    const sy = f(Math.sin(v));
    for (let j = 0; j < segments; j++) {
      const u = (j / segments) * Math.PI * 2;
      positions.push(f(Math.cos(u)) * sy * 0.5, cy * 0.5, f(Math.sin(u)) * sy * 0.5);
    }
  }
  positions.push(0, -0.5, 0);
  const bottom = positions.length / 3 - 1;
  for (let j = 0; j < segments; j++) indices.push(0, 1 + ((j + 1) % segments), 1 + j);
  for (let i = 0; i < rings - 2; i++) {
    const a0 = 1 + i * segments;
    const b0 = a0 + segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      indices.push(a0 + j, a0 + j1, b0 + j1, a0 + j, b0 + j1, b0 + j);
    }
  }
  const last = 1 + (rings - 2) * segments;
  for (let j = 0; j < segments; j++) indices.push(last + j, last + ((j + 1) % segments), bottom);
  return build(name, scene, positions, indices);
}

function build(name: string, scene: Scene, positions: number[], indices: number[]): Mesh {
  // generators emit counter-clockwise triangles (seen from outside); Babylon's front faces are clockwise
  for (let i = 0; i < indices.length; i += 3) {
    const t = indices[i + 1]!;
    indices[i + 1] = indices[i + 2]!;
    indices[i + 2] = t;
  }
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  vd.normals = normals;
  const mesh = new Mesh(name, scene);
  vd.applyToMesh(mesh, false);
  return mesh;
}

// ---- profiles (unit sized) -------------------------------------------------------------------

const circle = (n: number, r = 0.5, cy = 0): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 - (i / n) * Math.PI;
    out.push([i === 0 || i === n ? 0 : Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
};

/** Sphere of diameter 1. */
export const SPHERE: Profile = circle(8);

/** Limb hanging from its joint at y = 0 down to y = -1. Radius 0.5 at the top; `ratio` at the bottom;
 *  `bulge` adds a muscle swell around `at`. Ends are closed (hidden inside the joint spheres). */
export function limbProfile(ratio: number, bulge: number, at: number): Profile {
  const pts: [number, number][] = [[0, 0.03]];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const base = 0.5 + (ratio * 0.5 - 0.5) * t;
    const sw = bulge * Math.exp(-((t - at) ** 2) / 0.05);
    pts.push([base + sw, -t]);
  }
  pts.push([0, -1.03]);
  return pts;
}

/** Torso from the waist (y = 0) to the base of the neck (y = 1): chest swell, sloped shoulders. */
export const TORSO: Profile = [
  [0, -0.02],
  [0.41, 0],
  [0.42, 0.2],
  [0.46, 0.42],
  [0.5, 0.64],
  [0.5, 0.78],
  [0.45, 0.9],
  [0.3, 0.98],
  [0, 1.02],
];

/** Half-dome (skull cap / hair / helmet shell) with the rim at y = 0, top at y = 0.5. */
export const DOME: Profile = [
  [0, 0.5],
  [0.25, 0.44],
  [0.4, 0.33],
  [0.48, 0.17],
  [0.5, 0.02],
  [0.49, -0.02],
  [0.44, -0.03],
  [0, -0.02],
];

/** Combat helmet: dome with a flared, rolled rim at the back and sides. */
export const HELMET: Profile = [
  [0, 0.5],
  [0.26, 0.45],
  [0.42, 0.33],
  [0.5, 0.15],
  [0.53, -0.02],
  [0.56, -0.1],
  [0.54, -0.13],
  [0.48, -0.08],
  [0, 0],
];

/** Cylinder with rounded edges, height 1 (y -0.5..0.5), diameter 1. */
export const ROUND_CYL: Profile = [
  [0, -0.5],
  [0.38, -0.5],
  [0.47, -0.47],
  [0.5, -0.38],
  [0.5, 0.38],
  [0.47, 0.47],
  [0.38, 0.5],
  [0, 0.5],
];

/** Capsule of height 1 and diameter 0.5 (hemispherical ends). */
export const CAPSULE: Profile = (() => {
  const top = circle(4, 0.25, 0.25).slice(0, 3);
  const bot = circle(4, 0.25, -0.25).slice(2);
  return [...top, ...bot];
})();
