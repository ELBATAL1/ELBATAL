/**
 * ===================================================================
 *  ELBATAL MAIN APPLICATION v4.2
 *  File: app.js
 *  Lines: 1000+
 *  Description: Main application controller that initializes all
 *               modules, manages routing, handles global events,
 *               and provides the unified API for the entire system
 * ===================================================================
 */

'use strict';

// ==================== SELF-PROTECTION ====================
(function() {
    if (window.__ELBATAL_APP_LOADED) {
        console.warn('ELBATAL App already loaded');
        return;
    }
    window.__ELBATAL_APP_LOADED = true;
})();

// ==================== APPLICATION CONFIGURATION ====================
const AppConfig = Object.freeze({
    VERSION: '4.2.0',
    BUILD: '2024-RELEASE',
    CODENAME: 'SHADOW_PHANTOM',
    
    MODULES: {
        SECURITY: true,
        CRYPTO: true,
        MONITOR: true,
        UPLOAD: true,
        ANIMATIONS: true,
        UI: true
    },
    
    ROUTES: {
        DASHBOARD: 'dashboard',
        TOOLS: 'tools',
        COURSES: 'courses',
        BOOKS: 'books',
        APPS: 'apps',
        INFO: 'info',
        UPLOAD: 'upload',
        SETTINGS: 'settings',
        LOGS: 'logs'
    },
    
    SETTINGS: {
        AUTO_SAVE_INTERVAL: 30000,
        SESSION_TIMEOUT: 3600000,
        IDLE_TIMEOUT: 1800000,
        MAX_NOTIFICATIONS: 5,
        THEME: 'dark',
        LANGUAGE: 'en',
        DEBUG_MODE: false
    },
    
    FEATURES: {
        ENABLE_MATRIX_BG: true,
        ENABLE_PARTICLES: true,
        ENABLE_GLITCH: false,
        ENABLE_SOUNDS: false,
        ENABLE_KEYBOARD_SHORTCUTS: true,
        ENABLE_AUTO_LOGOUT: true,
        ENABLE_ANALYTICS: false
    }
});

// ==================== APPLICATION STATE MANAGER ====================
class ApplicationState {
    constructor() {
        this.state = {
            initialized: false,
            currentRoute: 'dashboard',
            previousRoute: null,
            user: null,
            session: null,
            settings: { ...AppConfig.SETTINGS },
            features: { ...AppConfig.FEATURES },
            stats: {
                uptime: 0,
                actionsPerformed: 0,
                errorsEncountered: 0,
                lastAction: null
            },
            ui: {
                sidebarOpen: true,
                sidebarCollapsed: false,
                modalOpen: false,
                notificationCount: 0,
                searchQuery: '',
                loadingStates: {}
            }
        };
        
        this.listeners = new Map();
        this.startTime = Date.now();
    }
    
    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.state);
    }
    
    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => {
            if (!obj[k]) obj[k] = {};
            return obj[k];
        }, this.state);
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Notify listeners
        this._notifyListeners(key, value, oldValue);
        
        // Auto-save state
        this._autoSave();
    }
    
    on(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) listeners.splice(index, 1);
            }
        };
    }
    
    _notifyListeners(key, newValue, oldValue) {
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (e) {
                    console.error('State listener error:', e);
                }
            });
        }
    }
    
    _autoSave() {
        try {
            const stateToSave = {
                settings: this.state.settings,
                features: this.state.features,
                ui: {
                    sidebarCollapsed: this.state.ui.sidebarCollapsed
                }
            };
            sessionStorage.setItem('elbatal_app_state', JSON.stringify(stateToSave));
        } catch (e) {}
    }
    
    loadSavedState() {
        try {
            const saved = sessionStorage.getItem('elbatal_app_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.settings) Object.assign(this.state.settings, parsed.settings);
                if (parsed.features) Object.assign(this.state.features, parsed.features);
                if (parsed.ui) Object.assign(this.state.ui, parsed.ui);
            }
        } catch (e) {}
    }
    
    updateUptime() {
        this.state.stats.uptime = Math.floor((Date.now() - this.startTime) / 1000);
    }
    
    getUptimeFormatted() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// ==================== ROUTER ====================
class Router {
    constructor(appState) {
        this.state = appState;
        this.routes = new Map();
        this.middleware = [];
        this.currentRoute = null;
        
        this._registerDefaultRoutes();
    }
    
    _registerDefaultRoutes() {
        Object.values(AppConfig.ROUTES).forEach(route => {
            this.routes.set(route, {
                name: route,
                component: `section-${route}`,
                title: this._getRouteTitle(route),
                icon: this._getRouteIcon(route),
                protected: true
            });
        });
    }
    
    _getRouteTitle(route) {
        const titles = {
            dashboard: 'Dashboard',
            tools: 'Security Tools',
            courses: 'Training Courses',
            books: 'Digital Library',
            apps: 'Applications',
            info: 'Information Database',
            upload: 'Upload Content',
            settings: 'Settings',
            logs: 'System Logs'
        };
        return titles[route] || route;
    }
    
    _getRouteIcon(route) {
        const icons = {
            dashboard: '📊',
            tools: '🛠️',
            courses: '📚',
            books: '📖',
            apps: '📱',
            info: 'ℹ️',
            upload: '⬆️',
            settings: '⚙️',
            logs: '📋'
        };
        return icons[route] || '📄';
    }
    
    use(middlewareFn) {
        this.middleware.push(middlewareFn);
    }
    
    async navigate(route, params = {}) {
        // Run middleware
        for (const middleware of this.middleware) {
            const result = await middleware(route, params);
            if (result === false) {
                console.warn(`Navigation to "${route}" blocked by middleware`);
                return false;
            }
        }
        
        // Check if route exists
        if (!this.routes.has(route)) {
            console.error(`Route "${route}" not found`);
            this.navigate('dashboard');
            return false;
        }
        
        const routeConfig = this.routes.get(route);
        
        // Update state
        this.state.set('previousRoute', this.state.get('currentRoute'));
        this.state.set('currentRoute', route);
        this.currentRoute = route;
        
        // Update UI
        this._updateActiveNavItem(route);
        this._showRouteSection(route);
        this._updateBreadcrumb(routeConfig.title);
        this._updateDocumentTitle(routeConfig.title);
        
        // Update URL hash
        window.location.hash = route;
        
        // Log navigation
        this._logNavigation(route);
        
        // Update stats
        const stats = this.state.get('stats');
        this.state.set('stats.actionsPerformed', stats.actionsPerformed + 1);
        this.state.set('stats.lastAction', `Navigated to ${route}`);
        
        return true;
    }
    
    _updateActiveNavItem(route) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === route || item.dataset.nav === route) {
                item.classList.add('active');
            }
        });
    }
    
    _showRouteSection(route) {
        document.querySelectorAll('.section-content, [id$="Section"]').forEach(section => {
            section.classList.remove('active', 'visible-section');
            section.classList.add('hidden-section');
        });
        
        const targetSection = document.getElementById(`section-${route}`) ||
                             document.getElementById(`${route}Section`);
        
        if (targetSection) {
            targetSection.classList.remove('hidden-section');
            targetSection.classList.add('active', 'visible-section');
            
            // Scroll to top
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
        }
    }
    
    _updateBreadcrumb(title) {
        const breadcrumb = document.getElementById('breadcrumbCurrent');
        if (breadcrumb) {
            breadcrumb.textContent = title;
        }
    }
    
    _updateDocumentTitle(title) {
        document.title = `ELBATAL | ${title}`;
    }
    
    _logNavigation(route) {
        if (typeof EventLogger !== 'undefined') {
            EventLogger.log('NAVIGATION', 'Router', {
                route: route,
                previous: this.state.get('previousRoute')
            }, 1);
        }
    }
    
    getCurrentRoute() {
        return this.currentRoute || this.state.get('currentRoute');
    }
    
    getRouteConfig(route) {
        return this.routes.get(route || this.getCurrentRoute());
    }
    
    getAllRoutes() {
        return Array.from(this.routes.values());
    }
}

// ==================== NOTIFICATION MANAGER ====================
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = AppConfig.SETTINGS.MAX_NOTIFICATIONS;
        this.container = null;
        
        this._createContainer();
    }
    
    _createContainer() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'info', duration = 4000) {
        const notification = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            message: message,
            type: type, // info, success, warning, error
            duration: duration,
            createdAt: Date.now(),
            element: null
        };
        
        // Create element
        const element = this._createNotificationElement(notification);
        notification.element = element;
        
        // Add to container
        this.container.appendChild(element);
        
        // Add to array
        this.notifications.push(notification);
        
        // Remove old notifications if exceeding max
        while (this.notifications.length > this.maxNotifications) {
            this._removeNotification(this.notifications[0]);
        }
        
        // Animate in
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        });
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this._removeNotification(notification);
            }, duration);
        }
        
        // Update notification count
        if (typeof App !== 'undefined') {
            App.state.set('ui.notificationCount', this.notifications.length);
        }
        
        return notification.id;
    }
    
    _createNotificationElement(notification) {
        const element = document.createElement('div');
        
        const colors = {
            info: { bg: 'rgba(0,180,216,0.1)', border: '#00b4d8', icon: 'ℹ️' },
            success: { bg: 'rgba(0,255,65,0.1)', border: '#00ff41', icon: '✅' },
            warning: { bg: 'rgba(255,204,0,0.1)', border: '#ffcc00', icon: '⚠️' },
            error: { bg: 'rgba(255,0,60,0.1)', border: '#ff003c', icon: '❌' }
        };
        
        const color = colors[notification.type] || colors.info;
        
        element.style.cssText = `
            background: #0a0a0f;
            border: 1px solid ${color.border};
            border-left: 3px solid ${color.border};
            border-radius: 8px;
            padding: 14px 18px;
            color: #e0e0e0;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 280px;
            max-width: 420px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 15px ${color.border}22;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55), opacity 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            background: ${color.border};
            width: 100%;
            animation: notificationProgress ${notification.duration}ms linear forwards;
        `;
        
        element.innerHTML = `
            <span style="font-size:1.1rem;">${color.icon}</span>
            <span style="flex:1;">${notification.message}</span>
            <span style="color:#555;cursor:pointer;font-size:1.2rem;" onclick="this.parentElement.remove()">×</span>
        `;
        
        element.appendChild(progressBar);
        
        // Click to dismiss
        element.addEventListener('click', () => {
            this._removeNotification(notification);
        });
        
        return element;
    }
    
    _removeNotification(notification) {
        const index = this.notifications.findIndex(n => n.id === notification.id);
        if (index > -1) {
            this.notifications.splice(index, 1);
        }
        
        if (notification.element && notification.element.parentNode) {
            notification.element.style.transform = 'translateX(120%)';
            notification.element.style.opacity = '0';
            
            setTimeout(() => {
                if (notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, 400);
        }
        
        // Update notification count
        if (typeof App !== 'undefined') {
            App.state.set('ui.notificationCount', this.notifications.length);
        }
    }
    
    clearAll() {
        [...this.notifications].forEach(n => this._removeNotification(n));
    }
    
    getCount() {
        return this.notifications.length;
    }
}

// Add notification progress animation
const notifStyle = document.createElement('style');
notifStyle.textContent = `
    @keyframes notificationProgress {
        0% { width: 100%; }
        100% { width: 0%; }
    }
`;
document.head.appendChild(notifStyle);

// ==================== KEYBOARD SHORTCUT MANAGER ====================
class KeyboardShortcutManager {
    constructor(router) {
        this.router = router;
        this.shortcuts = new Map();
        
        this._registerDefaultShortcuts();
        this._attachListener();
    }
    
    _registerDefaultShortcuts() {
        // Navigation shortcuts
        this.register('Alt+1', () => this.router.navigate('dashboard'), 'Dashboard');
        this.register('Alt+2', () => this.router.navigate('tools'), 'Tools');
        this.register('Alt+3', () => this.router.navigate('courses'), 'Courses');
        this.register('Alt+4', () => this.router.navigate('books'), 'Books');
        this.register('Alt+5', () => this.router.navigate('apps'), 'Apps');
        this.register('Alt+6', () => this.router.navigate('info'), 'Info');
        this.register('Alt+7', () => this.router.navigate('upload'), 'Upload');
        
        // Action shortcuts
        this.register('Alt+S', () => this._focusSearch(), 'Search');
        this.register('Alt+L', () => this._handleLogout(), 'Logout');
        this.register('Escape', () => this._closeModal(), 'Close Modal');
        this.register('Alt+T', () => this._toggleSidebar(), 'Toggle Sidebar');
        
        // Quick actions
        this.register('Ctrl+K', () => this._focusSearch(), 'Quick Search');
        this.register('Ctrl+B', () => this._toggleSidebar(), 'Toggle Sidebar');
    }
    
    register(shortcut, callback, description = '') {
        const normalized = this._normalizeShortcut(shortcut);
        this.shortcuts.set(normalized, { callback, description });
    }
    
    unregister(shortcut) {
        const normalized = this._normalizeShortcut(shortcut);
        this.shortcuts.delete(normalized);
    }
    
    _normalizeShortcut(shortcut) {
        return shortcut.toLowerCase()
            .replace('ctrl', 'control')
            .replace(/\s+/g, '+')
            .split('+')
            .sort()
            .join('+');
    }
    
    _attachListener() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            const tag = e.target.tagName.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || 
                           e.target.isContentEditable;
            
            if (isInput && e.key !== 'Escape') return;
            
            const keys = [];
            if (e.altKey) keys.push('alt');
            if (e.ctrlKey) keys.push('control');
            if (e.shiftKey) keys.push('shift');
            if (e.metaKey) keys.push('meta');
            keys.push(e.key.toLowerCase());
            
            const normalized = keys.sort().join('+');
            
            if (this.shortcuts.has(normalized)) {
                e.preventDefault();
                e.stopPropagation();
                
                const { callback } = this.shortcuts.get(normalized);
                try {
                    callback();
                } catch (error) {
                    console.error('Shortcut error:', error);
                }
            }
        });
    }
    
    _focusSearch() {
        const searchInput = document.getElementById('globalSearch') || 
                           document.querySelector('.topbar-search input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    _handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            if (typeof window.ELBATAL_Security !== 'undefined') {
                window.ELBATAL_Security.terminateSession('USER_LOGOUT');
            } else {
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        }
    }
    
    _closeModal() {
        const modal = document.querySelector('.modal-overlay.show');
        if (modal) {
            modal.classList.remove('show');
            if (typeof App !== 'undefined') {
                App.state.set('ui.modalOpen', false);
            }
        }
    }
    
    _toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            if (typeof App !== 'undefined') {
                App.state.set('ui.sidebarCollapsed', isCollapsed);
            }
        }
    }
    
    getShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([key, value]) => ({
            shortcut: key,
            description: value.description
        }));
    }
}

// ==================== IDLE DETECTOR ====================
class IdleDetector {
    constructor(callback, timeout = AppConfig.SETTINGS.IDLE_TIMEOUT) {
        this.callback = callback;
        this.timeout = timeout;
        this.idleTimer = null;
        this.isIdle = false;
        this.lastActivity = Date.now();
        
        this._events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'wheel'];
        this._handler = this._onActivity.bind(this);
        
        this._attachListeners();
        this._startIdleCheck();
    }
    
    _attachListeners() {
        this._events.forEach(event => {
            window.addEventListener(event, this._handler, { passive: true });
        });
    }
    
    _onActivity() {
        this.lastActivity = Date.now();
        
        if (this.isIdle) {
            this.isIdle = false;
            this._onActive();
        }
        
        // Reset idle timer
        clearTimeout(this.idleTimer);
        this._startIdleCheck();
    }
    
    _startIdleCheck() {
        this.idleTimer = setTimeout(() => {
            const idleTime = Date.now() - this.lastActivity;
            if (idleTime >= this.timeout && !this.isIdle) {
                this.isIdle = true;
                this._onIdle();
            }
        }, this.timeout);
    }
    
    _onIdle() {
        if (this.callback) {
            this.callback('idle', Date.now() - this.lastActivity);
        }
    }
    
    _onActive() {
        if (this.callback) {
            this.callback('active', 0);
        }
    }
    
    getIdleTime() {
        return Date.now() - this.lastActivity;
    }
    
    reset() {
        this.lastActivity = Date.now();
        this.isIdle = false;
        clearTimeout(this.idleTimer);
        this._startIdleCheck();
    }
    
    destroy() {
        this._events.forEach(event => {
            window.removeEventListener(event, this._handler);
        });
        clearTimeout(this.idleTimer);
    }
}

// ==================== AUTO-SAVE MANAGER ====================
class AutoSaveManager {
    constructor(interval = AppConfig.SETTINGS.AUTO_SAVE_INTERVAL) {
        this.interval = interval;
        this.timer = null;
        this.saveCallbacks = [];
    }
    
    register(callback) {
        this.saveCallbacks.push(callback);
    }
    
    start() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this._executeSaves();
        }, this.interval);
    }
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    async _executeSaves() {
        for (const callback of this.saveCallbacks) {
            try {
                await callback();
            } catch (e) {
                console.error('Auto-save error:', e);
            }
        }
        
        if (typeof EventLogger !== 'undefined') {
            EventLogger.log('AUTO_SAVE', 'AutoSaveManager', {
                callbacks: this.saveCallbacks.length
            }, 1);
        }
    }
    
    forceSave() {
        return this._executeSaves();
    }
}

// ==================== ERROR HANDLER ====================
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        
        this._attachGlobalHandlers();
    }
    
    _attachGlobalHandlers() {
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, 'GLOBAL');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'PROMISE');
        });
    }
    
    handleError(error, source = 'UNKNOWN') {
        const errorObj = {
            id: Date.now().toString(36),
            timestamp: Date.now(),
            source: source,
            message: error?.message || String(error),
            stack: error?.stack || 'No stack trace',
            handled: true
        };
        
        this.errors.push(errorObj);
        
        // Trim old errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors / 2);
        }
        
        // Log to monitoring system
        if (typeof EventLogger !== 'undefined') {
            EventLogger.log('APP_ERROR', source, {
                message: errorObj.message,
                stack: errorObj.stack?.substring(0, 200)
            }, 3);
        }
        
        // Update stats
        if (typeof App !== 'undefined') {
            const stats = App.state.get('stats');
            App.state.set('stats.errorsEncountered', stats.errorsEncountered + 1);
        }
        
        console.error(`[ELBATAL ERROR] ${source}: ${errorObj.message}`);
        
        return errorObj;
    }
    
    getErrors(limit = 50) {
        return this.errors.slice(-limit);
    }
    
    getErrorCount() {
        return this.errors.length;
    }
    
    clearErrors() {
        this.errors = [];
    }
}

// ==================== PERFORMANCE MONITOR ====================
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: [],
            memory: [],
            loadTime: 0,
            domReadyTime: 0
        };
        
        this._measureLoadTime();
        this._startFPSMonitoring();
    }
    
    _measureLoadTime() {
        if (performance.timing) {
            this.metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            this.metrics.domReadyTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
        }
    }
    
    _startFPSMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measure = (currentTime) => {
            frames++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.metrics.fps.push(fps);
                
                if (this.metrics.fps.length > 60) {
                    this.metrics.fps.shift();
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measure);
        };
        
        requestAnimationFrame(measure);
    }
    
    getAverageFPS() {
        if (this.metrics.fps.length === 0) return 0;
        const sum = this.metrics.fps.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.fps.length);
    }
    
    getPerformanceReport() {
        return {
            averageFPS: this.getAverageFPS(),
            loadTime: this.metrics.loadTime + 'ms',
            domReadyTime: this.metrics.domReadyTime + 'ms',
            memoryUsage: performance.memory ? 
                (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB' : 
                'N/A'
        };
    }
}

// ==================== MAIN APPLICATION CLASS ====================
class ELBATALApplication {
    constructor() {
        this.state = new ApplicationState();
        this.router = new Router(this.state);
        this.notifications = new NotificationManager();
        this.shortcuts = new KeyboardShortcutManager(this.router);
        this.autoSave = new AutoSaveManager();
        this.errorHandler = new ErrorHandler();
        this.performance = new PerformanceMonitor();
        this.idleDetector = null;
        
        this.modules = {};
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        console.log('%c[ELBATAL] %cInitializing application...', 'color: #00ff41; font-size: 1.2rem;', 'color: #fff;');
        console.log(`%c[ELBATAL] %cVersion: ${AppConfig.VERSION} | Build: ${AppConfig.BUILD} | Codename: ${AppConfig.CODENAME}`, 'color: #00ff41;', 'color: #aaa;');
        
        // Load saved state
        this.state.loadSavedState();
        
        // Initialize modules
        await this._initializeModules();
        
        // Setup idle detection
        this._setupIdleDetection();
        
        // Setup auto-save
        this._setupAutoSave();
        
        // Setup navigation listeners
        this._setupNavigationListeners();
        
        // Setup search
        this._setupSearch();
        
        // Setup event delegation
        this._setupEventDelegation();
        
        // Handle initial route
        const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
        await this.router.navigate(initialRoute);
        
        // Start uptime tracking
        setInterval(() => this.state.updateUptime(), 1000);
        
        this.initialized = true;
        
        console.log('%c[ELBATAL] %cApplication initialized successfully', 'color: #00ff41;', 'color: #0f0;');
        console.log('%c[ELBATAL] %cAll systems operational', 'color: #00ff41;', 'color: #0f0;');
        
        // Show welcome notification
        this.notifications.show('ELBATAL Console v' + AppConfig.VERSION + ' ready', 'success', 5000);
        
        // Dispatch init event
        window.dispatchEvent(new CustomEvent('elbatal:initialized', { 
            detail: { version: AppConfig.VERSION } 
        }));
    }
    
    async _initializeModules() {
        // Check which modules are available
        if (window.ELBATAL_Security) {
            this.modules.security = window.ELBATAL_Security;
            console.log('%c[MODULE] %cSecurity system loaded', 'color: #00ff41;', 'color: #fff;');
        }
        
        if (window.ELBATAL_Crypto) {
            this.modules.crypto = window.ELBATAL_Crypto;
            console.log('%c[MODULE] %cCrypto engine loaded', 'color: #00ff41;', 'color: #fff;');
        }
        
        if (window.ELBATAL_Monitor) {
            this.modules.monitor = window.ELBATAL_Monitor;
            console.log('%c[MODULE] %cMonitoring system loaded', 'color: #00ff41;', 'color: #fff;');
        }
        
        if (window.ELBATAL_Upload) {
            this.modules.upload = window.ELBATAL_Upload;
            console.log('%c[MODULE] %cUpload system loaded', 'color: #00ff41;', 'color: #fff;');
        }
        
        if (window.ELBATAL_Animations) {
            this.modules.animations = window.ELBATAL_Animations;
            console.log('%c[MODULE] %cAnimation engine loaded', 'color: #00ff41;', 'color: #fff;');
        }
    }
    
    _setupIdleDetection() {
        if (!AppConfig.FEATURES.ENABLE_AUTO_LOGOUT) return;
        
        this.idleDetector = new IdleDetector((status, idleTime) => {
            if (status === 'idle') {
                this.notifications.show('Session idle - auto-logout in 5 minutes', 'warning', 10000);
                
                // Schedule logout after 5 more minutes
                setTimeout(() => {
                    if (this.idleDetector && this.idleDetector.isIdle) {
                        this.notifications.show('Auto-logout due to inactivity', 'error', 5000);
                        setTimeout(() => {
                            if (this.modules.security) {
                                this.modules.security.terminateSession('IDLE_TIMEOUT');
                            }
                        }, 2000);
                    }
                }, 300000);
            }
        });
    }
    
    _setupAutoSave() {
        // Register content database auto-save
        if (this.modules.upload && this.modules.upload.db) {
            this.autoSave.register(() => {
                if (this.modules.upload.db._saveDatabase) {
                    this.modules.upload.db._saveDatabase();
                }
            });
        }
        
        // Register state auto-save
        this.autoSave.register(() => {
            this.state._autoSave();
        });
        
        this.autoSave.start();
    }
    
    _setupNavigationListeners() {
        // Listen for nav item clicks
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const section = navItem.dataset.section || navItem.dataset.nav;
                if (section) {
                    this.router.navigate(section);
                }
            }
        });
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const route = window.location.hash.replace('#', '');
            if (route && route !== this.router.getCurrentRoute()) {
                this.router.navigate(route);
            }
        });
        
        // Listen for popstate
        window.addEventListener('popstate', () => {
            const route = window.location.hash.replace('#', '') || 'dashboard';
            this.router.navigate(route);
        });
    }
    
    _setupSearch() {
        const searchInput = document.getElementById('globalSearch');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.state.set('ui.searchQuery', query);
            
            if (query.length === 0) {
                // Clear search
                this._clearSearch();
                return;
            }
            
            if (query.length < 2) return;
            
            // Perform search
            this._performSearch(query);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this._clearSearch();
            }
        });
    }
    
    _performSearch(query) {
        // Search in content database
        if (this.modules.upload && this.modules.upload.search) {
            const results = this.modules.upload.search(query);
            
            if (results && results.length > 0) {
                this.notifications.show(`Found ${results.length} results for "${query}"`, 'info', 3000);
            }
        }
    }
    
    _clearSearch() {
        // Refresh current view
        const currentRoute = this.router.getCurrentRoute();
        this.router.navigate(currentRoute);
    }
    
    _setupEventDelegation() {
        // Global click handler for data-action elements
        document.addEventListener('click', (e) => {
            const actionElement = e.target.closest('[data-action]');
            if (actionElement) {
                const action = actionElement.dataset.action;
                this._handleAction(action, actionElement, e);
            }
        });
        
        // Handle logout button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#logoutButton') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this._handleLogout();
            }
        });
        
        // Handle upload form submission
        document.addEventListener('click', (e) => {
            if (e.target.closest('#uploadButton') || e.target.closest('[data-action="upload"]')) {
                e.preventDefault();
                this._handleUpload();
            }
        });
    }
    
    _handleAction(action, element, event) {
        switch (action) {
            case 'refresh':
                this.router.navigate(this.router.getCurrentRoute());
                this.notifications.show('Page refreshed', 'info', 2000);
                break;
                
            case 'toggle-sidebar':
                this.shortcuts._toggleSidebar();
                break;
                
            case 'clear-search':
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) {
                    searchInput.value = '';
                    this._clearSearch();
                }
                break;
                
            case 'export-data':
                this._handleExport();
                break;
                
            case 'import-data':
                this._handleImport();
                break;
                
            default:
                console.log('Unknown action:', action);
        }
    }
    
    _handleLogout() {
        if (confirm('Are you sure you want to terminate this session?')) {
            sessionStorage.setItem('came_from_logout', 'true');
            
            if (this.modules.security) {
                this.modules.security.terminateSession('USER_LOGOUT');
            } else {
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        }
    }
    
    _handleUpload() {
        this.router.navigate('upload');
    }
    
    _handleExport() {
        if (this.modules.upload && this.modules.upload.exportDB) {
            const data = this.modules.upload.exportDB('json');
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elbatal_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.notifications.show('Database exported successfully', 'success');
        }
    }
    
    _handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                if (this.modules.upload && this.modules.upload.importDB) {
                    this.modules.upload.importDB(event.target.result, 'json')
                        .then(result => {
                            this.notifications.show(result.message, 'success');
                            this.router.navigate('dashboard');
                        })
                        .catch(err => {
                            this.notifications.show('Import failed: ' + err.message, 'error');
                        });
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // Public API
    navigate(route) {
        return this.router.navigate(route);
    }
    
    notify(message, type, duration) {
        return this.notifications.show(message, type, duration);
    }
    
    getState() {
        return this.state;
    }
    
    getModule(name) {
        return this.modules[name] || null;
    }
    
    getUptime() {
        return this.state.getUptimeFormatted();
    }
    
    getPerformanceReport() {
        return this.performance.getPerformanceReport();
    }
    
    getSystemReport() {
        return {
            version: AppConfig.VERSION,
            build: AppConfig.BUILD,
            codename: AppConfig.CODENAME,
            uptime: this.getUptime(),
            currentRoute: this.router.getCurrentRoute(),
            modules: Object.keys(this.modules),
            performance: this.getPerformanceReport(),
            state: this.state.state.stats,
            errors: this.errorHandler.getErrorCount(),
            notifications: this.notifications.getCount()
        };
    }
    
    destroy() {
        if (this.idleDetector) this.idleDetector.destroy();
        if (this.autoSave) this.autoSave.stop();
        
        console.log('%c[ELBATAL] %cApplication shutdown', 'color: #ff003c;', 'color: #fff;');
    }
}

// ==================== GLOBAL APP INSTANCE ====================
const App = new ELBATALApplication();

// ==================== INITIALIZE ON DOM READY ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.initialize());
} else {
    App.initialize();
}

// ==================== EXPORT GLOBAL API ====================
window.ELBATAL = {
    // Main application
    app: App,
    
    // Quick access methods
    navigate: (route) => App.navigate(route),
    notify: (message, type, duration) => App.notify(message, type, duration),
    getState: () => App.getState(),
    getReport: () => App.getSystemReport(),
    
    // Modules (if loaded)
    get security() { return App.modules.security; },
    get crypto() { return App.modules.crypto; },
    get monitor() { return App.modules.monitor; },
    get upload() { return App.modules.upload; },
    get animations() { return App.modules.animations; },
    
    // Configuration
    config: AppConfig,
    
    // Version
    VERSION: AppConfig.VERSION,
    
    // Utility: Export full system backup
    exportFullBackup: () => {
        const backup = {
            version: AppConfig.VERSION,
            timestamp: Date.now(),
            appState: App.state.state,
            contentDB: App.modules.upload?.db?.database || null,
            securityLog: App.modules.monitor?.events?.get() || [],
            performance: App.getPerformanceReport()
        };
        
        const encrypted = App.modules.crypto ? 
            App.modules.crypto.aes.encrypt(JSON.stringify(backup), 'ELBATAL_FULL_BACKUP') :
            JSON.stringify(backup);
        
        return encrypted;
    },
    
    // Utility: Import full system backup
    importFullBackup: async (encryptedData, password) => {
        try {
            let data;
            if (App.modules.crypto) {
                const decrypted = await App.modules.crypto.aes.decrypt(encryptedData, password);
                data = JSON.parse(decrypted);
            } else {
                data = JSON.parse(encryptedData);
            }
            
            if (data.contentDB && App.modules.upload?.db) {
                App.modules.upload.db.database = data.contentDB;
                App.modules.upload.db._saveDatabase();
            }
            
            App.notify('Backup restored successfully', 'success');
            return true;
        } catch (e) {
            App.notify('Failed to restore backup: ' + e.message, 'error');
            return false;
        }
    }
};

// Freeze the global API
Object.freeze(window.ELBATAL);

// ==================== SERVICE WORKER REGISTRATION (OPTIONAL) ====================
// Uncomment to enable offline support
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registered');
        }).catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    });
}
*/

// ==================== END OF MAIN APPLICATION ====================
console.log('%c[ELBATAL] %cCore application loaded - waiting for DOM...', 'color: #00ff41;', 'color: #fff;');

// Total lines: 1000+
// Version: 4.2
// ELBATAL - Advanced Hacker Console
