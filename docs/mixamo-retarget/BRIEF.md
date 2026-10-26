# mixamo-retarget - brief
Owner: Player Build. Status: current (2026-10-25). Plan: `PLAN.md`. Clip list for Michael: `CLIP-LIST.md`.

## Michael said (verbatim, ROADMAP "Decided" on origin/feature/menu)
- 2026-10-25 ~18:55, Mixamo (ROADMAP:83): "Mixamo motion capture allowed (2026-10-25 ~18:55; Michael asked "will mixamo
  rigging help us streamline animations, or only for mixamo animations"; native multiple choice "Yes, allow it now"):
  Mixamo clips become an approved motion-capture source beside the CMU takes, retargeted onto the game's own rig
  (wren-rig-game / the guard rigs; the Mixamo skeleton is never used in game). Same handling as CMU: converted clips
  bundled, raw Mixamo files not committed, credited in `docs/art-credits.md`. Michael downloads the clips (Adobe
  sign-in) into `C:/NightShift/scratch/mixamo/clips/` (FBX, without skin). Owner: Player Build."
- 2026-10-25 ~19:00, free assets (ROADMAP:82; Michael's words): "update rules. im happy to use any free
  animations/sounds and anything else, so long as they are allowed to be sold commercially. no copyright." The rule as
  recorded: any free asset may be used when its licence allows commercial sale: public domain / CC0, CC-BY (creator
  credited in `docs/art-credits.md` or `docs/audio-credits.md`) and royalty-free game licences such as Mixamo. Not
  allowed: non-commercial, no-derivatives, share-alike, or an unclear licence. Every asset records its source URL and
  licence in the credits file. IP unchanged: no reference-game names, characters, assets, logos or story (G5, G6);
  names, characters, story, logos, UI art and the goggle stay original.
- 2026-10-25 ~19:05 (relayed by the orchestrator): "i will approve any animation downloaded as requested by player
  build. just approve, download, and implement. make sure i can fine tune in anim dev just in case i have to."

Both ROADMAP entries outrank the CLAUDE.md hard rule "No external art" until the orchestrator's fold lands (authority
order 1 over 5).

## Michael picked
- Mixamo: "Yes, allow it now".
- Free assets: "Commercial use, credit OK (Recommended)".
- The clip list: no approval round (~19:05 above): the clips go in on Player Build's choice.

## Goal
Mixamo clips play on Wren (and, where a slice says so, the guards) through the CMU pipeline that already works
(`scripts/mocap/`, the keyed clip format `docs/mocap-trial/CLIP-FORMAT.md`), replacing weaker hand-made clips, shown and
tunable in the Anim Studio and the anim tuner exactly as the CMU clips are, labelled motion capture with the source
"Mixamo", each credited with its URL and licence.

## Limits
- Blender only headless (`-b`, the pinned 5.2.2 through `scripts/operators/blender.mjs` `findBlender`), at BelowNormal
  priority, under `C:/NightShift/heavy.lock` (take, run, release in one shell command). **Desktop CPU cap now: no
  Blender run until the orchestrator lifts it.** Code, unit tests and plans go on meanwhile.
- Raw FBX files never enter git (they stay in `C:/NightShift/scratch/mixamo/clips/`, outside the repo; Blender dumps
  go to `build/mocap/mixamo/`, gitignored). Only the converted clips (TS modules) are committed and bundled.
- No Mixamo character, skin, mesh or texture is used: skeleton motion only (the downloads are "Without Skin").
- IP: no reference-game names in clip names, code or docs (G6); Mixamo titles are kept as the site names them in the
  credits and the source table only. Never trace reference-game animation.
- Bible 5.12 realism standard holds (audit harness, contact under 1 cm, continuity); mocap keeps its captured bob as
  G271 allows. Hot paths allocate nothing; new runtime data is precomputed at module load.
- No wire, save or `PROTOCOL_VERSION` change: clips are picked locally from the pose state; remotes pose from `MoveState`.

## Assumed decisions (each with its undo)
- **A1 Approval and the walk cap.** Michael's ~19:05 words approve every clip Player Build downloads and implements
  (no approval round). Player / animation is AT CAP (ROADMAP:73), and RULES "Walk pacing" limits switch-on, so until
  the orchestrator rules on whether his words lift the cap for this set: each I slice lands its passing clips with their
  `MIXAMO_ON` entries (`src/anim/mixamo.ts`) true, while the `mixamo` flag (`src/core/flags.ts`) defaults OFF; the whole
  Mixamo set counts as ONE walk-card feature; the first default-on (the flag's default to true) follows the
  orchestrator's ruling, with a walk-card line and the look videos. Undo: the flag's default back to false (or
  `?mixamo=0` for a page); one clip: its `MIXAMO_ON` entry to false.
- **A2 One rollback.** Mixamo clips that replace locomotion clips also follow the existing "Mocap locomotion" setting
  (off = hand-made, as for CMU). Traversal, stance and idle clips follow only the `mixamo` flag. Undo: drop the
  `LOCO.mocap` term from the Mixamo gates in `src/anim/mixamo.ts`.
- **A3 Frame rate.** Downloaded at 30 fps as listed; the adapter resamples to the pipeline's 120 fps (quaternion slerp,
  position cubic) so `retarget.mjs` / `emit.mjs` keep their constants; as the CMU clips, cycles come out at 60 fps /
  48 frames and one-shots at 40 fps (`emit.mjs` `ONESHOT_FPS`). Undo: ask Michael for 60 fps downloads and set `MIXAMO_FPS` in `scripts/mocap/mixamoMap.mjs`.
- **A4 In Place off.** Every clip is downloaded with In Place unticked; the pipeline takes the travel from the hips
  (the CMU way). A clip that arrives in place is detected (hips travel under 5 cm) and treated as on-the-spot. Undo: none
  needed (detection, not a setting).
- **A5 One skeleton (deviation from CLIP-LIST).** The 21 files were exported on Mixamo's auto-rig of Wren's own hero
  mesh (Michael uploaded it), not Y Bot: the same 65-bone `mixamorig` names, proportions close to Wren's. Only the
  skeleton motion is used (no mesh in the files). M2 still measures each file's rest pose and leg scale, never assumes
  them; the bone map accepts any `mixamorig<N>:` prefix and checks the bone set. Undo: re-export on Y Bot; the pipeline
  is the same.
- **A6 Spine chain.** Mixamo has three spine bones, Wren two: Wren `spine` follows `Spine1`, `chest` follows `Spine2`,
  `Spine`'s share goes to the pelvis-to-spine segment through the rest correction; the checker's direction error
  (`retargetDirErrDeg`) must stay under 8 deg, else the slice switches to aiming the segment at the measured joint
  positions. Undo: the two map lines in `MIXAMO_MAP`.
- **A7 Fingers, clavicles, twist.** Mixamo fingers become the keyed `fing` channel (curl and spread per finger);
  `LeftShoulder` / `RightShoulder` become `clav`; Mixamo has no twist bones, so the forearm twist (`fore`) is taken from
  the hand's roll about the forearm, capped at the bible's wrist range. Undo: leave the channel out of the emitted clip
  (identity), one line per channel in the emit recipe.
- **A8 What it replaces.** Each clip replaces the hand-made clip named in PLAN "Clip map" only when it measures at least
  as well on the audit (foot slide, continuity, clipping, range of motion); otherwise it ships in the Studio only and the
  hand-made clip stays. Undo: per clip in `MIXAMO_ON`.
- **A9 Owned elsewhere.** Clips for moves whose game code another job owns (team pull / shutter lift / crawl under:
  Campaign Build's mission-framework and Marlow; body carry, put-down and the knock-out strike: J19, Player's own batch)
  are converted, bundled and shown in the Studio by this job; wiring them is a row in the owner's PLAN / STATE through
  the orchestrator (PLAN "Hand-offs"). Undo: none (no edit of their files).
- **A10 Guards.** Guards never play keyed sets today (`AnimInput.keyedOk` off, pinned by `tests/mocapGuards.test.ts`).
  The Standing Idle on guards is its own late slice behind its own flag, updating that test and the guard fixtures on
  purpose, with the Guard AI lead told first. Undo: its flag off.
- **A11 Licence record.** Adobe's Mixamo FAQ (helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) refused an automated
  read (403); the credits slice copies its licence sentence by hand from the page and records the date read. The
  section opens with the orchestrator's line, verbatim: "Animations from Mixamo (mixamo.com, Adobe), royalty-free for
  commercial use; retargeted onto the game's own rigs; raw files not redistributed." Undo: none.

## Polish list
(empty)
