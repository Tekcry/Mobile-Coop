import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import raw from '../scripts/operators/data/guards.json';
import enemies from '../src/config/enemies.json';
import { RIG_JOINTS } from '../src/operators/runtime/pose';
import { bufferTris, GUARD_BASES, GUARD_CONTRACT, GUARD_KINDS, GUARD_LIMITS, HEADS_PER_BASE, shownTris, validateGuardKit, type GuardKit } from '../src/operators/guards/guardKit';

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

  it('PLAN section 5 limits: the numbers the checks enforce', () => {
    expect(GUARD_LIMITS.shown).toEqual([20000, 7000, 2800]);
    expect(GUARD_LIMITS.buffer).toEqual([45000, 14000, 5000]);
    expect(GUARD_LIMITS.head).toEqual([4000, 1200, 400]);
    expect(GUARD_LIMITS.eyesLod0).toBe(500);
    expect([GUARD_LIMITS.hairCapLod0, GUARD_LIMITS.hairCapLod1]).toEqual([1000, 300]);
    expect(GUARD_LIMITS.rigBones + GUARD_LIMITS.fingerBones).toBe(33);
    expect(GUARD_LIMITS.pieceLod0).toEqual({ headwear: 600, helmet: 1200, vest_soft: 1800, plate_heavy: 2600, shield: 800 });
    expect(KIT.bones.influences).toEqual([4, 4, 2]);
  });

  it('every kind stays inside the shown budget and every base inside the buffer budget at all three LODs', () => {
    for (const lod of [0, 1, 2] as const) {
      for (const k of KIT.kinds) expect(shownTris(KIT, k, lod), `${k.id} LOD${lod}`).toBeLessThanOrEqual(GUARD_LIMITS.shown[lod]);
      for (const b of KIT.bases) expect(bufferTris(KIT, b.id, lod), `${b.id} LOD${lod}`).toBeLessThanOrEqual(GUARD_LIMITS.buffer[lod]);
    }
  });

  it('head, hair cap and piece triangles stay inside their per-piece ceilings', () => {
    for (const lod of [0, 1, 2] as const) for (const h of KIT.heads) expect(h.tris[lod], `${h.id} LOD${lod}`).toBeLessThanOrEqual(GUARD_LIMITS.head[lod]);
    for (const c of KIT.hairCaps) {
      expect(c.tris[0], `${c.id} LOD0`).toBeLessThanOrEqual(GUARD_LIMITS.hairCapLod0);
      expect(c.tris[1], `${c.id} LOD1`).toBeLessThanOrEqual(GUARD_LIMITS.hairCapLod1);
    }
    const L = GUARD_LIMITS.pieceLod0;
    for (const p of KIT.pieces) {
      const ceil = p.kind === 'headwear' ? L.headwear : p.kind === 'shield' ? L.shield : p.id.startsWith('helmet_') ? L.helmet
        : p.id === 'vest_soft' ? L.vest_soft : p.id === 'plate_heavy' ? L.plate_heavy : null;
      if (ceil !== null) expect(p.tris[0], `${p.id} LOD0`).toBeLessThanOrEqual(ceil);
    }
  });

  it('head variants per base are average 4, lean 4, broad 1, and the id lists are the shared contract', () => {
    for (const b of GUARD_BASES) expect(KIT.heads.filter((h) => h.base === b).length, b).toBe(HEADS_PER_BASE[b]);
    expect(KIT.hairCaps.map((c) => c.id).sort()).toEqual([...GUARD_CONTRACT.hairCaps].sort());
    expect(KIT.hairColours.map((c) => String(c.id)).sort()).toEqual([...GUARD_CONTRACT.hairColours].sort());
    expect(KIT.skinTones.map((c) => c.id)).toEqual([...GUARD_CONTRACT.skinTones]);
  });

  it('a dangling id reference is reported', () => {
    const k = copy();
    kind(k, 'grunt').headwear = ['cap', 'tophat'];
    expect(validateGuardKit(k)).toContain('kind grunt: unknown headwear tophat');
  });

  // (G10a D2) SPEC 8 clamps target / neutral to 1: a channel over the neutral greys the colour
  it('a skin tone or hair colour channel above its neutral is reported (would clamp)', () => {
    for (const t of KIT.skinTones) expect(Math.max(...t.rgb), `tone ${t.id}`).toBeLessThanOrEqual(KIT.tintNeutral.skin);
    for (const c of KIT.hairColours) expect(Math.max(...c.rgb), String(c.id)).toBeLessThanOrEqual(KIT.tintNeutral.hair);
    const k = copy();
    k.skinTones[0]!.rgb = [0.98, 0.58, 0.43];
    expect(validateGuardKit(k)).toEqual(['skinTone 0: rgb 0.98, 0.58, 0.43 has a channel above the skin neutral 0.75 (would clamp: target / neutral is clamped to 1)']);
    const h = copy();
    h.hairColours.find((c) => c.id === 'grey')!.rgb = [0.65, 0.57, 0.55];
    expect(validateGuardKit(h).some((e) => e.startsWith('hairColour grey:') && e.includes('would clamp'))).toBe(true);
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
