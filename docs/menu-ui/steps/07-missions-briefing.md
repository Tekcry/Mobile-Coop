# Step 07 - missions-briefing (Block B)
Missions cards (MD8), the Mission briefing screen, Training and Free roam lists and the Legacy screen; the Play hub
goes. Deps: 06. Model: Opus 5.5 / Opus 5.5. Local only.

## Read
- SPEC.md 7.5-7.9, 7.1 (loading variant); DECISIONS MD5, MD6, MD8; bible 5.8 (lines on campaign progress, spoilers,
  briefing, difficulty: grep "Spoiler", "Briefing", "Difficulty:"); story.md section 8 sample briefing.
- `src/ui/screens/playScreen.ts` (all), `src/config/missions.json`, maps registry (`MAPS`, `modes`), the save shape
  for mission results (`src/save`), locomotion step 19 difficulty (`resolveDifficulty`, `gameplay.customDifficulty`).
- Prototype `SCR.missions`, `SCR.briefing`, `SCR.freeroam`.

## Task
1. `missionsScreen.ts` (SELECT / MISSION): cards for the campaign missions in order; rating % (best stealth rating or
   "--"), number and name, meta "district · best NN% · date"; locked cards dimmed with the reason "Complete <previous>
   to unlock."; context: district, best rating, intel found, last played. Default focus: newest unlocked. Dev / greybox
   missions only with `?dev=1` under a DEV label.
2. `briefingScreen.ts` (MISSION / BRIEFING): Insertion cycler, Difficulty (Rookie / Normal / Realistic /
   Perfectionist / Custom; Custom shows Base preset + three sliders 0.5-2.0 step 0.1 and switches back when a preset
   is picked), Loadout (opens Loadout), Deploy (default focus). The briefing text (mission data, 4-6 lines) in a second
   context block; a "Map: Phase 4" line. Y = Loadout.
3. Continue opens the briefing of the current mission at its checkpoint (Back -> main menu). Missions -> Briefing ->
   Back -> Missions.
4. Training list (TRAINING / COURSES) and Free roam list (FREE / ROAM) per SPEC 7.7-7.8, Weather row when offered.
5. Legacy (`?legacy=1`): today's Play rows on the row template (no new features).
6. Remove the Play hub (`PlayScreen`) and the step 04 shims; keep its deploy plumbing as a shared function.
7. Loading overlay: mission name, district, first briefing line.
8. Text: British spelling, story.md tone; missing briefing text for missions 2-8 shows only the district (no invented
   plot).

## Tests
- e2e-menus: Missions (locked card focus and reason, keyboard / mouse / pad), Briefing (custom difficulty by sliders,
  Deploy), Training, Free roam, Legacy.
- e2e-missions, e2e-dead-line-menu, e2e-dead-line-v2-menu, e2e-clear, e2e-training, e2e-kestrel, e2e-park: new paths
  and `data-key`s.
- Unit: mission lock order and card text from a literal save object.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-missions
  e2e-dead-line-menu e2e-clear e2e-training e2e-park`.

## Commit
"menu-ui 07: missions cards, mission briefing, training and free roam lists; Play hub removed"
Then LOG, STATE, CHANGELOG, TESTING, docs/systems/ui.md, modes-and-progression.md (entry points).
