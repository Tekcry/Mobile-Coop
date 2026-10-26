// (piano-knife S1) The takedown controller with the knife switch (BRIEF A1, A2, A5, A6, A14) on a fake game (as
// `tests/hangDownTakedown.test.ts`): off, behind / corner / front run exactly today's events and noise; on, one press is
// a lethal knife kill (no grab, 1.2 m, `knife: true`, the victim dead, the drives played), with the -1 path for a
// victim without `knifeVictim` and for clips not yet loaded; damage before the stab aborts, after it finishes; at the
// end the knife is away and both drives are off.
import { beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { TAKEDOWN, type TakedownKind, type TakedownPlan } from '../src/game/takedown';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import type { GameState } from '../src/game/gameState';
import { bucklePitchOf, buckleAt, KNIFE, KNIFE_KILLS, knifeClipsReady, loadKnifeClips, resetKnifeClipsForTest, victimPhase } from '../src/game/knifeKill';

const DT = 1 / 60;

type Ev = Record<string, unknown> & { phase: string; lethal: boolean; kind: string };
interface Victim extends TakedownVictim {
  killed: boolean;
  ko: boolean;
  calls: number;
  lastClip: unknown;
  lastPh: number;
  lastBuckle: number;
}

function victim(yaw: number, withKnife: boolean): Victim {
  const v: Victim = {
    id: 'e1',
    pos: new Vector3(0, 0, 0.8),
    yaw,
    alive: true,
    killed: false,
    ko: false,
    calls: 0,
    lastClip: undefined,
    lastPh: -1,
    lastBuckle: 0,
    def: { quadruped: false, kind: 'grunt' } as unknown as TakedownVictim['def'],
    alerted: false,
    level: 'unaware' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown() {
      this.taken = true;
    },
    holdAt(x: number, y: number, z: number, yy: number) {
      this.pos.set(x, y, z);
      (this as { yaw: number }).yaw = yy;
    },
    releaseTakedown() {
      this.taken = false;
    },
    applyDamage() {
      (this as { alive: boolean }).alive = false;
      this.killed = true;
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {
      (this as { alive: boolean }).alive = false;
      this.ko = true;
    },
  };
  if (withKnife) {
    v.knifeVictim = function (this: Victim, clip: unknown, ph: number, buckle: number) {
      this.calls++;
      this.lastClip = clip;
      this.lastPh = ph;
      this.lastBuckle = buckle;
    };
  }
  return v;
}

interface Stage {
  g: GameState;
  td: TakedownController;
  ev: Ev[];
  hears: number[];
  knife: { shown: boolean; shows: number };
  graph: { kill: unknown };
  rig: { reachL: { w: number }; reachR: { w: number } };
  hp: { hp: number };
  controller: { override: unknown };
}

function stage(v: Victim): Stage {
  const ev: Ev[] = [];
  const hears: number[] = [];
  const pos = new Vector3(0, 0, 0);
  const controller = { pos, override: null as unknown, speedCap: Infinity, gear: 2, crouched: false, yaw: 0, speed: 0, grounded: true, standUp() {} };
  const knife = {
    shown: false,
    shows: 0,
    show(on: boolean) {
      this.shown = on;
      this.shows++;
    },
  };
  const graph = { kill: null as unknown };
  const rig = { reachL: { x: 0, y: 0, z: 0, w: 0 }, reachR: { x: 0, y: 0, z: 0, w: 0 }, graph };
  const hp = { hp: 100 };
  const g = {
    player: { alive: true, pose: { melee: -1 }, controller, position: pos, rig },
    events: { emit: (n: string, d: Ev) => n === 'takedown' && ev.push({ ...d }) },
    target: { health: hp },
    traversal: { attached: false, hintWindow: null, reset() {} },
    strike: { active: false },
    team: { hangActs: false, hangingDown: false },
    weapons: { drawPhase: 0, knife },
    enemyMgr: { bodies: [], hear: (_p: unknown, r: number) => hears.push(r) },
    stealth: null,
    wallCore: null,
    spottedLocal: false,
    net: null,
    ballistics: { ray: () => ({ hit: false, distance: 0 }), hitDistance: () => 100 },
    takedownVictims: () => [v],
  } as unknown as GameState;
  return { g, td: new TakedownController(g), ev, hears, knife, graph, rig, hp, controller };
}

/** An offer of `kind` on `v` (the plan as the geometry gives it: the attacker steps to the standoff behind / in front). */
function offer(s: Stage, v: Victim, kind: TakedownKind): void {
  const plan: TakedownPlan = { kind, alignX: 0, alignY: 0, alignZ: 0.8 - TAKEDOWN.standoff, faceYaw: 0, approach: TAKEDOWN.approach, arc: 0, strike: TAKEDOWN.strike, victimTo: null };
  s.td.offer = { e: v, plan, lethalOnly: false };
}

/** Steps until the attacker is free (the move and its tail), at most `max`. */
function runOut(s: Stage, max = 600): number {
  let n = 0;
  for (; n < max; n++) {
    s.td.fixedUpdate(DT, false, false);
    if (!s.td.active && s.td.kr < 0 && s.controller.override === null) break;
  }
  return n;
}

const KINDS: readonly TakedownKind[] = ['behind', 'corner', 'front'];

beforeAll(async () => {
  await loadKnifeClips();
  expect(knifeClipsReady()).toBe(true);
});

describe('piano-knife S1: switch off = today', () => {
  for (const kind of KINDS) {
    it(`${kind}: the knockout row and the lethal move, today's events and noise, no knife`, () => {
      for (const lethal of [false, true]) {
        const v = victim(kind === 'front' ? Math.PI : 0, true);
        const s = stage(v);
        offer(s, v, kind);
        s.td.start(lethal);
        expect(s.td.active?.grab).toBeNull();
        runOut(s);
        expect(s.ev.map((e) => [e.phase, e.lethal, e.kind])).toEqual([
          ['start', lethal, kind],
          ['done', lethal, kind],
        ]);
        for (const e of s.ev) expect('knife' in e).toBe(false);
        expect(s.hears).toEqual([lethal ? 3 : 1.2]);
        expect(lethal ? v.killed : v.ko).toBe(true);
        expect(s.knife.shows).toBe(0);
        expect(v.calls).toBe(0);
        expect(s.graph.kill).toBeNull();
        expect(s.td.done.byKind[kind]).toBe(1);
      }
    });
  }
});

describe('piano-knife S1: switch on = the paired knife kill', () => {
  for (const kind of KINDS) {
    it(`${kind}: one press, no grab, lethal at 1.2 m, knife: true, the victim dead, knife away and drives off at the end`, () => {
      const v = victim(kind === 'front' ? Math.PI : 0, true);
      const s = stage(v);
      s.td.setKnifeScene(true);
      offer(s, v, kind);
      s.td.start();
      const a = s.td.active!;
      expect(a.grab).toBeNull();
      expect(a.lethal).toBe(true);
      expect(a.decided).toBe(true);
      expect(s.td.kr).toBe(kind === 'behind' ? 0 : kind === 'corner' ? 2 : 3);
      expect(s.knife.shown).toBe(true);
      let drove = false;
      let melee = false;
      let buckled = 0;
      const R = KNIFE_KILLS[s.td.kr]!;
      for (let n = 0; n < 600 && s.td.active; n++) {
        s.td.fixedUpdate(DT, false, false);
        if (s.graph.kill !== null) drove = true;
        // his clip's phase and buckle as the pure helpers give them (the step writes them out: no boxed numbers)
        if (s.td.kt > 0) {
          expect(v.lastPh).toBeCloseTo(victimPhase(R, s.td.kt / R.seconds), 12);
          expect(v.lastBuckle).toBeCloseTo(buckleAt(s.td.kt - R.contact * R.seconds) * bucklePitchOf(R), 12);
          if (v.lastBuckle !== 0) buckled++;
        }
        if ((s.g.player.pose as { melee: number }).melee !== -1) melee = true;
      }
      expect(drove).toBe(true);
      expect(melee).toBe(false);
      expect(buckled).toBeGreaterThan(5);
      expect(v.killed).toBe(true);
      expect(v.calls).toBeGreaterThan(30);
      expect(s.hears).toEqual([KNIFE.noise]);
      expect(s.ev.map((e) => [e.phase, e.lethal, e.kind, e.knife])).toEqual([
        ['start', true, kind, true],
        ['done', true, kind, true],
      ]);
      expect(s.td.done.byKind.knife).toBe(1);
      // the tail: the attacker held, no offer, the knife still in hand, then free
      expect(s.knife.shown).toBe(true);
      expect(s.controller.override).not.toBeNull();
      runOut(s);
      expect(s.td.offer).toBeNull();
      expect(s.knife.shown).toBe(false);
      expect(s.graph.kill).toBeNull();
      expect(s.controller.override).toBeNull();
      expect([s.rig.reachL.w, s.rig.reachR.w]).toEqual([0, 0]);
    });
  }

  it('the move runs to limp from the clip start (A15 timing): the kill at approach + limp x seconds', () => {
    const v = victim(0, true);
    const s = stage(v);
    s.td.setKnifeScene(true);
    offer(s, v, 'behind');
    s.td.start();
    let n = 0;
    while (s.td.active && n < 600) {
      s.td.fixedUpdate(DT, false, false);
      n++;
    }
    const R = KNIFE_KILLS[0]!;
    expect(n * DT).toBeCloseTo(TAKEDOWN.approach + R.limp * R.seconds, 1);
  });

  it('a victim without knifeVictim: the -1 path (lethal, knife shown, then away)', () => {
    const v = victim(0, false);
    const s = stage(v);
    s.td.setKnifeScene(true);
    offer(s, v, 'behind');
    s.td.start();
    expect(s.td.kr).toBe(-1);
    expect(s.td.active?.grab).toBeNull();
    expect(s.td.active?.lethal).toBe(true);
    expect(s.knife.shown).toBe(true);
    runOut(s);
    expect(v.killed).toBe(true);
    expect(s.ev.map((e) => [e.phase, e.lethal, e.knife])).toEqual([
      ['start', true, true],
      ['done', true, true],
    ]);
    expect(s.knife.shown).toBe(false);
    expect(s.graph.kill).toBeNull();
  });

  it('switch on before the clips resolve: the -1 path', async () => {
    resetKnifeClipsForTest();
    try {
      const v = victim(0, true);
      const s = stage(v);
      s.td.setKnifeScene(true);
      expect(knifeClipsReady()).toBe(false);
      offer(s, v, 'behind');
      s.td.start();
      expect(s.td.kr).toBe(-1);
      expect(s.knife.shown).toBe(true);
      runOut(s);
      expect(v.killed).toBe(true);
      expect(v.calls).toBe(0);
      expect(s.knife.shown).toBe(false);
    } finally {
      await loadKnifeClips();
    }
    expect(knifeClipsReady()).toBe(true);
  });

  it('damage before the stab aborts and releases; after it the kill finishes at once', () => {
    const R = KNIFE_KILLS[0]!;
    const contactSteps = Math.round((TAKEDOWN.approach + R.contact * R.seconds) / DT);
    // before
    {
      const v = victim(0, true);
      const s = stage(v);
      s.td.setKnifeScene(true);
      offer(s, v, 'behind');
      s.td.start();
      for (let n = 0; n < contactSteps - 10; n++) s.td.fixedUpdate(DT, false, false);
      expect(s.td.active).not.toBeNull();
      s.hp.hp -= 10;
      s.td.fixedUpdate(DT, false, false);
      expect(s.td.active).toBeNull();
      expect(v.alive).toBe(true);
      expect(v.taken).toBe(false);
      expect(v.lastClip).toBeNull();
      expect(s.ev.map((e) => [e.phase, e.knife])).toEqual([
        ['start', true],
        ['abort', true],
      ]);
      expect(s.knife.shown).toBe(false);
      expect(s.graph.kill).toBeNull();
      expect(s.controller.override).toBeNull();
      expect([s.rig.reachL.w, s.rig.reachR.w]).toEqual([0, 0]);
      expect(s.td.done.aborted).toBe(1);
    }
    // after
    {
      const v = victim(0, true);
      const s = stage(v);
      s.td.setKnifeScene(true);
      offer(s, v, 'behind');
      s.td.start();
      for (let n = 0; n < contactSteps + 5; n++) s.td.fixedUpdate(DT, false, false);
      expect(s.td.active).not.toBeNull();
      expect(v.alive).toBe(true);
      s.hp.hp -= 10;
      s.td.fixedUpdate(DT, false, false);
      expect(s.td.active).toBeNull();
      expect(v.killed).toBe(true);
      expect(s.ev.map((e) => e.phase)).toEqual(['start', 'done']);
      runOut(s);
      expect(s.knife.shown).toBe(false);
      expect(s.graph.kill).toBeNull();
    }
  });

  it('the switch off again restores today; a quadruped is never a knife kill', () => {
    const v = victim(0, true);
    const s = stage(v);
    s.td.setKnifeScene(true);
    s.td.setKnifeScene(false);
    offer(s, v, 'behind');
    s.td.start(true);
    runOut(s);
    expect(s.hears).toEqual([3]);
    expect(s.knife.shows).toBe(0);
    expect('knife' in s.ev[0]!).toBe(false);
    const d = victim(0, true);
    (d as { def: unknown }).def = { quadruped: true, kind: 'dog' };
    const s2 = stage(d);
    s2.td.setKnifeScene(true);
    offer(s2, d, 'behind');
    s2.td.start(true);
    expect(s2.td.kr).toBe(-1);
    expect(s2.knife.shows).toBe(0);
    runOut(s2);
    expect('knife' in s2.ev[0]!).toBe(false);
  });
});
