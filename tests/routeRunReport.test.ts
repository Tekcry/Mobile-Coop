import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import { buildReport, jsonText, merge } from '../scripts/route-run/report.mjs';

type Obj = Record<string, unknown>;

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/route-run/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// The parsed fixture is untyped on purpose: tests reach into it freely.
const campaignLog = () => JSON.parse(fixture('report-campaign-log.json'));

const header = (over: Obj = {}): Obj => ({
  map: 'ctcourse',
  mode: 'training',
  version: '4.103.4',
  sha: 'abcdef0123456789',
  date: '2026-10-25T21:00:00Z',
  graphs: ['ctcourse.json'],
  ...over,
});

const run = (over: Obj = {}): Obj => ({
  id: 'full',
  section: 'A2',
  kind: null,
  covers: [],
  time_s: 185,
  walked_m: 100,
  guards: { spawned: 2, alive: 2 },
  deadStops: [],
  detections: [],
  notices: [],
  stubs: [],
  drills: [],
  restarts: [],
  ...over,
});

const seen = (t: number, restart: string | null, over: Obj = {}): Obj => ({
  t,
  robot: 'host',
  guard: { id: 'g-shunt-7', kind: 'patrol', role: 'shunter', zone: 'pit' },
  sense: 'sight',
  inferred: false,
  level: 'alert',
  restart,
  guardAt: [1, 0, 2],
  robotAt: [4, 0, 2],
  space: 'pit_edge',
  inputs: { light: 'lit', distance: 6 },
  ...over,
});

const stop = (cls: string, over: Obj = {}): Obj => ({
  t: 50,
  robot: 'host',
  at: [3, 0, 3],
  space: 'barrier',
  link: 5,
  class: cls,
  shot: 'stop-1.png',
  ...over,
});

const walkCard = (md: string): string[] => {
  const at = md.indexOf('## Walk card');
  return md
    .slice(at)
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2));
};
const m9 = (md: string): string => md.split('\n').find((l) => l.startsWith('M9 run time:')) ?? '';

describe('route-run report', () => {
  it('gives byte-stable JSON for a fixture log', () => {
    const a = jsonText(buildReport(campaignLog()).json);
    const b = jsonText(buildReport(campaignLog()).json);
    expect(a).toBe(b);
    expect(a).toBe(fixture('report-campaign-golden.json'));
    // Key order in the log must not change the bytes of the free-form parts.
    const shuffled = campaignLog();
    shuffled.runs[0].detections[0].inputs = { angle: 12, distance: 9.1, light: 'lit', speed: 1.3, stance: 'crouched' };
    expect(jsonText(buildReport(shuffled).json)).toBe(a);
  });

  it('writes the stable shape with the exact field names', () => {
    const { json } = buildReport(campaignLog());
    expect(Object.keys(json)).toEqual([
      'tool', 'map', 'mode', 'version', 'sha', 'date', 'players', 'pace', 'detections', 'graphs', 'geom', 'routes', 'notes', 'runs', 'summary',
    ]);
    expect(Object.keys(json.runs[0])).toEqual([
      'id', 'section', 'kind', 'covers', 'verdict', 'why', 'time_s', 'walked_m', 'guards', 'deadStops', 'detections', 'notices', 'stubs', 'drills', 'restarts',
    ]);
    expect(Object.keys(json.runs[0].detections[0])).toEqual([
      't', 'robot', 'guard', 'sense', 'inferred', 'level', 'restart', 'guardAt', 'robotAt', 'space', 'inputs',
    ]);
    expect(Object.keys(json.summary)).toEqual([
      'runs', 'stuck', 'unplannable', 'detections', 'notices', 'stubbed', 'drillStubs', 'restarts', 'pushedPast', 'notAtSneakPace', 'walkedLinks', 'verdict', 'runTime_s',
    ]);
    expect(json.summary).toMatchObject({ runs: 3, detections: 1, notices: 1, stubbed: 1, walkedLinks: 19, verdict: 'pass', runTime_s: 450.9 });
  });

  it('writes walk-card lines in plain English with no jargon, hashes or ids', () => {
    const { markdown } = buildReport(campaignLog());
    const lines = walkCard(markdown);
    expect(lines).toEqual([
      'S1 shadow route (gatehouse, car park): 2:31, never stuck. Seen once: the gate officer saw you at the barrier (0:42, lit, 9 m). Noticed once: the smoker probably heard you at the gravel (1:10).',
      'S1 high route (roof stair): 1:36, never stuck.',
      'S2 loud route (loading bay): 3:24, never stuck.',
    ]);
    for (const l of lines) {
      expect(l).not.toMatch(/[0-9a-f]{7,}/);
      expect(l).not.toMatch(/g-[a-z]+-\d|_|—|no-nav-path|could-not-follow|step-timeout|restart-loop|inferred|undefined|null/);
    }
    expect(markdown).not.toContain('—');
  });

  it('reads R3 inferred sight inputs (distance, stance) into the walk card', () => {
    // The shape R3's inferCause returns for sight: distance in m, angle, raw light, stance, speed.
    const inferred = (t: number, stance: string): Obj =>
      seen(t, null, { sense: 'sight', inferred: true, inputs: { distance: 9.4, angle: 0.21, light: 0.8, stance, speed: 1.3 } });
    const crouched = buildReport({ ...header({ mode: 'campaign' }), runs: [run({ detections: [inferred(42, 'crouched')] })] });
    expect(walkCard(crouched.markdown)[0]).toContain('Seen once: the shunter probably saw you at the pit edge (0:42, lit, 9 m).');
    const standing = buildReport({ ...header({ mode: 'campaign' }), runs: [run({ detections: [inferred(42, 'standing')] })] });
    expect(walkCard(standing.markdown)[0]).toContain('(0:42, lit, 9 m, standing).');
  });

  it('fails for one stuck run and gives it no valid time', () => {
    const log = { ...header({ mode: 'campaign' }), runs: [run({ id: 'a', deadStops: [stop('could-not-follow')], time_s: 99 }), run({ id: 'b', section: 'A3' })] };
    const { json, markdown } = buildReport(log);
    expect(json.summary.verdict).toBe('fail');
    expect(json.summary.stuck).toBe(1);
    expect(json.runs[0].verdict).toBe('stuck');
    expect(json.runs[0].time_s).toBeNull();
    expect(json.runs[1].verdict).toBe('pass');
    expect(json.summary.runTime_s).toBe(185);
    expect(markdown).toContain('n/a, stuck');
    expect(walkCard(markdown)[0]).toContain('Stuck once at the barrier (the robot could not follow the path).');
  });

  it('fails for an unplannable run and for a log with no runs', () => {
    const bad = buildReport({ ...header(), runs: [run({ unplannable: 'guards missing' })] });
    expect(bad.json.runs[0]).toMatchObject({ verdict: 'unplannable', why: 'guards missing', time_s: null });
    expect(bad.json.summary.verdict).toBe('fail');
    expect(walkCard(bad.markdown)[0]).toBe('Whole course, A2: not walked: the route could not be planned.');
    expect(buildReport(header()).json.summary.verdict).toBe('fail');
  });

  it('puts an unplannable reason in plain words on the walk card and keeps the raw reason in the run section', () => {
    const raw = 'link 4 (s1-street -> s1-yard, roller_door) has no point';
    const { json, markdown } = buildReport({
      ...header({ mode: 'campaign' }),
      runs: [
        run({ id: 'S1-shadow', section: 'S1', kind: 'shadow', covers: [['s1_yard', 'shadow']], unplannable: raw }),
        run({ id: 'S1-high', section: 'S1', kind: 'high', covers: [['s1_roof', 'high']], unplannable: 'space s1_roof has no area' }),
      ],
    });
    expect(json.runs[0].why).toBe(raw);
    expect(markdown).toContain(`- Result: NOT WALKED - ${raw}`);
    expect(walkCard(markdown)).toEqual([
      'S1 shadow route (yard): not walked: the map data is missing a position for the roller door from the street to the yard.',
      'S1 high route (roof): not walked: the map data is missing the floor area of the roof.',
    ]);
  });

  it('names the training run "Whole course", its parts by section and set name, with no route kind needed', () => {
    const log = {
      ...header(),
      runs: [run({ section: null, time_s: 1000 }), run({ section: 'A1', time_s: 300 }), run({ section: 'A2', name: 'Carriage Shed', time_s: 350 })],
    };
    const lines = walkCard(buildReport(log).markdown);
    expect(lines).toEqual(['Whole course: 16:40, never stuck.', 'Whole course, A1: 5:00, never stuck.', 'A2 Carriage Shed: 5:50, never stuck.']);
    for (const l of lines) expect(l).not.toMatch(/Full|full|main/);
  });

  it('says objective holds are left out of the Marlow time while the log has no field for them', () => {
    expect(m9(buildReport({ ...header(), runs: [run()] }).markdown)).toContain('Objective holds: not in the run log yet, so left out of the held time');
  });

  it('passes for detections only, however many', () => {
    const many = Array.from({ length: 12 }, (_, i) => seen(10 + i * 5, null));
    const { json } = buildReport({ ...header({ mode: 'campaign' }), runs: [run({ detections: many })] });
    expect(json.summary.detections).toBe(12);
    expect(json.summary.verdict).toBe('pass');
  });

  it('gives a merged report equal to the one-run report', () => {
    const whole = campaignLog();
    const one = buildReport(whole);
    const part = (sec: string): Obj => ({ ...campaignLog(), runs: campaignLog().runs.filter((r: Obj) => r.section === sec) });
    const joined = buildReport(merge([part('S1'), part('S2')]));
    expect(jsonText(joined.json)).toBe(jsonText(one.json));
    expect(joined.markdown).toBe(one.markdown);
    // Parts arriving in any order give the same report.
    const reversed = buildReport(merge([part('S2'), part('S1')]));
    expect(reversed.markdown).toBe(one.markdown);
    expect(jsonText(reversed.json)).toBe(jsonText(one.json));
  });

  it('merge keeps a rerun section once and refuses parts from different builds', () => {
    const a = { ...header(), runs: [run({ id: 'x', time_s: 100 })] };
    const b = { ...header(), runs: [run({ id: 'x', time_s: 120 })] };
    expect(merge([a, b]).runs).toHaveLength(1);
    expect(merge([a, b]).runs[0].time_s).toBe(120);
    expect(() => merge([a, { ...b, sha: 'other' }])).toThrow(/sha/);
    expect(() => merge([])).toThrow();
  });

  it('keeps every part of the training run and counts only those parts toward the Marlow time', () => {
    const full = (section: string, time_s: number): Obj => run({ id: 'full', section, kind: null, covers: [], time_s });
    const side = run({ id: 'A3-shadow', section: 'A3', kind: 'shadow', covers: [['a3_yard', 'shadow']], time_s: 200 });
    const parts = [
      { ...header(), runs: [full('A1', 300)] },
      { ...header(), runs: [full('A2', 350)] },
      { ...header(), runs: [full('A3', 400), side] },
    ];
    const merged = merge(parts);
    expect(merged.runs.filter((r: Obj) => r.id === 'full').map((r: Obj) => r.section)).toEqual(['A1', 'A2', 'A3']);
    expect(merged.runs).toHaveLength(4);
    const { json, markdown } = buildReport(merged);
    expect(json.summary.runTime_s).toBe(1250);
    const line = m9(markdown);
    // 300 + 350 + 400 = 1050 s; the 200 s side run would push it over the band.
    expect(line).toContain('M9 run time: 17:30 in total (walked 17:30, held 0:00), inside the 15-20 min target');
    expect(line).toContain('1 side route run is not counted');
    // A rerun of one section replaces only that section's part.
    const rerun = buildReport(merge([...parts, { ...header(), runs: [full('A2', 380)] }]));
    expect(rerun.json.runs.filter((r: Obj) => r.id === 'full').map((r: Obj) => r.time_s)).toEqual([300, 380, 400]);
    expect(m9(rerun.markdown)).toContain('M9 run time: 18:00 in total');
  });

  it('names both drill stubs and the retry on the M9 line', () => {
    const log = {
      ...header(),
      runs: [
        run({
          time_s: 700,
          detections: [seen(120, 'retry')],
          drills: [
            { id: 'a2_hold_switch', player: 1, verb: 'hold', hold_s: 10, why: 'gate' },
            { id: 'a2_sync_hack', player: 2, verb: 'hack', hold_s: 10, why: 'gate' },
          ],
          stubs: [{ link: 9, kind: 'boost', hold_s: 4, why: 'co-op move stubbed' }],
          restarts: [{ t: 120, space: 'pit_edge', set: 'A2', restart: 'retry', detection: 0, then: 'rejoined' }],
        }),
      ],
    };
    const { json, markdown } = buildReport(log);
    expect(json.summary).toMatchObject({ drillStubs: 2, restarts: 1, stubbed: 1, verdict: 'pass' });
    const line = m9(markdown);
    expect(line).toContain('hold switch (player 1, hold, held 10 s)');
    expect(line).toContain('sync hack (player 2, hack, held 10 s)');
    expect(line).toContain('boost at link 9 (held 4 s)');
    expect(line).toContain('seen 1 (retry at the pit edge, 2:00)');
    expect(line).toContain('timer 0');
    expect(line).toContain('other 0');
    expect(line).toContain('Pushed past: none');
    expect(line).toContain('under the 15-20 min target (900-1200 s)');
    expect(line).toContain('walked 11:16, held 0:24');
  });

  it('treats two seen restarts from one space as a push past that keeps the time', () => {
    const log = {
      ...header(),
      runs: [
        run({
          name: 'Carriage Shed',
          time_s: 185,
          detections: [seen(72, 'set'), seen(100, 'set')],
          restarts: [
            { t: 72, space: 'pit_edge', set: 'A2', restart: 'set', detection: 0, then: 'rejoined' },
            { t: 100, space: 'pit_edge', set: 'A2', restart: 'set', detection: 1, then: 'pushed-past' },
          ],
        }),
      ],
    };
    const { json, markdown } = buildReport(log);
    expect(json.summary).toMatchObject({ verdict: 'pass', pushedPast: 1, stuck: 0 });
    expect(json.runs[0].time_s).toBe(185);
    expect(markdown).toContain('3:05 (includes 1 push-past)');
    expect(walkCard(markdown)[0]).toBe(
      'A2 Carriage Shed: 3:05, never stuck. Seen twice by the shunter at the pit edge (1:12, 1:40); seen again at the pit edge, robot pushed past.',
    );
    expect(m9(markdown)).toContain('Pushed past: the pit edge, 1:40');
  });

  it('treats two timer retries on one step as a pass with no detection and not made at sneak pace', () => {
    const log = {
      ...header(),
      runs: [
        run({
          time_s: 300,
          drills: [{ id: 'a4_lights', player: 1, verb: 'hold', hold_s: 10, why: 'timer' }],
          restarts: [
            { t: 90, space: 'switch_room', set: 'A4', restart: 'timer', detection: null, then: 'rejoined' },
            { t: 140, space: 'switch_room', set: 'A4', restart: 'timer', detection: null, then: 'drill-stub' },
          ],
        }),
      ],
    };
    const { json, markdown } = buildReport(log);
    expect(json.summary).toMatchObject({ verdict: 'pass', detections: 0, notices: 0, restarts: 2, notAtSneakPace: 1, drillStubs: 1 });
    expect(json.runs[0].detections).toEqual([]);
    expect(m9(markdown)).toContain('Not made at sneak pace: the switch room');
    expect(m9(markdown)).toContain('timer 2');
    expect(markdown).toContain('1 step not made at sneak pace');
    expect(walkCard(markdown)[0]).not.toMatch(/[Ss]een/);
  });

  it('fails a restart-loop dead stop (two other restarts)', () => {
    const log = {
      ...header(),
      runs: [
        run({
          deadStops: [stop('restart-loop', { space: 'cage' })],
          restarts: [
            { t: 60, space: 'cage', set: 'A5', restart: 'other', detection: null, then: 'rejoined' },
            { t: 90, space: 'cage', set: 'A5', restart: 'other', detection: null, then: 'dead-stop' },
          ],
        }),
      ],
    };
    const { json, markdown } = buildReport(log);
    expect(json.summary.verdict).toBe('fail');
    expect(json.runs[0]).toMatchObject({ verdict: 'stuck', time_s: null });
    expect(m9(markdown)).toContain('other 2');
    expect(walkCard(markdown)[0]).toContain('the game kept sending the pair back');
  });

  it('adds the plan notes and marks code routes', () => {
    const { markdown, json } = buildReport({ ...header(), routes: 'code', notes: ['side routes not run'], runs: [run()] });
    expect(json.notes).toEqual(['side routes not run']);
    expect(markdown).toContain('Code routes, not a gate run.');
    expect(markdown).toContain('- side routes not run');
    expect(markdown).toContain('two players only');
  });
});
