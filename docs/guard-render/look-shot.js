(async () => {
  // guard-render S1 look check: one guard close up. MODE is replaced by sed: off | thermal | night.
  // Untested placeholder camera: Marlow Yard bay S1 (ctcourse), guard 3 m in front of the player.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 600 && !(globalThis.__app?.current?.player && globalThis.__app.current.enemyMgr); i++) await sleep(250);
  const g = globalThis.__app.current;
  const em = g.enemyMgr;
  const V = g.player.position.constructor;
  g.target.damageMul = 0;
  em.stealth = true;
  for (const e of [...em.enemies]) em.despawn(e);
  em.maxAlive = 1;
  g.player.controller.teleport(new V(3.5, 0, 12.8), Math.PI / 2);
  await sleep(500);
  const e = em.spawn('grunt', new V(6.5, 0, 12.8), false, -Math.PI / 2);
  if (!e) return 'no guard spawned';
  e.passive = true;
  g.vision.set('MODE');
  await sleep(1500);
  g.photoFreeze(true);
  document.body.classList.add('photo-mode');
  const gp = e.pos;
  const cam = g.photoCamera();
  cam.position.set(gp.x - 2.4, gp.y + 1.6, gp.z - 0.8);
  cam.setTarget(new V(gp.x, gp.y + 1.1, gp.z));
  for (let i = 0; i < 40 && !g.scene.isReady(); i++) await sleep(250);
  await sleep(1500);
  return `guard at ${gp.x.toFixed(1)} ${gp.y.toFixed(1)} ${gp.z.toFixed(1)} merge=${new URLSearchParams(location.search).get('guardmerge') !== '0'}`;
})()
