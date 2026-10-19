# course-ready S1 - walkthrough audit (Marlow Yard, `ctcourse`)

Read-only audit, 2026-10-19, branch `feature/course-ready` at master 4.7.5. Method: code and e2e harness reading only
(no build, no run). Coordinates: x east, z north, floor y 0; bay n starts at x0 = 22 (n - 1).

Severity: BLOCKER = the pair cannot finish; CONFUSING = they can but will likely get stuck or lost; MINOR.
Owner: course-ready = `src/world` (ctcourse, lights), `src/game/course`, their tests. `src/game/modes/courseMode.ts`
and `src/net` are in neither job's list: marked "course-ready (confirm)" or "orchestrator" below.

**Counts: 0 BLOCKER, 8 CONFUSING, 14 MINOR.** No station is impossible for a host + client pair. The worst problems are
the station 2 bolt and door prompts (F7, F8), the HUD that never names the task (F1), and the station 5 route out (F16).

Background facts that shape every finding:
- No bay has drills (`ctcourse.ts:160` `drills: []`), so nothing on the HUD names the station task, and each airlock
  cycles as soon as both players stand on its pad. The obstacle geometry is the only gate.
- Nothing in the course can down a player except friendly fire: laser and scanner costs stop at 1 HP
  (`jammer.ts:127`, `scanners.ts:19`), there are no guards, no fall damage (`movement.ts:139`). Restarts are rare.
- With a gun drawn, pad A reloads and is not interact (`F1A-CONTROLS.md` table; `WALKTHROUGH.md` known list).
- The CT door menu (A at a closed, unlocked door within 1.6 m, facing it) is hidden whenever any other interactable
  is the nearest item in reach (`gameState.ts:1030`, `1136-1143`).

## Start / airlocks / restarts / revive / end

**F1 - CONFUSING - the HUD never says what to do at a station (both).** With no drills the course HUD shows only
"S2 - objectives", one row "Both onto the A2 airlock pad" and an empty step line from the moment the bay starts
(`courseHud.ts:74`, `:79`). At stations 2-7 that row points at an airlock behind a wall. The task is only in LANTERN's
one-time bay line (`courseMode.ts` radio 'enter') and the optional panel. `CourseDef.objectives` exists and is
validated but nothing renders it (`courseDef.ts:120`, `:287`).
Owner: text course-ready; HUD line CT Core (`src/ui/hud/courseHud.ts`). Smallest fix: one objective line per bay in
`ctcourse.ts` (`objectives`, <= 90 chars) and `courseHud` shows the current bay's objective as the step text (and the
row name) when the bay has no drills.

**F2 - CONFUSING - no feedback when a station's gate opens (both).** Radio lines exist only at 'enter'
(`ctcourse.ts:140-149`); `CourseMode` already speaks lines keyed by gate id (`courseMode.ts:537`), but none are
defined. Unbolting (g-s2), the pocket (g-s3), the release (g-s4), the roof plates (g-s5) and the hack (g-s5-grid) are
silent. Owner course-ready. Fix: add `{ at: '<gate id>', text }` radio lines that name the next step (see F9, F12, F16).

**F3 - CONFUSING (rare) - a bay restart leaves a partner who is still up where they stand (both).** A restart
teleports the host to the checkpoint (`courseMode.ts:528-534`, `gameState.ts:1550-1572`) and revives a downed client
beside it, but an alive client is only brought back in Sector Ops (`coopHost.ts:1177`). Trigger: the host goes OUT
(revive window or revives used up) while the client is up (`coopHost.ts:334-340`). The bay's gates and doors relock
round the client: e.g. a client inside the station 5 annex when S5-door relocks cannot reach the roof, and the host
alone cannot open S5-door (pair plates). Way out today: pause, quit, "Start at bay N" in the lobby (`coopUi.ts:451-466`).
Owner: orchestrator (`src/net/coopHost.ts`). Smallest fix: `|| this.g.mode?.id === 'course'` on the partner-up branch
of `onRespawn`.

**F4 - MINOR - restart messages.** The host always reads "DOWN - Restarting the bay" (`courseMode.ts:697`), even when
it is the client who went out; the RESTART banner is host-only (`courseMode.ts:532`) and the client gets no restart
cue (`applyCourseWire` has none). Owner course-ready (confirm). Fix: banner names who is out; a restart counter in the
`course` wire that the client banners.

**F20 - MINOR - partner leaves.** The host alone can never cycle an airlock (2 needed, solo is dev-only). By design (G2);
quitting is the only way on.

No issues found in the airlock framework itself: automatic cycle, rear door shut and locked on both pages, front door
opens by itself, client revive of the host and the both-down restart are covered by `e2e-course` (courselab:
`scripts/e2e-course.mjs:179-199`, `:307-330`, `:388`). Revive window and countdown on the client: `e2e-ctcourse`
station 8. Exit both-in rule: `courseState.ts` `finishRefusal`, e2e lines 556-563.

**F5 - MINOR - "green pad" is ambiguous.** The airlock pad marking is `#2f6b4a` (`ctcourse.ts:223`) and so is the
station 3 blind spot (`ctcourse.ts:261`); panel 1 and radio 1 say "green pad"; the pad outline the mode draws is cyan
(`courseMode.ts:875`). Owner course-ready. Fix: another colour for the S3 pocket (or say "the airlock pad").

**F6 - CONFUSING (risk) - the e2e hides real-play paths.** `e2e-ctcourse` teleports between every step
(`:60-73`), presses devices with `it.onUse` directly (`:51`, so the nearest-item choice, the door menu and the
drawn-gun A rule are never exercised), never opens a course door, teleports onto every airlock pad through the shut
near door (`:522-526`), never walks roof -> annex -> airlock, makes the host invulnerable (`:541`) and always uses
the same roles: the client boosts (`:92`), climbs the relay, is thrown, hangs, climbs the rope. Untested in any
suite: host as the hanging / thrown / rope-climbing player, client as booster-climber at the bolt, thrower, holder.
The code is symmetric (`coopHost.ts:632-687`) and B4-CHECK:11 reviewed both thrower roles, but no run shows it.
Owner course-ready (tests; e2e waits are runner-owned, tell the orchestrator). Fix: a role-swapped pass of stations
2, 4, 5, 7 and one real door open per station.

## Station 1 - panels
No issues found. No gates (`ctcourse.ts:108-109`); the panel at (3.5, 13.6) is optional (`courseMode.ts` `isPanelId`);
the A1 pad (x 17-21, z 5-9) cycles with both on it. Covered: e2e lines 547-551.

## Station 2 - leg-up wall (x0 = 22)

**F7 - CONFUSING (high) - the bolt refuses players who are on its side.** The bolt's side test point is
x = 22 + 9 + 0.9 = 31.9 (`ctcourse.ts:114`), 0.9 m past the door leaf (x 31) and 0.4 m past the 1 m wall's far face
(x 31.5). A far-side player standing in the doorway or against the far face has feet x < 31.9 and reads "Bolted from
the other side" (`courseState.ts:245-246`) while standing on the bolt side. The e2e presses from x 32.2 (`:435-439`).
Both. Owner course-ready. Fix: test the door plane, `at: [bayX(1) + CT_OBST, ...]` (x 31), so any feet past the leaf
count.

**F8 - CONFUSING (high) - the "Unbolt" item hides the door.** The bolt item (`courseMode.ts:275-285`, kind 'door',
id `c-g-s2`, reach 1.6, at (31.9, 7.0)) is never disabled, and it suppresses the door menu (`gameState.ts:1030`).
Every far-side spot within 1.6 m of the door centre (31, 7) is also within 1.6 m of the bolt, so the far player can
never open S2-door; after unbolting, A there does nothing. On the near side the door menu shows only outside the
doorway (x about 29.4-30.3); one step into the 1 m doorway brings "Unbolt" back (a no-op after the unbolt).
Both. Owner course-ready (confirm, `courseMode.ts`). Fix: disable a bolt item when its gate opens and re-enable it on
`bayRestart`; with F7 move its point onto the door plane.

**F9 - MINOR - "they open the far door".** Panel 2 and radio 2 say the boosted player opens the door; unbolting only
unlocks it, nothing is said, and (F8) only the near player can open it. Fix: radio at 'g-s2' "Unbolted. Open the door
for your partner." with F8 fixed.

**F10 - MINOR (verify) - the climb-up prompt.** LOG.md:255-256 records empty ledge-grab / hang world prompts; no
station text mentions Y to pull up (stations 2, 5, 7). Owner CT Core (prompt), course-ready (text: "Y climbs up").

**F11 - MINOR (verify) - leg-up squares.** The striped squares sit at (x0 + 7.4, 7), 1.1 m from the wall face, in
front of the door and lintel (`ctcourse.ts` `mark` calls in the build loop); every verified leg-up is 0.5 m from the
face at z 3-3.6 (e2e `:431`, `:444`, `:336`). The prompt "Leg-up offered: no ledge in reach here" guides a miss.
Same at stations 5 (lip x 96.85, square 95.4) and 7. Owner course-ready. Fix: move the squares to 0.5 m from the face,
or check once on the square.

## Station 3 - camera (x0 = 44)

**F12 - CONFUSING - the pistol and the door.** The jammer needs the pistol drawn (`ctDevices.ts` `localStep`), but
players start on slot 0, the rifle (`playerWeapons.ts:92`): "Pistol out" means LB tap to the pistol, then X; panel 3
and radio 3 say neither. When the pocket opens S3-door, both have pistols drawn, so A reloads and the door menu does
nothing until they holster (X). No text says so. Both. Owner course-ready (text: `PANEL_TEXT[2]`, radio 3, a 'g-s3'
line "Door open. Holster (X) to open it."); the drawn-A rule is CT Core's (already a walkthrough question).

**F13 - MINOR - the jam is optional.** The pocket flag sets as soon as both alive players stand in it
(`ctDevices.ts:484`), whatever the camera saw; being seen only raises an alarm stage that never ends the run
(`ctDevices.ts:552-561`). The pair can walk in openly. Design call for Michael; not for the walkthrough.

**F14 - MINOR - pad-only words.** Panels and radio say LT and A (stations 3, 6) and "Co-op" without RB / F; a
keyboard player has Z (labelled "Knockout / secondary fire", `keyBindings.ts:54`), E and F. Owner course-ready. Fix:
"hold LT / Z", "A / E", "Co-op (RB / F)".

## Station 4 - laser and throw (x0 = 66)
Throw, landing past the band, far-side release and the band off on both pages: no issues (e2e `:233-283`,
B4-CHECK:9-11).

**F15 - MINOR - release placement unsaid.** The release is on the north fence at (78, 13.6), about 6.6 m left of the
landing (77, 7); panel 4 says "they hit the release beyond". Fix: "the red release on the left fence"; light it (S2).

**F21 - MINOR - walking through costs 15 HP a touch and never stops the run** (`jammer.ts:119-127`): a pair can walk
through and press the release. By design (Michael's "health hit").

## Station 5 - annex, relay, hang-down (x0 = 88)
Leg-up, relay, roof plates, hang-down, hack and pull-up: no issues as e2e roles (e2e `:444-461`, `:280-334`,
B5-CHECK:11; a player dropped into the back room can press the panel from the floor).

**F16 - CONFUSING - the way out after the hack is never told or tested.** The A5 airlock door (x 104, z 7) is in the
annex's back room. From the roof both must walk off the front lip (x 96.85, 4.4 m, no fall damage), open S5-door
(x 97), cross the front room, open the grid door (x 100.5) and reach the pad. Panel 5 and radio 5 stop at "hack"; the
e2e teleports from the roof to the pad. Both. Owner course-ready. Fix: radio at 'g-s5-grid' "Grid open. Off the roof,
in the front door, through the grid to the airlock." and the same tail on panel 5.

**F17 - MINOR - roof plates give no feedback.** Pair window 1.0 s (`config/course.ts` `PAIR_WINDOW`) with the plates
6.8 m apart; a lone press does nothing visible (`courseState.ts:670` `pressPair` returns no refusal). Fix: a refusal
"Partner: press plate B now" on a lone press, or "press on a count" in the label.

**F18 - MINOR - panel 5 text is about 150 characters** and its banner shows for 1.8 s (`courseMode.ts:320`); the
prompt while standing at the panel shows it in full. Fix: two sentences, or put the hatch part in the 'g-s5' radio
line.

**F22 - MINOR (known) - the holder can stay frozen after a lost-holder drop until B** (WALKTHROUGH known list,
POLISH B5). CT Core.

## Station 6 - paired scanners (x0 = 110)
No blockers: both pages see ready lights, sync, failure reset and the door (e2e `:382-410`, B6-CHECK:9-12). Text is
pad-only ("Press A", F14). Open question 4 in WALKTHROUGH (the finisher pays 10 HP if the partner never starts) stands.

## Station 7 - rope wall (x0 = 132)
No issues found: leg-up, rope offer, let-go slide, climb and top-out (e2e `:336-380`); a lone player on the far side
climbs back by the return stair (x 142-145, z 0.4-1.6, `ctcourse.ts:306-309`), so nobody is stranded. Untested roles:
F6.

## Station 8 - last wall and exit (x0 = 154)
No issues found: open doorway, no device (e2e station 8 asserts no console), revive inside 30 s, both-in exit zone
(x 165.5-169.5, z 3-11). The "lit zone" is lit only by the shared bay lamp at x 166.5 (`ctcourse.ts:216`): S2 item.

## Docs
**F19 - MINOR - stale descriptions.** `CTCOURSE-SPEC.md`'s "Placeholder now" column and Rules (three panels at
station 1, timed hold consoles at 3 and 8, "return paths are B2-B8 work") and the header of `scripts/e2e-ctcourse.mjs`
describe the B1 placeholders. Owner course-ready (spec; tell the orchestrator for the e2e header).

## Must-see places for the light pass (S2)
Existing lamps: per bay (x0 + 4, 5, 7) and (x0 + 12.5, 5, 7), radius 13, 0.9; station 3 (50, 3.0, 7) r 7; annex
interior (99, 3.4, 7) and (102.2, 3.4, 7) r 8 (`ctcourse.ts:210-216`, `262`, `283-284`).

| Place | Where (x, y, z) |
| --- | --- |
| Panels 1-8 (and their floor squares) | (x0 + 3.5, 1.4, 13.6); squares (x0 + 3.5, 0, 12) |
| Airlock A1-A7 pads and doors | pad x0 + 17..21, z 5..9; near door (x0 + 16, 7); far door (x0 + 22, 7) |
| S2 wall, door, bolt, leg-up square | wall x 30.5-31.5 top 4.4; door (31, 7); bolt (31.9, 0, 7); squares (29.4, 7), (32.6, 7) |
| S3 camera, blind-spot pocket, door | camera (52.6, 2.4, 7); pocket x 51.5-52.5, z 5.8-8.2; door (53, 7) |
| S4 laser band, squares, release | band x 75, z 4-10, y 0.35 / 0.9 / 1.45; squares (73.4, 7), (77.2, 7); release (78, 1.3, 13.6) |
| S5 roof lip and leg-up square | lip x 96.85, top 4.4; square (95.4, 7); leg-up spot (96, 3.6) |
| S5 roof plates | A (99, 4.4, 3.6); B (99, 4.4, 10.4) |
| S5 hatch and holder square | hatch x 102.125-102.675, z 1.0-1.55, y 4.4; holder square (102.4, 4.41, 2.3) |
| S5 hack panel, back room, grid door, medkit | panel (102.4, 1.2, 0.4); grid door (100.5, 7); medkit (103, 13.6); A5 near door (104, 7) |
| S5 front door and front room | S5-door (97, 7); room x 97-100.5 |
| S6 scanners and ready lights, door | A (115, 1.4, 0.4), B (115, 1.4, 13.6), glows y 1.95 / 2.25; door (119, 7) |
| S7 wall top, holder strip, square, stair | wall x 140.5-141.5 top 4.4; strip (141, 4.41, 5.5-8.5); square (139.4, 7); stair x 142-145, z 0.4-1.6 |
| S8 medkit, doorway, exit zone | medkit (156, 13.6); doorway (163, 7); zone x 165.5-169.5, z 3-11 |

Dark by intent (CT): the fence strips between stations away from the route (z < 2 and z > 12, except the panels,
scanners, release and medkits), the station 3 approach under the camera's sweep, and the corners of the annex front
room.
