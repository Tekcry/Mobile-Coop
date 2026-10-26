import { describe, expect, it } from 'vitest';
import {
  calmArea,
  CARRY_DRAWING,
  CARRY_DRAWN,
  CARRY_HOLSTERED,
  CARRY_HOLSTERING,
  carryRaise,
  carrySlotOf,
  GUARD_CARRY,
  GuardCarry,
  mayHolster,
} from '../src/ai/carryState';
import { DRAW_BEAT } from '../src/anim/drawMotion';
import { ENEMIES, ENEMY_KINDS } from '../src/ai/enemyDefs';
import { WEAPONS } from '../src/weapons/weaponDefs';
import { AlertMachine, type AlertLevel } from '../src/ai/alertState';
import type { Enemy } from '../src/ai/enemy';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

// (guard-ai S21, Michael's walk of 4.72 G5: "they also dont always have to be low-ready, then can walk around holstered
// if they are in a calm area.") A calm guard in a calm area carries his gun holstered / slung; anything above calm draws
// it (no shot until the draw ends); he holsters again only after a calm hold.

const DT = 1 / 60;

/** Steps `c` for `s` seconds at `calm`. */
function run(c: GuardCarry, s: number, calm: boolean): void {
  const n = Math.round(s / DT);
  for (let i = 0; i < n; i++) c.step(DT, calm);
}

/** A rifle guard's carry, started calm (holstered) or not (drawn). */
function rifle(startCalm: boolean): GuardCarry {
  const c = new GuardCarry(true, 'rifle');
  c.step(DT, startCalm);
  return c;
}

describe('the calm area (calmArea)', () => {
  it('a calm guard in a calm section is in a calm area', () => {
    expect(calmArea('unaware', 0, false, false, false, false)).toBe(true);
  });
  it('suspicion, investigation, search, combat or the cooldown after it is not calm', () => {
    for (const l of ['suspicious', 'investigating', 'searching', 'alert', 'cooldown'] as AlertLevel[]) expect(calmArea(l, 0, false, false, false, false), l).toBe(false);
  });
  it('caution (a death he knows of, a section alert), a board task, a raised alarm, a high-security post or a response is not calm', () => {
    expect(calmArea('unaware', 1, false, false, false, false)).toBe(false);
    expect(calmArea('unaware', 2, false, false, false, false)).toBe(false);
    expect(calmArea('unaware', 0, true, false, false, false)).toBe(false);
    expect(calmArea('unaware', 0, false, true, false, false)).toBe(false);
    expect(calmArea('unaware', 0, false, false, true, false)).toBe(false);
    expect(calmArea('unaware', 0, false, false, false, true)).toBe(false);
  });
});

describe('who holsters, and where', () => {
  it('every guard kind with a gun holsters except the sniper and the enforcer; the dog and melee kinds never', () => {
    const want: Record<string, boolean> = {};
    for (const k of ENEMY_KINDS) {
      const d = ENEMIES[k];
      want[k] = mayHolster(k, d.gun, !!d.melee, d.quadruped);
    }
    expect(want.grunt).toBe(true);
    expect(want.heavy).toBe(true);
    expect(want.officer).toBe(true);
    // (guard-ai runner-armed) the runner carries the rifle since G298
    expect(want.runner).toBe(true);
    expect(want.sniper).toBe(false);
    expect(want.enforcer).toBe(false);
    expect(want.dog).toBe(false);
    expect(mayHolster('grunt', null, false, false)).toBe(false);
    expect(mayHolster('grunt', 'rifle', true, false)).toBe(false);
  });
  it('the rifle rides slung across the back, the pistol on the right thigh, a compact on the hip sling', () => {
    expect(carrySlotOf(WEAPONS.rifle.class)).toBe('backC');
    expect(carrySlotOf(WEAPONS.pistolSd.class)).toBe('thigh');
    expect(carrySlotOf('smg')).toBe('sling');
  });
});

describe('the carry (GuardCarry)', () => {
  it('a calm guard in a calm area starts holstered with no clip; one who is not starts drawn', () => {
    const c = rifle(true);
    expect(c.phase).toBe(CARRY_HOLSTERED);
    expect(c.holstered).toBe(true);
    expect(c.swapClip()).toBe(-1);
    run(c, 30, true);
    expect(c.phase).toBe(CARRY_HOLSTERED);
    const d = rifle(false);
    expect(d.phase).toBe(CARRY_DRAWN);
    expect(d.swapClip()).toBe(-1);
  });

  it('suspicious: he draws (the draw clip from the holstered beat), at low ready once drawn; no raise while holstered', () => {
    const c = rifle(true);
    expect(carryRaise(0.2, c)).toBe(0);
    c.step(DT, false);
    expect(c.phase).toBe(CARRY_DRAWING);
    expect(c.drawn).toBe(false);
    expect(c.swapClip()).toBeCloseTo(DRAW_BEAT, 9);
    let prev = c.swapClip();
    for (let i = 0; i < 20; i++) {
      c.step(DT, false);
      if (c.phase !== CARRY_DRAWING) break;
      expect(c.swapClip()).toBeGreaterThan(prev);
      prev = c.swapClip();
    }
    run(c, 1, false);
    expect(c.phase).toBe(CARRY_DRAWN);
    expect(carryRaise(0.4, c)).toBe(0.4);
  });

  it('combat: raised once drawn; a rifle draws in 0.7 s and a pistol in 0.5 s, so a guard who spots the player reacts promptly', () => {
    const c = rifle(true);
    let t = 0;
    while (!c.drawn && t < 5) {
      c.step(DT, false);
      t += DT;
    }
    expect(t).toBeLessThanOrEqual(GUARD_CARRY.draw.long + 3 * DT);
    expect(GUARD_CARRY.draw.long).toBeLessThanOrEqual(0.75);
    expect(carryRaise(1, c)).toBe(1);
    const p = new GuardCarry(true, WEAPONS.pistolSd.class);
    p.step(DT, true);
    t = 0;
    while (!p.drawn && t < 5) {
      p.step(DT, false);
      t += DT;
    }
    expect(t).toBeLessThanOrEqual(GUARD_CARRY.draw.pistol + 3 * DT);
  });

  it('an alarm raised or a high-security post: drawn (the calm-area rule is false), and he stays drawn', () => {
    const c = rifle(true);
    run(c, 60, calmArea('unaware', 0, false, true, false, false));
    expect(c.phase).toBe(CARRY_DRAWN);
    const post = rifle(calmArea('unaware', 0, false, false, true, false));
    run(post, 60, calmArea('unaware', 0, false, false, true, false));
    expect(post.phase).toBe(CARRY_DRAWN);
  });

  it('he holsters again only after the calm hold, and a stir inside it starts the hold over', () => {
    const c = rifle(false);
    run(c, GUARD_CARRY.calmHold - 1, true);
    expect(c.phase).toBe(CARRY_DRAWN);
    c.step(DT, false);
    run(c, GUARD_CARRY.calmHold - 1, true);
    expect(c.phase).toBe(CARRY_DRAWN);
    run(c, 1.2, true);
    expect(c.phase).toBe(CARRY_HOLSTERING);
    // the holster clip runs 0 .. the holstered beat
    expect(c.swapClip()).toBeGreaterThanOrEqual(0);
    expect(c.swapClip()).toBeLessThanOrEqual(DRAW_BEAT);
    run(c, GUARD_CARRY.holster.long + 0.1, true);
    expect(c.phase).toBe(CARRY_HOLSTERED);
    expect(c.swapClip()).toBe(-1);
  });

  it('stirred mid-holster: straight back up, quicker than a full draw', () => {
    const c = rifle(false);
    run(c, GUARD_CARRY.calmHold + 0.1, true);
    expect(c.phase).toBe(CARRY_HOLSTERING);
    run(c, 0.3, true);
    const seq = c.seq;
    c.step(DT, false);
    expect(c.phase).toBe(CARRY_DRAWING);
    expect(c.seq).toBe(seq + 1);
    let t = 0;
    while (!c.drawn && t < 5) {
      c.step(DT, false);
      t += DT;
    }
    expect(t).toBeLessThan(GUARD_CARRY.draw.long);
  });

  it('calm again mid-draw: the draw ends, then the calm hold', () => {
    const c = rifle(true);
    c.step(DT, false);
    run(c, 0.2, true);
    run(c, 1, true);
    expect(c.phase).toBe(CARRY_DRAWN);
    run(c, GUARD_CARRY.calmHold + GUARD_CARRY.holster.long + 0.2, true);
    expect(c.phase).toBe(CARRY_HOLSTERED);
  });

  it('a kind that never holsters is always drawn', () => {
    const c = new GuardCarry(false, 'rifle');
    run(c, 30, true);
    expect(c.phase).toBe(CARRY_DRAWN);
    expect(c.drawn).toBe(true);
  });

  it('allocates nothing per step', async () => {
    const c = rifle(false);
    const calm = inputs(2000, (k) => (k % 1500 < 1400 ? 1 : 0));
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        c.step(0.02, calm[i]! > 0.5);
        sink[0]! += c.swapClip() + carryRaise(0.5, c);
      }
    }, 4 * HEAP_NUMBER);
    expect(per).toBeLessThanOrEqual(4 * HEAP_NUMBER);
  });
});

// ----- on the real Enemy code -----

type Probe = {
  carryCalm(): boolean;
  tryFire(dt: number): void;
  carry: GuardCarry;
  aware: AlertMachine;
  caution: number;
  incident: number;
  responder: boolean;
  crew: unknown;
  postDef: unknown;
  windup: number;
  shots: number;
};

async function guard(o: { alarm?: boolean; stealth?: boolean } = {}): Promise<Probe> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    caution: 0,
    incident: -1,
    camBody: null,
    responder: false,
    crew: null,
    postDef: null,
    taken: false,
    carry: new GuardCarry(true, 'rifle'),
    ctx: { stealth: () => o.stealth ?? true, alarmRaised: () => o.alarm ?? false, diff: { reaction: 1 } },
    // tryFire's inputs: in range and in sight, the first burst ready
    def: { weapon: { range: 50, windup: 0, burstMin: 3, burstMax: 3, rpm: 600, pauseMin: 1, pauseMax: 1 }, kind: 'grunt' },
    target: { shield: false },
    los: true,
    dist: 10,
    shieldT: 0,
    burstLeft: 0,
    pauseT: 0,
    windup: 0,
    fireT: 0,
    rng: { range: (a: number) => a },
    // (guard-ai S16) no armour on the fire line: the S16 gate is not under test here
    armourBlocks: () => false,
    shots: 0,
    shoot(this: Probe) {
      this.shots++;
    },
  });
  return e as unknown as Probe;
}

describe('the calm area on the real Enemy (carryCalm) and no shot before the draw (tryFire)', () => {
  it('calm, no alarm, stealth rules: a calm area', async () => {
    expect((await guard()).carryCalm()).toBe(true);
  });
  it('a raised alarm, the parked modes (no stealth rules), caution, a task, a response or a high-security post: not', async () => {
    expect((await guard({ alarm: true })).carryCalm()).toBe(false);
    expect((await guard({ stealth: false })).carryCalm()).toBe(false);
    const c = await guard();
    c.caution = 1;
    expect(c.carryCalm()).toBe(false);
    const t = await guard();
    t.incident = 3;
    expect(t.carryCalm()).toBe(false);
    const r = await guard();
    r.responder = true;
    expect(r.carryCalm()).toBe(false);
    const w = await guard();
    w.crew = {};
    expect(w.carryCalm()).toBe(false);
    const s = await guard();
    s.postDef = { highSecurity: true, leash: 3 };
    expect(s.carryCalm()).toBe(false);
    const n = await guard();
    n.postDef = { highSecurity: false, leash: 3 };
    expect(n.carryCalm()).toBe(true);
    const a = await guard();
    a.aware.set('suspicious');
    expect(a.carryCalm()).toBe(false);
  });
  it('holstered and spotted: no shot until the draw ends, then he fires', async () => {
    const e = await guard();
    e.carry.step(DT, true);
    expect(e.carry.holstered).toBe(true);
    e.carry.step(DT, false);
    e.tryFire(DT);
    expect(e.shots).toBe(0);
    expect(e.windup).toBe(0);
    run(e.carry, 1, false);
    expect(e.carry.drawn).toBe(true);
    e.tryFire(DT);
    expect(e.shots).toBe(1);
  });
});
