// (tuner-v2 item 4) Bake the animation tuner's per-key edits (the Keys section) into the key files.
//   node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/apply-tune.mjs <anim-tune-YYYY-MM-DD.json> [--out <dir>]
// Reads the panel's Export file (or a saved snapshot), adds each `key.<clip>.<key>` delta to that key's fields and
// writes scripts/anim-keys/keys/<clip>.json (or <dir>/<clip>.json), one file per edited clip, then prints the build
// command that bakes each clip into src/anim/clips/keyed/<clip>.ts. docs/tuner-v2/ITEM4.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { applyKeyEdits, editedClips, keyFileText, keyValuesOf } from '../../src/anim/tuneKeysFile.ts';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const oi = args.indexOf('--out');
if (!file) {
  console.error('usage: apply-tune.mjs <anim-tune export .json> [--out <dir>]');
  process.exit(1);
}
const KEYS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'keys');
const out = oi >= 0 && args[oi + 1] ? path.resolve(args[oi + 1]) : KEYS;
mkdirSync(out, { recursive: true });
const values = keyValuesOf(JSON.parse(readFileSync(file, 'utf8')));
const clips = editedClips(values);
if (clips.length === 0) console.log('apply-tune: no per-key edits in', file);
for (const clip of clips) {
  const base = JSON.parse(readFileSync(path.join(KEYS, `${clip}.json`), 'utf8'));
  const dest = path.join(out, `${clip}.json`);
  writeFileSync(dest, keyFileText(applyKeyEdits(base, values)));
  console.log(`apply-tune: ${clip} -> ${dest}\n  bake: node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs ${clip}`);
}
