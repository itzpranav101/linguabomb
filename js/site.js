/* LinguaBomb - shared header, footer and small UI behaviours */
(function () {
  'use strict';
  var page = document.body.getAttribute('data-page') || '';
  var NAV = [
    ['languages.html', 'Languages', 'languages'],
    ['tutor.html', 'AI Tutor', 'tutor'],
    ['progress.html', 'Progress', 'progress']
  ];
  var MORE = [
    ['culture.html', 'Culture Capsules', 'culture'],
    ['singlish.html', 'Singlish Decoder', 'singlish'],
    ['about.html', 'About', 'about']
  ];
  var THEME_KEY = 'lingua.theme';
  var MARK = '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="15" cy="18" r="11" fill="#111"/><path d="M22 9l3-4" stroke="#111" stroke-width="2" stroke-linecap="round"/><circle cx="27" cy="4" r="2.6" fill="#6c8bff" stroke="#111" stroke-width="1.2"/><path d="M9 17c1-3 3-4 5-4" stroke="#ddff6e" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  function header() {
    var links = NAV.map(function (n) {
      return '<li><a href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>';
    }).join('');
    var moreActive = MORE.some(function (n) { return n[2] === page; });
    var more = MORE.map(function (n) {
      return '<li role="none"><a role="menuitem" href="' + n[0] + '"' + (n[2] === page ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>';
    }).join('');
    links += '<li class="more"><button type="button" class="more-btn' + (moreActive ? ' active' : '') + '" id="more-btn" aria-haspopup="true" aria-expanded="false" aria-controls="more-menu">More <span aria-hidden="true">&#9662;</span></button>' +
      '<ul class="more-menu" id="more-menu" role="menu" aria-labelledby="more-btn">' + more + '</ul></li>';
    return '<a class="skip" href="#main">Skip to content</a>' +
      '<header class="site-header" role="banner"><div class="wrap nav">' +
      '<a class="brand" href="index.html" aria-label="LinguaBomb home, by Bomb Island">' + MARK + '<span>LinguaBomb<small class="tagline">💣🏝️ Bomb Island</small></span></a>' +
      '<nav aria-label="Main"><ul class="nav-links" id="nav-links">' + links + '</ul></nav>' +
      '<div class="nav-cta"><span class="name-chip" id="name-chip" hidden title="Your name"><i class="av" id="name-av" aria-hidden="true"></i><b id="name-txt"></b></span><span class="sync-pill connecting" id="sync-pill" role="status" aria-live="polite" title="Live sync"><i aria-hidden="true"></i><span class="t">Live sync: reconnecting</span></span><a class="xp-chip" id="xp-chip" href="progress.html" title="Your progress"><span aria-hidden="true">&#9889;</span> <span id="xp-chip-n">0</span> XP</a>' +
      '<button class="theme-btn" id="theme-btn" type="button" aria-label="Toggle dark mode" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path class="moon" d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" fill="currentColor"/></svg></button>' +
      '<a class="btn btn-sm hide-sm" href="tutor.html">Start Learning</a>' +
      '<button class="menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false" aria-controls="nav-links"><span></span></button></div>' +
      '</div></header>';
  }
  function footer() {
    return '<footer class="site-footer" role="contentinfo"><div class="wrap"><div class="foot-grid">' +
      '<div class="foot-brand"><a class="brand" href="index.html">' + MARK + 'LinguaBomb</a>' +
      '<p>An AI language tutor for English, Hindi, Spanish, French and Mandarin. 💣🏝️ Built by Team Bomb Island for Battle of Bots.</p>' +
      '<div class="socials" aria-label="Social links (placeholders)"><a href="about.html" style="background:#3b5bdb" aria-label="Facebook placeholder">f</a><a href="about.html" style="background:#111" aria-label="LinkedIn placeholder">in</a><a href="about.html" style="background:#111" aria-label="X placeholder">X</a></div></div>' +
      '<div><h4>LinguaBomb</h4><ul><li><a href="about.html">About us</a></li><li><a href="culture.html">Culture Capsules</a></li><li><a href="singlish.html">Singlish Decoder</a></li><li><a href="about.html#how">How it works</a></li><li><a href="about.html#credits">Dataset credits</a></li><li><a href="about.html#privacy">Privacy</a></li></ul></div>' +
      '<div><h4>Learn</h4><ul><li><a href="languages.html">Languages</a></li><li><a href="culture.html">Culture Capsules</a></li><li><a href="tutor.html">AI Tutor</a></li><li><a href="progress.html">My progress</a></li></ul></div>' +
      '<div><h4>Languages</h4><ul><li><a href="languages.html#en">English</a></li><li><a href="languages.html#hi">Hindi</a></li><li><a href="languages.html#es">Spanish</a></li><li><a href="languages.html#fr">French</a></li><li><a href="languages.html#zh">Mandarin</a></li></ul></div>' +
      '</div><div class="copy"><span>&copy; 2026 Team Bomb Island. All progress stays in your browser.</span><span>💣🏝️ Bomb Island, no cap</span></div></div></footer>';
  }
  var h = document.getElementById('site-header'), f = document.getElementById('site-footer');
  if (h) h.outerHTML = header();
  if (f) f.outerHTML = footer();

  var btn = document.getElementById('menu-btn'), nav = document.getElementById('nav-links');
  if (btn && nav) {
    var close = function () { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') close(); });
  }

  /* More dropdown */
  var mb = document.getElementById('more-btn'), mm = document.getElementById('more-menu');
  if (mb && mm) {
    var mclose = function () { mm.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); };
    mb.addEventListener('click', function (e) { e.stopPropagation(); var o = mm.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', function (e) { if (!mm.contains(e.target) && e.target !== mb) mclose(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { mclose(); } });
  }

  /* theme (dark mode keeps brand colours; stored in localStorage) */
  var root = document.documentElement, tb = document.getElementById('theme-btn');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (tb) tb.setAttribute('aria-pressed', String(t === 'dark'));
  }
  var stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  applyTheme(stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (tb) tb.addEventListener('click', function () {
    var n = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(n);
    try { localStorage.setItem(THEME_KEY, n); } catch (e) { /* ignore */ }
  });

  /* UI helpers shared by pages */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function confetti(opts) {
    if (reduce) return;
    opts = opts || {};
    var c = document.createElement('canvas');
    c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
    c.width = window.innerWidth; c.height = window.innerHeight;
    document.body.appendChild(c);
    var g = c.getContext('2d'), cols = ['#ddff6e', '#6c8bff', '#f0a8f4', '#111111', '#ffd24a'], P = [], i, n = opts.count || 110;
    for (i = 0; i < n; i++) P.push({ x: c.width * (opts.x == null ? Math.random() : opts.x), y: c.height * (opts.y == null ? -0.05 : opts.y), vx: (Math.random() - .5) * 9, vy: Math.random() * 5 + (opts.y == null ? 2 : -9), s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function frame(t) {
      g.clearRect(0, 0, c.width, c.height);
      P.forEach(function (p) { p.vy += .17; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); g.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else if (c.parentNode) c.parentNode.removeChild(c);
    })(t0);
  }
  function floatText(host, text, cls) {
    if (!host) return;
    var f = document.createElement('span');
    f.className = 'float-xp ' + (cls || ''); f.textContent = text;
    host.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1400);
  }
  window.LinguaUI = { confetti: confetti, floatText: floatText, reduceMotion: reduce };

  /* learner name chip (top right): name comes from the tutor sidebar or from the bot via live sync */
  function renderName() {
    var n = ''; try { n = (localStorage.getItem('lingua.name') || '').trim(); } catch (e) { /* ignore */ }
    var c = document.getElementById('name-chip'); if (!c) return;
    if (!n) { c.hidden = true; return; }
    c.hidden = false;
    document.getElementById('name-txt').textContent = n;
    document.getElementById('name-av').textContent = n.charAt(0).toUpperCase();
    c.title = 'Welcome back, ' + n;
  }
  renderName();
  window.addEventListener('lingua:name', renderName);
  window.addEventListener('storage', function (e) { if (e.key === 'lingua.name') renderName(); });

  /* XP chip */
  function chip() {
    var el = document.getElementById('xp-chip-n');
    if (el && window.Lingua) el.textContent = window.Lingua.getState().xp;
  }
  chip();
  window.addEventListener('lingua:update', chip);

  /* reveal on scroll */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && items.length && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    items.forEach(function (i) { io.observe(i); });
  } else {
    items.forEach(function (i) { i.classList.add('in'); });
  }

  /* newsletter (static demo: nothing is sent) */
  var nf = document.getElementById('news-form');
  if (nf) {
    nf.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = nf.querySelector('input').value.trim(), msg = document.getElementById('news-msg');
      if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = 'Please enter a valid email address.'; return; }
      msg.textContent = 'Thanks! This is a static demo, so nothing was sent or stored.';
      nf.reset();
    });
  }

  /* live sync (config first, then sync.js, which owns the header pill) */
  function loadScript(src, cb) {
    var sc = document.createElement('script'); sc.src = src; sc.async = false;
    sc.onload = function () { if (cb) cb(); }; sc.onerror = function () { var p = document.getElementById('sync-pill'); if (p) { p.className = 'sync-pill offline'; p.querySelector('.t').textContent = 'Live sync: offline'; } };
    document.head.appendChild(sc);
  }
  loadScript('js/config.js?v=1791012121', function () { loadScript('js/sync.js?v=1791012121'); });
  /* animate the XP chip when chat progress lands */
  window.addEventListener('lingua:sync', function () {
    var c = document.getElementById('xp-chip'); if (!c) return;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  });
})();
