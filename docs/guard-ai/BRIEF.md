# Guard AI - brief (job guard-ai, Night Shift | Guard AI Build)

Branch `feature/guard-ai`, folder `C:/NightShift/Mobile-Coop-guard-ai`, cut from master ffade187 (4.64.0) with
`origin/feature/g44-above` merged (#169, guards see poorly above, green, train 16). Started 2026-10-23 ~02:00 Sydney.
Plan base: `docs/reviews/guards-review.md` on `origin/feature/menu` (the 2026-10-20 review: noise reaches every guard,
all walk over, aimless patrols, speeds backwards).

## Michael's words (verbatim, ROADMAP "Decided", 2026-10-23)
- **M1** Guard AI (~01:30): "also note that right now every guard hears when things break or someone gets shot which is
  unrealistic. if they are within range they should hear it, depending on whether they are near something noisey, and
  if they see a guard get killed or find one dead/knocked out they should wake them up (if knocked out), report them
  dead, and become cautious. the only way to clear the cautious guards should be to eliminate any that are aware of what
  happened, but if they were knocked out the caution can be limited. if its a broken or distrupted light, one or two
  people should investigate (if only one is nearby then only one investigates), but they should return back to normal
  after investigating the light and general vicinity of the light. guards that get alerted should alert other guards,
  either by voice proximity or radio., but not everyone should be alerted at once. any guards in a highly secure zone
  should not leave their post or area if they are protecting something of high value or a security door that shouldnt
  be accessed, but they should still be able to be distracted at least. always want to improve enemy ai in general,
  making them smarter, work together, flank, use cover to hide and report, they should be smart and tactical, not just
  rush the player, but any reinforcements must be aggressive. ask me questions if needed"
- **M2** Builder (~01:35): "New session" (Night Shift | Guard AI Build).
- **M3** KO caution (~01:35): "Timed, then search ends" (the woken guard and the one who woke him search, stay cautious a
  few minutes, then normal).
- **M4** Reinforcements (~01:35): "After a raised alarm" (alarm panel hit or a radio report that gets through; killing the
  caller first stops it).
- **M5** Radio (~01:35): "Own section, staggered" (voice range first, then that section over a few seconds; other
  sections stay normal).
- **M6** Cameras (~01:37): "cameras should also see dead or knocked out guards, and report to other nearby guards to
  investigate if so."

Related standing decisions: G240 cameras keep IR everywhere (cutting lights beats guards and the light meter, never
cameras; Answers 3 ~01:25). G11 impromptu search pairs. G44 guards see poorly above (#169). Bible "No randomness that
defeats planning. Patrol cycles are fixed per map" (G143 is the per-run randomised codes / items / rooms). G190 room to
manoeuvre beats guard count. Every map's guards are armed (Answers 3).

## The asks, as testable goals
1. Hearing by range with masking: a noise reaches a guard only within its range, cut by walls, and less near a noisy
   thing (machinery, generator, vent). Not every guard hears a break or a shot.
2. Witnessed kill or found body: the guard wakes a knocked-out guard, reports a dead one (radio), turns cautious.
3. Caution: after a death it clears only when every guard aware of it is eliminated; after a knockout it is timed
   (the woken guard and the waker search, stay cautious a few minutes, then normal).
4. Broken or disrupted light: one or two guards investigate (one if only one is near), check the light and its area,
   return to normal.
5. Alerts spread by voice range first, then radio to the guard's own section, staggered over a few seconds; never
   everyone at once; other sections stay normal.
6. Reinforcements only after a raised alarm (panel, or a radio report that gets through; killing the caller first
   stops it); reinforcements are aggressive.
7. High-security posts (high-value item, security door) hold their post or area, but can still be distracted.
8. Tactical guards: work together, flank, use cover, hide and report, no rushing the player.
9. Cameras (IR, G240) see dead or knocked-out guards and send nearby guards to investigate.

## Ownership and limits
- Mine: behaviour in `src/ai/*` (perception, alertState, enemy.ts, enemyManager.ts hearing, squads, radio, posts,
  reinforcements) and the camera-to-guard reports in the security system.
- Not mine: map data. Course Ready (sector-redesign, research campus, up to 24 guards per section; `ENGINE.md` on
  `origin/feature/sector-redesign` lists the data shapes they need: squads, posts, zones, reinforcements) and Menu Notes
  (marlow-final: `src/game/course/*`, `courseMode.ts`, `ctDevices.ts`, `securityRoom.ts`, `src/world/kit|props|lighting`).
  Data shapes are agreed with them by message. CT Core owns the mocap anim files.
- Protocol: marlow-final has 30, sector-redesign 31; this job takes 32 only if guard state must go on the wire.
- Pure logic in Babylon-free modules with Vitest; hot paths allocate nothing.
- Tests: e2e-stealth-ai, e2e-stealth, e2e-takedown, e2e-coop, e2e-netmove, e2e-ct-warehouse, e2e-sectorops, e2e-ctcourse
  as each slice touches them, all `E2E_GPU=1`, run by Character Build on the laptop (message: branch, commit, suites).

## Assumed decisions (Michael asleep; each with how to undo)
- **A1** M1-M6 are the brief; the review's shortlist (one investigator, paces, barks) is folded in where it serves them.
  Undo: drop the slice.
- **A2** A completed dead-body radio report makes the section cautious (held) but does not raise the alarm or bring
  reinforcements; only an alarm panel or a completed "contact, send backup" command call does (M4 read literally; CT
  counts a seen body as an alarm, research C1). Undo: `ALARM_ON_BODY_REPORT = true`.
- **A3** "Eliminate any that are aware" counts knocked out as eliminated until he is woken; a woken aware guard brings the
  hold back. Undo: count only dead.
- **A4** KO caution: the waker and the woken guard search 60 s round the spot, then stay cautious 180 s, then normal
  (M3 "a few minutes"). Undo: the `CAUTION` table.
- **A5** Sector Ops cameras and lasers that see a player keep raising the alarm (they are the security system's alarm,
  like a panel); camera body sightings only send guards (M6). Undo: route camera / laser alarms through a command call.
- **A6** "Own section" (M5) = the live Sector Ops section (`SectorDef`); other maps are one section unless
  `MapLayout.guardAi.zones` splits them. Radio reaches the whole live section, staggered by distance, max 4.5 s.
- **A7** Choices (investigator, radio order, roles) are by path distance then guard key, never random (G143); combat
  variation uses a seeded RNG per guard per incident in place of `Math.random`. Undo: none needed (replayable).
- **A8** Cautious music: the held caution does not hold the Cautious music (G67) for its whole length; music follows the
  existing alert levels. Undo: map caution to the music tier.
- **A9** Paces: patrol 1.1 (unchanged, keeps the Sector pace checks), cautious patrol 0.95, investigate 0.85, search 0.75
  x walkSpeed; runs only between covers, to a panel, or for aggressive profiles. The slow search pace and calm turn
  apply to calm searches only (a body, a call, a pair); a search that follows combat keeps 1.3 and the aimed turn
  (S2 fix round 2, `Enemy.combatSearch`). Undo: `enemy.ts` pace table.
- **A10** Posted high-security guards: a distraction pulls them to the edge of their leash circle (which map authors size
  so the edge is off the choke), they look, then return facing their post; they never join a search or run to a panel
  outside the leash. Undo: `highSecurity: false` on the slot.
- **A12** A lured posted guard looks toward the lure for at least 5 s at his leash edge (sweep <= +-0.6 rad, so he
  faces away from the choke) before walking back; Course Ready's K4 solo clear (two single takedowns) relies on it.
  Undo: the post look time in the `POST` table (tell Course Ready).
- **A13** (S3) Loud alerts (a hit, gunfire close by, the end of a flashbang, spawned alerted) take the same voice shout
  and 2.5 s contact call as a sighting, instead of the old instant 22 m fan-out: taking out a guard who was just shot
  at also stops his call. Undo: in `Enemy.onLevel` (src/ai/enemy.ts, the `netOn` branch) route `loudAlert || gunfire`
  to an immediate `radioCall` completion (hold 0).
- **A11** Sector Ops tour guards that are melee-only conflict with "every map's guards are armed" (Answers 3): map data,
  passed to Course Ready, not changed here.
- **A17** (S5) A high-security post is lured (not sent) by a noise or gunfire at his investigate tier (inside half its
  effective reach) and by a light he sees go out; at the turn tier he only turns, as anyone. He is never reported to the
  board, so a noise only he heard opens no incident (nobody else is sent in his place). Undo: in `EnemyManager.hear` /
  `noise` / `lightsOut` (src/ai/enemyManager.ts, the `e.secure` branches) also add him to the perceivers, so the board's
  `callR` fallback sends a free guard.
- **A18** (S5) A high-security post in combat fights from inside his leash: chase and strafe points are clamped into it,
  cover outside it is skipped, and a target (or the last known position) more than 1.5 m outside it is held from his post
  facing it, like `Enemy.hold` for a room (design 6 "radios rather than chases"). Undo: drop the `inLeash` / `leashed`
  checks in `Enemy.decide`, `chasePoint`, `pickCover` and `pickAdvance` (he then fights and chases like anyone).
- **A19** (S5) The post's centre is the guard's spawn point (the slot's x, z snapped to the nav cell) and the post yaw is
  the slot's yaw; after a lure he faces the post yaw for `POST.returnFace` 0.8 s, then his normal standing post takes
  over (the calm turn is 60 deg/s, so a turn back of more than ~50 deg finishes after the lure ends). Undo: raise
  `POST.returnFace`, or give `PostDef` its own centre.
- **A20** (S7) A guard sent to a body a camera saw goes straight to investigating (an order over the radio, no 2.4 s
  look first) and, once within `BODY.close` with a clear line, the existing body-found path runs (wake a KO'd guard,
  search; the squad within 22 m searches until S4). Undo: in `Enemy.checkBody` call `sendTo` (the look, then the walk).
- **A21** (S7) No calm guard within `INCIDENT.callR` 25 m of the body: nobody is sent; the report waits `camWait` 30 s
  for one to come in range, then lapses. Design 9's "section turns cautious" waits for S4's caution. Undo: raise
  `camWait`, or send the nearest calm guard of the section at any range (drop `M.callR` in the `camBody` branch).
- **A22** (S7) The radio line is the security desk's, once per body: "Camera N has a man down, {room}." + "Nearest
  unit, check on him." (KO) or "He's not moving. Two of you, go." (dead); N = the camera's place in the map's security
  list (1-based), {room} the `RoomRect.name` under the body (dropped when none); a radio bark over the camera, text
  only (G82). Undo: `camBodyLine` (src/ai/barks.ts) and the label in `GameState`'s `onBody`.
- **A23** (S8) Squad roles run for one engaged group per guard set (the one shared last known position): every alerted,
  free, cover-using guard (not melee, dog, sniper, enforcer, a room holder, passive, held, on an alarm run or closing in)
  when there are at least 2 of them; a lone guard and the parked modes keep today's tactics and today's single flanker
  (the flank role replaces it only while a group has roles). The reporter is the engagement's first contact caller.
  Undo: `TACTICS.minGroup` (enemyManager.ts) to 99 turns the roles off.
- **A24** (S8, A7) Combat dice: one mulberry32 `Rng` per guard, seeded by his `num` at spawn and reseeded
  `combatSeed(matchSeed 0x5eed, engagement, num)` when he goes to combat; an engagement starts when a guard goes to
  combat with nobody else in it (the board opens no contact incidents, so this stands in for the incident id). The
  think cadence stays on `Math.random` (perception, not combat); the parked modes' `callAlert` / shout jitter stays
  (parked, replaced by the radio net). Non-combat: reinforcements face the last known position, a revived guard keeps
  the yaw he went down with (S4, `Enemy.inherit`), the squad radio check spread is a fixed golden-ratio sequence. Undo: `Math.random` back in those places.
- **A25** (S8) Profiles: `EnemyManager.placeSlot` sets `tacticsProfile` `P_POST` for a guard with any post (normal or
  high security: never point or flank), `P_AGGRESSIVE` for `profile: 'aggressive'`, else `P_STANDARD`; a woken guard keeps
  it (`Enemy.inherit`); S6 reinforcements are `P_AGGRESSIVE` (`joinAsReinforcement`). A high-security post in a group (A18) never takes a
  role cover outside his leash (`Enemy.setRole` drops it: he holds where he is), and a point or flank role given to him
  (another profile) becomes search (today's leashed tactics). A guard with a role
  holds his cover and keeps peeking and firing (peek-and-report: his sightings move the shared LKP) instead of stepping
  out after 5 peeks; the point instead walks the last stretch (`closing`, out of the group, `ADVANCE_PACE`) when he has
  no cover left to bound to or after 5 peeks with no sight. The reporter stays crouched and holds his fire while his
  contact call is open. Undo: `holds` in `Enemy.decide` (`inCover`).
- **A26** (S5b) Squads and radio checks in Sector Ops: every section guard joins a squad in `placeSlot` (`squad` tag ->
  section x 100 + squad; none -> the cluster of posts within 12 m; a dog -> its handler's). A member down and not yet
  found is missed at the next check (every ~40 s) and, in the coordinated modes, opens a `missing` incident at where he
  went down whose perceivers are his squad's calm members, so two of them go (lead + cover, the S2 pair; one free: the
  nearest other guard covers); a body already found, or a dog, is not missed; a squad of one has no check of its own
  (nobody to answer; a desk's check covers him); own caller supervisor > officer > first. No caution from a miss (the
  `missing` hold stays unwired, A16). Undo: `EnemyManager.radioCheckNow` (src/ai/enemyManager.ts): `caller.searchAt`
  in place of `reportMissing`, drop the `men < 2` skip; the K_MISSING perceiver pass in `IncidentBoard.assign`.
- **A27** (S5b) Zone and role: a secure zone is a `zone` tag 'secure' or with a word 'sec' / 'secure' ('s3-sec'); its
  guard counts as a perceiver of any disturbance inside his zone circle (his post leash, else 8 m or his route's reach
  + 2 m round his post) and ranks first there (score and distance x 0.25). Roles by class (`ROLE_CLASS`): desk / cctv /
  operator call every squad's radio check of their section (the lowest key of them, calm); supervisor runs to the alarm
  first (distance x 0.1; officer 0.25) and sends someone (x 1.6, as an officer); patrol / tour / response check a light
  first (x 0.8), gate / posted / post / sentry / keyholder / bridge / reception / desk last (x 1.5); other words: none.
  "Where a guard returns after a search" needs no new code: the walker takes every guard back to his own post / route
  (his zone). Undo: `TAGS`, `ROLE_CLASS`, `isSecureZone` (src/ai/sectorTags.ts).
- **A28** (S5b) A dog with a `handler` tag heels on him only (not the nearest squad mate); he goes down (knocked out or
  dead): the dog searches round him, barks (a 14 m noise at the dog: the board sends one guard who hears it), then
  keeps its heel spot by where he fell; a woken handler takes his dog back; a despawned one frees it (the old rule).
  Undo: the `handler` branch of `Enemy.findLeader` (src/ai/enemy.ts) and `EnemyManager.handlerDown`.
- **A29** (S6) The 3 s hand-over (design 7) applies to the command call only. Take the spotter out before his contact
  call gets through and nothing is owed: his voice hearers fight but never call (S3), so no alarm. Once the contact got
  through, a cut commander's call passes to the next guard in the fight (in combat, or the search after it; out of the
  target's sight first, then an officer, then the lower key) 3 s later; with nobody left in the fight the alarm lapses.
  Undo: in `EnemyManager.radioStep` (src/ai/enemyManager.ts) call `this.command.lapse()` instead of `nextCaller()` (any
  cut commander stops the alarm).
- **A30** (S6) Command calls run only under stealth rules (`EnemyManager.stealth`, as alarm panels): Sector Ops,
  Infiltration (and the e2e's coordinated Clear); Free Roam and Course mode (stealth off on this branch) raise no radio
  alarm. The radio alarm needs no panel, counts as the alarm (banner, `alarm` event, playstyle tally, Sector stage) and
  is once per match / Sector section load like a panel. The caller says "Command, contact. Send backup." when he starts
  the 4 s call, so the player sees whom to stop. Undo: drop the `this.stealth` check in `contactThrough`; bark at
  completion in `sink.completed`.
- **A31** (S6) Reinforcements are told by command (no contact call of their own; "Copy, moving!"), profile 'aggressive'
  (S5's string, and S8's numeric `tacticsProfile = P_AGGRESSIVE` since the stack merge): cover first 0.3, 0.8 s between bounds, the last stretch at
  0.75 x run speed, and they never calm (the search after combat never ends). An entry route is run at run speed,
  dropped on sight of the target or after 30 s. Where: Sector Ops `SectorDef.entries` in turn, else its `reinforce`
  points; other live maps `MapLayout.guardAi.entries` of the alarm's section furthest from the player, else the furthest
  `MapLayout.reinforce` point; kinds unchanged (design Q4). No live map has entries yet. Undo: `joinReinforcement`
  (src/ai/enemyManager.ts) -> `e.alert()` (the old alerted spawn, standard profile).

## Stealth over shooting (ROADMAP Decided 2026-10-23 ~10:10; plan S11-S15, `research/stealth-over-shooting.md`)
Michael's theme, verbatim: "reward stealth over shooting as sections get harder"; on alarms: "dont add cameras, that
doesnt make sense". A32-A34 are S10's (on `feature/guard-ai-s10`).
- **A35** (S12) Helmet: the first bullet to the head knocks it off (no damage, stagger 0.9 s, then the normal hit path:
  combat on the shot's origin, contact call); the next head hit kills as today. Takedowns, grabs, sleep bolts, melee
  and explosions ignore the helmet. Undo: `GEAR.helmetHits` 1 -> 0 (`src/ai/gear.ts`).
- **A36** (S12) Body armour: a bullet to the body deals no damage and staggers 0.5 s, at most once per 1.5 s (no
  stun-lock); head hits follow the helmet rule. Item 13 "torso shots only stagger" is read literally for every armour,
  including the alarm-stage armour (CT's stage armour halves chest damage instead). Undo: `GEAR.armourMult` 0 -> 0.5.
- **A37** (S13) Gear by alarm stage, Sector Ops: stage 1 a response team only, stage 2 + armour, stage 3 + helmets
  (CT's order, research C4). Every living guard of the live section gets it at once (no suit-up beat), later spawns at
  spawn; it carries over sections with the stage and a restart drops it with the stage. Other live maps: the one alarm
  is stage 1. No camera is added or changed. Undo: the `GEAR_BY_STAGE` table.
- **A38** (S13) A response team is the stage's `perStage` guards led by a shield guard (`enforcer`, always helmeted),
  the rest armed guards: same count, so the live cap holds. Outside Sector Ops the team is shield + 2 guards (in place
  of grunt, grunt, heavy; G155). `validateGuardAi` rejects an `enforcer` in a section's guard list. Undo:
  `RESPONSE.shieldLead = false`.
- **A39** (S13) Sweep: after the LKP search (60 s) a response team walks the section's route points and posts (thinned
  to 8 m, nearest the LKP first, each once, then again), shield first, the rest 2.5 m behind, 6 s at each; teams of
  different stages start at different points. Never calm, never leaves; only a section unload or restart ends it.
  Undo: `SWEEP.enabled = false` (they search the LKP for good, S6).
- **A40** (S14) "Raise alert" (item 6) means section caution, not an alarm stage (A2 kept). A missed check-in: the
  caller radios "not answering" (2.5 s x reaction, cut if he goes down); on delivery the section is cautious 180 s
  (timed); the S5b pair search is unchanged; a dead find promotes it to the S4 held caution. Found bodies: S4 as
  built. Undo: `MISSING.sectionCaution = false`.
- **A41** (S14) Gunfire (item 7): hearing stays by range (M1, S1). A calm guard who hears a loud (unsuppressed) shot
  radios "shots fired" (one call per shots incident, cuttable); on delivery the section is cautious 120 s (a later loud
  shot refreshes it) and the board sends a pair instead of one. Suppressed shots stay local. No alarm from shots (M4).
  Undo: `SHOTS.sectionCall = false`.
- **A42** (S15) A breaker cut is a fault: one witness (never two) walks at patrol pace to the switch and flips it back
  (2 s), no ring check, suspicious at most, back to his route. A second cut of the same circuit within 60 s is
  tampering: the S2 light incident at the switch. Shot lamps stay dark for good (never relit). Undo:
  `BREAKER.reset = false` (the S2 light incident for every cut).
- **A43** (S15) Late discovery: a dark fixture nobody saw go is noticed by a calm guard who later has it in view
  (`lightInView`) within 12 m; he reacts as a witness would (shot: investigates; cut: the reset walk). Undo:
  `LATE.enabled = false`.
- **A44** (S9) Protocol 32 carries S9's barks and caution plus `AL_HELMET` 32, `AL_ARMOUR` 64 and a `deflect`
  hit-confirm kind; until S9 lands the client sees no gear (the rules still apply on the host). The client puppet builds
  the enforcer shield by kind (no wire change for that). Undo: drop the bits (host-only gear).
- **A45** (S12, S13) Gear art is placeholder parts (a dome on the head node, torso plates, the enforcer's box shield,
  the dome as the dropped helmet); real meshes are a Character Build / art hand-off for the visual pass (in-repo
  Blender, headless). Undo: not needed.
- **A46** (S14) A co-op client's suppressed shot is heard at `SHOT_NOISE x weapon noise` as in solo (9.8 m), not the
  fixed 14 m (`coopHost.ts`). Undo: restore `SHOT_NOISE * 0.5` there.
