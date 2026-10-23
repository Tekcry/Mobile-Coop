/**
 * Guard budget check (guard-models G4b, docs/guard-models/PLAN.md sections 3 G4 and 5, SPEC.md sections 4-6). Pure, no
 * Babylon, no fs.
 *
 * `bake_lods.py` guard mode (G4) writes one bake report per base, `lods/guard-<base>.report.json`, and one for each
 * piece with its own GLB (`lods/guard-shield_riot.report.json`), beside the LOD GLBs (scripts/operators/guardBakePlan.mjs
 * job outputs). `checkGuardReport` compares a report with PLAN section 5 (`GUARD_LIMITS` in guardKit.ts plus the few
 * section-5 budgets below that guardKit.ts has no constant for) and with the kit's own per-piece caps
 * (`scripts/operators/data/guards.json`), and returns readable problems (empty = within budget).
 * The report shape is documented for the bake in docs/guard-models/reports/G4b-REPORT.md.
 */
import { GUARD_LIMITS, type GuardKit, type GuardKindDef, type GuardPiece } from './guardKit';

export const GUARD_REPORT_VERSION = 1;

export type GuardTextureRole = 'albedo' | 'normal' | 'orm';
export const GUARD_TEXTURE_ROLES: readonly GuardTextureRole[] = ['albedo', 'normal', 'orm'];

/** One texture of a LOD's one material, as the KTX2 step leaves it. */
export interface GuardTextureReport {
  role: GuardTextureRole;
  width: number;
  height: number;
  /** Container of the image in the GLB: must be 'ktx2' (KHR_texture_basisu, UASTC + Zstd). */
  format: string;
}

/** What one LOD file holds. Fields marked "base" are required in a base report and absent in a piece report. */
export interface GuardLodReport {
  lod: number;
  /** The GLB, relative to the bake out dir: `lods/guard-<base or piece>-lod<n>.glb`. */
  file: string;
  /** Every triangle in the file's index buffers (hidden heads, caps and pieces included). */
  bufferTris: number;
  /** Mesh primitives in the file (one skinned mesh with one material: 1). */
  draws: number;
  /** Skin joint names. */
  bones: string[];
  /** Largest number of non-zero skin weights on any vertex. */
  influences: number;
  /** Vertex attribute names of the primitive (base: `_PIECE` and `_TINT` among them). */
  attributes: string[];
  textures: GuardTextureReport[];
  /** base: worst-case shown triangles per kind of the base (body + largest head + eyes + largest cap + every pool's largest pick + fixed, gameplay and kit pieces; the enforcer's shield counts). */
  shownTris?: Record<string, number>;
  /** base: the body's own triangles (skin left visible under the outfit). */
  bodyTris?: number;
  /** base: per head variant of the base, head and neck to the seam. */
  headTris?: Record<string, number>;
  /** base: both eyes (0 below LOD0: merged into the head). */
  eyeTris?: number;
  /** base: per hair cap with a mesh that the base's kinds wear (0 at LOD2: hair in the albedo). */
  hairCapTris?: Record<string, number>;
  /** base: per piece in the base's buffer (outfits, headwear, eyewear, gear, kit; not own-GLB pieces). */
  pieceTris?: Record<string, number>;
}

/** A bake report: exactly one of `base` (a guard base) or `piece` (an own-GLB piece, the riot shield). */
export interface GuardBakeReport {
  version: number;
  base?: string;
  piece?: string;
  lods: GuardLodReport[];
}

/** PLAN section 5 "Influences": 4 / 4 / 2 per LOD (no constant in guardKit.ts). */
export const GUARD_INFLUENCES: readonly [number, number, number] = [4, 4, 2];
/** PLAN section 5 "Draws per pass": 1 per file (the shield and the gun are their own files). */
export const GUARD_DRAWS = 1;
/** PLAN section 5 "Atlas: albedo + normal / ORM": [w, h] per LOD for a base's one material. */
export const GUARD_ATLAS: Readonly<Record<GuardTextureRole, readonly (readonly [number, number])[]>> = {
  albedo: [[4096, 2048], [2048, 1024], [512, 256]],
  normal: [[2048, 1024], [1024, 512], [256, 128]],
  orm: [[2048, 1024], [1024, 512], [256, 128]],
};
/** Vertex attributes every base LOD carries (PLAN section 2: static piece id and tint slot). */
export const GUARD_ATTRIBUTES = ['_PIECE', '_TINT'] as const;

const LODS = [0, 1, 2] as const;
type Lod = (typeof LODS)[number];

/** The bake report files a kit's bake writes (relative to the out dir): one per base and per own-GLB piece. */
export function guardReportFiles(kit: GuardKit): string[] {
  return [...kit.bases.map((b) => b.id), ...kit.pieces.filter((p) => p.ownGlb).map((p) => p.id)].map((id) => `lods/guard-${id}.report.json`);
}

/** The LOD GLB a report's LOD must name (guardBakePlan.mjs lods outputs). */
export const guardLodFile = (id: string, lod: number) => `lods/guard-${id}-lod${lod}.glb`;

/** PLAN section 5 LOD0 cap for a piece (null: none), from `GUARD_LIMITS.pieceLod0`. */
export function pieceLod0Cap(p: GuardPiece): number | null {
  const L = GUARD_LIMITS.pieceLod0;
  if (p.kind === 'headwear') return L.headwear;
  if (p.kind === 'shield') return L.shield;
  if (p.id.startsWith('helmet_')) return L.helmet;
  if (p.id === 'vest_soft') return L.vest_soft;
  if (p.id === 'plate_heavy') return L.plate_heavy;
  return null;
}

/** A piece's cap at a LOD: its kit budget, tightened at LOD0 by the section-5 cap. */
function pieceCap(p: GuardPiece, lod: Lod): number {
  const s5 = lod === 0 ? pieceLod0Cap(p) : null;
  return s5 === null ? p.tris[lod] : Math.min(p.tris[lod], s5);
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** The pieces in a base's buffer (what its kinds can show, own-GLB pieces left out), as guardKit's `bufferTris` counts them. */
function basePieces(kit: GuardKit, kinds: GuardKindDef[]): GuardPiece[] {
  const ids = new Set<string>();
  for (const k of kinds) {
    for (const id of [k.outfit, ...k.headwear, ...k.headwear2, ...k.eyewear, ...k.fixedGear, ...k.gameplayGear, ...k.kitPool]) ids.add(id);
  }
  return kit.pieces.filter((p) => ids.has(p.id) && !p.ownGlb);
}

/**
 * Checks a per-id triangle table: every expected id present, no other id, each count within its cap. Appends problems.
 */
function checkTable(err: string[], tag: string, what: string, table: Record<string, number> | undefined, caps: Map<string, number>): void {
  if (table === undefined || table === null || typeof table !== 'object') {
    err.push(`${tag}: no ${what} table`);
    return;
  }
  for (const [id, cap] of caps) {
    const n = table[id];
    if (n === undefined) err.push(`${tag}: ${what} ${id} missing`);
    else if (!isCount(n)) err.push(`${tag}: ${what} ${id} is not a triangle count (${String(n)})`);
    else if (n > cap) err.push(`${tag}: ${what} ${id} ${n} tris over ${cap}`);
  }
  for (const id of Object.keys(table)) if (!caps.has(id)) err.push(`${tag}: ${what} ${id} is not one of this file's`);
}

function checkCount(err: string[], tag: string, what: string, n: unknown, cap: number): void {
  if (!isCount(n)) err.push(`${tag}: ${what} is not a count (${String(n)})`);
  else if (n > cap) err.push(`${tag}: ${what} ${n} over ${cap}`);
}

function checkTextures(err: string[], tag: string, textures: GuardTextureReport[] | undefined, sizes: Record<GuardTextureRole, readonly [number, number]>): void {
  if (!Array.isArray(textures)) {
    err.push(`${tag}: no textures list`);
    return;
  }
  for (const role of GUARD_TEXTURE_ROLES) {
    const n = textures.filter((t) => t.role === role).length;
    if (n !== 1) err.push(`${tag}: ${n} ${role} textures, need 1 (one material)`);
  }
  for (const [i, t] of textures.entries()) {
    const name = `texture ${i} (${String(t.role)})`;
    if (t.format !== 'ktx2') err.push(`${tag}: ${name} is ${String(t.format)}, not ktx2 (KTX2 only)`);
    const max = (GUARD_TEXTURE_ROLES as readonly string[]).includes(t.role) ? sizes[t.role] : undefined;
    if (!max) err.push(`${tag}: ${name}: unknown role (albedo, normal, orm)`);
    else if (!isCount(t.width) || !isCount(t.height) || t.width > max[0] || t.height > max[1]) {
      err.push(`${tag}: ${name} ${String(t.width)} x ${String(t.height)} over ${max[0]} x ${max[1]}`);
    }
  }
}

/** Every problem in one bake report against PLAN section 5 and the kit's piece caps. Empty means within budget. */
export function checkGuardReport(report: GuardBakeReport, kit: GuardKit): string[] {
  const err: string[] = [];
  if (report === null || typeof report !== 'object') return ['report: not an object'];
  if (report.version !== GUARD_REPORT_VERSION) err.push(`report: version ${String(report.version)}, need ${GUARD_REPORT_VERSION}`);
  const hasBase = report.base !== undefined;
  const hasPiece = report.piece !== undefined;
  if (hasBase === hasPiece) return [...err, 'report: needs exactly one of base or piece'];
  const id = String(hasBase ? report.base : report.piece);
  const base = hasBase ? kit.bases.find((b) => b.id === id) : undefined;
  const piece = hasPiece ? kit.pieces.find((p) => p.id === id && p.ownGlb) : undefined;
  if (hasBase && !base) return [...err, `report: unknown base ${id}`];
  if (hasPiece && !piece) return [...err, `report: ${id} is not a piece with its own GLB`];
  if (!Array.isArray(report.lods)) return [...err, `${id}: no lods list`];
  for (const l of LODS) if (report.lods.filter((r) => r?.lod === l).length !== 1) err.push(`${id}: needs exactly one LOD${l} entry`);
  for (const r of report.lods) if (!LODS.includes(r?.lod as Lod)) err.push(`${id}: unknown LOD ${String(r?.lod)}`);

  const kinds = kit.kinds.filter((k) => k.base === id);
  const pieces = base ? basePieces(kit, kinds) : [];
  const worn = new Set(kinds.flatMap((k) => k.hairCaps));
  const caps = kit.hairCaps.filter((c) => worn.has(c.id) && c.tris[0] > 0);
  const heads = kit.heads.filter((h) => h.base === id);

  for (const l of LODS) {
    const r = report.lods.find((x) => x?.lod === l);
    if (!r) continue;
    const tag = `${id} LOD${l}`;
    if (r.file !== guardLodFile(id, l)) err.push(`${tag}: file ${String(r.file)}, expected ${guardLodFile(id, l)}`);
    checkCount(err, tag, 'buffer tris', r.bufferTris, base ? GUARD_LIMITS.buffer[l] : pieceCap(piece!, l));
    checkCount(err, tag, 'draws', r.draws, GUARD_DRAWS);
    checkCount(err, tag, 'influences', r.influences, GUARD_INFLUENCES[l]);

    // Bones: a base carries the 23 rig joints (+ the 10 fingers at LOD0), no others; a piece only its declared bones.
    const bones = Array.isArray(r.bones) ? r.bones : [];
    if (!Array.isArray(r.bones)) err.push(`${tag}: no bones list`);
    if (new Set(bones).size !== bones.length) err.push(`${tag}: duplicate bone name`);
    if (base) {
      const want = l === 0 ? [...kit.bones.rig, ...kit.bones.fingers] : kit.bones.rig;
      const count = GUARD_LIMITS.rigBones + (l === 0 ? GUARD_LIMITS.fingerBones : 0);
      if (bones.length !== count) err.push(`${tag}: ${bones.length} bones, need ${count}`);
      const missing = want.filter((b) => !bones.includes(b));
      const extra = bones.filter((b) => !want.includes(b));
      if (missing.length) err.push(`${tag}: bones missing ${missing.join(', ')}`);
      if (extra.length) err.push(`${tag}: bones not allowed ${extra.join(', ')}${l > 0 ? ' (fingers fold into the wrist below LOD0; no face bones)' : ' (no face bones)'}`);
    } else {
      if (bones.length === 0) err.push(`${tag}: no bones`);
      const extra = bones.filter((b) => !piece!.bones.includes(b));
      if (extra.length) err.push(`${tag}: bones ${extra.join(', ')} are not the piece's declared bones (${piece!.bones.join(', ')})`);
    }

    // Textures: one material, KTX2 only, within the section-5 atlas (a piece: its own texels, LOD1 half, LOD2 quarter;
    // normal / ORM at half size).
    const sizes = base
      ? { albedo: GUARD_ATLAS.albedo[l]!, normal: GUARD_ATLAS.normal[l]!, orm: GUARD_ATLAS.orm[l]! }
      : (() => {
          const a: [number, number] = [piece!.texels[0] >> l, piece!.texels[1] >> l];
          const h: [number, number] = [a[0] >> 1, a[1] >> 1];
          return { albedo: a, normal: h, orm: h };
        })();
    checkTextures(err, tag, r.textures, sizes);
    if (!base) continue;

    const attrs = Array.isArray(r.attributes) ? r.attributes : [];
    for (const a of GUARD_ATTRIBUTES) if (!attrs.includes(a)) err.push(`${tag}: vertex attribute ${a} missing`);

    checkTable(err, tag, 'shown tris of kind', r.shownTris, new Map(kinds.map((k) => [k.id, GUARD_LIMITS.shown[l]])));
    checkCount(err, tag, 'body tris', r.bodyTris, base.bodyTris[l]);
    checkTable(err, tag, 'head', r.headTris, new Map(heads.map((h) => [h.id, Math.min(h.tris[l], GUARD_LIMITS.head[l])])));
    checkCount(err, tag, 'eye tris', r.eyeTris, l === 0 ? Math.min(kit.face.eyes.tris[0], GUARD_LIMITS.eyesLod0) : 0);
    const capLimit = l === 0 ? GUARD_LIMITS.hairCapLod0 : l === 1 ? GUARD_LIMITS.hairCapLod1 : 0;
    checkTable(err, tag, 'hair cap', r.hairCapTris, new Map(caps.map((c) => [c.id, Math.min(c.tris[l], capLimit)])));
    checkTable(err, tag, 'piece', r.pieceTris, new Map(pieces.map((p) => [p.id, pieceCap(p, l)])));
  }
  return err;
}
