// (mocap-trial) Writes one generated section of docs/mocap-trial/TAKES.md between `<!-- mocap:<name> -->` markers,
// so analyze.mjs, retarget.mjs and emit.mjs each own their part of the file.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './asfamc.mjs';

export const TAKES_MD = path.join(ROOT, 'docs', 'mocap-trial', 'TAKES.md');

export function writeSection(name, body) {
  const open = `<!-- mocap:${name} -->`, close = `<!-- /mocap:${name} -->`;
  const text = existsSync(TAKES_MD) ? readFileSync(TAKES_MD, 'utf8') : '';
  const block = `${open}\n${body.trim()}\n${close}`;
  const a = text.indexOf(open), b = text.indexOf(close);
  const out = a >= 0 && b > a ? text.slice(0, a) + block + text.slice(b + close.length) : `${text.trimEnd()}\n\n${block}\n`;
  writeFileSync(TAKES_MD, out.endsWith('\n') ? out : out + '\n');
}
