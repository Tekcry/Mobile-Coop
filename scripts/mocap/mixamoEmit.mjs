// (mixamo-retarget M3) Keyed emitter for the Mixamo clips: each recipe of scripts/mocap/data/mixamo-clips.json -> the M1
// dump (build/mocap/mixamo/raw/<slug>.json) through the M2 adapter (mixamoTake.mjs `mixamoLoader`) and the CMU pipeline
// (retarget.mjs `buildSlot`, emit.mjs `emitCycle` / `emitOneShot` / `moduleSource`) -> a keyed clip module
// src/anim/clips/mixamo/<slug>.ts (`name: 'mocap_<slug>'`), its row in src/anim/mocapSources.ts (the
// `// @mixamo-keyed-begin` / `-end` block, one row a line) and docs/mixamo-retarget/CLIPS.md (its marker section).
//   node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs [slug ...] [--no-check] [--dry]
// (without the ts-resolve import the keyedClip check is skipped; [slug ...] re-emits those clips and keeps the other rows)
//
// Emit kinds (PLAN.md M3):
// - gait: a Mixamo walk-type clip is one whole cycle whose last frame repeats the first (`dupLast`): the loop is the
//   whole clip, the duplicate is buildSlot's closing frame N (never sampled twice), the seam spread over the cycle, the
//   events from the de-slid contacts (buildSlot), then `emitCycle` as the CMU cycles (strike-warped, clip feet, duty), the
//   capture's own track half (`ownTrack`, as m3.mjs's crouch walk). A cycle emitCycle cannot express (no left / right
//   strike, e.g. a prone crawl) falls back to the loop kind with its travel (no clip feet) and is flagged in CLIPS.md.
// - loop: an on-the-spot loop (idles): buildSlot `inPlace`, seamed over its own period, sampled at even phases
//   (LOOP_FPS a second of take, the closing frame dropped), no `feet` (the planner keeps the feet).
// - timed: a one-shot by progress over its own seconds: trimmed to its moving span (`movingSpan`: the mean joint speed
//   over the threshold, TRIM.margin s each side), root as the take's own path with its heading taken out progressively
//   (buildSlot's segment root; in place when A4 detects it), sampled at ONESHOT_FPS, plus `MOCAP_<SLUG>_SECONDS`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FPS } from './asfamc.mjs';
import { q4, v3, R2D } from './math.mjs';
import { wrenRig, buildSlot, OUT } from './retarget.mjs';
import { emitCycle, emitOneShot, moduleSource } from './emit.mjs';
import { loadMixamoTake, MIXAMO_LICENCE, MIXAMO_RAW } from './mixamoTake.mjs';
import { slugOf } from './mixamo.mjs';
import { writeSection } from './takesdoc.mjs';

export const RECIPES_JSON = path.join(ROOT, 'scripts', 'mocap', 'data', 'mixamo-clips.json');
export const MIXAMO_CLIPS_DIR = path.join(ROOT, 'src', 'anim', 'clips', 'mixamo');
export const SOURCES_TS = path.join(ROOT, 'src', 'anim', 'mocapSources.ts');
export const CLIPS_MD = path.join(ROOT, 'docs', 'mixamo-retarget', 'CLIPS.md');
const INTER = path.join(OUT, 'mixamo', 'keyed');
const SHEETS = path.join(OUT, 'mixamo', 'sheets');

export const KINDS = ['gait', 'loop', 'timed'];
export const TRAVELS = ['z', '+x', '-x', 'none'];
/** The keyed channels a recipe may keep beyond the required ones (only `head` is emitted in this slice). */
export const CHANNELS = ['head', 'clav', 'fing', 'fore'];
/** The body states the Studio can pin (src/anim/tune.ts BODY_GROUPS; read from the file, so this stays a plain script). */
export const STUDIO_MOVES = ['none', 'fwd', 'back', 'side'];
/** Samples per second of take for one-shots (emit.mjs ONESHOT_FPS, the CMU one-shots' rate). */
export const ONESHOT_FPS = 40;
/** Samples per second of take for loops (idles move slowly; half the one-shot rate keeps the modules small). */
export const LOOP_FPS = 20;
/** Moving span: frames whose mean joint speed is over max(abs m/s, rel x the peak), widened by margin seconds. */
export const TRIM = { abs: 0.1, rel: 0.08, margin: 0.1, smooth: 0.05 };
/** A loop's last frame repeats its first when the root-relative pose differs by under these (deg, cm). */
export const DUP = { deg: 2, cm: 1 };
/** The joints the trim's speed reads (slot names of the take; every one M2 maps). */
const TRIM_SLOTS = ['root', 'head', 'lradius', 'rradius', 'lhand', 'rhand', 'ltibia', 'rtibia', 'lfoot', 'rfoot'];

const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** The game's body states (src/anim/tune.ts BODY_GROUPS), read from the source. */
export function bodyGroups() {
  const s = readFileSync(path.join(ROOT, 'src', 'anim', 'tune.ts'), 'utf8');
  const m = /export const BODY_GROUPS = \[([\s\S]*?)\] as const/.exec(s);
  if (!m) throw new Error('mixamoEmit: BODY_GROUPS not found in src/anim/tune.ts');
  return [...m[1].matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]);
}

/**
 * Checks the recipes file and returns its clips as [{ slug, ...recipe }]: every field known and typed, the slug from
 * the file by the Clip map rule (mixamo.mjs `slugOf`), the title the file without its note, the Studio row usable.
 * Throws one error listing every problem.
 */
export function validateRecipes(json, { groups = bodyGroups() } = {}) {
  const errs = [];
  if (!json || json.version !== 1 || typeof json.clips !== 'object') throw new Error('mixamo recipes: want { version: 1, clips: { <slug>: recipe } }');
  const out = [];
  for (const [slug, r] of Object.entries(json.clips)) {
    const e = (m) => errs.push(`${slug}: ${m}`);
    if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(slug)) e('slug is not lower_snake');
    if (!KINDS.includes(r.kind)) e(`kind ${r.kind} (want ${KINDS.join(' / ')})`);
    if (typeof r.file !== 'string' || !/\.fbx$/i.test(r.file)) e('file must be the FBX as downloaded');
    else {
      const s = slugOf(r.file);
      if (s.slug !== slug) e(`file "${r.file}" slugs to ${s.slug}`);
      if ((s.note ?? undefined) !== r.note) e(`note "${r.note}" != the file's "${s.note}"`);
      const want = r.file.replace(/\.fbx$/i, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      if (r.title !== want) e(`title "${r.title}" != "${want}"`);
    }
    if (typeof r.target !== 'string' || !r.target.trim()) e('target (the game state) missing');
    if (r.trim !== 'auto' && !(Array.isArray(r.trim) && r.trim.length === 2 && r.trim.every((x) => typeof x === 'number') && r.trim[0] >= 0 && r.trim[1] > r.trim[0])) e('trim must be "auto" or [s0, s1]');
    if (!TRAVELS.includes(r.travel)) e(`travel ${r.travel}`);
    if (r.kind === 'gait' && r.travel === 'none') e('a gait travels');
    if (r.kind !== 'gait' && r.travel !== 'none') e('only a gait travels in this emitter');
    if (!(r.inPlace === 'auto' || typeof r.inPlace === 'boolean')) e('inPlace must be "auto" or a boolean');
    if (r.kind === 'loop' && r.inPlace !== true) e('a loop is in place');
    if (r.kind === 'gait' && r.inPlace !== false) e('a gait is not in place');
    if (r.kind === 'gait' && r.gait !== 'walk') e('gait band: walk (the only one the emitter maps)');
    if (!Array.isArray(r.channels) || r.channels.some((c) => !CHANNELS.includes(c))) e(`channels from ${CHANNELS.join(', ')}`);
    const st = r.studio;
    if (!st || typeof st !== 'object') e('studio row missing');
    else {
      if (!groups.includes(st.body)) e(`studio body ${st.body} is not a body state`);
      if (st.move !== undefined && !STUDIO_MOVES.includes(st.move)) e(`studio move ${st.move}`);
      if (st.move && st.move !== 'none' && r.kind !== 'gait') e('only a gait moves on the treadmill');
      for (const k of ['crouch', 'circle', 'drawn', 'aim']) if (st[k] !== undefined && typeof st[k] !== 'boolean') e(`studio ${k} must be a boolean`);
      for (const k of Object.keys(st)) if (!['body', 'move', 'crouch', 'circle', 'drawn', 'aim'].includes(k)) e(`studio ${k} unknown (cycle is measured)`);
    }
    for (const k of Object.keys(r)) if (!['kind', 'file', 'title', 'note', 'target', 'trim', 'travel', 'inPlace', 'gait', 'ownTrack', 'channels', 'studio', 'limits'].includes(k)) e(`unknown field ${k}`);
    out.push({ slug, ...r });
  }
  if (errs.length) throw new Error(`mixamo recipes:\n  ${errs.join('\n  ')}`);
  return out;
}

export function loadRecipes(file = RECIPES_JSON) {
  return validateRecipes(JSON.parse(readFileSync(file, 'utf8')));
}

/**
 * Whether a take's last frame repeats its first (Mixamo loops do): the largest root-relative joint turn (deg) and the
 * hips' height change (cm) between the two, `dup` when both are under DUP.
 */
export function dupLast(take) {
  const n = take.frames;
  const R = take.quat.get('root');
  const rel = (b, i) => q4.mul(q4.conj(R[i]), take.quat.get(b)[i]);
  let deg = 0;
  for (const b of take.quat.keys()) {
    if (b === 'root') continue;
    deg = Math.max(deg, q4.between(rel(b, 0), rel(b, n - 1)) * R2D);
  }
  const P = take.pos.get('root');
  const cm = Math.abs(P[n - 1][1] - P[0][1]) * 100;
  return { dup: deg < DUP.deg && cm < DUP.cm, deg: r2(deg), cm: r2(cm) };
}

/**
 * The moving span of a one-shot (120 fps frames [a, b]): per frame the mean speed of TRIM_SLOTS (m/s, central
 * difference, smoothed over TRIM.smooth s); frames over max(TRIM.abs, TRIM.rel x the peak) are moving; the first to the
 * last moving frame, widened by TRIM.margin s and clamped to the take. Whole take when nothing moves.
 */
export function movingSpan(take, o = TRIM) {
  const n = take.frames;
  const fps = take.fps ?? FPS;
  const slots = TRIM_SLOTS.filter((s) => take.pos.has(s));
  const sp = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    if (a === b) continue;
    let s = 0;
    for (const sl of slots) s += v3.dist(take.pos.get(sl)[a], take.pos.get(sl)[b]);
    sp[i] = (s / slots.length) * fps / (b - a);
  }
  const w = Math.max(0, Math.round((o.smooth * fps) / 2));
  const sm = sp.map((_, i) => {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) { s += sp[j]; c++; }
    return s / c;
  });
  const peak = Math.max(...sm);
  const thr = Math.max(o.abs, o.rel * peak);
  let a = sm.findIndex((v) => v > thr);
  if (a < 0) return { a: 0, b: n - 1, thr: r3(thr), peak: r3(peak) };
  let b = n - 1;
  while (b > a && !(sm[b] > thr)) b--;
  const m = Math.round(o.margin * fps);
  return { a: Math.max(0, a - m), b: Math.min(n - 1, b + m), thr: r3(thr), peak: r3(peak) };
}

/** The intermediate of one recipe: the take, its span and the buildSlot result (`load` injectable for tests). */
export function buildIntermediate(rig, rec, { load = (slug) => loadMixamoTake(slug) } = {}) {
  const take = load(rec.slug);
  const dup = dupLast(take);
  let a = 0, b = take.frames - 1, span = null;
  if (Array.isArray(rec.trim)) {
    a = Math.max(0, Math.round(rec.trim[0] * take.fps));
    b = Math.min(take.frames - 1, Math.round(rec.trim[1] * take.fps));
  } else if (rec.kind === 'timed') {
    span = movingSpan(take);
    a = span.a; b = span.b;
  }
  const loop = rec.kind !== 'timed';
  const inPlace = rec.inPlace === 'auto' ? !!take.inPlace : rec.inPlace;
  // the loader is handed the take already read (buildSlot reads it again through `load`)
  const d = buildSlot(rig, { slot: `mixamo_${rec.slug}`, kind: rec.kind }, { take: rec.slug, segment: [a, b], loop }, '', null,
    { load: () => take, licence: MIXAMO_LICENCE, inPlace });
  return { d, take, dup, span, segment: [a, b], inPlace };
}

/** The per-frame widths of the keyed def arrays this emitter writes. */
const WIDTH = { pel: 3, q: 16, arm: 12, head: 4, feet: 10 };

/** The first `N` frames of a def (every per-frame array cut). */
function cutDef(def, N) {
  const out = { ...def, frames: N };
  for (const [k, w] of Object.entries(WIDTH)) if (def[k]) out[k] = def[k].slice(0, N * w);
  return out;
}

/** The `an` emitOneShot's time path reads: the segment's own first frame as the start (progress from frame 0). */
const startAt = (d) => ({ takes: [{ take: d.source.take, start: { t0: d.source.frames120[0] / FPS } }] });

/**
 * A loop sampled at even phases: the intermediate unrolled by its first frame (the root extrapolated one frame), sampled
 * from frame 0 to the closing frame through emitOneShot's time path, the closing sample dropped. emitOneShot samples
 * ONESHOT_FPS per second of `fps`; the copy's fps is scaled so that comes to LOOP_FPS per second of take.
 */
export function emitLoop(d, rig, name) {
  const n = d.frames;
  const last = d.root[n - 1], prev = d.root[Math.max(0, n - 2)];
  const dd = {
    ...d, loop: false, frames: n + 1, fps: (d.fps * ONESHOT_FPS) / LOOP_FPS,
    pel: [...d.pel, d.pel[0]], rot: [...d.rot, d.rot[0]], pos: [...d.pos, d.pos[0]], contact: [...d.contact, d.contact[0]],
    root: [...d.root, [2 * last[0] - prev[0], 2 * last[1] - prev[1], 2 * last[2] - prev[2]]],
  };
  const out = emitOneShot(dd, rig, { name, kind: 'start', gait: 'walk' }, startAt(d));
  const N = out.def.frames - 1;
  return { ...out, def: cutDef(out.def, N), frames: out.frames.slice(0, N), seconds: n / d.fps };
}

/** A timed one-shot: progress over its own seconds, ONESHOT_FPS samples a second, `seconds` the clip's length. */
export function emitTimed(d, rig, name) {
  return emitOneShot(d, rig, { name, kind: 'start', typed: true, gait: 'walk' }, startAt(d));
}

/** A gait cycle (emitCycle, the capture's own track); `null` with the reason when the cycle has no strikes to warp. */
export function emitGait(d, rig, rec) {
  let out;
  try {
    out = emitCycle(d, rig, { name: rec.slug, gait: rec.gait, ownTrack: !!rec.ownTrack, ...(rec.travel === '+x' || rec.travel === '-x' ? { travel: rec.travel } : {}) });
  } catch (err) {
    return { out: null, reason: err.message };
  }
  if (rec.ownTrack) {
    // as m3.mjs: emitCycle shifts the feet to the walk's TRACK_HALF; the capture's own track is put back
    const dh = out.def.half - out.report.takeHalf;
    for (let i = 0; i < out.def.feet.length; i += 10) { out.def.feet[i] += dh; out.def.feet[i + 5] -= dh; }
    out.def.half = out.report.takeHalf;
  }
  out.seconds = d.frames / d.fps;
  return { out, reason: null };
}

/** Emits one recipe's clip from its intermediate: { out, kind (as written), fallback }. */
export function emitRecipe(d, rig, rec) {
  let out, kind = rec.kind, fallback = null;
  if (rec.kind === 'gait') {
    const g = emitGait(d, rig, rec);
    if (g.out) out = g.out;
    else { fallback = `no gait cycle (${g.reason}): emitted as a loop with its travel, no clip feet`; kind = 'loop'; out = emitLoop(d, rig, rec.slug); }
  } else if (rec.kind === 'loop') out = emitLoop(d, rig, rec.slug);
  else out = emitTimed(d, rig, rec.slug);
  if (!rec.channels.includes('head')) delete out.def.head;
  return { out, kind, fallback };
}

export const constName = (slug) => `MOCAP_${slug.toUpperCase()}`;
export const secondsName = (slug) => `MOCAP_${slug.toUpperCase()}_SECONDS`;

/** The module text: this emitter's header, then emit.mjs's body (`moduleSource`). */
export function moduleText(rec, d, res, info) {
  const timed = res.kind === 'timed';
  const spec = { name: rec.slug, typed: timed, kind: 'start', ...(timed ? { seconds: secondsName(rec.slug) } : {}) };
  let body = moduleSource(spec, d, res.out);
  body = body.slice(body.indexOf("import { keyedClip } from '../../keyed';"));
  body = body.replace('from the first push', 'from its first moving frame (the trimmed span)');
  const [f0, f1] = info.frames30;
  const what = res.kind === 'gait' ? `Gait cycle (${res.out.def.frames} frames, phase 0 at the left strike, clip feet)`
    : res.kind === 'loop' ? `Loop (${res.out.def.frames} frames at even phases, no clip feet)${res.fallback ? '; a gait recipe emitted as a loop (CLIPS.md)' : ''}`
      : `One-shot by progress (${res.out.def.frames} frames over ${r3(res.out.seconds)} s)`;
  const head = `// GENERATED by scripts/mocap/mixamoEmit.mjs (mixamo-retarget M3). Do not edit: rerun the emitter (recipe in
// scripts/mocap/data/mixamo-clips.json, numbers in docs/mixamo-retarget/CLIPS.md). Source: Mixamo (mixamo.com, Adobe),
// "${rec.title}" (${rec.file}), 30 fps frames ${f0}-${f1} of ${info.framesIn} (${r3(f0 / 30)}-${r3(f1 / 30)} s), converted onto Wren
// (${d.wren.height} m, leg scale ${d.wren.scaleLeg}). ${what}. Body frame at 1.75 m (x right, y up, z forward),
// one row per frame. docs/mocap-trial/CLIP-FORMAT.md.
`;
  return head + body;
}

/** The clip's source row (one line, the keyed marker block of mocapSources.ts). */
export function sourceRow(rec, res) {
  const st = rec.studio;
  const cycle = r3(res.out.seconds);
  const parts = [`kind: 'keyed'`, `body: '${st.body}'`, `cycle: ${cycle}`];
  const move = res.fallback ? 'none' : st.move;
  if (move && move !== 'none') parts.push(`move: '${move}'`);
  for (const k of ['crouch', 'drawn', 'aim', 'circle']) if (st[k] && !(k === 'circle' && move !== 'fwd')) parts.push(`${k}: true`);
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `  mocap_${rec.slug}: { source: 'mixamo', title: '${esc(rec.title)}', take: '${esc(rec.file)}', credit: MIXAMO_CREDIT, studio: { ${parts.join(', ')} } },`;
}

const BEGIN = '// @mixamo-keyed-begin';
const END = '// @mixamo-keyed-end';

/**
 * The table text with the keyed block's rows replaced: `rows` by clip name (a row line); `keep` true keeps the block's
 * other rows (a partial run), else the block is exactly `rows`. Rows sorted by name.
 */
export function writeKeyedBlock(text, rows, { keep = false } = {}) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const b = lines.findIndex((l) => l.trim().startsWith(BEGIN));
  const e = lines.findIndex((l) => l.trim().startsWith(END));
  if (b < 0 || e < b) throw new Error('mocapSources.ts: the keyed marker block is missing');
  const all = new Map();
  if (keep) for (const l of lines.slice(b + 1, e)) { const m = /^\s*(mocap_[a-z0-9_]+):/.exec(l); if (m) all.set(m[1], l); }
  for (const [k, v] of Object.entries(rows)) all.set(k, v);
  const body = [...all.keys()].sort().map((k) => all.get(k));
  return [...lines.slice(0, b + 1), ...body, ...lines.slice(e)].join(nl);
}

/** One CLIPS.md table row and its notes. */
function docRow(r) {
  const q = r.d.quality;
  const o = r.res.out;
  const seam = q.seamAfter ? `${q.seamBefore.pelCm} cm / ${q.seamBefore.maxDeg} deg (${q.seamBefore.joint}) -> ${q.seamAfter.stepCm} (typ ${q.seamAfter.typicalStepCm})` : '-';
  const speed = r.res.kind === 'gait' ? r2(o.report.speed) : r.d.speed !== null ? r2(r.d.speed) : '-';
  const stride = r.res.kind === 'gait' ? `${r2(o.report.stride)} m, x${o.report.strideScale.map(r2).join('-')}` : '-';
  return `| ${r.rec.slug} | ${r.res.kind}${r.res.fallback ? ' (gait fell back)' : ''} | ${r.info.frames30[0]}-${r.info.frames30[1]} / ${r.info.framesIn}${r.dup.dup ? ' (dup last)' : ''} | ${o.def.frames} | ${r3(o.seconds)} | ${speed} | ${stride} | ${seam} | ${q.slideBeforeCm.med}/${q.slideBeforeCm.max} -> ${q.slideAfterCm.med}/${q.slideAfterCm.max} | ${q.legReachShortCm} | ${q.retargetDirErrDeg} | ${q.heightOffsetCm} | ${r.minPelCm} |`;
}

/** The CLIPS.md section body. */
export function clipsDoc(results, { checked }) {
  const L = [
    '## Keyed clips (M3, scripts/mocap/mixamoEmit.mjs)', '',
    'Generated; rerun `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs` (the M1 dumps in',
    '`build/mocap/mixamo/raw/`). Each clip is `src/anim/clips/mixamo/<slug>.ts` (`mocap_<slug>`), listed in the Anim Studio\'s',
    `"motion capture" group by its row in \`src/anim/mocapSources.ts\`. ${checked ? 'Every clip built through the game\'s `keyedClip`.' : 'NOT checked through `keyedClip` on this run (run with the ts-resolve import).'}`,
    '',
    'Columns: kind as written; the 30 fps frames used of the file ("dup last": the last frame repeats the first, so the loop',
    'is the whole clip and the duplicate closes it); clip frames and seconds (a gait: the cycle; a loop: its period; a',
    'one-shot: the trimmed span); speed m/s (Wren); stride per cycle and the game/clip stride scale over the walk band',
    '(1.4-2.1 m/s; the crouched and carry walks play slower, so read the scale as relative); the loop seam before -> the',
    'closing step after (cm, typical step); foot slide median/max before -> after the de-slide (cm); leg reach short (cm, the',
    'IK could not reach a locked foot); retarget direction error (deg, worst segment); the height offset putting the flat',
    'ankle at Wren\'s (cm); the lowest pelvis (cm from rest, a deep crouch / kneel / prone shows here).', '',
    '| Slug | Kind | Frames used / file | Clip frames | Seconds | Speed | Stride, scale | Seam | Slide cm | Reach short | Dir err | Height off | Lowest pelvis |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of results) L.push(docRow(r));
  L.push('', '### Notes and limits', '');
  for (const r of results) {
    const notes = [];
    notes.push(`in place ${r.inPlace ? 'yes' : 'no'} (A4 travel ${r.take.report.travelCm} cm)`);
    if (r.span) notes.push(`moving span ${r3(r.span.a / FPS)}-${r3(r.span.b / FPS)} s of ${r3((r.take.frames - 1) / FPS)} s (threshold ${r.span.thr} m/s, peak ${r.span.peak})`);
    notes.push(`last frame vs first ${r.dup.deg} deg / ${r.dup.cm} cm`);
    if (r.res.kind === 'gait') notes.push(`duty ${r3(r.res.out.def.duty)}, half ${r3(r.res.out.def.half)}, capture lift ${r2(r.res.out.report.liftH * 100)} cm`);
    if (r.res.fallback) notes.push(r.res.fallback);
    if (r.rec.limits) notes.push(`limits: ${r.rec.limits}`);
    L.push(`- \`${r.rec.slug}\` (${r.rec.target}): ${notes.join('; ')}.`);
  }
  L.push('', 'Not emitted in this slice (open items, M3-REPORT.md): the optional `clav`, `fing` and `fore` channels (A7); the',
    'keyed format has no leg channel from a capture (`leg` / `legd` are not written), so the legs are the foot planner\'s IK',
    'legs under the captured pelvis: a kneel, a crawl or a lie-down shows its trunk and arms, not its knees on the floor.');
  return L.join('\n');
}

const CLIPS_INTRO = `# mixamo-retarget - converted clips
Owner: Player Build. Status: generated (sections between the markers are rewritten by their emitters; M3 keyed, M4 channel).
`;

/** Lowest pelvis offset from rest (cm, Wren units) over the clip. */
function minPelCm(def) {
  let m = Infinity;
  for (let i = 1; i < def.pel.length; i += 3) m = Math.min(m, def.pel[i]);
  return Math.round(m * (1.68 / 1.75) * 1000) / 10;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const want = args.filter((a) => !a.startsWith('--'));
  const dry = args.includes('--dry');
  const recipes = loadRecipes();
  for (const w of want) if (!recipes.some((r) => r.slug === w)) throw new Error(`no recipe for ${w}`);
  let keyedClip = null;
  if (!args.includes('--no-check')) {
    try { ({ keyedClip } = await import('../../src/anim/keyed.ts')); } catch (e) { console.warn(`keyedClip check skipped (run with --import ./scripts/operators/ts-resolve.mjs): ${e.message}`); }
  }
  const rig = wrenRig();
  mkdirSync(INTER, { recursive: true });
  mkdirSync(SHEETS, { recursive: true });
  mkdirSync(MIXAMO_CLIPS_DIR, { recursive: true });
  const { sheetSvg } = await import('./sheets.mjs');
  const results = [];
  const rows = {};
  for (const rec of recipes) {
    if (want.length && !want.includes(rec.slug)) continue;
    if (!existsSync(path.join(MIXAMO_RAW, `${rec.slug}.json`))) { console.warn(`skip ${rec.slug}: no dump`); continue; }
    const B = buildIntermediate(rig, rec);
    const { d, take } = B;
    const res = emitRecipe(d, rig, rec);
    if (keyedClip) keyedClip(res.out.def);
    const info = { framesIn: take.report.framesIn, frames30: [Math.round(B.segment[0] / 4), Math.round(B.segment[1] / 4)] };
    const r = { rec, ...B, res, info, minPelCm: minPelCm(res.out.def) };
    results.push(r);
    rows[`mocap_${rec.slug}`] = sourceRow(rec, res);
    if (!dry) {
      writeFileSync(path.join(INTER, `${rec.slug}.json`), JSON.stringify(d));
      writeFileSync(path.join(SHEETS, `${rec.slug}.svg`), sheetSvg(d));
      writeFileSync(path.join(MIXAMO_CLIPS_DIR, `${rec.slug}.ts`), moduleText(rec, d, res, info));
    }
    console.log(docRow(r));
    if (res.fallback) console.log(`   ${res.fallback}`);
  }
  if (!dry) {
    writeFileSync(SOURCES_TS, writeKeyedBlock(readFileSync(SOURCES_TS, 'utf8'), rows, { keep: want.length > 0 }));
    if (!want.length) {
      if (!existsSync(CLIPS_MD)) writeFileSync(CLIPS_MD, CLIPS_INTRO);
      writeSection('mixamo-keyed', clipsDoc(results, { checked: !!keyedClip }), CLIPS_MD);
    }
  }
}
