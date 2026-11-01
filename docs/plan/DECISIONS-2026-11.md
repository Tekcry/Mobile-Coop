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
