// Desktop (3.0): auto-detected on a mouse-and-keyboard 1080p window, menus scaled to it, no touch settings or
// controls, Mouse & Keyboard first (rebinding: click, press; a key moves off its old action; Backspace clears; the
// in-game action follows), the Graphics menu (presets, Custom, the frame cap), the interface switch, and the Epic
// renderer booting in a match (clustered lights, shadow casters, the post stack) without console errors; 16:10,
// 21:9 and 32:9 windows (centred menus, the HUD inset, Hor+ up to the FOV cap).
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
let browser;
try {
  // no ?platform=: detection on its own (no touch points, a fine pointer, 1920 x 1080)
  const l = await launch({ url, params: '', touch: false, viewport: { width: 1920, height: 1080 } });
  browser = l.browser;
  const { page, errors } = l;
  const G = (f, a) => page.evaluate(f, a);
  const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
  await wait(500);
  const plat = await G(() => ({ cls: document.body.className, scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(), p: window.__app.platform }));
  assert(plat.p.platform === 'desktop' && /platform-desktop/.test(plat.cls), `a mouse-and-keyboard window is desktop (${plat.p.reason})`);
  assert(plat.scale === '1.5', `menus scale to 1080p (x${plat.scale})`);
  const menuBox = await G(() => document.querySelector('.main-menu .menu-item').getBoundingClientRect().height);
  assert(menuBox > 45, `menu rows are big enough to read at 1080p (${menuBox.toFixed(0)} px)`);
  await click('.main-menu .btn', 'Settings');
  await frames(page, 4);
  const tabs = await G(() => [...document.querySelectorAll('.settings-screen .tab')].map((t) => t.dataset.tab));
  assert(tabs[0] === 'kbm' && !tabs.includes('touch'), `Mouse & Keyboard first, no Touch tab (${tabs.join(',')})`);
  // rebind reload to U
  await click('.kb-key[data-bind="reload:0"]');
  await frames(page, 2);
  const listening = await G(() => document.querySelector('.kb-key[data-bind="reload:0"]').classList.contains('listening'));
  assert(listening, 'clicking a key waits for the new one');
  await page.keyboard.press('KeyU');
  await frames(page, 2);
  let k = await G(() => ({ r: window.__app.settings.get().keys.reload, label: document.querySelector('.kb-key[data-bind="reload:0"]').textContent }));
  assert(k.r[0] === 'KeyU' && k.label === 'U', `reload rebound to U (${k.label})`);
  // a key already in use moves over: G (gadget) onto reload's second slot
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  k = await G(() => ({ r: window.__app.settings.get().keys.reload, g: window.__app.settings.get().keys.gadget, toast: document.querySelector('.toasts')?.textContent ?? '' }));
  assert(k.r.join() === 'KeyU,KeyG' && k.g.length === 0 && /moved from Gadget/.test(k.toast), `a key in use moves over (${k.toast.trim()})`);
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('Backspace');
  await frames(page, 2);
  k = await G(() => window.__app.settings.get().keys.reload);
  assert(k.join() === 'KeyU', 'Backspace clears a slot');
  await click('.kb-key[data-bind="gadget:0"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  // Graphics: presets and Custom, the frame cap
  await click('.tab', 'Graphics');
  await frames(page, 3);
  const preset = await G(() => [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelector('.choice-val').textContent);
  assert(preset === 'Epic', `Epic by default (${preset})`);
  await G(() => [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelectorAll('.choice-arrow')[0].click());
  await frames(page, 3);
  // (this page runs ?gfx=min, so the level itself stays minimal; the settings and the menu follow the preset)
  let q = await G(() => ({ p: window.__app.settings.get().video.preset, g: window.__app.settings.get().video.gfx, sh: [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Shadows/.test(r.textContent)).querySelector('.choice-val').textContent }));
  assert(q.p === 'ultra' && q.g.shadows === 'ultra' && q.g.lights === 20 && q.g.aa === 'taa' && q.g.volLights === 8 && q.sh === 'Ultra', `a preset sets every feature, the rows follow (${q.p}, shadows ${q.sh})`);
  // (3.1: a preset also sets its render scale with TAAU; Epic is native)
  const disp = await G(() => ({ s: window.__app.settings.get().video.renderScale, u: window.__app.settings.get().video.upscaler }));
  assert(disp.s === 0.9 && disp.u === 'taau', `Ultra renders at 90% with TAAU (${JSON.stringify(disp)})`);
  await G(() => [...document.querySelectorAll('.tab-panel.active .row-toggle')].find((r) => /Bloom/.test(r.textContent)).click());
  await frames(page, 2);
  q = await G(() => ({ p: window.__app.settings.get().video.preset, shown: [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelector('.choice-val').textContent }));
  assert(q.p === 'custom' && q.shown === 'Custom', 'changing a feature makes it Custom');
  await G(() => window.__app.settings.update((d) => { d.video.fpsCap = 30; }));
  const cap = await G(() => window.__app.loop.fpsCap);
  assert(cap === 30, 'the frame-rate cap reaches the loop');
  await G(() => window.__app.settings.update((d) => { d.video.fpsCap = 0; }));
  // the interface switch: Mobile brings the touch settings back
  await G(() => window.__app.settings.update((d) => { d.video.platform = 'mobile'; }));
  await frames(page, 4);
  const mob = await G(() => ({ cls: document.body.classList.contains('platform-mobile'), tabs: [...document.querySelectorAll('.settings-screen .tab')].map((t) => t.dataset.tab) }));
  assert(mob.cls && mob.tabs.includes('touch') && !mob.tabs.includes('kbm'), `Interface: Mobile (${mob.tabs.join(',')})`);
  await G(() => window.__app.settings.update((d) => { d.video.platform = 'auto'; }));
  await page.keyboard.press('Escape');
  await frames(page, 3);
  // in a match: the rebound key acts, no touch controls
  await page.goto(url + '?autostart=proving&gfx=min');
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 60000 });
  await page.keyboard.down('KeyU');
  await frames(page, 2);
  const rel = await G(() => window.__app.input.state.buttons.reload.down);
  await page.keyboard.up('KeyU');
  assert(rel, 'the rebound key reloads in a match');
  const touchShown = await G(() => { const t = document.querySelector('.touch-layer'); return !!t && getComputedStyle(t).display !== 'none' && !t.hidden; });
  assert(!touchShown, 'no touch controls on desktop');
  // the benchmark: a (shortened) flight, then the result, saved as feedback
  // (software GL renders the Warehouse at ~1 fps: a 2 s flight is ~10 frames)
  await G(() => {
    window.__bench.seconds = 2;
    window.__bench.warmup = 0.5;
    window.__app.benchmark();
  });
  await page.waitForFunction(() => /average \d+ fps, 1% low \d+ fps/.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 240000 });
  const bt = await G(() => ({ text: document.querySelector('.dialog').textContent, hudHidden: document.body.classList.contains('photo-mode') }));
  assert(!bt.hudHidden, `the benchmark reports (${bt.text.match(/Warehouse[^)]*\)/)?.[0]})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Save to feedback/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  const saved = await G(async () => (await window.__app.feedback.all()).find((e) => e.category === 'performance')?.text ?? '');
  assert(/Benchmark - Warehouse/.test(saved), 'the result is saved as a performance note');
  // every preset (3.1 ladder, desktop: Low .. Epic): five flights, one line each
  await G(() => window.__app.benchmark('presets'));
  await page.waitForFunction(() => (document.querySelector('.dialog')?.textContent?.match(/average \d+ fps/g) ?? []).length === 5, null, { timeout: 480000 });
  const lines = await G(() => window.__app.current.benchmarkLines.map((l) => l.split(':')[0]));
  assert(lines.length === 5 && ['low', 'medium', 'high', 'ultra', 'epic'].every((p, i) => new RegExp(p, 'i').test(lines[i])), `every preset runs in turn (${lines.join(' | ')})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Done/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await browser.close();

  // aspects (16:10, 21:9, 32:9): menus a centred 16:9 layout, the HUD inset on 32:9, Hor+ up to the FOV cap
  for (const [w, hh, label] of [[1280, 800, '16:10'], [2520, 1080, '21:9'], [2560, 720, '32:9']]) {
    const a = await launch({ url, params: '', touch: false, viewport: { width: w, height: hh } });
    browser = a.browser;
    const P = a.page;
    const GA = (f, x) => P.evaluate(f, x);
    await P.waitForSelector('.main-menu');
    await frames(P, 3);
    const m = await GA(() => {
      const r = document.querySelector('.screens').getBoundingClientRect();
      const it = document.querySelector('.main-menu .menu-item').getBoundingClientRect();
      return { cx: r.left + r.width / 2, w: r.width, h: r.height, item: it.left, W: innerWidth, H: innerHeight };
    });
    assert(Math.abs(m.cx - m.W / 2) < 2 && m.w <= m.H * (16 / 9) + 2 && m.h >= m.H - 2, `${label}: menus a centred layout (${m.w.toFixed(0)} x ${m.h.toFixed(0)} in ${m.W} x ${m.H})`);
    assert(m.item >= (m.W - m.w) / 2 - 1, `${label}: the menu sits inside it (x ${m.item.toFixed(0)})`);
    if (process.env.SHOTS) await P.screenshot({ path: `${process.env.SHOTS}/desk-${label.replace(':', 'x')}-menu.png` });
    await P.goto(url + '?autostart=warehouse&mode=sandbox&gfx=min');
    await P.waitForFunction(() => window.__app.current?.player, null, { timeout: 60000 });
    await GA(() => window.__app.settings.update((d) => { d.video.fovH = 100; d.video.maxFov = 120; }));
    await frames(P, 4);
    const v = await GA(() => {
      const cam = window.__app.current.player.cam.camera;
      const aspect = window.__app.engine.getAspectRatio(cam);
      const hdeg = (2 * Math.atan(Math.tan(cam.fov / 2) * aspect) * 180) / Math.PI;
      const vit = document.querySelector('.hud-vitals').getBoundingClientRect();
      const mm = document.querySelector('.hud-minimap').getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-inset'));
      return { hdeg, aspect, vit: vit.left, mm: mm.right, inset, W: innerWidth };
    });
    if (label === '32:9') {
      assert(Math.abs(v.hdeg - 120) < 1, `32:9: Hor+ stops at the widest FOV (${v.hdeg.toFixed(1)} deg)`);
      assert(v.inset === 640 && v.vit >= 640 && v.mm <= v.W - 640 + 1, `32:9: HUD panels in a centred 16:9 (inset ${v.inset}, vitals x ${v.vit.toFixed(0)}, minimap right ${v.mm.toFixed(0)})`);
    } else {
      const want = (2 * Math.atan(Math.tan(Math.atan(Math.tan((100 * Math.PI) / 360) * (9 / 16))) * v.aspect) * 180) / Math.PI;
      assert(Math.abs(v.hdeg - want) < 1 && v.inset === 0, `${label}: Hor+ (${v.hdeg.toFixed(1)} deg), HUD full width`);
    }
    if (process.env.SHOTS) await P.screenshot({ path: `${process.env.SHOTS}/desk-${label.replace(':', 'x')}-game.png` });
    const ae = a.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
    assert(ae.length === 0, `${label}: no console errors${ae.length ? ': ' + ae.slice(0, 3).join(' | ') : ''}`);
    await browser.close();
  }

  // the Epic renderer in a match (small window: software GL)
  const e = await launch({ url, params: 'autostart=warehouse&mode=clear&gfx=epic', touch: false, viewport: { width: 640, height: 360 } });
  browser = e.browser;
  await e.page.waitForFunction(() => window.__app.current?.player, null, { timeout: 180000 });
  await frames(e.page, 6);
  const r = await e.page.evaluate(() => {
    const g = window.__app.current;
    const rig = g.world.lightRig;
    const vx = g.world.voxels;
    return { clustered: rig.clustered, placed: rig.placed, shadowed: rig.shadowed, sun: !!g.world.shadow, pps: g.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name), vox: vx && { ...vx.stats, size: vx.lv.size, levels: vx.materials.length, casters: vx.meshes.filter((m) => rig.casters.includes(m)).length, meshes: vx.meshes.length } };
  });
  assert(r.vox && r.vox.size === 0.05 && r.vox.levels === 3 && r.vox.chunks > 20 && r.vox.quads > 1000, `Epic: the Warehouse in 5 cm voxels, three levels of detail (${JSON.stringify(r.vox)})`);
  assert(r.vox.casters === r.vox.meshes, 'every voxel chunk casts shadows');
  // the voxel shading made it into the compiled PBR shader (tone, AO, micro detail; not the cheap path's code)
  const shaded = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    const src = (v) => v?.meshes.find((m) => m.isEnabled() && m.subMeshes?.[0]?.effect)?.subMeshes[0].effect.fragmentSourceCode ?? '';
    return [src(w.voxels), src(w.voxelsFine)].map((s) => s.includes('m = vxMat(v)') && s.includes('vxAmbient ='));
  });
  assert(shaded.every(Boolean), `voxel chunks compile the full voxel shading (${shaded})`);
  const art = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    return { fine: w.voxelsFine && { size: w.voxelsFine.lv.size, chunks: w.voxelsFine.stats.chunks }, sky: !!w.voxels.skyTex, inside: w.voxels.skyAt(5, 1.2, 0), yard: w.voxels.skyAt(2, 1.2, -21.5), roofIn: w.voxels.roofAt(5, 0), roofYard: w.voxels.roofAt(2, -21.5), palette: w.voxels.lv.palette.length };
  });
  assert(art.fine && art.fine.size === 0.025 && art.fine.chunks > 5, `props on a 2.5 cm layer (${JSON.stringify(art.fine)})`);
  assert(art.sky && art.inside < 0.5 && art.yard > 0.8, `the sky is baked: dark under the roof, open in the yard (${art.inside.toFixed(2)} / ${art.yard.toFixed(2)})`);
  assert(art.roofIn > 5 && art.roofYard < 1, `rain stops at the roof, falls to the ground in the yard (${art.roofIn} / ${art.roofYard})`);
  assert(art.palette > 40, `the art layer's materials (${art.palette} palette entries)`);
  // GI per lamp circuit (Epic): baked, in the shader, and a switched-off circuit takes its bounce light away
  const gi = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    const vx = w.voxels;
    const src = vx.meshes.find((m) => m.isEnabled() && m.subMeshes?.[0]?.effect)?.subMeshes[0].effect.fragmentSourceCode ?? '';
    const reg = w.level.lights;
    const l = reg.lights.find((x, i) => w.giSlotOf?.[i] >= 0 && x.group >= 0 && x.on);
    const slot = l ? w.giSlotOf[reg.lights.indexOf(l)] : -1;
    const before = vx.plugins[0].giWeights[slot];
    if (l) reg.setGroup(l.group, false);
    w.frame(window.__app.current.player.position, 0);
    const after = vx.plugins[0].giWeights[slot];
    if (l) reg.setGroup(l.group, true);
    w.frame(window.__app.current.player.position, 0);
    return { groups: vx.giGroups, shader: src.includes('gsum'), slot, before, after, back: vx.plugins[0].giWeights[slot] };
  });
  assert(gi.groups > 1 && gi.shader, `GI baked per lamp circuit and in the voxel shader (${gi.groups} circuits)`);
  assert(gi.before === 1 && gi.after < 1 && gi.back === 1, `a switched-off circuit takes its bounce light away (${gi.before} -> ${gi.after} -> ${gi.back})`);
  // voxel characters (3.0 phase 3): one skinned voxel body per character, the smooth parts unseen
  const ch = await e.page.evaluate(async () => {
    const g = window.__app.current;
    const rigs = [g.player.rig, ...g.enemyMgr.enemies.map((x) => x.rig).filter((r) => r && !r.isDog)];
    const casters = g.world.lightRig.casters;
    // bones follow the joints: each bone = its node relative to the root
    const err = (r) => {
      const v = r.voxel;
      const inv = r.root.getWorldMatrix().clone().invert();
      let worst = 0;
      v.bones.forEach((b, i) => { const m = v.nodes[i].getWorldMatrix().multiply(inv).m; const l = b.getLocalMatrix().m; for (let k = 12; k < 15; k++) worst = Math.max(worst, Math.abs(m[k] - l[k])); });
      return worst;
    };
    const p = g.player.rig;
    const lens0 = p.voxel.meshes[1].getVerticesData('color').slice();
    p.setLensGlow(true);
    const lensChanged = p.voxel.meshes[1].getVerticesData('color').some((c, i) => Math.abs(c - lens0[i]) > 1e-3);
    p.setLensGlow(false);
    p.setHeadVisible(false);
    const headHidden = !p.voxel.meshes[1].isVisible && p.voxel.meshes[0].isVisible;
    p.setHeadVisible(true);
    // a ragdoll still drives its voxel body (the joints re-parented onto physics nodes)
    const victim = g.enemyMgr.enemies.find((x) => x.rig?.voxel);
    const P = g.player.position.constructor;
    victim.applyDamage({ amount: 99999, point: victim.pos.clone(), dir: new P(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'test', sourcePos: victim.pos.clone(), impulse: 1 });
    const body = g.enemyMgr.bodies.at(-1);
    await new Promise((res) => { let n = 0; const o = g.scene.onAfterRenderObservable.add(() => { if (++n >= 3) { o.remove(); res(); } }); });
    const rag = body?.['rig'];
    return {
      n: rigs.length,
      voxel: rigs.filter((r) => r.voxel).length,
      hidden: rigs.every((r) => r.parts.every((m) => !m.isVisible)),
      cast: rigs.every((r) => r.voxel.meshes.every((m) => casters.includes(m))),
      quads: p.voxel.meshes[0].getTotalIndices() / 6,
      err: Math.max(...rigs.map(err)),
      ragErr: rag?.voxel ? err(rag) : -1,
      lensChanged,
      headHidden,
    };
  });
  assert(ch.voxel === ch.n && ch.hidden, `every character is a voxel body, the smooth parts unseen (${ch.voxel} / ${ch.n})`);
  assert(ch.cast, 'voxel bodies cast shadows');
  assert(ch.quads > 500, `the operator in 2 cm voxels (${ch.quads} quads)`);
  assert(ch.err < 1e-3 && ch.ragErr >= 0 && ch.ragErr < 1e-3, `bones follow the joints, ragdolls too (${ch.err.toExponential(1)}, ${ch.ragErr.toExponential(1)})`);
  assert(ch.lensChanged && ch.headHidden, 'lens glow and the camera head fade reach the voxels');
  // voxel weapons and chips (3.0 phase 4)
  const wp = await e.page.evaluate(() => {
    const g = window.__app.current;
    const models = g.weapons.slots.map((s) => s.model).filter(Boolean);
    const casters = g.world.lightRig.casters;
    // a shot into the wall in front: the struck voxel turns to the chip colour
    const vx = g.world.voxels;
    const P = g.player.position.constructor;
    const o = g.player.position.add(new P(0, 1.2, 0));
    const f = g.player.cam.forward;
    const end = o.add(new P(f.x, 0, f.z).normalize().scale(30));
    const h = g.ballistics.ray(o, end, 1);
    let chipped = null;
    if (h.hit) {
      const color = g.ballistics.onWorldHit?.(h.point, h.normal) ?? null;
      const lv = (g.world.voxelsFine && g.world.voxelsFine.brickmap.get(...[0, 1, 2].map((a) => Math.floor((h.point.asArray()[a] - h.normal.asArray()[a] * g.world.voxelsFine.lv.size * 0.5 - g.world.voxelsFine.lv.origin[a]) / g.world.voxelsFine.lv.size))) ? g.world.voxelsFine : vx);
      const at = [0, 1, 2].map((a) => Math.floor((h.point.asArray()[a] - h.normal.asArray()[a] * lv.lv.size * 0.5 - lv.lv.origin[a]) / lv.lv.size));
      chipped = { color, now: lv.brickmap.get(...at), chip: lv.lv.chip };
    }
    return {
      n: models.length,
      voxel: models.filter((m) => m.voxel).length,
      hidden: models.every((m) => m.parts.every((p) => !p.isVisible)),
      cast: models.every((m) => m.voxel.meshes.every((x) => casters.includes(x))),
      quads: models.map((m) => m.voxel.meshes[0].getTotalIndices() / 6),
      chipped,
    };
  });
  assert(wp.n > 0 && wp.voxel === wp.n && wp.hidden && wp.cast, `the loadout's weapons are voxel models casting shadows (${wp.voxel} / ${wp.n}, ${wp.quads} quads)`);
  assert(wp.chipped && wp.chipped.color && wp.chipped.now === wp.chipped.chip, `a shot chips the struck voxel (${JSON.stringify(wp.chipped)})`);
  assert(r.placed >= 8 && r.shadowed >= 1, `Epic: real lights placed (${r.placed}, ${r.shadowed} with shadows, clustered ${r.clustered})`);
  for (const pp of ['TAA', 'ssao', 'ssr', 'volumetric', 'bloomMerge', 'imageProcessing', 'cinematic']) assert(r.pps.includes(pp), `post stack has ${pp}`);
  assert(r.pps.at(-1) === 'cinematic', 'the grade / goggles pass stays last');
  const eerrs = e.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(eerrs.length === 0, `Epic renders without console errors${eerrs.length ? ': ' + eerrs.slice(0, 4).join(' | ') : ''}`);
  await browser.close();

  // 3.0 phase 5: ray-traced reflections, TAAU, Panini (the saved settings, changed in the match)
  const u = await launch({ url, params: 'autostart=warehouse&gfx=user', touch: false, viewport: { width: 640, height: 360 } });
  browser = u.browser;
  await u.page.waitForFunction(() => window.__app.current?.player, null, { timeout: 180000 });
  await frames(u.page, 3);
  await u.page.evaluate(() => window.__app.settings.update((d) => { d.video.preset = 'custom'; d.video.gfx.reflections = 'rt'; d.video.gfx.rtRes = 'half'; d.video.upscaler = 'taau'; d.video.renderScale = 0.67; d.video.panini = 0.5; }));
  await frames(u.page, 4);
  const p5 = await u.page.evaluate(() => {
    const a = window.__app;
    const cam = a.current.player.cam.camera;
    const pps = cam._postProcesses.filter(Boolean);
    const taau = pps.find((p) => p.name === 'taau');
    return { pps: pps.map((p) => p.name), canvas: a.engine.getRenderWidth(), scene: taau?.inputTexture?.width ?? 0, level: a.quality.level.upscale, panini: a.quality.level.panini };
  });
  assert(p5.pps.includes('rtReflect') && p5.pps.includes('rtComposite') && !p5.pps.includes('ssr'), `Ray traced: the reflection passes replace screen space (${p5.pps.join(',')})`);
  assert(p5.pps[0] === 'taau' && !p5.pps.includes('TAA'), 'TAAU leads the chain and replaces TAA');
  assert(p5.scene > 0 && Math.abs(p5.scene / p5.canvas - 0.67) < 0.02, `TAAU: the scene at 67% of the native canvas (${p5.scene} of ${p5.canvas})`);
  assert(p5.pps.includes('panini') && p5.pps.at(-1) === 'cinematic', `Panini on, the grade pass still last (${p5.panini})`);
  await u.page.screenshot({ path: process.env.SHOT_P5 ?? '/tmp/e2e-p5.png', timeout: 600000 });
  const uerrs = u.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(uerrs.length === 0, `ray traced + TAAU + Panini render without console errors${uerrs.length ? ': ' + uerrs.slice(0, 4).join(' | ') : ''}`);
  console.log('desktop e2e passed');
} catch (err) {
  failed = true;
  console.error(err);
}
await browser?.close();
process.exit(failed ? 1 : 0);
