# char-shadow-meter: plan check 2
Checker: Opus 5.5, 2026-10-25 19:08, PLAN at bd9cfb3f2, BRIEF at c9539acb0 (branch head f78af9cf0).
Verdict: PASS

## Check 1 fix list (all fixed)
1. Claims block: fixed. PLAN:118-143 lists every file S1-S5 name (checked row by row against PLAN:247-252), maps /
   protocol / save none; claims-check runs (below); section 3a (PLAN:301-330) gives an order or verdict per overlap.
2. Slice-branch overlap: fixed. Only S3 runs on its own branch and owns two new files no other slice names
   (PLAN:249, :254-255); its gameState hook is S3b on the job branch after S2 (PLAN:250); all lighting.md lines are
   S2's (PLAN:248), S5 no longer touches it.
3. "Done looks like": fixed, one observable entry per slice with flag-off and flag-on states (PLAN:259-289).
4. S5 text: fixed. Two strings chosen by the flag; the off string is #433's byte for byte (BRIEF:94-96, matches
   origin/feature/sector-ops-docs settingsScreen.ts:340); the on string matches `CHAR_SHADOW_PRESET` (low / medium 1,
   high 2, ultra 3, epic 4, src/world/charShadowSet.ts:46-52) and a test reads the table (PLAN:286-289).
5. S4 file: fixed. The card goes in J11's `e2e-parity.mjs` part 4 (Warehouse, J11 PLAN:124) after J11 PR B; never
   e2e-darkness (BRIEF A13, PLAN:251, :350-357).
6. A9: fixed. Walk areas Lighting, Sector Ops, Guard AI; switch-on trigger is the first release card with J10's L1
   re-bake, PR B and Guard AI's cue PR on master (BRIEF:72-79, PLAN:296-298).

## Intent
- ok: "Meter and guards read them" (BRIEF:8; ROADMAP:91 item 6; G352 DECISIONS:1985) is covered by S1 (field term)
  and S2 (meter for local and remote players; guards read the host's sample). Guard perception stays with Guard AI per
  FOLDED-PLAN:177 "G 1d split, Sector Ops PR first" (PLAN:372-382).
- ok: Q14 "A faint cue" (BRIEF:9, :14; ROADMAP:88; FOLDED-PLAN:83 options verbatim). S3 publishes data only; the
  behaviour is Guard AI's, suspicion only (PLAN:237-239). Not read wider than picked.
- ok: G315 quote verbatim with time (BRIEF:10-11 = DECISIONS:1759-1760).
- ok: A3 (more round shadows: partner, bodies, client guards) is needed so the picture shows what the meter reads
  (G352 "the real-time character shadows the picture shows"); it extends an existing look, is dark, and is walked with
  a look video (PLAN:395-396). Not a big look change needing a SIGNOFF.

## Gates
- ok: hard rules. No graphics reads (source-grep test, PLAN:166-168); no allocation (PLAN:263-264); no wire / save
  change (PLAN:141-142, :296); no src/net import (remotes come from MoveState already in gameState.ts:1675-1700); dark
  behind `charShadowLight` with every flag-off path today's (PLAN:298-299).
- ok: A6 (moon counted at Shadows Off) is the one near-Michael-only call; assumed and logged to the orchestrator
  (BRIEF:106-108, PLAN:388), per RULES "Intake" step 2 / G358.
- ok: A12 builds dark before J10; only GPU numbers and the walk wait for J10 (FOLDED-PLAN:177 "depends J10").
- ok: not a map job; no SIGNOFF needed before build.

## Claims
- claims-check (run at f78af9cf0): 27 overlaps. coop-kit (gameState, flags); guard-ai-mission-hooks, guard-rules,
  guard-rules-s1, guard-rules-s2 (flags, e2e-stealth-ai); hud-guidance, -a1, -a2, -a3 (gameState, e2e-coop, hud-guidance
  also testing-tools); light-realism (lighting.md); map-ready (flags, gameState, bakedLamps, lighting.md,
  testing-tools); player-batch-j19 (gameState, flags, e2e-coop); route-runs-2 (testing-tools); sector-marks (gameState);
  test-runner-j20 and -pra, -prc, -s1, -s2, -s3a, -s3b, -s4, -s5, -s6a, -s6b, -s6c, -s7 (testing-tools).
- All are jobs section 3a already settles (no shared lines, rebase order given). The 5 not in PLAN's count of 22
  (guard-rules-s1/-s2, hud-guidance-a2, test-runner-j20-s7, light-realism now with a block) are slice branches or the
  claims block of jobs already in 3a, same files. light-parity and coop4 have no claims block; 3a reads them by hand.
  The orchestrator settles the other-lead rows before build (RULES Intake 3).

## Slices
- S1 ~890 lines, ~4 h: ok.
- S2 ~440 lines (lighting.md ~35 not counted), ~3 h: ok.
- S3 ~480 lines, ~3 h: ok (see Polish 1).
- S3b ~25 lines, <1 h: ok.
- S4 ~390 lines, ~3 h: ok; waits on J11 PR B (named).
- S5 ~35 lines, <1 h: ok.
- PR A ~1.33k, PR B ~0.93k: under the cap. Flag with owner and an event trigger (A9); all areas at cap, so no date.

## Walk pacing
- Lighting 3, Sector Ops 3, Guard AI 5: all AT CAP (ROADMAP "Waiting on Michael"). ok: every slice builds dark; the
  switch-on waits for Michael's walk item (A9).

## Polish (does not change the verdict)
1. S3 builds from S1's interface commit with stub bodies, but its tests (wall cuts contrast, strongest sources) need
   S1's real `sourcesInto` / `sourceAt` / `transmitInto`. Say S3 merges S1's finished commits (no shared files) before
   its checker, or tests against a fake source.
2. Section 2 calls the interfaces exact but gives no `ShadowCues` fill method or its inputs, which S3b calls. Add the
   signature.
3. Section 4 may claim `scripts/run-e2e.mjs` for a part 5 (PLAN:356-357); that file is J11 C2's. Note it in 3a.
4. Section 3a: refresh the overlap count to 27 and the sha.
5. Parity table (PLAN:172-178) has no flashlight row. Torch shadows draw at every preset, Shadows Off included
   (`TORCH_SHADOW_PRESET.off` 256, src/world/torchShadowSet.ts:62), so parity holds; say so.
6. S2's probe and S4's card use the Warehouse, frozen by Q26 ("Freeze it"). Fine for tests (J11 part 4 is the
   Warehouse too); if the map is retired, the card moves with J11's.
7. Flag-on help: "Looks only: a shadow on you darkens the light meter..." can read as if shadows are looks only.
   Consider "This setting changes looks only: ...".
