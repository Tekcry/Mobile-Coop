# Night Shift - master plan for Unreal (phases and gates)
Owner: the orchestrator. Status: current (Unreal re-plan run, 2026-11-03; re-planned at every gate).

Replaces `MASTER-PLAN.md` while the Babylon build is paused (N58). Research behind it: `UNREAL-RESEARCH.md`; what
carries over: `UNREAL-CARRY-OVER.md`. Every session follows `docs/RULES.md`; the live state is the control panel issue.
Sizes in sessions come after Phase 1 gives a real pace.

## Setup (Michael's hand steps)
- Done by 2026-11-03 17:05: Epic launcher signed in, Unreal Engine 5.8.4 download started (about 30 GB on disk, not yet
  registered as finished), Google Drive for desktop signed in (`G:/My Drive`).
- Left: finish the engine download; Visual Studio Community 2026 with the C++ game workloads (5.8 needs VS 2022
  v17.14 or newer, 2026 recommended).

## Phase 1 - Pipeline proof (go / no-go)
Everything below runs hidden: no visible window, nothing touches Michael's mouse or keyboard (N8).
1. Toolchain check: the engine install is complete and Visual Studio's compiler is found.
2. Project: a C++ project from the Third Person template, created by copying the template on the command line
   (unproven; if it fails, Michael creates it once in the launcher, as the research recommends). It lives at
   `D:/NightShift/unreal/NightShift`, outside the Drive folder (N59). Local git with the Unreal ignore list, no LFS. Its
   own `CLAUDE.md` (code rules).
3. Build from the command line with the editor closed; compile and first shader times recorded.
4. Hidden run: the game off-screen on the RTX 4090 (checked: no window, the NVIDIA card in the log), a screenshot and
   frame times.
5. Editor Python run unattended: a script creates and changes an asset, and makes one change to an animation
   Blueprint (the weakest spot for scripts; Phase 2 depends on it), each checked by reading it back as text.
6. Automated test: one Unreal automation test runs headless and writes its report.
7. Two-player test: a listen server and a client as two hidden game copies on the laptop (direct local connection),
   the client joins, scripted input moves both players, screenshots from both.
8. Packaged build: cook and package times recorded; the packaged game runs hidden too.
9. Backup: history bundle plus a zip without cache folders into `G:/My Drive/NightShift-backup`, kept under 10 GB;
   a nightly scheduled task (Michael's yes first); one restore into a spare folder that builds.
- **Exit (go):** all 9 pass hidden, with a review page of the screenshots, frame times and timings. **No-go:** the
  failing item goes to Michael with options before anything else is built.

## Phase 2 - Basic movement to the approved checklist
- Target: N55's six rows and the walk test round 1 notes (`FEEDBACK-RECORD.md`); method N54 (references, picture
  checks, a review page per round; Michael plays a packaged build on the laptop when feel matters).
- Work: Mixamo bodies (X Bot Wren, Y Bot Moth, N53) retargeted onto Epic's Game Animation Sample movement; its
  two-player sync checked first (it ships without networking); Mixamo clips for the upper body (low ready, aim, draw /
  holster, rifle sling); camera; crouch and crouch run (N57); no free jump (N56).
- Hand steps when needed (each asked first): adding the Game Animation Sample from Fab; Mixamo re-downloads with "In
  Place" off (root motion, for foot planting).
- **Exit:** every N55 row passes on the review page and in Michael's play.

## Phase 3 - The RULES "playable" bar
- A Test Chamber in Unreal (N7, N11, N17 as the layout reference), textured, lit and shadowed with free assets.
- Two players join (local in the automated run; over the internet through Steam's free relay, test app 480, for
  Michael and his partner), move, do one two-person action, a guard spots a player (sight, hearing, light level),
  fail and retry from a checkpoint.
- **Exit:** the automated run covers all of it and passes; Michael and his partner play it from two homes.

## After Phase 3 (the long-range map, re-planned at each gate)
4. Mission 1's setting (D31) and its first playable area to the prototype standard (waits for Phase 3, N50).
5. Core feel: readable darkness, guards that lose you when you hide, a stealth gym; then the co-op toolkit (team moves
   as gym rooms, pings, compass, checkpoints, rating) - as old phases 3-4.
6. Mission framework, Marlow Yard prologue rebuild, the Mission 1 vertical slice (go / no-go) - as old phases 5-7.
7. Steam presence: the game app, store page, Steam Playtest; the Friend's Pass method decided first (D5 reopens).
8. Production, beta and polish, demo and launch, after launch - as old phases 9-12.
