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
import { playEmote } from '../cosmetics/emotes';
import { EventBus } from '../core/events';
import type { GameEvents } from './gameEvents';
import { attachGameAudio } from '../audio/gameAudio';
import type { QualityLevel } from '../core/quality';
import { MOVEMENT } from '../config/movement';
import { CoverController } from '../cover/coverController';
import { TraversalController } from '../player/traversal';
import { CornerController } from '../cover/cornerController';
import { noiseRadius } from '../player/movement';

export type { ModeId };

export interface GameOptions {
  map: MapDef;
  mode: ModeId;
  seed: number;
  difficulty?: Difficulty;
  look?: AvatarLook;
  loadout?: LoadoutEntry[];
  /** Equipped emote ids (quick slots). */
  emotes?: string[];
  /** Coop: attaches the host/client sim. Provided by `src/net` (dynamically imported), never by single player. */
  net?: NetHooks;
}

/** What the coop layer plugs into a session. */
export interface NetAttachment {
  /** After the local simulation, every fixed step. */
  fixedUpdate(dt: number): void;
  frameUpdate(dt: number): void;
  /** Local player died. Return true if the net layer handles it (respawn/revive). */
  onLocalDeath(): boolean;
  /** Host: the session ended (broadcast results). */
  onEnd?(won: boolean, subtitle: string): void;
  /** Host: revive every downed player (wave cleared). */
  reviveAll?(): void;
  /** Extra pickers for pickups (host: remote players). */
  pickers?(): { id: string; feet: Vector3; needs: (k: 'ammo' | 'health') => boolean }[];
  onPickup?(kind: 'ammo' | 'health', who: string): void;
  blips?(): Blip[];
  dispose(): void;
}

export interface NetHooks {
  role: 'host' | 'client';
  attach(g: GameState): NetAttachment;
}

export interface SessionCallbacks {
  quit(): void;
  restart(): void;
}

/** Hook for progression (Phase 6): turns session stats into rewards shown on the results screen. */
export type RewardHook = (stats: SessionStats, opts: GameOptions) => Promise<HTMLElement | null>;

/** A play session on one map: world, player, combat systems, HUD. Modes plug in on top. */
const TRAVERSE_LABEL: Record<string, string> = { step: 'Step up', vault: 'Vault', mantle: 'Climb', drop: 'Drop down', none: '' };

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
  readonly cover: CoverController;
  readonly traversal: TraversalController;
  readonly corners: CornerController;
  /** Current footstep noise radius (m), for the HUD and tests. */
  noise = 0;
  private noiseT = 0;
  readonly dummies: TrainingDummy[] = [];
  private paused = false;
  private menuOpen = false;
  /** Set on exit: a quit triggered mid-tick must not run this tick's remaining updates on disposed objects. */
  private exited = false;
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
  readonly events = new EventBus<GameEvents>();
  private audio: { frame(dt: number): void; dispose(): void } | null = null;
  private localRef: PlayerRef;
  /** Coop attachment (null in single player). */
  net: NetAttachment | null = null;
  /** Coop client: enemies, waves and objectives are driven by the host. */
  readonly puppet: boolean;

  private constructor(
    readonly app: App,
    readonly world: World,
    readonly opts: GameOptions,
    private cb: SessionCallbacks,
  ) {
    this.scene = world.scene;
    this.puppet = opts.net?.role === 'client';
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
    this.cover = new CoverController(this.scene, this.player, world.level.coverSegments, () => app.settings.get());
    this.traversal = new TraversalController(this.scene, this.player);
    this.corners = new CornerController(this.scene, this.player, world.level.coverSegments);
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
    this.player.onLand = (v) => {
      this.vfx.landDust(this.player.position, Math.min(1.5, v / 8));
      this.player.cam.shake(Math.min(0.25, v * 0.02));
    };
    this.explosions.onExplode = (pos, radius) => {
      const d = Vector3.Distance(pos, this.player.position);
      this.player.cam.shake(Math.max(0, 0.9 - d / (radius * 3)));
      if (d < radius * 2) app.input.rumble(1, 1, 220);
    };

    if (this.puppet) {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      if (opts.mode !== 'sandbox') w.pickups = new Pickups(this.scene, world.parts, world.layout.pickups);
      // health is host-authoritative: local damage never applies
      this.target.damageMul = 0;
    } else if (opts.mode !== 'sandbox') {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      w.nav = buildNavGrid(this.scene, world.level, spawn.pos);
      w.enemyMgr = new EnemyManager(this.scene, world, w.nav, this.registry, this.ballistics, this.vfx, opts.difficulty ?? 'normal', () => this.playerRefs());
      w.enemyMgr.onKilled = (e, h) => {
        // own kills only (coop teammates are credited by the net layer); barrels count for whoever is local
        if (h.attackerId === 'local' || h.attackerId === '') {
          this.stats.kills++;
          this.stats.byKind[e.def.kind]++;
          if (h.part === 'head') this.stats.headshots++;
        }
        if (h.attackerId === 'local') this.hud.feedItem(`${e.def.name} ${h.part === 'head' ? 'headshot' : 'down'}  +${e.def.xp} XP`, 'kill');
        this.mode?.onEnemyKilled(e, h);
      };
      w.pickups = new Pickups(this.scene, world.parts, world.layout.pickups);
      w.pickups.onPickup = (k, who) => {
        if (who !== 'local') {
          this.net?.onPickup?.(k, who);
          return;
        }
        this.events.emit('pickup', { kind: k });
        if (k === 'health') this.target.health.heal(50);
        else this.weapons.addAmmo(0.5);
        this.hud.feedItem(k === 'health' ? '+50 health' : 'Ammo refilled');
      };
      w.interactables = new Interactables(this.scene, world.parts);
      w.mode = opts.mode === 'wave' ? new WaveMode(this) : new MissionMode(this);
      this.extraBlips = () => [...(this.mode?.blips() ?? []), ...(this.pickups?.blips() ?? []), ...(this.net?.blips?.() ?? [])];
      app.debug.extra.set('ai', () => `enemies ${this.enemyMgr?.alive ?? 0} nav ${this.nav?.w}x${this.nav?.h}`);
    }

    if (this.puppet || opts.mode === 'sandbox') {
      this.extraBlips = () => [...(this.pickups?.blips() ?? []), ...(this.net?.blips?.() ?? [])];
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

    app.debug.controllerCapsules = () => [{ feet: this.player.position, height: this.player.controller.capsuleHeight, radius: MOVEMENT.radius }];
    app.debug.extra.set('player', () => {
      const c = this.player.controller;
      return `${c.grounded ? 'ground' : 'air'} spd ${c.speed.toFixed(1)}${c.crouched ? ' crouch' : ''}${c.isRolling ? ' roll' : ''}`;
    });
  }

  static async create(app: App, opts: GameOptions, cb: SessionCallbacks): Promise<GameState> {
    const v = app.settings.get().video;
    // Shadow generator exists whenever the user allows shadows; quality levels toggle it live.
    const world = await World.create(app.engine, opts.map, {
      seed: opts.seed,
      shadows: v.shadows,
      shadowMapSize: v.quality === 'high' ? 2048 : 1024,
    });
    const g = new GameState(app, world, opts, cb);
    if (opts.net) g.net = opts.net.attach(g);
    return g;
  }

  applyQuality(level: QualityLevel, userShadows: boolean): void {
    this.world.setShadows(level.shadows && userShadows, level.shadowRefresh);
    this.vfx.density = level.vfxDensity;
  }

  playerRefs(): PlayerRef[] {
    this.localRef.speed = this.player.controller.speed;
    this.localRef.crouched = this.player.controller.crouched;
    return [this.localRef, ...this.remotePlayers()];
  }

  anyPlayerAlive(): boolean {
    return this.playerRefs().some((p) => p.target.alive);
  }

  /** Revive the local player (if down) and, in coop, everyone else. */
  reviveAll(): void {
    if (!this.player.alive && this.respawnT < 0) this.scheduleRespawn(this.world.layout.playerSpawns[0]!.pos, 0.5);
    this.net?.reviveAll?.();
  }

  scheduleRespawn(at: Vector3, seconds: number): void {
    this.respawnAt = at.clone();
    this.respawnT = seconds;
  }

  /** End the session and show results (rewards are added by the progression hook). */
  endSession(won: boolean, subtitle: string): void {
    if (this.ended) return;
    this.ended = true;
    this.net?.onEnd?.(won, subtitle);
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

  get isEnded(): boolean {
    return this.ended;
  }

  get simulating(): boolean {
    return !this.paused;
  }

  enter(): void {
    this.audio = attachGameAudio(this.app, this);
    this.app.input.setGameplayActive(true);
    this.app.input.touch.setControlHidden('interact', true);
    this.app.input.touch.setControlHidden('cover', true);
    this.mode?.start();
  }

  exit(): void {
    this.exited = true;
    this.net?.dispose();
    this.net = null;
    this.audio?.dispose();
    this.app.input.setGameplayActive(false);
    this.app.debug.extra.delete('player');
    this.app.debug.controllerCapsules = null;
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
    if (this.paused || this.menuOpen) return;
    // coop never freezes the shared simulation; the menu just takes the input
    if (this.net) this.menuOpen = true;
    else this.paused = true;
    this.app.input.setGameplayActive(false);
    this.app.screens.push(
      new PauseScreen(
        this.app,
        () => {
          this.paused = false;
          this.menuOpen = false;
          this.app.input.setGameplayActive(true);
        },
        () => this.cb.quit(),
        this.emoteBar(),
      ),
    );
  }

  /** Play an emote on the local player (also broadcast in coop). */
  emote(id: string): void {
    if (!id || !this.player.alive) return;
    if (playEmote(this.player.rig, id)) {
      this.onEmote?.(id);
      this.events.emit('emote', { id });
    }
  }

  onEmote: ((id: string) => void) | null = null;

  private onPlayerDeath(): void {
    if (this.net?.onLocalDeath()) return;
    if (this.mode) {
      this.mode.onPlayerDeath();
      return;
    }
    this.hud.banner('DOWN', 'Respawning…', 2500);
    this.scheduleRespawn(this.world.layout.playerSpawns[0]!.pos, 3);
  }

  private emoteBar(): HTMLElement | null {
    const ids = (this.opts.emotes ?? []).filter(Boolean);
    if (!ids.length) return null;
    const bar = document.createElement('div');
    bar.className = 'emote-bar';
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.dataset.focus = '';
      b.textContent = id[0]!.toUpperCase() + id.slice(1);
      b.addEventListener('click', () => {
        this.app.screens.pop();
        this.paused = false;
        this.menuOpen = false;
        this.app.input.setGameplayActive(true);
        this.emote(id);
      });
      bar.appendChild(b);
    }
    return bar;
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
    if (this.exited) return;
    const inp = this.app.input.state;
    if (inp.pressed('pause')) {
      this.pause();
      return;
    }
    this.time += dt;
    // quick emotes on the d-pad (right, down, left)
    const quick = (['quick2', 'quick3', 'quick4'] as const).findIndex((q) => inp.pressed(q));
    if (quick >= 0) this.emote(this.opts.emotes?.[quick] ?? '');
    if (this.player.rig.emote && (Math.hypot(inp.move.x, inp.move.y) > 0.2 || inp.down('fire') || inp.down('ads'))) this.player.rig.emote = null;
    if (!this.traversal.active) this.cover.fixedUpdate(dt, inp);
    this.traversal.fixedUpdate(dt, inp.pressed('jump'), this.cover.state !== 'none', this.cover.exitDir);
    this.corners.fixedUpdate(dt, this.cover.state === 'none' && !this.traversal.active);
    this.weapons.spreadMul = this.cover.spreadMul;
    this.player.fixedUpdate(dt, inp);
    this.target.sync();
    this.weapons.fixedUpdate(dt, inp);
    this.ballistics.update(dt);
    this.grenades.update(dt);
    this.explosions.update();
    for (const d of this.dummies) d.update(dt);
    // footsteps make noise that scales with speed (creeping is near silent, dashing carries)
    this.noiseT -= dt;
    if (this.noiseT <= 0) {
      this.noiseT = 0.25;
      const c = this.player.controller;
      this.noise = this.player.alive ? noiseRadius(c.speed, c.crouched, c.dashing) : 0;
      if (this.noise > 0) this.enemyMgr?.noise(this.player.position, this.noise);
    }
    this.enemyMgr?.update(dt);
    if (this.puppet) this.pickups?.update(dt, []);
    else
      this.pickups?.update(dt, [
        {
          id: 'local',
          feet: this.player.position,
          needs: (k) => this.player.alive && (k === 'health' ? this.target.health.hp < this.target.health.maxHp : true),
        },
        ...(this.net?.pickers?.() ?? []),
      ]);
    this.updateInteract(dt);
    this.mode?.fixedUpdate(dt);
    this.net?.fixedUpdate(dt);
    this.target.health.update(dt);
    if (this.respawnT >= 0) {
      this.respawnT -= dt;
      if (this.respawnT < 0) {
        const sp = this.respawnAt ?? this.world.layout.playerSpawns[0]!.pos;
        this.cover.reset();
        this.traversal.reset();
        this.corners.reset();
        this.player.controller.teleport(sp, this.player.cam.yaw);
        this.target.revive();
        // brief spawn protection
        this.target.damageMul = 0;
        setTimeout(() => (this.target.damageMul = this.puppet ? 0 : 1), 2000);
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
    if (this.exited) return;
    const look = this.app.input.state.consumeLook();
    if (dt > 0) this.applyAimAssist(look, dt);
    this.prevAds = this.player.ads;
    this.app.input.setAds(this.player.ads);
    this.player.frameUpdate(dt, alpha, look);
    this.vfx.update(dt);
    this.audio?.frame(dt);
    this.mode?.frameUpdate(dt);
    this.net?.frameUpdate(dt);
    this.updateHud();
  }

  private coverLabel = '';
  private markerPt = new Vector3();


  /** Contextual cover prompt, state badge and touch button. */
  private updateCoverHud(): void {
    const c = this.cover;
    const st = c.state;
    const stateText =
      st === 'none' || st === 'vault' || st === 'dash'
        ? null
        : st === 'peek'
          ? c.low
            ? 'Aiming over'
            : 'Peeking'
          : st === 'blind'
            ? 'Blind fire'
            : c.low
              ? 'Low cover'
              : 'High cover';
    const prompt = st === 'none' && c.candidate ? (this.app.input.mode === 'gamepad' ? 'Hold: Take cover' : 'Take cover') : null;
    this.hud.setCover(prompt, stateText);
    // cover-to-cover marker over the target, projected to the screen
    const tg = c.state === 'in' ? c.target : null;
    if (tg) {
      this.markerPt.set(tg.x, this.player.position.y + (tg.seg.low ? 0.9 : 1.4), tg.z);
      Vector3.TransformCoordinatesToRef(this.markerPt, this.scene.getTransformMatrix(), this.markerPt);
      const vis = this.markerPt.z > 0 && this.markerPt.z < 1 && Math.abs(this.markerPt.x) < 1 && Math.abs(this.markerPt.y) < 1;
      const label = tg.kind === 'swat' ? 'SWAT turn' : 'Move to cover';
      this.hud.setCoverMarker(vis ? (this.markerPt.x * 0.5 + 0.5) * 100 : -1, (0.5 - this.markerPt.y * 0.5) * 100, label);
    } else this.hud.setCoverMarker(-1, 0, '');
    const th = this.traversal.hint;
    this.hud.setAction(th && !c.inCover ? (TRAVERSE_LABEL[th.kind] ?? null) : null);
    const show = !!c.candidate || c.inCover;
    const label = c.inCover ? 'in' : show ? 'av' : '';
    if (label !== this.coverLabel) {
      this.coverLabel = label;
      this.app.input.touch.setControlHidden('cover', !show);
    }
  }

  private updateHud(): void {
    const cam = this.player.cam;
    const w = this.weapons.current;
    // crosshair on target?
    const o = cam.camera.position;
    const hit = this.ballistics.ray(o, o.add(cam.forward.scale(w.def.range)), MASK.PLAYER_SHOT);
    this.onTarget = !!(hit.target && hit.target.alive && hit.target.team === 'enemy');
    // vertical FOV is fixed (Hor+): scale the spread by the half-height of the view
    const vfov = cam.camera.fov;
    const spreadPx = (Math.tan((this.weapons.currentSpread() * Math.PI) / 180) / Math.tan(vfov / 2)) * (window.innerHeight / 2);
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
    this.updateCoverHud();
    const p = this.player.controller.renderPos;
    this.minimap.draw(performance.now(), p.x, p.z, cam.yaw, blips);
  }
}
