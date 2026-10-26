# Laptop queue: skip conflicting PRs, green PRs smallest first, carry train verdicts over docs-only fixes
kind: patch
- The laptop queue no longer runs affected e2e on a PR head that conflicts with master (it posts an error once and runs
  again on the next head).
- PR requests now run front branches first, then green PRs smallest first, then in arrival order, with a bound so no
  request waits forever.
- A train head that moves by a docs-only commit carries the earlier laptop-e2e success; any other moved head runs as a
  normal sharded train.
- A train rerun shards across both laptop slots when they are free.
- An alone request that has waited long gets the gap after the coming train instead of waiting behind train-ready PRs.
