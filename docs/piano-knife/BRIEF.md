# piano-knife: brief
Owner: Night Shift | Player Build. Status: current.

Job: the knife kill animations and the intro pose for the piano escape scene (ROADMAP Now row 20, main focus).
Base: master 1b58989ed. Sibling job: `feature/piano-escape` (Campaign Build: scene, map `thornbeckMill`, intro camera,
music, EMP, the `pianoEscape` flag, the scene switch in `src/game/pianoScene.ts`). Guard AI owns the scene guards,
Sector Ops the scene lighting.

## Michael said
- 2026-10-26 ~19:20, chat (with the Pixabay track "Investigation Piano" by leberch): "I want to experiment with this
  music in its own project. I've attached its tags too. It's an emotional piano that feels very cinematic and
  emotional. My vision is a black screen, slowly fading in to the characters upper chest, zooming out slowly, showing
  them holding an empty pistol, calmly breathing, and as it zooms out it provides more context as there's bullets
  flying at the character while they are back-to-wall with enemies approaching in slow motion. This will lead into an
  epic stealth escape requiring taking down all enemies with a knife. I would like to make this coop also, make it very
  tense and quiet, with them brutally taking down guards in the shadows."
- 2026-10-26 ~19:22, chat: "Continue all other work, but make it more efficient with token usage, don't burn 100%"
  (ROADMAP Decided: no plans or briefs more than one slice ahead, at most 2 builders per lead).
- 2026-10-26 ~19:40, chat: "I want main focus to be on piano scene. Extra capacity can go towards the remaining tasks."
- 2026-10-26 ~19:45, via the orchestrator: "Killing a guard should be a physical alteration between them both, 2
  character animation if possible."
- 2026-10-26 ~20:05, via the orchestrator: "Palm strike knockout disabled, only knife kills, and no slashing, only
  animations with the guard".
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
G127 / G146 everywhere except this scene; G180 (no dedicated dual move); G399 (players animate from motion capture;
hand-keyed is a developer rollback); G406 / G407 (CMU and Mixamo, retargeted onto the game's rigs, free commercial
licences, credited); G400 (the killer and the victim look the same on every screen; remotes pose from `MoveState`);
bible 5.12.2 (contact under 1 cm, character clipping under 3 cm, takedown 1.0-1.5 s, paired moves within 3 cm at
contact on host and client); prototype mode (starting values, no tuning before Michael plays); ships dark behind
Campaign's scene flag and scene switch.

## Assumed decisions (A)
- A1 The gate. Knife kills exist only when all three hold: Campaign's flag `pianoEscape` is on, the running map is the
  piano scene's (`MapDef.scene === 'piano'`, map id `thornbeckMill`), and Campaign's scene switch is live (set by
  `src/game/pianoScene.ts` when play starts after the EMP, cleared when the scene ends; Campaign PB5). One pure
  function decides it (`knifeSceneOn(flagOn, scene, live)`); `pianoScene.ts` is its only caller, through
  `takedown.setKnifeScene(..)` at play start and `setKnifeScene(false)` at scene end. Every other map and mode, with or
  without the flag, keeps today's takedowns. In co-op the host refuses a client's knife kill on `start` when its own
  switch is off (S3). Undo: delete `src/game/knifeKill.ts` and Campaign's two calls.
- A2 In the scene every takedown is a knife kill on one press (Campaign PB5): the menu's takedown row keeps its label
  ("Takedown"), no tap / hold choice, no grab, knockout, hostage or interrogation; the knife is shown from the press
  until the attacker is free (Campaign answer 6, so former A13 is settled). Undo: drop the forced kill in `start` (the
  grab and knockout rows come back).
- A3 Approaches, from Campaign's guard list, onto the kinds the game already finds (`game/takedown.ts`): from behind
  standing (`behind`, every guard), crouched from low cover (`behind` with the attacker crouched: rises into the kill;
  G1, G3, G8), corner (`corner`, also `overCover`; G2, G4, G7), front or side (`front` / `side`, the fallback). The map
  has no ledges, drops or windows, so no rows for `above`, `drop`, `hangDown`, `window`, `below`, `inverted`: those
  kinds keep today's lethal move with the knife shown. Undo: drop a row from `KNIFE_KILLS`.
- A4 The double (G5 + G6) is two ordinary knife kills started inside the existing `DUAL_WINDOW` 1.5 s
  (`game/dualTakedown.ts:2`; G180: no dual move). S3 checks the two victims fall clear of each other. Undo: n/a.
- A5 Quiet: a knife kill makes 1.2 m of noise (the choke's radius, `takedownController.ts:24`), not the lethal strike's
  3 m. The host uses 1.2 m for a client's knife kill only when its own switch is on (S3). Undo: `KNIFE.noise = 3`.
- A6 The body: at the row's `limp` mark the guard becomes the ordinary dead body (ragdoll, `ai/body.ts`), so carry,
  hide and discovery work as built. Campaign's `clear` objective counts dead or knocked out (answer 7). Undo: n/a.
- A7 Victim clips are emitted onto Wren's keyed format and played on the guard rig, as the Anim Studio's hold pairs
  already do (`game/studioStage.ts:526-540`); a guard-proportion emit is polish for later. Undo: emit per guard rig.
- A8 Mixamo downloads are blocked until Michael signs in, so S1 runs fully on captures already in the repo: attacker
  `mocap_cross_punch` (and `mocap_crouch_to_stand` for the crouched rise), victim the Pro Rifle Pack deaths. The knife
  hand and the grip hand reach their marks by hand IK, so the stand-ins meet the contact rule (A14). S2 swaps in the
  CLIP-LIST clips once downloaded. Undo: n/a.
- A9 "Brutally" is the weight of the motion (a held grip, a close stab, a buckle and a collapse), with blood limited to
  what the game already draws (piano-escape A6). Undo: n/a.
- A10 (Michael ~20:05, no longer assumed) With the knife switch on, the palm-strike knockout (RT close strike and the
  non-lethal takedown) is off from S1: every takedown in the scene is the paired knife kill; there is no knife slash
  at all. Switch off: everything as today.
- A11 The intro pose (Campaign PB6): standing back flat to the wall, the empty pistol low ready in both hands, slide
  locked back, slow calm breathing readable at chest close-up (about a 4 s cycle), the hero mesh for the close-up; the
  partner the same pose, mirrored or crouched, beside him. Offered as `introPose(on, variant)` that Campaign's intro
  drives (in shot from 3 s, chest close-up 3-16 s, pull-back 16-38 s, held on the EMP prompt). The camera, slow motion,
  tracers and EMP are Campaign's. Undo: drop `introPose` (Campaign keeps `wall_idle` + the pistol stance).
- A12 "Empty pistol" needs the slide as its own part (today the pistol GLB joins it into the body,
  `scripts/weapons/py/build_weapon.py:39`): the pistol is rebuilt with a separate slide, as the magazine already is.
  Undo: keep the joined GLB; the empty pistol then only reads as empty by the story.
- A13 In play the pistol stays holstered (empty) and the knife shows only during a kill (settled by Campaign answer
  6). Undo: show the knife for the whole scene from `setKnifeScene(true)`.
- A14 The paired kill (Michael ~19:45). Every knife kill is one two-body move, attacker and guard in contact for the
  whole move, not a stab clip beside a death clip: the attacker's free (left) hand grips the guard (mouth from behind,
  shoulder at a corner or front) by hand IK from the grab to the release; the guard's root and facing are driven from
  the attacker's frame every step and every render frame (attached, not placed once); a buckle layer on his spine and
  chest is timed to the stab; his hands go to the attacker's gripping forearm (hand IK) through the struggle; the
  release hands him to the existing limp / ragdoll. Contact rule: grip hand, knife tip and his hands each within 3 cm
  of their marks at every sample while in contact, on host and client (bible 5.12.2). Mixamo is single-character, so
  pairs are aligned single clips plus IK; S2 also checks the CMU two-person subjects 18-23 for a grab-from-behind /
  struggle take (both sides from one capture, retargeted, G406). Undo: drop the IK and buckle (clips only).
- A15 Timing: the bible's 1.0-1.5 s takedown wins over Campaign's PB1-PB3 targets (contact 0.7-0.9 s, free by
  2.0-2.4 s). Starting values: approach 0.22 s, move 1.3 s, contact at about 0.8 s from the press, limp at about
  1.26 s, the attacker free at about 1.67 s. Sent to Campaign for their e2e timings. Undo: `seconds` per row.

## Questions for Michael
None for Player Build. The Mixamo sign-in (CLIP-LIST) is the orchestrator's ask; the map plan (G288) is Campaign's.
