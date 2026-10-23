// (marlow-final slice 9, SPEC 12 "Revive", LD 15) A player downed on each co-op surface is revived from that level.
// After the set's walk (the runner calls `reviveOn` for sets 1, 2, 6 and 8): the client stands on the surface, the host
// stands beside it on the same level, the client goes down (the host's copy takes 1000 damage, as the dock finale), and
// - the revive item lies on the surface (its height within 0.4 m of the surface);
// - the game's own pick (`interactables.nearest`, revive kind) offers it from the host's feet on the surface;
// - on a raised surface, it is not offered from the floor below (`below`: within the 1.6 m reach horizontally, 4.4 m
//   under: the < 1.5 m height rule);
// - inside the 30 s window the host revives it (the item's `onUse`, as the dock finale: the 2.5 s hold is not pressed) and
//   the client stands up on the surface.
// The team budget is 2 revives per mission (`ReviveClock`): with none left the clock is reset first (a test hook; the
// rule is unchanged), so every surface and the dock finale get their revive. Returns the revives done (for the end
// screen's count).

/** Surfaces per set number: the floor height, the client's spot, the host's spot (same level), the off-level probe. */
export const SURFACES = {
  // A1 yard: ground level behind the boundary wall (the `A1-yard` point), x 12.3-22
  1: { name: 'A1 yard', y: 0, client: [17, 11], host: [18.2, 11], below: null },
  // A2 staging: the deck z 17.5-19.75 (the gallery face), x 30-62, open lip x 31-35 (`A2_DECK`); the probe on the floor
  // in front of the lip
  2: { name: 'A2 staging', y: 4.4, client: [33, 18.1], host: [34.2, 18.6], below: [33, 0, 16.9] },
  // A6 motor gallery: the deck z 69.6-71.775, x 40.3-56, open lip x 40.8-45.3, the rope at (43.15, 70.2) (`A6_DECK`);
  // the probe on the floor in front of the lip
  6: { name: 'A6 gallery', y: 4.4, client: [41.6, 70.3], host: [42.7, 70.9], below: [41.6, 0, 69.2] },
  // A8 public gallery: the west return x 106.25-109, z 56-75, open edge x 109 z 66-70.5 (`A8_LIP`); the probe straight
  // under it on the hall floor (the slab stands on columns)
  8: { name: 'A8 gallery', y: 4.4, client: [107.9, 68.2], host: [107.9, 69.4], below: [107.9, 0, 68.2] },
};

/** Free one revive of the team budget (reset the clock only when it is spent): returns `used` before the revive. */
export const freeRevive = (GA) =>
  GA(() => {
    const c = window.__app.current.net.reviveClock;
    if (!c.canRevive) c.reset();
    return c.used;
  });

/** @param {object} t the runner's helpers @param {object} s a `SURFACES` entry */
export async function reviveOn(t, s) {
  const { A, B, GA, GB, until, assert, waitSim, moveHost, moveClient } = t;
  const what = `revive on the ${s.name}`;
  console.log(`  ${what}`);
  const u0 = await freeRevive(GA);
  await moveClient(s.client[0], s.client[1], s.y + 0.1);
  await moveHost(s.host[0], s.host[1], s.y + 0.1);
  await waitSim(400);
  const onLevel = (y) => { const c = window.__app.current.player.controller; return c.grounded && Math.abs(c.pos.y - y) < 0.3; };
  await until(B, onLevel, s.y, 10000, `${what}: the client stands on the surface (y ${s.y})`);
  await until(A, onLevel, s.y, 10000, `${what}: the host stands beside it on the same level (y ${s.y})`);
  const clientId = await GB(() => window.__coop.session.selfId);
  await until(A, ([id, y]) => Math.abs(window.__app.current.net.remotes.get(id).feet.y - y) < 0.3, [clientId, s.y], 10000, `${what}: the host sees the client on the surface`);

  // down the client (the host's copy, as the dock finale)
  await GA((id) => {
    const g = window.__app.current;
    const r = g.net.remotes.get(id);
    const V = g.player.position.constructor;
    r.damageMul = 1;
    r.protectT = 0;
    r.applyDamage({ amount: 1000, point: r.feet.clone(), sourcePos: r.feet.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'explosion', attackerTeam: 'enemy', attackerId: '' });
  }, clientId);
  await until(B, () => !window.__app.current.player.alive, null, 8000, `${what}: the client is down`);
  await until(A, (id) => !!window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`), clientId, 8000, `${what}: the host has the revive item`);

  const r = await GA(([id, below]) => {
    const g = window.__app.current;
    const ints = g.interactables;
    const it = ints.items.find((i) => i.id === `revive-${id}`);
    const V = g.player.position.constructor;
    const p = g.player.position;
    const from = ints.nearest(p, 1.8, 'revive');
    const lo = below ? ints.nearest(new V(below[0], below[1], below[2]), 1.8, 'revive') : null;
    return {
      item: [it.pos.x, it.pos.y, it.pos.z],
      reach: it.reach ?? 1.8,
      host: [p.x, p.y, p.z],
      dh: Math.hypot(it.pos.x - p.x, it.pos.z - p.z),
      offered: from?.id === it.id,
      belowDh: below ? Math.hypot(it.pos.x - below[0], it.pos.z - below[2]) : -1,
      belowDy: below ? Math.abs(it.pos.y - below[1]) : -1,
      belowOffered: !!lo && lo.id === it.id,
      left: g.net.reviveClock.remaining(id),
    };
  }, [clientId, s.below]);
  const f = (v) => v.toFixed(2);
  console.log(`  (${s.name}: item ${r.item.map(f)}, host ${r.host.map(f)}, ${f(r.dh)} m apart, reach ${r.reach}, ${f(r.left)} s left${s.below ? `, floor probe ${f(r.belowDh)} m off and ${f(r.belowDy)} m under` : ''})`);
  assert(Math.abs(r.item[1] - s.y) < 0.4, `${what}: the revive item lies on the surface (y ${f(r.item[1])})`);
  assert(r.offered, `${what}: the host on the same level is offered the revive (${f(r.dh)} m, reach ${r.reach})`);
  if (s.below) assert(!r.belowOffered && r.belowDh < r.reach, `${what}: not offered from the floor below (${f(r.belowDh)} m off, ${f(r.belowDy)} m under)`);
  assert(r.left > 0 && r.left <= 30, `${what}: inside the 30 s window (${f(r.left)} s left)`);

  await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`); it.onUse(it, 'local'); }, clientId);
  await until(B, () => window.__app.current.player.alive, null, 8000, `${what}: the host revives the client`);
  await until(B, onLevel, s.y, 10000, `${what}: the client is back up on the surface`);
  const used = await GA(() => window.__app.current.net.reviveClock.used);
  assert(used === u0 + 1, `${what}: one revive of the team budget used (${u0} -> ${used})`);
  return 1;
}
