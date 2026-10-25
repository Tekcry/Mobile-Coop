import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { PlayerRef } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Interactable } from '../interactables';
import { ITEM_SCOPE_OFF } from '../itemScope';
import type { Blip } from '../../ui/hud/minimap';
import type { DoorState } from '../../world/doors';
import type { SquadSlot } from '../../world/rooms';
import { flags } from '../../core/flags';
import { reportGuardAi, validatePosts } from '../../ai/guardAiData';
import { hyp2 } from '../../core/mathx';
import { CtDevices } from '../ctDevices';
import { SectorGuardFreeze, seeThroughRay } from '../sectorGuardFreezeView';
import { inSheet } from '../../world/roofSheets';
import { G } from '../../physics/groups';
import { responseTeam } from '../../ai/gear';
import type { SweepTeam } from '../../ai/sweepTeam';
import type { EnemyKind } from '../../ai/enemyDefs';
import {
  CONN_LOAD,
  CONN_LOCK_NEAR,
  CONN_UNLOAD,
  CONN_UNLOCK_FAR,
  CONN_UNLOCK_NEAR,
  BOARD_READ,
  KEYPAD_HOLD,
  KEYPAD_REACH,
  SECTOR,
  SECTOR_REINFORCE_KIND,
  SECTOR_RESTART_TITLE,
  type SectorBolts,
  type SectorPairGates,
  SectorRun,
  exitZone,
  intelItemId,
  keypadItemId,
  inDoorway,
  inZone,
  sectorInfoHtml,
  sectorResult,
  syringesFor,
  type ConnectorInput,
  type SectorRatingWire,
  type SectorNetExtra,
  type SectorDef,
} from '../sectors';
import { killScore } from './score';
import { SectionStartState } from '../sectorReset';
import { SectorTeamDoors } from '../sectorTeamDoors';
import { SectorCodes, inOverhear } from '../sectorKeypads';
import { SectorStageRun, addDoorClosure, doorwayClear, reinforceSlot } from '../sectorStage';
import { markCompleted } from '../../save/sectorRecord';
import { updateRatingRecord } from '../../save/ratingRecord';
import { GADGETS } from '../gadgets';
import { stationHeal } from '../medkit';
import {
  DEFAULT_RULES,
  GRANT_GADGETS,
  SyncedDetector,
  coopRating,
  emptyGrant,
  newSectionStats,
  putRating,
  rateSection,
  resetSectionStats,
  rewardsFor,
  type Grant,
  type SectionStats,
} from '../rating/sectionRating';
import { packRated } from '../course/courseWire';
import { RatingCard } from '../../ui/hud/ratingCard';

/** (section-rating S2) The last rated section, as the rating card reads it (S4's `RatingView` shape). */
export interface SectionRatingView {
  sectionId: string;
  title: string;
  marks: number;
  synced: number;
  /** What the rating granted the next section (A9: Bodies hidden's alarm step is already a gadget charge here). */
  grant: Grant;
}

/** (section-rating S2) The dev / test hook `window.__sectionRating`. */
export interface SectionRatingHook {
  /** The current section's live counters (host). */
  stats: SectionStats;
  last: SectionRatingView | null;
  /** What the last section load actually gave (after the carry caps), or null before any. */
  lastGrant: Grant | null;
}

/**
 * (section-rating S2) Called on every rating (host / solo), after the best-rating record write. The rating card (S4) or
 * other listeners hook in here; null by default.
 */
export let onRated: ((mapId: string, sectionId: string, marks: number, synced: number) => void) | null = null;
/** Set the `onRated` listener (null clears it). */
export function setOnRated(fn: typeof onRated): void {
  onRated = fn;
}
import { crateItemId } from '../crateLedger';
import type { SlotPoint } from '../spawnSlots';
import {
  DESK_HOLD,
  DESK_ITEM_Y,
  DESK_LOOP_END_LINE,
  DESK_LOCKED_LINE,
  DESK_LOOP_LINE,
  DESK_MANNED_LINE,
  DESK_OFF,
  DESK_OFF_LINE,
  DESK_REACH,
  DESK_REFUSE_BAD,
  DESK_REFUSE_MANNED,
  DESK_USED_LOOP,
  SectorDesks,
  deskItemId,
  deskLabel,
  operatorAtPost,
  type SecurityDesk,
} from '../sectorDesks';

/** Squads never pop in this close to a player (Hunter's rule). */
const SPAWN_MIN_DIST = 7;
/** Everyone down (M7, no lives): the section restarts at its checkpoint after this beat (s). */
const RESTART_DELAY = 2.5;
/** A door is found within this of its doorway centre (m). */
const DOOR_FIND = 1.2;

interface Pending {
  /** Index in the section's `guards`; -1 for a reinforcement. */
  k: number;
  slot: SquadSlot;
  alerted: boolean;
  /** (guard-ai S6) An alarm reinforcement (aggressive, told by command), and the entry route it runs in. */
  reinforce?: boolean;
  route?: readonly (readonly [number, number])[] | null;
  /** (guard-ai S13) The response team it joins at spawn. */
  team?: SweepTeam<Enemy> | null;
  /** (guard-models G6n) His look seed from the slot (`EnemyManager.lookOfSlot`); none: `spawn` / `joinTeam` give it. */
  look?: number;
}

/** The doors of one connector, found by position at the start. */
interface ConnDoors {
  near: DoorState | null;
  far: DoorState | null;
  seal: DoorState[];
}

/** (sector-redesign EW5) A keypad door's item and its door (found by position at the start). */
interface KeyIt {
  sec: number;
  k: number;
  it: Interactable;
  door: DoorState | null;
  /** Its closure on the host's nav grid while locked (-1: none). */
  nav: number;
}
/** (EW5) The keypad's prompt with the code and without it. */
const KEYPAD_LABEL = 'Enter code';
const KEYPAD_LABEL_NONE = 'Keypad - code needed';
/** (EW5) A board intel's prompt. */
const BOARD_LABEL = 'Read';

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
  /** The live guard of each `guards` index of the loaded section (null: not spawned yet); the overhear talkers. */
  private readonly slotEnemy: (Enemy | null)[] = [];
  private fillT = 0;
  private endT = -1;
  private restartT = -1;
  private reinforceK = 0;
  private readonly connIn: ConnectorInput = { allInside: false, doorwayClear: true };
  private readonly doors: ConnDoors[] = [];
  /** (E6 fix) The loaded section (its desks are the live ones); -1 while none is. Set before `run.index` moves on. */
  private deskSec = -1;
  /** (sector-fixes-r RT; sector-redesign E3) The team doors: bolts, pair bolts and pair gates, their items and nav. */
  readonly team: SectorTeamDoors;
  /** (sector-redesign EW5, A4) The keypad codes the team holds (host / solo), the keypad items and the board items. */
  readonly codes: SectorCodes;
  private readonly keyIts: KeyIt[] = [];
  private readonly boardIts: { sec: number; k: number; it: Interactable }[] = [];
  private readonly granted: number[] = [];
  /** (sector-redesign E6, EW10) The map's security desks (host / solo) and their console items (by desk index). */
  readonly desks: SectorDesks;
  private readonly deskIts: (Interactable | null)[] = [];
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

  /** (section-rating S2) The current section's counters (host / solo): reset in place after a rating and on a restart. */
  readonly secStats: SectionStats = newSectionStats();
  /** (section-rating S2) Knock-outs by two different players within SYNC_WINDOW (A6). */
  private readonly syncDet = new SyncedDetector();
  /** The detections tally (`g.style.detections`) last read: the section counts each rise. */
  private detSeen = 0;
  /** The grant the last rating earned, given as the next section begins (null: nothing owed). */
  private owed: Grant | null = null;
  /** The last rating on the wire (`rt`, copied per send). */
  private readonly rt: SectorRatingWire = { sec: -1, marks: 0, synced: 0, gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 };
  /** (marlow-polish) Each rated section's synced takedowns, by index (with `run.marks`, the wire's `rh`); built with `run`, so the two reset together. */
  private readonly ratedSynced: number[];
  private readonly hook: SectionRatingHook = { stats: this.secStats, last: null, lastGrant: null };
  private readonly offs: (() => void)[] = [];
  /** (section-rating integration) The rating card on this machine's HUD (host / solo; the client has its own). */
  private card: RatingCard | null = null;
  /** The rating being reported gives a grant (a connector's); false for the extraction's, which goes to the results. */
  private rateGrant = false;
  /** The `onRated` listener: the card for a granted rating (one closure for the mode's life). */
  private readonly rated = (): void => {
    const v = this.hook.last;
    if (!this.rateGrant || !v || !this.card) return;
    // (section-rating fix) the card names only what lands: gadget charges up to the room left now, a medkit only when
    // it heals us, syringes only with a net layer that takes them (the view itself keeps what was earned)
    const c = this.cardView;
    c.sectionId = v.sectionId;
    c.title = v.title;
    c.marks = v.marks;
    c.synced = v.synced;
    const cg = c.grant;
    const vg = v.grant;
    cg.gadget = Math.min(vg.gadget, this.gadgetRoom());
    cg.syringe = this.g.net?.addSyringes ? vg.syringe : 0;
    cg.medkit = this.ownHeals() ? vg.medkit : 0;
    cg.alarmStep = vg.alarmStep;
    this.card.show(c, this.grantGadgetName(cg.gadget));
  };
  /** (section-rating fix) The card's copy of the rating, its grant trimmed to what lands (reused, no allocation). */
  private readonly cardView: SectionRatingView = { sectionId: '', title: '', marks: 0, synced: 0, grant: emptyGrant() };

  /** (sector-redesign G22) The lamps and doors as the current section began (a restart puts them back). */
  readonly startState = new SectionStartState();
  /** (sector-redesign E5, EW9) The sections' alarm-stage extras (lights to full, lockdown doors, dog release stub). */
  stageRun: SectorStageRun<DoorState> | null = null;

  private readonly checkpoint = new Vector3();
  private readonly tmp = new Vector3();
  /** (sector-redesign perf) Guards whose body and shadows cannot reach the screen skip the render (`?guardfreeze=0`: off). */
  private freeze: SectorGuardFreeze | null = null;

  constructor(private g: GameState) {
    this.run = new SectorRun(g.world.map.sectors ?? []);
    this.ratedSynced = this.run.marks.map(() => 0);
    this.codes = new SectorCodes(this.run.defs);
    this.desks = new SectorDesks(g.world.layout?.security?.desks ?? []);
    // getters: the interactables and the nav grid are read when the mode starts (`team.build`), not now
    this.team = new SectorTeamDoors(this.run.defs, {
      get doors() {
        return g.world.doors;
      },
      get ints() {
        return g.interactables ?? null;
      },
      get nav() {
        return g.nav ?? null;
      },
      lockDoor: (d, on) => this.lockDoor(d, on),
      refs: () => g.playerRefsInto(this.refs),
      feed: (t) => g.hud.feedItem(t),
      changed: () => {
        this.secT = 0;
      },
    });
  }

  /** (sector-fixes-r RT) The bolts' state (tests, e2e). */
  get bolts(): SectorBolts {
    return this.team.bolts;
  }

  /** (sector-redesign E3) The pair gates' state (tests, e2e). */
  get pairGates(): SectorPairGates {
    return this.team.gates;
  }

  start(): void {
    const g = this.g;
    const em = g.enemyMgr!;
    em.stealth = true;
    // (guard-rules S1, A1, G350) helmets by difficulty: Realistic / Perfectionist every guard helmeted, Perfectionist's
    // never shot off; Rookie / Normal from the alarm stage only
    em.useDifficultyHelmets();
    // M6: the per-mode live cap (a section's guards plus its reinforcements)
    this.prevMaxAlive = em.maxAlive;
    em.maxAlive = SECTOR.maxAlive;
    this.ct = new CtDevices(g, 'host', {
      say: (t) => g.hud.barks.say('lantern', t, true),
      record: () => this.cameraAlarm(),
      dirty: () => undefined,
      // (guard-ai S17, G1) a laser broken / a camera's alarm: the guards search the device's spot, never the player's
      alertAt: (x, y, z, key) => g.enemyMgr?.deviceAlert(x, y, z, key),
    });
    g.ctDev = this.ct;
    // (the occlusion rays: static geometry only, so glass and fences never hide a guard; fix round: the static bodies the
    // camera sees through - a door leaf not shut, an unbroken breakable pane, a roof sheet - are stepped past. Render
    // only: gameplay rays keep G.STATIC whole; frzpol: a door that stops hiding the view or a pane that opens re-tests
    // the hidden guards at the next evaluation)
    if (flags.guardFreeze) {
      const w = g.world;
      const sheets = w.level.sheets;
      const see = (body: unknown, x: number, y: number, z: number): boolean =>
        w.doors.seeThrough(body) || w.breakables.seeThrough(body) || inSheet(sheets, x, y, z);
      const views = (): number => w.doors.viewVersion() + w.breakables.viewVersion();
      // (guard-render S10b) the torch / character shadow atlas slots count as shadowing lights
      this.freeze = new SectorGuardFreeze(g.scene, em, seeThroughRay((a, b) => g.ballistics.cast(a, b, G.STATIC), see), views, { torch: w.torchShadows, chars: w.charShadows });
    }
    (window as unknown as { __sector?: SectorMode }).__sector = this;
    // (section-rating S2) the section's alarms and found bodies; the dev / test view of the rating
    this.offs.push(
      g.events.on('alarm', () => {
        this.secStats.alarms++;
      }),
      g.events.on('bodyFound', () => {
        this.secStats.bodiesFound++;
      }),
    );
    this.detSeen = g.style.detections;
    (window as unknown as { __sectionRating?: SectionRatingHook }).__sectionRating = this.hook;
    this.card = new RatingCard(g.hud.el);
    setOnRated(this.rated);
    this.findDoors();
    this.team.build();
    this.findKeypads();
    this.findDesks();
    this.findCrates();
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
      // (cap fix) a connector's doors sit between two sections: their items are always mirrored (untagged)
      this.untagDoor(near);
      this.untagDoor(far);
      for (const d of seal) this.untagDoor(d);
    }
  }

  /** (sector-redesign cap fix) Door `d`'s item goes on the co-op wire in every section (`Interactables.scope`). */
  private untagDoor(d: DoorState | null): void {
    if (!d) return;
    const it = this.g.interactables?.items.find((x) => x.id === `door-${d.anchor.id}`);
    if (it) delete it.section;
  }

  /**
   * (sector-redesign EW5, A4) The keypad doors: each locked (a nav closure, as a team door), with a keypad item at the
   * door centre ("Enter code" once the team holds the code, else "Keypad - code needed"; either side), and each board
   * intel's "Read" item. Host / solo only (the client mirrors the items and the door locks, `lk`; its use comes back as
   * `use`).
   */
  private findKeypads(): void {
    const g = this.g;
    const ds = g.world.doors;
    const ints = g.interactables;
    this.run.defs.forEach((s, sec) => {
      s.keypads?.forEach((p, k) => {
        const door = ds.nearest(p.at[0], p.at[1], DOOR_FIND);
        if (door) this.lockDoor(door, true);
        else console.warn(`[sector] ${s.id}: no door at keypad ${k} (${p.at[0]}, ${p.at[1]})`);
        const nav = this.team.navClosure(door, p.at);
        if (!ints) return;
        const y = door ? door.anchor.hinge.y : 0;
        const it = ints.add(keypadItemId(sec, k), 'door', new Vector3(p.at[0], y, p.at[1]), KEYPAD_LABEL_NONE, KEYPAD_HOLD, 0);
        it.section = sec;
        it.reach = KEYPAD_REACH;
        it.onUse = (u, by) => this.enterCode(sec, k, u, by);
        ints.setEnabled(it, true);
        this.keyIts.push({ sec, k, it, door, nav });
      });
      s.intel?.forEach((n, k) => {
        if (n.kind !== 'board' || !ints) return;
        const it = ints.add(intelItemId(sec, k), 'intel', new Vector3(n.at[0], n.at[1], n.at[2]), BOARD_LABEL, BOARD_READ, n.yaw ?? 0);
        it.section = sec;
        it.onUse = () => {
          if (this.codes.grant(sec, k)) this.learned(sec, k);
        };
        ints.setEnabled(it, true);
        this.boardIts.push({ sec, k, it });
      });
    });
    this.keypadLabels();
  }

  /** (EW5) A keypad was used (`by` as `unbolt`): with the code, its door unlocks for both and the item goes off. */
  private enterCode(sec: number, k: number, it: Interactable, by?: string): void {
    const local = by === undefined || by === 'local';
    if (!this.codes.useKeypad(sec, k)) {
      // no code yet: the hold starts again, and the user is told
      it.progress = 0;
      if (local && !this.codes.isOpen(sec, k)) this.g.hud.feedItem('Locked - find the code', 'warn');
      return;
    }
    const q = this.keyIts.find((x) => x.sec === sec && x.k === k);
    if (!q) return;
    if (q.door) this.lockDoor(q.door, false);
    if (q.nav >= 0) this.g.nav?.setClosed(q.nav, false);
    this.g.interactables?.setEnabled(q.it, false);
    // the client's door lock rides the next sector send: send it now
    this.secT = 0;
    if (local) this.g.hud.feedItem('Code accepted');
  }

  /** (EW5) Intel k of section sec gave its code: the line once as a radio subtitle (G82), to the co-op client too. */
  private learned(sec: number, k: number): void {
    const n = this.codes.intel(sec, k);
    if (!n) return;
    for (const b of this.boardIts) if (b.sec === sec && b.k === k && b.it.enabled) this.g.interactables?.setEnabled(b.it, false);
    this.g.hud.barks.say('lantern', n.line, true);
    this.g.net?.radioLine?.(n.line);
    this.keypadLabels();
  }

  /** (EW5) Each keypad's prompt from the codes held. */
  private keypadLabels(): void {
    for (const q of this.keyIts) {
      const p = this.run.defs[q.sec]!.keypads![q.k]!;
      q.it.label = this.codes.has(p.code) ? KEYPAD_LABEL : KEYPAD_LABEL_NONE;
    }
  }

  /** (EW5, A50) A section restart: its codes dropped, its intel found again, its keypad doors locked again. */
  private rekey(sec: number): void {
    const shut = this.codes.restart(sec);
    for (const q of this.keyIts) {
      if (q.sec !== sec) continue;
      if (shut.includes(q.k)) {
        if (q.door) this.lockDoor(q.door, true);
        if (q.nav >= 0) this.g.nav?.setClosed(q.nav, true);
      }
      q.it.progress = 0;
      if (!q.it.enabled) this.g.interactables?.setEnabled(q.it, true);
    }
    for (const b of this.boardIts) if (b.sec === sec && !b.it.enabled) this.g.interactables?.setEnabled(b.it, true);
    this.keypadLabels();
    this.secT = 0;
  }

  /** (EW5) The overhear intel of the live section: a living player in the zone long enough learns its code. */
  private overhearStep(dt: number, sec: number, s: SectorDef): void {
    const list = s.intel;
    if (!list) return;
    const refs = this.g.playerRefsInto(this.refs);
    for (let k = 0; k < list.length; k++) {
      const n = list[k]!;
      if (n.kind !== 'overhear' || this.codes.got[sec]![k]) continue;
      if (n.talkers) {
        let ok = true;
        for (let i = 0; i < n.talkers.length && ok; i++) {
          const e = this.slotEnemy[n.talkers[i]!];
          ok = !!e && e.alive && !e.ko;
        }
        if (!ok) {
          this.codes.hear(sec, k, dt, false);
          continue;
        }
      }
      let inside = false;
      for (let i = 0; i < refs.length && !inside; i++) {
        const r = refs[i]!;
        if (r.target.alive && inOverhear(n, r.feet.x, r.feet.y, r.feet.z)) inside = true;
      }
      if (this.codes.hear(sec, k, dt, inside)) this.learned(sec, k);
    }
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

  /**
   * (sector-redesign E6, EW10) Each security desk's console item ("Loop cameras", then "Switch cameras off", then
   * "Cameras off"), usable only while its section is live (`deskApply`). Host / solo; the client mirrors the item and
   * reads the desk's mode back from its label (`deskModeOf`, no wire change).
   */
  private findDesks(): void {
    const ints = this.g.interactables;
    const defs = this.desks.defs;
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i]!;
      if (!ints) {
        this.deskIts.push(null);
        continue;
      }
      const it = ints.add(deskItemId(i), 'switch', new Vector3(d.at[0], (d.y ?? 0) + DESK_ITEM_Y, d.at[1]), deskLabel(0), DESK_HOLD, d.yaw);
      it.section = d.section;
      it.reach = DESK_REACH;
      it.onUse = (_u, by) => {
        this.useDesk(i, by);
      };
      this.deskIts.push(it);
    }
  }

  /**
   * (E9-crate, A100) Each section's weapons crate (host / solo; disabled until its section begins). (PR 3) Tagged with its
   * section, so a co-op host mirrors only the live section's crate (`Interactables.scope`).
   */
  private findCrates(): void {
    const cr = this.g.crates;
    if (!cr) return;
    for (let i = 0; i < this.run.defs.length; i++) {
      const s = this.run.defs[i]!;
      const c = s.crate;
      if (c) cr.add(crateItemId(s.id), new Vector3(c.at[0], c.at[1], c.at[2]), c.yaw).section = i;
    }
  }

  /** (E6) Desk `d`'s operator is alive, awake and at his post. Not spawned yet (pending) counts as at his post. */
  private deskManned(d: SecurityDesk): boolean {
    const op = d.operator;
    if (op === undefined) return false;
    const e = this.slotEnemy[op];
    if (e) return operatorAtPost(d, e.alive, e.ko, e.pos.x, e.pos.z);
    for (let k = 0; k < this.pending.length; k++) if (this.pending[k]!.k === op) return true;
    return false;
  }

  /**
   * (E6) A player uses desk `i` (`by`: 'local' / undefined this machine, else the client's id). Returns the
   * `SectorDesks.use` result (`DESK_USED_*` or a refusal). Also the e2e test hook.
   */
  useDesk(i: number, by?: string): number {
    const d = this.desks.defs[i];
    const it = this.deskIts[i] ?? null;
    const local = by === undefined || by === 'local';
    if (!d || d.section !== this.deskSec) return DESK_REFUSE_BAD;
    const r = this.desks.use(i, this.deskManned(d));
    if (r < 0) {
      if (it) it.progress = 0;
      if (local && r === DESK_REFUSE_MANNED) this.g.hud.feedItem(this.slotEnemy[d.operator!] ? DESK_MANNED_LINE : DESK_LOCKED_LINE, 'warn');
      return r;
    }
    this.deskApply();
    const line = r === DESK_USED_LOOP ? DESK_LOOP_LINE : DESK_OFF_LINE;
    if (local) this.g.hud.feedItem(line);
    else this.g.net?.radioLine?.(line);
    return r;
  }

  /** (E6) Every desk's mode onto its cameras and its console item (label, usable while its section is live). */
  private deskApply(): void {
    const defs = this.desks.defs;
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i]!;
      const m = this.desks.mode[i]!;
      this.ct?.setDesk(d.cameras, m);
      const it = this.deskIts[i];
      if (!it) continue;
      it.label = deskLabel(m);
      const on = d.section === this.deskSec && m !== DESK_OFF;
      if (it.enabled !== on) this.g.interactables?.setEnabled(it, on);
      if (!on) it.progress = 0;
    }
    this.secT = 0;
  }

  /** Test hook (e2e): this machine's player uses section `sec`'s keypad `k`. True when its door unlocked. */
  useKeypad(sec: number, k: number): boolean {
    const q = this.keyIts.find((x) => x.sec === sec && x.k === k);
    if (!q || !q.it.enabled) return false;
    this.enterCode(sec, k, q.it, 'local');
    return this.codes.isOpen(sec, k);
  }

  /** Test hook (e2e): this machine's player uses section `sec`'s bolt `k` (the side test, and a pair bolt's partner). */
  useBolt(sec: number, k: number): boolean {
    return this.team.unbolt(sec, k, 'local');
  }

  /** Test hook (e2e): this machine's player turns key switch a (`isA`) or b of section `sec`'s pair gate `k`. */
  turnKey(sec: number, k: number, isA: boolean): 'open' | 'wait' | 'done' {
    return this.team.turnKey(sec, k, isA, 'local');
  }

  /** Test view: the bolts (item id, door index, plan centre, side, pair, shut, door locked, nav closure). */
  boltInfo(): ReturnType<SectorTeamDoors['boltInfo']> {
    return this.team.boltInfo();
  }

  /** Test view: the pair gates (switch item ids, door index, open, door locked, nav closure). */
  pairGateInfo(): ReturnType<SectorTeamDoors['gateInfo']> {
    return this.team.gateInfo();
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
    // (section-bake) the lamp bake (a map baking per section) bakes this section first
    if (s) this.g.world.lightBake?.sections?.setLive(i);
    this.deskSec = s ? i : -1;
    this.ct?.setLive(s ? i : -1);
    // (cap fix) co-op mirrors this section's items only (plus the untagged ones)
    if (this.g.interactables) this.g.interactables.scope = s ? i : -1;
    // alarm panels: only this section's work, armed again; a panel alarm can be raised again (once per section load)
    this.g.stealth?.setLiveAlarms(s ? i : -1);
    this.g.enemyMgr?.resetAlarm();
    // (E6) a section load (a change or a restart) puts every desk's cameras back; only the live section's desks work
    this.desks.reset();
    this.deskApply();
    // (guard-ai S5) the section's noisy things mask hearing (else the map's); dev / tests check its posts (warnings)
    const em = this.g.enemyMgr;
    // (guard-ai S6, S3-CHECK) the radio net serves the live section (its command call raises this section's alarm)
    if (em && s) {
      em.setSection(i);
      // (guard-rules S5, A7, bible 5.7 "Each raised alarm adds one level") after a response is in, a guard may raise the
      // next alarm (up to `ALARM_REPEAT.max` a load); Marlow Yard (`courseMode`) keeps one guard alarm per load
      em.alarmRepeat = true;
    }
    if (em) em.setNoisy(s?.noisy ?? em.mapNoisy);
    // (guard-ai S13, A37) the stage's gear for every guard this load places (the stage carried in, or the section's
    // start stage on a restart: a restart drops what the dropped stage gave)
    if (em) em.setAlarmStage(this.run.alarm, false);
    if (s && import.meta.env.DEV) reportGuardAi(s.id, validatePosts(s.guards, s.id));
    if (!s) return;
    this.slotEnemy.length = 0;
    const n = flags.sectorGuards ?? s.guards.length;
    for (let k = 0; k < s.guards.length && k < n; k++) this.pending.push({ k, slot: s.guards[k]!, alerted: false, look: em?.lookOfSlot(s.id, k) });
    this.fill();
  }

  /** The current section unloads: a held guard is let go, then every guard and body goes, and its devices go off. */
  private unloadSection(): void {
    const g = this.g;
    if (g.takedown.active) g.takedown.reset();
    // co-op: guards a client holds (grab, hostage) are let go and the client told, before they despawn
    g.net?.releaseHolds?.();
    this.pending.length = 0;
    this.slotEnemy.length = 0;
    g.enemyMgr?.despawnAll();
    // (E5) the section's lockdown doors open again (a restart applies its start stage's actions again)
    if (this.stageRun?.release()) this.secT = 0;
    // (guard-ai S7) the cameras forget the bodies they reported (a section load or restart reports afresh)
    g.security?.clearBodyReports();
    this.ct?.setLive(-1);
    g.stealth?.setLiveAlarms(-1);
    if (g.interactables) g.interactables.scope = -1;
    // (E6) the desks' loops and offs end with the section
    this.deskSec = -1;
    this.desks.reset();
    this.deskApply();
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
      // (E4, I5) a timed window still running at the section change is not the section's state: its circuits count as on
      const bs = this.g.stealth?.boards;
      if (bs) {
        for (let i = 0; i < bs.defs.length; i++) {
          if (bs.left[i]! <= 0) continue;
          for (const gp of bs.defs[i]!.groups) this.startState.markGroupOn(gp);
        }
      }
    }
    this.g.hud.banner(`SECTION ${this.run.index + 1}  ·  ${s.name.toUpperCase()}`, s.objective.label, 2600);
    this.setup(s);
    // (E9-crate, A100) only this section's crate is live
    this.g.crates?.setLive(s.crate ? crateItemId(s.id) : null);
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
    // (EW5) an objective that gives codes (the S2 BMS hack): each once
    for (const k of this.codes.objectiveDone(this.run.index, this.granted)) this.learned(this.run.index, k);
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
    // (section-bake, SB9) the cycle waits until the next section's lamps are in (a map baking per section; in play they
    // landed long before: the whole background bake takes well under a section's play)
    const sb = this.g.world.lightBake?.sections;
    this.connIn.allInside = all && (!sb || sb.ready(this.run.index + 1));
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
      // (section-rating S2) the section is rated as its connector unloads it; its grant waits for the next section
      this.rate(prev, true);
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
      // (section-rating S2, A8) the grant lands before the loadout is recorded: a restart of this section keeps it
      this.giveGrant();
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
      // (guard-ai S6) a reinforcement is told by command (`joinReinforcement`), not spawned alerted (no contact call)
      const e = em.spawn(p.slot.kind, this.tmp, p.alerted && !(p.reinforce && em.coordinated), p.slot.yaw, p.look);
      if (!e) break;
      if (p.slot.info) e.info = p.slot.info; // (stealth-pays S2) what INTERROGATE gets out of him
      if (p.slot.route) e.setPatrol({ points: p.slot.route, wait: p.slot.wait, waits: p.slot.waits, faces: p.slot.faces, start: p.slot.start, loop: p.slot.loop });
      if (p.k >= 0) this.slotEnemy[p.k] = e;
      // (guard-ai S5) post, profile, section (the live SectorDef's index); (S5b) the sector tags (squad, handler,
      // zone, role, pair) with the section's guard list and this slot's place in it (`k`; a reinforcement: -1, none)
      const gs = this.run.defs[this.run.index]?.guards;
      // (guard-ai S12) and his gear: the slot tag plus the section default
      em.placeSlot(e, p.slot, this.run.index, gs, gs ? p.k : -1, this.run.defs[this.run.index]?.gear);
      // (guard-ai S6, M1) aggressive, knows the last known position, runs its entry route in (after `placeSlot`, which
      // sets `tacticsProfile` first)
      if (p.reinforce) em.joinReinforcement(e, this.run.index, p.route ?? null);
      // (guard-ai S13) into its response team (the shield guard spawns first: the pending order)
      if (p.team) em.joinTeam(e, p.team);
      this.pending.splice(i, 1);
    }
  }

  /** (stealth-pays S2, spare 9 part B) An interrogation's code flag: the team holds it for this section; keypad prompts refresh. */
  onIntelCode(flag: string): void {
    if (this.codes.grantCode(flag, this.run.index)) this.keypadLabels();
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
    this.secStats.camAlarms++;
    const ct = this.ct;
    const up = this.run.alarm;
    const send = ct && ct.alarm > up ? this.run.raiseAlarm() : 0;
    // (section-rating fix, A10) a stage raised by a camera / laser breaks No alarms too (the card agrees with the HUD)
    if (this.run.alarm > up) this.secStats.alarms++;
    this.raised(up, send, false);
  }

  /** The stage went from `from` to `run.alarm`: the banner, the devices' stage, `send` guards in from the section's points. */
  private raised(from: number, send: number, banner: boolean): void {
    const g = this.g;
    const stage = this.run.alarm;
    if (this.ct) this.ct.alarm = stage;
    if (stage > from && banner) g.hud.banner(`ALARM STAGE ${stage}`, send ? 'Reinforcements coming' : '', 2200);
    // (guard-ai S13, item 4, A37) every living guard of the live section gets the stage's gear at once; no camera is
    // added, woken or retuned (the devices only show the stage, as before)
    const em = g.enemyMgr;
    if (stage > from && em) em.setAlarmStage(stage);
    const s = this.run.current;
    if (s && stage > from) this.stageActions(from, stage);
    if (!s || !send) return;
    // (guard-ai S6, design 7) the stage's response route (E5, `reinforceSlot`: the guard's patrol) first; else the
    // section's entries (`SectorDef.entries`, with their run-in routes); else its reinforce points; taken in turn
    const ents = s.entries?.length && !s.stageActions?.some((a) => a.stage === stage && a.responseRoute?.length) ? s.entries : null;
    // (guard-ai S13, items 3 and 11, A38) the stage's response team: a shield guard first, the rest armed guards (the
    // same count, so the live cap holds); it sweeps the section after its search (the section's sweep list, else its
    // route points and posts). Made with the first guard that has a slot (none: no team).
    // (guard-rules S1, A4, M2) the shield lead only where the section asks (`shieldTeams`: campus S4 / S5)
    const nt = responseTeam(stage, send, this.teamKinds, s.shieldTeams === true);
    let team: SweepTeam<Enemy> | null = null;
    let n = 0;
    for (let i = 0; i < send; i++) {
      const en = ents ? ents[this.reinforceK++ % ents.length]! : null;
      // (sector-redesign G3) armed guards, never heavies (G155); the count is the section's `perStage`; (E5) at the
      // stage's response route (its patrol) when it has one
      const slot: SquadSlot | null = en
        ? { kind: SECTOR_REINFORCE_KIND, x: en.at[0] + (i % 2) * 1.3, z: en.at[1], yaw: en.yaw ?? 0 }
        : reinforceSlot(s, stage, i, this.reinforceK++, SECTOR_REINFORCE_KIND);
      if (!slot) break;
      // (S13) the team's kinds (a fresh slot either way)
      if (i < nt) slot.kind = this.teamKinds[i]!;
      if (en?.y !== undefined) slot.y = en.y;
      if (!team && em && nt > 0) team = em.newTeam(this.run.index, s.sweep ?? null, ...this.sweepSource(s));
      this.pending.push({ k: -1, slot, alerted: true, reinforce: true, route: en?.route ?? null, team });
      n++;
    }
    if (!n) return;
    this.reinforced += n;
    this.fill();
  }

  /** (guard-ai S13) Scratch for a response team's kinds. */
  private readonly teamKinds: EnemyKind[] = [];
  /** (guard-ai S13) Each section's sweep source (its guards' route points, and the stand posts of the guards without a
   *  route; dogs left out), built the first time the section's alarm brings a team. */
  private readonly sweepSrc = new Map<SectorDef, [readonly (readonly [number, number])[][], [number, number][]]>();

  private sweepSource(s: SectorDef): [readonly (readonly [number, number])[][], [number, number][]] {
    let v = this.sweepSrc.get(s);
    if (!v) {
      const routes: (readonly [number, number])[][] = [];
      const posts: [number, number][] = [];
      for (const q of s.guards) {
        if (q.kind === 'dog') continue;
        if (q.route && q.route.length) routes.push(q.route);
        else posts.push([q.x, q.z]);
      }
      v = [routes, posts];
      this.sweepSrc.set(s, v);
    }
    return v;
  }

  /** The extraction: the stinger, then the result line. */
  private complete(): void {
    if (this.endT >= 0) return;
    const g = this.g;
    for (const it of this.its) g.interactables?.remove(it);
    this.its.length = 0;
    g.hud.setObjective('');
    // (section-rating S2) the last section is rated at the extraction (nothing follows it to grant)
    this.rate(this.run.index, false);
    // co-op: the last rating goes now (the sector sends stop once the op ends), ahead of the end message
    const ct = this.ct;
    if (ct && g.net?.sector) g.net.sector(ct.wire(), this.netExtra(ct));
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
    return sectorResult({ time: this.t, kills: Math.max(0, g.stats.kills - g.stats.knockouts), spotted: g.style.detections + this.camAlarms, marks: this.run.marks });
  }

  /**
   * (section-rating S2) Rate section `i` from the live counters (once: a section is never re-rated), record the best
   * (S5), and with `grant` owe the next section its reward (given as it begins). The counters then start afresh.
   */
  private rate(i: number, grant: boolean): void {
    const s = this.run.defs[i];
    if (!s || (this.run.marks[i] ?? 0) >= 0) return;
    const g = this.g;
    const st = this.secStats;
    const marks = rateSection(st, DEFAULT_RULES);
    const synced = st.synced;
    this.run.marks[i] = marks;
    this.ratedSynced[i] = synced;
    let gadgetsAtStart = 0;
    for (const id of GRANT_GADGETS) gadgetsAtStart += GADGETS[id].carry;
    const preset = syringesFor(g.opts.difficulty);
    const r = rewardsFor(marks, synced, {
      coop: coopRating(g.net !== null, g.playerRefsInto(this.refs).length),
      preset,
      gadgetsAtStart,
      syringesAtStart: g.net?.revivesLeft?.() ?? preset,
    });
    // A9 (for the lead): until guard-ai's alarm stage API is on master, Bodies hidden's alarm step is +1 gadget charge
    r.gadget = Math.min(gadgetsAtStart, r.gadget + r.alarmStep);
    r.alarmStep = 0;
    if (grant) this.owed = r;
    const view: SectionRatingView = { sectionId: s.id, title: s.name, marks, synced, grant: r };
    this.hook.last = view;
    // (integration) every section's rating, for the op-end results lines
    putRating(g.sectionRatings, view);
    // (integration) an ungranted rating (the extraction's) carries no grant on the wire: the client tops up nothing
    const w = this.rt;
    w.sec = i;
    w.marks = marks;
    w.synced = synced;
    w.gadget = grant ? r.gadget : 0;
    w.syringe = grant ? r.syringe : 0;
    w.medkit = grant ? r.medkit : 0;
    w.alarmStep = grant ? r.alarmStep : 0;
    this.secT = 0;
    const mapId = g.world.map.id;
    void updateRatingRecord(mapId, s.id, marks, synced);
    this.rateGrant = grant;
    onRated?.(mapId, s.id, marks, synced);
    this.freshCounters();
  }

  /**
   * (integration) The gadget a grant of `n` charges tops up as the next section begins, by name ("noisemaker"): the
   * first of GRANT_GADGETS with room, when it takes all `n`; else undefined (the card reads "gadget").
   */
  private grantGadgetName(n: number): string | undefined {
    if (n <= 0) return undefined;
    const counts = this.g.weapons.gadgets.counts;
    for (const id of GRANT_GADGETS) {
      const room = Math.min(GADGETS[id].carry, GADGETS[id].max) - counts[id];
      if (room <= 0) continue;
      return room >= n ? GADGETS[id].name.toLowerCase() : undefined;
    }
    return undefined;
  }

  /** (section-rating fix) Gadget charges a top-up could add now: each of GRANT_GADGETS up to its starting carry. */
  private gadgetRoom(): number {
    const counts = this.g.weapons.gadgets.counts;
    let room = 0;
    for (const id of GRANT_GADGETS) room += Math.max(0, Math.min(GADGETS[id].carry, GADGETS[id].max) - counts[id]);
    return room;
  }

  /** (section-rating fix) A medkit grant would heal this machine's player now (alive, below full health). */
  private ownHeals(): boolean {
    const g = this.g;
    const h = g.target.health;
    return stationHeal(h.hp, h.maxHp, g.player.alive, g.opts.difficulty ?? 'normal') !== null;
  }

  /** (section-rating S2) The section's counters back to zero (in place), the synced pairs forgotten. */
  private freshCounters(): void {
    resetSectionStats(this.secStats);
    this.syncDet.reset();
    this.detSeen = this.g.style.detections;
  }

  /**
   * (section-rating S2) The owed grant, given once: gadget charges (noisemaker, then gas, each up to its starting carry),
   * syringes (co-op: the op's revive cap, through the net layer's `addSyringes` when it has one; counted in the run),
   * medkits (a station's heal for each player). `lastGrant` shows what actually landed.
   */
  private giveGrant(): void {
    const r = this.owed;
    if (!r) return;
    this.owed = null;
    const g = this.g;
    const given = emptyGrant();
    let n = r.gadget;
    for (const id of GRANT_GADGETS) {
      if (n <= 0) break;
      const k = g.gadgets.topUp(id, n, GADGETS[id].carry);
      given.gadget += k;
      n -= k;
    }
    if (r.syringe > 0) {
      this.run.syringeBonus += r.syringe;
      const net = g.net;
      if (net?.addSyringes) {
        net.addSyringes(r.syringe);
        given.syringe = r.syringe;
      }
    }
    for (let k = 0; k < r.medkit; k++) if (this.healAll()) given.medkit++;
    this.hook.lastGrant = given;
    if (given.gadget > 0) g.hud.feedItem(`Section rating: +${given.gadget} gadget`, 'xp');
  }

  /** (section-rating S2) A medkit reward: a station's heal for every player (the host's own, and each client's). */
  private healAll(): boolean {
    const g = this.g;
    let any = false;
    const h = g.target.health;
    const hp = stationHeal(h.hp, h.maxHp, g.player.alive, g.opts.difficulty ?? 'normal');
    if (hp !== null) {
      h.heal(hp - h.hp);
      any = true;
    }
    const refs = g.playerRefsInto(this.refs);
    for (let i = 1; i < refs.length; i++) if (g.net?.healAtStation?.(refs[i]!.id)) any = true;
    return any;
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
    // (sector-fixes-r RT; E3) the section's team doors are bolted and its pair gates locked again (a clean retry)
    this.team.reset(this.run.index);
    // (EW5, A50) the codes found in this section go, and its keypad doors lock again
    this.rekey(this.run.index);
    this.unloadSection();
    // (M9) a clean start: the guards' shared memory back at its match-start state (alarm, last known position, sighting
    // flags, clocks), and the players' side: the section's loadout reloaded, gadgets and grenades out in the world gone,
    // the stealth leftovers cleared, the music calmed (`GameState.checkpointReset`)
    g.enemyMgr?.resetMemory();
    g.checkpointReset();
    // (section-rating S2, A8) the section's counters start again (a restart never re-rates; a grant already given stays,
    // being in the recorded loadout). A restart during a cycle is of the next section: its owed grant lands now, on top
    // of the loadout just put back, and that becomes the loadout a later restart gives back.
    this.freshCounters();
    if (ev & CONN_UNLOCK_FAR && this.owed) {
      this.giveGrant();
      g.weapons.markCheckpoint();
    }
    // (E9-crate, A105) every crate usable again by everyone
    g.crates?.resetAll();
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

  /** (coop-rejoin) The checkpoint's slot points: the run's checkpoint (slot 0) and the partner's point when the map gives
   *  one (slot 1; else the host places the partner beside the checkpoint). */
  checkpointSpawns(): SlotPoint[] {
    if (!this.run.current) return [];
    const a = this.run.checkpoint;
    const b = this.run.checkpoint2;
    const out: SlotPoint[] = [{ x: a.x, y: a.y, z: a.z, yaw: a.yaw }];
    if (b) out.push({ x: b.x, y: b.y, z: b.z, yaw: b.yaw });
    return out;
  }

  /** (coop-rejoin) The `sector` message on the next step (a client joined or reconnected mid-run). */
  resync(): void {
    this.secT = 0;
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
    // (section-rating S2) guard detections count in the current section (the stealth tally's rise)
    const det = g.style.detections;
    if (det > this.detSeen) this.secStats.detections += det - this.detSeen;
    this.detSeen = det;
    this.team.now = this.t;
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
    // (E6) a desk's loop window ran out: its cameras report again
    if (this.desks.step(dt) > 0) {
      this.deskApply();
      g.hud.feedItem(DESK_LOOP_END_LINE);
      g.net?.radioLine?.(DESK_LOOP_END_LINE);
    }
    const s = this.run.current;
    if (!s) return;
    this.overhearStep(dt, this.run.index, s);
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

  frameUpdate(dt: number): void {
    // (integration) the rating card's countdown (no DOM work until its fade)
    this.card?.update(dt);
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
    // (guard-rules S1, A5) a killed dog costs score; a gassed one (`e.ko`) scores as before
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2, !e.ko);
    // (section-rating S2) a knock-out is not a kill (A2); two by two players within SYNC_WINDOW are synced (A6)
    const st = this.secStats;
    st.bodiesMade++;
    if (!e.ko) {
      st.kills++;
      return;
    }
    st.knockouts++;
    const p = h.attackerId === 'local' || h.attackerId === '' ? 0 : 1;
    if (this.syncDet.onTakedown(p, this.t)) st.synced = this.syncDet.synced;
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
    const rh = this.rt.sec >= 0 ? packRated(this.run.marks, this.ratedSynced) : undefined;
    return { ls: ct.liveSection, lk, dn: ct.destroyedIds([]), sy: this.g.net?.revivesLeft?.() ?? 0, rt: { ...this.rt }, ...(rh ? { rh } : {}) };
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
      // (sector-redesign perf) guards render-frozen at the last camera evaluation (-1: the freeze is off)
      guardFreeze: this.freeze ? this.freeze.count : -1,
      guardFreezeOccluded: this.freeze ? this.freeze.occluded : -1,
      guardFreezeRays: this.freeze ? this.freeze.rays : -1,
      lastReset: { ...this.lastReset },
      restarting: this.restartT >= 0,
      checkpoint: { ...this.run.checkpoint },
      nearLocked: locked(d?.near),
      farLocked: locked(d?.far),
      doors: this.doors.map((k) => ({ near: locked(k.near), far: locked(k.far), seal: k.seal.map((x) => x.anchor.locked) })),
      live: this.ct?.liveSection ?? null,
      bolts: this.bolts.shut.map((row) => row.slice()),
      rating: { stats: { ...this.secStats }, marks: this.run.marks.slice(), syringeBonus: this.run.syringeBonus, owed: this.owed ? { ...this.owed } : null },
      pairGates: this.pairGates.open.map((row) => row.slice()),
      codes: this.codes.codes(),
      keypads: this.codes.open.map((row) => row.slice()),
      keypadLocked: this.keyIts.map((q) => (q.door ? q.door.anchor.locked : null)),
      lockdown: this.stageRun?.lockedCount() ?? 0,
      desks: Array.from(this.desks.mode),
      crates: this.g.crates?.debug() ?? [],
      ...this.result(),
    };
  }

  dispose(): void {
    this.freeze?.dispose();
    this.freeze = null;
    this.ct?.dispose();
    this.ct = null;
    this.g.ctDev = null;
    if (this.g.interactables) this.g.interactables.scope = ITEM_SCOPE_OFF;
    this.pending.length = 0;
    const em = this.g.enemyMgr;
    if (em && this.prevMaxAlive >= 0) em.maxAlive = this.prevMaxAlive;
    em?.useDifficultyHelmets(false);
    const w = window as unknown as { __sector?: SectorMode; __sectionRating?: SectionRatingHook };
    if (w.__sector === this) delete w.__sector;
    if (w.__sectionRating === this.hook) delete w.__sectionRating;
    for (const off of this.offs) off();
    this.offs.length = 0;
    if (onRated === this.rated) setOnRated(null);
    this.card?.el.remove();
    this.card = null;
  }
}
