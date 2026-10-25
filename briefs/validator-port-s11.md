status: open
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
