# Guard AI allocation fixes
kind: patch
- Guards no longer create garbage when they shoot, bite or think: shots, bites and their moves reuse kept
  values, and the guard manager's half-second checks use plain loops.
