/* progress.html: premium dashboard, driven only by tutor progress codes (window.Lingua) */
(function () {
  'use strict';
  var L = window.Lingua, UI = window.LinguaUI || { confetti: function () {} };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var FLAG = { EN: '🇬🇧', HI: '🇮🇳', ES: '🇪🇸', FR: '🇫🇷', ZH: '🇨🇳', OT: '🌐' };
  var LT = {
    L: ['Vocabulary', 'L = Learn phrases: the tutor taught you new words and phrases (15 XP).'],
    G: ['Grammar', 'G = Grammar: a short grammar lesson (15 XP).'],
    P: ['Practice', 'P = Practice round: drills and exercises (20 XP).'],
    R: ['Conversation', 'R = Role-play: a real-life conversation, e.g. ordering food (30 XP).'],
    Q: ['Quiz', 'Q = Quiz: a scored check of what stuck (25 XP + 10 per point of the 0-8 score).'],
    X: ['Culture & extras', 'X = Extras: culture notes, bonus challenges and other activities (10 XP).']
  };
  var LVN = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
  var SEEN_KEY = 'lingua.badges.seen';
  var R1 = 2 * Math.PI * 86, R2 = 2 * Math.PI * 64;
  var firstRender = true;

  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function seenGet() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || null; } catch (e) { return null; } }
  function seenSet(a) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } }
  function chips(counts, hideZero) {
    return '<div class="lts">' + 'LGPRQX'.split('').map(function (c) {
      var n = counts[c] || 0; if (hideZero && !n) return '';
      return '<span class="lt lt-' + c + (n ? '' : ' zero') + '" tabindex="0" title="' + esc(LT[c][1]) + '" aria-label="' + esc(LT[c][1] + ' Done ' + n + ' times.') + '"><i>' + c + '</i>' + (n ? '&times;' + n : LT[c][0]) + '</span>';
    }).join('') + '</div>';
  }

  function radar(s) {
    var keys = 'LGPRQX'.split(''), n = keys.length, cx = 150, cy = 150, R = 100, g = '', max = 3;
    keys.forEach(function (c) { if (s.letters[c] > max) max = s.letters[c]; });
    function pt(k, f) { var a = -Math.PI / 2 + k * 2 * Math.PI / n; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; }
    [.25, .5, .75, 1].forEach(function (f) { g += '<polygon class="grid" points="' + keys.map(function (c, k) { return pt(k, f).join(','); }).join(' ') + '"/>'; });
    keys.forEach(function (c, k) { var p = pt(k, 1); g += '<line class="grid" x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '"/>'; });
    g += '<polygon class="shape" points="' + keys.map(function (c, k) { return pt(k, Math.max(.04, s.letters[c] / max)).join(','); }).join(' ') + '"/>';
    keys.forEach(function (c, k) { var p = pt(k, 1.22); g += '<text x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle" dominant-baseline="middle">' + LT[c][0].split(' ')[0] + '</text>'; });
    $('radar').innerHTML = '<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false">' + g + '</svg>';
    $('radar').setAttribute('aria-label', 'Radar chart of activities done: ' + keys.map(function (c) { return LT[c][0] + ' ' + s.letters[c]; }).join(', '));
  }
  function spark(s) {
    var h = s.quizHist.slice(-12), el = $('spark');
    if (!h.length) { el.innerHTML = '<p class="note">No quiz scores yet. Finish a tutor quiz (Q) and flex it here.</p>'; $('spark-note').textContent = ''; return; }
    var W = 320, H = 130, pad = 22, step = h.length > 1 ? (W - pad * 2) / (h.length - 1) : 0;
    var pts = h.map(function (q, i) { return [pad + (h.length > 1 ? i * step : (W - pad * 2) / 2), H - pad - (q.score / 8) * (H - pad * 2)]; });
    var line = pts.map(function (p) { return p.join(','); }).join(' ');
    var area = pad + ',' + (H - pad) + ' ' + line + ' ' + pts[pts.length - 1][0] + ',' + (H - pad);
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><text x="2" y="' + (pad + 4) + '">8</text><text x="2" y="' + (H - pad + 4) + '">0</text><polygon class="area" points="' + area + '"/><polyline class="ln" points="' + line + '"/>' +
      pts.map(function (p) { return '<circle class="pt" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; }).join('') + '</svg>';
    el.setAttribute('aria-label', 'Quiz scores out of 8: ' + h.map(function (q) { return q.score; }).join(', '));
    var avg = h.reduce(function (a, q) { return a + q.score; }, 0) / h.length;
    $('spark-note').textContent = 'Last ' + h.length + ' quizzes out of 8. Average ' + avg.toFixed(1) + ', latest ' + h[h.length - 1].score + '.';
  }

  function render() {
    var s = L.getState(), dgoal = Number(s.settings.dailyGoal) || 50;
    $('empty').hidden = s.xp > 0 || s.sessions.length > 0;
    $('s-level').textContent = 'Level ' + s.level;
    $('ring-xp').textContent = s.xp;
    $('rank-label').textContent = s.rank.name;
    $('rank-note').innerHTML = s.rank.next ? '<b>' + s.rank.toNext + ' XP</b> to ' + esc(s.rank.next) + ' (' + s.xp + ' / ' + s.rank.nextAt + ')' : s.xp + ' XP, top rank reached. Main character energy!';
    var rb = $('rank-bar'); rb.setAttribute('aria-valuenow', s.rank.pct); rb.firstElementChild.style.width = s.rank.pct + '%';
    var gp = Math.min(1, s.todayXP / dgoal);
    $('ring-img').setAttribute('aria-label', 'Rank progress ' + s.rank.pct + ' percent. Today ' + s.todayXP + ' of ' + dgoal + ' XP.');
    requestAnimationFrame(function () {
      $('ring-rank').style.strokeDashoffset = R1 * (1 - s.rank.pct / 100);
      $('ring-goal').style.strokeDashoffset = R2 * (1 - gp);
    });
    $('s-streak').textContent = s.streak; $('s-longest').textContent = s.longest;
    $('flame').className = 'flame' + (s.streak ? '' : ' cold');
    $('s-today').textContent = s.activeToday ? 'Locked in today' : (s.streak ? 'Chat today to keep it alive' : 'Chat with the tutor to start one');
    $('goal').value = dgoal;
    $('goal-note').textContent = s.todayXP + ' / ' + dgoal + ' XP' + (gp >= 1 ? ' done!' : '');
    var gb = $('goal-bar'); gb.setAttribute('aria-valuenow', Math.round(gp * 100)); gb.firstElementChild.style.width = Math.round(gp * 100) + '%';
    if (document.activeElement !== $('pname')) $('pname').value = s.settings.name || '';

    var dow = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], html = dow.map(function (d) { return '<div class="dow" aria-hidden="true">' + d + '</div>'; }).join('');
    var first = (s.calendar[0].weekday + 6) % 7, i;
    for (i = 0; i < first; i++) html += '<div class="cell void" aria-hidden="true"></div>';
    var today = L.dayStr();
    s.calendar.forEach(function (c) {
      var lvl = c.n === 0 ? '' : c.n < 2 ? ' l1' : c.n < 3 ? ' l2' : ' l3', xp = s.dayXP[c.date];
      var tip = c.date + ': ' + (c.n ? c.n + ' sync' + (c.n > 1 ? 's' : '') + (xp ? ', ' + xp + ' XP' : '') : 'no sync');
      html += '<div class="cell' + lvl + (c.date === today ? ' today' : '') + '" role="listitem" title="' + tip + '" aria-label="' + tip + '">' + Number(c.date.slice(8)) + '</div>';
    });
    $('heat').innerHTML = html;

    radar(s); spark(s);
    var max = 1; ['EN', 'HI', 'ES', 'FR', 'ZH'].forEach(function (c) { if (s.byLang[c].xp > max) max = s.byLang[c].xp; });
    var codes = ['EN', 'HI', 'ES', 'FR', 'ZH'];
    if (s.byLang.OT.xp > 0) codes.push('OT');
    $('lang-cards').innerHTML = codes.map(function (c) {
      var l = s.byLang[c], pct = Math.round(l.xp / max * 100), started = l.xp > 0 || l.levels.length;
      return '<article class="card lcard' + (started ? '' : ' idle') + '"><div class="lcard-head"><span class="fl" aria-hidden="true">' + FLAG[c] + '</span><div><b>' + esc(l.name) + '</b><small class="note">' + (started ? 'Sessions landed' : 'Not started yet') + '</small></div><span class="lvl ' + (l.level || '') + '">' + (l.level ? LVN[l.level] : 'No level yet') + '</span></div>' +
        '<div class="bar" role="progressbar" aria-label="' + esc(l.name) + ' XP" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + l.xp + '"><i class="c-' + c.toLowerCase() + '" style="width:' + pct + '%"></i></div>' +
        '<div class="meta"><span>' + l.xp + ' XP</span><span>Last quiz: ' + (l.score === null ? 'none yet' : l.score + ' / 8') + '</span></div>' + chips(l.counts, false) +
        (started ? '' : '<a class="btn btn-sm btn-ghost" style="border:1.5px solid var(--ink);justify-self:start" href="tutor.html?lang=' + c.toLowerCase() + '">Start with the tutor</a>') + '</article>';
    }).join('');

    var earnedIds = s.badges.filter(function (b) { return b.earned; }).map(function (b) { return b.id; });
    var seen = seenGet(), fresh = seen ? earnedIds.filter(function (id) { return seen.indexOf(id) < 0; }) : [];
    $('badge-count').textContent = earnedIds.length + ' / ' + s.badges.length + ' unlocked';
    $('badges').innerHTML = s.badges.map(function (b) {
      var pb = b.earned ? '' : '<div class="pb" aria-hidden="true"><i style="width:' + Math.round(b.progress[0] / b.progress[1] * 100) + '%"></i></div>';
      return '<div class="badge' + (b.earned ? ' earned' : '') + (fresh.indexOf(b.id) >= 0 ? ' fresh' : '') + '"><span class="ic" aria-hidden="true">' + b.icon + '</span><b>' + esc(b.name) + '</b><small>' + (b.earned ? esc(b.desc) : esc(b.desc) + ' (' + b.progress[0] + '/' + b.progress[1] + ')') + '</small>' + pb + '<span class="sr-only">' + (b.earned ? 'Unlocked' : 'Locked') + '</span></div>';
    }).join('');
    if (fresh.length && !firstRender) UI.confetti({ count: 90 });
    if (fresh.length || !seen) seenSet(earnedIds);
    firstRender = false;

    $('activity').innerHTML = s.sessions.length ? s.sessions.slice(0, 25).map(function (e) {
      var counts = {}; (e.done || '').split('').forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
      return '<li><b>+' + e.xp + ' XP</b> ' + (FLAG[e.lang] || '') + ' <code>' + esc(e.code) + '</code><small>' + new Date(e.t).toLocaleString() + ' (' + ago(e.t) + ') &middot; ' + esc(LVN[e.level] || '') + (e.done && e.done.indexOf('Q') >= 0 ? ' &middot; quiz ' + e.score + '/8' : '') + '</small>' + chips(counts, true) + '</li>';
    }).join('') : '<li><span class="note">Nothing yet. <a href="tutor.html">Chat with the tutor</a> and your sessions show up here on their own.</span></li>';

    $('earn').innerHTML = 'LGPRQX'.split('').map(function (c) {
      var xp = { L: '15', G: '15', P: '20', R: '30', Q: '25 + 10 x score', X: '10' }[c];
      return '<tr><td><span class="lt lt-' + c + '" title="' + esc(LT[c][1]) + '"><i>' + c + '</i>' + LT[c][0] + '</span></td><td>' + xp + ' XP</td></tr>';
    }).join('');
  }

  window.addEventListener('lingua:sync', function () { var r = $('ring-img'); r.classList.remove('pulse'); void r.offsetWidth; r.classList.add('pulse'); });

  /* goal + name */
  $('goal-save').addEventListener('click', function () {
    var v = Math.max(10, Math.min(2000, parseInt($('goal').value, 10) || 50));
    L.setSetting('dailyGoal', v); L.toast("Today's goal set to " + v + ' XP.', 'ok');
  });
  $('pname').addEventListener('change', function () { L.setSetting('name', $('pname').value.trim().slice(0, 24)); });

  /* export / import */
  $('export').addEventListener('click', function () {
    var blob = new Blob([L.exportData()], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'linguabomb-progress-' + L.dayStr() + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    $('io-note').textContent = 'Exported. Keep the file somewhere safe; import it on any device to restore.';
  });
  $('import').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 2e6) { $('io-note').textContent = 'That file is too large to be a progress export.'; return; }
    var fr = new FileReader();
    fr.onload = function () {
      var r = L.importData(String(fr.result));
      $('io-note').textContent = r.ok ? 'Imported! Your progress now shows ' + r.xp + ' XP.' : r.error;
      if (r.ok) L.toast('Progress imported.', 'ok');
    };
    fr.readAsText(f); e.target.value = '';
  });

  /* share card (canvas -> PNG) */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function makeCard() {
    var s = L.getState(), cv = $('share-canvas'), g = cv.getContext('2d'), W = 1080, H = 1350, name = s.settings.name || 'Learner';
    var F = '"Inter Tight", system-ui, -apple-system, "Segoe UI", sans-serif';
    g.fillStyle = '#FEF9EC'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#DDFF6E'; g.fillRect(0, 0, W, 430);
    g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 430); g.lineTo(W, 430); g.stroke();
    g.fillStyle = '#111'; g.font = '700 44px ' + F; g.fillText('LinguaBomb', 60, 100);
    g.font = '500 34px ' + F; g.fillText(name + "'s progress", 60, 160);
    // pill with rank
    g.font = '700 110px ' + F; var tw = g.measureText(s.rank.name).width + 70;
    g.fillStyle = '#F0A8F4'; rr(g, 60, 215, tw, 150, 75); g.fill(); g.stroke();
    g.fillStyle = '#111'; g.fillText(s.rank.name, 95, 328);
    // big XP
    g.font = '700 220px ' + F; g.fillStyle = '#111'; g.fillText(String(s.xp), 60, 640);
    g.font = '500 44px ' + F; g.fillText('total XP  |  level ' + s.level, 70, 705);
    // ring
    var cx = 830, cy = 590, r = 130;
    g.lineWidth = 26; g.lineCap = 'round'; g.strokeStyle = 'rgba(17,17,17,.12)'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    g.strokeStyle = '#6C8BFF'; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, s.rank.pct / 100)); g.stroke();
    g.fillStyle = '#111'; g.font = '700 52px ' + F; g.textAlign = 'center'; g.fillText(s.rank.pct + '%', cx, cy + 18); g.font = '500 24px ' + F; g.fillText(s.rank.next ? 'to ' + s.rank.next : 'max rank', cx, cy + 52); g.textAlign = 'left';
    g.lineWidth = 3; g.lineCap = 'butt';
    // stat tiles
    var tiles = [['Streak', s.streak + ' days', '#DDFF6E'], ['Longest', s.longest + ' days', '#6C8BFF'], ['Sessions', String(s.sessions.length), '#F0A8F4']];
    tiles.forEach(function (t, i) {
      var x = 60 + i * 330; g.fillStyle = t[2]; rr(g, x, 770, 300, 150, 28); g.fill(); g.strokeStyle = '#111'; g.stroke();
      g.fillStyle = '#111'; g.font = '500 28px ' + F; g.fillText(t[0], x + 24, 818); g.font = '700 52px ' + F; g.fillText(t[1], x + 24, 886);
    });
    // languages
    var langs = ['EN', 'HI', 'ES', 'FR', 'ZH'].map(function (c) { return s.langs[c]; }).sort(function (a, b) { return b.xp - a.xp; }), mx = Math.max(1, langs[0].xp);
    g.font = '700 36px ' + F; g.fillStyle = '#111'; g.fillText('Languages', 60, 995);
    langs.slice(0, 5).forEach(function (l, i) {
      var y = 1020 + i * 46; g.font = '500 28px ' + F; g.fillStyle = '#111'; g.fillText(l.name, 60, y + 28);
      g.fillStyle = 'rgba(17,17,17,.1)'; rr(g, 260, y + 6, 560, 26, 13); g.fill();
      g.fillStyle = '#6C8BFF'; rr(g, 260, y + 6, Math.max(26, 560 * l.xp / mx), 26, 13); g.fill();
      g.fillStyle = '#111'; g.fillText(l.xp + ' XP', 840, y + 28);
    });
    // badges
    var earned = s.badges.filter(function (b) { return b.earned; });
    g.font = '40px ' + F; g.fillStyle = '#111';
    g.fillText(earned.length ? earned.slice(0, 12).map(function (b) { return b.icon; }).join(' ') : 'First badge coming soon', 60, 1300);
    g.font = '500 24px ' + F; g.textAlign = 'right'; g.fillText(earned.length + '/' + s.badges.length + ' badges', W - 60, 1296); g.textAlign = 'left';
    cv.hidden = false;
    var a = $('card-dl');
    cv.toBlob(function (b) { if (!b) return; if (a._u) URL.revokeObjectURL(a._u); a._u = URL.createObjectURL(b); a.href = a._u; a.hidden = false; }, 'image/png');
  }
  $('card-btn').addEventListener('click', function () {
    var go = function () { try { makeCard(); } catch (e) { $('io-note').textContent = 'Could not draw the card in this browser.'; } };
    if (document.fonts && document.fonts.load) document.fonts.load('700 40px "Inter Tight"').then(go, go); else go();
  });

  var dlg = $('confirm');
  $('reset').addEventListener('click', function () {
    if (dlg && dlg.showModal) dlg.showModal();
    else if (window.confirm('Reset all progress? This cannot be undone.')) L.reset();
  });
  if (dlg) dlg.addEventListener('close', function () { if (dlg.returnValue === 'yes') { L.reset(); L.toast('Progress reset.', 'info'); } });
  window.addEventListener('lingua:update', render);
  render();
})();
