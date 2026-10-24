# Mission design audit: campaign and Sector Ops (2026-10-24 ~22:10)

Michael (~21:45): "How do level designers provide multiple pathways or options through each section, guiding you the
right way without actually putting visual cues? I want them to feel like proper, multi step missions that aren't open
world. Campaign missions should be 2 player coop only with strict rules to follow (ghost only, no kills, interrogate a
certain person for information, get creative with ideas that would be fun to play), whereas sector ops should be a 4
player coop version of that with potential for separate objectives to be carried out at the same time, allowing for two
separate teams to work together, or a solo player who wants to try do them all." (~21:52) "Sector ops can have strict
rules also FYI."

Three Opus research parts, full text with sources: C:/NightShift/scratch/mission-audit/1-current-docs.md (our docs and
code, file:line), 2-ld-craft.md (how real designers do it, URL per claim), 3-popular-missions.md (19 case studies, 17
concepts). Copy them into the repo with the first mission job.

## 1. Where we are
- No multi-step mission exists. Every Sector Ops section has ONE objective in a straight chain (`ObjectiveChain` runs in
  order; `SectorDef` holds one objective); every Marlow set is one exercise. No chaining, twist, intel-driven next step
  or opportunity objective anywhere. There is no campaign map yet (campaign spec parked, G255; Infiltration only has
  Warehouse data missions).
- Strict rules exist only as code for Infiltration (`MissionRules` noAlarms / noKills / undetected, off / bonus / fail,
  `src/game/missions.ts:33-38`); Sector Ops scoring is rewards only (section-rating's four marks). G125 caps a mission at
  ONE fail rule; LD 7.3 says lethal must stay viable. No doc allows or forbids rules in Sector Ops.
- Routes: the standard asks shadow / high / loud per space + a loop + a pinch point (LD 3.2-3.5), the validator 3+
  approaches of 2+ kinds. The campus fails it: 19 of 25 spaces lack a way in, S3 is a single door chain, co-op reaches
  6 of 25 spaces, no section has a split, the S5 "co-op only" rope works solo (149 errors).
- Guidance: one line in the standard (LD 6.4); world waypoints banned (bible L917, G135). Marlow guides with the
  objective list (G277), striped leg-up marks, door lamps and hazard stripes: markers by another name. Lit-by-default
  (LR1) weakens "light leads the eye".
- Players: master says 2 everywhere; coop4 (branch) makes Sector Ops 1-4; the validator sets `players: [2]` for campus,
  dropping the solo player Michael wants; LD 11 still says "solo first" for campaign maps against G253.
- Interrogation: grab menu INTERROGATE on information guards, joint questioning (G148), intel codes and reveals exist;
  no "interrogate a named target" objective type in code; campus has no information guard.
- Reusable now: objective steps with per-player lines (Marlow), `ObjectiveChain` + `MissionRules`, section rating,
  spotFail send-back (a hard-rule mechanism already), guardInfo / intel / jointInterrogation, alarm stages 0-3,
  connectors / checkpoints, pair gates / team doors / scanners / consoles, coop4 slots and pair devices, the validator
  graph (add objective and rule nodes).

## 2. How real designers do it (sourced in part 2)
- Multiple solutions per obstacle, planned by hand: a skill path, an action path, a social path (Deus Ex postmortem).
  Loops, not tubes; routes converge at a choke point per section (CT); "wide-linear": linear sequence, wide spaces
  (Naughty Dog); onion layouts with ~2-min sub-goals (Payday 2 Murky Station); phases instead of huge maps. Too many
  routes backfires (Prey).
- Guidance without markers: architecture the player can map (rooms with an obvious function, backstage routes visible
  from the main spaces, Clockwork Mansion); connected routes so you never get lost (Sapienza); always show the goal
  first; landmarks, framing, contrast, NPC motion toward the goal; ONE consistent lighting language (lit exit = critical
  path, dark alternate visible from the lit approach); overheard conversations, documents, interrogation as leads with
  an optional hint layer (Hitman added one when testers found Paris "incomprehensible"); scouting vantages; teach then
  test.
- Mission structure: gather intel then exploit it; the plan picks the prep (GTA V); rules can change by phase (Blacklist
  Missile Plant goes ghost then lethal); failure branches into an escape instead of a reload (Payday); optional
  objectives drive replay (CT); fewer, richer threads.
- Stealth: readable detection (light gem, 3 visible AI states); soft fails beat instant fails (Conviction criticised,
  Payday 3 moved to soft fails); short patrol loops; ratings make stealth pay (Silent Assassin, Ghost / Panther /
  Assault); pacifist play needs full tool support.
- Co-op: 2-player gates at many spots, not fixed keyholes (CT's main criticism); split information (one reads, one
  acts); recoverable partner mistakes. 4 players: distinct verb sets per team + 1-2 hard sync points; one team's success
  visibly helps the other; with 4 players one slip should escalate, not fail three others; give each pair its own
  rule-bearing sub-objective; every co-op gate has a solo bypass or a co-op-only tag.
- Process: beat chart per mission, bubble diagram / connectivity graph, blockout, playtest heatmaps.

## 3. Why popular missions are loved (part 3)
One clear goal, many verbs; a hook beyond "don't be seen" (find which of three, solve a murder, reshape rooms); dense
looping space with 3+ entries; intel changes routes; readable systems; escalation over instant fail; consequences that
persist; replay hooks on the same map. Players hate: escorts, forced fail-on-detection, backtracking, trial-and-error,
unclear maps, waiting for teammates, over-guidance, one-chance fear (unless opt-in).

## 4. Proposed framework
**Mission = 3-6 steps, 10-30 min, on a beat chart.** Each step 2-5 min, at most one new mechanic. At least one step is
intel -> exploit (interrogate / overhear / read -> a code, a route, a patrol gap, which target). One twist step. One
optional objective with a reward. Extraction is part of the mission (both players, or all present players).

**Sections (both modes):** 3 routes per guarded space (dark / high-or-vent / social-or-tool), a loop, a choke node per
section, no dead end without a payoff, a scouting vantage seeing half the patrols, the goal visible before you reach it.

**Guidance without markers (no waypoints, no stripes):** objective text names places ("the records room on the second
floor"), in-world leads (overheard lines, documents, maps, interrogation answers), rooms that read by function, one
lighting language (patrolled spot = white cone, warm lamp = social / objective, dark = route), landmarks per section,
the next goal framed from the current space. Optional hint layer (off by default?) for players who are lost.

**Mission rules (campaign and Sector Ops):** a mission declares 1-2 rules from a set: ghost (undetected), no kills,
no alarms, no bodies found, interrogate a named target (wrong target spooks the real one), no gadgets / recover kit,
plant-not-take, one-chance (opt-in only), timed window (named, never hidden). Rules are signposted in the briefing and
the objective list. Breaking a rule: see decision 1. Sector Ops rules can be global, per team, or split between teams
(e.g. Team A no kills, Team B never seen); a solo player carries every team's rules.

**Campaign (2 players, co-op only, G253):** every section has at least one co-op move that opens a route (boost, rope,
team door, synced hack, split information), at many spots not one keyhole; no solo bypass needed; asymmetric roles that
swap at the midpoint so nobody watches; both players always have a verb.

**Sector Ops (1-4 players):** each op has 2-3 parallel objectives on separate routes so 2+2 can split, each objective
2+ sync points with the other team (one team's success opens or helps the other's: power cut, camera loop, code relay);
alarms escalate per area before the whole site; a solo player can do every objective in sequence (longer, rated
lower, never impossible); rules scored per team.

**Validator / spec additions (testable):** routes per space, choke node, payoff on dead ends, goal-visible-before-reach,
vantage coverage, every objective has an in-world lead, ghost and pacifist runs path-checked, co-op gate per campaign
section, 2+ parallel objectives + sync nodes per Sector Ops op, solo path for Sector Ops, a step budget per mission.

## 5. Mission concepts (from part 3, original names; pick first prototypes)
Campaign: Dead Air (ghost, relay mast); Three Grey Coats (interrogate the right courier of three); Glass Floor (one in the
camera room guiding, swap midway); Two-Key Ledger (no kills, two keys turned at once); The Turning House (one moves
walls, one moves through); The Last Witness (interrogation works only with leverage found earlier); One Night Only
(opt-in, one attempt); Paper Trail (plant evidence, frame a rival); Lights Out Ward (kit confiscated, recover it).
Sector Ops: Split Shift (Team Ghost undetected upstairs, Team Shadow holds a power cut); Code Relay (interrogate a code,
the vault team enters it in 30 s); Scout Night / Strike Night (scouting opens routes for the strike); Shared Fuse (one
alarm meter for the site); The Guest List (one team in disguise inside, one in the grounds); Harbour Lights (three
simultaneous objectives, per-objective rules); Mole Hunt (each team holds half the clues, one interrogation); Hot
Extraction (ghost, then a planned lockdown and a two-route exfil).

## 6. Contradictions to settle (Michael)
G125 one fail rule vs strict ghost (two rules); LD 7.3 lethal viable vs no-kill missions; validator `players: [2]` vs
Sector Ops solo; LD 11 solo-first vs G253 co-op only; G108 objectives in menu vs G277 always-on list; timers banned vs
device windows; G157's 12 design-kit changes unreviewed; Marlow stripes / markers vs "no visual cues".

## 7. Next
Campus S1-S5 fixes and the S3 re-plan get planned against this framework with Michael's one-click sign-off. A mission
framework job (objective chains with branches / parallel tracks, rules per mission / team, interrogate-target objective,
validator objective + rule nodes) and the first two prototype missions follow his picks.
