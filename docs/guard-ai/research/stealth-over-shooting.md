# Stealth over shooting - guard-ai share (planner, 2026-10-23)

Source: `docs/ROADMAP.md` on `origin/feature/menu`, "Next: stealth over shooting" and the Decided entry (2026-10-23
~10:10, answered by native multiple choice in Character Build, relayed). Michael's theme, verbatim: "reward stealth
over shooting as sections get harder". The item texts below are the options he chose, as the Decided entry records
them. Slices: `PLAN.md` S11-S15 and the widened S9. Assumed decisions: `BRIEF.md` A35-A46.

Code references are on the chain tips: `-s8` = `C:/NightShift/Mobile-Coop-guard-ai-s8` (S1-S8), `-s6` (S6),
`-s5b` (S5b). Every number is a starting value (G4).

## Owned by guard-ai

### Item 2 - helmets
- **Decided:** "no instant headshot kills later (helmet: first headshot knocks it off and staggers, second kills;
  takedowns still one move)".
- **Exists:** `Enemy.applyDamage` (-s8 `src/ai/enemy.ts:1127-1169`): any bullet to the head kills any guard but a heavy
  (`:1153-1155`); `HitPart` is only `head | body` (`src/game/damage.ts:5`); a hit of > 35 staggers 0.35 s (`:1164`);
  the elbow-strike stagger breaks aim and burst (`:500-510`). Takedowns are melee and never read `part`. The look has a
  `helmet` style (`config/enemies.json`), built once into the rig; no runtime helmet state.
- **Gap:** a per-guard helmet that soaks one head hit, a visible knock-off, and who wears one.
- **Design:** `Enemy.helmet: boolean`. A bullet to the head of a helmeted guard: no damage, `helmet = false`, the
  helmet mesh hidden and a pooled helmet prop dropped at his feet (tumbles 0.4 s, stays as a clue), stagger
  `GEAR.helmetStagger` 0.9 s (the strike stagger: no fire, aim reset), then the normal "I'm hit" path (combat on the
  shot's origin, contact call, S3). The next head hit kills as today. Unaffected: takedowns, grabs, sleep bolts
  (`nonLethal`, `:1130`), melee, explosions. Who wears one: a slot tag `gear` (`'helmet' | 'armour' | 'both'`) read in
  `placeSlot`, a section default `SectorDef.gear` (sector-redesign fills it for later sections; none = no gear, so
  Marlow Yard and early sections are unchanged), and the alarm stage (item 4). Reads in CT terms: a sharp ping and
  sparks, the helmet flies off, the guard reels and comes up shooting; the hit marker shows a deflect, not a kill.
- **Co-op:** host-authoritative (client shots already resolve on the host's `Enemy`). The client must see the helmet
  and its loss: a gear bit in `EnemyState.al` and a `deflect` hit-confirm kind, both in protocol 32 (S9, widened).
  Until S9 lands the client sees bare heads but the rule holds.
- **Test:** unit `gear.test` (head + helmet -> 0 dealt, helmet off, stagger; second head -> killed; heavy unchanged;
  takedown and sleep bolt ignore it). e2e-stealth-ai `helmet`: spawn a helmeted guard, two head hits through the test
  hook: alive and staggered after one, dead after two; e2e-takedown: a helmeted guard falls to one takedown.

### Item 3 - riot shields
- **Decided:** "riot shield enemies only in alert response teams".
- **Exists:** the `enforcer` kind is the shield guard: shield arc 70 deg blocks bullets from the front
  (`src/ai/archetypes.ts:18-23, :95`), pushes in at 1.1 m/s firing (`enemy.ts:1845-1851`), frontal grabs refused but
  side takedowns allowed (`archetypes.ts:100-108`), a placeholder box shield (`enemy.ts:376-386`). Sector Ops
  reinforcements are always `'grunt'` (`src/game/sectors.ts:311`); several parked maps place enforcers on patrol
  (embassy, mansion, port, refinery). S8 keeps enforcers out of the cover roles (`enemyManager.ts:1464`).
- **Gap:** shields only in response teams; the team built round the shield; the client puppet has no shield
  (`src/net/enemyPuppet.ts` builds none).
- **Design:** `RESPONSE` table: each response team is the stage's `perStage` guards, a shield guard first, the rest
  armed guards (same count, so the live cap and `MAX_ENEMIES` 32 hold). The shield guard always wears a helmet. On
  live maps outside Sector Ops (`StealthSystems.onAlarm`, -s6 `src/game/stealthSystems.ts:510`) the team is shield +
  2 guards (replaces grunt, grunt, heavy; G155). `validateGuardAi` rejects `enforcer` in a section's guard list (map
  data check; parked maps are not validated). Reads in CT terms: the alarm brings a team that leads with a shield;
  you flank it, flash it or avoid it, you do not out-shoot it.
- **Co-op:** host-only; the kind is on the wire already (`EnemyState.k`); `EnemyPuppet` must build the shield by kind
  (S9, no wire change for that part).
- **Test:** unit `responseTeam.test` (team per stage, shield first, count = perStage). e2e-sectorops: raise a stage,
  the team's first member is an enforcer, front shots blocked (`shieldBlocks` counter), a section guard list with an
  enforcer fails the data check.

### Item 4 - alarm stages
- **Decided:** "alarms escalate (armour / helmets and a response team per stage" ... Michael, verbatim: "dont add
  cameras, that doesnt make sense".
- **Exists:** Sector Ops stages 0-3 (`SECTOR.alarmMax` 3, `perStage` 2, `sectors.ts:241-243`, `alarmStep :565`),
  carried over sections, back to the section's start on a restart; each stage sends `perStage` reinforcements from
  the section's entries (-s6 `sectorMode.ts:469-491`), aggressive, on the LKP, never calm (S6). The stage changes no
  camera (`ctDevices.ts` only shows and records it).
- **Gap:** gear per stage; the team composition (item 3).
- **Design:** `GEAR_BY_STAGE` (CT's order, research C4): stage 1 a response team only; stage 2 + body armour (item
  13 rule) on every guard of the live section and every later team; stage 3 + helmets. On the stage rise every living
  section guard gets the stage's gear at once (no suit-up beat in the prototype); guards spawned later (next section,
  revive, reinforcements) get it at spawn; a restart drops it with the stage. No camera is added, woken or retuned.
  Outside Sector Ops (one alarm per section load) the one alarm counts as stage 1. Reads in CT terms: each alarm
  makes every guard harder to shoot; the banner names the stage.
- **Co-op:** host-only; gear bits ride protocol 32 (S9).
- **Test:** unit `gear.test` (stage -> gear). e2e-sectorops: stage 2 -> every live guard `armour`, stage 3 -> `helmet`;
  restart from stage 1 -> no gear; camera count and states unchanged across stages.

### Item 6 - missed check-ins and found bodies raise alert
- **Decided:** "missed patrol check-ins and found bodies raise alert".
- **Exists:** found bodies (S4): the finder shouts, a `body` radio call, every receiver held cautious until the aware
  guards are down (`awareness.ts:152 openHold`); a KO found is woken and timed (`startKo :234`); cameras send guards to
  bodies (S7). Missed check-ins (S5b, -s5b `enemyManager.ts:1058-1140`): every ~40 s the desk or squad caller checks;
  a down member not yet found opens a `missing` incident and two of his squad search the spot; the caller barks
  "missed". No section caution from a miss, and no call to cut. S10 adds a missing talking partner.
- **Gap:** a miss raises nothing beyond the pair search.
- **Design:** "raise alert" = section caution, not an alarm stage (A2 kept; A40). On a miss the caller starts a
  `missing` radio call (`RADIO.callIn` 2.5 s x reaction, cuttable: take the caller during it and nobody else hears);
  on delivery (S3 stagger) each receiver turns cautious, timed `MISSING.cautious` 180 s (a new timed hold over the
  section's keys in `awareness.ts`). If the pair then finds him dead, the S4 held caution takes over; KO'd and woken,
  the S4 KO caution. Found bodies: no change. Reads in CT terms: "Unit three, report... nothing." then the section
  walks slower, looks longer and sees farther for a few minutes.
- **Co-op:** host-only; the caution read on the client is S9's caution bit.
- **Test:** unit `sectionAlert.test` (timed hold expiry, dead find promotes to held, cut call = no caution).
  e2e-stealth-ai `missed check`: KO a squad member out of sight, force `radioCheckNow`: after the call the section's
  guards are cautious, two search the spot; KO the caller during the call: nobody cautious.

### Item 7 - gunfire alerts the section (AI side)
- **Decided:** "gunfire alerts the section, limited suppressor ammo; no ammo inside a section" (suppressor ammo and
  the crate: other jobs, below).
- **Exists:** S1 hearing: loud shots `em.noise` with walls, combat inside a quarter of the reach, one sent inside half,
  the rest turn (`gameState.ts:586-590`, `SHOT_NOISE` 28 m); S3: a guard who goes to combat calls contact to the
  section. Both CT guns are suppressed (noise 0.35, `weaponDefs.ts:66`), so loud fire today is a client's
  unsuppressed flag or a future empty suppressor. Co-op: a client's quiet shot is heard at 14 m (`coopHost.ts:1161`),
  solo at 9.8 m (parity gap).
- **Gap:** a loud shot that sends nobody to combat alerts only the guards in reach.
- **Design:** hearing stays by range (M1 holds: no guard hears a shot he could not). Any calm guard who hears a loud
  shot (tier 1 or more) and is not already fighting starts a `shots` call (new `CallKind`, one per shots incident,
  cuttable); on delivery the section is cautious, timed `SHOTS.cautious` 120 s (a later loud shot refreshes it), and
  the board sends a pair (lead + cover, G11) to the spot instead of one. Suppressed shots: unchanged (local only).
  No alarm from shots (M4: only a panel or a command call). Fix the client quiet-shot reach to `SHOT_NOISE x noise`
  (A46). Reads in CT terms: an unsuppressed shot is a radio call away from every guard in the section being on edge.
- **Co-op:** host-only; the client's loud / quiet flag (`PF.quiet`) already reaches the host; the coopHost line is
  `src/net` (coop suites) but no wire change.
- **Test:** unit `sectionAlert.test` (shots call per incident, refresh, suppressed never calls). e2e-stealth-ai
  `loud shot`: fire a loud shot by the test hook 20 m from one guard: he radios, a far guard turns cautious, two go;
  a suppressed shot: no call.

### Item 8 - shot lamps draw an investigation, breaker cuts are cleaner
- **Decided:** "shot lamps draw an investigation, breaker cuts are cleaner".
- **Exists:** S2: every lights-out goes through `EnemyManager.lightsOut`; a shot lamp (`stealthSystems.ts:461-472`) and
  a switch off (`toggle :414-428`, circuit `group`) both open a `light` incident: guards who saw it go (2 if a second
  witness within 15 m), check the fixture and a 4-point ring (`lightCheck.ts`), stand down calm; nobody saw it =
  nobody comes, unless the 5 m pop is heard. No guard ever turns a light back on (G11 "guards relight lamps" not built).
  marlow-final's timed isolator calls `lightsOut` the same way and relights itself.
- **Gap:** a breaker cut costs the same attention as a shot lamp; a dark lamp nobody saw is never noticed.
- **Design:** shot lamp: unchanged S2 check (1-2 guards, ring, back to normal, M1), the lamp stays dark for good.
  Breaker cut (a wall switch / breaker group off): a fault, not an attack: one witness only (never a pair), suspicious
  at most, walks at patrol pace to the switch, bark "Breaker's gone again.", flips it back after `BREAKER.resetT` 2 s
  (the circuit relights through `StealthSystems`, G11), no ring, back to his route. A second cut of the same circuit
  within `BREAKER.repeatT` 60 s is tampering: the full S2 light incident at the switch. Timed isolators: the guard
  aborts when it relights itself. Late discovery (both): a calm guard who later sees a dead fixture in view
  (`lightInView`) within 12 m reacts as a witness would (shot -> 1 investigates; cut -> the reset walk). Reads in CT
  terms: kill the breaker for a short, quiet window; shoot the lamp for lasting dark at the price of a visit.
- **Co-op:** host-only; the relit circuit reaches clients through the existing light sync (Sector Ops `lamps`,
  protocol 31; Course `lights.groups`). No wire change.
- **Test:** unit `breaker.test` (one witness, reset, repeat = tamper, late discovery). e2e-stealth-ai `breaker`:
  switch off with two guards seeing it: one walks over, the circuit is on again, both calm; switch again inside 60 s:
  a light incident. Watch e2e-course (`switch-0` press: its course guards are passive, but check the lamp asserts).

### Item 11 - response teams stay and search
- **Decided:** "response teams stay and search, no stand-down".
- **Exists:** S6: reinforcements are aggressive, know the LKP, run their entry route, never calm
  (`AlertInput.hunting`, -s6 `enemy.ts:1462`, `alertState.ts:184`), so their search never ends; it stays on the LKP.
- **Gap:** "search" means the LKP spot forever; no sweep of the section.
- **Design:** after the LKP search (`ALERT.searchTime` 60 s) a team walks the section's sweep points: the section's
  route points and posts, thinned to one per 8 m, nearest to the LKP first, each once, then again from the LKP
  (an optional `SectorDef.sweep` list overrides). The shield guard leads, the rest stack 2.5 m behind him, 6 s look
  at each point, torches on in the dark. Teams from different stages start at different points (team index offset).
  A sighting -> combat (S8 roles, aggressive), then the LKP search, then the sweep again. They never leave, despawn
  or calm; only a section unload or restart ends them. Reads in CT terms: once the alarm brings a team, it owns the
  section until you leave it.
- **Co-op:** host-only, no wire change.
- **Test:** unit `sweep.test` (points thinned, order, loop, team offset). e2e-sectorops: raise a stage, hide: after
  60 s the team moves between sweep points, still `searching` / hunting at 120 s, none calm, shield first.

### Item 13 - body armour
- **Decided:** "heavier late guards: body armour, torso shots only stagger".
- **Exists:** `EnemyDef.armor` multiplier and `plated` (rig plates; heavy and enforcer); the heavy's directional plates
  (`archetypes.ts:87`). No per-guard armour state; heavies are out of co-op missions (G155).
- **Gap:** a vest on an ordinary guard that turns torso rounds into staggers.
- **Design:** `Enemy.armour: boolean`. A bullet to the body of an armoured guard: no damage, sparks and a thud,
  stagger `GEAR.armourStagger` 0.5 s at most once per `GEAR.staggerCd` 1.5 s (no stun-lock), then the normal hit path
  (combat on the origin). Head hits follow the helmet rule; takedowns, sleep bolts, explosions unaffected. "Heavier"
  = a look (plates on the torso node), not the heavy kind. Who wears it: slot tag `gear`, `SectorDef.gear`, alarm
  stage 2+. Reads in CT terms: chest shots only knock him back; aim for the head or get behind him.
- **Co-op:** as item 2 (protocol 32 bit `AL_ARMOUR`, `deflect` confirm).
- **Test:** unit `gear.test` (body + armour -> 0, stagger, cooldown; head still kills without helmet). e2e-stealth-ai
  `armour`: five body hits leave him alive; one head hit kills.

## Handed to other jobs (no slices here)
| Item | Owner | AI hook needed from guard-ai |
| --- | --- | --- |
| 1 bulletproof cameras later (ricochet, jam, cut power, slip the sweep) | sector-redesign (map data, `CtDevices`) | none: a ricochet is an impact noise, already heard through `hear` |
| 5 section rating (undetected / no kills / no alarms / bodies hidden) | section-rating | read-only per-section counters on `EnemyManager` (bodies found, missed checks, radio alarms, shots calls), reset at section load: S14 adds them |
| 7 limited suppressor ammo | CT Core (weapons) | none: an empty suppressor sets the gun's noise to 1 and `GameState` / `coopHost` already send loud shots to `em.noise`; S14 reacts |
| 7 ammo crate between sections, once per player | sector-redesign (map data, per-player use on the host, src/net) | none (weapons / not guard-ai) |
| 9 interrogation gives door codes, camera routes, patrol timing | CT Core | on request: a read-only `patrolTiming(e)` (route points, loop clock, next pair meeting) from `PatrolWalker` / S10 |
| 10 armoured glass / doors with a quiet bypass | sector-redesign (map data) | if armoured glass gets its own collision group, the guard sight ray must see through it while bullets stop (one mask line in perception) |
| 12 co-op synced takedowns rewarded | CT Core, section-rating | none: two down at once leave nobody to call (S3 cut) or witness (S4) |
| 14 thermal / night-vision cameras late | sector-redesign (`CtDevices`) | none: the S7 body pass reads the same cameras (IR, G240) |

## Shared numbers (one table, `src/ai/gear.ts`, S11)
`GEAR` helmetHits 1, helmetStagger 0.9 s, armourStagger 0.5 s, staggerCd 1.5 s, armourMult 0; `GEAR_BY_STAGE`
[none, none, armour, armour + helmet] (stages 0-3); `RESPONSE` shieldLead true, shieldHelmet true; `SWEEP` enabled,
thin 8 m, dwell 6 s, gap 2.5 m; `MISSING` sectionCaution true, cautious 180 s; `SHOTS` sectionCall true, cautious
120 s, pair true; `BREAKER` reset true, resetT 2 s, repeatT 60 s; `LATE` enabled, range 12 m.

## Art
Prototype placeholders from the part library (no new art): helmet = a dome on the rig's head node, armour = torso
plates (the rig's `armor` look parts), shield = the enforcer's box (exists), dropped helmet = the dome as a prop.
Proper helmet, vest and riot-shield meshes are a Character Build hand-off (in-repo Blender scratch builds, headless)
for the visual pass.
