# S26 check B (adversarial, fresh Opus, 2026-10-23)

Verdict: PASS

Checked: feature/guard-ai-s26 at 1fcab6e3. S26's own diff (`git diff origin/feature/guard-ai-s25 1fcab6e3 -- src tests
scripts`) plus the merge 1fcab6e3: its only conflict is the `buildPlan` doc comment in `src/ai/enemyManager.ts`, merged
correctly (S25b's moved-centre rebuild text kept, S26's `areaRadius(locT)` note kept, and the code reads `locT`). Read
against S26.md, the cloud builder report, the agent preamble and the CLAUDE.md hard rules.

Runs: `npx tsc --noEmit -p .` exit 0. Vitest on 17 affected files (combatHearing, intruders, searchAreaWiring,
searchArea, hearing, twoIntruders, squadWiring, incidents, sweep, responseWiring, postsWiring, coopPerception,
bodySearch, deviceTrip, urgency, radioWiring, sectionAlert): 254 / 254 passed. No e2e run (as instructed).

## Blockers

None. Nothing is broken or unplayable and no hard rule is breached:
- Hot paths: `hear`, `hearFight`, `reportHeard`, `hearSearch` and the `update` throttles allocate nothing. They use
  `hyp2` / `hyp3`, with typed-array per-slot timers made once, and the cell centre inlined in place of the allocating
  `nav.center`. No `Math.hypot` in src.
- Wire / save: none. `coopHost.ts` only passes `r.ref.id` at three call sites. `PROTOCOL_VERSION` and `SAVE_VERSION`
  are untouched. The bark is the existing `investigate` line.
- Undo switches hold: parked modes (`!coordinated`), `!stealth` and `COMBAT_HEAR.enabled` false all take the old path.
  The old `e.alerted` skip still runs after the new branch, and melee kinds keep `e.hear`. Test (i) covers this.

## Edge cases tried (all hold)

- Down / grabbed / held: a knockout makes `alive` false, and grab, hostage and interrogation are all `taken`. All are
  skipped before `hearFight`. `heardT` ticks before `update`'s `taken` early return, so the throttle never sticks.
- No maker (`by` null): in combat the act is 0 and the early-out runs before `hyp3` or any ray. A searcher walks to it
  (act 1) and nobody is located.
- Fifth player (`slotFor` -1): no report, no hunt change.
- Two intruders: `reportHeard` moves only the maker's slot. The hunt switches only when the guard has no hunt, it is
  his own hunt, or his own slot's `locT` >= 8 s. A heard-only slot nobody hunts is forgotten on the next `forgetStep`
  (`seenT` 99 > `forget`). That is harmless: the mirror flips to it for one step only.
- Off grid / unreachable: `nearestWalkable(.., 4)` returns -1 and the raw spot is kept. `goTo` fails, then the existing
  "unreachable: skip it" bumps `searchK`. Repeats are limited by the 1.5 s re-aim gap, and `findPath` has its
  3000-node budget and the 1 s `routeT` replan throttle. Search length is time-based, so skips do not end the search
  early.
- Through a wall: `tierOf` as S1 (the ray only where the wall decides the tier). Test (b) covers it.
- Re-path storms: one re-aim per guard per 1.5 s; one heard report per slot per 1 s unless it moved 1.5 m. The slot
  flow rebuild keeps its `FLOW_MIN` 0.5 s cap, the same cap sightings already hit.
- S25 plan reset on every report: while a player keeps making noise more than 1 m from the plan centre, the plan sits
  at `builtAt` -1 until the slot's flow is rebuilt round the new spot. Searchers fall back to the ring
  (`searchPointFor`'s S25b guard), and an orphaned plan point's `finishBy` is a no-op. This degrades gracefully; it
  does not break.
- S25b moved-centre rebuild: the explicit reset is redundant with it but consistent (both drop `done` points). No
  double-claim path.
- Leashes: a high-security post's spot is re-clamped every frame by `clampToLeash` after `hearSearch`, and in combat
  `inLeash(known)` holds him. A room `hold` and a device `searchRoom` clamp the same way. A sweeping crew reports but
  keeps its stack (no `hearSearch`, no claim release).
- Reviving searcher: the reviving branch overwrites `spot` each frame, so the heard spot is lost. He finishes the
  revive, then "arrives" at the body. Harmless.
- Teleports in e2e: `t.tp` / `controller.teleport` give the host no step (speed comes from controller velocity), so
  'lkp' and 'search area' stay as they are.

## Likely e2e retunes (by design or by artefact)

1. `scripts/e2e-coop.mjs:1333` (S24 two-intruders hide, `moveClient(B, hide.client...)`), asserted at `:1350`
   (`c1.seen.every((n) => n === 0)`). On the host, a client teleport gives the client a speed spike from snapshot
   deltas (`src/net/remotePlayer.ts:137`, up to `MAX_FREE_SPEED` 11 m/s, so `noiseRadius` is about 16 m). If the 0.25 s
   `remoteNoise` tick lands on that snapshot (roughly 1 in 5), pair 2 (in combat, 4.3 m away through the z -8.8 wall,
   16 x 0.45 = 7.4 m) locates the client at the hide spot and walks round to it. The "no pair guard sees a player
   during the hide" assert can then fail intermittently. `kOwn` / `kOther` / `wrong` still hold. Fix in the test:
   `teleportGrace`-style quiet (zero the remote speed for the teleport snapshot), or see polish 2.
2. The brief's new 'heard in a search' scenario (`e2e-stealth-ai`) and the "the partner is heard" scenario (`e2e-coop`)
   are not written yet (the builder was told not to write them). The lead adds them.
3. No other assert found that this changes. Grepped `setMove`, `moveClient`, `em.hear(`, `searching`, `lkp`, `ghost`
   and `alert()` across e2e-stealth-ai, e2e-sectorops, e2e-ctcourse, e2e-coop, e2e-takedown, e2e-tactics,
   e2e-enemies, e2e-security and e2e-gadgets. Every movement near a non-calm guard is one of three kinds: a teleport,
   a 0.6-stick silent walk (`e2e-coop.mjs:1178`, guard sees the client: act 0), or with frozen / passive guards
   (`e2e-takedown.mjs:134-162`, `e2e-ctcourse.mjs` duty guard passive). Direct `em.hear` calls
   (`e2e-stealth-ai.mjs:285,291,324`, `e2e-sectorops.mjs:2284,2330`) reach calm guards only. 'lkp'
   (`e2e-stealth-ai.mjs:474-548`) stays a pass: teleport, standing still, no step noise.

## Polish (ranked)

1. A flashbanged guard locates by ear. During `blindT` he has `los` false, so a body noise in reach reports the slot
   and moves the whole group's last known position. A searching blind guard also barks "I heard something." with his
   hands on his face. Running past a flashed guard gives you away to his squad. Suggest skipping `hearFight` while
   `blindT > 0` (a flash also deafens).
2. The client's noise uses a jittery speed estimate. The host reads `noiseRadius(r.ref.speed, ..)`, which comes from
   snapshot deltas; `dt` is clamped to 1/60, so bunched packets inflate the speed. A crouch-walking client can produce
   phantom audible steps. Before S26 that cost a calm guard's glance; now a searcher or fighter locates him, against
   the brief's "a crouch-walk is never heard". The client's own `speed` is already on the wire (`protocol.ts:71`,
   `:319`) and could be used instead, with no wire change. The client's steps also skip `SURFACE_NOISE` and the suit's
   `noise` (pre-existing).
3. In combat, B's noise does nothing while he hunts a fresh A. The brief says "turns (combat)"; here he only reports
   B, and `heardInFight` still restarts his 1.5 s throttle, so he is deaf to A's steps for that time. Restart the
   throttle only when the noise is his own hunt's, or add the turn.
4. Calm body search locates (builder deviation 3, lead's call). Act 2 during a calm search sets `hunt`, makes the slot
   valid (`lkpValid` true, so `deviceFresh()` goes false and device-alarm reinforcements go to the heard spot), and
   re-centres his ring on the player. It is defensible, but S26.md (f) says "no board report".
5. The ghost hides on a heard move. `gameState.ts:2600-2609` captures only on a sighting (`seenT < 0.25`), so once a
   heard report moves the host's slot more than 1.5 m the LKP ghost disappears while the guards are actively coming
   to the new spot. CT shows where they think you are: capture on `locT < 0.25` too (the pose then is the current rig).
6. Calls that still pass no `by`: `coopHost.ts:786` (client assist takedown), `coopHost.ts:848` and
   `strikeController.ts:242` (strike), and player body drops and player door opens (`stealthSystems.ts:181,348,372`).
   These walk searchers but never locate.
7. Bark stacking: several searchers hearing one step bark "I heard something." in the same frame. A per-manager
   cooldown, or bark only for the nearest, would read better.
8. `hearSearch` sets `searchK` to the heard spot and then `searchK++`, so the next ring index skips a ring point. A
   heard spot while `searchK` is 0 replaces the walk to the last known position (fine for a body noise, which moved
   it; for a lure he never checks the last known position).
9. The heard spot is snapped in 2D (`nearestWalkable(x, z, 4)` with no `y`). A noise on another storey within `hyp3`
   reach picks a cell on whichever layer is nearest in the plan. This matches the existing ring snap; passing `pos.y`
   would pick the right storey.
