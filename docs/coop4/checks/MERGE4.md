# coop4 merge 4 - origin/master 4.114.0 (ee1abab6b) into feature/coop4 (from 909aa040c)

Why: clear PR #317's merge conflict (the one case where merging master into this branch is allowed).

## What conflicted and how it was resolved
| File | Resolution |
| --- | --- |
| `src/net/protocol.ts` | Master's `PROTOCOL_VERSION = 69`, coop4's `MAX_PLAYERS` doc comment (room cap = `PLAYER_SLOTS`, each mode takes `capacity(mode)`). The rest auto-merged: `COOP_MAX` 4, `COURSE_MAX` 2, coop4's `SECTOR_MAX` 4 and `capacity()`; no test asserts the number. |
| `src/net/session.ts` | Both imports kept: coop4's `playerSlots` (`SlotTable`, `PLAYER_SLOTS`, `isPlayerSlot`, `PlayerSlot`, all used) and master's `flags` (`roomMap` / `resumeMap` read `flags.marlowReplan`). |
| `scripts/run-e2e.mjs` | Master's `PARTS` rows (`e2e-ctcourse` 1-8, `e2e-sectorops` 1-9: F33 split solo campusOps into 6-9). coop4's 3-4 page parts move from 7-9 to **10-12** and stay named only (not in `PARTS`, so never in a full, quick or affected expansion). `PART_TIMEOUT` (coop4's; master has none) now names `e2e-sectorops:10` / `:11` / `:12` at 1800 s; master's solo 7-9 keep the default 600 s. Header comment: master's text plus the coop4 10-12 line. |
| `scripts/e2e-sectorops.mjs` | Header: master's 6-9 text plus coop4's 10-12 clause. coop4's blocks renumbered: `want(7)` four pages campusOps -> `want(10)`, `want(8)` warehouseOps drop / rejoin / late fourth / AI6 legs -> `want(11)`, `want(9)` OUT three pages -> `want(12)`; their comments too. Master's `want(7/8/9)` (S3 + H8, S4 + CR4 + S16, S5) untouched. |
| `docs/systems/testing-tools.md` | Master's text plus "`:10` to `:12` (coop4) only alone: `docs/systems/coop.md`". |

Also renumbered (not conflicted): `scripts/e2e-net-lib.mjs` (helper comment), `docs/systems/coop.md` "coop4 e2e parts",
`changes/feature-coop4.md`, `docs/coop4/STATE.md` (built line, the alone-request step), `docs/coop4/checks/e2e-build.md`
run line. Historical reports (laptop runs on 3f1c946f naming "sectorops 7, 8, 9", earlier checks, BRIEF / PLAN) are
left as written: they describe runs under the old numbers. No coop4 script in `scripts/laptop-queue` named the parts.

Alone run now: `E2E_GPU=1 E2E_LOAD_MS=240000 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-sectorops:10` (`:11`, `:12`).

## Checks
- `npm run typecheck:fast`: clean.
- `node --check` on `scripts/e2e-sectorops.mjs`, `scripts/run-e2e.mjs`, `scripts/e2e-net-lib.mjs`: OK.
- `npx eslint` on the three scripts and `src/net/protocol.ts`, `src/net/session.ts`: 0 errors (the scripts are in the
  eslint ignore list, so only the two src files are linted).
- `run-e2e.mjs --list`: plain, `--quick`, `--affected origin/master` (cap 3 and `--wide`) and `e2e-sectorops` all list
  sectorops 1-9 at most, never 10-12; `e2e-sectorops:10 e2e-sectorops:12 --list` lists those two.
- vitest, 53 files (`tests/e2eAffected.test.ts`, every coop / net / slot / session / protocol test file the branch
  touches, every test importing `net/protocol` or `net/session`): 985 / 986 pass; `tests/guardBody.test.ts` hit a 10 s
  `beforeEach` hook timeout under the 53-file load and passes alone (16 / 16).
- No e2e run (laptop queue only).
