status: open

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
