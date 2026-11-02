import { describe, expect, it } from 'vitest';
import { useDiagTurn } from '../src/weapons/backDiag';

// (CT prototype G2 fix r1) a draw reversed mid-holster: the rifle comes back from where it is, with no snap to the sling
// and no sweep round the body (the keyed draw turn is for a draw from the slung gun only)
describe('diagonal sling travel: reversal', () => {
  it('the keyed turn: every centre holster, a draw only from the slot', () => {
    expect(useDiagTurn('backC', false, false)).toBe(true);
    expect(useDiagTurn('backC', true, true)).toBe(true);
    expect(useDiagTurn('backC', true, false)).toBe(false);
    expect(useDiagTurn('thigh', true, true)).toBe(false);
    expect(useDiagTurn('backL', false, false)).toBe(false);
  });

  it('a draw reversed mid-holster stays continuous (no orientation jump, no sweep)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Quaternion, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const rifle = new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root);
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 1, kick: 0, armed: true };
    rifle.hold(rig);
    for (let k = 0; k < 30; k++) rig.animate(1 / 60, pose);
    const q = new Quaternion();
    const prev = new Quaternion();
    const world = (): InstanceType<typeof Quaternion> => {
      rifle.node.computeWorldMatrix(true).decompose(undefined, q, undefined);
      return q;
    };
    const angle = (a: InstanceType<typeof Quaternion>, b: InstanceType<typeof Quaternion>): number => 2 * Math.acos(Math.min(1, Math.abs(Quaternion.Dot(a, b))));
    const muzzleDir = (): InstanceType<typeof Vector3> => rifle.node.getDirection(new Vector3(0, 0, 1));
    // holster a third of the way (the gun turning muzzle down beside the right hip)
    rifle.beginTravel(rig, 'backC', false);
    prev.copyFrom(world());
    for (let k = 1; k <= 6; k++) {
      rifle.travel(rig, k / 18);
      rig.animate(1 / 60, pose);
      prev.copyFrom(world());
    }
    const reversedAt = prev.clone();
    // pressed again: it travels back to the aim pocket from where it is
    rifle.beginTravel(rig, 'backC', true);
    let worst = 0;
    let swept = 0;
    let minFwd = 1;
    for (let k = 1; k <= 12; k++) {
      rifle.travel(rig, k / 12);
      rig.animate(1 / 60, pose);
      const step = angle(prev, world());
      worst = Math.max(worst, step);
      swept += step;
      prev.copyFrom(q);
      minFwd = Math.min(minFwd, muzzleDir().z);
    }
    // no frame of the way back turns the gun more than ~20 deg, and it is about the way it came (the keyed draw from the
    // sling swept it ~360 deg round the body from here)
    expect(worst).toBeLessThan(0.35);
    expect(swept).toBeLessThan(angle(reversedAt, prev) + 0.6);
    expect(swept).toBeLessThan(Math.PI * 0.75);
    // the muzzle never turns back toward the body (root faces +z)
    expect(minFwd).toBeGreaterThan(-0.3);
    rifle.dispose();
    scene.dispose();
  });
});
