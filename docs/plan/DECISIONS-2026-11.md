# Night Shift - Michael's decisions since the 2026-11-01 refresh
Owner: the orchestrator. Status: current.

The decisions Michael made from 2026-11-01 on, newest last, until Phase 1 writes the new short decisions file. They
replace any older entry in `docs/DECISIONS.md` (frozen at G434) that they contradict; authority order: `CLAUDE.md`.
Decisions the orchestrator assumed while Michael was away are on the control panel issue ("Assumed decisions"), not here.
The live state is the pinned control panel issue.

## 2026-11-01

**N1. Clean up this project, do not start fresh** (native multiple choice, after his full two-player playthrough).
- Keep: Marlow Yard, 2 players only, light and shadow, guard AI, gadgets, night vision / thermal, all co-op team moves,
  the campaign / mission system (simplified), paired knife kills, the Anim Studio, the phone test launch, the Kestrel
  editor (to become the whole-game level editor), the dynamic music system and its generator.
- Players and guards switch to the Mixamo character and Mixamo animations; Wren's model stays for the main menu hero only.
- Remove: Saltmarsh Park, Sector Ops entirely (its maps, menu, stars, 4 players), the storm mill / piano scene,
  hand-made and CMU animation (when the Mixamo switch lands), custom guard models, the old modes, progression and
  cosmetics, the Fallow bunker, the music / sound / weapon labs, the desktop automation (auto-merge, watchdog, test
  queues).
- Stages A-J and what comes after: `docs/plan/CLEANUP-PLAN-2026-11-01.md`.

**N2. Clean-up calls (step 4).**
- The campaign stays preview-only on the live site for now.
- Infiltration goes with Hunter and the legacy modes.
- The paired knife kill is the lethal takedown everywhere; grab and knockout stay; the scene-only rules are dropped.
- The Anim Studio becomes the "Test Chamber": joinable in co-op to test everything two-player; the animation tuner
  works only there. All end-to-end test suites move onto it, then the Warehouse and Proving Grounds go.
- The Test Chamber look (lit as the real level) is Michael's minimum bar for greybox levels.
- Tallow Wharf is removed later; Mission 1 is a fresh design; whether its engine is the trimmed Sector Ops engine or the
  Marlow Yard course engine waits on the vision.

**N3. Internet co-op is high priority right after the clean-up.** His playthrough: the room was not listed in public,
the room code failed (both on VPN too), and the partner had to remote-desktop in. The job: master brief Appendix B.

**N4. Keep the process simple.** One main session that he talks to; helpers report back to it; at most one side
session at a time in its own area; no automation, merge trains, test queues or watchdogs. GitHub CI is the test
machine; locally only quick, targeted tests.

**N5. The master brief** (`docs/plan/MASTER-PLAN-PROMPT.md`, PR #732) runs the project: phases 0-12 to a Steam release
with a Friend's Pass; state lives on the pinned control panel issue.

**N6. Build the Test Chamber out now** (native multiple choice) into a facility that can run every kept test suite,
before the Warehouse and Proving Grounds are deleted, accepting extra sessions before the co-op fix. Declined: keeping
both maps hidden as test-only maps until after the vision.

**N7. The Test Chamber layout rule.** Michael: "No absolutely do not just move those maps in, just update the existing
test chamber to include types of activities or guards that you need. I don't want it to be bigger than it needs to be,
but must be able to test everything. Should continue to look the same as it is also, unless where you need to test
light/dark."

**N8. Local tests may use the laptop's dedicated GPU, in the background only.** Michael: "I approve you using the laptop
GPU if it results in quicker, more accurate testing." and "Make sure I retain full control of the computer at all times,
and all your work is kept in the background." Browser tests run headless (never a visible window, never
`E2E_HEADED=1`), through the installed Edge with `E2E_GPU=1` (Playwright's own Chromium does not start on this Windows
build).

**N9. Mark the old rules, vision and decisions as replaced now** (native multiple choice), not only at the Phase 1
rewrite: this file, the "history" status on `docs/RULES.md` and `docs/VISION.md`, the freeze note on
`docs/DECISIONS.md` and the new read-first list and authority order in `CLAUDE.md`.

**N10. The rope-window and roof-vent tests get a new small booth** (native multiple choice): a separate 3 x 3 m block,
4.4 m tall, with a glazed window under its own rope and a ceiling vent from its roof. The existing team block stays
exactly as it is. Declined: hollowing out the team block. Layout: `docs/plan/TEST-CHAMBER-SPEC.md`.

**N11. The Test Chamber may be rearranged.** Michael: "I want to keep the rooms look but I don't mind if you move things around, so long as there is sufficient room in the middle like it currently is to test animations, which also has clear lighting. You can change lighting elsewhere as needed." Props may move; the open, clearly lit middle for animation tests stays; lighting outside the middle may change.

**N12. No assumed rules.** Michael: "Don't assume any additional rules. If you need to ask and clarify, do so first."
Anything his words or decisions do not settle is asked (native multiple choice) before it is acted on; the master
brief's "assume reversible decisions while he is away" no longer applies to rules or design limits.

**N13. The old assumed decisions, settled by Michael** (native multiple choice): the internet co-op fix runs after
clean-up stage I; Tallow Wharf and its Sector Ops engine stay until the Mission 1 engine is decided; the co-op lobby has
one "Test Chamber" option; the hold-menu knife-kill gap is settled by switching context prompts on for everyone (N14).

**N14. One game, one branch.** Michael: "Nothing is happening with the master version, i use the preview as master.
Should we just update the master to the current state, and delete all other branches and start again with branches?
There's too much scattered across the GitHub, I don't want Claude to get confused with old outdated information
constantly." Decided: master is the only build, with every feature the preview switched on now on by default (context
prompts included); the preview, CT and Kestrel copies of the site go and old preview links forward to the main game;
every other GitHub branch is deleted, with no backup (all merged work is on master and every pull request keeps its
final version); each job branch is deleted when it merges.

**N15. More settled calls** (native multiple choice): the Test Chamber wall texture is left for now; the playthrough
bugs stay in `docs/backlog.md` item 32 for their phases; the map id `studio` is renamed to the Test Chamber inside the
code right after the Test Chamber steps; the Test Chamber work stays in separate tested steps; the co-op version is
raised with each change that alters co-op messages.

**N16. The separate music session waits for the vision** (native multiple choice): it starts after the clean-up, when
Phase 1 sets the sonic identity.

**N17. The Test Chamber's dark area and practice guards** (native multiple choice): the dark test area is a side room
off the east wall, behind a door, in the same look as the main room (the main room is unchanged; the Test Chamber gets
about 8 m wider). Passive practice guards: three ordinary guards (two side by side with their backs to the player, one
facing), present in co-op Test Chamber games and the solo main-menu Test Chamber start (not in the automated tests);
a guard taken down comes back at his spot about 10 seconds later once nobody is standing there. Michael on the guards:
"there should be a passive guard or guards as needed to test animations, unless it's already included in the anim
tools."

**N18. Slim the guard play-test move (G2d) to essentials** (native multiple choice, reviewing whether every step is
needed): only the core guard tests move to the Test Chamber - seeing, hearing, search, bodies and co-op guard sync; the
detailed tests for systems later phases will rework are dropped (restorable from git history). Kept as planned: the
internal rename, stages H and I, the co-op fix after I, and stage J. The keep / drop list was shown before G2d was built
(merged in #743).

**N19. Overnight work while Michael sleeps** (native multiple choice, 2026-11-01/02): a choice his decisions do not
cover takes the orchestrator's recommended option and is listed on the control panel for his morning review; G2d is
built from the N18 definition; each change merges to master when all checks are green; the laptop stays awake.

**N20. Overnight safety net** (2026-11-01/02): a one-off restart was scheduled for 03:00 in case the overnight session
stopped, standing down if the panel or a worktree had changed in the last hour. At the next logical stage the
orchestrator tells Michael so he can clear the session; with no reply in 10 minutes work carries on in the same session.

**N21. One-game follow-ups** (native multiple choice, on #740): fast map loading (`mapReady`) is on by default; nothing
is kept from the old preview save (start fresh); new unfinished features default on (`?flag=0` turns one off).

## 2026-11-02

**N22. Free Roam is removed** (native multiple choice): both the solo menu row and the co-op lobby choice; the Test Chamber
covers free testing.

**N23. The five parked maps are deleted in stage H** (native multiple choice): Embassy, Mansion, Port, Refinery and Dust
Depot; git history keeps them.

**N24. The co-op relay is Metered's 500 MB free trial** (native multiple choice): no card, never charged.

**N25. The relay login goes in the game code for now** (native multiple choice): the repository is public, and the worst
case is the 500 MB being used up, at no cost. It is replaced when Steam networking or short-lived logins come in.

**N26. Host leaving** (Michael; parked - "Don't bother with the leave job yet"): "when the host actually leaves a coop game
with another player, it should also remove the other player and tell them the host has left the game. If the host drops out
for any reason, ie internet connection or crash, and they havent exited using the pause menu, then it should allow them to
rejoin as per normal. Leaving via the quit button in the pause menu should prevent the re-join or re-host option to appear."

**N27. Always merge when green:** every pull request merges once all its checks pass.

**N28. The planning run web-checks only what Phase 1 rests on** (native multiple choice): the facts behind the Phase 1
decisions (engine, Steam Deck, Friend's Pass, music, licences) are checked now; everything else when its phase arrives.

**N29. Deep research into Hazelight's co-op games** (A Way Out, It Takes Two, Split Fiction, plus Brothers). Michael: "I
approve deep research into hazelight. I think this will be a critical step to making a fun and unique 2 player coop
game." Result: `docs/research/hazelight-2026-11/`.

**N30. Stay on Babylon.js** (native multiple choice, provisional; final after the Phase 2 kill criteria). Michael asked
which engine lets Claude Code build the game from start to production, as his priority is work: Babylon.js is all plain
text that Claude writes, runs and tests by itself; Godot means a rewrite and some editor work; Unreal and Unity need a
person in their editors.

**N31. Plan for the Target campaign: prologue + 7 missions** (native multiple choice, provisional; final after the
Mission 1 slice shows the real cost per mission). Reason: room for the whole story; CT's top complaint was a short
campaign.

**N32. Platforms: Windows on Steam first, Steam Deck as a goal** (native multiple choice): the Deck is promised only once
tested on a real Deck; Mac and Linux later or never; phones for test launches only; the browser build stays for
development and tests.

**N33. The Chaos Theory footage in the repo is removed** (native multiple choice): 30 comparison sheets under
`docs/ct-prototype/shots/g8` held CT game footage beside our frames; our own frames stay; git history keeps the old
files. Reason: not publishing another game's art beside ours before a commercial release.

**N34. Wren and Moth have the same abilities; roles come from the situation** (native multiple choice, after the
Hazelight research): A Way Out's model; each team moment gives the players different jobs by where they stand or what
they carry, and the jobs alternate; personality comes from banter. Declined: a few fixed personal moves; new powers each
mission (breaks the one stealth ruleset).

**N35. A recurring music theme carried as sound and rhythm** (native multiple choice): a short signature sound or rhythm
returns in every mission, the menu and the big moments; still no hummable tune (music direction v3 stands). Reason: It
Takes Two's score had no recurring theme and did not stick.

**N36. The ending is written in Phase 1** (native multiple choice), with its early hints, so Mission 1 can plant them; it
stays co-operative, never player against player. Replaces "decide with the missions" (STORY-04) for the ending only.
Reason: Hazelight fixed the start and end of Brothers and A Way Out before production.

**N37. Hitman-style interaction with people and the world** (Michael: "I would like the characters to interact with
other NPCs and the world similarly to hitman world of assassination. I like how the contextual system works."; then
native multiple choice): context actions on people and objects (one button does the right thing: open, use, sabotage,
hide a body, question someone); overheard talk that opens opportunities (a code, a route, a chance); world tricks
(cut power, break a pipe, start a machine, stage an accident, throw something to pull a guard). Missions have 1-3 unarmed
staff with routines who react and can be avoided, questioned or used; harming them costs rating. Declined: disguises,
crowds.

**N38. 20-30 guards per mission** (native multiple choice). Michael on vision v3: "I feel like the overall guard count of
2-5 per area count is low. Where is this number derived from? For a game about being a stealth operative, there's not
many people to sneak past." The 2-5 per area was his own round-2 answer after the playthrough (Sector Ops felt
overpacked); now about a Chaos Theory co-op level (about 22 across a map), typically 3-6 in an area, more in set
pieces, plus 1-3 staff; stated as a mission total. Declined: 30-50 per mission; no fixed range.

**N39. The scope tiers are approved** (native multiple choice): `docs/plan/SCOPE.md` (Must / Should / Could / Parked).

**N40. Pillar 6 is "Sound and music"** (native multiple choice): the score is planned and protected from the start.

**N41. The ending is "Two switches"** (native multiple choice; `docs/plan/ENDING-DRAFT.md` A): with the radio jammed,
Wren holds the control room and Moth the roof generator, each the other's eyes by pings; the last press is the same
two-key "both ready" action they learned on night 1; Moth, drawn to light, turns the city back on. Declined: "Carry";
"The radio comes back".
