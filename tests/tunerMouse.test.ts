import { describe, expect, it } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import '../src/player/speedTune';
import '../src/player/weightTune';
import '../src/anim/tuneKeys';
import '../src/anim/moveTune';
import { TUNE_SECTIONS } from '../src/anim/tuneRegistry';
import { STAGE_LIGHT_RANGE, STAGE_LIGHTS, STUDIO_ENTRIES, STUDIO_LIGHT, stageLightPlace, stageLightScale, stageViewYaw } from '../src/anim/studio';
import { TUNER_MOUSE_KEY, TUNER_SPOT_KEY, TunerMouseCtl } from '../src/ui/tunerMouse';
import { RIG_JOINTS, rowKeyParts, tuneTarget } from '../src/ui/tunerTarget';
import { loopForGroup, loopKeyed, loopKeyedPick } from '../src/ui/tunerLayout';
import { BINDS, FIXED_KEYS, MENU_NAV_KEYS, bindable, defaultBinds } from '../src/input/keyBindings';

// (marlow-bays slice T) The tuner's mouse mode (item 9), the selected row's target (item 10), the Keyed box (item 11).

describe('tuner mouse mode', () => {
  it('opens in drag view (pointer free), toggles to the game camera and back', () => {
    const m = new TunerMouseCtl();
    expect(m.free).toBe(false);
    expect(m.panelMouse).toBe(true);
    expect(m.setOpen(true)).toBe(true);
    expect(m.mode).toBe('drag');
    expect(m.toggle()).toBe('game');
    expect(m.free).toBe(false);
    expect(m.panelMouse).toBe(false);
    expect(m.toggle()).toBe('drag');
    expect(m.free).toBe(true);
  });

  it('closing gives play its lock back and the next open starts in drag view again', () => {
    const m = new TunerMouseCtl();
    m.setOpen(true);
    m.toggle();
    expect(m.setOpen(false)).toBe(false);
    expect(m.panelMouse).toBe(true);
    // closed, the key does nothing
    expect(m.toggle()).toBe('drag');
    m.set('game');
    expect(m.mode).toBe('drag');
    expect(m.setOpen(true)).toBe(true);
  });

  it('a lost capture in the game camera drops back to drag view (no pause); otherwise the game handles it', () => {
    const m = new TunerMouseCtl();
    expect(m.lockLost()).toBe(false);
    m.setOpen(true);
    expect(m.lockLost()).toBe(false);
    m.toggle();
    expect(m.lockLost()).toBe(true);
    expect(m.mode).toBe('drag');
    expect(m.free).toBe(true);
  });

  it('the toggle key is no default game bind', () => {
    const codes = JSON.stringify([BINDS, defaultBinds(), Object.keys(FIXED_KEYS), Object.keys(MENU_NAV_KEYS)]);
    expect(codes.includes(`"${TUNER_MOUSE_KEY}"`)).toBe(false);
    expect(TUNER_MOUSE_KEY).not.toBe('F3');
    expect(TUNER_MOUSE_KEY).not.toBe('Backquote');
    // reserved: never bindable
    expect(bindable(TUNER_MOUSE_KEY)).toBe(false);
    expect(bindable(TUNER_SPOT_KEY)).toBe(false);
  });
});

describe('selected row target', () => {
  it('splits a row key', () => {
    expect(rowKeyParts('s:joint:elbowR_x')).toEqual({ section: 'joint', id: 'elbowR_x' });
    expect(rowKeyParts('s:body')).toBeNull();
    expect(rowKeyParts('free')).toBeNull();
  });

  it('joints map to the rig joints and bones', () => {
    expect(tuneTarget('joint', 'elbowR_x')).toMatchObject({ kind: 'joint', a: 'elbowR', b: 'wristR', line: true, label: 'Right elbow' });
    expect(tuneTarget('joint', 'upperArmL_z')).toMatchObject({ a: 'shoulderL', b: 'elbowL', line: true });
    expect(tuneTarget('joint', 'head_y')).toMatchObject({ a: 'headNode', b: '' });
    expect(tuneTarget('joint', 'chest_x')).toMatchObject({ a: 'torso' });
    expect(tuneTarget('joint', 'mirror')).toMatchObject({ kind: 'body' });
  });

  it('limbs, hands, weapon and camera', () => {
    expect(tuneTarget('ik', 'footR')).toMatchObject({ kind: 'joint', a: 'ankleR' });
    expect(tuneTarget('hand', 'handLFwd')).toMatchObject({ a: 'wristL' });
    expect(tuneTarget('weapon', 'gunX')).toMatchObject({ kind: 'weapon' });
    expect(tuneTarget('weapon', 'indexRCurl')).toMatchObject({ kind: 'joint', a: 'wristR' });
    expect(tuneTarget('weapon', 'supportUp')).toMatchObject({ a: 'wristL' });
    expect(tuneTarget('gun', 'gunFwd')).toMatchObject({ kind: 'weapon' });
    expect(tuneTarget('cam', 'camBoomAdd')).toMatchObject({ kind: 'camera', a: '' });
    expect(tuneTarget('body', 'kneeOutMul')).toMatchObject({ a: 'kneeL', b: 'kneeR', line: false });
    expect(tuneTarget('keys', 'armR_elbow')).toMatchObject({ a: 'elbowR', b: 'wristR', line: true });
    expect(tuneTarget('keys', 'pelvis_yaw')).toMatchObject({ a: 'hips' });
    expect(tuneTarget('', '')).toMatchObject({ kind: 'none' });
  });

  it('every slider of every section has a target on the rig (or the weapon / camera), with a label', () => {
    const joints = new Set<string>(RIG_JOINTS);
    for (const s of TUNE_SECTIONS) {
      for (const id of ['', ...s.keys]) {
        const t = tuneTarget(s.id, id);
        expect(t.kind, `${s.id}:${id}`).not.toBe('none');
        expect(t.label.length, `${s.id}:${id}`).toBeGreaterThan(0);
        if (t.kind === 'joint' || t.kind === 'body') {
          expect(joints.has(t.a), `${s.id}:${id} a=${t.a}`).toBe(true);
          if (t.b) expect(joints.has(t.b), `${s.id}:${id} b=${t.b}`).toBe(true);
        }
      }
    }
  });

  it('reuses the out object', () => {
    const out = tuneTarget('joint', 'kneeL_x');
    expect(tuneTarget('cam', '', out)).toBe(out);
    expect(out).toMatchObject({ kind: 'camera', a: '', b: '' });
  });
});

describe('Keyed box', () => {
  const ids = new Set(STUDIO_ENTRIES.map((e) => e.id));

  it('a state with a keyed clip switches both ways', () => {
    expect(loopKeyed('state:walk')).toEqual({ on: false, other: 'keyed:walk' });
    expect(loopKeyed('keyed:walk')).toEqual({ on: true, other: 'state:walk' });
    expect(loopKeyedPick('state:walk', true)).toBe('keyed:walk');
    expect(loopKeyedPick('keyed:walk', false)).toBe('state:walk');
    expect(loopKeyedPick('state:crouchWalk', true)).toBe('keyed:crouch_walk');
    expect(loopKeyedPick('state:aimStrafe', true)).toBe('keyed:glide_strafe');
    expect(loopKeyedPick('state:lowReady', true)).toBe('keyed:ready_stance');
  });

  it('no other form: the box is greyed and the pick stays', () => {
    expect(loopKeyed('keyed:wall_idle')).toEqual({ on: true, other: '' });
    expect(loopKeyed('off')).toEqual({ on: false, other: '' });
    expect(loopKeyed('pair:hold_idle').other).toBe('');
    expect(loopKeyedPick('keyed:wall_idle', false)).toBe('keyed:wall_idle');
    expect(loopKeyedPick('state:walk', false)).toBe('state:walk');
  });

  // (piano-knife S4b) the intro pose is the wall stance plus the captured breath: no keyed clip either
  const NO_KEYED = ['state:aimStill', 'state:crouchAim', 'state:crouchAimFwd', 'state:intro', 'state:introMirror', 'state:introCrouch'];
  it('every pairing names real loop entries and every state has its keyed clip', () => {
    for (const e of STUDIO_ENTRIES) {
      const k = loopKeyed(e.id);
      if (k.other) {
        expect(ids.has(k.other), `${e.id} -> ${k.other}`).toBe(true);
        expect(loopKeyed(k.other).other).toBe(e.id);
      }
      // (marlow-bays T1a, item 19) the aim stances have no keyed clip (procedural only)
      if (e.kind === 'state' && !NO_KEYED.includes(e.id)) expect(k.other, e.id).not.toBe('');
    }
  });
});

describe('a state picked in a tab plays its loop (item 13)', () => {
  const ids = new Set(STUDIO_ENTRIES.map((e) => e.id));

  it('the state level of any section names its loop', () => {
    expect(loopForGroup('joint', 'joint.walk', 'state:idle')).toBe('state:walk');
    expect(loopForGroup('body', 'crouchWalk', 'off')).toBe('state:crouchWalk');
    expect(loopForGroup('hand', 'hand.rifle.jog', 'state:idle')).toBe('state:jog');
    expect(loopForGroup('gun', 'rifle.aim', 'state:idle')).toBe('state:aimFwd');
    expect(loopForGroup('step', 'step.run', 'state:idle')).toBe('state:run');
    expect(loopForGroup('step', 'step.crouchRun', 'state:idle')).toBe('keyed:crouch_run');
    expect(loopForGroup('body', 'wallIdle', 'state:idle')).toBe('keyed:wall_idle');
    expect(loopForGroup('keys', 'key.sneak.3', 'state:idle')).toBe('keyed:sneak');
  });

  it('keyed stays keyed; the loop already playing the state, the camera and states with no loop pick nothing', () => {
    expect(loopForGroup('joint', 'joint.walk', 'keyed:idle')).toBe('keyed:walk');
    expect(loopForGroup('joint', 'joint.walk', 'keyed:walk')).toBe('');
    expect(loopForGroup('joint', 'joint.aim', 'state:aimStrafe')).toBe('');
    expect(loopForGroup('keys', 'key.sneak.3', 'keyed:sneak')).toBe('');
    expect(loopForGroup('cam', 'cam.explore', 'state:idle')).toBe('');
    // (marlow-bays T1a, item 16) a climbing state, a climb move and a co-op role play their loops
    expect(loopForGroup('body', 'ladder', 'state:idle')).toBe('trav:ladder');
    expect(loopForGroup('trav', 'trav.vault', 'state:idle')).toBe('trav:vault');
    expect(loopForGroup('team_boost', 'team.boost.b', 'state:idle')).toBe('pair:boost');
    expect(loopForGroup('team_boost', 'team.boost.a', 'pair:boost')).toBe('');
    // (mixamo-retarget M3) the carry state plays the Mixamo carry idle (its Studio row pins body 'carry')
    expect(loopForGroup('body', 'carry', 'state:idle')).toBe('keyed:mocap_carry_body_idle');
  });

  it('every body state of every section maps to a real loop entry or none', () => {
    for (const s of TUNE_SECTIONS) {
      for (const g of s.groups) {
        const id = loopForGroup(s.id, g, 'off');
        if (id) expect(ids.has(id), `${s.id} ${g} -> ${id}`).toBe(true);
      }
    }
  });
});

describe('stage lights (item 14)', () => {
  it('a key, fill and rim light and an ambient top light', () => {
    expect(STAGE_LIGHTS.map((l) => l.name)).toEqual(['key', 'fill', 'rim', 'ambient']);
    for (const l of STAGE_LIGHTS) expect(l.intensity * STAGE_LIGHT_RANGE.def).toBeGreaterThan(0);
  });

  it('each keeps its offset in the frame it is given as she moves and turns', () => {
    const out = { x: 0, y: 0, z: 0 };
    const key = STAGE_LIGHTS[0]!;
    stageLightPlace(key, 0, 0, 0, 0, out);
    expect(out).toEqual({ x: key.right, y: key.up, z: key.fwd });
    stageLightPlace(key, 5, 1, -2, Math.PI / 2, out);
    // facing +x: forward is +x, right is -z
    expect(out.x).toBeCloseTo(5 + key.fwd, 9);
    expect(out.y).toBeCloseTo(1 + key.up, 9);
    expect(out.z).toBeCloseTo(-2 - key.right, 9);
    const rim = STAGE_LIGHTS[2]!;
    stageLightPlace(rim, 0, 0, 0, 1.1, out);
    expect(Math.hypot(out.x, out.z)).toBeCloseTo(Math.hypot(rim.fwd, rim.right), 9);
  });

  it('(T2) they face the camera: key and fill on its side of her, the rim beyond, the top light above', () => {
    const out = { x: 0, y: 0, z: 0 };
    const d = (x: number, z: number, cx: number, cz: number): number => Math.hypot(x - cx, z - cz);
    // her at (3, 0, 4) facing +z, the camera behind her (the game's view) and then in front of her (an orbit)
    for (const [cx, cz] of [
      [3, 0],
      [3, 9],
      [-2, 4],
    ] as const) {
      const yaw = stageViewYaw(3, 4, cx, cz, 0);
      const her = d(3, 4, cx, cz);
      stageLightPlace(STAGE_LIGHTS[0]!, 3, 0, 4, yaw, out);
      expect(d(out.x, out.z, cx, cz)).toBeLessThan(her);
      stageLightPlace(STAGE_LIGHTS[1]!, 3, 0, 4, yaw, out);
      expect(d(out.x, out.z, cx, cz)).toBeLessThan(her);
      stageLightPlace(STAGE_LIGHTS[2]!, 3, 0, 4, yaw, out);
      expect(d(out.x, out.z, cx, cz)).toBeGreaterThan(her);
      stageLightPlace(STAGE_LIGHTS[3]!, 3, 0, 4, yaw, out);
      expect(out.y).toBeGreaterThan(3);
    }
    // the camera on her: her own facing
    expect(stageViewYaw(1, 1, 1, 1, 0.7)).toBe(0.7);
    // behind her (camera at -z of her): the lights' forward points back at the camera
    expect(stageViewYaw(0, 0, 0, -5, 0)).toBeCloseTo(Math.PI, 9);
  });

  it('the slider clamps; bright by default', () => {
    expect(STUDIO_LIGHT.scale).toBe(STAGE_LIGHT_RANGE.def);
    expect(stageLightScale(5)).toBe(STAGE_LIGHT_RANGE.max);
    expect(stageLightScale(-1)).toBe(0);
    expect(stageLightScale(Number.NaN)).toBe(STAGE_LIGHT_RANGE.def);
    expect(stageLightScale(0.75)).toBe(0.75);
  });
});
