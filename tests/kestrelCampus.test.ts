import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { kestrel, setKestrelDraft } from '../src/world/maps/kestrel';
import { campusToBuild, isCampus, levelAt, type CampusFile } from '../src/world/maps/kestrelCampus';
import { floorTiles, levelOf, stairLayout, wallBoxes } from '../src/world/maps/kestrelGeo';

const campus = JSON.parse(readFileSync(new URL('../docs/kestrel/kestrel.campus.blocks.json', import.meta.url), 'utf8')) as CampusFile;
const { arch, ladders, solids } = campusToBuild(campus);
const EPS = 1e-6;

describe('Kestrel campus converter (editor walk test)', () => {
  it('reads the campus file as campus schema, the levels footprint lists kept', () => {
    expect(isCampus(campus)).toBe(true);
    expect(arch.levels.map((l) => l.id)).toEqual(campus.levels.map((l) => l.id));
    for (const l of arch.levels) expect(l.footprints?.length, l.id).toBeGreaterThan(0);
  });

  it('every wall gives collision boxes on its own line, at most its own height (no fence rules needed)', () => {
    for (const w of arch.walls) {
      const boxes = wallBoxes(arch, w);
      expect(boxes.length, w.id).toBeGreaterThan(0);
      const floor = levelOf(arch, w.level).floor;
      for (const b of boxes) {
        expect(b.c[1] + b.s[1] / 2, w.id).toBeLessThanOrEqual(floor + w.h + EPS);
        const alongX = Math.abs(w.a[1] - w.b[1]) < EPS;
        expect(alongX ? b.c[2] : b.c[0], w.id).toBeCloseTo(alongX ? w.a[1] : w.a[0], 6);
      }
    }
    expect(arch.walls.some((w) => w.kind === 'boundary')).toBe(true);
  });

  it('every opening leaves a gap of its width and height at its at', () => {
    for (const o of arch.openings) {
      const w = arch.walls.find((q) => q.id === o.wall)!;
      const alongX = Math.abs(w.a[1] - w.b[1]) < EPS;
      const ai = alongX ? 0 : 1;
      const c = w.a[ai]! + (w.b[ai]! >= w.a[ai]! ? 1 : -1) * o.at;
      const floor = levelOf(arch, w.level).floor;
      const y = floor + o.sill + Math.min(o.h, 2) / 2;
      const hit = wallBoxes(arch, w).filter((b) => {
        const lo = b.c[ai === 0 ? 0 : 2] - b.s[ai === 0 ? 0 : 2] / 2;
        const hi = b.c[ai === 0 ? 0 : 2] + b.s[ai === 0 ? 0 : 2] / 2;
        return lo < c + o.w / 2 - EPS && hi > c - o.w / 2 + EPS && b.c[1] - b.s[1] / 2 < y && b.c[1] + b.s[1] / 2 > y;
      });
      expect(hit.length, o.id).toBe(0);
    }
  });

  it('every stair rises floor to floor with the file risers', () => {
    for (const s of arch.stairs) {
      const lay = stairLayout(arch, s);
      const top = lay.flights.reduce((m, f) => Math.max(m, f.y + f.rise), -Infinity);
      expect(lay.flights[0]!.y, s.id).toBeCloseTo(levelOf(arch, s.from).floor, 6);
      expect(top, s.id).toBeCloseTo(levelOf(arch, s.to).floor, 6);
      expect(lay.flights.reduce((n, f) => n + f.steps, 0), s.id).toBe(s.risers);
    }
  });

  it('no floor tile covers a void', () => {
    for (const l of arch.levels) {
      const holes = arch.voids.filter((v) => v.level === l.id).map((v) => v.rect);
      for (const t of floorTiles(arch, l.id)) {
        const mx = (t.rect[0] + t.rect[2]) / 2;
        const mz = (t.rect[1] + t.rect[3]) / 2;
        expect(holes.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3]), `${l.id} ${t.room}`).toBe(false);
      }
    }
  });

  it('balustrade stays a wall kind; ladders face their wall; the pipe rack clears the link bridge', () => {
    const k = { ...campus, walls: [...campus.walls, { ...campus.walls[0]!, id: 'WX', kind: 'balustrade', h: 1.1 }] };
    expect(campusToBuild(k).arch.walls.find((w) => w.id === 'WX')!.kind).toBe('balustrade');
    expect(ladders.length).toBe(campus.ladders!.length);
    const w = ladders.find((l) => l.id === 'V-LAD1')!;
    expect(w.yaw).toBeCloseTo(-Math.PI / 2, 6);
    expect(w.y1).toBeGreaterThan(w.y0);
    const rack = solids[0]!;
    const bridge = campus.levels.find((l) => l.id === 'F')!.footprint as number[][];
    const link = bridge.find((r) => r[0] === 40 && r[2] === 52)!;
    expect(rack.c[2] - rack.s[2] / 2).toBeGreaterThanOrEqual(link[3]!);
  });

  it('the Kestrel map builds the campus handed in, ladders included, spawned at the asked point', () => {
    setKestrelDraft(campus, { x: 83, z: 43, level: 'G', yaw: 1 });
    const b = new LevelBuilder();
    const layout = kestrel.build(b, 1);
    expect(layout.playerSpawns[0]!.pos.x).toBeCloseTo(83, 1);
    expect(layout.playerSpawns[0]!.yaw).toBe(1);
    expect(b.anchors.ladders.length).toBe(campus.ladders!.length);
    expect(levelAt(campus, 83, 43, 0.1)!.id).toBe('G');
    expect(levelAt(campus, 30, 45, 4.3)!.id).toBe('F');
  });
});
