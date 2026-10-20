# tuner-v2 - registry wiring (items 1-2 into the panel)
**Built.** `src/anim/tuneV2Sections.ts` registers 4 sections through `registerTuneSection` only (after Body, Gun, Camera):
**Joints** `joint` (`joint.<state>` x 20, sliders `<joint>_<x|y|z>` 63; `joint.options` = mirror lock 0 / 1),
**Hands & feet** `hand` (`hand.<weapon>.<state>` x 100, 18 place params), **IK strength** `ik` (`ik.<state>` x 20, 4 limbs,
default 1), **Weapon** `weapon` (`weapon.<weapon>.<state>` x 100, 35 weapon + finger params). Group ids unique (tested).
**Flow.** The registry is the source (panel, save, export, log, pad). `tuneV2Frame(body, weapon)` (`player.ts`, local player,
before `jointsBegin`, weapon computed once) writes bag keys `joint` / `hand` / `ik` / `weapon` (preallocated id strings) for
follow, then copies the active rows into the item 1-2 tables where they differ (index loops, no allocation).
**Mirror (assumed A, undo: use item 1's flag).** The sync mirrors one side's panel edit (last log entry, partner untouched)
into table and registry, no extra log entry; loads and group resets copy as is. Item 1's `jointsMirror` is held off.
**Saves.** New groups ride the registry snapshot / export; 4.20 saves load unchanged (literal test). Item 1-2 own keys
(`joints`, `hands` via `*Attach`) were never written by the panel, so nothing to migrate; they stay unused.
**Panel / pad.** `animTunePanel.ts`, `animTunePad.ts`, Camera untouched. D-pad up from the first section wraps to Weapon (e2e).
**CHECK2 fix.** `tests/tuneHands.test.ts`: idle, elbowR +40 pitch, handR IK 0: elbowR = rest + offset, left arm and legs
`toEqual` strength 1, back to 1 = unchanged.
**Tests.** New `tests/tuneV2Sections.test.ts` (5): order, identity, follow + table flow, mirror, save. `scripts/e2e-menus.mjs`:
4 sections in the panel, a Joints slider set in the panel reaches the joint table and its reset clears it; pad reaches Weapon.
**Results.** tsc clean; eslint clean (5 files; the e2e script is lint-ignored, `node --check` ok); vitest tuner + rig suites
73/73 (tuneHands, tuneJoints, tuneV2Sections, animTune, animTuneCamera, animTunePad, animRig). **Skipped:** `npm run check` and e2e
(smoke, e2e-anim, e2e-menus): `C:/NightShift/heavy.lock` held by tuner-camera (01:49). The new e2e
asserts are unrun.
**Files.** New `src/anim/tuneV2Sections.ts`, `tests/tuneV2Sections.test.ts`, this file; edited `src/player/player.ts`,
`tests/tuneHands.test.ts`, `scripts/e2e-menus.mjs`, `docs/tuner-v2/ITEM1.md`, `ITEM2.md`, `CHANGELOG.md`.
**Polish.** 100-entry pickers for the per-weapon sections; a mirrored partner slider shows its new value on the next redraw.
**Michael: try.** Pause > Animation tuner, Joints: set elbowR pitch in the current state, watch the arm; mirror lock on, move elbowL.
