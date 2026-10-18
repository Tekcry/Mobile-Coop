import { Color4, Vector3, type InstancedMesh } from '../core/babylon';
import { CAMERA } from '../config/security';
import { hyp2, hyp3 } from '../core/mathx';
import { CameraUnit } from '../security/camera';
import { SecurityView } from '../security/securityView';
import type { SecurityEvent } from '../security/securitySystem';
import { addGlow } from '../player/goggleGlow';
import { DRAW_DRAWN } from '../weapons/drawState';
import type { PlayerRef } from '../ai/enemy';
import type { GameState } from './gameState';
import {
  ALARM_GAP,
  JAMMER,
  LASER,
  inBox,
  laserCooldown,
  laserDamage,
  laserTouch,
  newJam,
  nextAlarm,
  pickJamTarget,
  stepJam,
  type JamState,
  type JamTarget,
  type LaserDef,
} from './jammer';

/** The host's device state for the clients (a field of the `course` message): camera clock, who jams what, charges, alarm stage. */
export interface SecWire {
  /** The cameras' shared clock (s). */
  ck: number;
  /** Target id each player (0 host, 1 client) is actively jamming ('' none). */
  j: [string, string];
  /** Jammer charge (s) of each player. */
  ch: [number, number];
  /** Alarm stage 0..ALARM_MAX. */
  al: number;
}

/** A zone both players must stand in to set a course flag (station 3's camera pocket). */
export interface PassZone {
  id: string;
  box: [number, number, number, number];
  flag: string;
  floorY?: number;
}

const BEAM = '#ff2a1a';
const BEAM_W = 0.035;
const IDLE = new Color4(1, 0.1, 0.08, 1);
const AIMED = new Color4(0.2, 1, 0.3, 1);
const ON = new Color4(0.7, 1, 0.75, 1);
const EMPTY = new Color4(0.35, 0.03, 0.03, 1);

interface LaserRt {
  def: LaserDef;
  meshes: InstancedMesh[];
  on: boolean;
}

export interface CtHooks {
  /** Radio line (LANTERN). */
  say(text: string): void;
  /** Course stat. */
  record(stat: 'alarms'): void;
  /** Something changed that the clients must see now. */
  dirty(): void;
  /** Course flag set (a pass zone is full). */
  flag?(flag: string): void;
  /** The dev solo flag: one player fills a pass zone. */
  solo?(): boolean;
  /** (B4) Is a course flag set (a laser's release)? */
  has?(flag: string): boolean;
}

/**
 * The CT prototype devices (B3): the held pistol jammer, the security cameras it blinds and the laser devices.
 * `host`: runs the authority (jam state, laser touches, camera alarm) for the host and the one client. `client`: mirrors
 * it from the `course` message's `sec` field (cameras re-built locally from the map data and driven by the host's clock
 * and jam list, lasers as meshes) and sends its own jam intent as `jam` messages. Both read the local trigger.
 */
export class CtDevices {
  readonly cams: CameraUnit[] = [];
  readonly lasers: LaserRt[] = [];
  readonly targets: JamTarget[] = [];
  readonly jam: [JamState, JamState] = [newJam(), newJam()];
  /** Target each player jams now ('' none). */
  readonly jamId: [string, string] = ['', ''];
  alarm = 0;
  /** What the local aim is on (the gun light's green), '' none. */
  localPick = '';
  /** Laser touches landed and radio lines said (tests). */
  hits = 0;
  readonly zones: PassZone[];
  private readonly me: 0 | 1;
  private view: SecurityView | null = null;
  private time = 0;
  private want: [string, string] = ['', ''];
  private wantAt: [number, number] = [-9, -9];
  private lockId = '';
  private sentId = '';
  private sentT = 0;
  private camOff = new Set<string>();
  private cool: { t: number }[] = [{ t: 0 }, { t: 0 }];
  private alarmT = -99;
  private radioT = -99;
  private changed = true;
  private lamp: InstancedMesh | null = null;
  private zoneSet = new Set<string>();
  private readonly p = new Vector3();
  private readonly dir = new Vector3();

  constructor(
    private g: GameState,
    private role: 'host' | 'client',
    private hooks: CtHooks,
  ) {
    this.me = role === 'host' ? 0 : 1;
    const lay = g.world.layout;
    this.zones = lay.passZones ?? [];
    if (role === 'host') {
      for (const c of g.security?.cameras ?? []) this.cams.push(c);
      if (g.security) g.security.onEvent = (e) => this.onCamera(e);
    } else if (lay.security) {
      this.view = new SecurityView(g.scene, g.world.parts);
      for (const d of lay.security.devices) {
        if (d.kind !== 'camera') continue;
        const c = new CameraUnit(d, lay.security.levels?.[d.level] ?? 0);
        this.cams.push(c);
        this.view.addCamera(c);
      }
    }
    for (const c of this.cams) this.targets.push({ id: c.def.id, kind: 'camera', x: c.x, y: c.y, z: c.z });
    for (const def of lay.lasers ?? []) {
      this.lasers.push({ def, meshes: this.buildBeams(def), on: true });
      const base = def.floorY ?? 0;
      const ym = def.ys.reduce((a, b) => a + b, 0) / Math.max(1, def.ys.length);
      this.targets.push({ id: def.id, kind: 'laser', x: (def.x1 + def.x2) / 2, y: base + ym, z: (def.z1 + def.z2) / 2 });
    }
    (window as unknown as { __ctdev?: unknown }).__ctdev = this;
  }

  private buildBeams(def: LaserDef): InstancedMesh[] {
    const out: InstancedMesh[] = [];
    const dx = def.x2 - def.x1;
    const dz = def.z2 - def.z1;
    const len = hyp2(dx, dz);
    const rot = -Math.atan2(dz, dx);
    for (const y of def.ys) {
      const m = this.g.world.parts.instance('box', BEAM, 'laser');
      m.scaling.set(len, BEAM_W, BEAM_W);
      m.position.set((def.x1 + def.x2) / 2, (def.floorY ?? 0) + y, (def.z1 + def.z2) / 2);
      m.rotation.y = rot;
      m.isPickable = false;
      out.push(m);
    }
    return out;
  }

  /** The jam list changed since the last call (the host sends the `course` message at once). */
  takeChanged(): boolean {
    const c = this.changed;
    this.changed = false;
    return c;
  }

  // ---- the local trigger (both roles, every fixed step) ----

  /** `held`: the secondary trigger (LT / Z) is down. Picks the target, drives the gun light, sends or sets the intent. */
  localStep(dt: number, held: boolean): void {
    const g = this.g;
    const w = g.weapons;
    const pistol = g.player.alive && w.drawPhase === DRAW_DRAWN && w.current.def.class === 'pistol';
    let pick = '';
    if (pistol) {
      const cam = g.player.cam.camera.position;
      const f = g.player.cam.forward;
      const i = pickJamTarget(this.targets, cam.x, cam.y, cam.z, f.x, f.y, f.z);
      if (i >= 0) pick = this.targets[i]!.id;
      else if (held && this.lockId) {
        // a held jam keeps its target through a small drift of the aim
        const k = this.targets.find((t) => t.id === this.lockId);
        if (k && pickJamTarget([k], cam.x, cam.y, cam.z, f.x, f.y, f.z, JAMMER.range, JAMMER.cone * 2.5) === 0) pick = this.lockId;
      }
    }
    this.localPick = pick;
    const want = held && pistol ? pick : '';
    this.lockId = want;
    this.updateLamp(pistol);
    if (this.role === 'host') {
      this.want[0] = want;
      this.wantAt[0] = this.time;
      return;
    }
    // client: on change at once, a heartbeat while held
    this.sentT -= dt;
    if (want !== this.sentId || (want !== '' && this.sentT <= 0)) {
      this.sentId = want;
      this.sentT = JAMMER.heartbeat;
      this.g.net?.sendJam?.(want);
    }
  }

  /** The client's intent (host side, from a `jam` message). */
  onRemoteJam(tgt: string): void {
    this.want[1] = this.targets.some((t) => t.id === tgt) ? tgt : '';
    this.wantAt[1] = this.time;
  }

  private updateLamp(pistol: boolean): void {
    const g = this.g;
    if (!this.lamp) {
      const slot = g.weapons.slots.find((s) => s.def.class === 'pistol');
      if (!slot) return;
      const e = slot.model.ext;
      this.lamp = addGlow(g.scene, slot.model.node, 0, e.y1 + 0.012, e.z0 + (e.z1 - e.z0) * 0.3, 0.02);
    }
    this.lamp.isVisible = pistol;
    if (!pistol) return;
    const mine = this.jamId[this.me] !== '';
    const dry = !mine && this.jam[this.me].charge < JAMMER.minStart;
    this.lamp.instancedBuffers.color = mine ? ON : dry ? EMPTY : this.localPick ? AIMED : IDLE;
  }

  // ---- host authority ----

  fixedUpdate(dt: number): void {
    this.time += dt;
    const refs = this.g.playerRefs();
    const n = Math.min(2, refs.length);
    for (let i = 0; i < n; i++) {
      const r = refs[i]!;
      const alive = r.target.alive;
      const fresh = alive && this.time - this.wantAt[i]! <= JAMMER.stale;
      const tgt = fresh ? this.want[i]! : '';
      const ok = tgt !== '' && this.inReach(tgt, r);
      const on = stepJam(this.jam[i]!, ok, r.speed, dt);
      const id = on ? tgt : '';
      if (id !== this.jamId[i]) {
        this.jamId[i] = id as string;
        this.changed = true;
      }
    }
    for (let i = n; i < 2; i++) {
      if (this.jamId[i] !== '') {
        this.jamId[i] = '';
        this.changed = true;
      }
    }
    this.applyJam();
    // laser touches
    for (let i = 0; i < n; i++) this.touch(i, refs[i]!, dt);
    // pass zones: both (or the solo player) inside sets the flag
    for (let z = 0; z < this.zones.length; z++) {
      const zone = this.zones[z]!;
      if (this.zoneSet.has(zone.id)) continue;
      let inside = 0;
      for (let i = 0; i < n; i++) {
        const r = refs[i]!;
        if (r.target.alive && inBox(zone.box, r.feet.x, r.feet.z) && Math.abs(r.feet.y - (zone.floorY ?? 0)) < 1) inside++;
      }
      if (inside >= (this.hooks.solo?.() ? 1 : Math.max(2, n))) {
        this.zoneSet.add(zone.id);
        this.hooks.flag?.(zone.flag);
      }
    }
  }

  /** The player is near enough to the target (the aim itself is the client's; the host bounds the claim). */
  private inReach(id: string, r: PlayerRef): boolean {
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i]!;
      if (t.id === id) return hyp3(t.x - r.feet.x, t.y - r.feet.y - 1.5, t.z - r.feet.z) <= JAMMER.range + 3;
    }
    return false;
  }

  private jammed(id: string): boolean {
    return this.jamId[0] === id || this.jamId[1] === id;
  }

  /** Put the jam on the devices: a jammed camera is blind (mode off, LED dark), a jammed laser is off. */
  private applyJam(): void {
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      const id = c.def.id;
      if (this.jammed(id)) {
        if (c.mode === 'online') {
          c.setMode('off');
          this.camOff.add(id);
        }
      } else if (this.camOff.has(id)) {
        this.camOff.delete(id);
        if (c.mode === 'off') c.setMode('online');
      }
    }
    for (let i = 0; i < this.lasers.length; i++) {
      const l = this.lasers[i]!;
      const off = l.def.offFlag !== undefined && !!this.hooks.has?.(l.def.offFlag);
      const on = !off && !this.jammed(l.def.id);
      if (on === l.on) continue;
      l.on = on;
      for (let k = 0; k < l.meshes.length; k++) l.meshes[k]!.setEnabled(on);
    }
  }

  private touch(i: number, r: PlayerRef, dt: number): void {
    let hit: LaserRt | null = null;
    if (r.target.alive) {
      const h = r.crouched ? LASER.crouchHeight : LASER.standHeight;
      for (let k = 0; k < this.lasers.length && !hit; k++) {
        const l = this.lasers[k]!;
        if (l.on && laserTouch(l.def, r.feet.x, r.feet.y, r.feet.z, h)) hit = l;
      }
    }
    if (!laserCooldown(this.cool[i]!, dt, hit !== null) || !hit) return;
    const health = (r.target as unknown as { health?: { hp: number } }).health;
    const dmg = laserDamage(health?.hp ?? 100);
    this.hits++;
    const l = hit.def;
    this.p.set((l.x1 + l.x2) / 2, (l.floorY ?? 0) + 1, (l.z1 + l.z2) / 2);
    this.dir.set(r.feet.x - this.p.x, 0, r.feet.z - this.p.z);
    if (dmg > 0) r.target.applyDamage({ amount: dmg, point: this.p, dir: this.dir, part: 'body', kind: 'melee', attackerTeam: 'enemy', attackerId: 'laser', sourcePos: this.p, impulse: 0 });
    if (this.time - this.radioT > 6) {
      this.radioT = this.time;
      this.hooks.say(`${l.label ?? 'Laser'}: that cost you. Jam it with the pistol, or stay clear.`);
    }
  }

  private onCamera(e: SecurityEvent): void {
    if (e.kind !== 'stage') return;
    if (e.stage === 1) {
      if (this.time - this.radioT > 6) {
        this.radioT = this.time;
        this.hooks.say('The camera has noticed something. Jam it or break its line.');
      }
      return;
    }
    // full awareness: the alarm stage goes up one (G125: escalating, it never ends the run)
    if (this.time - this.alarmT < ALARM_GAP) return;
    this.alarmT = this.time;
    this.alarm = nextAlarm(this.alarm);
    this.hooks.record('alarms');
    this.g.hud.banner(`ALARM STAGE ${this.alarm}`, 'A camera has you', 2200);
    this.hooks.say(`Camera alert, stage ${this.alarm}. It keeps watching until someone jams it.`);
    this.changed = true;
  }

  /** Host: the field for the `course` message. */
  wire(): SecWire {
    return {
      ck: this.cams[0]?.clock ?? 0,
      j: [this.jamId[0], this.jamId[1]],
      ch: [Math.round(this.jam[0].charge * 10) / 10, Math.round(this.jam[1].charge * 10) / 10],
      al: this.alarm,
    };
  }

  // ---- client mirror ----

  /** Client: the host's device state. */
  apply(s: SecWire): void {
    this.jamId[0] = s.j[0];
    this.jamId[1] = s.j[1];
    this.jam[0].charge = s.ch[0];
    this.jam[1].charge = s.ch[1];
    this.alarm = s.al;
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      c.clock = s.ck;
      c.setMode(this.jammed(c.def.id) ? 'off' : 'online');
    }
    this.applyJam();
  }

  /** Client, per frame: the cameras keep turning between the host's clock updates. */
  frame(dt: number): void {
    if (this.role !== 'client') return;
    for (let i = 0; i < this.cams.length; i++) this.cams[i]!.advance(dt);
    this.view?.update(this.cams);
  }

  /** Test view (`window.__ctdev.debug()`). */
  debug(): Record<string, unknown> {
    return {
      role: this.role,
      jam: [...this.jamId],
      charge: [this.jam[0].charge, this.jam[1].charge],
      alarm: this.alarm,
      hits: this.hits,
      pick: this.localPick,
      cams: this.cams.map((c) => ({ id: c.def.id, mode: c.mode, yaw: c.yaw, stage: [...c.meters.values()].map((m) => m.stage), meter: [...c.meters.values()].map((m) => m.meter) })),
      lasers: this.lasers.map((l) => ({ id: l.def.id, on: l.on })),
      range: CAMERA.range,
    };
  }

  dispose(): void {
    this.view?.dispose();
    for (const l of this.lasers) for (const m of l.meshes) m.dispose();
    this.lasers.length = 0;
    this.lamp?.dispose();
    this.lamp = null;
    if (this.g.security) this.g.security.onEvent = null;
    const w = window as unknown as { __ctdev?: unknown };
    if (w.__ctdev === this) delete w.__ctdev;
  }
}
