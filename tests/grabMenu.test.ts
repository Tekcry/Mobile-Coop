import { describe, expect, it } from 'vitest';
import { addGrabRows, GRAB_KIND, GRAB_OPTS, GrabMenuView, grabOptReady, grabTriggerPick, hasInfo } from '../src/game/grabMenu';
import { ContextMenu } from '../src/game/contextMenu';

// (A4, G23; G5; Michael 2026-10-20 08:10: "once they are grabbed it can show interrogate (if they have information), and
// rt or Lt to either knock out or kill ... It shouldn't have kill/knock out/carry in the list"; 08:20: "The guard cannot
// be let go either"; 08:25: "There is no back to game option once the grab is initiated.")
describe('held guard (G5, Michael 08:10 / 08:20 / 08:25)', () => {
  it('the list holds only Interrogate, and only for a guard with information', () => {
    expect(GRAB_OPTS).toEqual(['knockout', 'kill', 'carry', 'device', 'interrogate']);
    const m = new ContextMenu();
    m.begin();
    addGrabRows(m, false);
    m.end();
    expect(m.count).toBe(0);
    m.begin();
    addGrabRows(m, true);
    m.end();
    expect(m.count).toBe(1);
    expect(m.opts[0]!.kind).toBe(GRAB_KIND);
    expect(m.opts[0]!.opt).toBe('interrogate');
    expect(m.opts[0]!.label).toBe('Interrogate');
    // no guard data carries information yet
    expect(hasInfo({})).toBe(false);
    expect(hasInfo({ info: true })).toBe(true);
    expect(grabOptReady('device')).toBe(false);
  });

  it('RT kills, LT knocks out, both only while not aiming (aimed they are the pistol)', () => {
    expect(grabTriggerPick(true, false, false)).toBe('kill');
    expect(grabTriggerPick(false, true, false)).toBe('knockout');
    expect(grabTriggerPick(true, true, true)).toBeNull();
    expect(grabTriggerPick(false, false, false)).toBeNull();
  });

  it('the view: open while holding; an armed sel runs on the next A press (scripts), disarmed when not holding', () => {
    const v = new GrabMenuView(new ContextMenu());
    expect(v.open).toBe(false);
    v.holding = true;
    expect(v.open).toBe(true);
    v.sel = 2;
    expect(v.takePick(false)).toBeNull();
    expect(v.takePick(true)).toBe('carry');
    expect(v.takePick(true)).toBeNull();
    v.sel = 0;
    v.holding = false;
    expect(v.takePick(true)).toBeNull();
    expect(v.labels()[4]).toBe('Interrogate');
  });
});
