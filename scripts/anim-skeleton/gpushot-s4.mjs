// anim-skeleton S4 GPU look (desktop, E2E_GPU=1, under C:/NightShift/heavy.lock): serves dist/ on 4189, boots the Anim
// Studio at ?gfx=high (Wren's LOD0, the studio's stage light), plays `keyed:jog` paused on its contact key (phase 0, the
// left heel strike) and on phase 0.25, untuned and then with the S4 rows: the Joints clavicle rows (roll 15, the left
// mirrored: both shoulders shrug) and leg deltas on jog key 0 (left knee + 25, hip yaw + 20: the planted foot stays on
// its plant, the knee turns out). One labelled contact sheet: docs/archive/anim-skeleton/s4/jog-s4-rows.webp (< 600 KB).
//   E2E_GPU=1 node scripts/anim-skeleton/gpushot-s4.mjs            (needs a prior `npm run build`)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = 4189;
const OUT = 'docs/archive/anim-skeleton/s4';
const BODY = ['idle', 'walk', 'jog', 'run', 'crouchIdle', 'sneak', 'crouchWalk'];
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

const { browser, page, errors } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=studio&stage=1&gfx=high', viewport: { width: 1200, height: 900 } });
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active, null, { timeout: 300000 });
  if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
  await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
  await page.evaluate(() => {
    window.__studio.pick('keyed:jog');
    window.__studio.spot(true);
    const p = window.__app.current.player;
    const orig = p.cam.update.bind(p.cam);
    // a full-body front three-quarter view from her left (the planted left leg and both shoulders in view)
    p.cam.update = (...a) => {
      orig(...a);
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const fy = p.rig.root.rotation.y;
      const az = -0.6;
      c.fov = 0.62;
      c.position.set(r.x + Math.sin(fy + az) * 3.3, r.y + 1.2, r.z + Math.cos(fy + az) * 3.3);
      c.setTarget(new r.constructor(r.x, r.y + 0.95, r.z));
    };
  });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(8000);
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const r = c.getBoundingClientRect();
    const side = Math.min(r.width, r.height);
    return { x: r.x + (r.width - side) / 2, y: r.y + (r.height - side) / 2, width: side, height: side };
  });
  const tiles = [];
  const labels = [];
  const info = [];
  const shoot = async (phase, label) => {
    await page.evaluate((v) => window.__studio.seek(v), phase);
    await page.waitForTimeout(2000);
    info.push(
      await page.evaluate((label) => {
        const r = window.__app.current.player.rig;
        const v = (n) => n.getAbsolutePosition().asArray().map((x) => +x.toFixed(4));
        return { label, phase: +window.__studio.state().phase.toFixed(3), lod: window.__app.current.player.figure.current, clavR: r.clavR.rotationQuaternion.asArray().map((x) => +x.toFixed(3)), ankleL: v(r.ankleL), kneeL: v(r.kneeL), shR: v(r.shoulderR), footSlide: { l: +r.footSlide.l.toFixed(4), r: +r.footSlide.r.toFixed(4) }, contactL: r.planner.L.contact };
      }, label),
    );
    const buf = await page.screenshot({ clip: box });
    tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
    labels.push(label);
  };
  await shoot(0, 'jog key 0 (L planted), untuned');
  await shoot(0.25, 'jog phase 0.25, untuned');
  await page.evaluate((body) => {
    const t = window.__animTune;
    for (const g of body) {
      t.set(`joint.${g}`, 'clavicleR_z', 15);
      t.set(`joint.${g}`, 'clavicleL_z', -15);
    }
    t.set('key.jog.0', 'legL_knee', 25);
    t.set('key.jog.0', 'legL_hipYaw', 20);
  }, BODY);
  await page.waitForTimeout(1500);
  await shoot(0, 'S4: clavicles roll 15, key 0 L knee +25 hip yaw +20');
  await shoot(0.25, 'S4 rows, phase 0.25');
  const data = await page.evaluate(
    async ({ tiles, labels }) => {
      const W = 450;
      const H = 450;
      const c = document.createElement('canvas');
      c.width = W * 2;
      c.height = H * 2;
      const g = c.getContext('2d');
      for (let i = 0; i < tiles.length; i++) {
        const im = new Image();
        im.src = tiles[i];
        await im.decode();
        const x = (i % 2) * W;
        const y = Math.floor(i / 2) * H;
        g.drawImage(im, x, y, W, H);
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.fillRect(x, y, W, 22);
        g.fillStyle = '#fff';
        g.font = '13px Consolas, monospace';
        g.fillText(labels[i], x + 6, y + 16);
      }
      return c.toDataURL('image/webp', 0.82);
    },
    { tiles, labels },
  );
  const file = `${OUT}/jog-s4-rows.webp`;
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  for (const x of info) console.log(JSON.stringify(x));
  console.log(file, statSync(file).size, 'bytes', errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors');
} finally {
  await browser.close();
  kill();
}
process.exit(0);
