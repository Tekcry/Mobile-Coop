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

## Piano Escape scene music (`src/assets/music/scene/piano-escape.mp3`)
The scene's only score (docs/piano-escape/PLAN.md S3). The file is the download as is (134.03 s, 44.1 kHz stereo, 256 kb/s,
4.29 MB). It is loaded only when the scene starts and is kept out of the offline cache (`PRECACHE_IGNORES`). Licence:
Pixabay Content License (commercial use allowed, no attribution required; credited anyway).

| Track | Artist | Page | Pixabay id | File SHA-256 |
| --- | --- | --- | --- | --- |
| "Investigation Piano" | leberch | https://pixabay.com/music/search/investigation%20piano/ (search URL: no other Pixabay row exists to copy the track page form from, and the page slug was not confirmed) | 611639 | `f4926dfd5294f26335de986f4c10298a15c1a93c3fd992cd41e418d75c81918d` |

### Scene music: the mission track (piano-escape S5; dev picker `?pianomusic=` and the Music Lab "Scene" list)
Two more files in `src/assets/music/scene/`. The intro always plays "Investigation Piano" above; the EMP press cross-fades
into the mission track, "Suspense Thriller" by default, "Held Breath" as a dev alternative (`?pianomusic=1`). Same
handling as the row above: loaded only when the scene starts, out of the offline cache.

One more Pixabay track, the download as is (162.04 s, 44.1 kHz stereo, 256 kb/s, 5.19 MB). Licence: Pixabay Content
License (commercial use allowed, no attribution required; credited anyway).

| Track | Artist | Page | Pixabay id | File | File SHA-256 |
| --- | --- | --- | --- | --- | --- |
| "Suspense Thriller" | Alex Grohl | https://pixabay.com/music/search/suspense%20thriller/ (search URL: the page slug was not confirmed) | 552495 | `src/assets/music/scene/alexgrohl-suspense-thriller-552495.mp3` | `b7b1df7d44176d6b9ab794d65a9fa574f1fa57ac3a6433cfce702826953fafe2` |

One original sketch, made in this repo by `scripts/music/piano.mjs` (a Node synth): original notes, synthesised, no
samples and no downloads. Rendered to WAV by the script, encoded to MP3 (160 kb/s, 44.1 kHz stereo) with
`scripts/music/encode-mp3.ps1`. No third-party licence applies.

| Sketch | Source | Length | File | File SHA-256 |
| --- | --- | --- | --- | --- |
| 1 "Held Breath" (D minor, 54 bpm) | original, `scripts/music/piano.mjs` | 83.78 s | `src/assets/music/scene/sketch-1-held-breath.mp3` | `d732f1b64f91cdacb9e5ecf31e420d81253f7502c3e73f935ab9678afa761179` |
