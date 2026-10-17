/** 16-bit PCM WAV encoder for the lab's export (stereo or mono, little-endian). Pure. */
export function encodeWav(channels: Float32Array[], rate: number): Uint8Array {
  const nch = channels.length;
  const n = channels[0]?.length ?? 0;
  const dataBytes = n * nch * 2;
  const out = new Uint8Array(44 + dataBytes);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nch, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * nch * 2, true);
  v.setUint16(32, nch * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, dataBytes, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}

/** Peak and RMS of a set of channels, in dBFS. */
export function levels(channels: Float32Array[]): { peakDb: number; rmsDb: number } {
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const a = ch[i]!;
      const m = a < 0 ? -a : a;
      if (m > peak) peak = m;
      sum += a * a;
    }
    count += ch.length;
  }
  const db = (x: number): number => (x > 1e-9 ? 20 * Math.log10(x) : -180);
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, count))) };
}
