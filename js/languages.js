/* Fills the "top 10 words" previews on languages.html from data/<xx>.json */
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  document.querySelectorAll('[data-words]').forEach(function (ul) {
    var xx = ul.getAttribute('data-words');
    fetch('data/' + xx + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      var top = d.words.filter(function (w) { return w.e; }).slice(0, 10);
      ul.innerHTML = top.map(function (w) {
        return '<li>' + (window.LinguaSpeech ? LinguaSpeech.button(w.w, xx, '', w.r) : '') + '<span class="w" lang="' + xx + '">' + esc(w.w) + '</span>' + (w.r ? '<span class="r">' + esc(w.r) + '</span>' : '') + '<span class="e">' + esc(w.e) + '</span></li>';
      }).join('') || '<li class="skeleton">No words available yet.</li>';
    }).catch(function () {
      ul.innerHTML = '<li class="skeleton">Could not load words. Serve the site with <code>python3 -m http.server</code> instead of opening the file directly.</li>';
    });
  });

  /* voice test panel */
  var vt = document.getElementById('voice-table');
  var SAMPLES = { en: ['Hello, how are you?', ''], hi: ['नमस्ते, आप कैसे हैं?', 'namaste, aap kaise hain'], es: ['Hola, ¿cómo estás?', ''], fr: ['Bonjour, comment allez-vous ?', ''], zh: ['你好，你好吗？', 'ni hao, ni hao ma'] };
  var NAMES = { en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', zh: 'Mandarin' };
  function drawVoices() {
    var SP = window.LinguaSpeech;
    if (!vt || !SP) return;
    if (!SP.supported()) { vt.innerHTML = '<tr><td>This browser cannot speak text aloud. Try Chrome, Edge or Safari.</td></tr>'; return; }
    var rows = SP.voiceTable();
    document.getElementById('voice-count').textContent = SP.allVoices().length + ' voices installed';
    vt.innerHTML = '<tr><th scope="col">Language</th><th scope="col">Voice found</th><th scope="col">Test</th></tr>' + rows.map(function (r) {
      var st = r.how === 'native' ? r.name : r.how === 'fallback' ? 'None. Fallback: ' + r.name : 'No voices at all';
      return '<tr><td>' + NAMES[r.lang] + '</td><td>' + esc(st) + (r.how !== 'native' ? '<br><small>' + esc(SP.INSTR[r.lang]) + '</small>' : '') + '</td><td>' + SP.button(SAMPLES[r.lang][0], r.lang, 'Play a ' + NAMES[r.lang] + ' sample', SAMPLES[r.lang][1]) + '</td></tr>';
    }).join('');
  }
  if (vt && window.LinguaSpeech) {
    LinguaSpeech.ensureVoices().then(drawVoices);
    drawVoices();
    var rb = document.getElementById('voice-refresh');
    if (rb) rb.addEventListener('click', function () { LinguaSpeech.ensureVoices().then(drawVoices); drawVoices(); });
  }
  if (location.hash) { var t = document.querySelector(location.hash); if (t) t.scrollIntoView(); }
})();
