#!/usr/bin/env node
/**
 * Guard heads (guard-models G1h): the pure half of `py/build_head.py`. Budgets (PLAN 5), the outputs each heads-stage
 * job writes, and checks of the job reports against the kit (`scripts/operators/data/guards.json`, SPEC 7).
 *
 * CLI: `node scripts/operators/guardHeadCheck.mjs --out <bake dir> --kit <guards.json> [--partial]` checks every head,
 * hair-cap and envelope report found under `<out>/heads/`, the seam per base (the same G1 seam on every head, and the
 * body's own `neckSeam` when `<out>/bodies/guard-<b>-body.json` is there), and that the stage is complete (every kit
 * head, hair-cap job and base envelope; `--partial` skips that for a smoke run). Prints each head's face-island albedo
 * mean and exits 1 on a failure.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Triangles per eye at each LOD: build_head.py EYE_RINGS (rings, segments) -> 2 * seg + 2 * seg * (rings - 1). */
export const EYE_RINGS = { lod0: [8, 14], lod1: [3, 8], lod2: [2, 6] };
export const LODS = ['lod0', 'lod1', 'lod2'];
/** build_head.py ENVELOPE_TRIS; LOCK band in head units (cranium lock). */
export const ENVELOPE_TRIS = 2000;

export function eyeTris(lod) {
  const [rings, seg] = EYE_RINGS[lod];
  return 2 * seg + 2 * seg * (rings - 1);
}

function byId(list, id, what) {
  const it = (list ?? []).find((x) => x.id === id);
  if (!it) throw new Error(`${what} "${id}" not in the kit`);
  return it;
}

/**
 * Budgets of one head variant: head triangles per LOD (LOD1 / LOD2 include the merged eyes, PLAN 5 "in head"), the
 * decimation targets build_head.py aims at (LOD1 / LOD2 less the eyes), the LOD0 eye pair budget.
 */
export function headBudgets(kit, headId) {
  const head = byId(kit.heads, headId, 'head');
  const tris = head.tris ?? [4000, 1200, 400];
  const eyes = kit.face?.eyes?.tris?.[0] ?? 500;
  const target = { lod0: tris[0], lod1: tris[1] - 2 * eyeTris('lod1'), lod2: tris[2] - 2 * eyeTris('lod2') };
  return { head: { lod0: tris[0], lod1: tris[1], lod2: tris[2] }, target, eyesLod0: eyes, eyesPerLod: Object.fromEntries(LODS.map((l) => [l, 2 * eyeTris(l)])) };
}

/** Cap styles with a mesh that a base's kinds wear (kit `kinds[].hairCaps`, `bald` has no mesh), in kit order. */
export function capStyles(kit, baseId) {
  const worn = new Set();
  for (const k of kit.kinds ?? []) if (k.base === baseId) for (const s of k.hairCaps ?? []) worn.add(s);
  return (kit.hairCaps ?? []).filter((c) => worn.has(c.id) && (c.tris?.[0] ?? 0) > 0).map((c) => c.id);
}

/** Which job writes a base's head envelope and eye block: its hair-cap job, else its single head's job, else none. */
export function envelopeJob(kit, baseId) {
  if (capStyles(kit, baseId).length) return `haircaps-${baseId}`;
  const heads = (kit.heads ?? []).filter((h) => h.base === baseId);
  return heads.length === 1 ? `heads-${heads[0].id}` : null;
}

const MAPS = ['albedo', 'normal', 'orm'];

/** Every file a heads-stage job writes, relative to the bake out dir (the driver declares the first two). */
export function headJobOutputs(kit, jobId) {
  const out = [];
  const env = (b) => [`heads/${b}/envelope.json`, ...MAPS.map((m) => `heads/guard-${b}-eyes-${m}.png`)];
  if (jobId.startsWith('haircaps-')) {
    const b = jobId.slice('haircaps-'.length);
    byId(kit.bases, b, 'base');
    out.push(`heads/guard-${b}-haircaps.blend`, `heads/guard-${b}-haircaps.json`);
    for (const s of capStyles(kit, b)) out.push(...MAPS.map((m) => `heads/guard-${b}-cap-${s}-${m}.png`));
    out.push(...env(b));
    return out;
  }
  if (!jobId.startsWith('heads-')) throw new Error(`${jobId}: not a heads-stage job`);
  const v = jobId.slice('heads-'.length);
  const head = byId(kit.heads, v, 'head');
  out.push(`heads/guard-${v}-head.blend`, `heads/guard-${v}-head.json`, ...MAPS.map((m) => `heads/guard-${v}-face-${m}.png`));
  if (envelopeJob(kit, head.base) === jobId) out.push(...env(head.base));
  return out;
}

/** Linear skin albedo mean the neutral must keep (SPEC 7: mean 0.75, the tone tints multiply it). */
export const SKIN_ALBEDO = [0.55, 0.9];
/**
 * The band per facial hair (the head's kit `facialHair`, SPEC 7 face table) where it differs from SKIN_ALBEDO. A short
 * beard paints dark strands (guard_skin.py FACIAL_HAIR beard cover 0.8) over the jaw, chin, upper lip and sideburns, about
 * a quarter of the tile, so its face-island / tile means read ~0.50 / ~0.55 (first full bake a8ff2d45: average-3
 * 0.498 / 0.546, lean-3 0.495 / 0.546) while the skin around it keeps the 0.75 neutral. Not a skin fault: the floor drops
 * for beards only. It lives here, not in guards.json: every kit section joins the bake hashes (guardBakePlan normalizeKit
 * `shared`), so a check-only value there would rebake every job.
 */
export const SKIN_ALBEDO_BY_FACIAL_HAIR = { beard: [0.45, 0.9] };

/** The albedo band a head's report must meet: by the kit head's `facialHair` (else the report's), else SKIN_ALBEDO. */
export function skinAlbedoBand(kit, r) {
  const head = (kit.heads ?? []).find((h) => h.id === r.head);
  return SKIN_ALBEDO_BY_FACIAL_HAIR[head?.facialHair ?? r.facialHair] ?? SKIN_ALBEDO;
}
/** Seam weld tolerance: head seam vs G1's body seam (mm; the job builds it at the body's positions) and across heads (m). */
export const SEAM_EPS_MM = 0.01;
export const SEAM_EPS_M = 1e-5;
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const mean3 = (a) => (Array.isArray(a) && a.length >= 3 ? (a[0] + a[1] + a[2]) / 3 : null);
/** common.game_to_blender: game (+X right, +Y up, +Z forward) -> Blender (Z up, face -Y). */
const g2b = ([x, y, z]) => [-x, -z, y];
const perimeter = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); }, 0);

/**
 * The face-island albedo mean (linear, RGB averaged): the skin the tone tints read on. The whole-tile mean (~0.69 at the
 * first smoke) is lower because the scalp's shave shadow is in it: it is NOT the neutral to divide by (G4).
 */
export function faceAlbedo(r) {
  return mean3(r.faceTile?.faceIslandAlbedoMeanLinear);
}

/** Failures (strings) of one head report (`heads/guard-<v>-head.json`) against the kit; [] = pass. */
export function checkHeadReport(r, kit) {
  const f = [];
  const b = headBudgets(kit, r.head);
  const base = byId(kit.bases, r.base, 'base');
  for (const l of LODS) {
    const got = r.tris?.head?.[l];
    if (typeof got !== 'number') f.push(`${r.head} ${l}: no triangle count`);
    else if (got > b.head[l]) f.push(`${r.head} ${l}: ${got} tris > ${b.head[l]}`);
  }
  const eyes = r.tris?.eyes?.lod0;
  if (typeof eyes !== 'number' || eyes > b.eyesLod0) f.push(`${r.head} eyes lod0: ${eyes} tris > ${b.eyesLod0}`);
  const loop = r.seam?.loopVerts ?? 0;
  if (loop < 16) f.push(`${r.head}: neck seam loop has ${loop} verts`);
  for (const l of LODS) if (r.seam?.keptVerts?.[l] !== loop) f.push(`${r.head}: ${l.toUpperCase()} keeps ${r.seam?.keptVerts?.[l]} of ${loop} seam verts (the weld needs all)`);
  if (!Array.isArray(r.seam?.mhIndex) || r.seam.mhIndex.length !== loop) f.push(`${r.head}: seam mhIndex missing`);
  if (!Array.isArray(r.seam?.positions) || r.seam.positions.length !== loop) f.push(`${r.head}: seam positions missing`);
  if (!(r.seam?.bodyGapMaxMm <= SEAM_EPS_MM)) f.push(`${r.head}: seam ${r.seam?.bodyGapMaxMm} mm off G1's body seam`);
  const tile = kit.atlas?.faceTile?.[0] ?? 1024;
  if (r.faceTile?.size !== tile) f.push(`${r.head}: face tile ${r.faceTile?.size} != ${tile}`);
  for (const m of MAPS) if (!r.faceTile?.png?.[m]) f.push(`${r.head}: no face ${m} png`);
  const band = skinAlbedoBand(kit, r);
  const alb = r.faceTile?.albedoMeanLinear;
  if (Array.isArray(alb)) {
    const mean = (alb[0] + alb[1] + alb[2]) / 3;
    if (mean < band[0] || mean > band[1]) f.push(`${r.head}: neutral albedo mean ${mean.toFixed(3)} outside ${band.join('-')}`);
  } else f.push(`${r.head}: no albedo stats`);
  const face = faceAlbedo(r);
  if (face == null) f.push(`${r.head}: no face-island albedo`);
  else if (face < band[0] || face > band[1]) f.push(`${r.head}: face-island albedo mean ${face.toFixed(3)} outside ${band.join('-')}`);
  const uv = r.faceTile?.uv;
  if (uv && uv.tris && uv.flippedTris / uv.tris > 0.01) f.push(`${r.head}: ${uv.flippedTris} of ${uv.tris} UV triangles flipped`);
  if (r.craniumLock && r.craniumLock.shiftMaxMm > 0.1) f.push(`${r.head}: cranium moved ${r.craniumLock.shiftMaxMm} mm`);
  if (!(r.seamLock?.shiftMaxMm <= SEAM_EPS_MM)) f.push(`${r.head}: seam rings moved ${r.seamLock?.shiftMaxMm} mm (seam lock)`);
  const top = r.bounds?.max?.[2];
  if (typeof top !== 'number' || !near(top, base.refHeight, 0.01)) f.push(`${r.head}: crown z ${top} not at refHeight ${base.refHeight}`);
  if (r.iris && !(kit.face?.irises ?? []).includes(r.iris)) f.push(`${r.head}: iris ${r.iris} not in the kit`);
  return f;
}

/** Failures of one hair-cap report (`heads/guard-<b>-haircaps.json`). */
export function checkCapsReport(r, kit) {
  const f = [];
  const want = capStyles(kit, r.base);
  const got = Object.keys(r.caps ?? {});
  for (const s of want) if (!got.includes(s)) f.push(`${r.base}: cap ${s} missing`);
  for (const s of got) if (!want.includes(s)) f.push(`${r.base}: cap ${s} not worn on this base`);
  for (const s of got) {
    const c = r.caps[s];
    const kc = byId(kit.hairCaps, s, 'hair cap');
    ['lod0', 'lod1'].forEach((l, i) => {
      const n = c.tris?.[l];
      if ((kc.tris[i] ?? 0) > 0 && (typeof n !== 'number' || n > kc.tris[i])) f.push(`${r.base} ${s} ${l}: ${n} tris > ${kc.tris[i]}`);
    });
    if (!Array.isArray(c.thicknessMm) || c.thicknessMm[1] > kc.offset * 1000 + 0.01) f.push(`${r.base} ${s}: thickness ${c.thicknessMm} mm > offset ${kc.offset * 1000}`);
    for (const m of MAPS) if (!c.png?.[m]) f.push(`${r.base} ${s}: no ${m} png`);
  }
  for (const [hid, p] of Object.entries(r.variantPush ?? {})) {
    if ((p.capRegionMaxAbsMm ?? 0) > 1) f.push(`${r.base} ${hid}: head moves ${p.capRegionMaxAbsMm} mm under the cap (cranium lock)`);
  }
  if (!r.envelope?.json) f.push(`${r.base}: no envelope json`);
  return f;
}

/** Failures of one envelope (`heads/<b>/envelope.json`). SPEC 7: offset = thickest cap + >= 3 mm clearance. */
export function checkEnvelope(e, kit) {
  const f = [];
  const off = kit.face?.envelopeOffset;
  if (e.offset !== off) f.push(`${e.base} envelope: offset ${e.offset} != kit ${off}`);
  const thick = Math.max(...(kit.hairCaps ?? []).map((c) => c.offset));
  if (e.clearance < 0.003 - 1e-9 || !near(e.clearance, e.offset - thick, 1e-4)) f.push(`${e.base} envelope: clearance ${e.clearance} (thickest cap ${thick})`);
  const scalp = e.landmarks?.scalpCrownZ;
  if (typeof scalp !== 'number' || e.crownZ < scalp + e.offset * 0.8) f.push(`${e.base} envelope: crown ${e.crownZ} not ~${e.offset} over the scalp ${scalp}`);
  const n = e.mesh?.faces?.length ?? 0;
  if (!n || n > ENVELOPE_TRIS * 1.05 || e.mesh.tris !== n) f.push(`${e.base} envelope: ${n} tris`);
  for (const t of e.mesh?.faces ?? []) if (t.some((i) => i < 0 || i >= e.mesh.verts.length)) { f.push(`${e.base} envelope: bad index`); break; }
  const rad = e.maxRadii ?? {};
  for (const k of ['x', 'yFront', 'yBack', 'zAboveEyes']) if (!(rad[k] > 0.03 && rad[k] < 0.2)) f.push(`${e.base} envelope: radius ${k} ${rad[k]}`);
  if (e.landmarks?.browZ >= e.crownZ || e.landmarks?.browZ <= e.landmarks?.eyeMid?.[2]) f.push(`${e.base} envelope: brow line ${e.landmarks?.browZ}`);
  return f;
}

/**
 * Failures of one base's seam (SPEC 7, G1h fix round): every head report of the base carries G1's seam loop (same
 * hm08 indices, same positions); with G1's body report (`bodies/guard-<b>-body.json`) the loop is its `neckSeam.mhVerts`
 * and the head seam's perimeter and height are the body's; the envelope's head joint is G1's bind head joint.
 */
export function checkBaseSeam(baseId, heads, body = null, envelope = null) {
  const f = [];
  const set = (a) => [...(a ?? [])].sort((x, y) => x - y).join(',');
  const [first, ...rest] = heads;
  for (const r of first ? rest : []) {
    if (set(r.seam?.mhIndex) !== set(first.seam?.mhIndex)) f.push(`${baseId}: ${r.head} seam verts differ from ${first.head}`);
    const a = r.seam?.positions ?? [];
    const b = first.seam?.positions ?? [];
    const d = a.length === b.length ? Math.max(0, ...a.map((p, i) => Math.max(...p.map((x, k) => Math.abs(x - b[i][k]))))) : Infinity;
    if (!(d <= SEAM_EPS_M)) f.push(`${baseId}: ${r.head} seam positions differ from ${first.head} by ${d} m`);
  }
  const ns = body?.neckSeam;
  for (const r of ns ? heads : []) {
    if (set(r.seam?.mhIndex) !== set(ns.mhVerts)) f.push(`${baseId}: ${r.head} seam verts are not G1's neckSeam.mhVerts`);
    const pos = r.seam?.positions ?? [];
    if (pos.length < 3) continue;
    const per = perimeter(pos);
    if (!near(per, ns.perimeter, 1e-4)) f.push(`${baseId}: ${r.head} seam perimeter ${per.toFixed(5)} != body ${ns.perimeter}`);
    const z = pos.reduce((acc, p) => acc + p[2], 0) / pos.length;
    if (!near(z, ns.meanY, 1e-4)) f.push(`${baseId}: ${r.head} seam height ${z.toFixed(5)} != body ${ns.meanY}`);
  }
  const hj = body?.bindJoints?.head;
  if (envelope && Array.isArray(hj)) {
    const want = g2b(hj);
    const got = envelope.landmarks?.headJoint ?? [];
    if (!want.every((x, k) => near(x, got[k], 1e-4))) f.push(`${baseId} envelope: head joint ${got} is not G1's bind head ${want}`);
  }
  return f;
}

/** Failures of the stage's completeness: a report for every kit head and hair-cap job, an envelope for every base. */
export function checkComplete(kit, found) {
  const f = [];
  for (const h of kit.heads ?? []) if (!found.heads.has(h.id)) f.push(`${h.id}: no head report`);
  for (const b of kit.bases ?? []) {
    if (capStyles(kit, b.id).length && !found.caps.has(b.id)) f.push(`${b.id}: no hair-cap report`);
    if (!found.envelopes.has(b.id)) f.push(`${b.id}: no envelope (heads/${b.id}/envelope.json, written by ${envelopeJob(kit, b.id) ?? 'no job'})`);
  }
  return f;
}

/**
 * Check every report under <out>/heads (+ the bodies' seams); returns { checked: [file], failures: [string], faces }.
 * `faces`: head id -> { faceIsland, tile } albedo means. `opts.partial` skips the completeness check (smoke runs).
 */
export function checkBakeDir(out, kit, opts = {}) {
  const dir = join(out, 'heads');
  const checked = [];
  const failures = [];
  const faces = {};
  if (!existsSync(dir)) return { checked, failures: [`${dir}: missing`], faces };
  const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
  const found = { heads: new Set(), caps: new Set(), envelopes: new Set() };
  const byBase = {};
  const envs = {};
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (/^guard-.+-head\.json$/.test(name)) {
      const r = read(p);
      checked.push(name);
      failures.push(...checkHeadReport(r, kit));
      found.heads.add(r.head);
      (byBase[r.base] ??= []).push(r);
      faces[r.head] = { faceIsland: faceAlbedo(r), tile: mean3(r.faceTile?.albedoMeanLinear) };
    } else if (/^guard-.+-haircaps\.json$/.test(name)) {
      const r = read(p);
      checked.push(name);
      failures.push(...checkCapsReport(r, kit));
      found.caps.add(r.base);
    } else if (existsSync(join(p, 'envelope.json'))) {
      const e = read(join(p, 'envelope.json'));
      checked.push(`${name}/envelope.json`);
      failures.push(...checkEnvelope(e, kit));
      found.envelopes.add(e.base);
      envs[e.base] = e;
    }
  }
  for (const b of kit.bases ?? []) {
    const bp = join(out, 'bodies', `guard-${b.id}-body.json`);
    const body = existsSync(bp) ? read(bp) : null;
    if (body) checked.push(`bodies/guard-${b.id}-body.json (seam)`);
    failures.push(...checkBaseSeam(b.id, byBase[b.id] ?? [], body, envs[b.id] ?? null));
  }
  if (!opts.partial) failures.push(...checkComplete(kit, found));
  return { checked, failures, faces };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', 'C:/NightShift/scratch/guard-bake');
  const kit = JSON.parse(readFileSync(arg('--kit', 'scripts/operators/data/guards.json'), 'utf8'));
  const { checked, failures, faces } = checkBakeDir(out, kit, { partial: process.argv.includes('--partial') });
  console.log(`guard heads: ${checked.length} reports checked (${checked.join(', ') || 'none'})`);
  for (const [h, a] of Object.entries(faces)) console.log(`  ${h}: albedo mean (linear) face island ${a.faceIsland?.toFixed(3) ?? '-'}, whole tile ${a.tile?.toFixed(3) ?? '-'} (the tile includes the scalp shadow: not the neutral)`);
  for (const x of failures) console.log(`  FAIL ${x}`);
  console.log(failures.length ? `${failures.length} failure(s)` : 'all pass');
  process.exit(failures.length || !checked.length ? 1 : 0);
}
