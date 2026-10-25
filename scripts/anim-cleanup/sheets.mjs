// Contact sheets of Wren for the animation clean-up audit (feature/anim-cleanup): serves dist/ on E2E_PORT (4189, the
// GPU port; run `npm run build` first) and runs scripts/anim-sheet.mjs for each scenario, side view by default.
//   E2E_GPU=1 node scripts/anim-cleanup/sheets.mjs <outDir> <scenario[:frames:interval:view]> ...
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.E2E_PORT ?? 4189);
const [out = 'docs/archive/anim-cleanup/audit', ...specs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 2500));
for (const spec of specs) {
  const [name, frames = '12', interval = '0.1', view = 'side'] = spec.split(':');
  const file = path.join(out, `${name}-${view}.png`);
  const r = spawnSync(process.execPath, ['scripts/anim-sheet.mjs', file, name, frames, interval, view], {
    env: { ...process.env, URL: `http://127.0.0.1:${PORT}/` }, encoding: 'utf8', timeout: 240000, windowsHide: true,
  });
  console.log(name, view, r.status === 0 ? 'ok' : `FAILED ${r.status}`, (r.stdout + r.stderr).trim().split('\n').slice(-2).join(' | '));
}
server.kill();
