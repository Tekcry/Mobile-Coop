# Night Shift - decisions queue
Owner: the orchestrator. Status: current.

Decisions still to make, in the order the gates need them (master brief section 6), re-checked against the code and a
web check on 2026-11-02 (planning run). Michael answers through native multiple choice, up to 4 per round, the
recommendation first. Answers move to the decisions file with the date and a one-line reason; this file keeps only
what is open, plus the status line of what was settled here.

## Already settled by Michael (record only, no question)
- **D8 Partner awareness:** compass bar with the objective, its distance and the partner's mark; no pause map
  (vision workshop round 2, 2026-11-01). Replaces the old "no compass, minimap or blip" rule (G290, G336, G339) and
  the goggle-colour beacons as the only partner mark (G135).
- **D20 Vision open items** (round 6, recorded in `CLEANUP-PLAN-2026-11-01.md`): revive window 30 s, twice per
  mission (team total; matches `src/game/reviveClock.ts`); breaking a mission rule restarts the section; Moth's
  colour is purple (Wren green; `docs/story.md` already says so, G196); the pistol hold-to-jam is always carried;
  missions may limit gear. D10 (Phase 4) may still bring a revive alternative back to him if playtests ask for it.
- **Gear chosen per mission** (round 3, overrides G134 / G153 fixed kits); EMP, noisemaker and proximity mine are
  choosable again (round 5), so the code's "EMP no longer carried" (G152, `src/game/gadgets.ts`) changes in Phase 4.
  Caps and allowed lists stay D9.

## Open, in the order needed

| # | Decision | Options (cost) | Recommended | Needed by | Status |
|---|---|---|---|---|---|
| D1 | Engine and stack | Stay Babylon 9 / TS + Electron (no rewrite) / Godot 4.7 (rewrite everything: movement, AI, co-op, tests) / Unreal 5 (rewrite; binary assets hard for Claude Code) | Stay, confirmed by the Phase 2 spike with written kill criteria. Babylon ships monthly (9.29, Oct 2026); Godot 4.7 + GodotSteam stay the fallback | Phase 1 provisional, Phase 2 final | asking |
| D11 | Abilities | Identical core verbs; asymmetry from gear and situation (current code) / per-mission asymmetric abilities (Hazelight) | Waits for the Hazelight research (N29) | Phase 1 | asking after research |
| D13 | Campaign size | Minimum: prologue + 5 missions (about 3 h) / Target: prologue + 7 (about 4 h) / Stretch: prologue + 9, one per night (about 5 h) | Plan for Target; commit after the vertical slice shows the real cost per mission. CT's top complaint was a short campaign | Phase 1 provisional, Phase 7 final | asking |
| D14 | Platforms | Windows on Steam first; Steam Deck "Playable" as a goal; Linux and Mac later or never; phones dev-only; the browser build stays for development and tests | As stated; the Deck goal holds only once measured on a real Deck | Phase 1 | asking |
| D15 | Music identity | See P5 below; the identity sentence and the recurring theme | Keep the approved v3 direction (`docs/audio/music-direction-v3.md`) and add one recurring signature carried as sound and rhythm | Phase 1 identity, Phase 7 pick | asking |
| D2 | Graphics API | WebGL2 only / WebGL2 default + WebGPU option / WebGPU only | WebGL2 default, WebGPU later (still behind a flag on the Deck's AMD Linux) | Phase 2 | open |
| D3 | Desktop wrapper | Electron / NW.js / Tauri | Electron (bundles Chromium; Tauri uses the system browser) | Phase 2 | open |
| D4 | Online transport | Own WebRTC + TURN + signalling for both builds / Steam Networking / Epic Online Services | Own WebRTC everywhere; the `Transport` interface already exists | Phase 2 | open |
| D5 | Friend's Pass method | Free Demo-type Friend's Pass app, join-only, room code / Remote Play Together / free base + paid host DLC | Friend's Pass app; indie games already ship it this way on Steam; confirm the fee with Valve | Phase 8 (email Valve in Phase 2) | open |
| D6 | Split-screen timing | Now / after online works / never | Spike in Phase 2, real in Phase 4 | Phase 2 | open |
| D22 | Signalling and relay host | Trystero public relays + free TURN (now) / own Cloudflare Worker + Cloudflare TURN (release) | Now as is; move only if joins fail; any paid tier needs a hard spend stop | Now / Phase 10 | open |
| D7 | Online screen layout | Full screen each (CT) / always split (Hazelight) / player option | Full screen each; local split only (revisit with the Hazelight research) | Phase 4 | open |
| D9 | Gear caps | Per-mission allowed list and caps; the briefing suggests a split | As stated | Phase 4 | open |
| D10 | Failure model test | Revive 30 s x2 (decided) vs an alternative if playtests ask | Test in the Test Chamber gym | Phase 4 | open |
| D18 | Mission 1 engine | Trimmed Sector Ops engine (`src/game/sectors.ts`, `modes/sectorMode.ts`, `game/mission/`: about 5,850 lines, plus 2,700 lines of Tallow Wharf map) / Marlow Yard course engine (`modes/courseMode.ts` + `game/course/`: about 5,550 lines, plus 9,200 lines of Marlow Yard map) | Decide on code evidence, with the cost of each | Phase 5 | open |
| D19 | Level editor scope | Kestrel whole-game editor / minimal for Mission 1 / TS level files only | Minimal, time-boxed | Phase 5 | open |
| D12 | Joint approach choice | Adopt, at most one per mission / not now | Adopt as a "Should" in the Mission 1 paper design | Phase 7 | open |
| D16 | Voice | Text only / generated voices (disclosed) / volunteer actors | Text only; revisit after launch | Phase 7 | open |
| D23 | Public browser build after the store page | Keep the free web build public / take it down or limit it to the Test Chamber / password it | Decide before the store page; the live site is the whole game today | Phase 8 | new |
| D24 | Public source code | Keep the repo public / make it private (GitHub Pages then needs a paid plan or another free host) | Decide before the store page, with the free-hosting options costed | Phase 8 | new |
| D17 | Difficulty and assists | One difficulty / one + assist options / several | One difficulty + accessibility options | Phase 10 | open |

## New items from the planning run (Phase 1)
- **P1 Chaos Theory footage frames in the repo:** 55 research images under `docs/ct-prototype/shots` hold CT game
  footage beside our frames; the repo is public. Options: remove from the current files (git history keeps them) /
  keep. Recommended: remove (CLAUDE.md: never CT's art assets).
- **P2 Generated assets in the credits:** add a "Made in the repo" section (models, score, hand-made clips, icons; the
  script; whether AI tools made it). This is the brief's own rule (section 4), so no question.
- **P3 Story kept:** Hollowmere, SUNDOWN, the nine nights, Wren and Moth, with Mission 1 a fresh design (brief 12).
- **P4 Music as pillar 6 by name** ("Sound and music") - brief section 3 asks this in Phase 1.
- **P5 Recurring theme vs v3:** the approved v3 direction says "no hummable lead line, ever"; the brief asks for one
  recurring main theme. Options: a signature carried as sound and rhythm (fits v3) / a hummable melody / none.

## Contradictions, each settled in one line
| # | Conflict | Settled by | Result |
|---|---|---|---|
| C1 | "No compass, minimap or blip" vs the vision's compass | D8 (Michael, round 2) | Compass |
| C2 | "Solo first" in the level standard | Already rewritten (`docs/level-design.md`: "completable by two and by no fewer") | Done |
| C3 | Fixed kits vs chosen gear | Michael, round 3 | Chosen |
| C4 | Response teams, alarm reinforcements, spawned guards in the research and the level standard | Michael (vision: never spawned) | Existing guards only; mark the passages stale in Phase 1 |
| C5 | Mission length 10-30 / 30-60 / 20-30 min | Vision | 20-30 min |
| C6 | Pacing 2-3 / 5-8 vs 2-4 / 6-10 | Vision (`level-design.md` already matches) | 2-4 / 6-10 |
| C7 | Phones first class in old movement docs | G12, G182, D14 | Phones launch-only for tests |
| C8 | Human ladder 4.1 m in code vs 4.5 m decided; lip band 4.3-4.5 m | G57 stands | Code catches up when the ledge relay is rebuilt (Phase 4) |
| C9 | FOV 86 in code vs CT about 75 | Not a conflict: 86 is horizontal at 16:9 = 55.3 deg vertical; CT's 75 at its footage aspect = 55.7 deg vertical (`src/config/camera.ts`, `ct-measure-camera.md`) | No change |
| C10 | "As many guards as realistically possible" (G289) vs 2-5 per area | Vision (round 2) | 2-5 per area |
| C11 | At most one hard rule per mission (research) vs up to 2, signposted (G290) | Master brief | Up to 2 |
| C12 | Escort objective type vs "no escort missions" | Master brief | No escort missions |
| C13 | Music timings: code G67 (Alert 10 s, Evasion 12 s, Cautious 8 s) vs brief 11 (Caution out after about 15 s, 1-2 bar tail) | Tuned with placeholder stems in Phase 4 | Brief targets |
| C14 | In-game voice and difficulty levels in the research | Vision | Voice outside the game; one difficulty |
| C15 | Mission 1 = Tallow Wharf or the data-centre night in old docs | N2 | Fresh design |
