# Guard animation cost cuts (S5)
kind: patch
- Guard animation does less work per frame with no change to any pose: the foot planner's per-frame side loops no
  longer allocate arrays or iterators; the emote layer (`applyFk`) no longer builds a map and `Object.entries` list each
  frame; the joint limiter keeps its rate and previous rotation on the joint node instead of in two Map lookups; and
  guard rigs skip the finger and goggle frames, whose outputs only the operator figures read.
- New tests: a golden guard pose test with a fixture captured on the untouched code (`tests/guardPoseGolden.test.ts`)
  and an opt-in NullEngine micro-benchmark of guard animate (`tests/guardAnimBench.test.ts`). The measured gains are
  inside machine noise (about 0.5-2 us a guard a frame on NullEngine); the gain is less garbage.
