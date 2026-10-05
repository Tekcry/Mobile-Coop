import type { App, AppState } from '../core/app';
import { Vector3, type Scene } from '../core/babylon';
import { World } from '../world/world';
import type { MapDef } from '../world/mapDef';
import { Player } from '../player/player';
import { defaultLook, type AvatarLook } from '../cosmetics/avatarLook';
import { PauseScreen } from '../ui/screens/pauseScreen';
import { DamageRegistry } from './damage';
import { Vfx } from '../vfx/vfx';
import { Ballistics } from '../weapons/ballistics';
import { Explosions } from '../weapons/explosions';
import { Grenades } from '../weapons/grenades';
import { PlayerWeapons, type LoadoutEntry } from '../weapons/playerWeapons';
import { PlayerTarget } from './playerTarget';
import { Hud, type HudFrame } from '../ui/hud/hud';
import { Minimap, type Blip } from '../ui/hud/minimap';
import { TrainingDummy } from './trainingDummy';
import { computeAssist, type AimTarget } from '../weapons/aimAssist';
import { MASK } from '../physics/groups';
import { buildNavGrid } from '../ai/navBuild';
import type { NavGrid } from '../ai/navGrid';
import { EnemyManager } from '../ai/enemyManager';
import type { PlayerRef } from '../ai/enemy';
import type { Difficulty } from '../ai/enemyDefs';
import { Pickups } from './pickups';
import { Interactables, type Interactable } from './interactables';
import { emptyStats, type GameMode, type ModeId, type SessionStats } from './modes/gameMode';
import { WaveMode } from './modes/waveMode';
import { MissionMode } from './modes/missionMode';
import { ResultsScreen } from '../ui/screens/resultsScreen';

export type { ModeId };

export interface GameOptions {
  map: MapDef;
  mode: ModeId;
  seed: number;
  difficulty?: Difficulty;
  look?: AvatarLook;
  loadout?: LoadoutEntry[];
}

export interface SessionCallbacks {
  quit(): void;
  restart(): void;
}

/** Hook for progression (Phase 6): turns session stats into rewards shown on the results screen. */
export type RewardHook = (stats: SessionStats, opts: GameOptions) => Promise<HTMLElement | null>;

/** A play session on one map: world, player, combat systems, HUD. Modes plug in on top. */
export class GameState implements AppState {
  readonly scene: Scene;
  readonly player: Player;
  readonly registry = new DamageRegistry();
  readonly vfx: Vfx;
  readonly ballistics: Ballistics;
  readonly explosions: Explosions;
  readonly grenades: Grenades;
  readonly weapons: PlayerWeapons;
  readonly target: PlayerTarget;
  readonly hud: Hud;
  readonly minimap: Minimap;
  readonly dummies: TrainingDummy[] = [];
  private paused = false;
  private time = 0;
  private respawnT = -1;
  private prevAds = false;
  private onTarget = false;
  private tmp = new Vector3();
  /** Extra blips/markers contributed by the active mode. */
  extraBlips: () => Blip[] = () => [];
  readonly nav: NavGrid | null = null;
  readonly enemyMgr: EnemyManager | null = null;
  readonly pickups: Pickups | null = null;
  readonly interactables: Interactables | null = null;
  readonly mode: GameMode | null = null;
  readonly stats: SessionStats;
  private ended = false;
  private respawnAt: Vector3 | null = null;
  private interactTarget: Interactable | null = null;
  /** Remote players (coop) contribute here; local player is always included. */
  remotePlayers: () => PlayerRef[] = () => [];
  static rewardHook: RewardHook | null = null;
  private localRef: PlayerRef;

  private constructor(
    readonly app: App,
    readonly world: World,
    readonly opts: GameOptions,
    private cb: SessionCallbacks,
  ) {
    this.scene = world.scene;
    const spawn = world.layout.playerSpawns[0]!;
    this.player = new Player(world, opts.look ?? defaultLook(), spawn, () => app.settings.get());
    this.vfx = new Vfx(this.scene);
    this.ballistics = new Ballistics(this.scene, this.registry, world.props, this.vfx);
    this.explosions = new Explosions(this.registry, world.props, this.vfx, this.ballistics);
    this.grenades = new Grenades(this.scene, world.parts, this.explosions);
    const loadout: LoadoutEntry[] =
      opts.loadout ?? (opts.mode === 'sandbox' ? (['rifle', 'smg', 'shotgun', 'sniper', 'pistol'] as const).map((id) => ({ id })) : [{ id: 'rifle' }, { id: 'pistol' }]);
    this.weapons = new PlayerWeapons(world, this.player, this.ballistics, this.grenades, this.vfx, loadout, (s, w, ms) =>
      app.input.rumble(s, w, ms),
    );
    this.target = new PlayerTarget(this.scene, this.registry, this.player);
    this.stats = emptyStats(opts.mode, opts.map.id);
    this.localRef = { id: 'local', target: this.target, feet: this.player.position, speed: 0, crouched: false };
    this.hud = new Hud(app.uiRoot);
    this.minimap = new Minimap(world.level);
    this.hud.setMinimap(this.minimap);

    this.weapons.events.onHit = (kind, weapon) => {
      this.hud.hitMarker(kind);
      if (kind === 'kill') {
        app.input.rumble(0.5, 0.8, 120);
        this.stats.weaponKills[weapon] = (this.stats.weaponKills[weapon] ?? 0) + 1;
      }
    };
    this.weapons.events.onShot = () => this.enemyMgr?.noise(this.player.position, 28 * this.weapons.current.stats.noise);
    this.target.onDamaged = (h, dealt) => {
      this.stats.damageTaken += dealt;
      const bearing = Math.atan2(h.sourcePos.x - this.player.position.x, h.sourcePos.z - this.player.position.z);
      this.hud.damageFrom(bearing - this.player.cam.yaw);
      this.player.cam.shake(h.kind === 'explosion' ? 0.5 : 0.12);
      app.input.rumble(0.6, 0.3, 90);
    };
    this.target.onDeath = () => this.onPlayerDeath();
    this.explosions.onExplode = (pos, radius) => {
      const d = Vector3.Distance(pos, this.player.position);
      this.player.cam.shake(Math.max(0, 0.9 - d / (radius * 3)));
      if (d < radius * 2) app.input.rumble(1, 1, 220);
    };

    if (opts.mode !== 'sandbox') {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      w.nav = buildNavGrid(this.scene, world.level, spawn.pos);
      w.enemyMgr = new EnemyManager(this.scene, world, w.nav, this.registry, this.ballistics, this.vfx, opts.difficulty ?? 'normal', () => this.playerRefs());
      w.enemyMgr.onKilled = (e, h) => {
        this.stats.kills++;
        this.stats.byKind[e.def.kind]++;
        if (h.part === 'head') this.stats.headshots++;
        if (h.attackerId === 'local') this.hud.feedItem(`${e.def.name} ${h.part === 'head' ? 'headshot' : 'down'}  +${e.def.xp} XP`, 'kill');
        this.mode?.onEnemyKilled(e, h);
      };
      w.pickups = new Pickups(this.scene, world.parts, world.layout.pickups);
      w.pickups.onPickup = (k) => {
        if (k === 'health') this.target.health.heal(50);
        else this.weapons.addAmmo(0.5);
        this.hud.feedItem(k === 'health' ? '+50 health' : 'Ammo refilled');
      };
      w.interactables = new Interactables(this.scene, world.parts);
      w.mode = opts.mode === 'wave' ? new WaveMode(this) : new MissionMode(this);
      this.extraBlips = () => [...(this.mode?.blips() ?? []), ...(this.pickups?.blips() ?? [])];
      app.debug.extra.set('ai', () => `enemies ${this.enemyMgr?.alive ?? 0} nav ${this.nav?.w}x${this.nav?.h}`);
    }

    if (opts.mode === 'sandbox') {
      this.weapons.infiniteAmmo = true;
      const d = (x: number, z: number, yaw: number, strafe = 0): void => {
        this.dummies.push(new TrainingDummy(this.scene, world, this.registry, new Vector3(x, 0, z), yaw, strafe));
      };
      d(-4, 8, Math.PI, 0);
      d(3, 10, Math.PI, 2.5);
      d(0, 24, Math.PI, 4);
      d(-14, 14, Math.PI * 0.75, 0);
      this.hud.setObjective('Free roam - try every weapon');
    }

    app.debug.extra.set('player', () => {
      const c = this.player.controller;
      return `${c.grounded ? 'ground' : 'air'} spd ${c.speed.toFixed(1)}${c.crouched ? ' crouch' : ''}${c.isRolling ? ' roll' : ''}`;
    });
  }

  static async create(app: App, opts: GameOptions, cb: SessionCallbacks): Promise<GameState> {
    const v = app.settings.get().video;
    const world = await World.create(app.engine, opts.map, {
      seed: opts.seed,
      shadows: v.shadows && v.quality !== 'low',
      shadowMapSize: v.quality === 'high' ? 2048 : 1024,
    });
    return new GameState(app, world, opts, cb);
  }

  playerRefs(): PlayerRef[] {
    this.localRef.speed = this.player.controller.speed;
    this.localRef.crouched = this.player.controller.crouched;
    return [this.localRef, ...this.remotePlayers()];
  }

  anyPlayerAlive(): boolean {
    return this.playerRefs().some((p) => p.target.alive);
  }

  scheduleRespawn(at: Vector3, seconds: number): void {
    this.respawnAt = at.clone();
    this.respawnT = seconds;
  }

  /** End the session and show results (rewards are added by the progression hook). */
  endSession(won: boolean, subtitle: string): void {
    if (this.ended) return;
    this.ended = true;
    this.stats.won = won;
    this.stats.time = Math.round(this.time);
    let shots = 0;
    let hits = 0;
    for (const t of this.weapons.tally.values()) {
      shots += t.shots;
      hits += t.hits;
    }
    this.stats.shots = shots;
    this.stats.hits = hits;
    this.hud.banner(won ? 'VICTORY' : 'DEFEAT', subtitle, 2500);
    setTimeout(() => {
      this.paused = true;
      this.app.input.setGameplayActive(false);
      const rewards = GameState.rewardHook ? GameState.rewardHook(this.stats, this.opts) : Promise.resolve(null);
      void rewards.then((el) =>
        this.app.screens.push(new ResultsScreen(this.app, this.stats, won, subtitle, el, () => this.cb.restart(), () => this.cb.quit())),
      );
    }, 1800);
  }

  get simulating(): boolean {
    return !this.paused;
  }

  enter(): void {
    this.app.input.setGameplayActive(true);
    this.app.input.touch.setControlHidden('interact', true);
    this.mode?.start();
  }

  exit(): void {
    this.app.input.setGameplayActive(false);
    this.app.debug.extra.delete('player');
    this.app.debug.extra.delete('ai');
    this.mode?.dispose();
    this.enemyMgr?.clear();
    this.pickups?.dispose();
    this.interactables?.dispose();
    this.hud.dispose();
    for (const d of this.dummies) d.dispose();
    this.grenades.dispose();
    this.weapons.dispose();
    this.target.dispose();
    this.vfx.dispose();
    this.player.dispose();
    this.world.dispose();
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.app.input.setGameplayActive(false);
    this.app.screens.push(
      new PauseScreen(
        this.app,
        () => {
          this.paused = false;
          this.app.input.setGameplayActive(true);
        },
        () => this.cb.quit(),
      ),
    );
  }

  private onPlayerDeath(): void {
    if (this.mode) {
      this.mode.onPlayerDeath();
      return;
    }
    this.hud.banner('DOWN', 'Respawning…', 2500);
    this.scheduleRespawn(this.world.layout.playerSpawns[0]!.pos, 3);
  }

  /** Proximity + hold-to-interact with objectives. */
  private updateInteract(dt: number): void {
    const ints = this.interactables;
    if (!ints) return;
    ints.update(dt);
    const it = this.player.alive ? ints.nearest(this.player.position) : null;
    if (it !== this.interactTarget) {
      if (this.interactTarget && !this.interactTarget.done) this.interactTarget.progress = 0;
      this.interactTarget = it;
    }
    this.app.input.touch.setControlHidden('interact', !it);
    if (!it) {
      this.hud.setInteract(null);
      return;
    }
    const holding = this.app.input.state.down('interact');
    if (holding) it.progress += dt;
    else it.progress = Math.max(0, it.progress - dt * 2);
    const pct = it.holdTime > 0 ? Math.min(1, it.progress / it.holdTime) : 0;
    this.hud.setInteract(it.holdTime > 0 ? `${it.label} (hold) ${pct > 0 ? Math.round(pct * 100) + '%' : ''}` : it.label);
    if ((it.holdTime === 0 && this.app.input.state.pressed('interact')) || (it.holdTime > 0 && it.progress >= it.holdTime)) {
      if (this.mode instanceof MissionMode) this.mode.onInteract(it);
      this.interactTarget = null;
      this.hud.setInteract(null);
    }
  }

  fixedUpdate(dt: number): void {
    const inp = this.app.input.state;
    if (inp.pressed('pause')) {
      this.pause();
      return;
    }
    this.time += dt;
    this.player.fixedUpdate(dt, inp);
    this.target.sync();
    this.weapons.fixedUpdate(dt, inp);
    this.ballistics.update(dt);
    this.grenades.update(dt);
    this.explosions.update();
    for (const d of this.dummies) d.update(dt);
    this.enemyMgr?.update(dt);
    this.pickups?.update(dt, [
      {
        feet: this.player.position,
        needs: (k) => this.player.alive && (k === 'health' ? this.target.health.hp < this.target.health.maxHp : true),
      },
    ]);
    this.updateInteract(dt);
    this.mode?.fixedUpdate(dt);
    this.target.health.update(dt);
    if (this.respawnT >= 0) {
      this.respawnT -= dt;
      if (this.respawnT < 0) {
        const sp = this.respawnAt ?? this.world.layout.playerSpawns[0]!.pos;
        this.player.controller.teleport(sp, this.player.cam.yaw);
        this.target.revive();
        // brief spawn protection
        this.target.damageMul = 0;
        setTimeout(() => (this.target.damageMul = 1), 2000);
        this.respawnAt = null;
      }
    }
  }

  /** Aim assist for controller/touch: friction + magnetism + ADS snap. */
  private applyAimAssist(look: { x: number; y: number }, dt: number): void {
    const mode = this.app.input.mode;
    if (mode === 'kbm') return;
    const s = this.app.settings.get();
    const level = mode === 'gamepad' ? s.gamepad.aimAssist : s.touch.aimAssist;
    if (level === 'off') return;
    const cam = this.player.cam;
    const cp = cam.camera.position;
    const targets: AimTarget[] = [];
    for (const t of this.registry.hostiles('player')) {
      t.aimPoint(this.tmp);
      const dx = this.tmp.x - cp.x;
      const dy = this.tmp.y - cp.y;
      const dz = this.tmp.z - cp.z;
      const dist = Math.hypot(dx, dy, dz);
      targets.push({ yaw: Math.atan2(dx, dz), pitch: Math.asin(dy / Math.max(dist, 1e-3)), distance: dist });
    }
    const adsStart = this.player.ads && !this.prevAds;
    const r = computeAssist(level, cam.yaw, cam.pitch, targets, Math.hypot(look.x, look.y) / Math.max(dt, 1e-3) / 3, this.player.controller.speed > 0.5, adsStart, dt);
    look.x = look.x * r.lookScale + r.dYaw;
    look.y = look.y * r.lookScale + r.dPitch;
  }

  frameUpdate(dt: number, alpha: number): void {
    const look = this.app.input.state.consumeLook();
    if (dt > 0) this.applyAimAssist(look, dt);
    this.prevAds = this.player.ads;
    this.app.input.setAds(this.player.ads);
    this.player.frameUpdate(dt, alpha, look);
    this.vfx.update(dt);
    this.mode?.frameUpdate(dt);
    this.updateHud();
  }

  private updateHud(): void {
    const cam = this.player.cam;
    const w = this.weapons.current;
    // crosshair on target?
    const o = cam.camera.position;
    const hit = this.ballistics.ray(o, o.add(cam.forward.scale(w.def.range)), MASK.PLAYER_SHOT);
    this.onTarget = !!(hit.target && hit.target.alive && hit.target.team === 'enemy');
    const hfov = cam.camera.fov;
    const spreadPx = (Math.tan((this.weapons.currentSpread() * Math.PI) / 180) / Math.tan(hfov / 2)) * (window.innerWidth / 2);
    const th = this.target.health;
    const f: HudFrame = {
      hp: th.hp,
      maxHp: th.maxHp,
      shield: th.shield,
      maxShield: th.maxShield,
      weapon: w.def.name,
      mag: w.mag,
      magSize: w.stats.magSize,
      reserve: this.weapons.infiniteAmmo ? Infinity : w.reserve,
      grenades: this.weapons.grenades,
      reloadProgress: this.weapons.reloadProgress,
      spreadPx,
      onTarget: this.onTarget,
      ads: this.player.cam.ads > 0.5,
      yaw: cam.yaw,
      markers: [],
    };
    const blips: Blip[] = [];
    for (const t of this.registry.hostiles('player')) {
      t.center(this.tmp);
      blips.push({ x: this.tmp.x, z: this.tmp.z, kind: 'enemy' });
    }
    for (const g of this.grenades.positions()) blips.push({ x: g.x, z: g.z, kind: 'danger' });
    blips.push(...this.extraBlips());
    for (const b of blips) {
      if (b.kind === 'objective') f.markers.push({ bearing: Math.atan2(b.x - this.player.position.x, b.z - this.player.position.z), kind: 'objective' });
    }
    this.hud.update(f);
    const p = this.player.controller.renderPos;
    this.minimap.draw(performance.now(), p.x, p.z, cam.yaw, blips);
  }
}
