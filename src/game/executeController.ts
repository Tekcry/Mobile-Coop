import { Vector3 } from '../core/babylon';
import type { Enemy } from '../ai/enemy';
import { G, MASK } from '../physics/groups';
import { EXECUTE, executeStep } from './marks';
import { hyp2 } from '../core/mathx';
import type { GameState } from './gameState';

/**
 * Mark & Execute at run time (phase 4). While aiming, the mark button toggles a mark on the enemy under the
 * crosshair. Readiness (a charge, every live mark in weapon range and in sight) is checked a few times a second.
 * Execute then plays a short sequence (slowed in single player): the operator turns to each mark in order, the
 * camera following, and fires one round each (a kill shot to the head).
 */
export class ExecuteController {
  ready = false;
  running: { targets: Enemy[]; t: number; shot: number; fromYaw: number; fromPitch: number } | null = null;
  private checkT = 0;
  private o = new Vector3();
  private d = new Vector3();
  private end = new Vector3();
  private eye = new Vector3();
  private head = new Vector3();

  constructor(private g: GameState) {}

  private enemyById(id: string): Enemy | null {
    for (const e of this.g.enemyMgr?.enemies ?? []) if (e.id === id) return e;
    return null;
  }

  /** In weapon range and line of sight from the eye. */
  private clear(e: Enemy): boolean {
    const g = this.g;
    const p = g.player.position;
    if (!e.alive || e.taken) return false;
    const range = g.weapons.current.def.range;
    if (Vector3.Distance(p, e.pos) > range) return false;
    this.eye.set(p.x, p.y + 1.55, p.z);
    e.aimPoint(this.head);
    const h = g.ballistics.ray(this.eye, this.head, G.STATIC);
    return !h.hit || h.distance > Vector3.Distance(this.eye, this.head) - 0.3;
  }

  fixedUpdate(dt: number, markPressed: boolean, execPressed: boolean): boolean {
    const g = this.g;
    const m = g.marks;
    if (this.running) {
      this.run(dt);
      return true;
    }
    m.prune((id) => {
      const e = this.enemyById(id);
      return !!e && e.alive;
    });
    // mark / unmark what the crosshair is on (aiming)
    if (markPressed && g.player.ads) {
      g.player.cam.aimRay(this.o, this.d);
      this.end.copyFrom(this.d).scaleInPlace(120).addInPlace(this.o);
      const h = g.ballistics.ray(this.o, this.end, MASK.PLAYER_SHOT);
      const t = h.target;
      if (t && t.team === 'enemy' && t.alive) {
        const e = this.enemyById(t.id);
        if (e && m.toggle(e.id)) g.events.emit('mark', { on: m.has(e.id) });
      }
    }
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 1 / EXECUTE.checkHz;
      this.ready = m.ready((id) => {
        const e = this.enemyById(id);
        return !!e && this.clear(e);
      });
    }
    if (execPressed && this.ready && g.player.alive) this.start();
    return this.running !== null;
  }

  private start(): void {
    const g = this.g;
    const targets: Enemy[] = [];
    for (const id of g.marks.consume()) {
      const e = this.enemyById(id);
      if (e) targets.push(e);
    }
    this.ready = false;
    if (!targets.length) return;
    if (g.traversal.attached) g.traversal.reset();
    this.running = { targets, t: 0, shot: -1, fromYaw: g.player.cam.yaw, fromPitch: g.player.cam.pitch };
    // single player: a slowed beat; co-op never slows the shared sim
    if (!g.net) g.app.loop.timeScale = EXECUTE.slowScale;
    g.letterbox(0.9);
    g.player.forceAds = true;
    g.events.emit('execute', { phase: 'start' });
  }

  private run(dt: number): void {
    const g = this.g;
    const r = this.running!;
    r.t += dt;
    const st = executeStep(r.targets.length, r.t);
    if (st.index < 0) {
      this.finish();
      return;
    }
    const e = r.targets[st.index]!;
    // turn the view (and the body) to the target's head, then the shot at 60 % of its slot
    const p = g.player.position;
    e.aimPoint(this.head);
    const eyeY = p.y + 1.55;
    const yaw = Math.atan2(this.head.x - p.x, this.head.z - p.z);
    const pitch = Math.atan2(this.head.y - eyeY, Math.max(0.3, hyp2(this.head.x - p.x, this.head.z - p.z)));
    const k = Math.min(1, st.k / 0.6);
    const s = k * k * (3 - 2 * k);
    const y0 = st.index === 0 ? r.fromYaw : g.player.cam.yaw;
    const dy = Math.atan2(Math.sin(yaw - y0), Math.cos(yaw - y0));
    g.player.cam.yaw = y0 + dy * (st.index === 0 ? s : Math.min(1, s * 1.5));
    g.player.cam.pitch += (pitch - g.player.cam.pitch) * s;
    g.player.controller.override = { yaw, turnRate: 30 };
    if (st.k >= 0.6 && r.shot < st.index) {
      r.shot = st.index;
      if (e.alive) {
        const muzzle = g.weapons.muzzlePoint();
        const dir = this.head.subtract(muzzle).normalize();
        g.vfx.tracer(muzzle, this.head, g.weapons.current.def.tracer, 0.022);
        g.vfx.muzzleFlash(muzzle, 0.25);
        e.applyDamage({ amount: 9999, point: this.head.clone(), dir, part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: muzzle, impulse: 2 });
        g.weapons.events.onShot?.(g.weapons.current.def);
      }
      g.events.emit('execute', { phase: 'shot' });
    }
  }

  private finish(): void {
    const g = this.g;
    this.running = null;
    g.app.loop.timeScale = 1;
    g.player.forceAds = false;
    g.player.controller.override = null;
    g.events.emit('execute', { phase: 'done' });
  }

  reset(): void {
    if (this.running) this.finish();
    this.ready = false;
  }
}
