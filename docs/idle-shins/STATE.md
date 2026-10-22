# idle-shins - state

Patch job (orchestrator 2026-10-22 ~14:30). Michael: "Widen just enough. They didn't clip when I viewed it though".
Branch feature/idle-shins from master 4.54.0 (99f3e488), folder C:/NightShift/Mobile-Coop-idle-shins.

## Now (2026-10-22 ~14:55)
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
1. Find what sets the shins at the audit's frame 0 (scripts/anim-audit.mjs `tp` and the first recorded frame; the body
   row the rig holds then; the planner's init placement): measure headless the same way the audit does at frame 0
   (not after 3 s of idle). Widen only that, just enough (Michael: "Widen just enough").
2. Desktop anim-audit: selfShanks < 2.0. Then PR (patch) for train 4; the body says the mesh never clipped (audit
   capsules only: the GLB shins are 4.8 cm apart at 0.05).
