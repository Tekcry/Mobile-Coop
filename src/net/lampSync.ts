import { hyp3 } from '../core/mathx';
import { lightOnRay, type LightDef, type LightRegistry } from '../world/lights';

/**
 * (sector-redesign slice L, EW7, protocol 31) Sector Ops co-op light state: the host's fixed lights reach the client as
 * one compact snapshot, the `lamps` message (host -> all): `n` lights by registry id, `of` a bitset of the lights its
 * switches have off, `sh` a bitset of the lights shot out (6 lights a character, `ABC`). Sent on a change, on a join /
 * rejoin, and every `LAMP_KEEPALIVE` s. A jam is not in it: the jam's timeline already rides `sector.sec.dv` (protocol
 * 26) and the registry keeps the base state under a jam (`jamStart` / `jamLit` / `jamEnd`), so the snapshot carries the
 * base (`baseOn`, jam left out) and the client's jam mirror keeps the flicker: both pages end a jam on the same base.
 * Flashlights (the guards' torch slots, `torchMirror.ts`) are left out. Pure (no Babylon): host and client both use it;
 * reading, comparing and applying allocate nothing (only an encode for a send builds its strings).
 */

/** Lights a `lamps` message can carry (registry ids 0..LAMP_MAX-1; warehouseOps has 133). */
export const LAMP_MAX = 1024;
/** Characters a bitset can take (`LAMP_MAX` / 6, rounded up). */
export const LAMP_CHARS = Math.ceil(LAMP_MAX / 6);
/** Seconds between unchanged snapshots (a late joiner or a lost update is right within this). */
export const LAMP_KEEPALIVE = 2;

/** Per light state: on by its switches, switched off, shot out. */
export const LAMP_ON = 0;
export const LAMP_OFF = 1;
export const LAMP_SHOT = 2;

/** The `lamps` message body. */
export interface LampWire {
  n: number;
  of: string;
  sh: string;
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** Char code -> 6-bit value (-1 not in `ABC`). */
const VAL = new Int8Array(128).fill(-1);
for (let i = 0; i < ABC.length; i++) VAL[ABC.charCodeAt(i)] = i;
/** A bitset string the parser accepts. */
export const LAMP_BITS = /^[A-Za-z0-9_-]*$/;

/** The state of one light now (a flashlight reads on: it is never synced). */
export function lampState(reg: LightRegistry, l: LightDef): number {
  if (l.kind === 'flashlight') return LAMP_ON;
  return l.destroyed ? LAMP_SHOT : reg.baseOn(l) ? LAMP_ON : LAMP_OFF;
}

/** Fill `out` with every light's state by registry id; returns how many. No allocation. */
export function readLamps(reg: LightRegistry, out: Uint8Array): number {
  const ls = reg.lights;
  const n = Math.min(ls.length, out.length, LAMP_MAX);
  for (let i = 0; i < n; i++) out[i] = lampState(reg, ls[i]!);
  return n;
}

function bits(st: Uint8Array, n: number, code: number): string {
  let s = '';
  for (let c = 0; c < n; c += 6) {
    let v = 0;
    for (let k = 0; k < 6 && c + k < n; k++) if (st[c + k] === code) v |= 1 << k;
    s += ABC[v]!;
  }
  return s;
}

/** The wire for `n` states (a send only). */
export function encodeLamps(st: Uint8Array, n: number): LampWire {
  return { n, of: bits(st, n, LAMP_OFF), sh: bits(st, n, LAMP_SHOT) };
}

function bitAt(s: string, i: number): boolean {
  const c = (i / 6) | 0;
  if (c >= s.length) return false;
  const code = s.charCodeAt(c);
  const v = code < 128 ? VAL[code]! : -1;
  return v > 0 && (v & (1 << i % 6)) !== 0;
}

/** Decode a wire into `out` (shot wins over off); returns how many states. No allocation. */
export function decodeLamps(w: LampWire, out: Uint8Array): number {
  const n = Math.max(0, Math.min(w.n | 0, out.length, LAMP_MAX));
  for (let i = 0; i < n; i++) out[i] = bitAt(w.sh, i) ? LAMP_SHOT : bitAt(w.of, i) ? LAMP_OFF : LAMP_ON;
  return n;
}

/**
 * Put `n` states on a registry (the co-op client). A shot lamp is killed (`onShot` fires for the cue: sparks), a lamp
 * back from a shot or switched takes the base through `resetTo`, which keeps a running jam's flicker (the jam mirror
 * ends it on this base). Lights the registry does not have, and flashlights, are skipped. Returns how many changed.
 * No allocation.
 */
export function applyLamps(reg: LightRegistry, st: Uint8Array, n: number, onShot?: (l: LightDef) => void): number {
  const ls = reg.lights;
  const m = Math.min(n, ls.length);
  let changed = 0;
  for (let i = 0; i < m; i++) {
    const l = ls[i]!;
    if (l.kind === 'flashlight') continue;
    const want = st[i]!;
    if (want === lampState(reg, l)) continue;
    if (want === LAMP_SHOT) {
      reg.kill(i);
      onShot?.(l);
    } else reg.resetTo(i, want === LAMP_ON, false);
    changed++;
  }
  return changed;
}

/** A client's lamp shot (a `shot` with target `lt-<id>`): its round left within this of the shooter's chest (m). */
export const LAMP_SHOT_ORIGIN = 2;
/** Slack (m) of the host's static line-of-sight check from the round's origin to the lamp (a fitting under a slab). */
export const LAMP_LOS_SLACK = 0.6;
/** The `shot` target naming a light (the jam devices' `lt-<registry id>`, the same on both pages). */
export const LAMP_TARGET = 'lt-';

/** The light id of a `shot` target, or -1 when it names none. */
export function lampTargetId(target: string): number {
  if (!target.startsWith(LAMP_TARGET)) return -1;
  const s = target.slice(LAMP_TARGET.length);
  if (!/^[0-9]{1,4}$/.test(s)) return -1;
  const id = Number(s);
  return id < LAMP_MAX ? id : -1;
}

/** (39, LR16-5b) The `shot` target naming a swinging pendant a client's round passed (`sw-<registry id>`). */
export const SWAY_TARGET = 'sw-';

/** The pendant light id of a `shot` target, or -1 when it names none. */
export function swayTargetId(target: string): number {
  if (!target.startsWith(SWAY_TARGET)) return -1;
  const s = target.slice(SWAY_TARGET.length);
  if (!/^[0-9]{1,4}$/.test(s)) return -1;
  const id = Number(s);
  return id < LAMP_MAX ? id : -1;
}

interface P3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Host: is a client's lamp shot good? The light exists, can be shot and is not out; the round left from the shooter's
 * body (`LAMP_SHOT_ORIGIN` of the chest, feet + 1.2 m); and the host's own registry puts that light first along the
 * claimed ray within the weapon's range (`lightOnRay`, the host's own shot test). The wall check is the caller's
 * (physics). Pure, no allocation.
 */
export function lampShotOk(reg: LightRegistry, id: number, o: P3, d: P3, dist: number, feet: P3, range: number): boolean {
  const l = reg.lights[id];
  if (!l || l.kind === 'flashlight' || !l.destructible || l.destroyed) return false;
  if (hyp3(o.x - feet.x, o.y - (feet.y + 1.2), o.z - feet.z) > LAMP_SHOT_ORIGIN) return false;
  // the claimed landing first (`lightOnRay` measures the mount reach at the segment end), then 0.3 m on for rounding
  const end = Math.min(dist, range);
  if (lightOnRay(reg, o.x, o.y, o.z, o.x + d.x * end, o.y + d.y * end, o.z + d.z * end) === id) return true;
  const len = end + 0.3;
  return lightOnRay(reg, o.x, o.y, o.z, o.x + d.x * len, o.y + d.y * len, o.z + d.z * len) === id;
}

/**
 * (39, LR16-5b) Host: is a client's pendant shot (`sw-<id>`) worth testing? The light is a swinging pendant on this map
 * and the round left from the shooter's body (`LAMP_SHOT_ORIGIN` of the chest). Returns the pendant index, or -1. The
 * kick itself is the host's own test on the claimed segment (`SwaySet.shotKickOne`); the wall check is the caller's
 * (physics). Pure, no allocation.
 */
export function swayShotOk(reg: LightRegistry, id: number, o: P3, feet: P3): number {
  const s = reg.sway;
  if (!s) return -1;
  const k = s.indexOf(id);
  if (k < 0) return -1;
  return hyp3(o.x - feet.x, o.y - (feet.y + 1.2), o.z - feet.z) > LAMP_SHOT_ORIGIN ? -1 : k;
}

/** Host: decides when a `lamps` message goes (a change, a forced send, the keepalive). */
export class LampSender {
  private readonly cur = new Uint8Array(LAMP_MAX);
  private readonly sent = new Uint8Array(LAMP_MAX);
  private sentN = -1;
  private ver = -1;
  private t = 0;
  /** Messages built (tests). */
  sends = 0;

  /** Next step: the wire to send now, or null. `force`: a join, a rejoin. Allocation-free unless it sends. */
  step(reg: LightRegistry, dt: number, force = false): LampWire | null {
    this.t -= dt;
    const due = force || this.t <= 0;
    // nothing moved in the registry (its version bumps on every change, a jam's flicker included)
    if (!due && reg.version === this.ver) return null;
    this.ver = reg.version;
    const n = readLamps(reg, this.cur);
    if (!due && n === this.sentN) {
      let same = true;
      for (let i = 0; i < n; i++) {
        if (this.cur[i] !== this.sent[i]) {
          same = false;
          break;
        }
      }
      if (same) return null;
    }
    for (let i = 0; i < n; i++) this.sent[i] = this.cur[i]!;
    this.sentN = n;
    this.t = LAMP_KEEPALIVE;
    this.sends++;
    return encodeLamps(this.cur, n);
  }
}

/** Client: the host's snapshot on this page's registry. */
export class LampMirror {
  private readonly st = new Uint8Array(LAMP_MAX);
  /** Snapshots taken (tests / e2e). */
  got = 0;

  apply(reg: LightRegistry, w: LampWire, onShot?: (l: LightDef) => void): number {
    this.got++;
    return applyLamps(reg, this.st, decodeLamps(w, this.st), onShot);
  }
}
