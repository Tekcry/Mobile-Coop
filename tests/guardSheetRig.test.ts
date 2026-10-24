/**
 * (guard-models G10a D1) The guard sheet's rig on a NullEngine: built as the game builds an enemy's (`buildEnemyRig`:
 * factionLook, the kind's build and plates), so no tile figure carries the operator's tri-lens goggle glow points; and
 * the sheet's piece check skips the riot shield (its own GLB) while still naming a real missing piece.
 */
import { describe, expect, it } from 'vitest';
import type { Scene } from '../src/core/babylon';
import { ENEMIES, type EnemyDef } from '../src/ai/enemyDefs';
import { SHIELD_ID } from '../src/operators/guards/gearMask';
import { missingPieces } from '../src/operators/lab/guardSheetRig';
import type { Faction } from '../src/world/mapDef';

const FACTIONS: Faction[] = ['urban', 'desert', 'maritime'];
const HUMANS = (Object.values(ENEMIES) as EnemyDef[]).filter((d) => !d.quadruped);

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { sheetRig } = await import('../src/operators/lab/guardSheetRig');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const make = (s: Parameters<typeof parts.instance>[0], h: string, n: string) => parts.instance(s, h, n);
  return { scene, make, sheetRig, CharacterRig, defaultLook };
}

describe('sheetRig', () => {
  it('no human kind in any faction gets a goggle glow point', async () => {
    const { scene, make, sheetRig } = await setup();
    expect(HUMANS.length).toBeGreaterThan(0);
    for (const def of HUMANS) {
      for (const f of FACTIONS) {
        const rig = sheetRig(scene, make, def, f, `sheet-${def.kind}-${f}`);
        expect(scene.getMeshByName('goggleGlow'), `${def.kind} ${f}`).toBeNull();
        expect(scene.meshes.filter((m) => m.name === 'goggleGlow' && m.isEnabled()), `${def.kind} ${f}`).toEqual([]);
        rig.dispose();
      }
    }
  });

  it("the operator's default look would draw them (the old sheet's bug, so the check above can fail)", async () => {
    const { scene, make, CharacterRig, defaultLook } = await setup();
    const rig = new CharacterRig(scene, make, defaultLook(), 1.8, 'operator');
    expect(scene.meshes.some((m) => m.name === 'goggleGlow')).toBe(true);
    rig.dispose();
  });
});

describe('missingPieces', () => {
  it('ignores the riot shield (its own GLB) and still reports a real missing piece', () => {
    const ids = ['broad', 'balaclava', SHIELD_ID, 'plate_heavy', 'unused'];
    expect(SHIELD_ID).toBe('shield_riot');
    expect(missingPieces(ids, 3, ['broad', 'balaclava'])).toEqual([]);
    expect(missingPieces(ids, 4, ['broad', 'balaclava'])).toEqual(['plate_heavy']);
    // only the first `count` ids are visible
    expect(missingPieces(ids, 4, ['broad', 'balaclava', 'plate_heavy'])).toEqual([]);
  });
});
