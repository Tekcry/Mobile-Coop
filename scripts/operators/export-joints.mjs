// Exports each operator's corrected body (proportions, hit volumes, bind-pose joints) to JSON for the pipeline.
// Reads src/player/proportions.ts through src/operators/operatorBody.ts; never edits either.
// Usage: node --import ./scripts/operators/ts-resolve.mjs scripts/operators/export-joints.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JOINTS_JSON } from './paths.mjs';

const { OPERATOR_IDS, OPERATORS, operatorBodyExport } = await import('../../src/operators/operatorBody.ts');

export function exportJoints(out = JOINTS_JSON) {
  const round = (v) => Math.round(v * 1e5) / 1e5;
  const data = {
    frame: 'game: +X right, +Y up, +Z forward (Babylon, left-handed); metres; feet on y = 0',
    operators: OPERATOR_IDS.map((id) => {
      const e = operatorBodyExport(OPERATORS[id]);
      return { ...e, joints: e.joints.map((j) => ({ ...j, pos: j.pos.map(round) })) };
    }),
  };
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  return out;
}

if (import.meta.main) console.info(`joints -> ${exportJoints(process.argv[2])}`);
