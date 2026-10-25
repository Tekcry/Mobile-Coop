# Trains: a member that breaks doc-lint is left out at build
kind: patch
- Train build: `merge-train build` runs doc-lint on the merged tree after each member and leaves out a member that
  adds a doc-lint error (for example two members together over a doc budget), with a comment asking its lead to fix
  the doc; the rest of the train ships instead of the whole train failing CI `lint`.
