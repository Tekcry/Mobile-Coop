# PR 3 - Interrogate: one training guard with information (CT prototype)

Michael (2026-10-20 08:40): "Add one in Marlow Yard". The hold-A list of a held guard shows INTERROGATE only for a guard
with information (G5, Michael 08:10); no guard had any, so a held guard showed no menu. Now one does.

## What
- Data: `GuardInfo { lines }` (`src/ai/guardInfo.ts`, pure). A guard "has information" when `Enemy.info` is set. A squad
  slot (`rooms.SquadSlot`) carries it (`info`) with a new `passive` flag (a training guard: sees and hears nothing,
  `Enemy.passive`, the existing test flag). `courseMode.spawnSquad` copies both onto the guard it spawns.
- Menu rule: `grabMenu.hasInfo(victim)` (now in `guardInfo.ts`, re-exported) feeds `addGrabRows`: information present ->
  one INTERROGATE row (no BACK TO GAME); none, or spent -> no menu.
- Run: the existing interrogation (1.5 s, hand at his jaw). When it ends `takeInfo` returns the lines and clears them
  (asked once, no menu again), and the guard says them one after the other (`GUARD_INFO_GAP` 2.6 s) through
  `hud.barks.say` (bark over his head on the host, subtitle "Guard: ..." on both). The hold then goes on; it ends only by
  knockout or kill (Michael 08:20). If he is knocked out or killed mid-speech he stops. A scripted Interrogate on a guard
  with none keeps the old feed line "Interrogated: nothing new" (e2e-takedown still passes that way).
- Co-op, no wire change (PROTOCOL_VERSION 24): the host's `Enemy` has `info` from the slot. A client's puppet takes it from
  the same slot by where it first appears (`infoAtSpawn`, within 1.5 m; a post guard has not moved; both sides load the
  same map). The interrogation runs on the interrogator's machine, so each side shows its own lines. The "spent" flag is
  per machine: if a holder drops the guard (holder dies) and the other player grabs him, he may be asked again. Accepted.

## Where in the yard
Station 1, bay 1: `GUARD_SLOT` `s1-guard`, a `grunt` at x 10.5, z 3.2 (by the south fence), facing +x (yaw pi / 2). The
players start at x 2 facing +x, so they come up behind him. Clear of the panel (x 3.5, north fence), the A1 door (z 6.4 to
7.6) and the pad. Only bay 1 lists him; the next bay's start removes him, a bay restart brings a fresh one.

## The lines (docs/story.md: British, 90 characters or less, written to be voiced, no dash)
1. "Easy! There is a medkit on the north wall of the annex." (station 5's wall medkit)
2. "And one on the north fence before the last wall. That is all I know." (station 8's wall medkit)

A test checks both are true against `medkitWalls`.

## Files
- New: `src/ai/guardInfo.ts`, `tests/guardInfo.test.ts`.
- Changed: `src/ai/enemy.ts` (`info`), `src/net/enemyPuppet.ts` (`info`), `src/net/coopClient.ts` (puppet lookup),
  `src/world/rooms.ts` (`SquadSlot.passive`, `.info`), `src/game/modes/courseMode.ts` (`spawnSquad`),
  `src/game/takedownController.ts` (`takeInfo`, the lines, `GrabState.talk`), `src/game/grabMenu.ts` (`hasInfo` re-export,
  comment), `src/game/gameState.ts` (comment), `src/world/maps/ctcourse.ts` (`GUARD_SLOT`, `GUARD_INFO`, `SQUADS`, bay 1 squad),
  `tests/grabMenu.test.ts`.
- Docs: `docs/systems/takedowns.md`, `docs/ct-prototype/CTCOURSE-SPEC.md`, `CHANGELOG.md` (Unreleased - ct-prototype),
  `TESTING.md` (action menu line).

## Tests
- `tests/guardInfo.test.ts` (new): information present -> one `grab:interrogate` row; `takeInfo` returns the lines once, then
  no row (and null); empty / null / missing info -> no row; `infoAtSpawn` finds the slot within reach only; the map's slot is
  passive, has information and is the only squad, bay 1 lists it and no other bay does; it stands clear of the door and the
  pad facing +x; lines: one or two, at most 90 characters, no dash; the lines match the medkit positions.
- `tests/grabMenu.test.ts`: the `hasInfo` assertions follow the new shape.
- Run: `npx tsc --noEmit` clean, eslint clean on the changed files, vitest guardInfo / grabMenu / ctcourse / camSpaces / rooms /
  contextMenu pass.

## Checks pending
None: see Result below.

## What Michael should try
Start Marlow Yard, walk straight ahead from the start to the guard (x 10.5, by the south fence), grab him from behind (A),
hold A: INTERROGATE. Release on it: his hand-at-jaw pose, then two subtitle lines, the hold goes on, hold A shows no menu
now. RT kills, LT knocks out.

## Result (2026-10-20, desktop, `heavy.lock` held, port 4196)
`npm run build` ok; `e2e-takedown` passes (16 s, unchanged, its scripted Interrogate on a guard with no information still
ends in the hold and the neutral feed line); `e2e-ctcourse` passes (640 s; the first run was cut at 595 s by my own
timeout, the rerun with `E2E_SUITE_TIMEOUT=1500` passed). Not run: an e2e of the interrogation with information itself
(the yard guard on a real grab and the two subtitle lines); covered by the unit tests plus Michael's playtest.
