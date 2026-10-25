// guard-render S1 look check (Character Build): run from the slot worktree after `build`.
// Serves dist/ on 4189, takes 6 shots (merge on / ?guardmerge=0 x normal / thermal / night), stops the server.
// node C:/NightShift/scratch/work/s1-look.mjs <outDir>
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const out = process.argv[2] ?? 'C:/NightShift/scratch/runs/s1-look';
fs.mkdirSync(out, { recursive: true });
const snippet = fs.readFileSync('docs/guard-render/look-shot.js', 'utf8');
const srv = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4189', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', windowsHide: true });
const up = () => new Promise((r) => { const s = net.connect(4189, '127.0.0.1', () => { s.end(); r(true); }); s.on('error', () => r(false)); });
let ok = false;
for (let i = 0; i < 120 && !(ok = await up()); i++) await new Promise((r) => setTimeout(r, 500));
let fail = 0;
try {
  if (!ok) throw new Error('preview did not start on 4189');
  for (const [tag, q] of [['merge', 'autostart=ctcourse&mode=course'], ['off', 'autostart=ctcourse&mode=course&guardmerge=0']]) {
    for (const [name, mode] of [['normal', 'off'], ['thermal', 'thermal'], ['night', 'night']]) {
      const r = spawnSync(process.execPath, ['scripts/shot.mjs', `${out}/${tag}-${name}.png`, q, '60', snippet.replaceAll('MODE', mode)], {
        env: { ...process.env, E2E_GPU: '1', E2E_PORT: '4189' }, encoding: 'utf8', timeout: 180000, windowsHide: true,
      });
      console.log(`== ${tag}-${name} exit=${r.status}\n${r.stdout}\n${r.stderr}`);
      if (r.status !== 0 || /no guard spawned|Error/.test(r.stdout)) fail++;
    }
  }
} finally {
  spawnSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { windowsHide: true });
}
process.exit(fail ? 1 : 0);
