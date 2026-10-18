# CT core feel job - plan (2026-10-18)

The job plan for the core feel job (G150). `PLAN.md` in this folder is the whole prototype plan from the research
(movement M1-M4, co-op C1-C7); this file is how the core feel job runs inside it.

Goal: CT movement, camera and aim, back-to-wall and doors, palm strike and grab, goggles on Wren (both players) until
Michael signs off each area as "feels like Chaos Theory". Co-op slices C1-C7 come after (`PLAN.md`).

Sources, in authority order: Michael > `docs/DECISIONS.md` (G25-G41, G96-G103, G107, G109, G110, and G124-G160 from the
research, merged 2026-10-18) > the bible > `docs/locomotion/PROTOTYPE-PLAN.md` (P1-P4) and
`docs/locomotion/research/ct-measure-*.md` > code. Research facts in `docs/ct-research/moves-mechanics-digest.md`
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
  per change set (currently 14).
- Prototype pass first (Michael, 2026-10-18): each area built once, light checks (see RULES), stop after each area for a
  short play (keep, change or drop), notes in `LOG.md`. Tuning and Wren posture in a second pass after all five areas.

## Dependencies
- Wren (feature/operators, G123): no PR open yet (2026-10-18). Logic goes first; posture and pose work wait for it.
- The menu job owns menu screens and the menu scene.
