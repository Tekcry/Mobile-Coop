// Tracked GPU look script: map walk videos for review (campaign look-video; RULES "Walk pacing": a lighting or animation PR
// carries a 1-2 min look video). A plan file names the boot params and, per section, a camera path: each point is a camera
// position, a look target and the seconds to reach it from the previous point (0 is a cut). One browser per section records
// a 1280 x 720 video (Playwright `recordVideo`) while the photo camera flies the path, interpolated linearly per rendered
// frame, with the world frozen (photo-freeze, HUD off, vision off, the operator hidden) as e2e-darkness does. Writes
// <outDir>/<key>.webm and <outDir>/<key>.json ({ start, seconds }: the flight starts `start` seconds into the video, after the
// boot) and prints both. Videos are never committed: the PR body names their path.
// Serves dist/ with `vite preview` (needs a prior `npm run build`). GPU: E2E_GPU=1 on port 4189 (port from E2E_PORT). Never headed.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 1800 node scripts/look-video.mjs <dir> scripts/look-video/tallowWharf.json w1,w2
// Optional env: GFX=high another preset (default epic).
// The pure parts (`parseLookPlan`, `pathAt`, `pathSeconds`) are exported for tests/lookVideo.test.ts; importing this file
// starts nothing.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Length of a path in seconds: the sum of its points' segment times (the first point's is 0). */
export function pathSeconds(path) {
  let t = 0;
  for (let i = 1; i < path.length; i++) t += path[i][6];
  return t;
}

/**
 * Validate a look plan (an object or its JSON text) and return the picked sections in file order:
 * `[{ key, seconds, path }]`. `only` names section keys (empty: all); an unknown key throws. Each point is
 * `[x, y, z, tx, ty, tz, s]` (seven finite numbers, `s` >= 0; the first point's `s` is 0); a section's `seconds` (> 0) is the
 * flight's length and the path must fit in it (the camera holds the last view for the rest).
 */
export function parseLookPlan(json, only = []) {
  const plan = typeof json === 'string' ? JSON.parse(json) : json;
  if (!plan || typeof plan !== 'object') throw new Error('look plan: not an object');
  if (typeof plan.params !== 'string' || !plan.params) throw new Error('look plan: params must be a non-empty string');
  const sections = plan.sections;
  if (!sections || typeof sections !== 'object' || !Object.keys(sections).length) throw new Error('look plan: no sections');
  for (const k of only) if (!Object.hasOwn(sections, k)) throw new Error(`look plan: unknown section "${k}"`);
  const out = [];
  for (const [key, sec] of Object.entries(sections)) {
    if (only.length && !only.includes(key)) continue;
    if (!sec || typeof sec !== 'object') throw new Error(`look plan: section ${key} is not an object`);
    const { seconds, path } = sec;
    if (typeof seconds !== 'number' || !(seconds > 0)) throw new Error(`look plan: section ${key} needs seconds > 0`);
    if (!Array.isArray(path) || path.length < 2) throw new Error(`look plan: section ${key} needs a path of 2 or more points`);
    path.forEach((p, i) => {
      if (!Array.isArray(p) || p.length !== 7 || !p.every((v) => typeof v === 'number' && Number.isFinite(v))) {
        throw new Error(`look plan: section ${key} point ${i} is not [x, y, z, tx, ty, tz, s] (${JSON.stringify(p)})`);
      }
      if (p[6] < 0) throw new Error(`look plan: section ${key} point ${i} has a negative time`);
      if (i === 0 && p[6] !== 0) throw new Error(`look plan: section ${key} point 0 must have time 0`);
    });
    const total = pathSeconds(path);
    if (!(total > 0)) throw new Error(`look plan: section ${key} path takes no time`);
    if (total > seconds + 1e-9) throw new Error(`look plan: section ${key} path takes ${total} s, over its ${seconds} s`);
    out.push({ key, seconds, path });
  }
  return out;
}

/**
 * The camera at time `t` (s) along `path`: `[x, y, z, tx, ty, tz]`, linear between points, clamped at both ends; a 0 s
 * segment is a cut (at its time the next segment starts from the cut's point). Self-contained (no outer names): the
 * browser side runs this same source.
 */
export function pathAt(path, t) {
  const n = path.length;
  let acc = 0;
  if (t > 0) {
    for (let i = 1; i < n; i++) {
      const d = path[i][6];
      if (d > 0 && t < acc + d) {
        const a = path[i - 1];
        const b = path[i];
        const f = (t - acc) / d;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f, a[4] + (b[4] - a[4]) * f, a[5] + (b[5] - a[5]) * f];
      }
      acc += d;
    }
  }
  const p = t > 0 ? path[n - 1] : path[0];
  return [p[0], p[1], p[2], p[3], p[4], p[5]];
}

/** (browser side) Fly the photo camera along `path` for `seconds` of wall time, a pose per rendered frame; resolves when done. */
function fly(at, path, seconds) {
  const g = globalThis.__app.current;
  const V = g.player.position.constructor;
  const cam = g.photoCamera();
  return new Promise((done) => {
    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      const c = at(path, t);
      cam.position.set(c[0], c[1], c[2]);
      cam.setTarget(new V(c[3], c[4], c[5]));
      if (t >= seconds) done(t);
      else requestAnimationFrame(frame);
    };
    frame();
  });
}

async function main() {
  const [outDir, file, picks = ''] = process.argv.slice(2);
  if (!outDir || !file) {
    console.error('usage: node scripts/look-video.mjs <outDir> <plan.json> [sections]');
    process.exit(2);
  }
  const PORT = Number(process.env.E2E_PORT ?? 4189);
  const URL = `http://127.0.0.1:${PORT}/`;
  const GFX = process.env.GFX ?? 'epic';
  const SIZE = { width: 1280, height: 720 };
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  const sections = parseLookPlan(plan, picks.split(',').filter(Boolean));
  const { launch, waitOperator } = await import('./e2e-lib.mjs');

  // vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
  if (await fetch(URL).then(() => true, () => false)) { console.error(`look-video: port ${PORT} already in use`); process.exit(2); }
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
  let browser = null;
  const stop = () => { try { server.kill(); } catch { /* already gone */ } };
  process.on('exit', stop);
  const fail = async (msg) => { console.error(`look-video: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
  const kill = setTimeout(() => fail('timed out after 1800 s'), 1_800_000);

  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  if (!up) await fail('preview server did not start (run `npm run build` first)');
  if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
  if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
  console.log('look-video: served build verified');
  mkdirSync(outDir, { recursive: true });

  for (const { key, seconds, path } of sections) {
    const tmp = `${outDir}/tmp-${key}`;
    const t0 = Date.now();
    const l = await launch({ url: URL, params: `${plan.params}&gfx=${GFX}`, viewport: SIZE, context: { recordVideo: { dir: tmp, size: SIZE } } });
    browser = l.browser;
    const page = l.page;
    try {
      await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
      if ((await waitOperator(page)) < 0) console.log(`look-video: ${key}: the operator did not load in time (recording anyway)`);
      // the world frozen and the HUD off as e2e-darkness does; vision off; the operator hidden (the camera flies away from it)
      await page.evaluate(async (first) => {
        const g = globalThis.__app.current;
        g.vision.set('off');
        g.photoFreeze(true);
        document.body.classList.add('photo-mode');
        g.player.rig.setEnabled(false);
        const V = g.player.position.constructor;
        const cam = g.photoCamera();
        cam.position.set(first[0], first[1], first[2]);
        cam.setTarget(new V(first[3], first[4], first[5]));
        for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
        await new Promise((res) => setTimeout(res, 1000));
      }, path[0]);
      const start = (Date.now() - t0) / 1000;
      const flown = await page.evaluate(`(${fly})(${pathAt}, ${JSON.stringify(path)}, ${seconds})`);
      if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
      const video = page.video();
      await l.ctx.close();
      const out = `${outDir}/${key}.webm`;
      renameSync(await video.path(), out);
      rmSync(tmp, { recursive: true, force: true });
      const meta = { start: Math.round(start * 10) / 10, seconds: Math.round(flown * 10) / 10 };
      writeFileSync(`${outDir}/${key}.json`, `${JSON.stringify(meta)}\n`);
      console.log(`${out} ${meta.seconds.toFixed(1)} s (the flight starts ${meta.start.toFixed(1)} s into the video)`);
    } catch (e) {
      await fail(`${key}: ${String(e?.message ?? e)}`);
    }
    await browser.close();
    browser = null;
  }
  clearTimeout(kill);
  stop();
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
