# Smaller automatic test per change
kind: patch
- The automatic `affected-e2e` run on a PR head now runs at most 3 suites, the closest to the folders the change touches
  (`affectedPick` in `scripts/e2e-affected.mjs`); `src/net`, `src/save` and wire changes run exactly the co-op group
  (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`). The train's full run catches the rest; `--affected-max` /
  `E2E_AFFECTED_MAX` lift the cap (0 = no cap).
- The laptop queue re-files every open automatic affected request over the cap in place (same id and queue place), so
  the backlog drops at once.
