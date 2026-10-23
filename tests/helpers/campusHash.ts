/**
 * (sector-redesign ART-KIT A119) A content hash of a level builder's greybox: every box (centre, size, yaw, pitch, colour,
 * flags) and cylinder, numbers to 1e-6, FNV-1a 32 over the canonical text. The campus greybox hash at the ART-KIT cut
 * commit (b26c5925) is the snapshot `buildCampus(b, { dress: false })` must keep.
 */
import type { LevelBuilder } from '../../src/world/levelBuilder';

const n = (v: number): string => (Math.round(v * 1e6) / 1e6).toString();

export function greyboxText(b: Pick<LevelBuilder, 'boxes' | 'cylinders'>): string {
  const out: string[] = [];
  for (const x of b.boxes) {
    out.push(['b', ...x.c.map(n), ...x.s.map(n), n(x.yaw), n(x.pitch), x.color, x.collide ? 1 : 0, x.visible === false ? 0 : 1, x.noLedge ? 1 : 0, x.overhead ? 1 : 0, x.detail ? 1 : 0, x.glass ?? ''].join(','));
  }
  for (const c of b.cylinders) out.push(['c', ...c.c.map(n), n(c.r), n(c.h), c.color, c.collide ? 1 : 0].join(','));
  return out.join('\n');
}

export function greyboxHash(b: Pick<LevelBuilder, 'boxes' | 'cylinders'>): string {
  const s = greyboxText(b);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${b.boxes.length}/${b.cylinders.length}/${(h >>> 0).toString(16)}`;
}
