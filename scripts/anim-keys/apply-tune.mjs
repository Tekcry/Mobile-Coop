// (tuner-v2 item 4) Bake the animation tuner's per-key edits (the Keys section) into the key files.
//   node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/apply-tune.mjs <anim-tune-YYYY-MM-DD.json> [--out <dir>]
// Reads the panel's Export file (or a saved snapshot), adds each `key.<clip>.<key>` delta to that key's fields and
// writes scripts/anim-keys/keys/<clip>.json (or <dir>/<clip>.json), one file per edited clip, then prints the build
// command that bakes each clip into src/anim/clips/keyed/<clip>.ts. docs/archive/tuner-v2/ITEM4.md.
// Writing in place refuses a key file that already differs from git HEAD (a second run would add the edits twice);
// --force overrides. After baking, reset the Keys section before the next export.
// (marlow-bays item 23) A key's timing edit moves its `phase`; written in place, src/anim/tuneKeysMeta.ts is
// regenerated (meta.mjs) so the tuner reads the new key times.
// (marlow-bays item 25) An added key (`key.<clip>.a<s>`) or a deleted key (`del`) rewrites the key list (phase order);
// the meta is regenerated the same way.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { applyKeyEdits, editedClips, keyFileText, keyValuesOf } from '../../src/anim/tuneKeysFile.ts';
import { writeMeta } from './meta.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const oi = args.indexOf('--out');
if (!file) {
  console.error('usage: apply-tune.mjs <anim-tune export .json> [--out <dir>] [--force]');
  process.exit(1);
}
const KEYS = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'keys');
const out = oi >= 0 && args[oi + 1] ? path.resolve(args[oi + 1]) : KEYS;
const force = args.includes('--force');
/** True when the key file has uncommitted changes (it was already applied in place, or edited by hand). */
const dirty = (p) => {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', p], { stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
};
mkdirSync(out, { recursive: true });
const values = keyValuesOf(JSON.parse(readFileSync(file, 'utf8')));
const clips = editedClips(values);
if (clips.length === 0) console.log('apply-tune: no per-key edits in', file);
let inPlace = false;
for (const clip of clips) {
  const base = JSON.parse(readFileSync(path.join(KEYS, `${clip}.json`), 'utf8'));
  const dest = path.join(out, `${clip}.json`);
  if (dest === path.join(KEYS, `${clip}.json`) && !force && dirty(dest)) {
    console.error(`apply-tune: ${dest} already differs from git HEAD (applied before?); commit or restore it, or pass --force`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(dest, keyFileText(applyKeyEdits(base, values)));
  if (dest === path.join(KEYS, `${clip}.json`)) inPlace = true;
  console.log(`apply-tune: ${clip} -> ${dest}\n  bake: node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs ${clip}`);
}
if (inPlace && writeMeta()) console.log('apply-tune: src/anim/tuneKeysMeta.ts regenerated (the key times or counts changed)');
