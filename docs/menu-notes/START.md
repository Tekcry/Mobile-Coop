# Menu Notes Build - start prompt (orchestrator, 2026-10-19 18:50)

Session title: "Night Shift | Menu Notes Build". Model Opus, effort high, Remote Control on.

You are the job lead for the job "menu-notes". The orchestrator ("Night Shift | Orchestrator") set it up; report to it
with SendMessage when you start, after each slice, when the PR is open, and when blocked.

## Setup
1. In C:/NightShift/Mobile-Coop (stays on master; never work in it): `git pull origin master` (4.6.8 or later), then
   `git worktree add C:/NightShift/Mobile-Coop-menu-notes -b feature/menu-notes origin/master`. Work only in
   C:/NightShift/Mobile-Coop-menu-notes, with the branch guard from CLAUDE.md before every write. Don't touch the folder
   the session opened in if it is another job's.
2. Read CLAUDE.md (above all "Sessions": machines, heavy.lock, the laptop test runner, test tiers, ports) and
   docs/ROADMAP.md. Then docs/menu-ui/SLICES.md lines 50-58 (the notes), and only the docs/menu-ui/SPEC.md and
   docs/systems/ui.md sections you need.
3. Write docs/menu-notes/BRIEF.md, PLAN.md and STATE.md (CLAUDE.md "A job").

## The ask
Michael's walk-test menu notes (verbatim in SLICES.md; Michael 2026-10-19 18:40: "can you do the other menu fixed etc
from my feedback"):
- Music starts at the "press any key" title screen (WebAudio synthesis only, hard rule; start it on the first key or
  button press if autoplay blocks it).
- Preload shaders and the hero before showing the menu (it's jumpy while loading); a Night Shift load screen is fine.
- No way back from the main menu to the "press any key" screen.
- Check the menu model really is the full hero quality (LOD).
- The hand clips the magazine in the menu idle stance.
- Bring the rifle and pistol into the main menu, with holding and idle poses.
- The Controls menu and Settings > Controls do the same thing: merge them into one.

Not in scope: the selection wheel restyle (CT Core does it later), anything in gameplay.

## Limits
- Prototype effort (CLAUDE.md "Current goal"); the realism standard for any new pose (bible 5.12.2).
- Priority: the co-op training course (CT Core) comes first. The desktop heavy.lock goes to CT Core first; never take
  it while CT Core waits. When it is held, push and send `npm run check` plus named logic suites (smoke, e2e-menus, ...)
  to the laptop runner "Night Shift | Character Build" with the branch and the exact commit.
- Visual checks (hero quality, magazine clip, weapon poses, load screen) need the GPU: the shot / anim-sheet scripts
  with `E2E_GPU=1` on port 4189 on the desktop, only when heavy.lock is free, headless. Show Michael the images (contact
  sheets) in your reports.
- Avoid files other branches are changing. CT Core (feature/ct-prototype): src/anim/animGraph.ts,
  src/anim/clips/actions.ts, src/anim/clips/traverse.ts, src/player/attachController.ts, src/net/remoteAvatar.ts; put
  menu poses in menu-only code or data. Sector Ops (feature/sector-ops): src/ui/screens/briefingScreen.ts,
  missionsScreen.ts and scripts/e2e-menus.mjs; keep your e2e-menus edits small and separate and keep #18's condition
  wait for the slider hold.
- Unattended: log assumed decisions A1, A2 ... with undo in BRIEF.md; ask Michael (through the orchestrator) only
  before installing or downloading, or when a hard rule blocks the goal.

## Loop
docs/systems/session-method.md: slices as you plan them, each with an Opus implementer and a fresh Opus checker, at
most 1 fix round. Subagents start from docs/systems/agent-preamble.md.

## Done
All 7 notes handled (or a logged reason); `npm run check` green; the full `npm run e2e` green on the PR head (desktop
with `E2E_JOBS=2` when free, or the laptop runner); contact sheets for the visual items; a CHANGELOG "Unreleased" entry;
TESTING.md manual checklist lines; docs/systems/ui.md updated. One PR to master, "menu-notes: Michael's walk-test menu
notes". Don't set the version (the orchestrator sets it, a minor step, and merges).
