/**
 * ===================================================================
 *  ELBATAL ANIMATION ENGINE v4.2
 *  File: animations.js
 *  Lines: 1000+
 *  Description: Advanced animation system with Matrix effects,
 *               particle systems, glitch effects, typing animations,
 *               parallax, transitions & visual feedback
 * ===================================================================
 */

'use strict';

// ==================== SELF-PROTECTION ====================
(function() {
    if (window._animationsEngineLoaded) {
        console.warn('Duplicate animation engine detected');
        return;
    }
    window._animationsEngineLoaded = 'ANIM_ENGINE_V4.2';
})();

// ==================== ANIMATION CONFIGURATION ====================
const AnimConfig = {
    MATRIX: {
        FONT_SIZE: 14,
        FPS: 24,
        COLORS: ['#00ff41', '#00cc33', '#009926', '#00661a', '#00330d'],
        CHARS: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*',
        OPACITY: 0.35
    },
    PARTICLES: {
        MAX_PARTICLES: 50,
        SPAWN_RATE: 300,
        MIN_SIZE: 1,
        MAX_SIZE: 4,
        MIN_SPEED: 0.5,
        MAX_SPEED: 3,
        LIFETIME_MIN: 5000,
        LIFETIME_MAX: 15000
    },
    GLITCH: {
        INTERVAL_MIN: 3000,
        INTERVAL_MAX: 8000,
        DURATION: 200,
        INTENSITY: 5
    },
    TYPING: {
        SPEED_MIN: 30,
        SPEED_MAX: 100,
        CURSOR_BLINK: 530
    }
};

// ==================== UTILITY FUNCTIONS ====================
class AnimUtils {
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(AnimUtils.random(min, max + 1));
    }
    
    static randomColor(colors) {
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }
    
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
    
    static easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    static debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// ==================== MATRIX RAIN ENGINE ====================
class MatrixRainEngine {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId || 'matrixCanvas';
            this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;';
            document.body.prepend(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.config = { ...AnimConfig.MATRIX, ...config };
        this.drops = [];
        this.isRunning = false;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / this.config.FPS;
        
        this._resize();
        this._initDrops();
        
        window.addEventListener('resize', () => this._resize());
    }
    
    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.config.FONT_SIZE);
        this._initDrops();
    }
    
    _initDrops() {
        this.drops = [];
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._animate(0);
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    _animate(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = timestamp - this.lastFrameTime;
        
        if (deltaTime >= this.frameInterval) {
            this.lastFrameTime = timestamp - (deltaTime % this.frameInterval);
            this._draw();
        }
        
        this.animationId = requestAnimationFrame((t) => this._animate(t));
    }
    
    _draw() {
        // Fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = this.config.FONT_SIZE + 'px monospace';
        
        for (let i = 0; i < this.drops.length; i++) {
            // Random character
            const char = this.config.CHARS.charAt(
                Math.floor(Math.random() * this.config.CHARS.length)
            );
            
            const x = i * this.config.FONT_SIZE;
            const y = this.drops[i] * this.config.FONT_SIZE;
            
            // Head character (brightest)
            this.ctx.fillStyle = this.config.COLORS[0];
            this.ctx.fillText(char, x, y);
            
            // Trail characters
            for (let j = 1; j < 5; j++) {
                const trailY = y - j * this.config.FONT_SIZE;
                if (trailY > 0) {
                    this.ctx.fillStyle = this.config.COLORS[Math.min(j, this.config.COLORS.length - 1)];
                    const trailChar = this.config.CHARS.charAt(
                        Math.floor(Math.random() * this.config.CHARS.length)
                    );
                    this.ctx.fillText(trailChar, x, trailY);
                }
            }
            
            // Move drop
            this.drops[i]++;
            
            // Reset drop
            if (this.drops[i] * this.config.FONT_SIZE > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
        }
    }
    
    setOpacity(opacity) {
        this.canvas.style.opacity = AnimUtils.clamp(opacity, 0, 1);
    }
    
    setSpeed(speed) {
        this.config.FPS = AnimUtils.clamp(speed, 5, 60);
        this.frameInterval = 1000 / this.config.FPS;
    }
    
    destroy() {
        this.stop();
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// ==================== PARTICLE SYSTEM ====================
class Particle {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.vx = AnimUtils.random(-config.MAX_SPEED, config.MAX_SPEED);
        this.vy = AnimUtils.random(-config.MAX_SPEED * 2, -config.MAX_SPEED);
        this.size = AnimUtils.random(config.MIN_SIZE, config.MAX_SIZE);
        this.life = 1;
        this.decay = AnimUtils.random(0.001, 0.005);
        this.color = config.color || '#00ff41';
        this.opacity = AnimUtils.random(0.3, 0.8);
        this.gravity = config.gravity || 0.02;
        this.wind = config.wind || 0;
    }
    
    update() {
        this.vy += this.gravity;
        this.vx += this.wind;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life * this.opacity;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.size * 3;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor(canvasId, config = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId || 'particleCanvas';
            this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2;pointer-events:none;';
            document.body.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.config = { ...AnimConfig.PARTICLES, ...config };
        this.particles = [];
        this.isRunning = false;
        this.animationId = null;
        this.spawnTimer = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseActive = false;
        
        this._resize();
        window.addEventListener('resize', () => this._resize());
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.mouseActive = true;
        });
        window.addEventListener('mouseleave', () => { this.mouseActive = false; });
    }
    
    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this._animate(0);
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    _spawnParticle(x, y) {
        if (this.particles.length >= this.config.MAX_PARTICLES) return;
        
        const particle = new Particle(x, y, this.config);
        this.particles.push(particle);
    }
    
    _burst(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            this._spawnParticle(x, y);
        }
    }
    
    _animate(timestamp) {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Spawn particles periodically
        this.spawnTimer += 16;
        if (this.spawnTimer >= this.config.SPAWN_RATE) {
            this.spawnTimer = 0;
            const x = AnimUtils.random(0, this.canvas.width);
            const y = this.canvas.height + 10;
            this._spawnParticle(x, y);
        }
        
        // Spawn particles near mouse
        if (this.mouseActive && Math.random() > 0.7) {
            this._spawnParticle(
                this.mouseX + AnimUtils.random(-20, 20),
                this.mouseY + AnimUtils.random(-20, 20)
            );
        }
        
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            particle.draw(this.ctx);
            return !particle.isDead() && 
                   particle.x > -50 && particle.x < this.canvas.width + 50 &&
                   particle.y > -50 && particle.y < this.canvas.height + 50;
        });
        
        this.animationId = requestAnimationFrame((t) => this._animate(t));
    }
    
    burst(x, y, count) {
        this._burst(x, y, count);
    }
    
    setColor(color) {
        this.config.color = color;
    }
    
    setMaxParticles(max) {
        this.config.MAX_PARTICLES = max;
    }
    
    destroy() {
        this.stop();
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// ==================== GLITCH EFFECT ENGINE ====================
class GlitchEngine {
    constructor(targetSelector = 'body') {
        this.target = document.querySelector(targetSelector);
        this.isActive = false;
        this.glitchTimer = null;
        this.config = { ...AnimConfig.GLITCH };
    }
    
    start() {
        if (this.isActive || !this.target) return;
        this.isActive = true;
        this._scheduleGlitch();
    }
    
    stop() {
        this.isActive = false;
        if (this.glitchTimer) {
            clearTimeout(this.glitchTimer);
            this.glitchTimer = null;
        }
        this._resetGlitch();
    }
    
    _scheduleGlitch() {
        if (!this.isActive) return;
        
        const interval = AnimUtils.randomInt(
            this.config.INTERVAL_MIN,
            this.config.INTERVAL_MAX
        );
        
        this.glitchTimer = setTimeout(() => {
            this._triggerGlitch();
            this._scheduleGlitch();
        }, interval);
    }
    
    _triggerGlitch() {
        if (!this.target) return;
        
        const intensity = AnimUtils.randomInt(1, this.config.INTENSITY);
        const translateX = AnimUtils.random(-intensity, intensity);
        const translateY = AnimUtils.random(-intensity, intensity);
        const skewX = AnimUtils.random(-2, 2);
        
        this.target.style.transform = `translate(${translateX}px, ${translateY}px) skew(${skewX}deg)`;
        this.target.style.filter = `hue-rotate(${AnimUtils.random(-30, 30)}deg) brightness(${AnimUtils.random(0.8, 1.2)})`;
        
        // Add glitch lines
        const lines = AnimUtils.randomInt(1, 3);
        for (let i = 0; i < lines; i++) {
            this._createGlitchLine();
        }
        
        // Reset after duration
        setTimeout(() => this._resetGlitch(), this.config.DURATION);
    }
    
    _createGlitchLine() {
        const line = document.createElement('div');
        line.style.cssText = `
            position: fixed;
            left: 0;
            width: 100%;
            height: ${AnimUtils.random(1, 3)}px;
            top: ${AnimUtils.random(0, 100)}%;
            background: ${Math.random() > 0.5 ? '#00ff41' : '#ff003c'};
            opacity: ${AnimUtils.random(0.3, 0.8)};
            z-index: 9999;
            pointer-events: none;
            animation: glitchLineDisappear ${AnimUtils.random(0.1, 0.3)}s ease forwards;
        `;
        
        document.body.appendChild(line);
        
        setTimeout(() => {
            if (line.parentNode) line.parentNode.removeChild(line);
        }, 300);
    }
    
    _resetGlitch() {
        if (this.target) {
            this.target.style.transform = '';
            this.target.style.filter = '';
        }
    }
    
    triggerOnce(intensity = 5) {
        const savedIntensity = this.config.INTENSITY;
        this.config.INTENSITY = intensity;
        this._triggerGlitch();
        this.config.INTENSITY = savedIntensity;
    }
    
    destroy() {
        this.stop();
    }
}

// Add glitch line animation to document
const glitchLineStyle = document.createElement('style');
glitchLineStyle.textContent = `
    @keyframes glitchLineDisappear {
        0% { opacity: 1; transform: scaleY(1); }
        100% { opacity: 0; transform: scaleY(0); }
    }
`;
document.head.appendChild(glitchLineStyle);

// ==================== TYPEWRITER ENGINE ====================
class TypewriterEngine {
    constructor(elementSelector, options = {}) {
        this.element = document.querySelector(elementSelector);
        this.options = {
            speed: AnimConfig.TYPING.SPEED_MIN,
            cursorChar: '▋',
            cursorBlinkSpeed: AnimConfig.TYPING.CURSOR_BLINK,
            loopDelay: 2000,
            deleteSpeed: 20,
            pauseOnHover: true,
            ...options
        };
        
        this.texts = options.texts || [];
        this.currentTextIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.isPaused = false;
        this.timeout = null;
    }
    
    async type(texts) {
        if (texts) this.texts = texts;
        if (this.texts.length === 0) return;
        
        this.currentTextIndex = 0;
        this._typeCurrentText();
    }
    
    _typeCurrentText() {
        const currentText = this.texts[this.currentTextIndex];
        
        if (!this.isDeleting) {
            // Typing forward
            if (this.currentCharIndex < currentText.length) {
                this.element.textContent = currentText.substring(0, this.currentCharIndex + 1) + this.options.cursorChar;
                this.currentCharIndex++;
                
                const speed = AnimUtils.randomInt(
                    this.options.speed,
                    this.options.speed * 2
                );
                
                this.timeout = setTimeout(() => this._typeCurrentText(), speed);
            } else {
                // Finished typing, start deleting after delay
                this.timeout = setTimeout(() => {
                    this.isDeleting = true;
                    this._typeCurrentText();
                }, this.options.loopDelay);
            }
        } else {
            // Deleting
            if (this.currentCharIndex > 0) {
                this.element.textContent = currentText.substring(0, this.currentCharIndex - 1) + this.options.cursorChar;
                this.currentCharIndex--;
                
                this.timeout = setTimeout(() => this._typeCurrentText(), this.options.deleteSpeed);
            } else {
                // Finished deleting, move to next text
                this.isDeleting = false;
                this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;
                
                this.timeout = setTimeout(() => this._typeCurrentText(), 500);
            }
        }
    }
    
    pause() {
        this.isPaused = true;
        if (this.timeout) clearTimeout(this.timeout);
    }
    
    resume() {
        this.isPaused = false;
        this._typeCurrentText();
    }
    
    stop() {
        if (this.timeout) clearTimeout(this.timeout);
        this.element.textContent = '';
    }
    
    destroy() {
        this.stop();
    }
}

// ==================== PARALLAX ENGINE ====================
class ParallaxEngine {
    constructor() {
        this.layers = [];
        this.isActive = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.scrollY = 0;
        
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onScroll = this._onScroll.bind(this);
    }
    
    addLayer(element, depth = 0.1, type = 'mouse') {
        this.layers.push({
            element: element,
            depth: depth,
            type: type,
            initialX: 0,
            initialY: 0
        });
    }
    
    start() {
        if (this.isActive) return;
        this.isActive = true;
        
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('scroll', this._onScroll);
    }
    
    stop() {
        this.isActive = false;
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('scroll', this._onScroll);
    }
    
    _onMouseMove(e) {
        this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        
        this._updateLayers('mouse');
    }
    
    _onScroll() {
        this.scrollY = window.scrollY;
        this._updateLayers('scroll');
    }
    
    _updateLayers(type) {
        this.layers.forEach(layer => {
            if (layer.type !== type) return;
            
            let transform = '';
            
            if (type === 'mouse') {
                const moveX = this.mouseX * layer.depth * 50;
                const moveY = this.mouseY * layer.depth * 50;
                transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
            } else if (type === 'scroll') {
                const moveY = this.scrollY * layer.depth;
                transform = `translate3d(0, ${moveY}px, 0)`;
            }
            
            layer.element.style.transform = transform;
            layer.element.style.transition = 'transform 0.1s ease-out';
        });
    }
    
    destroy() {
        this.stop();
        this.layers = [];
    }
}

// ==================== COUNTER ANIMATION ====================
class CounterAnimation {
    static animate(element, target, duration = 2000, prefix = '', suffix = '') {
        const start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = AnimUtils.easeOutBounce(progress);
            const current = Math.floor(AnimUtils.lerp(start, target, easedProgress));
            
            element.textContent = prefix + current.toLocaleString() + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
    
    static animateMultiple(elements, duration = 2000) {
        elements.forEach(({ element, target, prefix, suffix }) => {
            CounterAnimation.animate(element, target, duration, prefix, suffix);
        });
    }
}

// ==================== SHAKE EFFECT ====================
class ShakeEffect {
    static apply(element, intensity = 5, duration = 500) {
        const originalTransform = element.style.transform;
        const startTime = performance.now();
        
        function shake(currentTime) {
            const elapsed = currentTime - startTime;
            
            if (elapsed < duration) {
                const progress = elapsed / duration;
                const decay = 1 - progress;
                const x = AnimUtils.random(-intensity, intensity) * decay;
                const y = AnimUtils.random(-intensity, intensity) * decay;
                
                element.style.transform = `translate(${x}px, ${y}px)`;
                requestAnimationFrame(shake);
            } else {
                element.style.transform = originalTransform;
            }
        }
        
        requestAnimationFrame(shake);
    }
}

// ==================== RIPPLE EFFECT ====================
class RippleEffect {
    static create(x, y, color = '#00ff41') {
        const ripple = document.createElement('div');
        const size = Math.max(window.innerWidth, window.innerHeight) * 2;
        
        ripple.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            border: 2px solid ${color};
            transform: translate(-50%, -50%);
            animation: rippleExpand 1s ease-out forwards;
            pointer-events: none;
            z-index: 9999;
            opacity: 0.6;
        `;
        
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.style.opacity = '0';
            ripple.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
            }, 300);
        }, 700);
    }
}

// Add ripple animation
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes rippleExpand {
        0% { width: 0; height: 0; opacity: 0.6; }
        100% { width: 200vmax; height: 200vmax; opacity: 0; }
    }
`;
document.head.appendChild(rippleStyle);

// ==================== FLOATING ANIMATION ====================
class FloatingAnimation {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            amplitude: options.amplitude || 10,
            period: options.period || 3000,
            axis: options.axis || 'y'
        };
        this.startTime = performance.now();
        this.animationId = null;
    }
    
    start() {
        const animate = (currentTime) => {
            const elapsed = currentTime - this.startTime;
            const phase = (elapsed % this.options.period) / this.options.period;
            const offset = Math.sin(phase * Math.PI * 2) * this.options.amplitude;
            
            if (this.options.axis === 'y') {
                this.element.style.transform = `translateY(${offset}px)`;
            } else if (this.options.axis === 'x') {
                this.element.style.transform = `translateX(${offset}px)`;
            } else {
                this.element.style.transform = `translate(${offset * 0.5}px, ${offset}px)`;
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.element.style.transform = '';
    }
}

// ==================== REVEAL ON SCROLL ====================
class RevealOnScroll {
    constructor(selector = '.reveal', options = {}) {
        this.elements = document.querySelectorAll(selector);
        this.options = {
            threshold: options.threshold || 0.15,
            rootMargin: options.rootMargin || '0px',
            animation: options.animation || 'fade-in-up',
            delay: options.delay || 0
        };
        
        this.observer = new IntersectionObserver(
            (entries) => this._handleIntersection(entries),
            {
                threshold: this.options.threshold,
                rootMargin: this.options.rootMargin
            }
        );
        
        this._init();
    }
    
    _init() {
        this.elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transition = `opacity 0.6s ease, transform 0.6s ease`;
            
            if (this.options.animation === 'fade-in-up') {
                element.style.transform = 'translateY(30px)';
            } else if (this.options.animation === 'fade-in-left') {
                element.style.transform = 'translateX(-30px)';
            } else if (this.options.animation === 'fade-in-right') {
                element.style.transform = 'translateX(30px)';
            }
            
            this.observer.observe(element);
        });
    }
    
    _handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const delay = element.dataset.delay || this.options.delay;
                
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translate(0, 0)';
                }, delay);
                
                this.observer.unobserve(element);
            }
        });
    }
    
    refresh() {
        this.elements = document.querySelectorAll(this.selector || '.reveal');
        this._init();
    }
    
    destroy() {
        this.observer.disconnect();
    }
}

// ==================== NOTIFICATION ANIMATOR ====================
class NotificationAnimator {
    static slideIn(element, from = 'right') {
        const animations = {
            right: { enter: 'translateX(100%)', exit: 'translateX(0)' },
            left: { enter: 'translateX(-100%)', exit: 'translateX(0)' },
            top: { enter: 'translateY(-100%)', exit: 'translateY(0)' },
            bottom: { enter: 'translateY(100%)', exit: 'translateY(0)' }
        };
        
        const anim = animations[from] || animations.right;
        
        element.style.transform = anim.enter;
        element.style.opacity = '0';
        element.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.4s ease';
        
        requestAnimationFrame(() => {
            element.style.transform = anim.exit;
            element.style.opacity = '1';
        });
    }
    
    static slideOut(element, to = 'right', callback) {
        const animations = {
            right: 'translateX(100%)',
            left: 'translateX(-100%)',
            top: 'translateY(-100%)',
            bottom: 'translateY(100%)'
        };
        
        element.style.transform = animations[to] || animations.right;
        element.style.opacity = '0';
        element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }
    
    static fadeIn(element, duration = 400) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
        });
    }
    
    static fadeOut(element, duration = 400, callback) {
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        
        setTimeout(() => {
            if (callback) callback();
        }, duration);
    }
}

// ==================== TEXT SCRAMBLE EFFECT ====================
class TextScrambleEffect {
    constructor(element) {
        this.element = element;
        this.chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        this.originalText = '';
        this.isScrambling = false;
        this.interval = null;
    }
    
    scramble(duration = 1000, callback) {
        if (this.isScrambling) return;
        this.isScrambling = true;
        this.originalText = this.element.textContent;
        
        const startTime = performance.now();
        const text = this.originalText;
        
        const update = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            let scrambled = '';
            for (let i = 0; i < text.length; i++) {
                if (text[i] === ' ') {
                    scrambled += ' ';
                } else if (progress > i / text.length) {
                    scrambled += text[i];
                } else {
                    scrambled += this.chars[Math.floor(Math.random() * this.chars.length)];
                }
            }
            
            this.element.textContent = scrambled;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                this.element.textContent = this.originalText;
                this.isScrambling = false;
                if (callback) callback();
            }
        };
        
        requestAnimationFrame(update);
    }
    
    reveal(text, duration = 1000, callback) {
        this.originalText = text || this.element.textContent;
        this.element.textContent = '';
        this.scramble(duration, callback);
    }
}

// ==================== GLOBAL INSTANCES ====================
let MatrixRain = null;
let ParticleSys = null;
let GlitchFX = null;
let ParallaxSys = null;
let RevealScroll = null;

// ==================== INITIALIZATION ====================
(function initAnimations() {
    // Initialize Matrix Rain on canvas with id 'matrixCanvas'
    if (document.getElementById('matrixCanvas') || !document.querySelector('canvas[id]')) {
        MatrixRain = new MatrixRainEngine('matrixCanvas');
        MatrixRain.start();
    }
    
    // Initialize particles if canvas exists
    const particleCanvas = document.getElementById('particleCanvas') || 
                           document.getElementById('bgParticles');
    if (particleCanvas) {
        ParticleSys = new ParticleSystem(particleCanvas.id);
        ParticleSys.start();
    }
    
    // Initialize glitch engine
    GlitchFX = new GlitchEngine('body');
    // GlitchFX.start(); // Uncomment to enable random glitches
    
    // Initialize parallax
    ParallaxSys = new ParallaxEngine();
    
    // Initialize reveal on scroll
    RevealScroll = new RevealOnScroll('.reveal');
    
    console.log('%c[ANIM] %cAnimation engine initialized', 'color: #00ff41;', 'color: #fff;');
    console.log('%c[ANIM] %cMatrix | Particles | Glitch | Parallax | Typewriter | Reveal', 'color: #00ff41;', 'color: #fff;');
})();

// ==================== EXPORT ANIMATION API ====================
window.ELBATAL_Animations = {
    // Matrix Rain
    matrix: {
        create: (canvasId, config) => new MatrixRainEngine(canvasId, config),
        start: () => MatrixRain?.start(),
        stop: () => MatrixRain?.stop(),
        setOpacity: (val) => MatrixRain?.setOpacity(val),
        setSpeed: (val) => MatrixRain?.setSpeed(val)
    },
    
    // Particle System
    particles: {
        create: (canvasId, config) => new ParticleSystem(canvasId, config),
        start: () => ParticleSys?.start(),
        stop: () => ParticleSys?.stop(),
        burst: (x, y, count) => ParticleSys?.burst(x, y, count),
        setColor: (color) => ParticleSys?.setColor(color)
    },
    
    // Glitch Effects
    glitch: {
        start: () => GlitchFX?.start(),
        stop: () => GlitchFX?.stop(),
        trigger: (intensity) => GlitchFX?.triggerOnce(intensity)
    },
    
    // Typewriter
    typewriter: (element, options) => new TypewriterEngine(element, options),
    
    // Parallax
    parallax: {
        addLayer: (el, depth, type) => ParallaxSys?.addLayer(el, depth, type),
        start: () => ParallaxSys?.start(),
        stop: () => ParallaxSys?.stop()
    },
    
    // Counter
    counter: (element, target, duration, prefix, suffix) => 
        CounterAnimation.animate(element, target, duration, prefix, suffix),
    
    // Shake
    shake: (element, intensity, duration) => 
        ShakeEffect.apply(element, intensity, duration),
    
    // Ripple
    ripple: (x, y, color) => RippleEffect.create(x, y, color),
    
    // Floating
    floating: (element, options) => new FloatingAnimation(element, options),
    
    // Reveal on scroll
    reveal: {
        init: (selector, options) => new RevealOnScroll(selector, options),
        refresh: () => RevealScroll?.refresh()
    },
    
    // Notification
    notify: {
        slideIn: (el, from) => NotificationAnimator.slideIn(el, from),
        slideOut: (el, to, cb) => NotificationAnimator.slideOut(el, to, cb),
        fadeIn: (el, dur) => NotificationAnimator.fadeIn(el, dur),
        fadeOut: (el, dur, cb) => NotificationAnimator.fadeOut(el, dur, cb)
    },
    
    // Text Scramble
    scramble: (element) => new TextScrambleEffect(element),
    
    // Utilities
    utils: AnimUtils,
    
    // Configuration
    config: AnimConfig
};

Object.freeze(window.ELBATAL_Animations);

// ==================== END OF ANIMATION ENGINE ====================
// Total lines: 1000+
// Version: 4.2
