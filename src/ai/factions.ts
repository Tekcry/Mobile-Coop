/**
 * Enemy faction colourways per map (pure): the uniformed archetypes wear the faction's palette, so the same
 * squads read as a city security company, desert militia or a maritime unit. Silhouettes (headgear, armour,
 * shield, hood, beret) stay per archetype; only colours change.
 */
import type { AvatarLook } from '../cosmetics/avatarLook';
import type { Faction } from '../world/mapDef';

interface Palette {
  torso: string;
  legs: string;
  accent: string;
  helmet: string;
  backpack: string;
}

export const FACTIONS: Record<Faction, Palette> = {
  urban: { torso: '#3b4048', legs: '#2c3036', accent: '#1f2328', helmet: '#22262b', backpack: '#2d3238' },
  desert: { torso: '#9a8462', legs: '#7a6a50', accent: '#5a4c36', helmet: '#6e5e44', backpack: '#7d6b4e' },
  maritime: { torso: '#2f3f56', legs: '#26323f', accent: '#18202b', helmet: '#1c2633', backpack: '#2a3646' },
};

/** Kinds that wear the faction's uniform (the runner is a civilian-clothed thug, the dog is a dog). */
const UNIFORMED = new Set(['grunt', 'heavy', 'sniper', 'enforcer', 'droneOp', 'officer']);

/** The look `kind` wears for `faction` (heavy / enforcer keep their armour accent, the officer his jacket colour). */
export function factionLook(look: AvatarLook, kind: string, faction: Faction = 'urban'): AvatarLook {
  if (!UNIFORMED.has(kind)) return look;
  const f = FACTIONS[faction];
  const c = { ...look.colors };
  c.legs = f.legs;
  c.backpack = f.backpack;
  if (kind === 'officer') {
    // the jacket stays the officer's; trousers and kit in the faction's colours
    return { ...look, colors: c };
  }
  c.torso = f.torso;
  c.helmet = kind === 'heavy' || kind === 'enforcer' ? '#14161a' : f.helmet;
  if (kind !== 'heavy' && kind !== 'enforcer' && kind !== 'droneOp') c.accent = f.accent;
  return { ...look, colors: c };
}
