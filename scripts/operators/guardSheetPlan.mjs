// (guard-models G4s) The guard variety contact sheet's plan, pure: no fs, no browser, no Babylon. Which tiles, in which
// order, each tile's figures (kind, look, gear, LOD), camera view and labels, the sheet layout, the bake inputs the sheet
// reads and the CLI's arguments. `guard-sheet.mjs` runs it (headless Chromium on `guards.html`, where
// `src/operators/lab/guardSheet.ts` draws every tile with the game's guard runtime: GuardFigure, guardVariant, applyGear,
// guardTints, the helmet drop mesh, the shield). Pinned by `tests/guardSheetPlan.test.ts`.
//
// Content (PLAN G4): the three bases; all eight open faces in four tones at 1.5 m and 3 m; every hair cap (and the hair
// colours); every kind's outfit; gear off / on; the helmet knocked off (with the dropped helmet); the LOD strip with the
// bake report's triangle counts; Hollowmere night and night vision.
import path from 'node:path';

/** Sheet constants. Undo notes for the assumed ones are in docs/guard-models/reports/G4S-REPORT.md. */
export const SHEET = {
  /** The look's map (guardVariant's mapId) and faction (the tints): the co-op training level, urban palette. */
  mapId: 'ctcourse',
  faction: 'urban',
  /** The game camera: horizontal FOV at 16:9 (`src/config/camera.ts` CAMERA.fov) and the frame height the crops match. */
  gameHfovDeg: 86,
  screenH: 1080,
  /** Inspection lens of the body tiles: 50 mm equivalent (the Operator Lab's FOV_50MM). */
  lensFovDeg: (2 * Math.atan(12 / 50) * 180) / Math.PI,
  /** Face crops: camera distances (m) to the head and the crop size in game pixels (drawn 1:1). */
  faceDistances: [1.5, 3],
  cropPx: 256,
  /** The face crops' fixed hair: one cap and colour, so only head and tone change across the grid. */
  faceHair: { cap: 'crop', colour: 'darkbrown' },
  /** Hair tiles: tone and the hair colour of the style row. */
  hairTone: 1,
  hairColour: 'darkbrown',
  /** Body tiles render at 2x and are drawn at half size (antialiasing). */
  bodyDraw: [256, 512],
  supersample: 2,
  /** The full figure plus headroom (m) a body tile frames vertically. */
  bodyExtent: 2.15,
  /** Night line-up: spacing (m) and tile size (drawn). */
  lineupSpacing: 0.8,
  lineupDraw: [1024, 576],
  basesDraw: [640, 480],
  basesSpacing: 0.85,
  /** Views: 3/4 front for bodies and faces, 3/4 side for hair. */
  bodyYaw: 0.35,
  faceYaw: 0.3,
  hairYaw: 0.9,
  pitch: 0.04,
  /** Lab light rigs (labData LIGHT_RIGS) and quality preset (labData PRESETS). */
  rig: 'figure',
  nightRig: 'hollowmere',
  nvRig: 'nightvision',
  preset: 'high',
  pose: 'idle',
  /** The way the dropped helmet fell (unit x, z; it lands HELMET_DROP.fling m from his feet, the game's `helmetArc`). */
  dropDir: [0.8, 0.6],
  /** Sheet layout (px). */
  width: 2136,
  margin: 16,
  gap: 8,
  labelLine: 18,
  headerH: 58,
  /** CLI defaults. */
  port: 4189,
  png: 'sheet/guard-sheet.png',
};

const RAD = Math.PI / 180;

/** Vertical FOV (deg) of a horizontal FOV at 16:9 (the game's `vfovFromH16x9`). */
export function gameVfovDeg(hDeg = SHEET.gameHfovDeg) {
  return (2 * Math.atan(Math.tan((hDeg * RAD) / 2) * (9 / 16))) / RAD;
}

/** Horizontal FOV (deg) of a vertical FOV on `aspect`. */
export function horizontalFovDeg(vDeg, aspect) {
  return (2 * Math.atan(Math.tan((vDeg * RAD) / 2) * aspect)) / RAD;
}

/**
 * The vertical FOV (deg) of a `px`-tall render that has the game frame's pixel density: a 1080p frame at the game's
 * vertical FOV, cropped to `px` rows round the target. Drawn 1:1, the crop shows exactly the pixels the game spends.
 */
export function cropFovDeg(px = SHEET.cropPx, screenH = SHEET.screenH, vfovDeg = gameVfovDeg()) {
  return (2 * Math.atan((px / screenH) * Math.tan((vfovDeg * RAD) / 2))) / RAD;
}

/** Camera distance (m) at which `extent` metres fill a view of FOV `fovDeg`. */
export function fitDistance(extent, fovDeg) {
  return extent / 2 / Math.tan((fovDeg * RAD) / 2);
}

/** 12345 -> '12,345' (locale-free). */
export function thousands(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---- the kit ----

/**
 * What the sheet needs from guards.json: bases, kinds (kit order), open-face heads per base, tones, hair styles per base
 * and colours, each base's reference kind (its first kind in kit order) and the own-GLB pieces (the shield).
 */
export function kitInfo(kit) {
  const kinds = (kit.kinds ?? []).map((k) => ({
    id: k.id, base: k.base, height: k.height, hairCaps: k.hairCaps ?? [], faceCovered: k.faceCovered === true,
    helmetPiece: k.helmetPiece ?? null, armourPiece: k.armourPiece ?? null, fixedGear: k.fixedGear ?? [],
  }));
  const bases = (kit.bases ?? []).map((b) => b.id);
  const refKind = Object.fromEntries(bases.map((b) => [b, kinds.find((k) => k.base === b)?.id ?? null]));
  // a base shows faces when one of its kinds is open-faced (broad's only head is the balaclava eye region)
  const openBases = bases.filter((b) => kinds.some((k) => k.base === b && !k.faceCovered));
  const heads = (kit.heads ?? []).filter((h) => openBases.includes(h.base)).map((h) => ({ id: h.id, base: h.base }));
  const capOrder = (kit.hairCaps ?? []).map((c) => (typeof c === 'string' ? c : c.id));
  const hairStyles = Object.fromEntries(openBases.map((b) => {
    const used = new Set(kinds.filter((k) => k.base === b).flatMap((k) => k.hairCaps));
    const styles = capOrder.filter((c) => used.has(c));
    if (used.has('bald') && !styles.includes('bald')) styles.push('bald');
    return [b, styles];
  }));
  const tones = (kit.skinTones ?? []).map((t) => t.id);
  const hairColours = (kit.hairColours ?? []).map((c) => c.id);
  const ownGlb = (kit.pieces ?? []).filter((p) => p.ownGlb).map((p) => p.id);
  return { bases, kinds, refKind, openBases, heads, hairStyles, tones, hairColours, ownGlb };
}

// ---- the bake inputs ----

/**
 * Every bake output the sheet reads, relative to the bake out dir: per base its three LOD GLBs, its runtime data file
 * (`guard-<base>.json`, G7's GuardFileData) and its report; per own-GLB piece its three GLBs and its report.
 * `{ rel, owner, what: 'glb' | 'data' | 'report' }`.
 */
export function bakeInputs(kit) {
  const k = kitInfo(kit);
  const out = [];
  for (const b of k.bases) {
    for (const n of [0, 1, 2]) out.push({ rel: `lods/guard-${b}-lod${n}.glb`, owner: b, what: 'glb' });
    out.push({ rel: `lods/guard-${b}.json`, owner: b, what: 'data' }, { rel: `lods/guard-${b}.report.json`, owner: b, what: 'report' });
  }
  for (const p of k.ownGlb) {
    for (const n of [0, 1, 2]) out.push({ rel: `lods/guard-${p}-lod${n}.glb`, owner: p, what: 'glb' });
    out.push({ rel: `lods/guard-${p}.report.json`, owner: p, what: 'report' });
  }
  return out;
}

/**
 * Which inputs are missing (`exists(rel)` -> bool) and what that leaves: `ready` = owners (bases, pieces) whose GLBs and
 * data are all there (a missing report only blanks that owner's LOD counts).
 */
export function inputStatus(kit, exists) {
  const all = bakeInputs(kit);
  const missing = all.filter((i) => !exists(i.rel));
  const owners = [...new Set(all.map((i) => i.owner))];
  const ready = owners.filter((o) => !missing.some((m) => m.owner === o && m.what !== 'report'));
  return { all, missing, ready };
}

// ---- the tiles ----

/** A figure of a tile. `look` overrides guardVariant's pick (head, skinTone, hairCap, hairColour, headwear, headwear2, eyewear, kit). */
function figure(kind, base, o = {}) {
  return { kind, base, seed: o.seed ?? 0, look: o.look ?? {}, helmet: o.helmet ?? false, armour: o.armour ?? false, lod: o.lod ?? 'game', x: o.x ?? 0, z: o.z ?? 0, drop: o.drop ? SHEET.dropDir : null };
}

function bodyTile(id, section, label, figures, o = {}) {
  const [dw, dh] = o.draw ?? SHEET.bodyDraw;
  const fov = SHEET.lensFovDeg;
  const extent = o.extent ?? SHEET.bodyExtent;
  // the frame must hold the figure's height and (line-ups) its width: the larger distance of the two
  const across = o.across ?? 0;
  const distance = Math.max(fitDistance(extent, fov), across ? fitDistance(across, horizontalFovDeg(fov, dw / dh)) : 0);
  return {
    id, section, label, sub: o.sub ?? '', rig: o.rig ?? SHEET.rig, post: o.post ?? 'none', preset: SHEET.preset, pose: SHEET.pose, mapId: SHEET.mapId, faction: SHEET.faction,
    size: [dw * SHEET.supersample, dh * SHEET.supersample], draw: [dw, dh], smooth: true,
    view: { target: 'body', offset: [0, extent * 0.47, 0], distance: round3(distance), yaw: o.yaw ?? SHEET.bodyYaw, pitch: SHEET.pitch, fovDeg: round3(fov) },
    figures, brk: o.brk ?? false,
  };
}

function cropTile(id, section, label, fig, distance, yaw, brk) {
  const px = SHEET.cropPx;
  return {
    id, section, label, sub: '', rig: SHEET.rig, post: 'none', preset: SHEET.preset, pose: SHEET.pose, mapId: SHEET.mapId, faction: SHEET.faction,
    size: [px, px], draw: [px, px], smooth: false,
    view: { target: 'head', offset: [0, 0, 0], distance, yaw, pitch: SHEET.pitch, fovDeg: round3(cropFovDeg(px)) },
    figures: [fig], brk,
  };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/** The LOD strip's caption for base `b`, LOD `n`, from its bake report (`reports[b]`) and the reference kind. */
export function lodCaption(report, n, kind) {
  const l = report?.lods?.[n] ?? report?.lods?.[String(n)];
  if (!l) return 'no bake report';
  const shown = l.shownTris?.[kind];
  return `${thousands(l.bufferTris ?? 0)} buffer tris${shown != null ? `, ${thousands(shown)} shown (${kind})` : ''}`;
}

/**
 * The sheet's sections in order, each `{ id, title, note, tiles }`. A tile: `{ id, section, label, sub, rig, post,
 * preset, pose, size, draw, smooth, view, figures, brk, needs, skip }`; `needs` = the bases / pieces it draws, `skip` =
 * why it cannot be drawn ('' = it can; `ready` lists what the bake has, null = everything). `reports` maps a base or
 * piece id to its parsed `lods/guard-<id>.report.json` (the LOD captions).
 */
export function sheetPlan(kit, { reports = {}, ready = null } = {}) {
  const k = kitInfo(kit);
  const kindOf = (id) => k.kinds.find((x) => x.id === id);
  const shieldId = k.ownGlb[0] ?? null;
  const sections = [];
  const add = (id, title, note, tiles) => sections.push({ id, title, note, tiles });

  // 1. the three bases, side by side, gear off, look seed 0; left to right in caption order (the camera looks down -z
  // from +z, so +x is screen-left: figure i at x = ((n - 1) / 2 - i) * spacing; G10a D1c)
  const baseFigs = k.bases.map((b, i) => figure(k.refKind[b], b, { x: ((k.bases.length - 1) / 2 - i) * SHEET.basesSpacing }));
  add('bases', 'The three bases', `Each base's first kind, look seed 0, gear off, at its kind's height (${k.bases.map((b) => `${b}: ${k.refKind[b]} ${kindOf(k.refKind[b])?.height ?? '?'} m`).join(', ')}).`, [
    bodyTile('bases', 'bases', k.bases.join(' / '), baseFigs, { draw: SHEET.basesDraw, across: k.bases.length * SHEET.basesSpacing + 0.6, yaw: 0.15 }),
  ]);

  // 2. faces: rows = the open heads, columns = tone x distance
  const faces = [];
  for (const h of k.heads) {
    let first = true;
    for (const t of k.tones) {
      for (const d of SHEET.faceDistances) {
        const look = { head: h.id, skinTone: t, hairCap: SHEET.faceHair.cap, hairColour: SHEET.faceHair.colour, headwear: null, headwear2: null, eyewear: null };
        faces.push(cropTile(`face-${h.id}-t${t}-${d}m`, 'faces', `${h.id}, tone ${t}, ${d} m`, figure(k.refKind[h.base], h.base, { look }), d, SHEET.faceYaw, first));
        first = false;
      }
    }
  }
  add('faces', 'Faces in every tone at 1.5 m and 3 m', `The game's pixels: ${SHEET.cropPx} x ${SHEET.cropPx} crops of a ${SHEET.screenH}p frame at the game camera's ${SHEET.gameHfovDeg} deg FOV, drawn 1:1, LOD by distance as in play. Hair fixed (${SHEET.faceHair.cap}, ${SHEET.faceHair.colour}), no headwear. Look gate (PLAN G1h): a plausible, varied, unremarkable man in every tone.`, faces);

  // 3. hair: each base's styles, then the colours
  const hair = [];
  for (const b of k.openBases) {
    (k.hairStyles[b] ?? []).forEach((c, i) => {
      const look = { head: `${b}-1`, skinTone: SHEET.hairTone, hairCap: c, hairColour: SHEET.hairColour, headwear: null, headwear2: null, eyewear: null };
      hair.push(cropTile(`hair-${b}-${c}`, 'hair', `${b}: ${c}${c === 'bald' ? ' (no cap mesh)' : ''}`, figure(k.refKind[b], b, { look }), SHEET.faceDistances[0], SHEET.hairYaw, i === 0));
    });
  }
  const colourBase = k.openBases[0];
  if (colourBase) {
    const cap = (k.hairStyles[colourBase] ?? []).includes(SHEET.faceHair.cap) ? SHEET.faceHair.cap : (k.hairStyles[colourBase] ?? [])[0];
    k.hairColours.forEach((c, i) => {
      const look = { head: `${colourBase}-1`, skinTone: SHEET.hairTone, hairCap: cap, hairColour: c, headwear: null, headwear2: null, eyewear: null };
      hair.push(cropTile(`hair-colour-${c}`, 'hair', `${cap}, ${c}`, figure(k.refKind[colourBase], colourBase, { look }), SHEET.faceDistances[0], SHEET.hairYaw, i === 0));
    });
  }
  add('hair', 'Every hair cap, and the hair colours', `1.5 m game-pixel crops from the side (head -1 of each base, tone ${SHEET.hairTone}, ${SHEET.hairColour}); last row: the four colours on ${colourBase}.`, hair);

  // 4. every kind's outfit (gear off) and 5. gear on
  add('kinds', "Every kind's outfit, gear off", 'Look seed 0 (guardVariant on the training map), helmet and armour bits off. Plated kinds always show the plate, the enforcer the shield (fixed gear).',
    k.kinds.map((kd) => bodyTile(`kind-${kd.id}`, 'kinds', kd.id, [figure(kd.id, kd.base)], { sub: `${kd.base}, ${kd.height} m` })));
  add('gear', 'Gear on', 'The same looks with the gameplay helmet and armour bits set (A5: a helmet replaces cap, beanie and boonie and hides the hair; the balaclava and headset stay).',
    k.kinds.map((kd) => bodyTile(`gear-${kd.id}`, 'gear', kd.id, [figure(kd.id, kd.base, { helmet: true, armour: true })], { sub: [kd.helmetPiece, kd.armourPiece].filter(Boolean).join(' + ') })));

  // 6. helmet knocked off, per base: on, then off with the dropped helmet beside his feet
  const helmet = [];
  for (const b of k.bases) {
    const kd = kindOf(k.refKind[b]);
    if (!kd?.helmetPiece) continue;
    helmet.push(bodyTile(`helmet-${b}-on`, 'helmet', `${kd.id}: ${kd.helmetPiece} on`, [figure(kd.id, b, { helmet: true, armour: true })]));
    helmet.push(bodyTile(`helmet-${b}-off`, 'helmet', `${kd.id}: knocked off`, [figure(kd.id, b, { helmet: false, armour: true, drop: true })], { sub: 'dropped helmet_std mesh (A6)' }));
  }
  add('helmet', 'Helmet knocked off', "Helmet on, then knocked off: headwear and hair come back, the dropped helmet (helmet_std's own triangles, G7) lies beside his feet in the guard's helmet colour.", helmet);

  // 7. LOD strip: each base's reference kind, gear on, every LOD forced at the same framing
  const lods = [];
  const perRow = Math.floor((SHEET.width - 2 * SHEET.margin + SHEET.gap) / (SHEET.bodyDraw[0] + SHEET.gap));
  for (const b of k.bases) {
    const kd = kindOf(k.refKind[b]);
    // a base's three LODs stay on one row
    const brk = lods.length % perRow + 3 > perRow;
    for (const n of [0, 1, 2]) {
      lods.push(bodyTile(`lod-${b}-${n}`, 'lods', `${b} LOD${n}`, [figure(kd.id, b, { helmet: true, armour: true, lod: n })], { sub: lodCaption(reports[b], n, kd.id), brk: n === 0 && brk }));
    }
  }
  const sh = shieldId ? reports[shieldId] : null;
  const shieldNote = shieldId ? ` ${shieldId}: ${sh ? [0, 1, 2].map((n) => thousands(sh.lods?.[n]?.bufferTris ?? sh.lods?.[String(n)]?.bufferTris ?? 0)).join(' / ') : 'no bake report'} tris at LOD0 / 1 / 2 (the game draws LOD1 at every distance).` : '';
  add('lods', 'LOD strip with triangle counts', `Each LOD forced at the same 4.5 m framing (in play: LOD0 under 8 m, LOD1 to 25 m, LOD2 beyond). Counts from the bake reports (lods/guard-<base>.report.json): buffer = the whole file, shown = the kind's visible pieces.${shieldNote}`, lods);

  // 8. Hollowmere night and night vision: every kind in a line-up at gameplay distance, left to right in kind order (+x is
  // screen-left, as for the bases)
  const across = k.kinds.length * SHEET.lineupSpacing + 0.6;
  const lineup = () => k.kinds.map((kd, i) => figure(kd.id, kd.base, { helmet: true, armour: true, lod: 0, x: ((k.kinds.length - 1) / 2 - i) * SHEET.lineupSpacing }));
  add('night', 'Hollowmere night and night vision', "Every kind, gear on, at about 7 m, LOD0 forced (in play LOD0 ends at 6 m since S11: the LOD0 look under each light). Left: sodium against moonlight. Right: the same under the game's night-vision phosphor ramp (src/vfx/nightVision.ts NV_GLSL, no baked-lamp gain: the tube's postLift).", [
    bodyTile('night-hollowmere', 'night', 'Hollowmere night', lineup(), { draw: SHEET.lineupDraw, across, rig: SHEET.nightRig, yaw: 0 }),
    bodyTile('night-nv', 'night', 'Night vision', lineup(), { draw: SHEET.lineupDraw, across, rig: SHEET.nvRig, post: 'nv', yaw: 0 }),
  ]);

  // what each tile draws, and whether the bake has it
  for (const s of sections) {
    for (const t of s.tiles) {
      const needs = [...new Set(t.figures.flatMap((f) => [f.base, ...(shieldId && kindOf(f.kind)?.fixedGear.includes(shieldId) ? [shieldId] : [])]))];
      t.needs = needs;
      const lacking = ready ? needs.filter((n) => !ready.includes(n)) : [];
      // a tile with several figures draws the ones whose base is in; only a tile with none left is skipped
      const bases = t.figures.map((f) => f.base);
      const none = ready ? bases.every((b) => !ready.includes(b)) : false;
      t.skip = none ? `not baked: ${[...new Set(bases)].join(', ')}` : '';
      t.missing = lacking;
    }
  }
  return sections;
}

/** `--only` filter: the sections whose id is listed (all when the list is empty). */
export function pickSections(sections, only) {
  const list = (Array.isArray(only) ? only : String(only ?? '').split(',')).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return sections;
  const unknown = list.filter((id) => !sections.some((s) => s.id === id));
  if (unknown.length) throw new Error(`unknown sheet section(s): ${unknown.join(', ')} (known: ${sections.map((s) => s.id).join(', ')})`);
  return sections.filter((s) => list.includes(s.id));
}

// ---- the layout ----

/**
 * Places the sections on the sheet: each a header (title + note), then its tiles left to right, wrapping at the sheet
 * width (a tile with `brk` starts a new row), each with its label lines under it. Returns `{ width, height, headers:
 * [{ id, title, note, x, y }], tiles: [{ tile, x, y, w, h, labelY }] }`.
 */
export function layoutSheet(sections, o = {}) {
  const W = o.width ?? SHEET.width, M = o.margin ?? SHEET.margin, G = o.gap ?? SHEET.gap, L = o.labelLine ?? SHEET.labelLine, H = o.headerH ?? SHEET.headerH;
  const top = o.top ?? 96;
  const headers = [];
  const tiles = [];
  let y = top;
  for (const s of sections) {
    headers.push({ id: s.id, title: s.title, note: s.note, x: M, y });
    y += H;
    let x = M, rowH = 0;
    for (const t of s.tiles) {
      const [w, h] = t.draw;
      const lines = t.sub ? 2 : 1;
      const cell = h + 4 + lines * L;
      if (x > M && (t.brk || x + w > W - M)) {
        y += rowH + G;
        x = M;
        rowH = 0;
      }
      tiles.push({ tile: t, x, y, w, h, labelY: y + h + 4 });
      x += w + G;
      rowH = Math.max(rowH, cell);
    }
    y += rowH + G * 3;
  }
  return { width: W, height: y + M, headers, tiles };
}

// ---- the CLI ----

/**
 * guard-sheet.mjs arguments. Standalone: `--in <bake out dir> --out <png>`. Under the bake driver (`guard-bake.mjs
 * --stage sheet`) the job gets `--stage sheet --job sheet ... --kit <guards.json> --out <bake out dir>`: an `--out` that
 * is not a .png is the bake dir, and the PNG goes to `<out>/sheet/guard-sheet.png` (the job's declared output).
 */
export function sheetArgs(argv, env = {}) {
  const o = { in: null, out: null, kit: null, port: null, only: '', dryRun: false, build: true, allowMissing: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--in', '--out', '--kit', '--port', '--only', '--stage', '--job'].includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      i++;
      if (a === '--stage' || a === '--job') continue;
      o[a.slice(2)] = v;
    } else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-build') o.build = false;
    else if (a === '--allow-missing') o.allowMissing = true;
    else throw new Error(`unknown argument ${a}`);
  }
  if (!o.out && !o.in) throw new Error('usage: guard-sheet.mjs --in <bake out dir> --out <png> [--kit guards.json] [--port 4189] [--only sections] [--dry-run] [--no-build] [--allow-missing]');
  let inDir = o.in, png = o.out;
  if (!png || !/\.png$/i.test(png)) {
    // driver mode (or no --out): the bake dir holds the PNG at the job's output path
    inDir = o.in ?? o.out;
    png = path.join(o.out ?? inDir, SHEET.png);
  }
  if (!inDir) throw new Error('--in <bake out dir> is required with --out <png>');
  const port = Number(o.port ?? env.E2E_PORT ?? SHEET.port);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`bad port ${o.port ?? env.E2E_PORT}`);
  return { inDir, png, kit: o.kit, port, only: o.only, dryRun: o.dryRun, build: o.build, allowMissing: o.allowMissing };
}
