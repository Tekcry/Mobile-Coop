// In-game weapon screenshots (feature/weapons): node scripts/weapons/shots.mjs [outDir] [view ...]
// Serves dist/ (run `npm run build` first) on E2E_PORT (default 4189, the GPU port) and drives Free Roam on Proving:
// Wren with the kit, each view a camera placed round her after the game's own camera update. Use E2E_GPU=1 for the
// hardware GPU (Michael, 2026-10-19: "You are on the laptop also, so you can run the screenshots as needed").
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { launch, frames, waitOperator } from '../e2e-lib.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4189);
const out = process.argv[2] ?? 'docs/weapons/renders/game';
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });

// view: [camera offset right, up, forward of the player (m, her frame), target height]; weapon: loadout class to hold
const VIEWS = {
  'rifle-ots-aim': { weapon: 'rifle', ads: true, cam: null },
  'rifle-side-ready': { weapon: 'rifle', cam: [-1.7, 1.25, 0.25, 1.15] },
  'rifle-side-aim': { weapon: 'rifle', ads: true, cam: [-1.6, 1.45, 0.3, 1.35] },
  'rifle-front34-aim': { weapon: 'rifle', ads: true, cam: [-1.0, 1.5, 1.4, 1.35] },
  'rifle-hands-close': { weapon: 'rifle', ads: true, cam: [-0.55, 1.5, 1.05, 1.3] },
  'rifle-back-carry': { weapon: 'pistol', cam: [0.35, 1.45, -1.6, 1.15] },
  'pistol-side-aim': { weapon: 'pistol', ads: true, cam: [-1.4, 1.45, 0.45, 1.35] },
  'pistol-hands-close': { weapon: 'pistol', ads: true, cam: [-0.6, 1.5, 0.7, 1.35] },
  'pistol-holster': { weapon: 'rifle', cam: [1.0, 0.75, 0.25, 0.65] },
  'knife-hand': { weapon: 'rifle', knife: true, cam: [-0.9, 1.25, 0.6, 1.0] },
};

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 2500));
const { browser, page, errors } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=proving', viewport: { width: 1600, height: 900 } });
try {
  await waitOperator(page, 1, 180000);
  // every kit item with a built mesh (src/weapons/assets/<id>.glb) shows it
  const built = readdirSync('src/weapons/assets').filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
  await page.waitForFunction((ids) => window.__app?.current?.weapons?.slots?.every((s) => s.model.mesh || !ids.includes(s.def.id)), built, { timeout: 120000, polling: 200 });
  await page.evaluate(() => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    const V = p.position.constructor;
    g.target.damageMul = 0;
    document.querySelectorAll('.hud, .hud-root, #hud').forEach((e) => (e.style.visibility = 'hidden'));
    const orig = p.cam.update.bind(p.cam);
    p.cam.update = (dt, feet, crouch) => {
      orig(dt, feet, crouch);
      const v = window.__cam;
      if (!v) return;
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const y = p.controller.renderYaw;
      const fx = Math.sin(y), fz = Math.cos(y);
      // her right is (fz, -fx)
      c.position.set(r.x + fz * v[0] + fx * v[2], r.y + v[1], r.z - fx * v[0] + fz * v[2]);
      c.setTarget(new V(r.x + fx * 0.1, r.y + v[3], r.z + fz * 0.1));
    };
  });
  for (const [name, v] of Object.entries(VIEWS)) {
    if (only.length && !only.includes(name)) continue;
    const info = await page.evaluate((v) => {
      const a = window.__app;
      const g = a.current;
      const W = g.weapons;
      const st = a.input.state;
      const j = W.slots.findIndex((q) => q.def.class === v.weapon);
      if (j >= 0 && W.index !== j) W.equip(j);
      window.__cam = v.cam;
      st.set('shots', 'ads', !!v.ads);
      a.loop.stepHeadless(1.2, 120);
      window.__knife?.(v.knife ?? false);
      return { held: W.current.def.id, mesh: !!W.current.model.mesh };
    }, v);
    await frames(page, 20);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    console.log(name, JSON.stringify(info));
  }
  console.log(errors.length ? errors.join('\n') : 'no console errors');
} finally {
  await browser.close();
  server.kill();
}
