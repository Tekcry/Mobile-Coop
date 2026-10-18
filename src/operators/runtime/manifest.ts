/**
 * Operator asset manifest (step 11d, pure, no Babylon). One skinned GLB per operator per LOD, named as the asset run
 * writes them (`<id>-<lod>.glb`, LOG step 10): hero for the main menu and registered close-up cameras (D21), LOD0-2 for
 * gameplay distance bands. Desktop only (D29): no phone level. URLs come from the build (Vite `?url`, same origin);
 * anything that would leave the page's origin is refused (no runtime network, CLAUDE.md).
 */
import type { GlbModel } from '../lab/glb';
import type { OperatorId } from '../operatorBody';

export const LOD_NAMES = ['hero', 'lod0', 'lod1', 'lod2'] as const;
export type LodName = (typeof LOD_NAMES)[number];

/** LOD index constants (the picker works on numbers so a call never allocates). */
export const LOD_HERO = 0;
export const LOD_0 = 1;
export const LOD_1 = 2;
export const LOD_2 = 3;

export interface OperatorManifest {
  id: OperatorId;
  /** Same-origin URL per LOD, indexed by LOD_HERO..LOD_2; '' = not in the build. */
  urls: readonly [string, string, string, string];
}

/** The game joints every LOD must skin to (the rig's 17 driven joints plus root and body). */
export const REQUIRED_JOINTS = [
  'root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
  'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR',
] as const;

/** Is `url` loadable without leaving the app's origin (relative, root-relative, blob: or data:)? */
export function sameOrigin(url: string, origin?: string): boolean {
  if (/^(blob|data):/i.test(url)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return origin !== undefined && url.startsWith(`${origin}/`);
  return true;
}

/**
 * Builds a manifest from a path -> URL record (`import.meta.glob('…/*.glb', { query: '?url', import: 'default',
 * eager: true })`). Files are matched by name: `<id>-hero.glb`, `<id>-lod0.glb`, ... in any folder.
 */
export function manifestFromUrls(id: OperatorId, files: Readonly<Record<string, string>>): OperatorManifest {
  const urls: [string, string, string, string] = ['', '', '', ''];
  for (const [path, url] of Object.entries(files)) {
    const base = path.slice(path.lastIndexOf('/') + 1);
    for (let i = 0; i < LOD_NAMES.length; i++) if (base === `${id}-${LOD_NAMES[i]}.glb`) urls[i] = url;
  }
  return { id, urls };
}

/** Problems that stop a manifest from being used in game (empty = usable). Hero is optional (LOD0 stands in). */
export function validateManifest(m: OperatorManifest, origin?: string): string[] {
  const out: string[] = [];
  for (let i = LOD_0; i <= LOD_2; i++) if (!m.urls[i]) out.push(`${m.id}: ${LOD_NAMES[i]} missing`);
  m.urls.forEach((u, i) => {
    if (u && !sameOrigin(u, origin)) out.push(`${m.id}: ${LOD_NAMES[i]} leaves the origin (${u})`);
  });
  return out;
}

/** Bit mask of the LODs a manifest can load (bit i = LOD index i). */
export function availableMask(m: OperatorManifest): number {
  let mask = 0;
  for (let i = 0; i < 4; i++) if (m.urls[i]) mask |= 1 << i;
  return mask;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-4;

/**
 * Problems in a parsed LOD file the runtime relies on (empty = usable): one skin with every required joint, joints
 * whose parent is a joint (or whose non-joint ancestors are identity, so bind world = skeleton space), 4 influences,
 * a `-glow` material for the goggle lens.
 */
export function validateModel(model: GlbModel, label = 'model'): string[] {
  const out: string[] = [];
  if (!model.joints.length) out.push(`${label}: no skin`);
  const names = new Set(model.joints.map((j) => model.nodes[j]?.name ?? ''));
  for (const j of REQUIRED_JOINTS) if (!names.has(j)) out.push(`${label}: joint ${j} missing`);
  const isJoint = new Set(model.joints);
  for (const j of model.joints) {
    let p = model.nodes[j]?.parent ?? -1;
    while (p >= 0 && !isJoint.has(p)) {
      const n = model.nodes[p]!;
      const identity = near(n.t[0], 0) && near(n.t[1], 0) && near(n.t[2], 0) && near(Math.abs(n.r[3]), 1);
      if (!identity) out.push(`${label}: non-joint ancestor ${n.name} of ${model.nodes[j]!.name} is not identity`);
      p = n.parent;
    }
  }
  for (const g of model.meshes) {
    if (g.joints.length !== (g.positions.length / 3) * 4) out.push(`${label}: ${g.name} is not 4-influence skinned`);
  }
  if (!model.materials.some((m) => m.name.endsWith('-glow'))) out.push(`${label}: no -glow material (goggle lens)`);
  return out;
}
