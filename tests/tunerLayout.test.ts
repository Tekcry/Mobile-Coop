import { describe, expect, it } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import '../src/player/speedTune';
import '../src/player/weightTune';
import '../src/anim/tuneKeys';
import '../src/anim/moveTune';
import { TUNE_SECTIONS, isTuneGroup } from '../src/anim/tuneRegistry';
import {
  bodyCarry,
  buildTabs,
  cycleTab,
  DropNav,
  listScrollFor,
  groupForPath,
  groupPath,
  levelCount,
  levelOptions,
  loopGroups,
  plainGroupWord,
  plainLabel,
  plainLoop,
  plainUnit,
  sharedPrefix,
  tabOfSection,
  TUNER_TABS,
  tunerScale,
  valueText,
} from '../src/ui/tunerLayout';
import { FREE_CFG, FreeViewCore, freeSnap } from '../src/player/freeView';
import { STUDIO, STUDIO_ENTRIES, studioEntry, studioInput, studioReset, studioSpot, spotShift, type StudioInputOut } from '../src/anim/studio';
import { mocapSource } from '../src/anim/mocapSources';
import { TunePadCtl } from '../src/ui/animTunePad';
import { PAD } from '../src/input/gamepadMapping';

const ids = (): string[] => TUNE_SECTIONS.map((s) => s.id);
const label = (id: string): string => TUNE_SECTIONS.find((s) => s.id === id)?.label ?? id;

describe('tuner-ui: tabs', () => {
  it('the fixed order, with every registered section in a tab', () => {
    const tabs = buildTabs(ids(), label);
    expect(tabs.map((t) => t.id)).toEqual(['view', 'body', 'hands', 'weapon', 'stepping', 'weight', 'camera', 'keys', 'coop', 'sec:gear']); // (anim-gear) Gear: its own tab after Co-op; (item 29) no Settings tab
    const placed = tabs.flatMap((t) => t.sections);
    expect([...placed].sort()).toEqual([...ids()].sort());
    expect(tabs.find((t) => t.id === 'body')!.sections).toEqual(expect.arrayContaining(['body', 'joint', 'ik', 'trav']));
    expect(tabs.find((t) => t.id === 'weapon')!.sections).toEqual(expect.arrayContaining(['gun', 'weapon']));
    expect(tabs.find((t) => t.id === 'coop')!.sections.every((s) => s.startsWith('team_'))).toBe(true);
    expect(tabs.find((t) => t.id === 'coop')!.sections.length).toBe(6);
    expect(TUNER_TABS[0]!.id).toBe('view');
  });

  it('an unmapped section gets its own tab after Co-op (item 29: no Settings tab)', () => {
    const tabs = buildTabs([...ids(), 'face'], (id) => (id === 'face' ? 'Face (expressions)' : label(id)));
    const at = tabs.findIndex((t) => t.id === 'sec:face');
    expect(at).toBe(tabs.findIndex((t) => t.id === 'sec:gear') + 1); // (anim-gear) after Co-op and the Gear tab
    expect(tabs.some((t) => t.id === 'settings')).toBe(false);
    expect(tabs[at]!.label).toBe('Face');
    expect(tabOfSection('team_boost')).toBe('coop');
    expect(tabOfSection('face')).toBe('sec:face');
  });

  it('a tab with no section is left out (View always stays)', () => {
    expect(buildTabs(['body'], label).map((t) => t.id)).toEqual(['view', 'body']);
  });

  it('LB / RB cycle and wrap', () => {
    expect(cycleTab(0, -1, 10)).toBe(9);
    expect(cycleTab(9, 1, 10)).toBe(0);
    expect(cycleTab(3, 1, 10)).toBe(4);
  });
});

describe('tuner-ui: group levels', () => {
  const sec = (id: string) => TUNE_SECTIONS.find((s) => s.id === id)!;

  it('the shared prefix and the level count per section', () => {
    expect(sharedPrefix(sec('body').groups)).toBe(0);
    expect(levelCount(sec('body').groups, 0)).toBe(1);
    expect(sharedPrefix(sec('hand').groups)).toBe(1);
    // (anim-joints J2) the team rows (`hand.rifle.team.boost.b`) go two levels deeper than the states
    expect(levelCount(sec('hand').groups, 1)).toBe(4);
    expect(levelCount(sec('joint').groups, sharedPrefix(sec('joint').groups))).toBe(3);
    expect(sharedPrefix(sec('team_boost').groups)).toBe(2);
    expect(sharedPrefix(sec('keys').groups)).toBe(1);
    expect(levelCount(sec('keys').groups, 1)).toBe(2);
    expect(sharedPrefix(sec('gun').groups)).toBe(0);
  });

  it('options per level follow the level above; a new branch keeps the state when it has it', () => {
    const g = sec('hand').groups;
    const w = levelOptions(g, 1, [], 0);
    expect(w).toContain('rifle');
    expect(w).toContain('none');
    const st = levelOptions(g, 1, ['rifle'], 1);
    expect(st).toContain('walk');
    expect(groupForPath(g, 1, ['pistol', 'walk'])).toBe('hand.pistol.walk');
    expect(groupPath('hand.pistol.walk', 1)).toEqual(['pistol', 'walk']);
    // keys: a clip with fewer keys takes its first when the key is not there
    const k = sec('keys').groups;
    const g2 = groupForPath(k, 1, ['jog', '11']);
    expect(g2).toBe('key.jog.0');
  });
});

describe('tuner-ui: LT / RT, B and the changed dot use the group own level (anim-joints J2 fix)', () => {
  const sec = (id: string) => TUNE_SECTIONS.find((s) => s.id === id)!;
  // the panel's `ownLevel` (src/ui/animTunePanel.ts): the group path's depth, capped at the section's level count
  const ownLevel = (groups: readonly string[], group: string): number => {
    const prefix = sharedPrefix(groups);
    return Math.max(0, Math.min(groupPath(group, prefix).length, levelCount(groups, prefix)) - 1);
  };
  /** One LT / RT step as the panel does it: the next choice at the group's own level, through `groupForPath`. */
  const step = (groups: readonly string[], group: string, d: number): { opts: string[]; next: string | null } => {
    const prefix = sharedPrefix(groups);
    const k = ownLevel(groups, group);
    const path = groupPath(group, prefix);
    const opts = levelOptions(groups, prefix, path, k);
    const at = Math.max(0, opts.indexOf(path[k] ?? ''));
    path[k] = opts[(at + d + opts.length) % opts.length]!;
    return { opts, next: groupForPath(groups, prefix, path) };
  };

  const cases: [string, string, string, string][] = [
    // section, body-state row, team row, its other role
    ['joint', 'joint.idle', 'joint.team.boost.a', 'joint.team.boost.b'],
    ['hand', 'hand.rifle.idle', 'hand.rifle.team.boost.a', 'hand.rifle.team.boost.b'],
    ['weapon', 'weapon.rifle.idle', 'weapon.rifle.team.boost.a', 'weapon.rifle.team.boost.b'],
    ['ik', 'ik.idle', 'ik.team.boost.a', 'ik.team.boost.b'],
  ];

  for (const [id, body, team, other] of cases) {
    it(`${id}: a body state row steps through the states, a team row through A / B`, () => {
      const g = sec(id).groups;
      const prefix = sharedPrefix(g);
      expect(g).toContain(body);
      expect(g).toContain(team);
      // the deepest picker is empty for a body state row (the bug: LT / RT did nothing, B landed on a hidden picker)
      expect(levelOptions(g, prefix, groupPath(body, prefix), levelCount(g, prefix) - 1)).toEqual([]);
      // body row: its own level is the state level, with every state as a choice
      const b = step(g, body, 1);
      expect(b.opts.length).toBeGreaterThan(20);
      expect(b.opts).toContain('walk');
      expect(b.next).not.toBe(body);
      expect(b.next && groupPath(b.next, prefix).length).toBe(groupPath(body, prefix).length);
      expect(step(g, b.next!, -1).next).toBe(body);
      // team row: its own level is the role, A <-> B
      const t = step(g, team, 1);
      expect(t.opts).toEqual(['a', 'b']);
      expect(t.next).toBe(other);
      expect(step(g, other, 1).next).toBe(team);
      // a trav row steps through the trav kinds
      const trav = g.find((x) => groupPath(x, prefix).includes('trav'))!;
      const tr = step(g, trav, 1);
      expect(tr.opts).toContain('vault');
      expect(tr.opts).toContain('mantle');
      expect(tr.next).toMatch(/\.trav\./);
    });
  }
});

describe('tuner-ui: plain labels', () => {
  it('slider names are short plain words, ids unchanged', () => {
    expect(plainLabel('body', 'trackMul', 'foot width / track')).toBe('Feet apart');
    expect(plainLabel('body', 'kneeOutMul', 'knee out (pole)')).toBe('Knees point out');
    expect(plainLabel('body', 'pelvisYAdd', 'pelvis height / crouch depth')).toBe('Hip height');
    expect(plainLabel('body', 'leanAdd', 'forward lean')).toBe('Lean forward');
    expect(plainLabel('joint', 'elbowR_x', 'elbowR pitch')).toBe('Right elbow bend');
    expect(plainLabel('hand', 'handLFwd', 'handL IK target fwd')).toBe('Left hand forward');
    expect(plainLabel('ik', 'footR', 'footR IK strength (0 = FK: rest + joint offsets)')).toBe('Right foot reach');
    expect(plainLabel('weapon', 'gunPitch', 'gun in the hand pitch')).toBe('Gun tilt in the gun hand');
    expect(plainLabel('gun', 'gunPitch', 'muzzle pitch (+ down)')).toBe('Muzzle tilt');
  });

  it('no label keeps brackets, "x2" or "pole"', () => {
    for (const s of TUNE_SECTIONS)
      for (const t of s.tunables) {
        const l = plainLabel(s.id, t.id, t.label);
        expect(l, `${s.id}:${t.id}`).not.toMatch(/[()]|x2|\bpole\b|\bIK\b|\bfwd\b/);
        expect(l.length, `${s.id}:${t.id}`).toBeLessThan(30);
      }
  });

  it('group words, units, values and loops', () => {
    expect(plainGroupWord('body', 0, 'crouchIdle')).toBe('Crouch idle');
    expect(plainGroupWord('keys', 1, '0')).toBe('Key 1');
    expect(plainGroupWord('hand', 0, 'none')).toBe('No weapon');
    expect(plainUnit('x')).toBe('×');
    expect(plainUnit('deg')).toBe('°');
    expect(valueText(1, 0.01)).toBe('1.00');
    expect(valueText(0.125, 0.005)).toBe('0.125');
    expect(plainLoop('state:aimFwd', 'state: aim glide fwd')).toBe('Aim glide forward');
    expect(plainLoop('keyed:crouch_walk', 'keyed: crouch_walk')).toBe('Crouch walk clip');
    expect(plainLoop('off', 'off (you drive)')).toBe('Off (you move)');
  });
});

describe('tuner-ui: the drop-down list', () => {
  it('opens on the current choice, moves, picks, backs out', () => {
    const d = new DropNav();
    d.openAt(2, 5);
    expect(d.open && d.index === 2).toBe(true);
    d.move(1);
    d.move(1);
    d.move(1);
    expect(d.index).toBe(4);
    expect(d.pick()).toBe(4);
    expect(d.open).toBe(false);
    d.openAt(1, 5);
    d.move(-1);
    d.move(-1);
    expect(d.index).toBe(0);
    expect(d.back()).toBe(1);
    expect(d.open).toBe(false);
    d.openAt(0, 0);
    expect(d.open).toBe(false);
  });

  it('the pad: A opens (select), the D-pad moves (nav), B backs out (back)', () => {
    const c = new TunePadCtl();
    c.open();
    const bit = (i: number) => 1 << i;
    c.update(0, 0, 0, 0, 1 / 60);
    let o = c.update(bit(PAD.A), 0, 0, 0.1, 1 / 60);
    expect(o.select).toBe(true);
    c.update(0, 0, 0, 0.2, 1 / 60);
    o = c.update(bit(PAD.DOWN), 0, 0, 0.3, 1 / 60);
    expect(o.nav).toBe(1);
    c.update(0, 0, 0, 0.4, 1 / 60);
    o = c.update(bit(PAD.B), 0, 0, 0.5, 1 / 60);
    expect(o.back).toBe(true);
    c.update(0, 0, 0, 0.6, 1 / 60);
    o = c.update(bit(PAD.RB), 0, 0, 0.7, 1 / 60);
    expect(o.section).toBe(1);
    // the pause menu held the pad: buttons held then stay swallowed until released
    c.hold();
    o = c.update(bit(PAD.A), 0, 0, 0.8, 1 / 60);
    expect(o.select).toBe(false);
    expect(o.consume).toBe(true);
  });

  it('(item 29 bug) an open list: Up moves the highlight and never closes it (jog -> walk)', () => {
    const states = ['idle', 'walk', 'jog', 'run'];
    const d = new DropNav();
    d.openAt(states.indexOf('jog'), states.length);
    const c = new TunePadCtl();
    c.open();
    c.update(0, 0, 0, 0, 1 / 60);
    const o = c.update(1 << PAD.UP, 0, 0, 0.1, 1 / 60);
    expect(o.nav).toBe(-1);
    expect(o.back).toBe(false);
    d.move(o.nav);
    expect(d.open).toBe(true);
    expect(states[d.index]).toBe('walk');
    // the left stick up does the same
    c.update(0, 0, 0, 0.2, 1 / 60);
    d.openAt(states.indexOf('jog'), states.length);
    d.move(c.update(0, 0, -0.9, 0.3, 1 / 60).nav);
    expect(d.open).toBe(true);
    expect(states[d.pick()]).toBe('walk');
  });

  it('(item 29 bug) the list keeps its highlight in view by scrolling only itself', () => {
    // a 100 px list scrolled to 40: a row at 20..40 above the view scrolls up to it, one below scrolls down, one in
    // view stays (the list never asks its ancestors to scroll: their scroll closed the list)
    expect(listScrollFor(40, 100, 20, 20)).toBe(20);
    expect(listScrollFor(40, 100, 150, 20)).toBe(70);
    expect(listScrollFor(40, 100, 60, 20)).toBe(40);
    expect(listScrollFor(0, 100, 0, 20)).toBe(0);
  });
});

describe('tuner-ui: size', () => {
  it('compact at 1080p, readable on a phone in landscape, larger with M and L', () => {
    const s = tunerScale('S', 1920, 1080);
    const m = tunerScale('M', 1920, 1080);
    const l = tunerScale('L', 1920, 1080);
    // (marlow-bays T2) larger text, a docked column of at most a third of the screen
    expect(s.font).toBe(16);
    expect(m.font).toBeGreaterThan(s.font);
    expect(l.font).toBeGreaterThan(m.font);
    expect(l.width).toBeLessThanOrEqual(1920 * 0.34);
    expect(s.height).toBeLessThanOrEqual(1080);
    const p = tunerScale('S', 932, 430);
    expect(p.font).toBeGreaterThanOrEqual(11);
    expect(p.width).toBeLessThanOrEqual(932 * 0.62);
    expect(p.height).toBeLessThanOrEqual(430);
  });
});

describe('tuner-ui: the loop sets the state', () => {
  it('states, clips, pairs and climbs map to groups that exist', () => {
    expect(loopGroups('state:walk')).toMatchObject({ body: 'walk', step: 'step.walk', weight: 'weight.walk' });
    expect(loopGroups('state:aimStrafe').body).toBe('aim');
    expect(loopGroups('keyed:crouch_walk')).toMatchObject({ body: 'crouchWalk', clip: 'crouch_walk' });
    expect(loopGroups('keyed:crouch_run').step).toBe('step.crouchRun');
    expect(loopGroups('pair:boost').team).toBe('team.boost.a');
    expect(loopGroups('pair:hold_choke').body).toBe('hold');
    expect(loopGroups('trav:ladder')).toMatchObject({ body: 'ladder', trav: 'trav.climbUp' });
    expect(loopGroups('off')).toMatchObject({ body: '', clip: '', team: '' });
    for (const e of STUDIO_ENTRIES) {
      const g = loopGroups(e.id);
      for (const v of [g.body, g.team, g.trav, g.step, g.weight]) if (v) expect(isTuneGroup(v), `${e.id} -> ${v}`).toBe(true);
      // (mixamo-retarget M5) a motion capture has no Keys table (Keys edit the hand-made clips only; the panel skips a missing group)
      if (g.clip) expect(isTuneGroup(`key.${g.clip}.0`) || e.kind === 'pair' || mocapSource(g.clip) !== null, `${e.id} clip`).toBe(true);
    }
  });
});

describe('tuner-ui: a body state carries to the other tabs', () => {
  it('walk carries to joints, reach, hands, stepping and weight; the gun hold only where it maps', () => {
    const c = bodyCarry('walk');
    expect(c).toMatchObject({ joint: 'joint.walk', ik: 'ik.walk', handState: 'walk', gunState: '', step: 'step.walk', weight: 'weight.walk' });
    for (const g of [c.joint, c.ik, c.step, c.weight]) expect(isTuneGroup(g), g).toBe(true);
    expect(isTuneGroup(`hand.rifle.${c.handState}`) && isTuneGroup(`weapon.rifle.${c.handState}`)).toBe(true);
    const a = bodyCarry('aim');
    expect(a.gunState).toBe('aim');
    expect(isTuneGroup(`rifle.${a.gunState}`)).toBe(true);
    expect(a.weight).toBe('weight.drawn');
    expect(bodyCarry('crouchWalk')).toMatchObject({ step: 'step.crouchWalk', weight: 'weight.crouch' });
    // a state the other sections lack: nothing invented
    expect(bodyCarry('ladder')).toMatchObject({ gunState: '', step: '', weight: '' });
  });

  it('every body state carries only to groups that exist', () => {
    const body = TUNE_SECTIONS.find((s) => s.id === 'body')!;
    for (const b of body.groups) {
      const c = bodyCarry(b);
      for (const g of [c.joint, c.ik, c.step, c.weight]) if (g) expect(isTuneGroup(g), `${b} -> ${g}`).toBe(true);
      if (c.gunState) expect(isTuneGroup(`rifle.${c.gunState}`), `${b} gun`).toBe(true);
    }
  });
});

describe('tuner-ui: camera snap lock', () => {
  it('holds the angle to her facing as she turns, and follows her', () => {
    const c = new FreeViewCore();
    c.start('orbit', 0, 2, -3, 0, 0, 0, 0, 0);
    c.lock = 'side';
    c.bodyYaw = 0.4;
    c.lookX = 0.7; // (item 29 phase 2) the look turns the held angle around her
    c.dt = 1 / 60;
    c.place(0, 0, 0);
    const o = { yaw: 0, pitch: 0 };
    freeSnap('side', 0.4, o);
    expect(c.yaw).toBeCloseTo(o.yaw + 0.7, 9);
    const rel0 = c.yaw - c.bodyYaw;
    c.bodyYaw = 1.9;
    c.place(5, 0, 2);
    expect(c.yaw - c.bodyYaw).toBeCloseTo(rel0, 9);
    // the camera sits `dist` back from her along the held angle
    const d = Math.hypot(c.x - 5, c.y - (0 + c.height), c.z - 2);
    expect(d).toBeCloseTo(c.dist, 6);
    // unlocked, the look turns it again
    c.lock = '';
    const y = c.yaw;
    c.lookX = 0.3;
    c.place(5, 0, 2);
    expect(c.yaw).toBeCloseTo(y + 0.3, 9);
    expect(FREE_CFG.pitchMax).toBeGreaterThan(0);
  });
});

describe('tuner-ui: loop on the spot', () => {
  it('a moving state on the spot keeps its stick but does not turn; keyed clips are unchanged', () => {
    studioReset();
    expect(STUDIO.spot).toBe(true);
    const o: StudioInputOut = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
    studioInput(studioEntry('state:walk'), false, o, true);
    expect(o.y).toBeGreaterThan(0);
    expect(o.turn).toBe(0);
    studioInput(studioEntry('state:walk'), false, o, false);
    expect(o.turn).toBeGreaterThan(0);
    expect(studioSpot(studioEntry('state:walk'), true)).toBe(true);
    expect(studioSpot(studioEntry('state:idle'), true)).toBe(false);
    expect(studioSpot(studioEntry('keyed:walk'), true)).toBe(false);
    expect(studioSpot(studioEntry('state:walk'), false)).toBe(false);
    const d = spotShift(3.2, 4.1, 3, 4, { x: 0, z: 0 });
    expect(d.x).toBeCloseTo(0.2, 9);
    expect(d.z).toBeCloseTo(0.1, 9);
  });
});

describe('tuner v3 phase 2: the orbit by hand and Side swapping sides', () => {
  it('the left snap is the other side; the angle around her reads back as set', async () => {
    const { orbitAngleDeg, orbitViewYaw } = await import('../src/player/freeView');
    const o = { yaw: 0, pitch: 0 };
    freeSnap('side', 0.4, o);
    expect(orbitAngleDeg(o.yaw, 0.4)).toBeCloseTo(90, 9);
    freeSnap('left', 0.4, o);
    expect(orbitAngleDeg(o.yaw, 0.4)).toBeCloseTo(270, 9);
    freeSnap('back', 0.4, o);
    expect(orbitAngleDeg(o.yaw, 0.4)).toBeCloseTo(0, 9);
    freeSnap('front', 0.4, o);
    expect(orbitAngleDeg(o.yaw, 0.4)).toBeCloseTo(180, 9);
    for (const a of [0, 45, 90, 180, 359]) expect(orbitAngleDeg(orbitViewYaw(a, 1.3), 1.3)).toBeCloseTo(a, 9);
  });
  it('setOrbit places the camera around her, held to her facing under a lock', () => {
    const c = new FreeViewCore();
    c.start('orbit', 0, 2, -3, 0, 0, 0, 0, 0);
    c.lock = 'back';
    c.bodyYaw = 0.5;
    c.place(0, 0, 0);
    c.setOrbit(90, 20, 4, 0.5);
    c.place(0, 0, 0);
    expect(c.dist).toBe(4);
    expect(c.pitch).toBeCloseTo((-20 * Math.PI) / 180, 9);
    const rel = c.yaw - c.bodyYaw;
    c.bodyYaw = 2;
    c.place(0, 0, 0);
    expect(c.yaw - c.bodyYaw).toBeCloseTo(rel, 9);
    // 90 degrees: on her right (the camera sits on her right side of the circled point)
    const right = { x: Math.cos(2), z: -Math.sin(2) };
    expect((c.x - 0) * right.x + (c.z - 0) * right.z).toBeGreaterThan(0.9 * c.dist * Math.cos(c.pitch));
  });
});
