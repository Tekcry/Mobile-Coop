# Auto-train: big trains keep their version commit
kind: patch

- Auto-train read only the first 100 commits of a train PR, so a train with more lost its version commit and stopped with "no version commit: rebuild" (trains 39 and 40). It now also reads the head commit.
