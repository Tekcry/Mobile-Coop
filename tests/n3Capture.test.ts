// TEMPORARY (N3): captures every scenario's samples to N3_CAPTURE_OUT (JSON).
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { DRAW_SCENARIOS, runScenario } from './helpers/drawScenarios';
it.skipIf(!process.env.N3_CAPTURE_OUT)('n3 capture', async () => {
  const out: Record<string, unknown> = {};
  for (const sc of DRAW_SCENARIOS) out[sc.name] = await runScenario(sc, 200);
  writeFileSync(process.env.N3_CAPTURE_OUT!, JSON.stringify(out));
});
