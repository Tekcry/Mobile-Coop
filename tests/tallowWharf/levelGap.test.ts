/**
 * Tallow Wharf J8 G0: the level-and-drop gap check (`soloLevelThreats`, PLAN A28 and section 6 G0). Synthetic pieces: a
 * co-op stage 1.0 m deep with its top at 4.5, and solo take-off tops at or above it across a gap. First the model numbers
 * the check rests on (the PLAN section 2 table), then each rule: a level top's landing reach, a higher top's, a railing
 * vaulted and a screen not, the in-air grab only for an edge a hand can take, and nothing below the stage.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { soloJumpReach, soloTopLandingReach, type CoopTop } from '../helpers/soloJumpReach';
import { soloLevelThreats } from './helpers';

/** The stage: x 0-10, z 0-1, top 4.5. */
const STAGE: CoopTop = { x0: 0, x1: 10, z0: 0, z1: 1, top: 4.5 };

/**
 * The stage plus a take-off top `top` high, 3 m deep, whose north edge is `gap` m south of the stage; `rail` adds a piece
 * `rail.h` over the take-off on its north edge, `rail.d` deep (`noLedge` when `rail.noLedge`).
 */
function scene(top: number, gap: number, rail?: { h: number; d: number; noLedge?: boolean }): { solid: BoxPiece[]; stage: BoxPiece } {
  const b = new LevelBuilder();
  b.box(5, STAGE.top / 2, 0.5, 10, STAGE.top, 1, '#888');
  b.box(5, top / 2, -gap - 1.5, 10, top, 3, '#888');
  if (rail) {
    b.box(5, top + rail.h / 2, -gap - rail.d / 2, 10, rail.h, rail.d, '#888');
    if (rail.noLedge) b.boxes[b.boxes.length - 1]!.noLedge = true;
  }
  const solid = b.boxes.filter((p) => p.collide);
  return { solid, stage: solid[0]! };
}

function threats(top: number, gap: number, opts: { rail?: { h: number; d: number; noLedge?: boolean }; edges?: { noLedge: boolean } } = {}): string[] {
  const { solid, stage } = scene(top, gap, opts.rail);
  return soloLevelThreats(solid, STAGE, (p) => p === stage, 0.2, opts.edges);
}

describe('soloLevelThreats: tops at or above a co-op top (J8 G0)', () => {
  it('the model numbers the check rests on (PLAN section 2)', () => {
    expect(soloTopLandingReach(4.5, 4.5)).toBeCloseTo(3.36, 1);
    expect(Math.abs(soloTopLandingReach(4.5, 4.5) - 3.36)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(soloTopLandingReach(8.4, 4.5) - 4.88)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(soloJumpReach(4.5, 4.5) - 4.64)).toBeLessThanOrEqual(0.02);
  });

  it('a level top 3.5 m from the stage is reported, 3.6 m is not (3.36 + 0.2)', () => {
    expect(threats(4.5, 3.5)).toHaveLength(1);
    expect(threats(4.5, 3.6)).toEqual([]);
  });

  it('an 8.4 top 5.0 m away is reported, 5.1 m is not (4.88 + 0.2)', () => {
    expect(threats(8.4, 5.0)).toHaveLength(1);
    expect(threats(8.4, 5.1)).toEqual([]);
  });

  it('a 1.1 m railing on the take-off top does not block the flight; a 1.9 m noLedge screen 0.2 m thick does', () => {
    expect(threats(4.5, 3.0)).toHaveLength(1);
    expect(threats(4.5, 3.0, { rail: { h: 1.1, d: 0.05 } })).toHaveLength(1);
    expect(threats(4.5, 3.0, { rail: { h: 1.9, d: 0.2, noLedge: true } })).toEqual([]);
  });

  it('the in-air grab counts only for an edge a hand can take: a level top 4.8 m away (4.64 + 0.2)', () => {
    expect(threats(4.5, 4.8, { edges: { noLedge: false } })).toHaveLength(1);
    expect(threats(4.5, 4.8)).toEqual([]);
  });

  it('a top below the stage (4.0) is never reported by this helper (soloTopLandingThreats covers it)', () => {
    expect(threats(4.0, 0.5)).toEqual([]);
    expect(threats(4.0, 0.5, { edges: { noLedge: false } })).toEqual([]);
  });
});
