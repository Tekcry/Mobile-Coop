/**
 * (mission KIT-SHUT, PLAN 4a "Hold shutter / door") A heavy roller shutter: one player (b, the holder) grips its bottom
 * bar, lifts it to a ~0.9 m gap and holds it while the partner (a) crawls under; letting go drops it. Forced co-op: the
 * holder is pinned at the bar, so one player can never both hold it and pass (and the host refuses a player as his own
 * partner, `notMates`). Pure and Babylon-free; registered with the kit registry (`registry.ts`) at load.
 *
 * Device (the kit device hook, one `ShutterDevice` per shutter, from the level's `ShutterSpec`s, `shutterDoor.ts`
 * `placeShutter`): x / y / z the bottom edge's middle on the shutter's plane (floor), `yaw` its normal (sin, cos),
 * `open` the gap under the edge (m). Phases: closed -> lifting -> held -> dropping -> closed. Collision (the world piece)
 * blocks above the gap only; nobody fits under it upright or crouched (crouch 1.15 m > 0.9 m): the only way through is
 * the committed crawl (kinematic), so the crawl needs a crouch and the gap held open.
 *
 * States (pose ids, PLAN 4c, `KIT_POSE_IDS.shutter`): holder `shutterOffer` (squat, grip the bar: `SHUTTER.grip` s),
 * `shutterLift` (`liftTime`), `shutterHold` (loop, the gap held), `shutterDrop` (`dropTime`, lowered); partner
 * `crawlUnder` (`crawlTime`). Wire: holder `brace` + SHUTTER_SUB with `s` = the gap (`TeamPoseIn.gap`), partner `boost`
 * + SHUTTER_SUB. Ends travel as the hang-down's (`net.teamHangEnd`): the crawler's 'pull' = through, the holder's
 * 'drop' = let go while paired.
 *
 * No crush: a release the holder asks for waits while the partner crawls or anyone is under the shutter (`holderRelease`
 * 'wait'); a forced one (hurt, shoved, off the floor, dead) drops at once, the curtain stops at `crawlBody` over anyone
 * under it (`stepShutter` floor) and the crawler is pushed clear to the nearer side (`pushTarget`).
 *
 * Guards: `ShutterDevice.visible` (open past `SHUTTER.visibleFrac` of its hold gap, the doors' `DOOR.driveShut` rule),
 * `opens` / `noticed` and `shutterNoticePoint` are what the held-shutter notice reads (`shutterNoticedBy`, called from
 * `stealthSystems.noticeOpenShutters`, J9 S2); the opening is shut on the guards' nav grid (`shutterDoor.ts`, J9 S1).
 *
 * Numbers are Night Shift's own starting values (the move is not in CT; PLAN 4a gives the 0.9 m gap).
 */
import { hyp2 } from '../../core/mathx';
import { SHUTTER_SUB, type TeamDenial, type TeamRequest } from '../teamMoves';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove, type KitState } from './registry';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate } from '../teamController';

export const SHUTTER = {
  /** The gap the holder holds it at (m; PLAN 4a "0.9 m gap"). */
  holdGap: 0.9,
  /** A crawler's back over the floor (m; hands and knees, ~0.43 of the 1.75 m stature). The curtain never comes lower
   *  than this over anyone under it. */
  crawlBody: 0.75,
  /** The gap the crawl needs to start and to go on (m; the hold gap less the wire's rounding and a lift's last frames). */
  crawlGap: 0.85,
  /** The holder squats and grips the bar (s; `shutterOffer`). */
  grip: 0.4,
  /** 0 -> the hold gap (s; a heavy manual shutter, ~0.75 m/s to the waist). */
  liftTime: 1.2,
  /** The hold gap -> 0 when let go (s; lowered by hand or dropped). */
  dropTime: 0.6,
  /** The crawl under, start to end (s; ~1.3 m at a ~0.8 m/s hands-and-knees crawl). */
  crawlTime: 1.6,
  /** The crawl ends this far off the plane on the far side (m). */
  crawlOut: 0.7,
  /** The crawl is offered from at most this far off the plane (m). */
  crawlReach: 1.0,
  /** Pushed clear (no crush): to the nearer side in this long (s). */
  pushTime: 0.35,
  /** The holder stands this far off the plane, facing it (m). */
  holdSpot: 0.45,
  /** The lift is offered from at most this far off the plane (m). */
  liftReach: 1.0,
  /** The holder's spot and the crawl lane keep this far in from the shutter's sides (m). */
  sideIn: 0.35,
  /** The crawl lane is at least this far along the shutter from the holder (m). */
  laneMin: 0.6,
  /** Under the shutter: this far either side of its plane (m; the curtain and a crawling body; a partner standing
   *  against the curtain, ~0.3 m off it, is not under it). */
  underZone: 0.3,
  /** The device's reach past its half width (`KitDevice.reach`, m). */
  useReach: 1.0,
  /** Host: the partner within this of the holder (m, plan) and this of its height (m). */
  partnerReach: 2.4,
  partnerUp: 0.5,
  /** The holder is shoved off the bar past this from the spot (m): a forced release. */
  shove: 0.6,
  /** Crawler: the holder's gap under `crawlGap` this long (s, wire jitter) = let go: pushed clear. */
  lostGrace: 0.15,
  /** Partner: a crawl request with no start after this (s) is dropped. */
  askWait: 1.0,
  /** Guards notice it open past this fraction of its hold gap (the doors' `DOOR.driveShut` 0.15, `world/doors.ts`). */
  visibleFrac: 0.15,
} as const;

/** (Guard AI hook) The open-door notice's numbers, as `stealthSystems.ts` DOOR_NOTICE_RANGE / DOOR_NOTICE_COS. */
export const SHUTTER_NOTICE = { range: 9, cos: 0.2 } as const;

/** (J9 S1 polish) After a section restart a mate's hold is ignored this long (s): their MoveState says holding until the banner reaches them. */
export const SHUTTER_RESET_HOLDOFF_S = 0.5;

export type ShutterPhase = 'closed' | 'lifting' | 'held' | 'dropping';

/** A shutter in the level (map data, `shutterDoor.ts` `placeShutter`). */
export interface ShutterSpec {
  id: string;
  /** The bottom edge's middle on the plane (floor height y) and the plane's normal yaw (rad, (sin, cos)). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** The opening (m). */
  width: number;
  height: number;
  /** The gap it is held at (m, default `SHUTTER.holdGap`). */
  holdGap?: number;
}

/** A shutter's live device (`KitDevice` + its state). Gameplay, the guards' view and the world piece read it. */
export interface ShutterDevice extends KitDevice {
  readonly kind: 'shutter';
  readonly width: number;
  readonly height: number;
  readonly holdGap: number;
  phase: ShutterPhase;
  /** The drop's current rate (m/s). */
  rate: number;
  /** Open past `SHUTTER.visibleFrac` of the hold gap: guards can notice it (as a door open past `DOOR.driveShut`). */
  visible: boolean;
  /** Seconds it has been visibly open (0 shut). */
  openFor: number;
  /** Bumped each time it becomes visibly open (a perception key: a new opening to notice). */
  opens: number;
  /** The `opens` count a guard last noticed; -1 none (J9 S2, A18). */
  noticed: number;
  /** (J9 S1 polish) Seconds a section restart still keeps it shut against a mate's hold (`SHUTTER_RESET_HOLDOFF_S`; 0 none). */
  holdOff: number;
}

/** `ShutterDevice.user` for the local player (a mate's is their id). */
export const LOCAL_USER = '@local';

// ---- level data: the specs ride on the level's anchors object (no anchors.ts / BuiltLevel field) ----

const SPECS = new WeakMap<object, ShutterSpec[]>();

/** Record a shutter on a level (`key` = the LevelBuilder's `anchors`, which the built level keeps). */
export function addShutterSpec(key: object, spec: ShutterSpec): void {
  let l = SPECS.get(key);
  if (!l) SPECS.set(key, (l = []));
  l.push(spec);
}

const NO_SPECS: readonly ShutterSpec[] = [];

/** The shutters of a built level (`{ anchors }`); none = []. */
export function shutterSpecsOf(level: unknown): readonly ShutterSpec[] {
  const a = level && typeof level === 'object' ? (level as { anchors?: unknown }).anchors : undefined;
  return a && typeof a === 'object' ? (SPECS.get(a) ?? NO_SPECS) : NO_SPECS;
}

export function newShutterDevice(s: ShutterSpec): ShutterDevice {
  return {
    id: s.id,
    kind: 'shutter',
    x: s.x,
    y: s.y,
    z: s.z,
    yaw: s.yaw,
    reach: s.width / 2 + SHUTTER.useReach,
    open: 0,
    user: '',
    width: s.width,
    height: s.height,
    holdGap: Math.min(s.holdGap ?? SHUTTER.holdGap, s.height),
    phase: 'closed',
    rate: 0,
    visible: false,
    openFor: 0,
    opens: 0,
    noticed: -1,
    holdOff: 0,
  };
}

export function isShutterDevice(d: KitDevice): d is ShutterDevice {
  return d.kind === 'shutter';
}

// ---- geometry ----

/** A point in the shutter's frame: `across` off its plane (+ = the normal's side), `along` it (+ = (cos, -sin)). */
export interface ShutterLocal {
  across: number;
  along: number;
}

export function shutterLocal(d: Pick<KitDevice, 'x' | 'z' | 'yaw'>, x: number, z: number, out: ShutterLocal): ShutterLocal {
  const dx = x - d.x;
  const dz = z - d.z;
  const s = Math.sin(d.yaw);
  const c = Math.cos(d.yaw);
  out.across = dx * s + dz * c;
  out.along = dx * c - dz * s;
  return out;
}

/** World (x, z) of a point in the shutter's frame. */
export function shutterWorld(d: Pick<KitDevice, 'x' | 'z' | 'yaw'>, across: number, along: number, out: { x: number; z: number }): { x: number; z: number } {
  const s = Math.sin(d.yaw);
  const c = Math.cos(d.yaw);
  out.x = d.x + across * s + along * c;
  out.z = d.z + across * c - along * s;
  return out;
}

/** Someone at (x, z) is under the shutter (in its opening, within `underZone` of the plane). */
export function underShutter(d: ShutterDevice, x: number, z: number, tmp: ShutterLocal): boolean {
  shutterLocal(d, x, z, tmp);
  return Math.abs(tmp.across) < SHUTTER.underZone && Math.abs(tmp.along) < d.width / 2;
}

/** The holder's spot along the shutter (clamped in from its sides); NaN = too narrow. */
export function holdAlong(d: ShutterDevice, along: number): number {
  const m = d.width / 2 - SHUTTER.sideIn;
  return m < 0 ? NaN : Math.max(-m, Math.min(m, along));
}

/**
 * The crawl lane along the shutter for a partner at `along`, kept `laneMin` clear of the holder at `holder` (moved to
 * the side with room); NaN = no room beside the holder.
 */
export function crawlLane(d: ShutterDevice, holder: number, along: number): number {
  const m = d.width / 2 - SHUTTER.sideIn;
  if (m < 0) return NaN;
  let l = Math.max(-m, Math.min(m, along));
  if (Math.abs(l - holder) >= SHUTTER.laneMin - 1e-6) return l;
  const pref = l >= holder ? 1 : -1;
  l = holder + pref * SHUTTER.laneMin;
  if (l >= -m - 1e-6 && l <= m + 1e-6) return l;
  l = holder - pref * SHUTTER.laneMin;
  return l >= -m - 1e-6 && l <= m + 1e-6 ? l : NaN;
}

/** The crawl: possible at this gap only crouched (the gap held open past `crawlGap`). */
export function canCrawl(gap: number, crouched: boolean): boolean {
  return crouched && gap >= SHUTTER.crawlGap;
}

// ---- the device's state machine (pure; no allocation) ----

/** Grip and lift from closed or from a drop (the bar caught on its way down). False when held / lifting already. */
export function shutterLift(d: ShutterDevice): boolean {
  if (d.phase === 'lifting' || d.phase === 'held') return false;
  d.phase = 'lifting';
  return true;
}

/** Let go: drops from where it is. False when shut or dropping already. */
export function shutterRelease(d: ShutterDevice): boolean {
  if (d.phase === 'closed' || d.phase === 'dropping') return false;
  d.phase = 'dropping';
  d.rate = d.holdGap / SHUTTER.dropTime;
  return true;
}

/**
 * One step of the device: lifting rises at the lift rate to the hold gap (then held), dropping falls at the drop rate
 * to shut, never below `floor` over someone under it (no crush; `floor` 0 = nobody). Updates `visible` / `openFor`.
 */
export function stepShutter(d: ShutterDevice, dt: number, floor: number): void {
  if (d.phase === 'lifting') {
    d.open = Math.min(d.holdGap, d.open + (d.holdGap / SHUTTER.liftTime) * dt);
    if (d.open >= d.holdGap) d.phase = 'held';
  } else if (d.phase === 'held') d.open = d.holdGap;
  else if (d.phase === 'dropping') {
    // the curtain rests on whoever is under it (never pushed back up past where it is)
    d.open = Math.max(d.open - d.rate * dt, Math.min(floor, d.open));
    if (d.open <= 0) {
      d.open = 0;
      d.phase = 'closed';
    }
  }
  markShutterView(d, dt);
}

/** A remote holder's gap (their `MoveState.s`): followed as is. */
export function followShutter(d: ShutterDevice, user: string, gap: number, dt: number): void {
  d.user = user;
  d.open = Math.max(0, Math.min(d.height, gap));
  d.phase = d.open >= d.holdGap - 0.02 ? 'held' : 'lifting';
  markShutterView(d, dt);
}

function markShutterView(d: ShutterDevice, dt: number): void {
  const v = d.open > SHUTTER.visibleFrac * d.holdGap;
  if (v && !d.visible) d.opens++;
  d.visible = v;
  d.openFor = v ? d.openFor + dt : 0;
}

/** (Guard AI hook) Open to a guard's eye: past the doors' shut threshold. */
export function shutterVisiblyOpen(d: ShutterDevice): boolean {
  return d.visible;
}

/** (Guard AI hook) Where a guard looks to see it open: the gap's middle under the edge. */
export function shutterNoticePoint(d: ShutterDevice, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = d.x;
  out.y = d.y + d.open * 0.5;
  out.z = d.z;
  return out;
}

/** (J9 S2) Scratch for `shutterNoticedBy` (no allocation per call). */
const NOTICE_AT = { x: 0, y: 0, z: 0 };

/**
 * (J9 S2, A18, G41) A guard at (`ex`, `ey`, `ez`) facing `yaw` notices this shutter held open: it is visibly open, he is
 * within `SHUTTER_NOTICE.range` (plan) of its notice point, on the same storey (within 1.5 m of its floor, as the door
 * notice) and facing it (the door notice's facing rule, `stealthSystems.noticeOpenDoors`). The sight line is the
 * caller's. Pure; no allocation.
 */
export function shutterNoticedBy(d: ShutterDevice, ex: number, ey: number, ez: number, yaw: number): boolean {
  if (!d.visible) return false;
  const p = shutterNoticePoint(d, NOTICE_AT);
  const dx = p.x - ex;
  const dz = p.z - ez;
  const dist = hyp2(dx, dz);
  if (dist > SHUTTER_NOTICE.range || Math.abs(d.y - ey) > 1.5) return false;
  return dist <= 0.5 || (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / dist >= SHUTTER_NOTICE.cos;
}

/**
 * A section restart puts the shutter back (J8-J9 A27); S1's `TeamController.resetKit` calls it and ends the team move's
 * own run. Drops shut at once (no drop run), nobody at the bar, not visible, and the guards' notice mark cleared; `opens`
 * is kept (the next opening is still a new one). (J9 S1 polish) For `SHUTTER_RESET_HOLDOFF_S` after it `syncShutters`
 * ignores a mate's hold: their MoveState still says holding until the restart banner reaches them, which lifted the
 * shutter again for a network trip and dropped it over `dropTime` in front of the fresh guards.
 */
export function resetShutter(d: ShutterDevice): void {
  d.open = 0;
  d.phase = 'closed';
  d.rate = 0;
  d.user = '';
  d.visible = false;
  d.openFor = 0;
  d.noticed = -1;
  d.holdOff = SHUTTER_RESET_HOLDOFF_S;
}

/** The holder's choice on a release: 'hold' (none asked), 'wait' (asked, someone is under or crawling: the drop
 *  waits), 'drop' (asked and clear, or forced: the partner is pushed clear). */
export function holderRelease(asked: boolean, forced: boolean, partnerUnder: boolean): 'hold' | 'wait' | 'drop' {
  if (forced) return 'drop';
  if (!asked) return 'hold';
  return partnerUnder ? 'wait' : 'drop';
}

/** Pushed clear: forward to the crawl's end once past the plane (`across` on the far side of `side`), else back out. */
export function pushForward(side: number, across: number): boolean {
  return across * side <= 0;
}

// ---- the host's rule ----

/**
 * The partner's crawl request (`a` crawls, `b` holds): b braced with the shutter bit and the gap held past `crawlGap`
 * (its `s`), a on the ground and crouched (`TeamSide.crouch`, the host's PF.crouch), within reach of the holder.
 */
export function checkShutter(r: TeamRequest): TeamDenial | null {
  const a = r.a;
  const b = r.b;
  if (b.mode !== 'brace' || ((b.sub ?? 0) & SHUTTER_SUB) === 0) return 'notOffering';
  if ((b.s ?? 0) < SHUTTER.crawlGap) return 'notBraced';
  if (a.mode !== 'ground') return 'busy';
  if (a.crouch !== true) return 'tooHigh';
  if (Math.abs(a.y - b.y) > SHUTTER.partnerUp || hyp2(a.x - b.x, a.z - b.z) > SHUTTER.partnerReach) return 'far';
  return null;
}

// ---- the move ----

const HOLDER: readonly KitState[] = ['shutterOffer', 'shutterLift', 'shutterHold', 'shutterDrop'];

export interface ShutterRun {
  dev: ShutterDevice | null;
  /** The start side (+1 / -1 across) and the spot / lane along the shutter. */
  side: number;
  along: number;
  /** Holder: the host paired us with a crawler; our end went to the host; a release asked while someone was under. */
  paired: boolean;
  sent: boolean;
  letGo: boolean;
  /** Holder: health at the last step (a drop = hurt = forced release). */
  hp: number;
  /** Crawler: the holder's gap under the crawl gap this long (s). */
  lostT: number;
  /** Partner: seconds since the crawl request (-1 = none). */
  asked: number;
  /** Crawler: 0 crawling, 1 pushed forward, -1 pushed back; the push's start and its clock. */
  push: number;
  pt: number;
  px: number;
  pz: number;
  /** Crawler: the path (world) start and end. */
  sx: number;
  sz: number;
  ex: number;
  ez: number;
  /** Scratch (no allocation per step). */
  readonly loc: ShutterLocal;
  readonly w: { x: number; z: number };
  /** The overrides (one object each, reused; `kin` is the controller's own vector type, cloned once). */
  readonly ovHold: MoveOverride;
  readonly ovCrawl: MoveOverride;
}

function newRun(): ShutterRun {
  return {
    dev: null,
    side: 1,
    along: 0,
    paired: false,
    sent: false,
    letGo: false,
    hp: NaN,
    lostT: 0,
    asked: -1,
    push: 0,
    pt: 0,
    px: 0,
    pz: 0,
    sx: 0,
    sz: 0,
    ex: 0,
    ez: 0,
    loc: { across: 0, along: 0 },
    w: { x: 0, z: 0 },
    ovHold: { velocity: { x: 0, z: 0 }, yaw: 0, turnRate: 12, crouch: true },
    ovCrawl: { yaw: 0, turnRate: 12, crouch: true },
  };
}

function isHolder(state: string): boolean {
  return (HOLDER as readonly string[]).includes(state);
}

function holdingShutter(m: TeamMate): boolean {
  return m.mode === 'brace' && ((m.sub ?? 0) & SHUTTER_SUB) !== 0;
}

function crawling(m: TeamMate): boolean {
  return m.mode === 'boost' && ((m.sub ?? 0) & SHUTTER_SUB) !== 0;
}

function netEnd(h: KitHost, k: 'pull' | 'drop'): void {
  h.g.net?.teamHangEnd?.(k);
}

/** Anyone (a mate, or us when `self`) under this shutter: the curtain's floor (`crawlBody`) or 0. */
function dropFloor(h: KitHost, d: ShutterDevice, loc: ShutterLocal): number {
  const c = h.g.player.controller;
  if (underShutter(d, c.pos.x, c.pos.z, loc)) return SHUTTER.crawlBody;
  const ms = h.mates();
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!;
    if (underShutter(d, m.pos.x, m.pos.z, loc) || (crawling(m) && hyp2(m.pos.x - d.x, m.pos.z - d.z) <= d.reach)) return SHUTTER.crawlBody;
  }
  return 0;
}

/**
 * Every shutter on this page, each fixed step (`SHUTTER_MOVE.tick`: whatever the state, alive or not; no holder
 * MoveState, e.g. a holder who disconnected mid-hold, = it drops): ours (the local holder's) is stepped by `step`; a
 * mate holding one is followed from their `s`, except inside a restart's hold-off (`holdOff`, counted down here on the
 * fixed step); one nobody holds any more drops (no crush). Allocation-free.
 */
export function syncShutters(h: KitHost, run: ShutterRun, dt: number): void {
  const list = h.devices.list;
  const ms = h.mates();
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isShutterDevice(d0)) continue;
    const d = d0;
    // (J9 S1 polish) the restart's hold-off counts down on every shutter (ours too: a local re-grab does not stall it)
    if (d.holdOff > 0) d.holdOff = Math.max(0, d.holdOff - dt);
    if (d === run.dev && isHolder(h.state)) continue;
    let holder: TeamMate | null = null;
    // (inside the hold-off a mate's hold is the stale one from before the restart: ignored, the shutter stays shut)
    for (let j = 0; j < ms.length && d.holdOff <= 0; j++) {
      const m = ms[j]!;
      if (holdingShutter(m) && Math.abs(m.pos.y - d.y) < 1 && hyp2(m.pos.x - d.x, m.pos.z - d.z) <= d.reach) {
        holder = m;
        break;
      }
    }
    if (holder) {
      followShutter(d, holder.id, holder.s ?? 0, dt);
      continue;
    }
    if (d.user !== '') {
      d.user = '';
      shutterRelease(d);
    }
    stepShutter(d, dt, d.phase === 'dropping' ? dropFloor(h, d, run.loc) : 0);
  }
}

function prompt(h: KitHost, text: string, x: number, y: number, z: number): void {
  h.prompt = text;
  h.promptAt.set(x, y, z);
}

/** The holder's pinned spot and facing (velocity toward the spot, no collision bypass). */
function pin(h: KitHost, run: ShutterRun, dt: number): number {
  const d = run.dev!;
  const c = h.g.player.controller;
  const w = shutterWorld(d, run.side * SHUTTER.holdSpot, run.along, run.w);
  const ov = run.ovHold;
  const v = ov.velocity!;
  const ex = w.x - c.pos.x;
  const ez = w.z - c.pos.z;
  const k = Math.min(8, 1 / Math.max(dt, 1e-3));
  v.x = ex * k;
  v.z = ez * k;
  // facing the shutter: against its normal on our side
  ov.yaw = d.yaw + (run.side > 0 ? Math.PI : 0);
  c.override = ov;
  h.g.player.pose.traverse = 'brace';
  return hyp2(ex, ez);
}

function startDrop(h: KitHost, run: ShutterRun): void {
  const d = run.dev!;
  shutterRelease(d);
  if (run.paired && !run.sent) {
    run.sent = true;
    netEnd(h, 'drop');
  }
  run.letGo = false;
  h.state = 'shutterDrop';
  h.t = 0;
}

function holderStep(h: KitHost, run: ShutterRun, dt: number, coopPressed: boolean, bPressed: boolean): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  const off = pin(h, run, dt);
  const hp = h.health();
  const hurt = hp < run.hp;
  run.hp = hp;
  const forced = hurt || !c.grounded || off > SHUTTER.shove;
  const asked = coopPressed || bPressed;
  if (bPressed) c.swallowCrouch = true;
  switch (h.state) {
    case 'shutterOffer':
      prompt(h, 'Gripping the shutter', c.pos.x, c.pos.y + 1.5, c.pos.z);
      if (forced || asked) {
        d.user = '';
        h.endWhy = forced ? 'shutter: disturbed' : 'shutter: let go';
        h.end(forced);
        return;
      }
      if (h.t >= SHUTTER.grip) {
        shutterLift(d);
        h.state = 'shutterLift';
        h.t = 0;
      }
      return;
    case 'shutterLift':
    case 'shutterHold': {
      stepShutter(d, dt, 0);
      if (h.state === 'shutterLift' && d.phase === 'held') {
        h.state = 'shutterHold';
        h.t = 0;
      }
      let busy = false;
      if (run.paired) {
        const ms = h.mates();
        for (let i = 0; i < ms.length; i++) if (ms[i]!.id === h.partner && crawling(ms[i]!)) busy = true;
      }
      busy = busy || dropFloor(h, d, run.loc) > 0;
      const act = holderRelease(asked || run.letGo, forced, busy);
      if (act === 'drop') {
        h.endWhy = forced ? 'shutter: disturbed' : 'shutter: let go';
        startDrop(h, run);
        return;
      }
      if (act === 'wait') run.letGo = true;
      prompt(h, run.letGo ? 'Partner under the shutter: holding' : 'Holding the shutter: Co-op or B lets go', c.pos.x, c.pos.y + 1.5, c.pos.z);
      return;
    }
    case 'shutterDrop':
      stepShutter(d, dt, dropFloor(h, d, run.loc));
      h.prompt = null;
      if (h.t >= SHUTTER.dropTime) {
        d.user = '';
        h.end(false);
      }
      return;
  }
}

function crawlerStep(h: KitHost, run: ShutterRun, dt: number): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  const ov = run.ovCrawl;
  const kin = ov.kinematic!;
  if (run.push === 0) {
    // the holder must still hold it open (their MoveState), else pushed clear
    let gap = 0;
    const ms = h.mates();
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (m.id === h.partner && holdingShutter(m)) gap = m.s ?? 0;
    }
    if (gap >= SHUTTER.crawlGap) run.lostT = 0;
    else if ((run.lostT += dt) > SHUTTER.lostGrace) pushClear(h, run);
  }
  if (run.push !== 0) {
    run.pt += dt;
    const k = Math.min(1, run.pt / SHUTTER.pushTime);
    const tx = run.push > 0 ? run.ex : run.sx;
    const tz = run.push > 0 ? run.ez : run.sz;
    kin.set(run.px + (tx - run.px) * k, d.y, run.pz + (tz - run.pz) * k);
    c.override = ov;
    if (k >= 1) {
      if (!run.sent) {
        run.sent = true;
        netEnd(h, run.push > 0 ? 'pull' : 'drop');
      }
      h.end(true);
    }
    return;
  }
  const k = Math.min(1, h.t / SHUTTER.crawlTime);
  kin.set(run.sx + (run.ex - run.sx) * k, d.y, run.sz + (run.ez - run.sz) * k);
  c.override = ov;
  h.prompt = null;
  if (k >= 1) {
    if (!run.sent) {
      run.sent = true;
      netEnd(h, 'pull');
    }
    h.endWhy = '';
    h.end(false);
  }
}

/** The crawler is pushed clear to the nearer side (the holder let go or was disturbed). */
function pushClear(h: KitHost, run: ShutterRun): void {
  if (run.push !== 0 || !run.dev) return;
  const c = h.g.player.controller;
  shutterLocal(run.dev, c.pos.x, c.pos.z, run.loc);
  run.push = pushForward(run.side, run.loc.across) ? 1 : -1;
  run.pt = 0;
  run.px = c.pos.x;
  run.pz = c.pos.z;
  h.endWhy = 'shutter: pushed clear';
}

function holderIdle(h: KitHost, run: ShutterRun, coopPressed: boolean): boolean | null {
  const c = h.g.player.controller;
  const d0 = h.devices.near('shutter', c.pos.x, c.pos.y, c.pos.z);
  if (!d0 || !isShutterDevice(d0)) return null;
  const d = d0;
  if (d.user !== '' || d.phase === 'held') return null;
  const l = shutterLocal(d, c.pos.x, c.pos.z, run.loc);
  const along = holdAlong(d, l.along);
  if (Math.abs(l.across) > SHUTTER.liftReach || Math.abs(l.along) > d.width / 2 || Number.isNaN(along)) return null;
  prompt(h, 'Lift the shutter: Co-op', d.x, d.y + 1.2, d.z);
  if (!coopPressed) return false;
  run.dev = d;
  run.side = l.across >= 0 ? 1 : -1;
  run.along = along;
  run.paired = run.sent = run.letGo = false;
  run.hp = h.health();
  d.user = LOCAL_USER;
  h.partner = '';
  h.state = 'shutterOffer';
  h.t = 0;
  h.count.offers++;
  pin(h, run, 1 / 60);
  return true;
}

function crawlIdle(h: KitHost, run: ShutterRun, coopPressed: boolean, free: boolean): boolean | null {
  const c = h.g.player.controller;
  const ms = h.mates();
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!;
    if (!holdingShutter(m)) continue;
    const d0 = h.devices.near('shutter', m.pos.x, m.pos.y, m.pos.z);
    if (!d0 || !isShutterDevice(d0)) continue;
    const d = d0;
    const l = shutterLocal(d, c.pos.x, c.pos.z, run.loc);
    if (Math.abs(l.across) > SHUTTER.crawlReach || Math.abs(l.along) > d.width / 2 || Math.abs(c.pos.y - d.y) > SHUTTER.partnerUp) continue;
    if (!free) return null;
    const px = c.pos.x;
    const py = c.pos.y;
    const pz = c.pos.z;
    if (run.asked >= 0) {
      prompt(h, 'Crawling under...', px, py + 1.2, pz);
      return false;
    }
    if ((m.s ?? 0) < SHUTTER.crawlGap) {
      prompt(h, 'Wait for the shutter to open', px, py + 1.2, pz);
      return false;
    }
    if (!c.crouched) {
      prompt(h, 'Crouch to crawl under the shutter', px, py + 1.2, pz);
      return false;
    }
    prompt(h, 'Crawl under: Co-op', px, py + 1.2, pz);
    if (!coopPressed) return false;
    run.asked = 0;
    h.kitRequest('shutter', m.id, -1, 0, py);
    return true;
  }
  return null;
}

export const SHUTTER_MOVE: KitMove<ShutterRun> = {
  kind: 'shutter',
  times: { shutterLift: SHUTTER.liftTime, shutterDrop: SHUTTER.dropTime, crawlUnder: SHUTTER.crawlTime },
  paired: true,
  claimsPoint: false,
  // the grip pins the holder to the bar: weapons and interact stay off
  busyOffer: true,
  newRun,
  check: checkShutter,

  tick(h, run, dt) {
    // the crawl request's timeout counts every tick with the real dt, also while another move claims the idle press
    if (run.asked >= 0 && (run.asked += dt) > SHUTTER.askWait) run.asked = -1;
    syncShutters(h, run, dt);
  },

  idle(h, run, coopPressed, free) {
    const crawl = crawlIdle(h, run, coopPressed, free);
    if (crawl !== null) return crawl;
    return free ? holderIdle(h, run, coopPressed) : null;
  },

  begin(h, run, s, self) {
    const c = h.g.player.controller;
    run.asked = -1;
    if (s.b === self) {
      // the holder: paired with the crawler (still holding: the host checked our `s`)
      h.partner = s.a;
      run.paired = isHolder(h.state);
      run.sent = false;
      return;
    }
    // the crawler: the shutter the holder is at, the lane beside them, through to the far side
    h.partner = s.b;
    const ms = h.mates();
    let hx = c.pos.x;
    let hz = c.pos.z;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (m.id === s.b) {
        hx = m.pos.x;
        hz = m.pos.z;
      }
    }
    const d0 = h.devices.near('shutter', hx, c.pos.y, hz);
    if (!d0 || !isShutterDevice(d0)) {
      h.endWhy = 'shutter: no device';
      return;
    }
    const d = d0;
    const hl = shutterLocal(d, hx, hz, run.loc).along;
    const l = shutterLocal(d, c.pos.x, c.pos.z, run.loc);
    const lane = crawlLane(d, holdAlong(d, hl), l.along);
    if (Number.isNaN(lane)) {
      h.endWhy = 'shutter: no room beside the holder';
      return;
    }
    run.dev = d;
    run.side = l.across >= 0 ? 1 : -1;
    run.along = lane;
    const st = shutterWorld(d, l.across, lane, run.w);
    run.sx = st.x;
    run.sz = st.z;
    const en = shutterWorld(d, -run.side * SHUTTER.crawlOut, lane, run.w);
    run.ex = en.x;
    run.ez = en.z;
    run.push = 0;
    run.pt = 0;
    run.lostT = 0;
    run.sent = false;
    run.paired = true;
    const ov = run.ovCrawl;
    if (!ov.kinematic) ov.kinematic = c.pos.clone();
    ov.kinematic.set(run.sx, d.y, run.sz);
    ov.yaw = d.yaw + (run.side > 0 ? Math.PI : 0);
    c.override = ov;
    h.state = 'crawlUnder';
    h.t = 0;
  },

  step(h, run, dt, coopPressed, bPressed) {
    h.t += dt;
    if (!run.dev) {
      h.endWhy = 'shutter: no device';
      h.end(true);
      return;
    }
    if (h.state === 'crawlUnder') crawlerStep(h, run, dt);
    else holderStep(h, run, dt, coopPressed, bPressed);
  },

  ended(h, run, k) {
    if (h.state === 'crawlUnder') {
      // the holder let go (or the host ended it): pushed clear; through already: done
      if (k === 'pull') h.end(false);
      else {
        run.sent = true;
        pushClear(h, run);
      }
      return;
    }
    // the holder: the crawler is through ('pull') or gone; a queued release now drops
    run.paired = false;
    run.sent = false;
    h.partner = '';
  },

  end(h, run, aborted) {
    const d = run.dev;
    if (d && isHolder(h.state)) {
      if (d.user === LOCAL_USER) d.user = '';
      shutterRelease(d);
      if (run.paired && !run.sent) {
        run.sent = true;
        netEnd(h, 'drop');
      }
    }
    if (aborted && h.state === 'crawlUnder' && !run.sent) {
      run.sent = true;
      netEnd(h, 'drop');
    }
    run.dev = null;
    run.paired = false;
    run.letGo = false;
    run.push = 0;
    run.asked = -1;
  },

  wireS(h, run) {
    return run.dev && isHolder(h.state) ? run.dev.open : 0;
  },

  gap(_h, run) {
    return run.dev ? run.dev.open : NaN;
  },

  setupDevices(_h, run, devices: KitDevices, level) {
    run.dev = null;
    const specs = shutterSpecsOf(level);
    for (let i = 0; i < specs.length; i++) devices.add(newShutterDevice(specs[i]!));
  },
};

registerKitMove(SHUTTER_MOVE);
