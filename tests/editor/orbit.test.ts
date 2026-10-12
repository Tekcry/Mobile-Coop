import { describe, expect, it } from 'vitest';
import { action, ACTIONS, conflicts } from '../../src/editor/actions';
import { HOLD, PAD, PadState } from '../../src/editor/pad';
import { approach, ORBIT, OrbitCam, orbitFromPose, orbitInput, orbitPosition, raiseCamera, shapeStick } from '../../src/editor/orbit';
import type { OrbitInput, OrbitState } from '../../src/editor/orbit';

const still: OrbitInput = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, precision: false };
const base = (): OrbitState => ({ tx: 10, tz: 20, floorY: 4.2, dist: 25, yaw: 0, pitch: 0.9 });
/** View direction for a yaw and pitch, as controls.ts forward(). */
const fwd = (yaw: number, pitch: number): [number, number, number] => [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];

describe('orbit camera maths', () => {
  it('the camera sits back from the target along the view direction', () => {
    const s = base();
    const p = orbitPosition(s);
    const f = fwd(s.yaw, s.pitch);
    for (let i = 0; i < 3; i++) expect(p[i]! + f[i]! * s.dist).toBeCloseTo([s.tx, s.floorY, s.tz][i]!, 9);
    // yaw 0 looks north: the camera is south of the target and above it
    expect(p[2]).toBeLessThan(s.tz);
    expect(p[1]).toBeGreaterThan(s.floorY);
  });

  it('pans relative to the camera yaw, faster when zoomed out, slower with precision', () => {
    const s = base();
    orbitInput(s, { ...still, panY: 1 }, 1);
    expect(s.tx).toBeCloseTo(10, 9);
    expect(s.tz).toBeCloseTo(20 + ORBIT.PAN * 25, 9);
    const e = { ...base(), yaw: Math.PI / 2 };
    orbitInput(e, { ...still, panY: 1 }, 1);
    expect(e.tx).toBeCloseTo(10 + ORBIT.PAN * 25, 9); // facing east, forward is +x
    const r = base();
    orbitInput(r, { ...still, panX: 1, precision: true }, 1);
    expect(r.tx).toBeCloseTo(10 + ORBIT.PAN * 25 * ORBIT.PRECISION, 9); // facing north, right is +x
  });

  it('clamps zoom and tilt', () => {
    const s = base();
    orbitInput(s, { ...still, zoom: 1, tiltY: -1 }, 100);
    expect(s.dist).toBe(ORBIT.DIST_MIN);
    expect(s.pitch).toBe(ORBIT.PITCH_MAX);
    orbitInput(s, { ...still, zoom: -1, tiltY: 1 }, 100);
    expect(s.dist).toBe(ORBIT.DIST_MAX);
    expect(s.pitch).toBe(ORBIT.PITCH_MIN);
  });

  it('entering from a fly pose keeps the view (no jump)', () => {
    const yaw = 0.7;
    const pitch = 0.8;
    const pos: [number, number, number] = [5, 30, -10];
    const f = fwd(yaw, pitch);
    const t = (0 - pos[1]) / f[1];
    const hit: [number, number] = [pos[0] + f[0] * t, pos[2] + f[2] * t];
    const s = orbitFromPose(pos, yaw, pitch, 0, hit);
    expect(s.yaw).toBe(yaw);
    expect(s.pitch).toBe(pitch);
    const p = orbitPosition(s);
    for (let i = 0; i < 3; i++) expect(p[i]).toBeCloseTo(pos[i]!, 6);
  });

  it('a centre ray that misses or hits too far uses the point 25 m ahead', () => {
    const s = orbitFromPose([0, 2, 0], Math.PI / 2, 0.1, 0, null);
    expect(s.tx).toBeCloseTo(ORBIT.AHEAD, 9);
    expect(s.tz).toBeCloseTo(0, 9);
    expect(s.pitch).toBe(ORBIT.PITCH_MIN);
    const far = orbitFromPose([0, 2, 0], 0, 0.4, 0, [0, 500]);
    expect(far.tz).toBeCloseTo(ORBIT.AHEAD, 9);
  });

  it('top-down swaps to straight down, north up, and back', () => {
    const o = new OrbitCam();
    o.enter({ ...base(), yaw: 2, pitch: 0.6 });
    o.toggleTopDown();
    expect(o.topDown).toBe(true);
    o.update(ORBIT.EASE_TOP / 2);
    expect(o.s.pitch).toBeGreaterThan(0.6);
    o.update(ORBIT.EASE_TOP);
    expect(o.s.pitch).toBeCloseTo(ORBIT.PITCH_MAX, 9);
    expect(o.s.yaw).toBeCloseTo(0, 9);
    o.toggleTopDown();
    o.update(1);
    expect(o.topDown).toBe(false);
    expect(o.s.yaw).toBeCloseTo(2, 9);
    expect(o.s.pitch).toBeCloseTo(0.6, 9);
  });

  it('the right stick while top-down forgets the saved view', () => {
    const o = new OrbitCam();
    o.enter(base());
    o.toggleTopDown();
    o.update(1);
    o.input({ ...still, orbitX: 0.5 }, 0.1);
    expect(o.topDown).toBe(false);
  });

  it('level change and go-to ease the target, keeping yaw, pitch and zoom', () => {
    const o = new OrbitCam();
    o.enter(base());
    o.setFloor(8.4);
    o.update(ORBIT.EASE_LEVEL);
    expect(o.s.floorY).toBeCloseTo(8.4, 9);
    o.goTo(40, 50, 8.4);
    o.update(ORBIT.EASE_GO / 2);
    expect(o.s.tx).toBeGreaterThan(10);
    expect(o.s.tx).toBeLessThan(40);
    o.update(ORBIT.EASE_GO);
    expect([o.s.tx, o.s.tz, o.s.dist, o.s.yaw, o.s.pitch]).toEqual([40, 50, 25, 0, 0.9]);
  });
});

describe('ON0b camera feel', () => {
  it('radial dead zone 0.15, then an exponent-2 curve; direction kept, full at the rim', () => {
    expect(shapeStick(0.1, 0.1, ORBIT.DEAD)).toEqual([0, 0]);
    expect(shapeStick(0.15, 0, ORBIT.DEAD)).toEqual([0, 0]);
    const [x, y] = shapeStick(1, 0, ORBIT.DEAD);
    expect(x).toBeCloseTo(1, 9);
    expect(y).toBe(0);
    // half way out of the dead zone gives a quarter
    const mid = ORBIT.DEAD + (1 - ORBIT.DEAD) / 2;
    expect(shapeStick(0, -mid, ORBIT.DEAD)[1]).toBeCloseTo(-0.25, 9);
    const d = shapeStick(0.6, 0.6, ORBIT.DEAD);
    expect(d[0]).toBeCloseTo(d[1], 12);
    expect(Math.hypot(...shapeStick(0.9, 0.9, ORBIT.DEAD))).toBeCloseTo(1, 9);
  });

  it('the ease reaches full speed in 0.25 s (medium) and stops without overshoot', () => {
    let v = 0;
    for (let i = 0; i < 15; i++) v = approach(v, 1, 1 / 60, ORBIT.EASE.medium);
    expect(v).toBeCloseTo(15 / 60 / 0.25, 9); // still easing in after 0.25 s
    for (let i = 0; i < 10; i++) v = approach(v, 1, 1 / 60, ORBIT.EASE.medium);
    expect(v).toBe(1);
    const seen: number[] = [];
    for (let i = 0; i < 20; i++) seen.push((v = approach(v, 0, 1 / 60, ORBIT.EASE.medium)));
    expect(seen.every((q) => q >= 0)).toBe(true);
    expect(v).toBe(0);
    expect(approach(0.4, -1, 0.01, 0)).toBe(-1);
  });

  it('a full stick pans about one screen width in 1.5 s at the default zoom', () => {
    const o = new OrbitCam();
    o.enter(base());
    for (let i = 0; i < 90; i++) o.input({ ...still, panX: 1 }, 1 / 60);
    const width = 2 * Math.tan(0.5) * (16 / 9) * ORBIT.DIST_START; // the editor camera's fov 1.0 at 16:9
    const moved = o.s.tx - 10;
    expect(moved / width).toBeGreaterThan(0.85);
    expect(moved / width).toBeLessThan(1.1);
    // letting go: it stops, never drifting back
    let last = o.s.tx;
    for (let i = 0; i < 30; i++) {
      o.input(still, 1 / 60);
      expect(o.s.tx).toBeGreaterThanOrEqual(last);
      last = o.s.tx;
    }
    o.input(still, 1 / 60);
    expect(o.s.tx).toBe(last);
  });

  it('orbit and tilt have their own rates; the Settings speeds scale them', () => {
    const s = base();
    orbitInput(s, { ...still, orbitX: 1, tiltY: -1, panX: 1 }, 0.1, 1, 2);
    expect(s.yaw).toBeCloseTo(ORBIT.ORBIT_RATE * 0.2, 9);
    expect(s.pitch).toBeCloseTo(0.9 + ORBIT.TILT_RATE * 0.2, 9);
    expect(s.tx).toBeCloseTo(10 + ORBIT.PAN * 25 * 0.1, 9);
  });

  it('raising the camera keeps its x, z and its tilt (the target slides along the view)', () => {
    const s = base();
    const p0 = orbitPosition(s);
    raiseCamera(s, 3);
    const p1 = orbitPosition(s);
    expect(p1[0]).toBeCloseTo(p0[0], 9);
    expect(p1[2]).toBeCloseTo(p0[2], 9);
    expect(p1[1]).toBeCloseTo(p0[1] + 3, 9);
    expect(s.pitch).toBe(0.9);
    const lo = base();
    orbitInput(lo, { ...still, rise: -1 }, 100);
    expect(lo.dist).toBe(ORBIT.DIST_MIN);
  });

  it('the dead zone setting is used', () => {
    const o = new OrbitCam();
    o.enter(base());
    o.tune = { ...o.tune, dead: 0.35 };
    o.input({ ...still, panX: 0.3 }, 0.1);
    expect(o.s.tx).toBe(10);
  });
});

describe('ED3-1 pad map', () => {
  it('has the builder bindings and none of the removed ones', () => {
    for (const id of ['zoom', 'orbit', 'topDown', 'padLevel', 'toolVariant', 'cardEdit', 'menu', 'display', 'quickWalk', 'precision']) expect(action(id)?.pad?.length).toBeTruthy();
    for (const id of ['near', 'paneFocus', 'lookSel', 'fast', 'toolPrev', 'toolNext', 'radial', 'selWheel', 'repeatTool']) expect(action(id)).toBeUndefined();
    expect(action('fly')?.pad).toBeUndefined();
    expect(action('layout')?.pad).toEqual(['View hold']);
    expect(action('topDown')?.pad).toEqual(['View']);
    expect(conflicts()).toEqual([]);
    expect(ACTIONS.filter((a) => a.pad?.includes('L3')).map((a) => a.id)).toEqual(['quickWalk']);
    expect(action('walk')?.pad).toEqual(['L3 hold']);
    expect(action('camHeight')?.pad).toEqual(['LB + RS']);
  });

  it('RB tells a tap from a hold', () => {
    const snap = (down: number[]): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => (down.includes(i) ? 1 : 0)), axes: [0, 0, 0, 0] });
    const p = new PadState();
    p.update(snap([PAD.RB]), 0);
    p.update(snap([]), 0.1);
    expect(p.rbTap).toBe('tap');
    p.update(snap([PAD.RB]), 1);
    p.update(snap([PAD.RB]), 1 + HOLD.RB + 0.01);
    expect(p.rbTap).toBe('hold');
  });

  it('L3: a tap is the quick walk, held 0.6 s the walk test', () => {
    const snap = (down: number[]): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => (down.includes(i) ? 1 : 0)), axes: [0, 0, 0, 0] });
    const p = new PadState();
    p.update(snap([PAD.LS]), 0);
    expect(p.l3Tap).toBe(null);
    p.update(snap([]), 0.2);
    expect(p.l3Tap).toBe('tap');
    p.update(snap([PAD.LS]), 1);
    p.update(snap([PAD.LS]), 1.5);
    expect(p.l3Tap).toBe(null);
    p.update(snap([PAD.LS]), 1 + HOLD.L3 + 0.01);
    expect(p.l3Tap).toBe('hold');
    p.update(snap([]), 2);
    expect(p.l3Tap).toBe(null);
  });
});
