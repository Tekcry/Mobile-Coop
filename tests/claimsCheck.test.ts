import { describe, expect, it } from 'vitest';
import {
  PLAN_PATH, checkClaims, formatReport, overlapOf, parseArgs, parseClaims, parsePair,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/claims-check.mjs';

const plan = (claims: string) => `# Plan\n\nSome text.\n\n## Claims\n\`\`\`claims\n${claims}\n\`\`\`\n\n## Slices\n- S1\n`;

describe('claims-check: parsing', () => {
  it('reads list items and comma lists; none means no claim', () => {
    const c = parseClaims(plan('files:\n  - src/world/maps/campus/**\n  - `tests/campus*.test.ts`\nmaps: campusOps, sectorOps\nprotocol: none\nsave: -'));
    expect(c).toEqual({ files: ['src/world/maps/campus/**', 'tests/campus*.test.ts'], maps: ['campusOps', 'sectorOps'], protocol: [], save: [] });
  });

  it('accepts wire / save shape aliases, comments and CRLF', () => {
    const c = parseClaims(plan('Files: ./src/net/carry.ts  # the new message\r\nWire: BodyCarry, CarryDrop\r\nSave shape: settings.optic'));
    expect(c).toEqual({ files: ['src/net/carry.ts'], maps: [], protocol: ['BodyCarry', 'CarryDrop'], save: ['settings.optic'] });
  });

  it('returns null without a claims block and ignores unknown keys', () => {
    expect(parseClaims('# Plan\n```ts\nfiles: x\n```\n')).toBe(null);
    expect(parseClaims(plan('owner: Player Build\nfiles: src/a.ts'))).toEqual({ files: ['src/a.ts'], maps: [], protocol: [], save: [] });
  });

  it('knows PLAN paths and branch:path pairs', () => {
    expect(PLAN_PATH.test('docs/guard-render/PLAN.md')).toBe(true);
    expect(PLAN_PATH.test('docs/guard-render/PLAN2.md')).toBe(true);
    expect(PLAN_PATH.test('docs/anim-natural/n4c/PLAN.md')).toBe(true);
    expect(PLAN_PATH.test('docs/guard-render/STATE.md')).toBe(false);
    expect(PLAN_PATH.test('docs/coop-real/PLAN-CHECK.md')).toBe(false);
    expect(parsePair('origin/feature/a:docs/a/PLAN.md')).toEqual({ branch: 'origin/feature/a', path: 'docs/a/PLAN.md' });
    expect(() => parsePair('nocolon')).toThrow();
    expect(parseArgs(['--plan', 'docs/x/PLAN.md', '--since-days', '3', 'b:p'])).toMatchObject({ plan: 'docs/x/PLAN.md', sinceDays: 3, pairs: [{ branch: 'b', path: 'p' }] });
  });
});

describe('claims-check: overlaps', () => {
  const C = (o: Partial<Record<'files' | 'maps' | 'protocol' | 'save', string[]>>) => ({ files: [], maps: [], protocol: [], save: [], ...o });

  it('finds overlapping globs and shared maps (case-insensitive)', () => {
    const o = overlapOf(C({ files: ['src/world/**', 'tests/a.test.ts'], maps: ['campusOps'] }), C({ files: ['src/world/maps/campus.ts', 'tests/b.test.ts'], maps: ['CAMPUSOPS'] }));
    expect(o.files).toEqual([['src/world/**', 'src/world/maps/campus.ts']]);
    expect(o.maps).toEqual(['campusOps']);
    expect(o.protocol).toBe(null);
  });

  it('flags two wire or save claims even with different names, and lists the shared ones', () => {
    const o = overlapOf(C({ protocol: ['BodyCarry'], save: ['settings.a'] }), C({ protocol: ['bodycarry', 'Ping'], save: ['settings.b'] }));
    expect(o.protocol).toEqual({ a: ['BodyCarry'], b: ['bodycarry', 'Ping'], shared: ['BodyCarry'] });
    expect(o.save).toEqual({ a: ['settings.a'], b: ['settings.b'], shared: [] });
  });

  it('returns null for disjoint claims', () => {
    expect(overlapOf(C({ files: ['src/a/*'], maps: ['x'], protocol: ['M'] }), C({ files: ['src/b/*'], maps: ['y'] }))).toBe(null);
  });

  it('compares every pair across branches, skips same-branch pairs, lists plans without claims', () => {
    const r = checkClaims([
      { branch: 'origin/feature/a', path: 'docs/a/PLAN.md', text: plan('files: src/world/**\nmaps: campusOps') },
      { branch: 'origin/feature/a', path: 'docs/a/PLAN2.md', text: plan('files: src/world/lamps.ts') },
      { branch: 'origin/feature/b', path: 'docs/b/PLAN.md', text: plan('files: src/world/lamps.ts\nmaps: marlow') },
      { branch: 'origin/feature/c', path: 'docs/c/PLAN.md', text: plan('files: src/ui/**') },
      { branch: 'origin/feature/d', path: 'docs/d/PLAN.md', text: '# no claims' },
    ]);
    expect(r.withClaims).toHaveLength(4);
    expect(r.withoutClaims).toEqual([{ branch: 'origin/feature/d', path: 'docs/d/PLAN.md' }]);
    expect(r.overlaps.map((o: { a: { path: string }; b: { path: string } }) => `${o.a.path}|${o.b.path}`)).toEqual([
      'docs/a/PLAN.md|docs/b/PLAN.md', 'docs/a/PLAN2.md|docs/b/PLAN.md',
    ]);
    const text = formatReport(r);
    expect(text).toContain('OVERLAP origin/feature/a (docs/a/PLAN.md) x origin/feature/b (docs/b/PLAN.md)');
    expect(text).toContain('src/world/** ~ src/world/lamps.ts');
    expect(text).toContain('no claims block: origin/feature/d:docs/d/PLAN.md');
  });

  it('with a focus branch reports only pairs that include it', () => {
    const plans = [
      { branch: 'origin/feature/a', path: 'docs/a/PLAN.md', text: plan('files: src/x.ts') },
      { branch: 'origin/feature/b', path: 'docs/b/PLAN.md', text: plan('files: src/x.ts') },
      { branch: 'feature/new', path: 'docs/new/PLAN.md', text: plan('files: src/y.ts\nprotocol: Ping') },
      { branch: 'origin/feature/c', path: 'docs/c/PLAN.md', text: plan('wire: Pong') },
    ];
    const r = checkClaims(plans, { focus: 'feature/new' });
    expect(r.overlaps).toHaveLength(1);
    expect(r.overlaps[0].b.branch).toBe('origin/feature/c');
    expect(formatReport(r)).toContain('both change the wire (PROTOCOL)');
  });
});
