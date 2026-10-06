import type { ModelPart, WeaponDef, WeaponId } from '../weapons/weaponDefs';

export type AttachmentSlot = 'optic' | 'barrel' | 'underbarrel' | 'magazine';

export interface AttachmentDef {
  id: string;
  name: string;
  slot: AttachmentSlot;
  desc: string;
  /** Multiplicative stat modifiers (1 = unchanged). */
  mods: Partial<{ damage: number; magSize: number; recoil: number; spreadHip: number; spreadAds: number; adsZoom: number; reload: number; noise: number }>;
  /** Weapons that can mount it (empty = all). */
  weapons: WeaponId[];
}

export const ATTACHMENTS: AttachmentDef[] = [
  { id: 'reddot', name: 'Red Dot', slot: 'optic', desc: 'Tighter ADS spread', mods: { spreadAds: 0.8 }, weapons: [] },
  { id: 'scope4x', name: '4x Scope', slot: 'optic', desc: 'Stronger zoom, steadier aim', mods: { adsZoom: 0.7, spreadAds: 0.7 }, weapons: ['rifle', 'sniper'] },
  { id: 'suppressor', name: 'Suppressor', slot: 'barrel', desc: 'Enemies hear you less, -5% damage', mods: { noise: 0.45, damage: 0.95 }, weapons: [] },
  { id: 'comp', name: 'Compensator', slot: 'barrel', desc: '-15% recoil', mods: { recoil: 0.85 }, weapons: ['smg', 'rifle', 'pistol'] },
  { id: 'grip', name: 'Vertical Grip', slot: 'underbarrel', desc: '-12% recoil, tighter hip fire', mods: { recoil: 0.88, spreadHip: 0.9 }, weapons: ['smg', 'rifle', 'shotgun'] },
  { id: 'laser', name: 'Laser Sight', slot: 'underbarrel', desc: '-20% hip fire spread', mods: { spreadHip: 0.8 }, weapons: [] },
  { id: 'extmag', name: 'Extended Mag', slot: 'magazine', desc: '+25% magazine, slower reload', mods: { magSize: 1.25, reload: 1.1 }, weapons: [] },
  { id: 'fastmag', name: 'Fast Mag', slot: 'magazine', desc: '-20% reload time', mods: { reload: 0.8 }, weapons: [] },
  { id: 'lethalBolts', name: 'Lethal Bolts', slot: 'magazine', desc: 'Broadheads: bolts kill instead of knocking out', mods: {}, weapons: ['crossbow'] },
];

const CYL: [number, number, number] = [1.5708, 0, 0];

/**
 * The weapon as built with its attachments (pure): the parts the attachments add or change (optic, suppressor or
 * compensator on the muzzle - the muzzle moves out -, vertical grip / laser under the front, a longer or doubled
 * magazine, red broadhead bolts). Carry placement and clipping checks use these extents too.
 */
export function withAttachments(def: WeaponDef, ids: readonly string[]): WeaponDef {
  const att = sanitizeAttachments(def.id, ids);
  if (!att.length) return def;
  const model: ModelPart[] = def.model.map((p) => ({ ...p, size: [...p.size] as [number, number, number], pos: [...p.pos] as [number, number, number] }));
  const muzzle: [number, number, number] = [...def.muzzle];
  const barrel = model.find((p) => p.role === 'barrel');
  const bd = barrel ? barrel.size[0] : 0.016;
  const optic = model.find((p) => p.role === 'optic');
  const hasScope = model.some((p) => p.role === 'scope');
  const topY = optic ? optic.pos[1] - optic.size[1] / 2 : muzzle[1] + 0.04;
  const oz = optic ? optic.pos[2] : 0.06;
  for (const id of att) {
    switch (id) {
      case 'reddot':
        if (optic) {
          optic.size = [0.03, 0.04, 0.055];
          model.push({ shape: 'box', size: [0.022, 0.022, 0.008], pos: [0, optic.pos[1] + 0.005, optic.pos[2] + 0.028], color: '#d23a3a', role: 'lens' });
        } else model.push({ shape: 'box', size: [0.03, 0.04, 0.055], pos: [0, topY + 0.02, oz], color: 'grip', role: 'optic' });
        break;
      case 'scope4x':
        if (!hasScope) {
          if (optic) model.splice(model.indexOf(optic), 1);
          model.push({ shape: 'cyl', size: [0.034, 0.22, 0.034], pos: [0, topY + 0.035, oz], rot: CYL, color: 'accent', role: 'scope' });
        }
        break;
      case 'suppressor': {
        const len = def.class === 'pistol' ? 0.12 : 0.16;
        model.push({ shape: 'cyl', size: [bd + 0.018, len, bd + 0.018], pos: [0, muzzle[1], muzzle[2] + len / 2], rot: CYL, color: 'accent', role: 'suppressor' });
        muzzle[2] += len;
        break;
      }
      case 'comp':
        model.push({ shape: 'cyl', size: [bd + 0.01, 0.05, bd + 0.01], pos: [0, muzzle[1], muzzle[2] + 0.025], rot: CYL, color: 'grip', role: 'comp' });
        muzzle[2] += 0.05;
        break;
      case 'grip':
        model.push({ shape: 'box', size: [0.026, 0.075, 0.03], pos: [0, def.foregrip[1] - 0.045, def.foregrip[2]], color: 'grip', role: 'vgrip' });
        break;
      case 'laser':
        model.push({ shape: 'box', size: [0.022, 0.022, 0.06], pos: [0.032, def.foregrip[1] + 0.02, def.foregrip[2] + 0.04], color: '#3a3f45', role: 'laser' });
        break;
      case 'extmag': {
        const mag = model.find((p) => p.role === 'mag');
        if (mag) {
          const dy = mag.size[1] * 0.35;
          mag.size[1] += dy;
          mag.pos[1] -= dy / 2;
        }
        break;
      }
      case 'fastmag': {
        const mag = model.find((p) => p.role === 'mag');
        if (mag) model.push({ ...mag, size: [...mag.size] as [number, number, number], pos: [mag.pos[0] + mag.size[0] + 0.004, mag.pos[1] - 0.01, mag.pos[2]], role: 'mag2' });
        break;
      }
      case 'lethalBolts':
        if (barrel) barrel.color = '#b03030';
        break;
    }
  }
  return { ...def, model, muzzle };
}

export function attachmentById(id: string): AttachmentDef | undefined {
  return ATTACHMENTS.find((a) => a.id === id);
}

export function attachmentsFor(w: WeaponId): AttachmentDef[] {
  return ATTACHMENTS.filter((a) => a.weapons.length === 0 || a.weapons.includes(w));
}

/** At most one attachment per slot, only compatible ones. */
export function sanitizeAttachments(w: WeaponId, ids: readonly string[]): string[] {
  const seen = new Set<AttachmentSlot>();
  const out: string[] = [];
  for (const id of ids) {
    const a = attachmentById(id);
    if (!a || seen.has(a.slot) || (a.weapons.length && !a.weapons.includes(w))) continue;
    seen.add(a.slot);
    out.push(id);
  }
  return out;
}

/** Combined multiplicative modifiers of a set of attachments. */
export function combinedMods(ids: readonly string[]): Required<AttachmentDef['mods']> {
  const m = { damage: 1, magSize: 1, recoil: 1, spreadHip: 1, spreadAds: 1, adsZoom: 1, reload: 1, noise: 1 };
  for (const id of ids) {
    const a = attachmentById(id);
    if (!a) continue;
    for (const [k, v] of Object.entries(a.mods)) m[k as keyof typeof m] *= v as number;
  }
  return m;
}
