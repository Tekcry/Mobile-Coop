// (mixamo-retarget I9 fix round, BATCH2-PLAN I8) Batch 2's Mixamo captures load lazily: off the entry chunk until the
// Test Chamber opens, then all 113 (piano-knife S2: with the 5 knife kill clips; the intro's breathing idle went with the piano scene) join the loop list's motion-capture group
// in table order.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EAGER_MIXAMO_FILES, CHAMBER_ENTRIES, captureClip, loadChamberCaptures, chamberCapturesLoaded, chamberEntry, whenChamberCaptures } from '../src/anim/chamber';
import { MOCAP_SOURCE_NAMES, mocapSource } from '../src/anim/mocapSources';

const DIR = 'src/anim/clips/mixamo';
const tsIn = (d: string) => readdirSync(d).filter((f) => f.endsWith('.ts'));
/** './clips/mixamo/chamber/aa_idle.ts' -> 'mocap_aa_idle' (the clip's name in its module). */
const nameOf = (p: string) => `mocap_${path.basename(p, '.ts')}`;
const srcFiles = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? srcFiles(p) : p.endsWith('.ts') ? [p] : [];
  });

describe('mixamo-retarget I9 fix round: lazy batch 2 captures', () => {
  it('before the Chamber opens: the eager captures are listed, none of the lazy ones', () => {
    expect(chamberCapturesLoaded()).toBe(false);
    // batch 1 / I4 / I6 (21 + 17 modules; the game imports them by path): eager and listed
    expect(EAGER_MIXAMO_FILES.length).toBe(38);
    // (the `trav_` modules are channel clips: they play through their prop, not as keyed loops)
    for (const p of EAGER_MIXAMO_FILES.filter((f) => !path.basename(f).startsWith('trav_'))) expect(captureClip(nameOf(p)), p).not.toBeNull();
    expect(chamberEntry('keyed:mocap_walking').id).toBe('keyed:mocap_walking');
    // a batch 2 game slot and a Chamber-only one: not loaded yet
    expect(captureClip('mocap_rifle_walk_forward')).toBeNull();
    expect(captureClip('mocap_aa_idle')).toBeNull();
    // (piano-knife S2) a knife kill clip: lazy too
    expect(captureClip('mocap_stabbing')).toBeNull();
    expect(chamberEntry('keyed:mocap_aa_idle').id).toBe('off');
  });

  it('after the lazy fill: all 113 rows in the motion-capture group, in table order, the eager entries kept', async () => {
    const before = CHAMBER_ENTRIES.length;
    const walking = chamberEntry('keyed:mocap_walking');
    const p = loadChamberCaptures();
    expect(loadChamberCaptures()).toBe(p); // once
    await p;
    expect(chamberCapturesLoaded()).toBe(true);
    const { LAZY_CAPTURE_FILES } = await import('../src/anim/chamberCapturesLazy');
    expect(LAZY_CAPTURE_FILES.length).toBe(113);
    expect(LAZY_CAPTURE_FILES.filter((f) => f.includes('/chamber/')).length).toBe(84);
    expect(LAZY_CAPTURE_FILES.filter((f) => f.includes('/knife/')).length).toBe(5);
    expect(captureClip('mocap_stabbing')).not.toBeNull();
    for (const f of LAZY_CAPTURE_FILES) {
      const name = nameOf(f);
      const e = chamberEntry(`keyed:${name}`);
      expect(e.id, f).toBe(`keyed:${name}`);
      expect(e.clip).toBe(captureClip(name));
      expect(e.label.startsWith('motion capture (Mixamo): ')).toBe(true);
    }
    expect(CHAMBER_ENTRIES.length).toBe(before + 113);
    expect(chamberEntry('keyed:mocap_walking')).toBe(walking);
    // every keyed Mixamo row of mocapSources.ts now has its loop, the group in the table's order and contiguous
    const caps = CHAMBER_ENTRIES.filter((e) => e.label.startsWith('motion capture'));
    const keyedRows = MOCAP_SOURCE_NAMES.filter((n) => mocapSource(n)!.chamber.kind === 'keyed');
    expect(caps.filter((e) => e.kind === 'keyed').map((e) => e.clip!.name)).toEqual(keyedRows);
    const ids = CHAMBER_ENTRIES.map((e) => e.id);
    const first = ids.indexOf(caps[0]!.id);
    expect(ids.slice(first, first + caps.length)).toEqual(caps.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('(I9 polish) a refill asked for after the captures landed still runs, once', async () => {
    let refills = 0;
    let fails = 0;
    const before = CHAMBER_ENTRIES.length;
    await whenChamberCaptures(() => refills++, () => fails++);
    expect([refills, fails]).toEqual([1, 0]);
    // each caller gets its own refill (the panel's capWait keeps it to one per panel)
    await whenChamberCaptures(() => refills++, () => fails++);
    expect([refills, fails]).toEqual([2, 0]);
    // no second splice
    expect(CHAMBER_ENTRIES.length).toBe(before);
  });

  it('the eager and lazy sets split clips/mixamo; no game code names a lazy module', async () => {
    const { LAZY_CAPTURE_FILES } = await import('../src/anim/chamberCapturesLazy');
    const all = [...tsIn(DIR).map((f) => `./clips/mixamo/${f}`), ...['chamber', 'knife'].flatMap((d) => tsIn(`${DIR}/${d}`).map((f) => `./clips/mixamo/${d}/${f}`))].sort();
    expect([...EAGER_MIXAMO_FILES, ...LAZY_CAPTURE_FILES].sort()).toEqual(all);
    expect(EAGER_MIXAMO_FILES.filter((f) => LAZY_CAPTURE_FILES.includes(f))).toEqual([]);
    // a static import of a lazy module would pull it back into the entry chunk (piano-knife S2: a dynamic `import('...')`,
    // as `knifeKill.ts` `loadClip`, keeps it off the entry chunk and is allowed)
    const lazyPaths = LAZY_CAPTURE_FILES.map((f) => f.slice(2, -3));
    for (const file of srcFiles('src')) {
      const n = file.replace(/\\/g, '/');
      if (n.startsWith('src/anim/clips/') || n === 'src/anim/chamberCapturesLazy.ts') continue;
      const text = readFileSync(file, 'utf8');
      for (const lp of lazyPaths) expect(text.replaceAll(`${lp}')`, '').includes(`${lp}'`), `${n} names ${lp}`).toBe(false);
    }
  });
});
