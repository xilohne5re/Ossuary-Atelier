/* ═══════════════════════════════════════════════
   OSSUARY ATELIER — tools/slang-glossary/speak.js
   Shared Thai pronunciation. Loaded by the dictionary page
   and by every generated terms/<id>.html page, so the same
   behaviour (and the same single copy of the voice logic)
   applies everywhere.

   Any element carrying a data-speak attribute becomes a
   speak button:

     <button class="gl-say" data-speak="มือสอง">🔊</button>

   Markup ships these buttons disabled; this module enables
   them only once a real th-* voice exists. Most Windows
   installs have none, and a button that silently does
   nothing is worse than one that says why.

   window.speechSynthesis existing does NOT mean Thai is
   available, so we look for an actual th-* voice and also
   cope with Chrome populating getVoices() asynchronously.
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  var NO_VOICE = 'No Thai (th-*) voice is installed on this device.';
  var DEFAULT_TIP = 'Hear it';

  var thaiVoice = null;
  var buttons = [];

  function detectVoice() {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    for (var i = 0; i < voices.length; i++) {
      if (/^th[-_]/i.test(voices[i].lang || '')) return voices[i];
    }
    return null;
  }

  function speak(text) {
    if (!thaiVoice || !text) return;
    try {
      var synth = window.speechSynthesis;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = thaiVoice.lang || 'th-TH';
      u.voice = thaiVoice;
      synth.speak(u);
    } catch (e) { /* speech unavailable — fail silently, as specified */ }
  }

  /* Every wired button tracks voice availability. The tooltip mirrors the
     aria-label once working, so the two never drift apart. */
  function applyState() {
    var ready = !!thaiVoice;
    document.body.classList.toggle('no-tts', !ready);
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.disabled = !ready;
      b.title = ready ? (b.getAttribute('aria-label') || DEFAULT_TIP) : NO_VOICE;
    }
  }

  function onClick(ev) {
    /* Cards are wholly clickable, so keep the press off the card link. */
    ev.preventDefault();
    ev.stopPropagation();
    speak(this.getAttribute('data-speak'));
  }

  /* Idempotent: the dictionary renders cards after load, so this is called
     again on every render to pick up newly inserted buttons. */
  function collect() {
    var nodes = document.querySelectorAll('[data-speak]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute('data-speak-wired')) continue;
      el.setAttribute('data-speak-wired', '');
      el.addEventListener('click', onClick);
      buttons.push(el);
    }
    return buttons.length;
  }

  function init() {
    if (!('speechSynthesis' in window)) { applyState(); return; }

    thaiVoice = detectVoice();
    if (thaiVoice) { applyState(); return; }

    var synth = window.speechSynthesis;
    var onVoices = function () {
      thaiVoice = detectVoice();
      applyState();
      if (synth.removeEventListener) synth.removeEventListener('voiceschanged', onVoices);
      else synth.onvoiceschanged = null;
    };

    if (synth.addEventListener) synth.addEventListener('voiceschanged', onVoices);
    else synth.onvoiceschanged = onVoices;

    /* Safari sometimes never fires voiceschanged — re-check on first touch. */
    document.addEventListener('pointerdown', function once() {
      document.removeEventListener('pointerdown', once);
      if (!thaiVoice) onVoices();
    });
  }

  function start() {
    collect();
    applyState();
    init();
  }

  window.OA_SPEAK = {
    speak: speak,
    isReady: function () { return !!thaiVoice; },
    /* Re-scan for buttons added after load (dictionary card re-renders). */
    refresh: function () { collect(); applyState(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();