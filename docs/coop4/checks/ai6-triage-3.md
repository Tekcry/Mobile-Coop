# AI6 e2e-coop triage 3 (desktop queue run on bc96ecee)

Run: PR #317 last comment (log on the desktop, `laptop-queue-desktop/runs/20261024T110834-...-bc96ecee-29d9`). Two fails:
AI6 (1) `worst 27.75 m`, `lkpWorst {"player":1,"at":[8.75,-24.75],"seenT":0.77,"locT":0.77}`; AI6 (3) "a calm grunt
facing the wall with a walkable leg behind him spawns" (also on d0f574cb).

## Verdict: both test bugs, one cause (the radio alarm's response team was not suppressed)

The AI6 staging turned the alarm panels off but not the radio alarm. A contact call still owes the command call
(`RADIO_ALARM`, `src/ai/enemyManager.ts:90`, `contactThrough` -> `raiseAlarm` with `p` null, `:783`, which skips the
`p.disabled` check). `stealthSystems.onAlarm` (`src/game/stealthSystems.ts:542-602`) then spawns a response team of 3
(`RESPONSE.liveTeam`, `src/ai/gear.ts:38`) at the reinforce point furthest from the host: (18, -24.5)
(`src/world/maps/warehouse.ts:527`), x 16.7 / 18 / 19.3, in the yard lane where all three players hide. S26 hit the same
thing and stages `em.alarmRaised = true` (`scripts/e2e-coop.mjs` S26 block, "S26 coop triage r2"); AI6 did not copy it.

### Fail 1: B reported at his hide (27.75 m)

- 27.75 m = B's stand (9, 3) to B's hide (8.75, -24.75). `seenT == locT` means a sighting (`report(.., seen=true)`,
  `src/ai/intruders.ts:178`), and (2) shows `lkpB` already at the hide when it was read, so B was seen there ~0.8 s before
  the hide window opened (during C's teleport).
- Sight from inside is impossible: a SightWorld probe (`buildWarehouse` boxes, doors open, eye 1.55, targets 1.0 / 1.3 /
  1.6 m) finds 0 of 5477 free 0.5 m points inside the building (z > -18) with a line to B's hide (also 0 for the host's
  and C's hides). Between B's pair (8, -6) / (9.2, -6) and the hide: the z -8.8 / -11 walls, the facade (x 1.8..10.9) and
  the trailer (9, -23).
- The six's hunts never changed (`hunts [0,0,2,2,1,1]`, `badHunt 0`), so the sighter was not one of them; the statues
  do not think; drones are statues. The only other live guards possible are the response team: the probe gives each
  team spawn (16.7 / 18 / 19.3, -24.5) a clear line to every lane hide; B's is the nearest (9.25 m). Alerted, the team
  reports what it sees (`takeSighting`, `src/ai/enemy.ts:2361`, no light needed in combat).
- Not a slot / index mix-up, not a stale sample, not an AI bug: the slot is B's, the point is B's real feet, the sighting
  is real.
- Triage 2 (d0f574cb, C at (20.25, -24.75), 10.28 m) blamed the workshop door; the team spawning 1-3.5 m from that spot
  is the likelier cause. Moving C to (2.75, -24.75) just made B the team's nearest target.

### Fail 2: (3)'s grunt never spawns

Staging raises `em.maxAlive` to `alive + 8`. (1) spawns 6; the team takes the last 2 (third refused at the cap). (1)'s
guards are only despawned after (3), so (3)'s `em.spawn` hits `alive >= maxAlive` (`enemyManager.ts:1865`), returns null,
and the leg finder returns null on the first spot. Geometry is fine: all four spots and their legs are body-free in the
probe, and (9, -7.6) sits next to B's pair spawn.

## Fix (`scripts/e2e-coop.mjs`, test only)

- Staging: `em.alarmRaised = true` (no command call, no team), statues tagged `ai6Statue`.
- (3): despawn (1)'s six and any other live non-statue guard first. The spec says "one calm grunt", and B's searching
  pair was in the room where the leg is.
- Diagnostics: (1) asserts `extraMax === 0` (no guard but the six and the statues), and its LKP failure text now carries
  `per` (per player: slot, stand, hide, LKP, dStand / dHide, seenT / locT), `offReports` (every board report more than 2 m
  off a player's spot: time, player, point, seen or located, before or after the hide), `firstOff` (the first sample off,
  with every live guard: six index or -1, kind, position, level, hunt, sees host / B / C) and `extra`. (3)'s spawn
  failure names each spot's cell / leg / cap / spawn / hearing result.

## Residual risk

- (3) has never run past its spawn: the crouch-walk, the run, the hearing and the noisy hold are all first runs (pad
  steering of C, `seesIndex` slot bits, the 2 s turn bound). Expect a possible new first-run failure there. The new
  diagnostics cover (1) only.
- (1) after the hide: nothing should now see or hear the lane. A heard teleport landing would show as `offReports` with
  `seen false`.
- e2e-sectorops:8's AI6 legs (4)-(6) are still not checked by any triage.

## Checks

`node --check scripts/e2e-coop.mjs` OK. No src change (no tsc / vitest needed). The probe was a throwaway vitest file
(deleted). Rerun: `e2e-coop` on this commit (`E2E_GPU=1`).
