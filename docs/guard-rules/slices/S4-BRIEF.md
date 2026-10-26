# guard-rules S4: barks by cause (slice brief)
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5 (AI code). Ships ON (a fix, bible P5; PLAN "Flags": no flag). Rows: C4. Assumption: A8
(`docs/guard-rules/BRIEF.md`). Source: `docs/guard-rules/PLAN.md` "PR3" S4. Every anchor below is checked against
`feature/guard-rules-s5` at a09495007 (PR1 + S5); S5 moved `enemy.ts` lines, so use these, not PLAN's (drift list at the
end).

## Goal
A guard who saw something never says "I heard something.": the rise to investigating barks a sight / neutral line or a
sound line by what drove it. The rise cause is stored on `Enemy` (`riseCause`, `riseN`, `stimX` / `stimZ`) for S7's
lookout radio and J13's cause log.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-rules-s4`, branch `feature/guard-rules-s4`, cut from the F0 commit
  (`docs/guard-rules/slices/F0-BRIEF.md`). Start from `docs/systems/agent-preamble.md` (origin/master); branch guard
  before every write; commit and push each finished sub-step, `git add <your files>` only.

## Files owned (wave 3, file-disjoint from S6)
- `src/ai/barks.ts`, `src/ai/enemy.ts`
- `tests/barkCause.test.ts` (new), `tests/combatHearing.test.ts`, `tests/coopGuardAi.test.ts`, `tests/archetypes.test.ts`
- `docs/systems/ai.md` (S4 is PR3's only ai.md editor; S6's lines reach ai.md through the lead, see "Docs")

## Steps
### 1. `src/ai/barks.ts`
1. `BarkEvent` (5-52): append two members after `'consoleCheck'` (52), with a comment line
   `// (guard-rules S4, A8) a rise by sound; the lookout's radioed sighting (S7)`: `| 'heard'` and `| 'spotCall'`.
2. `BARKS.investigate` (56): drop `'I heard something.'`, put one sight line in its place, keep 4 lines (the line
   index rotation stays the same): `['Checking it out.', 'Going to look.', 'Thought I saw something.', 'Moving to check.']`.
3. `BARKS` (54-96): append, under a `// (guard-rules S4, A8) original lines, written to be voiced later (G82)` comment:
   - `heard: ['I heard something.', 'What was that noise?', 'Heard something over there.']`
   - `spotCall: ['Control, movement below me. Someone check it.', 'Control, I saw something down there. Need eyes on it.']`
   Every line original and under 90 characters (G82; `tests/archetypes.test.ts` and story.md radio rule). No
   reference-game names.
4. `BARK_EVENTS` (118-126): APPEND ONLY after `'console', 'consoleCheck',` (125), with
   `// (guard-rules S4, A8) appended (the train's protocol bump covers it)` then `'heard', 'spotCall',`. Today's 37
   entries keep their indices (`consoleCheck` = 36); `heard` = 37, `spotCall` = 38. Never reorder, never insert.
5. `RADIO_BARKS` (148): add `'spotCall'` (a radio line: the chirp plays). Not `URGENT` (150). `heard` is spoken (not
   radio, not urgent).

### 2. `src/ai/enemy.ts`
1. Exported constants: add next to the other module constants (after `COVER_TRIES`, 272):
   ```ts
   /** (guard-rules S4, A8) Why his last rise into suspicious / investigating happened (`Enemy.riseCause`): none (a board
    *  task, a light, a body, a search call), sight (`seenAt` this calm moment) or sound (a heard noise, no sight). */
   export const RISE_NONE = 0;
   export const RISE_SIGHT = 1;
   export const RISE_SOUND = 2;
   ```
2. Fields, beside `stimulus` / `hasStimulus` / `heard` (464-466):
   - private `sawMoment = false` and `heardMoment = false` (sight above the leak / a heard noise since he was last calm).
   - public `riseCause = RISE_NONE` and `riseN = 0` (bumped on every rise into `suspicious` or `investigating`), each
     with a one-line doc naming S7 and J13 as readers.
   - public getters `get stimX(): number { return this.stimulus[0]; }` and `get stimZ()` likewise. Read-only, no copy.
3. `updateAwareness` (2579-2637): right before `const from = this.aware.level;` (2622) add
   ```ts
   // (guard-rules S4, A8) what this calm moment rests on: sight (the game's `seenAt`) wins over a sound
   if (!this.alerted) {
     if (seen) this.sawMoment = true;
     if (this.heard) this.heardMoment = true;
   }
   ```
   `seen` is the existing const at 2580 (`seenAt(this.rate)` when not alerted). Do not move `this.heard = false` (2634).
4. `onLevel` (2049-2066+): before the bark chain (2057), when `to === 'suspicious' || to === 'investigating'`:
   `this.riseCause = this.sawMoment ? RISE_SIGHT : this.heardMoment ? RISE_SOUND : RISE_NONE; this.riseN++;`
   Then line 2058 becomes
   `else if (to === 'investigating') this.bark(this.riseCause === RISE_SOUND ? 'heard' : 'investigate');`
   The `suspicious` bark (2057) is unchanged ("Huh?" fits both causes).
5. `onLevel` calm block (2079-2083, `if (to === 'cooldown' || to === 'unaware')`): add
   `this.sawMoment = false; this.heardMoment = false;` (the next calm moment starts clean). `riseCause` / `riseN` are
   NOT cleared (S7 compares `riseN` with its last copy).
6. `hearSearch` (1224-1242): line 1239 `this.bark('investigate')` -> `this.bark('heard')`. Update its doc (1220) only if
   the wording names the event; "I heard something." stays true.
7. Nothing else in `enemy.ts`: `sendTo` (1268-1286), `checkLight`, the body paths (1310, 1356) keep calling `onLevel` as
   today; they get the cause rule above for free (a board send sets `heard`, so SOUND; a light or a body with no sight
   this moment, NONE -> `investigate`).

### 3. Tests
- `tests/combatHearing.test.ts`: 264 `toHaveBeenCalledWith('investigate')` -> `'heard'`; 644 and 652 filter
  `c[0] === 'investigate'` -> `'heard'`; the comment at 260 stays. Nothing else in that file.
- `tests/coopGuardAi.test.ts:84-88`: passes as is (it compares `BARK_EVENTS` with `BARKS` keys). Add in the same
  describe (83+) one case: the first 37 entries equal a literal copy of today's list (the wire order is frozen), and
  `barkIndex('heard') === 37`, `barkIndex('spotCall') === 38`.
- `tests/archetypes.test.ts:91-94`: unchanged (it uses `investigate`, still 4 lines). Touch only if it fails.
- `tests/barkCause.test.ts` (new). Stand-in guard as `tests/guardPolish2.test.ts:256` (`Object.create(Enemy.prototype)`
  + the fields `updateAwareness` / `onLevel` read; `bark` as `vi.fn()` so the voice cooldown does not hide events).
  NOTE: `Object.create` skips field initializers, so the stand-in sets `sawMoment`, `heardMoment`, `riseCause`, `riseN`
  itself. Cases:
  1. A noise alone (`hear` at a radius that gives `noiseSuspicion` >= `PERCEPTION.investigate`): straight to
     investigating, `bark('heard')`, `riseCause === RISE_SOUND`, `riseN === 1`, `stimX` / `stimZ` = the noise.
  2. A soft noise: suspicious, then after `ALERT.hearLook` investigating: `heard`; `riseN === 2`.
  3. Sight only (`rate` above `PERCEPTION.leak` until the meter passes `investigate`): `bark('investigate')`,
     `RISE_SIGHT`.
  4. A seen player never "heard": a noise and a glimpse above the leak in the same moment -> `investigate`, `RISE_SIGHT`;
     and a glimpse during the suspicious moment, then the sound timer walks him over -> still `investigate`.
  5. Back to calm (cooldown or unaware) clears the moment: a later noise alone barks `heard`.
  6. `hearSearch` while searching barks `heard` (once per `COMBAT_HEAR.bark`, A185 unchanged).
  7. `riseN` does not move on alert, searching or calm transitions; `riseCause` is kept after calm.
  8. `BARKS`: `investigate` has no "I heard something."; `heard` and `spotCall` lines exist, each <= 90 characters;
     `RADIO_BARKS.has('spotCall')`, not `heard`.
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/barkCause.test.ts tests/combatHearing.test.ts tests/coopGuardAi.test.ts tests/archetypes.test.ts tests/guardPolish2.test.ts tests/guardPolishA.test.ts`
  (the last two use the `Enemy` stand-in and `onLevel`; they must stay green). Never `npm run check`.
- Before changing any line text, grep `tests/` and `scripts/` for it: checked on a09495007, no test or e2e asserts the
  text "I heard something." or the event name `investigate` outside the files above.

### 4. Docs (`docs/systems/ai.md`)
- Barks line (717-718): add `heard` (a rise by sound, `hearSearch`) and `spotCall` (S7's radio line), and the rule: the
  investigate bark follows `Enemy.riseCause` (sight wins; A8).
- Co-op (422-425): `BARK_EVENTS` appended `heard`, `spotCall` (indices 37, 38); the train's protocol bump covers it.
- Add one bullet near the alert levels (after the Alerts and radio block, ~98-115) for `riseCause` / `riseN` /
  `stimX` / `stimZ` (readers: S7 lookouts, J13 cause log).
- Fold in S6's Talking pairs lines (187-201) only if the lead hands them to you before your last commit; otherwise the
  lead folds them at the PR3 merge.

## Hot-path rules
`updateAwareness` and `onLevel` run per guard per fixed step: plain booleans and numbers only, no closures, no arrays,
no new objects, no string building. `hyp2` / `hyp3` if you need a distance (you should not); never `Math.hypot` in
`src`.

## Wire
`BARK_EVENTS` append only (two entries at the end). Do NOT edit `PROTOCOL_VERSION` (`src/net/protocol.ts:21`) or any
`src/net` file: `coopHost.ts:315` sends `barkIndex(ev)`, `coopClient.ts:942-944` rebuilds with `barkLine`; both work
for the new indices unchanged. `BARK_CAM` 254 stays far above 39.

## E2E (the lead requests; the builder runs none)
PR3 gate (`affected-e2e`): e2e-anim, e2e-combat, e2e-guard-carry, e2e-move, e2e-sectorops, e2e-stealth-ai, smoke; the
lead adds e2e-coop, e2e-netmove, e2e-ctcourse for the `bark` wire append. Walk item 8 (a seen player never gets "I
heard something.") is Michael's.

## Done looks like
- A guard who saw anything above the leak in this calm moment says a sight / neutral line when he investigates; a guard
  who only heard says a `heard` line; a searcher who hears a noise says `heard`.
- `Enemy.riseCause`, `riseN`, `stimX`, `stimZ` exist with docs; `RISE_*` exported.
- `BARK_EVENTS` = today's 37 + `heard`, `spotCall`; the vitest files above green; tsc clean.
- ai.md updated as above; a report for the lead (built, files, commits, tests, results) in your final message.

## Est. lines
~200 (barks ~15, enemy ~30, tests ~150; docs not counted).

## Assumptions (logged here; closest to PLAN / BRIEF)
- S4-a: "sight evidence" = the game's `seenAt` (rate above `PERCEPTION.leak`), the same test `Enemy.disturbed` uses;
  a glimpse below the leak does not count. Undo: use `rate > 0`.
- S4-b: a third value `RISE_NONE` (0) for rises with neither (a board task, a light, a body, a search call); PLAN names
  only `RISE_SIGHT` / `RISE_SOUND`. S7 tests `=== RISE_SIGHT`, so it is unaffected.
- S4-c: a board-sent guard (`sendTo`) counts as a sound rise (it sets `heard`); his `checking` line already holds the
  voice cooldown over his `heard` line, so nothing new is heard in play.

## Must NOT touch
`src/ai/enemyManager.ts`, `src/ai/pairs.ts` (S6), `src/core/flags.ts` (F0), `src/net/**`, `src/net/protocol.ts`,
`scripts/**`, `tests/pairs*.test.ts`, any other test file, any map data, `docs/` other than ai.md. No flag.

## PLAN pointer drift (PLAN says -> now, a09495007)
- `enemy.ts` `onLevel` 2036-2048 -> 2049-2066 (barks 2057-2058); the step's `heard` flag 462 -> field 466, read at
  2597 (`i.heard`), cleared 2634; the PLAN's "2582" -> 2597; `hearSearch` 1226 -> 1224 (bark at 1239); `stimulus`
  459-461 -> 464-466.
- `enemy.ts` `bark` 982 -> 994 (S7's pointer); manager `e.update(dt)` 3643-3652 -> 3746, `report` 2392-2396 -> 2488
  (S7's pointers; S7's brief must re-check them after S4 and S6 land).
- `ai.md` barks 640-642 -> 717-718; Co-op 394-397 -> 422-425.
- Unchanged: `barks.ts` 56, 118-126; `combatHearing.test.ts` 264, 644, 652; `coopGuardAi.test.ts` 84-88;
  `archetypes.test.ts` 91-94.
