import { afterAll, describe, expect, it, vi } from 'vitest';
import { diag } from '../src/feedback/diag';
import { argText, brief, installDiagHooks, watchApp } from '../src/feedback/diagWatch';
import type { App } from '../src/core/app';

// (diagnostics log) the page hooks never break the game: the console keeps printing, nothing recurses, an argument that
// throws stays contained, and a browser that refuses an API (getGamepads in a permission-less iframe) still boots
const g = globalThis as unknown as Record<string, unknown>;
const saved = { error: console.error, warn: console.warn, info: console.info, window: g.window, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator') };

afterAll(() => {
  console.error = saved.error;
  console.warn = saved.warn;
  console.info = saved.info;
  g.window = saved.window;
  if (saved.navigator) Object.defineProperty(globalThis, 'navigator', saved.navigator);
});

describe('console and error hooks', () => {
  it('keep the original output, log the line, never recurse and contain a throwing argument', () => {
    const orig = vi.fn();
    console.error = orig;
    console.warn = vi.fn();
    console.info = vi.fn();
    g.window = { addEventListener: vi.fn() };
    installDiagHooks();
    const before = diag.lineCount;
    console.error('boom at the door', { a: 1, b: [1, 2] });
    expect(orig).toHaveBeenCalledWith('boom at the door', { a: 1, b: [1, 2] });
    expect(diag.text()).toMatch(/ERROR boom at the door \{a: 1, b: \[1, 2\]\}/);
    // a getter that calls the console again: printed, not logged twice, no loop
    const loud = {
      get x() {
        console.error('inner call');
        return 1;
      },
    };
    expect(() => console.error('outer', loud)).not.toThrow();
    expect(orig).toHaveBeenCalledWith('inner call');
    expect(diag.text()).not.toMatch(/inner call/);
    // arguments that throw when read
    const err = new Error('bad stack');
    Object.defineProperty(err, 'stack', {
      get() {
        throw new Error('no stack');
      },
    });
    const trap = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no keys');
        },
      },
    );
    const getter = {
      get y() {
        throw new Error('no y');
      },
    };
    expect(() => console.error('three', err, trap, getter)).not.toThrow();
    expect(diag.text()).toMatch(/three Error: bad stack \[unprintable\] \{y: \?\}/);
    expect(diag.lineCount).toBeGreaterThan(before);
  });

  it('writes values briefly (depth, items, string length)', () => {
    expect(brief({ a: { b: { c: { d: 1 } } } })).toBe('{a: {b: {…}}}');
    expect(brief(Array.from({ length: 20 }, (_, i) => i))).toBe('[0, 1, 2, 3, 4, 5, 6, 7, …12 more]');
    expect(brief('x'.repeat(200))).toHaveLength(121);
    expect(argText(Symbol('s'))).toBe('Symbol(s)');
  });
});

describe('watchApp', () => {
  it('never throws, even with a getGamepads that throws and an app missing parts', () => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
        hardwareConcurrency: 8,
        language: 'en-AU',
        maxTouchPoints: 0,
        onLine: true,
        getGamepads() {
          throw new DOMException('not allowed', 'SecurityError');
        },
      },
    });
    const app = { input: { mode: 'kbm' }, gpu: { renderer: 'Test GPU', kind: 'discrete' }, quality: { hz: 60 }, audio: { ctx: null } } as unknown as App;
    expect(() => watchApp(app)).not.toThrow();
    const f = diag.session.facts;
    expect(f.Game).toBeTruthy();
    expect(f.Device).toMatch(/^Windows, Chrome 130, 8 threads, language en-AU$/);
    expect(f.Input).toMatch(/controllers \?, mode kbm/);
    expect(f.GPU).toBe('Test GPU (discrete)');
    expect(diag.text()).toMatch(/sys {3}game started/);
    // the timers run against the half app without throwing
    expect(() => vi.advanceTimersByTime(25_000)).not.toThrow();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
