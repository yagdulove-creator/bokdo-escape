/**
 * Web Audio API Retro Sound & Music Synthesizer for "복도탈출"
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.4;
        this.heartbeatOsc = null;
        this.bgmOscs = [];
        this.bgmInterval = null;
        this.heartbeatTimer = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.ctx) {
            this.stopBGM();
            this.stopHeartbeat();
        }
        return this.enabled;
    }

    // 8-bit Sound Effect Generator helper
    playTone(freq, type, duration, startVol = 0.3, endVol = 0.01) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type; // 'square', 'sawtooth', 'triangle', 'sine'
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(startVol * this.volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Silently handle audio context restrictions
        }
    }

    // Noise Generator (for crashes, footsteps, wind)
    playNoise(duration, startVol = 0.3, filterFreq = 1000) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(startVol * this.volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    // Sound FX: Jump
    playJump() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';

            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);

            gain.gain.setValueAtTime(0.3 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    // Sound FX: Slide
    playSlide() {
        this.playNoise(0.2, 0.25, 600);
    }

    // Sound FX: Footstep
    playFootstep() {
        this.playNoise(0.05, 0.1, 800);
    }

    // Sound FX: Furniture Crash / Stumble
    playHitObstacle() {
        if (!this.enabled) return;
        this.playNoise(0.3, 0.5, 400);
        this.playTone(120, 'sawtooth', 0.25, 0.4);
    }

    // Sound FX: Item Collect (Milk / Soda)
    playItemPickup() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.1, 0.3);
            }, idx * 60);
        });
    }

    // Sound FX: Safe Zone Arrival Chime
    playSafeZoneArrival() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const arpeggio = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        arpeggio.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sine', 0.25, 0.4);
            }, idx * 100);
        });
    }

    // Sound FX: Monster Growl / Roar
    playMonsterRoar() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';

            const now = this.ctx.currentTime;
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.linearRampToValueAtTime(40, now + 0.5);

            gain.gain.setValueAtTime(0.5 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.5);
            this.playNoise(0.5, 0.4, 300);
        } catch (e) {}
    }

    // Sound FX: Heartbeat Pulse (intensifies as monster gets closer)
    playHeartbeat(rateMs = 600) {
        if (!this.enabled) return;
        this.stopHeartbeat();

        const triggerPulse = () => {
            if (!this.enabled) return;
            // Lub
            this.playTone(60, 'sine', 0.08, 0.4);
            // Dub
            setTimeout(() => {
                if (this.enabled) this.playTone(50, 'sine', 0.1, 0.5);
            }, 120);
        };

        triggerPulse();
        this.heartbeatTimer = setInterval(triggerPulse, Math.max(220, rateMs));
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Sound FX: Game Over Tune
    playGameOverSound() {
        if (!this.enabled) return;
        this.stopHeartbeat();
        const notes = [293.66, 277.18, 261.63, 246.94]; // D4, C#4, C4, B3
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'sawtooth', 0.35, 0.4);
            }, idx * 250);
        });
    }

    startBGM() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.stopBGM();

        // Upbeat 8-bit chiptune retro arpeggio notes (Fast arcade tempo)
        const melody = [
            261.63, 329.63, 392.00, 523.25,
            293.66, 349.23, 440.00, 587.33,
            329.63, 392.00, 493.88, 659.25,
            349.23, 440.00, 523.25, 698.46,
            392.00, 493.88, 587.33, 783.99,
            349.23, 440.00, 523.25, 698.46,
            329.63, 392.00, 493.88, 659.25,
            293.66, 349.23, 440.00, 587.33
        ];
        let noteIdx = 0;

        this.bgmInterval = setInterval(() => {
            if (!this.enabled || !this.ctx) return;
            const freq = melody[noteIdx % melody.length];
            // Chiptune lead synth
            this.playTone(freq, 'square', 0.11, 0.08);
            // Deep retro bass synth every measure
            if (noteIdx % 4 === 0) {
                this.playTone(freq / 2, 'triangle', 0.22, 0.18);
            }
            noteIdx++;
        }, 130);
    }

    // Sound FX: Game World Warp / Suck-In Effect
    playWarpSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            // Descending swirl tone
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(80, now + 5.0);
            gain1.gain.setValueAtTime(0.3 * this.volume, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 5.0);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 5.0);

            // Background hum
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(200, now);
            osc2.frequency.exponentialRampToValueAtTime(40, now + 5.0);
            gain2.gain.setValueAtTime(0.2 * this.volume, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 5.0);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now);
            osc2.stop(now + 5.0);

            // 8-bit pulse layer
            const osc3 = this.ctx.createOscillator();
            const gain3 = this.ctx.createGain();
            osc3.type = 'square';
            osc3.frequency.setValueAtTime(440, now);
            osc3.frequency.exponentialRampToValueAtTime(30, now + 5.0);
            gain3.gain.setValueAtTime(0.15 * this.volume, now);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 5.0);
            osc3.connect(gain3);
            gain3.connect(this.ctx.destination);
            osc3.start(now);
            osc3.stop(now + 5.0);
        } catch(e) {}
    }

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

// Global Sound Instance
const audioEngine = new SoundEngine();

// Mobile audio unlock listeners
window.addEventListener('pointerdown', () => audioEngine.init(), { passive: true });
window.addEventListener('touchstart', () => audioEngine.init(), { passive: true });
