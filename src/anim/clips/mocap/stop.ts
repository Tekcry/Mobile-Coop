// MOCAP SLOT (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip format
// (docs/mocap-trial/CLIP-FORMAT.md, "One-shot slots"): `export const MOCAP_STOP: KeyedClip | null = keyedClip({ name: 'mocap_stop', ... })`.
// A stop from a walk to standing, sampled over MOCAP_STOP_SECONDS from the braking.
// null: no hand-keyed counterpart, so the slot stays empty and the game plays what it plays today.
import type { KeyedClip } from '../../keyed';

export const MOCAP_STOP: KeyedClip | null = null;
/** The take's length (s): the retarget writes it with the clip. */
export const MOCAP_STOP_SECONDS = 0.6;
