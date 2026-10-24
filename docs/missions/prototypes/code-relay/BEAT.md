# Code Relay - beat chart (Sector Ops prototype, 1-4 players)

Map: Saltmarsh Park (`campusOps`), section S4 Data hall only (`sections: ['s4']`, start = C3's checkpoint (24, 0, 8),
`campusS4Data.ts:176`). Sources: BRIEF A9 / A14 / A16, PLAN 2-3, audit 4-5 ("interrogate a code, the vault team enters
it in 30 s"), `docs/story.md`. Layout: Sector Ops' plan graph
`origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S4.json` (space and sync ids below, at fe3ef35f).
Sector Ops' S4 page, `S4-detail.md` and `SYNC.md` now carry every node this chart asked for; **(pending)** marks a
device that is still planned, not built.

## Premise
Orrin's build and signing logs for the Tidewater controllers sit on one terminal in a mesh cage on the data-hall floor
(the section objective as built: a 10 s download that opens C4). Tonight the terminal will not run a download without a
release code from the NOC, and a release lives 30 seconds. Only the duty NOC officer can issue one. One team goes over
the roof to the NOC and makes the right man issue it; the other waits in the cage to use it before it dies.

## Teams and solo (A9)
- **Team Relay = Team A** (slots 0 and 2): track A, high / north: the generator compound, plant ladder, roof deck, cable
  riser, north corridor, security room, NOC mezzanine. Zones: yard, deck, nc, sec, noc.
- **Team Vault = Team B** (slots 1 and 3): track B, ground / service: the dock, service corridor, battery room, hall,
  cage. Zones: dock, lobby, batt, cold-w, cold-e, hall-w, pod-1, pod-4, cage. Both meet at the colonnade (zone c4, shared).
- 2 players: one each; 3 players: the third joins Relay. **Solo:** one player does it all in the order 1B, 2A (the
  roster gives 1A's answer; in by the compound's cable-pull door on the dock code, the riser and the north corridor),
  2B (the front gate, now that the desk loop has the cage camera), 3A, 3B, 4, 5 (about 27 min with the optional, rated
  lower; the roof is skipped). The simultaneous beat (Relay issues, Vault enters within 30 s) has a named solo fallback
  in the briefing: alone, the duty officer issues a maintenance release instead, good for 90 seconds.

## Rules (2: mission 1, Relay 1; each team and a solo player carry at most 2, Michael's cap)
| Scope | Rule | Briefing line | Objective-list line |
| --- | --- | --- | --- |
| mission | `noAlarms` | "No alarms, anyone. An alarm and the NOC locks the cage. The logs go with it." | "Rule - no alarms" |
| a | `namedTarget` (target #14 "Dunmore", decoy #15 "Pryce") | "Relay: question only the duty officer. Ask the other and the release is cancelled." | "Team Relay - question only the duty officer" |
- Relay carries 2 (no alarms, the duty officer), Vault 1 (no alarms), a solo player 2.
- The 3-rule variant is the sign-off's option 2 ("Lift your 2-rule cap for this mission"): it adds Vault's `noBodies`
  (scope b; briefing "Vault: no bodies found. The hall is walked every forty seconds."; objective line "Team Vault - no
  bodies found"), and a solo player then carries 3. Not in `graph.json`.
- Signposting: the briefing lines, a rule row under the title and under each team's title in the objective list,
  LANTERN's reminder at the section start, the rating card's rule rows. Cameras count as alarms (section-rating default).
- **Breaking one (M1):** LANTERN's line, then section restart from the C3 checkpoint. A mission rule (an alarm) sends
  both teams back. A team rule sends that team back; its S4 steps and facts reopen, the other team's done steps stay
  (`runner.restore` per team; EN2: today `restartSection`, sectorMode.ts:1158, resets the section for everyone).
  Questioning Pryce spooks Dunmore (A11: he respawns unalerted at the bolt point) and breaks Relay's rule; knocking
  Dunmore out before he talks breaks it too (no release is possible). Knock-outs are allowed on everyone else.

## Beat chart (per team 5 steps incl. the twist and extraction; co-op ~17 min, solo ~27 min)
| # | Team | Campus space | Min | Objective-list line (no markers) | In-world lead | Sync node -> opens for the other team | Gives / needs | Hint (off by default) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1A | Relay | s4-dock -> s4-yard -> s4-deck | 4 | Over the generator compound to the roof deck (a leg-up onto the plant ladder, or alone up the cable riser); hear who has the NOC tonight | Overheard: the deck patrol (#13, `campusS4Data.ts:59`) radios "Dunmore, it's chiller three again" (pending) | - | gives `s4-noc-duty` (Dunmore, west seat) | "The plant ladder is on the east wall: one gives the other a leg-up. Alone, the riser door at the compound's dark north end takes the dock code." |
| 1B | Vault | s4-dock | 2 | Read the dock board for the door codes, between the dock pair's trips | The board line "plant doors 2208, battery room the same" (:202), lit by the dock floods | **sync-s4-dockboard** (code_source, built): the code opens kp-batt for Vault and kp-deck (the riser door) for Relay | gives `s4-codes` | "The board is at the west end of the dock, by the door to the service corridor." |
| 2A | Relay | s4-deck -> s4-baskets -> s4-riser -> s4-nc -> s4-sec | 4 | Down the cable riser to the north corridor; loop the hall cameras at the security desk | The riser hatch the deck patrol covers; the desk lit by its monitors (the operator #5, :46, sits at it) | **sync-s4-desk** (camera_loop, built `desk-sec4` :165): loop (30 s), then off until a restart: cam-cage, cam-mantrap, cam-dock4. Opens the cage front for Vault | needs `s4-codes` (kp-deck) | "The side door from the north corridor is behind the operator. The supervisor sits by the panel." |
| 2B | Vault | s4-svc -> s4-batt -> s4-hall -> s4-cage | 4 | Through the dark battery room to the cage; get inside and wait at the terminal | The keyholder (#9, :52) at the front gate under cam-cage; his line "Nobody runs that terminal without a NOC release" | - (rear dual-custody gate: two Vault players press together; one player uses the front gate after sync-s4-desk) | needs `s4-codes` (kp-batt) | "Cold aisles under the cable baskets are the dark way. The keyholder never turns round." |
| 3A | Relay | s4-sec -> s4-noc | 3 | Up to the NOC; make the duty officer issue a cage release | `s4-noc-duty` + Dunmore's seat placard at the window (pending); Pryce sits beside him | **sync-s4-noc** (code_source): the release goes to the cage terminal; Vault has 30 s (solo 90 s) | needs `s4-noc-duty`; gives `s4-release` (new mechanic: named interrogation) | "Two at the window. Deal with the other one first, quietly. Then ask the right one." |
| 3B | Vault | s4-cage | 3 | Enter the release at the cage terminal and pull the build and signing logs | Relay's call; the terminal screen turns from red to the release prompt | **sync-s4-cagekp** (code_sink): the 10 s download (:180) opens C4 for everyone | needs `s4-release` (new mechanic: relayed code window) | "Be at the terminal before Relay asks. Thirty seconds is not long." |
| 4 | Both | s4-noc (window) + s4-hall -> s4-cage | 2 | **Twist:** keep the cage clear: the release has called the mobile supervisor | Relay sees the hall from the NOC window (armoured glass, the section's vantage) and calls him | - | - | "He walks the west aisle to the centre aisle. Relay can see all of it." |
| 5 | All | s4-hall -> s4-ups -> s4-cc | 3 | Everyone out through the UPS room and down the colonnade | The colonnade sentry (K3, #19, :69) posted at the C4 door | - | - | "The UPS room door is in the hall's north-west corner. The colonnade sentry faces east, into the corridor." |
- **Twist (4):** the release posts to the site log; the mobile supervisor (#20, :71, body armour) leaves the west aisle for
  the cage front to check it, while the download runs. Vault must keep him off the cage, or take him down where the
  hall walk will not find him (a found body starts a search, and a search that reaches a panel breaks the no-alarms
  rule); Relay at the window calls his position. Pryce's screen shows it too, if he is still awake.
- **Optional (Relay):** "Wipe tonight's footage at the security desk" (a second desk action, 8 s, the supervisor at his
  monitors beside it). Lead: SEXTON. Reward: `gadget` (one extra gadget charge, section-rating's Grant). Hint: "The
  footage is on the desk. It takes longer than a loop. Do it when the room is quiet."
- **Parallel objectives on separate routes:** 1A (compound, roof) and 1B / 2B (dock, battery room, hall) at once; 2A
  (north block) and 2B (hall) at once. **Sync points:** sync-s4-dockboard (Vault -> Relay), sync-s4-desk (Relay -> Vault),
  sync-s4-noc -> sync-s4-cagekp (Relay -> Vault, the 30 s relay).

## Alarm escalation per area (EN2: per-area stages; today one site stage, `stageActions` `campusS4Data.ts:204`)
- **North block** (Relay's zones): a detection raises north stage 1: the north corridor tour (#16, dormant) walks, the
  deck patrol turns to the riser hatch.
- **Hall** (Vault's zones): stage 1: hall lights full (groups 70-72, today's stage 1), the dock-east reinforcement
  (28, 20.5) walks the service corridor.
- **Site** (stage 2): both areas at stage 1: dogs released, the response route, the dock west door locks; stage 3
  locks the battery room door. Any alarm (alarm-sec4, alarm-mt, alarm-dk :157, or a camera) also breaks the mission rule.

## Extraction
Every present player holds the colonnade zone at the C4 door (`SectorRun` extract phase, every living player). A team
sent back to C3 by a restart crosses the dock and the hall again; the mission does not end without it.

## Radio (voiceable, British spelling, 90 characters or less each)
- LANTERN (start): "Evening, Night Shift. The data hall. Relay over the roof, Vault through the batteries."
- LANTERN (briefing, solo): "On your own, he issues a maintenance release. Ninety seconds, not thirty. Run."
- TALLY (start): "That terminal wants a NOC release. A release lasts thirty seconds. I didn't design it."
- SEXTON (after 1A): "Dunmore. West seat. The other one's Pryce. Leave Pryce's opinions out of it."
- TALLY (after 2A): "Cage camera's looping. Then it's off. Nobody's watching the cage but you."
- LANTERN (3A, release issued): "Release is live, Vault. Thirty seconds. Go."
- SEXTON (twist): "Supervisor's off the west aisle, heading for the cage. Twenty metres."
- LANTERN (after 3B): "Logs are out. Colonnade, everyone. Quietly."
- LANTERN (rule broken, Relay): "Wrong man. He's warned Dunmore. Back to the dock, Relay."
- LANTERN (rule broken, alarm): "Cage is locked. Everyone back to the dock. We go again."

## Nodes needed from Sector Ops (the lead forwards to "Night Shift | Sector Ops Build")
| Node | Kind | Room (space) | Device / spot | Src | Lead spot |
| --- | --- | --- | --- | --- | --- |
| sync-s4-dockboard | code_source | s4-dock | dock board (16, 1.5, 21.85), grants `s4-codes` (built) | `campusS4Data.ts:202` | s4-dock: the board itself |
| kp-deck (riser side) | code_sink for `s4-codes` | s4-riser -> s4-nc | the riser door (30.6, 45) needs its keypad on the riser side too (pending) | `campusS4.ts:59`, keypads `campusS4Data.ts:198` | - |
| sync-s4-desk | camera_loop | s4-sec | `desk-sec4` at (-2.8, 44.6), cams cage / mantrap / dock4 (built) | `campusS4Data.ts:165` | s4-nc: the side door (8, 45) |
| sync-s4-noc | code_source | s4-noc | the NOC console release, issued by interrogating #14 | planned | s4-deck: #13's radio stop (12..30, 36); s4-sec: duty roster by the desk |
| sync-s4-cagekp | code_sink | s4-cage | release prompt on the cage terminal (18, 0, 38.3); window 30 s, solo 90 s | planned | s4-hall: the keyholder's line at the front gate (18, 33) |
| lead-s4-deckradio | intel (overheard) | s4-deck | #13's radio line, grants `s4-noc-duty` | planned | - |
| lead-s4-roster | intel (document) | s4-sec | duty roster beside the desk, grants `s4-noc-duty` (solo's lead) | planned | - |
| NOC seat placard | landmark | s4-noc | name strip on Dunmore's west seat (x 1.0) | planned | - |
| bolt point (A11) | spot | s4-nc | Dunmore's spook respawn by the riser door (28, 45.8) | planned | - |
| footage drive (optional) | interact | s4-sec | second desk action, 8 s | planned | - |
| twist reaction | guard-ai / mission | s4-hall | #20 walks to the cage front on the release | planned (Guard AI) | - |

## Graph notes (CR graph, 2026-10-25, over Sector Ops fe3ef35f)
- `graph.json` encodes this chart on Sector Ops' plan graph `graph/plan/campusOps-S4.json`
  (origin/feature/sector-redesign-signoff fe3ef35f). Steps: cr-1a, cr-1b, cr-2a, cr-2b, cr-3a, cr-3b, cr-4 (the twist),
  cr-opt, cr-5. Teams: a = Relay, b = Vault. Start: s4-dock.
- Changes in this pass:
  - cr-1b's lead and view are now `s4-lobby`: the dark goods lane at the dock's goods door (Sector Ops' lobby vantage,
    0.8), which looks onto the dock board under its own lamp at the dock's west end. This replaces the first pass's
    `s3-dock`, which is S3's own goods dock, not where the board is read. The board's own lead is the board itself
    (`sync-s4-dockboard`, lead s4-dock), but 1B is in the start room and the validator wants the lead outside the
    step's room, so the next real space that sees the board is named.
  - cr-5's s4-cc is Sector Ops' `tracks.exfil` in S4 (fe3ef35f; the space tag is gone, as in S2).
  - Rules (spec fix round): Vault's `noBodies` is out of `rules`, so the mission has 2 (no alarms for everyone, Relay's
    duty officer) and no team or solo player carries more than 2. The 3-rule variant is the sign-off's option 2.
  - Sync ids are unchanged: sync-s4-dockboard, sync-s4-desk, sync-s4-noc, sync-s4-cagekp. Sector Ops' two extra nodes,
    `sync-s4-ess-board` (Vault darkens the NOC and the security room, 25 s) and `sync-s4-yard-board` (the compound flood,
    20 s), are optional openers: no step needs them, so no objective names them.
  - Sector Ops made the plant ladder a co-op climb (CR10). A lone Relay player (2 players) goes in by kp-riser (34, 46.5)
    with Vault's dock-board code. The validator's solo run passes.
- Id change kept from the first pass: `s4-svc` is part of `s4-lobby` (its goods lane), so 2B runs dock, lobby, battery
  room, hall, cage.
- MissionDef fields kept in the graph for EN2: cr-3a has `target` #14 Dunmore, `decoys` #15 Pryce and `bolt`
  (28, 0, 45.8). cr-3b has `window` 30 and `soloWindow` 90. Tracks: Relay owns the roof deck by height (y >= 7.3, EN2).
- Validator (mission-validator 4ea5d26bf, the five plan graphs at fe3ef35f + this file): 0 errors, 120 warnings: 119
  campus-own (the run without a mission gives 0 / 119), 0 mission errors, 1 mission warning:
  - "No choke node" in S4. The colonnade (s4-cc) is the exit and the choke itself (the colonnade sentry), reached from
    both the battery room and the UPS room: the two tracks meet at the exit (A16).
  - Gone: the solo-carries-3-rules warning (2 rules now), the campus "exfil 's4-cc' is not in the last section S5"
    (Sector Ops moved the exfil to `tracks.exfil`), and the first pass's others (the choke check covers only S4).
- Plans: one per storey, `scripts/graph-svg.mjs` over Sector Ops' `S4-plan-<y>.svg` (`--base-bounds -16,10,46,54`),
  drawn from the plan graph's real `area` boxes, all at fe3ef35f (plan graph `git show
  origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S4.json`, base SVGs from
  `docs/sector-redesign/signoff/`). A scratch render copy only wraps each `area` box as a one-box list (graph-svg reads
  a list), keeps one storey's spaces, links and nodes, and colours the teams as Sector Ops' S4 plan does (orange Relay,
  blue Vault).
  - `PLAN-0.svg`: the ground floor, every step but 1A and 3A.
  - `PLAN-3.6.svg`: the NOC mezzanine (3A), with the plenum (3.2) and the cable baskets (4.4).
  - `PLAN-7.3.svg`: the roof deck (1A), now its full box over the block on its own storey.
  - A lead pin on another storey is listed as not drawn.
- Node needs for Sector Ops (S4): none new. Still planned, to build: sync-s4-noc, sync-s4-cagekp, lead-s4-deckradio,
  lead-s4-roster, the seat placard, the footage drive, kp-riser. #20's walk to the cage is Guard AI's.
