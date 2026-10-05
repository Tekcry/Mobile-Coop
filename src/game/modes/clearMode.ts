import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Blip } from '../../ui/hud/minimap';
import { killScore } from './waveLogic';
import { roomAt, roomCentre, type RoomDef, type SquadSlot } from '../../world/rooms';
import { RoomClearTracker } from '../roomClear';

/** Alive cap for squads (the enemy manager caps at 10; keep one spare). */
const SQUAD_CAP = 9;
/** Squads never pop in this close to a player. */
const SPAWN_MIN_DIST = 7;
const ROOM_SCORE = 300;

interface Pending {
  room: number;
  slot: SquadSlot;
}

/**
 * Room-by-room clearance of a tagged building. Each room's squad holds it (unaware until they see or
 * hear you); a room is clear once you have been inside and its squad is down. Squads beyond the alive
 * cap spawn later, nearest rooms first and never in sight range. Stingers on each room; the last one
 * ends the session. Three lives with a checkpoint at the last cleared room.
 */
export class ClearMode implements GameMode {
  readonly id = 'clear' as const;
  readonly rooms: RoomDef[];
  readonly tracker: RoomClearTracker;
  private pending: Pending[] = [];
  private checkT = 0;
  private current = -1;
  private inRoomT = 0;
  private endT = -1;
  lives = 3;
  private checkpoint: Vector3;

  constructor(private g: GameState) {
    this.rooms = g.world.layout.rooms ?? [];
    this.tracker = new RoomClearTracker(this.rooms.length);
    this.checkpoint = g.world.layout.playerSpawns[0]!.pos.clone();
  }

  start(): void {
    this.rooms.forEach((r, i) => {
      for (const slot of r.squad ?? []) {
        this.pending.push({ room: i, slot });
        this.tracker.expect(i, 1);
      }
    });
    this.fill();
    const name = this.g.world.map.name.toUpperCase();
    this.g.hud.banner(`CLEAR THE ${name}`, `${this.rooms.length} rooms · squads hold their ground`, 2800);
    this.g.letterbox(2.8);
    this.updateObjective();
  }

  /** Spawn pending squads, nearest rooms first, while under the cap and out of the player's face. */
  private fill(): void {
    const em = this.g.enemyMgr;
    if (!em || !this.pending.length) return;
    const players = this.g.playerRefs();
    const dist = (p: Pending): number => {
      let d = Infinity;
      for (const pl of players) d = Math.min(d, Math.hypot(pl.feet.x - p.slot.x, pl.feet.z - p.slot.z));
      return d;
    };
    this.pending.sort((a, b) => dist(a) - dist(b));
    for (let i = 0; i < this.pending.length && em.alive < SQUAD_CAP; ) {
      const p = this.pending[i]!;
      if (dist(p) < SPAWN_MIN_DIST || p.room === this.current) {
        i++;
        continue;
      }
      const e = em.spawn(p.slot.kind, new Vector3(p.slot.x, 0, p.slot.z), false, p.slot.yaw);
      if (!e) break;
      e.hold = this.rooms[p.room]!;
      this.tracker.assign(e.id, p.room);
      this.pending.splice(i, 1);
    }
  }

  private updateObjective(): void {
    const t = this.tracker;
    this.g.hud.setObjective(t.done ? 'Building clear' : `Clear every room (${t.cleared}/${t.total})`);
  }

  private onCleared(room: number, byKill: boolean): void {
    const r = this.rooms[room]!;
    const t = this.tracker;
    this.g.stats.objectives = t.cleared;
    this.g.stats.score += ROOM_SCORE;
    const [cx, cz] = roomCentre(r);
    this.checkpoint = this.g.player.position.clone();
    if (Math.hypot(cx - this.checkpoint.x, cz - this.checkpoint.z) > 30) this.checkpoint.set(cx, 0, cz);
    this.g.hud.feedItem(`${r.name} clear +${ROOM_SCORE}`, 'xp');
    this.g.events.emit('roomCleared', { id: r.id, n: t.cleared, total: t.total });
    if (t.done) {
      this.g.hud.banner('BUILDING CLEAR', `Rooms cleared ${t.cleared}/${t.total}`, 2600);
      this.g.slowBeat(0.4, 0.5);
      this.g.letterbox(2.6);
      this.endT = 2.6;
    } else {
      this.g.hud.banner(`${r.name.toUpperCase()} CLEAR`, `Rooms cleared ${t.cleared}/${t.total}`, 1700);
      if (byKill) this.g.slowBeat();
    }
    this.updateObjective();
  }

  fixedUpdate(dt: number): void {
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.endT = 0;
        this.g.endSession(true, 'All rooms cleared');
      }
      return;
    }
    if (this.endT === 0) return;
    this.checkT -= dt;
    this.inRoomT += dt;
    if (this.checkT > 0) return;
    this.checkT = 0.25;
    const p = this.g.player.position;
    const ri = roomAt(this.rooms, p.x, p.z);
    if (ri !== this.current) {
      this.current = ri;
      this.inRoomT = 0;
    }
    this.fill();
    // a squad member that cannot spawn because you are already inside its room is dropped once the
    // rest of the room is down (it would otherwise block the room forever)
    if (ri >= 0 && this.inRoomT > 2 && this.tracker.hostiles(ri) > 0) {
      const left = this.pending.filter((q) => q.room === ri).length;
      if (left && left === this.tracker.hostiles(ri)) {
        this.pending = this.pending.filter((q) => q.room !== ri);
        const d = this.tracker.drop(ri);
        if (d >= 0) this.onCleared(d, true);
      }
    }
    const c = this.tracker.visit(ri);
    if (c >= 0) this.onCleared(c, false);
  }

  frameUpdate(): void {
    const t = this.tracker;
    const parts = [
      `<span>Rooms cleared <b>${t.cleared}/${t.total}</b></span>`,
      `<span>Lives <b>${this.lives}</b></span>`,
      `<span>Score <b>${this.g.stats.score}</b></span>`,
    ];
    this.g.hud.setModeInfo(parts.join(''));
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2);
    const c = this.tracker.killed(e.id);
    if (c >= 0) this.onCleared(c, true);
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive() || this.endT >= 0) return;
    this.lives--;
    if (this.lives <= 0) {
      this.endT = 0;
      this.g.endSession(false, `Rooms cleared ${this.tracker.cleared}/${this.tracker.total}`);
      return;
    }
    this.g.hud.banner('DOWN', `${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left`, 2500);
    this.g.scheduleRespawn(this.checkpoint, 3);
  }

  blips(): Blip[] {
    return [];
  }

  dispose(): void {
    this.pending = [];
  }
}
