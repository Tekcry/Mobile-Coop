// Resolve CHANGELOG conflicts: incoming (theirs) block first, then ours, blank line between.
import fs from 'node:fs';
const f = process.argv[2];
const out = []; let mode = 0, ours = [], theirs = [];
for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
  if (l.startsWith('<<<<<<<')) { mode = 1; ours = []; theirs = []; continue; }
  if (mode === 1 && l.startsWith('=======')) { mode = 2; continue; }
  if (mode === 2 && l.startsWith('>>>>>>>')) {
    const t = theirs.slice(); while (t.length && t[t.length - 1] === '') t.pop();
    out.push(...t, '', ...ours); mode = 0; continue;
  }
  (mode === 1 ? ours : mode === 2 ? theirs : out).push(l);
}
fs.writeFileSync(f, out.join('\n'));
