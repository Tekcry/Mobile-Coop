# Account handoff

Michael (2026-10-22 ~13:00, 5-hour window ~95%): "Can you prepare all of these to be moved to another account?"
Earlier handoffs (2026-10-21) are in git history.

## State at the switch (2026-10-22 ~13:10)
Master v4.53.0 (#112, 5220f79c); /preview/ = dev = master. Every session was told to start no new agent, commit, push
and write a stand-alone resume prompt. Rules changed today (all in CLAUDE.md "Sessions" and STATE.md): tuner / tests-only
tier, merge trains (one PR and one version per train), full check / vitest takes the heavy lock, hard stop at 99%
(97% no new agent, 98% save).

Open work:
- #103 anim-bake-targets (CT Core, head 41becc22): desktop full run had 7 load failures; solo reruns: 5 ok, ctcourse:1 FAIL
  ("station 3: stale far-lobby positions reached the host (0 reports)", the jammer send-back test; may be real), ctcourse:2 was running on the
  desktop (CT Core reports the verdict). Pass -> it merges alone, or in the next train.
- #110 anim-run-half (CT Core): after #103 merges: merge master, re-capture the identity fixture, check + e2e-anim +
  e2e-studio, then a train.
- anim-natural N1 feet (CT Core, feature/anim-natural-n1 bccc42e8): checker FAIL (heel scrub in the heel-first roll, 6
  should-fix; docs/anim-natural-n1/CHECK.md): one fix round, then check, e2e, GPU sheets.
- anim-natural N3 draws (Menu Notes, feature/anim-n3 5348f9be): checker PASS WITH FIXES; fix round half done, unverified
  (fix 1 has no test; fix 2 fails 5 of 8 mid-draw scenarios, suspects in WIP.md) (RT during holster
  dropped; holster / traversal mid-draw snaps the gun), merge master (4.53.0 has #109 clip speed), area e2e, PR.
- anim-natural N4 holds and carries (Course Ready, feature/anim-n4 082be068): checker FIX; fix round (load share on the
  carry lean; the lift crouch must not wait on animation foot contact in the sim), merge master, PR.
- flake-fix (Character Build, feature/flake-fix 54c3576d): four fixes written, unverified; lint, vitest, two JOBS=2
  proof runs, PR (tests-only tier).
- N0 audit pass 2 (Menu Notes, after N3). N2 body motion (CT Core, after N1; SWAY_MAX to ~5 cm approved).
Parked: #67 (Michael fixes it himself), sector-fixes, campaign-spec.

## In the new account
Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
orchestrator prompt into a new session. The new orchestrator gives each next prompt with its session title, model and
effort, one per message, as the last thing in that message. Sessions are new: each prompt stands alone.

| Order | Session title | Model | Effort | Where |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| 2 | Night Shift \| CT Core Build | Opus 5.5 | high | desktop |
| 3 | Night Shift \| Menu Notes Build | Opus 5.5 | high | desktop |
| 4 | Night Shift \| Course Ready Build | Opus 5.5 | medium | desktop |
| 5 | Night Shift \| Character Build | Opus 5.5 | medium | laptop (Remote Control) |

### 1. Orchestrator
```
Night Shift | Orchestrator (new account). Resume from docs/orchestrator/STATE.md and docs/orchestrator/HANDOFF.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Sessions from the old account are gone: give Michael each job's prompt from HANDOFF.md "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the usage and bottleneck cron (17, 37, 57 past; STATE "Pacing" and "How Michael works") and check get_usage now. Then carry on: merge trains per STATE "Merge procedure", route work per "Sessions". Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (new account). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Detached test scripts from the old session may have died: a C:/NightShift/heavy.lock naming CT Core Build with no node process running is stale; delete it. Message "Night Shift | Orchestrator" with the #103 verdict and at each slice and PR.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (new account). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch feature/anim-natural; git pull first). Message "Night Shift | Orchestrator" at each slice and PR.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (new account). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (git fetch; read it with git show origin/feature/marlow-bays:docs/marlow-bays/RESUME-trackA.md). Message "Night Shift | Orchestrator" at each slice and PR.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (new account, laptop, the test runner). Read CLAUDE.md "Sessions" ("The laptop is the test runner"), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Take run requests from the orchestrator and job leads first; flake-fix fills the gaps. Message "Night Shift | Orchestrator" with each verdict.
```
