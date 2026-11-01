// (sector-redesign LR16c + LR16-2) Lamp placement audit and showcase framing audit over every map in the LR16 plan.
// Headless node (no browser, no GPU): Vite's SSR loader runs the TypeScript map builders as the unit tests do
// (`new LevelBuilder(); map.build(b, 0)`); the canonical light shapes are what the lamp bake sees; the measuring and
// thresholds live in `src/world/lampAudit.ts` (unit: tests/lampAudit.test.ts). The framing audit bakes each map's
// light field as `tests/warehouseS1Light.test.ts` does and reads `LightField.levelAt`.
//   npm run lamp-audit                       writes docs/sector-redesign/checks/lr16-lamp-audit.md
//   node scripts/lamp-audit.mjs --json       prints every row as JSON on stdout (no file written)
//   node scripts/lamp-audit.mjs --map=campusOps,warehouseOps   only those maps
//   node scripts/lamp-audit.mjs --no-views   lamp audit only (skips the bakes)
// Read-only: it never changes lamp data (LR16d moves lamps from the table).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = process.argv.includes('--json');
const views = !process.argv.includes('--no-views');
const only = process.argv.find((a) => a.startsWith('--map='))?.slice(6).split(',');
const OUT = resolve(root, 'docs/sector-redesign/checks/lr16-lamp-audit.md');
/** The LR16 plan's map list ("Per-map lamp audit (LR16c)"): `LISTED_MAP_IDS` plus these; `*` = every id with the prefix. */
const PLAN = ['warehouseOps', 'ctcourse*', 'embassy', 'dustDepot', 'courselab'];
/** Plan names whose map id differs (the plan names the file). */
const ALIAS = { dustDepot: 'depot' };
/** Flags decided to stay (LR16dx, `docs/sector-redesign/checks/lr16dx-build.md`): `map:id` -> why. A re-run lists them as
 *  decided, not as moves to make; one that no longer flags shows "no longer flagged" (drop it here). */
const DECIDED = {
  'warehouseOps:44': 'the mess panel: the mess is 1.7 m deep (z -10.65 to -8.95), so no spot is 1 m off both long walls; centred (0.85 m each side) is the realistic place',
};
const log = (s) => process.stderr.write(s + '\n');
/** The bake modules (loaded in the run, read by `bakeField`). */
let bakeMods = null;

const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
const load = (p) => server.ssrLoadModule(p);
try {
  const lampMath = await load('/src/world/lampMath.ts');
  // the Realistic model: fixed lamps get the photometric reach when the registry adds them (until LR16a makes it the only one)
  const { LevelBuilder } = await load('/src/world/levelBuilder.ts');
  const { LightRegistry } = await load('/src/world/lights.ts');
  const { MAPS } = await load('/src/world/maps/index.ts');
  const { LISTED_MAP_IDS } = await load('/src/world/maps/listed.ts');
  const { PARKED_MAPS } = await load('/src/world/maps/parked.ts');
  const { dressingOn } = await load('/src/world/detailPass.ts');
  const { canonicalLightShapes, canonicalLightSet } = await load('/src/voxel/lightShapes.ts');
  const audit = await load('/src/world/lampAudit.ts');
  const { roomAt } = await load('/src/world/rooms.ts');
  if (views) {
    const lampBake = await load('/src/voxel/lampBake.ts');
    const skyBake = await load('/src/voxel/skyBake.ts');
    bakeMods = {
      canonicalLightSet,
      dressingOn,
      bakeLamps: lampBake.bakeLamps,
      bakeMoon: skyBake.bakeMoon,
      MOON_CELL: skyBake.MOON_CELL,
      bakedLights: (await load('/src/world/lightBake.ts')).bakedLights,
      buildAmbientGrid: (await load('/src/world/ambientGrid.ts')).buildAmbientGrid,
      LightField: (await load('/src/world/lightField.ts')).LightField,
      moonLight: lampMath.moonLight,
    };
  }

  // every light's call stack (source-mapped), keyed by the def the registry returns
  const stacks = new WeakMap();
  const add0 = LightRegistry.prototype.add;
  LightRegistry.prototype.add = function (init) {
    const e = new Error('light');
    server.ssrFixStacktrace(e);
    const def = add0.call(this, init);
    stacks.set(def, e.stack);
    return def;
  };

  const pool = [...MAPS, ...PARKED_MAPS].filter((m, i, a) => a.findIndex((n) => n.id === m.id) === i);
  const wanted = [...LISTED_MAP_IDS, ...PLAN];
  const maps = [];
  const missing = [];
  for (const w of wanted) {
    const id = ALIAS[w] ?? w;
    const hit = id.endsWith('*') ? pool.filter((m) => m.id.startsWith(id.slice(0, -1))) : pool.filter((m) => m.id === id);
    if (!hit.length) missing.push(w);
    for (const m of hit) if (!maps.includes(m)) maps.push(m);
  }
  const run = only ? maps.filter((m) => only.includes(m.id)) : maps;
  const src = sourceIndex();

  const results = [];
  for (const m of run) {
    const t0 = Date.now();
    const b = new LevelBuilder();
    const layout = m.build(b, 0);
    const rooms = layout?.rooms ?? [];
    const shapes = canonicalLightShapes(b.boxes, b.cylinders, m.id, dressingOn(m));
    const sc = audit.prepareScene(shapes);
    const defs = b.lights.lights.filter((l) => l.kind === 'lamp' || l.kind === 'spot');
    const lamps = defs.map((l) => ({ id: l.id, x: l.x, y: l.y, z: l.z, cone: l.cone ? { dx: l.cone.dx, dy: l.cone.dy, dz: l.cone.dz } : null, base: l.fixture?.base, model: l.fixture?.model, yaw: l.fixture?.yaw, reach: l.radius, sign: isSign(l), foot: l.fixture ? [l.fixture.sx, l.fixture.sz] : undefined }));
    const rows = audit.auditAll(sc, lamps).map((r, i) => ({ ...r, on: defs[i].on, model: defs[i].fixture?.model ?? '', src: locate(src, defs[i], stacks.get(defs[i])) }));
    const tLamp = Date.now() - t0;
    let frame = null;
    if (views) {
      const t1 = Date.now();
      const field = bakeField(m, b);
      log(`${m.id}: field baked (${Date.now() - t1} ms)`);
      const spots = audit.standingSpots(sc);
      const vs = audit.frameViews(sc, spots, (x, y, z) => field.levelAt(x, y, z));
      // each view's room: the HUD room tag at the spot (its storey), else "(outside rooms)"
      for (const v of vs) {
        const i = roomAt(rooms, v.x, v.z, v.y);
        v.room = i >= 0 ? `${rooms[i].name} (\`${rooms[i].id}\`)` : '(outside rooms)';
      }
      frame = { spots: spots.length, views: vs, ms: Date.now() - t1 };
    }
    results.push({ map: m.id, name: m.name, listed: LISTED_MAP_IDS.includes(m.id), lamps: rows, frame });
    log(`${m.id}: ${rows.length} lamps, ${rows.filter((r) => r.flagged).length} flagged (${tLamp} ms)${frame ? `; ${frame.views.length} views, ${frame.views.filter((v) => v.noPool).length} no pool, ${frame.views.filter((v) => v.noDark).length} no dark (${frame.ms} ms)` : ''}`);
  }

  if (json) {
    process.stdout.write(JSON.stringify({ thresholds: thresholds(audit), missing, maps: results }, (k, v) => (v === Infinity ? null : v), 1) + '\n');
  } else {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, markdown(audit, results, missing, run.length < maps.length));
    log(`wrote ${relative(root, OUT)}`);
  }
} finally {
  await server.close();
}

/** A sign: a wall fitting in the exit-sign green (`EXIT_GREEN`, lampRooms.ts), i.e. any green glow on a wall. */
function isSign(l) {
  const c = l.color;
  return l.fixture?.base === 'wall' && !!c && c[1] > 0.9 && c[0] < 0.7 && c[2] < 0.8;
}

// ---- the light field (as tests/warehouseS1Light.test.ts builds it) ----------------------------------------------

/** Bake the map's static light (lamps + moon + ambient) and build the field, doors shut (the level's start). */
function bakeField(m, b) {
  const { canonicalLightSet, bakeLamps, bakeMoon, MOON_CELL, bakedLights, buildAmbientGrid, LightField, moonLight, dressingOn } = bakeMods;
  const reg = b.lights;
  const set = canonicalLightSet(b.boxes, b.cylinders, m.id, dressingOn(m));
  reg.ambient = m.theme.lightLevel ?? 0.75;
  const mL = moonLight(m.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = m.theme.sunDir;
  const l = Math.hypot(s[0], s[1], s[2]);
  const dir = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k] - set.lo[k]) / MOON_CELL)));
  const moon = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bake = { lo: set.lo, hi: set.hi, lampKey: 'a', moonKey: 'a', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: moon.vis, dir }, ambient, moonLight: mL, ms: 0 };
  return new LightField(bake, reg, b.anchors.doors.map((anchor) => ({ anchor, open: 0 })));
}

// ---- source lines -------------------------------------------------------------------------------------------------
/** Every map source file's lines (src/world/maps). */
function sourceIndex() {
  const dir = resolve(root, 'src/world/maps');
  return readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => ({ file: `src/world/maps/${f}`, lines: readFileSync(resolve(dir, f), 'utf8').split('\n') }));
}
/** A number as it may be written in source: `-18.45`, `5`, `5.0`. */
function numRe(v) {
  const r = Math.round(v * 1e4) / 1e4;
  const s = String(r).replace('.', '\\.').replace('-', '-\\s*');
  return Number.isInteger(r) ? `${s}(?:\\.0+)?` : `${s}0*`;
}
/**
 * The lamp's data entry: a `[x, z, ...]` table row, a line with `x: X` and `z: Z`, or a call with `X, Y, Z` in a row,
 * in a map file on its build call stack (or that file's data sibling, `campusS4` -> `campusS4Data`); else the
 * innermost map-file frame that is not a forwarding helper (`(call)`: the coordinates are computed on that line).
 */
function locate(src, def, stack) {
  // helpers that only forward a lamp (their line is never the data entry)
  const HELPERS = /^(?:lamp|lamps|light|addLampRooms|LevelBuilder\.light|Object\.light)$/;
  const frames = [];
  for (const m of (stack ?? '').matchAll(/at (?:(\S+) )?\(?([A-Za-z]:[\\/][^():]+\.ts):(\d+):\d+\)?/g)) {
    const file = relative(root, m[2]).replaceAll('\\', '/');
    if (file.startsWith('src/world/maps/')) frames.push({ fn: m[1] ?? '', file, line: +m[3] });
  }
  const bases = [...new Set(frames.map((f) => f.file.slice(0, -3)))];
  const near = (file) => bases.some((b) => file.startsWith(b));
  const X = numRe(def.x);
  const Y = numRe(def.y);
  const Z = numRe(def.z);
  const pats = [new RegExp(`\\[\\s*${X}\\s*,\\s*${Z}\\s*[,\\]]`), new RegExp(`(?<![\\w.])${X}\\s*,\\s*${Y}\\s*,\\s*${Z}(?![\\d.])`)];
  const keyed = [new RegExp(`\\bx:\\s*${X}(?![\\d.])`), new RegExp(`\\bz:\\s*${Z}(?![\\d.])`)];
  const hits = [];
  for (const f of src) {
    if (!near(f.file)) continue;
    f.lines.forEach((ln, i) => {
      if (pats.some((p) => p.test(ln)) || (keyed[0].test(ln) && keyed[1].test(ln))) hits.push({ file: f.file, line: i + 1 });
    });
  }
  if (hits.length) return `${hits[0].file}:${hits[0].line}${hits.length > 1 ? ` (+${hits.length - 1} same x, z)` : ''}`;
  const call = frames.find((f) => !HELPERS.test(f.fn) && !f.file.endsWith('lampRooms.ts')) ?? frames[0];
  return call ? `${call.file}:${call.line} (call)` : '?';
}

// ---- report -------------------------------------------------------------------------------------------------------
function thresholds(a) {
  const keys = ['WALL_NEAR', 'SPOT_AXIS_NEAR', 'PUSH_TO', 'SIGN_REACH', 'SPACING', 'FIT_GAP', 'STEP', 'DIM_MARGIN', 'H_RAYS', 'DOWN_RAYS', 'DOWN_TILT', 'SCAN_REACH', 'SPAN_REACH', 'WALL_NY', 'CEIL_ATTACH', 'OWN_WALL', 'CLEAR', 'VIEW_LIT', 'VIEW_DARK', 'VIEW_MIN_SHARE', 'SPOT_STEP', 'EYE', 'HEADROOM', 'VIEW_FOV', 'VIEW_PITCH_LO', 'VIEW_PITCH_HI', 'VIEW_COLS', 'VIEW_ROWS', 'VIEW_REACH', 'VIEW_MIN_HITS', 'SKY_REACH'];
  return Object.fromEntries(keys.map((k) => [k, a[k]]));
}
function n2(v) {
  return (Number.isFinite(v) ? v.toFixed(2) : '-');
}
function vec(v) {
  return (v ? `(${v.map((x) => n2(x)).join(', ')})` : '-');
}
function pct(v) {
  return `${Math.round(v * 100)}%`;
}
function deg(r) {
  return Math.round((r * 180) / Math.PI);
}

function markdown(a, results, missing, partial) {
  const T = thresholds(a);
  const o = [];
  o.push('# LR16c lamp placement audit + LR16-2 framing audit');
  o.push('');
  o.push('Generated by `npm run lamp-audit` (`scripts/lamp-audit.mjs`; logic `src/world/lampAudit.ts`, unit `tests/lampAudit.test.ts`).');
  o.push('Do not edit by hand: re-run. LR16d moves lamps strictly from the flagged-lamp table; a re-run must show 0 flags outside the decided rows (`DECIDED` in the script; LR16dx).');
  if (partial) o.push('**Partial run (`--map`)**: not every plan map is in this file.');
  o.push('');
  o.push('## Method');
  o.push('');
  o.push(`- Maps: \`LISTED_MAP_IDS\` + ${PLAN.map((p) => `\`${p}\``).join(', ')} (LR16 plan). Missing (skipped): ${missing.length ? missing.map((m) => `\`${m}\``).join(', ') : 'none'}.`);
  o.push('- Each map is built headless (`LevelBuilder`, as the unit tests do); its canonical light shapes (what the lamp bake sees) are ray cast. Every fixed light of kind `lamp` or `spot` is audited, switched-off ones too (they can be switched on).');
  o.push(`- Lamps: ${T.H_RAYS} horizontal rays + ${T.DOWN_RAYS} rays tilted ${deg(T.DOWN_TILT)} deg down find the nearest wall face (|n.y| < ${T.WALL_NY}, normal facing the lamp); **wall dist** is the perpendicular distance to that face. Flag when < ${T.WALL_NEAR} m (the photometric near radius) and the face is within the lamp's reach (a dead fitting, reach 0, is never flagged: no light of it reaches a wall).`);
  o.push(`- Spots: flag when the cone axis meets a wall within ${T.SPOT_AXIS_NEAR} m (**wall dist** is that axis distance).`);
  o.push(`- Wall fittings (bulkheads, \`base: 'wall'\`) skip their own mounting wall (face within ${T.OWN_WALL} m behind them along their facing) and may only slide along it. **Signs** (a wall fitting in exit-sign green, or one reaching <= ${T.SIGN_REACH} m: exit signs, indicators) are never moved off their wall: when the glow reaches a face, \`dim\` = the reach (and authored radius) that stops ${T.DIM_MARGIN} m short of it.`);
  o.push(`- **Move**, height kept: \`push\` = slide in plan along the face normal until the face is ${T.PUSH_TO} m away (spots: the axis distance); else \`centre\` = toward the room's centre line across that wall (midway to the face opposite, ${T.SPAN_REACH} m scan), only as far as needed (the smallest ${T.STEP} m step past the push that clears) and never past the line. A target keeps ${T.SPACING} m in plan from every other lamp, and ${T.FIT_GAP} m between the fittings' bodies (one moved earlier in the table: at its target). A move is valid when the path is clear, the light stays as clear of solids as before (or ${T.CLEAR} m), a ceiling-mounted lamp still has a ceiling within ${T.CEIL_ATTACH} m over it (**ceil gap** = new hanger gap), and the flag clears. \`none\` = neither works: the note says why and gives the centre point tried; re-site by hand.`);
  o.push('- **Source**: the lamp\'s data entry (a `[x, z, ...]` table row or a `x: .., z: ..` line, preferring files on its build call stack); `(call)` = the coordinates are computed, the line is the call that adds it.');
  o.push(`- Framing (LR16-2): standing spots every ${T.SPOT_STEP} m in plan on every floor with ${T.HEADROOM} m headroom (roofs and yards included; **sky** = open sky over the head), eye ${T.EYE} m, 4 yaws (0 = +z, 90 = +x). Each view casts ${T.VIEW_COLS} x ${T.VIEW_ROWS} rays (${deg(T.VIEW_FOV)} deg wide, ${deg(T.VIEW_PITCH_LO)} to +${deg(T.VIEW_PITCH_HI)} deg pitch, ${T.VIEW_REACH} m) and reads \`LightField.levelAt\` 5 cm off each hit (static light: ambient + moon + baked lamps, doors shut). Lit > ${T.VIEW_LIT}, dark < ${T.VIEW_DARK}, dim between. **No pool**: lit share < ${pct(T.VIEW_MIN_SHARE)}; **no dark**: dark share < ${pct(T.VIEW_MIN_SHARE)}. Views seeing under ${T.VIEW_MIN_HITS} points are left out.`);
  o.push('- Levels are this branch\'s (before the LR16b soft edges and the LR16g re-level, which lifts pools): read a map-wide "no pool" as the level, a room-level one as placement. A map whose ambient sits over the dark line (`theme.lightLevel` > 0.28 with no darker zone) has "no dark" everywhere.');
  o.push('');
  o.push('## Counts');
  o.push('');
  o.push('| Map | Listed | Lamps | Flagged | Decided | push | centre | dim | none | Spots | Views | No pool | No dark | No pool (under cover) | No dark (under cover) |');
  o.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const f = r.lamps.filter((l) => l.flagged);
    const c = (h) => f.filter((l) => l.move?.how === h).length;
    const v = r.frame?.views ?? [];
    const cov = v.filter((x) => !x.sky);
    o.push(`| ${r.map} | ${r.listed ? 'yes' : ''} | ${r.lamps.length} | ${f.length} | ${f.filter((l) => DECIDED[`${r.map}:${l.id}`]).length} | ${c('push')} | ${c('centre')} | ${c('dim')} | ${c('none')} | ${r.frame ? r.frame.spots : '-'} | ${r.frame ? v.length : '-'} | ${r.frame ? v.filter((x) => x.noPool).length : '-'} | ${r.frame ? v.filter((x) => x.noDark).length : '-'} | ${r.frame ? cov.filter((x) => x.noPool).length : '-'} | ${r.frame ? cov.filter((x) => x.noDark).length : '-'} |`);
  }
  o.push('');
  o.push('## Flagged lamps (LR16d input)');
  o.push('');
  o.push('Per map in lamp id order. Pos and move target are the light point (m). dx / dz: the plan step to apply to the entry\'s x / z.');
  o.push('');
  o.push('| Map | Lamp id | Source | Model | On | Pos (x, y, z) | Rule | Wall dist | Normal | Move | To (x, y, z) | dx | dz | Dist after | Ceil gap | Note |');
  o.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    for (const l of r.lamps.filter((x) => x.flagged)) {
      const m = l.move;
      o.push(`| ${r.map} | ${l.id} | \`${l.src}\` | ${l.model || '-'} | ${l.on ? 'yes' : 'off'} | ${vec(l.pos)} | ${l.rule} | ${n2(l.dist)} | ${vec(l.normal)} | ${m?.how ?? '-'} | ${vec(m?.to)} | ${m && m.to ? n2(m.dx) : '-'} | ${m && m.to ? n2(m.dz) : '-'} | ${m ? (Number.isFinite(m.after) ? n2(m.after) : `> ${T.SCAN_REACH}`) : "-"} | ${m ? n2(m.ceilGap) : '-'} | ${[DECIDED[`${r.map}:${l.id}`] ? '**decided** (below)' : '', m?.note ?? ''].filter(Boolean).join('; ')} |`);
    }
  }
  o.push('');
  o.push('## Decided rows (stay as they are)');
  o.push('');
  o.push('Flags the job decided to keep (LR16dx). Each still shows in the table above; it is not a move to make.');
  o.push('');
  o.push('| Map | Lamp id | Flagged now | Why it stays |');
  o.push('|---|---|---|---|');
  for (const [k, why] of Object.entries(DECIDED)) {
    const [map, id] = k.split(':');
    const r = results.find((x) => x.map === map);
    const l = r?.lamps.find((x) => String(x.id) === id);
    o.push(`| ${map} | ${id} | ${!r ? 'not in this run' : l?.flagged ? 'yes' : 'no longer flagged'} | ${why} |`);
  }
  o.push('');
  o.push('## Framing per room (LR16-2)');
  o.push('');
  o.push('Views grouped by the HUD room at the spot (the map\'s `rooms`, on the spot\'s storey); views on open-sky spots outside every room (yards, roofs) are one row. Lit / dim / dark: the mean shares over the room\'s views. Verdict: **no pool** when every view in the room has no pool ("nothing to read"), **no dark** when every view has no dark ("nowhere to hide"), else the flagged views are listed as `(x, y, z) yaw` (feet; every view in `node scripts/lamp-audit.mjs --json`), at most 8 per room.');
  for (const r of results) {
    if (!r.frame) continue;
    const vs = r.frame.views;
    const f = vs.filter((v) => v.noPool || v.noDark);
    o.push('');
    o.push(`### ${r.map}${r.name ? ` (${r.name})` : ''}: ${f.length} of ${vs.length} views flagged (${vs.filter((v) => v.noPool).length} no pool, ${vs.filter((v) => v.noDark).length} no dark)`);
    if (!vs.length) continue;
    const groups = new Map();
    for (const v of vs) {
      const k = v.room === '(outside rooms)' && v.sky ? '(outside rooms, open sky)' : v.room;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(v);
    }
    o.push('');
    o.push('| Room | Views | Lit | Dim | Dark | No pool | No dark | Verdict / flagged views |');
    o.push('|---|---|---|---|---|---|---|---|');
    const keys = [...groups.keys()].sort((p, q) => (p.startsWith('(') ? 1 : 0) - (q.startsWith('(') ? 1 : 0) || p.localeCompare(q));
    for (const k of keys) {
      const g = groups.get(k);
      const mean = (key) => g.reduce((s, v) => s + v[key], 0) / g.length;
      const np = g.filter((v) => v.noPool).length;
      const nd = g.filter((v) => v.noDark).length;
      const parts = [];
      if (np === g.length) parts.push('**no pool**');
      if (nd === g.length) parts.push('**no dark**');
      const rest = g.filter((v) => (v.noPool && np < g.length) || (v.noDark && nd < g.length));
      const list = rest.slice(0, 8).map((v) => `(${n2(v.x)}, ${n2(v.y)}, ${n2(v.z)}) ${deg(v.yaw)}${v.noPool && v.noDark ? ' pool+dark' : v.noPool ? ' pool' : ' dark'}`);
      if (rest.length > 8) list.push(`+${rest.length - 8} more`);
      o.push(`| ${k} | ${g.length} | ${pct(mean('lit'))} | ${pct(mean('dim'))} | ${pct(mean('dark'))} | ${np} | ${nd} | ${[...parts, list.join('; ')].filter(Boolean).join('; ') || 'ok'} |`);
    }
  }
  o.push('');
  return o.join('\n');
}
