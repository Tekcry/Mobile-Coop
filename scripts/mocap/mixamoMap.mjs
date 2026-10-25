// (mixamo-retarget M2) The Mixamo bone map: Mixamo skeleton bones (`mixamorig:Hips`, `mixamorig1:LeftArm`, ...) onto the
// CMU-named slots that scripts/mocap/retarget.mjs and analyze.mjs read (`root`, `upperback`, `lhumerus`, `lfemur`, ...),
// so a Mixamo take (mixamoTake.mjs) has the same shape as a CMU take (asfamc.mjs `loadTake`). Pure data and checks.
//
// A slot is a CMU-style bone: it starts at its parent slot's tip, ends at its own tip, and turns with the rest-relative
// world rotation of one Mixamo bone (`rot`). Its tip is the HEAD of the Mixamo bone named in `end` (never an importer
// tail: the FBX importer guesses tails), so every segment end point is a measured joint. A Mixamo child bone whose head
// is not its parent slot's tip (the hips' leg sockets, the shoulders on Spine2, the fingers on the hand) gets an
// `offset` slot carrying the rigid hop in the parent bone's frame (as CMU's `lhipjoint`). A `hub` slot has no length
// (its tip is its start) and exists so CMU names analyze.mjs reads (`lowerneck`, `lwrist`) are present.
//
// Spine (A6): Mixamo has three spine bones, Wren two. Wren `spine` follows Spine1 (`upperback`), `chest` follows Spine2
// (`thorax`); `Spine` (`lowerback`) only carries the chain, its share reaching Wren through the rest correction of the
// pelvis-to-spine segment. Fingers, clavicles: extra slots for the keyed `fing` / `clav` channels (A7; M3 emits them).
// `*_End`, `HeadTop_End` and the finger `4` bones are end points only. Lengths here are the file's; the retarget always
// uses Wren's own lengths (rest correction aims Wren's segments).

/** Downloaded frame rate (BRIEF A3); the adapter resamples whatever the dump says to the pipeline's 120 fps. */
export const MIXAMO_FPS = 30;

/** Accepted name prefixes: `mixamorig:`, `mixamorig1:`, `mixamorig2:` ... or none. */
export const MIXAMO_PREFIX = /^mixamorig\d*:/;
export const baseName = (name) => name.replace(MIXAMO_PREFIX, '');
export const prefixOf = (name) => name.match(MIXAMO_PREFIX)?.[0] ?? '';

const SIDES = [['l', 'Left'], ['r', 'Right']];
export const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

/** The 22 bones every supported file has (Mixamo's no-finger skeleton less its end bones); a missing one is an error. */
export const MIXAMO_REQUIRED = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  ...SIDES.flatMap(([, S]) => [`${S}Shoulder`, `${S}Arm`, `${S}ForeArm`, `${S}Hand`, `${S}UpLeg`, `${S}Leg`, `${S}Foot`, `${S}ToeBase`]),
];
/** End-point-only bones: when missing, the slot's tip is extended along its parent slot (`extend`, a length ratio). */
export const MIXAMO_ENDS = ['HeadTop_End', ...SIDES.flatMap(([, S]) => [`${S}Toe_End`, ...FINGERS.map((F) => `${S}Hand${F}4`)])];
/** Optional finger bones (a finger with any of its three joints missing is left out and listed in the report). */
export const MIXAMO_FINGER_BONES = SIDES.flatMap(([, S]) => FINGERS.flatMap((F) => [1, 2, 3].map((k) => `${S}Hand${F}${k}`)));
/** Every bone of the standard 65-bone skeleton. */
export const MIXAMO_ALL = [...MIXAMO_REQUIRED, ...MIXAMO_FINGER_BONES, ...MIXAMO_ENDS];

/**
 * slot -> { rot, end, parent, kind, extend? }. Insertion order is parents before children.
 *   rot     the Mixamo bone whose rotation turns the slot
 *   end     the Mixamo bone whose head is the slot's tip; null for a hub (tip = start)
 *   parent  the slot whose tip is this slot's start (null for `root`, whose tip is the Hips head)
 *   kind    'core' (drives a Wren segment or the trunk chain), 'offset' (rigid hop), 'hub', 'clav', 'finger',
 *           'alias' (a CMU name analyze.mjs reads, the same data as a finger slot)
 *   extend  when `end` is missing in the file: the tip = start + extend x the parent slot's rest vector
 */
export const MIXAMO_MAP = (() => {
  const m = {};
  const add = (slot, rot, end, parent, kind, extend) => { m[slot] = { rot, end, parent, kind, ...(extend ? { extend } : {}) }; };
  add('root', 'Hips', 'Hips', null, 'core');
  add('spinejoint', 'Hips', 'Spine', 'root', 'offset');
  add('lowerback', 'Spine', 'Spine1', 'spinejoint', 'core');
  add('upperback', 'Spine1', 'Spine2', 'lowerback', 'core');
  add('thorax', 'Spine2', 'Neck', 'upperback', 'core');
  add('lowerneck', 'Spine2', null, 'thorax', 'hub');
  add('upperneck', 'Neck', 'Head', 'lowerneck', 'core');
  add('head', 'Head', 'HeadTop_End', 'upperneck', 'core', 1.7);
  for (const [s, S] of SIDES) {
    add(`${s}clavjoint`, 'Spine2', `${S}Shoulder`, 'thorax', 'offset');
    add(`${s}clavicle`, `${S}Shoulder`, `${S}Arm`, `${s}clavjoint`, 'clav');
    add(`${s}humerus`, `${S}Arm`, `${S}ForeArm`, `${s}clavicle`, 'core');
    add(`${s}radius`, `${S}ForeArm`, `${S}Hand`, `${s}humerus`, 'core');
    add(`${s}wrist`, `${S}Hand`, null, `${s}radius`, 'hub');
    add(`${s}hand`, `${S}Hand`, `${S}HandMiddle1`, `${s}wrist`, 'core', 0.4);
    for (const F of FINGERS) {
      const f = `${s}${F.toLowerCase()}`;
      add(`${f}0`, `${S}Hand`, `${S}Hand${F}1`, `${s}wrist`, 'offset');
      add(`${f}1`, `${S}Hand${F}1`, `${S}Hand${F}2`, `${f}0`, 'finger');
      add(`${f}2`, `${S}Hand${F}2`, `${S}Hand${F}3`, `${f}1`, 'finger');
      add(`${f}3`, `${S}Hand${F}3`, `${S}Hand${F}4`, `${f}2`, 'finger', 1);
    }
    add(`${s}fingers`, `${S}HandMiddle1`, `${S}HandMiddle2`, `${s}hand`, 'alias');
    add(`${s}thumb`, `${S}HandThumb1`, `${S}HandThumb2`, `${s}thumb0`, 'alias');
    add(`${s}hipjoint`, 'Hips', `${S}UpLeg`, 'root', 'offset');
    add(`${s}femur`, `${S}UpLeg`, `${S}Leg`, `${s}hipjoint`, 'core');
    add(`${s}tibia`, `${S}Leg`, `${S}Foot`, `${s}femur`, 'core');
    add(`${s}foot`, `${S}Foot`, `${S}ToeBase`, `${s}tibia`, 'core');
    add(`${s}toes`, `${S}ToeBase`, `${S}Toe_End`, `${s}foot`, 'core', 0.6);
  }
  return m;
})();

/** Mixamo bone -> the slot it drives (the primary one; offsets and hubs also turn with the parent bone). */
export const MIXAMO_TO_SLOT = Object.fromEntries(
  Object.entries(MIXAMO_MAP).filter(([, d]) => d.kind === 'core' || d.kind === 'clav' || d.kind === 'finger').map(([slot, d]) => [d.rot, slot]),
);

/**
 * Checks a dump's bone list and resolves base names. `bones`: [{ name, parent }] (parent a full name or null).
 * Returns { prefix, full: Map<base, full name>, parent: Map<base, parent base | null>, missingFingers, missingEnds,
 * unknown }. Throws on a missing required bone, mixed prefixes, a duplicate base name, or a hierarchy the map's rigid
 * offsets cannot use (an end bone whose parent is not the slot's rotation bone).
 */
export function resolveMixamoBones(bones) {
  const prefixes = new Set(bones.map((b) => prefixOf(b.name)));
  if (prefixes.size > 1) throw new Error(`mixamo: mixed bone name prefixes ${[...prefixes].map((p) => `"${p}"`).join(', ')}`);
  const full = new Map(), parent = new Map();
  for (const b of bones) {
    const n = baseName(b.name);
    if (full.has(n)) throw new Error(`mixamo: duplicate bone ${n}`);
    full.set(n, b.name);
    parent.set(n, b.parent == null ? null : baseName(b.parent));
  }
  const missing = MIXAMO_REQUIRED.filter((n) => !full.has(n));
  if (missing.length) throw new Error(`mixamo: missing bone${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (have ${full.size} bones)`);
  const missingFingers = [];
  for (const [, S] of SIDES) for (const F of FINGERS) if ([1, 2, 3].some((k) => !full.has(`${S}Hand${F}${k}`))) missingFingers.push(`${S}Hand${F}`);
  const missingEnds = MIXAMO_ENDS.filter((n) => !full.has(n) && !missingFingers.some((f) => n.startsWith(f)));
  const known = new Set(MIXAMO_ALL);
  const unknown = [...full.keys()].filter((n) => !known.has(n));
  const res = { prefix: [...prefixes][0] ?? '', full, parent, missingFingers, missingEnds, unknown };
  for (const s of mixamoSlots(res)) {
    if (!s.end || s.slot === 'root') continue;
    const p = parent.get(s.end);
    if (p !== s.rot) throw new Error(`mixamo: ${s.end}'s parent is ${p ?? 'none'}, the map needs ${s.rot} (slot ${s.slot})`);
  }
  return res;
}

/**
 * The slots a resolved file supports, parents first: [{ slot, rot, end, parent, kind, extend }] with `end` null for a
 * hub or when the end bone is missing (then `extend` gives the tip). A missing finger drops its slots; the CMU aliases
 * `lfingers` / `lthumb` then become hubs on the hand.
 */
export function mixamoSlots(res) {
  const out = [];
  for (const [slot, d] of Object.entries(MIXAMO_MAP)) {
    const finger = /Hand(Thumb|Index|Middle|Ring|Pinky)/.exec(d.end ?? '')?.[0] ?? /Hand(Thumb|Index|Middle|Ring|Pinky)/.exec(d.rot)?.[0];
    const side = slot[0] === 'l' ? 'Left' : 'Right';
    const fingerGone = finger && res.missingFingers.includes(`${side}${finger}`);
    if (fingerGone && d.kind === 'alias') { out.push({ slot, rot: `${side}Hand`, end: null, parent: `${slot[0]}${slot.endsWith('thumb') ? 'wrist' : 'hand'}`, kind: 'hub' }); continue; }
    if (fingerGone && d.kind === 'core') { out.push({ slot, rot: d.rot, end: null, parent: d.parent, kind: d.kind, extend: d.extend }); continue; }
    if (fingerGone) continue;
    const endMissing = d.end && !res.full.has(d.end);
    if (endMissing && !d.extend) throw new Error(`mixamo: slot ${slot} needs ${d.end}`);
    out.push({ slot, rot: d.rot, end: endMissing ? null : d.end, parent: d.parent, kind: d.kind, ...(d.extend ? { extend: d.extend } : {}) });
  }
  return out;
}
