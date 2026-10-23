import { describe, expect, it } from 'vitest';
import { CourseState } from '../src/game/course/courseState';
import { CourseMode } from '../src/game/modes/courseMode';
import type { CourseDef } from '../src/game/course/courseDef';

// (stealth-pays S1, spare 9 part B) an interrogation's code flag sets a course flag.
const bay = { id: 'B1', entry: 'start', exit: 'end', squad: [], gates: [], radio: [], drills: [], elements: [] };
const def = { id: 'test', airlocks: [], bays: [bay], externalFlags: ['x'] } as unknown as CourseDef;

describe('CourseMode.onIntelCode', () => {
  it('sets the flag, a repeat is a no-op', () => {
    const state = new CourseState(def);
    const mode = { state } as unknown as CourseMode;
    CourseMode.prototype.onIntelCode.call(mode, 'x');
    expect(state.hasFlag('x')).toBe(true);
    CourseMode.prototype.onIntelCode.call(mode, 'x');
    expect(state.events.filter((e) => e.t === 'flagSet' && e.flag === 'x')).toHaveLength(1);
  });
  it('no state: nothing happens', () => {
    expect(() => CourseMode.prototype.onIntelCode.call({ state: null } as unknown as CourseMode, 'x')).not.toThrow();
  });
});
