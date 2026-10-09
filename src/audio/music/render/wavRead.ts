/** WAV reader for the offline stem render: PCM 16 / 24 / 32-bit and 32-bit float, any channel count. Pure. */
export interface WavData {
  rate: number;
  channels: Float32Array[];
}

export function readWav(bytes: Uint8Array): WavData {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number): string => String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let fmt = 0;
  let nch = 0;
  let rate = 0;
  let bits = 0;
  let o = 12;
  while (o + 8 <= bytes.length) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      fmt = v.getUint16(o + 8, true);
      nch = v.getUint16(o + 10, true);
      rate = v.getUint32(o + 12, true);
      bits = v.getUint16(o + 22, true);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first two bytes of the sub-format GUID
      if (fmt === 0xfffe && size >= 26) fmt = v.getUint16(o + 32, true);
    } else if (id === 'data') {
      if (!nch) throw new Error('data before fmt');
      const bps = bits / 8;
      const end = Math.min(bytes.length, o + 8 + size);
      const frames = Math.floor((end - o - 8) / (bps * nch));
      const channels = Array.from({ length: nch }, () => new Float32Array(frames));
      let p = o + 8;
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < nch; c++) {
          let x: number;
          if (fmt === 3 && bits === 32) x = v.getFloat32(p, true);
          else if (bits === 16) x = v.getInt16(p, true) / 32768;
          else if (bits === 24) x = ((bytes[p]! | (bytes[p + 1]! << 8) | (bytes[p + 2]! << 16)) << 8 >> 8) / 8388608;
          else if (bits === 32) x = v.getInt32(p, true) / 2147483648;
          else throw new Error(`unsupported WAV: format ${fmt}, ${bits} bits`);
          channels[c]![i] = x;
          p += bps;
        }
      }
      return { rate, channels };
    }
    o += 8 + size + (size & 1);
  }
  throw new Error('no data chunk');
}
