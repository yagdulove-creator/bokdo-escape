class HUDManager {
    constructor() {
        this.playerScoreEl = document.getElementById('player-score');
        this.botScoreEl = document.getElementById('bot-score');
        this.timerEl = document.getElementById('match-timer');
        this.killFeedEl = document.getElementById('kill-feed');
        this.damageContainer = document.getElementById('damage-container');

        this.healthFill = document.getElementById('health-bar-fill');
        this.shieldFill = document.getElementById('shield-bar-fill');
        this.healthVal = document.getElementById('health-val');
        this.shieldVal = document.getElementById('shield-val');

        this.ammoCurrent = document.getElementById('ammo-current');
        this.ammoMax = document.getElementById('ammo-max');
        this.reloadIndicator = document.getElementById('reload-indicator');

        this.scopeOverlay = document.getElementById('scope-overlay');
        this.hitmarker = document.getElementById('hitmarker');
        this.movementState = document.getElementById('movement-state');

        this.gameoverModal = document.getElementById('gameover-modal');

        this.weaponSlots = [
            document.getElementById('slot-1'),
            document.getElementById('slot-2'),
            document.getElementById('slot-3'),
            document.getElementById('slot-4')
        ];
    }

    updateHealthShield(health, shield) {
        const hPct = Math.max(0, Math.min(100, health));
        const sPct = Math.max(0, Math.min(100, (shield / 50) * 100));
        if (this.healthFill) this.healthFill.style.width = `${hPct}%`;
        if (this.shieldFill) this.shieldFill.style.width = `${sPct}%`;
        if (this.healthVal) this.healthVal.innerText = Math.ceil(health);
        if (this.shieldVal) this.shieldVal.innerText = Math.ceil(shield);
    }

    updateAmmo(current, max) {
        if (this.ammoCurrent) this.ammoCurrent.innerText = current === Infinity ? "∞" : current;
        if (this.ammoMax) this.ammoMax.innerText = max === Infinity ? "∞" : max;
    }

    showReloading(show) {
        if (show) this.reloadIndicator.classList.remove('hidden');
        else this.reloadIndicator.classList.add('hidden');
    }

    updateWeaponSlots(activeIdx) {
        this.weaponSlots.forEach((slot, idx) => {
            if (!slot) return;
            if (idx === activeIdx) slot.classList.add('active');
            else slot.classList.remove('active');
        });
    }

    toggleScopeOverlay(show) {
        if (show) this.scopeOverlay.classList.remove('hidden');
        else this.scopeOverlay.classList.add('hidden');
    }

    showMovementState(text, show) {
        if (show) {
            this.movementState.innerText = text;
            this.movementState.classList.remove('hidden');
        } else {
            this.movementState.classList.add('hidden');
        }
    }

    triggerHitmarker(isHeadshot = false) {
        if (!this.hitmarker) return;
        this.hitmarker.classList.remove('hidden');
        this.hitmarker.style.filter = isHeadshot ? "drop-shadow(0 0 8px #ffea00)" : "none";
        setTimeout(() => this.hitmarker.classList.add('hidden'), 120);
    }

    triggerDamageFlash() {
        document.body.style.boxShadow = "inset 0 0 60px rgba(255, 0, 85, 0.6)";
        setTimeout(() => { document.body.style.boxShadow = "none"; }, 180);
    }

    spawnDamageNumber(damage, worldPos, isHeadshot, camera) {
        const vec = worldPos.clone();
        vec.project(camera);
        const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

        const el = document.createElement('div');
        el.className = `dmg-number ${isHeadshot ? 'headshot' : ''}`;
        el.innerText = isHeadshot ? `${damage} CRIT!` : `${damage}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        this.damageContainer.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 750);
    }

    updateScore(blueScore, redScore) {
        if (this.playerScoreEl) this.playerScoreEl.innerText = blueScore;
        if (this.botScoreEl) this.botScoreEl.innerText = redScore;
    }

    updateTimer(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (this.timerEl) this.timerEl.innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    }

    addKillMessage(killer, victim, weapon, isHeadshot) {
        if (!this.killFeedEl) return;
        const msg = document.createElement('div');
        msg.className = `kill-msg ${isHeadshot ? 'headshot-kill' : ''}`;
        msg.innerHTML = `<span class="killer">${killer}</span><span class="weapon-icon">⚔️ ${weapon}</span><span class="victim">${victim}</span>${isHeadshot ? '<span style="color:#ffea00;">🎯 HEADSHOT</span>' : ''}`;
        this.killFeedEl.prepend(msg);
        setTimeout(() => { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 4000);
    }

    clearKillFeed() {
        if (this.killFeedEl) this.killFeedEl.innerHTML = '';
    }

    showGameOverModal(stats) {
        document.getElementById('match-result-title').innerText = stats.isWin ? "🔵 BLUE TEAM WIN!" : "🔴 RED TEAM WIN!";
        document.getElementById('match-result-title').style.color = stats.isWin ? "var(--color-cyan)" : "var(--color-pink)";
        document.getElementById('match-result-subtitle').innerText = stats.isWin ? "블루팀 승리! 라이벌스 아레나를 정복했습니다!" : "레드팀 승리! 다음 전투에서 설욕하세요!";
        document.getElementById('stat-kills').innerText = stats.kills;
        document.getElementById('stat-deaths').innerText = stats.deaths;
        document.getElementById('stat-kd').innerText = stats.kd;
        document.getElementById('stat-damage').innerText = stats.damage;
        this.gameoverModal.classList.remove('hidden');
        document.exitPointerLock();
    }
}

window.hud = new HUDManager();
