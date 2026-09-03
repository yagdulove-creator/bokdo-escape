class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.volume = 0.7;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.error('AudioContext error:', e);
        }
    }

    _resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // 노이즈 버퍼 생성 (화이트 노이즈)
    _makeNoise(duration) {
        const len = Math.floor(this.ctx.sampleRate * duration);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    }

    // 총기 발사음 합성 (type: pistol, shotgun, sniper, assault_rifle)
    playShot(type) {
        if (!this.ctx) return;
        this._resume();
        const now = this.ctx.currentTime;

        const master = this.ctx.createGain();
        master.gain.value = this.volume;
        master.connect(this.ctx.destination);

        if (type === 'pistol') {
            // 권총: 짧고 날카로운 뱅
            this._playBang(now, master, { attack: 0.002, decay: 0.12, freq: 180, noiseAmt: 0.7 });
        } else if (type === 'shotgun') {
            // 샷건: 두껍고 넓은 폭발음
            this._playBang(now, master, { attack: 0.003, decay: 0.22, freq: 100, noiseAmt: 1.2 });
            // 금속 클릭
            this._playClick(now + 0.05, master);
        } else if (type === 'sniper') {
            // 스나이퍼: 크고 긴 메아리
            this._playBang(now, master, { attack: 0.001, decay: 0.35, freq: 140, noiseAmt: 1.5 });
            // 울림
            const rev = this.ctx.createGain();
            rev.gain.value = 0.3;
            rev.connect(master);
            this._playBang(now + 0.04, rev, { attack: 0.01, decay: 0.4, freq: 80, noiseAmt: 0.5 });
        } else if (type === 'assault_rifle') {
            // 소총: 중간 크기, 빠른 감쇠
            this._playBang(now, master, { attack: 0.002, decay: 0.14, freq: 160, noiseAmt: 0.9 });
        } else {
            this._playBang(now, master, { attack: 0.002, decay: 0.15, freq: 160, noiseAmt: 0.8 });
        }
    }

    _playBang(when, dest, opts) {
        const ctx = this.ctx;
        const { attack, decay, freq, noiseAmt } = opts;

        // 1. 발사 충격음 (저음 oscillator)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 2, when);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.3, when + decay);
        oscGain.gain.setValueAtTime(1.0, when);
        oscGain.gain.exponentialRampToValueAtTime(0.001, when + decay);
        osc.connect(oscGain);
        oscGain.connect(dest);
        osc.start(when);
        osc.stop(when + decay + 0.05);

        // 2. 화이트 노이즈 (총구 폭발)
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = this._makeNoise(decay + 0.1);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1200;
        noiseFilter.Q.value = 0.8;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(noiseAmt, when);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, when + decay * 0.8);
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(dest);
        noiseSrc.start(when);
        noiseSrc.stop(when + decay + 0.1);

        // 3. 탄피 떨어지는 금속음
        setTimeout(() => this._playClick(ctx.currentTime, dest), (decay * 0.6) * 1000);
    }

    _playClick(when, dest) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(3500, when);
        osc.frequency.exponentialRampToValueAtTime(200, when + 0.04);
        g.gain.setValueAtTime(0.15, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
        osc.connect(g);
        g.connect(dest);
        osc.start(when);
        osc.stop(when + 0.07);
    }

    playReload() {
        if (!this.ctx) return;
        this._resume();
        const now = this.ctx.currentTime;

        const master = this.ctx.createGain();
        master.gain.value = this.volume * 0.5;
        master.connect(this.ctx.destination);

        // 탄창 빠지는 소리
        this._playClick(now, master);
        // 탄창 끼우는 소리
        this._playClick(now + 0.25, master);
        // 슬라이드 당기는 소리
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now + 0.5);
        osc.frequency.linearRampToValueAtTime(200, now + 0.65);
        g.gain.setValueAtTime(0.3, now + 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(g);
        g.connect(master);
        osc.start(now + 0.5);
        osc.stop(now + 0.66);
    }

    playJump() {
        if (!this.ctx) return;
        this._resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
        g.gain.setValueAtTime(this.volume * 0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
    }
}
