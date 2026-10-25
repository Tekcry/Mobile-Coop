// (tuner-clarity S2) The Keys leg twists: `legd` 9 a side (ankle yaw "+ toes out", shin twist "+ shin turned out"),
// the rig's compose (the twist after the knee delta, the planted fold), the key fields, export and bake tables, and a
// golden captured on pre-S2 code for an old-channels-only edit that stays bit-identical.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEYED_JOG } from '../src/anim/clips/keyed/jog';
import { keyGroupId } from '../src/anim/tuneKeysFile';
import { tuneKeysSync } from '../src/anim/tuneKeys';
import { tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { jointsMirror, jointsResetAll } from '../src/anim/tuneJoints';
import { LEGD_OPT } from '../src/anim/legDelta';
import type { CharacterRig } from '../src/player/characterRig';
import type { StudioDrive } from '../src/anim/studioDrive';
import type { KeyedClip } from '../src/anim/keyed';
import { writeFileSync } from 'node:fs';

afterEach(() => {
  tuneResetAll();
  tuneKeysSync();
  jointsResetAll();
  jointsMirror(false);
  LEGD_OPT.resolve = true;
  vi.restoreAllMocks();
});

type Built = { rig: CharacterRig; drive: StudioDrive };
type Setup = { make: (name: string, clip: KeyedClip, phase: number) => Built; dispose: () => void };
async function setup(): Promise<Setup> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { newStudioDrive } = await import('../src/anim/studioDrive');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const made: { dispose(): void }[] = [];
  return {
    make: (name, clip, phase) => {
      const o = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), name);
      made.push(o.figure, o.rig);
      const drive = newStudioDrive();
      drive.clip = clip;
      drive.held = true;
      drive.phase = phase;
      drive.pace = 3;
      drive.cycle = 0.72;
      o.rig.graph.drive = drive;
      return { rig: o.rig, drive };
    },
    dispose: () => {
      for (const m of made) m.dispose();
      scene.dispose();
    },
  };
}
const POSE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
type LegNode = 'hipL' | 'kneeL' | 'ankleL' | 'toeL' | 'hipR' | 'kneeR' | 'ankleR' | 'toeR';
const LEG_NODES: readonly LegNode[] = ['hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR'];
/** A rig node's world position, every world matrix from the root down recomputed (no cached matrix read). */
function pos(b: Built, n: LegNode): number[] {
  const chain: { computeWorldMatrix(force: boolean): unknown; parent: unknown }[] = [];
  for (let p: unknown = b.rig[n]; p; p = (p as { parent: unknown }).parent) chain.unshift(p as (typeof chain)[number]);
  for (const c of chain) c.computeWorldMatrix(true);
  const v = b.rig[n].getAbsolutePosition();
  return [v.x, v.y, v.z];
}
/** One fresh rig on jog at `phase`, animated 90 frames (held phase), with the given key edits (key index, id, value). */
async function jogAt(phase: number, edits: readonly (readonly [number, string, number])[]): Promise<{ b: Built; S: Setup }> {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  tuneResetAll();
  for (const [k, id, v] of edits) tuneSet(keyGroupId('jog', k), id, v);
  tuneKeysSync();
  const S = await setup();
  const b = S.make('w', KEYED_JOG, phase);
  for (let k = 0; k < 90; k++) b.rig.animate(1 / 60, POSE);
  return { b, S };
}
/** The leg nodes' local rotations (x y z w each) and the ankles' and toes' world positions, in one flat list. */
function legState(b: Built): number[] {
  const out: number[] = [];
  for (const n of LEG_NODES) out.push(...b.rig[n].rotationQuaternion!.asArray());
  for (const n of ['ankleL', 'toeL', 'ankleR', 'toeR'] as const) out.push(...pos(b, n));
  return out;
}

// The golden: captured on pre-S2 code (legd 7 a side) with `KEYLEG_GOLDEN=<file>` (it writes the lists there). An old-channels-only
// edit on the left leg (every own key: knee + 18, hip yaw + 12) at a planted phase (0: left contact) and a swinging
// phase (0.7: the left foot in the air); every value bit for bit.
const GOLD_EDITS = [0, 1, 2, 3].flatMap((k) => [[k, 'legL_knee', 18] as const, [k, 'legL_hipYaw', 12] as const]);
const GOLD_PHASES = [0, 0.7] as const;
const GOLDEN: Record<string, { contactL: boolean; state: number[] }> = {
  '0': {
    contactL: true,
    state: [
      -0.38973402657758643, -0.11324029105768572, 0.08009267891267088, 0.9104225265570114,
      0.08666638436257162, -3.3163866791641183e-9, 1.969395688194986e-9, 0.9962373874651413,
      0.26611751075779405, 0.08886126250642724, -0.09072906770058757, 0.9555382747649819,
      0, 0, 0, 1,
      0.09593828219042874, -0.05950930077022069, -0.08077450709877201, 0.9903181184068187,
      0.36045710522149266, -9.858951224850365e-10, -7.551343994549597e-10, 0.9327757972641755,
      -0.48344674208356564, 0.06322286328835548, 0.06809331980687819, 0.8704282930141537,
      0, 0, 0, 1,
      -0.0025852809194475412, 0.07200000435113907, 0.47519999742507935, -0.002585281850770116,
      0.006000007502734661, 0.5918399691581726, 0.002585285808891058, 0.12590156495571136,
      -0.4448072910308838, 0.0025852874387055635, 0.05990157276391983, -0.32816728949546814,
    ],
  },
  '0.7': {
    contactL: false,
    state: [
      -0.3490869842595041, 0.003809074329176097, 0.0506564973996911, 0.9357123982633666,
      0.6340240474956675, -3.6119301993764452e-12, -1.469732821557379e-9, 0.7733133339481907,
      -0.3638446822989078, -0.0443367642386563, -0.05193593664913492, 0.9289531532297732,
      0, 0, 0, 1,
      -0.14390135663708764, 0.0789043210944245, -0.07533930407911926, 0.9835601225481794,
      0.16089385128097344, 2.5087829313985566e-9, -2.551156216834549e-9, 0.9869717155605997,
      -0.0579965094554476, -0.07562021086118378, 0.06777633234460984, 0.9931386383368682,
      0, 0, 0, 1,
      -0.002585282316431403, 0.23417386412620544, -0.05082770437002182, -0.0025852820836007595,
      0.1681738644838333, 0.06581229716539383, 0.0025852792896330357, 0.07200004905462265,
      0.04320001229643822, 0.0025852778926491737, 0.006000054068863392, 0.15984000265598297,
    ],
  },
};

describe('tuner-clarity S2: the golden (old channels only, bit-identical through the S2 compose)', () => {
  it('a left knee + hip yaw edit, planted and swinging, matches the pre-S2 rig bit for bit', async () => {
    const got: Record<string, { contactL: boolean; state: number[] }> = {};
    for (const ph of GOLD_PHASES) {
      const r = await jogAt(ph, GOLD_EDITS);
      got[String(ph)] = { contactL: r.b.rig.planner.L.contact, state: legState(r.b) };
      r.S.dispose();
    }
    const capture = process.env.KEYLEG_GOLDEN;
    if (capture) {
      writeFileSync(capture, JSON.stringify(got));
      return;
    }
    expect(got['0']!.contactL).toBe(true);
    expect(got['0.7']!.contactL).toBe(false);
    expect(got).toEqual(GOLDEN);
  });
});
