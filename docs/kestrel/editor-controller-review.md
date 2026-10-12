# Level editor - controller and UI review (proposal)

Status: PROPOSAL, direction chosen (Michael, 2026-10-12: all four recommended options in section 8). ED3-1 built and reviewed
(2026-10-12); ED3-2 prompt written (docs/kestrel/prompts/ED3-2.md). It replaces the unrun ED2 order; ED2 Parts B, E, F, G, H keep their text.

## 1. Where things stand

| Item | State |
| --- | --- |
| ED2 Part A - views, levels, drafts | Done. Michael's test waits for the controller parts |
| ED2 Part C - controller editing, radial menu | Done. Real-pad test (feel, rumble, plan crosshair, panel fields) is Michael's |
| ED2 Part C2 - controller screen | Done. Same real-pad test |
| Home-network launcher, phone layout | Done. iPhone layout and controller detection not tested on the phone |
| ED2 Part B - walk test as the real player | Not started (next in the agreed order) |
| ED2 Part D - linked walls, smart snap, dimensions, clickable problems, save summary | Not started |
| ED2 Part E - stairs, ladders, holes, add / change levels, renaming | Not started. Needed to build from scratch |
| ED2 Part F - objects and cover badges | Not started |
| ED2 Part G - documents follow the file (planner) | Not started, needs a save |
| ED2 Part H - lighting preview | Outline only, needs Michael's 4 answers |
| Known editor gaps | Rooms moving do not update the rooms either side of their doors; building filter leaves plan labels; quick walk cannot climb stairs |
| Kestrel pipeline | Paused until Michael has walked and edited the campus: P03B awaiting approval, then HK, P03R, B0 rerun, the tools revision, DR, P04 onward |

## 2. What the current controller scheme gets wrong
It works, but it is a mouse editor driven by a pad. The main costs:

1. **Tools are two menus deep.** Room, wall, door: hold Y, point at Build, wait, point, release. Building a floor
   switches tool dozens of times. Y tap only repeats one tool.
2. **The Y wheel holds everything.** Build, edit, view settings, levels, file and help share one 8-slot root. Things
   you do every minute sit beside things you do once an hour.
3. **The camera is a free-flying drone.** Building happens on one floor at a time, but the camera has no idea which.
   LT / RT fly up and down, and changing level does not move the camera. Most time goes on steering, not building.
4. **Aiming a centre dot at small orange handles** is the hardest thing to do with a stick. Console editor reviews
   name analogue precision as the main pain (Far Cry Arcade review, thesixthaxis.com, 2018).
5. **Three pointer modes**: the 3D dot, the plan crosshair and the side panel, with View held moving focus between
   them. Each has its own rules.
6. **Buttons mean different things by mode.** D-pad left / right picks "next thing near the dot", which is rarely
   wanted. LB is fine grid. RB goes to the selection. R3 looks at it.
7. **Rooms and walls are separate.** A room drawn with the room tool has no walls; each wall is drawn again. This is
   the biggest single cost when building a floor from nothing.

## 3. Principles (from console building games)
| Principle | Seen in |
| --- | --- |
| Cursor on the ground, camera follows it. The camera works for you | The Sims 4 console, Cities: Skylines console, Planet Coaster console |
| Every build piece one press away on a visible bar | Fortnite "Builder Pro" (each build piece on a shoulder or trigger), Minecraft hotbar |
| A ghost preview of what A will make, before you press it | Fortnite, Far Cry Arcade, Valheim |
| Snap is magnetic and felt (pull, tick, rumble), never typed | Halo Forge magnet snap, No Man's Sky base snap points |
| Two wheels: "make" and "change the selected thing" | Halo Forge, Valheim, Dreams |
| A pause-style hub with tabs for everything rare | Every console game |
| One meaning per button. A does, B backs out and never destroys | Console UI convention |
| Draw a room and get its walls | The Sims room tool |

## 4. Proposed control scheme
Fewer modes: one cursor (the centre dot), one camera that follows the editing level, one tool bar, two wheels, one hub.

### 4.1 Building (the normal state)
| Button | Does |
| --- | --- |
| Left stick | move the dot across the editing floor (camera follows; speed scales with zoom) |
| Right stick | orbit left / right, tilt up / down (from about 20 degrees to straight down) |
| LT / RT | zoom out / in (analogue) |
| A | the tool's action: select, place, start / finish, drop. Hold A on empty floor in Select: box select |
| B | back: cancel the drawing or grab, then put the tool down, then clear the selection. Never deletes |
| X / hold X | undo / redo (while drawing a wall chain: remove the last segment) |
| Y tap / hold Y | last tool / **Build wheel** (what to make) |
| D-pad left / right | previous / next tool on the tool bar |
| D-pad up / down | level up / down; the camera rises or drops with it |
| LB held | precision: 0.1 m grid, slower dot, smart snap off |
| RB tap / hold RB | go to the selection / **Selection wheel** (change the selected thing) |
| L3 | quick walk: drop to eye height at the dot; again to rise back |
| R3 | level display: up to this level, single level, whole building (cycles) |
| View tap / hold View | 3D and top-down swap (smooth camera move) / screen layout: 3D, Both, Plan |
| Menu | the hub (4.5) |

### 4.2 Grabbing and drawing
| Button | Does |
| --- | --- |
| Left stick | the grabbed thing follows the dot, snapped |
| D-pad | nudge one grid step (relative to the camera, as now) |
| A | drop / finish the corner or wall end |
| B | put it back / cancel |
| LB held | precision, as above |
| RB tap | rotate 90 degrees while grabbing (rooms, stairs, objects) |

### 4.3 Wheels (hold, point with either stick, release to pick; submenus open on rest)
| Build wheel (Y) | Selection wheel (RB), shows only what fits the selected thing |
| --- | --- |
| Room, Wall, Door >, Window, Stair, Ladder, Floor hole, Object > | Move, Properties, Duplicate, Rotate 90, Copy to level above, Change type > (door kind, room kind), Split (rooms), Delete |

Picking from the Build wheel also puts that tool on the bar. View, Level and File leave the wheel for the hub.

### 4.4 Smarter A (removes handle aiming)
- **Edge-aware grab**: with a room or wall selected, A near an edge or end stretches that edge; A in the middle moves
  it. Before you press, the part that A would take lights up and the prompt says "Stretch east edge" or "Move".
- **Magnetic dot**: the dot pulls onto wall ends, wall lines, room corners and door centres within about half a metre,
  slows a little near them (like the game's aim assist), ticks and rumbles once on snap. LB held turns it off.
- **Ghost preview** for every tool: the room, wall, door or stair A would make, with its size, drawn before A.

### 4.5 The hub (Menu)
A full-screen pause-style screen. LB / RB change tabs; D-pad and A as in any console menu; B closes.

| Tab | Holds |
| --- | --- |
| Play | Walk test as the player (Part B), quick walk |
| File | Save (with the summary of changes first), revert, the change list (A on a line undoes back to it) |
| Checks | problems; A goes to one; "next problem" |
| Levels | levels to show, ghost, exploded and gap, cut height, building filter; add, duplicate, delete levels and storey heights (Part E) |
| View | labels, floating names, small plan, level-below underlay |
| Settings | rumble, stick speed, invert look, text size |
| Help | a picture of the controller with every button labelled |

### 4.6 Screen
| Place | Shows |
| --- | --- |
| Top left | status strip (as now): level and height, display, tool, unsaved count, new problems |
| Bottom centre | **tool bar**: the tools as icons with names, current one lit; door type under the door icon |
| Above the tool bar | 3-5 button prompts for the current state only (as now, fewer items) |
| Bottom right | **selection card** (read-only): name, kind, size, level. Full editing through Selection wheel > Properties |
| Next to the dot | live size or length while drawing or grabbing; what A will do |

The plan pane, when shown (Both or Plan layout), follows the dot and never takes pad focus. The plan crosshair and
pad focus switching go away; top-down 3D (View tap) does the plan job for the pad.

## 5. Tools for building top to bottom
| Step | Tool | Change from today |
| --- | --- | --- |
| 1 Levels | Hub > Levels: add level above or below with its storey height; duplicate a level | New (Part E4) |
| 2 Shell | Room tool, "Outside walls" on: draws the footprint with exterior walls | Room tool makes walls (new) |
| 3 Rooms | Room tool inside the shell: makes interior walls, reuses walls it lands on | Rooms with walls (new) |
| 3b Divide | Split (Selection wheel): A, A across a room makes a wall and two rooms | New |
| 3c Walls | Wall tool chains: each A starts the next segment from the last end; B ends the chain | Chaining (new) |
| 4 Doors and windows | Ghost slides along the wall under the dot, centres between cross walls, shows distances to each end | Centring and distances (Part D2, D3) |
| 5 Names | Properties > Name: a list of common names first (Office, Corridor, Store, WC, Plant), keyboard last | Name list (new) |
| 6 Stairs | Stair tool: A at the start, point the way it climbs, A: the legal size is proposed from the facts | Part E2, pad-first |
| 7 Next floor | Hub > Levels > duplicate this level up, or box-select and Copy to level above, then change what differs | Part E4 and D8 |
| 8 Objects | Object tool from the Build wheel, RB rotates while placing | Part F |
| 9 Try it | Hub > Play > Walk test; back to the same spot | Part B |
| 10 Fix | Hub > Checks, A on a problem goes there; red markers in the view | Part D5 |

Numbers such as corridor widths and the default room heights come from facts.json; none are typed in code.

## 6. What goes away
Pad focus cycling (View held), the plan crosshair, D-pad "next thing near the dot", LT / RT flying (fly camera stays
for the mouse and as a hub setting), View, Level and File in the Y wheel, help as a menu. Mouse and keyboard keep
everything they have; the hub and the wheels also work with the mouse (hold Space stays the Build wheel).

## 7. Suggested order (replaces the rest of the ED2 order)
| Part | What | Sessions |
| --- | --- | --- |
| ED3-1 | Builder camera, new button map, tool bar, top-down swap, selection card | 1 |
| ED3-2 | Hub with tabs, Selection wheel, edge-aware grab, magnetic dot, ghost previews | 1 |
| B | Walk test as the player (unchanged) | 1 |
| ED3-3 | Room tool makes walls, split, wall chains, door centring, live sizes, linked walls (Part D Must, pad-first) | 1-2 |
| E | Levels, stairs, ladders, holes, renaming (pad-first stair tool) | 1-2 |
| D rest | Clickable problems, floating names, save summary, search, history | 1 |
| F, G, H | As written | - |

Each part keeps the ED2 rules: Babylon-free logic with Vitest, `npm run e2e:editor` extended with the fake pad,
screenshots, editor.md updated, one session each, Michael tests on the real pad before the next.

## 8. Questions for Michael (answered 2026-10-12: builder camera, rooms make walls, controller rework first, D-pad tool bar)
1. Camera: builder camera that follows the editing level (Recommended: less steering, more building) / keep the free
   fly camera as the default.
2. Rooms: drawing a room also makes its walls (Recommended: halves the work per floor) / rooms and walls stay separate.
3. Order: controller rework (ED3-1, ED3-2) before the walk test (Recommended: you said you will not test without a
   good controller) / walk test first.
4. Tool switching: D-pad left / right tool bar plus Y wheel (Recommended) / shoulder buttons for the tool bar, fine
   grid moves to a trigger.
