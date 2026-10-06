import { Vector3 } from '../../core/babylon';
import type { Enemy } from '../../ai/enemy';
import type { HitInfo } from '../damage';
import type { GameState } from '../gameState';
import type { GameMode } from './gameMode';
import type { Interactable } from '../interactables';
import type { Blip } from '../../ui/hud/minimap';
import { hyp2 } from '../../core/mathx';
import { DOWNLOAD, evaluateRules, MISSIONS, missionById, missionRating, ObjectiveChain, type MissionDef, type ObjectiveDef } from '../missions';
import { Vip } from '../vip';
import type { SquadSlot } from '../../world/rooms';
import { killScore } from './waveLogic';

const SQUAD_CAP = 9;
const SPAWN_MIN_DIST = 7;
/** Seconds in the extraction zone to leave. */
const EXTRACT_HOLD = 1;

/**
 * Infiltration (2.0 phase 7): a `MissionDef`'s objective chain on its map. The operator starts at the chosen
 * insertion, undetected; squads hold their rooms (stealth rules). Objectives: a download (start it at the
 * terminal; it uploads while you stay within range - leave and it pauses - and now and then the traffic is
 * noticed: a noise pulse at the terminal), a plant / hack or a sabotage charge (a hold), a rescue (free the
 * asset, who then follows you), intel items (any order), and the extraction zone (with the asset if there is
 * one). Mission rules (no alarms / no kills / undetected) are bonuses or fail conditions. The end is a stinger:
 * slow beat, letterbox, banner.
 */
export class InfiltrationMode implements GameMode {
  readonly id = 'infiltration' as const;
  readonly def: MissionDef;
  readonly chain: ObjectiveChain;
  /** The current objective's interactables. */
  private its: Interactable[] = [];
  vip: Vip | null = null;
  /** The download was started at its terminal. */
  downloading = false;
  private extractT = 0;
  private endT = -1;
  lives = 3;
  private checkpoint: Vector3;
  private pending: { slot: SquadSlot; room: number }[] = [];
  private fillT = 0;
  /** Objectives completed with nobody alerted (tests / bonus). */
  unseenObjectives = 0;

  constructor(private g: GameState) {
    this.def = missionById(g.opts.missionId ?? '') ?? MISSIONS.find((m) => m.map === g.world.map.id) ?? MISSIONS[0]!;
    this.chain = new ObjectiveChain(this.def);
    this.checkpoint = g.world.layout.playerSpawns[0]!.pos.clone();
  }

  start(): void {
    const g = this.g;
    const em = g.enemyMgr!;
    em.stealth = true;
    // insertion
    const ins = this.def.insertions.find((i) => i.id === g.opts.insertion) ?? this.def.insertions[0]!;
    const at = new Vector3(ins.x, ins.y, ins.z);
    g.player.controller.teleport(at, ins.yaw);
    g.player.cam.yaw = ins.yaw;
    this.checkpoint.copyFrom(at);
    // squads holding their rooms (nearest first under the cap, the rest as the cap frees up)
    const rooms = g.world.layout.rooms ?? [];
    rooms.forEach((r, i) => {
      for (const slot of r.squad ?? []) this.pending.push({ slot, room: i });
    });
    this.fill();
    // the asset waits where he is held from the start
    for (const o of this.def.objectives) {
      if (o.type === 'rescue' && o.vip) this.vip = new Vip(g.scene, g.world, g.nav, o.vip[0], o.vip[1], o.vip[2], o.yaw);
    }
    g.hud.banner(this.def.name.toUpperCase(), ins.name, 2800);
    g.letterbox(2.8);
    this.setup();
  }

  /** Spawn pending squads, nearest first, under the cap and out of the operator's face. */
  private fill(): void {
    const g = this.g;
    const em = g.enemyMgr!;
    const p = g.player.position;
    this.pending.sort((a, b) => hyp2(a.slot.x - p.x, a.slot.z - p.z) - hyp2(b.slot.x - p.x, b.slot.z - p.z));
    const rooms = g.world.layout.rooms ?? [];
    for (let i = 0; i < this.pending.length && em.alive < SQUAD_CAP; ) {
      const q = this.pending[i]!;
      if (hyp2(q.slot.x - p.x, q.slot.z - p.z) < SPAWN_MIN_DIST) {
        i++;
        continue;
      }
      const e = em.spawn(q.slot.kind, new Vector3(q.slot.x, 0, q.slot.z), false, q.slot.yaw);
      if (!e) break;
      const r = rooms[q.room];
      if (r) e.hold = r;
      em.joinSquad(e, q.room);
      if (q.slot.route) e.setPatrol({ points: q.slot.route, wait: q.slot.wait });
      this.pending.splice(i, 1);
    }
  }

  /** Put down the current objective's interactables. */
  private setup(): void {
    const g = this.g;
    const ints = g.interactables!;
    for (const it of this.its) ints.remove(it);
    this.its.length = 0;
    const o = this.chain.current;
    if (!o) return;
    const site = new Vector3(o.x, o.y, o.z);
    const add = (id: string, kind: Parameters<typeof ints.add>[1], pos: Vector3, label: string, hold: number, use: (it: Interactable) => void): Interactable => {
      const it = ints.add(id, kind, pos, label, hold, o.yaw);
      it.onUse = use;
      ints.setEnabled(it, true);
      this.its.push(it);
      return it;
    };
    switch (o.type) {
      case 'download':
        this.downloading = false;
        add(o.id, 'terminal', site, 'Start the upload', 0, (it) => {
          it.done = true;
          this.downloading = true;
          g.hud.feedItem('Upload started - stay close');
          g.events.emit('objective', { id: `${o.id}-start` });
        });
        break;
      case 'plant':
      case 'sabotage':
        add(o.id, o.type === 'sabotage' ? 'charge' : 'terminal', site, o.label, o.time, () => {
          this.chain.hold(o.time);
          this.completed(o);
        });
        break;
      case 'rescue': {
        const v = this.vip;
        const p = v ? v.pos.clone() : site;
        add(o.id, 'vip', p, o.label, o.time, () => {
          this.chain.hold(o.time);
          v?.release();
          this.completed(o);
        });
        break;
      }
      case 'intel':
        o.items.forEach((it3, k) => {
          add(`${o.id}-${k}`, 'intel', new Vector3(it3[0], it3[1], it3[2]), 'Take the intel', 0, (it) => {
            it.done = true;
            ints.setEnabled(it, false);
            const n = this.chain.found[this.chain.index]!.filter(Boolean).length + 1;
            g.hud.feedItem(`Intel ${n}/${o.items.length}`, 'xp');
            if (this.chain.collect(k)) this.completed(o);
            else this.updateObjective();
          });
        });
        break;
      case 'extract':
        this.extractT = 0;
        add(o.id, 'extract', site, o.label, 0, () => {});
        break;
    }
    this.updateObjective();
  }

  /** An objective done: score, play style, checkpoint, the next one. */
  private completed(o: ObjectiveDef): void {
    const g = this.g;
    g.stats.objectives++;
    g.stats.score += 500;
    const unseen = !g.detected;
    if (unseen) this.unseenObjectives++;
    g.style.record(unseen ? 'objectiveUnseen' : 'objective', g.detected);
    g.events.emit('objective', { id: o.id });
    this.checkpoint.copyFrom(g.player.position);
    if (o.type === 'sabotage') g.hud.banner('CHARGE ARMED', 'Get out', 2000);
    else g.hud.feedItem(`${o.label} - done`, 'xp');
    if (this.chain.state === 'done') this.complete();
    else this.setup();
  }

  private updateObjective(): void {
    const o = this.chain.current;
    if (!o) return;
    let text = o.label;
    if (o.type === 'intel') text += ` (${this.chain.found[this.chain.index]!.filter(Boolean).length}/${o.items.length})`;
    if (o.type === 'download' && this.downloading) text += ` ${Math.floor(this.chain.fraction * 100)}%`;
    this.g.hud.setObjective(text);
  }

  /** Every objective done: the extraction stinger, then the results. */
  private complete(): void {
    if (this.endT >= 0) return;
    const g = this.g;
    if (this.chain.armed) {
      // the sabotage charge goes off as you leave
      for (const o of this.def.objectives) if (o.type === 'sabotage') g.vfx.explosion(new Vector3(o.x, o.y + 0.6, o.z), 5);
    }
    if (!g.detected && g.style.detections === 0) g.style.record('ghostExtract', false);
    g.events.emit('operationComplete', {});
    g.hud.banner('MISSION COMPLETE', this.def.name, 2600);
    g.slowBeat(0.4, 0.5);
    g.letterbox(2.6);
    this.endT = 2.6;
  }

  private finish(won: boolean, subtitle: string): void {
    const g = this.g;
    const t = { alarms: g.style.alarms, kills: g.style.kills, detections: g.style.detections };
    const r = evaluateRules(this.def.rules, t);
    const bonusTotal = (['noAlarms', 'noKills', 'undetected'] as const).filter((k) => this.def.rules[k] === 'bonus').length;
    g.stats.missionId = this.def.id;
    g.stats.bonuses = won ? r.bonuses : [];
    g.stats.rating = missionRating(won, r.bonuses.length, bonusTotal, t.detections);
    if (won) g.stats.score += 1500 + r.bonuses.length * 750;
    g.endSession(won, subtitle);
  }

  fixedUpdate(dt: number): void {
    const g = this.g;
    if (this.endT > 0) {
      this.endT -= dt;
      if (this.endT <= 0) {
        this.endT = 0;
        this.finish(true, `${this.def.name} complete`);
      }
      return;
    }
    if (this.endT === 0 || this.chain.state !== 'active') return;
    // fail rules (challenge contracts)
    const r = evaluateRules(this.def.rules, { alarms: g.style.alarms, kills: g.style.kills, detections: g.style.detections });
    if (r.fail) {
      this.chain.fail(r.fail);
      this.endT = 0;
      this.finish(false, r.fail);
      return;
    }
    this.fillT -= dt;
    if (this.fillT <= 0) {
      this.fillT = 0.5;
      this.fill();
    }
    const o = this.chain.current;
    // co-op: any operator standing counts (the asset follows the nearest)
    const refs = g.playerRefs();
    let lead = refs[0]!;
    if (this.vip && refs.length > 1) {
      let bd = Infinity;
      for (const r of refs) {
        const d = hyp2(r.feet.x - this.vip.pos.x, r.feet.z - this.vip.pos.z);
        if (r.target.alive && d < bd) {
          bd = d;
          lead = r;
        }
      }
    }
    if (this.vip) this.vip.update(dt, lead.feet, lead.crouched);
    if (!o) return;
    const near = (range: number, dy: number): boolean => refs.some((r) => r.target.alive && hyp2(r.feet.x - o.x, r.feet.z - o.z) < range && Math.abs(r.feet.y - o.y) < dy);
    if (o.type === 'download' && this.downloading) {
      if (near(DOWNLOAD.range, 2.5)) {
        const site = new Vector3(o.x, o.y, o.z);
        if (this.chain.hold(dt)) this.completed(o);
        // the traffic is noticed now and then: guards come to look
        else if (this.chain.noticed()) g.enemyMgr?.hear(site, DOWNLOAD.noise);
        this.updateObjective();
      }
    }
    if (o.type === 'extract') {
      const inZone = near(o.radius, 6);
      const vipOk = !this.vip || !this.vip.free || hyp2(this.vip.pos.x - o.x, this.vip.pos.z - o.z) < o.radius * 2;
      this.extractT = inZone && vipOk ? this.extractT + dt : 0;
      if (this.extractT >= EXTRACT_HOLD && this.chain.reach()) this.complete();
    }
  }

  frameUpdate(dt: number): void {
    this.vip?.frame(dt, 1);
    const o = this.chain.current;
    const parts: string[] = [];
    if (o && o.type === 'download' && this.downloading) parts.push(`<span>Upload <b>${Math.floor(this.chain.fraction * 100)}%</b></span>`);
    this.g.hud.setModeInfo(parts.join(''));
  }

  onEnemyKilled(e: Enemy, h: HitInfo): void {
    this.g.stats.score += killScore(e.def.kind, h.part === 'head', 2);
  }

  onPlayerDeath(): void {
    if (this.g.anyPlayerAlive() || this.endT >= 0) return;
    this.lives--;
    if (this.lives <= 0) {
      this.chain.fail('Operator down');
      this.endT = 0;
      this.finish(false, 'Mission failed');
      return;
    }
    this.g.hud.banner('DOWN', '', 2500);
    this.g.scheduleRespawn(this.checkpoint, 3);
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const it of this.its) if (it.enabled && !it.done) out.push({ x: it.pos.x, z: it.pos.z, kind: 'objective' });
    return out;
  }

  dispose(): void {
    this.vip?.dispose();
    this.vip = null;
    this.pending.length = 0;
  }
}
