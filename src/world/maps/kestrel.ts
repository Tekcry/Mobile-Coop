import { Vector3 } from '../../core/babylon';
import { MOVEMENT } from '../../config/movement';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import blocks from './kestrel.blocks.json';
import { debugSpots, floorTiles, levelOf, ringFloorColour, SLAB, stairLayout, STAIR_COLOUR, wallBoxes, type KestrelArch } from './kestrelGeo';

/**
 * Cinder Yard, Mission 1 "Dead Line" (internal id `kestrel`), to `docs/kestrel/`. B0 is the massing walk: the approved block
 * plan (`kestrel.blocks.json`, a copy of `docs/kestrel/kestrel.blocks.json`; a test keeps them equal) as plain volumes: a floor
 * per zone (each ring its own grey), walls with their openings as gaps, dog-leg stairs, the slabs with their voids, the roof
 * parapets and the depot facade and viaduct as solid boundary walls. No doors, anchors, lights or guards. B1 points
 * `buildKestrel` at `kestrel.arch.json`: the builder reads any file in the arch schema (`docs/kestrel/schema.md`), and no
 * coordinate is typed here (RULES section 12). Geometry rules: `kestrelGeo.ts`.
 */
const SOURCE = blocks as unknown as KestrelArch;

/** Standing clearance round the spawn: the capsule radius and a hand's width. */
const SPAWN_CLEAR = MOVEMENT.radius + 0.1;

/** Moves a point out of any wall it is within `r` of (the entry sits half a metre inside the fence, whose face is nearer than the capsule is wide). */
function clearOfWalls(b: LevelBuilder, x: number, z: number, y: number, r: number): [number, number] {
  for (let pass = 0; pass < 3; pass++) {
    for (const p of b.boxes) {
      if (!p.collide || p.pitch !== 0 || p.yaw !== 0 || p.c[1] + p.s[1] / 2 <= y + 0.1 || p.c[1] - p.s[1] / 2 > y + 1.6) continue;
      const dx = x - p.c[0];
      const dz = z - p.c[2];
      const px = p.s[0] / 2 + r - Math.abs(dx);
      const pz = p.s[2] / 2 + r - Math.abs(dz);
      if (px <= 0 || pz <= 0) continue;
      if (px < pz) x += Math.sign(dx || 1) * px;
      else z += Math.sign(dz || 1) * pz;
    }
  }
  return [x, z];
}

export function buildKestrel(b: LevelBuilder, arch: KestrelArch): MapLayout {
  const [sx0, sz0, sx1, sz1] = arch.meta.site;
  b.bounds = { minX: sx0, maxX: sx1, minZ: sz0, maxZ: sz1 };

  // floors and slabs: every room's floor on its level, voids cut out (the first floor and the roof are slabs over the rooms below)
  for (const l of arch.levels) {
    for (const t of floorTiles(arch, l.id)) {
      const [x0, z0, x1, z1] = t.rect;
      b.floor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, ringFloorColour(t.ring), t.top, SLAB);
    }
  }

  for (const w of arch.walls) for (const p of wallBoxes(arch, w)) b.box(p.c[0], p.c[1], p.c[2], p.s[0], p.s[1], p.s[2], p.colour);

  for (const s of arch.stairs) {
    const lay = stairLayout(arch, s);
    for (const f of lay.flights) b.stairs(f.c[0], f.c[1], f.w, f.len, f.rise, f.steps, STAIR_COLOUR, f.yaw, f.y);
    if (lay.landing) {
      const [x0, z0, x1, z1] = lay.landing.rect;
      b.floor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, STAIR_COLOUR, lay.landing.top, SLAB);
    }
  }

  const ground = levelOf(arch, 'G');
  const [ex, ez] = clearOfWalls(b, arch.meta.entry[0], arch.meta.entry[1], ground.floor, SPAWN_CLEAR);
  const rooms: RoomDef[] = arch.rooms.map((r) => {
    const l = levelOf(arch, r.level);
    // the floor of the nearest level that has a room over any part of this one
    const above = arch.levels.filter((u) => u.floor > l.floor && arch.rooms.some((q) => q.level === u.id && q.rect[0] < r.rect[2] && q.rect[2] > r.rect[0] && q.rect[1] < r.rect[3] && q.rect[3] > r.rect[1]));
    const top = above.length ? Math.min(...above.map((u) => u.floor)) - 0.05 : l.floor + l.height + 8;
    return { id: r.id, name: r.name.startsWith(r.id) ? r.name : `${r.id} ${r.name}`, minX: r.rect[0], maxX: r.rect[2], minZ: r.rect[1], maxZ: r.rect[3], minY: l.floor - 0.05, maxY: top };
  });

  return {
    // (the spawn is meta.entry, moved clear of a wall by at most a hand's width)
    playerSpawns: [{ pos: new Vector3(ex, ground.floor, ez), yaw: 0 }],
    enemySpawns: [],
    props: [],
    objectives: [],
    pickups: [],
    rooms,
    debugPoints: debugSpots(arch).map((d) => {
      const r = arch.rooms.find((q) => q.id === d.room)!;
      return { group: levelOf(arch, d.level).name, id: d.room, label: r.name.startsWith(r.id) ? r.name : `${d.room} ${r.name}`, pos: new Vector3(d.x, d.y, d.z), yaw: 0 };
    }),
  };
}

export const kestrel: MapDef = {
  id: 'kestrel',
  name: 'Cinder Yard',
  description: 'Mission 1 Dead Line, massing walk: the block plan of the Cinder Yard data centre as plain volumes.',
  modes: ['sandbox'],
  theme: {
    sky: '#8fa1b3',
    horizon: '#b9c3cc',
    ground: '#5f6364',
    fogStart: 120,
    fogEnd: 400,
    sunDir: [0.5, -0.8, 0.45],
    sunIntensity: 0.5,
    ambient: 1.4,
    lightLevel: 0.9,
    faction: 'urban',
  },
  build(b: LevelBuilder): MapLayout {
    return buildKestrel(b, SOURCE);
  },
};
