// (tuner-clarity S3) The motion-capture probe (`runMocapProbe`: the player's rig holstered at a walk, jog, run and the
// crouched sneak, the mocap switch on and off) against the tables the tuner shows: `NO_EFFECT[state].mocap` (the sliders
// that change the hand-made set but not the capture) and the reach tags (`rowReach`). A rig change that makes a slider
// reach the capture, or stop reaching it, fails here until the tables follow. Its own file: the probe takes a minute or
// two (600 s guard) and stays out of `tunerEffect.test.ts`'s budget.
import { describe, expect, it } from 'vitest';
import { captureSeen, MOCAP_PROBE_JOINTS, MOCAP_PROBE_STATES, runMocapProbe } from './helpers/tuneEffectProbe';
import { NO_EFFECT, sliderEffect, EFFECT_REASONS } from '../src/ui/tunerEffect';
import { BODY_LAYER, rowReach } from '../src/ui/tunerReach';
import { BODY_STEP, BODY_WEIGHT } from '../src/ui/tunerLayout';
import { MOCAP_LAYERS } from '../src/anim/mocap';

/** The group a probed slider key (`section:id`) of `state` was moved in (the probe's own). */
function groupOf(section: string, state: string): string {
  if (section === 'body') return state;
  if (section === 'step') return `step.${BODY_STEP[state]}`;
  if (section === 'weight') return `weight.${BODY_WEIGHT[state]}`;
  if (section === 'hand') return `hand.none.${state}`;
  return `${section}.${state}`;
}

describe('tuner clarity: the motion-capture probe', () => {
  it('matches the tables (NO_EFFECT mocap lists, the reach tags, the layer table)', async () => {
    const sizes = await runMocapProbe();
    for (const st of MOCAP_PROBE_STATES) {
      const r = sizes[st.state]!;
      const dead = Object.keys(r)
        .filter((k) => captureSeen(r[k]!) === 'dead')
        .sort();
      expect(dead, `${st.state}: the sliders that change the hand-made set but not the capture`).toEqual([...(NO_EFFECT[st.state]?.mocap ?? [])].sort());
      for (const key of Object.keys(r)) {
        const seen = captureSeen(r[key]!);
        const i = key.indexOf(':');
        const section = key.slice(0, i);
        const id = key.slice(i + 1);
        const group = groupOf(section, st.state);
        // the tag the tuner shows: hand-made where the probe sees the capture ignore it (truth wins), else both
        expect(rowReach(section, group, id), `${st.state} ${key} (${seen})`).toBe(seen === 'dead' ? 'keyed' : 'both');
        // the greying and its plain reason follow the same list
        expect(sliderEffect(section, group, id, 'mocap'), `${st.state} ${key}`).toBe(seen === 'dead' ? EFFECT_REASONS.handMadeOnly : '');
        // a Body slider the layer table takes off the capture: the probe never sees it on the capture
        if (section === 'body') {
          const layer = BODY_LAYER[id as keyof typeof BODY_LAYER];
          if (layer !== null && MOCAP_LAYERS[layer] === 0) expect(seen, `${st.state} ${key}: the layer is off`).not.toBe('both');
        }
      }
      // Michael's fixes reach the capture (BRIEF A8): Joints ankle turn and Hands & feet foot forward / out, and the
      // other after-blend rows the probe moves
      for (const k of MOCAP_PROBE_JOINTS) expect(captureSeen(r[`joint:${k}`]!), `${st.state} joint ${k}`).toBe('both');
      for (const k of ['footLFwd', 'footLOut', 'footRFwd', 'footROut', 'handLFwd', 'handRUp']) expect(captureSeen(r[`hand:${k}`]!), `${st.state} hand ${k}`).toBe('both');
    }
  }, 600000);
});
