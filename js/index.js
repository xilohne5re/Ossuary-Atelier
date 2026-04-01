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

    // Trigger explosion
    createSplashShatter();

    // Eye shrinks and fades
    gsap.to(splashEye, {
      scale: 0.85,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in'
    });

    // Fade out splash after explosion
    gsap.to(splashIntro, {
      opacity: 0,
      duration: 0.6,
      delay: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        splashIntro.classList.add('hidden');
        // Trigger main hero animation
        startHeroAnimation();
      }
    });

    // Mark splash as seen
    sessionStorage.setItem('splashSeen', 'true');
  });

  /* ── SPLASH SHATTER PARTICLES ── */
  function createSplashShatter() {
    const container = document.getElementById('splash-shatter');
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = 120;

    for (let i = 0; i < count; i++) {
      const shard = document.createElement('div');
      shard.className = 'splash-shard';

      const size = Math.random() * 7 + 2.5;
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * 380 + 100;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const rotation = Math.random() * 360;

      shard.style.cssText = `
        left: ${cx}px; top: ${cy}px;
        width: ${size}px; height: ${size * (Math.random() > 0.5 ? 3 : 1)}px;
        transform: rotate(${rotation}deg);
        opacity: 0;
      `;
      container.appendChild(shard);

      gsap.to(shard, {
        x: tx, y: ty,
        rotation: rotation + Math.random() * 180,
        opacity: Math.random() * 0.9 + 0.3,
        duration: 0.7,
        ease: 'power2.out',
        delay: Math.random() * 0.25,
        onComplete: () => {
          gsap.to(shard, {
            opacity: 0,
            y: ty + 60,
            duration: 0.9,
            delay: Math.random() * 0.5,
            ease: 'power1.in',
            onComplete: () => shard.remove()
          });
        }
      });
    }
  }

  /* ── MAIN HERO ANIMATION ── */
  function startHeroAnimation() {
    // Build eye in hero section
    const eyeContainer = document.getElementById('hero-eye');
    eyeContainer.innerHTML = buildEyeSVG();
    const heroEye = document.getElementById('hero-eye');

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Eye opens
    tl.to(heroEye, {
      opacity: 1,
      scale: 1,
      duration: 1.4,
      ease: 'power2.out',
      onStart: () => heroEye.style.opacity = '0',
    })

    // Shatter
    .add(() => {
      createHeroShatter();
    }, '+=0.6')

    // Eye shrinks and fades, glow fades out
    .to(heroEye, {
      scale: 0.85,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
      onStart: () => {
        // Fade out the glow
        const hero = document.getElementById('hero');
        if (hero) {
          gsap.to(hero, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.in',
            onUpdate: function() {
              const opacity = this.targets()[0].style.opacity || 1;
            }
          });
          // Inject CSS to fade the pseudo-element
          if (!document.getElementById('glow-fade-style')) {
            const style = document.createElement('style');
            style.id = 'glow-fade-style';
            style.innerHTML = '#hero::before { opacity: 0 !important; }';
            document.head.appendChild(style);
          }
        }
      }
    }, '-=0.15')

    // Headline slams in
    .add(() => {
      animateHeadline();
    }, '-=0.2');
  }

  /* ── HERO SHATTER PARTICLES ── */
  function createHeroShatter() {
    const container = document.getElementById('hero-shatter');
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = 80;

    for (let i = 0; i < count; i++) {
      const shard = document.createElement('div');
      shard.className = 'shard';

      const size = Math.random() * 6 + 2;
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * 300 + 80;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      shard.style.cssText = `
        left: ${cx}px; top: ${cy}px;
        width: ${size}px; height: ${size * (Math.random() > 0.5 ? 3 : 1)}px;
        transform: rotate(${Math.random() * 360}deg);
        opacity: 0;
      `;
      container.appendChild(shard);

      gsap.to(shard, {
        x: tx, y: ty,
        opacity: Math.random() * 0.8 + 0.2,
        duration: 0.6,
        ease: 'power2.out',
        delay: Math.random() * 0.2,
        onComplete: () => {
          gsap.to(shard, {
            opacity: 0,
            y: ty + 40,
            duration: 0.8,
            delay: Math.random() * 0.4,
            ease: 'power1.in',
            onComplete: () => shard.remove()
          });
        }
      });
    }
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

  /* ── SCROLL REVEAL: big text ── */
  if (gsap && ScrollTrigger) {
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

  /* ── MARQUEE: duplicate for seamless loop ── */
  const marqueeInner = document.querySelector('.marquee-inner');
  if (marqueeInner) {
    marqueeInner.innerHTML += marqueeInner.innerHTML;
  }

});
