# Trains: doc-lint left-outs; a fix commit no longer hides the version commit
kind: patch
- Train build: `merge-train build` runs doc-lint on the merged tree after each member and leaves out a member that
  adds a doc-lint error (for example two members together over a doc budget), with a comment asking its lead to fix
  the doc; the rest of the train ships instead of the whole train failing CI `lint`.
- Auto-train: a fix commit on top of a train of over 100 commits no longer hides its version commit ("no version
  commit: rebuild", train 112); the head's newest commits are read when it is missing.
