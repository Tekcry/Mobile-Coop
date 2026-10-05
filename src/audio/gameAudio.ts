import type { GameState } from '../game/gameState';
import type { App } from '../core/app';
import { Vector3 } from '../core/babylon';

/** Connects a play session's events to the synth (positional where it matters). */
export function attachGameAudio(app: App, g: GameState): { frame(dt: number): void; dispose(): void } {
  const sfx = app.sfx;
  const a = app.audio;
  const tmp = new Vector3();
  let stepT = 0;
  const w = g.weapons.events;
  const prevShot = w.onShot;
  w.onShot = (def) => {
    prevShot?.(def);
    sfx.gunshot(def.class, 1, 0.12);
  };
  w.onReload = (def) => sfx.reload(g.weapons.current.stats.reloadTime || def.reloadTime);
  w.onDryFire = () => sfx.dryFire();
  w.onSwap = () => sfx.swap();
  w.onGrenade = () => sfx.grenadeThrow();
  const prevHit = w.onHit;
  w.onHit = (kind, weapon, dmg) => {
    prevHit?.(kind, weapon, dmg);
    sfx.hitMarker(kind);
  };
  const prevDmg = g.target.onDamaged;
  g.target.onDamaged = (h, dealt) => {
    prevDmg?.(h, dealt);
    sfx.playerHurt();
  };
  const prevBoom = g.explosions.onExplode;
  g.explosions.onExplode = (pos, radius) => {
    prevBoom?.(pos, radius);
    const s = a.spatial(pos.x, pos.y, pos.z, 90);
    sfx.explosion(Math.max(0.25, s.gain), s.pan);
  };
  g.ballistics.onImpact = (p) => {
    const s = a.spatial(p.x, p.y, p.z, 30);
    if (s.gain > 0.05) sfx.impact(s.gain, s.pan);
  };
  const em = g.enemyMgr;
  if (em) {
    const prevEnemyShot = em.onEnemyShot;
    em.onEnemyShot = (e, from, to) => {
      prevEnemyShot?.(e, from, to);
      e.center(tmp);
      const s = a.spatial(tmp.x, tmp.y, tmp.z, 70);
      if (s.gain > 0.03) sfx.gunshot(e.def.kind === 'heavy' ? 'heavy' : 'rifle', s.gain, s.pan, Math.max(1, s.dist));
    };
    em.onEnemyMelee = (e) => {
      e.center(tmp);
      const s = a.spatial(tmp.x, tmp.y, tmp.z, 20);
      sfx.melee(s.gain, s.pan);
    };
    em.onEnemyWindup = (e) => {
      e.center(tmp);
      const s = a.spatial(tmp.x, tmp.y, tmp.z, 40);
      sfx.windup(s.gain, s.pan);
    };
  }
  const offs = [
    g.events.on('wave', () => sfx.horn()),
    g.events.on('alarm', () => sfx.horn()),
    g.events.on('waveCleared', () => sfx.objective()),
    g.events.on('objective', () => sfx.objective()),
    g.events.on('roomCleared', ({ n, total }) => sfx.stinger(n >= total)),
    g.events.on('pickup', ({ kind }) => sfx.pickup(kind)),
    // coop: shots fired by teammates or host-simulated enemies
    g.events.on('remoteShot', ({ cls, x, y, z }) => {
      const s = a.spatial(x, y, z, 70);
      if (s.gain > 0.03) sfx.gunshot(cls, s.gain, s.pan, Math.max(1, s.dist));
    }),
  ];
  app.music.start();
  const frame = (dt: number): void => {
    const cam = g.player.cam.camera;
    const L = a.listener;
    L.x = cam.position.x;
    L.y = cam.position.y;
    L.z = cam.position.z;
    L.rx = Math.cos(g.player.cam.yaw);
    L.rz = -Math.sin(g.player.cam.yaw);
    const c = g.player.controller;
    if (c.grounded && c.speed > 1.2 && g.player.alive) {
      stepT -= dt;
      if (stepT <= 0) {
        stepT = c.sprinting ? 0.27 : c.crouched ? 0.5 : 0.36;
        sfx.footstep(c.crouched ? 0.5 : 1);
      }
    }
    let alive = em?.alive ?? 0;
    if (!em && g.puppet) for (const _ of g.registry.hostiles('player')) alive++;
    app.music.setIntensity(g.opts.mode === 'sandbox' ? 0 : Math.min(1, alive / 5));
  };
  return {
    frame,
    dispose: () => {
      for (const o of offs) o();
      app.music.setIntensity(0);
    },
  };
}
