/**
 * (anim-studio-2) Move tuning: the co-op team moves (one registry section per move: role A, role B and the contact
 * between the two) and the traversal moves the Body section has no state group for (vault, mantle, climb-up, window,
 * rappel ...). Pure, Babylon-free; the frame steps allocate nothing.
 *
 * What a group's sliders do (all identity at their defaults, so nothing changes until one moves):
 * - the body: a visual root offset forward / up / sideways and a yaw (`moveTuneRoot`), a whole-body lean (added to the
 *   pose's tumble) and a crouch depth offset (`moveTuneBegin`);
 * - the hands and feet: the world grip targets shifted in the body frame (only where the pose has world grips: a lip,
 *   a rung, the rope);
 * - timing (`time`, one-shot moves only): the pose's clock (`traverseT`) runs that much faster, clamped at its end;
 * - contact (the move's `contact` group): the climber (role A) moved in its own frame while the two bodies touch (the
 *   foot in the cupped hands, the climb up the hanging body, the hands on the ankles), weighted by the move's contact
 *   window (`teamContactK`).
 *
 * Live in real play for the local player's OWN role only (GameState writes `MOVE_TUNE_TEAM` from the team controller;
 * the traversal groups follow the local pose). The remote partner (`net/remoteAvatar`) never reads the live values: it
 * plays the base table (an export folded into the code, `moveTuneSelectBase`, pose-parity). Visual only: the capsule, the team-move paths and the wire
 * are unchanged. The Test Chamber poses both roles of a pair with the same calls (`chamberPairs.ts`).
 */
import '../player/speedTune'; // Body, Gun, Camera and Speed register first (the panel's section order)
import './tuneKeys'; // then the tuner-v2 sections and Keys
import { registerTuneSection, TUNE_BASE_HOOKS, TUNE_FLAGS, TUNE_STATE_BAG, type TuneSection, type TuneTunable } from './tuneRegistry';

/** The team moves the game has (`game/teamMoves.ts` TeamKind, plus the co-op revive). */
export const TEAM_MOVES = ['boost', 'relay', 'throw', 'hang', 'rope', 'revive'] as const;
export type TeamMoveId = (typeof TEAM_MOVES)[number];
export type TeamRole = 'a' | 'b';
/**
 * (coop-kit K0) The part 2 kit moves' tuner sections (game/teamMoves `PART2_KIT_KINDS`; a test keeps them equal):
 * the same generic role and contact sliders, live for the local player's role (`teamRoleGroup` of its kit state) and
 * the partner's base values from the wire (`teamRowOfWire`). Kept out of `TEAM_MOVES` (the chamber's pair list and the
 * Joints / IK rows) until each move's KA animation slice adds its chamber pair.
 */
export const KIT_TUNE_MOVES = ['deadweight', 'dropCatch', 'chimneyPair', 'swingPass', 'plankBridge'] as const;
export type KitTuneMove = (typeof KIT_TUNE_MOVES)[number];
/** Every move with a tuner section. */
export type TeamTuneId = TeamMoveId | KitTuneMove;

export const TEAM_MOVE_LABEL: Record<TeamTuneId, string> = {
  boost: 'Co-op: leg-up',
  relay: 'Co-op: ledge relay',
  throw: 'Co-op: partner throw',
  hang: 'Co-op: hang-down',
  rope: 'Co-op: two-person rope',
  revive: 'Co-op: revive',
  deadweight: 'Co-op: deadweight',
  dropCatch: 'Co-op: drop catch',
  chimneyPair: 'Co-op: chimney pair',
  swingPass: 'Co-op: swing pass',
  plankBridge: 'Co-op: plank bridge',
};

/** Who is who: role A is the one who climbs / is thrown / is lowered / revives; role B offers, holds or lies downed. */
export const TEAM_ROLE_LABEL: Record<TeamTuneId, readonly [string, string]> = {
  boost: ['A climber', 'B booster'],
  relay: ['A climber', 'B hanger'],
  throw: ['A runner', 'B thrower'],
  hang: ['A hanging', 'B holder'],
  rope: ['A climber', 'B holder'],
  revive: ['A reviver', 'B downed'],
  deadweight: ['A passer', 'B hanger'],
  dropCatch: ['A dropper', 'B catcher'],
  chimneyPair: ['A joiner', 'B offerer'],
  swingPass: ['A rider', 'B anchor'],
  plankBridge: ['A second end', 'B first end'],
};

/** The section note for every co-op section (Michael's rule, anim-studio-2 item 3). */
export const TEAM_TUNE_NOTE =
  'Live in real play for YOUR role only. Your partner always plays the shared defaults (export, then fold into the code); your live values never reach them. Nothing goes on the wire. Visual only: the paths and timing of the move itself are unchanged.';

/** Group ids: `team.<move>.a`, `team.<move>.b`, `team.<move>.contact`. */
export function teamGroup(move: TeamTuneId, part: TeamRole | 'contact'): string {
  return `team.${move}.${part}`;
}

/** One-shot moves (the time slider applies): the traversal groups below and these roles. */
const TIMED_ROLES: readonly string[] = [teamGroup('boost', 'a'), teamGroup('relay', 'a'), teamGroup('throw', 'a')];

/** The traversal moves without a Body section state (the Body section has ladder, pipe, ledge, hang, vent, crawl). */
export const TRAV_KINDS = ['vault', 'mantle', 'step', 'climbUp', 'windowVault', 'rappel', 'drop', 'hop', 'roll', 'wallKick', 'split'] as const;
export type TravKind = (typeof TRAV_KINDS)[number];
const TRAV_ONE_SHOT: readonly TravKind[] = ['vault', 'mantle', 'step', 'climbUp', 'windowVault', 'drop', 'hop', 'roll', 'wallKick'];
export const TRAV_GROUPS: readonly string[] = TRAV_KINDS.map((k) => `trav.${k}`);

/** The body / limb sliders every role and traversal group has. */
function roleSliders(groups: readonly string[], timed: readonly string[]): TuneTunable[] {
  const m = (id: string, label: string, min: number, max: number, step: number, unit: string, hook: string): TuneTunable => ({ id, label, kind: 'add', def: 0, min, max, step, unit, groups, hook });
  const out: TuneTunable[] = [
    m('bodyFwd', 'body forward (visual root)', -0.6, 0.6, 0.005, 'm', 'moveTuneRoot: the rig root along the facing (the capsule stays)'),
    m('bodyUp', 'body up (visual root)', -0.6, 0.6, 0.005, 'm', 'moveTuneRoot: the rig root up'),
    m('bodySide', 'body right (visual root)', -0.6, 0.6, 0.005, 'm', 'moveTuneRoot: the rig root to its right'),
    m('yaw', 'body turn', -60, 60, 0.5, 'deg', 'moveTuneRoot: the rig root yaw'),
    m('lean', 'whole-body lean (forward +)', -60, 60, 0.5, 'deg', 'moveTuneBegin: added to RigPose.tumble (about the hips)'),
    m('crouch', 'crouch depth', -1, 1, 0.02, '', 'moveTuneBegin: added to RigPose.crouch (0 stand .. 1 crouched)'),
    m('handUp', 'hands up (world grips)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: reachL / reachR up'),
    m('handFwd', 'hands forward (world grips)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: reachL / reachR along the facing'),
    m('handOut', 'hands out (world grips)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: reachL / reachR away from the body centre'),
    m('footUp', 'feet up (world plants)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: plantL / plantR up'),
    m('footFwd', 'feet forward (world plants)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: plantL / plantR along the facing'),
    m('footOut', 'feet out (world plants)', -0.4, 0.4, 0.005, 'm', 'moveTuneBegin: plantL / plantR away from the body centre'),
  ];
  if (timed.length > 0) out.push({ id: 'time', label: 'pose timing (one-shot clip clock)', kind: 'mul', def: 1, min: 0.5, max: 2, step: 0.01, unit: 'x', groups: timed, hook: 'moveTuneBegin: RigPose.traverseT x this, clamped at 1 (visual only)' });
  return out;
}

const CONTACT_HOOK = 'moveTuneRoot: role A moved in its own frame x the contact window (teamContactK)';

/** One registry section per team move: groups A, B and contact. */
function teamSection(move: TeamTuneId): TuneSection {
  const a = teamGroup(move, 'a');
  const b = teamGroup(move, 'b');
  const c = teamGroup(move, 'contact');
  const timed = TIMED_ROLES.filter((g) => g === a || g === b);
  const contact: TuneTunable[] = [
    { id: 'cFwd', label: 'contact: A forward', kind: 'add', def: 0, min: -0.6, max: 0.6, step: 0.005, unit: 'm', groups: [c], hook: CONTACT_HOOK },
    { id: 'cUp', label: 'contact: A up', kind: 'add', def: 0, min: -0.6, max: 0.6, step: 0.005, unit: 'm', groups: [c], hook: CONTACT_HOOK },
    { id: 'cSide', label: 'contact: A right', kind: 'add', def: 0, min: -0.6, max: 0.6, step: 0.005, unit: 'm', groups: [c], hook: CONTACT_HOOK },
  ];
  const sec = registerTuneSection({
    id: `team_${move}`,
    label: TEAM_MOVE_LABEL[move],
    note: TEAM_TUNE_NOTE,
    groups: [a, b, c],
    tunables: [...roleSliders([a, b], timed), ...contact],
    select: (s) => (s.team && s.team.startsWith(`team.${move}.`) ? s.team : null),
    notes: (g) => (g === c ? [CONTACT_NOTE[move]] : g === a ? [`${TEAM_ROLE_LABEL[move][0]}`] : [`${TEAM_ROLE_LABEL[move][1]}`]),
  });
  return sec;
}

/** What the contact sliders move, per move (the panel's grey line). */
const CONTACT_NOTE: Record<TeamTuneId, string> = {
  boost: 'the climber\'s foot in the booster\'s cupped hands (the step-in and toss)',
  relay: 'the climber against the hanging body (the climb up it)',
  throw: 'the runner at the thrower\'s hands (the launch)',
  hang: 'the hanging partner\'s ankles in the holder\'s hands (while hanging)',
  rope: 'the climber off the rope line (while climbing)',
  revive: 'the reviver\'s hands on the downed body',
  // (coop-kit K0) no contact window yet (placeholder poses): the sliders are there for the KA slices
  deadweight: 'the passer against the grate (no contact window yet)',
  dropCatch: 'the dropper in the catcher\'s arms (no contact window yet)',
  chimneyPair: 'the two backs together (no contact window yet)',
  swingPass: 'the rider\'s wrist in the anchor\'s hand (no contact window yet)',
  plankBridge: 'the board between the two pairs of hands (no contact window yet)',
};

export const TEAM_SECTIONS: Record<TeamMoveId, TuneSection> = {} as Record<TeamMoveId, TuneSection>;
for (const m of TEAM_MOVES) TEAM_SECTIONS[m] = teamSection(m);

export const TRAV_SECTION = registerTuneSection({
  id: 'trav',
  label: 'Traversal moves',
  note: 'Moves the Body section has no state for. Ladder, pipe, ledge, hang, vent and crawl: use the Body section (body fwd / up, hand / foot reach). Live for your own body only; visual only.',
  groups: TRAV_GROUPS,
  tunables: roleSliders(TRAV_GROUPS, TRAV_GROUPS.filter((_g, i) => TRAV_ONE_SHOT.includes(TRAV_KINDS[i]!))),
  select: (s) => s.trav || null,
});

/** (coop-kit K0) The part 2 kit moves' sections (after the Traversal moves: the earlier sections keep their order). */
export const KIT_TUNE_SECTIONS: Record<KitTuneMove, TuneSection> = {} as Record<KitTuneMove, TuneSection>;
for (const m of KIT_TUNE_MOVES) KIT_TUNE_SECTIONS[m] = teamSection(m);

TUNE_STATE_BAG.team = '';
TUNE_STATE_BAG.trav = '';

// ---- the local player's team role (GameState writes it each frame; '' = not in a team move) ----

/** Written by GameState before the local player animates: the role group ('' none) and the contact weight 0..1;
 *  `follow` (the Test Chamber's pairs only) is the group the panel's follow shows instead. */
export const MOVE_TUNE_TEAM = { group: '', k: 0, follow: '' };

const ROLE_OF_STATE: Record<string, string> = {
  boost: teamGroup('boost', 'a'),
  offer: teamGroup('boost', 'b'),
  assist: teamGroup('boost', 'b'),
  relayUp: teamGroup('relay', 'a'),
  relayOffer: teamGroup('relay', 'b'),
  relayHold: teamGroup('relay', 'b'),
  throw: teamGroup('throw', 'a'),
  throwOffer: teamGroup('throw', 'b'),
  throwAssist: teamGroup('throw', 'b'),
  hangDown: teamGroup('hang', 'a'),
  hanging: teamGroup('hang', 'a'),
  hangPull: teamGroup('hang', 'a'),
  hangDrop: teamGroup('hang', 'a'),
  hangOffer: teamGroup('hang', 'b'),
  hangHold: teamGroup('hang', 'b'),
  ropeClimb: teamGroup('rope', 'a'),
  ropeTop: teamGroup('rope', 'a'),
  ropeSlide: teamGroup('rope', 'a'),
  ropeOffer: teamGroup('rope', 'b'),
  ropeHold: teamGroup('rope', 'b'),
  revive: teamGroup('revive', 'a'),
};

/** (coop-kit K0) The part 2 kit states by move and role (anim/clips/team `KIT_POSE_IDS`; a test keeps them equal: no
 *  runtime import of team.ts here). */
const KIT_TUNE_STATES: Readonly<Record<KitTuneMove, { readonly b: readonly string[]; readonly a: readonly string[] }>> = {
  deadweight: { b: ['chainGrab', 'chainHang', 'chainDrop'], a: ['grateUnder'] },
  dropCatch: { b: ['catchOffer', 'catchTake'], a: ['dropInto'] },
  chimneyPair: { b: ['chimneyOffer', 'chimneyBrace', 'chimneyClimb', 'chimneyTop'], a: ['chimneyJoin', 'chimneyPush', 'chimneyRise', 'chimneyOut'] },
  swingPass: { b: ['swingOffer', 'swingHold'], a: ['swingRide', 'swingRelease'] },
  plankBridge: { b: ['plankOffer', 'plankLift', 'plankCarry', 'plankDrop', 'plankLay'], a: ['plankJoin', 'plankLiftA', 'plankCarryA', 'plankDropA', 'plankLayA'] },
};
for (const m of KIT_TUNE_MOVES) {
  for (const s of KIT_TUNE_STATES[m].b) ROLE_OF_STATE[s] = teamGroup(m, 'b');
  for (const s of KIT_TUNE_STATES[m].a) ROLE_OF_STATE[s] = teamGroup(m, 'a');
}
export { KIT_TUNE_STATES };

/** The tuner group of a team-controller state (`TeamState`, or 'revive' while holding a partner's revive), '' = none. */
export function teamRoleGroup(state: string): string {
  return ROLE_OF_STATE[state] ?? '';
}

function smooth(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

/** A trapezoid 0..1: rises from `a` to `b`, holds to `c`, falls to `d` (smoothstep edges; `a` = `b` starts at 1). */
export function trapezoid(x: number, a: number, b: number, c: number, d: number): number {
  if (x < a || x > d) return 0;
  if (x < b) return smooth((x - a) / (b - a));
  if (x <= c) return 1;
  if (x < d) return 1 - smooth((x - c) / (d - c));
  return c === d ? 1 : 0;
}

/**
 * The contact weight of a team state `t` s into its committed part (0..1; role A's states only), from the move's
 * timing (`TEAM` in `config/movement.ts`, passed in so this stays a table lookup): the boost's step into the hands
 * (k 0.1-0.6 of the boost), the relay's climb up the body (0-0.85), the throw's launch (0-0.35), the hang (held by the
 * ankles throughout, let go while pulled up), the rope (on it while climbing), the revive (hands on throughout).
 */
export function teamContactK(state: string, t: number, T: { boostTime: number; relayClimb: number; throwTime: number; hangPull: number; ropeTop: number }): number {
  switch (state) {
    case 'boost':
      return trapezoid(t / T.boostTime, 0.1, 0.25, 0.4, 0.6);
    case 'relayUp':
      return trapezoid(t / T.relayClimb, 0, 0.15, 0.6, 0.85);
    case 'throw':
      return trapezoid(t / T.throwTime, 0, 0, 0.1, 0.35);
    case 'hangDown':
    case 'hanging':
    case 'ropeClimb':
    case 'ropeSlide':
    case 'revive':
      return 1;
    case 'hangPull':
      return 1 - smooth(t / T.hangPull);
    case 'ropeTop':
      return 1 - smooth(t / T.ropeTop);
    default:
      return 0;
  }
}

/** The traversal group of a pose's `traverse` ('' = none: the Body section covers it or it is not a move). */
export function travGroup(traverse: string): string {
  const i = (TRAV_KINDS as readonly string[]).indexOf(traverse);
  return i < 0 ? '' : TRAV_GROUPS[i]!;
}

// ---- the frame window (no allocation) ----

interface GroupRef {
  vals: Record<string, number>;
  /** The move's contact values (role A groups only), else null. */
  con: Record<string, number> | null;
  /** (anim-bake-all) Base refs only: any value off identity (the bypass selects the base only then). */
  live: boolean;
}
/**
 * (anim-bake-all, BA-A3) The effective values (the base table's `sections.<team_move | trav>` composed with the tuner's,
 * the registry's `eff`, rebuilt on an edit or a load) and, for the bypass, the base alone.
 */
const REFS = new Map<string, GroupRef>();
const BASE_REFS = new Map<string, GroupRef>();
const BASE_OF = new Map<GroupRef, TuneSection>();
for (const m of [...TEAM_MOVES, ...KIT_TUNE_MOVES]) {
  // ((coop-kit K0) the part 2 kit sections too)
  const sec = m in TEAM_SECTIONS ? TEAM_SECTIONS[m as TeamMoveId] : KIT_TUNE_SECTIONS[m as KitTuneMove];
  const c = teamGroup(m, 'contact');
  const a = teamGroup(m, 'a');
  const b = teamGroup(m, 'b');
  REFS.set(a, { vals: sec.eff[a] as Record<string, number>, con: sec.eff[c] as Record<string, number>, live: false });
  REFS.set(b, { vals: sec.eff[b] as Record<string, number>, con: null, live: false });
  BASE_REFS.set(a, { vals: sec.base[a] as Record<string, number>, con: sec.base[c] as Record<string, number>, live: false });
  BASE_REFS.set(b, { vals: sec.base[b] as Record<string, number>, con: null, live: false });
  BASE_OF.set(BASE_REFS.get(a)!, sec);
  BASE_OF.set(BASE_REFS.get(b)!, sec);
}
for (const g of TRAV_GROUPS) {
  REFS.set(g, { vals: TRAV_SECTION.eff[g] as Record<string, number>, con: null, live: false });
  const r: GroupRef = { vals: TRAV_SECTION.base[g] as Record<string, number>, con: null, live: false };
  BASE_REFS.set(g, r);
  BASE_OF.set(r, TRAV_SECTION);
}
/** Which base refs hold a value off identity (at start and after every base load; not hot). */
function baseLiveSync(): void {
  for (const [r, sec] of BASE_OF) {
    let live = false;
    for (const t of sec.tunables) {
      if (r.vals[t.id] !== undefined && r.vals[t.id] !== t.def) live = true;
      if (r.con && r.con[t.id] !== undefined && r.con[t.id] !== t.def) live = true;
    }
    r.live = live;
  }
}
baseLiveSync();
TUNE_BASE_HOOKS.push(baseLiveSync);

/** The selection now: the group's values (null: identity), the contact values and weight. */
const SEL: { ref: GroupRef | null; k: number; group: string } = { ref: null, k: 0, group: '' };

/**
 * Select the group for the next root / begin / end calls: a team role group if given, else the traversal group of
 * `traverse`; `k` the contact weight (role A only). `follow` writes the panel's follow keys (the local player; the
 * chamber's puppets pass false). The bypass (R3 held) selects the base table's values alone (nothing when the group has
 * none: identity). No allocation.
 */
export function moveTuneSelect(team: string, k: number, traverse: string, follow = true): string {
  const g = team !== '' ? team : travGroup(traverse);
  if (follow) {
    const shown = MOVE_TUNE_TEAM.follow !== '' ? MOVE_TUNE_TEAM.follow : team;
    TUNE_STATE_BAG.team = shown;
    TUNE_STATE_BAG.trav = shown !== '' ? '' : g;
  }
  let ref: GroupRef | null = null;
  if (g !== '') {
    if (!TUNE_FLAGS.bypass) ref = REFS.get(g) ?? null;
    else {
      const b = BASE_REFS.get(g);
      ref = b && b.live ? b : null;
    }
  }
  SEL.ref = ref;
  SEL.group = ref ? g : '';
  SEL.k = ref && ref.con ? Math.max(0, Math.min(1, k)) : 0;
  return SEL.group;
}

/**
 * (pose-parity) The same pick for the co-op partner's rig (`net/remoteAvatar`): its role group from the wire
 * (`teamRowOfWire`) or its posed traversal, from the BASE table only (the baked `sections.<team_move | trav>`, what the
 * partner's own page plays untuned), never the viewer's live tuner values (those are the viewer's own role). No base
 * value off identity: nothing (bit-identical). No panel follow. No allocation.
 */
export function moveTuneSelectBase(team: string, k: number, traverse: string): string {
  const g = team !== '' ? team : travGroup(traverse);
  const b = g !== '' ? BASE_REFS.get(g) : undefined;
  const ref = b && b.live ? b : null;
  SEL.ref = ref;
  SEL.group = ref ? g : '';
  SEL.k = ref && ref.con ? Math.max(0, Math.min(1, k)) : 0;
  return SEL.group;
}

/**
 * (pose-parity, A5) A partner's contact weight (0..1) from its wire phase (the wire has no team timer): the leg-up's
 * and the throw's windows on `ph` (as `teamContactK`'s fractions), the hang-down and rope climber held on (1), else 0.
 */
export function teamContactKOfWire(group: string, ph: number): number {
  switch (group) {
    case 'team.boost.a':
      return trapezoid(ph, 0.1, 0.25, 0.4, 0.6);
    case 'team.throw.a':
      return trapezoid(ph, 0, 0, 0.1, 0.35);
    case 'team.hang.a':
    case 'team.rope.a':
      return 1;
    default:
      return 0;
  }
}

/** The selected group ('' none). */
export function moveTuneGroup(): string {
  return SEL.group;
}

/**
 * The rig root's visual offset of the selected group: forward / up / right in the body frame and the yaw, plus (role
 * A) the contact offset x its weight. `rot.y` is turned by the yaw. No allocation.
 */
export function moveTuneRoot(pos: { x: number; y: number; z: number }, rot: { y: number }): void {
  const r = SEL.ref;
  if (!r) return;
  const v = r.vals;
  const c = r.con;
  const k = SEL.k;
  const f = v.bodyFwd! + (c ? c.cFwd! * k : 0);
  const u = v.bodyUp! + (c ? c.cUp! * k : 0);
  const sd = v.bodySide! + (c ? c.cSide! * k : 0);
  const yaw = rot.y;
  if (f !== 0 || u !== 0 || sd !== 0) {
    const s = Math.sin(yaw);
    const co = Math.cos(yaw);
    // forward (s, co), right (co, -s)
    pos.x += s * f + co * sd;
    pos.z += co * f - s * sd;
    pos.y += u;
  }
  if (v.yaw! !== 0) rot.y = yaw + (v.yaw! * Math.PI) / 180;
}

/** The rig fields `moveTuneBegin` / `moveTuneEnd` touch (a CharacterRig, loosely typed). */
export interface MoveTarget {
  x: number;
  y: number;
  z: number;
  cx?: number;
  cy?: number;
  cz?: number;
}
export interface MoveRigIn {
  reachL: MoveTarget;
  reachR: MoveTarget;
  plantL: MoveTarget;
  plantR: MoveTarget;
  root: { rotation: { y: number } };
}
/** The RigPose fields `moveTuneBegin` changes. */
export interface MovePoseIn {
  crouch: number;
  tumble?: number;
  traverseT?: number;
}

const saved = new Float64Array(24);
let shifted = false;

function shift(t: MoveTarget, slot: number, dx: number, dy: number, dz: number): void {
  const o = slot * 6;
  saved[o] = t.x;
  saved[o + 1] = t.y;
  saved[o + 2] = t.z;
  saved[o + 3] = t.cx ?? NaN;
  saved[o + 4] = t.cy ?? NaN;
  saved[o + 5] = t.cz ?? NaN;
  t.x += dx;
  t.y += dy;
  t.z += dz;
  if (t.cx !== undefined) t.cx += dx;
  if (t.cy !== undefined) t.cy += dy;
  if (t.cz !== undefined) t.cz += dz;
}

function restore(t: MoveTarget, slot: number): void {
  const o = slot * 6;
  t.x = saved[o]!;
  t.y = saved[o + 1]!;
  t.z = saved[o + 2]!;
  if (t.cx !== undefined && !Number.isNaN(saved[o + 3]!)) t.cx = saved[o + 3]!;
  if (t.cy !== undefined && !Number.isNaN(saved[o + 4]!)) t.cy = saved[o + 4]!;
  if (t.cz !== undefined && !Number.isNaN(saved[o + 5]!)) t.cz = saved[o + 5]!;
}

/**
 * Before `rig.animate`: the selected group onto the pose (lean, crouch, the one-shot clock) and the world grip targets
 * (hands / feet in the body frame; restored by `moveTuneEnd`). No allocation.
 */
export function moveTuneBegin(p: MovePoseIn, rig: MoveRigIn): void {
  shifted = false;
  const r = SEL.ref;
  if (!r) return;
  const v = r.vals;
  if (v.lean! !== 0) p.tumble = (p.tumble ?? 0) + (v.lean! * Math.PI) / 180;
  if (v.crouch! !== 0) p.crouch = Math.max(0, Math.min(1, p.crouch + v.crouch!));
  const tm = v.time;
  if (tm !== undefined && tm !== 1 && p.traverseT !== undefined) p.traverseT = Math.max(0, Math.min(1, p.traverseT * tm));
  const hu = v.handUp!;
  const hf = v.handFwd!;
  const ho = v.handOut!;
  const fu = v.footUp!;
  const ff = v.footFwd!;
  const fo = v.footOut!;
  if (hu === 0 && hf === 0 && ho === 0 && fu === 0 && ff === 0 && fo === 0) return;
  shifted = true;
  const yaw = rig.root.rotation.y;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // the body's right is (fz, -fx); out = away from the centre (left hand / foot: to the left)
  shift(rig.reachL, 0, fx * hf - fz * ho, hu, fz * hf + fx * ho);
  shift(rig.reachR, 1, fx * hf + fz * ho, hu, fz * hf - fx * ho);
  shift(rig.plantL, 2, fx * ff - fz * fo, fu, fz * ff + fx * fo);
  shift(rig.plantR, 3, fx * ff + fz * fo, fu, fz * ff - fx * fo);
}

/** After `rig.animate`: the grip targets back. No allocation. */
export function moveTuneEnd(rig: MoveRigIn): void {
  if (!shifted) return;
  restore(rig.reachL, 0);
  restore(rig.reachR, 1);
  restore(rig.plantL, 2);
  restore(rig.plantR, 3);
  shifted = false;
}
