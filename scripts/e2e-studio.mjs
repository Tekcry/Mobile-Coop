// (anim-studio) The Anim Studio: `?autostart=studio` boots the stage with the tuner panel docked and its Studio section;
// the loop player plays a keyed clip in place, paused a key step moves the phase by one key (1 / frames) and the drive
// is on Wren's graph; mirror reaches the drive; a moving state walks the circle; the game speed goes to 2x inside the
// studio; a slider change undoes; a preset saves to the tuner's IndexedDB store and loads back; the pause menu has no
// studio row inside the studio; leaving to the main menu puts the time scale back to 1 and leaves no studio state.
// (tuner-ui) Picking a loop sets the tuner's state; a walk state on the spot keeps its root in place while the gait runs;
// a side snap holds the camera to her facing while she turns; the pause menu stops a moving loop.
// (marlow-bays slice T) Keyboard and mouse: the open tuner leaves the pointer free in drag view (the default); a left
// drag on the scene turns the camera; F4 and the header button switch to the game camera and back. A row picked by the
// mouse is marked in the panel and moves the scene marker to its joint; the camera tab has no body marker. The Keyed box
// plays the state's keyed clip and, cleared, the procedural state. A moving state picked in the Body tab's Joints list
// plays its loop; on the spot (the header toggle, F8) she holds her root over 2 s of play, off she walks.
// (marlow-bays item 14) The stage lights (key, fill, rim, ambient) light her meshes, keep their offset in her frame as
// she walks, and the Stage light slider scales them.
// (marlow-bays T1a) A key step lands on the clip's next key (its mirrored half too). The Keys tab: a clip and key picked
// plays that clip on the spot paused on that key, the readout names it and its mirror, the key buttons and F1 / F2 step it
// with the picker following, the edited bone is marked; a forearm twist edit turns the forearm bone; Mirror off lets the
// arms differ. The playback bar shows on every tab (F9 plays / pauses); a weapon, a climb move and a co-op role picked in
// a tab play; the aim stances (standing, crouched still and moving) play with the picked gun.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
const G = (f, a) => page.evaluate(f, a);
const st = () => G(() => window.__studio.state());
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active, null, { timeout: 90000 });
  await frames(page, 10);
  const s0 = await G(() => ({
    map: window.__app.current.world.map.id,
    panel: !document.querySelector('.anim-tune').hidden,
    section: !document.querySelector('.anim-tune-studio').hidden,
    entries: window.__studio.entries(),
    menu: !!document.querySelector('.main-menu'),
  }));
  assert(s0.map === 'studio' && s0.panel && s0.section, `the studio boots with the tuner panel and its Studio section (${JSON.stringify({ ...s0, entries: s0.entries.length })})`);
  assert(s0.entries.includes('keyed:walk') && s0.entries.includes('keyed:guard_choke_sag') && s0.entries.includes('state:aimStrafe'), `the loop list has the keyed clips and the states (${s0.entries.length})`);

  // a keyed clip in place: paused, one key forward moves the phase onto the next key ((marlow-bays T1a) the clip's own
  // keys: the walk's 4 keys and their mirrored half, 8 a cycle)
  await G(() => window.__studio.pick('keyed:walk'));
  await frames(page, 12);
  await G(() => window.__studio.pause());
  await frames(page, 3);
  const a = await st();
  const drive = () => G(() => { const d = window.__app.current.player.rig.graph.drive; return d ? { phase: d.phase, mirror: d.mirror, clip: d.clip?.name ?? '' } : null; });
  const d0 = await drive();
  assert(a.frames === 32 && a.keys === 8 && d0 && d0.clip === 'walk' && (await G(() => window.__app.loop.timeScale)) === 0, `keyed walk on Wren's graph, paused (frames ${a.frames}, keys ${a.keys}, drive ${JSON.stringify(d0)})`);
  await G(() => window.__studio.step(1));
  await frames(page, 3);
  const p1 = (await st()).phase;
  await G(() => window.__studio.step(1));
  await frames(page, 3);
  const ks2 = await st();
  const p2 = ks2.phase;
  const dp = (((p2 - p1) % 1) + 1) % 1;
  assert(Math.abs(dp - 1 / 8) < 1e-6 && Math.abs(p1 * 8 - Math.round(p1 * 8)) < 1e-6 && ks2.onKey, `a key step moves the phase onto the next key (${p1.toFixed(4)} -> ${p2.toFixed(4)}, key ${ks2.key + 1} of ${ks2.keys})`);
  await G(() => window.__studio.step(-1));
  await frames(page, 3);
  assert(Math.abs((await st()).phase - p1) < 1e-6 && Math.abs((await drive()).phase - p1) < 1e-6, 'a key back returns to it (the drive holds the phase)');
  await frames(page, 10);
  assert(Math.abs((await st()).phase - p1) < 1e-6, 'paused, the phase stays');
  await G(() => window.__studio.mirror(true));
  await frames(page, 3);
  assert((await st()).mirror && (await drive()).mirror, 'mirror reaches the drive');
  await G(() => window.__studio.mirror(false));

  // play at 2x (inside the studio only)
  await G(() => window.__studio.play());
  await G(() => window.__studio.speed(2));
  await frames(page, 3);
  assert((await G(() => window.__app.loop.timeScale)) === 2, 'the game speed goes to 2x in the studio');
  await G(() => window.__studio.speed(1));

  // (tuner-ui) picking a loop sets the tuner's state to match (the body state and the clip's keys)
  await G(() => window.__studio.pick('keyed:crouch_walk'));
  await frames(page, 3);
  const lg = await G(() => ({ body: window.__animTune.group('body'), keys: window.__animTune.group('keys') }));
  assert(lg.body === 'crouchWalk' && lg.keys.startsWith('key.crouch_walk.'), `picking a loop sets the tuner's state (${JSON.stringify(lg)})`);
  const pos = () => G(() => { const g = window.__app.current; const p = g.player.position; return { x: p.x, z: p.z, v: g.player.controller.speed, yaw: g.player.rig.root.rotation.y, drive: g.player.rig.graph.drive }; });

  // (tuner-ui) a walk state on the spot (the default): the gait runs, the root stays within a few cm
  await G(() => window.__studio.spot(true));
  await G(() => window.__studio.pick('state:walk'));
  await frames(page, 3);
  const sp0 = await pos();
  await G(() => window.__app.loop.stepHeadless(2));
  await frames(page, 3);
  const sp1 = await pos();
  const spMoved = Math.hypot(sp1.x - sp0.x, sp1.z - sp0.z);
  assert(spMoved < 0.05 && sp1.v > 0.8, `a walk state on the spot keeps the root in place while the gait runs (${spMoved.toFixed(3)} m, speed ${sp1.v.toFixed(2)} m/s)`);

  // a procedural state walks the circle (synthesised input), loop on the spot off
  await G(() => window.__studio.spot(false));
  await frames(page, 3);
  const w0 = await pos();
  await G(() => window.__app.loop.stepHeadless(2));
  await frames(page, 3);
  const w1 = await pos();
  const moved = Math.hypot(w1.x - w0.x, w1.z - w0.z);
  assert(moved > 0.5 && w1.drive === null, `state walk moves the player by synthesised input, no drive (${moved.toFixed(2)} m in 2 s)`);

  // (tuner-ui) a camera snap holds: the orbit keeps its angle to her facing while she turns on the circle
  await G(() => window.__animTune.lock('side'));
  await frames(page, 4);
  const camRel = () => G(() => { const g = window.__app.current; const f = g.player.cam.free; const d = f ? f.yaw - f.bodyYaw : NaN; return { rel: Math.atan2(Math.sin(d), Math.cos(d)), yaw: g.player.rig.root.rotation.y, lock: window.__animTune.freeState().lock, pad: window.__animTune.pad().mode }; });
  const c0 = await camRel();
  await G(() => window.__app.loop.stepHeadless(1.5));
  await frames(page, 4);
  const c1 = await camRel();
  const turned = Math.abs(Math.atan2(Math.sin(c1.yaw - c0.yaw), Math.cos(c1.yaw - c0.yaw)));
  assert(c0.lock === 'side' && c0.pad === 'tuner' && turned > 0.3 && Math.abs(c1.rel - c0.rel) < 0.02, `a side snap holds the camera to her facing as she turns (the angle to the yaw the lock reads) (turned ${turned.toFixed(2)} rad, angle ${c0.rel.toFixed(3)} -> ${c1.rel.toFixed(3)}, pad ${c0.pad})`);
  await G(() => window.__animTune.unlock());
  await G(() => window.__animTune.free('off'));

  // (tuner-ui) pause stops the player: a moving loop holds still under the pause menu
  await frames(page, 3);
  await G(() => window.__app.current.pause());
  await frames(page, 3);
  const pz0 = await pos();
  await frames(page, 30);
  const pz1 = await pos();
  assert(Math.hypot(pz1.x - pz0.x, pz1.z - pz0.z) < 1e-4 && Math.abs(pz1.yaw - pz0.yaw) < 1e-4, `pause stops the player (${Math.hypot(pz1.x - pz0.x, pz1.z - pz0.z).toFixed(5)} m)`);
  await G(() => window.__app.screens.top.resume());
  await frames(page, 3);
  await G(() => window.__studio.spot(true));
  await G(() => window.__studio.pick('state:idle'));

  // (anim-studio-2) a co-op pair: two Wren puppets posed from one clock; paused and scrubbed into the boost, A is
  // tossed up off B's cupped hands, B braced on the floor; a key step moves both
  await G(() => window.__studio.pick('pair:boost'));
  await frames(page, 4);
  await G(() => window.__studio.pause());
  const cyc = (await G(() => window.__studio.pair())).cycle;
  await G((v) => window.__studio.seek(v), (1.4 + 0.6) / cyc);
  await frames(page, 4);
  const pr = await G(() => window.__studio.pair());
  assert(pr.rigs === 2 && cyc > 3, `the pair has two operators (${pr.rigs}, cycle ${cyc})`);
  assert(pr.aState === 'boost' && pr.bState === 'assist' && pr.aGroup === 'team.boost.a' && pr.bGroup === 'team.boost.b', `the roles are in the team states (${pr.aState} / ${pr.bState}, ${pr.aGroup} / ${pr.bGroup})`);
  assert(pr.ay > 0.5 && Math.abs(pr.by) < 0.05 && pr.tA === pr.tB, `A boosted up (${pr.ay.toFixed(2)} m), B on the floor (${pr.by.toFixed(2)}), one clock (${pr.tA.toFixed(3)} / ${pr.tB.toFixed(3)})`);
  await G(() => window.__studio.step(1));
  await frames(page, 3);
  const pr2 = await G(() => window.__studio.pair());
  assert(Math.abs(pr2.tA - pr.tA - 1 / 30) < 0.01 && pr2.tA === pr2.tB, `a key step moves both by one frame (${pr.tA.toFixed(3)} -> ${pr2.tA.toFixed(3)})`);
  await G(() => window.__studio.play());

  // (anim-studio-2) a traversal loop: Wren walks to the ladder and attaches by the synthesised Y; then back to the middle
  await G(() => window.__studio.pick('trav:ladder'));
  let att = '';
  for (let i = 0; i < 16 && att !== 'ladder'; i++) {
    await G(() => window.__app.loop.stepHeadless(0.5));
    att = (await G(() => window.__studio.pair())).attach;
  }
  assert(att === 'ladder', `the ladder loop reaches the ladder (${att}, ${JSON.stringify(await G(() => window.__studio.pair()))})`);
  await G(() => window.__studio.pick('state:idle'));
  await frames(page, 4);
  const home = await G(() => { const p = window.__app.current.player.position; return { x: p.x, z: p.z, att: window.__app.current.traversal.attached }; });
  assert(Math.hypot(home.x - 14, home.z - 14) < 0.5 && !home.att, `back in the middle, off the ladder (${home.x.toFixed(2)}, ${home.z.toFixed(2)})`);

  // (marlow-bays item 9) the mouse mode: drag view by default, no pointer lock
  await G(() => window.__animTune.free('off'));
  await frames(page, 3);
  const mm0 = await G(() => ({ ...window.__animTune.mouse(), lockEl: !!document.pointerLockElement, gamecam: document.querySelector('.anim-tune').classList.contains('tt-gamecam') }));
  assert(mm0.mode === 'drag' && mm0.free && !mm0.locked && !mm0.lockEl && !mm0.gamecam && mm0.button === 'Mouse: drag view', `tuner open: drag view, the pointer free (${JSON.stringify(mm0)})`);
  // a point on the scene, clear of the panel and the overlay
  const at = await G(() => {
    const c = window.__app.canvas;
    const r = c.getBoundingClientRect();
    for (const [fx, fy] of [[0.3, 0.55], [0.25, 0.75], [0.4, 0.85], [0.15, 0.6], [0.5, 0.9]]) {
      const x = r.left + r.width * fx;
      const y = r.top + r.height * fy;
      if (document.elementFromPoint(x, y) === c) return { x, y };
    }
    return null;
  });
  assert(!!at, 'a point on the scene clear of the panel');
  const camYaw = () => G(() => window.__app.current.player.cam.camera.rotation.y);
  const y0 = await camYaw();
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 80, at.y, { steps: 4 });
  const midDrag = await G(() => window.__animTune.mouse().dragging);
  await page.mouse.move(at.x + 160, at.y, { steps: 4 });
  await page.mouse.up();
  await frames(page, 4);
  const y1 = await camYaw();
  const dYaw = Math.abs(Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)));
  const mm1 = await G(() => ({ ...window.__animTune.mouse(), lockEl: !!document.pointerLockElement }));
  assert(midDrag && dYaw > 0.1 && !mm1.dragging && !mm1.lockEl, `a left drag on the scene turns the camera, no capture (${dYaw.toFixed(3)} rad, dragging mid-drag ${midDrag})`);
  // the header button: the game camera (the panel ignores the mouse but this button); F4: back to drag view; F4 twice
  await page.click('.anim-tune .anim-tune-mouse');
  await frames(page, 2);
  const mm2 = await G(() => ({ ...window.__animTune.mouse(), gamecam: document.querySelector('.anim-tune').classList.contains('tt-gamecam') }));
  assert(mm2.mode === 'game' && !mm2.free && mm2.gamecam && mm2.button === 'Mouse: game camera', `the header button switches to the game camera (${JSON.stringify(mm2)})`);
  await page.keyboard.press('F4');
  await frames(page, 2);
  const mm3 = await G(() => ({ ...window.__animTune.mouse(), gamecam: document.querySelector('.anim-tune').classList.contains('tt-gamecam') }));
  assert(mm3.mode === 'drag' && mm3.free && !mm3.gamecam && mm3.button === 'Mouse: drag view', `F4: back to drag view (${JSON.stringify(mm3)})`);
  await page.keyboard.press('F4');
  await frames(page, 2);
  const mm4 = (await G(() => window.__animTune.mouse())).mode;
  await page.keyboard.press('F4');
  await frames(page, 2);
  const mm5 = await G(() => window.__animTune.mouse());
  assert(mm4 === 'game' && mm5.mode === 'drag' && mm5.free, `F4 toggles the mode (${mm4}, then ${mm5.mode})`);

  // (marlow-bays item 10) a row picked by the mouse: marked in the panel, the scene marker on its joint
  await G(() => {
    window.__animTune.tab('body');
    const sel = document.querySelector('.anim-tune-part-body');
    sel.value = 'joint';
    sel.dispatchEvent(new Event('change'));
  });
  await frames(page, 2);
  const clickRow = async (key) => {
    const p = await G((k) => {
      const inp = document.querySelector(`.anim-tune input[data-pad="${k}"]`);
      const name = inp?.closest('[data-pad-row]')?.querySelector('.tt-name');
      if (!name) return null;
      name.scrollIntoView({ block: 'center' });
      const r = name.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, key);
    assert(!!p, `the row ${key} is shown`);
    await page.mouse.click(p.x, p.y);
    await frames(page, 4);
    return G(() => window.__animTune.selected());
  };
  const s1 = await clickRow('s:joint:elbowR_x');
  const mark1 = await G(() => !!document.querySelector('.anim-tune .tt-row.tt-sel input[data-pad="s:joint:elbowR_x"]'));
  assert(s1.section === 'joint' && s1.kind === 'joint' && s1.a === 'elbowR' && s1.row && mark1 && s1.line.includes('Right elbow'), `a picked row is marked and names its joint (${JSON.stringify({ ...s1, mark: undefined })})`);
  assert(s1.mark.shown && !(await G(() => document.querySelector('.anim-tune-marker-overlay').hidden)), `the scene marker shows on the right elbow (${JSON.stringify(s1.mark)})`);
  const s2 = await clickRow('s:joint:kneeL_x');
  const moved2 = Math.hypot(s2.mark.ax - s1.mark.ax, s2.mark.ay - s1.mark.ay);
  const one = await G(() => document.querySelectorAll('.anim-tune .tt-row.tt-sel').length);
  assert(s2.a === 'kneeL' && s2.row && s2.mark.shown && moved2 > 5 && one === 1, `another row moves the marker to its joint (${s2.a}, ${moved2.toFixed(1)} px, ${one} row marked)`);
  await G(() => window.__animTune.tab('camera'));
  await frames(page, 3);
  const s3 = await G(() => window.__animTune.selected());
  assert(s3.kind === 'camera' && !s3.mark.shown, `the camera tab: no body marker (${s3.kind}, ${s3.mark.shown})`);
  await G(() => window.__animTune.tab('view'));

  // (marlow-bays item 11) the Keyed box: the state's keyed clip, cleared the procedural state
  await G(() => window.__studio.pick('state:walk'));
  await frames(page, 4);
  const k0 = await G(() => window.__studio.keyedState());
  assert(!k0.checked && !k0.disabled, `a state with a keyed clip: the box clear and enabled (${JSON.stringify(k0)})`);
  await G(() => window.__studio.keyed(true));
  await frames(page, 8);
  const k1 = await G(() => window.__studio.keyedState());
  const kd1 = await drive();
  const kf1 = (await st()).frames;
  assert(k1.checked && k1.entry === 'keyed:walk' && kd1?.clip === 'walk' && kf1 > 0, `ticked: the walk plays its keyed clip (${JSON.stringify(k1)}, drive ${JSON.stringify(kd1)}, ${kf1} keys)`);
  await G(() => window.__studio.keyed(false));
  await frames(page, 8);
  const k2 = await G(() => window.__studio.keyedState());
  const kd2 = await drive();
  const kf2 = (await st()).frames;
  assert(!k2.checked && k2.entry === 'state:walk' && kd2 === null && kf2 === 0, `cleared: the procedural walk (${JSON.stringify(k2)}, drive ${JSON.stringify(kd2)}, ${kf2} keys)`);
  await G(() => window.__studio.pick('keyed:wall_idle'));
  await frames(page, 3);
  const k3 = await G(() => window.__studio.keyedState());
  assert(k3.checked && k3.disabled, `a keyed-only clip: ticked and greyed (${JSON.stringify(k3)})`);
  await G(() => window.__studio.pick('state:idle'));
  await frames(page, 4);

  // (marlow-bays item 13) a moving state picked in a non-View tab plays its loop; on the spot holds her root in live play
  await G(() => window.__studio.spot(true));
  await G(() => {
    window.__animTune.tab('body');
    const part = document.querySelector('.anim-tune-part-body');
    part.value = 'joint';
    part.dispatchEvent(new Event('change'));
    const lv = document.querySelector('.anim-tune-level-joint-0');
    lv.value = 'walk';
    lv.dispatchEvent(new Event('change'));
  });
  await frames(page, 4);
  const t13 = await G(() => ({ entry: window.__studio.state().entry, tab: window.__animTune.pad().tab, spotBtn: document.querySelector('.anim-tune-spot')?.textContent ?? '', shown: !document.querySelector('.anim-tune-spot')?.hidden }));
  assert(t13.entry === 'state:walk' && t13.tab === 'body' && t13.shown && t13.spotBtn === 'On the spot: on', `a state picked in the Joints list plays its loop, the tab stays, the header shows on the spot (${JSON.stringify(t13)})`);
  // two seconds of game time in live play (not stepped)
  const simFor = async (sec) => {
    const t0 = await G(() => window.__app.current.time);
    for (let i = 0; i < 300; i++) {
      await frames(page, 5);
      if ((await G(() => window.__app.current.time)) - t0 >= sec) break;
    }
    return (await G(() => window.__app.current.time)) - t0;
  };
  const q0 = await pos();
  const sim1 = await simFor(2);
  const q1 = await pos();
  const drift = Math.hypot(q1.x - q0.x, q1.z - q0.z);
  assert(sim1 >= 2 && drift < 0.05 && q1.v > 0.8, `on the spot the walk holds her root in live play (${drift.toFixed(3)} m over ${sim1.toFixed(2)} s, speed ${q1.v.toFixed(2)} m/s)`);
  await page.keyboard.press('F8');
  await frames(page, 2);
  const o13 = await G(() => ({ spot: window.__studio.state().spot, btn: document.querySelector('.anim-tune-spot').textContent }));
  const stage = () => G(() => ({ lights: window.__studioStage.lights(), root: window.__studioStage.root() }));
  // a light's offset in her frame (forward, right, up)
  const local = (l, r) => {
    const dx = l.x - r.x;
    const dz = l.z - r.z;
    const s = Math.sin(r.yaw);
    const c = Math.cos(r.yaw);
    return { f: dx * s + dz * c, r: dx * c - dz * s, u: l.y - r.y };
  };
  const L0 = await stage();
  const q2 = await pos();
  const sim2 = await simFor(2);
  const q3 = await pos();
  const L1 = await stage();
  const offs = L0.lights.map((l, i) => {
    const a = local(l, L0.root);
    const b = local(L1.lights[i], L1.root);
    return Math.hypot(a.f - b.f, a.r - b.r, a.u - b.u);
  });
  const rootMoved = Math.hypot(L1.root.x - L0.root.x, L1.root.z - L0.root.z);
  assert(
    L0.lights.length === 4 && L0.lights.every((l) => l.enabled && l.meshes > 0 && l.intensity > 0) && rootMoved > 0.5 && offs.every((d) => d < 0.1),
    `the stage lights light her and follow her root (${L0.lights.map((l) => `${l.name} ${l.intensity.toFixed(2)} on ${l.meshes}`).join(', ')}; root moved ${rootMoved.toFixed(2)} m; offset change ${offs.map((d) => d.toFixed(3)).join(' ')})`,
  );
  await G(() => window.__studio.stageLight(0.5));
  await frames(page, 3);
  const L2 = await stage();
  await G(() => window.__studio.stageLight(1));
  await frames(page, 3);
  const L3 = await stage();
  assert(L2.lights.every((l, i) => Math.abs(l.intensity - L3.lights[i].intensity * 0.5) < 1e-6) && L3.lights[0].intensity > 0, `the Stage light slider scales them (key ${L3.lights[0].intensity.toFixed(2)} -> ${L2.lights[0].intensity.toFixed(2)} at 0.5)`);
  const walked = Math.hypot(q3.x - q2.x, q3.z - q2.z);
  assert(!o13.spot && o13.btn === 'On the spot: off' && walked > 0.5, `F8: on the spot off, she walks (${walked.toFixed(2)} m over ${sim2.toFixed(2)} s, ${JSON.stringify(o13)})`);
  await page.click('.anim-tune .anim-tune-spot');
  await frames(page, 2);
  assert((await st()).spot, 'the header button turns on the spot back on');
  await G(() => window.__animTune.tab('view'));
  await G(() => window.__studio.pick('state:idle'));
  await frames(page, 4);

  // (marlow-bays T1a, item 15) the Keys tab: a clip and key picked plays that clip on the spot, paused on that key; the
  // readout names the key and its mirror; the key buttons and F1 / F2 step it with the picker following; the hint shows
  await G(() => window.__animTune.tab('keys'));
  await G(() => {
    window.__animTune.pickLevel('keys', 0, 'jog');
    window.__animTune.pickLevel('keys', 1, '1');
  });
  await frames(page, 4);
  const k15 = await G(() => ({ s: window.__studio.state(), keys: window.__animTune.keys(), frozen: window.__studio.frozen(), d: window.__app.current.player.rig.graph.drive?.phase ?? -1 }));
  assert(
    k15.s.entry === 'keyed:jog' && k15.frozen && k15.s.spot && k15.s.key === 1 && k15.s.onKey && Math.abs(k15.d - 0.125) < 1e-6,
    `a Keys pick plays the clip paused on the key (${JSON.stringify({ entry: k15.s.entry, key: k15.s.key, onKey: k15.s.onKey, phase: k15.d, frozen: k15.frozen })})`,
  );
  assert(k15.keys.readout.startsWith('jog - key 2 of 8 (mirror of 6), frame 4') && k15.keys.hint === 'Key edits change one pose; whole-cycle changes go in the state tabs.', `the readout names the key and its mirror, the hint shows (${JSON.stringify(k15.keys)})`);
  assert(k15.keys.mirror && k15.keys.list.join(',') === '0,1,2,3', `the Mirror box is on and the list shows the own keys (${k15.keys.list.join(',')})`);
  await G(() => window.__animTune.keysStep(1));
  await frames(page, 12);
  const k15b = await G(() => ({ key: window.__studio.state().key, group: window.__animTune.keys().group }));
  assert(k15b.key === 2 && k15b.group === 'key.jog.2', `"Key ▶" steps a key and the picker follows (${JSON.stringify(k15b)})`);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('F2');
    await frames(page, 3);
  }
  await frames(page, 12);
  const k15c = await G(() => ({ key: window.__studio.state().key, keys: window.__animTune.keys() }));
  assert(k15c.key === 5 && k15c.keys.group === 'key.jog.1' && k15c.keys.readout.includes('key 6 of 8 (mirror of 2)'), `F2 steps on; on the mirrored half the picker shows the key it mirrors (${JSON.stringify({ key: k15c.key, group: k15c.keys.group, readout: k15c.keys.readout })})`);
  await page.keyboard.press('F1');
  await frames(page, 12);
  assert((await st()).key === 4, `F1 steps back (${(await st()).key})`);
  // the edited bone is marked: the forearm twist's row marks the forearm
  await G(() => window.__animTune.select('s:keys:armR_twist'));
  await frames(page, 4);
  const k15d = await G(() => window.__animTune.selected());
  assert(k15d.a === 'elbowR' && k15d.b === 'wristR' && k15d.mark.shown && k15d.line.includes('Right forearm twist'), `the edited bone is marked (${JSON.stringify({ a: k15d.a, b: k15d.b, shown: k15d.mark.shown, line: k15d.line })})`);

  // (T1a, item 17) a forearm twist key edit turns the forearm bone about itself (the elbow stays where it is)
  const bones = () =>
    G(() => {
      const r = window.__app.current.player.rig;
      const q = (n) => {
        n.computeWorldMatrix(true);
        const a = n.absoluteRotationQuaternion;
        return [a.x, a.y, a.z, a.w];
      };
      const p = (n) => {
        const v = n.getAbsolutePosition();
        return [v.x, v.y, v.z];
      };
      return { elR: q(r.elbowR), elRp: p(r.elbowR), wrRp: p(r.wristR), elLp: p(r.elbowL), wrLp: p(r.wristL) };
    });
  const qAng = (a, b) => (2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180) / Math.PI;
  await G(() => window.__studio.showKey('walk', 1));
  await frames(page, 6);
  const t0 = await bones();
  await G(() => window.__animTune.set('key.walk.1', 'armR_twist', 45));
  await frames(page, 6);
  const t1 = await bones();
  const twist = qAng(t0.elR, t1.elR);
  const elMoved = Math.hypot(t1.elRp[0] - t0.elRp[0], t1.elRp[1] - t0.elRp[1], t1.elRp[2] - t0.elRp[2]);
  assert(twist > 30 && twist < 60 && elMoved < 0.005, `a forearm twist edit turns the forearm bone (${twist.toFixed(1)} deg, the elbow moved ${(elMoved * 1000).toFixed(1)} mm)`);
  await G(() => window.__animTune.set('key.walk.1', 'armR_twist', 0));

  // (T1a, item 18) Mirror on: a left arm edit at key 2 shows on the right arm at key 6; Mirror off: the right arm at key 6
  // is set back on its own while the left arm at key 2 keeps the edit (the arms differ)
  const foreDir = (b, side) => {
    const e = side === 'R' ? b.elRp : b.elLp;
    const w = side === 'R' ? b.wrRp : b.wrLp;
    const v = [w[0] - e[0], w[1] - e[1], w[2] - e[2]];
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  const ang = (u, v) => (Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180) / Math.PI;
  const atKey = async (k) => {
    await G((kk) => window.__studio.showKey('walk', kk), k);
    await frames(page, 6);
    return bones();
  };
  const b2 = await atKey(1);
  const b6 = await atKey(5);
  await G(() => window.__animTune.set('key.walk.1', 'armL_elbow', 30));
  await frames(page, 4);
  const m6 = await atKey(5);
  assert(ang(foreDir(m6, 'R'), foreDir(b6, 'R')) > 15, `Mirror on: the left arm's key 2 edit shows on the right arm at key 6 (${ang(foreDir(m6, 'R'), foreDir(b6, 'R')).toFixed(1)} deg)`);
  await G(() => window.__animTune.tab('keys'));
  await G(() => window.__animTune.keysMirror(false));
  await frames(page, 4);
  const k18 = await G(() => window.__animTune.keys());
  assert(!k18.mirror && k18.list.length === 8, `Mirror off: every key of the cycle is listed (${JSON.stringify({ mirror: k18.mirror, list: k18.list })})`);
  await G(() => window.__animTune.set('key.walk.5', 'armR_elbow', 0));
  await frames(page, 4);
  const o6 = await atKey(5);
  const o2 = await atKey(1);
  const r6 = ang(foreDir(o6, 'R'), foreDir(b6, 'R'));
  const l2 = ang(foreDir(o2, 'L'), foreDir(b2, 'L'));
  assert(r6 < 3 && l2 > 15, `Mirror off: the arms differ (right at key 6 back to base ${r6.toFixed(1)} deg, left at key 2 still bent ${l2.toFixed(1)} deg)`);
  await G(() => {
    window.__animTune.keysMirror(true);
    window.__animTune.set('key.walk.1', 'armL_elbow', 0);
  });
  await frames(page, 3);

  // (T1a, item 16) the playback bar on every tab: shown on the Body tab, F9 plays / pauses, a weapon picked in a tab
  // swaps her gun (a holstered loop plays the low ready), a climb move and a co-op role play their loops
  await G(() => window.__animTune.tab('body'));
  await frames(page, 3);
  const pb = await G(() => ({ r: window.__studio.readout(), play: !!document.querySelector('.anim-tune-playbar .studio-play')?.offsetParent, spot: !!document.querySelector('.anim-tune-playbar .anim-tune-spot')?.offsetParent, f: window.__studio.frozen() }));
  assert(pb.r.shown && pb.play && pb.spot && pb.r.text.includes('walk - key'), `the playback bar shows on the Body tab with the clip's key readout (${JSON.stringify(pb)})`);
  await page.keyboard.press('F9');
  await frames(page, 3);
  const f1 = await G(() => window.__studio.frozen());
  await page.keyboard.press('F9');
  await frames(page, 3);
  assert(pb.f && !f1 && (await G(() => window.__studio.frozen())), 'F9 plays and pauses from any tab');
  await G(() => window.__studio.play());
  await G(() => window.__studio.pick('state:idle'));
  await frames(page, 4);
  await G(() => window.__animTune.tab('hands'));
  await G(() => window.__animTune.pickLevel('hand', 0, 'pistol'));
  await frames(page, 4);
  const w16 = await G(() => window.__studio.state());
  assert(w16.weapon === 'pistol' && w16.entry === 'state:lowReady', `a weapon picked in a tab swaps the stance (${w16.weapon}, ${w16.entry})`);
  const gunClass = () => G(() => window.__app.current.weapons.current.def.class);
  let gc = '';
  for (let i = 0; i < 20 && gc !== 'pistol'; i++) {
    await G(() => window.__app.loop.stepHeadless(0.5));
    gc = await gunClass();
  }
  assert(gc === 'pistol', `the pistol comes out (${gc})`);
  await G(() => {
    window.__animTune.tab('body');
    const part = document.querySelector('.anim-tune-part-body');
    part.value = 'trav';
    part.dispatchEvent(new Event('change'));
    window.__animTune.pickLevel('trav', 0, 'vault');
  });
  await frames(page, 3);
  const tv = (await st()).entry;
  await G(() => window.__animTune.pickLevel('team_boost', 0, 'b'));
  await frames(page, 3);
  const tp = (await st()).entry;
  assert(tv === 'trav:vault' && tp === 'pair:boost', `a climb move and a co-op role play their loops (${tv}, ${tp})`);

  // (T1a, item 19) the aim stances: standing, crouched still, crouched moving, each with the picked gun
  const aimLoop = async (id, body, sec) => {
    await G((x) => window.__studio.pick(x), id);
    let b = '';
    for (let i = 0; i < 24 && b !== body; i++) {
      await G(() => window.__app.loop.stepHeadless(0.25));
      await frames(page, 2);
      b = await G(() => window.__animTune.state.body);
    }
    return { b, gun: await gunClass(), ads: await G(() => window.__app.current.player.ads) };
  };
  const a1 = await aimLoop('state:aimStill', 'aimStill');
  assert(a1.b === 'aimStill' && a1.gun === 'pistol' && a1.ads, `aim standing plays with the pistol (${JSON.stringify(a1)})`);
  await G(() => window.__studio.weapon('rifle'));
  const a2 = await aimLoop('state:crouchAim', 'aimCrouch');
  assert(a2.b === 'aimCrouch' && a2.gun === 'rifle' && a2.ads, `crouch aim standing plays with the rifle (${JSON.stringify(a2)})`);
  const a3 = await aimLoop('state:crouchAimFwd', 'aimCrouchMove');
  assert(a3.b === 'aimCrouchMove' && a3.gun === 'rifle', `crouch aim moving plays (${JSON.stringify(a3)})`);
  await G(() => window.__studio.pick('state:idle'));
  await G(() => window.__animTune.tab('view'));
  await frames(page, 4);

  // undo a slider change
  const T = () => G(() => window.__animTune.get('walk', 'trackMul'));
  await G(() => window.__animTune.set('walk', 'trackMul', 1.2));
  await G(() => window.__animTune.settle());
  assert((await T()) === 1.2, 'a slider set');
  await G(() => window.__animTune.undo());
  assert((await T()) === 1, `undo puts it back (${await T()})`);
  await G(() => window.__animTune.redo());
  assert((await T()) === 1.2, 'redo sets it again');
  await G(() => window.__animTune.undo());

  // a preset saved by name, stored, loaded back
  await G(() => window.__animTune.presetsLoaded());
  const K = () => G(() => window.__animTune.get('walk', 'kneeOutMul'));
  await G(() => {
    window.__animTune.set('walk', 'kneeOutMul', 1.3);
    window.__animTune.presetSave('e2e studio');
    window.__animTune.set('walk', 'kneeOutMul', 1);
  });
  assert((await K()) === 1 && (await G(() => window.__animTune.presets())).includes('e2e studio'), 'a preset saved by name');
  await G(() => window.__animTune.presetLoad('e2e studio'));
  assert((await K()) === 1.3, `the preset loads back (${await K()})`);
  const readStored = () => G(async () => {
    const dbs = await indexedDB.databases();
    const name = dbs.find((d) => d.name?.endsWith('-animtune'))?.name;
    if (!name) return null;
    const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const v = await new Promise((res, rej) => { const r = db.transaction('tune', 'readonly').objectStore('tune').get('presets'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    return v?.presets?.find((p) => p.name === 'e2e studio')?.values?.walk?.kneeOutMul ?? null;
  });
  // (the store writes asynchronously: a few tries)
  let stored = null;
  for (let i = 0; i < 20 && stored !== 1.3; i++) {
    await frames(page, 3);
    stored = await readStored();
  }
  assert(stored === 1.3, `the preset is in the tuner's IndexedDB store (${stored})`);
  await G(() => {
    window.__animTune.presetDelete('e2e studio');
    window.__animTune.set('walk', 'kneeOutMul', 1);
  });

  // pause: no studio row inside the studio; quit to the main menu
  await G(() => window.__app.current.pause());
  await frames(page, 4);
  const keys = await G(() => [...document.querySelectorAll('.pause-screen .ms-item')].map((b) => b.dataset.key).join(','));
  assert(!keys.includes('anim-studio') && keys.includes('quit'), `pause in the studio has no studio row (${keys})`);
  await G(() => document.querySelector('.pause-screen [data-key="quit"]').click());
  await frames(page, 3);
  await G(() => [...document.querySelectorAll('.dialog-buttons .btn')].find((b) => b.textContent === 'Quit').click());
  await page.waitForSelector('.main-menu', { timeout: 60000 });
  await frames(page, 5);
  const after = await G(() => ({
    st: window.__studio.state(),
    ts: window.__app.loop.timeScale,
    free: window.__animTune.freeState().mode,
    panel: document.querySelector('.anim-tune').hidden,
    overlay: document.querySelector('.studio-overlay')?.hidden ?? true,
    row: !!document.querySelector('.main-menu [data-key="anim-studio"]'),
  }));
  assert(!after.st.active && after.st.entry === 'state:idle' && !after.st.turntable && !after.st.mirror && after.ts === 1 && after.free === 'off', `leaving: time scale 1, no studio state (${JSON.stringify({ active: after.st.active, entry: after.st.entry, ts: after.ts, free: after.free })})`);
  assert(after.panel && after.overlay, 'leaving: the panel the studio opened and its overlay are closed');
  assert(after.row, 'the main menu has the Anim Studio (dev) row');
  const bad = errors.filter((e) => !/WebGL|GPU stall|swiftshader|favicon|GL Driver/i.test(e));
  assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
} finally {
  await browser.close();
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-studio OK');
