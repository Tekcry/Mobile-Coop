# e2e-coop joint interrogation flake
kind: patch
- e2e-coop "joint interrogation: host bluffs, client reads": the client's hold starts as soon as the host stores its bluff
  and the client's bluff line is checked alongside, so Node polls under load no longer spend the bluff's 6 s host-time
  window before the read ends (a 28 fps host timed out on the joint count); a timeout now prints the host's bluff age.
