# section-rating - STATE

## Now
- ~17:20 (Marlow Build): S6 done (902ed880). Branch stacked on marlow-final (merge 75efa7e7, PROTOCOL_VERSION 37 =
  the rating over marlow-final's 36). S1-S7, integration, fix round, S6 all green on the desktop lane.

## Next
1. One Opus checker on S6 (courseMode.ts, courseMarks.ts, the course `rt`, the client mirror).
2. Laptop suites: e2e-course, e2e-ctcourse, e2e-coop, e2e-netmove, e2e-sectorops, e2e-section-rating; then the full e2e.
3. changes/feature-section-rating.md fragment; PR stacked after marlow-final (enters the same train); message
   "Night Shift | Orchestrator".

## Open
- M-a to M-h for Michael (BRIEF.md), defaults in use.
- Interfaces waiting on other jobs: guard-ai alarm stage API (`alarmStep`), CT Core suppressor ammo and dual takedown.
- S6: a set restart resets the set's rating stats only; the bay's results stats (and the finale tier) stay cumulative.
- S6 e2e covers solo Marlow only; the co-op Marlow card / client top-up has unit and code coverage, no e2e.

## Done
- 2026-10-23: BRIEF, PLAN, STATE; S1-S5, integration, S7, fix round; merge marlow-final (37); S6.

## Resume prompt
```
Night Shift | Marlow Build: resume section-rating (stacked on marlow-final). Read CLAUDE.md ("Sessions", hard rules), then this STATE (worktree C:/NightShift/Mobile-Coop-section-rating, feature/section-rating; git fetch; merge origin/feature/marlow-final if it moved).
State: S1-S7 + S6 done and green (S6 902ed880, protocol 37). Left: Opus checker on S6, laptop suites (e2e-course, e2e-ctcourse, e2e-coop, e2e-netmove, e2e-sectorops, e2e-section-rating), changes/feature-section-rating.md, full e2e, PR stacked after marlow-final, message "Night Shift | Orchestrator".
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

## S7 report (2026-10-23 13:12)
Built `scripts/e2e-section-rating.mjs` (not in the runner's suite list; the lead adds it at the merge). No src edits, no hooks added.
- Solo (warehouseOps, 4 guards): section 1 clean -> `.rating-card` with 4 `.rc-row.ok` and a `.rc-grant` line, hides by itself (~4.1 s wall after first read), `__sectionRating.last.marks` 15; section 2 with a `killOutright` -> No kills `.rc-row.miss` (marks 13); extraction: no card, results show 3 `ul.rs-sections li` lines.
- Co-op (two pages): a synced KO pair (host 'local' + client id, one host step) -> stats synced 1, "Synced x1" on both cards, a syringe in both cards' grant text; client gadgets (emptied first) topped up once (2 of a 2-charge grant, unchanged 3 s later); host revive cap 2 -> 4 (= lastGrant.syringe) as section 2 begins; rejoin via the main-menu Rejoin: no card, ratingSeq 0, revive cap unchanged.
- Run: `E2E_GPU=1 E2E_JOBS=1 E2E_PORT=4191 node scripts/run-e2e.mjs e2e-section-rating`: pass, 46 s.
- NEEDS HOOK: a real client takedown (the client's own press carried to the host) has no test hook; the pair is fed to the host's `Enemy.knockOut` with attackerId 'local' and the client's id. No hook for the client's gadget top-up on a rejoined page (its kit rebuilds at the starting carry), so the rejoin check is card hidden + ratingSeq 0 + host cap unchanged.
- Observed (not asserted): the co-op grant read +2 syringes (No alarms + one synced pair); the host's section-1 rating was 3/4 because the KO'd bodies were found (bodiesFound 1).

## Fix round report (2026-10-23 13:32)
Checker's should-fix 1-5 and two polish items (S1-5-check.md).
1. Camera / laser alarms break No alarms (A10, logged in BRIEF): `sectorMode.ts` `cameraAlarm` counts `secStats.alarms`
   when the stage rose.
2. The card names only rewards that land: host `rated` fills a reused `cardView` (gadget = min(grant, room left now over
   GRANT_GADGETS), syringe only with `net.addSyringes`, medkit only when it heals this player now); client `takeRating`
   fills its own reused `cardView` (gadget = charges actually added, medkit as the host). `hook.last`, results and the
   wire keep the earned grant. Zero parts drop from the line (`ratingLines`).
3. `coopClient.onSector`: the rating block runs before the `ls` / `markCheckpoint` check.
4. `NetAttachment.addSyringes?(n)` (gameState.ts); the cast in `giveGrant` is gone.
5. Docs: saves.md (`rating:sections`), modes-and-progression.md (Sector Ops section rating), TESTING.md (one line).
Polish: `GRANT_GADGETS` exported once from `rating/sectionRating.ts`; `marksPips(0)` shows four empty pips.
e2e-section-rating: section 1 (full kit and health) asserts no grant line; section 2 empties the gadgets first and
asserts "+2 noisemaker charges" with no medkit.
Results: tsc clean; eslint clean; vitest sectionRating 23, ratingCardText 7, ratingRecord 3, ratingWire 8,
sectorRatingHost 3, sectors 27, sectorRestart 8, net 72, rejoin 12 (all pass). e2e (desktop, GPU, JOBS=1, 4191):
e2e-section-rating pass 41 s, e2e-sectorops pass 220 s (13:26-13:30).

## S6 report (2026-10-23 17:20)
Merge first (75efa7e7): origin/feature/marlow-final into this branch; conflicts in protocol.ts, coop.md, coopClient.ts
(imports), sectorMode.ts, sectors.ts and 7 test files, both sides kept. PROTOCOL_VERSION 37 ("37: the section rating
`rt` (section-rating S3), over 36"); every assert 37 (net.test / ratingWire.test: 36 refused, 37 joins; also crateWire,
marlowHoldNoise, marlowN6Scanners). tsc clean, 14 vitest files 235 pass.
Built (S6, 902ed880):
- `src/game/course/courseMarks.ts` (new, pure): `bayRated`, `bayTitle`, `setStatsInto`, `courseGrant(marks, synced,
  coop, preset, syringesLeft, gadgetsAtStart)` (rewardsFor + A9), `CourseMarks` (`begin(bay, stats)`, `camera()`,
  `takedown(p, t)`, `live(stats)`, `rate(bay, def, stats)`, `marks[]`, `synced[]`). A set's rating = the rise of its
  bay's stats since `begin` (set start or restart) + its camera / laser alarms (A3). Rated once.
- `BayDef.rated` / `title` (courseDef.ts); ctcourse.ts sets rated for a set with a non-passive guard (A2-A8; A1's
  passive checker and the bunker / courselab drill bays stay unrated), title "A2 Carriage Shed".
- `BayStats.synced` (newStats, totals, summarise); courseMode counts a synced pair from `onEnemyKilled` knock-outs.
- courseMode host: rated at `airlockCycled` with the grant given at once (the next set is beginning: gadgets on the
  host kit, co-op syringes via `net.addSyringes`, medkits as station heals), the last set at `courseDone` without a
  grant; `bayRestart` re-begins the set (never re-rates; a given grant stays, the course has no checkpoint loadout);
  `updateRatingRecord(map id 'ctcourse', bay id, marks, synced)`; `g.sectionRatings` (results lines beside the finale
  tier); host RatingCard; hook `window.__sectionRating` {stats, last, lastGrant}. No src/net import.
- Wire: `CourseWire.rt` (SectorRatingWire, `sec` = bay index, finish grant zeroed), parsed by `courseRt` in
  protocol.ts (inside the 37 bump). Client mirror (courseMode.ts `mirrorRating`): each new bay once: results line,
  own gadget top-up, card (not for the last set); the first message after join / rejoin only records.
- run-e2e.mjs: e2e-section-rating in REQUIRED and the quick map (rating files, both modes); testing-tools.md, coop.md,
  modes-and-progression.md, TESTING.md lines.
Tests: tests/courseMarks.test.ts (new, 15), ratingWire.test.ts +1 (course rt). tsc clean; eslint clean; vitest
courseMarks, ratingWire, course, courseTutorial, courselab, ctcourse (104 pass), tests/ctcourse/* (572 pass, 1 skip).
e2e (desktop, GPU, JOBS=1, 4191, heavy.lock per suite): e2e-section-rating pass 50 s (new Marlow block: A1 unrated,
A2 rated 15 with the gadget grant and the card, A3 kill + restart -> rated clean, course wire rt); e2e-course pass 165 s.
Open: co-op Marlow card / client top-up not in e2e; the finale tier and results stats stay cumulative over a restart.

## S6 fix round (17:41, 2026-10-23)
- Merged origin/feature/marlow-final (e7beba38, past 0ead059c: master 4.77.0). No conflicts; protocol kept at 37; tests/hangDownNet.test.ts asserted master's 35, now 37 (b6f2185f).
- Should-fix 3: `coopRating(hasNet, players)` (sectionRating.ts): co-op table only with a partner in the match at rating time (`playerRefsInto` length > 1). Used by courseMode.rateSet and sectorMode.rate (both had `g.net !== null`). A host alone in a co-op room now gets the solo table (medkits). Tests in courseMarks.test.ts.
- Should-fix 1: the course message carries `rh` (inside protocol 37, optional): every bay's rating packed (-1 unrated, else marks + 16 x synced; `packRated` / `unpackRated` in courseWire.ts, parsed by `courseRh`, index kept, clamped, max 64). A late joiner / reloaded rejoiner's first message rebuilds every earlier set's results line from it (grant shown empty, no top-up, no card); later ratings as before. Test in ratingWire.test.ts. Sector Ops' client keeps only the last rating on a late join (same gap, not changed here).
- Checks: tsc clean; vitest courseMarks, ratingWire, net, course, sectorRatingHost: 5 files, 135 pass. e2e-section-rating (GPU, port 4191, heavy.lock): pass, 47 s.
- Open: no co-op Marlow e2e yet (S6-check should-fix 2); the rh rebuild is unit-tested on the wire only, not in e2e.
