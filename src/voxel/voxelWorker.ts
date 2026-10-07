/** Voxel worker (3.0): chunk jobs (rasterise + mesh + bricks) and the sky bake off the main thread; buffers go back transferred. */
import { buildChunk, transferables, type ChunkJob } from './chunk';
import { bakeSky, type SkyJob } from './skyBake';

const ctx = self as unknown as { onmessage: ((e: MessageEvent<ChunkJob | SkyJob>) => void) | null; postMessage(m: unknown, t: Transferable[]): void };
ctx.onmessage = (e) => {
  const job = e.data;
  if ('kind' in job && job.kind === 'sky') {
    const r = bakeSky(job);
    ctx.postMessage(r, [r.vis.buffer as ArrayBuffer, r.roof.buffer as ArrayBuffer]);
    return;
  }
  const r = buildChunk(job as ChunkJob);
  ctx.postMessage(r, transferables(r));
};
