# Menu job - slices and resume point (2026-10-18)

Michael: "Proceed with 1-4. 5 can proceed when wren has been pushed." Each slice: one implementer (Sonnet, medium effort from slice 3; Michael 2026-10-18: prototype slices run lighter, fine tuning later on Opus;
docs/archive/menu-ui/AGENT-PREAMBLE.md), light check, commit, push, screenshots to Michael, then the next slice.

| Slice | Content (menu steps) | Status |
| --- | --- | --- |
| 1 | Tokens, font, MenuScreen template, title, main menu (01, 02, 04) | Done 1ac6053 (SLICE1.md) |
| 2 | Input parity, settings, remap (03, 05), e2e-menus | Done (SLICE2.md) |
| 3 | Co-op lobby (2 players) and dialogs / on-screen keyboard (06, 09) | Done (SLICE3.md) |
| 4 | Missions, briefing, issued-kit view (07, 08; fixed kits D-11) | Done (SLICE4.md) |
| 5 | Pause (blur, player sharp, objectives G108) and results (10) | Done (SLICE5.md); rerun: e2e-menus, e2e-mouse, e2e-pad pass; e2e-coop known flaky (offline state step) |
| 5b | Michael's /ct/ playtest notes (docs/ct-prototype/PLAYTEST-1.md): Brightness and Quit to menu drew under the menu labels (z-index 1); fix: `.dialog-screen { z-index: 2 }` (a stacking context on every screen slowed software-GL frames and broke e2e-menus' slider repeat). Removed the dead rows Aim assist, Camera recentres, Grab (settings fields kept, no save change). Remap follows CT-CONTROLS.md via the bind tables: no menu work | Done 2026-10-19; e2e-menus and smoke pass |
| 6 | Cinematic background (11-13), reworked to Michael's direction overnight: hero title (Wren facing the lens, goggle flicker-on, carried into the main menu without a cut) and equipment / armour macros H1-H6 in a black void | Done 2026-10-19 (b1ead8a + fine-tune), SLICE6.md; check, e2e-menus, smoke, e2e-desktop pass. Open: GPU perf check, /preview/ pointer (push to dev blocked by permissions, Michael to move it) |

Resume: `git status` in C:\NightShift\Mobile-Coop-menu shows a running slice's uncommitted work; finish it from its
SLICE<n>.md / the brief above, check, commit, push, then the next slice.

## Update 2026-10-19 (night)
Wren merged (PR #5, master 9295c65). Michael's goal is in master's CLAUDE.md "Current goal" (PR #6): co-op training
prototype first, no refining before his playtest. Overnight: CT Core Build on the desktop (feature/ct-prototype; Michael
walks /ct/ at 10:00, no ct-movement pushes from 09:30), the weapons job on the laptop (feature/weapons, stops about
09:00), this menu job: fix slice 5b, master merged in, then slice 6. Item 1 below is done (merged by Michael).

## Main session coordination (resume point, 2026-10-18 evening)
The "Night Shift | v4 Rebuild" session coordinated the consolidation (4.0.0, PR #3), the research (PR #4, G124-G160),
this menu job and the other sessions. Open items it was holding:
1. Review the operators PR (Wren for both players, G123; the session said it opens about 21:30-22:00 Sydney) before
   Michael merges: Wren in both slots, gameplay unchanged (G38), goggle glow colour per player (G135), its decisions
   renumbered after G160, check / e2e results.
2. After Wren merges: menu slice 6 (cinematic background with Wren's poses, menu steps 11-13; edits
   src/world/menuScene.ts, now free), on Sonnet medium; then open the menu PR feature/menu -> master (Michael's menu
   notes first). Move the preview with `git push origin feature/menu:dev`.
3. After Wren merges: the operators session builds the Blender placeholder weapons (rifle with launcher tube and
   suppressor, suppressed pistol with jammer emitter, knife; docs/archive/progress.md row on this branch).
4. Scratch Moth (estimated half a day to a day in the operators pipeline after the weapons; Michael asked "don't
   action yet").
5. Michael has not answered whether to delete the merged branch feature/ct-research (the raw research is kept as the tag
   archive/ct-research-raw).
6. Preview slots: `dev` = this branch (/preview/), `ct-movement` = feature/ct-prototype (/ct/, moved by CT Core Works).
   Both are pointer branches only (G83: no direct work on them).
7. The CT Core Works session (feature/ct-prototype, docs/ct-prototype/FEEL-PLAN.md) owns pure-CT movement then the
   Fallow co-op training bunker (G161, G162 on that branch); it stops after each slice while Michael is awake.

## 2026-10-19 morning
- Michael: "You have my approval to merge yourself as needed" (09:25). The main session merged PR #6 (goal) and PR #8
  (menu) into master (99cd3f3) and moved `dev` (/preview/) to master. CT Core Build merges master next and opens its
  PR; the main session reviews and merges it when it is green.

## Michael's walk-test menu notes (2026-10-19, after gameplay fixes: "i would rather fix the gameplay/animation issues before playing around with the menu")
- Music starts at the "press any key" title screen.
- Preload shaders and the hero before showing it (it is jumpy while loading); a Night Shift load screen is fine.
- No way back from the main menu to the "press any key" screen.
- Check the menu model is really the full hero quality.
- The hand clips the magazine in the menu idle stance.
- Bring the rifle and pistol into the main menu, with holding and idle poses.
- The Controls menu and Settings > Controls do the same thing: merge them.
- (Gameplay notes went to CT Core Build: docs/ct-prototype/PLAYTEST-2.md on feature/ct-prototype.)
