// Shared helpers for the Kestrel plan tools (plans.mjs now, check.mjs and expand.mjs in Parts B and C).
// No rule number lives here: numbers come from facts.json (see the _about line there).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
const EPS = 1e-6;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** facts.json as a lookup. fact('door.singleWidth') is the value, or undefined (a check then prints SKIP (no fact)). */
export function loadFacts(file = path.join(HERE, 'facts.json')) {
  const raw = readJson(file);
  const leaf = (p) => {
    let o = raw;
    for (const k of p.split('.')) {
      if (o == null || typeof o !== 'object') return undefined;
      o = o[k];
    }
    return o && typeof o === 'object' && 'value' in o ? o : undefined;
  };
  const fact = (p) => leaf(p)?.value;
  const src = (p) => leaf(p)?.src;
  /** Like fact, but a missing fact is an error (the renderer needs every drawing number). */
  const need = (p) => {
    const v = fact(p);
    if (v === undefined) throw new Error(`facts.json: missing fact ${p}`);
    return v;
  };
  return { raw, fact, src, need };
}

export const rectW = (r) => r[2] - r[0];
export const rectD = (r) => r[3] - r[1];
export const rectCentre = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
export const near = (a, b) => Math.abs(a - b) < EPS;
export const inRect = (r, x, z) => x >= r[0] - EPS && x <= r[2] + EPS && z >= r[1] - EPS && z <= r[3] + EPS;

export function wallLength(w) {
  return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
}

/** Point on a wall at distance `at` from end a. */
export function wallPoint(w, at) {
  const L = wallLength(w);
  const d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  return { p: [w.a[0] + d[0] * at, w.a[1] + d[1] * at], d, n: [-d[1], d[0]] };
}

/** Thickest wall on `level` that runs along one edge of `rect`. Edge: 0 west, 1 south, 2 east, 3 north. 0 if none. */
export function edgeThickness(rect, edge, level, walls) {
  let t = 0;
  for (const w of walls) {
    if (w.level !== level) continue;
    const vert = near(w.a[0], w.b[0]);
    const horiz = near(w.a[1], w.b[1]);
    if (edge === 0 || edge === 2) {
      const x = edge === 0 ? rect[0] : rect[2];
      if (!vert || !near(w.a[0], x)) continue;
      if (Math.min(Math.max(w.a[1], w.b[1]), rect[3]) - Math.max(Math.min(w.a[1], w.b[1]), rect[1]) > EPS) t = Math.max(t, w.t);
    } else {
      const z = edge === 1 ? rect[1] : rect[3];
      if (!horiz || !near(w.a[1], z)) continue;
      if (Math.min(Math.max(w.a[0], w.b[0]), rect[2]) - Math.max(Math.min(w.a[0], w.b[0]), rect[0]) > EPS) t = Math.max(t, w.t);
    }
  }
  return t;
}

/** Wall-centreline rect minus half of each wall thickness (RULES section 6). */
export function clearRect(room, walls) {
  const r = room.rect;
  const t = [0, 1, 2, 3].map((e) => edgeThickness(r, e, room.level, walls));
  return [r[0] + t[0] / 2, r[1] + t[1] / 2, r[2] - t[2] / 2, r[3] - t[3] / 2];
}

/** The level object for a level reference given as an id ("G") or a name ("Ground", "ground"). */
export function findLevel(levels, ref) {
  return levels.find((l) => l.id === ref) ?? levels.find((l) => l.name?.toLowerCase() === String(ref).toLowerCase());
}
