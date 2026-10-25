import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const quarantine = JSON.parse(read('scripts/e2e-quarantine.json')) as {
  _doc: string;
  owners: Record<string, string>;
  quarantine: { suite: string; owner: string; expiry: string; reason: string }[];
};

// run-e2e.mjs runs suites on import, so read REQUIRED from its source text.
const requiredMatch = /const REQUIRED = (\[[^\]]*\])/.exec(read('scripts/run-e2e.mjs'));
const REQUIRED: string[] = requiredMatch ? JSON.parse((requiredMatch[1] ?? "[]").replace(/'/g, '"')) : [];

const backlog = read('docs/backlog.md');
const flakySection = (() => {
  const start = backlog.indexOf('## Flaky e2e suites');
  if (start < 0) return '';
  const rest = backlog.slice(start + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
})();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('e2e quarantine file', () => {
  it('reads the REQUIRED list from run-e2e.mjs', () => {
    expect(REQUIRED.length).toBeGreaterThan(0);
  });

  it('every REQUIRED suite has an owner', () => {
    for (const suite of REQUIRED) {
      expect(quarantine.owners[suite], `owner for ${suite}`).toMatch(/^Night Shift \| /);
    }
  });

  it('each quarantine entry is complete', () => {
    for (const e of quarantine.quarantine) {
      expect(typeof e.suite).toBe('string');
      expect(e.suite).not.toBe('');
      expect(typeof e.owner).toBe('string');
      expect(e.owner).not.toBe('');
      expect(typeof e.reason).toBe('string');
      expect(e.reason).not.toBe('');
      expect(e.expiry).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
      expect(Number.isFinite(Date.parse(e.expiry)), `expiry of ${e.suite}`).toBe(true);
    }
  });

  it('each quarantined suite is named in the backlog "Flaky e2e suites" section', () => {
    expect(flakySection).not.toBe('');
    for (const e of quarantine.quarantine) {
      const re = new RegExp(`(?<![\\w-])${escapeRe(e.suite)}(?![\\w-])`);
      expect(re.test(flakySection), `${e.suite} in docs/backlog.md`).toBe(true);
    }
  });

  it('_doc names the testing-tools heading, which exists', () => {
    expect(quarantine._doc).toContain('Flakes and quarantine');
    expect(read('docs/systems/testing-tools.md')).toMatch(/^#+ Flakes and quarantine/m);
  });
});
