// Map Steam clips and screenshots to capture-checklist codes by time.
// Media recorded just before an item was ticked belongs to that item: each media file goes to the first item
// ticked at or after its timestamp (ties share). Clip folder names are UTC; screenshot names are local time (UTC+11).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'C:/NightShift/Mobile-Coop-locomotion/pc';
const ck = join(ROOT, 'ct-work/checklist/captures');
const items = readdirSync(ck).map((f) => ({ f, d: JSON.parse(readFileSync(join(ck, f), 'utf8')) })).map(({ f, d }) => ({
  code: f.replace(/\.json$/, ''), status: d.data?.status ?? d.status, note: d.data?.note ?? d.note ?? '',
  t: Date.parse(d.data?.updatedAt ?? d.updatedAt),
}));
for (const it of items) if (!it.code) throw new Error('item without id: ' + JSON.stringify(it));
items.sort((a, b) => a.t - b.t);
const ref = join(ROOT, 'ct-ref');
const media = [];
for (const f of readdirSync(ref)) {
  let m;
  if ((m = /^clip_13570_(\d{8})_(\d{6})$/.exec(f))) {
    const t = Date.parse(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6)}T${m[2].slice(0, 2)}:${m[2].slice(2, 4)}:${m[2].slice(4)}Z`);
    media.push({ kind: 'clip', file: `ct-work/clips/${f}.mp4`, t });
  } else if ((m = /^(?:13570_)?(\d{14})_\d+\.(jpg|png)$/.exec(f))) {
    const s = m[1];
    const t = Date.parse(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12)}+11:00`);
    media.push({ kind: m[2] === 'png' ? 'png' : 'jpg', file: `ct-ref/${f}`, t });
  }
}
media.sort((a, b) => a.t - b.t);
const byCode = new Map(items.map((i) => [i.code, { ...i, media: [] }]));
const unassigned = [];
for (const md of media) {
  const it = items.find((i) => i.t >= md.t - 5000);
  if (it) byCode.get(it.code).media.push(md); else unassigned.push(md);
}
const iso = (t) => new Date(t).toISOString().slice(11, 19);
let out = '# CT footage index (auto-mapped by time; verify visually)\n\nTimes UTC. Media goes to the first item ticked at or after it.\n\n';
for (const it of items) {
  const b = byCode.get(it.code);
  out += `## ${it.code} (${it.status}, ticked ${iso(it.t)})${it.note ? ' - note: ' + it.note : ''}\n`;
  for (const md of b.media) out += `- ${md.kind} ${iso(md.t)} ${md.file}\n`;
  if (!b.media.length) out += '- (none)\n';
  out += '\n';
}
out += '## Unassigned (after the last tick)\n' + (unassigned.map((m) => `- ${m.kind} ${iso(m.t)} ${m.file}`).join('\n') || '- (none)') + '\n';
writeFileSync(join(ROOT, 'ct-work/index.md'), out);
console.log(`items ${items.length}, media ${media.length}, unassigned ${unassigned.length}`);
