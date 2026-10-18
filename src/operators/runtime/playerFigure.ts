/**
 * (operators step 11e, D31 / G123) Wren is the body of every player: solo, the local co-op player and the remote
 * partner, and the main menu's preview. This builds a player's CharacterRig at Wren's height (G74: 1.68 m, the G72
 * proportions) and puts her OperatorFigure on it.
 *
 * - The rig stays the pose authority (animation, IK, sockets, light-meter samples, hit volumes); its own body parts are
 *   still built (back gear and thigh widths are measured from them for the weapon carry) but never drawn, and no voxel
 *   body is built for it.
 * - Gameplay reads nothing here (CLAUDE.md): the controller capsule, speeds, noise and camera are unchanged (G38).
 */
import type { AbstractMesh, Camera, Scene } from '../../core/babylon';
import { CharacterRig, setVoxelBodies, type PartFactory } from '../../player/characterRig';
import type { AvatarLook } from '../../cosmetics/avatarLook';
import { flags } from '../../core/flags';
import { OPERATORS } from '../operatorBody';
import { LOD_0, LOD_2 } from './manifest';
import { OperatorFigure, OperatorLibrary } from './figure';
import { wrenManifest } from './assets';

type VoxelOpts = Parameters<typeof setVoxelBodies>[0];

/** Every player is Wren until Moth is built (G123: "Both play as Wren"). */
export const PLAYER_OPERATOR = OPERATORS.wren;
/** The player rig's height (m): the operator's own (G74), so her hands, feet and head sit on the rig's joints. */
export const PLAYER_HEIGHT = PLAYER_OPERATOR.height;

let characterVoxels: VoxelOpts = null;

/** The match's voxel character setting (guards keep their voxel bodies); players never get one. */
export function setCharacterVoxels(o: VoxelOpts): void {
  characterVoxels = o;
  setVoxelBodies(o);
}

const LIBRARIES = new WeakMap<Scene, OperatorLibrary>();

/** The scene's operator library (shared geometry, materials and textures; disposed with the scene). */
export function operatorLibrary(scene: Scene): OperatorLibrary {
  let lib = LIBRARIES.get(scene);
  if (!lib) {
    lib = new OperatorLibrary(scene);
    LIBRARIES.set(scene, lib);
    scene.onDisposeObservable.addOnce(() => LIBRARIES.delete(scene));
  }
  return lib;
}

export interface OperatorRig {
  rig: CharacterRig;
  figure: OperatorFigure;
}

/**
 * A player's rig with Wren on it. `casters` gets each LOD's meshes as they load (shadows). The rig's own meshes are
 * disabled: Wren is what renders. Load the LODs with `figure.loadGameLods()` (play) or `loadCloseUp()` (menu).
 */
export function operatorRig(scene: Scene, make: PartFactory, look: AvatarLook, name: string, casters?: (m: AbstractMesh) => void): OperatorRig {
  setVoxelBodies(null);
  let rig: CharacterRig;
  try {
    rig = new CharacterRig(scene, make, look, PLAYER_HEIGHT, name, { build: 'average', style: 'detailed' });
  } finally {
    setVoxelBodies(characterVoxels);
  }
  for (const m of rig.root.getChildMeshes(false)) {
    m.setEnabled(false);
    m.isPickable = false;
  }
  const figure = new OperatorFigure(operatorLibrary(scene), rig, wrenManifest(), name);
  if (casters) figure.onMeshes = (ms) => { for (const m of ms) casters(m); };
  return { rig, figure };
}

/**
 * `?gfx=min` (the logic-test path, software GL): LOD2 only, never the 18 MB LOD0 or the hero (A102). Render side only.
 */
export const MIN_LODS = flags.gfx === 'min';

/** The play LODs: LOD2 first, then LOD0 and LOD1 (`?gfx=min`: LOD2 only). */
export function loadPlayLods(f: OperatorFigure): void {
  (MIN_LODS ? f.load(LOD_2) : f.loadGameLods()).catch(warnLoad);
}

/**
 * The menu's order: LOD2 (on screen in a moment), LOD0, LOD1 parsed ahead of a match, then the close-up LOD (the hero),
 * last so it never holds up the files play needs (`?gfx=min`: LOD2 only).
 */
export function loadMenuLods(f: OperatorFigure, prefetch: (url: string) => Promise<unknown>): void {
  if (MIN_LODS) {
    f.load(LOD_2).catch(warnLoad);
    return;
  }
  const lod1 = f.manifest.urls[2];
  f.load(LOD_2)
    .then(() => f.load(LOD_0))
    .then(() => (lod1 ? prefetch(lod1) : null))
    .then(() => f.loadCloseUp())
    .catch(warnLoad);
}

/** Logs a failed body load (the game plays on: the rig is the gameplay body; nothing is drawn until a LOD loads). */
export function warnLoad(e: unknown): void {
  console.warn('[operators] Wren failed to load', e);
}

/**
 * A co-op partner's figure each frame, after its rig's update: goggle stowed and dim (the partner's mode is not sent,
 * G73), the rig's render warmth, then pose and LOD for `camera`. Kept here so src/net never touches render state.
 */
export function partnerFigureFrame(figure: OperatorFigure, rig: CharacterRig, dt: number, camera: Camera | null): void {
  figure.setVision('off', dt);
  figure.setHeat(rig.heat);
  figure.update(camera);
}
