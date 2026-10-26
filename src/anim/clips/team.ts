/**
 * (anim-n4b, track A) Co-op team moves: role B's working body and role A's push in the leg-up (anim-natural PASS2 rows
 * 73, 75-77; AUDIT fix 25). Pure and Babylon-free; the frame step (`TeamPoser.begin`) allocates nothing.
 *
 * Before this the holder was a statue: the brace clip (crouched, hands parked low) with trunk 0 deg through the boost,
 * the throw, the hang-down and the rope, and the climber rose 2 m in ~0.4 s with no push. Now:
 * - leg-up (B `offer` / `assist`, A `boost`): B's cupped hands at knee height; A's foot goes into them (A's lead sole on
 *   the hands, the hips low, the knee up), B loads (hands dip, trunk over them), then drives up with legs and arms timed
 *   with A's rise (B stands, the hands go overhead), A's leg extends off the hands, B follows through and settles;
 * - partner throw (B `throwOffer` / `throwAssist`): half squat with the hands cupped at the waist, turned to the runner,
 *   load, then extend: the hands sweep up over the head with a lean back, then recover standing;
 * - hang-down (B `hangOffer` / `hangHold`): the hands close round A's shins at the ankles; a braced lean back with the
 *   hips back, reaching further over the edge the deeper A hangs;
 * - two-person rope (B `ropeOffer` / `ropeHold`): both hands on the rope (the lead hand toward the lip, the brake hand
 *   at the chest), a braced lean back with the load, a tug on each of the climber's pulls.
 *
 * Visual only: the move's paths, timing, capsule and wire are the game's (`game/teamMoves.ts`, `TEAM`). The holder's
 * phase comes from the state every page already has: on each page the LOCAL player's team clock drives both bodies (the
 * local side publishes it in `TEAM_LINK`; the partner's avatar reads it), so the hands meet on every screen; a partner
 * with no link (the offer, a third player) plays the offer pose. B's pose rides on the brace clip (the hands free, the
 * weapon stowed) through the rig inputs `bend` (trunk), `bendDrop` (pelvis: negative = up, the legs drive), the reach
 * targets (`reachL / R`, world palms) and a visual root offset / turn; A's foot through `plantR`.
 */
import { TEAM } from '../../config/movement';
import { hyp2 } from '../../core/mathx';
import { HANG_HEAD, KIT_SUB, type KitKind } from '../../game/teamMoves';
import type { TraverseKind } from '../animGraph';
import { KIT_POSERS } from './kit/posers';

/** (mission KIT0) + the co-op kit's moves: 'pull' (pull-up, KIT-PULL), 'shutter' (hold shutter / crawl under, KIT-SHUT)
 *  and (coop-kit K0) the five part 2 moves (`KIT_POSE_IDS`). */
export type TeamPoseMove = 'boost' | 'throw' | 'hang' | 'rope' | KitPoseMove;
export type TeamPoseRole = 'a' | 'b';

// (coop-kit K0) the KA slices' pose files (`clips/kit/<move>.ts`) register their role bodies at load (`KIT_POSERS`)
import.meta.glob('./kit/*.ts', { eager: true });

/**
 * (mission KIT0, ids agreed with Player Build) The kit moves' pose ids by move and role: b = the top / holder, a = the
 * partner / climber (as the leg-up, hang-down and rope). Each id is also the team controller's state while it plays
 * (`TeamState`, `game/kit/registry.ts`): holders `<move>Offer` (waiting) then the loaded phases. The holder's body is
 * procedural on the brace clip (TeamPoser: bend / bendDrop / reachL / R / root offset), on the shared team clock `k`
 * (TEAM_LINK) so the hands meet on both screens. Until Player Build's poses land the PLAN 4a placeholders stand in
 * (`KIT_POSE_PLACEHOLDER`): the pull's holder reaches over the edge as the hang-down's offer, the shutter's holder
 * crouches as the leg-up's offer; role A plays the controller's traverse pose.
 */
export const KIT_POSE_IDS = {
  pull: { b: ['pullOffer', 'pullCatch', 'pullHaul'], a: ['pullJump', 'pullHang', 'pullScramble'] },
  shutter: { b: ['shutterOffer', 'shutterLift', 'shutterHold', 'shutterDrop'], a: ['crawlUnder'] },
  // (coop-kit K0) the part 2 moves (PLAN "Part 2 (detailed)"): b the hanger / catcher / offerer / anchor / first end
  deadweight: { b: ['chainGrab', 'chainHang', 'chainDrop'], a: ['grateUnder'] },
  dropCatch: { b: ['catchOffer', 'catchTake'], a: ['dropInto'] },
  chimneyPair: { b: ['chimneyOffer', 'chimneyBrace', 'chimneyClimb', 'chimneyTop'], a: ['chimneyJoin', 'chimneyPush', 'chimneyRise', 'chimneyOut'] },
  swingPass: { b: ['swingOffer', 'swingHold'], a: ['swingRide', 'swingRelease'] },
  plankBridge: { b: ['plankOffer', 'plankLift', 'plankCarry', 'plankDrop', 'plankLay'], a: ['plankJoin', 'plankLiftA', 'plankCarryA', 'plankDropA', 'plankLayA'] },
} as const satisfies Record<KitKind, { readonly b: readonly string[]; readonly a: readonly string[] }>;
export type KitPoseMove = keyof typeof KIT_POSE_IDS;
export type KitPoseId = (typeof KIT_POSE_IDS)[KitPoseMove][TeamPoseRole][number];

/** (KIT0) What stands in for each kit pose until its own lands (PLAN 4a: a team state's pose, a clip or a traverse). */
export const KIT_POSE_PLACEHOLDER: Readonly<Record<KitPoseId, string>> = {
  pullOffer: 'hangOffer',
  pullCatch: 'hangHold',
  pullHaul: 'hangPull',
  pullJump: 'jump',
  pullHang: 'relayUp',
  pullScramble: 'relayUp',
  shutterOffer: 'brace',
  shutterLift: 'brace',
  shutterHold: 'brace',
  shutterDrop: 'brace',
  crawlUnder: 'crouchWalk',
  // (coop-kit K0) the part 2 placeholders (PLAN Design per move; 'ladderClimb' is the traverse 'climb')
  chainGrab: 'jump',
  chainHang: 'hang',
  chainDrop: 'drop',
  grateUnder: 'crouchWalk',
  catchOffer: 'brace',
  catchTake: 'brace',
  dropInto: 'drop',
  chimneyOffer: 'brace',
  chimneyBrace: 'brace',
  chimneyClimb: 'climb',
  chimneyTop: 'climbUp',
  chimneyJoin: 'brace',
  chimneyPush: 'brace',
  chimneyRise: 'climb',
  chimneyOut: 'climbUp',
  swingOffer: 'hangOffer',
  swingHold: 'hangOffer',
  swingRide: 'vault',
  swingRelease: 'vault',
  plankOffer: 'brace',
  plankLift: 'brace',
  plankCarry: 'walk',
  plankDrop: 'brace',
  plankLay: 'brace',
  plankJoin: 'brace',
  plankLiftA: 'brace',
  plankCarryA: 'walk',
  plankDropA: 'brace',
  plankLayA: 'brace',
};

/**
 * (coop-kit K0) Role B's placeholder body per part 2 move until its KA pose file registers one (`KIT_POSERS`): 'brace'
 * = the leg-up's crouched offer (`boostB`), 'hangOffer' = the hang-down holder's reach over the edge (`hangB`), or a
 * traverse kind the body plays instead (no B body: the deadweight hanger hangs as from a ledge). Per move and role, not
 * per state: the wire carries only the move's sub bit and the role (the mode). Starting choices (prototype).
 */
export const KIT_B_PLACEHOLDER: Readonly<Record<Exclude<KitPoseMove, 'pull' | 'shutter'>, 'brace' | 'hangOffer' | TraverseKind>> = {
  deadweight: 'hang',
  dropCatch: 'brace',
  chimneyPair: 'brace',
  swingPass: 'hangOffer',
  plankBridge: 'brace',
};

/** (coop-kit K0) A move's role B placeholder ('' = not a part 2 kit move). No allocation. */
export function kitBPlaceholder(move: string): 'brace' | 'hangOffer' | TraverseKind | '' {
  return (KIT_B_PLACEHOLDER as Readonly<Record<string, 'brace' | 'hangOffer' | TraverseKind | undefined>>)[move] ?? '';
}

/** (coop-kit K0) The traverse a part 2 move's role B body plays instead of a B body (null = a B body: 'brace' /
 *  'hangOffer', a registered poser, or not a part 2 move). */
export function kitBTraverse(move: string): TraverseKind | null {
  const ph = kitBPlaceholder(move);
  if (ph === '' || ph === 'brace' || ph === 'hangOffer') return null;
  return KIT_POSERS.has(move as KitPoseMove) ? null : ph;
}

/** (KIT0) A kit pose id -> its move and role. */
export const KIT_POSE_OF: ReadonlyMap<string, { readonly move: KitPoseMove; readonly role: TeamPoseRole; readonly id: KitPoseId }> = (() => {
  const m = new Map<string, { move: KitPoseMove; role: TeamPoseRole; id: KitPoseId }>();
  for (const move of Object.keys(KIT_POSE_IDS) as KitPoseMove[]) {
    for (const role of ['b', 'a'] as const) for (const id of KIT_POSE_IDS[move][role]) m.set(id, { move, role, id });
  }
  return m;
})();

export function isKitPoseId(s: string): s is KitPoseId {
  return KIT_POSE_OF.has(s);
}

/**
 * (KIT0) The local team controller's kit move clock and shutter gap: the controller writes them every fixed step while
 * a kit move plays (`k` < 0 offering, 0..1 a timed phase, 1 a held one; `gap` the shutter's opening under its edge, m,
 * NaN = none); `teamPoseOfState` reads them for the kit states.
 */
export const KIT_POSE_LOCAL = { k: -1, gap: NaN };

/** What one rig's team pose needs this frame (world; NaN = unknown). */
export interface TeamPoseIn {
  /** '' = no team pose. */
  move: TeamPoseMove | '';
  role: TeamPoseRole | '';
  /** Leg-up / throw: 0..1 of the move (past 1: settling); < 0 offering (waiting). Hang-down / rope (B): >= 0 the partner
   *  is on (hanging / climbing), < 0 offering. */
  k: number;
  /** The partner's feet (rig root) and facing. */
  px: number;
  py: number;
  pz: number;
  pyaw: number;
  /** Hang-down: the hanging head's depth under the edge (m, the holder's `MoveState.s`). */
  depth: number;
  /** Rope: the lip the rope goes over (world). */
  lx: number;
  ly: number;
  lz: number;
  /** (KIT0) Shutter: the opening's height under the shutter's edge (m; the holder's `MoveState.s`); NaN = unknown. */
  gap: number;
}

export function newTeamPoseIn(): TeamPoseIn {
  return { move: '', role: '', k: -1, px: NaN, py: NaN, pz: NaN, pyaw: NaN, depth: TEAM.hangStart, lx: NaN, ly: NaN, lz: NaN, gap: NaN };
}

/** The local player's team pose input: GameState writes it every frame from the team controller, `Player` poses its
 *  rig from it (as `MOVE_TUNE_TEAM`). */
export const TEAM_POSE_LOCAL: TeamPoseIn = newTeamPoseIn();

export function clearTeamPoseIn(i: TeamPoseIn): TeamPoseIn {
  i.move = '';
  i.role = '';
  i.k = -1;
  i.px = i.py = i.pz = i.pyaw = NaN;
  i.depth = TEAM.hangStart;
  i.lx = i.ly = i.lz = NaN;
  i.gap = NaN;
  return i;
}

/** Role B's body at a phase, in B's own frame at 1.75 m (x right, y up from the feet, z forward), before the eased weight. */
export interface TeamBPose {
  /** Spine forward (+) / back (-), rad (`RigPose.bend`). */
  bend: number;
  /** Pelvis up from the brace clip's crouch, m (`RigPose.bendDrop`, kept <= 0: -0.22 = standing; a positive drop is
   *  the close-quarters bend's, which also starts its gait layer). */
  drop: number;
  /** Pelvis sideways, m (`RigPose.sway`). */
  sway: number;
  /** Visual root back along the facing (m): the hips back in a braced lean. */
  back: number;
  /** The hands' weight on the targets below. */
  handW: number;
  lx: number;
  ly: number;
  lz: number;
  rx: number;
  ry: number;
  rz: number;
  /** The hands close round an axis (the rope, A's shins): its direction (B frame, unit) and radius; rad 0 = none. */
  ax: number;
  ay: number;
  az: number;
  rad: number;
}

export function newTeamBPose(): TeamBPose {
  return { bend: 0, drop: 0, sway: 0, back: 0, handW: 0, lx: 0, ly: 0, lz: 0, rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, rad: 0 };
}

// ---- keyed curves (k, v pairs; smoothstep between keys; held past the ends) ----

function smooth(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

/** A keyed curve at `k`: `c` = [k0, v0, k1, v1, ...] with rising k; smoothstep between keys. */
export function curve(c: readonly number[], k: number): number {
  if (k <= c[0]!) return c[1]!;
  const n = c.length;
  for (let i = 2; i < n; i += 2) {
    const k1 = c[i]!;
    if (k <= k1) {
      const k0 = c[i - 2]!;
      const v0 = c[i - 1]!;
      return v0 + (c[i + 1]! - v0) * smooth((k - k0) / (k1 - k0 || 1));
    }
  }
  return c[n - 1]!;
}

/**
 * The leg-up, over k = t / `TEAM.boostTime` (the game's boost: A steps in to the hands by 0.35, then the toss):
 * ready (0-0.2), A's foot in and the load (0.2-0.33: hands dip, trunk over them, pelvis sinks), the drive (0.33-0.62:
 * B stands, the hands rise to the face with A's rise), the follow-through (0.62-0.74: hands overhead, A's foot off),
 * the settle back to the crouch (0.74-1).
 */
export const BOOST_B = {
  handY: [0, 0.55, 0.2, 0.52, 0.33, 0.45, 0.62, 1.5, 0.74, 1.85, 0.92, 1.05, 1, 0.75],
  handZ: [0, 0.36, 0.33, 0.34, 0.62, 0.24, 0.74, 0.14, 1, 0.3],
  bend: [0, 0.22, 0.2, 0.28, 0.33, 0.4, 0.62, -0.12, 0.74, -0.18, 1, 0],
  drop: [0, -0.05, 0.2, -0.04, 0.33, 0, 0.62, -0.2, 0.74, -0.2, 1, 0],
  handW: [0, 1, 0.74, 1, 0.95, 0],
} as const;

/**
 * Role A in the leg-up: the lead foot's weight on B's cupped hands (`plantR`), the hips held low under the path
 * (`lift`: the sole over the hips' root, m: the knee drives the body up off the hands) and the body drawn in front of
 * B's hands (`pull`), over the same k. A leaves the hands at ~0.7, just before B's follow-through tops out.
 */
export const BOOST_A = {
  foot: [0.1, 0, 0.24, 1, 0.62, 1, 0.76, 0],
  lift: [0.2, 0.5, 0.35, 0.42, 0.62, 0.05],
  pull: [0.1, 0, 0.24, 1, 0.45, 1, 0.7, 0],
} as const;

/** The partner throw over k = t / `TEAM.throwTime` (A passes over B at ~0.3): load (0-0.1), extend (0.1-0.28: B stands
 *  and leans back, the hands sweep over the head), follow-through (to 0.42), recover standing (to 0.8). */
export const THROW_B = {
  handY: [0, 0.62, 0.1, 0.55, 0.28, 1.95, 0.42, 2.0, 0.7, 1.05],
  handZ: [0, 0.42, 0.1, 0.4, 0.28, 0.05, 0.42, -0.02, 0.7, 0.2],
  bend: [0, 0.25, 0.1, 0.32, 0.28, -0.22, 0.42, -0.26, 0.8, 0],
  drop: [0, -0.06, 0.1, 0, 0.28, -0.22, 0.8, -0.22],
  handW: [0, 1, 0.42, 1, 0.7, 0],
} as const;

/** The hanging partner's ankles over the rig root, turned over (m at 1.75: the rig turns the feet about the hip pivot,
 *  the head lands `HANG_HEAD` under the root, the ankles twice the pivot less the ankle height over it). */
export const HANG_ANKLE = 1.05;

const HAND_HALF = 0.06;

function setHands(o: TeamBPose, y: number, z: number, half: number): void {
  o.lx = -half;
  o.rx = half;
  o.ly = o.ry = y;
  o.lz = o.rz = z;
  o.ax = o.ay = o.az = o.rad = 0;
}

/** The leg-up's role B at `k` (< 0: offering, `t` s into the offer for the breath). */
export function boostB(k: number, t: number, o: TeamBPose): TeamBPose {
  const kk = Math.max(0, k);
  o.bend = curve(BOOST_B.bend, kk);
  o.drop = curve(BOOST_B.drop, kk);
  o.handW = curve(BOOST_B.handW, kk);
  o.sway = 0;
  o.back = 0;
  setHands(o, curve(BOOST_B.handY, kk), curve(BOOST_B.handZ, kk), HAND_HALF);
  if (k < 0) {
    // waiting: a slow breath in the trunk and the hands
    const b = Math.sin(t * 1.9);
    o.bend += 0.03 * b;
    o.ly = o.ry = o.ly + 0.015 * b;
  }
  return o;
}

/** The throw's role B at `k` (< 0: offering). */
export function throwB(k: number, t: number, o: TeamBPose): TeamBPose {
  const kk = Math.max(0, k);
  o.bend = k < 0 ? 0.2 : curve(THROW_B.bend, kk);
  o.drop = k < 0 ? -0.08 : curve(THROW_B.drop, kk);
  o.handW = curve(THROW_B.handW, kk);
  o.sway = 0;
  o.back = 0;
  setHands(o, curve(THROW_B.handY, kk), curve(THROW_B.handZ, kk), HAND_HALF);
  if (k < 0) {
    const b = Math.sin(t * 1.9);
    o.bend += 0.03 * b;
    o.ly = o.ry = o.ly + 0.015 * b;
  }
  return o;
}

/** The hanging partner's ankles over the holder's feet (m, B frame up) at the head's `depth` under the edge (the edge
 *  is the holder's floor), for a body `h` m tall. */
export function hangAnkleUp(depth: number, h = 1.75): number {
  return -depth + HANG_HEAD * (h / 1.75) + HANG_ANKLE * (h / 1.75);
}

/**
 * The hang-down's role B: `on` (the partner lowered / hanging) with the ankles at (`f` forward, `u` up, `s` right) in B's
 * frame, else the offer; `t` the holder's clock (the strain). The hands on the shins at the ankles, closed round them
 * (the shins plumb, upside down); a braced lean back, bent further over the edge the lower the ankles.
 */
export function hangB(on: boolean, f: number, u: number, s: number, t: number, o: TeamBPose): TeamBPose {
  o.handW = 1;
  if (!on) {
    o.bend = 0.2 + 0.03 * Math.sin(t * 1.9);
    o.drop = 0;
    o.sway = 0;
    o.back = 0;
    setHands(o, 0.5, 0.42, 0.1);
    return o;
  }
  o.bend = Math.max(-0.25, Math.min(0.55, -0.22 + (0.55 - u) * 0.45)) + 0.025 * Math.sin(t * 2.3);
  o.drop = 0;
  o.sway = 0.012 * Math.sin(t * 1.7);
  o.back = 0.1;
  o.lx = s - 0.09;
  o.rx = s + 0.09;
  o.ly = o.ry = u;
  o.lz = o.rz = f;
  o.ax = 0;
  o.ay = 1;
  o.az = 0;
  o.rad = 0.045;
  return o;
}

/** The rope's line from the holder's hands (B frame) when the lip is unknown: down and out over the edge. */
const ROPE_DIR = { y: -0.85, z: 0.53 };
/** The rope through the holder's hands (B frame at 1.75, before `back`). */
export const ROPE_GRIP = { y: 0.72, z: 0.4 } as const;

/**
 * The rope's role B: `load` 0..1 (the climber's weight on it), `tug` -1..1 (the climber's pull now), the rope's
 * direction from the hands toward the lip (B frame; 0 = the default). Both hands on the rope (lead toward the lip, the
 * brake hand back at the chest), closed round it; leaning back with the load, the hips back.
 */
export function ropeB(load: number, tug: number, dy: number, dz: number, o: TeamBPose): TeamBPose {
  let y = dy;
  let z = dz;
  const n = hyp2(y, z);
  if (n < 1e-3) {
    y = ROPE_DIR.y;
    z = ROPE_DIR.z;
  } else {
    y /= n;
    z /= n;
  }
  const pull = 0.04 * tug * load;
  o.bend = 0.15 - 0.4 * load + 0.06 * tug * load;
  o.drop = 0;
  o.sway = 0;
  o.back = 0.08 * load;
  o.handW = 1;
  // lead hand (right) down the rope, the brake hand (left) up it toward the chest; the tug draws both in
  o.rx = 0.03;
  o.ry = ROPE_GRIP.y + y * 0.12 - pull * y;
  o.rz = ROPE_GRIP.z + z * 0.12 - pull * z;
  o.lx = -0.03;
  o.ly = ROPE_GRIP.y - y * 0.22 - pull * y;
  o.lz = ROPE_GRIP.z - z * 0.22 - pull * z;
  o.ax = 0;
  o.ay = y;
  o.az = z;
  o.rad = 0.018;
  return o;
}

/** The rope's top end at the holder's hands (world) from the holder's feet and facing, `load` as `ropeB` (the rope line
 *  draws from here). */
export function ropeGripWorld(x: number, y: number, z: number, yaw: number, load: number, h: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const k = h / 1.75;
  const f = ROPE_GRIP.z * k - 0.08 * load;
  out.x = x + Math.sin(yaw) * f;
  out.y = y + ROPE_GRIP.y * k;
  out.z = z + Math.cos(yaw) * f;
  return out;
}

// ---- the team controller's states -> the pose input (the local player) ----

/**
 * A team-controller state and its clock (`TeamController.partT`) -> move / role / k (into `out`; '' = no team pose).
 * The partner fields are left as they are.
 */
export function teamPoseOfState(state: string, t: number, out: TeamPoseIn): TeamPoseIn {
  let move: TeamPoseMove | '' = '';
  let role: TeamPoseRole | '' = '';
  let k = -1;
  let gap = NaN;
  switch (state) {
    case 'offer':
      move = 'boost';
      role = 'b';
      break;
    case 'assist':
      move = 'boost';
      role = 'b';
      k = t / TEAM.boostTime;
      break;
    case 'boost':
      move = 'boost';
      role = 'a';
      k = t / TEAM.boostTime;
      break;
    case 'throwOffer':
      move = 'throw';
      role = 'b';
      break;
    case 'throwAssist':
      move = 'throw';
      role = 'b';
      k = t / TEAM.throwTime;
      break;
    case 'throw':
      move = 'throw';
      role = 'a';
      k = t / TEAM.throwTime;
      break;
    case 'hangOffer':
      move = 'hang';
      role = 'b';
      break;
    case 'hangHold':
      move = 'hang';
      role = 'b';
      k = 1;
      break;
    case 'hangDown':
    case 'hanging':
      move = 'hang';
      role = 'a';
      k = 1;
      break;
    case 'ropeOffer':
      move = 'rope';
      role = 'b';
      break;
    case 'ropeHold':
      move = 'rope';
      role = 'b';
      k = 1;
      break;
    case 'ropeClimb':
      move = 'rope';
      role = 'a';
      k = 1;
      break;
    default: {
      // (KIT0) a kit move's state is its pose id; its clock and gap from the controller (`KIT_POSE_LOCAL`)
      const kp = KIT_POSE_OF.get(state);
      if (kp) {
        move = kp.move;
        role = kp.role;
        k = KIT_POSE_LOCAL.k;
        gap = KIT_POSE_LOCAL.gap;
      }
    }
  }
  out.move = move;
  out.role = role;
  out.k = k;
  out.gap = gap;
  return out;
}

/**
 * The local player's side of a team move, for the partner's avatar on this page (GameState writes it every frame from
 * the team controller; `RemoteAvatar` reads it when the partner's `MoveState.tid` / our partner match). Nothing goes on
 * the wire. `linger` keeps a leg-up / throw clock running a moment after it ends on this page (the partner's avatar is
 * drawn a little in the past: its move ends later).
 */
export const TEAM_LINK = { partner: '', move: '' as TeamPoseMove | '', role: '' as TeamPoseRole | '', k: -1, x: 0, y: 0, z: 0, yaw: 0, depth: TEAM.hangStart as number, lx: NaN, ly: NaN, lz: NaN, gap: NaN, linger: 0 };

const LINGER = 0.5;

/** Every frame on the local page: the team pose input `i` (already filled by `teamPoseOfState`) and the partner id into
 *  the link, with our feet / facing. No allocation. */
export function teamLinkFrame(dt: number, partner: string, i: TeamPoseIn, x: number, y: number, z: number, yaw: number): void {
  const L = TEAM_LINK;
  L.x = x;
  L.y = y;
  L.z = z;
  L.yaw = yaw;
  if (i.move !== '' && partner !== '') {
    L.partner = partner;
    L.move = i.move;
    L.role = i.role;
    L.k = i.k;
    L.depth = i.depth;
    L.lx = i.lx;
    L.ly = i.ly;
    L.lz = i.lz;
    L.gap = i.gap;
    L.linger = LINGER;
    return;
  }
  if (L.linger > 0 && (L.move === 'boost' || L.move === 'throw') && L.k >= 0) {
    L.linger -= dt;
    L.k += dt / (L.move === 'boost' ? TEAM.boostTime : TEAM.throwTime);
    return;
  }
  L.partner = '';
  L.move = '';
  L.role = '';
  L.k = -1;
  L.gap = NaN;
  L.linger = 0;
}

/** The ROPE / HANG / THROW sub bits of the `brace` and `boost` wire modes (game/teamMoves: THROW_SUB 1, HANG_SUB 2, ROPE_SUB 4;
 *  the kit's bits, KIT0 PULL_SUB 8, SHUTTER_SUB 16 and the part 2 moves', come from `KIT_SUB` through `KIT_SUB_MOVES`). */
const SUB_THROW = 1;
const SUB_HANG = 2;
const SUB_ROPE = 4;

/**
 * (coop-kit K0) The wire bit table: each kit move's sub bit (`KIT_SUB`), highest bit first (so the shutter, 16, wins
 * over the pull-up, 8, as before). `kitMoveOfSub` reads it; both roles use it.
 */
export const KIT_SUB_MOVES: readonly { readonly bit: number; readonly move: KitPoseMove }[] = (Object.keys(KIT_POSE_IDS) as KitPoseMove[])
  .map((move) => ({ bit: KIT_SUB[move], move }))
  .sort((p, q) => q.bit - p.bit);
/** Every kit move's sub bit (OR). */
const SUB_KIT = KIT_SUB_MOVES.reduce((m, p) => m | p.bit, 0);

/** (coop-kit K0) The kit move a wire sub names ('' none): the highest kit bit set. No allocation. */
export function kitMoveOfSub(sub: number): KitPoseMove | '' {
  if ((sub & SUB_KIT) === 0) return '';
  for (let i = 0; i < KIT_SUB_MOVES.length; i++) if (sub & KIT_SUB_MOVES[i]!.bit) return KIT_SUB_MOVES[i]!.move;
  return '';
}

/**
 * The partner's avatar (a remote player, posed from its `MoveState`): its team pose from its wire mode / sub / `s`
 * and `ph`, and (when it is our partner) our side from `TEAM_LINK`. `id` the avatar's player id. No allocation.
 */
export function teamPoseOfWire(mode: string, sub: number, s: number, ph: number, id: string, out: TeamPoseIn): TeamPoseIn {
  clearTeamPoseIn(out);
  const L = TEAM_LINK;
  const linked = L.partner === id && L.move !== '';
  if (mode === 'brace') {
    out.role = 'b';
    // (coop-kit K0) any kit bit names its move by the bit table (the shutter and pull-up as before)
    const kit = kitMoveOfSub(sub);
    out.move = kit !== '' ? kit : sub & SUB_ROPE ? 'rope' : sub & SUB_HANG ? 'hang' : sub & SUB_THROW ? 'throw' : 'boost';
    if (out.move === 'hang') out.depth = s > 0 ? s : TEAM.hangStart;
    else if (out.move === 'shutter') out.gap = s > 0 ? s : NaN;
    if (linked && L.move === out.move && L.role === 'a') {
      out.k = L.k;
      out.px = L.x;
      out.py = L.y;
      out.pz = L.z;
      out.pyaw = L.yaw;
      out.lx = L.lx;
      out.ly = L.ly;
      out.lz = L.lz;
    }
    return out;
  }
  if (mode === 'boost' && sub & SUB_KIT) {
    // (mission NET) a kit move's partner (pull-up: jumping / hauled / scrambling; shutter: crawling): role A of its own
    // move, never the leg-up's (its body is the controller's traverse pose; the holder's side links from TEAM_LINK).
    // (coop-kit K0) any kit bit, by the bit table
    out.role = 'a';
    out.move = kitMoveOfSub(sub) as KitPoseMove;
    out.k = ph;
    if (linked && L.move === out.move && L.role === 'b') {
      if (L.k >= 0) out.k = L.k;
      out.px = L.x;
      out.py = L.y;
      out.pz = L.z;
      out.pyaw = L.yaw;
      out.gap = L.gap;
    }
    return out;
  }
  if (mode === 'boost' && sub === 0) {
    out.role = 'a';
    out.move = 'boost';
    out.k = ph;
    if (linked && L.move === 'boost' && L.role === 'b') {
      if (L.k >= 0) out.k = L.k;
      out.px = L.x;
      out.py = L.y;
      out.pz = L.z;
      out.pyaw = L.yaw;
    }
    return out;
  }
  return out;
}

// ---- the frame step: one per rig ----

/** The rig fields the team pose writes (a CharacterRig, loosely typed). */
interface Target {
  x: number;
  y: number;
  z: number;
  w: number;
  ax?: number;
  ay?: number;
  az?: number;
  rad?: number;
  hook?: number;
  cx?: number;
  cy?: number;
  cz?: number;
}
export interface TeamRigIn {
  reachL: Target;
  reachR: Target;
  plantR: Target;
  root: { position: { x: number; y: number; z: number }; rotation: { y: number } };
  height: number;
}
/** The RigPose fields the team pose writes. */
export interface TeamRigPose {
  traverse?: TraverseKind;
  bend?: number;
  bendDrop?: number;
  sway?: number;
}

const BLEND = 0.2;
/** The pelvis raise that stands the brace clip up (its crouch: `pelY` -0.22). */
export const STAND_DROP = -0.22;
/** The thrower / booster turns to the partner (visual) at most this fast (rad/s), only this early in the move. */
const FACE_RATE = 7;
const FACE_K = 0.3;

function wrapPi(a: number): number {
  return a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2));
}

/**
 * One rig's team pose, eased in and out (`BLEND` s each way). `begin` before `rig.animate` (after the root is placed and
 * the pose filled), `end` after it (the reach / plant weights it set back to 0). No allocation.
 */
export class TeamPoser {
  /** The eased weight 0..1 and the pose last shown (eased out from it). */
  w = 0;
  readonly b = newTeamBPose();
  private move: TeamPoseMove | '' = '';
  private role: TeamPoseRole | '' = '';
  private t = 0;
  /** The visual turn to the partner (rad), the leg-up / throw only. */
  private yawOff = 0;
  /** A's push: the visual root offset (world) and the foot on the hands (world, weight). */
  private ax = 0;
  private ay = 0;
  private az = 0;
  private fx = 0;
  private fy = 0;
  private fz = 0;
  private fw = 0;
  /** (role A) The booster's facing as its own pose turns it (to us, early in the move; held): its hands' frame. */
  private bFace = NaN;
  private hands = false;
  private foot = false;

  /**
   * (N4b train-8 fix) A jump (the Anim Studio's paused scrub): the weight straight to where `i` wants it (1 on, 0 off),
   * no ease. Paused, `begin` runs at dt 0 and the ease never moves, so a scrubbed pair kept the weight it was paused at
   * (role B's working body a third in at every phase, or still on past the move's end).
   */
  jump(i: TeamPoseIn): void {
    this.w = i.move !== '' && i.role !== '' ? 1 : 0;
  }

  begin(dt: number, i: TeamPoseIn, p: TeamRigPose, rig: TeamRigIn): void {
    this.hands = false;
    this.foot = false;
    const on = i.move !== '' && i.role !== '';
    if (on && (i.move !== this.move || i.role !== this.role)) {
      if (this.w <= 0.01) this.t = 0;
      this.bFace = NaN;
      this.move = i.move;
      this.role = i.role;
    }
    this.w = on ? Math.min(1, this.w + dt / BLEND) : Math.max(0, this.w - dt / BLEND);
    if (this.w <= 0) {
      this.move = '';
      this.role = '';
      this.yawOff = 0;
      return;
    }
    this.t += dt;
    const root = rig.root;
    const hk = rig.height / 1.75;
    if (this.role === 'b') {
      // (coop-kit K0) a part 2 kit move whose placeholder is a traverse (the deadweight hanger hangs as from a ledge):
      // the body plays it, no B body
      const trav = kitBTraverse(this.move);
      if (trav !== null) {
        if (on) p.traverse = trav;
        return;
      }
      // (off: the last pose eases out, its turn with it)
      if (on) this.poseB(dt, i, root.position.x, root.position.y, root.position.z, root.rotation.y, hk);
      this.applyB(p, rig, hk);
    } else if (this.role === 'a' && this.move === 'boost') {
      if (on) this.poseA(i, root.position.x, root.position.y, root.position.z, root.rotation.y, hk);
      this.applyA(rig);
    }
  }

  /** Role B's pose this frame (B frame), the turn to the partner eased. */
  private poseB(dt: number, i: TeamPoseIn, x: number, y: number, z: number, yaw: number, hk: number): void {
    const o = this.b;
    const known = Number.isFinite(i.px) && Number.isFinite(i.pz);
    let face = 0;
    // (coop-kit K0) a kit move's own body when its pose file registered one (`KIT_POSERS`), else its placeholder below
    const kp = KIT_POSERS.size > 0 ? KIT_POSERS.get(i.move as KitPoseMove) : undefined;
    if (kp) {
      kp.b(i, this.t, o);
    } else if (i.move === 'boost' || i.move === 'throw') {
      if (i.move === 'boost') boostB(i.k, this.t, o);
      else throwB(i.k, this.t, o);
      // turned to the partner early in the move (they come in from any side); held, then back as it settles
      if (known && i.k >= 0 && i.k < FACE_K && hyp2(i.px - x, i.pz - z) > 0.35) face = wrapPi(Math.atan2(i.px - x, i.pz - z) - yaw);
      else face = i.k >= 0 && i.k < 0.85 ? this.yawOff : 0;
    } else if (i.move === 'shutter' || kitBPlaceholder(i.move) === 'brace') {
      // (KIT0 placeholder, PLAN 4a "brace") the leg-up's crouched offer until Player Build's shutter poses land
      // ((coop-kit K0) and a part 2 move's 'brace' placeholder)
      boostB(-1, this.t, o);
    } else if (i.move === 'hang' || i.move === 'pull' || kitBPlaceholder(i.move) === 'hangOffer') {
      // (KIT0 placeholder, PLAN 4a "hangOffer") the pull-up's holder reaches over the edge as the hang-down's offer
      // ((coop-kit K0) and a part 2 move's 'hangOffer' placeholder: never `holding`, which is the hang-down's)
      const holding = i.move === 'hang' && i.k >= 0;
      let f = 0.85;
      let s = 0;
      let u = hangAnkleUp(i.depth, 1.75 * hk) / hk;
      if (holding && known) {
        // the ankles over the partner's root, a little toward us (the shins face the holder), in our frame
        const dx = i.px - x;
        const dz = i.pz - z;
        const sy = Math.sin(yaw);
        const cy = Math.cos(yaw);
        f = (dx * sy + dz * cy) / hk - 0.08;
        s = (dx * cy - dz * sy) / hk;
        if (Number.isFinite(i.py)) u = (i.py - y) / hk + HANG_ANKLE;
      }
      hangB(holding, f, u, s, this.t, o);
      // (the ankles are A's, not the body's: the hips' step back does not take the hands with it)
      if (holding) {
        o.lz += o.back;
        o.rz += o.back;
      }
    } else {
      // the rope: toward the lip when known; the climber's pull from its height on the rope (0.7 m a hand-over-hand)
      let dy = 0;
      let dz = 0;
      if (Number.isFinite(i.lx) && Number.isFinite(i.ly) && Number.isFinite(i.lz)) {
        const sy = Math.sin(yaw);
        const cy = Math.cos(yaw);
        dz = (i.lx - x) * sy + (i.lz - z) * cy - ROPE_GRIP.z * hk;
        dy = i.ly - y - ROPE_GRIP.y * hk;
        if (dz < 0.05) dz = 0.05;
      }
      const climbing = i.k >= 0;
      const tug = climbing && Number.isFinite(i.py) ? Math.sin(((i.py - y) / 0.7) * Math.PI * 2) : 0;
      ropeB(climbing ? 1 : 0.25, tug, dy, dz, o);
    }
    const d = wrapPi(face - this.yawOff);
    const st = FACE_RATE * dt;
    this.yawOff += Math.abs(d) <= st ? d : Math.sign(d) * st;
  }

  private applyB(p: TeamRigPose, rig: TeamRigIn, hk: number): void {
    const o = this.b;
    const w = this.w;
    const root = rig.root;
    // the brace clip under it: the hands free, the weapon stowed, the crouch the clip's (the drop takes it up / down)
    // (the thrower stands before and after: the brace clip's crouch taken up by STAND_DROP, so it eases in and out
    // from standing; the others offer crouched, as the brace clip)
    p.traverse = 'brace';
    const base = this.move === 'throw' ? STAND_DROP : 0;
    p.bend = (p.bend ?? 0) + o.bend * w;
    p.bendDrop = (p.bendDrop ?? 0) + (base + (o.drop - base) * w) * hk;
    p.sway = (p.sway ?? 0) + o.sway * w * hk;
    const yaw = root.rotation.y + this.yawOff * w;
    root.rotation.y = yaw;
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const back = o.back * w * hk;
    root.position.x -= sy * back;
    root.position.z -= cy * back;
    const hw = o.handW * w;
    if (hw <= 0) return;
    const x = root.position.x;
    const y = root.position.y;
    const z = root.position.z;
    this.hands = true;
    this.hand(rig.reachL, x, y, z, sy, cy, o.lx * hk, o.ly * hk, o.lz * hk, hw);
    this.hand(rig.reachR, x, y, z, sy, cy, o.rx * hk, o.ry * hk, o.rz * hk, hw);
    if (o.rad > 0) {
      const ax = cy * o.ax + sy * o.az;
      const az = -sy * o.ax + cy * o.az;
      const l = rig.reachL;
      const r = rig.reachR;
      l.ax = r.ax = ax;
      l.ay = r.ay = o.ay;
      l.az = r.az = az;
      l.rad = r.rad = o.rad;
    }
  }

  private hand(t: Target, x: number, y: number, z: number, sy: number, cy: number, r: number, u: number, f: number, w: number): void {
    t.ax = t.ay = t.az = t.rad = t.hook = 0;
    t.cx = t.cy = t.cz = undefined;
    t.x = x + cy * r + sy * f;
    t.y = y + u;
    t.z = z - sy * r + cy * f;
    t.w = w;
  }

  /**
   * Role A in the leg-up: B's cupped hands (B's leg-up pose at the same k, from B's feet and facing) take A's lead
   * foot; A's hips stay low under the path with the knee up, then the leg drives the body up off the hands.
   */
  private poseA(i: TeamPoseIn, x: number, y: number, z: number, yaw: number, hk: number): void {
    this.fw = 0;
    this.ax = this.ay = this.az = 0;
    if (!Number.isFinite(i.px) || !Number.isFinite(i.py) || !Number.isFinite(i.pz) || !Number.isFinite(i.pyaw) || i.k < 0) return;
    const k = i.k;
    const fw = curve(BOOST_A.foot, k);
    const pw = curve(BOOST_A.pull, k);
    if (fw <= 0 && pw <= 0) return;
    // B's hands at this k, in B's frame as B's own pose turns it: to us early in the move (from our game position, as
    // B sees it), then held (B's turn is rate-limited: a 90 deg turn lands by ~0.25, as the foot goes in)
    if (k < FACE_K && hyp2(x - i.px, z - i.pz) > 0.35) this.bFace = Math.atan2(x - i.px, z - i.pz);
    const by = Number.isFinite(this.bFace) ? this.bFace : i.pyaw;
    const o = boostB(k, 0, this.b);
    const sb = Math.sin(by);
    const cb = Math.cos(by);
    const hx = i.px + sb * o.lz * hk;
    const hy = i.py + o.ly * hk;
    const hz = i.pz + cb * o.lz * hk;
    this.fx = hx;
    this.fy = hy + 0.03 * hk;
    this.fz = hz;
    this.fw = fw;
    // the hips: behind the foot along A's facing, as low as the knee drive wants (never above the path)
    const sa = Math.sin(yaw);
    const ca = Math.cos(yaw);
    const wantX = hx - sa * 0.22 * hk;
    const wantZ = hz - ca * 0.22 * hk;
    const wantY = Math.min(y, hy - curve(BOOST_A.lift, k) * hk);
    this.ax = (wantX - x) * pw;
    this.az = (wantZ - z) * pw;
    this.ay = (wantY - y) * fw;
  }

  private applyA(rig: TeamRigIn): void {
    const w = this.w;
    const rp = rig.root.position;
    rp.x += this.ax * w;
    rp.y += this.ay * w;
    rp.z += this.az * w;
    const fw = this.fw * w;
    if (fw <= 0) return;
    const t = rig.plantR;
    t.x = this.fx;
    t.y = this.fy;
    t.z = this.fz;
    t.w = fw;
    this.foot = true;
  }

  /** After `rig.animate`: the reach / plant weights this pose set back to 0 (the next frame sets them again). */
  end(rig: TeamRigIn): void {
    if (this.hands) {
      rig.reachL.w = 0;
      rig.reachR.w = 0;
      this.hands = false;
    }
    if (this.foot) {
      rig.plantR.w = 0;
      this.foot = false;
    }
  }

  /** The B pose's root turn now (rad; tests). */
  get turn(): number {
    return this.yawOff;
  }
}
