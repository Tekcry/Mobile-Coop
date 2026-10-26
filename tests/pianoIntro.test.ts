// (piano-escape S2) The intro as data: the shot list on its clock, the camera path (continuous, inside the start bay),
// the fade, the skip, the prompt and the EMP beat, the actors and their shots, the reveals. Pure: no Babylon.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTOR_LEN,
  ACTOR_SPEED,
  ACTOR_START,
  EMP_CUT_S,
  EMP_FLASH2_AT,
  EMP_FLASH_AT,
  EMP_GLIDE_S,
  EMP_KNIFE_AT,
  HERO_CAMS,
  HERO_LAMP,
  knifeHandAt,
  EMP_OUT_S,
  INTRO_ACTORS,
  PLAY_YAW,
  PRESS_S,
  camFromRotation,
  empBlack,
  empFlash,
  glideCamera,
  pressHand,
  pressHandAt,
  MUSIC_WAIT_S,
  OPERATOR_SPOTS,
  PROMPT_AT,
  PianoIntro,
  REVEALS,
  SHOT_T,
  START_BAY,
  actorAt,
  actorHeightAt,
  actorPath,
  actorPose,
  introCam,
  introCamera,
  introFade,
  muzzleFlicker,
  revealCamera,
  shotAt,
  shotLine,
} from '../src/game/pianoIntro';
import { hyp2, hyp3 } from '../src/core/mathx';
import { THORNBECK_LAMPS } from '../src/world/maps/thornbeckMill';

const src = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

/** Point (x, y, z) on a 16:9 frame of camera `c` (no roll): [right, up], each -1..1 inside the frame. */
function frame(c: { x: number; y: number; z: number; tx: number; ty: number; tz: number; fov: number }, x: number, y: number, z: number): [number, number] {
  const yaw = Math.atan2(c.tx - c.x, c.tz - c.z);
  const pitch = Math.atan2(c.ty - c.y, hyp2(c.tx - c.x, c.tz - c.z));
  const dx = x - c.x;
  const dy = y - c.y;
  const dz = z - c.z;
  const r = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
  const h = Math.sin(yaw) * dx + Math.cos(yaw) * dz;
  const f = h * Math.cos(pitch) + dy * Math.sin(pitch);
  const u = -h * Math.sin(pitch) + dy * Math.cos(pitch);
  const t = Math.tan(c.fov / 2);
  return [r / f / (t * (16 / 9)), u / f / t];
}

/** An intro past the music wait, at intro time `t`. */
function at(t: number): PianoIntro {
  const i = new PianoIntro();
  i.musicStarted();
  i.step(t);
  return i;
}

describe('the shot list on the intro clock', () => {
  it('0 / 3 / 9 / 16 / 30 / 35 / 38 s: black, fade in, hold, pull back, reveal, hero, prompt (S8)', () => {
    expect(at(0.01).shot).toBe('black');
    expect(at(2.99).shot).toBe('black');
    expect(at(3).shot).toBe('fadeIn');
    expect(at(9).shot).toBe('hold');
    expect(at(16).shot).toBe('pullBack');
    expect(at(30).shot).toBe('reveal');
    expect(at(35).shot).toBe('hero');
    expect(at(38).shot).toBe('prompt');
    expect(at(120).shot).toBe('prompt');
    expect(SHOT_T).toEqual({ black: 3, fadeIn: 9, hold: 16, pullBack: 30, reveal: 35, hero: 38 });
    // the prompt stays at 38 s (the music, the skip's seek and the actors' start times hang on it)
    expect(PROMPT_AT).toBe(38);
  });

  it('the fade: black to 3 s, a 6 s fade in, clear from 9 s', () => {
    expect(introFade(0)).toBe(1);
    expect(introFade(2.9)).toBe(1);
    expect(introFade(6)).toBeCloseTo(0.5, 6);
    expect(introFade(9)).toBe(0);
    expect(introFade(30)).toBe(0);
    expect(at(1).fade()).toBe(1);
    expect(at(16).fade()).toBe(0);
  });

  it('the clock waits at 0 s for the music, at most MUSIC_WAIT_S; then it runs', () => {
    const i = new PianoIntro();
    i.step(1);
    expect(i.t).toBe(0);
    i.musicStarted();
    i.step(1);
    expect(i.t).toBe(1);
    const silent = new PianoIntro();
    for (let k = 0; k < 10; k++) silent.step(0.5);
    expect(silent.t).toBeCloseTo(5 - MUSIC_WAIT_S, 6);
    // paused: no time passes
    i.step(0);
    i.step(Number.NaN);
    expect(i.t).toBe(1);
  });
});

describe('the prompt and the EMP beat', () => {
  it('the prompt is up from 38 s with no timer; a press before it does nothing', () => {
    const i = at(37.9);
    expect(i.promptOn).toBe(false);
    expect(i.press()).toBe(false);
    i.step(0.2);
    expect(i.promptOn).toBe(true);
    i.step(500);
    expect(i.promptOn).toBe(true);
    expect(i.shot).toBe('prompt');
  });

  it('press: the EMP 0-0.8 s, the black-out beat (black, then the flash), the 1.2 s glide, then play at 3.5 s (done); once', () => {
    expect(EMP_CUT_S).toBe(3.5);
    expect(EMP_GLIDE_S).toBe(1.2);
    expect(EMP_OUT_S).toBeLessThan(EMP_FLASH_AT);
    expect(EMP_FLASH_AT + 0.5).toBeLessThan(EMP_CUT_S - EMP_GLIDE_S);
    const i = at(40);
    expect(i.press()).toBe(true);
    expect(i.press()).toBe(false);
    expect(i.promptOn).toBe(false);
    expect(i.shot).toBe('emp');
    expect(i.glide).toBe(0);
    i.step(EMP_OUT_S + 1e-6);
    expect(i.shot).toBe('blackout');
    expect(i.done).toBe(false);
    i.step(EMP_FLASH_AT - EMP_OUT_S - 0.1);
    // the black beat before the flash
    expect(i.fade()).toBe(1);
    i.step(0.2);
    expect(i.fade()).toBe(0);
    i.step(EMP_CUT_S - EMP_GLIDE_S - EMP_FLASH_AT - 0.1 + 0.5);
    expect(i.shot).toBe('glide');
    expect(i.glide).toBeCloseTo(0.5 / EMP_GLIDE_S, 4);
    expect(i.done).toBe(false);
    i.step(EMP_GLIDE_S);
    expect(i.shot).toBe('play');
    expect(i.done).toBe(true);
    expect(i.glide).toBe(1);
    expect(i.fade()).toBe(0);
  });

  it('the black layer and the view-side flash after the press', () => {
    expect(empBlack(0)).toBe(0);
    expect(empBlack(EMP_OUT_S - 0.01)).toBe(0);
    expect(empBlack(EMP_FLASH_AT - 0.01)).toBe(1);
    expect(empBlack(EMP_FLASH_AT)).toBe(0);
    expect(empFlash(EMP_FLASH_AT - 0.01)).toBe(0);
    expect(empFlash(EMP_FLASH_AT + 0.06)).toBe(1);
    expect(empFlash(EMP_FLASH_AT + 0.3)).toBeGreaterThan(0.2);
    // (S8 fix) light through the glide: the afterglow, then a second softer strike as the glide starts
    for (let e = EMP_FLASH_AT + 0.1; e < EMP_CUT_S - 0.3; e += 0.05) expect(empFlash(e), `e ${e.toFixed(2)}`).toBeGreaterThan(0.2);
    expect(EMP_FLASH2_AT).toBeGreaterThan(EMP_CUT_S - EMP_GLIDE_S);
    expect(empFlash(EMP_FLASH2_AT + 0.06)).toBeCloseTo(0.65, 6);
    expect(empFlash(EMP_FLASH2_AT + 0.06)).toBeLessThan(1);
    // render only and over at the cut (the view is gone then)
    for (let e = EMP_CUT_S; e < 20; e += 0.05) expect(empFlash(e)).toBe(0);
  });

  it('(S8 fix) the knife hand: out from EMP_KNIFE_AT (in the black), held through the flash, off by the cut', () => {
    const h = pressHand();
    expect(EMP_KNIFE_AT).toBeGreaterThan(EMP_OUT_S);
    expect(EMP_KNIFE_AT + 0.35).toBeLessThanOrEqual(EMP_FLASH_AT);
    expect(knifeHandAt(EMP_KNIFE_AT - 0.01, h).w).toBe(0);
    expect(knifeHandAt(EMP_FLASH_AT, h).w).toBe(1);
    // in front of him and out to his right
    expect(h.f).toBeGreaterThan(0.2);
    expect(h.s).toBeLessThan(-0.3);
    expect(h.u).toBeGreaterThan(1.1);
    expect(knifeHandAt(EMP_CUT_S - 0.6, h).w).toBe(1);
    expect(knifeHandAt(EMP_CUT_S - 0.01, h).w).toBeLessThan(0.01);
    expect(knifeHandAt(EMP_CUT_S, h).w).toBe(0);
  });

  it('the press pose: the hand to the belt, up to press, back by PRESS_S (before the flash)', () => {
    const h = pressHand();
    expect(pressHandAt(0, h).w).toBe(0);
    pressHandAt(0.15, h);
    expect(h.w).toBe(1);
    expect(h.u).toBeCloseTo(0.98, 6);
    pressHandAt(0.5, h);
    expect(h.w).toBe(1);
    expect(h.u).toBeCloseTo(1.18, 6);
    expect(h.f).toBeGreaterThan(0.3);
    expect(pressHandAt(PRESS_S, h).w).toBe(0);
    expect(PRESS_S).toBeLessThan(EMP_FLASH_AT);
  });
});

describe('the skip', () => {
  it('jumps to 38 s (the prompt), once, never after the prompt or the press', () => {
    const i = at(5);
    expect(i.skip()).toBe(true);
    expect(i.t).toBe(PROMPT_AT);
    expect(i.skipped).toBe(true);
    expect(i.promptOn).toBe(true);
    expect(i.skip()).toBe(false);
    const j = at(39);
    expect(j.skip()).toBe(false);
  });

  it('skips the music wait too (the music seeks to 38 s)', () => {
    const i = new PianoIntro();
    expect(i.skip()).toBe(true);
    i.step(0.5);
    expect(i.t).toBeCloseTo(PROMPT_AT + 0.5, 6);
  });
});

describe('the camera path', () => {
  const inBay = (c: { x: number; y: number; z: number }): boolean =>
    c.x >= START_BAY.x0 && c.x <= START_BAY.x1 && c.z >= START_BAY.z0 && c.z <= START_BAY.z1 && c.y > 0 && c.y < START_BAY.ridge;

  for (const slot of [0, 1]) {
    it(`slot ${slot}: continuous (position, target, field) and inside the start bay from 0 to 45 s`, () => {
      const a = introCam();
      const b = introCam();
      introCamera(0, slot, a);
      let maxStep = 0;
      let maxLook = 0;
      let maxFov = 0;
      for (let t = 0.01; t <= 45; t += 0.01) {
        introCamera(t, slot, b);
        expect(inBay(b), `t ${t.toFixed(2)}`).toBe(true);
        maxStep = Math.max(maxStep, hyp3(b.x - a.x, b.y - a.y, b.z - a.z));
        maxLook = Math.max(maxLook, hyp3(b.tx - a.tx, b.ty - a.ty, b.tz - a.tz));
        maxFov = Math.max(maxFov, Math.abs(b.fov - a.fov));
        Object.assign(a, b);
      }
      // 10 ms steps: no jump anywhere (the crane is slow; the hero drop is the fastest move, under 8 m/s)
      expect(maxStep).toBeLessThan(0.08);
      expect(maxLook).toBeLessThan(0.08);
      expect(maxFov).toBeLessThan(0.002);
    });

    it(`slot ${slot}: continuous at each beat boundary (16, 30, 35, 38 s)`, () => {
      const a = introCam();
      const b = introCam();
      for (const t of [SHOT_T.hold, SHOT_T.pullBack, SHOT_T.reveal, SHOT_T.hero]) {
        introCamera(t - 1e-7, slot, a);
        introCamera(t + 1e-7, slot, b);
        expect(hyp3(b.x - a.x, b.y - a.y, b.z - a.z), `t ${t}`).toBeLessThan(1e-4);
        expect(hyp3(b.tx - a.tx, b.ty - a.ty, b.tz - a.tz), `t ${t}`).toBeLessThan(1e-4);
        expect(Math.abs(b.fov - a.fov), `t ${t}`).toBeLessThan(1e-5);
      }
    });

    it(`slot ${slot}: the hero shot from OPERATOR_SPOTS: on the floor in the open, looking up at his face, the lamp high in frame`, () => {
      const c = introCam();
      introCamera(SHOT_T.hero, slot, c);
      for (const k of ['x', 'y', 'z', 'tx', 'ty', 'tz', 'fov'] as const) expect(c[k]).toBeCloseTo(HERO_CAMS[slot]![k], 9);
      const [ox, oz] = OPERATOR_SPOTS[slot]!;
      expect(c.y).toBeGreaterThan(0.29);
      expect(c.y).toBeLessThanOrEqual(0.5);
      // out in the open west of him: clear of W1 and the low sacks (x 1.5-3.9, z 1-2.2) by 1 m
      expect(c.x).toBeLessThan(4.5 - 1);
      expect(c.x >= 1.5 - 1 && c.x <= 3.9 + 1 && c.z >= 1 - 1 && c.z <= 2.2 + 1).toBe(false);
      // the lamp is the map's L2
      const l2 = THORNBECK_LAMPS.find((l) => l[0] === 'L2')!;
      expect([l2[1], l2[2], l2[3]]).toEqual([...HERO_LAMP]);
      // the face (on the wall, 1.55 m) low in frame and the lamp high: both inside, the view tilted up
      const face = frame(c, ox + 0.15, 1.55, oz);
      const lamp = frame(c, HERO_LAMP[0], HERO_LAMP[1], HERO_LAMP[2]);
      expect(Math.abs(face[0])).toBeLessThan(0.8);
      expect(face[1]).toBeGreaterThan(-0.5);
      expect(face[1]).toBeLessThan(0);
      expect(Math.abs(lamp[0])).toBeLessThan(0.8);
      expect(lamp[1]).toBeGreaterThan(0.3);
      expect(lamp[1]).toBeLessThan(0.9);
      expect(c.ty).toBeGreaterThan(c.y + 1);
      // nothing between the camera and the lamp: the line clears W1 (2.8 m) and the sacks (1.2 m)
      for (let f = 0; f <= 1; f += 0.005) {
        const x = c.x + (HERO_LAMP[0] - c.x) * f;
        const y = c.y + (HERO_LAMP[1] - c.y) * f;
        const z = c.z + (HERO_LAMP[2] - c.z) * f;
        if (x >= 4.5 && x <= 6.5 && z >= 3 && z <= 7.5) expect(y, `W1 at ${f.toFixed(3)}`).toBeGreaterThan(2.85);
        if (x >= 1.5 && x <= 3.9 && z >= 1 && z <= 2.2) expect(y, `sacks at ${f.toFixed(3)}`).toBeGreaterThan(1.25);
      }
      // it drops fast: on the floor before it pushes all the way in
      const m = introCam();
      introCamera(SHOT_T.reveal + 0.6 * (SHOT_T.hero - SHOT_T.reveal), slot, m);
      expect(m.y).toBeCloseTo(c.y, 6);
      expect(hyp2(m.x - c.x, m.z - c.z)).toBeGreaterThan(0.1);
    });
  }

  it('the close-up: 0.6 m off the chest and jaw, about 30 deg; 30 s about 5 m up at (0.8, 1.2); 35 s at 7.5 m looking north-east', () => {
    const c = introCam();
    introCamera(10, 0, c);
    const [ox, oz] = OPERATOR_SPOTS[0]!;
    expect(hyp2(c.x - ox, c.z - oz)).toBeCloseTo(0.6, 6);
    expect(c.y).toBeCloseTo(1.48, 6);
    expect((c.fov * 180) / Math.PI).toBeCloseTo(30, 6);
    // the frame's top edge at the chest reaches the jaw (about 1.55 m on a 1.75 m operator)
    expect(c.ty + Math.tan(c.fov / 2) * 0.6).toBeGreaterThan(1.58);
    introCamera(30, 0, c);
    expect(c.x).toBeCloseTo(0.8, 6);
    expect(c.z).toBeCloseTo(1.2, 6);
    expect(c.y).toBeCloseTo(5, 6);
    introCamera(35, 0, c);
    expect(c.y).toBeCloseTo(7.5, 6);
    // north-east and down, over the bins
    expect(c.tx).toBeGreaterThan(c.x);
    expect(c.tz).toBeGreaterThan(c.z);
    expect(c.ty).toBeLessThan(c.y);
    // it holds on the hero shot after 38 s and after the press (until the glide)
    const hero = introCam();
    introCamera(38, 0, hero);
    const h = introCam();
    introCamera(80, 0, h);
    expect(h).toEqual(hero);
    const i = at(60);
    i.press();
    i.step(1);
    expect(i.camera(introCam())).toEqual(hero);
  });

  it('the rise never stops between the pull-back and the reveal (height rises through 30 s)', () => {
    const c = introCam();
    let prev = -1;
    for (let t = 16.5; t <= 34.5; t += 0.5) {
      introCamera(t, 0, c);
      expect(c.y, `t ${t}`).toBeGreaterThan(prev);
      prev = c.y;
    }
  });
});

describe('the glide into the shoulder camera (S8)', () => {
  /** The view's `place`: the rotation a camera at (x, y, z) takes to look at (tx, ty, tz). */
  const rot = (c: { x: number; y: number; z: number; tx: number; ty: number; tz: number }): [number, number] => {
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dz = c.tz - c.z;
    return [-Math.atan2(dy, hyp2(dx, dz)), Math.atan2(dx, dz)];
  };

  it('a rendered camera as an IntroCam keeps its place, view and field', () => {
    const c = camFromRotation(4.1, 1.7, 2.6, 0.12, 0.3, 0.9, introCam());
    expect([c.x, c.y, c.z, c.fov]).toEqual([4.1, 1.7, 2.6, 0.9]);
    const [rx, ry] = rot(c);
    expect(rx).toBeCloseTo(0.12, 9);
    expect(ry).toBeCloseTo(0.3, 9);
  });

  for (const slot of [0, 1]) {
    it(`slot ${slot}: starts on the hero shot, ends exactly on the shoulder pose, no jump between`, () => {
      const hero = introCamera(PROMPT_AT, slot, introCam());
      const [ox, oz] = OPERATOR_SPOTS[slot]!;
      // the shoulder camera behind the operator along the wall (PLAY_YAW), 2 m boom
      const yaw = PLAY_YAW[slot]!;
      const sh = camFromRotation(ox + 0.15 - Math.sin(yaw) * 2, 1.75, oz - Math.cos(yaw) * 2, 0.05, yaw, 0.95, introCam());
      const out = introCam();
      expect(glideCamera(hero, sh, 0, out)).toEqual(hero);
      glideCamera(hero, sh, 1, out);
      for (const k of ['x', 'y', 'z', 'tx', 'ty', 'tz', 'fov'] as const) expect(out[k]).toBeCloseTo(sh[k], 9);
      const [rx, ry] = rot(out);
      expect(rx).toBeCloseTo(0.05, 9);
      expect(ry).toBeCloseTo(yaw, 9);
      // continuous through the glide (the intro's own clock: 10 ms steps over 1.2 s)
      const i = at(PROMPT_AT);
      i.press();
      const a = introCam();
      const b = introCam();
      glideCamera(i.camera(introCam()), sh, i.glide, a);
      let maxStep = 0;
      for (let e = 0; e < EMP_CUT_S + 0.2; e += 0.01) {
        i.step(0.01);
        glideCamera(i.camera(b), sh, i.glide, b);
        maxStep = Math.max(maxStep, hyp3(b.x - a.x, b.y - a.y, b.z - a.z));
        Object.assign(a, b);
      }
      expect(maxStep).toBeLessThan(0.08);
      expect(i.done).toBe(true);
      for (const k of ['x', 'y', 'z', 'tx', 'ty', 'tz', 'fov'] as const) expect(a[k]).toBeCloseTo(sh[k], 9);
    });
  }

  it('the play look: along the wall towards the partner (slot 0 north, slot 1 south)', () => {
    expect(PLAY_YAW).toEqual([0, Math.PI]);
  });
});

describe('the actors and their shots (0.3x)', () => {
  it('four actors (two down the stair from the north-east, two along the south aisle) stop 4-6.5 m from the players at 38 s', () => {
    expect(INTRO_ACTORS).toHaveLength(4);
    const p = actorPose();
    for (let i = 0; i < 4; i++) {
      actorAt(i, PROMPT_AT, p);
      let d = Infinity;
      for (const [x, z] of OPERATOR_SPOTS) d = Math.min(d, hyp2(p.x - x, p.z - z));
      expect(d, INTRO_ACTORS[i]!.name).toBeGreaterThanOrEqual(4);
      expect(d, INTRO_ACTORS[i]!.name).toBeLessThanOrEqual(6.5);
      expect(p.y).toBe(0);
      // they hold their spot after 38 s (idle until the press)
      const q = actorAt(i, 60, actorPose());
      expect([q.x, q.z]).toEqual([p.x, p.z]);
    }
    // the stair pair from the north-east, the aisle pair from the east
    expect(actorAt(0, 10, p).z).toBeGreaterThan(10);
    expect(actorAt(2, 10, p).x).toBeGreaterThan(15);
  });

  it('they move at 0.3x a grunt walk (0.9 m/s), never faster, from their start times; GuardActor paths are flat x, z', () => {
    for (let i = 0; i < 4; i++) {
      const p = actorPath(i);
      expect(p).toHaveLength(INTRO_ACTORS[i]!.pts.length * 2);
      expect(ACTOR_START[i]! + ACTOR_LEN[i]! / ACTOR_SPEED).toBeCloseTo(PROMPT_AT - 4.5, 6);
      expect(ACTOR_START[i]).toBeGreaterThan(0);
    }
    const a = actorPose();
    const b = actorPose();
    for (let i = 0; i < 4; i++) {
      actorAt(i, 0, a);
      for (let t = 0.1; t <= PROMPT_AT; t += 0.1) {
        actorAt(i, t, b);
        // over the ground (GuardActor's flat path; the stair's height is the nav's)
        expect(hyp2(b.x - a.x, b.z - a.z) / 0.1).toBeLessThanOrEqual(ACTOR_SPEED + 1e-6);
        Object.assign(a, b);
      }
    }
    expect(ACTOR_SPEED).toBeCloseTo(0.27, 6);
  });

  it('shots from 9 s to the prompt only, hitting W1 by the operators; muzzle flashes flicker', () => {
    const s = shotLine();
    for (let i = 0; i < 4; i++) {
      expect(shotAt(i, 8.9, s)).toBe(false);
      expect(shotAt(i, 20, s)).toBe(true);
      expect(s.age).toBeGreaterThanOrEqual(0);
      expect(s.flight).toBeGreaterThan(0);
      // the impact on W1 (x 4.5-6.5, z 3-7.5, up to 2.8 m)
      expect(s.tx).toBeGreaterThanOrEqual(4.5);
      expect(s.tx).toBeLessThanOrEqual(6.5);
      expect(s.tz).toBeGreaterThanOrEqual(3);
      expect(s.tz).toBeLessThanOrEqual(7.5);
      expect(s.ty).toBeLessThanOrEqual(2.8);
    }
    // after the prompt the last shot is the one before 38 s (the actors idle)
    shotAt(0, 60, s);
    expect(60 - s.age).toBeLessThan(PROMPT_AT);
    let lit = 0;
    for (let t = 9; t < 16; t += 0.01) if (muzzleFlicker(t) > 0) lit++;
    expect(lit).toBeGreaterThan(0);
    expect(muzzleFlicker(40)).toBe(0);
    expect(muzzleFlicker(5)).toBe(0);
  });
});

describe('the framed reveals', () => {
  it('two (the ladder top and the hoist door), each a push in toward what it shows', () => {
    expect(REVEALS.map((r) => r.id)).toEqual(['ladder', 'hoist']);
    const a = introCam();
    const b = introCam();
    for (let i = 0; i < REVEALS.length; i++) {
      revealCamera(i, 0, a);
      revealCamera(i, 1, b);
      const da = hyp3(a.tx - a.x, a.ty - a.y, a.tz - a.z);
      const db = hyp3(b.tx - b.x, b.ty - b.y, b.tz - b.z);
      expect(da - db).toBeCloseTo(0.5, 6);
    }
  });
});

describe('the hard rules', () => {
  it('the intro never writes timeScale, and pianoIntro.ts is pure (no Babylon, no Math.hypot)', () => {
    for (const f of ['src/game/pianoIntro.ts', 'src/game/pianoIntroView.ts', 'src/game/pianoScene.ts'].filter((p) => existsSync(resolve(__dirname, '..', p)))) {
      const s = src(f);
      expect(s, f).not.toMatch(/timeScale\s*=/);
      expect(s, f).not.toMatch(/Math\.hypot/);
    }
    const p = src('src/game/pianoIntro.ts');
    expect(p).not.toMatch(/from '\.\.\/core\/babylon'|@babylonjs/);
    expect(p).not.toMatch(/from '\.\.\/net|from '\.\/net/);
  });
});

describe('(S7) the intro actors without a nav (the co-op client)', () => {
  it('actorHeightAt follows each path: G1 + G2 down the stair from its top to the floor, G3 + G4 on the floor', () => {
    expect(actorHeightAt(0, 8.6, 13.8)).toBeCloseTo(3.0, 5);
    expect(actorHeightAt(0, 8.6, 12.2)).toBeCloseTo(1.5, 5);
    expect(actorHeightAt(0, 8.6, 10.6)).toBeCloseTo(0, 5);
    expect(actorHeightAt(0, 7.5, 8.7)).toBeCloseTo(0, 5);
    expect(actorHeightAt(1, 9.0, 14.6)).toBeCloseTo(3.6, 5);
    expect(actorHeightAt(2, 12, 2)).toBe(0);
    expect(actorHeightAt(3, 14, 3.4)).toBe(0);
  });
});
