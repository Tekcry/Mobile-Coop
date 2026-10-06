import { describe, expect, it } from 'vitest';
import { clampToRoom, inRoom, roomAt, type RoomRect } from '../src/world/rooms';
import { RoomClearTracker } from '../src/game/roomClear';

const R = (id: string, minX: number, maxX: number, minZ: number, maxZ: number): RoomRect => ({ id, name: id, minX, maxX, minZ, maxZ });

describe('room tags', () => {
  const rooms = [R('big', 0, 20, 0, 20), R('closet', 2, 4, 2, 4), R('east', 20, 30, 0, 10)];
  it('finds the smallest room containing a point, -1 outside', () => {
    expect(roomAt(rooms, 10, 10)).toBe(0);
    expect(roomAt(rooms, 3, 3)).toBe(1);
    expect(roomAt(rooms, 25, 5)).toBe(2);
    expect(roomAt(rooms, -5, 5)).toBe(-1);
  });
  it('margins and clamping', () => {
    expect(inRoom(rooms[1]!, 4.4, 3)).toBe(false);
    expect(inRoom(rooms[1]!, 4.4, 3, 0.5)).toBe(true);
    const out: [number, number] = [0, 0];
    expect(clampToRoom(rooms[2]!, 40, -3, 0.5, out)).toEqual([29.5, 0.5]);
    // inset never crosses the centre of a narrow room
    expect(clampToRoom(R('n', 0, 1, 0, 10), 5, 5, 2, out)).toEqual([0.5, 5]);
  });
});

describe('room clear tracker', () => {
  it('clears a room once visited and its squad is down, in any order', () => {
    const t = new RoomClearTracker(3);
    t.assign('a', 0);
    t.assign('b', 0);
    expect(t.killed('a')).toBe(-1);
    expect(t.killed('b')).toBe(-1); // not visited yet
    expect(t.visit(0)).toBe(0);
    expect(t.visit(0)).toBe(-1); // only once
    t.assign('c', 1);
    expect(t.visit(1)).toBe(-1);
    expect(t.killed('c')).toBe(1);
    expect(t.cleared).toBe(2);
    expect(t.order).toEqual([0, 1]);
  });
  it('empty rooms clear on entry; unknown enemies and indices are ignored', () => {
    const t = new RoomClearTracker(2);
    expect(t.killed('ghost')).toBe(-1);
    expect(t.visit(-1)).toBe(-1);
    expect(t.visit(5)).toBe(-1);
    expect(t.visit(1)).toBe(1);
    expect(t.done).toBe(false);
    expect(t.visit(0)).toBe(0);
    expect(t.done).toBe(true);
  });
  it('hostiles left counts alive and still-to-spawn squad members across rooms', () => {
    const t = new RoomClearTracker(3);
    t.expect(0, 2);
    t.expect(2, 3);
    expect(t.hostilesLeft).toBe(5);
    t.assign('a', 0);
    t.assign('b', 1); // a room without pending slots
    expect(t.hostilesLeft).toBe(6);
    t.killed('a');
    t.killed('b');
    expect(t.hostilesLeft).toBe(4);
    t.drop(2);
    expect(t.hostilesLeft).toBe(1);
    t.killed('ghost');
    expect(t.hostilesLeft).toBe(1);
  });
  it('pending (unspawned) squad members block a room until assigned and killed or dropped', () => {
    const t = new RoomClearTracker(1);
    t.expect(0, 2);
    expect(t.visit(0)).toBe(-1);
    expect(t.hostiles(0)).toBe(2);
    t.assign('a', 0);
    expect(t.hostiles(0)).toBe(2);
    expect(t.killed('a')).toBe(-1);
    expect(t.hostiles(0)).toBe(1);
    expect(t.drop(0)).toBe(0);
    expect(t.isCleared(0)).toBe(true);
  });
  it('an enemy counts once and for its own room even if killed elsewhere', () => {
    const t = new RoomClearTracker(2);
    t.assign('a', 1);
    t.assign('a', 0);
    t.visit(0);
    t.visit(1);
    expect(t.isCleared(0)).toBe(true);
    expect(t.killed('a')).toBe(1);
    expect(t.killed('a')).toBe(-1);
  });
});

describe('map room layouts', async () => {
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  const { MAPS } = await import('../src/world/maps');
  /** Point inside a colliding box (XZ footprint, box reaching above the floor), with a body radius. */
  const blocked = (b: InstanceType<typeof LevelBuilder>, x: number, z: number, y: number, r: number): boolean =>
    b.boxes.some((p) => {
      if (!p.collide || Math.abs(p.pitch) > 1e-3) return false;
      const bottom = p.c[1] - p.s[1] / 2;
      const top = p.c[1] + p.s[1] / 2;
      if (top <= y + 0.1 || bottom > y + 1.6) return false;
      const dx = x - p.c[0];
      const dz = z - p.c[2];
      const c = Math.cos(p.yaw);
      const s = Math.sin(p.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      return Math.abs(lx) < p.s[0] / 2 + r && Math.abs(lz) < p.s[2] / 2 + r;
    });
  for (const map of MAPS) {
    const b = new LevelBuilder();
    const layout = map.build(b, 1);
    const rooms = layout.rooms ?? [];
    if (!rooms.length) continue;
    it(`${map.id}: rooms do not overlap and squads stand clear inside their room`, () => {
      for (let i = 0; i < rooms.length; i++)
        for (let j = i + 1; j < rooms.length; j++) {
          const a = rooms[i]!;
          const c = rooms[j]!;
          const ox = Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX);
          const oz = Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ);
          // storeys: one over the other is not an overlap
          const oy = Math.min(a.maxY ?? Infinity, c.maxY ?? Infinity) - Math.max(a.minY ?? -Infinity, c.minY ?? -Infinity);
          expect(ox > 0.01 && oz > 0.01 && oy > 0.01, `${a.id} overlaps ${c.id}`).toBe(false);
        }
      for (const r of rooms)
        for (const s of r.squad ?? []) {
          expect(inRoom(r, s.x, s.z, 0, s.y ?? r.minY ?? 0), `${r.id} squad at ${s.x},${s.z}`).toBe(true);
          // raised posts: the Warehouse mezzanine, the Embassy gate tower, upper storeys (`y`)
          const deck = s.y ?? (map.id === 'warehouse' && r.id === 'mezz' ? 2.6 : map.id === 'embassy' && s.kind === 'sniper' ? 3.2 : 0);
          expect(blocked(b, s.x, s.z, deck, 0.3), `${r.id} squad at ${s.x},${s.z} inside geometry`).toBe(false);
        }
      for (const sp of layout.enemySpawns) expect(blocked(b, sp.x, sp.z, 0, 0.3), `spawn ${sp.x},${sp.z}`).toBe(false);
      for (const sp of layout.playerSpawns) expect(blocked(b, sp.pos.x, sp.pos.z, 0, 0.35), `player spawn ${sp.pos.x},${sp.pos.z}`).toBe(false);
    });
  }
  it('Warehouse is the default map for Clear, Mission and Wave', () => {
    for (const mode of ['clear', 'mission', 'wave'] as const) expect(MAPS.find((m) => m.modes.includes(mode))?.id).toBe('warehouse');
    expect(MAPS.find((m) => m.modes.includes('sandbox'))?.id).toBe('proving');
  });
});
