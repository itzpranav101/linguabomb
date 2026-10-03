/* LinguaBomb live sync: subscribes to the ntfy.sh topic (EventSource) the Chatling bot POSTs to after every activity.
 * Message body: {"code":"LB-ES-B-7-LGPRQ","well":"..","improve":"..","tip":".."} (well/improve/tip optional).
 * Applies codes with Lingua.applyProgressCode (which never double counts) and keeps coach notes in localStorage.
 */
(function () {
  'use strict';
  var L = window.Lingua, CFG = window.LINGUA_CONFIG || {};
  var SEEN_KEY = 'lingua.sync.seen', COACH_KEY = 'lingua.coach.v1', CODE_RE = /LB-(EN|HI|ES|FR|ZH|OT)-[BIA]-\d-[LGPRQX]*/i;
  var state = 'connecting', es = null, backoff = 1000, timer = null, started = false;

  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function str(x) { return typeof x === 'string' ? x.trim().slice(0, 400) : ''; }

  /* Bot message formats:
   *  1) JSON {"code":"LB-ES-B-7-LGPRQ","well":..,"improve":..,"tip":..}
   *  2) plain text sent by the Chatling HTTP Request block:  LBSYNC|<language>|<level>|<activity>|<name>|<coach note>
   *     (activity = the main-menu button the learner just used). We accumulate activities per language+level into a
   *     DONE string so Lingua.applyProgressCode awards exactly the new XP each time. */
  var RUN_KEY = 'lingua.sync.run';
  var LANGS = { english: 'EN', hindi: 'HI', spanish: 'ES', french: 'FR', mandarin: 'ZH', chinese: 'ZH' };
  function activityLetter(a) {
    a = String(a || '').toLowerCase();
    if (/learn|phrase/.test(a)) return 'L';
    if (/grammar/.test(a)) return 'G';
    if (/practi[cs]e|exercise/.test(a)) return 'P';
    if (/role|scenario/.test(a)) return 'R';
    if (/quiz|test/.test(a)) return 'Q';
    if (/extra|singlish|culture|detective|study|review/.test(a)) return 'X';
    return '';
  }
  function levelLetter(l) { l = String(l || '').toLowerCase(); return /inter/.test(l) ? 'I' : /adv/.test(l) ? 'A' : 'B'; }
  function coachFrom(note) {
    note = String(note || '').replace(/\s+/g, ' ').trim();
    if (!note) return { well: '', improve: '', tip: '' };
    var w = note.match(/WELL DONE[:\s-]*(.*?)(?=IMPROVE|TIP|$)/i), i = note.match(/IMPROVE[:\s-]*(.*?)(?=TIP|WELL DONE|$)/i), t = note.match(/TIP[:\s-]*(.*?)(?=WELL DONE|IMPROVE|$)/i);
    return { well: w ? w[1].trim() : '', improve: i ? i[1].trim() : '', tip: t ? t[1].trim() : (w || i ? '' : note.slice(0, 220)) };
  }
  function parseMessage(body) {
    if (body == null) return null;
    var s = String(body).trim(), o = null, m;
    if (/^LBSYNC[|\u00a6]/.test(s)) {
      var f = s.split(/[|\u00a6]/).map(function (x) { return x.trim(); });
      var nm = (f[4] || '').replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 24).trim();
      if (nm) { try { localStorage.setItem('lingua.name', nm); window.dispatchEvent(new CustomEvent('lingua:name', { detail: nm })); } catch (e) { /* ignore */ } }
      var letter = activityLetter(f[3]);
      var lang = LANGS[String(f[1] || '').toLowerCase()] || 'OT', lvl = levelLetter(f[2]);
      var c = coachFrom(f.slice(5).join(' '));
      if (!letter && !c.well && !c.improve && !c.tip) return null;
      var run = lsGet(RUN_KEY, {}), key = lang + '-' + lvl;
      if (letter) run[key] = (run[key] || '') + letter;
      lsSet(RUN_KEY, run);
      return { code: 'LB-' + lang + '-' + lvl + '-0-' + (run[key] || 'X'), well: c.well, improve: c.improve, tip: c.tip };
    }
    try { o = JSON.parse(s); } catch (e) { o = null; }
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      m = typeof o.code === 'string' ? o.code.match(CODE_RE) : null;
      if (!m) return null;
      return { code: m[0].toUpperCase(), well: str(o.well), improve: str(o.improve), tip: str(o.tip) };
    }
    m = s.match(CODE_RE);
    return m ? { code: m[0].toUpperCase(), well: '', improve: '', tip: '' } : null;
  }

  /* coach notes */
  function coachNotes() { var a = lsGet(COACH_KEY, []); return Array.isArray(a) ? a : []; }
  function addCoach(note) {
    var a = coachNotes();
    a.unshift(note);
    a.sort(function (x, y) { return y.t - x.t; });
    if (a.length > 30) a.length = 30;
    lsSet(COACH_KEY, a);
    try { window.dispatchEvent(new CustomEvent('lingua:coach', { detail: note })); } catch (e) { /* ignore */ }
  }

  function seenIds() { var a = lsGet(SEEN_KEY, []); return Array.isArray(a) ? a : []; }
  function markSeen(id) {
    var a = seenIds(); a.push(id); if (a.length > 200) a = a.slice(a.length - 200); lsSet(SEEN_KEY, a);
  }

  /* one ntfy event object -> result {status:'applied'|'duplicate'|'ignored'|'invalid', gain, note} */
  function handleEvent(ev, opts) {
    opts = opts || {};
    if (!ev || ev.event !== 'message') return { status: 'ignored' };
    var id = ev.id != null ? String(ev.id) : null;
    if (id && seenIds().indexOf(id) >= 0) return { status: 'duplicate' };
    var msg = parseMessage(ev.message);
    if (id) markSeen(id);
    if (!msg) return { status: 'invalid' };
    var res = L.applyProgressCode(msg.code, true);
    if (!res.ok) return { status: 'invalid' };
    var p = res.parsed, note = null;
    if (msg.well || msg.improve || msg.tip) {
      note = { t: (ev.time ? ev.time * 1000 : Date.now()), code: p.canonical, lang: p.lang, level: p.level, well: msg.well, improve: msg.improve, tip: msg.tip };
      addCoach(note);
    }
    if (res.gain > 0 && !opts.silent) {
      L.toast('+' + res.gain + ' XP from your chat, no cap', 'ok');
      try { window.dispatchEvent(new CustomEvent('lingua:sync', { detail: { gain: res.gain, code: p.canonical } })); } catch (e) { /* ignore */ }
    }
    return { status: 'applied', gain: res.gain, note: note, duplicateCode: res.duplicate };
  }

  /* ---------- connection ---------- */
  var LABEL = { connected: 'connected', connecting: 'reconnecting', reconnecting: 'reconnecting', offline: 'offline' };
  var TIP = { connected: 'Listening for your tutor chat. Progress shows up here automatically.', reconnecting: 'Trying to reach the sync channel. Your progress is safe.', offline: 'Not connected (offline or tab in background). Opening this page again catches up on the last 6 hours.' };
  function setState(s) {
    state = s;
    var pill = document.getElementById('sync-pill');
    if (pill) {
      pill.className = 'sync-pill ' + (s === 'connecting' ? 'reconnecting' : s);
      pill.querySelector('.t').textContent = 'Live sync: ' + LABEL[s];
      pill.title = TIP[s === 'connecting' ? 'reconnecting' : s];
    }
    try { window.dispatchEvent(new CustomEvent('lingua:syncstate', { detail: { state: s } })); } catch (e) { /* ignore */ }
  }
  function url() { return (CFG.NTFY_BASE || 'https://ntfy.sh') + '/' + CFG.NTFY_TOPIC + '/sse?since=' + (CFG.SINCE || '6h'); }
  function close() { if (es) { try { es.close(); } catch (e) { /* ignore */ } es = null; } if (timer) { clearTimeout(timer); timer = null; } }
  function connect() {
    close();
    if (typeof EventSource === 'undefined' || !CFG.NTFY_TOPIC) { setState('offline'); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setState('offline'); schedule(); return; }
    setState(state === 'connected' ? 'reconnecting' : 'connecting');
    try { es = new EventSource(url()); } catch (e) { setState('offline'); schedule(); return; }
    es.addEventListener('open', function () { backoff = 1000; setState('connected'); });
    es.onmessage = function (m) {
      var ev = null;
      try { ev = JSON.parse(m.data); } catch (e) { return; }
      try { handleEvent(ev); } catch (e) { /* never break the page */ }
    };
    es.onerror = function () { close(); setState('reconnecting'); schedule(); };
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { if (!document.hidden) connect(); }, backoff);
    backoff = Math.min(backoff * 2, 30000);
  }
  function start() {
    if (started) return; started = true;
    connect();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { close(); setState('offline'); } else { backoff = 1000; connect(); }
    });
    window.addEventListener('online', function () { backoff = 1000; connect(); });
    window.addEventListener('offline', function () { close(); setState('offline'); });
  }

  /* dev helper: POST a sample message to the topic */
  function testPush(obj) {
    var body = JSON.stringify(Object.assign({ code: 'LB-ES-B-5-LQ', well: 'Nice pronunciation on the greetings.', improve: 'Watch the verb endings.', tip: 'Say each new phrase out loud twice.' }, obj || {}));
    return fetch((CFG.NTFY_BASE || 'https://ntfy.sh') + '/' + CFG.NTFY_TOPIC, { method: 'POST', body: body });
  }

  window.LinguaSync = { parseMessage: parseMessage, handleEvent: handleEvent, coachNotes: coachNotes, seenIds: seenIds, state: function () { return state; }, start: start, stop: close, testPush: testPush, COACH_KEY: COACH_KEY, SEEN_KEY: SEEN_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.LinguaSync;
  if (typeof document !== 'undefined' && document.body && typeof EventSource !== 'undefined') start();
})();
