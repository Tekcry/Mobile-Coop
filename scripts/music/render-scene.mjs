// Renders the scene music prototypes (src/audio/score/orch/scenePieces.ts) to mastered MP3s with ffmpeg (on PATH).
// Needs the samples first: node scripts/music/fetch-samples.mjs orch-samples.json orch, and node scripts/music/fetch-samples.mjs.
// Usage: npm run music:scene [-- intro1 intro2 mission1 mission2] [-- --out <dir>]
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.music-cache', { recursive: true });
await build({ entryPoints: ['src/audio/score/orch/sceneCli.ts'], bundle: true, platform: 'node', format: 'esm', outfile: '.music-cache/render-scene.mjs', logLevel: 'warning' });
const r = spawnSync(process.execPath, ['--max-old-space-size=8192', '.music-cache/render-scene.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
