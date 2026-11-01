// Serve dist/ on E2E_PORT (default 4189) with vite preview, run one node script against it, stop the server.
// Used by GPU tools that need a served build (GPU tools such as scripts/perf.mjs runs).
//   E2E_PORT=4189 node scripts/serve-dist.mjs scripts/perf.mjs http://127.0.0.1:4189/ --desktop --json
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
if (await fetch(URL).then(() => true, () => false)) { console.error(`serve: port ${PORT} in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* gone */ } };
process.on('exit', stop);
let up = false;
for (let i = 0; i < 60 && !up; i++) { try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); } }
if (!up || (await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) { console.error('serve: preview not serving this dist'); stop(); process.exit(2); }
const child = spawn(process.execPath, process.argv.slice(2), { stdio: 'inherit', windowsHide: true });
const code = await new Promise((r) => child.on('exit', (c) => r(c ?? 1)));
stop();
process.exit(code);
