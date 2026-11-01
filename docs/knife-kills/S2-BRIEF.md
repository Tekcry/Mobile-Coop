# piano-knife S2: real knife clips (Mixamo pairs, CMU 18-23 check)
Owner: Night Shift | Player Build. Status: history (the piano scene was removed in cleanup stage E; the knife kills are every map's lethal takedown, `docs/systems/takedowns.md`). Builder: Opus (animation). Checker: one Opus (no AI or `src/net`
file; RULES "The loop"). Branch `feature/piano-knife-s2` in `C:/NightShift/Mobile-Coop-piano-knife-s2`, from
origin/master after S1 merges (S2 builds on S1's real API; if S1 has its checker PASS but is not merged when S2 starts,
the lead may branch from S1's PASS head instead; never merge master). Est. ~800 lines with tests (~1000 if a CMU pair
fits). Runs parallel with S3: S2 alone edits `knifeKill.ts` (S3 reads it).

Read first: `BRIEF.md` (A3, A7, A8, A10, A14, A15), `PLAN.md` 2.3-2.5, section 3 and S2 in section 4, `CLIP-LIST.md`,
`S1-BRIEF.md` and S1's final report. Prototype mode: starting values, one measure run (item 8), one closest test set,
no tuning passes.

## Goal
Swap S1's stand-in clips for the Mixamo knife pairs Michael downloaded, so every knife kill in the piano scene (map
`thornbeckMill`, `MapDef.scene === 'piano'`) plays a real stab on the attacker and a real death on the guard, still one
two-body move (Michael ~19:45: "Killing a guard should be a physical alteration between them both, 2 character
animation if possible"). Check the CMU two-person subjects 18-23 for a grab-from-behind take that would give both bodies
from one capture; use it for the `behind` row if one fits. Re-measure the hand contacts on the real clips. Every new
clip gets its Anim Studio row (Michael's standing rule: every clip has a Studio row and stays tunable there). Converted
clips are bundled and credited; raw downloads stay out of git.

## Inputs (on disk, never committed)
`C:/NightShift/scratch/mixamo/clips/` (root), downloaded by Michael 2026-10-26 19:56-20:00, no alternates needed:
| CLIP-LIST | File | Slug | Use |
|---|---|---|---|
| K1 | `Stabbing.fbx` | `stabbing` | attacker: behind, behindLow, front |
| K2 | `Standing Melee Attack Downward.fbx` | `standing_melee_attack_downward` | attacker: corner |
| V1 | `Falling Forward Death.fbx` | `falling_forward_death` | victim: behind |
| V2 | `Dying.fbx` | `dying` | victim: behindLow, front |
| V3 | `Falling Back Death.fbx` | `falling_back_death` | victim: corner |
| I1 | `Breathing Idle.fbx` | `breathing_idle` | emitted here for S4b (CLIP-LIST: "S2's builder dumps and emits them"); not wired |

Not used: `Standing Melee Attack Horizontal.fbx` (the dropped slash; Michael ~20:05: "Palm strike knockout disabled,
only knife kills, and no slashing, only animations with the guard"). No dump, recipe, module or credits row for it.

## S1 API this builds on
Read on S1's WIP head d4ea07cad (`feature/piano-knife-s1`); use the merged copy and its names if they moved (same
behaviour; say so in the report).
- `src/game/knifeKill.ts`: `KnifeKillRow { id, attacker, victim, seconds, contact, victimFrom, victimTo, limp,
  standoff, side, yawOff, grip, target }`, `KNIFE`, `KNIFE_KILL_IDS`, `KNIFE_KILLS`, `pickKnifeKill`, `grabAt`,
  `handsAt`, `bucklePitchOf`, `victimPhase`, the private `loadClip(name)` switch (literal dynamic `import()` per clip),
  `loadKnifeClips`, `knifeClipsReady`, `knifeClip(row, victim)`, `resetKnifeClipsForTest`, `buckleAt`.
- `src/game/knifePair.ts`: `KNIFE_MARKS`, `PairTrack` / `newPairTrack` / `resetPairTrack`, `PAIR_TRACK`, `victimRoot`,
  `gripMark`, `knifeMark`, `forearmMark`, `attackerHands`, `victimHands`, `victimHandsW`, `contactErrors(row, ar, vr,
  knife, out)`.
- `src/anim/killDrive.ts`: `newKillDrive`, `killDriveTargets` (samples a one-shot by phase over `clip.frames`).
- `tests/knifePair.test.ts` `runRow`: Wren's operator rig and a grunt rig on a `NullEngine`, `weaponMesh` mocked, the
  attacker walking 0.3 m/s and turning 0.5 rad/s, the game's order per 1/60 s frame.
- Known open problem at d4ea07cad: contact errors 5-40 cm on the stand-ins (target 3 cm). S2 inherits whatever S1
  merged and re-measures on the real clips (item 8, "If contacts miss").

## Out of scope (do not build)
No edit to `knifePair.ts`, `killDrive.ts`, `takedownController.ts`, `enemy.ts`, `gameState.ts`, `studio.ts`,
`studioStage.ts` or any `src/net` file: no IK, solver, timing-code or Studio UI change. No `KNIFE` constant edits: rows
only. No breathing idle wiring (S4b). No slash clip. No alternates, paid packs or hand-keyed fallback (G399). No
second measure run or tuning pass. No `flags.ts` or `pianoScene.ts` edit (Campaign's).

## Files and exact behaviour
1. Dump (desktop, one Blender run under `heavy.lock`; the lead authorises this one run). One Git Bash command with a
   600 s timeout, from the S2 worktree:
   `node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "pk-s2 mixamo dump" --pid "$(cat /proc/$$/winpid)" &&
   node scripts/mocap/mixamo.mjs --only stabbing,standing_melee_attack_downward,falling_forward_death,dying,falling_back_death,breathing_idle;
   node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "pk-s2 mixamo dump"`.
   Output `build/mocap/mixamo/raw/<slug>.json` (gitignored). Each dump must report 30 fps and map every joint
   `mixamoTake.mjs` maps; a failed dump or a different skeleton (not the earlier downloads' character, CLIP-LIST) stops
   the slice: report to the lead, no workaround.

2. `scripts/mocap/mixamoEmit.mjs`: a third place `piano` (the piano scene's lazily loaded clips):
   - `PLACES = ['game', 'studio', 'piano']`; the header comment and the recipes `about` text name it
     (`src/anim/clips/mixamo/piano/`).
   - `modulePath`: every place but `game` is its own subfolder (`studio/`, `piano/`).
   - `moduleText`: the one-folder-down import fix (`'../../../keyed'`) for every place but `game`.
   - The "a clip that changed place" cleanup removes the copy in both other folders.
   - `clipsDoc`: a `piano` row notes "piano scene only (lazy)".

3. `scripts/mocap/data/mixamo-clips.json`: six recipes, all `"place": "piano"`, `"trim": "auto"`, `"channels":
   ["head"]`, `"travel": "none"`:
   - `stabbing`, `standing_melee_attack_downward`, `falling_forward_death`, `dying`, `falling_back_death`: `"kind":
     "timed"`, `"inPlace": "auto"`, `"studio": { "body": "idle" }`, `target` "piano knife kill <attacker|victim>:
     <rows> (piano-knife S2)".
   - `breathing_idle`: `"kind": "loop"`, `"inPlace": true`, `"studio": { "body": "idle" }`, `target` "intro pose
     breathing (piano-knife S4b; emitted in S2, not wired)".
   `file` and `title` exactly as the validator wants (the file name as downloaded, `title` without `.fbx`).

4. Emit: `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs stabbing
   standing_melee_attack_downward falling_forward_death dying falling_back_death breathing_idle` (keyedClip check on;
   `build/mocap/wren-joints.json` is generated on first use). Writes six generated modules
   `src/anim/clips/mixamo/piano/<slug>.ts` (`mocap_<slug>`, never hand-edited) and their six rows inside the
   `@mixamo-keyed-begin` block of `src/anim/mocapSources.ts`. A slug run does not rewrite `docs/mixamo-retarget/CLIPS.md`:
   leave it, say so in the report. These six rows are the clips' Anim Studio rows (the motion-capture group, Mixamo
   set filter, body state `idle` pinned so the tuner's body rows act on them).

5. `src/anim/studioCapturesLazy.ts`: add `'./clips/mixamo/piano/*.ts'` to the lazy glob (and the header comment).
   `studio.ts`'s eager glob `./clips/mixamo/*.ts` does not reach subfolders, so it stays as it is: the piano clips
   stay off the entry chunk (the game loads them only through `loadKnifeClips`, PLAN 2.1 (c)).

6. CMU subjects 18-23 (BRIEF A14; G268: CMU takes download without asking; G406).
   - Read the site's take list for each of subjects 18-23 (http://mocap.cs.cmu.edu/, the subject search). The pairs
     are expected to be 18+19, 20+21, 22+23 with matching take numbers; confirm on the site, do not assume.
   - Shortlist at most 6 takes whose description names a grab, hold, push, pull, choke, drag, fight, struggle or attack
     between the two performers. Download only the shortlisted takes, both subjects' ASF and AMC, one file at a time with
     a 2 s pause, into the S2 worktree's `.mocap-cache/` (gitignored). Record them in `docs/mocap-trial/SOURCES.md` under
     "Downloaded <date> (piano-knife S2)" (take, site description, size KB), as the M3 section there does.
   - For each: `node scripts/mocap/asfamc.mjs <take>` self-check on both subjects; then a take fits only if all hold:
     (a) the two roots are in one lab frame (0.3-3 m apart at frame 0, both on the floor, no body overlap);
     (b) a window of 1.0-2.5 s in which A is behind B (B in front of A at 0.25-0.7 m root distance, B's facing within 60
     deg of A's); (c) A's left hand within 0.2 m of B's head or near shoulder for at least 0.5 s of it; (d) B yields in it
     (pelvis down at least 0.15 m or trunk pitch at least 25 deg).
   - The report gets a verdict table: take, site description, (a)-(d) measured, fits yes / no.
   - None fits: done; K1 + V1 stay the `behind` pair.
   - One fits (the best by (c) if several): a new `scripts/mocap/cmuPair.mjs` (~120 lines) emits both sides over the
     window through `retarget.mjs` `buildSlot(..., { inPlace: true })`, `emit.mjs` `emitOneShot` and `moduleSource`
     into `src/anim/clips/mocap/piano/cmu_<S>_<NN>_attacker.ts` and `_victim.ts` (`mocap_cmu_<S>_<NN>_attacker` /
     `_victim`, header "take <S>_<NN>"); hand-written CMU rows in `mocapSources.ts` above the Mixamo blocks (`take:
     '<S>_<NN>, <s0>-<s1> s'`, `studio: { kind: 'keyed', body: 'idle', cycle: <seconds> }`); the CMU art-credits row
     names the subjects and take; the lazy glob adds `'./clips/mocap/piano/*.ts'`; `loadClip` gets the two cases. The
     `behind` row points at them, with `standoff` / `side` / `yawOff` from the capture's relative root (B in A's frame,
     mean over 0.2 s around the window's peak of (c)). K1 + V1 keep their modules and Studio rows: the fallback is one
     table edit.

7. `src/game/knifeKill.ts` (table and clip loads only):
   - `KNIFE_KILLS` before the measure (starting values; item 8 replaces the measured columns):
     | id | attacker | victim | grip | target | yawOff |
     |---|---|---|---|---|---|
     | behind | mocap_stabbing (or the CMU attacker) | mocap_falling_forward_death (or the CMU victim) | mouth | kidney | 0 |
     | behindLow | mocap_stabbing | mocap_dying | mouth | kidney | 0 |
     | corner | mocap_standing_melee_attack_downward | mocap_falling_back_death | shoulder | neck | 0 |
     | front | mocap_stabbing | mocap_dying | shoulder | chest | pi |
     `seconds` = the attacker clip's own `MOCAP_<SLUG>_SECONDS` clamped to 1.0-1.5 (the bible's takedown; the clip at
     its own speed where the bible allows). `standoff`, `side`, `victimFrom`, `victimTo`, `contact`, `limp`: S1's
     merged values until item 8.
   - `loadClip`: the five stand-in cases are replaced by the five (or seven with CMU) new ones, literal paths
     (`import('../anim/clips/mixamo/piano/stabbing').then((m) => m.MOCAP_STABBING)` and so on). No static import of a
     clip module anywhere in `src/game`.
   - The file's header comment: stand-ins gone, the pairs, "measured by `tests/knifePairFit.test.ts` (KP_FIT=1) on
     <date>".

8. The measure (one run): `tests/helpers/knifePairRun.ts` (new) and `tests/knifePairFit.test.ts` (new).
   - `knifePairRun.ts`: S1's `runRow` harness moved out of `tests/knifePair.test.ts` unchanged in behaviour, taking an
     optional row override (`standoff`, `side`, `contact`, `victimTo`) and returning the per-contact maximum errors over
     their windows (grip: end of grab to `limp`; tip and both guard palms: contact to `limp`) and the root offset error.
     Plus two pure clip measures:
     `stabPhase(clip)`: the phase in 0.2-0.8 of the clip where the right wrist is furthest from the right shoulder (the
     stab's full reach); `standsUntil(clip)`: the last phase before the pelvis first drops more than 0.12 m below its
     frame-0 height.
   - `knifePairFit.test.ts`, only with `KP_FIT=1` (`it.skipIf`): per row, `contact` = `stabPhase(attacker)` clamped to
     0.35-0.55; `limp` = min(contact + 0.35, 0.9); `victimFrom` 0; `victimTo` = min(`standsUntil(victim)`, 1); then a
     grid `standoff` 0.25-0.60 step 0.05 x `side` -0.15-0.15 step 0.05 (56 runs a row; the CMU row keeps its captured
     offset and skips the grid), scored by the largest of the four contact maxima; the lowest wins, a tie goes to the
     value nearer S1's. Writes `build/mocap/knife-fit.json` and prints a table (row, numbers, four maxima).
   - The builder copies the winning numbers into `KNIFE_KILLS` by hand once. No second run.
   - If contacts miss: a contact whose fitted maximum is over 3 cm (`KNIFE.contactTol`) is not tuned further in S2. The
     miss is listed in `tests/knifePair.test.ts` as `KNOWN_MISS: { row, contact, maxM }` (rounded up to the next cm)
     and the builder carries on; the report gives the fit table plus a trace of the worst row (`KP_TRACE=1`). Every
     other contact keeps the 3 cm assertion. DECIDED (lead, BRIEF A16, prototype mode): measured ceilings are accepted
     until Michael plays; the PR names each `KNOWN_MISS` as an open item. The checker FAILs only a miss that is not
     in the report or a ceiling over 10 cm (that is broken, not a miss).

9. `docs/art-credits.md`, Mixamo table, one row per new module (7 cells; repo path
   `src/anim/clips/mixamo/piano/<slug>.ts`, title "<Title> (`<File>.fbx`)", clip name, https://www.mixamo.com/, the
   licence cell as the neighbours, the commit date). "Used by":
   - `stabbing`: "Piano knife kill: attacker, behind / behindLow / front (piano-knife S2)".
   - `standing_melee_attack_downward`: "Piano knife kill: attacker, corner".
   - `falling_forward_death`: "Piano knife kill: victim, behind" (with a CMU pair: "Anim Studio row; piano knife kill
     fallback for behind").
   - `dying`: "Piano knife kill: victim, behindLow / front".
   - `falling_back_death`: "Piano knife kill: victim, corner".
   - `breathing_idle`: "Piano intro pose breathing (piano-knife S4b)".
   Remove S1's "piano knife kill stand-in" notes from the `cross_punch`, `crouch_to_stand` and rifle-death cells (the
   `studio/` cells keep their leading "Anim Studio only"). With a CMU pair, also the CMU table row.

10. `docs/systems/takedowns.md` "Knife kills (piano scene)" (S1's section): the rows' clip pairs and that the numbers
    are measured (`knifePairFit`). Nothing else.

11. Report: `C:/NightShift/scratch/ctcore/pk-s2-REPORT.md` (built, the six recipes, CMU verdict table, fit table with
    the four maxima per row, the new timings from the press (approach 0.22 s + contact x seconds; limp; free), files,
    commits, tests, what Michael should look at). The lead sends the timings to Campaign (A15).

## Claims (files)
- New: `src/anim/clips/mixamo/piano/{stabbing,standing_melee_attack_downward,falling_forward_death,dying,
  falling_back_death,breathing_idle}.ts` (generated), `tests/helpers/knifePairRun.ts`, `tests/knifePairFit.test.ts`;
  only if a CMU pair fits: `scripts/mocap/cmuPair.mjs`, `src/anim/clips/mocap/piano/cmu_<S>_<NN>_{attacker,victim}.ts`.
- Edited: `src/game/knifeKill.ts` (table, `loadClip`, header), `src/anim/mocapSources.ts` (generated rows; CMU rows if
  any), `src/anim/studioCapturesLazy.ts` (glob), `scripts/mocap/mixamoEmit.mjs` (place `piano`),
  `scripts/mocap/data/mixamo-clips.json`, `tests/knifePair.test.ts`, `tests/knifeKill.test.ts`,
  `tests/mocapSources.test.ts`, `tests/studioCapturesLazy.test.ts`, `tests/mixamoEmit.test.ts`, `docs/art-credits.md`,
  `docs/systems/takedowns.md`, `docs/mocap-trial/SOURCES.md` (only with CMU downloads).
- Changed from PLAN section 3: the folder is `clips/mixamo/piano/`, not `clips/mixamo/knife/` (it also holds the intro
  breathing idle). `scripts/mocap/knifePairs.mjs` becomes `tests/knifePairFit.test.ts` (the rig harness needs vitest's
  module mock). The lead updates PLAN section 3 when S2 starts.
- Not touched: everything in "Out of scope". Wire: none. Save paths: none. Maps: none.

## Tests (one closest set, run once; a red test gets one fix and one rerun)
- `tests/knifeKill.test.ts` (S1's file, edited): every row's clips are the S2 names and `mocapSources` keys; no row
  names `mocap_cross_punch`, `mocap_crouch_to_stand` or a `mocap_rifle_death_*`; `seconds` in 1.0-1.5; `0.35 <=
  contact <= 0.55 < limp <= 0.9`; `0 <= victimFrom < victimTo <= 1`; after `loadKnifeClips` every row is ready and
  each `knifeClip(k, v).name` equals the row's clip id; no static import of a clip module in `src/game/knifeKill.ts`
  (read the source text). S1's gate, `pickKnifeKill` and `buckleAt` cases unchanged.
- `tests/knifePair.test.ts`: `runRow` from `tests/helpers/knifePairRun.ts`. S1's assertions unchanged (3 cm at every
  1/60 s sample per contact window, root within 1 mm, corner ends on the attacker's side), now on the real clips;
  `KNOWN_MISS` only as item 8 says.
- `tests/knifePairFit.test.ts`: skipped without `KP_FIT=1`. One always-on case: `stabPhase` and `standsUntil` on each
  row's clips return 0.2-0.8 and 0.05-1.
- `tests/mocapSources.test.ts`: `MODS` reads `clips/mixamo/piano/` (and `clips/mocap/piano/` with a CMU pair; the CMU
  module count 12 -> 14); the slug path check strips `/studio/` or `/piano/`.
- `tests/studioCapturesLazy.test.ts`: the lazy count 108 -> 114 (116 with a CMU pair); the `studio/` count stays 84;
  `EAGER_MIXAMO_FILES` stays 38; `captureClip('mocap_stabbing')` is null before `loadStudioCaptures` and set after.
- `tests/mixamoEmit.test.ts`: the place error text ("game / studio / piano"); the place check (:132) allows `piano` for
  the six recipes; `modulePath` of a piano recipe ends `/piano/<slug>.ts`.
- Existing, must stay green: `tests/killDrive.test.ts`, `tests/knifeTakedown.test.ts`, `tests/takedownAlloc.test.ts`,
  `tests/mocapGuards.test.ts`, `tests/mixamoDriver.test.ts`, `tests/grabMenu.test.ts`.

## Checks
- `npm run typecheck:fast`
- `npx vitest run tests/knifeKill.test.ts tests/knifePair.test.ts tests/knifePairFit.test.ts tests/mocapSources.test.ts
  tests/studioCapturesLazy.test.ts tests/mixamoEmit.test.ts tests/killDrive.test.ts tests/knifeTakedown.test.ts
  tests/takedownAlloc.test.ts tests/mocapGuards.test.ts tests/mixamoDriver.test.ts tests/grabMenu.test.ts`
- Laptop: the PR head's `affected-e2e`; the lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`; `src/game`, RULES
  test table). The checker passes only when they are green.
- One Opus checker. It confirms: only the claimed files changed; no `KNIFE` constant or `knifePair.ts` edit; the
  generated modules match a rerun of the emitter (rerun item 4 with `--dry`, same rows); no raw FBX, AMC or ASF and no
  `build/` file committed; the Horizontal slash clip appears nowhere; the piano clips are not in the entry chunk (no
  static import; not in `EAGER_MIXAMO_FILES`); every new clip has its `mocapSources` row and art-credits row; the
  contact test samples every frame; `KNOWN_MISS` holds only lead-approved entries.
- Look video (laptop GPU queue): the four Studio rows `knife behind`, `knife behindLow`, `knife corner`, `knife front`
  (S1's pair rows, now on the real clips), one video.

## Size
| Part | Lines |
|---|---|
| Generated modules (6 x ~26) + 6 recipes + 6 source rows | ~170 |
| `mixamoEmit.mjs`, `studioCapturesLazy.ts`, `knifeKill.ts` | ~70 |
| `knifePairRun.ts` (moved, ~190) + `knifePair.test.ts` (less ~170) + fit test ~120 | ~330 |
| Test edits (knifeKill, mocapSources, studioCapturesLazy, mixamoEmit) | ~60 |
| Docs (art-credits, takedowns, SOURCES) | ~30 |
| Total, no CMU pair | ~660-800 |
| CMU pair (cmuPair.mjs ~120, 2 modules ~60, rows and test counts ~20) | +~200 |

## Done looks like
- The four Studio knife rows play a real stab on Wren and a real death on the guard, attached as one move: grip hand
  on mouth or shoulder, the knife going in at the stab's full reach, the guard's hands on her forearm, the fall.
- Each of the six new clips loops in the Anim Studio's motion-capture group (Mixamo set).
- In game with the switch off nothing changes; with it on the knife kills play the real pairs (the clips load only
  from `setKnifeScene(true)`).
- Every contact within 3 cm at every sample, or a `KNOWN_MISS` the lead approved.
- The report has the CMU 18-23 verdict table and the measured timings for Campaign.

## Doubts
1. Contacts may still miss 3 cm on the real clips, as on the stand-ins (S1's open problem). Decided (BRIEF A16): measured
   ceilings are accepted until Michael plays; no S2b IK fix before then. The bible's 3 cm rule (5.12.2) stays the
   target.
2. `behindLow` loses the crouched rise: Stabbing starts standing, and the drive blends from the crouched pose over
   `KNIFE.blendIn` 0.12 s, so it will pop. S2 cannot add a per-row blend without a controller edit. Polish list item:
   a `crouch_to_stand` lead-in after Michael plays.
3. The knife kill ignores the Hand-made / CMU / Mixamo animation-source toggle (`animSource.ts`). No hand-made or CMU
   knife set exists, and G399 keeps it on captures.
4. Victim clips are emitted on Wren's format and played on the guard rig (A7). Guard proportions may cost centimetres
   of contact; a guard-proportion emit stays polish.
5. Campaign timings: the measured `contact` moves the stab within 0.68-0.94 s from the press (clamp 0.35-0.55 of 1.3
   s); `limp` and free move with it. The report states them and the lead forwards them to Campaign (A15).
6. CMU 18-23 are mostly social-interaction captures, so a fitting grab-from-behind is unlikely. The check is bounded:
   at most 6 takes downloaded, one verdict table.
