# PR2 lint check (PR #500, 23fa870eb)
Owner: Guard AI Build. Status: current.

Checker: fresh Opus 5.5. Scope: the lint fix on top of b78c1eab3, which passed checks A + B and the merge check
(PR2-MERGE-CHECK.md) and failed CI only on lint (tests/helmetRule.test.ts:22, `import()` type annotation,
@typescript-eslint/consistent-type-imports).

## Verdict: PASS

## What was checked
- `git diff b78c1eab3 23fa870eb`: two files. tests/helmetRule.test.ts adds `import type * as EnemyModule from
  '../src/ai/enemy'` and changes `importOriginal<typeof import('../src/ai/enemy')>()` to
  `importOriginal<typeof EnemyModule>()` (+2 / -1). docs/archive/guard-rules/checks/PR2-MERGE-CHECK.md is new (the merge check
  record). No source change, no behaviour change.
- The vi.mock still mocks the real module: `import type` is erased at compile, so it cannot load `src/ai/enemy` before
  the hoisted mock. The revive tests (`revived()`, lines 117-122, used at 243 and 251) only pass when `new Enemy` goes
  through the mock's `made.make`, and they pass.

## What was run (worktree C:/NightShift/Mobile-Coop-guard-rules, HEAD 23fa870eb)
- `npx eslint tests/helmetRule.test.ts`: clean (exit 0).
- `npx vitest run tests/helmetRule.test.ts`: 1 file, 15 / 15 passed.
- `npm run typecheck:fast`: clean (exit 0).
- CI on 23fa870eb (`gh pr checks 500`): build-check, check, lint, pr-size, test all pass; build and deploy skipped.
  affected-e2e (laptop-e2e/affected, 9 suites) was still queued when this was written: its own status gives that verdict.
