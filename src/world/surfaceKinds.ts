/**
 * Which procedural surface a level piece wears (pure, unit-tested): floors by what is underfoot (the footstep
 * surface areas, the map's default), everything else by its colour - green growth, brown timber, dark orange rust,
 * strong colours as painted metal, blue-grey bare metal, warm pale plaster, tall red-brown brick, the rest concrete.
 */
import type { Surface } from './surfaces';
import type { SurfaceKind } from './surfaceAtlas';

/** Hue (deg), saturation, value of a #rrggbb colour. */
export function hsv(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max > 0 ? d / max : 0, max];
}

/** The floor texture for a footstep surface (a gravel default reads by colour: grass, gravel or asphalt). */
export function floorKind(under: Surface, hex: string): SurfaceKind {
  switch (under) {
    case 'concrete':
      return 'concreteFloor';
    case 'metal':
    case 'grate':
      return 'checker';
    case 'wood':
      return 'wood';
    case 'carpet':
      return 'carpet';
    case 'gravel': {
      const [h, s, v] = hsv(hex);
      if (h >= 70 && h <= 170 && s > 0.18) return 'grass';
      if (v < 0.35 && s < 0.25) return 'asphalt';
      return 'gravel';
    }
  }
}

/** A piece's surface from its size and colour; `under` is the footstep surface at a floor piece's top. */
export function pieceKind(hex: string, sx: number, sy: number, sz: number, under: Surface | null): SurfaceKind {
  const floor = sy <= 0.35 && sx * sz >= 4;
  if (floor && under) return floorKind(under, hex);
  const [h, s, v] = hsv(hex);
  if (h >= 70 && h <= 170 && s > 0.2) return 'grass';
  if (v < 0.22) return 'rubber';
  if (h >= 5 && h <= 28 && s > 0.45 && v < 0.58 && sy < 2.5) return 'rust';
  if (h >= 0 && h <= 25 && s > 0.4 && sy >= 2 && v >= 0.35) return 'brick';
  if (h >= 18 && h <= 48 && s > 0.35 && v >= 0.25) return 'wood';
  if (s > 0.42) return 'corrugated';
  if (h >= 185 && h <= 240 && s > 0.15 && v < 0.6) return 'brushed';
  if (h >= 20 && h <= 55 && s >= 0.12 && v >= 0.5) return 'plaster';
  return floor ? 'concreteFloor' : 'concrete';
}
