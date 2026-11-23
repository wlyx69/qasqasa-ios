/* قصقصه — ZIP without compression (video is already compressed). Files are referenced, not copied, so memory stays flat.
   Names are UTF-8 (flag bit 11) plus the Info-ZIP Unicode Path field, so Arabic names open right on Windows. */
'use strict';
(function () {
  const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crcUpdate(crc, bytes) { let c = crc; for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return c; }
  async function crc32OfBlob(blob, onBytes) {
    let c = 0xFFFFFFFF;
    const reader = blob.stream().getReader();
    for (;;) { const { done, value } = await reader.read(); if (done) break; c = crcUpdate(c, value); if (onBytes) onBytes(value.length); }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  const crc32OfBytes = (b) => (crcUpdate(0xFFFFFFFF, b) ^ 0xFFFFFFFF) >>> 0;

  function dosTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  /** files: [File]. Returns a Blob (application/zip). Throws 'too-big' past 4 GB (no ZIP64 here). */
  async function makeZip(files, onProgress) {
    const enc = new TextEncoder();
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > 0xFFFFFFFF - 1e6 || files.length > 0xFFFF) throw new Error('too-big');
    const now = dosTime(new Date());
    const parts = []; const central = []; let offset = 0; let done = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = await crc32OfBlob(f, (n) => { done += n; if (onProgress) onProgress(done / (total || 1)); });
      // Info-ZIP Unicode Path extra field (0x7075): version 1, CRC of the header name, UTF-8 name
      const extra = new Uint8Array(4 + 5 + name.length); const ev = new DataView(extra.buffer);
      ev.setUint16(0, 0x7075, true); ev.setUint16(2, 5 + name.length, true); extra[4] = 1; ev.setUint32(5, crc32OfBytes(name), true); extra.set(name, 9);
      const lh = new Uint8Array(30 + name.length + extra.length); const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 10, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
      lv.setUint16(10, now.time, true); lv.setUint16(12, now.date, true); lv.setUint32(14, crc, true);
      lv.setUint32(18, f.size, true); lv.setUint32(22, f.size, true); lv.setUint16(26, name.length, true); lv.setUint16(28, extra.length, true);
      lh.set(name, 30); lh.set(extra, 30 + name.length);
      const ch = new Uint8Array(46 + name.length + extra.length); const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 0x0314, true); cv.setUint16(6, 10, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
      cv.setUint16(12, now.time, true); cv.setUint16(14, now.date, true); cv.setUint32(16, crc, true); cv.setUint32(20, f.size, true); cv.setUint32(24, f.size, true);
      cv.setUint16(28, name.length, true); cv.setUint16(30, extra.length, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
      cv.setUint32(38, (0o100644 << 16) >>> 0, true); cv.setUint32(42, offset, true);
      ch.set(name, 46); ch.set(extra, 46 + name.length);
      parts.push(lh, f); central.push(ch);
      offset += lh.length + f.size;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const end = new Uint8Array(22); const dv = new DataView(end.buffer);
    dv.setUint32(0, 0x06054b50, true); dv.setUint16(8, files.length, true); dv.setUint16(10, files.length, true);
    dv.setUint32(12, cdSize, true); dv.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }

  window.QZip = { makeZip, crc32OfBlob };
})();
