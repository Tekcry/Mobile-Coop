# Selection wheel restyle (wheel-ui) - brief

Job lead: "Night Shift | Menu Notes Build" (desktop), assigned by the orchestrator 2026-10-20 ~21:10 (roadmap Next 4).
Branch `feature/wheel-ui` from master 4.17.0 (1805f43d), folder `C:/NightShift/Mobile-Coop-wheel-ui`. One slice, one PR
to master (minor); the orchestrator sets the version and merges.

## The ask
Michael 2026-10-20 ~21:00 on /preview/ 4.17.0, phone screenshots (verbatim): "Weapon wheel needs to adjust dynamically
based on screen size. Also when is it getting a quick visual Ui pass to make it look better, like the reference." and
"Night vision is good now."
Earlier (docs/ct-prototype/PLAYTEST-2.md:17, verbatim): "make the weapon wheel slightly bigger and refine it so its not
just boxes, similar to the reference image but original".

## Goal (quick and functional, one slice)
1. Size: the wheel scales with the viewport, fits inside the safe area with a margin at any aspect (phone landscape
   included), never covers the top HUD (objective, compass, area label) or the hint box; at 16:9 desktop slightly
   bigger than today.
2. Look: not just boxes; an original radial design in the reference's spirit: segments on a ring, the selected one
   highlighted, icon and count, the vision slot showing the current mode; our palette and font.
3. The FPS banner (4.15.4) covers the compass and top HUD labels on the phone: move it to the bottom edge or wherever
   it covers nothing.

## Limits
- G181 governs the wheel's function; controls do not change (LB / Tab hold, release selects, the nv-pass carousel on
  the vision slot).
- IP (G5, G6): original art; no reference-game names or art.
- Prototype effort (CLAUDE.md "Current goal"): no long polish. Movement work has first claim on the desktop lock;
  logic suites go to the laptop runner via the orchestrator when the lock is busy.
- Checks: `npm run check`, e2e-gadgets, e2e-pad, e2e-menus; GPU before / after wheel shots at 16:9 and 2.17:1.

## Michael's answers
(none yet)

## Assumed decisions (undo in brackets)
- A1 The item label sits in the centre disc, not beside the ring. [Undo: move `.sw-label` out of `.sw-ring` in
  `src/ui/hud/gadgetWheel.ts` / `src/styles.css`.]
- A2 The FPS banner sits at the bottom left corner. [Undo: `.debug-overlay.compact` in `src/styles.css`.]
