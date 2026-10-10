# Mission 1: DEAD LINE (campaign version, v2, 20 minutes)

Version 2, 2026-10-10. Built from the Stealth Mission Design Workflow and the Co-op Mission Design Workflow (both updated Oct 10, 2026). Replaces v1. Save as docs/design/mission-1-dead-line.md.

Status tags:
- TODAY: works with the game as it is.
- NEW-small: a small addition (one session at most), with a stated fallback.
- PARKED: not built for the vertical slice.

Game numbers (speeds per gear, noise radii, vision time, lamp limits) come from docs/design/scale-sheet.md, docs/systems/movement.md, ai.md and light.md. This document sets targets. It never invents engine values.

---

## 0. What changed from v1, and why

1. **Length.** The target is a 20 minute first run. T1's entire critical path is 55.7 s at best-case pace, so the Annex cannot hold this. The site must grow, and the chapters must carry enough decisions to fill 20 minutes without padding.
2. **Chapters.** Eight, not six, with a counted number of decisions in each.
3. **Toys.** A written inventory of 22 things to use (ladders, ducts, an under-floor trench, a catwalk, a pipe beam, a window ledge and more), each with a cost.
4. **Light and dark.** A per-chapter plan that forces choices, and rules that stop the player simply walking through the dark.
5. **Guards.** Fourteen plus two reinforcements, all active. Desktop is the target. The phone is a test device only and has no say in the design. The active-guard cap is one named constant, set from a measured main-thread cost.
6. **Anti-sprint.** Written rules, plus two test bots (a sprint bot that must fail and a timetable bot that must succeed).
7. The rest of v1 (the linear spine, locked gates, goals, twist, failure, co-op) is kept and adjusted.

---

## 1. The 20 minute budget

**Formula.** First-run time is about (encounters x 35 s) + 3 minutes of transit. An *encounter* is anything that makes the player stop and decide: a guard sightline to time, a lit pool to cross or darken, a route fork, a toy to use, a hold interaction, a noise decision.

- 28 encounters x 35 s = 16.3 min, plus about 3.5 min of transit = about 20 minutes.
- Rule: an encounter every 30 to 45 s. No stretch of 60 s with none.
- **Known-route run:** 8 to 9 minutes. At most 35% of it is forced waiting.
- **Ideal walk** (best route, zero waits, mixed gears, measured with the scale sheet's gear speeds): 5.5 to 6.5 minutes. That is about six times the Annex's critical path. The map must be sized to hit this number, not the other way round.

| # | Chapter | Encounters | Ideal walk | First run |
|---|---|---|---|---|
| 1 | Lane and yard | 3 | 30 s | 2.0 min |
| 2 | Coke yard and service tunnel | 4 | 45 s | 2.5 min |
| 3 | Plant basement | 3 | 45 s | 2.0 min |
| 4 | Switch hall | 4 | 60 s | 3.0 min |
| 5 | Upper floors | 5 | 60 s | 3.5 min |
| 6 | Approach to the cage (two lanes) | 4 | 50 s | 3.0 min |
| 7 | The cage | 3 | 35 s | 2.5 min |
| 8 | Breakout | 2 | 30 s | 1.5 min |
| | **Total** | **28** | **about 6 min** | **20 min** |

**Site brief (targets for the map designer, confirm by ideal-walk time).**

| Zone | Size target | Levels |
|---|---|---|
| Lane and yard | 40 x 14 m | Ground |
| Coke yard, boiler house, service tunnel | 24 x 16 m plus a 35 m tunnel | Ground and under-floor |
| Plant basement (battery hall, rectifier, generator) | 30 x 18 m under the main building | Basement |
| Switch hall | 30 x 18 m, double height, catwalk ring at +3.3 m | Ground and catwalk |
| Upper floors (Test room, Gallery, offices, Control room) | 36 x 18 m | Upper |
| Roof (plant room, pipe beam, exhaust shaft) | 36 x 21 m | Roof |
| Cage and vestibule | 24 x 16 m | Ground |

Reuse the Annex rooms where they fit (Switch hall, cage, Test room, Control room, Gallery). The designer measures every chapter's ideal-walk time and adds route length (switchbacks, a catwalk, a second corridor) until it meets the table.

---

## 2. Pitch

- **Setting:** the Kestrel Exchange, a 1960s telephone exchange on the edge of Hollowmere. A back lane, a coke yard, a plant basement, a switch hall and a rooftop plant room.
- **Time and weather:** night, rain, a city suffering rolling brownouts before SUNDOWN.
- **Player fantasy:** the ghost in the switchgear.
- **Promise:** you will tap the broker's line inside a guarded exchange without anyone knowing the line was touched.
- **Playtime:** 20 minutes.
- **Why the team is here:** the Client (Crane, Continuity Office) wants proof of who is selling call records before SUNDOWN. A broker rents spare trunk capacity here and routes his traffic through one line card. The cage is air-gapped, so the team taps it in person.
- **Why guards:** the building is empty at night, as real exchanges are, so the broker pays a private contractor. They guard the cage and the Control room panel (the one thing that would warn him) and patrol the yard because the lane is the only way a van gets in.
- **Arrival:** the van drops the team at the lane gate (Gp). **Exit:** the van collects them at the vehicle gate (Gv, E1), or at the lane gate (E2) if the east side is hot.

---

## 3. Objectives

| Tier | Goal | Where | Known at start? |
|---|---|---|---|
| Primary | **P1** Pull the circuit record | Test room (O1) | Yes |
| Primary | **P2** Open the cage | Three methods, below | Revealed when P1 completes |
| Primary | **P3** Plant the tap | Cage (O2) | Yes, needs P1 and P2 |
| Primary | Extract | E1 or E2 | Yes |
| Secondary | Leave no alarm and no found body | Whole map | Yes |
| Secondary | Dim the hall: trip breaker panel BP in the plant | Chapter 3 | No |
| Bonus (hidden) | Copy the broker's roster | Control room terminal | By exploring |

**P2 methods:** (1) the Control room panel CP (quiet, needs the officer's gap), (2) the breaker pair BK1 and BK2 in the cage vestibule (two players: quick; one player: hold BK1, which latches 20 s, then run to BK2), (3) the roof route and the exhaust shaft drop ES (skips the lock, one way, sniper overwatch).

**Information chain.** Radio briefing gives the goal. The boiler house pair's chatter says the hall can be dimmed from the plant (backup: LANTERN says so after P1). P1 gives card 14 and reveals P2. The radio is text only, with the same line for any player count.

**Check:** P1 and P2 can be done in either order. P3 needs the card number even after the shaft drop.

---

## 4. Layout, the spine and the locks

| Ch | Zone | Gate out opens when |
|---|---|---|
| 1 | Lane and yard | The coke yard gate CG is cut open (hold 4 s) |
| 2 | Coke yard and tunnel | The tunnel hatch is opened (hold 3 s), or the coke chute is dropped |
| 3 | Plant basement | The basement stair B (open) |
| 4 | Switch hall | The stair S1 to the upper floor (open) |
| 5 | Upper floors | P1 done, then the Gallery ladder GL or the stairs back down |
| 6 | Approach to the cage | Either lane reaches the cage |
| 7 | The cage | P3 done |
| 8 | Breakout | E1 or E2 |

**Locked at the start (this keeps it linear).** The main door PD is locked from outside. The coke yard gate CG is the only way in from the yard. RD, GD, FD1 and Gv are locked from outside and open from inside. The roof ladder RL is retracted and drops from the roof side. The trench D1 and the riser R1 are bolted at their near ends and open from the far end. The cage doors CH and GCd are locked until P2.

**Shortcuts that open after one pass:** PD from inside, the trench (from the cage end), the riser R1, RL.

**Vertical layers:** the under-floor tunnel, plant basement, hall catwalk, upper floors, roof. **Loops:** the hall and cage doors, and the trench back to the plant.

If the map walls cannot give this chain, the designer proposes the smallest change.

---

## 5. Chapters

Each chapter lists its encounters (E), toys, light plan and guards. All numbers are targets for the designer.

### Ch 1: Lane and yard (calm, 2.0 min, 3 encounters)
- **E1.1** Watch G1's loop from the lookout V1 (learn the light rule).
- **E1.2** The gate sentry G2 (stationary, narrow cone) covers the first lit stretch. Take him down from behind, or avoid his cone.
- **E1.3** Reach the coke yard gate CG under the sniper G6's far cone: shadow edge (slow), the drain culvert (low crawl under the lit stretch), or kill lamp circuit C1 at SW1 on the gatehouse wall (guarded by G2).
- **Toys:** culvert, parked van cover, lamps Y1 to Y3.
- **Light:** about 60% lit. **Teaches:** observe, plan, act.

### Ch 2: Coke yard and service tunnel (first test, 2.5 min, 4 encounters)
- **E2.1** G3 patrols the coke yard (mostly dark, one lit pool at the chute).
- **E2.2** The boiler house pair G4 and G5 talk at a table. The conversation is the timer, and it carries a clue. Steam pipes give a low crawl under their sightline.
- **E2.3** The bunker apron is exposed to the sniper G6. Use the bunker as cover, or put out the lamp.
- **E2.4** Pick the exit: the long service tunnel (dark, under-floor, you hear guards above) or the coke chute (one-way drop into the plant, lit).
- **Toys:** pipe crawl, service tunnel, coke chute, boiler hum (a sound mask, NEW-small).
- **Light:** about 35% lit.

### Ch 3: Plant basement (2.0 min, 3 encounters)
- **E3.1** Cross the generator hall: bright, but the hum masks your footsteps (NEW-small, fallback: no mask).
- **E3.2** G7 patrols between the battery hall and the rectifier room.
- **E3.3** The breaker panel BP is watched by G8 (stationary). Hold 4 s to dim the hall circuits for Chapter 4. Dimming makes the hall guards check their panels, so it is a trade, not a free win.
- **Toys:** generator hum zone, battery hall racks, ladder shaft V to the hall catwalk, BP.
- **Light:** about 50% lit.

### Ch 4: Switch hall (rising middle, 3.0 min, 4 encounters)
- **E4.1** Enter at the stair foot: a lit pool before the first rack row.
- **E4.2** The pair G9 and G10 patrol crossing lanes (the gap puzzle).
- **E4.3** The catwalk ring at +3.3 m is dark but its metal floor is loud. Check whether guards can see up (the build reports it); if they can, lamps expose the catwalk.
- **E4.4** Leave by stair S1, or the fire door to the Gallery.
- **Toys:** catwalk, under-floor trench strip, lamp lure, racks, V shaft arrival.
- **Light:** about 60% lit if BP is untouched, about 25% if dimmed.

### Ch 5: Upper floors (3.5 min, 5 encounters)
- **E5.1** A lit corridor crossing, with the exterior window ledge as the dark alternative (slow gear).
- **E5.2** P1 in the Test room: hold 3 s under an emergency lamp that cannot be switched (timing only).
- **E5.3** The Gallery window W1 lets you watch the officer G11 before committing.
- **E5.4** P2 by the Control room panel CP (hold 5 s) in G11's gap, or leave P2 for later.
- **E5.5** Choose the way on: the ladder GL to the roof, or back down the stairs through the hall.
- **Toys:** window ledge, ventilation duct to the Control room, ladder GL, W1, riser R1.
- **Light:** about 55% lit. The Control room is bright.

### Ch 6: Approach to the cage (two lanes, 3.0 min, 4 encounters)
- **6A, roof (dark, exposed):** E6.1 the ladder top under G6's scan; E6.2 fan noise masks you behind the plant room; E6.3 cross the narrow pipe beam (slow gear only; TODAY geometry, the build reports fall rules); E6.4 drop down the exhaust shaft ES (one way, lands in the cage's dark flank).
- **6B, hall return (lit, known):** E6.1 back through the hall (the pair again, now with the dimming state you chose); E6.2 the cage vestibule with the breaker pair BK1 and BK2; E6.3 the vestibule is watched by the heavy's door window; E6.4 open the cage with CP's release or the breakers.
- Both lanes take about the same time. 6A is faster for a skilled player, 6B is safer.

### Ch 7: The cage (finale, 2.5 min, 3 encounters)
- **E7.1** The heavy G12 loops around the core switch. Plant (hold 4 s at O2) in his gap, or darken his side (lamps K1 and K2, switch SW5).
- **E7.2** The alarm panel AP2 outside the cage: guards run to it, so keep them from reaching it.
- **E7.3** The twist (NEW-small): when the cage is opened or entered, the grid drops for 90 s. LANTERN: "That is Crane's drill." Guards walk to their nearest panel. G12 holds.
- **Toys:** shaft drop, hide spot, K1 and K2, sync takedown spot (placed now, wired after the playtest).
- **Light:** bright with a dark flank.

### Ch 8: Breakout (1.5 min, 2 encounters)
- **E8.1** Van: through the Generator room and GD to the yard east, to Gv, needing Y3 off or a sniper gap.
- **E8.2** Lane gate: the trench (unbolt at the cage end, crawl to the Goods-in, PD, Gp), or the roof and the fire stair FD1.
- An alarm locks Gv for 60 s and sends reinforcements there, so the lane gate becomes the exit.

---

## 6. Toys

22 toys. Every chapter has at least three. Every toy has a cost, so none is simply best. "TODAY geometry" means a walkable shape that needs no new verb.

| # | Toy | Status | What it gives | What it costs |
|---|---|---|---|---|
| 1 | Ladder (GL, V, RL) | TODAY | Vertical bypass | Slow, exposed on the climb |
| 2 | Low duct or vent (1.3 m, guards cannot enter) | TODAY | Skips a guard zone | Slow, noisy at the grille |
| 3 | Under-floor trench | TODAY | Passes under a hall | You hear guards above, slow |
| 4 | Catwalk ring | TODAY | Overhead route | Metal floor is louder |
| 5 | Narrow pipe beam (0.6 m) | TODAY | Roof shortcut | Slow gear only, sniper cone |
| 6 | Window ledge (0.8 m) | TODAY | Outside bypass of a lit corridor | Rain noise masks you but the sniper sees you |
| 7 | Exhaust shaft drop | TODAY | Skips P2 | One way, no retreat |
| 8 | Coke chute | TODAY | Fast drop to the plant | One way, lit landing |
| 9 | Pipe crawl (low gap) | TODAY | Under a sightline | Slow |
| 10 | Light switches and breaker panels | TODAY | Dim an area | Draws a guard to the panel |
| 11 | Lamps to shoot | TODAY | Dim anywhere | Broken glass sound, guard checks it |
| 12 | Hide spots and body hides | TODAY | Safety | Bodies found if poorly hidden |
| 13 | Crate steps | TODAY geometry | Reach a ledge | Noise on the landing |
| 14 | Drain culvert | TODAY geometry | Crosses a lit yard | Slow |
| 15 | Generator hum zone | NEW-small | Halves footstep noise inside | Bright light |
| 16 | Rain and fan noise on the roof | NEW-small | Masks movement | Sniper |
| 17 | Roller shutter (operable) | NEW-small | A loud distraction | Draws guards |
| 18 | Trench bolt, riser bolt, roof ladder drop | TODAY (hold interact) | Shortcuts | Need a first pass |
| 19 | Radio chatter and conversation timers | TODAY (audio) | Information | Takes time |
| 20 | Breaker pair BK1 and BK2 | After playtest | Quick P2 | Needs two or a risky sprint |
| 21 | Sync takedown spot | After playtest | Quiet heavy removal | Needs two |
| 22 | Night vision | TODAY | Sees in the dark | The goggle glow can give you away to guards close by |

**PARKED:** hanging and shimmying on pipes and ledges, rappelling, ziplines, steam valves, guard flashlights, cameras and lasers. The pipe beam and window ledge use plain walkable geometry. If a fall does no damage, they cost nothing but the sniper cone, so the build step reports the fall rule and the designer adjusts.

---

## 7. Light, shadow and sound

**Rules**
- **L1.** At least half of every chapter's route is lit and inside a guard's sightline.
- **L2.** Dark pockets or hide spots every 8 m or less. No dark stretch longer than 12 m, except the roof, so the dark is never a free pass.
- **L3.** Every chapter has one lit crossing the player can make safe with a switch or a shot, and one they cannot (an emergency lamp on an unswitchable circuit), so they must also use timing.
- **L4.** Light actions have consequences. Switching off a circuit sends the nearest guard to its panel within 10 to 20 s. Shooting a lamp sends a guard to the lamp and keeps him suspicious for 30 s. Two light actions in one chapter put that chapter on "heightened" (each guard adds a waypoint at the dark spot for 60 s).
- **L5.** Lamps are a limited resource: three to four circuits per chapter. About 40 lamps in total. Confirm the desktop lamp limit in light.md and use that.
- **L6.** Night vision's glow makes you visible to a guard within a short range, so it helps in the dark but costs you near guards.

**Light map**

| Ch | Lit share | Circuits | Forced decision |
|---|---|---|---|
| 1 | about 60% | C1 yard lamps (SW1 at G2's gatehouse) | Reach CG: shadow, culvert, or kill C1 |
| 2 | about 35% | C2 coke yard, E boiler house (emergency) | Pair, sniper apron, chute or tunnel |
| 3 | about 50% | C3 plant, BP controls hall circuits | Dim the hall or leave it |
| 4 | 25% or 60% | C4 hall north, C5 hall south, E (emergency) | The pair's lanes, catwalk or floor |
| 5 | about 55% | C6 upper corridor, C7 Control room, E (Test room) | Window ledge, ladder, or CP |
| 6 | 10% (roof), 60% (hall) | C4, C5 (hall), C8 vestibule | Roof or hall return |
| 7 | about 65% | C9 cage (K1, K2), E (emergency) | Darken the heavy or time the gap |
| 8 | about 50% | C1, C10 east yard | Van or lane gate |

**Sound.** Quiet gears are slow. Loud: sprint, shots, breaker latch, ladder and catwalk steps, shutters. Use the radii in movement.md and ai.md. Cues you hear before you see: boiler pair chatter, generator hum, hall hum, the heavy's radio, a panel siren, rain on the roof.

**Music.** Calm in the yard, caution in the tunnel and hall, tense upstairs, alert on alarm. Placeholder from the music direction.

---

## 8. Guards, tension and anti-sprint

**Roster (14 plus 2 reinforcements).**

| ID | Archetype | Role | Chapters |
|---|---|---|---|
| G1 | Grunt | Yard patroller | 1, 8 |
| G2 | Grunt | Gate sentry, narrow cone | 1 |
| G3 | Grunt | Coke yard patroller | 2 |
| G4 + G5 | Grunts | Talking pair at the boiler table | 2 |
| G6 | Sniper | Roof perimeter loop (30 s), overlooks yard and coke yard | 1, 2, 6A, 8 |
| G7 | Grunt | Plant patroller | 3 |
| G8 | Grunt | Stationary at breaker panel BP | 3 |
| G9 + G10 | Grunts | Hall pair, crossing lanes | 4, 6B |
| G11 | Officer | Upper floor and Control room patrol | 5 |
| G13 | Grunt | Patrols the upper corridor and stair landing, overlapping G11's loop | 5 |
| G14 | Grunt | Sentry in the cage vestibule | 6B, 7 |
| G12 | Heavy | Loops the core switch (cannot be taken down alone) | 7 |
| R1, R2 | Grunts | Reinforcements at Gv on an alarm | any |

- **All guards stay active.** No chapter streaming is required. Optional later: put guards more than two chapters away to sleep if the measured main-thread cost needs it.
- **Guard cap.** Make it one named constant. Default 14 fixed plus 2 reinforcements, with about 8 to 10 in play at once at peak (an alarm or the finale). Set the real number from a desktop measurement of main-thread milliseconds per guard against the existing 3 ms main-thread target (Epic is currently 4.3 ms, so every guard counts). If the measured cap is lower, drop G13 and G14 first.
- **Tension comes from overlap, not only count.** Two or three loops overlap in the middle of each chapter.
- **Loops.** All loops are on one master clock (40 s ground, 30 s sniper), so a pattern can be learned.
- **Escalation ladder (same all map).** Suspicious, Searching, Alerted (runs to a panel: AP1, AP2, AP3, RN), Hunting (reinforcements sweep), Cooling down (90 s unseen).
- **Every guard has a bypass and a way to deal with them.**

**Why sprinting fails (written rules, then tested)**
1. **A1.** At run and sprint gears, the noise radius reaches the next guard on at least 80% of the route's segments.
2. **A2.** No lit crossing is longer than 4 m without a guard-free window or a light action. The crossing time at any gear is longer than the guard's detection time.
3. **A3.** Every interaction is a hold (3 to 5 s), and each one is inside a guard's hearing or sight, so there is no instant skip.
4. **A4.** Guard sightlines overlap in the middle of each chapter, so dealing with one guard exposes you to another unless you plan it.
5. **A5.** Forced waiting is at most 35% of a known-route run, and no single mandatory wait is longer than 40 s.
6. **Tests (NEW-small, node scripts on the nav grid and the guard clock):**
   - **Sprint bot:** runs the main route at sprint gear. It must be spotted or heard at least six times and trigger an alarm before Chapter 4.
   - **Timetable bot:** follows the learned timings at slow gear. It must reach the exit with zero alarms in 8 to 9 minutes.

**Tension.** Alternate: Ch 1 calm, 2 and 3 tense, 4 high, 5 slow with a spike at the officer, 6 branch (roof tense, hall known), 7 peak, 8 release.

---

## 9. Pacing, set pieces and the twist

Beats on the clock: calm opening (0 to 2), first test (2 to 4.5), plant (4.5 to 6.5), rising middle in the hall (6.5 to 9.5), information upstairs (9.5 to 13), the choice of approach (13 to 16), the finale and the blackout (16 to 18.5), exit (18.5 to 20).

**Twist.** The 90 s grid drop lands at about the 15 to 16 minute mark, with the finale still to come. Fallback if the event system is too big: a radio line only, and G9, G10 and G11 leave their posts to a panel for 60 s.

**Set pieces (all optional, all visible from the main routes).**
1. The yard lookout shows the whole yard and the sniper tell.
2. The boiler pair's chatter (a clue, and a timer).
3. The lamp trap in the hall: kill a light, let a guard check it, take him in the dark.
4. The Gallery window: watch the officer before entering.
5. The shaft drop into the cage.
6. The blackout.
7. The heavy's hum.
8. The trench exit: crawling under the hall as guards walk above.
9. The pipe beam in the rain.

---

## 10. Failure, alarms and recovery

- **Soft consequences:** a spotted player draws guards to the spot. An alarm brings two reinforcements through Gv, locks Gv for 60 s, and ends the clean-play bonus.
- **Alarm length:** hunting 60 to 90 s, ending when the team breaks contact in a hide spot for 20 s.
- **Hard fail:** the whole team down or dead. No alarm timer and no instant loss.
- **Recovery:** a hide spot or dark pocket within 8 m of any route.
- **Checkpoints:** automatic when all living players pass a gate (CG, tunnel hatch, B, S1, the cage doors). No quicksave. Never save mid-alarm.
- **Gates close behind the team** only when everyone is through.
- **Scoring:** stars for no alarm, no bodies found, and time.
- **Check:** caught in the worst spot (the cage, heavy hunting), the team can still plant, because O2 needs 4 s and a dark or a gap.

---

## 11. Playtest and tune

| Run | Who | Pass when |
|---|---|---|
| Blind | New player | Reaches P1 by minute 11 and can explain any failure |
| Rushed | Ignores stealth | Cannot finish by sprinting (A1 to A5 hold) |
| Ghost | Avoids all contact | Reaches the exit with no alarm in about 9 minutes |
| Out of order | Roof first, or panel first | Gates hold, P3 still needs card 14 |
| Break it | Skips gates, wedges guards | Cannot |

Also measure: time to P1, the number of encounters hit (target 28), the number of light actions per run (at least 3), toys used per run (at least 6), and where players waited more than 30 s.

---

# Co-op layer (1 to 4 players)

**Why two or more.** The heavy is only quiet to remove with two players, the breaker pair is quick with two, and a split (one pair upstairs, one in the hall return) saves about a minute. Every two-player advantage has a slower, noisier or riskier solo version. Same tools for all players.

**Goals.** P1 shared, P2 split (panel upstairs or breakers at the vestibule) or joint (breaker pair), P3 shared with the heavy's gap, extract shared. Updates: the P2 reveal and the blackout. Joint goals: two (the breaker pair and the sync takedown), neither is the first thing met.

**Layout.** Split corridor: roof lane versus hall return (Ch 6). Regroup points: the foot of S1 and the cage vestibule. Drop room: ES. Landmarks: the generator, the coke bunker, the catwalk, the Gallery window, the cage. Any player who loses their partner reaches a regroup point in under 30 s. Boost point: the pipe-beam ledge (move PARKED, place built).

**Moves.** Ping and revive are TODAY. The breaker pair and sync takedown are wired after the first playtest. A small lamp on the breaker turns green when one is held, and the partner's character gives a short "ready" line. A failed joint action costs noise only.

**Guards for 2 to 4.** The hall pair needs one player to draw a guard and one to slip past (a solo player waits for the gap). The heavy needs two for a quiet takedown (solo avoids). G1 and G11 can be handled by one player while the partner scouts. Guard count never changes with player count. A spotted player alerts guards within 12 m, the rest learn through panels. The idle partner watches a loop from a vantage, kills a light, or pings the next guard.

**Communication.** No partner radar (Chaos Theory tone). Name tags within 12 m. Pings show for all players for 6 s at any range. Voice is not in the world for the slice. Downed, reviving and ready have icons and sounds. Two players who cannot hear each other can finish with pings alone.

**Downed and revive.** Crawl a short way or wait, revive by hold (interruptible, no limit), both down restarts from the last checkpoint. Checkpoints are never mid joint move.

**Skill gaps.** A weaker player can ping, light and revive. Timing is forgiving (20 s latch, 10 s windows). Difficulty does not scale with player count. Drop-in and drop-out follow the existing co-op rules.

**Co-op playtest.** Friends with voice, strangers with pings only, one new and one expert, an on-purpose split, and a break-it run.

---

## Checklist status

**Stealth checklist.** Designed: the one-sentence pitch, goal orders, two routes per goal, a source for every lock, distinct zones, chokepoints and loops, guard bypasses, consistent guard reactions, hiding spots, safe hazard introduction, a quiet start, a twist and a finale, nine set pieces, soft failure. **Not yet done:** the five playtests, the "player can explain why they failed" check, the ideal-walk times (need the map), the sprint and timetable bots.

**Co-op checklist.** Designed: why two, goal mix, mid-mission update, marked points, short splits, landmarks, moves with ready signals, two solutions for the cage lock, paired patrols, downed rules, a joint failure that changes the situation. **Not yet done:** partner visibility, voice and failure rules are untested and no pair has played it.

---

## Build plan (Sonnet)

**D1: Map design (docs only, High effort).** Goal: design the campus map for this mission. Do: write the map as JSON (spaces, doors, links, toys, lamps and circuits, hide spots, guards and routes, objectives) and generate the SVG, PNG and tables from it, as for the Annex. Acceptance: ideal-walk time per chapter within 15% of the table (calculated from the scale sheet's gear speeds), 28 encounters listed with coordinates, at least 3 toys per chapter, the light map and rules L1 to L6 checked with evidence, guard roster and the active-guard cap (with the measured main-thread cost per guard on desktop), A1 to A5 checked on the nav grid, the sprint bot and timetable bot scripts written and run against the plan. Do not build any game code.

**M1: The spine.** Build the greybox from D1: chapters, locks, gates, objectives, radio lines, checkpoints, and the sprint and timetable bot tests. Hand check: play yard to cage once, then try to skip a gate and to sprint.

**M2: Lights, panels, guards and the twist.** Lamps, circuits, switches, panels, hide spots, guard loops, the escalation ladder, the 90 s event (with the fallback). Hand check: a lamp trap, a pair crossing, the blackout.

**M3: Co-op hooks and tuning.** Pings and revive, per-player checkpoints, breaker pair and sync takedown spot as inert markers. After the first friends playtest, wire them.

---

## Parked

Cameras, lasers, mines, guard flashlights, hanging and shimmying, rappelling, ziplines, steam valves, a sidearm while down, boost move, voice chat, surface-based noise, other missions.

## Defaults chosen (change any of these)

1. The roof is a branch (6A), not a mandatory chapter, so the spine stays linear.
2. The blackout is a scripted event with a radio-only fallback.
3. The only hard fail is a team wipe.
4. All 14 guards stay active on desktop. The cap is one named constant, set from a measured main-thread cost. Phone is a test device only.
5. Hanging and shimmying are parked, so pipes and ledges are walkable geometry.
6. Co-op joint moves are built as places now and wired after the first playtest.
