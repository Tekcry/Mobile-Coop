# Menu UI redesign - decisions

**History.** Michael's current decisions are in `docs/DECISIONS.md` (G1 onward), which wins where this file differs; this file is kept as the record of its run.

MD = design decisions. "Michael" = chosen by Michael (multiple choice or his written brief, 2026-10-15). "Step 1 -
for review" = proposed in step 1 inside Michael's brief; it stands until he changes it. The implementation run logs its
own calls as A1, A2, ... "ASSUMED - for review" below the MD list (RULES.md).

## MD decisions

- **MD1 Font (Michael)**: bundle Barlow Condensed (SIL OFL 1.1) as self-hosted woff2, weights 500 / 600 / 700, Latin
  subset, in `src/ui/fonts/` with `OFL.txt`, credited in `docs/art-credits.md`. Michael approved it as an exception to
  the "no external assets" spirit of the CLAUDE.md hard rules: a font is not art, it is bundled and never fetched. Step
  01 adds one line to the CLAUDE.md hard rules: "Exception: the menu font Barlow Condensed (OFL), MD1."
- **MD2 Title screen (Michael)**: yes, once per launch. Skipped by `?autostart`, when returning from a mission, and
  under webdriver unless `?title=1`.
- **MD3 Pad text entry (Michael)**: our own on-screen keyboard grid (Osk). Code grid for room codes, full grid for
  names and the feedback note on a pad. Keyboard typing works at any time.
- **MD4 Highlight colour (Michael)**: goggle green `#38e08c`. Colour-blind safe because focus also changes bar,
  left edge marker, white bold label and a 6 px offset.
- **MD5 Screen names (Michael)**: plain names plus the bible's own terms: MAIN / MENU, SELECT / MISSION,
  MISSION / BRIEFING, KIT / LOADOUT, GAME / SETTINGS, CONTROLS / REMAP, CO-OP / LOBBY, JOIN / ROOM, FIELD / TERMINAL
  (pause), MISSION / RESULTS, BRIGHTNESS / CALIBRATION, PLAYER / NAME, FREE / ROAM, TRAINING / COURSES.
- **MD6 Main menu (Michael)**: flat list: Continue, Missions, Co-op, Training, Free roam, Loadout, Settings,
  Feedback (Legacy with `?legacy=1`). The Play hub and its Mode cycler go.
- **MD7 Pause (Michael)**: design the full Field terminal now (Resume, Objectives, Radio log, Map, Settings, Restart
  from checkpoint, Report feedback, Quit). Session 3 builds the list with Resume / Settings / Restart / Feedback / Quit
  working and Objectives / Radio log / Map as simple panels until Phase 4.
- **MD8 Save select (Michael)**: no save slots. The Missions screen uses the save-card look per mission (rating %,
  name, district, best rating, intel, last played). One profile.
- **MD9 Settings layout (Michael)**: a horizontal tab strip under the title (LB / RB, Q / E, clickable), rows below,
  context panel on the right. No category sub-screens.
- **MD10 Input parity (Michael, brief)**: one focus model on every device; hover moves focus and a click confirms
  the hovered item; identical layouts, order and actions; only glyphs change, instantly, with no layout shift; every
  legend item clickable; banned: hover-only tooltips, right-click-only actions, double-click, pad-only holds, anything
  that needs a mouse.
- **MD11 Key mapping (step 1 - for review)**: WASD navigates menus (not while typing); Space also confirms;
  secondary X = R key, Y = F key (E stays tab-next, ending today's E double use); Q / E tabs; mouse button 4 = Back;
  pad Menu is "Start" (Join / Done / Resume in pause), no longer a second Back. Full table in SPEC 4.2.
- **MD12 Controller disconnect (Michael, brief)**: pauses a solo mission and shows a dialog; co-op shows the dialog
  without freezing the simulation; menus toast only.
- **MD13 Remap capture cancel (step 1 - for review)**: cancel with Menu / Start on the pad or Esc on the keyboard
  (or click Cancel, or the 5 s timeout), not B, so B stays bindable. Locomotion step 18 says "Esc / B to cancel"; if
  step 18 lands that way, session 2 changes it to this.
- **MD14 Pause background (Michael, brief)**: depth of field focused on the player plus a dark vignette on tiers with
  DOF; low preset and phones get a plain dark overlay; render-only in `src/vfx`; no `backdrop-filter`.
- **MD15 Cinematic background (step 1 - for review)**: shot list S1-S7 in SPEC 8.1; holstered poses only until
  locomotion step 25 fixes aim from attached states; phones run S1 and S2.
- **MD16 Touch (Michael, brief + step 1)**: tap = focus + confirm (the loadout's "first tap previews" rule goes);
  the legend shows and is tappable on touch; hit areas at least 56 CSS px on `platform-mobile` (bible 5.10).
- **MD17 Accessibility (Michael, brief)**: menu text size 100 / 115 / 130 %, high contrast, reduced motion (System /
  On / Off), colour-blind-safe focus. Stored in `Settings.access` (no SAVE_VERSION change, as locomotion A3).
- **MD18 Dialogs and locked items (Michael, brief)**: confirm dialogs open on the safe option, which is first in the
  row; locked and disabled items stay focusable and show their reason.
- **MD19 Removals (step 1 - for review)**: the profile badge goes outside `?legacy=1`; the Accessibility > Controls
  reference screen goes (Remap is the reference); menu item icons go; Feedback gets a main menu item while the game
  is in playtesting (hide it for a release build with a flag).
- **MD20 Process (Michael)**: sessions 2-4 run the locomotion way (brief, plan, step files, implementer and fresh
  checker subagents, Opus 5.5) and start only after `feature/ct-locomotion` merges to master. Branch for the run:
  `feature/menu-ui` off master. Claude never merges.

## Remaining questions (ask Michael at the first pause, or earlier if he raises them)
1. MD11: are R and F right for the X and Y actions on the keyboard (R = reload and F = interact feel natural)?
2. MD13: confirm B stays bindable (capture cancels on Start / Esc).
3. MD19: keep Feedback on the main menu until release?
4. Should in-game prompts (HUD) switch to Barlow Condensed too? The spec keeps the HUD out of scope except glyphs.
5. Title screen: keep "Press (A) to start" wording, or "Press any button"?

## Run assumptions (ASSUMED - for review)
None yet.

## Later changes
- G113 changed (Michael, 2026-10-18): the menu update starts now, before the CT prototype; Michael: "I would really like to update the menu and use the new hero poses". Recorded in docs/DECISIONS.md at the menu PR with the next free G number.
