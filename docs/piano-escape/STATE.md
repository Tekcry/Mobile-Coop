# piano-escape - STATE
Owner: Night Shift | Campaign Build. Status: current.

## RESUME 2026-10-26 ~22:30 SAVE (Night Shift | Campaign Build; read this block first; swap ~22:41)
Main focus: the mill (Michael ~19:40). Worktrees C:/NightShift/Mobile-Coop-piano-escape[-s1b|-s2|-s4|-s5]; briefs, reports
and checks in C:/NightShift/scratch/campaign/piano/. Prototype mode; the lead posts `checker`; docs pushes re-post it.
PRs (all checker PASS, posted):
- #606 feature/piano-escape -> master (S1 shell + S3 music; master merged in 6f89eec17). CI + affected running; the
  orchestrator labels it train-ready and it rides the next train.
- #616 S2 intro + EMP (feature/piano-escape-s2, big-pr), #617 S1b mill greybox + lightning re-time + GA5 deltas +
  openings (feature/piano-escape-s1b, f3a95f277), #618 S5 / S5b music (feature/piano-escape-s5, 1241dfb8c): all base
  feature/piano-escape; retarget each to master after #606 lands (one at a time if they conflict), re-post checker.
BUILDING: S4 (Opus) on feature/piano-escape-s4 = LOCAL INTEGRATION branch (orchestrator ~22:12: no PR until its parts
  land): base d80075557 = feature/piano-escape + #616 + #617 + #618 + knife #614/#620 (feature/piano-knife-s2) + Guard AI
  sweep (feature/guard-ai-piano-sweep f622ae8b8, carries #603) + SO5 #604 (feature/piano-lights-so5); gameState.ts conflict
  kept both (sv seam + takedown.frameLate). Brief S4-brief.md (5 steps: swap S2 stubs, knife switch, co-op t0 field,
  co-op end, two-tab e2e), report S4-report.md (kept current). If cut off: resume from the report's next step.
  At the save: step 1 DONE 02ea8de08 (real sceneDark / blackoutSearchSlots / lightning t0; MapDef.lightning + rain set);
  steps 2-5 left (all worktrees pushed, nothing uncommitted). No extra laptop runs queued (automatic affected only).
  Done -> two Opus checkers (src/net) -> when the parts are on master, re-merge onto master and open its PR.
  S4 told (~22:45) to merge at its next step boundary: SO5b 345c55ac8 (window lights, passed) and Guard AI's final
  sweep 89f13ef1c (PR #624, two Opus checkers running), then re-tune G4 / G5 end waits with sweepPeriod (equal laps).
Knife S4b (introPose, Player Build, builds after the swap; docs/piano-knife/S4b-BRIEF.md on feature/piano-knife): when it lands
  put introPose(true, variant) on S2's TODO(knife S4b) in onIntro ('stand' host / solo, 'mirror' start2) and introPose(false)
  in cut(); answered ~22:50: stay ON the wall at the cut (pistol away). Do not register the hero camera (introPose does).
Waiting on others: #603 / #604 (+ SO5b window lights) / #611 GuardActor (S2 TODO) / #614 + #620 knife / GA6-GA7 PR.
Music: Michael ~21:50 picked intro Investigation Piano, mission Suspense Thriller (S5b); ~21:55 "music isnt settled":
  the orchestrator's 4 realistic tracks (intro-1/2, mission-1/2, feature/music-real) go in as picker rows when it says.
Lightning period 160.04 (Grohl loop); Sector Ops OK'd it. Openings on #617 for SO5b.
SO5b (window lights per opening, feature/piano-lights-so5b 345c55ac8, checker running) + SO2 prebake: re-merge into -s4 at
  their passed head. Accepted as walk-card items (no tuning): 5-20 lux reaches ~3 m not 6; start-bay corner (2.5, 3.5)
  bright where two pools overlap; board gap own light < 1 lux.
SO3 GPU (Sector Ops ~22:35): 16 lit + shadowed torches = 4.9 ms avg / 6.7 p99 on laptop Low 1080p. When #605 is on master
  (or merged into -s4): thornbeckMill torchSlots: 16, torchShadows unset. The first walk keeps 12 guards; G13-G16 are
  allowed by torches (PLAN 3 "Up to 16") - a walk-card question, not a build now.
Re-tune after GA6a lands: G4 / G5 end waits with sweepPeriod(route) (src/ai/sceneSweep.ts), assert equal laps.
Next slices: S6 storm sound (Sonnet, ~250 lines) when #604 is on master. Then the walk card (ETA sent ~22:10: full
  co-op walk Tue 27 ~09:00-11:00; solo first look after #606 / #616 / #617 land).
Tallow: #522 + #578 merged; #581 base master (waiting on affected); then retarget #583.
Next: S4 report -> checkers; #606 -> retarget #616 / #617 / #618; #581 -> #583.

## OLD RESUME 2026-10-26 ~21:00 (Night Shift | Campaign Build, after the ~20:45 swap; read this block first)
Worktree C:/NightShift/Mobile-Coop-piano-escape, branch feature/piano-escape. ROADMAP Now row 20.
1. Re-check 3 items L1a / L1b / L2 / L5 + polish applied to the PLAN (58a76a36d): period 91.03 = loopPeriod(); t0 to the
   client as one optional field of the `sector` message (claims: protocol.ts, S4); blackoutSearchSlots after fill(); S4
   pass line. SIGNOFF (sign-off 2) sent to the orchestrator ~20:58 for Michael's click (main Q + Q2 + Q3).
2. Michael APPROVED sign-off 2 ~20:55 (SIGNOFF + BRIEF Michael picked, 1d9e62f4b): Q2 only the two, Q3 pairs stay.
   He reviews the next section after trialling this one.
3. Building now (max 2): S1b greybox (Sonnet) on feature/piano-escape-s1b (worktree -s1b), brief
   scratch/campaign/piano/S1b-brief.md, report S1b-report.md (lightning + rain as TODO consts until #604 / #603). On PASS:
   tell Sector Ops the head (SO2 / SO4 build on it; told the branch ~21:05). S2 intro + EMP (Opus) on
   feature/piano-escape-s2 (worktree -s2), brief S2-brief.md, report S2-report.md, on stubs (#602-#604 TODO lines).
   GA4 GuardActor = PR #611 (feature/guard-ai-piano-actor; API in its docs/guard-ai/slices/PIANO-GA4-REPORT.md): S2 told
   to shape the stand-in seam to its API (TODO(#611)); swap in when #611 is on master (G1 + G2 need nav; start ~2 m back).
   S2 DONE ad72540cb (report S2-report.md: ~1,540 source lines; e2e-piano via DIRECT_COVERS only); Opus checker
   Opus PASS (S2-check.md) + lead fix (e2e-piano counts electric lamps only) -> PR #616 (base feature/piano-escape,
   big-pr; retarget to master after #606 lands; checker posted). Intro needs the map starts at (4.0, 4.6) / (4.0, 6.0).
   S5 RESUMED ~21:55 (steps 2-3 + addendum). Was: PAUSED after step 1 (3d7a874ab, assets + credits; S5-report.md says steps 2-3 left): resume when a slot frees.
   S5 also adds Michael's three Grohl-form prototypes (~21:15; grohl-a/b/c + grohl-form.mjs; brief addendum).
   And grohl-d/e/f + grohl-epic.mjs (Michael ~21:35; addendum 2): 12 tracks; no reference-game name outside BRIEF.
   Each done -> one checker (S2 Opus; S1b / S5 Sonnet) -> merge into feature/piano-escape or its own PR.
3b. S1b DONE d8b9ef0c3 + lead test fix 5e1bfeaff (pianoScene test: 12 guards, exit zone floorY); 47 piano tests green;
   Sonnet PASS (S1b-check.md) -> PR #617 (base feature/piano-escape; head 9b2c71b8c, checker posted); Sector Ops told
   the head for SO2 / SO4 ~22:35. Polish: thin rails may allow an angled mantle (walk note). Flag-ON-only test lines
   (campusS1 registered list, detailPass map count, rooms default map) wait for the switch-on. Ladder L1 = BRIEF A18 (logged).
   Knife: Player's piano-knife S1 = PR #614 (knifeSceneOn(flagOn, map.scene, live) + setKnifeScene; stab timing
   stand-in); knife S2 real clips = PR #620 on #614: contact 1.05 s, limp 1.57 s, free 1.87 s
   (PLAN Player asks); S4 e2e waits from these. S4 waits for #614 / #620.
4. PR #606 (S1 + S3): was CONFLICTING (CI never ran); master merged in ~22:45 at 6f89eec17 (keep both: main.ts imports,
   sectorOps unlisted + scene), tsc + 47 tests, checker re-posted; CI + affected follow. Docs pushes re-post checker.
4b. MUSIC PICK (Michael ~21:50): intro = Investigation Piano, mission = Suspense Thriller from the EMP press, loop whole;
   Held Breath the one dev alternative; A-F dropped. NOT settled (Michael ~21:55 "music isnt settled, i still want more
   prototypes. can you provide more realistic versions of both songs."): the picker stays open (intro + mission slots) for
   intro-1/2, mission-1/2 from the orchestrator (feature/music-real, scratch/music/real/); add them when it says they landed. S5b DONE: #618 head 1241dfb8c, Sonnet PASS (S5b-check.md), checker
   posted, PR comment. Slots: ?pianointro= / ?pianomusic=grohl|1|pixabay. Polish: piano.mjs still renders sketch 2/3.
   Lightning re-timed (period 160.04, doubles on the Grohl section changes; PLAN 2b) + Guard AI GA5's six data deltas:
   S1b-2 DONE: #617 head 937603b46 (+ f3a95f277: lightning openings for SO5b, 10 entries, no hoist doorway; lead data add), Sonnet PASS (S1b2-check.md), checker posted, PR comment; Guard AI + Sector Ops told
   (Guard AI ~22:20: starts stay; GA6's lap clock runs from the EMP. When GA6a lands: re-tune G4 / G5 end waits with the real
   sweepPeriod(route) from src/ai/sceneSweep.ts (adds 0.8 s slack per leg into a stop + turn time) and assert sweepPeriod(G4) === sweepPeriod(G5) === 40.) Sector Ops (SO5) and Guard AI told.
5. Tallow: #522 + #578 merged; #581 retargeted to master ~22:30 (MERGEABLE, checker posted, affected pending); then #583.
6. S5 DONE 73c2ecd0e (12 tracks, ?pianomusic=pixabay|grohl|1-4|a-f; S5-report.md); Sonnet PASS (S5-check.md) -> PR #618
   (base feature/piano-escape; head 4f9971281, checker posted). S6 (storm sound) waits for #604 on master. S4 waits for knife #614, GA6 / GA7, SO2-SO5.
Next: #606 lands -> retarget #616 / #617 / #618 to master (one at a time; the 2nd and 3rd after the 1st lands if they conflict); #581 lands -> retarget #583; S6 when #604 is on master.

## OLD RESUME 2026-10-26 ~20:25 SAVE (Night Shift | Campaign Build; Michael ~19:40: piano scene is the main focus)
Worktree C:/NightShift/Mobile-Coop-piano-escape, branch feature/piano-escape. ROADMAP Now row 20.
Setting history: piano works (plan approved ~20:15 as drawn) -> bunker (~20:05) -> one room / more guards (~20:10) ->
STORM GRAIN MILL (Michael picked ~20:15; map id `thornbeckMill`, BRIEF A8, A12-A16) -> linear cinematic path, forced
stealth / stalking / solo kills / paired co-op kills (~20:16). The approved opening, EMP and knife rules stand.
1. Storm mill redraw DONE (PLAN 7e38ef3ca, SVG 0d9ad4f41, SIGNOFF b294900d2: 32 x 18 m, ground + north gallery, 10
   stretches, 12 guards G1-G12 (+G13-16), flash timetable, S5 music, S6 storm). Opus re-check 2 running ->
   piano-plan-check.md "Re-check 2". PASS -> SIGNOFF to the orchestrator for Michael ("Build the storm mill escape ...").
2. S1 shell (Sonnet) on feature/piano-escape-s1: flag, `clear` objective, pianoScene (knife + NV only, empty pistol,
   end fade, no record), menu entry, STUB map `thornbeckMill` (no geometry; greybox S1b after Michael's click). Report
   scratch/campaign/piano/S1-report.md; missing -> rerun from S1-brief.md + the lead changes (stub map, thornbeckMill).
3. Wave 1 = PR #606 (feature/piano-escape -> master, 8b8ca2757): S1 shell + S3 music merged in, Sonnet batch PASS
   (scratch/campaign/piano/S1-S3-check.md), checker posted; automatic affected run only. Flag-on test fixes
   (rooms / campusS1 / detailPass) go with S1b. Further slices: new branches off feature/piano-escape, new PRs.
4. Others: Player knife feature/piano-knife (S1 building; told map id thornbeckMill, scene 'piano' gate unchanged).
   Sector Ops SO1 feature/piano-lights-so1, SO3 feature/piano-lights-so3 building; SO2 / SO4 wait for the greybox
   (tell them branch + head). Guard AI told by the orchestrator.
5. S5 music experiment: the orchestrator rendered 3 original sketches (offline Node synth piano.mjs, no downloads) at
   C:/NightShift/scratch/music/proto/ (sketch-1-held-breath, sketch-2-thornbeck, sketch-3-last-round; .wav + .mp3).
   S5 starts from these (bundle the mp3s + piano.mjs as the in-repo source, dev A/B picker with the Pixabay track)
   instead of composing from scratch: Sonnet, smaller. Michael picks favourites via the orchestrator.
6. SO5 lightning built (PR #604): MapDef `lightning: { flashes: [{ t, peak, len }], period? }` (double = two entries);
   clock = shared sim clock minus `world.lightning.t0`; set t0 at the EMP press (host + client both get it); drive
   thunder AND music cues from `flashAt`, never each machine's music time (drift). Light enters only through real
   openings (windows, board gaps); keep the pre-EMP electric lamps (window-pool path needs one fixed lamp). Look:
   `?lightning=1`. TODO after re-check 2: PLAN flash timetable restated from t0 = EMP press (not track time), S6 uses it.
7. ~20:45 USAGE LIMIT. Redraw fix round 2 pushed (PLAN 9b237f61c, SVG c04187955, SIGNOFF 1605c60fa). Re-check 3 = FIX on
   three lead-sized items (piano-plan-check.md "Re-check 3"); B1 (the Grohl line in BRIEF) is fixed. Still to apply in
   the PLAN (one small Opus fix, then SIGNOFF to the orchestrator without another full re-check):
   L1a lightning `period: 91.03` (S3 loop restarts every 91.03 s, scenePiano.ts:66-68) + S1b test period == loopPeriod();
   L1b the client learns t0: S4 sends the host's EMP-press time as one optional field in the existing sector state
   (claims `protocol` line updated; no PROTOCOL_VERSION bump, the train does it);
   L2 S2 calls blackoutSearchSlots after the opening guards exist (not in the spawn step) + a test that it returns 2;
   L5 polish: S4 survivable-start pass line ("both players reach the low sacks within 4 s, no guard past suspicious").
Next: apply L1a / L1b / L2 / L5 to the PLAN -> SIGNOFF to the orchestrator for Michael's click; PR #606 rides the train.
