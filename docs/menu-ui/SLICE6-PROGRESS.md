# Slice 6 fine-tune progress

One line per meaningful GPU set (`docs/menu-ui/shots/6-hero-gpu-*.png`, E2E_GPU=1 SHOT_GFX=high).

- 04:12 First GPU set of the fine-tune edits. The fitted key shadow darkened H2-H6 (arm and shoulders swallow the raking key), so the void is unshadowed again; H6 key 7.5 now reads; dutch rolls (H1, H3, H5) frame fine; DOF lens in.
- 04:40 H3 framed lower onto the magazine pouches and key 3.2->7 (the pouches read now); H4 framed lower onto the belt pouches and round so the hand leaves the frame (a soft forearm stays at the left edge, behind the list); H6 key raised to rake down the back plate (its edges and fittings read).
- 05:00 Full GPU set: H3 slide narrowed so the pouches stay in frame start to end; H4 kept low (a high-angle try read worse) with the key aimed at the belt line; H2 key now slides down the plate. Pass start / end frames checked for H1-H6 (framing holds; dutch rolls fine).
- 04:52 Software-GL set regenerated (6-hero-*.png; the script's screenshot timeout raised to 180 s, software GL under load took over 30 s). T1 there shows LOD2 (layout only). Tuning stopped here; final checks next.
- 04:51 H1 reframed up and right (target lower and forward onto the goggle, radius 0.62/0.56 -> 0.66/0.6): both lenses clear the description panel from start to end of the pass (orchestrator's note). GPU and software H1 regenerated.
- 05:10 Final: npm run check pass; e2e-menus, smoke pass; e2e-desktop failed once (benchmark feedback-save race under load, unrelated), passed solo. SLICE6.md Results filled in.
