# Menus slider fix - state

**Now (2026-10-19):** test changed; verification running.

## Findings
- The repeat logic is correct: `NavRepeater` (`src/input/navRepeat.ts`, 0.4 s delay, 0.11 s interval) and
  `adjustHold` (`src/ui/focusNav.ts`, fast after 1 s, chain 0.5 s) match SPEC 4.2. No game change.
- Both read wall time (`performance.now()`) but only advance when a frame runs, so a stalled frame loses steps. A stall
  longer than `ADJUST_CHAIN_S` (0.5 s) between two repeats also restarts the hold, so fast needs another 1 s. That is a
  load artefact (at 60 fps repeats are 0.11 s apart); the test now waits on the condition instead.

## Done
- 2026-10-19: branch off master 7c950acc; BRIEF, STATE; e2e-menus holds right until fast > 0 and sfx > 0.2 (15 s cap).
