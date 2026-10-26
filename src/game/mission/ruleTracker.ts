/**
 * (mission-framework EN1) The rule tracker, host only (PLAN section 3; pure, Babylon-free, no net imports).
 *
 * Ghost / no kills / no alarms / no bodies found ARE section-rating's marks (A8): the tracker keeps a `SectionStats` per
 * scope (the mission, Team A, Team B), fed from the same events sectorMode already counts, and a rule breaks when its
 * mark bit (UNDETECTED / NO_KILLS / NO_ALARMS / BODIES_HIDDEN) drops from `rateSection` with section-rating's defaults
 * (a knock-out is not a kill, a camera alarm breaks ghost). Attribution (A9): a kill, knock-out, gadget, interrogation or
 * take by its player's slot (one player carries both teams); team ghost by the alerted guard's track zone (spotFail's
 * test, per track); an alarm, camera alarm or found body by its position in a track's boxes, else against both teams.
 * The other rules: no gadgets, named target (a decoy read; or the target killed before he talked on a step the rule
 * covers, `onTargetKilled`, as the Three Grey Coats page Michael signed says) and plant-not-take (a take).
 * (mission-rules R1) Every break restarts the section and the mission continues (G290); no rule ends a mission or times
 * a step (G334). A team rule's break restarts only that team in Sector Ops (`restartTeam`;
 * `MissionRunner.restore(.., team)`, `resetSection(.., scope)`, M1), a mission rule's everyone.
 * The protected restart (`onProtected`: an interrogation target knocked out before he talks, or killed on a step no
 * named-target rule covers; G353, A2 / A3, BRIEF M6) is not a rule break: it restarts the section for everyone with
 * `PROTECTED_LINE` and `lastRule` -1, and never counts in `breaks`, `kept()` or `brokenCount`.
 * After `resetSection` the reset scopes hold RULE_HOLD s so a rule cannot fire again before the players respawn. Feeds
 * and `update` do not allocate.
 */
import { DEFAULT_RULES, UNDETECTED, NO_KILLS, NO_ALARMS, BODIES_HIDDEN, newSectionStats, rateSection, resetSectionStats, type RatingRules, type SectionStats } from '../rating/sectionRating';
import { teamForSlot, type MissionDef, type MissionRule, type RuleKind } from './missionDef';
import type { MissionRunner } from './missionRunner';
import { breakLine, PROTECTED_LINE } from './missionText';

export const SCOPE_MISSION = 0;
export const SCOPE_A = 1;
export const SCOPE_B = 2;
export const SCOPES = 3;
/** Team bits for attribution. */
export const TEAM_A_BIT = 1;
export const TEAM_B_BIT = 2;
export const TEAM_BOTH = TEAM_A_BIT | TEAM_B_BIT;

/** `update` outcomes. */
export const RULE_OK = 0;
/** A rule broke (or the protected restart): the host says `line` and restarts the section. */
export const RULE_RESTART = 1;

/** Seconds after a section restart before a rule can break again (courseMode SPOT_HOLD pattern). */
export const RULE_HOLD = 2;

/** The rating mark a rule reads, 0 for the rules that are not marks. */
export function ruleMark(kind: RuleKind): number {
  switch (kind) {
    case 'ghost':
      return UNDETECTED;
    case 'noKills':
      return NO_KILLS;
    case 'noAlarms':
      return NO_ALARMS;
    case 'noBodies':
      return BODIES_HIDDEN;
    default:
      return 0;
  }
}

/** What team ghost reads of a guard (an `Enemy` fits it with its SectorGuard zone): spotFail's SpotGuard + the zone. */
export interface ZoneGuard {
  readonly alive: boolean;
  readonly alerted: boolean;
  readonly passive: boolean;
  readonly zone?: string;
}

function scopeIndex(s: MissionRule['scope']): number {
  return s === 'a' ? SCOPE_A : s === 'b' ? SCOPE_B : SCOPE_MISSION;
}

export class RuleTracker {
  readonly def: MissionDef;
  players: number;
  /** Live stats per scope (SCOPE_MISSION, SCOPE_A, SCOPE_B). */
  readonly stats: readonly [SectionStats, SectionStats, SectionStats];
  /** Rule breaks so far this mission (the wire's `rb`). */
  breaks = 0;
  /** The last break's radio line (the wire's `rl`), '' none. */
  line = '';
  /** The last broken rule (index in `def.rules`), -1 none or the protected restart. */
  lastRule = -1;
  /** The last break's outcome (RULE_RESTART), RULE_OK none. */
  outcome = RULE_OK;
  /** A break fired and the section has not been reset yet: nothing more fires. */
  tripped = false;
  /** (mission-rules R1) Protected restarts this mission (not rule breaks: never in `breaks`). */
  protectedBreaks = 0;
  /** A protected restart waits for the next `update`. */
  private protectedPending = false;
  private now = 0;
  /** Hold end per scope (s). */
  private readonly holdUntil = new Float64Array(SCOPES).fill(-Infinity);
  private readonly ratingRules: Readonly<RatingRules>;
  private readonly scope: Int32Array;
  private readonly mark: Int32Array;
  private readonly ruleStep: Int32Array;
  /** Event rules hit since the last reset (no gadgets, named target, plant-not-take). */
  private readonly hit: Uint8Array;
  /** Breaks per rule over the whole mission. */
  private readonly broken: Uint16Array;

  constructor(def: MissionDef, players: number, runner?: MissionRunner, ratingRules: Readonly<RatingRules> = DEFAULT_RULES) {
    this.def = def;
    this.players = players;
    this.ratingRules = ratingRules;
    this.stats = [newSectionStats(), newSectionStats(), newSectionStats()];
    const n = def.rules.length;
    this.scope = new Int32Array(n);
    this.mark = new Int32Array(n);
    this.ruleStep = new Int32Array(n).fill(-1);
    this.hit = new Uint8Array(n);
    this.broken = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      const r = def.rules[i]!;
      this.scope[i] = scopeIndex(r.scope);
      this.mark[i] = ruleMark(r.kind);
      if (r.step !== undefined) this.ruleStep[i] = runner ? runner.stepIndex(r.step) : def.steps.findIndex((s) => s.id === r.step);
    }
  }

  /** Is the tracker holding after a whole-section restart (the mission scope: its feeds ignored, its rules quiet)? */
  get held(): boolean {
    return this.isHeld(SCOPE_MISSION);
  }

  /** Is a scope holding after its restart (SCOPE_MISSION / SCOPE_A / SCOPE_B)? */
  isHeld(scope: number): boolean {
    return this.now < this.holdUntil[scope]!;
  }

  /** The last broken rule's scope: who goes back (a team, or 'mission': everyone); null before any break. */
  get lastScope(): MissionRule['scope'] | null {
    return this.lastRule >= 0 ? (this.def.rules[this.lastRule]?.scope ?? null) : null;
  }

  /**
   * Who the last break sends back: 'a' / 'b' for a team rule in Sector Ops with 2+ players, else undefined (everyone).
   * Pass it to `MissionRunner.restore(section, now, team)` and `resetSection(now, true, team)`.
   */
  get restartTeam(): 'a' | 'b' | undefined {
    const s = this.lastScope;
    return (s === 'a' || s === 'b') && this.def.mode === 'sector' && this.players > 1 ? s : undefined;
  }

  /** Team bits a player slot plays for (A9; one player or the campaign: both). */
  slotTeams(slot: number): number {
    const t = teamForSlot(slot, this.players, this.def.mode);
    return t === 'a' ? TEAM_A_BIT : t === 'b' ? TEAM_B_BIT : TEAM_BOTH;
  }

  /**
   * Team bits whose track boxes hold (x, z); none (or no position): both. (EN2) With a known `y` a track's height band
   * (`MissionTrack.y`) must hold it too (stacked floors); y NaN (a camera's floor, a found body): the band is not read.
   */
  teamsAt(x: number, z: number, y = Number.NaN): number {
    const tracks = this.def.tracks;
    if (!tracks || !Number.isFinite(x) || !Number.isFinite(z)) return TEAM_BOTH;
    let m = 0;
    for (let t = 0; t < tracks.length; t++) {
      const tr = tracks[t]!;
      const band = tr.y;
      if (band && Number.isFinite(y) && (y < band[0] || y > band[1])) continue;
      const boxes = tr.boxes;
      for (let b = 0; b < boxes.length; b++) {
        const bx = boxes[b]!;
        if (x >= Math.min(bx[0], bx[2]) && x <= Math.max(bx[0], bx[2]) && z >= Math.min(bx[1], bx[3]) && z <= Math.max(bx[1], bx[3])) {
          m |= tr.team === 'a' ? TEAM_A_BIT : TEAM_B_BIT;
          break;
        }
      }
    }
    return m === 0 ? TEAM_BOTH : m;
  }

  /** Team bits whose track lists `zone` (0: no track does). */
  zoneTeams(zone: string | undefined): number {
    const tracks = this.def.tracks;
    if (!tracks || zone === undefined) return 0;
    let m = 0;
    for (let t = 0; t < tracks.length; t++) {
      const tr = tracks[t]!;
      const zs = tr.zones;
      for (let k = 0; k < zs.length; k++) {
        if (zs[k] === zone) {
          m |= tr.team === 'a' ? TEAM_A_BIT : TEAM_B_BIT;
          break;
        }
      }
    }
    return m;
  }

  // ---- feeds (host; ignored while held) ----

  /** Guard detections of a player (the stealth tally's rise): mission-scope ghost. */
  onDetections(n: number): void {
    if (this.isHeld(SCOPE_MISSION) || !(n > 0)) return;
    this.stats[SCOPE_MISSION].detections += n;
  }

  /** Team ghost (spotFail's test per track): a live, non-passive guard of a track's zones is alerted. Per tick is fine. */
  scanGuards(guards: readonly ZoneGuard[]): void {
    if (!this.def.tracks) return;
    const ha = this.isHeld(SCOPE_A);
    const hb = this.isHeld(SCOPE_B);
    for (let i = 0; i < guards.length; i++) {
      const g = guards[i]!;
      if (!g.alive || g.passive || !g.alerted) continue;
      const m = this.zoneTeams(g.zone);
      if (m & TEAM_A_BIT && !ha && this.stats[SCOPE_A].detections === 0) this.stats[SCOPE_A].detections = 1;
      if (m & TEAM_B_BIT && !hb && this.stats[SCOPE_B].detections === 0) this.stats[SCOPE_B].detections = 1;
    }
  }

  /** A camera alarm / broken laser at (x, z) (NaN: unknown, both teams); `y` the height when known (`teamsAt`). */
  onCameraAlarm(x: number, z: number, y = Number.NaN): void {
    this.each(this.teamsAt(x, z, y), 1);
  }

  /** An alarm raised at (x, z) (a guard's radio call or a stage a device raised; NaN: both teams); `y` as `teamsAt`. */
  onAlarm(x: number, z: number, y = Number.NaN): void {
    this.each(this.teamsAt(x, z, y), 2);
  }

  /** A guard found a body at (x, z); `y` as `teamsAt`. */
  onBodyFound(x: number, z: number, y = Number.NaN): void {
    this.each(this.teamsAt(x, z, y), 3);
  }

  /** A kill (`ko` false) or a knock-out by the player in `slot`. */
  onKill(slot: number, ko: boolean): void {
    this.each(this.slotTeams(slot), ko ? 5 : 4);
  }

  /** A gadget used by the player in `slot` (the `gadget` event, `onRemoteGadget`). */
  onGadget(slot: number): void {
    this.hitRules('noGadgets', this.slotTeams(slot), -1);
  }

  /**
   * An interrogation by `slot`; `decoy` when it read a decoy: a named-target rule on that step breaks for the asker's
   * team (A9, by slot; the mission's rule for anyone). `slot` < 0 (the asker unknown): both teams.
   */
  onInterrogate(slot: number, decoy: boolean, step = -1): void {
    if (!decoy) return;
    this.hitRules('namedTarget', slot >= 0 ? this.slotTeams(slot) : TEAM_BOTH, step);
  }

  /** An item taken by `slot` where the mission says plant, not take. */
  onTake(slot: number): void {
    this.hitRules('plantNotTake', this.slotTeams(slot), -1);
  }

  /**
   * (mission-rules R1, the Three Grey Coats page Michael signed: "killing Teale before he talks, breaks it") The target
   * of interrogate step `step` was killed before he talked: the named-target rules on that step (or with no step) are hit
   * for both teams, as a decoy read with the asker unknown; the next `update` breaks one the normal way (breaks +1, its
   * kept bit cleared, `breakLine`). False when no rule was hit (none covers the step, or its scope is held after a
   * restart).
   */
  onTargetKilled(step: number): boolean {
    return this.hitRules('namedTarget', TEAM_BOTH, step);
  }

  /**
   * (mission-rules R1, G353, A2 / A3, BRIEF M6) The protected restart: an interrogation target knocked out before he
   * talks (or killed on a step no named-target rule covers). The next `update` returns RULE_RESTART with `PROTECTED_LINE`
   * and `lastRule` -1 (everyone goes back); it is not a rule break (`breaks`, `kept()` and `brokenCount` untouched).
   * Ignored while the mission scope is held after a restart, or while a break waits for its reset.
   */
  onProtected(): void {
    if (this.tripped || this.isHeld(SCOPE_MISSION)) return;
    this.protectedPending = true;
  }

  /**
   * Host tick: RULE_OK, or on a new break RULE_RESTART (with `line`, `lastRule`, `breaks` set; a protected restart sets
   * `line` and `lastRule` -1 only). After a break nothing fires until `resetSection`. No allocation.
   */
  update(now: number): number {
    this.now = now;
    if (this.tripped) return RULE_OK;
    if (this.protectedPending) {
      this.protectedPending = false;
      this.tripped = true;
      this.lastRule = -1;
      this.outcome = RULE_RESTART;
      this.line = PROTECTED_LINE;
      this.protectedBreaks++;
      return RULE_RESTART;
    }
    const rules = this.def.rules;
    const s = this.stats;
    const m0 = rateSection(s[SCOPE_MISSION], this.ratingRules);
    const m1 = rateSection(s[SCOPE_A], this.ratingRules);
    const m2 = rateSection(s[SCOPE_B], this.ratingRules);
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]!;
      if (this.isHeld(this.scope[i]!)) continue;
      let hit = this.hit[i] === 1;
      const mk = this.mark[i]!;
      if (mk !== 0) {
        const sc = this.scope[i]!;
        const marks = sc === SCOPE_A ? m1 : sc === SCOPE_B ? m2 : m0;
        if ((marks & mk) === 0) hit = true;
      }
      if (!hit) continue;
      this.broken[i]!++;
      this.breaks++;
      this.lastRule = i;
      this.outcome = RULE_RESTART;
      this.line = breakLine(r);
      this.tripped = true;
      return RULE_RESTART;
    }
    return RULE_OK;
  }

  /**
   * The section restarted (or a new section began). No `scope` or 'mission': every scope's stats back to zero and every
   * rule's event hits cleared (everyone went back). A team scope ('a' / 'b', its rule broke, M1): only that team's
   * stats and the hits of its rules; the mission's and the other team's keep counting (one player or the campaign:
   * everyone, as `MissionRunner.restore`). `hold` (default) starts a RULE_HOLD s hold from `now` on the scopes reset
   * (false: a section begin). The mission's break count and line stay; a protected restart waiting for `update` is
   * dropped.
   */
  resetSection(now: number, hold = true, scope?: MissionRule['scope']): void {
    const teams = this.def.mode === 'sector' && this.players > 1;
    const only = !teams ? -1 : scope === 'a' ? SCOPE_A : scope === 'b' ? SCOPE_B : -1;
    for (let k = 0; k < SCOPES; k++) {
      if (only >= 0 && k !== only) continue;
      resetSectionStats(this.stats[k as 0 | 1 | 2]);
      this.holdUntil[k] = hold ? now + RULE_HOLD : -Infinity;
    }
    for (let i = 0; i < this.hit.length; i++) if (only < 0 || this.scope[i] === only) this.hit[i] = 0;
    this.tripped = false;
    this.protectedPending = false;
    this.now = now;
  }

  /** Marks bitmask of a scope's live stats (Sector Ops' per-team marks on the rating card). */
  marks(scope: number): number {
    return rateSection(this.stats[scope === SCOPE_A ? SCOPE_A : scope === SCOPE_B ? SCOPE_B : SCOPE_MISSION], this.ratingRules);
  }

  /** How often rule `i` broke this mission. */
  brokenCount(i: number): number {
    return this.broken[i] ?? 0;
  }

  /** Rules never broken this mission in a scope, as bits by rule index (the wire's `rk`). */
  kept(scope: number): number {
    let b = 0;
    for (let i = 0; i < this.def.rules.length; i++) if (this.scope[i] === scope && this.broken[i] === 0) b |= 1 << i;
    return b;
  }

  /** Stat `field` (1 cam alarm, 2 alarm, 3 body found, 4 kill, 5 knock-out) up one on the mission and `teams`. */
  private each(teams: number, field: number): void {
    if (!this.isHeld(SCOPE_MISSION)) this.bump(this.stats[SCOPE_MISSION], field);
    if (teams & TEAM_A_BIT && !this.isHeld(SCOPE_A)) this.bump(this.stats[SCOPE_A], field);
    if (teams & TEAM_B_BIT && !this.isHeld(SCOPE_B)) this.bump(this.stats[SCOPE_B], field);
  }

  private bump(s: SectionStats, field: number): void {
    switch (field) {
      case 1:
        s.camAlarms++;
        break;
      case 2:
        s.alarms++;
        break;
      case 3:
        s.bodiesFound++;
        break;
      case 4:
        s.kills++;
        s.bodiesMade++;
        break;
      case 5:
        s.knockouts++;
        s.bodiesMade++;
        break;
    }
  }

  /**
   * Mark event rules of `kind` hit for the mission scope and the scopes of `teams` (`step` >= 0: that step's rules and
   * the step-less ones). True when any rule was hit.
   */
  private hitRules(kind: RuleKind, teams: number, step: number): boolean {
    let any = false;
    const rules = this.def.rules;
    for (let i = 0; i < rules.length; i++) {
      if (rules[i]!.kind !== kind) continue;
      const sc = this.scope[i]!;
      if (this.isHeld(sc)) continue;
      if (sc === SCOPE_A && (teams & TEAM_A_BIT) === 0) continue;
      if (sc === SCOPE_B && (teams & TEAM_B_BIT) === 0) continue;
      const rs = this.ruleStep[i]!;
      if (step >= 0 && rs >= 0 && rs !== step) continue;
      this.hit[i] = 1;
      any = true;
    }
    return any;
  }
}
