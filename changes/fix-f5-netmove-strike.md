# e2e-netmove strike check fixed (F5)
kind: patch
- Test only: the two-player movement test froze a missed strike after it had already ended (the strike recovery became longer in J19 S2), so it failed on every co-op change; it now freezes inside the miss, at the same moment as before.
