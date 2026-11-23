// قصقصه — worker (classic): reads and cuts off the page thread, so the screen stays smooth.
importScripts('vendor/mediabunny.js', 'engine.js');
const E = self.QCore;

let input = null; let inputFile = null; let meta = null;
let canceled = false; let cancelFn = null; let current = null;

function getInput(file) {
  if (input && inputFile === file) return input;
  if (input) input.dispose();
  input = E.openInput(file); inputFile = file; meta = null;
  return input;
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'ping') { self.postMessage({ type: 'pong', opfs: !!(self.navigator.storage && self.navigator.storage.getDirectory), webcodecs: typeof VideoEncoder !== 'undefined' }); return; }
    if (m.type === 'read') {
      const inp = getInput(m.file);
      meta = await E.readMeta(inp, m.file.size, (p) => self.postMessage({ type: 'read-progress', p }));
      self.postMessage({ type: 'meta', meta });
      return;
    }
    if (m.type === 'clear') { await E.clearTemp(); self.postMessage({ type: 'cleared' }); return; }
    if (m.type === 'thumbs') {
      try { for await (const r of E.thumbs(getInput(m.file), m.times, m.w, m.h)) self.postMessage({ type: 'thumb', id: m.id, t: r.t, blob: r.blob }); } catch (err) { /* best effort */ }
      self.postMessage({ type: 'thumbs-done', id: m.id });
      return;
    }
    if (m.type === 'stop') { canceled = true; if (cancelFn) cancelFn(); return; }
    if (m.type === 'cut') {
      canceled = false;
      const inp = getInput(m.file);
      if (m.meta) meta = m.meta; else if (!meta) meta = await E.readMeta(inp, m.file.size);
      const part = m.part;
      const t = await E.makeTarget(part.name, true);
      current = t;
      const progress = (p) => self.postMessage({ type: 'progress', k: part.k, p });
      try {
        if (m.mode === 'exact') await E.cutExact(inp, meta, part, t.target, progress, (fn) => { cancelFn = fn; });
        else await E.cutFast(inp, meta, part, t.target, progress, () => canceled);
        const file = await t.done(E.mimeFor(meta, m.mode, part.toMp4));
        const check = await E.verifyPart(file);
        self.postMessage({ type: 'part', k: part.k, file, check, store: t.kind });
      } catch (err) {
        await t.abort();
        if (err && err.name === 'CutCanceled') self.postMessage({ type: 'stopped', k: part.k });
        else self.postMessage({ type: 'failed', k: part.k, message: String(err && err.message || err) });
      } finally { cancelFn = null; current = null; }
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err), op: m.type });
  }
};
