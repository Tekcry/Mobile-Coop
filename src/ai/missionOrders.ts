/**
 * Mission orders (pure: no Babylon / DOM, no `src/game` import), unit-tested (guard-ai-mission-hooks S1a, D7, A1-A8).
 *
 * An order is a mission event (`{name, guardTag, postId, via?}`) that sends the tagged guard of the live section on a
 * calm walk: by `via` (if any) to the post, look round `ORDER.lookT` s, back to his route (`walk`); or to the post's
 * breaker board, work it and turn every listed circuit back on (`reset`, A3: the post carries `circuits`). A tag
 * matches a guard by his `zone` tag or his mission id `<sectionId>:<k>` (A1); a post or via resolves to a mission post,
 * else a room centre (A2). A post with a `bell` is a sound: only a tagged guard who hears it comes (A4).
 *
 * The offer rule (A6, PLAN Design 1, one table for every kind): an order is offered ONCE, at its event, to the tagged
 * guards eligible at that moment; a tagged slot not placed yet is offered it once at its placement; a woken guard never.
 * An ineligible guard is recorded dropped with its cause and never picks it up later. The manager and `Enemy` apply the
 * rule; this module holds the board (`OrderBoard`: who is on which order, and how it stands), the walk stepper
 * (`OrderLeg`) and the data check Campaign Build's mission tests run (`checkMissionOrders`, C4).
 *
 * Yaw convention as `Enemy`: radians, 0 = +Z, yaw = atan2(dx, dz).
 *
 * Allocation-free per step: `OrderBoard` is sized once (fixed slots, typed-array member lists) and never reallocates;
 * each Enemy reuses one `OrderLeg` and its goal object. Strings are only assigned (references). Allocation happens at
 * event / data time only (`matchesTag`'s concat, `checkMissionOrders`).
 */
import { hyp2 } from '../core/mathx';
import { ambientDb, effectiveReach, hearTier, type HearTier, type NoisySource } from './hearing';
import { POST, type PostDef } from './posts';
import type { RoomRect } from '../world/rooms';

export type OrderKind = 'reset' | 'walk';

/** A mission post (`MissionDef.posts`, Campaign Build C2): a point the order walks to. */
export interface MissionPost {
  id: string;
  x: number;
  z: number;
  /** Floor height of its storey (default: the lowest walkable layer). */ y?: number;
  /** Facing for the look-round (rad, 0 = +Z); none = his arrival heading. */ yaw?: number;
  /** A breaker board: every circuit of it (integers >= 0). Present = a `reset` order (A3). */
  circuits?: number[];
  /** A bell (A4): the order is a sound at (x, y, z) heard to `reach` m (walls, masking). */
  bell?: { x: number; y: number; z: number; reach: number };
}

/** The engine's `missionEvent` payload (structural: no import of `src/game`). */
export interface OrderEvent { name: string; guardTag: string; postId: string; via?: string }

export type OrderPhase = 'none' | 'offered' | 'gathering' | 'walking' | 'arrived' | 'done' | 'dropped';

/** A section as `checkMissionOrders` reads it (a `SectorDef` satisfies it). */
export interface OrderSection {
  id: string;
  guards: readonly { x: number; z: number; y?: number; zone?: string; post?: PostDef }[];
  noisy?: readonly NoisySource[];
}

/** Order numbers (prototype starting values, G4). */
export const ORDER = {
  /** Time (s) he looks round at the post before he goes back to his route (A5). */ lookT: 8,
  /** (S1b) Time (s) a group waits at its via for the other members before it leaves (A6). */ joinWait: 20,
  /** (S1b) Gap (m) a follower keeps behind the group's first member (A6). */ followGap: 1.5,
  /** Radius (m) at which he has passed the via. */ atVia: 2.5,
  /** Longest walk (s) to the post: past it the order is dropped (a blocked or endless path). */ giveUp: 120,
  /** Lowest bell hearing tier at which a tagged guard comes (1: anywhere inside the effective reach; A4). */ bellTier: 1,
  /** Orders on the board at once (fixed slots). */ maxOrders: 8,
  /** Guards on one order at most. */ maxMembers: 4,
  /** (S1a-a) Radius (m) at which he is at the post (and on its storey, `STOREY`). */ arrive: 0.8,
} as const;

/** Height gap (m) within which he is on the post's storey (as the breaker walk). */
const STOREY = 1.2;

/** Does a mission tag name this guard: his `zone` tag, or his mission id `<sectionId>:<k>` (A1)? `k` = his index in
 *  the section's guards (-1: none). Event / placement time only (the concat allocates). */
export function matchesTag(tag: string, zone: string, sectionId: string, k: number): boolean {
  if (tag === '') return false;
  if (zone === tag) return true;
  return k >= 0 && sectionId !== '' && tag === sectionId + ':' + k;
}

/** The mission post with this id; null when none. */
export function findPost(id: string, posts: readonly MissionPost[]): MissionPost | null {
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]!;
    if (p.id === id) return p;
  }
  return null;
}

/** Resolve a post / via id (A2): a mission post first (`out` = x, y ?? NaN, z, yaw ?? NaN), else the room with that
 *  id (its centre on its storey: y = `minY` ?? NaN, yaw NaN). False when neither. `out` length >= 4. */
export function resolvePoint(id: string, posts: readonly MissionPost[], rooms: readonly RoomRect[], out: Float32Array): boolean {
  const p = findPost(id, posts);
  if (p) {
    out[0] = p.x;
    out[1] = p.y ?? Number.NaN;
    out[2] = p.z;
    out[3] = p.yaw ?? Number.NaN;
    return true;
  }
  for (let i = 0; i < rooms.length; i++) {
    const r = rooms[i]!;
    if (r.id !== id) continue;
    out[0] = (r.minX + r.maxX) / 2;
    out[1] = r.minY ?? Number.NaN;
    out[2] = (r.minZ + r.maxZ) / 2;
    out[3] = Number.NaN;
    return true;
  }
  return false;
}

/** Member states on an order. */
export const M_WALKING = 0, M_ARRIVED = 1, M_DONE = 2, M_DROPPED = 3;
/** Order kinds on the board (`OrderKind` as a number). */
export const K_WALK = 0, K_RESET = 1;

/** Is this member state live (on his way or at the post)? */
function liveSt(st: number): boolean {
  return st === M_WALKING || st === M_ARRIVED;
}

/**
 * Every mission order in hand: `ORDER.maxOrders` fixed slots of `ORDER.maxMembers` members each, sized once. A slot
 * holds the order's name, kind, resolved points, a reference to its circuits and bell, a pending tag (a slot not placed
 * at the event, A6), the last drop cause and its members (`Enemy.num`, -1 empty; any id, no bitmask). The phase follows
 * from the members (`refresh`). The manager fills the points and the pending tag directly (index `slot * 3`).
 */
export class OrderBoard {
  readonly slots = ORDER.maxOrders;
  readonly per = ORDER.maxMembers;
  /** Order name per slot ('' = free). */
  readonly name: string[] = new Array<string>(ORDER.maxOrders).fill('');
  readonly phase: OrderPhase[] = new Array<OrderPhase>(ORDER.maxOrders).fill('none');
  /** `K_WALK` / `K_RESET`. */
  readonly kind = new Uint8Array(ORDER.maxOrders);
  /** The stand point at the post: x, y (NaN: any storey), z. */
  readonly pt = new Float32Array(ORDER.maxOrders * 3).fill(Number.NaN);
  /** The face point x, z (a reset: the board's switch; NaN none), then the post yaw (NaN none). */
  readonly face = new Float32Array(ORDER.maxOrders * 3).fill(Number.NaN);
  /** The via point x, y, z (NaN x = no via). */
  readonly via = new Float32Array(ORDER.maxOrders * 3).fill(Number.NaN);
  /** The post's circuits (a reference, never copied); null for a walk. */
  readonly circuits: (readonly number[] | null)[] = new Array<readonly number[] | null>(ORDER.maxOrders).fill(null);
  /** The post's bell (a reference); null none. */
  readonly bell: (MissionPost['bell'] | null)[] = new Array<MissionPost['bell'] | null>(ORDER.maxOrders).fill(null);
  /** A tag with no placed guard at the event ('' none): offered once at his placement (A6). */
  readonly pend: string[] = new Array<string>(ORDER.maxOrders).fill('');
  /** The last drop cause (dev log, tests). */
  readonly cause: string[] = new Array<string>(ORDER.maxOrders).fill('');
  /** Open order (higher = newer): the oldest ended slot is reused first. */
  readonly seq = new Uint32Array(ORDER.maxOrders);
  /** Members (`Enemy.num`, -1 empty), `per` per slot. */
  readonly mem = new Int32Array(ORDER.maxOrders * ORDER.maxMembers).fill(-1);
  /** Member state (`M_*`). */
  readonly memSt = new Uint8Array(ORDER.maxOrders * ORDER.maxMembers);
  /** Members per slot. */
  readonly memN = new Uint8Array(ORDER.maxOrders);
  /** Members walking or arrived over every slot (the manager's per-step gate). */
  live = 0;
  /** Slots with a pending tag. */
  pendN = 0;
  private nextSeq = 0;

  /** The slot of the order `name` (any phase but 'none'); -1 none. */
  find(name: string): number {
    if (name === '') return -1;
    for (let s = 0; s < this.slots; s++) if (this.name[s] === name && this.phase[s] !== 'none') return s;
    return -1;
  }

  /** Is the slot's order still running (members may join it)? */
  isLive(slot: number): boolean {
    const p = this.phase[slot];
    return p === 'offered' || p === 'gathering' || p === 'walking' || p === 'arrived';
  }

  /** A slot for the order `name` of `kind`: its slot while it runs (members join it; kind kept); else a fresh order
   *  (S1a-j) in its own ended slot, the first free slot, or the ended slot opened longest ago. -1: every slot runs. */
  open(name: string, kind: number): number {
    const own = this.find(name);
    if (own >= 0 && this.isLive(own)) return own;
    let s = own;
    if (s < 0) for (let i = 0; i < this.slots && s < 0; i++) if (this.name[i] === '') s = i;
    if (s < 0) {
      let best = 0xffffffff;
      for (let i = 0; i < this.slots; i++) {
        if (this.isLive(i)) continue;
        const q = this.seq[i]!;
        if (q < best) {
          best = q;
          s = i;
        }
      }
    }
    if (s < 0) return -1;
    this.reset(s);
    this.name[s] = name;
    this.kind[s] = kind;
    this.phase[s] = 'offered';
    this.seq[s] = ++this.nextSeq;
    return s;
  }

  /** Free one slot (keeps `live` and `pendN` exact). */
  private reset(s: number): void {
    const base = s * this.per;
    for (let j = 0; j < this.memN[s]!; j++) if (liveSt(this.memSt[base + j]!)) this.live--;
    this.mem.fill(-1, base, base + this.per);
    this.memSt.fill(0, base, base + this.per);
    this.memN[s] = 0;
    if (this.pend[s] !== '') this.pendN--;
    this.pend[s] = '';
    this.name[s] = '';
    this.phase[s] = 'none';
    this.kind[s] = K_WALK;
    this.pt.fill(Number.NaN, s * 3, s * 3 + 3);
    this.face.fill(Number.NaN, s * 3, s * 3 + 3);
    this.via.fill(Number.NaN, s * 3, s * 3 + 3);
    this.circuits[s] = null;
    this.bell[s] = null;
    this.cause[s] = '';
    this.seq[s] = 0;
  }

  /** Index in `mem` of guard `num` on the slot; -1 none. */
  private at(slot: number, num: number): number {
    const base = slot * this.per;
    for (let j = 0; j < this.memN[slot]!; j++) if (this.mem[base + j] === num) return base + j;
    return -1;
  }

  /** Put guard `num` on the slot in state `st` (`cause`: why he dropped). Already a member: as `set`, except that a
   *  dropped offer never drops a member on his way. False: `maxMembers` full (not added). */
  add(slot: number, num: number, st: number, cause = ''): boolean {
    const i = this.at(slot, num);
    if (i >= 0) {
      if (!(st === M_DROPPED && liveSt(this.memSt[i]!))) this.set(slot, num, st, cause);
      else if (cause !== '') this.cause[slot] = cause;
      return true;
    }
    const n = this.memN[slot]!;
    if (n >= this.per) return false;
    const j = slot * this.per + n;
    this.mem[j] = num;
    this.memSt[j] = st;
    this.memN[slot] = n + 1;
    if (liveSt(st)) this.live++;
    if (cause !== '') this.cause[slot] = cause;
    this.refresh(slot);
    return true;
  }

  /** Move member `num` to state `st` (keeps `live` exact) and refresh the phase; not a member: nothing. */
  set(slot: number, num: number, st: number, cause = ''): void {
    const i = this.at(slot, num);
    if (i < 0) return;
    const was = liveSt(this.memSt[i]!);
    const now = liveSt(st);
    this.memSt[i] = st;
    if (was && !now) this.live--;
    else if (!was && now) this.live++;
    if (cause !== '') this.cause[slot] = cause;
    this.refresh(slot);
  }

  /** The phase from the members: any walking -> 'walking'; else any arrived -> 'arrived'; else a pending tag ->
   *  'offered'; else any done -> 'done'; else 'dropped'. A free slot stays 'none'. */
  refresh(slot: number): void {
    if (this.name[slot] === '') return;
    let walk = false;
    let arr = false;
    let done = false;
    const base = slot * this.per;
    for (let j = 0; j < this.memN[slot]!; j++) {
      const st = this.memSt[base + j]!;
      if (st === M_WALKING) walk = true;
      else if (st === M_ARRIVED) arr = true;
      else if (st === M_DONE) done = true;
    }
    this.phase[slot] = walk ? 'walking' : arr ? 'arrived' : this.pend[slot] !== '' ? 'offered' : done ? 'done' : 'dropped';
  }

  /** Members walking or arrived on the slot. */
  liveN(slot: number): number {
    let n = 0;
    const base = slot * this.per;
    for (let j = 0; j < this.memN[slot]!; j++) if (liveSt(this.memSt[base + j]!)) n++;
    return n;
  }

  /** Is circuit `group` one of the slot's? */
  hasCircuit(slot: number, group: number): boolean {
    const c = this.circuits[slot];
    if (!c) return false;
    for (let i = 0; i < c.length; i++) if (c[i] === group) return true;
    return false;
  }

  /** Does a running reset order (a member walking or at the board) hold circuit `group`? */
  holdsCircuit(group: number): boolean {
    if (this.live === 0) return false;
    for (let s = 0; s < this.slots; s++) {
      if (this.kind[s] === K_RESET && this.hasCircuit(s, group) && this.liveN(s) > 0) return true;
    }
    return false;
  }

  /** The order `name` cannot run (an unresolved post / via, a reset with no circuits, A2): a fresh slot reads
   *  'dropped' with `cause`; a running order of that name keeps its members (the cause is recorded). */
  fail(name: string, cause: string): void {
    const s = this.open(name, K_WALK);
    if (s < 0) return;
    this.cause[s] = cause;
    this.refresh(s);
  }

  /** Every slot free, `live` and `pendN` 0 (section load / restart, A8). The arrays are kept: identity never changes. */
  clear(): void {
    for (let s = 0; s < this.slots; s++) this.reset(s);
    this.live = 0;
    this.pendN = 0;
    this.nextSeq = 0;
  }
}

/** `OrderLeg` states. `LEG_WAIT_VIA` is S1b's (a group waiting at its via); S1a never enters it. */
export const LEG_NONE = 0, LEG_TO_VIA = 1, LEG_WAIT_VIA = 2, LEG_TO_POST = 3, LEG_LOOK = 4, LEG_RESET = 5, LEG_DONE = 6,
  LEG_GIVEUP = 7;

/** What `OrderLeg.step` asks of the guard this step (one reused object per leg). */
export interface OrderGoal {
  /** Where to walk (while `move`), else the point he stands at; y NaN = any storey. */ x: number; z: number; y: number;
  move: boolean;
  /** Facing (rad) while he stands; NaN: the caller's own. */ face: number;
}

function wrapPi(a: number): number {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

/**
 * One guard's walk on an order (one per Enemy, reused): to the via (if any) -> to the post -> look round
 * `ORDER.lookT` s (`walk`) or stand at the board facing its switch (`reset`, the caller ends it after
 * `BREAKER.resetT`) -> done. A walk longer than `ORDER.giveUp` s gives up. The caller moves the guard (nav, pace) to
 * the goal; perception stays the caller's.
 */
export class OrderLeg {
  state = LEG_NONE;
  /** Time (s) in the look / reset state. */
  t = 0;
  /** Time (s) walking (via and post legs). */
  walkT = 0;
  /** Bearing (rad) the look-round sweeps round: the post yaw, else his arrival heading. */
  base = 0;
  private sx = 0;
  private sz = 0;
  readonly goal: OrderGoal = { x: 0, z: 0, y: Number.NaN, move: false, face: Number.NaN };

  /** Start the order on `slot` from (x, z). */
  start(b: OrderBoard, slot: number, x: number, z: number): void {
    this.state = b.via[slot * 3]! === b.via[slot * 3]! ? LEG_TO_VIA : LEG_TO_POST;
    this.t = 0;
    this.walkT = 0;
    this.base = 0;
    this.sx = x;
    this.sz = z;
  }

  /** Off the order. */
  end(): void {
    this.state = LEG_NONE;
  }

  /** Advance `dt` s with the guard at (x, y, z); writes and returns the reused goal. */
  step(dt: number, b: OrderBoard, slot: number, x: number, y: number, z: number): OrderGoal {
    const g = this.goal;
    const i = slot * 3;
    let adv = dt;
    if (this.state === LEG_TO_VIA || this.state === LEG_TO_POST) {
      this.walkT += dt;
      if (this.walkT >= ORDER.giveUp) {
        this.state = LEG_GIVEUP;
        return this.idle();
      }
      if (this.state === LEG_TO_VIA) {
        const vx = b.via[i]!;
        const vz = b.via[i + 2]!;
        if (hyp2(vx - x, vz - z) > ORDER.atVia) {
          g.x = vx;
          g.y = b.via[i + 1]!;
          g.z = vz;
          g.move = true;
          g.face = Number.NaN;
          return g;
        }
        // past the via: the same step aims at the post, and the arrival heading is from the via
        this.state = LEG_TO_POST;
        this.sx = vx;
        this.sz = vz;
      }
      const px = b.pt[i]!;
      const py = b.pt[i + 1]!;
      const pz = b.pt[i + 2]!;
      if (hyp2(px - x, pz - z) > ORDER.arrive || (py === py && Math.abs(y - py) > STOREY)) {
        g.x = px;
        g.y = py;
        g.z = pz;
        g.move = true;
        g.face = Number.NaN;
        return g;
      }
      this.state = b.kind[slot] === K_RESET ? LEG_RESET : LEG_LOOK;
      this.t = 0;
      const yaw = b.face[i + 2]!;
      if (yaw === yaw) this.base = yaw;
      else {
        const dx = px - this.sx;
        const dz = pz - this.sz;
        this.base = dx * dx + dz * dz > 1e-6 ? Math.atan2(dx, dz) : 0;
      }
      // arrived: the look / reset goal from this step on (t = 0)
      adv = 0;
    }
    if (this.state === LEG_LOOK) {
      this.t += adv;
      if (this.t >= ORDER.lookT) {
        this.state = LEG_DONE;
        return this.idle();
      }
      this.stand(b, i);
      g.face = wrapPi(this.base + POST.lureSweep * Math.sin((2 * Math.PI * this.t) / POST.lureSweepPeriod));
      return g;
    }
    if (this.state === LEG_RESET) {
      this.t += adv;
      this.stand(b, i);
      const fx = b.face[i]!;
      const fz = b.face[i + 1]!;
      const dx = fx - x;
      const dz = fz - z;
      g.face = fx === fx && dx * dx + dz * dz > 1e-6 ? Math.atan2(dx, dz) : this.base;
      return g;
    }
    return this.idle();
  }

  /** Stand on the post's stand point. */
  private stand(b: OrderBoard, i: number): void {
    const g = this.goal;
    g.x = b.pt[i]!;
    g.y = b.pt[i + 1]!;
    g.z = b.pt[i + 2]!;
    g.move = false;
  }

  /** Nothing to do (none, done, given up). */
  private idle(): OrderGoal {
    this.goal.move = false;
    this.goal.face = Number.NaN;
    return this.goal;
  }
}

/** Is `c` a circuit number (an integer >= 0)? */
function isCircuit(c: number): boolean {
  return Number.isInteger(c) && c >= 0;
}

/**
 * Check a mission's order data (data time; allocates its result; Campaign Build's mission tests expect `[]`, C4):
 * every post id unique, a board's `circuits` non-empty integers >= 0, a `bell` reach finite > 0; per event, the tag
 * matches a guard of a section the mission runs, `postId` / `via` resolve (A2), no tagged guard stands a high-security
 * or lookout post (A7: the data whatever the `lookouts` flag), and every tagged guard hears the bell at his post through
 * one wall plus the section's masking (A4; plan distance: the runtime judges from the floor under the bell, the same on
 * one storey, S1a-g). Returns readable errors, each naming its post or event.
 */
export function checkMissionOrders(
  events: readonly OrderEvent[],
  sections: readonly OrderSection[],
  posts: readonly MissionPost[],
  rooms: readonly RoomRect[],
  noisy: readonly NoisySource[],
  hearAt: (dist: number, reachEff: number, loud: boolean) => HearTier = hearTier,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of posts) {
    if (seen.has(p.id)) out.push(`mission post '${p.id}': duplicate post id`);
    seen.add(p.id);
    if (p.circuits !== undefined) {
      if (p.circuits.length === 0) out.push(`mission post '${p.id}': empty circuits (a reset needs its board's circuits)`);
      for (const c of p.circuits) if (!isCircuit(c)) out.push(`mission post '${p.id}': circuit ${c} is not an integer >= 0`);
    }
    if (p.bell && !(Number.isFinite(p.bell.reach) && p.bell.reach > 0)) {
      out.push(`mission post '${p.id}': bell reach ${p.bell.reach} is not a finite number > 0`);
    }
  }
  const pt = new Float32Array(4);
  for (const ev of events) {
    const what = `order event '${ev.name}' (tag '${ev.guardTag}')`;
    if (!resolvePoint(ev.postId, posts, rooms, pt)) out.push(`${what}: post '${ev.postId}' is neither a mission post nor a room`);
    if (ev.via !== undefined && !resolvePoint(ev.via, posts, rooms, pt)) {
      out.push(`${what}: via '${ev.via}' is neither a mission post nor a room`);
    }
    const post = findPost(ev.postId, posts);
    const bell = post?.bell && Number.isFinite(post.bell.reach) && post.bell.reach > 0 ? post.bell : null;
    let found = 0;
    for (const sec of sections) {
      for (let k = 0; k < sec.guards.length; k++) {
        const g = sec.guards[k]!;
        if (!matchesTag(ev.guardTag, g.zone ?? '', sec.id, k)) continue;
        found++;
        const who = `${what}: guard ${sec.id}:${k}`;
        if (g.post?.highSecurity) out.push(`${who} stands a high-security post (never takes an order)`);
        if (g.post?.lookout) out.push(`${who} stands a lookout post (never takes an order)`);
        if (bell) {
          const d = hyp2(g.x - bell.x, g.z - bell.z);
          const amb = ambientDb(sec.noisy ?? noisy, g.x, g.z, g.y);
          if (hearAt(d, effectiveReach(bell.reach, 1, amb), false) < ORDER.bellTier) {
            out.push(`${who} would not hear the bell of '${ev.postId}' at his post (${d.toFixed(1)} m, one wall, ${amb.toFixed(1)} dB masking)`);
          }
        }
      }
    }
    if (found === 0) out.push(`${what}: the tag matches no guard of the mission's sections`);
  }
  return out;
}
