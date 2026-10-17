# Progression and saves
Purpose: progression maths, the save schema, migrations and the export format.
Design authority: docs/design-bible.md (Section 5.11)

## Progression and saves
- Pure maths in `progression/` (levels, rewards, upgrades, attachments, unlocks, profile ops). UI calls
  `app.save.update(d => op(d, ...))`; `SaveManager` sanitises, debounces and persists to IndexedDB.
- Settings are not the save: `Settings` (`core/settings.ts`) live in IndexedDB `kv/settings` through `save/db.ts`,
  sanitised on load (missing fields take the defaults), with no `SAVE_VERSION` (A3). Locomotion step 18 added
  `pad` (controller bindings) and `gameplay.grabToggle`; step 19 added `gameplay.customDifficulty {base, perception,
  aim, alarm}` (sanitized: base a preset, values clamped 0.5-2.0; default Normal 1 / 1 / 1); older settings load with the defaults
  (`tests/settings.test.ts`).
- Save schema: `save/schema.ts` (`SAVE_VERSION`). Changing the shape = bump the version, add a
  migration in `save/migrations.ts` (input is the previous version's raw object), extend `sanitizeSave`,
  and add a test in `tests/save.test.ts` with a literal old save.
- Schema v8 (locomotion 04): `MissionRecord` = `{ rating, score, plays, wins }`. Migration `7:` deletes the mission
  `ghost / panther / assault`, `hq.sonar / hq.marks` and `challenges.progress.executes` (and `executes` from
  `challenges.done`). HQ credits already spent on sonar / marks are not refunded (parked economy).
- Export format: `{ magic: 'shoulder-strike-save', version, exportedAt, data }`; import also accepts bare
  saves of any known version.
- New unlockables: add to `UNLOCKS` (or `registerUnlocks` from another module) with an id prefix
  (`weapon:`, `att:`, `camo:`, `part:`, `pattern:`, `emote:`, `tag:`, `color:`).

## Course record (`kv` `course:fallow`, T1c, DECISIONS C9)
`src/save/courseRecord.ts`: per map id, the bays the host has finished, the best time per bay, the best total and the
finale's best rating. Read at the co-op lobby ("Start at bay N"), written by the host at each airlock and at the end;
sanitised on read (`sanitizeCourseRecord`). A new key in the existing `kv` store: no profile shape change, so no
`SAVE_VERSION` bump.
