# Weapon sounds - progress log (feature/weapon-audio)

| Step | What | Status |
| --- | --- | --- |
| 1 | Audit the guns and their sounds | done |
| 2 | Michael's choice: CC0 recordings; then "allow CC0 for everything" | done (2026-10-16) |
| 3 | Sprite, planner, runtime, wiring, lab, tests, docs | done; waiting for Michael's ear check |

## Step 1 - audit (2026-10-16)
- 16 guns in `weapons.json`, 6 sound classes in the synth (`Sfx.gunshot`): pistol, smg, shotgun, sniper, heavy, and a
  rifle default. The DMR, the LMG and the crossbow fell back to the rifle sound (the crossbow played a rifle shot).
- Suppressors were silent in audio only: the 9mm SD (noise 0.35) and a fitted suppressor (0.45) played the full report;
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
- Gun to recording: P45 1911; Five-7 Walther PPQ (+7 % rate); 9mm SD Ruger Mark III (always suppressed); MP5K and
  Vector Carl Gustav M45; P-90 PPSh; 552 and TAR-21 AR-15; AK-74 and M249 AK-47; M14 DMR SKS; M700 Tikka T3; M870
  Benelli Nova; M1014 Winchester Model 12; Breacher Charles Daly. Crossbow modelled.
- Levels set by measurement against the foley (`WEAPON_MIX`): open pistol about 12 dB over a running step, suppressed
  pistol about level with it, brass about 9 dB under it.
- Tests: `tests/weapons-audio.test.ts` (17), `scripts/e2e-weapon-audio.mjs` (19 checks, required). Run with
  `E2E_PORT=4185` (other sessions held 4179, 4183 and 4184).
- Open: Michael's ear check in the lab (levels, any gun that sounds wrong, the suppressor). Not covered yet: impacts and
  ricochets, swap and grenade throw, flybys, guards' reloads, reverb by room.
