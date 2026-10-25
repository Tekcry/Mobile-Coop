# Menu UI redesign - design spec

Version 1.0, 2026-10-15 (step 1). Branch `feature/menu-ui-spec`. Decisions: [DECISIONS.md](DECISIONS.md) (MD1-MD20).
Prototype: https://claude.ai/artifact/XvpChFnv69HTzmDtW4n5Fb (private to Michael), source in
[prototype/index.html](prototype/index.html). Implementation: [BRIEF.md](BRIEF.md), [PLAN.md](PLAN.md), `steps/`.

Authority: Michael > bible > this spec > the step files > code. Where this spec and the bible differ, the bible wins and
the difference goes to BIBLE-PROPOSALS.md in the run (none are known at step 1).

Code facts below were read from `origin/feature/ct-locomotion` at 57c4fed (locomotion step 16 done; 17-34 to come).
Sessions 2-4 start after that branch merges to master, so re-check every file and symbol named here first.

## 1. Visual direction

Style reference: Batman: Arkham Knight's menus (style only, no Arkham or Splinter Cell IP, no copied art). In words:
- Near-black screens. The operator is a rim-lit silhouette with big shadows, medium or wide framing (the model is low
  detail: no face close-ups). The goggle glow is the signature light (bible 5.16).
- A ghosted two-line screen title top-left (MAIN / MENU), the second line indented, with one thin diagonal hairline
  through the top-left corner.
- Condensed caps items, left-aligned. The focused item sits on a horizontal highlight bar: a goggle-green gradient that
  fades out at both ends, with faint scanlines, a 3 px solid left edge marker, and the label turning white, bold and
  moving 6 px right. Small counters sit beside items (42%, 1 / 8). A small amber "!" badge marks something new.
- A context panel on the right that always describes the focused item (no hover-only tooltips anywhere).
- The button legend bottom-left. Every legend item is clickable and tappable.
- Settings rows: name on the left, `◀ value ▶` cycler or a thin slider on the right.
- Calm motion: slow push-ins on the background, fast and small UI motion (section 6).
- Tone of text: British spelling, plain and dry (story.md section 2). Labels name what the player recognises.

What it is not: no bevelled panels, no rounded cards, no glassmorphism, no `backdrop-filter` (phone cost), no
icons in front of menu items (the current `btn-icon`s go), no Arkham names (Gotham's Greatest, AR Challenges ...).

## 2. Tokens

All tokens live in `src/styles.css` `:root` (the new menu layer replaces the "Silent But Deadly - menu theme" block,
currently ~line 2297). The game is dark only.

### Colour
| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#040607` | screen black |
| `--ink-2` | `#0a0f10` | dialog band, panels |
| `--text` | `#d6dfdb` | item text |
| `--text-hi` | `#ffffff` | focused text, dialog titles |
| `--muted` | `#7d8a86` | counters, section labels, context headings |
| `--ghost` | `rgba(196,208,204,.20)` | ghosted screen title |
| `--line` | `rgba(214,223,219,.16)` | hairlines, dividers |
| `--hl` / `--hl-rgb` | `#38e08c` / `56,224,140` | highlight bar, edge marker, active tab, slider fill (MD4; same green as today's `--accent`) |
| `--warn` | `#f0b43b` | "!" badges, warnings, spoiler lines |
| `--danger` | `#ff5a4f` | destructive buttons' context line, stat losses |
| `--ctx-bg` | `linear-gradient(90deg, rgba(4,6,7,.86), rgba(4,6,7,.62))` | context panel backing |
| Pad glyphs | A `#5bd25b`, B `#ef5350`, X `#4c9cf0`, Y `#f2c641`; PlayStation outline ✕ `#7fb0ff` ○ `#ff7a7a` □ `#f39ad8` △ `#56d6b6` | legend glyphs |

High contrast (Accessibility) raises `--text`, `--muted`, `--ghost` and `--line`, darkens the background shade to 97 %
on the left half and strengthens the bar (prototype `body.hc`).

Colour-blind safety (MD4): focus never relies on hue. The focused item changes four things at once: bar behind it,
left edge marker, label white and bold, label offset 6 px. Warnings carry a ⚠ or "!" shape as well as amber.

### Type
- Face: Barlow Condensed (SIL OFL 1.1), bundled as woff2 in `src/ui/fonts/` (MD1): weights 500, 600, 700 (about
  20-25 KB each, Latin subset). `OFL.txt` beside the files; credit in `docs/art-credits.md`. Fallback stack:
  `'Barlow Condensed', 'Avenir Next Condensed', 'Roboto Condensed', 'Arial Narrow', system-ui, sans-serif`.
  `font-display: block` with a 1 s cap (the boot overlay hides the swap). Imported through Vite (bundled, never fetched).
- Scale (logical px in the 1280 x 720 frame, times `--ts`, the Accessibility menu text size 1 / 1.15 / 1.3):

| Role | Size | Weight | Case / tracking |
| --- | --- | --- | --- |
| Ghost title | 86 (text scale capped at 1.15) | 700 | caps, line-height .86 |
| Title screen | 96 name, 46 kicker | 700 / 600 | caps |
| Menu item | 22 | 600 (700 focused) | caps, .02em |
| Settings row | 19 | 600 | caps |
| Mission card name / meta | 21 / 14 | 600 / 500 | caps, meta .08em |
| Context heading | 15 | 600 | caps, .14em, `--muted` |
| Context body | 18, line-height 1.35 | 400 | sentence case |
| Legend | 19 | 600 | sentence case |
| Section label (`grp`) | 14 | 600 | caps, .14em |
| Tabs | 17 | 600 | caps, .1em |
| Toast | 18 | 600 | sentence case |

Numbers use `font-variant-numeric: tabular-nums`.

### Spacing and frame
- The menu frame is 1280 x 720 logical px, scaled by the existing `--ui-scale` and centred at 16:9 on ultrawide (as
  today, `styles.css` ~3159). Phones use the same frame (MD16 covers touch sizes).
- Ghost title at (58, 34). List column at x 96, from y 226. Rows (settings) at x 96, y 262 to 96 px above the bottom.
- Item height 34, row height 32, card height 62, list gap 0 (cards 6). Section label 10 px above, 4 below.
- Context panel at x 870, y 262, width 350, padding 14 / 18, backed by `--ctx-bg` with a 1 px `--line` left edge.
  Screens with the operator in the middle (main menu, pause) put it under the list instead (x 96, y ~516-528).
- Legend at (58, bottom 30), items 18 px apart, each at least 32 px tall (56 px hit area on touch).
- Glyph slot: every glyph sits in a fixed 38 px-wide slot, so switching device never moves the legend (no layout shift).

## 3. The shared screen template (`MenuScreen`)

One class every menu uses (built in step 02). Slots, all optional:

```
+--------------------------------------------------------------------------------+
| ╲ GHOST                                                       [toasts, centre]  |
|  ╲   TITLE                                                                      |
|                                                                                 |
|   [tabs: LB  CONTROLS  GAMEPLAY ...  RB]                                        |
|   ITEM / ROW list (focus column)                 | CONTEXT PANEL              |   |
|   ITEM            counter                        |  heading                   |   |
|   ITEM  ◀ value ▶                                |  body, stats, reasons      |   |
|                                                                                 |
|   (A) Select  (B) Back  (LB)(RB) Category  (X) Defaults            version     |
+--------------------------------------------------------------------------------+
  background: a menu-stage shot (live 3D) or the frozen / live game (pause)
```

API sketch (names are the step file's call): `title: [string, string]`, `list | rows | cards | custom` body, `tabs?`,
`context: (focused) => html` (default: the focused element's `ctx`), `legend(): LegendItem[]` re-evaluated when focus
or state changes, `defaultFocus`, `back()` (default: pop), `onX/onY/onStart/onTab`, `states` (empty, loading, error).
It keeps `ScreenManager` (`src/ui/screen.ts`) and `FocusNav` (`src/ui/focusNav.ts`); the template is a layer on top.

Every focusable element carries `data-focus`, `data-key` (stable id for focus memory and e2e), and optional
`data-locked="<reason>"`, `data-adjust`, `data-ctx`.

## 4. Input model and parity

### 4.1 Rules (every screen)
1. Exactly one focused element per screen (a screen with nothing to focus, such as Connecting, focuses its Cancel).
2. One focus, moved by every device: d-pad and left stick, arrow keys and WASD, mouse hover (pointer movement only;
   a scroll that slides an item under a still cursor does not move focus), touch tap.
3. Confirm acts on the focused item; a mouse click confirms the item under the cursor (hover already focused it).
4. Same layout, positions, order and actions on every device. Only legend glyphs change, instantly, to the last-used
   device, in a fixed-width glyph slot (no layout shift). The device indicator is the legend itself.
5. Every legend item is clickable and tappable and does exactly what its button does.
6. Banned: hover-only tooltips, right-click-only actions, double-click, pad-only holds with no key equivalent, any
   action that needs a mouse, any screen that needs a keyboard.

### 4.2 Mapping table (MD10, MD11)

| Action | Controller (Xbox / PlayStation) | Keyboard | Mouse | Touch (basic) |
| --- | --- | --- | --- | --- |
| Move focus | D-pad, left stick (0.55, repeat 0.4 s then 0.11 s) | Arrows, WASD (not while typing) | Hover moves focus | Tap focuses |
| Confirm | A / ✕ | Enter, Space | Left click on the item | Tap (focus + confirm, MD16) |
| Back (one level up) | B / ○ | Esc, Backspace (not while typing) | Click the Back legend item; mouse button 4 | Tap the Back legend item |
| Change value (cycler, slider, toggle) | D-pad / stick left, right; A = next value | ←/→, A/D; Enter/Space = next value | Click ◀ or ▶; click the row = next value; drag a slider track | Tap ◀ ▶, drag the slider |
| Hold to change faster | Hold left/right: repeat 0.4 s / 0.11 s, slider step x5 after 1.0 s | Hold the key: same | Drag | Drag |
| Tab / category | LB, RB / L1, R1 | Q, E | Click a tab header or the LB / RB glyph beside the strip | Tap a tab |
| Scroll a long panel or list | Right stick | Wheel, PageUp, PageDown | Wheel | Drag |
| Secondary action X (Defaults, Delete, Clear) | X / □ | R | Click the legend item | Tap the legend item |
| Secondary action Y (Loadout, Share, Reset all, Customise) | Y / △ | F | Click the legend item | Tap the legend item |
| Start (Join, Done in text entry; Resume in pause) | Menu / Options | Enter in text entry; Esc in pause | Click the legend item | Tap the legend item |
| Pause in game | Menu / Options | Esc, P (rebindable) | Losing pointer lock pauses | Pause button |

Changes from today (`src/input/actions.ts`, `gamepadMapping.ts` `UI_BINDINGS`, `keyBindings.ts` `FIXED_KEYS`):
WASD navigates menus; Space confirms; `uiAlt` moves from E to F (E stays tab-next, ending today's E double use);
a new `uiX` on pad X / key R; a new `uiStart` on Menu (it stops being a second Back, except in the pause menu where
Start resumes, MD11); hover moves focus (today it does not); mouse button 4 is Back.

### 4.3 Behaviour details
- **Wrap**: up/down wraps inside a list column; left/right never wraps. Grids (on-screen keyboard) do not wrap.
- **Focus memory**: returning to a screen restores the item you left from; switching tabs restores each tab's last
  item; reopening a screen from scratch uses its default focus.
- **Disabled and locked items** stay focusable, look dimmed with a lock glyph, show the reason in the context panel,
  and on confirm shake 5 px and toast the reason with the denied sound. Nothing is ever skipped by focus.
- **Confirm dialogs** open with the safe option focused and first in the row (Cancel, Stay, Revert). B / Esc / the
  Back legend always means the safe option. Destructive actions always confirm.
- **Timed dialogs** (keep resolution) count down visibly and fall back to the safe option.
- **Sliders**: one step per press; hold accelerates (above); the value shows with its unit; drag works anywhere on
  the track (a 20 px tall hit band).
- **Text entry** (MD3): an on-screen keyboard grid (component `Osk`). Codes: 31 keys (`CODE_ALPHABET`), 8 columns,
  Delete and Join. Names: A-Z, 0-9, `-`, `.`, Space, Delete, Done, 10 columns, 12 characters max. Pad: d-pad moves,
  A types, X deletes, Y space (names), Menu = Join / Done, B cancels. Keyboard types directly at any time (letters,
  digits; Backspace deletes; Enter = Join / Done; Esc cancels); arrows still move on the grid. Mouse and touch tap the
  keys. Invalid characters toast a reason ("O is not used in room codes"). The feedback note (4000 characters) keeps
  its textarea: on a pad, A opens the full Osk over it; on touch, the OS keyboard.
- **Remap capture** (locomotion step 18): "press a button" overlay with a 5 s countdown. Cancel is Menu / Start on the
  pad and Esc on the keyboard (not B, so B can be bound; MD13), or clicking Cancel. Mouse buttons can be captured on the
  Keyboard and mouse tab. A conflict shows ⚠ on both rows and a summary line; saving is allowed (A30).
- **Controller disconnect** (MD12): in a solo mission it pauses and shows "Controller disconnected" (Continue focused;
  any key, click or a reconnect dismisses it). In co-op the dialog shows but the simulation keeps running (as pause
  does today). In menus a toast only. Reconnect toasts "Controller connected". Legend glyphs switch either way.
- **Touch** (MD16, bible D1 basic fallback): tap = focus + confirm (the loadout's "first tap previews" rule goes);
  legend shown and tappable on touch (today it is hidden); hit areas at least 56 CSS px tall on `platform-mobile`
  (lists scroll); no hover.
- **Sounds**: move, confirm, back, denied, adjust (existing `uiHooks` voices).

## 5. States
Every screen with remote or slow data has all four:
- **Loading**: a spinner line with a verb ("Opening room…", "Joining K7Q2M…", "Loading Cinder Yard…") and a focused
  Cancel when cancellable.
- **Empty**: one line saying what will appear and how to make the first one ("No notes yet. Pause a mission and
  choose Report feedback.").
- **Error**: a dialog with a cause and a fix, OK focused ("Could not connect" / "Co-op signalling is unreachable.
  Check the connection and try again.").
- **Offline**: co-op root shows "Offline" with Retry focused; solo works offline.

## 6. Motion
| Element | Motion | Duration / easing |
| --- | --- | --- |
| Focus bar | fades in and grows from 60 % width at the left; old bar fades | 120 ms opacity, 160 ms scaleX `cubic-bezier(.2,.8,.2,1)` |
| Focused label | 6 px right | 120 ms |
| Screen enter | ghost title slides 14 px in; items slide 10 px in, staggered 15 ms (max 8 items) | 200-350 ms ease |
| Screen leave | instant (no exit animation, input never waits) | 0 |
| Dialog | band fades in | 150 ms |
| Toast | drops 6 px and fades in; at most 3 | 180 ms; lives 2.6 s |
| Denied | 5 px shake | 220 ms |
| Title "Press start" | opacity pulse | 2.4 s loop |
| Menu background | slow push-in or dolly, crossfade between shots (session 4) | shot 10-16 s, crossfade 1.6 s |
| Pause blur | depth of field ramps in | 250 ms |

Input is never blocked by an animation. Reduced motion (Accessibility: System / On / Off, MD17): no slides, pulses,
shakes or crossfades; the background holds one static shot; the pause blur appears at once.

## 7. Screen inventory and per-screen specs

Template types: **L** list, **R** rows with tabs, **C** cards, **G** grid (Osk), **D** dialog, **X** custom.
Back targets are one level up. Legend lists the order shown (Back first, then Select, then extras).

### 7.1 Boot and loading (`index.html` `#boot`, `main.ts` `setBoot`) - X
- Layout: black; NIGHT / SHIFT ghost; a 1 px progress line under it; status text ("Loading physics…"). Between
  matches: the mission name, district and the first briefing line instead of the ghost; no tips.
- No focus, no legend, no input. Failure: "Failed to start: <cause>" with a Reload legend item (click / A / Enter).

### 7.2 Title / press start (new, MD2) - X
- Shown once per launch, after boot, before the main menu. Skipped by `?autostart`, by returning from a mission, and
  under webdriver unless `?title=1`.
- Layout: NIGHT (kicker) over SHIFT (big) left of centre, `PRESS (A) TO START` under it (glyph follows the device),
  the version bottom-right, the door-peek silhouette shot (session 4; a static hold before then).
- Any button, key, click or tap continues to the main menu; it also unlocks WebAudio and sets the first device.
- Legend: [any] Start. Back: nothing.

### 7.3 Brightness (`brightnessScreen.ts`) - X
- Title BRIGHTNESS / CALIBRATION. The tri-lens symbol on black, one line "Adjust until the symbol is barely
  visible.", a Brightness slider (default focus) and Done.
- First run only (`video.brightnessSet`), after the title screen; also from Settings > Graphics > Brightness.
- Legend: Back (= Skip on first run), Select. Back target: main menu (first run) or Settings.

### 7.4 Main menu (`mainMenu.ts`) - L (MD6)
- Items: CONTINUE `42%` (mission name in context) · MISSIONS `1 / 8` · CO-OP · TRAINING `6 / 9` · FREE ROAM · LOADOUT ·
  SETTINGS · FEEDBACK `<open notes>`; with `?legacy=1` a LEGACY item before SETTINGS (parked modes, section 7.9).
  CONTINUE hides when there is no checkpoint; CO-OP shows "Offline" as its counter when offline (still focusable).
- Default focus: CONTINUE if present, else MISSIONS. Back: the title screen. Context under the list (x 96, y ~528).
- The profile badge goes (no economy outside legacy); the tagline and version stay (version bottom-right).
- Legend: Back, Select.

### 7.5 Missions (replaces the Infiltration cards in `playScreen.ts`) - C (MD8)
- One card per mission 01-08 (`missions.json` campaign entries): big italic rating % (best stealth rating, or "--"),
  `01  DEAD LINE` and a meta line "Cinder Yard, Kestrel · best 72% · 14 Oct 2026". Locked missions: dimmed with a lock,
  reason "Complete Dead Line to unlock." (solo unlocks in order, bible 5.8).
- Context: district, best rating, intel found `3 / 12`, last played, endings seen when relevant.
- Default focus: the newest unlocked mission. Back: main menu. Legend: Back, Select.
- Test and dev missions (greybox maps) appear only with `?dev=1` in a DEV section label.

### 7.6 Mission briefing (new; replaces the Play setup) - R without tabs
- Rows: Insertion (cycler) · Difficulty (Rookie / Normal / Realistic / Perfectionist / Custom) · when Custom: Base
  preset, Guard perception, Guard aim, Alarm tolerance (sliders 0.5-2.0 step 0.1, locomotion step 19) · Loadout
  (opens Loadout for this mission) · DEPLOY.
- Briefing text (4-6 lines, bible 5.8 / story.md) in a second context block below the row context. No map: the
  briefing is text only (G336, G339; the annotated top-down map was dropped).
- Default focus: DEPLOY. Back: Missions (or main menu when opened from CONTINUE). Legend: Back, Select, Y Loadout.
- Deploy shows the loading state (7.1). In co-op this screen is not used (the lobby carries the choices).

### 7.7 Training (`playScreen` Training mode) - L
- Items: the course list (Fallow course, Proving training rooms), counters "done / total". Default: first unfinished.
  Back: main menu. Legend: Back, Select.

### 7.8 Free roam - L
- Items: maps whose `modes` include Free Roam (Cinder Yard, Proving Grounds, Warehouse; dev maps with `?dev=1`), each
  with a context description. Optional Weather cycler row at the bottom when the map offers it. Back: main menu.

### 7.9 Legacy (parked, `?legacy=1` only) - R
- One screen with today's Play rows (Mode, Map, Difficulty, Weather, Loadout, Deploy) in the row template. No new
  work beyond the template (bible 6). Back: main menu.

### 7.10 Loadout (`loadoutScreen.ts`) - L over the 3D stage
- Root KIT / LOADOUT: Preset cycler (Silent / Flash / Loud, A33) · WEAPONS: Primary `<name>`, Sidearm `<name>` ·
  GEAR: Gadget `<name>`. Legacy adds the parked groups (Operator, SBD-NET) unchanged in function.
- Sub-screens SELECT / PRIMARY, SELECT / SIDEARM, SELECT / GADGET: the curated campaign list (Heron Carbine, Marten 9
  SMG, Mason 12 Pump, Spotter 7.62 Marksman; Hush 9 SD, Warden .45; campaign gadgets). Focus previews on the operator;
  the context shows the description and Power / Accuracy / Range / Handling bars against the equipped item (gain
  green, loss red). Equipped item marked "Equipped". Parked items (recon drone) are locked with the reason.
- Attachments (weapon / CUSTOMISE): grouped rows Optic, Barrel, Underbarrel, Magazine (cyclers).
- Right stick, or drag on the stage, turns the operator (as today).
- Default focus: Primary at root; the equipped item in lists. Back: one level; root back to where it was opened.
- Legend: Back, Select (Equip in lists), Y Customise (weapons). The old action bar (`.lo-acts`) is replaced by the legend.

### 7.11 Settings (`settingsScreen.ts`) - R with tabs (MD9)
GAME / SETTINGS. Tab strip under the title with LB / RB glyphs at its ends (clickable). Tabs in order:
**Controls**, **Touch** (only with `platform.touch`), **Gameplay**, **Graphics** (Display on phones), **Audio**,
**Accessibility**, **Feedback**, **Data**. Every tab: X Defaults (confirm, Cancel first).
- Controls: Remap controls (opens 7.12) · HOLD OR TOGGLE: Aim, Crouch, Back to wall, Sprint, Grab (locomotion step 18
  `gameplay` fields) · CONTROLLER: Look sensitivity (horizontal, vertical), Aim sensitivity, Response curve, Dead zones
  (left, right, triggers), Invert Y, Aim assist, Vibration, Test vibration · MOUSE (desktop only): Sensitivity, Aim
  sensitivity, Invert Y, Raw input. Status line: "Controller connected: <name>" or the iPhone pairing hint.
- Touch: today's rows (Look, Buttons, Edit button layout).
- Gameplay: Default shoulder, Camera recentres, Last-guard slow motion, Player name (opens the name Osk).
- Graphics: today's Quality / Display / GPU / Benchmark sections as rows; changing any quality row sets Preset to
  Custom; Resolution opens the picker then the keep dialog (10 s, Revert focused).
- Audio: Master, Effects, Music, Interface.
- Accessibility: Menu text size (100 / 115 / 130 %), High contrast, Reduced motion (System / On / Off), Subtitles
  (locked "Always on", reason "Subtitles carry the story"), Colour-blind awareness colours, HUD size, Health bar, Always
  show ammo, Camera shake, Held interactions. (The old Controls reference button goes: Remap is the reference.)
- Feedback: New feedback, Export report, Copy as text, the notes list (empty state), Delete all (confirm).
- Data: status line, Export, Import (confirm), Reset all progress (confirm, Cancel first).
- Default focus: the first row of the tab; tab memory per tab. Back: where Settings was opened (main menu or pause).
- Legend: Back, Select, LB/RB Category, X Defaults.
- The description of the focused row is in the context panel (every row has one; the step file lists them).

### 7.12 Remap (locomotion step 18 `controlsScreen.ts`) - R with tabs
CONTROLS / REMAP. Tabs Controller / Keyboard and mouse, ordered by the current device. Rows: action name, binding
glyphs (pad: 1-2 buttons; keys: 2 slots). Confirm captures (4.3). Conflict ⚠ on both rows plus a summary line by the
tabs. Legend: Back, Change, LB/RB Device, X Clear, Y Reset all (confirm). Default focus: first row. Back: Settings.

### 7.13 Layout editor (touch, `layoutEditor.ts`) - X
Touch-only by nature (it edits touch buttons): restyle the toolbar in the legend style; the parity checklist marks it
"touch only, exempt from pad and keyboard". It stays reachable only from the Touch tab.

### 7.14 Resolution picker and keep dialog - L in a D band, then D
Picker: a list of "W x H" with "(native)", current focused; Back cancels. Keep: "Keep this resolution?" "Reverting to
<old> in N s." buttons Revert (focused) / Keep.

### 7.15 Co-op root (`coopUi.ts` `CoopScreen`) - L
CO-OP / LOBBY. Items Host a room, Join with code. Offline state: "Offline" heading, "Co-op needs an internet
connection. Solo missions work offline.", Retry (focused). Back: main menu. Legend: Back, Select.

### 7.16 Join (`JoinScreen`) - G
JOIN / ROOM. Five code slots (cursor pulses), the code Osk (4.3). Default focus: the first key. Legend: Back, Type,
X Delete, Start Join. Back: co-op root. `?room=CODE` skips it.

### 7.17 Connecting (`ConnectingScreen`) - loading state
"Opening room…" / "Joining K7Q2M…", Cancel focused. Errors become dialogs (OK only): "Could not connect", "No host
found" (15 s), "Room full", "Host left". Back = Cancel.

### 7.18 Lobby (`LobbyScreen`) - X
CO-OP / LOBBY. Left: "ROOM K7Q2M · you host", four player rows (operator colour dot, callsign, Host / Ready / Not
ready, Open slot), the status line. Below: Start mission (host; locked with the reason until all are ready), or Ready /
Not ready (client); Share code; Leave. Right column: Mission and Difficulty cyclers (host) or the same rows locked with
"Set by the host." (client); Custom difficulty shows its three values read-only to clients (locomotion step 19). A
mission beyond your solo progress shows "Story spoilers ahead." (Mission 8 adds "Contains the finale's twist.") in amber.
Default focus: Start (host) or Ready (client). Back: Leave dialog ("Leave the room?" Stay / Leave). Legend: Leave,
Select, Y Share code. Toasts: "<name> joined", "<name> left", "Invite link copied".

### 7.19 Field terminal (pause, `pauseScreen.ts`) - L over the blurred game (MD7)
FIELD / TERMINAL. Items: Resume · Objectives · Radio log · Settings · Restart from checkpoint · Report feedback ·
Quit to main menu. Objectives and Radio log show their content in the context panel (Phase 4 fills them; until then
Objectives shows the current objective text and Radio log the session's lines). No Map item: no map in any mode (G336,
G339); Objectives keeps the full list (G108, G343). Context
under the list (the player stays visible on the right). Emote bar: legacy only.
Default focus: Resume. Back and Start: Resume. Restart and Quit confirm (Cancel first).
Co-op: same list without Restart; the context says "The mission keeps running."; the field terminal does not freeze
the simulation (as today).

### 7.20 Pause background (MD14)
- Desktop tiers that have depth of field: the scene keeps rendering (frozen solo, live co-op). Depth of field focuses on
  the local player (focus distance = camera to the player's chest), aperture eased in over 250 ms, plus a dark
  vignette centred on the player and a left-side shade under the list. The HUD hides. The camera does not move.
- Low preset and phones (`MOBILE_OFF` turns DOF off): no blur, a plain overlay `rgba(3,5,6,.82)` with the same left
  shade. No `backdrop-filter`.
- Render-only: the effect lives in `src/vfx` (a `pauseLook` driven by a UI event). Gameplay never reads it, and it
  never reads graphics state into gameplay (CLAUDE.md hard rule).
- Perf: the paused frame costs no more than the gameplay frame at the same preset.

### 7.21 Results (`resultsScreen.ts`) - X
MISSION / RESULTS. Big stealth rating %, then each category (alarms, detections, bodies found, kills, knock-outs,
objectives; bible 5.8) as rows with values; best rating line. Items Continue (next mission), Retry, Main menu.
Co-op: Play again returns to the lobby. Default focus: Continue. Back: Main menu. Legend: Back, Select.

### 7.22 Feedback form and photo mode (`feedbackScreen.ts`, `photoMode.ts`) - R / X
Form: Type cycler, the note field (A opens the full Osk on pad; keyboard types; touch uses the OS keyboard), photos
row, Save (primary), Mark done, Delete (confirm). Back with unsaved text: "Discard this note?" Keep editing (focused) /
Discard. Photo mode keeps its own camera controls; only its bar becomes the legend: A Take photo, B Cancel; review:
A Keep, Y Retake, B Cancel. All clickable.

### 7.23 Dialog (`widgets.ts` `Dialog`) - D
A full-width dark band across the middle (y 230): title (30, caps), message (19), buttons in a row, safe option first
and focused. The screen legend hides; the dialog legend shows Back (= safe) and Select. Dims the screen to 72 %.

### 7.24 Toasts (`toast.ts`) - X
Top centre, at most three, 2.6 s, left edge green (info / ok) or amber (warn). Never focusable, never needed to act.

### 7.25 Controller disconnected - D (MD12). See 4.3.

### 7.26 Mouse capture hint, landscape rotate, install
"Click to capture the mouse" keeps its place (in game only). Portrait rotate stays. No install prompt.

### 7.27 HUD, debug overlay, bench tag
Out of scope, except that in-game button prompts use the same glyph component and colours as the legend.

## 8. Cinematic menu background (session 4)

Brief: the main menu, title and loadout run on the live menu stage (`src/world/menuScene.ts`, `MenuState`) with slow,
cinematic camera moves and the operator idling or holding poses, lit as hard silhouettes. Starting point: the
`?menuScene=` mock patch ([menu-mock.patch](menu-mock.patch)) and [FINDINGS.md](FINDINGS.md).

### 8.1 Shot list
| # | Setup (mock id) | Used on | Framing and move | Light | Operator |
| --- | --- | --- | --- | --- | --- |
| S1 | Door peek (4) | Title, main | Wide, camera low; push-in 4 % over 14 s | Warm doorway spill, long shadow toward camera | Standing in the doorway, idle breathing, slight head turn at 8 s |
| S2 | Wall edge, blinds gobo (3) | Main | Medium; lateral dolly 0.6 m over 14 s, parallax on the slats | Slatted key across body and wall | Back to wall, holstered, glance to the edge |
| S3 | Inverted pipe (1) | Main | Wide, low angle; tilt up 3° over 12 s | Lamp from above, big upside-down shadow on the back wall | Hanging inverted, holstered |
| S4 | Rappel in rain (5) | Main (desktop) | Medium-wide; crane down 0.8 m over 16 s | Moonlight, rain (vfx Weather) | Rappel hold, holstered |
| S5 | Roof ledge, searchlight (6) | Main (desktop) | Wide; static, the searchlight sweeps every 9 s | Searchlight pass rims the silhouette | Crouched on the ledge (not the akimbo holstered crouch: use the ready crouch) |
| S6 | Armory studio (7) | Loadout | Turntable on the right stick; framing per `setFraming` | Hard key and cool rim | Holding the selected weapon |
| S7 | Wall stack (c3) / door stack (c4) | Co-op lobby | Medium; slow push-in | As S2 / S1 | Operator plus partner in the next operator colour |

- Order: S1 first, then a seeded shuffle of S2-S5 without repeats; 10-16 s per shot; 1.6 s crossfade (or a cut to
  black for 0.4 s when the setups differ in light colour). Returning from a sub-screen keeps the current shot.
- Aiming and attached-state aim poses wait for locomotion step 25 (FINDINGS "Animation problems seen"); until then
  every main menu shot is holstered. The holstered crouch (arms akimbo) is not used.
- Phones: S1 and S2 only, no rain, no searchlight volumetric, the operator atlas as today; the governor applies.
- Reduced motion: S1 static, no cuts.

### 8.2 Director (pure, Babylon-free)
`src/ui/menuShots.ts` (or `src/world/menuShots.ts` if it must sit beside the stage): input = shot table, seed, now;
output = current shot id, its normalised time, the camera pose lerp parameters and the crossfade alpha. No Babylon
import, no allocation per frame. The stage applies it.

### 8.3 Tests
- Unit (`tests/menuShots.test.ts`): deterministic sequence for a seed; no immediate repeats; S1 first; durations and
  crossfade windows; reduced motion returns a single static hold; phone list = S1, S2; time wraps.
- e2e (`e2e-menus` extended): `?menuShot=S3` forces a shot; the stage reports the shot id through the debug hook;
  advancing the clock (`?menuClock=fast`) changes shots; the menu stays navigable during a crossfade.
- GPU (Michael's PC, `E2E_GPU=1`): `scripts/menu-sheet.mjs` contact sheet of S1-S7 at 1080p and the phone look.

### 8.4 Perf budget
Measure the current menu stage first (`perf.mjs` gains `--menu`). Budgets: desktop main thread <= 3 ms, <= 150 draw
calls, VRAM +<= 256 MB over today's menu stage; phone look 60 fps sustained in a 3-minute warm hold, <= 80 draw calls,
main thread <= 4 ms; shot change causes no frame over 33 ms (assets for all setups built at menu start, not per shot);
menu ready within 1.5 s of boot "Ready" on the PC. A >25 % rise in any perf-trend number is a fix.

## 9. Parity checklist (the implementation checkers run it on every screen)
For each screen in section 7, on keyboard, mouse and pad (fake Gamepad in e2e; a real pad in Michael's pass):
1. One focused element when the screen opens; it is the default focus in this spec.
2. Up / down / left / right move the same focus on arrows, WASD, d-pad and left stick.
3. Hovering an item focuses it; clicking it confirms it; nothing needs a hover to be read.
4. Confirm works with A, Enter, Space, click and tap.
5. Back goes to the Back target in this spec with B, Esc, Backspace, the clickable legend item and mouse button 4.
6. Every legend item works when clicked and does the same as its button.
7. Cyclers: left / right, ←/→, A/D, click ◀ ▶, confirm = next value. Sliders: step, hold to accelerate, drag.
8. Tabs: LB / RB, Q / E, clicking a header and clicking the LB / RB glyphs.
9. Leaving and returning restores focus; tab switching restores each tab's focus.
10. Locked items are focusable and show their reason; confirm denies with the reason.
11. Dialogs open on the safe option; Back picks it.
12. Switching device switches glyphs instantly with no element moving (compare bounding boxes).
13. Text entry works on pad (Osk) and keyboard (typing); Esc / B cancels.
14. Loading, empty and error states exist where section 5 says.
15. No hover-only text, right-click-only action, double-click, or pad-only hold.
16. Touch: tap focuses and confirms; legend tappable; hit areas >= 56 CSS px on `platform-mobile`.
17. Reduced motion, high contrast and 130 % text keep the screen usable (nothing clipped or overlapping).

The prototype passes 1-13 and 17 (scripted run: 43 checks on keyboard, mouse and a fake pad, 2026-10-15) except where it
fakes data. Michael ticks the real-pad column in the prototype's tools panel.

## 10. Accessibility summary
Menu text size 100 / 115 / 130 % (`settings.access.menuText`), High contrast, Reduced motion (System / On / Off),
colour-blind-safe focus (shape plus brightness), subtitles always on (locked), existing HUD size, awareness colours,
camera shake, held interactions. New fields go in `Settings.access` (IndexedDB `kv/settings`, `sanitizeSettings`
fills defaults; no SAVE_VERSION change, as A3).
