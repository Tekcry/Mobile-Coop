# lightField allocation test deterministic in CI
kind: patch
### Changed
- `tests/lightField.test.ts` "allocation-free under a loop": bodyLevel is judged against the run's own levelAt
  (2 x levelAt + 56 B) instead of an absolute 144 B. About 1 CI run in 15 (Node 22) reads exactly 173.2 B for the
  whole process (normal 126.8), so the old limit failed train/71 and PR #361 on code that never touched it. A vector,
  object or closure per query is still caught (an injected object in totalInto read 296.9 B against 169.6).
