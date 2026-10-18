# Step 02 - screen-template (Block A)
The shared `MenuScreen` template (SPEC 3), the context panel, and a legend whose items are clickable and whose glyphs
switch live with the last-used device in fixed-width slots (MD10). Deps: 01. Model: Opus 5.5 / Opus 5.5. Local only.

## Read
- SPEC.md sections 1, 2, 3, 4.1, 6, 7.23; the prototype (`docs/menu-ui/prototype/index.html`: `legend()`, `glyph()`,
  `render()`, `focus()`, CSS `.ghost .list .it .ctx .legend .gl`).
- `src/ui/screen.ts` (`Screen`, `ScreenManager`, `attachChrome`, `hintsEl`), `src/ui/prompts.ts` (`promptHtml`,
  `hintsHtml`), `src/input/inputManager.ts` (mode events, `pad-ps` class), `src/input/gamepadMapping.ts` `GLYPHS`.
- `src/ui/focusNav.ts` (`nav-focus` event), `src/ui/dom.ts` `h()`.

## Task
1. New `src/ui/menuScreen.ts`: `MenuScreen extends Screen` with `title: [string, string]`, optional `tabs`, a body
   kind (`list | rows | cards | custom`), `legend(): LegendItem[]`, `context(el)`, `defaultFocus`, `back()`. It
   renders: `.ghost` (two spans), `.hair`, body, `.ctx` (`id` per screen), `.legend`. Layout per SPEC 2 (logical px).
2. `LegendItem = { act: 'confirm'|'back'|'x'|'y'|'tabs'|'lb'|'rb'|'cycle'|'start'|'scroll'|'any', label, keys? }`.
   `keys` overrides the keyboard glyph (typing screens: "A-Z", "Enter", "Bksp").
3. Legend items are `button`s with `data-legend=<act>`; click / tap runs the same handler as the button (the
   ScreenManager action router, not a synthetic key). They are not in the focus order.
4. Glyphs: rewrite `prompts.ts` to emit one glyph for the current device (pad Xbox, pad PlayStation, keyboard
   keycaps, touch dot) inside a 38 px slot; Nintendo pads use the Xbox set (as now). On the input `mode` event,
   every visible legend and tab bump re-renders its glyphs only (labels untouched): no element moves.
5. Context panel: on `nav-focus`, the template writes the focused element's context (`data-ctx` html or a
   `ctx` callback) into `.ctx`; an empty context hides the panel.
6. The old `.hints` footer and the top-left `.screen-back` button go for template screens (the legend has Back).
7. Hide the screen legend while a dialog is open (`:has(.dialog-screen)` or a class).
8. Old screens keep working untouched until their step. For testing, build a small `DevMenuScreen` reachable with
   `?menuDemo=1` that shows a list, rows, a locked item and every legend action. Remove it in step 13.

## Tests
- `tests/prompts.test.ts`: glyph per device and pad style; `keys` override; slot width class present.
- `tests/menuScreen.test.ts` (node, a tiny DOM shim if the repo has one; else e2e only): context hidden when empty.
- e2e-menus (seed it here, extended in 03): `?menuDemo=1`, switch device keyboard -> pad -> mouse; legend and items keep
  their bounding boxes (0.5 px); clicking each legend item fires its action.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-pad e2e-touch e2e-desktop`.

## Commit
"menu-ui 02: MenuScreen template, context panel, clickable device-switched legend"
Then LOG, STATE, CHANGELOG, TESTING, docs/systems/ui.md (template section).
