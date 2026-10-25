status: claimed Night Shift | Cloud Builder 3 2026-10-25T23:40:42+11:00
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
