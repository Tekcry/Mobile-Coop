import { Color3, StandardMaterial, type Scene } from '../core/babylon';

const cache = new WeakMap<Scene, Map<string, StandardMaterial>>();

/** Flat, matte, frozen material cached per scene+colour. Stylised low-poly look. */
export function flatMat(scene: Scene, hex: string, opts: { emissive?: number; alpha?: number } = {}): StandardMaterial {
  let m = cache.get(scene);
  if (!m) {
    m = new Map();
    cache.set(scene, m);
  }
  const key = `${hex}|${opts.emissive ?? 0}|${opts.alpha ?? 1}`;
  const hit = m.get(key);
  if (hit) return hit;
  const mat = new StandardMaterial(`flat-${key}`, scene);
  const c = Color3.FromHexString(hex);
  mat.diffuseColor = c;
  mat.specularColor = Color3.Black();
  if (opts.emissive) mat.emissiveColor = c.scale(opts.emissive);
  if (opts.alpha !== undefined && opts.alpha < 1) mat.alpha = opts.alpha;
  else mat.freeze();
  m.set(key, mat);
  return mat;
}

export const PALETTE = {
  sky: '#8fb8de',
  skyHorizon: '#cfe3f1',
  ground: '#6f8f5a',
  concrete: '#9aa3a8',
  concreteDark: '#6c757b',
  wall: '#c9b79c',
  wallDark: '#9e8b72',
  crate: '#b9824a',
  crateDark: '#8a5c31',
  metal: '#59636b',
  accent: '#ff8a1e',
  hazard: '#f2c230',
  red: '#d9493b',
  blue: '#3f7fd9',
  barrel: '#c0392b',
};
