// Tracked GPU look script: Sector Ops light fittings (sector-fixes slice L; Michael 2026-10-22: "light fittings in same
// rooms are different heights and locations. Theres random lights on the roof. Theres a light in the middle of a climbing
// pipe." / "All lights should look like LED designs."). The Sector Ops warehouse at Epic, vision off, photo-freeze views
// of every section's fittings, the drainpipe and the roof. Writes <dir>/<prefix>-<view>.webp (960 px wide) and records
// draw calls per view. `--sheet` instead builds <dir>/sheet-before-after.webp from the before-* and after-* files.
// Serves dist/ with `vite preview` (needs a prior `npm run build`). GPU: E2E_GPU=1 on port 4189. Never headed.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 1200 node scripts/sector-lights-shots.mjs docs/archive/sector-fixes/l before
//        E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/sector-lights-shots.mjs docs/archive/sector-fixes/l --sheet
// Optional env (defaults unchanged): ONLY=a,b just those views; GFX=high another preset; VOL=off the volumetric light
// shafts off (the post stack scatters no lights, the height fog stays); SUFFIX=-high appended to each file name;
// PROBE=1 logs the light field (meter / guards) under the camera's view and the volumetric pass's lights; VOLFIX=1
// previews the look-4.58 NOTE's proposed volumetric fix in the page (src unchanged).
// (vol-cone-fix) Rows may name another map (the 5th field, a key of MAPS): Marlow Yard (no spot or flood exists there:
// its views check that the lamp-only map does not change), the base Warehouse's facade floods (sandbox), and the S1
// workshop strips over the crane girder. Each map boots once (one browser per map, in turn). The 2nd argument is the
// file prefix, so `before` / `after` (or any name) give before-<view>.webp / after-<view>.webp, e.g. the vol-cone-fix set:
//   E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/sector-lights-shots.mjs docs/archive/vol-cone-fix before
//   E2E_GPU=1 E2E_PORT=4189 GFX=high SUFFIX=-high ONLY=s1-goods-in,s1-workshop timeout 900 node scripts/sector-lights-shots.mjs docs/archive/vol-cone-fix before
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/archive/sector-fixes/l', prefix = 'before'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GFX = process.env.GFX ?? 'epic';
const VOL_OFF = process.env.VOL === 'off';
const VOL_FIX = process.env.VOLFIX === '1';
const SUFFIX = process.env.SUFFIX ?? '';
const PROBE = process.env.PROBE === '1';
// The whole warehouse is built at once (a section change only moves guards and doors), so every view is a teleport.
const MAPS = {
  ops: 'autostart=warehouseOps&mode=sector&sectorGuards=4',
  marlow: 'autostart=ctcourse&mode=course',
  warehouse: 'autostart=warehouse&mode=sandbox',
};
const WIDTH = 960;

// name, player feet [x, y, z], camera [x, y, z], target [x, y, z], map (a MAPS key; default ops)
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
  // (vol-cone-fix) S1 workshop looking west at the crane girder (x 16, y 4.5-4.9, z -16.5 to -9.5, warehouseS1.ts ~:334)
  // under the two HALL-beam strips at x 16 (z -15.8 and -11.8, y 5.58): the fog cone ran through the girder to the floor
  ['s1-girder', [22.5, 0, -13.6], [22.5, 1.5, -13.6], [16, 3.0, -13.6]],
  // (vol-cone-fix) Marlow Yard (ctcourse): S2 high hall pendants and the S7 high hall (lamps only, no cone light on the map)
  ['marlow-s2-wall', [29.4, 0, 7], [26, 2.4, 2.5], [31, 2.6, 7], 'marlow'],
  ['marlow-s7-hall', [145, 0, 1], [146, 2.6, 5], [142.5, 1.6, 1], 'marlow'], // the shots-ctcourse s7-stair framing
  // (vol-cone-fix) base Warehouse (sandbox) yard: the facade floods over the dock doors (-18.5 / -10.5, 5.6, -18.6) and
  // the workshop door (11.5, 4.6, -18.6), FLOOD cones 0.7 rad tilted out to the yard (warehouse.ts ~:408)
  // cameras inside the yard (the perimeter south wall is z -27 to -26) and east of the container (x 6-12)
  ['wh-floods-dock', [-23, 0, -25.2], [-22, 2.2, -25], [-13, 2.5, -19], 'warehouse'],
  ['wh-flood-workshop', [19, 0, -24.8], [17, 2.4, -25], [11.5, 2.2, -19.5], 'warehouse'],
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
const kill = setTimeout(() => fail('timed out after 1800 s'), 1_800_000);

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

// ONLY=a,b: just those views (a retry)
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
const picked = ROWS.filter(([n]) => !only.length || only.includes(n));
if (only.length && picked.length !== only.length) await fail(`unknown view in ONLY=${process.env.ONLY}`);
// one browser per map, in table order of first use
for (const map of [...new Set(picked.map((r) => r[4] ?? 'ops'))]) {
  const QUERY = MAPS[map];
  const l = await launch({ url: URL, params: `${QUERY}&gfx=${GFX}` });
  browser = l.browser;
  const page = l.page;
  try {
    await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
    await page.waitForTimeout(3000);
    const conv = await l.ctx.newPage();
    for (const [name, p, c, t] of picked.filter((r) => (r[4] ?? 'ops') === map)) {
      const draws = await page.evaluate(async ([p, c, t, volOff, volFix]) => {
        const g = globalThis.__app.current;
        // VOL=off: the post stack scatters no lights (the height fog stays)
        if (volOff) g.stack.setAdaptive(1, 0);
        // VOLFIX=1 (a preview of a proposed fix, docs/archive/sector-fixes/l/look-4.58/NOTE.md; nothing in src changes): every
        // fixed light, spots included, scatters under its shade like a lamp; only flashlights keep the long beam
        if (volFix && !g.stack.volFixed) {
          const st = g.stack;
          const frame = st.frame.bind(st);
          st.volFixed = true;
          st.frame = (dt) => {
            frame(dt);
            const ls = st.opts.lights?.lights ?? [];
            for (let i = 0; i < st.volCount; i++) {
              const l = ls[st.ids[i]];
              if (!l || l.kind === 'flashlight' || !l.cone) continue;
              st.lPos[i * 4 + 3] = Math.min(3.2, l.radius * 0.5, Math.max(0.8, l.y));
              st.lDir[i * 4 + 3] = Math.max(l.cone.cosOuter, 0.88);
              for (let c = 0; c < 3; c++) st.lCol[i * 4 + c] = l.color[c] * l.intensity;
            }
          };
        }
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
        return n[3];
      }, [p, c, t, VOL_OFF, VOL_FIX]);
      const png = await page.screenshot({ timeout: 120_000 });
      writeFileSync(`${dir}/${prefix}-${name}${SUFFIX}.webp`, await toWebp(conv, png));
      console.log(`${name}${SUFFIX} draws=${draws}`);
      if (PROBE) {
        // the light field (what the meter and the guards read) under each lit ceiling light within 9 m of the player,
        // beside what the volumetric pass scatters for it this frame
        const probe = await page.evaluate(([p]) => {
          const g = globalThis.__app.current;
          const st = g.stack;
          const f = g.world.lightField;
          const out = [`player light ${g.lightLevel.toFixed(2)} vol lights ${st.volCount}`];
          for (let i = 0; i < st.volCount; i++) {
            const q = (a) => [0, 1, 2, 3].map((k) => st[a][i * 4 + k].toFixed(2)).join(',');
            out.push(`  vol[${i}] pos,r ${q('lPos')} dir,cosOuter ${q('lDir')} col ${q('lCol')}`);
          }
          for (const l of st.opts.lights.lights) {
            if (!l.on || l.kind === 'flashlight' || l.y < 3 || Math.sqrt((l.x - p[0]) ** 2 + (l.z - p[2]) ** 2) > 9) continue;
            const lv = (x, y, z) => f.levelAt(x, y, z).toFixed(2);
            out.push(`  ${l.kind} ${l.fixture?.model ?? 'box'} (${l.x}, ${l.y}, ${l.z}) r ${l.radius} i ${l.intensity} cosOuter ${l.cone ? l.cone.cosOuter.toFixed(3) : '-'}: field under it y0.05 ${lv(l.x, 0.05, l.z)} y1 ${lv(l.x, 1, l.z)} y1.7 ${lv(l.x, 1.7, l.z)} y3 ${lv(l.x, 3, l.z)} y4.5 ${lv(l.x, 4.5, l.z)}; 2 m off at y1 ${lv(l.x + 2, 1, l.z)}, 3.5 m off ${lv(l.x + 3.5, 1, l.z)}`);
          }
          return out.join('\n');
        }, [p]);
        console.log(probe);
      }
    }
    if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  } catch (e) {
    await fail(`${QUERY} ${GFX}: ${String(e?.message ?? e)}`);
  }
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(0);
