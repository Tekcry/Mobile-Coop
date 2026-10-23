# anim-fix-pass before numbers: written only on request
kind: patch
- `tests/animFixPass.test.ts` (the AF0 before-numbers report) runs only with `AFP_WRITE_NUMBERS=1`, so a normal or train
  test run no longer rewrites the tracked `docs/anim-fix-pass/before/numbers.md` (it stopped the 4.84.0 release).
