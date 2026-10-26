# piano-escape - STATE
Owner: Night Shift | Campaign Build. Status: current.

## RESUME 2026-10-26 ~20:25 SAVE (Night Shift | Campaign Build; Michael ~19:40: piano scene is the main focus)
Worktree C:/NightShift/Mobile-Coop-piano-escape, branch feature/piano-escape. ROADMAP Now row 20.
Setting history: piano works (plan approved ~20:15 as drawn) -> bunker (~20:05) -> one room / more guards (~20:10) ->
STORM GRAIN MILL (Michael picked ~20:15; map id `thornbeckMill`, BRIEF A8, A12-A16) -> linear cinematic path, forced
stealth / stalking / solo kills / paired co-op kills (~20:16). The approved opening, EMP and knife rules stand.
1. Redraw of PLAN section 3 + SIGNOFF + map-plan.svg as the storm mill: Opus planner (the original PLAN agent) was
   working at the save. Missing or bunker-shaped at resume -> restart an Opus redraw from BRIEF A8, A12-A16 and the ~20:16
   quote (orchestrator notes: lightning on a fixed timetable tied to the music, light parity; rain masks sound; 12-16
   guards with torches, slow fixed sweep, sweeping pairs; knife + NV only; one exit locked until all down; S5 music
   experiment with a dev A/B picker). Then a quick Opus re-check of the redraw against the BRIEF, then SIGNOFF to the
   orchestrator for Michael's click ("Build the storm mill escape to this plan, with the rule skips above (this scene
   only)?").
2. S1 shell (Sonnet) on feature/piano-escape-s1: flag, `clear` objective, pianoScene (knife + NV only, empty pistol,
   end fade, no record), menu entry, STUB map `thornbeckMill` (no geometry; greybox S1b after Michael's click). Report
   scratch/campaign/piano/S1-report.md; missing -> rerun from S1-brief.md + the lead changes (stub map, thornbeckMill).
3. S3 music DONE feature/piano-escape-s3 876c5e8b8 (20 tests; scratch/campaign/piano/S3-report.md). Waits for S1: one
   Sonnet checker for S1 + S3, merge both into feature/piano-escape, PR (dark).
4. Others: Player knife feature/piano-knife (S1 building; told map id thornbeckMill, scene 'piano' gate unchanged).
   Sector Ops SO1 feature/piano-lights-so1, SO3 feature/piano-lights-so3 building; SO2 / SO4 wait for the greybox
   (tell them branch + head). Guard AI told by the orchestrator.
5. S5 music experiment: the orchestrator rendered 3 original sketches (offline Node synth piano.mjs, no downloads) at
   C:/NightShift/scratch/music/proto/ (sketch-1-held-breath, sketch-2-thornbeck, sketch-3-last-round; .wav + .mp3).
   S5 starts from these (bundle the mp3s + piano.mjs as the in-repo source, dev A/B picker with the Pixabay track)
   instead of composing from scratch: Sonnet, smaller. Michael picks favourites via the orchestrator.
Next: finish the mill redraw -> re-check -> SIGNOFF to the orchestrator; S1 report -> S1 + S3 checker -> PR.
