# section-rating - S1-S5 + integration check

Checker: fresh Opus, 2026-10-23. Range `00323aa3..b4c9d7ec` (790d1795 S1 .. b4c9d7ec integration), read at HEAD of
`origin/feature/section-rating`. Read-only review: tsc / vitest / e2e not re-run (desktop CPU cap); the builders' runs
are taken as reported (tsc clean; sectionRating 23, ratingCardText 7, ratingRecord 3, ratingWire 8, sectorRatingHost 3,
sectors 27, sectorRestart 8, net 72, rejoin 12, sectorLampSync 11, sectorStep3 7). No e2e has run yet (S7).

## Verdict: PASS

Nothing broken or unplayable. The items below are should-fix (worth doing in the S6 / S7 round) and polish.

## Must-fix
None.

## What was checked and holds
- Marks: `rateSection` matches A2-A4 defaults (KO is not a kill; camera alarm breaks Undetected; Bodies hidden earned
  with no bodies). Rewards per R1 / R4 from one table, solo column (syringe -> medkit), caps: gadgets <= starting carry
  sum, syringes <= preset + 2 - left. A9 folded at `sectorMode.ts` `rate()` and logged in BRIEF.
- Synced detector: two different players, inclusive 1.5 s window, each takedown consumed once, fixed slots, reset per
  section. Fed from `onEnemyKilled` knock-outs with `h.attackerId` (same mapping as `courseMode`).
- Rating once: `run.marks[i]` -1 until rated, `rate()` returns early after; rated at CONN_UNLOAD (always before any
  cycling restart, since UNLOAD fires as cycling starts), last section at extraction with `grant=false`.
- Restart (A8): `freshCounters()` only; owed grant given before `beginSection()`'s `markCheckpoint`, and on a mid-cycle
  restart given after `checkpointReset` then `markCheckpoint` - so the grant survives later restarts, never repeats.
- Final rating: wire grant fields zeroed, sent at once in `complete()` before `operationComplete`; host card skipped
  (`rateGrant` false), client card skipped (`rt.sec < defs.length - 1`).
- Client: top-up once per new `rt.sec` (`ratedSec`), never on restart (host keeps `rt`); late join / rejoin guard
  (`sawSector`: first `sector` only records `rt.sec`, results list only). Host top-up at next section begin.
- `sectorResult` marks line ("Marks 4/4 2/4 -"), unchanged without marks (tested).
- Wire: `ratingWire` clamps every field (`num` clamps, `Math.round`), non-object / no numeric `sec` drops `rt` only,
  unknown keys never pass; course `synced` clamped 0-1e4. `PROTOCOL_VERSION` 34 with every assert moved (jammer,
  jammerFixes, moveState, net, rejoin, sectorLampSync, sectorStep3, ratingWire); no `scripts/` assert on it.
- `src/net` boundary: grep finds no static non-type import of `src/net` outside `src/net`; `sectorMode` reaches
  `addSyringes` through `g.net` (duck-typed); `src/net` importing `ui/hud/ratingCard` and `game/*` is the allowed
  direction.
- Save: `rating:sections` is a `kv` key via `dbGet` / `dbPut`, sanitised on read, serialised writes, host only - the
  `course:fallow` pattern that `docs/systems/saves.md` says needs no `SAVE_VERSION` bump. Confirmed no bump.
- Hot paths: `fixedUpdate` detection delta, `onEnemyKilled`, `SyncedDetector.onTakedown`, `RatingCard.update` and the
  client `frameUpdate` allocate nothing; allocations only once per rating / per send / per show. No `Math.hypot`, no
  graphics reads, strict-TS patterns (`!` after bounds-checked loops, `import type`).
- UI: card DOM built once, `show()` writes text once, `update(dt)` is a countdown that touches the DOM only at fade
  start and end; removed in `dispose()` / client `offs`. `GameMode.frameUpdate(dt)` and GameState pass `dt`. Results
  `ul.rs-sections` one line per rating on host and client.

## Should-fix
1. Camera alarms never break "No alarms" - `src/game/modes/sectorMode.ts:546` (`cameraAlarm`). A camera or laser that
   raises ALARM STAGE n counts only toward `camAlarms` (Undetected), so the card can show "No alarms" ticked and pay a
   syringe while the HUD shows the stage raised. PLAN's table matched this, but the player sees a contradiction.
   Smallest fix: in `cameraAlarm`, `if (this.run.alarm > up) this.secStats.alarms++;` after the raise. Done looks
   like: a camera-raised stage crosses No alarms on the card.
2. Card promises grants that may not land - `sectorMode.ts:622` (view uses the uncapped-by-room `r`) and the client's
   `ratingViewFromWire` grant. Gadget charges cap at each gadget's starting carry, so a player who has used no gadgets
   (both at carry) gets nothing, yet the card reads "+1 gadget charge"; medkit is a station heal that does nothing at
   full health. Smallest fix: the card's gadget line uses the room left now (sum over GRANT_GADGETS of
   `carry - counts[id]`, min with `grant.gadget`; host in `rated`, client with `k` actually added) and drops the line
   at 0. Done looks like: the card never names a reward that is not given.
3. Client restart could lose its top-up if `rt` and a new `ls` ever arrive in one message - `src/net/coopClient.ts:658`
   records the checkpoint loadout before `:686` applies the rating. Today they arrive in separate sends (UNLOAD sets
   `ls` -1, CONN_LOAD comes later), so it is latent. Smallest fix: move the rating block above the `kitSection` check.
4. `addSyringes` is duck-typed with a cast - `sectorMode.ts:685`. Add `addSyringes?(n: number): void` to
   `NetAttachment` (`gameState.ts` ~line 199, beside `revivesLeft?`) and call `g.net?.addSyringes?.(r.syringe)`.
5. Docs: `docs/systems/saves.md` lists `course:fallow` (line 40) but not `rating:sections`; add a short section.
   `modes-and-progression.md` and `TESTING.md` lines are still owed (PLAN "Docs at the end").

## Polish
- `GRANT_GADGETS` is duplicated (`sectorMode.ts:64`, `coopClient.ts:30`, the latter between import lines); export it
  once from `rating/sectionRating.ts`.
- `onEnemyKilled` maps attacker `''` (barrels / environment) to player 0 (`sectorMode.ts:849`), so a barrel KO beside a
  client takedown can count as synced. Same as courseMode; harmless.
- Lethal takedowns never count as synced (only knock-outs feed the detector); fits "no kills" but worth a line in BRIEF.
- `marksPips` (`missionsScreen.ts:18`) shows nothing for a recorded 0-mark section (same as unrecorded).
- `netExtra` spreads `rt` per send (`sectorMode.ts:874`); fine at SEC_SEND rate, could reuse a second object.
- A rejoined client's results list starts at the last rating before it rejoined (noted in the integration report).
- Section index on the wire caps at 63; a map with more sections would alias (none do).
