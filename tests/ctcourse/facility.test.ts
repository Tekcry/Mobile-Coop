/**
 * Marlow Yard facility dressing (marlow-final slice 0e; SPEC 6, KIT.md, PROPS.md 5): the shell is clad over its existing
 * boxes and every collision box and door is as 0d built it (pinned below; the only new boxes are the props' own), every
 * glowing kit piece carries a circuit group from `marlowCourseGroups()` (N11), no lamp was added, the kit stays within 60 k
 * triangles per area (gallery, lounge, each holding room, the dock) and the props pass `FacilityProps.check` per area
 * (60 k triangles, 12 draws), with the walk-in props clear of the spawns and the holding-room pads.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AIRLOCK_PAD_INSET } from '../../src/config/course';
import { FacilityKit, kitTriangles, type KitInstance } from '../../src/world/kit/facilityKit';
import { LevelBuilder } from '../../src/world/levelBuilder';
import { MARLOW_CIRCUITS, marlowCourseGroups } from '../../src/world/lighting/marlowCircuits';
import { buildCtcourse } from '../../src/world/maps/ctcourse';
import { buildFacility, GALLERY_BOX, GALLERY_GROUP, GAL_FLOOR, holdGroup, LOUNGE_GROUP, LOUNGE_LOCKERS, LOUNGE_LOCKER_BANKS, LOUNGE_LOCKER_H, DOCK_GROUP } from '../../src/world/maps/ctcourseSets/facility';
import { DOCK_BOX, HOLD_BOX, HOLD_IDS, inBox, LOUNGE_BOX, SET_BOX, SET_IDS, SPAWNS, type Box } from '../../src/world/maps/ctcourseSets/types';
import { FacilityProps, propCollisionBox, propDraws, propToWorld, propTriangles, PROP_FOOTPRINT, PROP_SET_BUDGET, type PropPlacement, type PropReport } from '../../src/world/props/facilityProps';

const kitReport = JSON.parse(readFileSync('src/world/kit/assets/facility-kit.json', 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
const propReport = JSON.parse(readFileSync('src/world/props/assets/facility-props.json', 'utf8')) as PropReport;

/** The facility's builder pieces as 0d left them (measured before the 0e edit: the first 188 boxes, their checksum below). */
const SHELL = { boxes: 188, solids: 181, doors: 14, anchors: 14, lights: 43, checksum: 68630.5123 };

const b = new LevelBuilder();
const kit = new FacilityKit(b);
const part = buildFacility(b, kit);
const built = buildCtcourse(new LevelBuilder());
const groups = new Set(Object.values(marlowCourseGroups()));

/** The props that write gameplay boxes: every placement outside the gallery (out of bounds, drawn only). */
const inGallery = (p: { x: number; y: number; z: number }): boolean => p.y >= GAL_FLOOR - 0.1 && GALLERY_BOX.some((g) => inBox(g, p.x, p.z, 0.3));
const walkIn = part.props.filter((p) => !inGallery(p));

/** The kit area an instance belongs to (plan position; the gallery is the upper level). */
function areaOf(i: KitInstance): string {
  if (i.y >= GAL_FLOOR - 0.3 && GALLERY_BOX.some((g) => inBox(g, i.x, i.z, 0.3))) return 'gallery';
  if (inBox(LOUNGE_BOX, i.x, i.z, 0.3)) return 'lounge';
  for (const h of HOLD_IDS) if (inBox(HOLD_BOX[h], i.x, i.z, 0.3)) return h;
  if (inBox(DOCK_BOX, i.x, i.z, 0.3)) return 'dock';
  return 'other';
}
/** The prop area a placement belongs to (its origin). */
function propAreaOf(p: PropPlacement): string {
  if (inGallery(p)) return 'gallery';
  if (inBox(LOUNGE_BOX, p.x, p.z)) return 'lounge';
  for (const h of HOLD_IDS) if (inBox(HOLD_BOX[h], p.x, p.z)) return h;
  if (inBox(DOCK_BOX, p.x, p.z)) return 'dock';
  for (const id of SET_IDS) if (SET_BOX[id].some((bx) => inBox(bx, p.x, p.z))) return id;
  return 'other';
}
const area = (bx: Box): { x0: number; z0: number; x1: number; z1: number } => ({ x0: bx[0], z0: bx[1], x1: bx[2], z1: bx[3] });
const checker = (list: readonly PropPlacement[]): FacilityProps => {
  const f = new FacilityProps();
  f.placements.push(...list);
  return f;
};

describe('facility dressing: the shell is as 0d built it', () => {
  it('every collision box, door and lamp is unchanged: the same 188 shell boxes (checksum), 14 doors, 43 lamps; only the props and the armoury lockers add boxes', () => {
    let sum = 0;
    for (const p of b.boxes.slice(0, SHELL.boxes)) sum += (p.c[0] + 2 * p.c[1] + 3 * p.c[2] + 5 * p.s[0] + 7 * p.s[1] + 11 * p.s[2] + p.yaw) * (p.collide ? 1 : 1.5) * (p.visible === false ? 1.25 : 1) * (p.overhead ? 1.1 : 1);
    expect(sum).toBeCloseTo(SHELL.checksum, 3);
    const propBoxes = walkIn.reduce((n, p) => n + (propCollisionBox(p)?.length ?? 0), 0);
    expect(propBoxes).toBeGreaterThan(0);
    expect(b.boxes.length).toBe(SHELL.boxes + propBoxes + LOUNGE_LOCKERS.boxes);
    expect(b.boxes.filter((p) => p.collide).length).toBe(SHELL.solids + propBoxes + LOUNGE_LOCKERS.solids);
    expect(b.anchors.doors.length).toBe(SHELL.doors);
    expect(b.anchors.all.length).toBe(SHELL.anchors);
    expect(b.lights.lights.length).toBe(SHELL.lights);
  });
  it('the gallery props write no box (out of bounds: drawn only), and none of the new boxes is a ledge', () => {
    const wrote = new Set(walkIn);
    for (const p of part.props) if (!wrote.has(p)) expect(propAreaOf(p)).toBe('gallery');
    for (const p of b.boxes.slice(SHELL.boxes)) expect(p.noLedge, `box at ${p.c.join(',')}`).toBe(true);
  });
  it('the element register still sums to what the facility added, with the dressing and plate rows', () => {
    expect(built.facility.register.map((r) => r.id)).toEqual(expect.arrayContaining(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']));
    expect(built.facility.props.length).toBe(part.props.length);
  });
});

describe('facility dressing: every glow carries its circuit (N11)', () => {
  const led = (i: KitInstance): boolean => ['wallPanel', 'skirting', 'column', 'handrail'].includes(i.piece) || (i.piece === 'ledSlot' && !i.noLed);
  it('every kit LED instance has a group present in marlowCourseGroups(); every lit slot lamp too; no lamp was added', () => {
    const glowing = kit.instances.filter(led);
    expect(glowing.length).toBeGreaterThan(100);
    for (const i of glowing) {
      expect(i.group, `${i.piece} at ${i.x},${i.y},${i.z}`).toBeDefined();
      expect(groups.has(i.group!), `${i.piece} group ${i.group}`).toBe(true);
    }
    for (const l of b.lights.lights) expect(groups.has(l.group), `lamp ${l.id} group ${l.group}`).toBe(true);
    expect(b.lights.lights.length).toBe(SHELL.lights);
  });
  it('each area is on its own circuit: holding rooms 91-97, the lounge 10, the dock 98, the gallery and its strips 90', () => {
    const row = new Map(MARLOW_CIRCUITS.map((r) => [r.group, r]));
    for (const i of kit.instances.filter((x) => x.group !== undefined)) {
      const a = areaOf(i);
      const want = a === 'lounge' ? LOUNGE_GROUP : a === 'dock' ? DOCK_GROUP : a === 'gallery' ? GALLERY_GROUP : holdGroup(a as (typeof HOLD_IDS)[number]);
      expect(i.group, `${i.piece} in ${a} at ${i.x},${i.y},${i.z}`).toBe(want);
      expect(row.get(want)?.kind).toBe('house');
    }
  });
  it('the dressing added panels and strips to the holding rooms, the lounge, the dock and the gallery', () => {
    const count = (a: string, piece: string): number => kit.instances.filter((i) => areaOf(i) === a && i.piece === piece).length;
    for (const h of HOLD_IDS) {
      expect(count(h, 'wallPanel'), `${h} panels`).toBeGreaterThanOrEqual(8);
      expect(count(h, 'skirting'), `${h} skirting`).toBeGreaterThanOrEqual(3);
    }
    expect(count('lounge', 'wallPanel')).toBeGreaterThan(0);
    expect(count('dock', 'wallPanel')).toBeGreaterThan(10);
    expect(count('gallery', 'handrail')).toBeGreaterThan(20);
    expect(count('gallery', 'ledSlot')).toBeGreaterThanOrEqual(4);
    expect(count('gallery', 'wallPanel')).toBeGreaterThan(20);
  });
});

describe('facility dressing: budgets', () => {
  it('every kit instance falls in an area, and each area (gallery, lounge, each holding room, the dock) is 60 k kit triangles or less', () => {
    const by = new Map<string, KitInstance[]>();
    for (const i of kit.instances) by.set(areaOf(i), [...(by.get(areaOf(i)) ?? []), i]);
    expect(by.has('other')).toBe(false);
    for (const [a, list] of by) {
      const tris = kitTriangles({ instances: list, doors: [] }, kitReport);
      expect(tris, `${a}: ${tris} kit triangles`).toBeLessThanOrEqual(60_000);
    }
    expect([...by.keys()].sort()).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'dock', 'gallery', 'lounge']);
  });
  it('the props pass FacilityProps.check against their area boxes: footprints inside, no overlap, 60 k triangles and 12 draws per area', () => {
    const by = new Map<string, PropPlacement[]>();
    for (const p of part.props) by.set(propAreaOf(p), [...(by.get(propAreaOf(p)) ?? []), p]);
    expect(by.has('other')).toBe(false);
    for (const h of HOLD_IDS) expect(checker(by.get(h) ?? []).check(area(HOLD_BOX[h]), propReport), h).toEqual([]);
    expect(checker(by.get('lounge') ?? []).check(area(LOUNGE_BOX), propReport)).toEqual([]);
    expect(checker(by.get('dock') ?? []).check(area(DOCK_BOX), propReport)).toEqual([]);
    // the set-side plates belong to the set they hang in (each inside its own set box, a few draws)
    for (const id of SET_IDS) {
      const list = by.get(id) ?? [];
      for (const p of list) expect(SET_BOX[id].some((bx) => checker([p]).check(area(bx)).length === 0), `${id} ${p.prop} at ${p.x},${p.z}`).toBe(true);
      expect(propDraws(list, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
    }
    // the gallery: one area of four strips; every footprint inside one of them, then the budget over the whole
    const gal = by.get('gallery') ?? [];
    expect(gal.length).toBeGreaterThan(40);
    // (the strips abut: a footprint may cross from one box to the next, so each corner must lie in some strip)
    for (const p of gal) {
      const f = PROP_FOOTPRINT[p.prop];
      for (const [lx, lz] of [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]] as const) {
        const w = propToWorld(p, lx, 0, lz);
        expect(GALLERY_BOX.some((g) => inBox(g, w[0], w[2], 0.01)), `${p.prop} at ${p.x},${p.z}: corner ${w[0].toFixed(2)},${w[2].toFixed(2)}`).toBe(true);
      }
    }
    const all = area([Math.min(...GALLERY_BOX.map((g) => g[0])), Math.min(...GALLERY_BOX.map((g) => g[1])), Math.max(...GALLERY_BOX.map((g) => g[2])), Math.max(...GALLERY_BOX.map((g) => g[3]))]);
    expect(checker(gal).check(all, propReport)).toEqual([]);
    expect(propTriangles(gal, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.tris);
    expect(propDraws(gal, propReport)).toBeLessThanOrEqual(PROP_SET_BUDGET.draws);
  });
});

describe('facility dressing: what stands where', () => {
  const of = (a: string, prop: string): PropPlacement[] => part.props.filter((p) => propAreaOf(p) === a && p.prop === prop);
  it('each holding room has a bench and a plate over both doors; each far door has its set plate on the set side', () => {
    for (const h of HOLD_IDS) {
      expect(of(h, 'holdingBench'), `${h} bench`).toHaveLength(1);
      expect(of(h, 'signPlate'), `${h} plates`).toHaveLength(2);
    }
    const setPlates = SET_IDS.flatMap((id) => of(id, 'signPlate'));
    expect(setPlates).toHaveLength(HOLD_IDS.length);
  });
  it('the lounge is an armoury: a weapons display cabinet of four kit cases on the west wall, two free benches, no reception desk, green wall or armchairs; the dock a board of plates', () => {
    expect(of('lounge', 'receptionDesk')).toHaveLength(0);
    expect(of('lounge', 'greenWall')).toHaveLength(0);
    expect(of('lounge', 'kitCaseWall')).toHaveLength(4);
    expect(of('lounge', 'loungeSeat')).toHaveLength(0);
    expect(of('lounge', 'holdingBench')).toHaveLength(2);
    for (const c of of('lounge', 'kitCaseWall')) expect(c.x, 'the cabinet backs on the west wall face').toBeCloseTo(0.25, 6);
    expect(of('dock', 'signPlate')).toHaveLength(3);
  });
  it('the armoury lockers: a solid noLedge box each (3.6 x 0.5, 1.8 m or taller) on the south and north flats, the rest thin visual skins', () => {
    const solids = b.boxes.slice(SHELL.boxes).filter((p) => p.collide && Math.abs(p.s[0] - 3.6) < 1e-6 && Math.abs(p.s[2] - 0.5) < 1e-6);
    expect(solids).toHaveLength(LOUNGE_LOCKERS.solids);
    expect(LOUNGE_LOCKER_H).toBeGreaterThanOrEqual(1.8);
    LOUNGE_LOCKER_BANKS.forEach((bank, i) => {
      const s = solids.find((p) => Math.abs(p.c[2] - (bank[1] + bank[3]) / 2) < 1e-6)!;
      expect(s, `bank ${i}`).toBeDefined();
      expect(s.noLedge, `bank ${i} noLedge`).toBe(true);
      expect(s.s[1]).toBeGreaterThanOrEqual(1.8);
      expect(s.c[0] - s.s[0] / 2).toBeCloseTo(bank[0], 6);
      expect(s.c[0] + s.s[0] / 2).toBeCloseTo(bank[2], 6);
      expect(s.s[2]).toBeCloseTo(0.5, 6);
    });
    const skins = b.boxes.slice(SHELL.boxes).filter((p) => !p.collide && inBox(LOUNGE_BOX, p.c[0], p.c[2]));
    expect(skins).toHaveLength(LOUNGE_LOCKERS.boxes - LOUNGE_LOCKERS.solids);
    for (const p of skins) {
      expect(p.noLedge).toBe(true);
      expect(Math.min(...p.s), `skin at ${p.c.join(',')}`).toBeLessThan(0.05);
    }
  });
  it('every lounge bench stands at least 0.5 m from every lounge wall face, locker face and cabinet face, and keeps the spawns\' aisle (z 9.7-12.3) to within 3 cm', () => {
    const wall: Box = [0.25, 8.25, 5.75, 13.75];
    // plan distance between two axis-aligned rectangles (a bench's yaw is 0 or pi)
    const gap = (a: Box, o: Box): number => Math.hypot(Math.max(a[0] - o[2], o[0] - a[2], 0), Math.max(a[1] - o[3], o[1] - a[3], 0));
    const benches = part.props.filter((p) => propAreaOf(p) === 'lounge' && p.prop === 'holdingBench');
    expect(benches).toHaveLength(2);
    const cases = part.props.filter((p) => p.prop === 'kitCaseWall' && propAreaOf(p) === 'lounge').flatMap((p) => propCollisionBox(p) ?? []);
    expect(cases).toHaveLength(4);
    for (const p of benches) {
      const [w] = propCollisionBox(p)!;
      const r: Box = [w!.c[0] - w!.s[0] / 2, w!.c[2] - w!.s[2] / 2, w!.c[0] + w!.s[0] / 2, w!.c[2] + w!.s[2] / 2];
      expect(Math.abs(Math.sin(w!.yaw)), 'a bench runs along x').toBeLessThan(1e-6);
      for (const d of [r[0] - wall[0], r[1] - wall[1], wall[2] - r[2], wall[3] - r[3]]) expect(d, `bench at ${p.x},${p.z} off a wall`).toBeGreaterThanOrEqual(0.5);
      for (const bank of LOUNGE_LOCKER_BANKS) expect(gap(r, bank), `bench at ${p.x},${p.z} off a locker face`).toBeGreaterThanOrEqual(0.5);
      for (const c of cases) expect(gap(r, [c.c[0] - c.s[0] / 2, c.c[2] - c.s[2] / 2, c.c[0] + c.s[0] / 2, c.c[2] + c.s[2] / 2]), 'off the cabinet').toBeGreaterThanOrEqual(0.5);
      if (p.z < 11) expect(r[3], 'aisle edge').toBeLessThanOrEqual(9.7 + 0.03);
      else expect(r[1], 'aisle edge').toBeGreaterThanOrEqual(12.3 - 0.03);
    }
  });
  it('L7 holds the model vitrine over the plinth 0d built (its footprint covers the plinth, its top skin clears the old box)', () => {
    const v = of('L7', 'modelVitrine');
    expect(v).toHaveLength(1);
    const plinth = b.boxes.slice(0, SHELL.boxes).find((p) => p.c[1] === 0.45 && p.s[0] === 1.6 && p.s[1] === 0.9 && p.s[2] === 0.6)!;
    expect(plinth).toBeDefined();
    const p = v[0]!;
    expect(Math.abs(p.x - plinth.c[0])).toBeLessThan(0.01);
    expect(p.z - 0.6).toBeLessThanOrEqual(plinth.c[2] - 0.3 + 0.01);
    expect(p.z + 0.6).toBeGreaterThanOrEqual(plinth.c[2] + 0.3);
    // the vitrine's plinth skin tops at y + 0.75, over the old box's top at 0.9
    expect(p.y + 0.75).toBeGreaterThan(0.9);
  });
  it('the gallery has consoles, chairs, feed screens and the bridge monitor wall, every one on the upper floor', () => {
    const g = part.props.filter((p) => propAreaOf(p) === 'gallery');
    for (const prop of ['galleryConsole', 'galleryChair', 'galleryScreen', 'monitorWall']) expect(g.some((p) => p.prop === prop), prop).toBe(true);
    for (const p of g) expect(p.y).toBeGreaterThanOrEqual(GAL_FLOOR);
  });
  it('no walk-in prop box blocks a spawn (0.3 m capsule) and none takes more than 15% of a holding room\'s pad', () => {
    const boxes = walkIn.flatMap((p) => (propCollisionBox(p) ?? []).map((w) => ({ w, p })));
    // distance on the plan from (x, z) to a prop's world box (its yaw is the prop's)
    const dist = (x: number, z: number, w: { c: [number, number, number]; s: [number, number, number]; yaw: number }): number => {
      const dx = x - w.c[0];
      const dz = z - w.c[2];
      const lx = dx * Math.cos(w.yaw) - dz * Math.sin(w.yaw);
      const lz = dx * Math.sin(w.yaw) + dz * Math.cos(w.yaw);
      return Math.hypot(Math.max(Math.abs(lx) - w.s[0] / 2, 0), Math.max(Math.abs(lz) - w.s[2] / 2, 0));
    };
    for (const s of SPAWNS) for (const { w, p } of boxes) expect(dist(s.x, s.z, w), `${p.prop} at the spawn ${s.x},${s.z}`).toBeGreaterThan(0.3);
    for (const h of HOLD_IDS) {
      const [x0, z0, x1, z1] = HOLD_BOX[h];
      const pad: Box = [x0 + AIRLOCK_PAD_INSET, z0 + AIRLOCK_PAD_INSET, x1 - AIRLOCK_PAD_INSET, z1 - AIRLOCK_PAD_INSET];
      let taken = 0;
      for (const { w, p } of boxes) {
        if (!inBox(HOLD_BOX[h], p.x, p.z)) continue;
        // yaws are multiples of 90 degrees: the box's plan extents swap on a quarter turn
        const quarter = Math.abs(Math.sin(w.yaw)) > 0.5;
        const hx = (quarter ? w.s[2] : w.s[0]) / 2;
        const hz = (quarter ? w.s[0] : w.s[2]) / 2;
        const ox = Math.min(w.c[0] + hx, pad[2]) - Math.max(w.c[0] - hx, pad[0]);
        const oz = Math.min(w.c[2] + hz, pad[3]) - Math.max(w.c[2] - hz, pad[1]);
        if (ox > 0 && oz > 0) taken += ox * oz;
      }
      expect(taken / ((pad[2] - pad[0]) * (pad[3] - pad[1])), `${h} pad`).toBeLessThanOrEqual(0.15);
    }
  });
});
