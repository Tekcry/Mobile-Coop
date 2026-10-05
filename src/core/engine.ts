import { Engine } from './babylon';

export interface EngineOptions {
  antialias: boolean;
}

export function createEngine(canvas: HTMLCanvasElement, opts: EngineOptions): Engine {
  const engine = new Engine(
    canvas,
    opts.antialias,
    {
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      doNotHandleContextLost: false,
      audioEngine: false,
    },
    false,
  );
  engine.enableOfflineSupport = false;
  engine.disableManifestCheck = true;
  return engine;
}

/**
 * Sets the render resolution. renderScale 1 = native up to the DPR cap.
 * Mid-range phones have DPR 2.5-3; rendering above ~1.5x costs fill-rate for little gain.
 */
export function applyRenderScale(engine: Engine, renderScale: number, dprCap = 1.5): void {
  const dpr = Math.min(globalThis.devicePixelRatio || 1, dprCap);
  engine.setHardwareScalingLevel(1 / (dpr * renderScale));
}
