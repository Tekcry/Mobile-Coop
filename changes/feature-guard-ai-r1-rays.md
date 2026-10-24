# Allocation-free sight rays
kind: patch
- Performance: guard and recon drone sight rays no longer allocate in our code (`losClear` and the drone use `Ballistics.hitDistance`),
  so 24-32 guards thinking no longer feed the garbage collector every think; same sight verdicts.
