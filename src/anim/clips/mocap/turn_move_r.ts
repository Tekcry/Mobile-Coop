// MOCAP SLOT (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip format
// (docs/mocap-trial/CLIP-FORMAT.md, "One-shot slots"): `export const MOCAP_TURN_MOVE_R: KeyedClip | null = keyedClip({ name: 'mocap_turn_move_r', ... })`.
// A 90 deg turn to the RIGHT while walking (empty: the left one mirrored, when that is filled), sampled by the yaw turned.
// null: no hand-keyed counterpart, so the slot stays empty and the game plays what it plays today.
import type { KeyedClip } from '../../keyed';

export const MOCAP_TURN_MOVE_R: KeyedClip | null = null;

