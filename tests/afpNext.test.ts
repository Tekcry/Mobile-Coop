/**
 * (afp-next AF0b) The before numbers of the next animation pass (drawn low ready, aimed glide, standing idle). REPORT-ONLY:
 * nothing here asserts a bar (a scenario that throws is logged as ERROR, not failed); it runs the harness
 * (tests/helpers/afpMeasure.ts) over the AF0b sets at the current commit and writes docs/afp-next/before/numbers.md. A short
 * control table re-runs AF0's walk / jog straight rows and prints the largest difference from
 * docs/anim-fix-pass/before/numbers.md (the harness change must leave them unchanged). Run:
 * `npx vitest run tests/afpNext.test.ts` (rewrites numbers.md; keep the commit's copy as the "before").
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aimedScenarios, gaitScenarios, idleScenarios, measureAll, readyScenarios, type Measures, type NextScenario } from './helpers/afpMeasure';

const OUT = resolve(__dirname, '../docs/afp-next/before/numbers.md');
const AF0 = resolve(__dirname, '../docs/anim-fix-pass/before/numbers.md');
const f = (v: number, d = 1): string => (Number.isFinite(v) ? v.toFixed(d) : '-');

type Col = [string, keyof Measures, number];
/** AF0's gait columns (tests/animFixPass.test.ts), for the control rows and the ready rows. */
const GAIT: Col[] = [['speed', 'speed', 2], ['trk L cm', 'trackMinL_cm', 1], ['trk R cm', 'trackMinR_cm', 1], ['pass gap cm', 'passGap_cm', 1], ['gap min cm', 'gapMin_cm', 1], ['plant max s', 'plantMax_s', 2], ['slide cm', 'slide_cm', 2], ['flips/s', 'flipsPerS', 1], ['flips/250ms', 'flipsMax250', 0], ['wrist jerk cm', 'wristJerkMax_cm', 2], ['elbow chg/s', 'elbowChangesPerS', 1], ['trunk deg', 'trunkMean_deg', 1], ['pel below cm', 'pelBelowStanding_cm', 1], ['bank deg', 'bank_deg', 1], ['pel roll deg', 'pelvisRoll_deg', 1], ['step cm', 'stepLen_cm', 0]];
const COLS: Record<NextScenario['kind'], Col[]> = {
  ready: [...GAIT, ['pel vert p2p cm', 'pelVertP2P_cm', 1], ['cadence /s', 'cadence_sps', 2]],
  aimed: [['speed', 'speed', 2], ['step cm', 'stepLen_cm', 0], ['cadence /s', 'cadence_sps', 2], ['trk L cm', 'trackMinL_cm', 1], ['trk R cm', 'trackMinR_cm', 1], ['pass gap cm', 'passGap_cm', 1], ['slide cm', 'slide_cm', 2], ['foot pitch step deg', 'footPitchStepMax_deg', 1], ['pel lat p2p cm', 'pelLatP2P_cm', 1], ['trunk deg', 'trunkMean_deg', 1], ['gun leg cm', 'gunLeg_cm', 1], ['gun trunk cm', 'gunTrunk_cm', 1]],
  idle: [['speed', 'speed', 2], ['trk L cm', 'trackMinL_cm', 1], ['trk R cm', 'trackMinR_cm', 1], ['gap min cm', 'gapMin_cm', 1], ['pel lat p2p cm', 'pelLatP2P_cm', 1], ['pel vert p2p cm', 'pelVertP2P_cm', 1], ['head yaw p2p deg', 'headYawP2P_deg', 1], ['head yaw rate max deg/s', 'headYawRateMax_dps', 0], ['wrist jerk cm', 'wristJerkMax_cm', 2], ['pel beyond cm', 'pelBeyondPace_cm', 2]],
};

async function table(title: string, scs: NextScenario[], out: string[]): Promise<void> {
  const cols = COLS[scs[0]!.kind];
  out.push(`\n## ${title}`, `| scenario | gun | ${cols.map((c) => c[0]).join(' | ')} |`, `| --- | --- | ${cols.map(() => '---').join(' | ')} |`);
  for (const s of scs) {
    try {
      const m = await measureAll(await s.run(), s.sg);
      out.push(`| ${s.name} | ${s.gun} | ${cols.map(([, k, d]) => f(m[k], d)).join(' | ')} |`);
    } catch (e) {
      out.push(`| ${s.name} | ${s.gun} | ERROR ${String(e).slice(0, 100)} |`);
    }
  }
}

/** AF0's committed row for `name` (its cells after the name), or null. */
function af0Row(name: string): string[] | null {
  const line = readFileSync(AF0, 'utf8').split('\n').find((l) => l.startsWith(`| ${name} |`));
  return line ? line.split('|').slice(2, -1).map((c) => c.trim()) : null;
}

/** The control rows: AF0's gait walk / jog straight through today's harness, and the largest |difference| from AF0's numbers. */
async function control(out: string[]): Promise<void> {
  out.push(
    '\n## Control (AF0 gait rows, harness unchanged)',
    'AF0\'s numbers.md was written at 098fc9af, before AF1-AF4b changed src/: a difference here is the game\'s, not the harness\'s.',
    '(AF0b check at 48b9b73c: the base afpMeasure.ts and this one give these two rows identical to 3 decimals.)',
    '',
    `| scenario | ${GAIT.map((c) => c[0]).join(' | ')} | max abs diff vs AF0 |`, `| --- | ${GAIT.map(() => '---').join(' | ')} | --- |`);
  for (const s of gaitScenarios().filter((g) => g.name === 'walk-1.4-straight' || g.name === 'jog-3-straight')) {
    try {
      const m = await measureAll(await s.run(), s.sg);
      const cells = GAIT.map(([, k, d]) => f(m[k], d));
      const ref = af0Row(s.name);
      let diff = ref ? 0 : NaN;
      if (ref) {
        for (let i = 0; i < cells.length; i++) {
          const a = Number(cells[i]), b = Number(ref[i]);
          if (Number.isFinite(a) && Number.isFinite(b)) diff = Math.max(diff, Math.abs(a - b));
          else if (cells[i] !== ref[i]) diff = Infinity;
        }
      }
      out.push(`| ${s.name} | ${cells.join(' | ')} | ${Number.isFinite(diff) ? diff.toFixed(2) : ref ? 'mismatch' : 'no AF0 row'} |`);
    } catch (e) {
      out.push(`| ${s.name} | ERROR ${String(e).slice(0, 100)} |`);
    }
  }
}

describe('(afp-next AF0b) before numbers (report-only)', () => {
  it('measures the AF0b scenario sets and writes docs/afp-next/before/numbers.md', async () => {
    const out: string[] = [
      '# afp-next: before numbers (AF0b harness, report-only)',
      '',
      'Written by `npx vitest run tests/afpNext.test.ts` (tests/helpers/afpMeasure.ts). Headless Wren rig, sim 60 Hz, mocap ON',
      '(the default) on every row, at the commit the file was committed on. No bar is asserted here. The `gun` column names what',
      'is in hand: `rifle` / `pistol` a bare gun node under the weapon pivot (the pistol at weight 0.7 with the cupped support),',
      '`-` holstered. Ready rows: the CT-driven run (ctRun) with the gun drawn, low ready (no aim), 2 s settle + 3 s recorded,',
      'turns at the yaw rate in the name (R right, L left); stop rows move 3 s, the stick to 0 at 3 s, 2.5 s recorded from it.',
      'Aimed rows: aimRun standing (aim 1, the body held on the aim), the local z pace in the name (+ forward, - back).',
      'Idle rows: holstered unless the gun says otherwise; stop rows 4 s recorded from the stop, start rows from 0.5 s before it.',
      'Columns as in docs/anim-fix-pass/before/numbers.md, plus: pel vert p2p = hips height peak-to-peak; cadence = landings',
      'per second (both feet); foot pitch step = the worst change of either foot\'s heel -> ball pitch in one frame; head yaw =',
      'the head bone\'s yaw against the root (p2p, fastest frame-to-frame turn).',
    ];
    await control(out);
    await table('Drawn low ready (CT-driven run)', readyScenarios(), out);
    await table('Aimed glide (standing)', aimedScenarios(), out);
    await table('Standing idle', idleScenarios(), out);
    mkdirSync(resolve(OUT, '..'), { recursive: true });
    writeFileSync(OUT, out.join('\n') + '\n');
    expect(out.length).toBeGreaterThan(10);
  }, 1500000);
});
