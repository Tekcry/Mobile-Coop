// (anim-bake) Bake an animation tuner export into the code defaults, so the tune becomes the default and every baked
// slider reads identity again once it is reset in the tuner.
//   node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json> [--dry-run] [--only section,...] [--allow-shared]
// --dry-run prints the diff and the table and writes nothing. A real run writes the source files, the Keys section's key
// JSONs (the apply-tune functions) and the ledger src/anim/tuneBakeLog.json, then prints the rebake commands (it never
// runs Blender) and the table. Sections: body, gun, cam, speed, joint, hand, ik, weapon, step, keys, weight.
// The mapping is src/anim/tuneBakeTable.ts, the logic src/anim/tuneBake.ts; docs/anim-tuner/BAKE.md.
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: node scripts/anim-tune-bake.mjs <anim-tune export .json> [--dry-run] [--only section,...] [--allow-shared]';

const args = process.argv.slice(2);
let file = '';
let dry = false;
let allowShared = false;
let only = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--dry-run') dry = true;
  else if (a === '--allow-shared') allowShared = true;
  else if (a === '--only' || a.startsWith('--only=')) {
    only = (a === '--only' ? (args[++i] ?? '') : a.slice(7)).split(',').map((s) => s.trim()).filter(Boolean);
    if (only.length === 0) {
      console.error(`anim-tune-bake: --only needs a list of sections\n${USAGE}`);
      process.exit(1);
    }
  }
  else if (a.startsWith('--')) {
    console.error(`anim-tune-bake: unknown option ${a}\n${USAGE}`);
    process.exit(1);
  } else if (!file) file = a;
  else {
    console.error(`anim-tune-bake: one export at a time\n${USAGE}`);
    process.exit(1);
  }
}
if (!file) {
  console.error(USAGE);
  process.exit(1);
}

// the repo's extensionless TypeScript imports (as the operator scripts load them)
await import('./operators/ts-resolve.mjs');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const table = await load('src/anim/tuneBakeTable.ts');
for (const m of table.BAKE_CATALOGUE_MODULES) await load(m);
const { TUNE_SECTIONS } = await load('src/anim/tuneRegistry.ts');
const { WEIGHT_GROUPS, WEIGHT_TUNABLES } = await load('src/anim/weight.ts');
const bake = await load('src/anim/tuneBake.ts');

const SECTIONS = ['body', 'gun', 'cam', 'speed', 'joint', 'hand', 'ik', 'weapon', 'step', 'keys', 'weight'];
for (const s of only) {
  if (!SECTIONS.includes(s)) {
    console.error(`anim-tune-bake: unknown section ${s} (${SECTIONS.join(', ')})`);
    process.exit(1);
  }
}

const cat = bake.bakeCatalogue([
  ...TUNE_SECTIONS.filter((s) => s.id !== 'keys'),
  { id: 'weight', tunables: WEIGHT_TUNABLES.map((t) => ({ ...t, groups: WEIGHT_GROUPS })) },
  ...table.DECLARED_SECTIONS,
]);

let data;
try {
  data = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
} catch (err) {
  console.error(`anim-tune-bake: cannot read ${file}: ${err.message}`);
  process.exit(1);
}

/** A repo-relative path inside the repo and under a write root, or null. */
const inside = (rel) => {
  if (!bake.bakeWritable(rel)) return null;
  const abs = path.resolve(ROOT, rel);
  return abs.startsWith(ROOT + path.sep) ? abs : null;
};
const read = (rel) => {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) || !existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
};

const res = bake.tuneBake(data, cat, read, { only, allowShared, now: new Date() });
if (!res.ok) {
  console.error(`anim-tune-bake: refused, nothing written: ${res.error}`);
  process.exit(1);
}

if (dry) {
  console.log(res.diff || '(no file changes)');
} else {
  for (const w of res.writes) {
    const abs = inside(w.path);
    if (!abs) {
      console.error(`anim-tune-bake: refused to write ${w.path} (outside the write roots)`);
      process.exit(1);
    }
  }
  // every file to a .tmp first, then the renames: an IO error while writing leaves the tree as it was
  const tmps = [];
  try {
    for (const w of res.writes) {
      const t = `${inside(w.path)}.anim-bake.tmp`;
      writeFileSync(t, w.after);
      tmps.push(t);
    }
  } catch (err) {
    for (const t of tmps) rmSync(t, { force: true });
    console.error(`anim-tune-bake: refused, nothing written: ${err.message}`);
    process.exit(1);
  }
  for (const w of res.writes) {
    renameSync(`${inside(w.path)}.anim-bake.tmp`, inside(w.path));
    console.log(`anim-tune-bake: wrote ${w.path}`);
  }
}

console.log('');
console.log(res.rows.length ? bake.bakeTable(res.rows) : 'anim-tune-bake: no changed values in the export (nothing to bake)');
for (const w of res.warnings) console.log(`WARNING: ${w}`);
if (res.rebake.length) {
  console.log(`\nKey clips ${dry ? 'to rebake after the real run' : 'to rebake (Blender, headless; this script does not run it)'}:`);
  for (const c of res.rebake) console.log(`  ${c}`);
}
console.log(`\n${dry ? 'dry run: nothing written. ' : ''}${res.baked} baked, ${res.manual} manual or skipped, ${res.writes.length} file(s) ${dry ? 'would change' : 'written'}.`);
if (!dry && res.baked) console.log('Next: in the tuner reset the sliders reported "baked" (keep the manual ones), then export again; the old export is now spent (a re-run of it is a no-op).');
