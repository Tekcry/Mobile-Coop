// (marlow-bays item 23) Regenerate src/anim/tuneKeysMeta.ts from scripts/anim-keys/keys/*.json: each keyed clip's
// frames, mirror flag and own key phases (the tuner's Keys section and the key timeline read it). Run it after a key
// file's keys or their phases change (apply-tune.mjs runs it after writing in place):
//   node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/meta.mjs [--check]
// --check: exit 1 when the file on disk differs (nothing written). Byte-identical output for unchanged key files.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { keyMetaText } from '../../src/anim/tuneKeysFile.ts';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const KEYS = path.join(HERE, 'keys');
const META = path.join(HERE, '..', '..', 'src', 'anim', 'tuneKeysMeta.ts');

/** The meta file's text for the key files in `dir`. */
export function metaText(dir = KEYS) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
  return keyMetaText(files);
}

/** Write the meta file (CRLF kept when the file on disk has it). True: it changed. */
export function writeMeta(dir = KEYS) {
  const old = readFileSync(META, 'utf8');
  let t = metaText(dir);
  if (old.includes('\r\n')) t = t.replace(/\n/g, '\r\n');
  if (t === old) return false;
  writeFileSync(META, t);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(HERE, 'meta.mjs')) {
  if (process.argv.includes('--check')) {
    const same = readFileSync(META, 'utf8').replace(/\r\n/g, '\n') === metaText();
    console.log(same ? 'anim-keys meta: up to date' : 'anim-keys meta: stale (run scripts/anim-keys/meta.mjs)');
    process.exit(same ? 0 : 1);
  }
  console.log(writeMeta() ? `anim-keys meta: ${path.relative(process.cwd(), META)} written` : 'anim-keys meta: unchanged');
}
