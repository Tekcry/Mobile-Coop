// (coop-walk-fixes) Michael's 4.72 walk. P6: "coop partner has takedown option when host is holding hostage, but it
// doesnt do anything. should trigger coop takedown"; "if coop partner holds guard, host doesnt have option for
// takedown." P7: "coop player shooting doubles audio and doesnt sound suppressed."
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { assistPlan, TAKEDOWN } from '../src/game/takedown';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import { DualClock } from '../src/game/dualTakedown';
import type { GameState, NetAttachment } from '../src/game/gameState';
import { assistHolder, type SeizedHold } from '../src/net/assistTakedown';
import { RemoteShots, SHOTS_QUEUE_MAX } from '../src/net/remoteShots';
import { parseMessage, type PlayerState } from '../src/net/protocol';
import { remoteGun } from '../src/audio/weapons/guns';

describe('P6 assistPlan (pure)', () => {
  it('in reach on the ground from any side: kind assist, no approach, the attacker faces the guard', () => {
    const p = assistPlan(0, 0, 0, 1, 0, 1, true)!;
    expect(p.kind).toBe('assist');
    expect(p.approach).toBe(0);
    expect(p.strike).toBe(TAKEDOWN.strike);
    expect(p.alignX).toBe(0);
    expect(p.alignZ).toBe(0);
    expect(p.faceYaw).toBeCloseTo(Math.PI / 4, 6);
    expect(p.victimTo).toBeNull();
    // from straight in front of him too (the hostage faces the holder's way; a grab rule never applies)
    expect(assistPlan(0, 0, 1.5, 0, 0, 0, true)?.kind).toBe('assist');
  });

  it('out of reach, another floor or no line of sight: none', () => {
    expect(assistPlan(0, 0, 0, TAKEDOWN.reach + 0.05, 0, 0, true)).toBeNull();
    expect(assistPlan(0, 0, 0, 1, TAKEDOWN.dy + 0.05, 0, true)).toBeNull();
    expect(assistPlan(0, 0, 0, 1, 0, 0, false)).toBeNull();
  });
});

describe('P6 assistHolder (host rules)', () => {
  const seized = new Map<string, SeizedHold>([
    ['g1', { by: 'c1', hostage: true }],
    ['g2', { by: 'c1' }],
  ]);
  const tids: Record<string, string> = { c1: 'g1' };
  const grabTid = (id: string): string => tids[id] ?? '';

  it('the host holds the guard: a client asking gets the host as holder; the host itself none', () => {
    expect(assistHolder('g9', 'c1', 'H', 'g9', seized, grabTid)).toBe('H');
    expect(assistHolder('g9', 'H', 'H', 'g9', seized, grabTid)).toBeNull();
  });

  it('a client holds the guard as a hostage: the host or another client gets that client; the holder itself none', () => {
    expect(assistHolder('g1', 'H', 'H', '', seized, grabTid)).toBe('c1');
    expect(assistHolder('g1', 'c2', 'H', '', seized, grabTid)).toBe('c1');
    expect(assistHolder('g1', 'c1', 'H', '', seized, grabTid)).toBeNull();
  });

  it('seized but not (yet) a hostage, or the holder no longer in the grab on him: none', () => {
    expect(assistHolder('g2', 'H', 'H', '', seized, grabTid)).toBeNull();
    tids.c1 = '';
    expect(assistHolder('g1', 'H', 'H', '', seized, grabTid)).toBeNull();
    tids.c1 = 'g1';
    expect(assistHolder('g5', 'H', 'H', '', seized, grabTid)).toBeNull();
  });

  it('the holder and the striker credited together make the dual (co-op) takedown', () => {
    const c = new DualClock();
    expect(c.note('c1', 10)).toBeNull();
    expect(c.note('H', 10)).toBe('c1');
  });
});

/** A victim the partner holds: taken (the host's view of a client-held guard) and alert (it does not matter). */
function heldGuard(): TakedownVictim & { begins: number; releases: number; holds: number } {
  const v = {
    id: 'g1',
    pos: new Vector3(0, 0, 1.2),
    yaw: 0,
    alive: true,
    def: { kind: 'grunt', quadruped: false } as unknown as TakedownVictim['def'],
    alerted: true,
    level: 'alert' as const,
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: true,
    begins: 0,
    releases: 0,
    holds: 0,
    beginTakedown(): void {
      v.begins++;
    },
    holdAt(): void {
      v.holds++;
    },
    releaseTakedown(): void {
      v.releases++;
    },
    applyDamage: () => ({ dealt: 0, killed: false }),
    knockOut(): void {
      throw new Error('the team takedown is applied by the host, not here');
    },
  };
  return v;
}

/** The parts of GameState the takedown controller reads, with a net layer that says the partner holds `v`. */
function fakeGame(v: TakedownVictim, net: Partial<NetAttachment> | null): { g: GameState; events: { phase: string; kind: string }[] } {
  const events: { phase: string; kind: string }[] = [];
  const pos = new Vector3(0, 0, 0);
  const g = {
    player: {
      alive: true,
      position: pos,
      controller: { pos, override: null, speedCap: Infinity, standUp: () => undefined, gear: 2, crouched: false, yaw: 0, speed: 0 },
      pose: { melee: -1 },
      rig: { reachL: { x: 0, y: 0, z: 0, w: 0 }, reachR: { x: 0, y: 0, z: 0, w: 0 } },
    },
    stealth: null,
    takedownVictims: () => [v],
    team: { hangingDown: false, hangActs: false },
    spottedLocal: true,
    wallCore: null,
    traversal: { attached: false, hintWindow: null, reset: () => undefined },
    ballistics: { ray: () => ({ hit: false, distance: 0 }) },
    target: { health: { hp: 100 } },
    events: { emit: (_n: string, e: { phase: string; kind: string }) => events.push({ phase: e.phase, kind: e.kind }) },
    enemyMgr: null,
    strike: { active: false },
    net,
  };
  return { g: g as unknown as GameState, events };
}

describe('P6 TakedownController: the team takedown on the partner hostage', () => {
  const dt = 1 / 60;

  it('solo (no net layer): a taken guard is never on offer', () => {
    const v = heldGuard();
    const { g } = fakeGame(v, null);
    const td = new TakedownController(g);
    td.fixedUpdate(dt, false, false);
    expect(td.offer).toBeNull();
  });

  it('the partner holds him: offered (taken and alert), the press neither seizes nor moves him, the host is asked', () => {
    const v = heldGuard();
    const calls: string[] = [];
    let holds = true;
    const net: Partial<NetAttachment> = {
      partnerHolds: (x) => holds && x === v,
      assistTakedown: (_x, ph, lethal) => calls.push(`${ph}:${lethal}`),
    };
    const { g, events } = fakeGame(v, net);
    const td = new TakedownController(g);
    td.fixedUpdate(dt, false, false);
    expect(td.offer?.plan.kind).toBe('assist');
    expect(td.offer?.lethalOnly).toBe(false);
    // the menu row's Team takedown: a decided knockout
    td.start(false);
    expect(v.begins).toBe(0);
    expect(calls).toEqual(['start:false']);
    for (let i = 0; i < 60 && td.active; i++) td.fixedUpdate(dt, false, false);
    expect(td.active).toBeNull();
    expect(v.holds).toBe(0);
    expect(v.releases).toBe(0);
    expect(calls).toEqual(['start:false', 'done:false']);
    expect(td.done.byKind.assist).toBe(1);
    expect(events.at(-1)).toEqual({ phase: 'done', kind: 'assist' });
    // a held press (the old tap / hold rule) decides the kill
    td.fixedUpdate(dt, true, true);
    expect(td.active?.plan.kind).toBe('assist');
    for (let i = 0; i < 60 && td.active; i++) td.fixedUpdate(dt, false, true);
    expect(calls.at(-1)).toBe('done:true');
    // the partner lets go mid-move: it falls apart, the guard is not released here (the partner never let him be seized)
    td.fixedUpdate(dt, true, false);
    expect(td.active).not.toBeNull();
    holds = false;
    td.fixedUpdate(dt, false, false);
    expect(td.active).toBeNull();
    expect(calls.at(-1)).toBe('abort:false');
    expect(v.releases).toBe(0);
    // and no longer offered
    td.fixedUpdate(dt, false, false);
    expect(td.offer).toBeNull();
  });

  it('out of reach: no offer', () => {
    const v = heldGuard();
    v.pos.set(0, 0, TAKEDOWN.reach + 0.3);
    const { g } = fakeGame(v, { partnerHolds: () => true });
    const td = new TakedownController(g);
    td.fixedUpdate(dt, false, false);
    expect(td.offer).toBeNull();
  });
});

describe('P7 RemoteShots: one sound per round', () => {
  const iv = 60 / 400;

  it('the first counter only syncs; one round plays once however long the frames keep coming', () => {
    const r = new RemoteShots();
    r.observe(7);
    expect(r.step(1 / 60, iv)).toBe(false);
    r.observe(8);
    let n = 0;
    // the old PF.firing window (0.2 s, plus the 20 Hz state) is long past here: still one
    for (let i = 0; i < 60; i++) {
      r.observe(8);
      if (r.step(1 / 60, iv)) n++;
    }
    expect(n).toBe(1);
  });

  it('a burst plays each round, spaced at the fire interval; the counter wraps at 256', () => {
    const r = new RemoteShots();
    r.observe(254);
    r.observe(2);
    const at: number[] = [];
    for (let i = 0; i < 120; i++) if (r.step(1 / 60, iv)) at.push(i);
    expect(at.length).toBe(4);
    for (let k = 1; k < at.length; k++) expect((at[k]! - at[k - 1]!) / 60).toBeGreaterThanOrEqual(iv - 1e-9);
  });

  it('a large jump resyncs silently; the queue is capped; clear drops what is queued', () => {
    const r = new RemoteShots();
    r.observe(0);
    r.observe(100);
    expect(r.pending).toBe(0);
    r.observe(115);
    expect(r.pending).toBe(SHOTS_QUEUE_MAX);
    r.clear();
    expect(r.step(1, iv)).toBe(false);
  });
});

describe('P7 the partner weapon sound and the wire', () => {
  it('the suppressed pistol sounds as itself, not as the class open pistol; a guard tracer keeps its class', () => {
    expect(remoteGun('pistol', 'pistolSd')).toBe('pistolSd');
    expect(remoteGun('rifle', 'rifle')).toBe('rifle');
    expect(remoteGun('pistol')).toBe('pistol');
    expect(remoteGun('rifle', 'nope')).toBe('rifle');
  });

  it('pstate carries sc (clamped to 0..255, dropped when not a number)', () => {
    const ps: PlayerState = { id: 'c1', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: 0, w: 'pistolSd', hp: 100, sc: 42 };
    const m = parseMessage(JSON.parse(JSON.stringify({ t: 'pstate', s: ps })));
    expect(m && m.t === 'pstate' && m.s.sc).toBe(42);
    const big = parseMessage({ t: 'pstate', s: { ...ps, sc: 999.7 } });
    expect(big && big.t === 'pstate' && big.s.sc).toBe(255);
    const bad = parseMessage({ t: 'pstate', s: { ...ps, sc: 'x' } });
    expect(bad && bad.t === 'pstate' && 'sc' in bad.s).toBe(false);
  });

  it('a td start with kind assist parses (the team takedown request)', () => {
    const m = parseMessage({ t: 'td', target: 'e3', ph: 'start', lethal: false, kind: 'assist' });
    expect(m).toEqual({ t: 'td', target: 'e3', ph: 'start', lethal: false, kind: 'assist' });
  });
});
