import { describe, expect, it } from 'vitest';
import {
  anchorLength,
  anchorsNear,
  closestOn,
  ductPoint,
  generateLedges,
  hangPoint,
  HANG,
  insideBox,
  lipGrips,
  makeLedge,
  nearestInReach,
  nearestRung,
  reach,
  rungHeights,
  suppressLedgesNear,
  TraversalAnchors,
  type AnchorBox,
  type Duct,
  type Ladder,
  type Ledge,
  type PipeHorizontal,
  type PipeVertical,
  type WindowAnchor,
  type Zipline,
} from '../src/world/anchors';

const box = (x: number, y0: number, z: number, w: number, h: number, d: number, yaw = 0, extra: Partial<AnchorBox> = {}): AnchorBox => ({ c: [x, y0 + h / 2, z], s: [w, h, d], yaw, pitch: 0, collide: true, ...extra });

describe('ledge generation', () => {
  it('a tall block gives four lips at its top, outward normals, linked round the corners', () => {
    const a = generateLedges([box(0, 0, 0, 4, 2.5, 2)]);
    expect(a.ledges.length).toBe(4);
    for (const l of a.ledges) {
      expect(l.top).toBeCloseTo(2.5);
      expect(l.canHang).toBe(true);
      expect(l.canClimbUp).toBe(true);
      // the normal points away from the block centre
      const mx = (l.a.x + l.b.x) / 2;
      const mz = (l.a.z + l.b.z) / 2;
      expect(mx * l.nx + mz * l.nz).toBeGreaterThan(0);
      expect(l.nextA).toBeGreaterThanOrEqual(0);
      expect(l.nextB).toBeGreaterThanOrEqual(0);
    }
    const lens = a.ledges.map((l) => Math.round(l.len * 10) / 10).sort();
    expect(lens).toEqual([2, 2, 4, 4]);
  });

  it('short pieces resting on the floor (vault / mantle height) make no ledges; raised slabs do', () => {
    expect(generateLedges([box(0, 0, 0, 2, 1.2, 1)]).ledges.length).toBe(0);
    expect(generateLedges([box(0, 0, 0, 2, 1.8, 1)]).ledges.length).toBe(0);
    // a mezzanine deck 0.3 thick at 3 m: its edge is a lip with a 3 m drop
    const deck = generateLedges([box(0, 2.7, 0, 6, 0.3, 4)]);
    expect(deck.ledges.length).toBe(4);
    expect(deck.ledges[0]!.drop).toBeCloseTo(3);
    // a thin wall is hang-only (no room on top)
    const wall = generateLedges([box(0, 0, 0, 0.3, 3, 4)]);
    expect(wall.ledges.filter((l) => l.len > 1).every((l) => l.canHang && !l.canClimbUp)).toBe(true);
  });

  it('pieces that are hidden, non-colliding, pitched or flagged make none', () => {
    expect(generateLedges([box(0, 0, 0, 2, 3, 2, 0, { visible: false })]).ledges.length).toBe(0);
    expect(generateLedges([box(0, 0, 0, 2, 3, 2, 0, { collide: false })]).ledges.length).toBe(0);
    expect(generateLedges([box(0, 0, 0, 2, 3, 2, 0, { pitch: 0.3 })]).ledges.length).toBe(0);
    expect(generateLedges([box(0, 0, 0, 2, 3, 2, 0, { noLedge: true })]).ledges.length).toBe(0);
  });

  it('a crate stacked on top cuts the lip under it; a wall pressed against a face cuts that face', () => {
    // 4 m long block, a 1 m crate sitting on its +x end
    const a = generateLedges([box(0, 0, 0, 4, 2.2, 2), box(1.5, 2.2, 0, 1, 1, 2, 0, { noLedge: true })]);
    // the +z and -z lips are cut short (the crate covers x 1..2); the +x lip is fully covered
    const long = a.ledges.filter((l) => Math.abs(l.tz) < 0.1);
    expect(long.length).toBe(2);
    for (const l of long) {
      const xs = [l.a.x, l.b.x].sort((p, q) => p - q);
      expect(xs[1]!).toBeLessThan(1.05);
      expect(xs[0]!).toBeCloseTo(-2, 1);
      // a cut lip loses its corner links
      expect(l.nextA === -1 || l.nextB === -1).toBe(true);
    }
    const plusX = a.ledges.filter((l) => l.nx > 0.9);
    expect(plusX.length).toBe(0);
    // a wall built against the -x face: that lip goes (the hands would be inside the wall)
    const b = generateLedges([box(0, 0, 0, 4, 2.2, 2), box(-2.3, 0, 0, 0.6, 3, 6, 0, { noLedge: true })]);
    expect(b.ledges.some((l) => l.nx < -0.9)).toBe(false);
  });

  it('yawed blocks keep their lips on their rotated edges', () => {
    const a = generateLedges([box(5, 0, 5, 2, 3, 2, Math.PI / 4)]);
    expect(a.ledges.length).toBe(4);
    for (const l of a.ledges) {
      // every lip lies on the rotated square's boundary (|local| = 1 on one axis)
      const mx = (l.a.x + l.b.x) / 2 - 5;
      const mz = (l.a.z + l.b.z) / 2 - 5;
      expect(Math.hypot(mx, mz)).toBeCloseTo(1, 3);
      expect(Math.abs(l.nx * l.tx + l.nz * l.tz)).toBeLessThan(1e-6);
    }
  });

  it('manual overrides: add a ledge, suppress generated ones near a point', () => {
    const a = generateLedges([box(0, 0, 0, 4, 2.5, 2)]);
    a.add<Ledge>(makeLedge(10, 0, 12, 0, 3));
    expect(a.ledges.length).toBe(5);
    suppressLedgesNear(a, 0, 1, 0.2);
    // the +z lip (z = 1) is off; the others stay
    expect(a.ledges.filter((l) => l.canHang).length).toBe(4);
  });

  it('insideBox handles yaw and padding', () => {
    const b = box(0, 0, 0, 2, 2, 1, Math.PI / 2);
    // rotated 90 deg: the long side is along z now
    expect(insideBox(b, 0, 1, 0.9)).toBe(true);
    expect(insideBox(b, 0.9, 1, 0)).toBe(false);
    expect(insideBox(b, 0.55, 1, 0, 0.1)).toBe(true);
  });
});

describe('anchor geometry', () => {
  const anchors = new TraversalAnchors();
  const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 4, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
  const pipe = anchors.add<PipeVertical>({ kind: 'pipeV', base: { x: 5, y: 0, z: 0 }, top: { x: 5, y: 6, z: 0 }, side: 0, radius: 0.06 });
  const pipeH = anchors.add<PipeHorizontal>({ kind: 'pipeH', a: { x: 10, y: 2.4, z: -2 }, b: { x: 10, y: 2.4, z: 2 }, hangHeight: 2.4, radius: 0.06 });
  const ledge = anchors.add<Ledge>(makeLedge(-2, 10, 2, 10, 2.2));
  const zip = anchors.add<Zipline>({ kind: 'zipline', a: { x: 20, y: 6, z: 0 }, b: { x: 40, y: 1, z: 0 } });
  const duct = anchors.add<Duct>({
    kind: 'duct',
    path: [
      { x: 0, y: 3, z: 20 },
      { x: 4, y: 3, z: 20 },
      { x: 4, y: 3, z: 24 },
    ],
    entry: { pos: { x: 0, y: 3, z: 20 }, nx: -1, ny: 0, nz: 0, where: 'wall' },
    exit: { pos: { x: 4, y: 3, z: 24 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    grates: [],
  });

  it('ids index the list; per-kind lists fill', () => {
    expect(anchors.size).toBe(6);
    expect(anchors.get(ledge.id)).toBe(ledge);
    expect(anchors.ladders).toEqual([ladder]);
    expect(anchors.ducts).toEqual([duct]);
    expect(anchors.get(99)).toBeNull();
  });

  it('closest points and lengths', () => {
    expect(anchorLength(ladder)).toBeCloseTo(4);
    expect(anchorLength(pipeH)).toBeCloseTo(4);
    expect(anchorLength(duct)).toBeCloseTo(8);
    const q = closestOn(pipeH, 11, 0, 1);
    expect(q.z).toBeCloseTo(1);
    expect(q.dist).toBeCloseTo(1);
    expect(q.y).toBeCloseTo(2.4);
    const d = closestOn(duct, 5, 3, 22);
    expect(d.s).toBeCloseTo(6);
    const z = closestOn(zip, 30, 0, 0.5);
    expect(z.y).toBeCloseTo(3.5);
  });

  it('duct points walk the polyline', () => {
    const out = { x: 0, y: 0, z: 0, dx: 0, dz: 0 };
    ductPoint(duct, 2, out);
    expect(out.x).toBeCloseTo(2);
    expect(out.dx).toBeCloseTo(1);
    ductPoint(duct, 5, out);
    expect(out.z).toBeCloseTo(21);
    expect(out.dz).toBeCloseTo(1);
    ductPoint(duct, 100, out);
    expect(out.z).toBeCloseTo(24);
  });

  it('hang point: under the lip, out from the face, facing the wall; grips on the lip around the body', () => {
    const h = hangPoint(ledge, 2);
    expect(h.y).toBeCloseTo(2.2 - HANG.drop);
    // the ledge's outward normal is (0, -1)... body sits on that side, facing back towards the wall
    expect(h.z - 10).toBeCloseTo(ledge.nz * HANG.out);
    expect(Math.sin(h.yaw)).toBeCloseTo(-ledge.nx);
    expect(Math.cos(h.yaw)).toBeCloseTo(-ledge.nz);
    const L = { x: 0, y: 0, z: 0 };
    const R = { x: 0, y: 0, z: 0 };
    lipGrips(ledge, 2, 0.2, L, R);
    expect(L.y).toBeCloseTo(2.2);
    expect(Math.hypot(L.x - R.x, L.z - R.z)).toBeCloseTo(0.4);
    // the right hand is on the climber's right: right = (cos yaw, -sin yaw)
    const rx = Math.cos(h.yaw);
    const rz = -Math.sin(h.yaw);
    expect((R.x - L.x) * rx + (R.z - L.z) * rz).toBeGreaterThan(0);
    // the hang point stays off the ends
    expect(hangPoint(ledge, -5).x).toBeCloseTo(-2 + 0.25);
  });

  it('rungs: evenly spaced, nearest snaps inside the ladder', () => {
    const r = rungHeights(ladder);
    expect(r[0]).toBeCloseTo(0.3);
    expect(r[1]! - r[0]!).toBeCloseTo(0.3);
    expect(r[r.length - 1]!).toBeLessThan(4);
    expect(nearestRung(ladder, 1.0)).toBeCloseTo(0.9);
    expect(nearestRung(ladder, -3)).toBeCloseTo(0.3);
    expect(nearestRung(ladder, 99)).toBeLessThan(4);
  });

  it('reach tests by entry', () => {
    // ladder from the bottom, facing it; not when facing away
    expect(reach(ladder, 0, 0, -0.5, 0, 1)?.entry).toBe('bottom');
    expect(reach(ladder, 0, 0, -0.5, 0, -1)).toBeNull();
    // and from the top floor
    expect(reach(ladder, 0, 4, 0.9, 0, -1)?.entry).toBe('top');
    // drainpipe alongside, below its top
    expect(reach(pipe, 5, 0, -0.5, 0, 1)?.entry).toBe('side');
    expect(reach(pipe, 5, 5.5, -0.5, 0, 1)).toBeNull();
    // horizontal pipe: only from below at grab height
    expect(reach(pipeH, 10, 0.2, 0, 1, 0)?.entry).toBe('below');
    expect(reach(pipeH, 10, -1.5, 0, 1, 0)).toBeNull();
    // ledge: jump up from below facing the wall (outward normal is -z here: stand at z < 10)
    expect(ledge.nz).toBeLessThan(0);
    expect(reach(ledge, 0, 0, 9.6, 0, 1)?.entry).toBe('below');
    // lower in from the top, facing out over the lip
    expect(reach(ledge, 0, 2.2, 10.4, 0, -1)?.entry).toBe('above');
    expect(reach(ledge, 0, 2.2, 10.4, 0, 1)).toBeNull();
    // zipline: near the high end, cable overhead
    expect(reach(zip, 20.5, 4, 0, 1, 0)?.entry).toBe('side');
    expect(reach(zip, 30, 0, 0, 1, 0)).toBeNull();
  });

  it('nearest in reach picks the closest, filtered by kind; anchorsNear sorts', () => {
    const r = nearestInReach(anchors, 0, 0, -0.4, 0, 1);
    expect(r?.anchor).toBe(ladder);
    expect(nearestInReach(anchors, 0, 0, -0.4, 0, 1, ['pipeV'])).toBeNull();
    const near = anchorsNear(anchors, 4, 0, 0, 6);
    expect(near[0]!.anchor).toBe(pipe);
    expect(near.map((n) => n.anchor.kind)).toContain('ladder');
  });
});

describe('2b reach rules', () => {
  const a = new TraversalAnchors();
  const win = a.add<WindowAnchor>({ kind: 'window', c: { x: 0, y: 1.5, z: 0 }, w: 1.2, h: 1.2, yaw: 0, sillHeight: 0.9, breakable: true, open: false });
  const duct = a.add<Duct>({
    kind: 'duct',
    path: [
      { x: 0.25, y: 3, z: 10 },
      { x: 5, y: 3, z: 10 },
    ],
    entry: { pos: { x: 0, y: 3.35, z: 10 }, nx: -1, ny: 0, nz: 0, where: 'wall' },
    exit: { pos: { x: 5, y: 2.9, z: 10 }, nx: 0, ny: -1, nz: 0, where: 'ceiling' },
    grates: [],
  });
  const lad = a.add<Ladder>({ kind: 'ladder', base: { x: 20, y: 0, z: 0 }, top: { x: 20, y: 3, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });

  it('windows: from either side facing through, sill at vault height, within the frame', () => {
    expect(reach(win, 0, 0, -0.8, 0, 1)?.entry).toBe('side');
    expect(reach(win, 0, 0, 0.8, 0, -1)?.entry).toBe('side');
    // facing away, too far, off to the side of the frame, sill too high
    expect(reach(win, 0, 0, -0.8, 0, -1)).toBeNull();
    expect(reach(win, 0, 0, -2, 0, 1)).toBeNull();
    expect(reach(win, 0.55, 0, -0.8, 0, 1)).toBeNull();
    expect(reach(win, 0, -0.6, -0.8, 0, 1)).toBeNull();
  });

  it('ducts: at the grate, facing into it', () => {
    expect(reach(duct, -0.6, 3, 10, 1, 0)?.entry).toBe('side');
    expect(reach(duct, -0.6, 3, 10, -1, 0)).toBeNull();
    expect(reach(duct, -0.6, 0, 10, 1, 0)).toBeNull();
  });

  it('ladder tops: walking out towards the edge it hangs off, not facing back', () => {
    expect(reach(lad, 20, 3, 0.9, 0, -1)?.entry).toBe('top');
    expect(reach(lad, 20, 3, 0.9, 0, 1)).toBeNull();
  });

  it('nearestInReach takes an accept filter', () => {
    expect(nearestInReach(a, 0, 0, -0.8, 0, 1, undefined, (r) => r.anchor.kind !== 'window')).toBeNull();
  });
});
