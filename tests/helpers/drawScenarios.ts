/**
 * (anim-natural N3) The draw / holster / swap scenarios driven through `drawHarness`: each starts settled (holstered
 * rifle selected, or drawn at low ready), gives the input, and records from that frame on. `settle` more frames are
 * recorded after the move so the final pose can be read.
 */
import { drawHarness, type DrawHarness, type DrawSample } from './drawHarness';

export interface DrawScenario {
  name: string;
  /** Gets the rig to the scenario's start (not recorded). */
  setup: (h: DrawHarness) => void;
  /** The input that starts the move (on the first recorded frame). */
  go: (h: DrawHarness) => void;
  /** More input at recorded frame `at` (LT pressed mid-draw). */
  then?: { at: number; act: (h: DrawHarness) => void };
}

const settle = (h: DrawHarness, n = 70): void => void h.run(n);
const pistol = (h: DrawHarness): void => {
  h.tap('swapNext');
  settle(h, 30);
};
/** Drawn to low ready and settled (the 1.1 s rifle draw, N3). */
const drawn = (h: DrawHarness): void => {
  h.tap('draw');
  settle(h, 100);
};

export const DRAW_SCENARIOS: readonly DrawScenario[] = [
  { name: 'draw rifle (X, low ready)', setup: () => {}, go: (h) => h.tap('draw') },
  { name: 'draw rifle (LT, sling draw to aim)', setup: () => {}, go: (h) => h.hold('ads', true) },
  { name: 'draw pistol (X, low ready)', setup: pistol, go: (h) => h.tap('draw') },
  { name: 'draw pistol (LT, to aim)', setup: pistol, go: (h) => h.hold('ads', true) },
  { name: 'holster rifle', setup: drawn, go: (h) => h.tap('draw') },
  { name: 'holster pistol', setup: (h) => (pistol(h), drawn(h)), go: (h) => h.tap('draw') },
  { name: 'swap rifle to pistol', setup: drawn, go: (h) => h.tap('swapNext') },
  { name: 'swap pistol to rifle', setup: (h) => (pistol(h), drawn(h)), go: (h) => h.tap('swapNext') },
  { name: 'low ready to aim (rifle)', setup: drawn, go: (h) => h.hold('ads', true) },
  { name: 'draw rifle (X, LT held mid-draw)', setup: () => {}, go: (h) => h.tap('draw'), then: { at: 20, act: (h) => h.hold('ads', true) } },
  { name: 'swap rifle to pistol (aiming)', setup: (h) => (drawn(h), h.hold('ads', true), settle(h, 60)), go: (h) => h.tap('swapNext') },
];

/** Runs a scenario: 40 settling frames, its setup, then `frames` recorded frames from the input. */
export async function runScenario(sc: DrawScenario, frames = 110): Promise<DrawSample[]> {
  const h = await drawHarness();
  try {
    settle(h, 40);
    sc.setup(h);
    sc.go(h);
    const out: DrawSample[] = [];
    for (let k = 0; k < frames; k++) {
      if (sc.then && k === sc.then.at) sc.then.act(h);
      out.push(h.step());
    }
    return out;
  } finally {
    h.dispose();
  }
}
