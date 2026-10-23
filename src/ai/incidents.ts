/**
 * The incident board (guard-ai S2, design section 3; pure: no Babylon / DOM), unit-tested.
 *
 * One incident per event (a noise, gunfire heard far off, a light going out, a lure; later bodies and contacts). The
 * board decides who goes: the guards who perceived it first (heard it inside half the reach, saw the light go), else a
 * calm guard of the section within `callR`; the best by path length (only the 3 nearest by straight distance are
 * asked for a path), an officer weighted 1.6 (he sends someone), a guard already on edge (cooldown) 0.8; dogs and
 * melee kinds never; held, busy (alarm run) and tasked guards never; ties to the lower guard index (no randomness,
 * G143). Count: 1, a light 2 when a second guard who saw it is within `lightPairR` of it (M1: "one or two people should
 * investigate (if only one is nearby then only one investigates)"). Everyone else who perceived it acknowledges
 * (looks `ackLook`, keeps his task; at most `maxCopy` "Copy." lines per incident). A report of the same kind within
 * `mergeR` and `mergeT` of an open incident (a light: the same light or circuit) merges into it: it adds perceivers,
 * never a second investigator; a plain noise next to a light that just went out (the bulb's pop, the round's impact)
 * merges into the light. An investigator who goes down (dead, knocked out) or is held (grabbed, hostage, interrogated)
 * for `silentEscalate` s turns the incident into `missing`: the 2 nearest calm guards go as a pair (a lead, and a cover
 * `pairBack` m short of the spot, G11). (S7) A body a camera saw (`reportBody`, one incident per body): the nearest 1
 * (knocked out) or 2 (dead) calm guards within `callR` by path walk to it (`MODE_BODY`). (S15) A circuit switched off
 * (`breaker`, one incident per circuit while open): the one witness best by path walks to the switch and turns it back
 * on (`MODE_BREAKER`), never a pair; the other witnesses ack. (S14) A `shots` incident whose
 * radio call got through (`wantPair`) sends a pair instead of one: the lead and a cover `pairBack` short (G11).
 * (S17) A tripped device (`reportDevice`: a laser beam broken, a camera's alarm; one incident per device while open) at
 * the device's spot, never the player's: the `DEVICE.want` calm guards best by path within `DEVICE.callR` go there and
 * search its room (`MODE_DEVICE`); nobody in range, it waits `DEVICE.wait` s, then lapses. (S19) A dead body whose
 * finder's radio report got through (`reportBodyCall`, `bodyDead`, one per body while open): `URGENT.bodyHelpers` calm
 * free guards best by path within `callR` hurry over to search it with him (`MODE_HELP`); nobody: it lapses.
 *
 * The board only reads a `GuardView` (struct of arrays filled by `EnemyManager`) and writes commands (`BoardOut`) the
 * manager applies to its guards. Guards are named by their stable id (`Enemy.num`), never by array index (the manager
 * drops dead guards from its list). Fixed pools; no allocation per report or per tick once the cast is in (the scratch
 * grows only when a bigger view arrives).
 */
import { hyp2, hyp3 } from '../core/mathx';
import { roleSendMul, TAGS } from './sectorTags';
import { DEVICE, URGENT } from './gear';

export type IncidentKind = 'noise' | 'shots' | 'light' | 'distraction' | 'missing' | 'bodyDead' | 'bodyKo' | 'camBody' | 'witnessKill' | 'contact' | 'breaker' | 'device';

/** Kind codes (the board's typed arrays). */
export const KIND: readonly IncidentKind[] = ['noise', 'shots', 'light', 'distraction', 'missing', 'bodyDead', 'bodyKo', 'camBody', 'witnessKill', 'contact', 'breaker', 'device'];
const K_NOISE = 0;
const K_LIGHT = 2;
const K_MISSING = 4;
/** (guard-ai S19) A dead body the finder's radio report told the section of: a calm guard goes to help search it. */
const K_BODYDEAD = 5;
const K_CAMBODY = 7;
/** (guard-ai S15) A circuit switched off, seen as a fault: one witness walks to the switch and turns it back on. */
const K_BREAKER = 10;
const K_SHOTS = 1;
/** (guard-ai S17) A tripped device (a laser beam, a camera's alarm): guards go to its spot and search its room. */
const K_DEVICE = 11;

export const INCIDENT = {
  /** Fixed pool per board (oldest closed first; all open: the oldest is dropped). */
  perSection: 16,
  /** Same kind (noise / shots / distraction) within 6 m (3D) and 10 s of its last report: one incident. */
  mergeR: 6,
  mergeT: 10,
  /** A light sends 2 when a second guard who saw it go is within this of it (m), else 1. */
  lightPairR: 15,
  /** Nobody perceived it (or nobody who did may go): a calm guard of the section within this (m) is sent. */
  callR: 25,
  /** Others who perceived it look this long (s) and keep their task. */
  ackLook: 3,
  /** At most this many "Copy." lines per incident. */
  maxCopy: 2,
  /** Investigator down or held this long (s): the incident turns `missing` (a pair goes). */
  silentEscalate: 25,
  /** Seconds at the light: a look at the fixture (`lightLook`), then `ringN` points round it, `ringLook` at each. */
  lightCheck: 8,
  lightLook: 2,
  ringN: 4,
  ringLook: 1.5,
  /** The ring round the light (m): the first point at `ringMin`, the last at `ringMax`. */
  ringMin: 2,
  ringMax: 6,
  /** Only the best this many by straight distance get a path query. */
  pathCandidates: 3,
  /** Score weights: an officer sends someone else; a guard already on edge goes first. */
  officerMul: 1.6,
  cautiousMul: 0.8,
  /** The missing pair's cover holds this far short of the spot (m, G11: 4-6 m back). */
  pairBack: 5,
  /** Perceivers kept per incident. */
  maxPerceivers: 16,
  /** (guard-ai S7, design 9) A body a camera saw with no calm guard within `callR`: the report waits this long (s) for
   *  one to come in range, then lapses (caution for the section is S4's). */
  camWait: 30,
  /** (guard-ai S7) A guard sent to a camera's body gives up the walk after this long (s) and looks round where he is. */
  bodyWalk: 45,
} as const;

/** Alert level codes in `GuardView.level` (`AlertLevel`). */
export const LEVEL = { unaware: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4, cooldown: 5 } as const;

/** `GuardView.flags` bits. */
export const GV_OFFICER = 1;
/** A dog or a melee kind: never an investigator. */
export const GV_MELEE = 2;
/** Grabbed, a hostage, interrogated: no brain, cannot answer. */
export const GV_HELD = 4;
/** Running to an alarm panel, passive: never sent. */
export const GV_BUSY = 8;
/** Dead or knocked out (still in the manager's list this step). */
export const GV_DOWN = 16;
/** (guard-ai S5) A high-security post (`posts.ts` `mayLeave` false): never sent out of his leash by the board; a
 *  distraction reaches him as a `PostLure` instead (the manager never reports him as a perceiver). */
export const GV_POSTED = 32;

/** What the board reads per guard (struct of arrays, filled by `EnemyManager` before each tick). */
export class GuardView {
  n = 0;
  /** Stable guard id (`Enemy.num`). */
  id: Int32Array;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  level: Uint8Array;
  flags: Uint8Array;
  /** The incident id the guard works (`Enemy.incident`), -1 none. */
  task: Int32Array;
  /** (guard-ai S5b) Role class flags (`sectorTags.ts` `ROLE_*`), and a secure zone's circle (centre, radius; 0 none):
   *  he answers a disturbance inside it first. 0 unless `setTags` writes them. */
  role: Uint8Array;
  zx: Float32Array;
  zz: Float32Array;
  zr: Float32Array;

  constructor(cap = 32) {
    this.id = new Int32Array(cap);
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.z = new Float32Array(cap);
    this.level = new Uint8Array(cap);
    this.flags = new Uint8Array(cap);
    this.task = new Int32Array(cap);
    this.role = new Uint8Array(cap);
    this.zx = new Float32Array(cap);
    this.zz = new Float32Array(cap);
    this.zr = new Float32Array(cap);
  }

  get cap(): number {
    return this.id.length;
  }

  /** Room for `n` guards (grows by doubling; the contents are refilled by the caller). */
  ensure(n: number): void {
    if (n <= this.id.length) return;
    let c = this.id.length;
    while (c < n) c *= 2;
    this.id = new Int32Array(c);
    this.x = new Float32Array(c);
    this.y = new Float32Array(c);
    this.z = new Float32Array(c);
    this.level = new Uint8Array(c);
    this.flags = new Uint8Array(c);
    this.task = new Int32Array(c);
    this.role = new Uint8Array(c);
    this.zx = new Float32Array(c);
    this.zz = new Float32Array(c);
    this.zr = new Float32Array(c);
  }

  /** Write guard `i` (tests and the manager). */
  set(i: number, id: number, x: number, y: number, z: number, level: number, flags: number, task: number): void {
    this.id[i] = id;
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.level[i] = level;
    this.flags[i] = flags;
    this.task[i] = task;
  }

  /** (guard-ai S5b) Write guard `i`'s sector tags: role class flags and his secure zone's circle (`r` 0: none). */
  setTags(i: number, role: number, x: number, z: number, r: number): void {
    this.role[i] = role;
    this.zx[i] = x;
    this.zz[i] = z;
    this.zr[i] = r;
  }
}

/** Path length (m) between two floor points over the nav grid; Infinity when there is no path. Tests use a fake. */
export interface PathLen {
  len(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number;
}

/** Commands. */
export const CMD_SEND = 1;
export const CMD_ACK = 2;
/** Send modes: walk over and look (noise, shots, lure), check a light, the missing pair's lead and cover. */
export const MODE_INVESTIGATE = 0;
export const MODE_LIGHT = 1;
export const MODE_LEAD = 2;
export const MODE_COVER = 3;
/** (guard-ai S7) Walk to a body a camera saw; there the body-found path takes over (wake him / search). */
export const MODE_BODY = 4;
/** (guard-ai S15) Walk to the switch at patrol pace and turn the circuit back on (`Enemy.resetBreaker`). */
export const MODE_BREAKER = 5;
/** (guard-ai S17) Go to a tripped device's spot and search its room (`Enemy.respondDevice`). */
export const MODE_DEVICE = 6;
/** (guard-ai S19) Hurry to a dead body a radio report named and search it with its finder (`Enemy.helpSearch`). */
export const MODE_HELP = 7;

/** The board's output for one tick / report (the manager applies and clears it). */
export class BoardOut {
  n = 0;
  readonly cmd = new Uint8Array(64);
  readonly guard = new Int32Array(64);
  /** The incident id. */
  readonly inc = new Int32Array(64);
  readonly mode = new Uint8Array(64);
  /** SEND: 0 / 1 = the first or second of a pair (a light's partner sweeps the ring the other way). ACK: 1 = say "Copy.". */
  readonly arg = new Uint8Array(64);
  /** The point to go to / look at. */
  readonly x = new Float32Array(64);
  readonly y = new Float32Array(64);
  readonly z = new Float32Array(64);

  push(cmd: number, guard: number, inc: number, mode: number, arg: number, x: number, y: number, z: number): void {
    const k = this.n;
    if (k >= this.cmd.length) return;
    this.cmd[k] = cmd;
    this.guard[k] = guard;
    this.inc[k] = inc;
    this.mode[k] = mode;
    this.arg[k] = arg;
    this.x[k] = x;
    this.y[k] = y;
    this.z[k] = z;
    this.n = k + 1;
  }
}

const P = INCIDENT.perSection;
const MP = INCIDENT.maxPerceivers;

/** Point `k` (0..ringN-1) of the light check's ring round (cx, cz): a quarter turn apart from `base` (rad, the
 *  direction the guard came from), radius from `ringMin` out to `ringMax`; a pair's partner (`slot` 1) starts an
 *  eighth of a turn on. Writes to out. */
export function lightRingPoint(cx: number, cz: number, k: number, base: number, slot: number, out: [number, number]): [number, number] {
  const n = INCIDENT.ringN;
  const r = INCIDENT.ringMin + ((INCIDENT.ringMax - INCIDENT.ringMin) * k) / Math.max(1, n - 1);
  const a = base + (k * Math.PI) / 2 + (slot * Math.PI) / 4;
  out[0] = cx + Math.sin(a) * r;
  out[1] = cz + Math.cos(a) * r;
  return out;
}

/** Wrap an angle to (-pi, pi]. */
function wrap(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

/** Field of view for a light going out (a bright change, so the peripheral range counts too): within the focused cone
 *  to `focusRange`, else within the peripheral half-angle to `periphRange`. Angles in rad, yaw 0 = +z. The caller
 *  casts the one line-of-sight ray after this passes. */
export function lightInView(gx: number, gy: number, gz: number, yaw: number, lx: number, ly: number, lz: number, focusHalf: number, focusRange: number, periphHalf: number, periphRange: number): boolean {
  const d = hyp3(lx - gx, ly - gy, lz - gz);
  const ang = Math.abs(wrap(Math.atan2(lx - gx, lz - gz) - yaw));
  if (ang <= focusHalf && d < focusRange) return true;
  return ang <= periphHalf && d < periphRange;
}

export class IncidentBoard {
  /** Board clock (s), advanced by `tick`. */
  now = 0;
  /** Section this board serves (Sector Ops: the live section; elsewhere 0). */
  section = 0;
  /** Output commands (applied and cleared by the manager). */
  readonly out = new BoardOut();
  /** An incident waits for its assignment (the manager runs a `tick(0, view)` at once). */
  pending = false;
  /** Incidents opened (tests / debug) and escalations to `missing`. */
  opened = 0;
  escalations = 0;

  // ----- the pool (struct of arrays) -----
  readonly id = new Int32Array(P);
  readonly kind = new Uint8Array(P);
  readonly open = new Uint8Array(P);
  /** Assigned (or given up): 0 waiting for an investigator. */
  readonly assigned = new Uint8Array(P);
  readonly x = new Float32Array(P);
  readonly y = new Float32Array(P);
  readonly z = new Float32Array(P);
  readonly key = new Int32Array(P);
  readonly t0 = new Float64Array(P);
  readonly lastT = new Float64Array(P);
  /** Investigators (guard ids, -1) and where each was last seen, and how long each has been silent (down / held). */
  readonly inv = new Int32Array(P * 2).fill(-1);
  readonly invX = new Float32Array(P * 2);
  readonly invY = new Float32Array(P * 2);
  readonly invZ = new Float32Array(P * 2);
  readonly silentT = new Float32Array(P * 2);
  /** Perceivers (guard ids), whether each saw it (a light) and was acknowledged. */
  readonly perc = new Int32Array(P * MP);
  readonly percSaw = new Uint8Array(P * MP);
  readonly percAck = new Uint8Array(P * MP);
  readonly nPerc = new Uint8Array(P);
  readonly copies = new Uint8Array(P);
  /** (guard-ai S7) How many guards a camera's body wants: 1 knocked out, 2 dead. */
  readonly want = new Uint8Array(P);
  /** (guard-ai S14) A shots incident already assigned whose section heard the call: a cover joins its lead next tick. */
  readonly needCover = new Uint8Array(P);

  private nextId = 1;
  /** (S3, S2 check polish 1) The slot `follow` is escalating from: `alloc` never evicts it (a full pool could hand the
   *  new `missing` the followed incident's own slot, which the same `follow` then closed). -1 none. */
  private keep = -1;
  /** Scratch: candidate flags per view index and straight distances. */
  private cand = new Uint8Array(32);
  private dist = new Float32Array(32);

  constructor(private paths: PathLen) {}

  /** Drop every incident (a section load, a restart, `EnemyManager.clear`). */
  clear(): void {
    this.open.fill(0);
    this.inv.fill(-1);
    this.nPerc.fill(0);
    this.out.n = 0;
    this.pending = false;
  }

  /** Slot of an open incident by id, -1. */
  slotOf(id: number): number {
    for (let s = 0; s < P; s++) if (this.open[s] && this.id[s] === id) return s;
    return -1;
  }

  /** Open incidents (tests / debug). */
  get openCount(): number {
    let n = 0;
    for (let s = 0; s < P; s++) if (this.open[s]) n++;
    return n;
  }

  /** The kind of an open incident by id (tests / debug), null when closed. */
  kindOf(id: number): IncidentKind | null {
    const s = this.slotOf(id);
    return s < 0 ? null : KIND[this.kind[s]!]!;
  }

  /** (guard-ai S15) The dedupe key of an open incident by id (a light id, a circuit key), -1 when closed or none. */
  keyOf(id: number): number {
    const s = this.slotOf(id);
    return s < 0 ? -1 : this.key[s]!;
  }

  /** Investigators of an open incident by id (tests / debug): the ids, -1 for none. */
  investigatorsOf(id: number, out: [number, number]): [number, number] {
    const s = this.slotOf(id);
    out[0] = s < 0 ? -1 : this.inv[s * 2]!;
    out[1] = s < 0 ? -1 : this.inv[s * 2 + 1]!;
    return out;
  }

  /**
   * Something happened at (x, y, z): the `n` guards in `who` (ids) perceived it (heard it at the investigate tier, saw
   * the light go). `key`: dedupe key (a light id or circuit; -1 = by place). Returns the incident id (new or merged).
   */
  report(kind: IncidentKind, x: number, z: number, y: number, key: number, who: Int32Array, n: number, now = this.now): number {
    const k = KIND.indexOf(kind);
    let s = this.findMerge(k, x, y, z, key, now);
    let saw = k === K_LIGHT || k === K_BREAKER ? 1 : 0;
    if (s >= 0 && k !== K_LIGHT && this.kind[s] === K_LIGHT) saw = 0;
    else if (s >= 0 && k === K_LIGHT && this.kind[s] !== K_LIGHT) {
      // a light went out where a plain noise was just heard (the bulb's pop came first): the noise becomes the light
      this.kind[s] = K_LIGHT;
      this.key[s] = key;
      this.x[s] = x;
      this.y[s] = y;
      this.z[s] = z;
      if (this.assigned[s] && this.inv[s * 2]! < 0) this.assigned[s] = 0;
    }
    if (s < 0) {
      s = this.alloc();
      this.id[s] = this.nextId++;
      this.kind[s] = k;
      this.open[s] = 1;
      this.assigned[s] = 0;
      this.x[s] = x;
      this.y[s] = y;
      this.z[s] = z;
      this.key[s] = key;
      this.t0[s] = now;
      this.inv[s * 2] = -1;
      this.inv[s * 2 + 1] = -1;
      this.silentT[s * 2] = 0;
      this.silentT[s * 2 + 1] = 0;
      this.nPerc[s] = 0;
      this.copies[s] = 0;
      this.want[s] = 1;
      this.needCover[s] = 0;
      this.opened++;
    }
    this.lastT[s] = now;
    for (let i = 0; i < n; i++) this.addPerceiver(s, who[i]!, saw);
    if (!this.assigned[s]) this.pending = true;
    return this.id[s]!;
  }

  /**
   * (guard-ai S7, design 9) A camera saw a downed guard at (x, y, z) (y: the floor under him). `key`: the body's number
   * (one incident per body: a second camera's report of it merges while it is open). `lethal`: dead (2 go) or knocked
   * out (1 goes). Nobody perceived it (the camera did): calm free guards within `callR` are asked, best by path.
   */
  reportBody(x: number, z: number, y: number, key: number, lethal: boolean, now = this.now): number {
    const id = this.report('camBody', x, z, y, key, NO_ONE, 0, now);
    const s = this.slotOf(id);
    if (s >= 0 && lethal) this.want[s] = 2;
    return id;
  }

  /**
   * (guard-ai S17, A100-A102) A device was tripped at (x, y, z) (y: the floor there): a laser's beam (its midpoint), a
   * camera's alarm (where it saw someone), never the player's live position. `key`: the device (one incident per device:
   * a second trip merges while it is open). Nobody perceived it (the device did): `DEVICE.want` calm free guards within
   * `DEVICE.callR` by path are sent.
   */
  reportDevice(x: number, z: number, y: number, key: number, now = this.now): number {
    const id = this.report('device', x, z, y, key, NO_ONE, 0, now);
    const s = this.slotOf(id);
    if (s >= 0) this.want[s] = DEVICE.want;
    return id;
  }

  /**
   * (guard-ai S19, walk 4.72 G3: "rush to ... bodies reported") A dead body at (x, y, z) (y: the floor) was reported over
   * the radio and the report got through. `key`: the body (one incident per body while open). Nobody perceived it as
   * such: `URGENT.bodyHelpers` calm free guards within `callR` by path are sent (the finder is searching: not free).
   */
  reportBodyCall(x: number, z: number, y: number, key: number, now = this.now): number {
    const id = this.report('bodyDead', x, z, y, key, NO_ONE, 0, now);
    const s = this.slotOf(id);
    if (s >= 0) this.want[s] = URGENT.bodyHelpers;
    return id;
  }

  /**
   * (guard-ai S14, G11) The section heard a `shots` call: shots incident `id` sends a pair, a lead and a cover
   * `pairBack` m short of the spot (from those who heard it, else calm guards within `callR`, else any free guard). Not
   * yet assigned: both go at its assignment. Assigned with one investigator: a cover joins him at the next tick; its lead
   * already back: a fresh pair goes. False when the incident is closed or not shots.
   */
  wantPair(id: number): boolean {
    const s = this.slotOf(id);
    if (s < 0 || this.kind[s] !== K_SHOTS) return false;
    this.want[s] = 2;
    if (this.assigned[s]) this.needCover[s] = 1;
    else this.pending = true;
    return true;
  }

  /** Advance the board (5 Hz; `dt` 0 just assigns what is pending): assign, acknowledge, escalate, close. */
  tick(dt: number, view: GuardView): void {
    this.now += dt;
    this.pending = false;
    if (this.cand.length < view.n) {
      let c = this.cand.length;
      while (c < view.n) c *= 2;
      this.cand = new Uint8Array(c);
      this.dist = new Float32Array(c);
    }
    for (let s = 0; s < P; s++) {
      if (!this.open[s]) continue;
      if (!this.assigned[s]) this.assign(s, view);
      else if (this.needCover[s]) this.addCover(s, view);
      if (!this.open[s]) continue;
      this.ackAll(s, view);
      this.follow(s, dt, view);
    }
  }

  // ----- internals -----

  private findMerge(k: number, x: number, y: number, z: number, key: number, now: number): number {
    const M = INCIDENT;
    for (let s = 0; s < P; s++) {
      if (!this.open[s]) continue;
      const sk = this.kind[s]!;
      if (k === K_LIGHT && key >= 0 && sk === K_LIGHT && this.key[s] === key) return s;
      // (guard-ai S15) a breaker fault: by its circuit only, while open
      if (k === K_BREAKER) {
        if (sk === K_BREAKER && this.key[s] === key) return s;
        continue;
      }
      // (guard-ai S7) a camera's body: by the body only, while open (two bodies side by side are two incidents);
      // (S17) a device: by the device only, while open
      if (k === K_CAMBODY || k === K_DEVICE || k === K_BODYDEAD) {
        if (sk === k && this.key[s] === key) return s;
        continue;
      }
      if (now - this.lastT[s]! > M.mergeT) continue;
      // same kind by place, 3D (a light only by its key, above)
      if (sk === k && k !== K_LIGHT && k !== K_MISSING && hyp3(this.x[s]! - x, this.y[s]! - y, this.z[s]! - z) <= M.mergeR) return s;
      // a plain noise right under a light that just went out (the bulb's pop at the fixture, the round's impact) merges
      // into it; and a light where such a noise still waits for its investigator (the pop came first). On the plan:
      // the light's incident sits on the floor, the pop up at the fixture
      if (k === K_NOISE && sk === K_LIGHT && hyp2(this.x[s]! - x, this.z[s]! - z) <= M.mergeR) return s;
      if (k === K_LIGHT && sk === K_NOISE && this.inv[s * 2]! < 0 && hyp2(this.x[s]! - x, this.z[s]! - z) <= M.mergeR) return s;
    }
    return -1;
  }

  /** A free slot: a closed one, else the oldest open one (dropped), never the slot being escalated from (`keep`). */
  private alloc(): number {
    let oldest = -1;
    for (let s = 0; s < P; s++) {
      if (!this.open[s]) return s;
      if (s === this.keep) continue;
      if (oldest < 0 || this.t0[s]! < this.t0[oldest]!) oldest = s;
    }
    return oldest;
  }

  private addPerceiver(s: number, gid: number, saw: number): void {
    const b = s * MP;
    const n = this.nPerc[s]!;
    for (let j = 0; j < n; j++) {
      if (this.perc[b + j] !== gid) continue;
      if (saw) this.percSaw[b + j] = 1;
      return;
    }
    if (n >= MP) return;
    this.perc[b + n] = gid;
    this.percSaw[b + n] = saw;
    this.percAck[b + n] = 0;
    this.nPerc[s] = n + 1;
  }

  private isPerceiver(s: number, gid: number, sawOnly: boolean): boolean {
    const b = s * MP;
    const n = this.nPerc[s]!;
    for (let j = 0; j < n; j++) if (this.perc[b + j] === gid) return !sawOnly || this.percSaw[b + j] === 1;
    return false;
  }

  /** May guard `i` be sent anywhere now? */
  private free(view: GuardView, i: number): boolean {
    const f = view.flags[i]!;
    if (f & (GV_MELEE | GV_HELD | GV_BUSY | GV_DOWN | GV_POSTED)) return false;
    if (view.task[i]! >= 0) return false;
    const l = view.level[i]!;
    return l === LEVEL.unaware || l === LEVEL.suspicious || l === LEVEL.cooldown;
  }

  /** Mark the candidates for incident `s`; returns how many. `mode` 0: perceivers, 1: calm within `callR`, 2: every
   *  free guard (the missing pair). `sawOnly`: perceivers who saw it. `within`: straight distance limit. */
  private mark(s: number, view: GuardView, mode: number, sawOnly: boolean, within: number, skip: number): number {
    let c = 0;
    const x = this.x[s]!;
    const y = this.y[s]!;
    const z = this.z[s]!;
    for (let i = 0; i < view.n; i++) {
      this.cand[i] = 0;
      if (view.id[i] === skip || !this.free(view, i)) continue;
      // (guard-ai S5b) a secure-zone guard answers a disturbance inside his zone first (perceived or not)
      const zone = inZone(view, i, x, z);
      if (mode === 0 && !zone && !this.isPerceiver(s, view.id[i]!, sawOnly)) continue;
      const d = hyp3(view.x[i]! - x, view.y[i]! - y, view.z[i]! - z);
      if (d >= within) continue;
      this.dist[i] = zone ? d * TAGS.secureFirst : d;
      this.cand[i] = 1;
      c++;
    }
    return c;
  }

  /** The best marked candidate for incident `s` (view index, -1): the `pathCandidates` nearest by straight distance get
   *  a path query; score = path x officer x cautious x role x zone (a breaker fault: the path alone); ties to the lower
   *  index. */
  private best(s: number, view: GuardView): number {
    const M = INCIDENT;
    let pick = -1;
    let pickScore = Infinity;
    let fallback = -1;
    for (let q = 0; q < M.pathCandidates; q++) {
      // the next nearest marked candidate (ties: lower index)
      let bi = -1;
      let bd = Infinity;
      for (let i = 0; i < view.n; i++) {
        if (this.cand[i] !== 1) continue;
        const d = this.dist[i]!;
        if (d < bd) {
          bd = d;
          bi = i;
        }
      }
      if (bi < 0) break;
      this.cand[bi] = 2;
      if (fallback < 0) fallback = bi;
      const len = this.paths.len(view.x[bi]!, view.y[bi]!, view.z[bi]!, this.x[s]!, this.y[s]!, this.z[s]!);
      if (!(len < Infinity)) continue;
      const f = view.flags[bi]!;
      let score = len;
      // (guard-ai S15 laptop fix) a breaker fault: the witness nearest the switch by path flips it, whoever he is (a
      // chore, not a check: no officer, cautious, role or zone weight). With the weights the one walker was the rover
      // the light check sends first, and the map's lure (S2 #1 at the reception panel, S3 #16 at the switch bank, the
      // second of the light pair on master and the nearest witness) stayed put
      if (this.kind[s] !== K_BREAKER) {
        score *= (f & GV_OFFICER ? M.officerMul : 1) * (view.level[bi] === LEVEL.cooldown ? M.cautiousMul : 1);
        // (guard-ai S5b) the role (a supervisor sends someone; a rover checks a light first) and a secure zone
        score *= roleSendMul(view.role[bi]!, this.kind[s] === K_LIGHT);
        if (inZone(view, bi, this.x[s]!, this.z[s]!)) score *= TAGS.secureFirst;
      }
      if (score < pickScore || (score === pickScore && bi < pick)) {
        pickScore = score;
        pick = bi;
      }
    }
    // put the asked candidates back for a second pick
    for (let i = 0; i < view.n; i++) if (this.cand[i] === 2) this.cand[i] = 1;
    // nobody reachable by path: the nearest goes anyway (the old rule)
    return pick >= 0 ? pick : fallback;
  }

  private send(s: number, view: GuardView, i: number, mode: number, slot: number, tx: number, ty: number, tz: number): void {
    const gid = view.id[i]!;
    this.inv[s * 2 + slot] = gid;
    this.invX[s * 2 + slot] = view.x[i]!;
    this.invY[s * 2 + slot] = view.y[i]!;
    this.invZ[s * 2 + slot] = view.z[i]!;
    this.silentT[s * 2 + slot] = 0;
    // the guard is busy from now on (a second pick this tick skips him)
    view.task[i] = this.id[s]!;
    this.out.push(CMD_SEND, gid, this.id[s]!, mode, slot, tx, ty, tz);
  }

  private assign(s: number, view: GuardView): void {
    const M = INCIDENT;
    const k = this.kind[s]!;
    const x = this.x[s]!;
    const y = this.y[s]!;
    const z = this.z[s]!;
    if (k === K_MISSING) {
      // (guard-ai S5b) the squad that missed him on a radio check (its perceivers) goes first; else every free guard
      let c = this.mark(s, view, 0, false, Infinity, -1);
      if (c === 0) c = this.mark(s, view, 2, false, Infinity, -1);
      if (c === 0) return this.giveUp(s);
      const lead = this.best(s, view);
      this.send(s, view, lead, MODE_LEAD, 0, x, y, z);
      this.cand[lead] = 0;
      // the cover: another of them, else any free guard
      if (c === 1) this.mark(s, view, 2, false, Infinity, view.id[lead]!);
      const cover = this.best(s, view);
      if (cover >= 0) {
        // the cover holds `pairBack` short of the spot, on his side of it
        const dx = view.x[cover]! - x;
        const dz = view.z[cover]! - z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const back = Math.min(M.pairBack, d);
        const cx = d > 1e-3 ? x + (dx / d) * back : x;
        const cz = d > 1e-3 ? z + (dz / d) * back : z;
        this.send(s, view, cover, MODE_COVER, 1, cx, y, cz);
      }
      this.assigned[s] = 1;
      return;
    }
    if (k === K_LIGHT) {
      // perceivers only (no more "everyone within 25 m"): who saw it, else who heard the pop
      let c = this.mark(s, view, 0, true, Infinity, -1);
      if (c === 0) c = this.mark(s, view, 0, false, Infinity, -1);
      if (c === 0) {
        // nobody (free) noticed it: wait for a merge (the pop, the impact), then let it go
        if (this.now - this.lastT[s]! > M.mergeT) this.close(s);
        return;
      }
      const first = this.best(s, view);
      this.send(s, view, first, MODE_LIGHT, 0, x, y, z);
      // a second who saw it within `lightPairR` of it: two go (M1), else one
      if (this.mark(s, view, 0, true, M.lightPairR, view.id[first]!) > 0) {
        const second = this.best(s, view);
        if (second >= 0) this.send(s, view, second, MODE_LIGHT, 1, x, y, z);
      }
      this.assigned[s] = 1;
      return;
    }
    if (k === K_BREAKER) {
      // (guard-ai S15, A42) a fault, not an attack: the one who saw it go (best by path) resets it, never a pair; the
      // other witnesses ack. Nobody (free) saw it: let it go (late discovery may find it later)
      if (this.mark(s, view, 0, true, Infinity, -1) === 0) {
        if (this.now - this.lastT[s]! > M.mergeT) this.close(s);
        return;
      }
      this.send(s, view, this.best(s, view), MODE_BREAKER, 0, x, y, z);
      this.assigned[s] = 1;
      return;
    }
    if (k === K_CAMBODY) {
      // (guard-ai S7, design 9, M6) a camera saw a body: the nearest calm guard by path within `callR` walks to it (a
      // dead one: the next nearest too); nobody in range: wait for one to come in range, then let it lapse
      if (this.mark(s, view, 1, false, M.callR, -1) === 0) {
        if (this.now - this.lastT[s]! > M.camWait) this.close(s);
        return;
      }
      const first = this.best(s, view);
      this.send(s, view, first, MODE_BODY, 0, x, y, z);
      if (this.want[s] === 2 && this.mark(s, view, 1, false, M.callR, view.id[first]!) > 0) {
        const second = this.best(s, view);
        if (second >= 0) this.send(s, view, second, MODE_BODY, 1, x, y, z);
      }
      this.assigned[s] = 1;
      return;
    }
    if (k === K_DEVICE) {
      // (guard-ai S17, G1) a tripped device: the nearest calm guards by path within `DEVICE.callR` go to its spot and
      // search its room (up to `want`); nobody in range: wait for one to come in range, then let it lapse
      if (this.mark(s, view, 1, false, DEVICE.callR, -1) === 0) {
        if (this.now - this.lastT[s]! > DEVICE.wait) this.close(s);
        return;
      }
      const first = this.best(s, view);
      this.send(s, view, first, MODE_DEVICE, 0, x, y, z);
      if (this.want[s]! >= 2 && this.mark(s, view, 1, false, DEVICE.callR, view.id[first]!) > 0) {
        const second = this.best(s, view);
        if (second >= 0) this.send(s, view, second, MODE_DEVICE, 1, x, y, z);
      }
      this.assigned[s] = 1;
      return;
    }
    if (k === K_BODYDEAD) {
      // (guard-ai S19, G3) a dead body reported over the radio: the nearest calm guards by path within `callR` hurry
      // over to search it with its finder (up to `want`, 0: none); nobody: let it go
      const want = this.want[s]!;
      if (want === 0 || this.mark(s, view, 1, false, M.callR, -1) === 0) {
        this.close(s);
        return;
      }
      const first = this.best(s, view);
      this.send(s, view, first, MODE_HELP, 0, x, y, z);
      if (want >= 2 && this.mark(s, view, 1, false, M.callR, view.id[first]!) > 0) {
        const second = this.best(s, view);
        if (second >= 0) this.send(s, view, second, MODE_HELP, 1, x, y, z);
      }
      this.assigned[s] = 1;
      return;
    }
    // noise / shots / lure (and, until S4, everything else): one
    let c = this.mark(s, view, 0, false, Infinity, -1);
    if (c === 0) c = this.mark(s, view, 1, false, M.callR, -1);
    if (c === 0) {
      if (this.now - this.lastT[s]! > M.mergeT) this.close(s);
      return;
    }
    const pick = this.best(s, view);
    this.send(s, view, pick, MODE_INVESTIGATE, 0, x, y, z);
    // (guard-ai S14, G11) a shots call got through: a cover goes with him (another who heard it, else any free guard)
    if (k === K_SHOTS && this.want[s] === 2) {
      this.needCover[s] = 0;
      this.cand[pick] = 0;
      if (c <= 1 && this.mark(s, view, 1, false, M.callR, view.id[pick]!) === 0) this.mark(s, view, 2, false, Infinity, view.id[pick]!);
      const cover = this.best(s, view);
      if (cover >= 0) this.coverAt(s, view, cover);
    }
    this.assigned[s] = 1;
  }

  /** (guard-ai S14) Send view index `i` as incident `s`'s cover: he holds `pairBack` m short of the spot, on his side
   *  of it (the missing pair's rule, G11). */
  private coverAt(s: number, view: GuardView, i: number): void {
    const x = this.x[s]!;
    const z = this.z[s]!;
    const dx = view.x[i]! - x;
    const dz = view.z[i]! - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    const back = Math.min(INCIDENT.pairBack, d);
    const cx = d > 1e-3 ? x + (dx / d) * back : x;
    const cz = d > 1e-3 ? z + (dz / d) * back : z;
    this.send(s, view, i, MODE_COVER, 1, cx, this.y[s]!, cz);
  }

  /** (guard-ai S14) A cover for an assigned shots incident (`wantPair`): beside its lead; the lead back already: a
   *  fresh pair. */
  private addCover(s: number, view: GuardView): void {
    this.needCover[s] = 0;
    if (this.inv[s * 2 + 1]! >= 0) return;
    const lead = this.inv[s * 2]!;
    if (lead < 0) {
      this.assigned[s] = 0;
      this.assign(s, view);
      return;
    }
    if (this.mark(s, view, 0, false, Infinity, lead) === 0 && this.mark(s, view, 1, false, INCIDENT.callR, lead) === 0 && this.mark(s, view, 2, false, Infinity, lead) === 0) return;
    const cover = this.best(s, view);
    if (cover >= 0) this.coverAt(s, view, cover);
  }

  private giveUp(s: number): void {
    this.close(s);
  }

  private close(s: number): void {
    this.open[s] = 0;
    this.inv[s * 2] = -1;
    this.inv[s * 2 + 1] = -1;
  }

  /** Others who perceived it look and say "Copy." (at most `maxCopy`); once each. */
  private ackAll(s: number, view: GuardView): void {
    if (!this.assigned[s]) return;
    const b = s * MP;
    const n = this.nPerc[s]!;
    for (let j = 0; j < n; j++) {
      if (this.percAck[b + j]) continue;
      const gid = this.perc[b + j]!;
      this.percAck[b + j] = 1;
      if (gid === this.inv[s * 2] || gid === this.inv[s * 2 + 1]) continue;
      const i = indexOf(view, gid);
      if (i < 0) continue;
      const f = view.flags[i]!;
      if (f & (GV_HELD | GV_DOWN)) continue;
      const copy = this.copies[s]! < INCIDENT.maxCopy && !(f & GV_MELEE) ? 1 : 0;
      if (copy) this.copies[s] = this.copies[s]! + 1;
      this.out.push(CMD_ACK, gid, this.id[s]!, 0, copy, this.x[s]!, this.y[s]!, this.z[s]!);
    }
  }

  /** Watch the investigators: done (off the task) or silent (down / held) too long -> `missing`. Close when all done. */
  private follow(s: number, dt: number, view: GuardView): void {
    if (!this.assigned[s]) return;
    let busy = 0;
    for (let slot = 0; slot < 2; slot++) {
      const q = s * 2 + slot;
      const gid = this.inv[q]!;
      if (gid < 0) continue;
      const i = indexOf(view, gid);
      const down = i < 0 || (view.flags[i]! & (GV_DOWN | GV_HELD)) !== 0;
      if (!down) {
        this.invX[q] = view.x[i]!;
        this.invY[q] = view.y[i]!;
        this.invZ[q] = view.z[i]!;
        this.silentT[q] = 0;
        if (view.task[i] !== this.id[s]) {
          // back from it (or combat took over)
          this.inv[q] = -1;
          continue;
        }
        busy++;
        continue;
      }
      busy++;
      this.silentT[q] = this.silentT[q]! + dt;
      if (this.silentT[q]! >= INCIDENT.silentEscalate && this.kind[s] !== K_MISSING) {
        // he is not answering: two go to where he was last
        this.inv[q] = -1;
        this.escalations++;
        this.keep = s;
        this.report('missing', this.invX[q]!, this.invZ[q]!, this.invY[q]!, gid, NO_ONE, 0, this.now);
        this.keep = -1;
        busy--;
      } else if (this.kind[s] === K_MISSING && this.silentT[q]! >= INCIDENT.silentEscalate) {
        // (S4 / S6 take it from here: caution, the radio, the alarm)
        this.inv[q] = -1;
        busy--;
      }
    }
    if (busy === 0) this.close(s);
  }
}

const NO_ONE = new Int32Array(0);

/** (guard-ai S5b) Is (x, z) inside guard `i`'s secure zone circle? */
function inZone(view: GuardView, i: number, x: number, z: number): boolean {
  const r = view.zr[i]!;
  return r > 0 && hyp2(view.zx[i]! - x, view.zz[i]! - z) <= r;
}

/** View index of guard `gid`, -1. */
function indexOf(view: GuardView, gid: number): number {
  for (let i = 0; i < view.n; i++) if (view.id[i] === gid) return i;
  return -1;
}
