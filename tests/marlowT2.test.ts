/**
 * (marlow-bays slice T2) The tuner redesign's pure parts: the body part filter (slice T's targets in reverse), the click
 * on her (joints, then bones), row groups that fold, pinned and recent sliders, the status line's stance, the sizes.
 */
import { describe, expect, it } from 'vitest';
import { BODY_PARTS, emptyTarget, nearestPoint, partLabel, pickOnBody, RIG_BONES, RIG_JOINTS, rowHasPart, targetHasPart, tuneTarget } from '../src/ui/tunerTarget';
import { GROUP_FOLD_MIN, groupOpen, stanceText, tunerScale } from '../src/ui/tunerLayout';

describe('T2: part labels', () => {
  it('plain words for every part in the list', () => {
    expect(partLabel('')).toBe('All parts');
    expect(partLabel('elbowR')).toBe('Right elbow');
    expect(partLabel('wristL')).toBe('Left hand');
    expect(partLabel('ankleR')).toBe('Right foot');
    expect(partLabel('headNode')).toBe('Head');
    expect(partLabel('torso')).toBe('Chest');
    expect(partLabel('weapon')).toBe('Weapon');
    expect(partLabel('body')).toBe('Whole body');
    for (const p of BODY_PARTS) expect(partLabel(p)).not.toMatch(/[A-Z][a-z]+[LR]$|undefined/);
  });
  it('the list has every joint once, then the weapon and the whole body', () => {
    expect(BODY_PARTS[0]).toBe('');
    for (const j of RIG_JOINTS) expect(BODY_PARTS.filter((p) => p === j).length).toBe(1);
    expect(BODY_PARTS.slice(-2)).toEqual(['weapon', 'body']);
  });
});

describe('T2: the part filter', () => {
  it('a joint target by its joint, a bone by its first joint, a pair by either', () => {
    const t = emptyTarget();
    tuneTarget('joint', 'elbowR_x', t); // the forearm: elbowR -> wristR, a bone
    expect(targetHasPart(t, 'elbowR')).toBe(true);
    expect(targetHasPart(t, 'wristR')).toBe(false);
    expect(targetHasPart(t, 'elbowL')).toBe(false);
    tuneTarget('body', 'kneeFlexAdd', t); // both knees, a pair
    expect(targetHasPart(t, 'kneeL')).toBe(true);
    expect(targetHasPart(t, 'kneeR')).toBe(true);
    expect(targetHasPart(t, 'hips')).toBe(false);
  });
  it('the weapon and the whole body only by their own part; the camera and no part never filter', () => {
    const t = emptyTarget();
    tuneTarget('gun', 'gunFwd', t);
    expect(targetHasPart(t, 'weapon')).toBe(true);
    expect(targetHasPart(t, 'wristR')).toBe(false);
    tuneTarget('body', 'bodyFwdAdd', t);
    expect(t.kind).toBe('body');
    expect(targetHasPart(t, 'body')).toBe(true);
    expect(targetHasPart(t, 'hips')).toBe(false);
    tuneTarget('cam', 'camBoomAdd', t);
    expect(targetHasPart(t, 'elbowR')).toBe(true);
    expect(targetHasPart(emptyTarget(), 'kneeL')).toBe(true);
    expect(targetHasPart(t, '')).toBe(true);
  });
  it('rows by section and slider id', () => {
    expect(rowHasPart('joint', 'kneeL_x', 'kneeL')).toBe(true);
    expect(rowHasPart('joint', 'kneeL_x', 'kneeR')).toBe(false);
    expect(rowHasPart('keys', 'armR_elbow', 'elbowR')).toBe(true);
    expect(rowHasPart('weapon', 'supportSlide', 'wristL')).toBe(true);
    expect(rowHasPart('weapon', 'gunX', 'weapon')).toBe(true);
    expect(rowHasPart('step', 'lift', 'ankleL')).toBe(true);
    expect(rowHasPart('weight', 'bank', 'hips')).toBe(true);
    expect(rowHasPart('anything', 'x', '')).toBe(true);
  });
});

describe('T2: a click on her', () => {
  // three joints in a column 100 px apart and one off the rig (behind the camera)
  const xs = [100, 100, 100, 400];
  const ys = [100, 200, 300, 100];
  const ok = [true, true, true, false];
  it('nearestPoint: the nearest shown point inside the radius, -1 none', () => {
    expect(nearestPoint(xs, ys, ok, 104, 196, 20)).toBe(1);
    expect(nearestPoint(xs, ys, ok, 100, 150, 20)).toBe(-1);
    expect(nearestPoint(xs, ys, ok, 400, 100, 20)).toBe(-1);
    expect(nearestPoint([], [], [], 0, 0, 50)).toBe(-1);
  });
  it('pickOnBody: a joint first, else the bone under the click (its first joint), else a near joint', () => {
    const bones: [number, number][] = [
      [0, 1],
      [1, 2],
    ];
    expect(pickOnBody(xs, ys, ok, bones, 102, 205)).toBe(1);
    // halfway down the second bone, 10 px aside: the bone's first joint
    expect(pickOnBody(xs, ys, ok, bones, 110, 250)).toBe(1);
    expect(pickOnBody(xs, ys, ok, bones, 110, 150)).toBe(0);
    // far from any bone but inside the last radius
    expect(pickOnBody(xs, ys, ok, bones, 150, 300)).toBe(2);
    expect(pickOnBody(xs, ys, ok, bones, 300, 300)).toBe(-1);
  });
  it('the rig bones join real joints', () => {
    for (const [a, b] of RIG_BONES) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(a).not.toBe(b);
    }
    expect(RIG_BONES.some(([a, b]) => RIG_JOINTS[a] === 'hipL' && RIG_JOINTS[b] === 'kneeL')).toBe(true);
  });
});

describe('T2: groups that fold', () => {
  const base = { first: false, hasSel: false, rows: 20 };
  it('folded by default; open when first, selected or short', () => {
    expect(groupOpen(undefined, base)).toBe(false);
    expect(groupOpen(undefined, { ...base, first: true })).toBe(true);
    expect(groupOpen(undefined, { ...base, hasSel: true })).toBe(true);
    expect(groupOpen(undefined, { ...base, rows: GROUP_FOLD_MIN })).toBe(true);
  });
  it('a choice by hand holds', () => {
    expect(groupOpen(true, base)).toBe(true);
    expect(groupOpen(false, { ...base, first: true, hasSel: true })).toBe(false);
  });
});

describe('T2: the status line', () => {
  it('in the chamber: the loop and the picked gun as it really is', () => {
    expect(stanceText('walk', '', { loop: 'Walk', drawn: false, weapon: 'rifle' })).toBe('Walk · Rifle holstered');
    expect(stanceText('lowReady', 'rifle.lowReady', { loop: 'Low ready', drawn: true, weapon: 'rifle' })).toBe('Low ready · Rifle drawn');
    expect(stanceText('aim', 'pistol.aim', { loop: 'Aim fwd', drawn: true, weapon: 'pistol' })).toBe('Aim fwd (aim) · Pistol drawn');
  });
  it('outside it: the game state; no gun drawn rather than "unarmed"', () => {
    expect(stanceText('walk', '', null)).toBe('Walk · No gun drawn');
    expect(stanceText('lowReady', 'rifle.lowReady', null)).toBe('Low ready · Rifle low ready');
  });
});

describe('T2: sizes and narrow windows', () => {
  it('S < M < L at 1080p, a third of the width at most', () => {
    const s = tunerScale('S', 1920, 1080);
    const m = tunerScale('M', 1920, 1080);
    const l = tunerScale('L', 1920, 1080);
    expect([s.font, m.font, l.font]).toEqual([16, 19, 22]);
    expect(l.width).toBeLessThanOrEqual(1920 * 0.34);
  });
  it('1280 x 720: readable, and she keeps two thirds of the screen', () => {
    for (const z of ['S', 'M', 'L'] as const) {
      const k = tunerScale(z, 1280, 720);
      expect(k.font).toBeGreaterThanOrEqual(12);
      expect(k.width).toBeLessThanOrEqual(1280 * 0.34);
      expect(k.width).toBeGreaterThanOrEqual(300);
    }
  });
});
