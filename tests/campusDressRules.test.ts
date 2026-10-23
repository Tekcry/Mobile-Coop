/**
 * (sector-redesign ART-KIT step 8 / 9) The campus dressing engine on hand-built rooms: the greybox lookups (`boxAt`,
 * `cylAt`, `floorAt`, `ceilingAt`, `wallRuns`), each keepout K1-K13 rejecting a placement 5 cm inside and accepting it
 * 5 cm outside, the rule table (`DRESS_RULES` covers every tag), the planner (deterministic, per / max / minArea, never
 * over a box), the finishes (only colour; the intended `pieceKind`; light hash, collision, cover and nav unchanged), and
 * the base-pass smoke: an office dressed by `base()` gets its whiteboard, diffusers, cabinets and exit sign, and drops
 * the cabinet a route crosses.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { TraversalAnchors } from '../src/world/anchors';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { buildCoverSegments } from '../src/cover/coverData';
import { pieceKind } from '../src/world/surfaceKinds';
import type { SectorDef } from '../src/game/sectors';
import { ART_TAGS, type ArtTag } from '../src/world/campusArt/artTags';
import { boxAt, ceilingAt, cylAt, floorAt, wallRuns } from '../src/world/campusArt/geometry';
import { blocked, buildKeepouts, checkDressing, overlapsGreybox, type DressContext } from '../src/world/campusArt/keepouts';
import { DOOR_EXTRAS, DRESS_RULES, newReport, planRoom } from '../src/world/campusArt/dressRules';
import { applyFinishes, CAMPUS_FINISH, FINISH_KIND } from '../src/world/campusArt/finishes';
import { facilityCatalogue, type ArtPlacement, type CatalogueSet } from '../src/world/campusArt/catalogue';
import { CAMPUS_KIT } from '../src/world/campusArt/campusKit';
import { CampusDresser } from '../src/world/campusArt/dresser';
import { runtimeNav } from './helpers/runtimeNav';

const CATS: CatalogueSet = { F: facilityCatalogue(), K: CAMPUS_KIT };

/** A sector with nothing in it (the keepout tests add one feature each). */
function sector(o: Partial<SectorDef> = {}): SectorDef {
  return {
    id: 't',
    name: 't',
    start: { x: 90, y: 0, z: 90, yaw: 0 },
    objective: { kind: 'hack', label: 'obj', x: 95, y: 1, z: 95, yaw: 0 },
    guards: [],
    reinforce: [],
    perStage: 0,
    routes: [],
    ...o,
  } as SectorDef;
}

function ctxOf(o: Partial<DressContext> = {}): DressContext {
  const boxes: BoxPiece[] = [{ c: [0, -0.15, 0], s: [60, 0.3, 60], yaw: 0, pitch: 0, color: '#777777', collide: true }];
  return {
    section: 0,
    rooms: [{ id: 'r', name: 'r', minX: -20, maxX: 20, minZ: -20, maxZ: 20 }],
    tags: {},
    sector: sector(),
    doors: [],
    windows: [],
    anchors: new TraversalAnchors(),
    items: [],
    hides: [],
    cameras: [],
    levels: { g: 0 },
    lasers: [],
    lips: [],
    lamps: [],
    boxes,
    ...o,
  };
}

/** A probe: the solid MFD printer (0.6 x 1.15 x 0.65, yaw 0: half 0.3 along x, 0.325 along z). */
const printer = (x: number, z: number, y = 0): ArtPlacement => ({ cat: 'K', prop: 'printerMfd', x, y, z, yaw: 0, section: 0, cls: 'solid', why: 'probe' });
const HZ = 0.325;
const HX = 0.3;
const test = (ctx: DressContext, p: ArtPlacement): string | null => blocked(buildKeepouts(ctx), ctx, CAMPUS_KIT, p, 'floor-free');

/**
 * The hand-built office (x 0..12, z 0..10, walls 3.0 high and 0.3 thick on the edges, a slab at 3.0): the north wall
 * has a 1 m door gap at x 5..6 (a door anchor) into a corridor (z 10.3..13), the west wall a glass panel at z 4..6.
 */
function office(withRoute: boolean): { b: LevelBuilder; ctx: DressContext } {
  const b = new LevelBuilder();
  b.floor(6, 5, 12, 10, '#777777', 0, 0.3);
  b.floor(6, 11.65, 12, 2.7, '#777777', 0, 0.3);
  b.box(6, 1.5, -0.15, 12.6, 3, 0.3, '#a9a496');
  b.box(2.35, 1.5, 10.15, 5.3, 3, 0.3, '#a9a496');
  b.box(9.15, 1.5, 10.15, 6.3, 3, 0.3, '#a9a496');
  b.box(5.5, 2.55, 10.15, 1, 0.9, 0.3, '#a9a496');
  b.box(-0.15, 1.5, 2, 0.3, 3, 4, '#a9a496');
  b.box(-0.15, 1.5, 5, 0.1, 3, 2, '#cfd8da');
  b.boxes[b.boxes.length - 1]!.glass = 'clear';
  b.box(-0.15, 1.5, 8.15, 0.3, 3, 4.3, '#a9a496');
  b.box(12.15, 1.5, 6.5, 0.3, 3, 13.6, '#a9a496');
  b.box(6, 3.1, 6.5, 12.6, 0.2, 13.6, '#7f8588');
  b.boxes[b.boxes.length - 1]!.overhead = true;
  b.box(6, 1.5, 13.15, 12.6, 3, 0.3, '#a9a496');
  b.door(5, 0, 10.15, 1, Math.PI / 2);
  const rooms = [
    { id: 'off', name: 'Office', minX: 0, maxX: 12, minZ: 0, maxZ: 10 },
    { id: 'cor', name: 'Corridor', minX: 0, maxX: 12, minZ: 10.3, maxZ: 13 },
  ];
  const tags: Record<string, ArtTag> = { off: 'office-open', cor: 'corridor' };
  // a walked route hugging the south wall: the cabinets there are dropped (K1)
  const routes = withRoute ? [{ name: 'south', pts: [[1, 0.8], [11, 0.8]] as [number, number][], obj: 1 }] : [];
  const ctx = ctxOf({ rooms, tags, sector: sector({ routes }), doors: b.anchors.doors, windows: b.anchors.windows, anchors: b.anchors, boxes: b.boxes, cylinders: b.cylinders });
  return { b, ctx };
}

describe('greybox lookups', () => {
  it('boxAt finds one box by its centre, throws on none and on two', () => {
    const boxes: BoxPiece[] = [
      { c: [1, 1, 1], s: [1, 1, 1], yaw: 0, pitch: 0, color: '#000000', collide: true },
      { c: [5, 1, 5], s: [1, 1, 1], yaw: 0, pitch: 0, color: '#000000', collide: true },
      { c: [5.02, 1, 5], s: [1, 1, 1], yaw: 0, pitch: 0, color: '#000000', collide: true },
    ];
    expect(boxAt(boxes, 1.03, 1, 0.98)).toBe(0);
    expect(() => boxAt(boxes, 3, 1, 3)).toThrow(/no box/);
    expect(() => boxAt(boxes, 5.01, 1, 5)).toThrow(/both match/);
    expect(cylAt([{ c: [2, 1, 2], r: 0.3, h: 2, color: '#000000', collide: true }], 2.02, 1.99)).toBe(0);
    expect(() => cylAt([], 0, 0)).toThrow();
  });

  it('wallRuns: the room walls by edge, the door gap cut, the glass panel flagged', () => {
    const { ctx } = office(false);
    const runs = wallRuns(ctx.boxes, ctx.rooms[0]!, 0);
    // west: two solid + the glass; east: one; south: one; north: two (the door gap at x 5..6; the lintel is no run)
    const west = runs.filter((r) => r.nx === 1);
    const north = runs.filter((r) => r.nz === -1);
    expect(west.length).toBe(3);
    expect(west.filter((r) => r.glass).length).toBe(1);
    expect(west.map((r) => r.z0)).toEqual([0, 4, 6]);
    expect(runs.filter((r) => r.nx === -1).length).toBe(1);
    expect(runs.filter((r) => r.nz === 1).length).toBe(1);
    expect(north.length).toBe(2);
    expect(north[0]!.x1).toBeCloseTo(5, 6);
    expect(north[1]!.x0).toBeCloseTo(6, 6);
    // the faces are the walls' inner faces
    expect(west[0]!.x0).toBeCloseTo(0, 6);
    expect(north[0]!.z0).toBeCloseTo(10, 6);
  });

  it('floorAt and ceilingAt read the floor top and the slab underside (Infinity outdoors)', () => {
    const { ctx } = office(false);
    expect(floorAt(ctx.boxes, 6, 5, 0)).toBeCloseTo(0, 6);
    expect(floorAt(ctx.boxes, 6, 5, 3.5)).toBeCloseTo(3.2, 6);
    expect(ceilingAt(ctx.boxes, 6, 5, 0)).toBeCloseTo(3.0, 6);
    expect(ceilingAt(ctx.boxes, 30, 30, 0)).toBe(Infinity);
  });
});

describe('keepouts K1-K13: 5 cm inside rejects, 5 cm outside accepts (floor props)', () => {
  const inOut = (rule: string, ctx: DressContext, inside: ArtPlacement, outside: ArtPlacement): void => {
    const a = test(ctx, inside);
    expect(a, `${rule} inside`).not.toBeNull();
    expect(a!.startsWith(rule), `${rule} inside: ${a}`).toBe(true);
    expect(test(ctx, outside), `${rule} outside`).toBeNull();
  };

  it('K1 route legs: capsule 1.2', () => {
    const ctx = ctxOf({ sector: sector({ routes: [{ name: 'r', pts: [[-5, 5], [5, 5]], obj: 1 }] }) });
    inOut('K1', ctx, printer(0, 5 + HZ + 1.2 - 0.05), printer(0, 5 + HZ + 1.2 + 0.05));
  });

  it('K2 guard patrol legs: capsule 0.9', () => {
    const g = { kind: 'grunt', x: -5, z: 5, yaw: 0, route: [[5, 5]], takedownSpot: [50, 50] };
    const ctx = ctxOf({ sector: sector({ guards: [g] as unknown as SectorDef['guards'] }) });
    inOut('K2', ctx, printer(0, 5 + HZ + 0.9 - 0.05), printer(0, 5 + HZ + 0.9 + 0.05));
  });

  it('K3 doors: the opening + 1.2 deep each side (and the swing)', () => {
    const b = new LevelBuilder();
    // a door at z 5, its leaf along +x from (5, 5) to (6, 5); its zone runs 1.4 from the opening line
    b.door(5, 0, 5, 1, Math.PI / 2);
    const ctx = ctxOf({ doors: b.anchors.doors });
    inOut('K3', ctx, printer(5.5, 5 + 1.4 + HZ - 0.05), printer(5.5, 5 + 1.4 + HZ + 0.05));
  });

  it('K4 interactables: disc 1.5', () => {
    const ctx = ctxOf({ items: [{ x: 0, y: 1.2, z: 5, what: 'switch' }] });
    inOut('K4', ctx, printer(1.5 + HX - 0.05, 5), printer(1.5 + HX + 0.05, 5));
  });

  it('K5 takedown spots: disc 1.5', () => {
    const g = { kind: 'grunt', x: 50, z: 50, yaw: 0, takedownSpot: [0, 5] };
    const ctx = ctxOf({ sector: sector({ guards: [g] as unknown as SectorDef['guards'] }) });
    inOut('K5', ctx, printer(1.5 + HX - 0.05, 5), printer(1.5 + HX + 0.05, 5));
  });

  it('K6 hide spots, spawns, seeds: disc 1.2', () => {
    const ctx = ctxOf({ hides: [{ x: 0, y: 0, z: 5 }] });
    inOut('K6', ctx, printer(1.2 + HX - 0.05, 5), printer(1.2 + HX + 0.05, 5));
  });

  it('K7 co-op lips: rule 3 (a 0.6-1.7 step within 1.0 of the wall under the lip) and rule 2 (a 1.2+ box within 4.0)', () => {
    const lip = { id: 'L', section: 0, lip: { x: 0, z0: 4, z1: 6, y: 3, n: { x: 1, z: 0 } }, top: { x0: -5, x1: 0, z0: 4, z1: 6, top: 3 }, boost: { floor: 0, x: 0.5, z: 5 }, solo: '-' };
    const ctx = ctxOf({ lips: [lip] });
    inOut('K7', ctx, printer(1.0 + HX - 0.05, 5), printer(1.0 + HX + 0.05, 5));
    // a locker bank (box top 1.89) within 4.0 of the lip: rule 2
    const locker = (x: number): ArtPlacement => ({ cat: 'K', prop: 'lockerBank', x, y: 0, z: 5, yaw: 0, section: 0, cls: 'solid', why: 'probe' });
    inOut('K7', ctx, locker(4.0 + 0.445 - 0.05), locker(4.0 + 0.445 + 0.05));
  });

  it('K8 cameras: a box across a ray the greybox left clear is rejected; out of the frame it is not', () => {
    // aimed at the floor 4 m out (pitched down, range 8)
    const cam = { id: 'c', kind: 'camera', level: 'g', at: [0, 0], y: 3, facing: 0, aim: 4, reason: 'test', section: 0 } as DressContext['cameras'][number];
    const ctx = ctxOf({ cameras: [cam] });
    expect(buildKeepouts(ctx).rays.length).toBeGreaterThan(50);
    const a = test(ctx, printer(0, 3));
    expect(a?.startsWith('K8'), String(a)).toBe(true);
    expect(test(ctx, printer(0, -3))).toBeNull();
    // a ray the greybox already blocks is no keepout: a wall across the frame at z 2, the printer behind it
    const wall: BoxPiece = { c: [0, 1.5, 2], s: [30, 3, 0.3], yaw: 0, pitch: 0, color: '#777777', collide: true };
    const walled = ctxOf({ cameras: [cam] });
    walled.boxes = [...walled.boxes, wall];
    expect(test(walled, printer(0, 3))).toBeNull();
  });

  it('K9 laser beams: tube 0.3', () => {
    const ctx = ctxOf({ lasers: [{ id: 'l', x1: -5, z1: 5, x2: 5, z2: 5, ys: [0.5], floorY: 0 }] });
    inOut('K9', ctx, printer(0, 5 + HZ + 0.3 - 0.05), printer(0, 5 + HZ + 0.3 + 0.05));
  });

  it('K10 lamp fixtures: sphere 0.5', () => {
    const ctx = ctxOf({ lamps: [{ x: 0, y: 0.6, z: 5 }] });
    inOut('K10', ctx, printer(0, 5 + HZ + 0.5 - 0.05), printer(0, 5 + HZ + 0.5 + 0.05));
  });

  it('K11 traversal anchors: 1.0 round each end, 0.6 along', () => {
    const b = new LevelBuilder();
    b.ladder(0, 5, 0, 4, 0);
    const ctx = ctxOf({ anchors: b.anchors });
    inOut('K11', ctx, printer(0, 5 + HZ + 1.0 - 0.05), printer(0, 5 + HZ + 1.0 + 0.05));
  });

  it('K12 glass: 0.5 off the glass', () => {
    const ctx = ctxOf();
    ctx.boxes = [...ctx.boxes, { c: [0, 1.5, 5], s: [4, 3, 0.1], yaw: 0, pitch: 0, color: '#cfd8da', collide: true, glass: 'clear' }];
    inOut('K12', ctx, printer(0, 5.05 + HZ + 0.5 - 0.05), printer(0, 5.05 + HZ + 0.5 + 0.05));
  });

  it('K13 escape doors: a door to outside gets its escape zone (inside it nothing stands; K3 covers it first)', () => {
    const b = new LevelBuilder();
    b.door(5, 0, 5, 1, Math.PI / 2);
    // the room is north of the door only: its south side is outside
    const ctx = ctxOf({ doors: b.anchors.doors, rooms: [{ id: 'r', name: 'r', minX: 0, maxX: 12, minZ: 5, maxZ: 15 }] });
    const k = buildKeepouts(ctx);
    expect(k.zones.filter((z) => z.rule === 'K13').length).toBe(1);
    expect(test(ctx, printer(5.5, 5 + 1.2 + HZ - 0.05))).not.toBeNull();
    expect(test(ctx, printer(5.5, 5 + 1.4 + HZ + 0.05))).toBeNull();
    // with both sides in rooms the door is no escape door
    const both = ctxOf({ doors: b.anchors.doors, rooms: [{ id: 'a', name: 'a', minX: 0, maxX: 12, minZ: 5, maxZ: 15 }, { id: 'b', name: 'b', minX: 0, maxX: 12, minZ: -5, maxZ: 5 }] });
    expect(buildKeepouts(both).zones.filter((z) => z.rule === 'K13').length).toBe(0);
  });

  it('rule V and the skin rule are blocked() too', () => {
    const ctx = ctxOf();
    // a free-standing visual piece wider than 0.35 in the body band: V
    const v: ArtPlacement = { cat: 'K', prop: 'whiteboard', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'visual', why: 'probe' };
    expect(test(ctx, v)?.startsWith('V')).toBe(true);
    // a skin over a box it does not fit: S
    const s: ArtPlacement = { cat: 'K', prop: 'meetingTable', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'skin', skinOf: 0, why: 'probe' };
    expect(test(ctx, s)?.startsWith('S')).toBe(true);
  });
});

describe('the rule table and the planner', () => {
  it('DRESS_RULES covers every ART_TAG (and nothing else); DOOR_EXTRAS are the three door pieces', () => {
    expect(Object.keys(DRESS_RULES).sort()).toEqual([...ART_TAGS].sort());
    expect(DOOR_EXTRAS.map((r) => r.piece)).toEqual(['K:exitSign', 'K:fireExtinguisher', 'F:signPlate']);
    for (const tag of ART_TAGS) {
      for (const r of DRESS_RULES[tag]) {
        const [c, p] = r.piece.split(':');
        expect(CATS[c!]?.ids.includes(p!), `${tag} ${r.piece}`).toBe(true);
      }
    }
  });

  const dress = (withRoute: boolean): { ps: ArtPlacement[]; rep: ReturnType<typeof newReport>; ctx: DressContext } => {
    const { ctx } = office(withRoute);
    const k = buildKeepouts(ctx);
    const ps: ArtPlacement[] = [];
    const rep = newReport();
    planRoom(ctx, k, CATS, 'off', ps, rep);
    planRoom(ctx, k, CATS, 'cor', ps, rep);
    return { ps, rep, ctx };
  };

  it('planRoom is deterministic (two runs equal) and never overlaps a box or breaks a keepout', () => {
    const a = dress(true);
    const b = dress(true);
    expect(JSON.stringify(a.ps)).toBe(JSON.stringify(b.ps));
    expect(a.ps.length).toBeGreaterThan(10);
    expect(checkDressing(a.ctx, CATS, a.ps)).toEqual([]);
    const k = buildKeepouts(a.ctx);
    for (const p of a.ps) if (p.cls !== 'visual' || p.y < 0.5) expect(overlapsGreybox(k, a.ctx.boxes, CATS[p.cat]!, p), `${p.prop}`).toBe(-1);
  });

  it('honours per / max / minArea', () => {
    const { ps } = dress(false);
    const n = (prop: string): number => ps.filter((p) => p.prop === prop).length;
    // office 12 x 10 (120 m2): whiteboards 1 / 14 m, max 2; the printer needs 60 m2 (max 1); the water cooler 80 m2 (max 1)
    expect(n('whiteboard')).toBeGreaterThanOrEqual(1);
    expect(n('whiteboard')).toBeLessThanOrEqual(2);
    expect(n('printerMfd')).toBe(1);
    expect(n('waterCooler')).toBeLessThanOrEqual(1);
    expect(n('wallClock')).toBe(1);
    // filing cabinets in pairs, at most 4 pairs
    expect(n('filingCabinet') % 2).toBe(0);
    expect(n('filingCabinet')).toBeLessThanOrEqual(8);
    // a 5 x 5 office (25 m2) gets no printer and no water cooler
    const { ctx } = office(false);
    const small = { ...ctx, rooms: [{ id: 'off', name: 'Office', minX: 0, maxX: 5, minZ: 0, maxZ: 5 }] };
    const out: ArtPlacement[] = [];
    planRoom(small, buildKeepouts(small), CATS, 'off', out, newReport());
    expect(out.filter((p) => p.prop === 'printerMfd' || p.prop === 'waterCooler').length).toBe(0);
  });
});

describe('finishes', () => {
  it('every finish colour gives its intended pieceKind (walls at 3 m, floors and ceilings as slabs)', () => {
    for (const tag of ART_TAGS) {
      const f = CAMPUS_FINISH[tag];
      for (const [role, hex] of Object.entries(f)) {
        const want = FINISH_KIND[hex!];
        expect(want, `${tag} ${role} ${hex} in FINISH_KIND`).toBeTruthy();
        if (role === 'wall') expect(pieceKind(hex!, 0.3, 3, 4, null), `${tag} wall ${hex}`).toBe(want!.wall);
        else expect(pieceKind(hex!, 4, 0.3, 4, null), `${tag} ${role} ${hex}`).toBe(want!.slab);
      }
    }
  });

  it('applyFinishes changes only colours: the light hash, collision, cover and nav are the same', () => {
    const { b, ctx } = office(false);
    const before = JSON.stringify(b.boxes.map((x) => ({ ...x, color: '' })));
    const hash = canonicalLightSet(b.boxes, b.cylinders, 't', false).hash;
    const cover = JSON.stringify(buildCoverSegments(b.boxes, b.cylinders));
    const nav0 = runtimeNav(b, { x: 6, z: 5 }, 3, []);
    const n = applyFinishes(b.boxes, [0, b.boxes.length], ctx.rooms, ctx.tags);
    expect(n).toBeGreaterThan(3);
    expect(b.boxes.some((x) => x.color === CAMPUS_FINISH['office-open'].wall)).toBe(true);
    expect(b.boxes.some((x) => x.color === CAMPUS_FINISH['office-open'].floor)).toBe(true);
    expect(JSON.stringify(b.boxes.map((x) => ({ ...x, color: '' })))).toBe(before);
    expect(canonicalLightSet(b.boxes, b.cylinders, 't', false).hash).toBe(hash);
    expect(JSON.stringify(buildCoverSegments(b.boxes, b.cylinders))).toBe(cover);
    const nav1 = runtimeNav(b, { x: 6, z: 5 }, 3, []);
    expect(JSON.stringify(nav1.findPath([1, 1], [11, 9], 20000, 0, 0))).toBe(JSON.stringify(nav0.findPath([1, 1], [11, 9], 20000, 0, 0)));
    expect(nav1.findPath([1, 1], [11, 9], 20000, 0, 0)).toBeTruthy();
  });
});

describe('base pass smoke (step 9): an office dressed by base()', () => {
  it('places a whiteboard, diffusers, cabinets and an exit sign, and drops the cabinet a route crosses', () => {
    const { b, ctx } = office(true);
    const d = new CampusDresser(b, ctx, CATS);
    d.base();
    const n = (prop: string): number => d.placements.filter((p) => p.prop === prop).length;
    expect(n('whiteboard')).toBeGreaterThanOrEqual(1);
    expect(n('ceilingDiffuser')).toBeGreaterThanOrEqual(3);
    expect(n('filingCabinet')).toBeGreaterThanOrEqual(2);
    expect(n('exitSign')).toBeGreaterThanOrEqual(1);
    // the sign plates over the door, one each side (the office and the corridor)
    expect(n('signPlate')).toBe(2);
    // the south wall run is inside the route's 1.2 capsule: its cabinets were candidates and were dropped by K1
    expect(d.report.dropped['F:filingCabinet']?.K1 ?? 0).toBeGreaterThan(0);
    expect(d.placements.filter((p) => p.prop === 'filingCabinet').every((p) => p.z > 2.5)).toBe(true);
    const n0 = b.boxes.length;
    d.write();
    expect(b.boxes.length - n0).toBe(d.report.boxes);
    expect(d.report.boxes).toBeGreaterThan(0);
    expect(d.check()).toEqual([]);
  });
});

describe('Babylon-free modules (A111)', () => {
  it('the pure campus art modules import no Babylon', () => {
    const dir = path.resolve(__dirname, '../src/world/campusArt');
    for (const f of ['catalogue.ts', 'campusKit.ts', 'artTags.ts', 'geometry.ts', 'keepouts.ts', 'dressRules.ts', 'finishes.ts', 'dresser.ts']) {
      const src = readFileSync(path.join(dir, f), 'utf8');
      const imports = src.split('\n').filter((l) => /^\s*import\s/.test(l) && !/^\s*import type\s/.test(l));
      for (const l of imports) expect(/core\/babylon|@babylonjs/.test(l), `${f}: ${l}`).toBe(false);
    }
  });
});
