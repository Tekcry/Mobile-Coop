/**
 * (mixamo-retarget M5) The attached-state probe: which tuner rows change Wren's pose while a traversal channel clip plays
 * (`clips/traverse.ts` today; the Mixamo channel captures once I2 plays them), the way `tuneEffectProbe.ts` probes the
 * keyed clips and the capture. A Wren rig (`operatorRig`) is driven in node as `attachController` drives the local
 * player's: the grips (`AttachGrips`) on a lip or a ladder, the root on the anchor (`attachPose` + the grips' lift), the
 * pose's `traverse` / `traverseT` from the grips' cadence or the climb-up's progress, inside the local player's tuning
 * window in `player.ts`'s order (tuneRoot, moveTuneSelect / moveTuneRoot, tuneBegin, tuneV2Frame, tuneKeysFrame,
 * moveTuneBegin, animate, moveTuneEnd, tuneEnd). The body travels along the anchor at the attach machine's own target
 * pace (`ATTACH.<kind>.speed x speedAttachMul`: the Speed section's climb rows, what `AttachMachine.step` reads).
 *
 * States: `hang` (still on a lip: the HANG clip on the swing), `shimmy` (along the lip), `ladder` (up the rungs: the CLIMB
 * clip on the hand cadence), `climbUp` (the ledge climb-up: CLIMB_UP on its progress), `topOut` (the ladder's top-out: the
 * same clip to its crouch, the feet on the rungs at first). Each row is moved half way to its
 * end (a joint 25 degrees) and the joint world matrices over the run are compared with the untouched run.
 *
 * `ATTACH_PROBE_SETUPS` are the clip sets each state runs under: the hand-made clips today. I2 adds the Mixamo set (its
 * `on` / `off` switch the Wren traversal table to the captures), so the same rows are proved on the captures.
 */
import type { CharacterRig, RigPose } from '../../src/player/characterRig';
import type { Ladder, Ledge } from '../../src/world/anchors';

/** A probed attached state: its tuner Body group (or none), its traversal move group (or none), its Speed row (or none). */
export interface AttachProbeState {
  state: 'hang' | 'shimmy' | 'ladder' | 'climbUp' | 'topOut';
  /** The Body / Joints / Hands & feet / Limb reach group (`ledge`, `ladder`), '' none. */
  body: string;
  /** The traversal move group (`trav.climbUp`): its Climb and vault rows and its move rows of Joints / Hands & feet / Limb reach. */
  trav: string;
  /** The Speed section's climb row that paces it (`spd.climb`), '' none. */
  speed: string;
}

export const ATTACH_PROBE_STATES: readonly AttachProbeState[] = [
  { state: 'hang', body: 'ledge', trav: '', speed: '' },
  { state: 'shimmy', body: 'ledge', trav: '', speed: 'shimmyMul' },
  { state: 'ladder', body: 'ladder', trav: '', speed: 'ladderMul' },
  { state: 'climbUp', body: '', trav: 'trav.climbUp', speed: '' },
  { state: 'topOut', body: '', trav: 'trav.climbUp', speed: '' },
];

/** The Studio traversal loop (`studioTraversal.ts`) each probe state is played in: a channel capture whose row names the
 *  loop is covered by these states (`tests/tunerReachProbe.test.ts` checks every row's loop is). */
export const ATTACH_PROBE_LOOPS: Readonly<Record<string, readonly AttachProbeState['state'][]>> = {
  'trav:ledge': ['hang', 'shimmy', 'climbUp'],
  'trav:ladder': ['ladder', 'topOut'],
};

/** The Joints rows the probe moves on each group: the trunk, the arms and the legs. */
export const ATTACH_PROBE_JOINTS: readonly string[] = ['spine_x', 'chest_y', 'shoulderL_x', 'elbowR_x', 'wristL_z', 'hipL_x', 'kneeR_x', 'ankleL_y'];

/** A clip set the probe runs under (`on` before a state's runs, `off` after). */
export interface AttachProbeSetup {
  name: string;
  on(): void;
  off(): void;
}

/** The hand-made traversal clips (the game today). I2: add the Mixamo set here. */
export const ATTACH_PROBE_SETUPS: AttachProbeSetup[] = [{ name: 'hand-made', on: () => {}, off: () => {} }];

/** One probed row: its group, its `section:id` key, its id and the value it is moved to. */
export interface AttachProbeRow {
  group: string;
  key: string;
  id: string;
  value: number;
}

/** Per state, per row key: the largest change of a joint world matrix entry (m or unitless) over the run. */
export type AttachProbeSizes = Record<string, Record<string, number>>;

const DT = 1 / 60;
/** Frames before recording (the grips settle, the swing starts) and recorded. */
const WARM = 60;
const STEPS = 90;

/** The rows of a state: what the tuner shows for it (and the Speed row that paces it). */
export async function attachProbeRows(st: AttachProbeState): Promise<AttachProbeRow[]> {
  const { TUNABLES } = await import('../../src/anim/tune');
  const { HAND_SECTION } = await import('../../src/anim/tuneV2Sections');
  const { IK_LIMBS, IK_RANGE } = await import('../../src/anim/tuneHands');
  const { TRAV_SECTION } = await import('../../src/anim/moveTune');
  const { SPEED_SECTION } = await import('../../src/player/speedTune');
  const half = (t: { def: number; min: number; max: number }): number => t.def + ((t.max !== t.def ? t.max : t.min) - t.def) * 0.5;
  const out: AttachProbeRow[] = [];
  const rowsOf = (g: string): void => {
    for (const k of ATTACH_PROBE_JOINTS) out.push({ group: `joint.${g}`, key: `joint:${k}`, id: k, value: 25 });
    for (const t of HAND_SECTION.tunables) if (/(Fwd|Up|Out)$/.test(t.id)) out.push({ group: `hand.none.${g}`, key: `hand:${t.id}`, id: t.id, value: half(t) });
    for (const l of IK_LIMBS) out.push({ group: `ik.${g}`, key: `ik:${l}`, id: l, value: (IK_RANGE.def + IK_RANGE.min) * 0.5 });
  };
  if (st.body) {
    for (const t of TUNABLES) if ((t.groups as readonly string[]).includes(st.body)) out.push({ group: st.body, key: `body:${t.id}`, id: t.id, value: half(t) });
    rowsOf(st.body);
  }
  if (st.trav) {
    for (const t of TRAV_SECTION.tunables) if ((t.groups as readonly string[]).includes(st.trav)) out.push({ group: st.trav, key: `trav:${t.id}`, id: t.id, value: half(t) });
    rowsOf(st.trav);
  }
  if (st.speed) {
    const t = SPEED_SECTION.tunables.find((x) => x.id === st.speed)!;
    out.push({ group: 'spd.climb', key: `speed:${t.id}`, id: t.id, value: half(t) });
  }
  return out;
}

/**
 * Run the probe: per state, every row of `attachProbeRows` under `setup`; the change sizes per row. Throws when a state
 * does not play as itself (the tuner's Body group, the pose's traverse kind).
 */
export async function runAttachProbe(setup: AttachProbeSetup = ATTACH_PROBE_SETUPS[0]!, states: readonly AttachProbeState[] = ATTACH_PROBE_STATES): Promise<AttachProbeSizes> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { defaultLook } = await import('../../src/cosmetics/avatarLook');
  const { operatorRig, PLAYER_HEIGHT } = await import('../../src/operators/runtime/playerFigure');
  const { rigNodes } = await import('../../src/operators/runtime/figure');
  const { TUNE_STATE, tuneBegin, tuneEnd, tuneRoot } = await import('../../src/anim/tune');
  const { tuneV2Frame } = await import('../../src/anim/tuneV2Sections');
  const { tuneKeysFrame } = await import('../../src/anim/tuneKeys');
  const { moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelect, MOVE_TUNE_TEAM } = await import('../../src/anim/moveTune');
  const { handsWeaponOf } = await import('../../src/anim/tuneHands');
  const { tuneSet, tuneResetAll } = await import('../../src/anim/tuneRegistry');
  const { AttachGrips } = await import('../../src/player/attachGrips');
  const { ATTACH, attachPose, GAMEPLAY_HEIGHT } = await import('../../src/player/attach');
  const { speedAttachMul } = await import('../../src/player/speedTune');
  const { CLIMB_UP_PATH, CLIMB_UP_TIME, CLIMB_UP_STAND, LADDER_TOPOUT_TIME } = await import('../../src/player/attachController');
  const { CLIMB_UP_CROUCH_K } = await import('../../src/anim/clips/traverse');
  const { attachGripWeight, climbUpFootWeight } = await import('../../src/player/moveState');
  const { makeLedge, TraversalAnchors, HANG } = await import('../../src/world/anchors');

  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);
  const anchors = new TraversalAnchors();
  // a lip along +x at z 0 (the face out towards -z), 2.4 m up; a ladder (CT's 0.3 m rungs) elsewhere
  const lip = anchors.add<Ledge>(makeLedge(0, 0, 8, 0, 2.4));
  const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 20, y: 0, z: 0 }, top: { x: 20, y: 9, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
  const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  const run = (st: AttachProbeState): Float64Array => {
    const op = operatorRig(scene, make, defaultLook(), 'attach-probe');
    const rig: CharacterRig = op.rig;
    rig.tuneRows = true;
    const nodes = rigNodes(rig);
    const out = new Float64Array(STEPS * nodes.length * 16);
    const g = new AttachGrips();
    const onLadder = st.state === 'ladder' || st.state === 'topOut';
    const a = onLadder ? ladder : lip;
    let s = st.state === 'topOut' ? 7.5 : onLadder ? 0.6 : 2;
    g.setup(a, s, 1, PLAYER_HEIGHT);
    const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, lookYaw: 0.3, traverse: 'hang', traverseT: 0 };
    const ap = { x: 0, y: 0, z: 0, yaw: 0 };
    // the lip climb-up: the exit path from the hang (attachController beginExit 'climb' on a lip), as tests/climbHands.test.ts
    const p0 = attachPose(lip, s, 1, GAMEPLAY_HEIGHT, { x: 0, y: 0, z: 0, yaw: 0 });
    const end = { x: p0.x - lip.nx * (HANG.out + 0.45), z: p0.z - lip.nz * (HANG.out + 0.45) };
    const P = CLIMB_UP_PATH;
    // its time (CLIMB_UP_TIME + CLIMB_UP_STAND, ~78 frames) and the ladder top-out's (LADDER_TOPOUT_TIME, ~51 frames)
    const N = Math.round((st.state === 'topOut' ? LADDER_TOPOUT_TIME : CLIMB_UP_TIME + CLIMB_UP_STAND) / DT);
    const exiting = st.state === 'climbUp' || st.state === 'topOut';
    try {
      for (let k = -WARM; k < STEPS; k++) {
        // the body's pace along the anchor: the attach machine's target (the Speed section's climb row)
        const v = st.state === 'shimmy' ? ATTACH.ledge.speed * speedAttachMul('ledge') : st.state === 'ladder' ? ATTACH.ladder.speed * speedAttachMul('ladder') : 0;
        s += v * DT;
        // an exit over its own time, then held at its end
        const exitK = exiting && k >= 0 ? Math.min(1, k / N) : -1;
        if (exitK >= 0) {
          // the feet let go first (climbUpFootWeight), the hands on the climb-up's own release
          g.footW = climbUpFootWeight(true, exitK);
          g.update(DT, a, s, 0, 1, attachGripWeight('exit', exitK, true), rig);
        } else g.update(DT, a, s, v, 1, 1, rig);
        attachPose(a, s, 1, GAMEPLAY_HEIGHT, ap);
        let x = ap.x;
        let y = ap.y;
        let z = ap.z;
        if (exitK >= 0 && st.state === 'climbUp') {
          const mid = Math.max(p0.y, lip.top - P.lipDrop);
          y = exitK < P.k1 ? p0.y + (mid - p0.y) * smooth(exitK / P.k1) : mid + (lip.top - mid) * smooth((exitK - P.k1) / (P.k2 - P.k1));
          const fwd = smooth((exitK - P.fwd0) / P.fwdSpan);
          const o = Math.sin(Math.PI * Math.min(1, exitK / P.outK)) * 0.12;
          x = p0.x + (end.x - p0.x) * fwd + lip.nx * o;
          z = p0.z + (end.z - p0.z) * fwd + lip.nz * o;
        } else if (exitK >= 0) {
          // the top-out: up and over towards the ladder (a plain eased path; the probe needs the pose, not the route)
          const e = smooth(exitK);
          y += 0.9 * e;
          x += Math.sin(ap.yaw) * 0.5 * e;
          z += Math.cos(ap.yaw) * 0.5 * e;
        }
        rig.root.position.set(x + g.lift.x, y + g.lift.y, z + g.lift.z);
        rig.root.rotation.y = ap.yaw;
        pose.traverse = exitK >= 0 ? 'climbUp' : onLadder ? 'climb' : 'hang';
        // the top-out's clock ends at the climb-up's crouch (attachController: k x CLIMB_UP_CROUCH_K)
        pose.traverseT = exitK >= 0 ? (st.state === 'topOut' ? exitK * CLIMB_UP_CROUCH_K : exitK) : g.cadence();
        pose.lookYaw = 0.3;
        pose.crouch = 0;
        pose.tumble = 0;
        // player.ts's order: the root offsets, the move section, then the tuning window around animate
        tuneRoot(rig.root.position, rig.root.rotation.y);
        moveTuneSelect(MOVE_TUNE_TEAM.group, MOVE_TUNE_TEAM.k, pose.traverse ?? 'none');
        moveTuneRoot(rig.root.position, rig.root.rotation);
        tuneBegin(pose, rig, 0);
        if (k >= 0 && st.body && TUNE_STATE.body !== st.body) throw new Error(`attach probe: ${st.state} played as body ${TUNE_STATE.body}`);
        tuneV2Frame(TUNE_STATE.body, handsWeaponOf(rig), rig.tuneSt ? rig.tuneSt.pick : null);
        tuneKeysFrame();
        moveTuneBegin(pose, rig);
        try {
          rig.animate(DT, pose);
        } finally {
          moveTuneEnd(rig);
          tuneEnd(rig);
        }
        if (k < 0) continue;
        if (rig.graph.playing.trav === null) throw new Error(`attach probe: no traversal clip at ${st.state}`);
        for (let j = 0; j < nodes.length; j++) {
          const m = nodes[j]!.computeWorldMatrix(true).m;
          for (let i = 0; i < 16; i++) out[(k * nodes.length + j) * 16 + i] = m[i]!;
        }
      }
    } finally {
      op.figure.dispose();
      rig.dispose();
    }
    return out;
  };

  const diff = (x: Float64Array, y: Float64Array): number => {
    let d = 0;
    for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(x[i]! - y[i]!));
    return d;
  };
  const random = Math.random;
  let seed = 1;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const once = (st: AttachProbeState): Float64Array => {
    seed = 4242;
    return run(st);
  };
  const sizes: AttachProbeSizes = {};
  setup.on();
  try {
    for (const st of states) {
      tuneResetAll();
      const base = once(st);
      const again = once(st);
      if (diff(base, again) > 1e-9) throw new Error(`attach probe: ${st.state} does not repeat (${diff(base, again)})`);
      const sz: Record<string, number> = {};
      sizes[st.state] = sz;
      for (const r of await attachProbeRows(st)) {
        tuneResetAll();
        if (!tuneSet(r.group, r.id, r.value)) throw new Error(`attach probe: ${r.group} ${r.id} not set`);
        sz[r.key] = diff(once(st), base);
      }
    }
  } finally {
    tuneResetAll();
    setup.off();
    Math.random = random;
    scene.dispose();
  }
  return sizes;
}
