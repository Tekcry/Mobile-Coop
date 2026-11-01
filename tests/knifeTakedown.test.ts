// (piano-knife S1; knife-kills) The takedown controller's paired knife kill on a fake game (as
// `tests/hangDownTakedown.test.ts`): on every map the lethal start (`start(true)`, a lethal-only offer) on a guard on two
// legs from a kind with a row is the knife kill (1.2 m, `knife: true`, the victim dead, the drives played); the knockout,
// the grab and the kinds without a row are today's; a victim without `knifeVictim` and clips not yet loaded fall back to
// the classic lethal move; damage before the stab aborts, after it finishes; at the end the knife is away and both drives
// are off. No scene-only rules (no forced lethal, no grab suppression, no knife on an alert guard who knows).
import { beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { TAKEDOWN, type TakedownKind, type TakedownPlan } from '../src/game/takedown';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import type { GameState } from '../src/game/gameState';
import { attackerPhase, bucklePitchOf, buckleAt, KNIFE, KNIFE_KILLS, knifeClipsReady, loadKnifeClips, resetKnifeClipsForTest, victimPhase } from '../src/game/knifeKill';

const DT = 1 / 60;

type Ev = Record<string, unknown> & { phase: string; lethal: boolean; kind: string };
interface Victim extends TakedownVictim {
  killed: boolean;
  ko: boolean;
  calls: number;
  lastClip: unknown;
  lastPh: number;
  lastBuckle: number;
  /** `beginTakedown`'s choke argument, and whether the controller's knife kill was already on at that call. */
  chokes: boolean[];
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
    chokes: [],
    def: { quadruped: false, kind: 'grunt' } as unknown as TakedownVictim['def'],
    alerted: false,
    level: 'unaware' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown(choke: boolean) {
      this.taken = true;
      this.chokes.push(choke);
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
function offer(s: Stage, v: Victim, kind: TakedownKind, lethalOnly = false): void {
  const plan: TakedownPlan = { kind, alignX: 0, alignY: 0, alignZ: 0.8 - TAKEDOWN.standoff, faceYaw: 0, approach: TAKEDOWN.approach, arc: 0, strike: TAKEDOWN.strike, victimTo: null };
  s.td.offer = { e: v, plan, lethalOnly };
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

describe('knife-kills: the knockout stays today', () => {
  for (const kind of KINDS) {
    it(`${kind}: start(false) is the knockout, today's events and noise, no knife`, () => {
      const v = victim(kind === 'front' ? Math.PI : 0, true);
      const s = stage(v);
      offer(s, v, kind);
      s.td.start(false);
      expect(s.td.active?.grab).toBeNull();
      expect(s.td.kr).toBe(-1);
      runOut(s);
      expect(s.ev.map((e) => [e.phase, e.lethal, e.kind])).toEqual([
        ['start', false, kind],
        ['done', false, kind],
      ]);
      for (const e of s.ev) expect('knife' in e).toBe(false);
      expect(s.hears).toEqual([1.2]);
      expect(v.ko).toBe(true);
      expect(s.knife.shows).toBe(0);
      expect(v.calls).toBe(0);
      expect(s.graph.kill).toBeNull();
      expect(s.td.done.byKind[kind]).toBe(1);
    });
  }

  it('from behind with no choice made: the grab (no knife), as today', () => {
    const v = victim(0, true);
    const s = stage(v);
    offer(s, v, 'behind');
    s.td.start();
    expect(s.td.active?.grab).not.toBeNull();
    expect(s.td.active?.lethal).toBe(false);
    expect(s.td.kr).toBe(-1);
    expect(s.knife.shows).toBe(0);
  });
});

describe('knife-kills: the lethal takedown is the paired knife kill', () => {
  for (const kind of KINDS) {
    it(`${kind}: start(true), lethal at 1.2 m, knife: true, the victim dead, knife away and drives off at the end`, () => {
      const v = victim(kind === 'front' ? Math.PI : 0, true);
      const s = stage(v);
      offer(s, v, kind);
      s.td.start(true);
      const a = s.td.active!;
      expect(a.grab).toBeNull();
      expect(a.lethal).toBe(true);
      expect(a.decided).toBe(true);
      expect(s.td.kr).toBe(kind === 'behind' ? 0 : kind === 'corner' ? 2 : 3);
      expect(s.knife.shown).toBe(true);
      // the lethal struggle (never a choke)
      expect(v.chokes).toEqual([false]);
      let drove = false;
      let melee = false;
      let buckled = 0;
      const R = KNIFE_KILLS[s.td.kr]!;
      for (let n = 0; n < 600 && s.td.active; n++) {
        s.td.fixedUpdate(DT, false, false);
        if (s.graph.kill !== null) drove = true;
        // (S2) her clip's window at its own speed (`attackerPhase`), written out by the step
        if (s.td.kt > 0) expect((s.graph.kill as { phase: number }).phase).toBeCloseTo(attackerPhase(R, s.td.kt / R.seconds), 12);
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
      // a kill (the rating counts `done.lethal`), by kind `knife`
      expect(s.td.done.lethal).toBe(1);
      expect(s.td.done.byKind.knife).toBe(1);
      // the tail: the attacker held, no offer, the knife still in hand, then free
      expect(s.knife.shown).toBe(true);
      expect(s.controller.override).not.toBeNull();
      // (S2, S1 checker polish 1) `active` is null in the tail but the takedown still owns her (`busy`: gameState keeps
      // the gun stowed and traversal off)
      expect(s.td.active).toBeNull();
      expect(s.td.busy).toBe(true);
      runOut(s);
      expect(s.td.busy).toBe(false);
      expect(s.td.offer).toBeNull();
      expect(s.knife.shown).toBe(false);
      expect(s.graph.kill).toBeNull();
      expect(s.controller.override).toBeNull();
      expect([s.rig.reachL.w, s.rig.reachR.w]).toEqual([0, 0]);
    });
  }

  it('the knife kill is on before the victim is seized (a co-op puppet tells the host at `beginTakedown`)', () => {
    const v = victim(0, true);
    const s = stage(v);
    let onAtSeize: boolean | null = null;
    const begin = v.beginTakedown.bind(v);
    v.beginTakedown = (choke: boolean, delay?: number) => {
      onAtSeize = s.td.knifeOn;
      begin(choke, delay);
    };
    offer(s, v, 'behind');
    s.td.start(true);
    expect(onAtSeize).toBe(true);
  });

  it('a lethal-only offer started with no choice: the knife kill; forced non-lethal: no knife', () => {
    for (const lethal of [undefined, false] as const) {
      const v = victim(Math.PI, true);
      const s = stage(v);
      offer(s, v, 'front', true);
      s.td.start(lethal);
      expect(s.td.kr, String(lethal)).toBe(lethal === undefined ? 3 : -1);
      expect(s.knife.shown).toBe(lethal === undefined);
    }
  });

  it('the move runs to limp from the clip start (A15 timing): the kill at approach + limp x seconds', () => {
    const v = victim(0, true);
    const s = stage(v);
    offer(s, v, 'behind');
    s.td.start(true);
    let n = 0;
    while (s.td.active && n < 600) {
      s.td.fixedUpdate(DT, false, false);
      n++;
    }
    const R = KNIFE_KILLS[0]!;
    expect(n * DT).toBeCloseTo(TAKEDOWN.approach + R.limp * R.seconds, 1);
  });

  it('no row: a victim without knifeVictim, a kind without a row, a dog: the classic lethal move, no knife', () => {
    const cases: [Victim, TakedownKind][] = [[victim(0, false), 'behind'], [victim(0, true), 'drop'], [victim(0, true), 'below']];
    const dog = victim(0, true);
    (dog as { def: unknown }).def = { quadruped: true, kind: 'dog' };
    cases.push([dog, 'behind']);
    for (const [v, kind] of cases) {
      const s = stage(v);
      offer(s, v, kind);
      s.td.start(true);
      expect(s.td.kr, kind).toBe(-1);
      expect(s.td.active?.lethal).toBe(true);
      expect(s.knife.shows).toBe(0);
      runOut(s);
      expect(v.killed, kind).toBe(true);
      expect(s.hears).toEqual([3]);
      expect('knife' in s.ev[0]!).toBe(false);
      expect(s.graph.kill).toBeNull();
    }
  });

  it('before the clips resolve: the classic lethal move', async () => {
    resetKnifeClipsForTest();
    try {
      const v = victim(0, true);
      const s = stage(v);
      expect(knifeClipsReady()).toBe(false);
      offer(s, v, 'behind');
      s.td.start(true);
      expect(s.td.kr).toBe(-1);
      expect(s.knife.shows).toBe(0);
      runOut(s);
      expect(v.killed).toBe(true);
      expect(v.calls).toBe(0);
      expect(s.hears).toEqual([3]);
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
      offer(s, v, 'behind');
      s.td.start(true);
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
      offer(s, v, 'behind');
      s.td.start(true);
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
});

// (piano-knife S3, S1 CHECK-A polish 2 / CHECK-B 4) the side kill: the row by his facing, the grab from his real facing
describe('piano-knife S3: the side kill', () => {
  const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

  it('starts from his real facing; his back towards her is row 0 (crouched 1), facing her row 3', () => {
    for (const [yaw, crouched, row] of [
      [0, false, 0],
      [0.6, true, 1],
      [Math.PI, false, 3],
      [-2.2, false, 3],
    ] as const) {
      const v = victim(yaw, true);
      const s = stage(v);
      (s.controller as unknown as { crouched: boolean }).crouched = crouched;
      offer(s, v, 'side');
      s.td.start(true);
      expect(s.td.kr, `yaw ${yaw}`).toBe(row);
      expect((s.td as unknown as { kFromYaw: number }).kFromYaw).toBe(yaw);
    }
  });

  it('turns him at most 90 degrees over the grab', () => {
    for (const yaw0 of [0, 0.4, 1.2, Math.PI / 2, 2, -1.4, -Math.PI / 2, Math.PI]) {
      const v = victim(yaw0, true);
      const s = stage(v);
      offer(s, v, 'side');
      s.td.start(true);
      let turn = 0;
      for (let n = 0; n < 600 && s.td.active; n++) {
        s.td.fixedUpdate(DT, false, false);
        turn = Math.max(turn, Math.abs(wrap(v.yaw - yaw0)));
      }
      expect(turn, `yaw ${yaw0}`).toBeLessThanOrEqual(Math.PI / 2 + 1e-6);
      expect(v.killed).toBe(true);
    }
  });
});

// (piano-knife S3, S2 CHECK polish 2 / 3) the knife tail (`active` null) still owns her at the remaining gates
describe('piano-knife S3: busy through the tail at the gates', () => {
  it('teamController offers no co-op move while the knife tail runs', async () => {
    const { TeamController } = await import('../src/game/teamController');
    const v = victim(0, true);
    const s = stage(v);
    offer(s, v, 'behind');
    s.td.start(true);
    for (let n = 0; n < 600 && s.td.active; n++) s.td.fixedUpdate(DT, false, false);
    expect(s.td.active).toBeNull();
    expect(s.td.busy).toBe(true);
    const mate = { id: 'P2', pos: new Vector3(0.5, 0, 0) };
    const g = { takedown: s.td, strike: { active: false }, net: { teamMates: () => [mate] }, player: { controller: s.controller } } as unknown as GameState;
    const tc = new TeamController(g);
    expect((tc as unknown as { idle(p: boolean): boolean }).idle(true)).toBe(false);
    expect(tc.offer).toBeNull();
  });
});

describe('knife-kills: no knife-when-spotted', () => {
  it('a guard who has seen her and is alert is not on offer (today, the scene rule is gone)', () => {
    const v = victim(0, true);
    (v as { alerted: boolean }).alerted = true;
    (v as { level: string }).level = 'alert';
    const s = stage(v);
    (s.g as unknown as { spottedLocal: boolean }).spottedLocal = true;
    for (let n = 0; n < 10; n++) s.td.fixedUpdate(DT, false, false);
    expect(s.td.offer).toBeNull();
  });
});
