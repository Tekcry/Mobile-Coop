import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { EnemyKind } from '../../ai/enemyDefs';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import { killScore, waveClearBonus, waveComposition, waveMaxAlive } from './waveLogic';
import type { Blip } from '../../ui/hud/minimap';

/** Endless waves of escalating enemies. One life (coop: last player standing). */
export class WaveMode implements GameMode {
  readonly id = 'wave' as const;
  wave = 0;
  private phase: 'intermission' | 'fighting' | 'over' = 'intermission';
  private t = 6;
  private queue: EnemyKind[] = [];
  private spawnT = 0;

  constructor(private g: GameState) {}

  start(): void {
    this.g.hud.banner('WAVE SURVIVAL', 'Get ready', 2500);
    this.g.hud.setObjective('Survive as many waves as you can');
  }

  private startWave(): void {
    this.wave++;
    this.g.stats.waves = this.wave - 1;
    this.queue = waveComposition(this.wave);
    this.phase = 'fighting';
    this.spawnT = 0.5;
    this.g.hud.banner(`WAVE ${this.wave}`, `${this.queue.length} hostiles`, 2000);
    this.g.events.emit('wave', { n: this.wave });
  }

  private pickSpawn(): Vector3 | null {
    const spots = this.g.world.layout.enemySpawns;
    const players = this.g.playerRefs();
    const cam = this.g.player.cam;
    const scored = spots
      .map((s) => {
        const dMin = Math.min(...players.map((p) => Vector3.Distance(p.feet, s)));
        const to = s.subtract(cam.camera.position).normalize();
        const inView = Vector3.Dot(to, cam.forward) > 0.5;
        return { s, score: (dMin < 14 ? 1000 : 0) + (inView ? 50 : 0) + Math.random() * 20 - Math.min(dMin, 40) * 0.2 };
      })
      .sort((a, b) => a.score - b.score);
    const best = scored[0];
    if (!best || best.score >= 1000) return scored[0]?.s ?? null;
    return best.s.add(new Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
  }

  fixedUpdate(dt: number): void {
    const em = this.g.enemyMgr!;
    if (this.phase === 'over') return;
    if (this.phase === 'intermission') {
      this.t -= dt;
      if (this.t <= 0) this.startWave();
      return;
    }
    this.spawnT -= dt;
    if (this.queue.length && this.spawnT <= 0 && em.alive < waveMaxAlive(this.wave)) {
      const pos = this.pickSpawn();
      if (pos && em.spawn(this.queue[0]!, pos, true)) this.queue.shift();
      this.spawnT = 1.1;
    }
    if (!this.queue.length && em.alive === 0) {
      const bonus = waveClearBonus(this.wave);
      this.g.stats.score += bonus;
      this.g.stats.waves = this.wave;
      this.g.hud.banner(`WAVE ${this.wave} CLEARED`, `+${bonus}`, 2500);
      this.g.hud.feedItem(`Wave bonus +${bonus}`, 'xp');
      this.g.events.emit('waveCleared', { n: this.wave });
      this.g.pickups?.respawnAll();
      this.g.reviveAll();
      this.g.weapons.addAmmo(0.35);
      this.phase = 'intermission';
      this.t = 10;
    }
  }

  frameUpdate(): void {
    const em = this.g.enemyMgr!;
    const left = this.queue.length + em.alive;
    const status =
      this.phase === 'intermission'
        ? `<span>Next wave in <b>${Math.ceil(this.t)}</b></span>`
        : `<span>Wave <b>${this.wave}</b></span><span>Hostiles <b>${left}</b></span>`;
    this.g.hud.setModeInfo(`${status}<span>Score <b>${this.g.stats.score}</b></span>`);
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    const s = killScore(e.def.kind, h.part === 'head', Math.max(1, this.wave));
    this.g.stats.score += s;
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive()) return;
    this.phase = 'over';
    this.g.stats.waves = Math.max(0, this.wave - 1);
    this.g.endSession(false, `You survived ${Math.max(0, this.wave - 1)} wave${this.wave - 1 === 1 ? '' : 's'}`);
  }

  blips(): Blip[] {
    return [];
  }

  dispose(): void {}
}
