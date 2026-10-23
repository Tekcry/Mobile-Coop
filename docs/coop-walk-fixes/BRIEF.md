# coop-walk-fixes - BRIEF

Branch `feature/coop-walk-fixes` from `feature/pose-parity` 19248c01 (PR #223, PROTOCOL_VERSION 36). Lane: co-op /
`src/net`. Source: Michael's walk on 4.72.

## Michael's words (verbatim)

- A1 (P6, co-op hostage): "coop partner has takedown option when host is holding hostage, but it doesnt do anything.
  should trigger coop takedown"
- A2 (P6, co-op hostage): "if coop partner holds guard, host doesnt have option for takedown."
- A3 (P7, co-op audio): "coop player shooting doubles audio and doesnt sound suppressed."

## Goal

- P6 both ways: when either player holds a guard hostage (grab), the other player gets the takedown prompt and it
  performs the co-op takedown on that held guard. Host-authoritative.
- P7: a remote player's shot plays once (no local + replicated double) and with the weapon's suppressed sound when
  suppressed.

## Limits

- COMMON-27 rules. Wire change only if needed: then PROTOCOL_VERSION 37 and the tests that assert it.
- Tests: `tests/coopWalkFixes.test.ts` (Vitest), tsc, eslint; e2e-takedown (and an audio suite if one covers shots) on a
  desktop lane with `E2E_GPU=1`. No e2e-coop / e2e-netmove (laptop).
- Report: `docs/coop-walk-fixes/REPORT.md`; fragment `changes/feature-coop-walk-fixes.md`.
