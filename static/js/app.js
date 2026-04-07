/* ==========================================
   COGNILOCK — FRONTEND APPLICATION
   ========================================== */

// ---- State ----
let selectedFile = null;
let sampleMode = null;

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initNeuralBackground();
    initHeroEEG();
    initUploadZone();
    initScrollReveal();
    initCountUp();
});

// ==========================================
// NAVIGATION
// ==========================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

function scrollToDemo() {
    document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

function scrollTo(selector) {
    document.querySelector(selector).scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// NEURAL BACKGROUND (Particles + Connections)
// ==========================================
function initNeuralBackground() {
    const canvas = document.getElementById('neural-bg');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 150;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.4 + 0.1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// HERO EEG CANVAS (Animated Brain Waves)
// ==========================================
function initHeroEEG() {
    const canvas = document.getElementById('eeg-hero-canvas');
    const ctx = canvas.getContext('2d');
    let animFrame;
    let time = 0;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    const channels = [
        { name: 'P4', color: '#00f0ff', freq: 0.015, amp: 25, offset: 0 },
        { name: 'Cz', color: '#7b2ff7', freq: 0.022, amp: 20, offset: Math.PI * 0.5 },
        { name: 'F8', color: '#ff6b6b', freq: 0.018, amp: 22, offset: Math.PI },
        { name: 'T7', color: '#ffd93d', freq: 0.025, amp: 18, offset: Math.PI * 1.5 },
    ];

    function drawWave(channel, yBase, width, height) {
        ctx.beginPath();
        ctx.strokeStyle = channel.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;

        for (let x = 0; x < width; x++) {
            const y = yBase +
                Math.sin((x * channel.freq) + time * 0.03 + channel.offset) * channel.amp +
                Math.sin((x * channel.freq * 2.5) + time * 0.05 + channel.offset) * (channel.amp * 0.3) +
                Math.sin((x * channel.freq * 0.5) + time * 0.02) * (channel.amp * 0.5) +
                (Math.random() - 0.5) * 2;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Channel label
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = channel.color;
        ctx.globalAlpha = 0.6;
        ctx.fillText(channel.name, 12, yBase - channel.amp - 8);
        ctx.globalAlpha = 1;
    }

    function animate() {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        const spacing = h / (channels.length + 1);
        channels.forEach((ch, i) => {
            drawWave(ch, spacing * (i + 1), w, h);
        });

        time++;
        animFrame = requestAnimationFrame(animate);
    }
    animate();
}

// ==========================================
// UPLOAD ZONE
// ==========================================
function initUploadZone() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('eeg-file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileRemove = document.getElementById('file-remove');
    const authBtn = document.getElementById('auth-btn');

    // Click to browse
    zone.addEventListener('click', (e) => {
        if (e.target !== fileRemove && !fileRemove.contains(e.target)) {
            input.click();
        }
    });

    // File selected
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectFile(e.target.files[0]);
        }
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            selectFile(e.dataTransfer.files[0]);
        }
    });

    // Remove file
    fileRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSelection();
    });
}

function selectFile(file) {
    if (!file.name.endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
    }
    selectedFile = file;
    sampleMode = null;

    // Clear sample button active states
    document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('file-info').style.display = 'flex';
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('auth-btn').disabled = false;
}

function clearSelection() {
    selectedFile = null;
    sampleMode = null;
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('eeg-file-input').value = '';
    document.getElementById('auth-btn').disabled = true;
    document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
}

function loadSample(filename) {
    selectedFile = null;
    sampleMode = filename;

    document.getElementById('file-info').style.display = 'none';
    document.getElementById('eeg-file-input').value = '';

    // Toggle active button
    document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
    if (filename === 'test_label5.csv') document.getElementById('sample-btn-5').classList.add('active');
    else if (filename === 'test_label15.csv') document.getElementById('sample-btn-15').classList.add('active');
    else document.getElementById('sample-btn-random').classList.add('active');

    document.getElementById('auth-btn').disabled = false;
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function authenticate() {
    // Show loading
    showState('loading');

    try {
        let response;

        if (sampleMode) {
            response = await fetch(`/api/sample/${sampleMode}`);
        } else if (selectedFile) {
            const formData = new FormData();
            formData.append('eeg_file', selectedFile);
            response = await fetch('/api/authenticate', {
                method: 'POST',
                body: formData
            });
        } else {
            return;
        }

        const data = await response.json();

        if (!response.ok || data.error) {
            alert(data.error || 'Authentication failed');
            showState('empty');
            return;
        }

        displayResults(data);
    } catch (err) {
        console.error(err);
        alert('Error connecting to server. Make sure the Flask app is running.');
        showState('empty');
    }
}

function showState(state) {
    document.getElementById('empty-state').style.display = state === 'empty' ? 'flex' : 'none';
    document.getElementById('loading-state').style.display = state === 'loading' ? 'flex' : 'none';
    document.getElementById('result-data').style.display = state === 'result' ? 'flex' : 'none';
}

function displayResults(data) {
    showState('result');

    // Access badge
    const badge = document.getElementById('access-badge');
    const icon = document.getElementById('access-icon');
    const status = document.getElementById('access-status');
    const desc = document.getElementById('access-desc');

    if (data.access_granted) {
        badge.className = 'access-badge granted';
        icon.innerHTML = '🔓';
        status.textContent = 'ACCESS GRANTED';
        desc.textContent = `Identity verified as Subject ${data.predicted_user}`;
    } else {
        badge.className = 'access-badge denied';
        icon.innerHTML = '🔒';
        status.textContent = 'ACCESS DENIED';
        desc.textContent = `Confidence below security threshold (${(data.threshold * 100).toFixed(0)}%)`;
    }

    // Confidence gauge
    animateGauge(data.confidence);

    // Details
    document.getElementById('predicted-user').textContent = `Subject ${data.predicted_user}`;
    document.getElementById('num-chunks').textContent = data.num_chunks;
    document.getElementById('total-samples').textContent = data.total_samples;
    document.getElementById('threshold').textContent = `${(data.threshold * 100).toFixed(0)}%`;

    // EEG Visualization
    if (data.eeg_data) {
        drawEEGVisualization(data.eeg_data);
    }

    // Scroll to results
    document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// CONFIDENCE GAUGE ANIMATION
// ==========================================
function animateGauge(confidence) {
    const fill = document.getElementById('gauge-fill');
    const number = document.getElementById('gauge-number');
    const circumference = 2 * Math.PI * 85; // r=85
    const targetOffset = circumference - (circumference * confidence);

    // Add gradient definition if not exists
    const svg = fill.closest('svg');
    if (!svg.querySelector('#gaugeGradient')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'gaugeGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#00f0ff');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#7b2ff7');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }

    fill.style.stroke = 'url(#gaugeGradient)';
    fill.setAttribute('stroke-dasharray', circumference);

    // Animate
    setTimeout(() => {
        fill.style.strokeDashoffset = targetOffset;
    }, 100);

    // Count up number
    let current = 0;
    const target = Math.round(confidence * 100);
    const increment = target / 40;
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        number.textContent = Math.round(current);
    }, 30);
}

// ==========================================
// EEG RESULT VISUALIZATION
// ==========================================
function drawEEGVisualization(eegData) {
    const canvas = document.getElementById('eeg-result-canvas');
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;
    const padding = 20;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    const channels = [
        { key: 'P4', color: '#00f0ff' },
        { key: 'Cz', color: '#7b2ff7' },
        { key: 'F8', color: '#ff6b6b' },
        { key: 'T7', color: '#ffd93d' },
    ];

    const spacing = (h - padding * 2) / channels.length;

    channels.forEach((ch, i) => {
        const data = eegData[ch.key];
        if (!data || data.length === 0) return;

        const yBase = padding + spacing * (i + 0.5);
        const xStep = (w - padding * 2) / data.length;

        // Find range for normalization
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const ampScale = spacing * 0.35;

        // Draw channel label
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = ch.color;
        ctx.globalAlpha = 0.5;
        ctx.fillText(ch.key, padding, yBase - ampScale - 6);
        ctx.globalAlpha = 1;

        // Animated drawing
        drawAnimatedLine(ctx, data, ch.color, yBase, padding, xStep, range, min, ampScale, i * 100);
    });
}

function drawAnimatedLine(ctx, data, color, yBase, padding, xStep, range, min, ampScale, delay) {
    let currentPoint = 0;
    const totalPoints = data.length;

    function draw() {
        const batchSize = Math.ceil(totalPoints / 30); // Draw in ~30 frames
        const endPoint = Math.min(currentPoint + batchSize, totalPoints);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;

        for (let i = currentPoint === 0 ? 0 : currentPoint - 1; i < endPoint; i++) {
            const x = padding + i * xStep;
            const normalized = (data[i] - min) / range - 0.5;
            const y = yBase + normalized * ampScale * 2;

            if (i === 0 && currentPoint === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        currentPoint = endPoint;
        if (currentPoint < totalPoints) {
            requestAnimationFrame(draw);
        }
    }

    setTimeout(() => requestAnimationFrame(draw), delay);
}

// ==========================================
// SCROLL REVEAL
// ==========================================
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 80);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '-20px'
    });

    document.querySelectorAll('.feature-card, .step, .tech-card').forEach(el => {
        observer.observe(el);
    });
}

// ==========================================
// COUNT UP ANIMATION (Hero Stats)
// ==========================================
function initCountUp() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                if (!target) return;

                let current = 0;
                const duration = 1500;
                const increment = target / (duration / 30);

                const interval = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(interval);
                    }
                    el.textContent = Math.round(current);
                }, 30);

                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-value[data-count]').forEach(el => {
        observer.observe(el);
    });
}
