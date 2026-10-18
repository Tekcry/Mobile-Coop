# CT core feel job - plan (2026-10-18)

Goal: CT movement, camera and aim, back-to-wall and doors, palm strike and grab, goggles on Wren (both players) until
Michael signs off each area as "feels like Chaos Theory". Co-op slices C1-C7 come after (research branch
`docs/ct-prototype/PLAN.md`).

Sources, in authority order: Michael > `docs/DECISIONS.md` (G25-G41, G96-G103, G107, G109, G110) and the 2026-10-18
picks in `docs/ct-research/DECISIONS-PENDING.md` (research branch, PR #4) > the bible >
`docs/locomotion/PROTOTYPE-PLAN.md` (P1-P4) and `docs/locomotion/research/ct-measure-*.md` > code.

## Step 0 - code review (read-only, one Sonnet agent, about an hour)
Player controller, move state, animation graph, camera, wall and doors, strike and grab, goggles, and their co-op wire
fields. Output `REVIEW.md`: rewrite clean or adjust per area. Michael picks per area before any build.

## Areas (in order)
| Area | Contents | Decisions | Needs Wren |
| --- | --- | --- | --- |
| A1 Body | M1-FEEDBACK item 2 (tense tiptoe crouch near enemies) plus M1 leftovers: speeds, starts, stops, turns, roll; posture; the frozen stance on the wire | G25-G27, G32, G33, G40, G107, G109 | posture only |
| A2 Camera and aim | M1-FEEDBACK item 1 first (no automatic camera movement); framing about 1.8 m, head centred; rigid follow; no zoom; strict corner-peek; draw / lower timings; shoulder swap only aiming; no aim assist | G16, G17, G28, G29 (swing part replaced), G38, G103, D-14 | no |
| A3 Wall, doors, pad layout | CT pad layout (back-to-wall on L3); wall entry by button; shuffle 0.35 m/s; peek at once; lean-out and SWAT turn out; door menu (open, stealth open, bash, optic cable); guards close doors; 15 % threshold | G18, G19, G34-G37, G41, G52, G96, G97 | hand poses |
| A4 Strike and grab | Palm strike one-hit on every human guard, recovery about 1.4 s; grab first, then knock out / kill from the grab menu | G23, G42, G43 | poses |
| A5 Goggles | Instant cut thermal, electro, night, off; CT grain and thermal; goggle on the brow when off | G73, G99-G102 | brow mesh |

Michael's M1 notes apply first: A2's no-auto-camera change and A1's tense crouch.

## Per area
- Implementer: Sonnet, medium. Report `docs/ct-prototype/<AREA>.md`. Checks: `npm run check`, area e2e on port 4193.
- Co-op parity every area: remotes pose from MoveState, no rubber-banding; a wire change bumps `PROTOCOL_VERSION` once
  per change set (currently 14).
- Stop after each round for Michael to play. Sign-off: commit, push, notes and numbers in `LOG.md`.

## Dependencies
- Wren (feature/operators, G123): no PR open yet (2026-10-18). Logic goes first; posture and pose work wait for it.
- The menu job owns menu screens and the menu scene.
