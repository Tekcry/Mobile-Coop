import { describe, expect, it } from 'vitest';
import { ATTACH, AttachMachine, attachKindOf, attachPose, attachRange, axisInput, climbCadence, gapBetween, LADDER_RUNG_RATE, ZIP_SPEED } from '../src/player/attach';
import { HANG, makeLedge, TraversalAnchors, type Door, type Duct, type Ladder, type Ledge, type PipeHorizontal, type Zipline } from '../src/world/anchors';

const anchors = new TraversalAnchors();
const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 4, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
const ledge = anchors.add<Ledge>(makeLedge(-3, 5, 3, 5, 2.4));
const pipeH = anchors.add<PipeHorizontal>({ kind: 'pipeH', a: { x: 10, y: 2.4, z: -2 }, b: { x: 10, y: 2.4, z: 2 }, hangHeight: 2.4, radius: 0.06 });
const zip = anchors.add<Zipline>({ kind: 'zipline', a: { x: 0, y: 8, z: 20 }, b: { x: 30, y: 2, z: 20 } });
const duct = anchors.add<Duct>({
  kind: 'duct',
  path: [
    { x: 0, y: 3, z: 40 },
    { x: 5, y: 3, z: 40 },
  ],
  entry: { pos: { x: 0, y: 3, z: 40 }, nx: -1, ny: 0, nz: 0, where: 'wall' },
  exit: { pos: { x: 5, y: 3, z: 40 }, nx: 1, ny: 0, nz: 0, where: 'wall' },
  grates: [],
});
const door = anchors.add<Door>({ kind: 'door', hinge: { x: 0, y: 0, z: 0 }, width: 1, height: 2.1, yaw: 0, swing: 1, locked: false, breachable: true });

const run = (m: AttachMachine, seconds: number, axis: number, dt = 1 / 60): void => {
  for (let t = 0; t < seconds; t += dt) m.update(dt, axis);
};

describe('attach specs', () => {
  it('every attached kind has a spec; doors / windows are not attached', () => {
    expect(attachKindOf(ladder)).toBe('ladder');
    expect(attachKindOf(door)).toBeNull();
    for (const k of Object.keys(ATTACH) as (keyof typeof ATTACH)[]) {
      const s = ATTACH[k];
      expect(s.enter).toBeGreaterThan(0);
      expect(s.exit).toBeGreaterThan(0);
      expect(s.allow.drop).toBe(true);
      expect(s.holster).toBe(true);
    }
    // stated bands: shimmy ~1.2 m/s, pipe climb ~0.9, crawl ~0.9, ladder 1.6 rungs/s
    expect(ATTACH.ledge.speed).toBeCloseTo(1.2);
    expect(ATTACH.pipeV.speed).toBeCloseTo(0.9);
    expect(ATTACH.duct.speed).toBeCloseTo(0.9);
    expect(ATTACH.ladder.speed / 0.3).toBeCloseTo(LADDER_RUNG_RATE);
    // a sidearm can come out hanging, not on a ladder
    expect(ATTACH.ledge.allow.sidearm).toBe(true);
    expect(ATTACH.ladder.allow.sidearm).toBe(false);
  });
});

describe('axis input', () => {
  it('climbs with the stick forward / back regardless of the camera', () => {
    expect(axisInput(ladder, ATTACH.ladder, 0, 1, 2.0)).toBe(1);
    expect(axisInput(ladder, ATTACH.ladder, 0, -0.6, -1)).toBeCloseTo(-0.6);
    expect(axisInput(ladder, ATTACH.ladder, 0.1, 0.1, 0)).toBe(0);
  });

  it('shimmies along the anchor by the camera-relative stick', () => {
    // the ledge runs along +x; camera looking +z (yaw 0): stick right = +x = along a -> b
    expect(axisInput(ledge, ATTACH.ledge, 1, 0, 0)).toBeCloseTo(1);
    expect(axisInput(ledge, ATTACH.ledge, -1, 0, 0)).toBeCloseTo(-1);
    // camera turned round (yaw pi): stick right is now -x
    expect(axisInput(ledge, ATTACH.ledge, 1, 0, Math.PI)).toBeCloseTo(-1);
    // pushing straight at the wall does not shimmy
    expect(Math.abs(axisInput(ledge, ATTACH.ledge, 0, 1, 0))).toBeLessThan(1e-9);
    // the horizontal pipe runs along +z: stick forward with the camera along +z goes a -> b
    expect(axisInput(pipeH, ATTACH.pipeH, 0, 1, 0)).toBeCloseTo(1);
    expect(axisInput(duct, ATTACH.duct, 0, 1, Math.PI / 2)).toBeCloseTo(1);
    expect(axisInput(zip, ATTACH.zipline, 1, 1, 0)).toBe(0);
  });
});

describe('attach poses', () => {
  const out = { x: 0, y: 0, z: 0, yaw: 0 };
  it('ladder: feet at the climb height, standing off the rungs, facing the wall', () => {
    attachPose(ladder, 1.2, 1, 1.75, out);
    expect(out.y).toBeCloseTo(1.2);
    expect(out.z).toBeLessThan(0);
    expect(out.yaw).toBeCloseTo(0);
  });
  it('ledge / pipe / zipline: hanging under the grip', () => {
    attachPose(ledge, 3, 1, 1.75, out);
    expect(out.y).toBeCloseTo(2.4 - HANG.drop);
    attachPose(pipeH, 2, 1, 1.75, out);
    expect(out.y).toBeCloseTo(2.4 - HANG.drop);
    expect(out.z).toBeCloseTo(0);
    // (3.2.0) facing along the pipe (its +z axis), never side-on like a lip
    expect(Math.abs(Math.cos(out.yaw))).toBeCloseTo(1);
    attachPose(zip, 15, 1, 1.75, out);
    expect(out.y).toBeCloseTo(5 - HANG.drop, 1);
    // a taller body hangs lower
    attachPose(ledge, 3, 1, 1.9, out);
    expect(out.y).toBeLessThan(2.4 - HANG.drop);
  });
  it('travel ranges keep the hands on the anchor', () => {
    const r = attachRange(ladder);
    expect(r.min).toBe(0);
    expect(r.max).toBeGreaterThan(2.5);
    expect(r.max).toBeLessThan(4);
    const l = attachRange(ledge);
    expect(l.min).toBeGreaterThan(0);
    expect(l.max).toBeLessThan(6);
  });
});

describe('attach machine', () => {
  it('enters, blends on, then moves along the anchor with a first-frame response', () => {
    const m = new AttachMachine();
    expect(m.enter(door, 0, 'side')).toBe(false);
    expect(m.enter(ladder, 0, 'bottom')).toBe(true);
    expect(m.phase).toBe('enter');
    run(m, ATTACH.ladder.enter + 0.02, 0);
    expect(m.phase).toBe('on');
    expect(m.progress).toBe(1);
    const s0 = m.s;
    m.update(1 / 60, 1);
    expect(m.s).toBeGreaterThan(s0);
    run(m, 1, 1);
    // top speed: 1.6 rungs/s
    expect(m.v).toBeCloseTo(ATTACH.ladder.speed, 2);
  });

  it('frame-rate independent along the anchor (60 vs 120 Hz)', () => {
    const a = new AttachMachine();
    const b = new AttachMachine();
    a.enter(ledge, 3, 'below');
    b.enter(ledge, 3, 'below');
    run(a, 1.2, 1, 1 / 60);
    run(b, 1.2, 1, 1 / 120);
    expect(Math.abs(a.s - b.s)).toBeLessThan(0.03);
  });

  it('reports pushing past the ends, stops there', () => {
    const m = new AttachMachine();
    m.enter(ledge, 5.5, 'below');
    let edge = 'none';
    for (let i = 0; i < 120; i++) edge = m.update(1 / 60, 1);
    expect(edge).toBe('max');
    expect(m.s).toBeCloseTo(m.limits.max);
    expect(m.v).toBe(0);
    // let go of the stick: no edge
    expect(m.update(1 / 60, 0)).toBe('none');
    m.enter(ladder, 0, 'bottom');
    for (let i = 0; i < 40; i++) edge = m.update(1 / 60, -1);
    expect(edge).toBe('min');
  });

  it('zipline: keeps run-up speed, builds to the top speed, ends at the bottom', () => {
    const m = new AttachMachine();
    m.enter(zip, 0, 'side', 1, 1.75, 2);
    expect(m.v).toBeCloseTo(2);
    let edge = 'none';
    for (let i = 0; i < 60 * 12 && edge === 'none'; i++) edge = m.update(1 / 60, 0);
    expect(edge).toBe('max');
    expect(m.v).toBeLessThanOrEqual(ZIP_SPEED + 1e-9);
  });

  it('exit: blends off and finishes with its reason; a slide overrides the speed', () => {
    const m = new AttachMachine();
    m.enter(ladder, 2, 'bottom');
    run(m, 0.5, 0);
    for (let i = 0; i < 18; i++) m.update(1 / 60, -1, 4.5);
    expect(m.v).toBeLessThan(-2);
    m.beginExit('bottom');
    expect(m.phase).toBe('exit');
    run(m, ATTACH.ladder.exit, 0);
    expect(m.progress).toBe(1);
    expect(m.finish()).toBe('bottom');
    expect(m.active).toBe(false);
  });

  it('climb cadence alternates hands every stride', () => {
    expect(climbCadence(0.1, 0.3).lead).toBe(1);
    expect(climbCadence(0.4, 0.3).lead).toBe(-1);
    expect(climbCadence(0.45, 0.3).swing).toBeCloseTo(0.5);
    const m = new AttachMachine();
    m.enter(ladder, 0, 'bottom');
    run(m, 0.4, 0);
    run(m, 1, 1);
    expect(m.travelled).toBeCloseTo(m.s, 5);
  });

  it('gaps to other anchors (ledge / pipe jumps)', () => {
    const from = { x: 0, y: 2.4, z: 5 };
    expect(gapBetween(from, ledge)).toBeCloseTo(0);
    expect(gapBetween({ x: 10, y: 2.4, z: 2.5 }, pipeH)).toBeCloseTo(0.5);
    expect(gapBetween(from, door)).toBe(Infinity);
  });
});
