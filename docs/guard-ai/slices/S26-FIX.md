# S26 fix round (Opus, 2026-10-23)

One fix round on feature/guard-ai-s26 at 4df6b4ba, after checks A and B (both PASS). No wire change, no save change:
`PROTOCOL_VERSION` and `SAVE_VERSION` untouched, every test that asserts them passes unedited.

## 1. Co-op client footstep noise (check B polish 2, the blocking-grade item)

Before: the host heard a client's steps from `r.ref.speed`, a speed estimated from snapshot position deltas
(`remotePlayer.ts:137`, `dt` floored at 1/60, capped 11 m/s). Bunched packets made a crouch-walking client step
audibly, and S26 now uses such a step to locate him; a `moveClient` teleport spiked it to ~16 m reach (the ~1 in 5
flake at `e2e-coop.mjs:1333`).

Now:
- `src/net/validate.ts:185` `clientStepNoise(s, settled)` (pure, Babylon-free, no allocation): the host player's own
  rule (`gameState.ts:1905`: `noiseRadius(c.speed, c.crouched || c.steps === 'crouched')` when grounded and not
  silent) on the client's own sent state. `s.speed` is the client controller's `speed` (`coopClient.ts:827`), the
  same input the host's rule reads. Wire bits: `PF.grounded`, `PF.silent` (= steps 'silent'), crouch band =
  `PF.crouch` (= `c.crouched`) or `PF.driven` (a traversal-driven move that is not silent is steps 'crouched',
  `playerController.ts:430`) or `mv.m === 'wall'` (the step 11 wall-slide band, kept). Same `noiseRadius`, so the same
  G40 silent band. Speed capped at `MAX_FREE_SPEED` (the old bound). `settled` false: 0.
- `src/net/remotePlayer.ts:43` `stepOk`: set in `accept` (`:129`) to "a previous state existed and this one moved no
  further than the plausible-move bound `max`" (so a teleport, respawn, rejoin restore or clamped claim is never a
  step), and cleared on a host-driven move: `moveTo` (`:179`, the camera hallway send-back) and `revive` (`:278`),
  where the copy sits at a new spot under the old state's speed until the client's next state.
- `src/net/coopHost.ts:1299` `remoteNoise` steps: `clientStepNoise(st, r.stepOk)` replaces the inline rule (the
  `noiseRadius` import moved to `validate.ts`). `r.ref.speed` is unchanged and still feeds perception's motion factor
  only (out of scope; same estimate as before).
- Host player: untouched (`gameState.ts` not edited), so byte-identical.

## 2. A flashbanged guard is deaf (check B polish 1)

`src/ai/enemyManager.ts:2624` first line of `hearFight`: `if (e.blindT > 0) return;`. While blinded a searching or
fighting guard does not walk to a noise, locate its maker or bark "I heard something." Calm guards are unchanged.

## Tests and results

- `npx tsc --noEmit -p .`: exit 0. ESLint on the 6 changed files: clean.
- `tests/net.test.ts:492` new describe (4 tests): a crouch-walk is never heard for every speed up to
  `NOISE_QUIET.crouch` (crouched, driven, wall) or a walk up to `NOISE_QUIET.stand`; equals `noiseRadius(speed,
  crouched)` across 0..11 m/s for each stance mapping; silent / airborne / not settled give 0 at any speed; the parsed
  wire speed is used and capped.
- `tests/combatHearing.test.ts:319` new: a blinded guard in combat and a blinded searcher: no ray, no locate, no walk,
  no bark; once the flash wears off he hears the next step.
- Vitest, 13 files (net, combatHearing, hearing, coopPerception, coopWalkFixes, coopGuardAi, coopGuardCarry,
  crateWire, hangDownNet, jammer, jammerFixes, moveState, poseParity; every `PROTOCOL_VERSION` file included):
  254 / 254 pass (net.test rerun alone after one loop fix in the new test: the float step overran the band).
- Not unit-tested: `stepOk` in `RemotePlayer` (Babylon class, no test harness); covered by the e2e below.

## e2e for the lead to queue

- `e2e-coop` (src/net changed; the S24 two-intruders hide at `:1333` should no longer flake; rerun it 3 times if a
  flake check is wanted) and `e2e-netmove`.
- `e2e-stealth-ai` (the `hearFight` blind line).

## Not done / left on the polish list

- Client steps still lack the host's `SURFACE_NOISE` and suit `noise` factor (pre-existing; the suit is not on the
  wire, the surface could be read host-side from the client's feet in a later slice).
- No staleness cut: if a client's states stop arriving, its last state's speed still steps at its last spot (as before).
- Perception's `ref.speed` for clients is still the snapshot-delta estimate.
- Check B polish 3-9 and check A notes untouched.
