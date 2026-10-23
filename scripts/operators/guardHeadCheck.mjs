#!/usr/bin/env node
/**
 * Guard heads (guard-models G1h): the pure half of `py/build_head.py`. Budgets (PLAN 5), the outputs each heads-stage
 * job writes, and checks of the job reports against the kit (`scripts/operators/data/guards.json`, SPEC 7).
 *
 * CLI: `node scripts/operators/guardHeadCheck.mjs --out <bake dir> --kit <guards.json>` checks every head, hair-cap
 * and envelope report found under `<out>/heads/` and exits 1 on a failure.
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
const near = (a, b, eps) => Math.abs(a - b) <= eps;

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
  if (r.seam?.keptVerts?.lod0 !== loop) f.push(`${r.head}: LOD0 keeps ${r.seam?.keptVerts?.lod0} of ${loop} seam verts (the weld needs all)`);
  const tile = kit.atlas?.faceTile?.[0] ?? 1024;
  if (r.faceTile?.size !== tile) f.push(`${r.head}: face tile ${r.faceTile?.size} != ${tile}`);
  for (const m of MAPS) if (!r.faceTile?.png?.[m]) f.push(`${r.head}: no face ${m} png`);
  const alb = r.faceTile?.albedoMeanLinear;
  if (Array.isArray(alb)) {
    const mean = (alb[0] + alb[1] + alb[2]) / 3;
    if (mean < SKIN_ALBEDO[0] || mean > SKIN_ALBEDO[1]) f.push(`${r.head}: neutral albedo mean ${mean.toFixed(3)} outside ${SKIN_ALBEDO.join('-')}`);
  } else f.push(`${r.head}: no albedo stats`);
  const uv = r.faceTile?.uv;
  if (uv && uv.tris && uv.flippedTris / uv.tris > 0.01) f.push(`${r.head}: ${uv.flippedTris} of ${uv.tris} UV triangles flipped`);
  if (r.craniumLock && r.craniumLock.shiftMaxMm > 0.01) f.push(`${r.head}: cranium moved ${r.craniumLock.shiftMaxMm} mm`);
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

/** Check every report under <out>/heads; returns { checked: [file], failures: [string] }. */
export function checkBakeDir(out, kit) {
  const dir = join(out, 'heads');
  const checked = [];
  const failures = [];
  if (!existsSync(dir)) return { checked, failures: [`${dir}: missing`] };
  const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (/^guard-.+-head\.json$/.test(name)) { checked.push(name); failures.push(...checkHeadReport(read(p), kit)); }
    else if (/^guard-.+-haircaps\.json$/.test(name)) { checked.push(name); failures.push(...checkCapsReport(read(p), kit)); }
    else if (existsSync(join(p, 'envelope.json'))) { checked.push(`${name}/envelope.json`); failures.push(...checkEnvelope(read(join(p, 'envelope.json')), kit)); }
  }
  return { checked, failures };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', 'C:/NightShift/scratch/guard-bake');
  const kit = JSON.parse(readFileSync(arg('--kit', 'scripts/operators/data/guards.json'), 'utf8'));
  const { checked, failures } = checkBakeDir(out, kit);
  console.log(`guard heads: ${checked.length} reports checked (${checked.join(', ') || 'none'})`);
  for (const x of failures) console.log(`  FAIL ${x}`);
  console.log(failures.length ? `${failures.length} failure(s)` : 'all pass');
  process.exit(failures.length || !checked.length ? 1 : 0);
}
