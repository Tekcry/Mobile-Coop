# tuner-v2 item 4 - per-key editing
**Data.** Registry section **Keys** `keys` (`src/anim/tuneKeys.ts`, last, after Stepping): groups `key.<clip>.<key>` = every
key of the 28 key files (210; picker = clip then key; the grey note names the phase, frame and mirror). The key files
name no phases (no contact / passing labels), so a key is its index + phase. 26 sliders, degree deltas on the key
file's own fields, +-90, step 0.5: pelvis / spine / chest / neck pitch, yaw, roll; per arm flex, abd (upper arm), elbow,
inward (forearm), wrist pitch / yaw / roll. Static key table `src/anim/tuneKeysMeta.ts` (generated, tested against the JSON).
**Assumed (A, undo: add sliders).** Item 1's head, shoulders, hips, knees, ankles and toes are left out: the runtime clip has
no leg rotations (the key format has leg channels, but they only feed the Blender preview: the game's legs are the foot
planner's; the head rides the neck).
**Re-apply guard.** `apply-tune.mjs` refuses to write a key file in place that already differs from git HEAD (a second run
would add the edits twice); `--force` overrides. After baking, reset the Keys section before the next export.
**Sampler hook** (`src/anim/keyed.ts`). `KeyedClip.keyOff` (null) -> per-frame offset quaternions (trunk 16, arm 16, wrist 8 a
frame + means), allocated on the clip's first edit, rewritten in place after. A key's delta spreads linearly to its
neighbouring keys (baked phases, the mirrored half mirrored as `mirror_key`); `sampleKeyed` blends the tables with its own
`sampleQuats` (frame lerp, mean / amp, arms x armSwingK), then: trunk `q * E`, child counter-turned (key angles are body
frame); elbow + wrist points about the shoulder, forearm about the elbow (chest frame); wrist `q * E` (a clip without wrist
keys then samples wrist frames, as the bake would). The preview approximates the Blender bake (Bezier between keys,
small-angle composition); the export is exact. Edits apply to every rig sampling the clip (it is the clip). No hot-path
allocation; `tuneKeysFrame()` in `player.ts` beside `tuneV2Frame`: three compares a frame, a full check when the change log
moves and once a second.
**Save.** The Keys values ride the registry snapshot / Export (same IndexedDB record, additive; old saves load as zero).
**Export / bake.** Panel Export as usual (`anim-tune-<date>.json`), then
`node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/apply-tune.mjs <anim-tune-....json>` writes
`scripts/anim-keys/keys/<clip>.json` per edited clip (`--out <dir>` to write elsewhere; pure `applyKeyEdits` in
`src/anim/tuneKeysFile.ts`), and prints the bake: `node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs <clip>`
(Blender, heavy lock) -> `src/anim/clips/keyed/<clip>.ts`. Then reset the Keys section (the edit is in the clip now).
Proof: `walk` key 1 spine pitch +7.5 -> the file's 2 becomes 9.5, nothing else changes (script run on a sample export).
**Tests** `tests/tuneKeys.test.ts` (6): table = JSON files, Keys last; identity (real `walk` / `idle` swept over 2 cycles x 3
amps `toEqual` before, after edit + reset, untouched clip null; tables reused); preview (10 deg at the key, 5 half way,
mirror key too, neighbours as baked, chest world kept); arms (elbow edit moves the forearm only, wrist frame on a clip
without wrist keys); export round trip (no edits = the file byte for byte; export -> `applyKeyEdits` -> the bake reader
port `readKeys` = base + deltas incl. the mirrored keys); save / load. `scripts/e2e-menus.mjs`: 6 sections, pad wraps to Keys.
**Results.** tsc clean; eslint clean (6 files; apply-tune.mjs ignored, `node --check` ok); vitest 11 tuner / rig / anim files 117/117.
**Skipped:** `npm run check`, e2e (smoke, e2e-anim, e2e-menus): `heavy.lock` held by CT Core (03:19); e2e-menus edits unrun.
**Files.** New `src/anim/tuneKeys.ts`, `tuneKeysFile.ts`, `tuneKeysMeta.ts`, `scripts/anim-keys/apply-tune.mjs`,
`tests/tuneKeys.test.ts`, this file; edited `src/anim/keyed.ts`, `src/player/player.ts`, `scripts/e2e-menus.mjs`, `CHANGELOG.md`.
**Michael: try.** Tuner > Keys, `walk` key 1, spine pitch +10, walk holstered; Export, apply-tune, build.mjs walk.
