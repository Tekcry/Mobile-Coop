/**
 * (tuner-ui) The animation tuner panel's layout, the pure part (no DOM, no Babylon; unit-tested in
 * `tests/tunerLayout.test.ts`): the tabs and which registered section sits in which, the group pickers' levels (a group
 * id split on its dots: `hand.rifle.walk` is weapon then state), plain English labels for parts, groups and sliders
 * (the ids never change: saves, exports and the bake table key on them), the drop-down list's navigation, the panel
 * size, and which tuner groups a loop of the Anim Studio uses.
 */

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
  { id: 'settings', label: 'Settings' },
];

/** Which tab a registered section sits in (the Co-op sections by their `team_` prefix). */
const SECTION_TAB: Readonly<Record<string, string>> = {
  body: 'body',
  joint: 'body',
  ik: 'body',
  trav: 'body',
  hand: 'hands',
  gun: 'weapon',
  weapon: 'weapon',
  step: 'stepping',
  speed: 'stepping',
  weight: 'weight',
  cam: 'camera',
  keys: 'keys',
};

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
 * one): the fixed tabs (View and Settings always; a section tab only when it has a section), with every unmapped
 * section's own tab after Co-op and before Settings.
 */
export function buildTabs(ids: readonly string[], label: (id: string) => string): TunerTab[] {
  const out: TunerTab[] = [];
  for (const t of TUNER_TABS) {
    if (t.id === 'settings') {
      for (const id of ids) if (tabOfSection(id).startsWith('sec:')) out.push({ id: `sec:${id}`, label: plainSection(id, label(id)), sections: [id] });
    }
    const secs = ids.filter((id) => tabOfSection(id) === t.id);
    if (t.id === 'view' || t.id === 'settings' || secs.length) out.push({ id: t.id, label: t.label, sections: secs });
  }
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
const LEVEL_NAMES: Readonly<Record<string, readonly string[]>> = {
  body: ['State'],
  joint: ['State'],
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

/** One picker choice (a segment of a group id) in plain words: `keys` keys count from 1. */
export function plainGroupWord(section: string, level: number, seg: string): string {
  if (section === 'keys' && level === 1 && /^\d+$/.test(seg)) return `Key ${Number(seg) + 1}`;
  return GROUP_WORDS[seg] ?? plainWords(seg);
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
  trackMul: 'Foot width',
  kneeOutMul: 'Knee out',
  kneeLiftMul: 'Knee lift',
  pelvisYAdd: 'Hip height',
  leanAdd: 'Lean',
  armSwingGrow: 'Arm swing with speed',
  elbowOutAdd: 'Elbow out',
  elbowPoleMul: 'Elbow angle',
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
  footOutAdd: 'Feet apart',
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
  headDropMul: 'Head to sights',
  tuckMul: 'Elbow tuck',
  glideTwistMul: 'Glide hip twist',
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
  // gun in hand
  gunScale: 'Gun size',
  gunX: 'Grip right',
  gunY: 'Grip up',
  gunZ: 'Grip forward',
  'weapon:gunPitch': 'Grip tilt',
  'weapon:gunYaw': 'Grip turn',
  gunRoll: 'Grip roll',
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
};

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'little'];

/**
 * A slider's name in short plain words (display only): the table above, then the patterns of the generated sliders
 * (joints, limbs, fingers, keys), then the registry label without its brackets or second wording.
 */
export function plainLabel(section: string, id: string, label: string): string {
  const own = PLAIN[`${section}:${id}`] ?? (section.startsWith('team_') || section === 'trav' ? PLAIN[id] : undefined) ?? PLAIN[id];
  if (own) return own;
  // joints (`elbowR_x`) and the keys' joints (`pelvis_pitch`)
  let m = /^([a-zA-Z]+)_(x|y|z|pitch|yaw|roll)$/.exec(id);
  if (m) return `${jointWords(m[1]!)} ${AXIS_WORDS[m[2]!]}`;
  // the keys' arms (`armL_flex`, `armR_wristPitch`)
  m = /^arm([LR])_(\w+)$/.exec(id);
  if (m) {
    const side = m[1] === 'L' ? 'Left' : 'Right';
    const what: Record<string, string> = { flex: 'arm forward', abd: 'arm out', elbow: 'elbow bend', inward: 'forearm in', wristPitch: 'wrist bend', wristYaw: 'wrist turn', wristRoll: 'wrist roll' };
    return `${side} ${what[m[2]!] ?? plainWords(m[2]!).toLowerCase()}`;
  }
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
  return plainWords(rest);
}

/** A unit beside a value ('' none). */
export function plainUnit(unit: string): string {
  if (unit === 'x') return '×';
  if (unit === 'deg') return '°';
  if (unit === '1-zeta') return '';
  return unit;
}

/** A value as text with as many decimals as its step needs. */
export function valueText(v: number, step: number): string {
  const d = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step > 0 ? step : 1) - 1e-9)));
  return v.toFixed(d);
}

// ------------------------------------------------------------------------------------------
// The drop-down list's navigation (A opens, the D-pad moves, A picks, B backs out)
// ------------------------------------------------------------------------------------------

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
 * the screen height (a phone in landscape stays readable: never under 10 px), and a width that never covers more than
 * half the screen (62 % on a narrow one).
 */
export function tunerScale(size: TunerSize, vw: number, vh: number): { font: number; width: number; height: number } {
  const base = size === 'S' ? 12 : size === 'M' ? 14 : 16;
  const k = Math.max(0.75, Math.min(1.5, vh / 1080));
  const font = Math.max(10, Math.min(24, Math.round(base * k)));
  const share = vw < 1000 ? 0.62 : 0.5;
  const width = Math.round(Math.min(vw * share, font * 34));
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
};
const CLIP_BODY: Readonly<Record<string, string>> = {
  idle: 'idle',
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  ready_stance: 'lowReady',
  glide_fwd: 'aim',
  glide_strafe: 'aim',
  glide_back: 'aim',
  crouch_idle: 'crouchIdle',
  sneak: 'sneak',
  crouch_walk: 'crouchWalk',
  crouch_run: 'crouchWalk',
  wall_idle: 'wallIdle',
  wall_slide: 'wallSlide',
  wall_peek: 'wallPeek',
  wall_crouch_idle: 'wallIdle',
  wall_crouch_slide: 'wallSlide',
  wall_crouch_peek: 'wallPeek',
  hold_idle: 'hold',
  hold_fwd: 'hold',
  hold_back: 'hold',
  hold_side: 'hold',
  hold_choke: 'hold',
  hold_knife: 'hold',
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
const BODY_STEP: Readonly<Record<string, string>> = { idle: 'idle', crouchIdle: 'idle', walk: 'walk', jog: 'jog', run: 'run', sneak: 'crouchWalk', crouchWalk: 'crouchWalk' };
const BODY_WEIGHT: Readonly<Record<string, string>> = { walk: 'walk', jog: 'jog', run: 'run', sneak: 'crouch', crouchWalk: 'crouch', crouchIdle: 'crouch', aim: 'drawn', lowReady: 'drawn' };
/** The gun hold's state per body state (the weapon stays as picked). */
const BODY_GUN: Readonly<Record<string, string>> = { lowReady: 'lowReady', aim: 'aim', aimCrouch: 'aimCrouch' };

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
export function bodyCarry(body: string, out: BodyCarry = { joint: '', ik: '', handState: '', gunState: '', step: '', weight: '' }): BodyCarry {
  out.joint = body ? `joint.${body}` : '';
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
 * The camera and the co-op and climb sections never pick a loop.
 */
export function loopForGroup(section: string, group: string, current: string): string {
  if (section === 'cam' || section === 'trav' || section.startsWith('team_')) return '';
  const seg = group.split('.');
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
  return '';
}
