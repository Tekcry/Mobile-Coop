// (marlow-bays item 29 phase 2, Michael: "when editing weapon stances, gun in hand and support modified the same hand")
// The probe: a Wren rig with a rifle at low ready, each hand slider moved, both wrists measured. The support hand
// sliders move only the support (left) hand, the gun hand's Hands & feet sliders only the gun (right) hand; the "Gun in
// the gun hand" sliders move the gun about her grip, so the gun hand stays and the support hand rides on the gun (the
// cause of the report: those sliders were named "Grip ..." and looked like a second support control). The labels name
// both hands by their job in an armed row.
import { describe, expect, it } from 'vitest';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { handRoles, plainLabel, roleWords } from '../src/ui/tunerLayout';
import { tuneTarget } from '../src/ui/tunerTarget';

async function probe(sliders: readonly [string, string, number][]): Promise<Record<string, { l: number; r: number }>> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const { TUNE_STATE, tuneBegin, tuneEnd } = await import('../src/anim/tune');
  const { tuneSet, tuneResetAll } = await import('../src/anim/tuneRegistry');
  const { tuneV2Frame } = await import('../src/anim/tuneV2Sections');
  const { handsWeaponOf } = await import('../src/anim/tuneHands');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (shape: Parameters<typeof lib.instance>[0], hex: string, slot?: Parameters<typeof lib.instance>[2]) => lib.instance(shape, hex, slot);
  const run = (): { L: { x: number; y: number; z: number }; R: { x: number; y: number; z: number } } => {
    const op = operatorRig(scene, make, defaultLook(), 'hands');
    const rig: CharacterRig = op.rig;
    new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
    const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing', armed: true };
    for (let k = 0; k < 60; k++) {
      tuneBegin(pose, rig, 0);
      tuneV2Frame(TUNE_STATE.body, handsWeaponOf(rig));
      try {
        rig.animate(1 / 60, pose);
      } finally {
        tuneEnd(rig);
      }
    }
    const L = rig.wristL.getAbsolutePosition().clone();
    const R = rig.wristR.getAbsolutePosition().clone();
    op.figure.dispose();
    rig.dispose();
    return { L, R };
  };
  const out: Record<string, { l: number; r: number }> = {};
  try {
    tuneResetAll();
    const b = run();
    for (const [g, id, v] of sliders) {
      tuneResetAll();
      expect(tuneSet(g, id, v), `${g} ${id}`).toBe(true);
      const r = run();
      const d = (a: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }): number => Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z) * 100;
      out[id] = { l: d(r.L, b.L), r: d(r.R, b.R) };
    }
  } finally {
    tuneResetAll();
    scene.dispose();
  }
  return out;
}

describe('tuner v3: the gun hand and the support hand', () => {
  it('the support hand sliders move only the support hand; each hand slider only its hand', async () => {
    const W = 'weapon.rifle.lowReady';
    const H = 'hand.rifle.lowReady';
    const got = await probe([
      [W, 'supportSlide', 0.12],
      [W, 'supportOut', 0.05],
      [W, 'supportUp', 0.05],
      [W, 'supportFwd', 0.05],
      [W, 'gunX', 0.07],
      [H, 'handRFwd', 0.15],
      [H, 'handLUp', 0.15],
    ]);
    for (const id of ['supportSlide', 'supportOut', 'supportUp', 'supportFwd', 'handLUp']) {
      expect(got[id]!.l, `${id} moves the support hand`).toBeGreaterThan(1);
      expect(got[id]!.r, `${id} leaves the gun hand`).toBeLessThan(0.01);
    }
    expect(got.handRFwd!.r).toBeGreaterThan(1);
    expect(got.handRFwd!.l).toBeLessThan(0.01);
    // the gun moves in her gun hand: the gun hand stays, the support hand stays on the gun
    expect(got.gunX!.r).toBeLessThan(0.01);
    expect(got.gunX!.l).toBeGreaterThan(1);
  }, 120000);

  it('names the hands by their job in an armed row, and says the support hand follows the gun', () => {
    expect(handRoles('hand', 'hand.rifle.lowReady')).toBe(true);
    expect(handRoles('weapon', 'weapon.pistol.aim')).toBe(true);
    expect(handRoles('hand', 'hand.none.walk')).toBe(false);
    expect(handRoles('body', 'jog')).toBe(false);
    expect(roleWords(plainLabel('hand', 'handRFwd', ''), true)).toBe('Gun hand forward');
    expect(roleWords(plainLabel('hand', 'handLUp', ''), true)).toBe('Support hand up');
    expect(roleWords(plainLabel('weapon', 'indexRCurl', ''), true)).toBe('Gun hand index curl');
    expect(roleWords(plainLabel('hand', 'handLUp', ''), false)).toBe('Left hand up');
    expect(plainLabel('weapon', 'gunX', '')).toBe('Gun right in the gun hand');
    expect(plainLabel('weapon', 'supportOut', '')).toBe('Support hand out');
    expect(tuneTarget('weapon', 'gunX').label).toMatch(/support hand follows/);
    expect(roleWords(tuneTarget('weapon', 'thumbLCurl').label, true)).toBe('Support hand fingers');
  });
});
