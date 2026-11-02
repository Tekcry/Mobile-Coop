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
| - | Guard count | 20-30 per mission (about a Chaos Theory co-op level), typically 3-6 in an area, more in set pieces | N38 |
| - | Scope tiers | Approved as in `SCOPE.md` | N39 |
| P4 | Pillar 6 | "Sound and music" | N40 |
| P6b | Which ending | A, "Two switches" (`ENDING-DRAFT.md`) | N41 |
| - | Process | Guardrails `docs/RULES.md` (N44); fully fresh (N45); recipe replaces the level standard (N46); no docs-vs-docs check (N47); provisional until played (N48); prototype standard (N49); build order (N50) | N44-N50 |
| P7 | World and people | Hitman-style: context actions on people and objects, overheard talk that opens opportunities, world tricks; 1-3 unarmed staff per mission with routines; no disguises, no crowds | N37 |

## Open, in the order needed

| # | Decision | Options (cost) | Recommended | Needed by |
|---|---|---|---|---|
| D18 | Mission engine for the first playable area (pulled forward, N50) | Sector Ops engine (`sectors.ts`, `sectorMode.ts`, `game/mission/`: about 5,850 lines) / Marlow Yard course engine (`courseMode.ts`, `game/course/`: about 5,550 lines; has spotted-then-retry already) | Decide on code evidence when the area is planned | Before the first Mission 1 area |
| D31 | Mission 1 setting | The story plan's data centre / another site | Decide with the first area's plan | Before the first Mission 1 area |
| D32 | Engine hard test pass marks and test PCs | Frame rate, players, guards, split-screen and wrapper targets; which slower PC | Agree before the test starts | Before the engine hard test |
| D33 | Texture source | Generated in code / free CC0 libraries (each download asked first) / both | Both: generated first, CC0 where faster | Before the textures step |
| D53 | Vision v3 formal approval | Approve / change | Deferred (N50); it stays provisional | Phase 3 gate |
| D15b | Sonic identity | One sentence plus 3 reference tracks, Michael picks by ear | From music direction v3 | Music work |
| D34 | Co-op gates | Every section forces a two-person climb or throw (old bible P6, G292) / a mix of teamwork | Mix of teamwork, never a solo way through | Phase 4 |
| D35 | Cameras in the dark | Cameras see by infrared (G240) / darkness hides you from cameras too | Darkness hides you | Phase 3 |
| D36 | Forced kills, unavoidable guards (G127, G303) | Never force a kill, some guards unavoidable but a KO always works / every guard avoidable / the story may force one | Never force a kill; a KO always works | First mission plan |
| D37 | Context-action style (G19, G198 vs N37) | One button does the right thing / a hold opens a short action list | One button | Phase 4 |
| D38 | Partner outline through walls (old bible) | Keep, faint / compass mark only | Keep, faint | Phase 4 |
| D39 | Loud route | Required in every space (old standard) / where the space allows | Where the space allows | First mission plan |
| D40 | Radio crew (G112) | Keep Tally and Sexton beside LANTERN / LANTERN only | Keep | Story work |
| D41 | Aim assist on a pad (G16) | Off / on / an option | Decide with the feel tests | Phase 3 |
| D42 | Goggle glow on the in-game operators (G73) | Glow as on the menu Wren / none | Decide with the Mixamo look | Phase 3 |
| D43 | Third "electro" vision mode (G99) | Keep / drop | Decide with the vision-mode tests | Phase 3 |
| D50 | On-screen arcs when a guard notices you (old bible) | Keep / barks, body language and meters only | Decide in the feel tests | Phase 3 |
| D47 | "Reward stealth over shooting" ideas (G307) | Which of the 14 stand | Decide with the gear tests | Phase 4 |
| D49 | Rifle attachments (old bible) | Sniper, shotgun, launcher / a plain rifle | Decide with D9 | Phase 4 |
| D46 | Level checker (G284) | Keep, with the recipe's numbers / drop | Keep only checks that catch real problems | Phase 5 |
| D52 | A fun team move with no believable reason in the building | Drop the move / adjust the building | Adjust the building where it stays believable | Mission design |
| D44 | Lethal automatic defences (G128) | Allowed at military or private sites / never | Decide with the missions | Mission design |
| D51 | Fire alarm unlocking electric doors as a world trick | Allowed / not | Decide with the missions | Mission design |
| D48 | The two old campaign prototypes (G402) | Feed the new missions / drop | Decide with Mission 1 | Mission design |
| D45 | LAN play (G133) | Wanted / not | Not now (online and split-screen cover it) | Phase 10 |
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
| C10 | "As many guards as realistically possible" (G289) vs 2-5 per area (round 2) | N38 | 20-30 per mission, typically 3-6 per area |
| C11 | At most one hard rule per mission (research) vs up to 2, signposted (G290) | Master brief | Up to 2 |
| C12 | Escort objective type vs "no escort missions" | Master brief | No escort missions |
| C13 | Music timings: code G67 (Alert 10 s, Evasion 12 s, Cautious 8 s) vs brief 11 (Caution out after about 15 s, 1-2 bar tail) | Tuned with placeholder stems in Phase 4 | Brief targets |
| C14 | In-game voice and difficulty levels in the research | Vision | Voice outside the game; one difficulty |
| C15 | Mission 1 = Tallow Wharf or the data-centre night in old docs | N2 | Fresh design |
| C16 | "Mission 1 has no civilians" (G373, tied to Tallow Wharf) vs 1-3 staff per mission | N37 | Staff allowed; harming them costs rating |
| C17 | "Copy CT exactly" (old M20) in the movement research | Vision ("inspired by", our own ideas welcome) | CT numbers are targets, tuned by feel |
| C18 | No knife (old movement research) vs the paired knife kill | N2 | Paired knife kill |
| C19 | Night vision blooms to white in lit areas (CT) | Vision section 7 | Toned down, never blows out |
