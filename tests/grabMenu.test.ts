import { describe, expect, it } from 'vitest';
import { GRAB_OPTS, GrabMenu } from '../src/game/grabMenu';

describe('grab menu (A4, G23)', () => {
  it('lists knock out, kill, carry, then the stubs', () => {
    expect(GRAB_OPTS).toEqual(['knockout', 'kill', 'carry', 'device', 'interrogate']);
    const m = new GrabMenu();
    m.show();
    expect(m.labels()[3]).toContain('not yet');
    // (G7) Interrogate works now (CT offers it as soon as the guard is held, 052607 @ 4-8)
    expect(m.labels()[4]).toBe('Interrogate');
  });
  it('moves with wrap and picks; a working pick closes, a stub stays open', () => {
    const m = new GrabMenu();
    expect(m.pick()).toBeNull();
    m.show();
    m.move(-1);
    m.move(-1);
    expect(m.opts[m.sel]).toBe('device');
    expect(m.pick()).toBe('device');
    expect(m.open).toBe(true);
    m.move(1);
    expect(m.pick()).toBe('interrogate');
    expect(m.open).toBe(false);
    m.show();
    expect(m.pick()).toBe('knockout');
    expect(m.open).toBe(false);
  });
});
