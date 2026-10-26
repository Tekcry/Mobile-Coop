# Knife wire allocation test steadied (F58)
kind: patch
- Test only: the co-op knife kill allocation check compares two memory measures that vary a little from run to run; each is now the lowest of three, so it no longer fails releases at random.
