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
   (Item 2 addition, Michael approved 2026-10-21 01:15: a targeting strength slider per limb, left / right hand and
   left / right foot, 0 to 1, per state, default identity (today's IK weight), so joint offsets show instead of being
   pulled back by hand-on-gun or planted-foot IK; table in our file, one-line hooks in IK / footPlanner.)
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
- M1 (2026-10-21 01:15, via the orchestrator): add a per-limb IK targeting strength slider to item 2.

## Assumed decisions (undo in brackets)
- A1 Mirror lock in the panel: the registry sync mirrors the side just edited (the change log's last entry) onto its
  partner in the table and the registry, with no extra log entry; loads and group resets copy as is; item 1's own
  `jointsMirror` stays off. [Undo: use item 1's `jointsMirror` flag in `src/anim/tuneV2Sections.ts`.]
- A2 Per-key editing (item 4) leaves out the head, shoulders, hips, knees, ankles and toes. The key format does have leg
  channels (flex, add, knee, ankle), but the runtime clip carries no leg rotations: the game's legs come from the foot
  planner, so leg keys only feed the Blender preview; the head rides the neck. Keys are named by index plus phase (the
  files name no phases). [Undo: add those joints to `src/anim/tuneKeys*` and, for legs, carry leg rotations in the
  runtime clip.]
