import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Interactable } from '../interactables';
import type { Blip } from '../../ui/hud/minimap';
import type { SquadSlot } from '../../world/rooms';
import { hyp2 } from '../../core/mathx';
import { CtDevices } from '../ctDevices';
import { SECTOR, SectorRun, alarmStep, inExit, sectorResult, type SectorDef } from '../sectors';
import { killScore } from './score';

/** Squads never pop in this close to a player (Hunter's rule). */
const SPAWN_MIN_DIST = 7;
const KINDS = ['grunt', 'heavy'] as const;

interface Pending {
  slot: SquadSlot;
  alerted: boolean;
}

/** Co-op: the devices' state goes to the client at least this often (s), and at once on a change. */
const SEC_SEND = 0.5;

/**
 * Sector Ops (feature/sector-ops): the map's sectors in order. A sector's guards spawn when it starts (unaware, out of
 * sight); its objective (hack, grab or download) opens its exit zone; every living player in the exit starts the next
 * sector, and the last exit ends the run with the result line (time, kills, times spotted, Ghost). Being spotted raises
 * the alarm stage, and each stage sends guards in, hunting (PLAN A3). The cameras and lasers are the CT devices (host
 * authority, the pistol jammer blinds them).
 */
export class SectorMode implements GameMode {
  readonly id = 'sector' as const;
  readonly run: SectorRun;
  ct: CtDevices | null = null;
  /** Alarm stage 0..SECTOR.alarmMax. */
  stage = 0;
  /** Camera alarms (part of "times spotted"). */
  camAlarms = 0;
  /** Reinforcements sent (tests). */
  reinforced = 0;
  lives: number = SECTOR.lives;
  private its: Interactable[] = [];
  private pending: Pending[] = [];
  private fillT = 0;
  private endT = -1;
  private exitT = 0;
  /** Run time (s) for the result. */
  private t = 0;
  private secT = 0;
  private readonly checkpoint = new Vector3();
  private readonly tmp = new Vector3();

  constructor(private g: GameState) {
    this.run = new SectorRun(g.world.map.sectors ?? []);
  }

  start(): void {
    const g = this.g;
    g.enemyMgr!.stealth = true;
    this.ct = new CtDevices(g, 'host', {
      say: (t) => g.hud.barks.say('lantern', t, true),
      record: () => this.cameraAlarm(),
      dirty: () => undefined,
    });
    g.ctDev = this.ct;
    (window as unknown as { __sector?: SectorMode }).__sector = this;
    const s = this.run.current;
    if (s) {
      const at = new Vector3(s.start.x, s.start.y, s.start.z);
      g.player.controller.teleport(at, s.start.yaw);
      g.player.cam.yaw = s.start.yaw;
    }
    g.letterbox(2.8);
    this.startSector();
  }

  /** The current sector begins: its guards, its objective, the banner. */
  private startSector(): void {
    const g = this.g;
    const s = this.run.current;
    if (!s) return;
    this.checkpoint.set(s.start.x, s.start.y, s.start.z);
    for (const slot of s.guards) this.pending.push({ slot, alerted: false });
    this.fill();
    g.hud.banner(`SECTOR ${this.run.index + 1}  ·  ${s.name.toUpperCase()}`, s.objective.label, 2600);
    this.setup(s);
  }

  /** Put down the current step's interactable: the objective, or the exit marker once it is done. */
  private setup(s: SectorDef): void {
    const g = this.g;
    const ints = g.interactables!;
    for (const it of this.its) ints.remove(it);
    this.its.length = 0;
    if (this.run.phase === 'exit') {
      const [x0, z0, x1, z1] = s.exit.box;
      const it = ints.add(`${s.id}-exit`, 'extract', new Vector3((x0 + x1) / 2, s.exit.floorY ?? 0, (z0 + z1) / 2), s.exit.label, 0);
      it.onUse = () => undefined;
      ints.setEnabled(it, true);
      this.its.push(it);
      this.exitT = 0;
      g.hud.setObjective(s.exit.label);
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

  /** Every living player in the exit for a moment: the next sector, or the end. */
  private exitStep(dt: number, s: SectorDef): void {
    const refs = this.g.playerRefs();
    let alive = 0;
    let inside = 0;
    for (const r of refs) {
      if (!r.target.alive) continue;
      alive++;
      if (inExit(s, r.feet.x, r.feet.y, r.feet.z)) inside++;
    }
    this.exitT = alive > 0 && inside === alive ? this.exitT + dt : 0;
    if (this.exitT < 0.5) return;
    const next = this.run.exitReached();
    if (next === 'next') {
      this.g.events.emit('objective', { id: `${s.id}-exit` });
      this.startSector();
    } else if (next === 'done') this.complete();
  }

  /** Spawn pending guards under the live cap, out of every player's face. */
  private fill(): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const refs = this.g.playerRefs();
    for (let i = 0; i < this.pending.length; ) {
      const p = this.pending[i]!;
      let d = Infinity;
      for (const r of refs) d = Math.min(d, hyp2(r.feet.x - p.slot.x, r.feet.z - p.slot.z));
      if (d < SPAWN_MIN_DIST && !p.alerted) {
        i++;
        continue;
      }
      this.tmp.set(p.slot.x, p.slot.y ?? Number.NaN, p.slot.z);
      const e = em.spawn(p.slot.kind, this.tmp, p.alerted, p.slot.yaw);
      if (!e) break;
      if (p.slot.route) e.setPatrol({ points: p.slot.route, wait: p.slot.wait });
      this.pending.splice(i, 1);
    }
  }

  /** A guard's alarm: up one stage, and guards come in hunting (A3). The mode brings its own reinforcements. */
  onAlarm(): boolean {
    const a = alarmStep(this.stage);
    this.raise(a.stage, a.send);
    return true;
  }

  /** A camera has someone at full awareness: `CtDevices` already raised its stage and showed the banner. */
  private cameraAlarm(): void {
    this.camAlarms++;
    const ct = this.ct;
    const to = ct ? Math.max(ct.alarm, this.stage) : this.stage;
    this.raise(to, to > this.stage ? SECTOR.perStage : 0, false);
  }

  private raise(stage: number, send: number, banner = true): void {
    const g = this.g;
    const up = stage > this.stage;
    this.stage = stage;
    if (this.ct) this.ct.alarm = stage;
    if (up && banner) g.hud.banner(`ALARM STAGE ${stage}`, send ? 'Reinforcements coming' : '', 2200);
    const s = this.run.current;
    if (!s || !send) return;
    for (let i = 0; i < send; i++) {
      this.pending.push({ slot: { kind: KINDS[i % KINDS.length]!, x: s.reinforce[0] + (i - 0.5) * 1.3, z: s.reinforce[1], yaw: 0 }, alerted: true });
    }
    this.reinforced += send;
    this.fill();
  }

  /** The last exit: the stinger, then the result line. */
  private complete(): void {
    if (this.endT >= 0) return;
    const g = this.g;
    for (const it of this.its) g.interactables?.remove(it);
    this.its.length = 0;
    g.hud.setObjective('');
    g.events.emit('operationComplete', {});
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
        g.net?.sector?.(ct.wire());
      }
    }
    this.fillT -= dt;
    if (this.fillT <= 0) {
      this.fillT = 0.5;
      this.fill();
    }
    const s = this.run.current;
    if (!s) return;
    if (this.run.phase === 'objective' && this.run.downloading) {
      const o = s.objective;
      const near = g.playerRefs().some((r) => r.target.alive && hyp2(r.feet.x - o.x, r.feet.z - o.z) < SECTOR.downloadRange && Math.abs(r.feet.y - o.y) < 2);
      if (near && this.run.download(dt)) this.objectiveDone(s);
      else if (near) g.hud.setObjective(`${o.label} ${Math.floor((this.run.progress / SECTOR.downloadTime) * 100)}%`);
    } else if (this.run.phase === 'exit') this.exitStep(dt, s);
  }

  frameUpdate(): void {
    const n = this.run.defs.length;
    const i = Math.min(n, this.run.index + 1);
    this.g.hud.setModeInfo(`<span>Sector <b>${i}/${n}</b></span>${this.stage ? `<span>Alarm <b>${this.stage}</b></span>` : ''}`);
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2);
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive() || this.endT >= 0) return;
    this.lives--;
    if (this.lives <= 0) {
      this.endT = 0;
      this.g.endSession(false, `Operation failed in sector ${this.run.index + 1}`);
      return;
    }
    this.g.hud.banner('DOWN', `${this.lives} left`, 2500);
    this.g.scheduleRespawn(this.checkpoint, 3);
  }

  /** Co-op host: the client's held jammer target. */
  onRemoteJam(_id: string, tgt: string): void {
    this.ct?.onRemoteJam(tgt);
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const it of this.its) if (it.enabled && !it.done) out.push({ x: it.pos.x, z: it.pos.z, kind: 'objective' });
    return out;
  }

  /** Test view (`window.__sector.debug()`). */
  debug(): Record<string, unknown> {
    const s = this.run.current;
    return { index: this.run.index, phase: this.run.phase, id: s?.id ?? null, stage: this.stage, reinforced: this.reinforced, camAlarms: this.camAlarms, pending: this.pending.length, lives: this.lives, ...this.result() };
  }

  dispose(): void {
    this.ct?.dispose();
    this.ct = null;
    this.g.ctDev = null;
    this.pending.length = 0;
    const w = window as unknown as { __sector?: SectorMode };
    if (w.__sector === this) delete w.__sector;
  }
}
