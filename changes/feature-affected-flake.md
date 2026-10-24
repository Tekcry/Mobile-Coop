# Auto affected-e2e and flake budget

### Changed
- Laptop queue: every open PR head gets an automatic affected-e2e run (the suites its change drives) and an `affected-e2e` commit status; a newer head supersedes the older request.
- Flake budget and quarantine replace "flake stands": a suite may flake 2 times in 7 days, the next flake quarantines it for 48 h with an owner; quarantined suites always run and print KNOWN FLAKY. `scripts/e2e-quarantine.json` holds the committed list (e2e-pad) and the suite owners; PR comments carry a flake-rate table when a run flaked.
