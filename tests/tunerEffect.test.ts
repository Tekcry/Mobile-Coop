// (marlow-bays item 29, tuner v3) The Body tab sliders that change what is playing: the panel's table (`tunerEffect.ts`)
// is the effect probe's data (each slider moved under the keyed clip on the spot and the procedural state, holstered and
// with a rifle; the rig's joints compared). The probe also guards the keyed fix: her Joints and Limb reach rows, Foot
// width and Knee lift reach the keyed clip (they did nothing: on the spot her pose picked `idle`, and the treadmill
// ignored the two sliders).
import { describe, expect, it } from 'vitest';
import { runEffectProbe, PROBE_STATES, type ProbeLoop } from './helpers/tuneEffectProbe';
import { EFFECT_MODES, EFFECT_REASONS, NO_EFFECT, effectMode, effectState, sliderEffect } from '../src/ui/tunerEffect';
import { JOINT_KEYS } from '../src/anim/tuneV2Sections';

describe('tuner v3: the keyed-clip effect table', () => {
  it('matches the probe (every probed state and loop)', async () => {
    const got = await runEffectProbe();
    for (const st of PROBE_STATES) {
      const r = got[st.state]!;
      for (const mode of EFFECT_MODES) {
        const probed = st.speed > 0 || mode !== 'armed';
        const want = NO_EFFECT[st.state]?.[mode];
        if (!probed) {
          expect(want, `${st.state} ${mode} not probed`).toBeUndefined();
          continue;
        }
        const dead = Object.keys(r)
          .filter((k) => !r[k]!.includes(mode as ProbeLoop))
          .sort();
        expect(dead, `${st.state} ${mode}`).toEqual([...(want ?? [])].sort());
      }
    }
    // every Joints slider moves the keyed jog (the bug: none did)
    for (const k of JOINT_KEYS) expect(got.jog![`joint:${k}`], k).toEqual(['keyed', 'procedural', 'armed']);
    for (const k of ['ik:handL', 'ik:footR', 'body:trackMul', 'body:kneeLiftMul', 'body:trunkTwistMul']) expect(got.jog![k], k).toContain('keyed');
  }, 300000);

  it('names why a slider does nothing now, and the state of a group', () => {
    // (tuner-clarity S3) plain reasons (BRIEF A2; "Keyed" names the Anim Studio's box)
    expect(sliderEffect('body', 'jog', 'strideMul', 'keyed')).toBe('Only when she really moves: untick Keyed in the Anim Studio to see it');
    expect(sliderEffect('body', 'jog', 'strideMul', 'procedural')).toBe('');
    expect(sliderEffect('body', 'jog', 'armSwingMul', 'procedural')).toBe('Only on the clip on the spot: tick Keyed in the Anim Studio to see it');
    expect(sliderEffect('body', 'jog', 'armSwingMul', 'keyed')).toBe('');
    expect(sliderEffect('body', 'jog', 'armSwingGrow', 'keyed')).toBe('Does nothing on the clip on the spot');
    expect(sliderEffect('body', 'jog', 'armSwingGrow', 'armed')).toBe('Does nothing in this move');
    for (const r of Object.values(EFFECT_REASONS)) expect(r.replace(/\bKeyed in the Anim Studio\b/g, '')).not.toMatch(/procedural|keyed|mocap/i);
    expect(sliderEffect('joint', 'joint.jog', 'elbowR_x', 'keyed')).toBe('');
    // not probed: nothing is known, nothing greys
    expect(sliderEffect('body', 'ladder', 'kneeLiftMul', 'keyed')).toBe('');
    expect(sliderEffect('hand', 'hand.none.jog', 'x', 'keyed')).toBe('');
    expect(effectState('joint', 'joint.rifle.aim')).toBe('rifle.aim');
    expect(effectState('ik', 'ik.walk')).toBe('walk');
    expect(effectMode(true, true)).toBe('keyed');
    expect(effectMode(false, true)).toBe('armed');
    expect(effectMode(false, false)).toBe('procedural');
    // off the spot the keyed clip really moves: not probed, nothing greyed (arm swing with speed works there)
    expect(effectMode(true, false, false)).toBe('keyedMoving');
    expect(sliderEffect('body', 'jog', 'armSwingGrow', 'keyedMoving')).toBe('');
    expect(sliderEffect('body', 'jog', 'strideMul', 'keyedMoving')).toBe('');
    // (tuner-clarity S3) the motion capture playing: its own probe's list (tunerReachProbe.test.ts), more sections
    expect(effectMode(false, false, true, true)).toBe('mocap');
    expect(effectMode(false, true, true, true)).toBe('armed');
    expect(effectMode(true, false, true, true)).toBe('keyed');
    expect(sliderEffect('body', 'walk', 'armSwingMul', 'mocap')).toBe(EFFECT_REASONS.handMadeOnly);
    expect(sliderEffect('body', 'walk', 'kneeOutMul', 'mocap')).toBe('');
    expect(sliderEffect('step', 'step.walk', 'lift', 'mocap')).toBe(EFFECT_REASONS.handMadeOnly);
    expect(sliderEffect('weight', 'weight.jog', 'plantDrop', 'mocap')).toBe(EFFECT_REASONS.handMadeOnly);
    expect(sliderEffect('hand', 'hand.none.walk', 'footLFwd', 'mocap')).toBe('');
    expect(sliderEffect('step', 'step.walk', 'lift', 'procedural')).toBe('');
    expect(effectState('hand', 'hand.none.walk')).toBe('walk');
    expect(effectState('hand', 'hand.rifle.walk')).toBe('rifle.walk');
    expect(effectState('step', 'step.walk')).toBe('walk');
    // the mocap mode stays out of the keyed-clip probe's loop (its own file, its own time budget)
    expect(EFFECT_MODES).not.toContain('mocap');
  });
});
