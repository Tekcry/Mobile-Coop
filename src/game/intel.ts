/**
 * (CT Core spare 9) Interrogation intel, pure: a guard with information also gives door codes (authored per guard), and
 * the cameras and patrols near where he is held (derived). Babylon-free; the world reads live in `intelReveal.ts`.
 */
import type { GuardInfo } from '../ai/guardInfo';
import { PATROL, type PatrolRoute } from '../ai/patrol';
import { hyp2 } from '../core/mathx';
import type { JointIntel } from './jointInterrogation';

export const INTEL = { reach: 30, camDyMin: -1, camDyMax: 4.5, guardDy: 2, lineMax: 60, labelMax: 40, donePh: 0.8 } as const;

export interface IntelCode {
  readonly flag: string;
  readonly label: string;
}

/** A guard's authored information with door codes (map data: declare `const X: GuardIntel = {...}` then `info: X`). */
export interface GuardIntel extends GuardInfo {
  readonly codes?: readonly IntelCode[];
  /** (joint-interrogation, G148) Lines given only to a joint read (a partner's live bluff), and their course flag. */
  readonly joint?: JointIntel;
}

/** What the patrol intel reads off a guard: `Enemy` satisfies it, the route through the Guard AI getter
 *  `Enemy.patrolRoute` (src/ai/enemy.ts; null: he stands a post). */
export interface PatrolSource {
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  readonly alive: boolean;
  readonly ko: boolean;
  readonly taken: boolean;
  readonly def: { readonly walkSpeed: number; readonly quadruped: boolean };
  readonly patrolRoute: PatrolRoute | null;
}

export interface IntelCam {
  x: number;
  y: number;
  z: number;
  cycle: number;
  live: boolean;
}

export interface IntelGuard {
  x: number;
  y: number;
  z: number;
  up: boolean;
  route: PatrolRoute | null;
  speed: number;
}

export interface IntelResult {
  lines: string[];
  codes: string[];
  cams: number;
  patrols: number;
}

export function intelCodes(info: GuardInfo | null | undefined): readonly IntelCode[] {
  return (info as GuardIntel | null | undefined)?.codes ?? [];
}

export function checkIntel(info: GuardIntel): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const c of info.codes ?? []) {
    if (!c.flag) errs.push('intel code with an empty flag');
    if (!c.label) errs.push(`intel code ${c.flag}: empty label`);
    else if (c.label.length > INTEL.labelMax) errs.push(`intel code ${c.flag}: label over ${INTEL.labelMax} characters`);
    if (seen.has(c.flag)) errs.push(`intel code ${c.flag}: duplicate flag`);
    seen.add(c.flag);
  }
  return errs;
}

/** A guard as the patrol intel sees him: standing (alive, not KO'd, not held, not a dog), his route from
 *  `patrolRoute` and his unaware walk speed (`def.walkSpeed` x `pace`, the patrol pace `PACE.patrol`). */
export function intelGuard(e: PatrolSource, pace: number): IntelGuard {
  return { x: e.pos.x, y: e.pos.y, z: e.pos.z, up: e.alive && !e.ko && !e.taken && !e.def.quadruped, route: e.patrolRoute, speed: e.def.walkSpeed * pace };
}

/** Seconds for one full patrol circuit, pauses included (0: no circuit, a post). */
export function patrolPeriod(r: PatrolRoute, speed: number): number {
  if (r.loop) return r.loop.period;
  const n = r.points.length;
  if (n < 2 || speed <= 0) return 0;
  const wait = (i: number): number => r.waits?.[i] ?? r.wait ?? PATROL.wait;
  const pingPong = r.pingPong ?? n < 3;
  let open = 0;
  for (let i = 0; i < n - 1; i++) open += hyp2(r.points[i + 1]![0] - r.points[i]![0], r.points[i + 1]![1] - r.points[i]![1]);
  if (pingPong) {
    let t = (2 * open) / speed + wait(0) + wait(n - 1);
    for (let i = 1; i < n - 1; i++) t += 2 * wait(i);
    return t;
  }
  const closed = open + hyp2(r.points[0]![0] - r.points[n - 1]![0], r.points[0]![1] - r.points[n - 1]![1]);
  let t = closed / speed;
  for (let i = 0; i < n; i++) t += wait(i);
  return t;
}

/** A client's interrogation ended: progress had passed `donePh` and the interrogate bit is gone. */
export function interrogationEnded(prevPh: number, sub: number): boolean {
  return prevPh >= INTEL.donePh && (sub & 2) === 0;
}

function span(label: string, vals: readonly number[]): string {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of vals) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const a = Math.round(lo);
  const b = Math.round(hi);
  return a === b ? `${label} ${a} s` : `${label} ${a}-${b} s`;
}

export function gatherIntel(at: { x: number; y: number; z: number }, info: GuardInfo, cams: readonly IntelCam[], guards: readonly IntelGuard[]): IntelResult {
  const lines: string[] = [];
  const codes: string[] = [];
  for (const c of intelCodes(info)) {
    lines.push(`Code: ${c.label}`);
    codes.push(c.flag);
  }
  let nc = 0;
  const cycles: number[] = [];
  for (const c of cams) {
    if (!c.live || hyp2(c.x - at.x, c.z - at.z) > INTEL.reach) continue;
    const dy = c.y - at.y;
    if (dy < INTEL.camDyMin || dy > INTEL.camDyMax) continue;
    nc++;
    if (c.cycle > 0) cycles.push(c.cycle);
  }
  if (nc > 0) lines.push(cycles.length === 0 ? `Cameras near: ${nc}, fixed` : `Cameras near: ${nc}, ${span('sweep', cycles)}`);
  let np = 0;
  const periods: number[] = [];
  for (const g of guards) {
    if (!g.up || !g.route || hyp2(g.x - at.x, g.z - at.z) > INTEL.reach || Math.abs(g.y - at.y) > INTEL.guardDy) continue;
    const p = patrolPeriod(g.route, g.speed);
    if (p <= 0) continue;
    np++;
    periods.push(p);
  }
  if (np > 0) lines.push(`Patrols near: ${np}, ${span('loop', periods)}`);
  return { lines: lines.map((l) => l.slice(0, INTEL.lineMax)), codes, cams: nc, patrols: np };
}
