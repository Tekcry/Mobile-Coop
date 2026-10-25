status: done feature/validator-port-s3 241c8b23df4bacd166404b0234552f34df686274
# J12 validator-port, docs slice D-A (Sonnet): docs for PR A2 (S0 lib + S3 measured checks)

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 10b613dd3). S0 and S3 both checker PASS.

- Base: origin/feature/validator-port-s3 at d2c2e4deb. Work ON that branch (no new branch); push each sub-step there.
  (PR A = S0 is #464; S3 ships as PR A2 right after it, size fallback, so D-A rides A2.)
- Read first: `docs/systems/agent-preamble.md` (origin/master); PLAN `git show origin/feature/validator-port:docs/validator-port/PLAN.md`
  docs table row D-A (~line 115) and the paragraph under the table (~:122-130: the A25 kinds rules); section 4 row
  3271ab1d (V6a schema additions); BRIEF A4, A5, A25, L2, V1, V2. The S3 schema text to fold is
  `docs/validator-port/fragments/S3.md` on your branch; V6's schema wording is on
  `origin/feature/level-validator-v6` (`docs/level-validator/graph-schema.md`, "Schema additions").
- Only files to edit: `docs/level-validator/graph-schema.md` (fold S3.md; V6a additions `area`, `vantage.at`, link
  `at`, `measured` incl. the per-file layout of `meta.measured` on multi-file maps; all six A25 kinds in "Link kinds",
  the five move kinds marked "no size band yet: the band row comes with the move's coop-kit PR", cited to ROADMAP
  Decided ~18:05 and Q25), `docs/level-design.md` (ONLY: in 11.9's graph-kind list add `vent_unlock` - the "a `bolted`
  door (unlocked from the far side after a vent or a throw)" wording becomes `vent_unlock` for the vent, `bolted`
  staying for the throw - cited to Q25; no other change to the level standard), `docs/level-validator/example.graph.json`
  (the V6 fields, so the example shows them; the validator output on it must stay 0 errors / 0 warnings without
  `--require-measured`), and `changes/feature-validator-port-s3.md` (one line on the docs). Delete
  `docs/validator-port/fragments/S3.md` once folded.
- Style: plain English, hyphens not em dashes, one home per rule (point to level-design / the scale sheet rather than
  restating numbers); doc headers `Owner: ... Status: ...` unchanged.
- Checks: `node scripts/doc-lint.mjs` (0 errors), `node scripts/level-validate.mjs docs/level-validator/example.graph.json`
  (0 / 0), `npx vitest run tests/levelValidate.test.ts tests/levelProfiles.test.ts tests/levelMeasured.test.ts
  tests/changesFragments.test.ts` (all green: some tests read example.graph.json).
- Report: append what changed; set `status: done feature/validator-port-s3 <sha>`.

## Report (Night Shift | Cloud Builder 3, Sonnet builder, 2026-10-26 ~00:20)
Pushed on `feature/validator-port-s3` (fast-forward from d2c2e4deb): 86e2b383 graph-schema + example + `git rm
docs/validator-port/fragments/S3.md`; 02089b7d level-design 11.9; 241c8b23 changes line.
- `docs/level-validator/graph-schema.md` (+~120 / -~20): spaces table `area` row, `vantage.at`, `measured` described
  (points to "Schema additions"); links table `at` row, `bolted` row (vent -> `vent_unlock`, `bolted` stays for the
  throw); "Link kinds" (l.139-153) six A25 rows, the five move rows "no size band yet: the band row comes with the move's
  coop-kit PR" (ROADMAP Decided ~18:05, G403, Q25) plus a paragraph (one INFO per kind used; `vent_unlock` takes the door
  rows, Q25); "How the checks read the graph" names the new kinds as the code does; new "Measured values
  (checkMeasured)" bullet (l.235-262, the S3 severity table checked line by line against `measured.mjs`); new "Schema
  additions (V6 greybox measurement)" (l.283-321: V6's field table + `meta.measured.splits.<id>` and `ways_back`, the
  per-file `meta.measured` layout and how `mergeGraphs` combines it, measurement definitions citing metrics keys).
- `docs/level-design.md` l.276-279 only (11.9 kind list): `vent_unlock` (the door a crawler opens from the far side after
  a vent, Q25), a `bolted` door now "after a throw". Nothing else in the standard.
- `docs/level-validator/example.graph.json`: `area` on all 10 spaces (V6's values), `vantage.at` on `s2-hall`, `at` on
  the first `s1-lane -> s1-yard` link; no `measured` blocks (tests require the example to have none).
- `changes/feature-validator-port-s3.md`: one docs bullet appended.
Checks: doc lint 0 errors (23 warnings, all pre-existing, none in these files); `level-validate.mjs
example.graph.json` 0 / 0 (2 "pending V6" INFO); levelValidate + levelProfiles + levelMeasured + changesFragments 134
passed.
For the lead:
- This branch is behind master (merge-base dae93b996). Master's 11.9 is worded differently (G403 moves, a Training
  sentence): the train merge will likely conflict on that one hunk; the intended result is the same swap (`vent_unlock`
  for the vent, `bolted` for the throw).
- G403 is cited on the five move rows (it exists on master, not on this branch; doc lint did not flag it). Drop it if you
  want the brief's citations only.
- Doc gaps left: the code also ERRs on a `ways_back` that is not a list or an entry that is not an object (not in the
  table); level-design section 15 still says "(V6, not live yet)" (outside this brief: D-C).
- V6's "level-measure writes the values" is worded "reaches master with validator-port PR B2" (the script is not on
  this branch). V6-PLAN cited at its archive path.
