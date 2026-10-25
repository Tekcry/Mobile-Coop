# Night Shift - vision (read this first)

Owner: the orchestrator; updated at every DECISIONS fold. Read from origin/master. Citations: `docs/DECISIONS.md`
(G283-G343 land with #386 / #396) or ROADMAP "Decided" 2026-10-25 by time. A newer Michael decision wins.

## 1. Pitch
- Pure Chaos Theory (CT) co-op at its core, with original names, story and art (G1, G5, G6). Michael: "I want the game
  to be pure chaos theory." His decisions below are the only departures.
- Two operators of the unit NIGHT SHIFT have nine nights to stop SUNDOWN, a staged blackout of Hollowmere
  (`docs/story.md` 1).
- Light and shadow is the core: "like a showcase no matter where you look" (G316).
- Desktop PWA, pad first, then keyboard and mouse (G12).
- The campaign recreates the experience of the CT co-op levels with original maps and story (G3).
- Current focus: `docs/ROADMAP.md` "Now" on origin/feature/menu. The 2026-10-19 "Current goal" (basic training level first, visual pass last) is replaced by G288 and G309.

## 2. Modes
| | Campaign | Marlow Yard (training) | Sector Ops |
| --- | --- | --- | --- |
| Players | Exactly 2, no bot (G2, G48) | 2 (G308) | 1-4 (G308) |
| Maps | Mission 1 Tallow Wharf (G340; name from the mission-framework PLAN) | `ctcourse` | `campusOps` Saltmarsh Park S1-S5 (G328); `warehouseOps` the old map, still selectable (G298) |
| Prototypes | Three Grey Coats, Two-Key Ledger (G291) | - | Split Shift, Code Relay (G291) |
| Co-op need | A forced co-op traversal move every section (G292) | Teaches the co-op basics (G292) | Team doors with a solo route (G280) |
| Routes | Spine between sections, loops inside, 2+ per section (G285) | 1 route; splits late, as teaching (G292) | 2-3 routes, parallel objectives (G190, G291) |
| Guidance | In-world only; hint layer off by default (G290) | Guidance marks and the objective list (G292) | As campaign |
| Strict rules | Up to 2, signposted, "ghost" is one; a break restarts the section (G290) | Not set | As campaign; global, per team or split (G291) |
| Timers | Soft windows only (G334) | Timed drills allowed (G342) | Soft windows only (G334) |
| Difficulty | CT fixed levels, host picks (G106, G131) | As campaign | Fixed per op, stars; a higher clear fills the lower (G331) |
| Guards | No heavies or dogs (G155); harder difficulties always have helmets, on the hardest they cannot be shot off; alarm-stage helmets on easier (G341) | Normal, armed (G279, G298) | S1-S5: 15 / 18 / 20 / 25 / 26, cap 32 (G328, G332); guards, reinforcements, syringes scale with players (G331); dogs, late armour, riot shields (G297, G307); harder difficulties always have helmets, on the hardest they cannot be shot off (G338) |
| Downed | 30 s revive, twice per mission (G126) | Checkpoint restart is a full reset (G312) | Revive syringes, no lives (G188) |
| Light | Real-world lux bands (G329) | Lit, players cut it (G279) | Lit like a real site, lux bands (G297, G329) |

## 3. Michael's overrides of CT
- Selection wheel for weapon, gadget and vision on LB hold, no time slow (G181, G192).
- Cameras see by IR; a faint red laser grid shows what they watch (G240, G222).
- One realistic lighting system with real-time character shadows (G315, G316).
- Hardened lit choke points allowed, with a route around (G333).
- Static lookouts on high routes, paired patrols (G335); realistic hearing and radio (G299, G300).
- Sector Ops rewards stealth over shooting as sections get harder (G307).
- Co-op traversal kit: boost up a wall, throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace /
  descent, vent unlock for the partner (G293).
- Objectives: short plain English, fade in and out; a tap on View (Select) or O shows the current one ~5 s; it shows on
  every update (G343).
- CMU mocap on by default (G264, G298). Refining and full detail art allowed (G288, G309).

## 4. Ten hard rules (the tie-breakers)
1. Light parity: picture, meter and guard perception agree (bible P1).
2. Players make shadows from real gaps and cut lights; lit places stay lit (G295, G329).
3. A perfect rating is always possible: no kills, no alarms, every primary objective (G146).
4. No mission forces a kill (G127).
5. No maps, markers, minimap, compass or objective blip in any mode. Objectives "must name what and where"; text names
   places and leads; light language and landmarks guide (G290, G336, G339).
6. No countdown closes a route (G334).
7. The campaign cannot be completed solo (G2, G292).
8. Fixed patrols, no randomness that defeats planning; every detection explainable (bible P5, G143).
9. As many guards as realistically possible, with room to manoeuvre (G289, G190).
10. Gameplay never reads graphics settings (bible 8).

## 5. Build gates
- Measured validator pass at greybox exit (G289); bot route-runs, then a 10-min walk card (G330).
- A guard whose shadow is in view counts as seen (G327).

## 6. Never, parked
- Never: reference-game names (G6), player-versus-player, a bot partner (G8, G48), difficulty sliders (G106), voxels
  (G282).
- Parked: Hunter (G7) and the old Mission mode, behind `?legacy=1`.

## 7. Where to look next
ROADMAP (origin/feature/menu): what is built, open questions. DECISIONS: why, what changed. Bible: systems.
`docs/level-design.md`: map rules. `docs/RULES.md`: process.
