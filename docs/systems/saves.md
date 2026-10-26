# Progression and saves
Owner: the orchestrator. Status: current.
Purpose: the save schema, migrations, the export format, the settings record and the course record.
Design authority: docs/design-bible.md (Section 5.11). Saves only go through `src/save` (IndexedDB); `localStorage`
never holds a save.

## Save (profile)
- Schema: `save/schema.ts`, `SAVE_VERSION` 10 (the current number lives there). Changing the shape = bump the version,
  add a migration in `save/migrations.ts` (input is the previous version's raw object), extend `sanitizeSave`, and add
  a test in `tests/save.test.ts` with a literal old save. Leaving an unused field readable is fine when simpler (as
  `profile.stats.bestWave` stays, never written).
- v7 -> v8 (locomotion 04): `MissionRecord` = `{ rating, score, plays, wins }`; the old mission style bars, the HQ
  sonar / marks and the `executes` challenge are deleted (spent credits not refunded).
- v8 -> v9 (consolidation, G24 / G76 / G115 / G116): `emotes` and every `emote:` unlock are dropped; a deleted gun in the
  loadout or a preset becomes the kept gun of its slot (`DELETED_GUNS`: pistols -> `pistolSd`, the rest -> `rifle`),
  its `weapons` progress entry and its unlocks (`weapon:<gun>`, `camo:<gun>:...`, `att:lethalBolts`) are dropped; a
  preset's `drone` gadget is dropped (the preset's default comes back). Spent credits are not refunded.
- v9 -> v10 (hud-guidance A, G339): the minimap is removed, so the HQ radar upgrade (`hq.radar`) is dropped.
  Spent credits are not refunded.
- `migrate` refuses a save from a newer version; `SaveManager.readOnly` then plays on an in-memory profile and writes
  nothing (conventions.md, Robustness).
- Pure progression maths in `progression/` (levels, rewards, upgrades, attachments, unlocks, profile ops). UI calls
  `app.save.update(d => op(d, ...))`; `SaveManager` sanitises, debounces and persists. The economy (credits, XP, suit,
  HQ, challenges, cosmetics) is parked behind `?legacy=1` (modes-and-progression.md); the save still holds it.
- Unlock ids carry a prefix: `weapon:`, `att:`, `camo:`, `part:`, `pattern:`, `tag:`, `color:` (add to `UNLOCKS` or
  `registerUnlocks`).
- Export format: `{ magic: 'shoulder-strike-save', version, exportedAt, data }` (the old internal name stays); import
  also accepts bare saves of any known version.
- Mission cards can show only what `MissionRecord` holds; intel found, last played and endings need a save change in
  the mission framework job.

## Settings (`kv/settings`)
- `Settings` (`core/settings.ts`) live in IndexedDB `kv/settings` through `save/db.ts`, with no `SAVE_VERSION`:
  `SettingsStore.load` -> `sanitizeSettings` builds a fresh object field by field (missing fields take the defaults,
  unknown fields are dropped). Sections: `gamepad`, `mouse`, `keys` (keyboard binds), `pad` (controller binds), `video`,
  `audio` (master, sfx, music, ui), `gameplay` (shoulder, hold / toggle per action, `grabToggle`, `rumble`,
  `courseMarkers`), `access`.
- Old records load: the deleted `touch` section, `video.platform` / `phoneOutput` / `phoneSetup`,
  `gameplay.customDifficulty` and a stored `medkit` key bind or emote binds are read and dropped
  (`tests/settings.test.ts` uses literal old records).
- Decided, not built yet (G60): a separate Footsteps volume slider for testing.

## Course record (`kv` `course:fallow`)
`src/save/courseRecord.ts`: per map id, the bays the host has finished, the best time per bay, the best total and the
finale's best rating. Read at the co-op lobby ("Start at bay N"), written by the host at each airlock and at the end;
sanitised on read (`sanitizeCourseRecord`). A new key in the existing `kv` store: no profile shape change, so no
`SAVE_VERSION` bump.

## Section rating record (`kv` `rating:sections`)
`src/save/ratingRecord.ts` (section-rating S5): `{ v: 1, maps: { [mapId]: { [sectionId]: { marks, synced } } } }`, the best
rating per Sector Ops section. Best-of: more marks (bits of the 4-bit mask) wins, a tie goes to more synced takedowns.
Sanitised on read (`sanitiseRatingRecord`: marks clamped 0-15, synced a whole 0-1e4, bad ids dropped); writes are
serialised; the host (or solo) writes at every rating. Read by the Sector Ops op list (four pips per section). Like
`course:fallow`, a new `kv` key: no `SAVE_VERSION` bump.
