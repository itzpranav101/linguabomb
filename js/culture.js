/* culture.html: Culture Capsules, loaded lazily from data/culture.json */
(function () {
  'use strict';
  var L = window.Lingua, SP = window.LinguaSpeech;
  var tabs = document.getElementById('cap-tabs'), body = document.getElementById('cap-body'), note = document.getElementById('cap-note');
  var data = null, cur = 'es';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function li(a) { return a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); }
  function render() {
    var d = data.langs[cur];
    tabs.innerHTML = Object.keys(data.langs).map(function (k) { return '<button type="button" data-l="' + k + '" aria-pressed="' + (k === cur) + '">' + data.langs[k].flag + ' ' + esc(data.langs[k].name) + '</button>'; }).join('');
    var greet = d.greetings.map(function (g) {
      return '<div class="greet">' + (SP ? SP.button(g.t, d.speakLang, '', g.r) : '') + '<div><span class="w" lang="' + d.speakLang + '">' + esc(g.t) + '</span>' + (g.r ? '<small>' + esc(g.r) + '</small>' : '') + '<small>' + esc(g.use) + '</small></div></div>';
    }).join('');
    var fest = d.festivals.map(function (f) { return '<div><b>' + esc(f.name) + '</b><small>' + esc(f.when) + '</small><span style="font-size:.9rem">' + esc(f.about) + '</span></div>'; }).join('');
    body.innerHTML =
      '<div class="cap-grid">' +
      '<details class="card cap" data-topic="greetings" open><summary><h3 style="display:inline">👋 Greetings</h3></summary>' + greet + '</details>' +
      '<details class="card cap" data-topic="etiquette"><summary><h3 style="display:inline">🤝 Etiquette</h3></summary><ul>' + li(d.etiquette) + '</ul></details>' +
      '<details class="card cap do" data-topic="do"><summary><h3 style="display:inline">✅ Do</h3></summary><ul>' + li(d.do) + '</ul></details>' +
      '<details class="card cap dont" data-topic="dont"><summary><h3 style="display:inline">🚫 Don\'t</h3></summary><ul>' + li(d.dont) + '</ul></details>' +
      '<details class="card cap wide" data-topic="festivals"><summary><h3 style="display:inline">🎉 Festival calendar</h3></summary><div class="cal" style="margin-top:12px">' + fest + '</div></details></div>';
    note.textContent = data.note + ' Dates of lunar-calendar festivals change each year.';
    body.querySelectorAll('details').forEach(function (el) {
    });
  }
  tabs.addEventListener('click', function (e) { var b = e.target.closest('button[data-l]'); if (b) { cur = b.getAttribute('data-l'); render(); } });
  var q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
  fetch('data/culture.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    data = d; if (d.langs[q]) cur = q; render();
  }).catch(function () { body.innerHTML = '<div class="notice warn">Capsules did not load, big oof. Serve the site with <code>python3 -m http.server</code>.</div>'; });
})();
