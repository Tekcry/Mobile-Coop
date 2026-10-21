# anim-skeleton - state

## Now
P0 prototype done (docs/anim-skeleton/proto/): sheets sent to the orchestrator; waiting on its go before S1.

## Next
S1 (asset): LOD0 / LOD1 fingers and clavicles, LOD2 clavicles, from the P0 script; clavicle pivot at the SC joint (proto REPORT).

## Open
- Routing (orchestrator, 2026-10-21): C edits the rig parts of `src/player/characterRig.ts` (clavicle and finger
  nodes, the new channels, the FK leg blend), leaves B's row code alone and rebases on B. A1 confirmed (keyed.ts,
  `src/operators/runtime/*` keeping `rig.tuneRows = true`, operatorBody, lodChecks, `scripts/operators/*`, the Wren
  assets are C's). After #83 (T1a) merges: C edits `key_clip.py`, `tuneKeysFile.ts`, `tuneKeys.ts` and a `studio.ts`
  `skeleton_test` entry (opt-in, the 28 clips byte-identical), and tells Course Ready which lines. After B merges: C
  adds clavicle and finger joints to `tuneJoints.ts` JOINTS and per-finger curl / spread to `tuneHands.ts` (B's now).
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
