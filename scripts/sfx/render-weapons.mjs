// Renders the weapon sprite (src/assets/sfx/weapons.mp3 + weapons.json) from the CC0 recordings. Windows only (the MP3
// encoder is Media Foundation). Needs the recordings first: npm run sfx:fetch-weapons. Usage: npm run sfx:render-weapons
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

mkdirSync('.sfx-cache', { recursive: true });
await build({ entryPoints: ['src/audio/weapons/render/cli.ts'], bundle: true, platform: 'node', format: 'esm', outfile: '.sfx-cache/render-weapons.mjs', logLevel: 'warning' });
const r = spawnSync(process.execPath, ['.sfx-cache/render-weapons.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
