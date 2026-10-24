import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { fragmentNames, parseFragment } from '../scripts/changelog-assemble.mjs';

// Every changes/*.md (but README) must parse as merge-train will parse it at the train build, so a bad fragment fails
// the PR's CI instead of the train (train 39 lost a build on a fragment without its "# <title>" line). The rules live
// in `parseFragment` only.
const root = path.resolve(__dirname, '..');

describe('changes/ fragments', () => {
  it('every fragment parses with the train build parser', () => {
    const bad: string[] = [];
    for (const n of fragmentNames(root) as string[]) {
      try {
        parseFragment(fs.readFileSync(path.join(root, 'changes', n), 'utf8'), `changes/${n}`);
      } catch (e) {
        bad.push((e as Error).message);
      }
    }
    expect(bad).toEqual([]);
  });
});
