// (campus-greybox, v2 lane S5) Copied from `campusS5Dress.ts` at P0; the S5 lane's greybox. Built only when `flags.campusV2` names 5.
/**
 * Section 5 art dressing (sector-redesign ART-S5, `docs/sector-redesign/briefs/ART-S5.md`, report `checks/art-s5-build.md`):
 * the Old House and the grounds. `S5_ART_TAGS` tags every room of `S5_ROOMS`; `HERO_S5` is the section's hero catalogue
 * (`hero-s5.glb`, built by `scripts/campus-props/hero_s5.py`); `dressS5` skins the greybox objects (rack rows, display
 * screens, rolling stacks, the token plinth, chimney stacks, trees, the van, the terrace balustrade), places the strongroom
 * heroes the keepouts allow (each tried, each failure logged in `S5_HERO_LOG`), then runs `d.base()` last.
 */
import type { ArtTag } from '../../campusArt/artTags';
import type { ArtPlacement, PropCatalogue } from '../../campusArt/catalogue';
import { ArtRuleError, type CampusDresser, type BoxFace } from '../../campusArt/dresser';
import { boxAt, cylAt } from '../../campusArt/geometry';
import heroReport from '../../campusArt/assets/hero-s5.json';
import { CAMPUS_LOOK } from '../../campusArt/campusKit';
import { PROP_LOOK } from '../../props/facilityProps';
import { S5_BOX, S5_GROUPS, S5_L1, S5_ROOF } from './s5';

/** Every room of `S5_ROOMS` -> its tag (ART-S5 section 1). */
export const S5_ART_TAGS: Record<string, ArtTag> = {
  's5-ctl': 'oh-control',
  's5-draw': 'oh-formal',
  's5-hall': 'oh-hall',
  's5-pass': 'oh-corridor',
  's5-ante': 'oh-ante',
  's5-strong': 'strongroom',
  's5-back': 'oh-service',
  's5-plant': 'plant',
  's5-lobby': 'oh-service',
  's5-kitchen': 'oh-kitchen',
  's5-board': 'oh-formal',
  's5-ceo': 'oh-formal',
  's5-gal': 'oh-hall',
  's5-arch': 'oh-archive',
  's5-landing': 'oh-corridor',
  's5-low': 'roof',
  's5-roof': 'roof',
  's5-garden': 'ext-garden',
  's5-terrace': 'ext-terrace',
  's5-lawn': 'ext-garden',
  's5-jetty': 'ext-jetty',
};

const reportPieces = (heroReport as { pieces: Record<string, { bounds: { min: number[]; max: number[] } }> }).pieces;
const bounds = Object.fromEntries(
  Object.entries(reportPieces).map(([id, p]) => [id, { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const }]),
);

const H5_IDS = ['radioRackRow', 'displayScreen', 'rollingStack', 'tokenPlinth', 'chimneyStack', 'panelVan', 'balustrade', 'depositFace'] as const;

/** The H5 hero catalogue (ART-S5 section 3). Skins write no box; `depositFace` is a flush visual on the strongroom walls (rule V: 0.11 off the wall). */
export const HERO_S5: PropCatalogue | null = {
  id: 'H5',
  glb: 'hero-s5.glb',
  ids: H5_IDS,
  materials: ['steel', 'steelDark', 'galv', 'plastic', 'glass', 'white', 'concrete', 'brass', 'lamp', 'oakDark', 'brick', 'leatherGreen', 'paper', 'carPaint4', 'tyre'],
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },
  collision: { radioRackRow: null, displayScreen: null, rollingStack: null, tokenPlinth: null, chimneyStack: null, panelVan: null, balustrade: null, depositFace: null },
  footprint: {
    radioRackRow: [-0.55, -0.15, 0.55, 0.15],
    displayScreen: [-0.6, -0.15, 0.6, 0.15],
    rollingStack: [-0.75, -0.5, 0.7, 0.5],
    tokenPlinth: [-0.6, -0.3, 0.6, 0.3],
    chimneyStack: [-0.68, -0.68, 0.68, 0.68],
    panelVan: [-1.25, -2.5, 1.25, 2.5],
    balustrade: [-0.5, -0.12, 0.5, 0.12],
    depositFace: [-0.6, 0, 0.6, 0.11],
  },
  triBudget: { radioRackRow: 200, displayScreen: 120, rollingStack: 300, tokenPlinth: 150, chimneyStack: 200, panelVan: 1200, balustrade: 200, depositFace: 250 },
  hung: [],
  fit: ['radioRackRow', 'displayScreen', 'rollingStack', 'tokenPlinth', 'chimneyStack', 'panelVan', 'balustrade'],
  // the stone cap and the two clay pots stand above the 2.0 m stack (a roof skin: above the body band)
  overhang: { chimneyStack: { by: 0.6, what: 'the stone cap and the two clay pots above the stack' } },
  emissive: { radioRackRow: ['lamp'] },
  pitch: { radioRackRow: 1.1, displayScreen: 1.2, rollingStack: 1.4, tokenPlinth: 1.2, chimneyStack: 1.2, panelVan: 5, balustrade: 1, depositFace: 1.2 },
  bounds,
  classOf: { radioRackRow: 'skin', displayScreen: 'skin', rollingStack: 'skin', tokenPlinth: 'skin', chimneyStack: 'skin', panelVan: 'skin-hide', balustrade: 'skin', depositFace: 'visual' },
  // the van's hull (ART-PLAN AS10): a full-footprint lower body to 0.75, the cargo box and the lower cab above it
  profile: {
    panelVan: [
      { x0: -1.25, x1: 1.25, y0: 0, y1: 0.75, z0: -2.5, z1: 2.5 },
      { x0: -1.2, x1: 1.2, y0: 0.75, y1: 2.0, z0: -2.5, z1: 0.85 },
      { x0: -1.2, x1: 1.2, y0: 0.75, y1: 1.55, z0: 0.85, z1: 2.5 },
    ],
  },
};

/** What `dressS5` could not place (one line each: piece, position, the keepout's words); cleared at each run. */
export const S5_HERO_LOG: string[] = [];

/**
 * The pieces this section may lose (artnext A4 / A9: an explicit list, asserted by the test). Each is tried on every spot
 * its brief names; a refusal is logged in `S5_HERO_LOG` and counted in `d.report.dropped` by rule id.
 */
export const S5_OMITTED = ['F:depositWall', 'F:vaultLeaf', 'F:monitorWall', 'vaultFrame'] as const;

/** One face skin that may be refused (an `ArtRuleError`; anything else is a programming error and throws): logs the rule
 *  in `S5_HERO_LOG` and the dresser's drop counts, returns the placements' count (0: refused). */
function tryFace(d: CampusDresser, piece: string, box: number, face: BoxFace, o: Parameters<CampusDresser['skinFace']>[3]): number {
  try {
    return d.skinFace(piece, box, face, o).length;
  } catch (e) {
    if (!(e instanceof ArtRuleError)) throw e;
    const drops = (d.report.dropped[piece] ??= {});
    drops[e.rule] = (drops[e.rule] ?? 0) + 1;
    S5_HERO_LOG.push(e.message);
    return 0;
  }
}

export function dressS5(d: CampusDresser): void {
  S5_HERO_LOG.length = 0;
  const bs = d.ctx.boxes;
  const ys = (storey: number, h: number): number => storey + h / 2;

  // ---- skins of greybox objects (ART-S5 section 2; each target skinned once)
  // the control room's rack rows (x -56..-51.6, three rows): the lamps ride the control-room circuit
  for (const z of S5_BOX.racks) {
    d.skinRow('H5:radioRackRow', boxAt(bs, -53.8, 1.1, z), true, 1, { why: 'the control room racks: radio and CCTV recorders, a skin of the rack row box', group: S5_GROUPS.ctl });
  }
  // the gallery's two display screens (L1, 2.2 high), rows along z
  for (const [x0, x1, z0, z1] of S5_BOX.screens) d.skinRow('H5:displayScreen', boxAt(bs, (x0 + x1) / 2, ys(S5_L1, 2.2), (z0 + z1) / 2), false, 1, { why: 'gallery display screens hung with framed plans of the house' });
  // the archive's rolling stacks (P1, L3: the free-standing row and the wall shelving)
  // rows along x, fronts south (a refusal, e.g. the 0.7 m shelving under the piece's depth range, is logged, not fatal)
  for (const [x0, z0, x1, z1] of S5_BOX.stacks) {
    try {
      d.skinRow('H5:rollingStack', boxAt(bs, (x0 + x1) / 2, ys(S5_L1, S5_BOX.stacksTop), (z0 + z1) / 2), true, -1, { why: 'the archive rolling stacks, handwheel on the aisle end' });
    } catch (e) {
      if (!(e instanceof ArtRuleError)) throw e;
      const drops = (d.report.dropped['H5:rollingStack'] ??= {});
      drops[e.rule] = (drops[e.rule] ?? 0) + 1;
      S5_HERO_LOG.push(e.message);
    }
  }
  // the token table: the plinth faces the door (south), top flush at 0.9 for the token model
  {
    const [x0, z0, x1, z1] = S5_BOX.token;
    d.skin('H5:tokenPlinth', boxAt(bs, (x0 + x1) / 2, 0.45, (z0 + z1) / 2), Math.PI, { why: 'the two-person token plinth, baize top flush' });
  }
  // the four chimney stacks on the roof
  for (const [x, z] of S5_BOX.chimneys) d.skin('H5:chimneyStack', boxAt(bs, x, S5_ROOF + 1.0, z), 0, { why: 'brick chimney stack with stone cap and two clay pots' });
  // the six trees
  for (const [x, z] of S5_BOX.trees) d.skinCyl('K:treeSkin', cylAt(d.ctx.cylinders!, x, z), { why: 'garden and lawn trees' });
  // the courier's van: the box hidden, the van drawn (AS10)
  {
    const [x0, z0, x1, z1] = S5_BOX.van;
    d.skinHide('H5:panelVan', boxAt(bs, (x0 + x1) / 2, 1.2, (z0 + z1) / 2), 0, { why: 'the courier panel van' });
  }
  // the terrace balustrade (1.2, P1 G13): three runs, the gate and the boathouse path left open
  for (const [x0, x1] of [[-70, -64.6], [-63.4, -44.6], [-43.4, -26]] as const) d.skinRow('H5:balustrade', boxAt(bs, (x0 + x1) / 2, 0.6, 50.0), true, 1, { why: 'the terrace balustrade, stone balusters under a coping' });

  // the kitchen counter (z 34..38, 0.8 x 4.0 x 0.9, artnext B6): the fit kitchenRun along z, fronts to the room (east), and the
  // wall cupboards over it on the kitchen's west wall (3 fit modules, backs on the wall face x -31.85)
  {
    const counter = boxAt(bs, -31.2, 0.45, 36);
    d.skinRow('K:kitchenRun', counter, false, 1, { why: 'the kitchen counter: fit kitchen run modules along the counter box' });
    const n = 3;
    const len = 4.0;
    const spots = Array.from({ length: n }, (_, i) => ({ x: -31.85, y: 0, z: 34 + (len / n) * (i + 0.5), yaw: Math.PI / 2 }));
    for (const sp of spots) d.tryAdd('K:wallCupboards', [sp], { cls: 'visual', s: [len / n / 1.2, 1, 1], why: 'wall cupboards over the kitchen counter' });
  }

  // ---- hero placements (each tried: a keepout refusal is logged by rule id, never fatal)
  // the strongroom's safe-deposit walls, west and east inner faces
  for (let k = 0; k < 4; k++) {
    d.tryAdd('F:depositWall', [{ x: -45.6, y: 0, z: 38.6 + 1.2 * k, yaw: Math.PI / 2 }], { cls: 'solid', why: 'strongroom safe-deposit wall, west face' });
    d.tryAdd('F:depositWall', [{ x: -40.4, y: 0, z: 38.6 + 1.2 * k, yaw: (3 * Math.PI) / 2 }], { cls: 'solid', why: 'strongroom safe-deposit wall, east face' });
  }
  // flush safe-deposit fronts on the same walls (visual only, 0.11 deep: floor-mounted rows cannot stand, rule C)
  for (let k = 0; k < 4; k++) {
    d.tryAdd('H5:depositFace', [{ x: -45.9, y: 0, z: 38.6 + 1.2 * k, yaw: Math.PI / 2 }], { cls: 'visual', why: 'strongroom safe-deposit fronts, west wall' });
    d.tryAdd('H5:depositFace', [{ x: -40.1, y: 0, z: 38.6 + 1.2 * k, yaw: (3 * Math.PI) / 2 }], { cls: 'visual', why: 'strongroom safe-deposit fronts, east wall' });
  }
  // the time lock beside the opening
  d.tryAdd('F:timeLockPanel', [{ x: -41.45, y: 1.4, z: 37.1, yaw: 0 }], { cls: 'visual', why: 'the strongroom time lock' });
  // the open vault leaf, flat against the strongroom's south wall inner face, hinge on the opening's west edge
  d.tryAdd('F:vaultLeaf', [{ x: -43.6, y: 0, z: 37.15, yaw: Math.PI }], { cls: 'see', why: 'the vault leaf stands open tonight (AS8)' });
  // the vault frame (artnext B6, A7): dropped, "needs catalogue frame entry" (no catalogue lists a `frame` piece, and lane A's
  // catalogue files are not this dresser's to edit; the leaf above is refused by K1 the same way)
  S5_HERO_LOG.push('vaultFrame: needs catalogue frame entry (no piece is listed in a catalogue `frame`)');
  // the control room's CCTV wall as a face skin (artnext B6): the east wall's west face, then the south wall's north face
  // (both refused by rule S: the 0.36 m console's back would pass through a 0.2 / 0.3 m wall; the piece is not fit)
  for (const [wx, wy, wz, face, at] of [[-50, 2, 22.2, 'w', undefined], [-50.3, 2.1, 18, 'n', -53.2]] as const) {
    if (tryFace(d, 'F:monitorWall', boxAt(bs, wx, wy, wz), face, { why: 'the house CCTV wall, flush on the control room wall', ...(at === undefined ? {} : { at: [at] }) }) > 0) break;
  }

  // every refusal `tryAdd` logged joins the section's log
  for (const r of d.refusals) S5_HERO_LOG.push(`${r.piece} spot ${r.spot}: ${r.msg}`);
  const logged = d.refusals.length;

  d.base();

  // the hall's two front-wall portraits (artnext B8): base() mounts them at y 1.93 (the floor it finds at the door-wall piece),
  // so they hang above the front-door lintel's neighbours. Re-mounted flush at the hall floor's y: the base two come out, and
  // `tryAdd` puts them back on the same wall at the first spot K3 allows (the second one 0.4 m off the door's edge)
  const hallY = d.ctx.rooms.find((r) => r.id === 's5-hall')?.minY ?? 0;
  const hallRoom = d.ctx.rooms.find((r) => r.id === 's5-hall');
  const stale = (p: ArtPlacement): boolean => p.cat === 'K' && p.prop === 'portraitFrame' && hallRoom !== undefined && Math.abs(p.z - 18.15) < 0.01 && p.x > hallRoom.minX && p.x < hallRoom.maxX && p.y > hallY + 0.05;
  for (let i = d.placements.length - 1; i >= 0; i--) {
    if (!stale(d.placements[i]!)) continue;
    d.placements.splice(i, 1);
    d.report.placed['K:portraitFrame'] = (d.report.placed['K:portraitFrame'] ?? 1) - 1;
  }
  for (const xs of [[-46.4], [-43.0, -42.6, -42.4, -42.2]]) d.tryAdd('K:portraitFrame', xs.map((x) => ({ x, y: hallY, z: 18.15, yaw: 0 })), { cls: 'visual', why: 'the hall portraits, mounted at the hall floor' });
  for (const r of d.refusals.slice(logged)) S5_HERO_LOG.push(`${r.piece} spot ${r.spot}: ${r.msg}`);
}
