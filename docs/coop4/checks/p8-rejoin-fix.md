# coop4 p8 rejoin fix (e2e-sectorops:8, laptop alone run on 3f1c946f)

Failure: leg "slot 2 drops and rejoins into slot 2 with its colour and its spot" timed out (30 s) on "the rejoined page
is put back where it stood"; page 2 stood at (-21.05, 0.02, -24.02). Everything before it in the leg passed (slot number,
same player id, slot 2 on the page and in the host list).

## Cause (one line)
Wrong test expectation: a Sector Ops rejoin whose match reloads is placed by the host at the current checkpoint on its
slot (the coop-rejoin rule, Michael's 4.82.0 walk item 7), not at its held spot; the leg asserted the held spot.

## Evidence
- Design: `docs/systems/coop.md:77-97` ("Host-decided (re)join spawn"): "The host places it with `joinSpawn`: Course and
  Sector Ops, the current checkpoint (`GameMode.checkpointSpawns`) at the client's slot ... Other modes: where its slot
  was held"; the held spot counts only when the reload lands within 3 m of it (`coop.md:96-97`).
  `docs/coop-rejoin/REPORT.md` (item 7): "in Course and Sector Ops this replaces 'back where held'". coop4's PLAN:36 lists
  `joinWatch` and `spawnSlots` as "N-ready (verified, no change)".
- Code: `src/game/spawnSlots.ts:227-236` `joinSpawn`: `sectioned` goes to the checkpoint and never reads `held`;
  `src/net/coopHost.ts:472-500` `joinStep` / `joinSpot` pass `sectioned` for `'sector'`; `src/net/joinWatch.ts`
  `state` -> `joinIsReload` (`spawnSlots.ts:276-291`): the reloaded state jumps ~18 m from the held spot into the
  section-1 start area, so it is a reload and gets placed.
- Numbers: warehouseOps section 1 start = its checkpoint (-20, 0, -24.6) (`src/world/maps/warehouseSectors.ts:27`).
  The laptop spot (-21.05, -24.02) is 1.20 m from it = the first ring (`SPAWN.rings[0]` 1.2, `spawnSlots.ts:44`):
  slot 2's checkpoint ring spot. The leg had moved page 2 to (-2.6, -18.9), ~18 m away, before the drop.
- Already pinned: `tests/spawnSlots.test.ts` "Course / Sector Ops: the current checkpoint at its slot point, never the
  level start or the held spot".
- Not a regression of 3f1c946f / b9d3a5f1: `JoinWatch.rehold` is called only from `returnOut` for a held OUT player
  (`coopHost.ts:662`); a plain drop goes `hold` -> `late` -> `joinStep` as on master. The leg was added in 06d16021 and
  had not reached this point on a laptop run before.
- The wording that misled the test: BRIEF A18 / coop.md:148 / PLAN:44 and :134 "slot, colour and place / spot held".
  The held place is kept (other modes, the 3 m rule); a Sector Ops reload still goes to the checkpoint.

## Fix (test and docs only; no `src/` change, `src/net` unchanged)
- `scripts/e2e-sectorops.mjs` part 8 leg renamed "slot 2 drops and rejoins into slot 2 with its colour, at the checkpoint
  on its slot": it now waits (30 s) for the rejoined page within 3.2 m of `__sector.debug().checkpoint` (the same ring
  bound as the late-joiner leg), asserts it there (message names the held spot) and asserts it does not stand on another
  operator (> 0.5 m from every connected player). Slot, id, host slot, back-in-play and beacon checks unchanged.
- `tests/spawnSlots.test.ts`: slots 2 and 3 rejoining in a sectioned run go to the checkpoint ring beside slot 0
  (within 2.3 m), never the held spot.
- Docs: `docs/systems/coop.md:148` and `docs/coop4/PLAN.md:44, :134` say a reloaded Sector Ops rejoin goes to the
  checkpoint on its slot. Marlow Yard rejoin unchanged (no code change).

## Tests
`npx tsc --noEmit -p .` clean; eslint on `tests/spawnSlots.test.ts` clean (the e2e script is eslint-ignored; `node --check` OK); vitest `spawnSlots`,
`coopRejoin`, `joinWatch` (`--maxWorkers=2`): 3 files, 52 pass. Laptop: rerun e2e-sectorops 8 alone (`E2E_LOAD_MS=240000`); a
scripts-only change, so 3f1c946f's other verdicts still count.
