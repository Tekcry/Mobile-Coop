# piano-knife: brief
Owner: Night Shift | Player Build. Status: current.

Job: the knife kill animations and the intro pose for the piano escape scene (ROADMAP Now row 20, main focus).
Base: master 1b58989ed. Sibling job: `feature/piano-escape` (Campaign Build: scene, map, intro camera, music, EMP,
flag). Guard AI owns the scene guards, Sector Ops the scene lighting.

## Michael said
- 2026-10-26 ~19:20, chat (with the Pixabay track "Investigation Piano" by leberch): "I want to experiment with this
  music in its own project. I've attached its tags too. It's an emotional piano that feels very cinematic and
  emotional. My vision is a black screen, slowly fading in to the characters upper chest, zooming out slowly, showing
  them holding an empty pistol, calmly breathing, and as it zooms out it provides more context as there's bullets
  flying at the character while they are back-to-wall with enemies approaching in slow motion. This will lead into an
  epic stealth escape requiring taking down all enemies with a knife. I would like to make this coop also, make it very
  tense and quiet, with them brutally taking down guards in the shadows."
- 2026-10-26 ~19:22, chat: "Continue all other work, but make it more efficient with token usage, don't burn 100%"
- 2026-10-26 ~19:40, chat: "I want main focus to be on piano scene. Extra capacity can go towards the remaining tasks."
- 2026-10-26 ~19:55, chat (Campaign's part, shapes the intro): "Also, right before giving the player control, once the
  player knows they are surrounded and getting shot at and they have no ammo, they should activate an EMP which knocks
  out all the lights, forcing all the guards to use flashlights and the mission will play in pure darkness."
- Earlier, binding here: Q39 / G400 "yes players must look exact in everyones games".

## Michael picked
- 2026-10-26 ~19:28: "Inside Night Shift (Recommended)" (a standalone co-op scene on a small test map reusing guards,
  shadows, co-op and takedowns, kept apart from the main plan).
- 2026-10-26 ~19:28: "Kills, this scene only (Recommended)" (brutal knife kills allowed as a named exception for this
  one experiment; the no-forced-kill rule G127 and the perfect rating stay everywhere else).

## Rules that hold
G127 / G146 everywhere except this scene; G399 (players animate from motion capture; hand-keyed is a developer
rollback); G406 / G407 (CMU and Mixamo, retargeted onto the game's rigs, free commercial licences, credited); G400
(the killer and the victim look the same on every screen; remotes pose from `MoveState`); bible 5.12.2 (contact under
1 cm, character clipping under 3 cm, takedown 1.0-1.5 s, paired moves within 3 cm at contact on host and client);
prototype mode (starting values, no tuning before Michael plays); ships dark behind Campaign's scene flag.

## Assumed decisions (A)
- A1 The gate. Knife kills exist only when Campaign's scene flag is on (`pianoEscape`, piano-escape BRIEF A1) AND the
  running map is the piano scene's map. One pure function decides it (`knifeSceneOn`), read once when the scene starts;
  every other map and mode, with or without the flag, keeps today's takedowns. The host also refuses a client's knife
  kill unless its own gate is on. Undo: delete `src/game/knifeKill.ts` and the one call in the scene's start.
- A2 In the scene every takedown is a knife kill: the hold-A row keeps its usual label ("Takedown") and kills; no
  grab, no knockout, no hostage, no interrogation there. Undo: `KNIFE.forceKill = false` (the grab and knockout rows
  come back, the knife only on the lethal hold).
- A3 Approaches, mapped onto the takedown kinds the game already finds (`game/takedown.ts`): from behind standing
  (`behind`), from behind crouched (`behind` with the attacker crouched: the clip rises into the kill), from cover /
  corner (`corner`, `overCover`), from the front or side (`front` / `side`, the fallback), from above (`above`, `drop`,
  `hangDown`: later slice, reusing those moves with the knife shown and a kill victim clip). Undo: drop a row from
  `KNIFE_KILLS`.
- A4 The double kill is two knife kills inside the existing 1.5 s dual window (`game/dualTakedown.ts`), no new paired
  four-body move. Undo: n/a (nothing added).
- A5 Quiet: a knife kill makes 1.2 m of noise (the choke's radius, `takedownController.ts:24`), not the lethal strike's
  3 m. Undo: `KNIFE.noise = 3`.
- A6 The body: after the victim clip's limp mark the guard becomes the ordinary dead body (ragdoll, `ai/body.ts`), so
  carry, hide and discovery work as built. Undo: n/a.
- A7 Victim clips are emitted onto Wren's keyed format and played on the guard rig, as the Anim Studio's hold pairs
  already do (`game/studioStage.ts:526-540`); a guard-proportion emit is polish for later. Undo: emit per guard rig.
- A8 Slice 1 runs on captures already in the repo (Mixamo Cross Punch for the stab, the Pro Rifle Pack deaths for the
  victim) so it is not blocked on downloads; slice 2 swaps in the CLIP-LIST clips. Undo: n/a.
- A9 "Brutally" is the weight of the motion (a held, close stab and a collapse), with blood limited to what the game
  already draws (piano-escape A6). Undo: n/a.
- A10 The RT close strike in the scene stays the palm strike knockout until slice 5 makes it a knife slash kill. Undo:
  leave slice 5 out.
- A11 The intro pose is offered as a pose call Campaign's intro camera drives: back to the wall, pistol at the wall
  low ready, slide locked back, a captured breathing idle on the trunk, the hero mesh for the close-up. The camera,
  slow motion, tracers and EMP are Campaign's. Undo: drop `introPose`.
- A12 "Empty pistol" needs the slide as its own part (today the pistol GLB joins it into the body,
  `scripts/weapons/py/build_weapon.py:39`): the pistol is rebuilt with a separate slide, as the magazine already is.
  Undo: keep the joined GLB; the empty pistol then only reads as empty by the story.

## Questions for Michael
None needed: the scene's map plan (G288) is Campaign's question. Downloads (CLIP-LIST) go through the orchestrator.
