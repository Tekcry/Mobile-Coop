import { describe, expect, it } from 'vitest';
import raw from '../src/config/weapons.json';
import { WEAPONS, WEAPON_IDS } from '../src/weapons/weaponDefs';

/** Real makers, model designations and Splinter Cell weapon names (bible 5.6, CLAUDE.md "No Splinter Cell IP"). */
const BANNED: RegExp[] = [
  /MP5/i, /Kurz/i, /Commando/i, /\b552\b/, /M870/i, /M700/i, /\bFN\b/i, /Five-?7/i, /Five-?seven/i, /Vector/i,
  /P-?90/i, /\bAK\b/i, /AK-?\d/i, /\bTAR\b/i, /TAR-?21/i, /Tavor/i, /M1014/i, /\bM14\b/i, /M249/i, /\bSAW\b/i,
  /Glock/i, /Beretta/i, /Colt/i, /\bSIG\b/i, /Sauer/i, /H&K/i, /Heckler/i, /Koch/i, /Remington/i, /Benelli/i,
  /Mossberg/i, /Kalashnikov/i, /Steyr/i, /\bAUG\b/i, /Barrett/i, /Uzi/i, /Ruger/i, /Walther/i, /\bP45\b/i,
  /SC-?20K/i, /SC-?Pistol/i, /SC\s?SMG/i, /Fisher/i, /Third Echelon/i, /\b9mm\b/i, /Kriss/i,
];

describe('weapon names are original (bible 5.6, locomotion step 16)', () => {
  it('no weapon name in data matches a real brand, designation or SC term', () => {
    const data = raw as unknown as Record<string, { name: string }>;
    for (const id of WEAPON_IDS) {
      const name = data[id]!.name;
      for (const re of BANNED) expect(re.test(name), `${id}: "${name}" matches ${re}`).toBe(false);
    }
  });

  it('names are unique', () => {
    const names = WEAPON_IDS.map((w) => WEAPONS[w].name);
    expect(new Set(names).size).toBe(names.length);
  });
});
