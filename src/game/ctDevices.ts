import { Color4, TransformNode, Vector3, type InstancedMesh, type Vector4 } from '../core/babylon';
import { CAMERA } from '../config/security';
import { hyp2, hyp3 } from '../core/mathx';
import { CameraUnit } from '../security/camera';
import { SecurityView } from '../security/securityView';
import { CameraCueView } from '../vfx/cameraCueView';
import { cameraSight, newSeenBody, remoteHeadY, type SecurityEvent, type SeenBody } from '../security/securitySystem';
import { seenAt } from '../ai/perception';
import { addGlow } from '../player/goggleGlow';
import { DRAW_DRAWN } from '../weapons/drawState';
import type { PlayerRef } from '../ai/enemy';
import type { GameState } from './gameState';
import {
  JAMMER,
  LASER,
  deviceAlarm,
  inBox,
  laserCooldown,
  laserTouch,
  newJam,
  pickJamTarget,
  rearmZones,
  stepJam,
  type JamState,
  type JamTarget,
  type LaserDef,
} from './jammer';
import {
  SCANNER,
  SC_DONE,
  SC_HACKING,
  SC_IDLE,
  SC_READY,
  SCAN_LABEL,
  newScanPair,
  newScanResult,
  scanDamage,
  scanPairReady,
  scanStart,
  scanStep,
  scanWindowLeft,
  type ScanPair,
  type ScanPhase,
  type ScanResult,
  type ScannerDef,
} from './scanners';

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
  /** (B6) The scanner pair: [phase A, phase B, occupied bits (1 A, 2 B), hack progress A, B (tenths of s)]. */
  sc?: number[];
}

interface ScanRt {
  def: ScannerDef;
  /** Panel positions [ax, az, bx, bz]. */
  pos: [number, number, number, number];
  pair: ScanPair;
  res: ScanResult;
  /** Bit 1: someone stands at A, bit 2: at B. */
  occ: number;
  /** State glow and ready glow per panel. */
  glow: InstancedMesh[];
  ready: InstancedMesh[];
  root: TransformNode;
}

const SC_COL: readonly Color4[] = [new Color4(0.35, 0.38, 0.42, 1), new Color4(1, 0.6, 0.1, 1), new Color4(0.2, 0.8, 1, 1), new Color4(0.2, 1, 0.35, 1)];
const RDY_OFF = new Color4(0.15, 0.2, 0.15, 1);
const RDY_ON = new Color4(0.3, 1, 0.4, 1);

/** A zone both players must stand in to set a course flag (station 3's camera pocket). */
export interface PassZone {
  id: string;
  box: [number, number, number, number];
  flag: string;
  floorY?: number;
}

const BEAM = '#ff2a1a';
const BEAM_W = 0.035;
/** (sector-fixes C, item 4) The IR beams' glow in night vision (`pattern.w`, the render-only emissive flag). */
const BEAM_NV_GLOW = 0.9;
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
  /** The jam targets that are live (Sector Ops: only the live section's devices). */
  readonly targets: JamTarget[] = [];
  private readonly allTargets: JamTarget[] = [];
  /** Sector Ops: devices of a section that is not live (off and blind; lasers dark and harmless). */
  private readonly dead = new Set<string>();
  /** Sector Ops: the live section (-1 none; devices without a section are always live). */
  liveSection = -1;
  readonly jam: [JamState, JamState] = [newJam(), newJam()];
  /** Target each player jams now ('' none). */
  readonly jamId: [string, string] = ['', ''];
  alarm = 0;
  /** What the local aim is on (the gun light's green), '' none. */
  localPick = '';
  /** Laser breaks counted (each raises the alarm; none deals damage: sector-fixes C, item 5) (tests). */
  hits = 0;
  readonly zones: PassZone[];
  private readonly me: 0 | 1;
  private view: SecurityView | null = null;
  /** (camera-cue) The faint red scan grid of what each camera sees (render only). */
  private cue: CameraCueView | null = null;
  /** (camera-cue fix) Client: per camera 1 = sees a player, from the host's own test (`cameraSight`) at `thinkHz`. */
  private cueSeen = new Uint8Array(0);
  private cueT = 0;
  private readonly refTmp: PlayerRef[] = [];
  private readonly bodies: SeenBody[] = [newSeenBody()];
  private readonly lit = { lightAt: (x: number, y: number, z: number): number => this.g.world.lightField.totalAt(x, y, z) };
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
  /** (sector-fixes C, item 4) Night vision is on screen: the IR beams are drawn (render only). */
  private nv = false;
  private lamp: InstancedMesh | null = null;
  private zoneSet = new Set<string>();
  private readonly p = new Vector3();
  private readonly dir = new Vector3();
  /** (B6) The paired scanners (station 6), null on maps without them. */
  scan: ScanRt | null = null;
  /** (B6) Failed scanner syncs (tests) and the last one's player and reason. */
  scanFails = 0;
  scanLast = '';
  private scanRadioT = -99;

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
    for (const c of this.cams) this.allTargets.push({ id: c.def.id, kind: 'camera', x: c.x, y: c.y, z: c.z });
    this.cueSeen = new Uint8Array(this.cams.length);
    if (this.cams.length > 0) {
      const b = g.ballistics;
      this.cue = new CameraCueView(g.scene, this.cams, (a, z, m) => b.hitDistance(a, z, m), g.app.quality.level.minimal);
    }
    for (const def of lay.lasers ?? []) {
      this.lasers.push({ def, meshes: this.buildBeams(def), on: true });
      const base = def.floorY ?? 0;
      const ym = def.ys.reduce((a, b) => a + b, 0) / Math.max(1, def.ys.length);
      this.allTargets.push({ id: def.id, kind: 'laser', x: (def.x1 + def.x2) / 2, y: base + ym, z: (def.z1 + def.z2) / 2 });
    }
    for (const t of this.allTargets) this.targets.push(t);
    const sd = lay.scanners?.[0];
    const devs = lay.course?.devices;
    const da = sd && devs?.[sd.a];
    const db = sd && devs?.[sd.b];
    if (sd && da && db) this.scan = this.buildScan(sd, da.x, da.z, db.x, db.z);
    (window as unknown as { __ctdev?: unknown }).__ctdev = this;
  }

  private buildScan(def: ScannerDef, ax: number, az: number, bx: number, bz: number): ScanRt {
    const root = new TransformNode('scanners', this.g.scene);
    const glow: InstancedMesh[] = [];
    const ready: InstancedMesh[] = [];
    const pts: [number, number][] = [[ax, az], [bx, bz]];
    for (const [x, z] of pts) {
      // on the panel face (the panels sit against the fences, 0.2 m from them)
      const fz = z < 7 ? 0.3 : 13.7;
      const s = addGlow(this.g.scene, root, x, 1.95, fz, 0.16);
      s.instancedBuffers.color = SC_COL[0]!;
      glow.push(s);
      const r = addGlow(this.g.scene, root, x, 2.25, fz, 0.1);
      r.instancedBuffers.color = RDY_OFF;
      ready.push(r);
    }
    return { def, pos: [ax, az, bx, bz], pair: newScanPair(), res: newScanResult(), occ: 0, glow, ready, root };
  }

  /** Is the player at the scanner panel `k` (alive, within reach)? */
  private atPanel(sc: ScanRt, k: number, r: PlayerRef): boolean {
    return r.target.alive && hyp2(sc.pos[k * 2]! - r.feet.x, sc.pos[k * 2 + 1]! - r.feet.z) <= SCANNER.reach && Math.abs(r.feet.y) < 1.5;
  }

  /**
   * (B6) Host: player `p` used course device `cid`. Undefined when it is not a scanner; else a refusal or null. Validates
   * the player (alive, at that panel) and the panel (free, not the other one of a player already on it).
   */
  scanPress(cid: string, p: number): string | null | undefined {
    const sc = this.scan;
    if (!sc || (cid !== sc.def.a && cid !== sc.def.b)) return undefined;
    if (this.role !== 'host') return null;
    const k = cid === sc.def.a ? 0 : 1;
    const r = this.g.playerRefs()[p];
    if (!r || !this.atPanel(sc, k, r)) return 'Stand at the scanner';
    if (sc.pair.open) return null;
    const why = scanStart(sc.pair, k as 0 | 1, p, !!this.hooks.solo?.());
    if (!why) {
      this.changed = true;
      if (this.time - this.scanRadioT > 8 && sc.pair.ph[k === 0 ? 1 : 0] === SC_IDLE) {
        this.scanRadioT = this.time;
        this.hooks.say(`Scanner ${k === 0 ? 'A' : 'B'} hacking. Partner: start yours now, both must finish within ${SCANNER.window} s.`);
      }
    }
    return why;
  }

  private stepScan(dt: number, refs: PlayerRef[], n: number): void {
    const sc = this.scan;
    if (!sc) return;
    const pr = sc.pair;
    // a bay restart cleared the flag: the scanners are live again
    if (pr.open && this.hooks.has && !this.hooks.has(sc.def.flag)) {
      pr.open = false;
      for (let k = 0; k < 2; k++) {
        pr.ph[k] = SC_IDLE;
        pr.who[k] = -1;
        pr.t[k] = 0;
        pr.at[k] = -1;
      }
      this.changed = true;
    }
    let occ = 0;
    for (let i = 0; i < n; i++) {
      const r = refs[i]!;
      if (this.atPanel(sc, 0, r)) occ |= 1;
      if (this.atPanel(sc, 1, r)) occ |= 2;
    }
    const wa = pr.who[0];
    const wb = pr.who[1];
    const atA = wa >= 0 && wa < n && this.atPanel(sc, 0, refs[wa]!);
    const atB = wb >= 0 && wb < n && this.atPanel(sc, 1, refs[wb]!);
    const pa = pr.ph[0];
    const pb = pr.ph[1];
    const res = scanStep(pr, dt, atA, atB, sc.res, !!this.hooks.solo?.());
    if (occ !== sc.occ || pa !== pr.ph[0] || pb !== pr.ph[1]) this.changed = true;
    sc.occ = occ;
    if (res.kind === 'open') {
      this.hooks.flag?.(sc.def.flag);
      this.hooks.say('Both scanners accepted. Door open.');
      this.changed = true;
    } else if (res.kind === 'fail') {
      this.scanFails++;
      this.scanLast = `${res.who}:${res.why}`;
      this.changed = true;
      const r = res.who >= 0 && res.who < n ? refs[res.who]! : null;
      if (r) {
        const health = (r.target as unknown as { health?: { hp: number } }).health;
        const dmg = scanDamage(health?.hp ?? 100);
        this.p.set(sc.pos[0], 1.4, sc.pos[1]);
        this.dir.set(0, 0, 1);
        if (dmg > 0) r.target.applyDamage({ amount: dmg, point: this.p, dir: this.dir, part: 'body', kind: 'melee', attackerTeam: 'enemy', attackerId: 'scanner', sourcePos: this.p, impulse: 0 });
      }
      this.hooks.say(res.why === 'abort' ? 'Scanner hack broken off. Both reset, and that one hurt. Stay at the panel.' : res.why === 'alone' ? 'The other scanner was never started. Both reset. Start your hacks together.' : `Scanners out of sync. Both reset, and that one hurt. Finish within ${SCANNER.window} s of each other.`);
    }
    this.scanVisuals();
  }

  /** Both roles: the panel glows (state) and the ready glows (both players at their panels). */
  private scanVisuals(): void {
    const sc = this.scan;
    if (!sc) return;
    const rdy = (scanPairReady((sc.occ & 1) !== 0, (sc.occ & 2) !== 0) && sc.pair.ph[0] !== SC_HACKING) || sc.pair.open;
    for (let k = 0; k < 2; k++) {
      sc.glow[k]!.instancedBuffers.color = SC_COL[sc.pair.ph[k]!]!;
      sc.ready[k]!.instancedBuffers.color = rdy ? RDY_ON : RDY_OFF;
    }
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
      // (sector-fixes C, item 4) infrared: hidden until night vision (`showLaser`)
      m.setEnabled(false);
      out.push(m);
    }
    return out;
  }

  /**
   * Sector Ops (feature/sector-ops): only the devices of section `section` work (tagged `section` in the map data;
   * untagged devices always work). The others' cameras go off and blind, their lasers dark and harmless, and they are
   * no jam targets. -1: no section's devices. Not on a hot path (a section loads or unloads).
   */
  setLive(section: number): void {
    this.liveSection = section;
    this.dead.clear();
    for (const c of this.cams) if (c.def.section !== undefined && c.def.section !== section) this.dead.add(c.def.id);
    for (const l of this.lasers) if (l.def.section !== undefined && l.def.section !== section) this.dead.add(l.def.id);
    this.targets.length = 0;
    for (const t of this.allTargets) if (!this.dead.has(t.id)) this.targets.push(t);
    this.changed = true;
    this.applyJam();
  }

  /**
   * (Sector Ops restart, step 3) The cameras of `section` that were shot out come back (a restart is a clean retry).
   * Not on a hot path.
   */
  repair(section: number): void {
    for (const c of this.cams) {
      if (c.def.section !== undefined && c.def.section !== section) continue;
      // every camera of the section forgets what it had seen (a meter latched full too)
      for (const m of c.meters.values()) m.meter = m.sinceSeen = m.full = m.stage = 0;
      if (c.mode !== 'destroyed') continue;
      c.repair();
      this.camOff.delete(c.def.id);
    }
    this.applyJam();
    this.changed = true;
  }

  /** Host: the ids of the cameras shot out, into `out` (cleared first). */
  destroyedIds(out: string[]): string[] {
    out.length = 0;
    for (const c of this.cams) if (c.mode === 'destroyed') out.push(c.def.id);
    return out;
  }

  /** Client: the host's shot-out cameras (`dn`): those break here too, the others are repaired. */
  applyDestroyed(dn: readonly string[]): void {
    for (const c of this.cams) {
      const down = dn.includes(c.def.id);
      if (down && c.mode !== 'destroyed') c.destroy();
      else if (!down && c.mode === 'destroyed') c.repair();
    }
  }

  /** The device works now (Sector Ops: its section is live). */
  live(id: string): boolean {
    return !this.dead.has(id);
  }

  /** The jam list changed since the last call (the host sends the `course` message at once). */
  takeChanged(): boolean {
    const c = this.changed;
    this.changed = false;
    return c;
  }

  // ---- the local trigger (both roles, every fixed step) ----

  /** `held`: the jammer is held (anim-rework S1, Michael 14:55: the co-op button, pad RB / KBM F, while aiming the drawn
   *  pistol; `GameState.pistolAim`). Picks the target, drives the gun light, sends or sets the intent. */
  localStep(dt: number, held: boolean): void {
    const g = this.g;
    const w = g.weapons;
    const pistol = g.player.alive && w.drawPhase === DRAW_DRAWN && w.current.def.class === 'pistol';
    let pick = '';
    if (pistol) {
      const cam = g.player.cam.gamePos;
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
    this.cue?.update(dt, this.g.vision.kind === 2);
    this.followVision();
    // laser breaks: the alarm, never damage (sector-fixes C, item 5)
    for (let i = 0; i < n; i++) this.touch(i, refs[i]!, dt);
    this.stepScan(dt, refs, n);
    // pass zones: both (or the solo player) inside sets the flag; (B8) a bay restart that cleared the flag re-arms it
    if (this.hooks.has) rearmZones(this.zoneSet, this.zones, this.hooks.has);
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
      if (this.jammed(id) || this.dead.has(id)) {
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
      const on = !off && !this.jammed(l.def.id) && !this.dead.has(l.def.id);
      if (on === l.on) continue;
      l.on = on;
      this.showLaser(l);
    }
  }

  /** (sector-fixes C, item 4) Night vision on or off: the IR beams follow it (render only, every fixed step / frame). */
  private followVision(): void {
    const nv = this.g.vision.night === 1;
    if (nv === this.nv) return;
    this.nv = nv;
    for (let i = 0; i < this.lasers.length; i++) this.showLaser(this.lasers[i]!);
  }

  /**
   * (sector-fixes C, item 4, Michael's answer "Night vision") A laser's beams are infrared: drawn, glowing, only while it
   * is on and night vision is on screen; invisible in normal, thermal and electro vision. Render only: the sensor
   * (`touch`) reads `l.on`, never this.
   */
  private showLaser(l: LaserRt): void {
    const show = l.on && this.nv;
    for (let k = 0; k < l.meshes.length; k++) {
      const m = l.meshes[k]!;
      if (m.isEnabled(false) !== show) m.setEnabled(show);
      const pt = m.instancedBuffers.pattern as Vector4 | undefined;
      if (show && pt) pt.w = BEAM_NV_GLOW;
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
    // (sector-fixes C, item 5) a break sets off the alarm on the camera's path; it never hurts (no damage path)
    this.hits++;
    const l = hit.def;
    const raised = this.raiseAlarm(`${l.label ?? 'Laser'} tripped`);
    if (this.time - this.radioT > 6) {
      this.radioT = this.time;
      this.hooks.say(raised ? `${l.label ?? 'Laser'} tripped: alarm stage ${this.alarm}. Night vision shows the beams; jam it with the pistol.` : `${l.label ?? 'Laser'} tripped again. Night vision shows the beams.`);
    }
  }

  /**
   * (sector-fixes C, item 5) The devices' one alarm path (a camera at full awareness, a laser break): up one stage unless
   * one went up under `ALARM_GAP` ago; the course stat / Sector Ops hook, the banner. Returns true when the stage rose.
   */
  private raiseAlarm(why: string): boolean {
    const next = deviceAlarm(this.alarm, this.time - this.alarmT);
    if (next < 0) return false;
    this.alarmT = this.time;
    this.alarm = next;
    this.hooks.record('alarms');
    this.g.hud.banner(`ALARM STAGE ${this.alarm}`, why, 2200);
    this.changed = true;
    return true;
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
    if (!this.raiseAlarm('A camera has you')) return;
    this.hooks.say(`Camera alert, stage ${this.alarm}. It keeps watching until someone jams it.`);
  }

  /** Host: the field for the `course` message. */
  wire(): SecWire {
    return {
      ck: this.cams[0]?.clock ?? 0,
      j: [this.jamId[0], this.jamId[1]],
      ch: [Math.round(this.jam[0].charge * 10) / 10, Math.round(this.jam[1].charge * 10) / 10],
      al: this.alarm,
      ...(this.scan ? { sc: [this.scan.pair.ph[0], this.scan.pair.ph[1], this.scan.occ, Math.round(this.scan.pair.t[0] * 10), Math.round(this.scan.pair.t[1] * 10)] } : {}),
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
    const sc = this.scan;
    if (sc && s.sc) {
      for (let k = 0; k < 2; k++) {
        const ph = s.sc[k] ?? 0;
        sc.pair.ph[k] = (ph >= SC_IDLE && ph <= SC_DONE ? ph : SC_IDLE) as ScanPhase;
        sc.pair.t[k] = (s.sc[3 + k] ?? 0) / 10;
      }
      sc.pair.open = sc.pair.ph[0] === SC_DONE && sc.pair.ph[1] === SC_DONE;
      sc.occ = s.sc[2] ?? 0;
      this.scanVisuals();
    }
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      c.clock = s.ck;
      c.setMode(this.jammed(c.def.id) || this.dead.has(c.def.id) ? 'off' : 'online');
    }
    this.applyJam();
  }

  /** Client, per frame: the cameras keep turning between the host's clock updates. */
  frame(dt: number): void {
    if (this.role !== 'client') return;
    for (let i = 0; i < this.cams.length; i++) this.cams[i]!.advance(dt);
    this.followVision();
    if (this.cue) {
      this.cueT += dt;
      const step = 1 / CAMERA.thinkHz;
      if (this.cueT >= step) {
        this.cueT %= step;
        this.clientSight();
      }
      this.cue.update(dt, this.g.vision.kind === 2, this.cueSeen);
    }
    this.view?.update(this.cams);
  }

  /** (camera-cue fix) Client: which cameras see a player now, by the host's test on our body and the partner's (from
   *  its MoveState), with the synced yaw and mode: the cue pulses on this page too, nothing sent. */
  private clientSight(): void {
    const g = this.g;
    const own = g.playerRefsInto(this.refTmp)[0];
    let n = 0;
    if (own && own.target.alive) {
      const b = this.bodies[0]!;
      b.crouched = own.crouched;
      b.speed = own.speed;
      b.head.set(own.feet.x + (own.peekX ?? 0), remoteHeadY(own.feet.y, own.crouched), own.feet.z + (own.peekZ ?? 0));
      b.light = own.light;
      n = 1;
    }
    n += g.net?.partnerBodies?.(this.bodies, n) ?? 0;
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      let s = 0;
      for (let k = 0; k < n && s === 0; k++) {
        const b = this.bodies[k]!;
        if (seenAt(cameraSight(c, b.head, b.crouched, b.speed, b.light, g.ballistics, this.lit))) s = 1;
      }
      this.cueSeen[i] = s;
    }
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
      cams: this.cams.map((c) => ({ id: c.def.id, mode: c.mode, yaw: c.yaw, live: this.live(c.def.id), stage: [...c.meters.values()].map((m) => m.stage), meter: [...c.meters.values()].map((m) => m.meter) })),
      lasers: this.lasers.map((l) => ({ id: l.def.id, on: l.on, live: this.live(l.def.id) })),
      live: this.liveSection,
      range: CAMERA.range,
      cue: this.cue?.debug() ?? [],
      scan: this.scanDebug(),
    };
  }

  /** (B6) Scanner state for tests (null on maps without scanners). */
  scanDebug(): Record<string, unknown> | null {
    const sc = this.scan;
    if (!sc) return null;
    const pr = sc.pair;
    return {
      ph: [SCAN_LABEL[pr.ph[0]], SCAN_LABEL[pr.ph[1]]],
      t: [pr.t[0], pr.t[1]],
      who: [pr.who[0], pr.who[1]],
      occ: sc.occ,
      ready: scanPairReady((sc.occ & 1) !== 0, (sc.occ & 2) !== 0),
      open: pr.open,
      left: scanWindowLeft(pr),
      fails: this.scanFails,
      last: this.scanLast,
      anyReady: pr.ph[0] === SC_READY || pr.ph[1] === SC_READY,
    };
  }

  dispose(): void {
    this.scan?.root.dispose();
    this.scan = null;
    this.view?.dispose();
    this.cue?.dispose();
    this.cue = null;
    for (const l of this.lasers) for (const m of l.meshes) m.dispose();
    this.lasers.length = 0;
    this.lamp?.dispose();
    this.lamp = null;
    if (this.g.security) this.g.security.onEvent = null;
    const w = window as unknown as { __ctdev?: unknown };
    if (w.__ctdev === this) delete w.__ctdev;
  }
}
