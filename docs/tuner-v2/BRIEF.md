# Animation tuner v2 (tuner-v2) - brief

Job lead: "Night Shift | Menu Notes Build" (desktop), assigned by the orchestrator 2026-10-21 ~00:30, after the
camera-cue PR. Branch `feature/tuner-v2` from master 4.20.1 (6a4fb07f), folder `C:/NightShift/Mobile-Coop-tuner-v2`.
PR(s) to master; the orchestrator sets the version and merges. A movement tool: movement has first claim on the lock.

## The ask
Michael (verbatim, via the orchestrator): "I feel like I can't adjust where arms/hands sit, adjust feet getting stuck
while running" and "Can I reposition hands on guns, fingers, gun overall size etc?" He wants full freedom to fine-tune
animation.

## Goal (in order, one commit each)
1. Per-joint offsets per state: spine, chest, neck, head, shoulders, upper arms, elbows, wrists, hips, knees, ankles,
   toes on 3 axes, applied after the clip and before IK; a mirror lock (left = right mirrored).
2. Hand and foot placement: per state and weapon, position offsets (fwd / up / out) for each hand and foot IK target,
   hand rotation, hand-on-gun grip offsets. Plus a Weapon group per weapon (rifle, pistol, launcher / knife if held) and
   per state: gun scale (visual only; ballistics, aim ray and gameplay muzzle origin unchanged), gun position / rotation
   in the hand (grip socket offset), support-hand position along the handguard / slide and its rotation, trigger finger
   on / off, per-finger curl and spread for both hands (thumb, index, middle, ring, little), applied after the hand pose.
3. Stepping controls (fixes "feet getting stuck while running"): per gait foot lift height, plant lock strength, step
   duration, foot-slide tolerance, stride vs speed curve, toe-off and heel-strike roll, replant threshold; find the
   foot planner's stuck-foot cause (`src/anim/footPlanner.ts`; CT Core edits it for slice 4: hooks only, one-line
   reads, coordinate through the orchestrator).
4. Per-key editing: pick a keyed clip and one of its keys (contact, down, passing, up ...), adjust joints at that key
   only, preview live; export in the `scripts/anim-keys` key JSON format so edits bake straight into the clips.

## Limits
- Defaults are identity (exact current output). Hot paths do not allocate. Same IndexedDB save and Export as the
  current tuner. Pad + keyboard and mouse.
- New files for new tuner groups; Course Ready builds the Anim Studio stage, loop player, free view and undo / presets
  in parallel and documents the tuner group API in `docs/anim-tuner/STATE.md` (read first). Shared files only through
  the orchestrator.
- Panel wiring only through Course Ready's section registry (`registerTuneSection`: follow, picker, reset, save, export,
  change log and pad control come with it; API in `docs/anim-tuner/STATE.md` "Section registry (for other jobs)").
  Build the pure group tables and hooks first; wire into the panel once the orchestrator sends the registry's head.
- Checks: `npm run check`, e2e-anim, e2e-menus (laptop via the orchestrator). Lean, one check each.

## Michael's answers
(none yet)

## Assumed decisions (undo in brackets)
