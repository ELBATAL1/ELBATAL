
# File 5: auth.js (Authentication System)
auth_js = '''// === ELBATAL AUTHENTICATION SYSTEM ===
// ENCRYPTION: Client-side hash + Session Storage
// WARNING: This is a frontend demo. For production, use backend auth.

const AUTH_CONFIG = {
    USERNAME: 'ELBATAL',
    PASSWORD: 'ELBATAL1BAS',
    SESSION_KEY: 'elbatal_session',
    LAST_ACTIVITY: 'elbatal_activity',
    TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

// Simple hash function for demo purposes
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function generateToken() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return simpleHash(timestamp + random + AUTH_CONFIG.USERNAME);
}

function setSession() {
    const token = generateToken();
    const sessionData = {
        token: token,
        user: AUTH_CONFIG.USERNAME,
        loginTime: Date.now(),
        ip: '127.0.0.1' // Simulated
    };
    sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
    sessionStorage.setItem(AUTH_CONFIG.LAST_ACTIVITY, Date.now().toString());
}

function checkSession() {
    const session = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!session) return false;
    
    try {
        const data = JSON.parse(session);
        const lastActivity = parseInt(sessionStorage.getItem(AUTH_CONFIG.LAST_ACTIVITY) || '0');
        
        if (Date.now() - lastActivity > AUTH_CONFIG.TIMEOUT) {
            logout();
            return false;
        }
        
        sessionStorage.setItem(AUTH_CONFIG.LAST_ACTIVITY, Date.now().toString());
        return true;
    } catch (e) {
        return false;
    }
}

function logout() {
    sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    sessionStorage.removeItem(AUTH_CONFIG.LAST_ACTIVITY);
    window.location.href = 'index.html';
}

function checkAuth() {
    if (!checkSession()) {
        document.body.innerHTML = `
            <div class="access-denied">
                <h1>403</h1>
                <p>ACCESS DENIED // UNAUTHORIZED</p>
                <p>Session expired or invalid credentials</p>
                <a href="index.html">[ RETURN_TO_LOGIN ]</a>
            </div>
        `;
        return false;
    }
    return true;
}

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');
            const btn = loginForm.querySelector('.hack-btn');
            
            // Simulate processing
            btn.disabled = true;
            btn.querySelector('.btn-text').textContent = 'VERIFYING...';
            
            setTimeout(() => {
                if (username === AUTH_CONFIG.USERNAME && password === AUTH_CONFIG.PASSWORD) {
                    errorMsg.textContent = '';
                    errorMsg.style.color = 'var(--primary)';
                    errorMsg.textContent = '[+] Authentication successful. Redirecting...';
                    
                    setSession();
                    
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    errorMsg.style.color = 'var(--accent)';
                    errorMsg.textContent = '[-] ACCESS DENIED: Invalid credentials';
                    btn.disabled = false;
                    btn.querySelector('.btn-text').textContent = 'EXECUTE_LOGIN';
                    
                    // Shake effect
                    loginForm.style.animation = 'shake 0.5s';
                    setTimeout(() => {
                        loginForm.style.animation = '';
                    }, 500);
                }
            }, 1500);
        });
    }
});

function togglePassword() {
    const passInput = document.getElementById('password');
    if (passInput.type === 'password') {
        passInput.type = 'text';
    } else {
        passInput.type = 'password';
    }
}

function updateClock() {
    const clock = document.getElementById('clock');
    if (clock) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }) + ' UTC';
    }
}

// Activity tracking
['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
    document.addEventListener(event, () => {
        if (checkSession()) {
            sessionStorage.setItem(AUTH_CONFIG.LAST_ACTIVITY, Date.now().toString());
        }
    });
});

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
'''

with open(f"{project_dir}/auth.js", "w", encoding="utf-8") as f:
    f.write(auth_js)

print("✅ auth.js created")
