/* singlish.html: search + quiz over data/singlish.json (Wikipedia, CC BY-SA 4.0) */
(function () {
  'use strict';
  var L = window.Lingua;
  var body = document.getElementById('sing-body'), data = null, all = [], mode = 'browse', quiz = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function card(e) {
    return '<article class="card sing-card"><span class="sect">' + esc(e.section) + '</span><h3><span>' + esc(e.w) + '</span></h3><span class="origin">' + esc(e.o) + '</span><p style="margin:4px 0 0">' + esc(e.m) + '</p>' + (e.x ? '<q>' + esc(e.x) + '</q>' : '') + '</article>';
  }
  function browse() {
    body.innerHTML = '<div class="sing-search"><input id="q" type="search" placeholder="Search a word, meaning or origin (try: Hokkien, eat, lah)" aria-label="Search Singlish words"><select id="sec" class="native" aria-label="Filter by group"><option value="">All groups</option>' +
      data.sections.map(function (s) { return '<option>' + esc(s.name) + '</option>'; }).join('') + '</select></div><p class="hint-line" id="count" role="status"></p><div class="sing-grid" id="grid"></div>';
    var q = document.getElementById('q'), sec = document.getElementById('sec');
    function draw() {
      var t = q.value.trim().toLowerCase(), s = sec.value;
      var r = all.filter(function (e) { return (!s || e.section === s) && (!t || (e.w + ' ' + e.o + ' ' + e.m + ' ' + e.x).toLowerCase().indexOf(t) >= 0); });
      document.getElementById('count').textContent = r.length + ' of ' + all.length + ' words';
      document.getElementById('grid').innerHTML = r.length ? r.map(card).join('') : '<div class="notice">No match. Try a shorter search.</div>';
    }
    q.addEventListener('input', draw); sec.addEventListener('change', draw); draw();
  }
  function newQuiz() { quiz = { qs: shuffle(all).slice(0, 8), i: 0, ok: 0 }; ask(); }
  function ask() {
    var q = quiz.qs[quiz.i];
    if (!q) {
            if (window.LinguaUI && quiz.ok >= 7) LinguaUI.confetti();
      body.innerHTML = '<div class="result card"><div class="big-num">' + quiz.ok + '<span style="font-size:.4em">/' + quiz.qs.length + '</span></div><h2>' + (quiz.ok >= 7 ? 'Wah, you ate that quiz!' : 'Not bad, can level up!') + '</h2><p>Just for fun: XP only comes from your AI tutor.</p><div class="btn-row" style="justify-content:center"><button class="btn" id="again">Quiz again</button></div></div>';
      document.getElementById('again').onclick = newQuiz; return;
    }
    var opts = shuffle(shuffle(all).filter(function (e) { return e.m !== q.m; }).slice(0, 3).concat([q]));
    body.innerHTML = '<div class="quiz-box"><div class="progress-line"><i style="width:' + Math.round(quiz.i / quiz.qs.length * 100) + '%"></i></div><div class="q-small">Question ' + (quiz.i + 1) + ' of ' + quiz.qs.length + '</div><div class="q-prompt">What does "' + esc(q.w) + '" mean?</div><div class="options">' +
      opts.map(function (o, i) { return '<button class="opt" type="button" data-i="' + i + '"><kbd>' + (i + 1) + '</kbd><span>' + esc(o.m) + '</span></button>'; }).join('') + '</div><div id="fb"></div></div>';
    body.querySelectorAll('.opt').forEach(function (b, i) {
      b.onclick = function () {
        var ok = opts[i] === q; if (ok) quiz.ok++;
        body.querySelectorAll('.opt').forEach(function (x, k) { x.disabled = true; if (opts[k] === q) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        document.getElementById('fb').innerHTML = '<div class="feedback" role="status" style="margin-top:14px"><b>' + (ok ? 'Correct!' : 'Not quite.') + '</b> <i>' + esc(q.w) + '</i> comes from ' + esc(q.o) + '.</div><div class="btn-row" style="margin-top:14px"><button class="btn" id="nx">Next &rarr;</button></div>';
        var nx = document.getElementById('nx'); nx.focus(); nx.onclick = function () { quiz.i++; ask(); };
      };
    });
  }
  function show(m) {
    mode = m;
    document.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-m') === m)); b.tabIndex = b.getAttribute('data-m') === m ? 0 : -1; });
    if (m === 'quiz') newQuiz(); else browse();
  }
  document.querySelectorAll('[data-m]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-m')); }); });
  fetch('data/singlish.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    data = d; d.sections.forEach(function (s) { s.entries.forEach(function (e) { all.push({ w: e.w, o: e.o, m: e.m, x: e.x, section: s.name }); }); });
    show('browse');
  }).catch(function () { body.innerHTML = '<div class="notice warn">Could not load the decoder data. Serve the site with <code>python3 -m http.server</code>.</div>'; });
})();
