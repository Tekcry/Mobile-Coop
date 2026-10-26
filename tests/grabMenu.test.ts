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
    // information is a guard's `info` (PR 3: the Marlow Yard training guard has some; tests/guardInfo.test.ts)
    expect(hasInfo({})).toBe(false);
    expect(hasInfo({ info: { lines: ['Easy.'] } })).toBe(true);
    expect(grabOptReady('device')).toBe(false);
  });

  // (anim-rework S1, M3 "RT tap / hold") RT tap knocks out (the choke), RT hold kills; KBM Z knocks out; aimed (LT, the
  // pistol shield) RT fires instead
  it('RT tap knocks out, RT hold kills, Z knocks out, none while aiming (aimed RT is the pistol)', () => {
    expect(grabTriggerPick('hold', false, false)).toBe('kill');
    expect(grabTriggerPick('tap', false, false)).toBe('knockout');
    expect(grabTriggerPick(null, true, false)).toBe('knockout');
    expect(grabTriggerPick('hold', true, true)).toBeNull();
    expect(grabTriggerPick('tap', false, true)).toBeNull();
    expect(grabTriggerPick(null, false, false)).toBeNull();
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

// (piano-knife S1, BRIEF A2) with the piano scene's knife switch on there is no grab row: the takedown row (`'ko'`,
// TD_LABEL) is the one-press knife kill (`TakedownController.start` forces it); off, today's grab from behind
describe('takedown row with the knife switch (piano-knife S1)', () => {
  it('switch on: no grab row for any kind; off: the grab from behind on a guard on two legs', async () => {
    const { takedownRow } = await import('../src/game/knifeKill');
    expect(takedownRow('behind', false, false)).toBe('grab');
    expect(takedownRow('hangDown', false, false)).toBe('grab');
    expect(takedownRow('front', false, false)).toBe('ko');
    for (const k of ['behind', 'hangDown', 'front', 'corner', 'side', 'overCover'] as const) expect(takedownRow(k, false, true), k).toBe('ko');
  });
});
