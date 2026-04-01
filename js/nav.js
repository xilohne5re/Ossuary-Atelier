/* ═══════════════════════════════════════════════
   OSSUARY ATELIER — nav.js
   Shared: navigation, cursor, page transitions
═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── ONCLICK NUMBER ANIMATIONS ──────────────────────────── */
  
  // Generate random binary string
  function generateBinary() {
    let binary = '';
    for (let i = 0; i < 5; i++) {
      binary += Math.random() > 0.5 ? '1' : '0';
    }
    return binary;
  }

  // Create falling barcode/binary text
  function createScanPacket(x, y) {
    const packet = document.createElement('div');
    const isBinary = Math.random() > 0.4;
    const text = isBinary ? generateBinary() : Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    packet.textContent = text;
    packet.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      pointer-events: none;
      z-index: 9996;
      font-family: 'Courier New', monospace;
      font-size: ${isBinary ? '9px' : '10px'};
      font-weight: bold;
      color: ${isBinary ? '#C9B8E8' : '#4B2D7A'};
      text-shadow: 0 0 ${isBinary ? '6px' : '4px'} ${isBinary ? '#C9B8E8' : '#4B2D7A'};
      transform: translateZ(0);
      opacity: 1;
      letter-spacing: ${isBinary ? '2px' : '1px'};
    `;
    document.body.appendChild(packet);

    if (typeof gsap !== 'undefined') {
      gsap.to(packet, {
        x: (Math.random() - 0.5) * 80,
        y: 50 + Math.random() * 60,
        opacity: 0,
        duration: 0.9 + Math.random() * 0.4,
        ease: 'power1.in',
        onComplete: () => packet.remove()
      });
    } else {
      setTimeout(() => packet.remove(), 1000);
    }
  }

  // Onclick animation - create burst of packets
  document.addEventListener('click', e => {
    // Create burst of scan packets around click point
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        createScanPacket(
          e.clientX + (Math.random() - 0.5) * 60,
          e.clientY + (Math.random() - 0.5) * 60
        );
      }, i * 50);
    }
  }, { passive: true });

  // Hide/show on leave/enter
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
  });

  /* ── PAGE TRANSITION ───────────────────────── */
  const overlay = document.getElementById('page-transition');

  // Fade in on load
  overlay.classList.remove('active');

  // Intercept nav links for transition
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('instagram')) return;

    link.addEventListener('click', e => {
      e.preventDefault();
      overlay.classList.add('active');
      setTimeout(() => {
        window.location.href = href;
      }, 380);
    });
  });

  // On page load, fade out
  window.addEventListener('load', () => {
    setTimeout(() => overlay.classList.remove('active'), 50);
  });

  /* ── NAV SCROLL BEHAVIOUR ───────────────────── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ── NAV ENTRANCE ───────────────────────────── */
  setTimeout(() => {
    document.querySelector('.nav-logo')?.classList.add('visible');
    document.querySelectorAll('.nav-links li').forEach(li =>
      li.classList.add('visible'));
  }, 600);

  /* ── ACTIVE LINK ────────────────────────────── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, #nav-overlay a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── BURGER MENU ────────────────────────────── */
  const burger  = document.querySelector('.nav-burger');
  const navOver = document.getElementById('nav-overlay');

  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    navOver.classList.toggle('open');
    document.body.style.overflow = navOver.classList.contains('open') ? 'hidden' : '';
  });

  /* ── EYE ICON SVG ─ shared function ─────────── */
  // Returns a clean SVG string for the Ossuary eye mark
  window.eyeSVG = (w=160, h=104, fill='#C9B8E8', bg='transparent') => `
<svg width="${w}" height="${h}" viewBox="-90 -58 180 116"
     xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${bg !== 'transparent' ? `<rect x="-90" y="-58" width="180" height="116" fill="${bg}"/>` : ''}
  <!-- Outer eye whites -->
  <path d="M -72 0 C -52 -48, 52 -48, 72 0 C 52 48, -52 48, -72 0 Z"
        fill="${fill}"/>
  <!-- Dark iris -->
  <ellipse cx="0" cy="0" rx="46" ry="36" fill="${bg === 'transparent' ? 'var(--void,#080810)' : bg}"/>
  <!-- Iris ring 1 -->
  <circle cx="0" cy="0" r="36" fill="none"
          stroke="${fill}" stroke-width="2.2"/>
  <!-- Iris ring 2 faint -->
  <circle cx="0" cy="0" r="28" fill="none"
          stroke="${fill}" stroke-width="0.8" opacity="0.35"/>
  <!-- Pupil -->
  <circle cx="0" cy="0" r="18" fill="${fill}"/>
  <!-- Pupil dark centre -->
  <circle cx="0" cy="0" r="10" fill="${bg === 'transparent' ? 'var(--void,#080810)' : bg}"/>
  <!-- O engraved in pupil -->
  <circle cx="0" cy="0" r="5.5" fill="none"
          stroke="${fill}" stroke-width="1.6"/>
  <!-- Top lashes: 5 rays -->
  <g stroke="${fill}" stroke-linecap="round">
    <line x1="-38" y1="-32" x2="-46" y2="-54" stroke-width="2.2"/>
    <line x1="-18" y1="-42" x2="-21" y2="-64" stroke-width="2"/>
    <line x1="0"   y1="-44" x2="0"   y2="-68" stroke-width="2.2"/>
    <line x1="18"  y1="-42" x2="21"  y2="-64" stroke-width="2"/>
    <line x1="38"  y1="-32" x2="46"  y2="-54" stroke-width="2.2"/>
  </g>
  <!-- Bottom lashes: 4 rays, shorter -->
  <g stroke="${fill}" stroke-linecap="round" opacity="0.55">
    <line x1="-28" y1="32" x2="-34" y2="50" stroke-width="1.8"/>
    <line x1="-10" y1="40" x2="-12" y2="58" stroke-width="1.6"/>
    <line x1="10"  y1="40" x2="12"  y2="58" stroke-width="1.6"/>
    <line x1="28"  y1="32" x2="34"  y2="50" stroke-width="1.8"/>
  </g>
  <!-- Left T-bracket -->
  <line x1="-72" y1="0" x2="-86" y2="0"  stroke="${fill}" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="-86" y1="-7" x2="-86" y2="7" stroke="${fill}" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Right T-bracket -->
  <line x1="72"  y1="0" x2="86"  y2="0"  stroke="${fill}" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="86"  y1="-7" x2="86"  y2="7" stroke="${fill}" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

  /* ── INJECT NAV EYE ── */
  const logoEyeEl = document.querySelector('.nav-logo-eye');
  if (logoEyeEl) {
    logoEyeEl.innerHTML = window.eyeSVG(28, 18, '#C9B8E8', 'transparent');
    logoEyeEl.querySelector('svg').setAttribute('viewBox', '-90 -58 180 116');
    logoEyeEl.querySelector('svg').style.width  = '100%';
    logoEyeEl.querySelector('svg').style.height = '100%';
  }

  /* ── LENIS SMOOTH SCROLL ─ if loaded ── */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
    window.__lenis = lenis;
  }

});
