import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { DEFAULT_SELFTEST, addPast, bayIndexFor, bootUrl, checkSelftest, codeRuns, dryRunText, markedLog, MARK_BEGIN, MARK_END, ownParams, parseArgs, sectorIndexFor, stepsForPath } from '../scripts/route-run.mjs';
// @ts-expect-error plain .mjs tool script without types
import { PAST_M, pageScript, pageOptions, runOne, spaceAt } from '../scripts/route-run/driver.mjs';
// @ts-expect-error plain .mjs tool script without types
import { partDir, pickParts, LOG_FILE } from '../scripts/route-run/publish.mjs';
// @ts-expect-error plain .mjs tool script without types
import { lineOf } from '../scripts/route-run/causes.mjs';
// @ts-expect-error plain .mjs tool script without types
import { stepFor, stub, STUB_WHY_COOP, STUB_WHY_SOLO } from '../scripts/route-run/steps.mjs';
// @ts-expect-error plain .mjs tool script without types
import { onLockedDoor } from '../scripts/route-run/course.mjs';
// @ts-expect-error plain .mjs tool script without types
import { paceFor } from '../scripts/route-run/progress.mjs';
// @ts-expect-error plain .mjs tool script without types
import { planRuns } from '../scripts/route-run/plan.mjs';
// @ts-expect-error plain .mjs tool script without types
import { buildReport, merge } from '../scripts/route-run/report.mjs';

// Route-runs R4a (docs/route-runs/PLAN.md "R4a Harness core"): the CLI's pure parts (arguments, the boot URL, the
// selftest's steps and verdict, code routes, --merge's part picking, the dry run) and the Node-side run loop against a
// scripted page. The browser parts run on the laptop queue only (pending PC run).

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/route-run/${f}`, import.meta.url), 'utf8'));
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));

describe('route-run CLI arguments', () => {
  it('reads the full command line', () => {
    const o = parseArgs(['http://127.0.0.1:4189/', '--graph', 'a.json', 'b.json', '--points', 'p.json', '--section', 'S2', '--routes', 'code', '--pace', 'walk', '--detections', 'keep', '--out', 'o', '--publish']);
    expect(o).toMatchObject({ url: 'http://127.0.0.1:4189/', graphs: ['a.json', 'b.json'], points: 'p.json', section: 'S2', routes: 'code', players: 1, pace: 'walk', detections: 'keep', out: 'o', publish: true, dryRun: false, selftest: null });
  });

  it('defaults: graph routes, one robot, the sneak pace, detections forgiven', () => {
    expect(parseArgs(['http://x/', '--graph', 'g.json'])).toMatchObject({ routes: 'graph', players: 1, pace: 'sneak', detections: 'forgive' });
  });

  it('--selftest takes an optional fixture; with none it is the R4a fixture', () => {
    expect(parseArgs(['http://x/', '--selftest', '--players', '1']).selftest).toBe(DEFAULT_SELFTEST);
    expect(parseArgs(['http://x/', '--selftest', 'tests/fixtures/route-run/selftest-pair.graph.json']).selftest).toBe('tests/fixtures/route-run/selftest-pair.graph.json');
  });

  it('--dry-run needs no url; --merge needs no url or graph but an --out', () => {
    expect(parseArgs(['--dry-run', '--graph', 'g.json']).dryRun).toBe(true);
    expect(parseArgs(['--merge', 'campusOps', 'abc123', '--out', 'r']).merge).toEqual({ map: 'campusOps', sha: 'abc123' });
    expect(() => parseArgs(['--merge', 'campusOps', 'abc123'])).toThrow(/--out/);
  });

  it('refuses what it does not know', () => {
    expect(() => parseArgs(['http://x/', '--graph', 'g.json', '--fast'])).toThrow(/unknown option --fast/);
    expect(() => parseArgs(['--graph', 'g.json'])).toThrow(/url/);
    expect(() => parseArgs(['http://x/'])).toThrow(/--graph/);
    expect(() => parseArgs(['http://x/', '--graph', 'g.json', '--players', '3'])).toThrow(/--players/);
    expect(() => parseArgs(['http://x/', '--graph', 'g.json', '--routes', 'both'])).toThrow(/--routes/);
    expect(() => parseArgs(['http://x/', '--graph'])).toThrow(/--graph/);
    expect(() => parseArgs(['http://x/', 'http://y/', '--graph', 'g.json'])).toThrow(/unexpected/);
  });
});

describe('route-run boot URL (Sector Ops: the campus v2 exit passes ?campusv2=N)', () => {
  const pace = paceFor('sneak', metrics);
  const own = ownParams({ map: 'campusOps', mode: 'sector' }, pace, 1);

  it("keeps every query param the caller gives, then adds the harness's own", () => {
    const b = bootUrl('http://127.0.0.1:4189/?campusv2=2', own);
    expect(b.url).toBe('http://127.0.0.1:4189/');
    const q = new URLSearchParams(b.params);
    expect(q.get('campusv2')).toBe('2');
    expect(q.get('autostart')).toBe('campusOps');
    expect(q.get('mode')).toBe('sector');
    // e2e-lib finds `autostart` in params (it waits for the match) and builds url + '?' + params
    expect(/(^|&)autostart=/.test(b.params)).toBe(true);
    expect(b.params.startsWith('campusv2=2&')).toBe(true);
  });

  it("the caller's value wins over the harness's for the same key (a caller's gear or mode)", () => {
    const q = new URLSearchParams(bootUrl('http://h/?gear=5&campusv2=1', own).params);
    expect(q.getAll('gear')).toEqual(['5']);
    expect(q.get('campusv2')).toBe('1');
  });

  it('is the same for every page (R4b opens its second page with the same call)', () => {
    expect(bootUrl('http://h/game/?campusv2=3#x', own)).toEqual(bootUrl('http://h/game/?campusv2=3#x', own));
    expect(bootUrl('http://h/game/?campusv2=3#x', own).url).toBe('http://h/game/');
  });

  it('own params: the map, the game mode (a training graph is the course), a gear the pace fits, net=local for two', () => {
    expect(new URLSearchParams(own).get('gear')).toBe('4');
    const run = new URLSearchParams(ownParams({ map: 'ctcourse', mode: 'training' }, paceFor('run', metrics), 2));
    expect(run.get('mode')).toBe('course');
    expect(run.get('gear')).toBe('5');
    expect(run.get('net')).toBe('local');
  });
});

describe('route-run sections', () => {
  it("a course section's bay is its set's 1-based position in CourseDef.bays, matched by id", () => {
    const bays = ['a1Gate', 'a2CarriageShed', 'a10Yard', 'A11'];
    expect(bayIndexFor(bays, 'A2')).toBe(2);
    expect(bayIndexFor(bays, 'a1')).toBe(1);
    expect(bayIndexFor(bays, 'A10')).toBe(3);
    expect(bayIndexFor(bays, 'A11')).toBe(4);
    expect(bayIndexFor(bays, 'A3')).toBe(0);
  });

  it("a Sector Ops section is the sector with the graph section's id", () => {
    expect(sectorIndexFor(['s1', 's2', 's3'], 'S2')).toBe(1);
    expect(sectorIndexFor(['s1'], 'S4')).toBe(-1);
  });
});

describe('route-run selftest fixture and steps', () => {
  const fx = json('selftest.graph.json');
  const speed = metrics.rules.split_speed_mps;

  it('is R1\'s campus S1 copy plus one walled link, with its points and expectations', () => {
    const s1 = json('campusOps-S1.graph.json');
    expect(fx.meta).toEqual(s1.meta);
    expect(fx.links.slice(0, s1.links.length)).toEqual(s1.links);
    expect(fx.links).toHaveLength(s1.links.length + 1);
    expect(fx.points.links).toHaveLength(fx.links.length);
    expect(fx.expect.runs.map((r: Obj) => r.id)).toEqual(['door-leg', 'walled-link']);
  });

  it('builds walk / link steps in R1\'s shape for a fixed path, then each link gets its placement past', () => {
    const steps = addPast(stepsForPath([fx], fx.points, [4, 7, 22], speed), fx.points);
    expect(steps.map((s: Obj) => s.type)).toEqual(['walk', 'link', 'walk', 'link', 'walk', 'link', 'walk']);
    const wall = steps[5];
    expect(wall).toMatchObject({ type: 'link', index: 22, kind: 'opening', action: 'walk', at: [-17, 0, -31.5], from: 's1-forecourt', to: 'selftest-c1' });
    // PAST_M toward the C1 centre (-20, 0, -32)
    const d = Math.hypot(wall.past[0] + 17, wall.past[2] + 31.5);
    expect(d).toBeCloseTo(PAST_M, 6);
    expect(wall.past[0]).toBeLessThan(-17);
    expect(steps[6]).toEqual({ type: 'walk', to: [-20, 0, -32], space: 'selftest-c1', link: null });
    const door = addPast(stepsForPath([fx], fx.points, [1], speed), fx.points)[1];
    expect(door).toMatchObject({ action: 'door', limit_s: 5, at: [17, 0, -73] });
  });

  it('the verdict: outcomes per link and the expected lines', () => {
    const ok: Obj[] = [
      { id: 'door-leg', unplannable: undefined, guards: { spawned: 8, alive: 8 }, deadStops: [], links: [{ index: 1, outcome: 'walked' }] },
      { id: 'walled-link', guards: { spawned: 8, alive: 8 }, deadStops: [{ class: 'no-nav-path', link: 22, t: 61.2, since: 53.2 }], links: [{ index: 4, outcome: 'walked' }, { index: 7, outcome: 'walked' }, { index: 22, outcome: 'no-nav-path' }] },
    ];
    expect(checkSelftest(fx.expect, ok)).toEqual([]);
    const slow = structuredClone(ok);
    slow[1]!.deadStops[0].since = 50;
    expect(checkSelftest(fx.expect, slow)).toEqual(['walled-link: the no-nav-path stop came 11.20 s after the last progress (at most 9)']);
    const bad = structuredClone(ok);
    bad[0]!.deadStops.push({ class: 'step-timeout', link: 1, t: 1, since: 1 });
    bad[0]!.links[0].outcome = 'step-timeout';
    bad[1]!.guards.alive = 7;
    expect(checkSelftest(fx.expect, bad)).toEqual([
      'door-leg: link 1 step-timeout, expected walked',
      'door-leg: dead stops [["step-timeout",1]], expected none',
      'walled-link: guards 7 of 8',
    ]);
    expect(checkSelftest(fx.expect, [ok[0]])).toEqual(['walled-link: not run']);
  });
});

describe('route-run code routes (--routes code)', () => {
  it('walks every point, uses the objective at pts[obj], stubs each climbs leg at its far point', () => {
    const runs = codeRuns({ id: 's1', routes: [{ name: 'stealth', pts: [[24, -79, 0], [20.6, -76, 0], [-20, -32, 0]], obj: 1, climbs: [] }, { name: 'roof', pts: [[24, -79, 0], [-33, -40, 0], [-33, -37, 4.4]], obj: 0, climbs: [1] }] }, 'S1');
    expect(runs.map((r: Obj) => [r.id, r.name, r.kind])).toEqual([['S1-code-1', 'stealth (code route)', null], ['S1-code-2', 'roof (code route)', null]]);
    expect(runs[0].steps.map((s: Obj) => s.type)).toEqual(['walk', 'walk', 'objective', 'walk']);
    expect(runs[0].steps[1].to).toEqual([20.6, 0, -76]);
    expect(runs[1].steps.map((s: Obj) => s.type)).toEqual(['walk', 'objective', 'walk', 'link']);
    expect(runs[1].steps[3]).toMatchObject({ action: 'stub', kind: 'climb', at: [-33, 0, -40], past: [-33, 4.4, -37] });
  });
});

describe('route-run --merge and --publish paths', () => {
  it('a part folder is <map>/<sha8>-<time>/', () => {
    expect(partDir('campusOps', '0123456789abcdef', '2026-10-25T20:01:02.345Z')).toBe('campusOps/01234567-20261025T200102Z/');
  });

  it('picks the parts of one map at one commit, oldest first', () => {
    const paths = [
      `campusOps/01234567-20261025T210000Z/${LOG_FILE}`,
      'campusOps/01234567-20261025T210000Z/REPORT.md',
      `campusOps/01234567-20261025T200000Z/${LOG_FILE}`,
      `campusOps/89abcdef-20261025T200000Z/${LOG_FILE}`,
      `ctcourse/01234567-20261025T200000Z/${LOG_FILE}`,
    ];
    expect(pickParts(paths, 'campusOps', '0123456789abcdef')).toEqual(['campusOps/01234567-20261025T200000Z/', 'campusOps/01234567-20261025T210000Z/']);
  });

  it('two section parts merge into the one-map report (R2 merge, as --merge does)', () => {
    const log = json('report-campaign-log.json');
    const a = { ...log, runs: log.runs.filter((r: Obj) => r.section === 'S1') };
    const b = { ...log, runs: log.runs.filter((r: Obj) => r.section === 'S2') };
    expect(buildReport(merge([a, b])).json).toEqual(buildReport(log).json);
  });

  it('prints the run log between the markers', () => {
    const text = markedLog({ map: 'm', runs: [] });
    expect(text.split('\n')).toEqual([MARK_BEGIN, '{"map":"m","runs":[]}', MARK_END]);
  });
});

describe('route-run --dry-run (no browser)', () => {
  it('prints the campus S1 plan', () => {
    const out = execFileSync(process.execPath, ['scripts/route-run.mjs', '--dry-run', '--graph', 'tests/fixtures/route-run/campusOps-S1.graph.json', '--points', 'tests/fixtures/route-run/campusOps-S1.points.json', '--section', 'S1'], { encoding: 'utf8', timeout: 60000 });
    const plan = planRuns([json('campusOps-S1.graph.json')], json('campusOps-S1.points.json'), { metrics });
    expect(out).toBe(`${dryRunText(plan, { section: 'S1' })}\n`);
    expect(out).toMatch(/^route-run plan: campusOps \(sector\), sections S1/);
    for (const r of plan.runs) expect(out).toContain(`- ${r.id} (S1, ${r.kind})`);
  });

  it('opens no browser: the CLI and its modules load the browser library only inside a real run', () => {
    for (const f of ['route-run.mjs', 'route-run/driver.mjs', 'route-run/steps.mjs', 'route-run/causes.mjs', 'route-run/course.mjs', 'route-run/publish.mjs']) {
      const src = readFileSync(new URL(`../scripts/${f}`, import.meta.url), 'utf8');
      expect(src, f).not.toMatch(/^import .*(e2e-lib|playwright)/m);
    }
  });
});

describe('route-run in-page driver script', () => {
  it('parses as one script with R3 inlined', () => {
    const s = pageScript(pageOptions({ pace: paceFor('sneak', metrics), forgive: true }));
    expect(s).not.toMatch(/^export /m);
    expect(() => new Function(s)).not.toThrow();
    expect(s).toContain('class StuckWatch');
  });
});

describe('route-run seams (R4a: every link a stub, no course hooks, inferred causes)', () => {
  it('every kind is a stub; co-op and solo stubs say why', async () => {
    const calls: unknown[] = [];
    const ctx = { driver: { hold: async (s: number) => calls.push(['hold', s]), place: async (p: unknown) => calls.push(['place', p]) } };
    expect(stepFor({ kind: 'coop_boost' })).toBe(stub);
    expect(stepFor({ kind: 'ladder' })).toBe(stub);
    expect(stepFor({ kind: 'something_new' })).toBe(stub);
    const r = await stub(ctx, { index: 17, kind: 'coop_boost', at: [-20, 0, -40.5], past: [-20, 4.4, -39.3], hold_s: 6 });
    expect(r).toEqual({ outcome: 'stub', stub: { link: 17, kind: 'coop_boost', hold_s: 6, why: STUB_WHY_COOP } });
    expect(calls).toEqual([['hold', 6], ['place', [-20, 4.4, -39.3]]]);
    expect((await stub(ctx, { index: 12, kind: 'ladder', at: [0, 0, 0], hold_s: 14.77 })).stub.why).toBe(STUB_WHY_SOLO);
    expect(await onLockedDoor({}, {}, {})).toBe(false);
  });

  it('a rise becomes an inferred line in the report shape', () => {
    const l = lineOf({ t: 12.345, cls: 'detection', level: 'alert', camera: null, guard: { id: 'e3', kind: 'rifle', role: 'gate', zone: 'barrier', x: 10, y: 1.6, z: 0, yaw: 0 }, robots: [{ x: 10, y: 0, z: 9, crouched: true, speed: 1.3, light: 0.7 }], heard: [], told: null, body: null, space: 's1-lane' });
    expect(l).toMatchObject({ kind: 'detection', t: 12.35, robot: 'host', guard: { id: 'e3', kind: 'rifle', role: 'gate', zone: 'barrier' }, sense: 'sight', inferred: true, level: 'alert', restart: null, guardAt: [10, 1.6, 0], robotAt: [10, 0, 9], space: 's1-lane' });
    expect(l.inputs).toMatchObject({ stance: 'crouched', speed: 1.3, light: 0.7 });
    const cam = lineOf({ t: 3, cls: 'detection', level: 'alarm', camera: 'cam-gate', guard: { id: 'cam-gate', kind: 'camera' }, robots: [{ x: 0, y: 0, z: 0 }], heard: [] });
    expect(cam).toMatchObject({ sense: 'camera', guard: { id: 'cam-gate', kind: 'camera' }, guardAt: null, inputs: { camera: 'cam-gate' } });
  });

  it('a point is in the space whose box holds it, on the nearest floor', () => {
    const fx = json('selftest.graph.json');
    expect(spaceAt(fx.points, 17, 0, -76)).toBe('s1-gatehouse');
    expect(spaceAt(fx.points, -33, 4.4, -37)).toBe('s1-plantroof');
    expect(spaceAt(fx.points, -33, 0, -37)).toBe('s1-plantroom');
    expect(spaceAt(fx.points, 500, 0, 500)).toBe(null);
    expect(spaceAt(null, 0, 0, 0)).toBe(null);
  });
});

describe('route-run run loop (Node side, against a scripted page)', () => {
  /** A page that arrives at every walk target except `stallAt` (x), whose probe says `cls`. */
  function fakeDriver({ stallAt = null as number | null, cls = 'no-nav-path', guards = { spawned: 8, alive: 8 } } = {}) {
    const calls: unknown[][] = [];
    let t = 0;
    let target: number[] = [0, 0, 0];
    let pos = [0, 0, 0];
    const d: Obj = {
      points: null,
      onChunk: async () => {},
      async call(name: string, ...a: number[]) {
        calls.push([name, ...a]);
        switch (name) {
          case 'restart': return true;
          case 'guards': return guards;
          case 'begin': t = 0; return 0;
          case 'walkStart': target = a; return { nav: true };
          case 'stallSince': return t - 8;
          case 'probe': return cls;
          case 'tick': return { ev: '', t, x: pos[0], y: pos[1], z: pos[2] };
          case 'time': return t;
          case 'walked': return 42;
          case 'doorStart': return 'open';
          case 'objectivePoint': return null;
          default: return null;
        }
      },
      async until() {
        t += 10;
        if (calls.at(-1)?.[0] === 'walkStart' && target[0] === stallAt) return { ev: 'stall', t, x: target[0] + 1, y: 0, z: target[2] };
        pos = target;
        return { ev: calls.at(-1)?.[0] === 'walkStart' ? 'arrived' : 'held', t, x: pos[0], y: pos[1], z: pos[2] };
      },
      async place(p: number[]) { calls.push(['place', p]); pos = p; },
      async hold(s: number) { calls.push(['hold', s]); t += s; },
      async rises() { return []; },
    };
    return { d, calls };
  }
  const fx = json('selftest.graph.json');
  const steps = () => addPast(stepsForPath([fx], fx.points, [4, 7, 22], metrics.rules.split_speed_mps), fx.points);

  it('a stall is one dead stop classed by the probe, the robot is placed past that link and the run goes on', async () => {
    const { d, calls } = fakeDriver({ stallAt: -17 });
    const log = await runOne({ driver: d, host: null, shots: null, notes: [] }, { id: 'walled-link', section: 'S1', steps: steps() });
    expect(log.deadStops).toEqual([{ t: 30, robot: 'host', at: [-16, 0, -31.5], space: 's1-forecourt', link: 22, class: 'no-nav-path', shot: null, since: 22 }]);
    expect(log.links).toEqual([{ index: 4, kind: 'opening', outcome: 'walked' }, { index: 7, kind: 'opening', outcome: 'walked' }, { index: 22, kind: 'opening', outcome: 'no-nav-path' }]);
    expect(log.walkedLinks).toBe(2);
    const placed = calls.filter((c) => c[0] === 'place');
    expect(placed).toHaveLength(1);
    expect(placed[0]![1]).toEqual(steps()[5].past);
    // after the placement the run still walks to the far space
    expect(calls.filter((c) => c[0] === 'walkStart').at(-1)).toEqual(['walkStart', -20, 0, -32]);
    expect(log.guards).toEqual({ spawned: 8, alive: 8 });
    expect(log.walked_m).toBe(42);
  });

  it('a missing guard leaves the run unwalked (A15)', async () => {
    const { d, calls } = fakeDriver({ guards: { spawned: 8, alive: 7 } });
    const log = await runOne({ driver: d, host: null, shots: null, notes: [] }, { id: 'x', section: 'S1', steps: steps() });
    expect(log.unplannable).toMatch(/^guards missing \(7 of 8/);
    expect(calls.some((c) => c[0] === 'walkStart')).toBe(false);
  });

  it('a stub holds then places, logged and never counted as walked', async () => {
    const { d, calls } = fakeDriver();
    const st = addPast(stepsForPath([fx], fx.points, [17], metrics.rules.split_speed_mps), fx.points);
    const log = await runOne({ driver: d, host: null, shots: null, notes: [] }, { id: 'boost', section: 'S1', steps: st });
    expect(log.stubs).toEqual([{ link: 17, kind: 'coop_boost', hold_s: 6, why: STUB_WHY_COOP }]);
    expect(log.walkedLinks).toBe(0);
    expect(calls.filter((c) => c[0] === 'hold')).toEqual([['hold', 6]]);
  });

  it('an unplannable run is logged unwalked', async () => {
    const { d, calls } = fakeDriver();
    const log = await runOne({ driver: d, host: null, shots: null, notes: [] }, { id: 'u', section: 'S1', unplannable: 'space x has no area', steps: [] });
    expect(log.unplannable).toBe('space x has no area');
    expect(calls).toEqual([]);
  });
});

describe('route-run in-page driver against a fake game (Node vm, no browser)', () => {
  /** A flat world: the robot moves at the pace's speed along the pad's stick, camera-relative (forward (sin yaw, cos
   *  yaw)); x never passes `wallX`; nav finds a straight path unless the goal is past the wall. */
  function fakeGame({ wallX = Infinity } = {}) {
    class V {
      constructor(public x: number, public y: number, public z: number) {}
    }
    const axes = [0, 0, 0, 0];
    const buttons: number[] = Array(17).fill(0);
    const pressed: number[] = [];
    const calls: string[] = [];
    const guard = { id: 'e1', def: { kind: 'rifle' }, job: 'gate', zone: 'barrier', pos: new V(0, 0, 8), yaw: Math.PI, alive: true, level: 'unaware', aware: { set: (l: string) => { guard.level = l; calls.push(`set ${l}`); } } };
    const game: Obj = {
      time: 0,
      lightLevel: 0.3,
      player: { position: new V(0, 0, 0), cam: { yaw: 0 }, controller: { crouched: false, crouchIntent: false, speed: 0, yaw: 0, teleport(v: V, yaw: number) { game.player.position = v; this.yaw = yaw; } } },
      nav: {
        findPath: (_a: number[], b: number[]) => (b[0]! > wallX ? null : [[b[0], b[1]]]),
        heightAt: () => 0,
        cellOf: () => 1,
        isWalkable: () => true,
        nearestWalkable: () => -1,
        centerInto: (_k: number, out: number[]) => out,
        cellHeight: () => 0,
      },
      world: { doors: { nearest: () => null } },
      enemyMgr: { enemies: [guard], hear() {}, noise() {}, resetAlarm: () => calls.push('resetAlarm') },
      target: { damageMul: 1 },
      restartCheckpoint: () => { calls.push('restart'); return true; },
    };
    const speed = paceFor('sneak', metrics).speed;
    const window: Obj = {
      __app: {
        current: game,
        loop: {
          manual: false,
          stepHeadless(dt: number) {
            const c = game.player.controller;
            if (buttons[1]) { c.crouchIntent = !c.crouchIntent; c.crouched = c.crouchIntent; buttons[1] = 0; }
            const yaw = game.player.cam.yaw;
            const sx = axes[0]!;
            const sy = -axes[1]!;
            const m = Math.hypot(sx, sy);
            c.speed = m > 0.1 ? speed : 0;
            if (m > 0.1) {
              const dx = (sx * Math.cos(yaw) + sy * Math.sin(yaw)) / m;
              const dz = (-sx * Math.sin(yaw) + sy * Math.cos(yaw)) / m;
              const p = game.player.position;
              p.x = Math.min(wallX, p.x + dx * speed * dt);
              p.z += dz * speed * dt;
            }
            game.time += dt;
          },
        },
      },
      __pad: { connect() {}, set(i: number, v: number) { buttons[i] = v; if (v) pressed.push(i); }, axis(i: number, v: number) { axes[i] = v; } },
    };
    const ctx = vm.createContext({ window, Math, Float64Array, Array });
    vm.runInContext(pageScript(pageOptions({ pace: paceFor('sneak', metrics), forgive: true })), ctx);
    return { rr: window.__rr as Obj, game, guard, calls, pressed };
  }

  it('walks a leg crouched at the sneak pace and arrives, in game time', () => {
    const { rr, game } = fakeGame();
    rr.restart();
    expect(rr.tick(5).ev).toBe('held');
    rr.begin();
    rr.walkStart(0, 0, 13);
    let r = rr.tick(2);
    for (let i = 0; i < 20 && r.ev === ''; i++) r = rr.tick(2);
    expect(r.ev).toBe('arrived');
    expect(game.player.controller.crouched).toBe(true);
    expect(Math.hypot(game.player.position.x, game.player.position.z - 13)).toBeLessThan(0.45);
    expect(r.t).toBeGreaterThan(9);
    expect(r.t).toBeLessThan(11.5);
    expect(rr.walked()).toBeCloseTo(13, 0);
  });

  it('a wall stops the robot: the stall fires 8 s after its last progress and the probe finds no nav path', () => {
    const { rr } = fakeGame({ wallX: 3 });
    rr.begin();
    rr.walkStart(10, 0, 0);
    let r = rr.tick(2);
    for (let i = 0; i < 30 && r.ev === ''; i++) r = rr.tick(2);
    expect(r.ev).toBe('stall');
    expect(r.t - rr.stallSince()).toBeGreaterThanOrEqual(8 - 1e-6);
    expect(r.t - rr.stallSince()).toBeLessThan(8 + 0.1);
    expect(r.x).toBeCloseTo(3, 6);
    expect(rr.probe(10, 0, 0)).toBe('no-nav-path');
    expect(rr.probe(2, 0, 0)).toBe('could-not-follow');
  });

  it('a guard rising to alert is one detection, forgiven (A2); a rise to suspicious is a notice', () => {
    const { rr, guard, calls } = fakeGame();
    rr.begin();
    rr.holdStart(1);
    guard.level = 'suspicious';
    rr.tick(0.5);
    guard.level = 'alert';
    expect(rr.tick(1).ev).toBe('held');
    const rs = rr.rises(0);
    expect(rs.map((x: Obj) => [x.cls, x.level, x.guard.id])).toEqual([['notice', 'suspicious', 'e1'], ['detection', 'alert', 'e1']]);
    expect(calls).toContain('set unaware');
    expect(calls).toContain('resetAlarm');
    expect(guard.level).toBe('unaware');
    expect(lineOf({ ...rs[1], space: null }).sense).toBe('sight');
  });

  it('places the robot and holds; the guards check and the restart', () => {
    const { rr, game, calls, pressed } = fakeGame();
    expect(rr.restart()).toBe(true);
    expect(calls).toContain('restart');
    expect(pressed).toContain(12);
    rr.noDamage();
    expect(game.target.damageMul).toBe(0);
    expect(rr.guards()).toEqual({ spawned: 1, alive: 1 });
    rr.begin();
    rr.place(4, 0, 6, 1);
    expect([game.player.position.x, game.player.position.z, game.player.controller.yaw]).toEqual([4, 6, 1]);
    expect(rr.tick(1).ev).toBe('held');
  });
});
