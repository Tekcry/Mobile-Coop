// (anim-skeleton S3b, docs/archive/anim-skeleton/PLAN.md S3) The baked test clip `skeleton_test` proves key_clip.py's frames:
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
import type { ChamberDrive } from '../src/anim/chamberDrive';

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
  type Built = { rig: CharacterRig; drive: ChamberDrive };

  async function setup(): Promise<{ make: (name: string, clip: KeyedClip, frame: number) => Built; run: (b: Built[], n: number) => void; dispose: () => void }> {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const { newChamberDrive } = await import('../src/anim/chamberDrive');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const made: { dispose(): void }[] = [];
    const POSE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
    return {
      make: (name, clip, frame) => {
        const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
        made.push(o.figure, o.rig);
        const drive = newChamberDrive();
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

  it("a keyed curl closes the hand toward the palm: the fist's right fingers move along the hero's own grip morph (in the wrist's frame)", async () => {
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
    /** Skeleton-space joint positions and rotations of the hero posed at the rig's rest with finger values `vals`. */
    const posed = (vals: ArrayLike<number>): { pos: Float64Array; rot: Float64Array } => {
      poser.extraOn.fill(0);
      fingerPose(fr, vals, poser.extraQ, poser.extraOn);
      const out = poser.solve(rig);
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
      return { pos, rot };
    };
    const inv = (q: ArrayLike<number>): number[] => [-q[0]!, -q[1]!, -q[2]!, q[3]!];
    /** A bind-pose vertex skinned rigidly to joint `s` of a posed skeleton, in that skeleton's wrist frame. */
    const inWrist = (k: { pos: Float64Array; rot: Float64Array }, s: number, wr: number, x: ArrayLike<number>): V => {
      const local = rotv(inv(P.bindRot.subarray(s * 4, s * 4 + 4)), [x[0]! - P.bindPos[s * 3]!, x[1]! - P.bindPos[s * 3 + 1]!, x[2]! - P.bindPos[s * 3 + 2]!]);
      const w = rotv(k.rot.subarray(s * 4, s * 4 + 4), local);
      return rotv(inv(k.rot.subarray(wr * 4, wr * 4 + 4)), [w[0] + k.pos[s * 3]! - k.pos[wr * 3]!, w[1] + k.pos[s * 3 + 1]! - k.pos[wr * 3 + 1]!, w[2] + k.pos[s * 3 + 2]! - k.pos[wr * 3 + 2]!]);
    };
    // the morph's base is the open hand (every curl 0): the clip's fist (the rig's finger values at f24) against it
    const vClosed = Float64Array.from(fist.rig.fingers);
    expect(vClosed.length).toBe(FING_LEN);
    const closed = posed(vClosed);
    const open = posed(new Float64Array(FING_LEN));
    const wr = P.names.indexOf('wrR');
    const jn = m.joints.map((j) => m.nodes[j]!.name);
    for (let k = 1; k <= 5; k++) {
      for (let seg = 1; seg <= 3; seg++) {
        const name = `fingerR_${k}_${seg}`;
        const s = P.names.indexOf(name);
        let n = 0;
        let dot = 0;
        for (const g of m.meshes) {
          const t = g.targets?.find((x) => x.name === 'wrapR');
          if (!t) continue;
          for (let i = 0; i < g.positions.length / 3; i++) {
            if (g.weights[i * 4]! < 0.97 || jn[g.joints[i * 4]!] !== name) continue;
            const x = g.positions.subarray(i * 3, i * 3 + 3);
            const a = inWrist(closed, s, wr, x);
            const o = inWrist(open, s, wr, x);
            const d = [a[0] - o[0], a[1] - o[1], a[2] - o[2]];
            const dm = rotv(inv(P.bindRot.subarray(wr * 4, wr * 4 + 4)), t.positions.subarray(i * 3, i * 3 + 3));
            dot += (d[0]! * dm[0] + d[1]! * dm[1] + d[2]! * dm[2]) / (Math.hypot(...d) * Math.hypot(...dm) || 1);
            n++;
          }
        }
        if (seg < 3 && n < 20) continue; // a short segment with few rigid vertices
        expect(n, `${name} vertices`).toBeGreaterThan(20);
        expect(dot / n, `${name}: the curl closes along the grip morph`).toBeGreaterThan(0.5);
      }
    }
    expect(KEYED_FING).toBe(FING_LEN);
    // the keyed spread (f33, held open), one finger at a time (its neighbours' spreads 0, so they hold still): + takes
    // the index and the ring away from the middle, the little away from the ring
    const fan = S.make('fan', KEYED_SKELETON_TEST, 33);
    S.run([fan], 30);
    const vFan = Float64Array.from(fan.rig.fingers);
    const vFlat = Float64Array.from(vFan);
    for (let k = 0; k < 5; k++) vFlat[FING_R + k * 2 + 1] = 0;
    const flat = posed(vFlat).pos;
    const gap = (p: Float64Array, x: string, y: string): number => {
      const i = P.names.indexOf(x);
      const j = P.names.indexOf(y);
      return dist(p.subarray(i * 3, i * 3 + 3), p.subarray(j * 3, j * 3 + 3));
    };
    for (const [k, from] of [[1, 3], [3, 3], [4, 4]] as const) {
      expect(vFan[FING_R + k * 2 + 1], `spread ${k}`).toBeGreaterThan(0.3);
      const one = Float64Array.from(vFlat);
      one[FING_R + k * 2 + 1] = vFan[FING_R + k * 2 + 1]!;
      const a = `fingerR_${k + 1}_3`;
      const b = `fingerR_${from}_3`;
      expect(gap(posed(one).pos, a, b), `${a} spreads away from ${b}`).toBeGreaterThan(gap(flat, a, b) + 0.004);
    }
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
