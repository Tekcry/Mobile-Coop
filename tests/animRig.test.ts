// (anim-rig, docs/archive/anim-rework/RIG.md) The rig extension: toe joints, the keyed wrist frame, the sling sockets.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { keyedClip, KW, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_WALK_G8 } from './fixtures/keyedWalkG8';
import { TOE_MAX, toePitch } from '../src/anim/toeRoll';
import { JOINT_NAMES, OPERATORS, operatorJoints, operatorProportions } from '../src/operators/operatorBody';
import { RIG_JOINTS, RIG_PARENT } from '../src/operators/runtime/pose';
import { REQUIRED_JOINTS } from '../src/operators/runtime/manifest';
import { WREN_SLING } from '../src/operators/handFrame';

const ASSETS = 'src/operators/assets/wren';

/** A GLB's JSON chunk and binary chunk. */
function glb(file: string): { json: GltfJson; bin: Buffer } {
  const buf = readFileSync(file);
  const n = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + n).toString('utf8')) as GltfJson;
  const b = 20 + n;
  return { json, bin: buf.subarray(b + 8, b + 8 + buf.readUInt32LE(b)) };
}
interface GltfJson {
  nodes: { name?: string; children?: number[]; mesh?: number }[];
  skins: { joints: number[]; inverseBindMatrices: number }[];
  meshes: { primitives: { attributes: Record<string, number> }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number; type: string }[];
  bufferViews: { byteOffset?: number }[];
}
function view(g: { json: GltfJson; bin: Buffer }, i: number): Float32Array | Uint8Array | Uint16Array {
  const a = g.json.accessors[i]!;
  const n = ({ VEC3: 3, VEC4: 4, MAT4: 16 } as Record<string, number>)[a.type]!;
  const off = g.bin.byteOffset + (g.json.bufferViews[a.bufferView]!.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const ab = g.bin.buffer.slice(off, off + a.count * n * (a.componentType === 5126 ? 4 : a.componentType === 5123 ? 2 : 1));
  return a.componentType === 5126 ? new Float32Array(ab) : a.componentType === 5123 ? new Uint16Array(ab) : new Uint8Array(ab);
}
function parentName(json: GltfJson, name: string): string | undefined {
  const i = json.nodes.findIndex((n) => n.name === name);
  const p = json.nodes.findIndex((n) => (n.children ?? []).includes(i));
  return p >= 0 ? json.nodes[p]!.name : undefined;
}

describe('anim-rig: the joint map (export list, operator figure, runtime rig map, shipped LODs)', () => {
  const bakeJoints = (() => {
    const src = readFileSync('scripts/operators/py/bake_lods.py', 'utf8');
    const m = /GAME_JOINTS = \[([^\]]*)\]/.exec(src);
    return m ? [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!) : [];
  })();
  const fig = operatorJoints(operatorProportions(OPERATORS.wren));
  const figParent = new Map(fig.map((j) => [j.name, j.parent] as const));
  const rigParent = new Map(RIG_JOINTS.map((n, i) => [n, i === 0 ? null : RIG_JOINTS[RIG_PARENT[i]!]!] as const));

  it('every skinned game joint, toes included, is in the bake export, the figure, the rig map and the LOD check', () => {
    expect(bakeJoints).toContain('toeL');
    expect(bakeJoints).toContain('toeR');
    for (const j of bakeJoints) {
      expect(JOINT_NAMES, `figure ${j}`).toContain(j);
      expect(RIG_JOINTS, `rig map ${j}`).toContain(j);
      expect(REQUIRED_JOINTS, `required ${j}`).toContain(j);
    }
    expect(RIG_PARENT).toHaveLength(RIG_JOINTS.length);
  });

  it('parent chains agree: the toe under its ankle, the ankle under its knee, figure and rig map alike', () => {
    for (const s of ['L', 'R']) {
      expect(figParent.get(`toe${s}` as never)).toBe(`an${s}`);
      expect(rigParent.get(`toe${s}` as never)).toBe(`an${s}`);
    }
    // every rig map joint's parent is its figure parent (the figure has extra leaf helpers: hands); (anim-skeleton S2,
    // A2) the clavicles are rig joints under the chest but stay out of the figure (operatorJoints, every clip bake)
    for (const [n, p] of rigParent) {
      if (n === 'root') continue;
      if (n === 'clavL' || n === 'clavR') {
        expect(p, n).toBe('chest');
        expect(figParent.has(n as never), n).toBe(false);
        continue;
      }
      expect(figParent.get(n as never), n).toBe(p);
    }
  });

  it("the shipped LODs: every required joint skinned, toe under ankle, sling socket on the pelvis, toes weighted at the ball", () => {
    for (const lod of ['hero', 'lod0', 'lod1', 'lod2']) {
      const g = glb(`${ASSETS}/wren-${lod}.glb`);
      const names = g.json.skins[0]!.joints.map((i) => g.json.nodes[i]!.name ?? '');
      for (const j of REQUIRED_JOINTS) expect(names, `${lod} ${j}`).toContain(j);
      expect(parentName(g.json, 'toeL'), lod).toBe('anL');
      expect(parentName(g.json, 'toeR'), lod).toBe('anR');
      expect(parentName(g.json, 'slingSocket'), lod).toBe('pelvis');
      if (lod === 'hero') continue; // the hero skins its per-toe bones (toesL_1 ..) under toeL / toeR
      const toe = { L: names.indexOf('toeL'), R: names.indexOf('toeR') };
      const ibm = view(g, g.json.skins[0]!.inverseBindMatrices) as Float32Array;
      let weighted = 0;
      let behind = 0;
      for (const m of g.json.meshes) for (const p of m.primitives) {
        const P = view(g, p.attributes.POSITION!) as Float32Array;
        const J = view(g, p.attributes.JOINTS_0!);
        const W = view(g, p.attributes.WEIGHTS_0!) as Float32Array;
        for (let v = 0; v < J.length / 4; v++) {
          for (let k = 0; k < 4; k++) {
            if (!(W[v * 4 + k]! > 0.5)) continue;
            const s = J[v * 4 + k] === toe.L ? toe.L : J[v * 4 + k] === toe.R ? toe.R : -1;
            if (s < 0) continue;
            weighted++;
            // the toe joint's own frame: +Y runs on along the foot from the ball; a toe-box vertex sits ahead of it
            const M = ibm.subarray(s * 16, s * 16 + 16);
            const ly = M[1]! * P[v * 3]! + M[5]! * P[v * 3 + 1]! + M[9]! * P[v * 3 + 2]! + M[13]!;
            if (ly < -0.02) behind++;
          }
        }
      }
      expect(weighted, `${lod} toe vertices`).toBeGreaterThan(30);
      expect(behind, `${lod} toe vertices behind the ball`).toBeLessThanOrEqual(weighted * 0.02);
    }
  });

  it('the rig builds the toe and sling nodes under the right joints and rigNodes follows RIG_JOINTS; Wren takes her sling sockets', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { rigNodes } = await import('../src/operators/runtime/figure');
    const { operatorRig } = await import('../src/operators/runtime/playerFigure');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);
    const rig = new CharacterRig(scene, make, defaultLook(), 1.75, 'r');
    const nodes = rigNodes(rig);
    expect(nodes).toHaveLength(RIG_JOINTS.length);
    nodes.forEach((n, i) => {
      expect(n.name).toBe(`r-${RIG_JOINTS[i]}`);
      if (i > 0) expect(n.parent, n.name).toBe(nodes[RIG_PARENT[i]!]);
    });
    expect(rig.toeL.parent).toBe(rig.ankleL);
    expect(rig.toeR.parent).toBe(rig.ankleR);
    expect(rig.slingBack.parent).toBe(rig.torso);
    expect(rig.slingHip.parent).toBe(rig.hips);
    // the toe sits at the ball of the foot: on the floor, ahead of the ankle
    rig.root.computeWorldMatrix(true);
    for (const n of [rig.body, rig.hips, rig.hipL, rig.kneeL, rig.ankleL, rig.toeL]) n.computeWorldMatrix(true);
    const t = rig.toeL.getAbsolutePosition();
    expect(t.y).toBeCloseTo(0, 6);
    expect(t.z).toBeCloseTo(rig.p.foot.len * 0.45, 6);
    rig.dispose();
    const w = operatorRig(scene, make, defaultLook(), 'w');
    expect(w.rig.slingBack.position.asArray()).toEqual([...WREN_SLING.back]);
    expect(w.rig.slingHip.position.asArray()).toEqual([...WREN_SLING.hip]);
    w.figure.dispose();
    w.rig.dispose();
    scene.dispose();
  });
});

describe('anim-rig: the keyed wrist frame', () => {
  it('the keyed walk (no wrist frame) samples exactly as before the format change, the wrists at identity', () => {
    // (anim-rework S2) on the frozen G8 walk the fixture was taken from (slice 2 re-keyed the walk)
    const before = JSON.parse(readFileSync('tests/fixtures/keyed-walk-before.json', 'utf8')) as { ph: number; amp: number; pel: number[]; q: number[]; arm: number[] }[];
    expect(before).toHaveLength(100);
    expect(KEYED_WALK_G8.wrist).toBeNull();
    const o = newKeyedPose();
    for (const s of before) {
      sampleKeyed(KEYED_WALK_G8, s.ph, s.amp, o);
      expect([...o.pel]).toEqual(s.pel);
      expect([...o.q]).toEqual(s.q);
      expect([...o.arm]).toEqual(s.arm);
      expect([...o.wrist]).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
      expect(o.hasWrist).toBe(0);
    }
  });

  it('a clip with a wrist frame: frames hit, nlerp between them, amp scales about the mean, a wrong length throws', () => {
    const N = 4;
    const zeros = (n: number) => new Array<number>(n * N).fill(0);
    const q = Array.from({ length: N }, () => [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]).flat();
    // the right wrist turns 0 -> 60 degrees about x over the cycle and back; the left stays at a fixed 30 about z
    const ang = [0, 30, 60, 30].map((d) => (d * Math.PI) / 180);
    const z30 = [0, 0, Math.sin(Math.PI / 12), Math.cos(Math.PI / 12)];
    const wrist = ang.flatMap((a) => [...z30, Math.sin(a / 2), 0, 0, Math.cos(a / 2)]);
    const c = keyedClip({ name: 't', frames: N, duty: 0.5, liftH: 0.05, kneeOut: 0, half: 0.06, pel: zeros(3), q, arm: zeros(12), wrist });
    const o = newKeyedPose();
    sampleKeyed(c, 0.5, 1, o);
    expect(o.hasWrist).toBe(1);
    expect(o.wrist[KW.wristR]).toBeCloseTo(Math.sin(Math.PI / 6), 6);
    expect(o.wrist[KW.wristL + 2]).toBeCloseTo(z30[2]!, 6);
    // half way between 30 and 60 degrees (nlerp of a small arc: within 0.1 degree of 45)
    sampleKeyed(c, 0.375, 1, o);
    const r = o.wrist.subarray(KW.wristR, KW.wristR + 4);
    expect(2 * Math.atan2(r[0]!, r[3]!) * (180 / Math.PI)).toBeCloseTo(45, 1);
    expect(Math.hypot(...r)).toBeCloseTo(1, 9);
    // amp 0: the mean (30 degrees about x on the right)
    sampleKeyed(c, 0.9, 0, o);
    expect(2 * Math.atan2(o.wrist[KW.wristR]!, o.wrist[KW.wristR + 3]!) * (180 / Math.PI)).toBeCloseTo(30, 1);
    // back to a clip without one: identity again (a pose reused across clips)
    sampleKeyed(KEYED_WALK, 0.2, 1, o);
    expect([...o.wrist]).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
    expect(o.hasWrist).toBe(0);
    expect(() => keyedClip({ name: 'bad', frames: N, duty: 0.5, liftH: 0.05, kneeOut: 0, half: 0.06, pel: zeros(3), q, arm: zeros(12), wrist: wrist.slice(1) })).toThrow(/wrist/);
  });

  it("the bake's wrist convention is the rig's: key_clip.py's (yaw 20, pitch -15, roll 30) equals RotationYawPitchRoll, the left mirrored", async () => {
    const { Quaternion } = await import('../src/core/babylon');
    // scripts/anim-keys/py/key_clip.py on Blender 5.2.2 (anim-rig, 2026-10-20): a walk with that wrist on every key
    // sampled these constant local wrist quaternions (L then R)
    const baked = [-0.0796, -0.1996, -0.2746, 0.9372, -0.0796, 0.1996, 0.2746, 0.9372];
    const d = Math.PI / 180;
    const R = Quaternion.RotationYawPitchRoll(20 * d, -15 * d, 30 * d);
    const L = Quaternion.RotationYawPitchRoll(-20 * d, -15 * d, -30 * d);
    [...L.asArray(), ...R.asArray()].forEach((v, i) => expect(v).toBeCloseTo(baked[i]!, 3));
  });

  it('the rig turns the free hand to a keyed wrist frame (local to the forearm) and leaves it for the walk', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    rig.groundProbe = () => 0;
    rig.carrier = true;
    const pose: Parameters<typeof rig.animate>[1] = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' };
    let z = 0;
    let phase = 0;
    const step = (wrist: readonly number[] | null): void => {
      z += 1.4 / 60;
      rig.root.position.set(0, 0, z);
      phase = (phase + 1 / 60 / 0.82) % 1;
      pose.phase = phase;
      pose.velX = 0;
      pose.velZ = 1.4;
      const g = rig.graph as unknown as { update: (...a: unknown[]) => { keyed: ReturnType<typeof newKeyedPose> } };
      const orig = g.update;
      if (wrist) {
        // the walk's own sample with a wrist frame laid over it (as a clip keying one would sample)
        g.update = function (this: unknown, ...a: unknown[]) {
          const t = orig.apply(this, a);
          t.keyed.wrist.set(wrist);
          t.keyed.hasWrist = 1;
          return t;
        };
      }
      rig.animate(1 / 60, pose);
      g.update = orig;
    };
    for (let n = 0; n < 150; n++) step(null);
    expect(rig.keyedWalk).toBeGreaterThan(0.95);
    // the walk: the free hand continues the forearm
    expect(Math.abs(rig.wristR.rotationQuaternion!.w)).toBeCloseTo(1, 6);
    const s = Math.sin(0.4), c = Math.cos(0.4);
    for (let n = 0; n < 5; n++) step([0, 0, s, c, s, 0, 0, c]);
    const kaw = rig.lastTargets!.keyArmW;
    expect(kaw).toBeGreaterThan(0.9);
    // the right wrist's local rotation is the keyed one (about x, 0.8 rad) by the keyed arm weight
    const qr = rig.wristR.rotationQuaternion!;
    expect(2 * Math.atan2(qr.x, qr.w)).toBeCloseTo(0.8 * kaw, 2);
    const ql = rig.wristL.rotationQuaternion!;
    expect(2 * Math.atan2(ql.z, ql.w)).toBeCloseTo(0.8 * kaw, 2);
    rig.dispose();
    scene.dispose();
  });
});

describe('anim-rig: the toes follow the planted foot roll', () => {
  it('toePitch: straight while flat or heel first, bent up by the roll onto the ball, clamped, faded over the toe-off', () => {
    expect(toePitch({ contact: true, pitch: 0, swing: -1 })).toBe(0);
    expect(toePitch({ contact: true, pitch: -0.3, swing: -1 })).toBe(0);
    expect(toePitch({ contact: true, pitch: 0.4, swing: -1 })).toBeCloseTo(-0.4, 12);
    expect(toePitch({ contact: true, pitch: 2, swing: -1 })).toBeCloseTo(-TOE_MAX, 12);
    // the toe-off: continuous at lift (swing 0), gone by 0.3 of the swing
    expect(toePitch({ contact: false, pitch: 0.4, swing: 0 })).toBeCloseTo(-0.4, 12);
    const mid = toePitch({ contact: false, pitch: 0.4, swing: 0.15 });
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-0.4);
    expect(toePitch({ contact: false, pitch: 0.4, swing: 0.3 })).toBeCloseTo(0, 12);
    expect(toePitch({ contact: false, pitch: 0.4, swing: -1 })).toBeCloseTo(0, 12);
  });

  it('walking, the rig pitches each toe by toePitch(planner foot) and the toes stay level as the heel rises', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Quaternion, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    rig.groundProbe = () => 0;
    rig.carrier = true;
    const pose: Parameters<typeof rig.animate>[1] = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' };
    let z = 0;
    let phase = 0;
    let rolled = 0;
    let worstLevel = 0;
    let worstFootDown = 0;
    const want = new Quaternion();
    const fwd = new Vector3();
    for (let n = 0; n < 300; n++) {
      z += 1.4 / 60;
      rig.root.position.set(0, 0, z);
      phase = (phase + 1 / 60 / 0.82) % 1;
      pose.phase = phase;
      pose.velX = 0;
      pose.velZ = 1.4;
      rig.animate(1 / 60, pose);
      if (n < 60) continue;
      for (const [f, toe, ankle] of [[rig.planner.L, rig.toeL, rig.ankleL], [rig.planner.R, rig.toeR, rig.ankleR]] as const) {
        Quaternion.RotationYawPitchRollToRef(0, toePitch(f), 0, want);
        expect(Math.abs(Quaternion.Dot(want, toe.rotationQuaternion!))).toBeCloseTo(1, 9);
        if (!(f.contact && f.pitch > 0.2)) continue;
        rolled++;
        toe.computeWorldMatrix(true);
        Vector3.TransformNormalToRef(Vector3.Forward(), toe.getWorldMatrix(), fwd);
        worstLevel = Math.max(worstLevel, Math.abs(fwd.normalize().y));
        Vector3.TransformNormalToRef(Vector3.Forward(), ankle.getWorldMatrix(), fwd);
        worstFootDown = Math.max(worstFootDown, -fwd.normalize().y);
      }
    }
    expect(rolled, 'frames rolled onto the ball').toBeGreaterThan(10);
    // the foot tips down onto its ball while the toes stay within ~11 degrees of level (the stance pitch on top)
    expect(worstFootDown).toBeGreaterThan(0.19);
    expect(worstLevel).toBeLessThan(0.2);
    rig.dispose();
    scene.dispose();
  });
});
