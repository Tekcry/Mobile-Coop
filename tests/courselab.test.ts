import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { courselab } from '../src/world/maps/courselab';
import { layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { getMap } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';

describe('courselab (T1b)', () => {
  const lay = courselab.build(new LevelBuilder(), 0);
  it('is registered, course only, not listed', () => {
    expect(getMap('courselab').id).toBe('courselab');
    expect(courselab.modes).toEqual(['course']);
    expect(isListedMap('courselab')).toBe(false);
  });
  it('its course validates against the built ids, with one gate of each kind', () => {
    const c = lay.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    const kinds = new Set(c.def.bays.flatMap((b) => b.gates.map((g) => g.kind)));
    for (const k of ['lever', 'bolt', 'hold', 'timedHold', 'pair', 'egress', 'mains', 'flag', 'anchorLock', 'pickup']) expect(kinds.has(k as never)).toBe(true);
  });
  it('the airlock refuses one player and cycles with two', () => {
    const s = new CourseState(lay.course!.def);
    s.setPlayer(0, 11, 0, 4, false);
    s.setPlayer(1, 2, 0, 4, false);
    s.update(1 / 60);
    expect(s.press('A1', 0)).toBe('Wait for your partner');
    s.setPlayer(1, 12, 0, 5, false);
    s.update(1 / 60);
    expect(s.press('A1', 0)).toBeNull();
    for (let i = 0; i < 300; i++) s.update(1 / 60);
    expect(s.airlockPhase('A1')).toBe('sealed');
    expect(s.locked('A1-near')).toBe(true);
    expect(s.locked('A1-far')).toBe(false);
  });
});
