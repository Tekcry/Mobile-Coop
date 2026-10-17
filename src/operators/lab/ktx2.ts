/**
 * Step 11 (D26, D27): Babylon's KTX2 transcoder for the Lab, from bundled files only (no runtime network, CLAUDE.md).
 * The decoder is the official `@babylonjs/ktx2decoder` package (Apache 2.0, same version as @babylonjs/core), imported
 * as an ES module and run on the main thread (no worker, so no `babylon.ktx2Decoder.js` script URL is ever needed);
 * every wasm transcoder comes from the package's own `wasm/` folder through Vite's `?url`. The decoder's CDN defaults
 * (cdn.babylonjs.com) are overwritten before the first KTX2 texture loads and `ktx2Setup` refuses to run if any remain.
 * Dev-only: the game never imports this file.
 */
import * as KTX2Decoder from '@babylonjs/ktx2decoder';
import uastcAstc from '@babylonjs/ktx2decoder/wasm/uastc_astc.wasm?url';
import uastcBc7 from '@babylonjs/ktx2decoder/wasm/uastc_bc7.wasm?url';
import uastcR8 from '@babylonjs/ktx2decoder/wasm/uastc_r8_unorm.wasm?url';
import uastcRg8 from '@babylonjs/ktx2decoder/wasm/uastc_rg8_unorm.wasm?url';
import uastcRgbaSrgb from '@babylonjs/ktx2decoder/wasm/uastc_rgba8_srgb_v2.wasm?url';
import uastcRgbaUnorm from '@babylonjs/ktx2decoder/wasm/uastc_rgba8_unorm_v2.wasm?url';
import mscJs from '@babylonjs/ktx2decoder/wasm/msc_basis_transcoder.js?url';
import mscWasm from '@babylonjs/ktx2decoder/wasm/msc_basis_transcoder.wasm?url';
import zstd from '@babylonjs/ktx2decoder/wasm/zstddec.wasm?url';
import { KhronosTextureContainer2, type Engine } from '../../core/babylon';
import { ktx2RemoteUrls } from './labData';

let done: Engine | null = null;

/** Points Babylon's KTX2 decoder at the bundled files (once per engine). Throws if any URL still leaves the page. */
export function ktx2Setup(engine: Engine): void {
  if (done === engine) return;
  const d = KTX2Decoder as unknown as Record<string, { WasmModuleURL?: string; JSModuleURL?: string }>;
  d.LiteTranscoder_UASTC_ASTC!.WasmModuleURL = uastcAstc;
  d.LiteTranscoder_UASTC_BC7!.WasmModuleURL = uastcBc7;
  d.LiteTranscoder_UASTC_R8_UNORM!.WasmModuleURL = uastcR8;
  d.LiteTranscoder_UASTC_RG8_UNORM!.WasmModuleURL = uastcRg8;
  d.LiteTranscoder_UASTC_RGBA_SRGB!.WasmModuleURL = uastcRgbaSrgb;
  d.LiteTranscoder_UASTC_RGBA_UNORM!.WasmModuleURL = uastcRgbaUnorm;
  d.MSCTranscoder!.JSModuleURL = mscJs;
  d.MSCTranscoder!.WasmModuleURL = mscWasm;
  d.ZSTDDecoder!.WasmModuleURL = zstd;
  Object.assign(KhronosTextureContainer2.URLConfig, {
    jsDecoderModule: '', wasmUASTCToASTC: uastcAstc, wasmUASTCToBC7: uastcBc7, wasmUASTCToRGBA_UNORM: uastcRgbaUnorm,
    wasmUASTCToRGBA_SRGB: uastcRgbaSrgb, wasmUASTCToR8_UNORM: uastcR8, wasmUASTCToRG8_UNORM: uastcRg8,
    jsMSCTranscoder: mscJs, wasmMSCTranscoder: mscWasm, wasmZSTDDecoder: zstd,
  });
  const used: Record<string, unknown> = { ...KhronosTextureContainer2.URLConfig };
  for (const k of Object.keys(d)) {
    const v = d[k] as unknown as { WasmModuleURL?: unknown; JSModuleURL?: unknown } | undefined;
    if (!v || typeof (v as unknown) !== 'function') continue;
    if (typeof v.WasmModuleURL === 'string') used[`${k}.WasmModuleURL`] = v.WasmModuleURL;
    if (typeof v.JSModuleURL === 'string') used[`${k}.JSModuleURL`] = v.JSModuleURL;
  }
  const remote = ktx2RemoteUrls(used, location.origin);
  if (remote.length) throw new Error(`operator lab: KTX2 decoder would fetch ${remote.join(', ')}`);
  // main thread, decoder module given directly: the worker (which would importScripts a decoder URL) is never made
  KhronosTextureContainer2.DefaultNumWorkers = 0;
  new KhronosTextureContainer2(engine, { numWorkers: 0, binariesAndModulesContainer: { jsDecoderModule: KTX2Decoder } });
  done = engine;
}
