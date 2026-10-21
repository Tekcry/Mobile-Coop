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
 */

/** How the state plays now: its keyed clip (the studio's Keyed box), procedural holstered, procedural with a gun.
 *  `keyedMoving`: the keyed clip off the spot (she really moves, so speed-driven sliders work); not probed, so nothing
 *  is greyed in it. */
export type EffectMode = 'keyed' | 'keyedMoving' | 'procedural' | 'armed';
export const EFFECT_MODES: readonly EffectMode[] = ['keyed', 'procedural', 'armed'];

/** Per probed state, per mode: the sliders (`<section>:<id>`) that change nothing. A mode not listed: not probed. */
export const NO_EFFECT: Readonly<Record<string, Partial<Record<EffectMode, readonly string[]>>>> = {
  idle: {
    keyed: ['body:elbowPoleMul', 'body:kneeOutMul'],
    procedural: ['body:elbowOutAdd'],
  },
  walk: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
  },
  jog: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
  },
  run: {
    keyed: ['body:armSwingGrow', 'body:elbowPoleMul', 'body:strideMul'],
    procedural: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
    armed: ['body:armSwingGrow', 'body:armSwingMul', 'body:elbowOutAdd'],
  },
};

/** The sections the table covers (the Body tab's parts the probe moves). */
const PROBED_SECTIONS: readonly string[] = ['body', 'joint', 'ik'];

/** The body state of a section's group (`jog`, `joint.jog`, `ik.jog`; a gun's Joints row `joint.rifle.aim`: not probed). */
export function effectState(section: string, group: string): string {
  if (section === 'body') return group;
  const pre = `${section}.`;
  return group.startsWith(pre) ? group.slice(pre.length) : '';
}

function dead(state: string, mode: EffectMode, key: string): boolean | null {
  const row = NO_EFFECT[state]?.[mode];
  return row ? row.includes(key) : null;
}

/**
 * Why a slider changes nothing in the loop playing now ('' : it works, or nothing is known). `mode` how the state plays.
 * The reason names the way it does work: "procedural only: the keyed clip is playing".
 */
export function sliderEffect(section: string, group: string, id: string, mode: EffectMode): string {
  if (!PROBED_SECTIONS.includes(section)) return '';
  const state = effectState(section, group);
  const key = `${section}:${id}`;
  if (dead(state, mode, key) !== true) return '';
  const keyed = dead(state, 'keyed', key) === false;
  const proc = dead(state, 'procedural', key) === false;
  if (mode === 'keyed' && proc) return 'procedural only: the keyed clip is playing';
  if (mode !== 'keyed' && keyed) return 'keyed clip only: tick Keyed to see it';
  if (mode === 'armed' && proc) return 'holstered only: a gun is in hand';
  return mode === 'keyed' ? 'no effect on the keyed clip on the spot' : 'no effect in this state';
}

/** The loop's mode: the studio playing one of her keyed clips (on the spot: the probed case; off it: not probed), else
 *  a gun in hand or not. */
export function effectMode(keyedClip: boolean, armed: boolean, onSpot = true): EffectMode {
  if (keyedClip) return onSpot ? 'keyed' : 'keyedMoving';
  return armed ? 'armed' : 'procedural';
}
