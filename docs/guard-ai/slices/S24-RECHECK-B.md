# S24 recheck B - two intruders (G139), co-op correctness, wire / save, e2e

Verdict: PASS (no blocking finding; one high e2e risk in the new e2e-coop block to fix before the e2e run)

Fresh checker B, 2026-10-23. Head e31edd54 on feature/guard-ai-s24 (diff `dc964d15..e31edd54 -- src tests scripts`).
Read: agent preamble, CLAUDE.md hard rules, the S24 brief, S24-CHECK-A.md, the cut-off S24-CHECK-B.md draft, S24-FIX.md,
the whole diff of `src/ai/intruders.ts`, `enemy.ts`, `enemyManager.ts`, `gameState.ts`, `coopHost.ts`, the e2e-coop S24
block, the e2e-sectorops S6 (b) and guard-cap `pageAlert` retunes, and the Warehouse geometry the e2e block stands in.

## Blocking
None. No broken or unplayable behaviour found.

## Checked and correct (co-op)
- Slots per player id: `IntruderBoard.slotFor` keys by `PlayerRef.id`. Host: `localRef.id` ('local'), used by both
  perception (`players()[0]` is `localRef`) and the shot (`gameState.ts:621`). Client: `RemotePlayer.ref.id` = the session
  peer id, used by perception and by `coopHost.ts:1308` (`r.ref.id`). Same ids on both paths, so no slot mix-up.
  The drone (`slotFor(p.id)`) and parked `missionMode.ts:83` (null -> freshest, else 0) are right.
- No slot leak between players: a guard hunting A who is told of B keeps A (`tell` only binds `hunt < 0`); a loud shot by
  B heard by A's hunters does not move them (`noise` -> `tell`); his own sight always wins (`takeSighting`). `pickTarget`
  gets the hunted player's index; `knownSpot` never returns `t.feet` in stealth. The contact call carries the slot and
  `radioDeliver` passes it through. Roles run one group per slot, with shared `coverSet.owner`. Each slot has its own
  flow field, built once per slot, at most one rebuild per update, round robin.
- Host ghost: only the host's own slot (`gameState.ts:2598-2603`). The client draws no ghost.
- Client disconnects (`removeRemote`): his ref leaves `players()`. Guards hunting his slot go to its last known
  position, search, calm (`hunt = -1` at cooldown), and the slot is then forgotten (`forgetStep`). `pickTarget` gets
  `hi = -1` for a player who has left.
- Player down: `P_DIST` is Infinity for a dead target, so hunters of his slot keep his last known position (`huntPos`)
  and switch to the partner only on sight.
- Host is the only player: the solo path (slot 0, mirror).
- Wire / save: `PROTOCOL_VERSION` and `SAVE_VERSION` are untouched. Nothing new is serialised: `hunt` is not in the
  snapshot and the coopHost change is one argument. Hard rules: no `src/net` import from single player; no per-tick
  allocation found (typed arrays, reused vectors, index loops, `hyp2` / `hyp3`).
- Fix round (bd0cd244): the re-call only on the -1 -> slot step, at most once per guard per fight. `voice()` binds an
  alerted slotless listener by voice only. `contactHunt` / `alarmHunt` are reset by `resetAlarm` and `clear`. This is
  G139-safe in co-op: binding happens only through a call, a shout or a located shot.

## Polish list (not blocking)
1. **A slotless guard paths along the freshest intruder's field** (`enemy.ts:2907` `flowOf(this.hunt)` with `hunt = -1`
   -> `enemyManager.ts:2601-2604` freshest). This is what the brief asked for ("no hunt: today's freshest field"), but in
   co-op it can leak.
   - Scenario: B's fight is running (B's slot is the freshest). A shoots guard G in another room with a suppressed gun
     from the dark. G (`hunt = -1`) makes a slotless call. Every receiver with no line and more than 18 m from his
     target walks B's field towards B's last known position, which nobody told him.
   - Before S24 it was the same shared field, so solo is unchanged.
   - Suggestion: with no hunt in stealth, use no field (go straight to `knownSpot`, or stand) instead of the freshest.
2. **A fight started by another fight's radio has no reporter and is never called in** (`enemy.ts:1733`: `recall` is
   false when `pendingHunt >= 0`; `:1743` called guards never call).
   - Scenario: pair 1 calls in the host. Pair 2 goes to combat on that call while seeing the client, so it hunts the
     client but nobody calls the client in. `callers[client slot]` stays -1, so B's group has no reporter (the brief:
     "each fight has its own reporter"). Command and the alarm's reinforcements only ever hear of A.
   - The same happens when a guard hunting A sees B in combat: his hunt switches with no call.
   - Suggestion: when `takeSighting` gives a slot different from the one he was told, call the contact once (he saw the
     player, so G139 holds).
3. A radio or shout naming B binds an alerted slotless guard who has his own lead (`sawOnce`, his attacker's spot): he
   leaves it for B's position (`Enemy.tell`). This may be wanted; it is not covered by a test.
4. Slot ids are never released (`IntruderBoard.ids`, `clear` keeps them). A client who fully leaves and comes back as a
   new peer (page reload = new trystero `selfId`) takes a new slot. The fifth distinct id in one match gets -1: his
   sightings set no position and his hunters fall back to their own `lastKnown`. This is rare, not a crash.
5. From check A, still open: two groups in the same roles tick can be handed the same free cover; the ghost's
   `slotFor` claims slot 0 before the host is seen; `mirror()` with no freshest leaves `sightT`.
6. A direct `em.lkp` / `lkpValid` write (e2e-sectorops S13 `:3365-3367`) is now never forgotten while no slot is valid
   (`forgetStep` only walks slots). Only test code does this.
7. e2e-coop S24 block: `assert(!!setup ...)` then `setup.sHost` throws a TypeError when the spawn fails (use `setup?.`).
   The replaced `updateLight` also skips `lights.update(dt)` for the block. This is harmless to the asserts.

## e2e risk list
1. **HIGH: the host's hide spot is in line with pair 1** (`scripts/e2e-coop.mjs:1210`, `hostHide [-11, -14.5]`).
   - In combat a guard's line of sight is geometry only: `mayBeSeen` returns true when alerted, so there is no light, range
     or FOV limit. Setting `__s24Light = 0` does not hide anyone.
   - From pair 1's spawn spots (-15, -2.5) and (-14, -2.5), the ray to (-11, -14.5) runs down the aisle past the south end
     of rack x -12.5 (it ends at z -4.2). It then crosses the z -6 wall at x -13.8 / -13.1, inside the open
     dock|racking gap [-16, -13] (`warehouse.ts:235`). No dock prop is on the line: the hazard block at (-14.5, -11.5) is
     west of it, and the low wall at (-10, -13.2) is 1.05 m high.
   - So unless both pair 1 guards have moved into the north half of the aisle, they see the host at the dock. His slot
     then follows him there, and `own1` is measured to a live position 12 m off that guards with line of sight do not
     close to 3 m. Likely FAIL ("pair 1 closes on the host's last known position").
   - Fix before the run: hide the host where every line from the racking aisle is walled off. Dispatch (0, -14) is
     behind the x -4 and z -11 walls from both pairs (checked by hand). Also add a guard on the setup: count
     `e.seesIndex(0/1)` per pair during the hide phase and assert 0, so a bad spot shows as a setup failure, not an AI
     failure.
2. MEDIUM: "own < 3 m within 10 s" with two-guard roles groups.
   - A pair is at least `TACTICS.minGroup` (2), so roles run: the reporter holds cover and the point bounds cover to
     cover (`pickAdvance`). `ALERT.lostSight` is 12 s, so the search (which starts at the spot) does not begin inside the
     10 s window.
   - S6 close-on had to fall back to a partial-closing tolerance for the same reason.
   - A deterministic alternative that still catches the shared-LKP bug: each guard's `knownPt` within 0.5 m of his own
     player's `lkpOf` and more than 10 m from the other's, sampled during the hide.
3. LOW: pair 2's alert. If pair 1's radio (the host's slot) reaches pair 2 before pair 2 has line to the client, pair 2
   takes the host's slot. It switches on sight (own sight wins), and `ready` waits up to 30 s plus 15 s by hand. Lines
   pair 2 -> host spot / host hide and pair 1 -> client spot / client hide are walled (x -4, z -8.8, z -11 walls,
   checked by hand). The client hide is S23's checked spot.
4. The block fails on the bug it guards. With a shared position (or `split` false), `sHost === sClient` fails the slot
   assert, the hunts differ, and the pair whose player was seen first would walk to the other's spot (`oth < own + 5`).
5. e2e-sectorops S6 (b) retune (`:3269-3280`, `:3320`): right and passes for the right reason. The stand-in
   `reportSighting` gives the host's slot. B is told before `alert()`, so his contact names it, `raiseAlarm` gives
   `alarmHunt`, and the reinforcements chase `lkpOf(slot)` on its field. B in combat holds the slot (`huntingOf`).
   `em.ctx` is a private field but readable at runtime. guard-cap `pageAlert`: the same, a measurement only.
6. Not retuned, checked by reading:
   - e2e-sectorops S13 (`:3365`): members spawned by `onAlarm` hunt -1, so their combat search now centres on their own
     spot, not `em.lkp`. The sweep still runs on the mirrored `em.lkp`. The asserts (sweep after 60 s, leader moves more
     than 2 m, none calm at 120 s) should hold, but the "search of the last known position" wording no longer matches
     what they do.
   - e2e-sectorops `:352-362` and `:475-477`; e2e-stealth-ai `reset`, 'lkp', radio, alarm: read the mirror or call
     `em.clear()`, unaffected.
   - e2e-clear hold, e2e-takedown, e2e-missions, e2e-desktop, e2e-lightbake, e2e-sectorops `:243` / `:317` / `:3053`,
     e2e-tactics (parked mode): no assert on walking to the feet.

## What I ran
- `npx tsc --noEmit -p .`: clean (exit 0).
- `node --check` on scripts/e2e-coop.mjs, e2e-sectorops.mjs, guard-cap.mjs, e2e-guard-carry.mjs: OK.
- `npx vitest run tests/twoIntruders.test.ts tests/coopPerception.test.ts tests/coopGuardAi.test.ts
  tests/sectorRestart.test.ts tests/sweep.test.ts`: 5 files, 53 / 53 pass.
- No e2e and no full suite (instructions). The line-of-sight findings come from the map source (`warehouse.ts`), not from
  a run.
