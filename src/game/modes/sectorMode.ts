import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { PlayerRef } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Interactable } from '../interactables';
import type { Blip } from '../../ui/hud/minimap';
import type { DoorState } from '../../world/doors';
import type { SquadSlot } from '../../world/rooms';
import { flags } from '../../core/flags';
import { hyp2 } from '../../core/mathx';
import { CtDevices } from '../ctDevices';
import {
  CONN_LOAD,
  CONN_LOCK_NEAR,
  CONN_UNLOAD,
  CONN_UNLOCK_FAR,
  CONN_UNLOCK_NEAR,
  BOLT_DEPTH,
  BOLT_REACH,
  SECTOR,
  SECTOR_REINFORCE_KIND,
  SECTOR_RESTART_TITLE,
  SectorBolts,
  SectorRun,
  boltHalfSpan,
  boltItemId,
  exitZone,
  inDoorway,
  inZone,
  sectorInfoHtml,
  sectorResult,
  type ConnectorInput,
  type SectorNetExtra,
  type SectorDef,
} from '../sectors';
import { killScore } from './score';
import { SectionStartState } from '../sectorReset';
import { SectorStageRun, addDoorClosure, doorwayClear, reinforceSlot } from '../sectorStage';
import { markCompleted } from '../../save/sectorRecord';

/** Squads never pop in this close to a player (Hunter's rule). */
const SPAWN_MIN_DIST = 7;
/** Everyone down (M7, no lives): the section restarts at its checkpoint after this beat (s). */
const RESTART_DELAY = 2.5;
/** A door is found within this of its doorway centre (m). */
const DOOR_FIND = 1.2;

interface Pending {
  slot: SquadSlot;
  alerted: boolean;
}

/** The doors of one connector, found by position at the start. */
interface ConnDoors {
  near: DoorState | null;
  far: DoorState | null;
  seal: DoorState[];
}

/** (sector-fixes-r RT) A team door's "Unbolt" item and its door (found by position at the start). */
interface BoltIt {
  sec: number;
  k: number;
  it: Interactable;
  door: DoorState | null;
  /** (sector-fixes-r2 nav) Its closure on the host's nav grid (-1: none, a client or no door). */
  nav: number;
}
/** (sector-fixes-r2 nav) A bolted door's nav closure: the door width plus this along (m), and this half depth across. */
const BOLT_NAV_ALONG = 0.5;
const BOLT_NAV_ACROSS = 0.35;

/** Co-op: the devices' state goes to the client at least this often (s), and at once on a change. */
const SEC_SEND = 0.5;

/**
 * Sector Ops (feature/sector-ops A12, M7): the map's sections in order. A section's guards spawn when it loads
 * (unaware, on their routes); its objective (hack, grab or download) unlocks its connector's near door; every living
 * player inside the connector cycles it: the near door locks behind them, the section unloads (guards, bodies, devices),
 * the next loads behind the far door, and the far door opens (the connector is the checkpoint). The last section ends at
 * its extraction with the result line (time, kills, times spotted, Ghost). Being spotted raises the alarm stage (carried
 * over between sections), and each stage sends the section's `perStage` guards in, hunting (A3). No lives (M7):
 * everyone down restarts the section at its checkpoint. The cameras and lasers are the CT devices (host authority, the
 * pistol jammer blinds them), live only in their own section.
 */
export class SectorMode implements GameMode {
  readonly id = 'sector' as const;
  readonly run: SectorRun;
  ct: CtDevices | null = null;
  /** Camera alarms (part of "times spotted"). */
  camAlarms = 0;
  /** Reinforcements sent (tests). */
  reinforced = 0;
  /** Section restarts (tests). */
  restarts = 0;
  /** (G22) Lights and doors the last restart put back (tests). */
  lastReset = { lights: 0, doors: 0 };
  private its: Interactable[] = [];
  private pending: Pending[] = [];
  private fillT = 0;
  private endT = -1;
  private restartT = -1;
  private reinforceK = 0;
  private readonly connIn: ConnectorInput = { allInside: false, doorwayClear: true };
  private readonly doors: ConnDoors[] = [];
  /** (sector-fixes-r RT) The team doors: which bolts are shut, and their items. */
  readonly bolts: SectorBolts;
  private readonly boltIts: BoltIt[] = [];
  /** Run time (s) for the result. */
  private t = 0;
  private secT = 0;
  private prevMaxAlive = -1;
  /** The HUD line's values last shown (rebuilt only when one changes). */
  private infoI = -1;
  private infoA = -1;
  private infoSy = -2;
  /** Players, reused every tick (no allocation). */
  private readonly refs: PlayerRef[] = [];

  /** (sector-redesign G22) The lamps and doors as the current section began (a restart puts them back). */
  readonly startState = new SectionStartState();
  /** (sector-redesign E5, EW9) The sections' alarm-stage extras (lights to full, lockdown doors, dog release stub). */
  stageRun: SectorStageRun<DoorState> | null = null;

  private readonly checkpoint = new Vector3();
  private readonly tmp = new Vector3();

  constructor(private g: GameState) {
    this.run = new SectorRun(g.world.map.sectors ?? []);
    this.bolts = new SectorBolts(this.run.defs);
  }

  start(): void {
    const g = this.g;
    const em = g.enemyMgr!;
    em.stealth = true;
    // M6: the per-mode live cap (a section's guards plus its reinforcements)
    this.prevMaxAlive = em.maxAlive;
    em.maxAlive = SECTOR.maxAlive;
    this.ct = new CtDevices(g, 'host', {
      say: (t) => g.hud.barks.say('lantern', t, true),
      record: () => this.cameraAlarm(),
      dirty: () => undefined,
    });
    g.ctDev = this.ct;
    (window as unknown as { __sector?: SectorMode }).__sector = this;
    this.findDoors();
    this.findBolts();
    this.findStageDoors();
    const s = this.run.current;
    if (s) {
      g.player.controller.teleport(new Vector3(s.start.x, s.start.y, s.start.z), s.start.yaw);
      g.player.cam.yaw = s.start.yaw;
    }
    g.letterbox(2.8);
    this.loadSection(this.run.index);
    this.beginSection();
  }

  /** The connectors' doors, by position; every door into a later section starts locked. */
  private findDoors(): void {
    const ds = this.g.world.doors;
    for (const s of this.run.defs) {
      const c = s.connector;
      const near = c?.nearAt ? ds.nearest(c.nearAt[0], c.nearAt[1], DOOR_FIND) : null;
      const far = c?.farAt ? ds.nearest(c.farAt[0], c.farAt[1], DOOR_FIND) : null;
      const seal: DoorState[] = [];
      for (const at of c?.sealUnlocks ?? []) {
        const d = ds.nearest(at[0], at[1], DOOR_FIND);
        if (d) seal.push(d);
      }
      this.doors.push({ near, far, seal });
      if (near) this.lockDoor(near, true);
      if (far) this.lockDoor(far, true);
      for (const d of seal) this.lockDoor(d, true);
    }
  }

  /**
   * (sector-fixes-r RT) The team doors: each bolted door locked, and its "Unbolt" item at the door centre, offered only
   * on the bolt's side (`Interactable.side`, the course F7 test) and live while the bolt is shut (course F8). The client
   * mirrors the item (its side from its own map data) and the door lock (`lk`); its use comes back as `use`.
   */
  private findBolts(): void {
    const g = this.g;
    const ds = g.world.doors;
    const ints = g.interactables;
    this.run.defs.forEach((s, sec) => {
      s.bolts?.forEach((b, k) => {
        const door = ds.nearest(b.at[0], b.at[1], DOOR_FIND);
        if (door) this.lockDoor(door, true);
        else console.warn(`[sector] ${s.id}: no door at bolt ${k} (${b.at[0]}, ${b.at[1]})`);
        // (sector-fixes-r2 nav) guards route round a bolted door: its doorway is shut on the nav grid (host / solo)
        let nav = -1;
        if (door && g.nav) {
          const a = door.anchor;
          nav = g.nav.addClosure(b.at[0], b.at[1], BOLT_NAV_ACROSS, (a.width + BOLT_NAV_ALONG) / 2, a.yaw, a.hinge.y);
          g.nav.setClosed(nav, true);
        }
        if (!ints) return;
        const y = door ? door.anchor.hinge.y : 0;
        const it = ints.add(boltItemId(sec, k), 'door', new Vector3(b.at[0], y, b.at[1]), 'Unbolt', 0);
        it.reach = BOLT_REACH;
        it.side = b.side;
        // (sector-fixes-r2) the door's span only, not through the wall beside it (inBoltReach, the host's test)
        it.sideHalf = boltHalfSpan(b);
        it.sideDepth = BOLT_DEPTH;
        it.onUse = (_it, by) => this.unbolt(sec, k, by);
        ints.setEnabled(it, true);
        this.boltIts.push({ sec, k, it, door, nav });
      });
    });
  }

  /**
   * A player used a team door's "Unbolt" (`by`: 'local' or none for this machine's player, else a client's peer id).
   * Host-authoritative: the user's feet must be on the bolt's side; then the door unlocks for both and the item goes off.
   */
  private unbolt(sec: number, k: number, by?: string): boolean {
    const refs = this.g.playerRefsInto(this.refs);
    const r = by === undefined || by === 'local' ? refs[0] : refs.find((q) => q.id === by);
    if (!r || !this.bolts.use(sec, k, r.feet.x, r.feet.z)) return false;
    const b = this.boltIts.find((q) => q.sec === sec && q.k === k);
    if (!b) return true;
    if (b.door) this.lockDoor(b.door, false);
    if (b.nav >= 0) this.g.nav?.setClosed(b.nav, false);
    this.g.interactables?.setEnabled(b.it, false);
    // (sector-fixes-r fix) the client's door lock rides the next sector send: send it now, not up to SEC_SEND later
    this.secT = 0;
    if (r === refs[0]) this.g.hud.feedItem('Unbolted - open the door for your partner');
    return true;
  }

  /** (M9) A section restart bolts its team doors again (shut and locked, the "Unbolt" items back). */
  private rebolt(sec: number): void {
    this.bolts.rebolt(sec);
    for (const b of this.boltIts) {
      if (b.sec !== sec) continue;
      if (b.door) this.lockDoor(b.door, true);
      if (b.nav >= 0) this.g.nav?.setClosed(b.nav, true);
      if (!b.it.enabled) this.g.interactables?.setEnabled(b.it, true);
    }
    // (sector-fixes-r fix) the re-bolted locks reach the client on the next step's sector send
    this.secT = 0;
  }

  /**
   * (E5, EW9) The stage actions: each lockdown door found by position with its nav closure (host / solo), the lights
   * through the registry (slice L mirrors them), the locks through `lk` (no wire change).
   */
  private findStageDoors(): void {
    const g = this.g;
    const ds = g.world.doors;
    this.stageRun = new SectorStageRun<DoorState>(
      this.run.defs,
      {
        groupOn: (gr) => g.world.level.lights.setGroup(gr, true),
        lock: (d, on) => this.lockDoor(d, on),
        navClosed: (id, on) => g.nav?.setClosed(id, on),
        // (E5 fix) never shut on a player: a living player within DOOR.clearance of the doorway keeps it pending
        canShut: (d) => doorwayClear(d.cx, d.cz, g.playerRefsInto(this.refs)),
      },
      (_sec, x, z) => {
        const d = ds.nearest(x, z, DOOR_FIND);
        if (!d) return null;
        const a = d.anchor;
        return { door: d, nav: g.nav ? addDoorClosure(g.nav, { cx: d.cx, cz: d.cz, yaw: a.yaw, width: a.width, y: a.hinge.y }) : -1 };
      },
    );
    for (const m of this.stageRun.missing) console.warn(`[sector] ${m}`);
  }

  /** (E5) The alarm went from stage `from` to `to` in the current section (or a section began at `to`): its stage actions. */
  private stageActions(from: number, to: number): void {
    const r = this.stageRun?.raise(this.run.index, from, to);
    if (r?.lights) this.g.stealth?.syncSwitches();
    if (r?.doors) this.secT = 0;
  }

  /** Test hook (e2e): this machine's player uses section `sec`'s bolt `k` (the side test applies). */
  useBolt(sec: number, k: number): boolean {
    return this.unbolt(sec, k, 'local');
  }

  /** Test view: the team doors (item id, door index, plan centre, side, shut, door locked). */
  boltInfo(): { id: string; sec: number; k: number; door: number; at: readonly [number, number]; side: readonly [number, number]; shut: boolean; locked: boolean | null }[] {
    return this.boltIts.map((b) => {
      const def = this.run.defs[b.sec]!.bolts![b.k]!;
      return { id: b.it.id, sec: b.sec, k: b.k, door: b.door?.index ?? -1, at: def.at, side: def.side, shut: this.bolts.isShut(b.sec, b.k), locked: b.door ? b.door.anchor.locked : null };
    });
  }

  /** Lock (shut) or unlock a door, and its door item with it (the course pattern, `courseMode.applyLocks`). */
  private lockDoor(d: DoorState, on: boolean): void {
    const g = this.g;
    g.world.doors.setLocked(d, on);
    if (on) g.world.doors.setOpen(d, false);
    const it = g.interactables?.items.find((x) => x.id === `door-${d.anchor.id}`);
    if (it) g.interactables!.setEnabled(it, !on);
  }

  /** Section `i` loads: its guards (unaware, on their routes; `?sectorGuards=N` caps them) and its devices. */
  private loadSection(i: number): void {
    const s = this.run.defs[i];
    this.ct?.setLive(s ? i : -1);
    // alarm panels: only this section's work, armed again; a panel alarm can be raised again (once per section load)
    this.g.stealth?.setLiveAlarms(s ? i : -1);
    this.g.enemyMgr?.resetAlarm();
    if (!s) return;
    const n = flags.sectorGuards ?? s.guards.length;
    for (let k = 0; k < s.guards.length && k < n; k++) this.pending.push({ slot: s.guards[k]!, alerted: false });
    this.fill();
  }

  /** The current section unloads: a held guard is let go, then every guard and body goes, and its devices go off. */
  private unloadSection(): void {
    const g = this.g;
    if (g.takedown.active) g.takedown.reset();
    // co-op: guards a client holds (grab, hostage) are let go and the client told, before they despawn
    g.net?.releaseHolds?.();
    this.pending.length = 0;
    g.enemyMgr?.despawnAll();
    // (E5) the section's lockdown doors open again (a restart applies its start stage's actions again)
    if (this.stageRun?.release()) this.secT = 0;
    this.ct?.setLive(-1);
    g.stealth?.setLiveAlarms(-1);
  }

  /**
   * The current section begins: the checkpoint, the objective, the banner, and (M9) the loadout recorded as the one a
   * restart gives back (`kit`: not on a restart, which has just put that loadout back).
   */
  private beginSection(kit = true): void {
    const s = this.run.current;
    if (!s) return;
    const cp = this.run.checkpoint;
    this.checkpoint.set(cp.x, cp.y, cp.z);
    this.reinforceK = 0;
    // (E5) a section entered (or restarted) at an alarm stage starts with that stage's actions, before the start state
    this.stageActions(0, this.run.alarm);
    if (kit) {
      this.g.weapons.markCheckpoint();
      // (G22) the lamps (switched, shot, jammed) and doors as the section begins: a restart puts them back
      this.startState.take(this.g.world.level.lights, this.g.world.doors);
    }
    this.g.hud.banner(`SECTION ${this.run.index + 1}  ·  ${s.name.toUpperCase()}`, s.objective.label, 2600);
    this.setup(s);
  }

  /** Put down the current step's interactable: the objective, or the exit marker once it is done. */
  private setup(s: SectorDef): void {
    const g = this.g;
    const ints = g.interactables!;
    for (const it of this.its) ints.remove(it);
    this.its.length = 0;
    const zone = exitZone(s);
    if ((this.run.phase === 'connector' || this.run.phase === 'extract') && zone) {
      const [x0, z0, x1, z1] = zone.box;
      const it = ints.add(`${s.id}-exit`, 'extract', new Vector3((x0 + x1) / 2, zone.floorY ?? 0, (z0 + z1) / 2), zone.label, 0);
      it.onUse = () => undefined;
      ints.setEnabled(it, true);
      this.its.push(it);
      g.hud.setObjective(zone.label);
      return;
    }
    const o = s.objective;
    const site = new Vector3(o.x, o.y, o.z);
    const kind = o.kind === 'grab' ? 'intel' : 'terminal';
    const label = o.kind === 'grab' ? 'Take it' : o.kind === 'hack' ? 'Hack' : 'Start the download';
    const it = ints.add(`${s.id}-obj`, kind, site, label, o.kind === 'hack' ? SECTOR.hackTime : 0, o.yaw);
    it.onUse = (u) => {
      if (o.kind === 'download') {
        u.done = true;
        ints.setEnabled(u, false);
        this.run.downloading = true;
        g.hud.feedItem('Download started - stay close');
        return;
      }
      this.objectiveDone(s);
    };
    ints.setEnabled(it, true);
    this.its.push(it);
    g.hud.setObjective(o.label);
  }

  private objectiveDone(s: SectorDef): void {
    const g = this.g;
    if (this.run.phase === 'objective' && !this.run.objectiveDone()) return;
    g.stats.objectives++;
    g.stats.score += 500;
    g.style.record('objective', g.detected);
    g.events.emit('objective', { id: `${s.id}-obj` });
    g.hud.feedItem(`${s.objective.label} - done`, 'xp');
    this.setup(s);
  }

  /** Every living player in the connector cycles it (the next section), or in the extraction ends the run. */
  private exitStep(dt: number, s: SectorDef, refs: readonly PlayerRef[]): void {
    const zone = exitZone(s);
    if (!zone) return;
    // A20: every player counts, a downed one too (revive them first, or they lie inside): nobody is ever left in an
    // unloaded section
    let players = 0;
    let inside = 0;
    let doorway = false;
    const c = s.connector;
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i]!;
      players++;
      if (inZone(zone, r.feet.x, r.feet.y, r.feet.z)) inside++;
      if (c && inDoorway(c, r.feet.x, r.feet.z)) doorway = true;
    }
    const all = players > 0 && inside === players;
    if (this.run.phase === 'extract') {
      if (this.run.extractStep(dt, all)) this.complete();
      return;
    }
    this.connIn.allInside = all;
    this.connIn.doorwayClear = !doorway;
    const prev = this.run.index;
    const ev = this.run.step(dt, this.connIn);
    if (ev) this.connEvents(ev, prev);
  }

  /** Apply a connector's events (CONN_* bits) for section `prev`'s connector, in order. */
  private connEvents(ev: number, prev: number): void {
    const g = this.g;
    const d = this.doors[prev];
    if (ev & CONN_UNLOCK_NEAR && d?.near) this.lockDoor(d.near, false);
    if (ev & CONN_LOCK_NEAR && d?.near) this.lockDoor(d.near, true);
    if (ev & CONN_UNLOAD) {
      this.unloadSection();
      g.hud.banner('SECTION CLEAR', 'Next section loading', 2000);
    }
    if (ev & CONN_LOAD) this.loadSection(prev + 1);
    if (ev & CONN_UNLOCK_FAR) {
      if (d?.far) {
        this.lockDoor(d.far, false);
        // opened silently: no door noise for the new section's guards (it is not a player-opened door)
        g.world.doors.setOpen(d.far, true);
      }
      if (d) for (const k of d.seal) this.lockDoor(k, false);
      const s = this.run.defs[prev];
      if (s) g.events.emit('objective', { id: `${s.id}-exit` });
      this.beginSection();
    }
  }

  /** Spawn pending guards under the live cap, out of every player's face. */
  private fill(): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const refs = this.g.playerRefsInto(this.refs);
    for (let i = 0; i < this.pending.length; ) {
      const p = this.pending[i]!;
      let d = Infinity;
      for (let k = 0; k < refs.length; k++) {
        const r = refs[k]!;
        d = Math.min(d, hyp2(r.feet.x - p.slot.x, r.feet.z - p.slot.z));
      }
      if (d < SPAWN_MIN_DIST && !p.alerted) {
        i++;
        continue;
      }
      this.tmp.set(p.slot.x, p.slot.y ?? Number.NaN, p.slot.z);
      const e = em.spawn(p.slot.kind, this.tmp, p.alerted, p.slot.yaw);
      if (!e) break;
      if (p.slot.route) e.setPatrol({ points: p.slot.route, wait: p.slot.wait, waits: p.slot.waits, faces: p.slot.faces, start: p.slot.start, loop: p.slot.loop });
      this.pending.splice(i, 1);
    }
  }

  /** A guard's alarm: up one stage, and guards come in hunting (A3). The mode brings its own reinforcements. */
  onAlarm(): boolean {
    const up = this.run.alarm;
    const send = this.run.raiseAlarm();
    this.raised(up, send, true);
    return true;
  }

  /** A camera has someone at full awareness, or a laser was broken (sector-fixes C): `CtDevices` already raised its own stage and showed the banner. */
  private cameraAlarm(): void {
    this.camAlarms++;
    const ct = this.ct;
    const up = this.run.alarm;
    const send = ct && ct.alarm > up ? this.run.raiseAlarm() : 0;
    this.raised(up, send, false);
  }

  /** The stage went from `from` to `run.alarm`: the banner, the devices' stage, `send` guards in from the section's points. */
  private raised(from: number, send: number, banner: boolean): void {
    const g = this.g;
    const stage = this.run.alarm;
    if (this.ct) this.ct.alarm = stage;
    if (stage > from && banner) g.hud.banner(`ALARM STAGE ${stage}`, send ? 'Reinforcements coming' : '', 2200);
    const s = this.run.current;
    if (s && stage > from) this.stageActions(from, stage);
    if (!s || !send) return;
    let n = 0;
    for (let i = 0; i < send; i++) {
      // (sector-redesign G3) armed guards, never heavies (G155); the count is the section's `perStage`; (E5) at the
      // stage's response route (its patrol) when it has one
      const slot = reinforceSlot(s, stage, i, this.reinforceK++, SECTOR_REINFORCE_KIND);
      if (!slot) break;
      this.pending.push({ slot, alerted: true });
      n++;
    }
    if (!n) return;
    this.reinforced += n;
    this.fill();
  }

  /** The extraction: the stinger, then the result line. */
  private complete(): void {
    if (this.endT >= 0) return;
    const g = this.g;
    for (const it of this.its) g.interactables?.remove(it);
    this.its.length = 0;
    g.hud.setObjective('');
    g.events.emit('operationComplete', {});
    // M7: the op's star for this difficulty (and the best time), solo or the co-op host
    void markCompleted(g.world.map.id, g.opts.difficulty ?? 'normal', this.t);
    g.hud.banner('SECTORS CLEAR', this.result().ghost ? 'GHOST' : '', 2600);
    g.slowBeat(0.4, 0.5);
    g.letterbox(2.6);
    this.endT = 2.6;
  }

  /** Lethal kills (knock-outs are not kills, A4) and times spotted (guard detections plus camera alarms). */
  result(): ReturnType<typeof sectorResult> {
    const g = this.g;
    return sectorResult({ time: this.t, kills: Math.max(0, g.stats.kills - g.stats.knockouts), spotted: g.style.detections + this.camAlarms });
  }

  /**
   * Everyone down (M7, no lives): the current section starts again from its checkpoint. Its objective, connector and
   * alarm stage go back to the section's start (`SectorRun.restartSection`), every guard goes and the section's set
   * comes back on its routes, its devices come back on, and every player respawns at the checkpoint. The tallies stay.
   */
  restartSection(): void {
    const g = this.g;
    const prev = this.run.index;
    const ev = this.run.restartSection();
    const d = this.doors[prev];
    if (ev & CONN_LOCK_NEAR && d?.near) this.lockDoor(d.near, true);
    if (ev & CONN_UNLOCK_FAR) {
      // a cycle was running: it finished first, so this restart is of the next section (its far door opens)
      if (d?.far) this.lockDoor(d.far, false);
      if (d) for (const k of d.seal) this.lockDoor(k, false);
    }
    this.restarts++;
    // (sector-fixes-r RT) the section's team doors are bolted again (a clean retry)
    this.rebolt(this.run.index);
    this.unloadSection();
    // (M9) a clean start: the guards' shared memory back at its match-start state (alarm, last known position, sighting
    // flags, clocks), and the players' side: the section's loadout reloaded, gadgets and grenades out in the world gone,
    // the stealth leftovers cleared, the music calmed (`GameState.checkpointReset`)
    g.enemyMgr?.resetMemory();
    g.checkpointReset();
    this.loadSection(this.run.index);
    // a camera shot out in the section comes back: the restart is a clean retry (step 3)
    this.ct?.repair(this.run.index);
    // (sector-redesign G22) the lamps and doors as the section began (after the connector and team door locks above)
    // A restart during a cycle is of the next section, which never began: its start is now (nothing to put back).
    if (ev & CONN_UNLOCK_FAR) {
      this.startState.take(g.world.level.lights, g.world.doors);
      this.lastReset = { lights: 0, doors: 0 };
    } else this.lastReset = this.startState.apply(g.world.level.lights, g.world.doors);
    g.stealth?.syncSwitches();
    if (this.ct) this.ct.alarm = this.run.alarm;
    this.beginSection(false);
    const cp = this.run.checkpoint;
    g.player.cam.yaw = cp.yaw;
    g.scheduleRespawn(this.checkpoint, 0.3);
    // (co-op: this banner reaches the client, which runs its own `checkpointReset` on it)
    g.hud.banner(SECTOR_RESTART_TITLE, this.run.current?.name ?? '', 2200);
  }

  /** (marlow-bays item 3) The pause menu's restart: the section from its checkpoint, as everyone down (not once the op
   *  is ending, nor while a restart is already counting down). */
  restartCheckpoint(): boolean {
    if (this.endT >= 0 || this.restartT >= 0) return false;
    this.restartSection();
    return true;
  }

  fixedUpdate(dt: number): void {
    const g = this.g;
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.endT = 0;
        if (this.result().ghost) g.stats.score += 2000;
        g.endSession(true, this.result().line);
      }
      return;
    }
    if (this.endT === 0) return;
    this.t += dt;
    const ct = this.ct;
    if (ct) {
      ct.fixedUpdate(dt);
      // co-op: the client mirrors the cameras and lasers (objectives, markers and banners go as items and events)
      this.secT -= dt;
      if (ct.takeChanged() || this.secT <= 0) {
        this.secT = SEC_SEND;
        const net = g.net;
        if (net?.sector) net.sector(ct.wire(), this.netExtra(ct));
      }
    }
    if (this.restartT >= 0) {
      this.restartT -= dt;
      if (this.restartT < 0) this.restartSection();
      return;
    }
    this.fillT -= dt;
    if (this.fillT <= 0) {
      this.fillT = 0.5;
      this.fill();
    }
    // (E5 fix) a lockdown door waiting on a player in its doorway shuts once they step clear (no allocation; idle at 0)
    if (this.stageRun?.step()) this.secT = 0;
    const s = this.run.current;
    if (!s) return;
    if (this.run.phase === 'objective' && this.run.downloading) {
      const o = s.objective;
      const refs = g.playerRefsInto(this.refs);
      let near = false;
      for (let i = 0; i < refs.length; i++) {
        const r = refs[i]!;
        if (r.target.alive && hyp2(r.feet.x - o.x, r.feet.z - o.z) < SECTOR.downloadRange && Math.abs(r.feet.y - o.y) < 2) near = true;
      }
      if (near && this.run.download(dt)) this.objectiveDone(s);
      else if (near) g.hud.setObjective(`${o.label} ${Math.floor((this.run.progress / SECTOR.downloadTime) * 100)}%`);
    } else if (this.run.phase === 'connector' || this.run.phase === 'extract') this.exitStep(dt, s, g.playerRefsInto(this.refs));
  }

  frameUpdate(): void {
    const n = this.run.defs.length;
    const i = Math.min(n, this.run.index + 1);
    const a = this.run.alarm;
    // co-op: the revive syringes left (M7); solo shows none (a down restarts the section)
    const sy = this.g.net?.revivesLeft?.() ?? -1;
    if (i === this.infoI && a === this.infoA && sy === this.infoSy) return;
    this.infoI = i;
    this.infoA = a;
    this.infoSy = sy;
    this.g.hud.setModeInfo(sectorInfoHtml(i, n, a, sy < 0 ? null : sy));
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2);
  }

  onPlayerDeath(): void {
    // no lives (M7): everyone down restarts the section at its checkpoint after a beat (co-op revives first, step 3)
    if (this.g.anyPlayerAlive() || this.endT >= 0 || this.restartT >= 0) return;
    this.g.hud.banner('DOWN', 'Restarting from checkpoint', 2200);
    this.restartT = RESTART_DELAY;
  }

  /** Co-op host: an operator went down with no syringe left (or the revive window ran out): the section restarts. */
  onPlayerOut(): void {
    if (this.endT >= 0 || this.restartT >= 0) return;
    this.g.hud.banner('OPERATOR OUT', 'Restarting from checkpoint', 2200);
    this.restartT = RESTART_DELAY;
  }

  /**
   * Co-op: the live section, the locked doors, the cameras shot out and the syringes left. New arrays each send (every
   * 0.5 s or on a change, not per tick): a delayed transport may hold the message.
   */
  private netExtra(ct: CtDevices): SectorNetExtra {
    const lk: number[] = [];
    for (const d of this.g.world.doors.list) if (d.anchor.locked) lk.push(d.index);
    return { ls: ct.liveSection, lk, dn: ct.destroyedIds([]), sy: this.g.net?.revivesLeft?.() ?? 0 };
  }

  /** Co-op host: the client's held jammer target. */
  onRemoteJam(_id: string, tgt: string, eye?: readonly [number, number, number]): void {
    this.ct?.onRemoteJam(tgt, eye);
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const it of this.its) if (it.enabled && !it.done) out.push({ x: it.pos.x, z: it.pos.z, kind: 'objective' });
    return out;
  }

  /** Test view (`window.__sector.debug()`). */
  debug(): Record<string, unknown> {
    const s = this.run.current;
    const d = this.doors[this.run.index];
    const locked = (k: DoorState | null | undefined): boolean | null => (k ? k.anchor.locked : null);
    return {
      index: this.run.index,
      phase: this.run.phase,
      id: s?.id ?? null,
      conn: this.run.conn.state,
      stage: this.run.alarm,
      reinforced: this.reinforced,
      camAlarms: this.camAlarms,
      pending: this.pending.length,
      restarts: this.restarts,
      lastReset: { ...this.lastReset },
      restarting: this.restartT >= 0,
      checkpoint: { ...this.run.checkpoint },
      nearLocked: locked(d?.near),
      farLocked: locked(d?.far),
      doors: this.doors.map((k) => ({ near: locked(k.near), far: locked(k.far), seal: k.seal.map((x) => x.anchor.locked) })),
      live: this.ct?.liveSection ?? null,
      bolts: this.bolts.shut.map((row) => row.slice()),
      lockdown: this.stageRun?.lockedCount() ?? 0,
      ...this.result(),
    };
  }

  dispose(): void {
    this.ct?.dispose();
    this.ct = null;
    this.g.ctDev = null;
    this.pending.length = 0;
    const em = this.g.enemyMgr;
    if (em && this.prevMaxAlive >= 0) em.maxAlive = this.prevMaxAlive;
    const w = window as unknown as { __sector?: SectorMode };
    if (w.__sector === this) delete w.__sector;
  }
}
