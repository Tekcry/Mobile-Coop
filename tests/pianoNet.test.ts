// (piano-escape S4) Co-op: the host's EMP press as one optional field of the `sector` message (`ep`, parsed in
// `sectorExtra`), and the client page's scene on it (its intro ends, the lightning's t0, the music switch, the knife).
import { describe, expect, it } from 'vitest';
import { EP_MAX, parseMessage, type Msg } from '../src/net/protocol';
import { EMP_ITEM, LIGHTNING_OFF_T0, PianoScene, nearestEmpItem, type PianoEmpHooks, type PianoHost, type PianoWorld } from '../src/game/pianoScene';
import { EMP_CUT_S, EMP_SEEK, OBJECTIVE_LINE, PROMPT_AT, PianoIntro } from '../src/game/pianoIntro';
import { THORNBECK_SECTORS, thornbeckMill } from '../src/world/maps/thornbeckMill';

const sectorOf = (m: Msg | null) => (m && m.t === 'sector' ? m : null);

describe('the sector message carries the host EMP press (ep)', () => {
  it('absent: no ep (and the rest parses as before)', () => {
    const m = sectorOf(parseMessage({ t: 'sector', ls: 0, lk: [], dn: [], sy: 2 }));
    expect(m).not.toBeNull();
    expect(m && 'ep' in m).toBe(false);
    expect(m?.sy).toBe(2);
  });

  it('present: the host sim time round-trips', () => {
    const msg = { t: 'sector', ls: 0, lk: [], dn: [], sy: 2, ep: 812.375 };
    expect(sectorOf(parseMessage(JSON.parse(JSON.stringify(msg))))?.ep).toBe(812.375);
    expect(sectorOf(parseMessage({ t: 'sector', ep: 0 }))?.ep).toBe(0);
  });

  it('junk: dropped (not a finite number); out of range: clamped to 0..EP_MAX; the rest of the message stays', () => {
    for (const bad of [null, 'x', '12', [1], {}, NaN, Infinity, -Infinity, true]) {
      const m = sectorOf(parseMessage({ t: 'sector', ls: 1, ep: bad }));
      expect(m).not.toBeNull();
      expect(m?.ls).toBe(1);
      expect(m && 'ep' in m).toBe(false);
    }
    expect(sectorOf(parseMessage({ t: 'sector', ep: -5 }))?.ep).toBe(0);
    expect(sectorOf(parseMessage({ t: 'sector', ep: 1e12 }))?.ep).toBe(EP_MAX);
  });
});

describe('the client page: its own intro, ended by the host EMP', () => {
  function client() {
    const log: string[] = [];
    let local = false;
    const hooks: PianoEmpHooks = {
      mainsOff: () => (log.push('mainsOff'), 0),
      lightningT0: (t) => void log.push(`t0 ${t}`),
      sceneDark: (on) => void log.push(`dark ${on}`),
      blackoutSearchSlots: () => (log.push('search'), 0),
    };
    const w: PianoWorld = {
      hooks,
      music: {
        scene: (on) => void log.push(`music ${on}`),
        piano: { start: () => Promise.resolve(), seek: (s) => void log.push(`seek ${s}`), fadeOut: (s) => void log.push(`fadeOut ${s}`) },
      },
      spawn: () => void log.push('spawn'),
      spawned: () => false,
      retakeStart: () => void log.push('retake'),
      simTime: () => 50,
      localPress: () => local,
      empItems: (on) => void log.push(`items ${on}`),
      operatorAt: (_by, out) => {
        out.x = 4;
        out.y = 0;
        out.z = 6;
      },
      hud: (on) => void log.push(`hud ${on}`),
      cutLines: (_r, o) => void log.push(`objective ${o}`),
      guardWithin: () => true,
      sectionGuards: () => 12,
      view: () => null,
      knifeScene: (on) => void log.push(`knife ${on}`),
      askEmp: () => void log.push('ask'),
    };
    const h: PianoHost = {
      weapons: { slots: [], gadgets: { counts: {} }, index: 0, switchTo: () => undefined },
      hud: { feedItem: () => undefined },
      net: {},
      endSession: () => void log.push('end'),
      playerRefsInto: () => [],
    };
    const sc = new PianoScene(h, () => null, w);
    sc.start();
    return { sc, log, intro: sc.intro!, press: (on: boolean) => (local = on) };
  }

  it('frames the partner (slot 1), no flash in its intro, its press goes to the host (never the beat here)', () => {
    const c = client();
    expect(c.intro.slot).toBe(1);
    expect(c.log[0]).toBe(`t0 ${LIGHTNING_OFF_T0}`);
    c.intro.musicStarted();
    c.intro.step(PROMPT_AT);
    c.log.length = 0;
    c.sc.step(1 / 60, true);
    expect(c.log).toEqual([]);
    c.press(true);
    c.sc.step(1 / 60, true);
    expect(c.log).toEqual(['ask']);
    expect(c.sc.pressed).toBe(false);
  });

  it('the host press ends the intro (before its own prompt too): t0, the music switch, the knife; no cut, spawn or search', () => {
    const c = client();
    c.intro.musicStarted();
    c.intro.step(20);
    c.log.length = 0;
    expect(c.sc.hostEmp(812.5)).toBe(true);
    expect(c.sc.hostEmp(900)).toBe(false);
    expect(c.sc.t0).toBe(812.5);
    expect(c.log).toEqual(['t0 812.5', `seek ${EMP_SEEK}`, 'knife true']);
    expect(c.intro.shot).toBe('emp');
    c.sc.step(1 / 60, true);
    expect(c.sc.inPlay).toBe(false);
    c.intro.step(EMP_CUT_S);
    c.sc.step(1 / 60, true);
    expect(c.sc.inPlay).toBe(true);
    expect(c.log.slice(3)).toEqual(['hud true', `objective ${OBJECTIVE_LINE}`]);
    for (let i = 0; i < 30; i++) c.sc.step(0.1, true);
    expect(c.log.some((l) => /spawn|search|mainsOff|dark|items/.test(l))).toBe(false);
  });

  it('PianoIntro.hostPress: once, from anywhere (also while waiting for the music)', () => {
    const i = new PianoIntro(1);
    expect(i.hostPress()).toBe(true);
    expect(i.hostPress()).toBe(false);
    expect(i.press()).toBe(false);
    i.step(EMP_CUT_S);
    expect(i.done).toBe(true);
  });

  it('nearestEmpItem: the client names the EMP item at its own spot (start2: 1, start: 0)', () => {
    const s = THORNBECK_SECTORS[0]!;
    expect(nearestEmpItem(thornbeckMill, s.start2!.x, s.start2!.z)).toBe(`${EMP_ITEM}1`);
    expect(nearestEmpItem(thornbeckMill, s.start.x, s.start.z)).toBe(`${EMP_ITEM}0`);
    expect(nearestEmpItem({}, 0, 0)).toBe(`${EMP_ITEM}0`);
  });
});
