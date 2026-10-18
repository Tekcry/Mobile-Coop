# Animation clean-up - decisions

Michael's words: BRIEF.md. Assumed decisions (A1 onward), each with how to undo it.

- **A1. Based on feature/weapons and feature/ct-prototype.** The clean-up needs Wren's holds (weapons) and the posture
  fix (CT Core's P1, which leaves arms, hands and the aim pocket alone). Merge order: weapons PR #7, then
  feature/ct-prototype, then this. Undo: rebase onto master once both are merged.
