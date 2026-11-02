# Night Shift - mission template (the recipe)
Owner: the orchestrator. Status: current (draft from the planning run, 2026-11-02).

How every mission (and the Marlow Yard rebuild) is designed: master brief section 8, plus the parts of
`docs/level-design.md`, `docs/design/scale-sheet.md` and `docs/templates/map-spec.md` that still hold. Where those
three differ from Michael's 2026-11 decisions, the decisions win; this template replaces them once Michael approves it
(CLAUDE.md: the level standard and template change only with his approval).

## Pipeline (never skip a step)
1. **Story and stakes** (half a page): why tonight, what is at stake, what Wren and Moth each want, the one twist, the
   banter beats, the emotional note, "what is unusual tonight" (one opportunity, one complication).
2. **Building brief:** a real place with a real purpose, who is there tonight and why it is quiet, real dimensions;
   every security device has a real reason; every weak spot has a fiction cause that can be a story beat.
3. **Beat chart** in minutes (table below).
4. **Ingredients checklist** (below).
5. **Connectivity graph and top-down plan** (routes, splits, lookouts, checkpoints).
6. **Guard sheet** (table below).
7. **Michael's one-click sign-off** on a one-page plan plus a 5-line intent check.
8. **Greybox:** Test Chamber look, real lamp positions and real darkness. Walk it with no guards first, then guards.
9. **Playtest rounds** (`PLAYTEST-KIT.md`) until the exit criteria pass; fix the top 3 issues per round.
10. **Only then:** art pass, lighting polish, audio, music, banter polish.

## Beat chart (one row per beat)
| Minute | Beat | Co-op type (parallel / step-by-step / simultaneous) | Who does what | Real reason it needs two | Other way through | If it fails | Tension 1-5 |
|---|---|---|---|---|---|---|---|

Shape: a gentle co-op opening; a small team moment every 2-4 min; a set piece every 6-10 min with 30-90 s calm after;
one twist at 40-60%; a joint climax; an exit under 2 min or by a different route. Co-op types alternate; simultaneous
is a peak, not the default. Never three tension 4-5 stretches in a row. A mission is 3-5 steps of 2-5 minutes, 20-30
minutes for a good pair.

## Ingredients checklist
- One action both do at once; one "cover me while I work"; one place only two bodies can reach.
- Three wow moments (a big two-person move, perfect timing together, a story reveal), each passing five tests:
  spectator, agency, mutual need, readability, retell.
- One intel step that is used (a code, a route, a person); one optional goal found by exploring, with an in-world lead
  on or one step off the main path.
- Light sharing: one kills or holds a light so the other moves, then swap.
- Beat minimums: hold-and-pass 3, free-move traversal 3, authored set piece 1, split-and-sync ending in a two-key
  action 1, protect-while-act 1, information asymmetry 1, double-drop chance 1, parallel route with a merge 1.
- Dependencies: at least one two-body, one protect-while-act, one reach objective.
- At least one vertical route that needs a team move.
- At most one new mission toy, used 3+ times with rising difficulty; earlier toys reused.
- No signature set piece shared with another mission.
- At most one joint approach choice (D12): both must agree, it changes the route and play, not the story.

## Space rules
- **Entry vantage** at each area: dark, out of every guard's view for the whole patrol cycle, room for two, every
  guard visible within one cycle, at least 70% of the floor visible. The final area is seen early.
- **Routes:** 2-3 ways across each room or yard (shadow, high, team move, tool or intel); routes cross at least once
  and rejoin at a pinch point; line of sight can be broken within 5 s; a dead end only for a payoff, at most 15 m.
- **Splits** end at a clear meeting point within about 3 minutes (legs within 20% of each other, each with an
  overwatch spot; a downed partner reachable within 15 s). Shared links at least 2.0 m wide.
- **Blocked spots:** a way past can be seen or worked out within 2 minutes; the solution is visible from the problem.
  Anything that could leave the mission unwinnable has 2+ cues or is recoverable.
- **Checkpoints** at area starts and before set pieces, in the dark, out of guard view; at most about 10 minutes lost.
- **Level bounds:** clear edges and landmarks; nobody climbs out of the playable area.
- Quiet connectors glimpse the next space; lit critical-path exits, a dark alternative visible from them.

## Guard sheet (one row per guard)
| Guard | Job tonight | Routine (cycle, stops) | Moment alone | Covers / covered by | Pair for a double drop? | Light they come to fix |
|---|---|---|---|---|---|---|

- 2-5 guards per area, hand-placed; **never spawned**. An alarm makes the guards already there tougher and more alert.
- Patrols like clockwork: 25-45 s cycles, 3-6 s stops, 3-8 s gaps. No more than 4 sight cones overlap one spot; every
  patrol shows its back to the dark route within 20 s.
- Bodies get found; every search area has a hiding spot; guards search where they last saw you, never where you are.

## Light, sound and devices
- Every light has a visible source and a switch; a lit chokepoint has two ways to darken it, or a route around.
- Machines show on and off; a lit window exposes anyone in it.
- Quiet and loud versions of the same action side by side; harmless noises sound harmless; a sound warns before a
  hidden state returns (a laser grid coming back on).
- Shared device screens show input prompts, who is ready, and any device timer.
- A soundscape note per area (what is heard, what covers noise).

## Rules for every mission
- One stealth ruleset everywhere (light, sound, sight, alert states); no one-off detection rules in set pieces.
- Never trigger an event from one player's position alone: gate on both players or on world state.
- Every two-person requirement has a real-world reason (a two-key safe, a heavy shutter, a high window).
- Both players always have something to do; a story moment for one means play for the other.
- No escort missions, no hidden timers (soft windows only), no instant fail on detection, no forced kills.
- Up to 2 mission rules, signposted; breaking one restarts the section (Michael, round 6).
- Every two-person action works with pings alone, shows each player's ready state, and is tested on pad and keyboard.
- Every mission is testably 100%-able: no kills, no alarms, every primary objective.

## Sizes (still valid; measured on the old camera, re-check in Phase 3)
Corridors 3.5-4.0 m; play spaces at least 6 m; doors 1.2 x 2.1 m; storey 3.3 m; crouch duct 1.2 x 1.5 m; cover
every 8 m; no step between 0.40 and 0.45 m; stepping stones 4-8 m apart. Team-move bands: throw gap 2.7 m (4.9 m only at
named spots), rope 2.2-6.0 m, ledge relay lips 4.3-4.6 m, shutter gap 0.9 m. Source: `docs/design/scale-sheet.md`.
