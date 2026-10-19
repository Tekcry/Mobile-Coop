import { describe, expect, it } from 'vitest';
import { FALLBACK_S, MENU_IN_S, SKIP_GUARD_MS, TitleSequence } from '../src/ui/titleSequence';

// (menu-notes slice 4c, Michael's M3) the title press: black with no menu while the goggle strikes, then the menu fades
// in as the lights come up; a second press skips (A3); never stranded
const MAX = 4.8;
const DT = 1 / 60;

describe('title press sequence', () => {
  it('the first press starts it; the menu is revealed only in the last MENU_IN_S of the rise, then it finishes', () => {
    const s = new TitleSequence(MAX);
    expect(s.update(DT, MAX, false)).toBeNull();
    expect(s.press(1000)).toBe('start');
    expect(s.state).toBe('seq');
    let left = MAX;
    let reveal = -1;
    let finish = -1;
    for (let i = 0; i < 1000 && finish < 0; i++) {
      left -= DT;
      const r = s.update(DT, left, false);
      if (r === 'reveal') reveal = left;
      if (r === 'finish') finish = left;
    }
    expect(reveal).toBeGreaterThan(0);
    expect(reveal).toBeLessThanOrEqual(MENU_IN_S);
    expect(finish).toBeLessThanOrEqual(0);
    expect(s.state).toBe('done');
    expect(s.update(DT, 0, false)).toBeNull();
  });

  it('the dismissing press (keydown, action edge, click) does not count as the skip; a later press skips', () => {
    const s = new TitleSequence(MAX);
    expect(s.press(1000)).toBe('start');
    expect(s.press(1000)).toBe('ignored');
    expect(s.press(1000 + SKIP_GUARD_MS - 1)).toBe('ignored');
    expect(s.state).toBe('seq');
    expect(s.press(1000 + SKIP_GUARD_MS + 10)).toBe('skip');
    expect(s.state).toBe('done');
    expect(s.press(5000)).toBe('ignored');
  });

  it('never stranded: finishes after the length plus the fallback even if the stage never reports done', () => {
    const s = new TitleSequence(MAX);
    s.press(0);
    let n = 0;
    while (s.state === 'seq' && n < 10000) {
      s.update(DT, MAX, false);
      n++;
    }
    expect(s.state).toBe('done');
    expect(n * DT).toBeGreaterThanOrEqual(MAX + FALLBACK_S - DT);
    expect(n * DT).toBeLessThan(MAX + FALLBACK_S + 0.1);
  });

  it('a paused stage (debug stills) holds the fallback clock', () => {
    const s = new TitleSequence(MAX);
    s.press(0);
    for (let i = 0; i < 2000; i++) expect(s.update(DT, 2, true)).toBeNull();
    expect(s.state).toBe('seq');
  });

  it('a stage that is already lit (reduced motion, no title phase) finishes at once', () => {
    const s = new TitleSequence(MAX);
    s.press(0);
    expect(s.update(DT, 0, false)).toBe('finish');
  });
});
