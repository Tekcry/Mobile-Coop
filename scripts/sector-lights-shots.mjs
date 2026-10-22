// Tracked GPU look script: Sector Ops light fittings (sector-fixes slice L; Michael 2026-10-22: "light fittings in same
// rooms are different heights and locations. Theres random lights on the roof. Theres a light in the middle of a climbing
// pipe." / "All lights should look like LED designs."). The Sector Ops warehouse at Epic, vision off, photo-freeze views
// of every section's fittings, the drainpipe and the roof. Writes <dir>/<prefix>-<view>.webp (960 px wide) and records
// draw calls per view. `--sheet` instead builds <dir>/sheet-before-after.webp from the before-* and after-* files.
// Serves dist/ with `vite preview` (needs a prior `npm run build`). GPU: E2E_GPU=1 on port 4189. Never headed.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 1200 node scripts/sector-lights-shots.mjs docs/sector-fixes/l before
//        E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/sector-lights-shots.mjs docs/sector-fixes/l --sheet
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/sector-fixes/l', prefix = 'before'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GFX = 'epic';
// The whole warehouse is built at once (a section change only moves guards and doors), so every view is a teleport.
const QUERY = 'autostart=warehouseOps&mode=sector&sectorGuards=4';
const WIDTH = 960;

// name, player feet [x, y, z], camera [x, y, z], target [x, y, z]
const ROWS = [
  // S1 yard facade: the drainpipe (x -22.4, z -18.23, y 0-6) and its wall lamp, the floodlights over the shutters, the roof edge
  ['s1-drainpipe', [-19, 0, -23], [-18.5, 1.6, -23.5], [-22.2, 3.6, -18.3]],
  // S1 roof: the roof masts over the hatch (5, -14.2), the pipe top (-22.2, -16.8) and the smoke vent (-19.6, -10.4)
  ['s1-roof', [-6, 6, -15], [-4, 8.2, -16.5], [-16, 6.8, -13]],
  // S1 goods-in bay: the high-bays (-17.8, 5.05, -14.9), (-11.65, 5.05, -11.2) and the reception-door lamp (-9.8, 3.2, -16)
  ['s1-goods-in', [-20, 0, -16.5], [-20.5, 1.7, -17], [-13, 4.2, -12]],
  // S1 workshop: the pendants (y 4) under the crane runway, the catwalk battens (y 5.1), the hand-over-hand pipe (x 12, y 4.7)
  ['s1-workshop', [10.5, 0, -16], [10.5, 1.7, -16], [18, 3.6, -12.5]],
  // S2 aisle x -12.6: the aisle pendants (y 2.6 - 3) and the roof-strip battens (y 5.8)
  ['s2-aisle', [-12.5, 0, -5.4], [-12.5, 1.7, -5.4], [-12.4, 3.4, 8]],
  // S2 cross aisle looking west: pendants over the cross aisle and the rack tops
  ['s2-cross-aisle', [-6.5, 0, 5.5], [-6.5, 2.2, 5.5], [-20, 3.6, 5.5]],
  // S3 assembly hall: the floor lamps (y 3.4 - 4.4)
  ['s3-hall', [1.5, 0, 4], [1.5, 1.7, 4], [6, 3.9, 9]],
  // S3 under the roof sheets, the deck lamps (y 5.4 - 5.8) and the sprinkler main (x 17, y 5)
  ['s3-deck-sheets', [14, 0, 8], [14, 4.0, 8], [15, 6.1, 11.6]],
  // S3 the east lobby and plant room: lamps over the lobby roof (y 5.8) and the plant battens
  ['s3-lobby', [14, 0, -2], [13.5, 2.4, 1], [20, 4.2, -5.5]],
];

/** Draw a PNG buffer into a canvas in `page` and return a webp buffer `w` px wide. */
async function toWebp(page, png, w = WIDTH) {
  const b64 = await page.evaluate(async ([src, w]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.round((img.height * w) / img.width);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.82).split(',')[1];
  }, [`data:image/png;base64,${png.toString('base64')}`, w]);
  return Buffer.from(b64, 'base64');
}

// vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
if (await fetch(URL).then(() => true, () => false)) { console.error(`sector-lights-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`sector-lights-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 1200 s'), 1_200_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('sector-lights-shots: served build verified');
mkdirSync(dir, { recursive: true });

if (prefix === '--sheet') {
  // the contact sheet: before | after per view, on a blank page
  const l = await launch({ url: URL, params: '' });
  browser = l.browser;
  const sp = await l.ctx.newPage();
  const img = (f) => (existsSync(f) ? `<img src="data:image/webp;base64,${readFileSync(f).toString('base64')}">` : '<div class="miss">missing</div>');
  const rows = ROWS.map(([name]) => `<figure>${img(`${dir}/before-${name}.webp`)}<figcaption>before: ${name}</figcaption></figure><figure>${img(`${dir}/after-${name}.webp`)}<figcaption>after: ${name}</figcaption></figure>`).join('');
  await sp.setViewportSize({ width: 1600, height: 400 });
  await sp.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}.miss{aspect-ratio:2/1;background:#300}</style><main>${rows}</main>`);
  await sp.waitForTimeout(500);
  const png = await sp.screenshot({ fullPage: true });
  writeFileSync(`${dir}/sheet-before-after.webp`, await toWebp(sp, png, 1600));
  console.log(`${dir}/sheet-before-after.webp`);
  await browser.close();
  clearTimeout(kill);
  stop();
  process.exit(0);
}

const l = await launch({ url: URL, params: `${QUERY}&gfx=${GFX}` });
browser = l.browser;
const page = l.page;
try {
  await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
  await page.waitForTimeout(3000);
  const conv = await l.ctx.newPage();
  // ONLY=a,b: just those views (a retry)
  const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
  for (const [name, p, c, t] of ROWS.filter(([n]) => !only.length || only.includes(n))) {
    const draws = await page.evaluate(async ([p, c, t]) => {
      const g = globalThis.__app.current;
      const V = g.player.position.constructor;
      g.photoFreeze(false);
      document.body.classList.remove('photo-mode');
      g.player.controller.teleport(new V(p[0], p[1], p[2]), Math.PI / 2);
      g.vision.set('off');
      await new Promise((res) => setTimeout(res, 900));
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      const cam = g.photoCamera();
      cam.position.set(c[0], c[1], c[2]);
      cam.setTarget(new V(t[0], t[1], t[2]));
      for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
      await new Promise((res) => setTimeout(res, 2000));
      const eng = g.scene.getEngine();
      const n = [];
      // the counter only grows here (nothing resets it per frame): take per-frame deltas
      await new Promise((res) => requestAnimationFrame(res));
      let prev = eng._drawCalls.current;
      for (let i = 0; i < 7; i++) {
        await new Promise((res) => requestAnimationFrame(res));
        const cur = eng._drawCalls.current;
        n.push(cur >= prev ? cur - prev : cur);
        prev = cur;
      }
      n.sort((a, b) => a - b);
      return n[3];
    }, [p, c, t]);
    const png = await page.screenshot({ timeout: 120_000 });
    writeFileSync(`${dir}/${prefix}-${name}.webp`, await toWebp(conv, png));
    console.log(`${name} draws=${draws}`);
  }
  if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
} catch (e) {
  await fail(`${QUERY} ${GFX}: ${String(e?.message ?? e)}`);
}
await browser.close();
browser = null;
clearTimeout(kill);
stop();
process.exit(0);
