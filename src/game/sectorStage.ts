import { hyp2 } from '../core/mathx';
import type { EnemyKind } from '../ai/enemyDefs';
import type { SquadSlot } from '../world/rooms';
import type { SectorDef } from './sectors';

/**
 * (sector-redesign E5, EW9) Alarm-stage extras: what a section does when the alarm reaches a stage, besides the
 * `perStage` reinforcements (DEC G125: never ends the run). Pure (no Babylon): the mode (`modes/sectorMode.ts`) hands
 * in its light, door and nav calls. Host-authoritative: lights go through the `LightRegistry` (slice L's lamp sync
 * mirrors them), door locks through the sector message's locked-door list (`lk`); no wire change.
 *
 * A stage's actions apply when the alarm reaches it, and at a section's start for every stage up to the stage carried
 * in (a section entered at stage 2 starts locked down). A section restart (A50) undoes them: the locks open (the lamps
 * go back through the section start state) and the actions of the stages up to the restored stage apply again. The
 * engine has no alarm decay (the stage only rises until a restart), so a lockdown door stays locked until the restart
 * or the section unloads; `checkStageActions` guarantees it is never the only way.
 */
export interface SectorStageAction {
  /** The alarm stage (1..`STAGE_MAX`) that sets these off. One entry per stage. */
  stage: 1 | 2 | 3;
  /** Light groups (`LightDef.group`) forced on: lights to full (shot lamps stay out). */
  lightsFull?: readonly number[];
  /**
   * Lockdown doors: doorway plan centres [x, z] (found by position, `Doors.nearest` within `STAGE_DOOR_FIND`), shut and
   * locked, and shut on the guards' nav grid. Never a connector or team door; never the only way (`checkStageActions`).
   */
  lockDoors?: readonly (readonly [number, number])[];
  /**
   * The stage's reinforcements' run-in route [x, z] (2+ points): they spawn at its first point instead of the
   * section's `reinforce` points and get it as their patrol (`Enemy.setPatrol` through the slot's `route`). Alerted, they
   * hunt first and walk the route once they calm; following it while alerted is guard-ai's (GA6).
   */
  responseRoute?: readonly (readonly [number, number])[];
  /**
   * The section's dogs are let off the heel at this stage: the stage's raise returns `dogs` (`SectorStageRun.raise`);
   * with `flags.dogRelease` the mode releases the live section's dogs (`Enemy.releaseHeel`, guard-rules S8, A12). Flag
   * off it is recorded only (`SectorStageRun.dogsReleased`).
   */
  releaseDogs?: boolean;
}

/** The highest alarm stage (`SECTOR.alarmMax`; a test keeps them equal, kept here so this module needs no runtime import). */
export const STAGE_MAX = 3;
/** A lockdown door is found within this of its doorway centre (m; the mode's `DOOR_FIND`). */
export const STAGE_DOOR_FIND = 1.2;
/**
 * A locked door's nav closure: the door width plus this along (m), and this half depth across. The one size for every
 * locked door the mode adds (lockdown doors here, team and keypad doors through `SectorTeamDoors.navClosure`).
 */
export const STAGE_NAV_ALONG = 0.5;
export const STAGE_NAV_ACROSS = 0.35;
/** The softlock check's player either side of a lockdown door: this far from the doorway centre along its normal (m). */
export const STAGE_SIDE_STEP = 0.8;
/**
 * A lockdown door waits to shut while a living player's feet are within this of its doorway centre (m, plan; mirrors
 * `DOOR.clearance`, a test keeps them equal): a door forced shut on a player would pin them.
 */
export const STAGE_DOOR_CLEAR = 0.75;
/** Path search budget of the softlock check (cells expanded; a whole section). */
const CHECK_EXPAND = 200000;

/** A door as the nav closure needs it: its centre, yaw, width and floor height. */
export interface StageDoorInfo {
  cx: number;
  cz: number;
  yaw: number;
  width: number;
  y: number;
}

/** The nav grid calls the softlock check and the mode use (`NavGrid`). */
export interface StageNav {
  addClosure(cx: number, cz: number, hx: number, hz: number, yaw: number, y: number): number;
  setClosed(id: number, on: boolean): void;
  findPath(from: [number, number], to: [number, number], maxExpand?: number, fromY?: number, toY?: number): unknown[] | null;
}

/** Shut a door's doorway on the nav grid (the one closure size): the closure id, built open. Build time only; pure. */
export function addDoorClosure(nav: Pick<StageNav, 'addClosure'>, d: StageDoorInfo): number {
  return nav.addClosure(d.cx, d.cz, STAGE_NAV_ACROSS, (d.width + STAGE_NAV_ALONG) / 2, d.yaw, d.y);
}

/** A door finder over door anchors (hinge, width, yaw: `TraversalAnchors.doors`), for the check in map tests. */
export function doorFinder(doors: readonly { hinge: { x: number; y: number; z: number }; width: number; yaw: number }[]): (x: number, z: number) => StageDoorInfo | null {
  return (x, z) => {
    let best: StageDoorInfo | null = null;
    let bd = STAGE_DOOR_FIND;
    for (const a of doors) {
      const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
      const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
      const k = hyp2(cx - x, cz - z);
      if (k < bd) {
        bd = k;
        best = { cx, cz, yaw: a.yaw, width: a.width, y: a.hinge.y };
      }
    }
    return best;
  };
}

/** The softlock check's nav: the section's nav grid and its doors. */
export interface StageNavCheck {
  nav: StageNav;
  doorAt(x: number, z: number): StageDoorInfo | null;
}

const near = (a: readonly [number, number], x: number, z: number): boolean => (a[0] - x) ** 2 + (a[1] - z) ** 2 < STAGE_DOOR_FIND * STAGE_DOOR_FIND;

/**
 * Problems with the sections' stage actions (empty when fine): stages 1..STAGE_MAX, one entry each, routes of 2+
 * points, light groups >= 0, no lockdown door at a connector or team door. With `check` (the map's nav grid and doors),
 * every lockdown door is found and the section's lockdown doors all shut together (the last stage) never cut a nav
 * path that exists without them: from each player spawn of the section (its start, the previous connector's checkpoint)
 * to its objective, and from the objective to its exit (connector or extraction). Legs with no nav path even unlocked
 * (a climb the guards' grid does not walk) are not judged. The closures it adds are left open.
 */
export function checkStageActions(defs: readonly SectorDef[], check?: StageNavCheck): string[] {
  const out: string[] = [];
  defs.forEach((d, i) => {
    const acts = d.stageActions;
    if (!acts?.length) return;
    const seen = new Set<number>();
    const doors: (readonly [number, number])[] = [];
    const prev = i > 0 ? defs[i - 1]?.connector : undefined;
    const fixed: (readonly [number, number])[] = [];
    for (const c of [d.connector, prev]) {
      if (!c) continue;
      if (c.nearAt) fixed.push(c.nearAt);
      if (c.farAt) fixed.push(c.farAt);
      for (const s of c.sealUnlocks ?? []) fixed.push(s);
    }
    for (const b of d.bolts ?? []) fixed.push(b.at);
    // (merge E5 into int) pair gate and keypad doors too: release() would unlock one after team.reset / rekey
    for (const g of d.pairGates ?? []) fixed.push(g.door);
    for (const p of d.keypads ?? []) fixed.push(p.at);
    for (const a of acts) {
      if (!Number.isInteger(a.stage) || a.stage < 1 || a.stage > STAGE_MAX) out.push(`${d.id}: stage action stage ${a.stage} is not 1..${STAGE_MAX}`);
      if (seen.has(a.stage)) out.push(`${d.id}: stage ${a.stage} listed twice`);
      seen.add(a.stage);
      for (const g of a.lightsFull ?? []) if (!Number.isInteger(g) || g < 0) out.push(`${d.id}: stage ${a.stage} light group ${g} is not a group`);
      if (a.responseRoute && a.responseRoute.length < 2) out.push(`${d.id}: stage ${a.stage} response route needs 2+ points`);
      for (const at of a.lockDoors ?? []) {
        if (fixed.some((f) => near(f, at[0], at[1]))) out.push(`${d.id}: stage ${a.stage} lockdown door (${at[0]}, ${at[1]}) is a connector or team door`);
        doors.push(at);
      }
    }
    if (check && doors.length) out.push(...softlocks(d, prev?.checkpoint, doors, check));
  });
  return out;
}

/** The lockdown doors all shut: a leg that had a nav path and lost it is a softlock. */
function softlocks(d: SectorDef, cp: { x: number; y: number; z: number } | undefined, doors: readonly (readonly [number, number])[], check: StageNavCheck): string[] {
  const out: string[] = [];
  const { nav } = check;
  const ids: number[] = [];
  const found: StageDoorInfo[] = [];
  for (const at of doors) {
    const info = check.doorAt(at[0], at[1]);
    if (!info) out.push(`${d.id}: no door at lockdown (${at[0]}, ${at[1]})`);
    else {
      ids.push(addDoorClosure(nav, info));
      found.push(info);
    }
  }
  const o = d.objective;
  const zone = d.connector ?? d.extract;
  type Leg = { what: string; a: [number, number]; ay: number; b: [number, number]; by: number };
  const legs: Leg[] = [{ what: 'the start to the objective', a: [d.start.x, d.start.z], ay: d.start.y, b: [o.x, o.z], by: o.y }];
  if (cp) legs.push({ what: 'the checkpoint to the objective', a: [cp.x, cp.z], ay: cp.y, b: [o.x, o.z], by: o.y });
  if (zone) {
    const [x0, z0, x1, z1] = zone.box;
    const exit: [number, number] = [(x0 + x1) / 2, (z0 + z1) / 2];
    const ey = zone.floorY ?? 0;
    legs.push({ what: 'the objective to the exit', a: [o.x, o.z], ay: o.y, b: exit, by: ey });
    // (E5 fix) a player either side of a lockdown door as it shuts (shut in a side room, or co-op partners split by it)
    for (const f of found) {
      const nx = Math.cos(f.yaw) * STAGE_SIDE_STEP;
      const nz = -Math.sin(f.yaw) * STAGE_SIDE_STEP;
      for (let s = -1; s <= 1; s += 2) {
        const x = f.cx + s * nx;
        const z = f.cz + s * nz;
        legs.push({ what: `beside the lockdown door (${f.cx.toFixed(1)}, ${f.cz.toFixed(1)}) at (${x.toFixed(1)}, ${z.toFixed(1)}) to the exit`, a: [x, z], ay: f.y, b: exit, by: ey });
      }
    }
  }
  const open = legs.map((l) => nav.findPath(l.a, l.b, CHECK_EXPAND, l.ay, l.by) !== null);
  for (const id of ids) nav.setClosed(id, true);
  legs.forEach((l, k) => {
    if (open[k] && nav.findPath(l.a, l.b, CHECK_EXPAND, l.ay, l.by) === null) out.push(`${d.id}: the stage lockdown doors leave no nav path from ${l.what} (a softlock)`);
  });
  for (const id of ids) nav.setClosed(id, false);
  return out;
}

/**
 * Stage `stage`'s reinforcement `i` (of this stage's batch) for section `d`: at its response route's first point with
 * the route as its patrol, else at the section's `reinforce` point `k` (taken in turn; the slice 0 offset 1.3 m every
 * other guard). Null when the section has neither.
 */
export function reinforceSlot(d: SectorDef, stage: number, i: number, k: number, kind: EnemyKind): SquadSlot | null {
  const route = d.stageActions?.find((a) => a.stage === stage)?.responseRoute;
  const at = route && route.length ? route[0] : d.reinforce.length ? d.reinforce[k % d.reinforce.length] : undefined;
  if (!at) return null;
  const slot: SquadSlot = { kind, x: at[0] + (i % 2) * 1.3, z: at[1], yaw: 0 };
  if (route && route.length) slot.route = route.map((p) => [p[0], p[1]] as [number, number]);
  return slot;
}

/** The mode's calls the stage actions use. */
export interface StageHooks<D> {
  /** Force a light group on (`LightRegistry.setGroup(group, true)`); how many lamps changed. */
  groupOn(group: number): number;
  /** Shut and lock, or unlock, a door (the mode's `lockDoor`). */
  lock(door: D, on: boolean): void;
  /** Shut or open a nav closure (`NavGrid.setClosed`). */
  navClosed(id: number, on: boolean): void;
  /**
   * May this lockdown door shut now (`doorwayClear` over the living players)? Absent: always. A door that may not
   * waits, pending, and `step` tries it again.
   */
  canShut?(door: D): boolean;
}

/** A player as the doorway test needs it (`PlayerRef`: the feet, alive). */
export interface StagePlayer {
  readonly feet: { readonly x: number; readonly z: number };
  readonly target: { readonly alive: boolean };
}

/**
 * (E5 fix) May a lockdown door at doorway centre (cx, cz) shut now: no living player's feet within `clear` of it (plan
 * distance). Allocation-free (the mode calls it every fixed tick while a lock is pending).
 */
export function doorwayClear(cx: number, cz: number, players: readonly StagePlayer[], clear = STAGE_DOOR_CLEAR): boolean {
  for (let i = 0; i < players.length; i++) {
    const p = players[i]!;
    if (p.target.alive && hyp2(p.feet.x - cx, p.feet.z - cz) < clear) return false;
  }
  return true;
}

interface StageLock<D> {
  sec: number;
  stage: number;
  door: D;
  nav: number;
  /** Raised (the stage was reached): locked, or pending. */
  on: boolean;
  /** Raised but not yet shut: a player stands in the doorway (`canShut`). */
  pending: boolean;
}

/**
 * The run's stage actions in the world. `resolve` finds each lockdown door once at the start (and makes its nav
 * closure, -1 none); a door it cannot find is skipped (the mode warns).
 */
export class SectorStageRun<D> {
  private readonly locks: StageLock<D>[] = [];
  /** Locks raised but not yet shut (`step` skips its loop at 0). */
  private pendingN = 0;
  /** A stage with `releaseDogs` was reached in the live section (tests, debug). */
  dogsReleased = false;
  /** Lockdown doors that could not be found (tests, the mode's warning). */
  readonly missing: string[] = [];

  constructor(
    private readonly defs: readonly SectorDef[],
    private readonly hooks: StageHooks<D>,
    resolve: (sec: number, x: number, z: number) => { door: D; nav: number } | null,
  ) {
    defs.forEach((d, sec) => {
      for (const a of d.stageActions ?? []) {
        for (const at of a.lockDoors ?? []) {
          const r = resolve(sec, at[0], at[1]);
          if (r) this.locks.push({ sec, stage: a.stage, door: r.door, nav: r.nav, on: false, pending: false });
          else this.missing.push(`${d.id}: no door at lockdown (${at[0]}, ${at[1]})`);
        }
      }
    });
  }

  /**
   * The alarm went from stage `from` to `to` in section `sec`: the actions of stages from+1..to. Counts changed (`doors`:
   * shut now; a door with a player in its doorway is left pending for `step`). `dogs`: this raise reached a `releaseDogs`
   * stage (an edge: a later raise that reaches no new such stage returns false).
   */
  raise(sec: number, from: number, to: number): { lights: number; doors: number; dogs: boolean } {
    let lights = 0;
    let dogs = false;
    const d = this.defs[sec];
    if (!d?.stageActions || to <= from) return { lights, doors: 0, dogs: false };
    for (const a of d.stageActions) {
      if (a.stage <= from || a.stage > to) continue;
      for (const g of a.lightsFull ?? []) lights += this.hooks.groupOn(g);
      if (a.releaseDogs) {
        this.dogsReleased = true;
        dogs = true;
      }
    }
    for (const l of this.locks) {
      if (l.sec !== sec || l.on || l.stage <= from || l.stage > to) continue;
      l.on = true;
      l.pending = true;
      this.pendingN++;
    }
    return { lights, doors: this.step(), dogs };
  }

  /**
   * (E5 fix) Shut the pending lockdown doors whose doorway is clear now (`canShut`): lock and close the nav. The mode
   * calls it every fixed tick; a plain loop, no allocation, nothing at all while none is pending. Count shut.
   */
  step(): number {
    if (this.pendingN === 0) return 0;
    let n = 0;
    const locks = this.locks;
    for (let i = 0; i < locks.length; i++) {
      const l = locks[i]!;
      if (!l.pending || (this.hooks.canShut && !this.hooks.canShut(l.door))) continue;
      l.pending = false;
      this.pendingN--;
      this.hooks.lock(l.door, true);
      if (l.nav >= 0) this.hooks.navClosed(l.nav, true);
      n++;
    }
    return n;
  }

  /**
   * Undo every lockdown (a section restart or unload): the doors unlock (left shut), their nav opens; pending ones are
   * dropped (never shut). Count unlocked.
   */
  release(): number {
    let n = 0;
    for (const l of this.locks) {
      if (!l.on) continue;
      l.on = false;
      if (l.pending) {
        l.pending = false;
        continue;
      }
      this.hooks.lock(l.door, false);
      if (l.nav >= 0) this.hooks.navClosed(l.nav, false);
      n++;
    }
    this.pendingN = 0;
    this.dogsReleased = false;
    return n;
  }

  /** Lockdown doors locked now (tests, `debug().lockdown`; pending ones not counted). */
  lockedCount(): number {
    let n = 0;
    for (const l of this.locks) if (l.on && !l.pending) n++;
    return n;
  }

  /** Lockdown doors waiting on a player in their doorway (tests). */
  pendingCount(): number {
    return this.pendingN;
  }
}
