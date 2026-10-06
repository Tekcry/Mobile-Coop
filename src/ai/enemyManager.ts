import { Vector3, type Scene } from '../core/babylon';
import type { World } from '../world/world';
import type { DamageRegistry, HitInfo } from '../game/damage';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid } from './navGrid';
import { Enemy, type AiContext, type PlayerRef } from './enemy';
import { ENEMIES, type Difficulty, type EnemyKind } from './enemyDefs';
import { BUDGET } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';
import type { Grenades } from '../weapons/grenades';
import { GRAVITY } from '../physics/havok';
import { Body } from './body';
import { BODY } from './bodies';
import { lightLevelAt, type LightDef } from '../world/lights';
import { nearestPanel, type AlarmPanel } from './alarm';
import { hyp2, hyp3 } from '../core/mathx';
import { ARCHETYPE, DIFFICULTY } from './archetypes';
import { ReconDrone } from './reconDrone';

export const MAX_ALIVE = 10;

/** Owns enemies, the shared chase flow field, cover reservations, bodies (ragdolls), alarms and flashlights. */
export class EnemyManager {
  readonly enemies: Enemy[] = [];
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

  constructor(
    private scene: Scene,
    world: World,
    readonly nav: NavGrid,
    private registry: DamageRegistry,
    private ballistics: Ballistics,
    private vfx: Vfx,
    public difficulty: Difficulty,
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
      difficulty,
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
        this.lkp.copyFrom(p.feet);
        this.lkpValid = true;
        this.sightT = 0;
      },
      callAlert: (e) => {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          const d = Vector3.Distance(o.pos, e.pos);
          if (d < EnemyManager.RADIO) o.radio((0.4 + d * 0.03 + Math.random() * 0.3) * DIFFICULTY[this.difficulty].reaction * (o.buff ? ARCHETYPE.officer.reaction : 1));
        }
      },
      searchSlot: (e) => {
        let n = 0;
        for (const o of this.enemies) if (o !== e && o.alive && o.level === 'searching' && o.num < e.num) n++;
        return n;
      },
      addBody: (e, rig: CharacterRig, imp: Vector3, lethal: boolean) => {
        this.addBody(new Body(scene, world, e.def, lethal, rig, imp, this.canRagdoll()));
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
    // release
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (o && !(o.alive && o.torchWanted(reg))) {
        this.torchOwner[i] = null;
        reg.setOn(ts[i]!.id, false);
      }
    }
    // acquire
    for (const e of this.enemies) {
      if (!e.alive || this.torchOwner.includes(e) || !e.torchWanted(reg)) continue;
      const k = this.torchOwner.indexOf(null);
      if (k < 0) break;
      this.torchOwner[k] = e;
      reg.setOn(ts[k]!.id, true);
    }
    // follow
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (o) o.placeTorch(ts[i]!);
    }
  }

  /** Who has a flashlight on (tests / debug). */
  get torchesOn(): number {
    let n = 0;
    for (const o of this.torchOwner) if (o) n++;
    return n;
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

  spawn(kind: EnemyKind, pos: Vector3, alerted = true, yaw = 0): Enemy | null {
    if (this.alive >= MAX_ALIVE) return null;
    const c = this.nav.nearestWalkable(pos.x, pos.z, 8);
    if (c < 0) return null;
    const [x, z] = this.nav.center(c);
    const e = new Enemy(this.ctx, ENEMIES[kind], new Vector3(x, 0, z), yaw);
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

  /** Gunfire heard within radius: those enemies go to combat towards it (and it locates the shooter). */
  noise(pos: Vector3, radius: number): void {
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive || Vector3.Distance(e.pos, pos) >= radius) continue;
      e.hearGunfire(pos.x, pos.z);
      any = true;
    }
    if (any) {
      this.lkp.copyFrom(pos);
      this.lkpValid = true;
    }
  }

  /** A noise (footsteps, landings, glass...): unalerted enemies within radius grow suspicious and look. */
  hear(pos: Vector3, radius: number): void {
    for (const e of this.enemies) if (e.alive && Vector3.Distance(e.pos, pos) < radius) e.hear(pos.x, pos.z, radius);
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
    const goals = this.stealth
      ? this.lkpValid
        ? [[this.lkp.x, this.lkp.z] as [number, number]]
        : []
      : this.players()
          .filter((p) => p.target.alive)
          .map((p) => [p.feet.x, p.feet.z] as [number, number]);
    if (goals.length) this.nav.flowField(goals, this.flowField);
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
    // bodies: settle, and sample the light on them now and then (how findable they are)
    const lights = this.world.level.lights;
    for (const b of this.bodies) {
      b.update(dt);
      b.lightT -= dt;
      if (b.lightT <= 0 && b.present) {
        b.lightT = 1;
        b.light = lightLevelAt(lights, b.pos.x, b.pos.y + 0.2, b.pos.z);
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
    const perc = DIFFICULTY[this.difficulty].perception;
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
