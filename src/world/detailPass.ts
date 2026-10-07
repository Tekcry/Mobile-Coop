/**
 * Map detail pass (3.0, pure, unit-tested): visual-only dressing generated from a level's own pieces - skirting
 * along wall bases, conduit and junction boxes along walls, wall boxes, vents and signs, stains, puddles and debris
 * on floors. Every piece it adds is non-colliding, flagged `detail` and `noLedge`, so collision, the nav grid,
 * cover faces, ledges and perception are exactly the same with or without it (a test checks). Deterministic per
 * map. 'ultra' adds the wall dressing, 'epic' the floor clutter too; 'high' adds nothing.
 */
import type { BoxPiece } from './levelBuilder';
import type { TierQuality } from '../core/quality';

/** Mulberry32 (local: this module stays dependency-free). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Darken / lighten a #rrggbb by k (multiplier). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const SIGN_COLORS = ['#d8b22c', '#c9cdd1', '#2f6fb3', '#b33a2f', '#3a8f4f'];

/** The dressing pieces for `boxes` (not modifying them). */
export function detailPieces(boxes: readonly BoxPiece[], mapId: string, tier: TierQuality): BoxPiece[] {
  if (tier === 'high') return [];
  const r = rng(hashString(mapId));
  const out: BoxPiece[] = [];
  const add = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string, yaw: number): void => {
    out.push({ c: [cx, cy, cz], s: [sx, sy, sz], yaw, pitch: 0, color, collide: false, visible: true, noLedge: true, detail: true });
  };
  for (const b of boxes) {
    if (!b.collide || b.visible === false || Math.abs(b.pitch) > 1e-3 || b.detail) continue;
    const [sx, sy, sz] = b.s;
    const bottom = b.c[1] - sy / 2;
    const top = b.c[1] + sy / 2;
    // walls: tall, thin, long
    const thin = Math.min(sx, sz);
    const len = Math.max(sx, sz);
    if (sy >= 2.2 && thin <= 0.7 && len >= 2) {
      const alongX = sx >= sz;
      const cos = Math.cos(b.yaw);
      const sin = Math.sin(b.yaw);
      // local axis along the wall (u) and its normal (n) in world space
      const ux = alongX ? cos : sin;
      const uz = alongX ? -sin : cos;
      const nx = -uz;
      const nz = ux;
      const yaw = alongX ? b.yaw : b.yaw + Math.PI / 2;
      for (const side of [1, -1]) {
        const off = thin / 2 + 0.015;
        const px = b.c[0] + nx * off * side;
        const pz = b.c[2] + nz * off * side;
        // skirting at the base
        add(px + nx * 0.005 * side, bottom + 0.07, pz + nz * 0.005 * side, len - 0.04, 0.14, 0.03, shade(b.color, 0.62), yaw);
        // conduit along the top on one side in two, with junction boxes
        if (r() < 0.5 && top - bottom > 2.4) {
          const h = Math.min(top - 0.3, bottom + 2.7);
          add(px + nx * 0.04 * side, h, pz + nz * 0.04 * side, len - 0.1, 0.05, 0.05, '#6b7075', yaw);
          for (let s = -len / 2 + 0.8; s < len / 2 - 0.5; s += 2.5 + r() * 2) {
            add(px + ux * s + nx * 0.06 * side, h, pz + uz * s + nz * 0.06 * side, 0.16, 0.16, 0.08, '#585d62', yaw);
            // a drop down to a switch / socket now and then
            if (r() < 0.35) {
              const dh = h - (bottom + 1.3);
              add(px + ux * s + nx * 0.04 * side, bottom + 1.3 + dh / 2, pz + uz * s + nz * 0.04 * side, 0.04, dh, 0.04, '#6b7075', yaw);
              add(px + ux * s + nx * 0.05 * side, bottom + 1.25, pz + uz * s + nz * 0.05 * side, 0.12, 0.16, 0.05, '#c9ccd0', yaw);
            }
          }
        }
        // boxes, vents and signs every few metres
        for (let s = -len / 2 + 1; s < len / 2 - 1; s += 3 + r() * 3) {
          const k = r();
          const sx2 = px + ux * s;
          const sz2 = pz + uz * s;
          if (k < 0.18) add(sx2 + nx * 0.06 * side, bottom + 1.5, sz2 + nz * 0.06 * side, 0.4, 0.55, 0.12, '#7a8086', yaw); // electrical box
          else if (k < 0.3 && top - bottom > 2.6) add(sx2 + nx * 0.02 * side, bottom + 2.2, sz2 + nz * 0.02 * side, 0.6, 0.3, 0.04, '#2a2e33', yaw); // vent
          else if (k < 0.4) add(sx2 + nx * 0.02 * side, bottom + 1.75, sz2 + nz * 0.02 * side, 0.5, 0.35, 0.02, SIGN_COLORS[Math.floor(r() * SIGN_COLORS.length)]!, yaw); // sign
        }
      }
      continue;
    }
    // floors: stains, puddles, debris (epic)
    if (tier === 'epic' && sy <= 0.6 && sx * sz >= 16 && top < 6) {
      const n = Math.min(14, Math.floor((sx * sz) / 30));
      for (let i = 0; i < n; i++) {
        const x = b.c[0] + (r() - 0.5) * (sx - 1);
        const z = b.c[2] + (r() - 0.5) * (sz - 1);
        const k = r();
        if (k < 0.45) add(x, top + 0.004, z, 0.6 + r() * 1.6, 0.006, 0.5 + r() * 1.4, shade(b.color, 0.72), r() * Math.PI); // stain
        else if (k < 0.65) add(x, top + 0.005, z, 0.4 + r() * 1.1, 0.006, 0.3 + r() * 0.8, '#1d252b', r() * Math.PI); // puddle
        else {
          // a scatter of debris
          for (let j = 0; j < 4; j++) {
            const d = 0.05 + r() * 0.12;
            add(x + (r() - 0.5) * 0.8, top + d / 2, z + (r() - 0.5) * 0.8, d * (1 + r()), d, d * (1 + r()), shade(b.color, 0.5 + r() * 0.4), r() * Math.PI);
          }
        }
      }
    }
  }
  return out;
}
