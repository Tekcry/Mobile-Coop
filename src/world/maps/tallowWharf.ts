import { Vector3 } from '../../core/babylon';
import { hyp2 } from '../../core/mathx';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { W1 } from './tallowWharfW1';
import { W2 } from './tallowWharfW2';
import { W3 } from './tallowWharfW3';
import { W4 } from './tallowWharfW4';
import { WHARF_SECTORS } from './tallowWharfSectors';
import { WHARF_MISSIONS } from './tallowWharfMissions';
import { inSection, MASS_TOP, mass, T, wall, WHARF_BOUNDS, Y, type WharfSection } from './tallowWharfKit';

const GROUND = '#3d4245';
const WALL = '#a9a496';
const WATER = '#10202b';

/** The four sections in play order (section index 0-3). */
const SECTIONS: readonly WharfSection[] = [W1, W2, W3, W4];

/** Runs one section file's build and tags the doors it made with that section (a copy of `campusOps.ts` `buildSection`). */
function buildSection(b: LevelBuilder, index: number, build: (b: LevelBuilder) => void): void {
  const n0 = b.anchors.doors.length;
  build(b);
  for (let i = n0; i < b.anchors.doors.length; i++) b.anchors.doors[i]!.section = index;
}

/**
 * The shell, before any section: the ground, the perimeter, the W1 canal barrier, the masses between the section boxes and the
 * arcade lane's south wall. Exported so the shell test checks exactly these boxes (box 0 the ground, 1-4 the perimeter, 5 the
 * canal water, then the barrier, three masses and the lane wall).
 */
export function buildShell(b: LevelBuilder): void {
  const W = WHARF_BOUNDS;
  // the ground (z 6-80, top y 0; the canal is z 0-6) and the boundary walls (they set the map's bounds)
  b.floor((W.minX + W.maxX) / 2, 43, W.maxX - W.minX, 74, GROUND, 0, 1);
  b.perimeter(W.minX, W.maxX, W.minZ, W.maxZ, MASS_TOP, '#2c3033');
  // the W1 canal barrier (x 0-44, z 0-6): the dark water below the quay (no collision) and an invisible wall on the quay edge
  // (flush to z 6: it ends at the area boxes' south edge, never inside them). The W4 canal (x 44-120) is GB4's.
  b.box(22, -1.8, 3, 44, 2.4, 6, WATER, 0, 0, false, true);
  const i0 = b.boxes.length;
  b.box(22, 1.5, 6 - T / 2, 44, 3, T, WALL, 0, 0, true, false);
  b.mark(i0, { noLedge: true });
  // the masses between the section boxes
  mass(b, 0, 62, 40, 80);
  mass(b, 40, 0, 44, 48);
  mass(b, 44, 34, 82, 48);
  // the arcade lane (x 76-82, z 48-80): the ground is its floor; closed at z 48 (the perimeter closes z 80). Its door into the arcade is GB2's.
  wall(b, true, 48, 76, 82, [], 0, 12, T, WALL);
  // night floor as the campus (Q2 'Never', G329, light-realism research 2 and 4, J8 A3): the standby fill 0.14 under the
  // moon, so a cut circuit reads dark; a smaller room zone (LP's transit fill) wins inside it
  b.ambientZone(W.minX, W.maxX, W.minZ, W.maxZ, 0.14, Y.canalBed - 1, MASS_TOP + 1);
}

/**
 * Tallow Wharf (mission-framework GB0): the canal-side merchants' quarter of the campaign map (graph
 * `docs/missions/prototypes/campaign-map/graph.json`): the night market (W1), the arcade lofts (W2), the counting house (W3) and
 * the wharf sheds (W4), 120 x 80 m with the canal along the south edge. This file is the shell (ground, perimeter, the masses
 * between the section boxes, the arcade lane, the layout); each section is built by its own file (`tallowWharfW1..W4.ts`) from the
 * shared kit (`tallowWharfKit.ts`). Registered in `MAPS`, not listed: `?autostart=tallowWharf&mode=sector&mission=<id>`.
 */
export const tallowWharf: MapDef = {
  id: 'tallowWharf',
  name: 'Tallow Wharf',
  description: "A canal-side merchants' quarter at night: the night market, the arcade lofts, the counting house and the wharf sheds.",
  modes: ['sector'],
  sectors: WHARF_SECTORS,
  missions: WHARF_MISSIONS,
  navLayers: 4,
  // registered, not listed: off the Sector Ops menu, the Play screen and the co-op lobby (`?autostart=tallowWharf&mode=sector&mission=<id>`)
  unlisted: true,
  // (FLG) `?autostart` boots it only with `?missions=1`
  needsMissions: true,
  // greybox: no generated skirting, vents or clutter
  detail: false,
  theme: {
    sky: '#0b111b',
    horizon: '#2b3440',
    ground: '#4a4f50',
    fogStart: 40,
    fogEnd: 120,
    sunDir: [0.35, -1, 0.55],
    // night: moonlight on the quay, dark inside but for the lamps that are on
    sunIntensity: 0.16,
    ambient: 0.3,
    lightLevel: 0.3,
    faction: 'maritime',
    // cool sodium outside, a little desaturated
    grade: { tint: [1.0, 0.99, 1.04], saturation: 0.85, contrast: 1.08 },
    lampBeams: false,
  },
  build: (b: LevelBuilder): MapLayout => {
    buildShell(b);
    SECTIONS.forEach((s, i) => buildSection(b, i, s.build));
    return {
      playerSpawns: [
        { pos: new Vector3(7, 0, 10), yaw: 0 },
        { pos: new Vector3(8.5, 0, 10), yaw: 0 },
      ],
      // the sections' guards come from the mode, not the rooms
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      rooms: SECTIONS.flatMap((s) => s.rooms),
      switches: SECTIONS.flatMap((s, i) => inSection(s.switches, i)),
      hideSpots: SECTIONS.flatMap((s, i) => inSection(s.hideSpots, i)),
      navSeeds: SECTIONS.flatMap((s) => s.navSeeds),
      medkitWalls: SECTIONS.flatMap((s) => s.medkits ?? []),
      // (A24, M2) the throw sites: the throws that set `dist`, launched along runner -> thrower; built here, so each build
      // returns a new array (the team controller clears its sites by identity)
      throwSites: SECTIONS.flatMap((s) => s.throws)
        .filter((t) => t.dist !== undefined)
        .map((t) => {
          const dx = t.thrower.x - t.runner.x;
          const dz = t.thrower.z - t.runner.z;
          const d = hyp2(dx, dz);
          return { x: t.thrower.x, z: t.thrower.z, dx: dx / d, dz: dz / d, dist: t.dist! };
        }),
      debugPoints: SECTIONS.flatMap((s) => s.debugPoints.map((p) => ({ group: s.id, ...p }))),
      alarms: [],
    };
  },
};
