# S3 - Radio net integration (fresh checker, 2026-10-23)

Commit eb1f71de (parent 7f3a19c6); HEAD 98cf4552 adds the master 4.68.0 merge. Reviewed `git diff 7f3a19c6 eb1f71de --
src tests scripts` in full, the docs (`docs/systems/ai.md`, `changes/feature-guard-ai.md`), and the merge's src changes
(`git diff eb1f71de 98cf4552 -- src/ai src/game src/net`), against BRIEF M1, M4, M5, goal 5, A6, A7; PLAN row S3; design
sections 5 and 7; `S3-module.md` ("What integration must wire"); `S2-CHECK.md` polish 1 and 2.

## Verdict: PASS

Nothing is broken or unplayable. Goal 5 / M5 is met: voice range first, then the caller's section, staggered by distance
and deterministic. A call is a timer the caller must survive. The parked modes are unchanged. Every exit path cuts or
clears the net. The items below are polish, docs, or belong to later slices.

### Re-run here (on HEAD 98cf4552)
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the 9 changed src / test files: 0 errors, 0 warnings. `scripts/e2e-stealth-ai.mjs` is lint-ignored;
  `node --check` on it passes.
- `npx vitest run tests/radioNet.test.ts tests/radioWiring.test.ts tests/incidents.test.ts tests/hearing.test.ts`:
  4 files, 89 / 89 passed.
- `npm run check` under the desktop `heavy.lock` (taken atomically at 08:45, released at 08:50): exit 0.
  - Lint: 0 errors, 41 old warnings, none in the S3 files.
  - Tests: 308 files, 3363 passed, 11 skipped.
  - Build: OK.
- e2e: not run, as asked. `e2e-stealth-ai` (radio, radio window, radio stagger) and `e2e-sectorops` are with the laptop.

### Verified
- **The spotter's alert** (`enemy.ts:851-853`). In coordinated mode, every alert of his own goes through `callContact`
  (`:758`): a shout, then `radioCall(-1, 'contact')`. That covers a sighting, a hit, close gunfire, the end of a
  flashbang and a guard spawned alerted (`spawn` -> `alert()`).
  - A guard told by a shout or the radio (`alertIn.called`) does not relay. He barks `joining`.
  - In coordinated mode `radioT` is never set, so the old `callAlert` / `radioT` path (`:855-859`, `:997-1004`) runs
    only when `netOn` is false.
  - `spotted` is still set only for a quiet stealth sighting with LOS.
- **Cuts.** `radioCut` is called from:
  - `blind` (`enemy.ts:393`);
  - `beginTakedown` (`:415`: grab, choke, hostage, interrogation, the co-op host's client grabs);
  - `die` (`:930`: kill, `knockOut`, gas, `killOutright`);
  - `EnemyManager.despawn` (`enemyManager.ts:600`).

  `clear` (`:1143`) runs from `despawnAll` (Sector unload) and `resetMemory` (restart). In Sector Ops, `unloadSection`
  releases holds first (that can start a new call), then `despawnAll` clears it. Revive makes a new `Enemy` with a new
  `num`, so no call carries over.

  Course mode's `spawnSquad` splices guards out of `em.enemies` directly (`courseMode.ts:646`), with no despawn. The
  net's safety net covers that: a caller missing from the view at completion loses the call, and a missing receiver is
  skipped.
- **No call completes for a dead or held caller.** `radioStep` (`enemyManager.ts:796`) refills the view
  (`GV_DOWN` = `!alive`, `GV_HELD` = `taken`) just before `tick`. `radioDeliver` (`:814`) skips a dead or taken receiver.
  - A released or un-blinded guard still in combat calls again (`enemy.ts:478`, `:991`).
  - A dead guard cannot reach `callContact`: `releaseTakedown` callers check `alive` (`takedownController.ts:656`,
    `coopHost.ts:883`; `coopHost.ts:668` is for a held, so live, guard).
- **Nobody is stuck.**
  - A receiver gets `radio(0)`, which sets `called = 1e-6`. On the next step `alertIn.called` puts him in alert from
    any level (`alertState.ts:130`). In stealth modes he chases the shared LKP, then searches, then cools down, all
    bounded. Going to alert clears his board task, so the board closes it.
  - `calmEnd` (`alertState.ts:166`, `enemy.ts:1187`) applies only while he is on a `MODE_INVESTIGATE` task from
    `sendTo` with `calm`. He ends `unaware`. `onLevel` then barks, sends the `standDown` call, clears the incident and
    calls `walker.rejoin`. A guard who has fought keeps his cooldown.
  - Gunfire tasks pass `calm = false` (`enemyManager.ts:759`, `kindOf(inc) !== 'shots'`). This fixes S2 polish 2.
- **S2 polish 1 fixed.** `alloc` never evicts `keep`, the slot `follow` is escalating from (`incidents.ts:378-385`,
  `:603-605`). A test covers the 16-open case.
- **Stagger and determinism.**
  - The lane index matches the guard: `fillView` writes `view.n = enemies.length` in list order (dead ones flagged, not
    skipped), so `rxReaction[i] = reactionOf(enemies[i])` lines up.
  - The reaction is `diff.reaction x officer`, with no random term.
  - There is no `Math.random` in the coordinated alert, voice, radio or calm-end paths. The ones left in `enemy.ts`
    (cover choice, strafe, spread, think jitter) are combat variation for S8. The ones in `enemyManager.ts` are the
    parked `callAlert` / shout, reinforcement yaw and the radio-check period.
- **Voice** (`enemyManager.ts:776`).
  - Reach is `hearsVoice` at tier >= 2 of a 12 m reach in 3D, with ambient masking from `noisy`. A wall ray is cast
    only where one wall decides it. The join comes 0.3 s later (`RADIO.voiceDelay`, from the table).
  - Voice ignores sections, as specced. It skips dead, alerted and taken guards.
  - Index loop, reused `earA` / `earB`, no allocation. It runs per shout event, not per tick.
- **No allocation per tick.**
  - `radioStep` calls `fillView` (no allocation once the cast is in) and grows the reaction lane only by doubling.
    `RadioNet.tick` uses fixed pools.
  - `radioDeliver` uses `byNum` and `CALL_KIND.indexOf` and an 8-entry ack ring.
  - The `sink` object and its arrows are built once (`:181`).
  - No `Math.hypot` in src. `hyp3` is used.
- **Parked modes (`coordinated = false`: Hunter `clearMode.ts:59`, Mission `missionMode.ts:46`) are unchanged.**
  - `netOn` is false, so the old `onLevel` window runs. `releaseTakedown` and the end of a flashbang go to `alert()`
    as before.
  - The `shout` and `radioCall` handlers check `coordinated`. `radioStep` runs only inside the coordinated block
    (`:1032-1045`).
  - `checkLight`, `pairSearch` and `calmEnd` are reached only from the board.
  - The only visible change in parked modes is the `callIn` bark text.
- **Sections.** There is one net with `section` 0 and a null section lane, so it covers the whole cast.
  - Sector Ops unloads before it loads (`sectorMode.ts:392-396`), so only one section is live.
  - `RADIO_ALARM = false` keeps the `command` call's alarm off until S6. A test asserts that no alarm is raised.
- **Master 4.68.0 merge.**
  - `stealthSystems.shootLight` (also reached by a co-op client's lamp shot, `coopHost.ts:974`) goes through
    `em.lightsOut`, the board and `checkLight`, which makes a `light` report call. It does not touch `callAlert`.
  - The sector-redesign code calls neither `em.despawn` nor `callAlert`. `placeSlot` is not wired yet (only a comment
    in `guardAiData.ts`). Nav-version replans and `SectionStartState` do not touch the radio.
  - The merge dropped the S1 changelog entry because S1 shipped in 4.66.0 (`CHANGELOG.md:74`). That is correct.
- **Co-op.** The brain is host-only. Barks never go on the wire (no bark in `src/net`). Client grabs, flashes, shots
  and lamp shots all reach the host's `Enemy` methods, which cut or call.
  - No wire change is needed. `PROTOCOL_VERSION` stays 31; 32 stays reserved.
- **Tests and e2e script.**
  - `radioWiring.test.ts` covers:
    - nothing before completion;
    - distance order, strictly rising, within `staggerMax`;
    - a 30 m guard told (no 22 m circle);
    - the cut, and a held caller or held receiver;
    - officer reaction;
    - determinism;
    - coordinated off;
    - `clear`;
    - voice open, wall and 7 m;
    - the parked 8 m shout;
    - one ack per report;
    - `RADIO_ALARM` off.
  - `e2e-stealth-ai` no longer asserts the old 22 m behaviour:
    - `radio` now expects the far guard (~26 m) to be told after the near one.
    - `radio window` reads `radioLeft` and `radioNet.lost`.
    - `radio stagger` is new: 5 guards, nearest first, spread over 1 s or more, within the call + `staggerMax`.
  - Every bound is read from `em.radioTable` (`staggerMax`) or `radioLeft`. No assert was weakened. No other e2e script
    reads `radioT`, `RADIO` or `ALERT.shout`.

## Fixes

None blocking.

## Polish list (later slices, docs or the feel pass)
1. **Report calls queue the whole section for one "Copy.".**
   - Where: `radioNet.ts` `complete`, `enemyManager.ts:814`.
   - `light`, `standDown` and `missing` calls enqueue every receiver (up to 11 at `MAX_ALIVE` 12), only for the first
     one to bark. With about 5 report completions inside a 4.5 s window plus a contact, the 64-entry queue fills, and
     the farthest contact receivers are refused (`dropped`). They then learn only from noise.
   - It is rare at 12 guards.
   - Done looks like: report kinds queue only the nearest receiver, or contact entries take priority over report
     entries when the queue is full.
2. **Whole-map section on maps with no zones** (A6, until S5 wires `MapLayout.guardAi.zones`).
   - On Infiltration maps, Free Roam (`coordinated` stays true there; only Hunter and Mission set it false) and Course
     mode, a contact now reaches every live guard on the map, staggered, where it used to reach 22 m.
   - In stealth-off modes (Free Roam, Course: `stealth` false) alerted guards never cool down and chase the real
     position. That was true before too, but for fewer guards. Marlow Yard spawns about one guard per bay, so it is
     moot there.
   - Done looks like: a line in the playtest notes, and zones on the bigger maps in S5.
3. **Log A13 in BRIEF.**
   - "Loud alerts (a hit, close gunfire, spawned alerted) take the same 2.5 s call instead of calling in at once" is
     only in a code comment (`enemy.ts:848`).
   - Done looks like: an A13 entry with its undo (restore the immediate section fan-out for `loudAlert` / `gunfire`).
   - Also: write the missing `slices/S3.md` implementer report (STATE notes there is none), and add a `TESTING.md`
     line (spot -> nearby guards join at once -> the rest after ~2.5 s, one by one; KO the spotter fast -> nobody else).
4. **First-hand sighting by a guard told by voice does not call.**
   - A voice hearer or radio receiver who then sees the player himself is already alert, so he never makes a call
     until he loses sight and finds the player again.
   - If the spotter was cut, the section learns only from gunfire noise (S1).
   - Not a relay; design 5 is silent on it.
   - Done looks like (S8): a guard in combat with LOS and no completed or open contact call of his section starts one.
5. **Double "Copy." on a light.** The board's `CMD_ACK` perceivers say "Copy." at once, and the radio `light` call's
   first receiver says it again about 3 s later. The radio ack could skip guards the board already acked.
6. **Barks.**
   - `joining` is not in `RADIO_BARKS`, so a radio joiner gets no chirp, and voice and radio joiners say the same line.
   - Several guards alerted by the same gunfire each bark `callIn` when their calls complete; `BarkVoice` limits
     apply.
   - The parked modes' `callIn` text changed with the new lines.
7. **e2e `radio` window is longer** (call + `staggerMax` + 1.5 s, about 8.5 s, against 4.5 s before).
   - The far guard (~26 m, facing the lit player) has more time to spot him unaided, which would break
     `farT > bT`.
   - Watch the laptop result. If it flakes, face him away or keep `t.light(1)` shorter.
8. **`RadioNet.section` stays 0.** S6 must pass the Sector index (or set `radioNet.section` in `loadSection`) before
   `RADIO_ALARM` turns on, as the field's comment says.
