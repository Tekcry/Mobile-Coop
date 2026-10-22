/**
 * (marlow-bays item 29, tuner v3) The keyed-clip effect probe: which Body tab sliders (Body, Joints, Limb reach) change
 * Wren's pose while a loop plays. Drives a Wren rig (`operatorRig`) in node through the local player's tuning window
 * (`player.ts`: tuneBegin, tuneV2Frame, tuneKeysFrame, moveTuneBegin, animate, moveTuneEnd, tuneEnd) per state in up to
 * three loops: its keyed clip on the spot (the studio's drive, the state pinned on her rig as the studio pins it), the
 * procedural state holstered and (a moving state) the procedural state with a rifle in hand. Each slider is moved half
 * way to its end (a joint angle 25 degrees) and the rig's joint world matrices over the run are compared with the
 * untouched run: any difference over `EPS` counts. The motion driver does not run here (no capsule): `strideMul` (the
 * gait clock) is not seen by the procedural loops, so the tuner's table adds it by hand (`tunerEffect.ts`).
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

export type ProbeLoop = 'keyed' | 'procedural' | 'armed';
/** A probed state: the tuner's body state, its keyed clip entry and the procedural pace (m/s). */
export interface ProbeState {
  state: string;
  keyed: string;
  speed: number;
}
export const PROBE_STATES: readonly ProbeState[] = [
  { state: 'idle', keyed: 'keyed:idle', speed: 0 },
  { state: 'walk', keyed: 'keyed:walk', speed: 1.4 },
  { state: 'jog', keyed: 'keyed:jog', speed: 3.0 },
  { state: 'run', keyed: 'keyed:run', speed: 4.0 },
];
/** Per state, per slider key (`section:id`), the loops it changed. */
export type ProbeResult = Record<string, Record<string, ProbeLoop[]>>;

const DT = 1 / 60;
const STEPS = 72;
const EPS = 1e-7;

/** `joints`: also every Joints slider (63; jog only by default: the offsets are applied the same way in every state). */
export async function runEffectProbe(states: readonly ProbeState[] = PROBE_STATES, jointStates: readonly string[] = ['jog']): Promise<ProbeResult> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { rigNodes } = await import('../../src/operators/runtime/figure');
  const { newStudioDrive } = await import('../../src/anim/studioDrive');
  const { studioEntry, studioBodyPin } = await import('../../src/anim/studio');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../../src/weapons/weaponModel');
  const { WEAPONS } = await import('../../src/weapons/weaponDefs');
  const { TUNE_PIN, TUNE_STATE, TUNABLES, tuneBegin, tuneEnd } = await import('../../src/anim/tune');
  const { tuneSet, tuneResetAll } = await import('../../src/anim/tuneRegistry');
  const { tuneV2Frame, JOINT_KEYS } = await import('../../src/anim/tuneV2Sections');
  const { tuneKeysFrame } = await import('../../src/anim/tuneKeys');
  const { moveTuneBegin, moveTuneEnd } = await import('../../src/anim/moveTune');
  const { handsWeaponOf, IK_LIMBS, IK_RANGE } = await import('../../src/anim/tuneHands');

  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);

  const run = (st: ProbeState, loop: ProbeLoop): Float64Array => {
    const op = operatorRig(scene, make, defaultLook(), 'probe');
    const rig: CharacterRig = op.rig;
    const e = studioEntry(st.keyed);
    if (loop === 'armed') new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
    if (loop === 'keyed') {
      const d = newStudioDrive();
      d.clip = e.clip;
      d.inPlace = true;
      d.cycle = e.cycle;
      d.pace = e.pace;
      d.dirZ = 1;
      rig.graph.drive = d;
    }
    TUNE_PIN.body = loop === 'keyed' ? studioBodyPin(e) : '';
    TUNE_PIN.rig = rig;
    const nodes = rigNodes(rig);
    const out = new Float64Array(STEPS * nodes.length * 16);
    const speed = loop === 'keyed' ? 0 : st.speed;
    // the studio's and the player's free movement pose (stride 'facing': the keyed arms and pelvis apply)
    const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
    for (let k = 0; k < STEPS; k++) {
      pose.speed = speed;
      pose.localZ = speed > 0 ? 1 : 0;
      pose.armed = loop === 'armed';
      pose.lookYaw = 0.3;
      rig.root.position.z += speed * DT;
      tuneBegin(pose, rig, 0);
      tuneV2Frame(TUNE_STATE.body, handsWeaponOf(rig));
      tuneKeysFrame();
      moveTuneBegin(pose, rig);
      try {
        rig.animate(DT, pose);
      } finally {
        moveTuneEnd(rig);
        tuneEnd(rig);
      }
      for (let j = 0; j < nodes.length; j++) {
        const m = nodes[j]!.computeWorldMatrix(true).m;
        for (let i = 0; i < 16; i++) out[(k * nodes.length + j) * 16 + i] = m[i]!;
      }
    }
    TUNE_PIN.body = '';
    TUNE_PIN.rig = null;
    op.figure.dispose();
    rig.dispose();
    return out;
  };

  const random = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const res: ProbeResult = {};
  try {
    for (const st of states) {
      const g = st.state;
      const sliders: { group: string; key: string; id: string; value: number }[] = [];
      for (const t of TUNABLES) {
        if (!(t.groups as readonly string[]).includes(g)) continue;
        const end = t.max !== t.def ? t.max : t.min;
        sliders.push({ group: g, key: `body:${t.id}`, id: t.id, value: t.def + (end - t.def) * 0.5 });
      }
      if (jointStates.includes(g)) for (const k of JOINT_KEYS) sliders.push({ group: `joint.${g}`, key: `joint:${k}`, id: k, value: 25 });
      for (const l of IK_LIMBS) sliders.push({ group: `ik.${g}`, key: `ik:${l}`, id: l, value: (IK_RANGE.def + IK_RANGE.min) * 0.5 });
      // a still state with a gun in hand is another state (low ready): moving states only
      const loops: ProbeLoop[] = st.speed > 0 ? ['keyed', 'procedural', 'armed'] : ['keyed', 'procedural'];
      const once = (loop: ProbeLoop): Float64Array => {
        seed = 4242;
        return run(st, loop);
      };
      tuneResetAll();
      const base = new Map<ProbeLoop, Float64Array>();
      for (const loop of loops) base.set(loop, once(loop));
      const out: Record<string, ProbeLoop[]> = {};
      for (const s of sliders) {
        const hit: ProbeLoop[] = [];
        for (const loop of loops) {
          tuneResetAll();
          if (!tuneSet(s.group, s.id, s.value)) throw new Error(`probe: ${s.group} ${s.id} not set`);
          const got = once(loop);
          const want = base.get(loop)!;
          let d = 0;
          for (let i = 0; i < got.length; i++) d = Math.max(d, Math.abs(got[i]! - want[i]!));
          if (d > EPS) hit.push(loop);
        }
        out[s.key] = hit;
      }
      res[g] = out;
    }
  } finally {
    tuneResetAll();
    Math.random = random;
    scene.dispose();
  }
  return res;
}
