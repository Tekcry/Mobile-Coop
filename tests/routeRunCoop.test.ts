import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import * as C from '../scripts/route-run/coop.mjs';
// @ts-expect-error plain .mjs tool script without types
import * as S from '../scripts/route-run/steps.mjs';
// @ts-expect-error plain .mjs tool script without types
import { PageDriver, runOne } from '../scripts/route-run/driver.mjs';
// @ts-expect-error plain .mjs tool script without types
import { PairDriver } from '../scripts/route-run/pair.mjs';
// @ts-expect-error plain .mjs tool script without types
import { paceFor } from '../scripts/route-run/progress.mjs';
// @ts-expect-error plain .mjs tool script without types
import { COOP_KINDS } from '../scripts/level-validate.mjs';

// Route-runs R9 (docs/route-runs/PLAN.md "R9 Real co-op moves"): the co-op machine on a scripted pair (the leg-up, the
// relay, the stops), and coop.mjs through runOne on two fake pages in a Node vm (as tests/routeRunSeams.test.ts): a
// boost walked, a human ladder walked, a leg-up with no lip a step-timeout, a course restart mid-move, the stub
// fallbacks. The real two-page selftest (selftest-coop.graph.json) is a laptop run.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const pace = paceFor('sneak', metrics);

const hook = vi.hoisted(() => ({ onPoll: null as any, onRestart: null as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
vi.mock('../scripts/route-run/course.mjs', async (orig) => {
  const real = await orig<Obj>();
  return { ...real, onPoll: (...a: unknown[]) => hook.onPoll(...a), onRestart: (...a: unknown[]) => hook.onRestart(...a), onRunEnd: async () => {} };
});
beforeEach(() => {
  hook.onPoll = vi.fn(async () => {});
  hook.onRestart = vi.fn(async () => null);
});

class V {
  constructor(public x: number, public y: number, public z: number) {}
}

/** One robot's game state as the team sim and the pages read it. */
function bot(x: number, z: number) {
  const pos = new V(x, 0, z);
  const b: Obj = {
    pos,
    axes: [0, 0, 0, 0],
    buttons: Array(17).fill(0),
    prev: Array(17).fill(0),
    c: { crouched: true, crouchIntent: true, grounded: true, speed: 0, yaw: 0, clearCrouchToggle() { b.c.crouchIntent = false; b.c.crouched = false; }, teleport(v: V) { pos.x = v.x; pos.y = v.y; pos.z = v.z; } },
    tr: { attached: false, attach: { phase: null, anchor: null }, reset() { b.tr.attached = false; b.tr.attach = { phase: null, anchor: null }; } },
    team: { state: 'none', offer: null, count: { boosts: 0, ladders: 0 }, ends: 0, end() { b.team.state = 'none'; b.team.offer = null; b.team.ends++; } },
  };
  return b;
}

const hang = (b: Obj, id: number) => {
  b.tr.attached = true;
  b.tr.attach = { phase: 'on', anchor: { kind: 'ledge', id } };
  b.pos.y = 2.4;
  b.c.grounded = false;
};

/** The game's team moves as the suites see them (one fixed step): B toggles the crouch, a crouched follower's RB offers,
 *  the leader within 1.2 m is offered the boost (a target only with `lip`) and takes it with RB (hangs on lip 7), a
 *  hanging leader's RB offers the relay, the follower's RB climbs it, Y on a lip pulls up onto the 4.4 m top. */
function teamSim(L: Obj, F: Obj, lip: boolean) {
  const d = Math.hypot(L.pos.x - F.pos.x, L.pos.z - F.pos.z);
  const edge = (b: Obj, i: number) => !!b.buttons[i] && !b.prev[i];
  for (const b of [L, F]) {
    if (edge(b, 1)) {
      b.c.crouchIntent = !b.c.crouchIntent;
      b.c.crouched = b.c.crouchIntent;
    }
  }
  if (edge(F, 5) && F.c.crouched && F.team.state === 'none' && !F.tr.attached && !F.team.offer) F.team.state = 'offer';
  L.team.offer = F.team.state === 'offer' && d < 1.2 && !L.tr.attached ? { boost: lip ? { anchor: { id: 7 } } : null, relay: false } : null;
  if (edge(L, 5) && L.team.offer?.boost) {
    L.team.count.boosts++;
    hang(L, 7);
    F.team.state = 'none';
  } else if (edge(L, 5) && L.tr.attached && L.team.state === 'none') L.team.state = 'relayOffer';
  F.team.offer = L.team.state === 'relayOffer' && !F.tr.attached && d < 1.6 ? { boost: null, relay: true } : null;
  if (edge(F, 5) && F.team.offer?.relay) {
    F.team.count.ladders++;
    hang(F, 7);
    L.team.state = 'none';
  }
  for (const b of [L, F]) {
    if (b.buttons[3] && b.tr.attached) {
      b.tr.reset();
      b.pos.y = 4.4;
      b.pos.z += 0.5;
      b.c.grounded = true;
    }
    for (let i = 0; i < 17; i++) b.prev[i] = b.buttons[i];
  }
}

/** A robot's own walk (not while hanging or offering). */
function move(b: Obj, dt: number) {
  const m = Math.hypot(b.axes[0], b.axes[1]);
  if (m > 0.1 && !b.tr.attached && b.team.state !== 'offer') {
    b.pos.x += (b.axes[0] / m) * pace.speed * dt;
    b.pos.z += (-b.axes[1] / m) * pace.speed * dt;
  }
}

const reading = (b: Obj, t: number) => ({
  t, x: b.pos.x, y: b.pos.y, z: b.pos.z, camYaw: 0, grounded: b.c.grounded, crouched: b.c.crouched, attached: b.tr.attached,
  akind: b.tr.attach.anchor?.kind ?? null, aphase: b.tr.attach.phase, aid: b.tr.attach.anchor?.id ?? null, team: b.team.state,
  offerAny: !!b.team.offer, offerBoost: !!b.team.offer?.boost, offerRelay: !!b.team.offer?.relay, boosts: b.team.count.boosts, ladders: b.team.count.ladders,
});

/** The machine alone on the scripted pair (0.2 s polls, as the pair's lockstep tick): its result and each poll's pads. */
function runMachine(kind: string, { lip = true, toY = 4.4 } = {}) {
  const L = bot(0, 4);
  const F = bot(1, 4);
  for (const b of [L, F]) b.c.clearCrouchToggle();
  const m = new C.CoopMachine(kind, C.coopGeometry({ at: [0, 0, 4], past: [0, 4.4, 5.2] }, toY));
  const pads: { phase: string; lead: number; follow: number }[] = [];
  for (let t = 0; t < 200; t += 0.2) {
    // (the phase the poll acted in: a poll whose phase moves on lets every button go)
    const phase = m.phase;
    const o = m.update(reading(L, t), reading(F, t), t);
    if (o.done) return { res: o.result, pads, L, F };
    pads.push({ phase, lead: o.lead.mask, follow: o.follow.mask });
    [L.axes[0], L.axes[1], F.axes[0], F.axes[1]] = [o.lead.stick[0], -o.lead.stick[1], o.follow.stick[0], -o.follow.stick[1]];
    for (const [b, mask] of [[L, o.lead.mask], [F, o.follow.mask]] as [Obj, number][]) for (let i = 0; i < 17; i++) b.buttons[i] = (mask >> i) & 1;
    move(L, 0.2);
    move(F, 0.2);
    teamSim(L, F, lip);
  }
  throw new Error('the machine never finished');
}

const bit = (b: number) => 1 << b;

describe('R9: the co-op machine on a scripted pair', () => {
  it('coop_boost: the leader steps back, the follower in, crouch (B) and offer (RB), the leader takes (RB), hangs and pulls up (Y): walked', () => {
    const { res, pads, L, F } = runMachine('coop_boost');
    expect(res).toMatchObject({ outcome: 'walked', phase: 'done', robot: 'leader' });
    const firstOf = (p: string) => pads.find((x) => x.phase === p);
    expect(firstOf('crouch')).toMatchObject({ follow: bit(C.PAD.B), lead: 0 });
    expect(firstOf('offer')).toMatchObject({ follow: bit(C.PAD.RB), lead: 0 });
    expect(firstOf('boost')).toMatchObject({ lead: bit(C.PAD.RB), follow: 0 });
    expect(firstOf('pullLead')).toMatchObject({ lead: bit(C.PAD.Y), follow: 0 });
    // the phases in order, and only the leader went up (the boost's follower is placed by the step, not here)
    const seen = pads.map((x) => x.phase).filter((p, i, a) => a[i - 1] !== p);
    expect(seen.filter((p) => C.PHASES.coop_boost.includes(p))).toEqual(seen);
    expect([L.pos.y, F.pos.y, L.team.count.boosts]).toEqual([4.4, 0, 1]);
  });

  it('human_ladder: the leg-up, the relay (the leader RB, the follower RB), then both pull up: walked', () => {
    const { res, pads, L, F } = runMachine('human_ladder');
    expect(res).toMatchObject({ outcome: 'walked', phase: 'done' });
    expect(pads.find((x) => x.phase === 'relayOffer')).toMatchObject({ lead: bit(C.PAD.RB) });
    expect(pads.find((x) => x.phase === 'relayTake')).toMatchObject({ follow: bit(C.PAD.RB) });
    expect(pads.find((x) => x.phase === 'pullFollow')).toMatchObject({ follow: bit(C.PAD.Y) });
    expect([L.pos.y, F.pos.y, F.team.count.ladders]).toEqual([4.4, 4.4, 1]);
  });

  it('a leg-up with no lip in reach is a step-timeout at the take, its cap the limit, the leader named', () => {
    const { res } = runMachine('coop_boost', { lip: false });
    expect(res).toMatchObject({ outcome: 'step-timeout', phase: 'take', why: 'no lip in reach of the leg-up', limit_s: 8, robot: 'leader' });
  });

  it('a leader that pulls up short of the far floor is a stop at the top', () => {
    const { res } = runMachine('coop_boost', { toY: 9 });
    expect(res).toMatchObject({ outcome: 'step-timeout', phase: 'top', why: 'the leader is not on the far floor', robot: 'leader' });
  });

  it('no offer seen at all says so; the geometry needs a point and a far point', () => {
    const m = new C.CoopMachine('coop_boost', C.coopGeometry({ at: [0, 0, 0], past: [0, 4.4, 1] }, 4.4));
    m.phase = 'take';
    m.i = C.PHASES.coop_boost.indexOf('take');
    const r = reading(bot(0, -0.8), 0);
    const f = { ...reading(bot(0, 0), 0), team: 'offer' };
    let o = m.update(r, f, 0);
    for (let t = 0.2; !o.done; t += 0.2) o = m.update(r, f, t);
    expect(o.result).toMatchObject({ phase: 'take', why: 'the climber was not offered the leg-up' });
    expect([C.coopGeometry({ at: [0, 0, 0] }), C.coopGeometry({ past: [0, 0, 0] }), C.coopGeometry({ at: [1, 0, 1], past: [1, 4, 1] })]).toEqual([null, null, null]);
  });
});

describe('R9: the co-op kinds in steps.mjs', () => {
  it('coop_boost and human_ladder go to coop.mjs; every other co-op kind stays A1 stub, listed', () => {
    expect(S.stepFor({ kind: 'coop_boost', action: 'stub' })).toBe(C.coopBoost);
    expect(S.stepFor({ kind: 'human_ladder', action: 'stub' })).toBe(C.humanLadder);
    for (const k of C.STUB_KINDS) expect(S.stepFor({ kind: k, action: 'stub' }), k).toBe(S.stub);
    expect(new Set([...C.REAL_KINDS, ...C.STUB_KINDS])).toEqual(COOP_KINDS);
    for (const k of ['team_pull', 'shutter', 'pair_gate', 'team_rope', 'plank_bridge', 'deadweight', 'chimney_pair', 'swing_pass', 'drop_catch']) expect(C.STUB_KINDS).toContain(k);
  });

  it('real only with the pair together, a clock advance, and no stub request', () => {
    const pairCtx = { client: {}, pair: {}, advance: () => {} };
    expect(C.realHere(pairCtx)).toBe(true);
    expect(C.realHere({ ...pairCtx, robot: 'leader' })).toBe(false);
    expect(C.realHere({ ...pairCtx, client: null })).toBe(false);
    expect(C.realHere({ ...pairCtx, coop: 'stub' })).toBe(false);
    expect(C.realHere({ ...pairCtx, selftest: { coop: 'stub' } })).toBe(false);
    expect(C.realHere({ ...pairCtx, advance: undefined })).toBe(false);
  });
});

// -------------------------------------------------------------------------------------------------------------------
// Two fake pages (the pair driver, runOne)
// -------------------------------------------------------------------------------------------------------------------

/** A flat fake page for robot `b` (as routeRunSeams' fake game); the host page's step runs the team sim for both. */
function fakePage(b: Obj, sim: (() => void) | null) {
  const game: Obj = {
    time: 0,
    player: { position: b.pos, cam: { yaw: 0 }, controller: b.c },
    traversal: b.tr,
    team: b.team,
    nav: { findPath: (_a: number[], to: number[]) => [[to[0], to[1]]], heightAt: () => NaN, cellOf: () => 1, isWalkable: () => true, nearestWalkable: () => -1, centerInto: (_k: number, o: number[]) => o, cellHeight: () => 0 },
    world: { doors: { nearest: () => null }, map: { sectors: [] } },
    enemyMgr: { enemies: [{ id: 'e1', def: { kind: 'rifle' }, pos: new V(200, 0, 200), yaw: 0, alive: true, level: 'unaware', aware: { set() {} } }], hear() {}, resetAlarm() {} },
    target: { damageMul: 1 },
    restartCheckpoint: () => true,
  };
  const step = (dt: number) => {
    move(b, dt);
    if (sim) sim();
    game.time += dt;
  };
  const window: Obj = { __app: { current: game, loop: { manual: false, stepHeadless: step } }, __pad: { connect() {}, set(i: number, v: number) { b.buttons[i] = v; }, axis(i: number, v: number) { b.axes[i] = v; } } };
  const calls: string[] = [];
  const vctx = vm.createContext({ window, Math, Float64Array, Array, Map });
  const page = {
    async evaluate(fn: unknown, arg?: unknown) {
      if (Array.isArray(arg) && typeof arg[0] === 'string') calls.push(arg[0]);
      const r = typeof fn === 'string' ? vm.runInContext(fn, vctx) : vm.runInContext(`(${String(fn)})(${JSON.stringify(arg)})`, vctx);
      return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
    },
    async screenshot() {},
  };
  return { game, page, calls };
}

async function pairRun(kind: string, { lip = true, coop = undefined as string | undefined, prep = null as ((ctx: Obj, A: { calls: string[] }) => void) | null, end = [0, 4.4, 7] } = {}) {
  const L = bot(0, 0);
  const F = bot(0, -2);
  const A = fakePage(L, () => teamSim(L, F, lip));
  const B = fakePage(F, null);
  A.game.net = { remotes: new Map([['c', { feet: F.pos, ref: { crouched: false, speed: 0 }, state: {}, damageMul: 1, allowTeleport() {} }]]) };
  B.game.net = { avatars: new Map([['h', { pos: L.pos }]]) };
  const [host, client] = [new PageDriver(A.page, { pace, forgive: true, points: null }), new PageDriver(B.page, { pace, forgive: true, points: null, role: 'follower' })];
  await host.install();
  await client.install();
  const pair = new PairDriver(host, client, { points: null, notes: [] });
  const ctx: Obj = { host: A.page, client: B.page, driver: pair, pair, shots: null, players: 2, notes: pair.notes, advance: (s: number) => pair.advance(s), stick: pace.stick, ...(coop ? { coop } : {}) };
  prep?.(ctx, A);
  const run = {
    id: 'c', section: null, steps: [
      { type: 'walk', to: [0, 0, 4], space: 'near', link: 17 },
      { type: 'link', index: 17, kind, action: 'stub', from: 'near', to: 'far', at: [0, 0, 4], past: [0, 4.4, 5.2], limit_s: null, hold_s: 6 },
      { type: 'walk', to: end, space: 'far', link: null },
    ],
  };
  const log = await runOne(ctx, run);
  return { log, L, F, A, B, ctx };
}

describe('R9: co-op moves through runOne on two fake pages', () => {
  it('coop_boost: walked (counted), no stub, no stop; the follower placed beside the far spot and noted', async () => {
    const { log, L, F, B, ctx } = await pairRun('coop_boost');
    expect(log.deadStops).toEqual([]);
    expect(log.stubs).toEqual([]);
    expect(log.links).toEqual([{ index: 17, kind: 'coop_boost', outcome: 'walked' }]);
    expect(log.walkedLinks).toBe(1);
    expect(L.team.count.boosts).toBe(1);
    expect(B.calls).toContain('place');
    expect(F.pos.y).toBeCloseTo(4.4, 5);
    expect(L.pos.z).toBeGreaterThan(6);
    expect(ctx.notes.some((n: string) => n.startsWith('link 17 (coop_boost): the leg-up lifted the leader'))).toBe(true);
  });

  it('human_ladder: walked by both robots, the follower never placed', async () => {
    const { log, L, F, B } = await pairRun('human_ladder');
    expect([log.deadStops, log.stubs]).toEqual([[], []]);
    expect(log.links).toEqual([{ index: 17, kind: 'human_ladder', outcome: 'walked' }]);
    expect([L.team.count.boosts, F.team.count.ladders]).toEqual([1, 1]);
    expect(B.calls).not.toContain('place');
    expect(F.pos.y).toBeCloseTo(4.4, 5);
  });

  it('a leg-up with no lip: a step-timeout stop on the link (phase take, its cap), both pages aborted, both placed past', async () => {
    const { log, A, B, L } = await pairRun('coop_boost', { lip: false });
    expect(log.deadStops.map((d: Obj) => [d.robot, d.class, d.link, d.phase, d.limit_s])).toEqual([['leader', 'step-timeout', 17, 'take', 8]]);
    expect(log.links).toEqual([{ index: 17, kind: 'coop_boost', outcome: 'step-timeout' }]);
    expect(log.walkedLinks).toBe(0);
    expect([A.calls.includes('abort'), B.calls.includes('abort')]).toEqual([true, true]);
    expect(A.calls).toContain('place');
    expect(L.pos.z).toBeGreaterThan(6);
  });

  it('a course restart mid-move: outcome course, onRestart once, no stop, no placement past, the follower never interrupted', async () => {
    // the course hook interrupts at the first poll after the host page's first co-op input
    let fired = false;
    let hostCalls: string[] = [];
    hook.onPoll = vi.fn(async (ctx: Obj) => {
      if (!fired && hostCalls.includes('input')) {
        fired = true;
        await ctx.driver.call('interrupt');
      }
    });
    hook.onRestart = vi.fn(async () => ({ resume: 2, place: null }));
    const r = await pairRun('coop_boost', { prep: (_c, A) => (hostCalls = A.calls), end: [0, 0, 1] });
    expect(hook.onRestart).toHaveBeenCalledTimes(1);
    expect(hook.onRestart.mock.calls[0][3]).toBe(1);
    expect([r.log.deadStops, r.log.links, r.log.stubs]).toEqual([[], [], []]);
    expect(r.A.calls).toContain('abort');
    expect(r.A.calls).not.toContain('place');
    expect(r.B.calls).not.toContain('interrupt');
    expect(r.L.team.count.boosts).toBe(0);
    expect(r.ctx.pair.host.courseHit).toBe(null);
  });

  it('stub fallbacks: a pair asked for stubs (ctx.coop), one robot: A1 stub held and placed, as before R9', async () => {
    const { log, L } = await pairRun('coop_boost', { coop: 'stub' });
    expect(log.stubs).toEqual([{ link: 17, kind: 'coop_boost', hold_s: 6, why: S.STUB_WHY_COOP, robots: ['leader', 'follower'] }]);
    expect([log.walkedLinks, L.team.count.boosts]).toEqual([0, 0]);
    const one = bot(0, 0);
    const P = fakePage(one, null);
    const d = new PageDriver(P.page, { pace, forgive: true, points: null });
    await d.install();
    const r = await C.coopBoost({ host: P.page, client: null, driver: d, notes: [], advance: (s: number) => d.advance(s) }, { index: 17, kind: 'coop_boost', at: [0, 0, 4], past: [0, 4.4, 5.2], hold_s: 6 });
    expect(r).toEqual({ outcome: 'stub', stub: { link: 17, kind: 'coop_boost', hold_s: 6, why: S.STUB_WHY_COOP } });
  });
});
