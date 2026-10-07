import { Color4, PhysicsRaycastResult, TransformNode, Vector3, type InstancedMesh, type PhysicsEngine } from '../core/babylon';
import type { Enemy } from '../ai/enemy';
import type { InputState } from '../input/inputState';
import { G, MASK } from '../physics/groups';
import { hyp2, hyp3 } from '../core/mathx';
import { DRONE, droneStep, GADGET_IDS, GADGETS, wheelSlot, type DroneState, type GadgetId } from './gadgets';
import type { HitInfo } from './damage';
import type { GameState } from './gameState';

/** Hold the gadget wheel button this long (s) to open the wheel (pad / keyboard). */
export const WHEEL_HOLD = 0.15;
/** Time scale while the wheel is open (single player). */
export const WHEEL_SLOW = 0.3;
/** Seconds of sleeping gas that knock an enemy out. */
export const GAS_KO = 0.8;
/** Sticky cam: look cone round the surface normal (rad), the lure ping's radius / cooldown. */
const CAM_CONE = 1.3;
const CAM_PING = 10;
const CAM_PING_CD = 3;
/** Mine: armed after (s), trigger radius (m), damage. */
const MINE_ARM = 1.5;
const MINE_TRIGGER = 1.6;
const MINE_DAMAGE = 160;
/** Noisemaker pulse period (s). */
const NOISE_PERIOD = 1.5;
/** Arc preview: step (s), steps, dots. */
const ARC_DT = 0.05;
const ARC_STEPS = 60;
const ARC_DOTS = 22;
const GRAVITY = 9.81;

interface Cloud {
  x: number;
  y: number;
  z: number;
  t: number;
  r: number;
  puff: number;
}
interface Flier {
  kind: 'noise' | 'stickyCam';
  p: Vector3;
  v: Vector3;
  mesh: InstancedMesh;
}
interface Cam {
  p: Vector3;
  baseYaw: number;
  basePitch: number;
  yaw: number;
  pitch: number;
  gas: boolean;
  ping: number;
  mesh: InstancedMesh;
  lens: InstancedMesh;
}
interface Noiser {
  p: Vector3;
  t: number;
  next: number;
  mesh: InstancedMesh;
}
interface Mine {
  p: Vector3;
  arm: number;
  mesh: InstancedMesh;
  led: InstancedMesh;
}
interface Drone {
  s: DroneState;
  pitch: number;
  hp: number;
  dartCd: number;
  node: TransformNode;
  parts: InstancedMesh[];
  rotors: InstancedMesh[];
  spin: number;
  seenT: number;
}

/**
 * Gadgets at run time (phase 5): the wheel (hold to open: time slows, the stick / mouse picks a slot, release
 * selects; touch opens it with the gadget button and taps a slot), the gadget button (held: the predicted arc;
 * released: thrown), and what each does once out - sleeping gas clouds (knock-outs), flashbangs (blind, then
 * alert; white-out for the player when facing it), EMP (lights out for a while), noisemakers (lure pulses), sticky
 * cams and the tri-rotor drone (remote views with the camera feed look: lure ping / gas / marking from a cam,
 * stun darts and a shock burst from the drone), proximity mines.
 */
export class GadgetSystem {
  /** Wheel open (input goes to it; time slows in single player) and the highlighted slot. */
  wheelOpen = false;
  wheelSlot = -1;
  private cursorX = 0;
  private cursorY = 0;
  /** The gadget button is held (aiming the arc). */
  aiming = false;
  /** Remote view (a sticky cam or the drone) - the operator stands still meanwhile. */
  remote: 'cam' | 'drone' | null = null;
  private camIdx = 0;
  readonly clouds: Cloud[] = [];
  readonly fliers: Flier[] = [];
  readonly cams: Cam[] = [];
  readonly noisers: Noiser[] = [];
  readonly mines: Mine[] = [];
  drone: Drone | null = null;
  /** Counts (stats / tests). */
  readonly stats = { thrown: 0, gassed: 0, blinded: 0, empLights: 0, darts: 0, shocked: 0, mineKills: 0, pulses: 0, pings: 0 };
  private arcDots: InstancedMesh[] = [];
  private arcRing: InstancedMesh | null = null;
  private arcPts = new Float32Array(ARC_STEPS * 3);
  private arcN = 0;
  private rr = new PhysicsRaycastResult();
  private hitP = new Vector3();
  private hitN = new Vector3();
  private a = new Vector3();
  private b = new Vector3();
  private from = new Vector3();
  private vel = new Vector3();
  private dir = new Vector3();
  private seeT = 0;
  private puffColor = new Color4(0.62, 0.86, 0.7, 1);
  private flashColor = new Color4(1, 1, 0.92, 1);

  constructor(private g: GameState) {
    const w = g.weapons;
    w.onThrow = (id, from, vel) => this.thrown(id, from, vel);
    w.onPlace = (id) => this.place(id);
    g.grenades.onDetonate = (kind, at) => this.detonate(kind as GadgetId, at);
  }

  private get eng(): PhysicsEngine {
    return this.g.scene.getPhysicsEngine() as PhysicsEngine;
  }

  /** Static geometry between a and b: hit point / normal in `hitP` / `hitN`. */
  private cast(a: Vector3, b: Vector3, mask: number = G.STATIC): boolean {
    this.rr.reset();
    this.eng.raycastToRef(a, b, this.rr, { membership: G.PROJECTILE, collideWith: mask });
    if (!this.rr.hasHit) return false;
    this.hitP.copyFrom(this.rr.hitPoint);
    this.hitN.copyFrom(this.rr.hitNormal);
    return true;
  }

  private clearLine(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    this.a.set(ax, ay, az);
    this.b.set(bx, by, bz);
    if (!this.cast(this.a, this.b)) return true;
    return Vector3.Distance(this.a, this.hitP) > Vector3.Distance(this.a, this.b) - 0.25;
  }

  /** Input goes to the wheel / remote view (the operator gets none). */
  get takesInput(): boolean {
    return this.wheelOpen || this.remote !== null;
  }

  /**
   * Fixed step with the real input. Returns true while the wheel or a remote view has the input.
   */
  fixedUpdate(dt: number, inp: InputState): boolean {
    const g = this.g;
    this.g.world.level.lights.update(dt);
    this.updateEffects(dt);
    if (!g.player.alive) {
      this.closeWheel(false);
      if (this.remote) this.exitRemote();
      this.aiming = false;
      return false;
    }
    if (this.remote) {
      this.remoteStep(dt, inp);
      return true;
    }
    // keyboard 1-8: straight to a gadget
    if (inp.gadgetPick >= 0) {
      const id = GADGET_IDS[inp.gadgetPick];
      inp.gadgetPick = -1;
      if (id) this.select(id);
    }
    // the wheel: pad / keyboard hold it open (release selects); touch toggles it (a tap on a slot selects)
    const touch = g.app.input.mode === 'touch';
    if (this.wheelOpen) {
      if (!touch) {
        const mx = inp.move.x;
        const my = inp.move.y;
        if (hyp2(mx, my) > 0.5) {
          this.cursorX = mx;
          this.cursorY = my;
        }
        this.wheelSlot = wheelSlot(this.cursorX, this.cursorY);
        if (!inp.down('gadgetWheel')) this.closeWheel(true);
      } else if (inp.pressed('gadgetWheel')) this.closeWheel(false);
      return this.wheelOpen;
    }
    if (touch ? inp.pressed('gadgetWheel') : inp.down('gadgetWheel') && inp.heldTime('gadgetWheel') >= WHEEL_HOLD) {
      this.openWheel();
      return true;
    }
    // the gadget button: held shows the arc, release throws; placed / flown ones go on the press
    const sel = g.weapons.gadgets.selected;
    const use = GADGETS[sel].use;
    const busy = g.takedown.active !== null || g.execute.running !== null || (g.stealth?.carrying ?? false) || g.traversal.attached;
    if (inp.pressed('grenade') && !busy) {
      if (sel === 'drone' && this.drone) this.enterRemote('drone');
      else if (sel === 'stickyCam' && this.cams.length && g.weapons.gadgets.count === 0) this.enterRemote('cam', this.cams.length - 1);
      else if (use === 'place' || use === 'fly') g.weapons.useGadget();
      else this.aiming = true;
    }
    if (this.aiming && (busy || !inp.down('grenade'))) {
      this.aiming = false;
      if (!busy) g.weapons.useGadget();
    }
    return false;
  }

  /** Look delta for the wheel cursor / remote view (radians, from the render frame). */
  look(dx: number, dy: number): void {
    if (this.wheelOpen) {
      if (dx === 0 && dy === 0) return;
      this.cursorX += dx / 0.12;
      this.cursorY += dy / 0.12;
      const l = hyp2(this.cursorX, this.cursorY);
      if (l > 1) {
        this.cursorX /= l;
        this.cursorY /= l;
      }
      this.wheelSlot = wheelSlot(this.cursorX, this.cursorY);
      return;
    }
    if (this.remote === 'cam') {
      const c = this.cams[this.camIdx];
      if (!c) return;
      c.yaw = c.baseYaw + clampAng(angDiff(c.yaw + dx, c.baseYaw), CAM_CONE);
      c.pitch = Math.max(c.basePitch - 1.1, Math.min(c.basePitch + 1.1, c.pitch + dy));
    } else if (this.remote === 'drone' && this.drone) {
      this.drone.s.yaw += dx;
      this.drone.pitch = Math.max(-1.3, Math.min(1.1, this.drone.pitch + dy));
    }
  }

  openWheel(): void {
    if (this.wheelOpen) return;
    this.wheelOpen = true;
    this.cursorX = this.cursorY = 0;
    this.wheelSlot = -1;
    this.aiming = false;
    if (!this.g.net) this.g.app.loop.timeScale = WHEEL_SLOW;
  }

  /** Close the wheel; `pick` selects the highlighted slot. */
  closeWheel(pick: boolean): void {
    if (!this.wheelOpen) return;
    this.wheelOpen = false;
    if (pick && this.wheelSlot >= 0) this.select(GADGET_IDS[this.wheelSlot]!);
    if (!this.g.net) this.g.app.loop.timeScale = 1;
  }

  /** Select a gadget (wheel slot tap / test). */
  select(id: GadgetId): void {
    this.g.weapons.gadgets.select(id);
    this.g.events.emit('gadget', { kind: id, phase: 'select' });
  }

  // ---- out of the hand ----

  private thrown(id: GadgetId, from: Vector3, vel: Vector3): void {
    const g = this.g;
    const d = GADGETS[id];
    this.stats.thrown++;
    g.events.emit('gadget', { kind: id, phase: 'throw' });
    if (d.use === 'stick') {
      const mesh = g.world.parts.instance('sphere', d.color, 'gadget');
      mesh.scaling.setAll(0.11);
      mesh.position.copyFrom(from);
      this.fliers.push({ kind: id === 'noise' ? 'noise' : 'stickyCam', p: from.clone(), v: vel.clone(), mesh });
      return;
    }
    g.grenades.throw(from, vel, 'player', 'local', undefined, true, id, id === 'frag' ? '#3d4a2c' : d.color, d.fuse);
  }

  private place(id: GadgetId): void {
    const g = this.g;
    const p = g.player.position;
    if (id === 'mine') {
      this.a.set(p.x, p.y + 0.4, p.z);
      this.b.set(p.x, p.y - 1, p.z);
      const y = this.cast(this.a, this.b) ? this.hitP.y : p.y;
      if (this.mines.length >= GADGETS.mine.max) this.removeMine(0);
      const mesh = g.world.parts.instance('rcyl', '#3c4036', 'mine');
      mesh.scaling.set(0.22, 0.05, 0.22);
      mesh.position.set(p.x, y + 0.025, p.z);
      const led = g.world.parts.instance('sphere', '#ff3b2f', 'mine-led');
      led.scaling.setAll(0.035);
      led.position.set(p.x, y + 0.06, p.z);
      this.mines.push({ p: new Vector3(p.x, y, p.z), arm: MINE_ARM, mesh, led });
      g.events.emit('gadget', { kind: id, phase: 'place' });
      return;
    }
    if (id === 'drone') {
      this.launchDrone();
      this.enterRemote('drone');
    }
  }

  private launchDrone(): void {
    const g = this.g;
    const p = g.player.position;
    const parts = g.world.parts;
    const node = new TransformNode('drone', g.scene);
    const body = parts.instance('pill', '#2b3138', 'drone');
    body.parent = node;
    body.scaling.set(0.16, 0.07, 0.16);
    const eye = parts.instance('sphere', GADGETS.drone.color, 'drone-eye');
    eye.parent = node;
    eye.scaling.setAll(0.045);
    eye.position.set(0, -0.02, 0.08);
    const ps = [body, eye];
    const rotors: InstancedMesh[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const arm = parts.instance('capsule', '#3a4048', 'drone-arm');
      arm.parent = node;
      arm.scaling.set(0.025, 0.14, 0.025);
      arm.position.set(Math.sin(a) * 0.1, 0.01, Math.cos(a) * 0.1);
      arm.rotation.set(Math.PI / 2, a, 0);
      const r = parts.instance('torus', '#9aa3ad', 'drone-rotor');
      r.parent = node;
      r.scaling.set(0.11, 0.02, 0.11);
      r.position.set(Math.sin(a) * 0.19, 0.04, Math.cos(a) * 0.19);
      ps.push(arm, r);
      rotors.push(r);
    }
    const yaw = g.player.cam.yaw;
    const s: DroneState = { x: p.x + Math.sin(yaw) * 0.6, y: p.y + 1.7, z: p.z + Math.cos(yaw) * 0.6, yaw, ox: p.x, oz: p.z, battery: DRONE.battery };
    node.position.set(s.x, s.y, s.z);
    this.drone = { s, pitch: -0.15, hp: DRONE.hp, dartCd: 0, node, parts: ps, rotors, spin: 0, seenT: 0 };
    g.events.emit('gadget', { kind: 'drone', phase: 'place' });
  }

  /** Co-op: a gadget of ours went off (gas, flash, EMP) or stuck (noisemaker) here: the net layer sends it on. */
  onLocal: ((kind: GadgetId, at: Vector3) => void) | null = null;

  /**
   * Co-op: a team-mate's gadget at `at`. On the host it has its full effect on the guards; on a client the guards
   * are the host's, so it is the look (puffs, sparks, the white-out, lights flickering) and nothing else.
   */
  remoteEffect(kind: GadgetId, at: Vector3): void {
    if (kind === 'noise') {
      const mesh = this.g.world.parts.instance('sphere', GADGETS.noise.color, 'gadget');
      mesh.scaling.setAll(0.11);
      mesh.position.copyFrom(at);
      this.noisers.push({ p: at.clone(), t: GADGETS.noise.duration, next: GADGETS.noise.fuse, mesh });
      return;
    }
    if (kind === 'gas' || kind === 'flash' || kind === 'emp') this.detonate(kind, at, true);
  }

  private detonate(kind: GadgetId, at: Vector3, remote = false): void {
    const g = this.g;
    const d = GADGETS[kind];
    if (!remote) this.onLocal?.(kind, at);
    g.events.emit('gadget', { kind, phase: 'detonate' });
    if (kind === 'gas') this.gasCloud(at.x, at.y, at.z, d.radius, d.duration);
    else if (kind === 'flash') this.flashbang(at);
    else if (kind === 'emp') this.emp(at);
  }

  gasCloud(x: number, y: number, z: number, r: number, t: number): void {
    if (this.clouds.length >= 4) this.clouds.shift();
    this.clouds.push({ x, y, z, t, r, puff: 0 });
    this.g.enemyMgr?.hear(this.a.set(x, y, z), 3);
  }

  private flashbang(at: Vector3): void {
    const g = this.g;
    const d = GADGETS.flash;
    g.vfx.sparks(at, Vector3.UpReadOnly as Vector3, 18, '#ffffff');
    for (let i = 0; i < 3; i++) g.vfx.puff(at.x, at.y + 0.2, at.z, this.flashColor, 0.5, 0.5);
    // loud: everyone near hears it
    g.enemyMgr?.hear(at, 16);
    for (const e of g.enemyMgr?.enemies ?? []) {
      if (!e.alive || e.taken) continue;
      const dist = hyp3(e.pos.x - at.x, e.pos.y + 1.5 - at.y, e.pos.z - at.z);
      if (dist > d.radius || !this.clearLine(at.x, at.y + 0.2, at.z, e.pos.x, e.pos.y + 1.55, e.pos.z)) continue;
      // facing it: the full blind; turned away: a short daze
      const fx = Math.sin(e.yaw);
      const fz = Math.cos(e.yaw);
      const facing = (fx * (at.x - e.pos.x) + fz * (at.z - e.pos.z)) / Math.max(0.01, hyp2(at.x - e.pos.x, at.z - e.pos.z)) > 0;
      e.blind(facing ? d.duration * (1 - 0.5 * (dist / d.radius)) : 1.2);
      this.stats.blinded++;
    }
    // the operator: whited out when looking towards it
    const cam = g.player.cam.camera.position;
    const dc = hyp3(at.x - cam.x, at.y - cam.y, at.z - cam.z);
    if (dc < 14 && this.clearLine(cam.x, cam.y, cam.z, at.x, at.y + 0.15, at.z)) {
      const f = g.player.cam.forward;
      const dot = (f.x * (at.x - cam.x) + f.y * (at.y - cam.y) + f.z * (at.z - cam.z)) / Math.max(0.01, dc);
      if (dot > 0.2) g.post.whiteOut(Math.min(1, (1.2 - dc / 14) * dot));
    }
  }

  private emp(at: Vector3): void {
    const g = this.g;
    const d = GADGETS.emp;
    g.vfx.sparks(at, Vector3.UpReadOnly as Vector3, 22, '#6fb6ff');
    const n = g.world.level.lights.disrupt(at.x, at.y, at.z, d.radius, d.duration);
    this.stats.empLights += n;
    if (n) g.enemyMgr?.lightsOut(at.x, at.z);
    // enemy recon drones in range drop
    g.enemyMgr?.empAt(at.x, at.y, at.z, d.radius);
    // electronics: the operator's own drone / cams in range go dark too
    if (this.drone && hyp3(this.drone.s.x - at.x, this.drone.s.y - at.y, this.drone.s.z - at.z) < d.radius) this.destroyDrone();
    // enemies close by are dazed for a moment (their kit sparks)
    for (const e of g.enemyMgr?.enemies ?? []) {
      if (!e.alive || e.taken) continue;
      if (hyp3(e.pos.x - at.x, e.pos.y + 1 - at.y, e.pos.z - at.z) < d.radius * 0.5) e.blind(1);
    }
  }

  // ---- per step ----

  private updateEffects(dt: number): void {
    const g = this.g;
    const em = g.enemyMgr;
    const enemies = em?.enemies ?? [];
    // gas clouds: breathing it long enough knocks out; the cloud drifts as puffs
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]!;
      if (!e.alive) continue;
      let inGas = false;
      for (let k = 0; k < this.clouds.length; k++) {
        const c = this.clouds[k]!;
        if (hyp3(e.pos.x - c.x, e.pos.y + 1.4 - c.y, e.pos.z - c.z) < c.r) inGas = true;
      }
      e.gas = inGas ? e.gas + dt : Math.max(0, e.gas - dt * 0.5);
      if (e.gas >= GAS_KO && !e.taken) {
        e.gas = 0;
        e.knockOut(this.hit(e, 'explosion'));
        this.stats.gassed++;
      }
    }
    for (let k = this.clouds.length - 1; k >= 0; k--) {
      const c = this.clouds[k]!;
      c.t -= dt;
      c.puff -= dt;
      if (c.puff <= 0) {
        c.puff = 0.18;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * c.r * 0.6;
        g.vfx.puff(c.x + Math.cos(a) * r, c.y + 0.3 + Math.random() * 1.2, c.z + Math.sin(a) * r, this.puffColor, c.r * 0.35, 1.4);
      }
      if (c.t <= 0) this.clouds.splice(k, 1);
    }
    // stick-on throws in flight: they stop at the first surface
    for (let k = this.fliers.length - 1; k >= 0; k--) {
      const f = this.fliers[k]!;
      this.b.copyFrom(f.v).scaleInPlace(dt).addInPlace(f.p);
      f.v.y -= GRAVITY * dt;
      if (this.cast(f.p, this.b)) {
        this.fliers.splice(k, 1);
        this.b.copyFrom(this.hitN).scaleInPlace(0.05).addInPlace(this.hitP);
        if (f.kind === 'noise') {
          f.mesh.position.copyFrom(this.b);
          this.noisers.push({ p: this.b.clone(), t: GADGETS.noise.duration, next: GADGETS.noise.fuse, mesh: f.mesh });
          this.onLocal?.('noise', this.b);
        } else {
          f.mesh.dispose();
          this.stickCam(this.b, this.hitN, f.v);
        }
        g.events.emit('gadget', { kind: f.kind, phase: 'stick' });
        continue;
      }
      f.p.copyFrom(this.b);
      f.mesh.position.copyFrom(f.p);
      if (f.p.y < -20) {
        f.mesh.dispose();
        this.fliers.splice(k, 1);
      }
    }
    // noisemakers: pulse a lure
    for (let k = this.noisers.length - 1; k >= 0; k--) {
      const n = this.noisers[k]!;
      n.t -= dt;
      n.next -= dt;
      if (n.next <= 0 && n.t > 0) {
        n.next = NOISE_PERIOD;
        em?.hear(n.p, GADGETS.noise.radius);
        g.vfx.sparks(n.p, this.hitN.set(0, 1, 0), 4, GADGETS.noise.color);
        g.events.emit('gadget', { kind: 'noise', phase: 'pulse' });
        this.stats.pulses++;
      }
      if (n.t <= 0) {
        n.mesh.dispose();
        this.noisers.splice(k, 1);
      }
    }
    // mines: armed after a moment, an enemy close by sets it off
    for (let k = this.mines.length - 1; k >= 0; k--) {
      const m = this.mines[k]!;
      if (m.arm > 0) {
        m.arm -= dt;
        m.led.isVisible = Math.floor(m.arm * 6) % 2 === 0;
        continue;
      }
      m.led.isVisible = true;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i]!;
        if (!e.alive || Math.abs(e.pos.y - m.p.y) > 1.5 || hyp2(e.pos.x - m.p.x, e.pos.z - m.p.z) > MINE_TRIGGER) continue;
        const before = em!.alive;
        g.explosions.explode(m.p.add(this.a.set(0, 0.2, 0)), GADGETS.mine.radius, MINE_DAMAGE, 45, 'player', 'local');
        g.explosions.update();
        this.stats.mineKills += Math.max(0, before - em!.alive);
        g.events.emit('gadget', { kind: 'mine', phase: 'trigger' });
        this.removeMine(k);
        break;
      }
    }
    // the drone: battery, rotors, enemies seeing it
    const dr = this.drone;
    if (dr) {
      dr.dartCd = Math.max(0, dr.dartCd - dt);
      if (this.remote !== 'drone' && !droneStep(dr.s, dt, 0, 0, 0, -1e9)) {
        this.destroyDrone();
      } else {
        this.seeT -= dt;
        if (this.seeT <= 0) {
          this.seeT = 0.25;
          this.droneSeen(0.25);
        }
      }
    }
  }

  /** Enemies notice a drone in view (a calm one looks over); alerted ones shoot it down. */
  private droneSeen(dt: number): void {
    const dr = this.drone;
    const g = this.g;
    if (!dr) return;
    const s = dr.s;
    for (const e of g.enemyMgr?.enemies ?? []) {
      if (!e.alive || e.taken || e.blindT > 0) continue;
      const dx = s.x - e.pos.x;
      const dz = s.z - e.pos.z;
      const d = hyp2(dx, dz);
      if (d > 14) continue;
      const fwd = (Math.sin(e.yaw) * dx + Math.cos(e.yaw) * dz) / Math.max(0.01, d);
      if (fwd < 0.3 && d > 2.5) continue;
      if (!this.clearLine(e.pos.x, e.pos.y + 1.55, e.pos.z, s.x, s.y, s.z)) continue;
      if (e.alerted) {
        dr.hp -= 14 * dt * 4;
        this.a.set(e.pos.x, e.pos.y + 1.4, e.pos.z);
        this.b.set(s.x, s.y, s.z);
        g.vfx.tracer(this.a, this.b, '#ffd27a');
        g.vfx.sparks(this.b, this.hitN.set(0, 1, 0), 3);
        if (dr.hp <= 0) {
          this.destroyDrone();
          return;
        }
      } else e.notice(s.x, s.z, 0.35);
    }
  }

  // ---- remote views ----

  private stickCam(at: Vector3, n: Vector3, v: Vector3): void {
    const g = this.g;
    if (this.cams.length >= GADGETS.stickyCam.max) this.removeCam(0);
    // looks out from the surface (on a floor / ceiling: along the throw)
    const flat = Math.abs(n.y) > 0.7;
    const baseYaw = flat ? Math.atan2(v.x, v.z) : Math.atan2(n.x, n.z);
    const basePitch = flat ? (n.y > 0 ? 0.1 : -0.5) : -0.15;
    const mesh = g.world.parts.instance('sphere', '#2a2f36', 'stickycam');
    mesh.scaling.setAll(0.09);
    mesh.position.copyFrom(at);
    const lens = g.world.parts.instance('sphere', GADGETS.stickyCam.color, 'stickycam-lens');
    lens.scaling.setAll(0.04);
    lens.position.set(at.x + Math.sin(baseYaw) * 0.04, at.y, at.z + Math.cos(baseYaw) * 0.04);
    this.cams.push({ p: at.clone(), baseYaw, basePitch, yaw: baseYaw, pitch: basePitch, gas: false, ping: 0, mesh, lens });
    // the feed opens as it sticks
    this.enterRemote('cam', this.cams.length - 1);
  }

  enterRemote(kind: 'cam' | 'drone', idx = 0): void {
    if (kind === 'cam' && !this.cams[idx]) return;
    if (kind === 'drone' && !this.drone) return;
    this.remote = kind;
    this.camIdx = idx;
    this.aiming = false;
    this.g.post.setFeed(1);
    this.g.events.emit('gadget', { kind: kind === 'cam' ? 'stickyCam' : 'drone', phase: 'view' });
  }

  exitRemote(): void {
    if (!this.remote) return;
    this.remote = null;
    this.g.post.setFeed(0);
    this.g.app.input.state.releaseAll();
    this.g.events.emit('gadget', { kind: 'stickyCam', phase: 'exit' });
  }

  private remoteStep(dt: number, inp: InputState): void {
    const g = this.g;
    // B (crouch) or the gadget button: back to the operator; hurt: snapped back
    if (inp.pressed('crouch') || inp.pressed('grenade')) {
      this.exitRemote();
      return;
    }
    if (this.remote === 'cam') {
      const c = this.cams[this.camIdx];
      if (!c) {
        this.exitRemote();
        return;
      }
      c.ping = Math.max(0, c.ping - dt);
      // X: next cam
      if (inp.pressed('reload') && this.cams.length > 1) this.camIdx = (this.camIdx + 1) % this.cams.length;
      // fire: a lure ping
      if (inp.pressed('fire') && c.ping <= 0) {
        c.ping = CAM_PING_CD;
        g.enemyMgr?.hear(c.p, CAM_PING);
        g.events.emit('gadget', { kind: 'stickyCam', phase: 'pulse' });
        this.stats.pings++;
      }
      // Y: release its sleeping gas (once)
      if (inp.pressed('interact') && !c.gas) {
        c.gas = true;
        this.gasCloud(c.p.x, c.p.y, c.p.z, GADGETS.stickyCam.radius, 5);
        g.events.emit('gadget', { kind: 'gas', phase: 'detonate' });
      }
      if (inp.pressed('mark')) this.markFrom(c.p, c.yaw, c.pitch);
      return;
    }
    const dr = this.drone;
    if (!dr) {
      this.exitRemote();
      return;
    }
    const s = dr.s;
    // fly where it looks (the stick's forward climbs / dives with the view)
    const my = inp.move.y;
    const up = my * Math.sin(dr.pitch) * (DRONE.speed / DRONE.climb);
    const px = s.x;
    const py = s.y;
    const pz = s.z;
    // the floor under it
    this.a.set(s.x, s.y, s.z);
    this.b.set(s.x, s.y - 12, s.z);
    const floorY = this.cast(this.a, this.b) ? this.hitP.y : s.y - 12;
    if (!droneStep(s, dt, inp.move.x, my * Math.cos(dr.pitch), Math.max(-1, Math.min(1, up)), floorY)) {
      this.destroyDrone();
      return;
    }
    // walls / ceilings stop it
    this.a.set(px, py, pz);
    this.b.set(s.x, s.y, s.z);
    if (this.cast(this.a, this.b)) {
      s.x = this.hitP.x + this.hitN.x * 0.25;
      s.y = this.hitP.y + this.hitN.y * 0.25;
      s.z = this.hitP.z + this.hitN.z * 0.25;
    }
    // fire: a stun dart (knocks out an enemy in reach)
    if (inp.pressed('fire') && dr.dartCd <= 0) {
      dr.dartCd = DRONE.dartCooldown;
      this.viewDir(s.yaw, dr.pitch, this.dir);
      this.a.set(s.x, s.y - 0.05, s.z);
      this.b.copyFrom(this.dir).scaleInPlace(DRONE.dartRange).addInPlace(this.a);
      const h = g.ballistics.ray(this.a, this.b, MASK.PLAYER_SHOT);
      g.vfx.tracer(this.a, h.point, '#7fe0ff', 0.012);
      const e = h.target && h.target.team === 'enemy' ? this.enemyById(h.target.id) : null;
      if (e && e.alive) {
        e.knockOut(this.hit(e, 'bullet'));
        this.stats.darts++;
      }
      g.events.emit('gadget', { kind: 'drone', phase: 'dart' });
    }
    // Y: shock burst (non-lethal knock-out round it), the drone is spent
    if (inp.pressed('interact')) {
      for (const e of g.enemyMgr?.enemies ?? []) {
        if (!e.alive || e.taken) continue;
        if (hyp3(e.pos.x - s.x, e.pos.y + 1.2 - s.y, e.pos.z - s.z) > GADGETS.drone.radius) continue;
        if (!this.clearLine(s.x, s.y, s.z, e.pos.x, e.pos.y + 1.2, e.pos.z)) continue;
        e.knockOut(this.hit(e, 'explosion'));
        this.stats.shocked++;
      }
      g.vfx.sparks(this.a.set(s.x, s.y, s.z), this.hitN.set(0, 1, 0), 24, '#7fe0ff');
      g.enemyMgr?.hear(this.a, 6);
      g.events.emit('gadget', { kind: 'drone', phase: 'detonate' });
      this.destroyDrone();
      return;
    }
    if (inp.pressed('mark')) this.markFrom(this.a.set(s.x, s.y, s.z), s.yaw, dr.pitch);
  }

  private viewDir(yaw: number, pitch: number, out: Vector3): Vector3 {
    const cp = Math.cos(pitch);
    return out.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
  }

  /** Mark the enemy under the feed's crosshair. */
  private markFrom(p: Vector3, yaw: number, pitch: number): void {
    const g = this.g;
    this.viewDir(yaw, pitch, this.dir);
    this.from.copyFrom(p).addInPlace(this.dir.scale(0.15));
    this.b.copyFrom(this.dir).scaleInPlace(60).addInPlace(this.from);
    const h = g.ballistics.ray(this.from, this.b, MASK.PLAYER_SHOT);
    const t = h.target;
    if (t && t.team === 'enemy' && t.alive && g.marks.toggle(t.id)) g.events.emit('mark', { on: g.marks.has(t.id) });
  }

  private enemyById(id: string): Enemy | null {
    for (const e of this.g.enemyMgr?.enemies ?? []) if (e.id === id) return e;
    return null;
  }

  private hit(e: Enemy, kind: HitInfo['kind']): HitInfo {
    return { amount: 9999, point: e.pos.clone(), dir: new Vector3(0, 0, 1), part: 'body', kind, attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 0.5 };
  }

  destroyDrone(): void {
    const dr = this.drone;
    if (!dr) return;
    if (this.remote === 'drone') this.exitRemote();
    this.g.vfx.sparks(dr.node.position, this.hitN.set(0, 1, 0), 10, '#9aa3ad');
    for (const m of dr.parts) m.dispose();
    dr.node.dispose();
    this.drone = null;
    this.g.events.emit('gadget', { kind: 'drone', phase: 'destroyed' });
  }

  private removeCam(i: number): void {
    const c = this.cams[i];
    if (!c) return;
    c.mesh.dispose();
    c.lens.dispose();
    this.cams.splice(i, 1);
    if (this.remote === 'cam') {
      if (!this.cams.length) this.exitRemote();
      else this.camIdx = Math.min(this.camIdx, this.cams.length - 1);
    }
  }

  private removeMine(i: number): void {
    const m = this.mines[i];
    if (!m) return;
    m.mesh.dispose();
    m.led.dispose();
    this.mines.splice(i, 1);
  }

  /** Remote feed overlay text: what it is and its controls for the input mode (null: no remote view). */
  feedText(mode: 'touch' | 'gamepad' | 'kbm'): string | null {
    if (!this.remote) return null;
    const pad = mode === 'gamepad';
    const kb = mode === 'kbm';
    if (this.remote === 'cam') {
      const c = this.cams[this.camIdx];
      const n = `CAM ${this.camIdx + 1}/${this.cams.length}`;
      const gas = c && !c.gas ? (pad ? '  Y gas' : kb ? '  E gas' : '  Gas') : '';
      const next = this.cams.length > 1 ? (pad ? '  X next' : kb ? '  R next' : '') : '';
      return pad ? `${n}  RT lure${gas}  RB mark${next}  B back` : kb ? `${n}  LMB lure${gas}  T mark${next}  C back` : `${n}  Fire lure${gas ? '  Action gas' : ''}  Crouch back`;
    }
    const d = this.drone;
    const bat = d ? `${Math.ceil(d.s.battery)} s` : '';
    return pad ? `DRONE ${bat}  RT dart  Y shock  RB mark  B back` : kb ? `DRONE ${bat}  LMB dart  E shock  T mark  C back` : `DRONE ${bat}  Fire dart  Action shock  Crouch back`;
  }

  private actGas = { action: 'interact' as const, label: 'Gas', icon: 'gas' };
  private actShock = { action: 'interact' as const, label: 'Shock', icon: 'drone' };

  /** Touch action button in a remote view (gas from a cam, the drone's shock). */
  touchAction(): { action: 'interact'; label: string; icon: string } | null {
    if (this.remote === 'drone') return this.actShock;
    if (this.remote === 'cam') {
      const c = this.cams[this.camIdx];
      return c && !c.gas ? this.actGas : null;
    }
    return null;
  }

  // ---- render frame ----

  /** After the player's camera update: the remote view takes the camera; the arc preview; drone pose. */
  frameUpdate(dt: number): void {
    const g = this.g;
    const dr = this.drone;
    if (dr) {
      dr.spin += dt * 40;
      for (let i = 0; i < dr.rotors.length; i++) dr.rotors[i]!.rotation.y = dr.spin + i;
      dr.node.position.set(dr.s.x, dr.s.y + Math.sin(dr.spin * 0.05) * 0.02, dr.s.z);
      dr.node.rotation.y = dr.s.yaw;
    }
    const camera = g.player.cam.camera;
    if (this.remote === 'cam') {
      const c = this.cams[this.camIdx];
      if (c) {
        this.viewDir(c.yaw, c.pitch, this.dir);
        camera.position.copyFrom(this.dir).scaleInPlace(0.06).addInPlace(c.p);
        camera.rotation.set(-c.pitch, c.yaw, 0);
        camera.fov = g.player.cam.vfov(g.app.input.state.down('ads') ? 40 : 95);
      }
    } else if (this.remote === 'drone' && dr) {
      camera.position.set(dr.s.x, dr.s.y - 0.06, dr.s.z);
      this.viewDir(dr.s.yaw, dr.pitch, this.dir);
      camera.position.addInPlace(this.dir.scale(0.12));
      camera.rotation.set(-dr.pitch, dr.s.yaw, 0);
      camera.fov = g.player.cam.vfov(85);
    }
    this.drawArc();
  }

  /** The predicted throw path (dots) and where it lands (ring) while the gadget button is held. */
  private drawArc(): void {
    const g = this.g;
    const show = this.aiming && !this.remote && GADGETS[g.weapons.gadgets.selected].use !== 'place';
    if (!show) {
      if (this.arcN) {
        for (const d of this.arcDots) d.isVisible = false;
        if (this.arcRing) this.arcRing.isVisible = false;
        this.arcN = 0;
      }
      return;
    }
    if (!this.arcDots.length) {
      for (let i = 0; i < ARC_DOTS; i++) {
        const d = g.world.parts.instance('sphere', '#e8f4ff', 'arc');
        d.scaling.setAll(0.045);
        d.isVisible = false;
        this.arcDots.push(d);
      }
      const r = g.world.parts.instance('torus', '#e8f4ff', 'arc-ring');
      r.scaling.set(0.5, 0.03, 0.5);
      r.isVisible = false;
      this.arcRing = r;
    }
    g.weapons.throwStart(this.from, this.vel);
    const pts = this.arcPts;
    // step the path until it meets geometry
    let n = 0;
    let px = this.from.x;
    let py = this.from.y;
    let pz = this.from.z;
    const vx = this.vel.x;
    let vy = this.vel.y;
    const vz = this.vel.z;
    let landed = false;
    for (let i = 0; i < ARC_STEPS; i++) {
      pts[n * 3] = px;
      pts[n * 3 + 1] = py;
      pts[n * 3 + 2] = pz;
      n++;
      const nx = px + vx * ARC_DT;
      const ny = py + vy * ARC_DT - 0.5 * GRAVITY * ARC_DT * ARC_DT;
      const nz = pz + vz * ARC_DT;
      vy -= GRAVITY * ARC_DT;
      this.a.set(px, py, pz);
      this.b.set(nx, ny, nz);
      if (this.cast(this.a, this.b, G.STATIC | G.PROP)) {
        pts[n * 3] = this.hitP.x;
        pts[n * 3 + 1] = this.hitP.y;
        pts[n * 3 + 2] = this.hitP.z;
        n++;
        landed = true;
        break;
      }
      px = nx;
      py = ny;
      pz = nz;
      if (n >= ARC_STEPS - 1) break;
    }
    this.arcN = n;
    // dots spread evenly along the steps
    for (let i = 0; i < ARC_DOTS; i++) {
      const d = this.arcDots[i]!;
      const k = Math.floor(((i + 1) / ARC_DOTS) * (n - 1));
      if (k < 1) {
        d.isVisible = false;
        continue;
      }
      d.isVisible = true;
      d.position.set(pts[k * 3]!, pts[k * 3 + 1]!, pts[k * 3 + 2]!);
    }
    const ring = this.arcRing!;
    ring.isVisible = landed;
    if (landed) {
      ring.position.copyFrom(this.hitP).addInPlace(this.a.copyFrom(this.hitN).scaleInPlace(0.03));
      const r = Math.max(0.3, Math.min(1.5, GADGETS[g.weapons.gadgets.selected].radius * 0.15));
      ring.scaling.set(r, 0.03, r);
    }
  }

  /** Checkpoint restock / respawn: gadgets in the world stay. */
  reset(): void {
    this.closeWheel(false);
    this.exitRemote();
    this.aiming = false;
  }

  /** Remove every gadget out in the world (clouds, cams, mines, the drone...). */
  clearWorld(): void {
    this.reset();
    this.destroyDrone();
    while (this.cams.length) this.removeCam(0);
    while (this.mines.length) this.removeMine(0);
    for (const n of this.noisers) n.mesh.dispose();
    for (const f of this.fliers) f.mesh.dispose();
    this.noisers.length = this.fliers.length = this.clouds.length = 0;
  }

  dispose(): void {
    this.clearWorld();
    for (const d of this.arcDots) d.dispose();
    this.arcRing?.dispose();
    this.arcDots.length = 0;
  }
}

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clampAng(d: number, lim: number): number {
  return Math.max(-lim, Math.min(lim, d));
}
