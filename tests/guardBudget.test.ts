import { describe, expect, it } from 'vitest';
import raw from '../scripts/operators/data/guards.json';
import { bufferTris, GUARD_BASES, GUARD_LIMITS, shownTris, type GuardKit } from '../src/operators/guards/guardKit';
import {
  checkGuardReport, GUARD_ATLAS, GUARD_INFLUENCES, GUARD_REPORT_VERSION, guardLodFile, guardReportFiles,
  type GuardBakeReport, type GuardLodReport,
} from '../src/operators/guards/guardBudget';

const KIT = raw as unknown as GuardKit;
const LODS = [0, 1, 2] as const;

/** A report that sits exactly on every kit budget, as a clean G4 bake of `base` would write it. */
function baseReport(base: string): GuardBakeReport {
  const kinds = KIT.kinds.filter((k) => k.base === base);
  const worn = new Set(kinds.flatMap((k) => k.hairCaps));
  const used = new Set(kinds.flatMap((k) => [k.outfit, ...k.headwear, ...k.headwear2, ...k.eyewear, ...k.fixedGear, ...k.gameplayGear, ...k.kitPool]));
  const b = KIT.bases.find((x) => x.id === base)!;
  return {
    version: GUARD_REPORT_VERSION,
    base,
    lods: LODS.map((l): GuardLodReport => ({
      lod: l,
      file: guardLodFile(base, l),
      bufferTris: bufferTris(KIT, base, l),
      draws: 1,
      bones: l === 0 ? [...KIT.bones.rig, ...KIT.bones.fingers] : [...KIT.bones.rig],
      influences: GUARD_INFLUENCES[l],
      attributes: ['POSITION', 'NORMAL', 'TANGENT', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0', '_PIECE', '_TINT'],
      textures: (['albedo', 'normal', 'orm'] as const).map((role) => ({ role, width: GUARD_ATLAS[role][l]![0], height: GUARD_ATLAS[role][l]![1], format: 'ktx2' })),
      shownTris: Object.fromEntries(kinds.map((k) => [k.id, shownTris(KIT, k, l)])),
      bodyTris: b.bodyTris[l],
      headTris: Object.fromEntries(KIT.heads.filter((h) => h.base === base).map((h) => [h.id, h.tris[l]])),
      eyeTris: KIT.face.eyes.tris[l],
      hairCapTris: Object.fromEntries(KIT.hairCaps.filter((c) => worn.has(c.id) && c.tris[0] > 0).map((c) => [c.id, c.tris[l]])),
      pieceTris: Object.fromEntries(KIT.pieces.filter((p) => used.has(p.id) && !p.ownGlb).map((p) => [p.id, p.tris[l]])),
    })),
  };
}

function shieldReport(): GuardBakeReport {
  const p = KIT.pieces.find((x) => x.id === 'shield_riot')!;
  return {
    version: GUARD_REPORT_VERSION,
    piece: p.id,
    lods: LODS.map((l): GuardLodReport => ({
      lod: l,
      file: guardLodFile(p.id, l),
      bufferTris: p.tris[l],
      draws: 1,
      bones: [...p.bones],
      influences: 1,
      attributes: ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'],
      textures: [
        { role: 'albedo', width: p.texels[0] >> l, height: p.texels[1] >> l, format: 'ktx2' },
        { role: 'normal', width: p.texels[0] >> (l + 1), height: p.texels[1] >> (l + 1), format: 'ktx2' },
        { role: 'orm', width: p.texels[0] >> (l + 1), height: p.texels[1] >> (l + 1), format: 'ktx2' },
      ],
    })),
  };
}

const lod = (r: GuardBakeReport, l: number) => r.lods.find((x) => x.lod === l)!;
/** One broken copy: `edit` changes a fresh report; the problems must hold `want` (and nothing else when `only`). */
function broken(make: () => GuardBakeReport, edit: (r: GuardBakeReport) => void): string[] {
  const r = structuredClone(make());
  edit(r);
  return checkGuardReport(r, KIT);
}

describe('guard budget check (guard-models G4b)', () => {
  it.each([...GUARD_BASES])('a clean synthetic report for base %s passes', (base) => {
    expect(checkGuardReport(baseReport(base), KIT)).toEqual([]);
  });

  it('a clean synthetic shield report passes', () => {
    expect(checkGuardReport(shieldReport(), KIT)).toEqual([]);
  });

  it('report files: one per base and one for the shield', () => {
    expect(guardReportFiles(KIT)).toEqual(['lods/guard-average.report.json', 'lods/guard-lean.report.json', 'lods/guard-broad.report.json', 'lods/guard-shield_riot.report.json']);
  });

  // Each rule: one broken copy of a clean report, and the problem it must give.
  const avg = () => baseReport('average');
  const cases: [string, () => GuardBakeReport, (r: GuardBakeReport) => void, string][] = [
    ['version', avg, (r) => { r.version = 0; }, 'report: version 0, need 1'],
    ['base and piece', avg, (r) => { r.piece = 'shield_riot'; }, 'report: needs exactly one of base or piece'],
    ['unknown base', avg, (r) => { r.base = 'tall'; }, 'report: unknown base tall'],
    ['piece without own GLB', shieldReport, (r) => { r.piece = 'helmet_std'; }, 'report: helmet_std is not a piece with its own GLB'],
    ['missing LOD', avg, (r) => { r.lods.pop(); }, 'average: needs exactly one LOD2 entry'],
    ['unknown LOD', avg, (r) => { lod(r, 2).lod = 3; }, 'average: unknown LOD 3'],
    ['file name', avg, (r) => { lod(r, 1).file = 'lods/guard-lean-lod1.glb'; }, 'average LOD1: file lods/guard-lean-lod1.glb, expected lods/guard-average-lod1.glb'],
    ['buffer tris LOD0', avg, (r) => { lod(r, 0).bufferTris = GUARD_LIMITS.buffer[0] + 1; }, `average LOD0: buffer tris ${GUARD_LIMITS.buffer[0] + 1} over ${GUARD_LIMITS.buffer[0]}`],
    ['buffer tris LOD2', avg, (r) => { lod(r, 2).bufferTris = GUARD_LIMITS.buffer[2] + 1; }, `average LOD2: buffer tris ${GUARD_LIMITS.buffer[2] + 1} over ${GUARD_LIMITS.buffer[2]}`],
    ['buffer tris not a count', avg, (r) => { lod(r, 0).bufferTris = -1; }, 'average LOD0: buffer tris is not a count (-1)'],
    ['shown tris per kind', avg, (r) => { lod(r, 0).shownTris!.officer = GUARD_LIMITS.shown[0] + 1; }, `average LOD0: shown tris of kind officer ${GUARD_LIMITS.shown[0] + 1} tris over ${GUARD_LIMITS.shown[0]}`],
    ['shown tris kind missing', avg, (r) => { delete lod(r, 1).shownTris!.grunt; }, 'average LOD1: shown tris of kind grunt missing'],
    ['shown tris foreign kind', avg, (r) => { lod(r, 1).shownTris!.runner = 10; }, 'average LOD1: shown tris of kind runner is not one of this file\'s'],
    ['shown tris table absent', avg, (r) => { delete lod(r, 2).shownTris; }, 'average LOD2: no shown tris of kind table'],
    ['head tris', avg, (r) => { lod(r, 0).headTris!['average-3'] = GUARD_LIMITS.head[0] + 1; }, `average LOD0: head average-3 ${GUARD_LIMITS.head[0] + 1} tris over ${GUARD_LIMITS.head[0]}`],
    ['head missing', avg, (r) => { delete lod(r, 2).headTris!['average-4']; }, 'average LOD2: head average-4 missing'],
    ['body tris', avg, (r) => { lod(r, 0).bodyTris = 1201; }, 'average LOD0: body tris 1201 over 1200'],
    ['eyes LOD0', avg, (r) => { lod(r, 0).eyeTris = GUARD_LIMITS.eyesLod0 + 1; }, `average LOD0: eye tris ${GUARD_LIMITS.eyesLod0 + 1} over ${GUARD_LIMITS.eyesLod0}`],
    ['eyes below LOD0 merged', avg, (r) => { lod(r, 1).eyeTris = 2; }, 'average LOD1: eye tris 2 over 0'],
    ['hair cap LOD0', avg, (r) => { lod(r, 0).hairCapTris!.sidepart = GUARD_LIMITS.hairCapLod0 + 1; }, `average LOD0: hair cap sidepart ${GUARD_LIMITS.hairCapLod0 + 1} tris over ${GUARD_LIMITS.hairCapLod0}`],
    ['hair cap LOD1', avg, (r) => { lod(r, 1).hairCapTris!.sidepart = GUARD_LIMITS.hairCapLod1 + 1; }, `average LOD1: hair cap sidepart ${GUARD_LIMITS.hairCapLod1 + 1} tris over ${GUARD_LIMITS.hairCapLod1}`],
    ['hair cap LOD2 in albedo', avg, (r) => { lod(r, 2).hairCapTris!.buzz = 1; }, 'average LOD2: hair cap buzz 1 tris over 0'],
    ['hair cap kit cap', avg, (r) => { lod(r, 0).hairCapTris!.buzz = 501; }, 'average LOD0: hair cap buzz 501 tris over 500'],
    ['bald has no cap', avg, (r) => { lod(r, 0).hairCapTris!.bald = 0; }, 'average LOD0: hair cap bald is not one of this file\'s'],
    ['piece section-5 cap', avg, (r) => { lod(r, 0).pieceTris!.vest_soft = GUARD_LIMITS.pieceLod0.vest_soft + 1; }, `average LOD0: piece vest_soft ${GUARD_LIMITS.pieceLod0.vest_soft + 1} tris over ${GUARD_LIMITS.pieceLod0.vest_soft}`],
    ['piece kit cap', avg, (r) => { lod(r, 1).pieceTris!.radio = 101; }, 'average LOD1: piece radio 101 tris over 100'],
    ['piece missing', avg, (r) => { delete lod(r, 0).pieceTris!.helmet_std; }, 'average LOD0: piece helmet_std missing'],
    ['piece the base does not use', avg, (r) => { lod(r, 0).pieceTris!.plate_heavy = 100; }, 'average LOD0: piece plate_heavy is not one of this file\'s'],
    ['shield not in the base buffer', () => baseReport('broad'), (r) => { lod(r, 0).pieceTris!.shield_riot = 800; }, 'broad LOD0: piece shield_riot is not one of this file\'s'],
    ['bone count LOD0', avg, (r) => { lod(r, 0).bones.pop(); }, `average LOD0: ${GUARD_LIMITS.rigBones + GUARD_LIMITS.fingerBones - 1} bones, need ${GUARD_LIMITS.rigBones + GUARD_LIMITS.fingerBones}`],
    ['bone missing', avg, (r) => { lod(r, 1).bones = lod(r, 1).bones.map((b) => (b === 'clavL' ? 'jaw' : b)); }, 'average LOD1: bones missing clavL'],
    ['fingers below LOD0', avg, (r) => { lod(r, 1).bones.push('fingerL_1'); }, 'average LOD1: bones not allowed fingerL_1 (fingers fold into the wrist below LOD0; no face bones)'],
    ['face bone', avg, (r) => { lod(r, 0).bones[0] = 'jaw'; }, 'average LOD0: bones not allowed jaw (no face bones)'],
    ['influences LOD0', avg, (r) => { lod(r, 0).influences = 5; }, 'average LOD0: influences 5 over 4'],
    ['influences LOD2', avg, (r) => { lod(r, 2).influences = 3; }, 'average LOD2: influences 3 over 2'],
    ['draws', avg, (r) => { lod(r, 0).draws = 2; }, 'average LOD0: draws 2 over 1'],
    ['_PIECE attribute', avg, (r) => { lod(r, 0).attributes = lod(r, 0).attributes.filter((a) => a !== '_PIECE'); }, 'average LOD0: vertex attribute _PIECE missing'],
    ['_TINT attribute', avg, (r) => { lod(r, 2).attributes = lod(r, 2).attributes.filter((a) => a !== '_TINT'); }, 'average LOD2: vertex attribute _TINT missing'],
    ['KTX2 only', avg, (r) => { lod(r, 0).textures[0]!.format = 'png'; }, 'average LOD0: texture 0 (albedo) is png, not ktx2 (KTX2 only)'],
    ['albedo size', avg, (r) => { lod(r, 0).textures[0]!.width = 8192; }, 'average LOD0: texture 0 (albedo) 8192 x 2048 over 4096 x 2048'],
    ['normal size LOD1', avg, (r) => { lod(r, 1).textures[1]!.height = 1024; }, 'average LOD1: texture 1 (normal) 1024 x 1024 over 1024 x 512'],
    ['orm size LOD2', avg, (r) => { lod(r, 2).textures[2]!.width = 512; }, 'average LOD2: texture 2 (orm) 512 x 128 over 256 x 128'],
    ['two materials', avg, (r) => { lod(r, 0).textures.push({ role: 'albedo', width: 16, height: 16, format: 'ktx2' }); }, 'average LOD0: 2 albedo textures, need 1 (one material)'],
    ['texture missing', avg, (r) => { lod(r, 0).textures.splice(2, 1); }, 'average LOD0: 0 orm textures, need 1 (one material)'],
    ['shield tris LOD0', shieldReport, (r) => { lod(r, 0).bufferTris = GUARD_LIMITS.pieceLod0.shield + 1; }, `shield_riot LOD0: buffer tris ${GUARD_LIMITS.pieceLod0.shield + 1} over ${GUARD_LIMITS.pieceLod0.shield}`],
    ['shield kit cap LOD1', shieldReport, (r) => { lod(r, 1).bufferTris = 301; }, 'shield_riot LOD1: buffer tris 301 over 300'],
    ['shield bones', shieldReport, (r) => { lod(r, 0).bones.push('head'); }, 'shield_riot LOD0: bones head are not the piece\'s declared bones (elL, wrL)'],
    ['shield texture size', shieldReport, (r) => { lod(r, 1).textures[0]!.width = 512; }, 'shield_riot LOD1: texture 0 (albedo) 512 x 256 over 256 x 256'],
  ];
  it.each(cases)('rule: %s', (_name, make, edit, want) => {
    const got = broken(make, edit);
    expect(got).toContain(want);
  });

  it('a broken copy reports only its own rule (no knock-on problems)', () => {
    expect(broken(avg, (r) => { lod(r, 0).influences = 5; })).toEqual(['average LOD0: influences 5 over 4']);
    expect(broken(shieldReport, (r) => { lod(r, 2).draws = 3; })).toEqual(['shield_riot LOD2: draws 3 over 1']);
  });

  it('malformed input gives problems, never a throw', () => {
    expect(checkGuardReport(null as unknown as GuardBakeReport, KIT)).toEqual(['report: not an object']);
    expect(checkGuardReport({ version: 1, base: 'lean' } as unknown as GuardBakeReport, KIT)).toEqual(['lean: no lods list']);
    const bad = broken(avg, (r) => { (r.lods[0] as unknown as Record<string, unknown>).textures = undefined; (r.lods[0] as unknown as Record<string, unknown>).bones = undefined; });
    expect(bad).toContain('average LOD0: no textures list');
    expect(bad).toContain('average LOD0: no bones list');
  });
});
