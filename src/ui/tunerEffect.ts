/**
 * (marlow-bays item 29, tuner v3; Michael: "If I use keyed tick box, changes in the body section don't seem to affect
 * the animation. Is this normal?") Which Body tab sliders (Body, Joints, Limb reach) change what is playing now, the pure
 * part (no DOM, no Babylon; unit-tested in `tests/tunerEffect.test.ts`). The table is DATA from the effect probe
 * (`tests/helpers/tuneEffectProbe.ts`: each slider moved under the keyed clip on the spot, the procedural state
 * holstered and with a rifle, the rig's joints compared): the test fails when the probe and this table disagree, so a
 * rig change that makes a slider work (or stop working) updates it. Only the probed states are listed; every other
 * state shows every slider as it is.
 *
 * The panel greys a row that does nothing in the loop playing now and says why in one line (it stays editable: the value
 * still applies to the other way of playing the state).
 *
 * (tuner-clarity S3; Michael: "I can't tell if my changes are working between motion capture or keyed. Must be clear")
 * The `mocap` mode: the motion capture playing the holstered walk / jog / run or the crouched sneak (the game's default,
 * `LOCO.mocap`). Its lists are the motion-capture probe's (`runMocapProbe`, `tests/tunerReachProbe.test.ts`): Body,
 * Stepping, Weight, Hands & feet place rows and six Joints rows, each listed when it changes the hand-made set but not the
 * capture. The reasons are plain words (BRIEF A2: "motion capture", "hand-made"); the mode ids stay (the e2e hook
 * `__animTune.effect()` reports them).
 */

/** How the state plays now: its keyed clip (the studio's Keyed box), procedural holstered, procedural with a gun.
 *  `keyedMoving`: the keyed clip off the spot (she really moves, so speed-driven sliders work); not probed, so nothing
 *  is greyed in it. (S3) `mocap`: the motion capture plays it (the switch on, holstered walk / jog / run / sneak). */
export type EffectMode = 'keyed' | 'keyedMoving' | 'procedural' | 'armed' | 'mocap';
/** The modes the keyed-clip probe covers (`tests/tunerEffect.test.ts`; `mocap` has its own probe and test file). */
export const EFFECT_MODES: readonly EffectMode[] = ['keyed', 'procedural', 'armed'];

/** Per probed state, per mode: the sliders (`<section>:<id>`) that change nothing. A mode not listed: not probed.
 *  (S3) `mocap`: the sliders that change the hand-made set but not the capture (`tests/tunerReachProbe.test.ts`). */
export const NO_EFFECT: Readonly<Record<string, Partial<Record<EffectMode, readonly string[]>>>> = {
  idle: {
    keyed: ['body:elbowPoleMul', 'body:kneeOutMul'],
    procedural: ['body:elbowOutAdd'],
  },
  walk: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    mocap: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd', 'body:kneeLiftMul', 'body:leanAdd', 'body:trunkTwistMul', 'step:dur', 'step:heel', 'step:lift', 'step:stride2', 'step:toeOff', 'weight:plantDrop'],
  },
  jog: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    mocap: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd', 'body:kneeLiftMul', 'body:leanAdd', 'body:trunkTwistMul', 'step:dur', 'step:heel', 'step:lift', 'step:replant', 'step:stride0', 'step:stride1', 'step:toeOff', 'weight:plantDrop'],
  },
  run: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    mocap: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd', 'body:kneeLiftMul', 'body:leanAdd', 'body:trackMul', 'body:trunkTwistMul', 'step:dur', 'step:heel', 'step:lift', 'step:replant', 'step:stride2', 'step:toeOff', 'weight:plantDrop'],
  },
  sneak: {
    mocap: ['body:armSwingGrow', 'body:armSwingMul', 'body:leanAdd'],
  },
};

/** The sections the table covers (the Body tab's parts the probe moves). */
const PROBED_SECTIONS: readonly string[] = ['body', 'joint', 'ik'];
/** (S3) The sections the motion-capture probe moves. */
const MOCAP_SECTIONS: readonly string[] = ['body', 'joint', 'ik', 'step', 'weight', 'hand'];

/** The body state of a section's group (`jog`, `joint.jog`, `ik.jog`; a gun's Joints row `joint.rifle.aim`: not probed).
 *  (S3) A holstered Hands & feet row `hand.none.jog`: `jog`; the Stepping and Weight gaits by their name (`step.walk`). */
export function effectState(section: string, group: string): string {
  if (section === 'body') return group;
  const pre = `${section}.`;
  if (!group.startsWith(pre)) return '';
  const rest = group.slice(pre.length);
  return section === 'hand' && rest.startsWith('none.') ? rest.slice(5) : rest;
}

function dead(state: string, mode: EffectMode, key: string): boolean | null {
  const row = NO_EFFECT[state]?.[mode];
  return row ? row.includes(key) : null;
}

/** (S3) The one-line reasons in plain words (BRIEF A2: no "procedural" / "keyed"; "Keyed" is the Anim Studio box's name). */
export const EFFECT_REASONS = {
  /** Motion capture plays and this slider changes the hand-made moves only. */
  handMadeOnly: 'Hand-made only: motion capture is playing (turn it off in More > Panel to see it)',
  /** The studio's clip plays on the spot and this slider needs her really moving. */
  movingOnly: 'Only when she really moves: untick Keyed in the Anim Studio to see it',
  /** She really moves and this slider changes only the clip played on the spot. */
  clipOnly: 'Only on the clip on the spot: tick Keyed in the Anim Studio to see it',
  /** A gun is in hand and this slider works with no gun. */
  noGunOnly: 'Only with no gun in hand',
  /** Nothing in the clip on the spot. */
  nothingClip: 'Does nothing on the clip on the spot',
  /** Nothing in this move. */
  nothing: 'Does nothing in this move',
} as const;

/**
 * Why a slider changes nothing in the loop playing now ('' : it works, or nothing is known). `mode` how the state plays.
 * The reason names the way it does work ("Only on the clip on the spot: tick Keyed in the Anim Studio to see it").
 */
export function sliderEffect(section: string, group: string, id: string, mode: EffectMode): string {
  if (!(mode === 'mocap' ? MOCAP_SECTIONS : PROBED_SECTIONS).includes(section)) return '';
  const state = effectState(section, group);
  const key = `${section}:${id}`;
  if (dead(state, mode, key) !== true) return '';
  // (S3) a mocap list holds only the sliders that change the hand-made set (the probe's rule)
  if (mode === 'mocap') return EFFECT_REASONS.handMadeOnly;
  const keyed = dead(state, 'keyed', key) === false;
  const proc = dead(state, 'procedural', key) === false;
  if (mode === 'keyed' && proc) return EFFECT_REASONS.movingOnly;
  if (mode !== 'keyed' && keyed) return EFFECT_REASONS.clipOnly;
  if (mode === 'armed' && proc) return EFFECT_REASONS.noGunOnly;
  return mode === 'keyed' ? EFFECT_REASONS.nothingClip : EFFECT_REASONS.nothing;
}

/** The loop's mode: the studio playing one of her keyed clips (on the spot: the probed case; off it: not probed), else
 *  a gun in hand or not. (S3) `mocap`: the motion capture plays the body now (S4 passes the live share, `ReachNow`). */
export function effectMode(keyedClip: boolean, armed: boolean, onSpot = true, mocap = false): EffectMode {
  if (keyedClip) return onSpot ? 'keyed' : 'keyedMoving';
  if (armed) return 'armed';
  return mocap ? 'mocap' : 'procedural';
}
