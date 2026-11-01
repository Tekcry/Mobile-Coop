# CT core feel job - plan (2026-10-18; goal changed by G179)

**Goal now (G179):** phase 1 pure-CT movement (the areas below, built once), then phase 2 the Fallow bunker rebuilt as
CT's co-op training level, playable start to finish by two players. Pumphouse Nine and C1-C7 in `PLAN.md` are
replaced by phase 2 below. G180: if CT had it, we use it.

The job plan for the core feel job (G150). `PLAN.md` in this folder is the whole prototype plan from the research
(movement M1-M4, co-op C1-C7); this file is how the core feel job runs inside it.

Goal: CT movement, camera and aim, back-to-wall and doors, palm strike and grab, goggles on Wren (both players) until
Michael signs off each area as "feels like Chaos Theory". Co-op slices C1-C7 come after (`PLAN.md`).

Sources, in authority order: Michael > `docs/DECISIONS.md` (G25-G41, G96-G103, G107, G109, G110, and G124-G160 from the
research, merged 2026-10-18) > the bible > `docs/archive/locomotion/PROTOTYPE-PLAN.md` (P1-P4) and
`docs/research/ct-movement/ct-measure-*.md` > code. Research facts in `docs/ct-research/moves-mechanics-digest.md`
sections 2-3; its "findings for Michael to confirm" are not decisions.

## Step 0 - code review (done)
`REVIEW.md`. Michael's picks: camera core rewrite; wall and doors adjust, pad tables rewrite; adjust the rest
(`DECISIONS.md`).

## Areas (in order)
| Area | Contents | Decisions | Needs Wren |
| --- | --- | --- | --- |
| A1 Body | Turn follow (M1 note 3, `A1-TURN-FOOTAGE.md`: turn rate by speed, planted feet follow the body, pivot leftovers and crossing guard); tense sneak crouch near guards at slow crouched speeds (G160); M1 leftovers: first full stride, frozen stance on the wire; posture | G25-G27, G32, G33, G40, G107, G109, G160 | posture and G160 by eye |
| A2 Camera and aim | Manual camera, no automatic swing, lead room or recentre (G159); framing about 1.8 m, head centred; rigid follow; no zoom; strict corner peek (G137): tighten the wall-peek camera, the old plan's 1.0-1.5 m into the hidden space shows too much; draw / lower timings; shoulder swap only aiming; no aim assist | G16, G17, G28, G29 (swing replaced by G159), G38, G103, G137, G159 | no |
| A3 Wall, doors, pad layout | CT pad layout (research gives the co-op layout: co-op action, A interact, B crouch, Y jump, LT secondary, RT primary, X equip, quick inventory, Back mission device, D-pad vision; back-to-wall on L3); wall entry by button; shuffle 0.35 m/s; peek at once (camera per G137); lean-out and SWAT turn out; door menu (open, stealth open, bash, optic cable); guards close doors; 15 % threshold | G18, G19, G34-G37, G41, G52, G96, G97 | hand poses |
| A4 Strike and grab | Palm strike drops every guard in one hit, no exceptions (G155: no heavies or dogs; armour comes with alarm stages, not here), recovery about 1.4 s; grab first, then knock out / kill from the grab menu | G23, G42 (as replaced by G155), G43, G155 | poses |
| A5 Goggles | Instant cut thermal, electro, night, off; CT grain and thermal; goggle on the brow when off; each player's goggle lamp its own colour as the partner beacon (G135; CT used blue for player 1, red for player 2), no partner marker | G73, G99-G102, G135 | brow mesh |

Michael's M1 notes apply first: A2's manual camera (round A2.1), then A1's turn follow (A1.1), then the tense crouch.
The held pistol jammer (G152) is kit work after core feel, unless it touches the pistol draw in A2.

## Per area
- Implementer: Sonnet, medium (G158, Michael's "quicker prototype"). Report `docs/ct-prototype/<AREA>.md`. Checks:
  `npm run check`, area e2e on port 4193.
- Co-op parity every area: remotes pose from MoveState, no rubber-banding; a wire change bumps `PROTOCOL_VERSION` once
  per change set (now 17 here; feature/anim-cleanup uses 18 for its left-shoulder bit, so this branch's next wire change takes 19).
- Prototype pass first (Michael, 2026-10-18): each area built once, light checks (see RULES), stop after each area for a
  short play (keep, change or drop), notes in `LOG.md`. Tuning and Wren posture in a second pass after all five areas.

## Dependencies
- Wren (feature/operators, G123): no PR open yet (2026-10-18). Logic goes first; posture and pose work wait for it.
- The menu job owns menu screens and the menu scene.

## Phase 2 - the co-op training bunker (G179, G180)
The Fallow bunker (`src/world/maps/bunker*.ts`, the `course` mode, `docs/archive/training/`) rebuilt as CT's co-op training
level on the pure-CT moves (G78, G79: every jump and reach re-checked; G80 resets kept; G117 its own map rules; G130
heightened moves; G151 team moves anywhere with room). CT's drill order (moves-mechanics digest, "Training order (M0)";
levels digest 2.1): read panels, leg-up over a wall, jam a camera, partner throw over a laser, leg-up plus ledge relay,
hang-down to hack, paired scanners, the two-person rope. Drills for removed moves (sprint, SWAT, lean-out, quick 180)
go. Slices, each built once, two-player e2e, pushed to `/ct/`:
| Slice | Built | Model |
| --- | --- | --- |
| B0 Survey | Read-only: what the bunker has today vs CT's drill list, which drills go, which moves exist in code, reach heights | Sonnet |
| B1 Shell | Two tabs into the bunker, player cap 2, both must reach the exit, per-player goggle lamp colour (G135), CT pad co-op action | Sonnet |
| B2 Leg-up and ledge relay | Existing boost and human ladder renamed and re-checked on CT moves, anywhere with room, prompt names the move | Sonnet |
| B3 Held jammer | Pistol jammer held on a camera, charge drains, stand still (G152); the EMP goes | Sonnet |
| B4 Partner throw | Throw over the laser, far-side release | Opus (sync) |
| B5 Hang-down hack | Lower the partner head-first, hack while hanging | Opus (sync) |
| B6 Paired scanners | Two-key sync with a forgiving window | Opus (sync) |
| B7 Two-person rope | Partner climbs the held rope (G180, replaces G110 for this move) | Sonnet |
| B8 Revive and finish | 30 s revive, two per mission (G126), both extract (G138), wall medkits by difficulty (G180) | Opus (sync) |

### Phase 2 after the B0 survey (Michael, 2026-10-18)
Michael: relay "CT hanging ladder", other bays "Park behind a flag", level "Fresh compact level", fail cost "Health hit
(CT)". So the CT training course is a NEW compact level (`ctcourse`, original names), laid out like CT's obstacle course
with 8 stations in CT's order; the old Fallow bunker is parked behind a dev flag (not deleted). It follows the bunker's
own map rules (G117, training D41) and a short spec from `docs/templates/map-spec.md`. Slices (replace the table above):
| Slice | Built | Model |
| --- | --- | --- |
| B1 Spec and greybox | Spec `docs/ct-prototype/CTCOURSE-SPEC.md`; greybox of 8 stations plus start and exit, panels, two players start, both must reach the exit (G138), wall medkits by difficulty (G180), the course mode points at it, Fallow behind a flag; two-page e2e `scripts/e2e-ctcourse.mjs` | Sonnet |
| B2 Leg-up and CT relay | Leg-up on co-op action (brace removed), CT hanging-body ledge relay | Sonnet |
| B3 Jammer, camera, laser | Held pistol jammer on a camera (EMP removed), laser device; touching it costs health plus a radio line | Sonnet |
| B4 Partner throw | Throw over the laser, far-side release | Opus |
| B5 Hang-down | Lower the partner head-first, hack while hanging | Opus |
| B6 Paired scanners | Two-key sync, forgiving window; a failed hack costs health (CT) | Opus |
| B7 Two-person rope | Partner climbs the held rope | Opus |
| B8 Revive and finish | 30 s revive, 2 per mission, both extract, end screen | Opus |
