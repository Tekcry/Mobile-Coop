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
 * (menu-notes slice 4b, M1 mock-up) A body pose on top of the hold, for the candidate shots X1-X8 (menuSets.ts
 * `CANDIDATE_HERO_SHOTS`), all through the rig's own inputs: a crouch, back to a wall, a frozen doorway check or reload
 * moment, a head glance, another ready position. Absent fields are the plain standing idle.
 */
export interface MenuPoseExtra {
  /** 0 standing .. 1 crouched (the rig's two-foot squat; its one-knee kneel is off in POSTURE). */
  crouch?: number;
  /** Back to a wall behind her: `face` m behind the root (the set's +z), `side` the rig's wall side (-1 / 1). */
  wall?: { readonly side: number; readonly face: number };
  /** Lean round an edge (-1 left .. 1 right). */
  lean?: number;
  /** Head-only glance (rad, yaw right-positive / pitch up). */
  lookYaw?: number;
  lookPitch?: number;
  /** A frozen moment of the reload (0..1). */
  reload?: number;
  /** A frozen moment of the doorway check sweep (0..1). */
  check?: number;
  /** Ready-position weights instead of the hold's. */
  carry?: { readonly low: number; readonly high: number; readonly compressed: number };
  /** Weapon raise instead of the hold's. */
  aim?: number;
}

/** A rig input for the menu's standing idle with a weapon held. One per stage, reused every frame. */
export function menuPoseInput(): RigPose {
  return {
    speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.05, kick: 0, carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true,
    wall: false, wallSide: 0, wallNx: 0, wallNz: 0, wallFace: 0, lean: 0, lookYaw: 0, lookPitch: 0, reload: -1, check: -1,
  };
}

/** Fills `out` (from `menuPoseInput`) with the hold's pose at time `t` (s), plus a candidate shot's body pose `x`
 *  (slice 4b): no allocation. The wall assumes the void origin's z is 0 (the set's +z is world +z). */
export function applyMenuPose(out: RigPose, hold: MenuHold, t: number, x?: MenuPoseExtra): RigPose {
  const p = MENU_POSES[hold];
  const c = out.carry!;
  const pc = x?.carry ?? p.carry;
  c.low = pc.low;
  c.high = pc.high;
  c.compressed = pc.compressed;
  out.weight = p.weight;
  out.aim = x?.aim ?? p.aim;
  out.crouch = x?.crouch ?? 0;
  const w = x?.wall;
  out.wall = !!w;
  out.wallSide = w ? w.side : 0;
  // the wall's outward normal is her facing (-z: she faces the default camera), its face plane n . p = -face
  out.wallNx = 0;
  out.wallNz = w ? -1 : 0;
  out.wallFace = w ? -w.face : 0;
  out.lean = x?.lean ?? 0;
  out.lookYaw = x?.lookYaw ?? 0;
  out.lookPitch = x?.lookPitch ?? 0;
  out.reload = x?.reload ?? -1;
  out.check = x?.check ?? -1;
  // the breath: a slow rise and fall of the muzzle with a smaller, faster second wave so it never reads as a loop
  out.aimPitch = p.sway * (Math.sin(t * p.swayRate) + 0.35 * Math.sin(t * p.swayRate * 2.3 + 1.1));
  return out;
}
