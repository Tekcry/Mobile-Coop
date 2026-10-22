import { Vector3, type Scene } from '../core/babylon';
import type { World } from '../world/world';
import type { DamageRegistry, HitInfo } from '../game/damage';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid } from './navGrid';
import { Enemy, type AiContext, type PlayerRef } from './enemy';
import { ENEMIES, type EnemyKind } from './enemyDefs';
import { BUDGET, G } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';
import type { Grenades } from '../weapons/grenades';
import { GRAVITY } from '../physics/havok';
import { Body } from './body';
import { BODY } from './bodies';
import type { LightDef } from '../world/lights';
import { beamReach, type BeamHit } from '../world/torches';
import { nearestPanel, type AlarmPanel } from './alarm';
import { hyp2, hyp3 } from '../core/mathx';
import { ARCHETYPE, type DifficultyDef } from './archetypes';
import { ALERT } from './alertState';
import { ReconDrone } from './reconDrone';
import { HEARING, ambientDb, effectiveReach, hearTier, pickNearest, wallMatters, WALL_FACTOR, type HearTier, type NoisySource } from './hearing';

// Live guard cap. 12 = the Dead Line co-op peak of 10 chapter-active guards (furthest-behind and furthest-ahead
// player, each with their next chapter) plus the two alarm reinforcements; about 2.6 ms main thread (D1 guard cost).
export const MAX_ALIVE = 12;

/** Owns enemies, the shared chase flow field, cover reservations, bodies (ragdolls), alarms and flashlights. */
export class EnemyManager {
  readonly enemies: Enemy[] = [];
  /** The live guard cap (M6: per mode). `MAX_ALIVE` everywhere but Sector Ops, which sets `SECTOR.maxAlive`. */
  maxAlive = MAX_ALIVE;
  private flowField: Float32Array;
  private flowT = 0;
  private coverOwner = new Map<number, Enemy>();
  private ctx: AiContext;
  onKilled: ((e: Enemy, h: HitInfo) => void) | null = null;
  /** Audio hooks. */
  onEnemyShot: ((e: Enemy, from: Vector3, to: Vector3) => void) | null = null;
  onEnemyMelee: ((e: Enemy) => void) | null = null;
  onEnemyWindup: ((e: Enemy) => void) | null = null;
  kills = 0;
  /** Grenade system enemies throw with (set by the game state). */
  grenades: Grenades | null = null;
  /** Enemy assigned to flank a player holding cover (one at a time). */
  flanker: Enemy | null = null;
  private grenadeT = 0;
  /** Grenades thrown (tests / debug). */
  grenadesThrown = 0;
  /**
   * Stealth rules (Clear, Mission): enemies know where a player is only from sight, sound and each other,
   * chase the shared last known position and search it. Off (Wave): they are sent at the players.
   */
  stealth = false;
  /** Shared last known position of the players (the latest sighting / located noise). */
  readonly lkp = new Vector3();
  private readonly earA = new Vector3();
  private readonly earB = new Vector3();
  lkpValid = false;
  /** Seconds since an alerted enemy last had a player in sight. */
  sightT = 99;
  /** Radio range for a detection call (m). */
  static readonly RADIO = 22;
  /** Downed enemies lying in the world (findable, carriable). */
  readonly bodies: Body[] = [];
  /** A body was found by an enemy (audio / HUD / stats). */
  onBodyFound: ((e: Enemy, b: Body) => void) | null = null;
  /** A body appeared (GameState makes it carriable) or went for good. */
  onBodyAdded: ((b: Body) => void) | null = null;
  onBodyRemoved: ((b: Body) => void) | null = null;
  /** A knocked-out enemy was revived (modes count it back in). */
  onRevived: ((e: Enemy, b: Body) => void) | null = null;
  bodiesFound = 0;
  /** Alarm panels on the map; raised once per match (reinforcements). */
  readonly alarms: AlarmPanel[] = [];
  alarmRaised = false;
  onAlarm: ((e: Enemy, p: AlarmPanel) => void) | null = null;
  private alarmRunner: Enemy | null = null;
  private alarmT = 0;
  /** Flashlight slots (dark maps) and who holds each. */
  private torches: LightDef[] = [];
  private torchOwner: (Enemy | null)[] = [];
  private world: World;
  /** Drone operators' recon drones. */
  readonly drones: ReconDrone[] = [];
  /** Dead / knocked-out dogs (their own bodies, lying where they fell). */
  private dogCorpses: Enemy[] = [];
  /** Squad rosters (members kept after they go down) for radio checks; reported silent members. */
  private squads = new Map<number, Enemy[]>();
  private silent = new Set<Enemy>();
  private radioT: number = ARCHETYPE.radio.period;
  /** Radio checks run / members found silent (tests). */
  radioChecks = 0;
  radioMisses = 0;
  private buffT = 0;
  /** Callouts (GameState shows them). */
  onBark: ((e: Enemy, line: string, radio: boolean) => void) | null = null;
  /**
   * (guard-ai S1) Coordinated hearing: of the guards a noise reaches, one is sent to investigate and the rest only turn
   * to look (`hear`, `noise`). Off (Hunter, Mission: the parked modes): everyone in reach hears and walks over, and
   * gunfire sends everyone in reach to combat (the old rule).
   */
  coordinated = true;
  /** (guard-ai S1) The map's noisy things (machinery, generators, vents): they mask sounds for guards near them. */
  private noisy: readonly NoisySource[] = [];
  /** The hearing table (tests / e2e read the numbers from here). */
  readonly hearingTable = HEARING;
  /** Hearing scratch (no allocation per noise): tier-2 hearers, every guard's position and effective reach. */
  private hearIdx = new Int16Array(32);
  private hearX = new Float32Array(32);
  private hearZ = new Float32Array(32);
  private hearR = new Float32Array(32);

  constructor(
    private scene: Scene,
    world: World,
    readonly nav: NavGrid,
    private registry: DamageRegistry,
    private ballistics: Ballistics,
    private vfx: Vfx,
    /** (locomotion step 19) The match's resolved difficulty (preset or custom; the host's in co-op). */
    readonly diff: DifficultyDef,
    private players: () => readonly PlayerRef[],
  ) {
    this.world = world;
    for (const l of world.level.lights.lights) {
      if (l.kind !== 'flashlight') continue;
      this.torches.push(l);
      this.torchOwner.push(null);
    }
    this.flowField = new Float32Array(nav.walk.length);
    this.ctx = {
      scene,
      world,
      nav,
      registry,
      ballistics,
      vfx,
      diff,
      players,
      flow: () => this.flowField,
      enemies: () => this.enemies,
      cover: world.level.cover,
      coverSegments: world.level.coverSegments,
      rooms: world.layout.rooms ?? [],
      reserveCover: (e, idx) => {
        const o = this.coverOwner.get(idx);
        if (o && o !== e && o.alive) return false;
        this.releaseCover(e);
        this.coverOwner.set(idx, e);
        return true;
      },
      releaseCover: (e) => this.releaseCover(e),
      onKilled: (e, h) => {
        this.kills++;
        this.releaseCover(e);
        this.onKilled?.(e, h);
      },
      onShot: (e, a, b) => this.onEnemyShot?.(e, a, b),
      onBark: (e, line, radio) => this.onBark?.(e, line, radio),
      onMelee: (e) => this.onEnemyMelee?.(e),
      onWindup: (e) => this.onEnemyWindup?.(e),
      isFlanker: (e) => this.flanker === e,
      throwGrenade: (e, from, to) => {
        // one grenade in the air at a time across the squad
        if (!this.grenades || this.grenadeT > 0) return false;
        this.grenadeT = 8;
        this.grenadesThrown++;
        const T = 1.15;
        const v = new Vector3((to.x - from.x) / T, (to.y + 0.3 - from.y + 0.5 * -GRAVITY.y * T * T) / T, (to.z - from.z) / T);
        this.grenades.throw(from, v, 'enemy', e.id, undefined, true);
        e.bark('grenade');
        return true;
      },
      stealth: () => this.stealth,
      lkp: this.lkp,
      lkpValid: () => this.lkpValid,
      reportSighting: (p) => {
        p.spotted = true;
        this.lkp.copyFrom(p.feet);
        this.lkpValid = true;
        this.sightT = 0;
      },
      callAlert: (e) => {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          const d = Vector3.Distance(o.pos, e.pos);
          if (d < EnemyManager.RADIO) o.radio((0.4 + d * 0.03 + Math.random() * 0.3) * this.diff.reaction * (o.buff ? ARCHETYPE.officer.reaction : 1));
        }
      },
      shout: (e) => {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          if (hyp2(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < ALERT.shout && Math.abs(o.pos.y - e.pos.y) < 2.5) o.radio(0.3 + Math.random() * 0.3);
        }
      },
      searchSlot: (e) => {
        let n = 0;
        for (const o of this.enemies) if (o !== e && o.alive && o.level === 'searching' && o.num < e.num) n++;
        return n;
      },
      addBody: (e, rig: CharacterRig, imp: Vector3, lethal: boolean) => {
        const b = new Body(scene, world, e.def, lethal, rig, imp, this.canRagdoll());
        b.enemyId = e.id;
        this.addBody(b);
      },
      bodies: () => this.bodies,
      bodyFound: (e, b) => this.bodyFound(e, b),
      revive: (b) => this.revive(b),
      alarmRaised: () => this.alarmRaised,
      raiseAlarm: (e, p) => this.raiseAlarm(e, p),
    };
    this.refreshFlow();
  }

  /** Bodies still simulating as ragdolls are under the budget. */
  canRagdoll(): boolean {
    let n = 0;
    for (const b of this.bodies) if (b.simulating) n++;
    return n < BUDGET.maxRagdolls;
  }

  addBody(b: Body): void {
    this.bodies.push(b);
    this.onBodyAdded?.(b);
    // cap: drop the oldest (found / hidden first)
    while (this.bodies.length > BODY.max) {
      let k = this.bodies.findIndex((x) => (x.found || x.hidden) && !x.carried);
      if (k < 0) k = this.bodies.findIndex((x) => !x.carried);
      if (k < 0) break;
      this.removeBody(this.bodies[k]!);
    }
  }

  removeBody(b: Body): void {
    const k = this.bodies.indexOf(b);
    if (k < 0) return;
    this.bodies.splice(k, 1);
    b.dispose();
    this.onBodyRemoved?.(b);
  }

  /** A body was spotted: the finder searches round it (a knocked-out victim gets woken), the squad is told. */
  private bodyFound(e: Enemy, b: Body): void {
    if (b.found || !b.present) return;
    b.found = true;
    this.bodiesFound++;
    e.bark('body');
    e.searchAt(b.pos.x, b.pos.z, b.lethal ? null : b);
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.alerted) continue;
      if (Vector3.Distance(o.pos, e.pos) < EnemyManager.RADIO) o.searchAt(b.pos.x, b.pos.z, null);
    }
    this.onBodyFound?.(e, b);
  }

  /** (Sector Ops) A section load or restart: a panel alarm can be raised again, and no guard holds the run. */
  resetAlarm(): void {
    this.alarmRaised = false;
    this.alarmRunner = null;
  }

  /** An alerted enemy worked a panel: reinforcements (once per match). */
  private raiseAlarm(e: Enemy, p: AlarmPanel): void {
    if (this.alarmRaised || p.disabled) return;
    this.alarmRaised = true;
    this.alarmRunner = null;
    this.onAlarm?.(e, p);
  }

  /** Bring a reinforcement squad in at `at` (alerted, told the last known position). */
  reinforce(kind: EnemyKind, at: Vector3, n: number): Enemy[] {
    const out: Enemy[] = [];
    for (let i = 0; i < n; i++) {
      const e = this.spawn(kind, at.add(new Vector3((i - (n - 1) / 2) * 1.2, 0, (i % 2) * 1.1)), true, Math.random() * 6);
      if (e) out.push(e);
    }
    return out;
  }

  /** Lights went out at a point: the nearest calm enemy comes to look (with a flashlight in the dark), others
   *  nearby turn to look. */
  lightsOut(x: number, z: number): void {
    let best: Enemy | null = null;
    let bd = 25;
    for (const e of this.enemies) {
      if (!e.alive || e.alerted || e.def.melee) continue;
      const d = hyp2(e.pos.x - x, e.pos.z - z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || e.alerted || e === best) continue;
      if (hyp2(e.pos.x - x, e.pos.z - z) < 14) e.notice(x, z, 0.32);
    }
    best?.hear(x, z, Math.max(6, bd * 1.6));
  }

  /** Assign the alarm runner: an alerted enemy near a working panel (stealth rules only). */
  private assignAlarm(): void {
    if (!this.stealth || this.alarmRaised || !this.alarms.length) return;
    const r = this.alarmRunner;
    if (r && r.alive && r.alerted && r.runningAlarm) return;
    this.alarmRunner = null;
    let best: Enemy | null = null;
    let bp: AlarmPanel | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || !e.alerted || e.def.melee) continue;
      const p = nearestPanel(this.alarms, e.pos.x, e.pos.z, 2, e.pos.y);
      if (!p) continue;
      // an officer calls it in himself
      const d = hyp2(p.x - e.pos.x, p.z - e.pos.z) * (e.def.kind === 'officer' ? 0.25 : 1);
      if (d < bd) {
        bd = d;
        best = e;
        bp = p;
      }
    }
    if (best && bp) {
      best.runAlarm(bp);
      this.alarmRunner = best;
    }
  }

  /** Flashlights: enemies looking for something in the dark switch one on; it follows their head. */
  private updateTorches(): void {
    const ts = this.torches;
    if (!ts.length) return;
    const reg = this.world.level.lights;
    const field = this.world.lightField;
    // release
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (o && !(o.alive && o.torchWanted(field, true))) {
        this.torchOwner[i] = null;
        reg.setOn(ts[i]!.id, false);
      }
    }
    // acquire
    for (const e of this.enemies) {
      if (!e.alive || this.torchOwner.includes(e) || !e.torchWanted(field)) continue;
      const k = this.torchOwner.indexOf(null);
      if (k < 0) break;
      this.torchOwner[k] = e;
      reg.setOn(ts[k]!.id, true);
    }
    // follow; the beam stops at the first wall (rays along the centre and the cone's edges, round robin at 15 Hz
    // per torch), so it never lights the room behind
    this.torchTick = (this.torchTick + 1) % ts.length;
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (!o) continue;
      const l = ts[i]!;
      o.placeTorch(l);
      if (i === this.torchTick || l.reach === undefined) l.reach = this.beamReach(l);
    }
  }

  private torchTick = 0;

  /** Longest unobstructed run of a cone light (`beamReach` in `world/torches.ts`, shared with the co-op client). */
  private beamReach(l: LightDef): number {
    return beamReach(l, this.beamHit);
  }

  /** One static-geometry ray for `beamReach` (allocation-free: two kept vectors). */
  private readonly beamHit: BeamHit = (ax, ay, az, bx, by, bz) => this.ballistics.hitDistance(this.earA.set(ax, ay, az), this.earB.set(bx, by, bz), G.STATIC);

  /** Who has a flashlight on (tests / debug). */
  get torchesOn(): number {
    let n = 0;
    for (const o of this.torchOwner) if (o) n++;
    return n;
  }

  /** (coop-torches) Does this guard hold a lit flashlight (the co-op snapshot's torch bit)? Allocation-free. */
  hasTorch(e: Enemy): boolean {
    for (let i = 0; i < this.torchOwner.length; i++) if (this.torchOwner[i] === e) return true;
    return false;
  }

  /** Wake a knocked-out victim: back on their feet, searching. */
  private revive(b: Body): void {
    if (!b.present || b.lethal) return;
    const e = new Enemy(this.ctx, b.def, b.pos.clone(), Math.random() * 6);
    e.health.damage(e.health.maxHp * 0.4);
    this.enemies.push(e);
    this.removeBody(b);
    e.searchAt(e.pos.x, e.pos.z, null);
    this.onRevived?.(e, b);
  }

  private releaseCover(e: Enemy): void {
    for (const [k, v] of this.coverOwner) if (v === e) this.coverOwner.delete(k);
    e.coverIdx = -1;
  }

  get alive(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  /**
   * Remove a guard entirely (Sector Ops unloads a section): alive, knocked out or dead, with its body or ragdoll, its
   * recon drone, its squad place and its jobs (alarm run, flank, flashlight, cover). What `clear` does, for one guard.
   * No kill event: the co-op host stops reporting it, so the client drops its puppet without a ragdoll (`onSnap`, the
   * stale sweep) and its kept ragdoll (gone from the snapshot's `bodies`). Not for a guard held in a takedown.
   */
  despawn(e: Enemy): void {
    let k = this.enemies.indexOf(e);
    if (k >= 0) this.enemies.splice(k, 1);
    k = this.dogCorpses.indexOf(e);
    if (k >= 0) this.dogCorpses.splice(k, 1);
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i]!;
      if (d.operator !== e) continue;
      d.dispose();
      this.drones.splice(i, 1);
    }
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]!;
      if (b.enemyId === e.id) this.removeBody(b);
    }
    for (const [, roster] of this.squads) {
      const j = roster.indexOf(e);
      if (j >= 0) roster.splice(j, 1);
    }
    this.silent.delete(e);
    if (this.alarmRunner === e) this.alarmRunner = null;
    if (this.flanker === e) this.flanker = null;
    for (let i = 0; i < this.torchOwner.length; i++) {
      if (this.torchOwner[i] !== e) continue;
      this.torchOwner[i] = null;
      this.world.level.lights.setOn(this.torches[i]!.id, false);
    }
    this.releaseCover(e);
    e.dispose();
  }

  /** Remove every guard, body and drone (a Sector Ops unload): `clear`, and the last known position is forgotten. */
  despawnAll(): void {
    this.clear();
    this.lkpValid = false;
    this.sightT = 99;
  }

  /**
   * (sector-restart, M9) A checkpoint restart: every guard, body and drone goes (`despawnAll`) and the manager's memory
   * is back at its match-start state, so the guards that load next start unaware on their routes. Cleared: the shared
   * last known position and its chase field, the time since a sighting, the alarm (raised flag and runner), the
   * flanker, the squad rosters and silent members, the grenade, radio-check, alarm-assign and buff clocks, and every
   * player's `spotted` flag. The tallies (kills, bodies found, radio checks) stay: they are the run's.
   */
  resetMemory(): void {
    this.despawnAll();
    this.resetAlarm();
    this.lkp.setAll(0);
    this.flowField.fill(Infinity);
    this.flowT = 0;
    this.alarmT = 0;
    this.buffT = 0;
    this.grenadeT = 0;
    this.radioT = ARCHETYPE.radio.period;
    const ps = this.players();
    for (let i = 0; i < ps.length; i++) ps[i]!.spotted = false;
  }

  spawn(kind: EnemyKind, pos: Vector3, alerted = true, yaw = 0): Enemy | null {
    if (this.alive >= this.maxAlive) return null;
    const c = this.nav.nearestWalkable(pos.x, pos.z, 8, pos.y);
    if (c < 0) return null;
    const [x, z] = this.nav.center(c);
    const e = new Enemy(this.ctx, ENEMIES[kind], new Vector3(x, this.nav.height[c]!, z), yaw);
    if (alerted) e.alert();
    this.enemies.push(e);
    if (kind === 'droneOp') this.drones.push(new ReconDrone(this.scene, this.world.parts, this.registry, this.ballistics, this.vfx, e));
    return e;
  }

  /** Put an enemy on a squad's roster (radio checks; the dog's handler comes from its squad). */
  joinSquad(e: Enemy, squad: number): void {
    e.squad = squad;
    let r = this.squads.get(squad);
    if (!r) {
      r = [];
      this.squads.set(squad, r);
    }
    if (!r.includes(e)) r.push(e);
  }

  /** Squad radio checks (stealth rules): a calm caller checks in; a silent member gets looked for. */
  radioCheckNow(): void {
    this.radioChecks++;
    for (const [, roster] of this.squads) {
      let caller: Enemy | null = null;
      for (const m of roster) {
        if (!m.alive || m.alerted || m.dog) continue;
        if (!caller || m.def.kind === 'officer') caller = m;
      }
      if (!caller || caller.level !== 'unaware') continue;
      caller.bark('radioCheck');
      let missed = false;
      for (const m of roster) {
        if (m.alive || this.silent.has(m)) continue;
        this.silent.add(m);
        this.radioMisses++;
        missed = true;
        caller.searchAt(m.pos.x, m.pos.z, null);
      }
      if (missed) caller.bark('missed');
      else
        for (const m of roster)
          if (m !== caller && m.alive && !m.dog) {
            m.bark('radioOk');
            break;
          }
    }
  }

  /** EMP at a point: recon drones in range drop. */
  empAt(x: number, y: number, z: number, r: number): number {
    let n = 0;
    for (const d of this.drones) {
      if (!d.alive) continue;
      if (hyp3(d.pos.x - x, d.pos.y - y, d.pos.z - z) <= r) {
        d.emp();
        n++;
      }
    }
    return n;
  }

  /** (guard-ai S1) Set the map's noisy things (masking for guards near them); none by default. */
  setNoisy(list: readonly NoisySource[]): void {
    this.noisy = list;
  }

  /** Room for `n` guards in the hearing scratch (grows by doubling: no allocation once the cast is in). */
  private hearRoom(n: number): void {
    if (n <= this.hearIdx.length) return;
    let c = this.hearIdx.length;
    while (c < n) c *= 2;
    this.hearIdx = new Int16Array(c);
    this.hearX = new Float32Array(c);
    this.hearZ = new Float32Array(c);
    this.hearR = new Float32Array(c);
  }

  /**
   * One listener's hearing tier for a noise of `reach` at `pos` (`hearing.ts`): ambient masking at the guard, then the
   * wall ray only where one wall could change the tier (at head height: low cover and crates do not muffle, walls do).
   * Writes the effective reach into `hearR[i]`.
   */
  private tierOf(e: Enemy, i: number, pos: Vector3, reach: number, d: number, loud: boolean): HearTier {
    const amb = this.noisy.length ? ambientDb(this.noisy, e.pos.x, e.pos.z, e.pos.y) : 0;
    let r = effectiveReach(reach, 0, amb);
    if (wallMatters(d, r, loud)) {
      this.earA.set(pos.x, pos.y + 1.5, pos.z);
      this.earB.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
      if (!this.ballistics.clear(this.earA, this.earB, G.STATIC)) r *= WALL_FACTOR;
    }
    this.hearR[i] = r;
    return hearTier(d, r, loud);
  }

  /**
   * Gunfire (unsuppressed) audible to `reach` m. Coordinated (guard-ai S1): walls and masking cut the reach per
   * listener; inside a quarter of it (tier 3) a guard goes to combat towards it; farther, the nearest guard inside half
   * of it is sent to look (and the shot locates the shooter for him) and everyone else in reach only turns. Guards
   * already fighting locate it from anywhere in reach. A shot behind walls far off sends nobody to combat.
   * Uncoordinated (parked modes): everyone within `reach` goes to combat, no walls (the old rule).
   */
  noise(pos: Vector3, reach: number): void {
    const list = this.enemies;
    const n = list.length;
    let locate = false;
    if (!this.coordinated) {
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive || hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z) >= reach) continue;
        e.hearGunfire(pos.x, pos.z);
        locate = true;
      }
    } else {
      this.hearRoom(n);
      const idx = this.hearIdx;
      let nh = 0;
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive) continue;
        const d = hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z);
        if (d >= reach) continue;
        const tier = this.tierOf(e, i, pos, reach, d, true);
        if (tier === 0) continue;
        if (e.alerted || tier === 3) {
          e.hearGunfire(pos.x, pos.z);
          locate = true;
        } else if (e.def.melee) e.hear(pos.x, pos.z, this.hearR[i]!);
        else if (tier === 2 && !e.passive) {
          this.hearX[i] = e.pos.x;
          this.hearZ[i] = e.pos.z;
          idx[nh++] = i;
        } else e.hearTurn(pos.x, pos.z, this.hearR[i]!);
      }
      if (this.sendOne(pos, nh)) locate = true;
    }
    if (locate) {
      this.lkp.copyFrom(pos);
      this.lkpValid = true;
    }
  }

  /**
   * A noise (footsteps, landings, glass...) audible to `reach` m: unalerted guards it reaches react by hearing tier
   * (`hearing.ts`: walls and masking near noisy things cut the reach per listener). Coordinated (guard-ai S1): the
   * nearest guard inside half the reach is sent to investigate (`Enemy.hear`, a stub until the incident board), every
   * other guard in reach turns to look (`Enemy.hearTurn`). Melee guards (dogs, runners) keep their own rule: in reach
   * they hear it (and a dog close by charges). Uncoordinated (parked modes): everyone in reach hears and walks over.
   */
  hear(pos: Vector3, reach: number): void {
    const list = this.enemies;
    const n = list.length;
    this.hearRoom(n);
    const idx = this.hearIdx;
    let nh = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i]!;
      if (!e.alive || e.alerted || e.passive) continue;
      const d = hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z);
      // ambient and walls only shrink the reach: beyond it nothing is heard
      if (d >= reach) continue;
      const tier = this.tierOf(e, i, pos, reach, d, false);
      if (tier === 0) continue;
      if (!this.coordinated || e.def.melee) e.hear(pos.x, pos.z, this.hearR[i]!);
      else if (tier === 2) {
        this.hearX[i] = e.pos.x;
        this.hearZ[i] = e.pos.z;
        idx[nh++] = i;
      } else e.hearTurn(pos.x, pos.z, this.hearR[i]!);
    }
    this.sendOne(pos, nh);
  }

  /** Of the `nh` tier-2 hearers in the scratch, the nearest is sent to the noise (`Enemy.hear`: suspicious, then he
   *  investigates); the rest turn to look. Returns whether anyone was sent. (Stub until the incident board, S2.) */
  private sendOne(pos: Vector3, nh: number): boolean {
    if (nh === 0) return false;
    const idx = this.hearIdx;
    const pick = pickNearest(idx, nh, this.hearX, this.hearZ, pos.x, pos.z);
    for (let k = 0; k < nh; k++) {
      const i = idx[k]!;
      const e = this.enemies[i]!;
      if (i === pick) e.hear(pos.x, pos.z, this.hearR[i]!);
      else e.hearTurn(pos.x, pos.z, this.hearR[i]!);
    }
    return pick >= 0;
  }

  /** Any enemy in combat (the operator has been detected). */
  get anyAlerted(): boolean {
    for (const e of this.enemies) if (e.alive && e.alerted) return true;
    return false;
  }

  /** Any enemy in combat or searching (the last known position matters). */
  get hunting(): boolean {
    for (const e of this.enemies) if (e.alive && (e.alerted || e.level === 'searching')) return true;
    return false;
  }

  /** Pick (or drop) the flanker: someone with cover tactics once a player has held cover a while. */
  private assignFlanker(): void {
    const held = this.players().some((p) => p.target.alive && p.cover && (p.coverT ?? 0) > 4);
    if (!held) {
      this.flanker = null;
      return;
    }
    if (this.flanker?.alive) return;
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || !e.alerted || e.def.melee || !e.def.usesCover || e.hold) continue;
      const d = this.players()[0] ? Vector3.Distance(e.pos, this.players()[0]!.feet) : 0;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    this.flanker = best;
  }

  private refreshFlow(): void {
    // stealth: towards where they think the players are, never where they really are
    const live = this.players().filter((p) => p.target.alive);
    const goals = this.stealth ? (this.lkpValid ? [[this.lkp.x, this.lkp.z] as [number, number]] : []) : live.map((p) => [p.feet.x, p.feet.z] as [number, number]);
    // heights pick the storey (a roof, an upper floor) the goal is on
    const ys = this.stealth ? [this.lkp.y] : live.map((p) => p.feet.y);
    if (goals.length) this.nav.flowField(goals, this.flowField, ys);
  }

  update(dt: number): void {
    this.sightT += dt;
    // nobody hunting any more: the last known position is forgotten
    if (this.lkpValid && this.sightT > 2 && !this.hunting) this.lkpValid = false;
    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.flowT = 0.5;
      this.refreshFlow();
      this.assignFlanker();
    }
    this.alarmT -= dt;
    if (this.alarmT <= 0) {
      this.alarmT = 0.5;
      this.assignAlarm();
    }
    this.grenadeT = Math.max(0, this.grenadeT - dt);
    // officers buff squadmates round them
    this.buffT -= dt;
    if (this.buffT <= 0) {
      this.buffT = 0.5;
      this.updateBuffs();
    }
    if (this.stealth && this.squads.size) {
      this.radioT -= dt;
      if (this.radioT <= 0) {
        this.radioT = ARCHETYPE.radio.period + (Math.random() * 2 - 1) * ARCHETYPE.radio.jitter;
        this.radioCheckNow();
      }
    }
    this.updateDrones(dt);
    const doors = this.world.doors;
    for (const e of this.enemies) {
      e.update(dt);
      // walking into a closed door pushes it open
      if (doors.list.length && e.alive) doors.pushOpen(e.pos.x, e.pos.z);
    }
    this.updateTorches();
    // nobody in combat any more: no player is known to be there (takedowns open again)
    let fighting = false;
    for (const e of this.enemies) if (e.alive && e.level === 'alert') fighting = true;
    if (!fighting) {
      const ps = this.players();
      for (let i = 0; i < ps.length; i++) ps[i]!.spotted = false;
    }
    // bodies: settle, and sample the light on them now and then (how findable they are)
    const field = this.world.lightField;
    for (const b of this.bodies) {
      b.update(dt);
      b.lightT -= dt;
      if (b.lightT <= 0 && b.present) {
        b.lightT = 1;
        b.light = field.totalAt(b.pos.x, b.pos.y + 0.2, b.pos.z);
      }
    }
    // drop dead entries (a dog keeps its own body: kept to draw and dispose)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.alive) continue;
      if (e.dog) this.dogCorpses.push(e);
      this.enemies.splice(i, 1);
    }
  }

  private updateBuffs(): void {
    const r = ARCHETYPE.officer.buffRadius;
    for (const e of this.enemies) {
      e.buff = false;
      if (!e.alive) continue;
      for (const o of this.enemies) {
        if (o === e || !o.alive || o.def.kind !== 'officer') continue;
        if (hyp2(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < r) {
          e.buff = true;
          break;
        }
      }
    }
  }

  /** A recon drone sees a player: its operator grows suspicious, then is alerted (the squad radioed). */
  private onDroneSpot = (d: ReconDrone, p: PlayerRef, full: boolean): void => {
    const op = d.operator;
    if (op.alerted || full) {
      if (!op.alerted) {
        op.notice(p.feet.x, p.feet.z, 0.99);
        op.bark('drone');
        op.alert();
      }
      this.lkp.copyFrom(p.feet);
      this.lkpValid = true;
      this.sightT = 0;
    } else op.notice(p.feet.x, p.feet.z, Math.min(0.9, 0.3 + d.meter * 0.6));
  };

  private updateDrones(dt: number): void {
    const players = this.players();
    const perc = this.diff.perception;
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i]!;
      const floor = this.nav.heightAt(d.pos.x, d.pos.z);
      const keep = d.update(dt, players, perc, floor, this.onDroneSpot);
      if (!keep) {
        d.dispose();
        this.drones.splice(i, 1);
      }
    }
  }

  /** Render-rate animation (interpolated between fixed steps). */
  frameUpdate(dt: number, alpha: number): void {
    for (const e of this.enemies) e.frame(dt, alpha);
    for (const e of this.dogCorpses) e.frame(dt, alpha);
    for (const d of this.drones) d.frame(dt);
  }

  clear(): void {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const e of this.dogCorpses) e.dispose();
    this.dogCorpses.length = 0;
    for (const d of this.drones) d.dispose();
    this.drones.length = 0;
    this.squads.clear();
    this.silent.clear();
    for (const b of [...this.bodies]) this.removeBody(b);
    // nobody left to hold a job: the alarm run, the flank, the flashlights
    this.alarmRunner = null;
    this.flanker = null;
    const reg = this.world.level.lights;
    for (let i = 0; i < this.torches.length; i++) {
      if (this.torchOwner[i]) reg.setOn(this.torches[i]!.id, false);
      this.torchOwner[i] = null;
    }
    this.coverOwner.clear();
  }
}
