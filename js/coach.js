/* AI Coach cards: renders into [data-coach] containers from the notes LinguaSync stores. data-coach="full" | "compact" */
(function () {
  'use strict';
  var L = window.Lingua;
  var FLAG = { EN: '🇬🇧', HI: '🇮🇳', ES: '🇪🇸', FR: '🇫🇷', ZH: '🇨🇳', OT: '🌐' };
  var THEMES = [
    ['Verbs and tenses', /conjug|verb|tense|ending/i], ['Pronunciation and tones', /pronounc|accent|tone|sound|stress|intonation/i],
    ['Vocabulary', /vocab|word|phrase|remember|memor/i], ['Grammar', /grammar|gender|article|agreement|word order|plural|particle/i],
    ['Fluency and speed', /fluen|speed|slow|faster|hesitat|pause/i], ['Spelling and writing', /spell|writ|character|script|stroke/i],
    ['Listening', /listen|hear|understand/i]
  ];
  function readNotes() {
    if (window.LinguaSync) return window.LinguaSync.coachNotes();      // sync.js is injected after this file, so look it up lazily
    try { var a = JSON.parse(localStorage.getItem('lingua.coach.v1')); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(t) { var m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; return Math.round(h / 24) + ' d ago'; }
  function themes(notes) {
    var map = {};
    notes.slice(0, 10).forEach(function (n) {
      if (!n.improve) return;
      var key = 'Other focus', hit = THEMES.filter(function (t) { return t[1].test(n.improve); })[0];
      if (hit) key = hit[0];
      (map[key] = map[key] || { name: key, n: 0, ex: n.improve }).n++;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 4);
  }
  function trend(h) {
    h = h.slice(-10); if (h.length < 2) return '';
    var W = 220, H = 48, pts = h.map(function (q, i) { return (6 + i * (W - 12) / (h.length - 1)) + ',' + (H - 6 - q.score / 8 * (H - 12)); }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="trend" role="img" aria-label="Quiz score trend: ' + h.map(function (q) { return q.score; }).join(', ') + ' out of 8"><polyline points="' + pts + '" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function noteHtml(n, compact) {
    return '<div class="coach-latest"><div class="coach-meta"><span class="fl" aria-hidden="true">' + (FLAG[n.lang] || '') + '</span> <b>' + esc(n.code) + '</b> <small>' + ago(n.t) + '</small></div>' +
      (n.well ? '<p class="cn well"><b>Ate:</b> ' + esc(n.well) + '</p>' : '') + (n.improve ? '<p class="cn imp"><b>Level up:</b> ' + esc(n.improve) + '</p>' : '') + (n.tip ? '<p class="cn tip"><b>Pro tip:</b> ' + esc(n.tip) + '</p>' : '') + '</div>';
  }
  function render(el) {
    var compact = el.getAttribute('data-coach') === 'compact', notes = readNotes();
    var head = '<div class="coach-head"><span class="coach-ic" aria-hidden="true">🧠</span><h2 class="coach-title">AI Coach</h2></div>';
    if (!notes.length) {
      el.innerHTML = head + '<p class="coach-empty">Chat with the tutor, your coach notes appear here automatically. Your coach is waiting to hype you up.</p><a class="btn btn-sm" href="tutor.html">Chat with the tutor</a>';
      return;
    }
    var th = themes(notes), st = L.getState(), tr = trend(st.quizHist);
    var work = th.length ? '<h3 class="coach-h">What to work on</h3><ul class="coach-work">' + th.map(function (t) { return '<li><b>' + esc(t.name) + '</b>' + (t.n > 1 ? ' <span class="cnt">x' + t.n + '</span>' : '') + '<small>' + esc(t.ex) + '</small></li>'; }).join('') + '</ul>' : '';
    var hist = '<details class="coach-drawer"><summary>Coach history (' + notes.length + ')</summary><ol class="timeline">' + notes.map(function (n) {
      return '<li>' + (FLAG[n.lang] || '') + ' <code>' + esc(n.code) + '</code> <small>' + new Date(n.t).toLocaleString() + '</small>' + (n.well ? '<br>' + esc(n.well) : '') + (n.improve ? '<br><i>Work on:</i> ' + esc(n.improve) : '') + (n.tip ? '<br><i>Tip:</i> ' + esc(n.tip) : '') + '</li>';
    }).join('') + '</ol></details>';
    el.innerHTML = head + noteHtml(notes[0], compact) + (compact ? '' : work + (tr ? '<h3 class="coach-h">Quiz trend</h3>' + tr : '')) + (compact && th[0] ? '<p class="cn"><b>Focus:</b> ' + esc(th[0].name) + '</p>' : '') + hist;
  }
  function all() { document.querySelectorAll('[data-coach]').forEach(render); }
  window.addEventListener('lingua:coach', all);
  window.addEventListener('lingua:update', all);
  window.addEventListener('storage', all);
  all();
  window.LinguaCoach = { render: render, themes: themes };
})();
