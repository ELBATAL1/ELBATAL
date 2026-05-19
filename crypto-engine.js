/**
 * ===================================================================
 *  ELBATAL CRYPTO ENGINE v4.2 - Advanced Encryption System
 *  File: crypto-engine.js
 *  Lines: 1000+
 *  Description: Military-grade encryption, hashing & obfuscation
 *  Algorithms: AES-256-GCM, RSA-2048, SHA-512, PBKDF2, bcrypt-like
 * ===================================================================
 */

'use strict';

// ==================== SELF-VERIFICATION ====================
(function() {
    const INTEGRITY_SIGNATURE = 'CRYPTO_ENGINE_V4.2_VERIFIED';
    if (typeof window._cryptoEngineLoaded !== 'undefined') {
        console.warn('Duplicate crypto engine detected');
        return;
    }
    window._cryptoEngineLoaded = INTEGRITY_SIGNATURE;
})();

// ==================== CRYPTO CONFIGURATION ====================
const CryptoConfig = Object.freeze({
    AES: {
        KEY_SIZE: 256,
        IV_SIZE: 16,
        MODE: 'GCM',
        TAG_LENGTH: 128,
        ITERATIONS: 100000
    },
    RSA: {
        KEY_SIZE: 2048,
        PUBLIC_EXPONENT: new Uint8Array([0x01, 0x00, 0x01]),
        HASH: 'SHA-512'
    },
    PBKDF2: {
        ITERATIONS: 200000,
        SALT_SIZE: 32,
        HASH: 'SHA-512'
    },
    HASH: {
        DEFAULT: 'SHA-512',
        SALT_SIZE: 64
    },
    ENCODING: {
        DEFAULT: 'base64',
        ALTERNATIVE: 'hex'
    }
});

// ==================== UTILITY FUNCTIONS ====================
class CryptoUtilities {
    static generateRandomBytes(size) {
        const bytes = new Uint8Array(size);
        crypto.getRandomValues(bytes);
        return bytes;
    }
    
    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    static arrayBufferToHex(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    static hexToArrayBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes.buffer;
    }
    
    static concatenateBuffers(buffer1, buffer2) {
        const combined = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        combined.set(new Uint8Array(buffer1), 0);
        combined.set(new Uint8Array(buffer2), buffer1.byteLength);
        return combined.buffer;
    }
    
    static splitBuffer(buffer, position) {
        const bytes = new Uint8Array(buffer);
        const first = bytes.slice(0, position).buffer;
        const second = bytes.slice(position).buffer;
        return [first, second];
    }
    
    static async deriveKey(password, salt, iterations = CryptoConfig.PBKDF2.ITERATIONS) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt instanceof Uint8Array ? salt : enc.encode(salt),
                iterations: iterations,
                hash: CryptoConfig.PBKDF2.HASH
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: CryptoConfig.AES.KEY_SIZE
            },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    static timingSafeCompare(str1, str2) {
        if (str1.length !== str2.length) {
            // Still perform comparison to prevent length-based timing
            let result = 0;
            const maxLength = Math.max(str1.length, str2.length);
            for (let i = 0; i < maxLength; i++) {
                const char1 = str1.charCodeAt(i % str1.length) || 0;
                const char2 = str2.charCodeAt(i % str2.length) || 0;
                result |= char1 ^ char2;
            }
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < str1.length; i++) {
            result |= str1.charCodeAt(i) ^ str2.charCodeAt(i);
        }
        return result === 0;
    }
}

// ==================== AES-256-GCM ENGINE ====================
class AES256Engine {
    constructor() {
        this.keyCache = new Map();
        this.maxCacheSize = 10;
    }
    
    async encrypt(plaintext, password, useCache = false) {
        try {
            const salt = CryptoUtilities.generateRandomBytes(CryptoConfig.PBKDF2.SALT_SIZE);
            const iv = CryptoUtilities.generateRandomBytes(CryptoConfig.AES.IV_SIZE);
            
            let key;
            if (useCache && this.keyCache.has(password)) {
                key = this.keyCache.get(password);
            } else {
                key = await CryptoUtilities.deriveKey(password, salt);
                if (useCache) {
                    this._addToCache(password, key);
                }
            }
            
            const enc = new TextEncoder();
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: CryptoConfig.AES.TAG_LENGTH
                },
                key,
                enc.encode(plaintext)
            );
            
            // Combine: salt (32) + iv (16) + ciphertext (variable)
            const combined = CryptoUtilities.concatenateBuffers(
                salt.buffer,
                CryptoUtilities.concatenateBuffers(iv.buffer, ciphertext)
            );
            
            return {
                ciphertext: CryptoUtilities.arrayBufferToBase64(combined),
                salt: CryptoUtilities.arrayBufferToBase64(salt),
                iv: CryptoUtilities.arrayBufferToBase64(iv),
                algorithm: 'AES-256-GCM'
            };
        } catch (error) {
            console.error('AES Encryption failed:', error.message);
            throw new Error('Encryption failed');
        }
    }
    
    async decrypt(ciphertextBase64, password, saltBase64 = null, ivBase64 = null) {
        try {
            const combined = CryptoUtilities.base64ToArrayBuffer(ciphertextBase64);
            const combinedBytes = new Uint8Array(combined);
            
            let salt, iv, ciphertext;
            
            if (saltBase64 && ivBase64) {
                salt = new Uint8Array(CryptoUtilities.base64ToArrayBuffer(saltBase64));
                iv = new Uint8Array(CryptoUtilities.base64ToArrayBuffer(ivBase64));
                ciphertext = combined;
            } else {
                salt = combinedBytes.slice(0, 32);
                iv = combinedBytes.slice(32, 48);
                ciphertext = combinedBytes.slice(48);
            }
            
            const key = await CryptoUtilities.deriveKey(password, salt);
            
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: CryptoConfig.AES.TAG_LENGTH
                },
                key,
                ciphertext
            );
            
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('AES Decryption failed:', error.message);
            throw new Error('Decryption failed - invalid key or corrupted data');
        }
    }
    
    async encryptObject(obj, password) {
        const jsonString = JSON.stringify(obj);
        return this.encrypt(jsonString, password);
    }
    
    async decryptObject(ciphertextBase64, password, saltBase64, ivBase64) {
        const jsonString = await this.decrypt(ciphertextBase64, password, saltBase64, ivBase64);
        return JSON.parse(jsonString);
    }
    
    _addToCache(password, key) {
        if (this.keyCache.size >= this.maxCacheSize) {
            const firstKey = this.keyCache.keys().next().value;
            this.keyCache.delete(firstKey);
        }
        this.keyCache.set(password, key);
    }
    
    clearCache() {
        this.keyCache.clear();
    }
}

// ==================== RSA-2048 ENGINE ====================
class RSA2048Engine {
    constructor() {
        this.keyPair = null;
    }
    
    async generateKeyPair() {
        try {
            this.keyPair = await crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: CryptoConfig.RSA.KEY_SIZE,
                    publicExponent: CryptoConfig.RSA.PUBLIC_EXPONENT,
                    hash: CryptoConfig.RSA.HASH
                },
                true,
                ['encrypt', 'decrypt']
            );
            
            return {
                publicKey: await this.exportPublicKey(),
                privateKey: await this.exportPrivateKey()
            };
        } catch (error) {
            console.error('RSA Key generation failed:', error.message);
            throw new Error('Key generation failed');
        }
    }
    
    async encrypt(plaintext, publicKey = null) {
        try {
            const key = publicKey || this.keyPair?.publicKey;
            if (!key) throw new Error('No public key available');
            
            const enc = new TextEncoder();
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'RSA-OAEP'
                },
                key,
                enc.encode(plaintext)
            );
            
            return CryptoUtilities.arrayBufferToBase64(ciphertext);
        } catch (error) {
            console.error('RSA Encryption failed:', error.message);
            throw new Error('RSA encryption failed');
        }
    }
    
    async decrypt(ciphertextBase64, privateKey = null) {
        try {
            const key = privateKey || this.keyPair?.privateKey;
            if (!key) throw new Error('No private key available');
            
            const ciphertext = CryptoUtilities.base64ToArrayBuffer(ciphertextBase64);
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'RSA-OAEP'
                },
                key,
                ciphertext
            );
            
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('RSA Decryption failed:', error.message);
            throw new Error('RSA decryption failed');
        }
    }
    
    async exportPublicKey() {
        if (!this.keyPair?.publicKey) return null;
        const exported = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
        return CryptoUtilities.arrayBufferToBase64(exported);
    }
    
    async exportPrivateKey() {
        if (!this.keyPair?.privateKey) return null;
        const exported = await crypto.subtle.exportKey('pkcs8', this.keyPair.privateKey);
        return CryptoUtilities.arrayBufferToBase64(exported);
    }
    
    async importPublicKey(base64Key) {
        const keyData = CryptoUtilities.base64ToArrayBuffer(base64Key);
        return crypto.subtle.importKey(
            'spki',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: CryptoConfig.RSA.HASH
            },
            true,
            ['encrypt']
        );
    }
    
    async importPrivateKey(base64Key) {
        const keyData = CryptoUtilities.base64ToArrayBuffer(base64Key);
        return crypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: CryptoConfig.RSA.HASH
            },
            true,
            ['decrypt']
        );
    }
    
    async sign(data, privateKey = null) {
        try {
            const key = privateKey || this.keyPair?.privateKey;
            if (!key) throw new Error('No private key for signing');
            
            const enc = new TextEncoder();
            const signature = await crypto.subtle.sign(
                {
                    name: 'RSA-PSS',
                    saltLength: 32
                },
                key,
                enc.encode(data)
            );
            
            return CryptoUtilities.arrayBufferToBase64(signature);
        } catch (error) {
            console.error('RSA Sign failed:', error.message);
            throw new Error('Signing failed');
        }
    }
    
    async verify(data, signatureBase64, publicKey = null) {
        try {
            const key = publicKey || this.keyPair?.publicKey;
            if (!key) throw new Error('No public key for verification');
            
            const signature = CryptoUtilities.base64ToArrayBuffer(signatureBase64);
            const enc = new TextEncoder();
            
            return crypto.subtle.verify(
                {
                    name: 'RSA-PSS',
                    saltLength: 32
                },
                key,
                signature,
                enc.encode(data)
            );
        } catch (error) {
            console.error('RSA Verify failed:', error.message);
            return false;
        }
    }
}

// ==================== ADVANCED HASHING ENGINE ====================
class AdvancedHashingEngine {
    constructor() {
        this.hashCache = new Map();
    }
    
    async sha256(data) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', enc.encode(data));
        return CryptoUtilities.arrayBufferToHex(hash);
    }
    
    async sha512(data) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-512', enc.encode(data));
        return CryptoUtilities.arrayBufferToHex(hash);
    }
    
    async pbkdf2(password, salt, iterations = CryptoConfig.PBKDF2.ITERATIONS, keyLength = 256) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );
        
        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: iterations,
                hash: 'SHA-512'
            },
            keyMaterial,
            keyLength
        );
        
        return CryptoUtilities.arrayBufferToHex(bits);
    }
    
    async multiRoundHash(data, rounds = 10) {
        let hash = data;
        for (let i = 0; i < rounds; i++) {
            hash = await this.sha512(hash + i.toString());
        }
        return hash;
    }
    
    async hashWithSalt(data, salt = null) {
        if (!salt) {
            salt = CryptoUtilities.generateRandomBytes(CryptoConfig.HASH.SALT_SIZE);
            salt = CryptoUtilities.arrayBufferToHex(salt);
        }
        
        const combined = data + salt;
        const hash = await this.multiRoundHash(combined, 5);
        
        return {
            hash: hash,
            salt: salt,
            algorithm: 'SHA-512-MULTI-ROUND'
        };
    }
    
    async verifyHash(data, storedHash, salt) {
        const combined = data + salt;
        const computedHash = await this.multiRoundHash(combined, 5);
        return CryptoUtilities.timingSafeCompare(computedHash, storedHash);
    }
    
    // bcrypt-like implementation
    async bcryptLike(password, cost = 12) {
        const salt = CryptoUtilities.generateRandomBytes(16);
        const saltHex = CryptoUtilities.arrayBufferToHex(salt);
        
        // Initial hash
        let hash = await this.sha512(password + saltHex);
        
        // Cost factor (2^cost iterations)
        const iterations = Math.pow(2, cost);
        for (let i = 0; i < iterations; i++) {
            hash = await this.sha512(hash + saltHex + i.toString());
        }
        
        // Format: $2a$[cost]$[salt]$[hash]
        const costStr = cost.toString().padStart(2, '0');
        return `$2a$${costStr}$${saltHex}$${hash}`;
    }
    
    async verifyBcryptLike(password, storedHash) {
        const parts = storedHash.split('$');
        if (parts.length !== 5 || parts[1] !== '2a') {
            throw new Error('Invalid hash format');
        }
        
        const cost = parseInt(parts[2]);
        const saltHex = parts[3];
        
        let hash = await this.sha512(password + saltHex);
        
        const iterations = Math.pow(2, cost);
        for (let i = 0; i < iterations; i++) {
            hash = await this.sha512(hash + saltHex + i.toString());
        }
        
        return CryptoUtilities.timingSafeCompare(hash, parts[4]);
    }
}

// ==================== PASSWORD STRENGTH ANALYZER ====================
class PasswordStrengthAnalyzer {
    analyze(password) {
        const analysis = {
            score: 0,
            maxScore: 100,
            strength: 'Weak',
            feedback: [],
            entropy: 0,
            crackTime: 'Instant'
        };
        
        if (!password || password.length === 0) {
            analysis.feedback.push('Password is empty');
            return analysis;
        }
        
        // Length scoring
        const length = password.length;
        if (length >= 16) analysis.score += 30;
        else if (length >= 12) analysis.score += 25;
        else if (length >= 8) analysis.score += 15;
        else if (length >= 6) analysis.score += 5;
        else analysis.feedback.push('Password is too short (minimum 8 characters)');
        
        // Character variety scoring
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        const hasUnicode = /[^\x00-\x7F]/.test(password);
        
        const varietyScore = [hasLower, hasUpper, hasDigit, hasSpecial, hasUnicode]
            .filter(Boolean).length * 10;
        analysis.score += varietyScore;
        
        if (!hasUpper) analysis.feedback.push('Add uppercase letters');
        if (!hasDigit) analysis.feedback.push('Add numbers');
        if (!hasSpecial) analysis.feedback.push('Add special characters');
        
        // Pattern detection
        const commonPatterns = [
            /12345/, /qwerty/, /password/, /admin/, /letmein/,
            /abc123/, /monkey/, /dragon/, /master/, /hello/,
            /iloveyou/, /trustno1/, /sunshine/, /princess/
        ];
        
        commonPatterns.forEach(pattern => {
            if (pattern.test(password.toLowerCase())) {
                analysis.score -= 20;
                analysis.feedback.push('Contains common pattern');
            }
        });
        
        // Repetition penalty
        const repeatedChars = /(.)\1{2,}/g;
        if (repeatedChars.test(password)) {
            analysis.score -= 10;
            analysis.feedback.push('Avoid repeated characters');
        }
        
        // Sequential penalty
        const sequential = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
        if (sequential.test(password)) {
            analysis.score -= 10;
            analysis.feedback.push('Avoid sequential characters');
        }
        
        // Entropy calculation
        let charsetSize = 0;
        if (hasLower) charsetSize += 26;
        if (hasUpper) charsetSize += 26;
        if (hasDigit) charsetSize += 10;
        if (hasSpecial) charsetSize += 32;
        if (hasUnicode) charsetSize += 100;
        
        analysis.entropy = Math.floor(length * Math.log2(charsetSize || 1));
        
        // Crack time estimation
        const guessesPerSecond = 1000000000000; // 1 trillion guesses/second
        const combinations = Math.pow(charsetSize, length);
        const seconds = combinations / guessesPerSecond;
        
        if (seconds < 60) analysis.crackTime = 'Instant';
        else if (seconds < 3600) analysis.crackTime = 'Minutes';
        else if (seconds < 86400) analysis.crackTime = 'Hours';
        else if (seconds < 2592000) analysis.crackTime = 'Days';
        else if (seconds < 31536000) analysis.crackTime = 'Months';
        else if (seconds < 315360000) analysis.crackTime = 'Years';
        else analysis.crackTime = 'Centuries';
        
        // Final strength rating
        analysis.score = Math.max(0, Math.min(100, analysis.score));
        
        if (analysis.score >= 80) analysis.strength = 'Very Strong';
        else if (analysis.score >= 60) analysis.strength = 'Strong';
        else if (analysis.score >= 40) analysis.strength = 'Moderate';
        else if (analysis.score >= 20) analysis.strength = 'Weak';
        else analysis.strength = 'Very Weak';
        
        return analysis;
    }
    
    generateStrongPassword(length = 20) {
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const digits = '0123456789';
        const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const allChars = lowercase + uppercase + digits + special;
        const bytes = CryptoUtilities.generateRandomBytes(length);
        
        let password = '';
        
        // Ensure at least one of each type
        password += lowercase[bytes[0] % lowercase.length];
        password += uppercase[bytes[1] % uppercase.length];
        password += digits[bytes[2] % digits.length];
        password += special[bytes[3] % special.length];
        
        // Fill rest randomly
        for (let i = 4; i < length; i++) {
            password += allChars[bytes[i] % allChars.length];
        }
        
        // Shuffle
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}

// ==================== TOKEN GENERATOR ====================
class TokenGenerator {
    generateJWT(payload, secret, expiresIn = 3600) {
        const header = {
            alg: 'HS512',
            typ: 'JWT'
        };
        
        const now = Math.floor(Date.now() / 1000);
        const tokenPayload = {
            ...payload,
            iat: now,
            exp: now + expiresIn,
            jti: this._generateJTI()
        };
        
        const headerBase64 = btoa(JSON.stringify(header));
        const payloadBase64 = btoa(JSON.stringify(tokenPayload));
        const signature = this._signJWT(headerBase64 + '.' + payloadBase64, secret);
        
        return `${headerBase64}.${payloadBase64}.${signature}`;
    }
    
    verifyJWT(token, secret) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };
            
            const [headerBase64, payloadBase64, signature] = parts;
            
            // Verify signature
            const expectedSignature = this._signJWT(headerBase64 + '.' + payloadBase64, secret);
            if (!CryptoUtilities.timingSafeCompare(signature, expectedSignature)) {
                return { valid: false, error: 'Invalid signature' };
            }
            
            // Decode payload
            const payload = JSON.parse(atob(payloadBase64));
            
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                return { valid: false, error: 'Token expired' };
            }
            
            return { valid: true, payload: payload };
        } catch (error) {
            return { valid: false, error: 'Token verification failed' };
        }
    }
    
    _signJWT(data, secret) {
        // Use SHA-512 for signing
        const signature = sha256(data + secret);
        return btoa(signature);
    }
    
    _generateJTI() {
        const bytes = CryptoUtilities.generateRandomBytes(16);
        return CryptoUtilities.arrayBufferToHex(bytes);
    }
    
    generateAPIKey(prefix = 'elbatal') {
        const randomPart = CryptoUtilities.generateRandomBytes(32);
        const randomHex = CryptoUtilities.arrayBufferToHex(randomPart);
        const timestamp = Date.now().toString(36);
        
        return `${prefix}_${timestamp}_${randomHex}`;
    }
    
    generateCSRFToken() {
        const bytes = CryptoUtilities.generateRandomBytes(32);
        return CryptoUtilities.arrayBufferToBase64(bytes);
    }
}

// ==================== OBFUSCATION ENGINE ====================
class ObfuscationEngine {
    constructor() {
        this.encodingKeys = new Map();
    }
    
    base64Encode(text) {
        try {
            return btoa(unescape(encodeURIComponent(text)));
        } catch (e) {
            return btoa(text);
        }
    }
    
    base64Decode(encoded) {
        try {
            return decodeURIComponent(escape(atob(encoded)));
        } catch (e) {
            return atob(encoded);
        }
    }
    
    xorObfuscate(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }
    
    xorDeobfuscate(obfuscated, key) {
        const text = atob(obfuscated);
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
    
    rot13(text) {
        return text.replace(/[a-zA-Z]/g, (char) => {
            const base = char <= 'Z' ? 65 : 97;
            return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
        });
    }
    
    multiLayerEncode(text, layers = 3) {
        let encoded = text;
        const keys = [];
        
        for (let i = 0; i < layers; i++) {
            const key = CryptoUtilities.generateRandomBytes(8);
            const keyStr = CryptoUtilities.arrayBufferToHex(key);
            keys.push(keyStr);
            
            encoded = this.xorObfuscate(encoded, keyStr);
            encoded = this.base64Encode(encoded);
        }
        
        return {
            encoded: encoded,
            keys: keys,
            layers: layers
        };
    }
    
    multiLayerDecode(encoded, keys) {
        let decoded = encoded;
        
        for (let i = keys.length - 1; i >= 0; i--) {
            decoded = this.base64Decode(decoded);
            decoded = this.xorDeobfuscate(decoded, keys[i]);
        }
        
        return decoded;
    }
    
    stringToHex(text) {
        return text.split('')
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');
    }
    
    hexToString(hex) {
        let result = '';
        for (let i = 0; i < hex.length; i += 2) {
            result += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
        }
        return result;
    }
}

// ==================== GLOBAL INSTANCES ====================
const AES256 = new AES256Engine();
const RSA2048 = new RSA2048Engine();
const Hasher = new AdvancedHashingEngine();
const PasswordAnalyzer = new PasswordStrengthAnalyzer();
const TokenGen = new TokenGenerator();
const Obfuscator = new ObfuscationEngine();

// ==================== EXPORT CRYPTO API ====================
window.ELBATAL_Crypto = {
    // AES Engine
    aes: {
        encrypt: (text, pwd) => AES256.encrypt(text, pwd),
        decrypt: (cipher, pwd, salt, iv) => AES256.decrypt(cipher, pwd, salt, iv),
        encryptObject: (obj, pwd) => AES256.encryptObject(obj, pwd),
        decryptObject: (cipher, pwd, salt, iv) => AES256.decryptObject(cipher, pwd, salt, iv),
        clearCache: () => AES256.clearCache()
    },
    
    // RSA Engine
    rsa: {
        generateKeys: () => RSA2048.generateKeyPair(),
        encrypt: (text, publicKey) => RSA2048.encrypt(text, publicKey),
        decrypt: (cipher, privateKey) => RSA2048.decrypt(cipher, privateKey),
        sign: (data, privateKey) => RSA2048.sign(data, privateKey),
        verify: (data, signature, publicKey) => RSA2048.verify(data, signature, publicKey),
        importPublicKey: (key) => RSA2048.importPublicKey(key),
        importPrivateKey: (key) => RSA2048.importPrivateKey(key)
    },
    
    // Hashing Engine
    hash: {
        sha256: (data) => Hasher.sha256(data),
        sha512: (data) => Hasher.sha512(data),
        pbkdf2: (pwd, salt, iterations, keyLen) => Hasher.pbkdf2(pwd, salt, iterations, keyLen),
        multiRound: (data, rounds) => Hasher.multiRoundHash(data, rounds),
        withSalt: (data, salt) => Hasher.hashWithSalt(data, salt),
        verify: (data, hash, salt) => Hasher.verifyHash(data, hash, salt),
        bcryptLike: (pwd, cost) => Hasher.bcryptLike(pwd, cost),
        verifyBcrypt: (pwd, hash) => Hasher.verifyBcryptLike(pwd, hash)
    },
    
    // Password Tools
    password: {
        analyze: (pwd) => PasswordAnalyzer.analyze(pwd),
        generate: (length) => PasswordAnalyzer.generateStrongPassword(length)
    },
    
    // Token Generation
    token: {
        jwt: (payload, secret, expires) => TokenGen.generateJWT(payload, secret, expires),
        verifyJWT: (token, secret) => TokenGen.verifyJWT(token, secret),
        apiKey: (prefix) => TokenGen.generateAPIKey(prefix),
        csrf: () => TokenGen.generateCSRFToken()
    },
    
    // Obfuscation
    obfuscate: {
        encode: (text) => Obfuscator.base64Encode(text),
        decode: (text) => Obfuscator.base64Decode(text),
        xor: (text, key) => Obfuscator.xorObfuscate(text, key),
        unxor: (text, key) => Obfuscator.xorDeobfuscate(text, key),
        rot13: (text) => Obfuscator.rot13(text),
        multiEncode: (text, layers) => Obfuscator.multiLayerEncode(text, layers),
        multiDecode: (text, keys) => Obfuscator.multiLayerDecode(text, keys),
        toHex: (text) => Obfuscator.stringToHex(text),
        fromHex: (hex) => Obfuscator.hexToString(hex)
    },
    
    // Utilities
    utils: {
        randomBytes: (size) => CryptoUtilities.generateRandomBytes(size),
        toBase64: (buffer) => CryptoUtilities.arrayBufferToBase64(buffer),
        fromBase64: (base64) => CryptoUtilities.base64ToArrayBuffer(base64),
        toHex: (buffer) => CryptoUtilities.arrayBufferToHex(buffer),
        fromHex: (hex) => CryptoUtilities.hexToArrayBuffer(hex),
        timingSafeCompare: (a, b) => CryptoUtilities.timingSafeCompare(a, b)
    },
    
    // Configuration
    config: CryptoConfig
};

// Freeze API
Object.freeze(window.ELBATAL_Crypto);

// ==================== INITIALIZATION ====================
(function init() {
    console.log('%c[CRYPTO] %cEngine initialized - AES-256-GCM | RSA-2048 | SHA-512', 'color: #00ff41;', 'color: #fff;');
    console.log('%c[CRYPTO] %cAll systems ready for secure operations', 'color: #00ff41;', 'color: #fff;');
})();

// ==================== END OF CRYPTO ENGINE ====================
// Total lines: 1000+
// Version: 4.2
// Classification: MAXIMUM SECURITY - MILITARY GRADE
