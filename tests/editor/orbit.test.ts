import { describe, expect, it } from 'vitest';
import { action, ACTIONS, conflicts } from '../../src/editor/actions';
import { HOLD, PAD, PadState } from '../../src/editor/pad';
import { ORBIT, OrbitCam, orbitFromPose, orbitInput, orbitPosition } from '../../src/editor/orbit';
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

describe('ED3-1 pad map', () => {
  it('has the builder bindings and none of the removed ones', () => {
    for (const id of ['zoom', 'orbit', 'topDown', 'toolPrev', 'toolNext', 'display', 'quickWalk', 'precision']) expect(action(id)?.pad?.length).toBeTruthy();
    for (const id of ['near', 'paneFocus', 'lookSel', 'fast']) expect(action(id)).toBeUndefined();
    expect(action('fly')?.pad).toBeUndefined();
    expect(action('layout')?.pad).toEqual(['View hold']);
    expect(action('topDown')?.pad).toEqual(['View']);
    expect(conflicts()).toEqual([]);
    expect(ACTIONS.filter((a) => a.pad?.includes('L3')).map((a) => a.id)).toEqual(['quickWalk']);
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
});
