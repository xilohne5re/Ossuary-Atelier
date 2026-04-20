/* OSSUARY ATELIER — Target Cursor Effect (Stable) */
(function() {
  const options = {
    spinDuration: 2.1,
    hideDefaultCursor: true,
    hoverDuration: 0.4,
    parallaxOn: true,
    borderWidth: 3,
    cornerSize: 15
  };

  const isMobile = () => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmall = window.innerWidth <= 768;
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    return (hasTouch && isSmall) || isMobileUA;
  };

  if (isMobile()) return;

  const cursorWrap = document.createElement('div');
  cursorWrap.className = 'target-cursor-wrapper';
  cursorWrap.innerHTML = '<div class="target-cursor-dot"></div><div class="target-cursor-corner corner-tl"></div><div class="target-cursor-corner corner-tr"></div><div class="target-cursor-corner corner-br"></div><div class="target-cursor-corner corner-bl"></div>';
  document.body.appendChild(cursorWrap);

  const cursor = cursorWrap;
  const dot = cursor.querySelector('.target-cursor-dot');
  const corners = cursor.querySelectorAll('.target-cursor-corner');

  if (options.hideDefaultCursor) {
    document.body.style.cursor = 'none';
  }

  let activeTarget = null;
  let currentLeaveHandler = null;
  let resumeTimeout = null;
  let spinTl = null;
  let isTargeting = false;
  let targetCornerPositions = null;
  let lastScrollUpdate = 0;
  let scrollTickScheduled = false;

  gsap.set(cursor, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

  function createSpin() {
    if (spinTl) spinTl.kill();
    spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: options.spinDuration, ease: 'none' });
  }
  createSpin();

  function moveCursor(x, y) {
    gsap.to(cursor, { x, y, duration: 0.1, ease: 'power3.out' });
  }

  function ticker() {
    if (!targetCornerPositions || !isTargeting) return;

    const cursorX = gsap.getProperty(cursor, 'x');
    const cursorY = gsap.getProperty(cursor, 'y');

    corners.forEach((corner, i) => {
      const targetX = targetCornerPositions[i].x - cursorX;
      const targetY = targetCornerPositions[i].y - cursorY;

      gsap.to(corner, {
        x: targetX,
        y: targetY,
        duration: 0.15,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  }

  window.addEventListener('mousemove', e => moveCursor(e.clientX, e.clientY));

  // Throttled scroll update using requestAnimationFrame
  function handleScroll() {
    if (!activeTarget || !cursor) return;

    const now = Date.now();
    // Only update at max 60fps (every 16ms), or ideally 30fps (~33ms) for slower devices
    if (now - lastScrollUpdate < 30) {
      if (!scrollTickScheduled) {
        scrollTickScheduled = true;
        requestAnimationFrame(handleScroll);
      }
      return;
    }

    lastScrollUpdate = now;
    scrollTickScheduled = false;

    const rect = activeTarget.getBoundingClientRect();
    const { borderWidth, cornerSize } = options;
    if (targetCornerPositions) {
      targetCornerPositions = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ];
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  window.addEventListener('mousedown', () => {
    gsap.to(dot, { scale: 0.7, duration: 0.3 });
    gsap.to(cursor, { scale: 0.9, duration: 0.2 });
  });

  window.addEventListener('mouseup', () => {
    gsap.to(dot, { scale: 1, duration: 0.3 });
    gsap.to(cursor, { scale: 1, duration: 0.2 });
  });

  function onEnter(e) {
    const target = e.target;
    const isLink = target.tagName === 'A';
    const isButton = target.tagName === 'BUTTON';
    const isBurger = target.classList.contains('nav-burger');
    const isItemCard = target.classList.contains('item-card');

    if (!isLink && !isButton && !isBurger && !isItemCard) return;
    if (!cursor || !corners.length) return;
    if (activeTarget === target) return;

    if (activeTarget && currentLeaveHandler) {
      activeTarget.removeEventListener('mouseleave', currentLeaveHandler);
    }

    activeTarget = target;
    isTargeting = true;

    corners.forEach(c => gsap.killTweensOf(c));
    gsap.killTweensOf(cursor, 'rotation');
    spinTl.pause();
    gsap.set(cursor, { rotation: 0 });

    const rect = activeTarget.getBoundingClientRect();
    const { borderWidth, cornerSize } = options;

    targetCornerPositions = [
      { x: rect.left - borderWidth, y: rect.top - borderWidth },
      { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
      { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
      { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
    ];

    gsap.ticker.add(ticker);

    currentLeaveHandler = () => {
      gsap.ticker.remove(ticker);
      isTargeting = false;
      activeTarget = null;
      targetCornerPositions = null;

      const { cornerSize } = options;
      const positions = [
        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
        { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
      ];

      corners.forEach((corner, i) => {
        gsap.to(corner, { x: positions[i].x, y: positions[i].y, duration: 0.3, ease: 'power3.out' });
      });

      resumeTimeout = setTimeout(() => {
        if (!activeTarget && cursor && spinTl) {
          const currentRot = gsap.getProperty(cursor, 'rotation') || 0;
          const normalized = currentRot % 360;
          spinTl.kill();
          spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: options.spinDuration, ease: 'none' });
          gsap.to(cursor, { rotation: normalized + 360, duration: options.spinDuration * (1 - normalized / 360), ease: 'none', onComplete: () => spinTl?.restart() });
        }
        resumeTimeout = null;
      }, 50);

      if (activeTarget) {
        activeTarget.removeEventListener('mouseleave', currentLeaveHandler);
      }
    };

    activeTarget.addEventListener('mouseleave', currentLeaveHandler);
  }

  window.addEventListener('mouseover', onEnter);
})();