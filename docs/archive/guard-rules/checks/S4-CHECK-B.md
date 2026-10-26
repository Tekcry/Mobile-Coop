# guard-rules S4 check B
Owner: Guard AI Build. Status: current.
VERDICT: FIX (1 blocking)

Checker B: Opus 5.5 (fresh, independent of A), 2026-10-25. Head 84a6c82c4 (feature/guard-rules-s4), diff
`452e23035..84a6c82c4` (6 files). Focus: the wire, co-op, test and doc integrity. Read: S4-BRIEF, PLAN "PR3" S4, S7's
radio hook and "Tests and e2e per PR", origin/master CLAUDE.md "Hard rules (code)", RULES.md "Definition of done",
session-method.md; the full diff and the code it touches (`hear`, `hearTurn`, `sendTo`, `checkLight`, `checkBody`,
`hearSearch`, `onLevel`, `updateAwareness`, `standDown`; `coopHost.ts:310-318`, `coopClient.ts:938-948`,
`protocol.ts:186-188, 505-515`).

## Checks run
- `npx vitest run tests/coopGuardAi.test.ts tests/barkCause.test.ts tests/guardPolishA.test.ts tests/combatHearing.test.ts
  tests/archetypes.test.ts tests/guardPolish2.test.ts`: 6 files, 96 pass, 1 skipped (`guardPolish2.test.ts:365`,
  an existing `it.skip`, not S4's).
- `npm run typecheck:fast`: clean.
- A scratch test (outside the repo, not committed) for the stale-glimpse case below: confirmed (output
  `unaware 0 investigating ['investigate'] 1`).

## Wire and co-op: clean
- `BARK_EVENTS` (`src/ai/barks.ts:124-134`): `heard`, `spotCall` appended after `consoleCheck`; the first 37 entries are
  byte-identical to 452e23035 (checked against `git show 452e23035:src/ai/barks.ts`). `heard` = 37, `spotCall` = 38;
  39 entries, far under `BARK_CAM` 254 / `BARK_TEXT` 255.
- Host `coopHost.ts:315` sends `barkIndex(ev)`; `protocol.ts:507` accepts `b` 0-255, so 37 / 38 decode; client
  `coopClient.ts:942-945` rebuilds with `barkLine` and reads `RADIO_BARKS.has(BARK_EVENTS[b])`, so `spotCall` gets the
  chirp on the client too. No `src/net` change is needed; none was made. `PROTOCOL_VERSION` untouched (62 on the
  branch; master is 63, the train bumps); no test asserts its number.
- `RADIO_BARKS` gains `spotCall` only; `heard` is spoken; neither is `URGENT`. Correct per brief.
- No new imports; single player still never imports `src/net`.
- Other users of `BARK_EVENTS` / `barkIndex` / `barkLine`: only `src/net/coopHost.ts`, `src/net/coopClient.ts` and
  `tests/coopGuardAi.test.ts`. No `scripts/e2e-*.mjs` asserts a bark index, the event name `investigate` or the text
  "I heard something." (`e2e-coop.mjs:376-383` uses `missed`; e2e-enemies / e2e-sectorops only count lines).

## Tests and docs integrity
- `tests/coopGuardAi.test.ts:91-102`: the literal 37-entry list matches the base order exactly and `slice(0, 37)` is
  compared with `toEqual`, so any reorder, insert or rename in the first 37 fails. It also pins 37 / 38. Good. The
  existing round-trip test (104-123) covers the new events' lines and units.
- `tests/combatHearing.test.ts:264, 644, 652`: `investigate` -> `heard` follows the `hearSearch` change; counts and
  every other expectation unchanged. Not weakened.
- Lines (G82, G6): original, plain, voiceable, all under 90 characters; "Control" is generic; no reference-game names.
- `docs/systems/ai.md`: Co-op (435-436) and Barks (729-732) match the code. The Rise cause bullet (118-122) is accurate to
  the code as written, but inherits blocking item 1 ("since he was last calm") and polish item 2.
- Scope: the 6 changed files are all in the brief's owned list; `tests/archetypes.test.ts` untouched (passes).

## Blocking
1. `src/ai/enemy.ts:2657-2661` (the latch) with `2115-2118` (the only clear): `sawMoment` / `heardMoment` are cleared
   only on a transition INTO `cooldown` / `unaware`. A guard who is already unaware (or a cautious guard resting in
   cooldown) never makes that transition, so a glimpse above the leak that never reached suspicious stays latched
   indefinitely. Reproduced: 0.2 s at rate 0.5 (meter 0.03, still unaware), 2 minutes of nothing (meter 0), then a
   loud noise alone -> `bark('investigate')` and `riseCause === RISE_SIGHT`. Why it blocks: off-intent. The goal is a
   bark "by what drove it", and `riseCause` exists for S7: PLAN S7 radios `spotCall` ("Control, I saw something down
   there") when a lookout's rise is `RISE_SIGHT`, so a lookout who once half-glimpsed a passer-by would later radio a
   sighting for a pure noise, at the noise's position. It also gives a sound-only rise the line "Thought I saw
   something." (1 in 4). The same latch makes `heardMoment` stale (a light / body check minutes after a faint noise
   reads `RISE_SOUND` and tries to bark "I heard something." after "Light's out").
   Fix: re-arm the moment whenever the guard is calm with an empty meter. In `updateAwareness`, just before the latch
   (after `stepMeter`, so this step's sight / hearing has already lifted the meter):
   ```ts
   const lv = this.aware.level;
   if (this.meter <= 0 && (lv === 'unaware' || lv === 'cooldown')) { this.sawMoment = false; this.heardMoment = false; }
   ```
   (plain booleans, no allocation). Add a `barkCause.test.ts` case: a short glimpse above the leak that stays unaware,
   the meter drained to 0, then `hear(...LOUD)` alone -> `heard`, `RISE_SOUND`. Update the ai.md bullet (118-122) and the
   `RISE_*` doc (`enemy.ts:273-274`) to say "since he was last calm with nothing on his meter".

## Polish
1. `src/ai/enemy.ts:273-274`, `docs/systems/ai.md:119`: `RISE_NONE` is listed as "a board task, a light, a body, a search
   call", but a tier-1 turn sound (`hearTurn`, no `heard` flag, meter up to `HEARING.turnMax` 0.45 > suspicious 0.3)
   also rises a guard to suspicious with `RISE_NONE`. S7 is unaffected (it tests `RISE_SIGHT`); J13's cause log would
   log a sound as none. Name it in the doc, or count `hearTurn` as sound if J13 wants it.
2. `docs/systems/ai.md:118-122` and `729-732` both state "sight wins". One home per rule: keep the rule in the Rise cause
   bullet and let the Barks line point to it ("the investigate bark follows `Enemy.riseCause`, see Rise cause").
3. The brief's "Done looks like" asks for a lead report only; RULES "Definition of done" also wants a
   `changes/feature-guard-rules-s4.md` fragment (kind patch) somewhere in PR3. Not S4's owned file; the lead should
   make sure PR3 carries it.
