/**
 * ===================================================================
 *  ELBATAL INTRUSION DETECTION & MONITORING SYSTEM v4.2
 *  File: monitor.js
 *  Lines: 1000+
 *  Description: Real-time threat monitoring, intrusion detection,
 *               behavioral analysis & automated countermeasures
 * ===================================================================
 */

'use strict';

// ==================== SELF-PROTECTION ====================
(function() {
    const MONITOR_INTEGRITY = 'IDS_V4.2_INTEGRITY_CHECK';
    if (window._monitorLoaded) {
        console.warn('Duplicate monitor detected');
        return;
    }
    window._monitorLoaded = MONITOR_INTEGRITY;
})();

// ==================== MONITORING CONFIGURATION ====================
const MonitorConfig = Object.freeze({
    THREAT_LEVELS: {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4,
        EMERGENCY: 5
    },
    
    SCAN_INTERVALS: {
        RAPID: 1000,      // 1 second
        NORMAL: 5000,     // 5 seconds
        EXTENDED: 30000,  // 30 seconds
        DEEP: 300000      // 5 minutes
    },
    
    THRESHOLDS: {
        MAX_FAILED_LOGINS: 5,
        MAX_RATE_PER_MINUTE: 60,
        MAX_DOM_CHANGES: 20,
        MAX_SCRIPT_INJECTIONS: 0,
        MAX_STORAGE_WRITES: 50,
        SUSPICIOUS_USER_AGENTS: [
            'sqlmap', 'nikto', 'nmap', 'masscan',
            'burpsuite', 'zap', 'acunetix', 'netsparker',
            'gobuster', 'dirbuster', 'wfuzz', 'hydra'
        ],
        BLOCKED_IPS: [
            '127.0.0.1', // Example
        ],
        ANOMALY_SCORE_MAX: 100
    },
    
    ALERT_CHANNELS: {
        CONSOLE: false,
        VISUAL: true,
        SESSION_STORAGE: true,
        LOCAL_STORAGE: true
    },
    
    AUTO_COUNTERMEASURES: {
        ENABLED: true,
        LOCK_ACCOUNT: true,
        CLEAR_SESSION: true,
        BLOCK_IP: false, // Not applicable for client-side
        NOTIFY_ADMIN: true,
        ACTIVATE_HONEYPOT: true
    }
});

// ==================== THREAT INTELLIGENCE DATABASE ====================
const ThreatDatabase = {
    attackPatterns: [
        {
            id: 'XSS-001',
            name: 'Cross-Site Scripting',
            regex: /<script[^>]*>|javascript:|on\w+\s*=|eval\(|document\.cookie|alert\(/gi,
            severity: MonitorConfig.THREAT_LEVELS.HIGH,
            category: 'injection'
        },
        {
            id: 'SQL-002',
            name: 'SQL Injection',
            regex: /(\bSELECT\b.*\bFROM\b)|(\bUNION\b.*\bSELECT\b)|(\bINSERT\b.*\bINTO\b)|(\bDROP\b.*\bTABLE\b)|('.*--)|(\bOR\b.*=.*)/gi,
            severity: MonitorConfig.THREAT_LEVELS.CRITICAL,
            category: 'injection'
        },
        {
            id: 'CMD-003',
            name: 'Command Injection',
            regex: /[;&|`$]|\.\.\/|etc\/passwd|cmd\.exe|\/bin\/bash|powershell|wget |curl /gi,
            severity: MonitorConfig.THREAT_LEVELS.CRITICAL,
            category: 'injection'
        },
        {
            id: 'PATH-004',
            name: 'Path Traversal',
            regex: /\.\.\/|\.\.\\|%2e%2e|%252e|etc\/passwd|boot\.ini|win\.ini/gi,
            severity: MonitorConfig.THREAT_LEVELS.HIGH,
            category: 'traversal'
        },
        {
            id: 'INFO-005',
            name: 'Information Disclosure',
            regex: /password|passwd|secret|token|api_key|private_key|credential/gi,
            severity: MonitorConfig.THREAT_LEVELS.MEDIUM,
            category: 'disclosure'
        }
    ],
    
    malwareSignatures: [
        {
            name: 'CryptoMiner',
            pattern: /CoinHive|CryptoLoot|webminerpool|miner\.start|\.getRandomValues/,
            severity: MonitorConfig.THREAT_LEVELS.CRITICAL
        },
        {
            name: 'KeyLogger',
            pattern: /onkeypress|onkeydown|onkeyup|addEventListener.*key/,
            severity: MonitorConfig.THREAT_LEVELS.HIGH
        },
        {
            name: 'ScreenCapture',
            pattern: /html2canvas|screenshot|captureScreen|toDataURL.*canvas/,
            severity: MonitorConfig.THREAT_LEVELS.HIGH
        }
    ],
    
    suspiciousDomains: [
        'phishing.com', 'malware.net', 'exploit.org',
        'hacktool.ru', 'crack.download', 'pirate.xyz'
    ]
};

// ==================== EVENT LOG SYSTEM ====================
class EventLogSystem {
    constructor() {
        this.events = [];
        this.maxEvents = 5000;
        this.maxStorageEvents = 1000;
        this.eventId = 0;
        this._loadFromStorage();
    }
    
    log(type, source, details, severity = MonitorConfig.THREAT_LEVELS.LOW) {
        const event = {
            id: ++this.eventId,
            timestamp: Date.now(),
            isoTime: new Date().toISOString(),
            type: type,
            source: source,
            details: details,
            severity: severity,
            sessionId: this._getSessionId(),
            fingerprint: this._getFingerprint()
        };
        
        this.events.push(event);
        
        // Trim if exceeds max
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents / 2);
        }
        
        // Persist critical events
        if (severity >= MonitorConfig.THREAT_LEVELS.HIGH) {
            this._persistCriticalEvent(event);
        }
        
        return event;
    }
    
    getEvents(filter = {}) {
        let filtered = [...this.events];
        
        if (filter.type) {
            filtered = filtered.filter(e => e.type === filter.type);
        }
        if (filter.severity) {
            filtered = filtered.filter(e => e.severity >= filter.severity);
        }
        if (filter.since) {
            filtered = filtered.filter(e => e.timestamp >= filter.since);
        }
        if (filter.limit) {
            filtered = filtered.slice(-filter.limit);
        }
        
        return filtered;
    }
    
    getEventCount(filter = {}) {
        return this.getEvents(filter).length;
    }
    
    getThreatSummary() {
        const now = Date.now();
        const last24h = now - 86400000;
        const last1h = now - 3600000;
        
        return {
            total: this.events.length,
            last24h: this.getEvents({ since: last24h }).length,
            last1h: this.getEvents({ since: last1h }).length,
            bySeverity: {
                low: this.getEvents({ severity: MonitorConfig.THREAT_LEVELS.LOW }).length,
                medium: this.getEvents({ severity: MonitorConfig.THREAT_LEVELS.MEDIUM }).length,
                high: this.getEvents({ severity: MonitorConfig.THREAT_LEVELS.HIGH }).length,
                critical: this.getEvents({ severity: MonitorConfig.THREAT_LEVELS.CRITICAL }).length,
                emergency: this.getEvents({ severity: MonitorConfig.THREAT_LEVELS.EMERGENCY }).length
            },
            byType: this._groupByType()
        };
    }
    
    search(query) {
        const q = query.toLowerCase();
        return this.events.filter(event =>
            event.type.toLowerCase().includes(q) ||
            event.source.toLowerCase().includes(q) ||
            JSON.stringify(event.details).toLowerCase().includes(q)
        );
    }
    
    clear() {
        this.events = [];
        this._clearStorage();
    }
    
    _groupByType() {
        const groups = {};
        this.events.forEach(event => {
            if (!groups[event.type]) groups[event.type] = 0;
            groups[event.type]++;
        });
        return groups;
    }
    
    _getSessionId() {
        return sessionStorage.getItem('elbatal_session_id') || 'unknown';
    }
    
    _getFingerprint() {
        return (typeof SecurityManager !== 'undefined') ? 
            SecurityManager.state?.sessionFingerprint?.substring(0, 12) : 'unknown';
    }
    
    _persistCriticalEvent(event) {
        try {
            const stored = JSON.parse(sessionStorage.getItem('elbatal_critical_log') || '[]');
            stored.push(event);
            if (stored.length > this.maxStorageEvents) {
                stored.shift();
            }
            sessionStorage.setItem('elbatal_critical_log', JSON.stringify(stored));
        } catch (e) {}
    }
    
    _loadFromStorage() {
        try {
            const stored = JSON.parse(sessionStorage.getItem('elbatal_critical_log') || '[]');
            stored.forEach(event => {
                event.id = ++this.eventId;
                this.events.push(event);
            });
        } catch (e) {}
    }
    
    _clearStorage() {
        sessionStorage.removeItem('elbatal_critical_log');
    }
}

// ==================== REAL-TIME THREAT SCANNER ====================
class ThreatScanner {
    constructor(eventLog) {
        this.eventLog = eventLog;
        this.scanIntervals = [];
        this.isScanning = false;
        this.threatCount = 0;
        this.lastScanResult = null;
    }
    
    startScanning() {
        if (this.isScanning) return;
        this.isScanning = true;
        
        // Rapid scan for critical checks
        this.scanIntervals.push(setInterval(() => {
            this._scanDOM();
            this._scanScripts();
        }, MonitorConfig.SCAN_INTERVALS.RAPID));
        
        // Normal scan
        this.scanIntervals.push(setInterval(() => {
            this._scanNetworkRequests();
            this._scanStorage();
        }, MonitorConfig.SCAN_INTERVALS.NORMAL));
        
        // Extended scan
        this.scanIntervals.push(setInterval(() => {
            this._scanForMalware();
            this._checkIntegrity();
        }, MonitorConfig.SCAN_INTERVALS.EXTENDED));
        
        // Deep scan
        this.scanIntervals.push(setInterval(() => {
            this._deepSystemScan();
            this._updateThreatIntelligence();
        }, MonitorConfig.SCAN_INTERVALS.DEEP));
        
        this.eventLog.log('SCANNER', 'ThreatScanner', 'Scanning started', MonitorConfig.THREAT_LEVELS.LOW);
    }
    
    stopScanning() {
        this.scanIntervals.forEach(clearInterval);
        this.scanIntervals = [];
        this.isScanning = false;
        this.eventLog.log('SCANNER', 'ThreatScanner', 'Scanning stopped', MonitorConfig.THREAT_LEVELS.LOW);
    }
    
    _scanDOM() {
        try {
            // Check for suspicious elements
            const suspiciousElements = document.querySelectorAll(
                'script[src*="http"]:not([src*="trusted.com"]), ' +
                'iframe:not([sandbox]), ' +
                'object, embed, ' +
                'link[rel="stylesheet"][href*="http"]:not([href*="trusted.com"])'
            );
            
            if (suspiciousElements.length > 0) {
                this.eventLog.log('DOM_SUSPICIOUS', 'DOMScanner', {
                    count: suspiciousElements.length,
                    elements: Array.from(suspiciousElements).map(el => el.tagName)
                }, MonitorConfig.THREAT_LEVELS.MEDIUM);
            }
            
            // Check for hidden iframes
            const hiddenIframes = document.querySelectorAll('iframe[style*="display:none"], iframe[hidden], iframe[width="0"], iframe[height="0"]');
            if (hiddenIframes.length > 0) {
                this._triggerAlert('HIDDEN_IFRAME_DETECTED', {
                    count: hiddenIframes.length
                }, MonitorConfig.THREAT_LEVELS.HIGH);
            }
            
            // Check for form hijacking
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                if (form.action && !form.action.startsWith(window.location.origin)) {
                    this._triggerAlert('FORM_HIJACKING', {
                        action: form.action
                    }, MonitorConfig.THREAT_LEVELS.HIGH);
                }
            });
            
        } catch (e) {
            this.eventLog.log('SCAN_ERROR', 'DOMScanner', e.message, MonitorConfig.THREAT_LEVELS.LOW);
        }
    }
    
    _scanScripts() {
        try {
            const scripts = document.querySelectorAll('script');
            scripts.forEach(script => {
                const content = script.textContent || '';
                
                // Scan for malicious patterns
                ThreatDatabase.attackPatterns.forEach(pattern => {
                    if (pattern.regex.test(content)) {
                        this._triggerAlert('MALICIOUS_SCRIPT', {
                            pattern: pattern.name,
                            script: script.src || 'inline'
                        }, pattern.severity);
                    }
                });
                
                // Check for eval usage
                if (/eval\(/.test(content)) {
                    this.eventLog.log('EVAL_DETECTED', 'ScriptScanner', {
                        script: script.src || 'inline'
                    }, MonitorConfig.THREAT_LEVELS.MEDIUM);
                }
                
                // Check for document.write
                if (/document\.write\(/.test(content)) {
                    this.eventLog.log('DOCUMENT_WRITE', 'ScriptScanner', {
                        script: script.src || 'inline'
                    }, MonitorConfig.THREAT_LEVELS.LOW);
                }
            });
            
        } catch (e) {
            this.eventLog.log('SCAN_ERROR', 'ScriptScanner', e.message, MonitorConfig.THREAT_LEVELS.LOW);
        }
    }
    
    _scanNetworkRequests() {
        // Monitor fetch and XHR
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = function(...args) {
            const url = args[0];
            
            // Check URL against threat database
            self._checkURL(url);
            
            // Log request
            self.eventLog.log('NETWORK', 'FetchMonitor', {
                url: url,
                method: args[1]?.method || 'GET'
            }, MonitorConfig.THREAT_LEVELS.LOW);
            
            return originalFetch.apply(this, args);
        };
        
        // Monitor XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            self._checkURL(url);
            self.eventLog.log('NETWORK', 'XHRMonitor', {
                url: url,
                method: method
            }, MonitorConfig.THREAT_LEVELS.LOW);
            
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };
    }
    
    _scanStorage() {
        try {
            // Monitor localStorage writes
            const originalSetItem = Storage.prototype.setItem;
            const self = this;
            let writeCount = 0;
            let lastReset = Date.now();
            
            Storage.prototype.setItem = function(key, value) {
                writeCount++;
                
                // Reset counter every minute
                if (Date.now() - lastReset > 60000) {
                    writeCount = 0;
                    lastReset = Date.now();
                }
                
                // Check for excessive writes
                if (writeCount > MonitorConfig.THRESHOLDS.MAX_STORAGE_WRITES) {
                    self._triggerAlert('EXCESSIVE_STORAGE_WRITES', {
                        count: writeCount,
                        key: key
                    }, MonitorConfig.THREAT_LEVELS.MEDIUM);
                }
                
                // Check for suspicious keys
                if (/token|session|auth|credential|password/i.test(key)) {
                    self.eventLog.log('SENSITIVE_STORAGE', 'StorageMonitor', {
                        key: key
                    }, MonitorConfig.THREAT_LEVELS.MEDIUM);
                }
                
                return originalSetItem.call(this, key, value);
            };
            
        } catch (e) {
            this.eventLog.log('SCAN_ERROR', 'StorageScanner', e.message, MonitorConfig.THREAT_LEVELS.LOW);
        }
    }
    
    _scanForMalware() {
        // Check for known malware signatures
        const pageContent = document.documentElement.innerHTML;
        
        ThreatDatabase.malwareSignatures.forEach(signature => {
            if (signature.pattern.test(pageContent)) {
                this._triggerAlert('MALWARE_DETECTED', {
                    name: signature.name
                }, signature.severity);
            }
        });
        
        // Check for cryptocurrency miners
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            const src = script.src || '';
            const content = script.textContent || '';
            
            if (/miner|coin-hive|crypto-loot|webminer/i.test(src + content)) {
                this._triggerAlert('CRYPTOMINER_DETECTED', {
                    source: src || 'inline'
                }, MonitorConfig.THREAT_LEVELS.CRITICAL);
            }
        });
    }
    
    _checkIntegrity() {
        // Verify critical security objects still exist
        if (typeof window.ELBATAL_Security === 'undefined') {
            this._triggerAlert('SECURITY_API_MISSING', {}, MonitorConfig.THREAT_LEVELS.CRITICAL);
        }
        
        if (typeof window.ELBATAL_Crypto === 'undefined') {
            this._triggerAlert('CRYPTO_API_MISSING', {}, MonitorConfig.THREAT_LEVELS.CRITICAL);
        }
        
        // Check for console tampering
        if (console.log.toString().includes('native code') === false) {
            this.eventLog.log('CONSOLE_TAMPERED', 'IntegrityCheck', {}, MonitorConfig.THREAT_LEVELS.HIGH);
        }
    }
    
    _deepSystemScan() {
        // Comprehensive system check
        const checks = {
            serviceWorkers: false,
            webWorkers: false,
            indexedDB: false,
            webRTC: false,
            geolocation: false,
            notifications: false,
            camera: false,
            microphone: false
        };
        
        // Check service workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                if (registrations.length > 0) {
                    checks.serviceWorkers = true;
                    this.eventLog.log('SERVICE_WORKER', 'DeepScan', {
                        count: registrations.length
                    }, MonitorConfig.THREAT_LEVELS.LOW);
                }
            });
        }
        
        // Check for WebRTC leaks
        if (window.RTCPeerConnection) {
            checks.webRTC = true;
        }
        
        // Check permissions
        if (navigator.permissions) {
            ['geolocation', 'notifications', 'camera', 'microphone'].forEach(permission => {
                navigator.permissions.query({ name: permission }).then(result => {
                    if (result.state === 'granted') {
                        checks[permission] = true;
                        this.eventLog.log('PERMISSION_GRANTED', 'DeepScan', {
                            permission: permission
                        }, MonitorConfig.THREAT_LEVELS.LOW);
                    }
                }).catch(() => {});
            });
        }
    }
    
    _updateThreatIntelligence() {
        // Update threat patterns (in real app, would fetch from server)
        this.eventLog.log('THREAT_INTEL', 'Updater', 'Threat intelligence updated', MonitorConfig.THREAT_LEVELS.LOW);
    }
    
    _checkURL(url) {
        try {
            const parsed = new URL(url);
            
            // Check against suspicious domains
            ThreatDatabase.suspiciousDomains.forEach(domain => {
                if (parsed.hostname.includes(domain)) {
                    this._triggerAlert('SUSPICIOUS_DOMAIN', {
                        url: url,
                        domain: domain
                    }, MonitorConfig.THREAT_LEVELS.HIGH);
                }
            });
            
            // Check for data: URLs
            if (parsed.protocol === 'data:') {
                this.eventLog.log('DATA_URL', 'URLScanner', {
                    url: url.substring(0, 100)
                }, MonitorConfig.THREAT_LEVELS.MEDIUM);
            }
            
            // Check for javascript: URLs
            if (parsed.protocol === 'javascript:') {
                this._triggerAlert('JAVASCRIPT_URL', {
                    url: url.substring(0, 100)
                }, MonitorConfig.THREAT_LEVELS.HIGH);
            }
            
        } catch (e) {
            // Invalid URL, ignore
        }
    }
    
    _triggerAlert(type, details, severity) {
        this.threatCount++;
        
        // Log the alert
        this.eventLog.log('ALERT', type, details, severity);
        
        // Visual alert for high severity
        if (severity >= MonitorConfig.THREAT_LEVELS.HIGH && MonitorConfig.ALERT_CHANNELS.VISUAL) {
            this._showVisualAlert(type, details, severity);
        }
        
        // Execute countermeasures
        if (MonitorConfig.AUTO_COUNTERMEASURES.ENABLED) {
            this._executeCountermeasures(type, details, severity);
        }
        
        this.lastScanResult = {
            type: type,
            details: details,
            severity: severity,
            timestamp: Date.now()
        };
    }
    
    _showVisualAlert(type, details, severity) {
        const alertElement = document.createElement('div');
        const colors = {
            [MonitorConfig.THREAT_LEVELS.LOW]: '#ffcc00',
            [MonitorConfig.THREAT_LEVELS.MEDIUM]: '#ff9900',
            [MonitorConfig.THREAT_LEVELS.HIGH]: '#ff003c',
            [MonitorConfig.THREAT_LEVELS.CRITICAL]: '#ff0000',
            [MonitorConfig.THREAT_LEVELS.EMERGENCY]: '#8b0000'
        };
        
        alertElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0a0a0a;
            border: 2px solid ${colors[severity] || '#ff003c'};
            border-radius: 8px;
            padding: 15px 20px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            z-index: 99999;
            max-width: 350px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px ${colors[severity]}44;
            animation: slideInRight 0.3s ease;
            letter-spacing: 0.5px;
        `;
        
        alertElement.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                <span style="font-size:1.2rem;">⚠️</span>
                <strong style="color:${colors[severity]};">SECURITY ALERT</strong>
            </div>
            <div style="color:#aaa;">${type}</div>
            <div style="color:#666;font-size:0.7rem;margin-top:5px;">${JSON.stringify(details).substring(0, 100)}</div>
            <button onclick="this.parentElement.remove()" style="
                position:absolute;top:5px;right:10px;
                background:none;border:none;color:#666;cursor:pointer;font-size:1rem;
            ">×</button>
        `;
        
        document.body.appendChild(alertElement);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.style.opacity = '0';
                alertElement.style.transition = 'opacity 0.5s';
                setTimeout(() => alertElement.remove(), 500);
            }
        }, 10000);
    }
    
    _executeCountermeasures(type, details, severity) {
        if (severity >= MonitorConfig.THREAT_LEVELS.HIGH) {
            // Log the countermeasure
            this.eventLog.log('COUNTERMEASURE', 'AutoDefense', {
                type: type,
                action: 'INITIATED'
            }, MonitorConfig.THREAT_LEVELS.HIGH);
            
            // Clear sensitive data
            if (MonitorConfig.AUTO_COUNTERMEASURES.CLEAR_SESSION && severity >= MonitorConfig.THREAT_LEVELS.CRITICAL) {
                this._clearSensitiveData();
            }
        }
    }
    
    _clearSensitiveData() {
        // Clear session storage
        const sessionKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            sessionKeys.push(sessionStorage.key(i));
        }
        sessionKeys.forEach(key => sessionStorage.removeItem(key));
        
        // Clear sensitive localStorage
        const localKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('elbatal_')) {
                localKeys.push(key);
            }
        }
        localKeys.forEach(key => localStorage.removeItem(key));
        
        this.eventLog.log('DATA_PURGE', 'Countermeasure', {
            sessionKeys: sessionKeys.length,
            localKeys: localKeys.length
        }, MonitorConfig.THREAT_LEVELS.EMERGENCY);
    }
    
    getScanStatus() {
        return {
            isScanning: this.isScanning,
            threatCount: this.threatCount,
            lastScanResult: this.lastScanResult,
            intervals: this.scanIntervals.length,
            config: {
                rapid: MonitorConfig.SCAN_INTERVALS.RAPID,
                normal: MonitorConfig.SCAN_INTERVALS.NORMAL,
                extended: MonitorConfig.SCAN_INTERVALS.EXTENDED,
                deep: MonitorConfig.SCAN_INTERVALS.DEEP
            }
        };
    }
}

// ==================== BEHAVIORAL ANALYSIS ENGINE ====================
class BehavioralAnalysisEngine {
    constructor(eventLog) {
        this.eventLog = eventLog;
        this.userProfile = this._createBaselineProfile();
        this.behaviorHistory = [];
        this.anomalyScore = 0;
    }
    
    _createBaselineProfile() {
        return {
            mouseSpeed: { avg: 0, stdDev: 0, samples: 0 },
            keystrokeSpeed: { avg: 0, stdDev: 0, samples: 0 },
            clickFrequency: { avg: 0, stdDev: 0, samples: 0 },
            scrollSpeed: { avg: 0, stdDev: 0, samples: 0 },
            tabSwitchFrequency: { avg: 0, stdDev: 0, samples: 0 },
            activeHours: {},
            typicalActions: {}
        };
    }
    
    recordMouseEvent(event) {
        const data = {
            timestamp: Date.now(),
            x: event.clientX,
            y: event.clientY,
            movementX: event.movementX || 0,
            movementY: event.movementY || 0,
            speed: Math.sqrt(
                Math.pow(event.movementX || 0, 2) + 
                Math.pow(event.movementY || 0, 2)
            )
        };
        
        this.behaviorHistory.push({ type: 'mouse', data: data });
        this._updateBaseline('mouseSpeed', data.speed);
        this._trimHistory();
        this._checkAnomalies('mouse', data);
    }
    
    recordKeystroke(event) {
        const data = {
            timestamp: Date.now(),
            key: event.key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
        };
        
        this.behaviorHistory.push({ type: 'keystroke', data: data });
        this._checkAnomalies('keystroke', data);
        this._trimHistory();
    }
    
    recordClick(event) {
        const data = {
            timestamp: Date.now(),
            x: event.clientX,
            y: event.clientY,
            target: event.target?.tagName || 'unknown',
            button: event.button
        };
        
        this.behaviorHistory.push({ type: 'click', data: data });
        this._checkAnomalies('click', data);
        this._trimHistory();
    }
    
    _updateBaseline(metric, value) {
        if (!this.userProfile[metric]) return;
        
        const profile = this.userProfile[metric];
        profile.samples++;
        
        // Welford's online algorithm for mean and variance
        const delta = value - profile.avg;
        profile.avg += delta / profile.samples;
        const delta2 = value - profile.avg;
        profile.stdDev = Math.sqrt(
            ((profile.stdDev * profile.stdDev * (profile.samples - 1)) + (delta * delta2)) / 
            profile.samples
        );
    }
    
    _checkAnomalies(type, data) {
        if (this.behaviorHistory.length < 100) return; // Need enough data
        
        let isAnomalous = false;
        let anomalyType = '';
        
        switch (type) {
            case 'mouse':
                // Check for inhuman mouse speed
                const recentMouse = this.behaviorHistory
                    .filter(b => b.type === 'mouse')
                    .slice(-50);
                
                if (recentMouse.length > 0) {
                    const avgSpeed = recentMouse.reduce((sum, b) => sum + b.data.speed, 0) / recentMouse.length;
                    if (data.speed > avgSpeed * 10 && data.speed > 1000) {
                        isAnomalous = true;
                        anomalyType = 'MOUSE_SPEED_ANOMALY';
                    }
                }
                break;
                
            case 'keystroke':
                // Check for automated typing
                const recentKeys = this.behaviorHistory
                    .filter(b => b.type === 'keystroke')
                    .slice(-20);
                
                if (recentKeys.length >= 5) {
                    const intervals = [];
                    for (let i = 1; i < recentKeys.length; i++) {
                        intervals.push(recentKeys[i].data.timestamp - recentKeys[i-1].data.timestamp);
                    }
                    
                    if (intervals.length > 0) {
                        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                        // Check for very consistent intervals (bot-like)
                        const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
                        
                        if (variance < 5 && avgInterval < 100) {
                            isAnomalous = true;
                            anomalyType = 'AUTOMATED_TYPING';
                        }
                    }
                }
                break;
        }
        
        if (isAnomalous) {
            this.anomalyScore += 5;
            this.eventLog.log('BEHAVIOR_ANOMALY', 'BehaviorEngine', {
                type: anomalyType,
                score: this.anomalyScore,
                data: data
            }, MonitorConfig.THREAT_LEVELS.MEDIUM);
            
            if (this.anomalyScore >= MonitorConfig.THRESHOLDS.ANOMALY_SCORE_MAX) {
                this.eventLog.log('BEHAVIOR_CRITICAL', 'BehaviorEngine', {
                    score: this.anomalyScore
                }, MonitorConfig.THREAT_LEVELS.CRITICAL);
            }
        } else {
            // Slowly decrease anomaly score
            this.anomalyScore = Math.max(0, this.anomalyScore - 0.1);
        }
    }
    
    _trimHistory() {
        if (this.behaviorHistory.length > 1000) {
            this.behaviorHistory = this.behaviorHistory.slice(-500);
        }
    }
    
    getBehaviorReport() {
        return {
            anomalyScore: Math.round(this.anomalyScore),
            profile: {
                mouseSpeed: this.userProfile.mouseSpeed,
                keystrokeSpeed: this.userProfile.keystrokeSpeed
            },
            historySize: this.behaviorHistory.length,
            riskLevel: this.anomalyScore > 75 ? 'HIGH' : 
                       this.anomalyScore > 50 ? 'MEDIUM' : 'LOW'
        };
    }
}

// ==================== HONEYPOT SYSTEM ====================
class HoneypotSystem {
    constructor(eventLog) {
        this.eventLog = eventLog;
        this.honeypots = [];
        this.triggered = false;
    }
    
    deployHoneypots() {
        // Hidden form honeypot
        this._createFormHoneypot();
        
        // Hidden link honeypot
        this._createLinkHoneypot();
        
        // Hidden input honeypot
        this._createInputHoneypot();
        
        // Fake admin endpoint
        this._createAdminHoneypot();
        
        this.eventLog.log('HONEYPOT', 'Deployment', {
            count: this.honeypots.length
        }, MonitorConfig.THREAT_LEVELS.LOW);
    }
    
    _createFormHoneypot() {
        const form = document.createElement('form');
        form.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;';
        form.setAttribute('aria-hidden', 'true');
        form.innerHTML = `
            <input type="text" name="username" autocomplete="off">
            <input type="password" name="password" autocomplete="off">
            <input type="submit" value="Login">
        `;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._triggerHoneypot('FORM_HONEYPOT', 'Bot attempted to fill hidden form');
        });
        
        document.body.appendChild(form);
        this.honeypots.push({ type: 'form', element: form });
    }
    
    _createLinkHoneypot() {
        const link = document.createElement('a');
        link.href = '/admin/config.php';
        link.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        link.textContent = 'Admin Panel';
        link.setAttribute('aria-hidden', 'true');
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this._triggerHoneypot('LINK_HONEYPOT', 'Bot clicked hidden admin link');
        });
        
        document.body.appendChild(link);
        this.honeypots.push({ type: 'link', element: link });
    }
    
    _createInputHoneypot() {
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'credit_card';
        input.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
        input.setAttribute('aria-hidden', 'true');
        input.setAttribute('autocomplete', 'off');
        
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                this._triggerHoneypot('INPUT_HONEYPOT', 'Bot filled hidden input');
            }
        });
        
        document.body.appendChild(input);
        this.honeypots.push({ type: 'input', element: input });
    }
    
    _createAdminHoneypot() {
        // Monitor for attempts to access admin endpoints
        const adminPatterns = [
            '/admin', '/wp-admin', '/config', '/.env',
            '/phpmyadmin', '/backup', '/.git', '/debug'
        ];
        
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = function(url, ...args) {
            const urlStr = typeof url === 'string' ? url : url.url || '';
            
            adminPatterns.forEach(pattern => {
                if (urlStr.includes(pattern)) {
                    self._triggerHoneypot('ADMIN_HONEYPOT', `Attempt to access: ${urlStr}`);
                }
            });
            
            return originalFetch.call(this, url, ...args);
        };
        
        this.honeypots.push({ type: 'admin_monitor', element: null });
    }
    
    _triggerHoneypot(type, details) {
        this.triggered = true;
        
        this.eventLog.log('HONEYPOT_TRIGGERED', type, {
            details: details,
            timestamp: Date.now()
        }, MonitorConfig.THREAT_LEVELS.CRITICAL);
        
        // Execute countermeasures
        if (MonitorConfig.AUTO_COUNTERMEASURES.ACTIVATE_HONEYPOT) {
            this._executeHoneypotCountermeasures();
        }
    }
    
    _executeHoneypotCountermeasures() {
        // Feed fake data
        this._feedFakeData();
        
        // Log additional info
        this._collectAttackerInfo();
    }
    
    _feedFakeData() {
        // Generate fake tokens
        const fakeTokens = [];
        for (let i = 0; i < 20; i++) {
            fakeTokens.push('fake_token_' + Math.random().toString(36).substring(2));
        }
        
        // Store fake data
        sessionStorage.setItem('fake_session', JSON.stringify({
            user: 'admin',
            role: 'superuser',
            tokens: fakeTokens
        }));
    }
    
    _collectAttackerInfo() {
        const info = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: Date.now()
        };
        
        this.eventLog.log('ATTACKER_INFO', 'Honeypot', info, MonitorConfig.THREAT_LEVELS.HIGH);
    }
    
    getHoneypotStatus() {
        return {
            deployed: this.honeypots.length,
            triggered: this.triggered,
            types: this.honeypots.map(h => h.type)
        };
    }
}

// ==================== SYSTEM HEALTH MONITOR ====================
class SystemHealthMonitor {
    constructor(eventLog) {
        this.eventLog = eventLog;
        this.healthChecks = [];
        this.lastHealthReport = null;
    }
    
    startMonitoring() {
        // Monitor memory usage
        this.healthChecks.push(setInterval(() => {
            this._checkMemory();
        }, 10000));
        
        // Monitor DOM size
        this.healthChecks.push(setInterval(() => {
            this._checkDOMSize();
        }, 30000));
        
        // Monitor event listeners
        this.healthChecks.push(setInterval(() => {
            this._checkEventListeners();
        }, 60000));
        
        this.eventLog.log('HEALTH', 'Monitor', 'Health monitoring started', MonitorConfig.THREAT_LEVELS.LOW);
    }
    
    _checkMemory() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = memory.usedJSHeapSize / (1024 * 1024);
            const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
            const percentUsed = (usedMB / limitMB) * 100;
            
            if (percentUsed > 80) {
                this.eventLog.log('MEMORY_WARNING', 'HealthMonitor', {
                    usedMB: usedMB.toFixed(2),
                    limitMB: limitMB.toFixed(2),
                    percentUsed: percentUsed.toFixed(1)
                }, MonitorConfig.THREAT_LEVELS.MEDIUM);
            }
        }
    }
    
    _checkDOMSize() {
        const elements = document.querySelectorAll('*').length;
        const maxElements = 5000;
        
        if (elements > maxElements) {
            this.eventLog.log('DOM_SIZE_WARNING', 'HealthMonitor', {
                elements: elements,
                max: maxElements
            }, MonitorConfig.THREAT_LEVELS.LOW);
        }
    }
    
    _checkEventListeners() {
        // Approximate event listener count
        const allElements = document.querySelectorAll('*');
        let estimatedListeners = 0;
        
        allElements.forEach(el => {
            // Each element typically has 0-5 listeners
            estimatedListeners += 3; // Rough estimate
        });
        
        if (estimatedListeners > 10000) {
            this.eventLog.log('EVENT_LISTENER_WARNING', 'HealthMonitor', {
                estimated: estimatedListeners
            }, MonitorConfig.THREAT_LEVELS.LOW);
        }
    }
    
    getHealthReport() {
        const report = {
            timestamp: Date.now(),
            memory: null,
            domSize: document.querySelectorAll('*').length,
            eventListeners: 'N/A',
            sessionStorageSize: this._getStorageSize(sessionStorage),
            localStorageSize: this._getStorageSize(localStorage),
            networkRequests: 0, // Would track in real implementation
            errors: 0
        };
        
        if (performance.memory) {
            report.memory = {
                used: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
                total: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
                limit: (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2) + 'MB'
            };
        }
        
        this.lastHealthReport = report;
        return report;
    }
    
    _getStorageSize(storage) {
        let size = 0;
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            size += key.length + (storage.getItem(key)?.length || 0);
        }
        return (size / 1024).toFixed(2) + 'KB';
    }
    
    stopMonitoring() {
        this.healthChecks.forEach(clearInterval);
        this.healthChecks = [];
    }
}

// ==================== GLOBAL INSTANCES ====================
const EventLogger = new EventLogSystem();
const ThreatScan = new ThreatScanner(EventLogger);
const BehaviorAnalyzer = new BehavioralAnalysisEngine(EventLogger);
const Honeypot = new HoneypotSystem(EventLogger);
const HealthMonitor = new SystemHealthMonitor(EventLogger);

// ==================== INITIALIZE MONITORING ====================
(function initializeMonitoring() {
    // Start threat scanner
    ThreatScan.startScanning();
    
    // Deploy honeypots
    Honeypot.deployHoneypots();
    
    // Start health monitoring
    HealthMonitor.startMonitoring();
    
    // Attach behavioral analysis to events
    document.addEventListener('mousemove', (e) => BehaviorAnalyzer.recordMouseEvent(e));
    document.addEventListener('keydown', (e) => BehaviorAnalyzer.recordKeystroke(e));
    document.addEventListener('click', (e) => BehaviorAnalyzer.recordClick(e));
    
    // Monitor visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            EventLogger.log('TAB_HIDDEN', 'VisibilityMonitor', {}, MonitorConfig.THREAT_LEVELS.LOW);
        } else {
            EventLogger.log('TAB_VISIBLE', 'VisibilityMonitor', {}, MonitorConfig.THREAT_LEVELS.LOW);
        }
    });
    
    // Monitor beforeunload
    window.addEventListener('beforeunload', () => {
        EventLogger.log('PAGE_UNLOAD', 'LifecycleMonitor', {
            sessionDuration: Date.now() - (window._sessionStartTime || Date.now())
        }, MonitorConfig.THREAT_LEVELS.LOW);
    });
    
    window._sessionStartTime = Date.now();
    
    console.log('%c[MONITOR] %cIntrusion Detection System active', 'color: #00ff41;', 'color: #fff;');
    console.log('%c[MONITOR] %cThreat Scanner | Honeypot | Behavior Analysis | Health Monitor', 'color: #00ff41;', 'color: #fff;');
})();

// ==================== EXPORT MONITOR API ====================
window.ELBATAL_Monitor = {
    // Event Log
    events: {
        log: (type, source, details, severity) => EventLogger.log(type, source, details, severity),
        get: (filter) => EventLogger.getEvents(filter),
        count: (filter) => EventLogger.getEventCount(filter),
        summary: () => EventLogger.getThreatSummary(),
        search: (query) => EventLogger.search(query),
        clear: () => EventLogger.clear()
    },
    
    // Threat Scanner
    scanner: {
        status: () => ThreatScan.getScanStatus(),
        start: () => ThreatScan.startScanning(),
        stop: () => ThreatScan.stopScanning(),
        lastAlert: () => ThreatScan.lastScanResult
    },
    
    // Behavior Analysis
    behavior: {
        report: () => BehaviorAnalyzer.getBehaviorReport(),
        anomalyScore: () => BehaviorAnalyzer.anomalyScore
    },
    
    // Honeypot
    honeypot: {
        status: () => Honeypot.getHoneypotStatus(),
        deployed: () => Honeypot.honeypots.length,
        triggered: () => Honeypot.triggered
    },
    
    // Health Monitor
    health: {
        report: () => HealthMonitor.getHealthReport(),
        lastReport: () => HealthMonitor.lastHealthReport
    },
    
    // Configuration
    config: MonitorConfig,
    
    // Quick security snapshot
    snapshot: () => ({
        threats: EventLogger.getThreatSummary(),
        scanner: ThreatScan.getScanStatus(),
        behavior: BehaviorAnalyzer.getBehaviorReport(),
        honeypot: Honeypot.getHoneypotStatus(),
        health: HealthMonitor.getHealthReport(),
        timestamp: Date.now()
    })
};

Object.freeze(window.ELBATAL_Monitor);

// ==================== END OF MONITORING SYSTEM ====================
// Total lines: 1000+
// Version: 4.2
