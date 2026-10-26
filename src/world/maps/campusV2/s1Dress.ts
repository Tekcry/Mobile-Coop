// (campus-greybox, v2 lane S1) Copied from `campusS1Dress.ts` at P0; the S1 lane's greybox. Built only when `flags.campusV2` names 1.
/**
 * Section 1 art dressing (sector-redesign ART-S1, briefs/ART-S1.md): `S1_ART_TAGS` (every room of `S1_ROOMS` -> its
 * tag), `HERO_S1` (the section's hero catalogue H1, `hero-s1.glb`, built by `scripts/campus-props/hero_s1.py`) and
 * `dressS1` (the skins of the greybox objects, the hero placements, then `d.base()` last; ART-PLAN 5.1). Pure: no Babylon.
 */
import type { ArtTag } from '../../campusArt/artTags';
import type { ArtBox, PropCatalogue, V3 } from '../../campusArt/catalogue';
import type { CampusDresser } from '../../campusArt/dresser';
import { boxAt, cylAt } from '../../campusArt/geometry';
import { CAMPUS_LOOK } from '../../campusArt/campusKit';
import { PROP_LOOK } from '../../props/facilityProps';
import heroReport from '../../campusArt/assets/hero-s1.json';
import { BOLLARD_XS, S1_GROUPS } from './s1';

export const S1_ART_TAGS: Record<string, ArtTag> = {
  verge: 'ext-verge',
  gatehouse: 'gatehouse',
  gateroof: 'roof',
  lane: 'ext-road',
  apron: 'ext-road',
  park: 'ext-carpark',
  carport: 'roof',
  dyard: 'ext-service',
  plantroom: 'plant',
  plantroof: 'roof',
  forecourt: 'ext-forecourt',
  lawn: 'ext-garden',
  pavilion: 'roof',
  c1: 'lobby',
};

const H1_IDS = ['gateDesk', 'pcDesk', 'teaPoint', 'monitorBank', 'keyCabinet', 'visitorBoard', 'trafficIsland', 'barrierArm', 'barrierHousing', 'cageTrolley', 'lightBollard', 'intercomPost'] as const;

const reportPieces = (heroReport as unknown as { pieces: Record<string, { bounds: { min: number[]; max: number[] } }> }).pieces;
const bounds: Record<string, { lo: V3; hi: V3 }> = Object.fromEntries(
  Object.entries(reportPieces).map(([id, p]) => [id, { lo: [p.bounds.min[0]!, p.bounds.min[1]!, p.bounds.min[2]!] as const, hi: [p.bounds.max[0]!, p.bounds.max[1]!, p.bounds.max[2]!] as const }]),
);

/** The intercom's see box (collision-only: light passes; 0.2 x 1.3 x 0.15). */
const INTERCOM_BOX: ArtBox = { lo: [-0.1, 0, -0.075], hi: [0.1, 1.3, 0.075], see: true };

const FOOT: Record<string, readonly [number, number, number, number]> = {
  gateDesk: [-0.8, -0.35, 0.8, 0.35],
  pcDesk: [-0.8, -0.45, 0.8, 0.45],
  teaPoint: [-0.8, -0.3, 0.8, 0.3],
  monitorBank: [-0.6, 0, 0.6, 0.12],
  keyCabinet: [-0.225, 0, 0.225, 0.1],
  visitorBoard: [-0.45, 0, 0.45, 0.03],
  trafficIsland: [-0.5, -1.2, 0.5, 1.2],
  barrierArm: [-1.25, -0.05, 1.25, 0.05],
  barrierHousing: [-0.16, -0.16, 0.16, 0.16],
  cageTrolley: [-0.5, -0.4, 0.5, 0.4],
  lightBollard: [-0.1, -0.1, 0.1, 0.1],
  intercomPost: [-0.1, -0.075, 0.1, 0.075],
};

/** H1: the gatehouse set (briefs/ART-S1.md section 3). Materials are names from CAMPUS_LOOK / PROP_LOOK only. */
export const HERO_S1: PropCatalogue | null = {
  id: 'H1',
  glb: 'hero-s1.glb',
  ids: H1_IDS,
  materials: ['steel', 'steelDark', 'galv', 'plastic', 'white', 'red', 'concrete', 'brass', 'screen', 'laminate', 'tyre', 'safety', 'lamp'],
  looks: { ...PROP_LOOK, ...CAMPUS_LOOK },
  collision: {
    gateDesk: null,
    pcDesk: null,
    teaPoint: null,
    monitorBank: null,
    keyCabinet: null,
    visitorBoard: null,
    trafficIsland: null,
    barrierArm: null,
    barrierHousing: null,
    cageTrolley: null,
    lightBollard: null,
    intercomPost: [INTERCOM_BOX],
  },
  footprint: FOOT,
  triBudget: { gateDesk: 450, pcDesk: 250, teaPoint: 300, monitorBank: 120, keyCabinet: 40, visitorBoard: 40, trafficIsland: 200, barrierArm: 120, barrierHousing: 120, cageTrolley: 400, lightBollard: 80, intercomPost: 80 },
  hung: [],
  fit: ['gateDesk', 'pcDesk', 'teaPoint', 'trafficIsland', 'barrierArm', 'cageTrolley', 'lightBollard'],
  overhang: {
    gateDesk: { by: 0.4, what: 'the two monitors (0.55 wide, 0.4 tall) on the back 0.25 of the desk top' },
    pcDesk: { by: 0.3, what: 'the far-end monitor on the desk top' },
    teaPoint: { by: 0.3, what: 'the kettle (0.2 x 0.28), mugs and handles on the worktop' },
  },
  emissive: { gateDesk: ['screen'], monitorBank: ['screen'], barrierArm: ['lamp'], lightBollard: ['lamp'] },
  pitch: Object.fromEntries(Object.entries(FOOT).map(([id, f]) => [id, f[2] - f[0]])),
  bounds,
  classOf: {
    gateDesk: 'skin',
    pcDesk: 'skin',
    teaPoint: 'skin',
    monitorBank: 'visual',
    keyCabinet: 'visual',
    visitorBoard: 'visual',
    trafficIsland: 'skin',
    barrierArm: 'skin',
    barrierHousing: 'visual',
    cageTrolley: 'skin',
    lightBollard: 'skin',
    intercomPost: 'see',
  },
  // the bollard is modelled 0.2 square over 0.95: scaled 0.8 / 0.947 it is the greybox cylinder (r 0.08, h 0.9)
  cylFit: { lightBollard: { r: 0.1, h: 0.95 } },
};

const PI = Math.PI;
/** The four car colours, cycled over the 14 cars (artnext B1: perfa's merged casters key a car's paint by material, so four colours cost 35 of the 40 draws, not the 53 of art-join L4). */
const CAR_PIECES = ['K:carSilver', 'K:carBlack', 'K:carBlue', 'K:carWhite'] as const;
/** The 14 parked cars of `buildCampusS1`: bay centre x, row z (the greybox boxes are 1.8 x 1.5 x 4.2 at y 0.75). */
const ROW_Z = [-75.75, -71.25, -60.75, -56.25] as const;
const bayX = (i: number): number => -34.6 + 2.8 * i;
const CARS: readonly (readonly [number, number])[] = [
  [0, 2], [0, 3], [0, 8], [0, 13],
  [1, 3], [1, 7], [1, 11],
  [2, 1], [2, 5], [2, 9], [2, 14],
  [3, 4], [3, 8], [3, 12],
];

/** One hero spot (piece, x, z) the kit may refuse, with the rule it refuses it by. */
export interface S1Omit {
  piece: string;
  x: number;
  z: number;
  rule: string;
}
/**
 * The hero placements the brief allows the kit to refuse (art-join S1 L2 / L3; artnext B2, the A9 contract): the second
 * bike stand (K6) and the shelter bench (K1). Left out, never moved. Every other hero is exact: `dressS1` throws if one is
 * refused, or if a listed one is not (a stale list). The test asserts `S1_REFUSED` equals this list.
 */
export const S1_OMITTED: readonly S1Omit[] = [
  // (campus-greybox G3) the stands moved with the shelter by (-2, -4): K6 still refuses the middle one; K4 now refuses the
  // west one (x -10, by the shelter's north-west post and the bike switch)
  { piece: 'K:bikeRack', x: -10, z: -50.8, rule: 'K4' },
  { piece: 'K:bikeRack', x: -7, z: -50.8, rule: 'K6' },
  { piece: 'K:parkBench', x: 8, z: -47.6, rule: 'K1' },
  // (campus-greybox G2) the monitor bank moved with the north wall (z -72.65); its back now spans the fixed north pane (x
  // 18.6..19.8, no wall behind it), so rule V refuses it
  { piece: 'H1:monitorBank', x: 18.8, z: -72.65, rule: 'V' },
  // (campus-greybox G6) the south footway route (SVG:538: (22, -73) -> (10, -79)) passes the intercom post at the barrier;
  // the K1 route keepout refuses it
  { piece: 'H1:intercomPost', x: 12.6, z: -79.3, rule: 'K1' },
  { piece: 'K:siteSign', x: 6.8, z: -79.0, rule: 'K1' },
];
/** What the last `dressS1` call had refused (rebuilt every call). */
export const S1_REFUSED: S1Omit[] = [];

export function dressS1(d: CampusDresser): void {
  const bx = (x: number, y: number, z: number): number => boxAt(d.ctx.boxes, x, y, z);
  const cy = (x: number, z: number): number => cylAt(d.ctx.cylinders!, x, z);
  const lit = (i: number, group: number): void => {
    d.placements[i]!.group = group;
  };

  // ---- 1. skins of the greybox objects (brief section 2, in order)
  CARS.forEach(([row, bay], k) => {
    d.skinHide(CAR_PIECES[k % CAR_PIECES.length]!, bx(bayX(bay), 0.75, ROW_Z[row]!), 0, { why: 'a parked staff car over its greybox box' });
  });
  // (campus-greybox G4) the bin store is gone: the bins behind the yard's bin screen get no art (new greybox objects)
  d.skin('K:feederPillar', bx(-31.4, 0.75, -46.6), PI, { why: 'the feeder pillar, door face south where the breakers are' });
  for (const x of [-11, -7, -3]) d.skin('K:planterTrough', bx(x, 0.35, -35.6), 0, { why: 'a facade planter' });
  for (const [x, z] of [[22.5, -66], [24.5, -60]] as const) d.skinCyl('K:treeSkin', cy(x, z), { why: 'a verge tree over its trunk pillar' });
  d.skin('H1:cageTrolley', bx(-30.5, 0.6, -46), 0, { why: 'the delivery yard cage trolley (cover)' });
  d.skin('H1:cageTrolley', bx(-28.4, 0.6, -56.4), 0, { why: "the courier's cage trolley at his van's open rear doors" });
  lit(d.skin('H1:gateDesk', bx(18.8, 0.375, -73.0), PI, { why: 'the CCTV desk, operator side south, facing the north wall' }), S1_GROUPS.gate);
  d.skin('H1:pcDesk', bx(19.35, 0.375, -77.75), -PI / 2, { why: 'the PC desk south of the rear window, operator side west' });
  d.skin('H1:teaPoint', bx(18.05, 0.45, -78.55), 0, { why: 'the gatehouse kettle counter, front north' });
  d.skin('H1:trafficIsland', bx(11, 0.5, -77), 0, { why: 'the barrier island' });
  lit(d.skin('H1:barrierArm', bx(12.75, 1.0, -77), 0, { why: 'the barrier arm (visual box), pivot at x 11.5' }), S1_GROUPS.lane);
  for (const x of BOLLARD_XS) lit(d.skinCyl('H1:lightBollard', cy(x, -45.5), { why: 'a forecourt light bollard post (the lamp stays the rig\'s)' }), S1_GROUPS.fore);

  // ---- 2. hero placements (exact, through `tryAdd`: one spot each). A refusal is a brief error unless the piece is in
  // `S1_OMITTED`: then it is left out, never moved, and logged in `S1_REFUSED`. The three gatehouse wall pieces sit on the
  // inner wall faces (z -72.65, x 13.65: the walls are 0.3 thick on -72.5 and 13.5 since G2; art-join, S1 L1).
  S1_REFUSED.length = 0;
  const hero = (piece: string, x: number, y: number, z: number, yaw: number, o: Parameters<CampusDresser['tryAdd']>[2]): void => {
    if (d.tryAdd(piece, [{ x, y, z, yaw }], o) >= 0) return;
    const rule = d.refusals[d.refusals.length - 1]!.rule;
    if (!S1_OMITTED.some((m) => m.piece === piece && m.x === x && m.z === z)) throw new Error(`campus art S1: hero ${piece} at (${x}, ${z}) refused by ${rule} and not in S1_OMITTED`);
    S1_REFUSED.push({ piece, x, z, rule });
  };
  hero('H1:monitorBank', 18.8, 0, -72.65, PI, { cls: 'visual', group: S1_GROUPS.gate, why: 'the CCTV officer cam-gate / cam-walk monitors on the north wall' });
  hero('H1:keyCabinet', 15.2, 0, -72.65, PI, { cls: 'visual', why: 'the site keys by the door' });
  hero('H1:visitorBoard', 13.65, 0, -78.0, PI / 2, { cls: 'visual', why: 'the night's visitor list on paper' });
  hero('H1:barrierHousing', 11.0, 1.0, -76.2, 0, { cls: 'visual', why: 'the motor housing on the island top' });
  hero('H1:intercomPost', 12.6, 0, -79.3, 0, { cls: 'see', why: 'the drivers intercom by the gate' });
  hero('K:siteSign', 6.8, 0, -79.0, PI, { cls: 'solid', why: 'the Orrin site sign at the gate' });
  // (campus-greybox G3) the stands moved with the shelter by (-2, -4)
  for (const x of [-10, -7, -4]) hero('K:bikeRack', x, 0, -50.8, PI, { cls: 'see', why: 'the bike shelter stands' });
  hero('K:parkBench', 8, 0, -47.6, PI, { cls: 'see', why: 'the smoking shelter bench' });

  if (S1_REFUSED.length !== S1_OMITTED.length) throw new Error(`campus art S1: S1_OMITTED lists ${S1_OMITTED.length} refusals, ${S1_REFUSED.length} happened`);

  d.base();
}
