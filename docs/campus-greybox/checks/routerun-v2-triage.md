# Route-run triage: Saltmarsh Park v2 (campusOps, bfe27e3f, code routes, 1 player)

Source: origin/route-run-results campusOps/bfe27e3f-20261026T0846..0849Z/route-run-log.json (no shots were published: publish.mjs commits the log and REPORT.md only, so evidence is the log's stop coordinates). Points are [x, y, z].
Why every stop says "link ?" / "unnamed place" / "Walked links: 0": `--routes code` builds walk steps with `link: null, space: null` (scripts/route-run.mjs:216-226) and no `--points`, so not a v2-graph mapping gap. Only climb legs are link steps (stubbed).
Several "stuck" runs still finished: S2-1, S3-1, S3-3, all three S4 and S5-3 reached the connector/extraction after the tool placed the robot past each stop.

## S2 (0/3 pass; run 1 reached C2, runs 2-3 never exited)
| Event | Class | Cause | Evidence |
|---|---|---|---|
| 0:37 could-not-follow, SW core G, runs 1+2 | B | The route point (-40.7,-23) sits on the line between the two 1.3 m flights. The robot starts on flight 1's open edge, slides off, and crouch-walks under the ramp (step boxes do not collide; the ramp underside is open at the side). It stops where headroom under the ramp reaches crouch height (z about -26.1) | stop (-40.84,0.02,-26.17); s2.ts:115, 133-147; levelBuilder.ts:227-238; s2Data.ts:163 pts[6]. S5's identical core was climbed by S5-3 (0:27-0:31, robot 0.1-0.3 m inside the flight) |
| 0:46 could-not-follow at the core door from inside: L1 (run 1), roof (run 2) | B | The four core doors are stacked at one (x, z). The driver's door tap picks `doors.nearest(x, z)` in 2D, gets the G door (already open), and never presses A | stops (-39.66,4.42,-22.91), (-39.66,12.32,-22.99); driver.mjs:369-372; doors.ts:383-396 |
| 1:47 could-not-follow, NE core down from roof, run 2 | B | Robot on the open inner edge of the upper flight (x 1.2, centre line 1.3). No spine between the flights | stop (1.2,11.13,3.56); s2.ts:116, 133-147 |
| 0:34 could-not-follow, feature stair top, run 3 | C | Stopped 0.34 m short of the mid landing on flight A, under a full alarm (camera alarm 22.8 s). No geometry fault found: the landing top (2.2) equals the ramp top and the atrium is open above | stop (-18.07,2.11,-12.76); s2.ts:155-161, 628-640 |
| locked kp-fac doors: west (-7.5,3) run 1 1:33; wing (-4,-1) runs 1-3 (1:48 / 2:03, 2:27 / 1:12, 1:36) | B | Keypad code s2-fac-code comes from the kitchen overhear box, which no route passes. The routes "assume the code"; the bot has no intel step | stops (-7.87,4.42,2.94), (-4.05,4.42,-0.64), (-3.92,4.42,-1.35); s2Data.ts:137-145, 151-153 |
| 2:15 / 1:25 "took too long": hack not finished, runs 2+3 | B | Cascade. The bot stood 8 s at the locked wing door in view, raising the alarm, and guards followed it into the office (e98 at (-4.9,1.3)). The same stand point hacked in 3.1 s in run 1. The bot holds A without picking the menu row (a guard row probably tops the A menu: gameState.ts:1505-1512) | stop (-6.28,4.42,2.92); log objectives done:false from:"point" |
| 2:48 / 1:57 locked C2 near door, runs 2+3 | B | Cascade: C2 opens only after the hack | stop (3.64,4.42,-13.88) |

## S3 (2/4 pass; the stuck runs 1 and 3 still reached C3)
| Event | Class | Cause | Evidence |
|---|---|---|---|
| 1:34 / 1:44 could-not-follow, north core flight 1 top (G to half landing), runs 1+3 | C | Same spot both runs, going up. Suspect: the invisible 0.2 x 0.15 top lip, about 0.1 m proud of the ramp. Step-assist (maxStep 0.42) should lift it, so this is unproven | stop (30.85,2.14,-2.33); s3Stairs.ts:61-67, 174-180; s3Kit.ts:104 |
| 1:44 / 1:54 could-not-follow, north core flight 2 mid (half landing to L1), runs 1+3 | C | Same spot both runs, mid-flight. No obstacle found in the code | stop (32.72,3.34,-3.56) |
Not a section blocker either way: loud (S3-2) and void (S3-4) pass, and every run went down the same core on the shared exit without a stop.

## S4 (0/3 pass; all three downloaded and reached C4)
| Event | Class | Cause | Evidence |
|---|---|---|---|
| 0:23 locked dockWest, runs 1+2 | B | Alarm stage 2 locks dockWest by design. Three camera alarms (14.3, 14.7, 17.8 s) fired while the bot crossed the dock in view; forgive mode does not undo alarm stages | stop (14.38,0.04,17.41); s4Data.ts:244; s4.ts:70, 522 |
| 0:45 locked kpBatt, run 1 | B | Keypad. The code (s4-codes) is on the dock board at (16,1.5,21.85), 4.6 m off the route; the bot never reads boards | stop (-3.65,0.02,18.41); s4Data.ts:224-231 |
| 0:59 locked hallBatt, run 1 | B | Alarm stage 3 lock | stop (-4.35,0.02,24.94); s4Data.ts:245 |
| 0:41 locked mantrap outer, run 2 | B | A pair gate, two players only by rule; the run used --players 1 | stop (7.64,0.02,20.49); s4Data.ts:240; sectors.ts:150-152 |
| 0:46 locked kp-riser, run 3 | B | Keypad (s4-codes from the dock board) | stop (34.35,0.02,46.49); s4Data.ts:224-231 |

## S5 (2/3 pass; run 3 reached extraction)
| Event | Class | Cause | Evidence |
|---|---|---|---|
| 1:13 could-not-follow in the archive, run 3 | B | kp-arch is locked (code on the kitchen rota board, off route), so the nav path went round it: service stair up to the roof (8.42 at 0:52), across, and down through the rooflight into the archive (0:64-0:66). After that unplanned drop the bot did not re-plan and stalled 8 s (since 64.65) | stop (-44.22,4.22,33.28); robot trail in the log's robotAt; s5Data.ts:127-133, 201-203; s5.ts:696 |

## Blockers to fix (A)
None found. No stop shows a human being unable to finish a section: every stuck run reached its exit after placement, and each section has a passing or completed route.
Needs one human walk to settle the C items (about 2 minutes each, any build with campusV2):
- S3: walk up the north fire stair from G to L1 at (32.6,-6.2): flight 1, the half landing, then flight 2.
- S2: walk up the feature stair (-18,-9) to the mid landing and on to L1.

Not blockers, but worth a ticket (map/game owners):
- Stacked doors and 2D `Doors.nearest` (game code): at an upper core door in S2 or S5 the door menu is empty (gameState.ts:1613-1614 picks the G door and fails its y check). The fallback item also reads its label from the G door (gameState.ts:1530-1532: "Close door" while the G door is open). The door still opens. Fix: an optional y argument to `Doors.nearest` that skips doors more than 1.2 m off, passed at gameState.ts:1530, 1613 and 3370. About 10 lines.
- S2 and S5 core flights look solid, but a crouched body fits under the ramp from the open side (s2.ts:567 and s5.ts:596 build non-colliding step boxes). Fix: one collide box under each G flight, or a 0.1 m stringer on the open edge. About 3 lines per core.
- S5 kp-arch can be bypassed solo: service stair to the roof, then down the rooflight into the archive.

## Tool gaps for Marlow Build (B)
1. Door tap and locked probe use 2D `doors.nearest` (driver.mjs:371, 864). Stacked core doors make the bot read the wrong floor's door. Pass y and skip doors more than 1.2 m off.
2. No keypad, intel or pair-gate step in code routes: the robot never reads a board, never stands in an overhear box and never enters a code, so every keypad door reports "locked". Grant the section's codes at the start of a code-route run (as the e2e teleports), or add an intel leg.
3. Pair gates (S4 mantrap) need --players 2. Skip or mark co-op routes at 1 player.
4. Forgive mode does not undo alarm stages, so stage locks (S4 dockWest, hallBatt) read as map stops. Reset the stage on forgive, or name the cause "alarm-stage lock".
5. No re-plan after an unplanned drop or placement (S5-3); the stuck clock fires on a stale path.
6. Steering hugs flight edges: route points on a dog-leg stair's centre line (S2 SW core) put the robot onto the open side. Snap stair legs to the flight's centre, or re-plan from the flight foot.
7. The objective hold presses A blindly. When a guard row tops the A menu, the hack never fills (S2-2, S2-3). Pick the item's menu row.
8. Report: "link ?" and "unnamed place" on every code-route stop (no space or link data for code routes; pass --points or print the route point index). The notes contradict themselves ("one robot ... --players 1" and "Two robots walked every run"). Camera alarms in S4 are credited to cam-gate, S1's camera 95 m away (s1Data.ts:152): fix the cause attribution in causes.mjs or driver rise.camera. Shots are not published, so triage has no pictures.
