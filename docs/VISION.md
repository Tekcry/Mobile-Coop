# Night Shift - vision (read this first)

Owner: the orchestrator; updated at every DECISIONS fold (G344). Status: current.
Read from origin/master. Citations: G numbers in `docs/DECISIONS.md`, or ROADMAP "Decided" by date and time. A newer
Michael decision wins.

## 1. Pitch
- Pure Chaos Theory (CT) co-op at its core, with original names, story and art (G1, G5, G6). Michael: "I want the game
  to be pure chaos theory." His recorded decisions (DECISIONS) are the departures.
- Two NIGHT SHIFT operators have nine nights to stop SUNDOWN, a staged blackout of Hollowmere
  (`docs/story.md` 1).
- Light and shadow is the core: "like a showcase no matter where you look" (G316).
- Desktop PWA (G12), pad first, then keyboard and mouse (loco D1).
- The campaign recreates the CT co-op levels with original maps and story (G3).
- Current goal: Marlow Yard, the Sector Ops campus and Tallow Wharf in parallel, each under its own lead, after a
  plan-only conformance review of every map and feature against these docs (G347, G355); order: ROADMAP "Now".

## 2. Modes
| | Campaign | Marlow Yard (training) | Sector Ops |
| --- | --- | --- | --- |
| Players | Exactly 2, no bot (G2, G48) | 2 (G308) | 1-4 (G308) |
| Maps | Mission 1 Tallow Wharf (G340) | `ctcourse` | `campusOps` Saltmarsh Park S1-S5 (G328); `warehouseOps`, the old map (G298) |
| Prototypes | Three Grey Coats, Two-Key Ledger (G291) | - | Split Shift, Code Relay (G291) |
| Co-op need | A forced co-op traversal move every section (G292) | Teaches the co-op basics (G292) | Team doors with a solo route (G280) |
| Routes | Spine between sections, loops inside, 2+ per section (G285) | 1 route; splits late, as teaching (G292) | 2-3 routes, parallel objectives (G190, G291) |
| Guidance | In-world only; hint layer off by default (G290) | Guidance marks and the objective list (G292) | As campaign |
| Strict rules | Up to 2, signposted, "ghost" is one; a break restarts the section (G290) | None early; one taught late (G357) | As campaign; global, per team or split (G291) |
| Timers | Soft windows only (G334) | Timed drills allowed (G342) | Soft windows only (G334) |
| Difficulty | Rookie, Normal, Realistic, Perfectionist; host picks (G106, G131) | As campaign | Fixed per op, stars; a higher clear fills the lower (G331) |
| Guards | Cap 32 alive (G359); no heavies or dogs (G155) | Normal, armed (G279, G298) | S1-S5: 15 / 18 / 20 / 25 / 26 for 1-2 players, 3-4 add tagged extras (G328, G331, G362); cap 32 (G332); dogs (G348), late armour, riot shields (G297, G307) |
| Downed | 30 s revive, twice per mission (G126) | As campaign (G349); a checkpoint restart is a full reset (G312) | Revive syringes, no lives (G188) |
| Light | Real-world lux bands (G329) | Lit, players cut it (G279) | Lit like a real site, lux bands (G297, G329) |

Helmets, campaign and Sector Ops: always on Realistic and Perfectionist, not shot off on Perfectionist; on Rookie and
Normal only at alarm stages (G350; bible 5.6).

## 3. Main Michael overrides of CT (full list: DECISIONS)
- Revive and encounter checkpoints (G126); partner beacon and world pings (G135); both players extract (G138); the
  perfect rating (G146); any partner rejoins a saved mission (G147).
- Selection wheel for weapon, gadget and vision on LB hold, no time slow (G181, G192).
- Movement and animation follow a real-world trained operator, not CT footage (G210, G243).
- Cameras see by IR; a faint red laser grid shows what they watch (G240, G222). Every guard is armed (G298).
- One realistic lighting system with real-time character shadows (G315, G316).
- Hardened lit choke points allowed, with a route around (G333).
- Static lookouts on high routes, paired patrols (G335); realistic hearing and radio (G299, G300).
- Sector Ops rewards stealth over shooting as sections get harder (G307).
- Co-op traversal kit: boost up a wall, throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace /
  descent, vent unlock for the partner (G293).
- Objectives: short plain English, what and where, fading in on every update and on a tap of View (Select) or O
  (G343, G351).
- CMU mocap on by default (G264, G298). Refining and full detail art allowed (G288, G309).

## 4. Ten hard rules (the tie-breakers)
1. Light parity: picture, meter and guard perception agree, character shadows included (bible P1, G352; character
   shadows not built yet).
2. Sites are lit like real sites. Stealth comes from real gaps and from lights the players cut or shoot, never from
   leaving places unlit (G295, G329).
3. A perfect rating is always possible: no kills, no alarms, every primary objective (G146).
4. No mission forces a kill (G127).
5. No maps, minimap, compass or objective blip in any mode; no markers in the campaign and Sector Ops (Marlow Yard keeps
   its guidance marks, G292). Objectives "must name what and where"; light language and landmarks guide (G290, G336,
   G339).
6. In the campaign and Sector Ops no countdown closes a route (G334); Marlow Yard may use timed drills (G342).
7. The campaign cannot be completed solo (G2, G292).
8. Fixed patrols, no randomness that defeats planning; every detection explainable (bible P5, G143).
9. As many guards as realistically possible, with room to manoeuvre (G289, G190).
10. Gameplay never reads graphics settings (bible 8); a guard whose shadow falls in view animates at full rate (G327).

## 5. Build gates
- Measured validator pass at greybox exit (G289); bot route-runs, then a 10-min walk card (G330).

## 6. Never, parked
- Never: reference-game names (G6), player-versus-player, a bot partner (G8, G48), difficulty sliders (G106), voxels
  (G282).
- Parked: Hunter (G7) and the old Mission mode, behind `?legacy=1`.

## 7. Where to look next
ROADMAP (origin/feature/menu): what is built, open questions. DECISIONS: why, what changed. Bible: systems.
`docs/level-design.md`: map rules. `docs/RULES.md`: process.
