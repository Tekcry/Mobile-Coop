// MOCAP PLACEHOLDER (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip
// format (docs/mocap-trial/CLIP-FORMAT.md): `export const MOCAP_RUN = keyedClip({ name: 'mocap_run', ... })`. Until
// then it is the hand-keyed run itself, so the "Mocap locomotion" switch changes nothing (tests/mocapSwitch.test.ts).
export { KEYED_RUN as MOCAP_RUN } from '../keyed/run';
