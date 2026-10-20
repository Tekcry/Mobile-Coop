# Night vision pass - brief

Job lead: "Night Shift | Menu Notes Build" (desktop; Michael chose "Run it in Menu Notes", 2026-10-20 15:15, through the
orchestrator), branch `feature/nv-pass`, folder `C:/NightShift/Mobile-Coop-nv-pass`, started 2026-10-20 from master
4.14.0 (cf73f8b5). One PR to master; the orchestrator sets the version and merges.

## The ask
Michael 2026-10-20 15:00 (verbatim): "Its hard to tell, the night vision is so poor. I cant see properly at night, and
the bodies are very bright. It needs work to make it look more realistic, and to expand the goggle outline to be less
intrusive and show more of the screen, it feels claustrophobic."

Michael 2026-10-20 15:05 (verbatim): "swapping between vision modes is hard too, i would suggest pressing a button while
in the weapon menu hovered over the vision mode to cycle between them, you should press A or something to have it cycle
through like a carousel."

## Goal
1. Night vision that reads in the dark and looks like a real tube: an auto-gain that lifts dark areas without
   flattening them; bright sources and lit bodies bloom and the gain pulls down around them; no glowing bodies; soft
   grain, a slight vignette, no crushed blacks. Every graphics preset.
2. The goggle outline much less intrusive: a wider, thinner frame that shows most of the screen (no tunnel), keeping
   the goggle's identity.
3. A vision-mode carousel in the selection wheel: hovering the vision slot, A cycles the modes with the current one
   shown; release selects.

## Limits
- Light parity (hard rule): what the player sees, the light meter and guard perception agree. Night vision is a view
  filter only; it never changes gameplay light.
- The goggle model stays (G69, G169, roadmap "Decided": the redesign is parked); only the HUD outline changes.
- Vision modes and their order stay CT's (G99, G100); one button toggles the selected mode (G181).
- Slice 3 touches the wheel in `src/ui`, held by CT Core until its anim-rework slice 1 PR merges: it waits for the
  orchestrator's go. Slices 1-2 first.
- CT Core has first claim on the desktop `heavy.lock` and the GPU; GPU shots (port 4189, `E2E_GPU=1`, headless) in the
  gaps; logic suites to the laptop runner when the desktop lock is held.
- Prototype effort (CLAUDE.md "Current goal"): the look Michael asked for, no long tuning.

## Michael's answers
(none yet)

## Assumed decisions (undo in brackets)
- A1 Modern green phosphor (the orchestrator's assumption; Michael did not pick). White phosphor is the alternative.
  [Undo: the tint constants in the night-vision look.]
- A2 e2e-darkness night-vision target at level 0.12: min 0.2 -> 0.1, max 0.45 kept (orchestrator approved 2026-10-20
  19:10 on evidence). The probe card is a non-voxel surface, so it takes slice 1's capped body fill; GPU at 4a6cd99f it
  reads 13.7% (rgb 16,40,14), and the s12b sheet shows yard-look, wh-workshop and yard-s7-stair readable under NV
  (walls, rails, the crouched guard). Lifting the card to 0.2 would brighten bodies again ("the bodies are very
  bright"). [Undo: `VISION_TARGETS` in `src/world/darkCurve.ts` and `scripts/e2e-darkness.mjs`, `tests/darkCurve.test.ts`
  ratio 2.5 -> 5, and raise `BODY_FILL.nv`.]
