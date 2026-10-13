/**
 * ON12: security devices in the editor (pure, Babylon-free; tests/editor/security.test.ts). The records are the security
 * file's (docs/kestrel/kestrel.security.json, S0-security-spec.md section 6, schema.md section 4): cameras (fixed and
 * pan), card readers and keypads, PIR motion sensors and infrared beams. Placing them (a wall face or a ceiling; a reader
 * snaps to a door and fills ON9's door `reader` and `level`), the model link that keeps a reader's door in step, what a
 * camera sees (the game's own frame test `inFrame` from src/security/camera.ts and perception's `losClear` ray test,
 * the guard view's sight code), sensor fans, the coverage and its gaps, the card's rows and steps, the words, and the
 * file split (the devices ride in the editing document like the play file's records). Other S0 kinds in the file (desk,
 * panel, mantrap, iris, fault) are kept as they are.
 */
import { CAMERA } from '../config/security';
import { losClear } from '../ai/perception';
import { inFrame } from '../security/camera';
import { hyp2 } from '../core/mathx';
import { fmt, roomAt, snap, wallDir } from './geometry';
import { buildingAt } from './visibility';
import { ceilingOf, faceAt, lampLevel, openingAt } from './lamps';
import type { Lamp, LampData } from './lamps';
import { nextId } from './mission';
import { BODY_HEIGHT, band, cellCentre } from './lightPreview';
import type { CellGrid } from './lightPreview';
import { LEVELS } from './openingCatalogue';
import type { DoorData } from './openingCatalogue';
import { DEVICE_SIZES, READER_TYPES, SF, secTool } from './securityCatalogue';
import type { SecTool } from './securityCatalogue';
import type { Change } from './model';
import type { Campus, Elem, Obj, Opening, Pt } from './types';

const DEG = Math.PI / 180;
const EPS = 1e-6;
const r2 = (v: number): number => Math.round(v * 100) / 100;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const norm360 = (a: number): number => ((Math.round(a) % 360) + 360) % 360;
const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;

// ---------- records ----------

export interface DeviceBase {
  id: string;
  kind: string;
  level: string;
  room: string;
  reason: string;
  name?: string;
  minPlayers?: number;
  [k: string]: unknown;
}
export interface Camera extends DeviceBase {
  kind: 'camera';
  at: [number, number];
  y: number;
  facing: number;
  /** Pan camera: the two yaws (deg) it sweeps between. */
  sweep?: [number, number];
  /** ON12: on a wall face or under a ceiling. */
  mount: 'wall' | 'ceiling';
  /** ON12: the security desk object (objects[], preset security-desk) whose monitor shows it, and the monitor. */
  desk?: string;
  monitor?: number;
}
export interface Reader extends DeviceBase {
  kind: 'reader';
  at: [number, number];
  y: number;
  facing: number;
  door?: string;
  accessLevel: number;
  building: string;
  /** ON12: card, card-pin or keypad (ON9's door reader ids); `pin` true for the last two (S0 2.3). */
  reader: 'card' | 'card-pin' | 'keypad';
  pin?: boolean;
}
export interface Pir extends DeviceBase {
  kind: 'pir';
  at: [number, number];
  y: number;
  facing: number;
  mount: 'wall' | 'ceiling';
  /** The motion lamp it turns on (S0 2.6), or `alarm` (ON12: it reports to the desk instead). */
  lamp?: string;
  alarm?: boolean;
}
export interface Beam extends DeviceBase {
  kind: 'beam';
  a: [number, number, number];
  b: [number, number, number];
  /** ON12: drawn (a visible beam) or only with night vision (S0 section 3); every beam reports to the desk. */
  visible: boolean;
}
export type Device = Camera | Reader | Pir | Beam | DeviceBase;

export type SecData = Pick<Campus, 'meta' | 'levels' | 'rooms' | 'walls' | 'openings'> & { objects?: Obj[]; lamps?: Lamp[]; devices?: Device[] };

export const isCamera = (d: Device): d is Camera => d.kind === 'camera';
export const isReader = (d: Device): d is Reader => d.kind === 'reader';
export const isPir = (d: Device): d is Pir => d.kind === 'pir';
export const isBeam = (d: Device): d is Beam => d.kind === 'beam';

const PREFIX: Record<string, string> = { camera: 'CAM', reader: 'RD', pir: 'PIR', beam: 'BM' };
export const deviceId = (d: SecData, kind: string): string => nextId(d.devices, PREFIX[kind] ?? 'DV');

/** A device's plan point (a beam: its middle). */
export function deviceCentre(e: Device): Pt {
  if (isBeam(e)) return [(e.a[0] + e.b[0]) / 2, (e.a[2] + e.b[2]) / 2];
  const at = e.at as [number, number] | undefined;
  return at ? [at[0], at[1]] : [0, 0];
}

export function moveDevice<T extends Device>(e: T, dx: number, dz: number): T {
  const c = clone(e) as Device;
  if (isBeam(c)) {
    c.a = [r2(c.a[0] + dx), c.a[1], r2(c.a[2] + dz)];
    c.b = [r2(c.b[0] + dx), c.b[1], r2(c.b[2] + dz)];
  } else if (Array.isArray(c.at)) c.at = [r2((c.at as number[])[0]! + dx), r2((c.at as number[])[1]! + dz)];
  return c as T;
}

export const floorOf = (d: Pick<Campus, 'levels'>, level: string): number => d.levels.find((l) => l.id === level)?.floor ?? 0;

/** Ceiling height over a point on a level (its room's ceiling, else the level height less the slab), or null outdoors. */
function ceilingAt(d: SecData, level: string, x: number, z: number): number | null {
  const r = roomAt(d.rooms, level, x, z);
  if (!r || r.kind === 'yard' || r.kind === 'lane') return null;
  return ceilingOf(d, r);
}

/** Yaw (degrees) out of a wall face: +x 90, -x 270, +z 0, -z 180. */
const faceYaw = (axis: 0 | 1, n: 1 | -1): number => (axis === 0 ? (n > 0 ? 90 : 270) : n > 0 ? 0 : 180);

/** The default reason (S0: why a real operator put it there), editable in the side panel. */
function reasonOf(kind: string, room: string, extra = ''): string {
  const where = room || 'outside';
  if (kind === 'camera') return `watches ${where}${extra}`;
  if (kind === 'reader') return extra ? `controls ${extra}` : `access point in ${where}`;
  if (kind === 'pir') return `motion sensor in ${where}${extra}`;
  return `intruder beam across ${where}`;
}

// ---------- placing ----------

export interface Placed<T> {
  dev: T | null;
  why: string | null;
  /** Words for the dot: where it goes. */
  words: string;
}

/** A camera at the dot: on a wall face within facts light.wallReach (facing out of it), else under the ceiling. */
export function placeCamera(d: SecData, level: string, x: number, z: number, yaw: number, pan: boolean, grid: number): Placed<Camera> {
  const face = faceAt(d.walls, level, x, z);
  const lift = SF.cameraMountDefault.value;
  let at: [number, number];
  let facing: number;
  let mount: Camera['mount'];
  if (face) {
    const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, grid)));
    const across = r2(face.pos + face.n * (DEVICE_SIZES.camera.w / 2));
    at = face.axis === 0 ? [across, s] : [s, across];
    facing = faceYaw(face.axis, face.n);
    mount = 'wall';
  } else {
    at = [r2(snap(x, grid)), r2(snap(z, grid))];
    facing = norm360(yaw);
    mount = 'ceiling';
  }
  const ceil = ceilingAt(d, level, at[0], at[1]);
  if (mount === 'ceiling' && ceil === null) return { dev: null, why: 'Outside: a camera goes on a wall face here (move onto one)', words: '' };
  const top = ceil === null ? SF.cameraMountMax.value : Math.min(ceil - DEVICE_SIZES.camera.h, SF.cameraMountMax.value);
  if (top < SF.cameraMountMin.value - EPS) return { dev: null, why: `The ceiling (${fmt(ceil ?? 0)} m) is under the camera mount range ${SF.cameraMountMin.value}-${SF.cameraMountMax.value} m (SN04)`, words: '' };
  // (rounded down to 0.1 m: the housing stays under the ceiling)
  const y = Math.floor((mount === 'ceiling' ? top : Math.min(lift, top)) * 10 + 1e-6) / 10;
  const room = roomAt(d.rooms, level, at[0], at[1])?.id ?? '';
  const c: Camera = { id: '', kind: 'camera', level, at, y, facing, mount, room, reason: reasonOf('camera', room) };
  if (pan) c.sweep = sweepAround(facing, SF.cameraSweepDefault.value);
  return { dev: c, why: null, words: `${pan ? 'a pan camera' : 'a camera'} ${mount === 'wall' ? `on ${face!.id}` : 'under the ceiling'}, ${fmt(y)} m up, facing ${facing} degrees` };
}

/** A sweep of `span` degrees centred on `facing`. */
export const sweepAround = (facing: number, span: number): [number, number] => [facing - span / 2, facing + span / 2];
export const sweepSpan = (c: Pick<Camera, 'sweep'>): number => (c.sweep ? Math.abs(c.sweep[1] - c.sweep[0]) : 0);

/**
 * A reader at the dot: by a door (within facts light.openingReach of its middle) it snaps beside the door on the dot's
 * side and binds to it; else on a wall face alone. Its level is the door's card level (else 1).
 */
export function placeReader(d: SecData, level: string, x: number, z: number, tool: SecTool, grid: number): Placed<Reader> {
  const type = tool === 'keypad' ? 'keypad' : 'card';
  const near = openingAt(d as LampData, level, x, z);
  const y = SF.readerHeight.value;
  if (near && near.o.type !== 'window' && !/window|glass-wall/.test(near.o.type)) {
    const { o, w, mid } = near;
    const dir = wallDir(w);
    const nx = -dir[1];
    const nz = dir[0];
    const side = (x - mid[0]) * nx + (z - mid[1]) * nz >= 0 ? 1 : -1;
    const alongSide = (x - mid[0]) * dir[0] + (z - mid[1]) * dir[1] >= 0 ? 1 : -1;
    const along = o.w / 2 + DEVICE_SIZES.reader.w + 0.1;
    const off = w.t / 2 + DEVICE_SIZES.reader.d / 2;
    const at: [number, number] = [r2(mid[0] + dir[0] * along * alongSide + nx * off * side), r2(mid[1] + dir[1] * along * alongSide + nz * off * side)];
    const facing = norm360(Math.atan2(nx * side, nz * side) / DEG);
    const room = roomAt(d.rooms, level, at[0] + nx * side * 0.3, at[1] + nz * side * 0.3)?.id ?? '';
    const lv = (o.door as DoorData | undefined)?.level;
    const r: Reader = { id: '', kind: 'reader', level, at, y, facing, door: o.id, accessLevel: typeof lv === 'number' && lv > 0 ? lv : 1, building: buildingOf(d, at), reader: type, room, reason: reasonOf('reader', room, `door ${o.id}`) };
    if (type === 'keypad') r.pin = true;
    return { dev: r, why: null, words: `a ${type === 'keypad' ? 'keypad' : 'card reader'} for door ${o.id}, level ${r.accessLevel}` };
  }
  const face = faceAt(d.walls, level, x, z);
  if (!face) return { dev: null, why: 'Move onto a door or a wall face', words: '' };
  const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, grid)));
  const across = r2(face.pos + face.n * (DEVICE_SIZES.reader.d / 2));
  const at: [number, number] = face.axis === 0 ? [across, s] : [s, across];
  const room = roomAt(d.rooms, level, at[0], at[1])?.id ?? '';
  const r: Reader = { id: '', kind: 'reader', level, at, y, facing: faceYaw(face.axis, face.n), accessLevel: 1, building: buildingOf(d, at), reader: type, room, reason: reasonOf('reader', room) };
  if (type === 'keypad') r.pin = true;
  return { dev: r, why: null, words: `a ${type === 'keypad' ? 'keypad' : 'card reader'} alone on ${face.id}` };
}

/** The building a point is in (A or B), else the first building (a reader outside still belongs to a site). */
function buildingOf(d: SecData, at: Pt): string {
  const b = buildingAt(d.meta.buildings, at[0], at[1]);
  return b === 'site' ? (d.meta.buildings?.[0]?.id ?? 'A') : b;
}

/** A PIR at the dot: on a wall face (facing out, facts security.pirWallHeight) or under the ceiling; linked to the nearest motion lamp in range, else the alarm. */
export function placePir(d: SecData, level: string, x: number, z: number, grid: number): Placed<Pir> {
  const face = faceAt(d.walls, level, x, z);
  let at: [number, number];
  let facing = 0;
  let mount: Pir['mount'] = 'ceiling';
  let y: number;
  if (face) {
    const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, grid)));
    const across = r2(face.pos + face.n * (DEVICE_SIZES.pir.d / 2));
    at = face.axis === 0 ? [across, s] : [s, across];
    facing = faceYaw(face.axis, face.n);
    mount = 'wall';
    y = SF.pirWallHeight.value;
  } else {
    at = [r2(snap(x, grid)), r2(snap(z, grid))];
    const c = ceilingAt(d, level, at[0], at[1]);
    if (c === null) return { dev: null, why: 'Outside: a motion sensor goes on a wall face here (move onto one)', words: '' };
    y = Math.floor((c - DEVICE_SIZES.pir.h) * 10 + 1e-6) / 10;
  }
  const room = roomAt(d.rooms, level, at[0], at[1])?.id ?? '';
  const p: Pir = { id: '', kind: 'pir', level, at, y, facing, mount, room, reason: reasonOf('pir', room) };
  const lamp = pirLamps(d, p)[0];
  if (lamp) p.lamp = lamp.id;
  else p.alarm = true;
  return { dev: p, why: null, words: `a motion sensor ${mount === 'wall' ? `on ${face!.id}` : 'under the ceiling'}, linked to ${p.lamp ? `lamp ${p.lamp}` : 'the alarm'}` };
}

/** Motion (PIR) lamps on the sensor's level within facts security.pirRange, nearest first. */
export function pirLamps(d: SecData, p: Pick<Pir, 'level' | 'at'>): Lamp[] {
  const out: { l: Lamp; dist: number }[] = [];
  for (const l of d.lamps ?? []) {
    if (!l.motion || lampLevel(d as LampData, l) !== p.level) continue;
    const dist = hyp2(l.at[0] - p.at[0], l.at[2] - p.at[1]);
    if (dist <= SF.pirRange.value + EPS) out.push({ l, dist });
  }
  return out.sort((a, b) => a.dist - b.dist).map((q) => q.l);
}

/** A beam end at the dot: on a wall face within reach (snapped onto it), else a free post. */
export function beamEnd(d: SecData, level: string, x: number, z: number, grid: number): { p: Pt; wall: string | null } {
  const face = faceAt(d.walls, level, x, z);
  if (!face) return { p: [r2(snap(x, grid)), r2(snap(z, grid))], wall: null };
  const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, grid)));
  const across = r2(face.pos);
  return { p: face.axis === 0 ? [across, s] : [s, across], wall: face.id };
}

/** The heights a beam may have (SN40, SN41), stepped by the editor grid, low first. */
export function beamHeights(step = 0.1): number[] {
  const out: number[] = [];
  for (const [a, b] of [[SF.beamLowMin.value, SF.beamLowMax.value], [SF.beamHighMin.value, SF.beamHighMax.value]] as const) for (let v = a; v <= b + EPS; v += step) out.push(r2(v));
  return out;
}

/** A beam from a to b at height h (above the level floor): null with why when its length or height is not allowed. */
export function makeBeam(d: SecData, level: string, a: Pt, b: Pt, h: number, visible = false): Placed<Beam> {
  const len = hyp2(b[0] - a[0], b[1] - a[1]);
  if (len < SF.beamLengthMin.value - EPS) return { dev: null, why: `${fmt(len)} m is shorter than a beam may be (${SF.beamLengthMin.value} m, SN48)`, words: '' };
  if (len > SF.beamLengthMax.value + EPS) return { dev: null, why: `${fmt(len)} m is longer than a beam may be (${SF.beamLengthMax.value} m, SN48)`, words: '' };
  if (!beamHeights().some((v) => Math.abs(v - h) < EPS)) return { dev: null, why: `${fmt(h)} m is not an allowed beam height (SN40-SN42)`, words: '' };
  const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const room = roomAt(d.rooms, level, m[0], m[1])?.id ?? '';
  const beam: Beam = { id: '', kind: 'beam', level, a: [a[0], h, a[1]], b: [b[0], h, b[1]], visible, room, reason: reasonOf('beam', room) };
  return { dev: beam, why: null, words: `a ${h >= SF.beamHighMin.value - EPS ? 'high' : 'low'} beam, ${fmt(len)} m` };
}

/** A new device of a tool at the dot (a beam is drawn A to A by the tool). */
export function placeDevice(d: SecData, tool: SecTool, level: string, x: number, z: number, yaw: number, grid: number): Placed<Device> {
  const k = secTool(tool).kind;
  if (k === 'camera') return placeCamera(d, level, x, z, yaw, tool === 'pan', grid);
  if (k === 'reader') return placeReader(d, level, x, z, tool, grid);
  return placePir(d, level, x, z, grid);
}

// ---------- the reader's door (the model link) ----------

/** The door fields a reader puts on its opening: its reader type, its card level, locked (S0 2.3: a reader door is locked). */
export function boundOpening(o: Opening, r: Reader | null): Opening {
  const a = clone(o);
  const door: DoorData = { ...((a.door as DoorData | undefined) ?? {}) };
  if (r) {
    door.reader = r.reader;
    door.level = r.accessLevel;
    a.locked = true;
  } else {
    door.reader = 'none';
    delete door.level;
  }
  a.door = door;
  return a;
}

/**
 * The model link: a reader placed, changed or deleted keeps its door's `reader`, `level` and `locked` in step in the
 * same edit (a deleted reader leaves the door with no reader, still locked); a deleted opening drops from its readers.
 */
export function readerLink(d: SecData, changes: readonly Change[]): Change[] {
  const out: Change[] = [];
  const has = (coll: string, id: string): boolean => changes.some((c) => c.coll === coll && c.id === id) || out.some((c) => c.coll === coll && c.id === id);
  for (const ch of changes) {
    if (ch.coll === 'devices') {
      const b = ch.before as unknown as Device | null;
      const a = ch.after as unknown as Device | null;
      const rb = b && isReader(b) ? b : null;
      const ra = a && isReader(a) ? a : null;
      if (!rb && !ra) continue;
      if (rb?.door && rb.door !== ra?.door && !has('openings', rb.door)) {
        const o = d.openings.find((q) => q.id === rb.door);
        const other = (d.devices ?? []).some((x) => x.id !== rb.id && isReader(x) && x.door === rb.door);
        if (o && !other) out.push({ coll: 'openings', id: o.id, before: o as Elem, after: boundOpening(o, null) as Elem });
      }
      if (ra?.door && (ra.door !== rb?.door || ra.accessLevel !== rb?.accessLevel || ra.reader !== rb?.reader) && !has('openings', ra.door)) {
        const o = d.openings.find((q) => q.id === ra.door);
        if (o) {
          const n = boundOpening(o, ra);
          if (JSON.stringify(n) !== JSON.stringify(o)) out.push({ coll: 'openings', id: o.id, before: o as Elem, after: n as Elem });
        }
      }
    } else if (ch.coll === 'openings' && ch.before && !ch.after) {
      for (const x of d.devices ?? []) {
        if (!isReader(x) || x.door !== ch.id || has('devices', x.id)) continue;
        const n = clone(x);
        delete n.door;
        out.push({ coll: 'devices', id: x.id, before: x as unknown as Elem, after: n as unknown as Elem });
      }
    }
  }
  return out;
}

// ---------- what a camera sees ----------

/** A camera as the sight test reads it: plan point, absolute lens height, yaw (rad, 0 = +z) and its sweep (rad). */
export interface CamView {
  x: number;
  z: number;
  y: number;
  yaw: number;
  sweep: [number, number] | null;
}

export function camView(d: Pick<Campus, 'levels'>, c: Camera): CamView {
  const lo = c.sweep ? Math.min(c.sweep[0], c.sweep[1]) * DEG : 0;
  const hi = c.sweep ? Math.max(c.sweep[0], c.sweep[1]) * DEG : 0;
  return { x: c.at[0], z: c.at[1], y: floorOf(d, c.level) + c.y, yaw: c.facing * DEG, sweep: c.sweep ? [lo, hi] : null };
}

const wrapPi = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
};

/** The yaw within the camera's sweep that looks nearest a point (a fixed camera: its yaw). */
export function aimFor(c: CamView, px: number, pz: number): number {
  if (!c.sweep) return c.yaw;
  const want = Math.atan2(px - c.x, pz - c.z);
  const [lo, hi] = c.sweep;
  const mid = (lo + hi) / 2;
  const off = wrapPi(want - mid);
  const half = (hi - lo) / 2;
  return mid + Math.max(-half, Math.min(half, off));
}

/** The ray the sight test casts (perception's losClear interface: the game's Ballistics, or a test's own). */
export type SightRay = Parameters<typeof losClear>[0];

const EYE = { x: 0, y: 0, z: 0 };
const TO = { x: 0, y: 0, z: 0 };
/** Body sample heights, as the guard view (ON7): the chest, else the head, of a 1.75 m body. */
const SAMPLES = [
  [BODY_HEIGHT * 0.6, 0.3],
  [BODY_HEIGHT * 0.95, 0.2],
] as const;

/** Does the camera see a body standing at (px, pz) on a floor at `floor`: in its frame (the game's inFrame) with a clear ray? */
export function camSees(c: CamView, px: number, pz: number, floor: number, ray: SightRay): boolean {
  if (hyp2(px - c.x, pz - c.z) > CAMERA.range) return false;
  const yaw = aimFor(c, px, pz);
  EYE.x = c.x;
  EYE.y = c.y;
  EYE.z = c.z;
  for (const [h, slack] of SAMPLES) {
    const py = floor + h;
    if (!inFrame(yaw, c.x, c.y, c.z, px, py, pz)) continue;
    TO.x = px;
    TO.y = py;
    TO.z = pz;
    if (losClear(ray, EYE, TO, slack)) return true;
  }
  return false;
}

/** The floor cells of a level a camera sees (1) on a floor at `floor` (cells already set stay set: several cameras share one array). */
export function cameraCells(g: CellGrid, c: CamView, floor: number, ray: SightRay, out = new Uint8Array(g.nx * g.nz)): Uint8Array {
  for (let k = 0; k < g.nx * g.nz; k++) {
    if (out[k] || !g.walk[k]) continue;
    const [x, z] = cellCentre(g, k);
    if (camSees(c, x, z, floor, ray)) out[k] = 1;
  }
  return out;
}

/** A PIR's fan as S0 2.6 tests it: within facts security.pirRange horizontally, on its level; a wall sensor only the half in front of its wall (facts pirWallFan). */
export function pirCovers(p: Pick<Pir, 'at' | 'facing' | 'mount'>, x: number, z: number): boolean {
  const dx = x - p.at[0];
  const dz = z - p.at[1];
  if (hyp2(dx, dz) > SF.pirRange.value) return false;
  if (p.mount !== 'wall') return true;
  return Math.abs(wrapPi(Math.atan2(dx, dz) - p.facing * DEG)) <= (SF.pirWallFan.value / 2) * DEG + EPS;
}

/** The camera class of a seen cell by the light there (S0 2.1: the camera rate is the guard's sightRate, so the guard view's bands apply): 3 lit (seen at once), 2 grey (seen slowly), 1 hidden (in frame, too dark to be seen). */
export function camClass(lightLevel: number): 1 | 2 | 3 {
  const b = band(lightLevel);
  return b === 'lit' ? 3 : b === 'grey' ? 2 : 1;
}

/** Coverage of a level's floor cells: 1 a camera sees it, 4 only a sensor fan; the watched and gap counts (floor cells only). */
export function coverage(g: CellGrid, cams: readonly Uint8Array[], pirs: readonly Pick<Pir, 'at' | 'facing' | 'mount'>[]): { cells: Uint8Array; watched: number; gaps: number } {
  const cells = new Uint8Array(g.nx * g.nz);
  let watched = 0;
  let gaps = 0;
  for (let k = 0; k < cells.length; k++) {
    if (!g.walk[k]) continue;
    if (cams.some((c) => c[k] === 1)) cells[k] = 1;
    else {
      const [x, z] = cellCentre(g, k);
      if (pirs.some((p) => pirCovers(p, x, z))) cells[k] = 4;
    }
    if (cells[k]) watched++;
    else gaps++;
  }
  return { cells, watched, gaps };
}

// ---------- the card ----------

export interface SecRow {
  id: string;
  label: string;
  value: string;
  kind: 'list' | 'len' | 'flag';
}

/** Security desk objects (ON4 preset security-desk), any level. */
export const securityDesks = (d: SecData): Obj[] => (d.objects ?? []).filter((o) => o.preset === 'security-desk');

const deg = (v: number): string => `${norm360(v)} degrees`;

export function deviceRows(e: Device): SecRow[] {
  if (isCamera(e)) {
    const rows: SecRow[] = [
      { id: 'facing', label: 'Facing', value: deg(e.facing), kind: 'list' },
      ...(e.sweep ? [{ id: 'sweep', label: 'Sweep', value: `${sweepSpan(e)} degrees`, kind: 'list' as const }] : []),
      { id: 'y', label: 'Height', value: `${fmt(e.y)} m`, kind: 'len' },
      { id: 'mount', label: 'Mount', value: e.mount === 'wall' ? 'Wall' : 'Ceiling', kind: 'list' },
      { id: 'desk', label: 'Desk', value: e.desk || '(none)', kind: 'list' },
      { id: 'monitor', label: 'Monitor', value: e.desk ? String(e.monitor ?? 1) : '-', kind: 'list' },
    ];
    return rows;
  }
  if (isReader(e))
    return [
      { id: 'level', label: 'Access level', value: String(e.accessLevel), kind: 'list' },
      { id: 'building', label: 'Building', value: e.building, kind: 'list' },
      { id: 'door', label: 'Door', value: e.door || '(alone)', kind: 'list' },
      { id: 'y', label: 'Height', value: `${fmt(e.y)} m`, kind: 'len' },
    ];
  if (isPir(e))
    return [
      { id: 'link', label: 'Links to', value: e.lamp ? `Lamp ${e.lamp}` : 'Alarm', kind: 'list' },
      { id: 'mount', label: 'Mount', value: e.mount === 'wall' ? 'Wall' : 'Ceiling', kind: 'list' },
      { id: 'y', label: 'Height', value: `${fmt(e.y)} m`, kind: 'len' },
    ];
  if (isBeam(e))
    return [
      { id: 'y', label: 'Height', value: `${fmt(e.a[1])} m (${e.a[1] >= SF.beamHighMin.value - EPS ? 'high' : 'low'})`, kind: 'list' },
      { id: 'visible', label: 'Visible', value: e.visible ? 'yes' : 'no (night vision)', kind: 'flag' },
    ];
  return [];
}

/** The Type row: the device's kind and style (stepped within its kind: fixed / pan, card / card and PIN / keypad). */
export function deviceType(e: Device): string {
  if (isCamera(e)) return e.sweep ? 'Pan camera' : 'Fixed camera';
  if (isReader(e)) return READER_TYPES.find((t) => t.id === e.reader)?.name ?? 'Card reader';
  if (isPir(e)) return 'Motion sensor';
  if (isBeam(e)) return 'Beam';
  return e.kind;
}

/** One step of a device row (null: nothing changes). */
export function stepDevice(d: SecData, e: Device, row: string, dir: 1 | -1, step: number): Device | null {
  const a = clone(e) as Device;
  if (isCamera(a)) {
    if (row === 'type') {
      if (a.sweep) delete a.sweep;
      else a.sweep = sweepAround(a.facing, SF.cameraSweepDefault.value);
      return a;
    }
    if (row === 'facing') return turnDevice(a, dir * SF.cameraAimStep.value);
    if (row === 'sweep') {
      if (!a.sweep) return null;
      const span = Math.min(SF.cameraSweepMax.value, Math.max(SF.cameraSweepStep.value, sweepSpan(a) + dir * SF.cameraSweepStep.value));
      if (span === sweepSpan(a)) return null;
      a.sweep = sweepAround(a.facing, span);
      return a;
    }
    if (row === 'y') {
      const ceil = ceilingAt(d, a.level, a.at[0], a.at[1]);
      const top = Math.min(SF.cameraMountMax.value, ceil === null ? Infinity : ceil - DEVICE_SIZES.camera.h);
      const v = r2(Math.min(top, Math.max(SF.cameraMountMin.value, a.y + dir * step)));
      return v === a.y ? null : ({ ...a, y: v } as Camera);
    }
    if (row === 'mount') {
      a.mount = a.mount === 'wall' ? 'ceiling' : 'wall';
      return a;
    }
    if (row === 'desk') {
      const ids = ['', ...securityDesks(d).map((o) => o.id)];
      const next = wrap(ids, a.desk ?? '', dir);
      if (next) {
        a.desk = next;
        a.monitor = a.monitor ?? freeMonitor(d, next, a.id);
      } else {
        delete a.desk;
        delete a.monitor;
      }
      return a;
    }
    if (row === 'monitor') {
      if (!a.desk) return null;
      const n = (((a.monitor ?? 1) - 1 + dir + SF.monitorMax.value) % SF.monitorMax.value) + 1;
      a.monitor = n;
      return a;
    }
    return null;
  }
  if (isReader(a)) {
    if (row === 'type') {
      a.reader = wrap(READER_TYPES.map((t) => t.id), a.reader, dir);
      if (READER_TYPES.find((t) => t.id === a.reader)?.pin) a.pin = true;
      else delete a.pin;
      return a;
    }
    if (row === 'level') {
      a.accessLevel = wrap<number>(LEVELS, a.accessLevel, dir);
      return a;
    }
    if (row === 'building') {
      const ids = (d.meta.buildings ?? []).map((b) => b.id);
      if (ids.length < 2) return null;
      a.building = wrap(ids, a.building, dir);
      return a;
    }
    if (row === 'y') {
      const v = r2(Math.max(step, a.y + dir * step));
      return { ...a, y: v } as Reader;
    }
    return null;
  }
  if (isPir(a)) {
    if (row === 'link') {
      const opts = ['alarm', ...pirLamps(d, a).map((l) => l.id)];
      const next = wrap(opts, a.lamp ?? 'alarm', dir);
      if (next === 'alarm') {
        delete a.lamp;
        a.alarm = true;
      } else {
        a.lamp = next;
        delete a.alarm;
      }
      return a;
    }
    if (row === 'mount') {
      a.mount = a.mount === 'wall' ? 'ceiling' : 'wall';
      return a;
    }
    if (row === 'y') return { ...a, y: r2(Math.max(step, a.y + dir * step)) } as Pir;
    return null;
  }
  if (isBeam(a)) {
    if (row === 'y') {
      const hs = beamHeights();
      const i = hs.findIndex((v) => Math.abs(v - a.a[1]) < EPS);
      const j = i < 0 ? (dir > 0 ? 0 : hs.length - 1) : i + dir;
      if (j < 0 || j >= hs.length) return null;
      a.a = [a.a[0], hs[j]!, a.a[2]];
      a.b = [a.b[0], hs[j]!, a.b[2]];
      return a;
    }
    if (row === 'visible' || row === 'type') {
      a.visible = !a.visible;
      return row === 'visible' ? a : null;
    }
    return null;
  }
  return null;
}

/** A camera or sensor turned by `by` degrees (a pan camera's sweep turns with it). */
export function turnDevice<T extends Device>(e: T, by: number): T {
  const a = clone(e) as Device;
  if (!('facing' in a) || typeof a.facing !== 'number') return a as T;
  const f = norm360(a.facing + by);
  if (isCamera(a) && a.sweep) a.sweep = sweepAround(f, sweepSpan(a));
  a.facing = f;
  return a as T;
}

/** A camera aimed to a yaw (degrees). */
export function aimDevice<T extends Device>(e: T, yaw: number): T {
  const f = norm360(yaw);
  return 'facing' in e && typeof e.facing === 'number' ? turnDevice(e, f - e.facing) : e;
}

/** The lowest monitor on a desk no other camera uses. */
export function freeMonitor(d: SecData, desk: string, self = ''): number {
  const used = new Set((d.devices ?? []).filter((x) => isCamera(x) && x.desk === desk && x.id !== self).map((x) => (x as Camera).monitor ?? 1));
  for (let n = 1; n <= SF.monitorMax.value; n++) if (!used.has(n)) return n;
  return 1;
}

/** The cameras a desk shows, by monitor (the desk object's card). */
export function deskFeeds(d: SecData, desk: string): Camera[] {
  return (d.devices ?? []).filter((x): x is Camera => isCamera(x) && x.desk === desk).sort((a, b) => (a.monitor ?? 1) - (b.monitor ?? 1));
}
export const feedWords = (d: SecData, desk: string): string => {
  const f = deskFeeds(d, desk);
  return f.length ? `Feeds: ${f.map((c) => `${c.id} on monitor ${c.monitor ?? 1}`).join(', ')}` : 'Feeds: none (a camera picks this desk on its card)';
};

/** The card's title and size line. */
export function deviceWords(e: Device): { title: string; size: string } {
  const name = typeof e.name === 'string' && e.name ? e.name : '';
  if (isCamera(e)) return { title: name || deviceType(e), size: `${e.mount === 'wall' ? 'Wall' : 'Ceiling'}, ${fmt(e.y)} m, facing ${norm360(e.facing)}${e.sweep ? `, sweeps ${sweepSpan(e)}` : ''}${e.desk ? `; ${e.desk} monitor ${e.monitor ?? 1}` : ''}` };
  if (isReader(e)) return { title: name || deviceType(e), size: `Level ${e.accessLevel}, building ${e.building}${e.door ? `, door ${e.door}` : ', alone'}` };
  if (isPir(e)) return { title: name || 'Motion sensor', size: `${e.mount === 'wall' ? 'Wall' : 'Ceiling'}, ${fmt(e.y)} m, ${e.lamp ? `lights ${e.lamp}` : 'reports to the alarm'}` };
  if (isBeam(e)) return { title: name || 'Beam', size: `${fmt(hyp2(e.b[0] - e.a[0], e.b[2] - e.a[2]))} m at ${fmt(e.a[1])} m, ${e.visible ? 'visible' : 'night vision only'}` };
  return { title: name || e.kind, size: e.room };
}

/** The card's foot: what it does in the game (S0) and which stage builds it. */
export function deviceFoot(e: Device): string {
  if (isCamera(e)) return `Range ${CAMERA.range} m, ${Math.round(CAMERA.hFov / DEG)} x ${Math.round(CAMERA.vFov / DEG)} degree frame (SN01-SN03); built in the walk test (S1)`;
  if (isReader(e)) return `${e.door ? `Locks door ${e.door}: a card of building ${e.building}, level ${e.accessLevel} or higher opens it` : 'Not on a door'}; stage S2 builds readers`;
  if (isPir(e)) return `Range ${SF.pirRange.value} m on its level (SN50)${e.mount === 'wall' ? `, ${SF.pirWallFan.value} degrees in front of its wall` : ''}; stage S3 builds sensors`;
  if (isBeam(e)) return 'Breaks report to the desk (the alarm, S0 2.5); stage S3 builds beams';
  return 'Kept from the security file';
}

// ---------- the file ----------

export type SecurityFile = Record<string, unknown>;

/** The security file's text as the editor writes it (the campus file's format: one-space indent, LF, trailing newline). */
export const securityText = (s: SecurityFile): string => JSON.stringify(s, null, 1) + '\n';

/** The campus data with the security file's devices joined in (the editing document's `devices`). */
export function joinSecurity<T extends Record<string, unknown>>(campus: T, sec: SecurityFile | null): T {
  if (sec && Array.isArray(sec.devices)) (campus as Record<string, unknown>).devices = sec.devices;
  return campus;
}

/**
 * The editor's data split: the data without `devices`, and the security file (the loaded one with its devices replaced,
 * zones and cards kept; created with empty zones and cards on the first save with a device), or null when there was no
 * file and there are no devices.
 */
export function splitSecurity<T extends Record<string, unknown>>(data: T, sec: SecurityFile | null): { data: T; security: SecurityFile | null } {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (k !== 'devices') rest[k] = v;
  const devs = Array.isArray(data.devices) ? (data.devices as unknown[]) : [];
  if (!sec && !devs.length) return { data: rest as T, security: null };
  const out: SecurityFile = sec ? { ...sec, devices: devs } : { devices: devs, zones: [], cards: [] };
  return { data: rest as T, security: out };
}
