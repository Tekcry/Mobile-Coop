import type { WeaponId } from '../weapons/weaponDefs';
import { attachmentById } from '../progression/attachments';
import raw from './weapons.json';

/**
 * The campaign arsenal (design bible 5.6, pure). One primary and one sidearm, curated from the 16 weapons in
 * `weapons.json`; the other ten stay in code for sandbox and `?legacy=1`, unused by the campaign.
 *
 * - primary: suppressed rifle (default), suppressed SMG, shotgun (close, loud), marksman rifle (zoom).
 * - sidearm: suppressed pistol (default, carries the light disruptor), heavy pistol (louder, stops armour).
 *   Reserved, not built: the non-lethal dart sidearm (it needs a knockout hit kind first; A28).
 *
 * The save keeps any weapon id (no save-shape change): `campaignLoadout` maps a loadout onto the set at use.
 */
export const CAMPAIGN_ARSENAL = {
  primary: ['rifle', 'smg', 'shotgun', 'dmr'],
  sidearm: ['pistolSd', 'pistol'],
  defaults: { primary: 'rifle', sidearm: 'pistolSd' },
} as const satisfies {
  primary: readonly WeaponId[];
  sidearm: readonly WeaponId[];
  defaults: { primary: WeaponId; sidearm: WeaponId };
};

export type ArsenalSlot = 'primary' | 'sidearm';

const DATA = raw as unknown as Record<string, { slot?: string }>;

/** The arsenal slot a weapon belongs to (data `slot`: `secondary` is a sidearm). */
export function arsenalSlot(w: WeaponId): ArsenalSlot {
  if ((CAMPAIGN_ARSENAL.sidearm as readonly WeaponId[]).includes(w)) return 'sidearm';
  if ((CAMPAIGN_ARSENAL.primary as readonly WeaponId[]).includes(w)) return 'primary';
  return DATA[w]?.slot === 'secondary' ? 'sidearm' : 'primary';
}

/** Whether the campaign offers this weapon. */
export const inCampaignArsenal = (w: WeaponId): boolean =>
  (CAMPAIGN_ARSENAL.primary as readonly WeaponId[]).includes(w) || (CAMPAIGN_ARSENAL.sidearm as readonly WeaponId[]).includes(w);

/** The campaign weapons of one slot, in menu order. */
export const campaignList = (slot: ArsenalSlot): readonly WeaponId[] => CAMPAIGN_ARSENAL[slot];

/**
 * The loadout the campaign uses (pure, applied at use). An id outside the set becomes its slot default; the two
 * entries are always one primary and one sidearm (a second gun of the same slot becomes the other slot's default).
 * The save's order is kept: the first entry is the weapon in hand at the start (the issued kit starts on the
 * suppressed pistol).
 */
export function campaignLoadout(lo: { primary: WeaponId; secondary: WeaponId }): { primary: WeaponId; secondary: WeaponId } {
  const fix = (w: WeaponId): WeaponId => (inCampaignArsenal(w) ? w : CAMPAIGN_ARSENAL.defaults[arsenalSlot(w)]);
  const primary = fix(lo.primary);
  let secondary = fix(lo.secondary);
  const a = arsenalSlot(primary);
  if (arsenalSlot(secondary) === a) secondary = CAMPAIGN_ARSENAL.defaults[a === 'primary' ? 'sidearm' : 'primary'];
  return { primary, secondary };
}

/**
 * The loadout a match issues (pure; the one mapping the match and the co-op lobby share, D8): the campaign maps it
 * onto the curated arsenal (`campaignLoadout`), otherwise the save's loadout as is.
 */
export function issuedLoadout(lo: { primary: WeaponId; secondary: WeaponId }, campaign: boolean): { primary: WeaponId; secondary: WeaponId } {
  return campaign ? campaignLoadout(lo) : lo;
}

/**
 * (A62) The attachment a campaign gun is issued with: bible 5.6's default primary is a suppressed rifle. Applied at
 * use, never written to the save; the save cannot record a removed part, so the issued part fills its slot whenever
 * the player has nothing else there (another barrel part replaces it).
 */
export const CAMPAIGN_ISSUED: Partial<Record<WeaponId, string>> = { rifle: 'suppressor' };

/** A gun's attachments as the campaign issues them (pure; `CAMPAIGN_ISSUED`, A62). */
export function campaignAttachments(w: WeaponId, ids: readonly string[]): string[] {
  const issued = CAMPAIGN_ISSUED[w];
  const a = issued ? attachmentById(issued) : undefined;
  if (!a || ids.some((id) => attachmentById(id)?.slot === a.slot)) return [...ids];
  return [...ids, a.id];
}

/** The campaign kit by role (pure): the long gun and the sidearm of a loadout mapped by `campaignLoadout`. */
export function campaignKit(lo: { primary: WeaponId; secondary: WeaponId }): { primary: WeaponId; sidearm: WeaponId } {
  const m = campaignLoadout(lo);
  return arsenalSlot(m.primary) === 'primary' ? { primary: m.primary, sidearm: m.secondary } : { primary: m.secondary, sidearm: m.primary };
}
