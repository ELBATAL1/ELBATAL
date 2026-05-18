/**
 * ===================================================================
 *  ELBATAL UPLOAD & CONTENT MANAGEMENT SYSTEM v4.2
 *  File: upload.js
 *  Lines: 1000+
 *  Description: Advanced content upload, management & categorization
 * ===================================================================
 */

'use strict';

// ==================== CONTENT DATABASE ENGINE ====================
class ContentDatabaseEngine {
    constructor() {
        this.DB_VERSION = '4.2.0';
        this.STORAGE_KEY = 'elbatal_content_master_db';
        this.BACKUP_KEY = 'elbatal_content_backup';
        this.lastBackupTime = null;
        this.autoSaveInterval = null;
        
        // Initialize database structure
        this.database = {
            metadata: {
                version: this.DB_VERSION,
                created: Date.now(),
                lastModified: Date.now(),
                totalItems: 0,
                categories: {}
            },
            categories: {
                tools: {
                    name: 'Security Tools',
                    icon: '🛠️',
                    description: 'Penetration testing and security auditing tools',
                    image: 'https://i.imgur.com/8KM7QbT.jpg',
                    items: [],
                    tags: ['scanner', 'exploit', 'network', 'web', 'password', 'forensic']
                },
                courses: {
                    name: 'Training Courses',
                    icon: '📚',
                    description: 'Educational courses and training materials',
                    image: 'https://i.imgur.com/LmNoPqR.jpg',
                    items: [],
                    tags: ['beginner', 'advanced', 'certification', 'practical', 'theory']
                },
                books: {
                    name: 'Digital Library',
                    icon: '📖',
                    description: 'Security books and reference materials',
                    image: 'https://i.imgur.com/OpQrStU.jpg',
                    items: [],
                    tags: ['web', 'network', 'malware', 'crypto', 'forensic', 'programming']
                },
                apps: {
                    name: 'Applications',
                    icon: '📱',
                    description: 'Mobile and desktop security applications',
                    image: 'https://i.imgur.com/JkLmNoP.jpg',
                    items: [],
                    tags: ['android', 'ios', 'windows', 'linux', 'macos']
                },
                info: {
                    name: 'Information Database',
                    icon: 'ℹ️',
                    description: 'Knowledge base and reference information',
                    image: 'https://i.imgur.com/EfGhIjKl.jpg',
                    items: [],
                    tags: ['cve', 'exploit', 'research', 'news', 'technique']
                }
            },
            trash: {
                items: [],
                maxTrashSize: 50
            },
            statistics: {
                totalUploads: 0,
                totalDownloads: 0,
                totalViews: 0,
                lastUploadDate: null,
                popularItems: [],
                recentlyAdded: []
            }
        };
        
        this._loadDatabase();
        this._startAutoSave();
    }
    
    // ==================== DATABASE PERSISTENCE ====================
    _loadDatabase() {
        try {
            if (typeof SecureStorage !== 'undefined') {
                const saved = SecureStorage.secureGet(this.STORAGE_KEY, true);
                if (saved && saved.metadata && saved.metadata.version) {
                    this.database = this._migrateDatabase(saved);
                    console.log('%c[DB] %cDatabase loaded successfully', 'color: #00ff41;', 'color: #fff;');
                }
            } else {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    this.database = this._migrateDatabase(parsed);
                }
            }
        } catch (e) {
            console.error('[DB] Load failed:', e.message);
            this._createBackup();
        }
    }
    
    _saveDatabase() {
        try {
            this.database.metadata.lastModified = Date.now();
            this.database.metadata.totalItems = this._calculateTotalItems();
            
            if (typeof SecureStorage !== 'undefined') {
                SecureStorage.secureSet(this.STORAGE_KEY, this.database, true);
            } else {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.database));
            }
            
            // Update backup periodically
            if (!this.lastBackupTime || Date.now() - this.lastBackupTime > 3600000) {
                this._createBackup();
            }
        } catch (e) {
            console.error('[DB] Save failed:', e.message);
        }
    }
    
    _startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this._saveDatabase();
        }, 30000); // Auto-save every 30 seconds
    }
    
    _createBackup() {
        try {
            const backup = {
                database: this.database,
                timestamp: Date.now(),
                version: this.DB_VERSION
            };
            
            if (typeof SecureStorage !== 'undefined') {
                SecureStorage.secureSet(this.BACKUP_KEY, backup, true);
            } else {
                localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
            }
            
            this.lastBackupTime = Date.now();
        } catch (e) {
            console.error('[DB] Backup failed:', e.message);
        }
    }
    
    _restoreFromBackup() {
        try {
            let backup;
            if (typeof SecureStorage !== 'undefined') {
                backup = SecureStorage.secureGet(this.BACKUP_KEY, true);
            } else {
                backup = JSON.parse(localStorage.getItem(this.BACKUP_KEY));
            }
            
            if (backup && backup.database) {
                this.database = this._migrateDatabase(backup.database);
                this._saveDatabase();
                return true;
            }
        } catch (e) {
            console.error('[DB] Restore failed:', e.message);
        }
        return false;
    }
    
    _migrateDatabase(oldDb) {
        // Handle database migrations between versions
        if (!oldDb.metadata) {
            oldDb.metadata = {
                version: '1.0.0',
                created: Date.now(),
                lastModified: Date.now(),
                totalItems: 0,
                categories: {}
            };
        }
        
        // Ensure all categories exist
        const requiredCategories = ['tools', 'courses', 'books', 'apps', 'info'];
        requiredCategories.forEach(cat => {
            if (!oldDb.categories[cat]) {
                oldDb.categories[cat] = this.database.categories[cat];
            }
            if (!oldDb.categories[cat].items) {
                oldDb.categories[cat].items = [];
            }
        });
        
        // Ensure trash exists
        if (!oldDb.trash) {
            oldDb.trash = { items: [], maxTrashSize: 50 };
        }
        
        // Ensure statistics exist
        if (!oldDb.statistics) {
            oldDb.statistics = this.database.statistics;
        }
        
        return oldDb;
    }
    
    _calculateTotalItems() {
        let total = 0;
        const cats = this.database.categories;
        for (const cat in cats) {
            if (cats[cat].items) {
                total += cats[cat].items.length;
            }
        }
        return total;
    }
    
    // ==================== CRUD OPERATIONS ====================
    addItem(category, itemData) {
        return new Promise((resolve, reject) => {
            try {
                // Validate category
                if (!this.database.categories[category]) {
                    reject(new Error(`Invalid category: ${category}`));
                    return;
                }
                
                // Validate item data
                const validation = this._validateItem(itemData);
                if (!validation.valid) {
                    reject(new Error(validation.error));
                    return;
                }
                
                // Sanitize item data
                const sanitized = this._sanitizeItem(itemData);
                
                // Generate unique ID
                sanitized.id = this._generateItemId();
                
                // Add metadata
                sanitized.metadata = {
                    created: Date.now(),
                    modified: Date.now(),
                    version: 1,
                    author: 'ELBATAL1',
                    status: 'active',
                    views: 0,
                    downloads: 0,
                    rating: 0
                };
                
                // Add encryption flag for sensitive items
                if (sanitized.sensitive) {
                    sanitized.encrypted = true;
                    sanitized.data = this._encryptSensitiveData(sanitized.data || '');
                }
                
                // Add to category
                this.database.categories[category].items.unshift(sanitized);
                
                // Update statistics
                this.database.statistics.totalUploads++;
                this.database.statistics.lastUploadDate = Date.now();
                this.database.statistics.recentlyAdded.unshift({
                    id: sanitized.id,
                    title: sanitized.title,
                    category: category,
                    timestamp: Date.now()
                });
                
                // Keep only last 20 recent items
                if (this.database.statistics.recentlyAdded.length > 20) {
                    this.database.statistics.recentlyAdded = 
                        this.database.statistics.recentlyAdded.slice(0, 20);
                }
                
                // Save database
                this._saveDatabase();
                
                // Log
                this._logActivity('ITEM_ADDED', {
                    id: sanitized.id,
                    category: category,
                    title: sanitized.title
                });
                
                resolve({
                    success: true,
                    item: sanitized,
                    message: `Item "${sanitized.title}" added successfully to ${category}`
                });
                
            } catch (e) {
                reject(new Error(`Failed to add item: ${e.message}`));
            }
        });
    }
    
    updateItem(category, itemId, updates) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.database.categories[category]) {
                    reject(new Error(`Invalid category: ${category}`));
                    return;
                }
                
                const items = this.database.categories[category].items;
                const index = items.findIndex(item => item.id === itemId);
                
                if (index === -1) {
                    reject(new Error(`Item not found: ${itemId}`));
                    return;
                }
                
                // Validate updates
                const validation = this._validateItem(updates, true);
                if (!validation.valid) {
                    reject(new Error(validation.error));
                    return;
                }
                
                // Apply updates
                const sanitized = this._sanitizeItem(updates);
                const existingItem = items[index];
                
                items[index] = {
                    ...existingItem,
                    ...sanitized,
                    id: itemId, // Preserve ID
                    metadata: {
                        ...existingItem.metadata,
                        modified: Date.now(),
                        version: (existingItem.metadata.version || 1) + 1
                    }
                };
                
                this._saveDatabase();
                
                this._logActivity('ITEM_UPDATED', {
                    id: itemId,
                    category: category,
                    title: items[index].title
                });
                
                resolve({
                    success: true,
                    item: items[index],
                    message: `Item "${items[index].title}" updated successfully`
                });
                
            } catch (e) {
                reject(new Error(`Failed to update item: ${e.message}`));
            }
        });
    }
    
    deleteItem(category, itemId, permanent = false) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.database.categories[category]) {
                    reject(new Error(`Invalid category: ${category}`));
                    return;
                }
                
                const items = this.database.categories[category].items;
                const index = items.findIndex(item => item.id === itemId);
                
                if (index === -1) {
                    reject(new Error(`Item not found: ${itemId}`));
                    return;
                }
                
                const deletedItem = items[index];
                
                if (permanent) {
                    // Permanent delete
                    items.splice(index, 1);
                    this._logActivity('ITEM_PERMANENTLY_DELETED', {
                        id: itemId,
                        category: category,
                        title: deletedItem.title
                    });
                } else {
                    // Move to trash
                    deletedItem.metadata = deletedItem.metadata || {};
                    deletedItem.metadata.deletedFrom = category;
                    deletedItem.metadata.deletedAt = Date.now();
                    deletedItem.metadata.originalCategory = category;
                    
                    this.database.trash.items.unshift(deletedItem);
                    
                    // Limit trash size
                    if (this.database.trash.items.length > this.database.trash.maxTrashSize) {
                        this.database.trash.items = 
                            this.database.trash.items.slice(0, this.database.trash.maxTrashSize);
                    }
                    
                    items.splice(index, 1);
                    
                    this._logActivity('ITEM_MOVED_TO_TRASH', {
                        id: itemId,
                        category: category,
                        title: deletedItem.title
                    });
                }
                
                this._saveDatabase();
                
                resolve({
                    success: true,
                    item: deletedItem,
                    permanent: permanent,
                    message: permanent ? 
                        `Item permanently deleted` : 
                        `Item moved to trash`
                });
                
            } catch (e) {
                reject(new Error(`Failed to delete item: ${e.message}`));
            }
        });
    }
    
    restoreFromTrash(itemId) {
        return new Promise((resolve, reject) => {
            try {
                const trashItems = this.database.trash.items;
                const index = trashItems.findIndex(item => item.id === itemId);
                
                if (index === -1) {
                    reject(new Error('Item not found in trash'));
                    return;
                }
                
                const item = trashItems[index];
                const originalCategory = item.metadata.originalCategory || 'tools';
                
                // Remove from trash
                trashItems.splice(index, 1);
                
                // Restore to original category
                if (this.database.categories[originalCategory]) {
                    delete item.metadata.deletedFrom;
                    delete item.metadata.deletedAt;
                    delete item.metadata.originalCategory;
                    
                    this.database.categories[originalCategory].items.unshift(item);
                    
                    this._saveDatabase();
                    this._logActivity('ITEM_RESTORED', {
                        id: itemId,
                        category: originalCategory,
                        title: item.title
                    });
                    
                    resolve({
                        success: true,
                        item: item,
                        category: originalCategory,
                        message: `Item restored to ${originalCategory}`
                    });
                } else {
                    reject(new Error('Original category no longer exists'));
                }
                
            } catch (e) {
                reject(new Error(`Failed to restore item: ${e.message}`));
            }
        });
    }
    
    getItem(category, itemId) {
        if (!this.database.categories[category]) return null;
        return this.database.categories[category].items.find(item => item.id === itemId) || null;
    }
    
    getAllItems(category = null) {
        if (category) {
            return this.database.categories[category]?.items || [];
        }
        
        const allItems = [];
        for (const cat in this.database.categories) {
            allItems.push(...this.database.categories[cat].items);
        }
        return allItems;
    }
    
    searchItems(query, category = null) {
        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        const results = [];
        
        const categoriesToSearch = category ? 
            [category] : 
            Object.keys(this.database.categories);
        
        categoriesToSearch.forEach(cat => {
            if (!this.database.categories[cat]) return;
            
            this.database.categories[cat].items.forEach(item => {
                const searchableText = [
                    item.title || '',
                    item.description || '',
                    item.tags?.join(' ') || '',
                    item.category || '',
                    cat
                ].join(' ').toLowerCase();
                
                const matchScore = searchTerms.reduce((score, term) => {
                    return score + (searchableText.includes(term) ? 1 : 0);
                }, 0);
                
                if (matchScore > 0) {
                    results.push({
                        ...item,
                        _searchScore: matchScore,
                        _category: cat
                    });
                }
            });
        });
        
        // Sort by relevance
        results.sort((a, b) => b._searchScore - a._searchScore);
        
        return results;
    }
    
    // ==================== VALIDATION & SANITIZATION ====================
    _validateItem(data, isUpdate = false) {
        const errors = [];
        
        if (!isUpdate) {
            if (!data.title || data.title.trim().length === 0) {
                errors.push('Title is required');
            }
            if (data.title && data.title.length > 200) {
                errors.push('Title must be less than 200 characters');
            }
        }
        
        if (data.title && data.title.trim().length === 0 && isUpdate) {
            errors.push('Title cannot be empty');
        }
        
        if (data.description && data.description.length > 5000) {
            errors.push('Description must be less than 5000 characters');
        }
        
        if (data.image && !this._isValidURL(data.image)) {
            errors.push('Invalid image URL');
        }
        
        if (data.link && !this._isValidURL(data.link)) {
            errors.push('Invalid link URL');
        }
        
        if (data.tags && !Array.isArray(data.tags)) {
            errors.push('Tags must be an array');
        }
        
        return {
            valid: errors.length === 0,
            error: errors.join('; ')
        };
    }
    
    _sanitizeItem(data) {
        const sanitized = {};
        
        if (data.title) {
            sanitized.title = this._sanitizeText(data.title, 200);
        }
        
        if (data.description) {
            sanitized.description = this._sanitizeText(data.description, 5000);
        }
        
        if (data.image) {
            sanitized.image = this._sanitizeURL(data.image);
        }
        
        if (data.link) {
            sanitized.link = this._sanitizeURL(data.link);
        }
        
        if (data.tags) {
            sanitized.tags = data.tags.map(tag => 
                this._sanitizeText(tag, 50).toLowerCase()
            ).filter(tag => tag.length > 0);
        }
        
        if (data.sensitive !== undefined) {
            sanitized.sensitive = Boolean(data.sensitive);
        }
        
        if (data.data !== undefined) {
            sanitized.data = data.data;
        }
        
        if (data.category) {
            sanitized.category = this._sanitizeText(data.category, 50);
        }
        
        return sanitized;
    }
    
    _sanitizeText(text, maxLength = 500) {
        if (!text) return '';
        let cleaned = String(text)
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>{}]/g, '')   // Remove potentially dangerous characters
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
        
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength);
        }
        
        return cleaned;
    }
    
    _sanitizeURL(url) {
        if (!url) return '';
        let cleaned = String(url).trim();
        
        // Only allow http, https, and relative URLs
        if (!/^(https?:\/\/|\/|\.\/|#)/i.test(cleaned)) {
            cleaned = 'https://' + cleaned;
        }
        
        // Remove potentially dangerous characters
        cleaned = cleaned.replace(/[<>"']/g, '');
        
        return cleaned;
    }
    
    _isValidURL(url) {
        if (!url) return true; // Optional field
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch (e) {
            return /^(\/|\.\/|#)/.test(url);
        }
    }
    
    _generateItemId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        const hash = sha256 ? sha256(timestamp + random).substring(0, 8) : random;
        return `item_${timestamp}_${hash}`;
    }
    
    _encryptSensitiveData(data) {
        try {
            if (typeof CryptoJS !== 'undefined') {
                return CryptoJS.AES.encrypt(
                    JSON.stringify(data),
                    'ELBATAL_SENSITIVE_DATA_KEY'
                ).toString();
            }
        } catch (e) {}
        return data;
    }
    
    _decryptSensitiveData(encryptedData) {
        try {
            if (typeof CryptoJS !== 'undefined') {
                const bytes = CryptoJS.AES.decrypt(
                    encryptedData,
                    'ELBATAL_SENSITIVE_DATA_KEY'
                );
                return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            }
        } catch (e) {}
        return encryptedData;
    }
    
    _logActivity(action, details) {
        const logEntry = {
            timestamp: Date.now(),
            action: action,
            details: details
        };
        
        // Store in session for monitoring
        try {
            const activityLog = JSON.parse(sessionStorage.getItem('elbatal_activity_log') || '[]');
            activityLog.push(logEntry);
            if (activityLog.length > 100) {
                activityLog.shift();
            }
            sessionStorage.setItem('elbatal_activity_log', JSON.stringify(activityLog));
        } catch (e) {}
        
        // If SecurityManager is available, log there too
        if (typeof SecurityManager !== 'undefined') {
            SecurityManager._logSecurityEvent('DB_' + action, JSON.stringify(details));
        }
    }
    
    // ==================== BULK OPERATIONS ====================
    bulkImport(category, items) {
        return new Promise((resolve, reject) => {
            const results = {
                success: [],
                failed: [],
                total: items.length
            };
            
            const promises = items.map(item => 
                this.addItem(category, item)
                    .then(result => results.success.push(result))
                    .catch(error => results.failed.push({ item, error: error.message }))
            );
            
            Promise.all(promises).then(() => {
                this._saveDatabase();
                resolve(results);
            });
        });
    }
    
    bulkDelete(category, itemIds) {
        return new Promise((resolve, reject) => {
            const results = {
                success: [],
                failed: [],
                total: itemIds.length
            };
            
            const promises = itemIds.map(id =>
                this.deleteItem(category, id)
                    .then(result => results.success.push(result))
                    .catch(error => results.failed.push({ id, error: error.message }))
            );
            
            Promise.all(promises).then(() => {
                this._saveDatabase();
                resolve(results);
            });
        });
    }
    
    exportDatabase(format = 'json') {
        const exportData = {
            version: this.DB_VERSION,
            exportedAt: Date.now(),
            database: this.database
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'base64':
                return btoa(JSON.stringify(exportData));
            case 'encrypted':
                if (typeof CryptoJS !== 'undefined') {
                    return CryptoJS.AES.encrypt(
                        JSON.stringify(exportData),
                        'ELBATAL_EXPORT_KEY'
                    ).toString();
                }
                return JSON.stringify(exportData);
            default:
                return JSON.stringify(exportData);
        }
    }
    
    importDatabase(data, format = 'json') {
        return new Promise((resolve, reject) => {
            try {
                let parsed;
                
                switch (format) {
                    case 'json':
                        parsed = JSON.parse(data);
                        break;
                    case 'base64':
                        parsed = JSON.parse(atob(data));
                        break;
                    case 'encrypted':
                        if (typeof CryptoJS !== 'undefined') {
                            const bytes = CryptoJS.AES.decrypt(data, 'ELBATAL_EXPORT_KEY');
                            parsed = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                        } else {
                            reject(new Error('CryptoJS not available'));
                            return;
                        }
                        break;
                    default:
                        parsed = JSON.parse(data);
                }
                
                if (parsed && parsed.database) {
                    this.database = this._migrateDatabase(parsed.database);
                    this._saveDatabase();
                    resolve({
                        success: true,
                        message: 'Database imported successfully',
                        itemsCount: this._calculateTotalItems()
                    });
                } else {
                    reject(new Error('Invalid database format'));
                }
                
            } catch (e) {
                reject(new Error(`Import failed: ${e.message}`));
            }
        });
    }
    
    // ==================== STATISTICS & REPORTING ====================
    getStatistics() {
        const stats = {
            overview: {
                totalItems: this._calculateTotalItems(),
                totalCategories: Object.keys(this.database.categories).length,
                databaseVersion: this.DB_VERSION,
                lastModified: this.database.metadata.lastModified,
                lastBackup: this.lastBackupTime
            },
            byCategory: {},
            recentActivity: [],
            storageInfo: this._getStorageInfo()
        };
        
        // Per category stats
        for (const cat in this.database.categories) {
            stats.byCategory[cat] = {
                name: this.database.categories[cat].name,
                itemCount: this.database.categories[cat].items.length,
                tags: this.database.categories[cat].tags || [],
                newestItem: this.database.categories[cat].items[0]?.title || 'N/A',
                oldestItem: this.database.categories[cat].items[
                    this.database.categories[cat].items.length - 1
                ]?.title || 'N/A'
            };
        }
        
        // Trash stats
        stats.trash = {
            itemCount: this.database.trash.items.length,
            maxSize: this.database.trash.maxTrashSize
        };
        
        return stats;
    }
    
    _getStorageInfo() {
        try {
            let usedBytes = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('elbatal_')) {
                    usedBytes += localStorage.getItem(key).length * 2; // UTF-16
                }
            }
            
            const totalBytes = 5 * 1024 * 1024; // ~5MB typical limit
            const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
            const percentUsed = ((usedBytes / totalBytes) * 100).toFixed(1);
            
            return {
                usedBytes: usedBytes,
                usedMB: usedMB,
                percentUsed: percentUsed,
                estimatedLimit: '5MB'
            };
        } catch (e) {
            return { error: 'Unable to calculate storage info' };
        }
    }
    
    // ==================== MAINTENANCE ====================
    optimizeDatabase() {
        // Remove duplicate items
        const seen = new Set();
        for (const cat in this.database.categories) {
            this.database.categories[cat].items = 
                this.database.categories[cat].items.filter(item => {
                    const key = item.id || item.title;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }
        
        // Clean old trash items
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.database.trash.items = this.database.trash.items.filter(item => {
            return (item.metadata?.deletedAt || 0) > thirtyDaysAgo;
        });
        
        this._saveDatabase();
        return { success: true, message: 'Database optimized' };
    }
    
    clearTrash() {
        const clearedCount = this.database.trash.items.length;
        this.database.trash.items = [];
        this._saveDatabase();
        return {
            success: true,
            message: `Cleared ${clearedCount} items from trash`,
            count: clearedCount
        };
    }
    
    resetDatabase() {
        return new Promise((resolve) => {
            // Create backup before reset
            this._createBackup();
            
            // Reset to defaults
            this.database = {
                metadata: {
                    version: this.DB_VERSION,
                    created: Date.now(),
                    lastModified: Date.now(),
                    totalItems: 0,
                    categories: {}
                },
                categories: {
                    tools: { name: 'Security Tools', icon: '🛠️', items: [], tags: [] },
                    courses: { name: 'Training Courses', icon: '📚', items: [], tags: [] },
                    books: { name: 'Digital Library', icon: '📖', items: [], tags: [] },
                    apps: { name: 'Applications', icon: '📱', items: [], tags: [] },
                    info: { name: 'Information Database', icon: 'ℹ️', items: [], tags: [] }
                },
                trash: { items: [], maxTrashSize: 50 },
                statistics: {
                    totalUploads: 0,
                    totalDownloads: 0,
                    totalViews: 0,
                    lastUploadDate: null,
                    popularItems: [],
                    recentlyAdded: []
                }
            };
            
            this._saveDatabase();
            resolve({ success: true, message: 'Database reset to defaults' });
        });
    }
    
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this._saveDatabase(); // Final save
    }
}

// ==================== UPLOAD MANAGER CLASS ====================
class UploadManager {
    constructor() {
        this.db = new ContentDatabaseEngine();
        this.uploadQueue = [];
        this.isProcessing = false;
        this.maxConcurrent = 3;
        this.activeUploads = 0;
        this.uploadHistory = [];
        
        this._loadUploadHistory();
    }
    
    async uploadItem(category, itemData, fileData = null) {
        return new Promise((resolve, reject) => {
            // Add to queue
            const uploadTask = {
                id: this._generateUploadId(),
                category: category,
                itemData: itemData,
                fileData: fileData,
                status: 'queued',
                addedAt: Date.now(),
                startedAt: null,
                completedAt: null,
                progress: 0,
                result: null,
                error: null
            };
            
            this.uploadQueue.push(uploadTask);
            this._saveUploadHistory();
            
            // Process queue
            this._processQueue();
            
            // Wait for this specific task
            const checkInterval = setInterval(() => {
                if (uploadTask.status === 'completed') {
                    clearInterval(checkInterval);
                    resolve(uploadTask.result);
                } else if (uploadTask.status === 'failed') {
                    clearInterval(checkInterval);
                    reject(new Error(uploadTask.error));
                }
            }, 200);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (uploadTask.status === 'queued' || uploadTask.status === 'uploading') {
                    uploadTask.status = 'failed';
                    uploadTask.error = 'Upload timeout';
                    clearInterval(checkInterval);
                    reject(new Error('Upload timeout'));
                }
            }, 30000);
        });
    }
    
    async _processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        while (this.uploadQueue.some(task => task.status === 'queued')) {
            if (this.activeUploads >= this.maxConcurrent) {
                await this._delay(500);
                continue;
            }
            
            const task = this.uploadQueue.find(t => t.status === 'queued');
            if (!task) break;
            
            this.activeUploads++;
            task.status = 'uploading';
            task.startedAt = Date.now();
            
            try {
                // Simulate file processing if file data present
                if (task.fileData) {
                    await this._processFile(task);
                }
                
                // Add item to database
                const result = await this.db.addItem(task.category, task.itemData);
                
                task.status = 'completed';
                task.completedAt = Date.now();
                task.progress = 100;
                task.result = result;
                
            } catch (error) {
                task.status = 'failed';
                task.error = error.message;
            } finally {
                this.activeUploads--;
                this._saveUploadHistory();
            }
        }
        
        this.isProcessing = false;
    }
    
    async _processFile(task) {
        // Simulate file upload with progress
        for (let i = 0; i <= 10; i++) {
            await this._delay(200);
            task.progress = i * 10;
        }
        
        // Validate file
        if (task.fileData.size > 50 * 1024 * 1024) { // 50MB limit
            throw new Error('File too large (max 50MB)');
        }
        
        // Check file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/zip', 'application/x-rar-compressed',
            'text/plain', 'text/html', 'application/json'
        ];
        
        if (task.fileData.type && !allowedTypes.includes(task.fileData.type)) {
            throw new Error(`File type not allowed: ${task.fileData.type}`);
        }
        
        // Process file (in real app, would upload to server)
        task.itemData.fileInfo = {
            name: task.fileData.name,
            size: task.fileData.size,
            type: task.fileData.type,
            uploadedAt: Date.now()
        };
    }
    
    _generateUploadId() {
        return 'upload_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    }
    
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    _loadUploadHistory() {
        try {
            const saved = sessionStorage.getItem('elbatal_upload_history');
            if (saved) {
                this.uploadHistory = JSON.parse(saved);
            }
        } catch (e) {}
    }
    
    _saveUploadHistory() {
        try {
            const historyToSave = this.uploadQueue.slice(-50);
            sessionStorage.setItem('elbatal_upload_history', JSON.stringify(historyToSave));
        } catch (e) {}
    }
    
    getUploadStatus(uploadId) {
        return this.uploadQueue.find(task => task.id === uploadId) || null;
    }
    
    getQueueStats() {
        return {
            total: this.uploadQueue.length,
            queued: this.uploadQueue.filter(t => t.status === 'queued').length,
            uploading: this.uploadQueue.filter(t => t.status === 'uploading').length,
            completed: this.uploadQueue.filter(t => t.status === 'completed').length,
            failed: this.uploadQueue.filter(t => t.status === 'failed').length,
            activeUploads: this.activeUploads
        };
    }
    
    cancelUpload(uploadId) {
        const task = this.uploadQueue.find(t => t.id === uploadId);
        if (task && task.status === 'queued') {
            task.status = 'cancelled';
            return true;
        }
        return false;
    }
    
    clearCompleted() {
        this.uploadQueue = this.uploadQueue.filter(
            t => t.status === 'queued' || t.status === 'uploading'
        );
        this._saveUploadHistory();
    }
}

// ==================== FILE HANDLER ====================
class FileHandler {
    constructor() {
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        this.allowedDocTypes = ['application/pdf', 'text/plain', 'application/zip'];
        this.maxImageSize = 10 * 1024 * 1024; // 10MB
        this.maxDocSize = 50 * 1024 * 1024; // 50MB
    }
    
    validateFile(file, type = 'image') {
        const errors = [];
        
        if (!file) {
            errors.push('No file provided');
            return { valid: false, errors };
        }
        
        // Check size
        const maxSize = type === 'image' ? this.maxImageSize : this.maxDocSize;
        if (file.size > maxSize) {
            errors.push(`File too large (max ${maxSize / 1024 / 1024}MB)`);
        }
        
        // Check type
        const allowedTypes = type === 'image' ? this.allowedImageTypes : this.allowedDocTypes;
        if (file.type && !allowedTypes.includes(file.type)) {
            errors.push(`File type not allowed: ${file.type}`);
        }
        
        // Check name
        if (file.name && file.name.length > 255) {
            errors.push('File name too long');
        }
        
        // Check for dangerous extensions
        const dangerousExtensions = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.vbs', '.js', '.php'];
        const fileExt = '.' + (file.name || '').split('.').pop()?.toLowerCase();
        if (dangerousExtensions.includes(fileExt)) {
            errors.push('File type not allowed for security reasons');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
    
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    async compressImage(file, quality = 0.8) {
        return new Promise((resolve, reject) => {
            if (!file.type || !file.type.startsWith('image/')) {
                resolve(file); // Not an image, return as-is
                return;
            }
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                // Max dimensions
                const maxWidth = 1200;
                const maxHeight = 1200;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            
            img.onerror = () => resolve(file);
            
            const url = URL.createObjectURL(file);
            img.src = url;
        });
    }
    
    generateThumbnail(file) {
        return new Promise((resolve, reject) => {
            if (!file.type || !file.type.startsWith('image/')) {
                resolve(null);
                return;
            }
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                const thumbSize = 200;
                canvas.width = thumbSize;
                canvas.height = thumbSize;
                
                // Center crop
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, thumbSize, thumbSize);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            
            img.onerror = () => resolve(null);
            
            const url = URL.createObjectURL(file);
            img.src = url;
        });
    }
}

// ==================== DRAG & DROP UPLOAD HANDLER ====================
class DragDropHandler {
    constructor(dropZoneSelector, onFileDropped) {
        this.dropZone = document.querySelector(dropZoneSelector);
        this.onFileDropped = onFileDropped;
        this.fileHandler = new FileHandler();
        
        if (this.dropZone) {
            this._initialize();
        }
    }
    
    _initialize() {
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });
        
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
        });
        
        this.dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            
            for (const file of files) {
                const validation = this.fileHandler.validateFile(file, 'image');
                if (validation.valid) {
                    const compressed = await this.fileHandler.compressImage(file);
                    const thumbnail = await this.fileHandler.generateThumbnail(compressed);
                    
                    if (this.onFileDropped) {
                        this.onFileDropped({
                            file: compressed,
                            thumbnail: thumbnail,
                            name: file.name,
                            size: file.size,
                            type: file.type
                        });
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast(validation.errors.join(', '), 'error');
                    }
                }
            }
        });
    }
    
    destroy() {
        // Remove event listeners if needed
    }
}

// ==================== GLOBAL INSTANCES ====================
const ContentDB = new ContentDatabaseEngine();
const UploadMgr = new UploadManager();
const FileProcessor = new FileHandler();

// ==================== EXPORT UPLOAD API ====================
window.ELBATAL_Upload = {
    // Core systems
    db: ContentDB,
    uploader: UploadMgr,
    files: FileProcessor,
    
    // Quick upload function
    quickUpload: async (category, title, description, image = '', link = '') => {
        return UploadMgr.uploadItem(category, {
            title: title,
            description: description,
            image: image || 'https://i.imgur.com/FQH0LqG.png',
            link: link,
            tags: []
        });
    },
    
    // Get all items
    getAllItems: (category = null) => ContentDB.getAllItems(category),
    
    // Search
    search: (query, category = null) => ContentDB.searchItems(query, category),
    
    // Statistics
    getStats: () => ContentDB.getStatistics(),
    
    // Maintenance
    optimize: () => ContentDB.optimizeDatabase(),
    clearTrash: () => ContentDB.clearTrash(),
    
    // Import/Export
    exportDB: (format = 'json') => ContentDB.exportDatabase(format),
    importDB: (data, format = 'json') => ContentDB.importDatabase(data, format),
    
    // Queue management
    getQueueStats: () => UploadMgr.getQueueStats(),
    clearCompleted: () => UploadMgr.clearCompleted()
};

Object.freeze(window.ELBATAL_Upload);

// ==================== INITIALIZATION ====================
(function init() {
    console.log('%c[UPLOAD] %cContent management system ready', 'color: #00ff41;', 'color: #fff;');
    
    // Auto-load default content if database is empty
    const totalItems = ContentDB._calculateTotalItems();
    if (totalItems === 0) {
        console.log('%c[UPLOAD] %cEmpty database, loading defaults...', 'color: #ffcc00;', 'color: #fff;');
        loadDefaultContent();
    }
})();

// ==================== DEFAULT CONTENT LOADER ====================
function loadDefaultContent() {
    const defaults = {
        tools: [
            { title: 'Nmap Scanner', description: 'Advanced network discovery and security auditing tool. Perfect for network inventory and vulnerability detection.', image: 'https://i.imgur.com/8KM7QbT.jpg', tags: ['scanner', 'network', 'reconnaissance'] },
            { title: 'Metasploit Framework', description: 'World\'s most used penetration testing framework. Exploit development and vulnerability validation platform.', image: 'https://i.imgur.com/JbLqTpX.jpg', tags: ['exploit', 'framework', 'pentest'] },
            { title: 'Wireshark Analyzer', description: 'Network protocol analyzer for Unix and Windows. Capture and interactively br
