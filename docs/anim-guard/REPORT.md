# anim-guard - implementer report (2026-10-20)

Four guard clips for Wren's hold, keyed by hand, baked with Blender -b, sheeted (`docs/anim-rework/shots/guard/`,
Workbench capsules: side row over front row, left limbs blue), tested. Not wired into the game (slice 6).

| Clip (export) | Frames | Timing | Type |
| --- | --- | --- | --- |
| `guard_held_stumble` (`KEYED_GUARD_HELD_STUMBLE`) | 32 | 0.6 m a cycle (two 0.3 m catching steps), distance-driven; planner duty 0.62, liftH 0.02 | loop, mirrored |
| `guard_held_hands` (`KEYED_GUARD_HELD_HANDS`) | 48 | about 2.4 s a cycle; arms and wrists layer over the stumble | loop, mirrored |
| `guard_choke_sag` (`KEYED_GUARD_CHOKE_SAG`) | 48 | 5.5 s; frame i at i x 5.5 / 47 s | one-shot |
| `guard_knife_collapse` (`KEYED_GUARD_KNIFE_COLLAPSE`) | 48 | 3.0 s; frame i at i x 3 / 47 s | one-shot |

- Stumble: weight behind the heels, chest arched back onto the holder, catching steps backwards, the front foot dragged
  on its heel. Hands: at chin height on the holder's forearm, elbows down and out, pull, heave, re-grip.
- Choke sag: grip weakens (0-1.2 s), knees buckle (1.2-1.6), lowered to sitting (1.6-2.6), laid back (2.6-3.9), still on
  the back (3.9-5.5); the pelvis never drops faster than 1.2 m/s.
- Knife collapse: a sharp stiffen (0-0.35 s), knees to the floor (0.35-0.7), forward from the knees (0.7-1.3), settle
  (1.3-1.85), still face down; no flailing, no hand to the throat.

## Assumed decisions
- A1. Underscores in clip names (the bake writes `KEYED_${NAME}`). Undo: rename once the bake maps hyphens.
- A2. One-shots: 48 frames keyed 0-47 (the bake loops to the first key at 48); hold keys keep the ends flat. Undo: a
  non-looping mode in `key_clip.py` and a rebake.
- A3. Feet and hands placed with a scratch two-bone IK while authoring, written as plain angles; the JSON is the source.
- A4. Palm direction assumed (wrist twist -60, pitch -18, roll -6; limp hands -15 / 8). Undo: change the `wrist` keys
  after an in-game look.
- A5. Legs keyed in full with the pelvis offset as the real height (the floor poses); the game uses no leg channel yet.
- A6. New sheet tool `scripts/anim-keys/sheet.mjs` + `py/sheet_clip.py` (renders from the baked .blend; the bake's
  `--preview` puts the lowest sole on the floor and shows 8 phases only). Undo: delete the two files.

## Checks
`tests/animGuard.test.ts` 21/21 (sampling, unit quaternions, wrist frame present, joint ranges, continuity under 25 deg
and 4 cm per 60 Hz frame, nothing below the floor, the stumble's planted foot, the one-shots end lying and still);
tsc and eslint clean; `npm run check` pass (182 files, 1989 tests, build).

## What slice 6 must add
1. Import the four `KEYED_GUARD_*` clips into the guard's graph (guards build `CharacterRig` in `src/ai/enemyRig.ts` /
   `src/ai/body.ts`) with a held / knockout / kill state; the keyed weights (`keyW`, `keyArmW`) apply only in the
   player's free gait today (`characterRig.ts` near 1746), so the guard needs its own.
2. Stumble: phase from distance backwards; duty 0.62, liftH 0.02; the hands clip's arms and wrists through the keyed arm
   weight.
3. One-shots: phase = min(t / duration, 1) x 47 / 48 (`sampleKeyed` loops); durations 5.5 s and 3.0 s (no duration field
   in the clip format; the key JSON's `oneShot` / `duration` are ignored by the bake).
4. Floor poses: a `leg` channel (`key_clip.py` already computes hip, knee, ankle, toe) carried by `build.mjs` / `keyed.ts`
   with the keyed pelvis height absolute, or a hand-off to the body / ragdoll pose once lying.
5. Pairing with Wren: the guard's neck at about (0, 1.38, -0.175) in his body frame at Wren's scale; the sag ends with his
   head about 1.05 m behind his root (Wren steps back about 0.8 m between 2.6 and 3.9 s, or the root moves); the collapse:
   Wren lets go at about 0.35 s. Check the 3 cm clearance in e2e-clip.
6. Keys authored on Wren's armature (1.68 m), stored at 1.75 m and scaled by rig height: check the hand contact on the
   guard's proportions.

## Open
Palm direction (A4) in game; the forearms swing through horizontal as the hands drop (Michael's eye); the choke may want
4.5 s for gameplay; sheets are capsule renders, not GPU or in game.
