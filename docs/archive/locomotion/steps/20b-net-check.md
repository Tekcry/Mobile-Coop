# Step 20b - net check (D11, lite)

Model: implementer opus; checker opus. Depends on: 19 (step 20 dropped, M12: no e2e-bot; the Block C end follows this step).

## Read
- CLAUDE.md, docs/locomotion/RULES.md, DECISIONS.md D8 and D11 (verbatim).
- src/net: the local / test transport (grep -n 'class .*Transport\|local' src/net/*.ts), session.ts, protocol.ts.
- scripts/e2e-netmove.mjs, e2e-coop.mjs, scripts/e2e-net-lib.mjs, scripts/run-e2e.mjs.

## Task
1. Network conditions simulator in the local / test transport only (never the shipped path; a unit test proves the shipped transport has no simulator code path, e.g. it is not imported by the WebRTC / production transport): per-message one-way delay, jitter and loss, seeded and deterministic.
2. Presets: `typical` = 80 ms RTT (40 ms one-way), 20 ms jitter, 1% loss. Set by `?netsim=typical` (page param, dev / test only) or `E2E_NETSIM=typical` (passed by the e2e lib to the pages).
3. Messages that must arrive (committed moves, cstart / cdeny, team moves, takedowns, medkit, state changes) keep their delivery semantics: if the real transport is reliable-ordered, the simulator delays but does not drop them; loss applies only to channels that are unreliable in the shipped transport. Document what it does.
4. Run e2e-netmove and e2e-coop (both two-page; e2e-coop includes its third-page cases) once each under `E2E_NETSIM=typical`, REPORT mode (not a gate; do not add them to REQUIRED under netsim). Record per case: remote pose error, pops, rubber-banding, any committed move that failed or stuck, with numbers, in docs/locomotion/LOG.md and docs/locomotion/REVIEW-NOTES.md (feeds REVIEW.md).
5. Fix only clear breakages: a stuck or lost committed move, a drawn / holstered desync, a health or medkit desync, a pop over 25 cm. Each fix gets a unit test or an assert that runs without netsim too.
6. Everything else (tuning: interpolation delay, prediction windows, tolerances) goes to docs/locomotion/BIBLE-PROPOSALS.md as Phase 5 items with one-line reasons.

## Checks
- npm run lint, npm test, npm run build; `node scripts/run-e2e.mjs e2e-netmove e2e-coop` without netsim (all pass as before) and with `E2E_NETSIM=typical` (report).
- Grep proof: the simulator is unreachable from the production transport and from single player.

Commit: "locomotion 20b: network conditions simulator; net check under typical conditions"
