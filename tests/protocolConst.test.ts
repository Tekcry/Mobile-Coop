import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '../src/net/protocol';

// release-speed item 2: the wire version lives on one line (src/net/protocol.ts); tests read the constant, never a number
const here = __dirname;
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
const tests = files(here);

describe('PROTOCOL_VERSION is read, not asserted as a number', () => {
  it('no test asserts the version as a literal number', () => {
    const bad = tests.filter((f) => /PROTOCOL_VERSION\)\.toBe\(\d/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });

  it('no hello send carries a literal numeric v', () => {
    const bad = tests.filter((f) => /\.send\(\{ t: 'hello'[^}]*\bv: \d/.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });

  it('is an integer of at least 40', () => {
    expect(Number.isInteger(PROTOCOL_VERSION)).toBe(true);
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(40);
  });
});
