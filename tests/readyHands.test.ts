import { describe, expect, it } from 'vitest';

/**
 * (locomotion step 21, D5.6 / M14, PC1) Holstered arms: relaxed at the sides with a slight elbow bend standing,
 * walking and jogging (M14 ~10-25 deg; was A42's 60-90 hands in front), softly bent crouched (never straight: PC1 saw
 * 5.1 deg), pumping at the sprint (A76); a counter swing (the arm opposite the leg forward) that grows with speed; the
 * forearms clear of the thighs.
 */
describe('holstered arms (D5.6 trained posture, M14 relaxed)', () => {
  it('elbow bend per stance and gear, counter swing, clear of the thighs', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    rig.carrier = true;
    const a = new Vector3();
    const b = new Vector3();
    const flex = (s: 'L' | 'R'): number => {
      const S = (s === 'L' ? rig.shoulderL : rig.shoulderR).getAbsolutePosition();
      const E = (s === 'L' ? rig.elbowL : rig.elbowR).getAbsolutePosition();
      const W = (s === 'L' ? rig.wristL : rig.wristR).getAbsolutePosition();
      E.subtractToRef(S, a).normalize();
      W.subtractToRef(E, b).normalize();
      return (Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(a, b)))) * 180) / Math.PI;
    };
    // segment-segment distance by sampling (test only)
    type V = InstanceType<typeof Vector3>;
    const segDist = (p0: V, p1: V, q0: V, q1: V): number => {
      let best = Infinity;
      for (let i = 0; i <= 6; i++)
        for (let j = 0; j <= 6; j++) best = Math.min(best, Vector3.Distance(Vector3.Lerp(p0, p1, i / 6), Vector3.Lerp(q0, q1, j / 6)));
      return best;
    };
    // [name, crouch, speed, dash, elbow min, elbow max, min swing p2p (m)]
    const cases: [string, number, number, number, number, number, number][] = [
      ['stand', 0, 0, 0, 8, 30, 0],
      ['stand-walk', 0, 1.2, 0, 8, 30, 0.08],
      // (G1, audit rows 8 / 22) the jog pumps its arms (CT 110038: elbows ~80-90 deg, hands between hip and lower chest)
      ['stand-jog', 0, 3, 0, 70, 95, 0.15],
      ['stand-sprint', 0, 5.5, 1, 55, 95, 0.2],
      // (anim-cleanup, CT Core's P1c handover) crouched the hands come in by the thighs just above the knees over the
      // 35-45 degree crouch: ~52 degrees at the elbow (it was a 15-50 soft bend, the hands then hanging ahead of the
      // knees towards the ground); still never straight, the forearms still clear of the thighs (below)
      ['crouch', 1, 0, 0, 15, 60, 0],
      ['crouch-walk', 1, 0.8, 0, 15, 60, 0.03],
      ['crouch-run', 1, 2.5, 0, 15, 60, 0.08],
    ];
    const out: Record<string, number[]> = {};
    for (const [name, crouch, speed, dash] of cases) {
      const pose = { speed, localX: 0, localZ: speed, grounded: true, crouch, aimPitch: 0, aim: 0, kick: 0, armed: false, dash };
      let lo = 180;
      let hi = 0;
      let zlo = Infinity;
      let zhi = -Infinity;
      let clear = Infinity;
      let corr = 0;
      for (let k = 0; k < 180; k++) {
        rig.root.position.z += speed / 60;
        rig.animate(1 / 60, pose);
        rig.root.computeWorldMatrix(true);
        for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
        if (k < 90) continue;
        for (const s of ['L', 'R'] as const) {
          const f = flex(s);
          lo = Math.min(lo, f);
          hi = Math.max(hi, f);
          const E = (s === 'L' ? rig.elbowL : rig.elbowR).getAbsolutePosition();
          const W = (s === 'L' ? rig.wristL : rig.wristR).getAbsolutePosition();
          const H = (s === 'L' ? rig.hipL : rig.hipR).getAbsolutePosition();
          const K = (s === 'L' ? rig.kneeL : rig.kneeR).getAbsolutePosition();
          clear = Math.min(clear, segDist(E, W, H, K));
        }
        const root = rig.root.position.z;
        const wr = rig.wristR.getAbsolutePosition().z - root;
        const wl = rig.wristL.getAbsolutePosition().z - root;
        zlo = Math.min(zlo, wr);
        zhi = Math.max(zhi, wr);
        // the right hand forward with the left foot forward (counter swing)
        corr += (wr - wl) * (rig.ankleL.getAbsolutePosition().z - rig.ankleR.getAbsolutePosition().z);
      }
      out[name] = [+lo.toFixed(1), +hi.toFixed(1), +(zhi - zlo).toFixed(3), +clear.toFixed(3), +corr.toFixed(4)];
    }
    const msg = JSON.stringify(out);
    for (const [name, , speed, , mn, mx, sw] of cases) {
      const [lo, hi, swing, clear, corr] = out[name]!;
      expect(lo, `${name} ${msg}`).toBeGreaterThanOrEqual(mn);
      expect(hi, `${name} ${msg}`).toBeLessThanOrEqual(mx);
      expect(swing, `${name} ${msg}`).toBeGreaterThanOrEqual(sw);
      // forearm vs thigh capsules (0.04 + 0.075 m) clear, within the audit's 0.02 m self-clip tolerance
      expect(clear, `${name} ${msg}`).toBeGreaterThan(0.115 - 0.02);
      if (speed > 0) expect(corr, `${name} ${msg}`).toBeGreaterThan(0);
    }
    scene.dispose();
  });

  it('(fix 21-2) thighGear: true iff a visible weapon is holstered on the thigh', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rig = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
    const pistol = new WeaponModel(scene, lib, WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.root);
    const rifle = new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root);
    pistol.holster(rig, 'thigh');
    expect(rig.thighGear).toBe(true);
    // hidden in its slot: no gear on the thigh
    pistol.setVisible(false);
    expect(rig.thighGear).toBe(false);
    pistol.setVisible(true);
    expect(rig.thighGear).toBe(true);
    // another model's hold / holster elsewhere never clears it
    rifle.holster(rig, 'sling');
    rifle.hold(rig);
    expect(rig.thighGear).toBe(true);
    // drawn: cleared; holstered again: set
    pistol.inHand(rig);
    expect(rig.thighGear).toBe(false);
    pistol.holster(rig, 'thigh');
    expect(rig.thighGear).toBe(true);
    pistol.dispose();
    expect(rig.thighGear).toBe(false);
    rifle.dispose();
    scene.dispose();
  });
});
