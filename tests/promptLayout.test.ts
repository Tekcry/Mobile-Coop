// (context-prompts S4, PLAN section 5) The prompt layout, pure: the screen clamp, the sideways push (today's world
// prompt numbers, the pinned cluster, its height), the cluster's row text and size, the ring steps, the two-cluster
// fade (focus change, take-back, reassignment) and no allocation in the per-frame functions.
import { describe, expect, it } from 'vitest';
import { CTX_FOCUS } from '../src/game/contextPrompts';
import {
  clampX,
  clampY,
  ctxClusterH,
  ctxHoldText,
  ctxRowChars,
  fadeFocus,
  fadeShown,
  newBox,
  newCtxFade,
  pushApart,
  RING_P,
  RING_STEPS,
  roundPos,
  type PromptBox,
} from '../src/ui/hud/promptLayout';

const f = CTX_FOCUS.fade;

function box(x: number, y: number, chars: number, opt: Partial<PromptBox> = {}): PromptBox {
  return { ...newBox(), on: true, x, y, chars, ...opt };
}

describe('clamp', () => {
  it('keeps prompts inside the readable part of the view', () => {
    expect(clampX(3)).toBe(8);
    expect(clampX(50)).toBe(50);
    expect(clampX(99)).toBe(92);
    expect(clampY(2)).toBe(10);
    expect(clampY(99)).toBe(97);
    expect(roundPos(43.3125)).toBe(43.3);
  });
});

describe('pushApart', () => {
  it('splits the gap as the old world prompts did', () => {
    const b = [box(50, 50, 5), box(50, 50, 10)];
    pushApart(b, 2);
    expect(b[0]!.x).toBeCloseTo(43.3125, 9);
    expect(b[1]!.x).toBeCloseTo(56.6875, 9);
  });

  it('leaves prompts that are far apart alone', () => {
    const wide = [box(30, 50, 5), box(70, 50, 10)];
    pushApart(wide, 2);
    expect([wide[0]!.x, wide[1]!.x]).toEqual([30, 70]);
    const far = [box(50, 50, 5), box(50, 58, 10)];
    pushApart(far, 2);
    expect([far[0]!.x, far[1]!.x]).toEqual([50, 50]);
    const near = [box(50, 50, 5), box(50, 57, 10)];
    pushApart(near, 2);
    expect(near[0]!.x).not.toBe(50);
    expect(near[1]!.x).not.toBe(50);
  });

  it('never moves a pinned cluster for an unpinned prompt', () => {
    const cl = box(50, 50, 15, { h: ctxClusterH(1), pinned: true });
    const v = box(50, 50, 5);
    pushApart([cl, v], 2);
    expect(cl.x).toBe(50);
    expect(v.x).toBeCloseTo(66.5, 9);
    const cl2 = box(50, 50, 15, { h: ctxClusterH(1), pinned: true });
    const v2 = box(50, 50, 5);
    pushApart([v2, cl2], 2);
    expect(v2.x).toBeCloseTo(33.5, 9);
    expect(cl2.x).toBe(50);
  });

  it('counts the cluster height below its anchor', () => {
    const tall = ctxClusterH(3);
    expect(tall).toBeCloseTo(10.8, 9);
    const hit = [box(50, 40, 15, { h: tall, pinned: true }), box(50, 57, 5)];
    pushApart(hit, 2);
    expect(hit[1]!.x).not.toBe(50);
    const miss = [box(50, 40, 15, { h: tall, pinned: true }), box(50, 58.5, 5)];
    pushApart(miss, 2);
    expect(miss[1]!.x).toBe(50);
  });

  it('skips boxes that are off and the pairs past n', () => {
    const off = [box(50, 50, 5, { on: false }), box(50, 50, 10)];
    pushApart(off, 2);
    expect([off[0]!.x, off[1]!.x]).toEqual([50, 50]);
    const lim = [box(50, 50, 5), box(50, 50, 10), box(50, 50, 10)];
    pushApart(lim, 2);
    expect(lim[2]!.x).toBe(50);
    expect(lim[0]!.x).not.toBe(50);
  });
});

describe('row text and size', () => {
  it('writes the hold half and counts the row width', () => {
    expect(ctxHoldText('Open', 'Bash')).toBe(' \u00b7 hold Bash');
    expect(ctxHoldText('', 'Kill')).toBe('hold Kill');
    expect(ctxHoldText('Lights off', '')).toBe('');
    expect(ctxRowChars('Open', 'Bash')).toBe(16);
    expect(ctxRowChars('', 'Kill')).toBe(9);
    expect(ctxRowChars('Shield', '')).toBe(6);
    expect(ctxClusterH(0)).toBe(0);
    expect(ctxClusterH(2)).toBeCloseTo(7.6, 9);
  });

  it('has one ring step per 1 / 40', () => {
    expect(RING_STEPS).toBe(40);
    expect(RING_P.length).toBe(41);
    expect(RING_P[0]).toBe('0deg');
    expect(RING_P[40]).toBe('360deg');
  });
});

describe('fade', () => {
  it('takes the focus once and ignores the same target again', () => {
    const s = newCtxFade();
    expect(fadeFocus(s, 'door', 3, 0)).toBe(true);
    expect(s.cur).toBe(0);
    expect(fadeFocus(s, 'door', 3, 0.5)).toBe(false);
  });

  it('fades the old cluster out while the new one fades in', () => {
    const s = newCtxFade();
    fadeFocus(s, 'door', 3, 0);
    fadeFocus(s, 'door', 4, 1);
    expect(s.cur).toBe(1);
    expect(fadeShown(s, 0, 1 + f / 2) && fadeShown(s, 1, 1 + f / 2)).toBe(true);
    expect(fadeShown(s, 0, 1 + f)).toBe(false);
    expect(fadeShown(s, 1, 1 + f)).toBe(true);
  });

  it('fades out on none and takes the same target back', () => {
    const s = newCtxFade();
    fadeFocus(s, 'door', 3, 0);
    expect(fadeFocus(s, 'none', -1, 2)).toBe(true);
    expect(s.cur).toBe(-1);
    expect(fadeFocus(s, 'none', -1, 2.01)).toBe(false);
    expect(fadeShown(s, 0, 2 + f / 2)).toBe(true);
    expect(fadeShown(s, 0, 2 + f)).toBe(false);
    expect(fadeFocus(s, 'door', 3, 2 + f / 2)).toBe(true);
    expect(s.cur).toBe(0);
  });

  it('takes back the cluster that is still fading on that target', () => {
    const s = newCtxFade();
    fadeFocus(s, 'door', 3, 0);
    fadeFocus(s, 'door', 4, 1);
    expect(fadeFocus(s, 'door', 3, 1 + f / 3)).toBe(true);
    expect(s.cur).toBe(0);
    expect(s.outAt[0]).toBe(-1);
  });

  it('reassigns the other cluster for a third target', () => {
    const s = newCtxFade();
    fadeFocus(s, 'door', 3, 0);
    fadeFocus(s, 'door', 4, 1);
    fadeFocus(s, 'door', 5, 1 + f / 3);
    expect(s.cur).toBe(0);
    expect(s.kind[0]).toBe('door');
    expect(s.ref[0]).toBe(5);
  });

  it('picks the cluster that faded out first when none holds the focus', () => {
    const s = newCtxFade();
    fadeFocus(s, 'door', 3, 0);
    fadeFocus(s, 'door', 4, 1);
    fadeFocus(s, 'none', -1, 2);
    fadeFocus(s, 'door', 6, 5);
    expect(s.cur).toBe(0);
  });
});

describe('no allocation', () => {
  it('runs the per-frame functions on the same objects', () => {
    const boxes = [box(50, 50, 5), box(50, 50, 10), box(52, 55, 15, { pinned: true, h: 5 })];
    const ids = boxes.slice();
    const s = newCtxFade();
    const kinds = s.kind;
    const refs = s.ref;
    const outs = s.outAt;
    for (let i = 0; i < 10000; i++) {
      boxes[0]!.x = 50;
      boxes[1]!.x = 50;
      pushApart(boxes, 3);
      fadeFocus(s, i % 3 === 0 ? 'none' : 'door', i % 5, i * 0.01);
      fadeShown(s, i & 1, i * 0.01);
    }
    expect(boxes.length).toBe(3);
    for (let i = 0; i < 3; i++) expect(boxes[i]).toBe(ids[i]);
    expect(s.kind).toBe(kinds);
    expect(s.ref).toBe(refs);
    expect(s.outAt).toBe(outs);
    expect(s.kind.length).toBe(2);
  });
});
