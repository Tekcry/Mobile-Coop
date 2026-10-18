import { describe, expect, it } from 'vitest';
import { bodyScale, lightSampleHeight, STANDARD_BODY } from '../src/game/bodyHeight';
import { exposurePoints, exposurePointsPosed } from '../src/game/tactics';
import { OPERATORS } from '../src/operators/operatorBody';

// (operators step 11e fix r1, G129) light and exposure samples follow the body's real height
describe('body sample heights', () => {
  it('the off-wall light sample follows the body height, standing and crouched', () => {
    expect(lightSampleHeight(STANDARD_BODY, 0)).toBeCloseTo(1.75, 6);
    expect(lightSampleHeight(STANDARD_BODY, 1)).toBeCloseTo(1.75 * 0.65, 6);
    expect(lightSampleHeight(1.68, 0)).toBeCloseTo(1.68, 6);
    expect(lightSampleHeight(1.68, 1)).toBeCloseTo(1.68 * 0.65, 6);
    expect(lightSampleHeight(1.68, 0.5)).toBeCloseTo(1.68 * (1 - 0.35 * 0.5), 6);
    // Wren is sampled lower than the standard body, by her height difference (7 cm standing, 4.6 cm crouched)
    expect(lightSampleHeight(1.75, 0) - lightSampleHeight(1.68, 0)).toBeCloseTo(0.07, 6);
    expect(lightSampleHeight(1.75, 1) - lightSampleHeight(1.68, 1)).toBeCloseTo(0.0455, 6);
  });

  it('Wren is the player body: her operator height drives the samples', () => {
    expect(OPERATORS.wren.height).toBe(1.68);
    expect(bodyScale(OPERATORS.wren.height)).toBeCloseTo(0.96, 6);
    expect(bodyScale(STANDARD_BODY)).toBe(1);
  });

  it('exposure points scale with the body height (default: the 1.75 m body, unchanged)', () => {
    const feet = { x: 0, y: 0, z: 0 };
    const std = exposurePoints(feet, 0, 1, 0, 0, []);
    const std2 = exposurePoints(feet, 0, 1, 0, 0, [], 1.75);
    expect(std.map((p) => p.y)).toEqual(std2.map((p) => p.y));
    expect(std[0]!.y).toBeCloseTo(1.62, 6);
    const wren = exposurePoints(feet, 0, 1, 0, 0, [], 1.68);
    for (let i = 0; i < 5; i++) expect(wren[i]!.y).toBeCloseTo(std[i]!.y * (1.68 / 1.75), 6);
    expect(wren[0]!.y).toBeCloseTo(1.62 * 0.96, 6);
    const wrenCrouch = exposurePoints(feet, 1, 1, 0, 0, [], 1.68);
    const stdCrouch = exposurePoints(feet, 1, 1, 0, 0, []);
    for (let i = 0; i < 5; i++) expect(wrenCrouch[i]!.y).toBeCloseTo(stdCrouch[i]!.y * 0.96, 6);
    // the lean offsets are sideways: unchanged by height
    const lean = exposurePoints(feet, 0, 1, 0, 1, [], 1.68);
    expect(lean[0]!.x).toBeCloseTo(0.38, 6);
  });

  it('the posed path keeps the real head and chest; the rest scale with height', () => {
    const feet = { x: 0, y: 0, z: 0 };
    const head = { x: 0.4, y: 1.5, z: 0 };
    const chest = { x: 0.2, y: 1.2, z: 0 };
    const pts = exposurePointsPosed(feet, 0, 1, 0, 0, head, chest, [], 1.68);
    expect(pts[0]).toEqual(head);
    expect(pts[1]).toEqual(chest);
    expect(pts[2]!.y).toBeCloseTo(0.95 * 0.96, 6);
    expect(pts[3]!.y).toBeCloseTo(0.5 * 0.96, 6);
  });
});
