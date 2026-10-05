import './styles.css';
import { createEngine, applyRenderScale } from './core/engine';
import { GameLoop } from './core/loop';
import { DebugOverlay } from './ui/debugOverlay';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, setupRotateOverlay, suppressBrowserGestures } from './pwa/pwa';
import { flags } from './core/flags';
import { createSandboxScene } from './world/sandbox';

function setBoot(progress: number, status: string): void {
  const bar = document.getElementById('boot-progress');
  const st = document.getElementById('boot-status');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  if (st) st.textContent = status;
}

async function boot(): Promise<void> {
  suppressBrowserGestures();
  setupRotateOverlay();
  setupServiceWorker(() => console.info('[pwa] offline ready'));

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const engine = createEngine(canvas, { antialias: false });
  applyRenderScale(engine, 1);
  window.addEventListener('resize', () => engine.resize());

  const loop = new GameLoop(engine);
  const debug = new DebugOverlay(engine, loop);
  if (flags.debug) debug.toggle(true);

  setBoot(0.3, 'Loading physics…');
  await loadHavok();
  setBoot(0.7, 'Building scene…');

  const { scene, hooks } = await createSandboxScene(engine);
  loop.attach(scene, hooks);
  debug.setScene(scene);
  loop.start();

  setBoot(1, 'Ready');
  document.getElementById('boot')?.classList.add('done');
}

boot().catch((err: unknown) => {
  console.error(err);
  setBoot(1, `Failed to start: ${err instanceof Error ? err.message : String(err)}`);
});
