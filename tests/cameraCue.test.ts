import { describe, expect, it } from 'vitest';
import { CAMERA } from '../src/config/security';
import { CameraUnit, inFrame, newMeter, sweepYaw } from '../src/security/camera';
import { CUE, camSeesAny, cueDir, cueEdge, cueInk, cueMesh, cueReach, cueSpan, cueStrength, luma709, newCue, stepCue } from '../src/security/cameraCue';
import { cameraSight } from '../src/security/securitySystem';
import { seenAt } from '../src/ai/perception';
import { ELECTRO } from '../src/vfx/visionLook';
import { Vector3 } from '../src/core/babylon';
import type { CameraDevice } from '../src/security/data';

const DEG = Math.PI / 180;
const fixed: CameraDevice = { id: 'f', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 30, reason: 't' };
const pan: CameraDevice = { id: 'p', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, sweep: [90, -30], reason: 't' };

/** Ray onto a flat floor `h` m below the lens (the reach when the ray points up or level). */
function floorDist(d: [number, number, number], h: number): number {
  return d[1] < -1e-6 ? Math.min(cueReach(), h / -d[1]) : cueReach();
}

describe('camera cue: the sample grid', () => {
  it('a fixed camera spans its field exactly, from the same CAMERA numbers as detection', () => {
    const s = cueSpan(fixed);
    expect(s.az0).toBeCloseTo(30 * DEG - CAMERA.hFov / 2, 9);
    expect(s.el0).toBeCloseTo(-CAMERA.vFov / 2, 9);
    expect(s.az0 + (s.cols - 1) * s.step).toBeGreaterThanOrEqual(30 * DEG + CAMERA.hFov / 2 - 1e-9);
    expect(s.el0 + (s.rows - 1) * s.step).toBeGreaterThanOrEqual(CAMERA.vFov / 2 - 1e-9);
  });

  it('a panning camera spans the whole sweep plus half a field each side (either order)', () => {
    const s = cueSpan(pan);
    expect(s.az0).toBeCloseTo(-30 * DEG - CAMERA.hFov / 2, 9);
    expect(s.az0 + (s.cols - 1) * s.step).toBeGreaterThanOrEqual(90 * DEG + CAMERA.hFov / 2 - 1e-9);
  });

  it('every sample inside the frame at a sweep yaw is a point the camera itself counts in frame (inFrame)', () => {
    const s = cueSpan(pan);
    const d: [number, number, number] = [0, 0, 0];
    for (const t of [0, 3, 7.5, 11]) {
      const yaw = sweepYaw(pan, t);
      let inside = 0;
      for (let r = 0; r < s.rows; r++) {
        for (let c = 0; c < s.cols; c++) {
          cueDir(s, c, r, d);
          const p = [d[0] * 10, 3 + d[1] * 10, d[2] * 10] as const;
          const e = cueEdge(yaw, 0, 3, 0, p[0], p[1], p[2]);
          expect(e >= 0).toBe(inFrame(yaw, 0, 3, 0, p[0], p[1], p[2]));
          if (e >= 0) inside++;
        }
      }
      expect(inside).toBeGreaterThan(100);
    }
  });

  it('cueEdge is -1 outside the range and rises to 1 at the frame edge', () => {
    expect(cueEdge(0, 0, 3, 0, 0, 3, CAMERA.range + 0.1)).toBe(-1);
    expect(cueEdge(0, 0, 3, 0, 0, 3, 5)).toBe(0);
    expect(cueEdge(0, 0, 3, 0, 0, 3, CAMERA.range - 0.01)).toBeGreaterThan(0.99);
    const a = CAMERA.hFov / 2 - 0.001;
    expect(cueEdge(0, 0, 3, 0, Math.sin(a) * 5, 3, Math.cos(a) * 5)).toBeGreaterThan(0.99);
  });
});

describe('camera cue: the footprint mesh', () => {
  const s = cueSpan(fixed);
  const n = s.cols * s.rows;
  const pos = new Float32Array(n * 3);
  const idx = new Uint32Array((s.cols - 1) * (s.rows - 1) * 6);
  const d: [number, number, number] = [0, 0, 0];

  it('a flat floor gives a joined surface lying on the floor, below the field only', () => {
    const dist = new Float32Array(n);
    for (let i = 0; i < n; i++) dist[i] = floorDist(cueDir(s, i % s.cols, (i / s.cols) | 0, d), 3);
    const tris = cueMesh(s, dist, 0, 3, 0, pos, idx);
    // every cell whose four corners hit the floor is joined, however grazing
    let cells = 0;
    for (let r = 0; r < s.rows - 1; r++) {
      for (let c = 0; c < s.cols - 1; c++) {
        const i = r * s.cols + c;
        if (dist[i]! < cueReach() && dist[i + 1]! < cueReach() && dist[i + s.cols]! < cueReach() && dist[i + s.cols + 1]! < cueReach()) cells++;
      }
    }
    expect(cells).toBeGreaterThan(50);
    expect(tris).toBe(cells * 2);
    for (let k = 0; k < idx.length; k += 3) {
      if (idx[k] === 0 && idx[k + 1] === 0) continue;
      for (let j = 0; j < 3; j++) expect(Math.abs(pos[idx[k + j]! * 3 + 1]!)).toBeLessThan(0.05);
    }
  });

  it('an occluder silhouette and empty space are not bridged', () => {
    const dist = new Float32Array(n).fill(10);
    // a box in front of the left half: near hits there, a 10 m wall behind
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols / 2; c++) dist[r * s.cols + c] = 4;
    const all = (s.cols - 1) * (s.rows - 1) * 2;
    const tris = cueMesh(s, dist, 0, 3, 0, pos, idx);
    expect(tris).toBe(all - (s.rows - 1) * 2);
    dist.fill(cueReach());
    expect(cueMesh(s, dist, 0, 3, 0, pos, idx)).toBe(0);
  });

  it('vertices sit just in front of the hit, toward the lens', () => {
    const dist = new Float32Array(n).fill(8);
    cueMesh(s, dist, 1, 3, 2, pos, idx);
    const i = 5 * s.cols + 7;
    const dx = pos[i * 3]! - 1;
    const dy = pos[i * 3 + 1]! - 3;
    const dz = pos[i * 3 + 2]! - 2;
    expect(Math.sqrt(dx * dx + dy * dy + dz * dz)).toBeCloseTo(8 - CUE.lift, 4);
  });
});

describe('camera cue: state follows the camera', () => {
  it('fades in online, out when jammed / off / looped / shot', () => {
    const c = newCue();
    for (let i = 0; i < 30; i++) stepCue(c, 1 / 60, 'online', false);
    expect(c.a).toBeCloseTo(0.5 / CUE.fadeIn, 2);
    for (let i = 0; i < 60; i++) stepCue(c, 1 / 60, 'online', false);
    expect(c.a).toBe(1);
    for (const mode of ['off', 'looped', 'destroyed'] as const) {
      c.a = 1;
      let t = 0;
      while (c.a > 0) {
        stepCue(c, 1 / 60, mode, true);
        t += 1 / 60;
      }
      expect(t).toBeCloseTo(CUE.fadeOut, 1);
      expect(c.seen).toBe(false);
      expect(cueStrength(c)).toBe(0);
    }
  });

  it("lands the lines in electro's glow band, keeps the fill under it, and stays faint with vision off", () => {
    const e = cueInk(true);
    const n = cueInk(false);
    expect(luma709(e.rgb) * e.line).toBeGreaterThanOrEqual(ELECTRO.glowFrom);
    expect(luma709(e.rgb) * e.fill).toBeLessThan(ELECTRO.glowFrom * 0.2);
    expect(luma709(e.rgb) * e.line).toBeGreaterThan(3 * luma709(n.rgb) * n.line);
    expect(luma709(n.rgb) * n.line).toBeLessThan(0.1);
    expect(luma709(n.rgb) * (n.line + n.fill)).toBeLessThan(ELECTRO.glowFrom);
  });

  it('is the grid only: no edge pulse while the camera sees a player (marlow-bays item 6), the seen state still kept', () => {
    const c = newCue();
    for (let i = 0; i < 120; i++) stepCue(c, 1 / 60, 'online', false);
    expect(cueStrength(c)).toBe(1);
    expect(c.seen).toBe(false);
    for (let i = 0; i < 60; i++) stepCue(c, 1 / 60, 'online', true);
    expect(c.seen).toBe(true);
    expect(cueStrength(c)).toBe(1);
    expect(Object.keys(cueInk(false)).sort()).toEqual(['fill', 'line', 'rgb']);
    stepCue(c, 1 / 60, 'off', true);
    expect(c.seen).toBe(false);
  });

  it('shares one sight test (frame, clear static ray, light over the leak) between the host think and the client', () => {
    const cam = new CameraUnit(fixed, 0);
    const lit = { lightAt: () => 1 };
    let wall = Infinity;
    const ray = { hitDistance: (a: Vector3, b: Vector3) => Math.min(wall, Vector3.Distance(a, b)) };
    const head = new Vector3(Math.sin(cam.yaw) * 6, 1.6, Math.cos(cam.yaw) * 6);
    expect(seenAt(cameraSight(cam, head, false, 0, 1, ray, lit))).toBe(true);
    wall = 3;
    expect(cameraSight(cam, head, false, 0, 1, ray, lit)).toBe(0);
    wall = Infinity;
    expect(seenAt(cameraSight(cam, head, false, 0, 0, ray, lit))).toBe(false);
    head.set(-head.x, 1.6, -head.z);
    expect(cameraSight(cam, head, false, 0, 1, ray, lit)).toBe(0);
    cam.setMode('off');
    head.set(-head.x, 1.6, -head.z);
    expect(cameraSight(cam, head, false, 0, 1, ray, lit)).toBe(0);
  });

  it("reads the camera's own seen state from its meters", () => {
    const cam = new CameraUnit(fixed, 0);
    expect(camSeesAny(cam.meters)).toBe(false);
    cam.meter('a');
    cam.meter('b').sinceSeen = 0;
    expect(camSeesAny(cam.meters)).toBe(true);
    cam.meter('b').sinceSeen = 0.25;
    expect(camSeesAny(cam.meters)).toBe(false);
    expect(newMeter().sinceSeen).toBeGreaterThan(0);
  });
});
