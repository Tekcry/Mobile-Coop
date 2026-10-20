/**
 * (tuner-v2 item 2) Hand and foot placement plus the Weapon group, per held weapon x tuner state (pure, Babylon-free, no
 * DOM). One flat row of `HAND_PARAMS` per (weapon, body group); every default is identity (offsets 0, gun scale 1,
 * trigger auto), and a row at its defaults is never applied, so the default output is bit-identical to the untuned rig.
 *
 * Hot path: `handsBegin(group, weapon, dt)` (around the LOCAL player's `rig.animate`, beside `jointsBegin`) eases the
 * applied values toward the active row (`HAND_EASE_TAU`, like item 1; settled values are exact, identity included) and
 * rebuilds the derived quaternions only while they move. The rig hooks read `HANDS_CUR` / `HANDS_GUN` (flag checks, a
 * few multiplies, no allocation). Outside the window (remotes, guards, menus) `HANDS_CUR.on` is false.
 *
 * Frames: hand / foot offsets are in the body frame (fwd = +z, up = +y, out = away from the midline: +x for the right,
 * -x for the left); rotations are degrees x = pitch, y = yaw, z = roll (`RotationYawPitchRoll`, as item 1). The gun
 * transform is in the weapon's frame (x right, y up, z along the bore) about its trigger grip point: VISUAL ONLY (the
 * rendered mesh and the support hand on it; the weapon node, the muzzle, the aim ray and ballistics stay as they are).
 *
 * Save / Export: additive key `hands` on the tuner's record (`handsAttach`, `handsLoadFrom`); a record without it (every
 * save before this) loads as all default.
 */
import { BODY_GROUPS, type BodyGroup } from './tune';
import { eulerQuat, mulInto, type QuatLike } from './tuneJoints';

export const HAND_WEAPONS = ['none', 'rifle', 'pistol', 'launcher', 'knife'] as const;
export type HandWeapon = (typeof HAND_WEAPONS)[number];
export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'] as const;

export interface HandParam {
  readonly id: string;
  readonly label: string;
  readonly section: 'place' | 'weapon' | 'fingers';
  readonly def: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: 'm' | 'deg' | 'x' | 'mode' | 'curl';
}

const m = (id: string, label: string, section: HandParam['section'], r = 0.3, step = 0.005): HandParam => ({ id, label, section, def: 0, min: -r, max: r, step, unit: 'm' });
const d = (id: string, label: string, section: HandParam['section'], r = 90): HandParam => ({ id, label, section, def: 0, min: -r, max: r, step: 0.5, unit: 'deg' });
const xyz = ['Fwd', 'Up', 'Out'] as const;
const pyr = ['Pitch', 'Yaw', 'Roll'] as const;

const PARAMS: HandParam[] = [];
for (const t of ['handL', 'handR', 'footL', 'footR']) for (const a of xyz) PARAMS.push(m(`${t}${a}`, `${t} IK target ${a.toLowerCase()}`, 'place'));
for (const t of ['handL', 'handR']) for (const a of pyr) PARAMS.push(d(`${t}${a}`, `${t} rotation ${a.toLowerCase()}`, 'place'));
PARAMS.push({ id: 'gunScale', label: 'gun scale (visual only)', section: 'weapon', def: 1, min: 0.5, max: 2, step: 0.01, unit: 'x' });
for (const a of ['X', 'Y', 'Z']) PARAMS.push(m(`gun${a}`, `gun in the hand ${a.toLowerCase()} (weapon frame)`, 'weapon', 0.15, 0.002));
for (const a of pyr) PARAMS.push(d(`gun${a}`, `gun in the hand ${a.toLowerCase()}`, 'weapon', 45));
PARAMS.push(m('supportSlide', 'support hand along the handguard / slide (+ toward the muzzle)', 'weapon', 0.25, 0.002));
for (const a of ['Out', 'Up', 'Fwd']) PARAMS.push(m(`support${a}`, `support hand ${a.toLowerCase()} (weapon frame)`, 'weapon', 0.1, 0.002));
for (const a of pyr) PARAMS.push(d(`support${a}`, `support hand rotation ${a.toLowerCase()}`, 'weapon'));
PARAMS.push({ id: 'trigger', label: 'trigger finger (-1 off, 0 auto, 1 on)', section: 'weapon', def: 0, min: -1, max: 1, step: 1, unit: 'mode' });
for (const h of ['L', 'R']) {
  for (const f of FINGERS) {
    PARAMS.push({ id: `${f}${h}Curl`, label: `${f} ${h} curl`, section: 'fingers', def: 0, min: -1, max: 1, step: 0.05, unit: 'curl' });
    PARAMS.push(d(`${f}${h}Spread`, `${f} ${h} spread`, 'fingers', 30));
  }
}
export const HAND_PARAMS: readonly HandParam[] = PARAMS;
export const HAND_PARAM_COUNT = PARAMS.length;
/** Param index by id. */
export const HP = Object.freeze(Object.fromEntries(PARAMS.map((p, i) => [p.id, i]))) as Readonly<Record<string, number>>;
const DEF = new Float64Array(PARAMS.map((p) => p.def));

const P = HAND_PARAM_COUNT;
const G = BODY_GROUPS.length;
const W = HAND_WEAPONS.length;
const GROUP_INDEX = Object.fromEntries(BODY_GROUPS.map((g, i) => [g, i])) as Record<BodyGroup, number>;
const WEAPON_INDEX = Object.fromEntries(HAND_WEAPONS.map((w, i) => [w, i])) as Record<HandWeapon, number>;

/** The values, [weapon][group][param] flat (the source of truth). */
const VAL = new Float64Array(W * G * P);
/** Per row: 1 when any param differs from its default. */
const ROW_LIVE = new Uint8Array(W * G);
for (let r = 0; r < W * G; r++) VAL.set(DEF, r * P);

/** The panel's change hook (save, redraw); fired after every edit. */
export const HANDS_HOOKS: { changed: (() => void) | null } = { changed: null };

// ------------------------------------------------------------------------------------------
// The panel API (not hot)
// ------------------------------------------------------------------------------------------

function row(weapon: HandWeapon, group: BodyGroup): number {
  const w = WEAPON_INDEX[weapon];
  const g = GROUP_INDEX[group];
  if (w === undefined || g === undefined) throw new Error(`tuneHands: unknown row ${weapon} / ${group}`);
  return w * G + g;
}

function rowLive(r: number): void {
  const b = r * P;
  let live = 0;
  for (let i = 0; i < P; i++) if (VAL[b + i] !== DEF[i]) live = 1;
  ROW_LIVE[r] = live;
}

function clampParam(i: number, v: number): number {
  const p = PARAMS[i]!;
  const c = Math.max(p.min, Math.min(p.max, v));
  return p.unit === 'mode' ? Math.round(c) + 0 : c;
}

function put(r: number, i: number, v: number): boolean {
  const o = r * P + i;
  if (VAL[o] === v) return false;
  VAL[o] = v;
  rowLive(r);
  return true;
}

export function handsGet(weapon: HandWeapon, group: BodyGroup, param: number): number {
  return VAL[row(weapon, group) * P + param]!;
}

/** Set one param of one (weapon, state) row (clamped to its range, a non-finite value is refused). True if it changed. */
export function handsSet(weapon: HandWeapon, group: BodyGroup, param: number, v: number): boolean {
  if (!Number.isFinite(v) || param < 0 || param >= P) return false;
  const ch = put(row(weapon, group), param, clampParam(param, v));
  if (ch) HANDS_HOOKS.changed?.();
  return ch;
}

export function handsReset(weapon: HandWeapon, group: BodyGroup, param: number): void {
  handsSet(weapon, group, param, DEF[param]!);
}

export function handsResetGroup(weapon: HandWeapon, group: BodyGroup): void {
  const r = row(weapon, group);
  let ch = false;
  for (let i = 0; i < P; i++) ch = put(r, i, DEF[i]!) || ch;
  if (ch) HANDS_HOOKS.changed?.();
}

export function handsResetAll(): void {
  let ch = false;
  for (let r = 0; r < W * G; r++) for (let i = 0; i < P; i++) ch = put(r, i, DEF[i]!) || ch;
  if (ch) HANDS_HOOKS.changed?.();
}

export function handsChanged(weapon: HandWeapon, group: BodyGroup, param: number): boolean {
  return VAL[row(weapon, group) * P + param] !== DEF[param];
}

export function handsGroupChanged(weapon: HandWeapon, group: BodyGroup): boolean {
  return ROW_LIVE[row(weapon, group)] === 1;
}

/** What the rig holds, for the row: a knife in the fist, else the held gun (pistol by its cupped support hold). */
export interface HandsRigIn {
  readonly heldWeapon: { readonly name: string } | null;
  readonly holdingKnife: boolean;
  readonly supportStyle: 'tube' | 'cup';
}

export function handsWeaponOf(rig: HandsRigIn): HandWeapon {
  if (rig.holdingKnife) return 'knife';
  const w = rig.heldWeapon;
  if (!w) return 'none';
  if (w.name.includes('launcher')) return 'launcher';
  return rig.supportStyle === 'cup' ? 'pistol' : 'rifle';
}

// ------------------------------------------------------------------------------------------
// Hot path
// ------------------------------------------------------------------------------------------

/** The ease time constant (s), as item 1's `JOINT_EASE_TAU`. */
export const HAND_EASE_TAU = 0.06;
const SNAP_EPS = 1e-6;
/** The applied values (eased toward the active row). */
const CUR = new Float64Array(P);
CUR.set(DEF);
let curAny = false;

/**
 * The applied state the rig reads (preallocated, written by `handsBegin`). `on`: anything at all differs from identity.
 * Per part flags so an untouched part skips its hook. Quaternions are x y z w.
 */
export const HANDS_CUR = {
  on: false,
  /** Hand / foot IK target offsets live (body frame, metres): [handL, handR, footL, footR] x [fwd, up, out]. */
  hands: false,
  feet: false,
  pos: new Float64Array(12),
  /** Hand rotation per hand (index 0 right, 1 left; own frame, after the hand pose). */
  rotOn: new Uint8Array(2),
  rotQ: new Float64Array(8),
  /** The support hand on the gun: weapon-frame offset (slide folded into z; x is "out" for that hand) and rotation. */
  supOn: false,
  sup: new Float64Array(3),
  supRotOn: false,
  supQ: new Float64Array(4),
  /** Trigger finger: -1 off, 0 auto (the rig's own), 1 on. */
  trigger: 0,
  /** IK targeting strength live (any limb below 1 after the ease; `ikStrength`). */
  ikOn: false,
  /** Hand closure offset per hand (mean finger curl, -1..1; index 0 right, 1 left). */
  curl: new Float64Array(2),
  curlOn: false,
};

/** The gun's visual transform (weapon frame, about the trigger grip point): `on` when not identity. */
export interface GunVisual {
  on: boolean;
  s: number;
  tx: number;
  ty: number;
  tz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}
export const HANDS_GUN: GunVisual = { on: false, s: 1, tx: 0, ty: 0, tz: 0, qx: 0, qy: 0, qz: 0, qw: 1 };

const D2R = Math.PI / 180;
const qBuf = new Float64Array(4);

/** Rebuild the derived quaternions and flags from `CUR` (only when something moved). */
function derive(gun: boolean): void {
  const c = HANDS_CUR;
  const pos = c.pos;
  let hands = false;
  let feet = false;
  for (let i = 0; i < 12; i++) {
    pos[i] = CUR[i]!;
    if (CUR[i] !== 0) {
      if (i < 6) hands = true;
      else feet = true;
    }
  }
  c.hands = hands;
  c.feet = feet;
  // hand rotation: params 12..14 left, 15..17 right -> rotQ index 0 right, 1 left
  for (let h = 0; h < 2; h++) {
    const b = h === 0 ? HP.handRPitch! : HP.handLPitch!;
    const x = CUR[b]!;
    const y = CUR[b + 1]!;
    const z = CUR[b + 2]!;
    const on = x !== 0 || y !== 0 || z !== 0;
    c.rotOn[h] = on ? 1 : 0;
    eulerQuat(x * D2R, y * D2R, z * D2R, c.rotQ, h * 4);
  }
  const g = HANDS_GUN;
  const s = CUR[HP.gunScale!]!;
  g.s = gun ? s : 1;
  g.tx = gun ? CUR[HP.gunX!]! : 0;
  g.ty = gun ? CUR[HP.gunY!]! : 0;
  g.tz = gun ? CUR[HP.gunZ!]! : 0;
  const gp = gun ? CUR[HP.gunPitch!]! : 0;
  const gy = gun ? CUR[HP.gunYaw!]! : 0;
  const gr = gun ? CUR[HP.gunRoll!]! : 0;
  eulerQuat(gp * D2R, gy * D2R, gr * D2R, qBuf, 0);
  g.qx = qBuf[0]!;
  g.qy = qBuf[1]!;
  g.qz = qBuf[2]!;
  g.qw = qBuf[3]!;
  g.on = g.s !== 1 || g.tx !== 0 || g.ty !== 0 || g.tz !== 0 || gp !== 0 || gy !== 0 || gr !== 0;
  const so = gun ? CUR[HP.supportOut!]! : 0;
  const su = gun ? CUR[HP.supportUp!]! : 0;
  const sf = gun ? CUR[HP.supportFwd!]! + CUR[HP.supportSlide!]! : 0;
  c.sup[0] = so;
  c.sup[1] = su;
  c.sup[2] = sf;
  c.supOn = so !== 0 || su !== 0 || sf !== 0;
  const sp = gun ? CUR[HP.supportPitch!]! : 0;
  const sy = gun ? CUR[HP.supportYaw!]! : 0;
  const sr = gun ? CUR[HP.supportRoll!]! : 0;
  c.supRotOn = sp !== 0 || sy !== 0 || sr !== 0;
  eulerQuat(sp * D2R, sy * D2R, sr * D2R, c.supQ, 0);
  c.trigger = gun ? CUR[HP.trigger!]! : 0;
  let curlOn = false;
  for (let h = 0; h < 2; h++) {
    const b = h === 0 ? HP.thumbRCurl! : HP.thumbLCurl!;
    let sum = 0;
    for (let f = 0; f < FINGERS.length; f++) sum += CUR[b + f * 2]!;
    c.curl[h] = sum / FINGERS.length;
    if (c.curl[h] !== 0) curlOn = true;
  }
  c.curlOn = curlOn;
}

let lastGun = false;

/**
 * Before the LOCAL player's `rig.animate`: ease the applied values toward the (weapon, state) row ('' = toward the
 * defaults) over `dt` seconds (exponential, `HAND_EASE_TAU`; the default `Infinity` jumps). The trigger mode switches at
 * once. The gun params apply only to a gun (rifle, pistol, launcher). No allocation.
 */
export function handsBegin(group: BodyGroup | '', weapon: HandWeapon, dt = Number.POSITIVE_INFINITY): void {
  const g = group === '' ? undefined : GROUP_INDEX[group];
  const w = WEAPON_INDEX[weapon];
  const r = g === undefined || w === undefined ? -1 : w * G + g;
  const gun = weapon === 'rifle' || weapon === 'pistol' || weapon === 'launcher';
  HANDS_CUR.on = false;
  const k = dt > 0 ? 1 - Math.exp(-dt / HAND_EASE_TAU) : 0;
  const ik = ikEase(g === undefined ? -1 : g, k);
  HANDS_CUR.ikOn = ik;
  HANDS_CUR.on = ik;
  if (!curAny && (r < 0 || ROW_LIVE[r] !== 1)) return; // the common case: nothing applied, nothing to apply
  const b = r * P;
  let moved = gun !== lastGun;
  let any = false;
  for (let i = 0; i < P; i++) {
    const t = r >= 0 ? VAL[b + i]! : DEF[i]!;
    let c = CUR[i]!;
    if (c !== t) {
      if (PARAMS[i]!.unit === 'mode') c = t;
      else {
        c += (t - c) * k;
        if (Math.abs(t - c) < SNAP_EPS) c = t;
      }
      CUR[i] = c;
      moved = true;
    }
    if (c !== DEF[i]) any = true;
  }
  curAny = any;
  lastGun = gun;
  if (moved) derive(gun);
  HANDS_CUR.on = (any && anyOn()) || ik;
}

/** (after `derive`) any part live. */
function anyOn(): boolean {
  const c = HANDS_CUR;
  return c.hands || c.feet || c.rotOn[0] === 1 || c.rotOn[1] === 1 || HANDS_GUN.on || c.supOn || c.supRotOn || c.trigger !== 0 || c.curlOn;
}

// ------------------------------------------------------------------------------------------
// IK targeting strength per limb per state (Michael, via the coordinator): 1 = today's IK (identity)
// ------------------------------------------------------------------------------------------

export const IK_LIMBS = ['handL', 'handR', 'footL', 'footR'] as const;
export type IkLimb = 0 | 1 | 2 | 3;
export const IK_RANGE = { min: 0, max: 1, step: 0.05, def: 1 } as const;
/** Strength per [group][limb]: how much of the IK solution (hand on the gun / grip, planted foot) the limb keeps. */
const IK = new Float64Array(G * 4).fill(1);
const IK_LIVE = new Uint8Array(G);
/** The applied strengths (eased like the rest). */
const IK_CUR = new Float64Array(4).fill(1);
let ikAny = false;

function ikRowLive(g: number): void {
  const b = g * 4;
  IK_LIVE[g] = IK[b] !== 1 || IK[b + 1] !== 1 || IK[b + 2] !== 1 || IK[b + 3] !== 1 ? 1 : 0;
}

function ikPut(g: number, limb: number, v: number): boolean {
  const o = g * 4 + limb;
  if (IK[o] === v) return false;
  IK[o] = v;
  ikRowLive(g);
  return true;
}

function gIdx(group: BodyGroup): number {
  const g = GROUP_INDEX[group];
  if (g === undefined) throw new Error(`tuneHands: unknown group ${group}`);
  return g;
}

export function ikGet(group: BodyGroup, limb: IkLimb): number {
  return IK[gIdx(group) * 4 + limb]!;
}

/** Set one limb's IK strength in one state (clamped 0..1, a non-finite value is refused). True if it changed. */
export function ikSet(group: BodyGroup, limb: IkLimb, v: number): boolean {
  if (!Number.isFinite(v) || limb < 0 || limb > 3) return false;
  const ch = ikPut(gIdx(group), limb, Math.max(IK_RANGE.min, Math.min(IK_RANGE.max, v)));
  if (ch) HANDS_HOOKS.changed?.();
  return ch;
}

export function ikReset(group: BodyGroup, limb: IkLimb): void {
  ikSet(group, limb, 1);
}

export function ikResetGroup(group: BodyGroup): void {
  const g = gIdx(group);
  let ch = false;
  for (let l = 0; l < 4; l++) ch = ikPut(g, l, 1) || ch;
  if (ch) HANDS_HOOKS.changed?.();
}

export function ikResetAll(): void {
  let ch = false;
  for (let g = 0; g < G; g++) for (let l = 0; l < 4; l++) ch = ikPut(g, l, 1) || ch;
  if (ch) HANDS_HOOKS.changed?.();
}

export function ikGroupChanged(group: BodyGroup): boolean {
  return IK_LIVE[gIdx(group)] === 1;
}

/** Ease the applied strengths toward group `g`'s row (-1: toward 1). True when any limb is below 1. */
function ikEase(g: number, k: number): boolean {
  if (!ikAny && (g < 0 || IK_LIVE[g] !== 1)) return false;
  let any = false;
  for (let l = 0; l < 4; l++) {
    const t = g >= 0 ? IK[g * 4 + l]! : 1;
    let c = IK_CUR[l]!;
    if (c !== t) {
      c += (t - c) * k;
      if (Math.abs(t - c) < SNAP_EPS) c = t;
      IK_CUR[l] = c;
    }
    if (c !== 1) any = true;
  }
  ikAny = any;
  return any;
}

/**
 * (one-line rig hook, after a limb's IK solve and before item 1's joint offsets) Blend the limb's local rotations from
 * the IK solution toward the rest pose (identity) by 1 - strength, so at 0 the limb is pure FK: rest + item 1's joint
 * offsets. Strength 1 (the default) touches nothing. No allocation.
 */
export function ikStrength(limb: IkLimb, a: QuatLike, b: QuatLike, c: QuatLike): void {
  if (!HANDS_CUR.ikOn) return;
  const s = IK_CUR[limb]!;
  if (s === 1) return;
  towardRest(a, s);
  towardRest(b, s);
  towardRest(c, s);
}

/** q = nlerp(identity, q, s) (shortest arc). */
function towardRest(q: QuatLike, s: number): void {
  const sg = q.w < 0 ? -s : s;
  const x = q.x * sg;
  const y = q.y * sg;
  const z = q.z * sg;
  const w = q.w * sg + (1 - s);
  const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
  q.x = x / l;
  q.y = y / l;
  q.z = z / l;
  q.w = w / l;
}

/** After the local player's `rig.animate`. */
export function handsEnd(): void {
  HANDS_CUR.on = false;
  HANDS_CUR.ikOn = false;
}

/** A writable 3-vector (Babylon's `Vector3` fits). */
export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * The gun's visual transform on a weapon-frame point `p` (in place), about the trigger grip point `g`:
 * p' = g + t + R(q) (s (p - g)). No allocation.
 */
export function gunVisualPoint(v: GunVisual, g: Vec3Like, p: Vec3Like): void {
  const x = (p.x - g.x) * v.s;
  const y = (p.y - g.y) * v.s;
  const z = (p.z - g.z) * v.s;
  rotInto(v.qx, v.qy, v.qz, v.qw, x, y, z, p);
  p.x += g.x + v.tx;
  p.y += g.y + v.ty;
  p.z += g.z + v.tz;
}

/** out = R(q) (x, y, z). */
export function rotInto(qx: number, qy: number, qz: number, qw: number, x: number, y: number, z: number, out: Vec3Like): void {
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  out.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
}

/** A hand's rotation offset on its wrist (own frame, q * off); `hand` 0 right, 1 left. False: none applied. */
export function handsRotApply(q: QuatLike, hand: 0 | 1): boolean {
  const c = HANDS_CUR;
  if (!c.on || c.rotOn[hand] !== 1) return false;
  const o = hand * 4;
  mulInto(q, c.rotQ[o]!, c.rotQ[o + 1]!, c.rotQ[o + 2]!, c.rotQ[o + 3]!, false);
  return true;
}

// ------------------------------------------------------------------------------------------
// Save / Export (additive key `hands` on the tuner's record)
// ------------------------------------------------------------------------------------------

export interface HandsSnapshot {
  version: 1;
  /** Only the non-default params: weapon -> group -> param id -> value. */
  values: Record<string, Record<string, Record<string, number>>>;
  /** IK targeting strength, only the states with a limb below 1: group -> [handL, handR, footL, footR]. */
  ik?: Record<string, [number, number, number, number]>;
}

export function handsSnapshot(): HandsSnapshot {
  const values: HandsSnapshot['values'] = {};
  for (let w = 0; w < W; w++) {
    for (let g = 0; g < G; g++) {
      const r = w * G + g;
      if (ROW_LIVE[r] !== 1) continue;
      const out: Record<string, number> = {};
      for (let i = 0; i < P; i++) if (VAL[r * P + i] !== DEF[i]) out[PARAMS[i]!.id] = VAL[r * P + i]!;
      (values[HAND_WEAPONS[w]!] ??= {})[BODY_GROUPS[g]!] = out;
    }
  }
  const snap: HandsSnapshot = { version: 1, values };
  for (let g = 0; g < G; g++) {
    if (IK_LIVE[g] !== 1) continue;
    const b = g * 4;
    (snap.ik ??= {})[BODY_GROUPS[g]!] = [IK[b]!, IK[b + 1]!, IK[b + 2]!, IK[b + 3]!];
  }
  return snap;
}

/** Load a snapshot: every value back to its default first; unknown weapons / groups / params and bad numbers skipped. */
export function handsLoad(s: unknown): void {
  for (let r = 0; r < W * G; r++) {
    VAL.set(DEF, r * P);
    ROW_LIVE[r] = 0;
  }
  CUR.set(DEF);
  curAny = false;
  derive(false);
  IK.fill(1);
  IK_LIVE.fill(0);
  IK_CUR.fill(1);
  ikAny = false;
  HANDS_CUR.on = false;
  HANDS_CUR.ikOn = false;
  if (!s || typeof s !== 'object') return;
  const ikv = (s as Partial<HandsSnapshot>).ik;
  if (ikv && typeof ikv === 'object') {
    for (const [gName, v] of Object.entries(ikv)) {
      const g = GROUP_INDEX[gName as BodyGroup];
      if (g === undefined || !Array.isArray(v)) continue;
      for (let l = 0; l < 4; l++) {
        const n: unknown = v[l];
        if (typeof n === 'number' && Number.isFinite(n)) ikPut(g, l, Math.max(0, Math.min(1, n)));
      }
    }
  }
  const vals = (s as Partial<HandsSnapshot>).values;
  if (!vals || typeof vals !== 'object') return;
  for (const [wName, rows] of Object.entries(vals)) {
    const w = WEAPON_INDEX[wName as HandWeapon];
    if (w === undefined || !rows || typeof rows !== 'object') continue;
    for (const [gName, rv] of Object.entries(rows)) {
      const g = GROUP_INDEX[gName as BodyGroup];
      if (g === undefined || !rv || typeof rv !== 'object') continue;
      for (const [pid, v] of Object.entries(rv as Record<string, unknown>)) {
        const i = HP[pid];
        if (i === undefined || typeof v !== 'number' || !Number.isFinite(v)) continue;
        put(w * G + g, i, clampParam(i, v));
      }
    }
  }
}

/** The tuner record with `hands` added when any row is set; otherwise the record unchanged (an untouched save as today). */
export function handsAttach<T extends object>(rec: T): T & { hands?: HandsSnapshot } {
  const s = handsSnapshot();
  if (Object.keys(s.values).length === 0 && !s.ik) return rec;
  return { ...rec, hands: s };
}

/** Load the `hands` key of a tuner record (a record without it, an old save, loads as all default). */
export function handsLoadFrom(rec: unknown): void {
  handsLoad(rec && typeof rec === 'object' ? (rec as { hands?: unknown }).hands : undefined);
}
