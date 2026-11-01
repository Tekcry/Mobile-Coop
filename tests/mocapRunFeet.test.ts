/**
 * (anim-fix-pass AF1, Michael P1: "turning when walking is ok legs wise but anything faster is bad, legs sticking and
 * overlapping eachother") The mocap jog / run / sprint feet, straight and turning both ways, at 60 Hz on the headless
 * Wren rig (switch ON). Per run, in the facing frame (the root's heading about the hip midpoint):
 * - `trackL` / `trackR`: each planted ankle's signed lateral offset, worst frame (m; + = its own side, < 0 crossed);
 * - `gap`: the ankles' lateral gap (R - L) where they pass fore and aft, worst passing (m);
 * - `over`: the longest plant past the gait clock's stance time (duty x cycle), s;
 * - `slide`: the worst planted-foot slide (m, mocapMeasure `plantSlide`);
 * - `per250`: the most clip feet ownership changes in any 0.25 s;
 * - `twist`: the largest planted foot's twist from the body as it lifts (rad).
 * Bars (docs/anim-fix-pass/PLAN.md AF1): track >= +2 cm each side; gap >= 7 cm; over <= 0.1 s while turning > 1 rad/s;
 * slide <= 1.5 cm; per250 <= 1. The walk's turns (1.4 m/s, the control) stay within 10 % of the before numbers.
 * `AFP_REPORT=1` prints the table (docs/anim-fix-pass/AF1-REPORT.md).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { setMocapLocomotion } from '../src/anim/mocap';
import type { Rec } from './helpers/mocapMeasure';
import { contactSlideWorst, ownershipFlips, passingGap, plantedTrack } from './helpers/afpMeasure';
import { ctRun, flickPlan, type Target } from './helpers/mocapPlayer';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const DT = 1 / 60;
const WARM = 2;
const SEC = 3;

export interface FeetM { trackL: number; trackR: number; gap: number; over: number; slide: number; flips: number; per250: number; clipShare: number; twist: number }

/** A CT-driven gait (mocapPlayer ctRun: CT's pace springs) from a stick target, recorded after WARM s for SEC s (switch ON).
 *  Also the largest twist of a planted foot from the body as it lifts (rad; mocapPlayer turnFeet's `lift`). */
async function feetRun(target: Target, sec = SEC): Promise<FeetM> {
  const stance: number[] = [];
  const tw = [0, 0];
  const on = [false, false];
  let twist = 0;
  const R = await ctRun(target, Math.round((WARM + sec) * 60), WARM, 'on', (rig, k) => {
    if (k * DT < WARM) return;
    stance.push(rig.graph.out.gait.duty * rig.graph.out.gait.cycleTime);
    const yaw = (rig as unknown as { pin: { yaw: number } }).pin.yaw;
    for (let s = 0; s < 2; s++) {
      const f = s === 0 ? rig.planner.L : rig.planner.R;
      if (f.contact) {
        on[s] = true;
        tw[s] = Math.abs(Math.atan2(Math.sin(f.yaw - yaw), Math.cos(f.yaw - yaw)));
      } else {
        if (on[s]) twist = Math.max(twist, tw[s]!);
        on[s] = false;
      }
    }
  });
  return { ...measure(R, stance), twist };
}
/** Steady: v m/s, turning yr rad/s (+ right) from 0.5 s (afpMeasure runGait's plan). */
const steadyTurn = (v: number, yr: number): Target => (t) => ({ v, yr: t >= 0.5 ? yr : 0 });

/** The AF1 measures (tests/helpers/afpMeasure.ts) plus the longest plant past the gait clock's stance (duty x cycle). */
function measure(R: Rec, stance: number[]): Omit<FeetM, 'twist'> {
  const t = plantedTrack(R);
  // plants that start and end inside the record, past the clock's stance time over the plant
  let over = -Infinity;
  for (const c of [R.contactL, R.contactR]) {
    for (let f = 1; f < R.n; f++) {
      if (!c[f] || c[f - 1]) continue;
      let g = f;
      let st = 0;
      while (g < R.n && c[g]) st += stance[g++]!;
      if (g >= R.n) break;
      over = Math.max(over, (g - f) * DT - st / (g - f));
    }
  }
  let on = 0;
  for (let f = 0; f < R.n; f++) on += R.clipOn[f]!;
  const fl = ownershipFlips(R);
  return { trackL: t.minL, trackR: t.minR, gap: passingGap(R).passing, over, slide: contactSlideWorst(R), flips: fl.flips, per250: fl.maxPer250ms, clipShare: on / R.n };
}

const cm = (m: number): string => (Number.isFinite(m) ? (m * 100).toFixed(1) : '-');
const DEG = 180 / Math.PI;
const fmt = (v: number, what: string, m: FeetM): string =>
  `| ${v} | ${what} | ${cm(m.trackL)} | ${cm(m.trackR)} | ${cm(m.gap)} | ${Number.isFinite(m.over) ? m.over.toFixed(3) : '-'} | ${cm(m.slide)} | ${m.per250} (${m.flips}) | ${(m.clipShare * 100).toFixed(0)} % | ${(m.twist * DEG).toFixed(0)} |`;

/** The bars a fast-gait run is judged by (PLAN.md AF1); `turning`: the plant-length bar applies. */
function fails(tag: string, m: FeetM, turning: boolean): string[] {
  const f: string[] = [];
  if (m.trackL < 0.02 || m.trackR < 0.02) f.push(`${tag}: track ${cm(m.trackL)} / ${cm(m.trackR)} cm < 2`);
  if (m.gap < 0.07) f.push(`${tag}: passing gap ${cm(m.gap)} cm < 7`);
  if (turning && m.over > 0.1) f.push(`${tag}: plant ${m.over.toFixed(3)} s past stance > 0.1`);
  if (m.slide > 0.015) f.push(`${tag}: slide ${cm(m.slide)} cm > 1.5`);
  if (m.per250 > 1) f.push(`${tag}: ${m.per250} ownership flips in 0.25 s`);
  return f;
}

const FAST = [3.0, 4.0, 5.0];
const RATES = [0, 1.5, -1.5, 2.5, -2.5, 4, -4];
const REPORT = !!process.env.AFP_REPORT;
/** The walk's turns before AF1 (docs/anim-fix-pass/before/numbers.md, walk-1.4-turn*): track L / R, passing gap (m). */
const WALK_BEFORE: Record<number, [number, number, number]> = { 1.5: [-0.039, 0.09, 0.099], [-1.5]: [0.062, -0.069, 0.099], 2.5: [-0.061, 0.067, 0.096], [-2.5]: [0.043, -0.098, 0.094] };

describe('AF1 fast-gait feet (mocap ON, 60 Hz)', () => {
  afterAll(() => setMocapLocomotion(false));
  const rows: string[] = [];
  for (const v of FAST) {
    it(`${v} m/s straight and turning 1.5 / 2.5 / 4 rad/s both ways: no crossed or stuck feet`, async () => {
      const bad: string[] = [];
      for (const yr of RATES) {
        const m = await feetRun(steadyTurn(v, yr));
        rows.push(fmt(v, `${yr} rad/s`, m));
        bad.push(...fails(`${v} m/s x ${yr}`, m, Math.abs(yr) > 1));
      }
      if (!REPORT) expect(bad).toEqual([]);
    }, 300_000);
  }
  it('a weave through the hand-over rates (yaw rate 1.8 sin, 1.2 s): the clip feet change hands at most once per 0.25 s', async () => {
    const bad: string[] = [];
    for (const v of FAST) {
      const m = await feetRun((t) => ({ v, yr: t >= 1 ? 1.8 * Math.sin((2 * Math.PI * t) / 1.2) : 0 }), 4);
      rows.push(fmt(v, 'weave 1.8', m));
      if (m.per250 > 1) bad.push(`${v} m/s weave: ${m.per250} ownership flips in 0.25 s`);
      if (m.slide > 0.015) bad.push(`${v} m/s weave: slide ${cm(m.slide)} cm`);
    }
    if (!REPORT) expect(bad).toEqual([]);
  }, 300_000);
  it('CT direction changes (90 / 180 deg at CT turn rates, both ways): reported', async () => {
    for (const v of FAST) for (const ang of [90, 180]) rows.push(fmt(v, `flick ${ang}`, await feetRun(flickPlan(v, ang, 0), 6)));
  }, 300_000);
  it('walk 1.4 m/s turns (control): within 10 % of before', async () => {
    const bad: string[] = [];
    for (const yr of RATES.slice(1)) {
      const m = await feetRun(steadyTurn(1.4, yr));
      rows.push(fmt(1.4, `${yr} rad/s`, m));
      const b = WALK_BEFORE[yr];
      if (!b) continue;
      const near = (a: number, x: number): boolean => Math.abs(a - x) <= 0.1 * Math.abs(x) + 0.002;
      if (!near(m.trackL, b[0]) || !near(m.trackR, b[1]) || !near(m.gap, b[2])) bad.push(`walk x ${yr}: track ${cm(m.trackL)} / ${cm(m.trackR)} gap ${cm(m.gap)} vs before ${cm(b[0])} / ${cm(b[1])} / ${cm(b[2])}`);
    }
    if (!REPORT) expect(bad).toEqual([]);
  }, 300_000);
  it.runIf(REPORT)('report (AFP_REPORT=1)', () => {
    process.stdout.write(['', '| v m/s | run | trackL cm | trackR cm | passing gap cm | plant past stance s | slide cm | flips in 0.25 s (total) | clip feet on | twist at lift deg |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n'));
  });
});
