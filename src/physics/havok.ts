import HavokPhysics from '@babylonjs/havok';
// Bundled locally (hashed asset, precached by the service worker). No CDN.
import havokWasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin, Vector3, type Scene } from '../core/babylon';

type HavokInstance = Awaited<ReturnType<typeof HavokPhysics>>;
let havokPromise: Promise<HavokInstance> | null = null;

/** Loads the Havok WASM once and caches the instance. */
export function loadHavok(): Promise<HavokInstance> {
  havokPromise ??= HavokPhysics({ locateFile: () => havokWasmUrl });
  return havokPromise;
}

export const GRAVITY = new Vector3(0, -18, 0);

export async function enablePhysics(scene: Scene): Promise<HavokPlugin> {
  const hk = await loadHavok();
  // useDeltaForWorldStep=false -> fixed step size, matching our fixed loop.
  const plugin = new HavokPlugin(false, hk);
  plugin.setTimeStep(1 / 60);
  scene.enablePhysics(GRAVITY, plugin);
  return plugin;
}
