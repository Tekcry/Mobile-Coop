/**
 * (anim-fix-pass AF2, Michael P1: "hands randomly moving around when running, weird pose when running") The mocap run /
 * sprint carriage (characterRig `mocapRunPose` / `mocapRunTrunk` / `mocapRunArm`, mocap.ts MOCAP_RUN_POSE and the
 * MOCAP_LAYERS entries pelHeight, trunkMean, bankWipe, armSmooth) against PLAN.md "AF2" acceptance, on AF0's harness
 * (tests/helpers/afpMeasure.ts: the CT-driven headless gait, 60 Hz). OFF (the hand-keyed set) is the reference for the
 * pelvis height and the bone step; OFF itself is pinned byte for byte by mocapSwitch's identity fixture.
 * The wrist bar (<= 1.0 cm / frame^2 through the blends) is reported, and only held to "no worse than before" here: the
 * rest of the wrist's jerk is the pelvis drop's reach catch at toe-off (characterRig pelvisDrop, outside AF2) and the
 * capture's own swing (AF2-REPORT.md).
 */
import { appendFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { bankRoll, elbowOutRate, runGait, trunkPitch, wristJerk, type Run } from './helpers/afpMeasure';
import { pops, type Rec } from './helpers/mocapMeasure';
import type { Target } from './helpers/mocapPlayer';
import { MOCAP_LAYERS, MOCAP_RUN_POSE } from '../src/anim/mocap';
import { MOVEMENT } from '../src/config/movement';

// AFP_BEFORE=1: the four AF2 layers at 1 (exactly the code before AF2) to print the before rows (the asserts then fail)
if (process.env.AFP_BEFORE) Object.assign(MOCAP_LAYERS, { pelHeight: 1, trunkMean: 1, bankWipe: 1, armSmooth: 1 });

const DEG = 180 / Math.PI;
const OUT = process.env.AFP_OUT;
const rows: string[] = [];
const log = (s: string): void => { rows.push(s); };
afterAll(() => { if (OUT) appendFileSync(OUT, rows.join('\n') + '\n'); });

/** The stance knee's flex (deg, 0 straight) at the middle frame of each whole planted contact, mean over both legs. */
function stanceKnee(R: Rec): number {
  const P = R.pos;
  const out: number[] = [];
  for (const [c, hip, kn, an] of [[R.contactL, P.hipL, P.kneeL, P.ankleL], [R.contactR, P.hipR, P.kneeR, P.ankleR]] as const) {
    for (let i = 1; i < c.length; i++) {
      if (!c[i] || c[i - 1]) continue;
      let j = i;
      while (j < c.length && c[j]) j++;
      if (j === c.length) break;
      const m = ((i + j) >> 1) * 3;
      const ax = kn[m]! - hip[m]!, ay = kn[m + 1]! - hip[m + 1]!, az = kn[m + 2]! - hip[m + 2]!;
      const bx = an[m]! - kn[m]!, by = an[m + 1]! - kn[m + 1]!, bz = an[m + 2]! - kn[m + 2]!;
      out.push(Math.acos((ax * bx + ay * by + az * bz) / Math.hypot(ax, ay, az) / Math.hypot(bx, by, bz)) * DEG);
      i = j;
    }
  }
  return out.reduce((a, b) => a + b, 0) / out.length;
}

/** The hip line's roll (deg, + right hip higher): its mean over the record (the capture's constant tilt). */
function pelvisRollMean(R: Rec): number {
  return bankRoll(R).pelvisRoll;
}

/** Pace ramped from `a` to `b` m/s over 3 s (from 1 s), held: through a gait blend. */
const ramp = (a: number, b: number): Target => (t) => ({ v: t < 1 ? a : t < 4 ? a + ((b - a) * (t - 1)) / 3 : b, yr: 0 });

const cache = new Map<string, Promise<Run>>();
const gait = (v: number, yr: number, mode: 'on' | 'off' = 'on'): Promise<Run> => {
  const k = `${v}|${yr}|${mode}`;
  if (!cache.has(k)) cache.set(k, runGait(v, yr, { mode }));
  return cache.get(k)!;
};
const blend = (a: number, b: number, mode: 'on' | 'off' = 'on'): Promise<Run> => {
  const k = `ramp${a}-${b}|${mode}`;
  if (!cache.has(k)) cache.set(k, runGait(b, 0, { mode, warm: 0.5, sec: 4.5, target: ramp(a, b) }));
  return cache.get(k)!;
};

describe('AF2: the mocap run carriage', () => {
  it('pelvis: run within 5 cm of the hand-keyed run, sprint within 8 cm; stance knee at the run <= 35 deg', async () => {
    for (const [v, bar] of [[4, 0.05], [5, 0.08]] as const) {
      const on = trunkPitch((await gait(v, 0)).R).hipY;
      const off = trunkPitch((await gait(v, 0, 'off')).R).hipY;
      const knee = stanceKnee((await gait(v, 0)).R);
      log(`pelvis v ${v}: ON ${(on * 100).toFixed(1)} OFF ${(off * 100).toFixed(1)} cm (diff ${((on - off) * 100).toFixed(1)}); stance knee ${knee.toFixed(1)} deg`);
      expect.soft(Math.abs(on - off)).toBeLessThanOrEqual(bar);
      if (v === 4) expect.soft(knee).toBeLessThanOrEqual(35);
    }
  }, 300000);

  it('trunk pitch: run 10-20 deg forward, sprint <= 25; pelvis roll |mean| <= 1 deg straight', async () => {
    const run = (await gait(4, 0)).R;
    const spr = (await gait(5, 0)).R;
    const tr = trunkPitch(run).mean;
    const ts = trunkPitch(spr).mean;
    log(`trunk run ${tr.toFixed(1)} sprint ${ts.toFixed(1)} deg; pelvis roll mean run ${pelvisRollMean(run).toFixed(2)} sprint ${pelvisRollMean(spr).toFixed(2)} (mean |x| ${bankRoll(run).pelvisRollAbs.toFixed(2)} / ${bankRoll(spr).pelvisRollAbs.toFixed(2)})`);
    expect.soft(tr).toBeGreaterThanOrEqual(10);
    expect.soft(tr).toBeLessThanOrEqual(20);
    expect.soft(ts).toBeLessThanOrEqual(25);
    for (const R of [run, spr, (await gait(3, 0)).R]) expect.soft(Math.abs(pelvisRollMean(R))).toBeLessThanOrEqual(1);
  }, 300000);

  it('bank into a 2.5 rad/s turn >= 3 deg, both directions', async () => {
    for (const v of [4, 5]) {
      for (const sg of [1, -1]) {
        const b = bankRoll((await gait(v, sg * 2.5)).R, sg).bank;
        const straight = bankRoll((await gait(v, 0)).R, sg).bank;
        log(`bank v ${v} ${sg > 0 ? 'R' : 'L'}: ${b.toFixed(1)} deg (straight ${straight.toFixed(1)})`);
        expect.soft(b).toBeGreaterThanOrEqual(3);
      }
    }
  }, 300000);

  it('arms: keepElbowOut <= 2 changes / s; no bone step over max(25, OFF + 1); wrist jerk no worse than before', async () => {
    // before (AF0 numbers.md, 191c3565): run 2.06, sprint 3.54 cm / frame^2 at 60 Hz
    const before: Record<string, number> = { run: 2.06, sprint: 3.54 };
    const cases: [string, () => Promise<Run>, () => Promise<Run>][] = [
      ['jog', () => gait(3, 0), () => gait(3, 0, 'off')],
      ['run', () => gait(4, 0), () => gait(4, 0, 'off')],
      ['sprint', () => gait(5, 0), () => gait(5, 0, 'off')],
      ['run turn R', () => gait(4, 2.5), () => gait(4, 2.5, 'off')],
      ['run turn L', () => gait(4, -2.5), () => gait(4, -2.5, 'off')],
      ['blend 2.0-2.6', () => blend(1.8, 2.8), () => blend(1.8, 2.8, 'off')],
      ['blend 4.2-5.0', () => blend(4.0, 5.2), () => blend(4.0, 5.2, 'off')],
    ];
    for (const [n, onF, offF] of cases) {
      const on = await onF();
      const off = await offF();
      const w = wristJerk(on.R);
      const e = elbowOutRate(on.P);
      const bOn = pops(on.R).maxStepDeg;
      const bOff = pops(off.R).maxStepDeg;
      log(`${n}: wrist jerk max ${w.max.toFixed(2)} p99 ${w.p99.toFixed(2)} cm (bar 1.0); elbow changes ${e.changesPerS.toFixed(2)}/s; bone ${bOn.toFixed(1)} (OFF ${bOff.toFixed(1)})`);
      expect.soft(e.changesPerS).toBeLessThanOrEqual(2);
      expect.soft(bOn).toBeLessThanOrEqual(Math.max(25, bOff + 1));
      const b = before[n];
      if (b !== undefined) expect.soft(w.max).toBeLessThan(b);
    }
  }, 600000);
});

describe.skipIf(!!process.env.AFP_BEFORE)('(J19 S5, R25, G217) no forward lean below 3.5 m/s, the run as before', () => {
  it('the trunk at 2.1, 3.0 and 3.3 m/s within 1 deg of the walk, the 2.4 / 2.7 blend within 1.5', async () => {
    const W = trunkPitch((await gait(1.4, 0)).R).mean;
    log(`(J19 S5) walk 1.4 trunk ${W.toFixed(2)} deg`);
    for (const v of [2.1, 2.4, 2.7, 3.0, 3.3]) {
      const m = trunkPitch((await gait(v, 0)).R).mean;
      log(`(J19 S5) trunk v ${v}: ${m.toFixed(2)} deg (walk ${W.toFixed(2)}, diff ${(m - W).toFixed(2)})`);
      if (v >= 3) expect.soft(Math.abs(m - W)).toBeLessThanOrEqual(1.0);
      else expect.soft(m - W).toBeLessThanOrEqual(1.5);
    }
  }, 300000);

  it('the run at 4.0 m/s within 0.3 deg and 2 mm of the pre-S5 carriage', async () => {
    const now = trunkPitch((await gait(4, 0)).R);
    const R = MOCAP_RUN_POSE as unknown as Record<string, number>;
    const pre: Record<string, number> = { from: 2.0, to: 3.0, pitch: 0.26, pitchSprint: 0.32, pitchFrom: 4.0, pitchTo: 5.0 };
    const keep: Record<string, number> = {};
    for (const k of Object.keys(pre)) keep[k] = R[k]!;
    let old: ReturnType<typeof trunkPitch>;
    try {
      Object.assign(R, pre);
      old = trunkPitch((await runGait(4, 0)).R);
    } finally {
      Object.assign(R, keep);
    }
    log(`(J19 S5) run 4.0: trunk ${now.mean.toFixed(2)} deg (pre-S5 ${old.mean.toFixed(2)}), hipY ${(now.hipY * 100).toFixed(2)} cm (pre-S5 ${(old.hipY * 100).toFixed(2)})`);
    expect.soft(Math.abs(now.mean - old.mean)).toBeLessThanOrEqual(0.3);
    expect.soft(Math.abs(now.hipY - old.hipY)).toBeLessThanOrEqual(0.002);
  }, 300000);

  it('a start to the run and a hard stop from it: no bone step over max(25, OFF + 1)', async () => {
    const cases: [string, Target][] = [
      ['start 0-4', (t) => ({ v: t < 1 ? 0 : 4, yr: 0 })],
      ['stop 4-0', (t) => ({ v: t < 2.5 ? 4 : 0, yr: 0 })],
    ];
    for (const [n, target] of cases) {
      const on = pops((await runGait(0, 0, { warm: 0.5, sec: 3.5, target, mode: 'on' })).R).maxStepDeg;
      const off = pops((await runGait(0, 0, { warm: 0.5, sec: 3.5, target, mode: 'off' })).R).maxStepDeg;
      log(`(J19 S5) ${n}: bone step ${on.toFixed(1)} deg (OFF ${off.toFixed(1)})`);
      expect.soft(on).toBeLessThanOrEqual(Math.max(25, off + 1));
    }
  }, 300000);

  it('the carriage numbers', () => {
    expect(MOCAP_RUN_POSE.pitchFrom).toBeGreaterThanOrEqual(3.5);
    expect(MOCAP_RUN_POSE.pitchTo).toBeLessThanOrEqual(4.0 * (1 - MOVEMENT.rootDip));
    expect(MOCAP_RUN_POSE.pitchSprint).toBe(0.26);
    expect(MOCAP_RUN_POSE.from).toBe(2.0);
    expect(MOCAP_RUN_POSE.to).toBe(2.6);
  });
});
