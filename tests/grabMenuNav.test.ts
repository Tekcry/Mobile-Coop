import { describe, expect, it } from 'vitest';
import { CtxNav } from '../src/game/contextMenu';

// (F1b; G5) the context menu's highlight step: the D-pad / wheel always, the stick / W S once it was back at the centre
describe('context menu navigation (G5)', () => {
  it('D-pad up / down (the gear actions) always move the highlight while the list is held', () => {
    const n = new CtxNav();
    expect(n.dir(true, false, true, false, false, 1)).toBe(1);
    expect(n.dir(true, true, false, false, false, 1)).toBe(-1);
  });
  it('the stick / arrow taps count only once the stick has been near the centre since A went down', () => {
    const n = new CtxNav();
    // walking when A went down: the stick's taps are ignored
    expect(n.dir(true, false, false, false, true, 1)).toBe(0);
    // back at the centre: armed
    expect(n.dir(true, false, false, false, false, 0)).toBe(0);
    expect(n.dir(true, false, false, false, true, 0.9)).toBe(1);
    expect(n.dir(true, false, false, true, false, 0.9)).toBe(-1);
    // the list closed: disarmed again
    expect(n.dir(false, false, false, false, true, 0)).toBe(0);
    expect(n.dir(true, false, false, false, true, 0.9)).toBe(0);
  });
});
