// Animation look videos (player-batch-j19 S8a, R31; map fly-throughs: scripts/look-video.mjs): records 1-2 minute
// videos of scripted scenes for Michael's walk cards. Serves
// dist/ with `vite preview` (or records from `--url`), launches ONE headless browser per scene list with Playwright's own
// `recordVideo`, drives the fake pad through each scene on the match clock and writes <out>/<list name>.webm. The game
// runs live (no manual loop): the video holds real frames, the page's boot and load before the first scene included, and
// a scene whose params differ from the page's reloads the page (that boot is in the video too).
// Usage: node scripts/anim-video.mjs --scenes <list>[,<list>...] --out <dir> [--gfx <preset>] [--size <W>x<H>]
//          [--url <base>] [--port <n>] [--help]
// Never headed; output outside git; needs a prior `npm run build` unless `--url`. Look videos run on the laptop look tier:
//   npm run build && E2E_GPU=1 E2E_PORT=4189 node scripts/anim-video.mjs --scenes smoke --out C:/NightShift/scratch/look/<job>
// Scene list (JSON; or the built-in name `smoke`), one .webm per list:
//   { "name": "walk-gears", "params": "autostart=proving", "hud": false,
//     "scenes": [ { "name": "Walk, gear 3, side view", "params": "autostart=proving&gear=3", "seconds": 8, "view": "side",
//                   "place": [0, 0, -14, 1.5708],
//                   "steps": [ { "t": 0, "move": [0, 1] }, { "t": 6, "move": [0, 0] }, { "t": 6.5, "press": "B" } ] } ] }
//   list: name (a-z0-9 words joined by -, <= 40 chars: the file name), params (the page query, must name autostart=), hud
//   (default false: hidden), scenes (>= 1, total <= 120 s). scene: name (the caption, 1-60 chars), seconds (0 < s <= 120),
//   params (replaces the list's), view (ots side front back left front34; default ots, the game camera), place
//   ([x, y, z, yaw]: a teleport at the scene start), steps. step: t (match seconds from the scene start, non-decreasing)
//   and one of move [x, fwd] / look [x, up] (sticks, -1..1), press "<BTN>" (0.1 s), hold "<BTN>" with for (s), js
//   "<code>" (a = window.__app, g = a.current).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GFX = ['min', 'low', 'medium', 'high', 'ultra', 'epic'];
const VIEWS = ['ots', 'side', 'front', 'back', 'left', 'front34'];
// copied from scripts/e2e-lib.mjs:243 (`BTN`): that module imports playwright-core, so it is loaded only inside the run
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, LS: 10, RS: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PRESS_S = 0.1;
const MAX_TOTAL = 120;
const SHORT_TOTAL = 60;

const USAGE = `Usage: node scripts/anim-video.mjs --scenes <list>[,<list>...] --out <dir> [--gfx <preset>] [--size <W>x<H>] [--url <base>] [--port <n>] [--help]
  --scenes  scene-list JSON files or the built-in name smoke; comma-separated, the flag may repeat. One .webm per list.
  --out     output folder outside the repository (created if missing): <out>/<list name>.webm
  --gfx     ${GFX.join(' ')} (default high)
  --size    viewport and video size, <W>x<H> (default 1280x720; W 320-3840, H 240-2160)
  --url     record from this running server (no vite preview started, no dist check)
  --port    the vite preview port when no --url (default E2E_PORT, else 4189)
Never headed (E2E_HEADED=1 is an error); needs a prior \`npm run build\` unless --url. Scene-list format: the header of
scripts/anim-video.mjs. Exit 0 done, 1 run failure, 2 usage or list error.
`;

/** The built-in lists, in the raw JSON form (parsed by `parseSceneList` like a file). */
export const BUILTIN_LISTS = {
  smoke: {
    name: 'smoke',
    params: 'autostart=proving',
    scenes: [
      { name: 'Stand, game camera', seconds: 4, view: 'ots' },
      { name: 'Walk forward, side view', seconds: 8, view: 'side', place: [0, 0, -14, 1.5708], steps: [{ t: 0, move: [0, 1] }, { t: 6, move: [0, 0] }] },
      { name: 'Look round', seconds: 6, view: 'ots', steps: [{ t: 0, look: [1, 0] }, { t: 3, look: [0, 0] }] },
    ],
  },
};

/** True when `dir` resolves outside `root` (a relative path from the root that leaves it, or another drive). */
export function outsideRepo(dir, root = ROOT) {
  const rel = path.relative(root, path.resolve(dir));
  return path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`);
}

/** The command line (`process.argv.slice(2)`) and environment; throws an Error with a one-line message on a usage error. */
export function parseArgs(argv, env = {}) {
  const lists = [];
  let out = null;
  let gfx = 'high';
  let size = '1280x720';
  let url = null;
  let port = null;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
      continue;
    }
    if (!['--scenes', '--out', '--gfx', '--size', '--url', '--port'].includes(a)) throw new Error(`unknown flag ${a} (see --help)`);
    const v = argv[++i];
    if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
    if (a === '--scenes') {
      for (const l of v.split(',')) {
        if (!l.trim()) throw new Error(`--scenes has an empty list name in "${v}"`);
        lists.push(l.trim());
      }
    } else if (a === '--out') out = v;
    else if (a === '--gfx') gfx = v;
    else if (a === '--size') size = v;
    else if (a === '--url') url = v;
    else port = v;
  }
  if (env.E2E_HEADED === '1') throw new Error('E2E_HEADED=1: look videos are always headless (unset it)');
  if (!GFX.includes(gfx)) throw new Error(`--gfx must be one of ${GFX.join(' ')} (got "${gfx}")`);
  const m = /^(\d+)x(\d+)$/.exec(size);
  const width = m ? Number(m[1]) : NaN;
  const height = m ? Number(m[2]) : NaN;
  if (!(width >= 320 && width <= 3840 && height >= 240 && height <= 2160)) throw new Error(`--size must be <W>x<H> with W 320-3840 and H 240-2160 (got "${size}")`);
  if (url !== null) {
    let ok;
    try {
      ok = /^https?:$/.test(new URL(url).protocol);
    } catch {
      ok = false;
    }
    if (!ok) throw new Error(`--url must be an http(s) URL (got "${url}")`);
  }
  const portSrc = port ?? env.E2E_PORT ?? '4189';
  const portNum = /^\d+$/.test(portSrc) ? Number(portSrc) : NaN;
  if (!(portNum >= 1 && portNum <= 65535)) throw new Error(`${port === null ? 'E2E_PORT' : '--port'} must be an integer 1-65535 (got "${portSrc}")`);
  const base = { lists, out: out === null ? '' : path.resolve(out), gfx, size: { width, height }, url, port: portNum, help };
  if (help) return base;
  if (!lists.length) throw new Error('--scenes is required (a scene-list JSON file or smoke)');
  if (out === null) throw new Error('--out is required (a folder outside the repository)');
  if (!outsideRepo(base.out)) throw new Error(`--out must be outside the repository (got ${base.out})`);
  return base;
}

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const LIST_KEYS = ['name', 'params', 'hud', 'scenes'];
const SCENE_KEYS = ['name', 'seconds', 'params', 'view', 'place', 'steps'];
const ACTIONS = ['move', 'look', 'press', 'hold', 'js'];
const STEP_KEYS = ['t', ...ACTIONS, 'for'];

/** Why a `params` query is not usable, or null. */
function paramsProblem(p) {
  if (typeof p !== 'string' || !p) return 'params must be a non-empty query string';
  if (/^[?&]/.test(p)) return `params must not start with ? or & (got "${p}")`;
  // as e2e-lib's openPage (scripts/e2e-lib.mjs:223), which waits for the match only then
  if (!/(^|&)autostart=/.test(p)) return `params must contain autostart= (got "${p}")`;
  return null;
}

/** A scene list (parsed JSON, or its text) -> the normalised list; throws one Error naming every problem. */
export function parseSceneList(json, label) {
  let j = json;
  if (typeof j === 'string') {
    try {
      j = JSON.parse(j);
    } catch (e) {
      throw new Error(`${label}: not valid JSON (${e.message})`, { cause: e });
    }
  }
  if (!isObj(j)) throw new Error(`${label}: must be a JSON object`);
  const bad = [];
  for (const k of Object.keys(j)) if (!LIST_KEYS.includes(k)) bad.push(`${label}: unknown field ${k}`);
  if (typeof j.name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(j.name) || j.name.length > 40) bad.push(`${label}: name must be lower-case a-z0-9 words joined by -, at most 40 characters (got ${JSON.stringify(j.name)})`);
  const lp = paramsProblem(j.params);
  if (lp) bad.push(`${label}: ${lp}`);
  if (j.hud !== undefined && typeof j.hud !== 'boolean') bad.push(`${label}: hud must be true or false`);
  if (!Array.isArray(j.scenes) || !j.scenes.length) bad.push(`${label}: scenes must be an array of at least one scene`);
  const scenes = [];
  let total = 0;
  for (const [i, s] of (Array.isArray(j.scenes) ? j.scenes : []).entries()) {
    const at = `${label} scene ${i}`;
    if (!isObj(s)) {
      bad.push(`${at}: must be an object`);
      continue;
    }
    for (const k of Object.keys(s)) if (!SCENE_KEYS.includes(k)) bad.push(`${at}: unknown field ${k}`);
    if (typeof s.name !== 'string' || s.name.length < 1 || s.name.length > 60) bad.push(`${at}: name must be 1-60 characters`);
    const secOk = isNum(s.seconds) && s.seconds > 0 && s.seconds <= MAX_TOTAL;
    if (secOk) total += s.seconds;
    else bad.push(`${at}: seconds must be a number above 0 and at most ${MAX_TOTAL} (got ${JSON.stringify(s.seconds)})`);
    if (s.params !== undefined) {
      const sp = paramsProblem(s.params);
      if (sp) bad.push(`${at}: ${sp}`);
    }
    if (s.view !== undefined && !VIEWS.includes(s.view)) bad.push(`${at}: view must be one of ${VIEWS.join(' ')} (got ${JSON.stringify(s.view)})`);
    if (s.place !== undefined && !(Array.isArray(s.place) && s.place.length === 4 && s.place.every(isNum))) bad.push(`${at}: place must be [x, y, z, yaw], four finite numbers`);
    if (s.steps !== undefined && !Array.isArray(s.steps)) bad.push(`${at}: steps must be an array`);
    let prevT = -Infinity;
    for (const [k, st] of (Array.isArray(s.steps) ? s.steps : []).entries()) {
      const sa = `${at} step ${k}`;
      if (!isObj(st)) {
        bad.push(`${sa}: must be an object`);
        continue;
      }
      for (const key of Object.keys(st)) if (!STEP_KEYS.includes(key)) bad.push(`${sa}: unknown field ${key}`);
      if (!isNum(st.t) || st.t < 0 || (secOk && st.t > s.seconds)) bad.push(`${sa}: t must be a number from 0 to the scene's seconds (got ${JSON.stringify(st.t)})`);
      else if (st.t < prevT) bad.push(`${sa}: t ${st.t} is before the previous step's ${prevT} (steps in order of t)`);
      if (isNum(st.t)) prevT = Math.max(prevT, st.t);
      const acts = ACTIONS.filter((a) => st[a] !== undefined);
      if (acts.length !== 1) bad.push(`${sa}: needs exactly one action of ${ACTIONS.join(' ')} (has ${acts.length ? acts.join(' + ') : 'none'})`);
      for (const [a, axes] of [['move', 'x, fwd'], ['look', 'x, up']]) {
        if (st[a] !== undefined && !(Array.isArray(st[a]) && st[a].length === 2 && st[a].every((v) => isNum(v) && v >= -1 && v <= 1))) bad.push(`${sa}: ${a} must be [${axes}], each from -1 to 1`);
      }
      for (const a of ['press', 'hold']) {
        if (st[a] !== undefined && !(typeof st[a] === 'string' && Object.hasOwn(BTN, st[a]))) bad.push(`${sa}: ${a} must be a button name, one of ${Object.keys(BTN).join(' ')} (got ${JSON.stringify(st[a])})`);
      }
      if (st.hold !== undefined && !(isNum(st.for) && st.for > 0)) bad.push(`${sa}: hold needs for, a number of seconds above 0`);
      if (st.for !== undefined && st.hold === undefined) bad.push(`${sa}: for is only allowed with hold`);
      if (st.js !== undefined && (typeof st.js !== 'string' || !st.js)) bad.push(`${sa}: js must be a non-empty string of code`);
    }
    scenes.push({
      name: s.name,
      seconds: s.seconds,
      params: s.params ?? j.params,
      view: s.view ?? 'ots',
      ...(s.place !== undefined ? { place: s.place } : {}),
      steps: (Array.isArray(s.steps) ? s.steps : []).map((st) => ({ ...st })),
    });
  }
  if (total > MAX_TOTAL) bad.push(`${label}: scenes total ${total} s, more than ${MAX_TOTAL} s`);
  if (bad.length) throw new Error(bad.join('; '));
  return { name: j.name, params: j.params, hud: j.hud ?? false, scenes };
}

/** The page query: `params`, plus the preset unless it names gfx=, plus gear=none unless it names gear= (so e2e-lib's
 *  openPage, scripts/e2e-lib.mjs:190-193, adds neither gfx=min nor gear=4). */
export function pageParams(params, gfx) {
  let q = params;
  if (!/(^|&)gfx=/.test(q)) q += `&gfx=${gfx}`;
  if (!/(^|&)gear=/.test(q)) q += '&gear=none';
  return q;
}

/** A scene's steps -> the pad timeline, stably sorted by t (Array sort is stable): sticks as the standard pad (up is
 *  negative, src/input/gamepadMapping.ts mapPad), a press held 0.1 s, a hold for its `for`, js kept. */
export function padEvents(steps) {
  const ev = [];
  for (const s of steps) {
    if (s.move !== undefined) ev.push({ t: s.t, kind: 'axis', i: 0, v: s.move[0] }, { t: s.t, kind: 'axis', i: 1, v: 0 - s.move[1] });
    else if (s.look !== undefined) ev.push({ t: s.t, kind: 'axis', i: 2, v: s.look[0] }, { t: s.t, kind: 'axis', i: 3, v: 0 - s.look[1] });
    else if (s.press !== undefined) ev.push({ t: s.t, kind: 'button', i: BTN[s.press], v: 1 }, { t: s.t + PRESS_S, kind: 'button', i: BTN[s.press], v: 0 });
    else if (s.hold !== undefined) ev.push({ t: s.t, kind: 'button', i: BTN[s.hold], v: 1 }, { t: s.t + s.for, kind: 'button', i: BTN[s.hold], v: 0 });
    else if (s.js !== undefined) ev.push({ t: s.t, kind: 'js', code: s.js });
  }
  return ev.sort((a, b) => a.t - b.t);
}

/** A list argument -> the parsed list (built-in name or JSON file); throws a list error. */
function loadList(arg) {
  if (Object.hasOwn(BUILTIN_LISTS, arg)) return parseSceneList(BUILTIN_LISTS[arg], arg);
  let text;
  try {
    text = fs.readFileSync(arg, 'utf8');
  } catch (e) {
    throw new Error(`${arg}: cannot read the scene list (${e.code ?? e.message})`, { cause: e });
  }
  return parseSceneList(text, arg);
}

class RunFailure extends Error {}

/** Unless the list shows the HUD: everything but the game canvas and the caption hidden (as scripts/anim-sheet.mjs:171).
 *  Always: the caption box. */
async function dress(page, hud) {
  if (!hud) await page.addStyleTag({ content: 'body > :not(#game):not(#look-caption), .hud, .screens, .toasts, .toast { display: none !important; }' });
  await page.evaluate(() => {
    if (document.getElementById('look-caption')) return;
    const d = document.createElement('div');
    d.id = 'look-caption';
    d.style.cssText = 'position:fixed;left:16px;bottom:16px;padding:4px 10px;font:14px/1.3 sans-serif;color:#fff;background:rgba(0,0,0,0.55);border-radius:4px;pointer-events:none;z-index:2147483647';
    document.body.appendChild(d);
  });
}

/** Once per page load: the camera views, read from window.__lookView on every update (scripts/anim-sheet.mjs:215-252,
 *  without its footage camera and fixed-yaw options). */
async function wrapCamera(page) {
  await page.evaluate(() => {
    const p = window.__app.current.player;
    if (p.cam.__lookWrapped) return;
    p.cam.__lookWrapped = true;
    const origUpdate = p.cam.update.bind(p.cam);
    p.cam.update = (dt, feet, crouch) => {
      origUpdate(dt, feet, crouch);
      const v = window.__lookView ?? 'ots';
      if (v === 'ots') return;
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const fy = p.controller.renderYaw;
      const fx = Math.sin(fy);
      const fz = Math.cos(fy);
      const D = 3;
      const off = v === 'front' ? [fx * D, fz * D] : v === 'back' ? [-fx * D, -fz * D] : v === 'left' ? [-fz * D, fx * D]
        : v === 'front34' ? [(fx + fz) * D * 0.7071, (fz - fx) * D * 0.7071]
        : [fz * D * 1.033, -fx * D * 1.033];
      c.position.set(r.x + off[0], r.y + 1.05, r.z + off[1]);
      c.setTarget(new r.constructor(r.x + fx * 0.15, r.y + 0.85, r.z + fz * 0.15));
    };
  });
}

/** The match running with Wren loaded, or a RunFailure. */
async function ready(page, waitOperator, what) {
  const boot = await page.evaluate(() => document.getElementById('boot-status')?.textContent ?? '');
  if (/Failed/.test(boot)) throw new RunFailure(`${what}: the game failed to boot (${boot.trim()})`);
  const match = await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 120000 }).then(() => true, () => false);
  if (!match) throw new RunFailure(`${what}: the match did not start within 120 s`);
  if ((await waitOperator(page)) < 0) throw new RunFailure(`${what}: Wren not loaded (her model never reached the screen within 120 s)`);
}

/** One scene: the pad reset, the teleport, the view, the caption and the in-page driver on the match clock. */
async function playScene(page, list, i, sc) {
  const events = padEvents(sc.steps);
  await page.evaluate(({ name, view, place, events, seconds }) => {
    const a = window.__app;
    const g = a.current;
    const pad = window.__pad;
    pad.connect();
    for (let k = 0; k < 4; k++) pad.axis(k, 0);
    for (let k = 0; k < 17; k++) pad.set(k, 0);
    if (place) {
      const V = g.player.controller.pos.constructor;
      g.player.controller.teleport(new V(place[0], place[1], place[2]), place[3]);
      g.player.cam.yaw = place[3];
      g.player.cam.pitch = 0;
    }
    window.__lookView = view;
    document.getElementById('look-caption').textContent = name;
    const id = (window.__lookScene = (window.__lookScene ?? 0) + 1);
    const t0 = (window.__lookT0 = g.time);
    let k = 0;
    const tick = () => {
      if (window.__lookScene !== id) return;
      const el = g.time - t0;
      while (k < events.length && events[k].t <= el) {
        const e = events[k++];
        try {
          if (e.kind === 'axis') pad.axis(e.i, e.v);
          else if (e.kind === 'button') pad.set(e.i, e.v);
          else new Function('a', 'g', e.code)(a, g);
        } catch (err) {
          console.error(`anim-video js step: ${err?.message ?? err}`);
        }
      }
      if (el < seconds) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { name: sc.name, view: sc.view, place: sc.place ?? null, events, seconds: sc.seconds });
  const wall0 = Date.now();
  const cap = (sc.seconds * 4 + 60) * 1000;
  for (;;) {
    const el = await page.evaluate(() => window.__app.current.time - window.__lookT0);
    if (el >= sc.seconds) break;
    if (Date.now() - wall0 > cap) {
      console.warn(`anim-video: ${list.name} scene ${i} "${sc.name}" ran slow: ${el.toFixed(1)} s of match time in ${((Date.now() - wall0) / 1000).toFixed(0)} s wall; moving on`);
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await page.evaluate(() => {
    window.__lookScene = (window.__lookScene ?? 0) + 1;
    for (let k = 0; k < 4; k++) window.__pad.axis(k, 0);
    for (let k = 0; k < 17; k++) window.__pad.set(k, 0);
  });
}

/** One list -> <out>/<name>.webm. */
async function recordList(lib, list, opts, base) {
  const wall0 = Date.now();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anim-video-'));
  let browser = null;
  try {
    let current = pageParams(list.scenes[0].params, opts.gfx);
    const l = await lib.launch({ url: base, params: current, viewport: opts.size, context: { recordVideo: { dir: tmp, size: opts.size } } });
    browser = l.browser;
    const { page, errors } = l;
    await ready(page, lib.waitOperator, list.name);
    await dress(page, list.hud);
    await wrapCamera(page);
    for (const [i, sc] of list.scenes.entries()) {
      const q = pageParams(sc.params, opts.gfx);
      if (q !== current) {
        await page.goto(`${base}?${q}`);
        current = q;
        await ready(page, lib.waitOperator, `${list.name} scene ${i}`);
        await dress(page, list.hud);
        await wrapCamera(page);
      }
      await playScene(page, list, i, sc);
    }
    const file = path.join(opts.out, `${list.name}.webm`);
    const v = page.video();
    await page.close();
    await v.saveAs(file);
    await v.delete();
    await browser.close();
    browser = null;
    const total = list.scenes.reduce((s, sc) => s + sc.seconds, 0);
    console.info(`anim-video: ${list.name} -> ${file} (${total} s of scenes, ${Math.round((Date.now() - wall0) / 1000)} s wall)`);
    // as scripts/anim-sheet.mjs:370-371: printed, not a failure
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    if (real.length) console.info(real.join('\n'));
  } finally {
    try {
      await browser?.close();
    } catch {
      /* gone */
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** `vite preview` of this dist (scripts/shots-ctcourse.mjs:31-45, its exits as run failures); returns the base URL. */
async function startServer(port) {
  const url = `http://127.0.0.1:${port}/`;
  const server = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, windowsHide: true, stdio: 'ignore' });
  const stop = () => {
    try {
      server.kill();
    } catch {
      /* already gone */
    }
  };
  process.on('exit', stop);
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try {
      up = (await fetch(url)).ok;
    } catch {
      /* not up yet */
    }
    if (!up) await new Promise((r) => setTimeout(r, 250));
  }
  if (!up) throw new RunFailure('preview server did not start (run `npm run build` first)');
  // a server already on the port (our --strictPort one then exits) would be recorded instead of this build
  if (server.exitCode !== null) throw new RunFailure('own preview server exited (port taken?)');
  let dist;
  try {
    dist = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  } catch (e) {
    throw new RunFailure('no dist/index.html (run `npm run build` first)', { cause: e });
  }
  if ((await (await fetch(url)).text()) !== dist) throw new RunFailure('served index.html is not this dist (run `npm run build` first)');
  return url;
}

async function main() {
  let opts;
  const lists = [];
  try {
    opts = parseArgs(process.argv.slice(2), process.env);
    if (opts.help) {
      process.stdout.write(USAGE);
      process.exit(0);
    }
    for (const arg of opts.lists) lists.push(loadList(arg));
  } catch (e) {
    console.error(`anim-video: ${e.message}`);
    process.exit(2);
  }
  for (const l of lists) {
    const total = l.scenes.reduce((s, sc) => s + sc.seconds, 0);
    if (total < SHORT_TOTAL) console.error(`${l.name}: ${total} s, shorter than a 1-2 min look video`);
  }
  process.on('SIGINT', () => process.exit(130));
  try {
    fs.mkdirSync(opts.out, { recursive: true });
    const base = opts.url ?? (await startServer(opts.port));
    const lib = await import('./e2e-lib.mjs');
    for (const l of lists) await recordList(lib, l, opts, base);
  } catch (e) {
    console.error(`anim-video: ${e instanceof RunFailure ? e.message : `run failed: ${e?.stack ?? e}`}`);
    process.exit(1);
  }
  process.exit(0);
}

// main guard as scripts/changelog-assemble.mjs:166: importing the module (the tests) runs nothing
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
