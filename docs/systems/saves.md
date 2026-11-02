# Saves
Owner: the orchestrator. Status: current.
Purpose: the save schema, migrations, the export format, the settings record and the records (course, rating, campaign, sector).
Design authority: docs/design-bible.md (Section 5.11). Saves only go through `src/save` (IndexedDB); `localStorage`
never holds a save.

## Save (profile)
- Schema: `save/schema.ts`, `SAVE_VERSION` 11 (the current number lives there). The profile (`profile` / `main`) is
  `{ version, createdAt, updatedAt, profile: { name }, weapons: { [id]: { attachments } }, loadout, presets, preset }`:
  the name and the gear, nothing else. There is no XP, credits, unlock, upgrade, suit, HQ, challenge, look, camo or tag.
  What a player earns lives in its own `kv` records below (per-mission ratings, campaign / course / sector records).
  Changing the shape = bump the version,
  add a migration in `save/migrations.ts` (input is the previous version's raw object), extend `sanitizeSave`, and add
  a test in `tests/save.test.ts` with a literal old save.
- v7 -> v8 (locomotion 04): `MissionRecord` = `{ rating, score, plays, wins }`; the old mission style bars, the HQ
  sonar / marks and the `executes` challenge are deleted (spent credits not refunded).
- v8 -> v9 (consolidation, G24 / G76 / G115 / G116): `emotes` and every `emote:` unlock are dropped; a deleted gun in the
  loadout or a preset becomes the kept gun of its slot (`DELETED_GUNS`: pistols -> `pistolSd`, the rest -> `rifle`),
  its `weapons` progress entry and its unlocks (`weapon:<gun>`, `camo:<gun>:...`, `att:lethalBolts`) are dropped; a
  preset's `drone` gadget is dropped (the preset's default comes back). Spent credits are not refunded.
- v9 -> v10 (hud-guidance A, G339): the minimap is removed, so the HQ radar upgrade (`hq.radar`) is dropped.
  Spent credits are not refunded.
- v10 -> v11 (clean-up I): progression and cosmetics are removed. Dropped: `profile.xp / credits / tag / stats`, `unlocks`,
  each weapon's `upgrades / camo / kills`, `avatar`, `missions` (the old Infiltration bests), `suit`, `hq`, `challenges`.
  Kept: `createdAt`, `updatedAt`, `profile.name`, each weapon's `attachments`, `loadout`, `presets`, `preset`. Nothing is
  refunded. The settings, the `kv` records and the anim tune presets are separate stores and are not touched (a test loads
  a stored v10 beside them). The avatar-rename table of the v3 -> v4 step now lives in `migrations.ts`.
- `migrate` refuses a save from a newer version; `SaveManager.readOnly` then plays on an in-memory profile and writes
  nothing (conventions.md, Robustness).
- Gear reads are pure (`weapons/loadout.ts`, `weapons/attachments.ts`: the attachments' data and `sanitizeAttachments`). Code
  changes the profile with `app.save.update(d => ...)`; `SaveManager` sanitises, debounces and persists. Nothing is
  unlocked or bought (modes-and-progression.md).
- Export format: `{ magic: 'shoulder-strike-save', version, exportedAt, data }` (the old internal name stays); import
  also accepts bare saves of any known version.
- Per-mission results are not in the profile: the campaign record holds the best percent, plays, intel and time (below).

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

## Campaign records (`kv` `campaign:progress`, `campaign:save`)
`src/save/campaignRecord.ts` (campaign-mode CM2, dark behind `flags.campaign`): `campaign:progress` holds, per campaign
entry (`src/game/mission/campaignOrder.ts`), the best rating (-1 for the prologue: no percentage), plays and intel steps
done; `campaign:save` is the host's one save slot for the mission in progress (the section, the runner's done / fact
bits, revives used, rule breaks, the alarm stage carried into the section and the run's tally, so a Continue keeps the
rating honest, G146). Both `v: 1`, sanitised on read, never throw. Like `course:fallow`, new `kv` keys: no
`SAVE_VERSION` bump (G189).
