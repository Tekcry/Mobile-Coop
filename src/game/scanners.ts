/**
 * Paired retinal scanners (CT prototype B6, CT's two-key action, digest 1.8). Pure (no Babylon / DOM), unit-tested.
 * Every number is a prototype starting value (G10); the sync window never scales with difficulty (G131).
 *
 * Each player starts a hack at their own panel (A once); the hack runs `hack` seconds while the player stays at the
 * panel. A finished hack is `ready` and waits for the other panel. Both ready within `window` seconds of each other:
 * both `done`, the door opens. A hack aborted early (the player walked off or went down) or the window running out
 * resets both panels and costs the failing player `cost` health (never below `floorHp`). A partner who never started
 * (the other panel idle when the window runs out) resets both at no cost (Michael, 2026-10-19). It never ends the run.
 */

export const SCANNER = {
  /** Seconds a hack takes at the panel. */
  hack: 2.0,
  /** Forgiving sync window (s) between the two hacks finishing. Never scaled by difficulty (G131). */
  window: 1.5,
  /** Health a failed hack costs the failing player. */
  cost: 10,
  /** A failed hack never takes a player below this. */
  floorHp: 1,
  /** Horizontal distance (m) from the panel a hacking player must stay within. */
  reach: 2.0,
} as const;

export const SC_IDLE = 0;
export const SC_HACKING = 1;
export const SC_READY = 2;
export const SC_DONE = 3;
export type ScanPhase = 0 | 1 | 2 | 3;

export interface ScanPair {
  /** Phase of panel A / B. */
  ph: [ScanPhase, ScanPhase];
  /** Hack progress (s) of panel A / B. */
  t: [number, number];
  /** Player hacking / holding panel A / B (-1 none). */
  who: [number, number];
  /** Clock time panel A / B became ready (-1 none). */
  at: [number, number];
  clock: number;
  open: boolean;
}

/** What a step did (one per step at most). */
export interface ScanResult {
  kind: 'none' | 'open' | 'fail';
  /** fail: the player who pays (-1 none: 'alone'). */
  who: number;
  /** fail: 'abort' (left the panel early), 'late' (the window ran out) or 'alone' (the partner never started: no cost). */
  why: 'abort' | 'late' | 'alone' | '';
}

export function newScanPair(): ScanPair {
  return { ph: [SC_IDLE, SC_IDLE], t: [0, 0], who: [-1, -1], at: [-1, -1], clock: 0, open: false };
}

export function newScanResult(): ScanResult {
  return { kind: 'none', who: -1, why: '' };
}

export const REFUSE_SCAN_BUSY = 'That scanner is busy';
export const REFUSE_SCAN_OTHER = 'You are already on the other scanner';

/** Player `p` starts a hack at panel `k` (0 A, 1 B). Returns a refusal or null. `solo`: one player may work both. */
export function scanStart(s: ScanPair, k: 0 | 1, p: number, solo = false): string | null {
  if (s.open) return null;
  if (s.ph[k] !== SC_IDLE) return s.who[k] === p ? null : REFUSE_SCAN_BUSY;
  const o = k === 0 ? 1 : 0;
  if (!solo && s.who[o] === p && s.ph[o] !== SC_IDLE) return REFUSE_SCAN_OTHER;
  s.ph[k] = SC_HACKING;
  s.t[k] = 0;
  s.who[k] = p;
  s.at[k] = -1;
  return null;
}

/** Reset both panels to idle (a failed sync). */
export function scanReset(s: ScanPair): void {
  for (let k = 0; k < 2; k++) {
    s.ph[k] = SC_IDLE;
    s.t[k] = 0;
    s.who[k] = -1;
    s.at[k] = -1;
  }
}

function fail(s: ScanPair, out: ScanResult, who: number, why: 'abort' | 'late' | 'alone'): ScanResult {
  scanReset(s);
  out.kind = 'fail';
  out.who = who;
  out.why = why;
  return out;
}

/**
 * Advance the pair by `dt`. `atA` / `atB`: the player on that panel is still there and alive (the caller measures it).
 * `solo`: one ready panel opens (dev flag only). Writes into `out` (no allocation) and returns it.
 */
export function scanStep(s: ScanPair, dt: number, atA: boolean, atB: boolean, out: ScanResult, solo = false): ScanResult {
  out.kind = 'none';
  out.who = -1;
  out.why = '';
  if (s.open) return out;
  s.clock += dt;
  for (let k = 0; k < 2; k++) {
    if (s.ph[k] !== SC_HACKING) continue;
    if (!(k === 0 ? atA : atB)) return fail(s, out, s.who[k]!, 'abort');
    s.t[k] = s.t[k]! + dt;
    if (s.t[k]! >= SCANNER.hack) {
      s.t[k] = SCANNER.hack;
      s.ph[k] = SC_READY;
      s.at[k] = s.clock;
    }
  }
  const ra = s.ph[0] === SC_READY;
  const rb = s.ph[1] === SC_READY;
  if ((ra && rb && Math.abs(s.at[0] - s.at[1]) <= SCANNER.window + 1e-9) || (solo && (ra || rb))) {
    s.ph[0] = SC_DONE;
    s.ph[1] = SC_DONE;
    s.open = true;
    out.kind = 'open';
    return out;
  }
  if (ra && rb) return fail(s, out, s.at[0] > s.at[1] ? s.who[0] : s.who[1], 'late');
  if (ra !== rb) {
    const k = ra ? 0 : 1;
    const o = ra ? 1 : 0;
    if (s.clock - s.at[k] > SCANNER.window + 1e-9) {
      // the late panel's player pays; nobody started it: both reset at no cost (Michael, 2026-10-19)
      return s.ph[o] === SC_HACKING ? fail(s, out, s.who[o], 'late') : fail(s, out, -1, 'alone');
    }
  }
  return out;
}

/** Seconds left in the sync window while exactly one panel is ready (0 otherwise). */
export function scanWindowLeft(s: ScanPair): number {
  const ra = s.ph[0] === SC_READY;
  const rb = s.ph[1] === SC_READY;
  if (ra === rb) return 0;
  return Math.max(0, SCANNER.window - (s.clock - s.at[ra ? 0 : 1]));
}

/** The health a failed hack takes from a player at `hp` (never below the floor). */
export function scanDamage(hp: number): number {
  return Math.max(0, Math.min(SCANNER.cost, hp - SCANNER.floorHp));
}

/** The ready light: both players stand at their panels (the pair can count down together). */
export function scanPairReady(atA: boolean, atB: boolean): boolean {
  return atA && atB;
}

export const SCAN_LABEL: readonly string[] = ['idle', 'hacking', 'ready', 'done'];

/** A scanner pair on a map: two course device ids and the course flag both hacks in sync set. */
export interface ScannerDef {
  id: string;
  a: string;
  b: string;
  flag: string;
}

/**
 * (marlow-final N6) Where a panel's glows sit, from its course device: the state glow `state` m and the ready glow
 * `ready` m above the device's floor (`y`), on the panel face `back` m behind the device point along its facing
 * (sin yaw, cos yaw; yaw 0 faces +z, the `buildPanel` convention). Marlow's station 6 (devices at z 0.4 yaw 0 and
 * z 13.6 yaw pi) gives the old hard-coded z 0.3 / 13.7.
 */
export const SCAN_GLOW = { back: 0.1, state: 1.95, ready: 2.25 } as const;

/** (N6) The panel face point (floor level) of a scanner device into `out`. No allocation. */
export function scanGlowAt(x: number, y: number, z: number, yaw: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = x - Math.sin(yaw) * SCAN_GLOW.back;
  out.y = y;
  out.z = z - Math.cos(yaw) * SCAN_GLOW.back;
  return out;
}

/** (N6) Numbers per pair in `SecWire.sc`: [phase A, phase B, occupied bits (1 A, 2 B), progress A, B (tenths of s)]. */
export const SCAN_WIRE_LEN = 5;

/** (N6) One pair's `SecWire.sc` entry (the host's `wire`, which builds the message: allocates once per send). */
export function packScan(pr: ScanPair, occ: number): number[] {
  return [pr.ph[0], pr.ph[1], occ, Math.round(pr.t[0] * 10), Math.round(pr.t[1] * 10)];
}

/** (N6) Client: put one `SecWire.sc` entry on the mirrored pair; returns the occupied bits. No allocation. */
export function unpackScan(e: readonly number[], pr: ScanPair): number {
  for (let k = 0; k < 2; k++) {
    const ph = e[k] ?? 0;
    pr.ph[k] = (ph >= SC_IDLE && ph <= SC_DONE ? ph : SC_IDLE) as ScanPhase;
    pr.t[k] = (e[3 + k] ?? 0) / 10;
  }
  pr.open = pr.ph[0] === SC_DONE && pr.ph[1] === SC_DONE;
  return e[2] ?? 0;
}
