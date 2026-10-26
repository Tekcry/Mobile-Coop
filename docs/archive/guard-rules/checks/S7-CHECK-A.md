# guard-rules S7 check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh: AI behaviour, intent, the flag-off guarantee), branch `feature/guard-rules-s7`, head
e75a1f050, diff `48394def2..e75a1f050`, against `docs/archive/guard-rules/slices/S7-BRIEF.md`, PLAN S7 / Flags / PR4, BRIEF
A9, G335 (static lookouts on high routes, G44 unchanged), Q13 / M3 ("Overlooking it") and VISION rule 8.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on 22 files (lookout, posts, postsWiring, archetypes, breaker, campusPosts, consoleNoticeA4,
  coopGuardAi, courseConsole, deviceTrip, gearWiring, guardAiData, helmetRule, incidents, marlowN4Hold, pairsWiring,
  responseWiring, sectionAlert, sectorGuardTags, squadWiring, urgency, barkCause): 358 pass.
- `npx vitest run` on the 25 other files importing enemyManager or barks: 321 pass.
- `node --check scripts/e2e-sectorops.mjs`: ok; e2e read, not run. No `src/net`, `src/core`, wire, `PROTOCOL_VERSION`
  or `enemy.ts` change.

## Flag off
- `flags.lookouts` read only in `slotPost` at load; a non-lookout post comes back as the same object, so `setPost`,
  `tacticsProfile` and `zoneRadius` see what they saw before. A lookout post gives null (no post); `lookoutN` stays 0.
- Revive / despawn act only when `lookoutN > 0`; the loop adds one check per guard; `clear()` refills two unread
  arrays. `spotCall` in `URGENT` is inert (only `lookoutStep` barks it). `mayLeave` has no runtime caller; no map has
  lookout data yet. Byte-identical.

## Flag on: behaviour
- Never sent: the high-security copy makes him `secure`; the board (`GV_POSTED`), search and send picks skip him; the
  alarm-panel pick stays within leash + 1 m; S5 clamps investigate / search / combat spots to the leash.
- Lure: `lureTo` inside the 1 m leash; e2e asserts he ends phase 5 back on his post.
- Radio: any sight-driven rise into suspicious or investigating (S7-a) barks one `spotCall` and reports a `noise`
  incident with 0 perceivers; the board falls back to the best calm free guard within `callR` 25 m; height from
  `heightAt` (lowest layer, S7-c). Sound or no-cause rises, straight to alert, other post kinds and uncoordinated modes
  give no call (unit-tested).
- Cooldown: 20 s per key; a rise inside it is used up, so no late call.
- Stale state: revive keeps key and post copy and resets the stored `riseN`; despawn zeroes the key; `clear()` /
  `despawnAll` reset all; a key with no free slot holds the perch but does not radio (S7-b).
- Dogs never lookouts (unit-tested). No stuck states. No per-step allocation, no `Math.hypot` in src.
- Intent: G335 fixed perch that radios, G44 unchanged; M3's vent rule in `posts.ts` and ai.md; nothing random, the
  call is a heard radio line, so every detection is explainable. ai.md matches the code.

## Fix list
None.

## Polish
1. e2e (c) ~2730: the second glimpse ~10 s after the call may push a still-investigating lookout straight to alert, a
   false fail. Step until `A.level` is `unaware` or `cooldown` (cap ~16 s after the call), then glimpse; move the
   player off F2's spot (e.g. px + 8, pz + 4).
2. e2e (b) retry ~2683: despawning each guard plus `board.clear()` can leave command, radio and last-known state;
   `em.despawnAll()` restarts cleanly.
3. The radio call reaches the board at once (the contact call's 2.5 s hold, cut by a takedown, M5, does not apply);
   per the brief; watch on walk item 6.
4. ai.md "the nearest calm guard": the board picks by `best()` score (path length, role); wording only.
5. `lookoutN` never goes down on despawn; a gate only until the next `clear()`.
6. S4's `spotCall` lines say "below me": right for M3 perches, odd for a ground lookout.
