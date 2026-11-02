/**
 * (marlow-bays item 29, tuner v3) The keyed-clip effect probe: which Body tab sliders (Body, Joints, Limb reach) change
 * Wren's pose while a loop plays. Drives a Wren rig (`operatorRig`) in node through the local player's tuning window
 * (`player.ts`: tuneBegin, tuneV2Frame, tuneKeysFrame, moveTuneBegin, animate, moveTuneEnd, tuneEnd) per state in up to
 * three loops: its keyed clip on the spot (the chamber's drive, the state pinned on her rig as the chamber pins it), the
 * procedural state holstered and (a moving state) the procedural state with a rifle in hand. Each slider is moved half
 * way to its end (a joint angle 25 degrees) and the rig's joint world matrices over the run are compared with the
 * untouched run: any difference over `EPS` counts. The motion driver does not run here (no capsule): `strideMul` (the
 * gait clock) is not seen by the procedural loops, so the tuner's table adds it by hand (`tunerEffect.ts`).
 *
 * (tuner-clarity S3) The motion-capture probe (`runMocapProbe`): the same rig, holstered, at a walk, jog, run and the
 * crouched sneak, with the mocap switch on (`setMocapLocomotion(true)`, as the game plays) and off (the hand-made set),
 * over the Body, Stepping, Weight and Hands & feet place rows and six Joints rows (both knees, ankles, elbows), with the
 * player's Weight window (`weightBegin` / `weightEnd`) around the rig. Its own test file (`tunerReachProbe.test.ts`).
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';

export type ProbeLoop = 'keyed' | 'procedural' | 'armed' | 'mocap';
/** A probed state: the tuner's body state, its keyed clip entry and the procedural pace (m/s). */
export interface ProbeState {
  state: string;
  keyed: string;
  speed: number;
  /** (S3) Crouched (the sneak). */
  crouch?: boolean;
}
export const PROBE_STATES: readonly ProbeState[] = [
  { state: 'idle', keyed: 'keyed:idle', speed: 0 },
  { state: 'walk', keyed: 'keyed:walk', speed: 1.4 },
  { state: 'jog', keyed: 'keyed:jog', speed: 3.0 },
  { state: 'run', keyed: 'keyed:run', speed: 4.0 },
];
/** (tuner-clarity S3) The states the motion capture plays holstered that the mocap probe drives (PLAN S3 notes). */
export const MOCAP_PROBE_STATES: readonly ProbeState[] = [
  { state: 'walk', keyed: 'keyed:walk', speed: 1.4 },
  { state: 'jog', keyed: 'keyed:jog', speed: 3.0 },
  { state: 'run', keyed: 'keyed:run', speed: 4.0 },
  { state: 'sneak', keyed: 'keyed:sneak', speed: 0.8, crouch: true },
];
/** (S3) The Joints rows the mocap probe moves: both knees (bend), ankles (turn: Michael's fix, BRIEF A8) and elbows. */
export const MOCAP_PROBE_JOINTS: readonly string[] = ['kneeL_x', 'kneeR_x', 'ankleL_y', 'ankleR_y', 'elbowL_x', 'elbowR_x'];
/** Per state, per slider key (`section:id`), the loops it changed. */
export type ProbeResult = Record<string, Record<string, ProbeLoop[]>>;
/** (S3) Per state, per slider key, per loop: the largest change of a joint matrix entry (m or unitless). */
export type ProbeSizes = Record<string, Record<string, Partial<Record<ProbeLoop, number>>>>;

const DT = 1 / 60;
const STEPS = 72;
const EPS = 1e-7;
/** (S3) Frames the player-rig runs play before recording: the keyed share and the capture's eased in (BRIEF S3: the
 *  sliders seen on the share that plays, not on the graph code it eases in over). */
const WARM = 90;
/** (S3) The capture's share after the warm-up a mocap run must reach (else the probe would not see the capture). */
const MOCAP_MIN_SHARE = 0.9;

interface RunOpts {
  /** (S3) The local player's rig: a carrier (`rig.carrier`, as player.ts sets it: the mocap switch reaches only a
   *  carrier) inside the player's Weight window (`weightBegin` / `weightEnd`: the Weight rows). */
  player: boolean;
}

/** One probe slider: its group, its `section:id` key, its id and the value it is moved to. */
interface ProbeSlider {
  group: string;
  key: string;
  id: string;
  value: number;
}

/** The modules, the scene and one run of the rig (shared by both probes). */
async function probeKit() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/player/avatarLook');
  const { operatorRig } = await import('../../src/operators/runtime/playerFigure');
  const { rigNodes } = await import('../../src/operators/runtime/figure');
  const { newChamberDrive } = await import('../../src/anim/chamberDrive');
  const { chamberEntry, chamberBodyPin } = await import('../../src/anim/chamber');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../../src/weapons/weaponModel');
  const { WEAPONS } = await import('../../src/weapons/weaponDefs');
  const { TUNE_PIN, TUNE_STATE, tuneBegin, tuneEnd } = await import('../../src/anim/tune');
  const { tuneV2Frame } = await import('../../src/anim/tuneV2Sections');
  const { tuneKeysFrame } = await import('../../src/anim/tuneKeys');
  const { moveTuneBegin, moveTuneEnd } = await import('../../src/anim/moveTune');
  const { handsWeaponOf } = await import('../../src/anim/tuneHands');
  const { setMocapLocomotion, LOCO } = await import('../../src/anim/mocap');
  const { weightBegin, weightEnd } = await import('../../src/player/weightTune');
  const { weightFrameIn } = await import('../../src/anim/weight');

  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);

  const run = (st: ProbeState, loop: ProbeLoop, opts: RunOpts = { player: false }): Float64Array => {
    const wasMocap = LOCO.mocap;
    if (loop === 'mocap') setMocapLocomotion(true);
    const op = operatorRig(scene, make, defaultLook(), 'probe');
    const rig: CharacterRig = op.rig;
    if (opts.player) rig.carrier = true;
    const e = chamberEntry(st.keyed);
    if (loop === 'armed') new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
    if (loop === 'keyed') {
      const d = newChamberDrive();
      d.clip = e.clip;
      d.inPlace = true;
      d.cycle = e.cycle;
      d.pace = e.pace;
      d.dirZ = 1;
      rig.graph.drive = d;
    }
    TUNE_PIN.body = loop === 'keyed' ? chamberBodyPin(e) : '';
    TUNE_PIN.rig = rig;
    const nodes = rigNodes(rig);
    const out = new Float64Array(STEPS * nodes.length * 16);
    const speed = loop === 'keyed' ? 0 : st.speed;
    const crouch = st.crouch && loop !== 'keyed' ? 1 : 0;
    const wi = weightFrameIn();
    let plant = false;
    // the chamber's and the player's free movement pose (stride 'facing': the keyed arms and pelvis apply)
    const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
    try {
      const warm = opts.player ? WARM : 0;
      for (let k = -warm; k < STEPS; k++) {
        pose.speed = speed;
        pose.localZ = speed > 0 ? 1 : 0;
        pose.armed = loop === 'armed';
        pose.lookYaw = 0.3;
        rig.root.position.z += speed * DT;
        tuneBegin(pose, rig, 0);
        // (S3) the moving states the mocap probe drives play as the state they name (a sneak is not a crouch idle)
        if (opts.player && TUNE_STATE.body !== st.state) throw new Error(`probe: ${st.state} played as ${TUNE_STATE.body}`);
        tuneV2Frame(TUNE_STATE.body, handsWeaponOf(rig));
        tuneKeysFrame();
        moveTuneBegin(pose, rig);
        try {
          if (opts.player) {
            wi.dt = DT;
            wi.x = rig.root.position.x;
            wi.y = rig.root.position.y;
            wi.z = rig.root.position.z;
            wi.yaw = 0;
            wi.speed = speed;
            wi.grounded = true;
            wi.plant = plant;
            weightBegin(wi, crouch > 0, false);
          }
          rig.animate(DT, pose);
        } finally {
          moveTuneEnd(rig);
          tuneEnd(rig);
          if (opts.player) weightEnd();
        }
        plant = rig.planner.L.landed || rig.planner.R.landed;
        if (k < 0) continue;
        if (k === 0 && loop === 'mocap') {
          // the standing gait's capture share (keyMocap), or the crouched sneak's (the graph's private mcK)
          const share = st.crouch ? (rig.graph as unknown as { mcK: number }).mcK : rig.graph.out.keyMocap;
          if (!(share >= MOCAP_MIN_SHARE)) throw new Error(`probe: the capture plays ${share} of ${st.state}`);
        }
        for (let j = 0; j < nodes.length; j++) {
          const m = nodes[j]!.computeWorldMatrix(true).m;
          for (let i = 0; i < 16; i++) out[(k * nodes.length + j) * 16 + i] = m[i]!;
        }
      }
    } finally {
      TUNE_PIN.body = '';
      TUNE_PIN.rig = null;
      op.figure.dispose();
      rig.dispose();
      if (loop === 'mocap' || LOCO.mocap !== wasMocap) setMocapLocomotion(wasMocap);
    }
    return out;
  };
  return { scene, run };
}

/** Max abs difference of two runs. */
function diff(a: Float64Array, b: Float64Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i]! - b[i]!));
  return d;
}

/** Which loops each slider changes, per state (`sliders` the state's sliders, `loops` its loops). */
async function probeSliders(
  states: readonly ProbeState[],
  sliders: (st: ProbeState) => ProbeSlider[],
  loops: (st: ProbeState) => readonly ProbeLoop[],
  opts: RunOpts,
  check?: (st: ProbeState, base: ReadonlyMap<ProbeLoop, Float64Array>) => void,
  eps = EPS,
  sizes?: ProbeSizes,
): Promise<ProbeResult> {
  const { tuneSet, tuneResetAll } = await import('../../src/anim/tuneRegistry');
  const { scene, run } = await probeKit();
  const random = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const res: ProbeResult = {};
  try {
    for (const st of states) {
      const ls = loops(st);
      const once = (loop: ProbeLoop): Float64Array => {
        seed = 4242;
        return run(st, loop, opts);
      };
      tuneResetAll();
      const base = new Map<ProbeLoop, Float64Array>();
      for (const loop of ls) base.set(loop, once(loop));
      check?.(st, base);
      const out: Record<string, ProbeLoop[]> = {};
      const size: Record<string, Partial<Record<ProbeLoop, number>>> = {};
      if (sizes) sizes[st.state] = size;
      for (const s of sliders(st)) {
        const hit: ProbeLoop[] = [];
        const sz: Partial<Record<ProbeLoop, number>> = {};
        size[s.key] = sz;
        for (const loop of ls) {
          tuneResetAll();
          if (!tuneSet(s.group, s.id, s.value)) throw new Error(`probe: ${s.group} ${s.id} not set`);
          const d = diff(once(loop), base.get(loop)!);
          sz[loop] = d;
          if (d > eps) hit.push(loop);
        }
        out[s.key] = hit;
      }
      res[st.state] = out;
    }
  } finally {
    tuneResetAll();
    Math.random = random;
    scene.dispose();
  }
  return res;
}

/** `joints`: also every Joints slider (63; jog only by default: the offsets are applied the same way in every state). */
export async function runEffectProbe(states: readonly ProbeState[] = PROBE_STATES, jointStates: readonly string[] = ['jog']): Promise<ProbeResult> {
  const { TUNABLES } = await import('../../src/anim/tune');
  const { JOINT_KEYS } = await import('../../src/anim/tuneV2Sections');
  const { IK_LIMBS, IK_RANGE } = await import('../../src/anim/tuneHands');
  const sliders = (st: ProbeState): ProbeSlider[] => {
    const g = st.state;
    const out: ProbeSlider[] = [];
    for (const t of TUNABLES) {
      if (!(t.groups as readonly string[]).includes(g)) continue;
      const end = t.max !== t.def ? t.max : t.min;
      out.push({ group: g, key: `body:${t.id}`, id: t.id, value: t.def + (end - t.def) * 0.5 });
    }
    if (jointStates.includes(g)) for (const k of JOINT_KEYS) out.push({ group: `joint.${g}`, key: `joint:${k}`, id: k, value: 25 });
    for (const l of IK_LIMBS) out.push({ group: `ik.${g}`, key: `ik:${l}`, id: l, value: (IK_RANGE.def + IK_RANGE.min) * 0.5 });
    return out;
  };
  // a still state with a gun in hand is another state (low ready): moving states only
  const loops = (st: ProbeState): ProbeLoop[] => (st.speed > 0 ? ['keyed', 'procedural', 'armed'] : ['keyed', 'procedural']);
  return probeSliders(states, sliders, loops, { player: false });
}

/**
 * (tuner-clarity S3) When the mocap probe counts a change as seen: over `abs` (a matrix entry, m or unitless) and, on the
 * capture, over `ratio` of the same slider's change on the hand-made set. The capture's share is eased in to 0.9 or more
 * (`MOCAP_MIN_SHARE`), not exactly 1: a slider that only reaches the hand-made share leaks a few percent of its hand-made
 * change through the blend (Arm swing at the run: 2.6 cm against 73 cm on the hand-made run), which is not the capture.
 */
export const SEEN = { abs: 1e-4, ratio: 0.1 } as const;

/** How a slider reaches the capture by its probe sizes: `dead` changes the hand-made set only, `both` changes the
 *  capture, `unseen` changes neither in the probe (a start, stop, turn or landing slider: the probe walks straight). */
export type CaptureSeen = 'dead' | 'both' | 'unseen';
export function captureSeen(sz: Partial<Record<ProbeLoop, number>>): CaptureSeen {
  const hand = sz.procedural ?? 0;
  const cap = sz.mocap ?? 0;
  if (cap > Math.max(SEEN.abs, SEEN.ratio * hand)) return 'both';
  return hand > SEEN.abs ? 'dead' : 'unseen';
}

/**
 * (tuner-clarity S3) The motion-capture probe: per state (`MOCAP_PROBE_STATES`), the Body sliders of the state, every
 * Stepping slider of its gait (`step.<gait>`), every Weight slider of its group (`weight.<group>`), the Hands & feet
 * place rows (forward / up / out, holstered `hand.none.<state>`) and `MOCAP_PROBE_JOINTS`, each moved half way to its end
 * (a joint 25 degrees) in two loops: `mocap` (the switch on: the motion capture plays) and `procedural` (the switch off:
 * the hand-made set), on the player's rig after a warm-up. Returns the change sizes (`captureSeen` reads them). Throws
 * when the switch changes nothing or the capture plays under `MOCAP_MIN_SHARE` of the body.
 */
export async function runMocapProbe(states: readonly ProbeState[] = MOCAP_PROBE_STATES): Promise<ProbeSizes> {
  const { TUNABLES } = await import('../../src/anim/tune');
  const { HAND_SECTION, STEP_SECTION } = await import('../../src/anim/tuneV2Sections');
  const { WEIGHT_SECTION } = await import('../../src/player/weightTune');
  const { BODY_STEP, BODY_WEIGHT } = await import('../../src/ui/tunerLayout');
  const half = (t: { def: number; min: number; max: number }): number => t.def + ((t.max !== t.def ? t.max : t.min) - t.def) * 0.5;
  const sliders = (st: ProbeState): ProbeSlider[] => {
    const g = st.state;
    const out: ProbeSlider[] = [];
    for (const t of TUNABLES) if ((t.groups as readonly string[]).includes(g)) out.push({ group: g, key: `body:${t.id}`, id: t.id, value: half(t) });
    const step = BODY_STEP[g];
    if (step) for (const t of STEP_SECTION.tunables) out.push({ group: `step.${step}`, key: `step:${t.id}`, id: t.id, value: half(t) });
    const weight = BODY_WEIGHT[g];
    if (weight) for (const t of WEIGHT_SECTION.tunables) out.push({ group: `weight.${weight}`, key: `weight:${t.id}`, id: t.id, value: half(t) });
    for (const t of HAND_SECTION.tunables) if (/(Fwd|Up|Out)$/.test(t.id)) out.push({ group: `hand.none.${g}`, key: `hand:${t.id}`, id: t.id, value: half(t) });
    for (const k of MOCAP_PROBE_JOINTS) out.push({ group: `joint.${g}`, key: `joint:${k}`, id: k, value: 25 });
    return out;
  };
  const check = (st: ProbeState, base: ReadonlyMap<ProbeLoop, Float64Array>): void => {
    if (diff(base.get('mocap')!, base.get('procedural')!) <= EPS) throw new Error(`probe: the mocap switch changed nothing at ${st.state}`);
  };
  const sizes: ProbeSizes = {};
  await probeSliders(states, sliders, () => ['procedural', 'mocap'], { player: true }, check, EPS, sizes);
  return sizes;
}
