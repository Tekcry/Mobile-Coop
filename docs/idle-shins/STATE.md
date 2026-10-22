# idle-shins - state

Patch job (orchestrator 2026-10-22 ~14:30). Michael: "Widen just enough. They didn't clip when I viewed it though".
Branch feature/idle-shins from master 4.54.0 (99f3e488), folder C:/NightShift/Mobile-Coop-idle-shins.

## Now (2026-10-22 ~15:25)
Michael (via the orchestrator, 15:05): "Michael's idle trackMul 0.05 stays (revert the 0.3 try); the mesh never clips, so
fix only the frame-0 overlap the audit sees." Done:
- Reverted `body.idle.trackMul` to 0.05 (the identity fixture and BAKE.md back to master).
- Cause (headless, the audit's `tp` replayed: planner reset + idle / still clocks zeroed): before a teleport the idle
  reads 0.00 cm (the feet stay where spawn planted them, ±7.1 cm, the body rows still easing in); after
  `FootPlanner.reset` the feet sit on the 0.05 ideal, ±0.4 cm off the midline, 7.7 cm staggered: shanks 2.36 cm in
  (in-game 3.18), held until the first step. Frame 0 is only the first of equal frames. Every free-movement landing
  (`aim`) clamps into the stance band (3-9 cm, `bandMin` / `bandMax`); `reset` skipped it.
- Fix: `reset` lifts a foot to the band's floor (widen only, never narrows) on Wren rigs only
  (`FootPlanner.resetBand`, set by `CharacterRig.tuneRows`): the first try (whole band, every rig) changed the guard and
  dog identity hashes. Headless 2.36 -> 0.3 cm. tests/idleShins.test.ts rewritten; footPlanner, both identity tests pass.
- Desktop anim-audit on 4b2fe50f (15:40, /c/NightShift/ish2-audit.log): every frame-0 selfShanks row gone; selfShanks
  local 38 -> 8, remote 8 -> 3; fails local 659 / remote 80 (#103 703 / 108, the 0.3 try 689 / 89). Per metric vs #103:
  footSlideR 20 -> 14, jointRate 51 -> 42, remote footSink 11 -> 0; worse: local selfThighs 64 -> 65 (raise 60 Hz, 2.52
  cm at frame 0), remote pelvisJump / pelvisP2P +1 each (remote rows vary run to run).
- Why raise gained a thigh read (DUMP=1 --only=raise, test-results/aa-raise vs aa-raise-pre on #103's dist): before the
  fix the teleport left the feet CROSSED in-game (ankleL 1.1 cm right of the midline, ankleR 1.1 cm left: the 0.05 track
  plus IDLE_STANCE.extra -1.5 cm); now ±3.0. The knees move 0.5 cm in (±6.45 -> ±6.0) and bend 1.8 cm more
  forward, so the thigh capsules read 2.52 (were ~1.55). Accepted as the trade (shank 3.18 fail gone, feet uncrossed,
  the mesh never clipped); listed in the PR. stance 60 Hz selfThighs was already failing (2.65 -> 3.12 in the full run,
  2.52 at frame 0 solo).
- Running 15:45: /c/NightShift/ctb6.sh (check + e2e-anim e2e-move e2e-clip e2e-netmove; then N1 / master e2e-clip --log).

Not fixed (not frame 0, out of scope by Michael's rule): turn180 120 Hz 2.36 cm at frame 134 (a turn's re-step onto the
narrow ideal), stance / drop24 / wall / slope35-stand4 rows (on master or #103 already).

## History: the 0.3 try
Built: `src/anim/animBase.ts` body.idle.trackMul 0.05 -> 0.3 (walk / jog / run keep 0.05). Headless selfShanks (audit
maths, shank capsules 2 x LIMB_RADIUS.shank): 0.05 2.42 cm, 0.15 1.93, 0.25 1.27, 0.3 0.85, 0.4 0 (the in-game audit
read 3.18 at 0.05, ~1.3x headless: 0.3 estimated 1.1-1.6 cm, limit 2.0). Mesh: the skinned wren-lod0.glb shins never
interpenetrate (closest gap 4.8 cm at 0.05, 10.4 at 0.3): only the audit's proxy capsules overlapped (the GLB knees sit
at +-12.8 cm, the rig's proxy knees +-7.5 cm), which is why Michael saw no clip. tests/idleShins.test.ts; the Wren
identity fixture re-captured (26 of 40 entries, every scene through the idle row); guard fixture unchanged.

## Desktop anim-audit on 9257c788 (14:47-14:50, /c/NightShift/ish-audit.log)
Not enough: selfShanks 3.18 -> 2.40 cm (limit 2.00), still at frame 0 of every standing row (local fails 689 / remote 89
vs #103's 703 / 108, master's 645 / 89). The headless estimate (0.85 cm at 0.3) does not match the audit's frame 0: the
overlap at frame 0 is the moment right after the audit's teleport (`tp`), so it likely comes from the stance the
teleport leaves (the walk / run rows' trackMul 0.05 easing over BODY_TAU, or the planner's re-init placing the feet on
the narrow track before the idle row takes over), not the settled idle stance.

## Next
1. /c/NightShift/ctb6.out: check + the 4 suites green -> PR (patch) for train 4 with the audit numbers above; message
   the orchestrator.

## Resume prompt
```
Night Shift | CT Core Build: resume idle-shins from docs/idle-shins/STATE.md on feature/idle-shins
(C:/NightShift/Mobile-Coop-idle-shins). Follow "Next"; then the next row of docs/orchestrator/resume-ct-core.md
(origin/feature/menu).
```
