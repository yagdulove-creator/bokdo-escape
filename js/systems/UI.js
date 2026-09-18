/**
 * User Interface System for "복도탈출"
 * Manages HUD, Screen Modals, Shop, and Monster Proximity Overlay
 */
class UI {
    constructor() {
        // DOM Elements
        this.hudPanel = document.getElementById('hud-panel');
        this.hudStageVal = document.getElementById('hud-stage-val');
        this.hudDistanceText = document.getElementById('hud-distance-text');
        this.hudProgressFill = document.getElementById('hud-progress-fill');
        this.hudPlayerIcon = document.getElementById('hud-player-icon');
        this.hudMonsterIcon = document.getElementById('hud-monster-icon');
        this.hudStaminaFill = document.getElementById('hud-stamina-fill');
        this.hudBossContainer = document.getElementById('hud-boss-container');
        this.hudBossHpFill = document.getElementById('hud-boss-hp-fill');
        this.hudScoreVal = document.getElementById('hud-score-val');

        this.monsterVignette = document.getElementById('monster-warning-vignette');
        this.warningFlashText = document.getElementById('warning-flash-text');

        // Screens
        this.screenMenu = document.getElementById('screen-menu');
        this.screenHowto = document.getElementById('screen-howto');
        this.screenSafezone = document.getElementById('screen-safezone');
        this.screenGameover = document.getElementById('screen-gameover');
        this.screenEasyPrompt = document.getElementById('screen-easy-prompt');
        this.screenVortex = document.getElementById('screen-vortex');
        this.touchControls = document.getElementById('touch-controls');

        // Safe Zone Shop DOMs
        this.safeStageNum = document.getElementById('safe-stage-num');
        this.safeScoreNum = document.getElementById('safe-score-num');
        this.safeCoinNum = document.getElementById('safe-coin-num');

        // Game Over DOMs
        this.finalStage = document.getElementById('final-stage');
        this.finalScore = document.getElementById('final-score');
        this.finalDodged = document.getElementById('final-dodged');

        this.initEvents();
    }

    initEvents() {
        // Touch controls are hidden by default, shown only when playing
        if (this.touchControls) {
            this.touchControls.classList.add('hidden');
        }
    }

    setDifficultyUI(selectedDiff) {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            if (btn.getAttribute('data-diff') === selectedDiff) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    setTouchControls(visible) {
        if (this.touchControls) {
            if (visible) {
                this.touchControls.classList.remove('hidden');
            } else {
                this.touchControls.classList.add('hidden');
            }
        }
    }

    showScreen(screenName) {
        // Hide all screens
        const allScreens = [
            this.screenMenu, this.screenHowto, this.screenSafezone, this.screenGameover, this.screenEasyPrompt, this.screenVortex
        ];
        allScreens.forEach(s => { if(s) { s.classList.add('hidden'); s.classList.remove('active'); } });

        if (screenName === 'MENU') {
            this.screenMenu.classList.remove('hidden');
            this.screenMenu.classList.add('active');
            this.hudPanel.classList.add('hidden');
        } else if (screenName === 'HOWTO') {
            this.screenHowto.classList.remove('hidden');
            this.screenHowto.classList.add('active');
        } else if (screenName === 'SAFEZONE') {
            this.screenSafezone.classList.remove('hidden');
            this.screenSafezone.classList.add('active');
            this.hudPanel.classList.add('hidden');
        } else if (screenName === 'GAMEOVER') {
            this.screenGameover.classList.remove('hidden');
            this.screenGameover.classList.add('active');
            this.hudPanel.classList.add('hidden');
        } else if (screenName === 'EASY_PROMPT') {
            if (this.screenEasyPrompt) {
                this.screenEasyPrompt.classList.remove('hidden');
                this.screenEasyPrompt.classList.add('active');
            }
            this.hudPanel.classList.add('hidden');
        } else if (screenName === 'VORTEX') {
            if (this.screenVortex) {
                this.screenVortex.classList.remove('hidden');
                this.screenVortex.classList.add('active');
                // Restart animation if needed
                const vortexBox = this.screenVortex.querySelector('.vortex-container');
                if (vortexBox) {
                    vortexBox.classList.remove('vortex-suck-anim');
                    void vortexBox.offsetWidth; // trigger reflow
                    vortexBox.classList.add('vortex-suck-anim');
                }
            }
            this.hudPanel.classList.add('hidden');
        } else if (screenName === 'PLAYING') {
            this.hudPanel.classList.remove('hidden');
        }
    }

    updateHUD(stage, distanceMeters, maxDistanceMeters, playerX, monsterDist, stamina, maxStamina, score, monsterHp = 100, maxMonsterHp = 100, difficulty = 'NORMAL', isMonsterDefeated = false) {
        this.hudStageVal.textContent = `1-${stage}`;
        
        const metersLeft = Math.max(0, Math.floor(distanceMeters));
        this.hudDistanceText.textContent = `${metersLeft}m`;

        // Progress bar track calculations
        const progressPct = Math.min(100, Math.max(0, (1 - metersLeft / maxDistanceMeters) * 100));
        this.hudProgressFill.style.width = `${progressPct}%`;
        this.hudPlayerIcon.style.left = `${progressPct}%`;

        // Monster Icon position relative to player
        if (isMonsterDefeated) {
            this.hudMonsterIcon.style.display = 'none';
        } else {
            this.hudMonsterIcon.style.display = 'block';
            const monsterPct = Math.max(0, progressPct - (monsterDist / (maxDistanceMeters * 8)) * 100);
            this.hudMonsterIcon.style.left = `${monsterPct}%`;
        }

        // Stamina bar
        const staminaPct = Math.min(100, Math.max(0, (stamina / maxStamina) * 100));
        this.hudStaminaFill.style.width = `${staminaPct}%`;

        // Boss HP Bar (Visible in NORMAL and HARD difficulties)
        if ((difficulty === 'NORMAL' || difficulty === 'HARD') && !isMonsterDefeated) {
            if (this.hudBossContainer) this.hudBossContainer.classList.remove('hidden');
            const bossHpPct = Math.min(100, Math.max(0, (monsterHp / maxMonsterHp) * 100));
            if (this.hudBossHpFill) this.hudBossHpFill.style.width = `${bossHpPct}%`;
        } else {
            if (this.hudBossContainer) this.hudBossContainer.classList.add('hidden');
        }

        // Score
        this.hudScoreVal.textContent = String(Math.floor(score)).padStart(5, '0');

        // Monster Warning Vignette
        const proximity = isMonsterDefeated ? 0 : Math.max(0, 400 - monsterDist);
        if (proximity > 100) {
            const intensity = Math.min(60, (proximity / 400) * 60);
            this.monsterVignette.style.boxShadow = `inset 0 0 ${intensity + 20}px rgba(255, 0, 50, ${intensity / 60})`;
            this.warningFlashText.classList.remove('hidden');
        } else {
            this.monsterVignette.style.boxShadow = 'inset 0 0 0px rgba(255, 0, 50, 0)';
            this.warningFlashText.classList.add('hidden');
        }
    }

    populateSafeZone(stage, score, coins) {
        this.safeStageNum.textContent = `Stage 1-${stage}`;
        this.safeScoreNum.textContent = Math.floor(score).toLocaleString();
        this.safeCoinNum.textContent = `🪙 ${coins}`;
    }

    populateGameOver(stage, score, dodgedCount) {
        this.finalStage.textContent = `Stage 1-${stage}`;
        this.finalScore.textContent = Math.floor(score).toLocaleString();
        this.finalDodged.textContent = `${dodgedCount}개`;
    }
}
