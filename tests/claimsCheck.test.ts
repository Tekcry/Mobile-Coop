import { describe, expect, it } from 'vitest';
import {
  PLAN_PATH, checkClaims, formatReport, isShared, lintClaims, overlapOf, parseArgs, parseClaims, parsePair, planJob,
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

  it('rejects template placeholders as errors and drops them', () => {
    const r = lintClaims(plan('files:\n  - <src/area/**>\n  - src/real.ts\nmaps: <map ids, or none>\nprotocol: none\nsave: none'));
    expect(r.claims).toEqual({ files: ['src/real.ts'], maps: [], protocol: [], save: [] });
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/files: template placeholder "<src\/area\/\*\*>"/);
    expect(lintClaims(plan('files: src/a.ts\nmaps: none')).errors).toEqual([]);
  });

  it('warns on indented lines without "- " and on claimed shared files', () => {
    const r = lintClaims(plan('files:\n  src/forgot-dash.ts\n  - src/ok.ts\n  - changes/feature-x.md\nmaps: none'));
    expect(r.claims.files).toEqual(['src/ok.ts', 'changes/feature-x.md']);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([
      'files: "src/forgot-dash.ts" ignored (list items start with "- ")',
      'files: "changes/feature-x.md" is a shared file (ignored; do not claim it)',
    ]);
  });

  it('reads a claims block indented as a whole (inside a list)', () => {
    const text = '# Plan\n- Claims:\n  ```claims\n  files:\n    - src/a.ts\n  maps: campusOps\n  ```\n';
    expect(lintClaims(text)).toEqual({ claims: { files: ['src/a.ts'], maps: ['campusOps'], protocol: [], save: [] }, errors: [], warnings: [] });
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

  it('never overlaps on shared files (changelog fragments, package files, STATE / HANDOFF, ROADMAP)', () => {
    for (const f of ['CHANGELOG.md', 'changes/feature-a.md', 'changes/**', 'package.json', 'package-lock.json', 'docs/coop4/STATE.md',
      'docs/a/b/STATE-S2.md', 'docs/orchestrator/HANDOFF.md', 'docs/orchestrator/HANDOFF-2.md', 'docs/ROADMAP.md']) {
      expect(isShared(f), f).toBe(true);
      expect(overlapOf(C({ files: [f] }), C({ files: [f] })), f).toBe(null);
    }
    for (const f of ['docs/coop4/PLAN.md', 'src/package.ts', 'docs/ROADMAP-old.md']) expect(isShared(f), f).toBe(false);
    const o = overlapOf(C({ files: ['package.json', 'src/a.ts', 'docs/x/STATE.md'] }), C({ files: ['package.json', 'src/a.ts', 'docs/x/STATE.md'] }));
    expect(o.files).toEqual([['src/a.ts', 'src/a.ts']]);
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

  it('treats plans with the same PLAN path as one job (slice branches never flag each other)', () => {
    const coop4 = plan('files: src/net/**\nprotocol: BodyCarry');
    const plans = [
      { branch: 'origin/feature/coop4', path: 'docs/coop4/PLAN.md', text: coop4 },
      ...['a', 'b', 'c'].map((s) => ({ branch: `origin/feature/coop4-${s}`, path: 'docs/coop4/PLAN.md', text: coop4 })),
      { branch: 'origin/feature/cr-1', path: 'docs/coop-real/PLAN.md', text: plan('files: src/ui/menu.ts') },
      { branch: 'origin/feature/cr-2', path: 'docs/coop-real/PLAN.md', text: plan('files: src/ui/menu.ts') },
      { branch: 'origin/feature/other', path: 'docs/other/PLAN.md', text: plan('files: src/net/session.ts') },
    ];
    const r = checkClaims(plans);
    expect(r.overlaps.map((o: { a: { branch: string }; b: { branch: string } }) => `${o.a.branch}|${o.b.branch}`)).toEqual([
      'origin/feature/coop4|origin/feature/other', 'origin/feature/coop4-a|origin/feature/other',
      'origin/feature/coop4-b|origin/feature/other', 'origin/feature/coop4-c|origin/feature/other',
    ]);
    expect(checkClaims(plans, { focus: 'origin/feature/coop4' }).overlaps).toHaveLength(1);
  });

  it('treats PLANs in one folder as one job (PLAN2 beside PLAN), a PLAN directly in docs/ as its own job', () => {
    expect(planJob('docs/guard-render/PLAN2.md')).toBe('docs/guard-render');
    expect(planJob('./docs/guard-render/PLAN.md')).toBe('docs/guard-render');
    expect(planJob('docs/PLAN.md')).toBe('docs/PLAN.md');
    const claims = plan('files: src/render/**');
    const r = checkClaims([
      { branch: 'origin/feature/gr', path: 'docs/guard-render/PLAN.md', text: claims },
      { branch: 'origin/feature/gr-2', path: 'docs/guard-render/PLAN2.md', text: claims },
      { branch: 'origin/feature/top-a', path: 'docs/PLAN.md', text: claims },
      { branch: 'origin/feature/top-b', path: 'docs/PLAN2.md', text: claims },
    ]);
    expect(r.overlaps.map((o: { a: { branch: string }; b: { branch: string } }) => `${o.a.branch}|${o.b.branch}`)).toEqual([
      'origin/feature/gr|origin/feature/top-a', 'origin/feature/gr|origin/feature/top-b',
      'origin/feature/gr-2|origin/feature/top-a', 'origin/feature/gr-2|origin/feature/top-b',
      'origin/feature/top-a|origin/feature/top-b',
    ]);
  });

  it('lists plan problems in the report', () => {
    const r = checkClaims([{ branch: 'origin/feature/a', path: 'docs/a/PLAN.md', text: plan('files: <src/x/**>\nmaps: none') }]);
    expect(r.problems).toEqual([{ branch: 'origin/feature/a', path: 'docs/a/PLAN.md', errors: [expect.stringMatching(/placeholder/)], warnings: [] }]);
    expect(formatReport(r)).toContain('ERROR origin/feature/a:docs/a/PLAN.md: files: template placeholder');
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
