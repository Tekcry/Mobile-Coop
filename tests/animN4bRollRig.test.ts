/**
 * (anim-n4b fix round) The grounded roll on the real rig (NullEngine CharacterRig): after a 2.5 m fall, the roll at
 * `CT.rollTime` and at 0.62 s (60 Hz, the root on the roll path's ride `rollRide` over a flat floor at y 0). No knee or
 * ankle goes under the floor (3 cm grace), and the body segments pass the floor-plane form of e2e-clip's 'landing roll'
 * ray check (each sample point raycast from the hips; a hit before the point, less half the segment's radius, over 3 cm
 * counts).
 */
import { describe, expect, it, vi } from 'vitest';
import type { TransformNode, Vector3 } from '../src/core/babylon';
import type { RigPose } from '../src/player/characterRig';
import { rollRide } from '../src/player/traversePath';
import { CT } from '../src/config/movement';
import { LAND_GRAVITY as GRAVITY_ABS } from '../src/anim/clips/traverse';

const FALL = 2.5;

interface RollRun {
  /** Lowest knee / ankle joint over the roll (m, the floor at 0). */
  knee: number;
  ankle: number;
  /** e2e-clip's ray check against the floor plane: the deepest penetration and the frames over 3 cm. */
  pen: number;
  frames: number;
  where: string;
}

async function rollRun(dur: number): Promise<RollRun> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3: V } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook(), 1.75, 'm0');
  const base: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', traverse: 'none', traverseT: 0 };
  const dt = 1 / 60;
  // standing, then the fall (from rest, the game's gravity), then the roll
  rg.root.position.set(0, FALL, 0);
  for (let f = 0; f < 30; f++) rg.animate(dt, base);
  const tFall = Math.sqrt((2 * FALL) / GRAVITY_ABS);
  for (let t = 0; t < tFall; t += dt) {
    rg.root.position.y = Math.max(0, FALL - 0.5 * GRAVITY_ABS * t * t);
    rg.animate(dt, { ...base, grounded: false, speed: 3, localZ: 1 });
  }
  const v = Math.sqrt(2 * GRAVITY_ABS * FALL);
  let landT = Math.min(0.7, 0.15 + (v - 3) * 0.08);
  // the body segments of e2e-clip's bodyCheck (A, B, radius)
  const segs: [TransformNode, TransformNode, number][] = [
    [rg.hips, rg.neck, 0.12],
    [rg.hipL, rg.kneeL, 0.07],
    [rg.kneeL, rg.ankleL, 0.05],
    [rg.hipR, rg.kneeR, 0.07],
    [rg.kneeR, rg.ankleR, 0.05],
    [rg.shoulderL, rg.elbowL, 0.045],
    [rg.shoulderR, rg.elbowR, 0.045],
  ];
  const pt = new V();
  const out: RollRun = { knee: 9, ankle: 9, pen: 0, frames: 0, where: '' };
  const N = Math.round(dur / dt);
  for (let n = 0; n <= N; n++) {
    const k = n / N;
    rg.root.position.set(0, rollRide(k), 1.2 * k * (2 - k));
    landT = Math.max(0, landT - dt);
    rg.animate(dt, { ...base, speed: 2, localZ: 1, traverse: 'roll', traverseT: k, landing: Math.min(1, landT * 2) });
    for (const nd of [rg.hips, rg.neck, rg.headNode, rg.hipL, rg.kneeL, rg.ankleL, rg.hipR, rg.kneeR, rg.ankleR, rg.shoulderL, rg.elbowL, rg.shoulderR, rg.elbowR]) nd.computeWorldMatrix(true);
    out.knee = Math.min(out.knee, rg.kneeL.getAbsolutePosition().y, rg.kneeR.getAbsolutePosition().y);
    out.ankle = Math.min(out.ankle, rg.ankleL.getAbsolutePosition().y, rg.ankleR.getAbsolutePosition().y);
    const from = rg.hips.getAbsolutePosition().clone();
    let pen = 0;
    let where = '';
    const probe = (p: Vector3, r: number, name: string): void => {
      // the floor plane y 0: the ray from the hips hits it before the point
      if (p.y >= 0 || from.y <= 0) return;
      const s = from.y / (from.y - p.y);
      const hx = from.x + (p.x - from.x) * s;
      const hz = from.z + (p.z - from.z) * s;
      const d = Math.sqrt((p.x - hx) ** 2 + p.y * p.y + (p.z - hz) ** 2) - r * 0.5;
      if (d > pen) {
        pen = d;
        where = name;
      }
    };
    for (const [A, B, r] of segs) {
      const a0 = A.getAbsolutePosition();
      const b0 = B.getAbsolutePosition();
      const last = B === rg.ankleL || B === rg.ankleR ? 3 : 4;
      for (let s = 0; s <= last; s++) {
        V.LerpToRef(a0, b0, s / 4, pt);
        probe(pt, r, B.name);
      }
    }
    probe(rg.headNode.getAbsolutePosition(), 0, 'head');
    if (pen > out.pen) {
      out.pen = pen;
      out.where = `${where} t ${k.toFixed(2)}`;
    }
    if (pen > 0.03) out.frames++;
  }
  rg.dispose();
  scene.dispose();
  vi.restoreAllMocks();
  return out;
}

describe('anim-n4b: the grounded roll on the real rig keeps every joint above the floor', () => {
  for (const dur of [CT.rollTime, 0.62]) {
    it(`over ${dur} s after a ${FALL} m fall: knees and ankles >= -3 cm, no body segment through the floor`, async () => {
      const r = await rollRun(dur);
      console.info(`roll ${dur} s: knee min ${(r.knee * 100).toFixed(1)} cm, ankle min ${(r.ankle * 100).toFixed(1)} cm, body pen ${(r.pen * 100).toFixed(1)} cm (${r.where}), frames over 3 cm ${r.frames}`);
      expect(r.knee).toBeGreaterThan(-0.03);
      expect(r.ankle).toBeGreaterThan(-0.03);
      expect(r.frames).toBe(0);
    }, 120_000);
  }
});
