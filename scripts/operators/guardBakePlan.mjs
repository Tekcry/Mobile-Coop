// Pure planning half of the guard bake driver (docs/guard-models/PLAN.md slice GB): the stage graph, the job split per
// stage, the input hash that lets an unchanged job be skipped, and the parallel scheduler. No fs, no child_process:
// the driver (guard-bake.mjs) reads the files, passes their hashes in and spawns the processes.
import { createHash } from 'node:crypto';

/** Repo-relative home of the Blender scripts and of the kit data (G0 writes guards.json). */
export const PY_REL = 'scripts/operators/py';
export const KIT_FILE = 'scripts/operators/data/guards.json';
/** Bump to invalidate every stored job hash (a change to how hashes or job args are made). */
const HASH_VERSION = 1;

/**
 * The stage graph in run order. `deps` are the stages whose outputs the stage reads; heads and gear need only the kit
 * data (guards.json). `prep` (G1) is one node job: each base's skeleton from the game rig (`joints/guard-<base>.json`)
 * and the MakeHuman data (`mpfb2/`) under the out dir, which the bodies read.
 */
export const STAGES = [
  { name: 'prep', deps: [] },
  { name: 'bodies', deps: ['prep'] },
  { name: 'heads', deps: [] },
  { name: 'garments', deps: ['bodies'] },
  { name: 'gear', deps: [] },
  { name: 'lods', deps: ['bodies', 'heads', 'garments', 'gear'] },
  { name: 'check', deps: ['lods'] },
  { name: 'sheet', deps: ['check'] },
];
export const STAGE_NAMES = STAGES.map((s) => s.name);

export function stageDeps(stage) {
  const s = STAGES.find((x) => x.name === stage);
  if (!s) throw new Error(`unknown stage "${stage}" (stages: ${STAGE_NAMES.join(', ')})`);
  return s.deps;
}

/** Every stage `stage` needs, transitively, in run order (not including `stage`). */
export function stagesBefore(stage) {
  const seen = new Set();
  const walk = (s) => { for (const d of stageDeps(s)) { if (!seen.has(d)) { seen.add(d); walk(d); } } };
  walk(stage);
  return STAGE_NAMES.filter((n) => seen.has(n));
}

/** Cycles bakes on the GPU: heads (face tiles) and lods (atlas, normal, AO). At most `maxGpu` of them run at once. */
export const GPU_STAGES = new Set(['heads', 'lods']);

/** Shared library files (repo-relative, under py/) whose content joins the hash of every job of a stage. */
const LIBS = {
  prep: [],
  bodies: ['common.py', 'mh.py', 'guard_body.py'],
  heads: ['common.py', 'mh.py', 'materials.py'],
  garments: ['common.py', 'pattern.py', 'build_garment.py', 'garment_details.py', 'fitted.py', 'materials.py', 'garments/torso_common.py'],
  gear: ['common.py', 'rigid_skin.py', 'materials.py', 'garments/kit_common.py'],
  lods: ['common.py', 'bake_lods.py', 'rigid_skin.py', 'materials.py'],
  check: ['common.py', 'check_garment.py'],
  sheet: [],
};

/** The id contract (gm-common.md) as a kit: what a job split yields when guards.json has not landed yet. */
export function contractKit() {
  return {
    bases: ['average', 'lean', 'broad'],
    heads: ['average-1', 'average-2', 'average-3', 'average-4', 'lean-1', 'lean-2', 'lean-3', 'lean-4', 'broad-1'],
    outfits: ['uniform', 'uniform_rolled', 'work', 'uniform_jacket'],
    pieces: {
      headwear: ['cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie'],
      eyewear: ['glasses_clear', 'glasses_dark'],
      gear: ['helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy', 'shield_riot'],
      small: ['radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount'],
    },
  };
}

/** Garments baked per (base, garment) when the kit lists none (PLAN G2: shirt, trousers, boots, gloves; officer jacket on average). */
const DEFAULT_GARMENTS = [
  { id: 'shirt', script: 'garments/combat_shirt.py' },
  { id: 'trousers', script: 'garments/trousers.py' },
  { id: 'boots', script: 'garments/boots.py' },
  { id: 'gloves', script: 'garments/gloves.py' },
  { id: 'jacket', script: 'garments/field_jacket.py', bases: ['average'] },
];

/** G1: the guard body script (Wren's build_body.py is untouched), the prep job's script and its hashed sources. */
export const BODY_SCRIPT = 'build_guard_body.py';
export const PREP_SCRIPT = 'scripts/operators/guard-prep.mjs';
const PREP_FILES = [
  'scripts/operators/guardJoints.mjs', 'scripts/operators/fetch-base-body.mjs', 'scripts/operators/data/mpfb2-files.txt',
  'scripts/operators/paths.mjs', 'scripts/anim-skeleton/skeleton.json', 'src/player/proportions.ts',
  'src/operators/operatorBody.ts', 'src/anim/clavicle.ts',
];

/** Pieces with their own GLB, rigid and the same for every base (G3, G4): one job, not one per base. */
const OWN_GLB = new Set(['shield_riot']);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** `[ 'a', {id:'b'} ]` or `{ a: {...}, b: {...} }` to `[{id, ...entry}]`. */
function entries(section) {
  if (section == null) return [];
  if (Array.isArray(section)) return section.map((e) => (typeof e === 'string' ? { id: e } : { ...e }));
  if (isObj(section)) return Object.entries(section).map(([id, e]) => ({ ...(isObj(e) ? e : {}), id: isObj(e) && e.id ? e.id : id }));
  throw new Error('kit section must be an array or an object');
}

/** Pieces: a flat list, an object keyed by id, or groups of lists (`{ headwear: [...], gear: [...] }`). */
function pieceEntries(section) {
  if (section == null) return [];
  if (isObj(section) && Object.values(section).some(Array.isArray)) {
    return Object.entries(section).flatMap(([group, list]) => entries(list).map((e) => ({ group, ...e })));
  }
  return entries(section);
}

/**
 * Reads a kit (the parsed guards.json) tolerantly into what the job split needs: bases, head variants (base from the
 * entry's `base`, else the id's prefix before the last `-`), garments, pieces. `shared` is every other section; it joins
 * each job's kit hash so a change to budgets or tint slots rebakes everything, while a change to one base's entry
 * rebakes only that base's jobs.
 */
export function normalizeKit(raw) {
  if (!isObj(raw)) throw new Error('kit data is not an object');
  const bases = entries(raw.bases);
  const baseIds = bases.map((b) => b.id);
  const heads = entries(raw.heads).map((h) => {
    const base = h.base ?? h.id.replace(/-[^-]*$/, '');
    return { ...h, base };
  });
  const garments = (raw.garments == null ? DEFAULT_GARMENTS : entries(raw.garments)).map((g) => ({ ...g }));
  const pieces = pieceEntries(raw.pieces ?? raw.gear);
  if (!baseIds.length) throw new Error('kit has no bases');
  if (!heads.length) throw new Error('kit has no head variants');
  for (const h of heads) if (!baseIds.includes(h.base)) throw new Error(`head ${h.id}: base "${h.base}" is not in the kit's bases`);
  for (const g of garments) for (const b of g.bases ?? []) if (!baseIds.includes(b)) throw new Error(`garment ${g.id}: base "${b}" is not in the kit's bases`);
  const own = (p) => p.perBase === false || (p.perBase === undefined && OWN_GLB.has(p.id));
  const owned = pieces.filter(own);
  const shared = Object.fromEntries(Object.entries(raw).filter(([k]) => !['bases', 'heads', 'garments', 'pieces', 'gear'].includes(k)));
  return { bases, heads, garments, pieces: pieces.filter((p) => !own(p)), ownGlb: owned, shared };
}

/** Deterministic JSON: object keys sorted, so key order in guards.json never changes a hash. */
export function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  return JSON.stringify(v) ?? 'null';
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** The repo-relative file a job's script is (a node job's script already is one). */
export function scriptFile(job) {
  return job.runner === 'node' ? job.script : `${PY_REL}/${job.script}`;
}

const lib = (stage) => LIBS[stage].map((f) => `${PY_REL}/${f}`);

const idOf = (stage, ...parts) => [stage, ...parts].join('-');
const slice = (nk, entry) => ({ entry, shared: nk.shared });

/**
 * The jobs of a stage for a kit. One job per base (bodies, lods, check), per head variant (heads), per (base, garment)
 * (garments), per (base, piece) (gear), one for prep and one for sheet. A piece with its own GLB (shield_riot) is one gear job, one lods
 * job and one check job, not three. `opts.only` (array or comma list) keeps the jobs whose id, id without the stage
 * prefix, or any tag (base, variant, garment, piece) is named.
 *
 * Job: { id, stage, runner ('blender' | 'node'), script, args[], inputs[] (files then upstream job ids), files[] (hashed
 * library files), needs[] (upstream job ids), outputs[] (relative to the out dir), gpuBound, tags[], kit (hashed slice),
 * env }. The driver adds `--kit` / `--out` at spawn time; they are not part of `args`, so moving the folders keeps hashes.
 */
export function jobsFor(stage, kit, opts = {}) {
  stageDeps(stage);
  const nk = normalizeKit(kit);
  const baseIds = nk.bases.map((b) => b.id);
  const headsOf = (b) => nk.heads.filter((h) => h.base === b);
  const garmentsOf = (b) => nk.garments.filter((g) => !g.bases || g.bases.includes(b));
  const gpuBound = GPU_STAGES.has(stage);
  const make = (id, o) => ({
    id, stage, runner: 'blender', args: [], needs: [], gpuBound, tags: [], env: {}, ...o,
    files: o.files ?? lib(stage),
    inputs: [KIT_FILE, ...(o.files ?? lib(stage)), ...(o.needs ?? [])],
  });
  const common = (j) => ['--stage', stage, '--job', j];
  const gearIds = (b) => nk.pieces.map((p) => idOf('gear', b, p.id));
  const out = {
    // the joints come from the game's TypeScript (proportions, the rig layout, the clavicle point): those files join the hash
    prep: () => [make('prep', {
      runner: 'node', script: PREP_SCRIPT, args: common('prep'), files: PREP_FILES, kit: { bases: nk.bases },
      outputs: [...baseIds.map((b) => `joints/guard-${b}.json`), 'mpfb2/3dobjs/base.obj', 'prep/prep.json'],
    })],
    bodies: () => nk.bases.map((b) => make(idOf('bodies', b.id), {
      script: BODY_SCRIPT, args: [...common(idOf('bodies', b.id)), '--base', b.id], tags: [b.id], needs: ['prep'],
      kit: slice(nk, b), outputs: [`bodies/guard-${b.id}-body.blend`, `bodies/guard-${b.id}-body.json`],
    })),
    heads: () => nk.heads.map((h) => make(idOf('heads', h.id), {
      script: 'build_head.py', args: [...common(idOf('heads', h.id)), '--base', h.base, '--head', h.id], tags: [h.id, h.base],
      kit: slice(nk, h), outputs: [`heads/guard-${h.id}-head.blend`, `heads/guard-${h.id}-head.json`],
    })),
    garments: () => nk.bases.flatMap((b) => garmentsOf(b.id).map((g) => make(idOf('garments', b.id, g.id), {
      script: g.script ?? `garments/${g.id}.py`, args: [...common(idOf('garments', b.id, g.id)), '--base', b.id, '--garment', g.id],
      needs: [idOf('bodies', b.id)], tags: [b.id, g.id], kit: { ...slice(nk, g), base: b },
      outputs: [`garments/guard-${b.id}-${g.id}.blend`, `garments/guard-${b.id}-${g.id}.json`],
    }))),
    gear: () => [
      ...nk.bases.flatMap((b) => nk.pieces.map((p) => make(idOf('gear', b.id, p.id), {
        script: p.script ?? 'rigid_skin.py', args: [...common(idOf('gear', b.id, p.id)), '--base', b.id, '--piece', p.id],
        tags: [b.id, p.id], kit: { ...slice(nk, p), base: b },
        outputs: [`gear/guard-${b.id}-${p.id}.blend`, `gear/guard-${b.id}-${p.id}.json`],
      }))),
      ...nk.ownGlb.map((p) => make(idOf('gear', p.id), {
        script: p.script ?? 'rigid_skin.py', args: [...common(idOf('gear', p.id)), '--piece', p.id], tags: [p.id],
        kit: slice(nk, p), outputs: [`gear/guard-${p.id}.blend`, `gear/guard-${p.id}.json`],
      })),
    ],
    lods: () => [
      ...nk.bases.map((b) => make(idOf('lods', b.id), {
        script: 'bake_lods.py', args: [...common(idOf('lods', b.id)), '--guard', '--base', b.id],
        needs: [idOf('bodies', b.id), ...headsOf(b.id).map((h) => idOf('heads', h.id)), ...garmentsOf(b.id).map((g) => idOf('garments', b.id, g.id)), ...gearIds(b.id)],
        tags: [b.id], kit: slice(nk, b),
        outputs: [0, 1, 2].map((n) => `lods/guard-${b.id}-lod${n}.glb`).concat(`lods/guard-${b.id}.report.json`),
      })),
      ...nk.ownGlb.map((p) => make(idOf('lods', p.id), {
        script: 'bake_lods.py', args: [...common(idOf('lods', p.id)), '--guard', '--piece', p.id],
        needs: [idOf('gear', p.id)], tags: [p.id], kit: slice(nk, p),
        outputs: [0, 1, 2].map((n) => `lods/guard-${p.id}-lod${n}.glb`).concat(`lods/guard-${p.id}.report.json`),
      })),
    ],
    check: () => [
      ...nk.bases.map((b) => make(idOf('check', b.id), {
        script: 'check_guard.py', args: [...common(idOf('check', b.id)), '--base', b.id], needs: [idOf('lods', b.id)],
        tags: [b.id], kit: slice(nk, b), outputs: [`check/guard-${b.id}.check.report.json`],
      })),
      ...nk.ownGlb.map((p) => make(idOf('check', p.id), {
        script: 'check_guard.py', args: [...common(idOf('check', p.id)), '--piece', p.id], needs: [idOf('lods', p.id)],
        tags: [p.id], kit: slice(nk, p), outputs: [`check/guard-${p.id}.check.report.json`],
      })),
    ],
    // the review sheet is a Playwright run, not a Blender one: GPU page, own port, runs alone as the last step
    sheet: () => [make('sheet', {
      runner: 'node', script: 'scripts/operator-sheet.mjs', args: ['--guards'], gpuBound: true,
      env: { E2E_GPU: '1', E2E_PORT: '4189' }, needs: [...baseIds.map((b) => idOf('check', b)), ...nk.ownGlb.map((p) => idOf('check', p.id))],
      kit: { shared: nk.shared, bases: baseIds, heads: nk.heads.map((h) => h.id) },
      outputs: ['sheet/guard-sheet.png'], files: [],
    })],
  }[stage]();
  const only = onlyList(opts.only);
  if (!only.length) return out;
  const prefix = `${stage}-`;
  return out.filter((j) => only.some((o) => o === j.id || o === j.id.slice(prefix.length) || j.tags.includes(o)));
}

function onlyList(only) {
  if (only == null) return [];
  const list = Array.isArray(only) ? only : String(only).split(',');
  return list.map((s) => s.trim()).filter(Boolean);
}

/** `--only` names that match no job of the stage: the driver refuses them rather than silently running nothing. */
export function unknownOnly(stage, kit, only) {
  const all = jobsFor(stage, kit);
  const prefix = `${stage}-`;
  return onlyList(only).filter((o) => !all.some((j) => o === j.id || o === j.id.slice(prefix.length) || j.tags.includes(o)));
}

/**
 * sha256 over the script's content hash, the shared library files' hashes, the job's kit slice, its args and the
 * upstream jobs' hashes. `fileHashes` maps repo-relative path to content hash, `upstreamHashes` maps upstream job id to
 * the hash that job was built with; a file or upstream not given counts as "missing" (the driver refuses to run those).
 */
export function inputHash(job, fileHashes, upstreamHashes = {}) {
  const h = createHash('sha256');
  const part = (k, v) => h.update(`${k}=${v}\n`);
  part('version', HASH_VERSION);
  part('job', job.id);
  part('script', fileHashes[scriptFile(job)] ?? 'missing');
  for (const f of [...job.files].sort()) part(`file:${f}`, fileHashes[f] ?? 'missing');
  part('kit', sha(stableStringify(job.kit ?? null)));
  part('args', JSON.stringify(job.args));
  part('env', stableStringify(job.env ?? {}));
  for (const u of [...job.needs].sort()) part(`up:${u}`, upstreamHashes[u] ?? 'missing');
  return h.digest('hex');
}

/** Every repo-relative file whose hash `inputHash` reads for these jobs (the driver hashes exactly these). */
export function filesToHash(jobs) {
  return [...new Set(jobs.flatMap((j) => [scriptFile(j), ...j.files]))].sort();
}

/**
 * The next job to start: the first pending job (in order) that fits, given what runs now. At most `par` jobs at once
 * and at most `maxGpu` gpuBound ones; a GPU job that does not fit is skipped so a CPU job can use the slot.
 */
export function pickNext(pending, running, { par, maxGpu = 2 }) {
  if (running.length >= par) return null;
  const gpu = running.filter((j) => j.gpuBound).length;
  return pending.find((j) => !j.gpuBound || gpu < maxGpu) ?? null;
}

/**
 * Simulated schedule with unit-length jobs: waves of jobs that run together. Used by --dry-run to show the shape and by
 * the tests; the real run starts a job whenever a slot frees (pickNext), which is never wider than this.
 */
export function parallelPlan(jobs, { par, maxGpu = 2 }) {
  if (!(par >= 1)) throw new Error('par must be at least 1');
  const pending = [...jobs];
  const waves = [];
  while (pending.length) {
    const wave = [];
    for (let j = pickNext(pending, wave, { par, maxGpu }); j; j = pickNext(pending, wave, { par, maxGpu })) {
      wave.push(j);
      pending.splice(pending.indexOf(j), 1);
    }
    waves.push(wave);
  }
  return waves;
}

/** Outputs the push step ships to bake/guard-models: GLB, KTX2, report JSON, PNG sheets. */
export const SHIPPABLE = /\.(glb|ktx2|png)$|\.report\.json$/;
export const shippable = (rel) => SHIPPABLE.test(rel);
