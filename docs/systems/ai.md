# Stealth AI, enemy archetypes and modes
Purpose: perception, alert states, enemy behaviour, archetypes, difficulty, the navigation grid and the game-mode hooks.
Design authority: docs/DECISIONS.md (G40-G47, G49, G106, G335, G348, G350), then docs/design-bible.md (Section 5.7).

## Decided direction
- Decided, built (G41; ct-prototype A3, F1b door-4): guards close doors behind them on a calm patrol and notice any door
  open that should be shut. `game/stealthSystems.ts`: a door a guard opened is shut `DOOR_GUARD_CLOSE` 1.5 s after
  nobody stands within 2.2 m of it, while no guard is in combat (`guardOpened`, `fixedUpdate`); a calm guard within
  `DOOR_NOTICE_RANGE` 9 m, facing a door the player opened, with a clear line, hears it at the door (suspicion, he comes
  to look) and it joins the doors guards shut (`noticeOpenDoors`). The 15% threshold is `DOOR.driveShut` 0.15
  (`world/doors.ts`): a stick-driven door under it is still a crack, shut to the body, light and sight; the light
  field's own cut for a swinging leaf stays `DOOR_SHUT` 0.05 (`world/lightField.ts`, `docs/systems/lighting.md`).
- Decided, built (G44, g44-above): guards see poorly above them. `pitchFactor` (`PERCEPTION.up*` / `down*`) scales the
  sight term by the chest's elevation from the eye line: 1 up to +22 deg, smoothstep to 0.15 by +48 deg; below, 1 to -40
  deg, easing to 0.6 by -75 deg. `instantDetect` needs the body within +22 deg. Not applied in combat (`alerted`) or to
  dogs; the close-range felt term (1.8 m, moving) is unchanged. The light meter is untouched (a view limit, not light).
  Numbers are Night Shift's own: the CT research is silent on looking up.
- Decided, not built yet (G45): clear glass passes light and sight; frosted glass and blinds pass light only.
- Decided, not built yet (G40): the two slowest standing and the three slowest crouched speeds are silent (code:
  `NOISE_QUIET`, `docs/systems/movement.md`); level rules and sensor rules are re-checked with it.
- Decided, built (G46, G187, G254): guard counts are measured per mode. `MAX_ALIVE` 12 stays for the other modes;
  Sector Ops has its own cap, 32 alive (`SECTOR.maxAlive`), a ceiling, not a target. Michael wants "as many guards as
  realistically possible" (G289, G254), limited by the guard-cap perf floor and passable routes; room to manoeuvre
  beats count (G190). Per-space bands are info; the validator WARNs only below them (G289).
- Decided (G42, G155, G297, G307): every human guard can be palm-struck; dogs cannot. Per mode:
  - Campaign co-op missions: no heavy or dog archetypes; armour comes with the alarm stages (G155, "Adopt CT's way").
  - Sector Ops: guard dogs (G297); later sections add body armour (torso shots only stagger), riot shields only in
    alert response teams, and armour per alarm stage (G307).
  - Dogs (G348): no takedown, sleeping gas knocks one out, a dog can be distracted, killing one carries a penalty.
    What is built and what is not: `docs/systems/takedowns.md` (Decided direction).
  - Helmets: the rule is owned by bible 5.6 (G338, G341, G350): on Realistic and Perfectionist every guard wears one
    and on Perfectionist it cannot be shot off; on Rookie and Normal helmets come with the alarm stages; the same in
    the campaign and Sector Ops. Not built yet: helmets come from a slot tag, a section default or the alarm stage
    (`ai/gear.ts` `GEAR_BY_STAGE`), never from the difficulty.
  - Friendly fire: a host option, on by default (G141; coop.md).
- Decided (G106, built): CT's fixed difficulty levels; no sliders, no alarm-tolerance setting.
- Decided (G11, G180, G335): of the movement run's AI ideas (guards relight lamps, paired searches, eavesdropping and
  the rest) only those CT has survive, with one exception: Michael "Add both" (G335, 2026-10-25 ~09:45) - static
  lookouts on some high routes (pipes, catwalks, vents) and paired patrols that check on each other. G44 (poor sight
  above) stays the base rule; a lookout is the deliberate exception on its route. Guard AI plans it first; not built
  yet.
- Decided (2026-10-25 ~08:50, "Yes, shadow in view = seen"): a guard whose shadow falls in view animates at full rate
  (`animTierView.ts`; replaces G294's assumption). Not built yet: shadow passes do not count as seen.
- Decided, not built yet (G352): guard perception reads the players' real-time character shadows, as the picture
  shows them (light parity; `docs/systems/lighting.md`). Today guards read only the light field.
- Decided (G47): the light parity test, long lamps and motion lights are sorted out when built.

## Stealth AI (2.0 phase 3a)
- `ai/perception.ts` (pure, `PERCEPTION`): `sightRate` = rate x (1 - d / range)^1.5 x field (55 deg focus, 25 m;
  peripheral 100 deg, 12 m, x0.35) x `lightFactor` (`visibilityFromLight`^2) x stance x `motionFactor` x exposure
  (fraction of chest / head / hips in line of sight) x state sensitivity, plus a close-range term (2.2 m, moving), capped at
  `maxRate`; `instantDetect` (point blank, lit, in focus); `stepMeter` (rises by what exceeds `leak`, holds `hold`, drains
  `decay`); `noiseSuspicion(dist, radius)`; `losClear` (one `MASK.SIGHT` ray, clear when nothing is hit nearer than
  the point less the slack) casts through `Ballistics.hitDistance` when it has it, without allocating (guard-ai R1; the
  recon drone and the editor too), else through `ray` (test doubles, a slack of 0).
- `ai/alertState.ts` (pure): `AlertMachine` unaware -> suspicious -> investigating -> alert -> searching -> cooldown
  (`ALERT` times, `SENSITIVITY` per level). `Enemy.alerted` = level alert (combat).
- `Enemy`: perceives at ~4 Hz (rays to chest, head, hips; hips skipped in combat), integrates the meter per fixed step
  (`updateAwareness`), `calmDecide` drives patrol (`PatrolWalker`: `SquadSlot.route` / post with glances; per-point
  `waits`), looks at the stimulus, walks to it (`goTo`: straight or A*), search sweeps (`searchPoint`, `searchSlot`).
  Inputs: `hear(x, z, radius)`, `hearTurn`, `hearGunfire`, `radio(delay)`, `searchAt` (bodies), `alert()`; from the
  incident board (guard-ai S2): `sendTo`, `checkLight`, `pairSearch`, `ack`.
- Hearing (guard-ai S1, `ai/hearing.ts`, pure): a noise's reach becomes an effective reach per listener,
  `reach x 10^(-(walls x 6.9 + ambientDb) / 20)`: one wall (head-height ray, cast only where it could change the tier;
  low cover does not muffle) keeps 0.45 of it (the old `MUFFLE`), and a noisy thing near the guard (`NoisySource`,
  `EnemyManager.setNoisy`; no map sets any yet) masks it (6 dB halves, 12 dB quarters). Tiers (`HEARING`): inside the
  effective reach he turns to look (`Enemy.hearTurn`: stands facing it `hearLook`, meter floor `noiseSuspicion` capped
  at 0.45, no `heard`); inside half of it he may be sent; loud gunfire (`EnemyManager.noise`) is combat only inside a
  quarter of it. Coordinated managers (default): every hearer turns, the tier-2 hearers are reported to the incident
  board (below; `noise`, `shots`, or `distraction` for the noise maker and the sticky-cam ping), which sends one. A
  gunfire report with tier-2 hearers (or any tier-3 / already fighting hearer) sets the shared LKP; turning guards do
  not. Held guards (`Enemy.taken`: grabbed, hostage, interrogated) hear nothing. Melee kinds (dogs, runners) keep
  `Enemy.hear` anywhere in reach. Hunter and Mission (parked) set `coordinated = false`: everyone in reach hears and
  walks over (the exact old wall ray: beyond `MUFFLE` of the reach), gunfire sends everyone in reach to combat, the old
  lights-out rule and paces. `noiseSuspicion` rises with the square of closeness.
- Incident board (guard-ai S2, `ai/incidents.ts`, pure; `EnemyManager.board`, 5 Hz plus an immediate pass on each
  report): one incident per event (`INCIDENT`: pool 16; same kind within 6 m / 10 s of its last report merges; a light
  by its id or circuit; a plain noise under a light that just went out merges into it). Who goes: the guards who
  perceived it, else (noise kinds) a calm guard within 25 m; the 3 nearest by straight 3D distance get a path query
  (`PathLen`: straight when the nav line is clear, else A*), score = path x officer 1.6 x cooldown 0.8, ties to the lower
  index; never dogs / melee, held, busy (alarm run, passive), tasked, investigating, searching or alerted guards. One
  goes (`Enemy.sendTo`: bark `checking`, the `heard` path; a later noise never re-aims him); a light sends 2 when a
  second guard who saw it is within 15 m of it. The others who perceived it `ack` (look 3 s, keep their task; at most 2
  "Copy." lines). An investigator down (dead / KO) or held for 25 s turns it `missing`: the 2 nearest calm guards go as
  a pair (`pairSearch`: the lead to where he was last, bark `missing`; the cover searches 5 m short of it, G11).
  `Enemy.incident` holds the task; the board reads guards through `GuardView` (ids = `Enemy.num`) and writes `BoardOut`
  commands. `AlertInput.turning` (a sound he was not sent to) holds off the linger rule, so footsteps do not pull every
  turner over.
- Paces (A9, `PACE` in `enemy.ts`, x walkSpeed): patrol 1.1; coordinated investigate 0.85, search 0.75 (parked modes
  1.2 / 1.3); walking to wake a KO'd squadmate 1.3; cautious patrol 0.95 (guard-ai S4; not on a timed loop).
  Coordinated searching turns at the calm rate.
- Pace and patience: `PATROL.wait` 5.5 s, glances every 10 s, `searchLook` 3 s, `hearLook` 2.4 s; `ENEMY_CALM_MOTION` (60
  deg/s turns while not in combat; parked modes: not searching either). Combat: `ALERT.lostSight` 12 s (`lostSightClosing` 30 s while he moves up on the last known position, walk 4.82), `searchTime` 60 s; after combat a guard
  never returns to unaware (`AlertMachine.fought`).
- Alerts and the radio (guard-ai S3, design 5, M5; `ai/radioNet.ts` pure, `EnemyManager.radioNet`, coordinated modes):
  a guard who goes to combat on his own (a sighting, a hit, gunfire close by, the end of a flashbang, spawned alerted)
  first shouts: every calm guard who hears it at the investigate tier of a `RADIO.voice` 12 m reach (6 m in the open,
  ~2.7 m through one wall, less by a noisy machine; one wall ray only where it decides it; any section) joins
  `RADIO.voiceDelay` 0.3 s later. He then holds his radio for a `contact` call, `RADIO.callIn` 2.5 s x reaction (x the
  officer factor near an officer). When it completes (bark `callIn`, e.g. "Control, I have contact.") every other live
  guard of the SAME section is queued nearest first at `min(4.5, 0.6 + rank x 0.5 + d x 0.02)` s x his reaction
  (`staggerDelay`), joins on the next step (bark `joining`) and chases the shared LKP; no relay, no `Math.random`, other
  sections untouched. A call is a timer the caller must survive: `cut` from `Enemy.die` (kill, knockout), `beginTakedown`
  (grab, choke, hostage, interrogation), `blind` and `EnemyManager.despawn` (and a held caller at completion) loses it,
  so only the voice hearers know; a blinded or released guard still in combat calls again. Reports are calls of their
  kind: `checkLight` -> `light`, the pair lead -> `missing`, a board task ending calm -> `standDown`; their first receiver
  says "Copy." (bark only). `command` calls raise the alarm (S6, `RADIO_ALARM` true; see Alarms).
  One net: Sector Ops loads one section at a time, so the live section is the whole cast (cleared by `despawnAll` /
  `resetMemory` via `clear`); other maps are one section (A6). Ticked at 10 Hz from `update` with the board's
  `GuardView` and a reaction lane (no allocation). `EnemyManager.radioLeft(e)` reads a pending call (e2e).
  Parked modes (`coordinated = false`): the old window: a sighting shouted within `ALERT.shout` 8 m (0.3-0.6 s) and
  radioed after `ALERT.callIn` (`Enemy.radioT`, bark `callIn`) to everyone within `RADIO` 22 m (0.4 + 0.03 d + random
  0.3 s); gunfire / a hit / a flashbang (`loudAlert`) calls in at once. `PlayerRef.spotted`: set when a guard in combat
  sees that player, cleared when nobody is in combat.
- Awareness and caution (guard-ai S4, design 4, M1 / M3; `ai/awareness.ts` pure, `EnemyManager.awareness`, coordinated
  modes; A3, A4, A14-A16):
  - Guard keys: `Enemy.key` (0-31, u32 masks), the lowest free key at `spawn` (not held by a guard on the list or a
    knocked-out body), kept by a woken guard (`Body.guardKey` / `Body.guard`; `revive` builds the new `Enemy` and
    `inherit`s key, squad roster place, held room, passive, `info`, sniper post and the patrol walker, its clock moved on
    by the time down, back on the route at the nearest point; facing as he fell, no random yaw). A dead guard's key is
    reused with `resetKey`.
  - A body found dead (`bodyFound`): the finder barks `body`, searches the spot; the guards who hear his shout (the S3
    voice model) know too and the nearest calm one searches with him; all are held (`openHold('dead')`). He radios a
    `body` call (2.5 s x reaction, `deadReport` "Man down. Stay sharp." when it completes); each receiver of the section
    is added to the hold on delivery (staggered, one "Copy."). Cut him first (`radioCut`: down, grabbed, blinded) and
    only he and his voice hearers knew. A2: no alarm from it.
  - A kill seen (`witnessKill`, on `onKilled`): every calm guard (not in combat, held, passive, a dog or melee kind) who
    would notice the body there (`bodyNoticed`: field, the light on it, `BODY.range` 20 m) with one line-of-sight ray is
    a witness; the nearest finds the body at once (`bodyFound`, every witness held). A knockout seen: he goes to wake him
    (A14). A dead dog (no body): the witnesses are held, the nearest searches and radios it.
  - Held caution clears only when every aware guard is eliminated: dead, or knocked out and not woken (A3; woken, the
    holds he knew come back). Time never clears it. `despawn` counts as dead; `clear` (Sector unload / restart) drops
    every hold and caution.
  - A knockout found: the finder (`koFound` "Hey. Hey! Wake up.") wakes him after `BODY.reviveTime`; `woke`:
    `startKo` (both search `CAUTION.koSearch` 60 s round the spot, then cautious `koCautious` 180 s, then normal),
    the waker's search restarts (`Enemy.koSearch`) and he radios a `ko` call (`koReport`, one "Copy."; nobody else
    turns cautious).
  - Caution per guard (`Enemy.caution`, synced at 5 Hz with the board and after each change; `EnemyManager.cautionOf`):
    `AlertInput.cautious` keeps a calm guard in `cooldown` (sight x1.3, the board picks him first) and never unaware
    while it lasts; patrol `PACE.cautious` 0.95; route pauses and post glances x `CAUTION.waitMul` 0.6
    (`PatrolWalker.waitMul`; timed loops keep their schedule); the torch rule of a searching guard. Music does not
    follow it (A8). Contact and missing holds are not wired (`fought` stays each guard's combat caution; A16).
- Noise investigations (guard-ai S3, S2 check polish 2): a guard the board sent to a plain noise or a lure who finds
  nothing goes back to unaware (`AlertInput.calmEnd`); gunfire keeps the 45 s cooldown, and so does a guard who has
  fought.
- Posts and high security (guard-ai S5, design 6, goal 7, M1, A10, A12, A17-A19; `ai/posts.ts` and `ai/guardAiData.ts`
  pure): `SquadSlot.post?: PostDef` (`leash` m round the guard's spawn point, `highSecurity?`, `guards?` text) and
  `profile?`; map modes call `EnemyManager.placeSlot(e, slot, section?)` after `spawn` / `setPatrol` (Sector Ops passes
  the `SectorDef` index; Course and Infiltration let it pick the `MapLayout.guardAi` zone, else 0) -> `Enemy.setPost`,
  `Enemy.section`, `Enemy.profile`. A normal post is sent like any guard. A high-security post (`Enemy.secure`,
  `mayLeave` false): the board never sends him (`GV_POSTED` in the view: no investigation, light check, missing pair);
  a noise or gunfire at his investigate tier, or a light he sees go out, lures him instead (`Enemy.lureTo` ->
  `PostLure`): he walks to the point of his leash nearest it (investigate pace), looks toward it `POST.lureLook` 5 s
  sweeping +-`POST.lureSweep` 0.6 rad, walks back and faces his post yaw (`returnFace` 0.8 s, then the walker); a second
  lure at the same leash point does not restart him; the lure counts as `turning` (the linger rule never walks him off)
  and gives only a turn's meter floor. A search (a body, a radio check, after combat) and his investigate spot are
  clamped into the leash; he wakes no knocked-out guard outside it; in combat `chasePoint` / strafe points are clamped,
  cover outside the leash is skipped, and a target outside it (+1.5 m) is held from the post (the `hold` rule); he
  never runs to an alarm panel outside it. A revived guard keeps his post (`Enemy.inherit`). The sector tags: next
  entry (S5b). Map data: `MapLayout.guardAi` (zones, `noisy`, entries, squads) and `SectorDef.noisy` /
  `entries`; `EnemyManager.mapNoisy` loads the map's noisy things as the masking, Sector Ops swaps in the live
  section's (`setNoisy` on load). Checks: `validateGuardAi` / `validatePosts` run on load in dev (console warnings via
  `reportGuardAi`, never a throw) and in `tests/postsWiring.test.ts` over every live map's sectors.
- Sector tags (guard-ai S5b, ENGINE.md section 7 on sector-redesign, A26-A28; `ai/sectorTags.ts` pure, the type
  `GuardSlotTags` in `ai/guardAiData.ts`): `SectorGuard`'s `squad` / `handler` / `zone` / `role` / `reason` / `pair` are
  read by `EnemyManager.placeSlot(e, slot, section, slots?, index?)` (`sectorMode.fill` passes the section's `guards` and
  the slot's index; a reinforcement -1). `squad`: `joinSquad(squadId(section, squad))`, none = the default cluster of
  posts within 12 m (`slotSquads` / `defaultSquads`), a dog its handler's; so squad radio checks (`radioCheckNow`,
  `ARCHETYPE.radio` ~40 s) run in Sector Ops. The check's caller: a desk role (`ROLE_DESK`: desk / cctv / operator;
  calm, the lowest key) for every squad of his section, else the squad's own (supervisor > officer > first; a squad of
  one has none). A member down and not found is missed once (`silent`): coordinated, a `missing` incident at where he
  went down with his squad's calm members as perceivers, so the board sends two of them (lead + cover; the K_MISSING
  assign takes perceivers first); parked modes, the caller searches (old rule). `handler`: the dog is bound
  (`Enemy.handler`, set when both are placed, either order) and heels on him only (`findLeader`); he goes down: the dog
  searches round him, barks (`TAGS.dogBark` 14 m noise via `hear`, the dog skipped) and keeps its heel spot by him; a
  woken handler takes it back (`swapSlot`), a despawned one frees it. `zone`: a secure zone (`isSecureZone`: 'secure'
  or a word 'sec') gives the guard a circle (`zoneRadius`: post leash, else 8 m / route reach + 2) in the board's view
  (`GuardView.setTags`): inside it he counts as a perceiver and ranks first (x `TAGS.secureFirst` 0.25); after a search
  every guard walks back to his own post / route (the walker; no new code). `role` (on the guard `Enemy.job`, the word, and `roleFlags`, `ROLE_CLASS`; `Enemy.role` is S8's numeric combat role): the
  alarm runner (`alarmRunMul`: supervisor 0.1, officer 0.25), the board's score (`roleSendMul`: supervisor sends
  someone x1.6; a light: rover x0.8, fixed post x1.5). `reason` stored (`Enemy.reason`); `pair` stored
  (`Enemy.pairSlot`, `EnemyManager.guardAtSlot(index)`; read by S10, next entry). All kept over a revive
  (`Enemy.inherit`). Tests: `tests/sectorGuardTags.test.ts`; e2e: e2e-sectorops part 1 "sector tags (guard-ai S5b)".
- Talking pairs (guard-ai S10, GA2, the `pair` tag, A32-A34; `ai/pairs.ts` pure: `PairMeet`, `pairWindow`, `pickMeet`,
  `PAIRS`, `PAIR_LINES`). `placeSlot` builds one `PairMeet` when the second of two guards that name each other (one tag
  is enough) is placed (`EnemyManager.buildPair`; `pairs`, id section x 100 + the lower slot): the meet stops are the
  nearest stops within `PAIRS.meetMax` 6 m whose timed-loop stays overlap (`pickMeet`, the slower `walkSpeed`; the
  walkers' loop times line the clocks up); none (no timed loop, periods differ, no overlap, a dog): `pairSkips` + a
  console warning. `pairStep` runs at the board rate (`PAIRS.tick` 0.2 s) after the guards move: each side filled from
  `guardAtSlot` (`present` = alive, not held, in his slot; `calm` = `Enemy.pairCalm`: unaware, caution 0, no incident),
  `interrupt()` when either is `Enemy.disturbed` (a `hearTurn` look, a lure, sight evidence above `PERCEPTION.leak`),
  `step`, then: meeting -> `Enemy.pairFace` / `pairPt` (the calm patrol walks him onto his meet point and stands him
  facing his partner; the walker still steps, so the schedule runs on and the next timed stop absorbs the delay, A33);
  `sayLine` -> `Enemy.sayLine` (the bark path, spoken, no voice table: `onBark(e, line, false)`); `requested` ->
  `pairMissing`: a `missing` incident at the partner's last route point with the one left as perceiver (lead + the
  nearest free cover; the missing guard joins `silent`, so a radio check does not miss him again); parked modes: he
  searches. A missing pair whose guards are both up again (a woken partner takes his slot) starts over. Host only, no
  wire change. Tests: `tests/pairs.test.ts`, `tests/pairsWiring.test.ts`; e2e: e2e-sectorops part 1 "talking pairs".
- Tactics: from sight into cover first (85%; the profile's `coverFirst` by `profileOf(tacticsProfile)`, S6, a seeded roll, S8), attack -> cover after 2.5-4.5 s, peek cycles (4.2 s, up to 5); out of sight
  an `advancing` bound to cover closer to the believed position (`pickAdvance`), a 2.5 s hold (`ADVANCE_HOLD`; a point or an aggressive guard: `profileOf(tacticsProfile).advanceHold`, 0.8 s aggressive), then the next; the last
  stretch is walked (`ADVANCE_PACE`; aggressive: a jog); cover is picked against `knownPt` (never the real position out of sight). One bullet
  to the head kills any guard but a heavy (`Enemy.applyDamage`), unless he wears a helmet (below). The close-range
  sense from behind ignores a sneak / crouched approach.
- Head hit volumes come from the sim, never the drawn pose: a guard's from `guardHead` (`src/ai/guardHead.ts`, fitted to
  the rig), the dog's from `dogHead` (`src/ai/dogHead.ts`, rig-pose-fix S6: the dog model's own transform chain on the
  sim gait clock `Enemy.dogPhase` and bite `Enemy.dogBite`, stepped in `syncHitboxes`; `DogModel` draws from it). Tests: `tests/guardHeadParity.test.ts`, `tests/dogHead.test.ts`.
- Gear (guard-ai S12, stealth over shooting items 2 and 13, A35 / A36; numbers `GEAR` in `ai/gear.ts`): `Enemy.helmet`
  / `armour`, set by `EnemyManager.placeSlot` from the slot's `gear` tag merged with the section default
  (`SectorDef.gear`, passed by `sectorMode.fill`; none = no gear) plus the alarm stage's gear (S13, below), kept by a woken
  guard (`inherit`). `applyDamage` runs player and guard bullets through `gearHit` (not the heavy, not melee,
  takedowns, explosions or sleep bolts): head + helmet = 0 dealt, the helmet off (`helmetPart` hidden, a dropped
  helmet from `EnemyManager.helmetDrops`, `ai/helmetDrops.ts`: a pool of 8, a 0.4 s tumble to the floor, it stays),
  the strike stagger 0.9 s; body + armour = 0 dealt, stagger 0.5 s at most every 1.5 s (`sinceStagger`); then the
  normal hit reaction (combat on the shot's origin, contact call) and a `deflect` bark. Both return
  `DamageResult.deflect`. Placeholder parts (A45): the rig's combat-helmet part on the head node, the armour plates on
  the torso and shoulders, built on first use and toggled. Host-only (S9 carries the gear bits and the confirm).
  Decided 2026-10-25, not built yet: helmets by difficulty (harder levels always helmeted; on the hardest the helmet
  cannot be shot off), see "Decided direction".
- Section alert (guard-ai S14, stealth over shooting items 6 and 7, A40 / A41, A70-A76; `ai/sectionAlert.ts` pure:
  `AlertCallLog`, `SectionCounters`, `unitOf`; numbers `MISSING` / `SHOTS` in `ai/gear.ts`). A missed check-in (a
  radio check's miss, one call per check; a talking pair's partner who never came) -> the caller's `missing` call
  (`EnemyManager.missingCall`, `RADIO.callIn` x reaction, cuttable) under its own incident id (`alertInc`: -2, -3, ...;
  the S2 pair lead's own `missing` report stays an ack). A loud shot (`noise`): the nearest calm hearer at tier 1-2 not
  sent to combat by it (`mayCallShots`) starts a `shots` call (`CallKind` appended, code 7; `shotsHeard`: one per
  shots incident, later shots join the open call). Delivered (`radioDeliver` -> `alertHold`), each receiver is cautious
  on a timed hold (`Awareness.timedHold(k, s, kind)`, `alertT` / `alertKind`, `ALERT_MISSING` 180 s / `ALERT_SHOTS`
  120 s; caution 1; the longer time wins, so a later call refreshes it; it ends on its own; going down drops it; a held
  caution beats it, so a missing guard then found dead is the S4 held caution). When the call completes
  (`alertThrough`) the caller says `missingReport` / `shotsReport`, turns cautious too, and a shots call reports a board
  `shots` incident at the newest shot with him as perceiver plus `IncidentBoard.wantPair`: a lead (`sendTo`) and a cover
  `pairBack` short (`pairSearch`, cover), or a cover for the one already sent (`needCover` -> `addCover`). No alarm from
  either (M4). Suppressed shots stay ordinary noises (`hear`). Read-only tallies `EnemyManager.sectionCounts`
  (`bodiesFound`, `missedChecks`, `shotsCalls` through, `radioAlarms`), reset by `clear` (section load, restart).
  Barks: `missed` names the unit (`BARKS_UNIT`, `BarkVoice.sayUnit`, `Enemy.bark(ev, unit)`), `shots`, `shotsReport`,
  `missingReport`. Host-only, no wire change (S9's caution bit shows it on the client). Tests:
  `tests/sectionAlert.test.ts`, `tests/radioNet.test.ts`; e2e: e2e-stealth-ai 'missed check', 'loud shot'.
- Squad roles (guard-ai S8, coordinated modes; `squadRoles.ts`, `coverGrid.ts`): `EnemyManager.rolesStep` at 2 Hz
  (`TACTICS.tick`) fills one reused `RoleInput` from the engaged group (alerted, free, cover-using guards; >= 2,
  `TACTICS.minGroup`), runs `assignRoles` against the level cover as typed arrays (`coverSet`, mirrored from
  `reserveCover`; `coverGrid` 4 m buckets) and calls `Enemy.setRole(role, cover, moving, run, mateMoving, onRadio)`.
  (S24: one group per intruder, the guards with `hunt` = that slot, scored against his last known position; cover
  reservations shared, so two groups never take one cover.) Reporter = the first contact caller of that fight
  (`contactCaller`, per slot), held crouched and silent while his call is open;
  point bounds cover to cover (`profile.advanceHold` between bounds, out of sight), walks the last stretch (`closing`)
  when no cover is left; overwatch's low cover needs one view ray to the LKP (`TACTICS.viewChecks` 4, a blind one
  blocked `TACTICS.blockS` 5 s), suppresses the LKP while a mate moves; flank (groups of 3+) bounds to cover >= 60 deg
  off the point's bearing; the rest search (today's). One of point / flank moves at a time (standard; polish B2: the
  one on his way is the one on a role bound, `Enemy.roleBound`). Out of sight in
  the open a role guard waits for the group, crouched (guard-ai S27, A161: `Enemy.roleStep`'s open wait, at most
  `SQUAD.openWait` 3 s, or the second think with no role cover at all: the first only crouches), then takes today's
  cover pick (`pickCover`, reserved
  through `reserveCover`); no cover anywhere: crouched where he is until `ALERT.lostSight`; the wait restarts when he
  sees his target, is in or on his way to cover, or his role changes (`Infinity`: the S8 wait). The overwatch's
  suppress (S27, A162: `suppressLkp`) aims at its own spot (`suppressAim`, the hunt's spot + 1.1 m; his `lastKnown` is
  left alone) and, with `SQUAD.suppressView`, fires only along a clear static line from the muzzle (one `G.STATIC` ray
  per 0.25 s, cached; counters `suppressRounds` / `suppressHeld`, the latter in held steps, not thinks). The reporter
  (S27, A163) throws and flanks nothing while his call is open (`inCover` runs the radio hold before `tactics`; in
  `attack` he fights with his rifle only).
  A path failure blocks the cover. While a group has roles the single
  `flanker` is cleared; otherwise `assignFlanker` as before. Barks `moving` / `covering` / `flanking`.
- Report, then engage (guard-ai walk 4.82 item 2, Michael: "He should report then attack you instead of hiding";
  coordinated modes, stealth): the caller is the group's reporter only while his call is open (`radioNet.pendingFor`:
  the contact, then a command call); once it is through he takes a fighting role. A guard with no holding role (lone,
  `R_NONE`, or a group's `R_SEARCH`) in cover with his call through (`AiContext.radioOpen`), unseen for one whole peek
  (`ENGAGE.peekWait` 4.2 s, `closeFromCover` in `squadRoles.ts`, pure) leaves it and moves up on his intruder's last
  known position (the chase branch's cover-to-cover advance; not a high-security post, not outside a hold). While he
  closes on it (`Enemy.closingIn`, also a point's bound) the alert machine's lost-sight cap is `ALERT.lostSightClosing`
  30 s (`AlertInput.closing`), so arriving there with nothing to see starts the search, not the 12 s timer in cover;
  the position is kept while he fights and searches (`huntingOf`). Parked modes unchanged. Tests:
  `tests/loneGuardEngage.test.ts`, `squadWiring.test.ts`, `twoIntruders.test.ts`; e2e: e2e-stealth-ai 'report then engage'.
- Combat dice (S8, A24): `Enemy.rng` (mulberry32) reseeded `combatSeed(matchSeed, engagement, num)` on going to
  combat; `tacticsProfile` (`placeSlot`: `P_POST` with a post, `P_AGGRESSIVE` for an aggressive slot, else `P_STANDARD`;
  kept by `Enemy.inherit`) weights cover-first (standard 0.85) and the roles (`P_POST` never point or flank). A
  high-security post never takes a role cover outside his leash (`Enemy.setRole` drops it; A18, A25).
- `EnemyManager.stealth` (on in Hunter, Mission and Infiltration; off in Free Roam): one last known position per
  intruder (guard-ai S24, below; `lkp` / `lkpValid` / `sightT` mirror the freshest one: solo reads them as before),
  sightings by alerted enemies and located gunfire, a flow field per intruder (never the real position), arriving with
  nothing there starts the search; `callAlert` radios within `RADIO` 22 m in the parked modes (a radioed alert does
  not relay; the live modes use the radio net above); `sightT`, `hunting`, `huntingOf(slot)`.
- HUD: `ui/hud/awareness.ts` arcs round the crosshair (only for enemies `inSight` or within `ARC_NEAR` 2.5 m),
  `Hud.setLight` meter; `vfx/lkpGhost.ts` (thin-instanced silhouette) shown at the LKP while hunted unseen
  (`GameState.updateStealthHud`).
- Light: perception reads `World.lightField` (`docs/systems/lighting.md`); zones from `LevelBuilder.ambientZone`. Light
  fixtures: `LightDef.fixture` (box size + offset) is the shot target (`rayBox`), drawn by the light rig as a box that
  goes dark with the light.
- Bodies: `Enemy.die` / `knockOut` hand the rig to `EnemyManager.addBody` -> `ai/body.ts` `Body` (a settled `Ragdoll`, or
  laid flat when out of budget; `BODY.max` kept). (rig-pose-fix S5) `Body.pos` and `Body.lie` (pelvis, chest point, head yaw)
  are sim: `ai/bodyLie.ts` `deathLie` from his feet and yaw at death, the fall along the impulse settling the pelvis
  `LIE.settle` x hip height (held back by a static wall: `body.ts` `deathLieOn`), `dropLie` at the drop point; never read
  from the rig. The ragdoll is visual and eases onto the lie when it settles (`Ragdoll.snapTo`, `SNAP_EASE` 0.3 s); out
  of budget the rig is laid straight on it (`carryPose.layAt`). Enemies not in combat look for bodies each think (`bodyNoticed`: field x
  `lightFactor(body.light)` x distance; one ray) -> `bodyFound`: the finder searches; a non-lethal body is revived
  (`BODY.reviveTime`; the woken guard is the same guard: `Enemy.inherit`); coordinated modes: awareness and caution
  below; parked modes: the squad within `RADIO` searches. Cameras see bodies (guard-ai S7, design 9, M6; host only, coordinated
  modes): `SecuritySystem`'s body pass (2 Hz per online camera, IR: no light term, G240; looped / off / jammed /
  destroyed cameras see nothing) reads `EnemyManager.bodies` (`setBodySource`, wired in `GameState` beside the
  security system) and its `onBody` (separate from `onEvent`, which `CtDevices` owns) calls
  `EnemyManager.cameraReport(ev, "Camera N")`: a body already found, carried, hidden or gone is ignored; else one
  `camBody` incident per body (`IncidentBoard.reportBody`; a second camera's report merges while it is open) sends the
  nearest 1 (KO) or 2 (dead) calm guards within `INCIDENT.callR` 25 m by path (never dogs / melee); nobody in range:
  the report waits `camWait` 30 s for one, then lapses (section caution is S4's). A new incident gets the desk's radio
  line (`camBodyLine`, e.g. "Camera 2 has a man down, Delivery Yard. Nearest unit, check on him."; `onCameraLine` ->
  the HUD bark over that camera, `cam:<id>`). The sent guard (`Enemy.checkBody`, `MODE_BODY`) goes straight to
  investigating at the investigate pace (no 2.4 s look first), held by the task (`AlertInput.hold`, `bodyWalk` 45 s);
  within `BODY.close` with a clear line the body-found path takes over (`bodyFound`: a KO'd guard is woken, the area
  searched). The body gone or found first, or the walk timing out: the usual investigation end; a glimpse drops it.
  `SectorMode.unloadSection` calls `clearBodyReports` (section load / restart). Carry (`game/stealthSystems.ts`): an unarmed rig over the shoulder, the
  player's `reachL/R` hold its knees, weapon stowed, `speedCap` `BODY.carrySpeed`, no sprint / cover / traversal; drop = a
  short `Ragdoll`; hide spots (`MapLayout.hideSpots`) remove it.
- Lights: `PlayerWeapons.onRay` -> `StealthSystems.shotRay` -> `lightOnRay` + `LightRegistry.destroy`; `MapLayout.switches`
  toggle a `group`; both call `EnemyManager.lightsOut(x, z, y, lightId, group)` (every lights-out path goes through it;
  the EMP passes its point). Coordinated (guard-ai S2, M1 goal 4): a `light` incident whose perceivers are the calm
  guards who SAW it go (the fixture in the focused cone to 25 m or the peripheral field to 12 m with one line-of-sight
  ray, or a fixture of the circuit in the room they stand in: `roomAt`); one goes, two when a second witness is within
  15 m. The bulb's pop and the round's impact merge into it (`shotRay` reports the light first). `Enemy.checkLight`: bark
  `lightOut`, walk at the investigate pace (a pair's second stops 2.2 m short), look at the fixture 2 s, a 4-point ring
  2-6 m round it (1.5 s at each; unreachable points skipped), bark `standDown`, back to the route unaware (no
  cooldown; cooldown only if he has fought); a glimpse (meter >= `investigate`) drops the check. (guard-ai S15, stealth
  over shooting item 8, A42 / A43; `ai/breaker.ts`, `BREAKER` / `LATE` in `ai/gear.ts`) A switch off with a witness is a
  fault: a `breaker` incident (one per circuit while open), the witness nearest the switch by path (plain path length: no officer, cautious, role or zone weight; `MODE_BREAKER`, never a pair;
  the others ack) runs `Enemy.resetBreaker`: bark `breaker`, walk at his patrol pace to the walkable cell by the switch (its own height: the switch column is often the wall)
  without leaving his calm level (suspicious and back keeps it; investigating or worse drops it), work it
  `BREAKER.resetT` 2 s, `AiContext.breakerReset` -> `EnemyManager.breakers` (`BreakerHost`, set by `StealthSystems`) ->
  `StealthSystems.resetCircuit` = the player's own `toggle`; no ring, no radio, back on his route. The circuit lit again by
  other means (`BreakerHost.isOff` false: the player, an isolator) ends the walk; so does `BREAKER_WALK.giveUp` 30 s.
  A second noticed cut of the circuit within `BREAKER.repeatT` 60 s (board clock, `lastFault`) is tampering: the S2
  `light` incident at the switch; the same cut noticed again while its incident is open merges into it; noticed again
  once its tamper check is over with nobody on it, it is a fault, the reset walk (polish B1, A168). A cut nobody saw
  opens nothing. (polish B1, A168) A noticed cut still off, with its incident gone (check over, walker knocked out,
  given up or drawn away) and nobody walking to its switch, is forgotten by late discovery after `BREAKER_WALK.retry`
  20 s (`EnemyManager.relightStep`, `DarkList.unmarkGroup`): the next calm guard who sees it dark relights it. A course mains gate's circuit is never a fault (`StealthSystems.mainsGroups`,
  A63): the S2 incident, nobody relights it. Shot lamps keep the S2 check and stay dark (`setGroup`
  skips destroyed lamps). (guard-ai LR16-4, relight) The Sector Ops boards ride the same walk: a breaker board (no
  `window`) cut calls `lightsOut` on its first circuit with a live lamp (`IsolatorBoards.liveGroup`) at the board, and
  the `BreakerHost` (`StealthSystems.breakerHost`) answers for boards too: `switchOf` the nearest cut board holding the
  circuit (`cutBoard`; else the nearest wall switch), `isOff` true while it is cut and dark, `reset` the board's
  `switchBack` (every circuit of it, its wall switches follow) before a wall switch's toggle. A timed isolator's running
  window is the player's (`holding`): `isOff` / `reset` are false for its circuits, even through a wall switch, and
  `switchBack` refuses, so its cut stays the S2 look at the board and the timer relights it; a walk already going on
  that circuit ends (S15's isolator rule). So a timed cut sends 1-2 guards on the S2 check with its 4-point ring, not
  S15's calm one-guard walk: deliberate, it is the lure (LR16-4). Late discovery (`EnemyManager.lateStep`, every 0.1 s
  over a round-robin share of the guards, ~3 Hz each): `DarkList` holds the dark fixtures (shot, or cut at a switch
  that is off) no guard has reacted to (rebuilt only on a registry `version` change or a mark); a calm free guard with
  one in his focused cone within
  `LATE.range` 12 m and a clear ray reports it as its witness (shot: the S2 light check, one; cut: the breaker walk at
  the circuit's switch, or tampering). Once per fixture / circuit state change (`DarkList.known`, cleared when lit, on
  `clear` and `resetMemory`), or, for a cut nobody fixed, again after `BREAKER_WALK.retry`. Parked modes: the old rule (nearest calm enemy within 25 m investigates, others within 14 m
  `notice`). Flashlights:
  `World` adds `FLASHLIGHTS` (4) on dark maps; human guards (`carriesTorch`: not dogs) get them while investigating / searching / hunting unseen where the
  static light is < `TORCH_DARK` 0.35 (kept to `TORCH_KEEP` 0.45; pure `torchRule` in `archetypes.ts`); `EnemyManager.beamReach` (centre + four edge rays, 15 Hz
  per torch) stops the beam at geometry.
- Alarms: `ai/alarm.ts` (pure) panels from `MapLayout.alarms`; `assignAlarm` (2 Hz) sends the nearest alerted enemy to work
  it `ALARM.holdTime` -> `onAlarm` -> reinforcements (`reinforce`, at the `MapLayout.reinforce` point furthest from the
  player). The player disables a panel with a hold.
- Alarm by radio (guard-ai S6, design 7, M4; `CommandCall` in `ai/alarm.ts` pure, `EnemyManager.command`; stealth rules
  and coordinated modes only, as panels). A `contact` call that gets through (`sink.completed`) owes the alarm
  (`contactThrough`): the officer in the caller's voice range (alive, free), else the caller, else the next guard in the
  fight holds a `command` call (`RADIO.report` 4 s x reaction, bark `command` "Command, contact. Send backup." at its
  start); its completion raises the alarm with no panel (`raiseAlarm(e, null)`, `alarmBy` 'radio'). One at a time (the
  net refuses a second `command`). Cut (down, grabbed, blinded, despawned): after `ALARM_CALL.retry` 3 s the next guard
  in the fight (in combat, or the search after it; not blind, held, passive, melee or a dog) takes it: out of the
  target's sight first (`Enemy.targetInView`), then an officer, then the lower key; nobody: the debt lapses (A29). The
  contact call cut first: nothing is owed (only the voice hearers know, and they do not call). A panel alarm settles it;
  `resetAlarm` (Sector load / restart) and `clear` drop it. Sector Ops sets the net's section to the live `SectorDef`
  index (`setSection`). `onAlarm(e, p)` takes `p` null for a radio alarm.
- Reinforcements (guard-ai S6, M1 "any reinforcements must be aggressive"): `EnemyManager.spawnReinforcement` /
  `joinReinforcement` -> `Enemy.joinAsReinforcement(route)`: `profile` 'aggressive' (the S5 string; `Enemy.behaviour` =
  `BEHAVIOUR[profile]` in `squadRoles.ts`), told by command (`radio(0)`: in combat on the shared LKP the next step, bark
  `joining`, no contact call of his own), runs the entry route first at run speed (dropped on sight or after 30 s), and
  never calms (`AlertInput.hunting`: an aggressive guard who has fought keeps searching). Profile reads in the combat
  branch: cover first on contact `behaviour.coverFirst` (standard 0.85 as before, aggressive 0.3), the hold between
  bounds `advanceHold` (2.5 / 0.8 s), the last stretch out of sight at 0.75 x run speed for `runToContact` (else walk x
  1.15). Where: Sector Ops `SectorDef.entries` in turn (route, yaw, y), else `reinforce`; other live maps
  `MapLayout.guardAi.entries` of the alarm's section (`entriesFor`), the one furthest from the player, else the furthest
  `MapLayout.reinforce` point (since S13 a response team, below). Parked modes (Hunter, Mission): their own
  reinforcements (grunt, grunt, heavy), unchanged.
- Response teams (guard-ai S13, stealth over shooting items 3, 4, 11, A37-A39; `ai/sweepTeam.ts` pure, numbers
  `RESPONSE` / `SWEEP` / `GEAR_BY_STAGE` in `ai/gear.ts`). Stage gear: `EnemyManager.setAlarmStage(stage, now)` keeps
  the stage's gear (`alarmGear`; stage 2 armour, stage 3 armour + helmet) and with `now` gives it to every living
  guard on top of his own; `placeSlot` and `revive` add it to every later guard. Sector Ops calls it on each rise
  (`sectorMode.raised`, camera alarms too) and at each section load with the run's stage (`loadSection`; a restart
  goes back to the section's start stage, so the dropped stage's gear goes with it). Other live maps: the one alarm is
  stage 1 (no gear). No camera is touched. Teams: each stage's `perStage` reinforcements are `responseTeam` kinds
  (an `enforcer` first, helmeted by `joinTeam`, the rest grunts); `StealthSystems.onAlarm` on live maps sends shield +
  2 (`RESPONSE.liveTeam`) with the section's guard routes and posts as the sweep source (`sweepSource`). A team is an
  `EnemyManager.teams` entry (`newTeam`, index = its order in the section = its start offset); `Enemy.crew` /
  `teamRank`. Sweep: `SweepTeam.tick` (each step, before the guards think) ranks the members (the first one up leads)
  and switches the sweep on when the leader has searched `ALERT.searchTime` (`begin`: the points once per switch from
  `SectorDef.sweep`, else `sweepPoints(routes, posts, lkp, SWEEP.thin)`, start `sweepStart`) and off when he is not
  searching (a sighting); `Enemy.sweepStep` (from `calmDecide`'s searching case): the leader walks to the point and
  looks round it `SWEEP.dwell` s (unreachable: skipped), the others hold `rank x SWEEP.gap` m behind him, then the same
  order again. They stay hunting (S6), so never calm; `clear` (unload / restart) ends the teams; a woken member takes
  his place back (`swap`).
- Co-op (guard-ai S9, protocol 37 (32 before the 4.75.0 merge), A90-A96): the brain stays host-only; the client sees what the host shows. Barks:
  `Enemy.bark` hands `onBark` the event, `BarkVoice.lastLine` and the unit; the host sends a `bark` event (index into
  `BARK_EVENTS`, append only) and the client rebuilds the text with `barkLine` (pair talk and the desk's camera line go
  as text). Caution and gear ride the snapshot `al` (`AL_CAUTION` 16, `AL_HELMET` 32, `AL_ARMOUR` 64). The weapon
  carry is `ai/guardStance.ts` on both sides (`guardAim` host, `wireGuardAim` client): cautious and calm = low ready
  (`GUARD_AIM.caution` 0.4). The gear parts and the enforcer shield are `ai/gearParts.ts`, built by `Enemy` and by the
  client's `EnemyPuppet` alike.
- Device alerts (guard-ai S17, walk 4.72 G1, A100-A105; numbers `DEVICE` in `ai/gear.ts`): a broken laser
  (`CtDevices.touch`, its beam's midpoint `beamSpot`) or a camera at full awareness (where it saw someone) calls
  `CtHooks.alertAt` -> `EnemyManager.deviceAlert` before the alarm stage rises: a `device` board incident sends the 2
  nearest calm guards within 30 m to the spot (`Enemy.respondDevice`: search round it inside its room, `searchRoom`),
  and the alarm's reinforcements within `DEVICE.fresh` s with no last known position search there too
  (`joinAsResponder`, never calm) instead of combat. Nothing reads the player's position; no last known position is set.
  (S24, A148: a guard in combat with no position for his intruder no longer walks to the player's feet either.)
  Training cameras (guard-ai walk 4.82 item 6, Michael: "the guard should be non hostile and not respond to you being
  detected on the camera"): `CameraDevice.guardResponse: false` (`security/data.ts`, read by `cameraAlertsGuards`)
  makes no `alertAt` call (`CtDevices.onCamera`: no device incident, nobody sent, no radio, no investigation) and no
  body report (`SecuritySystem.bodyPass`); its meter, cue, the course's own rules (a hallway send-back) and the alarm
  stage run as before. Off by default (absent = true). Test: `tests/trainingCamera.test.ts`.
- Search kinds (guard-ai S18, walk 4.72 G2, A106-A108; `ai/response.ts` pure, numbers `BODY_SEARCH` in `ai/gear.ts`):
  a calm search has a kind (`Enemy.searchKind`: plain, body, device) whose `SearchSpec` sets its length
  (`AlertInput.searchFor`), its ring (`ringPoint`: first radius, step, cap) and the look per point. A dead body found
  (`EnemyManager.bodyFound`: the finder and his voice partner; the camera-sent guards) is searched `Enemy.bodySearch`:
  3 x `ALERT.searchTime`, out to 15 m; combat's search and every other search stay plain (`PATROL`'s ring, 60 s).
- Urgency (guard-ai S19, walk 4.72 G3, A109-A113; `ai/response.ts` `PACE` (moved from `enemy.ts`, re-exported there),
  `urgentKind`, `paceSpeed`; `URGENT` in `ai/gear.ts`): a guard sent to a device, a body (camera, radio, a shout), a
  missing man or shots sets `Enemy.rush`: his investigate / search walk is run x `PACE.rush` until he first reaches the
  spot; a noise, lure, light or breaker keeps the calm pace. A dead body's radio call that gets through
  (`EnemyManager.bodyHelp`) opens a `bodyDead` board incident: `URGENT.bodyHelpers` calm guards in `callR` hurry over and
  search it with the finder (`Enemy.helpSearch`, `MODE_HELP`).
- Spacing and doors (guard-ai S20, walk 4.72 G4, A114-A118; `ai/separation.ts`, `ai/doorGate.ts`, both pure):
  `Enemy.move` steers off near guards (the old soft push plus a sidestep round a guard ahead, `steerFrom`) and cuts its
  step at `SEPARATION.min` 0.65 m from every solid guard on his storey (`stepApart`; `tryMove` refuses the slides too);
  held (`taken`) and downed guards are not solid. Held by the spacing with somewhere to go (pushed off, cut or refused,
  under a quarter of his pace) for `SEPARATION.stall` 1 s, a guard squeezes past for `SEPARATION.squeeze` 2 s (the
  soft push only), so two guards face to face in a doorway or a narrow corridor never wait forever (S20 check, A127).
  `tryMove` asks `AiContext.doorStep` (`EnemyManager`: `DoorGate.blocking`):
  a step into or across a shut leaf is refused; a door not locked is opened `Doors.open(d, 'enemy')` and he waits for
  `DOOR_GATE.pass`; a locked door stops him at the leaf (he waits; since S28 only a stale route or a straight walk
  meets one). Sector Ops' keypad, bolt, lockdown and pair-gate closures are unchanged.
- Locked doors on the grid (guard-ai S28, Marlow A7 `A7-cage-w`; `ai/lockedDoors.ts`, pure, `tests/lockedDoorPath.test.ts`):
  S20's grid walked every doorway (A116), so A* routed through a locked door and the guard stood at its leaf (~15 s).
  Now each door has a nav closure (the Sector Ops door size, `STAGE_NAV_ACROSS` / `STAGE_NAV_ALONG`), built with the
  gate on the manager's first update, held shut while the door is locked and shut (`lockedShut`: `anchor.locked`,
  `target` 0; a locked door standing open stays walkable). `LockedDoorNav.sync` runs each manager update and at once
  from `Doors.onLocked` (any `setLocked`: course gates, Sector Ops stage / team / keypad locks; and a `setOpen` of a
  locked door, shut or, since polish C2, forced open, so its doorway follows with no update between), so the
  `NavGrid.version` bump replans the flow field and every held route once. No guard has a key (the sector `keyholder`
  is a fixed-post role): every guard treats a locked shut door as a wall. An unreachable goal (only a locked door
  between) falls back as before (patrol: straight at the point, stopped by the gate; search: the point skipped), and
  `Enemy.goTo` retries its A* once a `routeT` (1 s), a new goal or a grid change, not every frame (`routeMiss`).
- Weapon carry (guard-ai S21, walk 4.72 G5, A120-A126; `ai/carryState.ts` pure: `calmArea`, `mayHolster`, `carrySlotOf`,
  `GuardCarry`, numbers `GUARD_CARRY`; render side `GuardGunCarry` in `ai/enemyRig.ts`): every guard stays armed. A calm
  guard in a calm area (unaware, no caution, no board task, no alarm raised and (guard-ai S27, A164) no alarm stage
  (`AiContext.alarmStage`, Sector Ops' panel, camera or laser stage; it carries over sections, A37), not a
  high-security post, not a responder or response team member; stealth rules) carries his gun holstered: the rifle slung across the back (`backC`), the pistol on
  the right thigh. Anything above calm draws it (rifle 0.7 s, pistol 0.5 s; `Enemy.tryFire` waits for `carry.drawn`); he
  holsters again after `calmHold` 15 s calm. `Enemy.update` steps it after the awareness; `Enemy.frame` drives `RigPose`
  `ready` (holstered), `swap` / `swapFrom` / `swapTo` (the draw / holster clip, one slot) and `aim` (none while holstered);
  `armed`, `thighGear` and `weaponTravel` follow the `WeaponModel` (`holster` / `beginTravel` / `travel` / `hold`). Sniper,
  enforcer, melee kinds and dogs never holster. Co-op (A126, A136-A138): the phase rides `al` bits 7-8; the client's
  `EnemyPuppet` follows it with `net/puppetCarry.ts` `PuppetCarry` and poses through the same `GuardGunCarry` / `RigPose`.
- Security consoles (guard-ai S22, walk 4.72 G6, A128-A135; `ai/consoleFault.ts` pure: `ConsoleFaults`, `consoleInView`,
  numbers `CONSOLE_FAULT`): a console switched off is a breaker-style fault. The game reports every toggle
  (`EnemyManager.consoleState(id, x, floorY, z, on)`) and turns one back on through `EnemyManager.consoleHost`
  (`ConsoleHost.reset(id)`, its own toggle path). A calm, free guard (unaware or cooldown, no board task, not held, not
  a dog, melee kind or high-security post) notices it only when he sees its screens (1.1 m up: the focused cone to 12 m,
  the peripheral field to 4 m, a clear ray or the same room): at the switch-off, or later on a round-robin scan on the
  late-discovery clock, so a guard drawn off by a distraction notices once he is back and looks at it. The console rides
  the S15 machinery as a pseudo circuit (`CONSOLE_GROUP` 50000 + index): a `breaker` incident, one walker, `resetBreaker`
  (bark `console`, patrol pace, 2 s at the console, `breakerReset` -> `consoleHost`), calm after. A second cut noticed
  within `BREAKER.repeatT` 60 s is the S2 `light` check at the console (bark `consoleCheck`); once that check is over the
  next guard who sees it still off turns it back on, and a dropped walk is noticed again (`CONSOLE_FAULT.retry` 3 s).
  `watchesConsole(e, x, floorY, z)` tells the game whether a guard is watching it now (the refusal). Game-side wiring
  (CourseMode, after marlow-final): `docs/guard-ai/slices/S22.md`. Host only, no protocol change.
- Every player is seen (guard-ai S23, A143-A145; `ai/targetPick.ts` pure: `mayBeSeen`, `pickTarget`, `TARGETS`,
  `MAX_INTRUDERS` 4): each think a guard perceives every live player (`Enemy.perceive`, per-player module scratch, no
  allocation): chest / head / hips rays, light and `sightRate` per player, a dog's smell per player; a player a calm
  guard cannot see at all (outside his field and not felt close by, `mayBeSeen`, the two terms of `sightRate`) costs no
  ray. The target is the best seen when calm (the highest rate, else the nearest; polish C1, A169: he keeps the one he
  perceives until another's rate beats his by `CALM_KEEP` 1.25, undo 1); in combat the one he fights while he
  sees him, else the nearest he sees, else his last (S24 passes the hunted player). One meter per guard, filled at the
  target's rate (two in view do not add up). `seesIndex(i)` (player `i` of `players()` in sight, any body sample) drives
  the host's awareness arcs (`seesIndex(0)`: the host's own player); `targetDist` drives the flanker pick. Undo:
  `TARGETS.all` false (the nearest only), `TARGETS.sticky` false (best seen each think in combat). Solo: the same
  target, rate and meter. Host only, no protocol change. Brief: `docs/guard-ai/slices/S23.md`. Tests:
  `targetPick.test.ts`, `coopPerception.test.ts`, e2e-coop "every player seen (guard-ai S23)".
- Two intruders (guard-ai S24, G139, A146-A150; `ai/intruders.ts` pure: `IntruderBoard`, `INTRUDERS`): one last known
  position per player (up to `MAX_INTRUDERS`, slot by player id, stable over a rejoin): `x/y/z`, `valid`, `seenT`,
  `freshest`. Each guard hunts one (`Enemy.hunt`): his own sighting wins (`reportSighting` returns the slot; reported
  on going to combat so his contact call carries it); else the call or shout that told him (a contact call's incident
  is its slot, A149; `radio(delay, hunt)`, taken on going to combat); a located shot (`noise(pos, reach, by)`: the
  shooter's id, null = the freshest); the alarm caller's for reinforcements (`alarmHunt`); a guard spawned alerted (`spawn(.., true)`: the parked modes'
  reinforcements, `EnemyManager.sendIn`) the one command knows of (`commandHunt`: the alarm's while valid, else the
  freshest; none known: none). His hunt ends when he calms
  (cooldown / unaware), wakes (`inherit`) or is despawned. He goes to `lkpOf(hunt)`, searches round it, suppresses it,
  faces it and follows `flowOf(hunt)`; `pickTarget` gets his intruder's player. With no position for his intruder
  (A148, `INTRUDERS.noFeet`): his own last sighting, else his stimulus, never the player's real feet (A105 closed, solo
  too). A slot is forgotten `INTRUDERS.forget` 2 s after its last sighting once nobody hunts it (`huntingOf`). Flow
  fields: one per slot, made the first time it is valid, rebuilt on a move of a nav cell (at most every 0.5 s) or a nav
  change, one rebuild per update (round robin). Response teams, the reinforcement facing and the device-fresh test
  follow the freshest (A150); the host's LKP ghost shows only the host's own slot. Undo: `INTRUDERS.split` false (one
  shared position, one group). Host only, no protocol or save change. Brief: `docs/guard-ai/slices/S24.md`. Tests:
  `intruders.test.ts`, `twoIntruders.test.ts`, `coopPerception.test.ts` (S24 block).
  Up to 4 intruders (coop4 AI1, A170 / A171, brief `docs/coop4/briefs/AI.md`): `IntruderBoard.find(id)` (a read, never
  assigns), `leave(id)` (slot marked `gone`, kept for his rejoin: the same id takes it back, LKP kept); a new id with no
  free slot takes a gone one (idle first, else unseen longest; `reused`), only from `COOP4.from` 3 live players (1-2:
  today, -1). Every report resolves its slot through `EnemyManager.slotForId`, which releases a reused slot
  (`releaseSlot`: plan, caller, chase field, heard throttle, `alarmHunt` / `contactHunt`, team hunts, its hunters'
  `hunt` and pending tells dropped (`Enemy.dropHunt`), its open and queued contact calls cancelled
  (`RadioNet.cancelInc`), then forgotten). Host hook `EnemyManager.intruderLeft(id: string): void` (the net layer's `removeRemote`); per-player ghost
  read `ghostOf(id, out: Vector3): number` (0 none / 1 known / 2 show). The player team-slot seam: `slotOf(ref, index)`
  in `intruders.ts` (`ref.slot` when N1 sets `TeamRef.slot`, else the index): `Enemy.seesIndex` bits are team slots.
  Undo: `INTRUDERS.reuse` false, `COOP4.from` Infinity. Tests: `intruders.test.ts`, `fourIntruders.test.ts`.
  (coop4 AI2, A181) At 3+ players `perceive` starts players in `perceiveOrder` (target, hunted intruder, the rest
  nearest first rotated per think) within `PERCEIVE.maxRays` 9 sight rays (3 calm, 2 alerted, 0 out of view); a player
  left out reads unseen that think. 1-2 players: index order, uncapped. Counters: `Enemy.raysThink`,
  `EnemyManager.raysThisStep`. Undo `PERCEIVE.maxRays` Infinity.
  (coop4 AI3, A172 / A173) Hearing locates each intruder by its own noise; the radio net's receiver queue holds 128
  entries per section (`RADIO.queue`, 4 contacts x 32 guards). A guest's hold noise names its holder (host line in
  `coopHost.onHoldPulse`, Sector Ops N1).
  (coop4 AI4, A174) From 3 players each reinforcement takes `nextAlarmHunt()`: round robin over `alarmHunts` (the
  alarm's intruder first, then the freshest sightings, leavers skipped); a team shares one (AI5). Refusals at the live
  cap keep the order. Undo `ALARM_HUNT.split = false`.
  (coop4 AI5, A175-A179) From 3 players: a stage's response grows `RESPONSE_N.extraPerPlayer` (1) per player past 2,
  the extras within the live cap's room, two teams from `splitAt` (4) guards (`responseShape` in `gear.ts`; Sector Ops:
  `EnemyManager.setResponseShape(over)` at section load, `shapeResponse(stage, perStage, out)` at the alarm, `newTeam(..,
  spread)`); a team shares one intruder (its first member's alarm draw, `SweepTeam.hunt`; later members `retell`, their
  draws given back) and sweeps round that intruder's last known position (unknown: the freshest); team starts spread
  over `spread` teams (`sweepStart`), a point another sweeping team holds within `SWEEP.thin` is passed over
  (`pointBusy`; all held: taken anyway; the #302 stall skip kept). Squad groups take cover in rotation (`rolesRR`); the
  flank trigger reads the slot's own player's cover time; `spotted` clears per player once nobody fights his slot.
  1-2 players: today. Undo `RESPONSE_N { extraPerPlayer: 0, splitAt: Infinity }`, `SWEEP4.own / dedupe`,
  `FIGHTS4.rotate / ownCover / spotted` false. Log `docs/coop4/briefs/AI5-BUILT.md`.
- Search after combat: the probable area (guard-ai S25, M1, CT rule 9, A151-A154; `ai/searchArea.ts` pure:
  `SEARCH_AREA`, `SearchPlan`, `areaRadius`, `pointScore`, `orderByScore`). One plan per intruder slot
  (`EnemyManager.plans`). `buildPlan(slot)`, called when one of his searchers asks: due when never built, older than
  `rebuild` 2 s or his last known position moved > 1 m, and only while his chase field is built round that position;
  round the same position only while no point is claimed (a moved centre rebuilds at once, S25b fix). A searcher gets
  plan points only from a plan round his intruder's current position, else the ring. Area: cells within R = clamp(6 m + 1.5 m/s x seconds since seen, 6, 20) path metres of the last
  known position (`flowOf(slot)` x `nav.cell`; a spot behind a wall is as far as the way round). Candidates: the level
  cover in range (`coverGrid.queryNearest`, up to 1024, the nearest kept past that so no side is dropped; S25b fix
  B1; at the cover's position) and a 2 m lattice over the square of half-side R whose
  baked light (`lightField.levelAt` 0.9 m over the floor; torches excluded, A153) is below `dark` (`LIGHT.shadow`);
  scored darker / cover / nearer by path (`pointScore`), offered best first, at most 12 kept 3 m apart. The plan remembers
  its searched points (`SearchPlan.sx` / `sz`, up to 48, forgotten on a moved centre); a rebuild never offers a
  candidate within `spacing` of one or of the last known position (polish B4, undo `PLAN_SKIP_SEARCHED` false). `Enemy.decide`'s search branch, for a combat search
  (`combatSearch`, not `searchOwn`, `hunt` >= 0, `SEARCH_AREA.enabled`): the first point is the last known position as
  before, then `AiContext.searchPoint` (`take`: best score minus distance from him, one guard per point); none left:
  today's ring (`ringPoint`, from its first point). The look ending or the point unreachable: `searchDone` (found by his
  claim, done either way). Claims are freed on death / knockout (`onKilled`), despawn, leaving the search or the plan
  (`planSweep` each update, also once his response team sweeps), a forgotten slot and `clear` / `resetMemory`. Calm searches (a body, a device, a call, a
  pair, a lure) keep their ring (A152). Undo: `SEARCH_AREA.enabled` false (today's points exactly). Host only, no
  protocol or save change. Brief: `docs/guard-ai/slices/S25.md`. Tests: `searchArea.test.ts`, `searchAreaWiring.test.ts`.
  (S26) R grows from `locT` (seconds since seen OR located), not `seenT`: a heard step narrows the search (A157).
- Hearing in a fight and a search (guard-ai S26, M1, CT rule 8, A155-A160; `ai/hearing.ts`: `COMBAT_HEAR`,
  `combatHearAct`). `EnemyManager.hear(pos, reach, kind, skip, by)`: `by` is the player whose own body or hands made
  the noise (footsteps, landing, roll, fence rattle, noisy holds, takedowns, suppressed shots: `GameState.localId` /
  the client's `r.ref.id`); glass, impacts, gadgets, doors, the dog's bark, lures and the download pass null. Coordinated
  stealth only (`COMBAT_HEAR.enabled`): searching and alerted guards (not the melee kinds) hear too (`hearFight`); calm
  guards keep the S1 tiers and the incident board word for word. Skipped first, no ray: in combat seeing his target, or
  a noise nobody made / a lure (A159); re-aimed under `gap` 1.5 s ago (`Enemy.heardAt`). Then S1's tier (walls only
  where they decide it, masking at him); any tier >= `tier` 1 counts (the whole effective reach, A156). Searching: he
  walks to it at his search pace (`Enemy.hearSearch`: the next spot is the noise, snapped to a walkable cell; not a plan
  point; his S25 claim released; "I heard something." at most every `bark` 6 s), looks there, then goes on with his
  plan / ring; a sweeping response team (S13) keeps its stack; a high-security post keeps his leash (the search clamp).
  A body noise locates its maker (`reportHeard`: `report(.., seen false)`: `locT` 0, `seenT` kept, the mirror as S24;
  one report per slot per `reportGap` 1 s unless it moved `reportMove` 1.5 m), and he hunts that slot when he has none,
  it is his, or his own was last seen / located `switchAfter` 8 s ago or more (G139, A158). In combat that is all: his
  `knownSpot`, chase field (`flowOf(hunt)`) and roles follow the new spot. A heard spot more than 1 m from the slot's S25
  plan centre resets the plan at once (claims dropped; the one exception to "never rebuild under a claim"): his
  searchers take their next point from the plan rebuilt round it (A160). Undo: `COMBAT_HEAR.enabled` false (today's
  deaf rule exactly). Host only, no protocol or save change. Brief: `docs/guard-ai/slices/S26.md`. Tests:
  `combatHearing.test.ts`, `intruders.test.ts` (`locT`), `searchAreaWiring.test.ts` (R from `locT`).
- Sound: `world/surfaces.ts` (pure) `surfaceAt` scales footstep noise (`SURFACE_NOISE`) and picks the footstep voice. Shots:
  `SHOT_NOISE` x weapon noise; at or below `SUPPRESSED_NOISE` it is `hear` (suspicion), else `noise` (combat); `onRay` hits
  are heard within `IMPACT_NOISE`.
- Doors: `world/doors.ts` `Doors` (from `Door` anchors): one thin-instanced leaf mesh, a static body only while closed,
  created by `arm()` after the nav grid is built (co-op clients `openAll()`); `open(d, quiet | bash | enemy)` drops the body
  and swings the leaf, `close` refuses an occupied doorway; `pushOpen` (enemies), the bash at a sprint and the interact
  (`door` kind) live in `StealthSystems`; `onSound` -> `door` event + noise (quiet 2 m, bash 10 m). The sprint bash goes
  with the sprint (G31); a bash becomes a door-menu choice that can knock out a guard behind the door (G97).
- Goggles: `game/vision.ts`, render only (`docs/systems/gadgets.md`). The LKP ghost uses `vfx/silhouettes.ts`.
- Interactables: kinds `switch`, `alarm`, `hide`, `body`, `door`, `medkitWall` with per-item `reach` and `onUse`;
  `nearest(feet, reach, only)`; `GameState.updateInteract` calls `onUse`.
- Armour (guard-ai S16, A80-A87): sight stays on `MASK.SIGHT` (clear armoured glass sees), but before the wind-up, a burst
  and every round `Enemy.tryFire` casts the fire line (muzzle -> aim point, `MASK.ENEMY_SHOT`) through `ai/armourFire.ts`
  `ArmourGate` (pure, cached 0.25 s per guard and cell pair); an armoured first hit holds fire. After 1 s held he
  repositions (a cover spot with a clear line, else round by the nav, 8 s) or, held to a room or post leash, holds and
  keeps tracking. Plain glass is unchanged (bullets pass). Host only, no wire change.
- Guard AI polish batch (2026-10-24, `docs/guard-ai/POLISH-PLAN.md`, A165-A169, A182; ids are the plan's). Each line
  changes the text above where they disagree. Host only, no protocol or save change.
  - A1: a device responder pulled into an investigation keeps his device spot and room (`joinAsResponder`); when the
    look ends (investigating -> cooldown / unaware) he goes back to searching the device room (`SEARCH_DEVICE`), not
    standing still.
  - A2 (A167): `pickCover` keeps its best 3 candidates and tries them in order: a cover a mate holds is skipped, a walk
    longer than `COVER_DETOUR` (1.5 x straight + 3 m) is rejected for the next. A role cover with such a detour is
    blocked and the roles re-pick next tick. The open wait's failed pick (`openNoCover`) retries once per
    `SQUAD.openWait`, and never lands on his own held role cover while his role is not moving.
  - A3 (A165): in stealth with no intruder (`hunt` -1) he A*s to his own `knownSpot` instead of the freshest
    intruder's chase field (`SLOTLESS_FIELD`).
  - A4 (A166): hunting one intruder and seeing another, he makes one contact call naming the new one, once per slot
    per fight (`calledMask`, `RECALL_SWITCH`); a slot he was told of (`tell`) counts as called, so its sighting
    makes no second call. `calledMask` clears at cooldown / unaware and on `forget`.
  - A5: in cover with his target out of sight (stealth), "cover still protects" and "too close" read his known point
    (`knownPt`), not the player's real feet, so he no longer pops up into an upright strafe and re-picks.
  - A6: the open-wait pick clears `advancing` too (no cover / chase churn; overwatch can suppress).
  - A7, A8: the suppress line check restarts with each episode (`suppressCheckT` 0 after a lapse or an aim moved more
    than 0.5 m) and casts `G.STATIC | G.PROP`, so no rounds go into a wall or a crate on an old or prop-blind verdict.
  - A9: a new target resets the aim settle (`losT` 0). A10: a dog in combat also picks a smelled player
    (`P_LOS | P_SMELL`), so the fight does not cool with the partner in smell range.
  - A11: search points and `hearSearch` snap to the right storey (the hunt's or the guard's own `y`), with the cell
    centre inlined (no array per point). A12: a heard spot's look does not use up a ring index or the LKP visit. A13:
    a high-security post never asks `searchPoint`, and a plan point moved by a clamp is finished as not reached.
  - A14: `pickCover` scores each candidate with module scratch (no object or array per candidate).
  - B1 (A168): a circuit cut twice inside `BREAKER.repeatT`: once its tamper check is over, the same cut noticed again
    is a fault (the reset walk), as consoles. A cut circuit with no incident, no walker and still off is unmarked in
    `DarkList` after `BREAKER_WALK.retry` 20 s, so late discovery finds it again (a walker knocked out, the alarm, the
    30 s give-up).
  - B2: the one-mover rule counts only a role bound (`seekCover` with `Enemy.roleBound`: set by `boundTo`, cleared by
    any other cover pick and any state change; a role switch mid-walk keeps it), so an open-wait pick no longer lifts the flank's hold, and a
    point whose role cover is re-picked for the last ~2 m of his bound (the advance rule) still holds it. Undo
    `POLISH_B.roleTrip` false: any `seekCover` counts.
  - B3: hearing in a fight restarts the 1.5 s throttle only for his hunt's noise or one whose slot he takes; a searcher
    switched by `tell` to another slot re-tells it (`retell`), so no stale `pendingHunt`.
  - B4: the search plan keeps its searched points (fixed arrays, cleared on a moved centre or a full reset);
    `buildPlan` skips candidates within `spacing` of a searched point or the centre, so a rebuild gives new points and
    point 1 never re-looks the LKP.
  - B5: cover is shared across the intruder groups of one roles tick (`rolesTickStart` / `rolesCommit`), so two
    groups are never handed the same free cover.
  - B6: a blinded guard does not hear at all (`hear` skips him), so a blinded calm guard no longer turns to or reports
    a noise.
  - B7 (A182): no `tell(alarmHunt)` after an alerted spawn; with no valid slot he binds on the next call or sighting.
  - B8-B10: `consoleStep` checks the console's busy state once before the sight ray, `boardStep` looks up the console
    key only in the light / breaker branches, and the per-step `EnemyManager` loops are index loops.
  - C1 (A169): above (Every player is seen). C2: above (Locked doors on the grid). C3: `losClear`'s ray-only miss is
    tested with distance 0.

## Enemy archetypes (2.0 phase 6)
- `ai/archetypes.ts` (pure, `ARCHETYPE`): `heavyMult` (by `fromFront`), `shieldBlocks`, `grabRule` (heavy frontal = lethal
  only, enforcer frontal = none; `TakedownController` offers `lethalOnly`), `sniperRelocate`, `glint`, `smellRate`,
  `radioCheck`. `enemyDefs.ts` re-exports them; `ENEMY_KINDS` = `grunt | runner | heavy | sniper | enforcer | dog | droneOp
  | officer` (`emptyKinds()` for tallies; `quadruped`).
- `Enemy`: `perceptionMul` (difficulty x officer buff), dog smell (`smelled` keeps an alerted dog on the target),
  `applyDamage` plates / shield, sniper `shotsHere` / `relocations` (a new post 5-22 m away), `glintFor(viewer)`, laser and
  glint meshes (`sniperFx`), enforcer push in `attack`, dog heel (`findLeader`), `DogModel` (`ai/dogModel.ts`; dead dogs in
  `EnemyManager.dogCorpses`), `bark(ev)` -> `ctx.onBark`, `squad`, `buff`.
- `EnemyManager`: `ReconDrone`s (`ai/reconDrone.ts`: the `droneOp` guard's own drone; Damageable sphere, orbit, camera
  cone, `onDroneSpot`, `empAt`), officer buffs (2 Hz), the alarm runner weighted to officers, `joinSquad` +
  `radioCheckNow` (period `ARCHETYPE.radio`, stealth only), radio delays x reaction x officer.
- Which archetypes each mode uses: "Decided direction" above (G155, G297, G307).
- (marlow-bays item 24) Every guard rig (`buildEnemyRig`: the host's guards and the co-op client's puppets) reads its
  tuned base table (`anim/animBaseGuard.ts`) plus the tuner's guard rows (`anim/tuneGuard.ts`; `rig.guardRows`), never
  Wren's; the brain reads only the posed rig (the head is the eye), as before. Untuned: bit-identical.
- Barks: `ai/barks.ts` (`BARKS`, `RADIO_BARKS`, `BarkVoice` cooldowns); `ui/hud/barks.ts` `BarkView`; `bark` event ->
  `sfx.radio()` for radio lines.

## Difficulty (G106)
- `DIFFICULTY` (`ai/archetypes.ts`): `rookie | normal | realistic | perfectionist` (`DifficultyPreset`; `Difficulty` is the
  same type): perception, damage, accuracy, hp, reaction, reward. `parseDifficulty` reads easy / hard, and an old `custom`
  or unknown name as Normal. `resolveDifficulty(d)` returns the level's def.
- `GameState` resolves it once at match start (`GameState.diff` = `difficultyDef`) and hands it to `EnemyManager.diff` /
  `AiContext.diff`: every AI read goes through it. `reaction` scales the radio call-in (`callInDelay`), squad radio delays,
  the first-shot settle and the panel raise (`ALARM.holdTime` x reaction). In co-op the host's level runs (the AI is
  host-only) and shows read-only in the client's lobby.
- Tests: `tests/difficulty.test.ts`; e2e-mouse, e2e-pad, e2e-coop pick or check a level.

## Player cover reference (locomotion step 11)
- `PlayerRef.cover` / `coverT`: the local player's back-to-wall segment (`WallCore.spot`) and seconds on it; the host sets
  each client's from its `wall` MoveState. `EnemyManager.assignFlanker` picks a flanker once a player has held cover > 4 s,
  and `Enemy.tactics` lobs a grenade to flush one held > 6 s (one grenade in the air at a time; e2e-wall checks both).

## Navigation
- `buildNavGrid` (load time) -> `NavGrid` (pure). Enemies chase via the shared flow field, use A* only for cover moves,
  and are constrained to nav cells (no physics character controller per enemy).
- Runtime closures (sector-fixes-r2): `addClosure(cx, cz, hx, hz, yaw, y)` collects a rect's walkable cells near height y
  once; `setClosed(id, on)` toggles `walk` through a per-cell count (overlaps stay shut until all open) and bumps
  `version`, which makes `goTo` routes and the manager's flow field replan. Sector Ops shuts each bolted team door's
  doorway this way (`sectorMode.findBolts` / `unbolt` / `rebolt`; host and solo only, the client has no grid).
  (guard-ai S20) Other doors are not on the grid: the walker's door gate (`ai/doorGate.ts`) stops guards at a shut leaf.
  (guard-ai S28) A locked shut door is: `ai/lockedDoors.ts` holds a closure per door while it is locked and shut.
- Multi-level: the grid is layered - up to 3 standing surfaces per column by default (`sampleLayers`; a surface needs
  `HEADROOM` 1.7 m; a map may raise `navLayers`), cell = `layer * cols + column`; columns join by height (`stepTo`). Links
  (`navLinks`): ladders both ways (`kind 'ladder'`), ledge drops 1-2.2 m one way; A* / Dijkstra take them, paths split at
  them (`Waypoint.link`), `flowNext` returns a link's start. Every query takes an optional height (`cellOf`, `heightAt`,
  `nearestWalkable`, `lineClear`, `findPath`, `flowField`, `flowNext`); NaN = the lowest surface. Enemies: `cellNear` keeps
  their storey, `beginLink` / `runLink` (walk 1.5, climb 1.1 up / 1.4 down, drop 6 m/s; dogs wait at the foot).
- Brains (`ai/enemy.ts`) think at ~4 Hz (line of sight rays staggered) and act every fixed step: walk when they can see
  the target, run only to contact / between covers; suppressive fire at the last known position, blind fire in some hide
  phases; cover choice weighted by `coverQuality`. Chasing enemies entering a new room unseen pause 0.7 s at the threshold.
- `EnemyManager` caps awake enemies (12, `MAX_ALIVE` in `src/ai/enemyManager.ts`) and ragdolls (`BUDGET.maxRagdolls`).

## Modes
- Modes implement `GameMode` (`game/modes/`; `ModeId` = `sandbox | mission | clear | infiltration | course`); `GameState`
  owns world, player, combat, AI, pickups and interactables and calls mode hooks. `GameState.endSession` shows results;
  `GameState.rewardHook` lets progression add rewards. Modes and the campaign: `docs/systems/modes-and-progression.md`.
- Hunter (`clear`, `game/modes/clearMode.ts`; parked behind `?legacy=1`, G7): each tagged room's squad spawns unalerted
  holding it (`Enemy.hold`: fights from inside, never chases out, falls back to its post); squads beyond the awake cap spawn
  later, nearest rooms first, never within 7 m. The HUD shows only "Enemies left N" (`RoomClearTracker.hostilesLeft`).
  Going down shows "DOWN" (three tries). The last hostile down completes the operation (`operationComplete` event,
  banner, slow beat, letterbox; one "Operation complete" reward line).
- `?autostart=<mapId>&mode=<sandbox|mission|clear|infiltration|course>` boots straight into a match (`mode=hunter` is an
  alias of `clear`; dev and tests).
- Sector Ops guard rules (sector-redesign slice 0): `checkSectorGuards` (`game/sectors.ts`, run by `checkSectors`)
  fails a human guard with no gun (no runners, M1), a heavy (G155), more dogs than the section's `dogs` (default 0, M10)
  and a dog without a `handler` (an armed human guard of the section). Alarm reinforcements spawn as
  `SECTOR_REINFORCE_KIND` (grunt), `perStage` per stage, aggressive at the section's entries (guard-ai S6). `SectorGuard` also carries optional `squad`, `zone`, `role`,
  `reason`, `pair` for guard-ai (not read yet; `docs/sector-redesign/research/ENGINE.md` section 7). Sector Ops still
  joins no squads, so radio checks do not run there.
- Palm strike (G42): `strikeTargetable` (`game/elbowStrike.ts`) keeps dogs out of the strike's pick and its contact
  (solo, host and a client's strike on the host). Dogs carry no flashlight (G201, `carriesTorch`).
- Sector restart (G22): `SectionStartState` (`game/sectorReset.ts`) records the fixed lights (switched, shot, the base of
  a jammed lamp; not torches) and the unlocked doors when a section begins, and a section restart puts them back
  (`LightRegistry.resetTo`, `StealthSystems.syncSwitches` for the switch labels). Host / solo; Sector co-op does not
  mirror lamps yet.
- Camera cap (G1): `validateSecurity` caps cameras live at once (12 per Sector section, untagged ones counting in each)
  and the map at 16 (`WIRE_CAMERAS`, the co-op `sec.ck` list).
