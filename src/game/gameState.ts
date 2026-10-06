import type { App, AppState } from '../core/app';
import { Color3, CreateTorus, PhysicsRaycastResult, StandardMaterial, Vector3, type Mesh, type PhysicsEngine, type Scene } from '../core/babylon';
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
import { G, MASK } from '../physics/groups';
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
import { ClearMode } from './modes/clearMode';
import { roomAt } from '../world/rooms';
import { ResultsScreen } from '../ui/screens/resultsScreen';
import { playEmote } from '../cosmetics/emotes';
import { EventBus } from '../core/events';
import type { GameEvents } from './gameEvents';
import { attachGameAudio } from '../audio/gameAudio';
import type { QualityLevel } from '../core/quality';
import { MOVEMENT } from '../config/movement';
import { CoverController } from '../cover/coverController';
import type { CoverSegment } from '../cover/coverData';
import { TraversalController } from '../player/traversal';
import { anchorFirst, ATTACH_LABEL } from '../player/attachController';
import type { Ledge } from '../world/anchors';
import { bodyLightLevel, LIGHT, type LightDef } from '../world/lights';
import { CornerController } from '../cover/cornerController';
import { landingNoise, noiseRadius } from '../player/movement';
import { CinematicPost } from '../vfx/cinematicPost';
import { LkpGhost } from '../vfx/lkpGhost';
import { Silhouettes } from '../vfx/silhouettes';
import { VISION, VisionState } from './vision';
import { StealthSystems } from './stealthSystems';
import { SURFACE_NOISE, surfaceAt, type Surface } from '../world/surfaces';
import type { TouchAction } from '../input/touchControls';
import type { WorldPromptId } from '../ui/hud/worldPrompts';
import { coverQuality, exposureFraction, exposurePoints, segPointDist, Suppression, type CoverSpot, type P3 } from './tactics';
import { hyp2, hyp3 } from '../core/mathx';

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
/** Gunshot noise radius (m) x the weapon's noise stat; at or below `SUPPRESSED_NOISE` a shot only raises
 *  suspicion; a bullet impact is heard within `IMPACT_NOISE`. */
const SHOT_NOISE = 28;
const SUPPRESSED_NOISE = 0.6;
const IMPACT_NOISE = 4;

/** Touch action button: only for interactables now (cover and traversal prompts sit on the surfaces). */
const ACT_USE: TouchAction = { action: 'interact', label: 'Use', icon: 'interact' };
const TRAVERSE_LABEL: Record<string, string> = { step: 'Step up', vault: 'Vault', mantle: 'Climb', drop: 'Drop down', hop: 'Jump', none: '' };
/** World prompts sit low on the surface they act on, at one height per surface (m above its base). */
const PROMPT_Y = 0.55;
/** Along the face from the player in cover: the badge ahead, the vault prompt behind (m). */
const PROMPT_ALONG = 0.55;

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
  /** Floor surface under the player (footstep loudness / sound), sampled with the footstep noise. */
  surface: Surface = 'concrete';
  /** Light level on the player's body 0..1 (light meter, perception), sampled at `LIGHT.playerHz`. */
  lightLevel = 1;
  private lightT = 0;
  /** Incoming fire pressure on the local player (near misses, impacts close by). */
  readonly suppression = new Suppression();
  /** Fraction of the player visible to the best-placed threat (0..1), and the current cover's quality. */
  exposure = 0;
  coverQ = 1;
  private exposureT = 0;
  private roomT = 0;
  /** Room the local player is in (index into `world.layout.rooms`, -1 outside / untagged map). */
  currentRoom = -1;
  private expPts: P3[] = [];
  private expEyes: P3[] = [];
  private headTmp = new Vector3();
  private rayA = new Vector3();
  private rayB = new Vector3();
  private coverSpot: CoverSpot = { nx: 0, nz: 0, low: false, x: 0, z: 0 };
  private coverHeldT = 0;
  private swayT = 0;
  /** Cinematic post pass (vignette, grain, letterbox). */
  readonly post: CinematicPost;
  private postKey = '';
  private beatT = 0;
  private letterboxT = 0;
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
  /** Bodies, switches, shot-out lights and alarm panels (modes with enemies). */
  readonly stealth: StealthSystems | null = null;
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
    this.localRef = {
      id: 'local',
      target: this.target,
      feet: this.player.position,
      speed: 0,
      crouched: false,
      cover: null,
      coverT: 0,
      suppress: (from, to, hit) => {
        if (hit || !this.player.alive) return;
        const head = this.target.headPoint(this.headTmp);
        const before = this.suppression.value;
        this.suppression.nearMiss(segPointDist(from, to, head));
        this.suppression.impact(Vector3.Distance(to, head));
        // a close crack makes the body flinch away
        if (this.suppression.value - before > 0.05) this.player.rig.hit(0.35, from.x - head.x > 0 ? -1 : 1);
      },
    };
    this.hud = new Hud(app.uiRoot);
    this.hud.world.onTap = (id) => this.onWorldPrompt(id);
    this.hud.world.onDown = (id) => this.onWorldPromptHold(id, true);
    this.hud.world.onUp = (id) => this.onWorldPromptHold(id, false);
    this.cover = new CoverController(this.scene, this.player, world.level.coverSegments, () => app.settings.get());
    this.traversal = new TraversalController(this.scene, this.player, world.level.anchors);
    this.traversal.breakables = world.breakables;
    world.breakables.onOpen = (key, how, at) => this.onBreakable(key, how, at);
    this.post = new CinematicPost(this.player.cam.camera);
    this.ghost = new LkpGhost(this.scene);
    this.sonarMarks = new Silhouettes(this.scene, 'sonar', 12, new Color3(1, 0.55, 0.18), true);
    this.sonarRing = CreateTorus('sonarRing', { diameter: 1, thickness: 0.012, tessellation: 48 }, this.scene);
    const rm = new StandardMaterial('sonarRingMat', this.scene);
    rm.disableLighting = true;
    rm.emissiveColor = new Color3(1, 0.6, 0.25);
    rm.alpha = 0;
    this.sonarRing.material = rm;
    this.sonarRing.isPickable = false;
    this.sonarRing.setEnabled(false);
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
    // shots: a loud report puts everyone in earshot into combat; a suppressed one (noise x0.6 or less) only
    // makes them suspicious of where it came from
    this.weapons.events.onShot = () => {
      const n = this.weapons.current.stats.noise;
      const r = SHOT_NOISE * n;
      this.eventNoise(r);
      if (n <= SUPPRESSED_NOISE) this.enemyMgr?.hear(this.player.position, r);
      else this.enemyMgr?.noise(this.player.position, r);
    };
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
      w.enemyMgr.grenades = this.grenades;
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
      w.mode = opts.mode === 'wave' ? new WaveMode(this) : opts.mode === 'clear' ? new ClearMode(this) : new MissionMode(this);
      w.stealth = new StealthSystems(this, w.enemyMgr, w.interactables, (r, at) => {
        this.eventNoise(r);
        this.enemyMgr?.hear(at, r);
      });
      this.weapons.onRay = (a, b) => {
        this.stealth?.shotRay(a, b);
        // the round lands somewhere: a thud / ricochet close by is heard
        this.enemyMgr?.hear(b, IMPACT_NOISE);
      };
      this.extraBlips = () => [...(this.mode?.blips() ?? []), ...(this.pickups?.blips() ?? []), ...(this.net?.blips?.() ?? [])];
      app.debug.extra.set('ai', () => {
        const em = this.enemyMgr;
        if (!em) return '';
        const lv: Record<string, number> = {};
        let top = 0;
        for (const e of em.enemies) {
          if (!e.alive) continue;
          lv[e.level] = (lv[e.level] ?? 0) + 1;
          if (e.meter > top) top = e.meter;
        }
        const by = Object.entries(lv).map(([k, n]) => `${k} ${n}`).join(' ');
        return `enemies ${em.alive} ${by} | meter ${top.toFixed(2)} lkp ${em.lkpValid ? `${em.lkp.x.toFixed(1)},${em.lkp.z.toFixed(1)}` : '-'} light ${this.lightLevel.toFixed(2)}${em.stealth ? ' stealth' : ''}`;
      });
    }

    if (this.puppet || opts.mode === 'sandbox') {
      this.extraBlips = () => [...(this.pickups?.blips() ?? []), ...(this.net?.blips?.() ?? [])];
    }
    // doors collide from now on (the nav grid, built above, walks through doorways); co-op clients do not sync
    // door state yet, so theirs stand open
    if (this.puppet) world.doors.openAll();
    else world.doors.arm();
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
      const stance = c.kneeling ? ' kneel' : c.crouched ? ' crouch' : '';
      return `${c.grounded ? 'ground' : 'air'} spd ${c.speed.toFixed(2)}${stance} ${c.sprinting ? ' sprint' : ''}${c.pivotT > 0 ? ' pivot' : ''}`;
    });
    app.debug.extra.set('carry', () => {
      const k = this.player.carry;
      return `${k.ready} raise ${k.raise.toFixed(2)} w ${k.w.low.toFixed(2)}/${k.w.high.toFixed(2)}/${k.w.compressed.toFixed(2)} wt ${this.player.weaponWeight.toFixed(2)}`;
    });
    app.debug.extra.set('cover', () => {
      const c = this.cover;
      const pose = this.player.coverPose;
      return `${c.state} face ${c.faceDir} swaps ${c.swaps} lean ${pose.lean.toFixed(2)} q ${this.coverQ.toFixed(2)} trav ${this.traversal.kind}${this.corners.door ? ' door' : ''}`;
    });
    app.debug.extra.set('combat', () => `exposure ${this.exposure.toFixed(2)} suppress ${this.suppression.value.toFixed(2)} noise ${this.noise.toFixed(1)}m`);
    let lastLimited = 0;
    app.debug.extra.set('anim', () => {
      const r = this.player.rig;
      const w = r.graph.weights;
      const top = (Object.entries(w) as [string, number][]).filter(([, v]) => v > 0.01).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ');
      const layers = Object.entries(r.lastTargets?.layers ?? {}).filter(([, v]) => v > 0.01).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ');
      // joint-rate limiter hits since the last paint: > 0 means a pose tried to snap (a blend bug)
      const lim = r.limited - lastLimited;
      lastLimited = r.limited;
      return `${top} | ${layers}${lim > 0 ? `  !limit x${lim}` : ''}`;
    });
    app.debug.addTrace('bob', () => this.player.rig.lastTargets?.weaponBob ?? 0, 0.03);
    // velocity (white, top = 4 m/s) and acceleration (yellow, top = 3 m/s^2)
    app.debug.addTrace('speed', () => this.player.controller.motion.speed * 2 - 4, 4, '#ffffff');
    app.debug.addTrace('accel', () => this.player.controller.motion.accel, 3, '#ffd34d');
    // camera angular speed (pink, top = 3 rad/s): spikes would be snaps
    app.debug.addTrace('cam', () => Math.min(3, this.player.cam.angVel) * 2 - 3, 3, '#ff7ad9');
    app.debug.extra.set('clips', () => {
      const r = this.player.rig;
      const g = r.graph;
      const clips = g.activeClips().map((c) => `${c.name} ${c.w.toFixed(2)}@${c.t.toFixed(2)}`).join(' | ');
      const pl = r.planner;
      return `${clips}\nsync ${g.phase.toFixed(2)} inert ${g.inert.maxOffset.toFixed(3)} (${g.inert.count}) feet ${pl.L.contact ? 'L' : '-'}${pl.R.contact ? 'R' : '-'} slide ${(pl.L.slide + pl.R.slide).toFixed(3)}m motion ${this.player.controller.motion.state}`;
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
    this.world.lightRig.active = level.realLights;
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
    this.app.input.touch.setAction(null);
    this.mode?.start();
  }

  exit(): void {
    this.exited = true;
    // never leave the loop in slow motion
    this.app.loop.timeScale = 1;
    this.post.dispose();
    this.net?.dispose();
    this.net = null;
    this.audio?.dispose();
    this.app.input.setGameplayActive(false);
    for (const k of ['player', 'carry', 'cover', 'combat', 'anim', 'clips']) this.app.debug.extra.delete(k);
    for (const k of ['bob', 'speed', 'accel', 'cam']) this.app.debug.removeTrace(k);
    this.app.debug.controllerCapsules = null;
    this.app.debug.extra.delete('ai');
    this.mode?.dispose();
    this.enemyMgr?.clear();
    this.pickups?.dispose();
    this.stealth?.dispose();
    this.interactables?.dispose();
    this.hud.dispose();
    this.app.input.touch.setControlHidden('action', false);
    this.app.input.touch.setAction(null);
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
    const carryIt = this.stealth?.carryTarget(this.player.position) ?? null;
    const it = carryIt ?? (this.player.alive ? ints.nearest(this.player.position) : null);
    if (it !== this.interactTarget) {
      if (this.interactTarget && !this.interactTarget.done) this.interactTarget.progress = 0;
      this.interactTarget = it;
    }
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
      if (it.onUse) it.onUse(it);
      else if (this.mode instanceof MissionMode) this.mode.onInteract(it);
      this.interactTarget = null;
      this.hud.setInteract(null);
    }
  }

  /** Glass shattering and grates kicked in are loud; an unscrewed grate is silent. */
  private onBreakable(key: string, how: 'break' | 'kick' | 'unscrew', at: Vector3): void {
    const r = how === 'break' ? 15 : how === 'kick' ? 10 : 0;
    if (key.startsWith('glass')) this.vfx.sparks(at, Vector3.Up(), 14, '#cfeaf5');
    else this.vfx.dust(at, Vector3.Up(), '#7a8086');
    if (r <= 0) return;
    this.eventNoise(r);
    this.enemyMgr?.hear(at, r);
  }

  private landSeen = 0;
  /** Loudest one-off noise (glass, kicks, landings) and how long it still shows on the noise meter (s). */
  private evNoise = 0;
  private evNoiseT = 0;

  private eventNoise(r: number): void {
    this.evNoise = Math.max(this.evNoise, r);
    this.evNoiseT = 0.8;
    this.noise = Math.max(this.noise, r);
  }

  /** Landings make noise by how hard they were (a heavy landing carries). */
  private landingNoise(): void {
    const c = this.player.controller;
    if (c.landings === this.landSeen) return;
    this.landSeen = c.landings;
    const r = landingNoise(c.lastLanding);
    if (r <= 0 || !this.player.alive) return;
    this.eventNoise(r);
    this.enemyMgr?.hear(this.player.position, r);
  }

  /** Player light level at `LIGHT.playerHz`; lights blocked by level geometry do not count. */
  private updateLight(dt: number): void {
    const reg = this.world.level.lights;
    reg.update(dt);
    this.lightT -= dt;
    if (this.lightT > 0) return;
    this.lightT = 1 / LIGHT.playerHz;
    const p = this.player.position;
    const h = 1.75 * (1 - 0.35 * this.player.controller.crouchBlend);
    this.lightLevel = reg.lights.length ? bodyLightLevel(reg, p.x, p.y, p.z, h, this.lightOccluder) : reg.ambientAt(p.x, p.y + h * 0.6, p.z);
    this.localRef.light = this.lightLevel;
  }

  private lightFrom = new Vector3();
  private lightTo = new Vector3();
  private lightRay = new PhysicsRaycastResult();
  /** Static geometry between a light and a point (allocation-free; only runs for lights in range). */
  private readonly lightOccluder = (l: LightDef, x: number, y: number, z: number): boolean => {
    this.lightFrom.set(l.x, l.y, l.z);
    // stop short of the body so the player's own hit volumes never count
    const d = Vector3.Distance(this.lightFrom, this.lightTo.set(x, y, z));
    if (d < 0.3) return false;
    this.lightTo.subtractInPlace(this.lightFrom).scaleInPlace((d - 0.25) / d).addInPlace(this.lightFrom);
    this.lightRay.reset();
    (this.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(this.lightFrom, this.lightTo, this.lightRay, { membership: G.PROJECTILE, collideWith: G.STATIC });
    return this.lightRay.hasHit;
  };

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
    if (this.player.rig.emote && (hyp2(inp.move.x, inp.move.y) > 0.2 || inp.down('fire') || inp.down('ads'))) this.player.rig.emote = null;
    const coverWas = this.cover.state;
    // a body on the shoulder: no cover, no traversal, weapon stowed, slow
    const carrying = this.stealth?.carrying ?? false;
    if (!this.traversal.active && !carrying) this.cover.fixedUpdate(dt, inp);
    // cover shot away / destroyed under the player: stumble out of it
    if (coverWas !== 'none' && this.cover.state === 'none' && this.cover.sm.reason === 'gone') this.stumble();
    // Y / E is contextual: an interactable in reach takes it, else it traverses
    const ti = this.traversal.input;
    ti.moveX = inp.move.x;
    ti.moveY = inp.move.y;
    ti.camYaw = this.player.cam.yaw;
    ti.dropPressed = inp.pressed('drop');
    ti.dropHeld = inp.down('drop');
    ti.dropHeldT = inp.heldTime('drop');
    ti.useHeld = inp.down('interact');
    ti.useHeldT = inp.heldTime('interact');
    ti.sprintHeld = inp.down('dash');
    this.traversal.fixedUpdate(dt, inp.pressed('jump') && !this.interactTarget && !carrying, this.cover.state !== 'none', this.cover.exitDir);
    // attached (ladder, pipe, hang, duct) or carrying a body: both hands busy, the weapon goes to its slot
    this.weapons.setStowed((this.traversal.attached && !!this.traversal.attach.spec?.holster) || carrying);
    this.player.cam.attach = this.traversal.cameraPreset;
    this.player.cam.attachYaw = this.player.controller.yaw;
    this.corners.fixedUpdate(dt, this.cover.state === 'none' && !this.traversal.active);
    this.stealth?.fixedUpdate();
    this.suppression.update(dt);
    this.weapons.spreadMul = this.cover.spreadMul * this.suppression.spreadMul;
    this.player.fixedUpdate(dt, inp);
    this.target.sync();
    this.weapons.fixedUpdate(dt, inp);
    this.ballistics.update(dt);
    this.grenades.update(dt);
    this.world.doors.update(dt);
    this.explosions.update();
    for (const d of this.dummies) d.update(dt);
    // footsteps make noise that scales with speed (creeping is near silent, dashing carries)
    this.noiseT -= dt;
    this.evNoiseT -= dt;
    if (this.evNoiseT <= 0) this.evNoise = 0;
    if (this.noiseT <= 0) {
      this.noiseT = 0.25;
      const c = this.player.controller;
      const pp = this.player.position;
      this.surface = surfaceAt(this.world.level.surfaces, pp.x, pp.y, pp.z, this.world.map.theme.floor ?? 'concrete');
      const steps = this.player.alive ? noiseRadius(c.speed, c.crouched, c.dashing) * SURFACE_NOISE[this.surface] : 0;
      if (steps > 0) this.enemyMgr?.hear(this.player.position, steps);
      this.noise = Math.max(steps, this.evNoise);
    }
    this.updateLight(dt);
    this.updateVision(dt);
    this.landingNoise();
    this.updateCoverRef(dt);
    this.updateExposure(dt);
    this.updateRoomTag(dt);
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
        this.suppression.reset();
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
  private assistScale = 1;
  /** Enemy blips on the minimap last frame (tests). */
  enemyBlips = 0;

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
      const dist = hyp3(dx, dy, dz);
      targets.push({ yaw: Math.atan2(dx, dz), pitch: Math.asin(dy / Math.max(dist, 1e-3)), distance: dist });
    }
    const adsStart = this.player.ads && !this.prevAds;
    const r = computeAssist(level, cam.yaw, cam.pitch, targets, hyp2(look.x, look.y) / Math.max(dt, 1e-3) / 3, this.player.controller.speed > 0.5, adsStart, dt);
    // the slowdown eases in and out over ~60 ms so sweeping across a target never jolts the view
    this.assistScale += (r.lookScale - this.assistScale) * (1 - Math.exp(-dt / 0.06));
    look.x = look.x * this.assistScale + r.dYaw;
    look.y = look.y * this.assistScale + r.dPitch;
  }

  frameUpdate(dt: number, alpha: number): void {
    if (this.exited) return;
    const look = this.app.input.state.consumeLook();
    if (dt > 0) this.applyAimAssist(look, dt);
    this.prevAds = this.player.ads;
    this.app.input.setAds(this.player.ads);
    // suppression: the aim wanders (smooth, small) while rounds are cracking past
    const sway = this.suppression.sway;
    if (sway > 0 && dt > 0) {
      this.swayT += dt;
      look.x += Math.cos(this.swayT * 2.3) * sway * 2.3 * dt;
      look.y += Math.cos(this.swayT * 1.7 + 1) * sway * 1.2 * dt;
    }
    this.traversal.frameUpdate(dt, alpha);
    this.stealth?.frameUpdate();
    this.player.frameUpdate(dt, alpha, look, this.app.input.state.move);
    this.updateCinematic(dt);
    this.enemyMgr?.frameUpdate(dt, alpha);
    this.updateStealthHud(dt);
    this.renderVision();
    this.vfx.update(dt);
    this.audio?.frame(dt);
    this.mode?.frameUpdate(dt);
    this.net?.frameUpdate(dt);
    this.updateHud();
  }

  /** Last Known Position ghost (stealth rules only). */
  ghost: LkpGhost;
  /** Goggles (night vision / sonar), the sonar's enemy marks and its pulse ring. */
  readonly vision = new VisionState();
  sonarMarks: Silhouettes;
  private sonarRing: Mesh;

  /** Goggles per fixed step: the button cycles modes; a sonar pulse marks every enemy in range. */
  private updateVision(dt: number): void {
    const v = this.vision;
    if (this.app.input.state.pressed('vision') && this.player.alive) {
      v.cycle();
      this.events.emit('vision', { mode: v.mode });
    }
    if (!v.step(dt)) return;
    this.events.emit('sonar', {});
    const m = this.sonarMarks;
    m.begin();
    const p = this.player.position;
    for (const e of this.enemyMgr?.enemies ?? []) {
      if (!e.alive || hyp2(e.pos.x - p.x, e.pos.z - p.z) > VISION.sonarRange) continue;
      if (!m.add(e.bodyRig)) break;
    }
    m.end();
  }

  /** Goggles per render frame: night vision blend, sonar marks fading, the pulse ring growing. */
  private renderVision(): void {
    const v = this.vision;
    this.post.setNightVision(v.night);
    this.sonarMarks.setAlpha(v.markAlpha * 0.6);
    const t = v.sincePulse;
    const ring = this.sonarRing;
    if (t < 0.9) {
      const r = (t / 0.9) * VISION.sonarRange;
      ring.setEnabled(true);
      ring.position.copyFrom(this.player.position);
      ring.position.y += 0.15;
      ring.scaling.set(r * 2, 1, r * 2);
      (ring.material as StandardMaterial).alpha = 0.5 * (1 - t / 0.9);
    } else if (ring.isEnabled()) ring.setEnabled(false);
    this.hud.setVision(v.mode, v.cooldown);
  }

  /**
   * Stealth HUD per render frame: awareness arcs round the crosshair (enemies noticing: white filling, red
   * once detected and in sight), the light meter, and the LKP ghost where the hunters think the player is
   * (while nobody sees them).
   */
  private updateStealthHud(dt: number): void {
    const arcs = this.hud.arcs;
    arcs.begin();
    const em = this.enemyMgr;
    const p = this.player.position;
    const camYaw = this.player.cam.yaw;
    if (em && !this.puppet) {
      for (const e of em.enemies) {
        if (!e.alive) continue;
        const red = e.alerted && e.sinceSeen < 0.6;
        if (!red && (e.alerted || e.meter < 0.02)) continue;
        const b = Math.atan2(e.pos.x - p.x, e.pos.z - p.z) - camYaw;
        arcs.add(Math.atan2(Math.sin(b), Math.cos(b)), e.meter, red);
      }
    }
    arcs.end();
    this.hud.setLight(this.lightLevel, this.lightLevel < LIGHT.shadow);
    // ghost: frozen at the last sighting; shown once the hunters have lost sight of the player
    const g = this.ghost;
    if (em && em.stealth) {
      if (em.sightT < 0.25 && em.lkpValid) g.capture(this.player.rig, em.lkp);
      g.show = em.lkpValid && em.sightT > 0.6 && em.hunting && hyp2(g.at.x - em.lkp.x, g.at.z - em.lkp.z) < 1.5;
    } else g.show = false;
    g.update(dt);
  }

  /** Publish the player's cover (for enemy flanking / grenades) and how long it has been held. */
  private updateCoverRef(dt: number): void {
    const c = this.cover;
    const seg = c.inCover ? c.seg : null;
    if (seg) {
      const sp = this.coverSpot;
      sp.nx = seg.nx;
      sp.nz = seg.nz;
      sp.low = c.low;
      sp.x = this.player.position.x;
      sp.z = this.player.position.z;
      this.coverHeldT += dt;
      this.localRef.cover = sp;
    } else {
      this.coverHeldT = 0;
      this.localRef.cover = null;
    }
    this.localRef.coverT = this.coverHeldT;
  }

  /** Room tag (4 Hz) on maps with tagged rooms; Clear mode marks cleared rooms. */
  private updateRoomTag(dt: number): void {
    const rooms = this.world.layout.rooms;
    if (!rooms?.length) return;
    this.roomT -= dt;
    if (this.roomT > 0) return;
    this.roomT = 0.25;
    const p = this.player.position;
    const ri = roomAt(rooms, p.x, p.z);
    this.currentRoom = ri;
    // Clear mode shows no room names (only the hostiles left)
    this.hud.setRoom(ri >= 0 && !(this.mode instanceof ClearMode) ? rooms[ri]!.name : null);
  }

  /** Exposure sampling (4 Hz): rays from the nearest alerted threats' eyes to points on the player's volumes. */
  private updateExposure(dt: number): void {
    this.exposureT -= dt;
    if (this.exposureT > 0) return;
    this.exposureT = 0.25;
    const eyes = this.expEyes;
    eyes.length = 0;
    const p = this.player;
    for (const e of this.enemyMgr?.enemies ?? []) {
      if (!e.alive || !e.alerted || e.def.melee) continue;
      if (Vector3.Distance(e.pos, p.position) > 45) continue;
      eyes.push({ x: e.pos.x, y: e.pos.y + 1.55 * e.def.scale, z: e.pos.z });
      if (eyes.length >= 4) break;
    }
    const c = p.controller;
    exposurePoints(p.position, c.crouchBlend, Math.cos(c.yaw), -Math.sin(c.yaw), p.coverPose.lean, this.expPts);
    this.exposure = exposureFraction(this.expPts, eyes, (a, b) => {
      this.rayA.set(a.x, a.y, a.z);
      this.rayB.set(b.x, b.y, b.z);
      const h = this.ballistics.ray(this.rayA, this.rayB, G.STATIC);
      return h.hit && h.distance < Vector3.Distance(this.rayA, this.rayB) - 0.15;
    });
    this.coverQ = this.localRef.cover ? coverQuality(this.localRef.cover, eyes) : 1;
  }

  /**
   * Cinematic beats: a brief slow-down (e.g. the last enemy in a room), and a letterbox for stingers.
   * The beat runs in real time and restores normal speed afterwards.
   */
  slowBeat(seconds = 0.25, scale = 0.6): void {
    if (!this.app.settings.get().gameplay.slowBeat || this.net) return;
    this.beatT = seconds;
    this.app.loop.timeScale = scale;
  }

  letterbox(seconds: number): void {
    this.letterboxT = seconds;
    this.post.letterbox(true);
  }

  private updateCinematic(dt: number): void {
    const v = this.app.settings.get().video;
    const key = `${v.vignette}${v.filmGrain}`;
    if (key !== this.postKey) {
      this.postKey = key;
      this.post.configure(v.vignette, v.filmGrain);
    }
    const scale = this.app.loop.timeScale || 1;
    const real = dt / scale;
    if (this.beatT > 0) {
      this.beatT -= real;
      if (this.beatT <= 0) this.app.loop.timeScale = 1;
    }
    if (this.letterboxT > 0) {
      this.letterboxT -= real;
      if (this.letterboxT <= 0) this.post.letterbox(false);
    }
    this.post.update(real);
  }

  /** Lost the cover being used (shot away / destroyed): a short stagger. */
  private stumble(): void {
    const p = this.player;
    p.controller.landT = Math.max(p.controller.landT, 0.45);
    p.rig.hit(0.8, 0);
    p.cam.shake(0.35);
    this.suppression.add(0.3);
  }

  private markerPt = new Vector3();
  private scr = { x: 0, y: 0 };

  /** Project a world point to percent of the view; false when behind the camera or off screen. */
  private project(x: number, y: number, z: number): boolean {
    const m = this.markerPt.set(x, y, z);
    Vector3.TransformCoordinatesToRef(m, this.scene.getTransformMatrix(), m);
    if (!(m.z > 0 && m.z < 1 && Math.abs(m.x) < 1.05 && Math.abs(m.y) < 1.05)) return false;
    this.scr.x = (m.x * 0.5 + 0.5) * 100;
    this.scr.y = (0.5 - m.y * 0.5) * 100;
    return true;
  }

  /**
   * A world prompt on a cover face at `s` (clamped onto the face), at the face's prompt height; `edge`
   * puts it on the top edge of low cover instead (in cover the camera looks over it, so the face below
   * is out of view). A low prompt that is off screen falls back to the top edge.
   */
  private onFace(id: WorldPromptId, label: string | null, seg: CoverSegment, s: number, edge = false): void {
    const w = this.hud.world;
    if (!label) return w.set(id, null, 0, 0);
    const ss = Math.max(0.15, Math.min(seg.len - 0.15, s));
    // just proud of the surface so it never sinks into it
    const x = seg.ax + seg.tx * ss + seg.nx * 0.04;
    const z = seg.az + seg.tz * ss + seg.nz * 0.04;
    const top = seg.y + seg.height;
    let ok = !(edge && seg.low) && this.project(x, seg.y + Math.min(PROMPT_Y, seg.height * 0.5), z);
    if (!ok && seg.low) ok = this.project(x, top, z);
    w.set(id, ok ? label : null, this.scr.x, this.scr.y);
  }

  /**
   * Cover prompts on the surfaces (Blacklist style): "Take cover" on the face a press would snap to,
   * the cover type badge on the face in use (by touch tapping it leaves cover), vault / climb / step on
   * the obstacle, the cover-to-cover marker on the target. The touch action button is only for "use".
   */
  private updateCoverHud(): void {
    const c = this.cover;
    const st = c.state;
    const w = this.hud.world;
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
    // cover quality against the current threats: warn when the cover no longer protects
    const flanked = c.inCover && this.coverQ < 0.3 && this.expEyes.length > 0;
    const seg = c.seg;
    if (stateText && seg) {
      // nothing labels the wall being used (no cover type badge): only a warning when it stops protecting
      this.onFace('state', flanked ? 'Flanked' : null, seg, c.s + c.faceDir * PROMPT_ALONG, true);
      this.onFace('vault', c.low && (st === 'in' || st === 'peek') ? 'Vault' : null, seg, c.s - c.faceDir * PROMPT_ALONG, true);
    } else w.set('state', null, 0, 0);
    // round an outside corner: only offered while pushing against the edge; the cover button swings round
    if (seg && st === 'in' && c.cornerSide !== 0) this.onFace('corner', 'Round corner', seg, c.cornerSide < 0 ? 0 : seg.len, true);
    else w.set('corner', null, 0, 0);
    const cand = st === 'none' && !this.traversal.attached ? c.candidate : null;
    if (cand) this.onFace('cover', 'Take cover', cand.seg, cand.s);
    else w.set('cover', null, 0, 0);
    // traversal (not in cover): on the obstacle face, or on the floor at the ledge
    const th = this.traversal.hint;
    const tl = th && !c.inCover && st !== 'dash' && !anchorFirst(this.traversal.attachHint) ? (TRAVERSE_LABEL[th.kind] ?? '') : '';
    if (tl && th && cand) {
      // the same surface offers cover too: vault sits beside the cover prompt (camera-right side)
      const yaw = this.player.cam.yaw;
      const side = Math.cos(yaw) * cand.seg.tx - Math.sin(yaw) * cand.seg.tz >= 0 ? 1 : -1;
      this.onFace('vault', tl, cand.seg, cand.s + side * PROMPT_ALONG);
    } else if (tl && th) {
      const at = this.traversal.hintAt;
      const up = th.kind === 'drop' || th.kind === 'hop' ? 0.12 : Math.max(0.2, Math.min(PROMPT_Y, th.height * 0.5));
      const ok = this.project(at.x, at.y + up, at.z);
      w.set('vault', ok ? tl : null, this.scr.x, this.scr.y);
    } else if (!(stateText && seg)) w.set('vault', null, 0, 0);
    this.anchorPrompts();
    const ctl = this.player.controller;
    this.hud.setTactical(ctl.sprint.stamina, this.expEyes.length ? this.exposure : -1, this.noise <= 0 ? 0 : this.noise < 3 ? 1 : this.noise < 8 ? 2 : 3, this.suppression.value);
    // cover-to-cover marker on the target face
    const tg = st === 'in' ? c.target : null;
    if (tg) {
      const ok = this.project(tg.x, tg.seg.y + Math.min(PROMPT_Y, tg.seg.height * 0.5), tg.z);
      w.set('move', ok ? (tg.kind === 'swat' ? 'SWAT turn' : 'Move to cover') : null, this.scr.x, this.scr.y);
    } else w.set('move', null, 0, 0);
    w.flush();
    // the touch action button: only to use an interactable in reach
    const it = this.interactTarget;
    if (it) ACT_USE.label = it.label.length > 14 ? 'Use' : it.label;
    const touchCtl = this.app.input.touch;
    touchCtl.setAction(it ? ACT_USE : null);
    touchCtl.setControlHidden('action', !it);
  }

  /** Anchor prompts: what traverse attaches to from the ground; climb up / jump / drop while attached. */
  private anchorPrompts(): void {
    const w = this.hud.world;
    const t = this.traversal;
    const ac = t.attachCtl;
    const m = ac.m;
    if (m.active) {
      const a = m.anchor!;
      const on = m.phase === 'on';
      const rig = this.player.rig;
      const hx = (rig.reachL.x + rig.reachR.x) / 2;
      const hy = (rig.reachL.y + rig.reachR.y) / 2;
      const hz = (rig.reachL.z + rig.reachR.z) / 2;
      // climb up: on the lip above the hands
      if (on && ac.canClimb && !ac.jump && this.project(hx, hy + 0.12, hz)) w.set('vault', ATTACH_LABEL.climbUp!, this.scr.x, this.scr.y);
      else w.set('vault', null, 0, 0);
      const j = on ? ac.jump : null;
      if (j && this.project(j.grip.x, j.grip.y + 0.1, j.grip.z)) w.set('jumpTo', ATTACH_LABEL.jump!, this.scr.x, this.scr.y);
      else w.set('jumpTo', null, 0, 0);
      // drop (slide on a ladder): under the hands
      const lbl = a.kind === 'ladder' ? 'Slide' : a.kind === 'zipline' || a.kind === 'duct' ? null : ATTACH_LABEL.drop!;
      if (on && lbl && this.project(hx, hy - 0.5, hz)) w.set('drop', lbl, this.scr.x, this.scr.y);
      else w.set('drop', null, 0, 0);
      return;
    }
    w.set('jumpTo', null, 0, 0);
    // opening a grate: the unscrew progress on it
    const v = ac.vent;
    if (v) {
      const g = v.duct.entry;
      const lbl = v.progress > 0 ? `${ATTACH_LABEL.unscrew} ${Math.round(v.progress * 100)}%` : ATTACH_LABEL.ventClosed!;
      if (this.project(g.pos.x, g.pos.y + 0.45, g.pos.z)) w.set('vault', lbl, this.scr.x, this.scr.y);
      w.set('drop', null, 0, 0);
      return;
    }
    // from the ground: the anchor in reach when nothing closer (step / vault / mantle) is offered
    const h = ac.hint;
    const geo = t.hint && t.hint.kind !== 'drop' && !anchorFirst(h);
    const blocked = !!geo || this.cover.state !== 'none';
    // at a hangable edge the drop control (hold) / its prompt lowers into a hang (traverse there still drops)
    const low = blocked ? null : ac.lower;
    if (low) {
      const a = low.anchor as Ledge;
      if (this.project(a.a.x + a.tx * low.s, a.top + 0.45, a.a.z + a.tz * low.s)) w.set('drop', ATTACH_LABEL.ledgeAbove!, this.scr.x, this.scr.y);
      else w.set('drop', null, 0, 0);
    } else w.set('drop', null, 0, 0);
    if (!h || blocked) return;
    const a = h.anchor;
    const g = this.promptPt;
    const feetY = this.player.position.y;
    switch (a.kind) {
      case 'ledge':
        // on the face just under the lip (the lip itself is at the top edge of the view up close)
        g.set(a.a.x + a.tx * h.s + a.nx * 0.05, a.top - 0.35, a.a.z + a.tz * h.s + a.nz * 0.05);
        break;
      case 'ladder':
        if (h.entry === 'top') g.set(a.top.x, a.top.y + 0.3, a.top.z);
        else g.set(a.base.x, feetY + 1.1, a.base.z);
        break;
      case 'pipeV':
        g.set(a.base.x, feetY + 1.1, a.base.z);
        break;
      case 'pipeH': {
        const l = Math.max(1e-3, hyp2(a.b.x - a.a.x, a.b.z - a.a.z));
        g.set(a.a.x + ((a.b.x - a.a.x) * h.s) / l, a.hangHeight - 0.3, a.a.z + ((a.b.z - a.a.z) * h.s) / l);
        break;
      }
      case 'duct':
        g.set(a.entry.pos.x, a.entry.pos.y + 0.45, a.entry.pos.z);
        break;
      default:
        g.set(a.kind === 'zipline' ? a.a.x : this.player.position.x, a.kind === 'zipline' ? a.a.y : feetY + 1, a.kind === 'zipline' ? a.a.z : this.player.position.z);
    }
    if (this.project(g.x, g.y, g.z)) w.set('vault', ac.hintLabel(h), this.scr.x, this.scr.y);
  }

  private promptPt = new Vector3();

  /** Touch held on a prompt: at a closed vent, holding it is holding the use button (unscrew) and a quick tap kicks
   *  (the press goes in at once; letting go releases the use button). */
  private promptHeld = false;
  private ventByTouch = false;
  private onWorldPromptHold(id: WorldPromptId, down: boolean): void {
    if (this.paused || this.exited) return;
    const inp = this.app.input.state;
    if (down && id === 'vault' && this.traversal.attachHint?.anchor.kind === 'duct') {
      this.promptHeld = true;
      this.ventByTouch = true;
      inp.set('touch-prompt', 'interact', true);
      inp.tap('jump');
    } else if (!down && this.promptHeld) {
      this.promptHeld = false;
      inp.set('touch-prompt', 'interact', false);
    }
  }

  /** A tap on a world prompt (touch): the same as the button it shows. */
  private onWorldPrompt(id: WorldPromptId): void {
    if (this.paused || this.exited) return;
    const inp = this.app.input.state;
    if (id === 'cover' || id === 'move' || id === 'corner') inp.tap('cover');
    else if (id === 'vault' || id === 'jumpTo') {
      // (a vent prompt pressed on touch-down already did it)
      if (this.ventByTouch && id === 'vault') this.ventByTouch = false;
      else inp.tap('jump');
    }
    else if (id === 'drop') {
      if (this.traversal.attached) inp.tap('drop');
      else this.traversal.attachCtl.lowerRequest = true;
    }
    else if (id === 'state') inp.coverLeave = true;
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
    // Clear mode: no enemy blips (find them yourself)
    const showEnemies = !(this.mode instanceof ClearMode);
    let enemyBlips = 0;
    if (showEnemies)
      for (const t of this.registry.hostiles('player')) {
        t.center(this.tmp);
        blips.push({ x: this.tmp.x, z: this.tmp.z, kind: 'enemy' });
        enemyBlips++;
      }
    this.enemyBlips = enemyBlips;
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
