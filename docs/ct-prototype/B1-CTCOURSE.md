# B1 - CT course spec and greybox (2026-10-18)

## Built
- New map `ctcourse` (Marlow Yard, `src/world/maps/ctcourse.ts`): 8 stations in CT order as 8 course bays, 7 airlocks between them (framework reused), start for 2 players, 2 wall medkits. Spec: `docs/ct-prototype/CTCOURSE-SPEC.md`.
- Each obstacle is geometry plus a placeholder door gate (pair plates, timed-hold console, the annex's hack lever) so the course is completable; labels name the slice that replaces it.
- Exit zone (G138): `CourseDef.exitZone`; `CourseState.update` finishes the course itself when both players are in it (`finishRefusal`: drills, downed, partner; pure helpers `inExitZone`, `exitZoneReady`). No "Finish" device on this map; maps without a zone keep the old device.
- Medkits by difficulty (G178): `stationHeal(hp, maxHp, alive, difficulty?)` + `medkitFraction`; the game and the co-op host pass `opts.difficulty`. Without a difficulty arg the old +40 stays.
- Course default map: `ctcourse` is the first course-capable map in `MAPS` (before courselab). Fallow parked: `?legacy=1` adds `bunker` to `MAPS` (`?legacy=1&autostart=bunker&mode=course`); nothing deleted.

## Numbers (all starting values)
Pitch 22 m (bay 16 + airlock 6), yard 14 x 170, fences 6 m, obstacle walls at bay +9: 4.4 / 3.2 / 3.5 / 4.0 (annex, roof top 4.4) / 3.2 / 4.4 / 3.5; exit zone 4 x 8 m; medkit: 100% / 100% / 50% / 25% of max HP.

## Files
New: `src/world/maps/ctcourse.ts`, `tests/ctcourse.test.ts`, `scripts/e2e-ctcourse.mjs`, `docs/ct-prototype/CTCOURSE-SPEC.md`. Edited: `src/world/maps/index.ts`, `src/game/course/courseDef.ts`, `src/game/course/courseState.ts`, `src/game/medkit.ts`, `src/game/gameState.ts`, `src/net/coopHost.ts`, `scripts/run-e2e.mjs` (e2e-ctcourse REQUIRED; e2e-bunker moved to LEGACY; quick-run covers), `scripts/e2e-bunker.mjs`, `scripts/e2e-course.mjs`, `scripts/e2e-anchors.mjs` (add `legacy=1` for Fallow), `tests/medkit.test.ts`, `tests/rooms.test.ts` (MAPS list), `tests/bunkerMap.test.ts` (registration assertion).

## Stubs / not done
- All station mechanics are B2-B8; placeholders are marked in the prompts. No laser / camera / scanner devices (visual dressing only). Panel text is the prompt label plus radio (no panel read tracking or re-read).
- Not added to the menu / lobby lists (not listed; the menu job owns screens). No skip-route screens, return paths or lighting pass. `docs/systems/testing-tools.md` not updated.

## Results
`npm run lint` 0 errors (41 pre-existing warnings); `npx vitest run` 135 files / 1473 tests pass; `npm run build` ok. E2E on port 4193: smoke ok; e2e-ctcourse ok (392 s: airlock cycles are slow on software GL); e2e-course: first run failed one latency limit ("client sees lock change in 1935 ms, limit 1500", timing under load), solo rerun passed (not caused by this change).

## Try it (live /ct/ preview)
- Two tabs of one browser (first hosts, second joins): `https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course`
- Solo with the dev flag (dev builds only): `?autostart=ctcourse&mode=course&course=solo`
- Fallow: `?legacy=1&autostart=bunker&mode=course`
- Walk: read the 3 panels (both), stand both on the green airlock pad; at each wall use the two plates together (stations 2, 4, 5, 6), or hold the console while your partner crosses (3, 7, 8); station 5 then needs the hack computer; finish with both in the lit zone. Medkit healing: add `&difficulty=realistic` or `perfectionist`.
