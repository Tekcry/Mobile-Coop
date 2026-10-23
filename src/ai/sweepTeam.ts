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
import { SWEEP, sweepPoints, sweepStart } from './gear';

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

export class SweepTeam<M extends SweepMember = SweepMember> {
  /** The members in team order (the shield guard first). */
  readonly members: M[] = [];
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
    this.start = sweepStart(this.index, this.count);
    this.k = 0;
    this.dwellT = 0;
    this.passes = 0;
    this.visited = 0;
    this.sweeping = this.count > 0;
    if (!this.sweeping) return;
    this.switches++;
    const i = this.point;
    this.behind(x - this.pts[2 * i]!, z - this.pts[2 * i + 1]!);
  }

  /**
   * The leader at (`x`, `z`): heading for the current point (false), or at it (true: looking, `dwellT` counts; after
   * `SWEEP.dwell` the next point).
   */
  lead(dt: number, x: number, z: number): boolean {
    const i = this.point;
    if (i < 0) return false;
    const dx = x - this.pts[2 * i]!;
    const dz = z - this.pts[2 * i + 1]!;
    if (hyp2(dx, dz) > SWEEP_NEAR) {
      this.behind(dx, dz);
      this.dwellT = 0;
      return false;
    }
    this.dwellT += dt;
    if (this.dwellT >= SWEEP.dwell) this.next();
    return true;
  }

  /** On to the next point (looked at, or unreachable); after the last, the same order again. */
  next(): void {
    this.dwellT = 0;
    this.visited++;
    if (++this.k >= this.count) {
      this.k = 0;
      this.passes++;
    }
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
