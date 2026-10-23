# Guard models
kind: minor
- Guards can draw as realistic figures from the operator pipeline (guard-models, behind `?guardmodels=1` while the
  budget is measured; `?guardmodels=0` keeps today's merged body): three builds (average, lean, broad by kind), eight
  faces in four skin tones, six hair caps in four colours, and caps, beanies, a boonie, a headset, glasses and kit, all
  picked from a 7-bit look seed per guard. Host and client see the same man, and a section restart gives every slot
  the same look. Helmets, vests and the heavy plate show exactly what stops a round; a knocked-off helmet hides on the
  guard and drops at his feet as the same helmet; carried bodies keep their look; the enforcer's shield is its own
  model. Until the baked guard files land, Wren's figure stands in.
- Co-op: the enemy `al` carries the look seed in bits 9-15 (`AL_LOOK`; `AL_MAX` is 65535). The protocol version is
  bumped by the train build.
- Tests and docs: Vitest for the kit data, variation, piece mask, look seed on the wire, figure (NullEngine) and the
  bundled files against the budgets (skipped until the bake's files are in); `e2e-coop` checks the seed and visible
  pieces on host and client, the seed after a bay restart and the helmet bit drop (`E2E_GUARDMODELS=1` for the pieces);
  guards section in `world-and-characters.md`, the budget line in `performance.md`, the look bits in `coop.md`, MPFB2
  credited for the guards' bodies and faces, a desktop checklist item in `TESTING.md`.
