# Menu UI - slice 1 (prototype, visible core)

Branch `feature/menu` (from master 4.0.0), 2026-10-18. Prototype first (G87): working and visible, not polished.
Desktop only (G12). Covers parts of steps 01, 02 and 04; the step files stay the full plan for the later slices.

## Built
- **Font (step 01 item 1-3, MD1)**: Barlow Condensed 500 / 600 / 700 from google/fonts `ofl/barlowcondensed/`
  (Michael approved the download, 2026-10-18), bundled in `src/ui/fonts/` with `OFL.txt`, `@font-face` in
  `src/styles.css` (Vite-resolved, `font-display: block`), precached by the service worker (`ttf` added to the workbox
  glob). Credit in `docs/art-credits.md` (new). CLAUDE.md hard rules carry the MD1 exception line. Never fetched at
  runtime. Applied to the menus (`.screens`) and the boot overlay only; the HUD keeps its font (open question 4).
- **Tokens (step 01 item 4, SPEC 2)**: every SPEC colour token in `:root` (`--ink`, `--ink-2`, `--text`, `--text-hi`,
  `--muted`, `--ghost`, `--line`, `--hl`, `--hl-rgb`, `--warn`, `--danger`, `--ctx-bg`; `--accent` is an alias of
  `--hl`), the type scale as `--fs-*` times `--ts` (fixed at 1 for now), the frame and spacing as `--sp-*`, the menu
  stack `--font-menu`.
- **Template (step 02)**: `src/ui/menuScreen.ts` `MenuScreen extends Screen`: ghosted two-line title, diagonal
  hairline, body column, context panel (`data-ctx` of the focused element on `nav-focus`; empty hides it), and the
  legend bottom-left. Legend items are `button[data-legend]` (not in the focus order); a click runs the same handler
  as the button (`nav.confirm`, `manager.back`, `onAlt`, `onTab`). Glyphs: every device's glyph is emitted in a fixed
  38 px slot (`.gl`) and the body class shows one, so a device switch moves nothing (the shot script checks the boxes:
  equal). No `.hints` footer and no `.screen-back` button on template screens; the legend hides while a dialog is on
  top (`.under`). Item look per the prototype: condensed caps, gradient highlight bar with scanlines, 3 px edge marker,
  label white / bold / 6 px right; locked items dimmed with "LOCKED", focusable, reason in the context and a toast.
- **Main menu (step 04, MD6)** on the template, ghost MAIN / MENU: Missions (count), Co-op ("Offline" counter when
  offline), Training (locked: the bunker is rebuilt after the prototype, G79), Free roam, Loadout, Settings, Feedback
  (open notes count; opens Settings on the Feedback tab); Legacy before Settings with `?legacy=1` (the old Play screen
  with Hunter / Mission). Every item has `data-key` (`missions`, `coop`, `training`, `freeroam`, `loadout`, `settings`,
  `feedback`, `legacy`) and context text. `MainMenuScreen.entries` stays the registration point (key, label, order,
  counter, ctx, hidden, locked, action). Missions and Free roam open today's Play screen preset to Infiltration /
  Free roam (`PlayScreen` takes an optional mode). Profile badge only with `?legacy=1` (MD19); item icons gone;
  version bottom-right; tagline top-right.
- **Title screen (step 04, MD2)**: `src/ui/screens/titleScreen.ts`, NIGHT over SHIFT, "Press [glyph] to start", over
  the current menu stage. Once per launch; skipped by `?autostart` and after a match; under webdriver only with
  `?title=1`. Any key, click, A / B / Y / bumpers continue (a key with no menu action continues on the next update so
  nothing leaks to the main menu). Back on the main menu returns to it (not under automation without `?title=1`).
  First-run brightness now follows the title.
- **Boot overlay (7.1)**: NIGHT / SHIFT ghost, a 1 px progress line in `--hl`, status text in the menu font.
- **Screenshots**: `scripts/menu-shots.mjs` (1920 x 1080, software GL, a layout check only) wrote
  `docs/menu-ui/shots/slice1-title.png`, `slice1-main-first-kbm.png`, `slice1-main-lower-kbm.png`,
  `slice1-main-lower-pad.png` (the last two: keyboard vs pad glyphs on the same focus).

## Files
- New: `src/ui/menuScreen.ts`, `src/ui/screens/titleScreen.ts`, `src/ui/fonts/` (3 TTF + `OFL.txt`),
  `scripts/menu-shots.mjs`, `docs/art-credits.md`, `docs/menu-ui/SLICE1.md`, `docs/menu-ui/shots/slice1-*.png`.
- Changed: `src/styles.css` (font-face, tokens, a new "Menu UI (menu-ui slice 1)" block at the end),
  `src/ui/screens/mainMenu.ts` (rewritten on the template), `src/main.ts` (entries, title / brightness order, badge),
  `src/ui/screens/playScreen.ts` (optional preset mode), `src/ui/screens/settingsScreen.ts` (`openTab`),
  `index.html` (boot title spans), `vite.config.ts` (precache `ttf`), `CLAUDE.md` (MD1 line),
  `docs/menu-ui/DECISIONS.md` (G113 line).
- Tests updated for the flat menu: `scripts/e2e-park.mjs` (Missions / Legacy, ghost title, no badge, the item keys),
  `scripts/e2e-mouse.mjs` (Missions), `scripts/e2e-clear.mjs` and `scripts/e2e-progression.mjs` (legacy suites).

## Skipped (later slices)
- woff2 Latin subset: fonttools is not installed, so the TTFs (about 105 KB each) are bundled as they are.
- Accessibility settings (text size, high contrast, reduced motion; step 01 items 6-8); `--ts` stays 1.
- Removing the old "Silent But Deadly - menu theme" block (step 01 item 5): the other screens still use it.
- Input parity (step 03): hover does not move focus yet; X / Start legend actions have no handler; WASD, Space, mouse
  button 4 unchanged.
- `prompts.ts` rewrite and the `DevMenuScreen` / `?menuDemo=1` demo, unit tests `tests/prompts.test.ts` and
  `tests/menuScreen.test.ts`, the `e2e-menus` suite (step 02 / 04 tests).
- Continue (no mission checkpoint save exists yet: hidden), Missions "unlocked / 8" (no unlock data: the count only),
  Training done / total.
- Brightness screen restyle, the match-loading boot variant (mission name, district, briefing line).
- Version bump, CHANGELOG, TESTING, `docs/systems/ui.md`.
- The 3D background, hero poses (later slice; `src/world/menuScene.ts` untouched).

## Open items
- Michael: look at the shots (or the PC build) and say whether the look is right before the template spreads.
- GPU check on the PC (`E2E_GPU=1`) of title and main menu: pending PC run.
- The ghost title reads brighter over the lit stage than in the prototype; tune `--ghost` with the real background.
- SPEC open questions 1-5 still stand (key mapping, remap cancel, Feedback on the menu, HUD font, title wording).

## Results (2026-10-18, software GL)
- `npm run check`: lint 0 errors (41 old warnings), 129 test files / 1465 tests pass, build ok (the 3 TTFs are hashed
  into `dist/assets/` and precached by `sw.js`).
- e2e on port 4191: smoke, e2e-park, e2e-pad, e2e-mouse, e2e-feedback, e2e-offline and e2e-desktop pass (e2e-park and
  e2e-pad after their selector updates, both rerun alone). e2e-coop fails alone twice on "client strike denied", the
  open pre-existing failure in `docs/backlog.md` (an in-match step, not the menu).
- Title flow (a scratch check, not a suite yet): any key, Enter, a click and pad A each leave the title for the main
  menu with Missions focused and nothing opened below; Esc on the main menu returns to the title; the legend's Select
  click opens Missions.
