// Builds questions-v2.json: follow-ups first, then the original list with rewrites, then the review-list expansions.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const S = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (f) => JSON.parse(readFileSync(S + f, 'utf8'));
const base = read('questions.json');
const fu = read('followups.json');
const exp = existsSync(S + 'expansions.json') ? read('expansions.json') : [];

const drop = new Set(['STORY-02']); // replaced by FU-02
const rewrite = {
  'WEAP-11': {
    q: "Wren's model shows two rifle magazines and a medkit pouch. If carried medkits go (FU-06), what should her kit show?",
    ctx: 'Was about 2-3 carried medkits; follows CTRL-06 and FU-06 [AR, A58].',
    opts: [
      { label: 'Fixed look, no medkit', desc: 'Kit look fixed whatever gun you pick; no medkit pouch' },
      { label: 'Changes with loadout', desc: 'Magazine pouches change with the gun you pick' },
    ],
  },
  'WEAP-12': {
    q: 'Approve as written: original gun names on the old internal ids, suppressors on every gun except shotguns and the crossbow, and the campaign rifle always suppressed?',
    ctx: 'Medkit rules removed from this question: see FU-06 [A59-A62].',
  },
  'PROC-12': {
    q: 'You chose to delete the retired maps. Their design documents and the Blacklist-era documents: archive or delete?',
    ctx: 'Follows LEVEL-07. Their tests go with the map code [PL, V, LV].',
    opts: [
      { label: 'Archive the docs', desc: 'Docs and map data move to the archive folder; their tests are deleted with the code' },
      { label: 'Delete the docs too', desc: 'Nothing kept; git history still has them' },
    ],
  },
  'TRAIN-01': {
    ctx: 'Fallow is two-player only. Depends on FU-01 (can one person play the campaign alone).',
  },
  'UI-05': {
    q: 'In the redesigned co-op lobby (two players maximum), how is the training course chosen?',
  },
};

const out = [...fu];
for (const q of base) {
  if (drop.has(q.id)) continue;
  out.push({ ...q, ...(rewrite[q.id] ?? {}) });
}
out.push(...exp);
const ids = new Set();
for (const q of out) {
  if (ids.has(q.id)) throw new Error('dup ' + q.id);
  ids.add(q.id);
  if (q.opts.length < 2 || q.opts.length > 4) throw new Error('opts ' + q.id);
  for (const o of q.opts) if (o.label.split(/\s+/).length > 5) throw new Error('label ' + q.id + ' ' + o.label);
  if (/—/.test(JSON.stringify(q))) throw new Error('em dash ' + q.id);
}
writeFileSync(S + 'questions-v2.json', JSON.stringify(out, null, 1));
const t = readFileSync(S + 'page-template.html', 'utf8');
writeFileSync(S + 'night-shift-vision-check.html', t.replace('/*QUESTIONS*/[]', JSON.stringify(out).replace(/</g, '\\u003c')));
console.log(out.length, 'questions;', fu.length, 'follow-ups;', exp.length, 'review items');
