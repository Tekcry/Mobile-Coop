// (map-ready S4) The prebake's vitest config (`scripts/prebake.mjs` runs it; not part of `npm test`): TS in Node, the
// `scripts/light-measure` pattern. The shard files run in parallel: `PREBAKE_THREADS` workers (default all cores but
// one, at most 4: the desktop CPU target).
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const slash = (p: string): string => p.split(String.fromCharCode(92)).join('/');
const here = slash(fileURLToPath(new URL('.', import.meta.url)));
const tree = slash(fileURLToPath(new URL('../..', import.meta.url)));
const env = Number(process.env.PREBAKE_THREADS);
const threads = Number.isInteger(env) && env > 0 ? env : Math.max(1, Math.min(4, availableParallelism() - 1));

export default {
  root: tree,
  server: { fs: { allow: [tree, here] } },
  test: { include: [here + '*.prebake.ts'], dir: here, environment: 'node', testTimeout: 1_800_000, hookTimeout: 1_800_000, maxWorkers: threads, fileParallelism: true },
};
