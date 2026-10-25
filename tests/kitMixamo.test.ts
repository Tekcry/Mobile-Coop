/**
 * (mixamo-kit) The Mixamo clips on the co-op kit moves (src/anim/kitMixamo.ts, TeamPoser's kit shot in clips/team.ts,
 * the graph's `kitShot`, the rig's `keyShot`; docs/mixamo-kit/PLAN.md section 4 "Tests"). Headless Wren rigs
 * (`operatorRig` on a NullEngine) driven as `Player` drives its rig: TeamPoser.begin, rig.animate, TeamPoser.end.
 * - (a) off is bit-identical (every RigTargets field, the graph pose, every joint's world matrix, the reach / plant
 *   targets, the root and the RigPose fields, every frame as float64 bits): the Hand source with the kit rows on (CMU is
 *   the same here: the toggle is not merged, both are `MIXAMO.on` false), after a Mixamo run, the Mixamo source with every
 *   kit row false, and a guard graph under the Mixamo source; (a2) the Mixamo source with the rows on over the non-kit
 *   team moves and plain locomotion, and the capture hang straight after a pull;
 * - (b) on: each mapped pose id's take at the table's time; optional rows; one row off; the copies; the frame dump;
 * - (c) both screens give the same take and clip time; (c2) per-rig source (G400); (d) timing kept; (e) the hang skip;
 * - (f) no pop, the palms on the bar; (g) no allocation; (h) the A8 readings (KIT-REPORT.md); (i) no stale shot.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MIXAMO_ON, setMixamo } from '../src/anim/mixamo';
import { KIT_PULL, KIT_SHOT, KIT_TABLES, kitClipTime, kitGapTrend, kitShotTime, kitShutterPhase, newKitShotIn, resolveKit, setKitSourceOf, type KitShotIn } from '../src/anim/kitMixamo';
import { KIT_POSE_IDS, KIT_POSE_LOCAL, TEAM_LINK, TeamPoser, newTeamPoseIn, teamLinkFrame, teamPoseOfState, teamPoseOfWire, type KitPoseId, type TeamPoseIn, type TeamRigIn, type TeamRigPose } from '../src/anim/clips/team';
import { AnimGraph, defaultInput, type TraverseKind } from '../src/anim/animGraph';
import { newKeyedPose, sampleKeyed, type KeyedClip } from '../src/anim/keyed';
import { MOCAP_KNEELING_PULL_UP } from '../src/anim/clips/mixamo/kneeling_pull_up';
import { MOCAP_PULLING_UP_TO_A_LEDGE } from '../src/anim/clips/mixamo/pulling_up_to_a_ledge';
import { MOCAP_LIFTING_HEAVY_OBJECT } from '../src/anim/clips/mixamo/lifting_heavy_object';
import { MOCAP_CRAWLING_PRONE } from '../src/anim/clips/mixamo/crawling_prone';
import { TEAM } from '../src/config/movement';
import { PULL } from '../src/game/kit/pullUp';
import { SHUTTER } from '../src/game/kit/shutter';
import { proportions } from '../src/player/proportions';
import { elbowWing, kneeBow } from '../src/anim/audit/metrics';
import { JOINTS } from './helpers/mocapMeasure';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';
import type { CharacterRig, RigPose } from '../src/player/characterRig';

const DT = 1 / 60;
const TAKES = ['kneeling_pull_up', 'pulling_up_to_a_ledge', 'lifting_heavy_object', 'crawling_prone'] as const;
const ON0 = { ...MIXAMO_ON };

function clearLink(): void {
  Object.assign(TEAM_LINK, { partner: '', move: '', role: '', k: -1, gap: NaN, linger: 0, kit: '', kt: 0 });
}

afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(false);
  resolveKit();
  setKitSourceOf(null);
  clearLink();
  KIT_POSE_LOCAL.k = -1;
  KIT_POSE_LOCAL.gap = NaN;
});

/** The four takes' rows (the optional phases stay as shipped), the tables rebuilt (the stub resolver: tests call it). */
function rows(on: boolean): void {
  for (const s of TAKES) MIXAMO_ON[s] = on;
  resolveKit();
}

// ---- scenes: one frame each 1/60 s ----

interface F {
  wire: boolean;
  state: string;
  t: number;
  k: number;
  gap: number;
  mode: string;
  sub: number;
  s: number;
  ph: number;
  /** The wire scenes: this page's own player's state (it links the avatar), '' none. */
  link: string;
  lk: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  px: number;
  py: number;
  pz: number;
  grounded: boolean;
  trav: TraverseKind;
  travT: number;
  crouch: number;
  speed: number;
}

const fr = (p: Partial<F>): F => ({ wire: false, state: 'none', t: 0, k: -1, gap: NaN, mode: 'ground', sub: 0, s: 0, ph: 0, link: '', lk: -1, x: 0, y: 0, z: 0, yaw: 0, px: NaN, py: NaN, pz: NaN, grounded: true, trav: 'none', travT: 0, crouch: 0, speed: 0, ...p });

/** `sec` s of frames: `f(u, t)` with u = t / sec (0 .. under 1). */
function seg(out: F[], sec: number, f: (u: number, t: number) => Partial<F>): void {
  const n = Math.round(sec * 60);
  for (let j = 0; j < n; j++) out.push(fr(f(j / n, j * DT)));
}

const P = KIT_PULL;
const below = (dy: number): Partial<F> => ({ px: 0, py: dy, pz: 0.6 });

/** The pull holder at (0, 0, 0) facing +z: local (its own states) or the partner's page (the avatar, linked to our climber). */
function holderPull(remote: boolean): F[] {
  const o: F[] = [];
  if (!remote) {
    seg(o, 0.5, () => ({ state: 'pullOffer', ...below(-4.4) }));
    seg(o, P.catchClose, (u) => ({ state: 'pullCatch', k: u, ...below(-4.4 + 0.8 * u) }));
    seg(o, P.haul + P.scramble, (u) => ({ state: 'pullHaul', k: u, ...below(-3.6 + 3.6 * u) }));
    seg(o, 0.6, () => ({}));
    return o;
  }
  const w: Partial<F> = { wire: true, mode: 'brace', sub: 8 };
  seg(o, 0.5, () => ({ ...w, ...below(-4.4) }));
  seg(o, P.landT, (u) => ({ ...w, link: 'pullJump', lk: u, ...below(-4.4 + 0.87 * Math.sin(Math.PI * u)) }));
  seg(o, P.haul, (u) => ({ ...w, link: 'pullHang', lk: u, ...below(-3.6 + 2.1 * u) }));
  seg(o, P.scramble, (u) => ({ ...w, link: 'pullScramble', lk: u, ...below(-1.5 + 1.5 * u) }));
  seg(o, 0.6, () => ({ wire: true }));
  return o;
}

/** The shutter holder: local (the 60 Hz gap) or remote (the wire `s`: 20 Hz, cm). */
function holderShutter(remote: boolean): F[] {
  const o: F[] = [];
  seg(o, 0.4, () => ({ state: 'shutterOffer', gap: 0 }));
  seg(o, SHUTTER.liftTime, (u) => ({ state: 'shutterLift', k: u, gap: SHUTTER.holdGap * u }));
  seg(o, 1.5, () => ({ state: 'shutterHold', k: 1, gap: SHUTTER.holdGap }));
  seg(o, SHUTTER.dropTime, (u) => ({ state: 'shutterDrop', k: u, gap: SHUTTER.holdGap * (1 - u) }));
  seg(o, 0.6, () => ({}));
  if (!remote) return o;
  return o.map((f, j) => {
    const g = o[j - (j % 3)]!.gap;
    const on = f.state !== 'none';
    return fr({ wire: true, mode: on ? 'brace' : 'ground', sub: on ? 16 : 0, s: on ? Math.round((g > 0 ? g : 0) * 100) / 100 : 0 });
  });
}

/** The pull partner under a 4.4 m lip: jump, hauled, scramble, crouched on top; local or remote (ph 0 until the
 *  scramble: the remote body hangs). `after` s of a lip hang with no team move follow it instead (a2). */
function climberPull(remote: boolean, after = 0): F[] {
  const o: F[] = [];
  if (!remote) {
    seg(o, 0.3, () => ({}));
    seg(o, P.landT, (u) => ({ grounded: false, state: 'pullJump', k: u, trav: 'hop', travT: u, y: 0.87 * Math.sin(Math.PI * u) }));
    seg(o, P.haul, (u) => ({ grounded: false, state: 'pullHang', k: u, trav: 'hang', travT: u, y: 0.8 + 2.1 * u }));
    seg(o, P.scramble, (u) => ({ grounded: false, state: 'pullScramble', k: u, trav: 'climbUp', travT: u, y: 2.9 + 1.5 * u, z: 0.6 * u }));
  } else {
    const w: Partial<F> = { wire: true, mode: 'boost', sub: 8, grounded: false };
    seg(o, 0.3, () => ({ wire: true }));
    seg(o, P.landT, (u) => ({ ...w, trav: 'hang', y: 0.87 * Math.sin(Math.PI * u) }));
    seg(o, P.haul, (u) => ({ ...w, trav: 'hang', y: 0.8 + 2.1 * u }));
    seg(o, P.scramble, (u) => ({ ...w, ph: u, trav: 'climbUp', travT: u, y: 2.9 + 1.5 * u, z: 0.6 * u }));
  }
  if (after > 0) seg(o, after, () => ({ wire: remote, grounded: false, trav: 'hang', y: 2.9 }));
  else seg(o, 0.6, () => ({ wire: remote, y: 4.4, z: 0.6, crouch: 1 }));
  return o;
}

/** The crawl under a held shutter (0.85 m/s along +z, crouched), local or remote. */
function crawler(remote: boolean): F[] {
  const o: F[] = [];
  const v = 0.85;
  seg(o, 0.3, () => ({ wire: remote, crouch: 1 }));
  const on: Partial<F> = remote ? { wire: true, mode: 'boost', sub: 16, s: 0.9 } : { state: 'crawlUnder', gap: 0.9 };
  seg(o, SHUTTER.crawlTime, (u, t) => ({ ...on, k: u, crouch: 1, speed: v, z: v * t }));
  seg(o, 0.5, () => ({ wire: remote, crouch: 1, z: v * SHUTTER.crawlTime }));
  return o;
}

/** A non-kit team move or locomotion (a2): `states` [state, s] then 0.5 s of nothing. */
function plain(states: readonly (readonly [string, number])[], extra: Partial<F> = {}): F[] {
  const o: F[] = [];
  for (const [st, sec] of states) seg(o, sec, (_u, t) => ({ state: st, t, ...below(-2), ...extra }));
  seg(o, 0.5, () => ({}));
  return o;
}

const KIT_SCENES: readonly (readonly [string, () => F[]])[] = [
  ['pull holder (local)', () => holderPull(false)],
  ['pull holder (remote)', () => holderPull(true)],
  ['shutter holder (local)', () => holderShutter(false)],
  ['shutter holder (remote)', () => holderShutter(true)],
  ['pull partner (local)', () => climberPull(false)],
  ['pull partner (remote)', () => climberPull(true)],
  ['crawler (local)', () => crawler(false)],
  ['crawler (remote)', () => crawler(true)],
];

const PLAIN_SCENES: readonly (readonly [string, () => F[]])[] = [
  ['leg-up holder', () => plain([['offer', 0.5], ['assist', TEAM.boostTime]])],
  ['leg-up climber', () => plain([['boost', TEAM.boostTime]])],
  ['throw holder', () => plain([['throwOffer', 0.5], ['throwAssist', TEAM.throwTime]])],
  ['hang-down holder', () => plain([['hangOffer', 0.5], ['hangHold', 1.5]])],
  ['hang-down partner', () => plain([['hanging', 1.5]], { grounded: false, trav: 'hang' })],
  ['rope holder', () => plain([['ropeOffer', 0.5], ['ropeHold', 1.5]])],
  ['rope climber', () => plain([['ropeClimb', 1.5]], { grounded: false, trav: 'climb' })],
  ['walk', () => plain([['none', 2]], { speed: 1.4 })],
];

// ---- one frame's inputs ----

const LOCAL = newTeamPoseIn();

/** The frame's team pose input into `tin` (local: the controller's state and clock; wire: the avatar, linked when our own
 *  player's state is given), as GameState / RemoteAvatar fill it. */
function fillIn(f: F, tin: TeamPoseIn): void {
  if (!f.wire) {
    KIT_POSE_LOCAL.k = f.k;
    KIT_POSE_LOCAL.gap = f.gap;
    teamPoseOfState(f.state, f.t, tin);
    tin.px = f.px;
    tin.py = f.py;
    tin.pz = f.pz;
    tin.pyaw = f.yaw + Math.PI;
    return;
  }
  KIT_POSE_LOCAL.k = f.lk;
  teamPoseOfState(f.link === '' ? 'none' : f.link, 0, LOCAL);
  teamLinkFrame(DT, f.link === '' ? '' : 'p2', LOCAL, f.px, f.py, f.pz, f.yaw + Math.PI);
  teamPoseOfWire(f.mode, f.sub, f.s, f.ph, 'p2', tin);
}

// ---- the bit hash (as tests/mixamoStance.test.ts) ----

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

function hashAll(h: Hasher, v: unknown, seen: Set<object>): void {
  if (typeof v === 'number') h.add(v);
  else if (typeof v === 'boolean') h.add(v ? 1 : 0);
  else if (typeof v === 'string') for (let k = 0; k < v.length; k++) h.add(v.charCodeAt(k));
  else if (v !== null && typeof v === 'object') {
    if (seen.has(v)) return;
    seen.add(v);
    if (ArrayBuffer.isView(v)) {
      const a = v as unknown as ArrayLike<number>;
      for (let k = 0; k < a.length; k++) h.add(Number(a[k]));
    } else for (const k of Object.keys(v)) hashAll(h, (v as Record<string, unknown>)[k], seen);
  }
}

// ---- the rig run ----

interface Out {
  /** Per frame: the whole drawn state (bits). */
  hash: string[];
  /** Per frame: the game's side (the root after begin, the input's game fields, the traverse) (bits). */
  timing: string[];
  /** Per frame: the graph played a traversal capture (`mxLast`), the traverse, the shot weight the poser wrote. */
  mx: boolean[];
  trav: string[];
  shotW: number[];
  /** Per joint (JOINTS order): world positions less the root, x y z a frame. */
  jp: number[][];
  /** Per joint: world positions (the audit metrics). */
  jw: number[][];
  /** Per frame: the palms' worst miss of their reach targets (m) while a target holds (weight 0.5+), else NaN. */
  palm: number[];
}

interface RunOpts {
  wren?: boolean;
  /** Before frame k's begin (a source flip mid-move). */
  each?: (k: number) => void;
}

async function run(frames: readonly F[], o: RunOpts = {}): Promise<Out> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  clearLink();
  const out: Out = { hash: [], timing: [], mx: [], trav: [], shotW: [], jp: JOINTS.map(() => []), jw: JOINTS.map(() => []), palm: [] };
  try {
    const op = operatorRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 'kitmix');
    const rig: CharacterRig = op.rig;
    rig.tuneRows = o.wren ?? true;
    rig.carrier = true;
    const poser = new TeamPoser();
    const tin = newTeamPoseIn();
    const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'none', traverseT: 0 };
    const back = (rig as unknown as { p: { hand: { len: number } } }).p.hand.len * 0.45;
    const g = rig.graph as unknown as { mxLast: boolean; out: unknown; pose: Float64Array };
    for (let k = 0; k < frames.length; k++) {
      const f = frames[k]!;
      o.each?.(k);
      rig.root.position.set(f.x, f.y, f.z);
      rig.root.rotation.y = f.yaw;
      pose.speed = f.speed;
      pose.localZ = f.speed > 0 ? 1 : 0;
      pose.grounded = f.grounded;
      pose.crouch = f.crouch;
      pose.traverse = f.trav;
      pose.traverseT = f.travT;
      pose.bend = pose.bendDrop = pose.sway = 0;
      pose.stride = 'facing';
      fillIn(f, tin);
      poser.begin(DT, tin, pose as TeamRigPose, rig);
      out.shotW.push(rig.graph.kit.clip !== null ? rig.graph.kit.weight : 0);
      const ht = new Hasher();
      const rp = rig.root.position;
      for (const v of [rp.x, rp.y, rp.z, rig.root.rotation.y, tin.k, tin.gap, tin.px, tin.py, tin.pz, tin.depth, pose.traverseT ?? 0]) ht.add(v);
      hashAll(ht, [tin.move, tin.role, pose.traverse], new Set());
      out.timing.push(ht.digest());
      const rx = rp.x;
      const ry = rp.y;
      const rz = rp.z;
      rig.animate(DT, pose);
      const h = new Hasher();
      hashAll(h, g.out, new Set());
      for (let c = 0; c < g.pose.length; c++) h.add(g.pose[c]!);
      for (let j = 0; j < JOINTS.length; j++) {
        const m = rig[JOINTS[j]!].computeWorldMatrix(true).m;
        for (let c = 0; c < 16; c++) h.add(m[c]!);
        out.jp[j]!.push(m[12]! - rx, m[13]! - ry, m[14]! - rz);
        out.jw[j]!.push(m[12]!, m[13]!, m[14]!);
      }
      hashAll(h, [rig.reachL, rig.reachR, rig.plantR, rx, ry, rz, rig.root.rotation.y, pose.bend, pose.bendDrop, pose.sway, pose.traverse], new Set());
      out.hash.push(h.digest());
      out.mx.push(g.mxLast);
      out.trav.push(pose.traverse ?? 'none');
      // the palm sits back from the wrist along the reach (characterRig: hand length x 0.45) when no grip axis
      let miss = NaN;
      for (const side of [1, -1] as const) {
        const r = side > 0 ? rig.reachR : rig.reachL;
        if (r.w < 0.5) continue;
        const sm = (side > 0 ? rig.shoulderR : rig.shoulderL).computeWorldMatrix(true).m;
        const wm = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true).m;
        const dx = r.x - sm[12]!;
        const dy = r.y - sm[13]!;
        const dz = r.z - sm[14]!;
        const l = Math.hypot(dx, dy, dz) || 1;
        const e = Math.hypot(wm[12]! + (dx / l) * back - r.x, wm[13]! + (dy / l) * back - r.y, wm[14]! + (dz / l) * back - r.z);
        miss = Number.isNaN(miss) ? e : Math.max(miss, e);
      }
      out.palm.push(miss);
      poser.end(rig);
    }
    op.figure.dispose();
    rig.dispose();
  } finally {
    Math.random = random;
    scene.dispose();
  }
  return out;
}

function differ(a: readonly string[], b: readonly string[]): number {
  let n = Math.abs(a.length - b.length);
  for (let k = 0; k < Math.min(a.length, b.length); k++) if (a[k] !== b[k]) n++;
  return n;
}

/** The largest joint step a frame (cm, the body less its root) and the largest velocity change a frame (cm/frame). */
function steps(R: Out, from = 1, to = R.hash.length): { step: number; pop: number; at: number; joint: string } {
  let step = 0;
  let pop = 0;
  let at = -1;
  let joint = '';
  for (let jj = 0; jj < R.jp.length; jj++) {
    const p = R.jp[jj]!;
    for (let f = Math.max(1, from); f < to; f++) {
      const vx = p[f * 3]! - p[f * 3 - 3]!;
      const vy = p[f * 3 + 1]! - p[f * 3 - 2]!;
      const vz = p[f * 3 + 2]! - p[f * 3 - 1]!;
      const s = Math.hypot(vx, vy, vz) * 100;
      if (s > step) {
        step = s;
        at = f;
        joint = JOINTS[jj]!;
      }
      if (f >= 2) {
        const ux = p[f * 3 - 3]! - p[f * 3 - 6]!;
        const uy = p[f * 3 - 2]! - p[f * 3 - 5]!;
        const uz = p[f * 3 - 1]! - p[f * 3 - 4]!;
        pop = Math.max(pop, Math.hypot(vx - ux, vy - uy, vz - uz) * 100);
      }
    }
  }
  return { step, pop, at, joint };
}

const J = (n: (typeof JOINTS)[number]): number => JOINTS.indexOf(n);

// ---- a fake rig for the poser alone (as tests/teamPose.test.ts) ----

interface FakeRig extends TeamRigIn {
  graph: { kit: KitShotIn };
}
function fakeRig(): FakeRig {
  return { reachL: { x: 0, y: 0, z: 0, w: 0 }, reachR: { x: 0, y: 0, z: 0, w: 0 }, plantR: { x: 0, y: 0, z: 0, w: 0 }, root: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }, height: 1.75, graph: { kit: newKitShotIn() } };
}

/** The poser over `frames` on a fake rig: per frame the shot it wrote (copied between begin and end). */
function poserRun(frames: readonly F[], rig: FakeRig = fakeRig()): { clip: (KeyedClip | null)[]; time: number[]; w: number[]; move: string[]; role: string[]; after: KitShotIn[] } {
  const tp = new TeamPoser();
  const tin = newTeamPoseIn();
  const p: TeamRigPose = {};
  const r = { clip: [] as (KeyedClip | null)[], time: [] as number[], w: [] as number[], move: [] as string[], role: [] as string[], after: [] as KitShotIn[] };
  clearLink();
  for (const f of frames) {
    rig.root.position.x = f.x;
    rig.root.position.y = f.y;
    rig.root.position.z = f.z;
    rig.root.rotation.y = f.yaw;
    p.traverse = f.trav;
    p.bend = p.bendDrop = p.sway = 0;
    fillIn(f, tin);
    tp.begin(DT, tin, p, rig);
    const K = rig.graph.kit;
    r.clip.push(K.weight > 0 ? K.clip : null);
    r.time.push(K.time);
    r.w.push(K.weight);
    r.move.push(K.move);
    r.role.push(K.role);
    tp.end(rig);
    r.after.push({ ...K });
  }
  return r;
}

// =====================================================================================================================

// (g) first: measured before the real-rig runs make the poser's code polymorphic (a tier that boxes doubles)
describe('mixamo-kit (g): no allocation', () => {
  it('(g) the poser (local and remote pose input) and the graph leave no more a frame with the shot on than off', async () => {
    setMixamo(true);
    // (the placeholder poses already box doubles in their curve calls, 30-110 B a frame by phase and tier: each kit
    // phase is measured on its own with the same inputs, the shot on against the rows off, as tests/mixamoStance.test.ts)
    const at = new Int32Array(1);
    const V = Float64Array.from({ length: 600 }, (_v, k) => (k % 200) / 220);
    const cases = [['shutter', 'b', ''], ['shutter', 'a', 'crawlUnder'], ['pull', 'b', 'pullCatch'], ['pull', 'b', 'pullHaul'], ['pull', 'a', 'pullScramble']] as const;
    const read: string[] = [];
    for (const [move, role, kit] of cases) {
      const by = async (on: boolean): Promise<number> => {
        rows(on);
        const tp = new TeamPoser();
        const rig = fakeRig();
        const i = newTeamPoseIn();
        i.move = move;
        i.role = role;
        i.kit = kit;
        i.px = 0;
        i.py = -2;
        i.pz = 0.6;
        const p: TeamRigPose = {};
        return bytesPerCall((n) => {
          for (let k = 0; k < n; k++) {
            const j = at[0]!;
            at[0] = j + 1 >= V.length ? 0 : j + 1;
            i.gap = V[j]!;
            i.kt = V[j]!;
            rig.root.position.z = V[j]!;
            tp.begin(DT, i, p, rig);
            tp.end(rig);
          }
        }, 0, { n: 600 });
      };
      const on = await by(true);
      const off = await by(false);
      read.push(`${move}/${role}/${kit || 'gap'} ${on} (${off})`);
      expect(on, `${move} ${role} ${kit}`).toBeLessThanOrEqual(off + HEAP_NUMBER);
    }
    // the pose input: the local state and the remote wire with the link
    rows(true);
    const tin = newTeamPoseIn();
    const me = newTeamPoseIn();
    const pin = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        const j = at[0]!;
        at[0] = j + 1 >= V.length ? 0 : j + 1;
        KIT_POSE_LOCAL.k = V[j]!;
        teamPoseOfState('pullHaul', 0, tin);
        teamPoseOfState('pullJump', 0, me);
        teamPoseOfWire('brace', 8, 0, 0, 'p2', tin);
        teamPoseOfWire('boost', 8, 0, V[j]!, 'p2', tin);
      }
    }, 0, { n: 600 });
    console.info(`(mixamo-kit) poser bytes a frame, shot on (rows off): ${read.join(', ')}; pose input ${pin}`);
    expect(pin).toBeLessThanOrEqual(HEAP_NUMBER);
    // the graph: a held shutter shot on a free body against no shot
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.traverse = 'brace';
    const K = g.kit;
    K.clip = MOCAP_LIFTING_HEAVY_OBJECT;
    K.mode = 'shot';
    const T = Float64Array.from({ length: 600 }, (_v, k) => 0.5 + 0.1 * Math.sin(k / 30));
    const gr = (n: number): void => {
      for (let k = 0; k < n; k++) {
        const j = at[0]!;
        at[0] = j + 1 >= T.length ? 0 : j + 1;
        K.time = T[j]!;
        g.update(DT, i);
      }
    };
    K.weight = 1;
    const gOn = await bytesPerCall(gr, 0, { n: 600 });
    K.weight = 0;
    const gOff = await bytesPerCall(gr, 0, { n: 600 });
    console.info(`(mixamo-kit) graph bytes a frame: shot on ${gOn} (off ${gOff})`);
    // (the take's progress and weight go into keyed.ts's sampler / mixer as double arguments, as the stance shot's do: at
    // most two boxed doubles; no object, closure or array; + 1 B: a remainder amortised over the round, read 0.16)
    expect(gOn).toBeLessThanOrEqual(gOff + 2 * HEAP_NUMBER + 1);
  }, 300_000);
});

describe('mixamo-kit (a): off is bit-identical', () => {
  it('the Hand source with the kit rows on, after a Mixamo run, the Mixamo source with every kit row false, a guard graph', async () => {
    for (const [name, make] of KIT_SCENES) {
      const fs = make();
      rows(false);
      const base = await run(fs);
      rows(true);
      expect(differ(base.hash, (await run(fs)).hash), `${name}: Hand, rows on`).toBe(0);
      setMixamo(true);
      await run(fs);
      setMixamo(false);
      expect(differ(base.hash, (await run(fs)).hash), `${name}: Hand after Mixamo`).toBe(0);
      // the Mixamo source, every kit row false (no hang skip, no shot), after the rows were on: the same as never on
      setMixamo(true);
      rows(false);
      const baseM = await run(fs);
      rows(true);
      await run(fs);
      rows(false);
      expect(differ(baseM.hash, (await run(fs)).hash), `${name}: Mixamo, rows off`).toBe(0);
      // a guard graph (wrenReady false) under the Mixamo source: the rows change nothing
      const guard = await run(fs, { wren: false });
      rows(true);
      expect(differ(guard.hash, (await run(fs, { wren: false })).hash), `${name}: guard`).toBe(0);
      setMixamo(false);
    }
  }, 600_000);

  it('(a2) the Mixamo source with the rows on: the non-kit team moves and locomotion; the capture hang after a pull', async () => {
    setMixamo(true);
    for (const [name, make] of PLAIN_SCENES) {
      const fs = make();
      rows(false);
      const base = await run(fs);
      rows(true);
      expect(differ(base.hash, (await run(fs)).hash), name).toBe(0);
    }
    // a lip hang straight after a pull plays #477's capture hang (no skip left behind); the pull's own hang skips
    rows(true);
    const fs = climberPull(false, 1.5);
    const R = await run(fs);
    const nPull = Math.round(0.3 * 60) + Math.round(P.landT * 60) + Math.round(P.haul * 60) + Math.round(P.scramble * 60);
    const hangPull = R.trav.map((t, k) => (k < nPull && t === 'hang' ? k : -1)).filter((k) => k >= 0);
    expect(hangPull.length).toBeGreaterThan(10);
    expect(hangPull.every((k) => !R.mx[k])).toBe(true);
    expect(R.mx.slice(nPull + 6).every((m) => m)).toBe(true);
  }, 300_000);
});

describe('mixamo-kit (b): on, each pose id plays its take at the table time', () => {
  const CLIP: Readonly<Record<string, KeyedClip | null>> = {
    pullCatch: MOCAP_KNEELING_PULL_UP,
    pullHaul: MOCAP_KNEELING_PULL_UP,
    pullScramble: MOCAP_PULLING_UP_TO_A_LEDGE,
    shutterLift: MOCAP_LIFTING_HEAVY_OBJECT,
    shutterHold: MOCAP_LIFTING_HEAVY_OBJECT,
    crawlUnder: MOCAP_CRAWLING_PRONE,
  };

  it('the copies equal the game\'s numbers; the tables by rows (optional phases off, one row off leaves the rest)', () => {
    expect(KIT_SHOT.holdGap).toBe(SHUTTER.holdGap);
    expect(KIT_SHOT.crawlGap).toBe(SHUTTER.crawlGap);
    expect(KIT_SHOT.holdSpot).toBe(SHUTTER.holdSpot);
    expect(KIT_PULL.catchClose).toBe(PULL.catchClose);
    expect(KIT_PULL.landT).toBe(PULL.landT);
    expect(KIT_PULL.haul).toBe(PULL.haul);
    expect(KIT_PULL.scramble).toBe(PULL.scramble);
    // as shipped: the ledge and the crawl takes off by the A8 rule ((h))
    resolveKit();
    const T = KIT_TABLES[1];
    expect(T.pullScramble).toBeNull();
    expect(T.crawlUnder).toBeNull();
    expect(T.pullHaul).toBe(MOCAP_KNEELING_PULL_UP);
    expect(T.shutterLift).toBe(MOCAP_LIFTING_HEAVY_OBJECT);
    rows(true);
    for (const [id, c] of Object.entries(CLIP)) expect(T[id as KitPoseId], id).toBe(c);
    for (const id of ['pullOffer', 'pullJump', 'pullHang', 'shutterOffer', 'shutterDrop'] as const) expect(T[id], id).toBeNull();
    expect(T.any).toBe(true);
    for (const id of Object.keys(CLIP)) expect(KIT_TABLES[0][id as KitPoseId]).toBeNull();
    expect(KIT_TABLES[0].any).toBe(false);
    MIXAMO_ON.lifting_heavy_object = false;
    resolveKit();
    expect(T.shutterLift).toBeNull();
    expect(T.shutterHold).toBeNull();
    expect(T.pullHaul).toBe(MOCAP_KNEELING_PULL_UP);
    expect(T.crawlUnder).toBe(MOCAP_CRAWLING_PRONE);
    MIXAMO_ON.kit_shutter_drop = true;
    resolveKit();
    expect(T.shutterDrop).toBeNull();
    MIXAMO_ON.lifting_heavy_object = true;
    MIXAMO_ON.kit_pull_hang = true;
    resolveKit();
    expect(T.shutterDrop).toBe(MOCAP_LIFTING_HEAVY_OBJECT);
    expect(T.pullHang).toBe(MOCAP_PULLING_UP_TO_A_LEDGE);
    // every kit pose id is in the tables
    for (const m of Object.values(KIT_POSE_IDS)) for (const id of [...m.a, ...m.b]) expect(id in T).toBe(true);
  });

  it('the poser writes each mapped id\'s take and progress (Mixamo source); Hand writes none', () => {
    setMixamo(true);
    rows(true);
    const local: readonly (readonly [() => F[], readonly KitPoseId[]])[] = [
      [() => holderPull(false), ['pullCatch', 'pullHaul']],
      [() => holderShutter(false), ['shutterLift', 'shutterHold']],
      [() => climberPull(false), ['pullScramble']],
      [() => crawler(false), ['crawlUnder']],
    ];
    for (const [make, ids] of local) {
      const fs = make();
      const R = poserRun(fs);
      for (const id of ids) {
        const ks = fs.map((f, k) => (f.state === id && !(id.startsWith('shutter') && !(f.gap > KIT_SHOT.gapEps)) ? k : -1)).filter((k) => k >= 0);
        expect(ks.length, id).toBeGreaterThan(5);
        for (const k of ks) expect(R.clip[k], `${id} @${k}`).toBe(CLIP[id]);
        const f = fs[ks[5]!]!;
        const kt = id === 'pullCatch' ? f.k * P.catchClose : id === 'pullHaul' ? f.k * (P.haul + P.scramble) : id === 'pullScramble' ? f.k : NaN;
        if (Number.isFinite(kt)) expect(R.time[ks[5]!], id).toBe(kitShotTime(id, kt));
      }
      // nothing for the optional phases (rows off) and nothing under the Hand source
      for (let k = 0; k < fs.length; k++) if (['pullOffer', 'pullJump', 'pullHang', 'shutterOffer'].includes(fs[k]!.state)) expect(R.clip[k]).toBeNull();
      setMixamo(false);
      expect(poserRun(fs).clip.every((c) => c === null)).toBe(true);
      setMixamo(true);
    }
    // the lift's progress is the gap's; the hold ping-pongs on its own clock; the crawl's phase is the distance's
    expect(kitClipTime('shutterLift', 0.5)).toBeCloseTo((KIT_SHOT.lift0 + KIT_SHOT.lift1) / 2, 12);
    expect(kitClipTime('shutterHold', 0)).toBe(KIT_SHOT.lift1);
    expect(kitClipTime('shutterHold', KIT_SHOT.hold1 - KIT_SHOT.lift1)).toBeCloseTo(KIT_SHOT.hold1, 12);
    expect(kitClipTime('shutterHold', 2 * (KIT_SHOT.hold1 - KIT_SHOT.lift1))).toBeCloseTo(KIT_SHOT.lift1, 12);
    expect(kitClipTime('crawlUnder', KIT_SHOT.crawlCycle * KIT_SHOT.crawlStretch * 0.25)).toBeCloseTo(KIT_SHOT.crawlSec / 4, 12);
    expect(kitClipTime('pullHaul', P.haul)).toBeCloseTo(KIT_SHOT.haul1, 12);
    expect(kitClipTime('pullHaul', P.haul + P.scramble)).toBeCloseTo(KIT_SHOT.pullSec, 12);
    expect(kitClipTime('pullCatch', P.catchClose * 2)).toBeCloseTo(KIT_SHOT.catch1, 12);
  });

  it('the graph samples the take at the shot\'s progress: whole on a free body (keyShot), mixed by weight on foot', () => {
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.keyedOk = true;
    i.ready = true;
    i.grounded = true;
    i.traverse = 'brace';
    const K = g.kit;
    const c = MOCAP_LIFTING_HEAVY_OBJECT!;
    K.clip = c;
    K.mode = 'shot';
    K.time = 0.6;
    K.weight = 1;
    for (let n = 0; n < 12; n++) g.update(DT, i);
    expect(g.out.keyShot).toBe(1);
    const want = sampleKeyed(c, (0.6 * (c.frames - 1)) / c.frames, 1, newKeyedPose());
    // (copied with mixKeyed: the quaternions renormalised, so to the last bits)
    for (let c = 0; c < 16; c++) expect(g.out.keyed.q[c]!).toBeCloseTo(want.q[c]!, 12);
    for (let c = 0; c < 12; c++) expect(g.out.keyed.arm[c]!).toBeCloseTo(want.arm[c]!, 12);
    // the shot gone: the weight eases out over KIT_SHOT.flip, holding the take
    K.weight = 0;
    g.update(DT, i);
    expect(g.out.keyShot).toBeCloseTo(1 - DT / KIT_SHOT.flip, 9);
    for (let n = 0; n < 8; n++) g.update(DT, i);
    expect(g.out.keyShot).toBe(0);
    // on foot (the crawler): mixed over the keyed pose, keyShot 0
    i.traverse = 'none';
    i.crouch = 1;
    K.clip = MOCAP_CRAWLING_PRONE;
    K.mode = 'loop';
    K.time = 0.3;
    K.weight = 1;
    const g2 = new AnimGraph(proportions('average', 1.68));
    g2.wrenReady = true;
    for (let n = 0; n < 30; n++) {
      g.update(DT, i);
      g2.update(DT, i);
    }
    expect(g.out.keyShot).toBe(0);
    // the prone take's pelvis (0.89 m under rest) by the weight, under the crouched set's
    expect(g.out.keyed.pel[1]!).toBeLessThan(g2.out.keyed.pel[1]! - 0.3);
  });

  it('the frame dump: each segment boundary against the takes\' pelvis and wrist keys (listed in KIT-REPORT.md)', () => {
    const S = KIT_SHOT;
    const at = (c: KeyedClip, sec: number, total: number): { pelY: number; wristY: number } => {
      const p = sampleKeyed(c, ((sec / total) * (c.frames - 1)) / c.frames, 1, newKeyedPose());
      return { pelY: +p.pel[1]!.toFixed(3), wristY: +((p.arm[4]! + p.arm[10]!) / 2).toFixed(3) };
    };
    const dump: Record<string, unknown> = {};
    for (const s of [0, S.catch0, S.catch1, 2.1, 2.7, S.haul1, S.pullSec]) dump[`kneel ${s}`] = at(MOCAP_KNEELING_PULL_UP!, s, S.pullSec);
    for (const s of [0, 1.4, S.scram0, 3.1, S.ledgeSec]) dump[`ledge ${s}`] = at(MOCAP_PULLING_UP_TO_A_LEDGE!, s, S.ledgeSec);
    for (const s of [S.offer0, S.lift0, S.lift1, S.hold1, S.drop1, S.liftSec]) dump[`lift ${s}`] = at(MOCAP_LIFTING_HEAVY_OBJECT!, s, S.liftSec);
    console.info('(mixamo-kit) frame dump (pelvis y, mean wrist y from the shoulder, at s):', JSON.stringify(dump));
    // the lift: the pelvis rises out of the squat over the lift segment, holds through the hold, sinks over the drop
    const L = (sec: number): number => at(MOCAP_LIFTING_HEAVY_OBJECT!, sec, S.liftSec).pelY;
    expect(L(S.lift1)).toBeGreaterThan(L(S.lift0) + 0.15);
    expect(Math.abs(L(S.hold1) - L(S.lift1))).toBeLessThan(0.05);
    expect(L(S.drop1)).toBeLessThan(L(S.hold1) - 0.1);
    // the kneeling take: the catch reaches the hands up (wrists over 20 cm higher by its end); the haul brings them back down
    const Kn = (sec: number): number => at(MOCAP_KNEELING_PULL_UP!, sec, S.pullSec).wristY;
    expect(Kn(S.catch1)).toBeGreaterThan(Kn(S.catch0) + 0.2);
    expect(Kn(S.haul1)).toBeLessThan(Kn(S.catch1));
    // the ledge take's rise starts after the scramble's start (the pelvis climbs past it)
    expect(at(MOCAP_PULLING_UP_TO_A_LEDGE!, S.ledgeSec, S.ledgeSec).pelY).toBeGreaterThan(at(MOCAP_PULLING_UP_TO_A_LEDGE!, S.scram0, S.ledgeSec).pelY);
    // the crawl's travel a cycle (its clip feet stride, 1.75 m units) is the table's 0.54 m within 15 %
    const stride = MOCAP_CRAWLING_PRONE.stride;
    console.info(`(mixamo-kit) crawling_prone stride ${stride} (KIT_SHOT.crawlCycle ${S.crawlCycle})`);
    expect(Math.abs(stride - S.crawlCycle) / S.crawlCycle).toBeLessThan(0.15);
  });
});

describe('mixamo-kit (c): both screens give the same take and clip time', () => {
  it('the pull: the holder on its own page and on the partner\'s page; the partner on both', () => {
    setMixamo(true);
    resolveKit();
    const a = newTeamPoseIn();
    const b = newTeamPoseIn();
    const me = newTeamPoseIn();
    for (let t = 0; t <= P.catchClose; t += DT) {
      // holder's page: its catch clock; partner's page: our climber's jump at the same host time
      KIT_POSE_LOCAL.k = Math.min(1, t / P.catchClose);
      teamPoseOfState('pullCatch', 0, a);
      KIT_POSE_LOCAL.k = t / P.landT;
      teamPoseOfState('pullJump', 0, me);
      teamLinkFrame(DT, 'p2', me, 0, -3, 0.6, Math.PI);
      teamPoseOfWire('brace', 8, 0, 0, 'p2', b);
      expect(b.kit).toBe('pullCatch');
      expect(Math.abs(kitShotTime('pullCatch', a.kt) - kitShotTime('pullCatch', b.kt))).toBeLessThan(1e-12);
    }
    for (let tau = 0; tau <= P.haul + P.scramble; tau += DT) {
      KIT_POSE_LOCAL.k = tau / (P.haul + P.scramble);
      teamPoseOfState('pullHaul', 0, a);
      const hang = tau < P.haul;
      KIT_POSE_LOCAL.k = hang ? tau / P.haul : (tau - P.haul) / P.scramble;
      teamPoseOfState(hang ? 'pullHang' : 'pullScramble', 0, me);
      teamLinkFrame(DT, 'p2', me, 0, -2, 0.6, Math.PI);
      teamPoseOfWire('brace', 8, 0, 0, 'p2', b);
      expect(b.kit).toBe('pullHaul');
      expect(Math.abs(kitShotTime('pullHaul', a.kt) - kitShotTime('pullHaul', b.kt))).toBeLessThan(1e-9);
      // the partner: our own scramble's k on our page, its wire ph on the holder's
      if (!hang) {
        clearLink();
        teamPoseOfWire('boost', 8, 0, me.kt, 'p2', b);
        expect(b.kit).toBe('pullScramble');
        expect(kitShotTime('pullScramble', b.kt)).toBe(kitShotTime('pullScramble', me.kt));
      }
    }
  });

  it('the shutter: a stepwise 20 Hz wire gap and the 60 Hz local gap give the same phase every frame, the time within a step', () => {
    setMixamo(true);
    resolveKit();
    const L = poserRun(holderShutter(false));
    const R = poserRun(holderShutter(true));
    const fs = holderShutter(false);
    // the phase: the take on or off together, and the same segment (lift / hold) every frame
    // (the wire carries a gap up to 2 frames late: on / off may differ only in the 2 frames after a local change)
    let maxDt = 0;
    let late = 0;
    for (let k = 0; k < fs.length; k++) {
      const same = (R.clip[k] === null) === (L.clip[k] === null);
      const off = (j: number): boolean => j < 0 || L.clip[j] === null;
      const changed = off(k) !== off(k - 1) || off(k - 1) !== off(k - 2);
      if (!same) {
        late++;
        expect(changed, `frame ${k} ${fs[k]!.state}`).toBe(true);
      }
      if (same && L.clip[k] !== null) maxDt = Math.max(maxDt, Math.abs(L.time[k]! - R.time[k]!) * KIT_SHOT.liftSec);
    }
    expect(late).toBeLessThanOrEqual(4);
    // one wire step (3 frames) of the lift: the gap's 0.9 m over 1.2 s, the clip's lift segment over g
    const step = (3 * DT / SHUTTER.liftTime) * (KIT_SHOT.lift1 - KIT_SHOT.lift0) + 0.01 * (KIT_SHOT.lift1 - KIT_SHOT.lift0);
    console.info(`(mixamo-kit) shutter: local vs wire clip time, worst ${maxDt.toFixed(3)} s (one wire step ${step.toFixed(3)} s)`);
    // (the worst falls on the lift -> hold switch, which the wire sees up to a step late: two steps)
    expect(maxDt).toBeLessThanOrEqual(2 * step);
    // the rule itself: the trend holds on an unchanged gap, a shut gap is the offer
    expect(kitGapTrend(0.5, 0.5, 1)).toBe(1);
    expect(kitGapTrend(0.4, 0.5, 1)).toBe(-1);
    expect(kitShutterPhase(0.9, 1)).toBe('shutterHold');
    expect(kitShutterPhase(0.9, 0)).toBe('shutterHold');
    expect(kitShutterPhase(0.88, -1)).toBe('shutterDrop');
    expect(kitShutterPhase(NaN, 1)).toBe('shutterOffer');
    expect(kitShutterPhase(0.3, 1)).toBe('shutterLift');
  });

  it('the crawl: both pages fed the same root path give the same phase', () => {
    setMixamo(true);
    rows(true);
    const L = poserRun(crawler(false));
    const R = poserRun(crawler(true));
    let n = 0;
    for (let k = 0; k < L.clip.length; k++) {
      expect(R.clip[k] === null).toBe(L.clip[k] === null);
      if (L.clip[k] !== null) {
        expect(R.time[k]).toBe(L.time[k]);
        n++;
      }
    }
    expect(n).toBeGreaterThan(60);
  });
});

describe('mixamo-kit (c2): the per-rig source (G400)', () => {
  it('two rigs, two sources, one frame: the Mixamo rig draws the take, the other today\'s pose; swapping swaps; both skip the hang', () => {
    resolveKit();
    const A = fakeRig();
    const B = fakeRig();
    setKitSourceOf((r) => (r === A ? 1 : 0));
    const fs = holderShutter(false);
    const ra = poserRun(fs, A);
    const rb = poserRun(fs, B);
    expect(ra.clip.some((c) => c === MOCAP_LIFTING_HEAVY_OBJECT)).toBe(true);
    expect(rb.clip.every((c) => c === null)).toBe(true);
    setKitSourceOf((r) => (r === B ? 1 : 0));
    expect(poserRun(fs, A).clip.every((c) => c === null)).toBe(true);
    expect(poserRun(fs, B).clip).toEqual(ra.clip);
    // the pull's hang: move / role written on both rigs (a kit row is on), whatever their source
    const cp = climberPull(false);
    const ha = poserRun(cp, A);
    const hb = poserRun(cp, B);
    const hangK = cp.map((f, k) => (f.state === 'pullHang' ? k : -1)).filter((k) => k >= 0);
    for (const k of hangK) {
      expect([ha.move[k], ha.role[k], hb.move[k], hb.role[k]]).toEqual(['pull', 'a', 'pull', 'a']);
    }
  });

  it('a non-Mixamo rig under a Mixamo viewer is today\'s pose bit for bit and keeps the hand-made HANG; a Mixamo rig under Hand draws the take', async () => {
    setMixamo(true);
    const fs = holderShutter(false);
    rows(false);
    const base = await run(fs);
    rows(true);
    setKitSourceOf(() => 0);
    expect(differ(base.hash, (await run(fs)).hash)).toBe(0);
    // a CMU partner on a Mixamo screen: the pull hang skips the capture (the hand-made HANG)
    const cp = climberPull(false);
    const R = await run(cp);
    const hangK = R.trav.map((t, k) => (t === 'hang' ? k : -1)).filter((k) => k >= 0);
    expect(hangK.length).toBeGreaterThan(10);
    expect(hangK.every((k) => !R.mx[k])).toBe(true);
    // the other way: the viewer on Hand, the rig's player on Mixamo
    setMixamo(false);
    setKitSourceOf(() => 1);
    const on = await run(fs);
    expect(differ(base.hash, on.hash)).toBeGreaterThan(30);
    expect(on.shotW.some((w) => w > 0)).toBe(true);
  }, 300_000);
});

describe('mixamo-kit (d) timing, (e) the hang skip', () => {
  it('(d) the root, the traverse and the input\'s game fields are the same with the shot on and off', async () => {
    setMixamo(true);
    for (const [name, make] of KIT_SCENES) {
      const fs = make();
      rows(false);
      const off = await run(fs);
      rows(true);
      const on = await run(fs);
      expect(differ(off.timing, on.timing), name).toBe(0);
      // and the shot shows (it is on)
      if (!name.startsWith('pull partner (remote)')) expect(on.shotW.some((w) => w > 0), name).toBe(true);
    }
  }, 600_000);

  it('(e) under the Mixamo source the pull partner\'s hang is the hand-made HANG, local and remote; rows off it is the capture', async () => {
    setMixamo(true);
    for (const remote of [false, true]) {
      const fs = climberPull(remote);
      rows(true);
      const on = await run(fs);
      rows(false);
      const off = await run(fs);
      const hangK = on.trav.map((t, k) => (t === 'hang' ? k : -1)).filter((k) => k >= 0);
      expect(hangK.length).toBeGreaterThan(10);
      expect(hangK.every((k) => !on.mx[k]), `remote ${remote}`).toBe(true);
      expect(hangK.some((k) => off.mx[k]), `remote ${remote} (capture rows off)`).toBe(true);
    }
  }, 300_000);
});

describe('mixamo-kit (f) no pop, (h) the A8 readings', () => {
  /** Per kit scene: the shot on against the placeholder (rows off). */
  const READ: Record<string, { on: ReturnType<typeof steps>; off: ReturnType<typeof steps>; wingOn: number; wingOff: number; bowOn: number; bowOff: number }> = {};

  it('(f) entry, exit, each phase change and a source flip mid-move under the placeholder\'s own steps x 2; the palms on the bar', async () => {
    setMixamo(true);
    for (const [name, make] of KIT_SCENES) {
      const fs = make();
      rows(false);
      const off = await run(fs);
      rows(true);
      const on = await run(fs);
      const so = steps(on);
      const sf = steps(off);
      const w = (R: Out): number => elbowWing(R.jw[J('shoulderL')]!, R.jw[J('shoulderR')]!, R.jw[J('elbowL')]!, R.jw[J('elbowR')]!, 1).max;
      const b = (R: Out): number => kneeBow(R.jw[J('hipL')]!, R.jw[J('hipR')]!, R.jw[J('kneeL')]!, R.jw[J('kneeR')]!, R.jw[J('ankleL')]!, R.jw[J('ankleR')]!, 1).max;
      READ[name] = { on: so, off: sf, wingOn: w(on), wingOff: w(off), bowOn: b(on), bowOff: b(off) };
    }
    console.info('(mixamo-kit) A8 per scene (cm a frame: step / velocity pop; m: elbow wing, knee bow), on vs placeholder:\n' + Object.entries(READ).map(([n, r]) => `  ${n}: step ${r.on.step.toFixed(2)} @${r.on.at} ${r.on.joint} (${r.off.step.toFixed(2)}), pop ${r.on.pop.toFixed(2)} (${r.off.pop.toFixed(2)}), wing ${r.wingOn.toFixed(3)} (${r.wingOff.toFixed(3)}), bow ${r.bowOn.toFixed(3)} (${r.bowOff.toFixed(3)})`).join('\n'));
    // a mid-move source flip (Mixamo -> Hand -> Mixamo) through the hold
    const fs = holderShutter(false);
    const k0 = Math.round((0.4 + SHUTTER.liftTime + 0.5) * 60);
    const flip = await run(fs, { each: (k) => (k === k0 ? setMixamo(false) : k === k0 + 30 ? setMixamo(true) : undefined) });
    setMixamo(true);
    const hold = await run(fs);
    const sFlip = steps(flip, k0 - 2, k0 + 45);
    const sHold = steps(hold, k0 - 2, k0 + 45);
    console.info(`(mixamo-kit) source flip mid-hold: step ${sFlip.step.toFixed(2)} pop ${sFlip.pop.toFixed(2)} (no flip: ${sHold.step.toFixed(2)} / ${sHold.pop.toFixed(2)})`);
    expect(sFlip.step).toBeLessThanOrEqual(Math.max(2 * READ['shutter holder (local)']!.off.step, 2));
    // the palms on the bar through the hold (the shot fully in): within 1 cm; the lift's low bar reported
    const fsL = holderShutter(false);
    const holdK = fsL.map((f, k) => (f.state === 'shutterHold' && k > 0 && fsL[k - 12]!.state === 'shutterHold' ? k : -1)).filter((k) => k >= 0);
    const liftK = fsL.map((f, k) => (f.state === 'shutterLift' ? k : -1)).filter((k) => k >= 0);
    const worst = (ks: number[]): number => ks.reduce((m, k) => (Number.isNaN(hold.palm[k]!) ? m : Math.max(m, hold.palm[k]!)), 0);
    console.info(`(mixamo-kit) palms vs the bar: hold ${(worst(holdK) * 100).toFixed(2)} cm, lift ${(worst(liftK) * 100).toFixed(2)} cm`);
    expect(holdK.every((k) => !Number.isNaN(hold.palm[k]!))).toBe(true);
    expect(worst(holdK)).toBeLessThanOrEqual(0.01);
  }, 900_000);

  it('(h) the rows: a take stays on unless a joint jumps over 2x the placeholder\'s (the I2 rule)', () => {
    const scene: Record<(typeof TAKES)[number], string[]> = {
      kneeling_pull_up: ['pull holder (local)', 'pull holder (remote)'],
      pulling_up_to_a_ledge: ['pull partner (local)', 'pull partner (remote)'],
      lifting_heavy_object: ['shutter holder (local)', 'shutter holder (remote)'],
      crawling_prone: ['crawler (local)', 'crawler (remote)'],
    };
    for (const t of TAKES) {
      const broken = scene[t].some((n) => READ[n] !== undefined && READ[n]!.on.step > Math.max(2 * READ[n]!.off.step, 2));
      expect(ON0[t], t).toBe(!broken);
    }
  });
});

describe('mixamo-kit (i) no stale shot', () => {
  it('(i) the shot is cleared after a pull ends, aborts and misses, after a shutter, and on a non-kit move after a kit move', () => {
    setMixamo(true);
    resolveKit();
    const ends: F[][] = [];
    // ends: the holder's haul, then nothing
    ends.push(holderPull(false));
    // aborts: the partner gone mid-haul (the climber falls back to its jump), then nothing
    const ab: F[] = [];
    seg(ab, 0.3, (u) => ({ grounded: false, state: 'pullHang', k: u, trav: 'hang', travT: u }));
    seg(ab, 0.3, (u) => ({ grounded: false, state: 'pullJump', k: u, trav: 'hop' }));
    seg(ab, 0.5, () => ({}));
    ends.push(ab);
    // misses: the catch window passes, the holder back in the offer, then gone
    const ms: F[] = [];
    seg(ms, P.catchClose, (u) => ({ state: 'pullCatch', k: u }));
    seg(ms, 0.5, () => ({ state: 'pullOffer' }));
    seg(ms, 0.5, () => ({}));
    ends.push(ms);
    ends.push(holderShutter(false));
    // a hang-down and a rope straight after a pull
    ends.push([...climberPull(false), ...plain([['hanging', 1]], { grounded: false, trav: 'hang' }), ...plain([['ropeHold', 1]])]);
    for (const fs of ends) {
      const r = poserRun(fs);
      // between frames (after end) never a shot, a source or a move
      expect(r.after.every((K) => K.weight === 0 && !K.mx && K.move === '' && K.role === '')).toBe(true);
      // and inside a frame nothing on a frame with no kit move
      for (let k = 0; k < fs.length; k++) {
        const f = fs[k]!;
        const kit = /^(pull|shutter|crawl)/.test(f.state);
        if (!kit) expect([r.w[k], r.move[k], r.role[k]], `frame ${k} ${f.state}`).toEqual([0, '', '']);
      }
    }
  });
});
