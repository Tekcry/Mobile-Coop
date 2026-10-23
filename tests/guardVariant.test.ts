import { describe, expect, it } from 'vitest';
import {
  applyGear, BASES, createPieces, createVariant, EYEWEARS, GEAR_PIECES, guardVariant, HAIR_CAPS, HAIR_COLOURS,
  HEAD_VARIANTS, HEADS, HEADWEARS, hasPiece, JITTER_MAX, KIT_CAPACITY, KIT_PIECES, OUTFITS, PIECE_CAPACITY,
  SKIN_TONES,
} from '../src/operators/guards/guardVariant';
import type { GuardPieces, GuardVariant } from '../src/operators/guards/guardVariant';
import enemies from '../src/config/enemies.json';

const KINDS = ['grunt', 'runner', 'heavy', 'sniper', 'enforcer', 'droneOp', 'officer'] as const;
const MAPS = ['ctcourse', 'campusOps', 'bunker'] as const;
const SEEDS: number[] = [];
for (let i = 0; i < 128; i++) SEEDS.push(i);

function look(seed: number, kind: string, map: string): GuardVariant {
  return guardVariant(seed, kind, map, createVariant());
}

function pieces(v: GuardVariant, helmet: boolean, armour: boolean, plated: boolean, kind: string): GuardPieces {
  return applyGear(v, helmet, armour, plated, kind, createPieces());
}

function pieceList(p: GuardPieces): string[] {
  return p.ids.slice(0, p.count);
}

describe('guardVariant: contract', () => {
  it('uses the game kind strings', () => {
    for (const k of KINDS) expect(Object.keys(enemies)).toContain(k);
  });

  it('is deterministic (128 seeds x 7 kinds x 3 maps)', () => {
    for (const kind of KINDS) {
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const a = look(seed, kind, map);
          const b = look(seed, kind, map);
          expect(b).toEqual(a);
          // a reused (dirty) out gives the same result as a fresh one
          const dirty = look((seed + 5) & 127, 'heavy', 'other');
          expect(guardVariant(seed, kind, map, dirty)).toEqual(a);
        }
      }
    }
  });

  it('emits only contract ids', () => {
    for (const kind of KINDS) {
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          expect(BASES).toContain(v.base);
          expect(HEAD_VARIANTS).toContain(v.head);
          expect(HEADS[v.base]).toContain(v.head);
          expect(Number.isInteger(v.skinTone) && v.skinTone >= 0 && v.skinTone < SKIN_TONES).toBe(true);
          expect(HAIR_CAPS).toContain(v.hairCap);
          expect(HAIR_COLOURS).toContain(v.hairColour);
          if (v.headwear !== null) expect(HEADWEARS).toContain(v.headwear);
          if (v.headwear2 !== null) expect(HEADWEARS).toContain(v.headwear2);
          if (v.eyewear !== null) expect(EYEWEARS).toContain(v.eyewear);
          expect(OUTFITS).toContain(v.outfit);
          expect(v.kitCount).toBeGreaterThanOrEqual(0);
          expect(v.kitCount).toBeLessThanOrEqual(KIT_CAPACITY);
          expect(v.kit.length).toBe(KIT_CAPACITY);
          const seen = new Set<string>();
          for (let i = 0; i < v.kitCount; i++) {
            expect(KIT_PIECES).toContain(v.kit[i]);
            expect(seen.has(v.kit[i] as string)).toBe(false);
            seen.add(v.kit[i] as string);
          }
          expect(Math.abs(v.jitter)).toBeLessThanOrEqual(JITTER_MAX);
        }
      }
    }
  });

  it('masks seeds to 7 bits', () => {
    expect(look(200, 'grunt', 'ctcourse')).toEqual(look(200 & 127, 'grunt', 'ctcourse'));
  });

  it('spreads jitter across the range without exceeding it', () => {
    let min = 1;
    let max = -1;
    for (const seed of SEEDS) {
      const j = look(seed, 'grunt', 'ctcourse').jitter;
      min = Math.min(min, j);
      max = Math.max(max, j);
    }
    expect(min).toBeLessThan(-0.03);
    expect(max).toBeGreaterThan(0.03);
  });
});

describe('guardVariant: distribution', () => {
  it('no (head, skin tone, hair cap) combo above 15% per kind', () => {
    for (const kind of KINDS) {
      const counts = new Map<string, number>();
      let total = 0;
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          const key = `${v.head}|${v.skinTone}|${v.hairCap}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
          total++;
        }
      }
      let top = 0;
      for (const c of counts.values()) top = Math.max(top, c);
      expect(top / total, kind).toBeLessThanOrEqual(0.15);
    }
  });

  it('open-face kinds use all four heads, every skin tone and every hair cap (bald included)', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      const heads = new Set<string>();
      const skins = new Set<number>();
      const caps = new Set<string>();
      const colours = new Set<string>();
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          heads.add(v.head);
          skins.add(v.skinTone);
          caps.add(v.hairCap);
          colours.add(v.hairColour);
        }
      }
      expect(heads.size, kind).toBe(4);
      expect(skins.size, kind).toBe(SKIN_TONES);
      expect(caps.size, kind).toBe(HAIR_CAPS.length);
      expect(colours.size, kind).toBe(HAIR_COLOURS.length);
    }
  });

  it('different maps give different looks for the same seed', () => {
    for (const kind of KINDS) {
      let differ = 0;
      for (const seed of SEEDS) {
        const a = look(seed, kind, 'ctcourse');
        const b = look(seed, kind, 'campusOps');
        if (JSON.stringify(a) !== JSON.stringify(b)) differ++;
      }
      expect(differ, kind).toBeGreaterThan(64);
    }
    // the per-map distributions are not all equal either
    const hist = (map: string): string => {
      const h = new Array<number>(HEAD_VARIANTS.length).fill(0);
      for (const seed of SEEDS) h[HEAD_VARIANTS.indexOf(look(seed, 'grunt', map).head)]!++;
      return h.join(',');
    };
    expect(new Set(MAPS.map(hist)).size).toBeGreaterThan(1);
  });

  it('different kinds give different looks for the same seed and map', () => {
    let differ = 0;
    for (const seed of SEEDS) {
      if (look(seed, 'grunt', 'ctcourse').skinTone !== look(seed, 'droneOp', 'ctcourse').skinTone) differ++;
    }
    expect(differ).toBeGreaterThan(64);
  });
});

describe('guardVariant: archetype matrix', () => {
  it('base per kind, head within the base, broad -> broad-1 only', () => {
    const base: Record<string, string> = {
      grunt: 'average', droneOp: 'average', officer: 'average', runner: 'lean', sniper: 'lean', heavy: 'broad', enforcer: 'broad',
    };
    for (const kind of KINDS) {
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          expect(v.base).toBe(base[kind]);
          expect(v.head.startsWith(`${v.base}-`)).toBe(true);
          if (v.base === 'broad') expect(v.head).toBe('broad-1');
        }
      }
    }
  });

  it('heavy and enforcer wear the balaclava, no eyewear', () => {
    for (const kind of ['heavy', 'enforcer']) {
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          expect(v.headwear).toBe('balaclava');
          expect(v.eyewear).toBeNull();
        }
      }
    }
  });

  it('sniper: glasses_dark always, boonie or cap, rolled sleeves', () => {
    for (const map of MAPS) {
      for (const seed of SEEDS) {
        const v = look(seed, 'sniper', map);
        expect(v.eyewear).toBe('glasses_dark');
        expect(['boonie', 'cap']).toContain(v.headwear);
        expect(v.outfit).toBe('uniform_rolled');
      }
    }
  });

  it('officer: uniform_jacket, peaked cap or hair only, radio', () => {
    for (const map of MAPS) {
      for (const seed of SEEDS) {
        const v = look(seed, 'officer', map);
        expect(v.outfit).toBe('uniform_jacket');
        expect([null, 'cap_officer']).toContain(v.headwear);
        expect(v.kit.slice(0, v.kitCount)).toContain('radio');
      }
    }
  });

  it('runner: work outfit, beanie or hair only, no balaclava or helmet-style headwear', () => {
    for (const map of MAPS) {
      for (const seed of SEEDS) {
        const v = look(seed, 'runner', map);
        expect(v.outfit).toBe('work');
        expect([null, 'beanie']).toContain(v.headwear);
      }
    }
  });

  it('droneOp: headset, pouch_belt; grunt: radio and flashlight mount, cap / beanie / hair', () => {
    for (const map of MAPS) {
      for (const seed of SEEDS) {
        const d = look(seed, 'droneOp', map);
        expect(d.headwear).toBe('headset');
        expect([null, 'cap']).toContain(d.headwear2);
        expect(d.kit.slice(0, d.kitCount)).toContain('pouch_belt');
        const g = look(seed, 'grunt', map);
        expect(g.kit.slice(0, g.kitCount)).toEqual(expect.arrayContaining(['radio', 'flashlight_mount']));
        expect([null, 'cap', 'beanie']).toContain(g.headwear);
        expect(g.outfit).toBe('uniform');
      }
    }
  });

  it('only the sniper wears dark glasses; others at most rare clear glasses', () => {
    for (const kind of KINDS) {
      let glasses = 0;
      let total = 0;
      for (const map of MAPS) {
        for (const seed of SEEDS) {
          const v = look(seed, kind, map);
          total++;
          if (v.eyewear !== null) glasses++;
          if (kind !== 'sniper') expect(v.eyewear).not.toBe('glasses_dark');
        }
      }
      if (kind !== 'sniper') expect(glasses / total, kind).toBeLessThan(0.2);
    }
  });

  it('an unknown kind (the dog) falls back without throwing', () => {
    const v = look(5, 'dog', 'ctcourse');
    expect(v.base).toBe('average');
  });
});

describe('applyGear', () => {
  it('lists only contract ids and fits the fixed capacity', () => {
    const all = new Set<string>([
      ...HEAD_VARIANTS, ...HAIR_CAPS, ...HEADWEARS, ...EYEWEARS, ...KIT_PIECES, ...OUTFITS, ...GEAR_PIECES,
    ]);
    for (const kind of KINDS) {
      for (const seed of SEEDS) {
        const v = look(seed, kind, 'ctcourse');
        for (let bits = 0; bits < 8; bits++) {
          const p = pieces(v, (bits & 1) !== 0, (bits & 2) !== 0, (bits & 4) !== 0, kind);
          expect(p.count).toBeLessThanOrEqual(PIECE_CAPACITY);
          expect(p.ids.length).toBe(PIECE_CAPACITY);
          const list = pieceList(p);
          expect(new Set(list).size).toBe(list.length);
          for (const id of list) expect(all.has(id), id).toBe(true);
          expect(list).toContain(v.head);
          expect(list).toContain(v.outfit);
        }
      }
    }
  });

  it('A5: random never adds helmet or armour', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      for (const seed of SEEDS) {
        const v = look(seed, kind, 'ctcourse');
        const p = pieces(v, false, false, false, kind);
        for (const g of GEAR_PIECES) expect(hasPiece(p, g), `${kind} ${g}`).toBe(false);
      }
    }
  });

  it('helmet shows helmet_std, replaces headwear, hides hair cap (A5, A6)', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      for (const seed of SEEDS) {
        const v = look(seed, kind, 'ctcourse');
        const p = pieces(v, true, false, false, kind);
        expect(hasPiece(p, 'helmet_std')).toBe(true);
        expect(hasPiece(p, 'helmet_heavy')).toBe(false);
        expect(hasPiece(p, 'vest_soft')).toBe(false);
        for (const hw of HEADWEARS) expect(hasPiece(p, hw), `${kind} ${hw}`).toBe(false);
        for (const hc of HAIR_CAPS) expect(hasPiece(p, hc), `${kind} ${hc}`).toBe(false);
      }
    }
  });

  it('helmet knocked off restores headwear and hair (A6)', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      for (const seed of SEEDS) {
        const v = look(seed, kind, 'ctcourse');
        const on = pieceList(pieces(v, true, false, false, kind));
        const off = pieces(v, false, false, false, kind);
        const base = pieces(v, false, false, false, kind);
        expect(pieceList(off)).toEqual(pieceList(base));
        expect(on).toContain('helmet_std');
        expect(hasPiece(off, 'helmet_std')).toBe(false);
        if (v.headwear !== null) expect(hasPiece(off, v.headwear)).toBe(true);
        if (v.headwear2 !== null) expect(hasPiece(off, v.headwear2)).toBe(true);
        const hairShows = v.hairCap !== 'bald' && v.headwear !== 'beanie';
        expect(hasPiece(off, v.hairCap)).toBe(hairShows);
      }
    }
  });

  it('reusing one out buffer: helmet true then false gives the same set as a fresh buffer', () => {
    const out = createPieces();
    for (const seed of SEEDS) {
      const v = look(seed, 'grunt', 'ctcourse');
      applyGear(v, true, true, false, 'grunt', out);
      applyGear(v, false, false, false, 'grunt', out);
      expect(pieceList(out)).toEqual(pieceList(pieces(v, false, false, false, 'grunt')));
    }
  });

  it('armour shows vest_soft; plated shows plate_heavy (instead of the vest)', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      const v = look(9, kind, 'ctcourse');
      const a = pieces(v, false, true, false, kind);
      expect(hasPiece(a, 'vest_soft')).toBe(true);
      expect(hasPiece(a, 'plate_heavy')).toBe(false);
      const pl = pieces(v, false, true, true, kind);
      expect(hasPiece(pl, 'plate_heavy')).toBe(true);
      expect(hasPiece(pl, 'vest_soft')).toBe(false);
    }
  });

  it('A14: an armoured or helmeted grunt keeps his face (no balaclava)', () => {
    for (const kind of ['grunt', 'runner', 'sniper', 'droneOp', 'officer']) {
      for (const seed of SEEDS) {
        const v = look(seed, kind, 'campusOps');
        const p = pieces(v, true, true, false, kind);
        expect(hasPiece(p, 'balaclava')).toBe(false);
        expect(hasPiece(p, v.head)).toBe(true);
      }
    }
  });

  it('heavy always plate_heavy + helmet_heavy + balaclava, whatever the flags', () => {
    for (const seed of SEEDS) {
      const v = look(seed, 'heavy', 'ctcourse');
      for (let bits = 0; bits < 8; bits++) {
        const p = pieces(v, (bits & 1) !== 0, (bits & 2) !== 0, (bits & 4) !== 0, 'heavy');
        expect(hasPiece(p, 'plate_heavy')).toBe(true);
        expect(hasPiece(p, 'helmet_heavy')).toBe(true);
        expect(hasPiece(p, 'balaclava')).toBe(true);
        expect(hasPiece(p, 'helmet_std')).toBe(false);
        expect(hasPiece(p, 'shield_riot')).toBe(false);
        for (const hc of HAIR_CAPS) expect(hasPiece(p, hc)).toBe(false);
      }
    }
  });

  it('enforcer always helmet_heavy + vest_soft + shield_riot + balaclava (plated adds no carrier)', () => {
    for (const seed of SEEDS) {
      const v = look(seed, 'enforcer', 'ctcourse');
      for (let bits = 0; bits < 8; bits++) {
        const p = pieces(v, (bits & 1) !== 0, (bits & 2) !== 0, (bits & 4) !== 0, 'enforcer');
        expect(hasPiece(p, 'helmet_heavy')).toBe(true);
        expect(hasPiece(p, 'vest_soft')).toBe(true);
        expect(hasPiece(p, 'shield_riot')).toBe(true);
        expect(hasPiece(p, 'balaclava')).toBe(true);
        expect(hasPiece(p, 'plate_heavy')).toBe(false);
        expect(hasPiece(p, 'helmet_std')).toBe(false);
      }
    }
  });

  it('the shield belongs to the enforcer only', () => {
    for (const kind of KINDS) {
      if (kind === 'enforcer') continue;
      const p = pieces(look(3, kind, 'ctcourse'), true, true, true, kind);
      expect(hasPiece(p, 'shield_riot'), kind).toBe(false);
    }
  });

  it('sniper keeps dark glasses under armour and helmet', () => {
    const v = look(11, 'sniper', 'ctcourse');
    expect(hasPiece(pieces(v, true, true, false, 'sniper'), 'glasses_dark')).toBe(true);
  });
});
