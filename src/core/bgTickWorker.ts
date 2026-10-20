// (coop-fix) The hidden-page tick source: a dedicated worker's timer keeps firing while the page is hidden, where
// requestAnimationFrame stops (bgTick.ts). Bundled by Vite, no network.
import { BG_TICK_HZ } from './bgTick';

const ctx = self as unknown as { postMessage(m: number): void };
setInterval(() => ctx.postMessage(0), 1000 / BG_TICK_HZ);
