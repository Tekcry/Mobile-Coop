# S5b - sector tags (wiring)

Job guard-ai, branch `feature/guard-ai-s5b` (chain tip S3 + S4 + S5 + S7), 2026-10-23. Spec: PLAN row S5b; ENGINE.md
section 7 (sector-redesign's "Requests for guard-ai"; same text on this branch and on `origin/feature/sector-redesign`);
design 6 and 11; STATE "Open" (Course Ready agreed: `placeSlot` reads squad / handler / zone / role / pair / reason as
they are). Not committed (the job lead commits). No map data edited; `em.stealth` untouched.

## Built
- `EnemyManager.placeSlot(e, slot, section, slots?, index?)` reads the `SectorGuard` tags (already on this branch in
  `src/game/sectors.ts`; the shape placeSlot reads is the new `GuardSlotTags` in `src/ai/guardAiData.ts`).
  `sectorMode.fill` passes the section's `guards` and the slot's index (a reinforcement: -1). Course / Infiltration
  calls are unchanged (no slot list: only a hand-set `squad` would join).
- New pure `src/ai/sectorTags.ts`: role classes (`ROLE_CLASS`, `roleFlags`), `isSecureZone`, `zoneRadius`,
  `roleSendMul`, `alarmRunMul`, `callerRank`, `slotSquads` (hand-set / default cluster / a dog's handler), `TAGS`.
- `squad`: every Sector Ops guard joins `squadId(section, squad)` (none: the 12 m cluster of posts, `defaultSquads`; a
  dog: its handler's), so the squad radio checks (`radioCheckNow`, ~40 s) now run in Sector Ops. Caller: a desk role of
  the section (desk / cctv / operator, calm, the lowest key) calls every squad; else the squad's own (supervisor >
  officer > first); a squad of one has no own check. A member down and not yet found is missed once: coordinated, a
  `missing` incident at where he went down with his squad's calm members as its perceivers; the board's `missing`
  assign now takes perceivers first, so two of his squad go (lead + cover, the S2 G11 pair; one free mate: the nearest
  other guard covers). A found body or a dog is never missed. Parked modes: the caller searches (old rule).
- `handler`: the dog is bound (`Enemy.handler`) when both are placed, in either order, and joins his squad;
  `Enemy.findLeader` heels on him only. He goes down (KO or dead): the dog searches round him, barks (`TAGS.dogBark`
  14 m noise through `hear`, the dog skipped: the board sends one guard who hears it), then keeps its heel spot by him.
  A woken handler takes his slot and dog back (`swapSlot` in `revive`); a despawned one frees it (old rule again).
- `zone`: a secure zone (`'secure'` or a word `sec` / `secure`, e.g. Course Ready's `s3-sec`) gives the guard a circle
  (post leash, else 8 m or his route's reach + 2 m) in the board's view (`GuardView.setTags`): inside it he counts as a
  perceiver of any disturbance and ranks first (score and straight-distance rank x 0.25). "Where a guard returns after
  a search": already true, no new code (the patrol walker takes every guard back to his own post / route).
- `role`: alarm runner (`assignAlarm`: supervisor x 0.1, officer kind x 0.25, one line); board score (supervisor sends
  someone x 1.6; a light: rover x 0.8, fixed post x 1.5); radio-check caller (desk) as above.
- `reason` stored (`Enemy.reason`); `pair` stored as the S10 hook (`Enemy.pairSlot`; `EnemyManager.guardAtSlot(index)`
  returns the partner, kept current over a revive). Every tag is kept by a woken guard (`Enemy.inherit`).

## Numbers (`TAGS`, sectorTags.ts; prototype values)
Default squad cluster 12 m (`SQUAD_CLUSTER_M`, existing); radio check 40 s +- 8 (`ARCHETYPE.radio`, existing); secure
first x 0.25, secure circle 8 m (route reach + 2 m); alarm run supervisor 0.1 / officer 0.25; supervisor send x 1.6
(= `INCIDENT.officerMul`); light rover 0.8 / fixed 1.5; dog bark 14 m; missing pair cover `INCIDENT.pairBack` 5 m.

## Files
- `src/ai/sectorTags.ts` (new), `src/ai/guardAiData.ts` (`GuardSlotTags`)
- `src/ai/enemyManager.ts` (`placeSlot`, `bindDog`, `guardAtSlot`, `radioCheckNow`, `deskCaller`, `bodyFoundOf`,
  `reportMissing`, `handlerDown`, `swapSlot`; `fillView` tags; `assignAlarm` one line; `hear` optional `skip`;
  `despawn` / `clear` tidy-up)
- `src/ai/enemy.ts` (tag fields; the role word is `Enemy.job` since the S8 merge, `Enemy.role` being S8's combat role; `findLeader` handler branch, `inherit`)
- `src/ai/incidents.ts` (`GuardView.role/zx/zz/zr` + `setTags`; `mark` zone guards; `best` role / zone factors;
  K_MISSING perceivers first)
- `src/game/modes/sectorMode.ts` (fill passes the guard list and index)
- `tests/sectorGuardTags.test.ts` (new, 20 tests); `scripts/e2e-sectorops.mjs` (part-1 block "sector tags (guard-ai
  S5b)", after the S5 posts block)
- Docs: `docs/guard-ai/BRIEF.md` (A26-A28), `changes/feature-guard-ai.md` (S5b), `TESTING.md` (one item),
  `docs/systems/ai.md` (sector tags entry)

## Assumptions (BRIEF)
- A26 squads and radio checks (miss -> `missing` incident with the squad as perceivers; found body / dog never missed;
  squad of one no own check; no caution from a miss).
- A27 zone and role (secure-zone words; the role classes and multipliers; zone return = the walker).
- A28 the handler's dog (heels on him only; down: search, bark, stays by him; woken: back; despawned: old rule).

## Skipped / open
- `pair` behaviour (S10): only stored + `guardAtSlot`.
- A radio-check miss opens no held / timed caution (`missing` hold still unwired, A16); S4 / S6 may add it.
- Combat and alarm code untouched beyond the one `assignAlarm` multiplier line (S6 may fold `alarmRunMul` into its
  alarm caller choice; S8 owns combat roles).
- The radio check period still uses `Math.random` jitter (existing; A7 says no random: worth a seeded fix later).
- Warehouse Sector Ops has no tags: its guards now get default 12 m clusters, so radio checks (and their barks) run
  there too; squads of one stay silent.
- Course Ready's zones are area labels; only `s3-sec` reads as secure today. Tell them: tag a secure area `secure` or
  `<x>-sec` (or give the post `highSecurity`, which S5 already handles).
- Full `npm run check`, full vitest and e2e NOT run (the lead's order); the new e2e block is `node --check`ed only.

## Tests changed
- New `tests/sectorGuardTags.test.ts`. No existing assert changed. Behaviour change an existing e2e touches:
  e2e-enemies "radio check" (two guards, one KO'd): the caller is now sent by the board as the missing pair's lead
  (`pairSearch` -> `searchAt`), so its "searching" assert still holds.

## Results
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the changed src / test files: clean; `node --check scripts/e2e-sectorops.mjs`: OK.
- `npx vitest run` sectorGuardTags, postsWiring, awarenessWiring, radioWiring, incidents, enemyManagerDespawn,
  sectorRestart, camBodyWiring, guardAiData: 9 files, 144 tests passed.

## What Michael should try (Sector Ops, once a map has squads; campus has them)
- Knock a guard out where nobody sees and leave him: within ~40 s his squad's radio check misses him and two squad
  mates walk to where he dropped and wake him. Hide the body first and they search the spot and find nothing.
- Take the desk guard out first: lone posts are no longer checked on.
- A dog stays with its handler on his round; drop the handler and the dog stays by him and barks, which brings a guard.
