# Code Relay - beat chart (Sector Ops prototype, 1-4 players)

Map: Saltmarsh Park (`campusOps`), section S4 Data hall only (`sections: ['s4']`, start = C3's checkpoint (24, 0, 8),
`campusS4Data.ts:176`). Sources: BRIEF A9 / A14 / A16, PLAN 2-3, audit 4-5 ("interrogate a code, the vault team enters
it in 30 s"), `docs/story.md`. Layout: Sector Ops' plan graph
`origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S4.json` (space ids below). Its sign-off
pages `S4.md` / `S4-detail.md` and sync table are not pushed yet: every node marked **(pending)** is assumed from the
campus code and must be confirmed by Sector Ops' S4 page.

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
- 2 players: one each; 3 players: the third joins Relay. **Solo:** one player does it all in the order 1B, 2B, 2A (the
  roster gives 1A's answer), 3A, 3B, 4, 5 (about 26 min, rated lower; the roof is skipped). The simultaneous beat (Relay
  issues, Vault enters within 30 s) has a named solo fallback in the briefing: alone, the duty officer issues a
  maintenance release instead, good for 90 seconds.

## Rules (mission 1, Relay 1, Vault 1; a solo player carries all three)
| Scope | Rule | Briefing line | Objective-list line |
| --- | --- | --- | --- |
| mission | `noAlarms` | "No alarms, anyone. An alarm and the NOC locks the cage. The logs go with it." | "Rule - no alarms" |
| a | `namedTarget` (target #14 "Dunmore", decoy #15 "Pryce") | "Relay: question only the duty officer. Ask the other and the release is cancelled." | "Team Relay - question only the duty officer" |
| b | `noBodies` | "Vault: no bodies found. The hall is walked every forty seconds." | "Team Vault - no bodies found" |
- Signposting: the briefing lines, a rule row under the title and under each team's title in the objective list,
  LANTERN's reminder at the section start, the rating card's rule rows. Cameras count as alarms (section-rating default).
- **Breaking one (M1):** LANTERN's line, then section restart from the C3 checkpoint. A mission rule (an alarm) sends
  both teams back. A team rule sends that team back; its S4 steps and facts reopen, the other team's done steps stay
  (`runner.restore` per team; EN2: today `restartSection`, sectorMode.ts:1158, resets the section for everyone).
  Questioning Pryce spooks Dunmore (A11: he respawns unalerted at the bolt point) and breaks Relay's rule; knocking
  Dunmore out before he talks breaks it too (no release is possible). Knock-outs are allowed on everyone else.

## Beat chart (per team 5 steps incl. the twist and extraction; co-op ~17 min, solo ~26 min)
| # | Team | Campus space | Min | Objective-list line (no markers) | In-world lead | Sync node -> opens for the other team | Gives / needs | Hint (off by default) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1A | Relay | s4-dock -> s4-yard -> s4-deck | 4 | Over the generator compound and up the plant ladder; hear who has the NOC tonight | Overheard: the deck patrol (#13, `campusS4Data.ts:59`) radios "Dunmore, it's chiller three again" (pending) | - | gives `s4-noc-duty` (Dunmore, west seat) | "The ladder is on the building's east wall. The dog walks the other side of the tanks." |
| 1B | Vault | s4-dock | 2 | Read the dock board for the door codes, between the dock pair's trips | The board line "plant doors 2208, battery room the same" (:202), lit by the dock floods | **sync-s4-dockboard** (code_source, built): the code opens kp-batt for Vault and kp-deck (the riser door) for Relay | gives `s4-codes` | "The board is at the west end of the dock, by the door to the service corridor." |
| 2A | Relay | s4-deck -> s4-baskets -> s4-riser -> s4-nc -> s4-sec | 4 | Down the cable riser to the north corridor; loop the hall cameras at the security desk | The riser hatch the deck patrol covers; the desk lit by its monitors (the operator #5, :46, sits at it) | **sync-s4-desk** (camera_loop, built `desk-sec4` :165): loop (30 s), then off until a restart: cam-cage, cam-mantrap, cam-dock4. Opens the cage front for Vault | needs `s4-codes` (kp-deck) | "The side door from the north corridor is behind the operator. The supervisor sits by the panel." |
| 2B | Vault | s4-svc -> s4-batt -> s4-hall -> s4-cage | 4 | Through the dark battery room to the cage; get inside and wait at the terminal | The keyholder (#9, :52) at the front gate under cam-cage; his line "Nobody runs that terminal without a NOC release" | - (rear dual-custody gate: two Vault players press together; one player uses the front gate after sync-s4-desk) | needs `s4-codes` (kp-batt) | "Cold aisles under the cable baskets are the dark way. The keyholder never turns round." |
| 3A | Relay | s4-sec -> s4-noc | 3 | Up to the NOC; make the duty officer issue a cage release | `s4-noc-duty` + Dunmore's seat placard at the window (pending); Pryce sits beside him | **sync-s4-noc** (code_source): the release goes to the cage terminal; Vault has 30 s (solo 90 s) | needs `s4-noc-duty`; gives `s4-release` (new mechanic: named interrogation) | "Two at the window. Deal with the other one first, quietly. Then ask the right one." |
| 3B | Vault | s4-cage | 3 | Enter the release at the cage terminal and pull the build and signing logs | Relay's call; the terminal screen turns from red to the release prompt | **sync-s4-cagekp** (code_sink): the 10 s download (:180) opens C4 for everyone | needs `s4-release` (new mechanic: relayed code window) | "Be at the terminal before Relay asks. Thirty seconds is not long." |
| 4 | Both | s4-noc (window) + s4-hall -> s4-cage | 2 | **Twist:** keep the cage clear: the release has called the mobile supervisor | Relay sees the hall from the NOC window (armoured glass, the section's vantage) and calls him | - | - | "He walks the west aisle to the centre aisle. Relay can see all of it." |
| 5 | All | s4-hall -> s4-ups -> s4-cc | 3 | Everyone out through the UPS room and down the colonnade | The colonnade sentry (K3, #19, :69) posted at the C4 door | - | - | "The UPS room door is in the hall's north-west corner. K3 faces east, into the corridor." |
- **Twist (4):** the release posts to the site log; the mobile supervisor (#20, :71, body armour) leaves the west aisle for
  the cage front to check it, while the download runs. Vault (no bodies found) must keep him off the cage or take him
  where nobody finds him; Relay at the window calls his position. Pryce's screen shows it too, if he is still awake.
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

Approve this beat chart?
