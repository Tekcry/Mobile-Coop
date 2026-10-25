// Perf trend (locomotion run, docs/archive/locomotion/RULES.md): serves the existing dist/ with `vite preview`, runs
// scripts/perf.mjs once WITHOUT --budget, prints its output and stops the server. A trend against this machine's own
// baseline only, never a pass claim. Needs a prior `npm run build`.
// Usage: node scripts/perf-trend.mjs [extra perf.mjs args, e.g. --json]
import { spawn } from 'node:child_process';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const kill = setTimeout(() => { console.error('perf-trend: timed out after 300 s'); stop(); process.exit(2); }, 300_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(`http://127.0.0.1:${PORT}/`)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) { console.error('perf-trend: preview server did not start (run `npm run build` first)'); stop(); process.exit(2); }

const args = process.argv.slice(2).filter((a) => a !== '--budget');
const perf = spawn(process.execPath, ['scripts/perf.mjs', `http://127.0.0.1:${PORT}/`, ...args], { windowsHide: true, stdio: 'inherit' });
perf.on('exit', (code) => { clearTimeout(kill); stop(); process.exit(code ?? 1); });
