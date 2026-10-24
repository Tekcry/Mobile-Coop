# Train fallback fragment and idle self-update
kind: patch
- merge-train: a member PR whose branch adds no `changes/*.md` (a test-only PR) gets a synthesised `kind: patch`
  fragment in the train, noted in the train PR body, so the version commit no longer fails with "nothing to assemble".
- auto-train: an idle tick (no train open, nothing building) moves its checkout to `origin/master` when the working tree
  is clean, so the scheduled checkout never runs stale scripts.
