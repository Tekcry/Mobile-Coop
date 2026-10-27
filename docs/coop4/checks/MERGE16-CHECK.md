# coop4 merge 16 check (origin/master into feature/coop4)
Owner: coop4 checker (Opus). Status: done.

**Verdict: PASS.** No FIX items.

Checked: feature/coop4 `7090172cc` (merge `165fb0af1` + test fix `576256cfd` + build notes), base `7b12a71ea`,
origin/master `593b22c58`.

## 1. Conflicts keep both sides

- `scripts/e2e-coop.mjs` header: coop4's AI6 four-page line kept, master's gm-flip wording ("with the guard models on")
  kept; the code below carries master's `GM` default-on switch and coop4's extra e2e-net-lib imports. Nothing dropped.
- `scripts/run-e2e.mjs` `PARTS`: master's `wharf-tgc` / `wharf-tkl` parts and `PART_SCRIPT` rows kept, coop4's
  named-only note for parts 10-12 and `PART_TIMEOUT` / `timeoutOf` kept. Parts 10-12 stay out of `PARTS`.
- `src/game/modes/sectorMode.ts` `loadSection` (lines 838-848): master's look-seed pass and `em.beginLooks(looks)` are
  intact; coop4's `guardForTeam` test is a `continue` before the mission test, so a guard out for the team neither
  queues nor reserves a seed (same treatment as master's mission-held guard).
  - Seeds of spawned guards: `lookOfSlot(section, k)` is `slotLook(map, section, k)`, a pure function of the slot index
    (`src/ai/enemyManager.ts` 2229), so every spawned guard's seed is the same at any team size.
  - 1-2 players: every `minPlayers` tag in data is 3 or 4 (`src/world/maps/campusS*Data.ts`, `campusV2/s*Data.ts`;
    none <= 2), so `guardForTeam` passes every slot and the `looks` list equals master's.
  - What differs at 3-4 players: `beginLooks` reserves fewer seeds when a tagged guard is out at 1-2 (or more when he
    is in at 3-4), so a runtime spawn (reinforcement, response team) may pick a different free seed per team size. It is
    still deterministic for a given team size and section, the host picks it and the seed rides the wire, so host and
    clients agree. That matches master's intent (a runtime spawn never takes a spawned slot guard's seed). No issue.

## 2. chimneyPair busy length: no hijack

The build notes' risky spot 2 misreads the length. `chimneyPair.ts:788` sets
`KIT_PAIR.chimneyPair = { pairS: CHIMNEY.pairS, doneBy: 'a' }` with `CHIMNEY.pairS = 600` (`chimneyPair.ts:96`, master's
value), in the same module that calls `registerKitMove` (loaded eagerly by `teamController.ts:19`
`import.meta.glob('./kit/*.ts', { eager: true })`). So whenever `kitMove('chimneyPair')?.paired` is true in
`coopHost.teamMark` (`src/net/coopHost.ts:1289`), `kitPairS('chimneyPair')` is 600 s, not `SHUTTER_PAIR_S` (4.95 s).
Both climbers stay busy (A20 `taken`) for 600 s + slack, longer than any climb (8.6-23 s + brace + top).
The pair ends earlier on the kit's end (`kitHangEnd` -> `kitPairOver` true for every non-pull-up kind -> `unpair`
clears `teamActive`), so a finished climb frees both at once.

The kit state alone also refuses it (`checkChimney`): a target `b` mid-climb sends `s` = height >= 0, so
`chimneyPair.ts:468` returns `notOffering`; a requester `a` not on the ground gets `busy` (`chimneyPair.ts:470`). Other
moves (boost, relay, throw, hang) on a climber are refused by A20's 600 s busy first. No fix needed.

## 3. Master's new code at 3-4 players

- Shadow-cue notice (`src/ai/enemy.ts` 2955-2975): `P_RATE[i]` and `occKey(OCC_KIND.player, i)` are both the
  `ctx.players()` list index from the same perceive pass; the cue slot is `cues.slotOf(p.id)` (by id); `n` is capped at
  `MAX_INTRUDERS` (4) and `CUE.players` is 4. No list index read as a fixed slot.
- Knife-when-spotted gate (`src/net/coopHost.ts:1079`): per client record `r` (`r.ref.spotted`), no index or pair
  assumption.
- Wharf e2e (`scripts/e2e-sectorops-wharf.mjs`): a 2-page run; its e2e-net-lib imports exist on coop4. Tallow Wharf
  sectors carry no `minPlayers` tags.
- Mission bolt (`sectorMission.ts` `bolt`) works on `slotEnemy[k]` only when he spawned; no change needed.

## 4. Protocol and test fix

- `PROTOCOL_VERSION` = 79 on feature/coop4 (`src/net/protocol.ts:25`) and on origin/master.
- `576256cfd` adds `playerRefsInto` (empty list) and `refs` to the stand-in in
  `tests/mission/sectorMission.test.ts`; no assertion changed.

## Polish (no action needed now)

- Build notes risky spot 2 should say 600 s (`CHIMNEY.pairS`), not 4.95 s.
- A chimney pair whose climber never sends an end (a crash with no leave) keeps both busy to third parties for up to
  600 s; either climber can still start a new move as requester (`bBusy` checks only the partner), which clears it.

## Commands and results (in `C:/NightShift/Mobile-Coop-coop4`, branch feature/coop4)

- `git fetch`; `git diff 7b12a71ea 7090172cc`; `git diff origin/master 7090172cc -- src scripts` (read the three
  conflict files, coopHost, kitNet, chimneyPair, enemy shadow cue, enemyManager look seeds).
- `npm run typecheck:fast`: clean.
- `npx vitest run` on 187 test files (every `tests/**/*.test.ts` naming src/net, playerSlots, teamMoves, sectorMode,
  kit, kitApi, kitNet, knife, piano or sectorMission): 187 files passed; 3707 passed, 3 expected fail, 3 skipped,
  1 todo.
- Not run (by instruction): e2e, `npm run check`, dev server.
