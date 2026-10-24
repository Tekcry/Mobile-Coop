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
- **A32** (S10) A talking pair meets at the nearest pair of stops (one per route) within `PAIRS.meetMax` 6 m whose stays
  overlap (`pickMeet`; a tie within 0.05 m goes to the longer stay), timed at the slower guard's `walkSpeed` (a timed loop
  walks at `walkSpeed`, not the x1.1 patrol pace the module note assumed); the two clocks are lined up by each walker's
  loop time when the second guard is placed. No timed loop, periods that differ or no overlap: no pair, logged
  (`EnemyManager.pairSkips`, a console warning). Undo: `PAIRS.meetMax` / `pickMeet` (src/ai/pairs.ts), or add an explicit
  meet-stop field with Course Ready and read it in `EnemyManager.buildPair`.
- **A33** (S10) While meeting, both stand at their meet points facing each other until the talk ends (~6.7 s from the
  meeting: lines at 1.0 and 4.2 s, then 2.5 s), even past the earlier stop's `leave`: the walker's clock and schedule run
  on underneath, so a held guard walks on late and his next timed stop takes the delay back. (The module's `leaveR` split
  therefore never fires in play.) Undo: in `Enemy.calmDecide` (src/ai/enemy.ts, the `pairFace` branch) return the
  walker's point once he has arrived and the walker moves him on, so his schedule splits the talk.
- **A34** (S10) A partner who never comes (down, held, despawned; `PAIRS.grace` 6 s after the window opens) opens a
  `missing` board incident at his last route point with the one left as its only perceiver (he leads, the nearest free
  guard covers; keyed by the missing guard's number) and the missing guard counts as missed for the squad radio checks
  (not missed twice); parked modes: the one left searches himself. A disturbance that stops a talk without changing his
  level is a look toward a sound (`hearTurn`), a post lure, or sight evidence above `PERCEPTION.leak`. The lines go
  through the bark layer like any bark: shown over the speaker and as a subtitle with no earshot limit (the layer has
  none), and not sent to a co-op client (no bark is). Undo: `EnemyManager.pairMissing` (src/ai/enemyManager.ts) calls
  `goer.searchAt` in place of `report('missing', ...)`; `Enemy.disturbed`.

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
- **A47** (S12) Gear stops any bullet that reaches a guard, a guard's own round into a hostage held as a shield
  included (only the player's bullets were named). Undo: in `Enemy.applyDamage` gate the gear branch on
  `h.attackerTeam === 'player'`.
- **A48** (S12) The placeholder helmet is the rig's existing combat-helmet part (`'helmet'` shape, the `combat` look's
  size), not a plain dome; the armour is the rig's plate set (chest and back plates, shoulder caps). The dropped helmet
  is the same part (pool of 8, oldest reused, its colour from the first drop: one faction per map) and is cleared with
  the guards (`EnemyManager.clear`). Undo: `'dome'` in `Enemy.buildHelmet` and `HelmetDrops.drop`.
- **A49** (S12) A new bark event `deflect` (non-urgent, original lines: "Argh! Still up!", "Took one! Still
  standing!", "That was close!"), said before his contact line. Undo: drop `this.bark('deflect')` in `Enemy.deflect`.
- **A50** (S12) The vest's stagger cooldown counts from his last strike-style stagger (`strikeStagger`, which the gear
  staggers use); the 0.35 s heavy-hit flinch and a takedown release do not reset it. Undo: set `sinceStagger = 0`
  in those two places too.
- **A51** (S12) The `deflect` hit marker is steel blue (`#8fb3d9`, `styles.css`) with a 2600 Hz ping (`sfx.hitMarker`);
  the HUD and sfx `hitMarker` signatures take the new kind. Undo: drop the CSS rule and the ping (falls back to the
  white hit marker).
- **A80** (S16, Sector Ops E10) A guard never fires into armour: before the wind-up, a burst and every round
  `Enemy.tryFire` casts the fire line (the muzzle `shoot` uses -> its aim point before spread, `MASK.ENEMY_SHOT`, plus
  `G.ENEMY_HITBOX` against a human shield); a first hit with `G.GLASS_ARMOURED` (armoured pane or door leaf) drops the
  wind-up and the burst. Aimed, suppressive and blind fire are all gated. Undo: drop the `armourBlocks` call in `tryFire`.
- **A81** (S16) The verdict is cached per guard for `ARMOUR_FIRE.recheck` 0.25 s while his nav cell and the aim's stay the
  same (a new cell recasts at once): at most ~4 rays a second per fighting guard, no allocation. Undo: `recheck` 0.
- **A82** (S16) Held fire with the target in sight for `moveAfter` 1.0 s starts a reposition: a cover user takes the
  existing cover pick in relocation range (5-22 m), clear-line spots only; no such spot, or no cover use, chases round by
  the nav flow field at 0.75 x run, not stopping to engage while the line stays armoured. A reposition lasts at most
  `moveT` 8 s and ends early on a clear line; the next may start `retry` 6 s after it; in between he holds. Undo: the
  `ARMOUR_FIRE` table, or drop the plan branch in `Enemy.decide`. With S8 roles (merge of master 4.75.0): the role
  step runs first (a bound the group starts is not cut short), then this check, for a role holder too (his rounds are
  gated in `tryFire` whatever path calls it); a reposition blocks the cover he leaves for the role picks
  (`blockCover`, `TACTICS.blockS` 5 s) and drops his role cover until the next roles tick, so the group does not send
  him straight back. Undo: move the S16 block above the `roleStep` call.
- **A83** (S16) The cover pick casts a spot's line (standing muzzle height -> the target's aim point) only for a spot that
  would be the new best, at most `coverCasts` 6 per pick; an unverified spot is skipped. Undo: raise `coverCasts`.
- **A84** (S16) A guard held to a room (`hold`) or a post leash with the target outside it only holds: he tracks and
  faces him, never fires into the armour and never leaves. Undo: `plan(true)` in `Enemy.decide`.
- **A85** (S16) Sight (`MASK.SIGHT`), hearing (`MASK.HEARING`), the alert level and reporting are unchanged: a guard behind
  clear armour still spots, shouts and radios. Plain glass is unchanged (not in the shot mask: guards fire through it).
- **A86** (S16) Co-op: host only (the host's guards decide), no wire change; a client player behind armour is a
  `PlayerRef` like the host's and gets the same gate.
- **A87** (S16) The ray is `Ballistics.armouredFirst` (src/weapons/ballistics.ts, a combat file): an additive,
  allocation-free method in `ray`'s order (a hit volume or prop first is not armour). Sector Ops are told. Undo: remove
  it with the gate.
- **A88** (S16 fix round) The e2e block "guards hold fire at armour" (`e2e-sectorops.mjs` part 6) picks the player's
  hall floor spot with the AI still frozen, by each NOC guard's own `Enemy.perceive` at his window post, then turns the
  AI on and asserts `los` through the update path. The first run (fb192d45) failed in the test, not the game: three of
  its five spots were inside pod P1 (racks under the 3.0 roof), and the pair, alerted without sight, walked off the
  window toward the stairs before the one visible spot (-1.5, 32) came up; from the back of the NOC the 4.6 sill hides
  the floor. New spots: the hall's west aisle (-2.5, 30), (-2, 31), (-1.5, 32), (-2.5, 29), pinned by
  `tests/campusS4NocSight.test.ts` (clear from both posts +-0.3 m at chest / head 0.9-1.6, each line crosses arm-noc).
  No game change. Undo: the old spot loop (alert first, then try spots).
- **A89** (S16 fix 2) The same e2e block runs its timed part in sim time only: `loop.manual = true` before the alert
  (rAF frames render, never step), as the other blocks with sim-time steps do. Without it every page round trip let rAF
  step the sim on in real time, so the nominal 1.5 + 10 s ran past `ALERT.lostSight` (12 s; `sinceSeen` starts at 99,
  so a guard who never sees again times out 12 s after the alert) and the pair, out of sight in their cover, dropped to
  searching (the pre-existing combat timeout, not the gate). In sim time the window ends under 12 s, so a drop there
  is something other than the timeout. The final assert prints each guard's level, time in it and time unseen. No game
  change. Undo: drop the `manual` line.
- **A52** (S13) A stage rise gives its gear to every living guard of the loaded section (Sector Ops loads one section)
  on top of what he wears, so a guard whose own helmet was shot off gets a new one when stage 3 arrives. Undo: in
  `EnemyManager.giveStageGear` skip the helmet for a guard who lost one (a flag set in `Enemy.knockHelmetOff`).
- **A53** (S13) The sweep switches on when the team's leader (the first member up: the shield guard while he stands)
  has searched `ALERT.searchTime`; members still searching follow him at once, a member in combat fights. The point
  list is built at each switch from the last known position then (a sighting, the search, then a fresh order).
  Undo: build once per team (`SweepTeam.begin` only when `switches === 0`).
- **A54** (S13) Every pass starts at the team's own start point (`sweepStart`: team 0 at the point nearest the last
  known position), so teams of different stages stay apart pass after pass. Undo: `this.start = 0` when `passes`
  goes up in `SweepTeam.next`.
- **A55** (S13) Followers stack on the leader's approach line (from the point back to him), rank x `SWEEP.gap`, jog
  (0.6 x run speed) when more than 4.1 m off their place, and look the way he looks once there; the leader skips a
  point his path cannot reach. A `SectorDef.sweep` list is used as given (only ordered, not thinned). Undo: `SWEEP.gap`;
  pass `SWEEP.thin` for the override in `SweepTeam.begin`.
- **A56** (S13) Sweep source: Sector Ops reads the section's guard list (route points, and the spawn point of each
  guard with no route; dogs left out); other live maps read the guards placed in the alarm's section at the alarm
  (dead ones included, dogs and team members left out). A woken team member takes his place back, counts as having
  fought (never calms) and gets the stage gear. Undo: drop `e.aware.fought = true` in `EnemyManager.revive`.
- **A70** (S14) An alert call (`missing` for a miss, `shots`) carries its own incident id (-2, -3, ...), apart from the
  board's: the S2 pair lead's own `missing` report (board id) stays an ack and never makes anyone cautious, so taking
  the caller during his call leaves the section calm even when another guard leads the search. When the caller also
  leads, he holds two calls (both cut with him). Undo: start the alert call on the board's incident and drop the log
  check in `radioDeliver` (the queue then merges the two calls' receivers under whichever completed first).
- **A71** (S14) One `missing` call per radio check (several members missed in one check: one call, at the first one's
  spot); the S10 pair miss calls too, also when the partner's guard is gone (the spot is his last route point). Each
  missed member still counts in `missedChecks`. Undo: call per member in `radioCheckNow`.
- **A72** (S14) "One call per shots incident" is the open call: loud shots heard while the shots call is going out join
  it (the spot moves to the newest); once it is through or cut, the next loud shot heard is a new call, whose delivery
  refreshes the caution. No refresh without a call. The caller is the nearest calm hearer (tier 1 or 2) whom this shot
  does not send to combat; not a dog or melee guard, not passive, held or blinded, not on the search after a fight.
  Undo: `SHOTS.sectionCall = false`.
- **A73** (S14) The shots pair: the delivered call reports a board `shots` incident at the newest shot's spot with the
  caller as a perceiver (`IncidentBoard.wantPair`): the lead walks over as an investigator (`sendTo`), the cover holds
  `pairBack` short as the missing pair's cover; the cover is another perceiver, else a calm guard within `callR`, else
  any free guard. Merged into a shots incident already assigned, its one investigator gets the cover. Undo:
  `SHOTS.pair = false` (one goes, as before).
- **A74** (S14) The section alert is the S4 caution 1 (cooldown sight, `PACE.cautious`, waits x `CAUTION.waitMul`, the
  torch rule of a searching guard while calm); the caller is cautious too. A guard who goes down loses his timed alert
  (woken: the S4 knockout caution). Undo: none needed (the caution model is S4's).
- **A75** (S14) Section counters (`EnemyManager.sectionCounts`): `bodiesFound` (a guard found the body), `missedChecks`
  (each member a check missed, each pair partner who never came, counted at the miss), `shotsCalls` (only calls that got
  through), `radioAlarms` (a `command` call that raised the alarm); reset by `EnemyManager.clear` (section load via
  `despawnAll`, restart via `resetMemory`). The older run tallies (`bodiesFound`, `radioMisses`, `pairMisses`) are
  unchanged. Undo: not needed (read-only).
- **A76** (S14) Barks: the radio check's "missed" line names the unit ("Unit three, report... Unit three? Nothing.";
  slot + 1, else key + 1) and is urgent now (it follows his own "Radio check." at once; the cooldown dropped it before);
  `shots` ("Shots fired! Calling it in.") at the call's start; radio lines `shotsReport` / `missingReport` when the call
  gets through. Undo: drop `'missed'` from `URGENT`, call `bark('missed')` without the unit.
- **A77** (S14) The co-op quiet shot (A46) uses `min(weapon def noise, 0.6)`: the host does not know a client's
  suppressor mods, and a quiet shot is never louder than the suppressed cap. Undo: `SHOT_NOISE * 0.5` in
  `CoopHost.remoteNoise`.
- **A60** (S15) The breaker walk is calm: the guard keeps his level (unaware or cooldown; suspicious only if a glimpse
  comes on the way, and the walk goes on once nothing is in sight); investigating or worse drops it. A fault is said
  aloud ("Breaker's gone again.", a new `breaker` bark, not a radio line) and starts no radio call; the other witnesses
  ack (look 3 s, up to 2 "Copy."). Undo: `this.ctx.radioCall?.(this, incident, 'light')` in `Enemy.resetBreaker`.
- **A61** (S15) The `BREAKER.repeatT` clock runs from the last cut a guard noticed (a witness at the time or a late
  find), on the board clock; a cut nobody saw opens nothing and starts no clock. Each press that leaves a circuit off
  is a new cut (`cutSeq`); the same cut noticed again (seen at the time by guards who could not go, found late by
  another) stays what it was first taken for, a fault or tampering, and does not restart the clock. Undo: record every
  press in `EnemyManager.lightsOut` before the `n === 0` return in `circuitOut`; drop the `faultCut` test there to count
  every notice as a new cut.
- **A62** (S15) Late discovery looks with the focused cone only (no peripheral field: a fixture already dark is not a
  bright change) within `LATE.range`, one line-of-sight ray, and only calm free guards (unaware or cooldown, no task;
  not passive, held, melee, a dog, a high-security post or an alarm runner). A shot lamp found late sends him alone (the
  one witness). The scan runs every 0.1 s over a round-robin share of the guards (~3 Hz each, `LATE_SCAN`). Undo:
  `LATE.enabled = false`, or the peripheral field back in `EnemyManager.lateStep`.
- **A63** (S15) Only a cut at a switch is a breaker fault: a circuit dark while its switches stay on (an isolator that
  leaves the switches alone) keeps the S2 light incident, and the walk ends as soon as a lamp of the circuit is lit
  again at its base (`BreakerHost.isOff`). A course mains gate's circuit (`MapLayout.course`: cutting it opens the gate)
  is never a fault: `BreakerHost.isOff` and `reset` refuse it (`StealthSystems.mainsGroups`), so no guard turns it back
  on and shuts the gate on the players (the S2 light incident at the switch, as before). marlow-final's timed isolator
  is not on this branch: it gets the breaker walk if it sets its switches off (`StealthSystems.syncGroup(group, false)`)
  when it cuts and back on when it relights, and passes its group to `lightsOut` so each cut counts as a new one (A61).
  Undo: drop the `isOff` test in `EnemyManager.lightsOut`; empty `mainsGroups` to let guards reset mains circuits.
- **A64** (S15) The walk ends at the walkable cell nearest the switch (`nearestWalkable`, 4 cells); he works it within
  0.7 m and gives up after 30 s without getting there (`BREAKER_WALK` in `ai/breaker.ts`); his pace is `PACE.patrol`
  (`PACE.cautious` while cautious). Undo: change `BREAKER_WALK`.
- **A65** (S15 laptop fix) The breaker walker is the witness nearest the switch by path: no officer, cautious, role or
  zone weight (a chore, not a check), so a map's lure guard by the panel / switch bank walks (`IncidentBoard.best`,
  `incidents.ts:561`). Undo: drop the `K_BREAKER` branch there.
- **A90** (S9) Protocol 32 (free on every origin branch: master 31, marlow-final 33, section-rating 34, sector-redesign
  art kit 35). Barks go as indices (`BARK_EVENTS`, append only; line `BarkVoice.lastLine`; unit), the client rebuilds
  the text (`barkLine`); lines not in the table (a talking pair's, the security desk's camera line) go as text
  (`BARK_TEXT` / `BARK_CAM`, 120 chars). A80-A89 are left for S16. Undo: drop the text kinds (pairs and desk lines
  host-only again).
- **A91** (S9) Caution low ready on both screens: cautious and calm, `GUARD_AIM.caution` 0.4 (was the calm 0.2: the
  host's own pose changes too, so the two match; research/ct-behaviour.md "weapon at low ready"). The client's wire
  level 1 (suspicious or investigating) poses as investigating 0.7 (the host's suspicious is 0.4). Undo:
  `GUARD_AIM.caution` 0.2.
- **A92** (S9) The client's dropped helmet flies along our own round when it hit him within 1 s, else backwards from
  his facing (the host's round direction is not on the wire); a helmet bit clearing while he jumped more than
  `PG_JUMP` 1.5 m in one frame is a re-place (restart, new slot) and drops nothing. A re-place in place (under 1.5 m)
  would drop a stray helmet on the client. Undo: carry the direction in a `helmet` event.
- **A93** (S9) The client predicts a deflect from the gear bits (instant marker and ping through `playerWeapons`, as the
  host's own); the host's `hitConfirm` `deflect` shows only when not predicted (`DeflectLedger`, 1 s window). The host
  confirms only deflects on guards (hits are predicted, kills come as `kill`). Undo: show every confirm.
- **A94** (S9) The puppet predicts the enforcer's front shield block (0 dealt) with the host's `shieldBlocks`, so a
  client round on the shield no longer predicts damage. Undo: drop the line in `EnemyPuppet.applyDamage`.
- **A95** (S9) The gear parts and the shield are one builder for both sides (`ai/gearParts.ts`, moved out of `Enemy`
  without a change in look); gear parts build on the puppet the first time its bits ask, then toggle. Undo: n/a.
- **A96** (S9, merge of master 4.75.0) Protocol 37, not 32: master 4.75.0 is at 35 (sector-redesign E9-crate) and the
  orchestrator's registry has 33 marlow-final, 34 hang-down, 35 sector-redesign, 36 pose-parity (#223, unreleased);
  37 is the next free number. The wire content is S9's unchanged (A90) next to master's `crate` item / event (every
  message is keyed JSON: no field order to agree on). Undo: if pose-parity lands first or drops its number, renumber
  `PROTOCOL_VERSION` in `src/net/protocol.ts` and every `toBe(37)` / `v: 36` / `v: 37` in tests (net, jammer,
  jammerFixes, moveState, rejoin, sectorLampSync, sectorStep3, crateWire, coopGuardAi) and `docs/systems/coop.md`. **Superseded by A140**
  (train 28 merge): 38.

## Walk 4.72 fixes (PLAN "Walk 4.72 fixes" S17-S19; Michael's walk of 4.72, G1-G3)
Michael, verbatim: G1 "when guards alerted when i cross laser, they somehow know ive climbed elsewhere. theres no way
they could no that unless they saw me. change it so they come to look where the laser is and search the room."; G2
"guards investigating dead bodies give up too easily."; G3 "guards should rush to any triggered alarms or bodies
reported, they need a sense of urgency when it makes logical sense." A100-A119 are this batch's (`slices/WALK.md`).
- **A100** (S17) A broken laser is at its beam line's midpoint, at its floor (`beamSpot`): a beam sensor knows which
  beam broke, not where along it. Undo: in `CtDevices.touch` report the nearest point of the beam to the body at the
  break (`distToSegment`'s projection) instead.
- **A101** (S17) A camera at full awareness is a device alert too (G3 "any triggered alarms"): its spot is where the
  camera saw someone at that moment (a sighting, not his live position); calm guards go there as for a laser. No last
  known position is set from it. Undo: drop the `alertAt` call in `CtDevices.onCamera`.
- **A102** (S17) Reinforcements an alarm brings within `DEVICE.fresh` (90 s) of a device alert, with no last known
  position (nobody has seen anyone), are responders: aggressive as every reinforcement, they run their entry route in,
  then search the device's spot inside its room and never calm (as S6; a response team sweeps after it, S13). After a
  sighting they go to combat on the last known position as before. Undo: `DEVICE.enabled = false` (also drops A103), or
  return false from `EnemyManager.deviceFresh`.
- **A103** (S17) A device alert opens a `device` board incident: the 2 nearest calm free guards by path within 30 m
  (`DEVICE.want`, `callR`) go straight to the spot (no pause to look: the alarm went off), search round it inside the
  room it is in (no room: round the spot), `ALERT.searchTime` (a plain search's length), then back to their route on edge;
  nobody in range: it waits 20 s (`DEVICE.wait`), then lapses. One incident per device while open (a second trip
  merges). Undo: `DEVICE.want` / `callR` / `wait` (`src/ai/gear.ts`).
- **A104** (S17) Marlow Yard (Course mode) gets the same device incident as Sector Ops (both host `CtDevices`): a laser or
  camera there sends calm guards in range. Undo: drop `alertAt` from the `CtDevices` hooks in `courseMode.ts`.
- **A105** (S17) Left as is: an alerted guard with no last known position still goes for the player's feet in combat
  (`Enemy.decide`'s `known`). Only the device alarms led there without a sighting; a panel or command alarm follows a
  contact (a last known position). Undo: not needed; an open item if another path is found.
- **A106** (S18) A dead body's search (`SEARCH_BODY`, `BODY_SEARCH` in `ai/gear.ts`): `ALERT.searchTime` x 3 (180 s,
  M3's "a few minutes"), a ring from 1.5 m in 1.5 m steps out to 15 m (plain: 2 m, 2.5 m, 11 m), 2.5 s at each point
  (plain 3 s): at the search pace about twice the points and 4 m further out than a plain search; then the held caution
  as before (S4). Undo: `BODY_SEARCH = { timeMul: 1, r0: 2, step: 2.5, max: 11, look: 3 }`.
- **A107** (S18) Who searches the body way: the dead body's finder and the calm guard who hears his "Man down!" (S4),
  the guards a camera sends to a dead body (S7: the one who finds it, and the second, who now joins the search when the
  first has found it instead of standing down), and a kill seen by a calm guard (it goes through the same finding). A
  knockout keeps A4 (the waker and the woken guard search 60 s, the plain way); a kill seen with no body (a dog) stays
  plain. Undo: `searchAt` in place of `bodySearch` in `EnemyManager.bodyFound`; drop the S18 branch in
  `Enemy.stepCamBody`.
- **A108** (S18) A guard already searching (a call, a pair, another body) who finds a dead body starts the body's search
  over from zero round it (as `koSearch` does). Undo: drop the restart in `Enemy.bodySearch`.
- **A109** (S19) Urgent = a jog: run speed x `PACE.rush` 0.75 (the aggressive jog), about 2.4 m/s for a grunt against
  0.99 m/s on patrol, until he first reaches the spot (the investigated spot, or the first stop of his search); then
  his calm investigate / search pace. Undo: `URGENT.enabled = false` (`ai/gear.ts`) or `PACE.rush` (`ai/response.ts`).
- **A110** (S19) Who hurries (`urgentKind`): a tripped device's responders and its reinforcements (S17), guards a camera
  sends to a body (S7), the guard who hears the finder's "Man down!" (S4), a guard sent on a radio body report (A111),
  the missing pair (S2 / S5b / S10, lead and cover) and a shots investigator and its cover (S14). Calm: a noise, a lure,
  a light gone out, a breaker fault (the S15 walk is untouched). The panel alarm runner and combat reinforcements
  already ran; the knockout waker keeps `PACE.revive`. Undo: return false for a kind in `urgentKind`.
- **A111** (S19) G3 "rush to ... bodies reported": when a finder's dead-body radio call gets through, the board sends
  `URGENT.bodyHelpers` (1) calm free guard within `INCIDENT.callR` (25 m) by path to hurry over and search the body (the
  body way, S18) with the finder; no alarm (A2 kept). Sent at the call's completion; a body carried, hidden or gone by
  then sends nobody. Undo: `URGENT.bodyHelpers = 0`.
- **A112** (S19) The S14 missing call itself still moves nobody (the section turns cautious); the move it goes with is the
  board's missing pair, which now hurries. Undo: not needed.
- **A113** (S19) Tests that change by design: e2e-stealth-ai 'bodies' and 'witness' now expect the calm guard out of voice
  range to be searching (sent to help, `bodyHelps` 1) once the report gets through, not standing on edge; the unit
  fakes in `awarenessWiring` / `sectionAlert` gain `helpSearch`. Undo: with A111.
- **A114** (S20) G4 "guards seem to walk through eachother": the walker keeps the old soft push (3 x (1.1 - d) m/s inside
  1.05 m), adds a sidestep round a guard ahead on his line (within 2.2 m and 0.9 m of his line, x0.9 of his speed at
  contact; dead ahead each steps to his own left, so a head-on pair parts), and cuts every step at 0.65 m between centres
  from each solid guard on his storey (1.5 m): he slides round the circle; one already nearer may only move apart; a
  step that cannot be cut clear is not taken (`SEPARATION`, `ai/separation.ts`). Not solid: dead or knocked out, held in a
  takedown. A talking pair (S10) and a post (S5) keep their spots (their meet points / posts are further apart than
  0.65 m; a passer goes round them). Players keep the old soft push. Undo: `SEPARATION.min = 0` and `side = 0` (the old
  steering alone).
- **A115** (S20) G4 "... and sometimes doors": a guard's step into or across a shut door's leaf (its collider box grown by
  the nav agent radius 0.32 m) is refused (`DoorGate.blocking`, every step in `Enemy.tryMove`). A shut door that is not
  locked is opened as the guard push always did (`Doors.open(d, 'enemy')`: its sound and noise, the guard-opened close
  behind him, the co-op door sync), and he waits until its swing reaches `DOOR_GATE.pass` 0.5 (0.2 s of the 0.4 s
  push); the 1 m push (`Doors.pushOpen`) still runs first, so on a walk he rarely waits. Chosen over rerouting: the door
  API keeps the door state and sound right for both players with no protocol change. Undo: drop `doorStep` from the
  `EnemyManager` context.
- **A116** (S20) A locked door is never crossed: the guard stops at its leaf and waits there (it opens when the door
  unlocks). No nav closure per locked door: the e2e nav checks (`e2e-sectorops` 'nav (M8 routes, sealed sections)',
  `e2e-course` Fallow paths) expect the guards' grid to walk through locked section doors, and guards do not route
  across them; Sector Ops' keypad, bolt, lockdown and pair-gate doors already shut their doorways on the grid (routes go
  round). No map data lets guards through a locked door (none exists). A door locked while open (a course gate) stays
  open to them. Undo: drop `doorStep` (A115); a per-door closure (`NavGrid.addClosure`, shut while locked and closed) is
  the follow-up if guards are seen waiting at locked doors.
  (S28, 2026-10-24: that follow-up is built: `src/ai/lockedDoors.ts` shuts a locked, shut door's doorway on the guards'
  grid, so they route round it (Marlow A7 cage stall); the e2e nav reads unlock, query and relock. A116's "walks
  through locked doors" no longer holds.)
- **A117** (S20) Left as is: `Doors.pushOpen` ignores height (a guard under a door's floor within 1 m of its centre opens
  it) and still runs for a held guard; dogs use the same gate and spacing. Undo: not needed; open items.

- **A120** (S21) G5 Michael, verbatim: "they also dont always have to be low-ready, then can walk around holstered if they
  are in a calm area." Every guard stays armed (2026-10-23 ~01:25). A calm area for a guard (`calmArea`,
  `ai/carryState.ts`; `Enemy.carryCalm`): he is unaware (no suspicion, investigation, search, combat or its cooldown),
  not cautious (S4 held / S14 section alert timed caution), on no board task or camera body, no alarm raised in his
  section (`ctx.alarmRaised`, S6), not a high-security post (S5 `secure`), not a device responder (S17) or a response
  team member (S13 `crew`), and stealth rules are on (the parked modes keep low ready). Undo: `GUARD_CARRY.enabled = false`.
- **A121** (S21) Who holsters (`mayHolster`): every kind with a gun except the sniper (on his watch, laser and glint) and
  the enforcer (the shield in his other hand); melee kinds and the dog never. Undo: edit `GUARD_CARRY.never`.
- **A122** (S21) He holsters again only after `GUARD_CARRY.calmHold` 15 s calm without a break (no flicker after a glance
  or a cooldown); stirred mid-holster he draws straight back up from where the gun is. Undo: `calmHold`.
- **A123** (S21) Guard draw times: rifle 0.7 s, pistol 0.5 s (`GUARD_CARRY.draw`; the player's N3 draws are 1.1 / 0.75 s;
  CT guards shoulder fast); holster 1.0 / 0.9 s (the player's). A guard who spots the player has usually drawn by then
  (suspicion draws); one hit or sent to combat from calm waits the draw before his first shot (`Enemy.tryFire` gates on
  `carry.drawn`), on top of the old reaction / aim settle. Undo: shorter `draw` values, or drop the gate in `tryFire`.
- **A124** (S21) Where the gun rides: the player's carry slots and placement (`carrySlotOf` -> `WeaponModel.holster`):
  the rifle slung diagonally across the back (`backC`, as Wren's, not the vertical `backSocket` mount), the pistol on the
  right thigh (sets the rig's `thighGear`), a compact on the hip sling. The draw / holster runs the player's travel
  (`beginTravel` / `travel`, the trigger hand on the grip) and the swap clip (one slot). Undo: `carrySlotOf`.
- **A125** (S21) The rig: the shared `RigPose` gains an optional `ready` (the holstered carry with ready hands and the
  armed carriage; unset it keeps `carrier && !heldWeapon`, so the player and remotes are unchanged). Guards are not
  `carrier` (that also switches mocap and the keyed drawn set), so they set `ready` directly. The raise (`RigPose.aim`) is
  0 while holstered and the wanted aim through a draw (gating it to 0 until drawn popped the gun 15-34 cm at the
  hand-over). Undo: with A120.
- **A126** (S21) Co-op: host only. A client poses guards from the snapshot's alert level (0 calm .. 3 combat), which
  cannot tell caution, a raised alarm, a post or a response team apart from calm, so it cannot derive the holster; no
  protocol change in this slice: client puppets stay at low ready (open item, `slices/WALK.md` S21). Undo: not needed.
  **Resolved** (branch `feature/guard-ai-a126`, A136-A139): the host's carry phase rides `al` bits 7-8 and the client's
  `EnemyPuppet` poses holstered / drawing / low ready / raised / holstering through the host's rig path.
- **A127** (S20 check, `slices/WALK-CHECK.md`) Two guards face to face in a doorway or a corridor too narrow to step
  round each other (1.2 m and less) were held about 0.65 m apart forever by the S20 spacing. Held by it (pushed off, cut
  or refused) with somewhere to go, under a quarter of his pace, for `SEPARATION.stall` 1 s, a guard squeezes past for
  `SEPARATION.squeeze` 2 s: the soft push only (as before S20, no sidestep, no hard cut), so they brush past in a narrow
  gap and nobody waits forever; a man standing in his way is passed the same way. Undo: `SEPARATION.stall` very large.
- **A128** (S22) G6 Michael, verbatim: "if i turn it off while hes distracted, he should notice when he sees it and turn
  it back on also." He notices a console off only when he sees its screens (`CONSOLE_FAULT.screenY` 1.1 m over its floor):
  in his focused cone within `range` 12 m, or his peripheral field within `near` 4 m (Marlow's officer at his post has
  the console about 51 degrees off his facing, outside the 27.5 degree focused cone), with one clear ray or in the room
  he stands in; at the switch-off or later on the late-discovery clock (about 3 looks a second per guard). Never through
  walls, never by radio. Undo: the `CONSOLE_FAULT` numbers.
- **A129** (S22) Distracted means not free: on a board task (a noise, a light, a body), investigating, searching,
  suspicious or in combat, held, or running the alarm. Such a guard never
  notices; once he is unaware or cooling down and free again, the next time he looks at it he does. A high-security post
  (S5 `secure`, the board never sends one), a dog and a melee kind never notice. Undo: `EnemyManager.consoleFree`.
- **A130** (S22) Reuse, not a copy: a console is a pseudo circuit (`CONSOLE_GROUP` 50000 + its index) on the S15 breaker
  walk and the board's `breaker` / `light` incidents, so it keeps S15's numbers: one walker (nearest by path), patrol
  pace, `BREAKER.resetT` 2 s at the console, `BREAKER_WALK.giveUp` 30 s, `BREAKER.repeatT` 60 s. Undo: separate numbers
  in `CONSOLE_FAULT` read by `Enemy.breakerStep` for console groups.
- **A131** (S22) Tampering: a second switch-off noticed within 60 s of the last noticed one is the S2 light check at the
  console (1-2 go, the look, the 4-point ring, the radio report, line `consoleCheck`). Unlike a tampered breaker (left
  off after the check), once the check is over (its incident closed) the next guard who sees the console still off
  turns it back on: a console left off for good would make the second press free. Undo: in `ConsoleFaults.notice`, a
  tampered cut never becomes `V_FAULT`.
- **A132** (S22) A walk dropped on the way (he was drawn off again, gave up after 30 s, nobody was free): the console is
  noticed again by the next guard who sees it, after `CONSOLE_FAULT.retry` 3 s, as the same cut (the reset walk, never
  "a second cut"). S15's breaker reacts once per cut; the console keeps trying while it is off. Undo: `retry` Infinity.
- **A133** (S22, game side, applied after marlow-final merges: `slices/S22.md`) A guard's reset ends the console's
  loop as if it ran out: the flag clears, the cameras come back on both machines, the pickup gate closes and a timed
  console's re-arm (`rearm`, 20 s on Marlow's A4 console) starts. Undo: `CourseState.consoleBack` sets no re-arm.
- **A134** (S22, game side, same) The refusal "The guard is watching the monitors" holds only while the console's guard
  is watching it now (`EnemyManager.watchesConsole`: calm, free, the screens in view with a clear line), not while he is
  alive anywhere: G6's "turn it off while hes distracted" needs the console usable while he is drawn away. The refusal
  text may want "Take him out or draw him away first." (Marlow Build's call). Undo: keep `guard.alive`.
- **A135** (S22) Lines (original, G82): `console` ("Console's dropped out again. Getting it back up." / "Monitors are
  dark. Switching them back on.", not a radio line, as `breaker`) and `consoleCheck` (a radio line, as `lightOut`).
  Host only, no protocol change; when S9's wire list of bark events (`BARK_EVENTS`, append only) merges, `console` and
  `consoleCheck` go at its end. Undo: drop the two lines (the walk barks `breaker`, the check `lightOut`).

## A126: co-op guard carry (`feature/guard-ai-a126`, S9 + the walk batch; A128-A135 left for the walk's other slices)
- **A136** (A126) Wire: the host's S21 carry phase in `EnemyState.al` bits 7-8 (`AL_CARRY` 384, `AL_CARRY_SHIFT` 7):
  0 drawn, 1 holstered, 2 drawing, 3 holstering (`WIRE_CARRY_*`; `packAlert`'s 7th argument, `alertCarry`; the host
  maps `Enemy.carry.phase` with `wireCarry`, read only). `AL_MAX` 127 -> 511 (the parser clamp). Drawn is 0, so a kind
  that never holsters and every old `packAlert` caller pack what they did. `PROTOCOL_VERSION` stays 37 (38 since A140, 39 since A141): S9 (37) is not
  released or merged, and this rides the same train (assumed). Two 37 builds are NOT compatible with each other: an
  S9-only 37 client clamps a holstered guard's `al` (128+) to 127 (combat, seized, torch, caution, helmet, armour), so
  S9 must never ship without this. Undo: if S9 merges or releases alone first, bump to the next free number and every
  test asserting 37; or drop the carry argument in `coopHost.alertCode` (clients then see every guard drawn).
- **A137** (A126) The wire carries the carry phase, not "low ready / raised": low ready and raised are already on the
  wire (`st` aiming / cover, the level, `AL_CAUTION` -> `wireGuardAim`, A91), so two bits give the client the host's
  whole carry, including which clip runs. Undo: n/a.
- **A138** (A126) The client runs each clip on its own clock at the host's times (`net/puppetCarry.ts` `PuppetCarry`,
  driving a `GuardCarry` of its own that is never stepped by a brain): a draw / holster starts when the sampled
  snapshot (15 Hz, interpolated) shows it, a clip whose phase the snapshots skipped is played whole (never jumped to its
  end), a clip that ends before the host's waits at its end, a stir mid-holster draws back as the host does
  (`reverseMin`, the share done). So the client's carry runs about one snapshot plus the interpolation delay behind the
  host. Held in a takedown (ours or the partner's) the gun stays hidden and the carry is not applied, as on the host.
  Undo: drop the carry block in `EnemyPuppet.update` (puppets back at low ready).
- **A139** (A126 merge) S17's `tripped` bark (walk branch) was missing from S9's wire table: appended to `BARK_EVENTS`
  (append only; same protocol-37 train as A136), so the client shows "Sensor tripped. Moving to check." Undo: n/a.
- **A140** (S9 + A126, merge of train 28: master 4.76.0 + #207 + #230) Protocol 38, not 37: S9 and A126 take 38 because
  Player PR #231 holds 37 in the orchestrator's registry (train 28 itself is at 35). The wire content is unchanged
  (A90, A136, A139); only the number moves. Undo: if #231 drops 37 or lands after us with a later number, renumber
  `PROTOCOL_VERSION` in `src/net/protocol.ts` and every `toBe(38)` / `v: 37` / `v: 38` in tests (net, jammer,
  jammerFixes, moveState, rejoin, sectorLampSync, sectorStep3, crateWire, hangDownNet, coopGuardAi, coopGuardCarry,
  coopTorches' title), `scripts/e2e-coop.mjs`' comment, `docs/systems/coop.md` and the two changelog fragments. **Number superseded by A141** (train 29 merge): 39.
- **A141** (S9 + A126, merge of train 29: master 4.77.0 + #228 guard-ai S16 + Sector Ops #232) Protocol 39, not 38:
  Sector Ops #232 (lightrev LR13) takes 38 with its own wire change (`start.lf`, the host's lamp falloff), so S9 and
  A126 move to 39 on top of it; supersedes A140's number. The two wire changes do not overlap: #232 adds the `start`
  field `lf`; ours adds the `bark` event, `al` bits 16 / 32 / 64 and 7-8 (`AL_MAX` 511) and the `hitConfirm` kind
  `deflect`. Both are kept as they were (A90, A136, A139). Undo: if #232 drops 38 or lands after us, renumber
  `PROTOCOL_VERSION` and every `toBe(39)` / `v: 38` / `v: 39` in the A140 list of tests, `scripts/e2e-coop.mjs`'
  comment, `docs/systems/coop.md` and the two changelog fragments. **Number superseded by A142** (train 30 merge): 41.
- **A142** (S9 + A126, merge of train 30: master 4.78.0 + the Player stack pose-parity #223 + coop-walk-fixes #231 +
  #236 + feature/menu) Protocol 41, not 39: the Player stack takes 40 with its own wire change (`PF.aimLeft` 64, the
  MoveState `takedown` `sub` bit 1, `PlayerState.sc` rounds fired mod 256), so S9 and A126 move to 41 on top of it;
  supersedes A141's number. The two wire changes do not overlap: the stack adds a player flag, a player-state field
  and a MoveState sub bit; ours adds the `bark` event, enemy `al` bits 16 / 32 / 64 and 7-8 (`AL_MAX` 511) and the
  `hitConfirm` kind `deflect`. Both are kept as they were. Also merged: guard-ai-carry-fix (the GPU suite
  `scripts/e2e-guard-carry.mjs`). Undo: if the stack drops 40 or lands after us, renumber `PROTOCOL_VERSION` and every
  `toBe(41)` / `v: 40` / `v: 41` in the A140 list of tests plus coopWalkFixes and poseParity, `scripts/e2e-coop.mjs`'
  comment, `docs/systems/coop.md` and the two changelog fragments.
