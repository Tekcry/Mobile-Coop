/**
 * rig-pose-fix S1: the fit sweep of `src/player/playerVolumes.ts` (skipped unless `PLAYER_BODY_SWEEP=1`). Runs every
 * knot scenario of `sweepScenarios()` on Wren's rig (the parity test's harness) and writes one TSV line per scenario:
 * the table, row, base row and the rig's mean capsule-local offsets (pelvis, chest, neck, head: side, up, forward).
 *   PLAYER_BODY_SWEEP=1 PLAYER_BODY_OUT=pb.tsv npx vitest run tests/playerVolumesSweep.test.ts
 *   node scripts/player-body-fit.mjs pb.tsv --write
 * `PLAYER_BODY_MOCAP=0` sweeps the hand-keyed set instead (the residual check of the other set).
 */
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { runScenario, setupEnv, sweepScenarios } from './helpers/playerBodyHarness';

const ON = process.env.PLAYER_BODY_SWEEP === '1';

describe.skipIf(!ON)('player body fit sweep (PLAYER_BODY_SWEEP=1)', () => {
  it('writes the knot table', async () => {
    const env = await setupEnv();
    const mocap = process.env.PLAYER_BODY_MOCAP !== '0';
    const lines = ['id\ttab\trow\tbase\t' + ['pelvis', 'chest', 'neck', 'head'].flatMap((j) => [`${j}X`, `${j}Y`, `${j}Z`]).join('\t')];
    for (const sc of sweepScenarios(mocap)) {
      const r = runScenario(env, sc, 0.6);
      lines.push([sc.id, sc.tab, sc.row, sc.base ?? '-', ...Array.from(r.rigMean, (v) => v.toFixed(4))].join('\t'));
    }
    writeFileSync(process.env.PLAYER_BODY_OUT ?? 'player-body-sweep.tsv', `${lines.join('\n')}\n`);
  }, 900000);
});
