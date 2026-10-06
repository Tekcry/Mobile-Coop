// Builds nothing: serves the existing dist/ with `vite preview` and runs every e2e script.
import { spawn } from 'node:child_process';

const PORT = 4179;
const url = `http://localhost:${PORT}/`;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    /* not up yet */
  }
  await wait(250);
}
const suites = process.argv.slice(2).length ? process.argv.slice(2) : ['smoke', 'e2e-pad', 'e2e-touch', 'e2e-mouse', 'e2e-move', 'e2e-traverse', 'e2e-stealth', 'e2e-weapons-carry', 'e2e-anim', 'e2e-combat', 'e2e-modes', 'e2e-progression', 'e2e-cosmetics', 'e2e-cover', 'e2e-clip', 'e2e-tactics', 'e2e-clear', 'e2e-coop', 'e2e-offline'];
let failed = 0;
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  const code = await new Promise((res) => spawn('node', [`scripts/${s}.mjs`, url], { stdio: 'inherit' }).on('exit', res));
  if (code !== 0) failed++;
}
server.kill();
console.log(failed ? `\n${failed} suite(s) failed` : '\nall e2e suites passed');
process.exit(failed ? 1 : 0);
