import { Vector3 } from '../../core/babylon';
import { flags } from '../../core/flags';
import type { GameState } from '../gameState';
import type { SlotPoint } from '../spawnSlots';
import type { GameMode } from './gameMode';
import type { Enemy, PlayerRef } from '../../ai/enemy';
import type { SquadSlot } from '../../world/rooms';
import { hyp2 } from '../../core/mathx';
import { PRACTICE_RESPAWN_S, practiceDownTime, practiceDue } from './practiceGuards';

/** Alive cap for `populate` (the enemy manager caps at 12; the parked modes keep a few spare). */
const POPULATE_CAP = 9;
/** Seconds from the team wipe to the revive. */
const RESPAWN_S = 3;

/**
 * (G2a) The Test Chamber's test mode: a real `GameMode` with no objective, no score and no win, so a test map gets the
 * guards' systems (nav, enemy manager, interactables, crates, `StealthSystems`) and the revive rules of a match, and
 * `g.mode` is set (revive points, `lives`). It queues no guards: they come from a test (`enemyMgr.clear()` then `spawn`),
 * from `populate()` (the map's room squads) or from `?guards=1`. Practice: nothing is saved (`practiceMode`). Everyone
 * down: back at the spawn after `RESPAWN_S`; `lives` counts team wipes to a DEFEAT (none by default).
 */
export class TestMode implements GameMode {
  readonly id = 'test' as const;
  /** Kept for the suites that empty it (`g.mode.pending.length = 0`); this mode queues nothing. */
  readonly pending: unknown[] = [];
  /** Team wipes left before DEFEAT; Infinity: no lose flow (e2e-coop sets 1 to reach the results). */
  lives = Infinity;
  /** false (default): an alarm brings no one (as Hunter's queue the suites emptied); true: StealthSystems' stock squad. */
  reinforce = false;
  /** Alarms raised (tests). */
  alarms = 0;
  private respawnT = -1;
  /** (G2c) The practice guards: a spot (the layout's slot), his guard now (null: none yet) and how long he has been down. */
  private readonly practice: { slot: SquadSlot; e: Enemy | null; down: number }[] = [];
  private readonly refs: PlayerRef[] = [];

  constructor(private readonly g: GameState) {}

  start(): void {
    const em = this.g.enemyMgr!;
    // stealth rules as Clear / Mission / Course; the shipped hearing rule (course, sector)
    em.stealth = true;
    em.coordinated = true;
    this.g.hud.setObjective('');
    if (flags.guards || this.g.opts.benchmark) this.populate();
    if (this.g.opts.practice) this.startPractice();
  }

  /**
   * (G2c, N17) Place the layout's passive practice guards (`MapLayout.practice`): calm, standing their posts, seeing and
   * hearing nothing. A guard taken down comes back at his spot (`fixedUpdate`). Returns how many stand now.
   */
  startPractice(): number {
    this.practice.length = 0;
    for (const slot of this.g.world.layout.practice ?? []) this.practice.push({ slot, e: null, down: 0 });
    let n = 0;
    for (const p of this.practice) if (this.placePractice(p)) n++;
    return n;
  }

  /** One practice guard on his spot (false: the cap or no walkable cell near it; tried again later). */
  private placePractice(p: { slot: SquadSlot; e: Enemy | null; down: number }): boolean {
    const em = this.g.enemyMgr;
    if (!em) return false;
    const s = p.slot;
    const e = em.spawn(s.kind, new Vector3(s.x, s.y ?? Number.NaN, s.z), false, s.yaw);
    if (!e) {
      p.down = 0;
      return false;
    }
    e.passive = true;
    em.placeSlot(e, s);
    p.e = e;
    p.down = 0;
    return true;
  }

  /** The practice guards' respawn rule (`practiceGuards.ts`): down 10 s and nobody within 2.5 m of his spot. */
  private practiceStep(dt: number): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    for (let i = 0; i < this.practice.length; i++) {
      const p = this.practice[i]!;
      const e = p.e;
      p.down = practiceDownTime(p.down, dt, !e || !e.alive);
      if (p.down < PRACTICE_RESPAWN_S) continue;
      // a body being carried is not ours to remove
      let carried = false;
      for (let k = 0; k < em.bodies.length; k++) if (e && em.bodies[k]!.enemyId === e.id && em.bodies[k]!.carried) carried = true;
      if (carried) continue;
      let near = Infinity;
      const refs = this.g.playerRefsInto(this.refs);
      for (let k = 0; k < refs.length; k++) {
        const f = refs[k]!.feet;
        const d = hyp2(f.x - p.slot.x, f.z - p.slot.z);
        if (d < near) near = d;
      }
      if (!practiceDue(p.down, near)) continue;
      if (e) em.despawn(e);
      p.e = null;
      this.placePractice(p);
    }
  }

  /**
   * Spawn the map's room squads (`layout.rooms[i].squad`) in room order, calm, holding their room, routes set, while at
   * most `max` are alive: `ClearMode.fill` once, without the distance rule. Returns how many spawned.
   */
  populate(max = POPULATE_CAP): number {
    const em = this.g.enemyMgr;
    if (!em) return 0;
    const rooms = this.g.world.layout.rooms ?? [];
    let n = 0;
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i]!;
      for (const slot of room.squad ?? []) {
        if (em.alive >= max) return n;
        const e = em.spawn(slot.kind, new Vector3(slot.x, slot.y ?? Number.NaN, slot.z), false, slot.yaw);
        if (!e) return n;
        // (G2c) a passive slot (a training guard): sees and hears nothing, as in the course
        if (slot.passive) e.passive = true;
        e.hold = room;
        em.joinSquad(e, i);
        if (slot.route) e.setPatrol({ points: slot.route, wait: slot.wait });
        n++;
      }
    }
    return n;
  }

  fixedUpdate(dt: number): void {
    if (this.practice.length > 0) this.practiceStep(dt);
    if (this.respawnT > 0 && (this.respawnT -= dt) <= 0) {
      this.respawnT = -1;
      this.g.reviveAll();
    }
  }

  frameUpdate(): void {}

  onEnemyKilled(): void {}

  /** The alarm: true while nobody is sent (the stock squad is skipped); `reinforce` brings it. */
  onAlarm(): boolean {
    this.alarms++;
    return !this.reinforce;
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive() || this.respawnT > 0) return;
    if (--this.lives <= 0) {
      this.g.endSession(false, 'Test over');
      return;
    }
    this.g.hud.banner('DOWN', 'Respawning…', 2500);
    this.respawnT = RESPAWN_S;
  }

  /** Co-op, past the revive window: back at once (there is no checkpoint here). */
  onPlayerOut(): void {
    this.g.reviveAll();
  }

  /** Co-op joins and respawns: the layout's first two player spawns (slot 0 the host's). */
  checkpointSpawns(): SlotPoint[] {
    return this.g.world.layout.playerSpawns.slice(0, 2).map((p) => ({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw }));
  }

  dispose(): void {
    this.respawnT = -1;
    this.practice.length = 0;
  }
}
