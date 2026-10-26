import { describe, expect, it } from 'vitest';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { BUILTIN_LISTS, outsideRepo, padEvents, pageParams, parseArgs, parseSceneList } from '../scripts/anim-video.mjs';

// The anim-video recorder's pure parts (player-batch-j19 S8a): the command line, the scene lists, the page query and the
// pad timeline. The recording itself needs a browser and a GPU: a PC run on the laptop look tier, never here.
const root = path.resolve(__dirname, '..');
const outside = path.resolve(root, '..', 'look-out');

type Ev = { t: number; kind: string; i?: number; v?: number; code?: string };
type Scene = { name: string; seconds: number; params: string; view: string; place?: number[]; steps: object[] };
type List = { name: string; params: string; hud: boolean; scenes: Scene[] };
const parse = (j: unknown, label = 'l.json'): List => parseSceneList(j, label) as List;
const err = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return '(no error)';
};

const EXAMPLE = {
  name: 'walk-gears',
  params: 'autostart=proving',
  hud: false,
  scenes: [
    {
      name: 'Walk, gear 3, side view',
      params: 'autostart=proving&gear=3',
      seconds: 8,
      view: 'side',
      place: [0, 0, -14, 1.5708],
      steps: [{ t: 0, move: [0, 1] }, { t: 6, move: [0, 0] }, { t: 6.5, press: 'B' }],
    },
  ],
};
/** A valid one-scene list with this scene merged in (and the list fields `list`). */
const one = (scene: object, list: object = {}): object => ({ name: 'x', params: 'autostart=proving', scenes: [{ name: 's', seconds: 10, ...scene }], ...list });

describe('anim-video parseArgs', () => {
  it('a full valid line', () => {
    const o = parseArgs(['--scenes', 'a.json', '--out', outside, '--gfx', 'epic', '--size', '1920x1080', '--url', 'http://127.0.0.1:4189/', '--port', '4190'], {});
    expect(o).toEqual({ lists: ['a.json'], out: outside, gfx: 'epic', size: { width: 1920, height: 1080 }, url: 'http://127.0.0.1:4189/', port: 4190, help: false });
  });
  it('defaults: high, 1280x720, E2E_PORT else 4189', () => {
    expect(parseArgs(['--scenes', 'smoke', '--out', outside], {})).toMatchObject({ gfx: 'high', size: { width: 1280, height: 720 }, url: null, port: 4189 });
    expect(parseArgs(['--scenes', 'smoke', '--out', outside], { E2E_PORT: '4200' }).port).toBe(4200);
  });
  it('--scenes lists add up in order', () => {
    expect(parseArgs(['--scenes', 'a.json,b.json', '--scenes', 'smoke', '--out', outside], {}).lists).toEqual(['a.json', 'b.json', 'smoke']);
  });
  it('usage errors name the flag', () => {
    expect(() => parseArgs(['--scenes', 'smoke'], {})).toThrow(/--out/);
    expect(() => parseArgs(['--out', outside], {})).toThrow(/--scenes/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--fast'], {})).toThrow(/--fast/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--gfx', 'ultraepic'], {})).toThrow(/--gfx/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--size', '1280'], {})).toThrow(/--size/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--size', '10x10'], {})).toThrow(/--size/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--port', 'abc'], {})).toThrow(/--port/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside, '--port', '70000'], {})).toThrow(/--port/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', outside], { E2E_HEADED: '1' })).toThrow(/E2E_HEADED/);
    expect(() => parseArgs(['--scenes', 'smoke', '--out', path.join(root, 'build', 'look')], {})).toThrow(/--out/);
  });
  it('--help alone is valid', () => {
    expect(parseArgs(['--help'], {}).help).toBe(true);
  });
});

describe('anim-video outsideRepo', () => {
  it('the repo and folders in it are inside; a sibling folder is outside', () => {
    expect(outsideRepo(root, root)).toBe(false);
    expect(outsideRepo(path.join(root, 'build', 'look'), root)).toBe(false);
    expect(outsideRepo(outside, root)).toBe(true);
    expect(outsideRepo(path.join(root, 'build', 'look'))).toBe(false);
  });
});

describe('anim-video parseSceneList', () => {
  it('the built-in smoke list parses and totals 18 s', () => {
    const l = parse(BUILTIN_LISTS.smoke, 'smoke');
    expect(l.name).toBe('smoke');
    expect(l.hud).toBe(false);
    expect(l.scenes.map((s) => s.name)).toEqual(['Stand, game camera', 'Walk forward, side view', 'Look round']);
    expect(l.scenes.reduce((a, s) => a + s.seconds, 0)).toBe(18);
  });
  it('the example parses with defaults filled', () => {
    const l = parse(EXAMPLE);
    expect(l.scenes[0]).toEqual(EXAMPLE.scenes[0]);
    const d = parse(one({}));
    expect(d.hud).toBe(false);
    expect(d.scenes[0]).toEqual({ name: 's', seconds: 10, params: 'autostart=proving', view: 'ots', steps: [] });
  });
  it('a JSON text parses like the object', () => {
    expect(parse(JSON.stringify(EXAMPLE))).toEqual(parse(EXAMPLE));
  });
  it('each problem names its field', () => {
    const cases: [object, RegExp][] = [
      [one({}, { name: 'Walk Gears' }), /l\.json: name /],
      [one({}, { params: 'mode=clear' }), /l\.json: params .*autostart=/],
      [one({}, { params: '?autostart=proving' }), /l\.json: params must not start/],
      [{ name: 'x', params: 'autostart=proving', scenes: [] }, /l\.json: scenes /],
      [{ name: 'x', params: 'autostart=proving', scenes: [{ seconds: 5 }] }, /scene 0: name /],
      [one({ seconds: 0 }), /scene 0: seconds /],
      [one({ seconds: 121 }), /scene 0: seconds /],
      [{ name: 'x', params: 'autostart=proving', scenes: [{ name: 'a', seconds: 70 }, { name: 'b', seconds: 60 }] }, /l\.json: scenes total 130 s/],
      [one({ view: 'top' }), /scene 0: view /],
      [one({ place: [0, 0, 1] }), /scene 0: place /],
      [one({ steps: [{ t: 11, move: [0, 1] }] }), /scene 0 step 0: t /],
      [one({ steps: [{ t: 2, move: [0, 1] }, { t: 1, move: [0, 0] }] }), /scene 0 step 1: t .*order/],
      [one({ steps: [{ t: 0, move: [0, 1], press: 'A' }] }), /step 0: needs exactly one action .*move \+ press/],
      [one({ steps: [{ t: 0, press: 'Z' }] }), /step 0: press /],
      [one({ steps: [{ t: 0, move: [0, 1.5] }] }), /step 0: move /],
      [one({ steps: [{ t: 0, hold: 'RT' }] }), /step 0: hold needs for/],
      [one({ steps: [{ t: 0, press: 'A', for: 1 }] }), /step 0: for /],
      [one({ zoom: 2 }), /scene 0: unknown field zoom/],
    ];
    for (const [list, re] of cases) expect(err(() => parse(list))).toMatch(re);
  });
  it('one bad list with three problems throws one error naming all three', () => {
    const m = err(() => parse({ name: 'Bad Name', params: 'autostart=proving', scenes: [{ name: 's', seconds: 10, view: 'top', steps: [{ t: 0, press: 'Z' }] }] }));
    expect(m).toMatch(/l\.json: name /);
    expect(m).toMatch(/l\.json scene 0: view /);
    expect(m).toMatch(/l\.json scene 0 step 0: press /);
    expect(m.split('; ')).toHaveLength(3);
  });
});

describe('anim-video pageParams', () => {
  it('adds the preset and gear=none unless the query names them', () => {
    expect(pageParams('autostart=proving', 'high')).toBe('autostart=proving&gfx=high&gear=none');
    expect(pageParams('autostart=proving&gfx=epic&gear=3', 'high')).toBe('autostart=proving&gfx=epic&gear=3');
  });
});

describe('anim-video padEvents', () => {
  const ev = (steps: object[]): Ev[] => padEvents(steps) as Ev[];
  it('a press is held 0.1 s', () => {
    expect(ev([{ t: 1, press: 'A' }])).toEqual([{ t: 1, kind: 'button', i: 0, v: 1 }, { t: 1.1, kind: 'button', i: 0, v: 0 }]);
  });
  it('a hold lasts its for', () => {
    const e = ev([{ t: 2, hold: 'RT', for: 1.2 }]);
    expect(e.map((x) => [x.kind, x.i, x.v])).toEqual([['button', 7, 1], ['button', 7, 0]]);
    expect(e[0]?.t).toBe(2);
    expect(e[1]?.t).toBeCloseTo(3.2, 9);
  });
  it('sticks: forward and up are negative axes', () => {
    expect(ev([{ t: 0, move: [0.5, 1] }])).toEqual([{ t: 0, kind: 'axis', i: 0, v: 0.5 }, { t: 0, kind: 'axis', i: 1, v: -1 }]);
    expect(ev([{ t: 0, look: [1, 1] }])).toEqual([{ t: 0, kind: 'axis', i: 2, v: 1 }, { t: 0, kind: 'axis', i: 3, v: -1 }]);
  });
  it('a js step is kept', () => {
    expect(ev([{ t: 3, js: 'g.x = 1;' }])).toEqual([{ t: 3, kind: 'js', code: 'g.x = 1;' }]);
  });
  it('mixed steps sorted by t, equal times in step order', () => {
    const e = ev([{ t: 0, press: 'B' }, { t: 0, move: [1, 0] }, { t: 0.05, js: 'x' }, { t: 0.1, look: [0, 1] }]);
    expect(e.map((x) => [x.t, x.kind, x.i ?? null])).toEqual([
      [0, 'button', 1],
      [0, 'axis', 0],
      [0, 'axis', 1],
      [0.05, 'js', null],
      [0.1, 'button', 1],
      [0.1, 'axis', 2],
      [0.1, 'axis', 3],
    ]);
  });
});
