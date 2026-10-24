# Split Shift - beat chart (Sector Ops prototype, 1-4 players)

Map: Saltmarsh Park (`campusOps`), section S2 HQ atrium and offices only (`sections: ['s2']`, start = C1's checkpoint
(-20, 0, -32), `campusSectors.ts:356`). Sources: BRIEF A9 / A14 / A16, PLAN 2-3, audit 4-5 ("Team Ghost undetected
upstairs while Team Shadow holds a power cut"), `docs/story.md`. Layout: Sector Ops' plan graph
`origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S2.json` (space and sync ids below, at 7c021f01, Michael's sign-off picks; the S2
graph is unchanged since fe3ef35f).
Sector Ops' S2 page, `S2-detail.md` and `SYNC.md` now carry every node this chart asked for; **(pending)** marks a
device that is still planned, not built.

## Premise
Orrin's facilities officer runs every light and lock in the HQ block from one BMS terminal on the first floor. Hacking it
gives the lab block's door codes and opens the glazed bridge (the section objective as built). He never leaves his desk
unless his own lights go out. So one team goes upstairs and is never seen; the other works the ground floor, cuts the
east wing at the plant room and keeps it dark long enough for the hack, without a single alarm.

## Teams and solo (A9)
- **Team Ghost = Team A** (slots 0 and 2): track A, upstairs: the SW fire stair, L1 open plan, the kitchen, the east wing,
  the comms room, the facilities office. Zones: l1-balcony, l2-balcony, kitchen, facilities, comms, l2-stairs, l2-lift.
- **Team Shadow = Team B** (slots 1 and 3): track B, ground: the post and mail rooms, foyer, hall, east plant room.
  Zones: reception, lobby, goods. Both tracks meet at the bridge landing (zone c2, in neither track: shared).
- 2 players: one each; 3 players: the third joins Ghost. **Solo:** one player does every step in the order 1B, 1A, 2,
  3, 4A, 5 (about 23 min with the optional, rated lower). The one simultaneous beat (Shadow holds the cut while Ghost hacks) has a named
  solo fallback, in the briefing: the cut sends the facilities officer down to the plant room and back, about two minutes.

## Rules (2, one per team; none at mission scope; a solo player carries both)
| Scope | Rule | Briefing line | Objective-list line |
| --- | --- | --- | --- |
| a | `ghost` | "Ghost: never seen. Not by anyone upstairs. That includes Shadow's mistakes up there." | "Team Ghost - never seen" |
| b | `noAlarms` | "Shadow: no alarms. No panel, no camera. The reception panel is beside his desk." | "Team Shadow - no alarms" |
- Ghost is scored by the alerted guard's zone (A9): a Shadow player spotted by an upstairs guard breaks Ghost's rule.
  The radio says so at the section start. Shadow stays downstairs until the hack lands.
- Signposting: the two briefing lines, the rule row under each team's title in the objective list, LANTERN's reminder
  at the section start, the rating card's rule rows at the end.
- **Breaking one (M1):** LANTERN's line, then that team goes back to the C1 checkpoint and its S2 steps and facts reopen
  (`runner.restore` per team); the other team's done steps stay. Knock-on: a Shadow restart drops the power cut (lights
  back, the facilities officer returns to his desk); a Ghost restart drops the camera loop. Engine note (EN2): today
  `restartSection` (sectorMode.ts:1158) resets the whole section for everyone; a per-team restart is the lead's call.

## Beat chart (per team 4 steps incl. extraction; co-op ~14 min, the graph's budget; solo ~23 min, every step)
| # | Team | Campus space | Min | Objective-list line (no markers) | In-world lead | Sync node -> opens for the other team | Gives / needs | Hint (off by default) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1A | Ghost | s2-core-sw -> s2-l1-plan -> s2-l1-kitchen door | 3 | Up the post room's fire stair; listen at the first-floor kitchen for the facilities code | Overheard: the coffee pair (#5-6, `campusSectors.ts:93-125`) rehearse the code at the kitchen door (pending: intel entry) | - | gives `s2-fac-code` | "The kitchen is the lit room off the west balcony. Stand at its door, out of the lamp." |
| 1B | Shadow | s2-post -> s2-mail | 3 | Take the plant log from the mail room cages, behind the goods-door guard | Document: the sorting-table note in the post room, "Plant log - cage 3 for facilities" (pending) | - | gives `s2-board` (which breaker feeds the east wing) | "He faces into the room. The cages are behind his left shoulder." |
| 2 | Ghost | s2-l1-wing -> s2-l1-comms | 3 | Loop the ground-floor cameras at the comms room patch panel | Overheard: the comms checker (#8, :129) reads "UPS green, cameras green" at the panel each round | **sync-s2-comms** (camera_loop): cam-turnstile, cam-lift, cam-bridge report nothing; opens the foyer crossing behind reception for Shadow, and the landing for both | - (new mechanic: camera loop from a panel) | "Wait for the checker to leave the panel. He comes back every forty seconds." |
| 3 | Shadow | s2-foyer -> s2-plant-g | 3 | Cut the east wing at the switchgear in the east plant room | Reception officer's radio (#1, :86): "Facilities, your east boards tripped again." + `s2-board` | **sync-s2-power** (power_cut, held, no timer): the facilities office and the L1 wing go dark; the facilities officer (#7, :127) leaves the BMS desk for the plant room. Opens the hack for Ghost | needs `s2-board` (new mechanic: holding a cut) | "The plant room door is in the foyer's east wall, behind the desk's back." |
| 4A | Ghost | s2-l1-wing -> s2-l1-facilities | 3 | Into the dark facilities office and hack the BMS terminal | The office's cold lamp goes out (the light language: the dark is the way in) | - (the existing objective opens C2) | needs `s2-fac-code` (sync-s2-kpfac, pending) | "The office door is beside the corridor light switch. Leave the switch alone." |
| 4B | Shadow | s2-foyer (hall end) -> s2-plant-g | 3 | Hold the plant room dark until Ghost is out of the office | **Twist:** the facilities officer stops at reception and brings the reception officer with him | optional assist **sync-s2-atrium** (power_cut, built: S2_BOARDS `campusS2.ts:192`): pulling the atrium board sends #1 to his own board (guard-ai LR16-4), splitting the pair | - | "Two of them now. The atrium board is on the foyer wall. He always fixes his own lights first." |
| 5 | All | s2-core-ne -> s2-l1-landing | 2 | Everyone to the bridge landing and over the glazed bridge | The bridge officer (K2, #11, :135) at the card door; the BMS hack opened it | - | - | "Shadow: the north-east fire stair from the hall. The bridge officer faces the comms door; the west door is on his blind side." |
- **Twist (4B):** the cut was meant to draw one man. The facilities officer collects the reception officer on the way
  down (they walk the hall together). Shadow, under no alarms and with alarm-rcp beside the desk, must split them or
  take them in the dark plant room (hide spot (2.5, 0, -24), `campusS2.ts:164`). Ghost's hack is on a clock now.
- **Optional (either team):** "Photograph the lighting schedule on the board room wall, second floor" (s2-l2-board, via
  the NE fire stair; dead-end payoff). Lead: the facilities officer "sets the lighting schedule" (:127); TALLY asks for
  it. Reward: `syringe` (one, section-rating's Grant). Hint: "Second floor, north-east corner. The north-strip guard
  turns back at the wing door. Go in behind him." (#21, S2-detail section 6, turns at the board room's west door)
- **Parallel objectives on separate routes:** 1A (SW stair, L1) and 1B (post / mail, G) run at once; 3 (G east) and the
  Ghost approach to the wing (L1 north plan) run at once. **Sync points:** sync-s2-comms (Ghost -> Shadow) and
  sync-s2-power (Shadow -> Ghost), plus the optional sync-s2-atrium.

## Alarm escalation per area (EN2: per-area stages; today one site stage, reinforcements `campusSectors.ts:372`)
- **Upstairs area** (Ghost's zones): a detection raises the upstairs stage 1: balcony downlights full (groups 51, 52),
  the L2 lift-lobby reinforcement (-36, -7) walks the L2 ring. Ghost's rule has already broken by then.
- **Ground area** (Shadow's zones): stage 1: atrium lights full (group 50, the board can no longer cut it), the
  goods-door reinforcement (-40, -16.5) walks the post room.
- **Site** (stage 2): both areas at stage 1, or a panel pressed (alarm-rcp, alarm-brg, `campusSectors.ts:292`): K2 holds
  the card door shut until it stands down. A panel also breaks Shadow's rule (restart).

## Extraction
Every present player holds the bridge landing zone (`SectorRun` extract phase, every living player), then the C2 walk.
A player in the C1 checkpoint after a restart must make the landing too; the mission does not end without them.

## Radio (voiceable, British spelling, 90 characters or less each)
- LANTERN (start): "Evening, Night Shift. Two teams. Ghost upstairs, Shadow on the ground floor."
- LANTERN (start): "Ghost, nobody upstairs sees you. Shadow, nobody pulls a panel. Simple."
- LANTERN (briefing, solo): "On your own? Cut the east wing, then go up. He's two minutes down and back."
- SEXTON (start): "Shadow, stay downstairs. If a man upstairs sees you, it's Ghost who pays."
- TALLY (after 2): "Cameras on a loop. Reception's watching a very quiet foyer."
- TALLY (after 3): "East wing's dark. Facilities officer's up and grumbling. He's heading down."
- SEXTON (twist): "He's knocked on the reception desk. Two of them coming, Shadow."
- LANTERN (after 4A): "Codes are in. Bridge door's yours. Everyone to the landing."
- LANTERN (rule broken, Ghost): "They saw you. Back to the vestibule, Ghost. Shadow, hold what you've got."
- LANTERN (rule broken, Shadow): "That's a panel. Back to the vestibule, Shadow. The lights come back on."
- SEXTON (after 5, quiet): "Lovely building. Somebody should tell them about the lighting."

## Nodes needed from Sector Ops (the lead forwards to "Night Shift | Sector Ops Build")
| Node | Kind | Room (space) | Device / spot | Src | Lead spot |
| --- | --- | --- | --- | --- | --- |
| sync-s2-comms | camera_loop | s2-l1-comms | patch panel on the UPS cabinet wall, loops cam-turnstile, cam-lift, cam-bridge | planned | s2-l1-wing: #8's panel stop (2.2, -6.5) |
| sync-s2-power (was sync-s2-switchgear) | power_cut | s2-plant-g | a breaker board (BoardDef, no window) on the switchgear, groups 55 + 56 | planned | s2-foyer: #1's desk (-20, -24.9) radio line |
| sync-s2-atrium | power_cut | s2-foyer | the reception board, group 50 (built) | `campusS2.ts:192` | s2-foyer: the board itself, lit by the desk lamp |
| sync-s2-kpfac | keypad (code `s2-fac-code`) | s2-l1-facilities | keypad on both office doors (-4, -1) and (-7.5, 3); EW5 is not built (`campusSectors.ts:360`) | planned | s2-l1-plan: the kitchen west door (-30, -26), overhear box (-31, -26) |
| sync-s2-kitchen | intel (overheard) | s2-l1-plan | the coffee pair's line at the kitchen door, grants `s2-fac-code` | planned | - |
| sync-s2-plantlog | intel (document) | s2-mail | plant log in a parcel cage, grants `s2-board`; the post-room note points to it | planned | s2-post: sorting table (-35, -26) |
| guard reaction | guard-ai | s2-l1-facilities -> s2-plant-g | #7 walks to the new board when 55 / 56 go dark (LR16-4 lure), via reception (twist) | planned (Guard AI) | - |

## Graph notes (SS graph, 2026-10-25, over Sector Ops 7c021f01)
- **Sync pass (2026-10-25, after Michael's ~08:50 picks, Sector Ops 7c021f01).** Michael signed off S2 as drawn (void
  14.5 m, 18 guards). The S2 plan graph, `S2-detail.md` and the S2 plan SVGs are byte-identical to fe3ef35f, so every
  space id, sync id, `area` box, door and `tracks.exfil` below still holds and the plans were not redrawn. No Sector Ops
  greybox data for S2 is pushed yet (checked 7c021f01 and every sector-redesign branch). Text fixed to S2-detail's
  numbers: 4B's route (s2-hall is the foyer's hall end), #8's panel stop (2.2, -6.5), the keypad on both facilities
  doors (-4, -1) and (-7.5, 3), the kitchen door (-30, -26), ss-5's hint (K2 faces the comms door, the pg-brg west door
  is on his blind side) and ss-opt's hint (#21's new north-strip round turns at the board room's west door; the old
  hint said nobody came that far). Validator re-run on mission-validator 0c62a921 (VAL-DIMS): numbers below.
- `graph.json` encodes this chart on Sector Ops' plan graph `graph/plan/campusOps-S2.json`
  (origin/feature/sector-redesign-signoff 7c021f01). Steps: ss-1a, ss-1b, ss-2, ss-3, ss-4a, ss-4b (the twist), ss-opt,
  ss-5. Teams: a = Ghost, b = Shadow. Start: s2-foyer.
- Every node this chart asked for is now a real node in that graph's `syncs`, placed as the chart wrote it. The
  objectives name them in `sync` (the node the step uses) and `assist` (an optional one); neither is a validator field.
  - ss-1a: `sync-s2-kitchen` (the coffee pair's line outside the kitchen west door, s2-l1-plan, grants s2-fac-code).
  - ss-1b: `sync-s2-plantlog` (cage 3 in s2-mail, grants s2-board; its lead is the note on the s2-post sorting table).
  - ss-2: `sync-s2-comms` (camera_loop in s2-l1-comms, track A, the checker #8 at the panel). Ghost loops the cameras at
    the comms panel, as the chart has it. The first pass's alternative (Shadow at the reception desk) is gone.
  - ss-3 and ss-4b: `sync-s2-power` (the held cut on circuits 55 + 56, no timer; Sector Ops' `aka` sync-s2-switchgear).
    ss-4b's optional assist is `sync-s2-atrium` (the built reception board, group 50).
  - ss-4a: `sync-s2-kpfac` (code_sink on both facilities doors).
  - ss-5: assist `sync-s2-pairdoor` (pg-brg, now with `solo`: one player turns both keys within 8 s, an engine cost; without
    it, the comms door facing K2).
  - ss-5's extraction s2-l1-landing is Sector Ops' `tracks.exfil`, not a space tag. A tag in S2 would break the five-file
    campus spine check (start to exfil would skip S3 and S4). The validator now reads `tracks.exfil` (VAL 4ea5d26bf).
- Id change kept from the first pass: `s2-hall` is part of `s2-foyer`, so 4B's route and the foyer leads read s2-foyer.
- Tracks: `tracks` keeps a `y` band per team (Ghost 4.4-12.3, Shadow 0-4.4), because L1 and L2 sit over the ground
  floor's footprint (EN2 needs the height test). Sector Ops' own `tracks` object (A / B routes, meet and exfil at the
  landing) agrees with it.
- Validator (mission-validator 0c62a921, the five plan graphs at 7c021f01 + this file): 0 errors, 119 warnings, all
  campus-own (the run without a mission gives the same 0 / 119), 0 mission errors, 0 mission warnings (the same on
  4ea5d26bf at fe3ef35f).
  - Sector Ops' fix round (fe3ef35f) renamed the three S2 nodes to the contract's ids (`kp-fac` -> `sync-s2-kpfac`,
    `lead-s2-kitchen` -> `sync-s2-kitchen`, `lead-s2-plantlog` -> `sync-s2-plantlog`) and gave the kitchen node a lead
    space (`s2-l1-kitchen`). This file already uses the new ids.
  - The first pass's 6 mission warnings are gone. The extraction counts as exfil (tracks.exfil). S2 now has a choke,
    s2-l1-wing (the comms room is only reached through it). The choke check now covers only the mission's sections.
- Plans: one per storey, `scripts/graph-svg.mjs` over Sector Ops' `S2-plan-<y>.svg` (`--base-bounds -50,-36,34,12`),
  drawn from the plan graph's real `area` boxes, all at fe3ef35f, unchanged at 7c021f01 (plan graph `git show
  origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S2.json`, base SVGs from
  `docs/sector-redesign/signoff/`). A scratch render copy only wraps each `area` box as a one-box list (graph-svg reads
  a list), keeps one storey's spaces, links and nodes, and colours the teams (blue Ghost, orange Shadow, replacing
  Sector Ops' validator split tags).
  - `PLAN-0.svg`: the ground floor, Shadow's steps 1B, 3, 4B, and Ghost's SW stair.
  - `PLAN-4.4.svg`: the first floor, Ghost's steps 1A, 2, 4A and the landing (5).
  - `PLAN-8.4.svg`: the second floor, the optional board room. The roof (12.3) is not drawn: no step uses it.
  - A lead pin on another storey is listed as not drawn.
- Still for others:
  1. Guard AI: #7 walks to the plant room through reception when 55 / 56 go dark (the twist).
  2. Engine (EN2): the held cut, the patch-panel camera loop, the pair door's solo window, per-team restart.
