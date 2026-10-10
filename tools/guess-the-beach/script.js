/* Guess the Phuket Beach — daily per-player game.
   All state is local: seeded RNG (player id + date), localStorage locks,
   no network calls, no tracking. Photos and credits are inlined at build
   time (window.OA_BEACH_PHOTOS).

   Rules: five rounds, one photo each. Type to search beaches; up to three
   attempts per round. First guess right = 100 pts, right after the hint
   (which unlocks after your first wrong guess) = 50 pts, three wrongs = 0
   and we move on. */
(function () {
  'use strict';

  var DATA = window.OA_BEACH_PHOTOS || [];
  var REVEAL_MS = 1500; /* how long the "it was X" reveal hangs before auto-skip */

  var el = function (id) { return document.getElementById(id); };

  /* one fun fact per answer, revealed in two stages: the type/region line plus
     this fact first, then the starting letter after a second wrong guess — and
     never for answers whose initial is unique on the island. */
  var HINTS = {
    'Haad Pak Phra': 'a peaceful shore at the runway end of the north coast \u2014 the name recalls the monks who blessed this stretch.',
    'Mai Khao': "Phuket's longest beach (11 km) \u2014 part of a national park where sea turtles still nest from May to October.",
    'Nai Yang': 'a sheltered cove inside the same national park, with planes crossing low overhead on final approach.',
    'Nai Thon': 'a jungle-backed cove with a wide, shallow shelf at low tide \u2014 one of the island\u2019s quietest.',
    'White Beach': 'a private white-sand stretch below a resort on the Nai Thon coast, missing from most maps.',
    'Banana Beach': 'a tiny cove reached by a short path through the bamboo between Nai Thon and Layan.',
    'Layan': 'a quiet locals\u2019 beach whose north end hides a tidal lagoon.',
    'Bang Tao': 'six kilometres of sand backed by Phuket\u2019s Lagoon resort complex.',
    'Surin': 'the bay that launched Phuket\u2019s beach-club era \u2014 and draws real winter surf.',
    'Laem Singh': 'a hidden crescent between Surin and Kamala \u2014 reachable only by steps or longtail boat.',
    'Kamala': 'a wide family bay whose village behind the sand was once a small fishing settlement.',
    'Patong': "Phuket's busiest bay \u2014 where nightlife and surf share the same golden arc.",
    'Tri Trang': 'a quiet cove tucked at the far south end of Patong bay, past the big resorts.',
    'Paradise Beach': 'a private bay south of Patong\u2019s main strip with a shade-bar on the sand.',
    'Freedom Beach': 'many call it Phuket\u2019s most beautiful bay \u2014 boat access or a stiff jungle trail only.',
    'Karon Noi': 'a sliver of sand squeezed between Karon and the Patong headland \u2014 often nearly empty.',
    'Karon': 'three golden kilometres \u2014 the island\u2019s classic long beach.',
    'Kata': 'the gentle bay below the famous 360\u00b0 viewpoint on the headland above.',
    'Nui Beach': 'a secret cove south of Kata reached by an ATV path that claws down a steep hill.',
    'Kata Noi': 'Kata\u2019s quieter little sister \u2014 two resorts and serious winter swells.',
    'Nai Harn': 'a lake-backed bay whose sand fills with people at sunset, right by Phromthep cape.',
    'Ya Nui': 'a tiny pocket between Nai Harn and Phromthep cape with shallow, turquoise water.',
    'Rawai': 'a longtail-fishing shore and Phuket\u2019s oldest sea-gypsy anchorage.',
    'Ao Yon': 'an east-coast yacht bay on the Phanwa peninsula, palms lapping the shore.',
    'Cape Panwa': 'a quiet headland at Phuket\u2019s far southeast tip with wide views across Chalong Bay.',
    'Chalong': 'a flat, breeze-washed shore on Chalong Bay beside the pier for the island ferries.',
    'Phi Phi Don': 'the only inhabited island of the Phi Phi pair, sister to its famous limestone bay.',
    'Phi Phi Leh': 'an uninhabited limestone island wrapped around a lagoon of improbable green.',
    'Maya Bay': 'the film-set lagoon inside Phi Phi Leh \u2014 closed for years to let the corals recover.',
    'Racha Yai': 'the \u201croyal\u201d diving favourite \u2014 high cliffs and clear water a short boat ride from Chalong.',
    'Koh Bon': 'a speck off Rawai where a floating restaurant anchors in the shallows.',
    'Koh Panyee': 'a whole village on stilts in a Phang Nga lagoon \u2014 birthplace of a famous island football team.',
    'Koh Yao Yai': "Phuket's laid-back rice-paddy neighbour, far quieter than the big island.",
    'Koh Yao Noi': 'the smaller, hillier sister of Yao Yai \u2014 limestone karsts stud the channel between them.',
    'Naka Yai': 'a low resort island tethered to its tiny twin by a sandbar on Phuket\u2019s east coast.',
    'Khai Island': 'a sandbar day-trip islet where fish queue up at the tour boats.',
  };

  /* ── tiny deterministic utils ─────────────────────────── */
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function cyrb53(str, seed) {
    var h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ── storage helpers ──────────────────────────────────── */
  function lsGet(k, d) {
    try {
      var v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
  }
  function playerId() {
    var k = 'oa_bg_player';
    var id = lsGet(k, null);
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'p-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      lsSet(k, id);
    }
    return id;
  }
  function localDate() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ── state ────────────────────────────────────────────── */
  var DATE = localDate();
  var GAME_KEY = 'oa_bg_game_' + DATE;
  var HIST_KEY = 'oa_bg_history';

  var photosByAnswer = {};
  var allAnswers = [];
  DATA.forEach(function (r) {
    if (!photosByAnswer[r.answer]) { photosByAnswer[r.answer] = []; allAnswers.push(r.answer); }
    photosByAnswer[r.answer].push(r);
  });
  allAnswers.sort();

  /* first-letter counts: a letter the answer shares with a sibling is a fair
     hint; a unique letter would give the game away and is never revealed. */
  var LETTER_COUNT = {};
  allAnswers.forEach(function (a) { var L = a.charAt(0).toUpperCase(); LETTER_COUNT[L] = (LETTER_COUNT[L] || 0) + 1; });
  var UNIQUE_LETTERS = {};
  allAnswers.forEach(function (a) { if (LETTER_COUNT[a.charAt(0).toUpperCase()] === 1) UNIQUE_LETTERS[a] = 1; });

  var game = null;
  var skipTimer = null;

  /* ── game construction ────────────────────────────────── */
  function recentAnswers() {
    var hist = lsGet(HIST_KEY, []).slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    var windows = [7, 5, 3, 1];
    for (var w = 0; w < windows.length; w++) {
      var banned = {};
      var seen = 0;
      for (var i = 0; i < hist.length && seen < windows[w]; i++) {
        if (hist[i].date === DATE) continue;
        (hist[i].answers || []).forEach(function (a) { banned[a] = 1; });
        seen++;
      }
      var pool = allAnswers.filter(function (a) { return !banned[a]; });
      if (pool.length >= 5) return pool;
    }
    return allAnswers.slice();
  }

  function pickPhoto(answer) {
    var list = photosByAnswer[answer] || [];
    if (!list.length) return null;
    var rotKey = 'oa_bg_rot_' + answer;
    var idx = lsGet(rotKey, 0);
    lsSet(rotKey, (idx + 1) % list.length);
    return list[idx % list.length];
  }

  function buildRounds() {
    var rng = mulberry32(cyrb53(playerId() + '|' + DATE));
    var inPool = recentAnswers();
    var isHard = function (a) { return photosByAnswer[a][0].hard; };
    var soft = shuffle(inPool.filter(function (a) { return !isHard(a); }), rng);
    var hard = shuffle(inPool.filter(isHard), rng);

    /* prefer up to two hard rounds, fill the rest from soft */
    var hardNeeded = Math.min(2, hard.length);
    var list = hard.slice(0, hardNeeded)
      .concat(soft.slice(0, Math.max(0, 5 - hardNeeded)));
    if (list.length < 5) {
      list = list.concat(hard.slice(hardNeeded, hardNeeded + (5 - list.length)));
    }

    /* fall back to any unused answer if the recent-ban shrank the pool */
    var picks = list.slice(0, 5);
    while (picks.length < 5) {
      var extras = allAnswers.filter(function (a) { return picks.indexOf(a) === -1 && photosByAnswer[a].length; });
      if (!extras.length) break;
      picks.push(extras[Math.floor(rng() * extras.length)]);
    }

return picks.map(function (a) {
      return { answer: a, hint: false, correct: false, guess: '', attempts: 0, pts: 0, photo: pickPhoto(a), excluded: [] };
    });
  }

  function persist() {
    lsSet(GAME_KEY, game);
    lsSet(HIST_KEY, lsGet(HIST_KEY, []).filter(function (h) { return h.date !== DATE; })
      .concat([{ date: DATE, answers: game.rounds.map(function (r) { return r.answer; }) }]).slice(-14));
  }

  /* ── matching ─────────────────────────────────────────── */
  function answerNames(answer) {
    return [answer].concat((photosByAnswer[answer] && photosByAnswer[answer][0] && photosByAnswer[answer][0].aliases) || []);
  }
  function isExact(guess, answer) {
    var g = norm(guess);
    return g && answerNames(answer).some(function (n) { return norm(n) === g; });
  }

  /* autosuggest: answers whose name/alias starts with the query; if none start,
     fall back to contains-match. Typed letters are highlighted. Answers the
     player already burned on this round are filtered out. */
  function suggestFor(q) {
    q = norm(q);
    if (!q) return [];
    var r = game.rounds[game.round];
    var banned = (r && r.excluded) || [];
    var starts = [], contains = [];
    allAnswers.forEach(function (a) {
      if (banned.indexOf(a) !== -1) return;
      var names = answerNames(a).map(norm);
      if (names.some(function (n) { return n.indexOf(q) === 0; })) starts.push(a);
      else if (names.some(function (n) { return n.indexOf(q) > 0; })) contains.push(a);
    });
    return starts.concat(contains).slice(0, 8);
  }
  /* mark the answer a wrong guess pointed at (exact name or any alias) so it
     drops out of the suggestions for the rest of this round. */
  function excludeWrongGuess(value, r) {
    if (!r.excluded) r.excluded = [];
    var g = norm(value);
    if (!g) return;
    allAnswers.forEach(function (a) {
      if (r.excluded.indexOf(a) !== -1) return;
      if (answerNames(a).some(function (n) { return norm(n) === g; })) r.excluded.push(a);
    });
  }
  function highlight(s, q) {
    var i = norm(s).indexOf(q);
    if (i < 0) return String(s);
    var lo = String(s).toLowerCase();
    i = lo.indexOf(q);
    return String(s).slice(0, i) + '<b>' + String(s).slice(i, i + q.length) + '</b>' + String(s).slice(i + q.length);
  }

  /* ── rendering ────────────────────────────────────────── */
  function show(id, visible) { el(id).hidden = !visible; }

  function renderStrips() {
    var wrap = el('roundStrips');
    wrap.innerHTML = '';
    game.rounds.forEach(function (r, i) {
      var s = document.createElement('span');
      s.className = 'round-strip';
      if (i < game.round) {
        if (r.correct) s.classList.add('ok');
        else if (r.hint) s.classList.add('hint');
        else s.classList.add('miss');
      } else if (i === game.round) {
        s.classList.add('on');
      }
      wrap.appendChild(s);
    });
  }

  function updateTries(r) {
    var pips = el('tryPips');
    pips.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var s = document.createElement('span');
      s.className = 'try-pip';
      if (i < r.attempts) s.classList.add(r.correct && i === r.attempts - 1 ? 'ok' : 'miss');
      pips.appendChild(s);
    }
    el('tryCount').textContent = r.guess ? '—' : Math.min(r.attempts + 1, 3);
  }

  function renderHint() {
    var r = game.rounds[game.round];
    var first = photosByAnswer[r.answer][0];
    var line = first.kind === 'island'
      ? '\uD83C\uDFDD It\u2019s an island.'
      : '\uD83C\uDFD6 Phuket beach \u00b7 ' + (first.region ? first.region.charAt(0).toUpperCase() + first.region.slice(1) : 'West coast');
    var parts = [line];
    var fact = HINTS[r.answer];
    if (fact) parts.push(fact);
    /* the first-letter hint arrives only after two wrong guesses — and never
       for answers whose initial is unique (it would reveal the whole beach). */
    if (r.attempts >= 2 && !UNIQUE_LETTERS[r.answer]) {
      parts.push('Its name starts with ' + r.answer.charAt(0).toUpperCase() + '.');
    }
    el('hintText').innerHTML = parts.join('<br>');
    el('hintZone').hidden = false;
  }

  function takeHint() {
    var r = game.rounds[game.round];
    if (r.guess || r.hint) return;
    r.hint = true;
    el('hintBtn').disabled = true;
    renderHint();
    renderStrips();
    persist();
  }

  function renderRound() {
    show('game-view', true);
    show('results-view', false);
    var r = game.rounds[game.round];
    el('photoRound').textContent = 'ROUND ' + (game.round + 1) + ' / 5';

    var img = el('photoImg');
    img.onload = null;
    img.src = r.photo.image;
    img.alt = '';
    img.width = r.photo.w || 1280;
    img.height = r.photo.h || 720;
    img.onload = function () { img.style.opacity = '1'; };
    img.style.opacity = '0';
    img.style.transition = 'opacity .3s ease';

    el('photoYear').textContent = r.photo.year ? ('\uD83D\uDCF7 ' + r.photo.year) : '\uD83D\uDCF7 year unknown';
    el('scoreChip').textContent = game.score + ' pts';

    el('guessInput').value = '';
    el('guessInput').disabled = false;
    el('guessBtn').disabled = false;
    el('hintBtn').disabled = !(r.attempts >= 1 && !r.hint);
    el('hintZone').hidden = true;
    el('outcome').hidden = true;
    el('feedback').hidden = true;
    closeSuggest();
    updateTries(r);
    renderStrips();
    if (r.hint) renderHint();
  }

  /* ── autosuggest dropdown ─────────────────────────────── */
  var suggestUi = { items: [], active: -1, q: '' };

  function renderSuggest() {
    var input = el('guessInput');
    var box = el('suggest');
    var q = input.value;
    var items = suggestFor(q);
    suggestUi.q = norm(q);
    suggestUi.items = [];
    suggestUi.active = -1;
    box.innerHTML = '';
    if (!items.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
    items.forEach(function (a, i) {
      var li = document.createElement('li');
      li.className = 'sug-item';
      li.role = 'option';
      li.id = 'sug-opt-' + i;
      li.setAttribute('data-answer', a);
      li.setAttribute('aria-selected', 'false');
      li.innerHTML = highlight(a, suggestUi.q);
      box.appendChild(li);
      suggestUi.items.push(li);
    });
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  function openSuggest() {
    renderSuggest();
  }
  function closeSuggest() {
    suggestUi.items = [];
    suggestUi.active = -1;
    var box = el('suggest');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    var input = el('guessInput');
    if (input) input.setAttribute('aria-expanded', 'false');
  }
  function setActive(i) {
    var n = suggestUi.items.length;
    if (!n) return;
    i = (i + n) % n;
    suggestUi.active = i;
    suggestUi.items.forEach(function (li, k) {
      li.setAttribute('aria-selected', k === i ? 'true' : 'false');
      if (k === i) li.classList.add('active');
      else li.classList.remove('active');
    });
    var box = el('suggest');
    if (box) {
      var t = suggestUi.items[i];
      if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest' });
      var input = el('guessInput');
      if (input) input.setAttribute('aria-activedescendant', t.id);
    }
  }
  function commitActive() {
    if (suggestUi.active < 0) return;
    var a = suggestUi.items[suggestUi.active].getAttribute('data-answer');
    el('guessInput').value = a;
    submitGuess();
  }
  function onSuggestInput() {
    renderSuggest();
  }
  function onSuggestKey(e) {
    var open = !el('suggest').hidden;
    if (e.key === 'ArrowDown') { e.preventDefault(); openSuggest(); setActive(suggestUi.active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(suggestUi.active - 1); }
    else if (e.key === 'Enter') { if (open && suggestUi.active >= 0) { e.preventDefault(); commitActive(); } }
    else if (e.key === 'Escape') { closeSuggest(); el('guessInput').blur(); }
    else if (e.key === 'Tab' && open) { closeSuggest(); }
  }

  /* ── answering ────────────────────────────────────────── */
  function setFeedback(text) {
    var f = el('feedback');
    f.textContent = text || '';
    f.hidden = !text;
  }

  function finishRound(r, skip) {
    game.score += r.pts;
    el('guessInput').disabled = true;
    el('guessBtn').disabled = true;
    el('hintBtn').disabled = true;
    closeSuggest();
    setFeedback('');
    updateTries(r);
    renderStrips();
    el('scoreChip').textContent = game.score + ' pts';

    var out = el('outcome');
    out.hidden = false;
    out.classList.remove('right', 'wrong');
    out.classList.toggle('skip', !!skip);
    var line = el('outcomeLine');
    if (r.correct) {
      out.classList.add('right');
      line.innerHTML = '<b>' + r.answer + '</b> \u2014 correct.' +
        '<span class="dim"> ' + r.pts + ' pts</span>';
    } else {
      out.classList.add('wrong');
      line.innerHTML = skip
        ? 'Three strikes \u2014 it was <b>' + r.answer + '</b>.<span class="dim"> 0 pts</span>'
        : 'Not quite. It was <b>' + r.answer + '</b>.<span class="dim"> 0 pts</span>';
    }
    el('nextBtn').textContent = game.round >= 4 ? 'See results \u2192' : 'Next round \u2192';
    persist();

    if (skip) {
      clearTimeout(skipTimer);
      skipTimer = setTimeout(function () {
        skipTimer = null;
        next();
      }, REVEAL_MS);
    }
  }

  function submitGuess() {
    var r = game.rounds[game.round];
    if (r.guess) return;
    var input = el('guessInput');
    var value = input.value.trim();
    if (!value) return;

    var exact = isExact(value, r.answer);
    r.attempts++;
    if (exact) {
      r.guess = value;
      r.correct = true;
      r.pts = r.attempts === 1 ? 100 : 50;
      finishRound(r, false);
      return;
    }

    /* first wrong guess unlocks the hint */
    if (r.attempts === 1) el('hintBtn').disabled = false;
    excludeWrongGuess(value, r);
    /* a second wrong guess live-upgrades a shown hint with the first letter */
    if (r.hint && r.attempts >= 2) renderHint();
    updateTries(r);
    persist();

    if (r.attempts >= 3) {
      r.guess = value;
      r.correct = false;
      r.pts = 0;
      finishRound(r, true);
      return;
    }

    /* intermediate wrong: stay on this round */
    setFeedback('\u2717 Not quite \u2014 try again');
    input.value = '';
    input.focus();
    closeSuggest();
  }

  function next() {
    var r = game.rounds[game.round];
    if (!r.guess) return;
    clearTimeout(skipTimer);
    skipTimer = null;
    if (game.round >= 4) { renderResults(); return; }
    game.round++;
    persist();
    renderRound();
  }

  /* playtest/fresh-start helper: clears today's lock + the player seed so a
     new game draws genuinely different rounds, then shows the board again. */
  function restartGame() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf('oa_bg_game_') === 0 || k === 'oa_bg_player' || k === 'oa_bg_history') {
          localStorage.removeItem(k);
        }
      });
    } catch (e) { /* ignore */ }
    game = { date: DATE, round: 0, score: 0, rounds: buildRounds() };
    persist();
    renderRound();
  }

  /* ── results ──────────────────────────────────────────── */
  /* daily counter, starting at launch (2026-10-08) so posts read "#1, #2, …" */
  function gameNumber() {
    var p = DATE.split('-');
    var n = Math.floor((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(2026, 9, 8)) / 86400000) + 1;
    return n > 0 ? n : 1;
  }
  function hypeLine() {
    var s = game.score;
    var pool = s >= 500
      ? ['A perfect day on the coast \uD83C\uDF0A', 'Five for five \u2014 Phuket surrendered.']
      : s >= 300
        ? ['The tide is in your favour. \uD83C\uDF34', 'You know your way around Phuket.']
        : s >= 150
          ? ['A solid swim \u2014 the sea kept some secrets.']
          : ['The tide comes back tomorrow \u2014 beat it.'];
    var rng = mulberry32(cyrb53(playerId() + '|hype|' + DATE));
    return pool[Math.floor(rng() * pool.length)];
  }

  function shareText() {
    var correct = game.rounds.filter(function (r) { return r.correct; }).length;
    var tokens = game.rounds.map(function (r) {
      return (r.correct ? '\uD83D\uDFE9' : '\u2B1C') + (r.hint ? '\uD83D\uDCA1' : '');
    }).join('');
    return '\uD83C\uDF0A Guess the Phuket Beach #' + gameNumber() +
      ' \u2014 ' + correct + '/5 \u00b7 ' + game.score + '/500\n' +
      tokens + '\n\n' +
      'Exact \u00b7 smart \uD83D\uDCA1 \u00b7 sunk \u2B1C\n' +
      hypeLine() + '\n' +
      'https://ossuaryphuket.me/tools/guess-the-beach/';
  }

  function renderResults() {
    show('game-view', false);
    show('results-view', true);

    var correct = game.rounds.filter(function (r) { return r.correct; }).length;
    el('resScore').textContent = correct + '/5 \u00b7 ' + game.score + '/500';
    el('resSub').textContent = game.score >= 500 ? 'A perfect day on the coast.' :
      game.score >= 300 ? 'You know your way around Phuket.' :
      game.score >= 150 ? 'A solid swim.' : 'The tide comes back tomorrow.';

    var list = el('resList');
    list.innerHTML = '';
    game.rounds.forEach(function (r, i) {
      var li = document.createElement('li');
      li.className = 'res-item';
      var thumb = document.createElement('img');
      thumb.className = 'res-thumb';
      thumb.src = r.photo.image;
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.width = 88;
      thumb.height = Math.round((88 * ((r.photo.h || 720) / (r.photo.w || 1280))) * 100) / 100;
      var mark = document.createElement('span');
      mark.className = 'res-mark';
      mark.innerHTML = (r.correct ? '\uD83D\uDFE9' : '\u2B1C') + (r.hint ? ' <span class="hl">\uD83D\uDCA1</span>' : '');
      var ans = document.createElement('div');
      ans.className = 'res-ans';
      var b = document.createElement('b');
      b.textContent = 'Round ' + (i + 1);
      var name = document.createElement('span');
      name.textContent = r.answer;
      ans.appendChild(b);
      ans.appendChild(name);
      ans.appendChild(mark);
      var pts = document.createElement('span');
      pts.className = 'res-score';
      pts.textContent = r.pts + ' pts';
      li.appendChild(thumb); li.appendChild(ans); li.appendChild(pts);
      list.appendChild(li);
    });

    var credits = el('credits');
    credits.innerHTML = '<h3>Photo credits</h3>';
    var seen = {},
      ulc = document.createElement('ul');
    game.rounds.forEach(function (r) {
      if (seen[r.photo.id]) return;
      seen[r.photo.id] = 1;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = r.photo.credit.match(/https:\/\/commons\.wikimedia\.org\/[^\s]+/i) ? r.photo.credit.match(/https:\/\/commons\.wikimedia\.org\/[^\s]+/i)[0] : '#';
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = r.answer + (r.photo.year ? ' (' + r.photo.year + ')' : '') + ' \u2014 ' + r.photo.credit;
      li.appendChild(a);
      ulc.appendChild(li);
    });
    credits.appendChild(ulc);

    el('shareText').value = shareText();
    window.scrollTo(0, 0);
  }

  /* ── share ────────────────────────────────────────────── */
  function doShare() {
    var text = shareText();
    if (navigator.share) {
      navigator.share({
        title: 'Guess the Phuket Beach',
        text: text,
        url: 'https://ossuaryphuket.me/tools/guess-the-beach/'
      }).catch(function () {});
    }
  }
  function doCopy() {
    var text = shareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        el('shareCopy').textContent = 'Copied!';
        setTimeout(function () { el('shareCopy').textContent = 'Copy result'; }, 1600);
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    var ta = el('shareText');
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
  }

  /* ── boot ─────────────────────────────────────────────── */
  function wireSuggest() {
    var input = el('guessInput');
    var box = el('suggest');
    input.addEventListener('input', onSuggestInput);
    input.addEventListener('keydown', onSuggestKey);
    box.addEventListener('mousedown', function (e) { e.preventDefault(); });
    box.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== box && !(t.classList && t.classList.contains('sug-item'))) t = t.parentNode;
      if (t && t !== box) {
        input.value = t.getAttribute('data-answer');
        submitGuess();
      }
    });
  }

  function boot() {
    el('dayChip').textContent = DATE;

    if (!DATA.length) {
      show('game-view', false);
      show('results-view', false);
      var app = el('app');
      var warn = document.createElement('div');
      warn.className = 'card gg-noscript';
      warn.innerHTML = '<strong>Photo data is missing.</strong><span>Run the site build to inline the beach photo set, then reload.</span>';
      app.appendChild(warn);
      return;
    }

    game = lsGet(GAME_KEY, null);
    if (!game || !Array.isArray(game.rounds) || !game.rounds.length ||
      !game.rounds.every(function (r) { return typeof r.attempts === 'number'; })) {
      game = { date: DATE, round: 0, score: 0, rounds: buildRounds() };
      persist();
    } else {
      /* older saves predate per-round guess exclusion */
      var legacy = false;
      game.rounds.forEach(function (r) {
        if (!r.excluded) { r.excluded = []; legacy = true; }
      });
      if (legacy) persist();
    }

    el('guessForm').addEventListener('submit', function (e) { e.preventDefault(); submitGuess(); });
    el('hintBtn').addEventListener('click', takeHint);
    el('nextBtn').addEventListener('click', next);
    el('btnReset').addEventListener('click', restartGame);
    el('shareNative').addEventListener('click', doShare);
    el('shareCopy').addEventListener('click', doCopy);
    wireSuggest();

    var finished = game.rounds.every(function (r) { return r.guess; });
    if (finished) renderResults();
    else renderRound();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();