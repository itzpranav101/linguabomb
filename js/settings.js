/* Settings + demo helpers. Only touches this browser's localStorage and the public sync channel. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var GROUPS = {
    progress: ['lingua.v1', 'lingua.cards.v1', 'lingua.daily'],
    setup: ['lingua.onboard.v2', 'lingua.session', 'lingua.name'],
    coach: ['lingua.coach.v1'],
    sync: ['lingua.sync.seen', 'lingua.sync.run'],
    prefs: ['lingua.theme', 'lingua.voice', 'lingua.rate']
  };
  function keysFor(names) {
    var out = {}; names.forEach(function (g) { (GROUPS[g] || []).forEach(function (k) { out[k] = 1; }); });
    return Object.keys(out);
  }
  function clearKeys(extraAll) {
    var removed = 0;
    for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('lingua') === 0 && extraAll) { localStorage.removeItem(k); removed++; } }
    return removed;
  }
  function say(t) { $('msg').textContent = t; }
  function dump() {
    var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('lingua') === 0) { var v = localStorage.getItem(k); o[k] = v.length > 140 ? v.slice(0, 140) + '...' : v; } }
    $('dump').textContent = Object.keys(o).length ? JSON.stringify(o, null, 2) : '(nothing stored - fresh start)';
  }
  $('reset-all').addEventListener('click', function () {
    if (!confirm('Reset everything on this device? Your name, XP, streak and badges will be erased.')) return;
    try { clearKeys(true); } catch (e) { /* ignore */ }
    say('Everything cleared. Reloading...'); setTimeout(function () { location.href = 'index.html'; }, 600);
  });
  $('clear-sel').addEventListener('click', function () {
    var sel = []; ['progress', 'setup', 'coach', 'sync', 'prefs'].forEach(function (g) { if ($('c-' + g).checked) sel.push(g); });
    if (!sel.length) { say('Tick at least one box.'); return; }
    keysFor(sel).forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } });
    say('Cleared: ' + sel.join(', ') + '. Reload other tabs to see it.'); dump();
  });
  $('refresh').addEventListener('click', dump);

  /* demo: post bot-style lines to the live channel; sync.js (listening on every page) turns them into XP etc. */
  var ACTS = [['Learn phrases', ''], ['Grammar', ''], ['Practice', ''], ['Role-play', ''], ['Final quiz', ''],
    ['Extras', 'WELL DONE you nailed the greetings and kept the role-play going. IMPROVE verb endings and word order. TIP say each new phrase out loud twice before moving on.']];
  function send(act, note) {
    var cfg = window.LINGUA_CONFIG; if (!cfg) return Promise.reject(new Error('config not loaded yet'));
    var body = ['LBSYNC', $('d-lang').value, 'Beginner', act, $('d-name').value.trim() || 'Learner', note || ''].join('|');
    return fetch(cfg.NTFY_BASE + '/' + cfg.NTFY_TOPIC, { method: 'POST', body: body });
  }
  var st = $('demo-status');
  $('demo-one').addEventListener('click', function () {
    send(ACTS[0][0], '').then(function () { st.textContent = 'Sent. Watch the XP chip in the header.'; }).catch(function (e) { st.textContent = 'Could not send: ' + e.message; });
  });
  $('demo-full').addEventListener('click', function () {
    var i = 0; st.textContent = 'Playing demo...';
    (function next() {
      if (i >= ACTS.length) { st.textContent = 'Demo finished. Open Progress to see everything.'; return; }
      var a = ACTS[i++]; send(a[0], a[1]).then(function () { st.textContent = 'Sent: ' + a[0] + ' (' + i + '/' + ACTS.length + ')'; setTimeout(next, 2500); }).catch(function (e) { st.textContent = 'Could not send: ' + e.message; });
    })();
  });
  window.addEventListener('lingua:update', dump);
  dump();
})();
