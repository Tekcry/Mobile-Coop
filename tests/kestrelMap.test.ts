import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { kestrel } from '../src/world/maps/kestrel';
import blocks from '../src/world/maps/kestrel.blocks.json';
import { debugSpots, floorTiles, levelOf, stairLayout, wallBoxes, type KestrelArch } from '../src/world/maps/kestrelGeo';

const arch = blocks as unknown as KestrelArch;
const docs = readFileSync(new URL('../docs/kestrel/kestrel.blocks.json', import.meta.url), 'utf8');

describe('Kestrel B0 massing walk (block plan as volumes)', () => {
  it('the map copy equals docs/kestrel/kestrel.blocks.json', () => {
    expect(JSON.parse(docs)).toEqual(blocks);
  });

  it('ids are unique within each list', () => {
    for (const k of ['levels', 'rooms', 'walls', 'openings', 'stairs', 'voids'] as const) {
      const ids = (blocks[k] as { id: string }[]).map((x) => x.id);
      expect(new Set(ids).size, k).toBe(ids.length);
    }
  });

  it('every opening sits in a wall and every wall is on an axis', () => {
    const walls = new Map(arch.walls.map((w) => [w.id, w]));
    for (const o of arch.openings) expect(walls.has(o.wall), o.id).toBe(true);
    for (const w of arch.walls) expect(() => wallBoxes(arch, w), w.id).not.toThrow();
  });

  it('is registered and listed', () => {
    expect(MAPS.some((m) => m.id === 'kestrel')).toBe(true);
    expect(isListedMap('kestrel')).toBe(true);
  });

  it('a ground wall under the first floor stops at the first floor; outside it keeps its height', () => {
    const g = levelOf(arch, 'G');
    const f = levelOf(arch, 'F');
    const w = arch.walls.find((q) => q.id === 'W018')!; // x 18.5, z 22-52, 5 m: front block z 22-37.5, hall beyond
    const tops = wallBoxes(arch, w).map((p) => ({ z: p.c[2], top: p.c[1] + p.s[1] / 2 }));
    for (const t of tops.filter((q) => q.z < 37)) expect(t.top).toBeCloseTo(f.floor - g.floor, 6);
    for (const t of tops.filter((q) => q.z > 38)) expect(t.top).toBeCloseTo(w.h, 6);
  });

  it('an opening is a gap from its sill to its top', () => {
    const w = arch.walls.find((q) => q.id === 'W004')!; // vault north wall, duct arch 2.5 wide, 1.5 high
    const o = arch.openings.find((q) => q.wall === 'W004')!;
    const cx = w.a[0] + o.at;
    const boxes = wallBoxes(arch, w).filter((p) => Math.abs(p.c[0] - cx) < o.w / 2);
    for (const p of boxes) expect(p.c[1] - p.s[1] / 2).toBeGreaterThanOrEqual(levelOf(arch, 'B').floor + o.h - 1e-6);
  });

  it('floor tiles leave the voids open and cover everything else', () => {
    const area = (r: readonly number[]): number => (r[2]! - r[0]!) * (r[3]! - r[1]!);
    for (const l of arch.levels) {
      const rooms = arch.rooms.filter((r) => r.level === l.id).reduce((s, r) => s + area(r.rect), 0);
      const holes = arch.voids.filter((v) => v.level === l.id).reduce((s, v) => s + area(v.rect), 0);
      const tiles = floorTiles(arch, l.id).reduce((s, t) => s + area(t.rect), 0);
      expect(tiles, l.id).toBeCloseTo(rooms - holes, 6);
    }
  });

  it('every stair climbs exactly floor to floor, flight by flight', () => {
    for (const s of arch.stairs) {
      const lay = stairLayout(arch, s);
      const total = levelOf(arch, s.to).floor - levelOf(arch, s.from).floor;
      expect(lay.flights.reduce((a, f) => a + f.rise, 0), s.id).toBeCloseTo(total, 6);
      expect(lay.flights.length, s.id).toBe(s.layout === 'dogleg' ? 2 : 1);
      const last = lay.flights[lay.flights.length - 1]!;
      expect(last.y + last.rise, s.id).toBeCloseTo(levelOf(arch, s.to).floor, 6);
      for (const f of lay.flights) expect(f.len, s.id).toBeGreaterThan(0);
    }
  });

  it('every room but a lift shaft has a spot to stand on, inside its rect', () => {
    const spots = debugSpots(arch);
    expect(spots.length).toBe(arch.rooms.length - 1);
    for (const sp of spots) {
      const r = arch.rooms.find((q) => q.id === sp.room)!;
      expect(sp.x >= r.rect[0] && sp.x <= r.rect[2] && sp.z >= r.rect[1] && sp.z <= r.rect[3], sp.room).toBe(true);
    }
    expect(arch.rooms.find((r) => !spots.some((s) => s.room === r.id))?.id).toBe('F-LIFT');
  });

  it('builds the layout: spawn at meta.entry on the ground, one room per zone', () => {
    const b = new LevelBuilder();
    const layout = kestrel.build(b, 1);
    const sp = layout.playerSpawns[0]!;
    expect(Math.hypot(sp.pos.x - arch.meta.entry[0], sp.pos.z - arch.meta.entry[1])).toBeLessThan(0.2); // meta.entry, moved clear of the fence face
    expect(sp.pos.y).toBe(levelOf(arch, 'G').floor);
    expect(layout.rooms?.length).toBe(arch.rooms.length);
    expect(b.boxes.length).toBeGreaterThan(200);
    const ys = b.boxes.map((p) => p.c[1] + p.s[1] / 2);
    expect(Math.max(...ys)).toBeCloseTo(Math.max(...arch.walls.map((w) => levelOf(arch, w.level).floor + w.h)), 6);
  });
});
