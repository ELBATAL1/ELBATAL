
# File 6: effects.js (Visual Effects & Upload System)
effects_js = '''// === ELBATAL VISUAL EFFECTS ENGINE ===

// === MATRIX RAIN EFFECT ===
class MatrixRain {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?/~`';
        this.fontSize = 14;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
        this.drops = [];
        
        for (let i = 0; i < this.columns; i++) {
            this.drops[i] = Math.random() * -100;
        }
        
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.columns = Math.floor(this.canvas.width / this.fontSize);
    }
    
    animate() {
        this.ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#00ff41';
        this.ctx.font = this.fontSize + 'px monospace';
        
        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            const x = i * this.fontSize;
            const y = this.drops[i] * this.fontSize;
            
            // Random brightness
            const opacity = Math.random() * 0.5 + 0.5;
            this.ctx.fillStyle = `rgba(0, 255, 65, ${opacity})`;
            
            this.ctx.fillText(text, x, y);
            
            if (y > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }
            this.drops[i]++;
        }
        
        requestAnimationFrame(() => this.animate());
    }
}

// === TYPING EFFECT ===
class TypeWriter {
    constructor(elementId, text, speed = 50) {
        this.element = document.getElementById(elementId);
        if (!this.element) return;
        
        this.text = text;
        this.speed = speed;
        this.index = 0;
        this.type();
    }
    
    type() {
        if (this.index < this.text.length) {
            this.element.innerHTML += this.text.charAt(this.index);
            this.index++;
            setTimeout(() => this.type(), this.speed);
        }
    }
}

// === FILE UPLOAD SYSTEM ===
function initUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const fileInfo = document.getElementById('fileInfo');
    const filesTableBody = document.getElementById('filesTableBody');
    const fileCount = document.getElementById('fileCount');
    
    let uploadedFiles = [];
    
    if (!dropZone) return;
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
    
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            simulateUpload(file);
        });
    }
    
    function simulateUpload(file) {
        uploadProgress.style.display = 'block';
        fileInfo.textContent = `FILE: ${file.name} | SIZE: ${formatBytes(file.size)}`;
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    progressBar.style.width = '0%';
                    addFileToTable(file);
                }, 500);
            }
            
            progressBar.style.width = progress + '%';
            progressPercent.textContent = Math.floor(progress) + '%';
        }, 200);
    }
    
    function addFileToTable(file) {
        uploadedFiles.push(file);
        fileCount.textContent = `[${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}]`;
        
        // Remove empty state if exists
        const emptyRow = filesTableBody.querySelector('.empty-row');
        if (emptyRow) {
            emptyRow.remove();
        }
        
        const row = document.createElement('tr');
        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        row.innerHTML = `
            <td>${file.name}</td>
            <td>${formatBytes(file.size)}</td>
            <td>${file.type || 'UNKNOWN'}</td>
            <td><span class="file-status uploaded">UPLOADED</span></td>
            <td><button class="file-action" onclick="removeFile('${fileId}', this)">DELETE</button></td>
        `;
        row.id = fileId;
        
        filesTableBody.appendChild(row);
        
        // Flash effect
        row.style.background = 'rgba(0, 255, 65, 0.1)';
        setTimeout(() => {
            row.style.background = '';
            row.style.transition = 'background 0.5s';
        }, 300);
    }
    
    window.removeFile = function(fileId, btn) {
        const row = document.getElementById(fileId);
        if (row) {
            row.style.background = 'rgba(255, 0, 64, 0.2)';
            setTimeout(() => {
                row.remove();
                uploadedFiles = uploadedFiles.filter((_, i) => i !== uploadedFiles.length - 1);
                fileCount.textContent = `[${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}]`;
                
                if (uploadedFiles.length === 0) {
                    filesTableBody.innerHTML = `
                        <tr class="empty-row">
                            <td colspan="5">
                                <div class="empty-state">
                                    <span class="empty-icon">📭</span>
                                    <span>No files uploaded yet</span>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }, 300);
        }
    };
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Matrix Rain
    new MatrixRain('matrixCanvas');
    
    // Initialize typing effect on login page
    const typingText = document.getElementById('typing-text');
    if (typingText) {
        const messages = [
            'Initializing secure connection...',
            'Verifying encryption protocols...',
            'System ready. Awaiting credentials.'
        ];
        
        let msgIndex = 0;
        function typeNextMessage() {
            if (msgIndex < messages.length) {
                typingText.innerHTML += '> ' + messages[msgIndex] + '<br>';
                msgIndex++;
                setTimeout(typeNextMessage, 800);
            }
        }
        setTimeout(typeNextMessage, 500);
    }
    
    // Add random glitch effects to panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        setInterval(() => {
            if (Math.random() > 0.95) {
                panel.style.transform = 'translateX(2px)';
                setTimeout(() => {
                    panel.style.transform = '';
                }, 50);
            }
        }, 2000);
    });
    
    // Terminal cursor blink
    const miniTerminal = document.getElementById('miniTerminal');
    if (miniTerminal) {
        setInterval(() => {
            const blink = miniTerminal.querySelector('.blink');
            if (blink) {
                blink.style.opacity = blink.style.opacity === '0' ? '1' : '0';
            }
        }, 500);
    }
    
    // Random log entries
    const logsPanel = document.querySelector('.logs-panel .panel-body');
    if (logsPanel) {
        const logMessages = [
            { type: 'success', msg: 'Packet filter updated' },
            { type: 'info', msg: 'Background scan complete' },
            { type: 'warning', msg: 'Unusual traffic pattern detected' },
            { type: 'success', msg: 'SSL certificate renewed' },
            { type: 'info', msg: 'Database backup completed' }
        ];
        
        setInterval(() => {
            if (Math.random() > 0.7) {
                const log = logMessages[Math.floor(Math.random() * logMessages.length)];
                const time = new Date().toLocaleTimeString('en-US', { hour12: false });
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.innerHTML = `
                    <span class="log-time">[${time}]</span>
                    <span class="log-type ${log.type}">[${log.type.toUpperCase()}]</span>
                    <span class="log-msg">${log.msg}</span>
                `;
                logsPanel.insertBefore(entry, logsPanel.firstChild);
                
                // Keep only last 10 entries
                while (logsPanel.children.length > 10) {
                    logsPanel.removeChild(logsPanel.lastChild);
                }
            }
        }, 5000);
    }
});

// Console easter egg
console.log('%c ELBATAL SYSTEM ', 'background: #00ff41; color: #000; font-size: 20px; font-weight: bold;');
console.log('%c Unauthorized access is strictly prohibited. ', 'color: #ff0040; font-size: 12px;');
'''

with open(f"{project_dir}/effects.js", "w", encoding="utf-8") as f:
    f.write(effects_js)

print("✅ effects.js created")

# List all files
import os
files = os.listdir(project_dir)
print(f"\n📁 Project files in {project_dir}:")
for f in files:
    size = os.path.getsize(f"{project_dir}/{f}")
    print(f"   • {f} ({size:,} bytes)")
