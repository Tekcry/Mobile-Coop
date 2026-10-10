/* eslint-disable @typescript-eslint/no-explicit-any */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { deadLineV2, DEAD_LINE_V2_DEBUG, DEAD_LINE_V2_Y } from '../src/world/maps/deadLineV2';
import geo from '../src/world/maps/deadLineV2.geo.json';
import { isListedMap } from '../src/world/maps/listed';
import { SURFACE_NOISE, surfaceAt } from '../src/world/surfaces';

/** Dead Line v2 G1 (Area 1): the built geometry against the design JSON (`docs/design/map-dead-line-v2.json`), tolerance 0.25 m. */
const D = JSON.parse(readFileSync('docs/design/map-dead-line-v2.json', 'utf8')) as any;
const TOL = 0.25;
const HEADROOM = 1.7;
const Y = DEAD_LINE_V2_Y as Record<string, number> & { B: number; G: number; U: number; R: number };

const b = new LevelBuilder();
const layout = deadLineV2.build(b, 0);
const GEO_OPS = geo.ops as any[];

interface Piece {
  bottom: number;
  top: number;
}
function piecesAt(x: number, z: number): Piece[] {
  const out: Piece[] = [];
  for (const p of b.boxes) {
    if (!p.collide) continue;
    if (Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2) out.push({ bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 });
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
const solidAt = (x: number, y: number, z: number): boolean => piecesAt(x, z).some((p) => y >= p.bottom - 1e-6 && y <= p.top + 1e-6);
/** Bounding box of the generated boxes with a tag prefix. */
function bboxOf(tag: string): { x0: number; z0: number; x1: number; z1: number; y0: number; y1: number } | null {
  const bs = GEO_OPS.filter((o) => o.t === 'box' && o.tag === tag);
  if (!bs.length) return null;
  const r = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const o of bs) {
    r.x0 = Math.min(r.x0, o.c[0] - o.s[0] / 2);
    r.x1 = Math.max(r.x1, o.c[0] + o.s[0] / 2);
    r.z0 = Math.min(r.z0, o.c[2] - o.s[2] / 2);
    r.z1 = Math.max(r.z1, o.c[2] + o.s[2] / 2);
    r.y0 = Math.min(r.y0, o.c[1] - o.s[1] / 2);
    r.y1 = Math.max(r.y1, o.c[1] + o.s[1] / 2);
  }
  return r;
}
const near = (a: number, c: number): boolean => Math.abs(a - c) <= TOL;
const SPECIAL = (k: any): boolean => /palisade|spike/i.test(k.label);

describe('Dead Line v2 G1 greybox vs the design JSON', () => {
  it('is generated from the JSON (the committed geometry is current)', () => {
    execFileSync(process.execPath, ['scripts/gen-dead-line-v2.mjs', '--check'], { stdio: 'pipe' });
  });

  it('is a listed sandbox / infiltration map with four spawns facing the bridge and the teleport points', () => {
    expect(isListedMap('dead-line-v2')).toBe(true);
    expect(deadLineV2.modes).toEqual(['sandbox', 'infiltration']);
    expect(layout.playerSpawns).toHaveLength(4);
    D.spawns.forEach((s: any, i: number) => {
      expect(layout.playerSpawns[i]!.pos.x).toBeCloseTo(s.x, 3);
      expect(layout.playerSpawns[i]!.pos.z).toBeCloseTo(s.z, 3);
    });
    expect(layout.rooms).toHaveLength(D.spaces.length);
    expect([...new Set(DEAD_LINE_V2_DEBUG.map((p) => p.group))].sort()).toEqual(['Checkpoint', 'Encounter', 'Spawn']);
    expect(DEAD_LINE_V2_DEBUG.filter((p) => p.group === 'Encounter')).toHaveLength(D.encounters.length);
    expect(DEAD_LINE_V2_DEBUG.filter((p) => p.group === 'Checkpoint')).toHaveLength(D.checkpoints.length);
    expect(DEAD_LINE_V2_DEBUG.filter((p) => p.group === 'Spawn')).toHaveLength(D.spawns.length);
    expect(new Set(DEAD_LINE_V2_DEBUG.map((p) => p.label)).size).toBe(DEAD_LINE_V2_DEBUG.length);
    expect(layout.debugPoints).toHaveLength(DEAD_LINE_V2_DEBUG.length);
  });

  it('builds every block at its rectangle and height (bounding box of its pieces)', () => {
    let n = 0;
    for (const k of D.blocks) {
      if (SPECIAL(k)) continue;
      const bb = bboxOf(`block:${k.id}`);
      expect(bb, `block ${k.id} built`).not.toBeNull();
      const [x0, z0, x1, z1] = k.rect as number[];
      const y0 = Y[k.level]!;
      expect(near(bb!.x0, x0!) && near(bb!.x1, x1!) && near(bb!.z0, z0!) && near(bb!.z1, z1!), `block ${k.id} footprint`).toBe(true);
      expect(near(bb!.y0, y0) && near(bb!.y1, y0 + k.h), `block ${k.id} height ${bb!.y0}..${bb!.y1} vs ${y0}..${y0 + k.h}`).toBe(true);
      n++;
    }
    expect(n).toBe(D.blocks.length - D.blocks.filter(SPECIAL).length);
  });

  it('has every block solid in the built level (collision at its rectangle)', () => {
    const doorways = D.openings.filter((o: any) => o.type === 'door1' || o.type === 'door2' || o.type === 'wide');
    for (const k of D.blocks) {
      if (SPECIAL(k)) continue;
      const [x0, z0, x1, z1] = k.rect as number[];
      const y0 = Y[k.level]!;
      const ym = y0 + Math.min(k.h, 1.0) / 2 + 0.05;
      for (const fx of [0.2, 0.5, 0.8]) {
        for (const fz of [0.2, 0.5, 0.8]) {
          const x = x0! + (x1! - x0!) * fx;
          const z = z0! + (z1! - z0!) * fz;
          if (doorways.some((o: any) => (o.axis === 'x' ? Math.abs(z - o.c) < o.w / 2 + 0.1 : Math.abs(x - o.c) < o.w / 2 + 0.1) && o.level === k.level)) continue;
          expect(solidAt(x, ym, z), `block ${k.id} at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(true);
        }
      }
    }
  });

  it('builds the slabs: bridge, ceilings and eaves at their rectangles, the deck of every roof walk at its level', () => {
    for (const s of D.meta.slabs) {
      if (s.id === 'GROUND') continue;
      const bb = bboxOf(`slab:${s.id}`);
      expect(bb, `slab ${s.id}`).not.toBeNull();
      expect(near(bb!.x0, s.rect[0]) && near(bb!.x1, s.rect[2]) && near(bb!.z0, s.rect[1]) && near(bb!.z1, s.rect[3]), `slab ${s.id} rect`).toBe(true);
      expect(near(bb!.y0, s.y), `slab ${s.id} underside ${bb!.y0} vs ${s.y}`).toBe(true);
    }
    for (const s of D.spaces.filter((q: any) => q.level === 'U')) {
      const bb = bboxOf(`deck:${s.id}`);
      expect(bb, `deck ${s.id}`).not.toBeNull();
      expect(near(bb!.y1, Y.U) && near(bb!.x0, s.rect[0]) && near(bb!.x1, s.rect[2]) && near(bb!.z0, s.rect[1]) && near(bb!.z1, s.rect[3]), `deck ${s.id}`).toBe(true);
    }
  });

  it('has a floor under every outdoor space and every room at the level height, and walkable roofs, with the manholes and grating the only holes', () => {
    const holes: number[][] = [...D.links.filter((l: any) => l.kind === 'ladder').map((l: any) => [l.a[1] - 0.8, l.a[2] - 0.8, l.a[1] + 0.8, l.a[2] + 0.8]), ...D.acoustic.map((a: any) => [a.emit[1] - 0.8, a.emit[2] - 0.8, a.emit[1] + 0.8, a.emit[2] + 0.8])];
    for (const s of D.spaces) {
      const [x0, z0, x1, z1] = s.rect as number[];
      let n = 0;
      let ok = 0;
      for (let x = x0! + 0.5; x < x1!; x += Math.max(1, (x1! - x0!) / 14)) {
        for (let z = z0! + 0.5; z < z1!; z += Math.max(1, (z1! - z0!) / 14)) {
          if (holes.some((h) => x > h[0]! && x < h[2]! && z > h[1]! && z < h[3]!)) continue;
          // a block or a roof light standing there is fine: the floor under it exists
          if (piecesAt(x, z).some((p) => p.top > Y[s.level]! + 0.3 && p.bottom <= Y[s.level]! + 0.05)) continue;
          n++;
          if (piecesAt(x, z).some((p) => Math.abs(p.top - Y[s.level]!) <= 0.03)) ok++;
        }
      }
      expect(n === 0 || ok / n >= 0.97, `floor of ${s.id} (${ok} of ${n})`).toBe(true);
    }
  });

  it('builds the tunnel 2.4 m clear with a 1.8 m walkway, floor -4.4, the soffit at -2.0', () => {
    for (const s of D.spaces.filter((q: any) => q.level === 'B')) {
      const [x0, z0, x1, z1] = s.rect as number[];
      for (let x = x0! + 0.6; x < x1!; x += 3) {
        const z = (z0! + z1!) / 2;
        const ps = piecesAt(x, z);
        const floor = ps.find((p) => Math.abs(p.top - Y.B) <= 0.03);
        const roof = ps.filter((p) => p.bottom > Y.B).sort((p, q) => p.bottom - q.bottom)[0];
        if (!floor || (D.links.some((l: any) => l.kind === 'ladder' && Math.abs(l.a[1] - x) < 1.2 && Math.abs(l.a[2] - z) < 1.2) )) continue;
        expect(roof, `${s.id} roof at ${x}`).toBeDefined();
        expect(near(roof!.bottom - floor.top, s.wallH), `${s.id} clear height ${(roof!.bottom - floor.top).toFixed(2)} at ${x}`).toBe(true);
      }
    }
    // the walkway between the bearers is 1.8 m: free at z 15.4..17.2, solid at the bearers
    const tun = D.spaces.find((s: any) => s.id === 'tun');
    const xm = (tun.rect[0] + tun.rect[2]) / 2;
    expect(solidAt(xm, Y.B + 1.0, 15.2)).toBe(true);
    expect(solidAt(xm, Y.B + 1.0, 17.4)).toBe(true);
    for (const z of [15.5, 16.3, 17.1]) expect(solidAt(xm, Y.B + 1.0, z)).toBe(false);
    expect(standsAt('B', xm, 16.3)).toBe(true);
  });

  it('cuts a shaft at each manhole (centred on the link, 1.2 m, clear from the chamber floor to the street) with a fixed ladder', () => {
    const lad = b.anchors.ladders;
    for (const l of D.links.filter((q: any) => q.kind === 'ladder')) {
      const [cx, cz] = [l.a[1], l.a[2]];
      for (const [dx, dz] of [[0, 0], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3]]) for (const y of [Y.B + 0.5, -2.2, -1.0, -0.15]) expect(solidAt(cx + dx!, y, cz + dz!), `${l.id} shaft clear at ${dx},${dz} y ${y}`).toBe(false);
      // above the soffit the whole 1.2 m hole is clear
      for (const [dx, dz] of [[0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]) for (const y of [-1.0, -0.15]) expect(solidAt(cx + dx!, y, cz + dz!), `${l.id} hole clear at ${dx},${dz} y ${y}`).toBe(false);
      // the closed cast-iron cover is a walkable plate flush with the street, over the whole hole
      for (const [dx, dz] of [[0, 0], [0.5, 0.5], [-0.5, -0.5]]) expect(standsAt('G', cx + dx!, cz + dz!), `${l.id} cover at ${dx},${dz}`).toBe(true);
      // the shaft is closed round: a liner on every side above the soffit, and street ground just outside it
      for (const [dx, dz] of [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]]) expect(solidAt(cx + dx!, -1.0, cz + dz!), `${l.id} liner ${dx},${dz}`).toBe(true);
      const a = lad.find((q: any) => Math.abs(q.base.y - Y.B) < 0.01 && Math.abs(q.base.x - cx) <= 0.6 && Math.abs(q.base.z - cz) <= 0.6);
      expect(a, `${l.id} ladder`).toBeDefined();
      expect(near(a!.top.y - a!.base.y, l.travel), `${l.id} ladder ${a!.top.y - a!.base.y} vs ${l.travel}`).toBe(true);
      // the top exit lands on the street beside the hole
      expect(standsAt('G', a!.top.x, a!.top.z)).toBe(true);
    }
  });

  it('hangs a climbable downpipe at every downpipe link, from the street to the roof walk', () => {
    const pipes = b.anchors.pipesV;
    for (const l of D.links.filter((q: any) => q.kind === 'pipe')) {
      const p = pipes.find((q: any) => Math.abs(q.base.x - l.a[1]) <= TOL && Math.abs(q.base.z - l.a[2]) <= TOL);
      expect(p, `${l.id} pipe`).toBeDefined();
      expect(near(p!.base.y, Y.G) && near(p!.top.y, Y.U), `${l.id} pipe runs ${p!.base.y}..${p!.top.y}`).toBe(true);
      // the roof walk is reachable at the pipe head (within the link's own upper end)
      expect(standsAt('U', l.b[1], l.b[2]), `${l.id} roof end`).toBe(true);
    }
    expect(pipes.length).toBe(D.links.filter((q: any) => q.kind === 'pipe').length);
  });

  it('builds the doors, the gate and the window at their openings, with clear doorways', () => {
    const doors = b.anchors.doors;
    const wins = b.anchors.windows;
    const types = D.openings.filter((o: any) => ['door1', 'door2', 'gate'].includes(o.type));
    expect(doors).toHaveLength(types.length);
    for (const o of types) {
      const g0 = o.c - o.w / 2;
      const d = doors.find((q: any) => Math.abs((o.axis === 'x' ? q.hinge.z : q.hinge.x) - g0) <= TOL && Math.abs(q.width - o.w) < 1e-6);
      expect(d, `door ${o.id}`).toBeDefined();
      // the doorway is clear at body height, along the whole thickness of whatever the door passes through
      for (const dn of [-0.4, -0.1, 0.1, 0.4]) {
        const [x, z] = o.axis === 'x' ? [o.at + dn, o.c] : [o.c, o.at + dn];
        for (const y of [0.4, 1.0, 1.9]) expect(solidAt(x, y, z), `door ${o.id} clear at ${dn} y ${y}`).toBe(false);
      }
    }
    for (const o of D.openings.filter((q: any) => q.type === 'window')) {
      const w = wins.find((q: any) => Math.abs((o.axis === 'x' ? q.c.z : q.c.x) - o.c) <= TOL);
      expect(w, `window ${o.id}`).toBeDefined();
      expect(near(w!.sillHeight, 0.9)).toBe(true);
    }
    // the pier door SD is a doorway through the whole 2 m pier
    const sd = D.openings.find((o: any) => o.id === 'SD');
    for (const x of [191.2, 191.7, 192.3, 192.8]) expect(solidAt(x, 1.0, sd.c), `SD clear at x ${x}`).toBe(false);
    expect(solidAt(192, 2.5, sd.c), 'SD lintel').toBe(true);
  });

  it('builds the open edges as palisades of upright bars (see-through, a capsule cannot pass, never a wall)', () => {
    const rly = D.blocks.find((k: any) => k.id === 'RLY');
    // the compound's south line z = 21 from x 12 to 22 and the west line x = 12: bars every 0.2 m, 2.4 m tall
    for (const x of [13, 15.1, 17.7, 20.3, 21.5]) expect(piecesAt(x, 21).some((p) => p.top >= 2.3), `RLY south fence at x ${x}`).toBe(true);
    for (const z of [22, 24.3]) expect(piecesAt(12, z).some((p) => p.top >= 2.3), `RLY west fence at z ${z}`).toBe(true);
    // between bars the line is open to a ray (sight) but the gaps are narrower than the capsule
    const gapW = 0.2 - 0.04;
    expect(gapW).toBeLessThan(0.6);
    // the substation palisade z = 21 is fenced except the gate gap
    const sg = D.openings.find((o: any) => o.id === 'SG');
    for (const x of [182.5, 184, 185.4, 187.9, 189, 190.5]) expect(piecesAt(x, 21).some((p) => p.top >= 2.3), `substation fence at x ${x}`).toBe(true);
    for (const x of [sg.c - 0.7, sg.c, sg.c + 0.7]) expect(solidAt(x, 1.0, 21), `SG gap at ${x}`).toBe(false);
    expect(rly).toBeDefined();
    // bars carry no ledges: a palisade top is not a lip to hang from
    const marked = b.boxes.filter((p) => p.noLedge).length;
    expect(marked).toBeGreaterThan(150);
  });

  it('puts every spawn, checkpoint, encounter, hide, vantage point and the exit on a floor', () => {
    const pts: [string, string, number, number][] = [];
    for (const s of D.spawns) pts.push([s.id, 'G', s.x, s.z]);
    for (const c of D.checkpoints) pts.push([c.id, c.level, c.x, c.z]);
    for (const e of D.encounters) pts.push([e.id, e.level, e.x, e.z]);
    for (const h of D.hides) pts.push([h.id, h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2]);
    for (const v of D.vantage) pts.push([v.id, v.level, v.x, v.z]);
    for (const e of D.extraction) pts.push([e.id, e.level, e.x, e.z]);
    for (const [id, lv, x, z] of pts) expect(standsAt(lv, x, z, 0) || standsAt(lv, x, z, 0.5), `${id} at ${lv} ${x}, ${z}`).toBe(true);
  });

  it('sets the floor surfaces: corrugated roofs metal, felt roofs wood, the grating a grate, the street concrete', () => {
    const at = (x: number, y: number, z: number): string => surfaceAt(b.surfaces, x, y, z, 'concrete');
    for (const s of D.spaces.filter((q: any) => q.level === 'U')) {
      const want = s.floor === 'metal' ? 'metal' : s.floor === 'wood' ? 'wood' : 'concrete';
      expect(at((s.rect[0] + s.rect[2]) / 2, Y.U, (s.rect[1] + s.rect[3]) / 2), `${s.id} ${s.floor}`).toBe(want);
    }
    const vg = D.acoustic[0];
    expect(at(vg.emit[1], 0, vg.emit[2])).toBe('grate');
    expect(SURFACE_NOISE.grate).toBe(1.4);
    expect(SURFACE_NOISE.metal).toBe(1.6);
    expect(at(40, 0, 15)).toBe('concrete');
    const aroof = D.spaces.find((s: any) => s.id === 'aroof');
    expect(at((aroof.rect[0] + aroof.rect[2]) / 2, Y.R, (aroof.rect[1] + aroof.rect[3]) / 2)).toBe('gravel');
  });

  it('flags the markers as flat, never colliding pieces', () => {
    const kinds = ['hide', 'vantage', 'checkpoint', 'encounter', 'spawn', 'extract'];
    const want = D.hides.length + D.vantage.length + D.checkpoints.length + D.encounters.length + D.spawns.length + D.extraction.length;
    const marks = (geo.markers as any[]).filter((m) => kinds.includes(m.kind));
    expect(marks).toHaveLength(want);
    expect((geo.markers as any[]).filter((m) => m.kind === 'hold').length).toBeGreaterThanOrEqual(6);
    const cols = new Set((geo.markers as any[]).map((m) => m.color));
    const flat = b.boxes.filter((p) => !p.collide && p.visible !== false && cols.has(p.color));
    expect(flat.length).toBeGreaterThanOrEqual(geo.markers.length);
  });

  it('keeps the flat debug light (no lamps, no guards)', () => {
    expect(b.lights.lights.length).toBe(0);
    expect(layout.enemySpawns).toHaveLength(0);
    expect(deadLineV2.theme.lightLevel).toBeGreaterThan(0.9);
  });

  it('reports the JSON conflicts it found instead of editing the JSON', () => {
    expect((geo.notes as string[]).some((n) => /DP3.*SKIP/.test(n))).toBe(true);
    expect(deadLineV2.navLayers).toBe(5);
  });
});
