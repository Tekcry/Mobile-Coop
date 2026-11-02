# Night Shift - risk register
Owner: the orchestrator. Status: current.

Started in the planning run (2026-11-02) from master brief section 15, plus what the planning run found in the code,
the docs and a web check. Review at every gate: close what is done, add what the gate found. Newest findings last in
each group. "Phase" = when the mitigation is due.

## Technology and platform

| Risk | Early warning | Mitigation | Phase |
|---|---|---|---|
| Internet co-op unreliable (already happened) | Failed joins in tests, the connection log | TURN relay + clear failure dialogs (done, #748); network-sim tests; two-home test every gate; own signalling only if joins fail (D22) | 0 done, every gate |
| Browser stack too slow (shadowed lights, split-screen, Steam Deck) | Phase 2 frame times | Light budget, baked light, presets; kill criteria and the Godot fallback written before the spike | 2 |
| Steam Deck unproven: no 2026 evidence for Babylon, Electron or WebGPU on the Deck; an old report of Babylon running much slower in Chrome there; an undated report of pad input missing in Electron on the Deck | Phase 2 spike | Treat "Deck Playable" as a goal, not a promise, until measured on a real Deck (D14) | 2, 10 |
| Late .exe conversion pain | Electron build breaks | Electron build in CI from Phase 2, kept green | 2 on |
| Steam binding unmaintained: the original steamworks.js has had no push since May 2024; a maintained fork (`@pipelab/steamworks.js`) and `steamworks-ffi-node` (March 2026) exist | Build or overlay breaks | Only non-networking features used; isolated in the Platform layer; the spike picks one binding | 2 |
| Free relay or signalling tier changes or shuts | Provider notices, failed joins | Tiny documented services, movable host, the Transport interface (already in `src/net/transport.ts`) | 2, 10 |
| Relay costs money past a free tier: the Metered trial is 500 MB and stops (N24); Cloudflare TURN is free to 1,000 GB a month, then US$0.05 per GB | Usage readout near the limit | Relay only when a direct link fails; a spend cap or a hard stop before any paid tier; decide the release relay in Phase 10 (D22) | 2, 10 |
| Two mission engines held side by side (Sector Ops engine with Tallow Wharf, Marlow Yard course engine) | Fixes made twice, tests failing in the unused one | Decide D18 in Phase 5, then remove the unused engine and Tallow Wharf | 5 |
| Known failing play tests on master (`e2e-section-rating`, `e2e-ctcourse:5`, `e2e-sectorops:wharf-tgc`; with Mixamo on: clip, anim, weapons-carry, foley, desktop:1) hide new breakage | A new failure in a suite already red | Each one owned by the phase that reworks its system (control panel, Local testing) | 3-5 |

## Licences and IP

| Risk | Early warning | Mitigation | Phase |
|---|---|---|---|
| Asset licence problem | An asset without a credits row | Credits check before every release build (G407) | every release |
| Generated assets are not listed: `docs/art-credits.md` says in-repo generated assets are not listed, but the brief needs them marked for Steam's AI content survey (models, score, hand-made clips, icons) | Phase 8 store survey | Phase 1 adds a "Made in the repo" section: each generated group, its script, whether AI tools made it | 1 |
| Chaos Theory footage frames committed in the public repo (55 images under `docs/ct-prototype/shots`, research comparisons; not shipped) | Store page goes public | Michael decides: remove from the current files, or keep (git history keeps them either way) | 1 |
| Mixamo clips converted onto our rig sit in a public repo; Adobe allows commercial use inside a game but not redistributing raw animation files as a product | Adobe terms change, a takedown | Check Adobe's live terms before release; options then: keep, or move clip data out of the public repo | 10 |
| The whole game is free to play on the public site and its full source is in a public repo; a paid Steam release competes with both | Store page date nears | D23 (public browser build) and D24 (repo visibility) decided before the store page; GitHub Pages on a private repo needs a paid plan, so cost the free hosting options first | 8 |
| Steam AI disclosure: generated music, art and writing must be declared (Valve's January 2026 rules cover content players see or hear) | Store survey | Mark generated items in the credits files from Phase 1; fill the survey in Phase 8 | 1, 8 |

## Design and scope

| Risk | Early warning | Mitigation | Phase |
|---|---|---|---|
| Scope creep and process regrowth | Parked list empty, docs growing | Scope ledger (`SCOPE.md`), five questions, gate re-plans | always |
| Polishing untested work | Art or music before a gate | Polish ban | always |
| Mechanic carousel | More than one new toy per mission | Verb budget, reuse rule (introduce, reuse 3+ times, combine) | 4, 9 |
| Players lost or idle | Telemetry idle and stall times | Compass, lit exits, lookouts, 2-minute rule | 4-7 |
| Forgettable music | Blind test reactions | Signature identity, a recurring theme, A/B tests by Michael's ear, CC0 field recordings | 1, 7 |
| Weak characters | Retell test mentions no character moment | Story-first missions, temperaments, banter passes | 1, 7 |
| Playtester shortage | Fewer than 3 fresh pairs per gate | Recruit early; Steam Playtest after Phase 8 | 3 on |
| Animation cost of team moves | Moves cut late | Only animate moves that survived Phase 4 | 4 |
| Old decisions contradicting new ones | Conflicts found in code or docs | New short DECISIONS file supersedes; Phase 1 marks the stale research passages | 1 |
| Stale research steering helpers: the research and level docs still assume Sector Ops, solo play, 3-4 players, fixed kits, no compass and spawned response guards | A brief or plan quoting them | Phase 1 adds a "superseded" note at the top of each, pointing to the decisions file | 1 |
| Human ladder reaches 4.1 m in code (`TEAM.ladderGrab`); 4.5 m was decided (G57) and the co-op lip band is 4.3-4.5 m, so lips in that band cannot be reached | Gym room fails | Fix when the ledge relay is rebuilt in the Phase 4 gym | 4 |
| Partner animations broken on the joining side (first phone test, 2026-11-02) | Co-op playtests look wrong | The Mixamo switch (Phase 3 movement sign-off) | 3 |
| Host leaving ends a match with no message (N26, parked) | Playtests end abruptly | Build N26 when Michael un-parks it | when asked |
| Steam cannot match a full game with its demo app (Valve's demos page), so a Friend's Pass cannot use Steam lobbies or friends-list joins | - | Own WebRTC with room codes (D4, D5); several indie Friend's Pass apps on Steam already work this way | 2, 8 |
| Friend's Pass app refused by Valve, or it needs its own fee | Valve's answer | Ask in Phase 2; Remote Play Together as the fallback | 2, 8 |
| Mixed, cheap look from free assets | Screenshots look inconsistent | One art style written in Phase 7, generated assets tuned to it | 7 |
