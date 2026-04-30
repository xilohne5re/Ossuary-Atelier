/* ═══════════════════════════════════════════════
   OSSUARY ATELIER — index.js  (Hero)
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const { gsap, ScrollTrigger } = window;

  /* ── SPLASH INTRO: BUILD EYE SVG ── */
  const splashEye = document.getElementById('splash-eye');
  const buildEyeSVG = () => `
<svg viewBox="-90 -58 180 116" xmlns="http://www.w3.org/2000/svg"
     aria-hidden="true" style="overflow:visible">
  <defs>
    <filter id="eye-glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Outer whites -->
  <path d="M -72 0 C -52 -48, 52 -48, 72 0 C 52 48, -52 48, -72 0 Z"
        fill="#C9B8E8" filter="url(#eye-glow)"/>

  <!-- Dark iris area -->
  <ellipse cx="0" cy="0" rx="46" ry="36" fill="#080810"/>

  <!-- Iris ring 1 — rotates CW -->
  <circle class="iris-ring-1" cx="0" cy="0" r="36"
          fill="none" stroke="#C9B8E8" stroke-width="2.2"
          stroke-dasharray="8 4"/>

  <!-- Iris ring 2 — rotates CCW -->
  <circle class="iris-ring-2" cx="0" cy="0" r="28"
          fill="none" stroke="#C9B8E8" stroke-width="0.8"
          stroke-dasharray="3 6" opacity="0.4"/>

  <!-- Pupil -->
  <circle class="pupil" cx="0" cy="0" r="18" fill="#C9B8E8"/>
  <circle cx="0" cy="0" r="10" fill="#080810"/>

  <!-- O ring -->
  <circle cx="0" cy="0" r="5.5" fill="none"
          stroke="#C9B8E8" stroke-width="1.6"/>

  <!-- Top lashes -->
  <g stroke="#C9B8E8" stroke-linecap="round">
    <line x1="-38" y1="-32" x2="-46" y2="-54" stroke-width="2.2"/>
    <line x1="-18" y1="-42" x2="-21" y2="-64" stroke-width="2"/>
    <line x1="0"   y1="-44" x2="0"   y2="-68" stroke-width="2.4"/>
    <line x1="18"  y1="-42" x2="21"  y2="-64" stroke-width="2"/>
    <line x1="38"  y1="-32" x2="46"  y2="-54" stroke-width="2.2"/>
  </g>

  <!-- Bottom lashes -->
  <g stroke="#C9B8E8" stroke-linecap="round" opacity="0.55">
    <line x1="-28" y1="32" x2="-34" y2="50" stroke-width="1.8"/>
    <line x1="-10" y1="40" x2="-12" y2="58" stroke-width="1.6"/>
    <line x1="10"  y1="40" x2="12"  y2="58" stroke-width="1.6"/>
    <line x1="28"  y1="32" x2="34"  y2="50" stroke-width="1.8"/>
  </g>

  <!-- T-brackets -->
  <line x1="-72" y1="0"  x2="-86" y2="0"  stroke="#C9B8E8" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="-86" y1="-7" x2="-86" y2="7"  stroke="#C9B8E8" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="72"  y1="0"  x2="86"  y2="0"  stroke="#C9B8E8" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="86"  y1="-7" x2="86"  y2="7"  stroke="#C9B8E8" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

  splashEye.innerHTML = buildEyeSVG();

  /* ── SPLASH ANIMATION SEQUENCE ── */
  let splashCompleted = false;

  const splashTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Eye opens
  splashTl.to(splashEye, {
    opacity: 1,
    scale: 1,
    duration: 1.4,
    ease: 'power2.out',
    onStart: () => splashEye.style.opacity = '0',
  });

  /* ── HANDLE SPLASH CLICK ── */
  const splashIntro = document.getElementById('splash-intro');
  splashIntro.addEventListener('click', () => {
    if (splashCompleted) return;
    splashCompleted = true;

    // Mark splash as seen immediately
    sessionStorage.setItem('splashSeen', 'true');

    // Trigger shatter BEFORE hiding splash (container is inside splash-intro)
    createSplashShatter();

    // Then hide splash
    splashIntro.style.transition = 'opacity 0.1s';
    splashIntro.style.opacity = '0';

    // Small delay then start hero
    requestAnimationFrame(() => {
      setTimeout(() => {
        splashIntro.classList.add('hidden');
        startHeroAnimation();
      }, 50);
    });
  });

  /* ── SPLASH SHATTER PARTICLES ── */
  function createSplashShatter() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = 100;
    let created = 0;

    function makeShard() {
      if (created >= count) return;

      const shard = document.createElement('div');
      shard.className = 'splash-shard';
      shard.style.position = 'fixed';
      shard.style.left = cx + 'px';
      shard.style.top = cy + 'px';
      shard.style.width = (Math.random() * 6 + 2) + 'px';
      shard.style.height = (Math.random() > 0.5 ? 3 : 1) + 'px';
      shard.style.background = '#C9B8E8';
      shard.style.borderRadius = '0';
      shard.style.opacity = '0';
      shard.style.zIndex = '9999';
      document.body.appendChild(shard);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 300 + 80;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const rotation = Math.random() * 360;

      gsap.to(shard, {
        x: tx, y: ty,
        rotation: rotation,
        opacity: Math.random() * 0.7 + 0.3,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          shard.remove();
        }
      });

      created++;
      requestAnimationFrame(makeShard);
    }

    makeShard();
  }

/* ── MAIN HERO ANIMATION ── */
  function startHeroAnimation() {
    const eyeContainer = document.getElementById('hero-eye');
    const heroEye = document.getElementById('hero-eye');
    const hero = document.getElementById('hero');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    requestAnimationFrame(() => {
      eyeContainer.innerHTML = buildEyeSVG();

      tl.to(heroEye, {
        opacity: 1,
        scale: 1,
        duration: 1.4,
        ease: 'power2.out',
        onStart: () => heroEye.style.opacity = '0',
      })

      .add(() => {
        if (window.heroSkipped) return;
        requestAnimationFrame(() => {
          setTimeout(() => createHeroShatter(), 30);
        });
      }, '+=0.6')

      .to(heroEye, {
        scale: 0.85,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onStart: () => {
          const hero = document.getElementById('hero');
          if (hero) {
            gsap.to(hero, {
              opacity: 1,
              duration: 0.5,
              ease: 'power2.in',
            });
            if (!document.getElementById('glow-fade-style')) {
              const style = document.createElement('style');
              style.id = 'glow-fade-style';
              style.innerHTML = '#hero::before { opacity: 0 !important; }';
              document.head.appendChild(style);
            }
          }
        }
      }, '-=0.15')

      .add(() => {
        requestAnimationFrame(() => animateHeadline());
      }, '-=0.2');
    });

    const skip = () => {
      if (window.heroSkipped) return;
      window.heroSkipped = true;
      tl.kill();
      gsap.set(heroEye, { scale: 0.85, opacity: 0 });
      requestAnimationFrame(() => {
        setTimeout(() => createHeroShatter(), 30);
      });
      requestAnimationFrame(() => animateHeadline());
    };
    hero.addEventListener('click', skip, { once: true });
    hero.addEventListener('wheel', skip, { once: true });
  }

  /* ── HERO SHATTER PARTICLES ── */
  function createHeroShatter() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = 60;
    let created = 0;

    function makeShard() {
      if (created >= count) return;

      const shard = document.createElement('div');
      shard.className = 'shard';
      shard.style.position = 'fixed';
      shard.style.left = cx + 'px';
      shard.style.top = cy + 'px';
      shard.style.width = (Math.random() * 5 + 2) + 'px';
      shard.style.height = (Math.random() > 0.5 ? 3 : 1) + 'px';
      shard.style.background = '#C9B8E8';
      shard.style.borderRadius = '1px';
      shard.style.opacity = '0';
      shard.style.zIndex = '9999';
      document.body.appendChild(shard);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 200 + 50;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      gsap.to(shard, {
        x: tx, y: ty,
        opacity: Math.random() * 0.5 + 0.2,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          shard.remove();
        }
      });

      created++;
      requestAnimationFrame(makeShard);
    }

    makeShard();
  }

  /* ── HEADLINE WORD-BY-WORD ── */
  function animateHeadline() {
    const headline = document.getElementById('hero-headline');
    headline.style.display = 'flex';

    document.querySelectorAll('.word-inner').forEach((word, i) => {
      gsap.to(word, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
        delay: i * 0.07
      });
    });

    // sub + CTA
    setTimeout(() => {
      document.getElementById('hero-sub').classList.add('visible');
    }, 900);
  }

  /* ── SCROLL REVEAL: big text + marquee hide ── */
  if (gsap && ScrollTrigger) {
    // Hide marquee when reveal section comes into view
    ScrollTrigger.create({
      trigger: '#reveal-section',
      start: 'top 80%',
      onEnter: () => {
        document.getElementById('marquee-strip')?.classList.add('hidden');
      },
      onLeaveBack: () => {
        document.getElementById('marquee-strip')?.classList.remove('hidden');
      }
    });

    ScrollTrigger.create({
      trigger: '#reveal-section',
      start: 'top 70%',
      onEnter: () => {
        document.querySelectorAll('.reveal-huge .line-a, .reveal-huge .line-b')
          .forEach(el => el.classList.add('revealed'));
        document.querySelector('.reveal-body')?.classList.add('visible');
      }
    });

    // Intro panels
    document.querySelectorAll('.intro-panel').forEach(panel => {
      ScrollTrigger.create({
        trigger: panel,
        start: 'top 80%',
        onEnter: () => panel.classList.add('visible')
      });
    });
  }

  /* ── KINETIC TYPOGRAPHY: THE HUNT — typewriter + case wave ── */
  function initHunt() {
    const wrap = document.getElementById('hunt-wrap');
    if (!wrap) return;

    const BASE = 'THE\u00A0HUNT';
    const L = BASE.length;
    let tick = 0;
    let phase = 'typewrite';
    let holdFrames = 0;
    let currentLen = 0;
    const HOLD_FRAMES = 20;

    function render() {
      tick++;

      if (phase === 'typewrite') {
        if (tick % 4 === 0) {
          currentLen++;
          if (currentLen >= L) {
            currentLen = L;
            phase = 'hold';
            holdFrames = 0;
          }
        }
      } else if (phase === 'hold') {
        holdFrames++;
        if (holdFrames >= HOLD_FRAMES) {
          currentLen = 0;
          phase = 'typewrite';
        }
      }

      let html = '';
      for (let i = 0; i < L; i++) {
        const c = BASE[i];
        let displayChar = c;
        const wave = Math.sin((tick * 0.06) + i * 0.55);
        if (phase === 'typewrite' || (phase === 'hold' && holdFrames < 20)) {
          displayChar = c;
        } else {
          displayChar = c;
        }
        const visible = i < currentLen ? '1' : '0';
        html += `<span class="hunt-char" style="opacity:${visible}">${displayChar}</span>`;
      }

      wrap.innerHTML = html;
    }

    setInterval(render, 50);
  }

  initHunt();

  /* ── KINETIC TYPOGRAPHY: THE STORY — left scroll marquee with symbols ── */
  function initStory() {
    const wrap = document.getElementById('story-wrap');
    if (!wrap) return;

    const PHRASE = '\u00A0\u00A0\u00A0\u00A0>\u00A0\u00A0THE\u00A0\u00A0STORY\u00A0\u00A0';
    const glyphs = ['†', '‡', '⚰', '♱', '⛓', '⌬', '⌁', '⎈', '⇶', '⇋', '☥', '☾', '⚕', '⚗'];
    let tick = 0;

    function render() {
      tick++;
      const s = PHRASE + ' ' + glyphs[tick % glyphs.length] + ' ';
      const off = tick % s.length;
      const scrolled = s.substring(off) + s.substring(0, off);

      let html = '';
      for (const c of scrolled) {
        html += `<span class="story-char">${c}</span>`;
      }

      wrap.innerHTML = html;
    }

    setInterval(render, 190);
  }

  initStory();

  /* ── KINETIC TYPOGRAPHY: THE CLAIM — case wave ── */
  function initClaim() {
    const wrap = document.getElementById('claim-wrap');
    if (!wrap) { console.warn('claim-wrap not found'); return; }

    const PHRASE = '\u00A0THE\u00A0CLAIM\u00A0';
    let tick = 0;

    function render() {
      tick++;
const mapped = PHRASE.split('').map((char, idx) => {
        if (char === '\u00A0') return '\u00A0';
        const wave = Math.sin(tick * 0.5 + idx * 0.75);
        if (wave > 0.55) return char.toUpperCase();
        else if (wave < -0.55) return char.toLowerCase();
        else return char;
    }).join('');

      const html = `<span class="story-char">⁅</span>${mapped.split('').map(c => `<span class="story-char">${c}</span>`).join('')}<span class="story-char">⁆</span>`;
      wrap.innerHTML = html;
    }

    setInterval(render, 110);
  }

  initClaim();

  /* ── MARQUEE STRIP: duplicate for seamless loop ── */
  const marqueeInner = document.querySelector('.marquee-inner');
  if (marqueeInner) {
    marqueeInner.innerHTML += marqueeInner.innerHTML;
  }

});
