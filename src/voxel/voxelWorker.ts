/** Bake worker: the sky, lamp and moon bakes off the main thread; buffers go back transferred. */
import { bakeLamps, type LampJob } from './lampBake';
import { bakeMoon, bakeSky, type MoonJob, type SkyJob } from './skyBake';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<SkyJob | LampJob | MoonJob>) => void) | null; postMessage(m: unknown, t: Transferable[]): void };
ctx.onmessage = (e) => {
  const job = e.data;
  if ('kind' in job && job.kind === 'lamps') {
    const r = bakeLamps(job);
    ctx.postMessage(r, [r.boxes.buffer as ArrayBuffer, r.vis.buffer as ArrayBuffer]);
    return;
  }
  if ('kind' in job && job.kind === 'moon') {
    const r = bakeMoon(job);
    ctx.postMessage(r, [r.vis.buffer as ArrayBuffer]);
    return;
  }
  if ('kind' in job && job.kind === 'sky') {
    const r = bakeSky(job);
    ctx.postMessage(r, [r.vis.buffer as ArrayBuffer, r.roof.buffer as ArrayBuffer]);
    return;
  }
};
