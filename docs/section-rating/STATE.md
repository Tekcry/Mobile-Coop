# section-rating - STATE

## Now
Planned, nothing built (2026-10-23 ~12:15). BRIEF.md and PLAN.md written by a planning subagent on
`feature/section-rating` (cut from master 3c460923). Not committed yet: the lead commits these three files first.
Defaults A1-A8 (BRIEF.md) apply until Michael answers M-a to M-h.

## Next
1. Lead commits the docs, checks master for guard-ai / sector-redesign / CT Core changes to the files in PLAN.md
   (merge master into this branch if any landed).
2. S1 (pure rules, Sonnet).
3. S2, S3, S4, S5 in parallel.
4. S6 and S7 in parallel; batch checkers; one PR to master.

## Open
- M-a to M-h for Michael (BRIEF.md), defaults in use.
- Interfaces waiting on other jobs: guard-ai alarm stage API (`alarmStep`), CT Core suppressor ammo and dual takedown.

## Done
- 2026-10-23: BRIEF, PLAN, STATE written.

## Resume prompt
```
Night Shift | Menu Notes Build: start section-rating. Work only in C:/NightShift/Mobile-Coop-section-rating on branch feature/section-rating (branch guard from CLAUDE.md "A job" before every write). Read CLAUDE.md, then docs/section-rating/STATE.md, BRIEF.md and PLAN.md. Commit the three docs first. Then run PLAN.md slice order (S1, then S2-S5 in parallel, then S6 and S7) with the session-method loop: Opus for src/net, save and mode code, Sonnet for UI, data and tests from strict Opus briefs, one fresh checker per batch, at most 1 fix round. Use assumed decisions A1-A8 until Michael answers M-a to M-h. Update STATE.md after every slice. Finish with one PR to master.
```

## S1 report (2026-10-23 12:30)
Built `src/game/rating/sectionRating.ts` (pure, no Babylon / net imports) and `tests/sectionRating.test.ts` (23 tests, all pass; tsc and eslint clean).

Exported API: marks `UNDETECTED` (1), `NO_KILLS` (2), `NO_ALARMS` (4), `BODIES_HIDDEN` (8), `ALL_MARKS`; `SYNC_WINDOW` (1.5), `SYNCED_PAID_MAX`, `SYRINGE_OVER_PRESET`;
`SectionStats`, `newSectionStats()`, `resetSectionStats(s)`; `RatingRules`, `DEFAULT_RULES`, `rateSection(s, rules?)`, `markCount(marks)`;
`Grant`, `RewardCtx`, `emptyGrant()`, `rewardsFor(marks, synced, ctx)`; `RATING_LABEL`, `MARK_LABELS`; `SyncedDetector` (`onTakedown(player 0|1, t)`, `addSynced()`, `synced`, `reset()`).

Defaults picked where BRIEF is open:
- Rules: `knockoutsBreakNoKills` false (A2), `cameraBreaksUndetected` true (A3), `bodiesHiddenNeedsBody` false (A4).
- Reward table (R1): Undetected +1 gadget; No kills +1 medkit (until CT Core suppressor ammo); No alarms +1 syringe (solo: +1 medkit, A7); Bodies hidden alarmStep 1 (S2 swaps to +1 gadget until guard-ai's stage API lands, A9).
- Synced (R4): each paid synced takedown gives +1 gadget and +1 syringe (solo: +1 gadget, +1 medkit); at most `SYNCED_PAID_MAX` = 2 paid per section (a number BRIEF left open).
- Caps: gadget grant <= gadgetsAtStart; syringe grant <= preset + 2 - syringesAtStart (min 0). Caller passes current counts as "AtStart".
- Detector: window inclusive (exactly 1.5 s syncs); players are 0 or 1; a paired takedown is consumed; the detector keeps its own count (`synced`), caller copies into `SectionStats.synced`.

## S4 report (2026-10-23 12:34)
Built src/ui/hud/ratingCard.ts (+ ratingCard.css, imported by the .ts; HUD CSS elsewhere lives in styles.css, which S4 does not own) and the ResultsNav.ratings option in resultsScreen.ts (one li.rs-sections line per section via sectionLine). Tests: tests/ratingCardText.test.ts, 7 pass; tsc and eslint clean.
API: RatingView, ratingLines(view, gadgetName?), sectionLine(view), RatingCard(parent) with show(view, gadgetName?), update(dt), hide(), visible; RATING_CARD_SHOW 4 s, RATING_CARD_FADE 0.6 s. Not wired into any mode: the mode calls card.update(dt) each frame (a countdown only).

## S5 report (2026-10-23 12:40)
Built `src/save/ratingRecord.ts`, `tests/ratingRecord.test.ts` (3 tests, pass), pips in `src/ui/screens/missionsScreen.ts`.
- API: `RATING_RECORD_KEY` (`rating:sections`), `RatingRecord`, `SectionBest`, `emptyRatingRecord`, `sanitiseRatingRecord(raw)`, `compareBest(a, b)`, `loadRatingRecord()`, `updateRatingRecord(mapId, sectionId, marks, synced): Promise<void>` (serialised; keeps only a better result; bad ids dropped).
- Best-of: more marks (bit count of the 4 bits) wins; tie -> more synced. Marks clamped to 0-15, synced int 0-1e4.
- Save version: no bump (kv key outside the profile schema, as `course:fallow`; saves.md rule).
- Select screen: Sector Ops op context panel lists each section with its best marks as four pips (filled/empty), nothing when unrecorded. `marksPips` exported. Marlow Yard has no select screen in missionsScreen.ts, so not covered here.
- tsc: only errors are in sectorMode.ts (S2 in progress, not mine). eslint clean on my files.

## S2 report (2026-10-23 13:20)
Built (host / solo only; tsc clean, eslint clean on the 3 files + test; vitest single files: sectorRatingHost 3, sectors 27, sectorRestart 8, sectorStep3 7, sectorBolt 12, campusS1 47, animTunePass2 11, all pass).
- `sectorMode.ts`: `secStats` (one `SectionStats`, reset in place), `SyncedDetector`; counts guard detections (rise of `g.style.detections` per tick), `camAlarms` (cameraAlarm), `alarm` / `bodyFound` events, `onEnemyKilled` (kill or knock-out, every down is `bodiesMade`; knock-outs feed the detector, player 0 = 'local' / '' attacker, else 1).
- Rated at CONN_UNLOAD (and the last section at the extraction, no grant); `run.marks[i]` set once, never re-rated. `rewardsFor` ctx: coop = `g.net !== null`, preset = `syringesFor(difficulty)`, syringesAtStart = `revivesLeft()`, gadgetsAtStart = noise + gas starting carry (4).
- A9 (lead to log in BRIEF): until guard-ai's alarm stage API lands, Bodies hidden's `alarmStep` becomes +1 gadget charge (folded into `grant.gadget`, `alarmStep` 0).
- Grant given at the next section's begin (CONN_UNLOCK_FAR, just before `markCheckpoint`), so a restart of that section keeps it (A8). Restart mid-cycle: the owed grant lands after `checkpointReset`, then `markCheckpoint`. Restart resets the counters only.
- Gadgets: new `GadgetSystem.topUp(id, n, cap)` (never above cap or max, never lowers); charges go to noisemaker then gas, each capped at its starting carry. Host's own player only: the client's gadgets need a wire message (not done).
- Syringes: `run.syringeBonus` (sectors.ts) counts them; applied through a duck-typed `g.net.addSyringes(n)` that does NOT exist yet. Lead / S3: add to coopHost `addSyringes(n: number): void { this.reviveClock.cap += n; }`.
- Medkit: a station heal (`stationHeal`) for the host's player and each client via `net.healAtStation` (no carried kits exist, G20).
- Wire: `SectorNetExtra.rt: SectorRatingWire` `{ sec, marks, synced, gadget, syringe, medkit, alarmStep }` (sec -1 none), copied per send; `secT` zeroed on a rating so it goes at once. No src/net edit, no version bump.
- `sectorResult` takes optional `marks` and returns them; the line gains "  ·  Marks 4/4 2/4 -" (unchanged without marks). `result()` passes `run.marks`.
- Record: `updateRatingRecord(mapId, sectionId, marks, synced)` imported statically from S5's `src/save/ratingRecord.ts` (it existed) and called on every rating. Also exported `onRated` / `setOnRated` listener (null by default) for the card wiring.
- Hook `window.__sectionRating = { stats, last: { sectionId, title, marks, synced, grant } | null, lastGrant }` (`last` matches S4's `RatingView`); `__sector.debug().rating` adds marks, owed grant, syringeBonus.
- Not done: the rating card is not wired (lead: on `onRated` / `hook.last` change, `card.show(view)` and `card.update(dt)` in frameUpdate). "No alarms" counts only panel `alarm` events, not camera stage raises (PLAN's table).

## S3 report (2026-10-23 12:53)
Built the rating wire: `PROTOCOL_VERSION` 31 -> 34 (32 / 33 reserved by other open jobs; the orchestrator may renumber at merge, then the asserts below move with it).
- `src/net/protocol.ts`: `ratingWire(v)` parses the `sector` message's `rt` (S2's `SectorRatingWire` `{ sec, marks, synced, gadget, syringe, medkit, alarmStep }`): `sec` -1..63 (-1 none yet), `marks` 0-15, the rest whole 0..`RT_COUNT` (99); not an object or no numeric `sec`: `rt` dropped, the rest of the message kept; unknown keys never pass. The course `stat` parser gains `synced` (whole 0-1e4, missing 0) for S6's `BayStats.synced`.
- `src/net/validate.ts`: `ratingViewFromWire(rt, defs)` -> S4's `RatingView` (section id / title from the map's `sectors`), null for `sec` -1 or an index the map lacks.
- `src/net/coopClient.ts` (the client apply, `onSector`): a new `rt.sec` takes the rating once: `rating: RatingView | null`, `ratingSeq` (bumped per rating), `onRating` listener (null; the card wiring hooks here), `window.__sectionRating.last` (created as `{ stats: null, last, lastGrant: null }` when the client has no host hook), and the gadget part on the client's own kit through `g.gadgets.topUp` (noisemaker, then gas, each at its starting carry, as the host).
- `src/net/coopHost.ts`: `addSyringes(n)` (n a whole 0-9 added to `reviveClock.cap`), the duck-typed call in sectorMode's grant. The `sector` send already spreads `rt`; no other host change.
- Tests: `tests/ratingWire.test.ts` (8: round trip, clamping, junk dropped, course synced, client view, host -> client through a session, version 31 refused / 34 joins). Version asserts 31 -> 34 in jammer, jammerFixes, moveState, net (and its refusal test: 31 refused, 34 joins), rejoin, sectorLampSync, sectorStep3 (167 pass). tsc clean, eslint clean.
- Open: the client tops up at the rating (connector unload), the host at the next section's load (a few seconds apart). The last section's extraction rating carries its grant on the wire too, so the client tops up at op end (harmless; S2 could zero the grant fields of an ungranted rating). A client that joins / rejoins after a rating tops up once for the rating already shown.

## Integration report (2026-10-23 13:55)
Wired S1-S5 together. tsc clean; eslint clean on sectorMode.ts, coopClient.ts, gameState.ts; vitest single files all pass:
sectionRating 23, ratingCardText 7, ratingRecord 3, ratingWire 8, sectorRatingHost 3, sectors 27, sectorRestart 8, net 72,
rejoin 12, sectorLampSync 11, sectorStep3 7.
- Host / solo card (`sectorMode.ts`): one `RatingCard(g.hud.el)` made in `start()`, shown from the `setOnRated` listener
  (`rated`) for a granted rating only (`rateGrant`; the extraction's rating goes to the results), `card.update(dt)` in
  `frameUpdate(dt)` (countdown only), removed and the listener cleared in `dispose()`. Gadget name: `grantGadgetName`
  predicts the gadget the next section's top-up fills (the first of noisemaker / gas with room, if it takes all the
  charges; else the card's generic "gadget").
- Client card (`coopClient.ts`, in the constructor's Sector Ops block, which already wires the client's sector mirror):
  its own `RatingCard(g.hud.el)`, `onRating = (v, name) => card.show(v, name)`, `card.update(dt)` in `frameUpdate`,
  removed through `offs`. `onRating` now passes the gadget actually topped up (one gadget id, else generic) and is not
  called for the op's last section. sectorMode never imports `src/net`.
- Results: `GameState.sectionRatings` (every rating of the op in order) -> `ResultsNav.ratings` in `resultsNav()`. The
  host's mode pushes each rating's view; the client pushes each taken rating (and the late-join one, as history).
- The extraction's rating now goes to the client at once in `complete()` (the sector sends stop once the op ends, so
  before this the client never got it), with its grant fields zeroed in `rt` (S3 open item: no top-up at op end).
- Late join (S3 open item): `CoopClient.sawSector`: the first `sector` after connect records `rt.sec` as applied (no
  card, no top-up; the view goes to the results list only).
- Docs: A9 logged in BRIEF.md; coop.md has protocol 34, the `rt` field, `addSyringes` and the course stat `synced`.
- For S7 (e2e): card DOM `.rating-card` (shown / hidden, rows `.rc-row.ok|.miss`, `.rc-grant`) on host and client after
  a connector cycle; no card at the extraction; results `li` lines in `ul.rs-sections` on both screens; the client's
  gadget top-up happens at the rating (connector unload), the host's at the next section's begin (a few seconds apart);
  a client rejoining after a rating gets no second top-up. A rejoined client's results list starts at the last rating
  before it rejoined (earlier sections are not resent). Not run: any e2e.
