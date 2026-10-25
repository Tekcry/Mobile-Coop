Verdict: PASS on 4c55947f (re-check round 1: F1 fixed; three tidy items left for the fold, non-blocking; first verdict on d5f76240 was FIX)

Lead fix round 1: F1 added (section 2, #387), recommendations 2-5 and every cosmetic item applied; re-check below.

# Checker: Conformance review, Guard AI (PR #423, head d5f76240)

Fresh Opus checker. Read: origin/master CLAUDE.md and VISION.md, the brief (origin/feature/menu
`docs/orchestrator/review-briefs/guard-ai.md`), ROADMAP "Decided" (origin/feature/menu), DECISIONS / bible /
level-design at 829a9332 (identical to current origin/master for those three files). Code read at 829a9332 (the PR's
base), ME = 00b6cde9c, C4 = 24ba2e51, MF = origin/feature/mission-framework. PR is docs only (6 files).

## What was checked
- Citations: every file:line in CONFORMANCE.md (about 95, ME / C4 / MF included) and about 70 more across all four parts
  (A, B, C, D). None is wrong in a way that changes a gap's existence, size or owner. Slips are listed under Cosmetic.
- Hard-rule rows (1a): all 7 hold. C1 (VISION 4.1, G352), C2 (VISION 4.10, G327; master period 4 at `animTier.ts:28,65`,
  `animTierView.ts:89` camera pass only), B1 (level-design 4.10 `:140` campaign "no heavies or dogs"; ME SPEC places two
  dogs with no logged assumption), D1 / D2 (CLAUDE.md hot paths, `conventions.md:31-34`), D3 (CLAUDE.md "ships dark",
  G308 "after the redesigned map is completed", G355), A1 (VISION 4.9 with G328 / G362; counts 8 / 12 / 16 / 20 / 24
  re-counted from the data).
- Michael questions (1e): all 9 are real missing or conflicting decisions (G335 vents, G352 silent on a shadow cue, G327
  "full rate" vs "counts as seen", G348 penalty form, civilian timing, campaign shields, G308 switch-on, bible 5.9 C5
  "open" vs built LKP, VISION 2 vs level-design profile for warehouseOps). No fix found that loosens a Michael-only rule
  without a question: B1, B3, B8 and B13 tighten.
- Totals: 39 IDs (1a 7, 1b 22 with the combined A6 / B15 / C7 / D11 row, 1c 10); sizes 22 S, 13 M, 4 L (C3 "S / M"
  counted S); 7 hard-rule rows; Q1-Q9. Part sizes and Michael flags match the folded table.
- G352 split (1d): one owner per side, shared files named (`charOccluders.ts` new, `gameState.ts:1660-1701`), as the
  brief asks; marked as a proposal for Sector Ops to confirm.
- IP (G6): no reference-game character, gear or organisation names in the 6 files. No em or en dashes.

## Findings

### Blocking
1. **#387 missing.** The brief's Scope names "open #387, #360, #317"; #387 appears nowhere in CONFORMANCE.md or the
   parts. It is "guard-ai: one-mover fix (a walker is never made flank beside a bounding point)", merged 2026-10-25
   01:18 UTC (released 4.101.1, ROADMAP Now 0b), so its code is on the base: `src/ai/squadRoles.ts:25,383,620`,
   `tests/oneMover.test.ts`. Fix: one line in section 2 (or a status line beside 1f) saying it merged and conforms (or
   the gap, if any).

### Recommended before the fold (non-blocking)
2. **D4 ranking.** D4's rule cell cites VISION 4.7 (hard rule 7) but the row sits in 1c, while D3 (same #317 trigger)
   and B1 (ME only) sit in 1a. Also the "1 player" half is not #317-dependent: on ME a campaign mission already starts
   for one player (ME `src/game/mission/sectorMission.ts:323-325` `Math.max(1, players())`; `missionDef.ts:185` is a
   data check only). Either move D4 to 1a (count 8) or cite G2 / VISION 2 Players row instead of 4.7 and say why it is
   not a hard-rule break (the per-section forced co-op gates, G292, may already stop a solo finish). Same question, smaller,
   for C4 (cites VISION 4.8, sits in 1b).
3. **A4 evidence.** "Between windows the remaining guard does not notice ... (only bodies or sight evidence alert him)"
   (`parts/A-patrols.md` A4) omits the squad radio check: about every 40 s a squad member down and not found is missed
   once and raises a `missing` incident (`docs/systems/ai.md:164-175`, `src/ai/enemyManager.ts:2255`); the campus pairs
   share a squad (`campusSectors.ts:50,65`, squad 1). The gap stands (G335 wants the pair itself to check on each other),
   size unchanged; fix the wording.
4. **Riot shields from S1.** Bible 5.7 (`docs/design-bible.md:570`) puts riot shields under "Later Sector Ops sections";
   code sends a shield lead from S1 (`src/ai/gear.ts:162`, `src/game/modes/sectorMode.ts:951`). The review leaves it as a
   note for Sector Ops, but the path is Guard AI's (`RESPONSE.shieldLead`). Bible outranks code: table it as a gap (S)
   with an owner, or as a question if G307 (3) is read as "every section".
5. **Section 2 coverage.** The brief's "Compare against" lists level-design 4.1-4.12 and 5.5; section 2 has no line for
   4.1 (jobs / reasons: `reason` tags stored), 4.5-4.8 (coverage, lures, bodies, searches) or 5.5 (lux bands vs the
   perception light curve). Add one line each, or mark them map-owned.

## Cosmetic
- `src/ai/guardAiData.ts:113` is `SQUAD_STOREY_M`; the 32 per-section keys are `MAX_GUARD_KEYS` at `:110`
  (`parts/A-patrols.md` A1 and Notes).
- `src/ai/enemyManager.ts:2850` is a comment on high-security posts; the dog (melee kind) `e.hear` is `:2849`
  (CONFORMANCE.md:112, `parts/B-archetypes.md` Conforms).
- A5 (CONFORMANCE.md:35, `parts/A-patrols.md`): `enemyManager.ts:2135-2141` is `pairWhyNot`, called by `buildPair`;
  name the function shown.
- `parts/C-perception.md` Notes: bible L11 "fewer lamps' shadows" is `docs/design-bible.md:288`, not `:286`.
- "606 commits behind master" (CONFORMANCE.md:90, `parts/D-response.md`): 595 behind the base 829a9332, 623 behind
  current origin/master; name the master commit counted.
- #360's head moved since the review: origin/feature/guard-ai-t1-anim-tier is now 155d68a31 (one commit: the look
  script moved to #414). C6's advice is unchanged; update the head in `parts/C-perception.md`.
- A1 range: CONFORMANCE.md:26 `campusS5Data.ts:33-74`, the part says `:33-75`.
- B11: "ME `tallowWharfMissions.ts:73`" is `src/world/maps/tallowWharfMissions.ts` (not under `src/game/mission/`); give
  the full path once.
- Brief scope files not cited: `guardShield.ts`, `helmetDrops.ts`, `guardHelmet.ts`, `dogModel.ts` (render only) and
  `dogHead.ts` (the dog's head hit volume from the sim, which supports "AI reads no graphics state"). One line in
  section 2 closes the file list.

## Re-check round 1 (head 4c55947f)
Scope: only `git diff d5f76240 4c55947f` (CONFORMANCE.md, the four parts, CHECK.md). Every new or changed file:line was
re-found on 829a9332 (ME on 00b6cde9c).

Fixed:
- F1 (#387): section 2 line added; `src/ai/squadRoles.ts:25,383,620` and `tests/oneMover.test.ts` hold. Blocking item closed.
- D4: rule cell now G2 / VISION 2 Players row with the G292 reason; the reason holds (ME forced co-op moves in
  `tallowWharfW1.ts:14`, `tallowWharfW2.ts:12`, `tallowWharfW3.ts:15`); `sectorMission.ts:323-325` holds. Stays in 1c: fine.
- A4: row and part A now name the squad radio check (`enemyManager.ts:2255`, `ai.md:164-175`); accurate; size unchanged.
- B16 (new, 1b): `docs/design-bible.md:570`, `src/ai/gear.ts:38,162`, `src/game/modes/sectorMode.ts:951` hold. Totals
  re-counted: 40 IDs (1a 7, 1b 23, 1c 10); 23 S, 13 M, 4 L; 7 hard-rule rows; Q1-Q9.
- Section 2 new lines: `src/ai/guardAiData.ts:94` (`reason`), `src/ai/enemyManager.ts:2849`, `src/ai/bodies.ts:32-48`
  (`bodyNotice` by distance, angle, light), `src/ai/searchArea.ts:53-78` (bounded radius, dark / cover score),
  `src/ai/enemy.ts:237-239`, `src/ai/guardShield.ts:7-8`, `helmetDrops.ts:1-5`, `guardHelmet.ts:1-7`: all hold.
- Cosmetic fixes: `guardAiData.ts:110`, `enemyManager.ts:2849`, `pairWhyNot`, bible `:288`, 595 behind 829a9332, #360
  head 155d68a31, `campusS5Data.ts:33-75`, the full `tallowWharfMissions.ts` path: all applied and correct.
- No em or en dashes; no reference-game names in the changed text.

Tidy before the fold (non-blocking: the gap table already carries B16, so the fold picks it up):
1. Section 3 per-map table still reads "Conforms" for `campusOps` S1-S3 with "shield + grunt per stage"
   (CONFORMANCE.md:145-147) and warehouseOps "as S1" (:150); add B16 there.
2. Stale "confirm" notes now superseded by B16: CONFORMANCE.md:158-159 ("Riot shields from S1 ... confirm") and
   `parts/B-archetypes.md:70`.
3. B16 has no row in `parts/B-archetypes.md` (the parts "win on detail"; part B still totals 15) and is missing from its
   owner list (`:68`); add the row (Guard AI code, Sector Ops data).
