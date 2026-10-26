# piano-escape - STATE
Owner: Night Shift | Campaign Build. Status: current.

## RESUME 2026-10-26 ~21:00 (Night Shift | Campaign Build, after the ~20:45 swap; read this block first)
Worktree C:/NightShift/Mobile-Coop-piano-escape, branch feature/piano-escape. ROADMAP Now row 20.
1. Re-check 3 items L1a / L1b / L2 / L5 + polish applied to the PLAN (58a76a36d): period 91.03 = loopPeriod(); t0 to the
   client as one optional field of the  message (claims: protocol.ts, S4); blackoutSearchSlots after fill(); S4
   pass line. SIGNOFF (sign-off 2) sent to the orchestrator ~20:58 for Michael's click (main Q + Q2 + Q3).
2. On Michael's Approve: S1b greybox (Sonnet) from PLAN S1b; tell Sector Ops (SO2 / SO4) the branch + head.
3. Building now (max 2): S2 intro + EMP (Opus) on feature/piano-escape-s2 (worktree -s2), brief
   scratch/campaign/piano/S2-brief.md, report S2-report.md; on stubs (none of #602 / #603 / #604 on master: TODO lines).
   S5 music A/B (Sonnet) on feature/piano-escape-s5 (worktree -s5), brief S5-brief.md, report S5-report.md.
   Each done -> one checker (S2 Opus; S5 Sonnet) -> its own PR to master (or merge into feature/piano-escape if #606 still open).
4. PR #606 (S1 + S3): head 58a76a36d, checker re-posted; CI + automatic affected run pending.
5. Tallow: #522 merged; #578 train-ready (base master); then retarget #581 -> master, then #583.
Next: wait for S2 / S5 and Michael's click; S1b on Approve; #578 train.

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
