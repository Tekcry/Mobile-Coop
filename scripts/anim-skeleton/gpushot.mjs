// anim-skeleton S2 GPU look (desktop, E2E_GPU=1, under C:/NightShift/heavy.lock): serves dist/ on 4189, boots Proving at
// ?gfx=high (Wren's LOD0) and shoots close views of her upper body:
//   1. rifle aimed: the hands closed on the gun through the finger bones (A9);
//   2. holstered, hands free: a clavicle shrug (left) and push (right), per-finger curls and spreads, the goggle 2 cm up;
//   3. the same pose with every S2 input back at zero (reference).
// Inputs go through the rig's own slots (`rig.clavIn`, `rig.fingerClip`) and the goggle copy (`rig.goggleOff`, set just
// before the figure reads it); no game code reads them. Writes docs/archive/anim-skeleton/s2/*.webp (< 400 KB each).
//   node scripts/anim-skeleton/gpushot.mjs            (needs a prior `npm run build`)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = 4189;
const OUT = 'docs/archive/anim-skeleton/s2';
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

const { browser, page } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=proving&gfx=high', viewport: { width: 1200, height: 900 } });
try {
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
  if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
  await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
  await page.evaluate(() => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    a.loop.manual = true;
    const V = p.controller.pos.constructor;
    p.controller.teleport(new V(0, 0, -14), Math.PI / 2);
    p.cam.yaw = Math.PI / 2;
    p.cam.pitch = 0;
    const orig = p.cam.update.bind(p.cam);
    // a close front three-quarter view of her chest, shoulders and hands
    p.cam.update = (dt, feet, crouch) => {
      orig(dt, feet, crouch);
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const fy = p.controller.renderYaw;
      const fx = Math.sin(fy);
      const fz = Math.cos(fy);
      // az: round her from the front (+: toward her right); side: the target off her midline (m, + her right)
      const v = window.__shot ?? { az: 0.6, d: 1.25, y: 1.38, ty: 1.22, side: 0 };
      const ax = fx * Math.cos(v.az) + fz * Math.sin(v.az);
      const az = fz * Math.cos(v.az) - fx * Math.sin(v.az);
      const tx = r.x + fx * 0.1 + fz * (v.side ?? 0);
      const tz = r.z + fz * 0.1 - fx * (v.side ?? 0);
      c.fov = 0.7;
      c.position.set(tx + ax * v.d, r.y + v.y, tz + az * v.d);
      c.setTarget(new r.constructor(tx, r.y + v.ty, tz));
    };
    // the goggle offset test hook: written into the rig's window copy right before the figure reads it
    const f = p.figure;
    const upd = f.update.bind(f);
    f.update = (cam) => {
      const o = window.__goggleUp ?? 0;
      if (o) {
        p.rig.goggleOff[1] = o;
        p.rig.goggleOff[7] = o;
      }
      upd(cam);
    };
  });
  const input = (ads) =>
    page.evaluate((ads) => {
      const s = window.__app.input.state;
      s.move.x = 0;
      s.move.y = 0;
      s.set('s2-ads', 'ads', ads);
    }, ads);
  const step = (sec) => page.evaluate((sec) => window.__app.loop.stepHeadless(sec, 120), sec);
  const shoot = async (name, note) => {
    const lod = await page.evaluate(() => window.__app.current.player.figure.current);
    const buf = await page.screenshot({ clip: { x: 150, y: 0, width: 900, height: 900 } });
    const data = await page.evaluate(async (src) => {
      const im = new Image();
      im.src = src;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = 720;
      c.height = 720;
      c.getContext('2d').drawImage(im, 0, 0, 720, 720);
      return c.toDataURL('image/webp', 0.8);
    }, `data:image/png;base64,${buf.toString('base64')}`);
    const file = `${OUT}/${name}.webp`;
    writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(file, statSync(file).size, 'bytes, LOD', lod, note);
  };

  // 1. rifle aimed: both hands closed on the gun (the bones, A9)
  await input(true);
  for (let i = 0; i < 90; i++) await step(1 / 60);
  const grip = await page.evaluate(() => {
    const r = window.__app.current.player.rig;
    return { r: r.handGrip.r, l: r.handGrip.l, trig: r.rightTrigger, fingers: [...r.fingers].map((x) => +x.toFixed(2)) };
  });
  await page.evaluate(() => (window.__shot = { az: 0.75, d: 1.15, y: 1.42, ty: 1.3 }));
  await step(1 / 60);
  await shoot('wren-lod0-rifle-grip', JSON.stringify(grip));

  // 2. holstered, hands free: shrug + push, per-finger curls and spreads, the goggle up 2 cm
  await input(false);
  await page.evaluate(() => window.__app.input.state.tap('draw'));
  for (let i = 0; i < 150; i++) await step(1 / 60);
  await page.evaluate(() => (window.__shot = { az: 0.35, d: 1.45, y: 1.45, ty: 1.2 }));
  await step(1 / 60);
  await shoot('wren-lod0-s2-rest', 'reference: every S2 input at zero');
  await page.evaluate(() => {
    const r = window.__app.current.player.rig;
    // left clavicle: a shrug (roll -), right: pushed forward (yaw -)
    r.clavIn.set([0, 0, -22, 0, -18, 0]);
    // left hand: a point (index straight, the rest closed); right hand: one finger at a time more curled, spread wide
    const L = [0.1, -0.3, 0.9, 0.9, 0.9];
    const R = [0.2, 0.0, 0.3, 0.6, 0.9];
    for (let k = 0; k < 5; k++) {
      r.fingerClip[k * 2] = L[k] - 0.2;
      r.fingerClip[10 + k * 2] = R[k] - 0.2;
      r.fingerClip[10 + k * 2 + 1] = 0.8;
    }
    window.__goggleUp = 0.02;
  });
  for (let i = 0; i < 20; i++) await step(1 / 60);
  await shoot('wren-lod0-s2-shrug-fingers-goggle', 'clavIn L roll -22, R yaw -18; finger curls / spreads; goggle +2 cm');
  // the whole upper body with both hands in frame, then each hand close
  await page.evaluate(() => (window.__shot = { az: 0.2, d: 2.1, y: 1.25, ty: 1.05, side: 0 }));
  await step(1 / 60);
  await shoot('wren-lod0-s2-body', 'as above, hands in frame');
  await page.evaluate(() => (window.__shot = { az: 1.1, d: 0.6, y: 0.95, ty: 0.85, side: 0.22 }));
  await step(1 / 60);
  await shoot('wren-lod0-s2-hand-right', 'right hand: curls 0.2 / 0 / 0.3 / 0.6 / 0.9, spread 0.8');
  await page.evaluate(() => (window.__shot = { az: -1.1, d: 0.6, y: 0.95, ty: 0.85, side: -0.22 }));
  await step(1 / 60);
  await shoot('wren-lod0-s2-hand-left', 'left hand: the point (index straight, the others closed)');
  // the hands back at their grip shape only (reference)
  await page.evaluate(() => {
    const r = window.__app.current.player.rig;
    r.fingerClip.fill(0);
  });
  await step(1 / 60);
  await shoot('wren-lod0-s2-hand-left-rest', 'left hand: the relaxed grip shape (no S2 input)');
} finally {
  await browser.close();
  kill();
}
process.exit(0);
