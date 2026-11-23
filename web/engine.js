// قصقصه — cutting engine (Mediabunny). Classic script: loaded by the worker (importScripts) or by the page.
// Times inside the engine are integer microseconds; Mediabunny speaks seconds.
'use strict';
(function () {
const {
  Input, BlobSource, ALL_FORMATS, QTFF, EncodedPacketSink, Output, Mp4OutputFormat, MovOutputFormat,
  BufferTarget, StreamTarget, EncodedVideoPacketSource, EncodedAudioPacketSource, Conversion, CanvasSink,
} = self.Mediabunny;

const US = 1e6;
const toUs = (s) => Math.round(s * US);

class CutCanceled extends Error { constructor() { super('canceled'); this.name = 'CutCanceled'; } }

function openInput(blob) {
  return new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
}

/** Everything the setup screen needs, read progressively (no full load). */
async function readMeta(input, size, onProgress) {
  const vt = await input.getPrimaryVideoTrack();
  const at = await input.getPrimaryAudioTrack();
  if (!vt) return { error: at ? 'audio-only' : 'no-video' };
  const format = await input.getFormat();
  const duration = toUs(await input.computeDuration());
  const first = toUs(await vt.getFirstTimestamp());
  const sink = new EncodedPacketSink(vt);
  // keyframes, in presentation order
  const keyframes = [];
  let p = await sink.getFirstKeyPacket({ metadataOnly: true });
  let n = 0;
  while (p) {
    keyframes.push(toUs(p.timestamp));
    n += 1;
    if (n % 64 === 0 && onProgress) onProgress(Math.min(0.99, p.timestamp / (duration / US || 1)));
    p = await sink.getNextKeyPacket(p, { metadataOnly: true });
  }
  keyframes.sort((a, b) => a - b);
  // frame rate and variable frame rate: look at real packet durations
  const durs = [];
  for await (const q of sink.packets(undefined, undefined, { metadataOnly: true })) {
    if (q.duration > 0) durs.push(q.duration);
    if (durs.length >= 240) break;
  }
  durs.sort((a, b) => a - b);
  const med = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  const stats = await vt.computePacketStats(300).catch(() => null);
  const fps = med ? 1 / med : (stats ? stats.averagePacketRate : 0);
  const vfr = durs.length > 20 && (durs[durs.length - 1] - durs[0]) / (med || 1) > 0.25;
  const hdr = await vt.hasHighDynamicRange().catch(() => false);
  const canDecode = typeof VideoDecoder !== 'undefined' ? await vt.canDecode().catch(() => false) : false;
  return {
    duration, first, keyframes,
    width: vt.displayWidth, height: vt.displayHeight, rotation: vt.rotation || 0,
    codec: vt.codec, fps: Math.round(fps * 100) / 100, vfr, hdr,
    hasAudio: !!at, audioCodec: at ? at.codec : null, canDecode,
    bitrate: stats ? Math.round(stats.averageBitrate) : null,
    mov: format === QTFF, container: format.name, size,
  };
}

function outputFormat(meta, toMp4) {
  return meta.mov && !toMp4 ? new MovOutputFormat({ fastStart: false }) : new Mp4OutputFormat({ fastStart: false });
}
const mimeFor = (meta, mode, toMp4) => (mode === 'fast' && meta.mov && !toMp4 ? 'video/quicktime' : 'video/mp4');
const extFor = (meta, mode, toMp4) => (mode === 'fast' && meta.mov && !toMp4 ? 'mov' : 'mp4');

/**
 * Fast: copy the encoded packets as they are (no re-encode, same quality).
 * Video from the key packet at `a` up to (not including) the key packet at `b`, in decode order.
 * Audio packets are shared out by their start time, so no audio is lost or repeated between parts.
 */
async function cutFast(input, meta, part, target, onProgress, isCanceled) {
  const vt = await input.getPrimaryVideoTrack();
  const at = meta.hasAudio ? await input.getPrimaryAudioTrack() : null;
  const output = new Output({ format: outputFormat(meta, part.toMp4), target });
  const vsrc = new EncodedVideoPacketSource(vt.codec);
  output.addVideoTrack(vsrc, { rotation: vt.rotation || 0 });
  let asrc = null;
  if (at) { asrc = new EncodedAudioPacketSource(at.codec); output.addAudioTrack(asrc); }
  await output.start();
  try {
    const A = part.a / US; const B = part.b / US;
    const toEnd = part.b >= meta.duration;
    const vs = new EncodedPacketSink(vt);
    let startKey = await vs.getKeyPacket(A + 1e-4);
    if (!startKey && part.first) startKey = await vs.getFirstKeyPacket(); // video may start a little after 0 (e.g. joined files)
    if (!startKey) throw new Error('no key packet at ' + A);
    const endKey = toEnd ? null : await vs.getKeyPacket(B + 1e-4);
    if (!toEnd && (!endKey || endKey.sequenceNumber <= startKey.sequenceNumber)) throw new Error('no key packet at ' + B);
    const off = startKey.timestamp;
    const vcfg = await vt.getDecoderConfig();
    // Open GOP (common in HEVC): pictures shown just before a keyframe are stored right after it.
    // Start: drop those "leading" pictures of our first keyframe (they need the previous part to decode).
    // End: keep the next keyframe's leading pictures (they belong before our end), plus that keyframe for
    // an instant as their reference, so no picture is lost between parts.
    async function* videoPackets() {
      for await (const pk of vs.packets(startKey, endKey || undefined)) {
        if (pk.sequenceNumber !== startKey.sequenceNumber && pk.timestamp < A - 1e-6) continue;
        yield { pk };
      }
      if (endKey) {
        const lead = []; let nx = await vs.getNextPacket(endKey);
        while (nx && nx.type !== 'key' && nx.timestamp < B - 1e-6 && lead.length < 120) { lead.push(nx); nx = await vs.getNextPacket(nx); }
        if (lead.length) { yield { pk: endKey, instant: true }; for (const q of lead) yield { pk: q }; }
      }
    }
    const vIt = videoPackets();
    let aIt = null; let acfg = null;
    if (at) {
      const as = new EncodedPacketSink(at);
      acfg = await at.getDecoderConfig();
      let ap;
      if (part.first) ap = await as.getFirstPacket();
      else {
        ap = await as.getPacket(A);
        if (ap && ap.timestamp < A - 1e-6) ap = await as.getNextPacket(ap);
        if (!ap) ap = null;
      }
      if (ap) aIt = as.packets(ap);
    }
    let v = await vIt.next();
    let au = aIt ? await aIt.next() : { done: true };
    let vFirst = true; let aFirst = true; let last = 0;
    const span = Math.max(1e-3, B - A);
    while (!v.done || !au.done) {
      if (isCanceled()) throw new CutCanceled();
      const takeAudio = !au.done && (v.done || au.value.timestamp < v.value.pk.timestamp);
      if (takeAudio) {
        const pk = au.value;
        if (!toEnd && pk.timestamp >= B - 1e-6) { au = { done: true }; await aIt.return(); continue; }
        await asrc.add(pk.clone({ timestamp: pk.timestamp - off }), aFirst ? { decoderConfig: acfg } : undefined);
        aFirst = false;
        au = await aIt.next();
      } else {
        const { pk, instant } = v.value;
        const out = instant ? pk.clone({ timestamp: pk.timestamp - off, duration: 1 / 1000 }) : pk.clone({ timestamp: pk.timestamp - off });
        await vsrc.add(out, vFirst ? { decoderConfig: vcfg } : undefined);
        vFirst = false;
        const f = Math.min(1, Math.max(0, (pk.timestamp - A) / span));
        if (f - last > 0.01) { last = f; onProgress(f); }
        v = await vIt.next();
      }
    }
    vsrc.close(); if (asrc) asrc.close();
    await output.finalize();
    onProgress(1);
  } catch (e) {
    await output.cancel().catch(() => {});
    throw e;
  }
}

function exactBitrate(meta) {
  const src = meta.bitrate || (meta.size * 8) / (meta.duration / US || 1);
  const factor = meta.codec === 'avc' ? 1.15 : 1.6;
  return Math.round(Math.min(50e6, Math.max(2e6, src * factor)));
}

/** Exact: re-encode the picture to H.264 from the exact frame; audio is copied when possible. */
async function cutExact(input, meta, part, target, onProgress, setCancel) {
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: false }), target });
  const conv = await Conversion.init({
    input, output,
    trim: { start: part.a / US, end: part.b / US },
    // «جودة عالية قريبة من الأصل»: follow the source bitrate (H.264 needs more bits than HEVC for the same look)
    video: { forceTranscode: true, codec: 'avc', bitrate: exactBitrate(meta) },
    tags: {},
    showWarnings: false,
  });
  if (!conv.isValid) {
    const why = conv.discardedTracks.map((d) => `${d.track.type}:${d.reason}`).join(', ');
    throw new Error('exact-unsupported ' + why);
  }
  conv.onProgress = (p) => onProgress(Math.min(1, p));
  setCancel(() => conv.cancel());
  try { await conv.execute(); } catch (e) {
    if (e && e.name === 'ConversionCanceledError') throw new CutCanceled();
    throw e;
  }
  onProgress(1);
}

/** Opens the written part again and measures it, so «جاهز» only shows for a file that really opens. */
async function verifyPart(blob) {
  const inp = openInput(blob);
  try {
    const vt = await inp.getPrimaryVideoTrack();
    if (!vt) throw new Error('no video in output');
    const first = await vt.getFirstTimestamp();
    const end = await vt.computeDuration();
    return { duration: toUs(end - Math.max(0, first)), start: toUs(first) };
  } finally { inp.dispose(); }
}

/** Where a part is written: the browser's private disk (OPFS) when the worker can use it, else memory. */
async function makeTarget(name, preferDisk) {
  if (preferDisk && typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('qasqasa-tmp', { create: true });
      const fh = await dir.getFileHandle(name, { create: true });
      if (fh.createSyncAccessHandle) {
        const h = await fh.createSyncAccessHandle();
        h.truncate(0);
        const ws = new WritableStream({ write(c) { h.write(c.data, { at: c.position }); } });
        return {
          kind: 'disk',
          target: new StreamTarget(ws, { chunked: true, chunkSize: 4 * 1024 * 1024 }),
          async done(type) { h.flush(); h.close(); const f = await fh.getFile(); return new File([f], name, { type }); },
          async abort() { try { h.close(); } catch (e) { /* already closed */ } await dir.removeEntry(name).catch(() => {}); },
        };
      }
    } catch (e) { /* fall back to memory */ }
  }
  const target = new BufferTarget();
  return {
    kind: 'memory', target,
    async done(type) { return new File([target.buffer], name, { type }); },
    async abort() {},
  };
}

async function clearTemp() {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry('qasqasa-tmp', { recursive: true });
  } catch (e) { /* nothing to clear */ }
}

/** Small pictures decoded from the nearest keyframe (works even where the system player refuses the file). */
async function* thumbs(input, timesUs, w, h) {
  const vt = await input.getPrimaryVideoTrack();
  if (!vt || typeof VideoDecoder === 'undefined') return;
  if (!(await vt.canDecode().catch(() => false))) return;
  const sink = new CanvasSink(vt, { width: w, height: h, fit: 'cover', poolSize: 0 });
  let i = 0;
  for await (const wc of sink.canvasesAtTimestamps(timesUs.map((t) => t / US))) {
    const t = timesUs[i]; i += 1;
    if (!wc) continue;
    const c = wc.canvas;
    const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/jpeg', quality: 0.78 })
      : await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.78));
    if (blob) yield { t, blob };
  }
}

self.QCore = { CutCanceled, openInput, readMeta, mimeFor, extFor, cutFast, cutExact, verifyPart, makeTarget, clearTemp, thumbs };
})();
