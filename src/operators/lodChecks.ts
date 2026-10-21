/**
 * Step 10 LOD export checks (pure, no Babylon): every LOD glTF holds the integration anchors (A36, A40, A41) as nodes
 * parented to a skin joint, the game LODs carry the game joints only (no hero per-toe bones; finger bones on LOD0 / LOD1
 * only since anim-skeleton S1), and the measured
 * costs are compared with SPEC 6.4 (an overrun is a flag, not a failure: the step reports it).
 */

export const LOD_ANCHORS = ['weaponMount.backL', 'weaponMount.backC', 'weaponMount.backR', 'pistolHolster', 'slingSocket'] as const;

/** The joint each anchor rides on (export report `anchorsBone`). */
export const ANCHOR_JOINT: Record<(typeof LOD_ANCHORS)[number], string> = {
  'weaponMount.backL': 'chest', 'weaponMount.backC': 'chest', 'weaponMount.backR': 'chest', pistolHolster: 'hipR', slingSocket: 'pelvis',
};

/**
 * SPEC 6.4 per LOD: triangles [min, max], draws (materials) plus the goggle glow draw (SPEC's "+ glow" for LOD2, read
 * for LOD1 too: A75), skin bones. Bones (anim-skeleton S1, 2026-10-21; were SPEC's ~17 game / 30 hero): the 21 game
 * joints (the rig's 19 + root, body) + handL / handR stubs + clavL / clavR + goggleStow / goggleUse on every LOD (27),
 * + the hero's 30 finger joints on LOD0 / LOD1 (57), + the hero's 10 per-toe joints on the hero (67).
 */
export const LOD_BUDGET: Record<string, { tris: [number, number]; draws: number; glow: number; bones: number }> = {
  hero: { tris: [150_000, 250_000], draws: 4, glow: 0, bones: 67 },
  lod0: { tris: [35_000, 45_000], draws: 3, glow: 0, bones: 57 },
  lod1: { tris: [12_000, 15_000], draws: 2, glow: 1, bones: 57 },
  lod2: { tris: [4_000, 6_000], draws: 1, glow: 1, bones: 27 },
};

/** (anim-skeleton S1) The LODs that carry the hero's finger joints (LOD2 folds them into the wrist; distant). */
export const FINGER_LODS: readonly string[] = ['hero', 'lod0', 'lod1'];

export interface GltfJson {
  nodes: { name?: string; children?: number[]; mesh?: number }[];
  skins?: { joints: number[] }[];
  meshes?: { primitives: { attributes?: Record<string, number>; material?: number }[] }[];
  materials?: { name?: string; normalTexture?: unknown }[];
  images?: { name?: string; mimeType?: string; uri?: string }[];
  textures?: { source?: number; extensions?: Record<string, { source?: number } | undefined> }[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

export interface LodCheck {
  name: string;
  pass: boolean;
  /** A flag is reported against SPEC 6.4 but does not fail the run. */
  flag?: boolean;
  value: unknown;
  limit: string;
}

/** The JSON chunk of a GLB file. */
export function glbJson(buf: Uint8Array): GltfJson {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const len = dv.getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + len))) as GltfJson;
}

/** A joint this LOD must not carry: the hero's per-toe joints below the hero, finger joints outside FINGER_LODS. */
function heroOnly(lod: string, name: string): boolean {
  if (lod === 'hero') return false;
  return name.startsWith('toes') || (name.startsWith('finger') && !FINGER_LODS.includes(lod));
}

/** Checks one LOD file. `triangles` comes from the export report (the file's index counts give the same number). */
export function lodChecks(lod: string, json: GltfJson, triangles: number): LodCheck[] {
  const names = json.nodes.map((n) => n.name ?? '');
  const parent = new Map<number, number>();
  json.nodes.forEach((n, i) => n.children?.forEach((c) => parent.set(c, i)));
  const joints = new Set(json.skins?.[0]?.joints ?? []);
  const jointNames = [...joints].map((j) => names[j] ?? '');
  const wrong: string[] = [];
  for (const a of LOD_ANCHORS) {
    const i = names.indexOf(a);
    const p = i >= 0 ? parent.get(i) : undefined;
    if (i < 0) wrong.push(`${a}: missing`);
    else if (p === undefined || !joints.has(p) || names[p] !== ANCHOR_JOINT[a]) wrong.push(`${a}: on ${p === undefined ? 'nothing' : names[p]}, not ${ANCHOR_JOINT[a]}`);
  }
  const heroBones = jointNames.filter((n) => heroOnly(lod, n));
  const draws = (json.meshes ?? []).reduce((s, m) => s + m.primitives.length, 0);
  const b = LOD_BUDGET[lod];
  // a tangent-space normal map baked in MikkTSpace needs the file's tangents (fix round 1): without them the engine
  // derives a frame that does not match the bake (seams along UV island borders)
  const noTangent = (json.meshes ?? []).flatMap((m, mi) => m.primitives
    .filter((p) => p.material !== undefined && json.materials?.[p.material]?.normalTexture !== undefined && p.attributes?.TANGENT === undefined)
    .map((p) => `mesh ${mi} ${json.materials?.[p.material!]?.name ?? p.material}`));
  const out: LodCheck[] = [
    ktx2Check(json),
    { name: 'tangents', pass: noTangent.length === 0, value: noTangent, limit: 'every primitive with a normal map has TANGENT' },
    { name: 'anchors', pass: wrong.length === 0, value: wrong, limit: `${LOD_ANCHORS.join(', ')} on their joints` },
    { name: 'gameJoints', pass: heroBones.length === 0, value: heroBones.length, limit: 'game LODs: no per-toe bones; finger bones on LOD0 / LOD1 only' },
  ];
  if (b) {
    out.push(
      { name: 'triangles', pass: triangles <= b.tris[1], flag: true, value: triangles, limit: `SPEC 6.4 ${b.tris[0]}-${b.tris[1]}` },
      { name: 'draws', pass: draws <= b.draws + b.glow, flag: true, value: draws, limit: `SPEC 6.4 <= ${b.draws}${b.glow ? ' + glow (A75)' : ''}` },
      { name: 'bones', pass: joints.size <= b.bones, flag: true, value: joints.size, limit: `<= ${b.bones} (SPEC 6.4 ~17 game joints + helpers, clavicles, goggle${FINGER_LODS.includes(lod) ? ', fingers' : ''}${lod === 'hero' ? ', toes' : ''}: anim-skeleton S1)` },
    );
  }
  return out;
}

/**
 * Step 11 (D26, A73 closed): every texture of a LOD file is KTX2 through KHR_texture_basisu (required), and the file
 * holds no WebP, PNG or JPEG image and no texture without the extension.
 */
export function ktx2Check(json: GltfJson): LodCheck {
  const bad: string[] = [];
  for (const [i, im] of (json.images ?? []).entries()) {
    if (im.mimeType !== 'image/ktx2' || im.uri !== undefined) bad.push(`image ${im.name ?? i}: ${im.mimeType ?? im.uri ?? 'no mime'}`);
  }
  for (const [i, t] of (json.textures ?? []).entries()) {
    const src = t.extensions?.KHR_texture_basisu?.source;
    if (src === undefined) bad.push(`texture ${i}: no KHR_texture_basisu`);
    else if (json.images?.[src]?.mimeType !== 'image/ktx2') bad.push(`texture ${i}: basisu source ${src} not KTX2`);
    if (t.source !== undefined) bad.push(`texture ${i}: plain source ${t.source}`);
    if (t.extensions?.EXT_texture_webp) bad.push(`texture ${i}: EXT_texture_webp`);
  }
  const textured = (json.textures ?? []).length > 0;
  if (textured && !json.extensionsRequired?.includes('KHR_texture_basisu')) bad.push('KHR_texture_basisu not in extensionsRequired');
  if (json.extensionsUsed?.includes('EXT_texture_webp')) bad.push('EXT_texture_webp in extensionsUsed');
  return { name: 'ktx2', pass: bad.length === 0, value: bad, limit: 'every texture KTX2 via KHR_texture_basisu, no WebP / PNG' };
}

/** The export report's measures for one LOD (py/bake_lods.py): open edge length, visible back-face pixels per view. */
export interface LodReport {
  openEdgeM?: number;
}
export interface BackFaceView {
  px: number;
  figurePx: number;
}

/** The views whose back faces are counted (Cycles renders of the export, fix round 1; `holster` fix round 3). */
export const BACKFACE_VIEWS = ['front', 'side', 'back', 'chest', 'head', 'boot', 'holster'] as const;
export type LodView = (typeof BACKFACE_VIEWS)[number];

/**
 * Views whose render is older than the LOD's GLB (or the hero's render older than the hero's GLB): a check on them
 * would judge a model that no longer exists, so they FAIL "stale" (fix round 3). Times are mtimes in ms; a missing
 * render is left out (the checks report it "not measured").
 */
export function staleViews(glbMs: number, heroGlbMs: number, renderMs: Partial<Record<LodView, number>>, heroRenderMs: Partial<Record<LodView, number>>): LodView[] {
  const out: LodView[] = [];
  for (const v of BACKFACE_VIEWS) {
    const r = renderMs[v];
    const h = heroRenderMs[v];
    if ((r !== undefined && r < glbMs) || (h !== undefined && h < heroGlbMs)) out.push(v);
  }
  return out;
}

/**
 * Report checks against the hero (fix round 1, both FAIL): visible back-face pixels (holes and the interiors seen
 * through them) per view no more than the hero's count + 0.2 % of the LOD's figure pixels; open edge length of LOD1
 * and LOD2 no more than 1.5x the hero's.
 */
export function lodReportChecks(lod: string, r: LodReport, hero: LodReport, back?: Record<string, Record<string, BackFaceView>>, stale: readonly string[] = []): LodCheck[] {
  const out: LodCheck[] = [];
  if (lod === 'hero') return out;
  const mine = back?.[lod];
  const ref = back?.hero;
  const over: string[] = [];
  const seen: string[] = [];
  for (const v of BACKFACE_VIEWS) {
    const a = mine?.[v];
    const h = ref?.[v];
    if (!a || !h) { over.push(`${v}: not measured`); continue; }
    if (stale.includes(v)) { over.push(`${v}: stale (render older than the GLB; run operators:lods --render)`); continue; }
    const limit = h.px + 0.002 * a.figurePx;
    seen.push(`${v} ${a.px}/${Math.round(limit)}`);
    if (a.px > limit) over.push(`${v}: ${a.px} px > ${Math.round(limit)}`);
  }
  out.push({ name: 'backFaces', pass: over.length === 0, value: over.length ? over : seen, limit: "per view <= hero's + 0.2 % of the figure (run operators:lods --render)" });
  if (lod === 'lod1' || lod === 'lod2') {
    const ok = r.openEdgeM !== undefined && hero.openEdgeM !== undefined && r.openEdgeM <= 1.5 * hero.openEdgeM;
    out.push({ name: 'openEdges', pass: ok, value: r.openEdgeM ?? 'not measured', limit: `<= 1.5x the hero's ${hero.openEdgeM ?? '?'} m` });
  }
  return out;
}

/** A view's new-dark patch against the hero (bakeDiff.darkPatches, A76). */
export interface DarkPatchView {
  px: number;
  largest: number;
  at: [number, number];
}

/** The shell LODs (A74): one closed decimated shell each; no bake error of theirs is accepted. */
export const SHELL_LODS = ['lod1', 'lod2'] as const;   // desktop only (D29): no phone LOD
/** The shells' limit in every view (fix round 3, A76): the smallest patch the eye reads as a defect at 420-560 px. */
export const SHELL_DARK_LIMIT = 24;

/**
 * Largest new-dark patch (px) allowed per view at LOD0 (A76): 24 px, except where LOD0's own bake error is OPEN; each
 * loose limit is named in A76 with its defect and file / pixel and goes back to 24 when that error is fixed. Fix round
 * 3 fixed the thigh-band line (back 128 px), the buckle blotches and the plate-top smear (chest 157, head 125) with
 * the sharp-edge split on LOD0, so back, chest and head are 24 again. The step 10 retry fixed the toe streaks (the
 * solidified boot upper's inner shell baked over its outer face, and the split now reaches the boots; A95): boot is
 * 24 again, every LOD0 view 24. Shells (LOD1, LOD2) always get SHELL_DARK_LIMIT: a shell view over it is a defect to
 * fix, never a limit.
 */
export const DARK_PATCH_LIMIT: Record<LodView, number> = {
  front: 24, side: 24, back: 24, chest: 24, head: 24, boot: 24, holster: 24,
};

/** The limit for one LOD and view: SHELL_DARK_LIMIT for the shells, DARK_PATCH_LIMIT (LOD0's) otherwise. */
export function darkPatchLimit(lod: string, view: LodView): number {
  return (SHELL_LODS as readonly string[]).includes(lod) ? SHELL_DARK_LIMIT : DARK_PATCH_LIMIT[view];
}

/** Bake errors inside the outline (fix round 2, A76, FAIL): each view's largest new-dark patch within its limit. */
export function bakeDiffCheck(lod: string, patches?: Record<string, DarkPatchView>, stale: readonly string[] = []): LodCheck[] {
  if (lod === 'hero') return [];
  const over: string[] = [];
  const seen: string[] = [];
  for (const v of BACKFACE_VIEWS) {
    const p = patches?.[v];
    const lim = darkPatchLimit(lod, v);
    if (!p) { over.push(`${v}: not measured`); continue; }
    if (stale.includes(v)) { over.push(`${v}: stale (render older than the GLB; run operators:lods --render)`); continue; }
    seen.push(`${v} ${p.largest}/${lim}`);
    if (p.largest > lim) over.push(`${v}: ${p.largest} px at ${p.at.join(',')} > ${lim}`);
  }
  const kind = (SHELL_LODS as readonly string[]).includes(lod) ? `shell limit ${SHELL_DARK_LIMIT} px every view` : 'LOD0 limits per view (A76)';
  return [{ name: 'bakeDiff', pass: over.length === 0, value: over.length ? over : seen, limit: `largest new-dark patch against the hero; ${kind} (run operators:lods --render)` }];
}
