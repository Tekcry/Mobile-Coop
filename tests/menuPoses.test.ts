import { describe, expect, it } from 'vitest';
import { applyMenuPose, menuPoseInput, MENU_POSES, type MenuHold } from '../src/world/menuPoses';
import rifleAsset from '../src/weapons/assets/rifle.json';

/**
 * (menu-notes slice 3, Michael's notes 5 and 6) The menu's weapon holds on the real rig maths (NullEngine, Wren's own
 * hands, the weapons' grip data): the hands sit on the grips, the support hand stays clear of the rifle magazine (note 5:
 * "the hand clips the magazine in the menu idle stance"), and each hold reads as its ready position.
 */

type Box = [[number, number, number], [number, number, number]];
const bounds = (rifleAsset as unknown as { partBounds: Record<string, Box> }).partBounds;
/** The rifle's magazine (body and base plate), weapon space. */
const MAG: Box[] = [bounds['mag']!, bounds['mag-plate']!];

/** Distance from a point to a box (0 inside). */
function boxDist(p: { x: number; y: number; z: number }, b: Box): number {
  const dx = Math.max(b[0][0] - p.x, 0, p.x - b[1][0]);
  const dy = Math.max(b[0][1] - p.y, 0, p.y - b[1][1]);
  const dz = Math.max(b[0][2] - p.z, 0, p.z - b[1][2]);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

async function rigWithWeapons() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3, Matrix } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const { WREN_HANDS, WREN_HOLSTER, WREN_BACK_MOUNT } = await import('../src/operators/handFrame');
  const { HOLDS } = await import('../src/player/handHold');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  // as operatorRig (playerFigure.ts): Wren's build, her own hands, holster and back mount
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'menu', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
  rig.backMount = WREN_BACK_MOUNT as unknown as typeof rig.backMount;
  const rifle = new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  const pistol = new WeaponModel(scene, lib, WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  const settle = (): void => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
  };
  /** A point on a hand (wrist frame) in the held weapon's space. */
  const inWeapon = (wr: typeof rig.wristL, node: typeof rifle.node, x: number, y: number, z: number) => {
    const inv = Matrix.Invert(node.getWorldMatrix());
    return Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(x, y, z), wr.getWorldMatrix()), inv);
  };
  /** A weapon-space point in the rig root's frame. */
  const inBody = (node: typeof rifle.node, p: readonly number[]) =>
    Vector3.TransformCoordinates(Vector3.TransformCoordinates(new Vector3(p[0], p[1], p[2]), node.getWorldMatrix()), Matrix.Invert(rig.root.getWorldMatrix()));
  return { scene, rig, rifle, pistol, settle, inWeapon, inBody, WEAPONS, WREN_HANDS, HOLDS };
}

describe('menu weapon poses (menu-notes slice 3)', () => {
  it('the sway is small, smooth and allocation-free in use (one input object reused)', () => {
    const inp = menuPoseInput();
    const carry = inp.carry;
    for (const hold of Object.keys(MENU_POSES) as MenuHold[]) {
      let prev = applyMenuPose(inp, hold, 0).aimPitch;
      for (let t = 0; t < 60; t += 1 / 60) {
        const o = applyMenuPose(inp, hold, t);
        expect(o).toBe(inp);
        expect(o.carry).toBe(carry);
        expect(Math.abs(o.aimPitch)).toBeLessThanOrEqual(MENU_POSES[hold].sway * 1.36);
        // a breath, never a twitch: under 0.1 deg per frame
        expect(Math.abs(o.aimPitch - prev)).toBeLessThan(0.0018);
        prev = o.aimPitch;
      }
    }
  });

  it('every hero shot names a known hold, and the main deck shows both the rifle and the pistol in her hands', async () => {
    const { HERO_SHOTS } = await import('../src/world/menuSets');
    const { SHOTS } = await import('../src/world/menuShots');
    const main = new Set(SHOTS.filter((s) => s.contexts.includes('main')).map((s) => s.setup));
    const kinds = new Set<string>();
    for (const h of HERO_SHOTS) {
      const hold = h.hold ?? 'rifle';
      expect(MENU_POSES[hold]).toBeDefined();
      if (main.has(h.id)) kinds.add(MENU_POSES[hold].weapon);
    }
    expect(kinds).toEqual(new Set(['long', 'pistol']));
  });

  it('each hold: the hands on the grips, the support hand clear of the rifle magazine, the muzzle where the ready puts it', async () => {
    const { scene, rig, rifle, pistol, settle, inWeapon, inBody, WEAPONS, WREN_HANDS, HOLDS } = await rigWithWeapons();
    const inp = menuPoseInput();
    // the stage's loadout idle (slice 6, unchanged: the default low ready, aim 0.05) and the void's holds
    const cases: [string, MenuHold | null][] = [['stage', null], ['rifle', 'rifle'], ['pistol', 'pistol'], ['pistolLow', 'pistolLow']];
    for (const [name, hold] of cases) {
      const long = !hold || MENU_POSES[hold].weapon === 'long';
      const held = long ? rifle : pistol;
      const other = long ? pistol : rifle;
      other.holster(rig, long ? 'thigh' : 'backL');
      held.hold(rig);
      const def = long ? WEAPONS.rifle : WEAPONS.pistolSd;
      let magGap = Infinity;
      let gripErr = 0;
      let supportErr = 0;
      for (let k = 0; k < 300; k++) {
        const t = k / 60;
        const pose = hold ? applyMenuPose(inp, hold, t) : { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.05, kick: 0 };
        rig.animate(1 / 60, pose);
        if (k < 120) continue;
        settle();
        // the palms on their hold points (handHold.ts: the palm centre lands on the hold's point)
        const pr = inWeapon(rig.wristR, held.node, ...WREN_HANDS.R.palm);
        const tp = HOLDS.trigger.palm;
        gripErr = Math.max(gripErr, Math.hypot(pr.x - (def.grip[0] + tp[0]), pr.y - (def.grip[1] + tp[1]), pr.z - (def.grip[2] + tp[2])));
        const pl = inWeapon(rig.wristL, held.node, ...WREN_HANDS.L.palm);
        const sp = long ? HOLDS.tube.palm : HOLDS.cup.palm;
        supportErr = Math.max(supportErr, Math.hypot(pl.x - (def.foregrip[0] - sp[0]), pl.y - (def.foregrip[1] + sp[1]), pl.z - (def.foregrip[2] + sp[2])));
        if (long) {
          // the support hand: wrist, palm, knuckles and the first finger joints, all clear of the magazine
          const d = WREN_HANDS.L.d;
          for (const s of [0, 0.048, 0.095, 0.135]) {
            const p = inWeapon(rig.wristL, held.node, d[0] * s, d[1] * s, d[2] * s);
            for (const b of MAG) magGap = Math.min(magGap, boxDist(p, b));
          }
        }
      }
      // bible 5.12.2: weapon grip contact under 2 cm
      expect(gripErr, `${name}: trigger palm off the grip`).toBeLessThan(0.02);
      expect(supportErr, `${name}: support palm off its hold`).toBeLessThan(0.02);
      if (long) expect(magGap, `${name}: support hand to the magazine (m)`).toBeGreaterThan(0.03);
      // the ready position the hold names (rig root frame: +y up, +z forward)
      const g = inBody(held.node, def.grip);
      const m = inBody(held.node, def.muzzle);
      const down = g.y - m.y;
      const fwd = m.z - g.z;
      if (!hold || hold === 'rifle') {
        // low ready: the muzzle well down (about 45 deg) and forward, the trigger hand at the belly / lower chest
        expect(down).toBeGreaterThan(0.25);
        expect(fwd).toBeGreaterThan(0.25);
      } else if (hold === 'pistol') {
        // compressed ready: close to the chest, the muzzle forward and only a little down
        expect(fwd).toBeGreaterThan(0.2);
        expect(Math.atan2(down, fwd)).toBeLessThan(0.6);
        expect(g.z).toBeLessThan(0.25);
        expect(g.y).toBeGreaterThan(1.05);
      } else {
        // pistol low ready: the muzzle down and forward
        expect(down).toBeGreaterThan(0.1);
        expect(fwd).toBeGreaterThan(0.1);
      }
    }
    rifle.dispose();
    pistol.dispose();
    scene.dispose();
  });
});
