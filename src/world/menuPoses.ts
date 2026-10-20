// (menu-notes slice 3, Michael's notes 5 and 6) The menu's weapon holds: pure data and maths, no Babylon import, no
// allocation. Wren holds the Blender rifle or pistol in every void shot (menuSets.ts `hold`); the other weapon sits in
// its carry slot (the rifle on the back plate mount, the pistol in her thigh holster), so both are seen in the main
// menu. The holds are the rig's own ready positions (CharacterRig `carry`, the hands IK'd onto the weapon's grips with
// her solved hand holds), chosen and weighted here for the menu only: nothing in the shared anim clips changes.
import type { RigPose } from '../player/characterRig';

/** The holds a void shot can ask for. */
export type MenuHold = 'rifle' | 'pistol' | 'pistolLow';

export interface MenuPose {
  /** Which weapon is in the hands. */
  weapon: 'long' | 'pistol';
  /** The rig's ready-position weights (CharacterRig `carry`). */
  carry: { readonly low: number; readonly high: number; readonly compressed: number };
  /** Weapon mass factor (weaponCarry `classWeight`: rifle 1, pistol 0.7): the hold's lag. */
  weight: number;
  /** Weapon raise (0 at the ready .. 1 shouldered): a touch off the ready so the gun sits alive in the hands. */
  aim: number;
  /** Idle sway of the weapon: a slow breath in the aim pitch (rad) and its rate (rad/s). */
  sway: number;
  swayRate: number;
}

/**
 * The menu's holds (bible 5.12.2: a trained operator's believable hold at a glance):
 * - rifle: low ready, the muzzle down about 45 degrees and across to her left, stock in the shoulder pocket, the
 *   support palm under the launcher tube ahead of the magazine (weapons.json foregrip).
 * - pistol: compressed ready, both hands close at the chest, the muzzle forward and a little down (the support hand
 *   cupping the trigger hand).
 * - pistolLow: pistol low ready, the muzzle down and forward at the belt line (the equipment shots of her front).
 */
export const MENU_POSES: Readonly<Record<MenuHold, MenuPose>> = {
  rifle: { weapon: 'long', carry: { low: 1, high: 0, compressed: 0 }, weight: 1, aim: 0.05, sway: 0.014, swayRate: 1.1 },
  pistol: { weapon: 'pistol', carry: { low: 0, high: 0, compressed: 1 }, weight: 0.7, aim: 0.05, sway: 0.018, swayRate: 1.25 },
  pistolLow: { weapon: 'pistol', carry: { low: 1, high: 0, compressed: 0 }, weight: 0.7, aim: 0.05, sway: 0.016, swayRate: 1.2 },
};

/**
 * (menu-notes slice 4b / 4d) A shot's pose on top of the hold, through the rig's own inputs. Only W3 (on the sights,
 * Michael's pick from the slice 4b mock-ups) uses it: the weapon raised onto the aim line. Absent = the hold's ready.
 */
export interface MenuPoseExtra {
  /** Weapon raise instead of the hold's (1 = shouldered on the aim line). */
  aim?: number;
}

/** A rig input for the menu's standing idle with a weapon held. One per stage, reused every frame. */
export function menuPoseInput(): RigPose {
  return {
    speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.05, kick: 0, carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true,
    wall: false, wallSide: 0, wallNx: 0, wallNz: 0, wallFace: 0, lean: 0, lookYaw: 0, lookPitch: 0, reload: -1, check: -1,
  };
}

/** Fills `out` (from `menuPoseInput`) with the hold's pose at time `t` (s), plus a shot's pose `x` (W3's raise): no
 *  allocation. The body inputs (crouch, wall, lean, look, reload, check) stay at `menuPoseInput`'s standing values. */
export function applyMenuPose(out: RigPose, hold: MenuHold, t: number, x?: MenuPoseExtra): RigPose {
  const p = MENU_POSES[hold];
  const c = out.carry!;
  c.low = p.carry.low;
  c.high = p.carry.high;
  c.compressed = p.carry.compressed;
  out.weight = p.weight;
  out.aim = x?.aim ?? p.aim;
  // the breath: a slow rise and fall of the muzzle with a smaller, faster second wave so it never reads as a loop
  out.aimPitch = p.sway * (Math.sin(t * p.swayRate) + 0.35 * Math.sin(t * p.swayRate * 2.3 + 1.1));
  return out;
}
