import type { WeaponId } from '../weapons/weaponDefs';

export type UnlockKind = 'weapon' | 'attachment' | 'camo' | 'part' | 'pattern' | 'emote' | 'tag' | 'color';

export interface UnlockReq {
  level?: number;
  /** Requires mastery level on a weapon. */
  mastery?: { weapon: WeaponId; level: number };
  /** Credits price to buy once requirements are met (0 = free when met). */
  price?: number;
}

export interface UnlockItem {
  id: string;
  kind: UnlockKind;
  name: string;
  req: UnlockReq;
}

const W = (id: WeaponId, name: string, level: number, price: number): UnlockItem => ({ id: `weapon:${id}`, kind: 'weapon', name, req: { level, price } });
const A = (id: string, name: string, level: number, price: number): UnlockItem => ({ id: `att:${id}`, kind: 'attachment', name, req: { level, price } });

/** Every unlockable in the game. Cosmetic entries are added by the cosmetics catalogue. */
export const UNLOCKS: UnlockItem[] = [
  W('rifle', '552 Commando', 1, 0),
  W('pistol', 'P45 Compact', 1, 0),
  W('smg', 'MP5 Kurz', 2, 600),
  W('pistolSd', '9mm SD', 2, 500),
  W('fiveseven', 'FN Five-7', 3, 700),
  W('shotgun', 'M870 Pump', 4, 1200),
  W('ak', 'AK-74', 4, 1100),
  W('vector', 'Vector .45', 5, 1400),
  W('breacher', 'Breacher', 5, 900),
  W('sniper', 'M700 Bolt', 6, 2000),
  W('crossbow', 'Silent Crossbow', 6, 1600),
  W('p90', 'P-90', 7, 1800),
  W('tavor', 'TAR-21', 8, 2200),
  W('semiShotgun', 'M1014 Semi', 9, 2400),
  W('dmr', 'M14 DMR', 10, 2800),
  W('lmg', 'M249 SAW', 12, 3200),
  A('reddot', 'Red Dot', 2, 250),
  A('laser', 'Laser Sight', 3, 300),
  A('grip', 'Vertical Grip', 4, 400),
  A('fastmag', 'Fast Mag', 5, 450),
  A('comp', 'Compensator', 6, 500),
  A('extmag', 'Extended Mag', 8, 600),
  A('suppressor', 'Suppressor', 10, 800),
  A('scope4x', '4x Scope', 12, 900),
  A('lethalBolts', 'Lethal Bolts', 6, 400),
];

export const STARTER_UNLOCKS = ['weapon:rifle', 'weapon:pistol'];

export function registerUnlocks(items: UnlockItem[]): void {
  for (const it of items) if (!UNLOCKS.some((u) => u.id === it.id)) UNLOCKS.push(it);
}

export function unlockById(id: string): UnlockItem | undefined {
  return UNLOCKS.find((u) => u.id === id);
}

export interface UnlockContext {
  level: number;
  credits: number;
  mastery: (w: WeaponId) => number;
  owned: ReadonlySet<string>;
}

export type UnlockState = 'owned' | 'buyable' | 'locked' | 'free';

/** 'free' = requirements met and price 0 (auto-grant). */
export function unlockState(item: UnlockItem, ctx: UnlockContext): UnlockState {
  if (ctx.owned.has(item.id)) return 'owned';
  const r = item.req;
  if (r.level !== undefined && ctx.level < r.level) return 'locked';
  if (r.mastery && ctx.mastery(r.mastery.weapon) < r.mastery.level) return 'locked';
  if (!r.price) return 'free';
  return 'buyable';
}

export function describeReq(item: UnlockItem): string {
  const r = item.req;
  const parts: string[] = [];
  if (r.level) parts.push(`Level ${r.level}`);
  if (r.mastery) parts.push(`${r.mastery.weapon.toUpperCase()} mastery ${r.mastery.level}`);
  if (r.price) parts.push(`${r.price} cr`);
  return parts.join(' · ') || 'Free';
}
