/* LinguaBomb shared progress store. localStorage key: lingua.v1
 * Exposes window.Lingua. Emits window 'lingua:update' on every change.
 */
(function () {
  'use strict';
  var KEY = 'lingua.v1';
  var CARDS_KEY = 'lingua.cards.v1';
  var LANGS = { EN: 'English', HI: 'Hindi', ES: 'Spanish', FR: 'French', ZH: 'Mandarin', OT: 'Other' };
  var LEVELS = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
  var MULT = { B: 1, I: 1.25, A: 1.5 };
  var ACT_XP = { L: 15, G: 15, P: 20, R: 30, X: 10 }; // Q handled separately
  var ACT_NAME = { L: 'learn phrases', G: 'grammar', P: 'practice round', R: 'role-play', Q: 'quiz', X: 'extra' };
  var RANKS = [
    { name: 'Newbie', min: 0 },
    { name: 'Explorer', min: 200 },
    { name: 'Linguist', min: 600 },
    { name: 'Polyglot', min: 1500 }
  ];
  var BADGES = [
    { id: 'first_steps', name: 'Day One Energy', icon: '👣', desc: 'Land your first tutor session. The glow-up starts here.' },
    { id: 'phrase_collector', name: 'Phrase Hoarder', icon: '📚', desc: 'Finish 5 learn-phrases (L) modules. Collect them all.' },
    { id: 'grammar_guru', name: 'Grammar Slay', icon: '🧩', desc: 'Finish 3 grammar (G) modules. Rules? Handled.' },
    { id: 'practice_pro', name: 'Reps Era', icon: '🎯', desc: 'Finish 5 practice rounds (P). We love the grind.' },
    { id: 'roleplay_pro', name: 'Main Character', icon: '🎭', desc: 'Complete 3 role-plays (R). Main character energy only.' },
    { id: 'quiz_master', name: 'Quiz Menace', icon: '🏆', desc: 'Score 8/8 on a tutor quiz. You ate that.' },
    { id: 'culture_vulture', name: 'Culture Vulture', icon: '🏮', desc: 'Finish 3 extra / culture (X) activities. Big culture brain.' },
    { id: 'full_course', name: 'Whole Menu', icon: '💎', desc: 'One session with L, G, P, R and Q all done. Full send.' },
    { id: 'polyglot', name: 'It\'s Giving Polyglot', icon: '🌍', desc: 'Earn XP in 3 different languages.' },
    { id: 'step_up', name: 'Level Up Era', icon: '🪜', desc: 'Finish a session at Intermediate level. Glow up.' },
    { id: 'fearless', name: 'No Fear', icon: '🦁', desc: 'Finish a session at Advanced level. Absolute unit.' },
    { id: 'week_warrior', name: 'Streak Szn', icon: '🔥', desc: 'Reach a 7-day streak. Lowkey obsessed.' },
    { id: 'daily_devotee', name: 'Locked In', icon: '📅', desc: 'Reach a 3-day streak. Locked in.' },
    { id: 'early_bird', name: 'Rise and Grind', icon: '🌅', desc: 'Land a session before 8 am. Who are you?' },
    { id: 'night_owl', name: 'Night Owl', icon: '🦉', desc: 'Land a session after 10 pm. Sleep is optional.' }
  ];

  function blank() {
    return { v: 1, xp: 0, langXP: {}, days: {}, log: [], codes: {}, quizBest: {}, roleplays: 0, known: {}, badgeDates: {}, created: Date.now(), dayXP: {}, track: {}, settings: {}, quizHist: [] };
  }
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && typeof s === 'object') {
          var b = blank();
          for (var k in b) if (!(k in s)) s[k] = b[k];
          return s;
        }
      }
    } catch (e) { /* storage unavailable */ }
    return blank();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- dates ---------- */
  function dayStr(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }

  function streaks() {
    var keys = Object.keys(state.days).sort();
    var longest = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var d = parseDay(k);
      if (prev && dayStr(addDays(prev, 1)) === k) run++; else run = 1;
      if (run > longest) longest = run;
      prev = d;
    });
    var cur = 0, t = new Date();
    var has = function (d) { return state.days[dayStr(d)]; };
    if (!has(t)) t = addDays(t, -1); // streak survives until end of today
    while (has(t)) { cur++; t = addDays(t, -1); }
    return { current: cur, longest: longest };
  }

  /* ---------- ranks / badges ---------- */
  function rankFor(xp) {
    var r = RANKS[0], i, idx = 0;
    for (i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) { r = RANKS[i]; idx = i; }
    var next = RANKS[idx + 1] || null;
    return {
      name: r.name, index: idx, min: r.min,
      next: next ? next.name : null, nextAt: next ? next.min : null,
      pct: next ? Math.min(100, Math.round(((xp - r.min) / (next.min - r.min)) * 100)) : 100,
      toNext: next ? next.min - xp : 0
    };
  }
  function tcount(name) { return Object.keys((state.track && state.track[name]) || {}).length; }
  /* letters done per activity across every synced (language, level) */
  function letterCounts() {
    var c = { L: 0, G: 0, P: 0, R: 0, Q: 0, X: 0 };
    for (var k in state.codes) (state.codes[k].done || '').split('').forEach(function (ch) { if (c[ch] !== undefined) c[ch]++; });
    return c;
  }
  function badgeEval() {
    var st = streaks(), langs = 0, best = 0, l, lc = letterCounts(), full = false, mid = false, adv = false;
    for (l in state.langXP) if (l !== 'OT' && state.langXP[l] > 0) langs++;
    for (l in state.quizBest) if (state.quizBest[l] > best) best = state.quizBest[l];
    for (l in state.codes) {
      var d = state.codes[l].done || '', lv = l.split('-')[1];
      if (/L/.test(d) && /G/.test(d) && /P/.test(d) && /R/.test(d) && /Q/.test(d)) full = true;
      if (lv === 'I') mid = true; if (lv === 'A') adv = true;
    }
    var P = {
      first_steps: [Math.min(state.xp, 1), 1], phrase_collector: [Math.min(lc.L, 5), 5], grammar_guru: [Math.min(lc.G, 3), 3],
      practice_pro: [Math.min(lc.P, 5), 5], roleplay_pro: [Math.min(lc.R, 3), 3], quiz_master: [Math.min(best, 8), 8],
      culture_vulture: [Math.min(lc.X, 3), 3], full_course: [full ? 1 : 0, 1], polyglot: [Math.min(langs, 3), 3],
      step_up: [mid || adv ? 1 : 0, 1], fearless: [adv ? 1 : 0, 1], week_warrior: [Math.min(st.longest, 7), 7],
      daily_devotee: [Math.min(st.longest, 3), 3], early_bird: [Math.min(tcount('early'), 1), 1], night_owl: [Math.min(tcount('night'), 1), 1]
    };
    return BADGES.map(function (b) {
      return { id: b.id, name: b.name, icon: b.icon, desc: b.desc, earned: P[b.id][0] >= P[b.id][1], progress: P[b.id], date: state.badgeDates[b.id] || null };
    });
  }
  function checkBadges() {
    var changed = [];
    badgeEval().forEach(function (b) {
      if (b.earned && !state.badgeDates[b.id]) { state.badgeDates[b.id] = Date.now(); changed.push(b); }
    });
    return changed;
  }

  /* ---------- events / toast ---------- */
  function emit(detail) {
    try { window.dispatchEvent(new CustomEvent('lingua:update', { detail: detail || {} })); } catch (e) { /* old browser */ }
  }
  function toast(msg, kind) {
    if (!document.body) return;
    var box = document.getElementById('lingua-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'lingua-toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, 3600);
  }
  function afterChange(detail) {
    var nb = checkBadges();
    save();
    nb.forEach(function (b) { toast(b.icon + ' New badge, no cap: ' + b.name, 'badge'); });
    emit(detail);
  }
  function pushLog(entry) {
    entry.t = Date.now();
    state.log.unshift(entry);
    if (state.log.length > 80) state.log.length = 80;
  }

  /* ---------- public mutations ---------- */
  function markTrack(name, key) {
    state.track = state.track || {};
    state.track[name] = state.track[name] || {};
    if (state.track[name][key]) return false;
    state.track[name][key] = 1;
    return true;
  }
  /* track('culture','es:greetings'): remembers a unique event for badges. Returns true when new. */
  function setSetting(k, v) { state.settings = state.settings || {}; state.settings[k] = v; save(); emit({ type: 'settings' }); }
  function weekXP() {
    var t = new Date(), sum = 0, i;
    for (i = 0; i < 7; i++) sum += state.dayXP[dayStr(addDays(t, -i))] || 0;
    return sum;
  }
  function exportData() { return JSON.stringify({ app: 'LinguaBomb', version: 1, exported: new Date().toISOString(), progress: state }, null, 2); }
  function lsRead(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function importData(text) {
    var o;
    try { o = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { ok: false, error: 'That file is not valid JSON.' }; }
    if (!o || o.app !== 'LinguaBomb' || !o.progress || typeof o.progress.xp !== 'number') return { ok: false, error: 'That does not look like a LinguaBomb progress file.' };
    var b = blank(), s = o.progress;
    for (var k in b) if (!(k in s)) s[k] = b[k];
    state = s;
    save(); emit({ type: 'import' });
    return { ok: true, xp: state.xp };
  }
  function reset() {
    state = blank();
    try { localStorage.removeItem(CARDS_KEY); } catch (e) { /* ignore */ }
    save();
    emit({ type: 'reset' });
  }

  /* ---------- progress code ---------- */
  function parseCode(input) {
    var raw = String(input == null ? '' : input);
    var s = raw.toUpperCase();
    var m = /(^|[^A-Z])LB/.exec(s);
    if (!m) return { ok: false, error: 'That does not look like a progress code. Codes start with LB, for example LB-ES-B-7-LGPRQ.' };
    var rest = s.slice(m.index + m[0].length);
    var re = /([-_\s]*)([A-Z0-9]+)/y, tm, tokens = [];
    while ((tm = re.exec(rest))) tokens.push({ t: tm[2], sep: tm[1] });
    if (!tokens.length) return { ok: false, error: 'The code is missing its details. Try the full format: LB-ES-B-7-LGPRQ.' };
    var lang = null, level = null, score = null, done = null, bad = null, seen = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i].t;
      if (!lang && /^(EN|HI|ES|FR|ZH|OT)$/.test(tk)) lang = tk;
      else if (!level && /^[BIA]$/.test(tk)) level = tk;
      else if (score === null && /^\d{1,2}$/.test(tk)) score = parseInt(tk, 10);
      else if (/^[LGPRQX]+$/.test(tk)) done = (done || '') + tk;
      else {
        // free text after a plain space (e.g. "... thanks!") is ignored once something was recognised
        if (seen > 0 && /^\s+$/.test(tokens[i].sep)) break;
        bad = tk; break;
      }
      seen++;
    }
    if (bad) return { ok: false, error: 'Could not read "' + bad + '". Expected LB-<LANG>-<LEVEL>-<SCORE>-<DONE>, e.g. LB-FR-I-6-LPQ.' };
    if (score !== null && score > 8) return { ok: false, error: 'The quiz score must be between 0 and 8.' };
    var parsed = { lang: lang || 'OT', level: level || 'B', score: score === null ? 0 : score, done: done || '' };
    parsed.langName = LANGS[parsed.lang];
    parsed.levelName = LEVELS[parsed.level];
    parsed.xp = codeXP(parsed);
    parsed.canonical = 'LB-' + parsed.lang + '-' + parsed.level + '-' + parsed.score + '-' + parsed.done;
    parsed.activities = describeDone(parsed.done);
    return { ok: true, parsed: parsed };
  }
  function codeXP(p) {
    var sum = 0, i, c;
    for (i = 0; i < p.done.length; i++) {
      c = p.done.charAt(i);
      sum += c === 'Q' ? 25 + 10 * p.score : ACT_XP[c] || 0;
    }
    return Math.round(sum * (MULT[p.level] || 1));
  }
  function describeDone(done) {
    var counts = {}, out = [];
    done.split('').forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    'LGPRQX'.split('').forEach(function (c) { if (counts[c]) out.push({ code: c, name: ACT_NAME[c], count: counts[c] }); });
    return out;
  }
  function applyProgressCode(code, quiet) {
    var res = parseCode(code);
    if (!res.ok) return res;
    var p = res.parsed, key = p.lang + '-' + p.level;
    var prev = state.codes[key] || { done: '', score: 0 };
    var prevXP = codeXP({ done: prev.done, score: prev.score, level: p.level });
    var newer = p.done.length > prev.done.length || (p.done.length === prev.done.length && p.score > prev.score);
    var gain = 0;
    if (newer) {
      gain = Math.max(0, p.xp - prevXP);
      // role-play count: difference in R letters
      var rOld = (prev.done.match(/R/g) || []).length, rNew = (p.done.match(/R/g) || []).length;
      if (rNew > rOld) state.roleplays += rNew - rOld;
      var best = Math.max(prev.score, p.score);
      state.codes[key] = { done: p.done, score: p.score };
      if (p.done.indexOf('Q') >= 0 && p.score > (state.quizBest[p.lang] || 0)) state.quizBest[p.lang] = p.score;
      state.xp += gain;
      state.langXP[p.lang] = (state.langXP[p.lang] || 0) + gain;
      var d = dayStr();
      state.days[d] = (state.days[d] || 0) + 1;
      state.dayXP[d] = (state.dayXP[d] || 0) + gain;
      var hr = new Date().getHours();
      if (hr < 8) markTrack('early', d); else if (hr >= 22) markTrack('night', d);
      if (p.done.indexOf('Q') >= 0) { state.quizHist = state.quizHist || []; state.quizHist.push({ t: Date.now(), lang: p.lang, score: p.score }); if (state.quizHist.length > 40) state.quizHist.shift(); }
      pushLog({ xp: gain, reason: 'Tutor session synced (' + p.canonical + ')', lang: p.lang, code: p.canonical, level: p.level, score: p.score, done: p.done });
      afterChange({ type: 'code', code: p.canonical });
    }
    res.gain = gain;
    res.duplicate = !newer;
    res.message = gain > 0 ? 'Slay! +' + gain + ' XP from your ' + p.langName + ' session.' :
      'Already counted, no double dipping.';
    if (!quiet) toast(res.message, gain > 0 ? 'ok' : 'info');
    return res;
  }

  /* ---------- derived state ---------- */
  function byLang() {
    var out = {}, k;
    Object.keys(LANGS).forEach(function (c) { out[c] = { code: c, name: LANGS[c], xp: state.langXP[c] || 0, levels: [], score: null, counts: { L: 0, G: 0, P: 0, R: 0, Q: 0, X: 0 } }; });
    for (k in state.codes) {
      var parts = k.split('-'), o = out[parts[0]]; if (!o) continue;
      if (o.levels.indexOf(parts[1]) < 0) o.levels.push(parts[1]);
      (state.codes[k].done || '').split('').forEach(function (ch) { if (o.counts[ch] !== undefined) o.counts[ch]++; });
    }
    (state.quizHist || []).forEach(function (q) { if (out[q.lang]) out[q.lang].score = q.score; });
    for (k in out) { var lv = out[k].levels; out[k].level = lv.indexOf('A') >= 0 ? 'A' : lv.indexOf('I') >= 0 ? 'I' : lv.length ? 'B' : null; }
    return out;
  }
  function getState() {
    var st = streaks(), today = new Date(), cal = [], i;
    for (i = 27; i >= 0; i--) {
      var d = addDays(today, -i), k = dayStr(d);
      cal.push({ date: k, weekday: d.getDay(), n: state.days[k] || 0 });
    }
    var langs = {};
    Object.keys(LANGS).forEach(function (k) { langs[k] = { code: k, name: LANGS[k], xp: state.langXP[k] || 0 }; });
    var best = 0; for (var l in state.quizBest) if (state.quizBest[l] > best) best = state.quizBest[l];
    return {
      xp: state.xp,
      rank: rankFor(state.xp),
      level: Math.floor(state.xp / 100) + 1,
      streak: st.current, longest: st.longest,
      calendar: cal,
      langs: langs,
      badges: badgeEval(),
      log: state.log.slice(),
      quizBest: best,
      roleplays: state.roleplays,
      codes: JSON.parse(JSON.stringify(state.codes)),
      activeToday: !!state.days[dayStr()],
      settings: JSON.parse(JSON.stringify(state.settings || {})),
      weekXP: weekXP(),
      todayXP: state.dayXP[dayStr()] || 0,
      dayXP: JSON.parse(JSON.stringify(state.dayXP || {})),
      letters: letterCounts(),
      quizHist: (state.quizHist || []).slice(),
      byLang: byLang(),
      sessions: state.log.filter(function (e) { return e.code; })
    };
  }

  /* ---------- inbound bridges ---------- */
  function bridge(code) { return applyProgressCode(code); }
  window.LinguaBridge = bridge;
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
    if (d && d.type === 'lingua-progress' && typeof d.code === 'string') bridge(d.code);
  });
  window.addEventListener('storage', function (ev) {
    if (ev.key === KEY) { state = load(); emit({ type: 'external' }); }
  });
  function handleUrlCode() {
    try {
      var u = new URL(window.location.href), c = u.searchParams.get('code');
      if (c) {
        applyProgressCode(c);
        u.searchParams.delete('code');
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      }
    } catch (e) { /* ignore */ }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', handleUrlCode);
    else handleUrlCode();
  }

  window.Lingua = {
    KEY: KEY, LANGS: LANGS, LEVELS: LEVELS, RANKS: RANKS, BADGES: BADGES, ACT_NAME: ACT_NAME,
    getState: getState, applyProgressCode: applyProgressCode, parseCode: parseCode, codeXP: codeXP,
    reset: reset, toast: toast, dayStr: dayStr, setSetting: setSetting,
    exportData: exportData, importData: importData
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.Lingua;
})();
