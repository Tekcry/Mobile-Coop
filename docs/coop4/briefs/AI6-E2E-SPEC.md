# AI6 e2e spec: the guard AI asserts for the 3-4 browser harness (Sector Ops / Test Runner)

Opus builder, 2026-10-24, branch `feature/guard-ai-coop4`. Brief: `docs/coop4/briefs/AI.md` section 1 "AI6". For the
owners of the 3-4 page harness (`scripts/e2e-coop.mjs`, `scripts/e2e-sectorops.mjs` with 3-4 pages over `?net=local`):
what to stage, what to read on which page, and the pass thresholds. Build after the coop4 net layer lands (3 remote
`PlayerRef`s in `g.remotePlayers()`, stable ids across a rejoin, `removeRemote` calling `intruderLeft`, A172's
`coopHost.ts` hold line).

The single-browser half is built: e2e-stealth-ai 'four intruders (coop4)' (stand-in refs, `t.fakes`) covers the slot
table, the 9-ray budget, leave / rejoin / reuse, the alarm split, the shared team hunt, the own-LKP team tick and the
2-player control. The asserts below are the parts only real clients prove: the wire, real client movement and noise,
the client screens, a real leave and rejoin.

## Conventions (every assert)
- Pages: A = host, B / C / D = clients. All reads below are on A (the AI runs on the host only) unless they say "on X".
- Client ids: `[...A.net.remotes.values()].map((r) => r.ref.id)`; the host's own is `'local'`.
- Slot of a player: `em.intruders.find(id)` (a read, never assigns; -1 none). Its LKP: `em.intruders.x / z[s]`, valid
  `em.intruders.valid[s] === 1`, last seen `em.intruders.seenT[s]` (s), gone `em.intruders.gone[s]`.
- A guard's intruder: `e.hunt` (slot, -1 none). Gate on: `em.coop4()` (true from 3 live players).
- Waits on the host's sim clock (`waitHostSim`), never wall time. `target.damageMul = 0` on A and every remote, as
  e2e-coop does. Guards spawned by the test with `em.spawn(kind, pos, false, yaw)`; the mode's own guards made passive
  (`e.passive = true`) or cleared where the block says so.
- Each block ends by putting the pages back where it found them (players teleported home, test guards cleared); a
  failed `until` fails the block with what it read, never silently.

## e2e-coop with 3 clients (4 pages)

### (1) Each guard pair hunts the player it saw (S24 with 3 clients)
- Stage: Free Roam or the Ledger mission on the Warehouse, mode guards passive. Three dark rooms out of each other's
  sight (no line between any two). Host, B, C each in one, lit (`t.light`-style pin on the host; on a client stand in a
  lamp pool). Two calm grunts per room, 6-8 m from that room's player, facing him. D far away, unseen.
- Wait until each of the three is in combat on his pair (every guard `e.level === 'alert'`, or 10 s).
- Read, then sample every 0.25 s for 6 s after all three hide (teleport each 6 m sideways behind a wall):
  - the three slots `find(id)` distinct, each valid, each LKP within 2 m of where that player stood when last seen;
  - every guard's `e.hunt` is the slot of the player in his room (the one he saw), all 6 samples-long;
  - no guard's goal / position comes within 3 m of another room's player's LKP (he never walks to an intruder he did not
    see or hear: A148);
  - `em.raysThisStep` per update / number of guards <= 9 (per guard per think, `e.raysThink <= 9` for each guard).
- Pass: all of the above; D's slot `find(D) === -1` throughout (never seen, never reported).

### (2) A client leaves and rejoins: same slot, LKP kept
- Stage: after (1) (B seen and hunted, his slot `sB`, LKP `(x, z)` recorded).
- Close B's page (or its transport); wait until A's `net.remotes` no longer has B (host `removeRemote`).
- Read: `find(B) === sB`, `gone[sB] === 1`, `valid[sB] === 1` while a guard still hunts him, LKP unchanged (< 0.01 m);
  `em.players().length === 3` (`coop4()` still on).
- Reopen B with the same player id (the session's `pid`); wait until A has him again; then make him report once (walk
  into a guard's light, or fire one loud shot: `em.noise(.., id)` on the host).
- Read: `find(B) === sB`, `gone[sB] === 0`; before his first report the LKP is still the old one; after it, his new
  position. `em.ghostOf(B, v) >= 1` on A; on B the ghost is his own (the per-client ghost field, when the net layer
  carries it).
- Pass: same slot both ways, LKP kept until his first report, no other slot changed (`find` of the others unchanged).

### (3) A 3rd client's crouch-walk is silent, his sprint is heard and located by his id
- Stage: one calm grunt facing a wall, C walking behind him at 4-6 m (out of his field), dark.
- C crouch-walks 4 s past him: the guard's `meter` stays < 0.3, `find(C)` either -1 or not valid, no `hear` aimed at
  C's spot (`e.level` stays calm).
- C sprints (standing run) the same path: within 2 s the guard turns / investigates (`e.level !== 'calm'`), and once in a
  search or fight a heard step locates C: `find(C) >= 0`, `locT[find(C)] < 1`, LKP within 2.5 m of C's sprint path,
  `seenT` of that slot still 99 if he never saw him (located, not seen: A157).
- Same with C's noisy hold of an item (A172 coopHost line): in a fight, C holds a noisy item; the slot located is C's,
  not the host's (`find(C)`, LKP at the item).
- Pass: crouch silent; sprint heard; every location lands on C's slot, never on another player's.

## e2e-sectorops with 4 players (4 pages, `?sectorGuards=` as the suite uses)

### (4) A stage brings `responseShape`'s teams, never past the live cap
- Precondition: Sector Ops wired `raised()` to `em.shapeResponse` and one `newTeam` per team (AI5-BUILT "For Sector
  Ops"), `setResponseShape` at section load.
- Stage: section 1, 4 players in, raise the alarm through a panel (the 'alarm panel' path of the suite).
- Read on A right after the stage rises: `em.shapeResponse(stage, perStage, {teams: 0, size: 0})` -> `{ teams, size }`
  (with 4 players and room: `size = perStage + 2`, `teams = 2` when `size >= 4`); after the spawns settle:
  `em.teams.filter((t) => t.section === live).length` grew by `teams`, each team's `members.length` matches
  `responseTeamSize(k, size, teams)` or fewer, and `em.alive <= em.maxAlive` at every sample.
- Refused at the cap (fill the section to `maxAlive - 1` first): fewer spawn, nothing throws, the order holds.
- Pass: team count and sizes as above; alive never over the cap.

### (5) The two teams hunt different players; their leaders never dwell on one point
- Stage: after (4), at least two players seen in different places before the alarm (two valid slots).
- Read each team's `t.hunt`: both >= 0, different, and every member's `e.hunt` equals his team's.
- Then 60 s of host sim with the players hidden: sample every 0.5 s each team's `leader.pos`, `sweeping`, `point` and
  `pts`; per team, when sweeping, the point it heads for: `pts[2 * point], pts[2 * point + 1]`.
- Pass: at no sample are both teams sweeping with their current points within `SWEEP.thin` m of each other (the dedupe,
  A177; when every point is held the next is taken anyway: allow it only when `count` <= the number of teams); the
  first point each team swept is nearer its own hunt's LKP than the other team's (own-LKP sweep, A176); `busySkips` read
  for the log.

### (6) S27 draw on alarm on every client's screen
- Stage: the alarm of (4).
- Read on each of B, C, D: every live gun-carrying guard puppet (`net.puppets`, a puppet with `carry`) reaches
  `carry.phase === CARRY_DRAWN` (`src/ai/carryState`) within 2 s of the host's stage rise; on A every live guard's
  `e.carry.phase` likewise.
- Pass: no holstered guard on any page 2 s after the alarm; the same set of guards on all four pages.

## 2-player control (both suites; must stay green unedited)
- e2e-coop's existing S23 / S24 blocks and e2e-ctcourse run unchanged with 2 pages: `em.coop4() === false`, every
  reinforcement hunts the alarm's intruder, teams have `hunt === -1` and sweep from the freshest LKP, a guard's rays per
  think <= 6. Do not edit those blocks; a 3-4 page block is a new block.

## Laptop measure (Test Runner, the guard-cap compare)
- AI ms / guard with 4 players vs 2 on campus, 24 guards, same seed, 60 s of sim each: read `em.raysThisStep` summed per
  second and the manager's update time. Pass: 4 players <= 2x the 2-player AI ms / guard; rays per guard per think
  never above 9.

## Not in this spec
- The per-client ghost and arcs on the wire (net layer + client HUD): add an assert to (2) and (1) when they land
  (`seesIndex(slot)` on the host matches the client's arc).
