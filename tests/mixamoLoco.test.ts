/**
 * (mixamo-retarget I6) The Mixamo locomotion set (`src/anim/mocap.ts` `setMocapMixamo`, `src/anim/mixamo.ts`
 * `MIXAMO_LOCO`): Mixamo captures take the mocap set's walk / jog / run / sprint / start / stop slots when the flag is on
 * and their `MIXAMO_ON` row is true, else the CMU clips play.
 * - off identity: with the flag off (or no capture handed over) the switch's ON set is `MOCAP_SET` itself;
 * - a handed-over slot replaces only that slot; the seconds and layers stay CMU's (the game's timing holds); null puts
 *   the CMU clip back and the set back to `MOCAP_SET`;
 * - rows: every capture in `MIXAMO_LOCO` has a `MIXAMO_ON` row and a known slot;
 * - guards: the hand-keyed set (guards, the switch's OFF side) is never touched.
 * Pending the M1 dump (STATE.md "## I6"): the emitted clips' headless readings and the per-frame allocation run against
 * the CMU path (as tests/mixamoSwitch.test.ts (d) / (e)).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MIXAMO_LOCO, MIXAMO_ON, setMixamo } from '../src/anim/mixamo';
import { HAND_KEYED_SET, LOCO, MOCAP_SET, MX_SLOTS, setMocapLocomotion, setMocapMixamo } from '../src/anim/mocap';
import { MOCAP_CARRY_BODY_WALKING } from '../src/anim/clips/mixamo/carry_body_walking';
import { MOCAP_CROSS_PUNCH as PUNCH } from '../src/anim/clips/mixamo/cross_punch';

const ON0 = { ...MIXAMO_ON };
const HAND0 = { ...HAND_KEYED_SET };
afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMocapMixamo({ walk: null, jog: null, run: null, sprint: null, start: null, stop: null });
  setMixamo(false);
  setMocapLocomotion(false);
});

describe('mixamoLoco: the Mixamo locomotion set', () => {
  it('off identity: no capture handed over keeps MOCAP_SET itself', () => {
    setMixamo(false);
    setMocapLocomotion(true);
    expect(LOCO.set).toBe(MOCAP_SET);
    setMixamo(true); // the shipped rows: crouched_walking off, MIXAMO_LOCO not emitted yet
    if (Object.keys(MIXAMO_LOCO).length === 0) expect(LOCO.set).toBe(MOCAP_SET);
    setMixamo(false);
    expect(LOCO.set).toBe(MOCAP_SET);
  });

  it('a slot takes the capture; the seconds and layers stay CMU; null puts the CMU clip back', () => {
    setMocapLocomotion(true);
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING, start: PUNCH! });
    const S = LOCO.set;
    expect(S).not.toBe(MOCAP_SET);
    expect(S.walk).toBe(MOCAP_CARRY_BODY_WALKING);
    expect(S.start).toBe(PUNCH!);
    for (const k of ['jog', 'run', 'sprint', 'stop', 'crouchWalk', 'turnInPlace', 'strafeL', 'strafeR'] as const) expect(S[k]).toBe(MOCAP_SET[k]);
    expect(S.startSeconds).toBe(MOCAP_SET.startSeconds);
    expect(S.stopSeconds).toBe(MOCAP_SET.stopSeconds);
    expect(S.layers).toBe(MOCAP_SET.layers);
    expect(S.id).toBe('mocap');
    expect(LOCO.slots).toBe(true);
    setMocapMixamo({ walk: null });
    expect(LOCO.set.walk).toBe(MOCAP_SET.walk);
    expect(LOCO.set.start).toBe(PUNCH!); // a slot left out keeps what it had
    setMocapMixamo({ start: null });
    expect(LOCO.set).toBe(MOCAP_SET);
  });

  it('the switch off is the hand-keyed set whatever is handed over', () => {
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING });
    setMocapLocomotion(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
  });

  it('rows: each capture has a MIXAMO_ON row and a known slot; the locomotion rows ship on', () => {
    for (const [slug, r] of Object.entries(MIXAMO_LOCO)) {
      expect(MIXAMO_ON[slug], slug).toBeTypeOf('boolean');
      expect(MX_SLOTS).toContain(r.slot);
    }
    for (const slug of ['walking', 'jogging', 'running', 'fast_run', 'start_walking', 'stop_walking']) expect(MIXAMO_ON[slug], slug).toBe(true);
  });

  it('guards: the hand-keyed set is unchanged by any hand-over', () => {
    setMixamo(true);
    setMocapMixamo({ walk: MOCAP_CARRY_BODY_WALKING, stop: PUNCH! });
    expect({ ...HAND_KEYED_SET }).toEqual(HAND0);
    for (const k of Object.keys(HAND0) as (keyof typeof HAND0)[]) expect(HAND_KEYED_SET[k]).toBe(HAND0[k]);
  });
});
