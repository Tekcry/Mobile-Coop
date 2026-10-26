# AUDIT - the context action menu (CT vs ours)

Covered: CT's top-right context menu (passive list, hold-A active list, highlight, confirm, option sets) and our door / grab menus and centre prompt. Stopped early on the usage limit (twice): rows marked "estimate" are not frame-measured; the catalogue-only clips (052441, 052527, 052607, 052752, 052901, 052952, 053114, 110522, 110714, 110936, 111335, 111731, 112135, 112331, 112428) still need the per-frame scan (scratchpad scanner: one decode pass takes about 50 s per 1.5 s of clip).
Clips frame-stepped (per-frame pixel scan + crops): 110818 0-1.5 s and 8-10.5 s, 052349 3-7, 11.5-15, 17.5-21 s. Option sets from the catalogue for 052441, 052527, 052607, 052752, 052901, 052952, 053114, 110522, 110714, 110936, 111335, 111731, 112135, 112331, 112428. Frames: pc/ct-work/frames/actionmenu/.

## CT spec (measured, 2420x1668 frames, fractions of frame W / H)
Layout (052349 @0.5 s passive, 110818 @0.3 s active; same pixels in old and new clips):
- Anchored top right under a separate full-width top bar (bar frame y 0.061-0.083 H). Outer bracket frame x 0.686-0.978 W.
- Header box: x 0.694-0.970 W (668 px = 0.276 W), y 0.107-0.139 H (55 px). Header text left x 0.706 W.
- Gap 7 px (0.004 H), then the options box: top y 0.144 H; height = 38 px + 55.7 px per row (0.023 H + 0.0334 H x N). 1 row: bottom 0.198 H; 2 rows: 0.233 H; 4 rows: 0.300 H. Most rows seen: 4 (5 when BODY joins a locked door: estimate).
- Row pitch 0.0334 H; cap height 34 px = 0.020 H; text left x 0.707 W; uppercase, wide squared sans; the highlighted row is not indented.
- Colours (sampled RGB): box fill translucent black, about 65 % (22,24,17 over dark, 49,55,40 over a bright floor); box borders 2-3 px pale green (103,127,93); outer bracket dim (71,77,66); passive text and header grey (89,92,85); active non-selected rows and the "BACK TO GAME" header grey (105,109,99); highlighted row text pale green-white (156,182,144).
- Highlight: a thin outline box across the row (x 0.698-0.965 W, 49 px = 0.029 H tall, centred on the text), bright "[" and "]" at its ends (7 px stems, 160,186,145), brighter text. No fill change.

Behaviour (frame-exact, 60 fps):
- Passive: shows whenever an interactable is in reach; header INTERACT; dim rows; usually no highlight. A passive row-1 highlight shows at some objects (052349 17.6-20.3 "[OPEN DOOR] / BASH DOOR", then "[CLOSE DOOR]"; catalogue: PICK LOCK, GRAB CHARACTER, INTERROGATE). Estimate: it marks row 1 as the immediate default when the hero is right at the object.
- The list re-forms as the hero moves (4 rows -> 2 -> 1 at 052349 14.7-19.2).
- Hold A: header flips to BACK TO GAME and row 1 is highlighted in the same frame (110818 0.304; 052349 3.717, 13.167). No fade or open animation. World slow-down: none visible (estimate).
- Moving the highlight: one row per step, instant (110818 row 1 -> 2 after 0.41 s; 052349 row 2 at 4.150, back to row 1 at 4.818). For 0.55 s (052349 13.58-14.12) rows 1 and 2 are both fully highlighted (pixel check at 13.9: both texts 145,172,134, both brackets 150,182,139; at 13.4 only row 1). Estimate: a second press or a multi-row default; unresolved, do not copy.
- The passive row-1 highlight is the same style as the active one (052349 17.6: text 147,176,136, bracket 152,189,140; row 2 grey 90,92,86).
- Confirm: the whole menu vanishes in one frame with a row highlighted (110818 1.086, 052349 5.217 and 14.134) and that row's action follows (OPTIC CABLE: remote view from 2.5 s; OPEN TRAP: opens at 9.6 s). Fits Michael: release A runs the highlighted row.
- BACK TO GAME: per Michael a selectable "no action" choice. 110714 16.5-23.0 alternates the highlight between BACK TO GAME and EXIT FRONT, so it is a row (estimate: the header doubles as a row above row 1). Releasing on it closes with no action.
- Shortest active span: 0.52 s (110818 9.081-9.598, OPEN TRAP). No hold threshold visible (active appears in the press frame), so a quick tap runs row 1 (estimate).

Option sets seen: closed unlocked door OPEN DOOR / OPEN DOOR STEALTH / BASH DOOR / OPTIC CABLE (3 rows without OPTIC at 050330, 050933; OPEN DOOR / BASH DOOR at 052349 17.6); open door CLOSE DOOR (also while carrying); locked door PICK LOCK / BREAK LOCK / OPTIC CABLE (+ BODY; GRAB CHARACTER first when a guard is close, 052607 2); floor trap OPEN TRAP / OPTIC CABLE; guard GRAB CHARACTER; held guard INTERROGATE; body BODY; PICKUP OBJECT, SWITCH OBJECT; CALL ELEVATOR; HACK RETINAL SCANNER; ENTER CRAWL SPACE, EXIT FRONT, EXIT BACK; GRAB ONTO ROPE; RAPPEL ON WALL; CLIMB UP.

## Delta table
| # | item | CT (clip @ s, value, how) | ours (file:symbol, value) | delta | fix | size | feel |
|---|---|---|---|---|---|---|---|
| 1 | Input model | hold A opens, release runs the highlighted row (110818 0.304-1.086, pixel scan) | gameState.ts doorMenuStep / grabMenuStep: press A opens, a second press picks, B cancels | wrong model | ContextMenu state machine none / passive / active; A down -> active, sel row 1; A up -> run sel, or nothing on BACK TO GAME | M | 3 |
| 2 | One menu for all | one list for doors, bodies, grab, rope, climb, objects | doorMenu.ts and grabMenu.ts separate; other items use a centre prompt with hold rings (updateInteract, .hud-interact top 64 %) | missing | src/game/contextMenu.ts gathers options from providers in CT order | L | 3 |
| 3 | Passive list | shown top right whenever anything is in reach, header INTERACT | none: centre prompt "Door options" / item label | missing | HUD shows passive rows whenever options > 0 | S | 3 |
| 4 | Header flip | INTERACT -> BACK TO GAME in the press frame | title "Door" / "Held" | wrong | header by state; BACK TO GAME selectable above row 1 (estimate) | S | 3 |
| 5 | Position, size | header x 0.694-0.970 W, top 0.107 H; options top 0.144 H; pitch 0.0334 H | styles.css .hud-doormenu: left of minimap (history: removed, G339), top 14 px, min-width 220 px | different | right edge 3.0 % W, top 10.7 % H, width 27.6 % W, row 3.34 % H, cap 2.0 % H | S | 2 |
| 6 | Look | square translucent boxes, 2-3 px pale borders, outer brackets, grey text; highlight = outline + bracket ends + bright text | rounded box, blue row fill rgba(63,193,255,0.28) | different | square boxes, our own border colour; our own end-mark (corner ticks, not CT's bracket glyph); uppercase Barlow Condensed (bundled), letter-spacing 0.08 em | S | 2 |
| 7 | Navigation | one row per step, instant | grabMenu.ts menuNavDir: D-pad / speed keys, stick only when still, 0.12 s repeat, wraps | close | while active: stick up / down (0.5 deflection, repeat 0.2 s) and D-pad; no wrap (estimate) | S | 2 |
| 8 | Hint row | none | .dm-hint "A select, B cancel" | extra | remove | S | 1 |
| 9 | Movement while open | passive: free; active: hero stands (estimate) | door menu freezes; grab menu walks | partial | passive never blocks; active blocks move input, camera free | S | 2 |
| 10 | Show / hide | instant, one frame | display toggle | match | keep | - | 1 |

## Missing entirely (prototype plan)
- Unified menu with the CT option sets above: providers for door (closed / open / locked), trap, body (BODY), guard (GRAB CHARACTER), held guard (INTERROGATE stub), rope / rappel / climb (traversal anchors), PICKUP / SWITCH OBJECT (interactables), CALL ELEVATOR, scanner (stub). Stubs list and say "not built yet".
- CLOSE DOOR on an open door; PICK LOCK / BREAK LOCK (doorMenu.ts: locked doors get no menu).
- Hold-progress items (holdTime rings) become a row whose action plays its own timed animation.

## Implementation plan
1. src/game/contextMenu.ts (Babylon-free): option { id, label }; class ContextMenu { state; opts; sel } with step(aDown, aPressed, aReleased, nav). Empty opts -> none; A pressed -> active, sel = 0; A released -> return opts[sel], or null on BACK TO GAME (sel -1, reached by moving up from row 0, estimate); list change while active keeps sel by id, else clamps; reach lost -> none.
2. src/game/contextProviders.ts: fill a reused array each tick (no allocation), order: guard grab, door / trap set, body, object, traversal. Reuse doorMenuPick and td.menuPick as the run handlers; retire DoorMenu / GrabMenu.
3. gameState.ts: replace updateInteract's door branch, doorMenuStep and grabMenuStep with contextMenuStep(dt, real); A is swallowed by other systems while active; move input frozen only while active.
4. src/ui/hud/hud.ts: setContextMenu(header, labels, sel, active) on a new .hud-ctx (styles.css) with the measured fractions; drop .hud-interact for menu items.
5. Docs: docs/systems/input-and-loop.md, docs/ct-prototype/CT-CONTROLS.md: "A hold = menu, release = do, BACK TO GAME = nothing".
6. Tests: tests/contextMenu.test.ts (press opens on row 1; release runs it; release on BACK TO GAME runs nothing; nav clamps; list change keeps sel by id; lost reach closes). e2e-ctcourse: at a door hold A, D-pad down, release -> stealth open starts; tap A -> the door opens.

## Clipping and believability risks
- Hero frozen mid-stride when the active list opens: needs the idle blend.
- Passive list flicker at reach edges (CT flickers too, 110522): 0.15 m hysteresis.

## Not measurable
- Stick vs D-pad and any hold threshold: the pad is not on screen, only results are.
- World slow-down while active: no clean static reference sampled (estimate: none).
- The two-bracket frames (052349 13.58-14.12): unresolved.
