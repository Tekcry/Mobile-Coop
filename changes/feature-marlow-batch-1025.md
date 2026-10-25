# Marlow batch fixes
kind: patch
- e2e-ctcourse A8 pass 2: the close by hand of the relocked grille waits until the door's item is live on the host, so
  a `use` read between the two host steps of a relock no longer reads 'disabled' (train 106 flake; docs/backlog.md
  "Flaky e2e suites").
