# S24 fix round (check A finding 1) - Opus implementer, 2026-10-23

Head before: 96d565e5. Fix commit bd0cd244 (code + unit tests), then the e2e / docs commit on top.

## Root cause
A guard who goes to combat with no intruder (`hunt = -1`: hit or shot from the dark, spawned alerted, gunfire) makes
his shout and contact call with incident -1, so every receiver joins with `hunt = -1`. Nothing rebinds them later: a
receiver takes an intruder only from his own sight, another call / shout naming one, or a located shot. When the caller
(or anyone) then sees the player, only he gets slot 0. The joiners keep `knownSpot` = their own spot (no walk to the
fight), are in no roles group (`rolesFor` needs `hunt === slot`), do not hold the slot (`huntingOf`), and the alarm's
reinforcements (`alarmHunt` = the raiser's -1) stand at the entry. Before S24 the shared `lkp` pulled all of them in.

## The change (check A's suggested shape; G139-safe)
- `src/ai/enemy.ts:1249-1261` `takeSighting(p, recall = true)`: when a sighting gives a guard his **first** intruder of
  the fight (`hunt` was -1) on the radio net, he calls the contact again (`callContact`: shout + section call, incident =
  the new slot). `radioNet` dedupes by caller + inc + kind, so the new call goes out; `radioDeliver` -> `Enemy.radio` ->
  `tell` binds every alerted receiver with no intruder, and a calm one takes it on going to combat (`pendingHunt`).
  The re-call also runs `noteCaller`, so the slotless caller becomes his group's reporter once he has a slot (check A
  polish item "noteCaller skips hunt -1 callers", covered with no extra code). At most one re-call per guard per fight
  (only on the -1 -> slot step; `hunt` ends at cooldown / unaware).
- `src/ai/enemy.ts:1730-1733` `onLevel('alert')`: a guard going to combat on his own alert passes `recall = false` (his
  own call follows below, already carrying the slot); a guard told by a call / shout that named nobody who sees the
  player at that moment re-calls (he is the one who can name him). Told of a slot: no re-call.
- `src/ai/enemyManager.ts:2163-2175` `voice()`: an alerted listener with no intruder who hears a shout naming one takes it
  at once (`tell`); before, voice skipped every alerted guard. One wall ray at most, only in that case.
- `src/ai/enemyManager.ts:166-168, 355-362, 705-706, 716-718, 3141-3142`: `contactHunt` = the slot of the last contact
  call that got through (reset by `resetAlarm` / `clear`). `raiseAlarm`: `alarmHunt = e.hunt >= 0 ? e.hunt :
  contactHunt`; a contact naming a slot that gets through while the alarm is up with `alarmHunt` -1 sets it. So
  reinforcements spawned after either moment hunt that slot; those already in the section are bound by the call itself.

Why not bind every slotless guard at once in the manager on any sighting: in solo that is exactly the old shared path
(instant), but in co-op it is a G139 leak (a guard who only heard "contact" would learn of a player seen by a squad
across the map with no call). The re-call keeps it voice / radio mediated in both.

Residual difference from pre-S24 solo (a consequence of this shape, not a blocker): slotless joiners out of voice range
bind when the re-call completes (`RADIO.callIn` 2.5 s x reaction + the stagger), not on the tick of the sighting; those
in voice range bind at once. If the re-caller goes down before his call completes it is cut (as any call) and the far
joiners stay slotless until someone else sees the player.

## Tests (unit)
- New in `tests/twoIntruders.test.ts`: (h) a contact with -1 -> receivers hunt -1 and stand; the caller sees B -> the
  voice-range joiner hunts B at once, the far one after the call; both `knownSpot` = B's slot position; nobody gets A;
  the caller is B's reporter; a second sighting makes no new call. (f2) solo parity with alerted guards at hunt -1
  (check A polish 1): the victim's -1 call, joiners at -1 stand at their own spot, a -1 guard raises the alarm
  (`alarmHunt` -1); the victim sees the player -> all four hunt slot 0, `knownSpot` = `lkpOf(0)`, one roles group
  (victim reporter, point, overwatch, flank), `alarmHunt` 0 and a reinforcement joins with 0; the victim down -> slot 0
  kept (his squad hunts it). Both fail with the re-call disabled (checked).
- `npx tsc --noEmit -p .`: clean. `npx eslint` on enemy.ts, enemyManager.ts, twoIntruders.test.ts: clean (scripts/ is
  eslint-ignored; `node --check` on e2e-coop.mjs, e2e-sectorops.mjs, guard-cap.mjs: OK).
- `npx vitest run` intruders, twoIntruders, coopPerception, squadRoles, squadWiring, radioNet, radioWiring, alarmCall,
  responseWiring, sweep: 10 files, 145 / 145 pass. Also hearing, sectionAlert, postsWiring, bodySearch, coopGuardAi,
  deviceTrip, sectorRestart, urgency, enemyManagerDespawn, s6CloseOn: 10 files, 120 / 120 pass.
- No e2e run here (instructions).

## e2e changed
- `scripts/e2e-sectorops.mjs` S6 alarm (b) (3269-3280, new assert 3320): the direct `em.lkp` / `lkpValid` / `sightT`
  write gave no guard an intruder, so after S24 (A146 / A148) the reinforcements have no position and stand at the entry
  ("they close on it along the route" fails by design; the fix cannot help, nobody sees anyone). Now the player is
  reported seen at the spot (`em.ctx.reportSighting` with a stand-in ref carrying the host's id, so the real player is
  not marked spotted) and B is told of that slot before `alert()`: B's contact names it, `raiseAlarm` gives it to the
  reinforcements. New assert: B hunts that slot and `lkpValid`. Every old assert unchanged.
- `scripts/guard-cap.mjs` `pageAlert` (461-476, a measurement, no assert): same reason (alerted with no intruder = no
  chase and no flow field, so the measured load dropped). Now reports the player seen where he stands and tells every
  guard before `alert()`: the old "every guard chasing" load.
- `scripts/e2e-coop.mjs` new block "guard-ai S24: two intruders" (1204-1363; header line 10), per S24.md "e2e" in the
  S23 block's shape (own match, statues, a fixedUpdate hook recording per step, a finally that restores). Pair 1 (-15 /
  -14, -2.5) faces the host at (-14.5, 5.2) in the racking aisle, pair 2 (8 / 9.2, -6) the client at (9, 3) (S23's
  spot); a wall and the racks block each pair from the other player; both players lit by a pinned light (the host's
  sampler replaced for the block); the mission's guards are statues with their hitboxes parked (no ray stops on them),
  panels off. Asserts: two valid slots, pair 1 hunts the host's and pair 2 the client's; after both go dark and leave
  (host to the dock, client into the corridor), within 10 s each pair's closest approach to its own player's last known
  position < 3 m and to the other's > that + 5 m; no guard of either pair ever hunts the other's slot. Not yet run:
  spots were picked from `warehouse.ts` and S23's known spots; on a miss the messages print positions, hunts, levels.
- Not changed: e2e-sectorops S13 response team (writes `em.lkp` directly, then the mode's `onAlarm` bypasses
  `raiseAlarm`, so `alarmHunt` is -1; no report re-mirrors the fields, so the sweep still starts at that `lkp`, members
  reach searching by `ALERT.lostSight` and sweep after `searchTime`: its asserts hold by reading). e2e-stealth-ai radio /
  alarm blocks: their sightings give a slot at the alert (no re-call); spawned-alerted guards with no sighting never
  re-call.

## Polish list (left)
- Two groups in the same roles tick can be handed the same free cover (`assignRoles`' taken list per call;
  `reserveCover` still stops double occupancy).
- The host ghost calls `slotFor(host id)` every frame (claims a slot before being seen; harmless).
- `mirror()` with no freshest leaves `sightT` as it was.
- The radio-mediated rebinding latency and a cut re-call leaving far joiners slotless (above).
- The `onLevel('alert')` re-call path (told by a slotless call, sees at the alert) has no unit test of its own (the
  `takeSighting` path it uses is covered by (h) / (f2)).
