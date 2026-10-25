# Audio credits

Every recorded sound that ships in Night Shift, with its source and licence (bible S7; any free recording whose licence allows commercial sale, G58, G407). Recordings are bundled and never
fetched at runtime. The score's samples are listed in `docs/audio/samples.md` (music project).

## Movement foley (`src/assets/sfx/foley.mp3`)
Built by `npm run sfx:render` from the packs below (list of files per bank: `scripts/sfx/foley-sources.json`). Both
packs are by Kenney (www.kenney.nl) and dedicated to the public domain under **CC0 1.0** (the `License.txt` in each zip,
checked 2026-10-16). No attribution is required; it is given here anyway.

| Pack | Page | Zip SHA-256 | Used |
| --- | --- | --- | --- |
| Impact Sounds | https://kenney.nl/assets/impact-sounds | `029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8` | footstep_concrete / carpet / wood / snow (gravel), impactMetal_light, impactPlate_light, impactTin_medium, impactSoft_medium / heavy, impactGeneric_light |
| RPG Audio | https://kenney.nl/assets/rpg-audio | `6dbeaf8544da958d8f2adcb4a4a4b76c1ade34a05f8ab9edccd327da7375f38b` | footstep00-09 (split heel / toe), cloth1-4 |

Size: 233 KB (no audio size limit, G59).

## Weapon sounds (`src/assets/sfx/weapons.mp3`)
Built by `npm run sfx:render-weapons` from the files below (files per bank: `scripts/sfx/weapon-sources.json`). All are
dedicated to the public domain under **CC0 1.0** (checked on each page, 2026-10-16). No attribution is required; it is
given here anyway. The suppressed shots are made from the firearm takes; the brass, shells and the crossbow are modelled
in code (no recording).

| Source | Page | File SHA-256 | Used |
| --- | --- | --- | --- |
| The Free Firearm Sound Library, prepared set (Still North Media: Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney) | https://opengameart.org/content/the-free-firearm-sound-library | `cc1ab5a99a0a365105c7c5dd783f4b0b1fe90938114d3ceec53856bfe005f7d6` (`Prepared SFX Library.7z`) | 1911, Walther PPQ, Ruger Mark III, Carl Gustav M45, PPSh, AR-15, AK-47, SKS, Tikka T3, Benelli Nova, Winchester Model 12, Charles Daly pump: near and mid-distance shots |
| Handgun Reload Sound Effect (zer0_sol) | https://opengameart.org/content/handgun-reload-sound-effect | `091399145b174ac3b2e0df245b4712a13ce85df072e37256b0fc32658718be53` (`reload.wav`) | magazine out, magazine in, slide back, slide forward |
| Gun Reload Sound Effects (BMacZero, Brian MacIntosh) | https://opengameart.org/content/gun-reload-sound-effects | `1cdc10c50a26834ce7562a5f2925b9aa1118e3bb58a86fea80f34558bf2c5101` (`clipload1.wav`), `a5441641e7e9ede24f3ac311642e06265c6f480e3b1ba4b92c19c81c3a5e4d86` (`clipload2.wav`), `422bb2b92072cf8ecb77fda83e70d27bdcb7fa8cee33415ef66985a8cc14dde2` (`singlebullet1.wav`) | rifle magazine in, shell in, dry click |

Size: about 1.06 MB (90 s mono MP3, 96 kbps). Audio in all: score 5.9 MB, foley 0.23 MB, weapons 1.06 MB (about 7.2 MB;
no audio size limit, G59).
