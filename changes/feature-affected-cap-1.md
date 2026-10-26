# Affected e2e: one closest suite by default
kind: patch
- `affected-e2e` now runs one suite per PR by default (`AFFECTED_MAX` 1, G421, prototype mode), the closest to the
  change, matching RULES "Test tiers"; `src/net`, `src/save` and wire changes still run the whole co-op group. The
  laptop already ran with `E2E_AFFECTED_MAX=1`; this makes the code default, `request.mjs --affected` and
  `run-e2e --affected` agree.
