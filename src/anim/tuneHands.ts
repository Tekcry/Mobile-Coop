/**
 * (tuner-v2 item 2) Hand and foot placement plus the Weapon group, per held weapon x tuner state (pure, Babylon-free, no
 * DOM). One flat row of `HAND_PARAMS` per (weapon, body group); every default is identity (offsets 0, gun scale 1,
 * trigger auto), and a row at its defaults is never applied, so the default output is bit-identical to the untuned rig.
 *
 * (anim-joints J1) Base and delta: the table here is the tuner's DELTA (what the panel edits, saves and exports); the
 * generated base table `animBase.ts` sits under it. The EFFECTIVE value is `handCompose` (offsets add, gun scale
 * multiplies, the trigger mode is the delta's when not 0 (auto) else the base's) and IK strength base x delta (0..1);
 * rebuilt on an edit or a load, never per frame.
 *
 * Hot path: each Wren rig (`CharacterRig.tuneRows`) owns a `HandsRigState` and opens its window inside its own `animate`
 * (`handsBeginRig`, via `tuneJointsRig.ts`): its applied values ease toward its (weapon, state) row (`HAND_EASE_TAU`,
 * like item 1; settled values are exact, identity included), the derived quaternions are rebuilt only while they move,
 * and the rig's applied state is copied into `HANDS_CUR` / `HANDS_GUN`, which the rig hooks read (flag checks, a few
 * multiplies, no allocation). Outside a window (guards, the VIP, menus) `HANDS_CUR.on` is false. `handsBegin` opens the
 * module's own state (tests, tools).
 *
 * Frames: hand / foot offsets are in the body frame (fwd = +z, up = +y, out = away from the midline: +x for the right,
 * -x for the left); rotations are degrees x = pitch, y = yaw, z = roll (`RotationYawPitchRoll`, as item 1). The gun
 * transform is in the weapon's frame (x right, y up, z along the bore) about its trigger grip point: VISUAL ONLY (the
 * rendered mesh and the support hand on it; the weapon node, the muzzle, the aim ray and ballistics stay as they are).
 *
 * Save / Export: additive key `hands` on the tuner's record (`handsAttach`, `handsLoadFrom`); a record without it (every
 * save before this) loads as all default.
 *
 * (anim-joints J2) The rows are `TUNE_ROW_IDS` (`tuneMoveRows.ts`): the body states, then the move and action rows
 * (`trav.vault`, `team.boost.b`, `reload`, ...); `handsBeginRigRows` composes up to 3 of them over the stance row (A5).
 */
import { ANIM_BASE } from './animBase';
import { TUNE_ROW_IDS, TUNE_ROW_INDEX } from './tuneMoveRows';
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
/** (anim-joints J2) The rows: the body states, then the move and action rows (`TUNE_ROW_IDS`). */
const G = TUNE_ROW_IDS.length;
const W = HAND_WEAPONS.length;
const GROUP_INDEX = TUNE_ROW_INDEX as Record<string, number>;
const WEAPON_INDEX = Object.fromEntries(HAND_WEAPONS.map((w, i) => [w, i])) as Record<HandWeapon, number>;

/** The tuner's delta values, [weapon][group][param] flat (the source of truth of the panel). */
const VAL = new Float64Array(W * G * P);
/** (J1) The base table's values (`animBase.ts`), same layout. */
const BASE = new Float64Array(W * G * P);
/** (J1) The effective values (`handCompose(base, delta)`): what the rigs apply. */
const EVAL = new Float64Array(W * G * P);
/** Per row: 1 when any delta param differs from its default (the panel, the snapshot). */
const ROW_LIVE = new Uint8Array(W * G);
/** (J1) Per row: 1 when any effective param differs from its default (the hot path). */
const EROW_LIVE = new Uint8Array(W * G);
for (let r = 0; r < W * G; r++) {
  VAL.set(DEF, r * P);
  BASE.set(DEF, r * P);
  EVAL.set(DEF, r * P);
}
/** (J1) Bumped by every load (delta or base): each rig's applied values jump to the defaults (no ease from the old). */
let loadGen = 0;

/**
 * (J1, A1) Base and delta of param `i` composed: the gun scale multiplies, the trigger mode is the delta's when it is not
 * 0 (auto) else the base's, every other param adds.
 */
export function handCompose(i: number, base: number, delta: number): number {
  const u = PARAMS[i]!.unit;
  if (u === 'x') return base * delta;
  if (u === 'mode') return delta !== 0 ? delta : base;
  return base + delta;
}

/** The panel's change hook (save, redraw); fired after every edit. */
export const HANDS_HOOKS: { changed: (() => void) | null } = { changed: null };

// ------------------------------------------------------------------------------------------
// The panel API (not hot)
// ------------------------------------------------------------------------------------------

function row(weapon: HandWeapon, group: string): number {
  const w = WEAPON_INDEX[weapon];
  const g = GROUP_INDEX[group];
  if (w === undefined || g === undefined) throw new Error(`tuneHands: unknown row ${weapon} / ${group}`);
  return w * G + g;
}

function rowLive(r: number): void {
  const b = r * P;
  let live = 0;
  let elive = 0;
  for (let i = 0; i < P; i++) {
    if (VAL[b + i] !== DEF[i]) live = 1;
    if (EVAL[b + i] !== DEF[i]) elive = 1;
  }
  ROW_LIVE[r] = live;
  EROW_LIVE[r] = elive;
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
  EVAL[o] = handCompose(i, BASE[o]!, v);
  rowLive(r);
  return true;
}

export function handsGet(weapon: HandWeapon, group: string, param: number): number {
  return VAL[row(weapon, group) * P + param]!;
}

/** Set one param of one (weapon, state) row (clamped to its range, a non-finite value is refused). True if it changed. */
export function handsSet(weapon: HandWeapon, group: string, param: number, v: number): boolean {
  if (!Number.isFinite(v) || param < 0 || param >= P) return false;
  const ch = put(row(weapon, group), param, clampParam(param, v));
  if (ch) HANDS_HOOKS.changed?.();
  return ch;
}

export function handsReset(weapon: HandWeapon, group: string, param: number): void {
  handsSet(weapon, group, param, DEF[param]!);
}

export function handsResetGroup(weapon: HandWeapon, group: string): void {
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

export function handsChanged(weapon: HandWeapon, group: string, param: number): boolean {
  return VAL[row(weapon, group) * P + param] !== DEF[param];
}

export function handsGroupChanged(weapon: HandWeapon, group: string): boolean {
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
/**
 * The applied state the rig hooks read (preallocated, copied from the open rig's own state by `handsBeginRig`). `on`:
 * anything at all differs from identity. Per part flags so an untouched part skips its hook. Quaternions are x y z w.
 */
export interface HandsOut {
  on: boolean;
  /** Hand / foot IK target offsets live (body frame, metres): [handL, handR, footL, footR] x [fwd, up, out]. */
  hands: boolean;
  feet: boolean;
  readonly pos: Float64Array;
  /** Hand rotation per hand (index 0 right, 1 left; own frame, after the hand pose). */
  readonly rotOn: Uint8Array;
  readonly rotQ: Float64Array;
  /** The support hand on the gun: weapon-frame offset (slide folded into z; x is "out" for that hand) and rotation. */
  supOn: boolean;
  readonly sup: Float64Array;
  supRotOn: boolean;
  readonly supQ: Float64Array;
  /** Trigger finger: -1 off, 0 auto (the rig's own), 1 on. */
  trigger: number;
  /** IK targeting strength live (any limb below 1 after the ease; `ikStrength`). */
  ikOn: boolean;
  /** Hand closure offset per hand (mean finger curl, -1..1; index 0 right, 1 left). */
  readonly curl: Float64Array;
  curlOn: boolean;
}

function handsOut(): HandsOut {
  const rotQ = new Float64Array(8);
  rotQ[3] = rotQ[7] = 1;
  const supQ = new Float64Array(4);
  supQ[3] = 1;
  return { on: false, hands: false, feet: false, pos: new Float64Array(12), rotOn: new Uint8Array(2), rotQ, supOn: false, sup: new Float64Array(3), supRotOn: false, supQ, trigger: 0, ikOn: false, curl: new Float64Array(2), curlOn: false };
}

/** The applied state of the open window (copied from the rig's own `HandsRigState`; the rig hooks read it). */
export const HANDS_CUR: HandsOut = handsOut();

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
const gunVisual = (): GunVisual => ({ on: false, s: 1, tx: 0, ty: 0, tz: 0, qx: 0, qy: 0, qz: 0, qw: 1 });
export const HANDS_GUN: GunVisual = gunVisual();

/** (J1) One rig's applied values (eased toward its row) and what they derive to. Allocated once per rig. */
export interface HandsRigState {
  readonly cur: Float64Array;
  curAny: boolean;
  lastGun: boolean;
  /** The applied IK strengths [handL, handR, footL, footR]. */
  readonly ikCur: Float64Array;
  ikAny: boolean;
  gen: number;
  readonly out: HandsOut;
  readonly gun: GunVisual;
}

const D2R = Math.PI / 180;
const qBuf = new Float64Array(4);

export function handsRigState(): HandsRigState {
  const st: HandsRigState = { cur: new Float64Array(P), curAny: false, lastGun: false, ikCur: new Float64Array(4).fill(1), ikAny: false, gen: loadGen, out: handsOut(), gun: gunVisual() };
  st.cur.set(DEF);
  derive(st, false);
  return st;
}

function stateReset(st: HandsRigState): void {
  st.cur.set(DEF);
  st.curAny = false;
  st.lastGun = false;
  st.ikCur.fill(1);
  st.ikAny = false;
  derive(st, false);
  st.out.on = false;
  st.out.ikOn = false;
  st.gen = loadGen;
}

/** Rebuild a rig's derived quaternions and flags from its applied values (only when something moved). */
function derive(st: HandsRigState, gun: boolean): void {
  const CUR = st.cur;
  const c = st.out;
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
  // hand rotation: rotQ index 0 right, 1 left
  for (let h = 0; h < 2; h++) {
    const b = h === 0 ? HP.handRPitch! : HP.handLPitch!;
    const x = CUR[b]!;
    const y = CUR[b + 1]!;
    const z = CUR[b + 2]!;
    const on = x !== 0 || y !== 0 || z !== 0;
    c.rotOn[h] = on ? 1 : 0;
    eulerQuat(x * D2R, y * D2R, z * D2R, c.rotQ, h * 4);
  }
  const g = st.gun;
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

/** The open window's state (`ikStrength` reads its strengths). */
let act: HandsRigState | null = null;

/** Open the window on `st`: its applied state into `HANDS_CUR` / `HANDS_GUN` (a few dozen numbers, no allocation). */
function open(st: HandsRigState): void {
  const s = st.out;
  const d = HANDS_CUR;
  d.on = s.on;
  d.hands = s.hands;
  d.feet = s.feet;
  d.pos.set(s.pos);
  d.rotOn.set(s.rotOn);
  d.rotQ.set(s.rotQ);
  d.supOn = s.supOn;
  d.sup.set(s.sup);
  d.supRotOn = s.supRotOn;
  d.supQ.set(s.supQ);
  d.trigger = s.trigger;
  d.ikOn = s.ikOn;
  d.curl.set(s.curl);
  d.curlOn = s.curlOn;
  const g = st.gun;
  const h = HANDS_GUN;
  h.on = g.on;
  h.s = g.s;
  h.tx = g.tx;
  h.ty = g.ty;
  h.tz = g.tz;
  h.qx = g.qx;
  h.qy = g.qy;
  h.qz = g.qz;
  h.qw = g.qw;
  act = st;
}

const W_RIFLE = WEAPON_INDEX.rifle;
const W_PISTOL = WEAPON_INDEX.pistol;
const W_LAUNCHER = WEAPON_INDEX.launcher;

/** The module's own state (`handsBegin`: tests and tools). */
const OWN = handsRigState();

/**
 * The module's own window (tests, tools): ease toward the (weapon, state) row ('' = toward the defaults) over `dt`
 * seconds (the default `Infinity` jumps). No allocation.
 */
export function handsBegin(group: string, weapon: HandWeapon, dt = Number.POSITIVE_INFINITY): void {
  const g = group === '' ? undefined : GROUP_INDEX[group];
  handsBeginRig(OWN, g === undefined ? -1 : g, WEAPON_INDEX[weapon] ?? -1, dt);
}

/** (J1) A row's index (a body state, J2: or a move / action row; -1: '' or unknown) and a weapon's index, for `handsBeginRig`. Not hot. */
export function handsGroupIndex(group: string): number {
  return GROUP_INDEX[group] ?? -1;
}
export function handsWeaponIndex(weapon: HandWeapon): number {
  return WEAPON_INDEX[weapon] ?? -1;
}

/**
 * (J1) Before a rig's own `animate`: ease `st`'s applied values toward the effective row (body state `g`, weapon `w`;
 * -1 = toward the defaults) over `dt` seconds (exponential, `HAND_EASE_TAU`) and open the window on it. The trigger mode
 * switches at once. The gun params apply only to a gun (rifle, pistol, launcher). Nothing applied and nothing to apply:
 * the window stays off, no work. No allocation.
 */
export function handsBeginRig(st: HandsRigState, g: number, w: number, dt: number): void {
  handsBeginRigRows(st, g, w, NO_ROWS, NO_W, 0, dt);
}

const NO_ROWS = new Int16Array(0);
const NO_W = new Float64Array(0);
/** (J2) Per param: 0 adds, 1 multiplies (`x`: the gun scale), 2 the mode (the trigger). */
const UNIT_CODE = new Uint8Array(PARAMS.map((p) => (p.unit === 'x' ? 1 : p.unit === 'mode' ? 2 : 0)));
/** (J2) The live move rows of this frame (table row indices `w * G + row`, -1 none) and their weights. Scratch. */
const MR = new Int32Array(8);
const MW = new Float64Array(8);

/**
 * (anim-joints J2, A5) `handsBeginRig` with up to `n` move / action rows (`rows[k]` row indices into `TUNE_ROW_IDS`,
 * `wts[k]` 0..1) over the stance row `g`, same weapon: offsets stance + w x move, the gun scale stance x lerp(1, move, w),
 * the trigger mode the move row's when w >= 0.5 and it is not 0 (auto), the strongest first; IK strengths stance x
 * lerp(1, move, w). A move row with nothing set takes no part, so with none the target is the stance row exactly (J1).
 * No allocation.
 */
export function handsBeginRigRows(st: HandsRigState, g: number, w: number, rows: ArrayLike<number>, wts: ArrayLike<number>, n: number, dt: number): void {
  const gi = g < 0 || g >= G ? -1 : g;
  const r = gi < 0 || w < 0 || w >= W ? -1 : w * G + gi;
  const gun = w === W_RIFLE || w === W_PISTOL || w === W_LAUNCHER;
  HANDS_CUR.on = false;
  HANDS_CUR.ikOn = false;
  if (st.gen !== loadGen) stateReset(st);
  // (J1) dt 0 (a frozen game: the tuner's Pause, the chamber's pause) = at once, as the registry's sections
  const k = dt > 0 ? 1 - Math.exp(-dt / HAND_EASE_TAU) : 1;
  // (J2) the live move rows: hands / weapon (MR / MW from 0), IK (from 4)
  let mn = 0;
  let ikn = 0;
  for (let m = 0; m < n && m < 4; m++) {
    const row = rows[m]!;
    const lw = wts[m]!;
    if (!(lw > 0) || row < 0 || row >= G) continue;
    if (w >= 0 && w < W && EROW_LIVE[w * G + row] === 1) {
      MR[mn] = w * G + row;
      MW[mn] = lw > 1 ? 1 : lw;
      mn++;
    }
    if (IK_ELIVE[row] === 1) {
      MR[4 + ikn] = row;
      MW[4 + ikn] = lw > 1 ? 1 : lw;
      ikn++;
    }
  }
  const ik = ikEase(st, gi, k, ikn);
  if (!st.curAny && (r < 0 || EROW_LIVE[r] !== 1) && mn === 0) {
    // the common case: nothing applied, nothing to apply (the IK strengths alone may be live)
    st.out.on = ik;
    st.out.ikOn = ik;
    if (ik) open(st);
    return;
  }
  const CUR = st.cur;
  const b = r * P;
  let moved = gun !== st.lastGun;
  let any = false;
  for (let i = 0; i < P; i++) {
    let t = r >= 0 ? EVAL[b + i]! : DEF[i]!;
    if (mn > 0) {
      const u = UNIT_CODE[i]!;
      let modeSet = false;
      for (let m = 0; m < mn; m++) {
        const v = EVAL[MR[m]! * P + i]!;
        const lw = MW[m]!;
        if (u === 0) {
          if (v !== 0) t += lw * v;
        } else if (u === 1) {
          if (v !== 1) t *= 1 + (v - 1) * lw;
        } else if (!modeSet && lw >= 0.5 && v !== 0) {
          t = v;
          modeSet = true;
        }
      }
    }
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
  st.curAny = any;
  st.lastGun = gun;
  if (moved) derive(st, gun);
  st.out.on = (any && anyOn(st)) || ik;
  st.out.ikOn = ik;
  open(st);
}

/** (after `derive`) any part of the rig's state live. */
function anyOn(st: HandsRigState): boolean {
  const c = st.out;
  return c.hands || c.feet || c.rotOn[0] === 1 || c.rotOn[1] === 1 || st.gun.on || c.supOn || c.supRotOn || c.trigger !== 0 || c.curlOn;
}

// ------------------------------------------------------------------------------------------
// IK targeting strength per limb per state (Michael, via the coordinator): 1 = today's IK (identity)
// ------------------------------------------------------------------------------------------

export const IK_LIMBS = ['handL', 'handR', 'footL', 'footR'] as const;
export type IkLimb = 0 | 1 | 2 | 3;
export const IK_RANGE = { min: 0, max: 1, step: 0.05, def: 1 } as const;
/** Strength per [group][limb] (the tuner's delta): how much of the IK solution (hand on the gun / grip, planted foot) the limb keeps. */
const IK = new Float64Array(G * 4).fill(1);
const IK_LIVE = new Uint8Array(G);
/** (J1) The base table's strengths, and the effective ones (base x delta, clamped 0..1) the rigs apply. */
const IK_BASE = new Float64Array(G * 4).fill(1);
const IK_EFF = new Float64Array(G * 4).fill(1);
const IK_ELIVE = new Uint8Array(G);

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

function ikRowLive(g: number): void {
  const b = g * 4;
  IK_LIVE[g] = IK[b] !== 1 || IK[b + 1] !== 1 || IK[b + 2] !== 1 || IK[b + 3] !== 1 ? 1 : 0;
  for (let l = 0; l < 4; l++) IK_EFF[b + l] = clamp01(IK_BASE[b + l]! * IK[b + l]!);
  IK_ELIVE[g] = IK_EFF[b] !== 1 || IK_EFF[b + 1] !== 1 || IK_EFF[b + 2] !== 1 || IK_EFF[b + 3] !== 1 ? 1 : 0;
}

function ikPut(g: number, limb: number, v: number): boolean {
  const o = g * 4 + limb;
  if (IK[o] === v) return false;
  IK[o] = v;
  ikRowLive(g);
  return true;
}

function gIdx(group: string): number {
  const g = GROUP_INDEX[group];
  if (g === undefined) throw new Error(`tuneHands: unknown group ${group}`);
  return g;
}

export function ikGet(group: string, limb: IkLimb): number {
  return IK[gIdx(group) * 4 + limb]!;
}

/** Set one limb's IK strength in one state (clamped 0..1, a non-finite value is refused). True if it changed. */
export function ikSet(group: string, limb: IkLimb, v: number): boolean {
  if (!Number.isFinite(v) || limb < 0 || limb > 3) return false;
  const ch = ikPut(gIdx(group), limb, Math.max(IK_RANGE.min, Math.min(IK_RANGE.max, v)));
  if (ch) HANDS_HOOKS.changed?.();
  return ch;
}

export function ikReset(group: string, limb: IkLimb): void {
  ikSet(group, limb, 1);
}

export function ikResetGroup(group: string): void {
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

export function ikGroupChanged(group: string): boolean {
  return IK_LIVE[gIdx(group)] === 1;
}

/**
 * Ease a rig's applied strengths toward group `g`'s effective row (-1: toward 1), (J2) times lerp(1, move, w) for each of
 * the `ikn` live move rows in `MR` / `MW` from 4. True when any limb is below 1.
 */
function ikEase(st: HandsRigState, g: number, k: number, ikn: number): boolean {
  if (!st.ikAny && (g < 0 || IK_ELIVE[g] !== 1) && ikn === 0) return false;
  const IK_CUR = st.ikCur;
  let any = false;
  for (let l = 0; l < 4; l++) {
    let t = g >= 0 ? IK_EFF[g * 4 + l]! : 1;
    for (let m = 0; m < ikn; m++) {
      const v = IK_EFF[MR[4 + m]! * 4 + l]!;
      if (v !== 1) t *= 1 + (v - 1) * MW[4 + m]!;
    }
    let c = IK_CUR[l]!;
    if (c !== t) {
      c += (t - c) * k;
      if (Math.abs(t - c) < SNAP_EPS) c = t;
      IK_CUR[l] = c;
    }
    if (c !== 1) any = true;
  }
  st.ikAny = any;
  return any;
}

/**
 * (one-line rig hook, after a limb's IK solve and before item 1's joint offsets) Blend the limb's local rotations from
 * the IK solution toward the rest pose (identity) by 1 - strength, so at 0 the limb is pure FK: rest + item 1's joint
 * offsets. Strength 1 (the default) touches nothing. No allocation.
 */
export function ikStrength(limb: IkLimb, a: QuatLike, b: QuatLike, c: QuatLike): void {
  if (!HANDS_CUR.ikOn || !act) return;
  const s = act.ikCur[limb]!;
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

/** After the rig's `animate` (closes whichever window is open). */
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
      (values[HAND_WEAPONS[w]!] ??= {})[TUNE_ROW_IDS[g]!] = out;
    }
  }
  const snap: HandsSnapshot = { version: 1, values };
  for (let g = 0; g < G; g++) {
    if (IK_LIVE[g] !== 1) continue;
    const b = g * 4;
    (snap.ik ??= {})[TUNE_ROW_IDS[g]!] = [IK[b]!, IK[b + 1]!, IK[b + 2]!, IK[b + 3]!];
  }
  return snap;
}

/** Load a snapshot: every value back to its default first; unknown weapons / groups / params and bad numbers skipped. */
export function handsLoad(s: unknown): void {
  for (let r = 0; r < W * G; r++) {
    VAL.set(DEF, r * P);
    for (let i = 0; i < P; i++) EVAL[r * P + i] = handCompose(i, BASE[r * P + i]!, DEF[i]!);
    rowLive(r);
  }
  IK.fill(1);
  for (let g = 0; g < G; g++) ikRowLive(g);
  loadGen++; // a load jumps (no ease from the old values), on every rig
  HANDS_CUR.on = false;
  HANDS_CUR.ikOn = false;
  if (!s || typeof s !== 'object') return;
  const ikv = (s as Partial<HandsSnapshot>).ik;
  if (ikv && typeof ikv === 'object') {
    for (const [gName, v] of Object.entries(ikv)) {
      const g = GROUP_INDEX[gName];
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
      const g = GROUP_INDEX[gName];
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

// ------------------------------------------------------------------------------------------
// (anim-joints J1) The base table (`animBase.ts`): loaded at start, or by the dev hook
// ------------------------------------------------------------------------------------------

/**
 * Load the base table's Hands & feet / Weapon values (weapon -> row -> param id -> value) and IK strengths (row ->
 * [handL, handR, footL, footR]): every base value back to its default first, then the known weapons, rows and params (by
 * id); the effective rows are rebuilt and every rig jumps. Returns the unknown names (skipped).
 */
export function handsBaseLoad(hands: unknown, ik: unknown): string[] {
  const unknown: string[] = [];
  for (let r = 0; r < W * G; r++) BASE.set(DEF, r * P);
  IK_BASE.fill(1);
  if (hands && typeof hands === 'object') {
    for (const [wName, rows] of Object.entries(hands as Record<string, unknown>)) {
      const w = WEAPON_INDEX[wName as HandWeapon];
      if (w === undefined || !rows || typeof rows !== 'object') {
        unknown.push(wName);
        continue;
      }
      for (const [gName, rv] of Object.entries(rows as Record<string, unknown>)) {
        const g = GROUP_INDEX[gName];
        if (g === undefined || !rv || typeof rv !== 'object') {
          unknown.push(`${wName}.${gName}`);
          continue;
        }
        for (const [pid, v] of Object.entries(rv as Record<string, unknown>)) {
          const i = HP[pid];
          if (i === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
            unknown.push(`${wName}.${gName}.${pid}`);
            continue;
          }
          BASE[(w * G + g) * P + i] = PARAMS[i]!.unit === 'mode' ? Math.max(-1, Math.min(1, Math.round(v))) + 0 : v;
        }
      }
    }
  }
  if (ik && typeof ik === 'object') {
    for (const [gName, v] of Object.entries(ik as Record<string, unknown>)) {
      const g = GROUP_INDEX[gName];
      if (g === undefined || !Array.isArray(v)) {
        unknown.push(`ik.${gName}`);
        continue;
      }
      for (let l = 0; l < 4; l++) {
        const n: unknown = v[l];
        if (typeof n === 'number' && Number.isFinite(n)) IK_BASE[g * 4 + l] = clamp01(n);
      }
    }
  }
  for (let r = 0; r < W * G; r++) {
    for (let i = 0; i < P; i++) EVAL[r * P + i] = handCompose(i, BASE[r * P + i]!, VAL[r * P + i]!);
    rowLive(r);
  }
  for (let g = 0; g < G; g++) ikRowLive(g);
  loadGen++;
  return unknown;
}

/** The base table's value of one param. */
export function handsBaseGet(weapon: HandWeapon, group: string, param: number): number {
  return BASE[row(weapon, group) * P + param]!;
}

/** The effective value of one param (base composed with the delta): what every Wren rig applies. */
export function handsEffective(weapon: HandWeapon, group: string, param: number): number {
  return EVAL[row(weapon, group) * P + param]!;
}

/** The base table's IK strength of one limb, and the effective one (base x delta, 0..1). */
export function ikBaseGet(group: string, limb: IkLimb): number {
  return IK_BASE[gIdx(group) * 4 + limb]!;
}
export function ikEffective(group: string, limb: IkLimb): number {
  return IK_EFF[gIdx(group) * 4 + limb]!;
}

/** True when any row has an effective value (base or delta) off its default. Not hot. */
export function handsAnyLive(): boolean {
  for (let r = 0; r < W * G; r++) if (EROW_LIVE[r] === 1) return true;
  for (let g = 0; g < G; g++) if (IK_ELIVE[g] === 1) return true;
  return false;
}

{
  const bad = handsBaseLoad(ANIM_BASE.hands, ANIM_BASE.ik);
  if (bad.length) console.warn(`animBase: unknown Hands / Weapon / IK rows or params skipped: ${bad.join(', ')}`);
}
