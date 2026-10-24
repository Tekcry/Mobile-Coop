# Guard models
kind: minor
- Guards can draw as varied, realistic figures from the operator pipeline (guard-models). It is behind `?guardmodels=1`
  for now (the default is off until the budget run flips it); `?guardmodels=0` is today's merged body. What you see:
  - Three builds: average (grunt, drone operator, officer), lean (runner, sniper) and broad (heavy, enforcer).
  - Faces: eight faces in four skin tones, six hair cuts in four hair colours, some with stubble or a beard; the heavy
    and the enforcer wear a balaclava.
  - Outfits and headwear per kind: field uniform, rolled sleeves on the sniper, work jacket on the runner, field
    jacket and peaked cap on the officer, caps, beanies, a boonie, a headset, glasses, belts, holsters and a radio.
  - Gear that matches gameplay: a helmet shows only while the guard's helmet would stop a round, a vest only with
    armour, the heavy and enforcer always show their plate, and the enforcer carries a riot shield.
  - Helmet knock-off: the first head hit takes the helmet off his head; it drops at his feet as the same helmet and his
    cap or hair shows again.
  - Every guard's look comes from a per-guard seed, so it is the same after a section restart and the same on both co-op
    screens; carried bodies keep their look.
- Guard figures are off by default; their files load only with `?guardmodels=1`, never precached. The baked files
  (three builds and the riot shield, LOD0-2, about 29 MB) are bundled, but the service worker never precaches them and
  nothing fetches them while the flag is off; with it on they load on demand and are kept in the worker's own `guards`
  cache for offline play. A build whose files are missing or broken falls back to a stand-in (the operator's figure
  at guard height).
- Guard look fixes (G10a): uniforms baked at the tint's neutral (no longer near-black), the lightest skin tones keep
  their hue, no face showing through the heavy's and enforcer's balaclava, smooth hair-cap hairlines; the variety
  sheet draws no goggle glow on guards and a colour change in the kit now costs a sheet run, not a full bake.
- Co-op: the enemy `al` carries the look seed in bits 9-15 (`AL_LOOK`; `AL_MAX` is 65535); host and client derive the
  same look from it. The protocol version is bumped by the train build.
- Tests and docs: Vitest for the kit data, variation, piece mask, look seed on the wire, figure (NullEngine) and the
  bundled files against the budgets, the precache lists and the flag-off path (no guard file precached or fetched,
  `guardAssetsOffline`); `e2e-coop` checks the seed and visible
  pieces on host and client, the seed after a bay restart and the helmet bit drop (`E2E_GUARDMODELS=1` for the pieces);
  guards section in `world-and-characters.md`, the budget line in `performance.md`, the look bits in `coop.md`, MPFB2
  credited for the guards' bodies and faces, a desktop checklist item in `TESTING.md`.
