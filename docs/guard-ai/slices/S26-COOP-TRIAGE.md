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
