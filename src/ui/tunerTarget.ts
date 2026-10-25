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
  // (anim-skeleton S4) the collarbone: the rig has no node of its own on the overlay, so the shoulder joint (the
  // shoulder part's filter); named plainly rather than "Whole body"
  if (base === 'clavicle') return one(out, `shoulder${side}`, `${S} collarbone`);
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
  if (id.startsWith('gun') || id === 'sightYAdd' || id === 'recoilMul' || id === 'swapDropMul') return weapon(out, 'Gun hold (both hands)');
  return body(out);
}

/**
 * (tuner-clarity S3, BRIEF A9) A key's leg field (`tuneKeysFile` KEY_LEGD, the FK weight `w`; S2's `ankleYaw` /
 * `shinTwist` by name) on its own leg: one target label per leg (one fold group in the panel), the marker on the hip,
 * knee, ankle or toe by field.
 */
function keyLeg(side: 'L' | 'R', f: string, out: TuneTarget): TuneTarget {
  const label = `${SIDE(side)} leg (key)`;
  if (f.startsWith('hip')) return bone(out, `hip${side}`, `knee${side}`, label);
  if (f === 'knee') return one(out, `knee${side}`, label);
  if (f === 'shinTwist') return bone(out, `knee${side}`, `ankle${side}`, label);
  if (f.startsWith('ankle')) return one(out, `ankle${side}`, label);
  if (f === 'toe') return one(out, `toe${side}`, label);
  // the FK leg weight (`w`) and any later field: the whole leg, hip and ankle marked
  return pair(out, `hip${side}`, `ankle${side}`, label);
}

/** The Keys section's fields (`tuneKeysFile` KEY_FIELDS: trunk segments, the arms and wrists per side, then (S4) the
 *  clavicles, the fingers and the legs). (tuner-clarity S3) Nothing keyed falls to "Whole body": the legs and fingers
 *  have parts of their own (BRIEF A9). */
function keyRow(id: string, out: TuneTarget): TuneTarget {
  const leg = /^leg([LR])_(.+)$/.exec(id);
  if (leg) return keyLeg(leg[1] as 'L' | 'R', leg[2]!, out);
  const hand = /^hand([LR])_/.exec(id);
  if (hand) {
    const side = hand[1] as 'L' | 'R';
    return one(out, `wrist${side}`, `${SIDE(side)} fingers (key)`);
  }
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
  // (marlow-bays item 24, track A) a guard section targets the guard's body as the Wren section it mirrors
  if (section === 'guardJoint') section = 'joint';
  else if (section === 'guardStep') section = 'step';
  else if (section === 'guardWeight') section = 'weight';
  if (section === 'cam') return set(out, 'camera', '', '', false, 'Camera');
  if (section === 'gun') return weapon(out, 'Gun hold (both hands)');
  if (section === 'step') return pair(out, 'ankleL', 'ankleR', 'Feet (stepping)');
  if (section === 'weight') return one(out, 'hips', 'Body weight (pelvis)');
  // (merge, CT Core #95) the worn gear: one group, marked like the weapon (no line over her body)
  if (section === 'gear') return weapon(out, 'Worn gear');
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
    return weapon(out, 'Gun in the gun hand (the support hand follows)');
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

// ------------------------------------------------------------------------------------------
// (marlow-bays T2) The body part filter: slice T's mapping in reverse (a part picked on the body map or by a click on
// her in the scene shows only the sliders that move it)
// ------------------------------------------------------------------------------------------

/** A part to filter by: a rig joint, the weapon, the whole body; '' every part. */
export type BodyPart = RigJoint | 'weapon' | 'body' | '';

const PART_WORDS: Readonly<Record<string, string>> = {
  hips: 'Hips',
  spine: 'Spine',
  torso: 'Chest',
  neck: 'Neck',
  headNode: 'Head',
  shoulder: 'shoulder',
  elbow: 'elbow',
  wrist: 'hand',
  hip: 'hip',
  knee: 'knee',
  ankle: 'foot',
  toe: 'toes',
  weapon: 'Weapon',
  body: 'Whole body',
};

/** A part in plain words ("Left elbow", "Whole body"); '' "All parts". */
export function partLabel(p: BodyPart): string {
  if (!p) return 'All parts';
  const m = /^([a-z]+)([LR])$/.exec(p);
  if (m) return `${m[2] === 'L' ? 'Left' : 'Right'} ${PART_WORDS[m[1]!] ?? m[1]}`;
  return PART_WORDS[p] ?? p;
}

/**
 * Whether a target moves part `p`: a joint target by its joint (a bone by its first joint, a pair by either), the
 * weapon and the whole body by their own part. The camera (and no target) is never filtered out.
 */
export function targetHasPart(t: TuneTarget, p: BodyPart): boolean {
  if (!p || t.kind === 'camera' || t.kind === 'none') return true;
  if (t.kind === 'weapon') return p === 'weapon';
  if (t.kind === 'body') return p === 'body';
  return t.a === p || (!t.line && t.b === p);
}

const scratch = emptyTarget();

/** Whether slider `id` of `section` moves part `p` (allocation free). */
export function rowHasPart(section: string, id: string, p: BodyPart): boolean {
  if (!p) return true;
  return targetHasPart(tuneTarget(section, id, scratch), p);
}

/**
 * The part nearest a click at (x, y) among projected points (`xs`, `ys`; `ok[i]` false: behind the camera or off the
 * rig), within `maxPx`; -1 none.
 */
export function nearestPoint(xs: ArrayLike<number>, ys: ArrayLike<number>, ok: ArrayLike<boolean>, x: number, y: number, maxPx: number): number {
  let best = -1;
  let bestD = maxPx * maxPx;
  for (let i = 0; i < xs.length; i++) {
    if (!ok[i]) continue;
    const dx = xs[i]! - x;
    const dy = ys[i]! - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** (T2) Her bones as joint index pairs into `RIG_JOINTS` (a click on a bone picks its first joint: the thigh, the hip). */
export const RIG_BONES: readonly (readonly [number, number])[] = (() => {
  const i = (j: RigJoint): number => RIG_JOINTS.indexOf(j);
  const pairs: [RigJoint, RigJoint][] = [
    ['hips', 'spine'],
    ['spine', 'torso'],
    ['torso', 'neck'],
    ['neck', 'headNode'],
    ['shoulderL', 'elbowL'],
    ['elbowL', 'wristL'],
    ['shoulderR', 'elbowR'],
    ['elbowR', 'wristR'],
    ['hipL', 'kneeL'],
    ['kneeL', 'ankleL'],
    ['ankleL', 'toeL'],
    ['hipR', 'kneeR'],
    ['kneeR', 'ankleR'],
    ['ankleR', 'toeR'],
  ];
  return pairs.map(([a, b]) => [i(a), i(b)] as const);
})();

/**
 * (T2) What a click at (x, y) picks on her: a joint within `jointPx` (the nearest), else the bone under it within
 * `bonePx` (its first joint), else the nearest joint within `farPx`; -1 none. `bones` index pairs into the points.
 */
export function pickOnBody(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  ok: ArrayLike<boolean>,
  bones: readonly (readonly [number, number])[],
  x: number,
  y: number,
  jointPx = 26,
  bonePx = 36,
  farPx = 64,
): number {
  const j = nearestPoint(xs, ys, ok, x, y, jointPx);
  if (j >= 0) return j;
  let best = -1;
  let bestD = bonePx * bonePx;
  for (const [a, b] of bones) {
    if (!ok[a] || !ok[b]) continue;
    const ax = xs[a]!;
    const ay = ys[a]!;
    const dx = xs[b]! - ax;
    const dy = ys[b]! - ay;
    const len = dx * dx + dy * dy;
    const t = len > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    const ex = ax + dx * t - x;
    const ey = ay + dy * t - y;
    const d = ex * ex + ey * ey;
    if (d <= bestD) {
      bestD = d;
      best = a;
    }
  }
  if (best >= 0) return best;
  return nearestPoint(xs, ys, ok, x, y, farPx);
}

/** (T2) The parts in the panel's part list (top to toe, her left before her right; '' every part first). */
export const BODY_PARTS: readonly BodyPart[] = [
  '',
  'headNode',
  'neck',
  'torso',
  'spine',
  'hips',
  'shoulderL',
  'elbowL',
  'wristL',
  'shoulderR',
  'elbowR',
  'wristR',
  'hipL',
  'kneeL',
  'ankleL',
  'toeL',
  'hipR',
  'kneeR',
  'ankleR',
  'toeR',
  'weapon',
  'body',
];
