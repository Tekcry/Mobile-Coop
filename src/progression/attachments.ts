import type { WeaponId } from '../weapons/weaponDefs';

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
];

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
