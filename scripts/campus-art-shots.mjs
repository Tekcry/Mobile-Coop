// Tracked GPU look script: the campus detail art (sector-redesign ART-KIT step 7, ART-PLAN 6.2). Saltmarsh Park
// (campusOps) at Epic, vision off, photo-freeze: 35 fixed views (7 per section, the ART-S<N> briefs' "Views"). Writes
// <dir>/<prefix>-<view>.webp (960 px wide) and prints per view: draws, triangles, active meshes and the meter probe (the
// light field at the view's player feet + 1.0 m; light parity: every probe within 0.02 of the before build). `--sheet`
// instead builds <dir>/sheet-s<N>.webp per section (before | after per view) from the before-* and after-* files.
// Serves dist/ with `vite preview` (needs a prior `npm run build`). GPU: E2E_GPU=1 on port 4189. Never headed.
// From sector-lights-shots.mjs (vol-cone-fix). `before` is a build of the commit ART-KIT was cut from (pure greybox; copy
// this script into that worktree untracked for the run), `after` the integration head:
//   E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/campus-art-shots.mjs docs/sector-redesign/art before
//   E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/campus-art-shots.mjs docs/sector-redesign/art after
//   E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/campus-art-shots.mjs docs/sector-redesign/art --sheet
// Optional env: ONLY=s1-a,s2-b just those views; GFX=high another preset; SUFFIX=-high appended to each file name.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/sector-redesign/art', prefix = 'before'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GFX = process.env.GFX ?? 'epic';
const SUFFIX = process.env.SUFFIX ?? '';
// the whole campus is built at once (a section change only moves guards and doors), so every view is a teleport
const QUERY = 'autostart=campusOps&mode=sector&sectorGuards=0';
const WIDTH = 960;

// name, player feet [x, y, z], camera (eye) [x, y, z], target [x, y, z]: the ART-S<N> briefs' "Views" (eye -> target);
// the feet are under the eye (eye height 1.7, or the storey under a raised eye)
const ROWS = [
  // S1 (ART-S1 section 5)
  ['s1-a', [24, 0, -70], [24, 1.6, -70], [19, 1.2, -76]], // verge to the rear window
  ['s1-b', [15, 0, -74], [15, 1.7, -74], [19, 0.9, -77]], // gatehouse inside
  ['s1-c', [11, 0, -79.5], [11, 1.7, -79.5], [11, 1, -70]], // the barrier lane
  ['s1-d', [-36, 0, -78], [-36, 4, -78], [-15, 0.5, -60]], // the car park
  ['s1-e', [-28, 0, -50], [-28, 1.7, -50], [-37, 1, -47]], // bin store and feeder pillar
  ['s1-f', [-2, 0, -44], [-2, 1.7, -44], [-20, 2, -36]], // forecourt and canopy
  ['s1-g', [-28, 0, -43.5], [-28, 1.7, -43.5], [-38, 2, -41]], // delivery yard and the plant-roof ladder
  // S2 (ART-S2 section 5)
  ['s2-a', [-20, 0, -29.3], [-20, 1.7, -29.3], [-20, 1, -23]], // reception from C1
  ['s2-b', [-12, 0, -22], [-12, 1.7, -22], [-18, 6, -5]], // the atrium up
  ['s2-c', [-24, 0, -12], [-24, 1.7, -12], [-14, 0.8, -6]], // the cafe
  ['s2-d', [-42, 4.4, -28], [-42, 6.1, -28], [-32, 5, -10]], // L1 open plan west
  ['s2-e', [-22, 4.4, -23], [-22, 6.1, -23], [-26, 5, -28]], // the breakout kitchen
  ['s2-f', [-1, 4.4, 1], [-1, 6.1, 1], [-6, 5, 4]], // the facilities office
  ['s2-g', [-24, 8.4, -28], [-24, 10.1, -28], [-14, 9, -10]], // L2 offices
  // S3 (ART-S3 section 4)
  ['s3-a', [23, 0, -19], [23, 1.7, -19], [40, 2, -19]], // the hall from the west door
  ['s3-b', [27, 0, -24], [27, 1.7, -24], [33, 2.5, -18]], // the chamber
  ['s3-c', [46, 0, -24], [46, 1.7, -24], [51, 1.2, -15]], // burn-in racks
  ['s3-d', [25, 6.0, -29], [25, 7.7, -29], [45, 6, -20]], // the crane walkway
  ['s3-e', [23, 4.5, -7], [23, 6.2, -7], [50, 5.5, -7]], // the viewing corridor
  ['s3-f', [31, 4.5, -1], [31, 6.2, -1], [37, 5.2, -4]], // gowning and clean room
  ['s3-g', [45.5, 4.5, -1], [45.5, 6.2, -1], [50, 5.5, -5]], // the prototype store
  // S4 (ART-S4 section 4)
  ['s4-a', [10.5, 0, 22.5], [10.5, 1.7, 22.5], [10, 2, 32]], // the hall from the mantrap
  ['s4-b', [6.4, 0, 24.5], [6.4, 1.6, 24.5], [6.4, 1.2, 31]], // inside a hot aisle
  ['s4-c', [12, 0, 33], [12, 1.7, 33], [18, 1.2, 37]], // the cage
  ['s4-d', [3.6, 4.3, 24.5], [3.6, 6.0, 24.5], [3.6, 4.4, 40]], // the baskets
  ['s4-e', [-3, 3.6, 43], [-3, 5.3, 43], [4, 4.5, 47]], // the NOC
  ['s4-f', [-7, 0, 46], [-7, 1.7, 46], [-9, 1, 33]], // UPS and battery rooms
  ['s4-g', [37, 0, 17], [37, 1.7, 17], [37.5, 1.5, 37]], // the generator compound
  // S5 (ART-S5 section 4)
  ['s5-a', [-48, 0, 20], [-48, 1.7, 20], [-44, 3, 26]], // the stair hall and chandelier
  ['s5-b', [-43, 0, 33], [-43, 1.7, 33], [-43, 1.2, 42]], // anteroom to strongroom
  ['s5-c', [-41, 0, 43.5], [-41, 1.7, 43.5], [-45, 1.2, 38]], // inside the strongroom
  ['s5-d', [-39, 4.2, 43], [-39, 5.9, 43], [-44, 5.2, 35]], // the archive
  ['s5-e', [-51, 4.2, 19], [-51, 5.9, 19], [-54, 5, 28]], // the boardroom
  ['s5-f', [-30, 0, 47], [-30, 1.7, 47], [-55, 1, 52]], // the terrace and lawn
  ['s5-g', [-35, 0, 59], [-35, 1.7, 59], [-46, 1, 63]], // the jetty extract
];
if (ROWS.length !== 35) throw new Error(`campus-art-shots: ${ROWS.length} views, want 35`);

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
if (await fetch(URL).then(() => true, () => false)) { console.error(`campus-art-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`campus-art-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 1800 s'), 1_800_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('campus-art-shots: served build verified');
mkdirSync(dir, { recursive: true });

if (prefix === '--sheet') {
  // one contact sheet per section: before | after per view, on a blank page
  const l = await launch({ url: URL, params: '' });
  browser = l.browser;
  const sp = await l.ctx.newPage();
  const img = (f) => (existsSync(f) ? `<img src="data:image/webp;base64,${readFileSync(f).toString('base64')}">` : '<div class="miss">missing</div>');
  for (let s = 1; s <= 5; s++) {
    const rows = ROWS.filter(([n]) => n.startsWith(`s${s}-`))
      .map(([name]) => `<figure>${img(`${dir}/before-${name}${SUFFIX}.webp`)}<figcaption>before: ${name}</figcaption></figure><figure>${img(`${dir}/after-${name}${SUFFIX}.webp`)}<figcaption>after: ${name}</figcaption></figure>`)
      .join('');
    await sp.setViewportSize({ width: 1600, height: 400 });
    await sp.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}.miss{aspect-ratio:2/1;background:#300}</style><main>${rows}</main>`);
    await sp.waitForTimeout(500);
    const png = await sp.screenshot({ fullPage: true });
    writeFileSync(`${dir}/sheet-s${s}${SUFFIX}.webp`, await toWebp(sp, png, 1600));
    console.log(`${dir}/sheet-s${s}${SUFFIX}.webp`);
  }
  await browser.close();
  clearTimeout(kill);
  stop();
  process.exit(0);
}

// ONLY=a,b: just those views (a retry)
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
const picked = ROWS.filter(([n]) => !only.length || only.includes(n));
if (only.length && picked.length !== only.length) await fail(`unknown view in ONLY=${process.env.ONLY}`);
const l = await launch({ url: URL, params: `${QUERY}&gfx=${GFX}` });
browser = l.browser;
const page = l.page;
const summary = [];
try {
  await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
  await page.waitForTimeout(3000);
  const conv = await l.ctx.newPage();
  for (const [name, p, c, t] of picked) {
    const m = await page.evaluate(async ([p, c, t]) => {
      const g = globalThis.__app.current;
      const V = g.player.position.constructor;
      g.photoFreeze(false);
      document.body.classList.remove('photo-mode');
      g.team?.end?.(true);
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
      const art = g.world.campusArt?.counts?.() ?? null;
      return {
        draws: n[3],
        tris: Math.round(g.scene.getActiveIndices() / 3),
        active: g.scene.getActiveMeshes().length,
        meter: g.world.lightField.levelAt(p[0], p[1] + 1.0, p[2]),
        art: art ? `${art.draws}/${Math.round(art.tris / 1000)}k` : 'none',
      };
    }, [p, c, t]);
    const png = await page.screenshot({ timeout: 120_000 });
    writeFileSync(`${dir}/${prefix}-${name}${SUFFIX}.webp`, await toWebp(conv, png));
    const line = `${name}${SUFFIX} draws=${m.draws} tris=${m.tris} active=${m.active} meter=${m.meter.toFixed(3)} art=${m.art}`;
    console.log(line);
    summary.push(line);
  }
  if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  writeFileSync(`${dir}/${prefix}-counts${SUFFIX}.txt`, summary.join('\n') + '\n');
} catch (e) {
  await fail(`${QUERY} ${GFX}: ${String(e?.message ?? e)}`);
}
await browser.close();
browser = null;
clearTimeout(kill);
stop();
process.exit(0);
