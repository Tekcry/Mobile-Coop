import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SQUAD_BASE,
  SECTION_SQUAD_BASE,
  defaultSquads,
  sectionAt,
  squadId,
  validateGuardAi,
  validatePosts,
  type GuardAiLayout,
  type GuardSlot,
  type NoisySource,
} from '../src/ai/guardAiData';
import type { GearTag } from '../src/ai/gear';
import { POST } from '../src/ai/posts';

// (guard-ai S5 / S5b) map data shapes and the validators the map teams run (design section 11).

const slot = (x: number, z: number, extra: Partial<GuardSlot> = {}): GuardSlot => ({ x, z, ...extra });
const bounds = { minX: 0, maxX: 100, minZ: 0, maxZ: 100 };
const has = (errs: string[], re: RegExp): boolean => errs.some((e) => re.test(e));

describe('squad ids', () => {
  it('section x 100 + squad', () => {
    expect(SECTION_SQUAD_BASE).toBe(100);
    expect(squadId(0, 3)).toBe(3);
    expect(squadId(4, 2)).toBe(402);
    expect(squadId(2, DEFAULT_SQUAD_BASE + 1)).toBe(251);
  });
});

describe('defaultSquads', () => {
  it('chains posts within 12 m into clusters numbered by their first slot', () => {
    const slots = [slot(0, 0), slot(50, 50), slot(10, 0), slot(21, 0), slot(60, 50), slot(90, 90)];
    const out = new Int32Array(slots.length);
    const n = defaultSquads(slots, out);
    expect(n).toBe(3);
    // 0 -10 m- 2 -11 m- 3 chain (0 and 3 are 21 m apart), 1 and 4 together, 5 alone
    expect(Array.from(out)).toEqual([0, 1, 0, 0, 1, 2]);
  });
  it('hand-set squads are left out (-1); other storeys never cluster; a custom radius', () => {
    const slots = [slot(0, 0, { y: 0 }), slot(5, 0, { squad: 1 }), slot(3, 0, { y: 4 }), slot(6, 0, { y: 0 }), slot(8, 0, { y: 0 })];
    const out: number[] = [];
    const n = defaultSquads(slots, out);
    expect(out).toEqual([0, -1, 1, 0, 0]);
    expect(n).toBe(2);
    const out2 = new Int32Array(5);
    expect(defaultSquads([slot(0, 0), slot(4, 0), slot(8, 0)], out2, 3)).toBe(3);
  });
  it('no slots: no clusters', () => {
    expect(defaultSquads([], [])).toBe(0);
  });
});

describe('validateGuardAi', () => {
  const good: GuardAiLayout = {
    zones: [
      { id: 'a', section: 0, rects: [{ id: 'a1', name: 'A', minX: 0, maxX: 50, minZ: 0, maxZ: 100 }] },
      { id: 'b', section: 1, rects: [{ id: 'b1', name: 'B', minX: 50, maxX: 100, minZ: 0, maxZ: 100 }] },
    ],
    noisy: [{ id: 'gen', x: 10, z: 10, radius: 8, db: 12 }],
    entries: [{ section: 1, at: [90, 90], route: [[80, 80]] }],
    squads: [{ id: 'dock', section: 0 }, { id: 'dock', section: 1 }],
  };
  const goodSlots = [
    slot(10, 10, { post: { leash: 0 } }),
    slot(20, 10, { post: { leash: 3, highSecurity: true, guards: 'token' }, route: [[21, 10]] }),
    slot(60, 10, { profile: 'aggressive', squad: 2 }),
    slot(70, 10, { key: 5 }),
  ];

  it('a good layout passes (and the empty layout with no slots)', () => {
    expect(validateGuardAi(good, goodSlots, { bounds })).toEqual([]);
    expect(validateGuardAi({}, [])).toEqual([]);
  });

  it('leash must be 0 or >= 0.5, and a number >= 0', () => {
    expect(has(validatePosts([slot(0, 0, { post: { leash: 0.3 } })]), /leash 0.3 must be 0 or >= 0.5/)).toBe(true);
    expect(validatePosts([slot(0, 0, { post: { leash: POST.minLeash } })])).toEqual([]);
    expect(validatePosts([slot(0, 0, { post: { leash: 0 } })])).toEqual([]);
    expect(has(validatePosts([slot(0, 0, { post: { leash: -1 } })]), /must be a number >= 0/)).toBe(true);
    expect(has(validatePosts([slot(0, 0, { post: { leash: Number.NaN } })]), /must be a number >= 0/)).toBe(true);
  });

  it('a high-security post must be stood: not free, no route leaving the leash', () => {
    expect(has(validatePosts([slot(0, 0, { post: { leash: 3, highSecurity: true }, free: true })]), /cannot be free/)).toBe(true);
    expect(has(validatePosts([slot(0, 0, { post: { leash: 3, highSecurity: true }, route: [[1, 0], [9, 0]] })]), /route point 1 is outside the leash .* high-security/)).toBe(true);
    // a normal post whose route leaves its leash is caught too
    expect(has(validatePosts([slot(0, 0, { post: { leash: 2 }, route: [[5, 0]] })]), /route point 0 is outside the leash/)).toBe(true);
  });

  it('unknown profile', () => {
    expect(has(validatePosts([slot(0, 0, { profile: 'berserk' as never })]), /unknown profile/)).toBe(true);
  });

  it('noisy: db 0..30, radius 1..20, unique ids, inside bounds, known section', () => {
    const n = (o: Partial<NoisySource>): GuardAiLayout => ({ noisy: [{ id: 'n', x: 5, z: 5, radius: 5, db: 6, ...o }] });
    expect(has(validateGuardAi(n({ db: 31 }), []), /db 31 outside 0..30/)).toBe(true);
    expect(has(validateGuardAi(n({ db: -1 }), []), /db -1 outside/)).toBe(true);
    expect(has(validateGuardAi(n({ radius: 0.5 }), []), /radius 0.5 outside 1..20/)).toBe(true);
    expect(has(validateGuardAi(n({ radius: 25 }), []), /radius 25 outside/)).toBe(true);
    expect(has(validateGuardAi(n({ x: 500 }), [], { bounds }), /noisy n: outside the map bounds/)).toBe(true);
    expect(has(validateGuardAi(n({ section: 3 }), []), /noisy n: section 3 does not exist/)).toBe(true);
    expect(validateGuardAi(n({ db: 0, radius: 1 }), [])).toEqual([]);
    expect(validateGuardAi(n({ db: 30, radius: 20 }), [])).toEqual([]);
    expect(has(validateGuardAi(n({ radius: Number.NaN }), []), /radius NaN outside/)).toBe(true);
    const dup: GuardAiLayout = { noisy: [{ id: 'g', x: 1, z: 1, radius: 2, db: 3 }, { id: 'g', x: 2, z: 2, radius: 2, db: 3 }] };
    expect(has(validateGuardAi(dup, []), /noisy g: duplicate id/)).toBe(true);
  });

  it('entries: inside the bounds (with their routes) when bounds are given, known section', () => {
    expect(has(validateGuardAi({ entries: [{ section: 0, at: [-5, 10] }] }, [], { bounds }), /entry 0: outside the map bounds/)).toBe(true);
    expect(validateGuardAi({ entries: [{ section: 0, at: [-5, 10] }] }, [])).toEqual([]); // no bounds, no check
    expect(has(validateGuardAi({ entries: [{ section: 0, at: [5, 10], route: [[5, 200]] }] }, [], { bounds }), /route point 0 outside/)).toBe(true);
    expect(has(validateGuardAi({ entries: [{ section: 2, at: [5, 10] }] }, []), /entry 0: section 2 does not exist/)).toBe(true);
    expect(validateGuardAi({ entries: [{ section: 2, at: [5, 10] }] }, [], { sections: 3 })).toEqual([]);
  });

  it('squads: known section, unique id per section', () => {
    expect(has(validateGuardAi({ squads: [{ id: 'x', section: 1 }] }, []), /squad x: section 1 does not exist/)).toBe(true);
    expect(has(validateGuardAi({ squads: [{ id: 'x', section: 0 }, { id: 'x', section: 0 }] }, []), /duplicate id in section 0/)).toBe(true);
  });

  it('zones: unique ids, sections >= 0, rects present with min < max', () => {
    const r = { id: 'r', name: 'R', minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
    expect(has(validateGuardAi({ zones: [{ id: 'z', section: 0, rects: [r] }, { id: 'z', section: 1, rects: [r] }] }, []), /zone z: duplicate id/)).toBe(true);
    expect(has(validateGuardAi({ zones: [{ id: 'z', section: -1, rects: [r] }] }, []), /integer >= 0/)).toBe(true);
    expect(has(validateGuardAi({ zones: [{ id: 'z', section: 0, rects: [] }] }, []), /no rects/)).toBe(true);
    expect(has(validateGuardAi({ zones: [{ id: 'z', section: 0, rects: [{ ...r, maxX: -1 }] }] }, []), /min >= max/)).toBe(true);
    expect(has(validateGuardAi({ zones: [{ id: 'z', section: 4, rects: [r] }] }, [], { sections: 2 }), /zone z: section 4 does not exist/)).toBe(true);
  });

  it('keys: unique and < 32 per section (index by default, slot.key overrides)', () => {
    const many = Array.from({ length: 33 }, (_, i) => slot(i, 0));
    expect(has(validateGuardAi({}, many), /slot 32: key 32 must be an integer 0..31/)).toBe(true);
    expect(validateGuardAi({}, many.slice(0, 32))).toEqual([]);
    expect(has(validateGuardAi({}, [slot(0, 0), slot(1, 0, { key: 0 })]), /slot 1: key 0 is not unique in section 0/)).toBe(true);
    // per section: the same index in two zones' sections is fine
    expect(validateGuardAi(good, [slot(10, 10), slot(60, 10)])).toEqual([]);
    expect(has(validateGuardAi(good, [slot(10, 10), slot(60, 10, { key: 0 }), slot(70, 10, { key: 0 })]), /key 0 is not unique in section 1/)).toBe(true);
    expect(has(validateGuardAi({}, [slot(0, 0, { key: 1.5 })]), /key 1.5 must be an integer/)).toBe(true);
  });

  it('hand-set squads stay below the default-cluster base', () => {
    expect(has(validateGuardAi({}, [slot(0, 0, { squad: DEFAULT_SQUAD_BASE })]), /squad 50 must be an integer 0..49/)).toBe(true);
    expect(validateGuardAi({}, [slot(0, 0, { squad: 0 })])).toEqual([]);
  });

  it('Sector Ops: one section for every slot (opts.section)', () => {
    const errs = validateGuardAi({ entries: [{ section: 3, at: [1, 1] }] }, [slot(0, 0), slot(1, 0)], { sections: 5, section: 3 });
    expect(errs).toEqual([]);
  });

  it('sectionAt: the first zone containing the point, else 0', () => {
    expect(sectionAt(good, 10, 10)).toBe(0);
    expect(sectionAt(good, 75, 10)).toBe(1);
    expect(sectionAt(good, 500, 10)).toBe(0);
    expect(sectionAt(undefined, 75, 10)).toBe(0);
  });
});

describe('validateGuardAi: gear tags and shield guards (S11)', () => {
  const g = (extra: Partial<GuardSlot>): GuardSlot => slot(5, 5, extra);

  it('helmet, armour and both pass; no tag passes', () => {
    for (const tag of ['helmet', 'armour', 'both'] as const) expect(validateGuardAi({}, [g({ gear: tag })])).toEqual([]);
    expect(validateGuardAi({}, [g({})])).toEqual([]);
  });
  it('an unknown gear tag is rejected and the message names the slot', () => {
    const errs = validateGuardAi({}, [g({}), g({ gear: 'visor' as unknown as GearTag })]);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^slot 1: gear 'visor' must be one of helmet, armour, both$/);
  });
  it('an enforcer in a section guard list is rejected (shield guards only come in response teams)', () => {
    const errs = validateGuardAi({}, [g({ kind: 'grunt' }), g({ kind: 'enforcer' })], { section: 2 });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^slot 1: kind 'enforcer' is not allowed .*response teams/);
    expect(validateGuardAi({}, [g({ kind: 'heavy' }), g({ kind: 'officer' }), g({ kind: 'dog' })])).toEqual([]);
  });
  it('both rules report together', () => {
    const errs = validateGuardAi({}, [g({ kind: 'enforcer', gear: 'x' as unknown as GearTag })]);
    expect(errs).toHaveLength(2);
  });
});
