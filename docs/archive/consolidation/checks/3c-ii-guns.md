# Check 3c batch (ii): guns outside the CT kit, plus the e2e-pad capture fix - 2026-10-18

Verdict: **FAIL - 1 fix item** (low impact, legacy report-only suite, not caused by this change). The gun deletion itself
is clean; with the fix item done (or waived) this is a PASS.

## Fix list (ranked by impact)
1. **e2e-progression (legacy, report only): the Play screen DOWN loop never reaches Deploy.** Not caused by this change.
   - Cause: `scripts/e2e-progression.mjs` line 59 presses DOWN at most 6 times looking for Deploy, with no assert. The
     Play screen has 9 rows for Hunter on Warehouse: Mode, Map, Difficulty, Guard perception, Guard aim, Alarm tolerance,
     Weather, Loadout, Deploy. The three slider rows came with locomotion 19 custom difficulty (`a44f995`,
     2026-10-16), after the loop was written. The failure screenshot (`C:\tmp\e2e-progression-fail.png`) shows focus on
     Weather (6 DOWNs from Mode); A on Weather starts nothing, so `window.__app.current?.enemyMgr` times out at 30 s.
     The deleted "buy the SMG" step did not feed this step (it ended back on the main menu, as the new third B does).
   - Done looks like: the loop allows 12 presses and then asserts the focus is on Deploy (for example
     `assert(/Deploy/.test(await focusedText(page)), 'focus reaches Deploy')`) before pressing A; `node
     scripts/run-e2e.mjs --legacy e2e-progression` (port 4191) gets past "results show rewards", or fails later at a step
     that is reported as a new note.

## Results
1. Diff review and leftovers.
   - No deleted id is left as a player weapon id in `src/`, `tests/`, `scripts/`. Remaining hits are:
     guard sound keys in `GUNS` / `GUARD_GUN` (`pistol`, `smg`, `ak`, `lmg`, `sniper`, `semiShotgun`), the class key
     `heavy -> lmg` in `CLASS_GUN`; weapon classes and enemy kinds (`'pistol'`, `'smg'`, `'sniper'`, `'shotgun'` in
     `carrySlots`, `drawState`, `weaponCarry`, `sfx.ts`, `playerWeapons` shake / casing, `enemy.ts`, maps); old migrations
     1-7 (literal `secondary: 'pistol'`, mapped later by step 8); tests that feed deleted ids on purpose (save, net,
     legacy, economy sanitiser, carry class items, guard audio).
   - `GUNS` keys are AI sound keys only: player shots look up the held `WeaponId` (`rifle` / `pistolSd`), guards go through
     `GUARD_GUN[kind]`, remote shots through `CLASS_GUN[cls]` (class, unchanged path).
   - `nonLethal`: only the generic `Hit.nonLethal` (`game/damage.ts`), its knock-out branch in `ai/enemy.ts` and the
     unrelated takedown counter remain. `lethalBolts`: only the migration drop and a test asserting an unknown
     attachment is ignored.
2. AI unchanged. `enemies.json` diff is five `gun` lines only (heavy, sniper, droneOp -> `rifle`; enforcer, officer ->
   `pistolSd`); `weapon` blocks (damage, accuracy, rpm, range) untouched. `gun` is read only by `enemyDefs.ts`, which
   nulls any id not in `WEAPON_IDS`, and `enemyRig.ts` (the carried model). No runtime path looks up a deleted gun for a
   guard.
3. Save. `SAVE_VERSION` 9. The literal v8 test (deleted guns equipped, in presets, owned with progress, `weapon:`,
   `camo:smg:gold`, `att:lethalBolts`) migrates to rifle + pistolSd, presets mapped, unlocks and progress dropped, rest
   kept. v1 (smg unlock and upgrades) and v6 (chosen smg + pistol) run through to v9. A v9 save from the emote commit
   (no gun mapping) is repaired by `sanitizeSave`: unknown loadout ids fall back to `pistolSd` / `rifle` (the slot
   defaults), a doubled id is split, unknown preset guns fall back to the preset default, `weapons` is rebuilt from
   `WEAPON_IDS`. Stale `weapon:<deleted>` unlock strings would stay in such a save; harmless (nothing reads them).
4. Wire. `PROTOCOL_VERSION` 13. `hello.loadout` drops unknown ids, `pstate` and `shot` with an unknown `w` parse to
   null (message ignored), `weaponKills` is filtered by `WEAPON_IDS`; host `WEAPONS[m.w]` reads only after that parse.
   No crash path.
5. Protected paths (`src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`): unchanged.
   `npm run check`: pass (lint 0 errors / 41 warnings, 129 files / 1477 tests, build ok).
6. E2E, port 4191, `E2E_JOBS=2`: smoke, e2e-combat, e2e-weapons-carry, e2e-gadgets, e2e-enemies, e2e-park, e2e-mouse
   ok. Failed under load: e2e-offline (service worker precache wait 30 s; the v1 migration checks passed), e2e-weapon-audio
   ("a reload plays the handling", sprite decode took 18.8 s), e2e-pad (known flaky, "A opens the Controls screen"),
   e2e-coop (known flaky). Solo (`E2E_JOBS=1`): e2e-offline, e2e-weapon-audio, e2e-pad all pass; e2e-pad's "B held 1 s
   cancels the capture" passes with the new wait. e2e-coop alone: pass. Its parallel failure was at "host heals the
   client to 100 and spends a kit" (medkit, Proving sandbox): no gun involved. Port 4191 freed and checked.
7. e2e-progression: see fix item 1.

## Notes (no action needed)
- `DELETED_GUNS` lookups use `in`, so inherited names (`constructor`, `toString`) also match on garbage input; the
  sanitiser repairs the result. `Object.hasOwn` would be tidier.
- Remote co-op pistol shots map class `pistol` -> the `pistol` (.45) sound, not the Hush 9 SD; pre-existing behaviour.
