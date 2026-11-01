# Night Shift - clean-up plan and what comes after (2026-11-01)
Owner: the orchestrator. Status: snapshot from the main session's plan, 2026-11-01 ~12:25 Sydney. The live state is the pinned control panel issue.

```text
NIGHT SHIFT - CURRENT PLAN (as of 2026-11-01)

PROJECT
- Night Shift: browser co-op stealth game (Vite + TypeScript + Babylon.js 9 + Havok), repo github.com/Tekcry/Mobile-Coop, master = live site (GitHub Pages), /preview/ slot from dev.
- Owner: Michael (not technical: plain English, short dot points, native multiple-choice questions, hyphens not em dashes).
- Laptop checkout: D:\NightShift\Mobile-Coop (Git, GitHub CLI signed in as Tekcry, Node 22). Not under "## Claude AI ##" because '#' in the path breaks Vite.
- Project was on hold since 2026-10-27. After a full 2-player playthrough Michael chose to clean up THIS project (not start fresh).

PROCESS (keep it simple - the old process grew out of control)
- One main session; background helpers report back to it. At most one side session at a time, in its own area.
- No automation, merge trains, test queues or watchdogs (all removed; desktop scheduled tasks deleted).
- Every change: branch -> PR -> GitHub CI (lint, full unit suite, build-check) -> merge when green. Locally run only quick targeted tests.
- At most: one stage testing on GitHub, one stage being prepared.

DIRECTION
- 2-player online co-op campaign ONLY. No solo, no bot, no other modes.
- Keep: Marlow Yard (training prologue), co-op + all co-op team moves, light and shadow, guard AI, gadgets, night vision/thermal, campaign/mission framework (simplified), paired knife kills as the normal lethal takedown, Kestrel editor (to become a whole-game level editor), phone test launch, dynamic music system and its generator, Wren's model (main menu hero only).
- Anim Studio map becomes the "Test Chamber": joinable in co-op to test everything two-player; the animation tuner works ONLY there. Test Chamber look (lit as the real level) = minimum greybox standard.
- Players and guards switch to the Mixamo character + Mixamo animations (hand-made and CMU animation removed then).
- Remove: Sector Ops (Saltmarsh Park, warehouse ops, 4 players), storm mill / piano scene, Fallow bunker, old modes (Hunter, Infiltration, Mission, PvP, legacy), progression and cosmetics, in-game labs, Tallow Wharf.
- Campaign stays preview-only on the live site for now.

CLEAN-UP STAGES (step 4)
- A process tooling: MERGED (#728)
- B docs purge (335 MB -> 32 MB, research kept in docs/research/): MERGED (#729)
- C in-game labs, Operator Lab, music sketches: PR #730, testing
- D Fallow bunker: being prepared on top of C
- E knife kills made general (lethal takedown = paired knife kill; grab/KO stay; scene-only rules dropped), then remove storm mill scene
- F remove Sector Ops maps, menu, stars, 4-player (keep the Sector Ops engine code until the Mission 1 engine is decided)
- G Test Chamber: rename, co-op joinable, tuner only there, move all e2e suites onto it
- H remove old modes (incl. Infiltration), then Warehouse and Proving Grounds
- I remove progression and cosmetics (save schema v11 migration; Wren gets a fixed menu look)
- J tidy leftover feature flags; purge ~1,140 old branches ONLY after Michael's yes

AFTER THE CLEAN-UP
1. Lock in the vision (draft v2 on hold until Michael rereads it).
2. Decide the Mission 1 engine (trimmed Sector Ops engine vs extended Marlow Yard course engine); remove Tallow Wharf and the unused engine.
3. Fix internet co-op (HIGH PRIORITY): room not listed publicly, room code failed, even both on VPN; partner had to remote-desktop in. Co-op = WebRTC via Trystero + public Nostr relays, no TURN server.
4. Switch to the Mixamo character; redo team-move animations.
5. Write the short new rules + decisions files (replace RULES, DECISIONS, ROADMAP, design bible), including the greybox standard.
6. Music work as its own side session once the vision sets the tone (menu, infiltration, caution, alert).

BUGS FROM THE PLAYTHROUGH (fix after the clean-up)
- Guards know where you are even when hidden; you can't break away and hide.
- Grenade doesn't work.
- Sticky cam view can't be reopened after closing.
- Downed partner isn't obvious.
- Players can climb out of levels.
- Objectives confusing; Marlow Yard's last section too short and poorly designed.

VISION DRAFT v2 (key points; on hold)
- Pillars: 1 co-op teamwork, 2 light and shadow, 3 readable fair guards, 4 always know where to go, 5 physical CT-style movement, 6 sound.
- First target: Marlow Yard + a fresh Mission 1. Missions 20-30 min, guided path with 2-3 routes per room.
- Few guards (2-5 per area), never spawned; alarms make existing guards tougher. When spotted, hiding is the answer.
- Picture lifted for readability; light meter and guards still agree; night vision toned down.
- Compass bar: objective with distance + partner mark. Pings in player colour (Wren green, Moth purple) with player number.
- One difficulty; checkpoints at each area and before set pieces; revive 30 s, twice per mission; breaking a mission rule restarts the section; kills cost rating unless forced; CT-style percent rating.
- Gear chosen before each mission (pistol, rifle, non-lethal and lethal gadgets; no drone); pistol hold-to-jam always carried; nothing carries over.
- Story: keep Hollowmere / SUNDOWN if it fits; dry banter between Wren and Moth.
- Mission design rules from the CT and level-design research: small team moment every 2-4 min, set piece every 6-10 min, mid-mission twist, intel used, team moves work anywhere, nobody waits over a minute, splits end at a meeting point.
```
