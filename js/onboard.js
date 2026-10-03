/* LinguaBomb - Step 1 onboarding gate for the AI tutor page.
 * Collects name, base language (what the tutor explains in), target language, level and goal, THEN loads the Chatling
 * widget with those values as chatbot variables (window.chtlConfig.variables) so the bot can greet the learner by name.
 * Everything stays in this browser (localStorage 'lingua.onboard.v2'). */
(function () {
  'use strict';
  var KEY = 'lingua.onboard.v2', CHATBOT_ID = '7428719251';
  var LANG = { en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', zh: 'Mandarin' };
  var LEVEL = { B: 'Beginner', I: 'Intermediate', A: 'Advanced' };
  var GOALS = ['Travel', 'School and exams', 'Culture and friends', 'Just for fun'];
  var slot = document.getElementById('chatling-slot'); if (!slot) return;
  function $(id) { return document.getElementById(id); }
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY)); return o && o.name ? o : null; } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); localStorage.setItem('lingua.name', o.name); window.dispatchEvent(new CustomEvent('lingua:name', { detail: o.name })); } catch (e) { /* private mode */ } }
  function opts(map, sel) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + map[k] + '</option>'; }).join(''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  var started = false;
  function startChat(o) {
    if (started) return; started = true;
    window.chtlConfig = { chatbotId: CHATBOT_ID, display: 'page_inline', variables: { name: o.name, language: LANG[o.lang], level: LEVEL[o.level], goal: o.goal, explain: LANG[o.base] } };
    var d = document.createElement('div'); d.id = 'chtl-inline-bot'; d.style.cssText = 'width:100%;height:640px'; slot.appendChild(d);
    var s = document.createElement('script'); s.async = true; s.id = 'chtl-script'; s.src = 'https://chatling.ai/js/embed.js';
    s.setAttribute('data-id', CHATBOT_ID); s.setAttribute('data-display', 'page_inline'); document.body.appendChild(s);
    var ph = $('chatling-placeholder'); if (ph) ph.hidden = true;
  }

  function greet(o) {
    var area = document.querySelector('.chat-area'); if (!area) return;
    var g = $('greet'); if (!g) { g = document.createElement('div'); g.id = 'greet'; g.className = 'greet-bar'; area.insertBefore(g, area.firstChild); }
    var same = o.base === o.lang;
    g.innerHTML = '<div><b>Hey ' + esc(o.name) + ' 👋</b> ' + (same ? 'Locked in on ' : 'Learning <b>' + LANG[o.lang] + '</b> with explanations in <b>' + LANG[o.base] + '</b> · ') +
      '<span class="pill-s">' + LEVEL[o.level] + '</span> <span class="pill-s">' + esc(o.goal) + '</span></div><button type="button" class="btn btn-sm btn-ghost" id="edit-setup">Edit setup</button>';
    $('edit-setup').addEventListener('click', function () { openGate(o, true); });
  }

  function openGate(prefill, isEdit) {
    var o = prefill || { name: '', base: 'en', lang: 'es', level: 'B', goal: GOALS[0] };
    var back = document.createElement('div'); back.className = 'ob-back'; back.id = 'ob-back';
    back.innerHTML =
      '<form class="ob-card" id="ob-form" role="dialog" aria-modal="true" aria-labelledby="ob-t" novalidate>' +
      '<p class="ob-step">Step 1 of 2 · set up your tutor</p><h2 id="ob-t">Let\'s get you <span class="pill pink">locked in</span></h2>' +
      '<p class="ob-sub">Your tutor reads this, greets you by name, and explains everything in the language you pick. Then the chat opens.</p>' +
      '<label>What should we call you? <span class="req">required</span><input id="ob-name" type="text" maxlength="24" autocomplete="nickname" placeholder="e.g. Pranav" value="' + esc(o.name) + '" required aria-describedby="ob-err"></label>' +
      '<div class="ob-row"><label>I speak (explain in)<select id="ob-base">' + opts(LANG, o.base) + '</select></label>' +
      '<label>I want to learn<select id="ob-lang">' + opts(LANG, o.lang) + '</select></label></div>' +
      '<div class="ob-row"><label>My level<select id="ob-level">' + opts(LEVEL, o.level) + '</select></label>' +
      '<label>My goal<select id="ob-goal">' + GOALS.map(function (g) { return '<option' + (g === o.goal ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="ob-err" id="ob-err" role="alert" aria-live="assertive"></p>' +
      '<div class="ob-actions"><button class="btn" type="submit">Start my lesson</button>' + (isEdit ? '<button class="btn btn-ghost" type="button" id="ob-cancel" style="border:1.5px solid var(--ink)">Cancel</button>' : '') + '</div>' +
      '<p class="ob-fine">Stays in your browser. Tip: pick Hindi → Spanish and the tutor teaches Spanish in Hindi.</p></form>';
    document.body.appendChild(back); document.body.classList.add('ob-open');
    var name = $('ob-name'); setTimeout(function () { name.focus(); }, 30);
    function close() { back.remove(); document.body.classList.remove('ob-open'); }
    if (isEdit) { $('ob-cancel').addEventListener('click', close); back.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); }); }
    $('ob-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = name.value.replace(/\s+/g, ' ').trim();
      if (!n) { $('ob-err').textContent = 'Name is required, bestie. Type anything you like.'; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      if (!/^[\p{L}\p{N} .'\-]{1,24}$/u.test(n)) { $('ob-err').textContent = 'Use letters, numbers or . \' - only (max 24).'; name.setAttribute('aria-invalid', 'true'); name.focus(); return; }
      var out = { name: n, base: $('ob-base').value, lang: $('ob-lang').value, level: $('ob-level').value, goal: $('ob-goal').value };
      save(out);
      try { localStorage.setItem('lingua.session', JSON.stringify({ name: out.name, lang: out.lang, level: out.level })); } catch (e2) { /* ignore */ }
      close(); greet(out);
      if (isEdit && started) { location.reload(); } else { startChat(out); }
    });
  }

  var ob = load();
  if (ob) { greet(ob); startChat(ob); } else { openGate(null, false); }
})();
