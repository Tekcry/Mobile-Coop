# anim-skeleton - state

## Now
P0 prototype: the Blender rig change on a copy of `wren-lods.blend`, the test clip, the render sheet.

## Next
Screenshot to the orchestrator, then S1 (asset).

## Open
- Ownership of `src/player/characterRig.ts` (shared with B) and `src/anim/tuneHands.ts` (unassigned): asked of the
  orchestrator (BRIEF "File areas").
- R3 needs `scripts/anim-keys/py/key_clip.py` (A) to export the leg channel; the Keys rows need `tuneKeysFile.ts` (A);
  the Joints rows need `tuneJoints.ts` (B). Routed through the orchestrator.
- Reported: LOD0-2 lost their grip morphs in the 10-20 rebake (BRIEF "Facts").

## Done
- 2026-10-21: survey; BRIEF, PLAN, STATE.

## Resume prompt
```
Night Shift | Menu Notes Build: anim-skeleton RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-skeleton/STATE.md,
BRIEF.md and PLAN.md in C:/NightShift/Mobile-Coop-anim-skeleton (branch feature/anim-skeleton; branch guard before every
write). Continue from "Now": implementer + fresh checker per slice, one fix round; heavy runs take
C:/NightShift/heavy.lock; message "Night Shift | Orchestrator" at each slice and PR. Opus, high effort.
```
