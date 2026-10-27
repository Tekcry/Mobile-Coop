/**
 * (mission-framework EN1) The mission's part of the host's `sector` message (PLAN section 3: `ms?: MissionWire`; pure,
 * Babylon-free, no net imports). Plain numbers and strings only: NET puts it on the wire and calls `parseMissionWire`
 * in its validation; this file changes no protocol. Host-authoritative: the client never evaluates steps or rules, it
 * applies the done bits and facts (`applyMissionWire`) and says `rl` when `rb` moves on. Late joiners read the next one.
 */
import { MISSION } from './missionDef';
import type { MissionRunner } from './missionRunner';
import { SCOPE_A, SCOPE_B, SCOPE_MISSION, type RuleTracker } from './ruleTracker';
import { parsePct } from './campaignRating';

export interface MissionWire {
  /** MissionDef id. */
  id: string;
  /** Done bits by step index, per team: [team a's steps, team b's, team all's]. */
  st: number[];
  /** Fact bits (`MissionRunner.facts` order). */
  f: number;
  /** Rule-break counter (the client says `rl` when it moves on). */
  rb: number;
  /** The last break's radio line. */
  rl: string;
  /** Rules never broken, bits by rule index, per scope: [mission, a, b]. */
  rk: number[];
  /** (campaign-mode CM5) A campaign mission's rating, 0-100, set once in the last `ms` at the end (the client records
   *  its own progress from it). Absent: none (every other send, and every older host). */
  pc?: number;
}

/** Wire limits (`parseMissionWire` clamps / rejects past them). */
export const MISSION_WIRE = {
  idMax: 64,
  lineMax: 120,
  /** Step and fact bits. */
  bits: (1 << MISSION.stepsWireMax) - 1,
  /** Rule bits (rules <= 2 per scope, 3 scopes: 6; room for 8). */
  ruleBits: 0xff,
  rbMax: 1_000_000,
} as const;

const TEAM_ORDER = ['a', 'b', 'all'] as const;

/** Host: pack the runner and the tracker (every 0.5 s or on a change, like the rest of the sector extra; allocates). */
export function packMission(runner: MissionRunner, tracker: RuleTracker): MissionWire {
  const steps = runner.def.steps;
  const st = [0, 0, 0];
  for (let i = 0; i < steps.length && i < MISSION.stepsWireMax; i++) {
    if (!runner.isDone(i)) continue;
    const t = TEAM_ORDER.indexOf(steps[i]!.team);
    st[t < 0 ? 2 : t]! |= 1 << i;
  }
  return {
    id: runner.def.id,
    st,
    f: runner.factBits & MISSION_WIRE.bits,
    rb: tracker.breaks,
    rl: tracker.line.slice(0, MISSION_WIRE.lineMax),
    rk: [tracker.kept(SCOPE_MISSION), tracker.kept(SCOPE_A), tracker.kept(SCOPE_B)],
  };
}

function bitsOf(v: unknown, mask: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v & mask : null;
}

function bitList(v: unknown, mask: number): number[] | null {
  if (!Array.isArray(v) || v.length > 3) return null;
  const out = [0, 0, 0];
  for (let i = 0; i < v.length; i++) {
    const b = bitsOf(v[i], mask);
    if (b === null) return null;
    out[i] = b;
  }
  return out;
}

/** Client (NET's validation): a received `ms` as a clean MissionWire, null when malformed. Strings are cut, bits masked. */
export function parseMissionWire(raw: unknown): MissionWire | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > MISSION_WIRE.idMax) return null;
  const st = bitList(o.st, MISSION_WIRE.bits);
  const f = bitsOf(o.f, MISSION_WIRE.bits);
  const rk = bitList(o.rk, MISSION_WIRE.ruleBits);
  if (!st || f === null || !rk) return null;
  if (typeof o.rb !== 'number' || !Number.isInteger(o.rb) || o.rb < 0) return null;
  if (typeof o.rl !== 'string') return null;
  const w: MissionWire = { id: o.id, st, f, rb: Math.min(o.rb, MISSION_WIRE.rbMax), rl: o.rl.slice(0, MISSION_WIRE.lineMax), rk };
  // (campaign-mode CM5) a percent that is not a whole 0-100 is dropped, the rest of the wire kept
  const pc = parsePct(o.pc);
  if (pc !== null) w.pc = pc;
  return w;
}

/** Every done bit of a wire (its teams' bits together). */
export function wireDoneBits(w: MissionWire): number {
  let b = 0;
  for (let i = 0; i < w.st.length; i++) b |= w.st[i]!;
  return b;
}

/**
 * Client: apply the host's state to its runner (same mission id). A done bit for a step of another team than the one
 * it came under is dropped. True when the runner changed.
 */
export function applyMissionWire(runner: MissionRunner, w: MissionWire): boolean {
  if (w.id !== runner.def.id) return false;
  const steps = runner.def.steps;
  let done = 0;
  for (let i = 0; i < steps.length && i < MISSION.stepsWireMax; i++) {
    const t = TEAM_ORDER.indexOf(steps[i]!.team);
    const bits = w.st[t < 0 ? 2 : t] ?? 0;
    if ((bits >>> i) & 1) done |= 1 << i;
  }
  return runner.applyWire(done, w.f);
}

/** Was rule `i` kept in `scope` (SCOPE_MISSION / SCOPE_A / SCOPE_B) per the wire? (The rating card's `rules` row.) */
export function wireKept(w: MissionWire, scope: number, i: number): boolean {
  return (((w.rk[scope] ?? 0) >>> i) & 1) === 1;
}

/** (campaign-mode CM5) How many of the mission's rules were never broken, from the wire's `rk` (each rule's bit sits in
 *  its own scope's word, so the words OR together). */
export function rulesKeptCount(w: Pick<MissionWire, 'rk'>): number {
  let b = 0;
  for (let i = 0; i < w.rk.length; i++) b |= w.rk[i]!;
  let n = 0;
  for (; b; b &= b - 1) n++;
  return n;
}
