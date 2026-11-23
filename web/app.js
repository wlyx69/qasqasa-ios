/* قصقصه — stage 1 shell: every screen and interaction, demo data, no real cutting yet. */
'use strict';
(function () {
  const VERSION = '1.0.5';
  const STAGE = 'النسخة 1';
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
  // installed from Chrome / Edge on a laptop: the page runs in its own app window
  const appWinMQ = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
  const isAppWin = () => !inApp && !!(appWinMQ && appWinMQ.matches);
  const envLabel = () => (inApp ? 'داخل تطبيق IPA' : isAppWin() ? 'تطبيق مثبّت على الجهاز' : 'متصفح');
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
  // ---------- keyframes: fast mode can only cut where the file stores a full picture ----------
  const SN = { merged: [], grew: 0 };
  function kfList() { return S.video && S.video.kfs && S.video.kfs.length ? S.video.kfs : null; }
  function kfAtOrBefore(x) {
    const k = kfList(); if (!k || k[0] > x + 1e-6) return null;
    let lo = 0; let hi = k.length - 1; let ans = 0;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (k[m] <= x + 1e-6) { ans = m; lo = m + 1; } else hi = m - 1; }
    return k[ans];
  }
  function kfAfter(x) {
    const k = kfList(); if (!k) return null;
    let lo = 0; let hi = k.length - 1; let ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (k[m] > x + 1e-6) { ans = m; hi = m - 1; } else lo = m + 1; }
    return ans < 0 ? null : k[ans];
  }
  function nearestKf(t) { // tie -> the earlier one
    const lo = kfAtOrBefore(t); const hi = kfAfter(t);
    if (lo == null) return hi; if (hi == null) return lo;
    return (t - lo) <= (hi - t) ? lo : hi;
  }
  function snapOnce(b) {
    const out = []; const merged = [];
    const fileEnd = S.video.duration; const end = b[b.length - 1];
    out.push(S.trim && b[0] > 0 ? nearestKf(b[0]) : b[0]);
    const endS = S.trim && end < fileEnd - 0.5 ? Math.max(out[0] + MIN_PART, nearestKf(end)) : end;
    for (let i = 1; i < b.length - 1; i++) {
      const s = nearestKf(b[i]);
      if (s - out[out.length - 1] >= MIN_PART && endS - s >= MIN_PART) out.push(s); else merged.push(i);
    }
    out.push(endS);
    if (S.p.mode === 'platform') { // never over the platform limit: move a cut back to an earlier keyframe
      const L = platLimit(S.p.plat) * 1000;
      for (let i = 1; i < out.length - 1; i++) {
        if (out[i] - out[i - 1] > L + 0.5) {
          const p = kfAtOrBefore(out[i - 1] + L);
          if (p != null && p - out[i - 1] >= MIN_PART) out[i] = p;
        }
      }
    }
    return { out, merged };
  }
  function snap(b) { // fast mode: nearest keyframe, tie -> earlier; cuts that land on the same keyframe merge
    SN.merged = []; SN.grew = 0;
    if (!kfList()) return b.slice();
    let r = snapOnce(b);
    if (S.p.mode === 'platform' && !S.p.fill) { // still over the limit after moving back: one more part, still copied as is
      const L = platLimit(S.p.plat) * 1000; const { a, D } = range();
      const over = (o) => o.some((t, i) => i > 0 && t - o[i - 1] > L + 0.5);
      let extra = 0;
      while (over(r.out) && extra < 3) {
        extra += 1;
        const n = Math.ceil(D / L) + extra; const ideal = [a];
        for (let i = 1; i < n; i++) ideal.push(a + Math.floor((i * D) / n));
        ideal.push(a + D); r = snapOnce(ideal);
      }
      SN.grew = extra;
    }
    SN.merged = r.merged;
    return r.out;
  }
  function bounds() {
    if (S.custom) return S.custom.slice();
    const { a, D } = range();
    const ideal = idealBounds(S.p, a, D, S.manual);
    return S.precision === 'fast' ? snap(ideal) : ideal;
  }
  function maxShift() {
    const { a, D } = range();
    const ideal = idealBounds(S.p, a, D, S.manual);
    const s = snap(ideal);
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
  function frameURL(t, total, w, h, plain) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (plain) { // no picture available: a calm placeholder, no fake content
      g.fillStyle = '#0F2A1F'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(212,255,58,.35)'; g.lineWidth = Math.max(2, w / 60);
      g.strokeRect(w * 0.3, h * 0.4, w * 0.4, h * 0.2);
      return c.toDataURL('image/jpeg', 0.8);
    }
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
  function showHint() { $('#iosHint').hidden = !(isIOS && !store.get('qs_hint', false)); showInstall(); }
  $('#hintClose').addEventListener('click', () => { store.set('qs_hint', true); showHint(); });

  // ---------- install on the laptop: Chrome / Edge send this event only when the app can be installed ----------
  let installEvt = null;
  function showInstall() {
    $('#installHint').hidden = !(installEvt && !store.get('qs_install_hint', false));
    $('#installItem').hidden = !installEvt;
  }
  async function doInstall() {
    const e = installEvt; if (!e) return;
    installEvt = null; showInstall(); openDrawer(false);
    try { await e.prompt(); await e.userChoice; } catch (err) { /* the browser declined to show it */ }
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; showInstall(); });
  window.addEventListener('appinstalled', () => { installEvt = null; showInstall(); toast('تثبّت. تلقاه في قائمة ابدأ'); });
  $('#installBtn').addEventListener('click', doInstall);
  $('#installItem').addEventListener('click', doInstall);
  $('#installClose').addEventListener('click', () => { store.set('qs_install_hint', true); showInstall(); });
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

  $('#errWhy').addEventListener('click', () => {
    const e = S.lastError || {};
    const lines = [
      `قصقصه ${VERSION} · ${envLabel()} · المحرك: ${QEngine.mode || '؟'}`,
      `الملف: ${e.name} · ${fmtSize(e.size || 0)} · ${e.type || 'بدون نوع'}`,
      `الخطأ: ${e.detail}`,
      `آمن: ${window.isSecureContext} · WebCodecs: ${typeof VideoDecoder !== 'undefined'} · Worker: ${typeof Worker !== 'undefined'}`,
      navigator.userAgent,
    ];
    const text = lines.join('\n');
    openSheet(`<h3>وش السبب؟</h3><p class="s-desc">أرسل هالسطور للي يطوّر التطبيق.</p><pre class="diag num" dir="ltr">${esc(text)}</pre>
      <div class="s-actions"><button class="btn primary block" type="button" data-copy>${icon('copy')}انسخ</button></div>`, (sh) => {
      sh.querySelector('[data-copy]').onclick = async () => {
        try { await navigator.clipboard.writeText(text); toast('انسخت'); } catch (err) { toast('ما قدرت أنسخ. صوّر الشاشة بدالها.'); }
      };
    });
  });

  // ---------- reading ----------
  function show(state) {
    ['pick', 'reading', 'setup'].forEach((s) => { $('#st-' + s).hidden = s !== state; });
    $('#tab-cut').classList.toggle('setup-mode', state === 'setup');
    $('#tab-cut').scrollTop = 0;
  }
  function readDemo() {
    const v = { name: 'podcast.mp4', size: 412 * 1048576, duration: 600000, width: 1080, height: 1920, fps: 30, codec: 'HEVC', kf: 1000, demo: true, hasAudio: true };
    v.kfs = Array.from({ length: 600 }, (_, i) => i * 1000);
    v.poster = frameURL(0, v.duration, 360, 640);
    startReading(v, (done) => {
      let p = 0; const bar = $('#readBar');
      const tick = () => { p += 18; bar.style.width = Math.min(p, 100) + '%'; if (p < 100) setTimeout(tick, 110); else done(); };
      tick();
    });
  }
  const READ_ERR = 'هالملف ما أقدر أقرأه. جرّب MP4 أو MOV.';
  const CODEC_NAMES = { avc: 'H.264', hevc: 'HEVC', vp9: 'VP9', vp8: 'VP8', av1: 'AV1' };
  function grabPoster(url, type) { // first picture through the system player; null when this browser can't show the codec
    return new Promise((resolve) => {
      const probe = document.createElement('video');
      probe.muted = true; probe.playsInline = true; probe.preload = 'auto';
      const finish = (u) => { clearTimeout(to); probe.removeAttribute('src'); try { probe.load(); } catch (e) { /* ignore */ } resolve(u); };
      const to = setTimeout(() => finish(null), 8000);
      probe.addEventListener('error', () => finish(null), { once: true });
      probe.addEventListener('loadedmetadata', () => {
        if (!probe.videoWidth) { finish(null); return; }
        probe.addEventListener('seeked', () => finish(captureFrame(probe, 360, 640)), { once: true });
        try { probe.currentTime = Math.min(0.1, (probe.duration || 1) / 2); } catch (e) { finish(null); }
      }, { once: true });
      setMediaSrc(probe, url, type);
    });
  }
  function readFile(file) {
    const url = URL.createObjectURL(file);
    const v = { name: file.name || 'مقطع', size: file.size, duration: 0, width: 0, height: 0, fps: null, codec: null, kf: null, kfs: null, demo: false, url, file };
    startReading(v, async (done, fail) => {
      $('#readBar').style.width = '6%';
      const r = await QEngine.request({ type: 'read', file }, (m) => m.type === 'meta' || (m.type === 'error' && m.op === 'read'),
        (m) => { if (m.type === 'read-progress') $('#readBar').style.width = Math.round(8 + m.p * 72) + '%'; });
      if (r.type === 'error') { fail(/\.(mp3|m4a|wav|aac|flac|ogg|opus)$/i.test(v.name) ? 'هذا ملف صوت. الصوت يجي في النسخة 2.' : READ_ERR, r.message); return; }
      const m = r.meta;
      if (m.error === 'audio-only') { fail('هذا ملف صوت. الصوت يجي في النسخة 2.'); return; }
      if (m.error) { fail(READ_ERR, 'meta: ' + m.error); return; }
      if (m.duration < 2e6) { fail('المقطع قصير، ما يتقسم.'); return; }
      const kfs = m.keyframes.map((us) => us / 1000);
      const gaps = kfs.slice(1).map((t, i) => t - kfs[i]).sort((x, y) => x - y);
      Object.assign(v, {
        meta: m, duration: m.duration / 1000, width: m.width, height: m.height, fps: m.fps || null,
        codec: CODEC_NAMES[m.codec] || (m.codec || '').toUpperCase(), kfs, kf: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
        hasAudio: m.hasAudio, hdr: m.hdr, vfr: m.vfr, rotation: m.rotation, mov: m.mov,
      });
      $('#readBar').style.width = '86%';
      v.poster = await grabPoster(url, v.mov ? 'video/quicktime' : 'video/mp4');
      if (!v.poster) {
        v.noPreview = true; // the system player refuses this file here; the cut itself does not need it
        await engineThumbs(file, [kfs[0] || 0], 360, 640, (t, u) => { v.poster = u; });
        if (!v.poster) v.poster = frameURL(0, v.duration, 360, 640, true);
      }
      $('#readBar').style.width = '100%'; setTimeout(done, 200);
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
      $('#readKf').textContent = v.kf ? `Keyframe كل ${fmtKf(v.kf)} ث تقريبًا` : 'ما قدرت أقرأ مواقع الـ Keyframes';
      $('#readKf').hidden = false;
      const badges = [];
      if (v.demo) badges.push('<span class="badge soon">مقطع تجريبي</span>');
      if (v.hdr) badges.push('<span class="badge">HDR</span>');
      if (!v.demo && !v.hasAudio) badges.push('<span class="badge">بدون صوت</span>');
      if (v.vfr) badges.push('<span class="badge">فريمات متغيرة (VFR)</span>');
      if (v.rotation) badges.push('<span class="badge">مقطع مدوّر</span>');
      $('#readBadges').innerHTML = badges.join('');
      setTimeout(() => loadVideo(v), 700);
    }, (msg, detail) => {
      if (v.url) URL.revokeObjectURL(v.url); show('pick'); toast(msg);
      S.lastError = { msg, detail: detail || '', name: v.name, size: v.size, type: (v.file && v.file.type) || '' };
      $('#errWhy').hidden = !detail;
    });
  }
  const fmtKf = (ms) => { const s = ms / 1000; return s >= 10 ? String(Math.round(s)) : String(Math.round(s * 10) / 10); };
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
    S.trim = false; S.trimA = 0; S.trimB = v.duration; S.thumbs = new Map(); thumbQ.length = 0; S.toMp4 = false;
    S.precision = store.get('qs_prec', 'fast');
    if (S.pending) { applyParams(S.pending.p); toast(`انطبق القالب: ${S.pending.name}`); S.pending = null; renderPickChips(); }
    $('#infoName').textContent = v.name; $('#infoSummary').textContent = summaryLine(v);
    if (v.demo || v.noPreview) { setMediaSrc(video, null); video.hidden = true; $('#poster').src = v.poster; $('#poster').hidden = false; } else { video.hidden = false; $('#poster').hidden = true; setMediaSrc(video, v.url, v.mov ? 'video/quicktime' : 'video/mp4'); }
    if (v.noPreview) setTimeout(() => toast('ما أقدر أعرض الصورة هنا، بس القص السريع يشتغل عادي.'), 400);
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
    if (S.precision === 'fast' && kfList()) { const k = nearestKf(tt); if (Math.abs(k - tt) > 50) toast(`انضبطت على ${fmt1(k)}`); tt = k; }
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
    const exactOff = S.video && !S.video.demo && !canExact();
    $('#precision .choice[data-v="exact"]').disabled = exactOff;
    $('#mp4Row').hidden = !(S.video && S.video.mov && S.precision === 'fast');
    $('#mp4Switch').setAttribute('aria-checked', !!S.toMp4);
    const note = $('#precisionNote');
    if (exactOff && S.precision === 'exact') S.precision = 'fast';
    if (S.precision === 'exact') { note.textContent = 'القص على الفريم بالضبط، وياخذ وقت أطول لأنه يعيد بناء الصورة.'; return; }
    if (exactOff) {
      const sh = kfList() && !S.custom ? maxShift() : null;
      const why = typeof VideoEncoder === 'undefined' ? 'الدقيق يحتاج معالج فيديو مو متوفر على هالجهاز' : `الدقيق ما يقدر يفك ترميز ${S.video.codec || 'هالمقطع'} على هالجهاز`;
      note.innerHTML = why + '، فالقص هنا سريع بنفس الجودة' + (sh != null && sh >= 1 ? ` (أكبر فرق متوقع <bdi class="num">${(sh / 1000).toFixed(1)}</bdi> ث)` : '') + '.';
      return;
    }
    if (!S.video || !kfList()) { note.textContent = 'ما قدرت أقرأ مواقع الـ Keyframes في هالملف.'; return; }
    if (S.custom) { note.textContent = 'الحدود معدّلة بيدك، وكل حد على Keyframe.'; return; }
    const sh = maxShift();
    if (sh == null) {
      const m = SN.merged[0];
      note.innerHTML = m != null ? `الجزء <bdi class="num">${m}</bdi> و<bdi class="num">${m + 1}</bdi> صاروا واحد، لأن ما فيه نقطة قص بينهم بالسريع.` : 'بعض الحدود انضمت لأن ما فيه Keyframe بينها.';
      return;
    }
    if (SN.grew) { note.innerHTML = `زدت ${SN.grew === 1 ? 'جزء' : countWord(SN.grew)} عشان ولا جزء يتعدى حد المنصة بعد اللزق على Keyframe.`; return; }
    if (sh > 2000) {
      note.innerHTML = `<span class="tip-inline">القص هنا ممكن يزيح لين <bdi class="num">${(sh / 1000).toFixed(1)}</bdi> ث. تبي الدقيق؟ <button class="btn sm tonal" type="button" id="toExact">دقيق</button></span>`;
      $('#toExact').onclick = () => $('#precision .choice[data-v="exact"]').click();
      return;
    }
    note.innerHTML = sh < 1 ? 'كل الحدود واقعة على Keyframes، فما فيه أي فرق.' : `أكبر فرق متوقع <bdi class="num">${(sh / 1000).toFixed(1)}</bdi> ث`;
  }
  $$('#precision .choice').forEach((c) => c.addEventListener('click', () => {
    if (S.precision === c.dataset.v) return;
    S.precision = c.dataset.v;
    if (S.custom && S.precision === 'fast' && kfList()) {
      const b = S.custom.slice();
      for (let i = 1; i < b.length - 1; i++) b[i] = nearestKf(b[i]);
      S.custom = b.filter((t, i) => i === 0 || i === b.length - 1 || (t - b[i - 1] >= MIN_PART && b[b.length - 1] - t >= MIN_PART));
    }
    if (S.precision === 'exact') warnHdr();
    renderPanel($('#modePanel'), S.p, 'setup'); renderTrack(); renderPrecision(); renderCTA();
  }));

  $('#mp4Switch').addEventListener('click', () => { S.toMp4 = !S.toMp4; renderPrecision(); });

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
    const kf = S.precision === 'fast' && kfList();
    const fr = 1000 / (S.video.fps || 30);
    const btns = kf ? [['Keyframe قبل', 'kprev'], ['Keyframe بعد', 'knext']] : [['ثانية قبل', -1000], ['فريم قبل', -fr], ['فريم بعد', fr], ['ثانية بعد', 1000]];
    box.innerHTML = btns.map(([l, d]) => `<button type="button" data-d="${d}">${l}</button>`).join('') + `<button type="button" data-done aria-label="خلاص">${icon('check')}</button>`;
    box.hidden = false;
    box.querySelectorAll('button').forEach((x) => x.addEventListener('click', () => {
      if (x.hasAttribute('data-done')) { S.sel = null; renderNudge(); positionTrack(); return; }
      const cur = bounds()[S.sel]; const d = x.dataset.d;
      if (d === 'kprev') { const k = kfAtOrBefore(cur - 1); if (k != null) moveBound(S.sel, k, true); return; }
      if (d === 'knext') { const k = kfAfter(cur + 1); if (k != null) moveBound(S.sel, k, true); return; }
      moveBound(S.sel, cur + Number(d));
    }));
  }
  function moveBound(i, t, exactKf) {
    const b = bounds();
    const lo = b[i - 1] + MIN_PART; const hi = b[i + 1] - MIN_PART;
    if (S.precision === 'fast' && kfList()) {
      if (!exactKf) t = nearestKf(t);
      if (t < lo) t = kfAfter(lo - 1e-3) ?? b[i];
      if (t > hi) t = kfAtOrBefore(hi) ?? b[i];
      if (t < lo || t > hi) t = b[i];
    } else t = Math.round(Math.max(lo, Math.min(hi, t)));
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
    const i = Number(hd.dataset.i); const cur = bounds()[i];
    if (S.precision === 'fast' && kfList()) {
      const k = e.key === 'ArrowRight' ? kfAfter(cur + 1) : kfAtOrBefore(cur - 1);
      S.sel = i; if (k != null) moveBound(i, k, true); renderNudge(); return;
    }
    const step = e.shiftKey ? 1000 : 1000 / (S.video.fps || 30);
    S.sel = i; moveBound(i, cur + (e.key === 'ArrowRight' ? step : -step)); renderNudge();
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
    if (S.video.demo || S.video.noPreview) {
      let last = performance.now(); let lastPoster = 0;
      clearInterval(clock);
      clock = setInterval(() => {
        const now = performance.now(); setTime(S.t + (now - last)); last = now;
        if (S.video.demo && now - lastPoster > 1000) { $('#poster').src = frameURL(S.t, S.video.duration, 360, 640); lastPoster = now; }
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
    if (S.video.demo || S.video.noPreview) setTime(p.a); else video.currentTime = p.a / 1000;
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
    const ext = S.precision === 'exact' || S.video.demo ? 'mp4' : S.video.mov && !S.toMp4 ? 'mov' : /\.m4v$/i.test(S.video.name) ? 'm4v' : 'mp4';
    return `${name}.${ext}`;
  }
  const estSize = (d) => Math.round((S.video.size * d) / S.video.duration);
  function thumbFor(p) {
    const hit = S.thumbs.get(p.a); if (hit) return hit;
    if (!S.video.demo) return S.video.poster || '';
    const u = frameURL(p.a, S.video.duration, 92, 164); S.thumbs.set(p.a, u); return u;
  }
  // real files: thumbnails decoded by the engine from the nearest keyframe; the system player is only a fallback
  let thumbId = 0;
  function engineThumbs(file, timesMs, w, h, onOne) {
    const id = ++thumbId;
    return QEngine.request({ type: 'thumbs', id, file, times: timesMs.map((t) => Math.round(t * 1000)), w, h },
      (r) => r.type === 'thumbs-done' && r.id === id,
      (r) => { if (r.type === 'thumb' && r.id === id) onOne(r.t / 1000, URL.createObjectURL(r.blob)); });
  }
  const thumbQ = []; let thumbBusy = false;
  async function grabRealThumbs(list) {
    if (S.video.demo) return;
    list.forEach((p) => { if (!S.thumbs.has(p.a) && !thumbQ.includes(p.a)) thumbQ.push(p.a); });
    if (thumbBusy || !thumbQ.length) return;
    thumbBusy = true;
    const v = S.video; const todo = thumbQ.splice(0);
    let got = 0;
    if (!v.noEngineThumbs) {
      await engineThumbs(v.file, todo, 92, 164, (t, u) => {
        const a = todo.reduce((best, x) => (Math.abs(x - t) < Math.abs(best - t) ? x : best), todo[0]);
        S.thumbs.set(a, u); got += 1;
        $$(`img[data-thumb="${a}"]`).forEach((im) => { im.src = u; });
      });
      if (!got) v.noEngineThumbs = true;
    }
    if (!got && !v.noPreview) await videoThumbs(todo.filter((a) => !S.thumbs.has(a)));
    thumbBusy = false;
    if (S.video === v && thumbQ.length) grabRealThumbs([]);
  }
  function videoThumbs(times) { // fallback: hidden player, sequential seeks
    return new Promise((resolve) => {
      if (!times.length) { resolve(); return; }
      const src = S.video.url; const q = times.slice();
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
      const finish = () => { v.removeAttribute('src'); try { v.load(); } catch (e) { /* ignore */ } resolve(); };
      const next = () => {
        if (!S.video || S.video.url !== src || !q.length) { finish(); return; }
        const a = q.shift();
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
      setMediaSrc(v, src, S.video.mov ? 'video/quicktime' : 'video/mp4');
    });
  }
  function setMediaSrc(el, url, type) { // a <source> child: works around a known iOS bug with blob URLs in src
    el.removeAttribute('src'); el.innerHTML = '';
    if (!url) { el.load(); return; }
    const so = document.createElement('source'); so.src = url; if (type) so.type = type;
    so.addEventListener('error', () => el.dispatchEvent(new Event('error')), { once: true });
    el.appendChild(so); el.load();
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

  // ---------- export ----------
  let exp = null; let wakeLock = null; let renderPending = false;
  const canExact = () => typeof VideoEncoder !== 'undefined' && !(S.video && S.video.meta && S.video.meta.canDecode === false);
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
    } catch (e) { wakeLock = null; }
    return !!wakeLock;
  }
  function warnHdr() { if (S.video && S.video.hdr && S.precision === 'exact') toast('هالمقطع HDR. الدقيق ممكن يغيّر الألوان شوي، والسريع يحافظ عليها.'); }
  $('#cutBtn').addEventListener('click', async () => {
    const list = activeParts().map((p, k, arr) => Object.assign({}, p, { k, n: arr.length })); if (!list.length) return;
    if (!S.video.demo && S.precision === 'exact' && !canExact()) { toast('الدقيق ما يشتغل على هالجهاز. جرّب السريع.'); return; }
    if (S.video.hdr && S.precision === 'exact') warnHdr();
    exp = { list, idx: 0, prog: list.map(() => 0), state: list.map(() => 'wait'), files: [], checks: [], tries: list.map(() => 0), stopped: false, paused: false, t0: performance.now() };
    const awake = await keepAwake(true);
    $('#keepOpen').hidden = !(isIOS || (!awake && !finePointer));
    $('#expDemo').hidden = !S.video.demo;
    if (!S.video.demo) store.set('qs_running', { ts: Date.now(), name: S.video.name, p: Object.assign({ precision: S.precision }, S.p) });
    renderExport(); openSub('export', { replace: true });
    if (S.video.demo) runDemoExport(); else runRealExport();
  });
  function renderExportSoon() { if (renderPending) return; renderPending = true; requestAnimationFrame(() => { renderPending = false; if (exp) renderExport(); }); }
  function renderExport() {
    const n = exp.list.length;
    const totalD = exp.list.reduce((s, p) => s + p.d, 0);
    const doneD = exp.list.reduce((s, p, k) => s + p.d * (exp.state[k] === 'done' ? 1 : exp.prog[k]), 0);
    const pctAll = Math.min(100, Math.floor((doneD / totalD) * 100));
    $('#expPart').textContent = `الجزء ${Math.min(exp.idx + 1, n)} من ${n}`;
    $('#expPct').textContent = `${pctAll}%`;
    $('#expBar').style.width = pctAll + '%';
    const el = (performance.now() - exp.t0) / 1000;
    $('#expLeft').textContent = exp.paused ? 'وقفنا مؤقتًا لين ترجع للتطبيق' : pctAll > 3 && el > 1 ? `باقي تقريبًا ${fmtLeft((el / pctAll) * (100 - pctAll))}` : 'أحسب الوقت المتبقي…';
    $('#exportList').innerHTML = exp.list.map((p, k) => {
      const st = exp.state[k];
      const lab = st === 'done' ? `<span class="state-pill ok">${icon('check-circle')}جاهز</span>`
        : st === 'run' ? `<span class="state-pill run">يتقص <bdi class="num">${Math.floor(exp.prog[k] * 100)}%</bdi></span>`
          : st === 'stop' ? '<span class="state-pill">انحذف الناقص</span>' : st === 'fail' ? '<span class="state-pill bad">فشل</span>' : '<span class="state-pill">ينتظر</span>';
      return `<div class="part"><div class="thumb"><img data-thumb="${p.a}" src="${thumbFor(p)}" alt=""></div><div class="p-main"><p class="p-title">${esc(S.names[p.i] || `الجزء ${p.i + 1}`)}</p>
        <p class="p-meta"><bdi class="num">${fmtPart(p.d)}</bdi></p>${st === 'run' ? `<div class="bar mini-bar"><i style="width:${Math.floor(exp.prog[k] * 100)}%"></i></div>` : ''}</div>${lab}</div>`;
    }).join('');
  }
  const fmtLeft = (s) => (s < 60 ? `${Math.max(1, Math.round(s))} ث` : s < 3600 ? `${Math.round(s / 60)} دقيقة` : `${Math.round(s / 360) / 10} ساعة`);
  function runDemoExport() { // the demo clip has no file: simulated, and labelled so on screen
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
  const waitVisible = () => new Promise((res) => { if (document.visibilityState === 'visible') { res(); return; } const h = () => { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', h); res(); } }; document.addEventListener('visibilitychange', h); });
  document.addEventListener('visibilitychange', () => { // iPhone stops the page in the background: stop the part, redo it on return
    if (!exp || exp.stopped || S.video.demo || !isIOS) return;
    if (document.visibilityState === 'hidden' && exp.state[exp.idx] === 'run') { exp.paused = true; QEngine.send({ type: 'stop' }); }
  });
  function cutOne(k) {
    const p = exp.list[k]; const m = S.video.meta;
    const toEnd = p.b >= S.video.duration - 0.5;
    const part = {
      k, name: partName(p, p.k, p.n), toEnd, toMp4: !!S.toMp4,
      a: Math.round(p.a * 1000), b: toEnd ? m.duration : Math.round(p.b * 1000),
      first: p.a <= 0.5 || Math.round(p.a * 1000) <= (m.keyframes[0] || 0),
    };
    const done = (r) => ((r.type === 'part' || r.type === 'failed' || r.type === 'stopped') && r.k === k) || (r.type === 'error' && r.op === 'cut');
    return QEngine.request({ type: 'cut', file: S.video.file, meta: m, mode: S.precision, part }, done,
      (r) => { if (r.type === 'progress' && r.k === k && exp) { exp.prog[k] = r.p; renderExportSoon(); } });
  }
  async function runRealExport() {
    await QEngine.request({ type: 'clear' }, (r) => r.type === 'cleared' || r.type === 'error');
    const fr = 1e6 / (S.video.fps || 30);
    for (let k = 0; k < exp.list.length; k++) {
      if (!exp || exp.stopped) return;
      exp.idx = k; exp.state[k] = 'run'; exp.prog[k] = 0; renderExport();
      const r = await cutOne(k);
      if (!exp) return;
      if (r.type === 'stopped') {
        if (exp.stopped) return;
        if (exp.paused) { await waitVisible(); exp.paused = false; toast(`رجعت؟ بنكمل من الجزء ${exp.list[k].i + 1}.`); k -= 1; continue; }
      }
      const p = exp.list[k];
      const want = Math.round(p.d * 1000);
      const ok = r.type === 'part' && Math.abs(r.check.duration - want) <= 1.5 * fr + 2000;
      if (ok) { exp.files[k] = r.file; exp.checks[k] = r.check; exp.state[k] = 'done'; exp.prog[k] = 1; renderExport(); continue; }
      if (r.type === 'part') { console.warn('part length mismatch', k, r.check.duration, want); exp.lastError = `length ${r.check.duration} vs ${want}`; }
      else { console.warn('part failed', k, r.message); exp.lastError = r.message || r.type; }
      exp.tries[k] += 1;
      if (exp.tries[k] < 2) { k -= 1; continue; } // one more try, then move on
      exp.state[k] = 'fail'; renderExport();
    }
    if (exp && !exp.stopped) finishExport();
  }
  const stopBtn = $('#stopBtn');
  twoTap(stopBtn, stopBtn.querySelector('span'), 'متأكد؟', () => {
    if (!exp) return;
    exp.stopped = true;
    if (!S.video.demo) QEngine.send({ type: 'stop' });
    if (exp.state[exp.idx] === 'run') { exp.state[exp.idx] = 'stop'; exp.prog[exp.idx] = 0; }
    const ready = exp.list.filter((p, k) => exp.state[k] === 'done');
    renderExport();
    if (!ready.length) { toast('وقفنا. ما خلص ولا جزء.'); keepAwake(false); store.del('qs_running'); setTimeout(() => closeAllSubs(), 600); exp = null; return; }
    toast(ready.length === 1 ? `وقفنا. الجزء ${ready[0].i + 1} جاهز.` : ready.length <= 4 ? `وقفنا. الأجزاء ${ready.map((p) => p.i + 1).join(' و')} جاهزة.` : `وقفنا. ${countWord(ready.length)} ${readyAdj(ready.length)}.`);
    finishExport(ready);
  });
  function finishExport(readyList) {
    const e = exp; exp = null;
    const done = readyList || e.list.filter((p, k) => e.state[k] === 'done');
    const list = done.map((p) => Object.assign({}, p, { file: e.files[p.k] || null, check: e.checks[p.k] || null }));
    const failed = readyList ? [] : e.list.filter((p, k) => e.state[k] === 'fail');
    keepAwake(false); store.del('qs_running');
    if (!list.length) { // nothing came out: say so and go back to the setup, no empty results screen
      closeAllSubs();
      toast(e.lastError && /exact-unsupported/.test(e.lastError) ? 'الدقيق ما قدر يفك ترميز هالمقطع هنا. جرّب السريع.' : 'ما قدرت أقص ولا جزء. جرّب مرة ثانية أو اختر السريع.');
      if (e.lastError) S.lastError = { msg: 'cut', detail: e.lastError, name: S.video.name, size: S.video.size, type: '' };
      return;
    }
    S.results = { list, saved: new Set(), failed };
    const total = list.reduce((s, p) => s + (p.file ? p.file.size : estSize(p.d)), 0);
    const hist = store.get('qs_hist', []);
    hist.unshift({ ts: Date.now(), name: S.video.name, dur: S.video.duration, mode: modeLabel(S.p), n: list.length, size: total, p: Object.assign({ precision: S.precision }, S.p), demo: !!S.video.demo });
    store.set('qs_hist', hist.slice(0, 30));
    renderResults(); openSub('results', { replace: true });
    if (failed.length) setTimeout(() => toast(`الجزء ${failed.map((p) => p.i + 1).join(' و')} ما ضبط، والباقي تمام.`), 300);
  }
  const partSize = (p) => (p.file ? p.file.size : estSize(p.d));
  const partDur = (p) => (p.check ? p.check.duration / 1000 : p.d);
  function renderResults() {
    const R = S.results; const list = R.list;
    const total = list.reduce((s, p) => s + partSize(p), 0);
    const of = list.length && list[0].n > list.length ? ` من ${list[0].n}` : '';
    const retry = R.failed && R.failed.length ? `<button class="btn sm tonal" type="button" id="retryFailed">أعيد ${R.failed.length === 1 ? 'الجزء' : 'الأجزاء'} اللي فشلت</button>` : '';
    $('#doneCard').innerHTML = `<div class="d-icon">${icon('check')}</div><div><p class="d-title">${readyAdj(list.length)}: ${countWord(list.length)}${of}</p><p class="d-sub">الحجم الكلي <bdi class="num">${fmtSize(total)}</bdi>${S.video.demo ? ' · عرض تجريبي' : ''}</p>${retry}</div>`;
    $('#resultsList').innerHTML = list.map((p, k) => {
      const name = p.file ? p.file.name : partName(p, p.k, p.n);
      const saved = R.saved.has(k);
      return `<div class="part"><div class="thumb"><img data-thumb="${p.a}" src="${thumbFor(p)}" alt=""></div>
      <div class="p-main"><p class="p-title num" dir="ltr" style="text-align:right">${esc(name)}</p><p class="p-meta"><bdi class="num">${fmtPart(partDur(p))}</bdi> · <bdi class="num">${fmtSize(partSize(p))}</bdi></p></div>
      <button class="save-btn ${saved ? 'saved' : ''}" type="button" data-save="${k}">${icon(saved ? 'check' : 'save')}${saved ? 'انحفظ' : 'احفظ'}</button></div>`;
    }).join('');
    $$('.desk-only').forEach((b) => { b.hidden = !finePointer; });
    const rf = $('#retryFailed');
    if (rf) rf.onclick = () => retryFailed();
  }
  async function retryFailed() { // only the parts that failed, kept alongside the ready ones
    const R = S.results; const todo = R.failed.slice(); R.failed = [];
    exp = { list: todo, idx: 0, prog: todo.map(() => 0), state: todo.map(() => 'wait'), files: [], checks: [], tries: todo.map(() => 0), stopped: false, paused: false, t0: performance.now(), retry: R };
    openSub('export', { replace: true }); renderExport();
    const fr = 1e6 / (S.video.fps || 30);
    for (let k = 0; k < todo.length; k++) {
      exp.idx = k; exp.state[k] = 'run'; renderExport();
      const p = todo[k]; const saveK = p.k; p.k = k;
      const r = await cutOne(k); p.k = saveK;
      if (r.type === 'part' && Math.abs(r.check.duration - Math.round(p.d * 1000)) <= 1.5 * fr + 2000) { R.list.push(Object.assign({}, p, { file: r.file, check: r.check })); exp.state[k] = 'done'; } else { R.failed.push(p); exp.state[k] = 'fail'; }
    }
    R.list.sort((x, y) => x.a - y.a); exp = null;
    renderResults(); openSub('results', { replace: true });
  }
  function markSaved(idxs) { idxs.forEach((k) => S.results.saved.add(k)); renderResults(); }
  const resultFiles = () => S.results.list.map((p) => p.file).filter(Boolean);
  async function saveFiles(idxs) {
    const files = idxs.map((k) => S.results.list[k].file).filter(Boolean);
    if (!files.length) { toast('عرض تجريبي: ما فيه ملف حقيقي'); return; }
    if (!finePointer && QSave.canShareFiles(files)) {
      try { await navigator.share({ files }); markSaved(idxs); } catch (err) {
        if (err && err.name === 'AbortError') return;
        if (files.length > 1) { shareInBatches(idxs); return; }
        QSave.download(files[0]); markSaved(idxs);
      }
      return;
    }
    files.forEach((f, i) => setTimeout(() => QSave.download(f), i * 400)); markSaved(idxs);
  }
  function shareInBatches(idxs) { // the system refused all at once (size or count): one tap per batch
    const size = 3; const batches = [];
    for (let i = 0; i < idxs.length; i += size) batches.push(idxs.slice(i, i + size));
    openSheet(`<h3>نحفظها دفعات</h3><p class="s-desc">النظام ما قبلها كلها مرة وحدة. اضغط كل دفعة واحفظها.</p>
      <div class="s-actions">${batches.map((b, j) => `<button class="btn tonal block" type="button" data-batch="${j}">الدفعة ${j + 1}: الأجزاء ${b.map((k) => k + 1).join(' و')}</button>`).join('')}</div>`, (sh) => {
      sh.querySelectorAll('[data-batch]').forEach((btn) => btn.addEventListener('click', async () => {
        const b = batches[Number(btn.dataset.batch)];
        try { await navigator.share({ files: b.map((k) => S.results.list[k].file) }); markSaved(b); btn.disabled = true; btn.textContent += ' · انحفظت'; } catch (e) { /* user closed it */ }
      }));
    });
  }
  $('#resultsList').addEventListener('click', (e) => { const b = e.target.closest('[data-save]'); if (b) saveFiles([Number(b.dataset.save)]); });
  $('#saveAllBtn').addEventListener('click', () => {
    const all = S.results.list.map((p, k) => k);
    if (finePointer) { if (QSave.canFolder()) saveToFolder(); else saveZip(); return; }
    saveFiles(all);
  });
  async function saveToFolder() {
    if (!resultFiles().length) { toast('عرض تجريبي: ما فيه ملف حقيقي'); return; }
    try { const n = await QSave.toFolder(resultFiles()); markSaved(S.results.list.map((p, k) => k)); toast(`انحفظت ${countWord(n)} في المجلد`); } catch (e) { if (e && e.name !== 'AbortError') toast('ما قدرت أكتب في هالمجلد'); }
  }
  async function saveZip() {
    if (!resultFiles().length) { toast('عرض تجريبي: ما فيه ملف حقيقي'); return; }
    toast('أجهّز ملف ZIP…');
    try { await QSave.zip(resultFiles(), `${baseName()}.zip`); markSaved(S.results.list.map((p, k) => k)); } catch (e) { toast(e && e.message === 'too-big' ? 'الأجزاء أكبر من 4 GB على ZIP. استخدم «مجلد».' : 'ما قدرت أسوي ZIP'); }
  }
  $('#folderBtn').addEventListener('click', () => { if (QSave.canFolder()) saveToFolder(); else toast('المتصفح هذا ما يدعم الحفظ في مجلد. جرّب ZIP.'); });
  $('#zipBtn').addEventListener('click', saveZip);
  $('#againBtn').addEventListener('click', () => {
    const go = () => { closeAllSubs(); stopPlay(); show('pick'); renderPickChips(); };
    const R = S.results;
    if (R && R.saved.size < R.list.length) confirmSheet('فيه أجزاء ما حفظتها. أكيد تطلع؟', '', 'اطلع', go, true); else go();
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
    set('env', null, envLabel());
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
  function qaView() { const h = location.hash; document.documentElement.classList.toggle('qa-se', h === '#qa-se'); document.documentElement.classList.toggle('qa-wide', h === '#qa-wide'); document.documentElement.classList.toggle('app-win', isAppWin() || h === '#qa-app'); setTimeout(() => positionTrack(), 50); }
  window.addEventListener('hashchange', qaView); qaView();
  if (appWinMQ && appWinMQ.addEventListener) appWinMQ.addEventListener('change', qaView);
  // first launch of the installed app: open as a phone-width window in the middle of the screen (later the user's own size wins)
  if (isAppWin() && finePointer && !store.get('qs_win', false)) {
    store.set('qs_win', true);
    try {
      const w = Math.min(540, screen.availWidth), h = Math.min(980, screen.availHeight);
      window.resizeTo(w, h);
      window.moveTo((screen.availLeft || 0) + Math.round((screen.availWidth - w) / 2), (screen.availTop || 0) + Math.round((screen.availHeight - h) / 2));
    } catch (e) { /* the browser keeps its own size */ }
  }

  // ---------- boot ----------
  applyTheme(document.documentElement.getAttribute('data-theme') || 'auto');
  showHint(); renderPickChips(); renderTemplates(); renderHistory(); updateTopbar();
  // ---------- offline + updates (web only; the IPA carries its files inside) ----------
  (function () {
    const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    let framed = true; try { framed = window.top !== window; } catch (e) { /* cross-origin parent */ }
    if (inApp || framed || !('serviceWorker' in navigator) || !(location.protocol === 'https:' || local)) return;
    let waiting = null;
    const offer = (w) => { waiting = w; $('#updateBar').hidden = false; };
    $('#updateBtn').addEventListener('click', () => {
      if (exp) { toast('أحدّث بعد ما يخلص القص'); return; }
      if (waiting) waiting.postMessage('update');
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading && !exp) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
    }).catch(() => { /* not allowed here (e.g. inside a preview frame) */ });
  })();
  // ---------- app start ----------
  QEngine.start().then(() => QEngine.send({ type: 'clear' })).catch(() => {});
  (function () {
    const r = store.get('qs_running', null);
    if (!r) return;
    store.del('qs_running');
    S.pending = { id: 'resume', name: 'آخر إعداد', p: r.p };
    renderPickChips();
    setTimeout(() => toast(`آخر عملية ما كملت (${r.name}). اختر المقطع مرة ثانية وأعيدها.`), 600);
  })();
  window.__qs = { S, bounds, parts, kfList, nearestKf, SN, renderAll, changed, renderTrack, updateTrimNote, addManual, idealBounds, snap, fmt, fmt1, parseTime, readDemo, setTab, openSub, closeSub, applyTheme, renderAbout };
})();
