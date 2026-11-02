import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import { sanitizeAttachments } from '../weapons/attachments';
import { GADGET_IDS } from '../game/gadgets';

/** Current save schema version. Bump + add a migration in migrations.ts. */
export const SAVE_VERSION = 11;

/** What the save keeps per weapon: the attachments fitted (v11: upgrades, camo and kill counts are gone). */
export interface WeaponGear {
  attachments: string[];
}

/** A named gear choice: the two weapons and the gadget. */
export interface LoadoutPreset {
  name: string;
  primary: string;
  secondary: string;
  gadget: string;
}

export const PRESETS = 3;

export function defaultPresets(): LoadoutPreset[] {
  return [
    { name: 'Silent', primary: 'pistolSd', secondary: 'rifle', gadget: 'gas' },
    { name: 'Flash', primary: 'pistolSd', secondary: 'rifle', gadget: 'flash' },
    { name: 'Loud', primary: 'rifle', secondary: 'pistolSd', gadget: 'frag' },
  ];
}

/**
 * The profile (IndexedDB `profile` / `main`). v11 keeps only the player's name and gear; XP, credits, unlocks, upgrades,
 * the suit, HQ, challenges, the saved look and camos, the player tag and the per-mission best results were removed in
 * clean-up stage I. Records live in their own `kv` keys (campaign, course, sector, ratings).
 */
export interface SaveData {
  version: typeof SAVE_VERSION;
  createdAt: number;
  updatedAt: number;
  profile: { name: string };
  weapons: Record<WeaponId, WeaponGear>;
  loadout: { primary: WeaponId; secondary: WeaponId };
  /** Three gear presets and the one in use (only the gadget is read). */
  presets: LoadoutPreset[];
  preset: number;
}

export function defaultWeaponGear(): WeaponGear {
  return { attachments: [] };
}

export function defaultSave(now = Date.now()): SaveData {
  const weapons = {} as Record<WeaponId, WeaponGear>;
  for (const w of WEAPON_IDS) weapons[w] = defaultWeaponGear();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: { name: 'Operator' },
    weapons,
    loadout: { primary: 'pistolSd', secondary: 'rifle' },
    presets: defaultPresets(),
    preset: 0,
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
const str = (v: unknown, max: number, d: string): string => (typeof v === 'string' ? v.slice(0, max) : d);
const isWeapon = (v: unknown): v is WeaponId => WEAPON_IDS.includes(v as WeaponId);

/** Clamp/repair a current-version save (after migration). Never throws. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!isObj(raw)) return d;
  const p = isObj(raw.profile) ? raw.profile : {};
  const weapons = {} as Record<WeaponId, WeaponGear>;
  const rw = isObj(raw.weapons) ? raw.weapons : {};
  for (const w of WEAPON_IDS) {
    const e = isObj(rw[w]) ? (rw[w] as Obj) : {};
    weapons[w] = { attachments: sanitizeAttachments(w, Array.isArray(e.attachments) ? e.attachments.filter((x): x is string => typeof x === 'string') : []) };
  }
  const lo = isObj(raw.loadout) ? raw.loadout : {};
  const primary: WeaponId = isWeapon(lo.primary) ? lo.primary : 'pistolSd';
  let secondary: WeaponId = isWeapon(lo.secondary) ? lo.secondary : 'rifle';
  if (secondary === primary) secondary = primary === 'rifle' ? 'pistolSd' : 'rifle';
  const presets = defaultPresets();
  if (Array.isArray(raw.presets)) {
    raw.presets.slice(0, PRESETS).forEach((q, i) => {
      if (!isObj(q)) return;
      presets[i] = {
        name: str(q.name, 16, presets[i]!.name).replace(/[<>]/g, '') || presets[i]!.name,
        primary: isWeapon(q.primary) ? q.primary : presets[i]!.primary,
        secondary: isWeapon(q.secondary) ? q.secondary : presets[i]!.secondary,
        // (G7 / G115) only a gadget that still exists (the tri-rotor drone is gone)
        gadget: (GADGET_IDS as readonly string[]).includes(q.gadget as string) ? (q.gadget as string) : presets[i]!.gadget,
      };
    });
  }
  return {
    version: SAVE_VERSION,
    createdAt: int(raw.createdAt, 0, 8.64e15, d.createdAt),
    updatedAt: int(raw.updatedAt, 0, 8.64e15, d.updatedAt),
    profile: { name: str(p.name, 20, d.profile.name).replace(/[<>]/g, '') || d.profile.name },
    weapons,
    loadout: { primary, secondary },
    presets,
    preset: int(raw.preset, 0, PRESETS - 1, 0),
  };
}
