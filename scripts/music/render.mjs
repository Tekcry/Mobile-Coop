// Renders the V3 music sketches to MP3 stems (music direction v3). Windows only (the MP3 encoder is Media Foundation).
// Needs the samples first: node scripts/music/fetch-samples.mjs. Usage: npm run music:render [-- A B C]
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.music-cache', { recursive: true });
await build({ entryPoints: ['src/audio/music/render/cli.ts'], bundle: true, platform: 'node', format: 'esm', outfile: '.music-cache/render.mjs', logLevel: 'warning' });
const r = spawnSync(process.execPath, ['.music-cache/render.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
