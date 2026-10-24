/**
 * (guard-ai S13, stealth over shooting item 11, A39) A response team and its sweep of the section (pure: no Babylon /
 * DOM), unit-tested. The alarm brings a team (`responseTeam` in `gear.ts`: the shield guard first); once its leader's
 * search of the last known position has run `ALERT.searchTime`, the team walks the section's sweep points (`SectorDef.sweep`
 * if set, else its route points and posts thinned to one per `SWEEP.thin` m, `sweepPoints`), nearest the last known
 * position first, each once, then the same order again (the team's start point first: `sweepStart`). The leader looks
 * `SWEEP.dwell` s at each point; the others stack `SWEEP.gap` m apart behind him. A sighting (the leader in combat)
 * stops the sweep; the next search that runs its full time starts it again from the new last known position. The team
 * never leaves: only the section's unload or restart (`EnemyManager.clear`) ends it.
 *
 * The point list is built once at each switch to the sweep (`begin`, which allocates through `sweepPoints`); the
 * per-step part (`tick`, `lead`, `follow`) allocates nothing.
 */
import { hyp2 } from '../core/mathx';
import { ALERT } from './alertState';
import { SWEEP, SWEEP4, sweepPoints, sweepStart } from './gear';

/** The leader is at a sweep point within this (m). */
export const SWEEP_NEAR = 1.1;

/** What the team reads of a member (an `Enemy`). */
export interface SweepMember {
  readonly alive: boolean;
  readonly taken: boolean;
  readonly pos: { readonly x: number; readonly z: number };
  readonly aware: { readonly level: string; readonly t: number };
  /** Written by `tick`: 0 the leader, 1.. the followers in team order, -1 down or held. */
  teamRank: number;
}

type Pts = readonly (readonly [number, number])[];

/** (coop4 AI5) What `pointBusy` reads of another team (a `SweepTeam`). */
export interface SweepPeer {
  readonly section: number;
  readonly sweeping: boolean;
  readonly count: number;
  readonly point: number;
  readonly pts: readonly number[];
}

/**
 * (coop4 AI5, A177) Is the sweep point (`x`, `z`) taken: another team of `self`'s section (in `others`, the manager's
 * team list) sweeping and heading for or looking at a point within `SWEEP.thin` m of it. Pure, no allocation.
 */
export function pointBusy(x: number, z: number, others: readonly SweepPeer[], self: SweepPeer): boolean {
  for (let i = 0; i < others.length; i++) {
    const o = others[i]!;
    if (o === self || o.section !== self.section || !o.sweeping) continue;
    const j = o.point;
    if (j < 0) continue;
    if (hyp2(o.pts[2 * j]! - x, o.pts[2 * j + 1]! - z) < SWEEP.thin) return true;
  }
  return false;
}

export class SweepTeam<M extends SweepMember = SweepMember> {
  /** The members in team order (the shield guard first). */
  readonly members: M[] = [];
  /** (coop4 AI5, A176) The intruder slot this team hunts (-1 none): its first member's alarm hunt, shared by every
   *  member (`EnemyManager.joinTeam`); from 3 players the team sweeps from that slot's last known position. */
  hunt = -1;
  /** (coop4 AI5, A177) The section's other teams (the manager's list) while the coop4 dedupe applies; null: off (1-2
   *  players, today). Set by the manager every step before `tick`. */
  peers: readonly SweepPeer[] | null = null;
  /** (coop4 AI5) Points passed over because another team held them (tests / debug). */
  busySkips = 0;
  /** The sweep points as flat x, z pairs, nearest the last known position at the switch first. */
  readonly pts: number[] = [];
  /** How many points. */
  count = 0;
  /** The team's first point each pass (`sweepStart`). */
  start = 0;
  /** Points done this pass. */
  k = 0;
  /** Seconds at the current point (the leader's look). */
  dwellT = 0;
  /** Full passes done (tests / debug). */
  passes = 0;
  /** Points looked at since the switch (tests / debug). */
  visited = 0;
  /** The sweep is on (the leader searched his full time and has not been in combat since). */
  sweeping = false;
  /** Switches to the sweep so far (tests / debug). */
  switches = 0;
  /** The first member up (alive, not held); null none. */
  leader: M | null = null;
  /** Unit vector behind the leader (from the point he heads for back to him): the followers stack along it. */
  bx = 0;
  bz = -1;
  /** (guard-ai sweep fix) Seconds the leader has made no progress to the current point (his way to go not cut by
   *  `SWEEP.stallGain` under its best, `best`); the stalls there so far (the first asks for a replan, the second gives
   *  the point up). */
  stallT = 0;
  stallN = 0;
  /** Set by a first stall: the leader drops his route and plans again from where he stands (`Enemy.sweepStep`). */
  replan = false;
  /** Points given up after two stalls (tests / debug; they count in `visited`, as an unreachable point does). */
  skipped = 0;
  /** The least way to go to the current point seen since the last progress (m); NaN none yet. */
  private best = Number.NaN;

  /**
   * Team `index` (its stage's order in the section: the start point offset) of section `section`. `override`: the
   * section's own sweep list (`SectorDef.sweep`), else `routes` and `posts` are thinned (`sweepPoints`).
   */
  constructor(
    readonly index: number,
    readonly section: number,
    readonly override: Pts | null,
    readonly routes: readonly Pts[],
    readonly posts: Pts,
    /** (coop4 AI5, A177) How many teams the section may hold (`sweepStart`'s spread; 3 = today). */
    readonly spread = 3,
  ) {}

  /** The current point's index into `pts` (pairs); -1 none. */
  get point(): number {
    return this.count > 0 ? (this.start + this.k) % this.count : -1;
  }

  /** Every step (before the members think): ranks, the leader, and the switch on / off. */
  tick(lkpValid: boolean, lkpX: number, lkpZ: number): void {
    let lead: M | null = null;
    let r = 0;
    const ms = this.members;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (!m.alive || m.taken) {
        m.teamRank = -1;
        continue;
      }
      if (lead === null) lead = m;
      m.teamRank = r++;
    }
    this.leader = lead;
    if (!SWEEP.enabled || lead === null || lead.aware.level !== 'searching') {
      this.sweeping = false;
      return;
    }
    if (!this.sweeping && lead.aware.t >= ALERT.searchTime) this.begin(lkpValid ? lkpX : lead.pos.x, lkpValid ? lkpZ : lead.pos.z, lead.pos.x, lead.pos.z);
  }

  /** The switch to the sweep: the points from (`lkpX`, `lkpZ`) (allocates: once per switch), the leader at (`x`, `z`). */
  begin(lkpX: number, lkpZ: number, x: number, z: number): void {
    const ov = this.override;
    // an override list is the section's own choice: every point kept (thin 0), only ordered
    this.count = ov && ov.length ? sweepPoints([ov], [], lkpX, lkpZ, 0, this.pts) : sweepPoints(this.routes, this.posts, lkpX, lkpZ, SWEEP.thin, this.pts);
    this.start = sweepStart(this.index, this.count, this.spread);
    this.k = 0;
    this.dwellT = 0;
    this.passes = 0;
    this.visited = 0;
    this.skipped = 0;
    this.unstall();
    this.sweeping = this.count > 0;
    if (!this.sweeping) return;
    // (coop4 AI5, A177) the start point another team holds: the first free one after it (all held: the start)
    if (this.dedupeOn()) {
      for (let j = 0; j < this.count; j++) {
        const p = (this.start + j) % this.count;
        if (pointBusy(this.pts[2 * p]!, this.pts[2 * p + 1]!, this.peers!, this)) continue;
        if (j > 0) this.busySkips++;
        this.start = p;
        break;
      }
    }
    this.switches++;
    const i = this.point;
    this.behind(x - this.pts[2 * i]!, z - this.pts[2 * i + 1]!);
  }

  /**
   * The leader at (`x`, `z`): heading for the current point (false), or at it (true: looking, `dwellT` counts; after
   * `SWEEP.dwell` the next point). `togo`: his way still to go along his route (m, `Enemy.routeToGo`); absent: the
   * straight distance.
   */
  lead(dt: number, x: number, z: number, togo = Number.NaN): boolean {
    const i = this.point;
    if (i < 0) return false;
    const dx = x - this.pts[2 * i]!;
    const dz = z - this.pts[2 * i + 1]!;
    const d = hyp2(dx, dz);
    if (d > SWEEP_NEAR) {
      this.behind(dx, dz);
      this.dwellT = 0;
      // (guard-ai sweep fix, train 45) no progress along his way: replan once, then give the point up (last resort), so a
      // jam never ends the sweep. Progress is his way to go cut under its best (a shuffle at a jam is none); a new
      // route much longer than the best (a replan's detour) starts the count again.
      const g = togo === togo ? togo : d;
      if (!(g < this.best + SWEEP.stallJump) || g < this.best - SWEEP.stallGain) {
        this.best = g;
        this.stallT = 0;
      } else {
        this.stallT += dt;
        if (this.stallT >= SWEEP.stall) {
          this.stallT = 0;
          this.best = g;
          if (++this.stallN >= 2) {
            this.skipped++;
            this.next();
          } else this.replan = true;
        }
      }
      return false;
    }
    this.best = Number.NaN;
    this.stallT = 0;
    this.dwellT += dt;
    if (this.dwellT >= SWEEP.dwell) this.next();
    return true;
  }

  /** On to the next point (looked at, or unreachable); after the last, the same order again. (coop4 AI5, A177) A point
   *  another team of the section holds is passed over (not looked at, not counted); all held: the next one anyway. */
  next(): void {
    this.dwellT = 0;
    this.unstall();
    this.visited++;
    this.step();
    if (!this.dedupeOn() || this.count < 2) return;
    const k0 = this.k;
    const p0 = this.passes;
    for (let j = 1; j < this.count; j++) {
      const i = this.point;
      if (!pointBusy(this.pts[2 * i]!, this.pts[2 * i + 1]!, this.peers!, this)) {
        this.busySkips += j - 1;
        return;
      }
      this.step();
    }
    const i = this.point;
    if (!pointBusy(this.pts[2 * i]!, this.pts[2 * i + 1]!, this.peers!, this)) {
      this.busySkips += this.count - 1;
      return;
    }
    // every point held: the next one anyway
    this.k = k0;
    this.passes = p0;
  }

  private step(): void {
    if (++this.k >= this.count) {
      this.k = 0;
      this.passes++;
    }
  }

  /** (coop4 AI5) The dedupe applies: `SWEEP4.dedupe` and the manager gave the peers (3+ players). */
  private dedupeOn(): boolean {
    return SWEEP4.dedupe && this.peers !== null;
  }

  private unstall(): void {
    this.stallT = 0;
    this.stallN = 0;
    this.replan = false;
    this.best = Number.NaN;
  }

  /** Where follower `rank` (1..) stands: `rank` x `SWEEP.gap` m behind the leader at (`lx`, `lz`), into `out`. */
  follow(rank: number, lx: number, lz: number, out: [number, number]): [number, number] {
    const d = SWEEP.gap * (rank > 0 ? rank : 1);
    out[0] = lx + this.bx * d;
    out[1] = lz + this.bz * d;
    return out;
  }

  /** A member joins (spawn order: the shield guard first). */
  add(m: M): void {
    if (this.members.indexOf(m) < 0) this.members.push(m);
  }

  /** A member is gone for good (despawned). */
  remove(m: M): void {
    const k = this.members.indexOf(m);
    if (k >= 0) this.members.splice(k, 1);
    if (this.leader === m) this.leader = null;
  }

  /** A woken member is a new object: he takes his old self's place. */
  swap(old: M, m: M): void {
    const k = this.members.indexOf(old);
    if (k >= 0) this.members[k] = m;
    else this.add(m);
    if (this.leader === old) this.leader = m;
  }

  private behind(dx: number, dz: number): void {
    const d = hyp2(dx, dz);
    if (d < 0.3) return;
    this.bx = dx / d;
    this.bz = dz / d;
  }
}
