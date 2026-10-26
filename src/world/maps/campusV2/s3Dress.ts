// (campus-greybox, v2 lane S3) Copied from `campusS3Dress.ts` at P0; the S3 lane's greybox. Built only when `flags.campusV2` names 3.
// (campus-greybox S3 R7) Re-run on the v2 lab block: the tags of the v2 rooms, the skins on the v2 boxes (`S3_BOX` and the
// lane's build), the hero spots moved into the v2 rooms; a skin or hero spot the kit refuses is logged to `S3_HERO_LOG`.
// CR3's west face stays flat (the chamber shell) and nothing is skinned at the hoist hatch's west edge (the CR3b lip).
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
import type { ArtTag } from '../../campusArt/artTags';
import type { PropCatalogue, V3 } from '../../campusArt/catalogue';
import { ArtRuleError, type BoxFace, type CampusDresser } from '../../campusArt/dresser';
import { boxAt } from '../../campusArt/geometry';
import { CAMPUS_LOOK } from '../../campusArt/campusKit';
import { PROP_LOOK } from '../../props/facilityProps';
import heroReport from '../../campusArt/assets/hero-s3.json';
import { S3_BOX, S3_L1 } from './s3';

const PI = Math.PI;

/** (R7) The v2 room ids (`S3_ROOMS`) -> tags; the rooms new in v2 take the nearest existing tag (R7 report). */
export const S3_ART_TAGS: Record<string, ArtTag> = {
  's3-c2': 'lobby',
  's3-hall': 'lab-hall',
  's3-hall-aisle': 'lab-hall',
  's3-dock': 'dock',
  's3-control': 'noc',
  's3-plant': 'plant',
  's3-view': 'corridor',
  's3-east': 'corridor',
  's3-hoist': 'store',
  's3-writeup': 'office-cell',
  's3-gown': 'lab-gown',
  's3-clean': 'lab-clean',
  's3-store': 'lab-store',
  's3-sec': 'security',
  's3-wstair': 'corridor',
  's3-nstair': 'corridor',
  's3-estair': 'corridor',
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

/** (R7) A skin the kit may refuse (its fit or hull rule): applied, or logged to `S3_HERO_LOG` with the rule. */
function skinTry(label: string, f: () => void): boolean {
  try {
    f();
    return true;
  } catch (e) {
    if (!(e instanceof ArtRuleError)) throw e;
    S3_HERO_LOG.push(`${label}: skin dropped, ${e.msg}`);
    return false;
  }
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
  d.skin('K:labBench', boxAt(bx, 25.5, S3_BOX.benchTop / 2, -11.55), PI, { why: 'lab bench (north side of the hall, against the z -11 wall: P8)' });
  d.skin('H3:logDesk', boxAt(bx, 47.5, S3_BOX.benchTop / 2, -12.4), 0, { why: 'the burn-in log desk by the task-light switch' });
  // the crane bay's board screen: plywood to the door side (west), braces behind
  const [qx0, qz0, qx1, qz1] = S3_BOX.screen;
  d.skinRow('H3:hoardingPanel', boxAt(bx, (qx0 + qx1) / 2, 1.5, (qz0 + qz1) / 2), false, -1, { why: 'the crane bay board screen: plywood hoarding' });
  // the dock desk: the one 0.75 m box in the dock (the brief's dispatchDesk is 1.14 tall: it cannot skin 0.75)
  const [dx0, dz0, dx1, dz1] = S3_BOX.dockDesk;
  // (R7) the v2 desk is 2.0 long: the office desk stretches past its fit (1.26) and so does the reception desk; the security
  // desk fits but rises into cam-dock's view of the C3 door (K8), so it is not tried: the desk stays greybox (logged)
  const desk = boxAt(bx, (dx0 + dx1) / 2, S3_BOX.dockDeskTop / 2, (dz0 + dz1) / 2);
  const deskSkin = ['F:officeDesk', 'F:receptionDesk'].find((id) => skinTry(`dock desk (${id})`, () => d.skin(id, desk, PI, { why: 'the goods-in dock desk by the C3 door' })));
  S3_HERO_LOG.push(`dock desk: ${deskSkin ?? 'bare greybox, no desk fits (the security desk would block cam-dock, K8)'} (the brief names dispatchDesk, which is 1.14 tall and cannot skin the 0.75 m box)`);
  // the gas cage's bottle block (v2: the NW corner, x 10.3..12.5, z -3.1..-0.5): a hero skin
  skinTry('gas bottles', () => d.skin('H3:gasBottles', boxAt(bx, 11.4, 0.8, -1.8), 0, { why: 'the gas cage cylinder store (dark)' }));
  // the store's shelving partition (v2: x 53, the aisle gap z -4..-2.8 stays open)
  skinTry('store shelving, south run', () => d.skinRow('H3:stockShelf', boxAt(bx, 53, L1 + 1.2, -5.425), false, -1, { why: 'the store shelving partition, south run' }));
  skinTry('store shelving, north run', () => d.skinRow('H3:stockShelf', boxAt(bx, 53, L1 + 1.2, -1.475), false, -1, { why: 'the store shelving partition, north run' }));

  // ---- hero placements
  // (R7) the v2 rooms: the crane bay x 14..26.5 (hb2 over (20, -20)), the gowning room x 33.5..37.5 and the clean room
  // x 37.5..47 on L1 (z -7..0), the gowning door (35.5, -7) and the pass-through (37.5, -3)
  // (R7) the v2 hall is 19 m deep (z -30..-11): the 20.4 m girder no longer spans it north-south, so it runs east-west
  // along the bay at z -19, between the south and north high-bay rows and clear of the crane-bay lamp (20, -20)
  place(d, 'craneGirder', 'H3:craneGirder', 9.0, [[31, -19, 0], [33, -19, 0], [36, -18.5, 0]], { cls: 'visual', why: 'a parked overhead crane girder along the test hall (ceiling, between the high-bay rows)' });
  // (the clean suite route crosses the room on z -3, pass-through to airlock: the south corners keep the cover rule's 3 m)
  place(d, 'cleanBench', 'H3:cleanBench', L1, [[42, -0.55, PI], [44, -6.45, 0], [41, -6.45, 0], [45.5, -6.45, 0], [40.5, -0.55, PI], [44, -0.55, PI], [46.4, -3.5, (3 * PI) / 2]], { cls: 'solid', why: 'the clean room laminar-flow bench against a wall' });
  place(d, 'passBox', 'H3:passBox', L1, [[37.35, -5.0, (3 * PI) / 2], [37.35, -1.2, (3 * PI) / 2]], { cls: 'visual', why: 'the clean room pass-through hatch on the gowning / clean partition, beside the beam curtain' });
  place(d, 'stickyMat (door)', 'H3:stickyMat', L1, [[35.5, -6.1, 0], [35.5, -5.9, 0], [35.3, -5.6, 0]], { cls: 'visual', why: 'tacky mat inside the gowning room door' });
  place(d, 'stickyMat (clean)', 'H3:stickyMat', L1, [[36.8, -3.0, PI / 2], [36.8, -3.2, PI / 2], [36.7, -2.8, PI / 2]], { cls: 'visual', why: 'tacky mat at the pass-through to the clean room' });
  place(d, 'holdingBench', 'F:holdingBench', L1, [[35.5, -0.45, PI], [34.0, -2.0, PI / 2], [34.0, -4.5, PI / 2], [37.0, -1.0, (3 * PI) / 2], [37.0, -5.0, (3 * PI) / 2]], { cls: 'see', why: 'the gowning bench' });
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
  // (R7) v2: the west wall is the north core's east wall (x 33.5), the east partition x 37.5 (the pass-through between)
  const faceAt = (label: string, x: number, z: number, face: BoxFace, at: number[]): boolean => {
    // the wall piece holding (x, L1 + 2.25, z) (its centre is not on a round number: `boxAt` matches centres)
    const y = L1 + 2.25;
    const i = bx.findIndex((p) => {
      const q = Math.abs(Math.sin(p.yaw)) > 0.5;
      const hx = (q ? p.s[2] : p.s[0]) / 2;
      const hz = (q ? p.s[0] : p.s[2]) / 2;
      return p.collide && Math.abs(p.pitch) < 1e-3 && Math.abs(x - p.c[0]) <= hx + 1e-6 && Math.abs(z - p.c[2]) <= hz + 1e-6 && Math.abs(y - p.c[1]) <= p.s[1] / 2;
    });
    if (i < 0) {
      S3_HERO_LOG.push(`${label}: dropped, no wall piece at (${x}, ${y}, ${z})`);
      return false;
    }
    return faceTry(label, i, face, at);
  };
  const faced = [
    faceAt('kitCaseWall face skin (west wall, 4 modules)', 33.5, -3.5, 'e', [-4.4, -3.2, -2.0, -0.8]),
    faceAt('kitCaseWall face skin (east partition, north)', 37.5, -1.2, 'w', [-1.2]),
    faceAt('kitCaseWall face skin (east partition, south)', 37.5, -4.8, 'w', [-4.8]),
  ];
  if (!faced.some(Boolean)) for (const z of [-0.8, -2.0, -3.2, -4.4]) place(d, `kitCaseWall z ${z}`, 'F:kitCaseWall', L1, [[33.95, z, PI / 2], [37.05, z, (3 * PI) / 2]], { cls: 'see', why: 'a gown locker module on the gowning room west wall' });
  // hazard plates: the gas cage's blockwork wall (the cage has no door box; the plate faces the dock), the las-gown panel's wall
  // 0.85 m beside it, las-store's partition run beside the beam gap, the EMC door
  // (R7) v2: the cage's blast wall on its east face (x 13.65, facing the dock), panel-gown at (35.5, -0.15), the store
  // partition x 53 (west face 52.85) north of the aisle gap
  place(d, 'hazardPlate gas', 'H3:hazardPlate', 0, [[13.65, -2.0, PI / 2], [13.65, -3.0, PI / 2], [13.65, -1.0, PI / 2]], { cls: 'visual', why: 'gas store warning on the cage blockwork wall' });
  place(d, 'hazardPlate las-gown', 'H3:hazardPlate', L1, [[36.35, -0.15, PI], [34.65, -0.15, PI]], { cls: 'visual', why: 'laser warning beside the las-gown panel' });
  place(d, 'hazardPlate las-store', 'H3:hazardPlate', L1, [[52.85, -2.5, (3 * PI) / 2], [52.85, -2.2, (3 * PI) / 2]], { cls: 'visual', why: 'laser warning on the store partition near the las-store beam gap' });
  place(d, 'hazardPlate EMC', 'H3:hazardPlate', 0, [[46.3, -16.0, 0], [46.5, -16.0, 0]], { cls: 'visual', why: 'RF hazard plate beside the EMC door' });

  d.base();
}
