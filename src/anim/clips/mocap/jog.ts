// MOCAP PLACEHOLDER (mocap-trial). The CMU retarget overwrites this file with the converted take in the keyed-clip
// format (docs/mocap-trial/CLIP-FORMAT.md): `export const MOCAP_JOG = keyedClip({ name: 'mocap_jog', ... })`. Until
// then it is the hand-keyed jog itself, so the "Mocap locomotion" switch changes nothing (tests/mocapSwitch.test.ts).
export { KEYED_JOG as MOCAP_JOG } from '../keyed/jog';
