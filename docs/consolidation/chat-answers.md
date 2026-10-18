# Michael's answers in chat, 2026-10-17 (consolidation run, after the vision-check page)

## Directive (verbatim)
"I want the game to be pure chaos theory. Anything that isn't a part of the original chaos theory shouldn't exist.

2 player coop campaign only, unable to be completed solo. We will research all the chaos theory coop levels, their design, flow, moves, etc., and recreate that experience.

We must get a working prototype working, only the basics required to make it work and functional to test features and gameplay. I don't want to spend hours or days fine tuning things that may not be used. Refinement can come later."

## Native multiple-choice answers (question -> Michael's pick)
1. Where does pure CT stop (IP rule)? -> "Mechanics plus look": also copy CT's visual style and HUD layout closely, with original art assets. (Not chosen: drop the IP rule.)
2. Mission 8 betrayal and Confrontation (CT co-op has no traitor finale)? -> "Drop it": no traitor, no player-versus-player finale.
3. Training bunker (Fallow, not CT)? -> "Keep it": keep Fallow as the co-op tutorial even though CT has none.
4. Kestrel (designed as a solo slice)? -> "Decide after research": paused until the CT co-op level research is done.
5. Music direction? -> "Decide in music job".
6. Voice (CT is fully voiced)? -> "Text now, voice later": text and subtitles for the prototype; lines written to be voiceable.
7. Friendly fire, heavies and similar details? -> "The research decides": whatever CT co-op does; earlier answers on these are replaced by the findings.
8. Deleting phone / touch code, old maps, Wave, deathmatch, free-for-all (and Hunter, later excepted)? -> "In this merge".
9. Work flow? -> "Main is the only base": one branch per job from main, one PR each, only Michael merges; ct-movement and dev retired.
10. Merged version? -> "4.0.0".
11. Preview sites? -> "One chosen preview": live game plus one test copy showing the job branch Michael chooses.
12. Authority? -> "You, then decisions": Michael, then docs/DECISIONS.md, then the bible, then job and map docs, then code; every decision also written into the bible.
13. Job method? -> "Prototype, then orchestrator".
14. Helper models? -> "Opus, light for chores".
15. Decisions storage? -> "One decisions file": docs/DECISIONS.md; old job files stay as history and point to it.
16. Roadmap? -> "Ordered job list" in the progress file (CT co-op research, prototype, then the rest).
17. Goggles under "mechanics plus look"? -> "Original goggle": no three-lens look.
18. Retired map docs and Blacklist-era docs? -> "Archive the docs"; their tests are deleted with the code.
19. Manual checklist? -> "Short current list": one desktop checklist plus a release checklist; old lists archived.
20. Versioning after the merge? -> "Set at merge": Unreleased until merged, one minor step per merged job, fixes as patches.
21. Bunker next? -> "After the prototype": drills rebuilt on CT moves, every jump and reach re-checked.
22. Bunker anti-stuck resets? -> "Keep the resets".
23. Boost skips in the bunker? -> "Marked boost spots": boosts work only at marked spots, as CT's co-op spots do.
24. Bunker open approvals (exceptions, design calls, 42 technical)? -> "Defer to rebuild".
25. Menus and HUD look? -> "Keep Arkham plan": menus stay Arkham Knight style; only the in-game HUD follows CT.
26. Wren's height? -> "Keep 1.68 m": reword the story line.
27. Site names and open story items? -> "Decide with missions".
28. Operators' remaining items? -> "On its own branch": master records only realistic operators, Wren and Moth.
29. Movement run's 62-item review list? -> "Void it": superseded by the CT prototype.
30. Kestrel's 26 review items? -> "Defer with Kestrel".
31. 11 technical audio and co-op items? -> "Approve as written".
32. Housekeeping and remaining menu-plan calls? -> "Approve, menus later": housekeeping approved; menu calls decided in the menu job.
33. Arsenal? -> "CT kit only": one rifle with attachments (sniper, shotgun, launcher), one pistol with a light / electronics disruptor, the knife; other guns removed in the clean-up; gadgets and attachments are CT's set, researched.
34. Grab finish? -> "CT grab menu": grab first, then knock out, kill or interrogate; no selector.
35. Hunter mode, tri-rotor drone, custom difficulty sliders (not CT)? -> Michael typed: "Remove all except hunter mode." (Drone and sliders go; Hunter stays.)
36. Missing sounds? -> "After the prototype": guard footsteps first afterwards, then ambience, then the rest.

## Derived from the directive (Claude listed these as settled in chat before the questions; Michael then asked only the open ones)
Goggles: night, thermal, electro, instant cut in CT order, CT grain, thermal as CT. CT draw timings. Marksman scope with hold breath as CT. Loadouts Stealth / Assault / Recommended. Wall medkit stations only, no carried kits. CT door menu (open, stealth open, bash, optic cable). No stance or gear HUD icons; objectives in the menu. CT's exact pad layout. Operators move the same (one CT set). No prone crawl, no rope climb. Solo / 3-4 player / bot questions settled (two players only). Tally and Sexton become radio crew. Menus, music revision, art guide and Kestrel floor plans wait until after the prototype. Order: CT co-op research, then the prototype, then the rest.
Overturned page answers: VIS-03 (Hunter returns: still stands, Michael's exception), CTRL-09 note (selector: replaced by CT grab menu), ART-08 (drone: removed), STEALTH-11 (custom difficulty and alarm tolerance: removed with the sliders; CT fixed difficulties), COOP-02 and STEALTH-04 note (friendly fire, heavies: the research decides).

## Unclear items U1-U9 from the DECISIONS draft (native multiple-choice, 2026-10-17)
- U1 operator rules: "Operators branch" (master records only realistic operators, Wren and Moth; replaces page ART-01).
- U2 name ban: "Title ok, quotes kept" (character, gear, organisation names scrubbed; "Chaos Theory" may name the reference; Michael's quotes stay verbatim).
- U3 / U4 emotes and the old solo Training mode: "Delete both" (in this merge).
- U10 extra guns (CT kit only), drone, custom difficulty sliders, carried medkits: "In this merge".
- U5 bunker friendly fire: "Research decides".
- U6 training D41 map rule: "CT research replaces it" (D41 binds only the bunker).
- U7 Kestrel Mission 1 size in the bible: "No, wait".
- U9 the nine waiting ideas: "Keep only CT ones" (the research keeps what CT has; the rest are dropped).
- U8 lobby and mission-card questions (UI-04 to UI-06): not asked; covered by chat answer 32 (menu calls decided in the menu job).
