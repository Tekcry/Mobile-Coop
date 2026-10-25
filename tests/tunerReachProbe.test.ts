// (tuner-clarity S3) The motion-capture probe (`runMocapProbe`: the player's rig holstered at a walk, jog, run and the
// crouched sneak, the mocap switch on and off) against the tables the tuner shows: `NO_EFFECT[state].mocap` (the sliders
// that change the hand-made set but not the capture) and the reach tags (`rowReach`). A rig change that makes a slider
// reach the capture, or stop reaching it, fails here until the tables follow. Its own file: the probe takes a minute or
// two (600 s guard) and stays out of `tunerEffect.test.ts`'s budget.
import { describe, expect, it } from 'vitest';
import { captureSeen, MOCAP_PROBE_JOINTS, MOCAP_PROBE_STATES, runMocapProbe, SEEN } from './helpers/tuneEffectProbe';
import { ATTACH_PROBE_JOINTS, ATTACH_PROBE_LOOPS, ATTACH_PROBE_SETUPS, ATTACH_PROBE_STATES, attachProbeRows, runAttachProbe } from './helpers/attachProbe';
import { MOCAP_SOURCE_NAMES, mocapSource } from '../src/anim/mocapSources';
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

// (mixamo-retarget M5; Michael ~19:05: "make sure i can fine tune in anim dev just in case i have to") A traversal channel
// clip (the hand-made clips today, the Mixamo channel captures once I2 plays them: `ATTACH_PROBE_SETUPS`) has no mocap
// share: it is tuned by the attached rows (Body: body fwd / up, hand and foot reach and spacing on the attached groups;
// Joints, Hands & feet and Limb reach on those groups; the Speed section's climb rows; Climb and vault for the climb-up).
// The probe (`tests/helpers/attachProbe.ts`) moves each and proves it moves the pose, and that the tuner greys exactly the
// ones that move nothing.

/** Channel-capture loops no probe state covers yet: I2 adds a crawl state with the vent crawl capture. */
const ATTACH_NOT_PROBED: Readonly<Record<string, string>> = { 'trav:vent': 'the vent crawl (crawling_hands_and_knees, I2)' };
/** A lip climb-up: the feet hang free (a lip has no foot plants), so the Climb and vault foot rows move nothing there; the
 *  ladder's top-out (probed: `topOut`) plants the feet on the rungs and they move them. The rows stay live (one group). */
const LIP_CLIMB_FREE_FEET: readonly string[] = ['trav:footFwd', 'trav:footOut', 'trav:footUp'];

describe('(mixamo-retarget M5) the attached-state probe: the rows that tune a traversal clip move it', () => {
  it('every channel capture row plays in a probed state (or a named open one)', () => {
    for (const name of MOCAP_SOURCE_NAMES) {
      const st = mocapSource(name)!.studio;
      if (st.kind !== 'trav') continue;
      expect(ATTACH_PROBE_LOOPS[st.loop] ?? ATTACH_NOT_PROBED[st.loop], `${name}: its Studio loop ${st.loop} is probed`).toBeDefined();
    }
  });

  for (const setup of ATTACH_PROBE_SETUPS) {
    it(`${setup.name} clips: hang, shimmy, ladder, lip climb-up, ladder top-out`, async () => {
      const sizes = await runAttachProbe(setup);
      for (const st of ATTACH_PROBE_STATES) {
        const r = sizes[st.state]!;
        const rows = await attachProbeRows(st);
        expect(Object.keys(r).sort()).toEqual(rows.map((x) => x.key).sort());
        const dead = Object.keys(r)
          .filter((k) => !(r[k]! > SEEN.abs))
          .sort();
        const want = st.body ? (NO_EFFECT[st.body]?.procedural ?? []) : st.state === 'climbUp' ? LIP_CLIMB_FREE_FEET : [];
        expect(dead, `${setup.name} ${st.state}: the rows that move nothing`).toEqual([...want].sort());
        // the tuner greys exactly those (the sections it greys: Body, Joints, Limb reach)
        for (const row of rows) {
          const section = row.key.slice(0, row.key.indexOf(':'));
          if (section !== 'body' && section !== 'joint' && section !== 'ik') continue;
          expect(sliderEffect(section, row.group, row.id, 'procedural') !== '', `${setup.name} ${st.state} ${row.key} greyed`).toBe(dead.includes(row.key));
        }
        // the rows the brief names: the hand spacing and reach, the body offsets, the climb speed
        if (st.body) for (const k of ['body:handOutAdd', 'body:handUpAdd', 'body:handFwdAdd', 'body:bodyFwdAdd', 'body:bodyUpAdd']) expect(r[k]!, `${st.state} ${k}`).toBeGreaterThan(SEEN.abs);
        if (st.speed) expect(r[`speed:${st.speed}`]!, `${st.state} ${st.speed}`).toBeGreaterThan(SEEN.abs);
        for (const k of ATTACH_PROBE_JOINTS) expect(r[`joint:${k}`]!, `${st.state} joint ${k}`).toBeGreaterThan(SEEN.abs);
      }
    }, 600000);
  }
});
