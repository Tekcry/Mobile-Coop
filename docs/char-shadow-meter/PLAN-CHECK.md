# char-shadow-meter: plan check 1
Checker: Opus 5.5, 2026-10-25 18:45, PLAN at 42d062147 (branch head cb236edf6).
Verdict: FIX

## Intent
- ok: "Meter and guards read them" (BRIEF:8, G352) is covered. S1 adds the field term, S2 wires the meter for the local
  player and remotes, and guards read `p.light` (src/ai/enemy.ts:2447, the host's meter sample). Guard perception and
  `fieldLight` go to Guard AI (PLAN:149-159), which is the FOLDED-PLAN J16 split ("G 1d split, Sector Ops PR first").
- ok: Q14 "A faint cue" (BRIEF:9, :14) matches FOLDED-PLAN:83 word for word. S3 publishes data only and leaves the
  behaviour to Guard AI ("suspicion only", PLAN:91-93). It does not read his pick more widely than he made it.
- ok: "Michael said" lines are verbatim with times (BRIEF:8-11).
- note: A3 (BRIEF:58-60) adds round shadows for the partner and bodies, and for guards on a client. Michael did not ask
  for this, but parity needs it ("read the real-time character shadows the picture shows", G352). It is dark, and the
  walk with the look video accepts it (PLAN:170-171). Kept, no change.
- finding (S5, PLAN:103; BRIEF:84-85): the new settings help says "a shadow on you darkens the light meter". The flag is
  off by default (A9), so this text would be false on master. It also keeps "Auto: on from High shadows", but
  `charShadowSpec('low'|'medium','auto')` gives 1 lamp (src/world/charShadowSet.ts:48-49, :58-63). That is the same
  error S5 fixes in lighting.md:225 (L16).

## Gates
- ok: the plan stays within CLAUDE.md hard rules. It never reads graphics state (enforced by a source-grep test,
  PLAN:27-29), hot paths do not allocate (PLAN:121, :125), it changes no wire or save data (PLAN:113), and it is
  dark behind `charShadowLight` (A9).
- ok: A6, the moon counted at Shadows Off, fits bible L11 ("the picture may show fewer lamps' shadows", design-bible:288).
  It is also logged for the orchestrator (BRIEF:91-92).
- ok: A2 (one capsule per character, so limbs and guns are picture only) is a parity approximation. Inside the umbra
  both read 0.15, and the undo is a fill change.
- ok: J16 depends on J10 (FOLDED-PLAN:177). A12 narrows that to "GPU numbers and the walk only", which is allowed
  because the build is dark and unit expectations are computed from the field. ROADMAP row 13 batches J10, J11 and J16
  under one gate, so the orchestrator should note it.
- ok: not a map or look job, so no SIGNOFF is needed before build. The A3 look change is accepted at the walk.

## Claims
- claims-check: FAILED. "docs/char-shadow-meter/PLAN.md has no ```claims block". The files are only in the slice
  table (PLAN:99-103).
- Manual scan of this job's own changed PLANs on branches active in the last day. These overlaps were not settled:
  - feature/light-parity (J11): `src/game/gameState.ts` (:1663 flicker, :1690 meter `bodyLevel`, which is S2's
    :1659-1701 region), `src/world/lightField.ts` (:240 cited), `scripts/e2e-darkness.mjs` (its C1 moves the
    Warehouse cards out to a new `e2e-parity.mjs`, while S4 adds a card to e2e-darkness), `docs/systems/lighting.md`,
    `docs/systems/testing-tools.md`.
  - feature/light-realism (J10): `scripts/e2e-darkness.mjs`, `docs/systems/lighting.md` (L5). It claims no change to
    lightField.ts.
  - feature/map-ready: `src/game/gameState.ts`, `src/world/bakedLamps.ts`, `src/core/flags.ts`, `lighting.md`,
    `testing-tools.md`.
  - feature/guard-rules: `scripts/e2e-stealth-ai.mjs`.
  - feature/player-batch-j19, hud-guidance, coop4: `scripts/e2e-coop.mjs`, `src/game/gameState.ts`.
  - feature/test-runner-j20, visual-gate: `scripts/e2e-darkness.mjs`, `testing-tools.md`.
- Inside the job, S2 and S3 run in parallel on separate branches (PLAN:110-111) and both edit `src/game/gameState.ts`
  (PLAN:100-101). S2 and S5 both edit `docs/systems/lighting.md`. That breaks "Slice branches of one job never overlap
  each other" (session-method Intake 3).

## Slices
- S1 ~840 lines, ~4 h: ok on size. No "done looks like".
- S2 ~430 lines, ~3 h: ok on size. No "done looks like". It overlaps S3 on gameState.ts.
- S3 ~500 lines, ~3 h: ok on size. No "done looks like". It runs in parallel with S2 on the same file.
- S4 ~390 lines, ~3 h: ok on size. No "done looks like". The e2e-darkness card may need to land in light-parity's
  e2e-parity.mjs instead.
- S5 ~20 lines, <1 h: no "done looks like". The text is wrong while the flag is off (see Intent).
- PR A ~1.27k and PR B ~0.91k: under the cap.
- Flag: `charShadowLight` has an owner (Sector Ops). Its switch-on is an event ("Michael's walk after J10's
  re-bake", PLAN:113-114), not a date.

## Walk pacing
- Lighting: 3, AT CAP. Sector Ops: 3, AT CAP. Guard AI: 5, AT CAP (ROADMAP "Waiting on Michael"). ok: every slice
  builds dark and switch-on waits for Michael's walk. A9 names only the Sector Ops cap, but this is a lighting feature,
  so it should name Lighting (and Guard AI for the cue).

## Fix list (FIX only, ranked)
1. Add a fenced ```claims block covering every file in S1-S5: the new files, `src/game/gameState.ts`,
   `src/world/{lightField,bakedLamps,charShadowSet}.ts`, `src/core/flags.ts`, `src/ui/screens/settingsScreen.ts`, the
   three e2e scripts, `lighting.md` and `testing-tools.md`. Also list maps none, wire none, save none. Re-run
   claims-check and send the overlaps to the orchestrator (light-parity J11 above all, since it is in the same
   gameState meter block and e2e-darkness). - done looks like: `node scripts/claims-check.mjs --plan
   docs/char-shadow-meter/PLAN.md --name feature/char-shadow-meter` prints its overlap list, and the PLAN names the
   orchestrator's order or file split for each overlap.
2. Remove the overlaps between slice branches: S3's gameState.ts hook either follows S2 on the same branch or moves to
   a follow-up after S2 is pushed, and S5's lighting.md lines either join S2 or wait for it. - done looks like: no two
   parallel slice branches name the same file.
3. Add "done looks like" to each of S1-S5. Make it observable: what a test or probe shows, and what is true with the
   flag off and with it on. - done looks like: every slice row (or a line under the table) has its own "done looks
   like".
4. S5 settings text: show the new help only when `charShadowLight` is on, or move S5 to the switch-on PR. Also fix
   "Auto: on from High shadows" to match the code (Low and Medium draw 1 lamp's outline). - done looks like: with the
   flag off the help reads as today, and the proposed text matches `CHAR_SHADOW_PRESET`.
5. S4: settle with light-parity C1 whether the character-shadow card goes in `e2e-darkness.mjs` or the new
   `e2e-parity.mjs`. - done looks like: S4 names the one file, agreed in the claims settlement.
6. A9: name the Lighting walk area (and Guard AI for the cue), and give a switch-on target date or say "the first walk
   card after J10 lands". - done looks like: the A9 / PLAN:113 flag line names the area and a date or release trigger.
