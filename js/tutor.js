/* tutor.html: session sidebar, quick prompts, progress-code sync, optional Chatling adapter.
 *
 * Chatling SDK facts used (docs.chatling.ai/web-widget/widget-sdk): window.chtlConfig.variables (set before init),
 * window.Chatling.setVariables(obj, cb), .open(), .minimize(). The docs list NO message events, so auto-sync
 * works by (a) a MutationObserver over this page's DOM (works with displayType 'page_inline' that renders in the
 * page, not inside a cross-origin iframe), (b) window 'message' events, (c) pasting. Everything is guarded.
 */
(function () {
  'use strict';
  var L = window.Lingua;
  var $ = function (id) { return document.getElementById(id); };
  var input = $('code'), form = $('sync-form'), status = $('code-status'), decoded = $('decoded');
  var TUTORS = { en: 'Ollie (English)', hi: 'Asha (Hindi)', es: 'Mateo (Spanish)', fr: 'Camille (French)', zh: 'Mei (Mandarin)' };
  var LEVELS = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
  var SKEY = 'lingua.session';
  var CODE_RE = /LB-(EN|HI|ES|FR|ZH|OT)-[BIA]-\d-[LGPRQX]*/ig;
  var sess = { name: '', lang: 'es', level: 'B' };
  try { var st = JSON.parse(localStorage.getItem(SKEY)); if (st) for (var k in sess) if (st[k]) sess[k] = st[k]; } catch (e) { /* ignore */ }
  var qlang = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
  if (TUTORS[qlang]) sess.lang = qlang;
  var CHIPS = [
    'Teach me 5 phrases that go hard',
    'Quiz me, I am locked in',
    'Role-play at a hawker centre',
    'Role-play ordering at a cafe',
    'Explain this grammar point simply',
    'Correct my sentence and explain why',
    'Wrap up and give me my coach notes'
  ];

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setStatus(kind, msg) { status.className = 'status show ' + kind; status.textContent = msg; }
  function clearStatus() { status.className = 'status'; status.textContent = ''; }
  function step(n, on) { var el = $('st' + n); if (el) el.classList.toggle('done', !!on); }

  function showDecoded(res) {
    if (!res) { decoded.innerHTML = '<p class="note" style="margin:0">Paste a code to see what it contains.</p>'; return; }
    if (!res.ok) { decoded.innerHTML = '<p style="margin:0">' + esc(res.error) + '</p>'; return; }
    var p = res.parsed, prev = L.getState().codes[p.lang + '-' + p.level] || { done: '', score: 0 };
    var gain = Math.max(0, p.xp - L.codeXP({ done: prev.done, score: prev.score, level: p.level }));
    var newer = p.done.length > prev.done.length || (p.done.length === prev.done.length && p.score > prev.score);
    var chips = p.activities.length ? p.activities.map(function (a) { return '<span class="chip">' + (a.count > 1 ? a.count + ' x ' : '') + esc(a.name) + '</span>'; }).join('') : '<span class="chip">none yet</span>';
    decoded.innerHTML = '<dl><dt>Language</dt><dd>' + esc(p.langName) + '</dd><dt>Level</dt><dd>' + esc(p.levelName) + '</dd><dt>Quiz score</dt><dd>' + p.score + ' / 8</dd>' +
      '<dt>Activities</dt><dd><div class="chips">' + chips + '</div></dd><dt>Session XP</dt><dd>' + p.xp + '</dd>' +
      '<dt>New XP</dt><dd>' + (newer ? '+' + gain : '0 (already counted)') + '</dd></dl>';
  }
  function detected(res, auto) {
    var box = $('detected');
    $('detected-msg').textContent = (auto ? 'Found in the chat and synced. ' : '') + res.message;
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    step(1, true); step(2, true); step(3, true); step(4, res.gain > 0);
    if (res.gain > 0 && window.LinguaUI) LinguaUI.confetti({ count: 70 });
  }
  function sync(code, auto) {
    var res = L.applyProgressCode(code, true);
    showDecoded(res);
    if (!res.ok) { if (!auto) setStatus('err', res.error); return res; }
    setStatus(res.gain > 0 ? 'ok' : 'info', res.message);
    detected(res, auto);
    return res;
  }

  input.addEventListener('input', function () { clearStatus(); var v = input.value.trim(); step(2, !!v); showDecoded(v ? L.parseCode(v) : null); });
  $('example').addEventListener('click', function () { input.value = 'LB-ES-B-7-LGPRQ'; input.dispatchEvent(new Event('input')); input.focus(); });
  $('paste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { setStatus('info', 'Your browser blocks clipboard reading. Paste with Ctrl/Cmd+V into the box instead.'); input.focus(); return; }
    navigator.clipboard.readText().then(function (t) { input.value = t.trim(); input.dispatchEvent(new Event('input')); }).catch(function () { setStatus('info', 'Clipboard permission was denied. Paste with Ctrl/Cmd+V instead.'); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) { setStatus('err', 'Please paste your progress code first.'); input.focus(); return; }
    sync(v, false);
  });

  /* live sync landed (js/sync.js): show the success state */
  window.addEventListener('lingua:sync', function (e) {
    var d = e.detail || {};
    detected({ gain: d.gain, message: '+' + d.gain + ' XP from your chat, no cap (' + d.code + ').' }, true);
  });

  /* quick prompts */
  var chipsEl = $('chips');
  CHIPS.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'qchip'; b.textContent = t;
    b.addEventListener('click', function () {
      var msg = t + (/progress code/.test(t) ? '' : ' in ' + ({ en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', zh: 'Mandarin' }[sess.lang]) + ' (' + LEVELS[sess.level] + ')');
      var done = function (ok) { b.classList.add('copied'); b.textContent = ok ? 'Copied! Paste into the chat' : 'Press Ctrl/Cmd+C: ' + msg; setTimeout(function () { b.classList.remove('copied'); b.textContent = t; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
    chipsEl.appendChild(b);
  });

  /* session sidebar */
  function mini() {
    var s = L.getState();
    $('m-today').textContent = s.dayXP[L.dayStr()] || 0;
    $('m-xp').textContent = s.xp;
    $('m-streak').textContent = s.streak;
    $('m-rank').textContent = s.rank.name;
  }
  function saveSess() {
    sess.name = $('s-name').value.trim().slice(0, 24); sess.lang = $('s-lang').value; sess.level = $('s-level').value;
    try { localStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) { /* ignore */ }
    $('tutor-name').textContent = TUTORS[sess.lang];
    $('tutor-pick').textContent = 'You picked ' + TUTORS[sess.lang] + ' at ' + LEVELS[sess.level] + ' level. Tell the tutor which language you want when the chat opens.';
    pushVars();
  }
  $('s-name').value = sess.name; $('s-lang').value = sess.lang; $('s-level').value = sess.level;
  ['s-name', 's-lang', 's-level'].forEach(function (id) { $(id).addEventListener('change', saveSess); });
  mini();
  window.addEventListener('lingua:update', function () { mini(); var v = input.value.trim(); if (v && !status.classList.contains('show')) showDecoded(L.parseCode(v)); });

  /* ---------- Chatling adapter (all optional, all guarded) ---------- */
  function vars() {
    var s = L.getState();
    return { learner_name: sess.name || 'Learner', target_language: ({ en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', zh: 'Mandarin' })[sess.lang], level: LEVELS[sess.level], total_xp: String(s.xp), streak_days: String(s.streak) };
  }
  var pushed = '';
  function pushVars() {
    try {
      var v = vars();
      window.chtlConfig = window.chtlConfig || {};
      window.chtlConfig.variables = Object.assign({}, window.chtlConfig.variables || {}, v);
      var key = JSON.stringify(v);
      if (window.Chatling && typeof window.Chatling.setVariables === 'function' && key !== pushed) {
        window.Chatling.setVariables(v, function () { /* ok */ });
        pushed = key;
        $('adapter-note').textContent = 'Chatling is receiving your name, language and level.';
      }
    } catch (e) { /* adapter must never break the page */ }
  }
  pushVars();
  var tries = 0, iv = setInterval(function () {
    tries++; pushVars();
    if (window.Chatling || tries > 30) { clearInterval(iv); if (!window.Chatling) $('adapter-note').textContent = ''; }
  }, 1000);
  window.addEventListener('lingua:update', function () { try { pushVars(); } catch (e) { /* ignore */ } });

  /* auto-detect codes in bot messages (same-document DOM only; cross-origin iframes cannot be read) */
  var seenCodes = {};
  function scan(text) {
    if (!text || text.indexOf('LB') < 0 && text.indexOf('lb') < 0) return;
    var m = String(text).match(CODE_RE);
    if (!m) return;
    m.forEach(function (c) {
      var key = c.toUpperCase();
      if (seenCodes[key]) return;
      seenCodes[key] = 1;
      input.value = key; input.dispatchEvent(new Event('input'));
      sync(key, true);
    });
  }
  try {
    var skip = $('sync-form'), obs = new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        mu.addedNodes.forEach(function (n) {
          if (!n || (skip && skip.contains(n)) || (decoded && decoded.contains(n)) || (n.closest && n.closest('.side'))) return;
          scan(n.textContent);
        });
        if (mu.type === 'characterData' && mu.target.parentNode && !(mu.target.parentNode.closest && mu.target.parentNode.closest('.side'))) scan(mu.target.data);
      });
    });
    obs.observe($('chatling-slot'), { childList: true, subtree: true, characterData: true });
    var shadowHost = document.body; // Chatling page_inline/floating nodes usually mount in the document body
    var obs2 = new MutationObserver(function (muts) {
      muts.forEach(function (mu) { mu.addedNodes.forEach(function (n) { if (n && n.id && /chtl|chatling/i.test(n.id)) obs.observe(n, { childList: true, subtree: true, characterData: true }); }); });
    });
    obs2.observe(shadowHost, { childList: true });
    document.querySelectorAll('[id^="chtl"], [id*="chatling" i]').forEach(function (n) { obs.observe(n, { childList: true, subtree: true, characterData: true }); });
  } catch (e) { /* MutationObserver unavailable */ }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    try { if (typeof d === 'object' && d) d = JSON.stringify(d); } catch (e) { return; }
    if (typeof d === 'string' && /LB-(EN|HI|ES|FR|ZH|OT)-/i.test(d)) scan(d);
  });

  /* Chatling slot: hide placeholder once a snippet is present */
  var slot = $('chatling-slot'), ph = $('chatling-placeholder');
  function check() { if (slot.querySelector('script, iframe, [id^="chtl"]') || document.querySelector('[id^="chtl"], iframe[src*="chatling"]')) ph.hidden = true; }
  check(); setTimeout(check, 1500); setTimeout(check, 4000);
  saveSess();
})();
