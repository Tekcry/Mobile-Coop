// Camera vision cue shots (camera-cue): serves dist/ with `vite preview`, one headless browser per map, and shoots one
// security camera of Marlow Yard and one of the Warehouse in four views: vision off, electro, the player inside its view,
// the camera jammed (blind). Output: <dir>/cue-<suffix>-<map>-<view>.png. The camera is found at run time (the first
// working one of the map); the shot looks over its shoulder along its current yaw. Needs a prior `npm run build`.
// GPU: E2E_GPU=1 on port 4189. Never headed, no pointer lock.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/camera-cue-shots.mjs docs/camera-cue/shots slice1 high
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/camera-cue/shots', suffix = 'slice1', gfx = 'high'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// map name, query
const MAPS = [
  ['yard', 'autostart=ctcourse&mode=course'],
  ['warehouse', 'autostart=warehouseOps&mode=sector&sectorGuards=0'],
];
const VIEWS = ['off', 'electro', 'inside', 'jammed'];

// vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
if (await fetch(URL).then(() => true, () => false)) { console.error(`camera-cue-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`camera-cue-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 900 s'), 900_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('camera-cue-shots: served build verified');

mkdirSync(dir, { recursive: true });
for (const [name, query] of MAPS) {
  const l = await launch({ url: URL, params: `${query}&gfx=${gfx}` });
  browser = l.browser;
  const page = l.page;
  try {
    await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world && globalThis.__ctdev, null, { timeout: 180_000 });
    // the first bake of the cue's rays (spread over frames)
    await page.waitForFunction(() => globalThis.__ctdev.debug().cue.some((c) => c.baked && c.mode === 'online'), null, { timeout: 60_000 });
    for (const view of VIEWS) {
      const info = await page.evaluate(async (view) => {
        const g = globalThis.__app.current;
        const dev = globalThis.__ctdev;
        const V = g.player.position.constructor;
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        g.photoFreeze(false);
        document.body.classList.remove('photo-mode');
        const k = dev.debug().cue.findIndex((c) => c.baked && c.mode === 'online');
        const cam = dev.cams[k];
        // jammed (the last view): the camera blind, as the jam leaves it (mode off, LED dark)
        cam.setMode(view === 'jammed' ? 'off' : 'online');
        g.vision.set(view === 'electro' ? 'electro' : 'off');
        const floor = cam.y - cam.def.y;
        const dx = Math.sin(cam.yaw);
        const dz = Math.cos(cam.yaw);
        // the player 9 m out along the yaw (inside the frame) or 3 m behind the camera (outside it)
        const far = view === 'inside' ? 9 : -3;
        g.player.controller.teleport(new V(cam.x + dx * far, floor, cam.z + dz * far), Math.PI + cam.yaw);
        let seen = false;
        for (let i = 0; i < 24; i++) {
          await sleep(250);
          if (view === 'inside' && dev.debug().cue[k].seen) { seen = true; await sleep(400); break; }
        }
        g.photoFreeze(true);
        document.body.classList.add('photo-mode');
        const pc = g.photoCamera();
        pc.position.set(cam.x - dx * 2.5 + dz * 1.2, cam.y + 1.6, cam.z - dz * 2.5 - dx * 1.2);
        pc.setTarget(new V(cam.x + dx * 9, floor, cam.z + dz * 9));
        for (let i = 0; i < 40 && !g.scene.isReady(); i++) await sleep(250);
        await sleep(1500);
        const c = dev.debug().cue[k];
        return { id: c.id, mode: c.mode, a: c.a, seen: c.seen || seen, pulse: c.pulse, tris: c.tris };
      }, view);
      const file = `${dir}/cue-${suffix}-${name}-${view}.png`;
      await page.screenshot({ path: file });
      console.log(`${file} ${JSON.stringify(info)}`);
    }
    if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  } catch (e) {
    console.error(`camera-cue-shots ${name}: ${String(e?.message ?? e)}`);
  }
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(0);
