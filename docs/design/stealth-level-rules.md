# Stealth level rules - Night Shift

26 rules for a small, replayable stealth map. Each has the rule, why, and a check you can run on a plan. Numbers use `scale-sheet.md`. Research was 8 web searches plus design knowledge (Chaos Theory, Thief, Dishonored, Hitman, Deus Ex, Metal Gear Solid); where a search found nothing specific, the rule rests on that general knowledge and says so.

## A. Observe, plan, act

1. **Every route has a safe vantage point.** A shadowed spot from which the player sees a guard's whole loop before committing. *Why:* the loop is "learn, then act"; without watching there is only trial and death. *Check:* each guard is visible from at least one dark vantage, at least 8 m from the guard's path and out of its view cone.
2. **The first screen teaches.** The spawn shows one guard and one light in the first 10 seconds without danger. *Why:* Hitman's playtests found a steep first-level curve until guidance improved. *Check:* from every spawn, one guard and one lit pool are visible, and no guard can see a spawn.
3. **Show the rules in the world.** Light is the only cue for hiding (light meter, lamp pools, torch beams). *Why:* readable cones and a clear light gauge are the genre's base. *Check:* a lit pool has a visible lamp or torch source; no invisible light.

## B. Patrols

4. **Loops of 25 to 45 seconds.** *Why:* short enough to learn in one watch, long enough to give the player a window. *Check:* every guard loop period, waypoints plus dwell, is 25 - 45 s at the guard's walk speed (0.75 - 0.9 m/s).
5. **Fully deterministic.** Same start, same loop, same timing every run unless the player changes something. *Why:* learning is the progression. *Check:* no random waypoint, dwell or direction in the sheets.
6. **Readable tells.** Footsteps, torch beam, a throat clear or door sound a few seconds before a guard turns a corner. *Why:* the player must predict, not guess. *Check:* each guard has two tells that start at least 2 s before they enter a hide-spot's view.
7. **At least a 3 second safe window per loop** at each choke point. *Why:* the game is fair only if a plan can fit inside the gap. *Check:* for each route hop, the window is 3 s or more at gear 3 stand (2.0 m/s) or the hop is under 6 m.
8. **Crossing routes make a timing puzzle.** Two guards cross a junction at different times so one window closes when another opens. *Why:* this is the game of reading patterns, not walking past. *Check:* at least one junction where two loops overlap and the safe gap exists only 1 time in the combined cycle.
9. **One stationary watcher with a narrow view.** A post guard or sniper that never moves, whose cone covers one route. *Why:* a fixed obstacle that tests light and angle, not timing. *Check:* the cone is under 60 degrees wide or one long line; a dark flank exists.
10. **Guards pause where they can be watched.** Dwell 3 - 6 s at checkpoints (a clipboard, a door check, a lamp check). *Why:* the pause is the window and the readable moment. *Check:* every loop has at least one pause of 3 s or more in a spot visible from a vantage.

## C. Light and shadow

11. **Lit pools are danger, dark is safety, and the player controls the switch.** *Why:* Chaos Theory's core, and lights guards react to when switched or shot. *Check:* at least 4 lamps, each switchable at a panel or shot, and a route that is only possible after one goes dark.
12. **Every guard has light near them and a dark flank.** *Why:* the player always has a shadowed way to approach. *Check:* within 6 m of every waypoint there is a dark cell at least 1.2 m wide reachable without crossing a pool.
13. **Objective sites sit in shadow, or the player can make them dark; the approach crosses light.** *Why:* the objective is a calm moment, and the lit approach is the test. *Check:* each objective is under the dark threshold, or a light switch within 10 m walk or a lamp shootable from cover within 15 m darkens it; the shortest path to each crosses at least one lit pool. (Revised 2026-10-10, Michael: O1 stays lit.)
14. **Lights off has a cost.** Guards investigate a dead circuit; it is not free. *Why:* a choice, not a cheat. *Check:* each circuit has a guard reaction listed and a duration of the investigation.

## D. Hiding and cover

15. **A hide spot or dark pocket every 8 m or less on every route; no straight run over 12 m.** Recesses, lockers, pillars, trays, cable racks. *Why:* the player must always have somewhere to go when a guard turns. *Check:* walk each route; measure the gap to the next cover and the longest straight.
16. **Hide spots fit the camera.** 1.2 m wide, 1.0 m deep, 1.2 m high or taller, opening away from the guard's path. *Why:* the camera sticks in smaller niches (scale sheet 2). *Check:* every niche meets those sizes.
17. **Bodies have somewhere to go.** A dark, low-traffic place within 10 m of every guard's patrol. *Why:* the drag-and-hide verb must matter. *Check:* the number of dark body spots per guard is at least 1, and no body spot lies on a patrol loop.

## E. Doors, flow and routes

18. **At most 8 doors on main routes, 12 in total; none are door-after-door.** Single doors 1.2 m, wide openings and double doors on main routes. *Why:* play was only opening doors. *Check:* count; at least 5 m of open floor between doors along any route.
19. **A door exists only where it matters:** locked, keyed, vent, fire stair, or a body-hide room. *Why:* a door with no choice is friction. *Check:* each door has a listed purpose in the asset audit.
20. **At least three different routes per objective:** fast and risky, slow and safe, skilled or hidden. *Why:* choice is the game. *Check:* every chapter has at least one alternative that differs from the main route for at least 50 percent of its length between that chapter's entry and exit choke points (an alternative spanning several chapters is measured over all of them); shorter variants are allowed if each bypasses at least one guard sightline or lit area; every choke point has a bypass; no dead end without a reward. (Revised 2026-10-10, Michael.)

## F. Learning, pacing, co-op, realism

21. **Learning is the reward.** Shortcuts that open when found, intel on guard schedules, alternate exits; a second run is faster. *Why:* Hitman's mastery and Dishonored's hidden paths. *Check:* at least three discoveries; at least two of them save 15 s or more over the best main route for a player who knows the level; the third is a deliberate safe, slow route.
22. **Pacing:** easy opening, rising pressure, climax at the objective, calm exit; recovery after being spotted is possible. *Why:* a run has an arc. *Check:* at least one guard is visible from the start vantage; no guard detects a player standing still at spawn within 90 s (the awareness meter never reaches 1); a hide spot exists within 10 m of every alarm trigger. (Revised 2026-10-10, Michael.)
23. **Co-op helps, never gates.** Every teamwork gain has a slower, noisier or riskier solo version; no simultaneous actions required; four players fit without queueing at one door. *Why:* the guard count never changes with player count, so the map must work for 1 and for 4. *Check:* each co-op row in the plan has a solo row; each choke point is 2.0 m wide or has two paths.
24. **Landmarks first, for the phone.** Each space has one colour or shape landmark and the objective has a lit sign. *Why:* a small screen and touch controls forgive less. *Check:* a screenshot from each space names the space in 2 s; no required precision under 0.5 m.
25. **Security logic explains the map, gameplay wins every conflict.** Guards walk the asset, the entrances, the control room and the round checkpoints; armed guards have a reason; pairs versus solos is chosen on purpose. *Why:* real guard tours use risk-based checkpoints, and the ones that vary routes stay unpredictable; but a game wants learnable loops, so the game fixes them. *Check:* each guard has one sentence of "why here"; each pair has a gap in coverage of at least 3 s.
26. **Entry and exit are believable and change with play.** At least two ways out; the alarm, bodies, lights and route taken change which exit is open or safe. *Why:* the mission's consequences are felt at the end. *Check:* two exits plus a rule for how each one's guard or light state changes.
27. **The camera never fights the route.** The third-person boom has room everywhere a route goes. *Why:* a camera that pushes into the player's head in a tight spot hides the guard the player is timing. *Check:* along every route, at standing and crouch height, the shoulder ray and the full boom (the engine camera's offsets) hit no wall, door frame, rail or prop; link ends that have their own camera preset are exempt within 1.5 m. (Added 2026-10-10, Michael.)

## Checklist (yes/no)

- [ ] Each guard visible from a dark vantage (1)
- [ ] Spawn view teaches and no guard sees a spawn (2)
- [ ] Every lit pool has a visible source (3)
- [ ] Loops 25 - 45 s, deterministic (4, 5)
- [ ] Two tells per guard (6)
- [ ] 3 s safe window per hop (7)
- [ ] One crossing timing puzzle (8)
- [ ] One narrow-view watcher with a dark flank (9, 12)
- [ ] Pauses of 3 s or more at visible spots (10)
- [ ] 4 or more switchable lamps; reactions listed (11, 14)
- [ ] Objectives in shadow or a switch or shootable lamp in reach, approach through light (13)
- [ ] Cover every 8 m, no straight over 12 m, niches 1.2 x 1.0 x 1.2 (15, 16)
- [ ] Body spots off patrol loops (17)
- [ ] 8 doors on the main route at most, 12 total, 5 m between doors, each justified (18, 19)
- [ ] Each chapter has a 50% different alternative between its chokes; shorter variants bypass a sightline or lit area; bypass at each choke, rewards in dead ends (20)
- [ ] Three discoveries that save 30 s or more (21)
- [ ] A guard visible from the start, no detection at spawn within 90 s, recovery possible (22)
- [ ] Each co-op action has a solo alternative; no mandatory simultaneous action (23)
- [ ] Landmarks and 0.5 m tolerance (24)
- [ ] Guard "why here" and pair gaps (25)
- [ ] Two exits that change with play (26)
- [ ] Camera boom clear along every route, standing and crouched (27)
- [ ] Scale sheet sizes used (corridor 3.5 m, door 1.2 m, spacing rules)

## Sources

- [Guard Tour Best Practices (CalSAGA)](https://calsaga.org/the-californian-2026-q1-guard-tour-best-practices-for-crowded-venues-stadiums-malls-events/) - risk-based checkpoints, route rotation
- [31 Areas for Guard Tour Checkpoints (TrackForce)](https://www.trackforce.com/resources/blog-articles/31-areas-to-consider-when-placing-your-guard-tour-checkpoints/)
- [CCTV control rooms (Avigilon)](https://avigilon.com/blog/cctv-control-rooms) and [Human factors in CCTV control rooms (CPNI)](https://CPNI.gov.uk/system/files/documents/aa/e6/human-factors-in-CCTV-control-rooms-a-best-practice-guide.pdf) - operator fatigue, link to officers on foot
- [Level Design in HITMAN: Guiding (GDC Vault)](https://gdcvault.com/play/1023849/Level-Design-in-HITMAN-Guiding) and [The making of Sapienza (PC Gamer)](https://pcgamer.com/the-making-of-sapienza-hitmans-best-level/2)
- [Level Design Techniques in Dishonored 2 (Ulster)](https://blogs.ulster.ac.uk/b00860009-fad/files/2023/02/Level-Design-Techniques-in-Dishonored-2.pdf) and [GameBanshee Dishonored review](https://www.gamebanshee.com/x886)
- [Chaos Theory retrospective (Bit-Tech)](https://bit-tech.net/reviews/gaming/pc/ten-years-on-chaos-theory/1/) and [Chaos Theory co-op notes (Guinness World Records)](https://www.guinnessworldrecords.com/world-records/549102-first-video-game-to-feature-a-fully-stealth-based-co-op-mode)
- [Procedural stealth level generation (McGill)](https://www.sable.mcgill.ca/~clump/papers/xu-14-generative.pdf) - patrol timing, vision cones
- [Collision-aware cameras (Game Developer)](https://www.gamedeveloper.com/programming/accurate-collision-zoom-for-cameras) - camera needs margin beyond the blockout

Gaps: no source for Thief, Deus Ex or Metal Gear Solid level structure; those points come from general knowledge.
