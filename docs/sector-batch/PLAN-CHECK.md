# sector-batch: plan check 1
Checker: Claude Opus 5.5 (fresh plan checker, did not write the plan), 2026-10-25 19:59, PLAN at 28a8720bb.
Verdict: FIX

## Intent
- Every J18 item (FOLDED-PLAN :179) has a slice: stars fill lower, Perfect, menu stars (B1); solo-route check (B2);
  door light at 15% (B3); visual-gate V13-V15 V17 and L18 (B5); M12 / Q20 (B4). The warehouseOps S3 crawl duct is
  rightly dropped by Q26 "Freeze it" (BRIEF ask 8, A22; ROADMAP Now row 16 "old warehouse FROZEN").
- "Michael said" quotes match DECISIONS verbatim (G146 :769-771, G331 :1874-1877, G280 :1494-1495, G41 :206-208) and
  ROADMAP Decided for Q20 "30 seconds then death and wait until next section door"; "Michael picked" Q26-Q28 match the
  clicked option text.
- Q20 is read as he said it: 30 s (`REVIVE_WINDOW` unchanged), then out, back at the next section door (connector
  cycle, A12). The no-syringe case joining the same wait (A12) and the last section ending without him (A13) are logged
  assumptions with undo. ok.
- B3 misreads the code it is fixing (BRIEF ask 5, A10, A11; PLAN B3; brief B3 step 3). G41's 15% is already built for
  the stick-driven door: `DOOR.driveShut` 0.15 (`src/world/doors.ts:51-53`; `drive()` :253 keeps `open` 0 under it,
  "body, light and sight shut, G41"), documented as built in `docs/systems/ai.md:11-12` and `docs/systems/movement.md:30`.
  A peek crack never moves `open` at all (`tests/doors.test.ts:23-31`, "light and sight see it closed"). So `DOOR_SHUT`
  0.05 -> 0.15 changes only the first 15% of an ordinary open / close swing. The change itself is wanted (G41 "replaces
  the 5% light cut in code"), but as briefed: the lighting.md line says sight at 15% is "Guard AI's, not built yet",
  which contradicts ai.md and movement.md; `ai.md:11-12` ("the light field's own cut ... stays `DOOR_SHUT` 0.05") goes
  stale and is not in B3's files; the B1 fragment and TESTING item announce "a peeking crack keeps the light out" as new
  when it is already so; A10 sends Guard AI a "sight half" gap that is at least partly built. Fix 1.
- A3 note (no change asked): kills persist through a restart but the alarm stage resets to the section's start, so a
  player can scrub an alarm by going down and still get Perfect. Logged with undo and listed for Michael's next look
  (STATE); acceptable.
- A19 note: Q28 asked "Who may accept a deliberate look change into the picture baseline?"; reading the first baseline
  as not a look change is defensible and logged for Michael. ok.

## Gates
- Hard rules: no static `src/net` import from single player (B4 goes through `NetHooks.returnOut` and
  `GameMode.onPlayerOut`, `g.net?.`); no protocol change (`revive` event and the `end` subtitle carry it; PROTOCOL_VERSION
  untouched); no save shape change (stars derived on read); hot path: `exitStep` adds a `Set.has`, no allocation. ok.
- `src/net` (B4): Opus builder (A17), two independent Opus checkers and affected-e2e incl. e2e-coop + e2e-netmove
  (PLAN 4; DIRECT_COVERS `src/net/` = COOP + e2e-sectorops, `scripts/e2e-affected.mjs:229`, `:102`). ok.
- Flag: `sectorOutWait` (`?sectoroutwait=1`), default off, owner Night Shift | Sector Ops Build, switch-on at Michael's
  next co-op Sector Ops walk, target 2026-10-28, removal named (PLAN 8, brief B4 step 1). ok.
- warehouseOps (Q26): no file under `src/world/maps/warehouse*` is edited. B4's e2e block and B5's so-corner rig read
  the frozen map (A21); B1 moves the main-menu counter off it. ok.
- No map or look slice: no sign-off or level-validator gate applies. B5 is gate tooling inside the visual-gate job.
- Dependency: J1 (#433) is still open; PR A / PR B reach master only after it, through the train. B3 must keep clear of
  #433's lighting.md hunk (it edits the G45 bullet :28-29 on master, not :25-27 as PLAN 6 says): fix 2.

## Claims
- claims-check (rerun 19:55 from the job folder after `git fetch`, exit 1): 34 plans with claims, 32 overlaps, all file
  overlaps, none on maps / protocol / save. PLAN 7 records 28; new since: `feature/hud-guidance-b`, `-b1` (same files
  as hud-guidance), `feature/light-realism-l0` (lighting.md). Branches and files:
  - char-shadow-meter (same lead): lightField.ts, flags.ts, gameState.ts, tests/lightField.test.ts, lighting.md. Its
    branch already appends `charShadowLight` at the end of `Flags` and `flags` (`flags.ts:67`, `:136` on master), the
    exact insertion points brief B4 step 1a uses: a sure textual conflict (fix 3). lightField.ts: theirs :17-20 import
    and :226-250, ours :22 and :28-29; adjacent to their import hunk, not overlapping.
  - guard-rules, -s1, -s2: flags.ts, sectors.ts, sectorMode.ts, coopHost.ts, tests/sectors.test.ts, e2e-sectorops (no
    code pushed yet; their PLAN lines differ from ours, PLAN 6). flags.ts: same end-of-list risk (fix 3).
  - hud-guidance, -a1..-a3, -b, -b1: gameState.ts, gameMode.ts, sectorMode.ts, coopHost.ts, coopClient.ts,
    e2e-sectorops, TESTING.md. Its pushed diff removes `blips` from `NetAttachment` (not `NetHooks`), sectorMode
    `blips()` (~:1355) and coopHost blips (~:1943): ours sit 15-25 lines away; `gameMode.ts:73` beside its removed
    member (PLAN 7: the second to land takes both). ok.
  - map-ready: flags, main.ts, gameState, briefingScreen, coopHost, coopClient, e2e-sectorops, lighting.md, TESTING (no
    code pushed; lines differ per PLAN 6). flags.ts end-of-list risk (fix 3).
  - coop-kit, player-batch-j19, player-hygiene, guard-ai-mission-hooks: flags.ts / gameState / coopHost / coopClient at
    their own lines; flags.ts end-of-list risk (fix 3).
  - sector-marks (same lead): gameState :728, coopClient :247, e2e-sectorops after :91, TESTING after :28, modes doc
    after :74. No shared line. ok.
  - light-realism, -l0 (same lead): lighting.md band lines. ok once B3 edits the right lines (fix 2).
  - test-runner-j20 and 13 slice branches: e2e-sectorops, other blocks. ok.
  - Not in the script (no claims block): campus-greybox (J17; no shared file), visual-gate* (B5's base), coop4*.
- Order: PLAN 7 says none forced. True for every overlap except flags.ts (fix 3).
- Claims block gaps: `changes/feature-sector-batch.md` and `changes/feature-sector-batch-out.md` (B1 step 5c, B4 step
  7c) are created but not claimed; `docs/systems/ai.md` must join with fix 1 (fix 4).

## Slices
- B1 ~190 lines, ~2 h: ok. Anchors checked on b81c4945 (its base): `sectorRecord.ts:67-71`, `sectors.ts:846-854` /
  `:861-866`, `sectorMode.ts:43` / `:1011` / `:1017-1021` / `:1239` / `:1396`, `main.ts:164` / `:257`,
  `briefingScreen.ts:57` / `:60`, `tests/sectorRecord.test.ts:50-53` / `:61`, `tests/sectors.test.ts:283`,
  `e2e-sectorops.mjs:123` / `:151-153` / `:163` / `:177`, TESTING `:46-48`, modes doc `:81-88`: all match. Every star
  reader goes through `starsOf` (main.ts via `starsFor`, `missionsScreen.ts:100`, `coopUi.ts:612`). Its fragment and
  TESTING text carry B3's wording: fix 1.
- B2 ~230 lines, ~2 h: ok. `doorFinder`'s leaf direction (sin yaw, cos yaw) matches `legCrossesDoor`
  (`sectorStage.ts:83-93`); `RoutePt`'s third value is y (`sectors.ts:65-66`); the S4 / S5 pair gates are at
  `campusS4Data.ts:203`, `campusS5Data.ts:183`. Note: S5's gate sits on L1 (y 4.2) and no S5 route has an L1 point, so
  S5 passes trivially (no declared route uses the gate): correct for G280, but only S4 can make the "rule bites" case
  bite.
- B3 ~45 lines (~70 with fix 1), ~1 h: FIX. `lightField.ts:22`, `:28-29`, `:443`, `bakedLamps.ts:584`,
  `torchShadowSet.ts:191`, `tests/lightField.test.ts:347-363` match; `docs/systems/lighting.md:23-24` does NOT: on
  b81c4945 and master the G41 bullet is `:26-27` (`:23-25` is the G333 bullet), and the brief forbids "lines 25 onward"
  (fix 2). Premise and docs: fix 1.
- B4 ~260 lines, ~3-4 h: ok in substance. B4 is cut from current origin/master (94e72b1c, train 98), not b81c4945; the
  code anchors are unchanged there (`coopHost.ts:571-581`, `:621-638`, `:1894-1921`; `sectorMode.ts:272`, `:812-827`,
  `:861-867`, `:1158`, `:1332-1338`; `gameMode.ts:73`; `gameState.ts:229`, `:524`, `:1057`; `coopClient.ts:618`;
  `flags.ts:67`, `:136`; `e2e-sectorops.mjs:754-983`; `e2e-ctcourse.mjs:271-279`; modes doc `:91-92`), but TESTING.md
  moved one line on master: the "Sector Ops restart" item is `:50-52`, so "insert after line 51" lands inside it (fix
  2). The brief's last check ("every changed branch behind `flags.sectorOutWait` or a no-op") contradicts its own step
  4a (the client "OUT" line in `sector` is unflagged by design, matching the host's own line in `goOut` :577): fix 5.
- B5 ~120 lines + proof docs, ~2 h plus laptop runs R1-R4: ok. `viewpoints.mjs:671-693` (so-corner, `leak` at :688) and
  the campus views `:256-452` match on origin/feature/visual-gate 07eefea0; zero `src/` diff.
- PR A ~465, PR B ~260: both under ~1.5k.
- STATE's PLAN pointers are stale (slices :10-23 not :9-21, files :25-91 not :23-104, e2e :108-131 not :128-147, claims
  :168-204, claims-check :209-235, flag :236-240): fix 6.

## Walk pacing
- Sector Ops: 3 unwalked, AT CAP. Stars fill, Perfect and the menu counter ship live as rule fixes to the shipped
  Sector Ops result and stars (G355; A1, logged for Michael); out-and-wait builds dark (`sectorOutWait`); B2 is a test,
  B5 gate tooling. ok.
- Lighting: 3 unwalked, AT CAP. `DOOR_SHUT` 0.15 ships live as the G41 rule fix ("replaces the 5% light cut in code").
  ok.
- No slice switches on a 4th unwalked feature in any area.

## Fix list (FIX only, ranked)
1. Correct B3's premise and its docs. BRIEF ask 5, A10, A11 and PLAN B3 / section 3 say that G41's 15% is already
   built for the stick-driven door (`DOOR.driveShut` 0.15, `doors.ts:51-53`, `:253`) and that a peek crack leaves
   `open` 0 (`tests/doors.test.ts:23-31`); `DOOR_SHUT` 0.15 only changes the first 15% of an ordinary swing, and the two
   0.15s become one threshold (B3 adds `expect(DOOR_SHUT).toBe(DOOR.driveShut)` to `tests/doorLight.test.ts`, or one
   constant reads the other). B3's files add `docs/systems/ai.md:11-12` (drop "stays `DOOR_SHUT` 0.05"). The
   lighting.md text states what is built for light and does not call sight "not built" against ai.md / movement.md (or
   names exactly which sight / sound path is still missing, with its file). B1 step 5's fragment line and TESTING item
   stop presenting "a peek crack keeps the light out" as new. A10's note to Guard AI names only what is truly unbuilt.
   - done looks like: BRIEF, PLAN and briefs B1 / B3 agree with `doors.ts:51-53` and `ai.md:11-12`; after B3 no doc on
     the branch says `DOOR_SHUT` is 0.05 or that a driven door's sight at 15% is unbuilt; a test pins
     `DOOR_SHUT === DOOR.driveShut`.
2. Fix the anchors that would stop a strict builder. Brief B3 and PLAN B3 row 4 / section 6: the G41 bullet is
   `docs/systems/lighting.md:26-27` (old text as quoted in B3 step 3), and #433 edits `:28-29` (the G45 bullet); B3 may
   touch `:26-27` only. Brief B4 step 7a and PLAN B4 row 10: on origin/master 94e72b1c the "Sector Ops restart" item
   ends at TESTING.md `:52`; give B4's anchors as "origin/master at the cut" with the TESTING insert placed by the
   item's text, or re-number to the head B4 is cut from.
   - done looks like: every file:line in briefs B3 and B4 matches the head each is cut from
     (`git show <base>:<file> | sed -n <lines>p` shows the quoted text).
3. Order the flags.ts overlap. Brief B4 step 1a inserts `sectorOutWait` at the end of `Flags` (:67) and `flags`
   (:136), where char-shadow-meter (same lead, already pushed), guard-rules, map-ready, coop-kit, player-batch-j19 and
   guard-ai-mission-hooks also append. Insert it beside `sectorGuards` instead (after `flags.ts:50` and `:128`), and say
   so in PLAN 7.
   - done looks like: brief B4 step 1 names the `sectorGuards` neighbours as the insertion points; PLAN 7's flags.ts
     line states the chosen spot and that no other open branch edits those lines.
4. Complete the claims and rerun claims-check. Add `changes/feature-sector-batch.md`,
   `changes/feature-sector-batch-out.md` and `docs/systems/ai.md` (fix 1) to the claims block; update PLAN 7 to the
   current run (32 overlaps; new `feature/hud-guidance-b`, `-b1`, `feature/light-realism-l0`) and PLAN 6's #433 line.
   - done looks like: `node scripts/claims-check.mjs --plan docs/sector-batch/PLAN.md --name feature/sector-batch`
     output matches PLAN 7's list, and every file any brief creates or edits is in the claims block.
5. Make brief B4's last check consistent with step 4a: name the `coopClient.ts:618` line as the one intended unflagged
   change (with the flag off the client shows "OUT - wait for the checkpoint" for the 2.5 s before the restart, as the
   host already does for itself in `goOut`), so the Opus builder does not stop on it.
   - done looks like: B4's "Checks" bullet lists that exception by file:line; nothing else is unflagged.
6. Refresh STATE's resume-block pointers into PLAN (sections now at :10, :25, :108, :168-204, :209, :236) after the
   PLAN revision.
   - done looks like: each `PLAN.md :<lines>` in STATE opens on the section it names.
