import { Vector3 } from '../core/babylon';
import type { GameState, NetAttachment } from '../game/gameState';
import type { Blip } from '../ui/hud/minimap';
import { Ragdoll } from '../ai/ragdoll';
import { BUDGET } from '../physics/groups';
import type { HitInfo } from '../game/damage';
import type { NetSession } from './session';
import type { EndStats, Msg, NetEvent, PlayerState } from './protocol';
import { ClockSync } from './interp';
import { RemoteAvatar } from './remoteAvatar';
import { EnemyPuppet } from './enemyPuppet';
import { clampEnd, coopSessionStats } from './validate';
import { infoToHtml, localFlags } from './netShared';

const SEND_HZ = 20;
const INTERP_DELAY = 0.12;

/**
 * Client side of a coop match. Only the local player is simulated (predicted); enemies, waves,
 * pickups and health come from host snapshots. Own hits are resolved against local puppets
 * for instant feedback and sent to the host for the real outcome.
 */
export class CoopClient implements NetAttachment {
  private avatars = new Map<string, RemoteAvatar>();
  private puppets = new Map<string, EnemyPuppet>();
  private ragdolls: Ragdoll[] = [];
  private clock = new ClockSync();
  private sendT = 0;
  private time = 0;
  private offs: (() => void)[] = [];
  private obj = '';
  private info = '';
  private ended = false;
  private lastBlast: { p: Vector3; t: number } | null = null;

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    this.offs.push(s.events.on('game', ({ msg }) => this.receive(msg)));
    g.explosions.onLocalBlast = (p) => {
      this.lastBlast = { p: p.clone(), t: this.time };
      s.toHost({ t: 'blast', x: p.x, y: p.y, z: p.z });
    };
    g.onEmote = (id) => s.toHost({ t: 'emote', id });
    g.hud.setObjective('Connecting to host…');
  }

  private get renderTime(): number {
    return this.clock.now(performance.now() / 1000) - INTERP_DELAY;
  }

  private receive(msg: Msg): void {
    if (this.ended) return;
    switch (msg.t) {
      case 'snap':
        this.onSnap(msg);
        break;
      case 'ev':
        for (const e of msg.events) this.onEvent(e);
        break;
      case 'end':
        this.onEndMsg(msg.stats);
        break;
    }
  }

  private avatar(st: PlayerState): RemoteAvatar | null {
    let a = this.avatars.get(st.id);
    if (!a) {
      const info = this.s.players.get(st.id);
      if (!info) return null;
      const g = this.g;
      a = new RemoteAvatar(g.world, g.vfx, g.ballistics, info);
      a.onFire = (cls, at) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z });
      this.avatars.set(st.id, a);
    }
    return a;
  }

  private onSnap(m: Extract<Msg, { t: 'snap' }>): void {
    const g = this.g;
    this.clock.observe(m.time, performance.now() / 1000);
    const seen = new Set<string>();
    for (const p of m.players) {
      if (p.id === this.s.selfId) {
        this.applySelf(p);
        continue;
      }
      seen.add(p.id);
      this.avatar(p)?.buf.push(m.time, p);
    }
    for (const [id, a] of this.avatars) {
      if (!seen.has(id)) {
        a.dispose();
        this.avatars.delete(id);
      }
    }
    const live = new Set<string>();
    for (const e of m.enemies) {
      live.add(e.id);
      let p = this.puppets.get(e.id);
      if (!p) {
        p = new EnemyPuppet(g.scene, g.world, g.registry, e.id, e.k);
        p.onShot = (h) => this.sendShot(p!, h);
        this.puppets.set(e.id, p);
      }
      p.stale = 0;
      p.buf.push(m.time, e);
    }
    // enemies the host no longer reports (despawned without a kill event)
    for (const [id, p] of this.puppets) {
      if (!live.has(id) && !p.dead && (p.stale += 1 / 15) > 0.5) {
        p.dispose();
        this.puppets.delete(id);
      }
    }
    g.pickups?.setMask(m.pk);
    if (m.obj !== this.obj) {
      this.obj = m.obj;
      g.hud.setObjective(m.obj);
    }
    if (m.info !== this.info) {
      this.info = m.info;
      g.hud.setModeInfo(infoToHtml(m.info));
    }
  }

  /** Host-authoritative health for the local player. */
  private applySelf(p: PlayerState): void {
    const g = this.g;
    const h = g.target.health;
    h.hp = p.hp;
    h.shield = p.sh;
    if (p.hp <= 0 && g.player.alive) {
      g.player.alive = false;
      g.hud.banner('DOWN', g.opts.mode === 'wave' ? 'Back in when the wave is cleared' : 'Respawning…', 2500);
    }
  }

  private sendShot(p: EnemyPuppet, h: HitInfo): void {
    const o = h.sourcePos;
    const dx = h.point.x - o.x;
    const dy = h.point.y - o.y;
    const dz = h.point.z - o.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    this.s.toHost({
      t: 'shot',
      w: h.weapon ?? this.g.weapons.current.def.id,
      ox: o.x,
      oy: o.y,
      oz: o.z,
      dx: dx / len,
      dy: dy / len,
      dz: dz / len,
      target: p.id,
      part: h.part,
      rt: Math.max(0, this.renderTime),
      dist: len,
      dmg: h.amount,
    });
  }

  private onEvent(e: NetEvent): void {
    const g = this.g;
    const me = this.s.selfId;
    switch (e.e) {
      case 'tracer': {
        const a = new Vector3(e.ax, e.ay, e.az);
        g.vfx.tracer(a, new Vector3(e.bx, e.by, e.bz), e.c, 0.02);
        g.vfx.muzzleFlash(a, 0.2);
        g.events.emit('remoteShot', { cls: 'rifle', x: a.x, y: a.y, z: a.z });
        // nearest puppet gets the firing pose
        let best: EnemyPuppet | null = null;
        let bd = 2.5;
        for (const p of this.puppets.values()) {
          const d = Vector3.Distance(p.pos, a);
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        best?.fired();
        break;
      }
      case 'boom': {
        const pos = new Vector3(e.x, e.y, e.z);
        const lb = this.lastBlast;
        if (lb && this.time - lb.t < 1.5 && Vector3.Distance(lb.p, pos) < 2) break; // already shown locally
        g.vfx.explosion(pos, e.r * 0.5);
        g.explosions.onExplode?.(pos, e.r);
        break;
      }
      case 'kill': {
        const p = this.puppets.get(e.enemy);
        if (p) {
          const rig = p.die();
          if (rig) {
            const alive = this.ragdolls.filter((r) => !r.done).length;
            if (alive < BUDGET.maxRagdolls) {
              const away = p.pos.subtract(g.player.position);
              away.y = 0;
              away.normalize().scaleInPlace(12).addInPlaceFromFloats(0, 3, 0);
              this.ragdolls.push(new Ragdoll(g.scene, rig, away));
            } else rig.dispose();
          }
          this.puppets.delete(e.enemy);
        }
        if (e.by === me) {
          g.hud.hitMarker('kill');
          g.app.sfx.hitMarker('kill');
          g.app.input.rumble(0.5, 0.8, 120);
          g.hud.feedItem(`${p?.def.name ?? 'Hostile'} ${e.head ? 'headshot' : 'down'}`, 'kill');
        } else {
          const who = this.s.players.get(e.by)?.name ?? 'Ally';
          g.hud.feedItem(`${who}: ${p?.def.name ?? 'hostile'} ${e.head ? 'headshot' : 'down'}`);
        }
        break;
      }
      case 'banner':
        g.hud.banner(e.title, e.sub);
        break;
      case 'feed':
        g.hud.feedItem(e.text);
        break;
      case 'pickup':
        if (e.player !== me) break;
        if (e.kind === 'ammo') g.weapons.addAmmo(0.5);
        g.events.emit('pickup', { kind: e.kind });
        g.hud.feedItem(e.kind === 'health' ? '+50 health' : 'Ammo refilled');
        break;
      case 'emote':
        if (e.player !== me) this.avatars.get(e.player)?.emote(e.id);
        break;
      case 'hurt': {
        if (e.player !== me) break;
        const pp = g.player.position;
        g.hud.damageFrom(Math.atan2(e.x - pp.x, e.z - pp.z) - g.player.cam.yaw);
        g.player.cam.shake(e.boom ? 0.5 : 0.12);
        g.app.input.rumble(0.6, 0.3, 90);
        g.app.sfx.playerHurt();
        break;
      }
      case 'revive':
        if (e.player !== me) break;
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), g.player.cam.yaw);
        g.target.revive();
        g.hud.banner('BACK IN', '', 1500);
        break;
      case 'hitConfirm':
        break;
    }
  }

  private onEndMsg(raw: EndStats): void {
    this.ended = true;
    const end = clampEnd(raw, this.time);
    Object.assign(this.g.stats, coopSessionStats(this.g.stats, end, this.s.selfId));
    this.g.endSession(end.won, end.subtitle);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 1 / SEND_HZ;
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    this.s.toHost({
      t: 'pstate',
      s: {
        id: this.s.selfId,
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        yaw: c.yaw,
        pitch: p.cam.pitch,
        speed: c.speed,
        f: localFlags(g),
        w: g.weapons.current.def.id,
        hp: g.target.health.hp,
        sh: g.target.health.shield,
      },
    });
  }

  frameUpdate(dt: number): void {
    const t = this.renderTime;
    for (const a of this.avatars.values()) a.update(dt, t);
    for (const p of this.puppets.values()) p.update(dt, t);
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const r = this.ragdolls[i]!;
      r.update(dt);
      if (r.done) this.ragdolls.splice(i, 1);
    }
  }

  onLocalDeath(): boolean {
    return true;
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const a of this.avatars.values()) out.push({ x: a.pos.x, z: a.pos.z, kind: 'ally' });
    return out;
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const a of this.avatars.values()) a.dispose();
    for (const p of this.puppets.values()) p.dispose();
    for (const r of this.ragdolls) r.dispose();
    this.avatars.clear();
    this.puppets.clear();
    this.ragdolls.length = 0;
    this.g.explosions.onLocalBlast = null;
  }
}
