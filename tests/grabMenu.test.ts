import { describe, expect, it } from 'vitest';
import { addGrabRows, GRAB_KIND, GRAB_OPTS, GrabMenuView, grabOptReady } from '../src/game/grabMenu';
import { ContextMenu, emptyCtxInput } from '../src/game/contextMenu';

const fill = (m: ContextMenu): void => {
  m.begin();
  addGrabRows(m);
  m.end();
};

describe('grab options (A4, G23; G5 rows of the context menu)', () => {
  it('lists knock out, kill, carry, then the stub and interrogate', () => {
    expect(GRAB_OPTS).toEqual(['knockout', 'kill', 'carry', 'device', 'interrogate']);
    const m = new ContextMenu();
    const v = new GrabMenuView(m);
    expect(v.labels()[3]).toContain('not yet');
    // (G7) Interrogate works now (CT offers it as soon as the guard is held, 052607 @ 4-8)
    expect(v.labels()[4]).toBe('Interrogate');
    expect(grabOptReady('device')).toBe(false);
    expect(grabOptReady('interrogate')).toBe(true);
    fill(m);
    expect(m.count).toBe(5);
    expect(m.opts.slice(0, 5).every((o, i) => o.kind === GRAB_KIND && o.ref === i && !o.latch)).toBe(true);
  });

  it('the view is open while the rows are listed; writing sel opens the list latched on that row', () => {
    const m = new ContextMenu();
    const v = new GrabMenuView(m);
    expect(v.open).toBe(false);
    fill(m);
    const i = emptyCtxInput();
    m.step(i, 1 / 60);
    expect(v.open).toBe(true);
    expect(m.state).toBe('passive');
    v.sel = 2;
    expect(m.state).toBe('active');
    expect(v.sel).toBe(2);
    // a scripted tap (the e2e / tools path) runs it
    fill(m);
    i.pressed = true;
    expect(m.opts[m.step(i, 1 / 60)]!.opt).toBe('carry');
    // a held tap after `sel` = the real pad press: the release runs it
    fill(m);
    v.sel = 0;
    fill(m);
    i.down = true;
    expect(m.step(i, 1 / 60)).toBe(-1);
    fill(m);
    i.pressed = false;
    i.down = false;
    i.released = true;
    expect(m.opts[m.step(i, 1 / 60)]!.opt).toBe('knockout');
  });
});
