import { landingRumble } from '../config/rumble';
import type { App, AppState } from '../core/app';
import { Color3, type FreeCamera, InstancedMesh, PhysicsRaycastResult, Vector3, type Vector4, type PhysicsEngine, type Scene } from '../core/babylon';
import { VOXEL_LOD, World } from '../world/world';
import { flags } from '../core/flags';
import { showEconomy } from '../core/legacy';
import { shownResolution } from '../core/display';
import { LIVE_RIGS } from '../player/characterRig';
import { setCharacterVoxels } from '../operators/runtime/playerFigure';
import { LIVE_DOGS } from '../ai/dogModel';
import { setVoxelWeapons } from '../weapons/weaponModel';
import { setVoxelProps } from '../voxel/voxelGroup';
import { LOD_DISTANCE } from '../world/partLibrary';
import type { WeatherChoice } from '../world/mapDef';
import type { MapDef } from '../world/mapDef';
import { Player } from '../player/player';
import { defaultLook, type AvatarLook } from '../cosmetics/avatarLook';
import { PauseScreen, type ObjectiveLine } from '../ui/screens/pauseScreen';
import { PauseLook } from '../vfx/pauseLook';
import { DamageRegistry, type Damageable } from './damage';
import { Vfx } from '../vfx/vfx';
import { Ballistics } from '../weapons/ballistics';
import { Explosions } from '../weapons/explosions';
import { Grenades } from '../weapons/grenades';
import { PlayerWeapons, type LoadoutEntry } from '../weapons/playerWeapons';
import { PlayerTarget } from './playerTarget';
import { Hud, type HudFrame } from '../ui/hud/hud';
import type { WheelView } from '../ui/hud/gadgetWheel';
import { keyLabels } from '../ui/prompts';
import { PING_LIFE, PING_MAX } from '../ui/hud/pings';
import { Minimap, type Blip } from '../ui/hud/minimap';
import { TrainingDummy } from './trainingDummy';
import { G, MASK } from '../physics/groups';
import { buildNavGrid } from '../ai/navBuild';
import { holdNoisePulse } from '../config/noise';
import type { NavGrid } from '../ai/navGrid';
import { EnemyManager } from '../ai/enemyManager';
import type { PlayerRef } from '../ai/enemy';
import type { Difficulty } from '../ai/enemyDefs';
import { resolveDifficulty, type DifficultyDef } from '../ai/archetypes';
import { Pickups } from './pickups';
import { Interactables, type Interactable } from './interactables';
import { DoorMenu, guardBehindDoor } from './doorMenu';
import { GrabMenu, GRAB_OPT_LABEL, GRAB_PASS, menuNavDir } from './grabMenu';
import { emptyStats, type GameMode, type ModeId, type SessionStats } from './modes/gameMode';
import { MissionMode } from './modes/missionMode';
import { ClearMode } from './modes/clearMode';
import { roomAt } from '../world/rooms';
import { ResultsScreen, type ResultsNav } from '../ui/screens/resultsScreen';
import { EventBus } from '../core/events';
import type { GameEvents } from './gameEvents';
import { attachGameAudio } from '../audio/gameAudio';
import { VOXEL_TIER, type QualityLevel } from '../core/quality';
import type { Adaptive } from '../core/governor';
import { CT, FENCE, MOVEMENT, RAPPEL } from '../config/movement';
import { TraversalController } from '../player/traversal';
import { anchorFirst, ATTACH_LABEL } from '../player/attachController';
import { PIPE, SPLIT } from '../player/splitJump';
import { GRAB } from './takedown';
import { TeamController, type TeamMate } from './teamController';
import type { TeamKind } from './teamMoves';
import type { Ledge } from '../world/anchors';
import { LIGHT, type LightDef } from '../world/lights';
import { landingNoise, noiseRadius } from '../player/movement';
import { CinematicPost } from '../vfx/cinematicPost';
import { NightAutoGain } from '../vfx/nightAutoGain';
import { NightBloom } from '../vfx/nightBloom';
import { PostStack } from '../vfx/postStack';
import { Weather } from '../vfx/weather';
import { benchTag } from '../ui/benchTag';
import { SPIKE_EVENT, SpikeLog } from '../core/spikes';
import { feedbackContext } from '../ui/screens/feedbackScreen';
import { BENCH, benchFlight, benchResult, benchText, flightAt, FLIGHT, SECTION_SECONDS, sectionText, sustainedDrift, type BenchKind, type BenchRun, type BenchSession, type Flight, type FlightNav, type P3 as BenchPoint } from './benchmark';
import { Dialog } from '../ui/widgets';
import { newEntry } from '../feedback/feedback';
import { BlobShadows } from '../vfx/blobShadows';
import { LkpGhost } from '../vfx/lkpGhost';
import { VisionState } from './vision';
import { DoorGhosts } from '../vfx/doorGhosts';
import { VISION_GAIN } from '../world/darkCurve';
import { THERMAL, ELECTRO, ELECTRO_KINDS } from '../vfx/visionLook';
import { visionLabel } from './vision';
import { StealthSystems } from './stealthSystems';
import { SecuritySystem } from '../security/securitySystem';
import type { CtDevices } from './ctDevices';
import { SecurityView } from '../security/securityView';
import { TakedownController, type TakedownVictim } from './takedownController';
import { StrikeController } from './strikeController';
import { MEDKIT, stationHeal } from './medkit';
import type { PickupKind } from './pickups';
import { DOOR_PEEK, DoorPeekCore, PEEK_ACT, crackedHandle, doorFrame, doorPeekEligible, emptyFrame, type DoorPeekInput } from '../world/doorPeek';
import { DOOR, driveStep } from '../world/doors';
import type { CKind } from './committedMoves';
import { SURFACE_NOISE, surfaceAt, type Surface } from '../world/surfaces';
import { WallCore, buildWallLinks, emptyWallInput, posedHeadSample, wallOverride } from '../player/wallController';
import type { MoveOverride } from '../player/playerController';
import { COVER_STANDOFF } from '../world/levelBuilder';
import { coverQuality, exposureFraction, exposurePoints, exposurePointsPosed, segPointDist, Suppression, type P3 } from './tactics';
import { lightSampleHeight, STANDARD_BODY } from './bodyHeight';
import { hyp2 } from '../core/mathx';
import { GadgetSystem } from './gadgetSystem';
import { InfiltrationMode } from './modes/infiltrationMode';
import { CourseMode } from './modes/courseMode';
import type { CourseWire } from './course/courseWire';
import { StealthRating } from './playstyle';
import { defaultHq, defaultSuit, hqStats, suitStats, type HqLevels, type HqStats, type SuitLoadout, type SuitStats } from '../progression/suit';
import { GADGET_IDS, GADGETS, type GadgetId } from './gadgets';
import { MISSIONS } from './missions';
import { WEAPONS } from '../weapons/weaponDefs';
import { InputState } from '../input/inputState';
import { clearGripAxis } from '../player/attachGrips';

export type { ModeId };

export interface GameOptions {
  map: MapDef;
  mode: ModeId;
  seed: number;
  difficulty?: Difficulty;
  look?: AvatarLook;
  loadout?: LoadoutEntry[];
  /** Coop: attaches the host/client sim. Provided by `src/net` (dynamically imported), never by single player. */
  net?: NetHooks;
  /** Infiltration: the mission and the insertion point chosen. */
  missionId?: string;
  insertion?: string;
  /** The suit worn and the HQ upgrades bought (single player; defaults = issued kit). */
  suit?: SuitLoadout;
  hq?: HqLevels;
  /** Gadget selected at the start (the loadout preset's). */
  gadget?: string;
  /**
   * Settings > Graphics > Benchmark: camera flights through the rooms, guards passive, then the results. 3.1.4: one
   * run per match (its settings set before the map loads); the session carries the plan and the lines so far.
   */
  benchmark?: BenchSession;
  /** Course mode: the bay to start at (1-based, D20; the lobby's "Start at bay N"). */
  courseBay?: number;
  /** 3.0 weather (visual only; the map's `weathers`). */
  weather?: WeatherChoice;
}

/** What the coop layer plugs into a session. */
export interface NetAttachment {
  /** Client: the host reports guards in combat know this operator is there. */
  spotted?(): boolean;
  /** After the local simulation, every fixed step. */
  fixedUpdate(dt: number): void;
  frameUpdate(dt: number): void;
  /** Local player died. Return true if the net layer handles it (respawn/revive). */
  onLocalDeath(): boolean;
  /** Host: the session ended (broadcast results). */
  onEnd?(won: boolean, subtitle: string): void;
  /** Host: revive every downed player (wave cleared). */
  reviveAll?(): void;
  /** (3.2.0 phase 5) Team-mates for team moves (co-op: everyone; TDM: the same side). */
  teamMates?(): readonly TeamMate[];
  /** (step 11, D8) Other players with their back to cover segment `seg`: metres along it into `out`; returns the count. */
  wallOthers?(seg: number, out: Float64Array): number;
  /** (step 13) Client: ask the host to crack (or close the crack of) door `i`; the host's own player cracks directly. */
  doorCrack?(i: number, on: boolean): void;
  /** (3.2.0 phase 5) Ask the host for a team move with a braced `partner` (boost: onto anchor `target` at `s`). */
  teamRequest?(kind: TeamKind, partner: string, target: number, s: number, gripY: number, lx?: number, lz?: number): void;
  /** (3.2.0 phase 5) End the human ladder (either player). */
  teamEnd?(): void;
  /** (locomotion step 10, A5) Ask the host for a committed move (`cmove`; the host's own: checked at once). The
   *  answer comes back through `GameState.strike.accepted` / `denied`. */
  commitRequest?(kind: CKind, id: number, target: string): void;
  /** (step 10) Host: its own committed move was interrupted (damage): tell the others. */
  commitCancel?(id: number, reason: string, kind?: CKind): void;
  /** Host: a wall medkit station heals player `who` (false: down or at full health). */
  healAtStation?(who: string): boolean;
  /** Co-op: the local player pinged (x, y, z), on an enemy (`target`) or a spot (''). */
  ping?(x: number, y: number, z: number, target: string): void;
  /** Contact shadows for the characters the net layer draws (remote players, puppets). */
  shadows?(b: BlobShadows): void;
  /** Host, course mode: send the `course` message to every client. */
  course?(w: CourseWire): void;
  /** Client, course mode (CT prototype B3): the held jammer's target ('' = released). */
  sendJam?(tgt: string): void;
  /** Host: the local player respawned at `at` (a checkpoint): bring the others back too. */
  onRespawn?(at: Vector3): void;
  /** Extra pickers for pickups (host: remote players). */
  pickers?(): { id: string; feet: Vector3; needs: (k: PickupKind) => boolean }[];
  onPickup?(kind: PickupKind, who: string): void;
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
  /** The results screen's Missions (solo): the menu on the missions list. */
  missions?(): void;
  /** The results screen's Next (solo): the menu on that mission's briefing. */
  briefing?(missionId: string): void;
}

/** Hook for progression (Phase 6): turns session stats into rewards shown on the results screen. */
export type RewardHook = (stats: SessionStats, opts: GameOptions) => Promise<HTMLElement | null>;

/** A play session on one map: world, player, combat systems, HUD. Modes plug in on top. */
/** Solo: no remote players (one shared array, so the per-step accessor never allocates). */
const NO_REMOTES: readonly PlayerRef[] = Object.freeze([]);
/** Gunshot noise radius (m) x the weapon's noise stat; at or below `SUPPRESSED_NOISE` a shot only raises
 *  suspicion; a bullet impact is heard within `IMPACT_NOISE`. */
const SHOT_NOISE = 28;
/** Awareness arcs: shown for enemies in line of sight or within `ARC_NEAR` m, once the meter passes `ARC_MIN`. */
const ARC_NEAR = 2.5;
const ARC_MIN = 0.06;
/** (Step 14) the vision HUD label shows this long after a switch (s). */
const VISION_LABEL_TIME = 1.5;
const SUPPRESSED_NOISE = 0.6;
const IMPACT_NOISE = 4;

const TRAVERSE_LABEL: Record<string, string> = { step: 'Step up', vault: 'Vault', mantle: 'Climb', drop: 'Drop down', hop: 'Jump', none: '' };
/** World prompts sit low on the surface they act on, at one height per surface (m above its base). */
const PROMPT_Y = 0.55;

/** Longest the loading screen waits for every material to compile (3.2.2). */
const WARMUP_MAX_MS = 6000;
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
  readonly traversal: TraversalController;
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
  private swayT = 0;
  /** Cinematic post pass (vignette, grain, letterbox). */
  readonly post: CinematicPost;
  /** The PC post stack (AO, reflections, volumetrics, bloom, depth of field, tone mapping). */
  readonly stack: PostStack;
  /** Rain / dust / heat haze (visual only). */
  readonly weather: Weather;
  readonly blobs: BlobShadows;
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
  /** Cameras (and later the other security devices) of a map that has `layout.security`; host side, never on a co-op client. */
  readonly security: SecuritySystem | null = null;
  /** (CT prototype B3) The course's held jammer, cameras' jam state and lasers (set by the course mode / client mirror). */
  ctDev: CtDevices | null = null;
  readonly stats: SessionStats;
  private ended = false;
  private respawnAt: Vector3 | null = null;
  private interactTarget: Interactable | null = null;
  /** Melee takedowns. */
  readonly takedown: TakedownController;
  /** (locomotion step 10) The elbow strike (fire while holstered). */
  readonly strike: StrikeController;
  /** (3.2.0 phase 5) Co-op team moves (brace, boost, human ladder). */
  readonly team: TeamController;
  /** Suit and HQ effects for this session. */
  readonly suit: SuitStats;
  readonly hq: HqStats;
  /** Stealth rating counters (bible 6). */
  readonly style = new StealthRating();
  /** An enemy is in combat on the operator (stealth rules); flips record a detection. */
  detected = false;
  /** Gadgets: the wheel, throws, remote views, effects (phase 5). */
  readonly gadgets: GadgetSystem;
  /** Input the operator gets while the wheel or a remote view has the real one (nothing held). */
  private readonly blankInp = new InputState();
  /** (F1b) what the held guard's menu passes through: the move and the aim / fire actions. */
  private readonly grabInp = new InputState();
  /** Remote players (coop) contribute here; local player is always included. */
  remotePlayers: () => readonly PlayerRef[] = () => NO_REMOTES;
  /** (locomotion step 11) Back-to-wall (pure core; built on the first step from the level's cover segments). */
  wallCore: WallCore | null = null;
  private wallIn = emptyWallInput();
  /** (locomotion step 13) The door peek (context press at a closed door), its frame, override and input. */
  readonly doorPeek = new DoorPeekCore();
  readonly peekFrame = emptyFrame();
  private peekOv: MoveOverride = {};
  private peekIn: DoorPeekInput = { context: false, interact: false, push: 0, end: false, candidate: -1, doorOpened: false };
  private peekTook = false;
  /** (A3, G19) The CT door menu (A at a closed door), the door the peek is on offer at, a Stealth open pick waiting for the peek step. */
  readonly doorMenu = new DoorMenu();
  /** (A4, G23) The CT grab menu, open while a guard is held. */
  readonly grabMenu = new GrabMenu();
  private grabMenuArmed = false;
  private grabMenuNavT = 0;
  private doorMenuArmed = false;
  private doorMenuNavT = 0;
  private stealthPick = false;
  /** The `interact` press the door menu took (pick or open): it is ignored until a step sees the button edge cleared. */
  private interactSwallow = false;
  private peekOffer = -1;
  private readonly menuLabels: string[] = [];
  private peekHp = 0;
  private peekHand = { x: 0, y: 0, z: 0 };
  private wallOv: MoveOverride = {};
  static rewardHook: RewardHook | null = null;
  readonly events = new EventBus<GameEvents>();
  private audio: { frame(dt: number): void; dispose(): void } | null = null;
  private localRef: PlayerRef;
  /** The local operator has been seen by a guard in combat (no takedowns on guards in combat). */
  get spottedLocal(): boolean {
    return this.localRef.spotted === true || this.net?.spotted?.() === true;
  }
  /** Coop attachment (null in single player). */
  net: NetAttachment | null = null;
  /** Coop client: enemies, waves and objectives are driven by the host. */
  readonly puppet: boolean;
  /** Who a takedown can be done on (enemies; co-op clients: the host's enemies as puppets). */
  takedownVictims: () => readonly TakedownVictim[] = () => this.enemyMgr?.enemies ?? [];

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
    // (A5, G135) partner beacon: the host / solo player is player 1 (blue), a joiner player 2 (red)
    this.player.rig.setBeacon(this.puppet ? 2 : 1);
    this.vfx = new Vfx(this.scene);
    this.ballistics = new Ballistics(this.scene, this.registry, world.props, this.vfx);
    // voxel chips (3.0, cosmetic): the struck voxel darkens (the prop layer first), debris in its colour
    if (world.voxels && world.voxels.lv.size <= 0.05) this.ballistics.onWorldHit = (p, n) => world.voxelsFine?.chip(p.x, p.y, p.z, n.x, n.y, n.z) ?? world.voxels?.chip(p.x, p.y, p.z, n.x, n.y, n.z) ?? null;
    this.explosions = new Explosions(this.registry, world.props, this.vfx, this.ballistics);
    this.grenades = new Grenades(this.scene, world.parts, this.explosions);
    const loadout: LoadoutEntry[] =
      opts.loadout ?? (opts.mode === 'sandbox' ? (['rifle', 'pistolSd'] as const).map((id) => ({ id })) : [{ id: 'rifle' }, { id: 'pistolSd' }]);
    this.weapons = new PlayerWeapons(world, this.player, this.ballistics, this.grenades, this.vfx, loadout, (suppressed) =>
      app.input.haptic(suppressed ? 'shotSuppressed' : 'shotLoud'),
    );
    this.target = new PlayerTarget(this.scene, this.registry, this.player);
    this.stats = emptyStats(opts.mode, opts.map.id);
    this.localRef = {
      id: 'local',
      target: this.target,
      feet: this.player.position,
      height: this.player.rig.height,
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
    this.traversal = new TraversalController(this.scene, this.player, world.level.anchors);
    this.traversal.breakables = world.breakables;
    world.breakables.onOpen = (key, how, at) => this.onBreakable(key, how, at);
    this.blobs = new BlobShadows(this.scene);
    this.post = new CinematicPost(this.player.cam.camera);
    this.post.setGrade(world.map.theme.grade);
    // night vision's auto-gain (the lamps in view) and bloom (the scene's bright parts, linear HDR)
    this.nightGain = new NightAutoGain(this.scene, world.level.lights.lights, this.glareBlocked);
    this.nightGain.onUpdate = () => this.post.setAutoGain(this.nightGain.veil);
    this.nightBloom = new NightBloom(this.scene, this.player.cam.camera);
    this.post.setBloom(this.nightBloom);
    const fc = Color3.FromHexString(world.map.theme.horizon);
    // weather (3.0, visual only): the map's theme, or the choice made on the Play screen / in the lobby
    const wx = opts.weather && world.map.weathers?.includes(opts.weather) ? opts.weather : null;
    const kind = wx === 'rain' ? 'rain' : wx ? null : (world.map.theme.weather ?? null);
    const vx = world.voxels;
    const sun = world.sun.diffuse;
    this.stack = new PostStack(this.scene, this.player.cam.camera, {
      fogColor: [fc.r * 0.5, fc.g * 0.5, fc.b * 0.5],
      // dark maps: a low haze the beams show in; daylight maps a thin one; fog weather thick, rain a little more
      fogDensity: ((world.map.theme.lightLevel ?? 0.75) < 0.5 ? 0.007 : 0.004) * (wx === 'fog' ? 4 : wx === 'rain' ? 1.6 : 1),
      lights: world.level.lights.lights.length ? world.level.lights : null,
      shimmer: kind === 'haze' ? 1 : 0,
      // fog: moonlit shafts under the skylights and through the doors (the voxels' sky bake)
      sky: vx?.skyTex && vx.sky ? { tex: vx.skyTex, origin: vx.sky.origin, cell: vx.sky.cell, dims: vx.sky.n } : null,
      shafts: wx === 'fog' ? [sun.r * 0.03, sun.g * 0.03, sun.b * 0.035] : [0, 0, 0],
      // ray-traced reflections (Settings > Graphics > Reflections): the structure layer's brickmap
      rt: vx?.plugins[0] ? { tex: vx.plugins[0].tex, state: () => vx.plugins[0]!, capsules: this.rtCapsules, lights: world.level.lights.lights.length ? world.level.lights : null } : null,
    });
    // 3.2 baked lamps: the characters' soft shadows from every lamp
    if (world.lamps) world.lamps.capsules = this.rtCapsules;
    this.weather = new Weather(this.scene, kind);
    if (vx) this.weather.occluder = (x, z) => vx.roofAt(x, z);
    // (the grade / vignette / goggles pass stays after the stack)
    this.stack.onRebuilt = () => this.post.toEnd();
    this.ghost = new LkpGhost(this.scene);
    this.takedown = new TakedownController(this);
    this.strike = new StrikeController(this);
    this.diff = resolveDifficulty(opts.difficulty ?? 'normal');
    this.team = new TeamController(this);
    this.gadgets = new GadgetSystem(this);
    // suit and HQ: armour, hands, gadget carry
    this.suit = suitStats(opts.suit ?? defaultSuit());
    this.hq = hqStats(opts.hq ?? defaultHq());
    this.target.armorMul = this.suit.damage;
    this.weapons.handsMul = this.suit.hands;
    this.takedown.handsMul = this.suit.hands;
    for (const id of GADGET_IDS) if (this.suit.gadgets) this.weapons.gadgets.counts[id] += this.suit.gadgets;
    if (opts.gadget && (GADGET_IDS as readonly string[]).includes(opts.gadget)) this.weapons.gadgets.select(opts.gadget as GadgetId);
    this.minimap = new Minimap(world.level);
    this.hud.setMinimap(this.minimap);

    this.weapons.events.onHit = (kind, weapon) => {
      this.hud.hitMarker(kind);
      if (kind === 'kill') {
        app.input.haptic('kill');
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
      app.input.haptic('hurt');
      // (3.2.0) a pipe transition (legs up / inverted) falls back to the hands
      this.traversal.attachCtl.onHit();
    };
    this.target.onDeath = () => this.onPlayerDeath();
    // (locomotion step 17) rumble: the landing band, heavy footfalls (gear 6 or carrying a body), takedowns, elbow
    // hits (all the local player's own: `Player` is the local player, takedown / strike events are local only)
    this.player.onLanding = (kind) => {
      const r = landingRumble(kind);
      if (r) app.input.haptic(r);
    };
    this.player.onFootPlant = () => {
      if (this.player.controller.gear >= 6 || this.stealth?.carrying) app.input.haptic('footfallHeavy');
    };
    this.events.on('takedown', (e) => {
      if (e.phase === 'done') app.input.haptic('takedownDone');
    });
    this.events.on('strike', (e) => {
      if (e.result !== 'miss') app.input.haptic('elbowHit');
    });
    this.player.onLand = (v) => {
      this.vfx.landDust(this.player.position, Math.min(1.5, v / 8));
      this.player.cam.shake(Math.min(0.25, v * 0.02));
    };
    this.explosions.onExplode = (pos, radius) => {
      const d = Vector3.Distance(pos, this.player.position);
      this.player.cam.shake(Math.max(0, 0.9 - d / (radius * 3)));
      if (d < radius * 2) app.input.haptic('explosion');
    };

    if (this.puppet) {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      if (opts.mode !== 'sandbox') w.pickups = new Pickups(this.scene, world.parts, world.layout.pickups);
      // health is host-authoritative: local damage never applies
      this.target.damageMul = 0;
    } else if (opts.mode !== 'sandbox') {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      w.nav = buildNavGrid(this.scene, world.level, spawn.pos, world.map.navLayers, world.layout.navSeeds);
      w.enemyMgr = new EnemyManager(this.scene, world, w.nav, this.registry, this.ballistics, this.vfx, this.diff, () => this.playerRefs());
      w.enemyMgr.onKilled = (e, h) => {
        // own kills only (coop teammates are credited by the net layer); barrels count for whoever is local
        if (h.attackerId === 'local' || h.attackerId === '') {
          this.stats.kills++;
          this.stats.byKind[e.def.kind]++;
          if (h.part === 'head') this.stats.headshots++;
        }
        if (h.attackerId === 'local') this.hud.feedItem(`${e.def.name} ${h.part === 'head' ? 'headshot' : 'down'}${showEconomy(flags.legacy) ? `  +${e.def.xp} XP` : ''}`, 'kill');
        if (h.attackerId === 'local' || h.attackerId === '') {
          const ev = h.kind === 'melee' ? (e.ko ? 'takedownNonLethal' : 'takedownLethal') : e.ko ? 'knockout' : 'kill';
          this.style.record(ev, this.detected);
          if (e.ko) this.stats.knockouts++;
        }
        this.mode?.onEnemyKilled(e, h);
      };
      w.enemyMgr.grenades = this.grenades;
      w.enemyMgr.onBark = (e, line, radio) => {
        this.hud.barks.say(e.id, line, radio);
        this.events.emit('bark', { radio });
      };
      w.pickups = new Pickups(this.scene, world.parts, world.layout.pickups);
      w.pickups.onPickup = (k, who) => this.pickedUp(k, who);
      w.interactables = new Interactables(this.scene, world.parts);
      this.addMedkitWalls(w.interactables);
      w.mode =
        opts.mode === 'clear'
          ? new ClearMode(this)
          : opts.mode === 'infiltration'
            ? new InfiltrationMode(this)
            : opts.mode === 'course'
              ? new CourseMode(this)
              : new MissionMode(this);
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
    // doors collide from now on (the nav grid, built above, walks through doorways); co-op clients follow the
    // host's door states (snapshots)
    world.doors.arm();
    if (world.layout.security && !this.puppet) {
      const w = this as { -readonly [K in keyof GameState]: GameState[K] };
      w.security = new SecuritySystem(
        world.layout.security,
        { ballistics: this.ballistics, players: () => this.playerRefs(), lightAt: (x, y, z) => world.lightField.totalAt(x, y, z) },
        new SecurityView(this.scene, world.parts),
      );
      const prevRay = this.weapons.onRay;
      this.weapons.onRay = (a, b) => {
        prevRay?.(a, b);
        this.security?.shotRay(a, b);
      };
    }
    if (opts.mode === 'sandbox') {
      // (locomotion step 15) free roam on a test map keeps its wall medkit stations (Proving); a co-op client mirrors
      // the host's
      if (!this.puppet && world.layout.medkitWalls?.length) {
        const w = this as { -readonly [K in keyof GameState]: GameState[K] };
        w.interactables = new Interactables(this.scene, world.parts);
        this.addMedkitWalls(w.interactables);
      }
      this.weapons.infiniteAmmo = true;
      const d = (x: number, z: number, yaw: number, strafe = 0): void => {
        this.dummies.push(new TrainingDummy(this.scene, world, this.registry, new Vector3(x, 0, z), yaw, strafe));
      };
      // training targets on the range; Free Roam on a real map is the map alone (no guards)
      if (opts.map.id === 'proving') {
        d(-4, 8, Math.PI, 0);
        d(3, 10, Math.PI, 2.5);
        d(0, 24, Math.PI, 4);
        d(-14, 14, Math.PI * 0.75, 0);
      }
      this.hud.setObjective(opts.map.id === 'proving' ? 'Free roam - try every weapon' : 'Free roam - explore with every weapon');
    }

    const dbgPts = world.layout.debugPoints;
    if (dbgPts?.length) {
      app.debug.setTeleports(
        dbgPts.map((p) => ({
          group: p.group,
          label: p.label,
          go: () => {
            const c = this.player.controller;
            c.teleport(new Vector3(p.pos.x, p.pos.y + 0.05, p.pos.z), p.yaw);
            this.player.cam.yaw = p.yaw;
          },
        })),
      );
    }
    app.debug.controllerCapsules = () => [{ feet: this.player.position, height: this.player.controller.capsuleHeight, radius: MOVEMENT.radius }];
    app.debug.extra.set('player', () => {
      const c = this.player.controller;
      const stance = c.kneeling ? ' kneel' : c.crouched ? ' crouch' : '';
      return `${c.grounded ? 'ground' : 'air'} spd ${c.speed.toFixed(2)}${stance} g${c.gear}${c.stopHold ? ' hold' : ''}`;
    });
    app.debug.extra.set('carry', () => {
      const k = this.player.carry;
      return `${k.ready} raise ${k.raise.toFixed(2)} w ${k.w.low.toFixed(2)}/${k.w.high.toFixed(2)}/${k.w.compressed.toFixed(2)} wt ${this.player.weaponWeight.toFixed(2)}`;
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

  /** Characters for the ray-traced reflections: upright capsules (the player, then the living guards). */
  private readonly rtCapsules = (a: Float32Array, b: Float32Array, max: number): number => {
    const p = this.player.position;
    let n = rtCapsule(a, b, 0, p.x, p.y, p.z, this.player.rig.headNode.getAbsolutePosition().y - p.y + 0.12);
    const es = this.enemyMgr?.enemies;
    if (es) for (let i = 0; i < es.length && n < max; i++) if (es[i]!.alive) n = rtCapsule(a, b, n, es[i]!.pos.x, es[i]!.pos.y, es[i]!.pos.z, es[i]!.def.height);
    return n;
  };

  static async create(app: App, opts: GameOptions, cb: SessionCallbacks): Promise<GameState> {
    const q = app.quality.level;
    // voxels (3.0): 5 cm with three levels of detail; `?gfx=min` (tests) 20 cm, one level, no AO / micro detail
    const vt = VOXEL_TIER[q.features.detail];
    // (`?gfx=min`: the blockout's boxes in standard materials, smooth characters)
    const plain = q.minimal;
    const voxel = !flags.voxels ? null : q.minimal ? { size: 0.2, fineSize: 0, levels: 1, lodDist: [999, 999] as [number, number], ao: false, micro: false } : { size: vt.size, fineSize: vt.fine, levels: 3, lodDist: VOXEL_LOD[q.features.detail], ao: true, micro: q.features.textures !== 'low', gi: q.features.gi };
    // voxel characters (3.0): 2 cm, 4 cm past the part LOD distance; `?gfx=min`: the smooth parts
    setCharacterVoxels(flags.voxels && !plain ? { size: vt.character, lodSize: vt.character * 2, lodDistance: LOD_DISTANCE * q.detailScale } : null);
    // weapons and gadgets: 1 cm, small parts (sights, pins, trigger) 5 mm
    const vw = flags.voxels && !plain ? { size: vt.weapon, fineSize: vt.weapon / 2, lodSize: vt.weapon * 2, lodDistance: LOD_DISTANCE * q.detailScale, small: 0.03 } : null;
    setVoxelWeapons(vw);
    setVoxelProps(vw);
    const world = await World.create(app.engine, opts.map, { seed: opts.seed, detail: q.minimal ? undefined : q.features.detail, voxel, cheap: plain });
    const g = new GameState(app, world, opts, cb);
    if (opts.net) g.net = opts.net.attach(g);
    // 3.2.2: every material compiled on the loading screen, not mid-match (the benchmark counted 37-57 shaders
    // compiled in each run: hitches); capped so a material that never reports ready cannot hold the load
    await Promise.race([g.scene.whenReadyAsync(), new Promise((r) => setTimeout(r, WARMUP_MAX_MS))]);
    return g;
  }

  applyQuality(level: QualityLevel): void {
    const builds = this.stack.builds;
    this.world.applyQuality(level);
    this.stack.apply(level);
    // (a post stack rebuilt mid-match: the frozen materials re-read their setup, as after a shadow change)
    if (builds > 0 && this.stack.builds !== builds) this.world.refreshMaterials();
    this.vfx.density = level.vfxDensity;
    this.weather.setDensity(level.minimal ? 0 : level.vfxDensity);
    const sp = this.world.level.surfacePlugin;
    const wet = level.minimal ? 0 : this.weather.wetness;
    for (const v of this.world.voxelLayers) v.setWet(wet);
    if (sp && sp.wet !== wet) {
      sp.wet = wet;
      // (frozen material: let it re-bind its uniforms once)
      const m = this.world.level.meshes[0]?.material;
      m?.unfreeze();
      this.scene.onAfterRenderObservable.addOnce(() => m?.freeze());
    }
  }

  /** The frame governor's detail (3.1; `QualityManager`): resolution, shadows, lights, levels of detail, effects. */
  applyAdaptive(a: Readonly<Adaptive>, level: QualityLevel): void {
    this.world.applyAdaptive(a, level);
    this.stack.setAdaptive(a.scale, a.volLights);
    this.vfx.density = level.vfxDensity * a.effects;
    this.weather.setDensity(level.minimal ? 0 : level.vfxDensity * a.effects);
  }

  private pickedUp(k: PickupKind, who: string): void {
    if (who !== 'local') {
      this.net?.onPickup?.(k, who);
      return;
    }
    this.events.emit('pickup', { kind: k });
    this.weapons.addAmmo(0.5);
    this.hud.feedItem('Ammo refilled');
  }

  /** (locomotion step 15) The map's wall medkit stations (test maps; a co-op client mirrors the host's). */
  private addMedkitWalls(ints: Interactables): void {
    for (const [n, m] of (this.world.layout.medkitWalls ?? []).entries()) {
      const it = ints.add(`medkit-${n}`, 'medkitWall', m.pos, 'Medkit station', MEDKIT.wallHold, m.yaw);
      ints.setEnabled(it, true);
      it.onUse = (x, who) => this.useWallMedkit(x, who ?? 'local');
    }
  }

  /** A wall medkit station used by `who` ('local' or a client on the host): heals `MEDKIT.heal` (G20 / G98), single use
   *  (shown spent). At full health it is left for later. */
  private useWallMedkit(it: Interactable, who: string): void {
    if (who === 'local') {
      const h = this.target.health;
      const hp = stationHeal(h.hp, h.maxHp, this.player.alive, this.opts.difficulty ?? 'normal');
      if (hp === null) {
        this.hud.feedItem('Health full');
        it.progress = 0;
        return;
      }
      h.heal(hp - h.hp);
      this.events.emit('pickup', { kind: 'medkit' });
      this.hud.feedItem('Healed');
    } else if (!this.net?.healAtStation?.(who)) {
      it.progress = 0;
      return;
    }
    it.done = true;
    it.label = 'Medkit station (empty)';
    this.interactables?.setEnabled(it, false);
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
    this.stats.detections = this.style.detections;
    this.stats.alarms = this.style.alarms;
    this.stats.takedownsByKind = { ...this.takedown.done.byKind };
    this.stats.gadgetKos = this.gadgets.stats.gassed + this.gadgets.stats.mineKills;
    this.hud.banner(won ? 'VICTORY' : 'DEFEAT', subtitle, 2500);
    setTimeout(() => {
      this.paused = true;
      this.app.input.setGameplayActive(false);
      this.hud.setVisible(false);
      const rewards = GameState.rewardHook ? GameState.rewardHook(this.stats, this.opts) : Promise.resolve(null);
      void rewards.then((el) =>
        this.app.screens.push(new ResultsScreen(this.app, this.stats, won, subtitle, el, () => this.cb.restart(), () => this.cb.quit(), this.resultsNav())),
      );
    }, 1800);
  }

  /** Kit, Missions and Next for the results screen (menu-ui step 10). */
  private resultsNav(): ResultsNav {
    const names = (this.opts.loadout ?? []).map((l) => WEAPONS[l.id]?.name ?? l.id);
    const gid = this.opts.gadget as GadgetId | undefined;
    if (gid && GADGETS[gid]) names.push(GADGETS[gid].name);
    const nav: ResultsNav = { coop: !!this.net };
    if (names.length) nav.kit = names.join(', ');
    const cb = this.cb;
    const id = this.stats.missionId;
    if (!this.net && id && cb.missions) {
      nav.missions = () => cb.missions!();
      const i = MISSIONS.findIndex((x) => x.id === id);
      const nx = i >= 0 ? MISSIONS[i + 1] : undefined;
      if (nx && cb.briefing) nav.next = { label: 'Next mission', go: () => cb.briefing!(nx.id) };
    }
    return nav;
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
    this.mode?.start();
    // a controller dropping out mid-match opens the pause menu with the way back (MD12)
    this.padOff = this.app.input.events.on('padDisconnected', () => {
      if (this.app.input.mode === 'gamepad' && !this.photo) this.pause('Controller disconnected. Reconnect it, or press any key to continue.');
    });
    // the course's dev solo flag (D21, A6): a debug-overlay toggle in dev builds only, never in the menus
    if (import.meta.env.DEV && this.mode instanceof CourseMode) {
      const cm = this.mode;
      this.app.debug.setToggle('courseSolo', 'Course solo', cm.state?.solo ?? false, (on) => cm.setSolo(on));
    }
    if (this.opts.benchmark) {
      // the flight (3.2.5): the rooms joined by the guards' walking routes - through the doorways, never through a wall,
      // at a steady eye height (the doors open and their leaves hidden: an open leaf stands out into the corridor)
      this.world.doors.openAll();
      this.world.doors.setVisible(false);
      const rooms = this.world.layout.rooms ?? [];
      const keys: BenchPoint[] = rooms.map((r) => ({ x: (r.minX + r.maxX) / 2, y: r.minY ?? 0, z: (r.minZ + r.maxZ) / 2 }));
      if (!keys.length) {
        const s0 = this.world.layout.playerSpawns[0]!.pos;
        keys.push({ x: s0.x, y: s0.y, z: s0.z });
      }
      const t0 = performance.now();
      const pts = benchFlight(keys, this.flightNav(keys[0]!.y));
      console.info(`benchmark flight: ${pts.length.toFixed(0)} m through ${keys.length} rooms (${(performance.now() - t0).toFixed(0)} ms)`);
      const s = this.opts.benchmark;
      this.bench = { kind: s.kind, note: s.note ?? `fb-bench-${Date.now().toString(36)}`, started: s.started ?? Date.now(), pts, runs: s.runs, idx: s.idx - 1, t: 0, iv: [], cpu: [], last: 0, done: false, lines: [...s.lines], buckets: [], bMs: 0, bN: 0, bT: 0, sections: [], sMs: 0, sN: 0, sT: 0, shaders: 0, rebuild: null, handoff: false, tagT: 0 };
      this.nextBenchRun(true);
      document.body.classList.add('photo-mode');
      this.app.input.setGameplayActive(false);
    }
  }

  exit(): void {
    document.body.classList.remove('photo-mode');
    // (a run handing on to the next run's match keeps that run's settings, set by `app.benchmark`)
    if (this.bench && !this.bench.handoff) {
      this.app.quality.setOverride(null);
      benchTag(null);
    }
    this.exited = true;
    this.padOff?.();
    this.hud.setVisible(true);
    // never leave the loop in slow motion
    this.app.loop.timeScale = 1;
    this.post.dispose();
    this.nightGain.dispose();
    this.nightBloom.dispose();
    this.stack.dispose();
    this.weather.dispose();
    this.blobs.dispose();
    this.net?.dispose();
    this.net = null;
    this.audio?.dispose();
    this.app.input.setGameplayActive(false);
    for (const k of ['player', 'carry', 'combat', 'anim', 'clips']) this.app.debug.extra.delete(k);
    for (const k of ['bob', 'speed', 'accel', 'cam']) this.app.debug.removeTrace(k);
    this.app.debug.controllerCapsules = null;
    this.app.debug.setTeleports(null);
    this.app.debug.setToggle('courseSolo', '', false, null);
    this.app.debug.extra.delete('ai');
    this.mode?.dispose();
    this.enemyMgr?.clear();
    this.pickups?.dispose();
    this.stealth?.dispose();
    this.security?.dispose();
    this.gadgets.dispose();
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

  /** The pause look's state (menu-ui MD14); `PostStack` draws it, gameplay never reads it. */
  private readonly pauseLook = new PauseLook();
  private padOff: (() => void) | null = null;

  /** The mission's objectives and their state for the pause menu (G108). */
  objectiveLines(): ObjectiveLine[] {
    const m = this.mode;
    if (m instanceof InfiltrationMode) {
      const c = m.chain;
      return c.def.objectives.map((o, i) => ({ label: o.label, done: c.state === 'done' || i < c.index, current: c.state === 'active' && i === c.index }));
    }
    const t = this.hud.objectiveText;
    return t ? [{ label: t, done: false, current: true }] : [];
  }

  /** Opens the pause menu. `notice`: a line for the menu (a controller dropped out). */
  pause(notice = ''): void {
    if (this.paused || this.menuOpen) return;
    // coop never freezes the shared simulation; the menu just takes the input
    if (this.net) this.menuOpen = true;
    else this.paused = true;
    this.app.input.setGameplayActive(false);
    this.hud.setVisible(false);
    this.pauseLook.set(true);
    this.app.screens.push(
      new PauseScreen(
        this.app,
        () => {
          this.paused = false;
          this.menuOpen = false;
          this.pauseLook.set(false);
          this.hud.setVisible(true);
          this.app.input.setGameplayActive(true);
        },
        () => this.cb.quit(),
        { coop: !!this.net, objectives: () => this.objectiveLines(), dof: this.stack.hasDof, notice },
      ),
    );
  }

  private onPlayerDeath(): void {
    if (this.net?.onLocalDeath()) return;
    if (this.mode) {
      this.mode.onPlayerDeath();
      return;
    }
    this.hud.banner('DOWN', 'Respawning…', 2500);
    this.scheduleRespawn(this.world.layout.playerSpawns[0]!.pos, 3);
  }

  /** The held item latched by a tap (`access.holdToggle`). */
  private holdLatch: Interactable | null = null;

  /** Proximity + hold-to-interact with objectives. */
  private updateInteract(dt: number): void {
    const ints = this.interactables;
    if (!ints) return;
    ints.update(dt);
    const inputS = this.app.input.state;
    if (!inputS.pressed('interact')) this.interactSwallow = false;
    const pressI = inputS.pressed('interact') && !this.interactSwallow;
    // a takedown on offer / running takes the button
    if (this.takedown.offer || this.takedown.active) {
      if (this.interactTarget && !this.interactTarget.done) this.interactTarget.progress = 0;
      this.interactTarget = null;
      this.hud.setInteract(null);
      return;
    }
    const carryIt = this.stealth?.carryTarget(this.player.position) ?? null;
    const it = carryIt ?? (this.player.alive ? ints.nearest(this.player.position) : null);
    if (it !== this.interactTarget) {
      if (this.interactTarget && !this.interactTarget.done) this.interactTarget.progress = 0;
      this.interactTarget = it;
      this.holdLatch = null;
    }
    // (A3, G19, G97) A at a closed, unlocked door in reach, facing it: the CT door menu (no door item needed: sandbox and
    // co-op clients have none) unless another interactable is the target
    const dIdx = this.doorMenuCandidate();
    if (dIdx >= 0 && (!it || (it.kind === 'door' && it.id.startsWith('door-')))) {
      this.hud.setInteract('Door options', -1);
      if (pressI) {
        this.interactSwallow = true;
        this.doorMenu.show(dIdx, this.peekOffer === dIdx);
        this.doorMenuArmed = false;
        this.doorMenuNavT = 0;
        this.hud.setInteract(null);
      }
      return;
    }
    if (!it) {
      this.hud.setInteract(null);
      return;
    }
    // held actions: hold the button, or (Settings > Accessibility) tap to start and tap again to stop
    let holding = this.app.input.state.down('interact');
    if (it.holdTime > 0 && this.app.settings.get().access.holdToggle) {
      if (this.app.input.state.pressed('interact')) this.holdLatch = this.holdLatch === it ? null : it;
      holding = this.holdLatch === it;
    }
    if (holding) {
      const prev = it.progress;
      it.progress += dt;
      // a noisy hold (a manhole cover, a padlock) sounds at its start and on every pulse while it runs
      if (it.holdNoise && holdNoisePulse(prev, it.progress)) {
        this.eventNoise(it.holdNoise);
        this.enemyMgr?.hear(it.pos, it.holdNoise);
      }
    } else it.progress = Math.max(0, it.progress - dt * 2);
    const pct = it.holdTime > 0 ? Math.min(1, it.progress / it.holdTime) : 0;
    this.hud.setInteract(it.holdTime > 0 ? `${it.label} (hold) ${pct > 0 ? Math.round(pct * 100) + '%' : ''}` : it.label, it.holdTime > 0 ? pct : -1);
    if ((it.holdTime === 0 && pressI) || (it.holdTime > 0 && it.progress >= it.holdTime)) {
      if (it.onUse) it.onUse(it, 'local');
      else this.mode?.onInteract?.(it);
      this.interactTarget = null;
      this.hud.setInteract(null);
    }
  }

  /**
   * (A4, G23, G43, G178) The CT grab menu: opens as the hold starts, the selection moves on the menu / stick up and down,
   * A picks (Knock out, Kill, Carry work; Force to device and Interrogate are stubs), B (crouch) lets the guard go.
   * The operator stands still while it is open.
   */
  private grabMenuStep(dt: number, real: InputState): void {
    const m = this.grabMenu;
    const td = this.takedown;
    td.shovePressed = false;
    const holding = td.hostage !== null && td.active?.grab?.strikeT === -1 && this.player.alive;
    if (!holding) {
      if (m.open) m.close();
      this.hud.setDoorMenu(null, 0, 'grab');
      return;
    }
    if (!m.open) {
      m.show();
      this.grabMenuArmed = false;
      this.grabMenuNavT = 0;
    }
    // B (crouch / back) or Y always lets go: there is no way to get stuck in the menu
    if (real.pressed('crouch') || real.pressed('uiBack') || real.pressed('jump')) {
      td.shovePressed = true;
      this.player.controller.swallowCrouch = true;
      m.close();
      this.hud.setDoorMenu(null, 0, 'grab');
      return;
    }
    this.grabMenuNavT -= dt;
    if (!real.down('interact')) this.grabMenuArmed = true;
    // walking is free, so the stick cannot navigate: D-pad up / down (speed keys, wheel) move the pick; the arrows too
    // while standing still
    const nav = menuNavDir(real, true);
    if (this.grabMenuNavT <= 0 && nav !== 0) {
      m.move(nav);
      this.grabMenuNavT = 0.12;
    }
    if (this.grabMenuArmed && real.pressed('interact')) {
      const o = m.pick();
      this.interactSwallow = true;
      if (o === 'device' || o === 'interrogate') this.hud.feedItem(`${GRAB_OPT_LABEL[o]}: not built yet`, 'warn');
      else if (o) {
        td.menuPick = o;
        this.hud.setDoorMenu(null, 0, 'grab');
        return;
      }
    }
    this.hud.setDoorMenu(m.labels(this.menuLabels), m.sel, 'grab');
  }

  /** (F1b) Copy the walk and aim part of the real input into the grab input (all else blank). */
  private mirrorGrabInput(real: InputState): void {
    const gi = this.grabInp;
    gi.setMove('grab', real.move.x, real.move.y);
    const aim = this.player.ads || this.player.adsWanted;
    for (const a of GRAB_PASS) {
      const s = real.buttons[a];
      const d = gi.buttons[a];
      const live = aim || (a !== 'fire' && a !== 'altFire' && a !== 'reload' && a !== 'zoom' && a !== 'shoulderSwap');
      d.down = live && s.down;
      d.pressed = live && s.pressed;
      d.released = live && s.released;
    }
  }

  /** (A3) The closed, unlocked door in reach (1.6 m) the operator faces (within 90 deg of the camera), else -1. */
  private doorMenuCandidate(): number {
    const doors = this.world.doors;
    if (!doors.list.length || !this.player.alive || this.doorPeek.active || (this.wallCore?.active ?? false) || this.traversal.attached || !!this.traversal.committed || this.team.active || this.stealth?.carrying) return -1;
    const p = this.player.position;
    const d = doors.nearest(p.x, p.z, 1.6);
    if (!d || d.target !== 0 || d.anchor.locked || Math.abs(d.anchor.hinge.y - p.y) > 1.2) return -1;
    const cy = this.player.cam.yaw;
    return (d.cx - p.x) * Math.sin(cy) + (d.cz - p.z) * Math.cos(cy) > 0 ? d.index : -1;
  }

  /**
   * (A3, G19, G97) The CT door menu, run before the step's input is chosen: the selection moves on the menu / stick
   * up and down, A picks, B (crouch) or leaving the door's reach cancels. The operator stands still while it is open.
   */
  private doorMenuStep(dt: number, real: InputState): void {
    const m = this.doorMenu;
    if (!m.open) {
      this.hud.setDoorMenu(null);
      return;
    }
    const d = this.world.doors.list[m.door];
    const p = this.player.position;
    if (!d || !this.player.alive || d.target !== 0 || hyp2(d.cx - p.x, d.cz - p.z) > 2.2 || real.pressed('crouch') || real.pressed('uiBack')) {
      m.close();
      this.hud.setDoorMenu(null);
      return;
    }
    this.doorMenuNavT -= dt;
    if (!real.down('interact')) this.doorMenuArmed = true;
    const nav = menuNavDir(real, false);
    if (this.doorMenuNavT <= 0 && nav !== 0) {
      m.move(nav);
      this.doorMenuNavT = 0.12;
    }
    if (this.doorMenuArmed && real.pressed('interact')) {
      const o = m.pick();
      this.interactSwallow = true;
      if (o) this.doorMenuPick(o, d.index);
      this.hud.setDoorMenu(null);
      return;
    }
    this.hud.setDoorMenu(m.labels(this.menuLabels), m.sel);
  }

  /** The picked door option (A3, G97). */
  private doorMenuPick(o: 'open' | 'stealth' | 'bash' | 'optic', di: number): void {
    const doors = this.world.doors;
    const d = doors.list[di];
    if (!d) return;
    const useIt = (): void => {
      const it = this.interactables?.items.find((x) => x.id === `door-${d.anchor.id}`);
      if (it?.onUse) it.onUse(it, 'local');
      else doors.open(d, 'quiet');
    };
    switch (o) {
      case 'open':
        useIt();
        break;
      case 'stealth':
        this.stealthPick = true;
        break;
      case 'bash': {
        // a client has no door authority: its bash is a plain open through the host (prototype: bash is not on the wire)
        if (this.puppet) {
          useIt();
          break;
        }
        const p = this.player.position;
        const a = d.anchor;
        const side = (p.x - a.hinge.x) * Math.cos(a.yaw) - (p.z - a.hinge.z) * Math.sin(a.yaw) >= 0 ? 1 : -1;
        if (!doors.open(d, 'bash')) break;
        // a guard right behind the door is knocked out by it (CT: door-bash a guard)
        const em = this.enemyMgr;
        if (em) {
          for (const e of em.enemies) {
            if (!e.alive || e.taken || Math.abs(e.pos.y - a.hinge.y) > 1.5 || !guardBehindDoor(a, side, e.pos.x, e.pos.z)) continue;
            const dir = new Vector3(e.pos.x - d.cx, 0, e.pos.z - d.cz);
            if (dir.lengthSquared() > 1e-6) dir.normalize();
            e.knockOut({ amount: 9999, point: e.pos.clone(), dir, part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: new Vector3(p.x, p.y, p.z), impulse: 1, takedown: 'strike' });
            this.hud.feedItem('Guard knocked out by the door');
          }
        }
        break;
      }
      case 'optic':
        this.hud.feedItem('Optic cable: not built yet', 'warn');
        break;
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
  /** Forward rolls already made noise for; alive last step (a respawn resets the speed gear). */
  private rollSeen = 0;
  private aliveWas = true;
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

  /**
   * Player light level at `LIGHT.playerHz` from the light field (3.6: the baked lamps, moon and ambient; flashlights
   * with a ray against the level). The host samples every player the same way: guards read `ref.light` (bible L5).
   */
  private updateLight(dt: number): void {
    const reg = this.world.level.lights;
    reg.update(dt);
    this.lightT -= dt;
    if (this.lightT > 0) return;
    this.lightT = 1 / LIGHT.playerHz;
    const f = this.world.lightField;
    const p = this.player.position;
    // (operators 11e r1, G166) the body's real height (the rig's: Wren 1.68 m), so light hits the body you see
    const h = lightSampleHeight(this.player.rig.height, this.player.controller.crouchBlend);
    // (step 12) peeking: the head out past the edge is sampled where it is (light parity, bible 5.1); the chest stays
    // behind the wall. Remotes: the same from their MoveState (RemotePlayer sets `peekX` / `peekZ`).
    const wc = this.wallCore;
    let ox = wc && wc.phase === 'on' ? wc.exX : 0;
    let oz = wc && wc.phase === 'on' ? wc.exZ : 0;
    let hh = h;
    // (step 12b) on the wall the head sample is the real posed head (peek, the mirrored open-side lean, the low-wall
    // side lean under the top), as perception's exposure points
    if (wc && wc.phase === 'on' && this.player.pose.wall) {
      const hd = this.player.rig.posedHead(this.posedHead);
      const hs = posedHeadSample(p.x, p.y, p.z, hd.x, hd.y, hd.z, this.headSample);
      ox = hs.ox;
      oz = hs.oz;
      hh = hs.h;
    }
    this.lightLevel = f.bodyLevel(p.x, p.y, p.z, hh, this.lightOccluder, ox, oz);
    this.localRef.light = this.lightLevel;
    const rs = this.remotePlayers();
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i]!;
      // (step 12b fix r2) on a wall: the host's posed copy's head (the same sample as the remote's headPoint)
      const rh = r.head;
      if (rh) {
        const hs = posedHeadSample(r.feet.x, r.feet.y, r.feet.z, rh.x, rh.y, rh.z, this.headSample);
        r.light = f.bodyLevel(r.feet.x, r.feet.y, r.feet.z, hs.h, this.lightOccluder, hs.ox, hs.oz);
      } else r.light = f.bodyLevel(r.feet.x, r.feet.y, r.feet.z, lightSampleHeight(r.height ?? STANDARD_BODY, r.crouched ? 1 : 0), this.lightOccluder, r.peekX ?? 0, r.peekZ ?? 0);
    }
  }
  private readonly headSample = { ox: 0, oz: 0, h: 0 };

  private lightFrom = new Vector3();
  private readonly posedHead = new Vector3();
  private readonly posedChest = new Vector3();
  private lightTo = new Vector3();
  private lightRay = new PhysicsRaycastResult();
  private readonly floorFrom = new Vector3();
  private readonly floorTo = new Vector3();
  /** Free height over the floor point (x, y, z) up to `max`: one ray up against the static level. */
  private headroom(x: number, y: number, z: number, max: number): number {
    this.floorFrom.set(x, y + 0.3, z);
    this.floorTo.set(x, y + max, z);
    this.lightRay.reset();
    (this.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(this.floorFrom, this.floorTo, this.lightRay, { membership: G.PROJECTILE, collideWith: G.STATIC });
    return this.lightRay.hasHit ? this.lightRay.hitPointWorld.y - y : max;
  }
  /** The benchmark flight's view of the level: the nav grid (walking only) and the headroom ray. Without a grid, a
   *  flat floor at `y`. */
  private flightNav(y0: number): FlightNav {
    const nav = this.nav;
    const headroom = (x: number, y: number, z: number, max: number): number => this.headroom(x, y, z, max);
    const see = (x: number, y: number, z: number, yaw: number): number => {
      this.floorFrom.set(x, y, z);
      this.floorTo.set(x + Math.sin(yaw) * 8, y, z + Math.cos(yaw) * 8);
      this.lightRay.reset();
      (this.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(this.floorFrom, this.floorTo, this.lightRay, { membership: G.PROJECTILE, collideWith: G.STATIC });
      return this.lightRay.hasHit ? Vector3.Distance(this.floorFrom, this.lightRay.hitPointWorld) : 8;
    };
    if (!nav) {
      return { snap: (x, _y, z) => ({ x, y: y0, z }), path: (_a, b) => [b], floor: () => y0, clear: () => true, headroom, see };
    }
    return {
      snap: (x, y, z) => {
        const c = nav.nearestWalkable(x, z, 12, y);
        if (c < 0) return null;
        const [cx, cz] = nav.center(c);
        return { x: cx, y: nav.height[c]!, z: cz };
      },
      path: (a, b) => {
        nav.walkOnly = true;
        try {
          const w = nav.findPath([a.x, a.z], [b.x, b.z], 200000, a.y, b.y);
          if (!w) return null;
          let fy = a.y;
          return w.map((p, i) => {
            fy = i === w.length - 1 ? b.y : nav.heightAt(p[0], p[1], fy);
            return { x: p[0], y: fy, z: p[1] };
          });
        } finally {
          nav.walkOnly = false;
        }
      },
      floor: (x, z, y) => {
        const c = nav.cellOf(x, z, y);
        return nav.isWalkable(c) ? nav.height[c]! : Number.NaN;
      },
      clear: (a, b) => nav.lineClear([a.x, a.z], [b.x, b.z], a.y, b.y),
      headroom,
      see,
    };
  }
  /** Night vision's auto-gain: the lamps in view (Step 4b fix; rendering only). */
  private nightGain: NightAutoGain;
  /** Night vision's bloom (Step 4b fix round 4; rendering only). */
  private nightBloom: NightBloom;
  /** Static geometry on a segment (the glare's camera-to-lamp test; allocation-free). */
  private readonly glareBlocked = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean => {
    this.lightRay.reset();
    (this.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(this.lightFrom.set(ax, ay, az), this.lightTo.set(bx, by, bz), this.lightRay, { membership: G.PROJECTILE, collideWith: G.STATIC });
    return this.lightRay.hasHit;
  };
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
    const real = this.app.input.state;
    if (real.pressed('pause')) {
      this.gadgets.closeWheel(false);
      this.pause();
      return;
    }
    this.time += dt;
    // back from down / dead (respawn, revive, co-op): the speed gear starts over
    if (this.player.alive && !this.aliveWas) this.player.controller.gears.reset();
    this.aliveWas = this.player.alive;
    this.doorMenuStep(dt, real);
    this.grabMenuStep(dt, real);
    // (F1b) the grab menu lets you walk (slow) and aim the sidearm with the held guard: it passes the move and the
    // aim / fire actions through, everything else stays blank
    if (this.grabMenu.open) this.mirrorGrabInput(real);
    const takes = this.gadgets.fixedUpdate(dt, this.doorMenu.open || this.grabMenu.open ? this.blankInp : real);
    // the gadget wheel / a remote view / the door menu takes the input: the operator stands still (F1a: except under the
    // selection wheel, which runs over the live game: the left stick still walks, G179)
    const wheelWalk = this.gadgets.wheelOpen && !this.gadgets.remote && !this.doorMenu.open && !this.grabMenu.open;
    this.blankInp.setMove('wheel', wheelWalk ? real.move.x : 0, wheelWalk ? real.move.y : 0);
    const inp = takes || this.doorMenu.open ? this.blankInp : this.grabMenu.open ? this.grabInp : real;
    // (CT prototype B2) RB / F is the co-op action (team moves); pings are unbound for now
    if (inp.pressed('ping') && this.net && this.player.alive) this.sendPing();
    // a body on the shoulder: no traversal, weapon stowed, slow
    const carrying = this.stealth?.carrying ?? false;
    // a takedown running (from the last step): traversal stands aside
    const busy0 = this.takedown.active !== null || this.strike.active;
    // (step 13) the door peek before back-to-wall: its context press at a door is not a wall press
    this.doorPeekStep(dt, inp, busy0 || carrying);
    const busy = busy0 || this.doorPeek.active;
    // (A3, G96) jump / traverse is Y (Space); A (E) is the interact / context button: interactables, doors, takedowns
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
    // (3.2.0 phase 5) team moves come before traversal
    // (A3) a jump press on a wall does not traverse in the same step (a traversal that starts leaves the wall)
    const wallWas = this.wallCore?.active ?? false;
    const teamTook = this.team.fixedUpdate(dt, inp.pressed('coop') && !wallWas && !busy && !carrying, inp.pressed('drop'));
    // the relay hanger holds the hang still while the partner climbs their body
    if (this.team.hangLock) {
      ti.moveX = 0;
      ti.moveY = 0;
      ti.dropPressed = false;
      ti.dropHeld = false;
      ti.dropHeldT = 0;
      ti.useHeld = false;
      ti.useHeldT = 0;
    }
    if (this.team.active) this.traversal.hint = null;
    this.traversal.fixedUpdate(dt, inp.pressed('jump') && !wallWas && !teamTook && !this.team.active && !carrying && !busy, this.team.active);
    this.wallStep(dt, inp, busy || carrying);
    // the Chaos Theory forward roll is heard close by
    if (this.traversal.forwardRolls !== this.rollSeen) {
      this.rollSeen = this.traversal.forwardRolls;
      this.eventNoise(CT.rollNoise);
      this.enemyMgr?.hear(this.player.position, CT.rollNoise);
    }
    // attached (ladder, pipe, hang, duct) or carrying a body: both hands busy, the weapon goes to its slot
    // (3.2.0) braced in a split or hanging inverted: aiming (step 09: not firing) draws the sidearm one-handed
    const ac = this.traversal.attachCtl;
    const sidearm = ac.sidearmAim && this.weapons.sidearmIndex >= 0;
    const pl = this.player;
    if (sidearm) {
      const a = ac.m.anchor!;
      const inverted = a.kind === 'pipeH';
      if (a.kind === 'rappel') pl.attachAim = { yaw: Math.atan2(a.nx, a.nz), range: RAPPEL.aimYaw, pitchMin: RAPPEL.pitchMin, pitchMax: RAPPEL.pitchMax, inverted: false };
      else {
        const yaw = inverted ? pl.controller.yaw + Math.PI : pl.controller.yaw;
        pl.attachAim = inverted
          ? { yaw, range: PIPE.aimYaw, pitchMin: PIPE.pitchMin, pitchMax: PIPE.pitchMax, inverted: true }
          : { yaw, range: SPLIT.aimYaw, pitchMin: SPLIT.pitchMin, pitchMax: SPLIT.pitchMax, inverted: false };
      }
    } else pl.attachAim = null;
    // (3.2.0 phase 4) holding a hostage: the sidearm one-handed over their shoulder (step 09: aim alone draws it)
    const grabHold = this.takedown.hostage !== null;
    const draw = (sidearm || grabHold) && (pl.ads || pl.adsWanted);
    // (3.2.0 phase 5) braced / boosting / climbing up the ladder: hands busy (on top of it the weapon is free)
    const teamHands = this.team.active;
    this.weapons.setAttachedStow((this.traversal.attached && !!this.traversal.attach.spec?.holster) || carrying || this.takedown.active !== null || teamHands, draw);
    // (step 10) a strike keeps the holstered gun in its slot without the attach stow (whose held swap overlay the
    // remotes never see)
    this.weapons.handsBusy = this.strike.active;
    this.weapons.attachSpread = sidearm ? (pl.attachAim?.inverted ? PIPE.spreadMul : 1) : grabHold ? GRAB.spreadMul : 1;
    this.localRef.shield = grabHold ? (this.takedown.hostage as unknown as Damageable) : null;
    this.player.cam.attach = this.traversal.cameraPreset ?? (this.wallCore?.active ? 'wall' : null);
    this.player.cam.attachYaw = this.player.controller.yaw;
    // (carry and grab set their caps again each step while they hold)
    this.player.controller.speedCap = Infinity;
    this.stealth?.fixedUpdate();
    this.security?.fixedUpdate(dt);
    // (CT prototype B3) the held pistol jammer: LT / Z on a drawn pistol
    this.ctDev?.localStep(dt, inp.down('altFire'));
    // takedowns (Y / E: a takedown on offer, else the rest)
    // (co-op clients: takedowns on the host's enemies, through their puppets)
    {
      // (A4) the grab menu feeds the hold (`menuPick`, and its cancel as the let-go)
      this.takedown.grabToggle = this.app.settings.get().gameplay.grabToggle;
      this.takedown.fixedUpdate(dt, inp.pressed('interact') && !this.strike.active, inp.down('interact'));
    }
    // (locomotion step 10) fire while holstered: the elbow strike
    // (F1a, CT) holstered: RT / LMB = the lethal strike, LT / Z = the knockout (the palm strike); drawn they fire
    this.strike.fixedUpdate(dt, (inp.pressed('fire') || inp.pressed('altFire')) && this.weapons.drawPhase === 0 && !this.player.ads && !this.player.adsWanted, inp.pressed('fire'));
    this.suppression.update(dt);
    this.weapons.spreadMul = this.suppression.spreadMul;
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
      const steps = this.player.alive && c.grounded && c.steps !== 'silent' ? noiseRadius(c.speed, c.crouched || c.steps === 'crouched') * SURFACE_NOISE[this.surface] * this.suit.noise : 0;
      if (steps > 0) this.enemyMgr?.hear(this.player.position, steps);
      // (3.2.0) climbing a fence above a quiet gear rattles it
      const ac2 = this.traversal.attachCtl;
      const rattle = ac2.m.kind === 'fence' && ac2.fenceMoving && c.gear > FENCE.quietGear ? FENCE.rattle * this.suit.noise : 0;
      if (rattle > 0) this.enemyMgr?.hear(this.player.position, rattle);
      this.noise = Math.max(steps, rattle, this.evNoise);
    }
    this.updateLight(dt);
    this.updateVision(dt);
    this.landingNoise();
    this.updateCoverRef();
    this.updateExposure(dt);
    this.updateRoomTag(dt);
    this.enemyMgr?.update(dt);
    // detection: an enemy went to combat on the operator (stealth rules only)
    const em = this.enemyMgr;
    const det = !!em && em.stealth && em.anyAlerted;
    if (det && !this.detected) this.style.record('detected', true);
    this.detected = det;
    if (this.puppet) this.pickups?.update(dt, []);
    else
      this.pickups?.update(dt, [
        {
          id: 'local',
          feet: this.player.position,
          needs: () => this.player.alive,
        },
        ...(this.net?.pickers?.() ?? []),
      ]);
    this.updateInteract(dt);
    this.mode?.fixedUpdate(dt);
    this.net?.fixedUpdate(dt);
    if (this.respawnT >= 0) {
      this.respawnT -= dt;
      if (this.respawnT < 0) {
        const sp = this.respawnAt ?? this.world.layout.playerSpawns[0]!.pos;
        this.player.controller.override = null;
        this.traversal.reset();
        this.wallCore?.reset();
        this.doorPeek.reset();
        this.strike.reset();
        // (step 14) goggles up on respawn
        this.vision.reset();
        this.player.figure.resetGoggle();
        this.gadgets.reset();
        // HQ supply drops: gadgets restocked at the checkpoint
        if (this.hq.restock) this.weapons.gadgets.restock();
        this.suppression.reset();
        this.player.controller.teleport(sp, this.player.cam.yaw);
        this.target.revive();
        // brief spawn protection
        this.target.damageMul = 0;
        setTimeout(() => (this.target.damageMul = this.puppet ? 0 : 1), 2000);
        this.respawnAt = null;
        this.net?.onRespawn?.(sp);
      }
    }
  }

  /** Enemy blips on the minimap last frame (tests). */
  enemyBlips = 0;

  /** Holds the brightness calibration at its default. Unused since G9 (no traitor finale, no Confrontation); nothing sets it. */
  brightnessLocked = false;

  /** Photo mode (feedback screenshots): the camera is flown by the photo screen, the world holds still. */
  private photo = false;

  photoCamera(): FreeCamera {
    return this.player.cam.camera;
  }

  photoFreeze(on: boolean): void {
    this.photo = on;
  }

  /** Where a feedback note was written (Settings > Feedback, the pause menu). */
  feedbackContext(): Record<string, string> {
    const p = this.player.position;
    const o = this.opts;
    const ctx: Record<string, string> = {
      map: this.world.map.id,
      mode: this.mode?.id ?? (this.net ? 'co-op' : 'free roam'),
      position: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      facing: `${Math.round((((this.player.cam.yaw * 180) / Math.PI) % 360 + 360) % 360)} deg`,
    };
    if (o.missionId) ctx.mission = o.missionId;
    if (o.difficulty) ctx.difficulty = o.difficulty;
    if (this.net) ctx.net = this.puppet ? 'co-op client' : 'co-op host';
    if (this.enemyMgr) ctx.enemies = `${this.enemyMgr.enemies.filter((e) => e.alive).length} alive${this.enemyMgr.anyAlerted ? ', alerted' : ''}`;
    ctx.spikes = this.spikes.summary();
    return ctx;
  }

  /** 3.3: long frames this match (or this benchmark run) and what was happening around each. */
  readonly spikes = new SpikeLog();
  private spikeLast = 0;
  private spikeShaders = 0;
  private spikeLod = 0;
  private spikeGov = 0;

  /** Per render frame: the interval since the last one, tagged with this frame's events. */
  private trackSpikes(): void {
    const now = performance.now();
    const last = this.spikeLast;
    this.spikeLast = now;
    let ev = 0;
    const sh = this.shaderCount();
    if (sh !== this.spikeShaders) ev |= SPIKE_EVENT.shaders;
    this.spikeShaders = sh;
    let lod = 0;
    for (const v of this.world.voxelLayers) lod += v.lodSwaps;
    if (lod !== this.spikeLod) ev |= SPIKE_EVENT.lod;
    this.spikeLod = lod;
    const gv = this.app.quality.governor.level;
    if (gv !== this.spikeGov) ev |= SPIKE_EVENT.governor;
    this.spikeGov = gv;
    if (!last) return;
    const q = this.app.quality;
    this.spikes.frame(now - last, q.budgetMs, this.app.loop.stats.frameCpuMs, ev);
  }

  /** Benchmark (opts.benchmark): flight points, the runs and the current one's time and frame intervals after the
   *  warm-up; finished runs' lines; the sustained run's per-bucket averages. */
  private bench: {
    kind: BenchKind;
    /** The feedback note's id (updated after every run) and when the benchmark started. */
    note: string;
    started: number;
    /** Seconds to the run tag's next refresh. */
    tagT: number;
    pts: Flight;
    runs: BenchRun[];
    idx: number;
    t: number;
    iv: number[];
    /** Main-thread CPU per frame (the loop's update + render submission). */
    cpu: number[];
    last: number;
    done: boolean;
    lines: string[];
    buckets: number[];
    bMs: number;
    bN: number;
    bT: number;
    /** 3.3.1: fps per `SECTION_SECONDS` of the flight, and the section being summed. */
    sections: number[];
    sMs: number;
    sN: number;
    sT: number;
    /** Shaders compiled before this run started. */
    shaders: number;
    /** The run's mid-match rebuild, still to do (3.1.4 diagnosis). */
    rebuild: BenchRun['rebuild'] | null;
    /** Handed on to the next run's match. */
    handoff: boolean;
  } | null = null;
  private readonly benchP = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };

  /** Start the next run (its preset / render scale for now only), or show the results. */
  /** Shader programs compiled so far (a benchmark run's hitches: shaders compiled during it). */
  private shaderCount(): number {
    const c = (this.app.engine as unknown as { _compiledEffects?: Record<string, unknown> })._compiledEffects;
    return c ? Object.keys(c).length : 0;
  }

  private nextBenchRun(fresh = false): void {
    const b = this.bench;
    if (!b) return;
    b.idx++;
    b.t = 0;
    b.iv = [];
    b.cpu = [];
    b.sections = [];
    b.sMs = b.sN = b.sT = 0;
    b.last = 0;
    const run = b.runs[b.idx];
    if (run) {
      if (!fresh && !run.sameMatch) {
        // (3.1.4: the next run loads its own match with its settings; this one stops measuring - handed on after this
        // frame, since loading frees this match's scene)
        b.done = true;
        b.handoff = true;
        const next = { kind: b.kind, runs: b.runs, idx: b.idx, lines: b.lines, note: b.note, started: b.started };
        setTimeout(() => this.app.benchmark?.(next), 0);
        return;
      }
      // (the run's settings are the override `app.benchmark` set before the map loaded: it also holds the frame
      // governor off, so a run measures its settings)
      b.rebuild = run.rebuild ?? null;
      b.shaders = this.shaderCount();
      b.tagT = 0;
      this.app.crashLog?.stage(`benchmark run ${b.idx + 1}/${b.runs.length}: ${run.label} (${this.app.quality.level.name})`);
      return;
    }
    b.done = true;
    benchTag(null);
    this.app.quality.setOverride(null);
    document.body.classList.remove('photo-mode');
    this.paused = true;
    const text = b.lines.join('\n');
    // saved as a performance note at once (3.1.2: nothing to tap on a long report; 3.1.4: the same note, updated
    // after every run)
    void this.saveBenchNote().then(
      () => this.app.toasts.show('Benchmark saved to Settings > Feedback', 'ok'),
      () => this.app.toasts.show('The benchmark could not be saved', 'warn'),
    );
    this.app.screens.push(
      new Dialog('Benchmark (saved to Settings > Feedback)', text, [
        {
          label: 'Copy text',
          // (inside the tap: the clipboard needs the gesture)
          action: () => {
            const done = (ok: boolean): void => {
              this.app.toasts.show(ok ? 'Copied: paste it anywhere' : 'Copy is not allowed here: Settings > Feedback > Copy as text', ok ? 'ok' : 'warn');
              this.cb.quit();
            };
            const cb = navigator.clipboard;
            if (cb) cb.writeText(`Benchmark - ${text}`).then(() => done(true), () => done(false));
            else done(false);
          },
        },
        { label: 'Done', primary: true, action: () => this.cb.quit() },
      ]),
    );
  }

  /** The benchmark's feedback note: the lines so far (3.1.4: after every run, so a crash keeps them). */
  private saveBenchNote(): Promise<void> {
    const b = this.bench;
    if (!b) return Promise.resolve();
    // (3.1.7: the full context - device, display, every setting - with the runs)
    const e = newEntry({ ...feedbackContext(this.app), map: this.world.map.id, mode: 'benchmark', runs: b.runs.map((r) => r.label).join(', ') }, b.started);
    e.id = b.note;
    e.category = 'performance';
    const n = b.lines.length;
    e.text = n < b.runs.length ? `Benchmark (${n} of ${b.runs.length} runs so far) - ${b.lines.join('\n')}` : `Benchmark - ${b.lines.join('\n')}`;
    return this.app.feedback.save(e);
  }

  private benchFrame(): void {
    const b = this.bench;
    const run = b?.runs[b.idx];
    if (!b || b.done || !run) return;
    const now = performance.now();
    const real = b.last ? Math.min(0.25, (now - b.last) / 1000) : 0;
    if (b.last && b.t > BENCH.warmup) {
      const ms = now - b.last;
      // (the run's spikes: from the end of the warm-up)
      if (!b.iv.length) this.spikes.reset();
      b.iv.push(ms);
      b.cpu.push(this.app.loop.stats.frameCpuMs);
      // (3.3.1: the frame rate per section of the route)
      if (!run.sustained) {
        b.sMs += ms;
        b.sN++;
        b.sT += real;
        if (b.sT >= SECTION_SECONDS) {
          b.sections.push((1000 * b.sN) / b.sMs);
          b.sMs = b.sN = b.sT = 0;
        }
      }
      if (run.sustained) {
        b.bMs += ms;
        b.bN++;
        b.bT += real;
        if (b.bT >= BENCH.bucket) {
          b.buckets.push((1000 * b.bN) / b.bMs);
          b.bMs = 0;
          b.bN = 0;
          b.bT = 0;
        }
      }
    }
    b.last = now;
    b.t += real;
    // the run tag (3.1.4): which run this is and the frame rate now
    b.tagT -= real;
    if (b.tagT <= 0) {
      b.tagT = 0.5;
      const k = b.iv.length;
      let ms = 0;
      let m = 0;
      for (let i = k - 1; i >= 0 && ms < 500; i--, m++) ms += b.iv[i]!;
      benchTag(`Run ${b.idx + 1}/${b.runs.length} · ${run.label} · ${m > 0 && ms > 0 ? `${Math.round((1000 * m) / ms)} fps` : 'warming up'}`);
    }
    // (diagnosis: the same settings rebuilt mid-match, early in the warm-up)
    if (b.rebuild && b.t >= BENCH.warmup / 3) {
      const k = b.rebuild;
      b.rebuild = null;
      const level = this.app.quality.level;
      if (k === 'post') {
        this.stack.invalidate();
        this.applyQuality(level);
      } else this.world.applyQuality(level, true);
    }
    // guards keep patrolling but never fight; the operator takes no damage
    for (const e of this.enemyMgr?.enemies ?? []) e.passive = true;
    this.target.damageMul = 0;
    // (the same pace on every run: runs see the same views)
    const p = flightAt(b.pts, b.t * FLIGHT.speed, this.benchP);
    const cam = this.player.cam.camera;
    cam.position.set(p.x, p.y, p.z);
    const cp = Math.cos(p.pitch);
    cam.setTarget(this.dofTo.set(p.x + Math.sin(p.yaw) * cp, p.y + Math.sin(p.pitch), p.z + Math.cos(p.yaw) * cp));
    if (b.t >= run.seconds) {
      const r = benchResult(b.iv, b.cpu);
      const v = this.app.settings.get().video;
      // (3.2.1 desktop: the chosen resolution's name - and the real size when a window differs; a run with its own
      // scale shows the real size)
      const rw = this.app.engine.getRenderWidth();
      const rh = this.app.engine.getRenderHeight();
      const size = run.scale == null ? shownResolution(v.resolution, rw, rh) : `${rw}x${rh}`;
      const where = `${this.world.map.name}, ${run.preset ?? v.preset}, ${run.label}, ${size}`;
      let line = benchText(r, where, this.shaderCount() - b.shaders);
      // (3.3: what the long frames were)
      line += `; ${this.spikes.summary()}`;
      if (b.sN) b.sections.push((1000 * b.sN) / b.sMs);
      if (b.sections.length) line += `; ${sectionText(b.sections)}`;
      if (run.sustained && b.buckets.length >= 2) {
        const d = sustainedDrift(b.buckets);
        // (3.6: every minute - the gate is "no minute under 55")
        line += `; by minute ${b.buckets.map((x) => x.toFixed(0)).join(' ')} fps`;
        line += `; first minute ${b.buckets[0]!.toFixed(0)} fps, last ${b.buckets[b.buckets.length - 1]!.toFixed(0)} fps (${(d * 100).toFixed(1)}%${d < -0.1 ? ', throttling' : ''})`;
      }
      b.lines.push(line);
      if (b.idx + 1 < b.runs.length) void this.saveBenchNote().catch(() => undefined);
      this.nextBenchRun();
    }
  }

  /** The benchmark's result once finished (tests). */
  get benchmarkResult(): ReturnType<typeof benchResult> | null {
    return this.bench?.done ? benchResult(this.bench.iv) : null;
  }

  /** The finished runs' result lines (tests). */
  get benchmarkLines(): readonly string[] {
    return this.bench?.lines ?? [];
  }

  frameUpdate(dt: number, alpha: number): void {
    if (this.exited) return;
    this.trackSpikes();
    if (this.photo) {
      // frozen: only the lights follow the free camera
      this.world.frame(this.player.position, 0);
      this.stack.frame(0);
      // night vision's glare follows the free camera
      this.nightGain.set(this.vision.night, dt);
      this.nightBloom.k = this.vision.night;
      return;
    }
    const look = this.app.input.state.consumeLook();
    // the wheel cursor / remote view takes the look
    const gadgetInput = this.gadgets.takesInput;
    if (gadgetInput) {
      this.gadgets.look(look.x, look.y);
      look.x = look.y = 0;
    }
    this.app.input.setAds(this.player.ads);
    // suppression: the aim wanders (smooth, small) while rounds are cracking past
    // scoped (marksman optics): a slow breathing sway, steadier crouched and still
    if (dt > 0 && this.player.cam.ads > 0.6 && this.weapons.scoped) {
      this.scopeT += dt;
      const c = this.player.controller;
      const k = (c.crouched ? 0.45 : 1) * (c.speed > 0.3 ? 1.8 : 1) * 0.0035;
      look.x += Math.cos(this.scopeT * 0.9) * k * 0.9 * dt;
      look.y += Math.sin(this.scopeT * 1.3) * k * 1.3 * dt;
    }
    const sway = this.suppression.sway;
    if (sway > 0 && dt > 0) {
      this.swayT += dt;
      look.x += Math.cos(this.swayT * 2.3) * sway * 2.3 * dt;
      look.y += Math.cos(this.swayT * 1.7 + 1) * sway * 1.2 * dt;
    }
    this.traversal.frameUpdate(dt, alpha);
    this.stealth?.frameUpdate();
    this.takedown.frameUpdate();
    this.player.frameUpdate(dt, alpha, look, gadgetInput || this.doorMenu.open ? this.blankInp.move : this.app.input.state.move);
    this.gadgets.frameUpdate(dt);
    this.updateGadgetHud();
    this.hud.barks.update(dt, this.placeBark);
    this.updateCinematic(dt);
    this.enemyMgr?.frameUpdate(dt, alpha);
    this.updateStealthHud(dt);
    this.renderVision(dt);
    this.vfx.update(dt);
    this.audio?.frame(dt);
    this.mode?.frameUpdate(dt);
    this.net?.frameUpdate(dt);
    this.drawShadows();
    this.renderPings(dt);
    this.updateHud();
    if (this.bench) this.benchFrame();
  }

  /** Contact shadows: the player, enemies, dummies, the net layer's characters. */
  private drawShadows(): void {
    const b = this.blobs;
    b.begin();
    // real shadows (sun cascades, lamp and flashlight maps) replace the contact blobs
    if (this.app.quality.level.shadow.sun && !this.app.quality.level.shadow.staticSun) {
      b.end();
      return;
    }
    const p = this.player.position;
    b.add(p.x, p.y, p.z, 0.42);
    for (const e of this.enemyMgr?.enemies ?? []) if (e.alive) b.add(e.pos.x, e.pos.y, e.pos.z, e.dog ? 0.42 : 0.4 * e.def.scale);
    this.net?.shadows?.(b);
    b.end();
  }

  /** Last Known Position ghost (stealth rules only). */
  ghost: LkpGhost;
  /** Goggles: off -> night -> thermal -> electro (step 14; rendering only, never sent: D8). */
  readonly vision = new VisionState();
  /** Seconds since the last vision switch (the HUD label shows for `VISION_LABEL_TIME`). */
  private visionLabelT = 99;
  /** (Step 14) the render frame's stamp (bodies mark their rigs with it), and electro's live device parts. */
  private visionFrame = 0;
  private electroParts: InstancedMesh[] = [];
  private electroK = 0;
  private doorGhosts: DoorGhosts | null = null;

  /** Goggles per fixed step: the button cycles the modes. */
  private updateVision(_dt: number): void {
    const v = this.vision;
    if (this.app.input.state.pressed('vision') && this.player.alive && !this.doorMenu.open) {
      v.toggle();
      this.visionLabelT = 0;
      this.events.emit('vision', { mode: v.mode });
    }
  }

  /** Goggles per render frame: night vision blend, flip, lens glow. */
  private renderVision(dt: number): void {
    const v = this.vision;
    // (F1b, gog-1) the goggle flip plays only when turning vision on / off (a switch between modes has none)
    v.stepFlip(dt);
    this.post.setFlip(v.flipCentre);
    this.post.setNightVision(v.night);
    // (Step 4b fix) the lamps glare in the tube; their fixtures and beams brighten with the gain (rendering only)
    this.nightGain.set(v.night, dt);
    this.nightBloom.k = v.night;
    // (Step 4b) night vision is a gain inside the lighting (rendering only; gameplay never reads it)
    if (this.world.lamps) this.world.lamps.visionGain = 1 + (VISION_GAIN - 1) * v.night;
    // the tri-lens glows brighter while a mode is on (remote avatars never know: vision is not sent, D8)
    this.player.rig.setLensGlow(v.mode !== 'off');
    // (operators 11e, G73) Wren's goggle follows the picture on screen; its glow is emissive only (light parity)
    this.player.figure.setVision(v.shown, dt);
    // (step 14) thermal / electro: the post branch, then the render-only emissive flags (gameplay never reads them)
    const kind = v.kind;
    this.post.setVisionKind(kind);
    this.paintHeat(kind === 1);
    this.paintElectro(kind === 2 ? 1 : 0);
    // (A5, G102) thermal: a dim silhouette of a guard behind a closed door (render only)
    const gh = (this.doorGhosts ??= new DoorGhosts(this.scene, this.world.doors, (a, b, m) => this.ballistics.ray(a, b, m)));
    gh.update(kind === 1, this.player.cam.camera.position, this.enemyMgr?.enemies);
    this.world.lightRig.setVisionBoost(Math.max(v.night, kind === 2 ? 1 : 0));
    this.visionLabelT += dt;
    this.hud.setVision(this.visionLabelT < VISION_LABEL_TIME ? visionLabel(v.mode) : '', v.mode);
  }

  /** (Step 14) thermal's warm bodies: every live rig is warm; a fresh body cools over `THERMAL.coolTime`. */
  private paintHeat(on: boolean): void {
    const f = ++this.visionFrame;
    const bodies = on ? this.enemyMgr?.bodies : undefined;
    if (bodies) {
      for (let i = 0; i < bodies.length; i++) {
        const r = bodies[i]!.view;
        if (!r) continue;
        r.bodyFrame = f;
        r.bodyAge = bodies[i]!.age;
      }
    }
    for (let i = 0; i < LIVE_RIGS.length; i++) {
      const r = LIVE_RIGS[i]!;
      let k = 0;
      if (on) {
        k = THERMAL.bodyEmit;
        // (a body cools in 1/16 steps: its buffers change a few times a minute, not every frame)
        if (r.bodyFrame === f) k *= Math.round(16 * Math.max(0, 1 - r.bodyAge / THERMAL.coolTime)) / 16;
      }
      r.setHeat(k);
    }
    // the dogs' own bodies (their humanoid rigs stay hidden): warm while up, cooling like a body once down
    for (let i = 0; i < LIVE_DOGS.length; i++) {
      const d = LIVE_DOGS[i]!;
      let k = 0;
      if (on) {
        k = THERMAL.bodyEmit;
        if (d.isDown) k *= Math.round(16 * Math.max(0, 1 - d.downAge / THERMAL.coolTime)) / 16;
      }
      d.setHeat(k);
    }
  }

  /** (Step 14) electro's live devices: security cameras, alarm panels, switches, terminals, laser sights. */
  private paintElectro(k: number): void {
    if (k > 0 && this.electroK === 0) {
      // gathered on each switch to electro (not per frame): devices built since are included
      const list = this.electroParts;
      list.length = 0;
      for (const m of this.scene.meshes) {
        if (!(m instanceof InstancedMesh)) continue;
        const pn = m.parent?.name ?? '';
        if (m.name === 'laser' || m.name === 'stickycam-lens' || pn.startsWith('sec-cam-')) list.push(m);
      }
      // interactables by kind: only the powered ones (no intel folders, cache crates, beacons or hide spots)
      const its = this.interactables?.items;
      if (its) {
        for (let i = 0; i < its.length; i++) {
          const it = its[i]!;
          if (!ELECTRO_KINDS.has(it.kind)) continue;
          for (let j = 0; j < it.parts.length; j++) {
            const m = it.parts[j]!;
            if (m instanceof InstancedMesh) list.push(m);
          }
        }
      }
    }
    if (k === this.electroK) return;
    this.electroK = k;
    const list = this.electroParts;
    for (let i = 0; i < list.length; i++) {
      const pt = list[i]!.instancedBuffers?.pattern as Vector4 | undefined;
      if (pt) pt.w = k * ELECTRO.deviceEmit;
    }
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
        // only enemies that can see the player (or are close by) show an arc: a guard who merely heard
        // something through a wall does not give himself away
        const near = hyp2(e.pos.x - p.x, e.pos.z - p.z) < ARC_NEAR;
        if (!e.inSight && !near) continue;
        const red = e.alerted && e.sinceSeen < 0.6;
        if (!red && (e.alerted || e.meter < ARC_MIN)) continue;
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

  /** The player's cover for enemy flanking / grenades (step 11): the wall's `CoverSpot` while on it, else none. */
  private updateCoverRef(): void {
    const w = this.wallCore;
    const on = !!w && w.active && this.player.alive;
    this.localRef.cover = on ? w.spot : null;
    this.localRef.coverT = on ? w.onT : 0;
  }

  /**
   * (locomotion step 11) Back-to-wall: the context press (pad A, KBM bind) or the stick held
   * into a high face enters; the core drives the controller through its override; the pose and camera follow.
   */
  private wallStep(dt: number, inp: InputState, busy: boolean): void {
    const segs = this.world.level.coverSegments;
    const w = (this.wallCore ??= new WallCore(segs, buildWallLinks(segs), COVER_STANDOFF));
    const pl = this.player;
    const c = pl.controller;
    const tr = this.traversal;
    const i = this.wallIn;
    const was = w.active;
    const p = pl.position;
    const cy = pl.cam.yaw;
    const fx = Math.sin(cy);
    const fz = Math.cos(cy);
    const mx = inp.move.x;
    const my = inp.move.y;
    i.x = p.x;
    i.y = p.y;
    i.z = p.z;
    i.moveX = fz * mx + fx * my;
    i.moveZ = -fx * mx + fz * my;
    i.lookX = fx;
    i.lookZ = fz;
    i.gear = c.gear;
    i.crouched = c.crouched;
    i.grounded = c.grounded;
    i.context = inp.pressed('cover') && !this.peekTook;
    i.contextHeld = inp.down('cover') && !this.peekTook;
    i.crouchPressed = inp.pressed('crouch');
    // (21w, D7) hold-to-crouch: on a high wall the stance follows the held button
    i.crouchHold = !this.app.settings.get().gameplay.crouchToggle;
    i.crouchHeld = inp.down('crouch');
    const other = busy || tr.attached || !!tr.committed || this.team.active || !pl.alive || (!!c.override && c.override !== this.wallOv);
    // (A3, loco M25) only the button, aiming or another action leaves the wall (CT: aiming leaves it); a jump press that
    // starts a traversal leaves through `other`
    i.leave = inp.pressed('dash') || pl.ads || pl.adsWanted || other;
    i.blocked = other || pl.ads || pl.adsWanted;
    i.toggle = this.app.settings.get().gameplay.wallToggle;
    // stacking (D8): the other players on this segment
    w.othersN = w.seg >= 0 && this.net?.wallOthers ? this.net.wallOthers(w.seg, w.others) : 0;
    w.update(dt, i);
    if (w.active) {
      c.override = wallOverride(w, this.wallOv);
      if (i.crouchPressed) c.swallowCrouch = true;
    } else if (was || c.override === this.wallOv) c.override = null;
    // leaving a crouched wall keeps the stance the player had on it
    if (was && !w.active && w.crouch !== c.crouched) {
      if (w.crouch) c.setCrouchToggle();
      else c.clearCrouchToggle();
    }
    const pose = pl.pose;
    pose.wall = w.active;
    pose.wallSide = w.active ? (w.dir < 0 ? 1 : -1) : 0;
    // (step 12, A3) the head-first peek past the edge (the hit volumes follow the rig: guards see the real body, never
    // the camera)
    pose.lean = w.phase === 'on' ? w.rigLean() : 0;
    // (step 12b, D9) the open side at a left edge: the weapon to the left hand / shoulder, blended by the rig over
    // EDGE_HAND_TIME (the remotes from WALL_SUB.leftHand)
    // (F1a, cam-5) on the left shoulder (after the aim's shoulder swap) the weapon is in the left hand too; (anim-cleanup)
    // only settled in the aim pocket, never mid-draw / holster / reload (the travel paths and the reload are
    // right-handed), and the partner sees it (localMoveState: ground sub bit 128)
    pl.rig.openLeft = w.leftHand || (!w.active && pl.cam.shoulder < 0 && this.weapons.handSwitchOk);
    const g = w.seg >= 0 ? segs[w.seg] : undefined;
    pose.wallNx = g ? g.nx : 0;
    pose.wallNz = g ? g.nz : 0;
    pose.wallTx = g ? g.tx : 0;
    pose.wallTz = g ? g.tz : 0;
    pose.wallGap = COVER_STANDOFF;
    pose.wallFace = g ? g.nx * g.ax + g.nz * g.az : 0;
    // at an edge the shoulder goes to the open side (the edge at b is the body's left)
    pl.cam.wallSide = !w.active ? 0 : w.edge !== 0 ? (w.edge > 0 ? -1 : 1) : w.dir < 0 ? 1 : -1;
    // (step 12, A3) the peek camera swing toward the edge (local only, never sent)
    pl.cam.wallPeek = w.phase === 'on' && w.peekOn ? 1 : 0;
    pl.cam.wallEdgeX = g && w.edge !== 0 ? w.edge * g.tx : 0;
    pl.cam.wallEdgeZ = g && w.edge !== 0 ? w.edge * g.tz : 0;
  }

  /**
   * (locomotion step 13) Door peek: the context press at a closed, unlocked door faced within 60 deg settles on the
   * frame, cracks the leaf (host-authoritative in co-op) and frames the view at the crack; a press or the stick pulled
   * back closes it, the stick pushed in or `interact` opens it quietly; damage, aim, jump or sprint ends the peek.
   */
  private doorPeekStep(dt: number, inp: InputState, busy: boolean): void {
    const dp = this.doorPeek;
    const doors = this.world.doors;
    const pl = this.player;
    const c = pl.controller;
    const p = pl.position;
    const tr = this.traversal;
    const was = dp.active;
    this.peekTook = false;
    const other = busy || tr.attached || !!tr.committed || this.team.active || !pl.alive || !!this.wallCore?.active || (!!c.override && c.override !== this.peekOv);
    // (A3) the peek starts from the door menu's Stealth open pick (no longer a button of its own)
    const ctx = this.stealthPick;
    this.stealthPick = false;
    let cand = -1;
    let offer = -1;
    if (!was && !other && doors.list.length) {
      const d = doors.nearest(p.x, p.z, 2);
      if (d && doorPeekEligible(d, d.cracked && this.peekedByOther(d.cx, d.cz), p.x, p.z, pl.cam.yaw, c.grounded, false)) offer = d.index;
    }
    this.peekOffer = offer;
    if (ctx) cand = offer;
    const d0 = dp.door >= 0 ? doors.list[dp.door] : undefined;
    const hp = this.target.health.hp;
    const hurt = was && hp < this.peekHp;
    this.peekHp = hp;
    const fr = this.peekFrame;
    const interact = inp.pressed('interact');
    const pi = this.peekIn;
    pi.context = ctx;
    pi.interact = interact;
    // the stick toward the door (the frame's facing)
    const cy = pl.cam.yaw;
    const wx = Math.cos(cy) * inp.move.x + Math.sin(cy) * inp.move.y;
    const wz = -Math.sin(cy) * inp.move.x + Math.cos(cy) * inp.move.y;
    pi.push = was ? wx * Math.sin(fr.yaw) + wz * Math.cos(fr.yaw) : 0;
    // (F1b, door-2) solo / host: the stick drives the opening (push in opens slowly by that much, release holds it, pull
    // back at the crack closes it); the core only sees the pull-back. A co-op client keeps the old push-to-open.
    if (!this.puppet && was && d0 && dp.phase === 'peek') {
      const cur = Math.max(d0.open, d0.ajar);
      const nxt = driveStep(cur, pi.push, dt);
      if (nxt !== cur) doors.drive(d0, nxt);
      if (cur > DOOR.crack + 1e-6 || nxt > DOOR.crack + 1e-6) pi.push = 0;
    }
    // (KBM shares E between traverse and interact: an interact press opens, it does not end the peek)
    pi.end = was && (other || hurt || pl.ads || pl.adsWanted || (inp.pressed('jump') && !interact) || inp.pressed('dash'));
    pi.candidate = cand;
    // (fix r1) an abandoned crack: the peek resumes at it (no crack request), so it can be closed
    pi.resume = cand >= 0 && doors.list[cand]!.cracked;
    pi.doorOpened = !!d0 && d0.target === 1 && !d0.held;
    const act = dp.update(dt, pi);
    if (!was && dp.active) {
      const d = doors.list[dp.door]!;
      doorFrame(d.anchor, p.x, p.z, 1.0 + 0.6 * (1 - c.crouchBlend), fr);
    }
    if (ctx && (was || dp.active)) this.peekTook = true;
    const d = dp.door >= 0 ? doors.list[dp.door] : d0;
    if (d && act === PEEK_ACT.crackOn) this.peekCrack(d.index, true);
    else if (d && act === PEEK_ACT.crackOff) this.peekCrack(d.index, false);
    else if (d0 && act === PEEK_ACT.open && !interact) {
      // the stick pushed in: the door's own quiet open (the host's on a client); an interact press already used it
      const it = this.interactables?.items.find((x) => x.id === `door-${d0.anchor.id}`);
      if (it?.onUse) it.onUse(it);
      else doors.open(d0, 'quiet');
    }
    const rig = pl.rig;
    if (dp.active) {
      const ov = this.peekOv;
      const v = (ov.velocity ??= { x: 0, z: 0 });
      const left = dp.phase === 'settle' ? Math.max(dt, DOOR_PEEK.settle - dp.t) : 0.1;
      v.x = (fr.x - p.x) / left;
      v.z = (fr.z - p.z) / left;
      ov.yaw = fr.yaw;
      ov.crouch = c.crouched;
      ov.turnRate = 12;
      ov.glide = true;
      ov.run = false;
      ov.noise = 'crouched';
      c.override = ov;
      // the hand on the handle (the hand away from the hinge), following the drawn leaf
      const dd = doors.list[dp.door]!;
      crackedHandle(dd.anchor, fr.side, Math.max(dd.open, dd.ajar), DOOR.openAngle, this.peekHand);
      const reach = fr.hingeRight ? rig.reachL : rig.reachR;
      // (anim-cleanup) a door handle is not a grip axis
      clearGripAxis(reach);
      reach.x = this.peekHand.x;
      reach.y = this.peekHand.y;
      reach.z = this.peekHand.z;
      reach.w = dp.handW();
    } else if (was) {
      if (c.override === this.peekOv) c.override = null;
      rig.reachL.w = rig.reachR.w = 0;
    }
    // the view at the crack (local only, never sent)
    const cam = pl.cam;
    cam.doorPeek = dp.view();
    cam.doorEye.set(fr.ex, fr.ey, fr.ez);
    cam.doorYaw = fr.yaw;
  }

  /** (step 13 fix r1) A team-mate in mode doorPeek at the door centred (cx, cz) (within the host's crack reach). */
  private peekedByOther(cx: number, cz: number): boolean {
    const mates = this.net?.teamMates?.();
    if (!mates) return false;
    for (let i = 0; i < mates.length; i++) {
      const m = mates[i]!;
      if (m.mode === 'doorPeek' && hyp2(m.pos.x - cx, m.pos.z - cz) <= DOOR_PEEK.hostReach) return true;
    }
    return false;
  }

  /** (step 13) Crack / close door `i`: on a client the host decides (predicted here), else at once. */
  private peekCrack(i: number, on: boolean): void {
    const d = this.world.doors.list[i];
    if (!d) return;
    this.net?.doorCrack?.(i, on);
    this.world.doors.crack(d, on);
  }

  /** Room tag (4 Hz) on maps with tagged rooms; Clear mode marks cleared rooms. */
  private updateRoomTag(dt: number): void {
    const rooms = this.world.layout.rooms;
    if (!rooms?.length) return;
    this.roomT -= dt;
    if (this.roomT > 0) return;
    this.roomT = 0.25;
    const p = this.player.position;
    const ri = roomAt(rooms, p.x, p.z, p.y);
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
    // (step 12b) back to a wall the head and chest samples are the real posed body (peek, open-side lean, side lean)
    if (p.pose.wall) exposurePointsPosed(p.position, c.crouchBlend, Math.cos(c.yaw), -Math.sin(c.yaw), p.pose.lean, p.rig.posedHead(this.posedHead), p.rig.posedChest(this.posedChest), this.expPts, p.rig.height);
    else exposurePoints(p.position, c.crouchBlend, Math.cos(c.yaw), -Math.sin(c.yaw), p.pose.lean, this.expPts, p.rig.height);
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

  private scopeT = 0;

  /** (locomotion step 19) The match's difficulty, resolved once at start (preset or custom; the host's in co-op). */
  diff!: DifficultyDef;

  /** Difficulty tier rules (perception, damage). */
  get difficultyDef(): DifficultyDef {
    return this.diff;
  }

  /** Bark position: over the speaker's head (false when gone or off screen). */
  private placeBark = (who: string, out: { x: number; y: number }): boolean => {
    const em = this.enemyMgr;
    if (!em) return false;
    for (const e of em.enemies) {
      if (e.id !== who || !e.alive) continue;
      if (!this.project(e.pos.x, e.pos.y + (e.dog ? 1.0 : 2.15 * e.def.scale), e.pos.z)) return false;
      out.x = this.scr.x;
      out.y = this.scr.y;
      return true;
    }
    return false;
  };

  private readonly wheelView: WheelView = { open: false, ring: [], seg: -1, mode: 'night', visionSel: 'night', visionOn: false, gun: 0, gadget: '', hint: '' };

  /** Selection wheel and the remote feed overlay. */
  private updateGadgetHud(): void {
    const gs = this.gadgets;
    const wv = this.wheelView;
    wv.open = gs.wheelOpen;
    if (wv.open) {
      wv.ring = gs.ring;
      wv.seg = gs.sel.seg;
      wv.mode = gs.sel.mode;
      wv.visionSel = this.vision.selected;
      wv.visionOn = this.vision.mode !== 'off';
      wv.gun = this.weapons.slotIndex;
      wv.gadget = this.weapons.gadgets.selected;
      const pad = this.app.input.mode === 'gamepad';
      wv.hint = pad ? 'Hold LB for the selection wheel, right stick to pick, release to select. Tap LB to switch weapon. D-pad left toggles the vision, D-pad right uses the gadget.' : `Hold [${keyLabels.wheel}] for the selection wheel, move the mouse to pick, release to select. Tap [${keyLabels.wheel}] to switch weapon.`;
    }
    this.hud.gadgets.update(wv);
    this.hud.gadgets.setFeed(gs.feedText(this.app.input.mode));
  }

  private updateCinematic(dt: number): void {
    const v = this.app.settings.get().video;
    const key = `${v.vignette}${v.filmGrain}`;
    if (key !== this.postKey) {
      this.postKey = key;
      this.post.configure(v.vignette, v.filmGrain);
    }
    // (Step 4b) the brightness calibration (the lock is unused since G9: no Confrontation)
    this.post.setBrightness(this.brightnessLocked ? 1 : v.brightness);
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
    // depth of field: aiming focuses on what the sight is on
    const st = this.stack;
    st.focusOn = this.player.ads;
    if (st.focusOn) {
      const cam = this.player.cam.camera;
      const o = cam.globalPosition;
      const f = cam.getDirection(this.dofDir.set(0, 0, 1));
      this.dofTo.set(o.x + f.x * 80, o.y + f.y * 80, o.z + f.z * 80);
      st.focus = Math.max(1, this.ballistics.hitDistance(o, this.dofTo, G.STATIC | G.ENEMY));
    }
    st.frame(real);
    const cp = this.player.cam.camera.globalPosition;
    this.weather.frame(real, cp.x, cp.y, cp.z);
  }
  private readonly dofDir = new Vector3();
  private readonly dofTo = new Vector3();

  private markerPt = new Vector3();
  /** The last `project` result (percent of the view). */
  readonly scr = { x: 0, y: 0 };

  /** Co-op pings showing (one per player; the newest replaces that player's last). */
  readonly pings: { by: string; x: number; y: number; z: number; target: string; color: string; t: number }[] = [];

  /** Show a ping from `by` (the net layer calls this for its own and the team's). */
  addPing(by: string, x: number, y: number, z: number, target: string, color: string): void {
    const old = this.pings.findIndex((p) => p.by === by);
    if (old >= 0) this.pings.splice(old, 1);
    if (this.pings.length >= PING_MAX) this.pings.shift();
    this.pings.push({ by, x, y, z, target, color, t: PING_LIFE });
    this.app.sfx.hitMarker('hit');
  }

  /** The ping button: what the crosshair is on (a guard, else the spot), up to 120 m. */
  private sendPing(): void {
    const cam = this.player.cam;
    const o = cam.camera.position;
    const hit = this.ballistics.ray(o, o.add(cam.forward.scale(120)), MASK.PLAYER_SHOT);
    if (!hit.hit) return;
    const t = hit.target && hit.target.team === 'enemy' ? hit.target.id : '';
    this.mode?.onLocalPing?.();
    this.net?.ping?.(hit.point.x, hit.point.y, hit.point.z, t);
  }

  /** Pings per render frame: age, follow a pinged guard, place on screen (on the edge when off it). */
  private renderPings(dt: number): void {
    const v = this.hud.pings;
    v.begin();
    const vs = this.pings.length ? this.takedownVictims() : null;
    const p = this.player.position;
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const g = this.pings[i]!;
      g.t -= dt;
      if (g.t <= 0) {
        this.pings.splice(i, 1);
        continue;
      }
      if (g.target && vs) {
        let alive = false;
        for (let k = 0; k < vs.length; k++) {
          const e = vs[k]!;
          if (e.id !== g.target) continue;
          if (e.alive) {
            g.x = e.pos.x;
            g.y = e.pos.y + 1.9 * e.def.scale;
            g.z = e.pos.z;
            alive = true;
          }
          break;
        }
        if (!alive) g.target = '';
      }
      const dist = hyp2(g.x - p.x, g.z - p.z);
      const fade = Math.min(1, g.t / 0.8);
      if (this.project(g.x, g.y + 0.2, g.z)) v.add(this.scr.x, this.scr.y, g.color, dist, !!g.target, false, fade);
      else {
        // off screen: on the left / right edge towards it
        const rel = Math.atan2(g.x - p.x, g.z - p.z) - this.player.cam.yaw;
        const s = Math.sin(rel);
        v.add(s >= 0 ? 96 : 4, 45, g.color, dist, !!g.target, true, fade);
      }
    }
    v.end();
  }

  /** World point to percent of the view in `scr`; false when off screen (HUD markers). */
  project(x: number, y: number, z: number): boolean {
    const m = this.markerPt.set(x, y, z);
    Vector3.TransformCoordinatesToRef(m, this.scene.getTransformMatrix(), m);
    if (!(m.z > 0 && m.z < 1 && Math.abs(m.x) < 1.05 && Math.abs(m.y) < 1.05)) return false;
    this.scr.x = (m.x * 0.5 + 0.5) * 100;
    this.scr.y = (0.5 - m.y * 0.5) * 100;
    return true;
  }

  /** World prompts on the surfaces: vault / climb / step on the obstacle. */
  private updateCoverHud(): void {
    const w = this.hud.world;
    w.set('state', null, 0, 0);
    // traversal: on the obstacle face, or on the floor at the ledge
    const th = this.traversal.hint;
    const tl = th && !anchorFirst(this.traversal.attachHint) ? (TRAVERSE_LABEL[th.kind] ?? '') : '';
    if (tl && th) {
      const at = this.traversal.hintAt;
      const up = th.kind === 'drop' || th.kind === 'hop' ? 0.12 : Math.max(0.2, Math.min(PROMPT_Y, th.height * 0.5));
      const ok = this.project(at.x, at.y + up, at.z);
      w.set('vault', ok ? tl : null, this.scr.x, this.scr.y);
    } else w.set('vault', null, 0, 0);
    this.anchorPrompts();
    // (CT prototype B2) the team-move prompt: names the move and who starts it (Co-op action glyph)
    const tp = this.team.prompt;
    if (tp && !this.takedown.offer) {
      const at = this.team.promptAt;
      const ok = this.project(at.x, at.y, at.z);
      w.set('coop', ok ? tp : null, this.scr.x, this.scr.y);
    } else w.set('coop', null, 0, 0);
    this.drawRope();
    // takedown: on the victim, above the head
    const off = this.takedown.active ? null : this.takedown.offer;
    const host = this.takedown.hostage;
    if (off) {
      const e = off.e;
      const ok = this.project(e.pos.x, e.pos.y + 1.95 * e.def.scale, e.pos.z);
      const lbl = off.lethalOnly ? 'Lethal takedown' : off.plan.kind === 'behind' && !off.e.def.quadruped ? 'Grab' : off.plan.kind === 'drop' ? 'Drop attack' : 'Takedown';
      w.set('takedown', ok ? lbl : null, this.scr.x, this.scr.y);
    } else if (host && this.takedown.active?.grab?.strikeT === -1) {
      // (3.2.0) holding a hostage: tap knocks out, hold kills
      const ok = this.project(host.pos.x, host.pos.y + 1.95 * host.def.scale, host.pos.z);
      w.set('takedown', ok ? 'Held' : null, this.scr.x, this.scr.y);
    } else w.set('takedown', null, 0, 0);
    // (G107) no speed-gear indicator: the max-speed cap is felt, not shown
    this.hud.setTactical(1, this.expEyes.length ? this.exposure : -1, this.noise <= 0 ? 0 : this.noise < 3 ? 1 : this.noise < 8 ? 2 : 3, this.suppression.value);
    w.flush();
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
      // climb up: on the lip above the hands; (3.2.0) on a horizontal pipe: legs up / invert / curl up
      let pipeY = a.kind === 'pipeH' && on && !ac.jump && !ac.pipe.busy ? (ac.pipe.mode === 'hands' ? ATTACH_LABEL.legsUp! : ac.pipe.mode === 'legsUp' ? ATTACH_LABEL.invert! : ATTACH_LABEL.curlUp!) : null;
      // (3.2.0 phase 3) a rope: kick out / through the window beside it; a fence: flip over at the top
      if (a.kind === 'rappel' && on) pipeY = ac.ropeWindow ? ATTACH_LABEL.kickThrough! : ac.swingT < 0 ? ATTACH_LABEL.kickOut! : null;
      if (a.kind === 'fence' && on) pipeY = ac.fenceTop ? ATTACH_LABEL.flipOver! : null;
      if (on && ac.canClimb && !ac.jump && this.project(hx, hy + 0.12, hz)) w.set('vault', ATTACH_LABEL.climbUp!, this.scr.x, this.scr.y);
      else if (pipeY && a.kind === 'pipeH' && this.project(this.player.position.x, a.hangHeight + 0.15, this.player.position.z)) w.set('vault', pipeY, this.scr.x, this.scr.y);
      else if (pipeY && (a.kind === 'rappel' || a.kind === 'fence') && this.project(this.player.position.x, this.player.position.y + 1.7, this.player.position.z)) w.set('vault', pipeY, this.scr.x, this.scr.y);
      else w.set('vault', null, 0, 0);
      const j = on ? ac.jump : null;
      if (j && this.project(j.grip.x, j.grip.y + 0.1, j.grip.z)) w.set('jumpTo', ATTACH_LABEL.jump!, this.scr.x, this.scr.y);
      else w.set('jumpTo', null, 0, 0);
      // drop (slide on a ladder): under the hands
      const lbl = a.kind === 'ladder' ? 'Slide' : a.kind === 'zipline' || a.kind === 'duct' ? null : a.kind === 'rappel' ? (a.length - m.s <= RAPPEL.unhookHeight ? ATTACH_LABEL.unhook! : null) : a.kind === 'pipeH' && ac.pipe.busy ? null : a.kind === 'pipeH' && ac.pipe.mode === 'legsUp' ? 'Hands' : ATTACH_LABEL.drop!;
      const dropAt = a.kind === 'split' || (a.kind === 'pipeH' && ac.pipe.mode !== 'hands') ? this.player.position : null;
      if (on && lbl && (dropAt ? this.project(dropAt.x, dropAt.y + 0.3, dropAt.z) : this.project(hx, hy - 0.5, hz))) w.set('drop', lbl, this.scr.x, this.scr.y);
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
    const blocked = !!geo;
    // at a hangable edge the drop control (hold) / its prompt lowers into a hang (traverse there still drops)
    const low = blocked ? null : ac.lower;
    if (low) {
      const a = low.anchor as Ledge;
      if (this.project(a.a.x + a.tx * low.s, a.top + 0.45, a.a.z + a.tz * low.s)) w.set('drop', ATTACH_LABEL.ledgeAbove!, this.scr.x, this.scr.y);
      else w.set('drop', null, 0, 0);
    } else w.set('drop', null, 0, 0);
    // (3.2.0) between two tall walls: a double jump braces in the split
    const sp = !h && !blocked && !t.hint ? ac.split : null;
    if (sp && sp.anchor.kind === 'split') {
      const sa = sp.anchor;
      if (this.project(sa.a.x + sa.tx * sp.s, sa.a.y + 1.7, sa.a.z + sa.tz * sp.s)) {
        w.set('vault', ATTACH_LABEL.splitDouble!, this.scr.x, this.scr.y);
      }
    }
    if (!h || blocked) return;
    const a = h.anchor;
    const g = this.promptPt;
    const feetY = this.player.position.y;
    switch (a.kind) {
      case 'ledge':
        // on the face just under the lip (the lip itself is at the top edge of the view up close); a wall jump: on
        // the wall at head height (the lip is out of view)
        if (h.entry === 'wall') g.set(a.a.x + a.tx * h.s + a.nx * 0.05, feetY + 1.6, a.a.z + a.tz * h.s + a.nz * 0.05);
        else g.set(a.a.x + a.tx * h.s + a.nx * 0.05, a.top - 0.35, a.a.z + a.tz * h.s + a.nz * 0.05);
        break;
      case 'split':
        // between the walls, where the feet will brace
        g.set(a.a.x + a.tx * h.s, a.a.y + 1.9, a.a.z + a.tz * h.s);
        break;
      case 'rappel':
        g.set(a.top.x - a.nx * 0.25, a.top.y + 0.7, a.top.z - a.nz * 0.25);
        break;
      case 'fence':
        g.set(a.a.x + a.tx * h.s, feetY + 1.3, a.a.z + a.tz * h.s);
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

  /** (3.2.0) The local player's rappel rope: anchor to harness while on it. */
  private drawRope(): void {
    const ropes = this.world.ropes;
    const m = this.traversal.attachCtl.m;
    const a = m.anchor;
    if (a && a.kind === 'rappel' && !(m.phase === 'exit' && m.progress > 0.6)) {
      const h = this.player.rig.hips;
      h.computeWorldMatrix(true);
      const p = h.getAbsolutePosition();
      ropes.set('local', a.top.x - a.nx * 0.25, a.top.y + 0.55, a.top.z - a.nz * 0.25, p.x, p.y, p.z);
    } else ropes.hide('local');
    ropes.flush();
  }

  private updateHud(): void {
    const cam = this.player.cam;
    const acc = this.app.settings.get().access;
    this.hud.setAccess(acc);
    cam.shakeMul = acc.shake;
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
      weapon: w.def.name,
      mag: w.mag,
      magSize: w.stats.magSize,
      reserve: this.weapons.infiniteAmmo ? Infinity : w.reserve,
      gadget: this.weapons.gadgets.selected,
      grenades: this.weapons.gadgets.count,
      reloadProgress: this.weapons.reloadProgress,
      spreadPx,
      // (step 09) the crosshair shows only drawn and aiming
      crosshair: this.weapons.drawPhase === 2 && this.player.ads,
      onTarget: this.onTarget,
      ads: this.player.cam.ads > 0.5,
      yaw: cam.yaw,
      markers: [],
    };
    const blips: Blip[] = [];
    // Hunter / Infiltration: no enemy blips (find them yourself) unless the HQ radar is bought (within its range)
    const stealthMode = this.mode instanceof ClearMode || this.mode instanceof InfiltrationMode;
    const radar = stealthMode ? this.hq.radar : Infinity;
    let enemyBlips = 0;
    if (radar > 0) {
      const pp = this.player.position;
      for (const t of this.registry.hostiles('player')) {
        t.center(this.tmp);
        if (hyp2(this.tmp.x - pp.x, this.tmp.z - pp.z) > radar) continue;
        blips.push({ x: this.tmp.x, z: this.tmp.z, kind: 'enemy' });
        enemyBlips++;
      }
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

/** One upright capsule (feet at y, `h` tall) into the reflection pass's arrays at `n`; returns n + 1. */
function rtCapsule(a: Float32Array, b: Float32Array, n: number, x: number, y: number, z: number, h: number): number {
  a[n * 4] = x;
  a[n * 4 + 1] = y + 0.25;
  a[n * 4 + 2] = z;
  a[n * 4 + 3] = 0.22;
  b[n * 4] = x;
  b[n * 4 + 1] = y + Math.max(0.5, h - 0.2);
  b[n * 4 + 2] = z;
  return n + 1;
}
