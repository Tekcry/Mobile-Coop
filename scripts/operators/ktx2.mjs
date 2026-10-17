// npm run operators:ktx2 [wren|moth] - step 11 (D26, closes A73): encodes every LOD's baked texture set to KTX2 (Basis
// UASTC, quality 2, Zstd 18, full mip chain; albedo sRGB, normal and ORM linear) with KTX-Software's toktx, repacks each
// LOD GLB with KHR_texture_basisu (no WebP / PNG left inside), refreshes the Lab copies <id>-lab-<lod>.glb and writes the
// measured costs into export/report.json (`ktx2`) and README.md. Runs at the end of `operators:lods`; on its own it
// re-encodes from the PNG sets beside the GLBs. Decodes every KTX2 back with `ktx extract --transcode rgba8` (the
// reference transcoder) into textures/<lod>/ktx2-decoded/ and reports the PSNR against the source PNG.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { OUT_DIR } from './paths.mjs';

const KTX_BIN = process.env.KTX_BIN ?? 'C:/Program Files/KTX-Software/bin';
const exe = (n) => path.join(KTX_BIN, process.platform === 'win32' ? `${n}.exe` : n);

/** toktx arguments per map kind (README "KTX2"). */
export function toktxArgs(kind, out, src) {
  const base = ['--t2', '--encode', 'uastc', '--uastc_quality', '2', '--zcmp', '18', '--genmipmap'];
  if (kind === 'normal') return [...base, '--assign_oetf', 'linear', '--normalize', out, src];
  if (kind === 'orm') return [...base, '--assign_oetf', 'linear', out, src];
  return [...base, '--assign_oetf', 'srgb', out, src];
}

/** GPU bytes of a transcoded mip chain: BC7 / ASTC 4x4 (16 bytes per 4x4 block) and the RGBA8 fallback. */
export function mipBytes(w, h) {
  let block = 0;
  let rgba = 0;
  for (let x = w, y = h; ; x = Math.max(1, x >> 1), y = Math.max(1, y >> 1)) {
    block += Math.ceil(x / 4) * Math.ceil(y / 4) * 16;
    rgba += x * y * 4;
    if (x === 1 && y === 1) break;
  }
  return { block, rgba };
}

function readGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const bl = buf.readUInt32LE(20 + jl);
  return { json, bin: buf.subarray(28 + jl, 28 + jl + bl) };
}

function writeGlb(json, bin) {
  const raw = Buffer.from(JSON.stringify(json), 'utf8');
  const jl = (raw.length + 3) & ~3;
  const bl = (bin.length + 3) & ~3;
  const out = Buffer.alloc(28 + jl + bl);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  out.fill(0x20, 20, 20 + jl);
  raw.copy(out, 20);
  out.writeUInt32LE(bl, 20 + jl);
  out.writeUInt32LE(0x004e4942, 24 + jl);
  bin.copy(out, 28 + jl);
  return out;
}

/**
 * Replaces every image of a GLB with the KTX2 of the same name (`ktx(name)` returns its bytes) and points every texture
 * at it through KHR_texture_basisu (required: the file keeps no fallback image).
 */
export function repackGlb(buf, ktx) {
  const { json, bin } = readGlb(buf);
  const swap = new Map();
  for (const im of json.images ?? []) {
    const data = ktx(im.name);
    if (!data) throw new Error(`no KTX2 for image ${im.name}`);
    swap.set(im.bufferView, data);
    im.mimeType = 'image/ktx2';
  }
  const parts = [];
  let off = 0;
  for (const [i, bv] of json.bufferViews.entries()) {
    const data = swap.get(i) ?? bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const pad = ((off + 7) & ~7) - off;
    if (pad) parts.push(Buffer.alloc(pad));
    off += pad;
    bv.byteOffset = off;
    bv.byteLength = data.length;
    parts.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    off += data.length;
  }
  json.buffers = [{ byteLength: off }];
  for (const t of json.textures ?? []) {
    const src = t.extensions?.KHR_texture_basisu?.source ?? t.extensions?.EXT_texture_webp?.source ?? t.source;
    delete t.source;
    t.extensions = { KHR_texture_basisu: { source: src } };
  }
  const ext = (l) => [...new Set([...(l ?? []).filter((e) => e !== 'EXT_texture_webp'), 'KHR_texture_basisu'])];
  json.extensionsUsed = ext(json.extensionsUsed);
  json.extensionsRequired = ext(json.extensionsRequired);
  return writeGlb(json, Buffer.concat(parts));
}

/** Minimal 8-bit PNG reader (RGB / RGBA / grey, non-interlaced): enough for the baked sets and toktx's output. */
function readPng(file) {
  const b = readFileSync(file);
  let p = 8;
  let w = 0, h = 0, ct = 0, depth = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.toString('latin1', p + 4, p + 8);
    const d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8) throw new Error(`${file}: ${depth}-bit PNG`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= ch ? px[y * stride + x - ch] : 0;
      const u = y ? px[(y - 1) * stride + x] : 0;
      const c = y && x >= ch ? px[(y - 1) * stride + x - ch] : 0;
      let r = v;
      if (f === 1) r = v + a;
      else if (f === 2) r = v + u;
      else if (f === 3) r = v + ((a + u) >> 1);
      else if (f === 4) { const pp = a + u - c; const pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c); }
      px[y * stride + x] = r & 255;
    }
  }
  return { w, h, ch, px };
}

/** PSNR (dB) of the RGB channels of two images of the same size. */
function psnr(a, b) {
  let se = 0;
  let n = 0;
  for (let i = 0; i < a.w * a.h; i++) {
    for (let c = 0; c < 3; c++) {
      const d = a.px[i * a.ch + Math.min(c, a.ch - 1)] - b.px[i * b.ch + Math.min(c, b.ch - 1)];
      se += d * d;
      n++;
    }
  }
  return se === 0 ? 99 : Math.round(10 * Math.log10((255 * 255) / (se / n)) * 100) / 100;
}

const mb = (n) => Math.round((n / 2 ** 20) * 100) / 100;

export function encodeKtx2(id) {
  const exp = path.join(OUT_DIR, id, 'export');
  const rep = path.join(exp, 'report.json');
  if (!existsSync(rep)) return;
  const report = JSON.parse(readFileSync(rep, 'utf8'));
  for (const [lod, r] of Object.entries(report.lods)) {
    const glb = path.join(exp, r.glb);
    const prev = r.ktx2;
    // the geometry's time: the Blender export's, kept across repacks (check.mjs judges render staleness by it)
    const glbMs = statSync(glb).mtimeMs;
    const again = prev && glbMs <= prev.repackedMs + 1000;
    const sourceGlbMs = again ? prev.sourceGlbMs : glbMs;
    const before = again ? prev.glbMBBefore * 2 ** 20 : statSync(glb).size;
    const files = [];
    const bytes = new Map();
    let block = 0, rgba = 0, disk = 0;
    for (const t of r.textures) {
      const png = path.join(exp, t.file);
      const kind = /-normal\.png$/.test(png) ? 'normal' : /-orm\.png$/.test(png) ? 'orm' : 'albedo';
      const out = png.replace(/\.png$/, '.ktx2');
      execFileSync(exe('toktx'), toktxArgs(kind, out, png), { stdio: 'pipe' });
      execFileSync(exe('ktx'), ['validate', out], { stdio: 'pipe' });
      // level 0 as the reference transcoder decodes it: kept for the Lab while Babylon's KTX2 transcoder is not bundled
      const dec = path.join(path.dirname(out), 'ktx2-decoded', `${path.basename(out, '.ktx2')}.png`);
      mkdirSync(path.dirname(dec), { recursive: true });
      execFileSync(exe('ktx'), ['extract', '--transcode', 'rgba8', '--level', '0', out, dec], { stdio: 'pipe' });
      const quality = psnr(readPng(png), readPng(dec));
      const m = mipBytes(t.size, t.size);
      const size = statSync(out).size;
      block += m.block; rgba += m.rgba; disk += size;
      bytes.set(path.basename(out, '.ktx2'), readFileSync(out));
      files.push({ file: path.relative(exp, out).replace(/\\/g, '/'), kind, size: t.size, bytes: size, pngBytes: t.bytes, psnrDb: quality });
    }
    const packed = repackGlb(readFileSync(glb), (name) => bytes.get(name));
    writeFileSync(glb, packed);
    copyFileSync(glb, path.join(OUT_DIR, id, `${id}-lab-${lod}.glb`));
    const after = statSync(glb);
    r.glbMB = mb(after.size);
    r.ktx2 = {
      encode: 'UASTC q2 + Zstd 18, mips; albedo sRGB, normal / ORM linear', files, diskMB: mb(disk),
      vramMB: { bc7: mb(block), astc4x4: mb(block), rgba8Fallback: mb(rgba) }, glbMBBefore: mb(before), glbMB: mb(after.size),
      sourceGlbMs, repackedMs: after.mtimeMs,
    };
    r.textureMB = { ...r.textureMB, ktx2MB: mb(disk), bc7MB: mb(block), astc4x4MB: mb(block) };
    console.info(`operators ktx2: ${id} ${lod} ${files.length} textures, KTX2 ${mb(disk)} MB on disk (PNG ${r.textureMB.pngMB}), VRAM BC7 / ASTC ${mb(block)} MB (RGBA8 ${mb(rgba)}), GLB ${mb(before)} -> ${mb(after.size)} MB, PSNR ${Math.min(...files.map((f) => f.psnrDb))}-${Math.max(...files.map((f) => f.psnrDb))} dB`);
  }
  writeFileSync(rep, JSON.stringify(report, null, 1));
  // README: the KTX2 paragraph becomes the measured table
  const readme = path.join(exp, 'README.md');
  if (existsSync(readme)) {
    const head = readFileSync(readme, 'utf8').split('\nKTX2 (')[0].trimEnd();
    const rows = Object.entries(report.lods).map(([lod, r]) => `| ${lod} | ${r.ktx2.files.length} | ${r.textureMB.pngMB} | ${r.ktx2.diskMB} | ${r.ktx2.vramMB.bc7} | ${r.ktx2.vramMB.rgba8Fallback} | ${r.ktx2.glbMBBefore} -> ${r.ktx2.glbMB} | ${Math.min(...r.ktx2.files.map((f) => f.psnrDb))} |`);
    writeFileSync(readme, [head, '', 'KTX2 (step 11, `npm run operators:ktx2`, D26): Basis UASTC quality 2 + Zstd 18 with mips, albedo sRGB, normal and ORM linear; every GLB carries `KHR_texture_basisu` (required) and no WebP / PNG. VRAM is the transcoded size (BC7 on desktop, 16 bytes per 4x4 block, full mip chain; desktop only, D29). PSNR: level 0 decoded by `ktx extract --transcode rgba8` against the baked PNG.', '',
      '| LOD | Textures | PNG MB | KTX2 MB (disk) | VRAM BC7 / ASTC MB | VRAM RGBA8 fallback MB | GLB MB (WebP -> KTX2) | Lowest PSNR dB |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n'));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  for (const id of only.length ? only : ['wren', 'moth']) encodeKtx2(id);
}
