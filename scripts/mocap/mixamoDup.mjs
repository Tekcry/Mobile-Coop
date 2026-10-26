// (mixamo-retarget I7) Duplicate check over the Mixamo dumps (BATCH2-PLAN "(2) Driver change"): a pack file that is the
// same motion as another file with the same slug tail (`aa_walking` and the root `walking`) is listed in the manifest
// (`dupOf`) and never emitted (mixamoEmit.mjs skips it). Run it after a dump (the dump rewrites the manifest):
//   node scripts/mocap/mixamoDup.mjs        -> build/mocap/mixamo/manifest.json rows gain dupOf / dupCm
// Measure: both takes through the M2 adapter (game frame, floor at 0), each moved so its start root is at the origin
// (x and z; the facing is the adapter's measured one in both), resampled to the same frame count by normalised time;
// the largest distance of any slot over the frames. Under DUP_CM, with lengths within DUP_FRAMES, it is a duplicate.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MIXAMO_OUT, packPrefix } from './mixamo.mjs';
import { loadMixamoTake } from './mixamoTake.mjs';

/** Joints within this (cm) at every frame: the same motion. */
export const DUP_CM = 1;
/** Takes whose 30 fps lengths differ by more than this many frames are never duplicates. */
export const DUP_FRAMES = 1;

/** The slug without its pack prefix (`aa_walking` -> `walking`); a root clip's slug as it is. */
export function slugTail(slug, pack) {
  if (!pack) return slug;
  const pre = `${packPrefix(pack)}_`;
  return slug.startsWith(pre) ? slug.slice(pre.length) : slug;
}

/**
 * The pairs to compare: per slug tail, the first clip (a root file first, else the first slug) against every pack clip
 * with that tail. `clips`: manifest rows ({ slug, pack }). Returns [[keep, candidate]] (slugs).
 */
export function dupPairs(clips) {
  const byTail = new Map();
  for (const c of clips) {
    const t = slugTail(c.slug, c.pack);
    byTail.set(t, [...(byTail.get(t) ?? []), c]);
  }
  const pairs = [];
  for (const group of byTail.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => (!!a.pack - !!b.pack) || (a.slug < b.slug ? -1 : 1));
    for (const c of sorted.slice(1)) if (c.pack) pairs.push([sorted[0].slug, c.slug]);
  }
  return pairs;
}

/** A take's position of `slot` at normalised time u (0..1), linear between its 120 fps frames. */
function posAt(take, slot, u) {
  const P = take.pos.get(slot);
  const f = u * (take.frames - 1), i = Math.min(take.frames - 2, Math.floor(f)), t = f - i;
  return [0, 1, 2].map((c) => P[i][c] + (P[i + 1][c] - P[i][c]) * t);
}

/**
 * The largest slot distance (m) between two takes after aligning their start roots (x, z), over `n` frames at even
 * normalised times (default the longer take's frame count). Slots missing from either take are skipped.
 */
export function poseDistance(a, b, n = Math.max(a.frames, b.frames)) {
  const ra = a.pos.get('root')[0], rb = b.pos.get('root')[0];
  let max = 0;
  for (const slot of a.pos.keys()) {
    if (!b.pos.has(slot)) continue;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1);
      const p = posAt(a, slot, u), q = posAt(b, slot, u);
      const d = Math.sqrt((p[0] - ra[0] - (q[0] - rb[0])) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - ra[2] - (q[2] - rb[2])) ** 2);
      if (d > max) max = d;
    }
  }
  return max;
}

/**
 * Marks the duplicates in a manifest (mutated and returned): each compared pack row gets `dupCm` (the distance, cm) and,
 * under DUP_CM with lengths within DUP_FRAMES (30 fps), `dupOf` (the kept slug); rows without a pair lose both.
 * `load(slug)` gives a take (default: the dump through the adapter).
 */
export function markDups(manifest, { load = (slug) => loadMixamoTake(slug) } = {}) {
  const rows = new Map(manifest.clips.map((c) => [c.slug, c]));
  for (const c of manifest.clips) { delete c.dupOf; delete c.dupCm; }
  const cache = new Map();
  const take = (s) => cache.get(s) ?? cache.set(s, load(s)).get(s);
  const out = [];
  for (const [keep, cand] of dupPairs(manifest.clips)) {
    const a = take(keep), b = take(cand);
    const sameLength = Math.abs(a.frames - b.frames) <= DUP_FRAMES * 4; // 120 fps frames: 4 a 30 fps frame
    const cm = Math.round(poseDistance(a, b) * 1000) / 10;
    const r = rows.get(cand);
    r.dupCm = cm;
    if (sameLength && cm < DUP_CM && !rows.get(keep).dupOf) r.dupOf = keep;
    out.push({ keep, cand, cm, sameLength, dup: !!r.dupOf });
  }
  return { manifest, pairs: out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const file = path.join(MIXAMO_OUT, 'manifest.json');
  if (!existsSync(file)) throw new Error(`no manifest at ${file} (dump first: node scripts/mocap/mixamo.mjs)`);
  const { manifest, pairs } = markDups(JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(file, JSON.stringify(manifest, null, 1) + '\n');
  for (const p of pairs) console.log(`${p.dup ? 'DUP ' : 'diff'} ${p.cand.padEnd(32)} vs ${p.keep.padEnd(28)} ${p.cm} cm${p.sameLength ? '' : ' (lengths differ)'}`);
  console.log(`mixamoDup: ${pairs.length} pairs, ${pairs.filter((p) => p.dup).length} duplicates -> ${path.relative(process.cwd(), file)}`);
}
