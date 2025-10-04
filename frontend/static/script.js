'use strict';

const API_BASE = (() => {
    const { protocol, hostname, port } = window.location;
    if (!port || port === '5000') {
        return '';
    }
    const safeProtocol = protocol.startsWith('http') ? protocol : 'http:';
    const host = hostname || '127.0.0.1';
    return `${safeProtocol}//${host}:5000`;
})();

class MoodMusicApp {
    constructor() {
        this.currentImageData = null;
        this.stream = null;
        this.loadingTimers = [];
        this.countdownInterval = null;
        this.countdownMaxSeconds = 18;
        this.cachedResults = null;
        this.heroScene = null;

        this.initializeElements();
        this.attachEventListeners();
        this.setupDragAndDrop();
        this.initialize3DScene();
        this.setupDeveloperBadge();
    }

    initializeElements() {
        this.captureStage = document.querySelector('.capture-stage');
        this.moodTriggerSection = document.querySelector('.mood-trigger-section');
        this.moodBoxSection = document.getElementById('moodBoxSection');
        this.moodBoxActivator = document.getElementById('moodBoxActivator');
        this.devBadge = document.getElementById('devBadge');

        this.uploadSection = document.getElementById('uploadSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.previewContainer = document.getElementById('previewContainer');
        this.countdownContainer = document.getElementById('loadingCountdown');
        this.countdownBubble = document.getElementById('countdownBubble');
        this.countdownNumber = document.getElementById('countdownSeconds');
        this.countdownSubtitle = document.getElementById('countdownSubtitle');
        this.countdownProgress = document.getElementById('countdownProgress');

        if (this.moodBoxSection && !document.body.classList.contains('mood-box-open')) {
            this.moodBoxSection.setAttribute('aria-hidden', 'true');
        }

        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.startCameraBtn = document.getElementById('startCamera');
        this.captureBtn = document.getElementById('capturePhoto');

        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.previewImage = document.getElementById('previewImage');

        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.shareBtn = document.getElementById('shareBtn');

        this.emotionIcon = document.getElementById('emotionIcon');
        this.emotionTitle = document.getElementById('emotionTitle');
        this.emotionDescription = document.getElementById('emotionDescription');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.confidenceText = document.getElementById('confidenceText');
        this.emotionBreakdown = document.getElementById('emotionBreakdown');

        this.songsGrid = document.getElementById('songsGrid');
        this.curatorSummary = document.getElementById('curatorSummary');

        this.moodInput = document.getElementById('moodInput');
        this.moodSubmit = document.getElementById('moodSubmit');
        this.moodChips = Array.from(document.querySelectorAll('[data-mood-preset]'));
    }

    attachEventListeners() {
        if (this.moodBoxActivator) {
            this.moodBoxActivator.addEventListener('click', () => this.activateMoodBox());
        }

        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());

        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (event) => this.handleFileSelect(event));

        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        this.retakeBtn.addEventListener('click', () => this.resetToUpload());
        this.tryAgainBtn.addEventListener('click', () => this.resetToUpload());
        this.shareBtn.addEventListener('click', () => this.shareResults());

        if (this.moodSubmit) {
            this.moodSubmit.addEventListener('click', () => this.generateFromMoodBox());
        }
        if (this.moodInput) {
            this.moodInput.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    this.generateFromMoodBox();
                }
            });
        }
        this.moodChips.forEach((chip) => {
            chip.addEventListener('click', () => {
                const preset = chip.getAttribute('data-mood-preset');
                if (preset && this.moodInput) {
                    this.moodInput.value = preset;
                    this.moodInput.focus();
                }
            });
        });

        window.addEventListener('beforeunload', () => {
            this.stopCamera();
            this.heroScene?.dispose();
        });

        // Parallax disabled for performance
    }

    initialize3DScene() {
        const canvas = document.getElementById('heroScene');
        if (!canvas || !window.THREE) {
            return;
        }

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const tooSmall = window.innerWidth < 680;
        if (prefersReducedMotion || tooSmall) {
            canvas.parentElement?.classList.add('hero-3d-disabled');
            return;
        }

        try {
            this.heroScene = new HeroScene(canvas);
        } catch (error) {
            console.warn('3D scene unavailable', error);
            canvas.parentElement?.classList.add('hero-3d-disabled');
        }
    }

    setupDragAndDrop() {
        if (!this.uploadArea) {
            return;
        }
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
            this.uploadArea.addEventListener(eventName, this.preventDefaults);
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            this.uploadArea.addEventListener(eventName, () => {
                this.uploadArea.classList.remove('dragover');
            });
        });

        this.uploadArea.addEventListener('drop', (event) => this.handleDrop(event));
    }

    setupDeveloperBadge() {
        if (!this.devBadge || this.devBadge.dataset.enhanced === 'true') {
            return;
        }

        const rawText = (this.devBadge.dataset.text || this.devBadge.textContent || '').trim();
        if (!rawText) {
            return;
        }

        this.devBadge.dataset.enhanced = 'true';
        this.devBadge.setAttribute('aria-label', rawText);

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            this.devBadge.textContent = rawText;
            this.devBadge.classList.remove('badge-ready', 'badge-animate');
            return;
        }

        const fragment = document.createDocumentFragment();
        const cluster = document.createElement('span');
        cluster.className = 'badge-letter-cluster';

        Array.from(rawText).forEach((char, index) => {
            const letter = document.createElement('span');
            letter.className = 'badge-letter';
            letter.textContent = char === ' ' ? '\u00A0' : char;
            letter.style.setProperty('--letter-index', index.toString());
            if (/[,:]/.test(char)) {
                letter.classList.add('badge-letter-punct');
            }
            cluster.appendChild(letter);
        });

        const particleWrap = document.createElement('span');
        particleWrap.className = 'badge-particles';
        const particleTotal = Math.max(80, rawText.length * 12);

        for (let index = 0; index < particleTotal; index += 1) {
            const particle = document.createElement('span');
            particle.className = 'badge-particle';
            const angle = Math.random() * Math.PI * 2;
            const radius = 90 + Math.random() * 220;
            const originX = Math.cos(angle) * radius;
            const originY = Math.sin(angle) * radius;
            const stochasticDelay = (Math.random() * 0.75 + (index % rawText.length) * 0.035).toFixed(2);
            particle.style.setProperty('--origin-x', `${originX.toFixed(2)}px`);
            particle.style.setProperty('--origin-y', `${originY.toFixed(2)}px`);
            particle.style.setProperty('--particle-delay', `${stochasticDelay}s`);
            particleWrap.appendChild(particle);
        }

        fragment.appendChild(cluster);
        fragment.appendChild(particleWrap);

        this.devBadge.textContent = '';
        this.devBadge.appendChild(fragment);

        requestAnimationFrame(() => {
            this.devBadge.classList.add('badge-ready');
            setTimeout(() => {
                this.devBadge.classList.add('badge-animate');
            }, 1400);
        });
    }

    preventDefaults(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    activateMoodBox() {
        const alreadyOpen = document.body.classList.contains('mood-box-open');

        document.body.classList.add('mood-box-open');

        if (this.moodBoxSection) {
            this.moodBoxSection.setAttribute('aria-hidden', 'false');
        }

        if (this.moodBoxActivator) {
            this.moodBoxActivator.setAttribute('aria-pressed', 'true');
            this.moodBoxActivator.classList.add('triggered');
        }

        const focusDelay = alreadyOpen ? 120 : 620;
        setTimeout(() => {
            if (this.moodInput) {
                this.moodInput.focus({ preventScroll: true });
            }
            if (this.moodBoxSection) {
                this.moodBoxSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, focusDelay);
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 720 },
                    height: { ideal: 540 },
                    facingMode: 'user',
                },
            });

            this.video.srcObject = this.stream;
            await this.video.play();
            this.video.classList.add('active');
            this.startCameraBtn.disabled = true;
            this.captureBtn.disabled = false;
            this.showNotification('Camera live! Center your face and hit capture.', 'success');
        } catch (error) {
            console.error('Camera error', error);
            this.showNotification('Unable to access camera. Try uploading a photo instead.', 'error');
        }
    }

    capturePhoto() {
        if (!this.video.videoWidth) {
            this.showNotification('Camera still warming up. Give it a second!', 'info');
            return;
        }

        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        context.drawImage(this.video, 0, 0);

        this.currentImageData = this.canvas.toDataURL('image/jpeg', 0.9);
        this.previewImage.src = this.currentImageData;
        this.showPreview();
        this.stopCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
        }
        this.video.classList.remove('active');
        this.startCameraBtn.disabled = false;
        this.captureBtn.disabled = true;
    }

    handleFileSelect(event) {
        const file = event.target.files?.[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDrop(event) {
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            this.processFile(file);
        }
    }

    processFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please choose an image file (jpg, png, heic).', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image is too large. Keep it under 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentImageData = event.target?.result;
            this.previewImage.src = this.currentImageData;
            this.showPreview();
        };
        reader.readAsDataURL(file);
    }

    showPreview() {
        this.previewContainer.hidden = false;
        this.previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.analyzeBtn.focus();
    }

    async analyzeImage() {
        if (!this.currentImageData) {
            this.showNotification('Choose or capture a photo first.', 'error');
            return;
        }

        this.showSection('loading');
        this.startLoadingAnimation();
        this.analyzeBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: this.currentImageData }),
            });

            const payload = await response.json();
            if (!response.ok || payload.error) {
                throw new Error(payload.error || `HTTP ${response.status}`);
            }

            this.cachedResults = payload;
            this.resetLoadingAnimation(true);
            this.displayResults(payload);
            this.showSection('results');
        } catch (error) {
            console.error('Analyze error', error);
            this.showNotification(error.message || 'Mood analysis failed. Please try again.', 'error');
            this.resetLoadingAnimation();
            this.showSection('upload');
            this.updateCuratorSummary('', '');
        } finally {
            this.analyzeBtn.disabled = false;
        }
    }

    async generateFromMoodBox() {
        if (!this.moodInput) {
            return;
        }

        const moodText = this.moodInput.value.trim();
        if (!moodText) {
            this.showNotification('Type a few words about your mood first.', 'error');
            this.moodInput.focus();
            return;
        }

        this.showSection('loading');
        this.startLoadingAnimation();
        this.toggleMoodSubmit(true);

        try {
            const response = await fetch(`${API_BASE}/api/mood`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood: moodText }),
            });

            const payload = await response.json();
            if (!response.ok || payload.error) {
                throw new Error(payload.error || `HTTP ${response.status}`);
            }

            const normalized = {
                emotion: payload.emotion || 'neutral',
                description: payload.description || moodText,
                confidence: payload.confidence ?? 0,
                songs: payload.songs || [],
                all_emotions: payload.all_emotions || {},
                curator_summary: payload.curator_summary || '',
            };

            this.cachedResults = normalized;
            this.resetLoadingAnimation(true);
            this.displayResults(normalized);
            this.showSection('results');
        } catch (error) {
            console.error('Mood box error', error);
            this.showNotification(error.message || 'Could not build a playlist. Try again.', 'error');
            this.resetLoadingAnimation();
            this.showSection('upload');
            this.updateCuratorSummary('', '');
        } finally {
            this.toggleMoodSubmit(false);
        }
    }

    toggleMoodSubmit(disabled) {
        if (!this.moodSubmit) {
            return;
        }
        this.moodSubmit.disabled = disabled;
        this.moodSubmit.classList.toggle('loading', disabled);
        if (disabled) {
            this.moodSubmit.dataset.originalText = this.moodSubmit.dataset.originalText || this.moodSubmit.innerHTML;
            this.moodSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Curating...';
        } else if (this.moodSubmit.dataset.originalText) {
            this.moodSubmit.innerHTML = this.moodSubmit.dataset.originalText;
        }
    }

    startLoadingAnimation() {
        this.resetLoadingAnimation();
        ['step1', 'step2', 'step3'].forEach((id, index) => {
            const timer = setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('active');
                }
            }, (index + 1) * 900);
            this.loadingTimers.push(timer);
        });
        this.startCountdownTimer(this.countdownMaxSeconds);
    }

    resetLoadingAnimation(markComplete = false) {
        this.loadingTimers.forEach((timer) => clearTimeout(timer));
        this.loadingTimers = [];
        ['step1', 'step2', 'step3'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('active');
            }
        });
        this.stopCountdownTimer(markComplete);
    }

    startCountdownTimer(maxSeconds = 18) {
        if (!this.countdownContainer || !this.countdownNumber) {
            return;
        }

        this.stopCountdownTimer();

        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const totalSeconds = prefersReducedMotion ? Math.max(8, Math.floor(maxSeconds * 0.7)) : maxSeconds;

        this.countdownMaxSeconds = totalSeconds;
        this.countdownContainer.hidden = false;
        this.countdownContainer.dataset.state = 'running';
        if (this.countdownSubtitle) {
            this.countdownSubtitle.textContent = 'Syncing with Gemini DJ...';
        }

        const startTime = Date.now();

        const updateDisplay = () => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, totalSeconds - elapsed);
            this.updateCountdownDisplay(remaining, totalSeconds);

            if (remaining <= 0) {
                this.countdownContainer.dataset.state = 'overtime';
                if (this.countdownSubtitle) {
                    this.countdownSubtitle.textContent = 'Harmonising the final chorus...';
                }
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
            }
        };

        updateDisplay();
        this.countdownInterval = setInterval(updateDisplay, 1000);
    }

    updateCountdownDisplay(remaining, total) {
        if (this.countdownNumber) {
            this.countdownNumber.textContent = remaining.toString().padStart(2, '0');
        }

        if (this.countdownBubble) {
            const angle = `${Math.min(360, ((total - remaining) / total) * 360)}deg`;
            this.countdownBubble.style.setProperty('--countdown-angle', angle);
        }

        if (this.countdownProgress) {
            const progress = Math.min(100, ((total - remaining) / total) * 100);
            this.countdownProgress.style.width = `${progress}%`;
        }

        if (!this.countdownSubtitle || this.countdownContainer?.dataset.state === 'overtime') {
            return;
        }

        const stage = (total - remaining) / total;
        if (stage >= 0.66) {
            this.countdownSubtitle.textContent = 'Polishing transitions...';
        } else if (stage >= 0.33) {
            this.countdownSubtitle.textContent = 'Finessing the playlist magic...';
        } else {
            this.countdownSubtitle.textContent = 'Syncing with Gemini DJ...';
        }
    }

    stopCountdownTimer(markComplete = false) {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        if (!this.countdownContainer) {
            return;
        }

        if (markComplete) {
            this.countdownContainer.dataset.state = 'done';
            this.countdownContainer.hidden = false;
            this.updateCountdownDisplay(0, this.countdownMaxSeconds || 1);
            if (this.countdownSubtitle) {
                this.countdownSubtitle.textContent = 'Playlist ready! Dropping beats...';
            }
            if (this.countdownBubble) {
                this.countdownBubble.style.setProperty('--countdown-angle', '360deg');
            }
            if (this.countdownProgress) {
                this.countdownProgress.style.width = '100%';
            }
        } else {
            this.countdownContainer.dataset.state = 'idle';
            this.countdownContainer.hidden = true;
            if (this.countdownBubble) {
                this.countdownBubble.style.setProperty('--countdown-angle', '0deg');
            }
            if (this.countdownProgress) {
                this.countdownProgress.style.width = '0%';
            }
        }
    }

    displayResults(result) {
        this.updateEmotionDisplay(result.emotion, result.description, result.confidence);
        this.renderEmotionBreakdown(result.all_emotions || {});
        this.renderSongs(result.songs || []);
        this.updateCuratorSummary(result.curator_summary, result.description);
    }

    updateEmotionDisplay(emotion, description, confidence = 0) {
        const emotionIcons = {
            happy: 'fa-face-grin-stars',
            sad: 'fa-face-sad-tear',
            angry: 'fa-face-angry',
            surprise: 'fa-face-surprise',
            fear: 'fa-face-frown-open',
            disgust: 'fa-face-dizzy',
            neutral: 'fa-face-meh',
        };

        const icon = emotionIcons[emotion] || 'fa-face-smile';
        this.emotionIcon.innerHTML = `<i class="fas ${icon}"></i>`;

        const title = emotion ? emotion.charAt(0).toUpperCase() + emotion.slice(1) : 'Unknown';
        this.emotionTitle.textContent = `Your Mood: ${title}`;
        this.emotionDescription.textContent = description || 'Curated tunes coming right up!';

        const clampedConfidence = Math.max(0, Math.min(100, Math.round(confidence)));
        this.confidenceFill.style.width = `${clampedConfidence}%`;
        this.confidenceText.textContent = `${clampedConfidence}% confident`;
    }

    renderEmotionBreakdown(probabilities) {
        if (!this.emotionBreakdown) {
            return;
        }

        this.emotionBreakdown.innerHTML = '';
        const entries = Object.entries(probabilities);
        if (!entries.length) {
            this.emotionBreakdown.hidden = true;
            return;
        }

        this.emotionBreakdown.hidden = false;
        entries
            .sort(([, a], [, b]) => b - a)
            .forEach(([label, value]) => {
                const chip = document.createElement('span');
                chip.className = 'chip';
                chip.textContent = `${label}: ${value.toFixed(1)}%`;
                this.emotionBreakdown.appendChild(chip);
            });
    }

    updateCuratorSummary(summary, fallbackDescription) {
        if (!this.curatorSummary) {
            return;
        }

        const text = summary?.trim() || fallbackDescription?.trim() || '';
        if (!text) {
            this.curatorSummary.hidden = true;
            this.curatorSummary.textContent = '';
            return;
        }

        this.curatorSummary.hidden = false;
        this.curatorSummary.textContent = text;
    }

    renderSongs(songs) {
        this.songsGrid.innerHTML = '';

        if (!songs.length) {
            const empty = document.createElement('p');
            empty.className = 'song-reason';
            empty.textContent = 'No tracks yet – try another capture or check your connection.';
            this.songsGrid.appendChild(empty);
            return;
        }

        songs.forEach((song, index) => {
            const card = this.createSongCard(song, index);
            this.songsGrid.appendChild(card);
        });
    }

    createSongCard(song, index) {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.style.animationDelay = `${index * 120}ms`;

        const youtube = song.youtube_link || '#';
        const spotify = song.spotify_search || '#';

        card.innerHTML = `
      <div class="song-header">
        <div class="song-icon"><i class="fas fa-music"></i></div>
        <div class="song-info">
          <h4>${song.title || 'Untitled track'}</h4>
          <div class="artist">${song.artist || 'Unknown artist'}</div>
        </div>
      </div>
      <div class="song-reason">${song.reason || 'Handpicked for your vibe.'}</div>
      <div class="song-links">
        <a class="btn youtube-btn" href="${youtube}" target="_blank" rel="noopener">
          <i class="fab fa-youtube"></i> YouTube
        </a>
        <a class="btn spotify-btn" href="${spotify}" target="_blank" rel="noopener">
          <i class="fab fa-spotify"></i> Spotify
        </a>
      </div>
    `;

        return card;
    }

    showSection(section) {
        this.uploadSection.hidden = section !== 'upload';
        this.loadingSection.hidden = section !== 'loading';
        this.resultsSection.hidden = section !== 'results';
    }

    resetToUpload() {
        this.stopCamera();
        this.currentImageData = null;
        this.fileInput.value = '';
        this.previewContainer.hidden = true;
        this.cachedResults = null;
        this.resetLoadingAnimation();
        this.showSection('upload');
        this.updateCuratorSummary('', '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    shareResults() {
        if (!this.cachedResults) {
            this.showNotification('Analyze a photo first.', 'info');
            return;
        }

        const { emotion, description, songs = [] } = this.cachedResults;
        const summary = songs
            .slice(0, 3)
            .map((track, idx) => `${idx + 1}. ${track.title} – ${track.artist}`)
            .join('\n');

        const shareText = `MoodMusic decoded my vibe as ${emotion}. ${description}\nTop picks:\n${summary}`;

        if (navigator.share) {
            navigator.share({
                title: 'My MoodMusic AI playlist',
                text: shareText,
                url: window.location.href,
            }).catch(() => {
                this.showNotification('Sharing cancelled.', 'info');
            });
        } else {
            navigator.clipboard
                .writeText(`${shareText}\n${window.location.href}`)
                .then(() => this.showNotification('Playlist copied to clipboard!', 'success'))
                .catch(() => this.showNotification('Could not copy link.', 'error'));
        }
    }

    showNotification(message, type = 'info') {
        const palette = {
            success: '#46d68c',
            error: '#ff6d6d',
            info: '#6a5bff',
        };

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      padding: 14px 22px;
      border-radius: 18px;
      background: ${palette[type] || palette.info};
      color: #fff;
      box-shadow: 0 18px 40px rgba(0,0,0,0.25);
      font-weight: 600;
      letter-spacing: 0.01em;
      animation: fade-in-down 220ms ease;
    `;
        notification.textContent = message;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'fade-out-up 250ms ease forwards';
            setTimeout(() => notification.remove(), 260);
        }, 4200);
    }
}

class HeroScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.parent = canvas.parentElement;
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x07071d, 0.08);

        this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
        this.camera.position.set(0, 0.2, 9.2);

        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.2));
        this.renderer.shadowMap.autoUpdate = false;

        this.clock = new THREE.Clock();
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.pointer = new THREE.Vector2(0, 0);
        this.targetTilt = new THREE.Vector2(0, 0);

        this.createShapes();
        this.createNebula();
        this.addLights();

        this.handleResize = this.handleResize.bind(this);
        this.handlePointer = this.handlePointer.bind(this);
        this.animate = this.animate.bind(this);

        this.disposed = false;
        this.handleResize();
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('pointermove', this.handlePointer);

        this.rafId = requestAnimationFrame(this.animate);
    }

    createShapes() {
        const palette = [0x8c7cff, 0x31d2ff, 0xff6d6d, 0x4be3c1];
        const geometryFactories = [
            () => new THREE.IcosahedronGeometry(1.1, 0),
            () => new THREE.OctahedronGeometry(1.05, 0),
            () => new THREE.TorusKnotGeometry(0.8, 0.26, 64, 8),
        ];

        for (let index = 0; index < 12; index += 1) {
            const geometry = geometryFactories[index % geometryFactories.length]();
            const color = palette[index % palette.length];
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.3,
                metalness: 0.3,
                roughness: 0.3,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 4.2,
                (Math.random() - 0.25) * 6
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            const scale = 0.4 + Math.random() * 0.8;
            mesh.scale.setScalar(scale);

            mesh.userData = {
                spin: 0.15 + Math.random() * 0.2,
                wobble: 0.2 + Math.random() * 0.25,
                phase: Math.random() * Math.PI * 2,
                baseY: mesh.position.y,
            };

            this.group.add(mesh);
        }
    }

    createNebula() {
        const starCount = 200;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const color = new THREE.Color();

        for (let i = 0; i < starCount; i += 1) {
            positions[i * 3] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
            positions[i * 3 + 2] = -2 - Math.random() * 6;

            const hue = 0.6 + Math.random() * 0.15;
            color.setHSL(hue, 0.82, 0.62 + Math.random() * 0.2);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    addLights() {
        const ambient = new THREE.AmbientLight(0x8888ff, 0.6);
        this.scene.add(ambient);

        const keyLight = new THREE.PointLight(0x8c7cff, 12, 14, 1.6);
        keyLight.position.set(-4.5, 2.5, 4.5);

        const fillLight = new THREE.PointLight(0x31d2ff, 8, 16, 1.4);
        fillLight.position.set(5, -1.4, 5.8);

        const rimLight = new THREE.PointLight(0xff6d6d, 6, 18, 1.6);
        rimLight.position.set(0, 3.6, -3.6);

        this.scene.add(keyLight, fillLight, rimLight);
    }

    handlePointer(event) {
        const rect = this.parent?.getBoundingClientRect();
        if (!rect) {
            return;
        }

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const clampedX = Math.max(0, Math.min(1, x));
        const clampedY = Math.max(0, Math.min(1, y));
        this.pointer.set(clampedX, clampedY);

        this.targetTilt.x = (clampedX - 0.5) * 0.8;
        this.targetTilt.y = (0.5 - clampedY) * 0.45;
    }

    handleResize() {
        if (!this.parent) {
            return;
        }

        const width = this.parent.clientWidth;
        const height = Math.max(this.parent.clientHeight, 320);

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        if (this.disposed) {
            return;
        }

        const elapsed = this.clock.getElapsedTime();
        this.group.rotation.y = THREE.MathUtils.lerp(
            this.group.rotation.y,
            this.targetTilt.x + elapsed * 0.12,
            0.06
        );
        this.group.rotation.x = THREE.MathUtils.lerp(
            this.group.rotation.x,
            this.targetTilt.y + Math.sin(elapsed * 0.45) * 0.22,
            0.06
        );

        this.group.children.forEach((mesh, idx) => {
            const { spin, wobble, phase, baseY } = mesh.userData;
            mesh.rotation.x += 0.004 + spin * 0.006;
            mesh.rotation.y -= 0.003 + (idx % 5) * 0.001;
            mesh.position.y = baseY + Math.sin(elapsed * wobble + phase) * 0.38;
        });

        if (this.stars) {
            this.stars.rotation.y += 0.0009;
            this.stars.material.opacity = 0.65 + Math.sin(elapsed * 0.45) * 0.1;
        }

        this.renderer.render(this.scene, this.camera);
        this.rafId = requestAnimationFrame(this.animate);
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('pointermove', this.handlePointer);

        this.scene.traverse((object) => {
            if (!object.isMesh && !object.isPoints) {
                return;
            }

            if (object.geometry) {
                object.geometry.dispose();
            }

            if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose?.());
            } else if (object.material) {
                object.material.dispose?.();
            }
        });

        this.renderer.dispose();
    }
}

// Simple GLTF model viewer for mood box
class ModelViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.src = canvas.dataset.src;
        if (!this.src || !window.THREE || !THREE.GLTFLoader) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
        this.camera.position.set(0, 1.2, 3.2);
        this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.8;
        this.controls.enablePan = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 5;

        const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        this.scene.add(light);

        this.loader = new THREE.GLTFLoader();
        this.loader.load(this.src, gltf => {
            this.model = gltf.scene;
            this.model.rotation.y = Math.PI;
            this.scene.add(this.model);
        });

        this.clock = new THREE.Clock();
        this.onResize = this.onResize.bind(this);
        this.animate = this.animate.bind(this);
        window.addEventListener('resize', this.onResize);
        this.onResize();
        this.raf = requestAnimationFrame(this.animate);
    }

    onResize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    animate() {
        const delta = this.clock.getDelta();
        this.controls.update(delta);
        this.renderer.render(this.scene, this.camera);
        this.raf = requestAnimationFrame(this.animate);
    }

    dispose() {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this.onResize);
        this.scene.traverse(obj => {
            if (obj.isMesh) {
                obj.geometry.dispose();
                if (obj.material.isMaterial) obj.material.dispose();
            }
        });
        this.renderer.dispose();
    }
}

const extraKeyframes = document.createElement('style');
extraKeyframes.textContent = `
  @keyframes fade-out-up {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-12px); }
  }
`;
document.head.appendChild(extraKeyframes);

document.addEventListener('DOMContentLoaded', () => {
    window.moodMusicApp = new MoodMusicApp();
});
