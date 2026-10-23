/**
 * Section 3 art dressing (sector-redesign ART-S3, brief `docs/sector-redesign/briefs/ART-S3.md`, report
 * `docs/sector-redesign/checks/art-s3-build.md`): the lab block. `S3_ART_TAGS` (every room of `S3_ROOMS` -> its tag),
 * `HERO_S3` (hero set H3, `hero-s3.glb`, built by `scripts/campus-props/hero_s3.py`) and `dressS3`: the skins of the
 * greybox objects (chamber, plant, EMC room, burn-in racks, benches, board screen, dock desk, store shelving), the hero
 * placements, then `d.base()` last.
 *
 * The brief was written before the kit: the kit's skin rule (a skin's hull encloses its greybox box within 2 cm, scale
 * 0.8-1.25) wins, so the chamber and the EMC room are one whole-box shell each (all four faces, the door and port on the
 * front) instead of rows of wall modules. Hero placements try their candidate spots in order (the brief's coordinates came
 * from another branch); what does not pass the keepouts is dropped and written to `S3_HERO_LOG` (read by the test and the
 * build report), never silently.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue, V3 } from '../campusArt/catalogue';
import { ArtRuleError, type BoxFace, type CampusDresser } from '../campusArt/dresser';
import { boxAt } from '../campusArt/geometry';
import { CAMPUS_LOOK } from '../campusArt/campusKit';
import { PROP_LOOK } from '../props/facilityProps';
import heroReport from '../campusArt/assets/hero-s3.json';
import { S3_BOX, S3_L1 } from './campusS3';

const PI = Math.PI;

export const S3_ART_TAGS: Record<string, ArtTag> = {
  's3-lobby': 'lobby',
  's3-c2': 'lobby',
  's3-hall': 'lab-hall',
  's3-dock': 'dock',
  's3-view': 'corridor',
  's3-writeup': 'office-cell',
  's3-gown': 'lab-gown',
  's3-clean': 'lab-clean',
  's3-back': 'corridor',
  's3-store': 'lab-store',
  's3-strip': 'corridor',
  's3-sec': 'security',
  's3-yard': 'ext-service',
};

const bounds: Record<string, { lo: V3; hi: V3 }> = Object.fromEntries(
  Object.entries((heroReport as { pieces: Record<string, { bounds: { min: number[]; max: number[] } }> }).pieces).map(([id, p]) => [
    id,
    { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const },
  ]),
);

const H3_IDS = ['chamberWall', 'condensingUnit', 'emcPanel', 'hoardingPanel', 'stockShelf', 'craneGirder', 'cleanBench', 'passBox', 'stickyMat', 'hazardPlate', 'logDesk', 'gasBottles'] as const;
const footprint: Record<string, readonly [number, number, number, number]> = Object.fromEntries(H3_IDS.map((id) => [id, [bounds[id]!.lo[0], bounds[id]!.lo[2], bounds[id]!.hi[0], bounds[id]!.hi[2]] as const]));

/**
 * The H3 hero set. Frames as the kit: a skin piece's hull is its box plus 5-15 mm (scale 1; the stock shelf stretches
 * 0.88-1.15 over the two partition runs), the chamber shell's front (+z) carries the door and port and its back (-z) the
 * CR3 lip face, flat to 7.5 mm; the wall pieces (`passBox`, `hazardPlate`) are modelled at their mount height with the back
 * on the wall at z 0; `craneGirder` is a ceiling piece (origin on its top face, hull y -1 .. 0).
 */
export const HERO_S3: PropCatalogue | null = {
  id: 'H3',
  glb: 'hero-s3.glb',
  ids: H3_IDS,
  materials: ['steel', 'steelDark', 'galv', 'plastic', 'white', 'safety', 'timber', 'cardboard', 'labWhite', 'epoxy', 'copper', 'red'],
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },
  collision: {
    chamberWall: null,
    condensingUnit: null,
    emcPanel: null,
    hoardingPanel: null,
    stockShelf: null,
    craneGirder: null,
    // the laminar-flow bench: one solid box 1 cm inside the hull (cover; the hood is drawn closed down to the worktop sash)
    cleanBench: [{ lo: [-0.89, 0, -0.39], hi: [0.89, 2.19, 0.39], noLedge: true }],
    passBox: null,
    stickyMat: null,
    hazardPlate: null,
    logDesk: null,
    gasBottles: null,
  },
  footprint,
  triBudget: { chamberWall: 450, condensingUnit: 500, emcPanel: 460, hoardingPanel: 150, stockShelf: 210, craneGirder: 800, cleanBench: 300, passBox: 80, stickyMat: 12, hazardPlate: 60, logDesk: 200, gasBottles: 900 },
  hung: [],
  fit: ['chamberWall', 'condensingUnit', 'emcPanel', 'hoardingPanel', 'stockShelf', 'logDesk', 'gasBottles'],
  overhang: { logDesk: { by: 0.5, what: 'the monitor, keyboard and log book on the worktop' } },
  emissive: {},
  pitch: { chamberWall: 8, condensingUnit: 2, emcPanel: 6, hoardingPanel: 1.2, stockShelf: 1.45, craneGirder: 20.4, cleanBench: 1.8, passBox: 0.6, stickyMat: 1.2, hazardPlate: 0.4, logDesk: 2, gasBottles: 2.4 },
  bounds,
  classOf: {
    chamberWall: 'skin',
    condensingUnit: 'skin',
    emcPanel: 'skin',
    hoardingPanel: 'skin',
    stockShelf: 'skin',
    craneGirder: 'visual',
    cleanBench: 'solid',
    passBox: 'visual',
    stickyMat: 'visual',
    hazardPlate: 'visual',
    logDesk: 'skin',
    gasBottles: 'skin',
  },
};

/** Why a hero placement or skin was placed, moved or dropped (rebuilt by every `dressS3`). */
export const S3_HERO_LOG: string[] = [];

/** One candidate spot of a hero placement: x, z, yaw (and the floor `y` when it is not the section's L1 or ground). */
type Spot = readonly [x: number, z: number, yaw: number];

/** Places `piece` at the first of `spots` that passes the keepouts; logs the outcome. Returns whether one did. */
function place(d: CampusDresser, label: string, piece: string, y: number, spots: readonly Spot[], o: { cls: 'solid' | 'see' | 'visual'; why: string }): boolean {
  const errs: string[] = [];
  for (let i = 0; i < spots.length; i++) {
    const [x, z, yaw] = spots[i]!;
    try {
      d.add(piece, x, y, z, yaw, o);
      S3_HERO_LOG.push(`${label}: placed at (${x}, ${z}) yaw ${yaw.toFixed(2)}${i > 0 ? ` (candidate ${i + 1} of ${spots.length}; first: ${errs[0]})` : ''}`);
      return true;
    } catch (e) {
      errs.push((e as Error).message.replace(/^campus art S3: /, ''));
    }
  }
  S3_HERO_LOG.push(`${label}: dropped, no spot passes (${errs.join(' | ')})`);
  return false;
}

export function dressS3(d: CampusDresser): void {
  S3_HERO_LOG.length = 0;
  const bx = d.ctx.boxes;
  const L1 = S3_L1;

  // ---- skins of the greybox objects (brief section 2; the kit's skin rule: scale 1 or the fit range)
  const [cx0, cz0, cx1, cz1] = S3_BOX.chamber;
  // the chamber shell: door and port on the east face (piece +z -> world +x: yaw PI / 2), CR3's west face flat
  d.skin('H3:chamberWall', boxAt(bx, (cx0 + cx1) / 2, S3_BOX.chamberTop / 2, (cz0 + cz1) / 2), PI / 2, { why: 'the environmental chamber: insulated panels, door and port on the east face, the west (CR3 lip) face flat' });
  d.skin('H3:condensingUnit', boxAt(bx, 34.5, 5.0, -18), 0, { why: 'the chamber refrigeration plant on its roof' });
  const [ex0, ez0, ex1, ez1] = S3_BOX.emc;
  d.skin('H3:emcPanel', boxAt(bx, (ex0 + ex1) / 2, S3_BOX.emcTop / 2, (ez0 + ez1) / 2), 0, { why: 'the EMC room: copper-clad shielding, the closed RF door on the north face' });
  // burn-in racks: fronts to the hall (-x), a row along z each
  S3_BOX.racks.forEach(([x0, z0, x1, z1]) => {
    d.skinRow('F:serverRack', boxAt(bx, (x0 + x1) / 2, S3_BOX.racksTop / 2, (z0 + z1) / 2), false, -1, { why: 'a burn-in rack row against the east wall, fronts to the hall' });
  });
  // benches: two lab benches (K labBench) and the burn-in log desk (the third box is 2 m long: with the artnext per-piece fit a labBench could stretch to it, 0.673, but the log desk hero stays: it is the purpose-made piece)
  d.skin('K:labBench', boxAt(bx, 25.5, S3_BOX.benchTop / 2, -24.5), 0, { why: 'lab bench (south side of the hall)' });
  d.skin('K:labBench', boxAt(bx, 25.5, S3_BOX.benchTop / 2, -11.2), PI, { why: 'lab bench (north side of the hall)' });
  d.skin('H3:logDesk', boxAt(bx, 47.5, S3_BOX.benchTop / 2, -12.4), 0, { why: 'the burn-in log desk by the task-light switch' });
  // the crane bay's board screen: plywood to the door side (west), braces behind
  const [qx0, qz0, qx1, qz1] = S3_BOX.screen;
  d.skinRow('H3:hoardingPanel', boxAt(bx, (qx0 + qx1) / 2, 1.5, (qz0 + qz1) / 2), false, -1, { why: 'the crane bay board screen: plywood hoarding' });
  // the dock desk: the one 0.75 m box in the dock (the brief's dispatchDesk is 1.14 tall: it cannot skin 0.75)
  d.skin('F:officeDesk', boxAt(bx, 31.5, 0.375, -1.0), PI, { why: 'the goods-in dock desk against the north wall' });
  S3_HERO_LOG.push('dock desk: F officeDesk (the brief names dispatchDesk, which is 1.14 tall and cannot skin the 0.75 m box)');
  // the gas cage's bottle block: a hero skin (the kit gasCylinders cannot stand beside a block that fills the cage)
  d.skin('H3:gasBottles', boxAt(bx, 38.2, 0.8, -2.05), 0, { why: 'the gas cage cylinder store (dark)' });
  // the store's shelving partition (x 48.5, the aisle gap z -4.6..-3.4 stays open)
  d.skinRow('H3:stockShelf', boxAt(bx, 48.5, L1 + 1.2, -5.225), false, -1, { why: 'the store shelving partition, south run' });
  d.skinRow('H3:stockShelf', boxAt(bx, 48.5, L1 + 1.2, -2.575), false, -1, { why: 'the store shelving partition, north run' });

  // ---- hero placements
  place(d, 'craneGirder', 'H3:craneGirder', 9.0, [[28.5, -19, PI / 2], [35.5, -19, PI / 2], [43, -19, PI / 2]], { cls: 'visual', why: 'a parked overhead crane girder over the crane bay (ceiling, between the high-bay rows)' });
  place(d, 'cleanBench', 'H3:cleanBench', L1, [[36.5, -0.55, PI], [35.0, -0.55, PI], [38.5, -0.55, PI], [39.3, -3.0, (3 * PI) / 2]], { cls: 'solid', why: 'the clean room laminar-flow bench against the north wall' });
  place(d, 'passBox', 'H3:passBox', L1, [[32.85, -5.0, (3 * PI) / 2], [32.85, -1.2, (3 * PI) / 2]], { cls: 'visual', why: 'the clean room pass-through hatch on the gowning / clean partition, beside the beam curtain' });
  place(d, 'stickyMat (door)', 'H3:stickyMat', L1, [[31.2, -4.1, 0], [31.2, -3.9, 0], [31.2, -3.5, 0]], { cls: 'visual', why: 'tacky mat inside the gowning room door' });
  place(d, 'stickyMat (clean)', 'H3:stickyMat', L1, [[32.3, -3.0, PI / 2], [32.3, -3.2, PI / 2], [32.2, -2.8, PI / 2]], { cls: 'visual', why: 'tacky mat at the pass-through to the clean room' });
  place(d, 'holdingBench', 'F:holdingBench', L1, [[31.5, -5.4, 0], [30.4, -2.0, PI / 2], [30.4, -3.0, PI / 2], [31.5, -0.4, PI], [32.4, -2.0, PI / 2], [32.6, -1.2, (3 * PI) / 2], [32.6, -1.5, (3 * PI) / 2], [30.4, -1.0, PI / 2], [30.4, -5.0, PI / 2]], { cls: 'see', why: 'the gowning bench' });
  // (artnext B4) the gown lockers first as face skins on the gowning room's partition faces (no box, so the floor rules K2 / K5
  // that dropped them do not apply, only the wall-mounted visual rules). The skin rule refuses all of them (rule S: the
  // 0.5 m deep kitCaseWall sinks 0.45 m into a 0.3 m partition, 0.15 m through its far face), so the floor spots follow: they
  // stay dropped by K2 / K5 / K9 / K3. Every outcome is logged with its rule id.
  const faceTry = (label: string, boxIndex: number, face: BoxFace, at: number[]): boolean => {
    try {
      d.skinFace('F:kitCaseWall', boxIndex, face, { why: 'gown lockers on the gowning room partition', at, dy: 0 });
      S3_HERO_LOG.push(`${label}: placed as a face skin on box ${boxIndex} face ${face}`);
      return true;
    } catch (e) {
      if (!(e instanceof ArtRuleError)) throw e;
      S3_HERO_LOG.push(`${label}: dropped, ${e.msg}`);
      return false;
    }
  };
  const faced = [
    faceTry('kitCaseWall face skin (west partition, 4 modules)', boxAt(bx, 30, L1 + 2.25, -3.075), 'e', [-4.4, -3.2, -2.0, -0.8]),
    faceTry('kitCaseWall face skin (east partition, north)', boxAt(bx, 33, L1 + 2.25, -1.275), 'w', [-1.2]),
    faceTry('kitCaseWall face skin (east partition, south)', boxAt(bx, 33, L1 + 2.25, -4.8), 'w', [-4.8]),
  ];
  if (!faced.some(Boolean)) for (const z of [-0.8, -2.0, -3.2, -4.4]) place(d, `kitCaseWall z ${z}`, 'F:kitCaseWall', L1, [[30.15, z, PI / 2], [32.85, z, (3 * PI) / 2]], { cls: 'see', why: 'a gown locker module on the gowning room west wall' });
  // hazard plates: the gas cage's blockwork wall (the cage has no door box; the plate faces the dock), the las-gown panel's wall
  // 0.85 m beside it, las-store's partition run beside the beam gap, the EMC door
  place(d, 'hazardPlate gas', 'H3:hazardPlate', 0, [[35.85, -2.0, (3 * PI) / 2], [35.85, -3.0, (3 * PI) / 2], [35.85, -1.0, (3 * PI) / 2]], { cls: 'visual', why: 'gas store warning on the cage blockwork wall' });
  place(d, 'hazardPlate las-gown', 'H3:hazardPlate', L1, [[32.05, -0.15, PI], [30.4, -0.15, PI]], { cls: 'visual', why: 'laser warning beside the las-gown panel' });
  place(d, 'hazardPlate las-store', 'H3:hazardPlate', L1, [[48.35, -2.5, (3 * PI) / 2], [48.35, -2.2, (3 * PI) / 2]], { cls: 'visual', why: 'laser warning on the store partition near the las-store beam gap' });
  place(d, 'hazardPlate EMC', 'H3:hazardPlate', 0, [[46.3, -16.0, 0], [46.5, -16.0, 0]], { cls: 'visual', why: 'RF hazard plate beside the EMC door' });

  d.base();
}
