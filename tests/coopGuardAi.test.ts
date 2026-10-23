import { describe, expect, it, vi } from 'vitest';
import {
  AL_ARMOUR,
  AL_CAUTION,
  AL_HELMET,
  AL_MAX,
  AL_SEIZED,
  AL_TORCH,
  BARK_CAM,
  BARK_TEXT,
  hitConfirmKind,
  packAlert,
  parseMessage,
  type EnemyState,
  type NetEvent,
} from '../src/net/protocol';
import { BARK_EVENTS, BARKS, BARKS_UNIT, barkIndex, barkLine, BarkVoice, RADIO_BARKS, type BarkEvent } from '../src/ai/barks';
import { DeflectLedger, PG_ARMOUR, PG_DROP, PG_HELMET, PG_JUMP, predictDeflect, puppetGear } from '../src/net/puppetGear';
import { GUARD_AIM, guardAim, wireGuardAim } from '../src/ai/guardStance';
import { Enemy } from '../src/ai/enemy';
import { CoopHost } from '../src/net/coopHost';
import { Vector3 } from '../src/core/babylon';
import type { AlertLevel } from '../src/ai/alertState';

// (guard-ai S9, protocol 41) The co-op guard state: the `bark` event (a guard's line by event / line / unit index, pair
// and desk lines as text), the caution / helmet / armour bits in the enemy `al`, the `deflect` hit confirm, and the
// puppet's pure parts (gear from the bits, the helmet drop, deflect prediction, the stance).

/** Through JSON and the parser, as a client receives it. */
const wireEvents = (events: unknown[]): NetEvent[] => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'ev', events })));
  return m && m.t === 'ev' ? m.events : [];
};

const snapEnemies = (enemies: EnemyState[]): EnemyState[] => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [], enemies, obj: '', info: '' })));
  return m && m.t === 'snap' ? m.enemies : [];
};

describe('guard-ai S9 wire', () => {
  it('packAlert: the new bits are 16 / 32 / 64 and every combination with the old ones round-trips', () => {
    expect([AL_SEIZED, AL_TORCH, AL_CAUTION, AL_HELMET, AL_ARMOUR, AL_MAX]).toEqual([4, 8, 16, 32, 64, 511]);
    const states: EnemyState[] = [];
    const want: number[][] = [];
    for (let lvl = 0; lvl < 4; lvl++) {
      for (let mask = 0; mask < 32; mask++) {
        const f = [(mask & 1) !== 0, (mask & 2) !== 0, (mask & 4) !== 0, (mask & 8) !== 0, (mask & 16) !== 0];
        const al = packAlert(lvl, f[0]!, f[1]!, f[2]!, f[3]!, f[4]!);
        expect(al & 3).toBe(lvl);
        expect([(al & AL_SEIZED) !== 0, (al & AL_TORCH) !== 0, (al & AL_CAUTION) !== 0, (al & AL_HELMET) !== 0, (al & AL_ARMOUR) !== 0]).toEqual(f);
        states.push({ id: `e${states.length}`, k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al });
        want.push([lvl, ...f.map((b) => (b ? 1 : 0))]);
      }
    }
    // MAX_ENEMIES (32) per snapshot
    const got: EnemyState[] = [];
    for (let i = 0; i < states.length; i += 32) got.push(...snapEnemies(states.slice(i, i + 32)));
    expect(got.length).toBe(128);
    got.forEach((e, i) => {
      const w = want[i]!;
      expect([e.al & 3, e.al & AL_SEIZED ? 1 : 0, e.al & AL_TORCH ? 1 : 0, e.al & AL_CAUTION ? 1 : 0, e.al & AL_HELMET ? 1 : 0, e.al & AL_ARMOUR ? 1 : 0]).toEqual(w);
    });
  });

  it('old packAlert callers are unchanged (three arguments: 0-15)', () => {
    expect(packAlert(3, true, false)).toBe(7);
    expect(packAlert(0, false, true)).toBe(8);
    expect(packAlert(3, true, true)).toBe(15);
    expect(packAlert(0, false, false, true, true, true)).toBe(112);
  });

  it('a bad al is clamped into the nine bits (A126: the carry is bits 7-8)', () => {
    const es = snapEnemies([
      { id: 'a', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: 999 },
      { id: 'b', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: -3 },
      { id: 'c', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: 99 },
    ]);
    expect(es.map((e) => e.al)).toEqual([511, 0, 99]);
  });
});

describe('guard-ai S9: the bark event', () => {
  it('BARK_EVENTS lists every bark event once (the wire order)', () => {
    const keys = Object.keys(BARKS).sort();
    expect([...BARK_EVENTS].sort()).toEqual(keys);
    expect(new Set(BARK_EVENTS).size).toBe(BARK_EVENTS.length);
    expect(BARK_EVENTS.length).toBeLessThan(BARK_CAM);
  });

  it('barkLine rebuilds exactly the line BarkVoice picked, for every event, line and unit', () => {
    for (const ev of BARK_EVENTS) {
      const v = new BarkVoice(5);
      for (let k = 0; k < 6; k++) {
        v.tick(10);
        const line = v.say(ev);
        expect(line).not.toBeNull();
        expect(barkLine(barkIndex(ev), v.lastLine, 0)).toBe(line);
      }
      if (BARKS_UNIT[ev]) {
        for (const unit of [1, 3, 12, 14]) {
          v.tick(10);
          const line = v.sayUnit(ev, unit);
          expect(barkLine(barkIndex(ev), v.lastLine, unit)).toBe(line);
          expect(line).toContain(unit === 14 ? '14' : unit === 3 ? 'three' : unit === 12 ? 'twelve' : 'one');
        }
      }
    }
    expect(barkLine(BARK_EVENTS.length, 0, 0)).toBeNull();
    expect(barkLine(-1, 0, 0)).toBeNull();
  });

  it('encodes and decodes: index barks, the desk and pair lines as text, bad ones dropped', () => {
    const missed = barkIndex('missed');
    const got = wireEvents([
      { e: 'bark', id: 'e7', b: missed, n: 2, u: 3, r: true },
      { e: 'bark', id: 'cam-2', b: BARK_CAM, n: 0, u: 0, r: true, t: 'Camera 2 has a man down. <b>Two</b> of you, go.' },
      { e: 'bark', id: 'e3', b: BARK_TEXT, n: 0, u: 0, r: false, t: 'Service lift is stuck on two again.' },
      { e: 'bark', id: 'e3', b: BARK_TEXT, n: 0, u: 0, r: false },
      { e: 'bark', id: 'bad id!', b: 1, n: 0, u: 0, r: false },
      { e: 'bark', id: 'e4', n: 0, u: 0, r: false },
      { e: 'bark', id: 'e5', b: 2.7, n: 99, u: -4, r: 'yes' },
    ]);
    expect(got).toEqual([
      { e: 'bark', id: 'e7', b: missed, n: 2, u: 3, r: true },
      { e: 'bark', id: 'cam-2', b: BARK_CAM, n: 0, u: 0, r: true, t: 'Camera 2 has a man down. bTwo/b of you, go.' },
      { e: 'bark', id: 'e3', b: BARK_TEXT, n: 0, u: 0, r: false, t: 'Service lift is stuck on two again.' },
      { e: 'bark', id: 'e5', b: 2, n: 63, u: 0, r: false },
    ]);
    const first = got[0] as Extract<NetEvent, { e: 'bark' }>;
    expect(barkLine(first.b, first.n, first.u)).toBe(barkLine(missed, 2, 3));
    expect(RADIO_BARKS.has(BARK_EVENTS[first.b]!)).toBe(true);
  });

  it('Enemy.bark hands the host its event, line index and unit (the co-op host sends these)', () => {
    const e = Object.create(Enemy.prototype) as Enemy;
    const onBark = vi.fn();
    Object.assign(e, { health: { alive: true }, voice: new BarkVoice(4), ctx: { onBark } });
    e.bark('missed', 3);
    e.bark('alarm');
    expect(onBark).toHaveBeenCalledTimes(2);
    const [, line, radio, ev, n, unit] = onBark.mock.calls[0]!;
    expect([radio, ev, unit]).toEqual([true, 'missed', 3]);
    expect(barkLine(barkIndex(ev as BarkEvent), n as number, unit as number)).toBe(line);
    const [, line2, , ev2, n2, unit2] = onBark.mock.calls[1]!;
    expect([ev2, unit2]).toEqual(['alarm', 0]);
    expect(barkLine(barkIndex('alarm'), n2 as number, 0)).toBe(line2);
  });
});

/** A host stand-in on CoopHost's prototype: its event queue and the hooks `hookCombat` wraps. */
function host() {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const em = { onBark: vi.fn(), onCameraLine: vi.fn(), onKilled: null, onEnemyShot: null, enemies: [] as unknown[] };
  const g = { enemyMgr: em, explosions: { onExplode: null }, gadgets: { onLocal: null }, events: { on: () => () => undefined } };
  Object.assign(h, { g, queue: [], offs: [], tracerBudget: 0, time: 0, history: new Map(), s: { selfId: 'H' } });
  return { h, em, queue: (h as unknown as { queue: NetEvent[] }).queue };
}

describe('guard-ai S9: the host sends what it shows', () => {
  it('a table bark goes as its indices, a pair line and a desk line as text; the host still shows them', () => {
    const { h, em, queue } = host();
    const shown = em.onBark;
    const shownCam = em.onCameraLine;
    (h as unknown as { hookCombat(): void }).hookCombat();
    const guard = { id: 'e9' };
    const v = new BarkVoice(2);
    const line = v.sayUnit('missed', 4)!;
    (em.onBark as unknown as (...a: unknown[]) => void)(guard, line, true, 'missed', v.lastLine, 4);
    (em.onBark as unknown as (...a: unknown[]) => void)(guard, 'Relief was meant to be here at four.', false);
    (em.onCameraLine as unknown as (...a: unknown[]) => void)('cam-1', 'Camera 1 has a man down. Nearest unit, check on him.');
    expect(shown).toHaveBeenCalledTimes(2);
    expect(shownCam).toHaveBeenCalledTimes(1);
    const got = wireEvents(queue);
    expect(got).toEqual([
      { e: 'bark', id: 'e9', b: barkIndex('missed'), n: v.lastLine, u: 4, r: true },
      { e: 'bark', id: 'e9', b: BARK_TEXT, n: 0, u: 0, r: false, t: 'Relief was meant to be here at four.' },
      { e: 'bark', id: 'cam-1', b: BARK_CAM, n: 0, u: 0, r: true, t: 'Camera 1 has a man down. Nearest unit, check on him.' },
    ]);
    const b = got[0] as Extract<NetEvent, { e: 'bark' }>;
    expect(barkLine(b.b, b.n, b.u)).toBe(line);
  });

  it("a client's round a helmet or vest stopped is confirmed as a deflect; a plain hit is not (the client predicts it)", () => {
    const { h, em, queue } = host();
    let res: { dealt: number; killed: boolean; deflect?: boolean } = { dealt: 0, killed: false, deflect: true };
    const guard = { id: 'g1', alive: true, def: { scale: 1 }, center: (o: Vector3) => o.set(0, 1, 0), applyDamage: vi.fn(() => res) };
    em.enemies.push(guard);
    Object.assign(h, { judge: () => 30, tmpB: new Vector3(), tmpH: new Vector3() });
    const r = { id: 'C', alive: true, state: { mv: { dw: 2 }, w: 'rifle' }, loadout: ['rifle'], takeShot: () => true };
    const shot = { t: 'shot', w: 'rifle', ox: 0, oy: 1.5, oz: -5, dx: 0, dy: 0, dz: 1, target: 'g1', part: 'head', rt: 0, dist: 5, dmg: 30 };
    const onShot = (h as unknown as { onShot(r: unknown, m: unknown): void }).onShot.bind(h);
    onShot(r, shot);
    expect(guard.applyDamage).toHaveBeenCalledTimes(1);
    expect(wireEvents(queue)).toEqual([{ e: 'hitConfirm', player: 'C', kind: 'deflect' }]);
    res = { dealt: 30, killed: false };
    onShot(r, { ...shot, part: 'body' });
    expect(queue.length).toBe(1);
  });

  it('hitConfirmKind: kill, deflect, head, hit, nothing', () => {
    expect(hitConfirmKind(30, true, false, true)).toBe('kill');
    expect(hitConfirmKind(0, false, true, true)).toBe('deflect');
    expect(hitConfirmKind(0, false, true, false)).toBe('deflect');
    expect(hitConfirmKind(30, false, false, true)).toBe('head');
    expect(hitConfirmKind(12, false, false, false)).toBe('hit');
    expect(hitConfirmKind(0, false, false, false)).toBeNull();
    expect(wireEvents([{ e: 'hitConfirm', player: 'C', kind: 'deflect' }, { e: 'hitConfirm', player: 'C', kind: 'graze' }])).toEqual([{ e: 'hitConfirm', player: 'C', kind: 'deflect' }]);
  });
});

describe('guard-ai S9: the puppet (pure parts)', () => {
  it('gear from the bits: helmet, armour, both, none', () => {
    expect(puppetGear(-1, 0, 0)).toBe(0);
    expect(puppetGear(-1, AL_HELMET, 0)).toBe(PG_HELMET);
    expect(puppetGear(-1, AL_ARMOUR | 3, 0)).toBe(PG_ARMOUR);
    expect(puppetGear(-1, AL_HELMET | AL_ARMOUR | AL_TORCH | AL_CAUTION, 0)).toBe(PG_HELMET | PG_ARMOUR);
  });

  it('the helmet bit clearing drops it, once, unless it is his first state or he jumped (a re-place)', () => {
    const on = AL_HELMET | AL_ARMOUR;
    expect(puppetGear(on, AL_ARMOUR, 0.05)).toBe(PG_ARMOUR | PG_DROP);
    expect(puppetGear(AL_ARMOUR, AL_ARMOUR, 0)).toBe(PG_ARMOUR);
    expect(puppetGear(-1, 0, 0) & PG_DROP).toBe(0);
    expect(puppetGear(on, AL_ARMOUR, PG_JUMP + 0.5) & PG_DROP).toBe(0);
    // armour coming off drops nothing
    expect(puppetGear(on, AL_HELMET, 0)).toBe(PG_HELMET);
  });

  it('predicts the deflect as the host gearHit does', () => {
    expect(predictDeflect(AL_HELMET, true, true, false, false)).toBe(true);
    expect(predictDeflect(AL_HELMET, false, true, false, false)).toBe(false);
    expect(predictDeflect(AL_ARMOUR, false, true, false, false)).toBe(true);
    expect(predictDeflect(AL_ARMOUR, true, true, false, false)).toBe(false);
    // a sleep bolt, a non-bullet, a heavy (his own plates rule): no deflect
    expect(predictDeflect(AL_HELMET | AL_ARMOUR, true, true, true, false)).toBe(false);
    expect(predictDeflect(AL_HELMET | AL_ARMOUR, true, false, false, false)).toBe(false);
    expect(predictDeflect(AL_HELMET | AL_ARMOUR, true, true, false, true)).toBe(false);
  });

  it('DeflectLedger: a predicted deflect is shown once; an unpredicted one shows on the confirm', () => {
    const l = new DeflectLedger(1);
    expect(l.confirm(0)).toBe(true);
    l.predict(1);
    l.predict(1.1);
    expect(l.confirm(1.2)).toBe(false);
    expect(l.confirm(1.3)).toBe(false);
    expect(l.confirm(1.4)).toBe(true);
    // a prediction the host never confirmed is forgotten after the window
    l.predict(5);
    expect(l.confirm(7)).toBe(true);
  });

  it('the stance matches on both sides: low ready when cautious and calm, raised when searching, fire when aiming', () => {
    const wireLevel: Record<AlertLevel, number> = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 1, searching: 2, alert: 3 };
    for (const lvl of ['unaware', 'cooldown', 'searching', 'alert', 'investigating'] as AlertLevel[]) {
      for (const c of [false, true]) expect(wireGuardAim(0, wireLevel[lvl], c)).toBe(guardAim(false, lvl, c));
    }
    expect(guardAim(false, 'cooldown', true)).toBe(GUARD_AIM.caution);
    expect(guardAim(false, 'unaware', false)).toBe(GUARD_AIM.rest);
    expect(GUARD_AIM.caution).toBeGreaterThan(GUARD_AIM.rest);
    expect(GUARD_AIM.caution).toBeLessThan(0.5);
    expect(wireGuardAim(1, 0, true)).toBe(GUARD_AIM.fire);
    expect(wireGuardAim(2, 0, false)).toBe(GUARD_AIM.fire);
    expect(guardAim(true, 'unaware', true)).toBe(GUARD_AIM.fire);
  });
});
