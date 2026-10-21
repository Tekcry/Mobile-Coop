/**
 * (marlow-bays slice T, item 10) What a tuner row edits on the body: the joint(s), the weapon, the whole body or the
 * camera, so the panel can mark it in the scene (a dev visual only: gameplay never reads it). Pure, Babylon-free.
 *
 * A target is up to two rig joints (`a`, `b`; names of the `CharacterRig` nodes): `line` draws the bone between them
 * (an upper arm, a forearm), otherwise each is a marker of its own (both knees, both feet).
 */
export type RigJoint =
  | 'hips'
  | 'spine'
  | 'torso'
  | 'neck'
  | 'headNode'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'wristL'
  | 'wristR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'ankleL'
  | 'ankleR'
  | 'toeL'
  | 'toeR';

export const RIG_JOINTS: readonly RigJoint[] = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'toeL', 'toeR'];

export type TuneTargetKind = 'none' | 'joint' | 'weapon' | 'body' | 'camera';

export interface TuneTarget {
  kind: TuneTargetKind;
  a: RigJoint | '';
  b: RigJoint | '';
  /** Draw the bone a -> b (else a and b are separate markers). */
  line: boolean;
  /** Plain words for the panel's "Selected" line and the scene label. */
  label: string;
}

export function emptyTarget(): TuneTarget {
  return { kind: 'none', a: '', b: '', line: false, label: '' };
}

function set(out: TuneTarget, kind: TuneTargetKind, a: RigJoint | '', b: RigJoint | '', line: boolean, label: string): TuneTarget {
  out.kind = kind;
  out.a = a;
  out.b = b;
  out.line = line;
  out.label = label;
  return out;
}

const body = (out: TuneTarget, label = 'Whole body'): TuneTarget => set(out, 'body', 'hips', 'headNode', true, label);
const weapon = (out: TuneTarget, label = 'Weapon'): TuneTarget => set(out, 'weapon', '', '', false, label);
const one = (out: TuneTarget, a: RigJoint, label: string): TuneTarget => set(out, 'joint', a, '', false, label);
const bone = (out: TuneTarget, a: RigJoint, b: RigJoint, label: string): TuneTarget => set(out, 'joint', a, b, true, label);
const pair = (out: TuneTarget, a: RigJoint, b: RigJoint, label: string): TuneTarget => set(out, 'joint', a, b, false, label);

const SIDE = (s: string): string => (s === 'L' ? 'Left' : 'Right');

/** The Joints section's joints (`tuneJoints` JOINTS) on the rig. */
function jointTarget(j: string, out: TuneTarget): TuneTarget {
  const s = j.slice(-1);
  const side = s === 'L' || s === 'R' ? (s as 'L' | 'R') : '';
  const base = side ? j.slice(0, -1) : j;
  if (!side) {
    if (base === 'pelvis') return one(out, 'hips', 'Pelvis');
    if (base === 'spine') return one(out, 'spine', 'Spine');
    if (base === 'chest') return one(out, 'torso', 'Chest');
    if (base === 'neck') return one(out, 'neck', 'Neck');
    if (base === 'head') return one(out, 'headNode', 'Head');
    return body(out);
  }
  const S = SIDE(side);
  if (base === 'shoulder') return one(out, `shoulder${side}`, `${S} shoulder`);
  if (base === 'upperArm') return bone(out, `shoulder${side}`, `elbow${side}`, `${S} upper arm`);
  if (base === 'elbow') return bone(out, `elbow${side}`, `wrist${side}`, `${S} elbow`);
  if (base === 'wrist') return one(out, `wrist${side}`, `${S} wrist`);
  if (base === 'hip') return bone(out, `hip${side}`, `knee${side}`, `${S} hip`);
  if (base === 'knee') return bone(out, `knee${side}`, `ankle${side}`, `${S} knee`);
  if (base === 'ankle') return bone(out, `ankle${side}`, `toe${side}`, `${S} ankle`);
  if (base === 'toe') return one(out, `toe${side}`, `${S} toe`);
  return body(out);
}

/** An IK limb or a hand / foot target (`handL`, `footR`, ...). */
function limb(id: string, out: TuneTarget): TuneTarget | null {
  const m = /^(hand|foot)([LR])/.exec(id);
  if (!m) return null;
  const side = m[2] as 'L' | 'R';
  return m[1] === 'hand' ? one(out, `wrist${side}`, `${SIDE(side)} hand`) : one(out, `ankle${side}`, `${SIDE(side)} foot`);
}

/** The Body state section's sliders (`anim/tune.ts` TUNABLES, body part). */
function bodyRow(id: string, out: TuneTarget): TuneTarget {
  if (id.startsWith('knee')) return pair(out, 'kneeL', 'kneeR', 'Knees');
  if (id === 'trackMul' || id === 'strideMul' || id.startsWith('foot')) return pair(out, 'ankleL', 'ankleR', 'Feet');
  if (id.startsWith('hand')) return pair(out, 'wristL', 'wristR', 'Hands');
  if (id.startsWith('elbow') || id === 'tuckMul') return pair(out, 'elbowL', 'elbowR', 'Elbows');
  if (id.startsWith('armSwing')) return pair(out, 'wristL', 'wristR', 'Arm swing (hands)');
  if (id.startsWith('head')) return one(out, 'headNode', 'Head');
  if (id === 'pelvisYAdd' || id === 'glideTwistMul') return one(out, 'hips', 'Pelvis');
  if (id === 'leanAdd') return one(out, 'spine', 'Spine');
  if (id === 'trunkTwistMul' || id === 'peekLeanMul') return one(out, 'torso', 'Chest');
  if (id.startsWith('gun') || id === 'sightYAdd') return weapon(out, 'Gun hold');
  return body(out);
}

/** The Keys section's fields (`tuneKeysFile` KEY_FIELDS: trunk segments, then the arms and wrists per side). */
function keyRow(id: string, out: TuneTarget): TuneTarget {
  const m = /^arm([LR])_(.+)$/.exec(id);
  if (m) {
    const side = m[1] as 'L' | 'R';
    const f = m[2]!;
    const S = SIDE(side);
    if (f.startsWith('wrist')) return one(out, `wrist${side}`, `${S} wrist (key)`);
    // (marlow-bays T1a, item 17) the forearm twist on the forearm, the shoulder on its joint
    if (f === 'twist') return bone(out, `elbow${side}`, `wrist${side}`, `${S} forearm twist (key)`);
    if (f.startsWith('sh')) return one(out, `shoulder${side}`, `${S} shoulder (key)`);
    if (f === 'elbow' || f === 'inward') return bone(out, `elbow${side}`, `wrist${side}`, `${S} forearm (key)`);
    if (f === 'twistUpper') return bone(out, `shoulder${side}`, `elbow${side}`, `${S} upper arm twist (key)`);
    return bone(out, `shoulder${side}`, `elbow${side}`, `${S} upper arm (key)`);
  }
  const seg = id.split('_')[0];
  if (seg === 'pelvis') return one(out, 'hips', id.startsWith('pelvis_d') ? 'Pelvis shift (key)' : 'Pelvis (key)');
  if (seg === 'spine') return one(out, 'spine', 'Spine (key)');
  if (seg === 'chest') return one(out, 'torso', 'Chest (key)');
  if (seg === 'neck') return one(out, 'neck', 'Neck (key)');
  if (seg === 'head') return one(out, 'headNode', 'Head (key)');
  return body(out, 'Whole body (key)');
}

/**
 * The target of slider `id` in section `section` ('' id: the section as a whole, e.g. a tab with no row picked yet).
 * Unknown sections and rows: the whole body.
 */
export function tuneTarget(section: string, id: string, out: TuneTarget = emptyTarget()): TuneTarget {
  if (!section) return set(out, 'none', '', '', false, '');
  if (section === 'cam') return set(out, 'camera', '', '', false, 'Camera');
  if (section === 'gun') return weapon(out, 'Gun hold');
  if (section === 'step') return pair(out, 'ankleL', 'ankleR', 'Feet (stepping)');
  if (section === 'weight') return one(out, 'hips', 'Body weight (pelvis)');
  if (!id) {
    if (section === 'weapon') return weapon(out, 'Gun in hand');
    if (section === 'hand') return pair(out, 'wristL', 'wristR', 'Hands');
    if (section === 'ik') return pair(out, 'wristL', 'wristR', 'Limb reach');
    return body(out);
  }
  if (section === 'joint') return id === 'mirror' ? body(out, 'Mirror lock (both sides)') : jointTarget(id.replace(/_[xyz]$/, ''), out);
  if (section === 'hand' || section === 'ik') return limb(id, out) ?? body(out);
  if (section === 'weapon') {
    const f = /^[a-z]+([LR])(Curl|Spread)$/.exec(id);
    if (f) return one(out, `wrist${f[1] as 'L' | 'R'}`, `${SIDE(f[1]!)} fingers`);
    if (id.startsWith('support')) return one(out, 'wristL', 'Support hand');
    return weapon(out, 'Gun in hand');
  }
  if (section === 'body') return bodyRow(id, out);
  if (section === 'keys') return keyRow(id, out);
  return body(out);
}

/** A row's pad key (`s:<section>:<id>`) split into its section and slider id; null for any other key. */
export function rowKeyParts(key: string): { section: string; id: string } | null {
  if (!key.startsWith('s:')) return null;
  const i = key.indexOf(':', 2);
  if (i < 0) return null;
  return { section: key.slice(2, i), id: key.slice(i + 1) };
}
