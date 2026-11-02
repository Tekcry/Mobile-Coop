import type { SaveData } from '../save/schema';
import { practiceMode, type SessionStats } from '../game/modes/gameMode';
import type { WeaponId } from './weaponDefs';
import type { LoadoutEntry } from './playerWeapons';
import { combinedMods } from './attachments';
import { campaignAttachments, issuedLoadout } from '../config/arsenal';

/** Pure reads of the save's gear (the weapons and attachments a match is issued). */

/**
 * Weapons for a match from the save (the practice modes: a fixed set; the campaign: the loadout mapped onto the
 * curated arsenal at use, `config/arsenal.ts`, bible 5.6). (sector-restart, M9, A2) Sector Ops issues the campaign kit
 * too: its rifle comes suppressed (A62), as the Kit screen and the co-op lobby loadout already show it.
 */
export function loadoutEntries(s: SaveData, mode: SessionStats['mode'], campaignOpen: boolean): LoadoutEntry[] {
  const campaign = mode === 'sector' && campaignOpen;
  const ids: WeaponId[] = practiceMode(mode) ? ['rifle', 'pistolSd'] : lobbyLoadout(s, campaign);
  return ids.map((id) => {
    const att = campaign ? campaignAttachments(id, s.weapons[id].attachments) : [...s.weapons[id].attachments];
    return { id, mods: combinedMods(att), attachments: att };
  });
}

/**
 * The two weapon ids a match issues, in hand first (pure). Co-op sends this as the lobby loadout (`main.ts`, with
 * `campaignUnlocked`), so the host's weapon checks (`hostWeapon`, `hostShotWeapon`) and remote avatars see the
 * guns the campaign issues (D8).
 */
export function lobbyLoadout(s: SaveData, campaign: boolean): WeaponId[] {
  const lo = issuedLoadout(s.loadout, campaign);
  return [lo.primary, lo.secondary];
}

