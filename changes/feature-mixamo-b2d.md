# Mixamo walk-test fix B2d: a downed guard keeps the Swat body
From Michael's walk test (2026-11-03), Test Chamber guards:
- A knocked-out or killed guard no longer swaps to the old figure: the Swat stays and its bones follow the guard's own
  joints (hips, spine, neck, head, arms, legs), so it falls and lies with the ragdoll.
- Picked up and carried, the body over the shoulder is the Swat too, and it drops with the ragdoll again.
- Checks: `scripts/e2e-mixamo-guards.mjs` (the Swat's joints within a few cm of the ragdoll's, lying, then carried).
