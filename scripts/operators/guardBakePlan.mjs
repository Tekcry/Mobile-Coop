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
 * The stage graph in run order. `deps` are the stages whose outputs the stage reads. Heads (G1h fix round) build on
 * G1's fit of the base (guard_body.GuardFit over prep's joints and MakeHuman data), so they need prep; gear pieces fitted
 * on the head envelope (`fit: 'headEnvelope'`) need the job that writes `heads/<base>/envelope.json`. `prep` (G1) is one
 * node job: each base's skeleton from the game rig (`joints/guard-<base>.json`) and the MakeHuman data (`mpfb2/`) under
 * the out dir, which the bodies and heads read.
 */
export const STAGES = [
  { name: 'prep', deps: [] },
  { name: 'bodies', deps: ['prep'] },
  { name: 'heads', deps: ['prep'] },
  { name: 'garments', deps: ['bodies'] },
  { name: 'gear', deps: ['bodies', 'heads'] }, // G3's gear fits read bodies/guard-<base>-body.json (+ the head envelope)
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
  heads: ['common.py', 'mh.py', 'materials.py', 'guard_skin.py', 'guard_body.py'],
  garments: ['common.py', 'pattern.py', 'build_garment.py', 'garment_details.py', 'fitted.py', 'materials.py', 'garments/torso_common.py',
    // G2: the job runner, its data and the parts a layer chain rebuilds under another job (gloves are in no chain).
    'guard_garment.py', 'guard_garments.json', 'build_fitted.py', 'garments/legwear.py', 'garments/combat_shirt.py',
    'garments/trousers.py', 'garments/boots.py', 'garments/field_jacket.py'],
  gear: ['common.py', 'rigid_skin.py', 'materials.py', 'gear/__init__.py', 'gear/fit.py', 'gear/mesh.py', 'gear/headwear.py', 'gear/helmet.py',
    'gear/torso.py', 'gear/shield.py', 'gear/kit.py', 'gear/pieces.py'],
  lods: ['common.py', 'bake_lods.py', 'rigid_skin.py', 'materials.py'],
  check: ['common.py', 'check_garment.py'],
  sheet: [],
};

/** The id contract (gm-common.md) as a kit: what a job split yields when guards.json has not landed yet. */
export function contractKit() {
  return {
    bases: ['average', 'lean', 'broad'],
    heads: ['average-1', 'average-2', 'average-3', 'average-4', 'lean-1', 'lean-2', 'lean-3', 'lean-4', 'broad-1'],
    hairCaps: ['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'],
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
/** The base an own-GLB piece is built on when the kit has no kinds (mirrors gear/pieces.py SHIELD_BASE). */
const OWN_GLB_BASE = { shield_riot: 'broad' };

/**
 * Garment parts per outfit (SPEC section 4, PLAN G2) when the kit's outfit pieces (`kind: 'outfit'`) list none
 * (`garments` on the piece overrides). Each part is one cloth job per base that wears the outfit; a part two outfits share
 * on a base (boots) is baked once. Variants are args to the part's script (G2 writes them).
 */
const OUTFIT_GARMENTS = {
  uniform: ['shirt', 'trousers', 'boots', 'gloves'],
  uniform_rolled: ['shirt_rolled', 'trousers', 'boots', 'gloves'],
  work: ['work_jacket', 'work_trousers', 'boots', 'work_gloves'],
  uniform_jacket: ['shirt', 'jacket', 'trousers', 'boots', 'gloves'],
};
const GARMENT_PARTS = {
  shirt: { script: 'garments/combat_shirt.py' },
  shirt_rolled: { script: 'garments/combat_shirt.py', variant: 'rolled' },
  trousers: { script: 'garments/trousers.py' },
  boots: { script: 'garments/boots.py' },
  gloves: { script: 'garments/gloves.py' },
  jacket: { script: 'garments/field_jacket.py' },
  work_jacket: { script: 'garments/field_jacket.py', variant: 'work' },
  work_trousers: { script: 'garments/trousers.py', variant: 'work' },
  work_gloves: { script: 'garments/gloves.py', variant: 'work' },
};
/** Kind lists whose ids are gear jobs of the kind's base (the outfit is a garment, hair caps are a heads job). */
const KIND_PIECE_LISTS = ['headwear', 'headwear2', 'eyewear', 'fixedGear', 'gameplayGear', 'kitPool'];
/** Gear fits that sit over the head envelope (G3 `fit`; G1h writes the envelope): their jobs need the envelope's job. */
const ENVELOPE_FIT = new Set(['headEnvelope']);

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
 * entry's `base`, else the id's prefix before the last `-`), garments, pieces, hair caps. `shared` is every other
 * section; it joins each job's kit hash so a change to budgets or tint slots rebakes everything, while a change to one
 * base's entry rebakes only that base's jobs.
 *  - Garments: pieces of kind `outfit` become garment jobs (their parts, OUTFIT_GARMENTS) on the bases whose kinds wear
 *    them; a kit without outfit pieces uses its `garments` list, else DEFAULT_GARMENTS.
 *  - Gear: every other piece. With `kinds`, `pieceUse` names per base the pieces its kinds can show (headwear,
 *    headwear2, eyewear, fixedGear, gameplayGear, kitPool), so a base never bakes a piece it does not use.
 *  - Hair caps: `hairCapBases` lists the bases whose kinds wear a cap with a mesh (not bald), with those caps.
 */
export function normalizeKit(raw) {
  if (!isObj(raw)) throw new Error('kit data is not an object');
  const bases = entries(raw.bases);
  const baseIds = bases.map((b) => b.id);
  const heads = entries(raw.heads).map((h) => {
    const base = h.base ?? h.id.replace(/-[^-]*$/, '');
    return { ...h, base };
  });
  const allPieces = pieceEntries(raw.pieces ?? raw.gear);
  const isOutfit = (p) => p.kind === 'outfit' || p.group === 'outfit' || p.group === 'outfits';
  const outfits = allPieces.filter(isOutfit);
  const pieces = allPieces.filter((p) => !isOutfit(p));
  const kinds = entries(raw.kinds);
  if (!baseIds.length) throw new Error('kit has no bases');
  if (!heads.length) throw new Error('kit has no head variants');
  for (const h of heads) if (!baseIds.includes(h.base)) throw new Error(`head ${h.id}: base "${h.base}" is not in the kit's bases`);
  for (const k of kinds) if (!baseIds.includes(k.base)) throw new Error(`kind ${k.id}: base "${k.base}" is not in the kit's bases`);
  const kindsOf = (b) => kinds.filter((k) => k.base === b);

  let garments;
  if (outfits.length) {
    const parts = new Map();
    for (const o of outfits) {
      const wornOn = kinds.length ? baseIds.filter((b) => kindsOf(b).some((k) => k.outfit === o.id)) : baseIds;
      const list = o.garments ?? OUTFIT_GARMENTS[o.id];
      if (!list) throw new Error(`outfit ${o.id}: no garment parts (add "garments" to the piece or OUTFIT_GARMENTS)`);
      for (const e of entries(list)) {
        const def = { ...(GARMENT_PARTS[e.id] ?? {}), ...e };
        const g = parts.get(def.id) ?? { ...def, bases: [], outfits: [], outfitBases: {} };
        for (const b of wornOn) if (!g.bases.includes(b)) g.bases.push(b);
        if (!g.outfits.some((x) => x.id === o.id)) g.outfits.push(o);
        g.outfitBases[o.id] = wornOn;
        parts.set(def.id, g);
      }
    }
    garments = [...parts.values()].filter((g) => g.bases.length).map((g) => ({ ...g, bases: baseIds.filter((b) => g.bases.includes(b)) }));
  } else {
    garments = (raw.garments == null ? DEFAULT_GARMENTS : entries(raw.garments)).map((g) => ({ ...g }));
  }
  for (const g of garments) for (const b of g.bases ?? []) if (!baseIds.includes(b)) throw new Error(`garment ${g.id}: base "${b}" is not in the kit's bases`);

  const own = (p) => p.ownGlb === true || p.perBase === false || (p.perBase === undefined && OWN_GLB.has(p.id));
  const owned = pieces.filter(own);
  const pieceIds = new Set(allPieces.map((p) => p.id));
  let pieceUse = null;
  if (kinds.length) {
    pieceUse = Object.fromEntries(baseIds.map((b) => [b, new Set()]));
    for (const k of kinds) {
      for (const list of KIND_PIECE_LISTS) {
        for (const id of k[list] ?? []) {
          if (!pieceIds.has(id)) throw new Error(`kind ${k.id}: ${list} piece "${id}" is not in the kit's pieces`);
          pieceUse[k.base].add(id);
        }
      }
    }
  }

  const caps = entries(raw.hairCaps).filter((c) => c.id !== 'bald' && !(Array.isArray(c.tris) && c.tris[0] === 0));
  const hairCapBases = baseIds.map((b) => {
    const worn = kinds.length ? new Set(kindsOf(b).flatMap((k) => k.hairCaps ?? [])) : null;
    return { base: b, caps: caps.filter((c) => !worn || worn.has(c.id)) };
  }).filter((h) => h.caps.length);

  const shared = Object.fromEntries(Object.entries(raw).filter(([k]) => !['bases', 'heads', 'garments', 'pieces', 'gear'].includes(k)));
  return { bases, heads, garments, pieces: pieces.filter((p) => !own(p)), ownGlb: owned, pieceUse, hairCapBases, shared };
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

/** The outfits a garment part serves on a base (empty for kit-listed or default garments). */
const garmentOutfits = (g, b) => (g.outfits ?? []).filter((o) => g.outfitBases?.[o.id]?.includes(b));

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
  const gearIds = (b) => nk.pieces.filter((p) => !nk.pieceUse || nk.pieceUse[b]?.has(p.id)).map((p) => idOf('gear', b, p.id));
  // an own-GLB piece is built on the body of the base whose kinds use it (the shield: broad, gear/pieces.py SHIELD_BASE);
  // a kit without kinds falls back to OWN_GLB_BASE
  const ownGlbBases = (p) => {
    const used = nk.pieceUse ? baseIds.filter((b) => nk.pieceUse[b]?.has(p.id)) : [];
    const fb = p.base ?? OWN_GLB_BASE[p.id];
    return used.length ? used : fb && baseIds.includes(fb) ? [fb] : [];
  };
  const capsOf = (b) => nk.hairCapBases.filter((h) => h.base === b).map((h) => idOf('haircaps', h.base));
  // heads (G1h): the base entry (macro, refHeight) shapes every head; the job writing a base's envelope + eye block is
  // its hair-cap job, else its single head's job (guardHeadCheck.mjs envelopeJob); the PNGs and envelope are outputs
  const baseEntry = (id) => nk.bases.find((b) => b.id === id);
  const envelopeJob = (b) => (capsOf(b).length ? idOf('haircaps', b) : headsOf(b).length === 1 ? idOf('heads', headsOf(b)[0].id) : null);
  const MAPS = ['albedo', 'normal', 'orm'];
  const envOutputs = (b) => [`heads/${b}/envelope.json`, ...MAPS.map((m) => `heads/guard-${b}-eyes-${m}.png`)];
  const envNeeds = (b, p) => (ENVELOPE_FIT.has(p.fit) && envelopeJob(b) ? [envelopeJob(b)] : []);
  const out = {
    // the joints come from the game's TypeScript (proportions, the rig layout, the clavicle point): those files join the hash
    prep: () => [make('prep', {
      // (only what the joints read: a base's mounts, kinds or face tiles never rebuild the joints)
      runner: 'node', script: PREP_SCRIPT, args: common('prep'), files: PREP_FILES,
      kit: { bases: nk.bases.map((b) => ({ id: b.id, refHeight: b.refHeight, build: b.build })) },
      outputs: [...baseIds.map((b) => `joints/guard-${b}.json`), 'mpfb2/3dobjs/base.obj', 'prep/prep.json'],
    })],
    bodies: () => nk.bases.map((b) => make(idOf('bodies', b.id), {
      script: BODY_SCRIPT, args: [...common(idOf('bodies', b.id)), '--base', b.id], tags: [b.id], needs: ['prep'],
      kit: slice(nk, b), outputs: [`bodies/guard-${b.id}-body.blend`, `bodies/guard-${b.id}-body.json`],
    })),
    heads: () => nk.heads.map((h) => make(idOf('heads', h.id), {
      script: 'build_head.py', args: [...common(idOf('heads', h.id)), '--base', h.base, '--head', h.id], tags: [h.id, h.base],
      needs: ['prep'], kit: { ...slice(nk, h), base: baseEntry(h.base) },
      outputs: [`heads/guard-${h.id}-head.blend`, `heads/guard-${h.id}-head.json`, ...MAPS.map((m) => `heads/guard-${h.id}-face-${m}.png`),
        ...(envelopeJob(h.base) === idOf('heads', h.id) ? envOutputs(h.base) : [])],
    })),
    garments: () => nk.bases.flatMap((b) => garmentsOf(b.id).map((g) => make(idOf('garments', b.id, g.id), {
      script: g.script ?? `garments/${g.id}.py`, args: [...common(idOf('garments', b.id, g.id)), '--base', b.id, '--garment', g.id, ...(g.variant ? ['--variant', g.variant] : [])],
      needs: [idOf('bodies', b.id)], tags: [b.id, g.id, ...garmentOutfits(g, b.id).map((o) => o.id)], kit: { ...slice(nk, { ...g, outfits: garmentOutfits(g, b.id), outfitBases: undefined }), base: b },
      outputs: [`garments/guard-${b.id}-${g.id}.blend`, `garments/guard-${b.id}-${g.id}.json`],
    }))),
    gear: () => [
      ...nk.bases.flatMap((b) => nk.pieces.map((p) => make(idOf('gear', b.id, p.id), {
        script: p.script ?? 'build_gear.py', args: [...common(idOf('gear', b.id, p.id)), '--base', b.id, '--piece', p.id],
        tags: [b.id, p.id], kit: { ...slice(nk, p), base: b },
        outputs: [`gear/guard-${b.id}-${p.id}.blend`, `gear/guard-${b.id}-${p.id}.json`], needs: [idOf('bodies', b.id), ...envNeeds(b.id, p)],
      }))),
      ...nk.ownGlb.map((p) => make(idOf('gear', p.id), {
        script: p.script ?? 'build_gear.py', args: [...common(idOf('gear', p.id)), '--piece', p.id], tags: [p.id],
        kit: slice(nk, p), outputs: [`gear/guard-${p.id}.blend`, `gear/guard-${p.id}.json`], needs: ownGlbBases(p).map((b) => idOf('bodies', b)),
      })),
    ],
    // G4: a node job per base / own-GLB piece (guard-lods.mjs: the atlas layout, Blender bake_lods.py --guard, KTX2,
    // the measured report); the hash takes the base, its heads, every piece it uses and the shared sections (g4Slice)
    lods: () => [
      ...nk.bases.map((b) => make(idOf('lods', b.id), {
        runner: 'node', script: LODS_SCRIPT, files: LODS_FILES, args: [...common(idOf('lods', b.id)), '--base', b.id],
        needs: [idOf('bodies', b.id), ...headsOf(b.id).map((h) => idOf('heads', h.id)), ...capsOf(b.id), ...garmentsOf(b.id).map((g) => idOf('garments', b.id, g.id)), ...gearIds(b.id)],
        tags: [b.id], kit: g4Slice(nk, b.id),
        outputs: [0, 1, 2].map((n) => `lods/guard-${b.id}-lod${n}.glb`).concat(`lods/guard-${b.id}.report.json`, `lods/guard-${b.id}.json`),
      })),
      // the shield is skinned on the rig of the base whose kinds carry it (G3 builds it in that bind pose)
      ...nk.ownGlb.map((p) => make(idOf('lods', p.id), {
        runner: 'node', script: LODS_SCRIPT, files: LODS_FILES, args: [...common(idOf('lods', p.id)), '--piece', p.id],
        needs: [idOf('gear', p.id), ...ownBase(kit, p.id).map((b) => idOf('bodies', b))], tags: [p.id], kit: slice(nk, p),
        outputs: [0, 1, 2].map((n) => `lods/guard-${p.id}-lod${n}.glb`).concat(`lods/guard-${p.id}.report.json`),
      })),
    ],
    check: () => [
      ...nk.bases.map((b) => make(idOf('check', b.id), {
        runner: 'node', script: CHECK_SCRIPT, files: CHECK_FILES, args: [...common(idOf('check', b.id)), '--base', b.id], needs: [idOf('lods', b.id)],
        tags: [b.id], kit: g4Slice(nk, b.id), outputs: [`check/guard-${b.id}.check.report.json`],
      })),
      ...nk.ownGlb.map((p) => make(idOf('check', p.id), {
        runner: 'node', script: CHECK_SCRIPT, files: CHECK_FILES, args: [...common(idOf('check', p.id)), '--piece', p.id], needs: [idOf('lods', p.id)],
        tags: [p.id], kit: slice(nk, p), outputs: [`check/guard-${p.id}.check.report.json`],
      })),
    ],
    // the review sheet is a Playwright run, not a Blender one: GPU page, own port, runs alone as the last step
    // (G4s: guard-sheet.mjs; the driver's `--out <bake dir>` is its input, the PNG goes to <out>/sheet/guard-sheet.png)
    sheet: () => [make('sheet', {
      runner: 'node', script: SHEET_SCRIPT, args: common('sheet'), gpuBound: true,
      env: { E2E_GPU: '1', E2E_PORT: '4189' }, needs: [...baseIds.map((b) => idOf('check', b)), ...nk.ownGlb.map((p) => idOf('check', p.id))],
      kit: { shared: nk.shared, bases: baseIds, heads: nk.heads.map((h) => h.id) },
      outputs: ['sheet/guard-sheet.png'], files: SHEET_FILES,
    })],
  }[stage]();
  // hair caps: one job per base whose kinds wear a cap with a mesh (heads stage, Cycles); lods-<base> needs it
  if (stage === 'heads') {
    for (const { base, caps } of nk.hairCapBases) {
      const id = idOf('haircaps', base);
      out.push(make(id, {
        script: 'build_head.py', args: [...common(id), '--haircaps', '--base', base], tags: [base, 'haircaps'],
        needs: ['prep'], kit: { ...slice(nk, { base, caps, heads: headsOf(base) }), base: baseEntry(base) },
        outputs: [`heads/guard-${base}-haircaps.blend`, `heads/guard-${base}-haircaps.json`,
          ...caps.flatMap((c) => MAPS.map((m) => `heads/guard-${base}-cap-${c.id}-${m}.png`)), ...envOutputs(base)],
      }));
    }
  }
  // gear: only the pieces a base's kinds use (and the own-GLB pieces once)
  const jobs = stage === 'gear' ? out.filter((j) => j.tags.length === 1 || gearIds(j.tags[0]).includes(j.id)) : out;
  const only = onlyList(opts.only);
  if (!only.length) return jobs;
  const prefix = `${stage}-`;
  return jobs.filter((j) => only.some((o) => o === j.id || o === j.id.slice(prefix.length) || j.tags.includes(o)));
}

/** G4: the lods / check / sheet jobs' scripts and the files their hashes cover (repo-relative). */
export const LODS_SCRIPT = 'scripts/operators/guard-lods.mjs';
export const CHECK_SCRIPT = 'scripts/operators/guard-check.mjs';
export const SHEET_SCRIPT = 'scripts/operators/guard-sheet.mjs';
const G4_JS = ['scripts/operators/guardAtlas.mjs', 'scripts/operators/guardGlb.mjs', 'scripts/operators/guardLodReport.mjs', 'scripts/operators/guardBakePlan.mjs'];
const LODS_FILES = [...G4_JS, 'scripts/operators/ktx2.mjs', 'scripts/operators/blender.mjs',
  ...['bake_lods.py', 'bake_guard.py', 'guard_lod_util.py', 'guard_skin.py', 'materials.py', 'common.py'].map((f) => `${PY_REL}/${f}`)];
const CHECK_FILES = [...G4_JS, 'src/operators/guards/guardBudget.ts', 'src/operators/guards/guardKit.ts', 'src/operators/guards/gearMask.ts'];
// the sheet's own files plus the config that builds its page and the runtime modules the page imports (G4s check P1)
const SHEET_FILES = ['scripts/operators/guard-sheet.mjs', 'scripts/operators/guardSheetPlan.mjs', 'src/operators/lab/guardSheet.ts', 'guards.html',
  'vite.operators.config.ts',
  ...['guardFigure', 'guardFigurePlugin', 'figure', 'lodPick', 'manifest', 'pose'].map((f) => `src/operators/runtime/${f}.ts`),
  ...['guardAssets', 'gearMask', 'guardVariant', 'guardTints'].map((f) => `src/operators/guards/${f}.ts`),
  ...['guardShield', 'guardHelmet', 'helmetDrops', 'enemyDefs', 'factions'].map((f) => `src/ai/${f}.ts`),
  'src/player/characterRig.ts', 'src/vfx/nightVision.ts', 'src/operators/lab/labData.ts'];

/** A base's kit slice for its lods / check hash: its entry, its heads, every piece its kinds use, the shared sections. */
function g4Slice(nk, baseId) {
  const used = nk.pieceUse?.[baseId];
  const all = [...nk.pieces, ...nk.ownGlb]; // outfits come in through the garments (each part carries its outfit pieces)
  return {
    entry: nk.bases.find((b) => b.id === baseId), shared: nk.shared, heads: nk.heads.filter((h) => h.base === baseId),
    pieces: used ? all.filter((p) => used.has(p.id)) : all, garments: nk.garments.filter((g) => !g.bases || g.bases.includes(baseId)),
  };
}

/** The bases whose kinds carry an own-GLB piece (the shield: the enforcer's broad), in kit order. */
function ownBase(kit, pieceId) {
  const kinds = Array.isArray(kit.kinds) ? kit.kinds : [];
  const bases = kinds.filter((k) => KIND_PIECE_LISTS.some((l) => (k[l] ?? []).includes(pieceId))).map((k) => k.base);
  return [...new Set(bases)];
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

/**
 * Outputs the push step ships to bake/guard-models: GLB, KTX2, report JSON, PNG sheets, and each base's runtime data
 * file `lods/guard-<base>.json` (G7 guardAssets.ts `GuardFileData`; never the `.layout.json` / `.bake.json` scratch).
 */
export const SHIPPABLE = /\.(glb|ktx2|png)$|\.report\.json$|^lods\/guard-[a-z]+\.json$/;
export const shippable = (rel) => SHIPPABLE.test(rel);
