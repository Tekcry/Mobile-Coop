# Night Shift - decisions

Started 2026-10-17 (consolidation run, M26 / M27). Current to G360 (2026-10-25).

This file is the single source of Michael's current decisions for Night Shift. Authority order: `CLAUDE.md` (G86).
Every entry below is also written into the bible and, where it changes the summary, `docs/VISION.md`; where the bible
and this file disagree, this file wins until the bible is fixed.

How entries are numbered:
- G1, G2, ... are new global numbers, used from now on. The orchestrator folds ROADMAP "Decided" in daily with the next
  free G numbers (`docs/RULES.md` "Sessions"), rewriting DECISIONS, the bible and VISION together (G344).
- A replaced entry keeps its original text and gets a "(Replaced by Gxxx, date)" note on its heading or first line, so
  the newest entry always wins and the trail stays readable; an entry that still holds in part gets "(Narrowed by
  Gxxx)" instead.
- Old job numbers are cited in brackets with their run prefix, because the runs reused the same letters: loco (docs/archive/locomotion/DECISIONS.md: D1-D11, M1-M27, A0-A89), training (docs/archive/training/DECISIONS.md: D1-D50, A1-A77, C1-C10), ops (feature/operators docs/operators/DECISIONS.md: D1-D33; current ones recorded as G123 and G161-G176), menu (docs/menu-ui/DECISIONS.md: MD1-MD20), audio (AS1-AS18 in the audit), kestrel (docs/kestrel/progress.md "Decisions by Michael" and ASK rows).
- Question ids (VIS-01, FU-04, ...) are the vision-check page questions of 2026-10-17; "chat N" is Michael's Nth native
  multiple-choice answer in chat the same day; "directive" is his written directive the same day.

The old run decision files (docs/archive/locomotion/DECISIONS.md, docs/archive/training/DECISIONS.md, the kestrel progress decisions,
docs/menu-ui/DECISIONS.md and the audio progress logs) are history. They point here.

Each entry: the decision as a rule, then Michael's words quoted verbatim (his picked option label, his own note, or his
chat words), then the source and what it replaces.

## The vision

`docs/VISION.md` is the one-page summary of today's game (pitch, modes, Michael's overrides of CT, the hard rules). Read
it first; this file holds the reasons and the trail.

## Decisions by area

### Vision and pillars

**G1. Pure Chaos Theory.** The game is pure Chaos Theory (CT): anything that is not part of the original CT does not
exist. CT behaviour, measured from Michael's footage and the research, overrides every doc where they differ. Michael:
"I want the game to be pure chaos theory. Anything that isn't a part of the original chaos theory shouldn't exist."
(directive, 2026-10-17; extends loco M20 from movement to the whole game; replaces bible pillars and sections where they
differ.)
(Narrowed by G126, G135, G138, G146, G147, 2026-10-18, and by every later decision of Michael's that departs from CT:
`docs/VISION.md` section 3. Pure CT stays the default.)

**G2. Two-player co-op campaign only.** (Replaced for Sector Ops by G308, 2026-10-23: Sector Ops is 1-4 players with
solo play; the campaign stays exactly 2.) The campaign is played by exactly two players and cannot be completed solo.
Michael: "2 player coop campaign only, unable to be completed solo." (directive, 2026-10-17; settles FU-01; replaces
page answer VIS-01 "Coop campaign first. 2 players maximum.", the bible's solo-first pillar and the 2-4 player wording
of bible 5.9 and loco D8.)

**G3. Recreate the CT co-op levels.** All CT co-op levels are researched (their design, flow and moves) and that
experience is recreated. Michael: "We will research all the chaos theory coop levels, their design, flow, moves, etc.,
and recreate that experience." (directive, 2026-10-17.)

**G4. Working prototype first, refinement later.** (Replaced by G288, 2026-10-24: refining is allowed, paced by the walk
cap.) Build only the basics needed to make a feature work and test it; no hours or days of fine tuning on things that
may not be used. Michael: "We must get a working prototype working, only the basics required to make it work and
functional to test features and gameplay. I don't want to spend hours or days fine tuning things that may not be used.
Refinement can come later." (directive, 2026-10-17; extends loco M22.)
(Replaced by G150 for movement, camera, back-to-wall, doors, palm strike and goggles, 2026-10-18.)

**G5. IP rule: mechanics plus look.** The IP rule stays. CT's mechanics are matched and its visual style and HUD layout
are copied closely, with original art assets; names, characters, story, logos and UI art stay original. Michael:
"Mechanics plus look" (chat 1, 2026-10-17; bounds the bible IP rule and loco M20's "mechanics and feel are matched, never
assets or names"; the option to drop the IP rule was not chosen.)

**G6. No reference names anywhere.** Reference-game names (the hero, his gear, organisations) appear nowhere: not in
code, UI, specs, docs or research notes. Michael: "Banned everywhere" (VIS-06, 2026-10-17; replaces the research-notes
allowance in loco docs). The title may name the reference and Michael's quotes stay verbatim (G114).

**G7. Hunter is the one non-CT mode; drone and difficulty sliders removed.** Hunter mode is kept (its code is not deleted)
and comes back later. The tri-rotor drone and the custom difficulty sliders are removed in this merge (G115). Michael: "Remove all except
hunter mode." and "Only Hunter returns" (chat 35 and VIS-03, 2026-10-17; replaces page answers ART-08 "Bring drone back"
and STEALTH-11 "Alarms count too"; FU-05 and FU-13 settled; replaces loco D7's custom difficulty sliders and loco A31,
A32, A72, A73, A74, and the kestrel 2026-10-11 modes entry.)

**G8. Wave stays history; no team-versus-team mode.** Wave Survival does not return. The old Mission mode does not come
back as team-versus-team attack and defend. Michael: "Only Hunter returns" and "No" (VIS-03, VIS-04, 2026-10-17;
replaces the kestrel 2026-10-11 modes entry and backlog item 26.)

**G9. No traitor, no player-versus-player finale.** Mission 8 has no traitor and there is no Confrontation or other
player-versus-player finale. Michael: "Drop it" (chat 2, 2026-10-17; settles FU-02 and STORY-02; voids page answer
STEALTH-05 "No, front shoves" and the Confrontation part of AUDIO-09; replaces bible 5.15's traitor finale and the
"Bible 5.15 3-player traitor" row.)

**G10. The bible is rewritten now.** The bible follows the current decisions now; numbers are marked as starting values,
tuned after Michael plays the prototype. Michael: "Rewrite it now" (VIS-02, 2026-10-17.)

**G11. The nine movement-run ideas: only CT ones survive.** (Replaced by G180, 2026-10-18: the five ideas CT has stay;
G335, 2026-10-25, adds paired patrols and high-route lookouts.) Of the nine ideas (guards relight lamps, paired
searches, a last-known-position marker, eavesdropping, adaptive music and the rest), the CT co-op research keeps those
CT has; the rest are dropped. Michael: "Backlog, decide later" (VIS-05), then "Keep only CT ones" (U9, chat, 2026-10-17;
loco BIBLE-PROPOSALS 1-9.)

### Platform and performance

**G12. Deletions happen in this merge.** Inside this consolidation, before the merge request opens, delete: the phone and
touch code, the touch test, the retired maps (the 1934 Exchange, Trunk Annex, Dead Line v1 and v2) and the Wave,
deathmatch and free-for-all code, docs and tests. Hunter is excepted (G7). Michael: "In this merge" (chat 8 / FU-04),
"Delete code in merge" (PLAT-01), "Delete now" (PLAT-03, LEVEL-07), "Delete completely" (COOP-05) (2026-10-17; replaces
loco M21's "removed in a later cleanup" and loco A65, A66, A67.)

**G13. Tests run as a desktop.** Automatic tests switch from phone emulation to desktop with controller, keyboard and
mouse when the phone code goes, which is in this merge (G12). Michael: "When phone code goes" (PLAT-02, 2026-10-17.)

**G14. Performance goals set to the laptop's numbers.** The performance goals are rewritten to today's target-laptop
numbers. Michael: "Lower the goals" (PLAT-04, 2026-10-17.)

**G15. Editor phone launcher kept, no new work.** The level editor keeps its phone launcher as a dev tool, with no new
phone work. Michael: "Keep, no new work" (PLAT-05, 2026-10-17.)

### Controls

**G16. No aim assist.** No aim assist on any input. Michael: "None, like CT" (CTRL-02, 2026-10-17; replaces "light, touch
only" aim assist.)

**G17. Shoulder swap only while aiming.** The shoulder swap works only while aiming; the exploring camera swings by
itself. Michael: "Nothing (CT)" (CTRL-03, 2026-10-17.)
(Replaced by G159 for "the exploring camera swings by itself", 2026-10-18.)

**G18. Back-to-wall on L3.** Back-to-wall goes on L3, as in CT; A stays for doors and other actions. The exact CT layout
(G96) governs. Michael: "Back to wall" (CTRL-04, 2026-10-17.)

**G19. Door actions from a pop-up list.** At a door a CT-style list offers the door actions (see G97). Michael: "Pop-up
list" (CTRL-05, 2026-10-17.)

**G20. Medkits only at stations in the map.** Health comes back only from stationary medkits placed in the map. Michael:
"Stationary medkits within the map only" (CTRL-06, 2026-10-17; replaces loco A55; details in G98.)

**G21. Holstered rules approved, CT style.** A mission starts holstered; swapping while holstered picks the gun the next
aim draws; a swap button works while aiming; grenades and gadgets work holstered. Buttons follow the exact CT layout
(G96). Michael: "Approve" with the note "Pure CT style." (CTRL-07, 2026-10-17; approves loco A41.)

**G22. Remap capture cancels with Menu / Start or Esc.** B stays bindable. Michael: "Menu/Start or Esc" (CTRL-08,
2026-10-17; approves menu MD13; replaces loco A69.)

**G23. CT grab menu, no selector.** The player grabs first, then chooses knock out, kill or interrogate from CT's grab
menu. There is no stealth / kill selector. Michael: "CT grab menu" (chat 34, 2026-10-17; replaces page answer CTRL-09
"Add a kill input" and its selector note; voids FU-07 and FU-08; replaces loco A70.)

**G24. Emotes deleted.** Emotes are deleted in this merge (code, bindings, tests); their pad button (View held) and keys
(J, K, L) are free. Michael: "Unbind until return" (CTRL-10), then "Delete both" (U3 / U4, chat, 2026-10-17; replaces the
CTRL-10 return.) See G116.

### Movement and camera

The numbers in G25-G36 are starting values: Michael tunes them by hand (G356).

**G25. Turning as the footage shows.** On-the-spot turns are a tight walking circle; run reversals are one smooth turn of
about 0.4 s; no planted pivot. Michael: "The footage" with the note "Pure CT" (MOVE-01, 2026-10-17; replaces loco M20 Q7's
step-turn on the spot and loco A88's planted pivot.)

**G26. Stops freeze mid-stride at every speed.** The feet freeze mid-stride at every speed; from a run the body slides up
to about 0.3 m. Michael: "Freeze at every speed" with the note "Pure CT" (MOVE-02, 2026-10-17; replaces loco M20 Q2's
braking step at run and the bible's braking step.)

**G27. Ease to idle after about 1.7 s.** After a stop the frozen stride holds about 1.7 s, then eases to a feet-together
idle. Michael: "Ease after 1.7 s" with the note "Pure CT" (MOVE-03, 2026-10-17; replaces the 3.2.0 "hold until you move"
approval.)

**G28. CT camera framing.** The exploring camera sits closer (about 1.8 m), the head at screen centre, the legs partly out
of frame. Michael: "CT framing" with the note "Pure CT" (MOVE-04, 2026-10-17; replaces the bible's whole-body framing.)

**G29. CT camera behaviour.** Rigid follow, a gentle swing toward travel, no bob, no zoom when aiming. Michael: "CT
camera" with the note "Pure CT" (MOVE-05, 2026-10-17; replaces loco D5.13's spring, look-ahead, corner swaps and speed
zoom.)
(Replaced by G159 for the gentle swing toward travel, 2026-10-18.)

**G30. Modern layer: only what CT shows.** Keep only start lean, head look-at, hands on doors and ledges, feet on stairs
and faster vaults from a run. Michael: "Only what CT shows" with the note "Pure CT" (MOVE-06, 2026-10-17; replaces the
rest of loco D5 and the loco M17 step-22b items.)

**G31. Sprint-only moves removed.** The fast ladder climb, fast rappel descent, small gap hops and sprint door bashes are
removed. A door bash survives only as a door-menu choice (G97). Michael: "Remove them all" (MOVE-07, 2026-10-17; replaces
loco A15.)

**G32. Roll on held crouch.** Holding crouch while running rolls; a tap just crouches. Michael: "Hold crouch (CT)"
(MOVE-08, 2026-10-17.)

**G33. No special quick 180.** A stick flick turns the operator round in about 0.4 s while walking, as in CT. Michael:
"Normal flick turn" with the note "Pure CT" (MOVE-09, 2026-10-17; replaces the bible quick 180 and loco M17's quick 180.)

**G34. Wall entry by button only.** Michael: "Button only" (MOVE-10, 2026-10-17; approves loco A83.)

**G35. Wall slide is the CT shuffle.** About 0.35 m/s, a little slower at the lower speed settings. Michael: "CT shuffle
0.35 m/s" (MOVE-11, 2026-10-17; replaces loco M14 (3)'s 0.9 m/s and loco A84.)

**G36. Wall peek at once.** Peek as soon as the operator reaches the edge while pushing. Michael: "Peek at once (CT)"
(MOVE-12, 2026-10-17; replaces the 0.25 s push in loco A84.)

**G37. One wall move.** Kestrel's own wall hug is cancelled; the CT back-to-wall is the only wall move; the Kestrel toolkit
step keeps the optic cable. Michael: "One wall move" (MOVE-13, 2026-10-17; replaces ct-toolkit.md 3.1 and kestrel V1's
wall-hug half.)

**G38. Same camera height for every operator.** The camera is tied to the shared body capsule, so maps read the same for
every player. Michael: "Same for everyone" (MOVE-14, 2026-10-17.)

**G39. The movement run's 62-item review list is void.** The 62 rows (39 technical assumptions, 22 struck rows, 1 implied;
MOVE-16-1 to MOVE-16-62) are superseded by the CT prototype. Michael: "Void it" (chat 29, 2026-10-17; replaces page
answer MOVE-16 "Show me the list".)

### Stealth and AI

**G40. CT silent speed bands.** The two slowest standing and the three slowest crouched speeds are silent. The level
rules (level-design Section 12), Kestrel timings and sensor rules are re-checked. Michael: "CT bands" with the note "Pure
CT" (STEALTH-01, 2026-10-17; replaces "four crouched silent" and loco A88's noise thresholds.)

**G41. Guards close doors behind them.** Guards close doors on a calm patrol and notice any door open that should be shut;
one 15% threshold for light, sound and sight. Michael: "Close behind them" (STEALTH-02, 2026-10-17; replaces the 5% light
cut in code and loco A25.)

**G42. Palm strike knocks out human guards.** The palm strike is a one-hit knockout from any side on every human guard;
dogs cannot be palm-struck. How heavies are handled follows the research (G49). Michael: "Every human guard" with the
note "Everyone except dogs and heavies. Heavies cannot be hit with a palm strike." (STEALTH-04, 2026-10-17; the heavies
part is replaced by chat 7, G49.)
(Replaced by G155 for heavies and dogs, 2026-10-18.)

**G43. Ground takedown grabs first.** The ground takedown button grabs, then knock out, kill or (later) interrogate (G23);
drop, ledge, window and pipe takedowns keep tap / hold. Michael: "Grab first (CT)" (STEALTH-06, 2026-10-17.)

**G44. Guards see poorly above them.** A player well above a guard is hard to spot, as in CT. Michael: "Limited up-down
view" (STEALTH-07, 2026-10-17.)

**G45. Glass rule.** Clear glass passes light and sight; frosted glass and blinds pass light only; thermal never sees
through glass. Michael: "Clear sees, frosted not" (STEALTH-08, 2026-10-17.)

**G46. Awake limit reviewed for desktop.** (Replaced by G187, G254 and G289: Sector Ops caps at 32 alive; elsewhere as
many guards as realistically possible, limited by the measured guard cap.) The 12-awake-characters limit is reviewed
against desktop performance, without phone limits. Michael: "Review this limit against desktop performance allowances
without phone." (STEALTH-09, 2026-10-17.) How it is set (FU-11) is open.

**G47. Light parity work sorted out when built.** The parity test, long lamps and motion lights keep their current plans
and are sorted out when built. Michael: "Sort out when building" (STEALTH-10, 2026-10-17.)

### Co-op

**G48. No bot partner anywhere.** Testing uses two browser tabs, the automatic two-player tests and the bunker's solo
switch. Michael: "No bot anywhere" (COOP-01, 2026-10-17; confirms loco M12; replaces training D35 and the bot lines of
loco D8 and D11, bible 5.9 C20.)

**G49. The research decides friendly fire, heavies and similar details.** Friendly fire, heavies and similar details
follow what CT co-op does; earlier answers on these are replaced by the research findings. Michael: "The research
decides" (chat 7, 2026-10-17; replaces page answer COOP-02 "On everywhere" and the heavies part of STEALTH-04's note;
settles FU-10.) It also replaces training D38 (friendly fire on in the bunker): Michael: "Research decides" (U5, chat,
2026-10-17.)
(Replaced by G141 for friendly fire and G155 for heavies, 2026-10-18.)

**G50. Two players maximum; no 3-4 player test.** (Replaced for Sector Ops by G308, 2026-10-23: up to 4 players there;
the campaign and Marlow Yard stay at 2.) Michael: "No, focus on 2 player maximum only." (COOP-03, 2026-10-17; replaces
loco D8's 4-player run and loco A19.)

**G51. Co-op tests made reliable, then required.** A short job makes the two co-op suites reliable; then they must pass
like every other test. Michael: "Fix, then required" (COOP-04, 2026-10-17.)

**G52. Co-op technical items approved.** (Replaced by G180, 2026-10-18, for brace and the dual takedown: both go.)
Network version 11 for the merge (both earlier uses of 3 noted); the SWAT-turn and lean-out network fields are removed
when the CT prototype is built; "every team move" means the four that exist
(brace, boost, human ladder, dual takedown) and the other four wait for the co-op phase; partners block each other in
every co-op mode, using the bunker's built version. Michael: "Approve as written" (chat 31 / COOP-06-1 to COOP-06-4,
2026-10-17; replaces page answer COOP-06 "One by one"; approves loco A4 and training A49.)

### Levels and maps

**G53. Kestrel paused until after the research.** Kestrel stops; what happens to it is decided after the CT co-op level
research. Michael: "Pause Kestrel" and "Decide after research" (LEVEL-02 and chat 4, 2026-10-17; replaces kestrel's stage
order.)

**G54. Room sizes re-measured for the CT camera.** Corridor widths, crawl heights and aisles are re-measured right after
the camera part of the prototype, and the size sheet is updated before new floor plans. Michael: "Re-measure" (LEVEL-03,
2026-10-17.)

**G55. One folder per map.** Every map gets its own folder under one maps folder; Kestrel and the bunker move there after
the merge. Michael: "One folder per map" (LEVEL-04, 2026-10-17.)

**G56. Crawl spaces are crouch-walked.** Automatic crawl only in real duct ends inside plant shafts. Michael: "Crouch-walk
spaces" (LEVEL-05, 2026-10-17.)

**G57. The human ladder reaches 4.5 m.** One co-op ledge band (4.3-4.5 m) serves the boost and the human ladder; the
bunker lip can go back up. Michael: "Ladder reaches 4.5 m" (LEVEL-06, 2026-10-17; replaces training A35.)

### Audio and music

**G58. CC0 sound allowed for the whole game.** CC0 recordings may be used for any sound wherever they cut build time and
sound better; bundled, never fetched, each credited. Michael: "Whole game, we can use CC0 wherever required if it reduces
build time and achieves a better result." (AUDIO-01, 2026-10-17; confirms the 2026-10-16 "allow CC0 for everything" and
audio AS9; replaces the "WebAudio synthesis" hard rule and bible S7 / open decision 4.)

**G59. No audio size limit.** Michael: "No limit" (AUDIO-02, 2026-10-17; replaces the 8 MB proposal.)

**G60. Footsteps slider for testing.** A separate Footsteps volume slider, used during testing. Michael: "Footsteps
slider" with the note "Footsteps slider during testing." (AUDIO-04, 2026-10-17.)

**G61. Own footsteps very soft when guards cannot hear them.** As in CT; the sound meter shows what guards hear. Michael:
"Yes, very softly" (AUDIO-05, 2026-10-17.)

**G62. One run sound.** One run sound for all running speeds; the walk / run switch is reset to the new speeds; the
sprint gait goes. Michael: "Normal run sound" (AUDIO-06, 2026-10-17; replaces audio AS13.)

**G63. Searching plays Cautious.** The chase music plays only after the player was seen. Michael: "Cautious, as now"
(AUDIO-07, 2026-10-17; approves audio AS1.)

**G64. The long menu theme ships.** The 2 min 50 s version ships; Michael confirms or changes it in the music job.
Michael: "Long version" (AUDIO-08, 2026-10-17; audio AS6.)

**G65. Music folders kept as they are.** The old music plans, the old test lab and the unused music files stay. Michael:
"Keep everything" (AUDIO-11, 2026-10-17; audio AS11.)

**G66. Missing sounds after the prototype.** After the prototype: guards' footsteps first, then ambience, then the rest.
Michael: "After the prototype" (chat 36 / AUDIO-10, 2026-10-17; replaces the AUDIO-10 note "To be reviewed after all
questions have been answered".)

**G67. Audio technical items approved.** Music steps (Cautious after 0.6 s of suspicion, Alert at once, Alert holds 10 s,
Evasion 12 s, Cautious 8 s, one step down at a time); cooldown counts as calm; music decoded at 32 kHz and shipped as MP3
(footsteps and guns at 96 kbps), rendered only on Michael's PC; a shot sounds suppressed under live noise 0.6; wall slides
at 0.4, on-the-spot shuffles at 0.5, steps within 0.15 s of a landing merge into it; suit damping (high cut above
1.6-2.4 kHz, level 0.6, 0.25 s tails); one shared foot-touched-the-ground event for footsteps and rumble. Michael:
"Approve as written" (chat 31 / AUDIO-12-1 to AUDIO-12-7, 2026-10-17; replaces page answer AUDIO-12 "One by one";
approves audio AS2, AS3, AS10, AS14, AS16 and AU7.)

### Art and characters

**G68. Realistic everywhere.** (Voxel line replaced by G223 and G282, 2026-10-23: no voxel look.) Operators now, guards
and weapons later from the same pipeline; voxels only as the way the world is drawn. Michael: "Realistic everywhere"
(ART-02, 2026-10-17.)

**G69. Original goggle, swapped soon.** (Swap narrowed by G195, 2026-10-19: Wren keeps her current goggle, the redesign
is parked; the no three-lens rule and the original menu symbol stand.) No three-lens look: a small job swaps in a simple original goggle, and the menu
uses an original symbol. Michael: "Original goggle" and "Soon" (chat 17 and ART-03, 2026-10-17; consistent with ops D19,
D20.)

**G70. Wren integration job first.** After Michael approves the prototype, a short job puts Wren in behind a dev switch;
then the weapon step. Michael: "Wren job first" (ART-04, 2026-10-17; replaces loco M18's pause rule.) Timing and the dev switch
replaced by G123.

**G71. Two operators: Wren and Moth.** Only Wren and Moth are built and playable; no four-operator plan. Michael: "2 player
game only." (ART-05, 2026-10-17; replaces bible 5.14's four playable operators.)

**G72. Body proportions fixed for every character.** The shared-body fixes apply to every character when Wren goes in;
movement and climbing tests re-run. Michael: "Fix all characters" (ART-06, 2026-10-17; approves ops SPEC 4.3 A1, A3-A7.)

**G73. Goggles on the brow when off, over the eyes when on.** Dim glow on the brow with vision off; full glow over the eyes
with vision on. Michael: "Brow off, eyes on" (ART-07, 2026-10-17.)

**G74. Wren stays 1.68 m.** The story line that calls her small is reworded. Michael: "Keep 1.68 m" (chat 26 / ART-12,
2026-10-17; confirms ops D11.)

**G75. Operators' remaining items stay on the operators branch.** feature/operators keeps its own decisions and open
items; master records only that the operators are realistic and that Wren and Moth are the two built. Michael: "On its
own branch" (chat 28) and "Operators branch" (U1, chat, 2026-10-17; replaces page answer ART-01 "Copy them now".)

### Weapons and gadgets

**G76. CT kit only.** (Disruptor replaced by G152, 2026-10-18: the held jammer.) One rifle with attachments (sniper,
shotgun, launcher), one pistol with a light / electronics disruptor, and the knife. Every other gun is removed in the
clean-up. Gadgets and attachments are CT's set, settled by the research. Michael: "CT kit only" (chat 33, 2026-10-17;
settles WEAP-01 and WEAP-12; replaces bible 5.6's arsenal and its disruptor / jammer split, the kestrel V0 kit list of
2026-10-11, loco A60 and A62.) The other guns go in this merge
(G115).

### UI and HUD

**G77. Menus keep their style plan; the in-game HUD follows CT.** The menus keep the menu style plan
(feature/menu-ui-spec, `docs/menu-ui/SPEC.md`); only the in-game HUD follows CT's layout. Michael: "Keep Arkham plan" (chat 25, 2026-10-17.)

### Training

**G78. Fallow stays as the co-op tutorial.** (Replaced by G180, 2026-10-18 (CT had a co-op tutorial), and G184 / G292,
2026-10-24: Marlow Yard is the training course; Fallow is parked.) The Fallow bunker is kept as the co-op tutorial
although CT has none. Michael: "Keep it" (chat 3, 2026-10-17.)

**G79. The bunker is rebuilt after the prototype.** (Parked with the Fallow bunker by G184 / G292, 2026-10-24: Marlow
Yard replaced it; binds only the parked bunker.) Its drills are rebuilt on the CT moves and every jump and reach is
re-checked. Michael: "After the prototype" (chat 21 / TRAIN-02, 2026-10-17; replaces training D15 and D50.)

**G80. Bunker anti-stuck resets kept.** (Parked with the Fallow bunker by G184 / G292, 2026-10-24.) Windows re-glaze, one-way turnstiles, lamps re-lamp and knocked-out role-players
are replaced after 10-30 s. Michael: "Keep the resets" (chat 22 / TRAIN-11, 2026-10-17; approves training A54, A61, A62.)

**G81. Boosts only at marked spots.** Two-player boosts work only at marked spots, as CT's co-op spots do. Michael:
"Marked boost spots" (chat 23 / TRAIN-08, 2026-10-17; replaces training A51's drill-tick backstop.)
(Replaced by G151, 2026-10-18.)

### Story

**G82. Text now, voice later.** Text radio and subtitles for the prototype; lines written to be voiceable; the voice test
stays a later idea. Michael: "Text now, voice later" (chat 6 / STORY-01, 2026-10-17; replaces "no voice ever" in
CLAUDE.md, the bible and story.md.)

### Process and branches

**G83. Main is the only base.** (Replaced in part by G318 and G286: trains build and merge automatically; dev and
ct-movement are pointer branches, docs/systems/deploy.md.) One branch per job from main, one merge request each; only
Michael merges; ct-movement and dev are retired. Michael: "Main is the only base" (chat 9 / PROC-01, 2026-10-17;
replaces the ct-movement -> dev -> master flow in CLAUDE.md, deploy.md and every run's rules.)

**G84. The merged version is 4.0.0.** Michael: "4.0.0" (chat 10 / PROC-08, 2026-10-17; replaces loco A18's 3.7.0 / 3.8.0
and the training 3.7.0-3.9.0 headings.)

**G85. One chosen preview.** (Replaced by G179, 2026-10-18 (`/ct/` via ct-movement) and the `/preview/` slot for master,
docs/systems/deploy.md.) The live game plus one test copy showing the job branch Michael chooses. Michael: "One chosen
preview" (chat 11 / PROC-10, 2026-10-17; replaces the /preview/, /ct/ and /kestrel/ slots.)

**G86. Authority order.** Michael, then docs/DECISIONS.md, then the bible, then job and map docs, then code; every
decision is also written into the bible. Michael: "You, then decisions" (chat 12 / PROC-05, 2026-10-17; replaces the
CLAUDE.md order and the run files' own orders.)

**G87. Prototype, then orchestrator.** Every multi-step job builds a quick prototype first for feel or look, then runs
the orchestrator method; older ways (the bible's Opus / Sonnet loop, Kestrel's planner method) become history. Michael:
"Prototype, then orchestrator" (chat 13 / PROC-03, 2026-10-17.)

**G88. Helper models.** The strongest model (Opus) builds and checks; a lighter model only for mechanical chores.
Michael: "Opus, light for chores" (chat 14 / PROC-04, 2026-10-17; replaces the bible's Sonnet-builds rule.)
(Replaced by G158 for prototype work, 2026-10-18, then by G302, 2026-10-23: Opus plans and checks, Sonnet builds from
strict briefs, Haiku does chores.)

**G89. One decisions file.** docs/DECISIONS.md holds Michael's decisions; old job files stay as history and point to it;
each job adds Michael's new decisions when it merges. Michael: "One decisions file" (chat 15 / PROC-06, 2026-10-17.)

**G90. Ordered job list.** The progress file lists jobs in order with branch, folder and status (CT co-op research,
prototype, then the rest); phase numbers stay only as chapter names. Michael: "Ordered job list" (chat 16 / PROC-07,
2026-10-17; replaces the Phase 0-7 status table.)

**G91. Old docs archived.** The retired maps' design docs and map data and the docs of the old cover-shooter direction move to the archive
folder; their tests are deleted with the code. Michael: "Archive the docs" (chat 18 / PROC-12, 2026-10-17.)

**G92. Short current checklist.** TESTING.md becomes one desktop checklist plus a release checklist; old lists are
archived. Michael: "Short current list" (chat 19 / PROC-11, 2026-10-17.)

**G93. Versions set at merge.** Notes say Unreleased until the merge; one minor step per merged job; fixes are patches.
Michael: "Set at merge" (chat 20 / PROC-09, 2026-10-17; replaces "one minor version per phase".)

**G94. Housekeeping approved.** A test port table, job folders named after each job (C:/NightShift/Mobile-Coop-<job>; the
plain folder stays on master), two test suites at a time, the merged test list, a "Running a job" section, and the plain
doc fixes; the texture budget and network notes are left for their jobs. Michael: "Approve, menus later" (chat 32 /
PROC-13, 2026-10-17.)

## Settled by the directive

Claude derived these from the directive and listed them in chat as settled before the questions; Michael then asked only
the open ones. Each quotes the directive line it comes from. Directive paragraph 1: "I want the game to be pure chaos
theory. Anything that isn't a part of the original chaos theory shouldn't exist." Paragraph 2: "2 player coop campaign
only, unable to be completed solo. We will research all the chaos theory coop levels, their design, flow, moves, etc.,
and recreate that experience." Paragraph 3: "We must get a working prototype working, only the basics required to make
it work and functional to test features and gameplay. I don't want to spend hours or days fine tuning things that may not
be used. Refinement can come later."

**G95. Work order.** First the CT co-op research, then the prototype, then the rest. Directive: "We will research all the
chaos theory coop levels, their design, flow, moves, etc., and recreate that experience." and "We must get a working
prototype working" (settles PROC-02; replaces its "prototype first" order and loco M26's "prototype next".)

**G96. Exact CT pad layout.** CT's default layout is copied button for button. Directive: "Anything that isn't a part of
the original chaos theory shouldn't exist." (settles FU-14; sharpens page answer CTRL-01 "Move toward CT".)

**G97. CT door menu.** The door list offers open, stealth open, bash and the optic cable; bash can knock out a guard behind
the door; running into a door does nothing special. Directive: "Anything that isn't a part of the original chaos theory
shouldn't exist." (settles FU-09; replaces page answer STEALTH-03 "Run push knocks out".)

**G98. Wall medkit stations only.** No carried medkits and no kit count on the HUD; the X hold is freed; stations are
placed in every map. Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles
FU-06, follows G20; voids loco A27, A55, A56, A57, A58 and the carried-medkit counts.)

**G99. Goggle modes night, thermal, electro.** Directive: "Anything that isn't a part of the original chaos theory
shouldn't exist." (settles WEAP-08; replaces the "camera feed" mode in the ops art notes.)

**G100. Instant goggle switch in CT order.** (Replaced by G181, 2026-10-18: the selection wheel picks the mode; the
goggle flip plays only on on / off.) An instant cut in CT's order (thermal, electro, night, off); no flip. Directive:
"Anything that isn't a part of the original chaos theory shouldn't exist." (settles WEAP-07; replaces the 0.2 s goggle
flip.)

**G101. CT grain.** Grain as in CT. Directive: "Anything that isn't a part of the original chaos theory shouldn't exist."
(settles WEAP-06; replaces loco M14 (5)'s grain on all three modes and loco A87.)

**G102. Thermal as CT.** Thermal follows CT (loco M25 (1)-(2): CT colour ramp, people behind closed doors as a dim
silhouette). Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles WEAP-05;
replaces the door part of loco A26.)

**G103. CT draw timings.** (Replaced by G243, 2026-10-22: real-world draw times, bible 5.6.) About 0.6 s (pistol) and
0.75 s (rifle) to raise, 0.5-0.6 s to lower. Directive: "Anything that isn't a part of the original chaos theory
shouldn't exist." (settles WEAP-02; replaces the bible's 0.3 / 0.4 s and the draw part of loco A41.)

**G104. Marksman scope with hold breath, as CT.** Normal aiming has no zoom; the marksman (sniper) scope has hold breath,
as in CT. Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles WEAP-03;
replaces loco A61.)

**G105. Loadouts Stealth / Assault / Recommended.** Used everywhere. Directive: "Anything that isn't a part of the
original chaos theory shouldn't exist." (settles WEAP-04; replaces loco A33's Silent / Flash / Loud.)
(Replaced by G153, 2026-10-18.)

**G106. CT fixed difficulties.** Difficulty uses CT's fixed levels; no sliders and no alarm-tolerance setting (G7).
Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles STEALTH-11; replaces loco
D7's custom difficulty.)

**G107. No stance or gear icons on the HUD.** The operator's body shows the stance, as in CT. Directive: "Anything that
isn't a part of the original chaos theory shouldn't exist." (settles UI-01; with loco M25 (7).)

**G108. Objectives in the menu.** (Replaced as the only place by G343, 2026-10-25: objectives also fade in and out in
game. Marlow Yard keeps the always-on list, not Fallow: G277, G292; objectives name what and where, G336.) Mission
objectives live in the menu, as in CT; the Fallow course keeps its always-on list
(training D45). Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles UI-02.)

**G109. Operators move the same.** One CT movement set; operators differ in look and height only. Directive: "Anything
that isn't a part of the original chaos theory shouldn't exist." (settles ART-11; replaces the bible's small gait
differences.)

**G110. No prone crawl, no rope climb.** (Replaced in part by G180, 2026-10-18: CT's two-person rope stays; no prone, no
solo rope climb.) Directive: "Anything that isn't a part of the original chaos theory shouldn't exist." (settles
ART-09.)

**G111. Two players settles the solo, 3-4 player and bot questions.** (Replaced in part: Sector Ops is 1-4 players with
solo play, G280 / G308; Marlow Yard is the only training course, G184 / G292.) No solo route, no solo training course
(Fallow is
the only course), no 3-4 player play, no bot. Directive: "2 player coop campaign only, unable to be completed solo."
(settles FU-01, TRAIN-01 and the solo option of UI-04; consistent with COOP-01, COOP-03, ART-05.) The old solo Training
mode is deleted in this merge (G116).

**G112. Tally and Sexton become radio crew.** They stay in the story as radio and briefing characters, not playable.
Directive: "2 player coop campaign only, unable to be completed solo." (settles FU-03.)

**G113. Menus, the music revision, the art guide and Kestrel floor plans wait until after the prototype.** Directive:
"We must get a working prototype working, only the basics required to make it work and functional to test features and
gameplay." (settles UI-03 and ART-13; consistent with LEVEL-02; replaces menu MD20's start condition.)

## Deferred

Where each deferred question will be decided.

To the CT co-op research:
- Friendly fire in missions (COOP-02), how heavies are taken out (FU-10, STEALTH-04 note) and similar details (chat 7, G49).
  Settled 2026-10-18: friendly fire G141, heavies G155.
- CT's gadget and attachment set (chat 33, G76), including the ring airfoil and the knife's role. In part
  settled 2026-10-18: held jammer G152, no remote hacking G142, fixed kits G153.
- Kestrel's future (chat 4, G53).

To the prototype (decided or tuned after Michael plays it):
- Every movement, camera and timing number, marked as a starting value (G10).
- Room, corridor and crawl sizes (LEVEL-03, G54).
- Missing sounds: guards' footsteps, then ambience, then the rest (AUDIO-10, G66).
- Wren integration, then the weapon step (ART-04, G70).

To the menu job (after the prototype, G113; "menu calls decided in the menu job", chat 32):
- UI-04 where players find Fallow; UI-05 how the lobby picks the course; UI-06 what mission cards show (by reading of chat 32; not asked separately).
- UI-07 prompt font; UI-08 title screen text; UI-09 Feedback item on the main menu; UI-10 the three menu-plan calls
  (menu MD11 key mapping, MD15 cinematic shots, MD19 removals).

To the music job (chat 5):
- AUDIO-03 music direction (Michael picked "Dark orchestral" with the note "Will review this as music progresses. No firm
  decision has been made.").
- AUDIO-09 music on briefing, results and pause ("Music revision decides"; the Confrontation part is void by G9).
- Confirming the long menu theme (G64) and the Calm / Cautious alternatives (audio AS7).

To the operators branch (chat 28, G75):
- ART-10 operator file size limit.
- ART-14 the operators run's 67 technical assumptions.
- Re-checking Wren's kit on the real CT poses (ART-09 option text).

To Kestrel, after the research (chat 4, chat 30):
- LEVEL-01 Mission 1 size (settled by G340: Tallow Wharf is Mission 1): Michael picked "Kestrel size" with the note
  "Will require review once all questions are answered. A full vertical slice plan must be made." The bible does not
  take Kestrel's Mission 1 numbers now: Michael: "No, wait" (U7, G118).
- LEVEL-08-1 to LEVEL-08-5 (editor items), LEVEL-09-1 to LEVEL-09-11 (mission details), LEVEL-10-1 to LEVEL-10-10 (level
  technical items): Michael: "Defer with Kestrel" (chat 30; replaces his page picks "One by one" and "Show me each").
- Kestrel's open ASK rows and its own map decisions (docs/kestrel/progress.md).

To the bunker rebuild (after the prototype, G79):
- TRAIN-03 bay 6 lean-out and SWAT drills, TRAIN-04 sprint drills, TRAIN-05 strike drills, TRAIN-06 quick 180 and
  momentum drills, TRAIN-07 speed drill: rebuilt on CT moves (chat 21); drills for removed moves cannot stay.
- TRAIN-12 the bunker's exceptions (E5-E10, new E13), TRAIN-13 small design calls, TRAIN-14 the 42 technical
  assumptions: Michael: "Defer to rebuild" (chat 24).

To the missions (chat 27):
- STORY-03 site and company names (Cinder Yard, Ostler Colocation); STORY-04 the seven open story items. Michael: "Decide
  with missions".

Still unanswered and not settled by the directive or chat (asked again later, nothing lost):
- FU-11 how to set the awake limit (G46 is replaced by G187, G254 and G289; the guard-cap job measures it).
- MOVE-15 and MOVE-15-1 to MOVE-15-4: head look-at order, muzzle rule near a team-mate, body cooling in thermal, the
  electro device list (Michael picked "One by one"; the items were never answered).
- WEAP-09 which gun comes out first.
- WEAP-10 how guns are carried when put away.
- WEAP-11 what Wren's kit shows (the medkit pouch goes with G98; the magazine look is open).
- TRAIN-09 course callsigns (own operator or fixed Wren / Moth).
- TRAIN-10 the bunker's solo test switch (training D21 stands meanwhile).
- What Wren's hip pod holds now the drone is removed (ART-08, ops D25).

## Earlier decisions that still stand

Still in force:
- loco D1: the pad is the primary target, then keyboard and mouse (touch part void, G12).
- loco D2: no-bob limits as starting limits (the sprint value is void).
- loco D7: full remapping with conflict warnings and reset; hold or toggle for every hold action; settings in
  IndexedDB (sprint and custom difficulty parts void, G7).
- loco D8: co-op parity: every feature works in co-op, committed moves host-approved, vision / camera / rumble local,
  partners never interpenetrate (2-4 players now 2, G2; bot and 4-player lines void, G48, G50).
- loco D11: the network simulator lives in the test transport only (bot parts void).
- loco M4: A38 (no stride phase on the wire) and A43 (releasing aim never cancels a reload).
- loco M12: no bot partner (extended by G48).
- loco M14 (1)-(3): holstered by default with relaxed arms (numbers retuned at the prototype); CT back-to-wall, no snap
  cover; crouch on any wall; the body stays on the wall at an edge (slide speed and pull-away void, G35, M25 (3)).
- loco M19: the CT research basis (CT-RESEARCH.md).
- loco M20: pure CT (now game-wide, G1): lean-out aim and the SWAT turn removed (Q1), palm strike (Q4, Q4b), thermal
  from footage (Q5), warn-and-save bindings (Q6, A30, A71), no sprint (Q8), posture from footage (Q9), doors past about
  15% open and guards notice (Q10), Michael reviews each revision (Q12). Q2 is replaced by
  G26, Q3 by M25 (4), Q7 by G25, Q11 (gentle explore swing) by G159.
- loco M21: desktop only (clean-up now in this merge, G12).
- loco M22: playable prototype first (G4, G87).
- loco M23: footage facts (at the slowest speed the operator walks backwards).
- loco M24: footage is mostly night vision; not a style cue for the normal view.
- loco M25 (1)-(7): CT thermal ramp; people behind closed doors in thermal; only the button or aiming leaves a wall; flat
  back standing, sideways crouched; palm strike recovery about 1.4 s; run starts at 4.2 m/s; speed rocker kept with no
  on-screen indicator (A29).
- loco M26: one consolidation PR to master.
- loco M27: documentation audit and vision questions (this file).
- training D1, D2, D4, D5 (as changed by D46), D8, D9, D10 (E1-E9), D11, D12, D13, D14, D16, D17, D18, D19, D20, D21, D22,
  D23, D24, D25 (narrowed by D42), D28, D30, D31, D32, D33, D34, D36, D37, D39, D40, D41 (bunker only, G117), D42, D43, D44, D45,
  D46, D47, D49.
- ops D1-D29 stand on feature/operators (G75), with D10 / D11 replacing D3 and D29 replacing D9; D19 / D20 match G69.
- menu MD1-MD10, MD12, MD17, MD18 stand under G77; MD13 approved by G22; MD14 stands without its phone clause.
- audio: Calm is silence until the music job (AS4); music volume default 15% (AS5); music follows every guard's state,
  never count, distance or direction (AS8); gun sounds approved (AS15); footsteps follow real foot plants (AS18); the
  quiet suit muffles the player's own sounds (2026-10-16).
- kestrel 2026-10-11: one pistol tool for disruptor and jammer (now G76); snap cover replaced by back-to-wall; the
  player-facing mode "Infiltration" renamed "Campaign".

Void, and what voided them:
- loco D3, D6, M1-M3, M5-M11, M13, M15: run process for that run (history).
- loco D4: M21. loco D5: G30. loco D9, D10, M16: M20 Q1 (lean-out removed).
- loco M14 (4) weight and pivot: M20, M25, G25, G26. loco M14 (5) grain: G101. loco M14 (6) pauses: history.
- loco M17 (step 22b items): G30, G33 and the prototype (M22). loco M18: G70.
- loco A0-A89 rows in the 62-item list: G39. Other open loco A rows: settled by the G entries that cite them.
- training D3: D34. training D6: G83. training D7: G53, G95. training D15, D50: G79. training D26: D31. training D27,
  D29, D48: history. training D35: G48. training D38: G49 (U5).
- menu MD16 (touch): M21 / G12. menu MD20 start condition: G113, G83.
- kestrel 2026-10-11 modes entry (Hunter, Wave, PvP Mission unparked): G7, G8 (Hunter only). kestrel V0 kit list: G76.
  kestrel wall hug (V1): G37. Kestrel stage order: G53.
- audio AS12 (V0 / V1 veto choices): superseded by the V4 score. audio AS13: G62.

## Unclear items, answered (U1-U10)

The DECISIONS draft listed ten unclear items. Michael answered them in chat on 2026-10-17 (native multiple-choice;
verbatim in docs/archive/consolidation/chat-answers.md, last section). U1, U3, U4, U5, U9 and U10 are applied in the entries they
touch (G75, G24, G111, G49, G11, G76); the new rules are below.

**G114. The name ban covers names, not the title or Michael's quotes.** Character, gear and organisation names from the
reference game are scrubbed everywhere (G6). "Chaos Theory" (and "CT") may name the reference in docs; Michael's quoted
words stay verbatim. Michael: "Title ok, quotes kept" (U2, settles FU-12, 2026-10-17.)

**G115. Non-CT removals happen in this merge.** Every gun outside the CT kit (G76), the tri-rotor drone, the custom
difficulty sliders (back to fixed difficulties, G106) and carried medkits (wall stations only, G98) are deleted in this
merge, each in its own commit. Michael: "In this merge" (U10, 2026-10-17.)

**G116. Emotes and the old solo Training mode are deleted in this merge.** Michael: "Delete both" (U3 / U4, 2026-10-17;
replaces CTRL-10's "Unbind until return"; with G111 the Fallow course is the only training.)

**G117. Training D41 binds only the bunker.** (Parked with the Fallow bunker by G184 / G292, 2026-10-24.) Its linear, unavoidable map rules apply to the Fallow bunker; campaign maps
follow the CT co-op research (G3). Michael: "CT research replaces it" (U6, 2026-10-17.)

**G118. The bible waits for Kestrel's Mission 1 size.** (Replaced by G340, 2026-10-25: Tallow Wharf is campaign Mission
1.) The bible does not take Kestrel's Mission 1 numbers until Kestrel is decided after the research (G53). Michael: "No,
wait" (U7, 2026-10-17; LEVEL-01 stays deferred.)

U8 (UI-04 to UI-06 go to the menu job) was not asked; chat 32 ("menu calls decided in the menu job") covers it.

## After the PR opened (2026-10-18, native multiple-choice)

**G119. Wall medkit heal: the research decides.** (Replaced by G180, 2026-10-18: heal by difficulty, single use.) The
+40 single-use station heal is a placeholder; the CT co-op research sets the amount and whether stations are reusable.
Michael: "Research decides" (2026-10-18; G98 stands.)

**G120. Mission 8 is written with the missions.** The replacement for the removed traitor plot stays open until the
missions are planned (STORY-04, G9). Michael: "With the missions" (2026-10-18.)

**G121. Stale branches deleted after the merge.** Once Michael merges the consolidation PR, Claude deletes dev,
feature/exchange-map, feature/kestrel, feature/footsteps, feature/weapon-audio, ct-movement, playtest/combined and the
claude/new-session-* branches; feature/ct-locomotion and feature/training-bunker stay until nothing is left on them.
Michael: "Yes, after merge" (2026-10-18; the go-ahead docs/archive/locomotion/CONSOLIDATE.md asks for.)

**G122. Michael brings his own CT co-op research.** Michael already ran a comprehensive research task outside the game
and git; he brings it in after the merge, and the research job starts from it. Michael: "I've already run a comprehensive
research task not linked to the game or git, I'll bring it in after the merge" (2026-10-18.)

## CT co-op research and prototype (2026-10-18)

Recorded from `docs/ct-research/DECISIONS-PENDING.md` (branch feature/ct-research). D-01 to D-25 are Michael's picks in
the CT co-op research session (his choice labels quoted verbatim; R-xx are the research's question rows); the rest are
his native multiple-choice answers in chat and his M1 prototype feedback, the same day. G123 is reserved for
feature/operators. Michael chose "today's answers win": where an entry here differs from G1 ("pure CT") or an earlier G
entry, the entry here wins and the older entry carries a "Replaced by" note.

### Research decisions (D-01 to D-25)

**G124. Modern-day setting.** The game is set in the present day. Michael: "Modern day" (D-01 research session,
2026-10-18; confirms `docs/story.md` Section 3.)

**G125. Escalating alert tiers, no abort.** (Hard-rule cap replaced by G290, 2026-10-24: up to 2 strict rules, breaking
one restarts the section.) Alarms raise a shared alert tier that escalates the guards' response; a mission does not fail
on an alarm count. A mission may have at most one hard rule, and it is signposted. Michael: "Escalating alert tiers, no
abort" (D-02 research session, 2026-10-18; replaces the bible's "some missions fail at a set alarm count".)

**G126. 30-second revive, 2 per mission; encounter checkpoints.** A downed player can be revived within a 30-second
window, at most twice per mission. Encounter checkpoints cap replay loss at about 10 minutes. Both players down reloads
the last checkpoint. Michael: "30-second revive, 2 per mission" (D-03 research session, 2026-10-18; replaces G1 where CT
differs and the bible's "no bleed-out".)

**G127. Violence is scored.** Lethal and non-lethal play are both allowed; non-lethal and ghost play are rewarded; no
mission forces a kill. Michael: "Scored." (D-04 research session, 2026-10-18.)

**G128. Lethal automated defences only at compounds.** Turrets and other lethal automated defences appear only at
military or private compounds; elsewhere security responds realistically. Michael: "Only at military or private
compounds" (D-05 research session, 2026-10-18.)

**G129. Proximity voice is an opt-in modifier.** Guards hearing the players' voice chat is off by default, visible when
on, and tunable. Michael: "Opt-in modifier." (D-06 research session, 2026-10-18; built after the prototype, G156.)

**G130. Heightened athletic tone.** Showpiece two-player moves (the partner launch, the drop line and similar) sit
alongside grounded ones. Michael: "Heightened." (D-07 research session, 2026-10-18.)

**G131. What difficulty scales.** Difficulty scales guard perception, alert tolerance and resources; sync timing windows
never scale. Michael: "Perception, alert tolerance and resources" (D-08 research session, 2026-10-18; sharpens G106: the
scaling rides on the fixed difficulty levels.)

**G132. Strictly two humans.** (Narrowed for Sector Ops by G308 / G280: 1-4 humans, solo allowed; still no AI partner.)
No AI partner and no solo variants. Michael: "Strictly two humans" (D-09 research session, 2026-10-18; confirms G2, G48,
G50, G111.)

**G133. Online, split-screen and LAN.** Co-op runs online, split-screen on one machine and over LAN; no cross-play
commitment. Michael: "Online, split-screen and LAN" (D-10 research session, 2026-10-18; extends bible 5.9 C19's direct
connections.)

**G134. Identical characters, complementary per-mission kits.** Both operators move and play the same; each mission
issues the two players complementary kits. Michael: "Identical characters with complementary per-mission kits" (D-11
research session, 2026-10-18; confirms G71, G109; the kits are fixed per mission, G153.)

**G135. Partner beacon and world pings, no partner marker.** Each player's goggle light is a distinct colour that serves
as the partner beacon, and players can place world pings. There is no partner marker and no live partner position on any
map (the original's map page appears to be a static image, R-11). Michael: "Follow the original: partner beacon
(distinct light colour per player) + world pings." (D-12 research session, 2026-10-18; replaces G1 where CT differs (world
pings) and the bible's HUD "team-mate markers".)

**G136. Standalone co-op story.** The story is written for the two-player campaign alone. Michael: "Standalone co-op
story" (D-13 research session, 2026-10-18; consistent with G9, G120.)

**G137. Over-the-shoulder camera, strict corner peek.** The camera sits over the shoulder and sees little the character
cannot. Michael: "Over-the-shoulder, strict corner-peek" (D-14 research session, 2026-10-18; sharpens G28 and the bible's
corner peeking.)

**G138. Both players extract.** Both players must reach the exit to finish a mission. Michael: "Both players must reach
the exit" (D-15 research session, R-09, 2026-10-18; replaces G1 where CT differs.)

**G139. Guards know only what they saw.** The shared alert tier rises, but no guard "knows" a second intruder exists
until one is seen or evidence suggests it. Michael: "Guards know only what they saw." (D-16 research session, R-06,
2026-10-18.)

**G140. Partner voice always clear.** Voice between the partners is an earpiece: it never fades with distance. What
guards hear is separate (G129). Michael: "Always clear" (D-17 research session, R-22, 2026-10-18.)

**G141. Friendly fire is a host option, on by default.** Michael: "Host option, on by default" (D-18 research session,
R-08, 2026-10-18; settles the friendly fire part of G49.)

**G142. No remote hacking tool.** All hacking is hands-on. Michael: "None." (D-19 research session, R-02, 2026-10-18;
sharpens G76.)

**G143. Some solutions randomised per run.** Some codes, items or rooms vary per run and must be read in the world.
Patrols stay fixed. Michael: "Some per run." (D-20 research session, R-16, 2026-10-18.)

**G144. Lit windows are systemic.** A lit window exposes anyone in it, from either side; dark rooms hide. Michael:
"Systemic." (D-21 research session, R-20, 2026-10-18; consistent with G45.)

**G145. Story-critical characters are protected until their role is done.** (Mission fail replaced by G353, 2026-10-25:
killing one restarts the section.) Killing one earlier fails the mission, with
a clear warning first. Michael: "Protected until their role is done." (D-22 research session, R-17, 2026-10-18.)

**G146. Perfect rating.** 100% means no kills, no alarms and every primary objective; optional objectives are a bonus.
Every mission must be testably 100%-able. Michael: "No kills + no alarms + all primary objectives." (D-23 research
session, R-15, 2026-10-18; replaces G1 where CT differs and the bible's rating formula.)

**G147. Any partner can join a saved mission.** The saved mission's progress belongs to the host. Michael: "Any partner
can join" (D-24 research session, R-07, 2026-10-18; replaces G1 where CT differs.)

**G148. Two-person questioning, non-violent.** One player distracts or bluffs while the other reads a device or a
reaction. Michael: "Yes, non-violent." (D-25 research session, R-17, 2026-10-18; adds to G23's interrogation.)

### Prototype and process answers (chat, 2026-10-18)

**G149. CT movement first.** The prototype builds CT movement before the co-op slices. Michael: "CT movement first"
(chat, 2026-10-18; replaces the recommended co-op-first order in docs/ct-prototype/PLAN.md.)

**G150. Core feel first.** (Replaced by G227, 2026-10-21: Michael tunes movement himself.) The codebase is kept. A fresh
session runs one job that rebuilds and fine-tunes CT movement, camera, back-to-wall, doors, palm strike and goggles on
Wren (Opus for the tuning) until Michael signs off; the co-op gameplay slices C1-C7 come after. Michael: "Core feel
first" (chat, 2026-10-18; replaces G4 for these core-feel systems, which are tuned now rather than later, and narrows
G158 to the menu and gameplay prototype slices; Wren is used from this job on, ahead of G70's order.)

**G151. Team moves anywhere with room.** Two-player moves are free wherever the space allows, with a prompt naming the
move. Michael: "Anywhere with room" (chat, 2026-10-18; replaces G81.)

**G152. Held pistol jammer.** The pistol's jammer is held on one light, camera or laser; its charge drains and the player
must stand still. It replaces the thrown EMP gadget. Michael: "Yes, held jammer" (chat, 2026-10-18; replaces the EMP
gadget; sharpens G76's disruptor.)

**G153. Kits fixed per mission.** Each mission issues the pair complementary kits (G134); players do not choose a
loadout. Michael: "Fixed per mission" (chat, 2026-10-18; replaces G105.)

**G154. Digests only on master.** Master gets the scrubbed research digests; the raw research files are kept only as the
tag `archive/ct-research-raw`. Michael: "Digests only" (chat, 2026-10-18; G6 holds.)

**G155. No heavies or dogs in co-op missions.** (Narrowed to campaign missions by G297 / G307: Sector Ops has dogs
(G348), late body armour and riot shields. Helmets go by difficulty in both modes: G338, G341, G350.) As in CT, co-op missions have no heavy or dog archetypes;
armour and helmets come with the alarm stages. Michael: "Adopt CT's way" (chat, 2026-10-18; replaces G42's heavies and
dogs exception and the heavies part of G49.)

**G156. Voice chat after the prototype.** Proximity voice (G129) and the always-clear partner voice (G140) are built
after the prototype. Michael: "After the prototype" (chat, 2026-10-18.)

**G157. Level standard changes reviewed later.** The 12 proposed level standard changes (design-kit-digest appendix)
come to Michael item by item before the first real mission map. Michael: "Review list later" (chat, 2026-10-18.)

**G158. Prototype slices on Sonnet, medium.** (Replaced by G302, 2026-10-23: Opus plans and checks, Sonnet builds from
strict briefs.) Prototype slices (menu, movement, co-op) are built with Sonnet at medium effort; Opus does the fine
tuning later. Since G150 this covers the menu and gameplay prototype slices only. Michael: "Sonnet, medium" (chat,
2026-10-18; replaces G88 for prototype work.)

**G159. Manual camera.** The exploring camera never moves or adjusts by itself; the player controls it. Michael: "Camera
doesn't automatically adjust/move at all in CT, it's manually controlled." (M1 feedback, chat, 2026-10-18; replaces G29's
gentle swing toward travel, the "exploring camera swings by itself" part of G17 and loco M20 Q11's lead room.)

**G160. Tense sneak crouch.** Sneaking slowly near an enemy, the crouch changes to a tense variant: quieter, on the toes,
with exaggerated balancing. Michael: "The characters crouching posture changes when in vicinity of an enemy and sneaking
slowly, almost like trying to be quieter and moving on tippy toes and over exaggerated balancing." (M1 feedback, chat,
2026-10-18; adds a crouch variant.)

### Research findings for Michael to confirm (settled by G180, 2026-10-18)

These come from the research digests. Michael has not decided them; they go to him at the plan review.

- G78 says CT has no co-op tutorial: CT had one in both builds (moves-mechanics-digest). Its drill order is a template
  for the bunker rebuild (G79).
- G110 (no rope climb) vs CT's two-person rope, where the partner climbs the held rope (belay line; after the
  prototype).
- G106 vs D-08 (G131): alert tolerance scales with the fixed difficulty levels (not a setting).
- G119 medkits: CT's wall cabinets healed full on Normal, 50% on Hard, less on Expert, probably single use (solo
  sources). Proposal: single use, heal by difficulty.
- G52's "brace" and "dual takedown" moves: CT had no brace, and its double takedown was two ordinary takedowns timed
  together.
- G11: kept (CT has them): guards relight lamps and investigate dead lights, impromptu paired searches, eavesdropping,
  lock picking with a noise cost, adaptive music. Dropped: the last-known-position marker, the remote digital layer, the
  under-3-second retry target, the after-action route map (kit-design-digest section 5).

## Operators run (feature/operators), recorded when Wren went in (step 11e, 2026-10-18)

The operators run's own file (feature/operators docs/operators/DECISIONS.md, ops D1-D33 and its assumed A-decisions)
is history for Michael's decisions: the ones still current are below. Ops D3 (identical skeleton), D9 (phone LOD),
D17 (scripted workflow) and D19's "more futuristic housing" are replaced and not carried. G123 was reserved for this
run on master; the rest were G124-G139 on feature/operators and were renumbered G161-G176, in the same order, when
master's G124-G160 (the CT co-op research) merged in.

**G123. Wren is the player character now, for both players.** Wren replaces the player body for solo, the local co-op
player and the co-op partner, before the prototype is done and with no dev switch; guards keep their bodies (G68);
gameplay does not change (G38). Michael: "I want wren in to replace the existing character anyway; before the
prototype is done" and, until Moth is finished, "Both play as Wren" (2026-10-18, ops D31; replaces G70's "after the
prototype, behind a dev switch".)

**G161. Wren in first, polish later.** Wren goes into the game now; the remaining polish (kit relabels, the stowed
goggle export, doc fixes) is cleanup while the game is built. Michael: "I want wren in the game first. We will clean up
changes later while the game is built." Until the stowed goggle is exported it stays over the eyes in both states and
only the glow follows G73: "Yes, fix in cleanup (Recommended)" (2026-10-18, ops D33.)

**G162. The hero model in the main menu and close-ups; it ships.** The hero LOD drives the main menu and every
close-up camera (photo mode, later close shots); gameplay uses LOD0-2. The 55.5 MB hero file ships in the game build,
loaded only when a close-up camera needs it. Michael: "i do want hero version for the main menu and for any close up
shots" (2026-10-16, ops D21) and, after seeing hero against LOD0 close-ups, "Yes use hero for menu" (2026-10-18, ops
D33.)

**G163. Operators look AAA-real, up close.** No code-built look: believable fabric, folds, seams, stitching, wear,
straps under tension, hard kit with real material response; they must hold up at 0.3-1 m in menus. Michael: "the
operators must NOT look code-built. They must look as detailed and realistic as a modern AAA stealth game character"
and "they must hold up when used up close in menu animations" (2026-10-15, ops D1, D2.)

**G164. Faces fully covered.** Fitted balaclava or hood plus goggles; no visible face or skin. Michael: "fully covered,
full stealth gear (fitted balaclava/hood plus goggles). No visible face or skin." (2026-10-15, ops D4.)

**G165. Inspired by the reference series, original in every shape.** Michael: "I am expecting splinter cell inspired models that
are original" (2026-10-15, ops D5; the no-IP rule stands.)

**G166. Each operator has their own size; hit boxes follow the body.** Skeleton, hit volumes and light sample heights
match each operator's real size; the capsule, speeds, camera rules and every traversal move stay shared. Michael:
"operators can be slightly different sizes, i would prefer realism over fairness. the games focus is mostly coop" and
"Hit boxes follow the body (Recommended)" (2026-10-15, ops D10, D11; replaces ops D3's identical skeleton. With G74.)

**G167. Built offline in Blender on a CC0 base body.** In-repo scripts run Blender headless: sewn garment panels draped
by cloth simulation, bevelled kit, baked maps, glTF out; the base body is MPFB2's CC0 data (no MPFB code). Michael:
"Blender pipeline (Recommended)" and "Download it (Recommended)" (2026-10-15, ops D7, D12.)

**G168. A stealth operative, not military: Wren's concept.** A one-piece fitted stealth suit, slim segmented armour,
slimline tactical storage mapped to the game's loadout, lighter approach boots, no climbing sit harness; no guns
modelled (the game's weapon models attach in game). Michael: "I want more of a stealth operative design. Wetsuit fitted
suit, slim body armour, tactical ammo storage/holsters" (ops D22), "I like A, but can you make it more logical based
off the requirements of the game" (ops D23) and "yes build a2, but create without the guns, they will be in game
anyway" (ops D24) (2026-10-16.)

**G169. Goggles: no flip, the original housing, a tactical strap.** The goggle sits over the forehead when stowed and
over the eyes in use (no flip arm); the original housing stays; the head harness is option 2 (split crown, hard rear
pod). Michael: "the goggles shouldn't flip up and down, they should just sit over the forehead, and be over the face
when in use" (ops D19), "the original one looked better but it can't flip up" and "2 - Split crown, hard pod" (ops
D20) (2026-10-16. With G69, G73.)

**G170. Rigid kit stays rigid.** Magazines, knife, holster shell, pods, buckles and plates keep their true straight
shape on the body, each skinned to one bone; placement starts from each item's size, weight, draw and movement.
Michael: "any attachments (magazines, knife etc) can't be bent which they currently are. They are rigid and must be
reflected that way on the character" (2026-10-17, ops D28; his placement picks are in ops D28.)

**G171. Kit after master's deletions.** The hip pod stays as a utility pouch, the medkit pouch as a plain pouch, the
thigh holster as is (pistolSd draws from it), the left-hip socket carries the rifle sling. Michael: "Keep as utility
pouch", "Keep as plain pouch", "Leave as is", "Keep for the rifle sling" (2026-10-18, ops D32; relabels are cleanup,
G161.)

**G172. KTX2 textures: encoder offline, decoder bundled.** Operator textures are KTX2 (UASTC); the KTX-Software
encoder is an offline tool, Babylon's KTX2 decoder is bundled from npm, nothing fetched at runtime. Michael: "Install
toktx (Recommended)" and "Yes, add it (Recommended)" (2026-10-17, ops D26, D27.)

**G173. No phone LOD.** Hero, LOD0, LOD1 and LOD2 serve desktop distance bands only. Michael: "Yes, drop phone LOD
(Recommended)" (2026-10-17, ops D29; follows G12.)

**G174. Wren goes in before Moth.** Michael: "i want to move the completed character into the game also before
starting on the next one" (2026-10-18, ops D30.)

**G175. Operator jobs run as small steps in one orchestrator session, with screenshots.** One focused step at a time
(implementer, an independent checker, up to three fix rounds), unattended, with progress renders at each step's end.
Michael: "i would prefer to do smaller steps that keep claude focused and on task", "i still want to see screenshot at
end of each step so i can see progress" and "Orchestrator session" (2026-10-16, ops D15, D16, D18; the session
method in docs/systems/session-method.md.)

**G176. Traversal gameplay is fixed at the 1.75 m body for every player.** Ledge hangs, wall jumps, climbs, ladders,
pipes and every other attached position use one gameplay height (the old 1.75 m body's values), whatever the drawn
body's height; Wren's body is lifted onto her grips visually (arms and IK adjust so her hands meet the ledge) and
gameplay never reads it. Michael, asked whether Wren (1.68 m) should hang 7.6 cm higher: "Keep gameplay fixed
(Recommended)" (2026-10-18, ops D34; with G38; replaces ops A105.)

**G177. Weapons are held properly and believably.** The players' guns are realistic placeholder meshes (rifle with an
underbarrel launcher and suppressor, suppressed pistol with a jammer emitter, knife) and Wren's hands sit on them: palm on
the grip, fingers round it, the support hand on the launcher tube, a believable stance. Michael: "I'd rather the character
holds the gun properly. Make sure they line up and are believable at minimum. Stance must look believable also."
(2026-10-19, weapons job; docs/archive/weapons/DECISIONS.md A8-A11.)

**G178. The rifle is carried where it can be drawn and put away quickly.** Holstered, the rifle hangs from Wren's back
plate mount (not floating) and the pistol sits in her thigh holster; holding and holstering look believable at a
prototype pass. Michael: "adjust how the rifle is holstered so it makes logical sense how the character can equip it
quickly and holster quickly, it's just floating" and "Holding weapons and holstering should at least look believable but
only prototype quick run" (2026-10-19, weapons job A12, A13; settles part of bible Section 11's carry question.)

### Prototype goal (feature/ct-prototype, 2026-10-18; first written as G161-G162; renumbered G177-G179 at the Wren merge and G179-G181 at the weapons merge)

**G179. Pure-CT movement prototype, then the co-op training bunker.** (Replaced in part by G288, 2026-10-24 (refining
allowed), and G184 / G292 (Marlow Yard, not Fallow, is the co-op training course).) The prototype is (1) pure-CT
movement built once to the footage numbers (M1-M4: body, manual camera, back-to-wall, doors and the CT pad layout, palm
strike and grab, goggles), then (2) the Fallow bunker rebuilt as CT's co-op training level on the pure-CT moves, played
start to finish by two players, with the co-op moves it needs (leg-up and ledge relay, held jammer on a camera, partner
throw over a laser with the far-side release, hang-down hack, paired scanners, the two-person rope, revive, both players
finishing). No fine tuning until that loop plays; Michael's notes are queued. Every slice is pushed to the `/ct/`
preview
(`ct-movement`). Implementers are Sonnet medium, Opus for network-sync-heavy slices and anything stuck twice; the
orchestrator stays Opus. Overnight unattended runs come later, when Michael says. Pumphouse Nine, other maps and extra
gadgets wait. Michael: "Prototype movement focus first ct-pure, then full coop loop", "It can run overnight but not
yet. I'm still awake. Also we should focus on the ct training coop session.", "Yes, push to ct-movement", "Yes, Opus
for those", "Rebuild Fallow on it" (native multiple choice, core feel session, 2026-10-18); relayed from the main
session the same day: "we need to get to prototype quicker before fine tuning? ... this needs to be made completely
playable in coop as a prototype", "Movement is critical to achieve a pure-CT prototype." and "I want pure CT movement
as a prototype, wren in the game, menu background done, prototype weapons ready, and to focus purely on completing the
ct coop bunker / coop training level." (Replaces G150's tune-until-sign-off and the core feel job's per-area tuning
loop; replaces Pumphouse Nine as the prototype level in docs/ct-prototype/PLAN.md; applies G78, G79, G80, G117, G130,
G151, G152.)

**G180. Pure CT: if CT had it, we use it.** Michael: "Pure ct, if it had it, we will use it." (relayed from the main
session, 2026-10-18.) It settles the research findings listed above for Michael to confirm:
- CT's two-person rope (the partner climbs the held rope) is built in the bunker; it replaces G110's "no rope climb" for
  this move.
- CT had a co-op tutorial: G78's "although CT has none" is wrong; the bunker follows CT's co-op training drills.
- Medkits (G119): wall cabinets heal by difficulty (full on Normal, 50% on Hard, less on Expert), single use.
- Alert tolerance scales with the fixed difficulty levels (G106 with G131).
- G52's "brace" and the dedicated dual takedown go (CT had neither; its double takedown is two ordinary takedowns timed
  together); the CT moves stay: leg-up, ledge relay, partner throw, hang-down, rope.
- G11: the five ideas CT has stay (guards relight lamps and investigate dead lights, paired searches, eavesdropping,
  lock picking with a noise cost, adaptive music); the four it does not have go.

**G181. Selection wheel for weapons, gadgets and vision mode.** A selection wheel (not CT's) picks the weapon, the
gadget and the vision mode; one button only turns the selected vision mode on and off (the goggle flip plays only on
on / off, never between modes). No time slow while it is open. This one menu is Michael's exception to G1 and to the
rule that the old cover-shooter systems are history. Michael: "incorporate blacklist style menu that allows selection of weapons,
gadgets, and vision mode. Single button only toggles that one vision selected." (native multiple choice, core feel
session, 2026-10-18); "no time slow" relayed from the main session (2026-10-19). Assumed placement (feel A1): the menu
on LB hold, LB tap switches weapon, the vision toggle on D-pad left. (Replaces G100's cycle order and the goggle part
of G96's exact CT layout.)

**G182. A phone can launch the game, for testing only.** A phone or tablet (touch as its main pointer) opens the game
on the minimum settings (`?gfx=min`: every feature off, DPR 1, the lowest operator LOD, no governor, no Auto
detection), with the 1280 x 720 menu and HUD layout scaled down to fit its screen; the canvas fills the screen in
either orientation inside the safe areas. No touch controls: a Bluetooth pad (or keyboard) drives it. No phone checks,
tests, LODs, art or budgets. Gameplay never reads it. Michael: "i also want the phone to be able to launch the game,
but always minimum settings, no touch controls, and no time spent on it. display should also automatically fit the
iphone screen. but it absolutely is testing only, and does not need any checks or testing." (relayed by the
orchestrator, 2026-10-19.) (Narrows G12 for launching only; desktop stays the only supported platform.)

**G183. Version numbers follow the merges to master.** Michael: "can we make sure the version numbers update
sequentially based on your updates? i dont want to move away from v4, just use a logical numbering system to allow me
to understand what version im actually looking at and what you are merging" (2026-10-19). Master is `4.MINOR.PATCH`:
every merge to master gets the next number, set by the orchestrator in the PR just before it merges (G93 made
concrete). A job or feature (game change) is a minor step (4.6.0 -> 4.7.0), a fix or docs-only merge a patch (4.6.0 ->
4.6.1). The CHANGELOG heading names the version, the date and the PR; the merge commit gets the tag `v4.x.y`. Branch
and preview builds carry the master version they were last merged with, and the in-game label adds the build's commit
(`v4.6.2 · a1b2c3d`, `PREVIEW CT` on /ct/), so any build traces to one commit. 4.1.0-4.6.1 were numbered after the
fact in merge order (#5 4.1.0, #7 4.2.0, #6 4.2.1, #8 4.3.0, #9 4.4.0, #10 4.4.1, #12 4.5.0, #13 4.6.0, #11 4.6.1).
CLAUDE.md's "one minor version per phase" line is updated in the process audit.

**G184. The prototype menu: Sector Ops and Co-op.** (Narrowed by G292 and G340, 2026-10-24 / 25: Marlow Yard is the
training course, not the campaign; campaign Mission 1 is Tallow Wharf.) Michael (2026-10-19, Sector Ops M1, M4): the main menu offers only
Sector Ops and Co-op, plus Loadout, Settings and Feedback; Missions, Training and Free Roam stay behind `?legacy=1`.
Co-op is the campaign, which for now is the training bunker, Marlow Yard (`ctcourse`, Course mode); the host can switch
the co-op match to Sector Ops. The mode is called Sector Ops, never by a reference-game name.

**G185. Sector Ops is Michael's playground.** (Replaced in part by G295-G297, G308 and G309: a new campus map, 1-4
players, full detail art, not prototype effort.) Michael (2026-10-19, M2, M3): an original take on a later reference
game's co-op ops mode at Chaos Theory pace, solo or co-op, for testing movement and gunplay without a partner. The Warehouse is expanded
into sections of rising difficulty with cameras and lasers. A section is done by its objective, then its exit; kills are
optional, so a ghost run is always possible. Prototype effort only.

**G186. Sections joined by connectors.** (Replaced in part by G295: the campus S1-S5 replaces the Warehouse sections;
connector rooms stay.) Michael (2026-10-19, M5, M7): distinct sections joined by connector rooms that load the next
section and unload the last, so each section can hold as many guards as the budget allows. Three sections first, from
the existing Warehouse (service entrance, racking aisles, factory floor with the mezzanine and offices); the courtyard,
annex and roof come after Michael has played it. Research and a plan came first (M5b).

**G187. Guard counts are measured, per mode.** (Narrowed: per-section counts by G289 and G328; the campaign caps at 32
alive by G359, so `MAX_ALIVE = 12` stays for Marlow Yard only; the 32 ceiling stands, G332.) Michael (2026-10-19, M6): aim for 20-25 patrolling guards per section,
then measure on the PC. `MAX_ALIVE = 12` stays for the other modes; Sector Ops has its own cap (32, the ceiling, not a
target). The PC perf run with full counts sets the number.

**G188. No lives; revive syringes and checkpoints.** Michael (2026-10-19, M7): in co-op a downed player is revived by
the partner with a limited revive syringe; if both are down, or in solo, the run restarts at the last checkpoint (the
connector).

**G189. Difficulty stars per op.** (Star fill refined by G331, 2026-10-25: a clear on tier N fills every star below N.)
Michael (2026-10-19, M7): each op has difficulty levels shown as stars; finishing an op on a difficulty fills its star,
shown when the op is highlighted. Stored in its own IndexedDB kv key (`sector:ops`, like the course record), so the save
shape does not change.

**G190. Room to manoeuvre beats guard count.** Michael (2026-10-19, M8): "make sure the geometry and layout is altered
to offer multiple paths to objective and throughout the level. having so many guards in one small area will be
difficult to manage, there must be room to maneuver and take them out silently away from others." Every section has
2-3 routes to its objective and exit; patrols sit in separate pockets, each with a takedown spot out of the other
guards' sight; the count drops before the spacing does (10 / 10 / 11 in the first cut). A check proves it per section.

**G191. Co-op training first, Sector Ops on spare capacity.** (Replaced by G296, 2026-10-23: Sector Ops runs in parallel
in its own session.) Michael (2026-10-19): "Sector ops should be low priority over anything else. I want to get coop
training bunker fully functional and running, but sector ops can at least run when there is opportunity."

**G192. Wheel on LB hold, no lethal switch.** Michael (2026-10-19, dashboard; relayed, not verbatim,
docs/ct-prototype/DECISIONS.md): the selection wheel stays on LB hold; no lethal / non-lethal switch (LT / RT covers
it); with a gun drawn A reloads (CT). Confirms G181's assumed placement (feel A1). (The A reload is replaced by G212.)

**G193. Scanners cost HP only for a late or abandoned hack.** Michael (2026-10-19, dashboard; paraphrased): no HP cost
when the partner never started; the 10 HP cost stays for a late or abandoned hack (CT Core, a later slice).

**G194. Goggle flicker at launch only.** Michael (2026-10-19, dashboard; paraphrased): the goggle flicker plays only at
launch, not after a match.

**G195. Wren keeps her current goggle.** Michael (2026-10-19, dashboard; paraphrased): keep Wren's current goggle; he
rejected the A / B / C scratch options, so the redesign is parked. Only the stowed-on-brow export remains, in the
cleanup job (G161). (Refines G69: no further goggle swap for now.)

**G196. Moth's goggle is purple.** Michael (2026-10-19, dashboard; paraphrased; operators D36): Moth's goggle is
purple. A scratch Moth prototype comes when nothing urgent waits, possibly overnight on the desktop. (Replaces bible
5.14 amber.)

**G197. Movement rebuilt to match the footage.** Michael (2026-10-19 23:15, 23:20): "Catalogue them, audit, and update
our movement system to match the recorded animatimations, movements camera angels, speeds, everything about movement.
Must be exactly the same as the recorded movement, only made original by you." and "I expect a thorough audit of the
movement system and have it replicated in my game using original code." Movement (animations, camera angles, speeds) is
audited against the footage (`C:/NightShift/Mobile-Coop-ct-prototype/pc/ct-work/`, gitignored) and rebuilt to match in
original code; this lifts the no-refining rule for movement. (Its footage reference is replaced by G210.)

**G198. Hold-A action menu, as in CT.** Michael (2026-10-19 23:20): "the action menu that shows up requires holding A
and selecting which option you would like to proceed with, including returning to game (no action). I want it to be
identical." Actions are picked from a menu opened by holding A, with a return-to-game (no action) row, identical to CT.
(Refined for a held guard by G203-G205.)

**G199. Believable animations, no clipping.** Michael (2026-10-19 23:45): "my expectation in the morning is that night
shift movement and animations will operate identically to those recorded. It should feel the exact same when i play it.
I expect prototype animations for all of it, with no clipping and must be believable." Every movement gets a prototype
animation that is believable and does not clip. He was told identical everywhere overnight was not realistic: the
biggest gaps closed plus a measured list of what remains. (The "operate identically to those recorded" target is
replaced by G210.)

**G200. Marlow Yard ready for a co-op walkthrough, lit where needed.** Michael (2026-10-19 23:45): "I also want coop
bunker/training fully prepared for a coop walkthrough test, including prototype/light visual pass over it to ensure
theres sufficient lighting where required." The co-op training bunker (Marlow Yard) is made ready for a two-player
walkthrough, with a light prototype visual pass so every space that needs light has it.

**G201. Sector Ops Warehouse overhauled for fun flow.** (Replaced by G295, 2026-10-23: the campus redesign.) Michael
(2026-10-19 23:45, 23:47; paraphrased): the Warehouse
reviewed and overhauled for fun flow, several stealth routes per section (pipes, ceiling crawl spaces, co-op passages),
logical guard routes, realistic buildings; dogs carry no flashlight. A spec for all three sections comes first with
section 1 as a greybox; it may loosen `docs/level-design.md` where it blocks fun flow, each change logged for Michael.
(Builds on G190; the rebuild is parked by G224.)

**G202. All animations checked against the footage; CT camera numbers.** Michael (2026-10-20 00:45): "I would rather
you check review all animations against the videos and fine tune as necessary to more accurately replicate the movement
system. This system is one of the highlights of the game". His answers (00:50, paraphrased): the exploring shoulder
offset matches CT (0.15 m, was 0.32); the FOV matches CT (86, was 75); where the footage disagrees with G103 or F1a,
the footage wins. (Refines G103; G210 later drops the CT movement references.)

**G203. Behind a guard: grab or return, then the held options.** Michael (2026-10-20 08:10): "The action menu behind
guard should only show grab or return, once they are grabbed it can show interrogate (if they have information), and rt
or Lt to either knock out or kill, and aim button to aim pistol while holding them. It shouldn't have kill/knock
out/carry in the list." Behind a guard the hold-A menu lists only grab and return; once held, interrogate shows when
the guard has information, RT / LT knock out or kill, and the aim button aims the pistol; kill, knock out and carry are
never rows. (Refines G23 and G198.)

**G204. A held guard is never released.** Michael (2026-10-20 08:20): "The guard cannot be let go either, only knocked
out. Killed, or used as human shield (aiming pistol)". A held guard ends knocked out or killed, or is used as a human
shield with the pistol aimed; there is no release, and interrogating keeps the hold.

**G205. No back-to-game row once grabbed.** Michael (2026-10-20 08:25): "There is no back to game option once the grab
is initiated." While holding, hold-A shows only INTERROGATE (when the guard has information). (Refines G198's return
row.)

**G206. An interrogation guard in Marlow Yard; traversal takedowns keep one row.** Michael (2026-10-20 08:40): "Add one
in Marlow Yard" (an interrogation guard); and (paraphrased) ledge, pipe and window takedowns keep one KNOCK OUT row.
Marlow Yard gets one guard who can be interrogated; those takedowns offer a single KNOCK OUT row.

**G207. Animation fixes from the 4.12.0 playtest.** Michael (2026-10-20 10:10): "i played through it and want to focus
on fine tuning the animations, they all look weird and unnatural" and "Legs are out too wide, looks like a crab. Elbows
also go out too wide when moving quicker. This all translates to crouching too, and crouching idles too quick, and the
hand resting on the knee is upside down and not sitting on the knee, looks weird" (roadmap: also stiff or robotic,
wrong poses, feet / legs off). Walk, jog and run first: legs and elbows in, also when crouched; a slower crouch idle;
the knee hand the right way up, on the knee. Animation feel is first priority.

**G208. Keyframed core clips authored in Blender.** Michael (2026-10-20 10:25; paraphrased) chose keyframed clips after
asking "You have all walking videos from CT, why cant we match it". Walk, jog, run, crouch walk, crouch idle and the
wall-knee hand are keyframed clips authored headless in Blender, keyed with the footage as reference, never traced from
it (IP rule, G5); the procedural layer keeps blending, turning and foot IK. The walk cycle came first as proof.
(Replaces bible 5.12's "All animation is generated in code" for these clips.)

**G209. Tight pose matching with a matched camera, no tracing.** Michael (2026-10-20 10:55): "Tight pose matching, also
consider the camera angle being used in the CT videos also is different. Try to match the camera angle also to ensure
it matches". Frame-by-frame tracing of CT's animation was declined (it copies CT's animation work, G5); the comparison
camera matches the footage, key poses are measured per phase with overlays, and our own keys hit those targets. (G210
later drops the CT movement references.)

**G210. Animation and controls rework, no CT movement references.** Michael (2026-10-20 13:30): "the ct movement is
getting worse. Can you ignore CT movement references." Analogue speed from the stick (no speed toggle); LT held aims;
three states, holstered / low ready / aiming; X tap holsters; RT tap knocks out, RT hold kills; traversal auto-holsters
and returns to the state. Every movement animation is reworked to a real-world trained-operator standard
(docs/archive/anim-rework/BRIEF.md). G1 (pure CT) still holds for the rest of the game (BRIEF). (Replaces the footage reference of
G197, G199, G202, G208 ("keyed with the footage as reference") and G209, the speed rocker (loco M25 (7)) and bible 5.12's
CT-footage line; refines G21.)

**G211. MPFB2 in the desktop Blender, nothing bundled.** Michael (2026-10-20 14:40): "Yes, download it". The MakeHuman
Blender add-on MPFB2 (GPL, official release only) is installed into the desktop Blender to rebake Wren's toe weights;
nothing from it ships in the game (the add-on is a tool only; G167's no MPFB code in the game stands); version, source and licences are recorded in docs/operators.

**G212. Jammer on RB while aiming; A interacts at low ready.** Michael (2026-10-20 14:55): "Another button - what makes
sense? RF?" (read as RB) and "Interact always". The held jammer is on RB while the pistol is aimed (RB stays the co-op
action otherwise); at low ready A always interacts, and reload is X hold only. (Replaces G192's "with a gun drawn A
reloads".)

**G213. Realistic night vision, a wider goggle outline, a vision carousel.** Michael (2026-10-20 15:00): "section 1 is
ok, better than before at least but not perfect. Its hard to tell, the night vision is so poor. I cant see properly at
night, and the bodies are very bright. It needs work to make it look more realistic, and to expand the goggle outline
to be less intrusive and show more of the screen, it feels claustrophobic." (15:05): "pressing a button while in the
weapon menu hovered over the vision mode to cycle between them ... press A ... like a carousel". Night vision is made
more realistic, with bodies no longer very bright; the goggle outline is wider and thinner; on the selection wheel, A
on the hovered vision mode cycles the modes like a carousel. (Refines G181.)

**G214. No toggle aim.** Michael (2026-10-20 15:25): "Remove it". Aim is always LT held; the toggle-aim option goes.

**G215. Phones: minimal light and shadow, no letterbox.** Michael (2026-10-20 17:55): "phone loads well but zero
shadows, can we update to it shows shadows/lights but kept to a minimum. I don't want to spend time or resources on
phone. Also screen has letterbox on sides, can we change that too. Minimal work to make it functional. I don't want
phones to overload and get hot. Basic graphics but at least with shadows and light". The phone's minimum preset shows
baked lamp light and one cheap character shadow (no real-time shadow maps), caps the frame rate for heat, and fills any
aspect with no side letterbox; minimal work only. (Refines G182's "every feature off".)

**G216. Phones: native resolution, the menu hero at High.** Michael (2026-10-20 ~18:35-18:50): native resolution at
100% scale (4.15.2, paraphrased), and "menu hero should be best quality on phones if it doesn't cost much" (4.15.3: the
menu at High). (Refines G182's DPR 1 and lowest operator LOD; the resolution is capped by G218.)

**G217. Walk feedback on 4.15.x: fewer, longer strides, no lean below full speed.** Michael (2026-10-20 ~19:10): "full
speed is too quick, and the leg strides should be further apart with less steps, it's too many steps"; "walking forward
on all gears leans too much, it shouldn't lean at all until full speed which should be similar to the lean it has now";
"the legs when walking are too far apart, bring knees and legs in line with the body, I would say almost completely
vertical."; "arms go out in front of body when moving, it looks weird like a zombie. Arms should stay parallel the body
and swing naturally increase slightly more each time you speed up."; "none of the movement feel weighted, but we will
focus on these animations first."; "prototype quick passes only, must be believable, not perfect." A slower full speed
with longer, fewer strides; no forward lean until full speed; knees and legs almost vertical under the body; arms
parallel to the body, swinging a little more at each speed. Quick believable prototype passes.

**G218. No WebGPU for phones yet; 75% resolution cap.** Michael (2026-10-20 ~20:20; paraphrased): asked whether WebGPU
helps the phone, he was answered no for now (the parked trial after the playtest); he chose capping phones at 75%
resolution (4.16.2). (Refines G216's native resolution.)

**G219. Animation tuner: live sliders, functional only.** Michael (2026-10-20 ~20:30): "Yes add the sliders as another
task to be built. Doesn't have to look pretty, just functional. Build fast". An F3 slider panel per state (gait widths,
knees, elbows, arm swing, lean, step, crouch depth, wall gap, climb reach, hold gap) and gun hold per weapon and state,
live, saved in IndexedDB, exported as JSON; pad control followed (~22:10). A Blender round-trip and a posing editor
were discussed, not chosen.

**G220. The wheel scales to the screen; the tuner opens from a menu.** Michael (2026-10-20 ~21:00): "There is animation
issues, almost worse than before. I will wait for the anim tuner to try adjust it first." "Weapon wheel needs to adjust
dynamically based on screen size. Also when is it getting a quick visual Ui pass to make it look better, like the
reference." "Night vision is good now." The selection wheel scales to the screen and gets a quick original radial
restyle after the reference; the FPS banner leaves the top HUD; the tuner opens from a menu and works by touch (an exception to G182's no touch work and the no-touch rule).

**G221. Warehouse lamps on ceilings, translucent roof sheets.** Michael (2026-10-20 ~22:30; paraphrased except the
quote): lamps snapped to ceilings, 3 quick code fittings, translucent corrugated roof sheets in the open sections
("opaque type of corrugated plastic sheet that allow light in but cant be passed through"), walls / ceiling detail and
dead-space clutter. Extra touches (fans, flicker, grime, dock, sound, accents) come after.

**G222. A faint red laser grid shows a camera's view.** Michael (2026-10-20 ~22:35): "a visible cue of where a cameras
vision is ... a red laser grid that is projected onto the surfaces its monitoring possibly"; he chose "Always, faint".
Security cameras project a faint red laser grid onto the surfaces they watch, always on, stronger in electro vision.
Michael's decision, not CT.

**G223. Voxels off by default.** (Replaced by G282, 2026-10-23: the voxel look is retired.) Michael (2026-10-20 ~22:40):
"there still looks to be voxel graphics in the map which is no longer the goal"; he chose "Turn voxels off by default".
(Replaces G68's voxel line.)

**G224. The bunker, then the campaign level; the warehouse rebuild is parked.** (Replaced: the warehouse rebuild by G266
and G295; the order by G291 / G293, 2026-10-24.) Michael (2026-10-20 ~23:40): "Focus should be coop training bunker
completion, then campaign level. Movement still needs work which is top priority." and, on the warehouse rebuild, "We'll
revisit later"; (2026-10-21 ~06:40): "Exclude warehouse rebuild and park it for now. We'll continue to use the
existing." The co-op training bunker comes first, then the first campaign level, with movement top priority; the G201
rebuild is parked and the current Sector Ops warehouse stays
(docs/archive/reviews/warehouse-layout-review.md). The guard AI and model review (docs/archive/reviews/guards-review.md) is not
scheduled.

**G225. Marlow Yard bunker pass: the full audit shortlist.** (Light level replaced by G279, 2026-10-23, and G329,
2026-10-25: lit by default, real-world bands.) Michael (2026-10-20 ~23:40; paraphrased): the full shortlist of
docs/archive/reviews/marlow-yard-audit.md (ceilings, lamp fittings, airlocks, dressing, walls to ceilings, paint, lifts,
fiction); keep the open floor at 0.30 (the open floor's light level, just over the 0.28 shadow line).

**G226. Tuner v2: a stage to pose the body and the gun.** Michael (2026-10-21 ~00:20): "I want freedom to manipulate
the body/animation as needed ... Possibly even a basic stage similar to the old main menu that allows me to make all
the adjustments on the spot using controller or k&m"; "Can I reposition hands on guns, fingers, gun overall size etc?".
The tuner gains camera sliders, a free view, the Anim Studio stage, a loop player, viewing aids and undo / A-B /
presets; then per-joint offsets, hand / foot placement, stepping controls (stuck feet), per-key editing exported as
clip keys, and a weapon group (gun scale visual only, grip, support hand, fingers).

**G227. Michael tunes movement himself; the animation system first.** Michael (2026-10-21 ~00:40): "Priority overnight
is the animation system. Movement has become less important as I will manually fine tune everything as needed." and
"Turn off movement slices and any research." Movement slices and movement research stop; Michael fine-tunes movement
himself as needed, and the animation system and its tools come first. (The priority was set for the night of 2026-10-21.)
(Replaces G150's tune-until-sign-off.)

**G228. Tuner additions.** Michael (2026-10-21 ~01:15-01:20; his choices, paraphrased): smooth state changes, Import
JSON, wider ranges (double-range toggle, typed values), a bake script (export into code defaults), a bypass button
(hold for the untuned animation), slow motion 0.1-1x in normal play, slider search, and per-limb targeting strength
(hand / foot IK weight). Copy state to state is not wanted.

**G229. Three animation tracks at once.** Michael (2026-10-21 16:10; paraphrased): three animation tracks run in
parallel (A tuner tools in Course Ready, B joint bake in CT Core, C skeleton in Menu Notes; docs/archive/marlow-bays/BRIEF.md
"Tracks"); bays B + M run in a cloud session; the jammer / hallway slice J comes later.

**G230. The desktop is the main test machine.** Michael (2026-10-21 16:40): "i dont care about usage on the desktop, i
use the laptop." The desktop runs full e2e at full power (E2E_JOBS=2); the laptop is overflow only (`docs/RULES.md`
"Machines"). (Replaced by G259's laptop main.)

**G231. The laptop is a full second test slot.** (Replaced by G259, 2026-10-22: the laptop is the main test machine.)
Michael (2026-10-21 ~17:45): "I'm not on the laptop any more, it can be loaded up." Until Michael says otherwise the
laptop is a full second test slot (Normal priority, E2E_JOBS=2, any job lead's run when free).

**G232. Phone layout for the tuner only.** Michael (2026-10-21 ~19:00): "Is it difficult to do a fast ui adjustment for
phones only? Touch input and controller will be used." He chose "Yes, tuner only": the animation tuner and Anim Studio
get a phone layout (touch + pad), an exception to M21; the game stays desktop-only (docs/archive/marlow-bays/BRIEF.md item 26).

**G233. Focus on animations, gameplay and the bunker.** Michael (2026-10-21 ~19:20): "We'll focus on fine tuning the
animations, gameplay, and bunker for now." Dev tools and the level editor move to Later.

**G234. A prototype server browser on spare capacity.** Michael (2026-10-21 ~19:50): "Yes add it to the pipeline. It
can proceed as low priority whenever there is spare capacity. Must be prototype only, quick and fast to build." Public /
Private rooms listed through the existing Nostr relays; no quick match, no TURN, no server (docs/archive/marlow-bays/BRIEF.md
item 28, Bays Cloud after rejoin).

**G235. Never hit the 5-hour limit; trim to animation.** (Replaced by G281 and G304: full burn to 100%.) Michael
(2026-10-21 ~20:05): "I don't care about weekly, just
don't hit 5 hour. Trim to animation until 5 hour reset clears, or there's spare headroom around 80%". At ~60% of the
5-hour window slice J and the cloud (R / S) pause and the animation tracks run lean (one agent at a time); at ~85% the
tracks pause too; everything resumes after the reset or when the window has headroom (under ~80% projected).
(Thresholds refined by G236.)

**G236. Animation runs until 98% of the 5-hour window.** (Replaced by G281 and G304: full burn to 100%.) Michael
(2026-10-21 ~20:25): "Dont stop animation until 98% 5
hour, then pause them". The animation tracks run normally until the 5-hour window reaches 98%, then pause at a clean
commit; slice J and the cloud stay paused until the reset or headroom. (Refines G235.)

**G237. Overnight: use the window up to 99%; proceed and review in the morning.** (Replaced by G281 and G304: full burn
to 100%.) Michael (2026-10-21 ~23:00): "Ignore the usage rule for this 5 hour session... The next 5 hour session I will
be going to sleep, so monitor 5 hourly usage and reduce token usage when needed to keep the session running up until
99%. I'd rather usage as much as possible without hitting the limit". Overnight approvals: "Proceed, review AM" (steps
waiting on his OK build on best judgement; screenshots kept for the morning). The orchestrator projects the window and
trims in order Bays Cloud, slice J, then lean tracks; sessions self-pause at 97% before starting an agent; all are
paused by 99%.

**G238. Sector Ops fixes on spare capacity.** Michael (2026-10-22 ~01:40): his list (warehouse lights, LED fittings,
camera range and pitch, a subtle grid, lasers in one vision mode and alarm-only, laser power panels, a security room,
wheel default goggles, more co-op routes); "Priority is still animations right now but any spare capacity can be used as
you see fit." Job sector-fixes (docs/archive/sector-fixes/BRIEF.md), spare capacity.

**G239. A full natural pass over every animation.** Michael (2026-10-22 ~09:00): "All movements must move naturally with
twisting/swaying/balancing hands... The feet also need to get fixed... I want you to do a full pass over all animations
and I will fine tune. Pulling any weapons out also should be believable, and there's a random stop animation when
taking out the weapons". Job anim-natural (docs/archive/anim-natural/BRIEF.md): N0 audit, N1 feet and N2 body motion (CT Core),
N3 weapons (Menu Notes), N4 the rest. Top priority.

**G240. Cameras see in the dark.** Michael (2026-10-22 ~09:05): "Cameras should still work in the dark." Every security
camera sees in the dark (IR) on every map, Sector Ops included; light still matters for guards and the meter.

**G241. Full speed on the weekly; swap accounts at ~98%.** (Replaced by the current swap rule: swap at 100% of the meter
that caps first, `docs/RULES.md` "Swaps and context".) Michael (2026-10-22 ~09:20; weekly at 61%, rising
~5.5%/h): chose "Full speed, swap account": work keeps going, and at weekly ~98% everything is saved and handed off to
another account with docs/orchestrator/HANDOFF.md (prompts one at a time, as on 2026-10-21).

**G242. Sway cap lifted to ~5 cm.** Michael (2026-10-22 ~10:40, anim-natural N0 answers): "Lift to ~5 cm" (SWAY_MAX,
CT Core N2).

**G243. Draw speeds from real-world research; a per-clip speed slider.** Michael (2026-10-22 ~10:40, N0 answers):
"Research what is believable and realistic. Can I fine tune the whole animation speed in anim tuner?" Real-world draw
times with sources set the defaults; the tuner gains a baked per-clip speed slider (it had only view slow motion and
per-key timing) (Menu Notes N3).

**G244. Tuner and test-only PRs skip the full e2e.** Michael (2026-10-22 ~10:40, N0 answers): "Yes, tuner/tests only".
A PR that touches only the tuner / Anim Studio or tests merges on CI plus the suites it touches, no full e2e
(`docs/RULES.md` "Test tiers").

**G245. All sessions stay on Opus.** (Replaced by G302, 2026-10-23: the Opus / Sonnet / Haiku split.) Michael
(2026-10-22 ~11:15; offered Sonnet for the test runner and light reviewers
to stretch the 5-hour window): chose "Keep all Opus". Sessions pause at 97% until the reset instead.

**G246. Merge trains: batch when two or more are ready.** (Replaced by G306 and G318, 2026-10-23: rolling automatic
trains.) Michael (2026-10-22 ~11:25; asked whether to batch updates into larger ones tested once): chose "Batch when 2+
ready" (`docs/RULES.md` "Test tiers", STATE "Merge procedure").

**G247. A train merges as one PR with one version.** Michael (2026-10-22 ~11:40): chose "One PR per batch". (Refines
G246.)

**G248. Fix the load-flaky tests.** Michael (2026-10-22 ~11:40): chose "Fix load-flaky tests". Job flake-fix
(Character Build; test-only tier): e2e-stealth-ai peek head, e2e-netmove client assists, e2e-mouse capture,
e2e-ctcourse station 4.

**G249. Full burn of the weekly tokens.** (Thresholds replaced by G281, then G304, 2026-10-23: full burn to 100%.) Michael (2026-10-22 ~13:30, new account): "using this account, i want to use
all available weekly tokens before the reset. make sure each 5 hour token window hits 99%". All sessions run at full
speed with parallel agents; the orchestrator resumes them after every 5-hour reset; the 97 / 98 / 99% thresholds stay
(STATE "Pacing").

**G250. The run twist is fixed only if it reads more natural.** Michael (2026-10-22 ~13:55; CT Core N2 A1: key 0 pelvis
yaw 25.5 vs ~10 at the other keys, a ~21 deg snap twice a stride): "Only fix it if it will result in a more believable,
realistic, less rigid run". CT Core applies it on a branch and keeps it only if the before / after sheet reads more
natural.

**G251. Unused slide and doorway-sweep clips deleted.** Michael (2026-10-22 ~14:05, N0 pass 2: slide (pose.slide) and
doorway sweep (pose.check) have no trigger and are not CT moves): chose "Delete them" (Menu Notes).

**G252. The idle track is clamped only to clearance.** Michael (2026-10-22 ~14:35; #103's baked idle trackMul 0.05
overlaps the shins ~1.2 cm in anim-audit): "Widen just enough. They didn't clip when I viewed it though". CT Core
clamps the idle track only to clearance.

**G253. Campaign maps are co-op only.** Michael (2026-10-22 ~14:45; solo first vs co-op only): chose "Co-op only".
level-design section 11's solo rules do not bind campaign maps (open item 1 there).

**G254. As many guards as allowed; suggest ways past the cap.** Michael (2026-10-22 ~14:45; story 16 guards vs
SQUAD_CAP 9): "Maximum amount of guards allowable. If there are ways to increase this cap (for example moving to webgpu)
then let me know and make suggestions."

**G255. The campaign spec waits.** (Replaced by G291 and G293, 2026-10-24: the campaign prototypes start on a new small
map.) Michael (2026-10-22 ~14:45): "Ignore campaign spec until Marlow yard and sector ops warehouse are fully
completed".

**G256. Wall block tips the muzzle down.** Michael (2026-10-22 ~16:20, N3b A2, #122): chose "Muzzle down": the gun tips
muzzle-down about the butt. (Replaces the CT muzzle-up of CT Core audit slice G6, walls and doors.)

**G257. Body recoil above CT's 0.5 deg stays.** Michael (2026-10-22 ~16:25, N3b A1): "Keep it" (rifle grip 2.8 cm,
chest 1.5 deg; Gun tuner recoilMul).

**G258. Prune merged branches; #67 closed.** Michael (2026-10-22 ~16:25): prune: "Delete merged ones" (merged branches
and clean worktrees; dirty or in-use ones kept). #67 S2b walk: "Close it" (superseded by the tuner bakes, N1, N2).

**G259. The laptop is the main test machine, on its GPU.** Michael (2026-10-22 ~17:50; the laptop's CPU / GPU are far
stronger): chose "Laptop main" and "Yes, laptop GPU" (`docs/RULES.md` "Machines"). (Replaces G230.)

**G260. Rule review: the orchestrator's picks.** Michael (2026-10-22 ~18:00): chose "Your picks": (1) checker-passed
PRs go straight into trains, src/net / protocol / save PRs keep their area suites; (2) a docs / CHANGELOG / fragments /
test-script delta keeps a test result; (3) the laptop runs two queues (4191, 4192); (4) test-speed round 2 (full run
~27 -> ~15 min); (5) changelog fragments per PR, assembled at the version step; (6) one merge-train script that merges
only on a passing check; (8) refresh the stale roadmap and dashboard. (7) the lock queue file was skipped. Michael also:
"if the desktop is a problem, why haven't you mentioned it? ... you should take initiative to identify bottlenecks and
make recommendations to increase the speed and quality of the results."

**G261. Laptop: finish train 7, then the job area suites.** Michael (2026-10-22 ~19:30 / ~19:45; the laptop was slow
while he used it): "Finish train 7 only"; asked whether it may then run the job area suites, chose "Yes, queue them"
(P, R, N2 one at a time). Other laptop experiments stay off until he frees it.

**G262. Elbow strike: a faster arm.** Michael (2026-10-22 ~20:05, Menu Notes N4c: knockout at STRIKE.hitAt 0.08 s, arm
contact ~0.38 s): chose "Faster arm": the knockout timing stays and the strike animation reaches contact then.

**G263. GPU for any test that benefits; question the rules.** Michael (2026-10-22 ~20:30): "use gpu on any tests that
would benefit" (`docs/RULES.md` "Test tiers"). "Make sure you question rules and ask me if needed, you should be
picking up these things earlier".

**G264. Mocap trial with CMU locomotion, behind a toggle.** (Default off replaced by G298, 2026-10-23: mocap on by
default.) Michael (2026-10-22 ~20:45, after walking 4.58.0; walk / jog / run, turns and starts / stops, and weapons look
broken): "everything else doesn't look convincing". On free mocap: "Are there free mocap animations available? I don't
want to record anything, and I don't want to impact releasing game in future commercially"; then "Trial and cmu
animations first. I want to be able to roll back if they aren't good." Job mocap-trial (CT Core, top priority): CMU
mocap only (free incl. commercial; an approved exception to the "no external art" hard rule for CMU mocap), raw BVH kept
out of the public repo, locomotion retargeted onto Wren behind a toggle
(default off), a side-by-side proof for Michael. Weapons stay hand-keyed for now; Mixamo only if he asks later.

**G265. Vent kick: the pad matches the keyboard.** Michael (2026-10-22 ~21:00, T1 feature/vent-kick; the pad's Y then a
late A also kicked, 33 ms): chose "Yes, match keyboard": holding Y does not kick, the hold carries into A, a Y tap still
kicks.

**G266. Warehouse redesign after Marlow Yard; all loosenings approved.** (Replaced by G295, 2026-10-23: the campus
redesign.) Michael (2026-10-22 ~21:20): warehouse-redesign restarts "After Marlow Yard" (finished and walked); its 15
level-standard loosenings L1-L15
(docs/archive/warehouse-redesign/SPEC.md on feature/warehouse-redesign): "Approve all". (Restarts the rebuild G224 parked.)

**G267. R section 2 gets another co-op route.** Michael (2026-10-22 ~21:20; one co-op route left after two proved
solo-reachable): "Add another", before R merges.

**G268. More CMU takes without asking.** Michael (2026-10-22 ~21:40; more takes for the mocap trial: starts, run turns,
on-the-spot turns): "Yes, CMU only"; no asking per download. (Extends G264.)

**G269. Laptop trial: three browsers on the GPU plus a second slot.** Michael (2026-10-22 ~21:50; laptop GPU full run:
CPU avg 35%, GPU 3D avg 9%, RAM free min 7.6 GB of 31.7): "trial 3 browsers + 2nd slot. monitor performance and ensure
it doesnt affect eachother". Laptop full runs at E2E_JOBS=3 on the GPU plus a second single-suite GPU slot; kept only if
suite times hold (within ~15%), no new load failures, and CPU stays under ~90% outside spikes.

**G270. Laptop: keep three browsers, fix the test.** Michael (2026-10-22 ~22:32; the G269 trial: full run 443 s vs
740 s, one load-only netmove compare miss): "Keep 3, fix the test". Laptop full runs stay at E2E_JOBS=3 plus the second
slot; the netmove compare moves to sim time. (Keeps the G269 trial setup.)

**G271. Mocap locomotion, as captured.** Michael (2026-10-22 ~23:20, after the side-by-side sheets and videos,
feature/mocap-sheets-real docs/archive/mocap-trial/sheets/): "Mocap, as captured". The capture is kept as recorded, not bent to
the old limits (walk pelvis bob 5.5-6.6 cm vs bible D2 4 cm, walk knee-out 3.5 cm, run wrist swing 24 cm vs his 85 cm
hand-keyed tune); checkers report those as notes, not fails. Fix rounds still fix pops and slides. Applies to the mocap
locomotion behind the G264 toggle. (Overrides the bible D2 limits for mocap clips.)

**G272. Marlow Yard final: a flowing co-op training ground.** Michael (2026-10-23 ~00:10, overnight job marlow-final):
"i would like the marlow yard audit to include finalising the map, finishing touches, making sure it flows well, not
just simple square rooms with random walls/pipes/ladders in random places for the sake of using. areas should be well
designed training areas designed to replicate real map coop scenarios (all the cool actions that players can do
together). The yard must focus heavily on coop gameplay, including those discussed recently eg. timed isolation of
lights, cameras, locks, accessing security room to disable cameras, timed jammer exercises, hacking devices in sync, and
any other coop "wow thats cool" experience. Ask questions if needed." Answers: "Rebuild freely" (new layout and routes
where the bays don't flow; keep what works, remove filler); "Plan, then build" (spec from his words, then build straight
on; he reviews both in the morning); one co-op run "15-20 min". Applies to Marlow Yard (G200, G206, G225).

**G273. Mocap: no sheets; clips go in once audited.** Michael (2026-10-23 ~00:10): "i dont need sheets for mocap. you
can audit them and add to the game when ready." Overnight: more mocap clips (crouch walk, sprint, strafe, back-to-wall)
behind the same toggle, checked by a fresh checker, no sheets. (Extends G264 and G268.)

**G274. Overnight jobs, 2026-10-23.** Michael (2026-10-23 ~00:10): more mocap clips (G273), the Marlow Yard audit
(G272) and a guard cap measure (12 / 16 / 24 awake, report only).

**G275. Train runs at JOBS=5.** Michael (2026-10-23 ~00:10): "Yes, if clean" (the load audit's three JOBS=5 runs had
one load-only fail, e2e-desktop:1 navigation timeout, fixed in feature/load-audit; run 1 316 s vs ~490 s at JOBS=3).
Train runs use JOBS=5; back to 3 the first time JOBS=5 causes a failure.

**G276. CMU takes for the new mocap clips: download approved.** Michael (2026-10-23 ~00:15): "Yes, download them"
(crouch walk, sprint, strafe, back-to-wall; named takes, one at a time, each recorded in SOURCES.md). The CLAUDE.md
hard-rule exception covers them: CMU motion-capture takes for the mocap set, converted clips bundled, raw files not
committed, credited in docs/art-credits.md. (Extends G264, G268 and G273.)

**G277. Marlow Yard: the objective list guides, no explainer pads.** Michael (2026-10-23 ~00:30, marlow-final M4): "im
happy to remove the pads in each section that explain things also, we can have the objective list update and keep the
players guided throughout the yard". No explainer pads; the objective list updates per area and guides both players
through the whole yard, with per-player lines where the team splits (docs/marlow-final/BRIEF.md). (Extends G272.)

**G278. Marlow Yard: a believable, luxurious training facility, dressed straight after greybox.** Michael (2026-10-23
~00:30, marlow-final M5): dressing and detail art straight after greybox (each area dressed as its greybox passes; he
accepts ~3-5 h rework if his walk changes the layout); "make it a believable training facility that reproduces
potential real level scenarios. Ensure lighting is sufficient, review the rule if needed. This facility should also be
very expensive, and should adopt a design that is luxurious (LED strips, glass panel where an "instructor" can watch you
train throughout the course, sliding doors, any suggestions you have, these do not have to be in the level, only giving
examples) again you can ask me questions if needed". The no-detail-art rule (the 2026-10-19 "Current goal", lifted for
every map by G288) is lifted for marlow-final only. Art comes from a reusable kit built by in-repo Blender scripts (headless, CC0 textures only); any
loosening of the light rules goes to Michael as a proposal in the spec, never applied. (Extends G272.)

**G279. Marlow Yard: lit, the players cut it; a view-only gallery; normal guards.** Michael (2026-10-23 ~00:45,
marlow-final M6): lighting "lit, players cut it, but you can also use mixed zones if it ends up being a better result. In
game levels are quite dark and not realistic"; the instructor gallery is "View only"; guards: "normal guards. we will
need to create a prototype guard avatar replacement eventually." Areas are brightly lit by default (the LED look) and the
co-op exercises make darkness by isolating lights on timers, with mixed zones where they play better; a change to the
light rules (G225's 0.30 open floor, docs/level-design.md) is proposed in the spec. The gallery is sight only, out of
bounds for players. Guards stay normal guards; a prototype guard avatar replacement goes on the roadmap's Later list.
(Extends G272 and G278.)

**G280. Sector Ops team doors: true two-player pathways, solo play unbroken.** Michael (2026-10-23 ~00:45): "true
2-player pathways that cannot be used solo, but doesnt break solo play". Team doors open only to two players working
together; solo play keeps a working route past them. Course Ready builds it in feature/sector-fixes-r2. (The co-op
routes of G238.)

**G281. Pacing: hit the 5-hour limit as fast as possible.** (Replaced by G302 and G304, 2026-10-23: full burn to 100%
with the model split.) Michael (2026-10-23 ~01:05; replaces the ~00:35 stop at
97%): "I want to hit the 5 hour token limit as fast as possible. Can you push as hard as possible. I will reset as soon as
you hit it." Every session runs at full speed to 100% with parallel agents; WIP is pushed after every agent hand-back, so
a cutoff loses only the step in flight (docs/orchestrator/STATE.md "Pacing"). (Replaces the 97% and 99% stops of G245
and G249.)

**G282. Voxel look retired.** Michael (2026-10-23 ~15:05, native multiple choice, after #226 failed the voxel fit test on
three campus props: "nothing should be voxel"): "Retire it". The `?voxels=1` render path, voxel characters / weapons and
their tests are removed (#236); the lamp / sky / light bakes in `src/voxel` stay as light grids (not drawn). Replaces
G68's "voxels only as the way the world is drawn" and G223's voxel comparison flag.

**G283. An idle lead starts the next feature.** Michael (2026-10-24 ~15:10, standing rule): "if you ever run out of
tasks, start making progress on the next feature/task." A lead with no PLAN slice left starts the next roadmap feature
in its area (Opus plan first) instead of idling; the orchestrator assigns it. First use: Sector Ops 4-player co-op.

**G284. Level standard extras: a connectivity graph and a validator per map.** (Its 40-60% shadow share yields to the
real-world light band: G329, 2026-10-25.) Michael (2026-10-24 ~20:05, native multiple choice after the review of his
stealth-level-design skill): "Add 1-4 as extras". `docs/level-design.md` stays and gains (1) a connectivity-graph JSON
per map before any geometry, checked by a Node validator (port of its validate_level.py with our scale-sheet metrics:
reachability, solo / co-op completability, 3+ approaches of 2+ kinds, dead ends, room sizes, openings, 0.5 m grid,
ceilings, 2+ independent routes, co-op coverage, split parity, beat pacing); (2) a room-size-by-type table in the scale
sheet; (3) numeric targets (routes cross at least once, vantage sees ~70%, 40-60% of floor in shadow, line of sight
breakable within ~5 s, guard counts per space early / late and per player count); (4) co-op rules for level-design
section 11 (splits <= 90 s, path parity within 20%, partners act for each other, an overwatch spot per split, a downed
partner reachable within 15 s, shared routes >= 2.0 m wide). A linear spine between sections, loops inside them. Every
map passes the validator before greybox. Campus is the first run, ~20:12: "Do the entire campus" (S1-S5). Guard counts
(3-6 early, 6-10 late) are checked against our guard sheets before they become rules. Arena mode is parked.

**G285. The validator: scaled rooms, one metrics source, routes per section, measured targets.** Michael (2026-10-24
~20:18) approved G284's plan with four changes: (a) the room table is scaled too (start ~1.3-1.5x real, tuned in
greybox); (b) every size comes from one metrics JSON generated from `docs/design/scale-sheet.md`, none hardcoded in the
script; (c) route redundancy per section: 2+ independent routes from each section's entry to its exit; (d) the declared
numbers (shadow %, 70% vantage, 5 s line-of-sight break, 15 s revive reach) are targets in the layout check and are
measured in greybox, and the map fails if the measure differs; split parity uses traversal time, not room length.

**G286. Train speed-ups: auto-drop, 1-minute ticks, overlapping trains.** Michael (2026-10-24 ~21:00, native multiple
choice; label to master median ~43 min, 5 of 20 trains failed) picked all three: (1) a failing member is dropped and
the train rebuilds at once; (2) auto-train runs every minute (Michael runs the #335 install-task commands for the queue
workers); (3) train N+1 builds on train N and tests on the other machine while N runs (Opus plan first, built after
auto-drop). (Refines G318; replaces G322's 5-minute tick.)

**G287. Two test jobs from the process audit: visual-gate and coop-real.** Orchestrator, under G283 (2026-10-24
~21:32 / ~21:35; ~8 of Michael's ~30 walk finds were visual and 5 were co-op bugs, all passing every test). Assumed,
undoable. Sector Ops builds visual-gate: fixed viewpoints per map at Low / Epic, picture metrics against the last
accepted release, a light-parity grid per map; its own status, flags and does not block a release; a look change is
accepted by Michael or by the orchestrator citing his words. Player Build builds coop-real: an input-only co-op e2e
(real client inputs, no state pokes, background tab, rejoin, E2E_NETSIM=typical), then its fixes. Test jobs, not
refining.

**G288. Process audit: four fix packages, refining allowed, walk pacing, one-click sign-off.** (Walk cap narrowed by
G355, 2026-10-25: it limits switching features on, not building them.) Michael (2026-10-24
~21:50, native multiple choice on `docs/orchestrator/PROCESS-AUDIT-2026-10-24.md`): (1) all four fix packages start
(watchdog and release path, one rulebook and lean docs, cheap swaps, intake gates and small PRs); (2) the "no refining
until Michael playtests the core loop" rule is lifted; (3) "Cap 3 + walk card": at most 3 unwalked features per area (a
lead at the cap works on tests, fixes and automation), and every release gets a 10-minute risk-ranked walk card with
look videos for animation and lighting; (4) "Yes, one-click sign-off": before greybox or art on a map, or a big look
change, Michael approves a one-page to-scale plan and a 5-line intent check with one click. (Replaces G179's "No fine
tuning until that loop plays".)

**G289. Level validator: campus waits for the mission audit; measured pass at greybox exit; dense guards.** Michael
(2026-10-24 ~22:00, native multiple choice on PR #346): (1) the campus S1-S5 fixes and the S3 re-plan wait for the
mission design audit, then are planned with its rules and his one-click sign-off; (2) "Yes, require it": a measured
validator pass (V6 `--require-measured`) is part of the greybox exit; (3) guard density: "I would prefer having as many
guards as realistically possible to make it challenging." Assumed, undoable: no upper band; each space gets the guards a
real site would post, pushed high, limited only by the guard-cap perf floor and every route staying passable; the
validator WARNs only below the 3-6 early / 6-10 late bands. (Extends G254.)

**G290. Mission rules: section restart, up to 2 strict rules, no markers.** Michael (2026-10-24 ~22:12, native multiple
choice on `docs/orchestrator/MISSION-DESIGN-AUDIT-2026-10-24.md`): (1) breaking a mission rule restarts the section
(the team goes back to that section's checkpoint, the mission continues); (2) up to 2 strict rules per mission,
signposted in the briefing and the objective list, "ghost" counting as one; (3) no markers plus an optional hint layer
(off by default); guidance is in-world only (objective text names places, leads, light language, landmarks). (Replaces
G125's "at most one hard rule"; Marlow Yard's guidance is settled by G292, its strict rules by G357.)

**G291. Mission modes and the first prototypes.** Michael (2026-10-24, the same evening and ~22:12): campaign missions
are 2-player co-op only with strict rules; Sector Ops is 1-4 player co-op (G308; solo always possible, G280) with
parallel objectives for two teams (or one player doing them all), strict rules allowed globally, per team or per split.
First prototypes: Three Grey Coats and Two-Key Ledger (campaign, 2p), Split Shift and Code Relay (Sector Ops, 1-4p).
Next: a mission-framework job (objective chains with parallel tracks, rules per mission / team with section restart, an
interrogate-a-named-target objective, validator objective and rule nodes), then the four prototypes; the campus S1-S5
fixes are planned against it with one-click sign-off.

**G292. Marlow Yard is a guided linear course; campaign sections force co-op traversal.** Michael (2026-10-24 ~22:45):
"Marlow is a training course and may have different rules to standard mission, ie its heavily guided and must teach the
players the basics of coop gameplay. All campaign missions are strictly coop and cannot be completed solo, must have
forced coop traversal to proceed (help player climb a wall, throw coop player over a gap to open a locked pathway for
the other player, and any suggestions you have). Marlow should be very linear, 1 route (until later sections where it
teaches multiple objectives/split paths for players to help each other)". Marlow Yard keeps its guidance marks and one
linear route, with split paths and multiple objectives only in its later sections as teaching; G290's no-markers rule
and the multi-route rules bind campaign missions and Sector Ops, not Marlow. Every campaign section forces a co-op
traversal move with no solo bypass. (Extends G253 and G272.)

**G293. The campaign prototypes get a new small map; the co-op traversal kit.** Michael (2026-10-24 ~22:50, native
multiple choice): Three Grey Coats and Two-Key Ledger go on a new small campaign map, "If it's ready before I'm awake,
continue to make progress": greybox may proceed overnight before his sign-off; the sign-off page is still made. The
traversal kit: boost up a wall, throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace / descent,
vent unlock for the partner, plus "Any other creative coop ideas". (Applies G292; an exception to G288's sign-off before
greybox.)

**G294. Guard off-screen animation tier stays at 4 for now.** (Replaced by G327, 2026-10-25: a shadow in view counts as
seen.) Orchestrator (2026-10-24 ~23:46, Michael asleep). Assumed, undoable. PR #360 (tier 4 -> 8) is held: its "seen"
test counts only the camera pass, so a guard just out of view whose shadow falls in view updates at 7.5 Hz and the
shadow's feet slide 21-75 cm; a visible shadow artefact loses to the CPU win. After gm-flip, Guard AI tries
"shadow-in-view counts as seen" (`animTierView.ts`) and measures the saving left; a GPU look of the case goes in
Michael's morning pack. Undo: label #360 train-ready to ship 8 as is.

**G295. Sector Ops redesign: larger, up to 5 sections, harder security that makes sense.** Michael (2026-10-23 ~01:08):
"regarding sector ops, i want to make it larger and with more sections (5 max), accomodate more guards in each section,
more security that gradually gets harder, cameras need to have less range (they currently pick the player up well
outside of the intended area), should have coop only pathways but still able to complete solo if someone wanted to.
doesnt have to keep the same layout or warehouse map. level design must be well flowing, no random lasers or cameras for
the sake of having them, why would they be there in that location, what are they protecting, why would there be melee
only guards they should all have weapons, guards should interact with eachother and have reason to what they are doing
or protecting. must take careful planning and observation to pass. review lighting also, i think the rules may be too
strict and the levels are very dark and unrealistic. there shouldnt always be shadows, the player may have to make
shadows (disabling lights etc). ask me questions as needed". Job sector-redesign. (Replaces G186's three sections and
G266's warehouse rebuild; extends G280.)

**G296. Sector Ops redesign: r2 folded in, its own session, plan then build.** Michael (2026-10-23 ~01:10): "Stop r2,
fold into redesign" (the r2-nav / r2-bolt engine fixes kept, the warehouse geometry work stopped); "Parallel, own
session" (Course Ready leads sector-redesign and drops the marlow-final second-builder role; Marlow Yard and mocap keep
first claim on tests); "Plan, then build" (a spec for all sections, then greybox straight on; he reviews both in the
morning); the camera-range cut and the lighting rule review on "All maps" (one engine change, one level-design lighting
proposal for Michael).

**G297. Sector Ops: a corporate research campus, 30-45 min, up to 24 guards, dogs.** (Guard count replaced by G289 and
G328, 2026-10-25: signed-off counts per section, 32 alive ceiling; how dogs are handled: G348.) Michael (2026-10-23 ~01:20): setting "Corporate
research campus"; one co-op run "30-45 min"; guards "up to 24, each section should gradually get harder with more guards
and more security."; security "Include guard dogs" (cameras, lasers, alarm panels, keypads, then dogs and armed
response). Lighting, the orchestrator's reading of his G295 words: lit like a real site, players cut lights to make
shadows, dark zones only where believable. (Refines G187's per-section counts for this map.)

**G298. Cameras keep IR; every guard armed; both Sector Ops maps; mocap on by default.** Michael (2026-10-23 ~01:25):
cameras "Keep IR everywhere" (G240 stands: cutting lights beats guards and the light meter, never cameras); no
melee-only guards on "Every map" (Marlow Yard and Sector Ops guards all armed); old warehouse "Keep both" (the research
campus is a new Sector Ops map, the warehouse stays selectable); mocap "On by default" once mocap-trial-2 and the new
clips pass their checker, the hand-keyed set behind the switch. (Replaces G264's default off.)

**G299. Guard AI: realistic hearing, caution, investigation and teamwork.** Michael (2026-10-23 ~01:30; job guard-ai,
plan base `docs/archive/reviews/guards-review.md`): "also note that right now every guard hears when things break or someone
gets shot which is unrealistic. if they are within range they should hear it, depending on whether they are near
something noisey, and if they see a guard get killed or find one dead/knocked out they should wake them up (if knocked
out), report them dead, and become cautious. the only way to clear the cautious guards should be to eliminate any that
are aware of what happened, but if they were knocked out the caution can be limited. if its a broken or distrupted
light, one or two people should investigate (if only one is nearby then only one investigates), but they should return
back to normal after investigating the light and general vicinity of the light. guards that get alerted should alert
other guards, either by voice proximity or radio., but not everyone should be alerted at once. any guards in a highly
secure zone should not leave their post or area if they are protecting something of high value or a security door that
shouldnt be accessed, but they should still be able to be distracted at least. always want to improve enemy ai in
general, making them smarter, work together, flank, use cover to hide and report, they should be smart and tactical,
not just rush the player, but any reinforcements must be aggressive. ask me questions if needed"

**G300. Guard AI answers: timed KO caution, reinforcements after a raised alarm, staggered radio, cameras report
bodies.** Michael (2026-10-23 ~01:35): builder "New session" (Night Shift | Guard AI Build); KO caution "Timed, then
search ends" (the woken guard and the one who woke him search, stay cautious a few minutes, then normal); reinforcements
"After a raised alarm" (an alarm panel hit or a radio report that gets through; killing the caller first stops it);
radio "Own section, staggered" (voice range first, then that section over a few seconds; other sections stay normal).
~01:37: "cameras should also see dead or knocked out guards, and report to other nearby guards to investigate if so."
(Applies G299.)

**G301. Overnight: proposed rule loosenings applied, logged and undoable; finished big jobs merge.** (Extended to rules
only Michael may change by G358.) Michael
(2026-10-23 ~01:42; lighting LR1-LR12 `docs/archive/lighting-review/PROPOSAL.md`, marlow-final P1-P17, sector-redesign
P1-P10): "Apply, logged and undoable": builders use them as assumed decisions, each listed for his morning review with
its undo. Big jobs finished overnight (Marlow Yard, Sector Ops campus, Guard AI) that pass their tests: "Merge to
master" (next train, `/preview/`).

**G302. Opus plans and checks, Sonnet builds from strict briefs, Haiku does chores.** Michael (2026-10-23 ~01:45):
"after the reset, i want to make sure you use 99% of each 5 hour limit, but as effectively and efficiently as possible
to make as much progress but as lean as possible on token usage, without sacrificing quality. if opus makes a strict,
comprehensive plan that a lower model can use then you can proceed with agents running on different models. i am open
to your recommendations." He chose "Apply it": Opus 5.5 plans, writes strict slice briefs, reviews and runs every fresh
checker; Sonnet 5.5 builds slices from those briefs (map greybox and data, tests, wiring); Haiku 5.5 does mechanical
chores; leads stay Opus; tricky engine / AI / animation code stays Opus; a failed Sonnet slice gets its fix round from
Opus. (Replaces G88's "Opus builds", G245's all-Opus and G281's 100%; its 99% pacing is replaced by G304.)

**G303. Sector Ops: some guards are unavoidable.** Michael (2026-10-23 ~01:50): "regarding new sector ops map also, make
sure there are sections where at least one guard is unavoidable to reach the objective/exit. they must be distracted,
knocked out, or killed. flexible to your suggestions with that also."

**G304. Pacing: hit the cap as soon as possible, with the model split.** Michael (2026-10-23 ~09:00): "Aim to hit the
cap ASAP, but be efficient with usage between opus, sonnet; and haiku. Use as many agents and laptop/desktop as you need
to progress quickly". Full burn to 100% each window with G302's model split; agents limited only by desktop CPU (trim
when over 90%); both machines test. (Replaces G302's 99% windows.)

**G305. Token efficiency: fewer messages and checkers, more parallel slices.** Michael (2026-10-23 ~09:40): "i want it
running full burn all day, i will change accounts at 99%", then "apply all. maximise token usage during full burn where
possible to achieve more". Orchestrator messages only for PR / train-ready / blocked / needs Michael; clear at ~25-30%
context; spare jobs bundled into one batch PR per train; one checker per batch of slices (Sonnet for greybox / data,
Opus for AI / anim / net); no polling turns; master merged into a branch only when it enters a train. The tokens saved
go to more parallel slices and spare jobs up to the CPU cap (CLAUDE.md "Heavy-usage throughput" at the time).

**G306. Throughput for heavy usage.** Michael (2026-10-23 ~09:50): "update with your token suggestions to accomodate
heavy usage (desktop e2e and merge PRs)". Desktop agents capped so CPU stays under ~80% (3 tsc / vitest agents per
session); the heavy.lock desktop lane runs single GPU suites under 80% CPU; PRs outside src/net / protocol / save enter
trains on CI plus at most two area suites; stacked series share a train; trains at 3+ ready or a 2-hour wait. (Replaces
G246's 2+ trigger; its train trigger and desktop lane are replaced by G318.)

**G307. Reward stealth over shooting as sections get harder.** (Helmet rule (2) narrowed by G338 and G350, 2026-10-25:
Realistic and Perfectionist always have helmets, Perfectionist's cannot be shot off; below that the first headshot
still knocks a helmet off.) Michael (2026-10-23 ~10:10, native multiple choice in Character Build, relayed): theme "reward stealth over
shooting as sections get harder". (1) bulletproof cameras in later sections (shots only ricochet; jam, cut power or slip
the sweep; early sections keep shootable cameras); (2) no instant headshot kills later (a helmet: the first headshot
knocks it off and staggers, the second kills; takedowns stay one move); (3) riot-shield enemies only in alert response
teams; (4) alarms escalate (armour / helmets and a response team per stage; "dont add cameras, that doesnt make sense");
(5) a section rating (undetected / no kills / no alarms / bodies hidden) with real rewards; (6) missed patrol check-ins
and found bodies raise alert; (7) gunfire alerts the section, limited suppressor ammo, no ammo inside a section and one
refill between sections: ~10:20 "there should be ammo refill inbetween sections for now, but none within sections. and
multiple players must be able to use it only once each. it should look like a weapons crate" (replaces his ~10:15 "only
what you start with" and "scarcer ammo later"). Assumed, undoable: the crate tops up to the starting loadout, never
above; weapon ammo only, gadgets unchanged; it sits at the section start / checkpoint; a section restart resets it; a
used crate shows per player (that player's slot empty, prompt gone). (8) shot lamps draw an investigation, breaker cuts
are cleaner; (9) interrogation gives door codes, camera routes, patrol timing; (10) armoured routes (bulletproof glass /
doors) with a quiet bypass (vent, hack, hang-down); (11) response teams stay and search, no stand-down; (12) synced
co-op takedowns reward more than shooting;
(13) heavier late guards: body armour, torso shots only stagger; (14) thermal / night-vision cameras late. Not chosen:
ghost-run bonus gear.

**G308. Sector Ops goes to 4 players after the redesign; Marlow Yard stays at 2.** Michael (2026-10-23 ~10:25): "make a
note to increase sector ops to 4 player coop after the redesigned map is completed. marlow yard stays at 2." Sector Ops
only, up to 4 players, after sector-redesign; Marlow Yard (the campaign training level) stays 2 players. (Replaces
G50's two-player maximum for Sector Ops only; G2 and G50 stand for the campaign and Marlow Yard.)

**G309. Campus gets the full detail-art lift.** Michael (2026-10-23 ~10:40): "add the full detail-art lift of campus as
efficiently as possible". G278's detail-art lift (marlow-final only) extends to `campusOps`: full finish, not greybox
only. (Extends G278.)

**G310. Realistic guards after Sector Ops: all male, larger than Wren, clear variety.** Michael (2026-10-23 ~11:45, on
building guards from Wren's Blender operator pipeline, bible 5.14): "after sector ops. i would prefer clear variety in
guards. They can all be male, and larger build than Wren as she is quite small. Different types of guards should look
different where needed (some may have armour, some without, some helmets etc), and also need to build additional coop
player characters, but would rather fix this after all levels are completed". Job guard-models after sector-redesign
(incl. campus detail art); archetypes look different (armour / helmets per type, matching G307's gear); extra co-op
player characters after all levels are done; guard-render S1 ships meanwhile. (Its order is replaced by G321.)

**G311. The iPad fit: menus and HUD.** Michael (2026-10-23 ~13:05, iPad screenshots of 4.72.0): "what ever happened to
the ipad display fix?" (no earlier record found); "Yes, in Player batch 23". Menus and HUD only: version label inside
the screen, safe-area insets, the Windows GPU banner only on Windows, the pause room-code line no longer clipped (#214).
(Applies G182.)

**G312. Walk 4.72 / 4.73: animations, guards, Marlow Yard restart, real light fittings.** Michael (2026-10-23 ~13:55;
`docs/orchestrator/WALK-4.72-REPORT.md`): "animations are not great, very wonky and unbelieveable"; "we need to fix all
animations anyway, even the normal ones arent good". Guards: lasers draw a search of the laser spot and room, not the
player's real position; body investigations last longer; urgency to alarms and reported bodies; no walking through
each other or doors; holstered in calm areas. Marlow Yard: a checkpoint restart is a full reset (guards, bodies,
cameras, doors); the S3 hallway camera bulletproof. Lighting "not realistic": lights spread like real fittings
(measure and propose). (Extends G239.)

**G313. Anim Studio only from the main menu.** Michael (2026-10-23 ~14:00): "remove anim studio from in game menu, only
accessible via main menu. animation tuner in game menu as is".

**G314. Realistic lamp falloff: try it first; a shadow parity audit.** Michael (2026-10-23 ~14:35, native multiple
choice on LR13, `docs/archive/lighting-review/PROPOSAL.md` section 7): "Try it first": inverse-square lamp falloff (level at
3 m, smooth to 0 at 1.6x radius) behind an in-game settings toggle, default off; the meter, guard perception and the
picture switch together (light parity). ~14:45: "Audit + parity fixes": one Opus audit of shadow-edge parity, moving
occluders (doors, shutters, crates, bodies) updating the bake, and unshadowed flashlights and lamps lighting through
walls; fix what fails; penumbra width and one-bounce fill go on the polish list. (The toggle is removed by G316.)

**G315. Real-time character shadows from the nearest lamps.** Michael (2026-10-23 ~14:42, on CT's key lamps casting
character shadow maps where ours used capsule blobs): "yes i want to include this system now as its one of the main
focus of the game". Slice LR14: the 2-4 lamps nearest the players get real-time character shadow maps in one shared
atlas (WebGL2, inside the 16-texture cap); static geometry stays baked; other lamps keep capsules; render only (meter
and perception keep their model, the parity effect logged; replaced by G352: the meter and guards read character
shadows); on at High+ presets, capsules at Low / Medium, plus a
settings toggle; a GPU and perf run before the train.

**G316. One lighting system on every map: realistic, diffused, a showcase.** Michael (2026-10-23 ~18:08, after 4.78.0):
"Character shadows and new lighting is a huge improvement. Approve updating lighting throughout maps, however light
positioning needs to be improved to prevent all the sharp light bleeding on the walls, the edge of lights should
diffuse against walls/floors/etc unless something directly cuts off the light ray, depending on how far away it is.
Must be realistic depiction of light." ~18:12: "Disable returning to original lighting system, focus on only the one
new system". ~18:15: "I want to make sure we emphasis the light/shadow system like chaos theory did, like a showcase no
matter where you look"; chose "Fold into LR16". ~18:20: "Also, there was still guards torches showing through
walls/doors, and their torches also need to be diffused and not so sharp." Realistic falloff and character shadows on
every map; the Lamp falloff setting and the Classic path are removed (character shadows keep Auto / On / Off); no hard
bright arcs on nearby walls; soft light edges, hard only where an occluder cuts the ray, softer the farther the
occluder (contact-hardening); guard torches stop at walls and shut doors, with soft beam edges; meter and perception
follow the picture. LR16 starts with an Opus audit of every CT light / shadow feature against ours, with GPU sheets of
every map. Sector Ops Build leads. (Replaces G314's toggle and default off.)

**G317. Release speed-ups as the orchestrator recommended.** Michael (2026-10-23 ~18:25): "Approve as per your
recommendations - whichever speed up the process and reduce bottlenecks to achieve faster progress." Job release-speed:
(1) merge-train `build` makes the version commit so CI runs on the train head beside the laptop run, and `release` only
merges / tags / moves dev; (2) PROTOCOL_VERSION asserts read the constant, so one train may carry several wire changes;
(3) `build` runs vitest on the train head first; (4) `release --resume` after a CI fix; (5) CI lint / test / build in
parallel with a node_modules cache and per-branch cancel-in-progress; (6) leads stop merging master before
train-ready (the train build merges and resolves conflicts).

**G318. Pipeline speed-ups: laptop queue, fixed prompts, automatic trains, no desktop e2e.** Michael (2026-10-23 ~19:10,
native multiple choice on `docs/orchestrator/BOTTLENECKS.md`; ~18:55: "be more proactive with identifying bottlenecks
... make it part of your routine somewhere to constantly find bottlenecks") started all four: (1) the laptop queue
service (JSON requests, priority order, trains preempt the second slot, `laptop-e2e` commit statuses); (2) fixed swap
prompts (`docs/orchestrator/PROMPTS.md`); (3) automatic suite selection (`run-e2e.mjs --affected`); (4) housekeeping
(locks carry a PID, stale ones break themselves; `release` closes merged member PRs; alone-measures right after each
release). Rolling trains: "Yes, fully automatic" (a script builds and releases on CI + laptop green, no 3-PR wait).
Laptop on the same account: "No, same account". Desktop: "i dont think software gl is worth it due to it being so much
slower"; ~19:15 "Yes, all three steps": no e2e on the desktop (all suites to the laptop queue), agent CPU cut, hardware
only if still pegged; checkers in parallel with the laptop run: "Yes, parallel". Release pace, after "which one saves
the most time?": the orchestrator's pick at Michael's ask, undoable: at most one release every 60 min or earlier when
the laptop queue is idle. (Replaces G306's train trigger and desktop lane, and G246's batching; one PR per train, G247,
still holds.)

**G319. Tokens for progress: cloud builders, two checkers on AI and net, plan ahead, high effort.** Michael (2026-10-23
~19:25, native multiple choice): "i dont mind how fast we use tokens, only that its making significant progress"; all
four applied: (1) tsc / vitest-heavy builder slices run in cloud sessions (e2e stays on the laptop; Michael creates the
cloud environment); (2) two independent checkers on AI and `src/net` PRs, an Opus triage agent on every laptop failure
the moment it lands, and a decision pack with every question to Michael; (3) Opus briefs the next 2-3 slices and plans
the next roadmap jobs ahead (plans and briefs only, no code; replaces "nothing speculative" for plans); (4) effort high
for every lead; a slice that fails its checker gets Opus for the fix round and Opus builders for its siblings. (Extends
G302 and G305.)

**G320. Guard models look: mid-detail faces, balaclavas on heavies, one look per guard.** Michael (2026-10-23 ~19:45,
native multiple choice on the guard-models plan): faces on most guard kinds, balaclavas on heavy / armoured; "Why do the
faces have to be low-detail? I don't think hero style detail but at least half decent": mid-detail LOD0 faces, lower at
LOD1 / LOD2; the look review is a contact sheet after the bake, no stop, notes into a fix pass; "Same look always" after
a section restart (a per-guard look seed on the wire, one PROTOCOL bump by the train build). (Extends G310.)

**G321. Player Build takes guard models now; a desktop overflow lane.** Michael (2026-10-23 ~20:45, native multiple
choice while AF7-AF9 wait on his walk of AF0-AF6): Player Build takes the guard-models build now, ahead of G310's
"after sector-redesign" order. Desktop overflow: "Yes, overflow only" (the desktop is laptop-queue slot 3, PR requests
only, backlog over 3, CPU under 60%; trains stay on the laptop). (Replaces G310's order; refines G318's no desktop e2e.)

**G322. Auto-train live.** Michael (2026-10-23 ~20:55) ran the register command: the task "NightShift auto-train" runs
every 5 min from `C:/NightShift/Mobile-Coop-autotrain` (a master checkout, pulled when auto-train.mjs changes).
(Applies G318; its 5-minute tick is replaced by G286.)

**G323. Moving lights: flicker and stutter; swinging pendants in Marlow Yard only.** Michael (2026-10-23 ~21:08, native
multiple choice on LR16-5): "Flicker + stutter": fires flicker and one failing tube stutters per main map, through the
light registry so the meter and guard perception follow (light parity); no lightning windows (not in CT co-op). ~21:12:
"Yes to Marlow yard only, campus later if applicable": swinging pendants (sway when shot near or bumped, a
character-shadow slot kept) on Marlow Yard only, campus later only if its perf headroom returns, not the warehouse.
Sector Ops Build, Opus slices and a GPU perf check.

### Decided 2026-10-25 (ROADMAP "Decided" fold)

**G324. Full burn until Michael says to slow down.** Michael (2026-10-25 ~08:25): "100% full burn until I say to slow
down. I want to hit the 5 hour cap as quick as possible as the weekly reset soon". Every session runs at full speed with
parallel agents, up to the CPU caps; no session throttles itself until he says to slow down. (Restates G304.)

**G325. The watchdog adds train-ready.** Michael (2026-10-25 ~08:45, native multiple choice): "Watchdog labels". The
watchdog's `--fix labels` adds `train-ready` once CI `check`, `checker` and `affected-e2e` are green on the PR head, with
no session needed; auto mode still blocks self-approval by sessions. Michael installs it (command given ~08:50).
(Replaces the orchestrator re-labelling every PR.)

**G326. Disk clean-up on both PCs.** Michael (2026-10-25 ~08:45): "delete them, and ask laptop to review nightshift
size also and remove redundant files". The desktop scratch copies were deleted (~14.3 GB freed; top-level notes kept in
scratch/archive-notes); Test Runner reviews the laptop's Night Shift folders.

**G327. Off-screen guard animation: a shadow in view counts as seen.** Michael (2026-10-25 ~08:50, native multiple
choice): "Yes, shadow in view = seen". A guard whose shadow falls in view animates at full rate. Guard AI implements it
in `animTierView.ts` (#360 T1) and measures the CPU saving left; the same `ANIM_TIER_OFFSCREEN` governs guard-cap C1.
(Replaces G294's assumption.)

**G328. Campus S1-S5 signed off.** Michael (2026-10-25 ~08:50, native multiple choice on the sign-off pages,
feature/sector-redesign-signoff fe3ef35f, drawings shown): S1 "Go as drawn (15 guards)"; S2 "Go: void 14.5 m, 18
guards" (3.9 m balcony strips); S3 "Re-plan as drawn, 20 guards"; S4 "One 6 m goods-in lobby" (the page's 25 guards, the
dog included); S5 "26 guards, inside the 32 cap" (no cap raise, no protocol bump). Sector Ops greyboxes all five; the
greybox exit needs the measured validator pass (G289). (Replaces G297's "up to 24" for the campus; settles G289 (1).)

**G329. Real-world light levels.** Michael (2026-10-25 ~09:05): "How do you know campus design gameplay flow is good,
and that there is a realistic amount of light? On the current build the s1 car park is still very dark which is
unrealistic, car parks are generally well lit"; native multiple choice: "Real-world levels". Each space type gets a
real-world illuminance band from the lighting standards (outdoor car parks and roads AS/NZS 1158.3.1, interiors AS/NZS
1680 / EN 12464); engine light is calibrated to lux once and measured from the bake at greybox exit. Stealth comes only
from real gaps (between poles, under carports, behind cars, cut circuits, shot lamps), never from leaving lit places
unlit. Job light-realism (Sector Ops; the S1 car park first, then every map). (The 40-60% shadow share of G284 (3) and
`docs/level-design.md` 5.5 yields to the band; replaces G225's 0.30 open-floor level, already loosened by G279.)

**G330. Bot route-runs at greybox exit, then a walk.** Michael (2026-10-25 ~09:05, the same question): "Bot route-runs
+ your walk". At greybox exit a scripted run walks every declared route (dark / high / loud) of each space against live
guards, logging time, detections and dead stops; then Michael gets a 10-minute walk card. A level-validator slice
(Marlow Build); campus S1-S5 is the first user.

**G331. Sector Ops difficulty: fixed per op, stars, a higher clear fills the lower; scaling stays.** Michael (2026-10-25
~09:45, native multiple choice on a level-designer framework he pasted, "How does this compare to our current design?"):
"Fixed difficulties per op, keep star system. Completing a higher difficulty also considers the lower tiers completed
also." A clear on tier N fills every star below N. Player count: "Keep scaling" (coop4 as built: guards tagged by team
size, alarm reinforcements and revive syringes grow with the players). (Refines G189.)

**G332. Guard density stays.** Michael (2026-10-25 ~09:45): "Keep current": 32 alive is a ceiling, not a target (G187);
room to manoeuvre comes first (G190); the campus counts stand as signed off (G328).

**G333. Hardened lit choke points allowed everywhere.** Michael (2026-10-25 ~09:45): "Everywhere". Un-shootable fixtures
and guarded or locked breakers are allowed at choke points in the campaign and Sector Ops; a route around stays.
(Loosens `docs/level-design.md`'s "every lit chokepoint can be darkened at least two ways" and bible L8.)

**G334. Soft time windows only.** (Marlow Yard may use timed drills: G342.) Michael (2026-10-25 ~09:45, after two
examples: a hard route-closing lockdown and a soft shift-change window): "Soft windows only". Predictable windows (shift
changes, fixed patrol cycles, signposted in the world) are allowed; no countdown closes a route; the no-forced-timers
rule stays.

**G335. Static lookouts and paired patrols.** Michael (2026-10-25 ~09:45): "Add both": static lookouts on some high
routes (pipes, catwalks, vents) and paired patrols that check on each other. G44 (guards see poorly above) stays the base
rule. Guard AI plans it first. (Replaces G11's cut of paired behaviour for this; adds to G180's kept paired searches.)

**G336. Objectives name what and where; no maps at all.** Michael (2026-10-25 ~09:45): "Objectives must name what and
where, but no map, level design must flow naturally towards each objective." and "No maps at all": the briefing's
annotated map and the field-menu map of known intel are removed. The menu / briefing owner is assigned at the next plan;
the validator rules are Marlow Build's. (Extends G290's in-world guidance; replaces the bible's briefing map and
field-menu map.)

**G337. Docs clarity: four fixes, then a re-audit.** Michael (2026-10-25 ~10:20, native multiple choice after the
5-agent docs audit): "I want to make sure my vision is clear constantly. Is there anything we can improve to increase
focus and clarity for Claude?"; fixes A (rule loading), B (`docs/VISION.md`), C + E (the bible rewritten in place with
replaced entries marked, one owner per process rule) and D (the level standard per mode plus the validator) all
approved; "Once this has been completed, I want another audit run and review the rules/vision/level design and anything
to make sure the vision is clear."

**G338. Helmets by difficulty.** (Campaign part settled by G341, 2026-10-25: the same rule; "harder" and "hardest"
named by G350.) Michael (2026-10-25
~09:45): "Keep CT way" (G155); then, asked again after the docs audit about G307's first-headshot helmet (~10:20): "Base
it off difficulty, harder difficulties always have helmets, and hardest difficulty you can't shoot the helmet off."
Asked for Sector Ops. Assumed for the campaign, undoable: CT's alarm-stage helmets (G155) plus the same difficulty rule.
(Refines G307 (2).)

**G339. No minimap, compass or objective blip.** Michael (2026-10-25 ~10:20): "Remove it too": no minimap, compass or
objective blip in any mode. mission-framework A10 is void; its A12 one-chance mission end and window rule kinds conflict
with section restart (G290) and soft windows only (G334): Marlow Build re-plans them. (Extends G336; replaces the
bible's parked minimap.)

**G340. Tallow Wharf is campaign Mission 1.** Michael (2026-10-25 ~10:45, native multiple choice) asked "Which is better
and faster to adapt into campaign mission 1? Kestrel and redesign for today's standards, or new tallow wharf map?"; told
Tallow Wharf is already specced to today's rules (the 2026-10-24 mission research) while Kestrel would be a re-plan, he
chose "Tallow Wharf". Tallow Wharf, the new small campaign map of G293, is campaign Mission 1; Kestrel stays paused
(G53). (Replaces G118's wait for Kestrel's Mission 1 size and the deferred LEVEL-01.)

**G341. Campaign helmets: the same rule as Sector Ops.** (Difficulties named by G350.) Michael (2026-10-25 ~10:45): "Same rule": harder difficulties
always have helmets and on the hardest the helmet cannot be shot off; on the easier difficulties helmets come with CT's
alarm stages (G155). (Settles the campaign part of G338, no longer an assumption.)

**G342. Marlow Yard may use timed drills.** Michael (2026-10-25 ~10:45): "Marlow can use timed drills, it must force
players into situations as a way of training them." Soft windows only (G334) binds the campaign and Sector Ops, not
Marlow Yard. (Narrows G334.)

**G343. Objectives fade in and out in game; View / Select or O shows the current one.** Michael (2026-10-25 ~10:45):
"Objectives can fade in/out in game, must be a short, plain English objective. Can we bind to a button to show
temporarily? Should also should up when updating objective"; binding "View (Select) + O": a tap on View / Select (pad,
CT's Back) or O (keyboard) shows the current objective for ~5 s, and it also shows on every objective update. Each
objective is a short, plain English line. Owner: menu / HUD (to assign). (Replaces G108's "objectives live in the menu"
as the only place; the menu keeps the full list.)

**G344. Doc drift prevention: doc lint in CI, auto-archive, fold rewrites in place, frequent drift audits.** Michael
(2026-10-25 ~11:00, native multiple choice): "how do we prevent this from happening again? Documentation going stale,
duplicate information, redundant information, old branches etc"; he picked "Doc lint in CI" (`scripts/doc-lint.mjs` in
`npm run check`: a stale-term list, replaced G numbers cited as current, broken links, key numbers outside their owner
file, size budgets, an owner / status header per doc), "Auto-archive job docs" (a released job's `docs/<job>/` moves to
`docs/archive/` in the train) and "Fold rewrites in place" (the daily fold updates DECISIONS, the bible and VISION
together; checkers fail appended notes and missed owner files), and wrote "I would like to carry out drift audit more
often to prevent straying from vision." Assumed, undoable: an Opus drift audit daily with the fold and after every batch
of Michael's decisions, on top of doc lint in CI.

**G345. Merged branches pruned weekly.** Michael (2026-10-25 ~11:00, the same question): "Yes, weekly". The
orchestrator deletes branches fully merged into master and older than 7 days, weekly, and logs the list; unmerged
branches are never touched; clean merged worktrees are pruned in the same pass. (Extends G258.)

**G346. Docs first; finished game PRs ship.** Michael (2026-10-25 ~11:05): "Full 100% burn completing these tasks. I
want to use the 5 hour limit before it runs out, but I don't want to proceed with game updates until this documentation
and clarity is fixed moving forward". On the six finished, checked game PRs (#373, #377, #384, #385, #387, #389), native
multiple choice: "Let finished ones ship" (they train when green; only new game work waits). Leads stay unbooted until
the doc PRs land, the re-audit is fixed and the forward plan is agreed (G355).

G347-G360 are Michael's native multiple-choice answers to the doc re-audit questions (2026-10-25 ~11:20-11:35), in
question order (1)-(14).

**G347. The current goal: all three in parallel.** Michael (1): "All three in parallel". Marlow Yard, the Sector Ops
campus and Tallow Wharf each move under their own lead, after the conformance review of G355 (`docs/VISION.md` section
1). (Replaces the bible's Marlow Yard first goal.)

**G348. Sector Ops dogs.** Michael (2): "Penalty for killing, can be knocked out with gas, no takedown, or can be
distracted". A dog cannot be taken down (no palm strike, no grab); gas knocks it out; it can be distracted; killing one
carries a penalty. (Settles how G297's dogs are handled; with G42.)

**G349. Marlow Yard downed: the campaign rule.** Michael (3): "Campaign rule". A downed player in Marlow Yard can be
revived within 30 s, at most twice; both down reloads the checkpoint (G126). A Marlow Yard checkpoint restart stays a
full reset (G312).

**G350. Helmets: Realistic and Perfectionist always.** Michael (4), asked which difficulties are the "harder" ones of
G338 / G341: "Realistic + Perfectionist". On Realistic and Perfectionist every guard has a helmet; on Perfectionist it
cannot be shot off; on Rookie and Normal helmets come only with the alarm stages (G155). The same in the campaign and
Sector Ops (G341). (Names the difficulties of G338 and G341.)

**G351. The objective popup shows what and where.** Michael (5): "What and where". The objective that fades in (G343)
names what to do and where. (Applies G336 to G343.)

**G352. Character shadows count for the meter and guards.** Michael (6): "Meter and guards read them". Light parity holds
for character shadows: the meter and guard perception read the real-time character shadows the picture shows. A build
job; not built yet. (Replaces G315's render-only character shadows and the bible's old L11, "characters do not occlude
gameplay light".)

**G353. Killing a civilian or a protected character restarts the section.** Michael (7): "Section restart". (Replaces
G145's mission fail and the bible's "killing a civilian fails the mission".)

**G354. Tallow Wharf's story is decided with the missions.** Michael (8): "Decide with missions". `docs/story.md` keeps
its Mission 1 plan (Dead Line) as written, with a status line, until then. (With G120 and STORY-03 / STORY-04.)

**G355. A conformance review before new game work; the walk cap limits switch-on only.** Michael (9), on the walk cap:
"What do you recommend? All current maps/features should be revised once documentation work has been completed"; the
recommendation adopted, "Yes (Recommended)": once the doc PRs are on master, each lead runs a plan-only conformance
review of every map / feature in its area against VISION, RULES and level-design (a gap list with fix sizes); the
orchestrator folds them into the forward plan for Michael; then signed-off builds (campus greybox, Tallow Wharf) resume
dark behind flags; the walk cap limits switch-on only; rule fixes to shipped features (for example G339's compass and
blip) are fixes, allowed at the cap. (Narrows G288's walk cap.)

**G356. CT footage numbers are starting values.** Michael (10): "Starting values". The numbers in G25-G36 are starting
values; Michael tunes them by hand. (With G10 and G227.)

**G357. Marlow Yard teaches strict rules late.** Michael (11): "Taught late". Marlow Yard has no strict rules in its
early sections; one strict rule is taught in a late section. (Settles Marlow Yard's strict rules, left open by G290 and
G292.)

**G358. Overnight loosening of a Michael-only rule: assume and log.** Michael (12): "Assume and log". Overnight, a
loosening of a rule only Michael may change is applied as an assumed decision and logged for his review with its undo.
(Extends G301.)

**G359. The campaign caps at 32 alive.** Michael (13): "32 alive, but also research how many guards are normally active
in splinter cell series missions and tell me" (research running). The campaign caps at 32 alive guards, like Sector
Ops: a ceiling, not a target (G187, G332). (Replaces G187's `MAX_ALIVE = 12` for the campaign.)

**G360. The map-spec template follows the current rules.** Michael (14): "Yes, update it". `docs/templates/map-spec.md`
is updated to the current rules.
