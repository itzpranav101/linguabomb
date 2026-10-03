# LinguaBomb website

A static site (HTML, CSS, vanilla JS). No build step and no backend.

## Run it

```bash
cd website
python3 -m http.server 8000
# open http://localhost:8000
```

Use a server rather than double-clicking the files: the language, culture and Singlish pages `fetch()` the JSON in `data/`.

## Pages

| File | What it is |
|---|---|
| `index.html` | Landing page: animated hero (speech bubbles, orbiting flags, map blob), greetings marquee |
| `languages.html` | The five languages, top-10 words with speaker buttons (no XP) and a Test voices panel |
| `tutor.html` | Chat slot, Session sidebar, quick-prompt chips, sync-code panel, optional Chatling adapter |
| `progress.html` | Premium dashboard fed only by tutor codes: XP/rank ring, today's goal, streak, 28-day heat-map, per-language cards with L/G/P/R/Q/X chips, skill radar, quiz sparkline, 15 badges, synced-session timeline, XP explainer, export/import JSON, PNG progress card |
| `culture.html` | Culture Capsules: greetings, etiquette, do/don't, festivals (`data/culture.json`, general facts only) |
| `singlish.html` | Singlish Decoder: search + quiz (`data/singlish.json`, Wikipedia CC BY-SA 4.0) |
| `about.html` | Team, how it works, safety, credits, privacy |

Shared code: `js/progress.js` (store, `window.Lingua`), `js/speech.js` (`window.LinguaSpeech`: speechSynthesis, SpeechRecognition,
normalised-Levenshtein scoring), `js/site.js` (header with More menu, dark-mode toggle, footer, confetti via `window.LinguaUI`),
`css/style.css` + `css/upgrade.css` (v2 layer, dark theme via `[data-theme="dark"]`, theme saved in `localStorage['lingua.theme']`).

## Pronunciation (helper only, no XP)

`<button class="speak" data-say="..." data-rom="romanisation" data-lang="hi">` speaks with en-US, hi-IN, es-ES, fr-FR, zh-CN.
`js/speech.js` waits for `getVoices()` (voiceschanged + polling up to 3 s), picks the best voice per language prefix (Lekha for Hindi,
Ting-Ting for Mandarin, ...), and if none is installed falls back to an English (en-IN preferred) voice reading the romanisation.
The utterance language always matches the chosen voice. It cancels before speaking, nudges Chrome's 15 s cutoff with pause/resume,
shows the voice used as the button tooltip, and toasts install instructions (macOS: System Settings > Accessibility > Spoken Content >
System Voice > Manage Voices) if nothing plays. `languages.html#voices` lists the voice found per language with a play button.
Speed is saved in `lingua.rate`. `LinguaSpeech.listen/score` (recognition + fuzzy score) remain as helpers but nothing awards XP.

## Automatic sync (ntfy.sh)

The Chatling bot POSTs a one-line JSON body after every activity to the public ntfy topic set in `js/config.js`
(`NTFY_TOPIC`, the only place it appears): `{"code":"LB-ES-B-7-LGPRQ","well":"..","improve":"..","tip":".."}` (`well/improve/tip` optional).
`site.js` loads `js/sync.js` on every page; it opens an `EventSource` to `https://ntfy.sh/<topic>/sse?since=6h`, ignores non-`message`
events, JSON-parses the body (falls back to the `LB-` regex), de-duplicates by event id (last 200 in `lingua.sync.seen`), applies the
code with `applyProgressCode` and toasts "+N XP from your chat". Reconnects with backoff, closes while the tab is hidden, and shows a
header pill (connected / reconnecting / offline). Coach notes (last 30) live in `lingua.coach.v1` and feed the AI Coach cards
(`js/coach.js`) on progress.html and tutor.html. Dev helper: `LinguaSync.testPush({code:'LB-ES-B-5-LQ'})` POSTs a sample.
Manual code paste still exists, collapsed under "Advanced" on tutor.html. The topic is public: anyone who knows it could post codes
(this is a demo-grade trust model, not secure). The Chatling bot must be configured separately to make that POST (not done here).

## XP policy

XP, streaks and badges come ONLY from the AI tutor (live ntfy sync, or manual code): `applyProgressCode`, `LinguaBridge`, `?code=`, `postMessage`, or the tutor
page's chat auto-sync. `window.Lingua` has no addXP. Badges are based on code letters (L/G/P/R/Q/X counts), quiz score 8, levels,
languages used, streak days and sync time of day.

## Tests

```bash
node tests/progress.test.cjs   # progress-code spec + tutor-only badges
node tests/sync.test.cjs        # message parsing, de-dup, apply, coach store
node tests/smoke.cjs           # every HTML's local links/scripts exist, JSON valid, JS parses
```

## Data

`python3 build_data.py` reads `../lingua-datasets/*.md` and writes `data/en|hi|es|fr|zh.json`
(`{lang, name, script, source, words[{w,r,e}], phrases[{cat,t,r,e}], sentences[{t,r,e}]}`).
A hand-checked "Essentials" set (hello, thank you, ... "I don't understand") is always put first in
`phrases`, and is the complete fallback if a markdown file is missing (`source` is then `"fallback"`).
For English, phrases carry `tr` (translations into hi/es/fr/zh).
Re-run the script whenever the markdown files change.

## Paste the Chatling embed

1. Open `tutor.html` and find `<!-- CHATLING EMBED: paste snippet here -->` inside `<div id="chatling-slot">`.
2. Paste the snippet Chatling gives you (script or iframe) between that comment and `<!-- END CHATLING EMBED -->`, save, refresh.
   The placeholder card hides itself when a script/iframe/`#chtl*` element appears.
3. Optional, for an inline widget that fills the slot, add before the snippet's script:
   `<script>window.chtlConfig = { chatbotId: "YOUR_ID", displayType: "page_inline" };</script>` (property names per the Chatling SDK docs).
   `js/tutor.js` merges `variables` into `window.chtlConfig` and, once `window.Chatling` exists, calls `Chatling.setVariables(...)`.
4. In the Chatling dashboard create the variables `learner_name`, `target_language`, `level`, `total_xp`, `streak_days`
   so the bot can use them (they are sent from the Session sidebar).

Honest limits: the Chatling SDK docs list `open`, `minimize`, `setVariables`, `destroy` but no message events. Auto-sync therefore
works by watching this page's DOM (and `postMessage`) for `/LB-(EN|HI|ES|FR|ZH|OT)-[BIA]-\d-[LGPRQX]*/i`. That only sees text rendered
in the same document; if the widget lives in a cross-origin iframe, users paste the code (the sync panel walks them through it).
Not tested against a real Chatling bot.

## Progress code

The bot prints `LB-<LANG>-<LEVEL>-<SCORE>-<DONE>` (example `LB-ES-B-7-LGPRQ`) at the end of each module or quiz.

* LANG: EN, HI, ES, FR, ZH or OT (other). LEVEL: B, I, A. SCORE: 0-8 (latest quiz). DONE: letters, repeats allowed.
* Letters: L learn-phrases 15 XP, G grammar 15, P practice 20, R role-play 30, Q quiz 25 + 10 x SCORE, X extras 10.
  Multiply by 1.25 for level I and 1.5 for level A.
* Parsing is case-insensitive and forgiving (spaces, lowercase, missing parts default to OT / B / 0 / empty).
* Applying a code twice adds nothing. Per (language, level) the longest DONE string is remembered and only the XP
  difference is awarded when a longer session arrives.
* Ways to deliver a code: paste it on `tutor.html`; open any page with `?code=LB-...` (applied, then the URL is cleaned);
  `window.postMessage({type:'lingua-progress', code:'LB-...'}, '*')`; or call `window.LinguaBridge('LB-...')`.

Storage: `localStorage['lingua.v1']` (progress) . Ranks: Newbie 0, Explorer 200,
Linguist 600, Polyglot 1500 XP. Every change dispatches a `lingua:update` event on `window`.

Parser test: `node tests/progress.test.cjs`.

Storage: `lingua.v1` also holds `dayXP`, `quizHist`, `settings`, `track` (old saves are upgraded on load). Data helpers:
`build_data.py` (words/phrases) and `build_singlish.py` (Singlish JSON). There is no `chatling-embed.html`, so the tutor page keeps its placeholder.
