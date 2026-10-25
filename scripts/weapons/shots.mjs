// In-game weapon screenshots (feature/weapons): node scripts/weapons/shots.mjs [outDir] [view ...]
// Serves dist/ (run `npm run build` first) on E2E_PORT (default 4189, the GPU port) and drives Free Roam on the
// training map (Proving) or, with STAGE=warehouse, in the Warehouse under a ceiling lamp; each view a camera placed
// round Wren after the game's own camera update. Use E2E_GPU=1 for the
// hardware GPU (Michael, 2026-10-19: "You are on the laptop also, so you can run the screenshots as needed").
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { launch, frames, waitOperator } from '../e2e-lib.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4189);
const out = process.argv[2] ?? 'docs/archive/weapons/renders/game';
const only = process.argv.slice(3);
// staging (Michael 2026-10-19): the training map (Proving, bright and clear) by default; STAGE=warehouse stands Wren
// under a warehouse ceiling lamp
const STAGE = process.env.STAGE ?? 'proving';
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
  'pistol-hands-close': { weapon: 'pistol', ads: true, cam: [-0.45, 1.45, 1.1, 1.3] },
  'pistol-front34-aim': { weapon: 'pistol', ads: true, cam: [-1.0, 1.5, 1.4, 1.35] },
  'pistol-holster': { weapon: 'rifle', cam: [1.0, 0.75, 0.25, 0.65] },
  'rifle-body-side': { weapon: 'rifle', ads: true, cam: [-2.9, 1.0, 0.2, 0.9] },
  'rifle-body-front': { weapon: 'rifle', ads: true, cam: [-1.2, 1.1, 2.6, 0.95] },
  'pistol-body-side': { weapon: 'pistol', ads: true, cam: [-2.9, 1.0, 0.2, 0.9] },
  // (anim-cleanup) reload beats: tap reload with `mag` rounds left, then hold the frame `at` seconds in
  'reload-strip': { weapon: 'rifle', ads: true, reload: { mag: 1, at: 0.68 }, cam: [-0.95, 1.3, 0.3, 1.1] },
  'reload-pouch': { weapon: 'rifle', ads: true, reload: { mag: 1, at: 1.12 }, cam: [-0.95, 1.3, 0.3, 1.1] },
  'reload-seat': { weapon: 'rifle', ads: true, reload: { mag: 1, at: 1.62 }, cam: [-0.95, 1.3, 0.3, 1.1] },
  'reload-charge': { weapon: 'rifle', ads: true, reload: { mag: 0, at: 2.36 }, cam: [-0.9, 1.35, 0.2, 1.15] },
  'reload-pistol-strip': { weapon: 'pistol', ads: true, reload: { mag: 1, at: 0.42 }, cam: [-0.9, 1.3, 0.35, 1.1] },
  'reload-pistol-pouch': { weapon: 'pistol', ads: true, reload: { mag: 1, at: 0.68 }, cam: [-0.9, 1.2, 0.3, 1.0] },
  // (anim-cleanup) the shoulder swap: aiming from the left shoulder, the weapon in the left hand
  'rifle-ots-left': { weapon: 'rifle', ads: true, left: true, cam: null },
  'rifle-left-front34': { weapon: 'rifle', ads: true, left: true, cam: [1.0, 1.5, 1.4, 1.35] },
  'pistol-left-front34': { weapon: 'pistol', ads: true, left: true, cam: [1.0, 1.5, 1.4, 1.35] },
  // (anim-cleanup) aiming across stances
  'rifle-crouch-aim': { weapon: 'rifle', ads: true, crouch: true, cam: [-1.3, 1.0, 0.9, 0.95] },
  'rifle-walk-aim': { weapon: 'rifle', ads: true, move: 0.5, cam: [-1.5, 1.3, 0.6, 1.2] },
  'pistol-crouch-aim': { weapon: 'pistol', ads: true, crouch: true, cam: [-1.3, 1.0, 0.9, 0.95] },
  'pistol-walk-aim': { weapon: 'pistol', ads: true, move: 0.5, cam: [-1.5, 1.3, 0.6, 1.2] },
  'knife-hand': { weapon: 'rifle', knife: true, cam: [-0.9, 1.25, 0.6, 1.0] },
};

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 2500));
const { browser, page, errors } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: STAGE === 'warehouse' ? 'autostart=warehouse&mode=sandbox' : 'autostart=proving', viewport: { width: 1600, height: 900 } });
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
    // staging: under the lit ceiling lamp nearest the spawn (the warehouse floor is level), the lamp just in front of her
    const sp = p.position.clone();
    const lamps = g.world.level.lights.lights.filter((l) => l.on && l.kind === 'lamp' && l.y > 2 && l.y < 7);
    lamps.sort((a1, b1) => Math.hypot(a1.x - sp.x, a1.z - sp.z) - Math.hypot(b1.x - sp.x, b1.z - sp.z));
    const l = lamps[0];
    if (l && location.search.includes('warehouse')) {
      p.controller.teleport(new V(l.x, sp.y, l.z - 0.5), 0);
      p.cam.yaw = 0;
      p.cam.snap();
      a.loop.stepHeadless(0.5, 120);
      window.__stage = { lamp: [l.x, l.y, l.z], at: [p.position.x, p.position.y, p.position.z] };
    }
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
      g.player.cam.shoulder = v.left ? -1 : 1;
      if (v.crouch) g.player.controller.setCrouchToggle();
      else g.player.controller.clearCrouchToggle();
      st.move.x = 0;
      st.move.y = v.move ?? 0;
      window.__crouch = { stance: g.player.controller.crouched ?? g.player.controller.stance ?? null };
      st.set('shots', 'ads', !!v.ads);
      a.loop.stepHeadless(1.2, 120);
      st.move.y = 0;
      if (v.move) a.loop.stepHeadless(0.01, 120);
      W.knife.show(!!v.knife);
      a.loop.stepHeadless(0.3, 120);
      if (v.reload) {
        for (let k = 0; k < 40 && W.reloading; k++) a.loop.stepHeadless(0.1, 120);
        W.current.mag = v.reload.mag;
        st.tap('reload');
        a.loop.stepHeadless(v.reload.at, 120);
      }
      return { held: W.current.def.id, mesh: !!W.current.model.mesh, stage: window.__stage, crouch: window.__crouch, at: [g.player.position.x, g.player.position.z].map((v) => +v.toFixed(2)) };
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
