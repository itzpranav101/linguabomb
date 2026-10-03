/* LinguaBomb speech: text-to-speech (speechSynthesis) + speaking practice (SpeechRecognition).
 * Exposes window.LinguaSpeech. Everything degrades gracefully when the browser lacks support.
 * Buttons: <button class="speak" data-say="Hola" data-lang="es"> are wired by delegation.
 */
(function () {
  'use strict';
  var LOCALE = { en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR', zh: 'zh-CN' };
  var RKEY = 'lingua.rate';
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var voices = [];
  var rate = 0.9;
  try { var r0 = parseFloat(localStorage.getItem(RKEY)); if (r0 >= 0.5 && r0 <= 1.5) rate = r0; } catch (e) { /* ignore */ }
  var PREFER = { hi: /lekha|kalpana|hemant|google.*hindi|hindi/i, zh: /ting-?ting|tingting|meijia|sin-?ji|google.*(chinese|mandarin)|xiaoxiao|huihui|chinese|mandarin/i,
    es: /monica|m[oó]nica|paulina|jorge|diego|google.*espa|spanish|espa/i, fr: /thomas|am[eé]lie|amelie|audrey|google.*fran|french|fran/i, en: /samantha|daniel|karen|google.*us|english/i };
  var INSTR = {
    hi: 'No Hindi voice found. macOS: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices > add Hindi (Lekha). Windows: Settings > Time & language > Speech > Add voices > Hindi. Then reload this page.',
    zh: 'No Mandarin voice found. macOS: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices > add Chinese (China mainland) "Ting-Ting". Windows: Settings > Time & language > Speech > Add voices > Chinese. Then reload.',
    es: 'No Spanish voice found. macOS: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices > add Spanish (Spain). Then reload.',
    fr: 'No French voice found. macOS: System Settings > Accessibility > Spoken Content > System Voice > Manage Voices > add French (France). Then reload.',
    en: 'No English voice found. Check your system speech settings, then reload.'
  };

  function loadVoices() { if (synth) { try { voices = synth.getVoices() || []; } catch (e) { voices = []; } } return voices; }
  if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices); else synth.onvoiceschanged = loadVoices; }
  /* resolves once voices are available, polling for up to 3 s (Chrome/Safari load them lazily) */
  var voicesPromise = null;
  function ensureVoices() {
    if (!synth) return Promise.resolve([]);
    if (loadVoices().length) return Promise.resolve(voices);
    if (voicesPromise) return voicesPromise;
    voicesPromise = new Promise(function (res) {
      var t0 = Date.now(), iv = setInterval(function () {
        if (loadVoices().length || Date.now() - t0 > 3000) { clearInterval(iv); voicesPromise = null; res(voices); }
      }, 150);
    });
    return voicesPromise;
  }
  function lc(v) { return (v.lang || '').replace('_', '-').toLowerCase(); }
  function rankVoice(v, lang) { var sc = 0; if (PREFER[lang] && PREFER[lang].test(v.name)) sc += 2; if (v.localService) sc += 1; if (/premium|enhanced|natural/i.test(v.name)) sc += 1; return sc; }
  function best(list, lang) { return list.slice().sort(function (a, b) { return rankVoice(b, lang) - rankVoice(a, lang); })[0] || null; }
  /* exact locale first, then any voice whose language prefix matches */
  function voiceFor(lang) {
    var loc = (LOCALE[lang] || lang).toLowerCase(), base = loc.split('-')[0], i, exact = [], pre = [];
    for (i = 0; i < voices.length; i++) { var l = lc(voices[i]); if (l === loc) exact.push(voices[i]); else if (l.indexOf(base) === 0 || l.split('-')[0] === base) pre.push(voices[i]); }
    return best(exact, lang) || best(pre, lang);
  }
  /* fallback chain when the language has no voice: en-IN (reads Hinglish well) -> any English -> default */
  function fallbackVoice() {
    var enIn = voices.filter(function (v) { return lc(v) === 'en-in'; });
    var en = voices.filter(function (v) { return lc(v).indexOf('en') === 0; });
    return best(enIn, 'en') || best(en, 'en') || voices[0] || null;
  }
  function supported() { return !!synth && typeof SpeechSynthesisUtterance !== 'undefined'; }
  function hasVoice(lang) { return supported() && !!voiceFor(lang); }
  function voiceInfo(lang) {
    var v = voiceFor(lang);
    if (v) return { lang: lang, voice: v, name: v.name + ' (' + v.lang + ')', how: 'native' };
    var f = fallbackVoice();
    return { lang: lang, voice: f, name: f ? f.name + ' (' + f.lang + ')' : null, how: f ? 'fallback' : 'none' };
  }
  function voiceTable() { return ['en', 'hi', 'es', 'fr', 'zh'].map(voiceInfo); }

  function notify(msg) { if (window.Lingua && window.Lingua.toast) window.Lingua.toast(msg, 'info'); else if (window.alert && false) window.alert(msg); }
  var warned = {}, keepAlive = null;
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
  function speakNow(text, lang, opts) {
    var info = voiceInfo(lang), spoken = String(text).replace(/\s*\([^)]*\)\s*$/, ''), usedRom = false;
    if (info.how === 'fallback') {
      if (opts.rom) { spoken = opts.rom; usedRom = true; }   // romanisation is readable by an English voice
      if (!warned[lang]) { warned[lang] = 1; notify((INSTR[lang] || 'No voice for this language.') + (usedRom ? ' Meanwhile the romanisation is read with an English voice.' : '')); }
    }
    if (info.how === 'none') { if (!warned.none) { warned.none = 1; notify('No speech voices are available on this device. ' + (INSTR[lang] || '')); } if (opts.onend) opts.onend(); return false; }
    try { synth.cancel(); } catch (e) { /* ignore */ }
    var u = new SpeechSynthesisUtterance(spoken), started = false, finished = false;
    u.voice = info.voice; u.lang = info.voice.lang;   // lang always matches the chosen voice
    u.rate = opts.rate || rate; u.volume = 1; u.pitch = 1;
    var tip = 'Voice: ' + info.name + (info.how === 'fallback' ? (usedRom ? ' (fallback, reading romanisation)' : ' (fallback)') : '');
    if (opts.button) { opts.button.title = tip; }
    function done(failed) {
      if (finished) return; finished = true; stopKeepAlive();
      if (opts.onend) opts.onend();
      if (failed && !warned['f' + lang]) { warned['f' + lang] = 1; notify(INSTR[lang] || 'Speech failed in this browser.'); }
    }
    u.onstart = function () { started = true; };
    u.onend = function () { done(false); };
    u.onerror = function (ev) { done(!ev || (ev.error !== 'canceled' && ev.error !== 'interrupted')); };
    // Safari drops speak() immediately after cancel(); Chrome stops after ~15 s unless nudged
    setTimeout(function () {
      try { synth.speak(u); } catch (e) { done(true); return; }
      stopKeepAlive();
      keepAlive = setInterval(function () { if (!synth.speaking) { stopKeepAlive(); return; } synth.pause(); synth.resume(); }, 10000);
      setTimeout(function () { if (!started && !finished && !synth.speaking) { try { synth.cancel(); } catch (e) { /* ignore */ } done(true); } }, 2800);
    }, 60);
    return true;
  }
  function speak(text, lang, opts) {
    opts = opts || {};
    if (!supported()) { if (!warned.all) { warned.all = 1; notify('Speech is not supported in this browser. Try Chrome, Edge or Safari.'); } if (opts.onend) opts.onend(); return false; }
    if (voices.length || loadVoices().length) return speakNow(text, lang, opts);   // synchronous path keeps the user gesture (Safari)
    ensureVoices().then(function () { speakNow(text, lang, opts); });
    return true;
  }
  function setRate(r) { rate = Math.max(0.5, Math.min(1.5, Number(r) || 0.9)); try { localStorage.setItem(RKEY, String(rate)); } catch (e) { /* ignore */ } }
  ensureVoices();

  /* ---------- fuzzy comparison ---------- */
  function normalise(s, lang) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* old */ }
    s = s.replace(/ü/g, 'u').replace(/[0-9]/g, '');
    try { s = s.replace(/[^\p{L}\p{N}\sऀ-ॿ]/gu, ' '); } catch (e) { s = s.replace(/[.,!?;:'"()\-]/g, ' '); }
    return s.replace(/\s+/g, ' ').trim();
  }
  function lev(a, b) {
    var m = a.length, n = b.length, i, j, prev = [], cur;
    if (!m) return n; if (!n) return m;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarity(a, b, lang) {
    a = normalise(a, lang); b = normalise(b, lang);
    if (!a && !b) return 1; if (!a || !b) return 0;
    return 1 - lev(a, b) / Math.max(a.length, b.length);
  }
  /* target may be {t, r}: for Mandarin also compare against pinyin without tone marks */
  function score(transcript, item, lang) {
    var best = similarity(transcript, item.t, lang);
    if (item.r) best = Math.max(best, similarity(transcript, item.r, lang));
    return Math.round(best * 100);
  }

  /* ---------- recognition ---------- */
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function canListen() { return !!Rec; }
  var active = null;
  function listen(lang, cb) {
    if (!Rec) { cb({ error: 'unsupported' }); return null; }
    if (active) { try { active.abort(); } catch (e) { /* ignore */ } }
    var r = new Rec(), done = false;
    r.lang = LOCALE[lang] || lang; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
    function finish(o) { if (done) return; done = true; active = null; cb(o); }
    r.onresult = function (ev) {
      var alts = [], res = ev.results[0], i;
      for (i = 0; i < res.length; i++) alts.push(res[i].transcript);
      finish({ transcripts: alts });
    };
    r.onerror = function (ev) { finish({ error: ev.error || 'error' }); };
    r.onnomatch = function () { finish({ error: 'no-match' }); };
    r.onend = function () { finish({ error: 'no-speech' }); };
    try { r.start(); active = r; } catch (e) { finish({ error: 'start-failed' }); }
    return r;
  }

  /* ---------- UI helpers ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function button(text, lang, label, rom) {
    return '<button type="button" class="speak" data-say="' + esc(text) + '"' + (rom ? ' data-rom="' + esc(rom) + '"' : '') + ' data-lang="' + esc(lang) + '" aria-label="' + esc(label || 'Listen: ' + text) + '" title="Listen">' + ICON + '</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.speak');
    if (!b) return;
    e.stopPropagation();
    b.classList.add('playing');
    var off = function () { b.classList.remove('playing'); };
    if (!speak(b.getAttribute('data-say'), b.getAttribute('data-lang'), { onend: off, rom: b.getAttribute('data-rom') || '', button: b })) off();
    setTimeout(off, 6000);
  }, true);
  function rateControl(host) {
    if (!host) return;
    host.innerHTML = '<label class="rate-ctl">Speech speed <input type="range" min="0.5" max="1.5" step="0.1" value="' + rate + '" aria-label="Speech speed"><output>' + rate.toFixed(1) + 'x</output></label><span class="voice-note" role="status"></span>';
    var inp = host.querySelector('input'), out = host.querySelector('output'), note = host.querySelector('.voice-note');
    inp.addEventListener('input', function () { setRate(inp.value); out.textContent = Number(inp.value).toFixed(1) + 'x'; });
    var msg = function () {
      if (!supported()) note.textContent = 'This browser cannot speak text aloud.';
      else note.textContent = '';
    };
    msg(); setTimeout(msg, 1200);
  }
  function voiceReport(lang) {
    if (!supported()) return 'Your browser does not support speech output.';
    loadVoices();
    if (voices.length && !hasVoice(lang)) return 'No ' + LOCALE[lang] + ' voice found on this device. ' + (INSTR[lang] || '');
    return '';
  }

  window.LinguaSpeech = {
    LOCALE: LOCALE, speak: speak, supported: supported, hasVoice: hasVoice, canListen: canListen, listen: listen,
    similarity: similarity, normalise: normalise, score: score, button: button, rateControl: rateControl,
    setRate: setRate, ensureVoices: ensureVoices, voiceTable: voiceTable, voiceInfo: voiceInfo, allVoices: function () { return loadVoices().slice(); }, INSTR: INSTR, getRate: function () { return rate; }, voiceReport: voiceReport, levenshtein: lev
  };
})();
