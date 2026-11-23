/* قصقصه — talks to the cutting engine: a worker when the device allows it, otherwise the page itself. Same messages both ways. */
'use strict';
(function () {
  let mode = null; let worker = null; let pageEngine = null; let starting = null;
  const handlers = new Set();
  const emit = (m) => handlers.forEach((fn) => { try { fn(m); } catch (e) { console.error(e); } });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script'); el.src = src;
      el.onload = resolve; el.onerror = () => reject(new Error('load ' + src));
      document.head.appendChild(el);
    });
  }
  function tryWorker() {
    return new Promise((resolve) => {
      let w;
      try { w = new Worker('cut-worker.js'); } catch (e) { resolve(null); return; }
      const to = setTimeout(() => { try { w.terminate(); } catch (e) { /* ignore */ } resolve(null); }, 6000);
      w.onmessage = (e) => { if (e.data && e.data.type === 'pong') { clearTimeout(to); resolve({ w, info: e.data }); } };
      w.onerror = () => { clearTimeout(to); try { w.terminate(); } catch (e) { /* ignore */ } resolve(null); };
      w.postMessage({ type: 'ping' });
    });
  }

  // Page fallback: same protocol as cut-worker.js, run here.
  function makePageEngine(E) {
    let input = null; let inputFile = null; let meta = null; let canceled = false; let cancelFn = null;
    const getInput = (file) => { if (input && inputFile === file) return input; if (input) input.dispose(); input = E.openInput(file); inputFile = file; meta = null; return input; };
    return {
      async post(m) {
        try {
          if (m.type === 'read') {
            const inp = getInput(m.file);
            meta = await E.readMeta(inp, m.file.size, (p) => emit({ type: 'read-progress', p }));
            emit({ type: 'meta', meta }); return;
          }
          if (m.type === 'clear') { await E.clearTemp(); emit({ type: 'cleared' }); return; }
          if (m.type === 'thumbs') {
            try { for await (const r of E.thumbs(getInput(m.file), m.times, m.w, m.h)) emit({ type: 'thumb', id: m.id, t: r.t, blob: r.blob }); } catch (err) { /* best effort */ }
            emit({ type: 'thumbs-done', id: m.id }); return;
          }
          if (m.type === 'stop') { canceled = true; if (cancelFn) cancelFn(); return; }
          if (m.type === 'cut') {
            canceled = false;
            const inp = getInput(m.file);
            if (m.meta) meta = m.meta; else if (!meta) meta = await E.readMeta(inp, m.file.size);
            const part = m.part; const t = await E.makeTarget(part.name, false);
            const progress = (p) => emit({ type: 'progress', k: part.k, p });
            try {
              if (m.mode === 'exact') await E.cutExact(inp, meta, part, t.target, progress, (fn) => { cancelFn = fn; });
              else await E.cutFast(inp, meta, part, t.target, progress, () => canceled);
              const file = await t.done(E.mimeFor(meta, m.mode, part.toMp4));
              const check = await E.verifyPart(file);
              emit({ type: 'part', k: part.k, file, check, store: t.kind });
            } catch (err) {
              await t.abort();
              if (err && err.name === 'CutCanceled') emit({ type: 'stopped', k: part.k });
              else emit({ type: 'failed', k: part.k, message: String((err && err.message) || err) });
            } finally { cancelFn = null; }
          }
        } catch (err) { emit({ type: 'error', message: String((err && err.message) || err), op: m.type }); }
      },
    };
  }

  async function start() {
    if (mode) return mode;
    if (starting) return starting;
    starting = (async () => {
      const r = await tryWorker();
      if (r) {
        worker = r.w; mode = 'worker';
        worker.onmessage = (e) => emit(e.data);
        worker.onerror = (e) => emit({ type: 'error', message: (e && e.message) || 'worker error', op: 'worker' });
        return mode;
      }
      await loadScript('vendor/mediabunny.js'); await loadScript('engine.js');
      pageEngine = makePageEngine(window.QCore); mode = 'page';
      return mode;
    })();
    return starting;
  }

  async function send(m) {
    await start();
    if (mode === 'worker') worker.postMessage(m); else pageEngine.post(m);
  }

  /** Sends a message and resolves with the first reply that `done(reply)` accepts; other replies go to `onEvent`. */
  function request(m, done, onEvent) {
    return new Promise((resolve) => {
      const h = (r) => { if (done(r)) { handlers.delete(h); resolve(r); } else if (onEvent) onEvent(r); };
      handlers.add(h);
      send(m).catch((e) => { handlers.delete(h); resolve({ type: 'error', message: String(e) }); });
    });
  }

  window.QEngine = {
    start, send, request,
    get mode() { return mode; },
    get workerFailed() { return mode === 'page'; },
    on(fn) { handlers.add(fn); return () => handlers.delete(fn); },
  };
})();
