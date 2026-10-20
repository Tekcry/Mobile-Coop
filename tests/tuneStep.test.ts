import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { CROUCH_NODES, FORWARD_NODES } from '../src/anim/clips/locomotion';
import { effortSpeed } from '../src/anim/effort';
import { emptyPlannerInput, FootPlanner, type FootState, type PlannerInput } from '../src/anim/footPlanner';
import { emptyMotionInput, gaitRate, MotionDriver } from '../src/anim/motion';
import { HAND_WEAPONS } from '../src/anim/tuneHands';
import { TUNE_HOOKS, TUNE_STATE_BAG, tuneLoad, tuneSet } from '../src/anim/tuneRegistry';
import { SP, STEP, STEP_GAITS, STEP_N, stepGaitIndex, stepGet, stepResetAll, stepSelect, stepSet, stepStride } from '../src/anim/tuneStep';
import { STEP_GROUP_IDS, STEP_SECTION, tuneV2Frame } from '../src/anim/tuneV2Sections';
import { CT, GEARS } from '../src/config/movement';
import { proportions } from '../src/player/proportions';

const P = proportions();
const LEG = P.thigh.len + P.calf.len;
const RUN = STEP_GAITS.indexOf('run');
const CRUN = STEP_GAITS.indexOf('crouchRun');

/** The graph's gait values for the planner at a pace (animGraph: duty / lift from the forward nodes, the turn's duty). */
function gait(v: number, crouch: boolean, yr: number) {
  const nodes = crouch ? CROUCH_NODES : FORWARD_NODES;
  const es = effortSpeed(v, crouch);
  let a = 0;
  while (a < nodes.length - 2 && nodes[a + 1]!.speed <= es) a++;
  const na = nodes[a]!;
  const nb = nodes[a + 1]!;
  const kk = Math.max(0, Math.min(1, (es - na.speed) / (nb.speed - na.speed)));
  const duty0 = na.clip.duty + (nb.clip.duty - na.clip.duty) * kk;
  const lift = na.clip.liftH + (nb.clip.liftH - na.clip.liftH) * kk;
  const rate = gaitRate(v, yr, undefined, 0, 0, crouch ? 1 : 0);
  const lin = gaitRate(v, 0, undefined, 0, 0, crouch ? 1 : 0);
  const ang = Math.abs(yr) > 1 ? Math.abs(yr) / Math.PI : 0;
  const tr = Math.max(0, Math.min(1, (lin > 1e-3 ? ang / lin : 0) - 0.5));
  const turning = tr * tr * (3 - 2 * tr);
  return { duty: Math.max(0.4, Math.min(0.75, duty0 + (0.52 - duty0) * turning)), lift, cycle: rate > 1e-3 ? 1 / rate : 1.2 };
}

type Seg = [t: number, dirDeg: number, speed: number];
type Frame = (t: number, i: PlannerInput, v: number) => void;

/** Drive planners from a CT MotionDriver along a stick path (free movement, the rig's reach and the CT stop), 60 Hz. */
function drive(segs: Seg[], crouch: boolean, planners: { update(i: PlannerInput): void }[], frame?: Frame): void {
  const i = emptyPlannerInput();
  i.stride = 'facing';
  i.crouch = crouch ? 1 : 0;
  i.reach = LEG * (0.62 + (0.8 - 0.62) * i.crouch);
  i.quickStop = CT.stopBlend;
  const d = new MotionDriver(0);
  const mi = emptyMotionInput();
  const dt = 1 / 60;
  let x = 0;
  let z = 0;
  const end = segs[segs.length - 1]![0];
  for (let t = 0; t < end; t += dt) {
    let s = segs[0]!;
    for (const q of segs) if (t >= q[0]) s = q;
    const dir = (s[1] * Math.PI) / 180;
    mi.vx = Math.sin(dir) * s[2];
    mi.vz = Math.cos(dir) * s[2];
    mi.yaw = d.yaw;
    mi.ct = true;
    mi.faceTravel = true;
    mi.sprinting = s[2] > 3;
    d.step(dt, mi);
    x += d.outX * dt;
    z += d.outZ * dt;
    const v = d.speed;
    const yr = d.yawRate;
    const g = gait(v, crouch, yr);
    i.dt = dt;
    i.rootX = x;
    i.rootZ = z;
    i.yaw = i.goalYaw = i.pelvisYaw = d.yaw;
    i.velX = d.vx;
    i.velZ = d.vz;
    i.moving = v > (d.state === 'stop' ? 0.3 : 0.05) || (Math.abs(yr) > 1 && d.state !== 'turn' && d.state !== 'stop');
    i.phase = d.phase;
    i.duty = g.duty;
    i.cycleTime = g.cycle;
    i.liftH = g.lift;
    i.yawRate = yr;
    i.faceGoal = dir;
    for (const p of planners) p.update(i);
    frame?.(t, i, v);
  }
}

const R = GEARS.stand[4];
const CR = GEARS.crouch[4];
/** Run, a 90 deg turn, down to the walk and back up, a 135 deg turn back (and the crouched run's turn). */
const RUN_PATH: Seg[] = [[0, 0, R], [1.5, 90, R], [2.5, 90, GEARS.stand[2]], [3.2, 90, R], [4.2, 225, R], [5.5, 225, R]];
const CRUN_PATH: Seg[] = [[0, 0, CR], [1.5, 90, CR], [2.5, 90, GEARS.crouch[1]], [3.2, 90, CR], [4.5, 90, CR]];
const STILL_PATH: Seg[] = [[0, 0, 0], [0.5, 0, GEARS.stand[2]], [1.5, 90, 0], [2.5, 200, GEARS.stand[1]], [3.5, 200, 0], [5, 0, 0]];

/**
 * The planner with the item 3 hooks taken out, from the current source: every hook is a multiplier (or the idle error's
 * `> 1`), so removing it must give the same numbers bit for bit.
 */
async function unhookedPlanner(): Promise<new () => FootPlanner> {
  const src = readFileSync(resolve('src/anim/footPlanner.ts'), 'utf8');
  const out = src
    .split(/\r?\n/)
    .filter((l) => !l.includes("from './tuneStep'") && !l.includes('stepSelect('))
    .join('\n')
    .replace(/ \* STEP\[SP\.\w+\]!/g, '')
    .replace(/ \/ STEP\[SP\.lock\]!/g, '')
    .replace(/ \* stepStride\(v\)/g, '')
    .replace(/STEP\[SP\.replant\]!/g, '1')
    .replace("from '../core/mathx'", `from '${pathToFileURL(resolve('src/core/mathx.ts')).href}'`);
  expect(out).not.toMatch(/STEP\[|stepStride|tuneStep/);
  const file = join(mkdtempSync(join(tmpdir(), 'tuneStep-')), 'footPlannerUnhooked.ts');
  writeFileSync(file, out);
  return ((await import(pathToFileURL(file).href)) as { FootPlanner: new () => FootPlanner }).FootPlanner;
}

function sameFoot(a: FootState, b: FootState): number {
  let bad = 0;
  for (const k of Object.keys(a) as (keyof FootState)[]) if (!Object.is(a[k], b[k])) bad++;
  return bad;
}

beforeEach(() => {
  TUNE_HOOKS.changed = null;
  tuneLoad({ version: 1, values: {}, log: [] });
  stepResetAll();
});

describe('tuner-v2 item 3: stepping table', () => {
  it('identity: every default is 1 and the stride curve is exactly 1 at any pace', () => {
    for (let g = 0; g < STEP_GAITS.length; g++) for (let k = 0; k < STEP_N; k++) expect(stepGet(g, k)).toBe(1);
    for (const v of [0, 0.5, 2.1, 3.3, 4, 9, NaN]) {
      for (const [m, c] of [[false, 0], [true, 0], [true, 1]] as const) {
        stepSelect(m, v, c);
        expect(Object.is(stepStride(v), 1)).toBe(true);
      }
    }
    expect([...STEP]).toEqual(new Array(STEP_N).fill(1));
  });

  it('identity: with the defaults the planner output is bit-identical to the planner without the hooks', async () => {
    const Unhooked = await unhookedPlanner();
    for (const [path, crouch] of [[RUN_PATH, false], [CRUN_PATH, true], [STILL_PATH, false], [STILL_PATH, true]] as const) {
      const a = new FootPlanner();
      const b = new Unhooked();
      let bad = 0;
      let frames = 0;
      drive(path, crouch, [a, b], () => {
        bad += sameFoot(a.L, b.L) + sameFoot(a.R, b.R);
        frames++;
      });
      expect(frames).toBeGreaterThan(200);
      expect(bad).toBe(0);
    }
  });

  it('gaits: the GEARS speeds map to walk / jog / run and crouched walk / run; still is idle', () => {
    const name = (m: boolean, v: number, c: number) => STEP_GAITS[stepGaitIndex(m, v, c)];
    expect(GEARS.stand.slice(0, 3).map((v) => name(true, v, 0))).toEqual(['walk', 'walk', 'walk']);
    expect(name(true, GEARS.stand[3], 0)).toBe('jog');
    expect(name(true, GEARS.stand[4], 0)).toBe('run');
    expect(GEARS.crouch.slice(0, 4).map((v) => name(true, v, 1))).toEqual(['crouchWalk', 'crouchWalk', 'crouchWalk', 'crouchWalk']);
    expect(name(true, GEARS.crouch[4], 1)).toBe('crouchRun');
    expect(name(false, GEARS.stand[4], 0)).toBe('idle');
  });

  it('hooks are live: lift and the stride curve per gait', () => {
    stepSet(RUN, SP.stride0, 0.8);
    stepSet(RUN, SP.stride2, 1.2);
    stepSelect(true, (GEARS.stand[3] + GEARS.stand[4]) / 2, 0);
    expect(stepStride(0)).toBeCloseTo(0.8, 12);
    expect(stepStride(GEARS.stand[4])).toBeCloseTo(1.2, 12);
    stepSet(RUN, SP.lift, 2);
    const p = new FootPlanner();
    let checked = 0;
    const was = [true, true];
    drive([[0, 0, R], [2, 0, R]], false, [p], (t, i, v) => {
      for (let k = 0; k < 2; k++) {
        const f = k ? p.R : p.L;
        const lifted = was[k] && !f.contact;
        was[k] = f.contact;
        if (!(t > 1 && v > 3.6 && lifted)) continue;
        expect(f.stepLift).toBeCloseTo(i.liftH * 2, 12);
        checked++;
      }
    });
    expect(checked).toBeGreaterThan(0);
  });
});

/**
 * The stuck-foot cause while running: the gait clock's stance (duty, floored at 0.4 by the graph, times the cycle) is
 * longer than the leg can follow at the run, so the clock never lifts the trailing foot; it stays locked until the
 * replant rule (`holdOrStep`: `dl > reach * 0.92` over 2 m/s) tears it off at the leg's stretch limit.
 */
describe('tuner-v2 item 3: feet stuck while running', () => {
  function measure(path: Seg[], crouch: boolean) {
    const p = new FootPlanner();
    const was = [true, true];
    const r = { clockOff: 0, ruleOff: 0, worstBehind: 0, over: 0, thr: 0 };
    drive(path, crouch, [p], (t, i, v) => {
      const run = crouch ? v > (GEARS.crouch[3] + GEARS.crouch[4]) / 2 : v > (GEARS.stand[3] + GEARS.stand[4]) / 2;
      // the replant distance this gait uses (the hook's own table value)
      const thr = i.reach * 0.92 * STEP[SP.replant]!;
      r.thr = Math.max(r.thr, thr);
      for (let k = 0; k < 2; k++) {
        const f = k ? p.R : p.L;
        const lx = k ? i.rX : i.lX;
        const dd = Math.hypot(f.x - (i.rootX + lx * Math.cos(i.yaw)), f.z - (i.rootZ - lx * Math.sin(i.yaw)));
        if (t > 1.3 && run && i.moving) {
          if (was[k] && !f.contact) {
            if (f.swBase === 0) r.clockOff++;
            else r.ruleOff++;
          }
          if (f.contact) {
            r.worstBehind = Math.max(r.worstBehind, dd);
            // planted past the replant distance by more than a frame's travel: stuck
            if (dd > thr + v * i.dt + 1e-3) r.over++;
          }
        }
        was[k] = f.contact;
      }
    });
    return { ...r, slide: p.L.slide + p.R.slide };
  }

  it('defaults: run toe-offs come from the replant rule at the stretch limit, not the gait clock (no drag)', () => {
    for (const [path, crouch] of [[RUN_PATH, false], [CRUN_PATH, true]] as const) {
      const m = measure(path, crouch);
      if (!crouch) expect(m.ruleOff).toBeGreaterThan(m.clockOff * 2);
      expect(m.worstBehind).toBeGreaterThan(m.thr - 0.03);
      expect(m.over).toBe(0);
      expect(m.slide).toBe(0);
    }
  });

  it('the Stepping fix: run replant 0.8 lifts the trailing foot ~9 cm sooner, nothing drags', () => {
    const base = measure(RUN_PATH, false);
    stepSet(RUN, SP.replant, 0.8);
    stepSet(CRUN, SP.replant, 0.8);
    const m = measure(RUN_PATH, false);
    expect(m.worstBehind).toBeLessThan(base.worstBehind - 0.06);
    expect(m.over).toBe(0);
    expect(m.slide).toBe(0);
    const c = measure(CRUN_PATH, true);
    expect(c.over).toBe(0);
    expect(c.slide).toBe(0);
  });
});

describe('tuner-v2 item 3: Stepping section', () => {
  it('registers step.<gait> groups; a panel value reaches the table; follow from the body state', () => {
    expect(STEP_SECTION.label).toBe('Stepping');
    expect(STEP_SECTION.groups).toEqual(STEP_GAITS.map((g) => `step.${g}`));
    expect(STEP_GROUP_IDS).toEqual(STEP_SECTION.groups);
    expect(STEP_SECTION.tunables.every((t) => t.kind === 'mul' && t.def === 1)).toBe(true);
    tuneSet('step.run', 'replant', 0.8);
    tuneV2Frame('run', HAND_WEAPONS[0]!);
    expect(stepGet(RUN, SP.replant)).toBe(0.8);
    expect(TUNE_STATE_BAG.step).toBe('step.run');
    tuneV2Frame('sneak', HAND_WEAPONS[0]!);
    expect(TUNE_STATE_BAG.step).toBe('step.crouchWalk');
    tuneLoad({ version: 1, values: {}, log: [] });
    tuneV2Frame('idle', HAND_WEAPONS[0]!);
    expect(stepGet(RUN, SP.replant)).toBe(1);
  });
});
