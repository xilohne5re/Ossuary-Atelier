// Interactive Geometric Background — performance-capped
class InteractiveBackground {
  constructor() {
    this.canvas = document.getElementById('background-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.mouseX = this.canvas.width / 2;
    this.mouseY = this.canvas.height / 2;
    this.dots = [];
    this.baseConnectionDistance = 150;
    this.animationId = null;
    this.time = 0;
    this.gridOpacity = 0.03;
    this.targetGridOpacity = 0.03;
    this.lastMouseMove = 0;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.isLowPerformance = this.detectLowPerformance();
    this.animationsEnabled = true; // Master toggle for all background animation
    this.maxDots = this.isLowPerformance ? 40 : 70;
    this.MAX_EXPLOSION_DOTS = this.isLowPerformance ? 40 : 120;
    this.visible = true;

    this.setupCanvas();
    this.generateRandomDots();
    this.buildGlowSprite();
    this.attachEventListeners();
    this.createToggleButton(); // Add toggle button
    this.trackVisibility();
    this.animate();
  }

  buildGlowSprite() {
    // Pre-render a single violet radial glow, reused via drawImage —
    // avoids creating a new gradient per dot per frame.
    const size = 64;
    const sprite = document.createElement('canvas');
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext('2d');
    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(201, 184, 232, 0.42)');
    g.addColorStop(1, 'rgba(201, 184, 232, 0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, size, size);
    this.glowSprite = sprite;
    this.glowPx = size;
  }

  trackVisibility() {
    // Pause entirely while the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      this.tabVisible = !document.hidden;
    });
    this.tabVisible = !document.hidden;
  }

  createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'background-toggle';
    btn.textContent = 'Background: ON';
    btn.setAttribute('title', 'Toggle background animations');
    btn.onclick = () => {
      this.toggleAnimations();
    };
    document.body.appendChild(btn);
    this.toggleBtn = btn;
    this.setupToggleVisibility();
  }

  setupToggleVisibility() {
    let lastScrollY = 0;
    let hideTimeout = null;
    const showButton = () => {
      if (!this.toggleBtn) return;
      this.toggleBtn.style.transition = 'opacity 0.3s, transform 0.3s';
      this.toggleBtn.style.opacity = '1';
      this.toggleBtn.style.transform = 'translateY(0)';
    };
    const hideButton = () => {
      if (!this.toggleBtn) return;
      this.toggleBtn.style.transition = 'opacity 0.3s, transform 0.3s';
      this.toggleBtn.style.opacity = '0';
      this.toggleBtn.style.transform = 'translateY(-20px)';
    };

    // Scroll hide on mobile
    const isMobile = () => window.innerWidth <= 768;
    window.addEventListener('scroll', () => {
      if (!isMobile()) {
        showButton();
        return;
      }
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        hideButton();
      } else {
        showButton();
      }
      lastScrollY = currentScrollY;
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (isMobile()) hideButton();
      }, 2000);
    }, { passive: true });

    // Hide when modal opens
    const modal = document.getElementById('claim-modal');
    if (modal) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            if (modal.classList.contains('open') && isMobile()) {
              hideButton();
            } else if (isMobile()) {
              showButton();
            }
          }
        });
      });
      observer.observe(modal, { attributes: true });
    }
  }

  toggleAnimations() {
    this.animationsEnabled = !this.animationsEnabled;
    if (this.toggleBtn) {
      this.toggleBtn.textContent = this.animationsEnabled ? 'Background: ON' : 'Background: OFF';
    }
    if (!this.animationsEnabled) {
      this.clearCanvas();
    }
  }

  clearCanvas() {
    const w = this.canvas.width / this.devicePixelRatio;
    const h = this.canvas.height / this.devicePixelRatio;
    this.ctx.clearRect(0, 0, w, h);
  }

  detectLowPerformance() {
    // Simple heuristic: check for mobile or low-end devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reducedMotion || isMobile || hasLowMemory || window.innerWidth < 768;
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.generateRandomDots();
  }

  generateRandomDots() {
    this.dots = [];
    const areaW = this.canvas.width / this.devicePixelRatio;
    const areaH = this.canvas.height / this.devicePixelRatio;
    const baseDotCount = Math.ceil((areaW * areaH) / 16000);
    const dotCount = Math.min(this.maxDots, Math.max(30, baseDotCount));

    for (let i = 0; i < dotCount; i++) {
      this.dots.push(this.newBackgroundDot());
    }
  }

  newBackgroundDot() {
    return {
      x: Math.random() * (this.canvas.width / this.devicePixelRatio),
      y: Math.random() * (this.canvas.height / this.devicePixelRatio),
      strength: Math.random(),
      pulsePhase: Math.random() * Math.PI * 2,
      connected: false,
      lifespan: 150 + Math.random() * 200,
      currentLife: 0,
      opacity: 0,
      flicker: Math.random()
    };
  }

  attachEventListeners() {
    let throttledMouseMove = (e) => {
      const now = Date.now();
      if (now - this.lastMouseMove > 16) { // ~60fps throttle
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.lastMouseMove = now;
      }
    };

    document.addEventListener('mousemove', throttledMouseMove);

    // Click/Tap explosion effect - desktop click or mobile touch end
    document.addEventListener('click', (e) => this.triggerExplosion(e.clientX, e.clientY));
    document.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        this.triggerExplosion(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.dots.forEach(dot => dot.connected = false);
    });

    window.addEventListener('scroll', () => this.updateGridOpacity(), { passive: true });
  }

  updateGridOpacity() {
    const heroSection = document.getElementById('hero');
    this.targetGridOpacity = 0.03;

    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const heroStart = Math.max(0, -heroRect.top / viewportHeight);
      const heroEnd = Math.max(0, (viewportHeight - heroRect.top) / heroRect.height);
      const heroVisibility = Math.min(heroStart, heroEnd, 1);

      if (heroVisibility > 0) {
        this.targetGridOpacity = 0.03 * (1 - heroVisibility);
      }
    }
  }

  triggerExplosion(x, y) {
    if (!this.animationsEnabled) return;
    if (this.dots.length >= this.maxDots + this.MAX_EXPLOSION_DOTS) return;

    // Progressive click system
    this.clickCount = (this.clickCount || 0) + 1;
    const timeSinceLastClick = Date.now() - (this.lastClickTime || 0);
    this.lastClickTime = Date.now();

    // Reset progress if clicked too slowly (more than 1 second)
    if (timeSinceLastClick > 1000) {
      this.clickCount = 1;
    }

    // Max progress cap - need 10 clicks for mega explosion
    const progress = Math.min(this.clickCount, 10);

    // Calculate explosion size based on progress
    const baseParticles = this.isLowPerformance ? 3 : 6;
    const particleCount = Math.min(18, baseParticles + (progress * 2));
    const baseSpeed = 2 + (progress * 0.8);

    const remaining = this.MAX_EXPLOSION_DOTS - this.explosionCount();
    const toAdd = Math.min(particleCount, remaining);

    for (let i = 0; i < toAdd; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = baseSpeed + Math.random() * 3;
      const size = 0.5 + (progress * 0.15);

      this.dots.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        decay: 0.015 + Math.random() * 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
        flicker: Math.random(),
        strength: size,
        opacity: 1,
        isExplosion: true,
        isWave: progress >= 10 // Mega explosion flag
      });
    }

    // Trigger mega wave when reaching 10 clicks
    if (progress >= 10) {
      this.clickCount = 0;
      this.triggerMegaWave(x, y);
    }
  }

  explosionCount() {
    let n = 0;
    for (const d of this.dots) if (d.isExplosion) n++;
    return n;
  }

  triggerMegaWave(centerX, centerY) {
    const remaining = this.MAX_EXPLOSION_DOTS - this.explosionCount();
    const count = Math.min(30, remaining);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 8 + Math.random() * 4;

      this.dots.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        decay: 0.008,
        pulsePhase: Math.random() * Math.PI * 2,
        flicker: Math.random(),
        strength: 2.5,
        opacity: 1,
        isExplosion: true,
        isWave: true
      });
    }
  }

  drawDot(dot) {
    if (dot.opacity < 0.01) return;

    const pulse = Math.sin(dot.pulsePhase + this.time * 0.05) * 0.5 + 0.5;
    const flicker = Math.sin(this.time * 0.08 + dot.flicker * 10) * 0.3 + 0.7;
    const effectiveStrength = dot.strength * flicker;

    const baseRadius = 1.1 + effectiveStrength * 1.0;
    const maxRadius = 2.2 + effectiveStrength * 1.8;
    const radius = baseRadius + pulse * (maxRadius - baseRadius);

    const brightnessMult = (0.28 + effectiveStrength * 0.3) * dot.opacity;
    const size = radius * 4;

    // Glow via pre-rendered sprite (one gradient, shared across all dots).
    this.ctx.drawImage(this.glowSprite, dot.x - size / 2, dot.y - size / 2, size, size);

    const brightness = dot.connected ? brightnessMult * 1.1 : brightnessMult * 0.45;
    this.ctx.globalAlpha = Math.max(0, Math.min(1, brightness));
    this.ctx.fillStyle = '#C9B8E8';
    this.ctx.beginPath();
    this.ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    if (dot.connected) {
      this.ctx.globalAlpha = Math.max(0, Math.min(1, effectiveStrength * 0.7 * dot.opacity));
      this.ctx.strokeStyle = '#6B3DAA';
      this.ctx.lineWidth = 1 + effectiveStrength * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, radius + 2, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    }
  }

  drawConnections() {
    // Skip if toggle is off, tab hidden, or particle budget exhausted.
    if (this.animationsEnabled === false || this.tabVisible === false) return;
    if (this.dots.length > 180) return;

    const connectionDistFactor = 0.9;

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      dot.connected = false;
    }

    // Limit the mouse-relevant area so the pass stays O(n) near the cursor.
    const radius = this.baseConnectionDistance * connectionDistFactor;
    const candidates = [];
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      if (d.opacity < 0.1) continue;
      if (Math.hypot(d.x - this.mouseX, d.y - this.mouseY) < radius * 0.7) {
        d.connected = true;
        candidates.push(i);
      }
    }

    const limit = this.isLowPerformance ? 24 : 44;
    if (candidates.length > limit) candidates.splice(limit - 1);

    for (let ci = 0; ci < candidates.length; ci++) {
      const i = candidates[ci];
      const dot = this.dots[i];

      for (let j = ci + 1; j < candidates.length; j++) {
        const other = this.dots[candidates[j]];
        const dist = Math.hypot(dot.x - other.x, dot.y - other.y);
        if (dist > radius * 0.8) continue;

        const avgStrength = (dot.strength + other.strength) / 2;
        const alpha = (1 - (dist / (radius * 0.8))) * (0.15 + avgStrength * 0.25);
        if (alpha <= 0) continue;

        this.ctx.strokeStyle = `rgba(201, 184, 232, ${alpha.toFixed(3)})`;
        this.ctx.lineWidth = 0.8 + avgStrength * 0.5;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(dot.x, dot.y);
        this.ctx.lineTo(other.x, other.y);
        this.ctx.stroke();
      }
    }
  }

  drawGrid() {
    if (this.gridOpacity < 0.01) return; // Skip if invisible

    const gridSpacing = 60;
    this.ctx.strokeStyle = `rgba(75, 45, 122, ${this.gridOpacity})`;
    this.ctx.lineWidth = 0.5;

    const width = this.canvas.width / this.devicePixelRatio;
    const height = this.canvas.height / this.devicePixelRatio;

    let x = ((width % gridSpacing) / 2) % gridSpacing;
    while (x < width) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
      x += gridSpacing;
    }

    let y = ((height % gridSpacing) / 2) % gridSpacing;
    while (y < height) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
      y += gridSpacing;
    }
  }

  drawExplosion(dot) {
    dot.x += dot.vx;
    dot.y += dot.vy;

    // Wave particles move faster and fade slower
    if (dot.isWave) {
      dot.vx *= 0.985;
      dot.vy *= 0.985;
      dot.opacity -= dot.decay * 0.5;
    } else {
      dot.vx *= 0.94;
      dot.vy *= 0.94;
      dot.opacity -= dot.decay;
    }

    dot.pulsePhase += 0.04;
    this.drawDot(dot);
  }

  animate() {
    if (this.tabVisible && this.animationsEnabled) {
      this.ctx.fillStyle = '#080810';
      this.ctx.fillRect(0, 0, this.canvas.width / this.devicePixelRatio, this.canvas.height / this.devicePixelRatio);

      this.gridOpacity += (this.targetGridOpacity - this.gridOpacity) * 0.1;

      this.drawGrid();
      this.drawConnections();

      this.dots = this.dots.filter(dot => {
        if (dot.isExplosion) {
          this.drawExplosion(dot);
          return dot.opacity > 0;
        }

        // Normal particle logic
        dot.currentLife++;
        const lifeProgress = dot.currentLife / dot.lifespan;

        if (lifeProgress < 0.25) {
          dot.opacity = lifeProgress / 0.25;
        } else if (lifeProgress > 0.75) {
          dot.opacity = 1 - ((lifeProgress - 0.75) / 0.25);
        } else {
          dot.opacity = 1;
        }

        dot.pulsePhase += 0.02;
        this.drawDot(dot);

        return dot.currentLife < dot.lifespan;
      });

      const targetCount = Math.min(this.maxDots, Math.max(30, Math.ceil((this.canvas.width * this.canvas.height) / (this.devicePixelRatio * this.devicePixelRatio * 12000))));
      while (this.dots.length < targetCount) {
        this.dots.push(this.newBackgroundDot());
      }

      this.time++;
    }
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('background-canvas')) {
    window.bgAnimation = new InteractiveBackground();
  }
});
