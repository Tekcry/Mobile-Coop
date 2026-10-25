// Camera vision cue shots (camera-cue): serves dist/ with `vite preview`, one headless browser per map, and shoots one
// security camera of Marlow Yard and one of the Warehouse in four views: vision off, electro, the player inside its view,
// the camera jammed (blind). Output: <dir>/cue-<suffix>-<gfx>-<map>-<view>.png (one set per gfx preset). The camera is
// found at run time (the first working one of the map); the shot looks over its shoulder along its current yaw.
// "inside": the player is stood on the brightest spots in the camera's frame until the camera's own meters see them
// (the shot fails, exit 1, if none is seen). "jammed": every camera whose cue is drawn goes blind. Needs `npm run build`.
// GPU: E2E_GPU=1 on port 4189. Never headed, no pointer lock.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/camera-cue-shots.mjs docs/archive/camera-cue/shots slice1 high
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/archive/camera-cue/shots', suffix = 'slice1', gfx = 'high'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// map name, query
const MAPS = [
  ['yard', 'autostart=ctcourse&mode=course'],
  ['warehouse', 'autostart=warehouseOps&mode=sector&sectorGuards=0'],
];
const VIEWS = ['off', 'electro', 'inside', 'jammed'];
let failed = 0;

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
        // jammed (the last view): every camera whose cue is drawn goes blind, as the jam leaves it (mode off, LED dark)
        const shown = dev.debug().cue.map((c) => c.a > 0.01);
        if (view === 'jammed') dev.cams.forEach((c, i) => { if (shown[i] || i === k) c.setMode('off'); });
        else cam.setMode('online');
        g.vision.set(view === 'electro' ? 'electro' : 'off');
        const floor = cam.y - cam.def.y;
        const dx = Math.sin(cam.yaw);
        const dz = Math.cos(cam.yaw);
        const yaw = cam.yaw;
        let at = { x: cam.x - dx * 3, z: cam.z - dz * 3, light: 0 };
        let seen = false;
        let tried = 0;
        if (view === 'inside') {
          // candidate spots in the frame at this yaw (+-12 deg, 4..13 m), brightest first: the camera's own meters decide
          // (camera-range) this camera's own range (`camRange`; the debug `range` is only the 12 m default), its inner 80 %
          const range = cam.range ?? dev.debug().range;
          const spots = [];
          for (let d = 4; d <= Math.min(13, range * 0.8); d += 1.5) {
            for (const off of [0, -0.2, 0.2]) {
              const x = cam.x + Math.sin(yaw + off) * d;
              const z = cam.z + Math.cos(yaw + off) * d;
              spots.push({ x, z, light: g.world.lightField.totalAt(x, floor + 1.3, z) });
            }
          }
          spots.sort((p, q) => q.light - p.light);
          for (const s of spots.slice(0, 10)) {
            tried++;
            at = s;
            g.player.controller.teleport(new V(s.x, floor, s.z), Math.PI + yaw);
            for (let i = 0; i < 6 && !seen; i++) {
              await sleep(250);
              seen = dev.debug().cue[k].seen;
            }
            if (seen) break;
          }
          if (seen) await sleep(400);
        } else {
          // 3 m behind the camera (outside its frame)
          g.player.controller.teleport(new V(at.x, floor, at.z), Math.PI + yaw);
          await sleep(1000);
        }
        g.photoFreeze(true);
        document.body.classList.add('photo-mode');
        const pc = g.photoCamera();
        pc.position.set(cam.x - dx * 2.5 + dz * 1.2, cam.y + 1.6, cam.z - dz * 2.5 - dx * 1.2);
        // frame the player when inside, else the frame 9 m out
        if (view === 'inside') pc.setTarget(new V(at.x, floor + 1, at.z));
        else pc.setTarget(new V(cam.x + dx * 9, floor, cam.z + dz * 9));
        for (let i = 0; i < 40 && !g.scene.isReady(); i++) await sleep(250);
        await sleep(1500);
        const all = dev.debug().cue;
        const c = all[k];
        return {
          id: c.id, mode: c.mode, a: c.a, seen: c.seen || seen, tris: c.tris,
          ...(view === 'inside' ? { at: [+at.x.toFixed(1), +at.z.toFixed(1)], lightAt: +at.light.toFixed(3), tried } : {}),
          ...(view === 'jammed' ? { cues: all.map((x) => `${x.id}:${x.mode}:${x.a.toFixed(2)}`) } : {}),
        };
      }, view);
      const file = `${dir}/cue-${suffix}-${gfx}-${name}-${view}.png`;
      if (view === 'inside' && !info.seen) {
        failed++;
        console.error(`camera-cue-shots: FAIL ${file}: the camera never saw the player ${JSON.stringify(info)}`);
        continue;
      }
      await page.screenshot({ path: file });
      console.log(`${file} ${JSON.stringify(info)}`);
    }
    if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  } catch (e) {
    failed++;
    console.error(`camera-cue-shots ${name}: ${String(e?.message ?? e)}`);
  }
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(failed ? 1 : 0);
