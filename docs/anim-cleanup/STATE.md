# Animation clean-up - state (resume point)

- Slice 1 weapon handling: done (draw / holster travel to the real mounts, magazine reloads with the charging handle /
  slide, the shoulder swap, stance checks; independent check + fix round 1).
- Slice 3 traversal contacts: world grips done (ladder, drainpipe, ledge, pipe, zipline: palm on the real geometry,
  fingers round it; independent check + fix round 1). Back-to-wall pose and the crouch angle: CT Core's P1b.
- Slice 4 hand shapes: done (trigger, support, wrap, relaxed).
- CT Core's P1b merged (2b67c57): back-gun crouch check passes; crouch and wall re-shot.
- Open: audit rappel / fence / split jump / vault / duct (shot
  set-ups); slice 5 transitions; full e2e; PR after PR #7 and feature/ct-prototype merge (A1).
- Now (2026-10-19): merged master (PR #9, #10); check passes; merge check PASS; PR body in PR-BODY.md. Michael: no heavy
  runs on the laptop, so the orchestrator runs the full e2e on the desktop, then opens and merges the PR. Light fixes only
  here if traverse or netmove fail there.
