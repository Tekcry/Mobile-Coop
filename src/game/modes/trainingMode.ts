import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Blip } from '../../ui/hud/minimap';
import { emptyTrainingStatus, TRAINING_STEPS, TrainingCourse, type TrainingStatus } from '../training';
import { hyp2 } from '../../core/mathx';

/** A step not done in this long is skipped (a stuck player is never trapped). */
const STEP_SKIP = 90;

/**
 * The training course on Proving Grounds (Play > Training): one verb at a time with a marker on the target and the
 * input for the device in use - move, sneak, cover, vault, ladder, goggles, a takedown on a passive guard, Mark &
 * Execute on two more, a gadget. The operator cannot be hurt; guards see and hear nothing. Optional and replayable.
 */
export class TrainingMode implements GameMode {
  readonly id = 'training' as const;
  readonly course = new TrainingCourse();
  readonly status: TrainingStatus = emptyTrainingStatus();
  private stepStart = new Vector3();
  private stepT = 0;
  private target: Vector3 | null = null;
  private targets: Partial<Record<string, Vector3>> = {};
  private guards: Enemy[] = [];
  private offs: (() => void)[] = [];
  private ended = false;

  constructor(private g: GameState) {}

  start(): void {
    const g = this.g;
    g.target.damageMul = 0;
    const sp = g.world.layout.playerSpawns[0]!;
    const s = sp.pos;
    // targets from the level: ahead of the spawn, the nearest low cover, the nearest ladder, enemy spawns
    this.targets.move = new Vector3(s.x + Math.sin(sp.yaw) * 6, s.y, s.z + Math.cos(sp.yaw) * 6);
    let best = Infinity;
    for (const c of g.world.level.coverSegments) {
      if (!c.low || c.len < 1) continue;
      const mx = (c.ax + c.bx) / 2;
      const mz = (c.az + c.bz) / 2;
      const d = hyp2(mx - s.x, mz - s.z);
      if (d < best && d > 3) {
        best = d;
        this.targets.cover = new Vector3(mx + c.nx * 0.9, c.y, mz + c.nz * 0.9);
      }
    }
    best = Infinity;
    for (const l of g.world.level.anchors.ladders) {
      const d = hyp2(l.base.x - s.x, l.base.z - s.z);
      if (d < best) {
        best = d;
        this.targets.ladder = new Vector3(l.base.x, l.base.y, l.base.z);
      }
    }
    const ev = g.events;
    this.offs.push(
      ev.on('takedown', (e) => {
        if (e.phase === 'done') this.status.takedowns++;
      }),
      ev.on('execute', (e) => {
        if (e.phase === 'done') this.status.executes++;
      }),
      ev.on('gadget', (e) => {
        if (e.phase === 'throw' || e.phase === 'place') this.status.thrown++;
      }),
    );
    this.stepStart.copyFrom(g.player.position);
    this.enter();
  }

  /** Spawn a passive guard near `near`, facing away from the operator. */
  private guard(near: Vector3, i: number): Enemy | null {
    const g = this.g;
    const spawns = [...g.world.layout.enemySpawns].sort((a, b) => hyp2(a.x - near.x, a.z - near.z) - hyp2(b.x - near.x, b.z - near.z));
    const at = spawns[i] ?? near;
    const p = g.player.position;
    const yaw = Math.atan2(at.x - p.x, at.z - p.z);
    const e = g.enemyMgr?.spawn('grunt', at.clone(), false, yaw) ?? null;
    if (e) {
      e.passive = true;
      this.guards.push(e);
    }
    return e;
  }

  /** A step begins: its target and anything it needs. */
  private enter(): void {
    const st = this.course.step;
    this.stepT = 0;
    this.stepStart.copyFrom(this.g.player.position);
    this.status.vaulted = false;
    if (!st) return;
    const t = this.targets;
    const p = this.g.player.position;
    switch (st.id) {
      case 'move':
        this.target = t.move ?? null;
        break;
      case 'cover':
      case 'vault':
        this.target = t.cover ?? null;
        break;
      case 'ladder':
        this.target = t.ladder ?? null;
        break;
      case 'takedown': {
        const e = this.guard(p, 0);
        this.target = e ? e.pos : null;
        break;
      }
      case 'mark': {
        const a = this.guard(p, 1);
        this.guard(p, 2);
        this.target = a ? a.pos : null;
        break;
      }
      default:
        this.target = null;
    }
    this.updateHud();
  }

  private updateHud(): void {
    const st = this.course.step;
    const hud = this.g.hud;
    if (!st) return;
    const mode = this.g.app.input.mode;
    const hint = mode === 'touch' ? st.hint.touch : mode === 'kbm' ? st.hint.kbm : st.hint.pad;
    hud.setObjective(`${st.text} - ${hint}`);
    hud.setModeInfo(`<span>Training <b>${this.course.index + 1}</b> / <b>${TRAINING_STEPS.length}</b></span>`);
  }

  private hintMode = '';

  fixedUpdate(dt: number): void {
    if (this.ended) return;
    const g = this.g;
    const s = this.status;
    const c = g.player.controller;
    const p = g.player.position;
    s.moved = hyp2(p.x - this.stepStart.x, p.z - this.stepStart.z);
    s.crouchedMoving = c.crouched && c.speed > 0.3 && s.moved > 1;
    s.inCover = g.cover.state !== 'none';
    const k = g.traversal.kind;
    if (k === 'vault' || k === 'mantle' || k === 'step' || g.cover.state === 'vault') s.vaulted = true;
    s.onLadder = g.traversal.attached && g.traversal.attachCtl.m.kind === 'ladder';
    s.goggles = g.vision.mode !== 'off';
    let marked = 0;
    for (const e of this.guards) if (e.alive && g.marks.has(e.id)) marked++;
    s.marks = marked;
    // the hint follows the device in use
    if (g.app.input.mode !== this.hintMode) {
      this.hintMode = g.app.input.mode;
      this.updateHud();
    }
    this.stepT += dt;
    const done = this.course.update(s);
    if (done) {
      g.hud.feedItem(`${done.text}: done`, 'kill');
      g.app.sfx.hitMarker('hit');
      this.enter();
    } else if (this.stepT > STEP_SKIP) {
      g.hud.feedItem('Step skipped');
      this.course.skip(s);
      this.enter();
    }
    if (this.course.done) this.finish();
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    const g = this.g;
    g.hud.setObjective('');
    g.hud.banner('TRAINING COMPLETE', 'Every verb, done', 2500);
    g.letterbox(2.5);
    setTimeout(() => g.endSession(true, 'Training complete'), 2600);
  }

  frameUpdate(dt: number): void {
    void dt;
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    void e;
    void h;
  }

  onPlayerDeath(): void {
    this.g.scheduleRespawn(this.g.world.layout.playerSpawns[0]!.pos, 1);
  }

  blips(): Blip[] {
    const t = this.target;
    return t ? [{ x: t.x, z: t.z, kind: 'objective' }] : [];
  }

  dispose(): void {
    for (const o of this.offs) o();
    this.offs = [];
  }
}
