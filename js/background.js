// Interactive Geometric Background
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
    this.gridOpacity = 0.08;
    this.targetGridOpacity = 0.08;
    this.lastMouseMove = 0;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.isLowPerformance = this.detectLowPerformance();

    this.setupCanvas();
    this.generateRandomDots();
    this.attachEventListeners();
    this.animate();
  }

  detectLowPerformance() {
    // Simple heuristic: check for mobile or low-end devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    return isMobile || hasLowMemory || window.innerWidth < 768;
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
    const area = this.canvas.width * this.canvas.height / (this.devicePixelRatio * this.devicePixelRatio);
    const baseDotCount = Math.ceil(area / 4000);
    const dotCount = this.isLowPerformance ? Math.max(50, baseDotCount * 0.5) : baseDotCount;

    for (let i = 0; i < dotCount; i++) {
      const strength = Math.random();
      const lifespan = 150 + Math.random() * 200;
      this.dots.push({
        x: Math.random() * (this.canvas.width / this.devicePixelRatio),
        y: Math.random() * (this.canvas.height / this.devicePixelRatio),
        strength: strength,
        pulsePhase: Math.random() * Math.PI * 2,
        connected: false,
        baseStrength: strength,
        lifespan: lifespan,
        currentLife: 0,
        opacity: 0,
        flicker: Math.random()
      });
    }
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

    document.addEventListener('mouseleave', () => {
      this.dots.forEach(dot => dot.connected = false);
    });

    window.addEventListener('scroll', () => this.updateGridOpacity());
  }

  updateGridOpacity() {
    const heroSection = document.getElementById('hero');
    this.targetGridOpacity = 0.08;

    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const heroStart = Math.max(0, -heroRect.top / viewportHeight);
      const heroEnd = Math.max(0, (viewportHeight - heroRect.top) / heroRect.height);
      const heroVisibility = Math.min(heroStart, heroEnd, 1);

      if (heroVisibility > 0) {
        this.targetGridOpacity = 0.08 * (1 - heroVisibility);
      }
    }
  }

  drawDot(dot) {
    if (dot.opacity < 0.01) return;

    const pulse = Math.sin(dot.pulsePhase + this.time * 0.05) * 0.5 + 0.5;
    const flicker = Math.sin(this.time * 0.08 + dot.flicker * 10) * 0.3 + 0.7;
    const effectiveStrength = dot.strength * flicker;

    const baseRadius = 1.5 + effectiveStrength * 1.5;
    const maxRadius = 3 + effectiveStrength * 2.5;
    const radius = baseRadius + pulse * (maxRadius - baseRadius);

    const brightnessMult = (0.5 + effectiveStrength * 0.5) * dot.opacity;

    // Cache gradient creation for performance
    const cacheKey = `dot_${radius.toFixed(1)}_${brightnessMult.toFixed(2)}_${pulse.toFixed(2)}`;
    if (!this.gradientCache) this.gradientCache = {};
    if (!this.gradientCache[cacheKey]) {
      const gradient = this.ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius * 3);
      gradient.addColorStop(0, `rgba(201, 184, 232, ${0.4 * pulse * brightnessMult})`);
      gradient.addColorStop(1, 'rgba(201, 184, 232, 0)');
      this.gradientCache[cacheKey] = gradient;
    }

    this.ctx.fillStyle = this.gradientCache[cacheKey];
    this.ctx.fillRect(dot.x - radius * 3, dot.y - radius * 3, radius * 6, radius * 6);

    const brightness = dot.connected ? brightnessMult * 1.2 : brightnessMult * 0.7;
    this.ctx.fillStyle = `rgba(201, 184, 232, ${brightness})`;
    this.ctx.beginPath();
    this.ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    if (dot.connected) {
      const accentStrength = effectiveStrength * 0.7 * dot.opacity;
      this.ctx.strokeStyle = `rgba(107, 61, 170, ${accentStrength})`;
      this.ctx.lineWidth = 1 + effectiveStrength * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, radius + 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawConnections() {
    this.dots.forEach(dot => dot.connected = false);
    const activeConnections = new Set();

    this.dots.forEach(dot => {
      if (dot.opacity < 0.1) return; // Skip low opacity dots

      const flicker = Math.sin(this.time * 0.08 + dot.flicker * 10) * 0.3 + 0.7;
      const effectiveStrength = dot.strength * flicker * dot.opacity;
      const connectionDistance = this.baseConnectionDistance * (0.6 + effectiveStrength * 0.8);

      const distToMouse = Math.hypot(dot.x - this.mouseX, dot.y - this.mouseY);
      if (distToMouse < connectionDistance * 0.7) {
        dot.connected = true;

        this.dots.forEach(otherDot => {
          if (dot === otherDot || otherDot.opacity < 0.1) return;
          const dist = Math.hypot(dot.x - otherDot.x, dot.y - otherDot.y);

          const flicker2 = Math.sin(this.time * 0.08 + otherDot.flicker * 10) * 0.3 + 0.7;
          const effectiveStr2 = otherDot.strength * flicker2 * otherDot.opacity;
          const avgStrength = (effectiveStrength + effectiveStr2) / 2;
          const maxConnectDist = this.baseConnectionDistance * (0.6 + avgStrength * 0.8);

          if (dist < maxConnectDist && otherDot.connected) {
            const connectionKey = [this.dots.indexOf(dot), this.dots.indexOf(otherDot)].sort().join('-');
            if (!activeConnections.has(connectionKey)) {
              this.drawLine(dot, otherDot, dist, avgStrength);
              activeConnections.add(connectionKey);
            }
          }
        });
      }
    });
  }

  drawLine(dot1, dot2, distance, avgStrength) {
    const maxConnectDist = this.baseConnectionDistance * (0.6 + avgStrength * 0.8);
    const alpha = (1 - (distance / maxConnectDist)) * (0.5 + avgStrength * 0.5);

    const violetIntensity = avgStrength;
    const bruiseIntensity = 1 - avgStrength;

    const gradient = this.ctx.createLinearGradient(dot1.x, dot1.y, dot2.x, dot2.y);
    const startAlpha = alpha * (0.5 + violetIntensity * 0.3);
    const midAlpha = alpha * (0.3 + (violetIntensity + bruiseIntensity) * 0.2);
    const endAlpha = alpha * (0.5 + violetIntensity * 0.3);

    gradient.addColorStop(0, `rgba(201, 184, 232, ${startAlpha})`);
    gradient.addColorStop(0.5, `rgba(${107 + bruiseIntensity * 40}, ${61 + bruiseIntensity * 20}, ${170 - bruiseIntensity * 30}, ${midAlpha})`);
    gradient.addColorStop(1, `rgba(201, 184, 232, ${endAlpha})`);

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 0.8 + avgStrength * 0.6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(dot1.x, dot1.y);
    this.ctx.lineTo(dot2.x, dot2.y);
    this.ctx.stroke();
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

  animate() {
    this.ctx.fillStyle = '#080810';
    this.ctx.fillRect(0, 0, this.canvas.width / this.devicePixelRatio, this.canvas.height / this.devicePixelRatio);

    this.gridOpacity += (this.targetGridOpacity - this.gridOpacity) * 0.1;

    this.drawGrid();
    this.drawConnections();

    this.dots = this.dots.filter(dot => {
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

    const targetCount = this.isLowPerformance ? Math.max(50, Math.ceil((this.canvas.width * this.canvas.height) / (this.devicePixelRatio * this.devicePixelRatio * 8000))) : Math.ceil((this.canvas.width * this.canvas.height) / (this.devicePixelRatio * this.devicePixelRatio * 4000));
    while (this.dots.length < targetCount) {
      const strength = Math.random();
      const lifespan = 150 + Math.random() * 200;
      this.dots.push({
        x: Math.random() * (this.canvas.width / this.devicePixelRatio),
        y: Math.random() * (this.canvas.height / this.devicePixelRatio),
        strength: strength,
        pulsePhase: Math.random() * Math.PI * 2,
        connected: false,
        baseStrength: strength,
        lifespan: lifespan,
        currentLife: 0,
        opacity: 0,
        flicker: Math.random()
      });
    }

    this.time++;
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
