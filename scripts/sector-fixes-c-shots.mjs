// sector-fixes slice C shots: security cameras (the cue grid) and lasers, before / after. Serves dist/ with `vite preview`,
// one headless browser per map; each camera is shot over its shoulder at mid-sweep (vision off and electro), each laser
// from the side (vision off and night vision). Output: <dir>/<tag>-<map>-<item>-<view>.webp (640 x 320). `sheet` mode
// puts <dir>/before-* beside <dir>/after-* into <dir>/sheet.webp. Needs `npm run build`. GPU: E2E_GPU=1 on port 4189.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/sector-fixes-c-shots.mjs docs/archive/sector-fixes/c before
//        E2E_GPU=1 E2E_PORT=4189 timeout 300 node scripts/sector-fixes-c-shots.mjs docs/archive/sector-fixes/c sheet
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/archive/sector-fixes/c', tag = 'before'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// map name, query, cameras, lasers
const MAPS = [
  ['warehouse', 'autostart=warehouseOps&mode=sector&sectorGuards=0', ['cam-yard', 'cam-bay', 'cam-rack-sw', 'cam-floor'], ['laser-workshop']],
  ['yard', 'autostart=ctcourse&mode=course', ['cam-s3'], ['laser-s4']],
];
let failed = 0;
// SHOT_ONLY=<id,id>: only those cameras / lasers; SHOT_FULL=1: full size (1280 x 640) for a close look at the grid
const ONLY = process.env.SHOT_ONLY ? process.env.SHOT_ONLY.split(',') : null;
const FULL = process.env.SHOT_FULL === '1';

if (await fetch(URL).then(() => true, () => false)) { console.error(`shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out'), 900_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
mkdirSync(dir, { recursive: true });

/** PNG buffer -> webp (half size) through the page's canvas. */
async function webp(page, png, w = 640, h = 320) {
  const url = await page.evaluate(async ([b64, w, h]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/webp', 0.8);
  }, [png.toString('base64'), w, h]);
  return Buffer.from(url.split(',')[1], 'base64');
}

if (tag === 'sheet') {
  const names = readdirSync(dir).filter((f) => f.startsWith('before-') && f.endsWith('.webp')).sort();
  const l = await launch({ url: URL, params: 'autostart=none' });
  browser = l.browser;
  const pairs = names.map((b) => [b, b.replace(/^before-/, 'after-')]);
  const data = pairs.map(([b, a]) => [b.replace(/^before-|\.webp$/g, ''), readFileSync(`${dir}/${b}`).toString('base64'), (() => { try { return readFileSync(`${dir}/${a}`).toString('base64'); } catch { return ''; } })()]);
  const url = await l.page.evaluate(async (data) => {
    const W = 480;
    const H = 240;
    const c = document.createElement('canvas');
    c.width = W * 2 + 30;
    c.height = (H + 22) * data.length + 24;
    const x = c.getContext('2d');
    x.fillStyle = '#111';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#ddd';
    x.font = '14px sans-serif';
    x.fillText('before', 10, 16);
    x.fillText('after', W + 20, 16);
    for (let i = 0; i < data.length; i++) {
      const [name, b, a] = data[i];
      const y = 24 + i * (H + 22);
      x.fillText(name, 10, y + 15);
      for (const [k, s] of [[0, b], [1, a]]) {
        if (!s) continue;
        const img = new Image();
        img.src = `data:image/webp;base64,${s}`;
        await img.decode();
        x.drawImage(img, 10 + k * (W + 10), y + 20, W, H);
      }
    }
    return c.toDataURL('image/webp', 0.8);
  }, data);
  writeFileSync(`${dir}/sheet.webp`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${dir}/sheet.webp (${data.length} rows)`);
  await browser.close();
  clearTimeout(kill);
  stop();
  process.exit(0);
}

for (const [name, query, camIds, laserIds] of MAPS) {
  const l = await launch({ url: URL, params: `${query}&gfx=high` });
  browser = l.browser;
  const page = l.page;
  try {
    await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world && globalThis.__ctdev, null, { timeout: 180_000 });
    await page.waitForFunction(() => globalThis.__ctdev.debug().cue.length > 0 && globalThis.__ctdev.debug().cue.every((c) => c.baked), null, { timeout: 90_000 });
    const shots = [...camIds.flatMap((id) => [['cam', id, 'off'], ['cam', id, 'electro']]), ...laserIds.flatMap((id) => [['laser', id, 'off'], ['laser', id, 'night']])].filter(([, id]) => !ONLY || ONLY.includes(id));
    if (shots.length === 0) {
      await browser.close();
      browser = null;
      continue;
    }
    for (const [kind, id, view] of shots) {
      const info = await page.evaluate(async ([kind, id, view]) => {
        const g = globalThis.__app.current;
        const dev = globalThis.__ctdev;
        const V = g.player.position.constructor;
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        g.photoFreeze(false);
        document.body.classList.remove('photo-mode');
        g.vision.set(view);
        const pc = g.photoCamera();
        if (kind === 'cam') {
          const cam = dev.cams.find((c) => c.def.id === id);
          if (!cam) return { err: `no camera ${id}` };
          if (cam.def.section !== undefined && dev.liveSection !== cam.def.section) dev.setLive(cam.def.section);
          const floor = cam.y - cam.def.y;
          // the player well behind the camera (out of every frame)
          g.player.controller.teleport(new V(cam.x - Math.sin(cam.def.facing * Math.PI / 180) * 4, floor, cam.z - Math.cos(cam.def.facing * Math.PI / 180) * 4), 0);
          await sleep(1500);
          // mid-sweep (the sweep's centre), then freeze at once
          const sw = cam.def.sweep;
          const travel = sw ? Math.abs(sw[1] - sw[0]) / 15 : 0;
          cam.clock = sw ? 2 + travel / 2 - 0.05 : 0;
          await sleep(60);
          g.photoFreeze(true);
          document.body.classList.add('photo-mode');
          // just in front of and over the lens (wall-mounted: behind it is the wall), looking at the floor 7 m out
          const ux = Math.sin(cam.yaw);
          const uz = Math.cos(cam.yaw);
          pc.position.set(cam.x + ux * 0.9, cam.y + 0.7, cam.z + uz * 0.9);
          pc.setTarget(new V(cam.x + ux * 7, floor, cam.z + uz * 7));
          for (let i = 0; i < 40 && !g.scene.isReady(); i++) await sleep(250);
          await sleep(1200);
          const c = dev.debug().cue.find((q) => q.id === id);
          return { id, yaw: +((cam.yaw * 180) / Math.PI).toFixed(1), pitch: cam.pitch !== undefined ? +((cam.pitch * 180) / Math.PI).toFixed(1) : 0, range: cam.range ?? dev.debug().range, mode: cam.mode, a: c?.a, tris: c?.tris };
        }
        const lz = dev.lasers.find((q) => q.def.id === id);
        if (!lz) return { err: `no laser ${id}` };
        const d = lz.def;
        if (d.section !== undefined && dev.liveSection !== d.section) dev.setLive(d.section);
        const fy = d.floorY ?? 0;
        const mx = (d.x1 + d.x2) / 2;
        const mz = (d.z1 + d.z2) / 2;
        // the side to stand on: perpendicular to the band, toward open floor (try both, keep the clearer)
        const sx = d.z2 - d.z1;
        const sz = -(d.x2 - d.x1);
        const n = Math.hypot(sx, sz) || 1;
        let side = 1;
        const ray = (s) => g.ballistics.hitDistance(new V(mx, fy + 1.4, mz), new V(mx + (sx / n) * 4 * s, fy + 1.6, mz + (sz / n) * 4 * s), 1);
        if (ray(-1) > ray(1)) side = -1;
        g.player.controller.teleport(new V(mx + (sx / n) * 6 * side, fy, mz + (sz / n) * 6 * side), 0);
        await sleep(1200);
        g.photoFreeze(true);
        document.body.classList.add('photo-mode');
        pc.position.set(mx + (sx / n) * 3.5 * side + (d.x2 - d.x1) * 0.15, fy + 1.5, mz + (sz / n) * 3.5 * side + (d.z2 - d.z1) * 0.15);
        pc.setTarget(new V(mx, fy + 0.9, mz));
        for (let i = 0; i < 40 && !g.scene.isReady(); i++) await sleep(250);
        await sleep(1200);
        return { id, on: lz.on, shown: lz.meshes.map((m) => m.isEnabled(false)) };
      }, [kind, id, view]);
      if (info.err) {
        failed++;
        console.error(`shots: ${name} ${info.err}`);
        continue;
      }
      const file = `${dir}/${tag}-${name}-${id}-${view}.webp`;
      writeFileSync(file, FULL ? await webp(page, await page.screenshot(), 1280, 640) : await webp(page, await page.screenshot()));
      console.log(`${file} ${JSON.stringify(info)}`);
    }
    if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  } catch (e) {
    failed++;
    console.error(`shots ${name}: ${String(e?.message ?? e)}`);
  }
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(failed ? 1 : 0);
