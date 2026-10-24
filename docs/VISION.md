# Night Shift - vision (read this first)

Owner: the orchestrator; updated at every DECISIONS fold. Read from origin/master. Last updated 2026-10-25 ~10:30.
Every rule cites a G entry in `docs/DECISIONS.md` (G283-G323 land with PR #386) or a ROADMAP "Decided" entry by date.
Where this page and a newer Michael decision differ, the decision wins and this page is fixed.

## 1. Pitch
- An original third-person stealth game that is pure Chaos Theory (CT) co-op at its core: CT's mechanics, timing,
  camera, HUD layout and look, with original names, story and art (G1, G5, G6). Michael: "I want the game to be pure
  chaos theory." His recorded decisions below are the only departures.
- Story: two operators of the deniable unit NIGHT SHIFT have nine nights to stop SUNDOWN, a staged blackout of the port
  city of Hollowmere. The team that lives in shadow has to keep the lights on (`docs/story.md` 1, G124, G136).
- Light and shadow is the core. Michael: "like a showcase no matter where you look" (G316).
- Desktop only: an installable PWA, pad first, then keyboard and mouse (G12). Today's goal: Marlow Yard fully playable
  by two players end to end (CLAUDE.md "Current goal").

## 2. Modes
| | Campaign | Marlow Yard (training) | Sector Ops |
| --- | --- | --- | --- |
| Players | Exactly 2, never solo, no bot (G2, G48) | 2 (G308) | 1-4, solo always possible (G308, G280) |
| Maps | Tallow Wharf, a new small map for the first prototypes (G293); Kestrel paused (G53) | `ctcourse` (Course mode) | `campusOps` Saltmarsh Park S1-S5 (G295, G297); `warehouseOps` legacy, selectable (G298) |
| Co-op need | Every section forces a co-op traversal move, no solo bypass (G292, G293) | Teaches the co-op basics (G292) | Team doors are true 2-player paths; a solo route stays (G280) |
| Routes | Linear spine between sections, loops inside; 3 routes per guarded space (dark / high / loud), 2+ per section (G284, G285, G292) | Very linear, 1 route; split paths only in later sections, as teaching (G292) | 2-3 routes (G190); parallel objectives for teams, or one player doing them all (G291) |
| Guidance | No markers, no maps; optional hint layer, off by default (G290, Decided 2026-10-25 ~09:45) | Guidance marks and an always-on objective list (G277, G292) | As campaign |
| Strict rules | Up to 2, signposted, "ghost" counts as one; breaking one = section restart (G290) | Not set | As campaign; global, per team or split (G291) |
| Difficulty | CT fixed levels, host picks one per session; scales perception, alert tolerance, resources, never sync windows (G106, G131) | As campaign | Fixed levels per op as stars; a clear on tier N fills every star below it (G189, Decided 2026-10-25 ~09:45) |
| Guards | No heavies or dogs; armour and helmets come with alarm stages (G155) | Normal guards, all armed (G279, G298) | Signed off S1 15, S2 18, S3 20, S4 25, S5 26, cap 32 alive (G187, Decided 2026-10-25 ~08:50); scale with player count (Decided ~09:45); dogs, late armour, riot shields in response teams (G297, G307); helmets by difficulty (Decided ~10:20); some guards unavoidable (G303) |
| Downed | Partner revives within 30 s, twice per mission; both down = last checkpoint (G126) | Checkpoint restart is a full reset (G312) | No lives: revive syringes; solo or both down = last checkpoint (G188) |
| Light | Real-world lux bands per space type (Decided 2026-10-25 ~09:05) | Lit by default, players cut it, mixed zones where they play better (G279) | Lit like a real site (G297) plus the lux bands; S1 car park first |

## 3. CT is the default; Michael's overrides
- Selection wheel for weapon, gadget and vision mode on LB hold, no time slow (G181, G192).
- A faint red laser grid shows what a camera watches, stronger in electro (G222).
- Cameras see in the dark by IR on every map; cutting lights beats guards, never cameras (G240, G298).
- 30 s revive and encounter checkpoints; partner beacon and world pings, no partner marker; both players extract; any
  partner joins a saved mission (G126, G135, G138, G147).
- One realistic lighting system: inverse-square falloff, soft edges, real-time character shadows near the players
  (G315, G316).
- Sites are lit as real sites are. Stealth comes from real gaps (between poles, under carports, cut circuits, shot
  lamps), never from leaving lit places unlit (G295, Decided 2026-10-25 ~09:05).
- Hardened lit choke points are allowed everywhere: un-shootable fixtures, guarded or locked breakers; a route around
  stays (Decided 2026-10-25 ~09:45).
- Sector Ops: a mode of its own, 1-4 players, a corporate research campus, 30-45 min a run (G185, G297, G308).
- Up to 2 strict rules per mission; breaking one restarts the section, the mission continues (G290).
- No maps at all: no briefing map, no field-menu map, no minimap, compass or objective blip (Decided 2026-10-25 ~09:45,
  ~10:20).
- Soft time windows only: shift changes, fixed patrol cycles, signposted in the world (Decided 2026-10-25 ~09:45).
- Static lookouts on some high routes and paired patrols that check on each other; guards still see poorly above (G44,
  Decided 2026-10-25 ~09:45).
- Guards: realistic hearing, wake KO'd guards, report bodies, staggered radio, smart and tactical, aggressive
  reinforcements; all armed (G298, G299, G300).
- Sector Ops rewards stealth over shooting as sections get harder: bulletproof cameras, body armour, riot shields in
  response teams, no ammo inside a section and one crate refill per player between sections (G307).
- Helmets by difficulty: "harder difficulties always have helmets, and hardest difficulty you can't shoot the helmet
  off" (Decided 2026-10-25 ~10:20).
- CMU mocap allowed and on by default (G264, G298). Realistic look everywhere, no voxels (G68, G282).
- Refining is allowed, paced by the walk cap and the one-click sign-off (G288). Full detail art (G278, G309).

## 4. Ten hard design rules (the tie-breakers)
1. Light parity: what the player sees, the light meter and guard perception agree at every preset (bible P1, L1-L5).
2. Light is the core: real gaps, and players make their own shadows by cutting lights (G295, G316).
3. A perfect rating is always possible: no kills, no alarms, every primary objective; ghosting always works (G146, G127).
4. No mission forces a kill; an unavoidable guard can be distracted or knocked out (G127, G303).
5. No maps, markers or minimap. Objectives "must name what and where", and the level flows to them (Decided 2026-10-25
   ~09:45). Marlow Yard is the one exception (G292).
6. No forced timers: soft windows only, no countdown that closes a route (Decided 2026-10-25 ~09:45).
7. The campaign cannot be completed solo; every section needs the pair (G2, G292).
8. Guards are readable and fair: fixed patrols, no randomness that defeats planning; after any detection the players can
   say why (bible P5, G143).
9. As many guards as realistically possible, with room to manoeuvre and every route passable (G289, G190).
10. Desktop only, pad first; gameplay never reads graphics settings (G12, bible 8).

## 5. Never / removed
- Reference-game character, gear or organisation names, art, logos or music (G5, G6). "Chaos Theory" / "CT" may be named.
- Later-series systems (snap cover, marked executions, sonar), except the selection wheel (G181, bible 6).
- Player-versus-player, Wave, a traitor finale, a bot partner (G8, G9, G48).
- Maps, minimap, compass, waypoints and objective blips, in every mode (Decided 2026-10-25 ~09:45, ~10:20).
- Difficulty sliders and the alarm-tolerance setting; failing a mission on an alarm count (G106, G125).
- Random patrols, kill cams, monetisation (bible 6). Voxels, phone and touch play (G282, G12).

## 6. Changed in the last 7 days (old -> new)
- 10-23: Sector Ops 2 players max (G50) -> up to 4 (G308). Warehouse, 3 sections (G186) -> campus, 5 sections (G295).
- 10-23: mocap behind a toggle, off (G264) -> on by default (G298). Lamp falloff toggle (G314) -> one system (G316).
- 10-24 ~21:50: no fine tuning until the loop plays (G179) -> refining allowed (G288).
- 10-24 ~22:12: at most one hard rule (G125) -> up to 2 strict rules, section restart (G290).
- 10-24 ~22:45: Marlow's stripes go (~22:12) -> Marlow keeps its guidance and one route (G292).
- 10-25 ~09:05: dark by default, 40-60% floor in shadow (G284) -> real-world lux bands; shadow share yields.
- 10-25 ~09:45: every lit space has 2 ways to change the light (bible L8) -> hardened choke points allowed.
- 10-25 ~09:45: briefing map and field-menu map (bible 3, 5.10) -> no maps at all; ~10:20 minimap parked -> removed.
- 10-25 ~09:45: no timers in stealth -> soft windows allowed, still no route-closing countdown.
- 10-25 ~09:45: G11's cut of paired behaviour -> lookouts and paired patrols.
- 10-25 ~09:45: finishing an op fills its star (G189) -> a higher clear fills the lower stars too.
- Helmets: first headshot knocks it off (G307) -> ~09:45 "Keep CT way" (G155) -> ~10:20 by difficulty.

## 7. Open questions
- Which map is "the first campaign level" (bible 7, G224)? Tallow Wharf is a prototype map (G293); Kestrel is paused
  (G53); story Mission 1 is still Dead Line at Cinder Yard (`docs/story.md` 6.1).
- Helmets in the campaign: CT alarm-stage helmets plus the difficulty rule is assumed, undoable (Decided 2026-10-25
  ~10:20).
- Timed drills: Marlow's "timed isolation of lights" and "timed jammer exercises" (G272, G279) and Code Relay's 30 s
  window vs soft windows only. Marlow Build re-plans the window rules (Decided 2026-10-25 ~10:20).
- Campaign objectives: in the menu (G108) or an always-on list as in Marlow (G277)?

## 8. Where to look next
- What is being built: `docs/ROADMAP.md` on origin/feature/menu.
- Why: `docs/DECISIONS.md`. System detail: `docs/design-bible.md`. Story and text: `docs/story.md`.
- Map rules: `docs/level-design.md`. Process: `docs/RULES.md` and CLAUDE.md "Sessions".
