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
    this.gridOpacity = 0.08; // Default grid opacity
    this.targetGridOpacity = 0.08;

    this.setupCanvas();
    this.generateRandomDots();
    this.attachEventListeners();
    this.animate();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Regenerate dots when resizing to fill screen
    this.generateRandomDots();
  }

  generateRandomDots() {
    this.dots = [];
    const dotCount = Math.ceil((this.canvas.width * this.canvas.height) / 4000); // ~1 dot per 4000px²

    for (let i = 0; i < dotCount; i++) {
      const strength = Math.random();
      const lifespan = 150 + Math.random() * 200; // 150-350 frames
      this.dots.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        strength: strength,
        pulsePhase: Math.random() * Math.PI * 2,
        connected: false,
        baseStrength: strength,
        lifespan: lifespan,
        currentLife: 0,
        opacity: 0,
        flicker: Math.random() // 0-1, for brightness variation
      });
    }
  }

  attachEventListeners() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Reset on mouse leave
    document.addEventListener('mouseleave', () => {
      this.dots.forEach(dot => dot.connected = false);
    });

    // Monitor scroll to fade grid over intro-panels
    window.addEventListener('scroll', () => this.updateGridOpacity());
  }

  updateGridOpacity() {
    const heroSection = document.getElementById('hero');
    this.targetGridOpacity = 0.08; // Default
    
    if (heroSection) {
      const heroRect = heroSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const heroStart = Math.max(0, -heroRect.top / viewportHeight);
      const heroEnd = Math.max(0, (viewportHeight - heroRect.top) / heroRect.height);
      const heroVisibility = Math.min(heroStart, heroEnd, 1);
      
      // Fade grid to 0 when hero is in view
      if (heroVisibility > 0) {
        this.targetGridOpacity = 0.08 * (1 - heroVisibility);
      }
    }
  }

  drawDot(dot) {
    // Skip if completely faded out
    if (dot.opacity < 0.01) return;

    // Pulsing glow effect
    const pulse = Math.sin(dot.pulsePhase + this.time * 0.05) * 0.5 + 0.5;
    
    // Flickering effect - affects brightness
    const flicker = Math.sin(this.time * 0.08 + dot.flicker * 10) * 0.3 + 0.7;
    const effectiveStrength = dot.strength * flicker;
    
    // Strength affects dot size and brightness
    const baseRadius = 1.5 + effectiveStrength * 1.5; // 1.5 to 3
    const maxRadius = 3 + effectiveStrength * 2.5;    // 3 to 5.5
    const radius = baseRadius + pulse * (maxRadius - baseRadius);

    // Strength affects brightness
    const brightnessMult = (0.5 + effectiveStrength * 0.5) * dot.opacity;

    // Glow halo
    const gradient = this.ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius * 3);
    gradient.addColorStop(0, `rgba(201, 184, 232, ${0.4 * pulse * brightnessMult})`);
    gradient.addColorStop(1, 'rgba(201, 184, 232, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(dot.x - radius * 3, dot.y - radius * 3, radius * 6, radius * 6);

    // Core dot - brighter when connected
    const brightness = dot.connected ? brightnessMult * 1.2 : brightnessMult * 0.7;
    this.ctx.fillStyle = `rgba(201, 184, 232, ${brightness})`;
    this.ctx.beginPath();
    this.ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // If connected, add a strength-based bruise accent
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
    this.dots.forEach(dot => {
      dot.connected = false;
    });

    // Reset lines
    const activeConnections = [];

    // Find dots near mouse and connect them
    this.dots.forEach(dot => {
      // Each dot's connection reach depends on its strength + flicker
      const flicker = Math.sin(this.time * 0.08 + dot.flicker * 10) * 0.3 + 0.7;
      const effectiveStrength = dot.strength * flicker * dot.opacity;
      const connectionDistance = this.baseConnectionDistance * (0.6 + effectiveStrength * 0.8);
      
      const distToMouse = Math.hypot(dot.x - this.mouseX, dot.y - this.mouseY);
      if (distToMouse < connectionDistance * 0.7) { // Activate within 70% of reach
        dot.connected = true;

        // Find other connected dots nearby to draw lines
        this.dots.forEach(otherDot => {
          if (dot === otherDot) return;
          const dist = Math.hypot(dot.x - otherDot.x, dot.y - otherDot.y);
          
          // Connection distance is average of both dots' strength + flicker
          const flicker2 = Math.sin(this.time * 0.08 + otherDot.flicker * 10) * 0.3 + 0.7;
          const effectiveStr2 = otherDot.strength * flicker2 * otherDot.opacity;
          const avgStrength = (effectiveStrength + effectiveStr2) / 2;
          const maxConnectDist = this.baseConnectionDistance * (0.6 + avgStrength * 0.8);
          
          if (dist < maxConnectDist && otherDot.connected) {
            // Draw line only once (avoid duplicates)
            const connectionKey = [dot, otherDot].sort().map(d => this.dots.indexOf(d)).join('-');
            if (!activeConnections.includes(connectionKey)) {
              this.drawLine(dot, otherDot, dist, avgStrength);
              activeConnections.push(connectionKey);
            }
          }
        });
      }
    });
  }

  drawLine(dot1, dot2, distance, avgStrength) {
    const maxConnectDist = this.baseConnectionDistance * (0.6 + avgStrength * 0.8);
    
    // Fade line based on distance
    const alpha = (1 - (distance / maxConnectDist)) * (0.5 + avgStrength * 0.5);
    
    // Strength affects line color intensity and gradient
    // Strong dots: more violet, weaker dots: more bruise
    const violetIntensity = avgStrength;
    const bruiseIntensity = 1 - avgStrength;
    
    const gradient = this.ctx.createLinearGradient(dot1.x, dot1.y, dot2.x, dot2.y);
    
    // Start with strength-based color
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
    // Very subtle grid lines with dynamic opacity
    const gridSpacing = 60;
    this.ctx.strokeStyle = `rgba(75, 45, 122, ${this.gridOpacity})`;
    this.ctx.lineWidth = 0.5;

    // Vertical lines
    let x = ((this.canvas.width % gridSpacing) / 2) % gridSpacing;
    while (x < this.canvas.width) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
      x += gridSpacing;
    }

    // Horizontal lines
    let y = ((this.canvas.height % gridSpacing) / 2) % gridSpacing;
    while (y < this.canvas.height) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
      y += gridSpacing;
    }
  }

  animate() {
    // Clear with dark background
    this.ctx.fillStyle = '#080810';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Smoothly interpolate grid opacity
    this.gridOpacity += (this.targetGridOpacity - this.gridOpacity) * 0.1;

    // Draw subtle grid
    this.drawGrid();

    // Draw connections based on mouse
    this.drawConnections();

    // Update and draw all dots
    this.dots = this.dots.filter(dot => {
      dot.currentLife++;
      const lifeProgress = dot.currentLife / dot.lifespan;
      
      // Fade in over first 25%, fade out over last 25%
      if (lifeProgress < 0.25) {
        dot.opacity = lifeProgress / 0.25;
      } else if (lifeProgress > 0.75) {
        dot.opacity = 1 - ((lifeProgress - 0.75) / 0.25);
      } else {
        dot.opacity = 1;
      }
      
      dot.pulsePhase += 0.02;
      this.drawDot(dot);
      
      // Return true to keep dot, false to remove
      return dot.currentLife < dot.lifespan;
    });

    // Spawn new dots to replace dead ones (maintain dot count)
    const targetCount = Math.ceil((this.canvas.width * this.canvas.height) / 4000);
    while (this.dots.length < targetCount) {
      const strength = Math.random();
      const lifespan = 150 + Math.random() * 200;
      this.dots.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
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
