status: done feature/mission-rules-r8 d4aa77e6ff06d7b3ef5b6e48b017842dd2ad4469

# campaign J7 R8: PR F e2e flips (Sonnet 5.5 or Opus)

Base: origin/feature/mission-rules-hud 3aa144a2fdb99de3ca434ac019322cdfcf11a727 (= -net 62b206d2a with PR E fix1 + R7,
plus R6). The cloud brief campaign-j7-r6-polish runs beside this one on its own branch (src only, no e2e files); the
lead merges both. New branch: feature/mission-rules-r8. Read
docs/systems/agent-preamble.md (origin/master) first. Only files: scripts/e2e-sectorops-mission.mjs,
scripts/e2e-sectorops-wharf.mjs. Read both suites whole first and reuse their hooks and wait helpers (no fixed sleeps).

## What to change (J7 plan slice R8)
R6 removed the always-on mission panel (`.mission-hud`, src/ui/hud/missionHud.ts deleted). Flip every assert that reads
it:
1. scripts/e2e-sectorops-mission.mjs (~:45-52) and the wharf suite's `clientHud` check (~:260): instead of the panel,
   assert the objective line (`.hud-objective`, not the `.hud-objective-hint` child) equals the current mission step
   text on host and client; after R7's broken-rule restart on TGC W2 it is the moved line "Take the grey coat with the
   black umbrella in the clock-mender's back loft" on both pages.
2. The field menu (pause screen Objectives list) lists the rules line first (counter "Rule", class `obj-note`) and then
   the section's steps (done / current / to do): open it through the suite's existing pause / menu helper, read the
   rows, close it. Read the real selectors from src/ui/screens/pauseScreen.ts (`objectiveRowState`, `OBJ_NOTE_DESC`).
   Also flip R7's `rowIs` helper in scripts/e2e-sectorops-wharf.mjs (~:295-300, reads `.mission-hud .mh-row`; used for
   the tgc-3 reading-room / moved-line rows on host and client), not only `clientHud` (~:317). Keep each row check's
   meaning: host and client show the reading-room line after the knock-out restart and the moved line after the kill.
3. Hints off by default: no `.hud-objective-hint` text unless the suite turns hints on.
4. R7 polish in the wharf suite (same file, small): add a banner recorder on the client page like the host's
   (`window.__banners`, ~:360-364) and assert the client also gets one SECTION RESTART banner after Teale's knock-out
   (~:433; relayed by coopHost.ts:308-313, shown at coopClient.ts:874); merge the two stacked JSDoc blocks on
   `restarted` (~:305-306); replace the `sim(500)` before "Teale asked" (~:475) with an `until` on the step being done.
Read real names from src (missionFeed.ts, hud.ts, pauseScreen.ts); never guess a selector.

## Checks (cloud)
`node --check` on both files; `npm run typecheck:fast`. The e2e itself is pending PC run (the lead requests
e2e-sectorops (all parts) and e2e-menus on the laptop queue).

## Done
Push feature/mission-rules-r8 (commits "mission-rules R8: ...", trailer "Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>"); report (asserts changed with line numbers, selectors used, deviations) at the end of this
brief. Never push to feature/mission-rules-hud.

## Report (Night Shift | Cloud Builder 3, 2026-10-26)
Branch `feature/mission-rules-r8` from 3aa144a2f, head d4aa77e6f (one commit, the two suites only, +100 / -23).
- **Selectors (read from src):** the objective line `.hud-objective:not(.hud-objective-hint)` (hud.ts: the hint is a
  sibling carrying both classes); the hint `.hud-objective-hint`; the field menu `window.__app.current.pause()`, then
  `.pause-screen [data-key="objectives"]` (focus + click, as e2e-menus), rows `.objectives-screen .ms-item` with the
  class `obj-note|obj-done|obj-current|obj-todo`, label `.btn-label` (widgets.ts `button`), counter `.ms-ctr`
  ("Rule" / "Done" / "Current" / "To do", pauseScreen.ts `objectiveRowState`); back `.objectives-screen
  [data-legend="back"]`, resume `.pause-screen [data-key="resume"]`. Expected step text from `window.__mission.runner`
  (the first open required step of its section, as missionFeed `missionCurrentStep`; `boltText` once `<id>-spooked`).
- **e2e-sectorops-mission.mjs:44-72:** the panel check is now: the current step is the badge step; `until` the objective
  line equals it (:55); no hint text (:59); the field menu has exactly the rule (obj-note, "Rule") then the badge step
  (obj-current, "Current", label = the step) (:67); back, resume, the pause gone.
- **e2e-sectorops-wharf.mjs:** helpers `objLineIs` (:299, both pages, plus no hint text), `fieldRows` (:312),
  `currentIs` (:325: objective line on both pages, and each page's field menu lists the rule first and exactly that
  step current), `currentLine` (:337). `clientHud` (:364) is now `currentIs(currentLine())` at the TGC and TKL starts
  (:437, :580). R7's `rowIs` is replaced by `currentIs` at the three tgc-3 checks: the reading-room line after the
  knock-out restart (:499), the moved line after the kill (:514) and after the decoy read (:527), on host and client.
  The header comment no longer names `.mission-hud`.
- **R7 polish:** a client banner recorder (:416, as the host's); after Teale's knock-out `until` the client has exactly
  one SECTION RESTART banner with `PROTECTED_LINE` (:490); the two JSDoc blocks on `restarted` merged; `sim(500)` before
  "Teale asked" replaced by an `until` on tgc-3 done (:533).
- **Checks:** `node --check` both files OK; `npm run typecheck:fast` clean. The e2e itself is pending PC run (e2e-sectorops
  all parts, e2e-menus).
- **Deviations / risks:** the mission suite expects exactly two Objectives rows at the start (the rule and the badge
  step); an optional step open in section 1 would add a row. `rowIs`'s step index argument is gone (the field-menu row is
  found by its label: its index depends on the done W1 rows above it).
