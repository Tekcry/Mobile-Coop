// Renders the movement foley sprite (src/assets/sfx/foley.mp3 + foley.json) from the CC0 packs. Windows only (the MP3
// encoder is Media Foundation). Needs the packs first: npm run sfx:fetch. Usage: npm run sfx:render
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.sfx-cache', { recursive: true });
await build({ entryPoints: ['src/audio/foley/render/cli.ts'], bundle: true, platform: 'node', format: 'esm', outfile: '.sfx-cache/render.mjs', external: ['playwright-core'], logLevel: 'warning' });
const r = spawnSync(process.execPath, ['.sfx-cache/render.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
