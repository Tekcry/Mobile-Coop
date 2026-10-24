/**
 * (guard-models G7) Where a guard base's figure files come from (no Babylon).
 *
 * THE SEAM for G4: the bake's shippable files go into `src/operators/assets/guards/` (PLAN GB: the lead copies them
 * there after `operators:check`), named
 *   - `guard-<base>-lod0.glb`, `guard-<base>-lod1.glb`, `guard-<base>-lod2.glb` (one skinned mesh, one material,
 *     `_PIECE` / `_TINT` per vertex; no hero),
 *   - `guard-<base>.json` (`GuardFileData`: the piece list in `_PIECE` order, the tint slot count, the bind height),
 *   - `guard-shield_riot-lod0.glb` .. `-lod2.glb` (the enforcer's held shield, its own GLB).
 * The two `import.meta.glob` lines below are the only place they are imported (Vite `?url`: hashed same-origin build
 * URLs; nothing is fetched from anywhere else). Until a base's four files are all there, that base resolves to the
 * G5 stand-in: Wren's play LODs drawn as one body piece (`guardStandInManifest`), so the wiring runs now.
 */
import { flags } from '../../core/flags';
import { wrenManifest } from '../runtime/assets';
import { LOD_1 } from '../runtime/manifest';
import { warmPlayLods } from '../runtime/offline';
import { GUARD_BASES, guardStandInManifest, validateGuardManifest, type GuardBase, type GuardManifest } from './gearMask';

/** `guard-<base>.json`: what G4's bake writes beside a base's LODs (GuardManifest minus the urls). */
export interface GuardFileData {
  pieces: string[];
  tintSlots: number;
  refHeight: number;
}

const GUARD_FILES = import.meta.glob<string>('../assets/guards/*.glb', { query: '?url', import: 'default', eager: true });
const GUARD_DATA = import.meta.glob<GuardFileData>('../assets/guards/*.json', { import: 'default', eager: true });

/** One base's resolved files. */
export interface GuardAsset {
  manifest: GuardManifest;
  /** Wren's files stand in (G4's are not in the build, or not usable: `problems`). */
  standIn: boolean;
  /** Why G4's files were not used although some were present (empty: none present, or used). */
  problems: string[];
}

const LODS = ['lod0', 'lod1', 'lod2'] as const;

function byName(files: Readonly<Record<string, string>>, name: string): string {
  for (const path in files) if (path.slice(path.lastIndexOf('/') + 1) === name) return files[path]!;
  return '';
}

function dataByName(data: Readonly<Record<string, GuardFileData>>, name: string): GuardFileData | null {
  for (const path in data) if (path.slice(path.lastIndexOf('/') + 1) === name) return data[path]!;
  return null;
}

/**
 * The manifest for `base` from the build's guard files (`files`: glob path -> URL, `data`: glob path -> the parsed
 * `guard-<base>.json`), else the stand-in on Wren's play LODs (`wrenUrls`, the operator manifest's urls).
 */
export function resolveGuardAsset(
  base: GuardBase,
  files: Readonly<Record<string, string>>,
  data: Readonly<Record<string, GuardFileData>>,
  wrenUrls: readonly [string, string, string, string],
): GuardAsset {
  const stem = `guard-${base}`;
  const urls = LODS.map((l) => byName(files, `${stem}-${l}.glb`));
  const d = dataByName(data, `${stem}.json`);
  const any = urls.some((u) => u !== '') || d !== null;
  const problems: string[] = [];
  if (any) {
    LODS.forEach((l, i) => { if (!urls[i]) problems.push(`${stem}-${l}.glb missing`); });
    if (!d) problems.push(`${stem}.json missing`);
    else if (!Array.isArray(d.pieces) || typeof d.tintSlots !== 'number' || typeof d.refHeight !== 'number') problems.push(`${stem}.json malformed`);
    if (!problems.length && d) {
      const m: GuardManifest = { id: stem, base, urls: ['', urls[0]!, urls[1]!, urls[2]!], pieces: d.pieces, tintSlots: d.tintSlots, refHeight: d.refHeight };
      problems.push(...validateGuardManifest(m));
      if (!problems.length) return { manifest: m, standIn: false, problems };
    }
  }
  return { manifest: guardStandInManifest(base, wrenUrls), standIn: true, problems };
}

/** The shield's LOD urls (`[hero '', lod0, lod1, lod2]`) when all three are in the build, else null (the placeholder). */
export function resolveShieldUrls(files: Readonly<Record<string, string>>): [string, string, string, string] | null {
  const urls = LODS.map((l) => byName(files, `guard-shield_riot-${l}.glb`));
  return urls.every((u) => u !== '') ? ['', urls[0]!, urls[1]!, urls[2]!] : null;
}

const CACHE = new Map<GuardBase, GuardAsset>();

/** This build's files for `base` (resolved once per base; the stand-in until G4's files are in). */
export function guardAsset(base: GuardBase): GuardAsset {
  let a = CACHE.get(base);
  if (!a) {
    a = resolveGuardAsset(base, GUARD_FILES, GUARD_DATA, wrenManifest().urls);
    if (a.problems.length) console.warn(`[guards] ${base}: G4 files not used (${a.problems.join('; ')}); Wren stands in`);
    CACHE.set(base, a);
  }
  return a;
}

/** This build's shield files (null: none yet, the placeholder shield part). */
export function shieldUrls(): [string, string, string, string] | null {
  return resolveShieldUrls(GUARD_FILES);
}

/**
 * The play LOD urls of `manifests` for the offline cache (`warmPlayLods`): every LOD2 first, then LOD0 and LOD1
 * (`minOnly`: LOD2 only, `?gfx=min`); duplicates (the stand-in shares Wren's) once.
 */
export function guardPlayUrls(manifests: readonly GuardManifest[], minOnly: boolean): string[] {
  const out: string[] = [];
  const order = minOnly ? [3] : [3, 1, 2];
  for (const i of order) for (const m of manifests) { const u = m.urls[i]; if (u && !out.includes(u)) out.push(u); }
  return out;
}

/** The bases the helmet drop cuts helmet_std from, in order (broad has helmet_heavy only, no drop anchor). */
const HELMET_BASES: readonly GuardBase[] = ['average', 'lean'];

/**
 * The first guard base in this build whose files hold helmet_std (null: Wren stands in, or none has it), resolved
 * through `assetOf`: the helmet drop loads its LOD1 (`helmetManifest`, `helmetDropSource`, guardHelmet.ts).
 */
export function helmetManifestOf(assetOf: (base: GuardBase) => GuardAsset): GuardManifest | null {
  for (const b of HELMET_BASES) {
    const a = assetOf(b);
    if (!a.standIn && a.manifest.pieces.includes('helmet_std')) return a.manifest;
  }
  return null;
}

/**
 * (gm-polish) Every guard file play fetches, for the menu's offline warm: each base's play LODs (`guardPlayUrls`: every
 * LOD2 first; `minOnly`: LOD2 only), the shield's LOD1 (the only shield LOD drawn, `guardShieldFor`) and the helmet
 * drop's LOD1 (`helmetManifestOf`; at full gfx already among the play LODs, at `?gfx=min` the one LOD1 base file). A base
 * Wren stands in for adds nothing (her files are warmed by her own call); the shield goes only with a real base (a
 * stand-in enforcer keeps the placeholder part).
 */
export function guardWarmUrls(minOnly: boolean): string[] {
  const real = GUARD_BASES.map(guardAsset).filter((a) => !a.standIn);
  const out = guardPlayUrls(real.map((a) => a.manifest), minOnly);
  const shield = real.length ? shieldUrls()?.[LOD_1] : undefined;
  if (shield) out.push(shield);
  const helmet = helmetManifestOf(guardAsset)?.urls[LOD_1];
  if (helmet && !out.includes(helmet)) out.push(helmet);
  return out;
}

/**
 * (gm-polish) The menu warms every guard file into the offline cache as it does Wren's (`warmPlayLods`, queued behind
 * hers), so a first offline play of a base no map has used yet draws the guard figures, not the merged body. Guard
 * models off (`?guardmodels=0`): nothing is fetched. Each url once per page (`warmPlayLods`).
 */
export function warmGuardFiles(minOnly: boolean): Promise<number> {
  return flags.guardModels ? warmPlayLods(guardWarmUrls(minOnly)) : Promise.resolve(0);
}
