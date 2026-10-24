# S26 e2e-coop "the partner is heard" triage (Opus, 2026-10-24) - DONE

Failure (desktop, on 97da4fdf, S24 block all ok): run 1 `S26: no straight leg round the searcher (guard 17.4, -8.2,
yaw 1.58, spot 9.3, -10.3)`; rerun `ok - S26: undefined`, then `S26: before the run the client was last located more
than 1.5 s ago (locT 0.2; guard [17.18, -8.26], spot [9.25, -10.25])`. The block (Sonnet, 64e0dda6) had never passed.

## Verdict: test staging bug (no game change)
- **The block does not reuse S24's state.** It runs its own `startMode` and spawns its own guard. But it copied S24's
  OLD staging: the guard at (8, -6), the client hide (9.25, -10.25) in the service corridor and the host at (0, -14) in
  dispatch. The S24 triage (0a42c6b5) showed that from (8, -6) a guard's own combat cover picks (`pickCover`
  `src/ai/enemy.ts:2957`, `scoreCover` `src/ai/squadRoles.ts:318`) are corridor spots at x 6..11.8, z -9.5. Those spots
  see the corridor hide from 1-2 m and see dispatch through its glazed window. S24 moved its hides to the yard lane;
  S26 kept the old spots.
- **What happened.** The guard saw the client at the hide, so the client's last known position became the hide. Both
  failure dumps show the search spot (9.25, -10.25) = the hide. The searcher then walked to the client: at (17.2, -8.3)
  he is at the corridor door (z -8.8 wall gap x 18..19.1, `src/world/maps/warehouse.ts:249`). That broke the block two
  ways, depending on timing:
  - Run 1: no leg round a guard standing in a doorway.
  - Rerun: a fresh sighting of the client (`locT` 0.2) before the run.
- **The leg pick also depended on where the guard was.** It was taken 1 s into the search, while the guard was walking
  (searchers jog after combat), so the leg could fall behind a wall or out of reach. It also had to be more than 2.5 m
  from a spot that moves.
- **`ok - S26: undefined`** came from `assert(!leg.err, \`S26: ${leg.err}\`)`: the label was the error text, which is
  undefined when the assert passes.
- **AI per the brief:** fine. `hearFight` / `hearSearch` / `reportHeard` (`src/ai/enemyManager.ts:2622`, `:2660`,
  `src/ai/enemy.ts:1001`) do what S26 asks. The guard saw a hide that was in his sight.

## Fix (scripts/e2e-coop.mjs only, block at ~:1378)
- **Hides.** Both hides are now S24's dark yard lane spots: host [-3.75, -24.75], client [8.75, -24.75]. The host
  starts there. The S24 probe found no walkable cell inside the building with a line to either spot. So the last known
  position stays at the lamp (9, 3), the search happens on the factory floor, and the host's slot is never touched.
- **Leg picked at an arrival.** The host's step hook picks the leg on the step a searcher arrives at a search spot
  (within the search branch's 1.1 m, `spotLookT` in (0, 0.5)) with the client not located for over 1.5 s. It tries
  once per spot and falls through to his next spot, with up to 40 s to find one.
  - Placement: 2.2 m behind his look facing (`lookBase`; else beside him), 3 m long and walkable.
  - Every point is between 1.9 m and the jog reach: `tierOf` with reach 3 of ~3.4, so no wall is in the way. Past the
    1.8 m close range a dark client is never seen (light 0: rate under the leak), so he can be heard, not seen.
- **Guard held still.** On the pick the guard's brain is held off (the statues' `update` no-op), so the geometry
  cannot drift while the client is teleported onto the leg. The host must have the client on the leg first. Then the
  guard is let go (about 2.5 s of his look left) and the run starts.
- **Re-aim assert.** It was "spot within 2 m with `heardAt` < 99". Now `heardAt` must drop after the run starts (a
  re-aim on a noise), and his spot must move more than 0.5 m off his look spot to within 2 m of the client. This
  replaces the old "> 2.5 m from the spot" pick filter as the proof that the noise moved him.
- **Labels.** The leg assert now has a real label ("a searcher looking round at a spot with a straight leg behind him
  in a jog's reach"). On failure it dumps the level, spots tried, guard, spot and `locT`.
- **Unchanged.** The `locT` > 1.5 s, located-not-seen, still-hunts-the-client and host-slot-never-valid asserts, and
  the 6 s windows.

## Tests
- `node --check scripts/e2e-coop.mjs`: OK. No `src/` change, so no tsc or vitest run. No local e2e (laptop rule).
- Laptop rerun queued on 79f0de67 (set `s26-coop-fix`, suite `e2e-coop`, jobs 2): request
  `20261023T133619-night-shift-guard-ai-79f0de67-33d0`.

## Open items
- If the rerun fails at the new leg assert, the dump says whether no spot had room or the guard stopped searching.
- Pre-existing, from the S24 triage: cover is picked by straight-line distance, on the polish list.

## Round 2 (2026-10-24): laptop FAIL on c42e38f1 (79f0de67 + S25 merge), run and rerun
`S26: a searcher looking round at a spot with a straight leg behind him ... (level searching, 0 spot(s) tried, guard
12.7, -21.4, spot 8.8, -21.3, locT 0.23)`; rerun the same with the guard at (5.7, -24.8), spot (5.3, -25.3), locT 0.28.
That puts the searcher in the yard lane near the client's hide (8.75, -24.75), with the client freshly located.

### Cause: the radio alarm's response team, a staging gap (no game change)
- **The hook fields are fine.** `spotLookT` and `lookBase` exist on S26 (`src/ai/enemy.ts:377-378`, set at `:2471`).
  `picks` stayed 0 because the hook gates on the client not being located for 1.5 s (`locT` > 1.5) before it counts a
  try, and `locT` never got there.
- **The client sends no step noise while hidden.** `teleport` resets the controller velocity
  (`src/player/playerController.ts:351`), and there is no stick input, so `clientStepNoise` gives 0. A heard locate
  would also have moved the searcher's spot onto the client, but the spot was 3.5 m off.
- **The real source is the radio alarm.** The block turns the alarm panels off, but the contact call still owes the
  radio alarm (`RADIO_ALARM`, `src/ai/enemyManager.ts:85`; `contactThrough` `:769` -> command call -> `radioAlarm`
  `:2307` -> `raiseAlarm` `:750`). `onAlarm` (`src/game/stealthSystems.ts:647`) brings the response team in at the
  entry furthest from the host. With the host at (-3.75, -24.75), that is the yard lane at (18, -24.5)
  (`src/world/maps/warehouse.ts:524`), 9 m from the client's hide.
- **Why that locates him.** An alerted guard reports a player from a bare line of sight (`if (alerted && this.los)
  this.takeSighting(best)`, `src/ai/enemy.ts:2215`), dark or not. So the team keeps seeing the client in the open yard:
  his last known position moves into the yard, the S25 plan follows it, and the searcher walks there. Round 1 already
  had this alarm, but it showed up as a different failure first. S24's 10 s hide is too short for it.

### Fix (scripts/e2e-coop.mjs only)
- **No alarm run.** At setup the block sets `em.alarmRaised = true`, as e2e-stealth-ai's no-alarm runs do, and
  restores it in the `finally`. Its only other effect is `carryCalm` for calm guards (holstering), which plays no part
  here.
- **Diagnostics.** The hook counts the client's reports, seen (`seenT` reset) and located only (`locT` reset). The leg
  assert's dump now adds those counts, `alarmRaised` and the number of live unparked guards.

### Tests
- `node --check scripts/e2e-coop.mjs`: OK. No `src/` change. `e2e-stealth-ai.mjs` not touched (the S25 agent owns it).
- Laptop rerun queued on 531a65e9 (set `s26-fix4`, suites `e2e-coop e2e-netmove`, jobs 2): request
  `20261023T170644-night-shift-guard-ai-531a65e9-42ad`.
