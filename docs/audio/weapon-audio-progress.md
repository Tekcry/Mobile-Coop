# Weapon sounds - progress log (feature/weapon-audio)

**History.** Michael's current decisions are in `docs/DECISIONS.md` (G1 onward), which wins where this file differs; this file is kept as the record of its run.

| Step | What | Status |
| --- | --- | --- |
| 1 | Audit the guns and their sounds | done |
| 2 | Michael's choice: CC0 recordings; then "allow CC0 for everything" | done (2026-10-16) |
| 3 | Sprite, planner, runtime, wiring, lab, tests, docs | done; Michael: "sounds are good" |
| 4 | Line up with the locomotion arsenal; feature/music up to date | done |

## Step 1 - audit (2026-10-16)
- 16 guns in `weapons.json`, 6 sound classes in the synth (`Sfx.gunshot`): pistol, smg, shotgun, sniper, heavy, and a
  rifle default. The DMR, the LMG and the crossbow fell back to the rifle sound (the crossbow played a rifle shot).
- Suppressors were silent in audio only: the suppressed pistol (noise 0.35) and a fitted suppressor (0.45) played the full report;
  only the noise model and the muzzle flash knew.
- A shot was one filtered noise burst plus a tone: no mechanism, no tail. A reload was three identical clicks on
  `setTimeout`; dry fire one click; no brass, no pump or bolt, no handling.
- Guards' shots: one rifle or "heavy" voice, low-passed by distance. Co-op shots: by class.

## Step 2 - Michael (2026-10-16)
- Chose CC0 recordings over better synthesis ("CC0 recordings (Recommended)").
- Then: "Update and allow CC0 for everything if it will be quicker and a better result." `CLAUDE.md` and the bible
  (S7, Section 6 list, open question 4) now allow CC0 audio for every sound.
- Approved the downloads: The Free Firearm Sound Library (OpenGameArt, 194 MB, git-ignored cache), zer0_sol's handgun
  reload and BMacZero's reload clips.

## Step 3 - built (2026-10-16)
- Sprite (`src/assets/sfx/weapons.mp3`, 1.06 MB, 127 takes, 46 banks), planner (`guns.ts`), runtime
  (`weaponAudio.ts`), lab (`?weaponlab=1`), wiring in `gameAudio.ts`. Detail: `docs/systems/audio.md`.
- Gun to recording (ids, with the original names from feature/ct-locomotion step 16):
  - Campaign arsenal: `rifle` Heron Carbine, AR-15 (issued suppressed in the campaign: `sdRifle`); `smg` Marten 9 SMG,
    Carl Gustav M45 (9 mm); `shotgun` Mason 12 Pump, Benelli Nova; `dmr` Spotter 7.62 Marksman, SKS (7.62); `pistolSd`
    Hush 9 SD, Ruger Mark III (always `sdPistol`); `pistol` Warden .45, 1911 (.45).
  - Sandbox and legacy: `fiveseven` Kite 5.7, Walther PPQ (+7 % rate); `vector` Ferret .45 SMG, M45 (lower); `p90`
    Swift 5.7 PDW, PPSh (higher); `ak` Steppe 5.45, AK-47; `tavor` Ibex Bullpup, AR-15 (higher); `lmg` Anvil 5.56,
    AK-47 (lower); `sniper` Ridgeline Bolt, Tikka T3 (.30-06); `semiShotgun` Talon 12 Semi, Winchester Model 12;
    `breacher`, Charles Daly pump; `crossbow` modelled.
- Levels set by measurement against the foley (`WEAPON_MIX`): open pistol about 12 dB over a running step, suppressed
  pistol about level with it, brass about 9 dB under it.
- Tests: `tests/weapons-audio.test.ts` (17), `scripts/e2e-weapon-audio.mjs` (19 checks, required). Run with
  `E2E_PORT=4185` (other sessions held 4179, 4183 and 4184).
- Open: Michael's ear check in the lab (levels, any gun that sounds wrong, the suppressor). Not covered yet: impacts and
  ricochets, swap and grenade throw, flybys, guards' reloads, reverb by room.

## Step 4 - the locomotion arsenal (2026-10-16)
- Michael: "sounds are good, but the arsenal has been changed. check locomotion branch and check that this music branch is
  up to date".
- feature/ct-locomotion step 16 (911f51b) keeps all 16 ids, renames every gun and curates the campaign arsenal
  (`src/config/arsenal.ts`): rifle (issued with a suppressor), SMG, pump, marksman; the suppressed and heavy pistols.
  The sounds map by id, so nothing in the planner changes. The issued suppressor raises the rifle's noise stat to 0.45,
  which plays `sdRifle`.
- The lab now lists the campaign's six first, then the other ten (sandbox and `?legacy=1`).
- `e2e-weapon-audio` holds aim before firing (locomotion has no hip fire), so it passes on both branches.
- Up to date: feature/weapon-audio has the latest feature/music (a87e832, round 23).
- Trial merge of feature/ct-locomotion into this branch (a throwaway worktree, not committed): 10 conflicting files, all
  from the music and foley work, none from the weapon sounds:
  - `.gitignore`, `eslint.config.js` and `package.json` (keep both sides' entries and scripts).
  - `scripts/run-e2e.mjs`: locomotion's list (it drops `e2e-cover` and adds `e2e-wall` and the map suites) plus
    `e2e-music`, `e2e-score`, `e2e-foley` and `e2e-weapon-audio`.
  - `src/core/flags.ts`: both sides' flags.
  - `src/core/settings.ts`: locomotion's gameplay settings with the music's audio (`music: 0.15, musicV: 3`).
  - `src/player/player.ts`: locomotion's `this.onFootPlant?.()` plus the foley's `footPlants` and `footPlantSide`
    counters inside the same `if`.
  - `CHANGELOG.md`, `TESTING.md`, `docs/systems/testing-tools.md`: both sides.
  - With those: typecheck, lint and all unit tests pass; `e2e-weapon-audio`, `e2e-foley`, `e2e-score` and `e2e-combat`
    pass.

