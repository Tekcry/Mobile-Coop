// MOCAP SLOT (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip format
// (docs/mocap-trial/CLIP-FORMAT.md, "One-shot slots"): `export const MOCAP_TURN_IN_PLACE: KeyedClip | null = keyedClip({ name: 'mocap_turn_in_place', ... })`.
// A 90 deg turn on the spot to the RIGHT (the left one plays it mirrored), sampled by the body yaw turned (90 deg = the clip).
// null: no hand-keyed counterpart, so the slot stays empty and the game plays what it plays today.
import type { KeyedClip } from '../../keyed';

export const MOCAP_TURN_IN_PLACE: KeyedClip | null = null;

