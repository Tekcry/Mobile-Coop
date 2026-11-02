# Night Shift - decisions queue
Owner: the orchestrator. Status: current.

Decisions still to make, in the order the gates need them (master brief section 6), re-checked against the code, a
web check and the Hazelight research on 2026-11-02 (planning run). Michael answers through native multiple choice, up
to 4 per round, the recommendation first. Settled items keep one status line here; the decision itself, with its date
and reason, is in `DECISIONS-2026-11.md` (N numbers) until Phase 1 writes the new short decisions file.

## Settled
| # | Decision | Result | Source |
|---|---|---|---|
| D1 | Engine (provisional) | Stay on Babylon.js + TypeScript, wrapped with Electron for Steam; final after the Phase 2 kill criteria | N30 |
| D8 | Partner awareness | Compass bar: objective with distance, partner mark; no pause map | vision round 2 |
| D11 | Abilities | Same abilities for Wren and Moth; roles come from the situation (position, carried item, player-coloured target) and alternate beat to beat | N34 |
| D13 | Campaign size (provisional) | Target: prologue + 7 missions; final after the Mission 1 slice shows the real cost | N31 |
| D14 | Platforms | Windows on Steam first; Steam Deck a goal once measured on a real Deck; Mac and Linux later or never; phones for test launches only; the browser build stays for development and tests | N32 |
| D15a | Recurring music theme | A signature carried as sound and rhythm (no hummable tune; fits music direction v3) | N35 |
| D20 | Vision open items | Revive 30 s, twice per mission (team); breaking a mission rule restarts the section; Moth purple, Wren green; pistol hold-to-jam always carried; missions may limit gear | vision round 6 |
| - | Gear | Chosen per mission (overrides G134 / G153); EMP, noisemaker, proximity mine choosable again (the code's "EMP no longer carried", G152, changes in Phase 4) | vision rounds 3 and 5 |
| P1 | Chaos Theory footage in the repo | Removed: 30 comparison sheets under `docs/ct-prototype/shots/g8` (our own frames kept) | N33 |
| P3 | Story | Kept: Hollowmere, SUNDOWN, the nine nights, Wren and Moth (round 5: "if it makes sense"; it fits a fresh Mission 1) | vision round 5 |
| P6 | The ending | Written in Phase 1 with its early hints; stays co-operative (no player against player, G9) | N36 |
| P7 | World and people | Hitman-style: context actions on people and objects, overheard talk that opens opportunities, world tricks; 1-3 unarmed staff per mission with routines; no disguises, no crowds | N37 |

## Open, in the order needed

| # | Decision | Options (cost) | Recommended | Needed by |
|---|---|---|---|---|
| D15b | Sonic identity | One sentence plus 3 reference tracks, Michael picks by ear | From the approved v3 direction (`docs/audio/music-direction-v3.md`) | Phase 1 (vision v3 round) |
| P4 | Music as pillar 6 by name | "Sound and music" / keep "Sound" | "Sound and music" (brief section 3) | Phase 1 (vision v3 round) |
| D2 | Graphics API | WebGL2 only / WebGL2 default + WebGPU option / WebGPU only | WebGL2 default, WebGPU later (still behind a flag on the Deck's AMD Linux) | Phase 2 |
| D3 | Desktop wrapper | Electron / NW.js / Tauri | Electron (bundles Chromium; Tauri uses the system browser) | Phase 2 |
| D4 | Online transport | Own WebRTC + TURN + signalling everywhere / Steam Networking / Epic Online Services | Own WebRTC; the `Transport` interface already exists (`src/net/transport.ts`) | Phase 2 |
| D5 | Friend's Pass method | Free Demo-type Friend's Pass app, join-only, room code / Remote Play Together / free base + paid host DLC | Friend's Pass app (indie games already ship it this way on Steam); confirm the fee with Valve | Phase 8 (email Valve in Phase 2) |
| D6 | Split-screen timing | Now / after online works / never | Spike in Phase 2, real in Phase 4 | Phase 2 |
| D22 | Signalling and relay host | Trystero public relays + free TURN now / own Cloudflare Worker + Cloudflare TURN at release | As now; move only if joins fail; any paid tier needs a hard spend stop | Now / Phase 10 |
| D27 | Thermal through doors | A dim silhouette through a wooden door (CT shows it) / never (old A26) | Ask with a side-by-side in the Test Chamber | Phase 3 |
| D28 | Wall lean-out and the turn-and-aim from a wall | Keep both / remove (old M20 Q1) | Ask after the Mixamo wall poses exist | Phase 3 |
| D29 | Thermal palette | CT-like cold-to-hot ramp / a distinct white-hot palette | White-hot (safer and original) | Phase 3 |
| D7 | Online screen layout | Full screen each (CT) / always split (Hazelight) / full screen each with a partner view on demand or a small inset at holds and splits | Full screen each with a partner view on demand; render cost tested in Phase 2 | Phase 4 |
| D9 | Gear caps | Per-mission allowed list and caps / plus two kit slots that must differ between the players / a suggested split with free swaps | Allowed list + caps + slots that must differ (keeps "only you can do this half") | Phase 4 |
| D10 | Failure model test | Revive 30 s x2 (decided) / no revive limit, cost in noise, alert and rating (Hazelight) | Test both in the gym; Michael picks from the results | Phase 4 |
| D26 | Pause online | Pause freezes both players (Hazelight) / a menu that does not stop the world | Ask with the Phase 4 split-screen work | Phase 4 |
| D18 | Mission 1 engine | Trimmed Sector Ops engine (`src/game/sectors.ts`, `modes/sectorMode.ts`, `game/mission/`: about 5,850 lines, plus 2,700 lines of Tallow Wharf map) / Marlow Yard course engine (`modes/courseMode.ts` + `game/course/`: about 5,550 lines, plus 9,200 lines of Marlow Yard map) | Decide on code evidence, with the cost of each | Phase 5 |
| D19 | Level editor scope | Kestrel whole-game editor / minimal for Mission 1 / TS level files only | Minimal, time-boxed | Phase 5 |
| D25 | Checkpoint spacing | Area starts and before set pieces (vision) / plus a soft checkpoint at every 2-4 minute beat (Hazelight: rarely more than a minute lost) | Ask with the Phase 5 mission framework | Phase 5 |
| D12 | Joint approach choice | Adopt, at most one per mission, with a cheap echo next night / not now | Adopt as a "Should"; "Wren's way" vs "Moth's way" | Phase 7 |
| D16 | Voice | Text only / generated voices (disclosed) / volunteer actors | Text only; revisit after launch | Phase 7 |
| D30 | Optional side bits | Could (brief) / Should (players missed Split Fiction's dropped minigames) | Decide with real costs at the slice | Phase 7 |
| D23 | Public browser build after the store page | Keep it public / take it down or limit it to the Test Chamber / password it | Decide before the store page; the live site is the whole game today | Phase 8 |
| D24 | Public source code | Keep the repo public / make it private (GitHub Pages then needs a paid plan or another free host) | Decide before the store page, with the free-hosting options costed | Phase 8 |
| D17 | Difficulty and assists | One difficulty / one + assist options / several | One difficulty + the Hazelight assist set (research README, Adopt 18) | Phase 10 |

## Contradictions, each settled in one line
| # | Conflict | Settled by | Result |
|---|---|---|---|
| C1 | "No compass, minimap or blip" vs the vision's compass | D8 (Michael, round 2) | Compass |
| C2 | "Solo first" in the level standard | Already rewritten (`docs/level-design.md`: "completable by two and by no fewer") | Done |
| C3 | Fixed kits vs chosen gear | Michael, round 3 | Chosen |
| C4 | Response teams, alarm reinforcements, spawned guards in the research and the level standard | Michael (vision: never spawned) | Existing guards only; passages marked stale in Phase 1 |
| C5 | Mission length 10-30 / 30-60 / 20-30 min | Vision | 20-30 min |
| C6 | Pacing 2-3 / 5-8 vs 2-4 / 6-10 | Vision (`level-design.md` already matches) | 2-4 / 6-10 |
| C7 | Phones first class in the old movement docs | G12, G182, D14 | Phones launch-only for tests |
| C8 | Human ladder 4.1 m in code vs 4.5 m decided; lip band 4.3-4.5 m | G57 stands | Code catches up when the ledge relay is rebuilt (Phase 4) |
| C9 | FOV 86 in code vs CT about 75 | Not a conflict: 86 horizontal at 16:9 = 55.3 deg vertical; CT's 75 at its footage aspect = 55.7 deg vertical (`src/config/camera.ts`, `ct-measure-camera.md`) | No change; the thermal range table is recomputed at 86 |
| C10 | "As many guards as realistically possible" (G289) vs 2-5 per area | Vision (round 2) | 2-5 per area |
| C11 | At most one hard rule per mission (research) vs up to 2, signposted (G290) | Master brief | Up to 2 |
| C12 | Escort objective type vs "no escort missions" | Master brief | No escort missions |
| C13 | Music timings: code G67 (Alert 10 s, Evasion 12 s, Cautious 8 s) vs brief 11 (Caution out after about 15 s, 1-2 bar tail) | Tuned with placeholder stems in Phase 4 | Brief targets |
| C14 | In-game voice and difficulty levels in the research | Vision | Voice outside the game; one difficulty |
| C15 | Mission 1 = Tallow Wharf or the data-centre night in old docs | N2 | Fresh design |
| C16 | "Mission 1 has no civilians" (G373, tied to Tallow Wharf) vs 1-3 staff per mission | N37 | Staff allowed; harming them costs rating |
| C17 | "Copy CT exactly" (old M20) in the movement research | Vision ("inspired by", our own ideas welcome) | CT numbers are targets, tuned by feel |
| C18 | No knife (old movement research) vs the paired knife kill | N2 | Paired knife kill |
| C19 | Night vision blooms to white in lit areas (CT) | Vision section 7 | Toned down, never blows out |
