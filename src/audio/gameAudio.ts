import type { GameState } from '../game/gameState';
import type { App } from '../core/app';
import { Vector3 } from '../core/babylon';
import { awareness } from './score/game/adapter';
import { gaitOf, type FoleyMove } from './foley/steps';
import { noiseRadius, stepVolume } from '../player/movement';
import { SURFACE_NOISE } from '../world/surfaces';
import { GUARD_GUN, remoteGun } from './weapons/guns';
import { JAM_BUZZ, JamBuzz } from './jamBuzz';
import type { Spatial } from './audioEngine';

const FOLEY_MOVES: readonly string[] = ['vault', 'mantle', 'hop', 'drop', 'roll'] satisfies FoleyMove[];

/** Connects a play session's events to the synth (positional where it matters). */
export function attachGameAudio(app: App, g: GameState): { frame(dt: number): void; dispose(): void } {
  const sfx = app.sfx;
  const a = app.audio;
  const fo = app.foley;
  const tmp = new Vector3();
  // (marlow-jammer, item 7) the jam buzz at the nearest jammed device
  const buzz = new JamBuzz(a);
  const buzzAt = { x: 0, y: 0, z: 0 };
  /** (jammer-fixes) The buzz's spatial result, reused every frame (no allocation while a device is jammed). */
  const buzzS: Spatial = { gain: 0, pan: 0, dist: 0 };
  // movement foley: foot plants from the rig, landings and committed moves from their counters
  let plantsSeen = g.player.footPlants;
  let landSeen = g.player.controller.landings;
  let moveSeen = 0;
  /** After a landing the next plants are part of it (s). */
  let quietT = 0;
  const w = g.weapons.events;
  const prevShot = w.onShot;
  // weapons: the CC0 sprite (`WeaponAudio`), the synth until it has decoded
  const wa = app.weaponAudio;
  w.onShot = (def) => {
    prevShot?.(def);
    // a suppressor (or a built-in one) halves the noise stat or more: that gun sounds suppressed
    if (!wa.shot(def.id, g.weapons.lastShotQuiet, g.surface)) sfx.gunshot(def.class, 1, 0.12);
  };
  w.onReload = (def) => {
    const s = g.weapons.current;
    if (!wa.reload(def.id, g.weapons.reloadDuration, g.weapons.reloadIsEmpty, s.stats.magSize - s.mag)) sfx.reload(s.stats.reloadTime || def.reloadTime);
  };
  w.onDryFire = () => {
    if (!wa.dry()) sfx.dryFire();
  };
  w.onSwap = () => {
    wa.cancelReload();
    sfx.swap();
  };
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
      if (s.gain > 0.03 && !wa.remoteShot(GUARD_GUN[e.def.kind] ?? 'rifle', s.dist, s.gain, s.pan)) sfx.gunshot(e.def.kind === 'heavy' ? 'heavy' : 'rifle', s.gain, s.pan, Math.max(1, s.dist));
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
    g.events.on('alarm', () => sfx.horn()),
    g.events.on('lightOut', ({ shot }) => (shot ? sfx.glass(1) : sfx.click())),
    g.events.on('lightSwitch', () => sfx.click()),
    g.events.on('vision', ({ mode }) => sfx.goggles(mode !== 'off')),
    g.events.on('bark', ({ radio }) => radio && sfx.radio()),
    g.events.on('gadget', ({ kind, phase }) => {
      if (phase === 'throw') return; // (the throw itself sounds through onGrenade)
      else if (phase === 'detonate') sfx.gadget(kind === 'flash' ? 'flash' : kind === 'emp' ? 'emp' : 'gas');
      else if (phase === 'pulse') sfx.gadget('chirp', kind === 'noise' ? 1 : 0.6);
      else if (phase === 'view' || phase === 'exit') sfx.gadget('feed');
      else if (phase !== 'trigger') sfx.gadget('beep');
    }),
    g.events.on('door', ({ how, x, z, vol }) => {
      const s = a.spatial(x, 1, z, how === 'bash' ? 40 : 20);
      if (s.gain > 0.03) sfx.door(how, s.gain * (vol ?? 1), s.pan);
    }),
    g.events.on('body', ({ action }) => (action === 'pickup' ? sfx.thud(0.5) : sfx.thud(1))),
    g.events.on('objective', () => sfx.objective()),
    g.events.on('operationComplete', () => sfx.stinger(true)),
    // (sector-restart, M9) a checkpoint restart is a clean start: the alert music fades out, Calm again
    g.events.on('checkpointRestart', () => app.music.calm()),
    g.events.on('pickup', ({ kind }) => sfx.pickup(kind)),
    // coop: shots fired by teammates or host-simulated enemies
    // (coop-walk-fixes P7) a partner's round: its own weapon's sound (the suppressed pistol is not the class's open 1911),
    // suppressed when it was (the synth fallback quieter)
    g.events.on('remoteShot', ({ cls, x, y, z, gun, quiet }) => {
      const s = a.spatial(x, y, z, 70);
      if (s.gain > 0.03 && !wa.remoteShot(remoteGun(cls, gun), s.dist, s.gain, s.pan, quiet === true)) sfx.gunshot(cls, s.gain * (quiet ? 0.3 : 1), s.pan, Math.max(1, s.dist));
    }),
  ];
  app.music.mission();
  const frame = (dt: number): void => {
    // the score follows the guards' awareness (read only; the music never feeds back into gameplay)
    app.music.update(dt, awareness(g.enemyMgr?.enemies));
    const cam = g.player.cam.camera;
    const L = a.listener;
    L.x = cam.position.x;
    L.y = cam.position.y;
    L.z = cam.position.z;
    L.rx = Math.cos(g.player.cam.yaw);
    L.rz = -Math.sin(g.player.cam.yaw);
    if (g.ctDev?.nearestJammed(L.x, L.y, L.z, buzzAt)) {
      const s = a.spatial(buzzAt.x, buzzAt.y, buzzAt.z, JAM_BUZZ.range, buzzS);
      buzz.update(JAM_BUZZ.gain * s.gain, s.pan);
    } else buzz.update(0, 0);
    const p = g.player;
    const c = p.controller;
    quietT -= dt;
    if (c.landings !== landSeen) {
      landSeen = c.landings;
      if (p.alive && c.lastLanding !== 'none') {
        if (!fo.landing(g.surface, c.lastLanding)) sfx.footstep(1.4, 0, g.surface);
        quietT = 0.15;
      }
    }
    const cm = g.traversal.committed;
    if (cm && cm.n !== moveSeen) {
      moveSeen = cm.n;
      if (p.alive && FOLEY_MOVES.includes(cm.kind)) fo.move(g.surface, cm.kind as FoleyMove, cm.dur);
    }
    if (p.footPlants !== plantsSeen) {
      plantsSeen = p.footPlants;
      if (p.alive && quietT <= 0 && (!cm || cm.kind === 'step')) {
        const crouch = c.crouched || c.steps === 'crouched';
        // (playtest 2, G61) the volume follows the noise guards hear (the meter's radius): silent bands and cover glides
        // are very soft, a run the loudest; shuffles on the spot are softer still
        const radius = c.steps === 'silent' ? 0 : noiseRadius(c.speed, crouch) * SURFACE_NOISE[g.surface];
        const scale = stepVolume(radius) * (c.speed < 0.3 ? 0.5 : 1);
        if (!fo.step(g.surface, gaitOf(c.speed, crouch, false), c.speed, p.footPlantSide, scale)) sfx.footstep(scale, 0, g.surface);
      }
    }
  };
  return {
    frame,
    dispose: () => {
      wa.cancelReload();
      buzz.dispose();
      for (const o of offs) o();
    },
  };
}
