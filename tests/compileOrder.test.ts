/**
 * (map-ready S14) The gate's compile order (`src/game/compileOrder.ts`): parallel starts the level and the guards at
 * quality + content, the player's own once the bodies are in, the rest once the other three started, never waiting on a
 * settle; serial is S2's order, each group after the one before settled; a started group is never due again.
 */
import { describe, expect, it } from 'vitest';
import { compileGroupsDue, compileOrderOf, GROUP_ALL, GROUP_GUARDS, GROUP_LEVEL, GROUP_OWN, GROUP_REST, type CompileDueInput } from '../src/game/compileOrder';

const inp = (o: Partial<CompileDueInput> = {}): CompileDueInput => ({ quality: true, content: true, bodies: false, started: 0, settled: 0, ...o });

describe('compileGroupsDue: parallel', () => {
  it('nothing is due before quality and content', () => {
    for (const [quality, content] of [[false, false], [true, false], [false, true]] as const) {
      expect(compileGroupsDue(inp({ quality, content, bodies: true }), 'parallel')).toBe(0);
    }
  });

  it('LEVEL and GUARDS at quality + content with the bodies not in; OWN when the bodies come', () => {
    expect(compileGroupsDue(inp(), 'parallel')).toBe(GROUP_LEVEL | GROUP_GUARDS);
    expect(compileGroupsDue(inp({ started: GROUP_LEVEL | GROUP_GUARDS }), 'parallel')).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_LEVEL | GROUP_GUARDS }), 'parallel')).toBe(GROUP_OWN);
    // all three at once when the bodies are already in
    expect(compileGroupsDue(inp({ bodies: true }), 'parallel')).toBe(GROUP_OWN | GROUP_LEVEL | GROUP_GUARDS);
  });

  it('REST only after the other three started, with none settled', () => {
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_LEVEL | GROUP_GUARDS }), 'parallel') & GROUP_REST).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_OWN | GROUP_LEVEL }), 'parallel') & GROUP_REST).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_OWN | GROUP_LEVEL | GROUP_GUARDS, settled: 0 }), 'parallel')).toBe(GROUP_REST);
  });

  it('a started bit is never returned again', () => {
    for (let started = 0; started <= GROUP_ALL; started++) {
      for (const bodies of [false, true]) {
        for (let settled = 0; settled <= GROUP_ALL; settled++) {
          for (const order of ['parallel', 'serial'] as const) expect(compileGroupsDue(inp({ bodies, started, settled }), order) & started).toBe(0);
        }
      }
    }
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_ALL, settled: GROUP_ALL }), 'parallel')).toBe(0);
  });
});

describe('compileGroupsDue: serial (S2 order)', () => {
  it('OWN first, once the bodies are in; nothing else before it settles', () => {
    expect(compileGroupsDue(inp(), 'serial')).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true }), 'serial')).toBe(GROUP_OWN);
    expect(compileGroupsDue(inp({ bodies: true, started: GROUP_OWN }), 'serial')).toBe(0);
  });

  it('LEVEL only after OWN settled, GUARDS after LEVEL settled, REST after GUARDS settled', () => {
    let started = GROUP_OWN;
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_OWN }), 'serial')).toBe(GROUP_LEVEL);
    started |= GROUP_LEVEL;
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_OWN }), 'serial')).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_OWN | GROUP_LEVEL }), 'serial')).toBe(GROUP_GUARDS);
    started |= GROUP_GUARDS;
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_OWN | GROUP_LEVEL }), 'serial')).toBe(0);
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_OWN | GROUP_LEVEL | GROUP_GUARDS }), 'serial')).toBe(GROUP_REST);
    started |= GROUP_REST;
    expect(started).toBe(GROUP_ALL);
    expect(compileGroupsDue(inp({ bodies: true, started, settled: GROUP_ALL }), 'serial')).toBe(0);
  });

  it('nothing is due before quality and content', () => {
    expect(compileGroupsDue(inp({ quality: false, bodies: true }), 'serial')).toBe(0);
    expect(compileGroupsDue(inp({ content: false, bodies: true, started: GROUP_OWN, settled: GROUP_OWN }), 'serial')).toBe(0);
  });
});

describe('compileOrderOf', () => {
  it('?compileorder=serial is serial; anything else is parallel', () => {
    expect(compileOrderOf('?compileorder=serial')).toBe('serial');
    expect(compileOrderOf('?autostart=campusOps&compileorder=serial&gfx=epic')).toBe('serial');
    expect(compileOrderOf('?compileorder=x')).toBe('parallel');
    expect(compileOrderOf('?compileorder=parallel')).toBe('parallel');
    expect(compileOrderOf('')).toBe('parallel');
  });
});
