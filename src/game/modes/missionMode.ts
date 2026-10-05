import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Interactable } from '../interactables';
import type { Blip } from '../../ui/hud/minimap';
import { killScore } from './waveLogic';

type Step = 'terminals' | 'cache' | 'extract' | 'done';

const EXTRACT_RADIUS = 3;
const EXTRACT_TIME = 18;

/** Short scripted mission: hack two terminals, grab the intel, hold the extraction zone. */
export class MissionMode implements GameMode {
  readonly id = 'mission' as const;
  private step: Step = 'terminals';
  private terminals: Interactable[] = [];
  private cache: Interactable | null = null;
  private extract: Interactable | null = null;
  private reinforceT = 0;
  private extractT = 0;
  lives = 3;
  private checkpoint: Vector3;

  constructor(private g: GameState) {
    this.checkpoint = g.world.layout.playerSpawns[0]!.pos.clone();
  }

  start(): void {
    const ints = this.g.interactables!;
    for (const o of this.g.world.layout.objectives) {
      const label = o.kind === 'terminal' ? 'Hack terminal' : o.kind === 'cache' ? 'Take intel' : 'Extraction';
      const it = ints.add(o.id, o.kind, o.pos, label, o.kind === 'terminal' ? 3 : 0);
      if (o.kind === 'terminal') this.terminals.push(it);
      else if (o.kind === 'cache') this.cache = it;
      else this.extract = it;
    }
    for (const t of this.terminals) ints.setEnabled(t, true);
    // pre-placed squads, unaware until they see or hear you
    const kinds: EnemyKind[] = ['grunt', 'grunt', 'runner'];
    this.g.world.layout.enemySpawns.forEach((s, i) => {
      const n = i % 3 === 0 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const kind = i === this.g.world.layout.enemySpawns.length - 1 && k === 0 ? 'heavy' : kinds[k % kinds.length]!;
        this.g.enemyMgr!.spawn(kind, s.add(new Vector3(k * 1.3 - 1, 0, (k % 2) * 1.2)), false, Math.random() * 6);
      }
    });
    this.g.hud.banner('OPERATION BLACKOUT', 'Hack both terminals', 2800);
    this.updateObjective();
  }

  private updateObjective(): void {
    const left = this.terminals.filter((t) => !t.done).length;
    const text =
      this.step === 'terminals'
        ? `Hack the terminals (${2 - left}/2)`
        : this.step === 'cache'
          ? 'Grab the intel from the cache'
          : this.step === 'extract'
            ? 'Reach extraction and hold'
            : 'Mission complete';
    this.g.hud.setObjective(text);
  }

  /** Called by GameState when the player completes an interaction. */
  onInteract(it: Interactable): void {
    it.done = true;
    this.g.interactables!.setEnabled(it, false);
    this.g.stats.objectives++;
    this.g.stats.score += 500;
    this.checkpoint = it.pos.clone();
    this.g.hud.feedItem('Objective +500', 'xp');
    this.g.events.emit('objective', { id: it.id });
    if (it.kind === 'terminal') {
      this.g.enemyMgr!.noise(it.pos, 35);
      if (this.terminals.every((t) => t.done)) {
        this.step = 'cache';
        if (this.cache) this.g.interactables!.setEnabled(this.cache, true);
        this.g.hud.banner('TERMINALS HACKED', 'Find the intel cache', 2400);
      }
    } else if (it.kind === 'cache') {
      this.step = 'extract';
      if (this.extract) this.g.interactables!.setEnabled(this.extract, true);
      this.g.hud.banner('ALARM', 'Get to the extraction point', 2400);
      this.g.events.emit('alarm', {});
      this.reinforceT = 2;
    }
    this.updateObjective();
  }

  private reinforce(count: number, maxAlive: number): void {
    const em = this.g.enemyMgr!;
    const spots = this.g.world.layout.enemySpawns;
    const p = this.g.player.position;
    for (let i = 0; i < count && em.alive < maxAlive; i++) {
      const far = spots.filter((s) => Vector3.Distance(s, p) > 16);
      const s = far[Math.floor(Math.random() * far.length)] ?? spots[0];
      if (!s) return;
      const r = Math.random();
      em.spawn(r < 0.15 ? 'heavy' : r < 0.5 ? 'runner' : 'grunt', s, true);
    }
  }

  fixedUpdate(dt: number): void {
    if (this.step === 'done') return;
    // pressure while hacking or after the alarm
    const hacking = this.terminals.some((t) => t.progress > 0 && !t.done);
    if (hacking || this.step === 'extract') {
      this.reinforceT -= dt;
      if (this.reinforceT <= 0) {
        this.reinforceT = this.step === 'extract' ? 7 : 12;
        this.reinforce(this.step === 'extract' ? 2 : 1, this.step === 'extract' ? 7 : 5);
      }
    }
    if (this.step === 'extract' && this.extract) {
      const inZone = this.g.playerRefs().some((pl) => pl.target.alive && Math.hypot(pl.feet.x - this.extract!.pos.x, pl.feet.z - this.extract!.pos.z) < EXTRACT_RADIUS);
      if (inZone) this.extractT += dt;
      if (this.extractT >= EXTRACT_TIME) {
        this.step = 'done';
        this.g.stats.objectives++;
        this.g.stats.score += 1500;
        this.g.endSession(true, 'Extraction successful');
      }
    }
  }

  frameUpdate(): void {
    const parts = [`<span>Lives <b>${this.lives}</b></span>`, `<span>Score <b>${this.g.stats.score}</b></span>`];
    if (this.step === 'extract') parts.unshift(`<span>Extract <b>${Math.floor((this.extractT / EXTRACT_TIME) * 100)}%</b></span>`);
    this.g.hud.setModeInfo(parts.join(''));
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2);
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive()) return;
    this.lives--;
    if (this.lives <= 0) {
      this.g.endSession(false, 'Mission failed');
      return;
    }
    this.g.hud.banner('DOWN', `${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left`, 2500);
    this.g.scheduleRespawn(this.checkpoint, 3);
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const it of this.g.interactables?.items ?? []) if (it.enabled && !it.done) out.push({ x: it.pos.x, z: it.pos.z, kind: 'objective' });
    return out;
  }

  dispose(): void {}
}
