import { Vector3 } from '../../core/babylon';
import { MOVEMENT } from '../../config/movement';
import type { MapDef, MapLayout } from '../mapDef';
import type { BoxPiece, LevelBuilder } from '../levelBuilder';
import type { RoomDef } from '../rooms';
import blocks from './kestrel.blocks.json';
import { campusToBuild, type CampusFile } from './kestrelCampus';
import { walkOpenings } from './kestrelDoors';
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

/**
 * Dev only (ED2 Part B, the editor's walk test): campus data handed in before the match starts and the spawn the editor asked
 * for. `src/main.ts` sets them behind `import.meta.env.DEV`; the production build never calls this, so the B0 path is
 * unchanged.
 */
let draft: { campus: CampusFile; spawn: { x: number; z: number; level: string; yaw: number } | null } | null = null;
export function setKestrelDraft(campus: CampusFile, spawn: { x: number; z: number; level: string; yaw: number } | null): void {
  draft = { campus, spawn };
}

/** Standing clearance round the spawn: the capsule radius and a hand's width. */
const SPAWN_CLEAR = MOVEMENT.radius + 0.1;

/** Moves a point out of any wall it is within `r` of (the entry sits half a metre inside the fence, whose face is nearer than the capsule is wide). */
export function clearOfWalls(b: { readonly boxes: readonly BoxPiece[] }, x: number, z: number, y: number, r: number = SPAWN_CLEAR): [number, number] {
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

/** ON4: placed objects in the walk test (one plain grey; the editor's stealth view tints them, never the game). */
const OBJECT_COLOUR = '#7d8288';
/** ON5: climb pieces and exterior features in the walk test (one plain steel grey). */
const EXT_COLOUR = '#6d7378';

/** The editor's campus: the builder's arch plus ladders and solid service boxes, spawned where the editor camera was. */
function buildDraft(b: LevelBuilder, d: NonNullable<typeof draft>): MapLayout {
  const c = campusToBuild(d.campus);
  const layout = buildKestrel(b, c.arch);
  for (const l of c.ladders) b.ladder(l.x, l.z, l.y0, l.y1, l.yaw);
  for (const s of c.solids) b.box(s.c[0], s.c[1], s.c[2], s.s[0], s.s[1], s.s[2], STAIR_COLOUR);
  // ON4: objects as solid boxes (racks, desks, crates, vehicles); a noLedge top is never a hangable lip
  for (const o of c.objectBoxes) {
    const at = b.boxes.length;
    b.box(o.c[0], o.c[1], o.c[2], o.s[0], o.s[1], o.s[2], OBJECT_COLOUR);
    if (o.noLedge) b.mark(at, { noLedge: true });
  }
  // ON5: climb pieces through the engine's own builders (a downpipe is pipeV, a pipe pipeH, a fence fence, a duct its hollow
  // and a duct anchor, ledges are box tops); a piece that is not climbable is plain collision with no ledge
  for (const o of c.exterior) {
    if (o.t === 'pipeV') b.pipeV(o.x, o.z, o.y0, o.y1, o.side, EXT_COLOUR);
    else if (o.t === 'pipeH') b.pipeH(o.a[0], o.a[1], o.b[0], o.b[1], o.y, EXT_COLOUR);
    else if (o.t === 'fence') b.fence(o.a[0], o.a[1], o.b[0], o.b[1], o.h, o.y);
    else if (o.t === 'duct') b.duct(o.path, o.entry, o.exit);
    else if (o.t === 'stairs') b.stairs(o.x, o.z, o.w, o.len, o.rise, o.steps, EXT_COLOUR, o.yaw, o.y);
    else if (o.t === 'pillar') b.pillar(o.x, o.z, o.r, o.h, EXT_COLOUR, o.y);
    else {
      const at = b.boxes.length;
      b.box(o.c[0], o.c[1], o.c[2], o.s[0], o.s[1], o.s[2], EXT_COLOUR, o.yaw, 0, o.collide);
      if (o.noLedge) b.mark(at, { noLedge: true });
    }
  }
  // ON5: floors marked by finish (footstep loudness and sound, src/world/surfaces.ts)
  for (const s of c.surfaces) b.surface(s.kind, s.rect[0], s.rect[2], s.rect[1], s.rect[3], s.top);
  // ON10: roofs as boxes the game stands on (strips tilted to a slope; too steep and the controller slides off), so the
  // moon and sky bakes see them as they see any box (bible 5.1); sawtooth glazing as the game's glass panes
  for (const r of c.roofBoxes) b.box(r.c[0], r.c[1], r.c[2], r.s[0], r.s[1], r.s[2], r.colour, r.yaw, r.pitch);
  for (const p of c.roofPanes) b.windowAt(p.c[0], p.c[1], p.c[2], p.w, p.h, p.yaw, { breakable: true });
  // ON9: swing doors as the game's hinged doors, windows as its glass panes; sliding and glass doors stay gaps (stage DR)
  const ops = walkOpenings(c.arch);
  for (const o of ops.doors) b.door(o.hinge[0], o.hinge[1], o.hinge[2], o.width, o.yaw, { height: o.height, swing: o.swing, locked: o.locked });
  for (const p of ops.panes) b.windowAt(p.c[0], p.c[1], p.c[2], p.w, p.h, p.yaw, { breakable: p.breakable });
  if (d.spawn) {
    const y = levelOf(c.arch, d.spawn.level).floor;
    const [x, z] = clearOfWalls(b, d.spawn.x, d.spawn.z, y, SPAWN_CLEAR);
    layout.playerSpawns = [{ pos: new Vector3(x, y, z), yaw: d.spawn.yaw }];
  }
  return layout;
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
    for (const l of lay.landing ? [lay.landing, ...lay.landings] : lay.landings) {
      const [x0, z0, x1, z1] = l.rect;
      b.floor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, STAIR_COLOUR, l.top, SLAB);
    }
  }

  // the ground level (an editor rename of G keeps the walk test working: the level nearest floor 0)
  const ground = arch.levels.find((l) => l.id === 'G') ?? arch.levels.reduce((a, l) => (Math.abs(l.floor) < Math.abs(a.floor) ? l : a));
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
  // ON0b (Michael): no generated wall or floor dressing; everything on a wall is placed on purpose in the editor
  detail: false,
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
    return draft ? buildDraft(b, draft) : buildKestrel(b, SOURCE);
  },
};
