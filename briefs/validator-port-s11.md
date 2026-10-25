status: done feature/validator-port-s11 41996e2f7b31ba3af133d720190b4ef1b7a67f26
# J12 validator-port, slice S11 (Opus-grade brief, small): a split leg may start with a co-op link from the fork

Lead: Night Shift | Marlow Build. Asked by Campaign Build (Tallow D0, 2026-10-26 ~10:10): Tallow's split `tgc-leads`
leg a is entered only by a `coop_boost` from the fork (the gallery ladder is bolted at its foot), so since master
2d9ad6f7 (split legs walk `soloArcsOf`) the validator prints `split tgc-leads leg a: no solo link leads into
w1-gallery`. Lead ruling (A28 below): both partners stand at the fork when they boost, so a co-op link that starts at
the fork may be one leg's entry. Detail: `git show origin/feature/tallow-d0:docs/tallow-fixes/val/D0-note.md`
section 5, ERR 2.

- Base: `feature/validator-port-c2` @ 17871b9fe6eafd04c28136583a4e0498e48e44dc (PR C's base for S9 / S10).
- New branch: `feature/validator-port-s11`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master); on the base, `scripts/level-validate.mjs` the split
  block (`fastest` :776, the leg loop :786-840) and the lib it imports (`soloArcsOf`, `arcsOf`, `COOP_KINDS`);
  `docs/level-validator/graph-schema.md` "How the checks read the graph" (split legs); `docs/level-design.md` 11.3.

## Only files to edit
- `scripts/level-validate.mjs` (the split leg block only)
- `tests/levelValidate.test.ts` (new cases in the split describe)
- `docs/level-validator/graph-schema.md` (the split-leg sentence only)
- `changes/feature-validator-port-s11.md` (new; `kind: patch`)

## Build
1. Leg entry. For each split, the fork is still the first space (file order) that leads into both legs; now it may lead
   into AT MOST ONE leg by a co-op link (a link whose kind is in `COOP_KINDS`, walked from its `from` end; respect
   `bolted` the way `soloArcsOf` does), as long as it leads into the other leg by a solo arc. A fork that reaches both
   legs only by co-op links does not qualify (after the boost one partner is gone and nobody is left to help the
   other). With no qualifying fork, the old fallback and ERR text stay exactly as today.
2. Leg time. The co-op entry link's time counts for that leg (`linkTime`; untimed gives the existing untimed WARN). All
   other hops stay solo-only (`fastest` unchanged for them).
3. Output. When a co-op entry is used, print one INFO line: `split <id> leg <a|b>: entered by <link name> (co-op, from
   the fork <space>)`, so a reviewer sees it.
4. Nothing else changes: parity, `split_max_s`, overwatch, assist, partner reach, rejoin as today.

## Unit tests (`tests/levelValidate.test.ts`)
- Leg a entered only by a `coop_boost` from the fork, leg b by a solo link: no ERR, the INFO line, leg a's time
  includes the boost's `time_s`.
- Both legs entered only by co-op links from the fork: the ERR as today.
- The co-op link `bolted` the wrong way (walkable only toward the fork): the ERR as today.
- An existing solo-entry split: output byte-identical to the base (the existing cases keep passing unedited).

## Checks
`npx tsc --noEmit -p .`; `npx vitest run tests/levelValidate.test.ts`, `tests/splitJump.test.ts`,
`tests/levelGraphs.test.ts` (report the base's known failures separately; no new one), `tests/changesFragments.test.ts`;
`node scripts/doc-lint.mjs` (0 errors). No e2e, no `npm run check`.

## Done
Push, write the report below (what changed with file:line, tests with counts, the INFO line text, deviations), set
`status: done feature/validator-port-s11 <sha>`.

## A28 (for the lead to add to docs/validator-port/BRIEF.md)
A split leg may start with a co-op link from the fork (Campaign Build's Tallow `tgc-leads`, 2026-10-26): both partners
are at the fork for the boost, then separate. At most one leg; the other leg needs a solo entry from the same fork; the
co-op link's time counts for its leg; an INFO line names it. Not a loosening of `docs/level-design.md` 11.3 (legs are
still walked alone after the fork). Undo: drop the co-op entry and let the ERR stand.

## Report (append below)

### Report (Night Shift | Cloud Builder 3, 2026-10-25 ~23:10Z)
Branch `feature/validator-port-s11` from 17871b9fe: 8cb6a4f9 (script + tests), 41996e2f7 (schema + fragment).
- `scripts/level-validate.mjs` (checkCoop only):
  - `:785-798`: `coopArcs`, the `COOP_KINDS` links (not `BOLTED_KINDS`), walked from their `from` end only, a `bolted`
    one never. `fastestCoop`, the twin of `fastest`.
  - `:817-832`: the solo fork is computed as before. Only when there is none: the first space (file order) that leads
    into one leg by a solo arc and into the other only by a co-op arc. `coopSide` records which leg is entered by co-op.
  - `:857-859`: on that leg's first hop, `fastestCoop` replaces `fastest`. The link's time counts for the leg (an
    untimed link gives the existing untimed WARN), and an INFO line is printed.
  - All else unchanged: parity, the 90 s limit, overwatch, assist, partner reach, rejoin, and the fallback and ERR
    text when no fork qualifies.
- INFO text: `split <id> leg <a|b>: entered by <link name> (co-op, from the fork <space>)`, for example
  `split x leg b: entered by link b-hall -> b-walk (coop_boost) (co-op, from the fork b-hall)`.
- Tests (`tests/levelValidate.test.ts:616-663`, 4 new in the split describe; the existing cases are unedited):
  - A co-op entry passes with no ERR (checkCoop and the full validate), prints the INFO, and the leg time includes the
    boost: at 25 s the ERR reads `23.1 s vs 37.0 s`.
  - Both legs entered only by co-op links: both `no solo link leads into` ERRs.
  - The boost `bolted`: the ERR as today.
  - base() (a solo fork): `{ errors: [], warns: [], infos: [] }`.
- Checks:
  - `npx tsc --noEmit -p .` clean.
  - vitest on levelValidate, splitJump, levelGraphs and changesFragments: 115 passed, 2 failed, both the base's known
    levelGraphs failures from S10's report: "set campus > the saved run is the level-validate CLI text" and
    "level-graphs runner > exits 1 on a count that differs". No new failure. levelValidate alone: 94 passed.
  - `node scripts/doc-lint.mjs`: 0 errors, 26 warnings, none in S11's files.
- Deviation (interpretation): a solo fork still wins over an earlier mixed one. A mixed fork is looked for only when no
  space leads into both legs by solo arcs, so every existing split's output stays byte-identical.
- For Campaign Build (information): this validator on `feature/tallow-d0`'s graph clears `no solo link leads into
  w1-gallery` with the INFO line. It then reports:
  - `split tgc-leads: legs 28.4 s vs 21.9 s differ by 23% (max 20%)`: the boost's 5 s replaces the ladder's 3 s on
    leg a.
  - `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`: on the real bolts the
    tea stall has no solo way up until A opens the ladder foot.
  - The W2 route ERR.
  These are graph matters for the lead, not S11's.
