import type { LevelBuilder } from '../levelBuilder';

/**
 * Marlow Yard variety pass (job marlow-variety, `docs/marlow-variety/BRIEF.md`; the marlow-bunker polish list): what
 * each test cell is, readable at a glance. Visual dressing on top of the bunker build (`ctcourseBunker.ts`): every piece
 * is collide = false except the S6 server racks (2 m: too tall to vault or mantle, `noLedge`, so no lip). Faces and
 * paint are thinner than the bake's 5 cm (no light change); the pieces that are thicker (the S6 racks and scanner
 * frames, the S8 coffer beams) are proved by `tests/ctcourseLight.test.ts`. No yellow, green or blue-grey but the S8
 * coffer's faint green (the exit, the same element as the green exit square). Positions: bay origin x0 = 22 (n - 1).
 */

const DARK = '#1d1f22';
const STEEL = '#8d949b';
const WHITE = '#e2e4e6';
const SCREEN = '#16222a';
const GLOW = '#d8eefc';
const MIRROR = '#232a31';
const PLY = '#b08a5c';
const PLY_SEAM = '#7a5f3f';
const EXIT_LED = '#d4f2e0';
const RELEASE_RED = '#c43c3c';

const CT_W = 14;
const bayX = (i: number): number => 22 * i;

/** A plate on a face along z (the face at x, the plate on the `into` side, `off` m proud already), z0 .. z1, y0 .. y1. */
function onX(b: LevelBuilder, x: number, into: number, z0: number, z1: number, y0: number, y1: number, color: string, off = 0, t = 0.03): void {
  b.box(x + into * (off + t / 2), (y0 + y1) / 2, (z0 + z1) / 2, t, y1 - y0, z1 - z0, color, 0, 0, false);
}

/** A plate on a face along x (the face at z, the plate on the `into` side, `off` m proud already), x0 .. x1, y0 .. y1. */
function onZ(b: LevelBuilder, z: number, into: number, x0: number, x1: number, y0: number, y1: number, color: string, off = 0, t = 0.03): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, z + into * (off + t / 2), x1 - x0, y1 - y0, t, color, 0, 0, false);
}

/** S1: the sentry post's desk by the south wall behind the training guard (z 0.9 - 1.7, clear of x 2 - 10.5, z 2.5 - 5). */
function sentryDesk(b: LevelBuilder): void {
  const x = 11.2;
  b.box(x, 0.73, 1.3, 1.8, 0.04, 0.8, '#4a4f55', 0, 0, false);
  for (const dx of [-0.85, 0.85]) b.box(x + dx, 0.36, 1.3, 0.04, 0.71, 0.76, '#2f3338', 0, 0, false);
  // the post's screen and the log book
  b.box(x - 0.3, 0.98, 1.0, 0.5, 0.32, 0.03, SCREEN, 0, 0, false);
  b.box(x - 0.3, 0.98, 1.0 + 0.016, 0.42, 0.24, 0.002, GLOW, 0, 0, false);
  b.box(x + 0.4, 0.76, 1.3, 0.3, 0.02, 0.22, WHITE, 0, 0, false);
}

/** S1: a blast-door frame round the entry lift on the west wall (face at x 0.15): the lobby's armoured opening. */
function liftBlastFrame(b: LevelBuilder): void {
  const fx = 0.15;
  onX(b, fx, 1, 5.0, 5.6, 0, 3.4, DARK, 0.02);
  onX(b, fx, 1, 8.4, 9.0, 0, 3.4, DARK, 0.02);
  onX(b, fx, 1, 5.0, 9.0, 2.9, 3.4, DARK, 0.02);
  // white chevrons on the jambs (the hazard frame, kept off yellow)
  for (const z of [5.3, 8.7]) for (let y = 0.3; y < 2.8; y += 0.5) b.box(fx + 0.065, y, z, 0.01, 0.08, 0.6, WHITE, 0, Math.PI / 4, false);
}

/** S3: the security cell's monitor wall on the south wall (face at z 0.15): six screens showing the camera's feed. */
function monitorWall(b: LevelBuilder): void {
  const x0 = bayX(2);
  const fz = 0.15;
  onZ(b, fz, 1, x0 + 1.4, x0 + 6.6, 1.0, 2.7, DARK, 0.02);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 2; r++) {
      const sx = x0 + 1.6 + c * 1.7;
      const sy = 1.1 + r * 0.8;
      onZ(b, fz, 1, sx, sx + 1.5, sy, sy + 0.7, SCREEN, 0.05, 0.02);
      onZ(b, fz, 1, sx + 0.15, sx + 0.15 + 0.4 + 0.3 * ((c + r) % 3), sy + 0.45, sy + 0.5, GLOW, 0.07, 0.005);
      onZ(b, fz, 1, sx + 0.15, sx + 0.9, sy + 0.2, sy + 0.24, GLOW, 0.07, 0.005);
    }
  }
}

/**
 * A plant room's face in a south pocket (the cross wall's face at x, the bay on the `into` side): a louvred grille, the
 * plant room's steel door and the cable trunking up to the haunch. The pocket is sealed void (no way in).
 */
function plantFace(b: LevelBuilder, x: number, into: number, ceil: number): void {
  onX(b, x, into, 0.9, 1.9, 2.3, 3.1, DARK, 0.02);
  for (let k = 0; k < 5; k++) onX(b, x, into, 0.95, 1.85, 2.38 + k * 0.15, 2.44 + k * 0.15, STEEL, 0.05, 0.01);
  onX(b, x, into, 2.5, 3.4, 0, 2.05, '#4c5359', 0.02);
  onX(b, x, into, 3.25, 3.32, 0.95, 1.1, STEEL, 0.05, 0.02);
  onX(b, x, into, 1.3, 1.5, 3.1, ceil - 1.1, '#3b4045', 0.02, 0.04);
}

/**
 * An instructor booth's face in a north pocket (the cross wall's face at x, the cell it watches on the `into` side):
 * one-way observation glass (a dark mirrored panel, no opening: nothing changes in the light or the walls) in a steel
 * frame with mullions, and the booth's door.
 */
function boothFace(b: LevelBuilder, x: number, into: number): void {
  onX(b, x, into, 10.5, 13.5, 1.0, 2.3, STEEL, 0.02);
  onX(b, x, into, 10.6, 13.4, 1.08, 2.22, MIRROR, 0.05, 0.01);
  for (const z of [11.55, 12.45]) onX(b, x, into, z - 0.03, z + 0.03, 1.08, 2.22, STEEL, 0.06, 0.01);
  onX(b, x, into, 10.5, 13.5, 0.92, 1.0, STEEL, 0.02, 0.06);
}

/** S5: the kill-house mock-up's plywood skin on its front face (x0 + 8.85, both sides of the door) and painted windows. */
function plywood(b: LevelBuilder): void {
  const x0 = bayX(4);
  const fx = x0 + 8.85;
  for (const [z0, z1] of [[0.15, 6.3], [7.7, 13.85]] as const) {
    onX(b, fx, -1, z0, z1, 0, 4.0, PLY, 0, 0.015);
    for (let z = z0 + 1.2; z < z1 - 0.3; z += 1.2) onX(b, fx, -1, z - 0.015, z + 0.015, 0, 4.0, PLY_SEAM, 0.015, 0.004);
    onX(b, fx, -1, z0, z1, 2.39, 2.41, PLY_SEAM, 0.015, 0.004);
  }
  // painted window outlines (a mock-up's windows: paint, no opening), clear of the leg-up band at z 3 - 4
  for (const [z0, z1] of [[1.0, 2.4], [9.6, 11.0], [11.8, 13.2]] as const) {
    for (const [a, c, d, e] of [[z0, z1, 1.0, 1.05], [z0, z1, 2.15, 2.2], [z0, z0 + 0.05, 1.0, 2.2], [z1 - 0.05, z1, 1.0, 2.2]] as const) {
      onX(b, fx, -1, a, c, d, e, WHITE, 0.015, 0.004);
    }
  }
  // the grid wall's front face inside the mock-up (x0 + 12.35): plywood too
  for (const [z0, z1] of [[0.15, 6.3], [7.7, 13.85]] as const) onX(b, x0 + 12.35, -1, z0, z1, 0, 4.0, PLY, 0, 0.015);
}

/** S6: a pilaster-and-lintel frame round each scanner (0.3 m proud, collide = false) and server racks on the west wall. */
function vaultVestibule(b: LevelBuilder): void {
  const x0 = bayX(5);
  for (const [fz, into] of [[0.15, 1], [CT_W - 0.15, -1]] as const) {
    for (const dx of [-0.7, 0.7]) b.box(x0 + 5 + dx, 1.2, fz + into * 0.15, 0.2, 2.4, 0.3, '#5a6066', 0, 0, false);
    b.box(x0 + 5, 2.5, fz + into * 0.15, 1.6, 0.2, 0.3, '#5a6066', 0, 0, false);
  }
  // server racks (solid, 2 m: too tall to vault or mantle; no lip) against the west wall just north of the door (z 8 - 10.5:
  // further north they shade the corner by the panel)
  const from = b.boxes.length;
  for (let k = 0; k < 4; k++) b.box(x0 + 0.15 + 0.45, 1.0, 8.0 + 0.3 + k * 0.62, 0.9, 2.0, 0.6, '#2a2e33');
  b.mark(from, { noLedge: true });
  for (let k = 0; k < 4; k++) {
    const z = 8.0 + 0.3 + k * 0.62;
    for (let r = 0; r < 6; r++) b.box(x0 + 1.07, 0.3 + r * 0.3, z, 0.01, 0.03, 0.4, r % 2 ? GLOW : '#6fd0ff', 0, 0, false);
  }
}

/** S7: the return stair painted as training blocks (it steps down eastward): each block's east riser and north side its own
 *  colour, a white nosing on the top's east edge. Paint only: the blocks' own colour (their surface) is unchanged. */
function trainingBlocks(b: LevelBuilder, stairZ: number): void {
  const x0 = bayX(6);
  const colours = ['#8c3b3b', '#9b5a2e', '#6d4a8c'];
  for (let k = 1; k <= 3; k++) {
    const h = 1.1 * (4 - k);
    const cx = x0 + 9 + 0.5 + k - 0.5;
    const c = colours[k - 1]!;
    b.box(cx + 0.5 + 0.006, h / 2, stairZ, 0.01, h, 1.2, c, 0, 0, false);
    b.box(cx, h / 2, stairZ + 0.6 + 0.006, 1.0, h, 0.01, c, 0, 0, false);
    b.box(cx + 0.45, h + 0.004, stairZ, 0.1, 0.006, 1.2, WHITE, 0, 0, false);
  }
}

/**
 * S8: a 4 x 6 m coffer over the exit between the cell's last two ribs (x0 + 10.5, x0 + 14.5): two short beams 0.3 m
 * deep at z 4 and 10 (3 m from the exit lamp), and an LED ring inside it, faintly green: the way out.
 */
function exitCoffer(b: LevelBuilder, ceil: number): void {
  const x0 = bayX(7);
  const xa = x0 + 10.5 + 0.15;
  const xb = x0 + 14.5 - 0.15;
  for (const z of [4, 10]) b.box((xa + xb) / 2, ceil - 0.15, z, xb - xa, 0.3, 0.3, '#373b40', 0, 0, false);
  const y = ceil - 0.012;
  const i = 0.25;
  b.box((xa + xb) / 2, y, 4 + 0.15 + i, xb - xa - 2 * i, 0.02, 0.05, EXIT_LED, 0, 0, false);
  b.box((xa + xb) / 2, y, 10 - 0.15 - i, xb - xa - 2 * i, 0.02, 0.05, EXIT_LED, 0, 0, false);
  for (const x of [xa + i, xb - i]) b.box(x, y, 7, 0.05, 0.02, 6 - 0.3 - 2 * i, EXIT_LED, 0, 0, false);
}

/** S4: a hazard frame round the red laser release (north wall, x0 + 12): white and red, kept off yellow. */
function releaseFrame(b: LevelBuilder): void {
  const x = bayX(3) + 12;
  const fz = CT_W - 0.15;
  // in front of the cell's colour band (0.02 proud)
  onZ(b, fz, -1, x - 0.6, x + 0.6, 0.7, 1.9, WHITE, 0.02, 0.02);
  for (let k = 0; k < 6; k++) b.box(x - 0.5 + k * 0.2, 0.75, fz - 0.045, 0.06, 0.08, 0.01, RELEASE_RED, 0, 0, false);
  for (let k = 0; k < 6; k++) b.box(x - 0.5 + k * 0.2, 1.85, fz - 0.045, 0.06, 0.08, 0.01, RELEASE_RED, 0, 0, false);
}

/**
 * The variety pass. `ceil`: the cells' ceilings (`CT_CEIL`); `stairZ`: the S7 return stair's z.
 */
export function buildVariety(b: LevelBuilder, ceil: readonly number[], stairZ: number): void {
  sentryDesk(b);
  liftBlastFrame(b);
  monitorWall(b);
  for (let i = 0; i < 7; i++) {
    const x0 = bayX(i);
    // the south pockets are plant rooms: their faces in the cell before (not S5's: that face is inside the kill-house's
    // back room, by the hack panel) and the cell after
    if (i !== 4) plantFace(b, x0 + 16 - 0.15, -1, ceil[i]!);
    plantFace(b, x0 + 22 + 0.15, 1, ceil[i + 1]!);
  }
  // the north pockets at A3 and A4 are instructor booths, each watching the cell before it (S3 the camera, S4 the laser)
  boothFace(b, bayX(2) + 16 - 0.15, -1);
  boothFace(b, bayX(3) + 16 - 0.15, -1);
  plywood(b);
  vaultVestibule(b);
  trainingBlocks(b, stairZ);
  exitCoffer(b, ceil[7]!);
  releaseFrame(b);
}
