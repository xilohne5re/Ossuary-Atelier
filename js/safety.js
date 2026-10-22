/* ═══════════════════════════════════════════════
   OSSUARY ATELIER — safety.js
   Field-guide quiz + collectible specimen stamps.
   State lives in localStorage only; no network, no cookies.
   ═══════════════════════════════════════════════ */

(function () {
  var KEY = 'oa-safety-stamps-v1';

  function load() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function save(set) {
    try { localStorage.setItem(KEY, JSON.stringify(Array.from(set))); } catch (e) {}
  }

  var earned = load();

  function paint() {
    document.querySelectorAll('.stamp[data-stamp]').forEach(function (el) {
      el.classList.toggle('earned', earned.has(el.getAttribute('data-stamp')));
    });

    document.querySelectorAll('[data-stamp-count]').forEach(function (el) {
      el.textContent = String(earned.size);
    });

    document.querySelectorAll('.stamp-bar[data-stamp-total]').forEach(function (bar) {
      var total = Number(bar.getAttribute('data-stamp-total')) || 15;
      var fill = bar.querySelector('span');
      if (fill) fill.style.width = Math.round((earned.size / total) * 100) + '%';
    });

    document.querySelectorAll('.chapter-card[data-stamps]').forEach(function (card) {
      var ids = (card.getAttribute('data-stamps') || '').split(',').filter(Boolean);
      var done = ids.filter(function (id) { return earned.has(id); }).length;
      var out = card.querySelector('[data-chapter-progress]');
      if (out) out.textContent = done + ' / ' + ids.length + ' recovered';
      card.classList.toggle('complete', ids.length > 0 && done === ids.length);
    });

    var lic = document.querySelector('.licentiate');
    if (lic) lic.classList.toggle('complete', earned.size >= (Number(lic.getAttribute('data-total')) || 15));
  }

  document.querySelectorAll('.quiz-opts').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.quiz-opt') : null;
      if (!btn || group.getAttribute('data-done') === '1') return;
      var answer = Number(group.getAttribute('data-answer'));
      var pick = Number(btn.getAttribute('data-i'));
      var q = group.closest('.quiz-q');

      if (pick === answer) {
        group.setAttribute('data-done', '1');
        group.querySelectorAll('.quiz-opt').forEach(function (b) {
          b.disabled = true;
          if (Number(b.getAttribute('data-i')) === answer) b.classList.add('correct');
        });
        var stamp = group.getAttribute('data-stamp');
        if (stamp) { earned.add(stamp); save(earned); }
        if (q) q.classList.add('solved');
        var fb = q && q.querySelector('.quiz-feedback');
        if (fb) fb.textContent = (q.getAttribute('data-success') || 'Specimen recovered');
        paint();
      } else {
        btn.classList.add('wrong');
        var hint = q && q.querySelector('.quiz-hint');
        if (hint) hint.hidden = false;
      }
    });
  });

  document.querySelectorAll('.quiz-reset').forEach(function (btn) {
    btn.addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      earned = new Set();
      document.querySelectorAll('.quiz-opts').forEach(function (g) {
        g.removeAttribute('data-done');
        g.querySelectorAll('.quiz-opt').forEach(function (o) {
          o.disabled = false;
          o.classList.remove('correct', 'wrong');
        });
      });
      document.querySelectorAll('.quiz-q').forEach(function (q) {
        q.classList.remove('solved');
        var fb = q.querySelector('.quiz-feedback');
        if (fb) fb.textContent = '';
        var hint = q.querySelector('.quiz-hint');
        if (hint) hint.hidden = true;
      });
      paint();
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint);
  } else {
    paint();
  }
})();

/* ═══════════════════════════════════════════════
   Image credits: a small toggle that opens the source
   and licence details for a photograph. The one-line
   attribution under every image is always visible, so
   the credit still reads without JavaScript.
   ═══════════════════════════════════════════════ */

(function () {
  var toggles = Array.prototype.slice.call(document.querySelectorAll('.credit-toggle'));

  if (!toggles.length) return;

  function panelFor(btn) {
    var id = btn.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  function setOpen(btn, open) {
    var panel = panelFor(btn);
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeAll(except) {
    toggles.forEach(function (btn) {
      if (btn !== except) setOpen(btn, false);
    });
  }

  toggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true';
      closeAll(btn);
      setOpen(btn, !open);
    });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.credit-toggle, .credit-panel')) return;
    closeAll(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var open = toggles.filter(function (btn) {
      return btn.getAttribute('aria-expanded') === 'true';
    });
    open.forEach(function (btn) {
      setOpen(btn, false);
      btn.focus();
    });
  });
})();
