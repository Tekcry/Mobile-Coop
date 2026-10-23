// Shadow accuracy probe (sector-redesign shadow audit): read-only, prints numbers to PROBE_OUT. Not part of `npm test`.
// From the repo root:  [PROBE_MAPS=warehouseOps,ctcourse] PROBE_OUT=<file.json> \
//   npx vitest run --config scripts/shadow-audit/vitest.probe.config.ts shadowProbe
// PROBE_TREE may name another worktree (read-only): `@src` resolves there. Results: docs/sector-redesign/checks/shadow-audit.md.
import { fileURLToPath } from 'node:url';

const slash = (p: string): string => p.split(String.fromCharCode(92)).join('/');
const here = slash(fileURLToPath(new URL('.', import.meta.url)));
const tree = process.env.PROBE_TREE ?? slash(fileURLToPath(new URL('../..', import.meta.url)));

export default {
  root: tree,
  resolve: { alias: { '@src': tree + '/src' } },
  server: { fs: { allow: [tree, here] } },
  test: { include: [here + '*.test.ts'], dir: here, environment: 'node', testTimeout: 600_000 },
};
