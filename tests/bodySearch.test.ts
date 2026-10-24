import { describe, expect, it } from 'vitest';
import { ALERT, AlertMachine, emptyAlertInput } from '../src/ai/alertState';
import { PATROL, searchPoint } from '../src/ai/patrol';
import { BODY_SEARCH } from '../src/ai/gear';
import { ringPoint, SEARCH_BODY, SEARCH_DEVICE, SEARCH_PLAIN, searchCoverage, searchSpec, type SearchCover } from '../src/ai/response';
import { P_STANDARD } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';
import type { Enemy } from '../src/ai/enemy';

// (guard-ai S18, Michael's walk of 4.72 G2: "guards investigating dead bodies give up too easily.") A dead body found
// gives the finders a longer search than a plain one (ALERT.searchTime x BODY_SEARCH.timeMul), over more points and a
// wider radius round the body, before the held caution.

const cover = (): SearchCover => ({ points: 0, reach: 0 });

describe('the search table (response.ts)', () => {
  it('a body search is ALERT.searchTime x BODY_SEARCH.timeMul, wider and denser than the plain one', () => {
    const plain = searchSpec(SEARCH_PLAIN);
    const body = searchSpec(SEARCH_BODY);
    expect(plain.time).toBe(ALERT.searchTime);
    expect(body.time).toBe(ALERT.searchTime * BODY_SEARCH.timeMul);
    expect(body.time).toBeGreaterThan(plain.time);
    expect(body.max).toBeGreaterThan(plain.max);
    expect(body.step).toBeLessThan(plain.step);
    // a device's search (S17) keeps the plain numbers (its room bounds it); an unknown kind is plain
    expect(searchSpec(SEARCH_DEVICE)).toEqual(plain);
    expect(searchSpec(99)).toBe(plain);
  });

  it("the plain ring is patrol.ts searchPoint exactly (nothing changes for a call's or a pair's search)", () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 0];
    for (let k = 0; k < 12; k++) {
      for (let slot = 0; slot < 3; slot++) {
        searchPoint(3, -4, k, slot, a);
        ringPoint(3, -4, k, slot, searchSpec(SEARCH_PLAIN), b);
        expect(b[0]).toBeCloseTo(a[0], 9);
        expect(b[1]).toBeCloseTo(a[1], 9);
      }
    }
    expect(searchSpec(SEARCH_PLAIN).max).toBe(PATROL.searchMax);
  });

  it('at a calm search pace a body search covers more points, further out, than a plain search (or a noise check)', () => {
    // a grunt (walk 0.9) at the search pace (0.75)
    const v = 0.9 * 0.75;
    const p = searchCoverage(searchSpec(SEARCH_PLAIN), v, cover());
    const b = searchCoverage(searchSpec(SEARCH_BODY), v, cover());
    expect(b.points).toBeGreaterThanOrEqual(2 * p.points);
    expect(b.reach).toBeGreaterThan(p.reach + 3);
    expect(b.reach).toBeLessThanOrEqual(BODY_SEARCH.max + 1e-9);
    // a noise check is one look at one spot (ALERT.investigateLook) and is over in ALERT.investigateMax at most
    expect(searchSpec(SEARCH_BODY).time).toBeGreaterThan(ALERT.investigateMax * 5);
  });
});

describe('AlertMachine: a search lasts its searchFor', () => {
  function searchFor(sf: number | undefined): number {
    const m = new AlertMachine();
    const i = emptyAlertInput();
    i.searchFor = sf;
    i.search = true;
    m.step(0.1, i);
    i.search = false;
    expect(m.level).toBe('searching');
    let t = 0;
    while (m.level === 'searching' && t < 1000) {
      m.step(0.1, i);
      t += 0.1;
    }
    return t;
  }
  it('a body search ends after its own length, a plain one (absent / 0) after ALERT.searchTime', () => {
    expect(searchFor(searchSpec(SEARCH_BODY).time)).toBeCloseTo(searchSpec(SEARCH_BODY).time, 0);
    expect(searchFor(undefined)).toBeCloseTo(ALERT.searchTime, 0);
    expect(searchFor(0)).toBeCloseTo(ALERT.searchTime, 0);
  });
});

// ----- on the real Enemy code: the finder's search round a dead body vs a plain search -----

type Goal = { point: [number, number] | null; speed: number; face: number | null };
type Searcher = {
  bodySearch(x: number, z: number): void;
  searchAt(x: number, z: number, revive: null): void;
  updateAwareness(dt: number): void;
  calmDecide(dt: number): Goal;
  stepCamBody(dt: number): void;
  aware: AlertMachine;
  pos: Vector3;
  caution: number;
  camBody: unknown;
  searchKind: number;
  searchReq: boolean;
};

async function searcher(): Promise<Searcher> {
  const { Enemy: EnemyClass } = await import('../src/ai/enemy');
  const e = Object.assign(Object.create(EnemyClass.prototype) as Enemy, {
    aware: new AlertMachine(),
    alertIn: emptyAlertInput(),
    health: { alive: true },
    passive: false,
    taken: false,
    los: false,
    smelled: false,
    rate: 0,
    meter: 0,
    sinceSeen: 99,
    called: 0,
    heard: false,
    gunfire: false,
    alarm: null,
    state: 'idle',
    incident: -1,
    incMode: 0,
    incCalm: false,
    turnT: 0,
    caution: 0,
    responder: false,
    tacticsProfile: P_STANDARD,
    brkGroup: -1,
    stimulus: [0, 0],
    hasStimulus: false,
    searchReq: false,
    searchOwn: false,
    searchKind: SEARCH_PLAIN,
    searchRoom: null,
    reviving: null,
    camBody: null,
    camBodyT: 0,
    combatSearch: false,
    spot: [0, 0],
    spotSet: false,
    spotArrived: false,
    spotLookT: 0,
    lookBase: 0,
    searchK: 0,
    routePath: [],
    entry: null,
    crew: null,
    hold: null,
    postDef: null,
    post: [0, 0],
    yaw: 0,
    pos: new Vector3(0, 0, 0),
    def: { walkSpeed: 0.9, runSpeed: 3.2, kind: 'grunt', scale: 1 },
    ctx: {
      coordinated: () => true,
      stealth: () => true,
      lkpValid: () => false,
      lkp: new Vector3(),
      searchSlot: () => 0,
      nav: { nearestWalkable: () => -1 },
    },
    lc: { active: false, stop() {} },
    lure: { cancel() {}, active: false },
    walker: { rejoin() {} },
    bark() {},
    setState() {},
    goTo: (p: [number, number]) => p,
  });
  return e as unknown as Searcher;
}

/** Search round (0, 0) on the real code until he leaves the search: seconds, stops made, furthest stop out. */
function run(e: Searcher): { t: number; stops: number; reach: number; end: string } {
  const dt = 1 / 20;
  let t = 0;
  let stops = 0;
  let reach = 0;
  let there = false;
  e.updateAwareness(dt);
  while (e.aware.level === 'searching' && t < 400) {
    const g = e.calmDecide(dt);
    if (g.point) {
      const dx = g.point[0] - e.pos.x;
      const dz = g.point[1] - e.pos.z;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, g.speed * dt);
      if (d > 1e-6) e.pos.addInPlaceFromFloats((dx / d) * s, 0, (dz / d) * s);
      there = false;
    } else if (!there) {
      stops++;
      reach = Math.max(reach, Math.hypot(e.pos.x, e.pos.z));
      there = true;
    }
    e.updateAwareness(dt);
    t += dt;
  }
  return { t, stops, reach, end: e.aware.level };
}

describe('Enemy.bodySearch: the finders do not give up so easily', () => {
  it('a dead body is searched longer, at more points and further out than a plain search, then the held caution', async () => {
    const plain = await searcher();
    plain.searchAt(0, 0, null);
    const p = run(plain);
    const finder = await searcher();
    // (S4) a death he knows of: the held caution
    finder.caution = 2;
    finder.bodySearch(0, 0);
    const b = run(finder);
    expect(p.t).toBeCloseTo(ALERT.searchTime, 0);
    expect(b.t).toBeCloseTo(ALERT.searchTime * BODY_SEARCH.timeMul, 0);
    expect(b.stops).toBeGreaterThanOrEqual(2 * p.stops);
    expect(b.reach).toBeGreaterThan(p.reach + 3);
    // then on edge (cooldown), held there by the caution
    expect(b.end).toBe('cooldown');
  });

  it('a guard already searching who finds a dead body starts over round it, the body way', async () => {
    const e = await searcher();
    e.searchAt(0, 0, null);
    e.updateAwareness(0.05);
    e.aware.t = 50;
    e.bodySearch(5, 5);
    expect(e.aware.t).toBe(0);
    expect(e.searchKind).toBe(SEARCH_BODY);
  });

  it("(S7) the second guard a camera sent to a dead body joins its search once the first has found it", async () => {
    const e = await searcher();
    const body = { pos: new Vector3(4, 0.15, 0), found: true, lethal: true, present: true, carried: false, hidden: false };
    e.aware.set('investigating');
    e.camBody = body;
    e.stepCamBody(0.05);
    expect(e.camBody).toBeNull();
    expect(e.searchReq).toBe(true);
    expect(e.searchKind).toBe(SEARCH_BODY);
    e.updateAwareness(0.05);
    expect(e.aware.level).toBe('searching');
  });

  it('(rig-pose-fix S5) the guard sent to a body walks to its sim lie (Body.pos from deathLie), then searches round it', async () => {
    const { deathLie, newLie, settleMax } = await import('../src/ai/bodyLie');
    const { proportions } = await import('../src/player/proportions');
    const p = proportions('average', 1.8);
    // he died at (20, 0, 0) facing +Z, shot from the -X side: he falls +X, the pelvis settles settleMax along it
    const lie = deathLie(newLie(), 20, 0, 0, 0, 1, 0, p);
    expect(lie.x).toBeCloseTo(20 + settleMax(p), 9);
    const body = { pos: new Vector3(lie.x, lie.y, lie.z), found: false, lethal: true, present: true, carried: false, hidden: false };
    const e = (await searcher()) as Searcher & { stimulus: [number, number] };
    e.aware.set('investigating');
    e.camBody = body;
    e.stepCamBody(0.05);
    expect(e.stimulus).toEqual([lie.x, lie.z]);
    // found (by the other guard): the body search centres on the same sim point
    body.found = true;
    const f = (await searcher()) as Searcher & { stimulus: [number, number] };
    f.aware.set('investigating');
    f.camBody = body;
    f.stepCamBody(0.05);
    expect(f.searchKind).toBe(SEARCH_BODY);
    expect(f.stimulus).toEqual([lie.x, lie.z]);
  });
});
