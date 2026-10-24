# LR16-5 check B (co-op and determinism)

Commit bb47a985 (`feature/sector-redesign-lr16-5`), base 6eb6a863. Checker B, fresh Opus. Focus: `src/net`, the shared
clock, determinism, single-player import rule, hot-path allocation. Light parity / render is checker A's.

## Verdict: PASS

No blocking items. Nothing is broken, unplayable or rule-breaking in the co-op / determinism scope.

## What was verified
- **No wire change.** `git diff 6eb6a863 bb47a985 -- src/net` touches only `coopHost.ts` (+5: `simTime()` returns
  `this.time`, the field already sent as `snap.time`, coopHost.ts:1128) and `coopClient.ts` (+6: `simTime()` returns
  `this.clock.now(performance.now() / 1000)`, the same `ClockSync` the interpolation uses, coopClient.ts:161 / :304).
  `protocol.ts`, `netShared.ts`, `lampSync.ts`, `session.ts` unchanged; `PROTOCOL_VERSION` stays 38; nothing new is
  serialised. `tickFlicker` / `setFlicker` never bump `LightRegistry.version`, so `LampTx.step` (lampSync.ts:160, keyed
  on `version`) sends no extra `lamps` messages, and `courseMode.ts:495` (mains gates on `version`) is not re-run.
- **Single player never imports `src/net`.** `gameState.ts` adds only an optional method to the `NetAttachment`
  interface (:174); `world.ts` imports `./lampFlicker` (src/world). New imports in the diff: `lampFlicker` <- `import type
  { LightRegistry }`, `lights.ts` <- `./lampFlicker`, `world.ts` <- `./lampFlicker`. No non-type import of `src/net` outside
  `src/net` anywhere in `src/`.
- **Seed determinism.** Both pages call `World.create(..., { seed: opts.seed })` (gameState.ts:850) from the `start`
  message's `map` + `seed` (protocol.ts:168 / :724, session.ts:240 / :340; seed < 2^31, survives the clamp and floor).
  `applyMapFlicker` runs right after `map.build` (world.ts:232), before `b.build` / torches, on the same registry
  (`LevelBuilder.lights`), so the tube's registry id and `flickerSeed` are the same both sides; the lamp seed is
  `hash2` of (map id, seed, registry id), pure integer maths. No `Math.random` in any edited file. Scratch test: campusOps
  built twice from one start seed gives the same flickering ids, seed and values for 6000 steps. Rejoin re-sends the
  stored `start` (same seed), so a rejoiner rebuilds the same pattern.
- **Host guard reads the host's flicker.** Host step order (gameState.ts:1865-1889): `updateLight` -> `tickFlicker(host
  simTime)` -> `bodyLevel` for the local player and every remote (`r.light`, gameState.ts:1538-1548) -> later
  `enemyMgr.update` (sightRate on `ref.light`, `totalAt` for enemy.ts:177 / enemyManager.ts:953) -> `net.fixedUpdate`.
  So the host's guards read the same step's host flicker, for both players. Client's local meter reads the client's
  registry, ticked on the client's `ClockSync` estimate of the host clock.
- **Clock agreement (scratch test with the real `ClockSync`, 15 Hz snapshots carrying the post-step time, client steps
  off the host's grid):**

  | One-way latency / jitter | Client lag behind host (steps) | Stutter value equal at the same real time |
  | --- | --- | --- |
  | 0 / 0 | -1 (one ahead: snapshot time is post-increment) | 98.3 % |
  | 20 ms / 5 ms | 0 | 100 % |
  | 50 ms / 20 ms | 2-3 | 96.7 % |
  | 100 ms / 50 ms | 5-6 | 93.7 % |
  | 30 ms, host stalls 1.5 s | 0-1 once recovered | 98.3 % |

  So "within one step" holds only up to ~25 ms one-way; beyond that the client trails by its one-way latency, the same
  lag every host-authoritative state has (the `lamps` message, guards drawn at `now - INTERP_DELAY` 0.12 s, so the
  flicker is actually ahead of the guards the client sees). Snapping is stable: host time accumulated by `+= 1/60` for
  2 h rounds to the exact step index every step, and host and client produce identical doubles for one step index. The
  mismatches are only at stutter edges, each one latency long; guard perception is host-only, so no gameplay outcome
  depends on the client's value. Not blocking.
- **Edge states.** Before `start`: no GameState, nothing ticks. Before the first snapshot: client uses its local
  performance clock (offset 0) for at most one RTT, cosmetic. Pause / menu in co-op: the shared sim runs on (menuOpen),
  host time keeps stepping. Client tab hidden: its clock is `performance.now()` + offset, correct on return. Host tab
  hidden: see polish 2. Section restart (`SectorReset.apply` -> `resetTo`) and lampSync's `resetTo` never touch
  `flicker` or the flicker lists; the tube flickers again once lit. Full restart rebuilds the map (same tube, same seed).
  Campus: sections are not streamed, lights are all built at `map.build`, so the tube is found at load. No host
  migration exists (session.ts:44: the session ends). Solo: `this.net` is null, `tickFlicker(this.time)`, GameState's own
  fixed-step clock (gameState.ts:1649), so the GameLoop drives it.
- **Hot path.** `tickFlicker` measured 6.8 B per call for 5 lamps (builder's test, re-run here), under the 16 B one-boxed
  number budget; `flickerAt` / `fireAt` / `stutterAt` use the typed slots, no closures or temporaries. `writeFlicker` and
  `LightRig` allocate only the one `Int32Array` at the first write.

## Runs
- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run tests/lampFlicker.test.ts tests/coopFix.test.ts tests/coopTorches.test.ts tests/jammer.test.ts
  tests/jammerFixes.test.ts tests/net.test.ts tests/netSim.test.ts tests/sectorLampSync.test.ts
  tests/zz_chkB_flickerClock.test.ts --maxWorkers=2`: 9 files, 192 passed, 0 failed. (No `protocol*` or `lampSync*` test
  files exist; `sectorLampSync.test.ts` covers lampSync.)
- Re-run `lampFlicker` + scratch with console: 2 files, 27 passed; numbers above.
- Scratch test (uncommitted, delete or keep as wanted): `tests/zz_chkB_flickerClock.test.ts` in this worktree.
- Not run (per brief): e2e, GPU, build, `npm run check`.

## Polish list (non-blocking)
1. Comments overclaim the clock: `lights.ts` `tickFlicker` ("the client's estimate of the host's clock lands on the
   host's step"), `coopClient.ts:492-494` and the build report ("snapping absorbs the client clock's jitter"). True for
   jitter only; the client trails by one-way latency (2-3 steps at 50 ms). The builder's jitter test (+-4 ms, zero
   latency, no `ClockSync`) does not model it. Reword to "within the one-way latency, as every host state".
2. Host hitch / host tab hidden < 2 s: `ClockSync.observe` corrects a downward jump at 0.03 per snapshot, so the
   client's flicker runs up to the stall length ahead for ~10 s after. Pre-existing `ClockSync` behaviour (interp shares
   it), cosmetic.
3. `snap.time` is post-increment while the host flickers at the pre-increment time: a zero-latency client is one step
   ahead. Trivial; `simTime()` on the host could return `this.time + dt` equivalent, not worth a change.
4. Client before the first snapshot shows the flicker on its local clock (offset 0) for one RTT. Could fall back to
   `g.time` while `!clock.synced`; cosmetic.
5. Several client fixed steps in one frame read the same `performance.now()`, so they repeat one value then jump.
   Cosmetic (the picture samples once per frame anyway).
6. `this.net?.simTime?.()` returns a double through an interface call each fixed step: may box one heap number (16 B)
   per step on host / client. Not measured; negligible, inside the budget the builder's test uses.
