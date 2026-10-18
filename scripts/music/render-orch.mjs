// Renders the V4 round 6 orchestral sketches to MP3 stems (src/audio/score/orch). Windows only (the MP3 encoder is
// Media Foundation). Needs the samples first: node scripts/music/fetch-samples.mjs orch-samples.json orch.
// Usage: npm run music:orch [-- pursuit longnight nightshift] [-- --check]
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.music-cache', { recursive: true });
await build({ entryPoints: ['src/audio/score/orch/cli.ts'], bundle: true, platform: 'node', format: 'esm', outfile: '.music-cache/render-orch.mjs', logLevel: 'warning' });
const r = spawnSync(process.execPath, ['--max-old-space-size=8192', '.music-cache/render-orch.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
