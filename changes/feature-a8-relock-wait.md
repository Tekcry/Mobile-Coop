# e2e-ctcourse A8 relock wait
kind: patch
- Tests: e2e-ctcourse:4 waits up to 5 s for the A8 grille to relock on the host after the night circuit returns (it relocks one host step later; train 40 flake).
