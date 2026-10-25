import { afterEach, describe, expect, it, vi } from 'vitest';

// `coopUi.ts` reads the build's version (a Vite define the unit config does not set) when it loads
vi.hoisted(() => {
  (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ ??= '0.0.0';
});

import { courseGrant } from '../src/game/course/courseMarks';
import { courseSoloFlag } from '../src/game/modes/courseMode';
import { ALL_MARKS } from '../src/game/rating/sectionRating';
import { ReviveClock, REVIVES_PER_MISSION } from '../src/game/reviveClock';
import { ratingWire } from '../src/net/protocol';
import { CoopHost } from '../src/net/coopHost';
import { COURSE_TWO_PLAYERS, courseStartBlock } from '../src/net/coopUi';
import { ratingLines } from '../src/ui/hud/ratingCard';

// (J14 F1) Live rule fixes on the shipped Marlow Yard: revives stay at 2 in Course mode (conformance M3 / R35) and the
// lobby never starts Course mode with one player (R36; Michael ~21:42 "Yes, everywhere now").

type HostLike = { g: { opts: { mode: string } }; reviveClock: ReviveClock };
/** The real `CoopHost.addSyringes` on a plain host of `mode` (only what the method reads). */
function host(mode: string): HostLike & { add(n: number): void } {
  const h: HostLike = { g: { opts: { mode } }, reviveClock: new ReviveClock() };
  return { ...h, add: (n) => CoopHost.prototype.addSyringes.call(h as unknown as CoopHost, n) };
}

/** Starting gadget carry (noisemaker + gas), as the course passes it. */
const CARRY = 4;

describe('revive cap 2 in Course mode (M3 / R35)', () => {
  it('three best-possible co-op ratings later the cap is still 2; gadget and medkit grants still land; no card offers a syringe on host or client', () => {
    const h = host('course');
    for (let k = 0; k < 3; k++) {
      const left = h.reviveClock.cap - h.reviveClock.used;
      const gr = courseGrant(ALL_MARKS, 2, true, REVIVES_PER_MISSION, left, CARRY);
      expect(gr.syringe).toBe(0);
      expect(gr.gadget).toBeGreaterThan(0);
      expect(gr.medkit).toBeGreaterThan(0);
      // the host's card
      expect(ratingLines({ sectionId: 'A2', title: 'A2', marks: ALL_MARKS, synced: 2, grant: gr }).grant.some((l) => /syringe/.test(l))).toBe(false);
      // the client's card: the grant from the wire (`rt`), as `mirrorRating` builds it
      const rt = ratingWire({ sec: 1, marks: ALL_MARKS, synced: 2, gadget: gr.gadget, syringe: gr.syringe, medkit: gr.medkit, alarmStep: 0 })!;
      expect(rt.syringe).toBe(0);
      const client = { gadget: rt.gadget, syringe: rt.syringe, medkit: rt.medkit, alarmStep: 0 };
      expect(ratingLines({ sectionId: 'A2', title: 'A2', marks: rt.marks, synced: rt.synced, grant: client }).grant.some((l) => /syringe/.test(l))).toBe(false);
      h.add(gr.syringe);
    }
    expect(h.reviveClock.cap).toBe(REVIVES_PER_MISSION);
    expect(REVIVES_PER_MISSION).toBe(2);
  });

  it('the host ignores a syringe grant outside Sector Ops (Course mode keeps 2); Sector Ops still tops up', () => {
    const c = host('course');
    c.add(3);
    expect(c.reviveClock.cap).toBe(2);
    const s = host('sector');
    const before = s.reviveClock.cap;
    s.add(1);
    expect(s.reviveClock.cap).toBe(before + 1);
  });
});

describe('two players to start Course mode (R36)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  for (const dev of [false, true]) {
    it(`a lone host is refused in Course mode with DEV ${dev ? 'on' : 'off'}, even with ?course=solo in the URL; the reason names it`, () => {
      vi.stubEnv('DEV', dev);
      vi.stubGlobal('location', { search: '' });
      expect(courseStartBlock('course', 1)).toBe(COURSE_TWO_PLAYERS);
      vi.stubGlobal('location', { search: '?course=solo' });
      // the dev switch is on only in a dev build, and never opens the lobby's Start
      expect(courseSoloFlag()).toBe(dev);
      expect(courseStartBlock('course', 1)).toBe(COURSE_TWO_PLAYERS);
      expect(courseStartBlock('course', 0)).toBe(COURSE_TWO_PLAYERS);
      expect(courseStartBlock('course', 2)).toBeNull();
    });
  }

  it('only Course mode: a lone host may still start Sector Ops; the reason says two players', () => {
    expect(courseStartBlock('sector', 1)).toBeNull();
    expect(COURSE_TWO_PLAYERS).toMatch(/two players/);
  });
});
