// (anim-skeleton S3b, docs/anim-skeleton/PLAN.md S3) The baked test clip `skeleton_test` proves key_clip.py's frames:
// sampled through keyed.ts onto the real Wren rig (node, no GPU), its FK leg (knee, ankle, ball of the foot and a toe
// tip) and its clavicle-carried shoulders land where the Blender bake put them (key_clip.py's `check` block, written by
// build.mjs to tests/fixtures/keyed-check-skeleton_test.json) within 1.5 cm, and a keyed finger curl closes the hand
// toward the palm (the hero's own grip morph direction) on the skinned figure's finger joints.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KEYED_SKELETON_TEST } from '../src/anim/clips/keyed/skeleton_test';
import { KEYED_FING, KEYED_LEG_SIDE, KL, keyedClip, newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { FING_LEN, FING_R, fingerPose, fingerRig, SPREAD_MAX_DEG } from '../src/anim/fingers';
import { parseGlb } from '../src/operators/lab/glb';
import { OperatorPoser, poserSetup, RIG_JOINTS, TRS } from '../src/operators/runtime/pose';
import type { CharacterRig } from '../src/player/characterRig';
import type { TransformNode } from '../src/core/babylon';
import type { StudioDrive } from '../src/anim/studioDrive';

type V = [number, number, number];
interface LegCheck { kn: V; an: V; toe: V; toeTip: V }
interface Check { frame: number; legL: LegCheck; legR: LegCheck; shL: V; shR: V; leverL: V; leverR: V }
const FIX = JSON.parse(readFileSync('tests/fixtures/keyed-check-skeleton_test.json', 'utf8')) as { name: string; check: Check[] };
const KEYS = JSON.parse(readFileSync('scripts/anim-keys/keys/skeleton_test.json', 'utf8')) as {
  frames: number; mirror: boolean; clav: boolean; fingers: boolean; legs: boolean; checkFrames: number[];
  keys: { phase: number; handR: Record<string, { curl: number; spread: number }>; legL: { w: number } }[];
};
const TOL = 0.015;
const dist = (a: ArrayLike<number>, b: ArrayLike<number>): number => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const keyAt = (f: number) => KEYS.keys.find((k) => Math.round(k.phase * KEYS.frames) === f)!;

describe('anim-skeleton S3b: the skeleton_test clip (pure)', () => {
  it('carries the three opt-in channels, 48 frames, not mirrored; the samples are the keys', () => {
    const c = KEYED_SKELETON_TEST;
    expect([KEYS.clav, KEYS.fingers, KEYS.legs, KEYS.mirror]).toEqual([true, true, true, false]);
    expect(c.frames).toBe(48);
    expect(c.clav).not.toBeNull();
    expect(c.fing).not.toBeNull();
    expect(c.leg).not.toBeNull();
    expect(FIX.check.map((x) => x.frame)).toEqual(KEYS.checkFrames);
    // key_clip.py's spread unit is fingers.ts's
    expect(readFileSync('scripts/anim-keys/py/key_clip.py', 'utf8')).toMatch(new RegExp(`^SPREAD_MAX_DEG = ${SPREAD_MAX_DEG}\\.0 `, 'm'));
    // a key frame samples its key: the right index curl at the fist (f24), its spread when open (f31), the left leg's FK weight
    const p = newKeyedPose();
    for (const f of [24, 31]) {
      sampleKeyed(c, f / 48, 1, p);
      const k = keyAt(f);
      expect(p.fing[FING_R + 1 * 2]).toBeCloseTo(k.handR.index!.curl, 4);
      expect(p.fing[FING_R + 1 * 2 + 1]).toBeCloseTo(k.handR.index!.spread / SPREAD_MAX_DEG, 4);
      expect(p.leg[KL.w]).toBeCloseTo(k.legL.w, 4);
      expect(p.leg[KEYED_LEG_SIDE + KL.w]).toBe(0);
    }
    // the knee bends the shin back (+) at the chamber; the toe bends up (the toe roll's sense: -)
    sampleKeyed(c, 31 / 48, 1, p);
    expect(p.leg[KL.knee]).toBeGreaterThan(1.1);
    expect(p.leg[KL.toe]).toBeLessThan(-0.3);
  });
});

describe('anim-skeleton S3b: the bake frames on the rig', () => {
  type Built = { rig: CharacterRig; drive: StudioDrive };

  async function setup(): Promise<{ make: (name: string, clip: KeyedClip, frame: number) => Built; run: (b: Built[], n: number) => void; dispose: () => void }> {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { newStudioDrive } = await import('../src/anim/studioDrive');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const made: { dispose(): void }[] = [];
    const POSE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
    return {
      make: (name, clip, frame) => {
        const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
        made.push(o.figure, o.rig);
        const drive = newStudioDrive();
        drive.clip = clip;
        drive.held = true;
        drive.phase = frame / 48;
        o.rig.graph.drive = drive;
        return { rig: o.rig, drive };
      },
      run: (b, n) => {
        for (let k = 0; k < n; k++) for (const x of b) x.rig.animate(1 / 60, POSE);
      },
      dispose: () => {
        for (const m of made) m.dispose();
        scene.dispose();
      },
    };
  }

  /** The clip without its clavicle channel (the shoulders' rest for the carry). */
  const noClav = (c: KeyedClip): KeyedClip => keyedClip({
    name: `${c.name}_noclav`, frames: c.frames, duty: c.duty, liftH: c.liftH, kneeOut: c.kneeOut, half: c.half,
    pel: [...c.pel], q: [...c.q], arm: [...c.arm], fing: [...c.fing!], leg: [...c.leg!],
  });

  it('the animation base table has no rows on the joints this proof reads (a baked Joints row would shift the FK leg after the clip)', async () => {
    const { ANIM_BASE } = await import('../src/anim/animBase');
    const READ = ['hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR', 'shoulderL', 'shoulderR', 'clavicleL', 'clavicleR'];
    for (const [row, joints] of Object.entries(ANIM_BASE.joints)) {
      const hit = Object.keys(joints).filter((j) => READ.includes(j));
      expect(hit, `ANIM_BASE.joints['${row}'] sets ${hit.join(', ')}: the rig adds Joints rows after the FK leg; re-check this proof`).toEqual([]);
    }
    // the IK strength acts before the FK blend: a feet row changes only the w 0 legs, but flag it here too
    for (const [row, v] of Object.entries(ANIM_BASE.ik)) expect([v[2], v[3]], `ANIM_BASE.ik['${row}'] scales the feet`).toEqual([1, 1]);
  });

  it('the FK leg (w 1): knee, ankle, ball and toe tip from the hip in the pelvis frame match the Blender bake within 1.5 cm; the clavicle-carried shoulders too', async () => {
    const { Vector3, Quaternion } = await import('../src/core/babylon');
    const S = await setup();
    const plainClip = noClav(KEYED_SKELETON_TEST);
    const rows: string[] = [];
    let worstLeg = 0;
    let worstSh = 0;
    for (const chk of FIX.check) {
      const f = chk.frame;
      const k = S.make(`k${f}`, KEYED_SKELETON_TEST, f);
      const pl = S.make(`p${f}`, plainClip, f);
      S.run([k, pl], 120);
      const r = k.rig;
      expect(r.keyedWalk).toBe(1);
      // the pelvis frame: the hips node's world rotation
      const pq = Quaternion.Identity();
      r.hips.getWorldMatrix().decompose(undefined, pq);
      const pinv = Quaternion.Inverse(pq);
      const rel = (n: TransformNode, local?: V): V => {
        const w = local ? Vector3.TransformCoordinates(new Vector3(...local), n.getWorldMatrix()) : n.getAbsolutePosition().clone();
        const v = w.subtract(r.hipL.getAbsolutePosition());
        const o = Vector3.Zero();
        v.rotateByQuaternionToRef(pinv, o);
        return [o.x, o.y, o.z];
      };
      const wL = keyAt(f).legL.w;
      if (wL === 1) {
        const got = { kn: rel(r.kneeL), an: rel(r.ankleL), toe: rel(r.toeL), toeTip: rel(r.toeL, [0, 0, 0.06]) };
        for (const j of ['kn', 'an', 'toe', 'toeTip'] as const) {
          const d = dist(got[j], chk.legL[j]);
          worstLeg = Math.max(worstLeg, d);
          rows.push(`f${f} L ${j}: rig ${got[j].map((x) => x.toFixed(4)).join(' ')} bake ${chk.legL[j].map((x) => x.toFixed(4)).join(' ')} err ${(d * 100).toFixed(2)} cm`);
          expect(d, `f${f} ${j}`).toBeLessThan(TOL);
        }
      }
      // the shoulder carried by the clavicle (chest frame: the shoulder nodes' local positions), vs the rig without it
      for (const side of ['L', 'R'] as const) {
        const a = (side === 'L' ? r.shoulderL : r.shoulderR).position;
        const b = (side === 'L' ? pl.rig.shoulderL : pl.rig.shoulderR).position;
        const got: V = [a.x - b.x, a.y - b.y, a.z - b.z];
        const want = chk[`sh${side}`];
        const d = dist(got, want);
        worstSh = Math.max(worstSh, d);
        rows.push(`f${f} sh${side}: rig ${got.map((x) => x.toFixed(4)).join(' ')} bake ${want.map((x) => x.toFixed(4)).join(' ')} err ${(d * 100).toFixed(2)} cm`);
        if (!(d < TOL)) {
          // the levers (SC point -> shoulder at rest, chest frame): the rig's own vs the bake's (joints.json, `sc_point`)
          const cl = (side === 'L' ? r.clavL : r.clavR).position;
          console.info(`f${f} sh${side} lever: rig ${[b.x - cl.x, b.y - cl.y, b.z - cl.z].map((x) => x.toFixed(4)).join(' ')} bake ${chk[`lever${side}`].map((x) => x.toFixed(4)).join(' ')}`);
        }
        expect(d, `f${f} sh${side}`).toBeLessThan(TOL);
      }
    }
    // the shrug lifts both shoulders (f5), the push takes the right one forward (f14)
    const c5 = FIX.check.find((c) => c.frame === 5)!;
    const c14 = FIX.check.find((c) => c.frame === 14)!;
    expect(c5.shL[1]).toBeGreaterThan(0.03);
    expect(c5.shR[1]).toBeGreaterThan(0.03);
    expect(c14.shR[2]).toBeGreaterThan(0.03);
    console.info(`skeleton_test frame proof: worst leg ${(worstLeg * 100).toFixed(2)} cm, worst shoulder ${(worstSh * 100).toFixed(2)} cm\n${rows.join('\n')}`);
    S.dispose();
  }, 60_000);

  it("a keyed curl closes the hand toward the palm: the fist's right fingertips move along the hero's own grip morph", async () => {
    const S = await setup();
    const fist = S.make('fist', KEYED_SKELETON_TEST, 24);
    const rest = S.make('rest', KEYED_SKELETON_TEST, 0);
    S.run([fist, rest], 30);
    for (let k = 0; k < 5; k++) expect(fist.rig.fingers[FING_R + k * 2]! - rest.rig.fingers[FING_R + k * 2]!).toBeGreaterThan(0.7);
    const b = readFileSync('src/operators/assets/wren/wren-hero.glb');
    const m = parseGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    const P = poserSetup(m.nodes, m.joints);
    const fr = fingerRig(P.names, P.bindPos, P.bindRot)!;
    const poser = new OperatorPoser(P);
    const rig = new Float64Array(RIG_JOINTS.length * TRS);
    for (let j = 0; j < RIG_JOINTS.length; j++) rig[j * TRS + 6] = 1;
    const tipPos = (vals: ArrayLike<number>): Float64Array => {
      poser.extraOn.fill(0);
      fingerPose(fr, vals, poser.extraQ, poser.extraOn);
      const out = poser.solve(rig);
      // chain the local TRS to skeleton-space positions
      const n = P.node.length;
      const pos = new Float64Array(n * 3);
      const rot = new Float64Array(n * 4);
      for (let s = 0; s < n; s++) {
        const p = P.parent[s]!;
        const t = out.subarray(s * TRS, s * TRS + 3);
        const q = out.subarray(s * TRS + 3, s * TRS + 7);
        if (p < 0) {
          pos.set(t, s * 3);
          rot.set(q, s * 4);
          continue;
        }
        const pq = rot.subarray(p * 4, p * 4 + 4);
        const v = rotv(pq, t);
        pos.set([pos[p * 3]! + v[0], pos[p * 3 + 1]! + v[1], pos[p * 3 + 2]! + v[2]], s * 3);
        rot.set(qm(pq, q), s * 4);
      }
      return pos;
    };
    const vClosed = Float64Array.from(fist.rig.fingers);
    const vOpen = Float64Array.from(rest.rig.fingers);
    expect(vClosed.length).toBe(FING_LEN);
    const a = tipPos(vClosed);
    const o = tipPos(vOpen);
    const jn = m.joints.map((j) => m.nodes[j]!.name);
    for (let k = 1; k <= 5; k++) {
      const name = `fingerR_${k}_3`;
      const s = P.names.indexOf(name);
      const d: V = [a[s * 3]! - o[s * 3]!, a[s * 3 + 1]! - o[s * 3 + 1]!, a[s * 3 + 2]! - o[s * 3 + 2]!];
      // the morph's closing direction of the vertices on this tip bone (same skeleton frame: the wrist is not moved)
      const mv: V = [0, 0, 0];
      for (const g of m.meshes) {
        const t = g.targets?.find((x) => x.name === 'wrapR');
        if (!t) continue;
        for (let i = 0; i < g.positions.length / 3; i++) {
          if (g.weights[i * 4]! < 0.97 || jn[g.joints[i * 4]!] !== name) continue;
          for (let c = 0; c < 3; c++) mv[c] = mv[c]! + t.positions[i * 3 + c]!;
        }
      }
      const cos = (d[0] * mv[0] + d[1] * mv[1] + d[2] * mv[2]) / (Math.hypot(...d) * Math.hypot(...mv) || 1);
      expect(Math.hypot(...d), `${name} moves`).toBeGreaterThan(0.01);
      expect(cos, `${name}: the curl closes along the grip morph`).toBeGreaterThan(0.5);
    }
    expect(KEYED_FING).toBe(FING_LEN);
    // the keyed spread (f33, held open): + takes the index and the little away from their neighbours (only the spreads
    // differ from the compared pose)
    const fan = S.make('fan', KEYED_SKELETON_TEST, 33);
    S.run([fan], 30);
    const vFan = Float64Array.from(fan.rig.fingers);
    for (const k of [1, 4]) expect(vFan[FING_R + k * 2 + 1], `spread ${k}`).toBeGreaterThan(0.3);
    const vFlat = Float64Array.from(vFan);
    for (let k = 0; k < 5; k++) vFlat[FING_R + k * 2 + 1] = 0;
    const sp = tipPos(vFan);
    const fl = tipPos(vFlat);
    const gap = (p: Float64Array, x: string, y: string): number => {
      const i = P.names.indexOf(x);
      const j = P.names.indexOf(y);
      return dist(p.subarray(i * 3, i * 3 + 3), p.subarray(j * 3, j * 3 + 3));
    };
    expect(gap(sp, 'fingerR_2_3', 'fingerR_3_3')).toBeGreaterThan(gap(fl, 'fingerR_2_3', 'fingerR_3_3') + 0.005);
    expect(gap(sp, 'fingerR_5_3', 'fingerR_4_3')).toBeGreaterThan(gap(fl, 'fingerR_5_3', 'fingerR_4_3') + 0.005);
    S.dispose();
  }, 60_000);
});

const qm = (a: ArrayLike<number>, b: ArrayLike<number>): number[] => [
  a[3]! * b[0]! + a[0]! * b[3]! + a[1]! * b[2]! - a[2]! * b[1]!, a[3]! * b[1]! - a[0]! * b[2]! + a[1]! * b[3]! + a[2]! * b[0]!,
  a[3]! * b[2]! + a[0]! * b[1]! - a[1]! * b[0]! + a[2]! * b[3]!, a[3]! * b[3]! - a[0]! * b[0]! - a[1]! * b[1]! - a[2]! * b[2]!];
const rotv = (q: ArrayLike<number>, v: ArrayLike<number>): V => {
  const r = qm(qm(q, [v[0]!, v[1]!, v[2]!, 0]), [-q[0]!, -q[1]!, -q[2]!, q[3]!]);
  return [r[0]!, r[1]!, r[2]!];
};
