import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIMB_PIECES, FINISHES, finishOf, pieceOf } from '../../src/editor/climbCatalogue';
import { CFACTS, CLIMB_FACTS, climbRules, drawPiece, extId, pieceRows, pieceWords, placePiece, setClimbable, stepPiece, withRules } from '../../src/editor/climb';
import type { PlaceCtx } from '../../src/editor/climb';
import { finishLegend, loudness, loudWord, loudWords, stepFinish } from '../../src/editor/finishes';
import { cardRows, stepCard } from '../../src/editor/card';
import { campusText, EditorModel } from '../../src/editor/model';
import type { Campus, Ext, Room, Wall } from '../../src/editor/types';
import { FENCE, MOVEMENT } from '../../src/config/movement';
import { noiseRadius } from '../../src/player/movement';
import { MOVE_MODES } from '../../src/player/moveState';
import { SURFACE_NOISE } from '../../src/world/surfaces';
import { campusToBuild } from '../../src/world/maps/kestrelCampus';
import { exteriorPieces } from '../../src/world/maps/kestrelExterior';

const facts = JSON.parse(readFileSync('scripts/kestrel/facts.json', 'utf8')) as Record<string, Record<string, { value: number }>>;
const F = (g: string, n: string): number => facts[g]![n]!.value;
const STAND = F('player', 'standHeight');
const GRAB_MIN = F('reach', 'grabMin');
const GRAB = F('reach', 'grabMax');
const JUMP = F('reach', 'jumpGrab');
const LIP = F('lip', 'autoHeight');
const LIP_LEN = F('lip', 'minLength');
const CLIMB_DEPTH = F('lip', 'climbDepth');
const RISE = F('climb', 'pipeLipRise');
const d = 0.01;

/** A two-storey wall line at x = 4 (ground 4.2 m, first 4.2 m, a 1.1 m parapet on the roof level), as Building A's west side. */
function campus(): Campus {
  const wall = (id: string, level: string, h: number): Wall => ({ id, level, a: [4, 30], b: [4, 60], t: 0.45, h, kind: 'exterior' });
  return {
    meta: { id: 'test', grid: 0.5, objectGrid: 0.1 },
    levels: [
      { id: 'G', name: 'Ground', floor: 0, height: 4.2 },
      { id: 'F', name: 'First', floor: 4.2, height: 4.2 },
      { id: 'R', name: 'Roof', floor: 8.4, height: 1.1 },
    ],
    rooms: [{ id: 'G-COR', level: 'G', name: 'Corridor', kind: 'corridor', rect: [4, 40, 40, 43.5], ring: 2 } as Room],
    walls: [wall('WG', 'G', 4.2), wall('WF', 'F', 4.2), { ...wall('WR', 'R', 1.1), kind: 'parapet' }],
    openings: [{ id: 'WIN1', wall: 'WG', at: 10, w: 1.2, h: 1.5, sill: 2.4, type: 'window' }],
    stairs: [],
    ladders: [],
    voids: [],
    exterior: [],
  };
}
const ctx = (c: Campus, level = 'G'): PlaceCtx => ({ data: c, level, grid: 0.1 });
const piece = (extra: Partial<Ext>): Ext => ({ id: 'E1', kind: 'downpipe', a: [3.7, 35], b: [3.7, 35], y0: 0, y1: 9.5, climbable: false, reason: '', level: 'G', facing: 'E', ...extra });

describe('ON5 catalogue', () => {
  it('every climb move is an engine move (AnchorKind and MOVE_MODES); a stair and a lamp post have none', () => {
    for (const p of CLIMB_PIECES) if (p.move) expect(MOVE_MODES as readonly string[]).toContain(p.move);
    expect(pieceOf('lamp-post')!.move).toBeNull();
    expect(pieceOf('fire-escape')!.move).toBeNull();
    expect(pieceOf('stringcourse')!.id).toBe('ledge');
    expect(CLIMB_PIECES.map((p) => p.id)).toEqual(['downpipe', 'pipe', 'ledge', 'sill', 'parapet', 'vent', 'duct', 'fire-escape', 'lamp-post', 'fence']);
  });

  it('every fact the rules read is in facts.json, and the fence rattle matches the game', () => {
    for (const k of CLIMB_FACTS) expect(CFACTS[k], k).toBeTypeOf('number');
    expect(F('climb', 'fenceRattle')).toBe(FENCE.rattle);
  });
});

describe('ON5 placing', () => {
  it('a downpipe backs onto the west wall face, faces it, and runs from the ground to the parapet top', () => {
    const c = campus();
    const r = placePiece('downpipe', 3.2, 35.04, 'E001', ctx(c));
    expect(r.why).toBeNull();
    const e = r.e!;
    expect(e.a).toEqual([4 - 0.225 - F('climb', 'pipeRadius'), 35]);
    expect(e.facing).toBe('E');
    expect(e.y0).toBe(0);
    expect(e.y1).toBe(9.5);
    expect(e.climbable).toBe(true);
    expect(pieceWords(c, e)).toBe('Downpipe 9.5 m: climbable, top lip 9.5 m within reach (the top of wall WR): climbs off onto it');
  });

  it('off a wall a wall piece is refused; a sill sits on the window at its sill height', () => {
    const c = campus();
    expect(placePiece('downpipe', 20, 35, 'E001', ctx(c)).why).toBe('Move onto a wall face');
    const s = placePiece('sill', 3.5, 40.1, 'E001', ctx(c)).e!;
    expect(s.kind).toBe('sill');
    expect(s.y1).toBe(2.4);
    expect(Math.abs(s.b[1] - s.a[1])).toBeCloseTo(1.2, 6);
    expect(s.a[0]).toBeLessThan(4 - 0.225);
    expect(placePiece('sill', 3.5, 45, 'E001', ctx(c)).why).toBe('Move onto a window');
  });

  it('a coping runs along the wall top; a lamp post stands at the dot; a drawn ledge moves onto the face', () => {
    const c = campus();
    const cp = placePiece('parapet', 3.5, 40, 'E001', ctx(c, 'R')).e!;
    expect(cp.y0).toBe(9.5);
    expect(cp.depth).toBeCloseTo(0.45 + 2 * F('climb', 'copingOverhang'), 6);
    expect(cp.climbable).toBe(true);
    const lp = placePiece('lamp-post', 20.04, 10, 'E002', ctx(c)).e!;
    expect(lp.y1).toBe(F('climb', 'lampPost'));
    expect(lp.climbable).toBe(false);
    const l = drawPiece('ledge', 'E003', [3.6, 32], [3.6, 38], ctx(c));
    expect(l.a[0]).toBeCloseTo(3.775 - F('climb', 'ledgeDepth') / 2, 6);
    expect(l.wall).toBe('WG');
    expect(l.y1).toBe(4.2);
    expect(extId({ exterior: [l] })).toBe('E001');
    expect(extId({ exterior: [{ ...l, id: 'E001' }] })).toBe('E002');
  });
});

describe('ON5 reach rules at the boundaries', () => {
  const c = campus();
  it('downpipe: at least the player tall, its foot within grab reach; the lip within the rise of its top', () => {
    expect(climbRules(c, piece({ y1: STAND })).climbable).toBe(true);
    expect(climbRules(c, piece({ y1: STAND - d })).climbable).toBe(false);
    expect(climbRules(c, piece({ y0: GRAB, y1: GRAB + 3 })).climbable).toBe(true);
    expect(climbRules(c, piece({ y0: GRAB + d, y1: GRAB + 3 })).climbable).toBe(false);
    expect(climbRules(c, piece({ y1: 9.5 + RISE })).words).toMatch(/top lip 9\.5 m/);
    expect(climbRules(c, piece({ y1: 9.5 + RISE + d })).words).toMatch(/no lip within/);
    // the ground wall's top (4.2) has the first-floor wall standing on it: no lip there
    expect(climbRules(c, piece({ y1: 4.2 })).words).toMatch(/no lip within/);
  });

  it('horizontal pipe: hangable from the grab height; over the jump reach it is reached from elsewhere; too short', () => {
    const p = (y: number, len = 3): Ext => piece({ kind: 'pipe', a: [10, 10], b: [10 + len, 10], y0: y, y1: y });
    expect(climbRules(c, p(GRAB_MIN)).climbable).toBe(true);
    expect(climbRules(c, p(GRAB_MIN - d)).climbable).toBe(false);
    expect(climbRules(c, p(JUMP)).words).toMatch(/a jump from the floor reaches it/);
    expect(climbRules(c, p(JUMP + d)).words).toMatch(/over the 3\.1 m jump reach/);
    expect(climbRules(c, p(GRAB, LIP_LEN - d)).climbable).toBe(false);
  });

  it('ledge: a lip from the auto height; climbing onto it needs the climb depth', () => {
    const l = (top: number, depth = 0.2): Ext => piece({ kind: 'ledge', a: [3.7, 32], b: [3.7, 36], y0: top - 0.15, y1: top, depth });
    expect(climbRules(c, l(LIP)).climbable).toBe(true);
    expect(climbRules(c, l(LIP - d)).climbable).toBe(false);
    expect(climbRules(c, l(4, 0.2)).words).toMatch(/too shallow to climb onto \(0\.2 m, needs 0\.38 m\)/);
    expect(climbRules(c, l(4, CLIMB_DEPTH)).words).toMatch(/climb up onto it/);
  });

  it('duct: crouch-move at the crawl rule size, a crawl under it, refused narrower than the player; a vent leads into it', () => {
    const duct = (w: number, h: number): Ext => piece({ id: 'E2', kind: 'duct', a: [10, 10], b: [20, 10], y0: 0, y1: h, size: [w, h] });
    expect(climbRules(c, duct(F('duct', 'crouchWidth'), F('duct', 'crouchHeight'))).words).toMatch(/crouch-move through it/);
    expect(climbRules(c, duct(0.9, F('duct', 'crouchHeight') - d)).words).toMatch(/crawl through it/);
    expect(climbRules(c, duct(F('player', 'radius') * 2 - d, 1)).climbable).toBe(false);
    const vent = piece({ id: 'E3', kind: 'vent', a: [10, 10.5], b: [10, 10.5], size: [0.6, 0.6] });
    expect(climbRules(c, vent).climbable).toBe(false);
    const c2 = { ...c, exterior: [duct(1.2, 1.5), vent] };
    expect(climbRules(c2, vent).words).toBe('Vent grille 0.6 x 0.6 m: the way into duct E2');
    expect(climbRules(c2, duct(1.2, 1.5)).words).toMatch(/a vent at one end only \(E3\)/);
  });

  it('fence climbs; a lamp post is "not in the game yet"; a fire escape is walked and counts its risers', () => {
    expect(climbRules(c, piece({ kind: 'fence', a: [0, 0], b: [5, 0], y1: 2.4 })).climbable).toBe(true);
    expect(climbRules(c, piece({ kind: 'lamp-post', y1: 6 })).words).toMatch(/not in the game yet/);
    const fe = climbRules(c, piece({ kind: 'fire-escape', a: [0, 0], b: [0, 6], y0: 0, y1: 4.2, size: [1.3, 25] }));
    expect(fe.climbable).toBe(false);
    expect(fe.words).toMatch(/25 risers over 6 m/);
    expect(fe.words).toMatch(/over 18 risers in one flight/);
  });
});

describe('ON5 climbable from the rules, and by hand', () => {
  it('the rules set the flag; a hand override keeps it with its reason; flipping back clears the override', () => {
    const c = campus();
    const e = withRules(c, piece({}));
    expect(e.climbable).toBe(true);
    const off = setClimbable(c, e, false, 'Painted with anti-climb paint');
    expect(off.override).toBe(true);
    expect(off.climbable).toBe(false);
    expect(withRules(c, off)).toBe(off);
    expect(pieceWords(c, off)).toMatch(/Set by hand to not climbable: Painted with anti-climb paint$/);
    const back = setClimbable(c, off, true, '');
    expect(back.override).toBeUndefined();
    expect(back.climbable).toBe(true);
    // the card's Climbable row is the same flip
    expect(stepPiece(c, e, 'climbable', 1, 0.1)!.override).toBe(true);
  });

  it('card rows: Type first, the kind\'s lengths, Climbable; steps re-run the rules', () => {
    const c = campus();
    const pipe = drawPiece('pipe', 'E1', [10, 10], [13, 10], ctx(c));
    expect(pieceRows(pipe).map((r) => r.id)).toEqual(['type', 'y0', 'len', 'climbable']);
    expect(cardRows('exterior', pipe).map((r) => r.id)).toEqual(['type', 'name', 'y0', 'len', 'climbable', 'id']);
    let p = pipe;
    for (let i = 0; i < 12; i++) p = stepPiece(c, p, 'y0', -1, 0.1)!;
    expect(p.y0).toBeCloseTo(GRAB - 1.2, 6);
    expect(p.climbable).toBe(false);
    const fence = stepCard('exterior', pipe, 'type', 1, { step: 0.1, data: c }) as Ext;
    expect(fence.kind).toBe('ledge');
    expect(stepCard('exterior', withRules(c, piece({})), 'type', 1, { step: 0.1, data: c })!).toMatchObject({ kind: 'vent' });
  });
});

describe('ON5 floor finishes and footstep loudness', () => {
  it('each finish sounds as a game surface; the distances are the game\'s own footstep radius times its multiplier', () => {
    for (const f of FINISHES) expect(SURFACE_NOISE[f.surface]).toBeTypeOf('number');
    const g = loudness('grating')!;
    expect(g.mult).toBe(SURFACE_NOISE.grate);
    expect(g.word).toBe('loud');
    expect(g.jog).toBeCloseTo(Math.round(noiseRadius(MOVEMENT.jogSpeed, false, false) * SURFACE_NOISE.grate * 10) / 10, 6);
    expect(g.sprint).toBeCloseTo(Math.round(noiseRadius(MOVEMENT.sprintSpeed, false, true) * SURFACE_NOISE.grate * 10) / 10, 6);
    expect(loudWords('grating')).toBe(`Steel grating: loud, heard at ${g.jog} m jogging, ${g.sprint} m sprinting (walking is silent)`);
    expect(loudness('carpet')!.word).toBe('quiet');
    expect(loudness('concrete')!.word).toBe('normal');
    expect(loudWords('')).toMatch(/No floor finish/);
    expect(finishOf('linoleum')!.id).toBe('vinyl');
    expect(loudWord(0.79)).toBe('quiet');
    expect(loudWord(1.35)).toBe('loud');
    expect(finishLegend().length).toBe(FINISHES.length);
  });

  it('the card steps a room\'s finish through none and the list, wrapping', () => {
    expect(stepFinish('', 1)).toBe('carpet');
    expect(stepFinish('', -1)).toBe('asphalt');
    expect(stepFinish('asphalt', 1)).toBe('');
    const room: Room = { id: 'R1', level: 'G', kind: 'corridor', rect: [0, 0, 4, 4], ring: 1 };
    const rows = cardRows('rooms', room).map((r) => r.id);
    expect(rows).toContain('finish');
    const g = stepCard('rooms', { ...room, finish: 'concrete' }, 'finish', 1, { step: 0.1 }) as Room;
    expect(g.finish).toBe('grating');
  });

  it('the walk test marks finished floors with their game surface', () => {
    const c = campus();
    c.rooms[0]!.finish = 'grating';
    const b = campusToBuild(c as never);
    expect(b.surfaces).toEqual([{ kind: 'grate', rect: [4, 40, 40, 43.5], top: 0 }]);
  });
});

describe('ON5 walk test pieces and the file', () => {
  it('climbable pieces build with the engine builders; others as plain collision', () => {
    const c = campus();
    const dp = placePiece('downpipe', 3.2, 35, 'E001', ctx(c)).e!;
    const fence = drawPiece('fence', 'E002', [10, 10], [20, 10], ctx(c));
    const lamp = placePiece('lamp-post', 30, 10, 'E003', ctx(c)).e!;
    const ops = exteriorPieces([dp, fence, lamp, { ...dp, id: 'E004', climbable: false }]);
    expect(ops.map((o) => o.t)).toEqual(['pipeV', 'fence', 'pillar', 'box']);
    const pv = ops[0] as Extract<(typeof ops)[number], { t: 'pipeV' }>;
    expect(pv.side).toBeCloseTo(Math.PI / 2, 6);
    expect(pv.y1).toBe(9.5);
    const build = campusToBuild({ ...c, exterior: [dp] } as never);
    expect(build.exterior.map((o) => o.t)).toEqual(['pipeV']);
  });

  it('a piece added and undone leaves the file byte-identical; added, it round-trips', () => {
    const m = new EditorModel(campus());
    const text0 = campusText(m.data);
    const dp = placePiece('downpipe', 3.2, 35, 'E001', ctx(m.data)).e!;
    m.commit('Added', [{ coll: 'exterior', id: dp.id, before: null, after: dp }]);
    const text1 = campusText(m.data);
    expect(JSON.parse(text1).exterior[0]).toEqual(dp);
    expect(campusText(JSON.parse(text1) as Campus)).toBe(text1);
    m.undo();
    expect(campusText(m.data)).toBe(text0);
  });
});
