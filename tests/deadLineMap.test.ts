/* eslint-disable @typescript-eslint/no-explicit-any */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { deadLine, DEAD_LINE_DEBUG, DEAD_LINE_Y } from '../src/world/maps/deadLine';
import { isListedMap } from '../src/world/maps/listed';

/** Dead Line G1: the built geometry against the design JSON (`docs/design/map-dead-line.json`), tolerance 0.25 m. */
const D = JSON.parse(readFileSync('docs/design/map-dead-line.json', 'utf8')) as any;
const TOL = 0.25;
const HEADROOM = 1.7;
const Y = DEAD_LINE_Y as Record<string, number>;

const b = new LevelBuilder();
const layout = deadLine.build(b, 0);

interface Piece {
  bottom: number;
  top: number;
}
function piecesAt(x: number, z: number): Piece[] {
  const out: Piece[] = [];
  for (const p of b.boxes) {
    if (!p.collide) continue;
    const dx = x - p.c[0];
    const dz = z - p.c[2];
    if (Math.abs(p.pitch) < 1e-3) {
      const c = Math.cos(-p.yaw);
      const s = Math.sin(-p.yaw);
      const lx = c * dx + s * dz;
      const lz = -s * dx + c * dz;
      if (Math.abs(lx) <= p.s[0] / 2 && Math.abs(lz) <= p.s[2] / 2) out.push({ bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 });
    } else {
      const th = Math.abs(p.pitch);
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      const a = dx * fx + dz * fz;
      const l = dx * fz - dz * fx;
      if (Math.abs(l) > p.s[0] / 2 || Math.abs(a) > (p.s[2] * Math.cos(th)) / 2) continue;
      const top = p.c[1] + p.s[1] / 2 / Math.cos(th) + Math.tan(th) * a;
      out.push({ bottom: top - p.s[1] / Math.cos(th), top });
    }
  }
  return out;
}
/** Walkable surface heights at (x, z): a piece top with standing room over it. */
function surfaces(x: number, z: number): number[] {
  const ps = piecesAt(x, z);
  const out: number[] = [];
  for (const p of ps) {
    const at = p.top + 0.02;
    if (ps.some((q) => q !== p && q.bottom < at && q.top > at)) continue;
    let ceiling = Infinity;
    for (const q of ps) if (q !== p && q.bottom >= at) ceiling = Math.min(ceiling, q.bottom);
    if (ceiling - p.top >= HEADROOM) out.push(p.top);
  }
  return out;
}
const standsAt = (lv: string, x: number, z: number, r = 0): boolean => {
  const ds = r ? [0, r, -r] : [0];
  for (const dx of ds) for (const dz of ds) if (surfaces(x + dx, z + dz).some((h) => Math.abs(h - Y[lv]!) <= TOL)) return true;
  return false;
};
/** Is a collide box present at (x, y, z)? */
function solidAt(x: number, y: number, z: number, axis: 'x' | 'z' | '' = ''): boolean {
  // a wall's face may sit on the design line: look 0.1 m either side across it
  const ds: [number, number][] = axis === 'z' ? [[0, 0], [0, 0.1], [0, -0.1]] : axis === 'x' ? [[0, 0], [0.1, 0], [-0.1, 0]] : [[0, 0]];
  return ds.some(([dx, dz]) => piecesAt(x + dx, z + dz).some((p) => y >= p.bottom - 1e-6 && y <= p.top + 1e-6));
}

describe('Dead Line G1 greybox vs the design JSON', () => {
  it('is generated from the JSON (the committed geometry is current)', () => {
    execFileSync(process.execPath, ['scripts/gen-dead-line.mjs', '--check'], { stdio: 'pipe' });
  });

  it('is a listed sandbox map with four spawns and the debug points', () => {
    expect(isListedMap('dead-line')).toBe(true);
    expect(deadLine.modes).toEqual(['sandbox', 'infiltration']);
    expect(layout.playerSpawns).toHaveLength(4);
    expect(layout.rooms).toHaveLength(D.spaces.length);
    const groups = new Set(DEAD_LINE_DEBUG.map((p) => p.group));
    expect([...groups].sort()).toEqual(['Chapter', 'Objective', 'Spawn']);
    expect(DEAD_LINE_DEBUG.filter((p) => p.group === 'Chapter')).toHaveLength(8);
    expect(DEAD_LINE_DEBUG.filter((p) => p.group === 'Spawn')).toHaveLength(4);
    expect(DEAD_LINE_DEBUG.filter((p) => p.group === 'Objective')).toHaveLength(D.objectives.length);
    expect(layout.debugPoints).toHaveLength(DEAD_LINE_DEBUG.length);
  });

  it('builds every block at its rectangle and height', () => {
    const special = new Set<string>(['S1BODY', 'HWELL', 'S1HOLE', 'ESRISER']);
    for (const k of D.blocks) {
      if (special.has(k.id)) continue;
      const [x0, z0, x1, z1] = k.rect as number[];
      const y0 = Y[k.level]!;
      const hit = b.boxes.some(
        (p) =>
          p.collide &&
          Math.abs(p.c[0] - (x0! + x1!) / 2) <= TOL &&
          Math.abs(p.c[2] - (z0! + z1!) / 2) <= TOL &&
          Math.abs(p.s[0] - (x1! - x0!)) <= TOL &&
          Math.abs(p.s[2] - (z1! - z0!)) <= TOL &&
          Math.abs(p.c[1] + p.s[1] / 2 - (y0 + k.h)) <= TOL &&
          Math.abs(p.c[1] - p.s[1] / 2 - y0) <= TOL,
      );
      expect(hit, `block ${k.id}`).toBe(true);
    }
  });

  it('has a floor under every space at its level height', () => {
    const holeRects: number[][] = [...D.blocks.filter((k: any) => /well|hollow/i.test(k.label)).map((k: any) => k.rect), ...D.spaces.filter((s: any) => s.level === 'T').map((s: any) => s.rect)];
    const skip = (x: number, z: number): boolean => holeRects.some((r) => x > r[0]! - 2.2 && x < r[2]! + 2.2 && z > r[1]! - 2.2 && z < r[3]! + 2.2) || D.links.some((l: any) => l.kind === 'drop' && Math.hypot(l.b[1] - x, l.b[2] - z) < 2) || D.links.some((l: any) => l.kind === 'crawl' && Math.hypot(l.a[1] - x, l.a[2] - z) < 2.5) || D.links.some((l: any) => l.kind === 'crawl' && Math.hypot(l.b[1] - x, l.b[2] - z) < 2.5);
    for (const s of D.spaces) {
      if (s.kind === 'duct' || s.kind === 'void') continue;
      const [x0, z0, x1, z1] = s.rect as number[];
      let n = 0;
      let ok = 0;
      for (let x = x0! + 0.5; x < x1!; x += Math.max(1, (x1! - x0!) / 12)) {
        for (let z = z0! + 0.5; z < z1!; z += Math.max(1, (z1! - z0!) / 12)) {
          if (skip(x, z)) continue;
          // a block in the way is fine: the floor under it exists
          if (piecesAt(x, z).some((p) => p.top > Y[s.level]! + 0.3 && p.bottom <= Y[s.level]! + 0.05)) continue;
          n++;
          if (piecesAt(x, z).some((p) => Math.abs(p.top - Y[s.level]!) <= 0.03)) ok++;
        }
      }
      expect(n === 0 || ok / n >= 0.97, `floor of ${s.id} (${ok} of ${n})`).toBe(true);
    }
  });

  it('has walls on every space edge except where the design opens them', () => {
    const open = new Set(['door1', 'door2', 'gate', 'wide', 'open']);
    // places the generator opens beyond the design list: ladder tops on a parapet, the beam, a duct through a wall
    const nearLink = (lv: string, x: number, z: number): boolean => D.links.some((l: any) => [l.a, l.b, ...(l.path ?? []).map((p: number[]) => [l.a[0], p[0], p[1]])].some((p: any[]) => p[0] === lv && Math.hypot(p[1] - x, p[2] - z) < 3.2));
    let walls = 0;
    for (const s of D.spaces) {
      if (s.kind === 'duct' || s.kind === 'void' || s.kind === 'ledge') continue;
      const [x0, z0, x1, z1] = s.rect as number[];
      const y0 = Y[s.level]!;
      const edges = [
        { axis: 'z', at: z0!, a: x0!, e: x1! },
        { axis: 'z', at: z1!, a: x0!, e: x1! },
        { axis: 'x', at: x0!, a: z0!, e: z1! },
        { axis: 'x', at: x1!, a: z0!, e: z1! },
      ];
      for (const e of edges) {
        const ops = D.openings.filter((o: any) => o.level === s.level && o.axis === e.axis && Math.abs(o.at - e.at) < 1e-6);
        for (let t = e.a + 0.5; t < e.e; t += 1) {
          const [x, z] = e.axis === 'z' ? [t, e.at] : [e.at, t];
          // a block standing against the line (a breaker box beside AV1) is the design's own
          if (D.blocks.some((k: any) => k.level === s.level && x >= k.rect[0] - 0.05 && x <= k.rect[2] + 0.05 && z >= k.rect[1] - 0.05 && z <= k.rect[3] + 0.05)) continue;
          const o = ops.find((q: any) => Math.abs(t - q.c) <= q.w / 2 + 0.3);
          if (!o) {
            if (nearLink(s.level, x, z)) continue;
            walls++;
            expect(solidAt(x, y0 + 0.5, z, e.axis as 'x' | 'z'), `${s.id} ${e.axis}=${e.at} wall at ${t}`).toBe(true);
          } else if (Math.abs(t - o.c) <= o.w / 2 - 0.3 && open.has(o.type)) {
            expect(solidAt(x, y0 + 1.0, z), `${s.id} opening ${o.id} open at ${t}`).toBe(false);
          } else if (Math.abs(t - o.c) <= o.w / 2 - 0.3 && o.type === 'window') {
            expect(solidAt(x, y0 + 0.5, z, e.axis as 'x' | 'z'), `window ${o.id} sill`).toBe(true);
          } else if (o.type === 'sealed' && Math.abs(t - o.c) <= o.w / 2 - 0.3) {
            expect(solidAt(x, y0 + 1.0, z, e.axis as 'x' | 'z'), `sealed ${o.id}`).toBe(true);
          }
        }
      }
    }
    expect(walls).toBeGreaterThan(300);
  });

  it('puts every link endpoint on a floor at its level (within 0.25 m of its height)', () => {
    for (const l of D.links) {
      for (const p of [l.a, l.b]) {
        // pit / hatch / drop ends are held to a metre: the access holes sit at the link ends
        const near = l.kind === 'crawl' || l.kind === 'drop' || l.kind === 'ladder' || l.kind === 'beam';
        const ok = near ? standsAt(p[0], p[1], p[2], 1.2) || standsAt(p[0], p[1] + 0.75, p[2], 0.75) : standsAt(p[0], p[1], p[2], 0);
        expect(ok, `${l.id} end ${p.join(' ')}`).toBe(true);
      }
    }
  });

  it('puts spawns, objectives, hides, vantage points, panels, switches, regroup points and exits on a floor', () => {
    const pts: [string, string, number, number][] = [];
    for (const s of D.spawns) pts.push([s.id, 'G', s.x, s.z]);
    for (const o of D.objectives) pts.push([o.id, o.level, o.x, o.z]);
    for (const h of D.hides) pts.push([h.id, h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2]);
    for (const v of D.vantage) pts.push([v.id, v.level, v.x, v.z]);
    for (const p of D.panels) pts.push([p.id, p.level, p.x, p.z]);
    for (const r of D.regroup) pts.push([r.id, r.level, r.x, r.z]);
    for (const e of D.extraction) pts.push([e.id, e.level, e.x, e.z]);
    for (const c of D.circuits) if (c.switch) pts.push([c.switch.id, c.switch.level, c.switch.x, c.switch.z]);
    for (const [id, lv, x, z] of pts) expect(standsAt(lv, x, z, 0) || standsAt(lv, x, z, 0.5), `${id} at ${lv} ${x}, ${z}`).toBe(true);
  });

  it('flags the markers as flat, never colliding pieces', () => {
    const cols = ['#2f6df0', '#f2d21b', '#22c55e', '#ef4444', '#f59e0b', '#22d3ee', '#f8fafc', '#e11d9c'];
    const flat = b.boxes.filter((p) => !p.collide && p.visible !== false && cols.includes(p.color));
    expect(flat.length).toBeGreaterThanOrEqual(D.hides.length + D.vantage.length + D.objectives.length + D.panels.length + D.spawns.length + D.regroup.length + D.extraction.length);
  });

  it('keeps the flat debug light (no lamps, no guards)', () => {
    expect(b.lights.lights.length).toBe(0);
    expect(layout.enemySpawns).toHaveLength(0);
    expect(deadLine.theme.lightLevel).toBeGreaterThan(0.9);
  });
});

describe('Dead Line nav layers', () => {
  it('keeps five surfaces per column (basement to roof)', () => {
    expect(deadLine.navLayers).toBe(5);
  });
});
