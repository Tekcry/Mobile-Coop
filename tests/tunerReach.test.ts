// (tuner-clarity S3; Michael 2026-10-25: "I can't tell if my changes are working between motion capture or keyed. Must
// be clear") The reach table (`src/ui/tunerReach.ts`): every registered section has a rule, every clip slot of the
// locomotion set a body state, every Body field a layer entry, the layer table agrees with the motion-capture probe's
// recorded lists, no capture ever gets a Keys offset table, the edit warnings name where the working setting lives (A8:
// both of his fixes for the legs), the strings are plain words, and the Keys legs and fingers have parts of their own.
import { afterEach, describe, expect, it } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import '../src/anim/tuneGuard';
import '../src/anim/tuneClipSpeed';
import '../src/anim/cqGait';
import '../src/weapons/drawTune';
import '../src/anim/strikeBody';
import '../src/player/speedTune';
import '../src/player/weightTune';
import '../src/anim/moveTune';
import { BODY_FIELDS, BODY_GROUPS, TUNABLES } from '../src/anim/tune';
import { HAND_KEYED_SET, MOCAP_LAYERS, MOCAP_SET } from '../src/anim/mocap';
import { CLIP_BODY } from '../src/anim/studio';
import { KEY_FIELDS, keyGroupId } from '../src/anim/tuneKeysFile';
import { keyedClipByName, tuneKeysSync } from '../src/anim/tuneKeys';
import { TUNE_SECTIONS, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { EFFECT_REASONS, NO_EFFECT } from '../src/ui/tunerEffect';
import { plainLabel } from '../src/ui/tunerLayout';
import { tuneTarget } from '../src/ui/tunerTarget';
import {
  BODY_LAYER,
  CLARITY_WARN_LABEL,
  editWarning,
  HAND_MADE_ONLY_NOTE,
  hasCapture,
  KEYS_CAPTURED_CLIPS,
  KEYS_CAPTURED_NOTE,
  KEYS_MOCAP_NOTE,
  keyToolField,
  MOCAP_BOX_LABEL,
  MOCAP_STATE_OF,
  REACH_TITLES,
  REACH_WORDS,
  reachBand,
  reachSummary,
  rowNote,
  rowNow,
  rowReach,
  rowShown,
  rowStates,
  sectionRule,
  WORKS_INSTEAD,
  type Reach,
  type ReachBand,
  type ReachNow,
} from '../src/ui/tunerReach';

/** What plays now; the band is the share's plain band (no history) unless one is given. */
const now = (state: ReachNow['state'], mocapShare: number, switchOn = true, drawn = false, band?: ReachBand): ReachNow => ({
  state,
  mocapShare,
  band: band ?? reachBand('mid', switchOn ? mocapShare : 0),
  switchOn,
  drawn,
});
const REACHES: readonly Reach[] = ['mocap', 'keyed', 'both', 'none'];

describe('tuner clarity: the reach table', () => {
  afterEach(() => {
    tuneResetAll();
    tuneKeysSync();
  });

  it('has a rule for every registered section, and every row reaches something known', () => {
    const ids = TUNE_SECTIONS.map((s) => s.id);
    // the sections the PLAN names are all registered here (the import list above is complete)
    for (const id of ['body', 'gun', 'cam', 'joint', 'hand', 'ik', 'weapon', 'step', 'gear', 'speed', 'weight', 'keys', 'trav', 'cq', 'strike', 'clip', 'draw', 'guardJoint', 'guardStep', 'guardWeight', 'team_boost']) expect(ids, id).toContain(id);
    for (const s of TUNE_SECTIONS) {
      expect(sectionRule(s.id), `section ${s.id} has no reach rule`).toBeDefined();
      for (const g of s.groups) for (const t of s.tunables) expect(REACHES, `${s.id} ${g} ${t.id}`).toContain(rowReach(s.id, g, t.id));
    }
    expect(sectionRule('not_a_section')).toBeUndefined();
    expect(rowReach('not_a_section', 'x', 'y')).toBe('none');
  });

  it('places every clip slot of the locomotion set on a body state, and every Body field in the layer table', () => {
    // the type (LocoSlot) makes a new slot fail tsc; the data agrees: every clip field of both sets is a slot
    for (const set of [MOCAP_SET, HAND_KEYED_SET]) {
      for (const [k, v] of Object.entries(set)) {
        const clip = v !== null && typeof v === 'object' && typeof (v as { name?: unknown }).name === 'string';
        if (clip) expect(MOCAP_STATE_OF, `slot ${k}`).toHaveProperty(k);
      }
    }
    for (const s of Object.values(MOCAP_STATE_OF)) expect(BODY_GROUPS as readonly string[]).toContain(s);
    expect(Object.keys(BODY_LAYER).sort()).toEqual([...BODY_FIELDS].sort());
    for (const v of Object.values(BODY_LAYER)) if (v !== null) expect(MOCAP_LAYERS).toHaveProperty(v);
    for (const s of ['walk', 'jog', 'run', 'idle', 'sneak', 'aim']) expect(hasCapture(s), s).toBe(true);
    for (const s of ['crouchWalk', 'crouchRun', 'ladder', 'wallSlide', 'lowReady', 'hold']) expect(hasCapture(s), s).toBe(false);
    for (const c of KEYS_CAPTURED_CLIPS) expect(hasCapture(CLIP_BODY[c] ?? ''), c).toBe(true);
  });

  it('follows the code facts per section (PLAN 2(a))', () => {
    expect(rowReach('keys', keyGroupId('walk', 0), 'chest_pitch')).toBe('keyed');
    expect(rowReach('cam', 'cam.explore', 'camBoomAdd')).toBe('none');
    expect(rowReach('gear', 'gear.holster', 'x')).toBe('none');
    expect(rowReach('trav', 'trav.vault', 'bodyFwd')).toBe('keyed');
    expect(rowReach('team_boost', 'team.boost.a', 'bodyFwd')).toBe('keyed');
    expect(rowReach('guardJoint', 'guard.joint.walk', 'kneeL_x')).toBe('keyed');
    expect(rowReach('draw', 'draw.rifle', 'reachAdd')).toBe('keyed');
    // after the blend: both on a captured state; hand-made where nothing is captured; a gun in hand: the strafe only
    expect(rowReach('joint', 'joint.walk', 'ankleL_y')).toBe('both');
    expect(rowReach('joint', 'joint.ladder', 'ankleL_y')).toBe('keyed');
    expect(rowReach('joint', 'joint.swap', 'elbowL_x')).toBe('keyed');
    expect(rowReach('joint', 'joint.rifle.walk', 'elbowL_x')).toBe('keyed');
    expect(rowReach('joint', 'joint.rifle.aim', 'elbowL_x')).toBe('both');
    expect(rowReach('joint', 'joint.options', 'mirror')).toBe('none');
    expect(rowReach('hand', 'hand.none.walk', 'footLFwd')).toBe('both');
    expect(rowReach('hand', 'hand.rifle.walk', 'handLFwd')).toBe('keyed');
    expect(rowReach('ik', 'ik.jog', 'footR')).toBe('both');
    expect(rowReach('gun', 'rifle.lowReady', 'gunFwd')).toBe('keyed');
    expect(rowReach('gun', 'rifle.aim', 'gunFwd')).toBe('both');
    expect(rowReach('speed', 'spd.stand', 'walkMul')).toBe('both');
    expect(rowReach('speed', 'spd.climb', 'ladderMul')).toBe('keyed');
    // Body: the layer table (A5), then the probe (truth wins: Knee lift is dead on the captured walk)
    expect(rowReach('body', 'walk', 'armSwingMul')).toBe('keyed');
    expect(rowReach('body', 'walk', 'leanAdd')).toBe('keyed');
    expect(rowReach('body', 'walk', 'kneeOutMul')).toBe('both');
    expect(rowReach('body', 'walk', 'kneeLiftMul')).toBe('keyed');
    expect(rowReach('body', 'sneak', 'kneeLiftMul')).toBe('both');
    expect(rowReach('body', 'ladder', 'kneeOutMul')).toBe('keyed');
    // Stepping and Weight: many states to one gait; both when any captured state shows it on the capture
    expect(rowStates('step', 'step.crouchWalk').sort()).toEqual(['crouchWalk', 'sneak']);
    expect(rowStates('weight', 'weight.drawn').sort()).toEqual(['aim', 'aimStill', 'lowReady']);
    expect(rowReach('step', 'step.walk', 'lift')).toBe('keyed');
    expect(rowReach('step', 'step.crouchWalk', 'lift')).toBe('both');
    expect(rowReach('step', 'step.crouchRun', 'lift')).toBe('keyed');
    expect(rowReach('weight', 'weight.walk', 'plantDrop')).toBe('keyed');
    expect(rowReach('weight', 'weight.crouch', 'plantDrop')).toBe('both');
    expect(rowReach('weight', 'weight.walk', 'startMul')).toBe('both');
    expect(rowStates('keys', keyGroupId('sneak', 2))).toEqual(['sneak']);
    expect(rowStates('keys', 'key.walk.mirror')).toEqual(['walk']);
  });

  it('the layer table agrees with the probe lists (a layer-off slider is dead on every probed capture)', () => {
    for (const [state, modes] of Object.entries(NO_EFFECT)) {
      const dead = modes.mocap;
      if (!dead) continue;
      for (const t of TUNABLES) {
        if (!(t.groups as readonly string[]).includes(state) || !(t.id in BODY_LAYER)) continue;
        const layer = BODY_LAYER[t.id as keyof typeof BODY_LAYER];
        if (layer !== null && MOCAP_LAYERS[layer] === 0) expect(dead, `${state} ${t.id}: the layer is off, the probe sees it on the capture`).toContain(`body:${t.id}`);
        expect(rowReach('body', state, t.id), `${state} ${t.id}`).toBe(dead.includes(`body:${t.id}`) ? 'keyed' : 'both');
      }
    }
  });

  it('never gives a motion-capture clip a Keys offset table', () => {
    for (const c of KEYS_CAPTURED_CLIPS) {
      expect(tuneSet(keyGroupId(c, 0), 'chest_pitch', 5), c).toBe(true);
      expect(tuneSet(keyGroupId(c, 0), 'legL_knee', 5), c).toBe(true);
    }
    tuneKeysSync();
    expect(keyedClipByName('walk')?.keyOff ?? null, 'the hand-made walk takes the edit').not.toBeNull();
    for (const [k, v] of Object.entries(MOCAP_SET)) {
      if (v !== null && typeof v === 'object' && 'keyOff' in v) expect((v as { keyOff: unknown }).keyOff, `mocap ${k}`).toBeNull();
    }
  });

  it('tags a row by what plays now (A11)', () => {
    // a hand-made-only row of the state playing on the capture: not playing now; under 90 %: as it is
    expect(rowNow('keyed', 'walk', now('walk', 0.95))).toBe('off');
    expect(rowNow('keyed', 'walk', now('walk', 0.6))).toBe('keyed');
    expect(rowNow('keyed', 'walk', now('walk', 0.95, false))).toBe('keyed');
    expect(rowNow('keyed', ['sneak', 'crouchWalk'], now('sneak', 1))).toBe('off');
    // another state's row: no tag change (the warning says so)
    expect(rowNow('keyed', 'jog', now('walk', 1))).toBe('keyed');
    expect(rowNow('mocap', 'walk', now('walk', 0.05))).toBe('off');
    expect(rowNow('mocap', 'walk', now('walk', 0.5))).toBe('mocap');
    expect(rowNow('both', 'walk', now('walk', 1))).toBe('both');
    expect(rowNow('none', 'walk', now('walk', 1))).toBe('none');
    expect(rowNow('keyed', 'walk', now(null, 1))).toBe('keyed');
    expect(rowShown('keys', keyGroupId('walk', 1), 'armL_elbow', now('walk', 1))).toBe('off');
    expect(rowShown('keys', keyGroupId('crouch_walk', 1), 'armL_elbow', now('crouchWalk', 0))).toBe('keyed');
    expect(rowShown('joint', 'joint.walk', 'kneeL_x', now('walk', 1))).toBe('both');
    expect(rowNote('body', 'walk', 'armSwingMul')).toBe(HAND_MADE_ONLY_NOTE);
    expect(rowNote('body', 'walk', 'kneeOutMul')).toBe('');
    expect(rowNote('body', 'ladder', 'leanAdd')).toBe('');
    expect(rowNote('joint', 'joint.walk', 'kneeL_x')).toBe('');
  });

  it('sums a part up in one line', () => {
    expect(reachSummary([])).toBe('');
    expect(reachSummary(['none', 'none'])).toBe('');
    expect(reachSummary(['both', 'both', 'none'])).toBe('This part changes: Both');
    expect(reachSummary(['keyed', 'keyed'])).toBe('This part changes: Hand-made only');
    expect(reachSummary(['mocap'])).toBe('This part changes: Motion capture only');
    expect(reachSummary(['both', 'both', 'both', 'keyed', 'keyed', 'keyed', 'keyed', 'both', 'both'])).toBe('This part changes: Mostly both; 4 sliders hand-made only');
    expect(reachSummary(['both', 'keyed', 'keyed'])).toBe('This part changes: Mostly hand-made only; 1 slider both');
  });

  it('warns on an edit that changes nothing on screen, naming where the working setting lives (A4, A8)', () => {
    const cap = now('walk', 1);
    // Keys legs on the captured walk: both of his fixes named
    const legs = editWarning('keys', keyGroupId('walk', 1), 'legL_ankleRoll', cap);
    expect(legs).toContain('motion capture is playing the walk');
    expect(legs).toContain('Keys change the hand-made walk only');
    expect(legs).toContain('Body > Joints, Left / Right ankle turn');
    expect(legs).toContain('Hands & feet, foot forward / out');
    expect(editWarning('keys', keyGroupId('walk', 1), 'legR_ankleYaw', cap)).toBe(legs);
    expect(editWarning('keys', keyGroupId('walk', 1), 'chest_pitch', cap)).toContain(WORKS_INSTEAD.trunk);
    expect(editWarning('keys', keyGroupId('walk', 1), 'armR_elbow', cap)).toContain(WORKS_INSTEAD.arms);
    expect(editWarning('keys', keyGroupId('walk', 1), 'handL_indexCurl', cap)).toContain(WORKS_INSTEAD.fingers);
    // Body arm swing on the capture: nothing works there, the switch does
    expect(editWarning('body', 'walk', 'armSwingMul', cap)).toContain('turn Motion capture off in More > Panel');
    // knee lift and foot track: the Joints leg rows do reach the capture
    expect(editWarning('body', 'walk', 'kneeLiftMul', cap)).toContain(WORKS_INSTEAD.legLift);
    expect(editWarning('body', 'walk', 'trackMul', cap)).not.toContain(WORKS_INSTEAD.none);
    expect(editWarning('weight', 'weight.walk', 'plantDrop', cap)).toContain('hand-made walk only');
    expect(editWarning('step', 'step.walk', 'lift', cap)).toContain('Motion capture places the steps now');
    expect(editWarning('hand', 'hand.rifle.walk', 'handLFwd', cap)).toContain('gun in hand');
    // another state's row
    expect(editWarning('body', 'jog', 'kneeOutMul', cap)).toBe('You are editing Jog; she is walking. Pick Jog in the Anim Studio to see it.');
    expect(editWarning('step', 'step.crouchWalk', 'lift', cap)).toBe('You are editing Crouch walk; she is walking. Pick Crouch walk in the Anim Studio to see it.');
    expect(editWarning('keys', keyGroupId('jog', 0), 'chest_pitch', cap)).toContain('You are editing Jog');
    // the edit shows: nothing
    expect(editWarning('joint', 'joint.walk', 'ankleL_y', cap)).toBe('');
    expect(editWarning('hand', 'hand.none.walk', 'footLFwd', cap)).toBe('');
    expect(editWarning('body', 'walk', 'kneeOutMul', cap)).toBe('');
    expect(editWarning('keys', keyGroupId('walk', 1), 'chest_pitch', now('walk', 0.5))).toBe('');
    expect(editWarning('keys', keyGroupId('walk', 1), 'chest_pitch', now('walk', 1, false))).toBe('');
    expect(editWarning('keys', keyGroupId('crouch_walk', 1), 'chest_pitch', now('crouchWalk', 0))).toBe('');
    expect(editWarning('step', 'step.crouchWalk', 'lift', now('sneak', 1))).toBe('');
    // no tag, no state, the guards, nothing known: nothing
    expect(editWarning('cam', 'cam.explore', 'camBoomAdd', cap)).toBe('');
    expect(editWarning('trav', 'trav.vault', 'bodyFwd', cap)).toBe('');
    expect(editWarning('guardJoint', 'guard.joint.walk', 'kneeL_x', cap)).toBe('');
    expect(editWarning('keys', keyGroupId('walk', 1), 'chest_pitch', now(null, 1))).toBe('');
  });


  it('latches the band with hysteresis: enter at 0.9 / 0.1, leave only past 0.88 / 0.12', () => {
    const run = (start: ReachBand, shares: readonly number[]): ReachBand[] => {
      let b = start;
      return shares.map((s) => (b = reachBand(b, s)));
    };
    // the capture edge: enter at 0.9, hold down to 0.88, leave under it; no flip while it hovers in 0.88..0.9
    expect(run('mid', [0.85, 0.89, 0.9, 0.89, 0.88, 0.895, 0.9, 0.879])).toEqual(['mid', 'mid', 'capture', 'capture', 'capture', 'capture', 'capture', 'mid']);
    expect(run('mid', [0.899, 0.881, 0.899, 0.885])).toEqual(['mid', 'mid', 'mid', 'mid']);
    // the hand-made edge: enter at 0.1, hold up to 0.12, leave over it; no flip while it hovers in 0.1..0.12
    expect(run('mid', [0.15, 0.11, 0.1, 0.11, 0.12, 0.105, 0.121])).toEqual(['mid', 'mid', 'handMade', 'handMade', 'handMade', 'handMade', 'mid']);
    expect(run('mid', [0.101, 0.119, 0.101])).toEqual(['mid', 'mid', 'mid']);
    // a jump across the mix goes straight to the other band
    expect(run('capture', [0.05])).toEqual(['handMade']);
    expect(run('handMade', [0.95])).toEqual(['capture']);
  });

  it('tags and warns by the latched band, never the raw share', () => {
    // the share dropped to 0.89 but the band holds at capture: still "Not playing now", still the capture warning
    const held = now('walk', 0.89, true, false, 'capture');
    expect(rowNow('keyed', 'walk', held)).toBe('off');
    expect(editWarning('body', 'walk', 'armSwingMul', held)).toContain('motion capture is playing the walk');
    // the share rose to 0.9 but the band is still the mix (not entered yet): as it is, no warning
    const mix = now('walk', 0.9, true, false, 'mid');
    expect(rowNow('keyed', 'walk', mix)).toBe('keyed');
    expect(editWarning('body', 'walk', 'armSwingMul', mix)).toBe('');
    // the hand-made edge the same way
    expect(rowNow('mocap', 'walk', now('walk', 0.11, true, false, 'handMade'))).toBe('off');
    expect(rowNow('mocap', 'walk', now('walk', 0.1, true, false, 'mid'))).toBe('mocap');
    // the switch off: hand-made whatever the band
    expect(rowNow('keyed', 'walk', now('walk', 1, false, false, 'capture'))).toBe('keyed');
  });

  it('names the field a key tool warns about: Wave its channel, the others the picked slider, none picked: nothing', () => {
    expect(keyToolField('wave', 'chest_pitch', '')).toBe('chest_pitch');
    expect(keyToolField('wave', 'chest_pitch', 'armL_elbow')).toBe('chest_pitch');
    expect(keyToolField('wave', 'all', '')).toBe('');
    expect(keyToolField('smooth', 'chest_pitch', 'armL_elbow')).toBe('armL_elbow');
    // no slider picked: the Wave channel (always a real field) is not used, so no trunk words
    expect(keyToolField('smooth', 'chest_pitch', '')).toBe('');
    expect(keyToolField('apply', 'pelvis_pitch', '')).toBe('');
  });

  it('warns that a row for her with no gun out shows nothing while a gun is drawn', () => {
    const drawn = now('walk', 1, true, true);
    const line = 'Not on screen: this row is for her with no gun out. Holster to see it.';
    // the holstered (weapon "none") rows of Hands & feet, Gun in hand and Joints
    expect(editWarning('hand', 'hand.none.walk', 'footLFwd', drawn)).toBe(line);
    expect(editWarning('weapon', 'weapon.none.walk', 'fingerCurl', drawn)).toBe(line);
    expect(editWarning('joint', 'joint.none.walk', 'ankleL_y', drawn)).toBe(line);
    // the same with the capture at any share: a gun drawn is what hides the row
    expect(editWarning('hand', 'hand.none.walk', 'footLFwd', now('walk', 0, true, true))).toBe(line);
    // holstered: unchanged (nothing to say for a row that shows)
    expect(editWarning('hand', 'hand.none.walk', 'footLFwd', now('walk', 1))).toBe('');
    // rows with a gun, rows with no weapon level and other states' rows are as before
    expect(editWarning('hand', 'hand.rifle.walk', 'handLFwd', drawn)).toBe(editWarning('hand', 'hand.rifle.walk', 'handLFwd', now('walk', 1)));
    expect(editWarning('joint', 'joint.walk', 'ankleL_y', drawn)).toBe('');
    expect(editWarning('body', 'walk', 'kneeOutMul', drawn)).toBe('');
    expect(editWarning('hand', 'hand.none.jog', 'footLFwd', drawn)).toBe(editWarning('hand', 'hand.none.jog', 'footLFwd', now('walk', 1)));
    expect(editWarning('guardJoint', 'guard.joint.walk', 'kneeL_x', drawn)).toBe('');
    expect(editWarning('hand', 'hand.none.walk', 'footLFwd', now(null, 1, true, true))).toBe('');
  });

  it('keeps every shown string in plain words (A1, A2, A12)', () => {
    expect(KEYS_MOCAP_NOTE).toBe('Keys change the hand-made moves only. Motion-capture moves are changed in Body > Joints, Hands & feet and Limb reach.');
    expect(MOCAP_BOX_LABEL).toBe('Motion capture for walk, jog, run, sneak and aimed strafe (off = hand-made)');
    expect(REACH_WORDS).toEqual({ mocap: 'Motion capture', keyed: 'Hand-made', both: 'Both', off: 'Not playing now', none: '' });
    const shown = [
      ...Object.values(REACH_WORDS),
      ...Object.values(REACH_TITLES),
      ...Object.values(WORKS_INSTEAD),
      ...Object.values(EFFECT_REASONS),
      KEYS_MOCAP_NOTE,
      MOCAP_BOX_LABEL,
      CLARITY_WARN_LABEL,
      KEYS_CAPTURED_NOTE,
      HAND_MADE_ONLY_NOTE,
      editWarning('keys', keyGroupId('walk', 1), 'legL_knee', now('walk', 1)),
      editWarning('body', 'walk', 'leanAdd', now('walk', 1)),
      editWarning('step', 'step.run', 'lift', now('run', 1)),
      editWarning('body', 'jog', 'kneeOutMul', now('sneak', 1)),
      editWarning('hand', 'hand.none.walk', 'footLFwd', now('walk', 1, true, true)),
    ];
    // "Keyed" may name the Anim Studio's box; no "keyed" / "procedural" / "mocap" jargon otherwise
    for (const s of shown) expect(s.replace(/\bKeyed in the Anim Studio\b/g, ''), s).not.toMatch(/procedural|keyed|mocap|\bIK\b|\bFK\b/i);
  });
});

describe('tuner clarity: the Keys legs and fingers have parts of their own (A9)', () => {
  const S2_TWISTS = ['legL_ankleYaw', 'legL_shinTwist', 'legR_ankleYaw', 'legR_shinTwist'];

  it('puts each leg field on its leg, the markers by field', () => {
    expect(tuneTarget('keys', 'legL_hipPitch')).toMatchObject({ kind: 'joint', a: 'hipL', b: 'kneeL', line: true, label: 'Left leg (key)' });
    expect(tuneTarget('keys', 'legR_knee')).toMatchObject({ a: 'kneeR', b: '', label: 'Right leg (key)' });
    expect(tuneTarget('keys', 'legL_anklePitch')).toMatchObject({ a: 'ankleL', label: 'Left leg (key)' });
    expect(tuneTarget('keys', 'legR_toe')).toMatchObject({ a: 'toeR', label: 'Right leg (key)' });
    expect(tuneTarget('keys', 'legL_w')).toMatchObject({ a: 'hipL', b: 'ankleL', line: false, label: 'Left leg (key)' });
    expect(tuneTarget('keys', 'legL_ankleYaw')).toMatchObject({ a: 'ankleL', label: 'Left leg (key)' });
    expect(tuneTarget('keys', 'legR_shinTwist')).toMatchObject({ a: 'kneeR', b: 'ankleR', line: true, label: 'Right leg (key)' });
    expect(tuneTarget('keys', 'handL_thumbCurl')).toMatchObject({ a: 'wristL', label: 'Left fingers (key)' });
    expect(tuneTarget('keys', 'handR_littleSpread')).toMatchObject({ a: 'wristR', label: 'Right fingers (key)' });
    // nothing keyed under "Whole body"
    for (const id of [...KEY_FIELDS.map((f) => f.id), ...S2_TWISTS]) {
      const t = tuneTarget('keys', id);
      expect(t.label, id).not.toMatch(/Whole body/);
      expect(t.kind, id).toBe('joint');
    }
  });

  it('names the leg rows in plain words', () => {
    const want: Record<string, string> = {
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
    for (const [f, w] of Object.entries(want)) {
      expect(plainLabel('keys', `legL_${f}`, ''), f).toBe(`Left ${w}`);
      expect(plainLabel('keys', `legR_${f}`, ''), f).toBe(`Right ${w}`);
    }
    expect(plainLabel('keys', 'handL_thumbCurl', 'L thumb curl (+ closed, 1 = fist)')).toBe('Left thumb curl');
    expect(plainLabel('keys', 'handR_indexSpread', '')).toBe('Right index spread');
    // every Keys field reads as words (no raw id, no "delta")
    for (const f of KEY_FIELDS) expect(plainLabel('keys', f.id, f.label), f.id).not.toMatch(/delta|_|\bFK\b/);
  });
});
