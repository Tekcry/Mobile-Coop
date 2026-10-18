/**
 * Step 10 fix round 2 (A76): bake errors inside the outline. Silhouette IoU sees the outline and the back-face count
 * sees holes; neither sees a wrong bake (a shell face that baked another surface: dark slashes, torn wedges). This
 * compares each LOD's Cycles render with the hero's in the same view: a LOD pixel is "new dark" when it is darker than
 * every hero pixel within DARK_RADIUS px (a small shift of an edge or crease is not an error) by more than DARK_DIFF;
 * the measure is the largest 8-connected patch of new-dark pixels. A per-block mean (16 or 8 px blocks) was tried
 * first and does not separate the round-2 errors from LOD0's spread of small differences (A76). Pure (no Babylon, no
 * Node): check.mjs passes the PNG bytes and zlib's inflate.
 */

export interface Rgba {
  width: number;
  height: number;
  /** RGBA, 8 bits per channel, rows top-down. */
  data: Uint8Array;
}

/** Decodes an 8-bit non-interlaced PNG (RGBA, RGB, grey, grey + alpha: Blender's writer) to RGBA. */
export function decodePng(buf: Uint8Array, inflate: (b: Uint8Array) => Uint8Array): Rgba {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  const idat: Uint8Array[] = [];
  while (off < buf.length) {
    const len = dv.getUint32(off);
    const tag = String.fromCharCode(buf[off + 4]!, buf[off + 5]!, buf[off + 6]!, buf[off + 7]!);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (tag === 'IHDR') {
      const h = new DataView(body.buffer, body.byteOffset, body.byteLength);
      width = h.getUint32(0);
      height = h.getUint32(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error('PNG: only 8-bit, non-interlaced');
      type = body[9]!;
    } else if (tag === 'IDAT') idat.push(body);
    else if (tag === 'IEND') break;
    off += 12 + len;
  }
  const ch = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[type];
  if (!ch) throw new Error(`PNG: colour type ${type} not supported`);
  const z = new Uint8Array(idat.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of idat) { z.set(b, p); p += b.length; }
  const raw = inflate(z);
  const stride = width * ch;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[row + x - ch]! : 0;
      const b = y > 0 ? px[row - stride + x]! : 0;
      const c = x >= ch && y > 0 ? px[row - stride + x - ch]! : 0;
      let v = src[x]!;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[row + x] = v & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * ch;
    if (ch === 4) data.set(px.subarray(s, s + 4), i * 4);
    else if (ch === 3) { data.set(px.subarray(s, s + 3), i * 4); data[i * 4 + 3] = 255; }
    else {
      data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[s]!;
      data[i * 4 + 3] = ch === 2 ? px[s + 1]! : 255;
    }
  }
  return { width, height, data };
}

/** Tolerance radius (px) and luminance step (0-1) of a new-dark pixel (A76). */
export const DARK_RADIUS = 3;
export const DARK_DIFF = 0.2;

export interface DarkPatch {
  /** New-dark pixels in the view. */
  px: number;
  /** The largest 8-connected patch of them (px) and its top-left pixel. */
  largest: number;
  at: [number, number];
}

/** Luminance 0-1 per pixel, -1 where the figure does not cover it (alpha under 250). */
function luminance(im: Rgba): Float32Array {
  const out = new Float32Array(im.width * im.height);
  for (let i = 0; i < out.length; i++) {
    const d = im.data;
    out[i] = d[i * 4 + 3]! < 250 ? -1 : (0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]!) / 255;
  }
  return out;
}

/** New-dark pixels of `lod` against `hero` (same camera and size) and their largest connected patch. */
export function darkPatches(hero: Rgba, lod: Rgba, radius = DARK_RADIUS, diff = DARK_DIFF): DarkPatch {
  if (hero.width !== lod.width || hero.height !== lod.height) throw new Error('darkPatches: sizes differ');
  const w = hero.width;
  const h = hero.height;
  const hl = luminance(hero);
  const ll = luminance(lod);
  const mask = new Uint8Array(w * h);
  let px = 0;
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      const v = ll[y * w + x]!;
      if (v < 0) continue;
      let min = 2;
      let covered = true;
      for (let dy = -radius; dy <= radius && covered; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const q = hl[(y + dy) * w + x + dx]!;
          if (q < 0) { covered = false; break; }
          if (q < min) min = q;
        }
      }
      if (covered && v < min - diff) { mask[y * w + x] = 1; px++; }
    }
  }
  let largest = 0;
  let at: [number, number] = [0, 0];
  const stack: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1) continue;
    mask[i] = 2;
    stack.push(i);
    let n = 0;
    let x0 = w;
    let y0 = h;
    while (stack.length) {
      const j = stack.pop()!;
      n++;
      const x = j % w;
      const y = (j - x) / w;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (mask[k] === 1) { mask[k] = 2; stack.push(k); }
        }
      }
    }
    if (n > largest) { largest = n; at = [x0, y0]; }
  }
  return { px, largest, at };
}
