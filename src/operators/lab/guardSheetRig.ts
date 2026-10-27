/**
 * (guard-models G10a D1) The guard sheet's rig and piece check, kept apart from the page so a NullEngine test can run
 * them. `sheetRig` builds a tile figure's CharacterRig the way the game builds an enemy's (`src/ai/enemyRig.ts`
 * `buildEnemyRig`): the faction's look (`factionLook`), the kind's build and plates, the guard tables. No guard look
 * wears the operator's tri-lens goggle, so no goggle glow points (`goggleGlow.ts`) are made; the sheet's earlier
 * `defaultLook()` (the operator) drew them on every face. No `merge`: the sheet draws the guard figure, never the rig.
 */
import type { Scene } from '../../core/babylon';
import type { EnemyDef } from '../../ai/enemyDefs';
import { factionLook } from '../../ai/factions';
import { CharacterRig, type PartFactory } from '../../player/characterRig';
import type { Faction } from '../../world/mapDef';
import { SHIELD_ID } from '../guards/gearMask';

/** A tile figure's rig, built as `buildEnemyRig` builds it (without the merged mesh). */
export function sheetRig(scene: Scene, make: PartFactory, def: EnemyDef, faction: Faction, name: string): CharacterRig {
  const look = factionLook(def.look, def.kind, faction);
  const rig = new CharacterRig(scene, make, look, def.height, name, { build: def.build, armor: def.plated });
  rig.guardRows = true;
  return rig;
}

/**
 * The visible piece ids (`applyGear`'s first `count`) the base file does not hold. The riot shield is its own GLB
 * (SPEC 4, `SHIELD_ID`), drawn by `GuardShield`, never a piece of the base file: it is skipped here (a shield that
 * fails to build notes itself).
 */
export function missingPieces(ids: readonly string[], count: number, manifestPieces: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < count && i < ids.length; i++) {
    const id = ids[i]!;
    if (id !== SHIELD_ID && !manifestPieces.includes(id)) out.push(id);
  }
  return out;
}
