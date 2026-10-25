/**
 * (tuner-ui) The animation tuner panel's layout, the pure part (no DOM, no Babylon; unit-tested in
 * `tests/tunerLayout.test.ts`): the tabs and which registered section sits in which, the group pickers' levels (a group
 * id split on its dots: `hand.rifle.walk` is weapon then state), plain English labels for parts, groups and sliders
 * (the ids never change: saves, exports and the bake table key on them), the drop-down list's navigation, the panel
 * size, and which tuner groups a loop of the Anim Studio uses.
 */
import { ARMED_JOINT_STATES } from '../anim/tuneRows';
import { CLIP_BODY, STUDIO_ENTRIES } from '../anim/studio';
import { STEP_GAITS, stepGaitIndex } from '../anim/tuneStep';

/** The fixed tabs, in order. A registered section not mapped here gets its own tab after Co-op. */
export const TUNER_TABS: readonly { id: string; label: string }[] = [
  { id: 'view', label: 'View' },
  { id: 'body', label: 'Body' },
  { id: 'hands', label: 'Hands & feet' },
  { id: 'weapon', label: 'Weapon' },
  { id: 'stepping', label: 'Stepping' },
  { id: 'weight', label: 'Weight' },
  { id: 'camera', label: 'Camera' },
  { id: 'keys', label: 'Keys' },
  { id: 'coop', label: 'Co-op' },
];

/** Which tab a registered section sits in (the Co-op sections by their `team_` prefix). */
const SECTION_TAB: Readonly<Record<string, string>> = {
  body: 'body',
  joint: 'body',
  ik: 'body',
  trav: 'body',
  cq: 'body', // (anim-n4, track A) Holds and carries
  hand: 'hands',
  gun: 'weapon',
  weapon: 'weapon',
  step: 'stepping',
  speed: 'stepping',
  weight: 'weight',
  cam: 'camera',
  keys: 'keys',
  // (anim-n4c) the elbow strike's trunk sliders sit with the body's
  strike: 'body',
  // (marlow-bays item 24, track A) the guard sections sit beside Wren's; the "Who" choice shows one or the other
  guardJoint: 'body',
  guardStep: 'stepping',
  guardWeight: 'weight',
};

/** (item 24, track A) A guard section (`tuneGuard.ts`) -> the Wren section it mirrors (labels, targets, the Who filter). */
export const GUARD_BASE_SECTION: Readonly<Record<string, string>> = { guardJoint: 'joint', guardStep: 'step', guardWeight: 'weight' };

/** (item 24) Whether a section is one of the guards'. */
export function isGuardSection(id: string): boolean {
  return id in GUARD_BASE_SECTION;
}

/** Whose rows the tuner edits: Wren's or the guards'. */
export type TuneWho = 'wren' | 'guard';

/**
 * (item 24) The sections of a tab the "Who" choice shows: Guard, the guard sections (none in the tab: its Wren
 * sections, which a note marks as Wren's); Wren, every section but the guards'.
 */
export function whoSections(sections: readonly string[], who: TuneWho): string[] {
  const g = sections.filter(isGuardSection);
  if (who === 'guard' && g.length) return g;
  return sections.filter((s) => !isGuardSection(s));
}

/** The tab id of a section (an unmapped section: `sec:<id>`, its own tab). */
export function tabOfSection(id: string): string {
  if (id.startsWith('team_')) return 'coop';
  return SECTION_TAB[id] ?? `sec:${id}`;
}

export interface TunerTab {
  id: string;
  label: string;
  /** The sections in this tab, in registration order. */
  sections: string[];
}

/**
 * The tabs for the registered sections (`ids` in registration order, `label` the section's own label for an unmapped
 * one): the fixed tabs (View always; a section tab only when it has a section), then every unmapped section's own tab
 * after Co-op. (marlow-bays item 29) No Settings tab: the panel's settings are in every tab's "More".
 */
export function buildTabs(ids: readonly string[], label: (id: string) => string): TunerTab[] {
  const out: TunerTab[] = [];
  for (const t of TUNER_TABS) {
    const secs = ids.filter((id) => tabOfSection(id) === t.id);
    if (t.id === 'view' || secs.length) out.push({ id: t.id, label: t.label, sections: secs });
  }
  for (const id of ids) if (tabOfSection(id).startsWith('sec:')) out.push({ id: `sec:${id}`, label: plainSection(id, label(id)), sections: [id] });
  return out;
}

/** The next tab index (LB -1, RB +1; wraps). */
export function cycleTab(at: number, d: number, n: number): number {
  if (n <= 0) return 0;
  return (((at + d) % n) + n) % n;
}

// ------------------------------------------------------------------------------------------
// Group levels: a group id split on its dots, the part every group of the section shares dropped
// ------------------------------------------------------------------------------------------

/** How many leading dot segments every group of a section shares (dropped from the pickers). */
export function sharedPrefix(groups: readonly string[]): number {
  if (!groups.length) return 0;
  const first = groups[0]!.split('.');
  let n = first.length - 1;
  for (const g of groups) {
    const s = g.split('.');
    let k = 0;
    while (k < n && k < s.length - 1 && s[k] === first[k]) k++;
    n = k;
  }
  return n;
}

/** The picker path of a group (its segments after the shared prefix). */
export function groupPath(group: string, prefix: number): string[] {
  return group.split('.').slice(prefix);
}

/** The number of pickers a section needs (its deepest group path). */
export function levelCount(groups: readonly string[], prefix: number): number {
  let n = 1;
  for (const g of groups) n = Math.max(n, groupPath(g, prefix).length);
  return n;
}

/** The choices at `level` given the choices above it (`path`, at least `level` long), in group order, unique. */
export function levelOptions(groups: readonly string[], prefix: number, path: readonly string[], level: number): string[] {
  const out: string[] = [];
  for (const g of groups) {
    const p = groupPath(g, prefix);
    let ok = true;
    for (let k = 0; k < level; k++) if (p[k] !== path[k]) ok = false;
    const v = p[level];
    if (ok && v !== undefined && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * The group for a picker path: the first group whose path starts with `path` (a level changed: the lower levels keep
 * their choice when the new branch has it, else take its first). Null when no group matches the first level.
 */
export function groupForPath(groups: readonly string[], prefix: number, path: readonly string[]): string | null {
  const want = path.slice();
  for (let level = 0; level < want.length; level++) {
    const opts = levelOptions(groups, prefix, want, level);
    if (!opts.length) {
      want.length = level;
      break;
    }
    if (!opts.includes(want[level]!)) {
      want[level] = opts[0]!;
      want.length = level + 1;
    }
  }
  for (const g of groups) {
    const p = groupPath(g, prefix);
    let ok = true;
    for (let k = 0; k < want.length; k++) if (p[k] !== want[k]) ok = false;
    if (ok) return g;
  }
  return groups[0] ?? null;
}

/** The pickers' names per section (the level's heading). */
/** (merge, CT Core #95) The Gear tab's sockets and the crouched variant in plain words. */
const GEAR_WORDS: Readonly<Record<string, string>> = {
  holster: 'Pistol holster',
  backL: 'Back, left gun',
  backC: 'Back, centre gun',
  backR: 'Back, right gun',
  slingHip: 'Hip sling',
  crouch: 'Crouched (added)',
};

const LEVEL_NAMES: Readonly<Record<string, readonly string[]>> = {
  gear: ['Item', 'Pose'],
  body: ['State'],
  joint: ['State', 'Armed state'],
  ik: ['State'],
  trav: ['Move'],
  hand: ['Weapon', 'State'],
  gun: ['Weapon', 'State'],
  weapon: ['Weapon', 'State'],
  step: ['Gait'],
  speed: ['Stance'],
  weight: ['Gait'],
  cam: ['View'],
  keys: ['Clip', 'Key'],
  guardJoint: ['Guard state'],
  guardStep: ['Gait'],
  guardWeight: ['Guard state'],
};

export function levelName(section: string, level: number): string {
  const names = section.startsWith('team_') ? ['Role'] : LEVEL_NAMES[section];
  return names?.[level] ?? (level === 0 ? 'State' : `Pick ${level + 1}`);
}

// ------------------------------------------------------------------------------------------
// Plain English labels (display only; the ids never change)
// ------------------------------------------------------------------------------------------

/** `crouchIdle`, `crouch_idle`, `lowReady` as plain words, the first capitalised. */
export function plainWords(s: string): string {
  const w = s
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return w ? w[0]!.toUpperCase() + w.slice(1) : w;
}

const SECTION_PLAIN: Readonly<Record<string, string>> = {
  body: 'Body',
  joint: 'Joints',
  ik: 'Limb reach',
  trav: 'Climb and vault',
  hand: 'Hands & feet',
  gun: 'Gun hold',
  weapon: 'Gun in hand',
  step: 'Stepping',
  speed: 'Speed',
  weight: 'Weight',
  cam: 'Camera',
  keys: 'Keys',
  clip: 'Clip speed', // (clip-speed, track A)
  guardJoint: 'Guard joints',
  guardStep: 'Guard stepping',
  guardWeight: 'Guard weight',
};

/** (item 24, track A) The guard rows in plain words. */
const GUARD_WORDS: Readonly<Record<string, string>> = {
  idle: 'Idle',
  walk: 'Walk (patrol, alert)',
  run: 'Run',
  aim: 'Aim',
  crouch: 'Crouched',
  cover: 'Wall cover',
};

/** A section's name in the part picker. */
export function plainSection(id: string, label: string): string {
  const s = SECTION_PLAIN[id];
  if (s) return s;
  const t = label.replace(/\([^)]*\)/g, '').replace(/^Co-op:\s*/, '').trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : id;
}

const GROUP_WORDS: Readonly<Record<string, string>> = {
  none: 'No weapon',
  a: 'Role A',
  b: 'Role B',
  contact: 'Contact',
  options: 'Options',
  aim: 'Aim',
  aimCrouch: 'Aim crouched',
  pipeV: 'Pipe up',
  pipeH: 'Pipe along',
};

/** (marlow-bays T1a, COVERAGE gap 3) The body states in the state lists (not the gun hold's or the camera's own `aim`). */
const STATE_WORDS: Readonly<Record<string, string>> = {
  aim: 'Aim moving (glides)',
  aimStill: 'Aim standing',
  aimCrouch: 'Aim crouched, still',
  aimCrouchMove: 'Aim crouched, moving',
  crouchRun: 'Crouch run',
  wallCrouchIdle: 'Wall crouched',
  wallCrouchSlide: 'Wall crouched slide',
  wallCrouchPeek: 'Wall crouched peek',
  hold: 'Hold a guard',
  carry: 'Carry a body',
  rifle: 'Rifle (armed states)',
  pistol: 'Pistol (armed states)',
};

/** (clip-speed, track A) The Clip speed groups. */
const CLIP_WORDS: Readonly<Record<string, string>> = {
  gun: 'Draw, holster, swap and throw',
  body: 'Start, stop and landing',
  all: 'Every clip',
};

/** One picker choice (a segment of a group id) in plain words: `keys` keys count from 1. */
export function plainGroupWord(section: string, level: number, seg: string): string {
  // (merge, CT Core #95 Gear) the worn gear and its crouched variant
  if (section === 'gear') return GEAR_WORDS[seg] ?? plainWords(seg);
  // (clip-speed, track A) the clip speed groups
  if (section === 'clip') return CLIP_WORDS[seg] ?? plainWords(seg);
  // (item 24, track A) the guard rows (the stepping gaits as Wren's)
  if (section === 'guardJoint' || section === 'guardWeight') return GUARD_WORDS[seg] ?? plainWords(seg);
  if (section === 'guardStep') return plainWords(seg);
  if (section === 'keys' && level === 1 && /^\d+$/.test(seg)) return `Key ${Number(seg) + 1}`;
  // the body state words: not the gun hold's or the camera's own states; the weapon level of hands / gun in hand stays
  const states = section !== 'gun' && section !== 'cam' && !((section === 'hand' || section === 'weapon') && level === 0);
  const w = states ? STATE_WORDS[seg] : undefined;
  return w ?? GROUP_WORDS[seg] ?? plainWords(seg);
}

const JOINT_WORDS: Readonly<Record<string, string>> = {
  pelvis: 'Hips',
  spine: 'Spine',
  chest: 'Chest',
  neck: 'Neck',
  head: 'Head',
  shoulder: 'shoulder',
  upperArm: 'upper arm',
  elbow: 'elbow',
  wrist: 'wrist',
  hip: 'thigh',
  knee: 'knee',
  ankle: 'ankle',
  toe: 'toes',
};
const AXIS_WORDS: Readonly<Record<string, string>> = { x: 'bend', y: 'turn', z: 'roll', pitch: 'bend', yaw: 'turn', roll: 'roll' };

/** (marlow-bays T1a, COVERAGE gap 16) A joint's axis by its own name where it is a twist about the bone. */
const JOINT_AXIS_WORDS: Readonly<Record<string, string>> = {
  upperArm_y: 'upper arm twist',
  elbow_y: 'forearm twist',
  hip_y: 'thigh twist',
  wrist_z: 'wrist roll',
};

/** A joint id (`elbowL`, `pelvis`) in plain words ("Left elbow", "Hips"). */
function jointWords(j: string): string {
  const m = /^([a-zA-Z]+?)([LR])$/.exec(j);
  if (m) return `${m[2] === 'L' ? 'Left' : 'Right'} ${JOINT_WORDS[m[1]!] ?? plainWords(m[1]!).toLowerCase()}`;
  return JOINT_WORDS[j] ?? plainWords(j);
}

/** Slider names by id (any section); `<section>:<id>` wins where two sections share an id. */
const PLAIN: Readonly<Record<string, string>> = {
  // body
  armSwingMul: 'Arm swing',
  kneeFlexAdd: 'Knee bend',
  trunkTwistMul: 'Shoulder twist',
  strideMul: 'Step length',
  trackMul: 'Feet apart',
  kneeOutMul: 'Knees point out',
  kneeLiftMul: 'Knee lift',
  pelvisYAdd: 'Hip height',
  leanAdd: 'Lean forward',
  armSwingGrow: 'More arm swing when faster',
  elbowOutAdd: 'Elbows out from body',
  elbowPoleMul: 'Elbows point out',
  headTurnMul: 'Head turn',
  peekLeanMul: 'Peek lean',
  wallGapAdd: 'Gap to wall',
  bodyFwdAdd: 'Body forward',
  bodyUpAdd: 'Body up',
  handUpAdd: 'Hands up',
  handFwdAdd: 'Hands forward',
  handOutAdd: 'Hands apart',
  footUpAdd: 'Feet up',
  footFwdAdd: 'Feet forward',
  footOutAdd: 'Feet further apart',
  guardGapAdd: 'Gap to guard',
  guardSideAdd: 'Guard to the side',
  // gun hold
  gunFwd: 'Gun forward',
  gunUp: 'Gun up',
  gunSide: 'Gun out',
  'gun:gunPitch': 'Muzzle tilt',
  'gun:gunYaw': 'Muzzle turn',
  gunCant: 'Gun roll',
  sightYAdd: 'Sight height',
  headDropMul: 'Head down to the sights',
  tuckMul: 'Elbows in to the body',
  glideTwistMul: 'Hip twist aiming on the move',
  recoilMul: 'Recoil kick per shot',
  swapDropMul: 'Gun drop changing hands',
  // camera
  camBoomAdd: 'Distance',
  camHeightAdd: 'Height',
  camSideAdd: 'Side offset',
  camPivotAdd: 'Look height',
  camFovAdd: 'Field of view',
  camZoomMul: 'Aim zoom',
  camBlendMul: 'Blend time',
  camFollowMul: 'Height follow',
  camBoomRateMul: 'Pull-in speed',
  camPadAdd: 'Wall margin',
  // joints
  'joint:mirror': 'Mirror left and right',
  // (marlow-bays T1a) the Keys tab's Mirror box (its own tick box; the slider never shows)
  'keys:mirror': 'Mirror keys',
  // (merge, CT Core #95) Gear: each item in its own seat's frame
  'gear:x': 'Move to the side',
  'gear:y': 'Move up',
  'gear:z': 'Move forward',
  'gear:pitch': 'Tilt',
  'gear:yaw': 'Turn',
  'gear:roll': 'Roll',
  // gun in hand
  gunScale: 'Gun size',
  // (item 29 phase 2) the gun moves in her gun hand; the support hand stays on the gun, so it follows
  gunX: 'Gun right in the gun hand',
  gunY: 'Gun up in the gun hand',
  gunZ: 'Gun forward in the gun hand',
  'weapon:gunPitch': 'Gun tilt in the gun hand',
  'weapon:gunYaw': 'Gun turn in the gun hand',
  gunRoll: 'Gun roll in the gun hand',
  supportSlide: 'Support hand along gun',
  supportOut: 'Support hand out',
  supportUp: 'Support hand up',
  supportFwd: 'Support hand forward',
  supportPitch: 'Support hand tilt',
  supportYaw: 'Support hand turn',
  supportRoll: 'Support hand roll',
  trigger: 'Trigger finger',
  // stepping
  lift: 'Foot lift',
  lock: 'Foot grip',
  dur: 'Step time',
  slide: 'Foot slide',
  stride0: 'Stride, slow',
  stride1: 'Stride, middle',
  stride2: 'Stride, fast',
  toeOff: 'Toe push',
  heel: 'Heel roll',
  replant: 'Re-step distance',
  // (anim-natural N1) the feet in turns
  'step:turnTwist': 'Turn step twist',
  'step:turnRate': 'Turn step trigger speed',
  'step:pivot': 'Ball pivot amount',
  'step:pivotHeel': 'Ball pivot heel lift',
  'step:landTurn': 'Landing turn lead',
  // weight
  startMul: 'Speed-up time',
  stopMul: 'Stop time',
  turnMul: 'Turn rate',
  turnRunMul: 'Turn rate, running',
  stopSettle: 'Stop wobble',
  accelLean: 'Lean on start',
  stopLean: 'Lean on stop',
  bank: 'Lean into turns',
  plantDrop: 'Hip drop per step',
  plantTimeMul: 'Step recovery',
  landDepth: 'Landing dip',
  landTimeMul: 'Landing recovery',
  chestLag: 'Chest lag',
  chestHzMul: 'Chest stiffness',
  chestDampMul: 'Chest settle',
  headLag: 'Head lag',
  headHzMul: 'Head stiffness',
  headDampMul: 'Head settle',
  armLag: 'Arm lag',
  armHzMul: 'Arm stiffness',
  armDampMul: 'Arm settle',
  gearLag: 'Gear lag',
  gearHzMul: 'Gear stiffness',
  gearDampMul: 'Gear settle',
  antStart: 'Start dip',
  antJump: 'Jump dip',
  antTimeMul: 'Wind-up time',
  camLag: 'Camera lag',
  camDip: 'Camera dip',
  // co-op roles and climb moves
  bodyFwd: 'Body forward',
  bodyUp: 'Body up',
  bodySide: 'Body right',
  yaw: 'Body turn',
  lean: 'Lean',
  crouch: 'Crouch depth',
  handUp: 'Hands up',
  handFwd: 'Hands forward',
  handOut: 'Hands out',
  footUp: 'Feet up',
  footFwd: 'Feet forward',
  footOut: 'Feet out',
  time: 'Timing',
  cFwd: 'Contact forward',
  cUp: 'Contact up',
  cSide: 'Contact right',
  // (clip-speed, track A) Clip speed (1 = today's timing)
  'clip:rifleDraw': 'Rifle draw speed',
  'clip:pistolDraw': 'Pistol draw speed',
  'clip:holsterPrimary': 'Rifle holster speed', // (anim-natural N3) one holster row per gun
  'clip:holsterSidearm': 'Pistol holster speed',
  'clip:swap': 'Weapon swap speed',
  'clip:grenade': 'Grenade throw speed',
  'clip:startShift': 'Start-off weight shift speed',
  'clip:stopSettle': 'Stop settle speed',
  'clip:land': 'Landing speed',
  'clip:all': 'Every clip speed',
};

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'];

/**
 * (tuner-clarity S3) A key's leg fields in plain words (`tuneKeysFile` KEY_LEGD and the FK weight; S2's two twists),
 * after "Left" / "Right". The sense is the key file's: + is the word's way on both sides.
 */
const LEG_WORDS: Readonly<Record<string, string>> = {
  hipPitch: 'thigh forward',
  hipYaw: 'knee turned out',
  hipRoll: 'thigh out',
  knee: 'knee bend',
  anklePitch: 'toes up',
  ankleRoll: 'sole in',
  toe: 'toes bend',
  ankleYaw: 'foot twist, toes out',
  shinTwist: 'shin twist',
  w: 'leg from the key',
};

/**
 * A slider's name in short plain words (display only): the table above, then the patterns of the generated sliders
 * (joints, limbs, fingers, keys), then the registry label without its brackets or second wording.
 */
export function plainLabel(section: string, id: string, label: string): string {
  // (item 24, track A) a guard section's sliders are named as the Wren section's they mirror
  if (isGuardSection(section)) section = GUARD_BASE_SECTION[section]!;
  const own = PLAIN[`${section}:${id}`] ?? (section.startsWith('team_') || section === 'trav' ? PLAIN[id] : undefined) ?? PLAIN[id];
  if (own) return own;
  // joints (`elbowR_x`) and the keys' joints (`pelvis_pitch`)
  let m = /^([a-zA-Z]+)_(x|y|z|pitch|yaw|roll)$/.exec(id);
  if (m) {
    // (T1a, gap 16) a twist about the bone by its own name ("Right forearm twist", not "Right elbow turn")
    const j = /^([a-zA-Z]+?)([LR])$/.exec(m[1]!);
    const tw = j ? JOINT_AXIS_WORDS[`${j[1]}_${m[2]}`] : undefined;
    if (j && tw) return `${j[2] === 'L' ? 'Left' : 'Right'} ${tw}`;
    return `${jointWords(m[1]!)} ${AXIS_WORDS[m[2]!]}`;
  }
  // (T1a) the keys' pelvis shift (cm)
  m = /^pelvis_d([xyz])$/.exec(id);
  if (m) return `Hips shift ${m[1] === 'x' ? 'right' : m[1] === 'y' ? 'up' : 'forward'}`;
  // the keys' arms (`armL_flex`, `armR_wristPitch`)
  m = /^arm([LR])_(\w+)$/.exec(id);
  if (m) {
    const side = m[1] === 'L' ? 'Left' : 'Right';
    const what: Record<string, string> = {
      flex: 'arm forward',
      abd: 'arm out from body',
      elbow: 'elbow bend',
      inward: 'forearm in',
      wristPitch: 'wrist bend',
      wristYaw: 'wrist turn',
      wristRoll: 'wrist roll',
      // (marlow-bays T1a, item 17)
      twist: 'forearm twist, palm in',
      twistUpper: 'upper arm twist',
      shPitch: 'shoulder forward',
      shYaw: 'shoulder turn',
      shRoll: 'shoulder out',
    };
    return `${side} ${what[m[2]!] ?? plainWords(m[2]!).toLowerCase()}`;
  }
  // (tuner-clarity S3) the keys' legs (`legL_hipPitch`, S2's `legR_ankleYaw`, the FK weight `legL_w`)
  m = /^leg([LR])_(\w+)$/.exec(id);
  if (m) {
    const w = LEG_WORDS[m[2]!];
    if (w) return `${m[1] === 'L' ? 'Left' : 'Right'} ${w}`;
  }
  // (tuner-clarity S3) the keys' fingers (`handL_thumbCurl`)
  m = /^hand([LR])_([a-z]+)(Curl|Spread)$/.exec(id);
  if (m && FINGERS.includes(m[2]!)) return `${m[1] === 'L' ? 'Left' : 'Right'} ${m[2]} ${m[3]!.toLowerCase()}`;
  // limbs: IK strength (`handL`), targets (`handLFwd`) and hand rotation (`handLPitch`)
  m = /^(hand|foot)([LR])(Fwd|Up|Out|Pitch|Yaw|Roll)?$/.exec(id);
  if (m) {
    const side = m[2] === 'L' ? 'Left' : 'Right';
    const limb = m[1]!;
    if (!m[3]) return `${side} ${limb} reach`;
    const dir: Record<string, string> = { Fwd: 'forward', Up: 'up', Out: 'out', Pitch: 'bend', Yaw: 'turn', Roll: 'roll' };
    return `${side} ${limb} ${dir[m[3]]}`;
  }
  // fingers (`indexLCurl`, `thumbRSpread`)
  m = /^([a-z]+)([LR])(Curl|Spread)$/.exec(id);
  if (m && FINGERS.includes(m[1]!)) return `${m[2] === 'L' ? 'Left' : 'Right'} ${m[1]} ${m[3]!.toLowerCase()}`;
  const t = label
    .replace(/\([^)]*\)/g, '')
    .split(' / ')[0]!
    .replace(/\bfwd\b/g, 'forward')
    .replace(/\s+/g, ' ')
    .trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : id;
}

/** A loop of the Anim Studio in plain words (`id` as in `STUDIO_ENTRIES`, `label` its own label). */
export function plainLoop(id: string, label: string): string {
  if (id === 'off') return 'Off (you move)';
  const i = label.indexOf(': ');
  const rest = i < 0 ? label : label.slice(i + 2);
  if (id.startsWith('state:')) return plainWords(rest.replace(/\bfwd\b/g, 'forward'));
  if (id.startsWith('keyed:')) return `${plainWords(id.slice(6))} clip`;
  if (id.startsWith('pair:')) return `Pair: ${rest.replace(/_/g, ' ')}`;
  if (id.startsWith('trav:')) return `Climb: ${rest}`;
  if (id.startsWith('guard:')) return `Guard: ${rest}`; // (item 24, track A) a guard puppet's loop
  return plainWords(rest);
}

/**
 * (marlow-bays item 29 phase 2, Michael: "make terminology plain English") How a value shows: metres as cm, radians as
 * degrees, frames, multipliers as ×, rates per m/s. `k` scales the stored value for display (the slider, the saves and
 * the exports keep the stored value and id). No allocation (a table lookup).
 */
export interface ShownUnit {
  k: number;
  unit: string;
}
const SHOWN_UNITS: Readonly<Record<string, ShownUnit>> = {
  x: { k: 1, unit: '×' },
  deg: { k: 1, unit: '°' },
  m: { k: 100, unit: 'cm' },
  rad: { k: 180 / Math.PI, unit: '°' },
  fr: { k: 1, unit: 'frames' },
  s: { k: 1, unit: 's' },
  cm: { k: 1, unit: 'cm' },
  '1-zeta': { k: 1, unit: '' },
  'x per m/s': { k: 1, unit: '× per m/s' },
  'deg/(m/s2)': { k: 1, unit: '° per m/s²' },
  'deg/(m/s)': { k: 1, unit: '° per m/s' },
  'm/(m/s)': { k: 100, unit: 'cm per m/s' },
  'm/m': { k: 100, unit: 'cm per m fallen' },
};
const SAME: ShownUnit = { k: 1, unit: '' };

export function shownUnit(unit: string): ShownUnit {
  return SHOWN_UNITS[unit] ?? (unit ? { k: 1, unit } : SAME);
}

/** A unit beside a value ('' none), in plain words. */
export function plainUnit(unit: string): string {
  return shownUnit(unit).unit;
}

/**
 * (item 29 phase 2, Michael: "gun in hand and support modified the same hand") A hands row of an armed state names the
 * hands by their job: with a rifle, pistol or launcher the right hand holds the gun ("Gun hand"), the left is on it
 * ("Support hand"). `group` the section's group (`hand.rifle.aim`, `weapon.pistol.lowReady`).
 */
export function handRoles(section: string, group: string): boolean {
  if (section !== 'hand' && section !== 'weapon') return false;
  const w = group.split('.')[1];
  return w === 'rifle' || w === 'pistol' || w === 'launcher';
}

/** A label with "Right hand" / "Left hand" (and fingers) named by the hand's job when `roles` is on. */
export function roleWords(text: string, roles: boolean): string {
  if (!roles) return text;
  return text
    .replace(/^Right hand\b/, 'Gun hand')
    .replace(/^Left hand\b/, 'Support hand')
    .replace(/^Right fingers\b/, 'Gun hand fingers')
    .replace(/^Left fingers\b/, 'Support hand fingers')
    .replace(/^Right (thumb|index|middle|ring|little)\b/, 'Gun hand $1')
    .replace(/^Left (thumb|index|middle|ring|little)\b/, 'Support hand $1');
}

/** A value as text with as many decimals as its step needs. */
export function valueText(v: number, step: number): string {
  const d = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step > 0 ? step : 1) - 1e-9)));
  return v.toFixed(d);
}

// ------------------------------------------------------------------------------------------
// The drop-down list's navigation (A opens, the D-pad moves, A picks, B backs out)
// ------------------------------------------------------------------------------------------

/**
 * (marlow-bays item 29, the pad drop-down bug) The open list's scrollTop that shows a row (`itemTop`, `itemH`, in the
 * list's content px) inside its view (`scrollTop`, `viewH`): unchanged when it shows, else the nearest edge. The panel
 * scrolls only the list itself: `scrollIntoView` also scrolled the panel around it, and that scroll closed the list.
 */
export function listScrollFor(scrollTop: number, viewH: number, itemTop: number, itemH: number): number {
  if (itemTop < scrollTop) return Math.max(0, itemTop);
  if (itemTop + itemH > scrollTop + viewH) return Math.max(0, itemTop + itemH - viewH);
  return scrollTop;
}

export class DropNav {
  open = false;
  index = 0;
  count = 0;
  private orig = 0;

  /** Open on the current choice (`cur`) of `count` choices. */
  openAt(cur: number, count: number): void {
    this.count = Math.max(0, count);
    this.index = this.orig = Math.max(0, Math.min(this.count - 1, cur));
    this.open = this.count > 0;
  }

  /** D-pad up (-1) / down (+1): the highlight moves (stops at the ends; a long list does not wrap past them). */
  move(d: number): number {
    if (!this.open || !this.count) return this.index;
    this.index = Math.max(0, Math.min(this.count - 1, this.index + d));
    return this.index;
  }

  /** A: the highlighted choice; the list closes. */
  pick(): number {
    this.open = false;
    return this.index;
  }

  /** B: the list closes on the choice it opened on (nothing changes). */
  back(): number {
    this.open = false;
    this.index = this.orig;
    return this.orig;
  }
}

// ------------------------------------------------------------------------------------------
// Size
// ------------------------------------------------------------------------------------------

export type TunerSize = 'S' | 'M' | 'L';
export const TUNER_SIZES: readonly TunerSize[] = ['S', 'M', 'L'];

/**
 * The panel's font size (px), width and height for the screen (CSS px): a size's base font at 1080 px tall, scaled with
 * the screen height (never under 11 px), and a width that never covers more than a third of the screen (62 % on a
 * narrow one).
 */
export function tunerScale(size: TunerSize, vw: number, vh: number): { font: number; width: number; height: number } {
  // (marlow-bays T2) larger text (the menus' condensed face, 19 px at 1080p for Medium), a narrower docked column
  const base = size === 'S' ? 16 : size === 'M' ? 19 : 22;
  const k = Math.max(0.75, Math.min(1.5, vh / 1080));
  const font = Math.max(11, Math.min(28, Math.round(base * k)));
  const share = vw < 1000 ? 0.62 : 0.34;
  const width = Math.round(Math.min(vw * share, font * 25));
  const height = Math.max(120, Math.round(vh - 8));
  return { font, width, height };
}

// ------------------------------------------------------------------------------------------
// The loop player's choice as tuner groups
// ------------------------------------------------------------------------------------------

/** What a loop uses: the body state, a keyed clip (the Keys tab), a co-op move or a climb move ('' none). */
export interface LoopGroups {
  body: string;
  clip: string;
  team: string;
  trav: string;
  step: string;
  weight: string;
}

const STATE_BODY: Readonly<Record<string, string>> = {
  idle: 'idle',
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  crouchIdle: 'crouchIdle',
  sneak: 'sneak',
  crouchWalk: 'crouchWalk',
  lowReady: 'lowReady',
  aimFwd: 'aim',
  aimStrafe: 'aim',
  aimBack: 'aim',
  // (marlow-bays T1a, item 19) the aim stances' own rows
  aimStill: 'aimStill',
  crouchAim: 'aimCrouch',
  crouchAimFwd: 'aimCrouchMove',
};

const TRAV_LOOP: Readonly<Record<string, { body: string; trav: string }>> = {
  vault: { body: '', trav: 'vault' },
  ledge: { body: 'ledge', trav: 'climbUp' },
  ladder: { body: 'ladder', trav: 'climbUp' },
  pipeV: { body: 'pipe', trav: 'climbUp' },
  pipeH: { body: 'hang', trav: '' },
  bar: { body: 'hang', trav: '' },
  vent: { body: 'crawl', trav: '' },
  window: { body: '', trav: 'windowVault' },
  door: { body: 'walk', trav: '' },
  rappel: { body: '', trav: 'rappel' },
  wall: { body: 'wallIdle', trav: '' },
};
/** The Stepping gait per body state (the planner's gaits; the crouch run its own). */
export const BODY_STEP: Readonly<Record<string, string>> = { idle: 'idle', crouchIdle: 'idle', walk: 'walk', jog: 'jog', run: 'run', sneak: 'crouchWalk', crouchWalk: 'crouchWalk', crouchRun: 'crouchRun' };
export const BODY_WEIGHT: Readonly<Record<string, string>> = { walk: 'walk', jog: 'jog', run: 'run', sneak: 'crouch', crouchWalk: 'crouch', crouchRun: 'crouch', crouchIdle: 'crouch', aim: 'drawn', aimStill: 'drawn', lowReady: 'drawn' };
/** The gun hold's state per body state (the weapon stays as picked). */
export const BODY_GUN: Readonly<Record<string, string>> = { lowReady: 'lowReady', aim: 'aim', aimStill: 'aim', aimCrouch: 'aimCrouch', aimCrouchMove: 'aimCrouch' };

/** (tuner-ui fix round) What a body state carries to the other sections ('' none). */
export interface BodyCarry {
  joint: string;
  ik: string;
  /** The last level (the state) of the hands and gun-in-hand groups: `hand.<weapon>.<state>`. */
  handState: string;
  /** The gun hold's state level (`<weapon>.<state>`). */
  gunState: string;
  step: string;
  weight: string;
}

/**
 * (tuner-ui fix round) A body state picked (by hand on the Body part, or by a loop) carries to the sections keyed by the
 * same state: Joints, Limb reach, Hands & feet, Gun in hand, the gun hold where it maps, Stepping and Weight. The panel
 * applies a group only when the section has it.
 */
export function bodyCarry(body: string, out: BodyCarry = { joint: '', ik: '', handState: '', gunState: '', step: '', weight: '' }, weapon = ''): BodyCarry {
  // (marlow-bays T1a, COVERAGE gap 3) an armed state with a rifle or pistol shown: that gun's own Joints row
  const gunRow = (weapon === 'rifle' || weapon === 'pistol') && (ARMED_JOINT_STATES as readonly string[]).includes(body);
  out.joint = body ? (gunRow ? `joint.${weapon}.${body}` : `joint.${body}`) : '';
  out.ik = body ? `ik.${body}` : '';
  out.handState = body;
  out.gunState = BODY_GUN[body] ?? '';
  out.step = BODY_STEP[body] ? `step.${BODY_STEP[body]}` : '';
  out.weight = BODY_WEIGHT[body] ? `weight.${BODY_WEIGHT[body]}` : '';
  return out;
}

/**
 * The tuner groups a loop of the Anim Studio uses (`state:<name>`, `keyed:<clip>`, `pair:<move>`, `trav:<move>`), so
 * picking a loop shows the sliders it plays through. Unknown or `off`: all ''.
 */
export function loopGroups(entry: string, out: LoopGroups = { body: '', clip: '', team: '', trav: '', step: '', weight: '' }): LoopGroups {
  out.body = out.clip = out.team = out.trav = out.step = out.weight = '';
  const i = entry.indexOf(':');
  const kind = i < 0 ? entry : entry.slice(0, i);
  const name = i < 0 ? '' : entry.slice(i + 1);
  if (kind === 'state') out.body = STATE_BODY[name] ?? '';
  else if (kind === 'keyed') {
    out.body = CLIP_BODY[name] ?? '';
    out.clip = name;
  } else if (kind === 'pair') {
    if (name.startsWith('hold_')) {
      out.body = 'hold';
      out.clip = name;
    } else out.team = `team.${name}.a`;
  } else if (kind === 'trav') {
    const t = TRAV_LOOP[name];
    if (t) {
      out.body = t.body;
      out.trav = t.trav ? `trav.${t.trav}` : '';
    }
  }
  if (entry === 'keyed:crouch_run') out.step = 'step.crouchRun';
  else if (BODY_STEP[out.body]) out.step = `step.${BODY_STEP[out.body]}`;
  if (BODY_WEIGHT[out.body]) out.weight = `weight.${BODY_WEIGHT[out.body]}`;
  return out;
}

/**
 * (marlow-bays slice T, item 11) The Anim Studio's "Keyed" tick box: a procedural state and its keyed clip are one loop
 * shown two ways. `STATE_KEYED` pairs each `state:<name>` with its `keyed:<clip>` (the loop list's own entries).
 */
const STATE_KEYED: Readonly<Record<string, string>> = {
  idle: 'idle',
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  crouchIdle: 'crouch_idle',
  sneak: 'sneak',
  crouchWalk: 'crouch_walk',
  lowReady: 'ready_stance',
  aimFwd: 'glide_fwd',
  aimStrafe: 'glide_strafe',
  aimBack: 'glide_back',
};
const KEYED_STATE: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(STATE_KEYED).map(([s, k]) => [k, s]));

export interface LoopKeyed {
  /** The loop plays a keyed clip now (the box shows ticked). */
  on: boolean;
  /** The entry the box switches to ('' none: the box is greyed; a keyed-only clip, a pair, a traversal loop or off). */
  other: string;
}

/** The "Keyed" box for loop `entry`. */
export function loopKeyed(entry: string, out: LoopKeyed = { on: false, other: '' }): LoopKeyed {
  out.on = entry.startsWith('keyed:');
  out.other = '';
  if (entry.startsWith('state:')) {
    const k = STATE_KEYED[entry.slice(6)];
    if (k) out.other = `keyed:${k}`;
  } else if (out.on) {
    const s = KEYED_STATE[entry.slice(6)];
    if (s) out.other = `state:${s}`;
  }
  return out;
}

/** The loop to play with the box set to `on` (unchanged when the loop has no other form or is already that way). */
export function loopKeyedPick(entry: string, on: boolean): string {
  const k = loopKeyed(entry);
  return k.on !== on && k.other ? k.other : entry;
}

/**
 * (marlow-bays slice T, item 13) In the Anim Studio a state picked by hand in any tab's state list plays that state's
 * loop: `section`'s new `group` (its last level is the state: `joint.walk`, `hand.rifle.walk`, `rifle.aim`,
 * `step.crouchRun`; the Keys tab's clip level names a keyed clip) to a loop entry, '' when it names none or the loop
 * `current` already plays that state. A keyed loop stays keyed where the state has a keyed clip (the Keyed box holds).
 * The camera never picks a loop. (marlow-bays T1a, item 16) A co-op role picks its pair, a climb move or a climbing
 * state its traversal loop (`TRAV_OF`), a Joints row of a gun (`joint.rifle.aim`) its state.
 */
export function loopForGroup(section: string, group: string, current: string): string {
  if (section === 'cam') return '';
  const seg = group.split('.');
  // (item 24, track A) a guard row picked: the guard puppet's loop of that row ('' a gait with no loop of its own)
  if (isGuardSection(section)) {
    const s = seg[seg.length - 1] ?? '';
    // the loop playing already plays through that row (or steps in that gait): it stays
    if (section === 'guardStep' ? guardLoopGroups(current).step === group : guardRowOfLoop(current) === s) return '';
    const id = guardLoopOf(section, s);
    return id === current ? '' : id;
  }
  if (section.startsWith('team_')) {
    const id = seg[1] && seg[0] === 'team' ? `pair:${seg[1]}` : '';
    return id === current ? '' : id;
  }
  if (section === 'trav') {
    const id = TRAV_OF[seg[1] ?? ''] ?? '';
    return id === current ? '' : id;
  }
  if (section === 'keys') {
    const clip = seg[1] ?? '';
    if (!clip || current === `keyed:${clip}`) return '';
    return `keyed:${clip}`;
  }
  const state = seg[seg.length - 1] ?? '';
  if (section === 'step' && state === 'crouchRun') return current === 'keyed:crouch_run' ? '' : 'keyed:crouch_run';
  if (!state || loopGroups(current).body === state) return '';
  const keyedNow = current.startsWith('keyed:');
  let proc = '';
  for (const name in STATE_BODY) {
    if (STATE_BODY[name] === state) {
      proc = `state:${name}`;
      break;
    }
  }
  if (proc) return keyedNow ? loopKeyedPick(proc, true) : proc;
  for (const clip in CLIP_BODY) if (CLIP_BODY[clip] === state) return `keyed:${clip}`;
  const tr = TRAV_OF[state];
  return tr && tr !== current ? tr : '';
}

/** (item 24, track A) The guard puppet's loops (`studio.ts` GUARD_LOOPS) and the guard row each plays through. */
const GUARD_LOOP_ROW: Readonly<Record<string, string>> = {
  'guard:idle': 'idle',
  'guard:patrol': 'walk',
  'guard:alert': 'walk',
  'guard:run': 'run',
  'guard:aim': 'aim',
  'guard:crouchAim': 'crouch',
  'guard:cover': 'cover',
};
/**
 * The stepping gait each guard loop steps in: the planner's own pick for the loop's pace and stance (`stepGaitIndex`),
 * so the shown row is the one the puppet uses (the run at 3.2 m/s steps in the jog gait: the jog / run split is 3.5).
 */
export const GUARD_LOOP_GAIT: Readonly<Record<string, string>> = Object.fromEntries(
  STUDIO_ENTRIES.filter((e) => e.gloop).map((e) => [e.id, STEP_GAITS[stepGaitIndex(e.gloop!.speed > 0, e.gloop!.speed, e.gloop!.crouch ? 1 : 0)]!]),
);

/** (item 24) The guard row a guard loop plays through ('' not a guard loop). */
export function guardRowOfLoop(loop: string): string {
  return GUARD_LOOP_ROW[loop] ?? '';
}

/** (item 24) The guard groups a guard loop uses: Guard joints and Guard weight by its row, Guard stepping by its gait. */
export function guardLoopGroups(loop: string): { joint: string; step: string; weight: string } {
  const r = GUARD_LOOP_ROW[loop] ?? '';
  const g = GUARD_LOOP_GAIT[loop] ?? '';
  return { joint: r ? `guard.joint.${r}` : '', step: g ? `guard.step.${g}` : '', weight: r ? `guard.weight.${r}` : '' };
}

/** (item 24) The guard loop of a guard section's row or gait ('' none). */
export function guardLoopOf(section: string, seg: string): string {
  // a gait: the first guard loop that steps in it (the same pick as GUARD_LOOP_GAIT)
  if (section === 'guardStep') {
    for (const id in GUARD_LOOP_GAIT) if (GUARD_LOOP_GAIT[id] === seg) return id;
    return '';
  }
  for (const id in GUARD_LOOP_ROW) if (GUARD_LOOP_ROW[id] === seg) return id;
  return '';
}

/** (marlow-bays T1a, item 16) The traversal loop of a climb move (`trav.<kind>`) or a climbing body state. */
const TRAV_OF: Readonly<Record<string, string>> = {
  vault: 'trav:vault',
  windowVault: 'trav:window',
  rappel: 'trav:rappel',
  climbUp: 'trav:ledge',
  ladder: 'trav:ladder',
  pipe: 'trav:pipeV',
  ledge: 'trav:ledge',
  hang: 'trav:pipeH',
  crawl: 'trav:vent',
  vent: 'trav:vent',
};

// ------------------------------------------------------------------------------------------
// (marlow-bays T2) Row groups that fold (item 29: the pinned and recent sliders, the search and the part filter are gone)
// ------------------------------------------------------------------------------------------

/** What decides whether a row group shows open before anyone opens or closes it by hand. */
export interface GroupOpenIn {
  /** The section's first group. */
  first: boolean;
  /** It holds the selected row. */
  hasSel: boolean;
  /** How many rows the section shows in all. */
  rows: number;
}

/** Rows this many or fewer: every group open (nothing to fold away). */
export const GROUP_FOLD_MIN = 8;

/**
 * A row group's open state: a choice made by hand (`manual`) holds; otherwise open when it is the first group, holds the
 * selected row, or a short list leaves little to show.
 */
export function groupOpen(manual: boolean | undefined, g: GroupOpenIn): boolean {
  if (manual !== undefined) return manual;
  return g.first || g.hasSel || g.rows <= GROUP_FOLD_MIN;
}

/**
 * (marlow-bays T2) The status line's stance: the body state the animation reads (`body`) and the gun as it really is.
 * In the Anim Studio (`studio`): the loop playing, and the picked gun drawn (an armed loop) or holstered; outside it the
 * game's gun state (`rifle.aim`), or "no gun drawn".
 */
export function stanceText(body: string, gun: string, studio: { loop: string; drawn: boolean; weapon: string } | null): string {
  const b = body ? plainWords(body) : '-';
  if (studio) {
    const w = plainWords(studio.weapon || 'rifle');
    const loop = studio.loop && studio.loop.toLowerCase() !== b.toLowerCase() ? `${studio.loop} (${b.toLowerCase()})` : b;
    return `${loop} · ${w} ${studio.drawn ? 'drawn' : 'holstered'}`;
  }
  return `${b} · ${gun ? plainWords(gun.replace('.', ' ')) : 'No gun drawn'}`;
}

// ------------------------------------------------------------------------------------------
// (track C request, item 29 phase 2) The studio's foot slide line
// ------------------------------------------------------------------------------------------

/** A planted foot sliding more than this (cm) in one contact shows the line amber. */
export const FOOT_SLIDE_WARN = 0.5;

/** A slide (cm) as whole tenths of a cm (the line's resolution; NaN / negative: 0). */
export function footSlideTenths(cm: number): number {
  return cm > 0 ? Math.round(cm * 10) : 0;
}

/** "Foot slide L 0.0 cm  R 0.0 cm" from the tenths. */
export function footSlideText(l: number, r: number): string {
  return `Foot slide L ${(l / 10).toFixed(1)} cm  R ${(r / 10).toFixed(1)} cm`;
}

/** Amber: either foot over the limit (the tenths, as shown). */
export function footSlideWarn(l: number, r: number): boolean {
  return l > FOOT_SLIDE_WARN * 10 || r > FOOT_SLIDE_WARN * 10;
}
