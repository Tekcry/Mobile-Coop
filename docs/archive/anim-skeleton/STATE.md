# anim-skeleton - state

## Now
S3+S4 PR to master (S4 3cf98038 + checker fix); full e2e on the laptop.

## Next
S4b exact preview (BRIEF item 30(e), PLAN S4b) after the PR. Then S5 leftovers. Check the 5-hour meter before each
agent; pause at 97%.

## Open
- Routing (orchestrator, 2026-10-21): C edits the rig parts of `src/player/characterRig.ts` (clavicle and finger
  nodes, the new channels, the FK leg blend), leaves B's row code alone and rebases on B. A1 confirmed (keyed.ts,
  `src/operators/runtime/*` keeping `rig.tuneRows = true`, operatorBody, lodChecks, `scripts/operators/*`, the Wren
  assets are C's). After #83 (T1a) merges: C edits `key_clip.py`, `tuneKeysFile.ts`, `tuneKeys.ts` and a `studio.ts`
  `skeleton_test` entry (opt-in, the 28 clips byte-identical), and tells Course Ready which lines. After B merges: C
  adds clavicle and finger joints to `tuneJoints.ts` JOINTS and per-finger curl / spread to `tuneHands.ts` (B's now).
- #83 (T1a) merged as 4.36.0 (orchestrator, 2026-10-21): merge master into this branch after S1 (not mid-slice); the
  A-file edits (S3 / S4) are open; tell Course Ready (on T2, tuner UI) the exact lines before editing.
- Goggle offset hook (orchestrator request, BRIEF item 22 is B's): `goggle.ts` GOGGLE_OFFSET / setGoggleOffset /
  goggleOffsetIdentity pushed (33a90d71); S1 adds skin joints goggleStow / goggleUse under the head; S2 applies it, read
  per figure inside that rig's animate window (a per-figure copy if the poser runs after all rigs); confirm the read
  point to CT Core when S2 is pushed. CT Core ships the goggle rows in a small PR after T3 reaches master.
- Track A items 23 (key timing, feature/marlow-key-timing) and 25 (add / delete keys) change tuneKeys*, the key
  format, build.mjs and key_clip.py: S3 / S4 rebase on both after they land (Course Ready tells us); our planned
  fields and channels were sent to it so it keeps an optional-channel path like `wrist`. Item 23 is PR #87 (head
  2504c787): a retimed key writes `phase`; new `scripts/anim-keys/meta.mjs` regenerates `src/anim/tuneKeysMeta.ts`
  (S3 / S4's new key fields must go through it); key_clip.py and build.mjs unchanged. Item 25 next (tuneKeys, key list).
- Test placement (orchestrator, 2026-10-21): full e2e goes to the laptop first (Character Build, E2E_JOBS=2); on the
  desktop only at E2E_JOBS=1 when the laptop is busy. Blender and GPU looks stay on the desktop.
- Reported to the orchestrator: LOD0-2 lost their grip morphs in the 10-20 rebake (BRIEF "Facts").

## Done
- 2026-10-22: S4 tuner rows (3cf98038): clavicle Joints rows, Keys fields on every keyed clip, legd with the planted-foot re-solve (0.00 cm on jog), rig.footSlide, auto opt-in bake; checker fix (allocation test); check pass.
- 2026-10-22: S3b (clip bake: key_clip.py opt-in clav / fing / leg, skeleton_test clip and studio entry, frame proof under 0.01 cm legs / 0.26 cm shoulders); check, e2e-studio, e2e-anim pass; GPU sheet s3/skeleton-test-studio.webp.
- 2026-10-21: S3a (runtime channels clav / fing / leg, FK leg blend, build.mjs emitter); checker PASS.
- 2026-10-21: #88 (S1+S2) merged as 4.42.0.
- 2026-10-21: S2 runtime rig (c5ec9350): clavicle, finger and goggle drive; A9 grip closes LOD0 / LOD1 hands; bit-identity fixture; checker PASS (fixture re-captured from pre-S2 code byte-identical). Polish: clavFrame only on the arm-solve path (check in S3 when clips write clavIn), mean-curl removal after clamp, extended finger slightly bent back (CURL_LIMIT.min), carrier strap moves with the shrug (A3).
- 2026-10-21: S1 asset (f3fdd667): clavicle, finger (LOD0 / LOD1, knuckle loops) and goggle joints in the Wren GLBs; checker PASS; laptop smoke, e2e-anim, e2e-studio pass. Master 4.38.0 merged (0c285c9d: T1a #83, J1 #84). Polish: thumb-index web spike, faceted fingers, hero poser test (S2), bake_lods SPEC bones text, half-patched re-run.
- 2026-10-21: survey; BRIEF, PLAN, STATE.
- 2026-10-21: P0 prototype: 55-bone game armature (clavicles + 30 fingers), rest error 1.2e-7 m, skeleton_test clip, sheets.

## Resume prompt
```
Night Shift | Menu Notes Build: anim-skeleton RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-skeleton/STATE.md,
BRIEF.md and PLAN.md in C:/NightShift/Mobile-Coop-anim-skeleton (branch feature/anim-skeleton; branch guard before every
write). Continue from "Now": implementer + fresh checker per slice, one fix round; heavy runs take
C:/NightShift/heavy.lock; message "Night Shift | Orchestrator" at each slice and PR. Opus, high effort.
```
