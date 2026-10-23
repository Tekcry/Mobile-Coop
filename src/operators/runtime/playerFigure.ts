/**
 * (operators step 11e, D31 / G123) Wren is the body of every player: solo, the local co-op player and the remote
 * partner, and the main menu's preview. This builds a player's CharacterRig at Wren's height (G74: 1.68 m, the G72
 * proportions) and puts her OperatorFigure on it.
 *
 * - The rig stays the pose authority (animation, IK, sockets, light-meter samples, hit volumes); its own body parts are
 *   still built (back gear and thigh widths are measured from them for the weapon carry) but never drawn.
 * - Gameplay reads nothing here (CLAUDE.md): the controller capsule, speeds, noise and camera are unchanged (G38).
 */
import type { AbstractMesh, Camera, Scene } from '../../core/babylon';
import { CharacterRig, type PartFactory } from '../../player/characterRig';
import type { AvatarLook } from '../../cosmetics/avatarLook';
import { flags } from '../../core/flags';
import { OPERATORS } from '../operatorBody';
import { LOD_0, LOD_2, playLodUrls } from './manifest';
import { pageLeaving, warmPlayLods } from './offline';
import { OperatorFigure, OperatorLibrary } from './figure';
import { goggleColour, goggleSlot } from './goggle';
import { wrenManifest } from './assets';
import { WREN_BACK_MOUNT, WREN_HANDS, WREN_HOLSTER, WREN_SLING } from '../handFrame';

/** Every player is Wren until Moth is built (G123: "Both play as Wren"). */
export const PLAYER_OPERATOR = OPERATORS.wren;
/** The player rig's height (m): the operator's own (G74), so her hands, feet and head sit on the rig's joints. */
export const PLAYER_HEIGHT = PLAYER_OPERATOR.height;

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
  const rig = new CharacterRig(scene, make, look, PLAYER_HEIGHT, name, { build: 'average', style: 'detailed' });
  for (const m of rig.root.getChildMeshes(false)) {
    m.setEnabled(false);
    m.isPickable = false;
  }
  // (feature/weapons) her own hands for the weapon holds: the palm on the grip, the knuckles round it
  rig.setHands(WREN_HANDS);
  // (feature/weapons) the sidearm in her own built holster, not the generic thigh slot
  rig.thighMount = WREN_HOLSTER;
  // (feature/weapons) the long gun hangs from her back plate's receiver bar by its back stud
  rig.backMount = WREN_BACK_MOUNT;
  // (anim-rig) the sling sockets on her own kit: the back plate at the left shoulder blade, the belt's hip socket
  rig.slingBack.position.set(WREN_SLING.back[0], WREN_SLING.back[1], WREN_SLING.back[2]);
  rig.slingHip.position.set(WREN_SLING.hip[0], WREN_SLING.hip[1], WREN_SLING.hip[2]);
  // (anim-joints J1) every Wren rig (player, partner, studio puppets) reads the animation base table + tuner deltas
  rig.tuneRows = true;
  const figure = new OperatorFigure(operatorLibrary(scene), rig, wrenManifest(), name);
  if (casters) figure.onMeshes = (ms) => { for (const m of ms) casters(m); };
  return { rig, figure };
}

/**
 * `?gfx=min` (the logic-test path, software GL): LOD2 only, never the 18 MB LOD0 or the hero (A102). Render side only.
 */
export const MIN_LODS = flags.gfx === 'min';

/** The play LODs: LOD2 first, then LOD0 and LOD1 (`?gfx=min`: LOD2 only); then the offline cache is warmed (A109). */
export function loadPlayLods(f: OperatorFigure): void {
  (MIN_LODS ? f.load(LOD_2) : f.loadGameLods())
    .catch((e: unknown) => warnLoad(e, f))
    .finally(() => void warmPlayLods(playLodUrls(f.manifest, MIN_LODS)));
}

/**
 * The menu's order: LOD2 (on screen in a moment), LOD0, LOD1 parsed ahead of a match, then the close-up LOD (the hero),
 * last so it never holds up the files play needs (`?gfx=min`: LOD2 only). Resolves when the whole chain has settled
 * (loaded or failed; never rejects): the menu's load screen waits for it (menu-notes note 2).
 */
export function loadMenuLods(f: OperatorFigure, prefetch: (url: string) => Promise<unknown>): Promise<void> {
  // (11e fix r1, A109) once the play LODs are in, they go into the offline cache (through the worker), then the hero
  const warm = (): Promise<number> => warmPlayLods(playLodUrls(f.manifest, MIN_LODS));
  if (MIN_LODS) {
    return f
      .load(LOD_2)
      .catch((e: unknown) => warnLoad(e, f))
      .then(warm)
      .then(
        () => {},
        () => {},
      );
  }
  const lod1 = f.manifest.urls[2];
  return f
    .load(LOD_2)
    .then(() => f.load(LOD_0))
    .then(() => (lod1 ? prefetch(lod1) : null))
    .then(warm)
    .then(() => f.loadCloseUp())
    .catch((e: unknown) => warnLoad(e, f));
}

/**
 * Logs a failed body load (the game plays on: the rig is the gameplay body; nothing is drawn until a LOD loads). A load
 * abandoned by the page unloading or by its body / scene being disposed is not a failure and is not reported (A110).
 */
export function warnLoad(e: unknown, f?: OperatorFigure): void {
  if (pageLeaving() || f?.isDisposed) return;
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

/**
 * (G135) A player's goggle colour from their slot in the session's player list (`goggleSlot`: the host 0, the partner
 * 1): the partner beacon. Slot 0 keeps the lens asset's own green. Kept here so src/net never touches render state.
 */
export function setPlayerGlow(figure: OperatorFigure, players: readonly { readonly id: string; readonly host: boolean }[], id: string): void {
  const slot = goggleSlot(players, id);
  figure.setGlowColour(slot === 0 ? null : goggleColour(slot));
}
