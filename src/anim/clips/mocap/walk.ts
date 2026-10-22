// MOCAP PLACEHOLDER (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip
// format (docs/mocap-trial/CLIP-FORMAT.md): `export const MOCAP_WALK = keyedClip({ name: 'mocap_walk', ... })`. Until
// then it is the hand-keyed walk itself, so the "Mocap locomotion" switch changes nothing (tests/mocapSwitch.test.ts).
export { KEYED_WALK as MOCAP_WALK } from '../keyed/walk';
