# coop-torches - brief

Job lead: "Night Shift | Course Ready Build" (desktop), from the orchestrator 2026-10-21 (~09:30; Michael approved).
Branch `feature/coop-torches` from master f7e89679 (4.30.0), folder `C:/NightShift/Mobile-Coop-coop-torches`. PR to master.

## The ask
Known gap: the co-op client never draws guards' flashlights; torch state is not on the wire.
- Put each guard's torch on / off (and its aim, if the client cannot derive it) in the host -> client snapshot,
  compactly; bump `PROTOCOL_VERSION` and the tests that assert it.
- The client draws the torch cone and its light as the host does.
- Light parity: the client's light meter reads the torch the way the host's guard perception does.
- An e2e-coop assert: the client sees a guard's torch on, then off.
- Co-op code stays in `src/net`, reached only through the dynamic import behind `flags.coop`.
- Checks: `npm run check`, e2e-coop, e2e-netmove; a PR; Character Build runs the full e2e.

## Assumed decisions
See STATE.md and the implementer report (`docs/coop-torches/REPORT.md`).
