import { Vector3 } from '../../core/babylon';
import { flags } from '../../core/flags';
import type { GameState } from '../gameState';
import type { SlotPoint } from '../spawnSlots';
import type { GameMode } from './gameMode';

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

  constructor(private readonly g: GameState) {}

  start(): void {
    const em = this.g.enemyMgr!;
    // stealth rules as Clear / Mission / Course; the shipped hearing rule (course, sector)
    em.stealth = true;
    em.coordinated = true;
    this.g.hud.setObjective('');
    if (flags.guards || this.g.opts.benchmark) this.populate();
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
        e.hold = room;
        em.joinSquad(e, i);
        if (slot.route) e.setPatrol({ points: slot.route, wait: slot.wait });
        n++;
      }
    }
    return n;
  }

  fixedUpdate(dt: number): void {
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
  }
}
