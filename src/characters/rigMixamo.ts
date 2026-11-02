/**
 * (mixamo-chars slice c) Dresses a hand-built rig in a Mixamo body: the body hangs on the rig's root, takes the rig's
 * animate inputs (`CharacterRig.onAnimate`) with the move set of the gun in its hands, and the rig's hips, thigh, chest
 * and head nodes follow its bones (the slung guns, the holster, the camera fade and a guard's eye ride on the Mixamo
 * body); a gun held in the hands sits in the Mixamo right hand. The player (Test Chamber) and the guards (Test Chamber)
 * use it.
 */
import { TransformNode, type AbstractMesh, type Matrix, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import { handsWeaponOf } from '../anim/tuneHands';
import { MixamoBody, type GunTravel, type HoldKind, type MixamoModel } from './mixamoBody';
import type { LocoSet } from './locomotion';
import { pickAction, type ActionOut } from './actions';
import { flags } from '../core/flags';
import { CHAMBER_MAP_ID } from '../anim/chamberMapId';
import { goggleColour } from '../operators/runtime/goggle';

/** A rig node's transform in its root's space now (taken before the rig first animates: its rest). */
function restIn(n: TransformNode, root: TransformNode): Matrix {
  const chain: TransformNode[] = [];
  for (let p: TransformNode | null = n; p; p = p.parent instanceof TransformNode ? p.parent : null) chain.unshift(p);
  for (const c of chain) c.computeWorldMatrix(true);
  return n.getWorldMatrix().multiply(root.getWorldMatrix().clone().invert());
}

/** The move set for the gun in a rig's hands (a launcher carries like the rifle). */
export function mixamoSetOf(rig: CharacterRig): LocoSet {
  const hw = handsWeaponOf(rig);
  return hw === 'rifle' || hw === 'launcher' ? 'rifle' : hw === 'pistol' ? 'pistol' : 'unarmed';
}

/** The gun class held in the hands now (on the aim pivot, not mid-draw), or null. */
function heldKind(rig: CharacterRig): HoldKind | null {
  return rig.heldModel && rig.heldModel.node.parent === rig.weaponPivot ? (rig.supportStyle === 'cup' ? 'pistol' : 'rifle') : null;
}

/** (slice i) The gun a draw / holster is carrying now (into `out`), or null. */
function travelOf(rig: CharacterRig, out: GunTravel): GunTravel | null {
  if (!rig.weaponTravel || !rig.travelNode) return null;
  out.node = rig.travelNode;
  out.kind = rig.supportStyle === 'cup' ? 'pistol' : 'rifle';
  return out;
}

export interface RigMixamoOpts {
  tint?: readonly [number, number, number];
  casters?: (m: AbstractMesh) => void;
  /** Standing height (m); default the player's. */
  height?: number;
}

/** (slice d) Moth's body colour (Michael: Moth purple, Wren green; provisional shade). */
export const MOTH_PURPLE: readonly [number, number, number] = [0.5, 0.22, 0.85];

/** (slice d) Whether bodies on map `mapId` are Mixamo bodies (`flags.mixamoChars`, the Test Chamber for now). */
export function mixamoOn(mapId: string): boolean {
  return flags.mixamoChars && mapId === CHAMBER_MAP_ID;
}

/**
 * (slice d) A player's Mixamo body: the host (and a solo player) is Wren (X Bot, her goggle green), a joiner is Moth
 * (Y Bot, purple). Both screens dress the same player the same way (`host` is the owner's role on both ends).
 */
export function dressPlayer(scene: Scene, rig: CharacterRig, host: boolean, casters?: (m: AbstractMesh) => void): { body: MixamoBody; undo: () => void } {
  return dressRig(scene, rig, host ? 'xbot' : 'ybot', { tint: host ? goggleColour(0) : MOTH_PURPLE, casters });
}

/** Puts a Mixamo body on `rig` (call right after the rig is built, before it first animates). `undo` takes it off. */
export function dressRig(scene: Scene, rig: CharacterRig, model: MixamoModel, opts: RigMixamoOpts = {}): { body: MixamoBody; undo: () => void } {
  const r = rig;
  const body = new MixamoBody(scene, model, r.root, opts);
  body.follow(r.root, [
    { node: r.hips, bone: 'Hips', rest: restIn(r.hips, r.root) },
    { node: r.hipR, bone: 'RightUpLeg', rest: restIn(r.hipR, r.root) },
    { node: r.torso, bone: 'Spine2', rest: restIn(r.torso, r.root) },
    { node: r.headNode, bone: 'Head', rest: restIn(r.headNode, r.root) },
  ]);
  const trav: GunTravel = { node: r.weaponPivot, kind: 'rifle' };
  body.holdGun(r.root, r.weaponPivot, r.grip, () => heldKind(r), () => travelOf(r, trav));
  // (slice g) hanging, shimmying and on ladders the body's hands meet the rig's (on the lip, the rungs)
  body.anchorHands(r.wristL, r.wristR);
  // (slice e) a body over the shoulder walks the carry set; an action (hang, ladder, climb-up, strike, throw) fades over
  const act: ActionOut = { clip: null, t: NaN };
  const hook = (dt: number, s: Parameters<NonNullable<CharacterRig['onAnimate']>>[1]): void => {
    if (body.downed) {
      // (slice f) a downed player lies breathing, whatever the pose says
      act.clip = 'downed_lie';
      act.t = NaN;
    } else pickAction(s, r.holdingKnife, act);
    body.update(s, s.carryBody ? 'carry' : mixamoSetOf(r), dt, act);
  };
  r.onAnimate = hook;
  return {
    body,
    undo: () => {
      if (r.onAnimate === hook) r.onAnimate = null;
      body.dispose();
    },
  };
}
