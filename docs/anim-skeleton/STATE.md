# anim-skeleton - state

## Now
S1 (asset) building: Michael approved P0 ("Go, smooth fingers too"); shipped GLBs gain clavicles and fingers, LOD0 / LOD1 knuckle loops within the triangle budgets.

## Next
S1 checker, then S2 (runtime rig): clavicle and finger nodes, per-finger drive, bit-identity test; stop the hero grip morphs doubling the finger bones.

## Open
- Routing (orchestrator, 2026-10-21): C edits the rig parts of `src/player/characterRig.ts` (clavicle and finger
  nodes, the new channels, the FK leg blend), leaves B's row code alone and rebases on B. A1 confirmed (keyed.ts,
  `src/operators/runtime/*` keeping `rig.tuneRows = true`, operatorBody, lodChecks, `scripts/operators/*`, the Wren
  assets are C's). After #83 (T1a) merges: C edits `key_clip.py`, `tuneKeysFile.ts`, `tuneKeys.ts` and a `studio.ts`
  `skeleton_test` entry (opt-in, the 28 clips byte-identical), and tells Course Ready which lines. After B merges: C
  adds clavicle and finger joints to `tuneJoints.ts` JOINTS and per-finger curl / spread to `tuneHands.ts` (B's now).
- #83 (T1a) merged as 4.36.0 (orchestrator, 2026-10-21): merge master into this branch after S1 (not mid-slice); the
  A-file edits (S3 / S4) are open; tell Course Ready (on T2, tuner UI) the exact lines before editing.
- Reported to the orchestrator: LOD0-2 lost their grip morphs in the 10-20 rebake (BRIEF "Facts").

## Done
- 2026-10-21: survey; BRIEF, PLAN, STATE.
- 2026-10-21: P0 prototype: 55-bone game armature (clavicles + 30 fingers), rest error 1.2e-7 m, skeleton_test clip, sheets.

## Resume prompt
```
Night Shift | Menu Notes Build: anim-skeleton RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-skeleton/STATE.md,
BRIEF.md and PLAN.md in C:/NightShift/Mobile-Coop-anim-skeleton (branch feature/anim-skeleton; branch guard before every
write). Continue from "Now": implementer + fresh checker per slice, one fix round; heavy runs take
C:/NightShift/heavy.lock; message "Night Shift | Orchestrator" at each slice and PR. Opus, high effort.
```
