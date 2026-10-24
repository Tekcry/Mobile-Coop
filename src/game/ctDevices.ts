import { Color4, TransformNode, Vector3, type InstancedMesh, type Vector4 } from '../core/babylon';
import { CAMERA } from '../config/security';
import { hyp2, hyp3 } from '../core/mathx';
import { CameraUnit, nearestHousing, sweepYaw } from '../security/camera';
import { SecurityView } from '../security/securityView';
import { cameraAlertsGuards } from '../security/data';
import { CameraCueView } from '../vfx/cameraCueView';
import { cameraSight, newSeenBody, remoteHeadY, type SecurityEvent, type SeenBody } from '../security/securitySystem';
import { seenAt } from '../ai/perception';
import { addGlow } from '../player/goggleGlow';
import { DRAW_DRAWN } from '../weapons/drawState';
import { G } from '../physics/groups';
import type { PlayerRef } from '../ai/enemy';
import type { LightDef } from '../world/lights';
import type { GameState } from './gameState';
import {
  DEV_IDLE,
  DEV_JAMMED,
  DEV_RECOVER,
  HALL_BACK,
  HALL_BACK_HOLD,
  HALL_IDLE,
  HALL_SENT,
  JAMMER,
  LASER,
  advanceDevJam,
  applyJamLight,
  beamSpot,
  deviceAlarm,
  hallStep,
  inBox,
  jamHudKey,
  jamHudText,
  jamLeft,
  jamOrigin,
  laserCooldown,
  laserTouch,
  mirrorDevJam,
  newDevJam,
  newJam,
  pickJamTarget,
  rearmZones,
  stepDevJam,
  stepJam,
  type DevJam,
  type DevPhase,
  type HallRule,
  type JamState,
  type JamTarget,
  type LaserDef,
} from './jammer';
import {
  SCANNER,
  SCAN_GLOW,
  SC_HACKING,
  SC_IDLE,
  SC_READY,
  SCAN_LABEL,
  newScanPair,
  newScanResult,
  packScan,
  scanDamage,
  scanGlowAt,
  scanPairReady,
  scanStart,
  scanStep,
  scanWindowLeft,
  unpackScan,
  type ScanPair,
  type ScanResult,
  type ScannerDef,
} from './scanners';
import { hallCameras, passZoneNeed, type PassZone } from './passZones';
import type { CourseDevice } from './course/courseDef';
import { cameraOff, consoleCamMode } from './course/securityRoom';
import { deskCamMode } from './sectorDesks';
import {
  PANEL,
  PANEL_LED_PART,
  PANEL_PART,
  laserLive,
  panelLed,
  panelTarget,
  type LaserPanelDef,
} from './laserPanels';

/** The host's device state for the clients (a field of the `course` / `sector` message): camera clocks, who jams what,
 *  each jammer's use and cooldown, the devices' jam timelines, alarm stage. */
export interface SecWire {
  /** (26) Each camera's clock (s), in the map's camera order (a jammed camera's clock stops: its sweep is frozen). */
  ck: number[];
  /** Target id each player slot (0 host, 1..3 the clients) is actively jamming ('' none). (coop4 D1, A11) One entry per
   *  slot, length 1..PLAYER_SLOTS: the host sends max(2, highest slot in use + 1) entries (the course always 2). */
  j: string[];
  /** (26) Jam seconds left of each player slot (`jamLeft`: the rest of the jam, `useMax` when ready, 0 cooling). */
  ch: number[];
  /** (26) Cooldown seconds left of each player slot. */
  cd: number[];
  /** (26) The devices that are not idle: [id, phase (1 jammed, 2 recovering), seconds in the phase]. */
  dv: [string, number, number][];
  /** Alarm stage 0..ALARM_MAX. */
  al: number;
  /** (B6; 30 marlow-final N6) One entry per scanner pair, in the map's `scanners` order (the pairs both pages built):
   *  [phase A, phase B, occupied bits (1 A, 2 B), hack progress A, B (tenths of s)] (`packScan`). */
  sc?: number[][];
}

interface ScanRt {
  def: ScannerDef;
  /** Panel positions [ax, az, bx, bz]. */
  pos: [number, number, number, number];
  /** (N6) Panel floor heights [a, b] (the devices' `y`). */
  fy: [number, number];
  pair: ScanPair;
  res: ScanResult;
  /** Bit 1: someone stands at A, bit 2: at B. */
  occ: number;
  /** State glow and ready glow per panel. */
  glow: InstancedMesh[];
  ready: InstancedMesh[];
  root: TransformNode;
  /** (N6) This pair's last "partner: start yours" radio line (clock s). */
  radioT: number;
}

const SC_COL: readonly Color4[] = [new Color4(0.35, 0.38, 0.42, 1), new Color4(1, 0.6, 0.1, 1), new Color4(0.2, 0.8, 1, 1), new Color4(0.2, 1, 0.35, 1)];
const RDY_OFF = new Color4(0.15, 0.2, 0.15, 1);
const RDY_ON = new Color4(0.3, 1, 0.4, 1);

/** (marlow-final N1) The pass zone lives in `passZones.ts` (pure); re-exported here for the maps that import it. */
export type { PassZone } from './passZones';

const BEAM = '#ff2a1a';
const BEAM_W = 0.035;
/** (sector-fixes C, item 4) The IR beams' glow in night vision (`pattern.w`, the render-only emissive flag). */
const BEAM_NV_GLOW = 0.9;
const IDLE = new Color4(1, 0.1, 0.08, 1);
const AIMED = new Color4(0.2, 1, 0.3, 1);
/** (marlow-jammer) Jamming: a bright cyan pulse (the old "jamming" green matched the aimed green: a jam did not show). */
const ON = new Color4(0.35, 0.85, 1, 1);
const ON_DIM = new Color4(0.05, 0.2, 0.3, 1);
/** Cooling down: dim red; aimed at a target that reboots: amber. */
const EMPTY = new Color4(0.35, 0.03, 0.03, 1);
const BUSY = new Color4(1, 0.6, 0.1, 1);

interface LaserRt {
  def: LaserDef;
  meshes: InstancedMesh[];
  on: boolean;
  /** (sector-fixes P) Switched off for good by its `offFlag` (a release switch), refreshed in `applyJam`. */
  off: boolean;
  /** (sector-fixes P) The panel that powers it (null: none, always powered and never jammable). */
  panel: PanelRt | null;
}

/** (sector-fixes P) A laser power panel: its jam target, the lasers it powers, its meshes and status LED. */
interface PanelRt {
  def: LaserPanelDef;
  dv: DevRt;
  lasers: LaserRt[];
  meshes: InstancedMesh[];
  led: InstancedMesh | null;
  /** The LED state last shown (`panelLed`; -1 none yet). */
  ledK: number;
}

/** (sector-fixes P) Panel colours: housing, door, seams, conduit; the LED by state (dark, on, jammed, dim, rebooting). */
const PANEL_HOUSING = '#3b4248';
const PANEL_DOOR = '#4a535a';
const PANEL_SEAM = '#15191c';
const PANEL_CONDUIT = '#5d656c';
const PANEL_TAG = '#c9a227';
const LED_COL: readonly Color4[] = [new Color4(0.06, 0.06, 0.06, 1), new Color4(0.2, 1, 0.35, 1), ON, ON_DIM, BUSY];
/** The LED's glow (`pattern.w`, render only) by state: lit states glow, dark and the blink's dim half do not. */
const LED_GLOW: readonly number[] = [0, 0.55, 0.8, 0, 0.6];

/** (marlow-polish P3-1) A prop status lamp that follows a shared course flag (`PropPlacement.flag`, A6's interlock): render
 *  only, nothing in gameplay reads it. `on`: the state last put on the prop (-1 none yet, 0 off, 1 on). */
interface FlagLampRt {
  id: string;
  flag: string;
  on: number;
}

/** (marlow-jammer) One jam target: its pick record, its jam timeline and the device it drives. */
interface DevRt {
  t: JamTarget;
  d: DevJam;
  cam: CameraUnit | null;
  laser: LaserRt | null;
  light: LightDef | null;
  /** The phase last put on the device (a light's jam starts and ends on its changes). */
  lastPh: DevPhase;
  /** (fix round 1) Client: seconds since the mirror ran its own reboot down to idle (Infinity: it did not). */
  idleFor: number;
}

/** (marlow-jammer, item 8) Light kinds the jammer can switch off: fixed electric lamps. */
const JAM_LIGHT_KINDS: readonly string[] = ['lamp', 'spot'];

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
  /** (sector-fixes S) Is a shared (not per-player) course flag set? Non-allocating: the camera and laser `offFlag`
   *  checks run it every step / frame (falls back to `has`). */
  hasShared?(flag: string): boolean;
  /** (guard-ai S17, Michael's walk of 4.72 G1) A device was tripped at (x, y, z) (y NaN: the floor there): a laser's
   *  beam (its midpoint, `beamSpot`), a camera's alarm (where it saw someone). The guards' device incident, never the
   *  player's live position. `key`: the device (laser index; a camera `CAM_KEY` + its index). Called before the alarm
   *  stage rises (`record`), so the reinforcements it brings know the spot. Host only. */
  alertAt?(x: number, y: number, z: number, key: number): void;
}

/** (guard-ai S17) A camera's device key: `CAM_KEY` + its index (lasers use their index). */
export const CAM_KEY = 1000;

/**
 * The CT prototype devices (B3): the held pistol jammer, the security cameras it blinds and the laser devices.
 * `host`: runs the authority (jam state, laser touches, camera alarm) for the host and the one client. `client`: mirrors
 * it from the `course` message's `sec` field (cameras re-built locally from the map data and driven by the host's clock
 * and jam list, lasers as meshes) and sends its own jam intent as `jam` messages. Both read the local trigger.
 */
export class CtDevices {
  readonly cams: CameraUnit[] = [];
  readonly lasers: LaserRt[] = [];
  /** (sector-fixes P) The lasers' power panels (the lasers' jam targets). */
  private readonly panels: PanelRt[] = [];
  /** (P3-1) The props' flag lamps (`PropPlacement.device` + `flag`), one per device id. */
  private readonly flagLamps: FlagLampRt[] = [];
  /** The jam targets that are live (Sector Ops: only the live section's devices). */
  readonly targets: JamTarget[] = [];
  private readonly allTargets: JamTarget[] = [];
  /** (marlow-jammer) Every jam target's runtime (cameras, lights; sector-fixes P: the lasers' power panels) and by id. */
  private readonly devs: DevRt[] = [];
  private readonly devOf = new Map<string, DevRt>();
  /** (marlow-jammer) The jammer's HUD line (use left, cooldown) and its last text. */
  private hudEl: HTMLDivElement | null = null;
  private hudText = '';
  private hudKey = -1;
  /** Aim at a light that is switched off (not jammed): not a target. */
  private readonly skipPick = (t: JamTarget): boolean => {
    // (sector-fixes S) a camera its security console switched off is no target; an online camera is as before
    if (t.kind === 'camera') return this.flagOff.has(t.id);
    if (t.kind !== 'light') return false;
    const dv = this.devOf.get(t.id);
    const l = dv?.light;
    return !dv || !l || l.destroyed || (!l.on && dv.d.ph === DEV_IDLE);
  };
  private readonly losA = new Vector3();
  /** (jammer-fixes) The host's line-of-sight origin for the client's jam (`jamOrigin`). */
  private readonly eyeAt = { x: 0, y: 0, z: 0 };
  /** (jammer-fixes) A clear static line from a client's head to its claimed eye (`JAMMER.eyeSlack`). No allocation. */
  private readonly eyeClear = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean => {
    this.losA.set(ax, ay, az);
    this.losB.set(bx, by, bz);
    return this.g.ballistics.hitDistance(this.losA, this.losB, G.STATIC) >= hyp3(bx - ax, by - ay, bz - az) - JAMMER.eyeSlack;
  };
  private readonly losB = new Vector3();
  private lampT = 0;
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
  private time = 0;
  private want: [string, string] = ['', ''];
  private wantAt: [number, number] = [-9, -9];
  private lockId = '';
  private sentId = '';
  private sentT = 0;
  private camOff = new Set<string>();
  /** (sector-fixes S) Cameras off by their `offFlag` (a security console), refreshed in `applyJam`. */
  private readonly flagOff = new Set<string>();
  private cool: { t: number }[] = [{ t: 0 }, { t: 0 }];
  private alarmT = -99;
  /** (guard-ai S17) Scratch for a broken beam's spot (`beamSpot`). */
  private readonly spot = { x: 0, y: 0, z: 0 };
  private radioT = -99;
  private changed = true;
  /** (sector-fixes C, item 4) Night vision is on screen: the IR beams are drawn (render only). */
  private nv = false;
  private lamp: InstancedMesh | null = null;
  private zoneSet = new Set<string>();
  /** (marlow-final) Seconds the pass zones stay shut after a bay restart (`holdZones`). */
  private zoneHoldT = 0;

  /** (marlow-final) Shut the pass zones for `seconds` (a bay restart: the players are still at their old positions). */
  holdZones(seconds: number): void {
    this.zoneHoldT = Math.max(this.zoneHoldT, seconds);
  }
  /** (fix round 1) Per pass zone with a hallway rule: each player's hallway state (zone * 2 + player), its camera. */
  private hallRun = new Uint8Array(0);
  /** (fix round 2) Per zone and player: seconds left of the sent-back hold (`HALL_BACK_HOLD`, the client only). */
  private hallHold = new Float32Array(0);
  private hallCam: (CameraUnit | null)[] = [];
  /** (marlow-walk482 X6) Host: the hallway rules' cameras (`hallCameras`): the send-back is their only cost (`onCamera`). */
  private hallCamIds: ReadonlySet<string> = new Set<string>();
  private readonly backAt = new Vector3();
  /** (fix round 1) Players the hallway camera sent back (tests). */
  sendBacks = 0;
  private readonly p = new Vector3();
  private readonly dir = new Vector3();
  /** (B6; marlow-final N6) The paired scanners, one per `lay.scanners` entry whose two devices exist (both pages build
   *  the same list in the map's order: `SecWire.sc` is indexed by it). Empty on maps without them. */
  readonly scans: ScanRt[] = [];
  /** (B6) Failed scanner syncs (tests) and the last one's player and reason. */
  scanFails = 0;
  scanLast = '';
  private readonly glowAt = { x: 0, y: 0, z: 0 };
  /** (marlow-polish) The client's own ricochet spot and the sparks' direction (as the host's `ricoAt` / `ricoDown`). */
  private readonly ricoAt = new Vector3();
  private readonly ricoDown = new Vector3(0, -1, 0);
  /** (marlow-polish) The client's own rounds that sparked off a bulletproof housing (tests). */
  ricochets = 0;

  /**
   * (marlow-polish) Client: our own round from `a` to `b` through the mirrored cameras. When the nearest housing along
   * it is bulletproof, the host's ricochet (SecuritySystem.shotRay, GameState's `onRicochet`) plays here too: the sparks
   * and the impact sound at the lens. Local cosmetic only (the host still resolves the shot); no allocation.
   */
  ricochetRay(a: Vector3, b: Vector3): boolean {
    if (this.role !== 'client') return false;
    const c = nearestHousing(this.cams, a.x, a.y, a.z, b.x, b.y, b.z);
    if (!c || !c.def.bulletproof) return false;
    this.ricochets++;
    const at = this.ricoAt.set(c.x, c.y, c.z);
    this.g.vfx.sparks(at, this.ricoDown, 8);
    this.g.ballistics.onImpact?.(at, false);
    return true;
  }

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
    for (const c of this.cams) this.addDev({ id: c.def.id, kind: 'camera', x: c.x, y: c.y, z: c.z }, c, null, null);
    this.hallRun = new Uint8Array(this.zones.length * 2);
    this.hallHold = new Float32Array(this.zones.length * 2);
    this.hallCam = this.zones.map((z) => (z.hall && role === 'host' ? (this.cams.find((c) => c.def.id === z.hall!.camera) ?? null) : null));
    if (role === 'host') this.hallCamIds = hallCameras(this.zones);
    this.cueSeen = new Uint8Array(this.cams.length);
    if (this.cams.length > 0) {
      const b = g.ballistics;
      this.cue = new CameraCueView(g.scene, this.cams, (a, z, m) => b.hitDistance(a, z, m), g.app.quality.level.minimal);
    }
    // (sector-fixes P, A1) the lasers are no jam targets themselves: their power panels are (undo: an addDev per laser,
    // kind 'laser', at the band's middle, and `applyJam` reading that device's phase)
    for (const def of lay.lasers ?? []) this.lasers.push({ def, meshes: this.buildBeams(def), on: true, off: false, panel: null });
    const at = { x: 0, y: 0, z: 0 };
    for (const def of lay.laserPanels ?? []) {
      panelTarget(def, at);
      const dv = this.addDev({ id: def.id, kind: 'panel', x: at.x, y: at.y, z: at.z }, null, null, null);
      const p: PanelRt = { def, dv, lasers: [], meshes: [], led: null, ledK: -1 };
      for (const l of this.lasers) {
        if (!def.lasers.includes(l.def.id)) continue;
        l.panel = p;
        p.lasers.push(l);
      }
      this.buildPanel(p);
      this.panels.push(p);
    }
    // (marlow-polish P3-1) the props' status lamps on a shared course flag (A6's interlock): `applyJam` puts the flag on them
    for (const p of lay.facilityProps ?? []) {
      if (p.device === undefined || p.flag === undefined || this.flagLamps.some((f) => f.id === p.device)) continue;
      this.flagLamps.push({ id: p.device, flag: p.flag, on: -1 });
    }
    // (marlow-jammer, item 8) the map's fixed electric lamps are jam targets too (id `lt-<registry id>`, the same on both
    // pages: both build the level's lights in the same order)
    for (const l of g.world.level.lights.lights) {
      if (!l.electric || !JAM_LIGHT_KINDS.includes(l.kind)) continue;
      this.addDev({ id: `lt-${l.id}`, kind: 'light', x: l.x, y: l.y, z: l.z }, null, null, l);
    }
    for (const t of this.allTargets) this.targets.push(t);
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'hud-jammer';
    this.hudEl.style.cssText = 'position:absolute;left:50%;top:58%;transform:translateX(-50%);font:600 13px/1.2 sans-serif;letter-spacing:0.08em;color:#bfe9ff;text-shadow:0 1px 2px #000;pointer-events:none;display:none';
    g.hud.el.appendChild(this.hudEl);
    // (marlow-final N6) every scanner pair, not only the first
    const devs = lay.course?.devices;
    for (const sd of lay.scanners ?? []) {
      const da = devs?.[sd.a];
      const db = devs?.[sd.b];
      if (da && db) this.scans.push(this.buildScan(sd, da, db));
    }
    (window as unknown as { __ctdev?: unknown }).__ctdev = this;
  }

  private addDev(t: JamTarget, cam: CameraUnit | null, laser: LaserRt | null, light: LightDef | null): DevRt {
    const dv: DevRt = { t, d: newDevJam(), cam, laser, light, lastPh: DEV_IDLE, idleFor: Infinity };
    this.devs.push(dv);
    this.devOf.set(t.id, dv);
    this.allTargets.push(t);
    return dv;
  }

  /**
   * (sector-fixes P) A panel's meshes (render only, no collision: gameplay reads the jam point, never these): a box
   * housing on its wall, a door plate with its seam and hinge, a label strip, a conduit up and the status LED. The
   * housing parts are named `PANEL_PART` (electro paints them, gameState `paintElectro`); the LED keeps its own glow.
   */
  private buildPanel(p: PanelRt): void {
    const parts = this.g.world.parts;
    const def = p.def;
    // facing (sin yaw, cos yaw); the mesh's local +x after `rotation.y = yaw` is (cos yaw, -sin yaw)
    const fx = Math.sin(def.yaw);
    const fz = Math.cos(def.yaw);
    const put = (hex: string, name: string, lx: number, ly: number, lz: number, sx: number, sy: number, sz: number): InstancedMesh => {
      const m = parts.instance('box', hex, name);
      m.scaling.set(sx, sy, sz);
      m.position.set(def.x + fz * lx + fx * lz, def.y + ly, def.z - fx * lx + fz * lz);
      m.rotation.y = def.yaw;
      m.isPickable = false;
      p.meshes.push(m);
      return m;
    };
    const { w, h, d } = PANEL;
    put(PANEL_HOUSING, PANEL_PART, 0, 0, d / 2, w, h, d);
    put(PANEL_DOOR, PANEL_PART, 0, -0.01, d + 0.004, w - 0.06, h - 0.07, 0.008);
    put(PANEL_SEAM, PANEL_PART, w / 2 - 0.04, -0.01, d + 0.009, 0.006, h - 0.09, 0.004);
    put(PANEL_SEAM, PANEL_PART, -(w / 2 - 0.035), -0.01, d + 0.009, 0.012, h - 0.11, 0.004);
    put(PANEL_TAG, PANEL_PART, -0.04, -h / 4, d + 0.009, 0.14, 0.035, 0.004);
    put(PANEL_CONDUIT, PANEL_PART, -0.1, h / 2 + 0.15, d / 2, 0.05, 0.3, 0.05);
    p.led = put(PANEL_HOUSING, PANEL_LED_PART, w / 2 - 0.08, h / 2 - 0.07, d + 0.012, 0.03, 0.03, 0.014);
    this.showPanel(p);
  }

  /** (sector-fixes P) The panel's LED from its jam timeline (render only; only on a change: no per-step writes). */
  private showPanel(p: PanelRt): void {
    let allOff = p.lasers.length > 0;
    for (let i = 0; i < p.lasers.length && allOff; i++) allOff = p.lasers[i]!.off;
    const k = panelLed(p.dv.d.ph, p.dv.d.t, this.dead.has(p.def.id), allOff);
    if (k === p.ledK) return;
    p.ledK = k;
    const led = p.led;
    if (!led) return;
    led.instancedBuffers.color = LED_COL[k]!;
    const pt = led.instancedBuffers.pattern as Vector4 | undefined;
    if (pt) pt.w = LED_GLOW[k]!;
  }

  /** (B6; N6) A pair's runtime and its glows, placed on each panel's face from the device's position and yaw. */
  private buildScan(def: ScannerDef, da: CourseDevice, db: CourseDevice): ScanRt {
    const root = new TransformNode(`scanners-${def.id}`, this.g.scene);
    const glow: InstancedMesh[] = [];
    const ready: InstancedMesh[] = [];
    const at = this.glowAt;
    for (const d of [da, db]) {
      scanGlowAt(d.x, d.y, d.z, d.yaw, at);
      const s = addGlow(this.g.scene, root, at.x, at.y + SCAN_GLOW.state, at.z, 0.16);
      s.instancedBuffers.color = SC_COL[0]!;
      glow.push(s);
      const r = addGlow(this.g.scene, root, at.x, at.y + SCAN_GLOW.ready, at.z, 0.1);
      r.instancedBuffers.color = RDY_OFF;
      ready.push(r);
    }
    return { def, pos: [da.x, da.z, db.x, db.z], fy: [da.y, db.y], pair: newScanPair(), res: newScanResult(), occ: 0, glow, ready, root, radioT: -99 };
  }

  /** Is the player at the scanner panel `k` (alive, within reach, on the panel's floor)? */
  private atPanel(sc: ScanRt, k: number, r: PlayerRef): boolean {
    return r.target.alive && hyp2(sc.pos[k * 2]! - r.feet.x, sc.pos[k * 2 + 1]! - r.feet.z) <= SCANNER.reach && Math.abs(r.feet.y - sc.fy[k]!) < 1.5;
  }

  /** (N6) The first scanner pair (Marlow's station 6; tests and the old single-pair callers), null on maps without. */
  get scan(): ScanRt | null {
    return this.scans[0] ?? null;
  }

  /**
   * (B6) Host: player `p` used course device `cid`. Undefined when it is not a scanner; else a refusal or null. Validates
   * the player (alive, at that panel) and the panel (free, not the other one of a player already on it).
   */
  scanPress(cid: string, p: number): string | null | undefined {
    let sc: ScanRt | null = null;
    for (let i = 0; i < this.scans.length && !sc; i++) {
      const s = this.scans[i]!;
      if (cid === s.def.a || cid === s.def.b) sc = s;
    }
    if (!sc) return undefined;
    if (this.role !== 'host') return null;
    const k = cid === sc.def.a ? 0 : 1;
    const r = this.g.playerRefs()[p];
    if (!r || !this.atPanel(sc, k, r)) return 'Stand at the scanner';
    if (sc.pair.open) return null;
    const why = scanStart(sc.pair, k as 0 | 1, p, !!this.hooks.solo?.());
    if (!why) {
      this.changed = true;
      if (this.time - sc.radioT > 8 && sc.pair.ph[k === 0 ? 1 : 0] === SC_IDLE) {
        sc.radioT = this.time;
        this.hooks.say(`Scanner ${k === 0 ? 'A' : 'B'} hacking. Partner: start yours now, both must finish within ${SCANNER.window} s.`);
      }
    }
    return why;
  }

  /** (N6) Every scanner pair, each on its own. */
  private stepScans(dt: number, refs: PlayerRef[], n: number): void {
    for (let i = 0; i < this.scans.length; i++) this.stepScan(this.scans[i]!, dt, refs, n);
  }

  private stepScan(sc: ScanRt, dt: number, refs: PlayerRef[], n: number): void {
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
        this.p.set(sc.pos[0], sc.fy[0] + 1.4, sc.pos[1]);
        this.dir.set(0, 0, 1);
        if (dmg > 0) r.target.applyDamage({ amount: dmg, point: this.p, dir: this.dir, part: 'body', kind: 'melee', attackerTeam: 'enemy', attackerId: 'scanner', sourcePos: this.p, impulse: 0 });
      }
      this.hooks.say(res.why === 'abort' ? 'Scanner hack broken off. Both reset, and that one hurt. Stay at the panel.' : res.why === 'alone' ? 'The other scanner was never started. Both reset. Start your hacks together.' : `Scanners out of sync. Both reset, and that one hurt. Finish within ${SCANNER.window} s of each other.`);
    }
    this.scanVisuals(sc);
  }

  /** Both roles: the panel glows (state) and the ready glows (both players at their panels). */
  private scanVisuals(sc: ScanRt): void {
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
    // (sector-fixes P) a panel of a section that is not live is dark like its lasers, and no jam target
    for (const p of this.panels) if (p.def.section !== undefined && p.def.section !== section) this.dead.add(p.def.id);
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

  /**
   * (sector-redesign E6, EW10) A security desk's hold on its cameras (`DESK_*`: none, looped, off), both roles: the host
   * from `SectorDesks`, the client from the desk item's mirrored label. Applied at once when one changed. No allocation;
   * not per tick (a desk use, a loop's end, a section load, a label change).
   */
  setDesk(ids: readonly string[], mode: number): void {
    let changed = false;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      for (let k = 0; k < this.cams.length; k++) {
        const c = this.cams[k]!;
        if (c.def.id !== id || c.desk === mode) continue;
        c.desk = mode;
        changed = true;
      }
    }
    if (!changed) return;
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

  /**
   * (marlow-jammer, item 7) The nearest device being jammed now to (x, y, z), into out; false when nothing is jammed.
   * The jam buzz plays there on both pages (audio/jamBuzz.ts). No allocation.
   */
  nearestJammed(x: number, y: number, z: number, out: { x: number; y: number; z: number }): boolean {
    let best = Infinity;
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      if (dv.d.ph !== DEV_JAMMED) continue;
      const t = dv.t;
      const d = hyp3(t.x - x, t.y - y, t.z - z);
      if (d >= best) continue;
      best = d;
      out.x = t.x;
      out.y = t.y;
      out.z = t.z;
    }
    return best < Infinity;
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
      const i = pickJamTarget(this.targets, cam.x, cam.y, cam.z, f.x, f.y, f.z, JAMMER.range, JAMMER.cone, this.skipPick);
      if (i >= 0) pick = this.targets[i]!.id;
      else if (held && this.lockId) {
        // a held jam keeps its target through a small drift of the aim
        const k = this.devOf.get(this.lockId)?.t;
        if (k && this.targets.includes(k) && pickJamTarget([k], cam.x, cam.y, cam.z, f.x, f.y, f.z, JAMMER.range, JAMMER.cone * 2.5) === 0) pick = this.lockId;
      }
      // (marlow-jammer) only a target the aim has a clear line to: no jamming through walls
      if (pick && !this.clearLine(cam, pick)) pick = '';
    }
    this.localPick = pick;
    const want = held && pistol ? pick : '';
    this.lockId = want;
    this.lampT += dt;
    this.updateLamp(pistol);
    this.updateHud(pistol);
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
      // (jammer-fixes) the camera eye the aim was checked from goes with the claim: the host checks the same line
      this.g.net?.sendJam?.(want, g.player.cam.gamePos);
    }
  }

  /** A clear static line from the eye to the target (a hit within `JAMMER.losSlack` of it counts as clear). */
  private clearLine(eye: Vector3, id: string): boolean {
    return this.clearFrom(eye.x, eye.y, eye.z, id);
  }

  /** A clear static line from (x, y, z) to the target, `JAMMER.losSlack` of slack. No allocation. */
  private clearFrom(x: number, y: number, z: number, id: string): boolean {
    const t = this.devOf.get(id)?.t;
    if (!t) return false;
    this.losA.set(x, y, z);
    this.losB.set(t.x, t.y, t.z);
    const d = hyp3(t.x - x, t.y - y, t.z - z);
    return this.g.ballistics.hitDistance(this.losA, this.losB, G.STATIC) >= d - JAMMER.losSlack;
  }

  /** (marlow-jammer) The jammer's HUD line: shown while the pistol is out or a jam / cooldown runs. */
  private updateHud(pistol: boolean): void {
    const el = this.hudEl;
    if (!el) return;
    const s = this.jam[this.me];
    const dv = this.localPick ? this.devOf.get(this.localPick) : undefined;
    const show = pistol || s.active || s.cool > 0;
    const rec = dv?.d.ph === DEV_RECOVER;
    // (fix round 1) the text is only rebuilt when what it shows changes (kind and tenths): no string per frame
    const key = show ? jamHudKey(s, !!dv, rec) : 0;
    if (key === this.hudKey) return;
    this.hudKey = key;
    const text = key === 0 ? '' : jamHudText(s, !!dv, rec);
    if (text === this.hudText) return;
    this.hudText = text;
    el.textContent = text;
    el.style.display = text ? '' : 'none';
  }

  /** The client's intent (host side, from a `jam` message); `eye`: the client's camera eye it aimed from. */
  onRemoteJam(tgt: string, eye?: readonly [number, number, number]): void {
    let ok = tgt !== '' && this.targets.some((t) => t.id === tgt);
    // (fix round 1) the same static line of sight the client checks: a modified client cannot jam through walls.
    // (jammer-fixes) from the client's camera eye (where its aim was checked), taken only within `JAMMER.eyeTol` of its
    // head with a clear line between them (no eye through a wall); otherwise from its head. Runs per message (a change
    // or the heartbeat), no allocation
    if (ok) {
      const r = this.g.playerRefsInto(this.refTmp)[1];
      if (!r) ok = false;
      else {
        jamOrigin(r.feet.x + (r.peekX ?? 0), remoteHeadY(r.feet.y, r.crouched), r.feet.z + (r.peekZ ?? 0), eye, this.eyeClear, this.eyeAt);
        ok = this.clearFrom(this.eyeAt.x, this.eyeAt.y, this.eyeAt.z, tgt);
      }
    }
    this.want[1] = ok ? tgt : '';
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
    const s = this.jam[this.me];
    const busy = this.localPick !== '' && this.devOf.get(this.localPick)?.d.ph === DEV_RECOVER;
    this.lamp.instancedBuffers.color = s.active ? (((this.lampT * 8) | 0) % 2 === 0 ? ON : ON_DIM) : s.cool > 0 ? EMPTY : busy ? BUSY : this.localPick ? AIMED : IDLE;
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
      const dv = tgt !== '' ? this.devOf.get(tgt) : undefined;
      const s = this.jam[i]!;
      // a device that reboots cannot be jammed (A3); a jam keeps its own target (aiming at another one ends it)
      const ok = !!dv && !this.dead.has(tgt) && !this.flagOff.has(tgt) && dv.d.ph !== DEV_RECOVER && this.inReach(dv.t, r) && (!s.active || tgt === this.jamId[i]);
      const on = stepJam(s, ok, r.speed, dt);
      const id = on ? tgt : '';
      if (id !== this.jamId[i]) {
        this.jamId[i] = id as string;
        this.changed = true;
      }
    }
    for (let i = n; i < 2; i++) {
      stepJam(this.jam[i]!, false, 0, dt);
      if (this.jamId[i] !== '') {
        this.jamId[i] = '';
        this.changed = true;
      }
    }
    // each device's timeline: jammed while someone holds it, then its reboot / the light's off and flicker back
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      if (stepDevJam(dv.d, this.jammed(dv.t.id), dv.t.kind, dt)) this.changed = true;
    }
    this.applyJam();
    this.cue?.update(dt, this.g.vision.kind === 2);
    this.followVision();
    // laser breaks: the alarm, never damage (sector-fixes C, item 5)
    for (let i = 0; i < n; i++) this.touch(i, refs[i]!, dt);
    this.stepScans(dt, refs, n);
    // pass zones: both (or the solo player; N1: one player in an `any` zone) inside sets the flag; (B8) a bay restart
    // that cleared the flag re-arms it
    if (this.hooks.has) rearmZones(this.zoneSet, this.zones, this.hooks.has);
    // (marlow-final) just after a bay restart the players still stand where they were (the respawn waits 0.5 s and the
    // client's new position reaches the host later): no zone fires on those old positions
    if (this.zoneHoldT > 0) {
      this.zoneHoldT -= dt;
      return;
    }
    const solo = !!this.hooks.solo?.();
    for (let z = 0; z < this.zones.length; z++) {
      const zone = this.zones[z]!;
      if (this.zoneSet.has(zone.id)) continue;
      // (fix round 1) the hallway rule runs until the zone is passed (then the station is done)
      const hall = zone.hall;
      if (hall) this.stepHall(z, zone, hall, refs, n, dt);
      let inside = 0;
      for (let i = 0; i < n; i++) {
        const r = refs[i]!;
        // (fix round 1) a player still running the camera hallway does not count; (fix round 2) nor one sent back
        // who has not been seen in the entry lobby since
        if (hall && this.hallRun[z * 2 + i] !== HALL_IDLE) continue;
        if (r.target.alive && inBox(zone.box, r.feet.x, r.feet.z) && Math.abs(r.feet.y - (zone.floorY ?? 0)) < 1) inside++;
      }
      if (inside >= passZoneNeed(zone.any, n, solo)) {
        this.zoneSet.add(zone.id);
        this.hallRun[z * 2] = this.hallRun[z * 2 + 1] = 0;
        this.hallHold[z * 2] = this.hallHold[z * 2 + 1] = 0;
        this.hooks.flag?.(zone.flag);
      }
    }
  }

  /**
   * (marlow-jammer fix round 1, Michael item 5) The camera hallway's hard rule (`hallStep`): a player its camera has
   * while in the hallway (or still running in the far lobby) goes back to the entry lobby's spot. The host moves its
   * own player; the client's goes through the co-op layer (`sendBack`: a `back` event). A hall camera raises no alarm
   * stage and no guard alert (marlow-walk482 X6, `onCamera`): the send-back is the only cost.
   */
  private stepHall(z: number, zone: PassZone, hall: HallRule, refs: PlayerRef[], n: number, dt: number): void {
    const cam = this.hallCam[z] ?? null;
    const fy = zone.floorY ?? 0;
    for (let i = 0; i < n; i++) {
      const r = refs[i]!;
      const k = z * 2 + i;
      const hold = Math.max(0, this.hallHold[k]! - dt);
      this.hallHold[k] = hold;
      if (!r.target.alive) continue;
      const level = Math.abs(r.feet.y - fy) < 1;
      const inLobby = level && inBox(hall.lobby, r.feet.x, r.feet.z);
      const inHall = level && inBox(hall.box, r.feet.x, r.feet.z);
      const inFar = level && inBox(zone.box, r.feet.x, r.feet.z);
      const m = cam ? cam.meters.get(r.id) : undefined;
      const st = hallStep(this.hallRun[k]!, inLobby, inHall, inFar, m ? m.stage : 0, hold > 0);
      if (st !== HALL_BACK) {
        this.hallRun[k] = st;
        continue;
      }
      // (fix round 2) sent back: not counted until seen in the entry lobby; the client's copy takes stale positions
      // (sent before the `back` event reached it) for HALL_BACK_HOLD, so its reports count only after that
      this.hallRun[k] = HALL_SENT;
      this.hallHold[k] = i === 0 ? 0 : HALL_BACK_HOLD;
      // the camera forgets them (a fresh run starts from an empty meter)
      if (m) {
        m.meter = m.full = m.stage = 0;
        m.sinceSeen = 99;
      }
      const bx = hall.back[0];
      const bz = hall.back[1];
      const yaw = hall.back[2];
      this.sendBacks++;
      this.changed = true;
      this.hooks.say(hall.say);
      if (i === 0) {
        const g = this.g;
        g.team.end(true);
        g.traversal.reset();
        g.player.controller.override = null;
        g.player.controller.teleport(this.backAt.set(bx, fy, bz), yaw);
        g.player.cam.yaw = yaw;
      } else this.g.net?.sendBack?.(r.id, bx, fy, bz, yaw);
    }
  }

  /** The player is near enough to the target (the aim itself is the client's; the host bounds the claim). */
  private inReach(t: JamTarget, r: PlayerRef): boolean {
    return hyp3(t.x - r.feet.x, t.y - r.feet.y - 1.5, t.z - r.feet.z) <= JAMMER.range + 3;
  }

  private jammed(id: string): boolean {
    return this.jamId[0] === id || this.jamId[1] === id;
  }

  /**
   * Put the jam timelines on the devices (both roles). A jammed or rebooting camera is blind (mode off: no grid, no
   * meter) and frozen (its sweep stops), its LED flashing while jammed; a laser whose power panel is jammed or rebooting
   * is off, the panel's LED showing it (sector-fixes P); a jammed light follows `lightLit` in the registry, which the bake, the light meter and the guards read (light parity).
   */
  private applyJam(): void {
    const shared = this.hooks.hasShared ?? this.hooks.has;
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      const c = dv.cam;
      if (!c) continue;
      const id = c.def.id;
      const ph = dv.d.ph;
      c.frozen = ph !== DEV_IDLE;
      c.jam = ph;
      c.jamT = dv.d.t;
      // (sector-fixes S) switched off at its security console: off like a dead device until the bay restart clears it
      const fOff = cameraOff(c.def, shared);
      if (fOff) this.flagOff.add(id);
      else this.flagOff.delete(id);
      // (sector-redesign E6) a security desk's loop (blind, still sweeping) or off sits under the other blinding; a jam
      // or a dead device switches it off
      let want = deskCamMode(ph !== DEV_IDLE || this.dead.has(id), c.desk);
      // (marlow-final N3) a course console loops the feed ('looped', blind) unless something already switched it off
      if (fOff && want === 'online') want = consoleCamMode();
      if (want === 'off') {
        if (c.mode === 'online' || c.mode === 'looped') {
          c.setMode('off');
          this.camOff.add(id);
        }
      } else if (c.mode === 'destroyed') {
        this.camOff.delete(id);
      } else if (c.mode !== want && (c.mode !== 'off' || this.camOff.has(id))) {
        this.camOff.delete(id);
        c.setMode(want);
      }
    }
    for (let i = 0; i < this.lasers.length; i++) {
      const l = this.lasers[i]!;
      l.off = l.def.offFlag !== undefined && !!shared?.(l.def.offFlag);
      // (sector-fixes P) powered by its panel: off while the panel is jammed or rebooting
      const on = laserLive(l.panel ? l.panel.dv.d.ph : -1, this.dead.has(l.def.id), l.off);
      if (on === l.on) continue;
      l.on = on;
      this.showLaser(l);
      // (S3-7 S1, light parity) the beam towers' lenses follow their laser (dark while jammed, rebooting, off or dead); render only
      this.g.world.facilityProps?.setDevice(l.def.id, on);
    }
    // (marlow-polish P3-1) a flag lamp shows its shared flag (on = set), on both roles from the same course flags; only on
    // a change (the first pass always); render only
    for (let i = 0; i < this.flagLamps.length; i++) {
      const f = this.flagLamps[i]!;
      const on = shared?.(f.flag) ? 1 : 0;
      if (on === f.on) continue;
      f.on = on;
      this.g.world.facilityProps?.setDevice(f.id, on === 1);
    }
    for (let i = 0; i < this.panels.length; i++) this.showPanel(this.panels[i]!);
    const reg = this.g.world.level.lights;
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      const l = dv.light;
      if (!l) continue;
      const was = dv.lastPh;
      dv.lastPh = dv.d.ph;
      // (jammer-fixes) the registry keeps the switches' / EMP's state under the jam: back from a jam the light takes
      // that state as it is now (a group switched off meanwhile stays off), on the host and the client alike
      applyJamLight(reg, l.id, dv.d, was);
    }
  }

  /** (sector-fixes C, item 4) Night vision on or off: the IR beams follow it (render only, every fixed step / frame). */
  private followVision(): void {
    const nv = this.g.vision.night === 1;
    if (nv === this.nv && !nv) return;
    this.nv = nv;
    // while night vision is on, re-assert every step: leaving electro (the CT cycle's electro -> night) zeroes the
    // `pattern.w` of every mesh named 'laser' in gameState's `paintElectro` after this step ran (a few beams: no cost)
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
      if (show && pt && pt.w !== BEAM_NV_GLOW) pt.w = BEAM_NV_GLOW;
    }
  }

  private touch(i: number, r: PlayerRef, dt: number): void {
    let hit: LaserRt | null = null;
    let hk = -1;
    if (r.target.alive) {
      const h = r.crouched ? LASER.crouchHeight : LASER.standHeight;
      for (let k = 0; k < this.lasers.length && !hit; k++) {
        const l = this.lasers[k]!;
        if (l.on && laserTouch(l.def, r.feet.x, r.feet.y, r.feet.z, h)) {
          hit = l;
          hk = k;
        }
      }
    }
    if (!laserCooldown(this.cool[i]!, dt, hit !== null) || !hit) return;
    // (sector-fixes C, item 5) a break sets off the alarm on the camera's path; it never hurts (no damage path)
    this.hits++;
    const l = hit.def;
    // (guard-ai S17, G1) the guards hear of the beam (its midpoint), not of the player: first, so the alarm's
    // reinforcements know the spot
    if (this.hooks.alertAt) {
      const sp = beamSpot(l, this.spot);
      this.hooks.alertAt(sp.x, sp.y, sp.z, hk);
    }
    const raised = this.raiseAlarm(`${l.label ?? 'Laser'} tripped`);
    if (this.time - this.radioT > 6) {
      this.radioT = this.time;
      this.hooks.say(raised ? `${l.label ?? 'Laser'} tripped: alarm stage ${this.alarm}. Jam its power panel (electro shows it).` : `${l.label ?? 'Laser'} tripped again. Night vision shows the beams.`);
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
    // (marlow-walk482 X6, Michael: "It's a training exercise, the guard should be non hostile and not respond to you being
    // detected on the camera") a hallway rule's camera only sends the player back (`stepHall`): no device alert, no alarm
    if (this.hallCamIds.has(e.camera)) return;
    // (guard-ai S17, G3) the guards hear of where the camera saw someone (a sighting then, not his live position):
    // first, so the alarm's reinforcements know the spot
    // (guard-ai walk 4.82 item 6) not a training camera's (`CameraDevice.guardResponse` false): no guard response
    if (this.hooks.alertAt) {
      let ci = 0;
      while (ci < this.cams.length && this.cams[ci]!.def.id !== e.camera) ci++;
      const cam = this.cams[ci];
      if (!cam || cameraAlertsGuards(cam.def)) this.hooks.alertAt(e.x, Number.NaN, e.z, CAM_KEY + ci);
    }
    // full awareness: the alarm stage goes up one (G125: escalating, it never ends the run)
    if (!this.raiseAlarm('A camera has you')) return;
    this.hooks.say(`Camera alert, stage ${this.alarm}. It keeps watching until someone jams it.`);
  }

  /** Host: the field for the `course` message. */
  wire(): SecWire {
    const dv: [string, number, number][] = [];
    for (const d of this.devs) if (d.d.ph !== DEV_IDLE) dv.push([d.t.id, d.d.ph, Math.round(d.d.t * 100) / 100]);
    return {
      ck: this.cams.map((c) => Math.round(c.clock * 1000) / 1000),
      j: [this.jamId[0], this.jamId[1]],
      ch: [Math.round(jamLeft(this.jam[0]) * 100) / 100, Math.round(jamLeft(this.jam[1]) * 100) / 100],
      cd: [Math.round(this.jam[0].cool * 100) / 100, Math.round(this.jam[1].cool * 100) / 100],
      dv,
      al: this.alarm,
      ...(this.scans.length > 0 ? { sc: this.scans.map((s) => packScan(s.pair, s.occ)) } : {}),
    };
  }

  // ---- client mirror ----

  /** Client: the host's device state. */
  apply(s: SecWire): void {
    this.jamId[0] = s.j[0] ?? '';
    this.jamId[1] = s.j[1] ?? '';
    for (let k = 0; k < 2; k++) {
      const st = this.jam[k as 0 | 1];
      st.active = s.j[k] !== '';
      st.use = st.active ? JAMMER.useMax - s.ch[k]! : 0;
      st.cool = s.cd[k]!;
    }
    // the devices' timelines: those listed take the host's phase and time, the rest are idle; (fix round 1) only ever
    // forward: a late host reboot the mirror already ran down is dropped (`mirrorDevJam`: no blink back into it)
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      let ph: DevPhase = DEV_IDLE;
      let t = 0;
      for (let j = 0; j < s.dv.length; j++) {
        const e = s.dv[j]!;
        if (e[0] !== dv.t.id) continue;
        ph = e[1] === DEV_JAMMED ? DEV_JAMMED : DEV_RECOVER;
        t = e[2];
        break;
      }
      const was = dv.d.ph;
      if (mirrorDevJam(dv.d, ph, t, dv.idleFor) && (ph !== DEV_IDLE || was !== DEV_IDLE)) dv.idleFor = Infinity;
    }
    this.alarm = s.al;
    // (N6) one entry per pair, in the same order on both pages
    const scw = s.sc;
    if (scw) {
      for (let i = 0; i < this.scans.length && i < scw.length; i++) {
        const sc = this.scans[i]!;
        sc.occ = unpackScan(scw[i]!, sc.pair);
        this.scanVisuals(sc);
      }
    }
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      const ck = s.ck[i];
      if (ck === undefined) continue;
      c.clock = ck;
      c.yaw = sweepYaw(c.def, ck);
    }
    this.applyJam();
  }

  /** Client, per frame: the cameras keep turning between the host's clock updates. */
  frame(dt: number): void {
    if (this.role !== 'client') return;
    // the host's timelines run on between its messages: the jams, the cooldowns, the reboots and the light flickers
    for (let k = 0; k < 2; k++) {
      const st = this.jam[k as 0 | 1];
      if (st.active) st.use = Math.min(JAMMER.useMax, st.use + dt);
      else if (st.cool > 0) st.cool = Math.max(0, st.cool - dt);
    }
    for (let k = 0; k < this.devs.length; k++) {
      const dv = this.devs[k]!;
      const rec = dv.d.ph === DEV_RECOVER;
      advanceDevJam(dv.d, dv.t.kind, dt);
      if (rec && dv.d.ph === DEV_IDLE) dv.idleFor = 0;
      else if (dv.d.ph === DEV_IDLE && dv.idleFor < Infinity) dv.idleFor += dt;
    }
    this.applyJam();
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
      n = 1;
    }
    n += g.net?.partnerBodies?.(this.bodies, n) ?? 0;
    for (let i = 0; i < this.cams.length; i++) {
      const c = this.cams[i]!;
      let s = 0;
      for (let k = 0; k < n && s === 0; k++) {
        const b = this.bodies[k]!;
        if (seenAt(cameraSight(c, b.head, b.crouched, b.speed, g.ballistics))) s = 1;
      }
      this.cueSeen[i] = s;
    }
  }

  /** Test view (`window.__ctdev.debug()`). */
  debug(): Record<string, unknown> {
    return {
      role: this.role,
      jam: [...this.jamId],
      left: [jamLeft(this.jam[0]), jamLeft(this.jam[1])],
      cool: [this.jam[0].cool, this.jam[1].cool],
      hud: this.hudText,
      devs: this.devs.filter((d) => d.d.ph !== DEV_IDLE).map((d) => ({ id: d.t.id, kind: d.t.kind, ph: d.d.ph, t: d.d.t, on: d.light ? d.light.on : undefined })),
      lights: this.devs.filter((d) => d.light).map((d) => ({ id: d.t.id, x: d.t.x, y: d.t.y, z: d.t.z, on: d.light!.on })),
      alarm: this.alarm,
      hits: this.hits,
      sendBacks: this.sendBacks,
      // (fix round 2) each zone's hallway state per player (0 idle, 1 running, 3 sent back) and the sent-back hold
      hall: [...this.hallRun],
      hallHold: [...this.hallHold],
      pick: this.localPick,
      cams: this.cams.map((c) => ({ id: c.def.id, mode: c.mode, yaw: c.yaw, pitch: c.pitch, range: c.range, clock: c.clock, frozen: c.frozen, jam: c.jam, live: this.live(c.def.id), stage: [...c.meters.values()].map((m) => m.stage), meter: [...c.meters.values()].map((m) => m.meter) })),
      lasers: this.lasers.map((l) => ({ id: l.def.id, on: l.on, live: this.live(l.def.id), panel: l.panel?.def.id ?? '' })),
      // (sector-fixes P) each power panel: its jam phase (0 idle, 1 jammed, 2 rebooting), LED (laserPanels LED_*), lasers
      panels: this.panels.map((p) => ({ id: p.def.id, ph: p.dv.d.ph, t: p.dv.d.t, led: p.ledK, live: this.live(p.def.id), lasers: p.lasers.map((l) => l.def.id), at: [p.dv.t.x, p.dv.t.y, p.dv.t.z] })),
      // (P3-1) each flag lamp's state last put on its prop
      flagLamps: this.flagLamps.map((f) => ({ id: f.id, on: f.on === 1 })),
      live: this.liveSection,
      range: CAMERA.range,
      cue: this.cue?.debug() ?? [],
      scan: this.scanDebug(),
      // (N6) every pair, in the map's order
      scans: this.scans.map((_s, i) => this.scanDebug(i)),
    };
  }

  /** (B6) Scanner pair `i`'s state for tests (null when there is no such pair; default the first). */
  scanDebug(i = 0): Record<string, unknown> | null {
    const sc = this.scans[i];
    if (!sc) return null;
    const pr = sc.pair;
    return {
      id: sc.def.id,
      flag: sc.def.flag,
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
    for (const sc of this.scans) sc.root.dispose();
    this.scans.length = 0;
    this.view?.dispose();
    this.cue?.dispose();
    this.cue = null;
    for (const l of this.lasers) for (const m of l.meshes) m.dispose();
    for (const p of this.panels) for (const m of p.meshes) m.dispose();
    this.panels.length = 0;
    this.lasers.length = 0;
    this.lamp?.dispose();
    this.lamp = null;
    this.hudEl?.remove();
    this.hudEl = null;
    if (this.g.security) this.g.security.onEvent = null;
    const w = window as unknown as { __ctdev?: unknown };
    if (w.__ctdev === this) delete w.__ctdev;
  }
}
