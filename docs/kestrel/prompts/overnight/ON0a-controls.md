# ON0a - Controller rework: tile build menu, selection card on the D-pad, quick view toggles
Model: Opus, medium effort.
Decisions: 16

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/editor.md` sections "Controller", "The wheels", "The hub",
"Screen"; `docs/kestrel/editor-controller-review.md` sections 3-4 (principles and the old scheme); `src/editor/actions.ts`
(all), `src/editor/radial.ts` (exports), `src/editor/padMenu.ts` (all), `src/editor/hub.ts` (all), `src/editor/hubView.ts`
(grep `render`, `frame`, `Levels`); in `padControl.ts` grep `openMenu`, `runMenu`, `dpad`, `yTap`, `rbTap`, `drawBar`,
`enterDrawer`, `stepField`; `scripts/e2e-editor.mjs` (grep `wheel(`, `radial(`, `BTN.LEFT`, `BTN.RIGHT`).

Michael (2026-10-13): the radial wheels are hard to use and overlap the D-pad tool bar. Replace them with a tile build
menu that Y toggles open (tap, not hold). With something selected, the D-pad edits the selection card: up / down picks
a row, left / right changes it, so left / right on the Type row flips through door, wall, room or object types without
a menu. Properties must be quick. Ghosting, exploded view and the like must be easy to reach.

| # | Decision |
| --- | --- |
| 1 | **Tile build menu** (`src/editor/tileMenu.ts` pure model + a view): Y tap opens and closes it; full-width panel at the bottom half of the screen, the 3D view stays visible above. A row of category tabs (LB / RB change tab): Selected (only with a selection), Build, Openings, Objects, Lights, Mission, View. Each tab is a grid of large tiles (icon letter, name, one-line description); D-pad or left stick moves the highlight (no aiming), A picks, B or Y closes. The last tab and tile are remembered. Mouse: Space toggles it; click a tile. |
| 2 | **Build tab**: Select, Room (with walls / outside walls / room only as three tiles), Wall, Measure, Paste, Paste to level above, and the later parts' tools (each later part adds its tiles here or in its own tab; the model is data, one list). **Openings tab**: one tile per door and window type. |
| 3 | **Selected tab** (first tab when something is selected): the old Selection wheel's actions as tiles: Move, Duplicate, Rotate 90, Copy, Copy to level above, Split (rooms), Change type, Properties (full panel), Delete. RB hold no longer opens anything. |
| 4 | **Selection card on the D-pad**: when something is selected and no drag or tool is active, the card (bottom right) shows editable rows: Type first (door type, wall kind, room kind, object preset in its group, fitting), then the element's own fields (name, sizes, height, sill, thickness, locked, access level ...). D-pad up / down picks a row (lit), left / right changes it by one step (0.1 m for lengths, one item for lists, on / off for flags; held: repeats, accelerating), A on Name opens the name list / keyboard. Each change is its own undo step but consecutive changes to the same row within 1 s merge into one. The full side panel is still on the Selected tab (Properties). |
| 5 | **D-pad with nothing selected**: up / down change level (as now); left / right do nothing or (with a tool active) flip the tool's variant (door type, room option, preset). The tool bar no longer cycles with the D-pad; it shows the active tool only, and the Y menu picks tools. |
| 6 | **View tab** (also Hub > View): big toggles for Ghost other levels, Exploded (with the gap as a left / right slider), Cut walls at (height slider), Levels shown (up to this, single, whole), Building filter, Small plan, Labels, plus the later parts' views (stealth, finishes, lighting, darkness map). One tile press, no deep menus. R3 keeps cycling Levels shown. |
| 7 | **Hint bar** (pad) follows the new state: building with nothing selected "A Select, Y Menu, X Undo, L3 Walk, Menu Hub"; with a selection "D-pad Edit, A Grab, Y Menu, B Clear, RB Go to"; menu open "D-pad Move, A Pick, LB/RB Tab, B Close". At most 5. |
| 8 | **Settings friendlier**: Hub > Settings rows are plain toggles and sliders with the value shown large; add "Menu opens on: last tab / Build tab", "Repeat speed" for held D-pad, and the camera settings ON0b adds. |
| 9 | **Remove** the radial wheels from the pad (`radial.ts` stays only if the mouse still uses hold-Space; prefer the tile menu for the mouse too and delete the wheel code if nothing else uses it; e2e steps that used wheels move to the tile menu). |
| 10 | **Later briefs**: where ON1-ON12 say "Build wheel" or "Selection wheel", the agent uses the tile menu's matching tab and the Selected tab; where they say "D-pad", the ON0a scheme. Write this rule into editor.md so later agents find it. |
| 11 | Controller help (Hub > Help picture and table) regenerated from the action map, no stale wheel words. |
| 12 | Nothing overlaps: the tile menu, card, tool bar, strip, dot words and hint bar at 1280 x 720, 1024 x 600, 932 x 430 (the existing overlap step extended with the menu open and with the card in edit mode). |
| 13 | Vitest: tile menu model (tabs per selection, tile order, navigation wrap, remembered tab), card rows per element kind (Type first), step sizes (0.1 m, lists, flags), merge of quick consecutive changes into one undo step. |
| 14 | e2e: Y tap opens the menu, LB / RB changes tab, D-pad and A pick Wall, Y closes; select a door, D-pad right on Type changes it to the next door type (one undo step), D-pad down to Width, right three times = +0.3 m; nothing selected: D-pad up changes level; View tab toggles Ghost and Exploded. Old wheel steps rewritten. |
| 15 | Screenshots: the menu on the Build tab, the Selected tab, the card in edit mode with the Type row lit, the View tab. |
| 16 | editor.md: the new controller tables (building, selection card, menu), the rule of decision 10, removed wheels. |

End per section 5. Commit id `ON0a`.
