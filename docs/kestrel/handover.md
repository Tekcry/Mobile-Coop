# Kestrel planning handover (2026-10-11)

Everything needed to continue Mission 1 "Dead Line" if the planning chat is lost. Read with RULES.md and progress.md. Where this file and the Claude Doc prompt pack differ, this file wins.

## Status (2026-10-11)
- Approved: D0, D1, P00, S0, RU, P03. RU2 (campus rules) committed.
- P01: APPROVED (b6157bf). Campus revision, answers, and the civilians, traversal and two-tracks follow-up committed (5764aad).
- CAM (camera respects walls and low spaces): committed (6c1ac7a, record 45205ef); progress.md still lists it as DRAFT.
- P02 campus brief: APPROVED (6c43a9b; brief 133a4d1). One passenger lift per building, locked off at night (built as closed shafts with shut doors); separate generator wing with a 1.5 m service passage; key-only and exit-only doors ring-exempt; 2.4 m corridors under 1.5 m voids; A 36 x 24, B 48 x 30, site 108 x 76; raised-floor pedestals not modelled.
- P03T campus tools: APPROVED (f097ce1): meta.buildings, level footprint lists, rooms[].building (A31), level H for low roofs, site limit 110 x 80.
- V0 toolkit spec: APPROVED after the pistol secondary revision (811eaca, approved f67dc0b).
- P03B: DRAFT, to be redone for the campus (next).
- B0: built for the old single building (57aaf6c); rerun for the campus.
- S1: Part A built (478c3b8); Part B runs after B4.

## Order
P03B campus block plan (Opus high), P03R campus review, B0 rerun, Michael walks it, tools revision for A30 (backlog 25) before P04, P04-P05, B1-B2, BR, P04S, P06-P10, CAM approval then V1-V3 (all before B3), B3, B4, S1-S4, B4S, BR, S5, S6 civilians, B5, B6, BR, B7.

## Notes for the next stages
- P03B: use meta.buildings, level footprint lists, rooms[].building and level H (B hall roof and generator wing roof at 6.6). A30 cannot yet tell the buildings apart, so P03B confirms by hand that each building has its own fire stairs.
- B0 rerun: update src/world/maps/kestrelGeo.ts and kestrel.ts, which read meta.footprint and one footprint rect per level (kestrelGeo.ts:85); the map copy test (tests/kestrelMap.test.ts) passes again once blocks are copied.
- B0 walk, Michael reports: scale against the operator, campus layout and distances, storey heights and the bridge lining up, gallery headroom, crouch-moving in every 1.5 m space, reading entrances and roofs from the yard, stair cores, lift shafts against the cores, camera snapping or clipping, anything placed for no real reason, neighbour framing. Not judged yet: missing doors and windows, looks, guards and security devices, traversal elements, furniture, phone performance, room shapes inside zones, routes and timings.
- CAM: progress.md still shows DRAFT; Michael tries the CAM checks on PC and approves it in its own short session before V1.
- V1: the optic's proposed F key clashes with Use (keyBindings.ts:55) and R3 with shoulder swap. V3: the pistol secondary binding (desktop H, pad A while aiming, touch chip) is a proposal to confirm.
- Tool tests on Node 24: node --test scripts/kestrel/*.test.mjs (the folder form fails).

## Decisions to carry into P02 (campus brief)
- Parking in front of both buildings: marked bays, an accessible bay by each entrance, visitor bays at Building A's reception, cars matching who is on shift, Pell's van in the yard and the tenant pair's van.
- Extra rooms: gas suppression room, indoor generator hall with catwalks, CCTV equipment room, key safe room, customer staging room and shipping cage, tape library, customer lounge, post room, locker room, media destruction room. Ground-floor staff WC off the controlled corridor.
- Building B's hall is entered only upstairs: mantrap (about 4.2 x 3.7 m clear) off the first-floor staff corridor, a first-floor secure corridor, a gallery over the hall with a balustrade, a stair down. Hall 6.0 m clear under the 6.6 m roof. Inner plant corridor (UPS, battery, switchroom) reached from inside the hall; cooling gallery opens from the hall. Hall light switch bank on the gallery at its entrance.
- Equipment door between the build room and the hall: locked, no handle or reader outside, opens only from inside, alarmed, ring-exempt; never a way in.
- Underfloor void: whole hall, 1.5 m CLEAR under a thin raised access floor (floor tiles, not a slab; the structural slab is sunk to give 1.5 m clear; deliberate deviation, real voids are 0.6-1.0 m); hall floor level with corridors; hinged hatches throughout (opened and closed, never removed); level U; guards never enter. The camera fix measured the earlier block plan at 1.2 m clear, which is too low to crouch.
- Goods lift removed. Main stair: dog-leg, two 1.85 m flights, open centre with balustrade, 2.0 m landings, about 4.0 m core, off the controlled corridor only. Fire stairs: flights keep their length, landings fill the core, solid centre wall touching every landing, flights fill the width, ground exit on the building's end wall by the bottom landing.
- Corridor ceiling voids (1.5 m clear) on office floors only; offices keep normal ceilings; office floors about 4.2 m floor to floor; voids never enter rooms whose walls run to the slab (security room, mantraps, halls, meet-me room).
- Carrier entrance under the yard feeds both buildings through the service tunnel; the 2021 meet-me room is in Building B; the manhole sits by the vault.
- Secret-route elements: pipe rack between the buildings, link bridge roof, roof cooling shaft into Building B's hall (bolted, alarmed grille; maintenance key switch beside it, key in the key safe), cable and pipe risers with fixed ladders, smoke vents at the top of the fire stairs.
- Real elements for every move: downpipes on every facade, parapets and cills, fixed ladders, roof fall-arrest anchors, chain-link, a narrow service passage between Building B and the generator hall within the engine's split-jump range. No zip line (saved for a future mission).
- Neighbours: depot facade 7.0 m, viaduct 9.0 m.

## Decisions to carry into later stages
- P06 and P08: the car opportunity: the remote-hands technician's Building B badge in their glovebox; car keys in a jacket in the locker room or in the security office key cabinet; remote fob unlocks fast but flashes and beeps, the key in the door is silent and slow (the ghost way), breaking a window sets off the car alarm. Cars give cover; their lights can give the player away.
- P06 and P10, "best operative" checklist (pass or fail): at least 3 real approaches per space; at least 1 expert route per space; at least 1 "can't believe that worked" moment per building; guards pass near hides by design, never randomly; every failure is readable; a perfect ghost feels earned. Every movement the engine supports is used at least once on a real element.
- P06: the play schema needs a "zipline" traversal kind for later missions, and "drainpipe" maps to the engine's vertical pipe.
- B0 rerun and later builds: check every crawl space is at least 1.5 m clear inside (floor to underside of whatever is above).
- S1 Part B: prefer infiltration with a minimal seclab mission over clear mode; add a real gunshot test; optional later: a player at the desk views camera feeds to guide a partner.
- S2: card-and-PIN readers; a PIN is an intel pickup that sets a flag the reader or key safe accepts; a car as a lockable container needing a key item if the item system allows (fallback: unlocked car or a locker).
- S5 and S6: dormant guards and civilians; test raising the 12-awake cap for desktop as a recorded decision.
- B6: new rating counters "no knockouts" and "no grabs" beside the bible's four.
- Wall hugging is not in the engine yet; it is part of the toolkit (V0 spec, V1 build), with the optic cable.
- Site name: Cinder Yard and Ostler Colocation are placeholders; Michael still picks from D1's three options.

## Chaos Theory toolkit (2026-10-11)
- Decision (Michael): the engine gets the full Chaos Theory toolkit; each mission offers only the tools that suit it through a mission kit; every tool is real equipment used believably and respects the ghost rule.
- Spec: docs/systems/ct-toolkit.md (V0, APPROVED): wall hug, optic cable, lockpick, hacking, pistol secondary (the merged camera jammer and light disruptor), sticky shocker, ring airfoil, interrogation, knife; the mission kit (`MissionDef.kit`); the map fields P06 adds (`lock`, `seal`, `optic`, `alarm`, `hack`, `cut`, `lines`).
- Dead Line's kit (approved by Michael, 2026-10-11): in: wall hug (always), optic cable, lockpick, hacking, sticky shocker (2 rounds), interrogation; out: ring airfoil (same role as the shocker), knife (no cuttable element). Existing gadgets: noisemaker, sticky cam, EMP, sleeping gas in; frag, mine, flashbang, tri-rotor out. P06 should give Pell's cage a `high` or code lock so the knowledge gates hold.
- 2026-10-11 V0 revision: the camera jammer and light disruptor are one pistol secondary function (Chaos Theory OCP style), always available in every mission, not a kit tool; it disables lights and electronics briefly on a recharge.
- Michael's answers (2026-10-11): V1-V3 build only Dead Line's kit (airfoil and knife stay specified, backlog items 23-24); V1 replaces snap cover with the wall hug and deletes it; lockpick and hacking are minigames only; RULES.md section 11 exception granted for V1-V3 (player controller, camera, grab and takedown code, new src/config/tools.ts, toollab debug map; no existing tuning value changes), which also brings the toolkit into the section 2 scope.
- Order: V1 wall hug and optic cable; V2 lockpick and hacking; V3 mission kit, pistol secondary, launcher with the sticky shocker, interrogation. They run after P10 and all must be APPROVED before B3. Each needs V0 and CAM APPROVED.
- Hooks for later stages: S1 Part B wires the hack events to the desk; S4 adds the camera's disabled state to `sec`; S6 civilians are questioned through the grab.

## Working rules
- Run one Claude Code session at a time; sessions share a working folder.
- Every prompt starts by switching to feature/kestrel and checking the branch; type /clear before each prompt.
- Desktop is the performance target; the phone is for quick tests on the light preset.
- Do not merge the feature/kestrel pull request into master until the slice is finished.
- Michael's preferences: answer his question before asking one; multiple-choice questions as native selectable options; prompts complete and ready to paste; plain English; hyphens, not em dashes.
