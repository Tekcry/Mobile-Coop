import { Color3, CreateBox, StandardMaterial, Vector3, type Mesh } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Blip } from '../../ui/hud/minimap';
import type { Interactable } from '../interactables';
import type { DoorState } from '../../world/doors';
import { CourseState, kitMoveOn, type CourseEvent, type LastRetry, type PackedCourse, type RetryCause, type StationCause } from '../course/courseState';
import { airlockPad, courseUser, deviceHoldTime, isPanelId, layoutKnownIds, registerCourse, retryKey, validateCourse, warnKey, type CourseDef, type CourseLayout, type DrillDef, type GateDef, type PlayerIdx } from '../course/courseDef';
import type { StationDef } from '../course/stationDef';
import type { CourseWire } from '../course/courseWire';
import { COURSE_CALLSIGNS, COURSE_SEND, RESTART_DELAY } from '../../config/course';
import { hyp2 } from '../../core/mathx';
import { CAM_KEY, CtDevices } from '../ctDevices';
import { consoleFor, consoleRefusal } from '../course/securityRoom';
import { CourseFeed } from '../course/courseFeed';
import { inCombat, spotFailed, stationRetryCause, type CaughtClock } from '../course/spotFail';
import { DrillDetect, emptySnap, VERBS } from '../course/drillDetect';
import { summarise } from '../course/courseRating';
import { CourseHud } from '../../ui/hud/courseHud';
import { recordBay, recordRun, updateCourseRecord } from '../../save/courseRecord';
import { groupBaseOn } from '../../world/lights';
import type { LightDef, LightRegistry } from '../../world/lights';
import { SectionStartState } from '../sectorReset';
import { COURSE_RESTART_TITLE, packRated, unpackRated } from '../course/courseWire';
import type { PlayerRef } from '../../ai/enemy';
import { CourseMarks, bayTitle, courseGrant } from '../course/courseMarks';
import { GRANT_GADGETS, coopRating, emptyGrant, putRating, type Grant, type SectionStats } from '../rating/sectionRating';
import { GADGETS } from '../gadgets';
import { stationHeal } from '../medkit';
import { REVIVES_PER_MISSION } from '../reviveClock';
import type { SectorRatingWire } from '../sectors';
import { updateRatingRecord } from '../../save/ratingRecord';
import { RatingCard, type RatingView } from '../../ui/hud/ratingCard';
import { areaSlotPoints, type SlotPoint } from '../spawnSlots';
import { REPLAN_TICKS, type StationHooks, type StationTick, type TickZone } from '../course/replan/ticks';

/** (J14 R1 fix 6) The re-planned yard's course id (`ctcourse.ts`): only it runs the sets' station ticks. */
const REPLAN_COURSE = 'ctcourseReplan';
/** (marlow-play C2) The re-plan's A2 neck isolator (`ctcourseSets/a2CarriageShed.ts` `A2_GATE`): no lights-out lure there, or the
 *  shunter walks down the crossers' lane to the cabinet. */
const REPLAN_NO_LURE_GATE = 'g-a2-neck';

/** (marlow-play C2) Does an isolator gate going dark lure the nearest calm guard to its cabinet? All but the re-plan's A2 neck. */
export function isolatorLures(courseId: string, gateId: string): boolean {
  return !(courseId === REPLAN_COURSE && gateId === REPLAN_NO_LURE_GATE);
}

/**
 * (fix round 2) The source of the station ticks' `epoch()`: one more on every course start, station retry and bay
 * restart of any match, never reset, so a tick's module-level window state cannot survive into a new match unnoticed.
 */
let tickEpoch = 0;

/** (fix 6) Are feet `p` in tick zone `z` (its plan box, and its height band when it has one)? No allocation. */
export function inTickZone(z: TickZone, p: { x: number; y: number; z: number }): boolean {
  if (p.x < z[0] || p.x > z[2] || p.z < z[1] || p.z > z[3]) return false;
  return z.length !== 6 || (p.y >= z[4] && p.y <= z[5]);
}

/** Seconds between two LANTERN radio lines. */
const RADIO_GAP = 3;
/** A hold is released when its holder's feet are this much beyond the item's reach (m). */
const HOLD_SLACK = 0.5;
/** Verbs kept per player in the test log. */
const LOG_MAX = 64;

/** Is the dev solo flag on (`?course=solo`, dev builds only, D21 / A6)? */
export function courseSoloFlag(): boolean {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('course') === 'solo';
}

/** Dev flag: the lobby offers every bay (`?course=all` or the solo flag; dev builds only, D20). */
export function courseAllBaysFlag(): boolean {
  if (!import.meta.env.DEV || typeof location === 'undefined') return false;
  const v = new URLSearchParams(location.search).get('course');
  return v === 'all' || v === 'solo';
}

/** "Moth: ledge shimmy - done" (the toast and LANTERN's short radio line on every `drillDone`). */
export function drillDoneLine(d: DrillDef, p: PlayerIdx): string {
  return `${COURSE_CALLSIGNS[p]}: ${d.name ?? d.verb} - done`;
}

/**
 * (marlow-final A8, ENGINE-ANSWERS Q2) Course guards run the CT stealth rules, as Infiltration does: a shout to 8 m and a
 * call-in, the shared last known position, search and cooldown, the detection stat. With `stealth` false a spotted
 * guard radioed every guard within 22 m, chased real positions and never searched. Undo: delete the call in `start`.
 */
export function courseGuardRules(em: { stealth: boolean }): void {
  em.stealth = true;
}

/** Scratch for `markerPoint` (called every frame: no allocation). */
const MARKER_PT = { x: 0, y: 0, z: 0 };

/** The next drill's marker point (a device's position or the drill's own point), or null. A device's point is
 *  written into a shared scratch object: read it before the next call. */
function markerPoint(lay: CourseLayout, d: DrillDef): { x: number; y: number; z: number } | null {
  if (typeof d.marker !== 'string') return d.marker;
  const dv = lay.devices[d.marker];
  if (!dv) return null;
  MARKER_PT.x = dv.x;
  MARKER_PT.y = dv.y + 1.2;
  MARKER_PT.z = dv.z;
  return MARKER_PT;
}

/** Draw (or hide) the marker of player `me`'s next drill with the pings renderer (D19; `gameplay.courseMarkers`). */
function drawMarker(g: GameState, st: CourseState, lay: CourseLayout, me: PlayerIdx): void {
  const v = g.hud.pings;
  const d = st.over ? null : st.nextDrill(me);
  const pt = d && g.app.settings.get().gameplay.courseMarkers ? markerPoint(lay, d) : null;
  if (!pt) {
    v.hideMarker();
    return;
  }
  const p = g.player.position;
  const dist = hyp2(pt.x - p.x, pt.z - p.z);
  if (g.project(pt.x, pt.y, pt.z)) v.marker(g.scr.x, g.scr.y, dist, false);
  else v.marker(Math.sin(Math.atan2(pt.x - p.x, pt.z - p.z) - g.player.cam.yaw) >= 0 ? 96 : 4, 45, dist, true);
}

/** (marlow-walk482 X2a) s after a set restart before the spotted rule can fire again (0.5 s respawn + co-op lag). */
const SPOT_HOLD = 1.5;
/** (J14 R1) s after a station retry during which the respawn points are the station's marks (the respawn lands at 0.5 s;
 *  a client rejoining inside it is placed there too). */
const PLACE_HOLD = 2;
/** (J14 R1) s a `?course=station:<n>` start keeps the marks as the respawn points while the partner joins. */
const START_PLACE = 30;

/** (J14 R1) `?course=station:<n>` (dev, tests, route-runs; any build: only a course with stations reads it): n, else 0. */
export function courseStationParam(search: string): number {
  const v = new URLSearchParams(search).get('course') ?? '';
  const m = /^station:(\d{1,2})$/.exec(v);
  return m ? Number(m[1]) : 0;
}

/** (J14 R1) Route-runs' hook on the client mirror: the retry count and the last retry, the same shape as the host's. */
export function retryHook(s: Pick<PackedCourse, 'rs' | 'rt' | 'rc'>): { restarts: number; lastRetry: LastRetry } {
  return { restarts: s.rs, lastRetry: s.rc ? { st: s.rt, cause: s.rc } : null };
}

/** (J14 R1, STATIONS.md SA2) LANTERN's line for a station retry: the bay's `retry:<id>:timer` line for a drill window,
 *  else its `retry:<id>` line; (A26) `other` only its `retry:<id>:other` line; null (no line) when the bay has none. */
export function retryLine(radio: readonly { at: string; text: string }[], stationId: string, cause: StationCause): string | null {
  // (J14 A26) a soft-lock way out says only its own line (`retry:<id>:other`), never the station's seen line
  if (cause === 'other') {
    const ok = retryKey(stationId, 'other');
    for (let i = 0; i < radio.length; i++) if (radio[i]!.at === ok) return radio[i]!.text;
    return null;
  }
  if (cause === 'timer') {
    const tk = retryKey(stationId, true);
    for (let i = 0; i < radio.length; i++) if (radio[i]!.at === tk) return radio[i]!.text;
  }
  const key = retryKey(stationId);
  for (let i = 0; i < radio.length; i++) if (radio[i]!.at === key) return radio[i]!.text;
  return null;
}

/** (J14 R1, STATIONS.md SA3) Station `def`'s marks as player slots: slot 0 (P1, the host) and slot 1 (P2) take the A and
 *  B marks by the bay's roles (`marks[0]` is role A's). */
export function stationSlots(def: StationDef, roleA: PlayerIdx): SlotPoint[] {
  const a = def.marks[0];
  const b = def.marks[1];
  const [p1, p2] = roleA === 0 ? [a, b] : [b, a];
  return [
    { x: p1.x, y: p1.y, z: p1.z, yaw: p1.yaw },
    { x: p2.x, y: p2.y, z: p2.z, yaw: p2.yaw },
  ];
}

/**
 * (coop-rejoin, walk items 4 and 7) The slot points (slot 0 the host, slot 1 the partner) of the course checkpoint `cp`
 * (`CourseState.checkpoint`: 'start' or an airlock id): the map's player spawns at the start, else the airlock's
 * `spawns`, else its middle (the partner then goes on a safe spot beside it, `slotSpawn`). Empty on a map without a
 * course.
 */
export function courseSlotPoints(g: GameState, cp: string): SlotPoint[] {
  const lay = g.world.layout.course;
  if (!lay) return [];
  const a = cp === 'start' ? undefined : lay.def.airlocks.find((x) => x.id === cp);
  if (!a) return g.world.layout.playerSpawns.slice(0, 2).map((s) => ({ x: s.pos.x, y: s.pos.y, z: s.pos.z, yaw: s.yaw }));
  return areaSlotPoints(a, g.player.cam.yaw);
}

/** (coop-rejoin) A bay-N start's checkpoint (bay 1: the start, else that bay's entry airlock). */
export function courseStartCheckpoint(g: GameState, n: number): string {
  const bays = g.world.layout.course?.def.bays;
  if (!bays || n <= 1) return 'start';
  return bays[Math.min(bays.length, Math.floor(n)) - 1]?.entry ?? 'start';
}

interface HoldRt {
  it: Interactable;
  id: string;
  /** Holder per player (bit set: that player braces the hold). */
  holders: number;
}

/**
 * Training course mode (training bunker framework): runs `CourseState` on the host (single player too), puts down the
 * gate devices (switches, hold points, bolts; airlocks are automatic, R6), keeps door and anchor locks in step, spawns a bay's
 * squad when it starts, restarts the bay when everyone is down, speaks the course radio as LANTERN (held while any
 * guard is alerted), ticks drills from real events and sends the `course` message to clients (`g.net.course`).
 */
export class CourseMode implements GameMode {
  readonly id = 'course' as const;
  state: CourseState | null = null;
  layout: CourseLayout | null = null;
  /** Per-player verb log (tests: `window.__course.log`). */
  readonly log: [string[], string[]] = [[], []];
  private devices = new Map<string, Interactable>();
  private holds: HoldRt[] = [];
  /** The bolt gates' "Unbolt" items: live only while the bolt is shut (F8; `CourseState.boltUsable`). */
  private bolts: { it: Interactable; gate: string }[] = [];
  /** The airlock floor pads' outline meshes (R6, visual only). */
  private pads: Mesh[] = [];
  /** Course door ids that are an airlock's front door (opened automatically when the cycle ends). */
  private farDoors = new Set<string>();
  /** Course door ids that are an airlock's rear door: the only doors a course lock shuts by force (D48). */
  private rearDoors = new Set<string>();
  private airSeen: string | null = null;
  private doorOf = new Map<string, DoorState>();
  private squad: Enemy[] = [];
  /** (sector-fixes S) The squad slot id of each `squad` guard (same order). */
  private squadIds: string[] = [];
  /** (J14 R1 fix 1, STATIONS SA1) Per squad slot (same order): the station live when that guard last went down, was
   *  carried or went (`noteDowns`, a course with stations only); -1 while he is up. */
  private squadDown: number[] = [];
  /** (J14 R1 fix 1) Per squad slot: the guard a squadmate woke (`EnemyManager.revive` makes a new `Enemy`), or null. */
  private squadWoken: (Enemy | null)[] = [];
  /** (sector-fixes S) Squad slots already warned about (a failed spawn is logged once per slot). */
  private readonly squadWarned = new Set<string>();
  private radioQ: string[] = [];
  private radioT = 0;
  private sendT = 0;
  private dirty = true;
  private restartT = -1;
  /** (marlow-walk482 X2a) seconds left in which the spotted rule cannot fire again after a set restart */
  private spotHold = 0;
  private lightsVer = -1;
  private feed: CourseFeed | null = null;
  /** The remote's host-visible verbs (its MoveState mode, C10). */
  private remoteDet = new DrillDetect();
  private remoteSnap = emptySnap();
  private remoteOut: string[] = [];
  private hud: CourseHud | null = null;
  private detSeen = 0;
  private startBay = 0;
  private remoteId = '';
  /** (marlow-play-2 C9) Co-op host: no partner in the course's player list (dropped and held, or not yet in). */
  partnerAway = false;
  private remoteMode = '';
  private offs: (() => void)[] = [];
  private refusal = '';
  /** P2's last refusal and its counter (the `course` message's `ref` / `rn`: the client shows its own refusals). */
  private ref2 = '';
  private refN = 0;
  /** LANTERN's last radio line and its counter (the `course` message's `rl` / `rln`: the client says it too). */
  private radioLine = '';
  private radioN = 0;
  /** The course end device (`devices.end`, "Finish"): live only in the last bay. */
  private endIt: Interactable | null = null;
  /** (CT prototype B3) The held jammer, the cameras it blinds and the lasers. */
  private ct: CtDevices | null = null;
  /** Every gate by id (load time). */
  private gateDefs = new Map<string, GateDef>();
  /** (N3) A console's device id -> its pickup gate id (the re-arm query). */
  private consoleGate = new Map<string, string>();
  /** (N2) The last course device pressed (an isolator's lure goes to the cabinet pressed). */
  private lastPress = '';
  /** (N2) Every light group's on state at the start: a bay restart puts the map's lamps back this way. */
  private lampStart: [number, boolean][] = [];
  /** (marlow-final S10, M3) The doors as the current set began (Sector Ops' `SectionStartState`): a restart puts them back. */
  private readonly startState = new SectionStartState();
  /** (S10) Set by `bayStarted` / `bayRestart`: after this step's locks the doors are recorded (1) or put back (2). */
  private doorStep = 0;
  /** (J14 R1 fix 3) The doors open (1) or shut (0) as the current set began, by door index (`takeDoorStart`). */
  private doorStart = new Uint8Array(0);
  /** (fix 3) The station whose gate doors this step's `handle` puts back (after the locks), or null. */
  private retryDoorSt: StationDef | null = null;
  /** (S10) Set restarts done (tests; every bay restart, the pause menu's and the built yard's spotted one too). */
  private bayRestarts = 0;
  /** (J14 R1) A camera reached full detection of a player since the last step (the station rule's `seen`, A22). */
  private camFull = false;
  /** (J14 R1 fix 4) s left of the post-retry hold in which a guard going into combat is put back calm (`calmCombat`). */
  private calmT = 0;
  /** (J14 R1 fix 6, lead decision a) The current bay's station tick on the re-plan (`REPLAN_TICKS`), and its bay index. */
  private tick: StationTick | null = null;
  private tickBay = -1;
  /** (fix 6) The partner's feet this step (the hooks' `playersIn`), null without one. */
  private remoteFeet: { x: number; y: number; z: number } | null = null;
  /** (fix 6) What a set's tick reads and does: one object for the match (no allocation per call). */
  private readonly hooks: StationHooks = {
    flag: (id) => this.state?.hasShared(id) ?? false,
    live: () => this.state?.station() ?? 0,
    retry: (n, cause) => this.stationRetry(n, cause),
    playersIn: (z) => this.playersIn(z),
    now: () => this.state?.clock ?? 0,
    gate: (id) => this.state?.isGateOpen(id) ?? false,
    down: (slot) => this.slotDown(slot),
    jammed: (id) => this.jamHeld(id),
    lit: (group) => this.groupLit(group),
    tripped: (id) => this.laserBroken(id),
    epoch: () => this.epochN,
  };
  /** (fix round 2) The hooks' `epoch()`: a fresh `tickEpoch` as the mode is made, at the course start, on each station
   *  retry and each bay restart. */
  private epochN = ++tickEpoch;
  /** (fix round 2, OQ4) Per laser (`CtDevices.lasers` index): the epoch and the live station of its last counted break
   *  (`laserTripped`; grown on a break, 0 = none: epochs start at 1). */
  private tripEp = new Int32Array(0);
  private tripSt = new Int32Array(0);
  /** (J14 R1) The combat time an A8 `caught` station has counted. */
  private readonly caught: CaughtClock = { t: 0 };
  /** (J14 R1) The station whose marks are the respawn points while `placeT` runs (a station retry or start). */
  private placeSt: StationDef | null = null;
  private placeT = 0;
  /** (S10) Doors the last restart put back (tests). */
  lastDoors = 0;
  /** (section-rating S6) The rated sets' marks (host / solo): each set with guards rated at its exit (A5). */
  private rating: CourseMarks | null = null;
  /** (S6) The last rated set on the wire (`course.rt`, copied per send). */
  private readonly rt: SectorRatingWire = { sec: -1, marks: 0, synced: 0, gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 };
  /** (S6) The test hook `window.__sectionRating` (Sector Ops' shape: live stats, last rating, what the last grant gave). */
  private readonly hook: { stats: SectionStats | null; last: RatingView | null; lastGrant: Grant | null } = { stats: null, last: null, lastGrant: null };
  /** (S6) The rating card on the host's HUD (the client's lives in its course mirror). */
  private card: RatingCard | null = null;
  /** (S6) The card's copy of a rating, its grant what landed on this machine (reused, no allocation). */
  private readonly cardView: RatingView = { sectionId: '', title: '', marks: 0, synced: 0, grant: emptyGrant() };
  private readonly refs: PlayerRef[] = [];

  constructor(private g: GameState) {}

  /**
   * Restarts (`window.__course.restarts`; the co-op host's lamp resync reads `mode.restarts`). (J14 R1) On a course with
   * stations: `CourseState.restarts` (station retries and downed bay restarts; the pause menu's restart does not count).
   * On the built yard as before: every bay restart.
   */
  get restarts(): number {
    const st = this.state;
    return st?.hasStations ? st.restarts : this.bayRestarts;
  }

  /** (J14 R1) The last counted retry (`{ st, cause }`), null before the first. */
  get lastRetry(): LastRetry {
    return this.state?.lastRetry ?? null;
  }

  /** (J14 R1) The course state (`mode.course.station()`). */
  get course(): CourseState | null {
    return this.state;
  }

  /** (J14 R1) The live station's number (0: none). */
  station(): number {
    return this.state?.station() ?? 0;
  }

  /** (J13 R4c hook, host) Station `n`'s retry off until any bay restart (`CourseState.retryOff`). */
  retryOff(n: number): boolean {
    return this.state?.retryOff(n) ?? false;
  }

  /**
   * (J14 R1, host only: the client never runs CourseMode) The set code's retry entry: station `n`'s drill window missed
   * (`timer`) or one of its beams broken (`seen`) retries it, through the same path as a guard's alert (`restarts`,
   * `lastRetry`, `retryOff`, the marks); `other` (J14 A26) is a set's way out of a soft-lock, taken by a 'none' station
   * too (A1's early drop into the yard). False: `n` is not the live station, its retry is 'none' (bar `other`) or off, a retry or a bay
   * restart is already under way. The world side (guards, lamps, respawn) runs at this step's `handle` (safe to call
   * from inside a device or guard update: nothing reentrant).
   */
  stationRetry(n: number, cause: StationCause): boolean {
    const st = this.state;
    if (!st || this.restartT >= 0 || this.spotHold > 0 || !st.retryStation(cause, n)) return false;
    // (fix 2) one failure, one retry: nothing retries again before this one's `handle` (which sets the hold again)
    this.spotHold = SPOT_HOLD;
    // (J14 fix) hold the pass zones now: this step's device update runs before `handle` sees `stationRetry`, and a zone
    // whose flag the retry dropped would set it again on the players' old positions
    this.ct?.holdZones(2);
    this.dirty = true;
    return true;
  }

  start(): void {
    const g = this.g;
    const lay = g.world.layout.course;
    if (!lay) {
      g.hud.banner('No course', 'This map has no training course', 4000);
      return;
    }
    this.layout = lay;
    // (fix round 2) a course start is a new epoch for the station ticks. `tripEp` / `tripSt` need no clearing here: an
    // older break carries an older epoch, which never matches `epochN` again
    this.epochN = ++tickEpoch;
    const st = new CourseState(validateCourse(lay.def, layoutKnownIds(lay)), lay.consoles);
    st.solo = courseSoloFlag();
    this.state = st;
    if (g.enemyMgr) courseGuardRules(g.enemyMgr);
    // (section-rating S6) the rated sets: counted from each set's start (the `bayStarted` events `handle` acts on)
    const rating = new CourseMarks(lay.def.bays.length);
    this.rating = rating;
    this.hook.stats = rating.stats;
    (window as unknown as { __sectionRating?: unknown }).__sectionRating = this.hook;
    this.card = new RatingCard(g.hud.el);
    // (N8) the lobby's "Start at" counts this course's bays
    registerCourse(g.world.map.id, lay.def);
    for (const b of lay.def.bays) for (const gate of b.gates) this.gateDefs.set(gate.id, gate);
    for (const c of lay.consoles ?? []) {
      for (const gate of this.gateDefs.values()) if (gate.kind === 'pickup' && gate.switchId === c.id && gate.flag === c.flag) this.consoleGate.set(c.id, gate.id);
    }
    // (N2) the lamps' start state, for a restart (every group the map has, course group or not)
    const reg = g.world.level.lights;
    const seen = new Set<number>();
    for (const l of reg.lights) {
      if (l.group < 0 || seen.has(l.group)) continue;
      seen.add(l.group);
      this.lampStart.push([l.group, groupBaseOn(reg, l.group)]);
    }
    const doors = g.world.doors;
    for (const [cid, aid] of Object.entries(lay.doors)) {
      const d = doors.list.find((x) => x.anchor.id === aid);
      if (d) this.doorOf.set(cid, d);
    }
    // automatic airlocks (R6, D46): no Cycle button, a marked floor pad; the front door opens when the cycle ends
    for (const a of lay.def.airlocks) {
      this.farDoors.add(a.farDoor);
      this.rearDoors.add(a.nearDoor);
      const rd = this.doorOf.get(a.nearDoor);
      if (rd) st.setDoorPoint(a.nearDoor, rd.cx, rd.cz);
    }
    this.pads = buildAirlockPads(g, lay);
    for (const b of lay.def.bays) for (const gate of b.gates) this.addGate(gate);
    // (B6) the paired scanners: their panels are course devices run by CtDevices (flag gate)
    for (const sc of g.world.layout.scanners ?? []) {
      this.device(sc.a, 'Hack scanner');
      this.device(sc.b, 'Hack scanner');
    }
    // the course end (the last bay's exit 'end'): refuses like an airlock while drills are open
    const end = lay.devices.end ? this.device('end', 'Finish') : null;
    if (end) {
      end.onUse = (_it, by) => this.finish(this.idx(by));
      this.endIt = end;
    }
    const ev = g.events;
    this.feed = new CourseFeed(g);
    this.offs.push(
      ev.on('alarm', () => this.state?.record('alarms')),
      ev.on('bodyFound', () => this.state?.record('bodies')),
    );
    this.detSeen = g.style.detections;
    const startAt = Math.floor(g.opts.courseBay ?? 1);
    if (startAt > 1) {
      st.startAt(startAt);
      this.startBay = st.bay;
      g.scheduleRespawn(this.checkpointPos(), 0);
    }
    // (J14 R1) `?course=station:<n>`: that station's bay with its earlier stations done, both players on its marks
    const sn = typeof location === 'undefined' ? 0 : courseStationParam(location.search);
    if (sn > 0 && st.startStation(sn)) {
      this.startBay = st.bay;
      this.placeSt = st.liveStation();
      this.placeT = START_PLACE;
      g.scheduleRespawn(this.checkpointPos(), 0);
    }
    this.hud = new CourseHud(g.hud.el);
    (window as unknown as { __course?: unknown }).__course = this;
    // (CT prototype B3) the jammer, camera and laser devices (host authority)
    this.ct = new CtDevices(g, 'host', {
      say: (t) => this.say(t),
      record: (s) => {
        this.state?.record(s);
        // (section-rating S6, A3) a camera / laser alarm breaks the set's Undetected mark too
        this.rating?.camera();
      },
      dirty: () => (this.dirty = true),
      // (guard-ai S17, G1) a laser broken / a camera's alarm: the guards search the device's spot, never the player's
      alertAt: (x, y, z, key) => {
        // (fix round 2, OQ4) a laser's break (key: its index; cameras are CAM_KEY + index) is the station ticks' `tripped`
        if (key < CAM_KEY) this.laserTripped(key);
        g.enemyMgr?.deviceAlert(x, y, z, key);
      },
      flag: (f) => this.state?.setFlag(f),
      solo: () => !!this.state?.solo,
      has: (f) => !!this.state?.hasFlag(f),
      hasShared: (f) => !!this.state?.hasShared(f),
    });
    g.ctDev = this.ct;
    // (J14 R1, A22) a camera's full detection of a player is the station rule's `seen` (CtDevices keeps its own handling)
    const sec = g.security;
    if (sec && st.hasStations) {
      const devs = sec.onEvent;
      sec.onEvent = (e) => {
        devs?.(e);
        if (e.kind === 'stage' && e.stage === 2) this.cameraFull();
      };
    }
    // (guard-ai S22, G6) the guards turn a console back on through its own gate; they hear of every toggle (`consoleEdge`)
    if (g.enemyMgr && lay.consoles?.length) g.enemyMgr.consoleHost = { reset: (id) => this.consoleBack(id) };
    this.handle();
    this.applyLocks();
  }

  /** A LANTERN radio line from a device (queued like the course lines). */
  say(text: string): void {
    if (this.radioQ.length < 4) this.radioQ.push(text);
  }

  /** Co-op host: the client's held jammer target (CT prototype B3). */
  onRemoteJam(_id: string, tgt: string, eye?: readonly [number, number, number]): void {
    this.ct?.onRemoteJam(tgt, eye);
  }

  /** Dev toggle (debug overlay): the solo flag (A6). */
  setSolo(on: boolean): void {
    if (this.state) this.state.solo = on;
  }

  /** A device item for course id `cid` (shared between gates naming the same switch). */
  private device(cid: string, label: string, braced = false): Interactable | null {
    const have = this.devices.get(cid);
    if (have) return have;
    const dv = this.layout!.devices[cid];
    if (!dv) return null;
    const ints = this.g.interactables!;
    // (N4) a hold device: the button is held `hold` s (with the hold noise pulses); the completed hold is the press
    const holdT = deviceHoldTime(dv, braced);
    const it = ints.add(`c-${cid}`, 'switch', new Vector3(dv.x, dv.y, dv.z), dv.label ?? label, holdT, dv.yaw);
    it.reach = 1.4;
    if (holdT > 0 && dv.holdNoise) it.holdNoise = dv.holdNoise;
    ints.setEnabled(it, true);
    it.onUse = (used, by) => {
      const p = this.idx(by);
      // a hold device starts from empty for the next use
      if (holdT > 0) used.progress = 0;
      if (braced) this.holdOn(cid, p);
      else this.press(cid, p);
    };
    this.devices.set(cid, it);
    return it;
  }

  private addGate(gate: GateDef): void {
    switch (gate.kind) {
      case 'lever':
        this.device(gate.switchId, 'Pull lever');
        break;
      case 'egress':
        this.device(gate.switchId, 'Release');
        break;
      case 'pickup':
        this.device(gate.switchId, 'Take');
        break;
      case 'isolator':
        for (const sw of gate.switchIds) this.device(sw, 'Isolate');
        break;
      case 'pair':
        this.device(gate.a, 'Press');
        this.device(gate.b, 'Press');
        break;
      case 'hold':
      case 'timedHold': {
        const it = this.device(gate.holdId, 'Hold', true);
        if (it && !this.holds.some((h) => h.id === gate.holdId)) this.holds.push({ it, id: gate.holdId, holders: 0 });
        break;
      }
      case 'bolt': {
        const d = this.doorOf.get(gate.doorId);
        const ints = this.g.interactables!;
        const y = d ? d.anchor.hinge.y : 0;
        const it = ints.add(`c-${gate.id}`, 'door', new Vector3(gate.at[0], y, gate.at[1]), 'Unbolt', 0);
        it.reach = 1.6;
        ints.setEnabled(it, true);
        it.onUse = (_it, by) => this.press(gate.doorId, this.idx(by));
        this.devices.set(gate.id, it);
        this.bolts.push({ it, gate: gate.id });
        break;
      }
      default:
        break;
    }
  }

  /** (marlow-bays item 3) The pause menu's restart: the current bay from its start, as everyone down (`bayRestart`
   *  respawns the host at the checkpoint, and `CoopHost.onRespawn` brings the partner back beside it). */
  restartCheckpoint(): boolean {
    const st = this.state;
    if (!st || st.over) return false;
    this.restartT = -1;
    st.restart();
    // (marlow-final) hold the pass zones now: the next step's device update runs before `handle` sees `bayRestart`
    this.ct?.holdZones(2);
    // (J14 R1) and the spotted / station rule: the old squad, still alerted, is only dropped at that `handle`
    this.spotHold = SPOT_HOLD;
    return true;
  }

  /** (marlow-bays R3) "Resume hosting" restarts at the bay the players were in (1-based). */
  resumeBay(): number {
    return (this.state?.bay ?? 0) + 1;
  }

  /** Player index of whoever used an item (`courseUser`: the host is P1, the client P2). */
  private idx(by: string | undefined): PlayerIdx {
    return courseUser(by);
  }

  private press(cid: string, p: PlayerIdx): void {
    // an optional station panel (F1b): shows its text to whoever read it; nothing waits on it
    if (isPanelId(cid)) {
      this.refuse(this.layout?.devices[cid]?.label ?? null, p);
      return;
    }
    this.lastPress = cid;
    // (sector-fixes S) a security console: refused while its guard watches it (guard-ai S22 A134: calm, free, the screens
    // in view; drawn off by a distraction he does not), the cameras are off or (N3) a timed console re-arms
    const con = consoleFor(this.layout?.consoles, cid);
    if (con) {
      const guard = this.squadOf(con.guard);
      const gid = this.consoleGate.get(cid);
      const dv = this.layout!.devices[cid];
      const watching = !!guard && !!dv && !!this.g.enemyMgr?.watchesConsole(guard, dv.x, dv.y, dv.z);
      const no = consoleRefusal(watching, !!this.state?.hasFlag(con.flag), gid !== undefined && (this.state?.gateRearm(gid) ?? 0) > 0);
      if (no) {
        this.refuse(no, p);
        return;
      }
    }
    // (B6) a scanner panel: the host's scanner pair checks the player and starts the hack
    const sw = this.ct?.scanPress(cid, p);
    if (sw !== undefined) {
      this.refuse(sw, p);
      if (!sw && this.state) this.verb(p, VERBS.switch);
      return;
    }
    const why = this.state?.press(cid, p) ?? null;
    this.refuse(why, p);
    // a device worked (not refused) is the `switch` verb
    if (!why && this.state) this.verb(p, VERBS.switch);
    this.handle();
  }

  /** Show a refusal to whoever pressed (the client through the `course` message's `ref` / `rn`). */
  private refuse(why: string | null, p: PlayerIdx): void {
    this.dirty = true;
    if (!why) return;
    if (p === 0) this.g.hud.banner('', why, 1800);
    this.refusal = why;
    if (p === 1) {
      this.ref2 = why;
      this.refN++;
    }
  }

  /** The end device: `CourseState.finish` (refused while the last bay's drills are open). */
  private finish(p: PlayerIdx): void {
    const st = this.state;
    if (!st || this.g.isEnded) return;
    this.refuse(st.finish(), p);
    this.handle();
  }

  private holdOn(cid: string, p: PlayerIdx): void {
    const h = this.holds.find((x) => x.id === cid);
    if (!h || !this.state) return;
    h.holders |= 1 << p;
    this.state.hold(cid, p, true);
    this.dirty = true;
    this.handle();
  }

  /** A verb player `p` performed (host-seen; clients report theirs through `ctick`, C10). */
  verb(p: PlayerIdx, verb: string): void {
    const st = this.state;
    if (!st) return;
    st.tick(p, verb);
    const log = this.log[p];
    if (log.length < LOG_MAX) log.push(verb);
    if (st.solo) {
      const o = this.log[p === 0 ? 1 : 0];
      if (o.length < LOG_MAX) o.push(verb);
    }
    this.dirty = true;
    this.handle();
  }

  onRemoteVerb(_id: string, verb: string): void {
    this.verb(1, verb);
  }

  /** The remote's host-visible counters through its detector (C10, A23). */
  private stepRemote(): void {
    const out = this.remoteOut;
    this.remoteDet.step(this.remoteSnap, out);
    for (let i = 0; i < out.length; i++) this.verb(1, out[i]!);
  }

  onRemoteUse(_id: string, active: boolean): void {
    const f = this.feed;
    if (!f) return;
    f.remote = active;
    if (active || f.remoteDoors === 0) return;
    f.remoteDoors = 0;
    this.remoteSnap.doors++;
    this.stepRemote();
  }

  /** (stealth-pays S1, spare 9 part B) host / solo: an interrogation's code flag, like a keypad code from a camera or a hack. */
  onIntelCode(flag: string): void {
    this.state?.setFlag(flag);
  }

  onRemoteTakedown(_id: string, kind: string): void {
    this.remoteSnap.takedowns++;
    this.remoteSnap.takedownKind = kind;
    this.stepRemote();
  }

  onRemoteGadget(_id: string, _kind: string): void {
    this.remoteSnap.gadgets++;
    this.remoteSnap.throws++;
    this.stepRemote();
  }

  /** A team move started (the host's `onTeamMove` check passed): a teamMove verb and stat for each player in it. */
  onTeamMove(a: string | undefined, b: string | undefined): void {
    const st = this.state;
    if (!st) return;
    const pa = this.idx(a);
    const pb = this.idx(b);
    st.record('teamMoves', 1, pa);
    if (pb !== pa) st.pstats[pb].teamMoves++;
    for (const p of pa === pb ? [pa] : [pa, pb]) {
      if (p === 0) this.feed?.teamMove();
      else {
        this.remoteSnap.teamMoves++;
        this.stepRemote();
      }
    }
    this.dirty = true;
  }

  onRemoteMove(_id: string, mode: string): void {
    if (mode === this.remoteMode) return;
    this.remoteMode = mode;
    // the remote's host-visible verbs through the same detector (C10); a first message only primes
    this.remoteSnap.mode = mode;
    this.stepRemote();
  }

  onLocalPing(): void {
    this.feed?.ping();
  }

  fixedUpdate(dt: number): void {
    const st = this.state;
    if (!st) return;
    const g = this.g;
    const me = g.player.position;
    st.setPlayer(0, me.x, me.y, me.z, !g.player.alive);
    const rem = g.remotePlayers();
    const r = rem[0];
    if (r) {
      this.remoteId = r.id;
      st.setPlayer(1, r.feet.x, r.feet.y, r.feet.z, !r.target.alive);
    }
    // (marlow-play-2 C9) a co-op host alone (the partner dropped and held, or not yet in): the step line says why the
    // two-player step waits (never solo: no net, or the dev solo flag)
    this.partnerAway = !r && g.net != null && !st.solo && !st.over;
    // the host's own verbs (drillDetect, the single place verbs are derived; A18)
    if (this.feed) {
      const out = this.feed.step();
      for (let i = 0; i < out.length; i++) this.verb(0, out[i]!);
    }
    // detections (the stealth style tally) count in the current bay
    const det = g.style.detections;
    if (det > this.detSeen) st.record('detections', det - this.detSeen);
    this.detSeen = det;
    // (marlow-walk482 X2a) spotted fails the set: a squad guard in combat restarts it from its start (the full reset,
    // both players back to the checkpoint; the client hears the line through `rl`). Once: the restart drops the squad
    // this step (`handle`), and never over a pending everyone-down restart. The line goes first in the queue so a
    // full queue of lines held while the guard was alerted never drops it.
    // A hold after any set restart covers the respawn wait (players still where they were seen) and co-op lag, so a
    // fresh guard cannot fail the set again before both players are back (W482 check should-fix 1).
    if (this.spotHold > 0) this.spotHold -= dt;
    if (this.placeT > 0) {
      this.placeT -= dt;
      // (J14 R1) a station start: the partner has joined, the marks stay the respawn points only a moment longer
      if (r && this.placeT > PLACE_HOLD) this.placeT = PLACE_HOLD;
    }
    // (J14 R1) a bay with stations: the station rule (seen / caught retries the live station at its marks), never
    // `spotFail`; the built yard keeps its rule
    const stations = st.bayHasStations();
    const sf = stations ? undefined : st.currentBay.spotFail;
    // The manager's list, not `squad`: Course mode spawns only this set's squad, and a knocked-out guard a squadmate wakes is a new
    // `Enemy` (`EnemyManager.revive`) that `squad` never holds (W482 check should-fix 2).
    const list = g.enemyMgr?.enemies ?? this.squad;
    if (stations) {
      // (fix 1, SA1) which station each squad guard went down / was carried in, before anything below acts on it
      this.noteDowns();
      // (fix 4) after a retry: a guard told of the old sighting goes back calm, never a second retry
      if (this.calmT > 0) {
        this.calmT -= dt;
        this.calmCombat();
      }
      // (fix 6) the re-plan's set code: the live bay's tick (drill windows, beams) may call a retry; acted on below
      if (st.def.id === REPLAN_COURSE && !st.over) {
        if (this.tickBay !== st.bay) {
          this.tickBay = st.bay;
          this.tick = REPLAN_TICKS[st.currentBay.id] ?? null;
        }
        this.remoteFeet = r ? r.feet : null;
        this.tick?.(this.hooks, dt);
      }
      const live = st.liveStation();
      const can = !!live && !st.over && this.restartT < 0 && this.spotHold <= 0;
      const rule = can && !st.isRetryOff(live!.n) ? live!.retry : 'none';
      const cause = stationRetryCause(rule, rule !== 'none' && inCombat(list), this.camFull, this.caught, dt);
      // the retry's events (gates, `stationRetry`) are acted on in this step's `handle`; (fix 2) the hold blocks a second
      // retry (the set code's `stationRetry`) before then
      if (cause && st.retryStation(cause)) {
        this.spotHold = SPOT_HOLD;
        // (J14 fix) as `stationRetry`: the pass zones held before this step's device update
        this.ct?.holdZones(2);
      }
    } else if (sf && !st.over && this.restartT < 0 && this.spotHold <= 0 && spotFailed(st.currentBay, list)) {
      this.radioQ.unshift(sf);
      if (this.radioQ.length > 4) this.radioQ.length = 4;
      this.restartCheckpoint();
    }
    this.camFull = false;
    // (section-rating S6) the set's live rating stats (the test hook)
    const rs = this.rating;
    if (rs && rs.current >= 0) {
      const bs = st.stats[rs.current];
      if (bs) rs.live(bs);
    }
    // holds: released when the holder walks off or goes down
    for (let i = 0; i < this.holds.length; i++) {
      const h = this.holds[i]!;
      for (let p = 0 as PlayerIdx; p < 2; p = (p + 1) as PlayerIdx) {
        if ((h.holders & (1 << p)) === 0) continue;
        const feet = p === 0 ? me : r ? r.feet : null;
        const up = p === 0 ? g.player.alive : r ? r.target.alive : false;
        if (!feet || !up || hyp2(feet.x - h.it.pos.x, feet.z - h.it.pos.z) > (h.it.reach ?? 1.4) + HOLD_SLACK) {
          h.holders &= ~(1 << p);
          st.hold(h.id, p, false);
          this.dirty = true;
        }
      }
    }
    // mains gates read the light groups (only when the registry changed)
    const reg = g.world.level.lights;
    if (reg.version !== this.lightsVer) {
      this.lightsVer = reg.version;
      const groups = this.layout!.groups;
      if (groups) for (const name in groups) st.setGroup(name, this.groupOn(groups[name]!));
      this.dirty = true;
    }
    this.ct?.fixedUpdate(dt);
    if (this.ct?.takeChanged()) this.dirty = true;
    st.update(dt);
    if (this.restartT >= 0) {
      this.restartT -= dt;
      // (J14 R1) a downed bay restart (one player out, or everyone down): counted with its cause
      if (this.restartT < 0) st.restart(st.downCause());
    }
    this.handle();
    const endOn = !st.over && st.currentBay.exit === 'end';
    if (this.endIt && this.endIt.enabled !== endOn) g.interactables!.setEnabled(this.endIt, endOn);
    // the airlock status (cached strings: no allocation per step); a change goes to the client at once
    const air = st.airlockStatus();
    if (air !== this.airSeen) {
      this.airSeen = air;
      this.dirty = true;
    }
    // radio, held while any guard is alerted
    this.radioT -= dt;
    if (this.radioT <= 0 && this.radioQ.length && !(g.enemyMgr?.anyAlerted ?? false)) {
      this.radioLine = `LANTERN: ${this.radioQ.shift()!}`;
      this.radioN++;
      g.hud.barks.say('lantern', this.radioLine, true);
      this.radioT = RADIO_GAP;
      this.dirty = true;
    }
    this.sendT -= dt;
    if (this.dirty || this.sendT <= 0) {
      this.applyLocks();
      g.net?.course?.(this.wire());
      this.dirty = false;
      this.sendT = COURSE_SEND;
    }
  }

  /** A light group is on: one of its lamps is on by its switches, EMP and shots. (jammer-fixes) A jam never counts: the
   *  registry's base state leaves it out, so jamming the mains lamp neither opens its gate nor toggles it with the flicker. */
  private groupOn(group: number): boolean {
    return groupBaseOn(this.g.world.level.lights, group);
  }

  /** Act on the course's events. */
  private handle(): void {
    const st = this.state;
    if (!st || st.events.length === 0) return;
    const evs = st.events.slice();
    st.clearEvents();
    for (const e of evs) this.onEvent(e);
    this.dirty = true;
    this.applyLocks();
    // (S10, M3) after the locks: a set start records its doors, a restart puts them back (locked ones too: shut as they began)
    if (this.doorStep === 1) {
      this.startState.take(this.g.world.level.lights, this.g.world.doors);
      this.takeDoorStart();
    } else if (this.doorStep === 2) this.lastDoors = this.startState.applyDoors(this.g.world.doors, true);
    this.doorStep = 0;
    // (J14 R1 fix 3) a station retry: its gates' doors as the set began, now their locks are back on
    const rd = this.retryDoorSt;
    if (rd) {
      this.retryDoorSt = null;
      this.lastDoors = this.restoreStationDoors(rd);
    }
  }

  /** (fix 3) Each door open (1) or shut (0) as the set began (beside `startState`, whose record is its own). */
  private takeDoorStart(): void {
    const ds = this.g.world.doors.list;
    if (this.doorStart.length !== ds.length) this.doorStart = new Uint8Array(ds.length);
    for (let i = 0; i < ds.length; i++) this.doorStart[i] = ds[i]!.target === 1 ? 1 : 0;
  }

  /**
   * (J14 R1 fix 3, PLAN R1 "resets only that station's gates") Station `def`'s gate doors back as the set began: open or
   * shut, uncracked (a player-opened door never closes itself, so a relocked but open door would let the players walk past
   * the retried station). Only those doors; the rest of the set's doors stay as they are. Returns how many changed.
   */
  private restoreStationDoors(def: StationDef): number {
    const st = this.state!;
    const doors = this.g.world.doors;
    let n = 0;
    // (marlow-play-2 C16) a kept stand-in (it stays open through the retry, `CourseState.retryStation`) keeps its doors as
    // they are: A2 station 4's retry no longer shuts the roller door again
    const keep = def.standIn !== undefined && (def.kit === undefined || !kitMoveOn(def.kit)) ? def.standIn : undefined;
    for (const id of def.gates) {
      if (id === keep) continue;
      for (const cid of st.gateDoorIds(id)) {
        const d = this.doorOf.get(cid);
        if (!d || d.index >= this.doorStart.length) continue;
        let changed = false;
        if (d.cracked) changed = doors.crack(d, false) || changed;
        const open = this.doorStart[d.index] === 1;
        if ((d.target === 1) !== open) {
          doors.setOpen(d, open);
          changed = true;
        }
        if (changed) n++;
      }
    }
    return n;
  }

  private onEvent(e: CourseEvent): void {
    const st = this.state!;
    const bay = st.currentBay;
    switch (e.t) {
      case 'bayStarted':
        // (marlow-play-2 C17) the last set's sightings, incidents (its downed guards' bodies logged), alarm and last-known
        // positions do not follow the players into the new set (the bay restart's `resetMemory` already clears them).
        // Course mode only: Sector Ops and the campaign never run this
        this.forgetSighting();
        this.spawnSquad(e.squad);
        this.radio('enter');
        // (section-rating S6) the set's rating counts from here
        this.rating?.begin(st.bay, st.stats[st.bay]!);
        // (S10, M3) the doors as the set begins, recorded once this step's locks are on (`handle`)
        this.doorStep = 1;
        break;
      case 'bayRestart':
        this.restartT = -1;
        this.bayRestarts++;
        // (fix round 2) the station ticks reset their windows
        this.epochN = ++tickEpoch;
        this.spotHold = SPOT_HOLD;
        // (J14 R1) a bay restart lands in the holding room, never on a station mark
        this.placeT = 0;
        this.placeSt = null;
        this.caught.t = 0;
        this.calmT = 0;
        this.retryDoorSt = null;
        // (section-rating S6, A8) the set's rating stats start again; a set already rated is never re-rated, and a grant
        // already given stays (the course has no checkpoint loadout to put back)
        this.rating?.begin(st.bay, st.stats[st.bay]!);
        // (S10, M2) a full reset, as Sector Ops' section restart: every guard, body (carried ones too) and incident
        // goes with the guards' shared memory, so the set's guards come back fresh and nobody finds the old bodies
        this.dropSquad(true);
        this.spawnSquad(e.squad);
        // the players' side (the grenades and gadgets out in the world, the stealth leftovers, the noise, the music);
        // the co-op client runs its own on the restart banner
        this.g.checkpointReset();
        this.g.security?.clearBodyReports();
        // a shot-out camera (none on Marlow's armoured ones) comes back, and every camera forgets what it had seen
        this.ct?.repair(-1);
        this.resetLights();
        // (S10, M3) the doors as the set began, once this step's locks are back on (`handle`)
        this.doorStep = 2;
        for (const h of this.holds) h.holders = 0;
        this.g.hud.banner(COURSE_RESTART_TITLE, bay.id, 2000);
        this.g.scheduleRespawn(this.checkpointPos(), 0.5);
        // (marlow-final) no pass zone fires on the old positions before both players are back at the checkpoint
        this.ct?.holdZones(2);
        break;
      case 'stationRetry':
        this.onStationRetry(e.st, e.cause, e.guards);
        break;
      case 'gateOpened':
        this.isolatorEdge(e.gate, false);
        this.radio(e.gate);
        this.radio('gate');
        break;
      case 'gateClosed':
        this.isolatorEdge(e.gate, true);
        break;
      case 'gateWarn':
        this.radio(warnKey(e.gate));
        break;
      case 'stepDone':
        this.radio(e.step);
        break;
      case 'flagSet':
        // (course-ready F2) a flag gate (the camera pocket, the scanners) never fires gateOpened: its radio line is keyed
        // by the gate id and spoken when its flag is set
        for (const gt of bay.gates) if (gt.kind === 'flag' && gt.flag === e.flag) this.radio(gt.id);
        this.consoleEdge(e.flag, false);
        break;
      case 'flagCleared':
        this.consoleEdge(e.flag, true);
        break;
      case 'drillDone': {
        const d = bay.drills.find((x) => x.id === e.drill);
        if (d) {
          const line = drillDoneLine(d, e.player);
          this.g.app.toasts.show(line);
          this.radioQ.push(line);
        }
        this.radio(e.drill);
        if (st.drillsDone()) this.radio('done');
        break;
      }
      case 'airlockCycled': {
        // the bay before the airlock is finished: the course record (C9)
        const def = st.def;
        const bi = def.bays.findIndex((b) => b.exit === e.airlock);
        const b = def.bays[bi];
        if (b) void updateCourseRecord(this.g.world.map.id, (r) => recordBay(r, def.bays.map((x) => x.id), b.id, st.stats[bi]!.time));
        // (section-rating S6) a rated set is rated as its airlock seals; its grant lands now, as the next set begins
        this.rateSet(bi, true);
        break;
      }
      case 'courseDone':
        // (section-rating S6) the last set is rated at the finish (nothing follows it to grant: the results show it)
        this.rateSet(st.bay, false);
        this.finishCourse();
        break;
      default:
        break;
    }
  }

  /**
   * (section-rating S6) Rate set `bi` once (a rated set only, A5), record the best (S5), put it on the wire and in the
   * results, and with `grant` give its reward now (the next set is beginning).
   */
  private rateSet(bi: number, grant: boolean): void {
    const st = this.state;
    const r = this.rating;
    if (!st || !r) return;
    const b = st.def.bays[bi];
    const s = st.stats[bi];
    if (!b || !s) return;
    const marks = r.rate(bi, b, s);
    if (marks < 0) return;
    const g = this.g;
    const synced = r.synced[bi] ?? 0;
    let carry = 0;
    for (const id of GRANT_GADGETS) carry += GADGETS[id].carry;
    const gr = courseGrant(marks, synced, coopRating(g.net !== null, g.playerRefsInto(this.refs).length), REVIVES_PER_MISSION, g.net?.revivesLeft?.() ?? REVIVES_PER_MISSION, carry);
    const view: RatingView = { sectionId: b.id, title: bayTitle(b), marks, synced, grant: gr };
    this.hook.last = view;
    putRating(g.sectionRatings, view);
    // an ungranted rating (the finish's) carries no grant on the wire: the client tops up nothing
    const w = this.rt;
    w.sec = bi;
    w.marks = marks;
    w.synced = synced;
    w.gadget = grant ? gr.gadget : 0;
    w.syringe = grant ? gr.syringe : 0;
    w.medkit = grant ? gr.medkit : 0;
    w.alarmStep = 0;
    this.dirty = true;
    void updateRatingRecord(g.world.map.id, b.id, marks, synced);
    if (grant) this.giveGrant(gr, view);
  }

  /**
   * (section-rating S6) A set's grant, as Sector Ops gives it: gadget charges on the host's own kit (noisemaker, then
   * gas, each up to its starting carry; the client tops up its own from `rt`), syringes (co-op: the revive cap, through
   * the net layer), medkits (a station's heal for each player). The card shows what landed on this machine.
   */
  private giveGrant(r: Grant, v: RatingView): void {
    const g = this.g;
    const given = emptyGrant();
    let n = r.gadget;
    let name: string | undefined;
    let ids = 0;
    for (const id of GRANT_GADGETS) {
      if (n <= 0) break;
      const k = g.gadgets.topUp(id, n, GADGETS[id].carry);
      if (k <= 0) continue;
      given.gadget += k;
      n -= k;
      ids++;
      name = GADGETS[id].name.toLowerCase();
    }
    const net = g.net;
    if (r.syringe > 0 && net?.addSyringes) {
      net.addSyringes(r.syringe);
      given.syringe = r.syringe;
    }
    let ownMed = 0;
    for (let k = 0; k < r.medkit; k++) {
      const h = g.target.health;
      const hp = stationHeal(h.hp, h.maxHp, g.player.alive, g.opts.difficulty ?? 'normal');
      let any = false;
      if (hp !== null) {
        h.heal(hp - h.hp);
        ownMed++;
        any = true;
      }
      const refs = g.playerRefsInto(this.refs);
      for (let i = 1; i < refs.length; i++) if (net?.healAtStation?.(refs[i]!.id)) any = true;
      if (any) given.medkit++;
    }
    this.hook.lastGrant = given;
    const c = this.cardView;
    c.sectionId = v.sectionId;
    c.title = v.title;
    c.marks = v.marks;
    c.synced = v.synced;
    c.grant.gadget = given.gadget;
    c.grant.syringe = given.syringe;
    c.grant.medkit = ownMed;
    c.grant.alarmStep = 0;
    this.card?.show(c, ids === 1 ? name : undefined);
  }

  /** The end: the course record, then the results with the course panel (D31, D32). */
  private finishCourse(): void {
    const st = this.state!;
    const def: CourseDef = st.def;
    const sum = summarise(def, st.stats, st.pstats, this.startBay);
    const last = def.bays[def.bays.length - 1]!;
    // the record is keyed by the map id (the lobby knows the map, not the course definition)
    void updateCourseRecord(this.g.world.map.id, (r) => {
      recordBay(r, def.bays.map((x) => x.id), last.id, st.stats[def.bays.length - 1]!.time);
      recordRun(r, this.startBay === 0 ? sum.team.time : null, sum.finale);
    });
    this.g.stats.course = sum;
    // the final state reaches the client before the match ends (its results read the mirror)
    this.g.net?.course?.(this.wire());
    this.g.endSession(true, 'Course complete');
  }

  private radio(at: string): void {
    const lines = this.state!.currentBay.radio;
    for (let i = 0; i < lines.length; i++) if (lines[i]!.at === at) this.radioQ.push(lines[i]!.text);
  }

  /** (fix 6) How many players' feet are in `zone` (the host's and the partner's; a downed player counts). No allocation. */
  private playersIn(zone: TickZone): number {
    let n = inTickZone(zone, this.g.player.position) ? 1 : 0;
    const f = this.remoteFeet;
    if (f && inTickZone(zone, f)) n++;
    return n;
  }

  /** (J14 R1, A22) A camera reached full detection of a player (host; read by the next step's station rule). */
  cameraFull(): void {
    this.camFull = true;
  }

  /**
   * (fix round 2, OQ4) Laser `k` (`CtDevices.lasers` index) was broken (host: CtDevices' `alertAt`, the same break that
   * raises its alarm, after its own cooldown). Kept with the epoch and live station for the hooks' `tripped`; a break in
   * the hold after a retry or a bay restart (`spotHold`: the players still where they stood) is not kept. Allocates
   * only to grow the record past the highest laser broken so far.
   */
  laserTripped(k: number): void {
    const st = this.state;
    if (!st || k < 0 || this.spotHold > 0) return;
    if (k >= this.tripEp.length) {
      const ep = new Int32Array(k + 1);
      const sn = new Int32Array(k + 1);
      ep.set(this.tripEp);
      sn.set(this.tripSt);
      this.tripEp = ep;
      this.tripSt = sn;
    }
    this.tripEp[k] = this.epochN;
    this.tripSt[k] = st.station();
  }

  /** (fix round 2) The hooks' `tripped`: laser `id` broken while the live station is live, in this epoch. No allocation. */
  private laserBroken(id: string): boolean {
    const st = this.state;
    const ct = this.ct;
    if (!st || !ct) return false;
    const n = st.station();
    if (n === 0) return false;
    const ls = ct.lasers;
    for (let k = 0; k < ls.length; k++) {
      if (ls[k]!.def.id !== id) continue;
      return k < this.tripEp.length && this.tripEp[k] === this.epochN && this.tripSt[k] === n;
    }
    return false;
  }

  /** (fix round 2, check B3) The hooks' `lit`: any lamp of light group `group` on and not shot out. No allocation. */
  private groupLit(group: number): boolean {
    const ls = this.g.world.level.lights.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && l.on && !l.destroyed) return true;
    }
    return false;
  }

  /** (fix round 2) The hooks' `jammed`: a jammer held on target `id` now (either player). No allocation. */
  private jamHeld(id: string): boolean {
    const ct = this.ct;
    return !!ct && (ct.jamId[0] === id || ct.jamId[1] === id);
  }

  /** (fix round 2) The hooks' `down`: squad slot `slot`'s guard is not up (`slotUp`); false for no such slot. No allocation. */
  private slotDown(slot: string): boolean {
    const k = this.squadIds.indexOf(slot);
    return k >= 0 && !this.slotUp(k);
  }

  /**
   * (J14 R1; BRIEF A1, A2; PLAN A17) Station `n` retried (`CourseState.retryStation` reset its gates and flags): LANTERN's
   * line first in the queue; its guards back fresh on their slots, and any other guard in combat with them (a guard
   * already dealt with at an earlier station stays down); thrown gadgets and grenades gone; the cameras forget what they
   * saw; its circuits' lamps as they began; both players to its marks (`checkpointPos` / `checkpointSpawns` while
   * `placeT` runs; the client by the host's `onRespawn`). Not a set restart: the set's rating and doors stay.
   */
  private onStationRetry(n: number, cause: RetryCause, guards: readonly string[]): void {
    const st = this.state!;
    const def = st.stationDef(n);
    if (!def) return;
    const line = cause === 'seen' || cause === 'caught' || cause === 'timer' || cause === 'other' ? retryLine(st.currentBay.radio, def.id, cause) : null;
    if (line) {
      this.radioQ.unshift(line);
      if (this.radioQ.length > 4) this.radioQ.length = 4;
    }
    this.spotHold = SPOT_HOLD;
    this.caught.t = 0;
    this.camFull = false;
    // (fix round 2) the station ticks reset their windows
    this.epochN = ++tickEpoch;
    this.resetStationGuards(n, guards);
    this.forgetSighting();
    this.calmT = SPOT_HOLD;
    const g = this.g;
    g.grenades.clear();
    g.gadgets.clearWorld();
    this.ct?.repair(-1);
    this.ct?.holdZones(2);
    // (marlow-play-2 C14) a hack running at the retry (station 17's `sc-a7`) resets silently, not "broken off... that one hurt"
    this.ct?.resetScans();
    this.resetStationLights(def);
    // (fix 3) its gates' doors as the set began, once this step's locks are back on (`handle`)
    this.retryDoorSt = def;
    this.placeSt = def;
    this.placeT = PLACE_HOLD;
    g.scheduleRespawn(this.checkpointPos(), 0.5);
    this.dirty = true;
  }

  /**
   * (J14 R1, A17; fix 1, STATIONS SA1) Station `n`'s retry, its guards: each listed guard who is up, or went down / was
   * carried while `n` was live, back fresh on his slot (a guard dealt with at an earlier station stays as left: this is
   * why a guard may sit on several stations' lists), and every other live guard in combat (a squad guard on his slot; one
   * the course does not know goes). A woken copy of a slot that respawns goes with it.
   */
  private resetStationGuards(n: number, ids: readonly string[]): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const g = this.g;
    if (g.takedown.active) g.takedown.reset();
    g.net?.releaseHolds?.();
    this.noteDowns();
    const redo: string[] = [];
    for (const id of ids) {
      const k = this.squadIds.indexOf(id);
      if (k >= 0 && !this.slotUp(k) && this.squadDown[k] !== n) continue;
      redo.push(id);
    }
    for (let i = em.enemies.length - 1; i >= 0; i--) {
      const e = em.enemies[i]!;
      if (!e.alive || e.passive || !e.alerted) continue;
      const k = this.slotOfGuard(e);
      if (k < 0) em.despawn(e);
      else if (!redo.includes(this.squadIds[k]!)) redo.push(this.squadIds[k]!);
    }
    for (const id of redo) this.respawnSlot(id);
  }

  /**
   * (fix 4, SA1 "the cause of a retry never repeats it") The sighting that caused the retry, out of the guards' shared
   * memory, as the bay restart's `resetMemory` clears it but with the guards left where they are (those dealt with at
   * earlier stations stay as left): the radio net's open calls and queued receptions, the incident board, the command
   * call and alarm, every intruder's last known position.
   */
  private forgetSighting(): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    em.radioNet.clear();
    em.board.clear();
    em.resetAlarm();
    em.intruders.clear();
    em.lkpValid = false;
    em.sightT = 99;
  }

  /**
   * (fix 4) While the post-retry hold runs: a guard who goes into combat (told of the old sighting by a shout or a call
   * already on its way) is put back calm on his slot (one the course does not know goes), and the station does not retry
   * again. Allocation-free unless a guard is reset.
   */
  private calmCombat(): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    let held = false;
    for (let i = em.enemies.length - 1; i >= 0; i--) {
      if (i >= em.enemies.length) continue;
      const e = em.enemies[i]!;
      if (!e.alive || e.passive || !e.alerted) continue;
      if (!held) {
        held = true;
        const g = this.g;
        if (g.takedown.active) g.takedown.reset();
        g.net?.releaseHolds?.();
      }
      const k = this.slotOfGuard(e);
      if (k < 0) em.despawn(e);
      else this.respawnSlot(this.squadIds[k]!);
    }
  }

  /** (fix 1) Squad slot `id` back fresh: its guard (and a woken copy of him) gone, a new one on the slot. */
  private respawnSlot(id: string): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const k = this.squadIds.indexOf(id);
    if (k >= 0) {
      const w = this.squadWoken[k];
      if (w) em.despawn(w);
      em.despawn(this.squad[k]!);
      this.squad.splice(k, 1);
      this.squadIds.splice(k, 1);
      this.squadDown.splice(k, 1);
      this.squadWoken.splice(k, 1);
    }
    const e = this.spawnSlot(id);
    if (e) this.addSquad(id, e);
  }

  /** A squad guard on slot `id` (the four squad lists in step). */
  private addSquad(id: string, e: Enemy): void {
    this.squad.push(e);
    this.squadIds.push(id);
    this.squadDown.push(-1);
    this.squadWoken.push(null);
  }

  /** (fix 1) Squad slot `k`'s guard now: the woken copy when a squadmate woke him, else the one the course spawned. */
  private slotGuard(k: number): Enemy {
    return this.squadWoken[k] ?? this.squad[k]!;
  }

  /** (fix 1) Is squad slot `k`'s guard up (alive and still in the manager's list)? No allocation. */
  private slotUp(k: number): boolean {
    const e = this.slotGuard(k);
    const em = this.g.enemyMgr;
    return e.alive && !!em && em.enemies.indexOf(e) >= 0;
  }

  /** (fix 1) The squad slot of guard `e` (the spawned one or his woken copy), -1 none. No allocation. */
  private slotOfGuard(e: Enemy): number {
    for (let k = 0; k < this.squad.length; k++) if (this.squad[k] === e || this.squadWoken[k] === e) return k;
    return -1;
  }

  /**
   * (fix 1, SA1) Per squad slot, the station live when its guard went down (knocked out, dead or gone) or his body was
   * carried; -1 again once he is up (woken). Each fixed step on a course with stations and before a retry. No allocation.
   */
  private noteDowns(): void {
    const st = this.state;
    const em = this.g.enemyMgr;
    if (!st || !em) return;
    const n = st.station();
    for (let k = 0; k < this.squad.length; k++) {
      if (this.slotUp(k)) this.squadDown[k] = -1;
      else if (this.squadDown[k]! < 0) this.squadDown[k] = n;
    }
    const bodies = em.bodies;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]!;
      if (!b.carried) continue;
      for (let k = 0; k < this.squad.length; k++) {
        if (this.slotGuard(k).id !== b.enemyId) continue;
        this.squadDown[k] = n;
        break;
      }
    }
  }

  /**
   * (J14 R1 fix 1) A guard came (back) into play: on a course with stations, a knocked-out squad guard a squadmate woke
   * is a new `Enemy` (`EnemyManager.revive`, the same guard key: `Enemy.inherit`); he takes his slot's woken place, so a
   * retry that respawns the slot removes him too. The built yard is unchanged (no stations: nothing).
   */
  onEnemyJoined(e: Enemy): void {
    if (!this.state?.hasStations || e.key < 0) return;
    for (let k = 0; k < this.squad.length; k++) {
      const o = this.slotGuard(k);
      if (o === e || o.alive || !o.ko || o.key !== e.key) continue;
      this.squadWoken[k] = e;
      this.squadDown[k] = -1;
      return;
    }
  }

  /** (J14 R1) The light groups of the station's isolator and mains gates as they began, their shot-out lamps back. */
  private resetStationLights(def: StationDef): void {
    const lay = this.layout;
    const reg = this.g.world.level.lights;
    for (const id of def.gates) {
      const gate = this.gateDefs.get(id);
      if (!gate || (gate.kind !== 'isolator' && gate.kind !== 'mains')) continue;
      const gid = lay?.groups?.[gate.group];
      if (gid === undefined) continue;
      for (const l of reg.lights) if (l.group === gid && l.destroyed) reg.restore(l.id);
      const on = this.lampStart.find((s) => s[0] === gid)?.[1] ?? true;
      reg.setGroup(gid, on);
      this.g.stealth?.syncGroup(gid, on);
    }
  }

  /** Where the players respawn: the checkpoint airlock's slot 0 point (its middle unless the map places one), or the
   *  map's first spawn. (J14 R1) While a station retry places the players: the station's first mark. */
  checkpointPos(): Vector3 {
    const ps = this.placing();
    if (ps) {
      const m = ps.marks[this.state!.roleA(this.state!.bay) === 0 ? 0 : 1];
      return new Vector3(m.x, m.y, m.z);
    }
    const st = this.state!;
    const a = st.def.airlocks.find((x) => x.id === st.checkpoint);
    if (!a) return this.g.world.layout.playerSpawns[0]!.pos.clone();
    const p = areaSlotPoints(a)[0]!;
    return new Vector3(p.x, p.y, p.z);
  }

  /** (coop-rejoin) The current checkpoint's slot points: the co-op host places a respawning partner and a (re)joining
   *  client with them. (J14 R1) While a station retry places the players: the station's two marks (slot 0, slot 1);
   *  otherwise the airlock's slots, so a rejoin, a seal or a downed restart never lands on a station mark. */
  checkpointSpawns(): SlotPoint[] {
    const ps = this.placing();
    if (ps) return stationSlots(ps, this.state!.roleA(this.state!.bay));
    const st = this.state;
    return st ? courseSlotPoints(this.g, st.checkpoint) : [];
  }

  /**
   * (marlow-play-2 C9) Co-op host: where a client that joins or reconnects mid-run goes (`CoopHost.joinSpot`): the live
   * station's marks by the bay's roles (slot 1 on its own role's mark, by the partner who waited), so a rejoiner never
   * lands in a holding room past the set's guards (A8: L7); with no station live, `checkpointSpawns`. Not per tick.
   */
  joinSpawns(): SlotPoint[] {
    const st = this.state;
    const s = this.placing() ?? st?.liveStation() ?? null;
    return st && s ? stationSlots(s, st.roleA(st.bay)) : this.checkpointSpawns();
  }

  /** (J14 R1) The station whose marks are the respawn points now, or null. */
  private placing(): StationDef | null {
    return this.placeT > 0 ? this.placeSt : null;
  }

  /** (coop-rejoin) The `course` message on the next step (a client joined or reconnected mid-run). */
  resync(): void {
    this.sendT = 0;
  }

  /**
   * The old squad goes. A held guard is let go first, as Sector Ops does (course-restart-hold): the host's own takedown
   * or grab, and co-op every guard a client holds (`tdDenied` aborts its takedown). `full` (a restart, S10 M2): every
   * guard, body and drone and the guards' shared memory (`EnemyManager.resetMemory`: incidents, calls, caution, alarm,
   * last known position), as Sector Ops' restart; else (the next set) the squad's own guards and bodies (`despawn`).
   */
  private dropSquad(full: boolean): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const g = this.g;
    if (this.squad.length || full) {
      if (g.takedown.active) g.takedown.reset();
      g.net?.releaseHolds?.();
    }
    if (full) em.resetMemory();
    // (ENGINE-ANSWERS Q4) `despawn`, not a splice and dispose: the old squad's knocked-out or dead bodies go too, so the
    // next set's guards never find them. Then whatever the manager still holds (a guard a squadmate woke is a new `Enemy`
    // that `squad` never held): Course mode only spawns the current set's guards, so none carries into the next set
    // (polish6 check should-fix).
    else {
      for (const e of this.squad) em.despawn(e);
      for (let i = em.enemies.length - 1; i >= 0; i--) em.despawn(em.enemies[i]!);
    }
    this.squad.length = 0;
    this.squadIds.length = 0;
    this.squadDown.length = 0;
    this.squadWoken.length = 0;
  }

  private spawnSquad(ids: string[]): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    this.dropSquad(false);
    for (const id of ids) {
      if (!this.layout!.squads[id]) continue;
      const e = this.spawnSlot(id);
      if (!e) break;
      this.addSquad(id, e);
    }
  }

  /** One guard on squad slot `id` (unaware, on his post / route), or null (no slot, or the spawn failed: said once). */
  private spawnSlot(id: string): Enemy | null {
    const em = this.g.enemyMgr;
    const s = this.layout!.squads[id];
    if (!em || !s) return null;
    const e = em.spawn(s.kind, new Vector3(s.x, s.y ?? Number.NaN, s.z), false, s.yaw);
    if (!e) {
      // (sector-fixes S) say so once, so a null `squadOf` is obvious (no walkable cell near the post, or the cap)
      if (!this.squadWarned.has(id)) {
        this.squadWarned.add(id);
        console.warn(`course: squad slot '${id}' failed to spawn (the rest of this bay's squad is skipped)`);
      }
      return null;
    }
    // (PR 3) a training guard: sees and hears nothing, and may know something INTERROGATE can get out of him
    if (s.passive) e.passive = true;
    if (s.info) e.info = s.info;
    if (s.route) e.setPatrol({ points: s.route, wait: s.wait, waits: s.waits, faces: s.faces, start: s.start, loop: s.loop });
    em.placeSlot(e, s); // (guard-ai S5) post, profile, section (MapLayout.guardAi zones)
    return e;
  }

  /** (guard-ai S22, G6) A console's flag set (its cameras looped: off) or cleared (on): the guards hear of the toggle. */
  private consoleEdge(flag: string, on: boolean): void {
    const lay = this.layout;
    const em = this.g.enemyMgr;
    if (!lay?.consoles || !em) return;
    for (const c of lay.consoles) {
      if (c.flag !== flag) continue;
      const dv = lay.devices[c.id];
      if (dv) em.consoleState(c.id, dv.x, dv.y, dv.z, on);
    }
  }

  /** (guard-ai S22, G6, A133) A guard worked console `id`: its loop ends (`CourseState.consoleBack`); the next `handle`
   *  sends `flagCleared` on (the guards, the cameras, the client). Not reentrant: no `handle` from inside the guards'
   *  update. */
  private consoleBack(id: string): boolean {
    const gid = this.consoleGate.get(id);
    if (gid === undefined || !this.state?.consoleBack(gid)) return false;
    this.dirty = true;
    return true;
  }

  /** (sector-fixes S) The current bay's guard spawned from squad slot `slot` (alive or down), or null. */
  squadOf(slot: string): Enemy | null {
    const k = this.squadIds.indexOf(slot);
    return k >= 0 ? (this.squad[k] ?? null) : null;
  }

  /**
   * (N2) An isolator gate opened (the circuit goes dark: the lights-out lure at the cabinet pressed) or closed (the
   * circuit comes back on). Any other gate: nothing.
   */
  private isolatorEdge(gateId: string, on: boolean): void {
    const gate = this.gateDefs.get(gateId);
    const lay = this.layout;
    if (!gate || gate.kind !== 'isolator' || !lay) return;
    const gid = lay.groups?.[gate.group];
    if (gid === undefined) return;
    const cab = gate.switchIds.includes(this.lastPress) ? this.lastPress : gate.switchIds[0]!;
    const dv = lay.devices[cab];
    const x = dv ? dv.x : 0;
    const z = dv ? dv.z : 0;
    const s = this.g.stealth;
    // (marlow-play C2) no lure: the circuit and its switches follow as `isolate` does, but no guard comes to the cabinet
    const lure = isolatorLures(this.state ? this.state.def.id : '', gateId);
    if (s && lure) s.isolate(gid, on, x, z);
    else if (s) {
      this.g.world.level.lights.setGroup(gid, on);
      s.syncGroup(gid, on);
      this.g.events.emit('lightSwitch', { on });
    } else {
      this.g.world.level.lights.setGroup(gid, on);
      if (!on && lure) this.g.enemyMgr?.lightsOut(x, z);
    }
    this.dirty = true;
  }

  /**
   * Restart: the map's lamps as they were at the start (every light group, course group or not; N2 fixes the old early
   * return, which left a map without course groups dark) and every shot-out lamp restored.
   */
  private resetLights(): void {
    const reg = this.g.world.level.lights;
    for (const l of reg.lights) if (l.destroyed) reg.restore(l.id);
    for (const [gid, on] of this.lampStart) {
      reg.setGroup(gid, on);
      this.g.stealth?.syncGroup(gid, on);
    }
    // a course group with no lamps at the start (none in the snapshot) still comes back on
    const groups = this.layout!.groups;
    if (groups) for (const name in groups) {
      const gid = groups[name]!;
      if (this.lampStart.some((s) => s[0] === gid)) continue;
      reg.setGroup(gid, true);
      this.g.stealth?.syncGroup(gid, true);
    }
  }

  /** Door and anchor locks onto the world (and the door items' enabled flags, T0 Q3). */
  private applyLocks(): void {
    const st = this.state;
    if (!st) return;
    const g = this.g;
    const doors = g.world.doors;
    for (const [cid, d] of this.doorOf) {
      const on = st.locked(cid);
      if (d.anchor.locked === on) continue;
      doors.setLocked(d, on);
      // an airlock's rear door shuts when it locks (leaf swings closed, the body comes back: D48; both players are on the
      // pad, clear of the doorway); other gates (hold / timedHold) only lock, never forced shut on a player in the
      // doorway (the body would trap him); an airlock's front door opens by itself when its cycle ends (R6)
      if (on && this.rearDoors.has(cid)) doors.setOpen(d, false);
      else if (this.farDoors.has(cid)) doors.open(d, 'quiet');
      const it = g.interactables?.items.find((x) => x.id === `door-${d.anchor.id}`);
      if (it) g.interactables!.setEnabled(it, !on);
    }
    // (F8) an unbolted door's "Unbolt" item goes off (the door menu shows again); a bay restart brings it back. The
    // client mirrors the item's enabled flag through the item list (no wire change)
    for (let i = 0; i < this.bolts.length; i++) {
      const b = this.bolts[i]!;
      const live = st.boltUsable(b.gate);
      if (b.it.enabled !== live) g.interactables!.setEnabled(b.it, live);
    }
    const anchors = this.layout!.anchors;
    const dis = g.traversal.attachCtl.disabled;
    if (anchors) for (const name in anchors) {
      const id = anchors[name]!;
      if (st.anchorLocked(name)) dis.add(id);
      else dis.delete(id);
    }
  }

  /** The `course` message body. */
  wire(): CourseWire {
    const g = this.g;
    const locks: number[] = [];
    for (const d of g.world.doors.list) if (d.anchor.locked) locks.push(d.index);
    const groups: [number, boolean][] = [];
    for (const gid of Object.values(this.layout!.groups ?? {})) groups.push([gid, this.groupOn(gid)]);
    const dead = deadLamps(g.world.level.lights, []);
    return { s: this.state!.pack(), locks, anchors: [...g.traversal.attachCtl.disabled], lights: { groups, dead }, ref: this.ref2, rn: this.refN, rl: this.radioLine, rln: this.radioN, ...(this.ct ? { sec: this.ct.wire() } : {}), rt: { ...this.rt }, ...(this.rating ? { rh: packRated(this.rating.marks, this.rating.synced) } : {}) };
  }

  /** Test view (`window.__course.debug()`). */
  debug(): Record<string, unknown> {
    const st = this.state;
    if (!st) return {};
    return {
      bay: st.bay,
      checkpoint: st.checkpoint,
      solo: st.solo,
      locks: st.lockedDoors(),
      anchors: st.lockedAnchors(),
      air: Object.fromEntries(st.def.airlocks.map((a) => [a.id, st.airlockPhase(a.id)])),
      gates: Object.fromEntries(st.def.bays.flatMap((b) => b.gates.map((x) => [x.id, st.isGateOpen(x.id)]))),
      log: this.log,
      refusal: this.refusal,
      remote: this.remoteId,
      squad: this.squad.length,
    };
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    if (!this.state) return;
    const p: PlayerIdx | undefined = h.attackerId === 'local' || h.attackerId === '' ? 0 : h.attackerId ? 1 : undefined;
    this.state.record(e.ko ? 'knockouts' : 'kills', 1, p);
    // (section-rating S6, A6) two knock-outs by the two players within SYNC_WINDOW are one synced takedown
    if (e.ko && p !== undefined && this.rating?.takedown(p, this.state.clock)) this.state.record('synced', 1);
  }

  onPlayerDeath(): void {
    // everyone is down: the bay restarts (CourseState does it after RESTART_DELAY when it sees both down; this covers
    // a lone host and a leaver)
    if (this.state && this.restartT < 0) this.restartT = RESTART_DELAY + 0.1;
    // (course-ready F4) the host's banner names who is down: the host itself, or the partner who went out
    if (this.g.player.alive) this.g.hud.banner('PARTNER DOWN', 'Restarting the bay', 2000);
    else this.g.hud.banner('DOWN', 'Restarting the bay', 2000);
  }

  frameUpdate(dt: number): void {
    this.card?.update(dt);
    const st = this.state;
    if (!st || !this.hud) return;
    this.hud.setAway(this.partnerAway);
    this.hud.update(st, 0);
    this.hud.setStatus(st.airlockStatus());
    drawMarker(this.g, st, this.layout!, 0);
  }

  blips(): Blip[] {
    return [];
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.feed?.dispose();
    this.hud?.dispose();
    this.ct?.dispose();
    this.ct = null;
    this.g.ctDev = null;
    if (this.g.enemyMgr) this.g.enemyMgr.consoleHost = null;
    for (const m of this.pads) m.dispose();
    this.pads.length = 0;
    this.g.hud.pings.hideMarker();
    this.card?.el.remove();
    this.card = null;
    const w = window as unknown as { __course?: unknown; __sectionRating?: unknown };
    if (w.__course === this) delete w.__course;
    if (w.__sectionRating === this.hook) delete w.__sectionRating;
  }
}

/** The refusal counter the client last showed (a new match starts the host's counter at 0 again). */
let shownRn = 0;

/** The client's mirror of the course (HUD, markers, toasts, results): built from the map's layout, fed by `course`. */
interface ClientCourse {
  st: CourseState;
  lay: CourseLayout;
  hud: CourseHud;
  /** Open flags per drill and player before the last apply (drillDone toasts on the client). */
  open: boolean[];
  startBay: number;
  /** The host's radio counter the client last said. */
  radioN: number;
  pads: Mesh[];
  /** (CT prototype B3) The cameras and lasers as the host's jam list drives them. */
  ct: CtDevices;
  /** Anchor ids of the airlocks' rear doors (the only doors a lock shuts by force, as on the host). */
  rear: Set<number>;
  /** (section-rating S6) The host's last rated bay taken (-2 before the first message, -1 none yet). */
  ratedBay: number;
  /** (S6) The client's rating card and its reused view. */
  card: RatingCard;
  cardView: RatingView;
}
const mirrors = new WeakMap<GameState, ClientCourse>();

function mirrorOf(g: GameState): ClientCourse | null {
  let m = mirrors.get(g);
  if (m) return m;
  const lay = g.world.layout.course;
  if (!lay) return null;
  const st = new CourseState(lay.def, lay.consoles);
  const ct = new CtDevices(g, 'client', { say: () => undefined, record: () => undefined, dirty: () => undefined, has: (f) => st.hasFlag(f), hasShared: (f) => st.hasShared(f) });
  g.ctDev = ct;
  m = { st, lay, hud: new CourseHud(g.hud.el), open: [], startBay: -1, radioN: 0, pads: buildAirlockPads(g, lay), ct, rear: rearDoorAnchors(lay), ratedBay: -2, card: new RatingCard(g.hud.el), cardView: { sectionId: '', title: '', marks: 0, synced: 0, grant: emptyGrant() } };
  mirrors.set(g, m);
  return m;
}

/** Client, per frame: the tutorial HUD and the next drill's marker for P2. */
export function clientCourseFrame(g: GameState, dt: number): void {
  const m = mirrors.get(g);
  if (!m) return;
  m.ct.frame(dt);
  m.card.update(dt);
  // (N1) timed windows run down between two messages (the HUD's "Lights back in 9 s")
  m.st.advanceMirror(dt);
  m.hud.update(m.st, 1);
  m.hud.setStatus(m.st.airlockStatus());
  drawMarker(g, m.st, m.lay, 1);
}

/** Client: the results' course panel from the mirror. */
export function clientCourseSummary(g: GameState): ReturnType<typeof summarise> | null {
  const m = mirrors.get(g);
  return m ? summarise(m.st.def, m.st.stats, m.st.pstats, Math.max(0, m.startBay)) : null;
}

/** Client: the match ended or was left. */
export function disposeClientCourse(g: GameState): void {
  const m = mirrors.get(g);
  if (!m) return;
  m.hud.dispose();
  m.card.el.remove();
  m.ct.dispose();
  g.ctDev = null;
  for (const p of m.pads) p.dispose();
  g.hud.pings.hideMarker();
  mirrors.delete(g);
}

/**
 * (section-rating S6) Client: a new rated set on the host's `rt` (a new bay index): the results line, the gadget part of
 * the grant on our own kit (noisemaker, then gas, each up to its starting carry, as the host's), and the card. The first
 * message only records what is already rated (a late join or rejoin: results only, no top-up); the course's last set,
 * rated at the finish, goes to the results only.
 */
function mirrorRating(g: GameState, m: ClientCourse, rt: SectorRatingWire | undefined, rh?: readonly number[]): void {
  const first = m.ratedBay === -2;
  if (!rt) {
    if (first) m.ratedBay = -1;
    return;
  }
  if (rt.sec === m.ratedBay) return;
  m.ratedBay = rt.sec;
  const bays = m.st.def.bays;
  const b = bays[rt.sec];
  if (!b) return;
  const v: RatingView = { sectionId: b.id, title: bayTitle(b), marks: rt.marks, synced: rt.synced, grant: { gadget: rt.gadget, syringe: rt.syringe, medkit: rt.medkit, alarmStep: rt.alarmStep } };
  // (S6 fix) a late join / rejoin: every set rated before we came from `rh` (results lines only), the last as on `rt`
  if (first && rh) {
    for (let i = 0; i < rh.length && i < bays.length; i++) {
      const r = i === rt.sec ? null : unpackRated(rh[i]!);
      if (r) putRating(g.sectionRatings, { sectionId: bays[i]!.id, title: bayTitle(bays[i]!), marks: r.marks, synced: r.synced, grant: emptyGrant() });
    }
  }
  putRating(g.sectionRatings, v);
  const w = window as unknown as { __sectionRating?: { stats: unknown; last: RatingView | null; lastGrant: unknown; seq?: number } };
  if (w.__sectionRating) w.__sectionRating.last = v;
  else w.__sectionRating = { stats: null, last: v, lastGrant: null, seq: 0 };
  if (first) return;
  w.__sectionRating.seq = (w.__sectionRating.seq ?? 0) + 1;
  let n = rt.gadget;
  let name: string | undefined;
  let ids = 0;
  let added = 0;
  for (const id of GRANT_GADGETS) {
    if (n <= 0) break;
    const k = g.gadgets.topUp(id, n, GADGETS[id].carry);
    if (k <= 0) continue;
    n -= k;
    added += k;
    ids++;
    name = GADGETS[id].name.toLowerCase();
  }
  if (rt.sec >= bays.length - 1) return;
  // the card names only what lands here: the charges added, a medkit only when the host's heal heals us now
  const c = m.cardView;
  c.sectionId = v.sectionId;
  c.title = v.title;
  c.marks = v.marks;
  c.synced = v.synced;
  const h = g.target.health;
  c.grant.gadget = added;
  c.grant.syringe = rt.syringe;
  c.grant.medkit = stationHeal(h.hp, h.maxHp, g.player.alive, g.opts.difficulty ?? 'normal') !== null ? rt.medkit : 0;
  c.grant.alarmStep = 0;
  m.card.show(c, ids === 1 ? name : undefined);
}

/** Client: mirror the packed state; a drill newly done shows the toast (both players' drills). */
function mirrorApply(g: GameState, w: CourseWire): void {
  const m = mirrorOf(g);
  if (!m) return;
  // LANTERN's radio, as the host said it (held there while guards are alerted)
  const rln = w.rln ?? 0;
  if (rln > m.radioN && w.rl) g.hud.barks.say('lantern', w.rl, true);
  m.radioN = rln;
  const st = m.st;
  const bayBefore = st.bay;
  const first = m.startBay < 0;
  st.apply(w.s);
  if (first) m.startBay = w.s.bay;
  const drills = st.currentBay.drills;
  if (st.bay !== bayBefore || first) {
    m.open.length = 0;
    for (const d of drills) m.open.push(st.drillOpenFor(d, 0), st.drillOpenFor(d, 1));
    return;
  }
  for (let i = 0; i < drills.length; i++) {
    const d = drills[i]!;
    for (let p = 0 as PlayerIdx; p < 2; p = (p + 1) as PlayerIdx) {
      const was = m.open[i * 2 + p] ?? false;
      const now = st.drillOpenFor(d, p);
      if (was && !now && st.drillTicks(d.id, p) > 0) g.app.toasts.show(drillDoneLine(d, p));
      m.open[i * 2 + p] = now;
    }
  }
}

/** (coop-real F1a, S2) Host: the ids of every shot-out lamp into `out` (cleared first), for `course`'s `lights.dead`.
 *  No allocation. */
export function deadLamps(reg: LightRegistry, out: number[]): number[] {
  out.length = 0;
  for (const l of reg.lights) if (l.destroyed) out.push(l.id);
  return out;
}

/**
 * (coop-real F1a, S2) Client: put the host's `course` lights on a registry, in this order: a lamp shot here but not in
 * `dead` comes back (a course restart), every lamp in `dead` is killed (`onShot` fires once per lamp newly killed here:
 * the sparks cue), then each group takes the host's switch state (`setGroup` skips shot lamps). Ids the registry lacks
 * are skipped. Returns how many lamps were newly killed. No allocation.
 */
export function applyCourseLights(reg: LightRegistry, lights: CourseWire['lights'], onShot?: (l: LightDef) => void): number {
  const dead = lights.dead;
  for (const l of reg.lights) if (l.destroyed && !dead.includes(l.id)) reg.restore(l.id);
  let shot = 0;
  for (const id of dead) {
    const l = reg.lights[id];
    if (!l || l.destroyed) continue;
    reg.kill(id);
    shot++;
    onShot?.(l);
  }
  for (const [gid, on] of lights.groups) reg.setGroup(gid, on);
  return shot;
}

/** Client: apply a `course` message to the local world (door locks, anchor locks, lights) and show a new refusal. */
export function applyCourseWire(g: GameState, w: CourseWire): void {
  // the first `course` message this page applies (a join or rejoin) sparks no lamp already dead (coop-real F1a, S2)
  const first = !mirrors.has(g);
  if (w.rn !== shownRn) {
    if (w.rn > shownRn && w.ref) g.hud.banner('', w.ref, 1800);
    shownRn = w.rn;
  }
  // the host's door locks (D48): a locked airlock rear door is shut here too (leaf closed, body back), as on the host;
  // nothing on the client unlocks or opens a course door by itself (open states come only from the host's snapshots)
  const doors = g.world.doors;
  const rear = mirrorOf(g)?.rear;
  for (const d of doors.list) {
    const on = w.locks.includes(d.index);
    if (d.anchor.locked !== on) doors.setLocked(d, on);
    if (on && d.target !== 0 && rear?.has(d.anchor.id)) doors.setOpen(d, false);
  }
  const dis = g.traversal.attachCtl.disabled;
  dis.clear();
  for (const id of w.anchors) dis.add(id);
  // a lamp the host reports newly shot out goes dark with the host's sparks, as Sector Ops' `lampSparks` (coop-real F1a, S2)
  applyCourseLights(g.world.level.lights, w.lights, first ? undefined : (l) => g.vfx.sparks(new Vector3(l.x, l.y, l.z), Vector3.Down(), 10, '#fff1c8'));
  for (const [gid, on] of w.lights.groups) g.stealth?.syncGroup(gid, on);
  mirrorApply(g, w);
  const mm = mirrorOf(g);
  if (mm) mirrorRating(g, mm, w.rt, w.rh);
  if (w.sec) mm?.ct.apply(w.sec);
  // (J14 R1) route-runs' hook as on the host: the retry count, the last retry and the live station; (fix 9) the mirror
  // state's `lastRetry`, which `apply` replaces only when it changed
  const hook = mm ? { restarts: mm.st.restarts, lastRetry: mm.st.lastRetry } : retryHook(w.s);
  (window as unknown as { __course?: unknown }).__course = { wire: w, ...hook, station: () => w.s.st, hud: () => mirrors.get(g)?.hud.el, debug: () => ({ bay: w.s.bay, locks: w.locks, anchors: w.anchors, lights: w.lights, ticks: w.s.ticks, refusal: w.ref, rn: w.rn, air: w.s.air }) };
}

/** Door anchor ids of the airlocks' rear doors (the client mirror's forced-close set). */
function rearDoorAnchors(lay: CourseLayout): Set<number> {
  const out = new Set<number>();
  for (const a of lay.def.airlocks) {
    const id = lay.doors[a.nearDoor];
    if (id !== undefined) out.add(id);
  }
  return out;
}

/** Pad outline thickness (m) and height above the floor. */
const PAD_EDGE = 0.08;
const PAD_LIFT = 0.012;

/**
 * Each airlock's marked floor pad (R6, D46): an emissive outline round its pad (`airlockPad`) at floor level (visual only: gameplay
 * reads the pad in `CourseState`, never these meshes). One shared material; four thin strips per airlock.
 */
function buildAirlockPads(g: GameState, lay: CourseLayout): Mesh[] {
  const out: Mesh[] = [];
  if (!lay.def.airlocks.length) return out;
  const scene = g.scene;
  const mat = new StandardMaterial('airlockPadMat', scene);
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = new Color3(0.22, 0.82, 1);
  mat.disableLighting = true;
  for (const a of lay.def.airlocks) {
    // the pad CourseState tests (the box inset clear of the door planes), not the room box
    const [minX, minZ, maxX, maxZ] = airlockPad(a, [0, 0, 0, 0]);
    const y = a.floorY + PAD_LIFT;
    const w = maxX - minX;
    const d = maxZ - minZ;
    const strips: [number, number, number, number][] = [
      [(minX + maxX) / 2, minZ + PAD_EDGE / 2, w, PAD_EDGE],
      [(minX + maxX) / 2, maxZ - PAD_EDGE / 2, w, PAD_EDGE],
      [minX + PAD_EDGE / 2, (minZ + maxZ) / 2, PAD_EDGE, d],
      [maxX - PAD_EDGE / 2, (minZ + maxZ) / 2, PAD_EDGE, d],
    ];
    for (let i = 0; i < strips.length; i++) {
      const [cx, cz, sx, sz] = strips[i]!;
      const m = CreateBox(`airlockPad-${a.id}-${i}`, { width: sx, height: 0.01, depth: sz }, scene);
      m.position.set(cx, y, cz);
      m.material = mat;
      m.isPickable = false;
      m.freezeWorldMatrix();
      out.push(m);
    }
  }
  return out;
}
