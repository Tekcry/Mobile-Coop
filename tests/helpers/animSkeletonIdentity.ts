/**
 * anim-skeleton S2 (A5): the bit-identity harness. Drives Wren rigs (`operatorRig`, untuned) in node through every keyed
 * clip (the chamber's drive), a few procedural states and a partner-style sequence (no motion driver, as
 * `RemoteAvatar.update` poses it), and hashes, every step, the world matrix and local TRS of each joint that existed
 * before T3 plus the poser's output for those joints on every shipped LOD file. Written against the pre-S2 code and run
 * there first to capture `tests/fixtures/anim-skeleton-identity.json`; `tests/animSkeletonIdentity.test.ts` asserts the
 * same hashes after S2. Only APIs that exist before and after S2 are used (the rig input buffer is sized from
 * RIG_JOINTS, so the clavicle inputs S2 appends are carried but not hashed).
 *
 * Hashing: every value as its float64 bit pattern (cyrb53 over the two 32-bit words), -0 written as +0 (the same number
 * to every consumer; a quaternion multiply by the identity can flip a zero's sign).
 */
import { readFileSync } from 'node:fs';
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

/** The rig joints before T3 (RIG_JOINTS at 4e3cbbda). */
export const PRE_T3_RIG = [
  'root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
  'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'toeL', 'toeR',
] as const;

/** Skin joints added by T3 (S1): not hashed. Fingers count as new only on the LODs that lacked them (lod0-2). */
export function isT3Joint(lod: string, name: string): boolean {
  if (name === 'clavL' || name === 'clavR' || name === 'goggleUse' || name === 'goggleStow') return true;
  return lod !== 'hero' && name.startsWith('finger');
}

export interface ScenarioHash {
  steps: number;
  /** The rig's pre-T3 joints: world matrix (16) + local position (3) + rotation (4), every step. */
  rig: string;
  /** Per LOD file: the poser's local TRS of each pre-T3 slot, every step. */
  poser: Record<string, string>;
  /** Raw local TRS of the pre-T3 rig joints at the last step (debugging a mismatch). */
  last: number[];
}

export type IdentityFixture = Record<string, ScenarioHash>;

class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v === 0 ? 0 : v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

const LODS = ['hero', 'lod0', 'lod1', 'lod2'] as const;

type Step = (rig: CharacterRig, k: number, pose: RigPose) => void;
interface Scenario {
  id: string;
  steps: number;
  setup?: (h: Harness, rig: CharacterRig) => void;
  step: Step;
}

interface Harness {
  scene: unknown;
  lib: unknown;
  rifle: (rig: CharacterRig) => void;
  pistol: (rig: CharacterRig) => void;
}

const DT = 1 / 60;

function basePose(): RigPose {
  return { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
}

/** Runs every scenario and returns its hashes (the fixture shape). `only`: a subset of scenario ids (debugging). */
export async function runIdentity(only?: readonly string[]): Promise<IdentityFixture> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/player/avatarLook');
  const { operatorRig, partnerFigureFrame } = await import('../../src/operators/runtime/playerFigure');
  const { readRig, rigNodes } = await import('../../src/operators/runtime/figure');
  const { OperatorPoser, poserSetup, RIG_JOINTS, TRS } = await import('../../src/operators/runtime/pose');
  const { parseGlb } = await import('../../src/operators/lab/glb');
  const { CHAMBER_ENTRIES } = await import('../../src/anim/chamber');
  const { newChamberDrive } = await import('../../src/anim/chamberDrive');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../../src/weapons/weaponModel');
  const { WEAPONS } = await import('../../src/weapons/weaponDefs');

  const files = LODS.map((lod) => {
    const b = readFileSync(`src/operators/assets/wren/wren-${lod}.glb`);
    const m = parseGlb(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
    const setup = poserSetup(m.nodes, m.joints);
    const slots: number[] = [];
    for (let s = 0; s < setup.names.length; s++) if (!isT3Joint(lod, setup.names[s]!)) slots.push(s);
    return { lod, setup, slots };
  });

  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);
  const h: Harness = {
    scene,
    lib,
    rifle: (rig) => new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig),
    pistol: (rig) => new WeaponModel(scene, lib, WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.root).hold(rig),
  };

  const scenarios: Scenario[] = [];
  // every keyed clip through the chamber's drive: in place, the whole loop over the run (+ a few steps past the wrap)
  for (const e of CHAMBER_ENTRIES) {
    if (e.kind !== 'keyed' || !e.clip) continue;
    const steps = 48;
    scenarios.push({
      id: e.id,
      steps,
      setup: (hh, rig) => {
        if (e.drawn) hh.rifle(rig);
        const d = newChamberDrive();
        d.clip = e.clip;
        d.inPlace = true;
        d.cycle = 40 * DT;
        d.drawn = e.drawn;
        d.crouch = e.crouch;
        d.pace = e.pace;
        d.dirX = e.move === 'side' ? 1 : 0;
        d.dirZ = e.move === 'fwd' ? 1 : e.move === 'back' ? -1 : 0;
        rig.graph.drive = d;
      },
      step: (_rig, _k, p) => {
        p.armed = e.drawn;
        p.aim = e.aim ? 1 : 0;
      },
    });
  }
  const walkOn = (speed: number, crouch: number): Step => (rig, _k, p) => {
    p.speed = speed;
    p.localZ = speed > 0 ? 1 : 0;
    p.crouch = crouch;
    rig.root.position.z += speed * DT;
  };
  scenarios.push(
    { id: 'state:idle', steps: 90, step: walkOn(0, 0) },
    { id: 'state:walk', steps: 120, step: walkOn(1.4, 0) },
    { id: 'state:run', steps: 120, step: walkOn(4.5, 0) },
    { id: 'state:crouch', steps: 90, step: walkOn(0, 1) },
    { id: 'state:crouchWalk', steps: 120, step: walkOn(1.2, 1) },
    {
      id: 'state:aimRifle', steps: 90, setup: (hh, rig) => hh.rifle(rig),
      step: (rig, k, p) => { walkOn(k > 45 ? 1 : 0, 0)(rig, k, p); p.armed = true; p.aim = k > 20 ? 1 : 0; p.aimPitch = 0.2; p.weight = 1.2; },
    },
    {
      id: 'state:aimPistol', steps: 90, setup: (hh, rig) => hh.pistol(rig),
      step: (rig, k, p) => { walkOn(0, k > 45 ? 1 : 0)(rig, k, p); p.armed = true; p.aim = k > 20 ? 1 : 0; p.aimPitch = -0.1; },
    },
    { id: 'state:vault', steps: 60, step: (_r, k, p) => { p.traverse = 'vault'; p.traverseT = k / 59; } },
    { id: 'state:hang', steps: 60, step: (_r, k, p) => { p.traverse = 'hang'; p.traverseT = k / 59; p.grounded = false; } },
    { id: 'state:wall', steps: 60, step: (_r, k, p) => { p.wall = true; p.wallSide = 1; p.crouch = k > 30 ? 1 : 0; } },
  );
  // the partner: no motion driver, measured velocity from the root's travel, free movement along the facing
  scenarios.push({
    id: 'partner:moves', steps: 180, setup: (hh, rig) => hh.rifle(rig),
    step: (rig, k, p) => {
      const speed = k < 30 ? 0 : k < 100 ? 1.5 : k < 140 ? 3.5 : 0.6;
      const yaw = k * 0.01;
      rig.root.rotation.y = yaw;
      rig.root.position.x += Math.sin(yaw) * speed * DT;
      rig.root.position.z += Math.cos(yaw) * speed * DT;
      p.speed = speed;
      p.localX = 0;
      p.localZ = speed > 0 ? 1 : 0;
      p.stride = 'facing';
      p.crouch = k > 150 ? 1 : 0;
      p.armed = true;
      p.aim = k > 160 ? 1 : 0;
      p.lookYaw = 0.3;
      p.lookPitch = -0.1;
    },
  });

  const out: IdentityFixture = {};
  const rigBuf = new Float64Array(RIG_JOINTS.length * TRS);
  const runOne = (sc: Scenario): ScenarioHash => {
    const op = operatorRig(scene, make, defaultLook(), 'id');
    const rig = op.rig;
    sc.setup?.(h, rig);
    const nodes = rigNodes(rig);
    const rest = new Float64Array(RIG_JOINTS.length * TRS);
    readRig(nodes, rest);
    const posers = files.map((f) => {
      const p = new OperatorPoser(f.setup);
      p.setRest(rest);
      return p;
    });
    const hr = new Hasher();
    const hp = files.map(() => new Hasher());
    const pose = basePose();
    for (let k = 0; k < sc.steps; k++) {
      sc.step(rig, k, pose);
      rig.animate(DT, pose);
      partnerFigureFrame(op.figure, rig, DT, null);
      for (let j = 0; j < PRE_T3_RIG.length; j++) {
        const n = nodes[j]!;
        const m = n.computeWorldMatrix(true).m;
        for (let i = 0; i < 16; i++) hr.add(m[i]!);
        hr.add(n.position.x); hr.add(n.position.y); hr.add(n.position.z);
        const q = n.rotationQuaternion;
        if (q) { hr.add(q.x); hr.add(q.y); hr.add(q.z); hr.add(q.w); } else hr.add(Number.NaN);
      }
      readRig(nodes, rigBuf);
      for (let f = 0; f < files.length; f++) {
        const o = posers[f]!.solve(rigBuf);
        for (const s of files[f]!.slots) for (let i = 0; i < TRS; i++) hp[f]!.add(o[s * TRS + i]!);
      }
    }
    const poser: Record<string, string> = {};
    files.forEach((f, i) => (poser[f.lod] = hp[i]!.digest()));
    op.figure.dispose();
    rig.dispose();
    return { steps: sc.steps, rig: hr.digest(), poser, last: [...rigBuf.subarray(0, PRE_T3_RIG.length * TRS)].map((v) => (v === 0 ? 0 : v)) };
  };
  // the graph seeds its idle clock from Math.random: the same sequence for every scenario
  const random = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (const sc of scenarios) {
      if (only && !only.includes(sc.id)) continue;
      seed = 12345;
      out[sc.id] = runOne(sc);
    }
  } finally {
    Math.random = random;
  }
  scene.dispose();
  return out;
}
