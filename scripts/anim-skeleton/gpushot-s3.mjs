// anim-skeleton S3b GPU look (desktop, E2E_GPU=1, under C:/NightShift/heavy.lock): serves dist/ on 4189, boots the Anim
// Chamber at ?gfx=high (Wren's LOD0, the chamber's stage light), plays `keyed:skeleton_test` and pauses it at six frames
// (rest, shrug, right shoulder forward + curling, fist, kick chamber + spread, extension), each from a front three-quarter
// camera, laid out as one labelled contact sheet: docs/archive/anim-skeleton/s3/skeleton-test-studio.webp (< 600 KB).
//   E2E_GPU=1 node scripts/anim-skeleton/gpushot-s3.mjs            (needs a prior `npm run build`)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = 4189;
const OUT = 'docs/archive/anim-skeleton/s3';
const FRAMES = [
  [0, 'f0 rest'],
  [5, 'f5 shrug both 20'],
  [14, 'f14 R shoulder fwd 25, index-middle curling'],
  [24, 'f24 fist'],
  [31, 'f31 kick chamber (FK), open + spread'],
  [36, 'f36 kick extension'],
];
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
const kill = () => {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true });
    else server.kill();
  } catch {
    /* gone */
  }
};
process.on('exit', kill);
await new Promise((r) => setTimeout(r, 4000));

const { browser, page, errors } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=chamber&stage=1&gfx=high', viewport: { width: 1200, height: 900 } });
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__chamber?.state().active, null, { timeout: 300000 });
  if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
  await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
  await page.evaluate(() => {
    window.__chamber.pick('keyed:skeleton_test');
    window.__chamber.spot(true);
    const p = window.__app.current.player;
    const orig = p.cam.update.bind(p.cam);
    // a full-body front three-quarter view (her right side toward the camera: the pushed shoulder, the kick in profile)
    p.cam.update = (...a) => {
      orig(...a);
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const fy = p.rig.root.rotation.y;
      const az = 0.75;
      const fx = Math.sin(fy + az);
      const fz = Math.cos(fy + az);
      c.fov = 0.62;
      c.position.set(r.x + fx * 3.3, r.y + 1.25, r.z + fz * 3.3);
      c.setTarget(new r.constructor(r.x, r.y + 0.95, r.z));
    };
  });
  // the stage fades in and the panel's space is released: let both settle, then crop to the game canvas (a centred square)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(8000);
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const r = c.getBoundingClientRect();
    const side = Math.min(r.width, r.height);
    return { x: r.x + (r.width - side) / 2, y: r.y + (r.height - side) / 2, width: side, height: side };
  });
  const tiles = [];
  const info = [];
  for (const [f, label] of FRAMES) {
    await page.evaluate((v) => window.__chamber.seek(v), f / 48);
    await page.waitForTimeout(2000);
    info.push(
      await page.evaluate((f) => {
        const r = window.__app.current.player.rig;
        const q = (n) => n.rotationQuaternion.asArray().map((x) => +x.toFixed(3));
        return { f, entry: window.__chamber.state().entry, phase: +window.__chamber.state().phase.toFixed(3), lod: window.__app.current.player.figure.current, keyed: r.keyedWalk, clavR: q(r.clavR), kneeL: q(r.kneeL), fingersR: [...r.fingers].slice(10).map((x) => +x.toFixed(2)) };
      }, f),
    );
    const buf = await page.screenshot({ clip: box });
    tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
  }
  const data = await page.evaluate(
    async ({ tiles, labels }) => {
      const W = 450;
      const H = 450;
      const c = document.createElement('canvas');
      c.width = W * 3;
      c.height = H * 2;
      const g = c.getContext('2d');
      for (let i = 0; i < tiles.length; i++) {
        const im = new Image();
        im.src = tiles[i];
        await im.decode();
        const x = (i % 3) * W;
        const y = Math.floor(i / 3) * H;
        g.drawImage(im, x, y, W, H);
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(x, y, W, 22);
        g.fillStyle = '#fff';
        g.font = '14px Consolas, monospace';
        g.fillText(`skeleton_test ${labels[i]}`, x + 6, y + 16);
      }
      return c.toDataURL('image/webp', 0.82);
    },
    { tiles, labels: FRAMES.map((x) => x[1]) },
  );
  const file = `${OUT}/skeleton-test-studio.webp`;
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  for (const x of info) console.log(JSON.stringify(x));
  console.log(file, statSync(file).size, 'bytes', errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors');
} finally {
  await browser.close();
  kill();
}
process.exit(0);
