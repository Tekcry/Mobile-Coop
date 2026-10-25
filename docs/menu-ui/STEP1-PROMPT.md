# Step 1 prompt - menu redesign design spec and working prototype

Paste everything below the line into a new Claude Code session opened in `C:\NightShift\Mobile-Coop` (or any
checkout of github Tekcry/Mobile-Coop). Read [README.md](README.md) for the plan and why this step is interactive.

---

Menu redesign, step 1: design spec and working prototype. This is an interactive design session with no game code
changes. Michael approves the design before anything is built.

## Setup
- Work in a separate worktree on the existing branch `feature/menu-ui-spec` (docs only, based on master):
  `git fetch origin && git worktree add ../Mobile-Coop-menu-ui feature/menu-ui-spec` (or reuse that folder if it
  exists and is clean). Never switch, stash or reset the main checkout.
- Read `docs/menu-ui/README.md` and `docs/menu-ui/FINDINGS.md` on that branch first.
- Master is far behind `feature/ct-locomotion`. Read the current UI code and docs from that branch without checking
  it out: `git show origin/feature/ct-locomotion:<path>` and `git ls-tree -r --name-only origin/feature/ct-locomotion`.
- Never touch `feature/ct-locomotion`, `dev` or `master`, the `C:\NightShift\Mobile-Coop-locomotion` worktree, or
  ports 4189 / 4191 (an unattended run uses them). If a dev server is needed, use port 4195 or higher.

## Context
Night Shift is an original third-person stealth game (Splinter Cell: Chaos Theory inspired), a Babylon.js PWA for
desktop and phone, solo and 2-4 player co-op. Restyle every menu in the visual language of Batman: Arkham Knight's
menus, without its IP or any Splinter Cell IP:
- a ghosted two-line screen title (for example MAIN / MENU), condensed caps items, a highlight bar on the focused
  item, small counters beside items (for example "Continue 42%");
- a button legend bottom-left ("Back", "Select", extra actions), a context / description panel on the right;
- settings rows with left / right value cyclers;
- near-black screens where the operator reads as a rim-lit silhouette;
- a pause menu that blurs the game but keeps the player character in view;
- later (session 4), a slow cinematic animated character background.

References:
- Reference screenshots (Arkham Knight, not in git): `C:\Users\Micha\.claude\uploads\9c2f0a4b-c86a-4cda-bdd4-bd87afa19a6c\`
  (99ead6e1, addfa2d0, a5ea6275, 0ada19a7, 56a46d97 .jpg and 645dd5c9 .webp). If they are gone:
  - main menu: a ghosted grey "MAIN / MENU" title top-left with a thin diagonal hairline, 8 left-aligned condensed caps
    items with "!" badges and counters, the focused item on a cyan-teal gradient bar, a leaderboard block lower left,
    the legend "(Esc) Back (Enter) Select" bottom-left, and the character filling the right two-thirds in near-black;
  - title: the game name left of centre, "Press A to start" beneath it, the character as a rim-lit silhouette;
  - pause: "PAUSE / MENU" over the live scene with heavy bokeh blur, the character dark in the left foreground;
  - graphics options: rows of name, left arrow, value, right arrow, a description on the right, and the legend
    "Back / Cycle / Defaults / Apply";
  - save select: slot cards with a percentage, place and date, and the character's face at the right.
- Staged renders of our operator, to use as prototype backgrounds: `C:\NightShift\menu-mock\index.html` (scenes 3,
  4, c3 and c4 and the armory studio read best). The operator is low detail, so no tight face close-ups: use medium
  or wide silhouettes and the goggle glow.

## Read first
CLAUDE.md; `docs/design-bible.md` sections 0-3, 6 and any UI, HUD and input sections; `docs/story.md` (screen names,
tone, text rules); `docs/systems/ui.md` and `docs/systems/input-and-loop.md` (from feature/ct-locomotion). Then
`src/ui` (screens, FocusNav, widgets, HUD) to build a complete inventory of every screen, dialog, toast and overlay
and how each is reached. Read `docs/archive/locomotion/DECISIONS.md` (D1, D7) and `docs/archive/locomotion/steps/18-*.md` there: the
remap, hold / toggle and difficulty screens that step adds must fit the new template.

## Input parity (Michael: layouts identical on keyboard and mouse and on controller; controller is primary)
- One focus model: every screen has exactly one focused element. Pad d-pad / left stick, arrow keys and WASD move it;
  mouse hover moves the same focus; a click confirms the hovered item.
- Identical layout, positions, order and actions on every device. Only the legend glyphs differ. They switch to the
  last-used device instantly, with no layout shift.
- A full mapping table, one action per row, all three columns filled (pad / keyboard / mouse):
  - confirm: A / Enter, Space / left click;
  - back: B / Esc, Backspace / the on-screen Back legend item (clickable);
  - tab switch: LB, RB / Q, E / clickable tab headers;
  - value change: d-pad left, right / arrow left, right, A, D / click the arrows, drag sliders;
  - scroll: right or left stick / wheel, PageUp, PageDown;
  - secondary actions: X, Y / named keys / clickable legend items;
  - pause: Start / Esc.
- Every legend item is clickable. Banned: hover-only tooltips (the context panel follows focus), right-click-only
  actions, double-click, pad-only holds without a key equivalent, anything that needs a mouse.
- Edge cases to specify:
  - text entry with a pad (co-op codes, names: an on-screen keyboard or an alternative);
  - slider step and hold-to-accelerate;
  - confirm dialogs default to the safe option;
  - Back always goes up one level, defined per screen;
  - focus memory when returning to a screen;
  - disabled and locked items (focusable, with the reason shown);
  - empty, loading and error states (co-op lobby host / client, network failure);
  - controller disconnect pausing the game;
  - touch as the basic fallback (tap = focus + confirm).
- Accessibility: text scale, contrast, a colour-blind-safe highlight, a reduced-motion option.

## Deliverables
1. `docs/menu-ui/SPEC.md` on `feature/menu-ui-spec`:
   - visual direction, colour / type / spacing tokens, the shared screen template, motion rules (highlight sweep,
     transitions);
   - the mapping table above and the screen inventory;
   - per screen: a layout, focus order, default focus, Back target, legend actions and states;
   - the pause blur (depth of field focused on the player plus a dark vignette; low / phone tier: a plain dark
     overlay; gameplay never reads graphics state);
   - the cinematic background shot list for session 4, with its tests and perf budget;
   - numbered design decisions MD1, MD2, ...;
   - a parity checklist that implementation checkers run on every screen.
2. A working HTML prototype published as an Artifact. Each key screen is navigable with keyboard, mouse and a real
   gamepad (browser Gamepad API), with a device indicator so Michael can test parity himself. Key screens: title /
   press start, main menu, pause over a blurred scene, settings with graphics and controls / remap, loadout with the
   arsenal names from locomotion 16 (FINDINGS.md), co-op lobby, mission / save select and a confirm dialog. Use the
   renders as backgrounds.
3. Implementation briefs for sessions 2-4 in the locomotion run's format (`docs/menu-ui/BRIEF.md`, `PLAN.md` and
   `steps/NN-name.md`): files touched, the e2e suites to update or add (menus on pad and mouse), phone perf checks,
   dependencies. Code starts after the feature/ct-locomotion PR merges to master.

## Process
- Interactive: before building the prototype, ask Michael the open questions with the multiple-choice question tool
  (one question per decision, recommended option first) and record his answers as MD decisions. Known open questions:
  - bundling a condensed open-licence font (CLAUDE.md hard rules restrict external assets);
  - screen names;
  - whether to add a title / press start screen;
  - the pad text-entry method.
- Commit and push docs on `feature/menu-ui-spec` only; never merge (Michael merges). Project knowledge lives in git:
  record every decision there, not only in memory. Update `docs/menu-ui/README.md` status when done.

Done = SPEC.md pushed, the prototype link reported, every screen has its interaction spec, the parity checklist
passes in the prototype on keyboard, mouse and pad, and the MD decisions and remaining questions are listed.
