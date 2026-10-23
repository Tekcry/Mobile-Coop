import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import raw from '../scripts/operators/data/guards.json';
import enemies from '../src/config/enemies.json';
import { RIG_JOINTS } from '../src/operators/runtime/pose';
import { bufferTris, GUARD_KINDS, GUARD_LIMITS, shownTris, validateGuardKit, type GuardKit } from '../src/operators/guards/guardKit';

const KIT = raw as unknown as GuardKit;
const copy = (): GuardKit => structuredClone(KIT);
const kind = (k: GuardKit, id: string) => k.kinds.find((x) => x.id === id)!;

describe('guard kit data (guard-models G0)', () => {
  it('the real data validates with no problems', () => {
    expect(validateGuardKit(KIT)).toEqual([]);
  });

  it('kinds match enemies.json (strings, heights) and the dog is left out', () => {
    const defs = enemies as Record<string, { height: number }>;
    expect(Object.keys(defs).filter((k) => k !== 'dog').sort()).toEqual([...GUARD_KINDS].sort());
    for (const k of KIT.kinds) expect(k.height).toBe(defs[k.id]!.height);
  });

  it('rig bones are the runtime RIG_JOINTS, plus 10 fingers (33 at LOD0)', () => {
    expect(KIT.bones.rig).toEqual([...RIG_JOINTS]);
    expect(KIT.bones.rig.length + KIT.bones.fingers.length).toBe(33);
  });

  it('every face target is listed in mpfb2-files.txt', () => {
    const listed = new Set(readFileSync('scripts/operators/data/mpfb2-files.txt', 'utf8').split(/\r?\n/));
    const missing = KIT.heads.flatMap((h) => Object.keys(h.targets)).filter((p) => !listed.has(p));
    expect(missing).toEqual([]);
  });

  it('shown and buffer totals stay inside PLAN section 5', () => {
    for (const k of KIT.kinds) expect(shownTris(KIT, k, 0)).toBeLessThanOrEqual(GUARD_LIMITS.shown[0]);
    for (const b of KIT.bases) expect(bufferTris(KIT, b.id, 0)).toBeLessThanOrEqual(GUARD_LIMITS.buffer[0]);
  });

  it('a dangling id reference is reported', () => {
    const k = copy();
    kind(k, 'grunt').headwear = ['cap', 'tophat'];
    expect(validateGuardKit(k)).toContain('kind grunt: unknown headwear tophat');
  });

  it('a kind over the LOD0 shown budget is reported', () => {
    const k = copy();
    k.pieces.find((p) => p.id === 'uniform')!.tris = [9000, 1800, 700];
    const errs = validateGuardKit(k);
    expect(errs.some((e) => /^kind grunt: LOD0 shown \d+ tris over 20000$/.test(e))).toBe(true);
  });

  it('a base buffer over 45000 is reported', () => {
    const k = copy();
    // lean holds work + uniform_rolled + 4 heads + 5 caps (39,250 at LOD0); a 6,000-tri heavier work outfit tips it over.
    k.pieces.find((p) => p.id === 'work')!.tris = [11000, 1700, 650];
    expect(validateGuardKit(k).some((e) => /^base lean: LOD0 buffer \d+ tris over 45000$/.test(e))).toBe(true);
  });

  it('a missing kind, a wrong head count and a duplicate id are reported', () => {
    const k = copy();
    k.kinds = k.kinds.filter((x) => x.id !== 'sniper');
    k.bases.find((b) => b.id === 'lean')!.kinds = ['runner'];
    k.heads = k.heads.filter((h) => h.id !== 'average-4');
    k.bases.find((b) => b.id === 'average')!.faceTiles = ['average-1', 'average-2', 'average-3'];
    for (const id of ['grunt', 'droneOp', 'officer']) kind(k, id).heads = ['average-1', 'average-2', 'average-3'];
    k.pieces.push({ ...k.pieces.find((p) => p.id === 'radio')! });
    const errs = validateGuardKit(k);
    expect(errs).toContain('kind sniper: missing');
    expect(errs).toContain('base average: 3 head variants, need 4');
    expect(errs).toContain('piece radio: duplicate id');
  });

  it('a cranium-changing head target is refused', () => {
    const k = copy();
    k.heads[0]!.targets['targets/head/head-square.target.gz'] = 0.4;
    expect(validateGuardKit(k).some((e) => e.startsWith('head average-1: target targets/head/head-square.target.gz is not a face-region target'))).toBe(true);
  });
});
