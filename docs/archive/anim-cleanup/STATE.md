# Animation clean-up - state (resume point)

> **History (process audit, 2026-10-19):** PR #12 merged (4.5.0); the job is done. The current state of every job is `docs/ROADMAP.md`.

**Now (2026-10-19):** done; PR #12 is open (feature/anim-cleanup → master), its check passed, and it waits for Michael
to merge (the orchestrator's merge was blocked by auto mode). The desktop e2e is settled: traverse (drainpipe settle
window, 812a75f2) and netmove's holster budget (4c465e3c) were fixed here; the remaining e2e-coop, e2e-netmove (ledge
hang) and e2e-ctcourse failures also fail on master bd59f32 alone, so they are not this branch's (PR-BODY.md; they go
to the co-op test fix job). No more work on this branch unless the PR review asks for it.

## How this job runs now
- Report to the **Night Shift | Orchestrator** session (CLAUDE.md "Orchestrator"): when a step starts or ends, when a PR
  opens, when Michael is needed, when blocked. It owns `docs/ROADMAP.md`, opens and merges this PR.
- The laptop does light work only (Michael, 2026-10-19): docs, planning, small edits. No e2e, no full test runs, no
  builds in loops, no Blender renders, no heavy subagents. The orchestrator runs this job's full e2e on the desktop.

## Done
- Slice 1 weapon handling: draw / holster travel to the real mounts, magazine reloads with the charging handle / slide,
  the shoulder swap (ground sub bit 128, counted in protocol 22), stance checks; independent check + fix round 1.
- Slice 3 traversal contacts: world grips on ladder, drainpipe, ledge, pipe, zipline, rope, fence; independent check +
  fix round 1.
- Slice 4 hand shapes: trigger, support, wrap, relaxed.
- CT Core's posture work (P1b, P1c) merged; merge with c628e32 and master passed a fresh independent check (PASS).
- `npm run check` passed (1746 unit tests). CHANGELOG, TESTING.md, docs/systems movement and world-and-characters done.

## Next
1. The orchestrator's desktop e2e result. A partial laptop run under load (stopped on Michael's word) failed two suites
   that may be this branch's: e2e-traverse "drainpipe: hands reach their grips (3.2 cm, R frame 53 phase on)" and
   e2e-netmove "holstered: client holster + host receipt to stow 766 ms <= 650 ms". If they fail on the desktop too,
   fix them here as light edits (the grip settle / reach cap in `characterRig.ts` and the e2e's settle window; for
   netmove, whether the holster travel delays the stow the wire reports in `playerWeapons.ts`), push, and ask the
   orchestrator to rerun those suites.
2. Update the e2e line in `PR-BODY.md` with the desktop result; the orchestrator opens the PR
   (`gh pr create --base master --head feature/anim-cleanup --body-file docs/anim-cleanup/PR-BODY.md`) and merges it.
3. Then tell CT Core Build that anim-cleanup landed: it merges master into feature/ct-prototype and re-checks the
   playtest-2 D+E notes (holstering, pipe-climb hands, shoulder-swap flick) on top of this work.

## Open (POLISH.md, not this PR)
Rappel, fence, window vault, duct and split-jump contact audits on Wren; the crouched wrist palm-in rest; the partner
sees no reload, magazine or travel.
