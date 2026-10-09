// Builds nothing: serves the existing dist/ with `vite preview` and runs every e2e script.
import { spawn } from 'node:child_process';

const PORT = Number(process.env.E2E_PORT ?? 4179);
// Windows: `localhost` can resolve to ::1, which a VPN adapter on the PC blocks (EACCES): bind and browse the IPv4 loopback there
const HOST = process.env.E2E_HOST ?? (process.platform === 'win32' ? '127.0.0.1' : 'localhost');
const url = `http://${HOST}:${PORT}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', HOST], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    /* not up yet */
  }
  await wait(250);
}
// 3.5: REQUIRED = the suites `npm run e2e` runs; LEGACY = suites whose every check is about parked content (Wave, Hunter,
// Mission, PvP, the economy and cosmetics behind `?legacy=1`): `npm run e2e:legacy` runs them with LEGACY=1 (report only).
const REQUIRED = ['smoke', 'e2e-pad', 'e2e-touch', 'e2e-mouse', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-weapons-carry', 'e2e-anim', 'e2e-combat', 'e2e-modes', 'e2e-cover', 'e2e-clip', 'e2e-tactics', 'e2e-stealth-ai', 'e2e-takedown', 'e2e-gadgets', 'e2e-enemies', 'e2e-levels', 'e2e-missions', 'e2e-training', 'e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ct', 'e2e-ct-warehouse', 'e2e-lightbake', 'e2e-phonelamps', 'e2e-darkness', 'e2e-feedback', 'e2e-desktop', 'e2e-offline', 'e2e-music'];
const LEGACY = ['e2e-progression', 'e2e-cosmetics', 'e2e-clear'];
const legacyRun = process.argv.includes('--legacy');
const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const suites = named.length ? named : legacyRun ? LEGACY : REQUIRED;
let failed = 0;
const times = [];
for (const s of suites) {
  console.log(`\n=== ${s} ===`);
  const t0 = Date.now();
  const code = await new Promise((res) => spawn('node', [`scripts/${s}.mjs`, url], { stdio: 'inherit', env: legacyRun ? { ...process.env, LEGACY: '1' } : process.env }).on('exit', res));
  times.push(`${s} ${code === 0 ? 'ok' : 'FAIL'} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (code !== 0) failed++;
}
server.kill();
console.log(`\ntimes (${process.env.E2E_GPU === '1' ? 'GPU' : 'software GL'}):\n  ${times.join('\n  ')}`);
console.log(failed ? `\n${failed} suite(s) failed` : '\nall e2e suites passed');
process.exit(failed ? 1 : 0);
