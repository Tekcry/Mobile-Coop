// (mocap-trial) Writes one generated section of docs/mocap-trial/TAKES.md between `<!-- mocap:<name> -->` markers,
// so analyze.mjs, retarget.mjs and emit.mjs each own their part of the file. (mixamo-retarget M3) `file` points the
// same writer at another generated doc (docs/mixamo-retarget/CLIPS.md); the default is TAKES.md as before.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './asfamc.mjs';

export const TAKES_MD = path.join(ROOT, 'docs', 'mocap-trial', 'TAKES.md');

export function writeSection(name, body, file = TAKES_MD) {
  const open = `<!-- mocap:${name} -->`, close = `<!-- /mocap:${name} -->`;
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const block = `${open}\n${body.trim()}\n${close}`;
  const a = text.indexOf(open), b = text.indexOf(close);
  const out = a >= 0 && b > a ? text.slice(0, a) + block + text.slice(b + close.length) : `${text.trimEnd()}\n\n${block}\n`;
  writeFileSync(file, out.endsWith('\n') ? out : out + '\n');
}
