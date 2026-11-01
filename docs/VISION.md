# Night Shift - old vision

Owner: the orchestrator. Status: history.

**Replaced 2026-11-01:** see `docs/plan/DECISIONS-2026-11.md`. Citations: G numbers (`docs/DECISIONS.md`).

## 1. Pitch
- Pure Chaos Theory (CT) co-op at its core, with original names, story and characters (G1, G5, G6). Michael: "I want the game
  to be pure chaos theory." DECISIONS records the departures.
- Two NIGHT SHIFT operators have nine nights to stop SUNDOWN, a staged blackout of Hollowmere
  (`docs/story.md` 1).
- Light and shadow is the core: "like a showcase no matter where you look" (G316).
- Desktop PWA (G12), pad first, then keyboard and mouse (loco D1).
- The campaign recreates the CT co-op levels with original maps and story (G3).
- A prototype: no fine-tuning before Michael's `/preview/` playthrough; it decides what comes next (G421, G422).

## 2. Modes
| | Campaign | Marlow Yard (training) | Sector Ops |
| --- | --- | --- | --- |
| Players | Exactly 2, no bot (G2, G48) | 2 (G308) | 1-4, live when coop4 ships (G308, G381) |
| Maps | Marlow Yard prologue, then Mission 1 Tallow Wharf (G340, G371) | `ctcourse` | `campusOps` Saltmarsh Park S1-S5 (G328); `warehouseOps`, the old map, frozen (G390) |
| Prototypes | Three Grey Coats, Two-Key Ledger (G291, G402) | - | Split Shift, Code Relay (G291, G402) |
| Co-op need | A forced co-op traversal move every section (G292) | Forces each co-op move in turn; no coverage checks (G392) | Team doors with a solo route (G280) |
| Routes | Spine between sections, loops inside, 2+ per section (G285) | 1 forced route; splits late; side routes only for late enemy training (G292, G388) | 2-3 routes, parallel objectives (G190, G291) |
| Guidance | In-world only; hint layer off by default (G290) | Guidance marks and the objective list (G292) | As campaign |
| Strict rules | Up to 2, signposted, "ghost" is one; a break restarts the section (G290) | None: every failure is a retry (G370) | As campaign; global, per team or split (G291) |
| Timers | Soft windows only (G334) | Timed drills allowed (G342) | Soft windows only (G334) |
| Difficulty | Rookie, Normal, Realistic, Perfectionist; host picks (G106, G131) | As campaign | Fixed per op, stars; a higher clear fills the lower (G331) |
| Guards | Cap 32 alive (G359); no heavies or dogs (G155) | Armed; only what each lesson needs (G298, G376) | S1-S5: 15 / 18 / 20 / 25 / 26 for 1-2 players, 3-4 add tagged extras (G328, G331, G362); cap 32 (G332); dogs (G348), late armour, riot shields (G297, G307) |
| Downed | 30 s revive, twice per mission (G126) | As campaign (G349); a checkpoint restart is a full reset (G312) | Syringes; unreached 30 s: dead till the next section door (G188, G385) |
| Light | Real-world lux bands, AS/NZS (G329, G368) | Lit, players cut it (G279) | As campaign (G297) |

Helmets (campaign, Sector Ops): always on Realistic and Perfectionist, cannot be shot off on Perfectionist; Rookie and
Normal: alarm stages only (G350).

## 3. Main Michael overrides of CT (full list: DECISIONS)
- Revive and encounter checkpoints (G126); partner beacon and world pings (G135); both players extract (G138); the
  perfect rating (G146); any partner rejoins a saved mission (G147).
- Selection wheel (weapon, gadget, vision) on LB hold, no time slow (G181, G192).
- Movement and animation follow a trained operator, not CT footage (G210, G243).
- Cameras see by IR; a faint red laser grid shows what they watch (G240, G222). Every guard is armed (G298).
- One realistic lighting system with real-time character shadows (G315, G316).
- Hardened lit choke points allowed, with a route around (G333).
- Static lookouts on high routes, paired patrols (G335); realistic hearing and radio (G299, G300).
- Sector Ops rewards stealth over shooting as sections get harder (G307).
- Co-op traversal kit: boost, gap throw, human ladder / pull-up, shutter or door hold, rope brace / descent, vent unlock,
  Deadweight, Drop Catch, Chimney Pair, Swing Pass, Plank Bridge (G293, G403).
- Objectives: short, plain, what and where; shown on update or a tap of View / O (G343, G351).
- One Hand-made / CMU / Mixamo animation toggle, each player drawn with his own (G410, G411); full detail art (G309).

## 4. Ten hard rules (the tie-breakers)
1. Light parity: picture, meter and guard perception agree, character shadows included; a cast shadow is a faint cue
   to guards (bible P1, G352, G379; not built yet).
2. Real-site light, every light working; stealth comes only from real gaps and lights the players cut or shoot
   (G295, G329, G367).
3. A perfect rating is always possible: no kills, no alarms, every primary objective (G146).
4. No mission forces a kill (G127; piano escape excepted, G426).
5. No maps, minimap, compass or objective blip in any mode; no markers in the campaign and Sector Ops (Marlow Yard keeps
   its guidance marks, G292). Objectives "must name what and where"; light language and landmarks guide (G290, G336,
   G339).
6. In the campaign and Sector Ops no countdown closes a route (G334); Marlow Yard may use timed drills (G342).
7. The campaign cannot be completed solo (G2, G292).
8. Fixed patrols, no randomness that defeats planning; every detection explainable (bible P5, G143).
9. As many guards as realistically possible, with room to manoeuvre (G289, G190; Marlow Yard: G376).
10. Gameplay never reads graphics settings (bible 8); a guard whose shadow falls in view animates like one on screen
    (G327, G382).

## 5. Build gates
- Measured validator pass at greybox exit (G289); bot route-runs that never get stuck, then a 10-min walk card (G330,
  G372).

## 6. Never, parked
- Never: reference-game names (G6), player-versus-player, a bot partner (G8, G48), difficulty sliders (G106), voxels
  (G282).
- Parked: Hunter (G7) and the old Mission mode, behind `?legacy=1`.

## 7. Where to look next
ROADMAP (origin/feature/menu): built, open. DECISIONS: why. Bible: systems. `docs/level-design.md`: maps.
`docs/RULES.md`: process.
