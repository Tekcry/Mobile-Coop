// (piano-escape S2) The intro as data: the shot list on its clock, the camera path (continuous, inside the start bay),
// the fade, the skip, the prompt and the EMP beat, the actors and their shots, the reveals. Pure: no Babylon.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTOR_SPEED,
  EMP_CUT_S,
  EMP_OUT_S,
  INTRO_ACTORS,
  MUSIC_WAIT_S,
  OPERATOR_SPOTS,
  PROMPT_AT,
  PianoIntro,
  REVEALS,
  SHOT_T,
  START_BAY,
  actorAt,
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

const src = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

/** An intro past the music wait, at intro time `t`. */
function at(t: number): PianoIntro {
  const i = new PianoIntro();
  i.musicStarted();
  i.step(t);
  return i;
}

describe('the shot list on the intro clock', () => {
  it('0 / 3 / 9 / 16 / 30 / 38 s: black, fade in, hold, pull back, reveal, prompt', () => {
    expect(at(0.01).shot).toBe('black');
    expect(at(2.99).shot).toBe('black');
    expect(at(3).shot).toBe('fadeIn');
    expect(at(9).shot).toBe('hold');
    expect(at(16).shot).toBe('pullBack');
    expect(at(30).shot).toBe('reveal');
    expect(at(38).shot).toBe('prompt');
    expect(at(120).shot).toBe('prompt');
    expect(SHOT_T).toEqual({ black: 3, fadeIn: 9, hold: 16, pullBack: 30, reveal: 38 });
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

  it('press: the EMP 0-0.8 s, the black-out beat to 2.5 s, then play (done); once', () => {
    const i = at(40);
    expect(i.press()).toBe(true);
    expect(i.press()).toBe(false);
    expect(i.promptOn).toBe(false);
    expect(i.shot).toBe('emp');
    i.step(EMP_OUT_S + 1e-6);
    expect(i.shot).toBe('blackout');
    expect(i.done).toBe(false);
    i.step(EMP_CUT_S - EMP_OUT_S + 1e-6);
    expect(i.shot).toBe('play');
    expect(i.done).toBe(true);
    expect(i.fade()).toBe(0);
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
      // 10 ms steps: no jump anywhere (the fastest move is well under 1 m/s)
      expect(maxStep).toBeLessThan(0.01);
      expect(maxLook).toBeLessThan(0.02);
      expect(maxFov).toBeLessThan(0.002);
    });
  }

  it('the close-up: 0.6 m off the chest, about 22 deg; 30 s about 5 m up at (0.8, 1.2); 38 s at 7.5 m looking north-east', () => {
    const c = introCam();
    introCamera(10, 0, c);
    const [ox, oz] = OPERATOR_SPOTS[0]!;
    expect(hyp2(c.x - ox, c.z - oz)).toBeCloseTo(0.6, 6);
    expect(c.y).toBeCloseTo(1.4, 6);
    expect((c.fov * 180) / Math.PI).toBeCloseTo(22, 6);
    introCamera(30, 0, c);
    expect(c.x).toBeCloseTo(0.8, 6);
    expect(c.z).toBeCloseTo(1.2, 6);
    expect(c.y).toBeCloseTo(5, 6);
    introCamera(38, 0, c);
    expect(c.y).toBeCloseTo(7.5, 6);
    // north-east and down, over the bins
    expect(c.tx).toBeGreaterThan(c.x);
    expect(c.tz).toBeGreaterThan(c.z);
    expect(c.ty).toBeLessThan(c.y);
    // it holds after 38 s and after the press
    const h = introCam();
    introCamera(80, 0, h);
    expect(h).toEqual(c);
    const i = at(60);
    i.press();
    i.step(1);
    expect(i.camera(introCam())).toEqual(c);
  });

  it('the rise never stops between the pull-back and the reveal (height rises through 30 s)', () => {
    const c = introCam();
    let prev = -1;
    for (let t = 16.5; t <= 37.5; t += 0.5) {
      introCamera(t, 0, c);
      expect(c.y, `t ${t}`).toBeGreaterThan(prev);
      prev = c.y;
    }
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

  it('they move at 0.3x walking pace, never faster', () => {
    const a = actorPose();
    const b = actorPose();
    for (let i = 0; i < 4; i++) {
      actorAt(i, 0, a);
      for (let t = 0.1; t <= PROMPT_AT; t += 0.1) {
        actorAt(i, t, b);
        expect(hyp3(b.x - a.x, b.y - a.y, b.z - a.z) / 0.1).toBeLessThanOrEqual(ACTOR_SPEED + 1e-6);
        Object.assign(a, b);
      }
    }
    expect(ACTOR_SPEED).toBeCloseTo(0.39, 6);
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
