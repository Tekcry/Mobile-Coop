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

## Next
1. Desktop anim-audit on this head: selfShanks under 2.0 in the standing rows.
2. PR (patch) to master: joins train 4. The PR body says the mesh never clipped (audit capsules only).
