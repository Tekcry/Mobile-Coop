# Light field: no allocation in the meter, guard and shadow-cue queries (F57)
kind: patch
- The light field's bounce read passed each query point as three numbers to `BounceGrid.sampleInto`, which the engine
  boxed: 1296 B per 3-player shadow-cue fill and 128 B per 3-player meter tick. The point now goes through the grid's
  `q` slots (`sampleQ`), and `totalInto` / `levelInto` / `dynamicInto` read it from the field's `pt`: 0 B for both.
  Every level is unchanged to the bit (372k old-vs-new comparisons; `tests/lightFieldAlloc.test.ts` pins a pre-fix table).
- The meter's light-ray filter object is made once instead of per ray. The Havok ray itself still allocates
  ~1.8-2.9 KB per call inside Babylon.
