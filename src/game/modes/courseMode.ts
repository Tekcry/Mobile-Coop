import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Blip } from '../../ui/hud/minimap';
import type { Interactable } from '../interactables';
import type { DoorState } from '../../world/doors';
import { CourseState, type CourseEvent } from '../course/courseState';
import { layoutKnownIds, validateCourse, type CourseDef, type CourseLayout, type DrillDef, type GateDef, type PlayerIdx } from '../course/courseDef';
import type { CourseWire } from '../course/courseWire';
import { COURSE_CALLSIGNS, COURSE_SEND, RESTART_DELAY } from '../../config/course';
import { hyp2 } from '../../core/mathx';
import { CourseFeed } from '../course/courseFeed';
import { DrillDetect, emptySnap, VERBS } from '../course/drillDetect';
import { summarise } from '../course/courseRating';
import { CourseHud } from '../../ui/hud/courseHud';
import { recordBay, recordRun, updateCourseRecord } from '../../save/courseRecord';

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

/** The next drill's marker point (a device's position or the drill's own point), or null. */
function markerPoint(lay: CourseLayout, d: DrillDef): { x: number; y: number; z: number } | null {
  if (typeof d.marker !== 'string') return d.marker;
  const dv = lay.devices[d.marker];
  return dv ? { x: dv.x, y: dv.y + 1.2, z: dv.z } : null;
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

interface HoldRt {
  it: Interactable;
  id: string;
  /** Holder per player (bit set: that player braces the hold). */
  holders: number;
}

/**
 * Training course mode (training bunker framework): runs `CourseState` on the host (single player too), puts down the
 * gate devices (switches, hold points, bolts, airlock Cycle panels), keeps door and anchor locks in step, spawns a bay's
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
  private cycles: { it: Interactable; id: string }[] = [];
  private doorOf = new Map<string, DoorState>();
  private squad: Enemy[] = [];
  private radioQ: string[] = [];
  private radioT = 0;
  private sendT = 0;
  private dirty = true;
  private restartT = -1;
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
  private remoteMode = '';
  private offs: (() => void)[] = [];
  private refusal = '';
  /** P2's last refusal and its counter (the `course` message's `ref` / `rn`: the client shows its own refusals). */
  private ref2 = '';
  private refN = 0;

  constructor(private g: GameState) {}

  start(): void {
    const g = this.g;
    const lay = g.world.layout.course;
    if (!lay) {
      g.hud.banner('No course', 'This map has no training course', 4000);
      return;
    }
    this.layout = lay;
    const st = new CourseState(validateCourse(lay.def, layoutKnownIds(lay)));
    st.solo = courseSoloFlag();
    this.state = st;
    const doors = g.world.doors;
    for (const [cid, aid] of Object.entries(lay.doors)) {
      const d = doors.list.find((x) => x.anchor.id === aid);
      if (d) this.doorOf.set(cid, d);
    }
    for (const a of lay.def.airlocks) {
      const it = this.device(a.id, 'Cycle');
      if (it) this.cycles.push({ it, id: a.id });
    }
    for (const b of lay.def.bays) for (const gate of b.gates) this.addGate(gate);
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
    this.hud = new CourseHud(g.hud.el);
    (window as unknown as { __course?: unknown }).__course = this;
    this.handle();
    this.applyLocks();
  }

  /** Dev toggle (debug overlay): the solo flag (A6). */
  setSolo(on: boolean): void {
    if (this.state) this.state.solo = on;
  }

  /** A device item for course id `cid` (shared between gates naming the same switch). */
  private device(cid: string, label: string, hold = false): Interactable | null {
    const have = this.devices.get(cid);
    if (have) return have;
    const dv = this.layout!.devices[cid];
    if (!dv) return null;
    const ints = this.g.interactables!;
    const it = ints.add(`c-${cid}`, 'switch', new Vector3(dv.x, dv.y, dv.z), dv.label ?? label, 0, dv.yaw);
    it.reach = 1.4;
    ints.setEnabled(it, true);
    it.onUse = (_it, by) => {
      const p = this.idx(by);
      if (hold) this.holdOn(cid, p);
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
        break;
      }
      default:
        break;
    }
  }

  /** Player index of whoever used an item: the host (undefined) is P1, the client P2. */
  private idx(by: string | undefined): PlayerIdx {
    return by === undefined ? 0 : 1;
  }

  private press(cid: string, p: PlayerIdx): void {
    const why = this.state?.press(cid, p) ?? null;
    this.dirty = true;
    if (why && p === 0) this.g.hud.banner('', why, 1800);
    if (why) this.refusal = why;
    if (why && p === 1) {
      this.ref2 = why;
      this.refN++;
    }
    // a device worked (not refused) is the `switch` verb
    if (!why && this.state) this.verb(p, VERBS.switch);
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

  onRemoteMove(_id: string, mode: string): void {
    if (mode === this.remoteMode) return;
    this.remoteMode = mode;
    // the remote's host-visible verbs through the same detector (C10); a first message only primes
    this.remoteSnap.mode = mode;
    const out = this.remoteOut;
    this.remoteDet.step(this.remoteSnap, out);
    for (let i = 0; i < out.length; i++) this.verb(1, out[i]!);
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
    // the host's own verbs (drillDetect, the single place verbs are derived; A18)
    if (this.feed) {
      const out = this.feed.step();
      for (let i = 0; i < out.length; i++) this.verb(0, out[i]!);
    }
    // detections (the stealth style tally) count in the current bay
    const det = g.style.detections;
    if (det > this.detSeen) st.record('detections', det - this.detSeen);
    this.detSeen = det;
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
    st.update(dt);
    if (this.restartT >= 0) {
      this.restartT -= dt;
      if (this.restartT < 0) st.restart();
    }
    this.handle();
    // airlock prompts (cached strings: no allocation per step)
    const ints = g.interactables!;
    for (let i = 0; i < this.cycles.length; i++) {
      const c = this.cycles[i]!;
      const prompt = st.airlockPrompt(c.id);
      if (prompt !== null && c.it.label !== prompt) c.it.label = prompt;
      if ((prompt !== null) !== c.it.enabled) ints.setEnabled(c.it, prompt !== null);
    }
    // radio, held while any guard is alerted
    this.radioT -= dt;
    if (this.radioT <= 0 && this.radioQ.length && !(g.enemyMgr?.anyAlerted ?? false)) {
      g.hud.barks.say('lantern', `LANTERN: ${this.radioQ.shift()!}`, true);
      this.radioT = RADIO_GAP;
    }
    this.sendT -= dt;
    if (this.dirty || this.sendT <= 0) {
      this.applyLocks();
      g.net?.course?.(this.wire());
      this.dirty = false;
      this.sendT = COURSE_SEND;
    }
  }

  private groupOn(group: number): boolean {
    const ls = this.g.world.level.lights.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && l.on) return true;
    }
    return false;
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
  }

  private onEvent(e: CourseEvent): void {
    const st = this.state!;
    const bay = st.currentBay;
    switch (e.t) {
      case 'bayStarted':
        this.spawnSquad(e.squad);
        this.radio('enter');
        break;
      case 'bayRestart':
        this.restartT = -1;
        this.spawnSquad(e.squad);
        this.resetLights();
        for (const h of this.holds) h.holders = 0;
        this.g.hud.banner('RESTART', bay.id, 2000);
        this.g.scheduleRespawn(this.checkpointPos(), 0.5);
        break;
      case 'gateOpened':
        this.radio(e.gate);
        this.radio('gate');
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
        break;
      }
      case 'courseDone':
        this.finishCourse();
        break;
      default:
        break;
    }
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
    this.g.endSession(true, 'Course complete');
  }

  private radio(at: string): void {
    const lines = this.state!.currentBay.radio;
    for (let i = 0; i < lines.length; i++) if (lines[i]!.at === at) this.radioQ.push(lines[i]!.text);
  }

  /** Where the players respawn: the checkpoint airlock's middle, or the map's first spawn. */
  checkpointPos(): Vector3 {
    const st = this.state!;
    const a = st.def.airlocks.find((x) => x.id === st.checkpoint);
    if (!a) return this.g.world.layout.playerSpawns[0]!.pos.clone();
    return new Vector3((a.box[0] + a.box[2]) / 2, a.floorY + 0.05, (a.box[1] + a.box[3]) / 2);
  }

  private spawnSquad(ids: string[]): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    for (const e of this.squad) {
      const k = em.enemies.indexOf(e);
      if (k >= 0) em.enemies.splice(k, 1);
      e.dispose();
    }
    this.squad.length = 0;
    for (const id of ids) {
      const s = this.layout!.squads[id];
      if (!s) continue;
      const e = em.spawn(s.kind, new Vector3(s.x, s.y ?? Number.NaN, s.z), false, s.yaw);
      if (!e) break;
      if (s.route) e.setPatrol({ points: s.route, wait: s.wait, waits: s.waits, faces: s.faces, start: s.start, loop: s.loop });
      this.squad.push(e);
    }
  }

  /** Restart: the course's light groups back on and its shot-out lamps restored. */
  private resetLights(): void {
    const reg = this.g.world.level.lights;
    const groups = this.layout!.groups;
    if (!groups) return;
    const want = new Set(Object.values(groups));
    for (const l of reg.lights) if (want.has(l.group) && l.destroyed) reg.restore(l.id);
    for (const gid of want) {
      reg.setGroup(gid, true);
      this.g.stealth?.syncGroup(gid, true);
    }
  }

  /** Door and anchor locks onto the world (and the door items' enabled flags, T0 Q3). */
  private applyLocks(): void {
    const st = this.state;
    if (!st) return;
    const g = this.g;
    for (const [cid, d] of this.doorOf) {
      const on = st.locked(cid);
      if (d.anchor.locked === on) continue;
      g.world.doors.setLocked(d, on);
      const it = g.interactables?.items.find((x) => x.id === `door-${d.anchor.id}`);
      if (it) g.interactables!.setEnabled(it, !on);
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
    const dead: number[] = [];
    for (const l of g.world.level.lights.lights) if (l.destroyed) dead.push(l.id);
    return { s: this.state!.pack(), locks, anchors: [...g.traversal.attachCtl.disabled], lights: { groups, dead }, ref: this.ref2, rn: this.refN };
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
  }

  onPlayerDeath(): void {
    // everyone is down: the bay restarts (CourseState does it after RESTART_DELAY when it sees both down; this covers
    // a lone host and a leaver)
    if (this.state && this.restartT < 0) this.restartT = RESTART_DELAY + 0.1;
    this.g.hud.banner('DOWN', 'Restarting the bay', 2000);
  }

  frameUpdate(): void {
    const st = this.state;
    if (!st || !this.hud) return;
    this.hud.update(st, 0);
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
    this.g.hud.pings.hideMarker();
    const w = window as unknown as { __course?: unknown };
    if (w.__course === this) delete w.__course;
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
}
const mirrors = new WeakMap<GameState, ClientCourse>();

function mirrorOf(g: GameState): ClientCourse | null {
  let m = mirrors.get(g);
  if (m) return m;
  const lay = g.world.layout.course;
  if (!lay) return null;
  const st = new CourseState(lay.def);
  m = { st, lay, hud: new CourseHud(g.hud.el), open: [], startBay: -1 };
  mirrors.set(g, m);
  return m;
}

/** Client, per frame: the tutorial HUD and the next drill's marker for P2. */
export function clientCourseFrame(g: GameState): void {
  const m = mirrors.get(g);
  if (!m) return;
  m.hud.update(m.st, 1);
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
  g.hud.pings.hideMarker();
  mirrors.delete(g);
}

/** Client: mirror the packed state; a drill newly done shows the toast (both players' drills). */
function mirrorApply(g: GameState, w: CourseWire): void {
  const m = mirrorOf(g);
  if (!m) return;
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

/** Client: apply a `course` message to the local world (door locks, anchor locks, lights) and show a new refusal. */
export function applyCourseWire(g: GameState, w: CourseWire): void {
  if (w.rn !== shownRn) {
    if (w.rn > shownRn && w.ref) g.hud.banner('', w.ref, 1800);
    shownRn = w.rn;
  }
  const doors = g.world.doors;
  for (const d of doors.list) {
    const on = w.locks.includes(d.index);
    if (d.anchor.locked !== on) doors.setLocked(d, on);
  }
  const dis = g.traversal.attachCtl.disabled;
  dis.clear();
  for (const id of w.anchors) dis.add(id);
  const reg = g.world.level.lights;
  for (const l of reg.lights) if (l.destroyed && !w.lights.dead.includes(l.id)) reg.restore(l.id);
  for (const id of w.lights.dead) reg.kill(id);
  for (const [gid, on] of w.lights.groups) {
    reg.setGroup(gid, on);
    g.stealth?.syncGroup(gid, on);
  }
  mirrorApply(g, w);
  (window as unknown as { __course?: unknown }).__course = { wire: w, hud: () => mirrors.get(g)?.hud.el, debug: () => ({ bay: w.s.bay, locks: w.locks, anchors: w.anchors, lights: w.lights, ticks: w.s.ticks, refusal: w.ref, rn: w.rn, air: w.s.air }) };
}
