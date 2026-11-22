/* قصقصه — stage 1 shell: every screen and interaction, demo data, no real cutting yet. */
'use strict';
(function () {
  const VERSION = '0.1.0';
  const STAGE = 'المرحلة 1: الشكل';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = !!(window.webkit && window.webkit.messageHandlers);
  const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  const icon = (id, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- time & size ----------
  function fmt(ms) { // summary: m:ss or h:mm:ss, rounded to the nearest second
    let s = Math.round(ms / 1000);
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  function fmt1(ms) { // detail: tenths of a second
    const t = Math.round(ms / 100);
    let s = Math.floor(t / 10); const d = t % 10;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}.${d}` : `${m}:${ss}.${d}`;
  }
  const fmtPart = (ms) => (ms % 1000 === 0 ? fmt(ms) : fmt1(ms));
  function countWord(n) { // Arabic counting for "part"
    if (n === 1) return 'جزء واحد';
    if (n === 2) return 'جزئين';
    if (n >= 3 && n <= 10) return `${n} أجزاء`;
    return `${n} جزء`;
  }
  const readyAdj = (n) => (n === 1 || n >= 11 ? 'جاهز' : 'جاهزة'); // «جزء واحد جاهز»، «4 أجزاء جاهزة»، «12 جزء جاهز»
  function eachLine(ps) { // "كل جزء 2:30" when equal, otherwise the range
    if (!ps.length) return '';
    const ds = ps.map((p) => p.d); const lo = Math.min(...ds); const hi = Math.max(...ds);
    if (hi - lo < 100) return `كل جزء <bdi class="num">${fmtPart(lo)}</bdi>`;
    const last = ds[ds.length - 1]; const rest = ds.slice(0, -1);
    if (rest.length && Math.max(...rest) - Math.min(...rest) < 100) return `كل جزء <bdi class="num">${fmtPart(rest[0])}</bdi>، والأخير <bdi class="num">${fmtPart(last)}</bdi>`;
    return `بين <bdi class="num">${fmtPart(lo)}</bdi> و<bdi class="num">${fmtPart(hi)}</bdi>`;
  }
  function fmtSize(b) {
    const mb = b / 1048576;
    if (mb >= 1024) return `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB`;
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  function parseTime(str) { // "1:45" "1:02:30" "95" -> ms
    const p = String(str).trim().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).split(':').map((x) => x.trim());
    if (!p.length || p.some((x) => x === '' || isNaN(Number(x)))) return null;
    let sec = 0;
    for (const x of p) sec = sec * 60 + Number(x);
    return Math.round(sec * 1000);
  }
  const limitLabel = (s) => (s <= 90 ? `${s} ث` : fmt(s * 1000));

  // ---------- static data ----------
  const PLATFORMS = [
    { id: 'wa', name: 'حالة واتساب', icon: 'whatsapp', limit: 60 },
    { id: 'reels', name: 'ريلز إنستقرام', icon: 'instagram', limit: 180 },
    { id: 'shorts', name: 'شورتس يوتيوب', icon: 'youtube', limit: 180 },
    { id: 'tiktok', name: 'تيك توك', icon: 'tiktok', limit: 600 },
    { id: 'snap', name: 'سناب شات', icon: 'snapchat', limit: 180 },
    { id: 'x', name: 'إكس (حساب مجاني)', icon: 'xlogo', limit: 140 },
  ];
  const MODES = [
    { id: 'equal', name: 'بالتساوي', icon: 'equal' },
    { id: 'duration', name: 'بالمدة', icon: 'timer' },
    { id: 'platform', name: 'للمنصة', icon: 'platform' },
    { id: 'manual', name: 'يدوي', icon: 'manual' },
    { id: 'more', name: 'المزيد', icon: 'more' },
  ];
  const MORE = [
    ['بالحجم', 'أكبر حجم لكل جزء، مثل 64 أو 100 MB'],
    ['بالفصول', 'من أوقات وعناوين تلصقها مثل وصف يوتيوب'],
    ['بالنسب', 'مثل 1:2:1 أو نسب مئوية'],
    ['لا تقطع وسط الكلام', 'كل حد ينتقل لأقرب سكتة'],
    ['التداخل', 'كل جزء يبدأ قبل نهاية اللي قبله'],
    ['دفعة مقاطع', 'نفس القالب على أكثر من مقطع'],
    ['ملفات الصوت', 'MP3 وM4A وWAV'],
  ];
  const REST = {
    short: 'آخر جزء أقصر',
    merge: 'ادمج الباقي إذا أقصر من نص المدة',
    even: 'وزّع بالتساوي',
  };
  const DEFAULT_PATTERN = '{الاسم}_{رقم}-{العدد}';
  const MIN_PART = 1000;

  // ---------- state ----------
  const S = {
    subs: [], video: null,
    p: { mode: 'equal', equalN: 4, durM: 3, durS: 0, rest: 'short', plat: 'wa', fill: false },
    manual: [], trim: false, trimA: 0, trimB: 0,
    precision: store.get('qs_prec', 'fast'),
    custom: null, sel: null, excluded: new Set(), names: {},
    pending: null, t: 0, playing: false, segEnd: null,
    thumbs: new Map(), results: null,
  };
  const platLimit = (id) => { const o = store.get('qs_plat', {}); const p = PLATFORMS.find((x) => x.id === id); return (o[id] || p.limit); };

  // ---------- core math (integer milliseconds) ----------
  function range() {
    const v = S.video; if (!v) return { a: 0, D: 0 };
    return S.trim ? { a: S.trimA, D: S.trimB - S.trimA } : { a: 0, D: v.duration };
  }
  function idealBounds(p, a, D, manual) {
    const b = [a];
    if (p.mode === 'equal') {
      const n = Math.max(1, Math.min(p.equalN, maxN(D)));
      for (let i = 1; i < n; i++) b.push(a + Math.floor((i * D) / n));
    } else if (p.mode === 'duration' || (p.mode === 'platform' && p.fill)) {
      const L = p.mode === 'duration' ? (p.durM * 60 + p.durS) * 1000 : platLimit(p.plat) * 1000;
      if (L >= MIN_PART) {
        const n = Math.ceil(D / L);
        const rest = p.mode === 'duration' ? p.rest : 'short';
        if (rest === 'even') {
          for (let i = 1; i < n; i++) b.push(a + Math.floor((i * D) / n));
        } else {
          let cuts = [];
          for (let i = 1; i < n; i++) cuts.push(a + i * L);
          const last = D - (n - 1) * L;
          if (rest === 'merge' && n > 1 && last < L / 2) cuts = cuts.slice(0, -1);
          b.push(...cuts);
        }
      }
    } else if (p.mode === 'platform') {
      const L = platLimit(p.plat) * 1000;
      const n = Math.max(1, Math.ceil(D / L));
      for (let i = 1; i < n; i++) b.push(a + Math.floor((i * D) / n));
    } else if (p.mode === 'manual') {
      (manual || []).filter((t) => t > a + MIN_PART - 1 && t < a + D - MIN_PART + 1).sort((x, y) => x - y)
        .forEach((t) => { if (t - b[b.length - 1] >= MIN_PART) b.push(t); });
    }
    b.push(a + D);
    return b;
  }
  function snap(b, kf) { // fast mode: nearest keyframe, tie -> earlier; merge duplicates
    if (!kf) return b.slice();
    const out = [b[0]];
    for (let i = 1; i < b.length - 1; i++) {
      const lo = Math.floor(b[i] / kf) * kf; const hi = lo + kf;
      const s = (b[i] - lo) <= (hi - b[i]) ? lo : hi;
      if (s - out[out.length - 1] >= MIN_PART && b[b.length - 1] - s >= MIN_PART) out.push(s);
    }
    out.push(b[b.length - 1]);
    if (S.p.mode === 'platform') { // never exceed the platform limit after snapping
      const L = platLimit(S.p.plat) * 1000;
      for (let i = 1; i < out.length - 1; i++) {
        while (out[i] - out[i - 1] > L && out[i] - kf > out[i - 1] + MIN_PART) out[i] -= kf;
      }
    }
    return out;
  }
  function bounds() {
    if (S.custom) return S.custom.slice();
    const { a, D } = range();
    const ideal = idealBounds(S.p, a, D, S.manual);
    return S.precision === 'fast' ? snap(ideal, S.video && S.video.kf) : ideal;
  }
  function maxShift() {
    const { a, D } = range();
    const ideal = idealBounds(S.p, a, D, S.manual);
    const s = snap(ideal, S.video && S.video.kf);
    if (s.length !== ideal.length) return null;
    return Math.max(0, ...ideal.map((x, i) => Math.abs(x - s[i])));
  }
  function maxN(D) { return Math.max(1, Math.min(99, Math.floor(D / MIN_PART))); }
  function parts() {
    const b = bounds(); const out = [];
    for (let i = 0; i < b.length - 1; i++) out.push({ i, a: b[i], b: b[i + 1], d: b[i + 1] - b[i] });
    return out;
  }
  const activeParts = () => parts().filter((p) => !S.excluded.has(p.i));

  // ---------- generic UI helpers ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function openSheet(html, mount) {
    const wrap = $('#sheetWrap'); const sh = $('#sheet');
    sh.innerHTML = html; wrap.hidden = false;
    if (mount) mount(sh);
    const f = sh.querySelector('input'); if (f) setTimeout(() => f.focus(), 280);
  }
  function closeSheet() { $('#sheetWrap').hidden = true; $('#sheet').innerHTML = ''; }
  $('#sheetWrap').addEventListener('click', (e) => { if (e.target.id === 'sheetWrap') closeSheet(); });
  function confirmSheet(title, desc, yes, onYes, danger) {
    openSheet(`<h3>${title}</h3>${desc ? `<p class="s-desc">${desc}</p>` : ''}<div class="s-actions">
      <button class="btn ${danger ? 'danger arm' : 'primary'} block" data-yes type="button">${yes}</button>
      <button class="btn tonal block" data-no type="button">ارجع</button></div>`, (sh) => {
      sh.querySelector('[data-yes]').onclick = () => { closeSheet(); onYes(); };
      sh.querySelector('[data-no]').onclick = closeSheet;
    });
  }
  function twoTap(btn, labelEl, armText, action) { // "press again to confirm" inside the page, 3 seconds
    let armed = false; let timer = null; const orig = labelEl.textContent;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true; btn.classList.add('arm'); labelEl.textContent = armText;
        timer = setTimeout(() => { armed = false; btn.classList.remove('arm'); labelEl.textContent = orig; }, 3000);
        return;
      }
      clearTimeout(timer); armed = false; btn.classList.remove('arm'); labelEl.textContent = orig; action();
    });
  }

  // ---------- navigation ----------
  function setTab(id) {
    $$('.screen.tab').forEach((s) => s.classList.toggle('on', s.dataset.tab === id));
    $$('.tab-btn').forEach((b) => { const on = b.dataset.tab === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (id === 'templates') renderTemplates();
    if (id === 'history') renderHistory();
    if (id === 'cut') renderPickChips();
  }
  function updateTopbar() {
    const top = S.subs[S.subs.length - 1];
    const el = top && $('#sub-' + top);
    $('#brand').hidden = !!top;
    $('#tbTitle').hidden = !top;
    $('#tbTitle').textContent = el ? el.dataset.title : '';
    $('#backBtn').hidden = !top || !!(el && el.dataset.noback);
    $('#shell').classList.toggle('sub-open', !!top);
  }
  function openSub(id, opts = {}) {
    if (opts.replace && S.subs.length) {
      const old = S.subs.pop(); $('#sub-' + old).classList.remove('on');
    }
    S.subs.forEach((s) => $('#sub-' + s).classList.add('under'));
    S.subs.push(id);
    const el = $('#sub-' + id); el.scrollTop = 0; el.classList.remove('under'); el.classList.add('on');
    updateTopbar();
  }
  function closeSub() {
    const id = S.subs.pop(); if (!id) return;
    $('#sub-' + id).classList.remove('on');
    const top = S.subs[S.subs.length - 1]; if (top) $('#sub-' + top).classList.remove('under');
    updateTopbar();
  }
  function closeAllSubs() { while (S.subs.length) closeSub(); }
  $('#backBtn').addEventListener('click', () => {
    const top = S.subs[S.subs.length - 1];
    if (top === 'results' && !S.results.saved) {
      confirmSheet('فيه أجزاء ما حفظتها. أكيد تطلع؟', '', 'اطلع', () => { closeAllSubs(); }, true);
      return;
    }
    closeSub();
  });
  $$('.tab-btn').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- drawer & theme ----------
  function openDrawer(on) {
    $('#drawer').classList.toggle('on', on);
    $('#drawer').setAttribute('aria-hidden', !on);
    $('#menuBtn').setAttribute('aria-expanded', on);
    const sc = $('#scrim');
    if (on) { sc.hidden = false; requestAnimationFrame(() => sc.classList.add('on')); } else { sc.classList.remove('on'); setTimeout(() => { if (!$('#drawer').classList.contains('on')) sc.hidden = true; }, 230); }
  }
  $('#menuBtn').addEventListener('click', () => openDrawer(true));
  $('#drawerClose').addEventListener('click', () => openDrawer(false));
  $('#scrim').addEventListener('click', () => openDrawer(false));
  function applyTheme(v) {
    document.documentElement.setAttribute('data-theme', v);
    store.set('qs_theme_obj', v); try { localStorage.setItem('qs_theme', v); } catch (e) { /* ignore */ }
    $$('#themeSeg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === v));
  }
  $$('#themeSeg button').forEach((b) => b.addEventListener('click', () => applyTheme(b.dataset.v)));
  function applyFont(v) {
    document.documentElement.classList.toggle('big-text', v === 'big');
    try { localStorage.setItem('qs_fs', v); } catch (e) { /* ignore */ }
    $$('#fontSeg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.v === v));
    setTimeout(() => { if (S.video) positionTrack(); }, 30);
  }
  $$('#fontSeg button').forEach((b) => b.addEventListener('click', () => applyFont(b.dataset.v)));
  (function () { let v = 'normal'; try { v = localStorage.getItem('qs_fs') === 'big' ? 'big' : 'normal'; } catch (e) { /* ignore */ } applyFont(v); })();
  $$('.d-item[data-open]').forEach((b) => b.addEventListener('click', () => {
    openDrawer(false);
    const id = b.dataset.open;
    if (id === 'settings') renderSettings();
    if (id === 'about') renderAbout();
    setTimeout(() => openSub(id), 120);
  }));
  twoTap($('#clearBtn'), $('#clearBtn span'), 'متأكد؟ اضغط مرة ثانية', () => {
    ['qs_tpls', 'qs_hist', 'qs_hint', 'qs_plat', 'qs_pattern', 'qs_prec'].forEach(store.del);
    S.precision = 'fast'; renderPickChips(); renderTemplates(); renderHistory(); showHint();
    openDrawer(false); toast('انمسحت البيانات');
  });
  $('#appVersion').textContent = `الإصدار ${VERSION} · ${STAGE}`;

  // ---------- demo media (generated frames) ----------
  function frameURL(t, total, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const k = total ? t / total : 0; const hue = 150 - k * 70;
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, `hsl(${hue},45%,16%)`); grd.addColorStop(1, `hsl(${hue - 20},55%,32%)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(212,255,58,.85)';
    g.beginPath(); g.arc(w * (0.3 + 0.4 * k), h * 0.42, w * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(w * 0.12, h * 0.68, w * 0.76, h * 0.05); g.fillRect(w * 0.2, h * 0.76, w * 0.6, h * 0.04);
    if (w >= 200) {
      g.fillStyle = '#fff'; g.font = `700 ${Math.round(w * 0.12)}px system-ui, sans-serif`; g.textAlign = 'center';
      g.fillText(fmt(t), w / 2, h * 0.24);
    }
    return c.toDataURL('image/jpeg', 0.82);
  }
  function captureFrame(video, w, h) {
    try {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const vw = video.videoWidth; const vh = video.videoHeight; if (!vw || !vh) return null;
      const sc = Math.max(w / vw, h / vh); const dw = vw * sc; const dh = vh * sc;
      g.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return c.toDataURL('image/jpeg', 0.8);
    } catch (e) { return null; }
  }

  // ---------- pick ----------
  function showHint() { $('#iosHint').hidden = !(isIOS && !store.get('qs_hint', false)); }
  $('#hintClose').addEventListener('click', () => { store.set('qs_hint', true); showHint(); });
  $('#pickBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) readFile(f); });
  $('#demoBtn').addEventListener('click', () => readDemo());
  const dz = $('#dropZone');
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) readFile(f); });

  function myTemplates() { return store.get('qs_tpls', []); }
  function renderPickChips() {
    const box = $('#pickChips');
    const list = myTemplates().slice(0, 6);
    const pend = S.pending;
    const items = [];
    if (pend && !list.some((t) => t.id === pend.id)) items.push(pend);
    items.push(...list);
    if (!items.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = items.map((t) => `<button class="chip ${pend && pend.id === t.id ? 'on' : ''}" type="button" data-id="${esc(t.id)}" aria-pressed="${!!(pend && pend.id === t.id)}">${esc(t.name)}</button>`).join('');
    box.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      const t = items.find((x) => x.id === c.dataset.id);
      S.pending = S.pending && S.pending.id === t.id ? null : t;
      renderPickChips();
    }));
  }

  // ---------- reading ----------
  function show(state) {
    ['pick', 'reading', 'setup'].forEach((s) => { $('#st-' + s).hidden = s !== state; });
    $('#tab-cut').classList.toggle('setup-mode', state === 'setup');
    $('#tab-cut').scrollTop = 0;
  }
  function readDemo() {
    const v = { name: 'podcast.mp4', size: 412 * 1048576, duration: 600000, width: 1080, height: 1920, fps: 30, codec: 'HEVC', kf: 1000, demo: true };
    v.poster = frameURL(0, v.duration, 360, 640);
    startReading(v, (done) => {
      let p = 0; const bar = $('#readBar');
      const tick = () => { p += 18; bar.style.width = Math.min(p, 100) + '%'; if (p < 100) setTimeout(tick, 110); else done(); };
      tick();
    });
  }
  function readFile(file) {
    const url = URL.createObjectURL(file);
    const v = { name: file.name || 'مقطع', size: file.size, duration: 0, width: 0, height: 0, fps: null, codec: null, kf: null, demo: false, url };
    startReading(v, (done, fail) => {
      const probe = document.createElement('video');
      probe.muted = true; probe.playsInline = true; probe.preload = 'auto'; probe.src = url;
      $('#readBar').style.width = '35%';
      const to = setTimeout(() => fail('هالملف ما أقدر أقرأه. جرّب MP4 أو MOV.'), 15000);
      probe.addEventListener('error', () => { clearTimeout(to); fail('هالملف ما أقدر أقرأه. جرّب MP4 أو MOV.'); }, { once: true });
      probe.addEventListener('loadedmetadata', () => {
        v.duration = Math.round(probe.duration * 1000); v.width = probe.videoWidth; v.height = probe.videoHeight;
        $('#readBar').style.width = '70%';
        if (!isFinite(probe.duration) || v.duration < 2000) { clearTimeout(to); fail('المقطع قصير، ما يتقسم.'); return; }
        const grab = () => {
          v.poster = captureFrame(probe, 360, 640) || frameURL(0, v.duration, 360, 640);
          clearTimeout(to); $('#readBar').style.width = '100%'; setTimeout(done, 200);
        };
        probe.addEventListener('seeked', grab, { once: true });
        try { probe.currentTime = Math.min(0.1, probe.duration / 2); } catch (e) { grab(); }
      }, { once: true });
    });
  }
  function startReading(v, run) {
    show('reading');
    $('#readName').textContent = v.name;
    $('#readStatus').textContent = 'أقرأ المقطع…';
    $('#readBar').style.width = '0%';
    $('#readSummary').hidden = true; $('#readKf').hidden = true; $('#readBadges').innerHTML = '';
    $('#readPoster').removeAttribute('src');
    run(() => {
      $('#readPoster').src = v.poster;
      $('#readStatus').textContent = 'تمت القراءة';
      $('#readSummary').textContent = summaryLine(v); $('#readSummary').hidden = false;
      $('#readKf').textContent = v.kf ? `Keyframe كل ${v.kf / 1000} ث تقريبًا` : 'الترميز ومواقع الـ Keyframes تنقرا في النسخة 1';
      $('#readKf').hidden = false;
      $('#readBadges').innerHTML = v.demo ? '<span class="badge soon">مقطع تجريبي</span>' : '';
      setTimeout(() => loadVideo(v), 700);
    }, (msg) => { if (v.url) URL.revokeObjectURL(v.url); show('pick'); toast(msg); });
  }
  function summaryLine(v) {
    const bits = [fmt(v.duration), `${v.width}×${v.height}`];
    if (v.fps) bits.push(`${v.fps} fps`);
    bits.push(fmtSize(v.size));
    if (v.codec) bits.push(v.codec);
    return bits.join(' · ');
  }

  // ---------- setup ----------
  const video = $('#video');
  function loadVideo(v) {
    stopPlay();
    if (S.video && S.video.url && S.video.url !== v.url) URL.revokeObjectURL(S.video.url);
    S.video = v; S.custom = null; S.sel = null; S.excluded = new Set(); S.names = {}; S.manual = []; S.t = 0;
    S.trim = false; S.trimA = 0; S.trimB = v.duration; S.thumbs = new Map(); thumbQ.length = 0;
    S.precision = store.get('qs_prec', 'fast');
    if (S.pending) { applyParams(S.pending.p); toast(`انطبق القالب: ${S.pending.name}`); S.pending = null; renderPickChips(); }
    $('#infoName').textContent = v.name; $('#infoSummary').textContent = summaryLine(v);
    if (v.demo) { video.removeAttribute('src'); video.hidden = true; $('#poster').src = v.poster; $('#poster').hidden = false; } else { video.hidden = false; $('#poster').hidden = true; video.src = v.url; }
    $('#tlEnd').textContent = fmt(v.duration);
    $('#trimSwitch').setAttribute('aria-checked', 'false');
    show('setup'); resetTrack(); renderAll(); setTime(0);
    $('#setupScroll').scrollTop = 0;
  }
  function applyParams(p) {
    const q = Object.assign({}, p); if (q.precision) { S.precision = q.precision; } delete q.precision;
    Object.assign(S.p, q); S.custom = null; S.sel = null;
  }
  $('#changeBtn').addEventListener('click', () => { stopPlay(); show('pick'); renderPickChips(); });

  function renderAll() {
    renderModeChips($('#modeChips'), S.p, true);
    renderPanel($('#modePanel'), S.p, 'setup');
    renderTrack(); renderPrecision(); renderCTA();
  }
  function renderCTA() {
    const n = activeParts().length; const all = parts().length;
    const btn = $('#reviewBtn');
    if (all < 2) { btn.textContent = S.p.mode === 'manual' ? 'حط نقطة قص وحدة على الأقل' : 'ما يحتاج تقسيم'; btn.disabled = true; }
    else { btn.textContent = `راجع الأجزاء (${n})`; btn.disabled = n < 1; }
    tlMsg();
  }
  function tlMsg(b) {
    const msg = $('#tlMsg'); if (!msg || !S.video) return;
    b = b || bounds(); const n = b.length - 1;
    if (S.sel != null && b[S.sel] != null) { msg.textContent = `الحد ${S.sel} · ${fmt1(b[S.sel])}`; return; }
    msg.textContent = n > 1 ? countWord(n) + (S.custom ? ' · معدّلة بيدك' : '') : '';
  }
  function changed() { S.custom = null; S.sel = null; S.excluded = new Set(); renderPanel($('#modePanel'), S.p, 'setup'); renderTrack(); renderPrecision(); renderCTA(); }

  function renderModeChips(box, p, withMore) {
    box.innerHTML = MODES.filter((m) => withMore || (m.id !== 'more' && m.id !== 'manual')).map((m) =>
      `<button class="chip ${p.mode === m.id ? 'on' : ''}" type="button" role="radio" aria-checked="${p.mode === m.id}" data-m="${m.id}">${icon(m.icon)}${m.name}</button>`).join('');
    box.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      const m = c.dataset.m;
      if (m === 'more') { openMore(); return; }
      if (p.mode === m) return;
      p.mode = m;
      if (box.id === 'modeChips') { changed(); renderModeChips(box, p, true); } else { renderModeChips(box, p, false); renderPanel($('#tplPanel'), p, 'tpl'); }
    }));
  }
  function openMore() {
    openSheet(`<h3>أنماط النسخة 2</h3><p class="s-desc">هذي الأنماط جاية في النسخة 2، بعد ما نخلص الأساس.</p>${MORE.map(([n, s]) =>
      `<button class="s-item" type="button" disabled>${icon('sliders')}<span>${n}<br><small class="muted">${s}</small></span><span class="badge soon">النسخة 2</span></button>`).join('')}
      <div class="s-actions"><button class="btn tonal block" type="button" data-close>تمام</button></div>`, (sh) => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }

  // panels — ctx 'setup' uses the loaded video; ctx 'tpl' previews on a 10:00 example
  function renderPanel(box, p, ctx) {
    const D = ctx === 'setup' ? range().D : 600000;
    const a = ctx === 'setup' ? range().a : 0;
    const b = ctx === 'setup' ? bounds() : idealBounds(p, 0, D, []);
    const n = b.length - 1;
    const ps = []; for (let i = 0; i < n; i++) ps.push({ d: b[i + 1] - b[i] });
    const ex = ctx === 'tpl' ? '<p class="live-sub">مثال على مقطع 10:00</p>' : '';
    const one = (why) => `<p class="live">${why}</p><p class="live-sub">ما يحتاج تقسيم.</p>`;
    let h = '';
    if (p.mode === 'equal') {
      const mx = maxN(D); const each = D / Math.min(p.equalN, mx);
      h = `<div class="counter">
        <button class="cbtn" type="button" data-act="eq-dec" aria-label="أقل" ${p.equalN <= 2 ? 'disabled' : ''}>${icon('minus')}</button>
        <output class="cnum num" aria-live="polite">${Math.min(p.equalN, mx)}</output>
        <button class="cbtn" type="button" data-act="eq-inc" aria-label="أكثر" ${p.equalN >= mx ? 'disabled' : ''}>${icon('plus')}</button></div>
        <div class="quick">${[2, 3, 4, 5, 6, 8, 10].filter((k) => k <= mx).map((k) => `<button class="chip ${k === p.equalN ? 'on' : ''}" type="button" data-act="eq-set" data-n="${k}">${k}</button>`).join('')}</div>
        <p class="live">${ctx === 'setup' && S.custom ? 'حدود معدّلة بيدك' : eachLine(ps)}</p>${ex}`;
    } else if (p.mode === 'duration') {
      const L = (p.durM * 60 + p.durS) * 1000;
      const ex3 = durExamples(L, D);
      const last = n >= 1 ? b[b.length - 1] - b[b.length - 2] : 0;
      h = `<p class="field-label">مدة الجزء</p>
        <div class="dur-pick">
          <div class="dur-unit"><span class="lbl">دقائق</span><div class="row-c"><button class="cbtn" type="button" data-act="dm-dec" aria-label="دقيقة أقل">${icon('minus')}</button><span class="val num">${p.durM}</span><button class="cbtn" type="button" data-act="dm-inc" aria-label="دقيقة أكثر">${icon('plus')}</button></div></div>
          <span class="dur-colon">:</span>
          <div class="dur-unit"><span class="lbl">ثواني</span><div class="row-c"><button class="cbtn" type="button" data-act="ds-dec" aria-label="5 ثواني أقل">${icon('minus')}</button><span class="val num">${String(p.durS).padStart(2, '0')}</span><button class="cbtn" type="button" data-act="ds-inc" aria-label="5 ثواني أكثر">${icon('plus')}</button></div></div>
        </div>
        <div class="opts" role="radiogroup" aria-label="وش يصير بالباقي">${Object.keys(REST).map((k) =>
          `<button class="opt" type="button" role="radio" aria-checked="${p.rest === k}" data-act="rest" data-v="${k}"><span class="dot"></span><span><span class="o-title">${REST[k]}${k === 'short' ? ' (الافتراضي)' : ''}</span><br><span class="o-sub num">${ex3[k]}</span></span></button>`).join('')}</div>
        ${ctx === 'setup' && p.rest === 'short' && n > 1 && last < L / 2 ? `<div class="tip">${icon('info')}<span>آخر جزء <bdi class="num">${fmtPart(last)}</bdi> بس. توزعها بالتساوي؟</span><button class="btn sm primary" type="button" data-act="rest" data-v="even">وزّع</button></div>` : ''}
        ${n === 1 ? one('المقطع أقصر من مدة الجزء') : `<p class="live">${countWord(n)} · ${eachLine(ps)}</p>`}${ex}`;
    } else if (p.mode === 'platform') {
      const L = platLimit(p.plat) * 1000;
      const each = n ? (b[n] - b[0]) / n : 0;
      h = `<div class="plat-grid" role="radiogroup" aria-label="المنصة">${PLATFORMS.map((x) =>
          `<button class="plat" type="button" role="radio" aria-checked="${p.plat === x.id}" data-act="plat" data-v="${x.id}">${icon(x.icon)}<span><span class="p-name">${x.name}</span><br><span class="p-lim num">${limitLabel(platLimit(x.id))}</span></span></button>`).join('')}</div>
        <div class="inline-switch"><div><p class="row-title">املأ للحد</p><p class="muted xs">كل جزء = الحد بالضبط، والأخير الباقي</p></div>
          <button class="switch" type="button" role="switch" aria-checked="${p.fill}" aria-label="املأ للحد" data-act="fill"><i></i></button></div>
        ${n === 1 ? one(`المقطع داخل حد ${PLATFORMS.find((x) => x.id === p.plat).name}`) : `<p class="live">${countWord(n)} · ${eachLine(ps)}</p>`}${ex}`;
    } else if (p.mode === 'manual') {
      const pts = S.manual.slice().sort((x, y) => x - y);
      h = `<div class="manual-actions"><button class="btn primary" type="button" data-act="cut-here">${icon('scissors')}قص هنا <bdi class="num">${fmt1(S.t)}</bdi></button></div>
        <div class="time-add"><input class="input num" id="manTime" type="text" inputmode="decimal" placeholder="1:45" aria-label="اكتب الوقت"><button class="btn tonal" type="button" data-act="man-add">أضف</button></div>
        <div class="points">${pts.map((t) => `<button class="chip" type="button" data-act="man-del" data-t="${t}" aria-label="احذف ${fmt1(t)}"><bdi class="num">${fmt1(t)}</bdi>${icon('x', 'ic x')}</button>`).join('')}</div>
        ${pts.length ? `<p class="live">${countWord(n)}</p>` : '<p class="live-sub">شغّل المقطع ووقف عند أي لحظة واضغط «قص هنا»، أو اكتب الوقت.</p>'}`;
    }
    box.innerHTML = h;
    box.onclick = (e) => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const act = el.dataset.act; const mx = maxN(D);
      const redraw = () => { if (ctx === 'setup') changed(); else renderPanel(box, p, ctx); };
      if (act === 'eq-dec') { p.equalN = Math.max(2, Math.min(p.equalN, mx) - 1); redraw(); }
      if (act === 'eq-inc') { if (p.equalN >= mx) { toast(`أقصى عدد لهالمقطع ${mx} جزء.`); return; } p.equalN = Math.min(p.equalN, mx) + 1; redraw(); }
      if (act === 'eq-set') { p.equalN = Number(el.dataset.n); redraw(); }
      if (act === 'dm-dec') { p.durM = Math.max(0, p.durM - 1); if (p.durM === 0 && p.durS < 5) p.durS = 5; redraw(); }
      if (act === 'dm-inc') { p.durM = Math.min(59, p.durM + 1); redraw(); }
      if (act === 'ds-dec') { if (p.durS === 0) { if (p.durM > 0) { p.durM -= 1; p.durS = 55; } } else p.durS -= 5; if (p.durM === 0 && p.durS < 5) p.durS = 5; redraw(); }
      if (act === 'ds-inc') { p.durS += 5; if (p.durS >= 60) { p.durS = 0; p.durM = Math.min(59, p.durM + 1); } redraw(); }
      if (act === 'rest') { p.rest = el.dataset.v; redraw(); }
      if (act === 'plat') { p.plat = el.dataset.v; redraw(); }
      if (act === 'fill') { p.fill = !p.fill; redraw(); }
      if (act === 'cut-here') addManual(S.t);
      if (act === 'man-add') { const t = parseTime($('#manTime').value); if (t == null) { toast('اكتب الوقت مثل 1:45'); return; } addManual(t); }
      if (act === 'man-del') { S.manual = S.manual.filter((t) => t !== Number(el.dataset.t)); changed(); }
    };
    void a;
  }
  function durExamples(L, D) {
    const fmtList = (arr) => (arr.length > 5 ? `${arr.length} أجزاء، آخرها ${fmtPart(arr[arr.length - 1])}` : arr.map(fmtPart).join(' و'));
    if (L < MIN_PART) return { short: '', merge: '', even: '' };
    const n = Math.ceil(D / L);
    const short = Array.from({ length: n }, (_, i) => (i < n - 1 ? L : D - (n - 1) * L));
    let merge = short.slice();
    if (n > 1 && short[n - 1] < L / 2) { merge = short.slice(0, -1); merge[merge.length - 1] += short[n - 1]; }
    const evenD = Math.round(D / n);
    const even = n > 5 ? Array(n).fill(evenD) : Array(n).fill(evenD);
    return { short: fmtList(short), merge: fmtList(merge), even: n > 1 ? `${n} أجزاء × ${fmtPart(evenD)}` : fmtList(even) };
  }
  function addManual(t) {
    const { a, D } = range();
    if (t <= a + MIN_PART - 1 || t >= a + D - MIN_PART + 1) { toast('النقطة لازم تكون داخل المقطع، وبعيدة عن الطرفين ثانية على الأقل'); return; }
    if (S.manual.some((x) => Math.abs(x - t) < MIN_PART)) { toast('أقل مسافة بين نقطتين ثانية واحدة'); return; }
    let tt = Math.round(t);
    if (S.precision === 'fast' && S.video.kf) { tt = Math.round(tt / S.video.kf) * S.video.kf; toast(`انضبطت على ${fmt1(tt)}`); }
    S.manual.push(tt); changed();
  }

  // trim
  $('#trimSwitch').addEventListener('click', () => {
    S.trim = !S.trim; $('#trimSwitch').setAttribute('aria-checked', S.trim);
    if (S.trim) { const D = S.video.duration; S.trimA = Math.min(15000, Math.floor(D * 0.05)); S.trimB = D - Math.min(30000, Math.floor(D * 0.05)); }
    updateTrimNote(); changed();
  });
  function updateTrimNote() {
    $('#trimNote').innerHTML = S.trim ? `من <bdi class="num">${fmt1(S.trimA)}</bdi> إلى <bdi class="num">${fmt1(S.trimB)}</bdi> · يبقى <bdi class="num">${fmt1(S.trimB - S.trimA)}</bdi>` : 'شيل جزء من أول المقطع أو آخره قبل التقسيم';
  }

  // precision
  function renderPrecision() {
    $$('#precision .choice').forEach((c) => c.setAttribute('aria-checked', c.dataset.v === S.precision));
    const note = $('#precisionNote');
    if (S.precision === 'exact') { note.textContent = 'القص على الفريم بالضبط، وياخذ وقت أطول لأنه يعيد بناء الصورة.'; return; }
    if (!S.video || !S.video.kf) { note.textContent = 'مواقع الـ Keyframes تنقرا في النسخة 1، وبعدها يبان أكبر فرق متوقع.'; return; }
    const sh = maxShift();
    if (sh == null) { note.textContent = 'بعض الحدود انضمت لأن ما فيه Keyframe بينها.'; return; }
    note.innerHTML = sh === 0 ? 'كل الحدود واقعة على Keyframes، فما فيه أي فرق.' : `أكبر فرق متوقع <bdi class="num">${(sh / 1000).toFixed(1)}</bdi> ث${sh > 2000 ? '. تبي الدقيق؟' : ''}`;
  }
  $$('#precision .choice').forEach((c) => c.addEventListener('click', () => {
    if (S.precision === c.dataset.v) return;
    S.precision = c.dataset.v;
    const kf = S.video && S.video.kf;
    if (S.custom && S.precision === 'fast' && kf) {
      const b = S.custom.slice();
      for (let i = 1; i < b.length - 1; i++) b[i] = Math.round(b[i] / kf) * kf;
      S.custom = b.filter((t, i) => i === 0 || t - b[i - 1] >= MIN_PART || i === b.length - 1);
    }
    renderPanel($('#modePanel'), S.p, 'setup'); renderTrack(); renderPrecision(); renderCTA();
  }));

  // ---------- timeline ----------
  const track = $('#tlTrack');
  const TL = { segs: [], hds: [], dims: [], trims: [], ph: null };
  function resetTrack() { track.innerHTML = ''; TL.segs = []; TL.hds = []; TL.dims = []; TL.trims = []; TL.ph = null; }
  const pct = (ms) => (S.video ? (ms / S.video.duration) * 100 : 0);
  function renderTrack() {
    if (!S.video) return;
    const b = bounds(); const n = b.length - 1;
    // segments (pooled so splits/merges animate)
    while (TL.segs.length < n) {
      const el = document.createElement('div'); el.className = 'seg'; el.innerHTML = '<span class="num"></span>';
      const last = TL.segs[TL.segs.length - 1];
      el.style.left = last ? last.style.left : '0%'; el.style.width = '0%';
      track.appendChild(el); TL.segs.push(el);
    }
    while (TL.segs.length > n) { const el = TL.segs.pop(); el.style.width = '0%'; setTimeout(() => el.remove(), 260); }
    while (TL.hds.length < n - 1) {
      const el = document.createElement('div'); el.className = 'hd'; el.innerHTML = '<i></i><span class="hd-time num"></span>';
      el.setAttribute('role', 'slider'); el.tabIndex = 0;
      el.style.left = TL.hds.length ? TL.hds[TL.hds.length - 1].style.left : '100%';
      track.appendChild(el); TL.hds.push(el);
    }
    while (TL.hds.length > n - 1) { const el = TL.hds.pop(); el.remove(); }
    // trim
    TL.dims.forEach((e) => e.remove()); TL.trims.forEach((e) => e.remove()); TL.dims = []; TL.trims = [];
    if (S.trim) {
      const d1 = document.createElement('div'); d1.className = 'trim-dim'; d1.style.left = '0'; d1.style.width = pct(S.trimA) + '%';
      const d2 = document.createElement('div'); d2.className = 'trim-dim'; d2.style.left = pct(S.trimB) + '%'; d2.style.right = '0';
      const t1 = document.createElement('div'); t1.className = 'trim-hd'; t1.dataset.k = 'a'; t1.style.left = pct(S.trimA) + '%'; t1.innerHTML = '<i></i>';
      const t2 = document.createElement('div'); t2.className = 'trim-hd'; t2.dataset.k = 'b'; t2.style.left = pct(S.trimB) + '%'; t2.innerHTML = '<i></i>';
      t1.setAttribute('aria-label', 'بداية المدى'); t2.setAttribute('aria-label', 'نهاية المدى');
      [d1, d2, t1, t2].forEach((e) => track.appendChild(e)); TL.dims = [d1, d2]; TL.trims = [t1, t2];
    }
    if (!TL.ph) { TL.ph = document.createElement('div'); TL.ph.className = 'playhead'; track.appendChild(TL.ph); }
    requestAnimationFrame(() => requestAnimationFrame(() => positionTrack(b)));
    renderNudge();
  }
  function positionTrack(b) {
    b = b || bounds();
    const w = track.clientWidth || 1;
    const big = document.documentElement.classList.contains('big-text') ? 1.2 : 1;
    const segPx = [];
    TL.segs.forEach((el, i) => {
      if (b[i + 1] == null) return;
      el.style.left = `calc(${pct(b[i])}% + 1px)`;
      el.style.width = `calc(${pct(b[i + 1] - b[i])}% - 2px)`;
      el.classList.toggle('a', i % 2 === 0); el.classList.toggle('b', i % 2 === 1);
      el.classList.toggle('excluded', S.excluded.has(i));
      el.dataset.i = i;
      const px = (pct(b[i + 1] - b[i]) / 100) * w; segPx[i] = px;
      el.firstChild.textContent = px >= (TL.segs.length >= 10 ? 30 : 22) * big ? String(i + 1) : ''; // one rule for all, so numbering never stops half way
      el.setAttribute('aria-label', `الجزء ${i + 1}: من ${fmt1(b[i])} إلى ${fmt1(b[i + 1])}`);
    });
    TL.hds.forEach((el, i) => {
      const t = b[i + 1];
      el.style.left = pct(t) + '%'; el.dataset.i = i + 1;
      el.classList.toggle('sel', S.sel === i + 1);
      el.classList.toggle('thin', Math.min(segPx[i] || 99, segPx[i + 1] || 99) < 34);
      el.querySelector('.hd-time').textContent = fmt1(t);
      el.setAttribute('aria-label', `حد القص ${i + 1}`); el.setAttribute('aria-valuetext', fmt1(t));
    });
    if (TL.ph) TL.ph.style.left = pct(S.t) + '%';
    tlMsg(b);
  }
  function renderNudge() {
    const box = $('#nudge');
    if (S.sel == null) { box.hidden = true; return; }
    const kf = S.precision === 'fast' && S.video.kf;
    const fr = 1000 / (S.video.fps || 30);
    const btns = kf ? [['Keyframe قبل', -kf], ['Keyframe بعد', kf]] : [['ثانية قبل', -1000], ['فريم قبل', -fr], ['فريم بعد', fr], ['ثانية بعد', 1000]];
    box.innerHTML = btns.map(([l, d]) => `<button type="button" data-d="${d}">${l}</button>`).join('') + `<button type="button" data-done aria-label="خلاص">${icon('check')}</button>`;
    box.hidden = false;
    box.querySelectorAll('button').forEach((x) => x.addEventListener('click', () => {
      if (x.hasAttribute('data-done')) { S.sel = null; renderNudge(); positionTrack(); return; }
      moveBound(S.sel, bounds()[S.sel] + Number(x.dataset.d));
    }));
  }
  function moveBound(i, t) {
    const b = bounds();
    const lo = b[i - 1] + MIN_PART; const hi = b[i + 1] - MIN_PART;
    if (S.precision === 'fast' && S.video.kf) t = Math.round(t / S.video.kf) * S.video.kf;
    t = Math.round(Math.max(lo, Math.min(hi, t)));
    b[i] = t; S.custom = b;
    positionTrack(b); renderCTA();
    if (S.p.mode === 'equal') $('#modePanel .live').innerHTML = 'حدود معدّلة بيدك';
  }
  const xToMs = (x) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)) * S.video.duration; };
  let drag = null; let lastHandleUp = 0;
  function nearestHandle(x) {
    const r = track.getBoundingClientRect(); if (!r.width) return null;
    const at = (ms) => r.left + (pct(ms) / 100) * r.width;
    let best = null; let bd = 23; // 44px touch target, shared fairly when handles crowd
    if (S.trim) [['a', S.trimA, 0], ['b', S.trimB, 1]].forEach(([k, ms, j]) => { const d = Math.abs(x - at(ms)); if (d < bd) { bd = d; best = { trim: true, k, el: TL.trims[j] }; } });
    const b = bounds();
    for (let i = 1; i < b.length - 1; i++) { const d = Math.abs(x - at(b[i])); if (d < bd) { bd = d; best = { trim: false, i, el: TL.hds[i - 1] }; } }
    return best && best.el ? best : null;
  }
  track.addEventListener('pointerdown', (e) => {
    if (!S.video) return;
    const h = nearestHandle(e.clientX);
    if (!h) return;
    e.preventDefault();
    try { track.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    drag = { el: h.el, trim: h.trim, k: h.k, i: h.i, x: e.clientX, moved: false };
  });
  track.addEventListener('keydown', (e) => {
    const hd = e.target.closest('.hd'); if (!hd || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    const i = Number(hd.dataset.i); const kf = S.precision === 'fast' && S.video.kf;
    const step = kf || (e.shiftKey ? 1000 : 1000 / (S.video.fps || 30));
    S.sel = i; moveBound(i, bounds()[i] + (e.key === 'ArrowRight' ? step : -step)); renderNudge();
  });
  track.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) < 5) return;
    drag.moved = true; drag.el.classList.add('drag');
    const t = xToMs(e.clientX);
    if (drag.trim) {
      if (drag.k === 'a') S.trimA = Math.round(Math.max(0, Math.min(t, S.trimB - 2000))); else S.trimB = Math.round(Math.min(S.video.duration, Math.max(t, S.trimA + 2000)));
      drag.el.style.left = pct(drag.k === 'a' ? S.trimA : S.trimB) + '%';
      TL.dims[0].style.width = pct(S.trimA) + '%'; TL.dims[1].style.left = pct(S.trimB) + '%';
      updateTrimNote();
    } else { S.sel = drag.i; moveBound(drag.i, t); }
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null; d.el.classList.remove('drag'); lastHandleUp = performance.now();
    if (d.trim) { if (d.moved) changed(); return; }
    if (!d.moved) S.sel = S.sel === d.i ? null : d.i;
    positionTrack(); renderNudge();
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('click', (e) => {
    if (performance.now() - lastHandleUp < 350) return;
    const seg = e.target.closest('.seg'); if (!seg || seg.dataset.i == null) return;
    const p = parts()[Number(seg.dataset.i)]; if (!p) return;
    S.sel = null; renderNudge(); playSegment(p);
  });
  window.addEventListener('resize', () => positionTrack());

  // ---------- player (real file: <video>; demo: simulated clock) ----------
  let clock = null;
  function setTime(ms) {
    S.t = Math.max(0, Math.min(S.video.duration, ms));
    $('#pTime').textContent = `${fmt(S.t)} / ${fmt(S.video.duration)}`;
    if (TL.ph) TL.ph.style.left = pct(S.t) + '%';
    if (S.video.demo && !$('#poster').hidden) { /* poster updates are throttled */ }
    const cut = $('#modePanel [data-act="cut-here"] bdi'); if (cut) cut.textContent = fmt1(S.t);
    if (S.segEnd != null && S.t >= S.segEnd) { stopPlay(); S.segEnd = null; }
  }
  function startPlay() {
    if (!S.video) return;
    S.playing = true; $('#playBtn').innerHTML = icon('pause'); $('#playBtn').setAttribute('aria-label', 'إيقاف مؤقت');
    if (S.video.demo) {
      let last = performance.now(); let lastPoster = 0;
      clearInterval(clock);
      clock = setInterval(() => {
        const now = performance.now(); setTime(S.t + (now - last)); last = now;
        if (now - lastPoster > 1000) { $('#poster').src = frameURL(S.t, S.video.duration, 360, 640); lastPoster = now; }
        if (S.t >= S.video.duration) stopPlay();
      }, 100);
    } else { video.play().catch(() => stopPlay()); }
  }
  function stopPlay() {
    S.playing = false; clearInterval(clock); clock = null;
    if (!video.paused) video.pause();
    $('#playBtn').innerHTML = icon('play'); $('#playBtn').setAttribute('aria-label', 'تشغيل');
    TL.segs.forEach((s) => s.classList.remove('playing'));
  }
  function playSegment(p) {
    stopPlay(); S.segEnd = p.b;
    if (S.video.demo) setTime(p.a); else video.currentTime = p.a / 1000;
    TL.segs.forEach((s, i) => s.classList.toggle('playing', i === p.i));
    startPlay();
  }
  $('#playBtn').addEventListener('click', () => (S.playing ? stopPlay() : (S.segEnd = null, startPlay())));
  video.addEventListener('timeupdate', () => setTime(video.currentTime * 1000));
  video.addEventListener('ended', stopPlay);

  // ---------- review ----------
  function baseName() { return (S.video.name || 'clip').replace(/\.[^.]+$/, ''); }
  function partName(p, idx, count) {
    const pat = store.get('qs_pattern', DEFAULT_PATTERN);
    const w = Math.max(2, String(count).length);
    const title = (S.names[p.i] || '').trim();
    let name = pat.replace(/\{الاسم\}/g, baseName()).replace(/\{رقم\}/g, String(idx + 1).padStart(w, '0'))
      .replace(/\{العدد\}/g, String(count).padStart(w, '0')).replace(/\{البداية\}/g, fmt(p.a).replace(/:/g, '-'));
    if (/\{العنوان\}/.test(name)) name = title ? name.replace(/\{العنوان\}/g, title) : name.replace(/[ _-]?\{العنوان\}/g, '');
    else if (title) name += `_${title}`;
    name = name.replace(/[\\/:*?"<>|]/g, '-').trim() || `${baseName()}_${String(idx + 1).padStart(w, '0')}`;
    const ext = S.precision === 'exact' ? 'mp4' : ((S.video.name.match(/\.([a-z0-9]+)$/i) || [0, 'mp4'])[1].toLowerCase());
    return `${name}.${ext}`;
  }
  const estSize = (d) => Math.round((S.video.size * d) / S.video.duration);
  function thumbFor(p) {
    const hit = S.thumbs.get(p.a); if (hit) return hit;
    if (!S.video.demo) return S.video.poster || '';
    const u = frameURL(p.a, S.video.duration, 92, 164); S.thumbs.set(p.a, u); return u;
  }
  // real files: one hidden <video>, sequential seeks, thumbnails keyed by start time (best effort, poster meanwhile)
  const thumbQ = []; let thumbBusy = false;
  function grabRealThumbs(list) {
    if (S.video.demo) return;
    list.forEach((p) => { if (!S.thumbs.has(p.a) && !thumbQ.includes(p.a)) thumbQ.push(p.a); });
    if (thumbBusy || !thumbQ.length) return;
    thumbBusy = true;
    const src = S.video.url;
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    const finish = () => { thumbBusy = false; v.removeAttribute('src'); try { v.load(); } catch (e) { /* ignore */ } };
    const next = () => {
      if (!S.video || S.video.url !== src || !thumbQ.length) { finish(); return; }
      const a = thumbQ.shift();
      const to = setTimeout(() => { v.removeEventListener('seeked', got); next(); }, 4000);
      function got() {
        clearTimeout(to);
        const u = captureFrame(v, 92, 164);
        if (u) { S.thumbs.set(a, u); $$(`img[data-thumb="${a}"]`).forEach((im) => { im.src = u; }); }
        next();
      }
      v.addEventListener('seeked', got, { once: true });
      v.currentTime = Math.min(v.duration || Infinity, (a + 50) / 1000);
    };
    v.addEventListener('loadedmetadata', next, { once: true });
    v.addEventListener('error', finish, { once: true });
    v.src = src;
  }
  function renderReview() {
    const all = parts(); const act = activeParts();
    const total = act.reduce((s, p) => s + p.d, 0);
    $('#reviewSummary').className = 'summary-card';
    $('#reviewSummary').innerHTML = `${icon('scissors')}<div><p class="s-main">${countWord(act.length)} · <bdi class="num">${fmt(total)}</bdi> · ${S.precision === 'fast' ? 'سريع' : 'دقيق'}</p><p class="s-sub">الحجم الكلي تقريبًا <bdi class="num">${fmtSize(estSize(total))}</bdi></p></div>`;
    $('#reviewList').innerHTML = all.map((p) => {
      const out = S.excluded.has(p.i);
      const title = S.names[p.i] || `الجزء ${p.i + 1}`;
      return `<div class="part ${out ? 'out' : ''}">
        <div class="thumb"><img data-thumb="${p.a}" src="${thumbFor(p)}" alt=""></div>
        <div class="p-main"><p class="p-title">${esc(title)}</p>
          <p class="p-range">من <bdi class="num">${fmtPart(p.a)}</bdi> إلى <bdi class="num">${fmtPart(p.b)}</bdi></p>
          <p class="p-meta">${out ? 'مستبعد' : `<bdi class="num">${fmtPart(p.d)}</bdi> · <bdi class="num">${fmtSize(estSize(p.d))}</bdi> تقريبًا`}</p></div>
        <button class="icon-btn" type="button" data-play="${p.i}" aria-label="شغّل ${esc(title)}">${icon('play')}</button>
        <button class="icon-btn" type="button" data-menu="${p.i}" aria-label="خيارات ${esc(title)}">${icon('dots')}</button></div>`;
    }).join('');
    $('#cutBtn').disabled = act.length < 1;
    grabRealThumbs(all);
  }
  $('#reviewList').addEventListener('click', (e) => {
    const pl = e.target.closest('[data-play]'); const mn = e.target.closest('[data-menu]');
    if (pl) { const p = parts()[Number(pl.dataset.play)]; closeSub(); setTimeout(() => playSegment(p), 280); }
    if (mn) partMenu(Number(mn.dataset.menu));
  });
  function partMenu(i) {
    const all = parts(); const out = S.excluded.has(i); const title = S.names[i] || `الجزء ${i + 1}`;
    openSheet(`<h3>${esc(title)}</h3>
      <button class="s-item" type="button" data-a="play">${icon('play')}<span>تشغيل</span></button>
      <button class="s-item" type="button" data-a="rename">${icon('rename')}<span>إعادة تسمية</span></button>
      <button class="s-item" type="button" data-a="merge" ${i >= all.length - 1 ? 'disabled' : ''}>${icon('merge')}<span>دمج مع اللي بعده</span></button>
      <button class="s-item" type="button" data-a="exclude">${icon(out ? 'check' : 'exclude')}<span>${out ? 'رجّعه' : 'استبعاد'}</span></button>`, (sh) => {
      sh.onclick = (e) => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'play') { closeSheet(); closeSub(); setTimeout(() => playSegment(parts()[i]), 280); }
        if (a === 'rename') {
          openSheet(`<h3>إعادة تسمية</h3><label class="field"><span class="field-label">الاسم</span><input class="input" id="rnInput" type="text" maxlength="40" enterkeyhint="done" value="${esc(S.names[i] || '')}" placeholder="الجزء ${i + 1}"></label>
            <p class="muted sm" style="margin:8px 4px 0">ينضاف لاسم الملف.</p>
            <div class="s-actions"><button class="btn primary block" type="button" data-ok>احفظ</button></div>`, (s2) => {
            const save = () => { const v = $('#rnInput').value.trim(); if (v) S.names[i] = v; else delete S.names[i]; closeSheet(); renderReview(); };
            s2.querySelector('[data-ok]').onclick = save;
            $('#rnInput').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); save(); } });
            setTimeout(() => { const el = $('#rnInput'); if (el) { el.focus(); el.select(); } }, 320);
          });
        }
        if (a === 'merge') {
          const bb = bounds(); bb.splice(i + 1, 1); S.custom = bb;
          const names = {}; Object.keys(S.names).forEach((k) => { const j = Number(k); if (j <= i) names[j] = S.names[j]; else if (j > i + 1) names[j - 1] = S.names[j]; });
          if (!names[i] && S.names[i + 1]) names[i] = S.names[i + 1];
          const ex = new Set(); S.excluded.forEach((j) => { if (j < i) ex.add(j); else if (j > i + 1) ex.add(j - 1); else if (j === i && S.excluded.has(i + 1)) ex.add(i); });
          S.names = names; S.excluded = ex;
          closeSheet(); renderReview(); renderTrack(); renderCTA(); toast(`انضم الجزء ${i + 1} و${i + 2}`);
        }
        if (a === 'exclude') { if (out) S.excluded.delete(i); else S.excluded.add(i); closeSheet(); renderReview(); positionTrack(); renderCTA(); }
      };
    });
  }
  $('#reviewBtn').addEventListener('click', () => { stopPlay(); renderReview(); openSub('review'); });
  $('#backSetupBtn').addEventListener('click', closeSub);

  // ---------- export (demo simulation, clearly labelled) ----------
  let exp = null;
  $('#cutBtn').addEventListener('click', () => {
    const list = activeParts().map((p, k, arr) => Object.assign({}, p, { k, n: arr.length })); if (!list.length) return;
    exp = { list, idx: 0, prog: list.map(() => 0), state: list.map(() => 'wait'), stopped: false, t0: performance.now() };
    $('#keepOpen').hidden = !isIOS;
    renderExport(); openSub('export', { replace: true }); runExport();
  });
  function renderExport() {
    const n = exp.list.length; const done = exp.state.filter((s) => s === 'done').length;
    const totalD = exp.list.reduce((s, p) => s + p.d, 0);
    const doneD = exp.list.reduce((s, p, k) => s + p.d * exp.prog[k], 0);
    const pctAll = Math.floor((doneD / totalD) * 100);
    $('#expPart').textContent = `الجزء ${Math.min(exp.idx + 1, n)} من ${n}`;
    $('#expPct').textContent = `${pctAll}%`;
    $('#expBar').style.width = pctAll + '%';
    const el = (performance.now() - exp.t0) / 1000;
    $('#expLeft').textContent = pctAll > 3 ? `باقي تقريبًا ${Math.max(1, Math.round((el / pctAll) * (100 - pctAll)))} ث` : 'أحسب الوقت المتبقي…';
    $('#exportList').innerHTML = exp.list.map((p, k) => {
      const st = exp.state[k];
      const lab = st === 'done' ? `<span class="state-pill ok">${icon('check-circle')}جاهز</span>` : st === 'run' ? `<span class="state-pill run">يتقص <bdi class="num">${Math.floor(exp.prog[k] * 100)}%</bdi></span>` : st === 'stop' ? '<span class="state-pill">انحذف الناقص</span>' : '<span class="state-pill">ينتظر</span>';
      return `<div class="part"><div class="thumb"><img src="${thumbFor(p)}" alt=""></div><div class="p-main"><p class="p-title">${esc(S.names[p.i] || `الجزء ${p.i + 1}`)}</p>
        <p class="p-meta"><bdi class="num">${fmtPart(p.d)}</bdi></p>${st === 'run' ? `<div class="bar mini-bar"><i style="width:${Math.floor(exp.prog[k] * 100)}%"></i></div>` : ''}</div>${lab}</div>`;
    }).join('');
    void done;
  }
  function runExport() {
    const totalD = exp.list.reduce((s, p) => s + p.d, 0);
    const step = () => {
      if (!exp || exp.stopped) return;
      const k = exp.idx; if (k >= exp.list.length) { finishExport(); return; }
      exp.state[k] = 'run';
      const ms = Math.max(700, (exp.list[k].d / totalD) * 5200);
      exp.prog[k] = Math.min(1, exp.prog[k] + 120 / ms);
      if (exp.prog[k] >= 1) { exp.state[k] = 'done'; exp.idx += 1; }
      renderExport(); setTimeout(step, 120);
    };
    step();
  }
  const stopBtn = $('#stopBtn');
  twoTap(stopBtn, stopBtn.querySelector('span'), 'متأكد؟', () => {
    if (!exp) return;
    exp.stopped = true;
    if (exp.state[exp.idx] === 'run') { exp.state[exp.idx] = 'stop'; exp.prog[exp.idx] = 0; }
    const ready = exp.list.filter((p, k) => exp.state[k] === 'done');
    renderExport();
    if (!ready.length) { toast('وقفنا. ما خلص ولا جزء.'); setTimeout(() => closeAllSubs(), 600); exp = null; return; }
    toast(ready.length === 1 ? `وقفنا. الجزء ${ready[0].i + 1} جاهز.` : ready.length <= 4 ? `وقفنا. الأجزاء ${ready.map((p) => p.i + 1).join(' و')} جاهزة.` : `وقفنا. ${countWord(ready.length)} ${readyAdj(ready.length)}.`);
    finishExport(ready);
  });
  function finishExport(readyList) {
    const list = readyList || exp.list; exp = null;
    const total = list.reduce((s, p) => s + p.d, 0);
    S.results = { list, saved: false };
    const hist = store.get('qs_hist', []);
    hist.unshift({ ts: Date.now(), name: S.video.name, dur: S.video.duration, mode: modeLabel(S.p), n: list.length, size: estSize(total), p: Object.assign({ precision: S.precision }, S.p), demo: !!S.video.demo });
    store.set('qs_hist', hist.slice(0, 30));
    renderResults(); openSub('results', { replace: true });
  }
  function renderResults() {
    const list = S.results.list; const total = list.reduce((s, p) => s + p.d, 0);
    const of = list.length && list[0].n > list.length ? ` من ${list[0].n}` : '';
    $('#doneCard').innerHTML = `<div class="d-icon">${icon('check')}</div><div><p class="d-title">${readyAdj(list.length)}: ${countWord(list.length)}${of}</p><p class="d-sub">الحجم الكلي <bdi class="num">${fmtSize(estSize(total))}</bdi>${S.video.demo ? ' · عرض تجريبي' : ''}</p></div>`;
    $('#resultsList').innerHTML = list.map((p, k) => `<div class="part"><div class="thumb"><img src="${thumbFor(p)}" alt=""></div>
      <div class="p-main"><p class="p-title num" dir="ltr" style="text-align:right">${esc(partName(p, p.k, p.n))}</p><p class="p-meta"><bdi class="num">${fmtPart(p.d)}</bdi> · <bdi class="num">${fmtSize(estSize(p.d))}</bdi></p></div>
      <button class="save-btn" type="button" data-save="${k}">${icon('save')}احفظ</button></div>`).join('');
    $$('.desk-only').forEach((b) => { b.hidden = !finePointer; });
  }
  $('#resultsList').addEventListener('click', (e) => { if (e.target.closest('[data-save]')) toast('عرض تجريبي: الحفظ يجي في النسخة 1'); });
  $('#saveAllBtn').addEventListener('click', () => toast('عرض تجريبي: الحفظ يجي في النسخة 1'));
  $$('[data-soon]').forEach((b) => b.addEventListener('click', () => toast('يجي في النسخة 1')));
  $('#againBtn').addEventListener('click', () => {
    const go = () => { closeAllSubs(); stopPlay(); show('pick'); renderPickChips(); };
    if (S.results && !S.results.saved) confirmSheet('فيه أجزاء ما حفظتها. أكيد تطلع؟', '', 'اطلع', go, true); else go();
  });

  // ---------- templates ----------
  function modeLabel(p) {
    if (p.mode === 'equal') return `${p.equalN} بالتساوي`;
    if (p.mode === 'duration') return `كل جزء ${fmt((p.durM * 60 + p.durS) * 1000)}`;
    if (p.mode === 'platform') return PLATFORMS.find((x) => x.id === p.plat).name;
    return 'يدوي';
  }
  function ruleLine(p) {
    if (p.mode === 'equal') return `${p.equalN} أجزاء بالتساوي`;
    if (p.mode === 'duration') return `كل جزء ${fmt((p.durM * 60 + p.durS) * 1000)} · ${REST[p.rest]}`;
    if (p.mode === 'platform') return `كل جزء لين ${limitLabel(platLimit(p.plat))} · ${p.fill ? 'املأ للحد' : 'متوازن'}`;
    return 'نقاط يدوية';
  }
  function useTemplate(t) {
    if (S.video && !$('#st-setup').hidden) { applyParams(t.p); renderAll(); toast(`انطبق القالب: ${t.name}`); setTab('cut'); return; }
    S.pending = t; setTab('cut'); toast(`اختر مقطع، والقالب «${t.name}» ينطبق عليه`);
  }
  function renderTemplates() {
    const ov = store.get('qs_plat', {});
    $('#platformList').innerHTML = PLATFORMS.map((x) => `<div class="row tpl">
      <button class="r-icon" type="button" data-edit="${x.id}" aria-label="عدّل حد ${x.name}">${icon(x.icon)}</button>
      <button class="r-main" type="button" data-edit="${x.id}" style="text-align:start"><p class="r-title">${x.name}</p>
        <p class="r-sub">${ruleLine({ mode: 'platform', plat: x.id, fill: false })}${ov[x.id] ? ' · <span class="edited">عدّلته أنت</span>' : ''}</p></button>
      <button class="use" type="button" data-use-plat="${x.id}">استخدم</button></div>`).join('');
    const mine = myTemplates();
    $('#myList').innerHTML = mine.length ? mine.map((t) => `<div class="row tpl"><span class="r-icon">${icon('bookmark')}</span>
      <div class="r-main"><p class="r-title">${esc(t.name)}</p><p class="r-sub">${ruleLine(t.p)}</p></div>
      <button class="icon-btn" type="button" data-del="${esc(t.id)}" aria-label="احذف ${esc(t.name)}">${icon('trash')}</button>
      <button class="use" type="button" data-use="${esc(t.id)}">استخدم</button></div>`).join('')
      : '<p class="my-empty">ما عندك قوالب محفوظة. احفظ أي إعداد من شاشة القص، أو سوّ قالب جديد.</p>';
  }
  $('#tab-templates').addEventListener('click', (e) => {
    const up = e.target.closest('[data-use-plat]'); const u = e.target.closest('[data-use]');
    const ed = e.target.closest('[data-edit]'); const del = e.target.closest('[data-del]');
    if (up) { const x = PLATFORMS.find((q) => q.id === up.dataset.usePlat); useTemplate({ id: 'plat-' + x.id, name: x.name, p: { mode: 'platform', plat: x.id, fill: false } }); }
    if (u) { const t = myTemplates().find((q) => q.id === u.dataset.use); if (t) useTemplate(t); }
    if (del) {
      const t = myTemplates().find((q) => q.id === del.dataset.del);
      confirmSheet(`تحذف «${esc(t.name)}»؟`, '', 'احذف', () => { store.set('qs_tpls', myTemplates().filter((q) => q.id !== t.id)); renderTemplates(); renderPickChips(); }, true);
    }
    if (ed) editPlatform(ed.dataset.edit);
  });
  function editPlatform(id) {
    const x = PLATFORMS.find((q) => q.id === id);
    let v = platLimit(id);
    const draw = (sh) => { sh.querySelector('.val').textContent = limitLabel(v); };
    openSheet(`<h3>${x.name}</h3><p class="s-desc">حد الجزء في هالقالب. الأصلي ${limitLabel(x.limit)}.</p>
      <div class="counter"><button class="cbtn" type="button" data-d="-5" aria-label="5 ثواني أقل">${icon('minus')}</button><output class="cnum num val"></output><button class="cbtn" type="button" data-d="5" aria-label="5 ثواني أكثر">${icon('plus')}</button></div>
      <div class="s-actions"><button class="btn primary block" type="button" data-ok>احفظ</button><button class="btn tonal block" type="button" data-reset>رجّع الأصلي</button></div>`, (sh) => {
      draw(sh);
      sh.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { v = Math.max(5, Math.min(3600, v + Number(b.dataset.d))); draw(sh); }));
      sh.querySelector('[data-ok]').onclick = () => { const o = store.get('qs_plat', {}); if (v === x.limit) delete o[id]; else o[id] = v; store.set('qs_plat', o); closeSheet(); renderTemplates(); if (S.video) changed(); };
      sh.querySelector('[data-reset]').onclick = () => { const o = store.get('qs_plat', {}); delete o[id]; store.set('qs_plat', o); closeSheet(); renderTemplates(); if (S.video) changed(); };
    });
  }
  $('#saveTplBtn').addEventListener('click', () => {
    openSheet(`<h3>احفظ كقالب</h3><label class="field"><span class="field-label">اسم القالب</span><input class="input" id="stName" type="text" maxlength="30" value="${esc(modeLabel(S.p))}"></label>
      <p class="s-desc" style="margin-top:8px">${ruleLine(S.p)}</p><div class="s-actions"><button class="btn primary block" type="button" data-ok>احفظ</button></div>`, (sh) => {
      sh.querySelector('[data-ok]').onclick = () => {
        const name = $('#stName').value.trim() || modeLabel(S.p);
        const list = myTemplates(); list.unshift({ id: 't' + Date.now(), name, p: Object.assign({ precision: S.precision }, S.p) });
        store.set('qs_tpls', list.slice(0, 20)); closeSheet(); toast('انحفظ القالب'); renderPickChips();
      };
    });
  });
  const T = { mode: 'equal', equalN: 4, durM: 3, durS: 0, rest: 'short', plat: 'wa', fill: false };
  $('#newTplBtn').addEventListener('click', () => {
    Object.assign(T, { mode: 'equal', equalN: 4, durM: 3, durS: 0, rest: 'short', plat: 'wa', fill: false });
    $('#tplName').value = '';
    renderModeChips($('#tplModeChips'), T, false); renderPanel($('#tplPanel'), T, 'tpl'); openSub('newtpl');
  });
  $('#tplSaveBtn').addEventListener('click', () => {
    const name = $('#tplName').value.trim();
    if (!name) { toast('اكتب اسم للقالب'); $('#tplName').focus(); return; }
    const list = myTemplates(); list.unshift({ id: 't' + Date.now(), name, p: Object.assign({}, T) });
    store.set('qs_tpls', list.slice(0, 20)); closeSub(); renderTemplates(); renderPickChips(); toast('انحفظ القالب');
  });

  // ---------- history ----------
  const dateFmt = (() => { try { return new Intl.DateTimeFormat('ar-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }); } catch (e) { return null; } })();
  function renderHistory() {
    const h = store.get('qs_hist', []);
    $('#historyEmpty').hidden = h.length > 0;
    $('#historyList').innerHTML = h.map((x, k) => `<button class="row" type="button" data-h="${k}" style="text-align:start">
      <span class="r-icon">${icon('video')}</span>
      <span class="r-main"><span class="r-title" style="display:block">${esc(x.name)}${x.demo ? ' <span class="badge soon">تجريبي</span>' : ''}</span>
      <span class="r-sub num" style="display:block"><bdi>${fmt(x.dur)}</bdi> · ${esc(x.mode)} · ${countWord(x.n)} · <bdi>${fmtSize(x.size)}</bdi></span>
      <span class="r-sub" style="display:block">${dateFmt ? dateFmt.format(new Date(x.ts)) : ''}</span></span>${icon('chev', 'ic chev')}</button>`).join('');
  }
  $('#historyList').addEventListener('click', (e) => {
    const r = e.target.closest('[data-h]'); if (!r) return;
    const x = store.get('qs_hist', [])[Number(r.dataset.h)];
    openSheet(`<h3>${esc(x.name)}</h3><p class="s-desc">${esc(x.mode)} · ${countWord(x.n)}</p>
      <div class="s-actions"><button class="btn primary block" type="button" data-again>${icon('again')}أعد نفس الإعداد</button></div>`, (sh) => {
      sh.querySelector('[data-again]').onclick = () => {
        closeSheet(); S.pending = { id: 'h' + x.ts, name: `نفس إعداد ${x.mode}`, p: x.p };
        stopPlay(); setTab('cut'); show('pick'); renderPickChips(); toast('اختر المقطع مرة ثانية، والإعداد ينطبق عليه');
      };
    });
  });

  // ---------- settings ----------
  function renderSettings() {
    const prec = store.get('qs_prec', 'fast');
    $$('#defPrecision .choice').forEach((c) => c.setAttribute('aria-checked', c.dataset.v === prec));
    $('#namePattern').value = store.get('qs_pattern', DEFAULT_PATTERN);
    $('#nameTokens').innerHTML = ['{الاسم}', '{رقم}', '{العدد}', '{البداية}', '{العنوان}'].map((t) => `<button class="chip" type="button" data-tok="${t}">${t}</button>`).join('');
    nameExample();
  }
  function nameExample() {
    const pat = $('#namePattern').value || DEFAULT_PATTERN;
    const ex = pat.replace(/\{الاسم\}/g, 'podcast').replace(/\{رقم\}/g, '01').replace(/\{العدد\}/g, '04').replace(/\{البداية\}/g, '00-00').replace(/\{العنوان\}/g, 'مقدمة').replace(/[\\/:*?"<>|]/g, '-');
    $('#nameExample').textContent = ex + '.mp4';
  }
  $$('#defPrecision .choice').forEach((c) => c.addEventListener('click', () => { store.set('qs_prec', c.dataset.v); renderSettings(); toast('انحفظ'); }));
  $('#namePattern').addEventListener('input', () => { store.set('qs_pattern', $('#namePattern').value || DEFAULT_PATTERN); nameExample(); });
  $('#nameTokens').addEventListener('click', (e) => {
    const c = e.target.closest('[data-tok]'); if (!c) return;
    const inp = $('#namePattern'); const s = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
    inp.value = inp.value.slice(0, s) + c.dataset.tok + inp.value.slice(inp.selectionEnd != null ? inp.selectionEnd : s);
    store.set('qs_pattern', inp.value); nameExample();
  });

  // ---------- about + device probe ----------
  let probeText = '';
  async function renderAbout() {
    $('#aboutVersion').textContent = `الإصدار ${VERSION} · ${STAGE}`;
    const list = $('#probeList');
    const rows = [
      ['env', 'مكان التشغيل'], ['ios', 'نظام الجهاز'], ['secure', 'سياق آمن (لازم للمعالج)'],
      ['vdec', 'فك الفيديو (WebCodecs)'], ['avc', 'فك H.264 بدقة 1080p'], ['hevc', 'فك HEVC (تصوير الآيفون)'],
      ['venc', 'ترميز H.264 للدقيق'], ['aenc', 'ترميز الصوت AAC'], ['worker', 'خيط جانبي (Worker)'],
      ['opfs', 'التخزين المؤقت على القرص (OPFS)'], ['share', 'مشاركة الملفات للحفظ'], ['wake', 'منع انطفاء الشاشة'],
    ];
    list.innerHTML = rows.map(([k, l]) => `<div class="row probe" data-k="${k}"><span class="r-icon wait">${icon('timer')}</span><div class="r-main"><p class="r-title">${l}</p><p class="r-sub num">أفحص…</p></div></div>`).join('');
    const res = {};
    const set = (k, ok, note) => {
      res[k] = { ok, note };
      const r = list.querySelector(`[data-k="${k}"]`); if (!r) return;
      const ic = r.querySelector('.r-icon'); ic.className = 'r-icon ' + (ok === true ? 'ok' : ok === false ? 'no' : 'wait');
      ic.innerHTML = icon(ok === true ? 'check' : ok === false ? 'x' : 'info');
      r.querySelector('.r-sub').textContent = note;
    };
    const iosv = (navigator.userAgent.match(/OS (\d+)[._](\d+)/) || [])[0];
    set('env', null, inApp ? 'داخل تطبيق IPA' : 'متصفح');
    set('ios', null, iosv ? iosv.replace('OS ', 'iOS ').replace('_', '.') : navigator.platform || '—');
    set('secure', !!window.isSecureContext, window.isSecureContext ? 'نعم' : 'لا: WebCodecs ما يشتغل بدونه');
    const has = (n) => typeof window[n] !== 'undefined';
    set('vdec', has('VideoDecoder'), has('VideoDecoder') ? 'موجود' : 'غير موجود');
    const sup = async (fn) => { try { const r = await fn(); return !!(r && r.supported); } catch (e) { return false; } };
    if (has('VideoDecoder')) {
      set('avc', await sup(() => VideoDecoder.isConfigSupported({ codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 })), '');
      set('hevc', await sup(() => VideoDecoder.isConfigSupported({ codec: 'hvc1.1.6.L123.B0', codedWidth: 1920, codedHeight: 1080 })), '');
    } else { set('avc', false, 'يحتاج WebCodecs'); set('hevc', false, 'يحتاج WebCodecs'); }
    set('venc', has('VideoEncoder') ? await sup(() => VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 1080, height: 1920, bitrate: 10e6, framerate: 30 })) : false, has('VideoEncoder') ? '' : 'غير موجود');
    set('aenc', has('AudioEncoder') ? await sup(() => AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })) : false, has('AudioEncoder') ? '' : 'غير موجود (الصوت ينسخ بدون ترميز)');
    ['avc', 'hevc', 'venc', 'aenc'].forEach((k) => { if (res[k] && res[k].note === '') set(k, res[k].ok, res[k].ok ? 'مدعوم' : 'غير مدعوم'); });
    try {
      const ok = await new Promise((resolve) => {
        const u = URL.createObjectURL(new Blob(['postMessage(typeof VideoDecoder!=="undefined")'], { type: 'text/javascript' }));
        const w = new Worker(u, { type: 'module' }); const t = setTimeout(() => resolve(null), 2000);
        w.onmessage = (e) => { clearTimeout(t); w.terminate(); resolve(e.data); }; w.onerror = () => { clearTimeout(t); resolve(null); };
      });
      set('worker', ok !== null, ok === null ? 'ما اشتغل' : ok ? 'يشتغل، وفيه WebCodecs' : 'يشتغل، بس بدون WebCodecs');
    } catch (e) { set('worker', false, 'ما اشتغل'); }
    try {
      const root = await navigator.storage.getDirectory();
      const fh = await root.getFileHandle('qs-probe.tmp', { create: true });
      let how = 'موجود';
      if (fh.createWritable) { const w = await fh.createWritable(); await w.write(new Blob(['x'])); await w.close(); how = 'يكتب ويقرأ'; }
      await root.removeEntry('qs-probe.tmp');
      set('opfs', true, how);
    } catch (e) { set('opfs', false, 'غير متاح: نستخدم الذاكرة بحد أمان'); }
    try {
      const ok = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'probe.mp4', { type: 'video/mp4' })] }));
      set('share', ok, ok ? 'مدعوم' : 'غير مدعوم');
    } catch (e) { set('share', false, 'غير مدعوم'); }
    set('wake', 'wakeLock' in navigator, 'wakeLock' in navigator ? 'مدعوم' : 'غير مدعوم: بنطلب منك تخلي الشاشة مفتوحة');
    probeText = `قصقصه ${VERSION}\n` + rows.map(([k, l]) => `${res[k] ? (res[k].ok === true ? '✓' : res[k].ok === false ? '✗' : '•') : '•'} ${l}: ${res[k] ? res[k].note : ''}`).join('\n') + `\n${navigator.userAgent}`;
  }
  $('#probeCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(probeText); toast('انسخت النتيجة'); } catch (e) {
      openSheet(`<h3>النتيجة</h3><p class="s-desc">حدد النص وانسخه.</p><textarea class="input" style="height:220px;padding:12px;direction:ltr;text-align:left;font-size:13px" readonly>${esc(probeText)}</textarea>`, (sh) => { const t = sh.querySelector('textarea'); t.focus(); t.select(); });
    }
  });

  // ---------- QA view hashes (#qa-se small phone, #qa-wide laptop width) ----------
  function qaView() { const h = location.hash; document.documentElement.classList.toggle('qa-se', h === '#qa-se'); document.documentElement.classList.toggle('qa-wide', h === '#qa-wide'); setTimeout(() => positionTrack(), 50); }
  window.addEventListener('hashchange', qaView); qaView();

  // ---------- boot ----------
  applyTheme(document.documentElement.getAttribute('data-theme') || 'auto');
  showHint(); renderPickChips(); renderTemplates(); renderHistory(); updateTopbar();
  window.__qs = { S, bounds, parts, idealBounds, snap, fmt, fmt1, parseTime, readDemo, setTab, openSub, closeSub, applyTheme, renderAbout };
})();
