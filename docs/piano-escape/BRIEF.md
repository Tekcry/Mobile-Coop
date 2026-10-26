# piano-escape: brief
Owner: Night Shift | Campaign Build. Status: current.

Lead: Night Shift | Campaign Build. Started: 2026-10-26 19:40. Base: master 1b58989ed. ROADMAP Now row 20.

## Michael said
- 2026-10-26 ~19:20, chat (with the Pixabay track "Investigation Piano" by leberch, id 611639, saved at
  C:/NightShift/scratch/music/leberch-investigation-piano-611639.mp3; its Pixabay tags: cinematic, suspense, tension,
  dark, thriller, dramatic, ominous): "I want to experiment with this music in its own project. I've attached its tags
  too. It's an emotional piano that feels very cinematic and emotional. My vision is a black screen, slowly fading in to
  the characters upper chest, zooming out slowly, showing them holding an empty pistol, calmly breathing, and as it
  zooms out it provides more context as there's bullets flying at the character while they are back-to-wall with
  enemies approaching in slow motion. This will lead into an epic stealth escape requiring taking down all enemies with
  a knife. I would like to make this coop also, make it very tense and quiet, with them brutally taking down guards in
  the shadows."
- 2026-10-26 ~19:22, chat: "Continue all other work, but make it more efficient with token usage, don't burn 100%"
  (pace for this job too).

## Michael picked
- 2026-10-26 ~19:28 Q: where the experiment lives -> picked: "Inside Night Shift (Recommended)" (a standalone co-op
  scene on a small test map reusing guards, shadows, co-op and takedowns, kept apart from the main plan).
- 2026-10-26 ~19:28 Q: knife kills against the no-forced-kill rule -> picked: "Kills, this scene only (Recommended)"
  (brutal knife kills allowed as a named exception for this one experiment; G127 and the perfect rating stay everywhere
  else).

## Goal
From a menu entry, two players (or one, for testing) watch a black screen fade in on an operator's upper chest, an
empty pistol in hand, breathing calmly to the piano; the camera pulls back slowly to show them back-to-wall under fire
with guards closing in slow motion; then the scene cuts to play: a quiet, tense escape across a small dark map where
every guard must be taken down with a knife in the shadows before the exit opens.

## Limits
- Out of scope: campaign story, a rating or score, saves beyond settings, new guard AI behaviour (the scene uses the
  guards as built), new lighting systems, polish (prototype mode: Michael 2026-10-26 ~16:20, no tuning before he plays),
  any change to Tallow Wharf, Marlow Yard or Sector Ops.
- Rules that hold: every code hard rule in `CLAUDE.md` (one lighting system and light parity, no network assets, co-op
  only through `src/net` behind `flags.coop`, hot paths allocate nothing); G12 desktop / pad first; G127 and G146 hold
  everywhere except this scene (picked ~19:28); no maps, minimap, compass or markers (G336, G339); every light works,
  darkness from real gaps, cut power or shot lamps (G295, G329, G367); fixed patrols, every detection explainable (bible
  P5, G143); free assets only with a commercial licence, recorded (G407); new map from `docs/templates/map-spec.md` and
  `docs/level-design.md` (only the parts a one-room-to-few-rooms test scene needs; the PLAN names any it skips and why);
  one-page to-scale map plan and 5-line intent check signed by Michael before greybox (G288).
- Areas touched and their unwalked count (cap 3 per area): Campaign (scene, map, intro camera); Player (knife kill
  animations, owned by Player Build). The cap limits switch-on only: this ships dark behind its own flag.

## Answers (M) and assumptions (A)
- M1 2026-10-26 ~19:28: "Inside Night Shift" and "Kills, this scene only" (above).
- A1: One flag `pianoEscape` in `src/core/flags.ts`, read like the others via `darkFlag(.., PREVIEW_ON)`: off in the
  live game, `?piano=1` turns it on, on in /preview/ so Michael can play it there. Undo: plain `darkFlag` without
  PREVIEW_ON.
- A2: 1-2 players. Built and tuned for 2 (Michael: "make this coop also"); one player can run it for testing and for a
  solo look. Undo: `players: [2]` in the scene's mode entry.
- A3: The pull-back with slow motion is a scripted intro (camera, guard and tracer timing slowed); play itself never
  runs in slow motion. The intro can be skipped (hold a button) and is skipped on a restart. Undo: no skip.
- A4: "Empty pistol": the pistol is held but has no ammo for the whole scene; the knife is the only weapon. No gadgets.
  Undo: give a gadget set in the scene data.
- A5: The exit opens only when every guard is down (Michael: "requiring taking down all enemies with a knife"). A guard
  that spots a player raises the alarm as built; if both players are downed the escape restarts from its start (after
  the intro). Downed rules as campaign (G126). Undo: exit always open; alarm ends the run.
- A6: Knife kills are lethal takedowns from Player Build's takedown system with new knife animations (mocap, retargeted,
  G406); "brutally" means a visible, weighty kill with blood kept to what the game already draws (no gore system).
  Undo: drop the new variants, reuse the existing knockout takedowns.
- A7: The music plays from a bundled copy of the MP3 inside the scene's lazy-loaded chunk (no network), only while the
  scene runs; credited in `docs/audio-credits.md` (Pixabay Content License: commercial use allowed, no attribution
  required, credit given anyway). Undo: remove the asset; the scene runs silent.
- A8: Original setting and names (G5, G6): a night in Hollowmere, two NIGHT SHIFT operators, a small building of the
  plan's choice. No radio story beyond one or two subtitle lines, written so they can be voiced later (G82).
- A9: No rating, no score screen: the scene ends on a short fade out after both players reach the exit.

## Questions for Michael (one click each, asked by day)
- Q1 (G288): the one-page to-scale map plan and the 5-line intent check (from the PLAN, after the plan checker) -
  options: "Approve, build it (Recommended)" / "Change it first". Blocks: every build slice. Default until answered: no
  build.

## Sign-off needed
yes: `docs/piano-escape/SIGNOFF.md` (map, intro shot list, guard count) before greybox.
