import { describe, expect, it } from 'vitest';
import { KITS, kitCoverage, MAX_CABLE_SPAN, MOTH_KIT, validateKit, WREN_KIT } from '../src/operators/kit';
import type { Kit, KitItem } from '../src/operators/kit';
import { BASE_CORRECTIONS, JOINT_NAMES, OPERATORS, operatorBodyExport, operatorJoints, operatorProportions } from '../src/operators/operatorBody';
import { proportions } from '../src/player/proportions';

const withItem = (kit: Kit, item: KitItem): Kit => ({ ...kit, items: [...kit.items, item] });
const base = { kind: 'strap', zone: 'torso', where: 'x', job: 'holds', attach: 'sewn' } as const;

describe('operator kit', () => {
  it('both kits are logical', () => {
    expect(validateKit(WREN_KIT)).toEqual([]);
    expect(validateKit(MOTH_KIT)).toEqual([]);
  });

  it('the pipeline kit check names built items missing from the kit', () => {
    expect(kitCoverage(WREN_KIT, ['combatShirt', 'elbowPockets', 'armPocketL', 'armPocketR'])).toEqual({ missing: [], errors: [] });
    // step 05: the base layer and the trousers with what is sewn onto them
    expect(kitCoverage(WREN_KIT, ['baseLayer', 'trousers', 'kneePads', 'cargoL', 'cargoR']).missing).toEqual([]);
    expect(kitCoverage(WREN_KIT, ['combatShirt', 'shoulderCape']).missing).toEqual(['shoulderCape']);
    const broken = withItem(WREN_KIT, { ...base, id: 'bad', name: 'bad', anchors: [] });
    expect(kitCoverage(broken, ['combatShirt']).errors.length).toBeGreaterThan(0);
  });

  it('every cable span is within the limit', () => {
    for (const kit of Object.values(KITS)) {
      for (const c of kit.items.filter((i) => i.kind === 'cable')) {
        const pts = [0, ...(c.retention ?? []).map((r) => r.at), c.length ?? 0];
        for (let i = 1; i < pts.length; i++) expect(pts[i]! - pts[i - 1]!).toBeLessThanOrEqual(MAX_CABLE_SPAN + 1e-9);
      }
    }
  });

  it('rejects a strap with one anchor', () => {
    const e = validateKit(withItem(WREN_KIT, { ...base, id: 'bad', name: 'bad', anchors: [{ item: 'carrier', point: 'top' }] }));
    expect(e.some((x) => x.includes('two anchors'))).toBe(true);
  });

  it('rejects a strap anchored to nothing or twice to one point', () => {
    const e = validateKit(withItem(WREN_KIT, { ...base, id: 'bad', name: 'bad', anchors: [{ item: 'nowhere', point: 'a' }, { item: 'nowhere', point: 'a' }] }));
    expect(e.some((x) => x.includes('unknown item'))).toBe(true);
    expect(e.some((x) => x.includes('same point'))).toBe(true);
  });

  it('rejects a pouch without contents or closure', () => {
    const e = validateKit(withItem(MOTH_KIT, { ...base, kind: 'pouch', id: 'bad', name: 'bad', contents: [] }));
    expect(e.some((x) => x.includes('contents'))).toBe(true);
    expect(e.some((x) => x.includes('closure'))).toBe(true);
  });

  it('rejects an item without a job', () => {
    const e = validateKit(withItem(MOTH_KIT, { ...base, kind: 'hardware', id: 'bad', name: 'bad', job: ' ' }));
    expect(e).toContain('moth.bad: no job');
  });

  it('rejects a cable without a source or with a long free span', () => {
    const e = validateKit(
      withItem(WREN_KIT, { ...base, kind: 'cable', id: 'bad', name: 'bad', device: 'goggle', length: 0.5, retention: [{ at: 0.1, by: 'clip' }, { at: 0.3, by: 'clip' }] }),
    );
    expect(e.some((x) => x.includes('source'))).toBe(true);
    expect(e.some((x) => x.includes('0.20 m free before "clip"'))).toBe(true);
    expect(e.some((x) => x.includes('before the device'))).toBe(true);
  });

  it('rejects duplicate ids', () => {
    const first = WREN_KIT.items[0]!;
    expect(validateKit(withItem(WREN_KIT, first))).toContain(`${first.id}: duplicate id`);
  });
});

describe('operator bodies', () => {
  it('uses each operator\'s height', () => {
    expect(operatorProportions(OPERATORS.wren).height).toBe(1.68);
    expect(operatorProportions(OPERATORS.moth).height).toBe(1.78);
  });

  it('applies the ANSUR II corrections without touching proportions.ts', () => {
    const p = operatorProportions(OPERATORS.moth);
    const k = 1.78 / 1.75;
    expect(p.y.shoulder).toBeCloseTo(BASE_CORRECTIONS.shoulderY * k, 6);
    expect(p.hand.len).toBeCloseTo(BASE_CORRECTIONS.handLen * k, 6);
    expect(p.upperArm.len).toBeCloseTo(0.3 * k, 6);
    expect(proportions('average').y.shoulder).toBe(1.435);
  });

  it('puts fingertips near the survey ratio (~0.37 of stature)', () => {
    for (const def of Object.values(OPERATORS)) {
      const hand = operatorJoints(operatorProportions(def)).find((j) => j.name === 'handR')!;
      expect(hand.pos[1] / def.height).toBeGreaterThan(0.36);
      expect(hand.pos[1] / def.height).toBeLessThan(0.38);
    }
  });

  it('exports every joint once, parents first, symmetric left and right', () => {
    const joints = operatorJoints(operatorProportions(OPERATORS.wren));
    expect(joints.map((j) => j.name)).toEqual([...JOINT_NAMES].sort((a, b) => joints.findIndex((j) => j.name === a) - joints.findIndex((j) => j.name === b)));
    expect(new Set(joints.map((j) => j.name)).size).toBe(JOINT_NAMES.length);
    const seen = new Set<string>();
    for (const j of joints) {
      if (j.parent) expect(seen.has(j.parent)).toBe(true);
      seen.add(j.name);
    }
    const by = (n: string) => joints.find((j) => j.name === n)!.pos;
    expect(by('shL')[0]).toBeCloseTo(-by('shR')[0], 9);
    // Straight legs reach the ground: the ankle sits at the table's ankle height.
    const p = operatorProportions(OPERATORS.wren);
    expect(Math.abs(by('anL')[1] - p.y.ankle)).toBeLessThan(0.01);
    expect(Math.abs(by('knL')[1] - p.y.knee)).toBeLessThan(0.01);
  });

  it('Wren is shorter with a lower head sample than Moth', () => {
    const w = operatorBodyExport(OPERATORS.wren);
    const m = operatorBodyExport(OPERATORS.moth);
    expect(m.hitVolumes.headY - w.hitVolumes.headY).toBeGreaterThan(0.05);
    expect(w.proportions.pelvis.w / w.proportions.shoulderWidth).toBeGreaterThan(m.proportions.pelvis.w / m.proportions.shoulderWidth);
  });
});
