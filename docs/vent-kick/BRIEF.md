# vent-kick - brief (T1, CT Core)

## Ask
Roadmap "Later > Test fixes" (orchestrator, 2026-10-22 ~20:05: a parallel spare job for CT Core once N2's PR is up):
"the keyboard vent: Space then an unseen E hold counts as a kick (T1, CT Core)".

## Background
- docs/ct-prototype/T1-TESTS.md, possible real bug 2: "Keyboard: Space then E held at a vent did not start the unscrew
  in the harness (pad equivalent works). Check by hand." e2e-traverse's keyboard vent block is skipped
  (`prototype: revisit`, scripts/e2e-traverse.mjs ~556-575).
- PR #22 (4.7.1): that block runs on real frames and sometimes opens the grate itself: Space starts the vent; when E's
  hold is not seen in time, the release counts as a kick (grate open, player attached). #22 worked around it in the test
  (fresh match before the kick check).
- Controls (G-decisions, anim-rework slice 1): A / Space is jump and traverse; at a vent prompt a tap kicks the grate in
  (quick, loud), a hold unscrews it (slow, quiet). Keyboard: E is the interact / action hold.

## Goal
1. Find whether a keyboard player can unscrew a vent in the real game (Space then E held, or whatever the keyboard
   binding for the vent hold is), and why the harness never sees the hold.
2. If it is a game bug: fix it in the input / traversal code so the keyboard hold unscrews like the pad's A hold, and a
   short press still kicks. If it is only the harness: fix the test.
3. Re-enable the keyboard vent asserts in e2e-traverse (progress shows while E is held, letting go early stops it, the
   grate is not kicked), and keep the #22 fresh-match guard only if still needed.

## Limits
Prototype rules (CLAUDE.md "Current goal"). No change to the pad path (lifted by M1 below). No wire change expected (the vent state already
syncs; check). Single test files in agents; e2e-traverse (+ e2e-mouse / e2e-pad if input code changes) under the desktop
lock at E2E_JOBS=1 or on the laptop.

## Assumed decisions
- A1 (implementer, CHECK should-fix 3): Space (jump) held alone at a vent unscrews (no E needed); a tap kicks. Since M1
  the same holds for the pad's Y. Undo: require interact for the unscrew in `ventStep` (`player/ventOpen.ts`).

## Michael's answers
- M1 (2026-10-22 ~21:00, relayed by the orchestrator; REPORT open item 1, the pad's 33 ms window): "Yes, match
  keyboard": holding Y does not kick, the hold carries into A, and a Y tap still kicks. Built in the fix round, with an
  e2e-pad vent assert. (This replaces the "No change to the pad path" limit above.)
