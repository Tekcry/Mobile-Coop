/**
 * (anim-fix-pass AF0) The before numbers. REPORT-ONLY: nothing here asserts a bar (a scenario that throws is logged, not failed);
 * it runs the harness (tests/helpers/afpMeasure.ts) over the AF0 scenario set at the current commit and writes the table
 * docs/anim-fix-pass/before/numbers.md. Slices AF1-AF4b assert against the bars in PLAN.md in their own test files, through
 * the same helper. Run: `AFP_WRITE_NUMBERS=1 npx vitest run tests/animFixPass.test.ts` (rewrites numbers.md; keep the commit's
 * copy as the "before"). Skipped without that variable: the table is a record of the AF0 commit, so a normal or train run
 * must never rewrite a tracked file (train 40 release, 2026-10-24).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { crouchScenarios, decimate, gaitScenarios, measureAll, rampDelta, strafeScenarios, wallScenarios, wristJerk, type Measures, type Scenario } from './helpers/afpMeasure';

const OUT = resolve(__dirname, '../docs/anim-fix-pass/before/numbers.md');
const f = (v: number, d = 1): string => (Number.isFinite(v) ? v.toFixed(d) : '-');

type Col = [string, keyof Measures, number];
const COLS: Record<Scenario['kind'], Col[]> = {
  gait: [['speed', 'speed', 2], ['trk L cm', 'trackMinL_cm', 1], ['trk R cm', 'trackMinR_cm', 1], ['pass gap cm', 'passGap_cm', 1], ['gap min cm', 'gapMin_cm', 1], ['plant max s', 'plantMax_s', 2], ['slide cm', 'slide_cm', 2], ['flips/s', 'flipsPerS', 1], ['flips/250ms', 'flipsMax250', 0], ['wrist jerk cm', 'wristJerkMax_cm', 2], ['elbow chg/s', 'elbowChangesPerS', 1], ['trunk deg', 'trunkMean_deg', 1], ['pel below cm', 'pelBelowStanding_cm', 1], ['bank deg', 'bank_deg', 1], ['pel roll deg', 'pelvisRoll_deg', 1], ['step cm', 'stepLen_cm', 0]],
  crouch: [['speed', 'speed', 2], ['trunk deg', 'trunkMean_deg', 1], ['hips cm', 'hipY_cm', 1], ['CoM dbl cm', 'comDouble_cm', 1], ['CoM any cm', 'comAny_cm', 1], ['pel lat p2p cm', 'pelLatP2P_cm', 1], ['step cm', 'stepLen_cm', 0], ['slide cm', 'slide_cm', 2], ['trk L cm', 'trackMinL_cm', 1], ['trk R cm', 'trackMinR_cm', 1], ['wrist jerk cm', 'wristJerkMax_cm', 2]],
  strafe: [['speed', 'speed', 2], ['pel lat p2p cm', 'pelLatP2P_cm', 1], ['pel beyond cm', 'pelBeyondPace_cm', 2], ['grip step cm', 'gripStepMax_cm', 2], ['grip mean cm', 'gripMean_cm', 1], ['grip spread cm', 'gripCycleSpread_cm', 1], ['kneels', 'kneelEpisodes', 0], ['side chg', 'kneelSideChanges', 0], ['kneel on flip fr', 'kneelOnFlip_frames', 0], ['gun leg cm', 'gunLeg_cm', 1], ['gun trunk cm', 'gunTrunk_cm', 1], ['gap min cm', 'gapMin_cm', 1], ['slide cm', 'slide_cm', 2]],
  wall: [['speed', 'speed', 2], ['pel lat p2p cm', 'pelLatP2P_cm', 1], ['grip step cm', 'gripStepMax_cm', 2], ['grip mean cm', 'gripMean_cm', 1], ['kneels', 'kneelEpisodes', 0], ['gun leg cm', 'gunLeg_cm', 1], ['gun trunk cm', 'gunTrunk_cm', 1], ['trunk deg', 'trunkMean_deg', 1], ['gap min cm', 'gapMin_cm', 1], ['slide cm', 'slide_cm', 2]],
};

async function table(title: string, scs: Scenario[], out: string[], extra?: (s: Scenario, m: Measures) => string): Promise<void> {
  const kind = scs[0]!.kind;
  const cols = COLS[kind];
  out.push(`\n## ${title}`, `| scenario | ${cols.map((c) => c[0]).join(' | ')}${extra ? ' | extra' : ''} |`, `| --- | ${cols.map(() => '---').join(' | ')}${extra ? ' | ---' : ''} |`);
  for (const s of scs) {
    try {
      const run = await s.run();
      const m = await measureAll(run, s.sg);
      out.push(`| ${s.name} | ${cols.map(([, k, d]) => f(m[k], d)).join(' | ')}${extra ? ` | ${extra(s, m)}` : ''} |`);
      if (s.name === 'crouch-ramp-1to3') {
        const r = rampDelta(run.R);
        out.push(`| (ramp) | first -> last third: trunk ${f(r.trunk)} deg, hips ${f(r.hipY * 100)} cm |`);
      }
      if (s.name.startsWith('run-4') || s.name.startsWith('sprint-5')) {
        const w30 = wristJerk(decimate(run.R, 2));
        out.push(`| (30 Hz) | ${s.name}: wrist jerk max ${f(w30.max, 2)} cm / frame |`);
      }
    } catch (e) {
      out.push(`| ${s.name} | ERROR ${String(e).slice(0, 100)} |`);
    }
  }
}

describe.skipIf(!process.env.AFP_WRITE_NUMBERS)('(afp AF0) before numbers (report-only)', () => {
  it('measures the AF0 scenario set and writes docs/anim-fix-pass/before/numbers.md', async () => {
    const out: string[] = [
      '# anim-fix-pass: before numbers (AF0 harness, report-only)',
      '',
      'Written by `AFP_WRITE_NUMBERS=1 npx vitest run tests/animFixPass.test.ts` (tests/helpers/afpMeasure.ts). Headless Wren rig, sim 60 Hz, mocap ON',
      '(the default), at the commit the file was committed on. No bar is asserted here; the bars are in PLAN.md and each slice',
      'asserts them in its own test. Units as in the column names. Gait rows: 2 s settle + 3 s recorded, turns at the yaw rate in',
      'the name (R right, L left); trk = planted ankle offset from the hip midline in the facing frame (< -0.5 cm crossed),',
      'pass gap = feet gap at passing, bank = trunk lean toward the turn (+ into), pel below = hips below the standing idle.',
      'Strafe / wall rows: aimRun (the drawn gun, crouch 1); `grip` = right wrist vs hips in the root frame; `kneels` episodes.',
      'The wall is the harness\'s stand-in (wall behind the root, side-on body as player.ts turns it), not the game\'s wall solver.',
    ];
    await table('Gait (free movement)', gaitScenarios(), out);
    await table('Crouch (holstered, CT-driven)', crouchScenarios(), out);
    await table('Crouched aimed strafe (rifle, pistol)', strafeScenarios(), out);
    await table('Drawn crouched wall slide', wallScenarios(), out);
    mkdirSync(resolve(OUT, '..'), { recursive: true });
    writeFileSync(OUT, out.join('\n') + '\n');
    expect(out.length).toBeGreaterThan(10);
  }, 1500000);
});
