import { registerUnlocks, type UnlockItem, type UnlockReq } from '../progression/unlocks';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import type { AvatarLook } from './avatarLook';
import type { PartPattern } from '../world/partLibrary';
import type { WeaponColors } from '../weapons/weaponModel';

export type PartCategory = 'body' | 'head' | 'hair' | 'torso' | 'legs' | 'backpack' | 'helmet' | 'pattern';

interface PartOption {
  value: string;
  name: string;
  req?: UnlockReq;
}

/** Avatar part options per category. Options without `req` are free starters. */
export const PART_OPTIONS: Record<PartCategory, PartOption[]> = {
  body: [
    { value: 'slim', name: 'Slim' },
    { value: 'regular', name: 'Regular' },
    { value: 'heavy', name: 'Heavy' },
  ],
  head: [
    { value: 'round', name: 'Round' },
    { value: 'square', name: 'Square' },
    { value: 'hex', name: 'Hex', req: { level: 3 } },
    { value: 'tall', name: 'Tall', req: { level: 6 } },
  ],
  hair: [
    { value: 'none', name: 'Bald' },
    { value: 'buzz', name: 'Buzz cut' },
    { value: 'long', name: 'Long' },
    { value: 'mohawk', name: 'Mohawk', req: { level: 2 } },
    { value: 'bun', name: 'Bun', req: { level: 4 } },
    { value: 'spikes', name: 'Spikes', req: { level: 8 } },
  ],
  torso: [
    { value: 'tee', name: 'T-shirt' },
    { value: 'vest', name: 'Tactical vest' },
    { value: 'jacket', name: 'Field jacket', req: { level: 3 } },
    { value: 'hoodie', name: 'Hoodie', req: { level: 5 } },
    { value: 'armor', name: 'Plate armour', req: { level: 9, price: 800 } },
  ],
  legs: [
    { value: 'pants', name: 'Fatigues' },
    { value: 'cargo', name: 'Cargo pants' },
    { value: 'shorts', name: 'Shorts', req: { level: 2 } },
    { value: 'armored', name: 'Armoured', req: { level: 7, price: 600 } },
  ],
  backpack: [
    { value: 'none', name: 'None' },
    { value: 'pack', name: 'Day pack' },
    { value: 'radio', name: 'Radio', req: { level: 4 } },
    { value: 'tank', name: 'Air tanks', req: { level: 10 } },
    { value: 'blade', name: 'Blade', req: { level: 5, price: 900 } },
  ],
  helmet: [
    { value: 'none', name: 'None' },
    { value: 'cap', name: 'Cap' },
    { value: 'combat', name: 'Combat helmet' },
    { value: 'beret', name: 'Beret', req: { level: 5 } },
    { value: 'visor', name: 'Visor helmet', req: { level: 8 } },
    { value: 'horns', name: 'Horned helm', req: { level: 6, price: 1200 } },
  ],
  pattern: [
    { value: 'solid', name: 'Solid' },
    { value: 'stripes', name: 'Stripes', req: { level: 3 } },
    { value: 'checker', name: 'Checker', req: { level: 2, price: 400 } },
    { value: 'camo', name: 'Camo', req: { level: 5 } },
    { value: 'digital', name: 'Digital', req: { level: 8 } },
    { value: 'tiger', name: 'Tiger', req: { level: 12 } },
  ],
};

export function partUnlockId(cat: PartCategory, value: string): string {
  return cat === 'pattern' ? `pattern:${value}` : `part:${cat}:${value}`;
}

/** Look fields that map to a category. */
export const LOOK_FIELD: Record<PartCategory, keyof AvatarLook> = {
  body: 'body',
  head: 'head',
  hair: 'hair',
  torso: 'torso',
  legs: 'legs',
  backpack: 'backpack',
  helmet: 'helmet',
  pattern: 'pattern',
};

// ---------- weapon camos ----------
export interface CamoDef {
  id: string;
  name: string;
  colors: WeaponColors;
  pattern?: PartPattern;
}

export const CAMOS: CamoDef[] = [
  { id: 'factory', name: 'Factory', colors: { body: '#2d3238', grip: '#1a1c20', accent: '#4c555f' } },
  { id: 'woodland', name: 'Woodland', colors: { body: '#4b5a3a', grip: '#2a2f22', accent: '#6b5b3a' }, pattern: { name: 'camo', color: '#2a3320', scale: 0.08 } },
  { id: 'desert', name: 'Desert', colors: { body: '#c2a878', grip: '#5e4b30', accent: '#8a7454' }, pattern: { name: 'camo', color: '#8a6d45', scale: 0.08 } },
  { id: 'urban', name: 'Urban', colors: { body: '#8f969c', grip: '#2b2f36', accent: '#5a6168' }, pattern: { name: 'digital', color: '#4a5056', scale: 0.12 } },
  { id: 'tiger', name: 'Tiger', colors: { body: '#d9822b', grip: '#1c1f24', accent: '#2b2f36' }, pattern: { name: 'tiger', color: '#1c1f24', scale: 0.1 } },
  { id: 'gold', name: 'Gold', colors: { body: '#d4af37', grip: '#8a6d1f', accent: '#f2d675' }, pattern: { name: 'hex', color: '#b8932a', scale: 0.08 } },
  { id: 'carbon', name: 'Carbon', colors: { body: '#232629', grip: '#111315', accent: '#3a3f45' }, pattern: { name: 'carbon', color: '#40464d', scale: 0.12 } },
  { id: 'arctic', name: 'Arctic', colors: { body: '#e8eef2', grip: '#9fb3c2', accent: '#c6d4de' }, pattern: { name: 'digital', color: '#a9bccb', scale: 0.12 } },
  { id: 'neon', name: 'Neon', colors: { body: '#1c1f24', grip: '#e35d9c', accent: '#3fc1ff' }, pattern: { name: 'stripes', color: '#e35d9c', scale: 0.12 } },
];

/** Mastery level -> camo unlocked for that weapon. */
export const MASTERY_CAMOS: Record<number, string> = { 1: 'woodland', 2: 'desert', 3: 'urban', 4: 'tiger', 5: 'gold' };
const STORE_CAMOS: Record<string, UnlockReq> = { carbon: { level: 6, price: 600 }, arctic: { level: 10, price: 900 }, neon: { level: 14, price: 1200 } };

export function camoById(id: string): CamoDef {
  return CAMOS.find((c) => c.id === id) ?? CAMOS[0]!;
}

/** Unlock id for a camo on a weapon (mastery camos are per weapon, store camos are global). */
export function camoUnlockId(w: WeaponId, camo: string): string {
  if (camo === 'factory') return 'camo:factory';
  if (STORE_CAMOS[camo]) return `camo:${camo}`;
  return `camo:${w}:${camo}`;
}

// ---------- emotes / tags / emblems ----------
export const EMOTES: { id: string; name: string; req?: UnlockReq }[] = [
  { id: 'wave', name: 'Wave' },
  { id: 'salute', name: 'Salute' },
  { id: 'point', name: 'Point', req: { level: 2, price: 300 } },
  { id: 'dance', name: 'Dance', req: { level: 4 } },
  { id: 'flex', name: 'Flex', req: { level: 7 } },
  { id: 'clap', name: 'Clap', req: { level: 10 } },
  { id: 'laugh', name: 'Laugh', req: { level: 3, price: 500 } },
];

export const TAGS: { id: string; req?: UnlockReq }[] = [
  { id: 'Rookie' },
  { id: 'Operator', req: { level: 5 } },
  { id: 'Veteran', req: { level: 10 } },
  { id: 'Ghost', req: { level: 15 } },
  { id: 'Elite', req: { level: 20 } },
  { id: 'Legend', req: { level: 35 } },
  { id: 'Headhunter', req: { level: 4, price: 1000 } },
  { id: 'Wrecker', req: { level: 6, price: 1500 } },
];

export const EMBLEMS: { id: string; svg: string; req?: UnlockReq }[] = [
  { id: 'chevron', svg: '<path d="M4 14l8-6 8 6M4 19l8-6 8 6"/>' },
  { id: 'star', svg: '<path d="M12 3l2.6 5.6 6 .7-4.5 4 1.3 6L12 16.4 6.6 19.3l1.3-6-4.5-4 6-.7z"/>', req: { level: 3 } },
  { id: 'bolt', svg: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>', req: { level: 6 } },
  { id: 'skull', svg: '<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1 4 2.5 5v3h9v-3c1.5-1 2.5-2.5 2.5-5a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="14.5" cy="10.5" r="1.5"/>', req: { level: 12 } },
  { id: 'crown', svg: '<path d="M3 18h18l-2-10-5 4-2-6-2 6-5-4z"/>', req: { level: 25 } },
];

export function emblemSvg(id: string, size = 20, color = 'currentColor'): string {
  const e = EMBLEMS.find((x) => x.id === id) ?? EMBLEMS[0]!;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${e.svg}</svg>`;
}

// ---------- register everything in the unlock table ----------
const items: UnlockItem[] = [];
for (const [cat, opts] of Object.entries(PART_OPTIONS) as [PartCategory, PartOption[]][]) {
  for (const o of opts) {
    items.push({ id: partUnlockId(cat, o.value), kind: cat === 'pattern' ? 'pattern' : 'part', name: `${o.name}${cat === 'pattern' ? ' pattern' : ''}`, req: o.req ?? {} });
  }
}
items.push({ id: 'camo:factory', kind: 'camo', name: 'Factory camo', req: {} });
for (const [id, req] of Object.entries(STORE_CAMOS)) items.push({ id: `camo:${id}`, kind: 'camo', name: `${camoById(id).name} camo (all weapons)`, req });
for (const w of WEAPON_IDS) {
  for (const [lvl, camo] of Object.entries(MASTERY_CAMOS)) {
    items.push({ id: `camo:${w}:${camo}`, kind: 'camo', name: `${camoById(camo).name} ${w.toUpperCase()}`, req: { mastery: { weapon: w, level: Number(lvl) } } });
  }
}
for (const e of EMOTES) items.push({ id: `emote:${e.id}`, kind: 'emote', name: `${e.name} emote`, req: e.req ?? {} });
for (const t of TAGS) items.push({ id: `tag:${t.id}`, kind: 'tag', name: `"${t.id}" title`, req: t.req ?? {} });
for (const e of EMBLEMS) items.push({ id: `emblem:${e.id}`, kind: 'tag', name: `${e.id[0]!.toUpperCase()}${e.id.slice(1)} emblem`, req: e.req ?? {} });
registerUnlocks(items);
